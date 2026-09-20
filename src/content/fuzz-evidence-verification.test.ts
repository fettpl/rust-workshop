import { expect, it } from "vitest";
import { reduceWitness, validateEvidenceReport } from "../../scripts/fuzz-evidence";

const validReport = () => ({
  schemaVersion: 1,
  runId: "run-authored-1",
  archiveSha256: "a".repeat(64),
  manifestSha256: "b".repeat(64),
  target: "selection",
  toolchain: "nightly-2026-08-08",
  host: "x86_64-unknown-linux-gnu",
  bounds: { minInputBytes: 3, maxInputBytes: 4096, maxRuns: 20000, maxSeconds: 30, timeoutSeconds: 3, rssLimitMb: 1024 },
  status: "passed",
  referenceCampaign: { status: "passed", observedRuns: 20000, instrumentation: true, normalCompletion: true, replayOnly: false },
  observedExecutions: 20000,
  mutant: { identity: "substring-to-prefix", status: "failed", assertion: "mini-grep selection oracle mismatch" },
  artifacts: { original: { path: "artifacts/original", sha256: "c".repeat(64), bytes: 5 }, reduced: { path: "artifacts/reduced", sha256: "d".repeat(64), bytes: 2 } },
  reduction: { attempts: 4, status: "reduced", failureKind: "SelectionMismatch" },
  mutantReplay: { status: "failed", failureKind: "SelectionMismatch" },
  restoredReplay: { status: "passed", failureKind: "none" },
  stableRegression: { status: "passed", toolchain: "rustc 1.85.0", sha256: "e".repeat(64) },
  phaseErrors: [],
  limitations: ["finite campaign"],
});

it("reduces only a strict SelectionMismatch and preserves byte order", () => {
  const original = new TextEncoder().encode("ABCDE");
  const result = reduceWitness(original, (candidate) => {
    const text = new TextDecoder().decode(candidate);
    return ["BC", "ABC", "BCD", "ABCD", "BCDE", "ABCDE"].includes(text)
      ? { status: "finding", failureKind: "SelectionMismatch" }
      : { status: "other" };
  });
  expect(result.reduced.length).toBeLessThan(original.length);
  expect(new TextDecoder().decode(result.reduced)).toBe("BC");
  expect(result.original).toEqual(original);
});

it("does not treat timeout or compile failure as a reduction predicate", () => {
  const original = new Uint8Array([0, 0, 1, 120]);
  const result = reduceWitness(original, () => ({ status: "timeout" }));
  expect(result.status).toBe("unchanged");
  expect(result.reduced).toEqual(original);
});

it("rejects malformed, stale and replay-only reports", () => {
  expect(() => validateEvidenceReport(validReport())).not.toThrow();
  for (const mutate of [
    (report: ReturnType<typeof validReport>) => ({ ...report, schemaVersion: 2 }),
    (report: ReturnType<typeof validReport>) => ({ ...report, referenceCampaign: { ...report.referenceCampaign, replayOnly: true } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, manifestSha256: "stale" }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, bytes: 0 } } }),
  ]) expect(() => validateEvidenceReport(mutate(validReport()))).toThrow();
});

it("accepts an explicit infrastructure report without inventing an artifact", () => {
  expect(() => validateEvidenceReport({
    schemaVersion: 1,
    runId: "run-infrastructure",
    archiveSha256: "a".repeat(64),
    manifestSha256: "b".repeat(64),
    target: "selection",
    toolchain: "nightly-2026-08-08",
    host: "unknown",
    bounds: { minInputBytes: 3, maxInputBytes: 4096, maxRuns: 20000, maxSeconds: 30, timeoutSeconds: 3, rssLimitMb: 1024 },
    status: "infrastructure",
    referenceCampaign: { status: "infrastructure", observedRuns: 0, instrumentation: false, normalCompletion: false, replayOnly: false },
    observedExecutions: 0,
    mutant: { identity: "substring-to-prefix", status: "infrastructure", assertion: "mini-grep selection oracle mismatch" },
    artifacts: { original: { path: "", sha256: "0".repeat(64), bytes: 0 } },
    reduction: { attempts: 0, status: "unchanged", failureKind: "SelectionMismatch" },
    mutantReplay: { status: "infrastructure", failureKind: "SelectionMismatch" },
    restoredReplay: { status: "infrastructure", failureKind: "none" },
    stableRegression: { status: "infrastructure", toolchain: "rustc 1.85.0", sha256: "0".repeat(64) },
    phaseErrors: [],
    limitations: ["cargo-fuzz unavailable"],
  })).not.toThrow();
});
