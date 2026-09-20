import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { FuzzEvidenceReport } from "./fuzz-result";
import { validateFuzzEvidenceReport } from "./fuzz-result";

export type ReductionObservation =
  | { status: "finding"; failureKind: "SelectionMismatch" }
  | { status: "timeout" | "compile-error" | "other"; failureKind?: string };
export type ReductionPredicate = (candidate: Uint8Array) => ReductionObservation;
export type ReductionResult = {
  original: Uint8Array;
  reduced: Uint8Array;
  attempts: number;
  status: "reduced" | "unchanged" | "rejected";
  observations: Array<{ bytes: Uint8Array; observation: ReductionObservation }>;
};

/**
 * Authored deterministic deletion reducer. It only accepts a strictly shorter
 * candidate that reproduces the named SelectionMismatch; all tool failures are
 * recorded as rejected candidates. The original bytes are never mutated.
 */
export function reduceWitness(
  original: Uint8Array,
  predicate: ReductionPredicate,
  options: { maxAttempts?: number; deadlineMs?: number; minInputBytes?: number; maxInputBytes?: number } = {},
): ReductionResult {
  const maxAttempts = Math.min(options.maxAttempts ?? 256, 256);
  const deadline = Date.now() + Math.min(options.deadlineMs ?? 30_000, 30_000);
  const minInputBytes = options.minInputBytes ?? 3;
  const maxInputBytes = options.maxInputBytes ?? 4096;
  let current = new Uint8Array(original);
  let attempts = 0;
  let changed = false;
  const observations: ReductionResult["observations"] = [];
  // Fixed chunk order, then byte-level deletions. This is deterministic and
  // intentionally makes no claim of global minimality.
  let chunk = Math.max(1, Math.floor(current.length / 2));
  while (chunk >= 1 && attempts < maxAttempts && Date.now() <= deadline) {
    let accepted = false;
    for (let start = 0; start + chunk <= current.length && attempts < maxAttempts && Date.now() <= deadline; start += chunk) {
      const candidate = new Uint8Array(current.length - chunk);
      candidate.set(current.slice(0, start));
      candidate.set(current.slice(start + chunk), start);
      attempts += 1;
      const observation = candidate.length < minInputBytes || candidate.length > maxInputBytes
        ? { status: "other" as const, failureKind: "OutsideInputDomain" }
        : predicate(candidate);
      observations.push({ bytes: candidate, observation });
      if (observation.status === "finding" && observation.failureKind === "SelectionMismatch") {
        current = candidate;
        changed = true;
        accepted = true;
        break;
      }
    }
    if (attempts >= maxAttempts || Date.now() > deadline) break;
    if (accepted) {
      chunk = Math.max(1, Math.floor(current.length / 2));
    } else {
      chunk = Math.floor(chunk / 2);
    }
  }
  return { original: new Uint8Array(original), reduced: current, attempts, status: changed ? "reduced" : "unchanged", observations };
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256File(path: string): string {
  return sha256Bytes(readFileSync(path));
}

export function validateEvidenceReport(report: unknown): void {
  const errors = validateFuzzEvidenceReport(report);
  if (errors.length) throw new Error(`Invalid fuzz evidence report: ${errors.join("; ")}`);
}

export function createPartialReport(input: Partial<FuzzEvidenceReport> = {}): FuzzEvidenceReport {
  const report: FuzzEvidenceReport = {
    schemaVersion: 1,
    runId: input.runId ?? randomUUID(),
    archiveSha256: input.archiveSha256 ?? "0".repeat(64),
    manifestSha256: input.manifestSha256 ?? "0".repeat(64),
    target: input.target ?? "selection",
    toolchain: input.toolchain ?? "nightly-2026-08-08",
    host: input.host ?? "unknown",
    bounds: input.bounds ?? { minInputBytes: 3, maxInputBytes: 4096, maxRuns: 20000, maxSeconds: 30, timeoutSeconds: 3, rssLimitMb: 1024 },
    status: input.status ?? "infrastructure",
    referenceCampaign: input.referenceCampaign ?? { status: "infrastructure", observedRuns: 0, instrumentation: false, normalCompletion: false, replayOnly: false },
    observedExecutions: input.observedExecutions ?? 0,
    mutant: input.mutant ?? { identity: "substring-to-prefix", status: "infrastructure", assertion: "mini-grep selection oracle mismatch" },
    artifacts: input.artifacts ?? { original: { path: "", sha256: "0".repeat(64), bytes: 0 } },
    reduction: input.reduction ?? { attempts: 0, status: "unchanged", failureKind: "SelectionMismatch" },
    mutantReplay: input.mutantReplay ?? { status: "infrastructure", failureKind: "SelectionMismatch" },
    restoredReplay: input.restoredReplay ?? { status: "infrastructure", failureKind: "none" },
    stableRegression: input.stableRegression ?? { status: "infrastructure", toolchain: "1.85.0", channel: "stable", sha256: "0".repeat(64) },
    phaseErrors: input.phaseErrors ?? [],
    limitations: input.limitations ?? ["Finite authored campaign is not proof of absence of bugs."],
  };
  return report;
}

export async function runEvidencePipeline(): Promise<never> {
  throw new Error("runEvidencePipeline is an orchestration entry point; invoke the CLI verifier explicitly");
}

if (process.argv[1]?.endsWith("fuzz-evidence.ts")) {
  console.error("Use npm run content:fuzz; fuzz-evidence.ts exports validation and reduction helpers only.");
  process.exitCode = 2;
}
