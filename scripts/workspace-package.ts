import assert from "node:assert/strict";

/** The complete Cargo package file list reviewed for frame-protocol. */
export const frameProtocolPackageFiles = [
  "Cargo.lock",
  "Cargo.toml",
  "Cargo.toml.orig",
  "README.md",
  "src/lib.rs",
  "tests/public_consumer.rs",
] as const;

/** Rejects archive membership drift, including unreviewed files. */
export function assertExactFramePackageFiles(
  files: readonly string[],
  message = "frame-protocol package file list",
): void {
  assert.deepEqual(
    [...files].sort(),
    [...frameProtocolPackageFiles].sort(),
    message,
  );
}

/** Checks Cargo's normalized package manifest for the reviewed archive policy. */
export function assertNormalizedFramePackageManifest(source: string): void {
  assert.match(source, /publish\s*=\s*false/, "normalized publish=false");
  assert.doesNotMatch(
    source,
    /^(include|exclude)\s*=/m,
    "normalized package must not add an include/exclude policy",
  );
}

/**
 * The A6 candidate changes only the two local workspace package version
 * records. Every dependency package block, checksum, source and edge must be
 * byte-identical between the starter and solution lockfiles.
 */
export function assertRestrictedFrameLockDelta(
  before: string,
  after: string,
): void {
  const blocks = (source: string) =>
    [...source.matchAll(/\[\[package\]\][\s\S]*?(?=\n\[\[package\]\]|\s*$)/g)].map(
      (match) => match[0],
    );
  const beforeBlocks = blocks(before);
  const afterBlocks = blocks(after);
  assert.equal(afterBlocks.length, beforeBlocks.length, "lock package count drift");
  const local = new Set(["frame-probe", "frame-protocol"]);
  const changed: string[] = [];
  for (let index = 0; index < beforeBlocks.length; index += 1) {
    const oldBlock = beforeBlocks[index]!;
    const newBlock = afterBlocks[index]!;
    const name = oldBlock.match(/^\[\[package\]\]\nname = "([^"]+)"/m)?.[1];
    assert.equal(
      name,
      newBlock.match(/^\[\[package\]\]\nname = "([^"]+)"/m)?.[1],
      "lock package ordering/name drift",
    );
    if (!local.has(name ?? "")) {
      assert.equal(newBlock, oldBlock, `external lock package changed: ${name}`);
      continue;
    }
    const expected = oldBlock.replace(
      /^(\[\[package\]\]\nname = "(?:frame-probe|frame-protocol)"\nversion = )"1\.0\.0"$/m,
      '$1"1.1.0"',
    );
    assert.notEqual(expected, oldBlock, `missing 1.0.0 local lock record: ${name}`);
    assert.equal(newBlock, expected, `local lock delta must only update ${name}`);
    changed.push(name!);
  }
  assert.deepEqual(
    changed.sort(),
    ["frame-probe", "frame-protocol"],
    "exactly the two local package version records must change",
  );
}
