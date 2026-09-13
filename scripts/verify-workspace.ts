/** Executes only the reviewed Frame Protocol archive. Never accepts user code or paths. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { frameProtocolPackage } from "../src/content/projects/frame-protocol";
import {
  projectFiles,
  type PackageVariant,
} from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";
import { verifyFrameWorkspaceMutants } from "./workspace-mutants";
import {
  assertFrameWorkspaceAuthoredLayout,
  assertFrameWorkspaceMetadata,
  type WorkspaceMetadata,
} from "./workspace-metadata";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => arg !== "--msrv"))
  throw new Error("Only --msrv is supported; code and paths are not accepted.");
const msrv = args.includes("--msrv");
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-workspace-"));
const binary = msrv ? "rustup" : "cargo";
const prefix = msrv ? ["run", "1.85.0", "cargo"] : [];

function cargo(commandArgs: string[], minimumTests = 1) {
  const result = spawnSync(binary, [...prefix, ...commandArgs], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 3 * 1024 * 1024,
  });
  const passedTests = [
    ...result.stdout.matchAll(/test result: ok\. (\d+) passed/g),
  ].reduce((sum, match) => sum + Number(match[1]), 0);
  const passed =
    !result.error &&
    result.status === 0 &&
    (commandArgs[0] !== "test" || passedTests >= minimumTests);
  console.log(
    `${passed ? "ok" : "FAIL"} ${binary} ${[...prefix, ...commandArgs].join(" ")}${commandArgs[0] === "test" ? ` (${passedTests} tests)` : ""}`,
  );
  if (!passed)
    throw new Error(result.error?.message ?? result.stdout + result.stderr);
  return result.stdout;
}

function installVariant(variant: PackageVariant) {
  const archive = buildProjectArchive(frameProtocolPackage, variant);
  assert.deepEqual(
    readFileSync(
      join(
        process.cwd(),
        "public/projects",
        frameProtocolPackage.id,
        `${variant}.zip`,
      ),
    ),
    Buffer.from(archive),
    "Downloadable workspace archive must match authored files",
  );
  for (const [path, content] of Object.entries(
    projectFiles(frameProtocolPackage, variant),
  )) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

try {
  installVariant("starter");
  assertFrameWorkspaceAuthoredLayout(
    root,
    frameProtocolPackage.workspaceMembers!,
  );
  cargo(["fmt", "--all", "--", "--check"]);
  for (const features of [["--no-default-features"], ["--all-features"]])
    cargo([
      "check",
      "--workspace",
      "--offline",
      "--locked",
      "--all-targets",
      ...features,
    ]);
  installVariant("solution");
  assertFrameWorkspaceAuthoredLayout(
    root,
    frameProtocolPackage.workspaceMembers!,
  );
  const lockBefore = readFileSync(join(root, "Cargo.lock"), "utf8");
  const metadata = JSON.parse(
    cargo(["metadata", "--offline", "--locked", "--format-version", "1"]),
  ) as WorkspaceMetadata;
  assertFrameWorkspaceMetadata(
    metadata,
    root,
    frameProtocolPackage.workspaceMembers!,
  );
  cargo(["tree", "--offline", "--locked", "--workspace", "-e", "features"]);
  cargo(["fmt", "--all", "--", "--check"]);
  for (const selection of [["--workspace"], ["-p", "frame-protocol"]]) {
    for (const features of [
      [],
      ["--no-default-features"],
      ["--all-features"],
    ]) {
      cargo([
        "check",
        ...selection,
        "--offline",
        "--locked",
        "--all-targets",
        ...features,
      ]);
      cargo(["test", ...selection, "--offline", "--locked", ...features]);
    }
  }
  cargo([
    "test",
    "-p",
    "frame-protocol",
    "--offline",
    "--locked",
    "--no-default-features",
    "--features",
    "diagnostics",
  ]);
  // Workspace --all-features can activate the library feature without proving
  // that the separate client forwards and compiles its diagnostics path.
  cargo([
    "check",
    "-p",
    "frame-probe",
    "--offline",
    "--locked",
    "--all-targets",
    "--no-default-features",
    "--features",
    "diagnostics",
  ]);
  cargo([
    "test",
    "-p",
    "frame-probe",
    "--offline",
    "--locked",
    "--no-default-features",
    "--features",
    "diagnostics",
  ]);
  // A green unit suite must not conceal escaped/missing rustdoc fences.
  cargo(["test", "-p", "frame-protocol", "--doc", "--offline", "--locked"], 2);
  cargo([
    "clippy",
    "--workspace",
    "--offline",
    "--locked",
    "--all-targets",
    "--all-features",
    "--",
    "-D",
    "warnings",
  ]);
  cargo([
    "doc",
    "--workspace",
    "--offline",
    "--locked",
    "--no-deps",
    "--all-features",
  ]);
  verifyFrameWorkspaceMutants(root, binary, prefix);
  assert.equal(
    readFileSync(join(root, "Cargo.lock"), "utf8"),
    lockBefore,
    "Verification must not rewrite the lockfile",
  );
  console.log(
    msrv
      ? "Exact Rust 1.85.0 workspace verification passed"
      : "Current compiler workspace verification passed",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
