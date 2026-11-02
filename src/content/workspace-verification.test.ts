import { afterAll, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertFrameWorkspaceAuthoredLayout,
  assertFrameWorkspaceMetadata,
} from "../../scripts/workspace-metadata";
import {
  assertExactFramePackageFiles,
  assertNormalizedFramePackageManifest,
  assertRestrictedFrameLockDelta,
} from "../../scripts/workspace-package";
import {
  assertExactDossierFileCoverage,
  assertExactWorkspaceArchivePartition,
  assertExactWorkspaceFileDelta,
  frameDossierSelfPaths,
  normalizedPredecessorFrameProjectHash,
} from "../../scripts/workspace-evidence";
import { frameProtocolPackage } from "./projects/frame-protocol";
import { projectFiles } from "../domain/project-package";
import predecessor from "./fixtures/frame-protocol-pre-a6-projection.json";

// A fixed repository-authored fixture. Cargo reads metadata; no learner code runs.
const root = mkdtempSync(join(tmpdir(), "rust-workshop-metadata-test-"));
const members = ["crates/frame-protocol", "crates/frame-probe"];
afterAll(() => rmSync(root, { recursive: true, force: true }));

function metadata(selectedMembers = members, compilerFloor = "1.85") {
  writeFileSync(
    join(root, "Cargo.toml"),
    `[workspace]\nmembers = ${JSON.stringify(selectedMembers)}\nresolver = "3"\n[workspace.package]\nversion = "1.1.0"\nedition = "2024"\nrust-version = "${compilerFloor}"\nauthors = ["Fixture"]\ndescription = "Fixture workspace"\nlicense = "MIT"\nrepository = "https://example.invalid/fixture"\nreadme = "README.md"\npublish = false\n\n[workspace.dependencies]\nserde = { version = "1.0.229", default-features = false }\n`,
  );
  for (const member of members) {
    const name = member.split("/")[1];
    mkdirSync(join(root, member, "src"), { recursive: true });
    writeFileSync(
      join(root, member, "Cargo.toml"),
      `[package]\nname = "${name}"\nversion.workspace = true\nedition.workspace = true\nrust-version.workspace = true\nauthors.workspace = true\ndescription.workspace = true\nlicense.workspace = true\nrepository.workspace = true\nreadme.workspace = true\npublish.workspace = true\n[features]\ndefault = []\ndiagnostics = ${name === "frame-probe" ? '["frame-protocol/diagnostics"]' : "[]"}\n${name === "frame-probe" ? 'format = ["frame-protocol/format"]\n[dependencies]\nframe-protocol = { path = "../frame-protocol" }\n' : 'format = ["dep:serde", "serde/alloc", "serde/derive"]\n[dependencies]\nserde = { workspace = true, optional = true }\n'}`,
    );
    writeFileSync(
      join(
        root,
        member,
        "src",
        name === "frame-protocol" ? "lib.rs" : "main.rs",
      ),
      name === "frame-protocol" ? "pub fn message() {}\n" : "fn main() {}\n",
    );
  }
  const result = spawnSync(
    "cargo",
    ["metadata", "--no-deps", "--offline", "--format-version", "1"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  writeFileSync(join(root, "README.md"), "fixture\n");
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message ?? result.stderr);
  return JSON.parse(result.stdout);
}

it("reads real Cargo member metadata and rejects a workspace that leaves out its client", () => {
  const result = metadata();
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).not.toThrow();
  expect(() =>
    assertFrameWorkspaceMetadata(result, root, members),
  ).not.toThrow();
  expect(() =>
    assertFrameWorkspaceMetadata(metadata([members[0]]), root, members),
  ).toThrow("Both real workspace members");
});

it("rejects actual member manifests that stop inheriting edition or MSRV", () => {
  metadata();
  const libraryManifest = join(root, "crates/frame-protocol/Cargo.toml");
  writeFileSync(
    libraryManifest,
    readFileSync(libraryManifest, "utf8").replace(
      "edition.workspace = true",
      'edition = "2024"',
    ),
  );
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).toThrow(
    "must inherit edition",
  );

  metadata();
  writeFileSync(
    libraryManifest,
    readFileSync(libraryManifest, "utf8").replace(
      "rust-version.workspace = true",
      'rust-version = "1.85"',
    ),
  );
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).toThrow(
    "must inherit rust-version",
  );
});

it("rejects an actual probe manifest without diagnostics forwarding", () => {
  metadata();
  const probeManifest = join(root, "crates/frame-probe/Cargo.toml");
  writeFileSync(
    probeManifest,
    readFileSync(probeManifest, "utf8").replace(
      'diagnostics = ["frame-protocol/diagnostics"]',
      "diagnostics = []",
    ),
  );
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).toThrow(
    "diagnostics must forward",
  );
});

it("rejects an actual manifest whose compiler promise drifts above the verified floor", () => {
  expect(() =>
    assertFrameWorkspaceMetadata(metadata(members, "1.86"), root, members),
  ).toThrow("explicit compiler floor");
});

it("checks an actual disabled registry dependency from Cargo metadata without resolving it", () => {
  metadata();
  const libraryManifest = join(root, "crates/frame-protocol/Cargo.toml");
  writeFileSync(
    libraryManifest,
    `${readFileSync(libraryManifest, "utf8")}optional-external = { version = "1", optional = true }\n`,
  );
  const result = spawnSync(
    "cargo",
    ["metadata", "--no-deps", "--offline", "--format-version", "1"],
    { cwd: root, encoding: "utf8", timeout: 10_000 },
  );
  expect(result.status).toBe(0);
  expect(() =>
    assertFrameWorkspaceMetadata(JSON.parse(result.stdout), root, members),
  ).toThrow("no registry or git dependencies");
});

it("accepts the authored optional inherited serde and explicit format feature", () => {
  metadata();
  const result = spawnSync(
    "cargo",
    ["metadata", "--no-deps", "--offline", "--format-version", "1"],
    { cwd: root, encoding: "utf8", timeout: 10_000 },
  );
  expect(result.status).toBe(0);
  expect(() =>
    assertFrameWorkspaceAuthoredLayout(root, members),
  ).not.toThrow();
  expect(() =>
    assertFrameWorkspaceMetadata(JSON.parse(result.stdout), root, members),
  ).not.toThrow();
});

it("requires the client format feature to forward the library feature", () => {
  metadata();
  const probeManifest = join(root, "crates/frame-probe/Cargo.toml");
  writeFileSync(
    probeManifest,
    readFileSync(probeManifest, "utf8").replace(
      'format = ["frame-protocol/format"]',
      "format = []",
    ),
  );
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).toThrow(
    "format must forward",
  );
});

it("rejects authored workspaces that enable publishing", () => {
  metadata();
  const manifest = join(root, "Cargo.toml");
  writeFileSync(
    manifest,
    readFileSync(manifest, "utf8").replace("publish = false", "publish = true"),
  );
  expect(() => assertFrameWorkspaceAuthoredLayout(root, members)).toThrow(
    "publish=false",
  );
});

it("rejects extra files from the reviewed frame-protocol package boundary", () => {
  const exact = [
    "Cargo.lock",
    "Cargo.toml",
    "Cargo.toml.orig",
    "README.md",
    "src/lib.rs",
    "tests/public_consumer.rs",
  ];
  expect(() => assertExactFramePackageFiles(exact)).not.toThrow();
  expect(() => assertExactFramePackageFiles([...exact, "UNREVIEWED.md"])).toThrow(
    "package file list",
  );
});

it("exposes the bounded A6 maintenance packet and normalized predecessor dossier", () => {
  const files = projectFiles(frameProtocolPackage, "solution");
  expect(files["MAINTENANCE-CHALLENGE.md"]).toContain("BrokenPipe");
  expect(files["MAINTENANCE-CHALLENGE.md"]).toContain("1.1.0");
  expect(files["CHANGE-REVIEW.md"]).toContain("ADR");
  expect(files["CHANGE-REVIEW.md"]).toContain("self-review");
  expect(files["evidence/package-list.txt"]).toContain(
    "frame-protocol-workspace/MAINTENANCE-CHALLENGE.md",
  );
  expect(files["evidence/package-list.txt"]).toContain(
    "frame-protocol-workspace/CHANGE-REVIEW.md",
  );
  const dossier = JSON.parse(files["evidence/release-evidence.json"]);
  expect(dossier.release).toBe("1.1.0");
  expect(dossier.predecessor).toEqual({
    head: "16356613b729f5a456e506fc7508424994ab369b",
    tree: "e68b5123d83ac456c59d4e5c4125c9f94ac698fc",
  });
  expect(dossier.dossier_excludes_self).toBe(true);
  expect(dossier.archive_digest).toBe("outer-coordinator-report");
  expect(dossier).not.toHaveProperty("archive_sha256");
});

it("rejects include and exclude assignments in a normalized package manifest", () => {
  const normalized = '[package]\npublish = false\n';
  expect(() => assertNormalizedFramePackageManifest(normalized)).not.toThrow();
  expect(() =>
    assertNormalizedFramePackageManifest(`${normalized}include = ["src/lib.rs"]\n`),
  ).toThrow("include/exclude");
  expect(() =>
    assertNormalizedFramePackageManifest(`${normalized}exclude = ["notes"]\n`),
  ).toThrow("include/exclude");
});

it("accepts only the two local 1.0.0 to 1.1.0 lock records", () => {
  const before = `version = 4

[[package]]
name = "frame-probe"
version = "1.0.0"
dependencies = ["frame-protocol"]

[[package]]
name = "frame-protocol"
version = "1.0.0"
dependencies = ["serde"]

[[package]]
name = "serde"
version = "1.0.229"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fixed"
`;
  const after = before.replaceAll('version = "1.0.0"', 'version = "1.1.0"');
  expect(() => assertRestrictedFrameLockDelta(before, after)).not.toThrow();
  expect(() =>
    assertRestrictedFrameLockDelta(before, after.replace('checksum = "fixed"', 'checksum = "drift"')),
  ).toThrow("external lock package changed");
  expect(() =>
    assertRestrictedFrameLockDelta(
      before,
      after.replace("version = 4", "version = 3"),
    ),
  ).toThrow("lockfile preamble changed");
});

it("binds exact starter and solution dossier coverage, including changed member sources", () => {
  const files = projectFiles(frameProtocolPackage, "solution");
  const starter = projectFiles(frameProtocolPackage, "starter");
  const dossier = JSON.parse(files["evidence/release-evidence.json"]!);
  expect(Object.keys(dossier.file_sha256)).toEqual(["starter", "solution"]);
  expect(Object.keys(dossier.file_sha256.solution)).toContain(
    "crates/frame-protocol/src/lib.rs",
  );
  expect(Object.keys(dossier.file_sha256.solution)).toContain(
    "crates/frame-probe/Cargo.toml",
  );
  expect(frameDossierSelfPaths.has("evidence/release-evidence.json")).toBe(true);
  expect(normalizedPredecessorFrameProjectHash(
    join(process.cwd(), "src/content/fixtures/frame-protocol-pre-a6-projection.json"),
  )).toBe("sha256:fb62cec17adef1f4ea1780da4a53bbc3c60b3f4a4f82e935107c92dfb35b1f26");
  expect(() => assertExactDossierFileCoverage(dossier.file_sha256, { starter, solution: files })).not.toThrow();

  for (const mutate of [
    () => ({}),
    (value: typeof dossier.file_sha256) => ({ ...value, solution: { ...value.solution, "missing.txt": "sha256:" + "0".repeat(64) } }),
    (value: typeof dossier.file_sha256) => ({ ...value, solution: { ...value.solution, "../escape": "sha256:" + "0".repeat(64) } }),
    (value: typeof dossier.file_sha256) => ({ ...value, solution: { ...value.solution, "evidence/release-evidence.json": "sha256:" + "0".repeat(64) } }),
    (value: typeof dossier.file_sha256) => ({ ...value, solution: { ...value.solution, README: "sha256:" + "0".repeat(64) } }),
    (value: typeof dossier.file_sha256) => ({ ...value, solution: { ...value.solution, README: "sha256:" + "1".repeat(64) } }),
  ]) {
    expect(() => assertExactDossierFileCoverage(mutate(dossier.file_sha256), { starter, solution: files })).toThrow();
  }
});

it("requires a complete authored archive partition and rejects omitted or extra entries", () => {
  const authored = { "Cargo.toml": "root", "crates/frame-protocol/src/lib.rs": "lib" };
  const notices = ["LICENSE", "LICENSE-APACHE"];
  const prefix = "frame-protocol-workspace/";
  const archive = [
    `${prefix}Cargo.toml`,
    `${prefix}crates/frame-protocol/src/lib.rs`,
    `${prefix}LICENSE`,
    `${prefix}LICENSE-APACHE`,
  ];
  const reviewed = Object.keys(authored);
  const listing = archive.filter(
    (path) => !path.endsWith("LICENSE") && !path.endsWith("LICENSE-APACHE"),
  );
  expect(() =>
    assertExactWorkspaceArchivePartition(
      archive,
      authored,
      "frame-protocol-workspace",
      notices,
      listing,
      reviewed,
    ),
  ).not.toThrow();
  expect(() =>
    assertExactWorkspaceArchivePartition(
      archive.slice(1),
      authored,
      "frame-protocol-workspace",
      notices,
      listing,
      reviewed,
    ),
  ).toThrow("complete reviewed listing");
  expect(() =>
    assertExactWorkspaceArchivePartition(
      [...archive, `${prefix}UNREVIEWED.md`],
      { ...authored, "UNREVIEWED.md": "extra" },
      "frame-protocol-workspace",
      notices,
      listing,
      reviewed,
    ),
  ).toThrow("complete reviewed listing");
});

it("keeps the authored virtual-workspace delta to the two new packet files", () => {
  const predecessorPaths = new Set(predecessor.frameProject.package.files.map((file) => file.path));
  const currentPaths = new Set(frameProtocolPackage.files.map((file) => file.path));
  expect(() => assertExactWorkspaceFileDelta([...currentPaths], [...predecessorPaths])).not.toThrow();
  expect(() =>
    assertExactWorkspaceFileDelta(
      [...currentPaths, "UNREVIEWED.md"],
      [...predecessorPaths],
    ),
  ).toThrow("exactly the two A6 packet files");
});
