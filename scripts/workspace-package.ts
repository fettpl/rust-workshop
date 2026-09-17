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
