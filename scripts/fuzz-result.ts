export type FuzzProcessResult = {
  status: number | null;
  signal: string | null;
  error?: Error;
  stdout: string;
  stderr: string;
};

export type FuzzExpectation =
  | { kind: "campaign"; minimumRuns: number }
  | { kind: "counterexample"; artifactWritten: boolean }
  | { kind: "replay" };

export type FuzzPhaseStatus = "passed" | "failed" | "infrastructure";
export type FuzzEvidenceReport = {
  schemaVersion: 1;
  runId: string;
  archiveSha256: string;
  manifestSha256: string;
  target: string;
  toolchain: string;
  host: string;
  bounds: {
    minInputBytes: number;
    maxInputBytes: number;
    maxRuns: number;
    maxSeconds: number;
    timeoutSeconds: number;
    rssLimitMb: number;
  };
  status: FuzzPhaseStatus;
  referenceCampaign: {
    status: FuzzPhaseStatus;
    observedRuns: number;
    instrumentation: boolean;
    normalCompletion: boolean;
    replayOnly: boolean;
  };
  observedExecutions: number;
  mutant: { identity: string; status: FuzzPhaseStatus; assertion: string };
  artifacts: {
    original: ArtifactProvenance;
    reduced?: ArtifactProvenance;
  };
  reduction: {
    attempts: number;
    status: "reduced" | "unchanged" | "rejected";
    failureKind: string;
    replay: { status: FuzzPhaseStatus; failureKind: string };
  };
  mutantReplay: { status: FuzzPhaseStatus; failureKind: string };
  restoredReplay: { status: FuzzPhaseStatus; failureKind: string };
  stableRegression: { identity: "substring-prefix-seed"; status: FuzzPhaseStatus; toolchain: "1.85.0"; channel: "stable"; sha256: string };
  phaseErrors: string[];
  limitations: string[];
};

export type ArtifactProvenance = {
  path: string;
  sha256: string;
  bytes: number;
  runId?: string;
  archiveSha256?: string;
  manifestSha256?: string;
};

export type FuzzEvidenceTrust = {
  runId: string;
  archiveSha256: string;
  manifestSha256: string;
  regressionSha256: string;
  stableRegressionSha256: string;
};

const sha256 = /^[a-f0-9]{64}$/;

/** Validate machine-readable provenance before it can be reported as evidence. */
export function validateFuzzEvidenceReport(
  report: unknown,
  trust?: FuzzEvidenceTrust,
): string[] {
  const errors: string[] = [];
  if (!report || typeof report !== "object") return ["report must be an object"];
  const value = report as Partial<FuzzEvidenceReport>;
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["runId", "target", "toolchain", "host"] as const)
    if (typeof value[field] !== "string" || !value[field]?.trim()) errors.push(`missing ${field}`);
  if (typeof value.runId === "string" && !/^[A-Za-z0-9._-]+$/.test(value.runId)) errors.push("runId contains unsafe path characters");
  for (const field of ["archiveSha256", "manifestSha256"] as const)
    if (typeof value[field] !== "string" || !sha256.test(value[field])) errors.push(`invalid ${field}`);
  if (value.toolchain !== "nightly-2026-08-08") errors.push("toolchain is not the reviewed nightly");
  if (!value.bounds || value.bounds.minInputBytes !== 3 || value.bounds.maxInputBytes !== 4096 || value.bounds.maxRuns !== 20000 || value.bounds.maxSeconds !== 30 || value.bounds.timeoutSeconds !== 3 || value.bounds.rssLimitMb !== 1024)
    errors.push("bounds do not match the reviewed campaign");
  if (!["passed", "failed", "infrastructure"].includes(value.status ?? "")) errors.push("invalid report status");
  const campaign = value.referenceCampaign;
  if (!campaign || typeof campaign.observedRuns !== "number" || campaign.observedRuns < 0 || typeof campaign.instrumentation !== "boolean" || typeof campaign.normalCompletion !== "boolean" || typeof campaign.replayOnly !== "boolean") errors.push("incomplete reference campaign");
  if (campaign && !["passed", "failed", "infrastructure"].includes(campaign.status)) errors.push("invalid reference campaign status");
  if (campaign?.replayOnly) errors.push("replay-only report cannot satisfy campaign evidence");
  if (campaign?.status === "passed" && (campaign.observedRuns < 1000 || !campaign.instrumentation || !campaign.normalCompletion || campaign.replayOnly)) errors.push("passed campaign lacks minimum instrumented normal runs");
  if (typeof value.observedExecutions !== "number" || !Number.isInteger(value.observedExecutions) || value.observedExecutions < 0) errors.push("observedExecutions must be a non-negative integer");
  if (campaign && value.bounds && (campaign.observedRuns > value.bounds.maxRuns || (value.observedExecutions ?? -1) > value.bounds.maxRuns || value.observedExecutions !== campaign.observedRuns)) errors.push("campaign execution count exceeds or disagrees with bounds");
  if (value.target !== "selection") errors.push("target is not the reviewed selection harness");
  if (!value.mutant || value.mutant.identity !== "substring-to-prefix" || value.mutant.assertion !== "mini-grep selection oracle mismatch") errors.push("invalid mutant identity");
  const original = value.artifacts?.original;
  const partialArtifact = value.status === "infrastructure" && original?.bytes === 0 && original.path === "" && original.sha256 === "0".repeat(64);
  const validateArtifact = (artifact: ArtifactProvenance | undefined, name: string) => {
    if (!artifact || !artifact.path || !sha256.test(artifact.sha256) || !Number.isInteger(artifact.bytes) || artifact.bytes <= 0) {
      errors.push(`invalid ${name} artifact provenance`);
      return;
    }
    if (artifact.runId !== value.runId || artifact.archiveSha256 !== value.archiveSha256 || artifact.manifestSha256 !== value.manifestSha256) errors.push(`mixed ${name} artifact identity`);
    const pathParts = artifact.path.split(/[\\/]/).filter(Boolean);
    if (artifact.path.includes("..") || !pathParts.includes(value.runId ?? "") || !existsSync(artifact.path) || !statSync(artifact.path).isFile()) {
      errors.push(`stale ${name} artifact path`);
      return;
    }
    const bytes = readFileSync(artifact.path);
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== artifact.bytes || actualHash !== artifact.sha256) errors.push(`stale ${name} artifact hash`);
  };
  if (!partialArtifact) validateArtifact(original, "original");
  const reduced = value.artifacts?.reduced;
  if (reduced) {
    validateArtifact(reduced, "reduced");
    if (original && original.bytes > 0 && reduced.bytes >= original.bytes) errors.push("reduced artifact is not smaller");
  }
  if (!value.reduction || !Number.isInteger(value.reduction.attempts) || value.reduction.attempts < 0 || value.reduction.attempts > 256 || !["reduced", "unchanged", "rejected"].includes(value.reduction.status) || value.reduction.failureKind !== "SelectionMismatch") errors.push("invalid reduction evidence");
  if (value.reduction && value.reduction.status === "reduced" && (!reduced || !original || original.bytes <= 0 || reduced.bytes >= original.bytes || value.reduction.attempts < 1)) errors.push("reduced status lacks a strict reduced artifact");
  if (value.reduction && value.reduction.status !== "reduced" && reduced) errors.push("non-reduced status cannot carry a reduced artifact");
  if (!value.reduction?.replay || !["passed", "failed", "infrastructure"].includes(value.reduction.replay.status) || typeof value.reduction.replay.failureKind !== "string") errors.push("invalid reduction replay phase");
  if (value.reduction?.replay.status === "failed" && value.reduction.replay.failureKind !== "SelectionMismatch") errors.push("reduction replay failure kind must be SelectionMismatch");
  for (const [name, phase] of [["mutantReplay", value.mutantReplay], ["restoredReplay", value.restoredReplay]] as const) {
    if (!phase || !["passed", "failed", "infrastructure"].includes(phase.status) || typeof phase.failureKind !== "string") errors.push(`invalid ${name} phase`);
  }
  if (value.mutant?.status === "failed" && (!value.mutantReplay || value.mutantReplay.status !== "failed" || value.mutantReplay.failureKind !== "SelectionMismatch")) errors.push("failed mutant must have a SelectionMismatch replay");
  if (value.restoredReplay?.status === "infrastructure" && value.status === "passed") errors.push("passed report cannot have infrastructure restored replay");
  if (value.mutantReplay && value.mutantReplay.status === "failed" && value.mutantReplay.failureKind !== "SelectionMismatch") errors.push("mutant replay failure kind must be SelectionMismatch");
  if (value.restoredReplay && value.restoredReplay.status === "passed" && value.restoredReplay.failureKind !== "none") errors.push("restored replay pass must have failureKind none");
  if (!value.stableRegression || value.stableRegression.identity !== "substring-prefix-seed" || !["passed", "failed", "infrastructure"].includes(value.stableRegression.status)) errors.push("invalid stableRegression identity or phase");
  if (!value.stableRegression || value.stableRegression.toolchain !== "1.85.0" || value.stableRegression.channel !== "stable" || !sha256.test(value.stableRegression.sha256)) errors.push("stable regression must identify exact Rust 1.85.0 stable and a hash");
  if (!Array.isArray(value.phaseErrors) || !Array.isArray(value.limitations)) errors.push("phaseErrors and limitations must be arrays");
  if (value.status === "passed" && (!trust || trust.runId !== value.runId || trust.archiveSha256 !== value.archiveSha256 || trust.manifestSha256 !== value.manifestSha256 || trust.regressionSha256 !== original?.sha256 || trust.stableRegressionSha256 !== value.stableRegression?.sha256)) errors.push("passed report is not bound to trusted current provenance");
  if (value.status === "passed" && (errors.length || (value.phaseErrors?.length ?? 0) > 0 || campaign?.status !== "passed" || campaign.observedRuns < 1000 || !campaign.instrumentation || !campaign.normalCompletion || value.mutant?.status !== "failed" || value.mutantReplay?.status !== "failed" || value.reduction?.status !== "reduced" || value.reduction.attempts < 1 || value.reduction.replay?.status !== "failed" || value.reduction.replay.failureKind !== "SelectionMismatch" || value.restoredReplay?.status !== "passed" || value.restoredReplay.failureKind !== "none" || value.stableRegression?.status !== "passed")) errors.push("passed report lacks completed evidence phases");
  return [...new Set(errors)];
}

export function verifyFuzzResult(
  result: FuzzProcessResult,
  expectation: FuzzExpectation,
): boolean {
  if (result.error || result.signal) return false;
  const log = result.stdout + result.stderr;
  if (
    !/Loaded \d+ modules\s+\([1-9]\d* inline 8-bit counters\)/.test(log) ||
    !/Loaded \d+ PC tables \([1-9]\d* PCs\)/.test(log)
  )
    return false;
  if (expectation.kind === "counterexample")
    return (
      result.status === 77 &&
      expectation.artifactWritten &&
      log.includes(
        "assertion `left == right` failed: mini-grep selection oracle mismatch",
      ) &&
      log.includes("SUMMARY: libFuzzer: deadly signal") &&
      log.includes("Test unit written to ")
    );
  if (result.status !== 0) return false;
  if (expectation.kind === "replay") return /Executed .+ in \d+ ms/.test(log);
  const runs = Number(log.match(/^#(\d+)\s+DONE\s+cov: [1-9]\d*/m)?.[1] ?? 0);
  return (
    runs >= expectation.minimumRuns && log.includes(`Done ${runs} runs in `)
  );
}

export function verifyNamedRegressionFailure(
  result: FuzzProcessResult,
  testName: string,
): boolean {
  if (result.error || result.signal || result.status === 0) return false;
  const log = result.stdout + result.stderr;
  const escaped = testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^test ${escaped} \\.\\.\\. FAILED$`, "m").test(log) &&
    /test result: FAILED/.test(log) &&
    !/could not compile|error\[E\d+\]/.test(log);
}
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
