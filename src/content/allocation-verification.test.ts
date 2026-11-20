import { describe, expect, it } from "vitest";
import { createInitialState } from "@/persistence/state";
import { recordEvidence } from "@/engine/learning";
import { concepts } from "./course";
import {
  allocationModes,
  allocationWorkloads,
  validateAllocationReport,
  type AllocationReport,
} from "./allocation-verification";
import { runtimeAllocationEvidenceReviewExercises } from "./runtime-allocation-evidence";

const validReport = (overrides: Partial<AllocationReport> = {}): AllocationReport => ({
  schema: "rust-workshop.allocation-result.v1",
  mode: "baseline",
  workload: "valid-512",
  toolchain: "stable",
  target: "aarch64-apple-darwin",
  build_profile: "debug",
  result: "ok",
  error_kind: null,
  summary: { info: 512, warn: 0, error: 0, malformed: 0 },
  alloc_calls: 2,
  alloc_zeroed_calls: 0,
  dealloc_calls: 2,
  realloc_calls: 0,
  requested_bytes: 64,
  freed_bytes: 64,
  complete: true,
  limits: {
    single_process: true,
    single_threaded: true,
    rss_claim: false,
    universal_threshold: false,
  },
  ...overrides,
});

describe("allocation report verification", () => {
  it("accepts only the complete result schema for the selected process", () => {
    expect(
      validateAllocationReport(validReport(), {
        mode: "baseline",
        workload: "valid-512",
        toolchain: "stable",
        target: "aarch64-apple-darwin",
      }),
    ).toBe(true);
  });

  it.each([
    ["missing field", (() => { const report = validReport(); delete (report as Partial<AllocationReport>).summary; return report; })()],
    ["false complete", validReport({ complete: false as never })],
    ["negative counter", validReport({ alloc_calls: -1 })],
    ["unknown field", { ...validReport(), unexpected: true }],
    ["false result", validReport({ result: "pending" as never })],
    ["error without error kind", validReport({ result: "err", error_kind: null })],
    ["inconclusive limits", validReport({ limits: { single_process: true, single_threaded: true, rss_claim: false, universal_threshold: true } as never })],
    ["wrong mode", validReport({ mode: "mutant" })],
  ])("rejects %s", (_label, report) => {
    expect(
      validateAllocationReport(report, {
        mode: "baseline",
        workload: "valid-512",
        toolchain: "stable",
        target: "aarch64-apple-darwin",
      }),
    ).toBe(false);
  });

  it("enumerates all modes and boundary/error workloads", () => {
    expect(allocationModes).toEqual(["baseline", "candidate", "mutant"]);
    expect(allocationWorkloads).toEqual(expect.arrayContaining(["line-4096", "line-4097", "reader-error"]));
  });

  it("requires independent Rust review evidence for runtime allocation mastery", () => {
    const concept = concepts.find((candidate) => candidate.id === "runtime-allocation-comparison")!;
    expect(concept.evidenceArtifact).toBe("rust-code");
    const review = runtimeAllocationEvidenceReviewExercises["runtime-allocation-comparison"];
    expect(review.evaluator?.kind).toBe("tests");
    expect(review.code).toBeTruthy();
    expect(review.code).not.toBe(review.solution);

    const policyConcept = { ...concept };
    let state = createInitialState();
    state = recordEvidence(state, {
      id: "allocation-gate-proof",
      conceptIds: [policyConcept.id], lessonId: "runtime-allocation-comparison",
      stepId: "allocation-comparison-gate", kind: "fix", passed: true,
      hints: 0, revealed: false, at: 1_000, gate: true, evaluator: "tests",
    }, { artifactForConcept: () => "rust-code" });
    state = recordEvidence(state, {
      id: "allocation-review-proof",
      conceptIds: [policyConcept.id], lessonId: "runtime-allocation-comparison",
      stepId: "allocation-comparison-review", kind: "transfer", passed: true,
      hints: 0, revealed: false, at: 2_000, gate: false, evaluator: "tests",
    }, { artifactForConcept: () => "rust-code" });
    expect(state.mastery[policyConcept.id]?.level).toBe("understood");
  });
});
