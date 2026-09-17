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
} from "../../scripts/workspace-package";

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
