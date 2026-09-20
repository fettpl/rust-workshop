/** Authored evidence metadata for the Mini grep fuzz workspace. */
export const miniGrepFuzzEvidenceManifest = {
  schemaVersion: 1,
  target: "selection",
  toolchain: "nightly-2026-08-08",
  cargoFuzz: "0.13.2",
  inputBounds: { min: 3, max: 4096 },
  campaign: {
    seed: 20260913,
    maxRuns: 20000,
    maxSeconds: 30,
    timeoutSeconds: 3,
    rssLimitMb: 1024,
  },
  sourceHashes: {
    "fuzz/support/case.rs": "2ceb7e43e78efe2829979c7d4db5dc29076b744899376db4fd9ba1b94e856ca2",
    "fuzz/support/check.rs": "20cc8af2abe80ee0f643967c01dcb8b173783e67d5c9b75d9c1aba25a0d04a8a",
    "fuzz/oracle.rs": "a9bb985ffe6e9abc77dd00a961029d02ad6dc8f4c43426827130535feb76c915a",
    "fuzz/fuzz_targets/selection.rs": "215b19b353385bbb959baeec888944fc463be2481a6f11bc3e7358967d62579e",
  },
  fixedRegressionSha256:
    "9a4e5eea45a79d6a59b9c9e64d3e043ad612e9340526492e52f020526c4deaa1",
} as const;

export const miniGrepFuzzEvidenceDocumentation = `# Mini grep fuzz evidence

The authored harness decodes a three-byte binary header, preserves raw body bytes, and uses an independent distance/mask oracle. Stable regression tests replay both \`substring-prefix.seed\` and the padded witness \`substring-prefix-padded.seed\`; the verifier reduces and replays the padded witness through the controlled SelectionMismatch mutant. The nightly campaign is a bounded observation, not proof of no bugs.

Replay and campaign are separate operations. The verifier records archive and manifest hashes, toolchain, host, observed runs, raw logs, corpus, reducer attempts, and limitations. Missing instrumentation, stale identity, timeout, and compile errors are infrastructure or failed evidence.
`;

export const miniGrepFuzzRegressionSeed = String.fromCharCode(0, 0, 1) + "xax\n";
export const miniGrepFuzzPaddedRegressionSeed = String.fromCharCode(0, 0, 1) + "xpadding\nax\n";
