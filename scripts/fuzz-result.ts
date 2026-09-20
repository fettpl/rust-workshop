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
    original: { path: string; sha256: string; bytes: number };
    reduced?: { path: string; sha256: string; bytes: number };
  };
  reduction: {
    attempts: number;
    status: "reduced" | "unchanged" | "rejected";
    failureKind: string;
  };
  mutantReplay: { status: FuzzPhaseStatus; failureKind: string };
  restoredReplay: { status: FuzzPhaseStatus; failureKind: string };
  stableRegression: { status: FuzzPhaseStatus; toolchain: string; sha256: string };
  phaseErrors: string[];
  limitations: string[];
};

const sha256 = /^[a-f0-9]{64}$/;

/** Validate machine-readable provenance before it can be reported as evidence. */
export function validateFuzzEvidenceReport(
  report: unknown,
): string[] {
  const errors: string[] = [];
  if (!report || typeof report !== "object") return ["report must be an object"];
  const value = report as Partial<FuzzEvidenceReport>;
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["runId", "target", "toolchain", "host"] as const)
    if (typeof value[field] !== "string" || !value[field]?.trim()) errors.push(`missing ${field}`);
  for (const field of ["archiveSha256", "manifestSha256"] as const)
    if (typeof value[field] !== "string" || !sha256.test(value[field])) errors.push(`invalid ${field}`);
  if (!value.bounds || value.bounds.minInputBytes !== 3 || value.bounds.maxInputBytes !== 4096 || value.bounds.maxRuns !== 20000 || value.bounds.maxSeconds !== 30 || value.bounds.timeoutSeconds !== 3 || value.bounds.rssLimitMb !== 1024)
    errors.push("bounds do not match the reviewed campaign");
  if (!["passed", "failed", "infrastructure"].includes(value.status ?? "")) errors.push("invalid report status");
  const campaign = value.referenceCampaign;
  if (!campaign || typeof campaign.observedRuns !== "number" || campaign.observedRuns < 0 || typeof campaign.instrumentation !== "boolean" || typeof campaign.normalCompletion !== "boolean" || typeof campaign.replayOnly !== "boolean") errors.push("incomplete reference campaign");
  if (campaign && !["passed", "failed", "infrastructure"].includes(campaign.status)) errors.push("invalid reference campaign status");
  if (campaign?.replayOnly) errors.push("replay-only report cannot satisfy campaign evidence");
  if (typeof value.observedExecutions !== "number" || !Number.isInteger(value.observedExecutions) || value.observedExecutions < 0) errors.push("observedExecutions must be a non-negative integer");
  if (!value.mutant || typeof value.mutant.identity !== "string" || !value.mutant.identity || value.mutant.assertion !== "mini-grep selection oracle mismatch") errors.push("invalid mutant identity");
  const original = value.artifacts?.original;
  const partialArtifact = value.status === "infrastructure" && original?.bytes === 0 && original.path === "" && original.sha256 === "0".repeat(64);
  if (!partialArtifact && (!original || !original.path || !sha256.test(original.sha256) || !Number.isInteger(original.bytes) || original.bytes <= 0)) errors.push("invalid original artifact provenance");
  const reduced = value.artifacts?.reduced;
  if (reduced && (!reduced.path || !sha256.test(reduced.sha256) || !Number.isInteger(reduced.bytes) || reduced.bytes <= 0 || (original && original.bytes > 0 && reduced.bytes >= original.bytes))) errors.push("invalid reduced artifact provenance");
  if (!value.reduction || !Number.isInteger(value.reduction.attempts) || value.reduction.attempts < 0 || !["reduced", "unchanged", "rejected"].includes(value.reduction.status) || value.reduction.failureKind !== "SelectionMismatch") errors.push("invalid reduction evidence");
  for (const [name, phase] of [["mutantReplay", value.mutantReplay], ["restoredReplay", value.restoredReplay]] as const) {
    if (!phase || !["passed", "failed", "infrastructure"].includes(phase.status) || typeof phase.failureKind !== "string") errors.push(`invalid ${name} phase`);
  }
  if (!value.stableRegression || !["passed", "failed", "infrastructure"].includes(value.stableRegression.status)) errors.push("invalid stableRegression phase");
  if (!value.stableRegression || !value.stableRegression.toolchain.includes("1.85") || !sha256.test(value.stableRegression.sha256)) errors.push("stable regression must identify Rust 1.85 and a hash");
  if (!Array.isArray(value.phaseErrors) || !Array.isArray(value.limitations)) errors.push("phaseErrors and limitations must be arrays");
  if (value.status === "passed" && (errors.length || campaign?.status !== "passed" || campaign.observedRuns < 1000 || !campaign.instrumentation || !campaign.normalCompletion || value.mutantReplay?.status !== "failed" || value.restoredReplay?.status !== "passed" || value.stableRegression?.status !== "passed")) errors.push("passed report lacks completed evidence phases");
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
