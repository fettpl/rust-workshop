import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProjectArchive, projectArchiveFiles } from "./project-archive";
import { durableLogRetryPackage } from "../src/content/projects/durable-log-retry";
import {
  buildRetryChildEnv,
  classifyRetryCommand,
  assertRetryArchiveTopology,
  archiveSnapshot,
  classifyRetryArchiveTopology,
  legacyRetryArchiveProjectIds,
  parseClientRetryArgs,
} from "./verify-client-retry";
import { unzipSync } from "fflate";

function syntheticArchiveSnapshot(options: { retry?: "starter" | "solution" | "both"; unknown?: string; omitLegacy?: string }): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const project of legacyRetryArchiveProjectIds) {
    for (const variant of ["starter", "solution"] as const) {
      const name = `${project}/${variant}.zip`;
      if (name !== options.omitLegacy) snapshot[name] = `legacy-${project}-${variant}`;
    }
  }
  if (options.retry === "starter" || options.retry === "both") snapshot["durable-log-retry-workspace/starter.zip"] = "generated-starter";
  if (options.retry === "solution" || options.retry === "both") snapshot["durable-log-retry-workspace/solution.zip"] = "generated-solution";
  if (options.unknown) snapshot[options.unknown] = "unknown";
  return snapshot;
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("bounded retry verifier controls", () => {
  it("accepts only the closed MSRV selector", () => {
    expect(parseClientRetryArgs([])).toEqual({ msrv: false });
    expect(parseClientRetryArgs(["--msrv"])).toEqual({ msrv: true });
    for (const argv of [["--msrv", "--msrv"], ["--fetch"], ["--path", "elsewhere"]])
      expect(() => parseClientRetryArgs(argv)).toThrow();
  });

  it("distinguishes completed failures from infrastructure failures", () => {
    expect(classifyRetryCommand({ status: 0, signal: null, stdout: "ok", stderr: "" })).toBe("passed");
    expect(classifyRetryCommand({ status: 101, signal: null, stdout: "test result: FAILED", stderr: "" })).toBe("test-failure");
    expect(classifyRetryCommand({ status: null, signal: "SIGTERM", stdout: "", stderr: "" })).toBe("signal");
    expect(classifyRetryCommand({ status: null, signal: null, stdout: "", stderr: "", error: { code: "ETIMEDOUT" } })).toBe("timeout");
  });

  it("constructs a closed child environment without ambient flags", () => {
    const env = buildRetryChildEnv({
      cargoHome: "/home/learner/.cargo",
      toolchain: "1.85.0",
      executables: {
        cargo: { path: "/opt/rust/bin/cargo", bytes: 1, mode: 0o755, sha256: "cargo", version: "cargo" },
        rustc: { path: "/opt/rust/bin/rustc", bytes: 1, mode: 0o755, sha256: "rustc", version: "rustc" },
        rustdoc: { path: "/opt/rust/bin/rustdoc", bytes: 1, mode: 0o755, sha256: "rustdoc", version: "rustdoc" },
      },
    }, "/tmp/retry-target");
    expect(env).toMatchObject({
      CARGO_HOME: "/home/learner/.cargo",
      CARGO_NET_OFFLINE: "true",
      CARGO_TARGET_DIR: "/tmp/retry-target",
      RUSTUP_TOOLCHAIN: "1.85.0",
      RUSTC: "/opt/rust/bin/rustc",
      RUSTDOC: "/opt/rust/bin/rustdoc",
      NODE_ENV: "production",
    });
    expect(env).not.toHaveProperty("RUSTFLAGS");
    expect(env).not.toHaveProperty("CARGO_CONFIG");
    expect(env).not.toHaveProperty("RUSTC_WRAPPER");
  });

  it("binds both variants to the exact authored archive and Apache notice set", () => {
    for (const variant of ["starter", "solution"] as const) {
      const archive = buildProjectArchive(durableLogRetryPackage, variant);
      const files = projectArchiveFiles(durableLogRetryPackage, variant);
      expect(Object.keys(files)).toHaveLength(49);
      expect(Object.keys(unzipSync(archive)).sort()).toEqual(
        Object.keys(files).map((path) => `${durableLogRetryPackage.id}/${path}`).sort(),
      );
      expect(Object.keys(unzipSync(archive))).toContain(`${durableLogRetryPackage.id}/LICENSE-APACHE`);
    }
  });

  it("accepts empty, pre-generation, and post-generation archive topologies", () => {
    expect(classifyRetryArchiveTopology({})).toBe("empty");
    const preGeneration = syntheticArchiveSnapshot({});
    expect(classifyRetryArchiveTopology(preGeneration)).toBe("pre-generation");
    const postGeneration = syntheticArchiveSnapshot({ retry: "both" });
    expect(classifyRetryArchiveTopology(postGeneration)).toBe("post-generation");
    expect(() => assertRetryArchiveTopology(postGeneration)).toThrow();
    expect(assertRetryArchiveTopology(postGeneration, {
      starter: "generated-starter",
      solution: "generated-solution",
    })).toBe("post-generation");
  });

  it("rejects partial, unknown, incomplete-legacy, and tampered generated archives", () => {
    expect(() => classifyRetryArchiveTopology(syntheticArchiveSnapshot({ retry: "starter" }))).toThrow();
    expect(() => classifyRetryArchiveTopology(syntheticArchiveSnapshot({ unknown: "unexpected/extra.zip" }))).toThrow();
    expect(() => classifyRetryArchiveTopology(syntheticArchiveSnapshot({ omitLegacy: "tokio-service-workshop/starter.zip" }))).toThrow();
    const tampered = syntheticArchiveSnapshot({ retry: "both" });
    expect(() => assertRetryArchiveTopology(tampered, {
      starter: "wrong-starter",
      solution: "generated-solution",
    })).toThrow();
    expect(() => assertRetryArchiveTopology({ ...tampered, "durable-log-retry-workspace/starter.zip": "generated-starter" }, {
      starter: "generated-starter",
      solution: "wrong-solution",
    })).toThrow();
  });

  it("binds the actual owned post-generation snapshot to both authored archives", () => {
    const root = mkdtempSync(join(tmpdir(), "retry-archive-topology-"));
    try {
      const base = join(root, "public", "projects");
      for (const project of legacyRetryArchiveProjectIds) {
        for (const variant of ["starter", "solution"] as const) {
          const path = join(base, project, `${variant}.zip`);
          mkdirSync(join(base, project), { recursive: true });
          writeFileSync(path, `legacy-${project}-${variant}`);
        }
      }
      const generated = {
        starter: buildProjectArchive(durableLogRetryPackage, "starter"),
        solution: buildProjectArchive(durableLogRetryPackage, "solution"),
      };
      mkdirSync(join(base, durableLogRetryPackage.id), { recursive: true });
      writeFileSync(join(base, durableLogRetryPackage.id, "starter.zip"), generated.starter);
      writeFileSync(join(base, durableLogRetryPackage.id, "solution.zip"), generated.solution);
      const snapshot = archiveSnapshot(root);
      expect(assertRetryArchiveTopology(snapshot, {
        starter: digest(generated.starter),
        solution: digest(generated.solution),
      })).toBe("post-generation");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// A11 fixed successor topology controls. Unknown future projects are rejected.
function authorizationSnapshot(): Record<string,string> {return {...syntheticArchiveSnapshot({retry:"both"}),"service-authorization-workshop/starter.zip":"auth-starter","service-authorization-workshop/solution.zip":"auth-solution"};}
const retryHashes={starter:"generated-starter",solution:"generated-solution"};
const authHashes={starter:"auth-starter",solution:"auth-solution"};
it("accepts_fixed_authorization_successor_pair",()=>{expect(assertRetryArchiveTopology(authorizationSnapshot(),retryHashes,authHashes)).toBe("post-authorization-generation");});
it("preserves_pre_authorization_28_state",()=>{expect(assertRetryArchiveTopology(syntheticArchiveSnapshot({retry:"both"}),retryHashes,authHashes)).toBe("post-generation");});
it("rejects_partial_authorization_pair",()=>{for(const variant of ["starter","solution"]){const snapshot=authorizationSnapshot();delete snapshot[`service-authorization-workshop/${variant}.zip` as keyof typeof snapshot];expect(()=>assertRetryArchiveTopology(snapshot,retryHashes,authHashes)).toThrow();}});
it("rejects_authorization_without_retry",()=>{const snapshot=authorizationSnapshot();delete snapshot["durable-log-retry-workspace/starter.zip"];delete snapshot["durable-log-retry-workspace/solution.zip"];expect(()=>assertRetryArchiveTopology(snapshot,retryHashes,authHashes)).toThrow();});
it("rejects_unknown_successor_even_with_valid_authorization",()=>{expect(()=>assertRetryArchiveTopology({...authorizationSnapshot(),"arbitrary/starter.zip":"unknown"},retryHashes,authHashes)).toThrow();});
it("rejects_tampered_authorization_starter",()=>{expect(()=>assertRetryArchiveTopology({...authorizationSnapshot(),"service-authorization-workshop/starter.zip":"tamper"},retryHashes,authHashes)).toThrow();});
it("rejects_tampered_authorization_solution",()=>{expect(()=>assertRetryArchiveTopology({...authorizationSnapshot(),"service-authorization-workshop/solution.zip":"tamper"},retryHashes,authHashes)).toThrow();});
it("requires_authored_authorization_hashes",()=>{expect(()=>assertRetryArchiveTopology(authorizationSnapshot(),retryHashes)).toThrow();});
it("binds_real_30_archive_bytes_and_detects_change",async()=>{
 const {projects}=await import("../src/content/course");const {serviceAuthorizationPackage}=await import("../src/content/projects/service-authorization");
 const root=mkdtempSync(join(tmpdir(),"a11-actual-30-"));
 try {
 const oldIds=new Set<string>([...legacyRetryArchiveProjectIds,durableLogRetryPackage.id]);
 for(const p of projects){if(p.package && oldIds.has(p.package.id)){for(const variant of ["starter","solution"] as const){const base=join(root,"public/projects",p.package.id);mkdirSync(base,{recursive:true});writeFileSync(join(base,variant+".zip"),buildProjectArchive(p.package,variant));}}}
 const before=archiveSnapshot(root);expect(Object.keys(before)).toHaveLength(28);
 const auth={starter:"",solution:""};const retry={starter:"",solution:""};
 for(const variant of ["starter","solution"] as const){retry[variant]=digest(buildProjectArchive(durableLogRetryPackage,variant));const bytes=buildProjectArchive(serviceAuthorizationPackage,variant);auth[variant]=digest(bytes);const base=join(root,"public/projects",serviceAuthorizationPackage.id);mkdirSync(base,{recursive:true});writeFileSync(join(base,variant+".zip"),bytes);}
 expect(assertRetryArchiveTopology(archiveSnapshot(root),retry,auth)).toBe("post-authorization-generation");
 writeFileSync(join(root,"public/projects",serviceAuthorizationPackage.id,"solution.zip"),"changed");
 expect(()=>assertRetryArchiveTopology(archiveSnapshot(root),retry,auth)).toThrow();
 const after=archiveSnapshot(root);for(const [path,hash] of Object.entries(before))expect(after[path]).toBe(hash);
 }finally{rmSync(root,{recursive:true,force:true});}
});

// The successor extends only generated-pair checks at the retry boundary.
it("A12 accepts the exact 32-archive topology and checks all three generated pairs", () => {
  const pair = { starter: "schema-starter", solution: "schema-solution" };
  const snapshot = {
    ...authorizationSnapshot(),
    "file-schema-evolution-workshop/starter.zip": pair.starter,
    "file-schema-evolution-workshop/solution.zip": pair.solution,
  };
  expect(assertRetryArchiveTopology(snapshot, retryHashes, authHashes, pair)).toBe("post-file-schema-generation");
  for (const path of Object.keys(snapshot).filter((name) =>
    /^(?:durable-log-retry-workspace|service-authorization-workshop|file-schema-evolution-workshop)\//.test(name),
  )) {
    expect(() => assertRetryArchiveTopology({ ...snapshot, [path]: "tampered" }, retryHashes, authHashes, pair), path).toThrow();
  }
  const legacy = "todo-cli-workshop/starter.zip";
  expect(assertRetryArchiveTopology({ ...snapshot, [legacy]: "name-only" }, retryHashes, authHashes, pair)).toBe("post-file-schema-generation");
});

it("A12 rejects an unbound, partial, misplaced or unknown successor archive", () => {
  const pair = { starter: "schema-starter", solution: "schema-solution" };
  const snapshot: Record<string, string> = {
    ...authorizationSnapshot(),
    "file-schema-evolution-workshop/starter.zip": pair.starter,
    "file-schema-evolution-workshop/solution.zip": pair.solution,
  };
  expect(() => assertRetryArchiveTopology(snapshot, retryHashes, authHashes)).toThrow();
  for (const removed of [
    ["file-schema-evolution-workshop/starter.zip"],
    ["file-schema-evolution-workshop/solution.zip"],
    ["service-authorization-workshop/starter.zip", "service-authorization-workshop/solution.zip"],
    ["durable-log-retry-workspace/starter.zip", "durable-log-retry-workspace/solution.zip"],
    ["todo-cli-workshop/solution.zip"],
  ]) {
    const partial = { ...snapshot };
    for (const name of removed) delete partial[name];
    expect(() => assertRetryArchiveTopology(partial, retryHashes, authHashes, pair)).toThrow();
  }
  expect(() => assertRetryArchiveTopology({ ...snapshot, "arbitrary/solution.zip": "unknown" }, retryHashes, authHashes, pair)).toThrow();
});
