/**
 * Verifies only the repository-authored Frame Protocol supply-chain dossier.
 * It accepts no learner paths, source code, manifests or dependency overrides.
 * The cargo-deny/advisory artifact is a pinned offline snapshot; this restricted
 * verifier never uses a live advisory database. The explicit --fetch option may
 * populate Cargo's locked cache, but it does not turn the snapshot into live policy evidence.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { frameProtocolPackage } from "../src/content/projects/frame-protocol";
import { projectFiles } from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";

const args = process.argv.slice(2);
assert(
  args.every((argument) => argument === "--fetch" || argument === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported once each; code, paths and dependency overrides are not accepted.",
);

const useMsrv = args.includes("--msrv");
const root = mkdtempSync(join(tmpdir(), "rust-workshop-supply-chain-"));
const cargo = useMsrv ? "rustup" : "cargo";
const cargoPrefix = useMsrv ? ["run", "1.85.0", "cargo"] : [];

function execute(
  directory: string,
  commandArgs: string[],
  options: { quiet?: boolean } = {},
) {
  const result = spawnSync(cargo, [...cargoPrefix, ...commandArgs], {
    cwd: directory,
    encoding: "utf8",
    timeout: 90_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (!options.quiet) process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return result;
}

function run(
  directory: string,
  commandArgs: string[],
  options: { quiet?: boolean } = {},
) {
  const result = execute(directory, commandArgs, options);
  assert.ifError(result.error);
  assert.equal(result.status, 0, `cargo ${commandArgs.join(" ")} failed`);
  console.log(`ok cargo ${[...cargoPrefix, ...commandArgs].join(" ")}`);
}

function runCapture(directory: string, commandArgs: string[]) {
  const result = execute(directory, commandArgs, { quiet: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `cargo ${commandArgs.join(" ")} failed`);
  console.log(`ok cargo ${[...cargoPrefix, ...commandArgs].join(" ")}`);
  return result.stdout ?? "";
}

function sha256File(path: string) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function extract(directory: string, bytes: Uint8Array) {
  const entries = unzipSync(bytes);
  const prefix = `${frameProtocolPackage.id}/`;
  for (const [archivePath, contents] of Object.entries(entries)) {
    assert(
      archivePath.startsWith(prefix),
      `unexpected archive path: ${archivePath}`,
    );
    const relative = archivePath.slice(prefix.length);
    assert(
      relative && !relative.includes(".."),
      `unsafe archive path: ${archivePath}`,
    );
    const target = join(directory, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

try {
  assert.equal(frameProtocolPackage.id, "frame-protocol-workspace");
  const expected = projectFiles(frameProtocolPackage, "solution");
  const archive = buildProjectArchive(frameProtocolPackage, "solution");
  const servedPath = join(
    process.cwd(),
    "public",
    "projects",
    frameProtocolPackage.id,
    "solution.zip",
  );
  assert(existsSync(servedPath), `Missing served archive: ${servedPath}`);
  assert(
    readFileSync(servedPath).equals(Buffer.from(archive)),
    "Stale supply-chain archive; run content:packages first",
  );

  const packageRoot = join(root, frameProtocolPackage.id);
  extract(packageRoot, archive);
  for (const path of [
    "deny.toml",
    "DEPENDENCY-POLICY.md",
    "RELEASE-CHECKLIST.md",
    "RELEASE-EVIDENCE.json",
    "exceptions/advisories.toml",
    "evidence/duplicate-dependencies.toml",
    "evidence/actual-cargo-tree.txt",
    "evidence/cargo-deny-snapshot.json",
    "evidence/release-evidence.json",
    "fixtures/external-consumer/Cargo.toml",
    "fixtures/external-consumer/src/main.rs",
  ]) {
    assert(expected[path], `missing authored supply-chain file: ${path}`);
    assert(
      existsSync(join(packageRoot, path)),
      `missing extracted file: ${path}`,
    );
  }

  const deny = readFileSync(join(packageRoot, "deny.toml"), "utf8");
  assert.match(deny, /multiple-versions\s*=\s*"deny"/);
  assert.match(deny, /wildcards\s*=\s*"deny"/);
  assert.match(deny, /unknown\s*=\s*"deny"/);
  assert.match(deny, /allow\s*=\s*\["MIT",\s*"Apache-2\.0"\]/);
  assert.match(deny, /^\[sources\]/m);
  assert.match(deny, /unknown-registry\s*=\s*"deny"/);
  assert.match(deny, /unknown-git\s*=\s*"deny"/);
  assert.match(
    deny,
    /allow-registry\s*=\s*\["https:\/\/github\.com\/rust-lang\/crates\.io-index"\]/,
  );

  const policy = readFileSync(
    join(packageRoot, "DEPENDENCY-POLICY.md"),
    "utf8",
  );
  assert.match(policy, /registry/);
  assert.match(policy, /MIT or Apache-2\.0/);
  assert.match(policy, /unsupported\/infrastructure/);

  const rootManifest = readFileSync(join(packageRoot, "Cargo.toml"), "utf8");
  assert.match(
    rootManifest,
    /\[workspace\.package\][\s\S]*?^publish\s*=\s*false\s*$/m,
  );
  const libraryManifest = readFileSync(
    join(packageRoot, "crates/frame-protocol/Cargo.toml"),
    "utf8",
  );
  assert.match(libraryManifest, /^publish\.workspace\s*=\s*true\s*$/m);
  const consumerManifest = readFileSync(
    join(packageRoot, "fixtures/external-consumer/Cargo.toml"),
    "utf8",
  );
  assert.match(consumerManifest, /^publish\s*=\s*false\s*$/m);

  const ledger = readFileSync(
    join(packageRoot, "exceptions/advisories.toml"),
    "utf8",
  );
  assert.match(ledger, /owner\s*=\s*"[^"]+"/);
  assert.match(ledger, /id\s*=\s*"[^"]+"/);
  assert.match(ledger, /package\s*=\s*"[^"]+"/);
  assert.match(ledger, /scope\s*=\s*"[^"]+"/);
  assert.match(ledger, /reason\s*=\s*"[^"]+"/);
  assert.match(ledger, /opened_ymd\s*=\s*\d{8}/);
  assert.match(ledger, /expires_ymd\s*=\s*\d{8}/);
  assert.match(ledger, /reviewed_ymd\s*=\s*\d{8}/);

  const snapshot = JSON.parse(
    readFileSync(
      join(packageRoot, "evidence/cargo-deny-snapshot.json"),
      "utf8",
    ),
  ) as {
    tool?: string;
    tool_version?: string;
    network_access?: boolean;
    status?: string;
    execution_status?: string;
    release_decision?: string;
  };
  assert.equal(snapshot.tool, "cargo-deny");
  assert.match(snapshot.tool_version ?? "", /^0\.18\.3$/);
  assert.equal(snapshot.network_access, false);
  assert.equal(snapshot.status, "pinned-snapshot");
  assert.equal(snapshot.execution_status, "unsupported/infrastructure");
  assert.equal(snapshot.release_decision, "hold-until-local-verifier");

  const dossier = JSON.parse(
    readFileSync(join(packageRoot, "evidence/release-evidence.json"), "utf8"),
  ) as {
    release?: string;
    publish?: boolean;
    predecessor?: { head?: string; tree?: string };
    normalized?: boolean;
    dossier_excludes_self?: boolean;
    archive_digest?: string;
    archive_sha256?: string;
    manifest_sha256?: string;
    lock_sha256?: string;
    normalized_fixture_sha256?: string;
    file_sha256?: Record<string, string>;
    external_consumer?: string;
    archive_kind?: string;
    decision?: string;
  };
  assert.equal(dossier.release, "1.1.0");
  assert.deepEqual(dossier.predecessor, {
    head: "16356613b729f5a456e506fc7508424994ab369b",
    tree: "e68b5123d83ac456c59d4e5c4125c9f94ac698fc",
  });
  assert.equal(dossier.normalized, true);
  assert.equal(dossier.dossier_excludes_self, true);
  assert.equal(dossier.archive_digest, "outer-coordinator-report");
  assert.equal(dossier.archive_sha256, undefined);
  assert.equal(
    dossier.normalized_fixture_sha256,
    "sha256:b19872e49a2984d0c23ff763b75758f6cb0d7510244f8119e31738d75ac775e0",
    "normalized Frame predecessor fixture hash",
  );
  for (const [path, hash] of Object.entries(dossier.file_sha256 ?? {})) {
    assert.notEqual(path, "evidence/release-evidence.json");
    assert(
      existsSync(join(packageRoot, path)),
      `normalized file hash points outside authored archive: ${path}`,
    );
    assert.match(hash, /^sha256:[0-9a-f]{64}$/, `normalized file hash: ${path}`);
    assert.equal(hash, sha256File(join(packageRoot, path)), `file hash: ${path}`);
  }
  assert.equal(dossier.publish, false, "publish = false is required");
  assert.equal(
    dossier.manifest_sha256,
    sha256File(join(packageRoot, "Cargo.toml")),
    "release manifest hash must match extracted Cargo.toml",
  );
  assert.equal(
    dossier.lock_sha256,
    sha256File(join(packageRoot, "Cargo.lock")),
    "release lock hash must match extracted Cargo.lock",
  );
  assert.equal(dossier.external_consumer, "fixtures/external-consumer");
  assert.equal(dossier.archive_kind, "authored-project-zip");

  const duplicate = readFileSync(
    join(packageRoot, "evidence/duplicate-dependencies.toml"),
    "utf8",
  );
  assert.match(duplicate, /synthetic|hypothetical/i);
  assert.match(duplicate, /status\s*=\s*"hold"/);
  assert.match(duplicate, /package\s*=\s*"serde"/);
  assert.match(duplicate, /versions\s*=\s*\["1\.0\.228",\s*"1\.0\.229"\]/);

  // cargo-deny is intentionally not treated as available evidence here. A
  // live database or a pinned binary is an infrastructure prerequisite for a
  // tool-backed decision; this authored snapshot keeps the decision on hold.
  assert.equal(dossier.decision, "hold-until-local-verifier");
  assert.equal(snapshot.status, "pinned-snapshot");
  console.log(
    "unsupported/infrastructure: cargo-deny execution is unavailable; release decision remains hold-until-local-verifier",
  );

  const archivePaths = new Set(Object.keys(unzipSync(archive)));
  const packageListing = readFileSync(
    join(packageRoot, "evidence/package-list.txt"),
    "utf8",
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  assert.deepEqual(
    [...packageListing].sort(),
    [
      "frame-protocol-workspace/Cargo.lock",
      "frame-protocol-workspace/Cargo.toml",
      "frame-protocol-workspace/CHANGE-REVIEW.md",
      "frame-protocol-workspace/DEPENDENCY-POLICY.md",
      "frame-protocol-workspace/MAINTENANCE-CHALLENGE.md",
      "frame-protocol-workspace/README.md",
      "frame-protocol-workspace/RELEASE-CHECKLIST.md",
      "frame-protocol-workspace/RELEASE-EVIDENCE.json",
      "frame-protocol-workspace/deny.toml",
      "frame-protocol-workspace/evidence/actual-cargo-tree.txt",
      "frame-protocol-workspace/evidence/cargo-deny-snapshot.json",
      "frame-protocol-workspace/evidence/duplicate-dependencies.toml",
      "frame-protocol-workspace/evidence/package-list.txt",
      "frame-protocol-workspace/evidence/release-evidence.json",
      "frame-protocol-workspace/exceptions/advisories.toml",
      "frame-protocol-workspace/fixtures/external-consumer/Cargo.toml",
      "frame-protocol-workspace/fixtures/external-consumer/src/main.rs",
    ].sort(),
    "virtual workspace package listing must contain only the reviewed files",
  );
  for (const path of packageListing) {
    assert(
      archivePaths.has(path),
      `authored ZIP is missing listed path: ${path}`,
    );
  }

  if (args.includes("--fetch")) run(packageRoot, ["fetch", "--locked"]);
  const metadata = JSON.parse(
    runCapture(packageRoot, [
      "metadata",
      "--offline",
      "--locked",
      "--format-version",
      "1",
    ]),
  ) as {
    packages?: Array<{ name?: string; publish?: string[] | null }>;
  };
  for (const name of ["frame-protocol", "frame-probe"]) {
    const packageMetadata = metadata.packages?.find(
      (candidate) => candidate.name === name,
    );
    assert(packageMetadata, `cargo metadata is missing ${name}`);
    assert.deepEqual(
      packageMetadata.publish,
      [],
      `${name} must resolve to publish = false in cargo metadata`,
    );
  }
  const actualTree = runCapture(packageRoot, [
    "tree",
    "--offline",
    "--locked",
    "--workspace",
    "-e",
    "features",
  ]);
  const treeEvidence = readFileSync(
    join(packageRoot, "evidence/actual-cargo-tree.txt"),
    "utf8",
  );
  assert.match(treeEvidence, /source\s*=\s*"cargo tree executed/);
  assert.match(actualTree, /frame-probe v1\.1\.0/);
  assert.match(actualTree, /frame-protocol v1\.1\.0/);
  assert.doesNotMatch(actualTree, /serde v1\.0\.228|serde v1\.0\.229/);
  run(packageRoot, [
    "check",
    "--offline",
    "--locked",
    "--workspace",
    "--all-targets",
  ]);
  run(packageRoot, [
    "generate-lockfile",
    "--manifest-path",
    "fixtures/external-consumer/Cargo.toml",
    "--offline",
  ]);
  run(packageRoot, [
    "check",
    "--manifest-path",
    "fixtures/external-consumer/Cargo.toml",
    "--offline",
    "--locked",
  ]);
  console.log(
    "ok bounded supply-chain checks: extracted external consumer, actual dossier hashes, authored policy/ledger structure checks, and publish=false; release remains hold",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
