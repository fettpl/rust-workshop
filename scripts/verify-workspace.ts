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
import { delimiter, dirname, join } from "node:path";
import { frameProtocolPackage } from "../src/content/projects/frame-protocol";
import {
  projectFiles,
  type PackageVariant,
} from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";
import { verifyFrameWorkspaceMutants } from "./workspace-mutants";
import {
  assertExactFramePackageFiles,
  assertNormalizedFramePackageManifest,
  assertRestrictedFrameLockDelta,
} from "./workspace-package";
import {
  assertFrameWorkspaceAuthoredLayout,
  assertFrameWorkspaceMetadata,
  type WorkspaceMetadata,
} from "./workspace-metadata";

const args = process.argv.slice(2);
if (
  args.length > 2 ||
  args.some((arg) => arg !== "--fetch" && arg !== "--msrv") ||
  new Set(args).size !== args.length
)
  throw new Error(
    "Only --fetch and --msrv are supported once each; code and paths are not accepted.",
  );
const fetch = args.includes("--fetch");
const msrv = args.includes("--msrv");
if (msrv) {
  // rustup run selects Cargo, but its bare rustc/rustdoc child can still find
  // a non-proxy Homebrew installation first on PATH. Pin both compiler tools.
  for (const [variable, tool] of [
    ["RUSTC", "rustc"],
    ["RUSTDOC", "rustdoc"],
  ]) {
    const resolved = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.ifError(resolved.error);
    assert.equal(resolved.status, 0, resolved.stderr);
    const executable = resolved.stdout.trim();
    const version = spawnSync(executable, ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(version.error);
    assert.equal(version.status, 0, version.stderr);
    assert(
      version.stdout.startsWith(`${tool} 1.85.0 `),
      `Expected exact MSRV ${tool}: ${version.stdout}`,
    );
    process.env[variable] = executable;
    console.log(version.stdout.trim());
  }
  process.env.PATH = `${dirname(process.env.RUSTC!)}${delimiter}${process.env.PATH ?? ""}`;
}
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

function metadata(allFeatures = false) {
  const output = cargo([
    "metadata",
    "--offline",
    "--locked",
    "--format-version",
    "1",
    ...(allFeatures ? ["--all-features"] : []),
  ]);
  return JSON.parse(output) as {
    packages: {
      name: string;
      features: Record<string, string[]>;
    }[];
    resolve: { nodes: { id: string; features: string[] }[] };
  };
}

function assertResolvedFeatureGraphs() {
  const defaultMetadata = metadata();
  assert.equal(
    defaultMetadata.resolve.nodes.length,
    2,
    "Default graph must select only the two workspace packages",
  );
  const allMetadata = metadata(true);
  assert.equal(
    allMetadata.resolve.nodes.length,
    9,
    "All-features graph must select the two workspace packages and seven locked serde packages",
  );
  const library = allMetadata.packages.find(
    (pkg) => pkg.name === "frame-protocol",
  );
  const probe = allMetadata.packages.find((pkg) => pkg.name === "frame-probe");
  assert.ok(library && probe, "Cargo metadata must expose both members");
  assert.deepEqual(library.features.format, [
    "dep:serde",
    "serde/alloc",
    "serde/derive",
  ]);
  assert.deepEqual(probe.features.format, ["frame-protocol/format"]);
}

function assertAuthoredLock(lock: string) {
  const packages = [
    ["proc-macro2", "1.0.107", "985e7ec9bb745e6ce6535b544d84d6cd6f7ad8bd711c398938ae983b91a766d9"],
    ["quote", "1.0.47", "1fbf4db142a473a8d80c26bbf18454ed458bf8d26c8219c331daecfdbd079001"],
    ["serde", "1.0.229", "4148590afebada386688f18773da617792bf2ef03ffc1e4cbd2b1d45b023e0ba"],
    ["serde_core", "1.0.229", "67dca2c9c51e58a4791a4b1ed58308b39c64224d349a935ab5039aa360942a48"],
    ["serde_derive", "1.0.229", "e7a5d71263a5a7d47b41f6b3f06ba276f10cc18b0931f1799f710578e2309348"],
    ["syn", "3.0.5", "12df2e0110f65b775f769bb17ef989067a1d931b2eb822bd4346631eeada89f9"],
    ["unicode-ident", "1.0.24", "e6e4313cd5fcd3dad5cafa179702e2b244f760991f45397d14d4ebf38247da75"],
  ] as const;
  assert.equal(
    [...lock.matchAll(/\[\[package\]\]/g)].length,
    9,
    "Authored lock must contain exactly nine packages",
  );
  for (const name of ["frame-probe", "frame-protocol"])
    assert.match(
      lock,
      new RegExp(
        `name = "${name}"\\nversion = "1\\.1\\.0"`,
      ),
      `${name}: candidate local version`,
    );
  for (const [name, version, checksum] of packages) {
    assert.match(
      lock,
      new RegExp(
        `name = "${name}"[\\s\\S]{0,100}version = "${version}"[\\s\\S]{0,180}source = "registry\\+https://github\\.com/rust-lang/crates\\.io-index"[\\s\\S]{0,180}checksum = "${checksum}"`,
      ),
      `${name}: pinned source, version and checksum`,
    );
  }
}

/** Reads the root-owned, sanitized pre-A6 Frame projection for compatibility. */
function readPreA6FrameLock(): string {
  const projectionPath = join(
    process.cwd(),
    "src/content/fixtures/frame-protocol-pre-a6-projection.json",
  );
  const projection = JSON.parse(readFileSync(projectionPath, "utf8")) as {
    predecessor?: { head?: string; tree?: string };
    frameProject?: {
      package?: { files?: Array<{ path?: string; starter?: string }> };
    };
  };
  assert.deepEqual(projection.predecessor, {
    head: "16356613b729f5a456e506fc7508424994ab369b",
    tree: "e68b5123d83ac456c59d4e5c4125c9f94ac698fc",
  });
  const lock = projection.frameProject?.package?.files?.find(
    (file) => file.path === "Cargo.lock",
  )?.starter;
  assert.equal(typeof lock, "string", "pre-A6 projection must include Cargo.lock");
  return lock!;
}

function assertStarterTestsFailIntentionally() {
  const result = spawnSync(binary, [...prefix, "test", "--workspace", "--offline", "--locked", "--no-fail-fast"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 3 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, "Starter tests must remain unfinished");
  const output = result.stdout + result.stderr;
  assert.match(output, /test result: FAILED/);
  assert.match(output, /not yet implemented/);
  console.log("ok starter tests fail only at intentional todo implementations");
}

function verifyLibraryPackage() {
  const listed = cargo([
    "package",
    "-p",
    "frame-protocol",
    "--list",
    "--offline",
    "--locked",
  ])
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  assertExactFramePackageFiles(listed);
  cargo([
    "package",
    "-p",
    "frame-protocol",
    "--all-features",
    "--offline",
    "--locked",
  ]);
  const cratePath = join(root, "target/package/frame-protocol-1.1.0.crate");
  const archive = spawnSync("tar", ["-tf", cratePath], {
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(archive.error);
  assert.equal(archive.status, 0, archive.stderr);
  const prefixPath = "frame-protocol-1.1.0/";
  const archiveFiles = archive.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((path) => path.slice(prefixPath.length))
    .sort();
  assertExactFramePackageFiles(
    archiveFiles,
    "Generated crate archive must retain exactly the reviewed six files",
  );
  const normalized = spawnSync(
    "tar",
    ["-xOf", cratePath, `${prefixPath}Cargo.toml`],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.ifError(normalized.error);
  assert.equal(normalized.status, 0, normalized.stderr);
  assertNormalizedFramePackageManifest(normalized.stdout);
  const original = spawnSync(
    "tar",
    ["-xOf", cratePath, `${prefixPath}Cargo.toml.orig`],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.ifError(original.error);
  assert.equal(original.status, 0, original.stderr);
  assert.match(original.stdout, /publish\.workspace = true/);
  console.log("ok frame-protocol package contains exactly six files and publish=false");
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
  if (fetch) cargo(["fetch", "--locked"]);
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
  assertStarterTestsFailIntentionally();
  const starterLock = readFileSync(join(root, "Cargo.lock"), "utf8");
  installVariant("solution");
  assertFrameWorkspaceAuthoredLayout(
    root,
    frameProtocolPackage.workspaceMembers!,
  );
  const lockBefore = readFileSync(join(root, "Cargo.lock"), "utf8");
  assert.equal(
    starterLock,
    lockBefore,
    "A6 starter and solution lockfiles must remain byte-identical",
  );
  assertRestrictedFrameLockDelta(readPreA6FrameLock(), lockBefore);
  assertAuthoredLock(lockBefore);
  const metadata = JSON.parse(
    cargo(["metadata", "--offline", "--locked", "--format-version", "1"]),
  ) as WorkspaceMetadata;
  assertFrameWorkspaceMetadata(
    metadata,
    root,
    frameProtocolPackage.workspaceMembers!,
  );
  assertResolvedFeatureGraphs();
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
  cargo([
    "check",
    "-p",
    "frame-protocol",
    "--offline",
    "--locked",
    "--all-targets",
    "--no-default-features",
    "--features",
    "format",
  ]);
  cargo([
    "test",
    "-p",
    "frame-protocol",
    "--offline",
    "--locked",
    "--no-default-features",
    "--features",
    "format",
  ]);
  cargo([
    "check",
    "-p",
    "frame-probe",
    "--offline",
    "--locked",
    "--all-targets",
    "--no-default-features",
    "--features",
    "format",
  ]);
  cargo([
    "test",
    "-p",
    "frame-probe",
    "--offline",
    "--locked",
    "--no-default-features",
    "--features",
    "format",
  ]);
  const clientForwardedFormat = cargo([
    "test",
    "-p",
    "frame-probe",
    "--offline",
    "--locked",
    "--no-default-features",
    "--features",
    "format",
    "--test",
    "cli",
    "format_feature_activates_library_serialize_consumer",
  ]);
  assert.match(
    clientForwardedFormat,
    /test format_feature_activates_library_serialize_consumer \.\.\. ok/,
    "Client-forwarded format must execute the library Serialize consumer through frame-probe",
  );
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
  verifyLibraryPackage();
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
