import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { reduceWitness, validateEvidenceReport } from "../../scripts/fuzz-evidence";
import { verifyNamedRegressionFailure } from "../../scripts/fuzz-result";
import { assertFreshFuzzArchive } from "../../scripts/fuzz-archive";
import { miniGrepPackage } from "./projects/mini-grep";

const reportFixtures = mkdtempSync(join(tmpdir(), "fuzz-report-fixtures-"));
const reportRunDirectory = join(reportFixtures, "run-authored-1");
mkdirSync(reportRunDirectory);
const originalPath = join(reportRunDirectory, "original.seed");
const reducedPath = join(reportRunDirectory, "reduced.seed");
const otherRunPath = join(reportFixtures, "run-other", "same-bytes.seed");
const originalBytes = Buffer.from("ABCDE");
const reducedBytes = Buffer.from("BC");
writeFileSync(originalPath, originalBytes);
writeFileSync(reducedPath, reducedBytes);
mkdirSync(join(reportFixtures, "run-other"));
writeFileSync(otherRunPath, originalBytes);
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
afterAll(() => rmSync(reportFixtures, { recursive: true, force: true }));

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
  artifacts: { original: { path: originalPath, sha256: hash(originalBytes), bytes: 5, runId: "run-authored-1", archiveSha256: "a".repeat(64), manifestSha256: "b".repeat(64) }, reduced: { path: reducedPath, sha256: hash(reducedBytes), bytes: 2, runId: "run-authored-1", archiveSha256: "a".repeat(64), manifestSha256: "b".repeat(64) } },
  reduction: { attempts: 4, status: "reduced", failureKind: "SelectionMismatch", replay: { status: "failed", failureKind: "SelectionMismatch" } },
  mutantReplay: { status: "failed", failureKind: "SelectionMismatch" },
  restoredReplay: { status: "passed", failureKind: "none" },
  stableRegression: { identity: "substring-prefix-seed", status: "passed", toolchain: "1.85.0", channel: "stable", sha256: "e".repeat(64) },
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
  }, { minInputBytes: 0 });
  expect(result.reduced.length).toBeLessThan(original.length);
  expect(new TextDecoder().decode(result.reduced)).toBe("BC");
  expect(result.original).toEqual(original);
});

it("shrinks a padded witness with a strict byte budget", () => {
  const original = new TextEncoder().encode("PAD-ABCDE-TAIL");
  const result = reduceWitness(
    original,
    (candidate) => {
      const text = new TextDecoder().decode(candidate);
      return text.includes("BC")
        ? { status: "finding", failureKind: "SelectionMismatch" }
        : { status: "other" };
    },
    { maxAttempts: 64, deadlineMs: 5_000, minInputBytes: 0 },
  );
  expect(result.status).toBe("reduced");
  expect(result.reduced.length).toBeLessThan(original.length);
  expect(new TextDecoder().decode(result.reduced)).toBe("BC");
  expect(result.attempts).toBeLessThanOrEqual(64);
});

it("does not treat timeout or compile failure as a reduction predicate", () => {
  const original = new Uint8Array([0, 0, 1, 120]);
  const result = reduceWitness(original, () => ({ status: "timeout" }));
  expect(result.status).toBe("unchanged");
  expect(result.reduced).toEqual(original);
});

it("keeps accepted reductions inside the framed input domain", () => {
  const result = reduceWitness(new Uint8Array([0, 0, 1, 120]), () => ({
    status: "finding",
    failureKind: "SelectionMismatch",
  }));
  expect(result.reduced.length).toBeGreaterThanOrEqual(3);
});

it("rejects malformed, stale and replay-only reports", () => {
  expect(() => validateEvidenceReport(validReport(), { runId: "run-authored-1", archiveSha256: "a".repeat(64), manifestSha256: "b".repeat(64), regressionSha256: hash(originalBytes), stableRegressionSha256: "e".repeat(64) })).not.toThrow();
  expect(() => validateEvidenceReport(validReport())).toThrow();
  for (const mutate of [
    (report: ReturnType<typeof validReport>) => ({ ...report, schemaVersion: 2 }),
    (report: ReturnType<typeof validReport>) => ({ ...report, referenceCampaign: { ...report.referenceCampaign, replayOnly: true } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, manifestSha256: "stale" }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, bytes: 0 } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, path: join(reportFixtures, "missing.seed") } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, reduced: { ...report.artifacts.reduced!, sha256: "f".repeat(64) } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, runId: "other-run" } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, path: otherRunPath } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, toolchain: "stable" }),
    (report: ReturnType<typeof validReport>) => ({ ...report, observedExecutions: 20001 }),
    (report: ReturnType<typeof validReport>) => ({ ...report, reduction: { ...report.reduction, attempts: 257 } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, phaseErrors: ["restored replay failed"] }),
    (report: ReturnType<typeof validReport>) => ({ ...report, mutantReplay: { status: "passed", failureKind: "none" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, mutantReplay: { status: "infrastructure", failureKind: "SelectionMismatch" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, restoredReplay: { status: "passed", failureKind: "SelectionMismatch" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, restoredReplay: { status: "failed", failureKind: "ReaderMismatch" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, reduction: { ...report.reduction, status: "reduced" }, artifacts: { original: report.artifacts.original } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, reduction: { ...report.reduction, replay: { status: "passed", failureKind: "none" } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, reduction: { ...report.reduction, status: "rejected", attempts: 0, replay: { status: "infrastructure", failureKind: "SelectionMismatch" } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, artifacts: { ...report.artifacts, original: { ...report.artifacts.original, sha256: "c".repeat(64) } } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, target: "other-harness" }),
    (report: ReturnType<typeof validReport>) => ({ ...report, mutant: { ...report.mutant, identity: "other-mutant" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, stableRegression: { ...report.stableRegression, identity: "padded-witness" } }),
    (report: ReturnType<typeof validReport>) => ({ ...report, stableRegression: { ...report.stableRegression, sha256: "d".repeat(64) } }),
  ]) expect(() => validateEvidenceReport(mutate(validReport()), { runId: "run-authored-1", archiveSha256: "a".repeat(64), manifestSha256: "b".repeat(64), regressionSha256: hash(originalBytes), stableRegressionSha256: "e".repeat(64) })).toThrow();
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
    reduction: { attempts: 0, status: "unchanged", failureKind: "SelectionMismatch", replay: { status: "infrastructure", failureKind: "SelectionMismatch" } },
    mutantReplay: { status: "infrastructure", failureKind: "SelectionMismatch" },
    restoredReplay: { status: "infrastructure", failureKind: "none" },
    stableRegression: { identity: "substring-prefix-seed", status: "infrastructure", toolchain: "1.85.0", channel: "stable", sha256: "0".repeat(64) },
    phaseErrors: [],
    limitations: ["cargo-fuzz unavailable"],
})).not.toThrow();
});

it("accepts only the named stable regression failure", () => {
  const named = "running 2 tests\ntest substring_prefix_witness_is_exact_and_replays_selection_mismatch ... FAILED\ntest boundary_contract ... ok\ntest result: FAILED. 1 passed; 1 failed";
  const unrelated = "running 2 tests\ntest substring_prefix_witness_is_exact_and_replays_selection_mismatch ... ok\ntest boundary_contract ... FAILED\ntest result: FAILED. 1 passed; 1 failed";
  expect(verifyNamedRegressionFailure({ status: 101, signal: null, stdout: named, stderr: "" }, "substring_prefix_witness_is_exact_and_replays_selection_mismatch")).toBe(true);
  expect(verifyNamedRegressionFailure({ status: 101, signal: null, stdout: unrelated, stderr: "" }, "substring_prefix_witness_is_exact_and_replays_selection_mismatch")).toBe(false);
  expect(verifyNamedRegressionFailure({ status: 1, signal: null, stdout: "error: could not compile", stderr: "" }, "substring_prefix_witness_is_exact_and_replays_selection_mismatch")).toBe(false);
});

it("byte-compares both served Mini grep archives and rejects stale bytes", () => {
  for (const variant of ["starter", "solution"] as const) {
    const path = join(process.cwd(), "public/projects", miniGrepPackage.id, `${variant}.zip`);
    const served = readFileSync(path);
    expect(() => assertFreshFuzzArchive(miniGrepPackage, variant, served)).not.toThrow();
    const stale = Buffer.from(served);
    stale[stale.length - 1] ^= 0xff;
    expect(() => assertFreshFuzzArchive(miniGrepPackage, variant, stale)).toThrow(/Stale authored/);
  }
});
