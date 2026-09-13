import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export interface WorkspaceMetadata {
  workspace_members: string[];
  workspace_root: string;
  packages: {
    id: string;
    name: string;
    version: string;
    edition: string;
    rust_version: string | null;
    manifest_path: string;
    dependencies: { name: string; source: string | null; path?: string }[];
    features: Record<string, string[]>;
    targets: { kind: string[]; src_path: string; edition: string }[];
  }[];
}

/**
 * Checks the fixed, authored manifest layout for this one teaching workspace.
 *
 * This intentionally is not a TOML parser or a general Cargo-manifest
 * validator. Cargo metadata below validates resolved package facts; this small
 * source contract makes the educational inheritance and feature-forwarding
 * decisions observable, including decisions Cargo metadata has already
 * resolved away.
 */
export function assertFrameWorkspaceAuthoredLayout(
  root: string,
  expectedMembers: string[],
): void {
  const rootLines = manifestLines(join(root, "Cargo.toml"));
  assert.ok(rootLines.has("[workspace]"), "root: virtual workspace table");
  assert.ok(!rootLines.has("[package]"), "root must stay a virtual workspace");
  assert.ok(rootLines.has('resolver = "3"'), "root: resolver 3");
  const declaredMembers = [...rootLines].find((line) =>
    line.startsWith("members ="),
  );
  assert.equal(
    declaredMembers?.replaceAll(/\s/g, ""),
    `members=[${expectedMembers.map((member) => JSON.stringify(member)).join(",")}]`,
    "root: declared members must match the authored archive layout",
  );

  const inherited = [
    "version",
    "edition",
    "rust-version",
    "authors",
    "description",
    "license",
    "repository",
    "readme",
    "publish",
  ];
  for (const member of expectedMembers) {
    const lines = manifestLines(join(root, member, "Cargo.toml"));
    assert.ok(lines.has("[package]"), `${member}: package table`);
    for (const key of inherited)
      assert.ok(
        lines.has(`${key}.workspace = true`),
        `${member}: must inherit ${key} from workspace`,
      );
  }

  const library = manifestLines(
    join(root, "crates", "frame-protocol", "Cargo.toml"),
  );
  assert.ok(
    library.has("default = []"),
    "frame-protocol: empty default feature",
  );
  assert.ok(
    library.has("diagnostics = []"),
    "frame-protocol: diagnostics feature",
  );

  const probe = manifestLines(
    join(root, "crates", "frame-probe", "Cargo.toml"),
  );
  assert.ok(probe.has("default = []"), "frame-probe: empty default feature");
  assert.ok(
    probe.has('diagnostics = ["frame-protocol/diagnostics"]'),
    "frame-probe: diagnostics must forward to frame-protocol",
  );
}

function manifestLines(path: string): Set<string> {
  return new Set(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
}

/** Validates real Cargo metadata for the authored Frame Protocol exercise. */
export function assertFrameWorkspaceMetadata(
  metadata: WorkspaceMetadata,
  root: string,
  expectedMembers: string[],
): void {
  const members = metadata.packages.filter((pkg) =>
    metadata.workspace_members.includes(pkg.id),
  );
  assert.equal(
    realpathSync(metadata.workspace_root),
    realpathSync(root),
    "Cargo must inspect the extracted authored workspace",
  );
  assert.deepEqual(
    members.map((pkg) => pkg.name).sort(),
    ["frame-probe", "frame-protocol"],
    "Both real workspace members are required",
  );
  assert.deepEqual(
    members
      .map((pkg) =>
        relative(metadata.workspace_root, dirname(pkg.manifest_path)),
      )
      .sort(),
    [...expectedMembers].sort(),
    "Archive layout and Cargo membership must agree",
  );
  assert.equal(
    metadata.packages.length,
    2,
    "This exercise promises a std-only workspace without external dependencies",
  );
  for (const member of members) {
    assert.equal(member.edition, "2024", `${member.name}: edition`);
    for (const target of member.targets)
      assert.equal(target.edition, "2024", `${member.name}: target edition`);
    for (const dependency of member.dependencies) {
      assert.equal(
        dependency.source,
        null,
        `${member.name}: no registry or git dependencies, including disabled optional ones`,
      );
      assert.ok(
        dependency.path &&
          members.some(
            (pkg) =>
              realpathSync(dirname(pkg.manifest_path)) ===
              realpathSync(dependency.path!),
          ),
        `${member.name}: dependencies stay inside the authored workspace`,
      );
    }
    assert.match(
      member.rust_version ?? "",
      /^1\.85(?:\.0)?$/,
      `${member.name}: explicit compiler floor`,
    );
    assert.ok(
      member.version.startsWith("1."),
      `${member.name}: compatibility examples assume a 1.x public API`,
    );
    assert.ok(
      member.targets.some((target) =>
        target.kind.includes(member.name === "frame-protocol" ? "lib" : "bin"),
      ),
      `${member.name}: real target`,
    );
  }
  const library = members.find((pkg) => pkg.name === "frame-protocol")!;
  assert.ok(
    Object.hasOwn(library.features, "diagnostics"),
    "Additive diagnostics feature must exist",
  );
}
