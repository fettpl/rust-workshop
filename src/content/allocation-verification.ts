import assert from "node:assert/strict";

export const allocationWorkloads = [
  "empty",
  "valid-512",
  "repeated",
  "malformed",
  "crlf-boundary",
  "line-4096",
  "line-4097",
  "reader-error",
] as const;

export const allocationModes = ["baseline", "candidate", "mutant"] as const;

export type AllocationMode = (typeof allocationModes)[number];
export type AllocationWorkload = (typeof allocationWorkloads)[number];

export type AllocationReport = {
  schema: "rust-workshop.allocation-result.v1";
  mode: AllocationMode;
  workload: AllocationWorkload;
  toolchain: string;
  target: string;
  build_profile: "debug";
  result: "ok" | "err";
  error_kind: "io" | "analysis" | null;
  summary: {
    info: number;
    warn: number;
    error: number;
    malformed: number;
  };
  alloc_calls: number;
  alloc_zeroed_calls: number;
  dealloc_calls: number;
  realloc_calls: number;
  requested_bytes: number;
  freed_bytes: number;
  complete: true;
  limits: {
    single_process: true;
    single_threaded: true;
    rss_claim: false;
    universal_threshold: false;
  };
};

const reportKeys = [
  "schema",
  "mode",
  "workload",
  "toolchain",
  "target",
  "build_profile",
  "result",
  "error_kind",
  "summary",
  "alloc_calls",
  "alloc_zeroed_calls",
  "dealloc_calls",
  "realloc_calls",
  "requested_bytes",
  "freed_bytes",
  "complete",
  "limits",
] as const;

const summaryKeys = ["info", "warn", "error", "malformed"] as const;
const limitKeys = [
  "single_process",
  "single_threaded",
  "rss_claim",
  "universal_threshold",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function validateAllocationReport(
  value: unknown,
  expected: {
    mode: AllocationMode;
    workload: AllocationWorkload;
    toolchain: string;
    target: string;
  },
): value is AllocationReport {
  if (!isRecord(value) || !hasExactKeys(value, reportKeys)) return false;
  if (
    value.schema !== "rust-workshop.allocation-result.v1" ||
    value.mode !== expected.mode ||
    value.workload !== expected.workload ||
    value.toolchain !== expected.toolchain ||
    value.target !== expected.target ||
    value.build_profile !== "debug" ||
    value.result !== "ok" && value.result !== "err" ||
    value.error_kind !== null && value.error_kind !== "io" && value.error_kind !== "analysis" ||
    value.complete !== true
  ) return false;
  if (value.result === "ok" && value.error_kind !== null) return false;
  if (value.result === "err" && value.error_kind === null) return false;
  if (!isRecord(value.summary) || !hasExactKeys(value.summary, summaryKeys)) return false;
  const summary = value.summary;
  if (!summaryKeys.every((key) => isCounter(summary[key]))) return false;
  if (
    ![
      "alloc_calls",
      "alloc_zeroed_calls",
      "dealloc_calls",
      "realloc_calls",
      "requested_bytes",
      "freed_bytes",
    ].every((key) => isCounter(value[key]))
  ) return false;
  if (!isRecord(value.limits) || !hasExactKeys(value.limits, limitKeys)) return false;
  return (
    value.limits.single_process === true &&
    value.limits.single_threaded === true &&
    value.limits.rss_claim === false &&
    value.limits.universal_threshold === false
  );
}

export function assertAllocationReport(
  value: unknown,
  expected: Parameters<typeof validateAllocationReport>[1],
): asserts value is AllocationReport {
  assert(validateAllocationReport(value, expected), "invalid allocation report schema");
}
