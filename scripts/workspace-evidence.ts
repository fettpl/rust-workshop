import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export type DossierVariantFiles = {
  starter?: Record<string, string>;
  solution?: Record<string, string>;
};

export const frameDossierSelfPaths = new Set([
  "RELEASE-EVIDENCE.json",
  "evidence/release-evidence.json",
]);

/** Frozen complete authored virtual-workspace listing, excluding archive notices. */
export const frameReviewedWorkspacePaths = [
  "Cargo.toml",
  "Cargo.lock",
  "README.md",
  "ADR.md",
  "CHANGELOG.md",
  "deny.toml",
  "DEPENDENCY-POLICY.md",
  "RELEASE-CHECKLIST.md",
  "RELEASE-EVIDENCE.json",
  "MAINTENANCE-CHALLENGE.md",
  "CHANGE-REVIEW.md",
  "exceptions/advisories.toml",
  "evidence/duplicate-dependencies.toml",
  "evidence/actual-cargo-tree.txt",
  "evidence/cargo-deny-snapshot.json",
  "evidence/release-evidence.json",
  "evidence/package-list.txt",
  "fixtures/external-consumer/Cargo.toml",
  "fixtures/external-consumer/src/main.rs",
  ".gitignore",
  "crates/frame-protocol/Cargo.toml",
  "crates/frame-protocol/src/lib.rs",
  "crates/frame-protocol/tests/public_consumer.rs",
  "crates/frame-probe/Cargo.toml",
  "crates/frame-probe/src/main.rs",
  "crates/frame-probe/tests/cli.rs",
] as const;

function sha256(bytes: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function assertSafeRelativePath(path: string, label: string): void {
  assert(path.length > 0 && !isAbsolute(path), `${label} must be relative: ${path}`);
  assert(!path.includes("\\"), `${label} must use repository separators: ${path}`);
  const parts = path.split("/");
  assert(!parts.includes(".") && !parts.includes(".."), `${label} traversal: ${path}`);
  assert.equal(path, parts.join("/"), `${label} must be normalized: ${path}`);
}

function safeArchivePath(root: string, path: string): string {
  assertSafeRelativePath(path, "dossier path");
  const absoluteRoot = resolve(root);
  const target = resolve(absoluteRoot, path);
  assert.equal(relative(absoluteRoot, target), path, `dossier path escapes archive: ${path}`);
  return target;
}

function assertExactVariantCoverage(
  variant: string,
  declared: Record<string, string> | undefined,
  authored: Record<string, string>,
  actualRoot?: string,
): void {
  assert(declared, `dossier file_sha256.${variant} is required`);
  const expectedPaths = Object.keys(authored).filter(
    (path) => !frameDossierSelfPaths.has(path),
  );
  const declaredPaths = Object.keys(declared);
  assert.ok(declaredPaths.length > 0, `dossier file_sha256.${variant} must be non-empty`);
  for (const path of declaredPaths) {
    assertSafeRelativePath(path, `dossier file_sha256.${variant} path`);
    assert(!frameDossierSelfPaths.has(path), `dossier must not hash itself: ${path}`);
    assert(
      Object.prototype.hasOwnProperty.call(authored, path),
      `dossier file hash is not an authored path: ${path}`,
    );
    assert.match(declared[path]!, /^sha256:[0-9a-f]{64}$/, `dossier hash: ${path}`);
  }
  assert.deepEqual(
    [...declaredPaths].sort(),
    [...expectedPaths].sort(),
    `dossier file_sha256.${variant} must cover exactly the non-self authored files`,
  );
  for (const path of expectedPaths) {
    const expectedHash = sha256(authored[path]!);
    assert.equal(declared[path], expectedHash, `canonical ${variant} file hash: ${path}`);
    if (actualRoot === undefined) continue;
    const target = safeArchivePath(actualRoot, path);
    assert(existsSync(target), `dossier ${variant} file is missing from archive: ${path}`);
    assert.equal(declared[path], sha256(readFileSync(target)), `archive ${variant} file hash: ${path}`);
  }
}

export function assertExactDossierFileCoverage(
  declared: DossierVariantFiles | undefined,
  authored: { starter: Record<string, string>; solution: Record<string, string> },
  actualSolutionRoot?: string,
): void {
  assert(declared, "dossier file_sha256 is required");
  assertExactVariantCoverage("starter", declared.starter, authored.starter);
  assertExactVariantCoverage("solution", declared.solution, authored.solution, actualSolutionRoot);
}

export function normalizedPredecessorFrameProjectHash(fixturePath: string): string {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    predecessor?: { head?: string; tree?: string };
    frameProject?: Record<string, unknown>;
  };
  assert.deepEqual(fixture.predecessor, {
    head: "16356613b729f5a456e506fc7508424994ab369b",
    tree: "e68b5123d83ac456c59d4e5c4125c9f94ac698fc",
  });
  assert(fixture.frameProject, "tracked predecessor fixture must contain frameProject");
  assert.deepEqual(
    Object.keys(fixture.frameProject).sort(),
    ["id", "lessonIds", "package", "reviewConceptIds"].sort(),
    "tracked predecessor frameProject projection shape",
  );
  assert.equal(fixture.frameProject.id, "frame-protocol");
  assert.equal(
    (fixture.frameProject.package as { id?: string }).id,
    "frame-protocol-workspace",
  );
  return sha256(JSON.stringify(fixture.frameProject));
}

export function assertExactWorkspaceArchivePartition(
  archivePaths: readonly string[],
  authoredFiles: Record<string, string>,
  packageId: string,
  noticePaths: readonly string[],
  declaredListing: readonly string[] = frameReviewedWorkspacePaths.map(
    (path) => `${packageId}/${path}`,
  ),
  reviewedAuthoredPaths: readonly string[] = frameReviewedWorkspacePaths,
): void {
  const prefix = `${packageId}/`;
  const reviewed = new Set(reviewedAuthoredPaths.map((path) => `${prefix}${path}`));
  const authored = new Set(Object.keys(authoredFiles).map((path) => `${prefix}${path}`));
  const notices = new Set(noticePaths.map((path) => `${prefix}${path}`));
  const actual = new Set(archivePaths);
  assert.equal(actual.size, archivePaths.length, "archive contains duplicate paths");
  for (const path of archivePaths) {
    assert(path.startsWith(prefix), `archive path has an unexpected package prefix: ${path}`);
    assert(!path.includes("\\"), `archive path uses an unsafe separator: ${path}`);
  }
  assert.deepEqual(
    [...authored].sort(),
    [...reviewed].sort(),
    "authored workspace files must equal the complete reviewed listing",
  );
  assert.deepEqual(
    [...new Set(declaredListing)].sort(),
    [...reviewed].sort(),
    "declared package listing must equal the complete reviewed listing",
  );
  assert.deepEqual(
    [...actual].filter((path) => !notices.has(path)).sort(),
    [...reviewed].sort(),
    "archive authored workspace entries must equal the complete reviewed listing",
  );
  assert.deepEqual(
    [...actual].filter((path) => notices.has(path)).sort(),
    [...notices].sort(),
    "archive notice partition must be exact",
  );
  for (const path of actual) {
    assert(authored.has(path) || notices.has(path), `archive path is unreviewed: ${path}`);
  }
}

export function assertExactWorkspaceFileDelta(
  currentPaths: readonly string[],
  predecessorPaths: readonly string[],
  allowedAdditions = ["CHANGE-REVIEW.md", "MAINTENANCE-CHALLENGE.md"],
): void {
  const current = new Set(currentPaths);
  const predecessor = new Set(predecessorPaths);
  assert.equal(current.size, currentPaths.length, "current workspace paths must be unique");
  assert.equal(predecessor.size, predecessorPaths.length, "predecessor workspace paths must be unique");
  assert.deepEqual(
    [...current].filter((path) => !predecessor.has(path)).sort(),
    [...allowedAdditions].sort(),
    "workspace path delta must contain exactly the two A6 packet files",
  );
  assert.deepEqual(
    [...predecessor].filter((path) => !current.has(path)),
    [],
    "A6 must not remove predecessor workspace files",
  );
}

