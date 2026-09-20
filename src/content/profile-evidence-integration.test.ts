import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { lessons, modules, reviewExercises } from "./course";
import {
  profileEvidenceLessons,
  profileEvidenceModule,
  profileEvidenceReviewExercises,
  profileEvidenceSources,
} from "./profile-evidence";

const lessonIds = [
  "profile-instruction-cost",
  "profile-allocation-events",
  "profile-optimization-transfer",
  "profile-regression-decision",
];
const moduleLessonIds = [
  ...lessonIds,
  "runtime-allocation-scope",
  "runtime-allocation-comparison",
];

it("registers profile lessons with independent gates, blanks, and retrievals", () => {
  expect(profileEvidenceLessons).toHaveLength(4);
  expect(profileEvidenceModule.lessonIds).toEqual(moduleLessonIds);
  expect(modules.find((module) => module.id === "profile-evidence")).toEqual(
    profileEvidenceModule,
  );

  const moduleLessons = lessons.filter((lesson) =>
    lessonIds.includes(lesson.id),
  );
  expect(moduleLessons).toHaveLength(4);
  expect(profileEvidenceModule.gateCriteria).toHaveLength(12);
  expect(
    moduleLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evidenceGate),
    ),
  ).toHaveLength(8);
  expect(
    profileEvidenceModule.gateCriteria!.every(
      (criterion) => criterion.taskRefs.length === 2,
    ),
  ).toBe(true);

  for (const lesson of moduleLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(lesson.steps.filter((step) => step.evidenceGate)).toHaveLength(2);
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
  }

  const refs = profileEvidenceModule.gateCriteria!.flatMap((criterion) =>
    criterion.taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`),
  );
  expect(refs).toHaveLength(24);
  expect(new Set(refs).size).toBe(22);
  expect(
    profileEvidenceModule.gateCriteria!.map((criterion) =>
      criterion.taskRefs.map((ref) => ref.stepId),
    ),
  ).toEqual([
    ["instruction-gate", "instruction-blank"],
    ["instruction-budget-gate", "instruction-recall"],
    ["allocation-gate", "allocation-recall"],
    ["allocation-count-gate", "allocation-blank"],
    ["transfer-gate", "transfer-recall"],
    ["transfer-budget-gate", "transfer-blank"],
    ["decision-gate", "decision-recall"],
    ["decision-evidence-gate", "decision-blank"],
    ["allocation-scope-gate", "allocation-scope-blank"],
    ["allocation-scope-error-gate", "allocation-scope-blank"],
    ["allocation-comparison-gate", "allocation-comparison-blank"],
    ["allocation-comparison-complete-gate", "allocation-comparison-blank"],
  ]);
  expect(
    profileEvidenceModule.gateCriteria!.every((criterion) => {
      const primary = lessons
        .find((lesson) => lesson.id === criterion.taskRefs[0].lessonId)
        ?.steps.find((step) => step.id === criterion.taskRefs[0].stepId);
      const independent = lessons
        .find((lesson) => lesson.id === criterion.taskRefs[1].lessonId)
        ?.steps.find((step) => step.id === criterion.taskRefs[1].stepId);
      return (
        primary?.evidenceGate === true &&
        independent?.evaluator?.kind === "tests"
      );
    }),
  ).toBe(true);
});

it("keeps workload identity separate from measured cost", () => {
  const transfer = profileEvidenceLessons.find(
    (lesson) => lesson.id === "profile-optimization-transfer",
  )!;
  const blank = transfer.steps.find((step) => step.id === "transfer-blank")!;
  const workloadGate = transfer.steps.find(
    (step) => step.id === "transfer-budget-gate",
  )!;
  expect(blank.prompt).toMatch(/Workload.*input.*output/s);
  expect(blank.prompt).toMatch(/Cost.*instructions.*allocations/s);
  expect(blank.prompt).toMatch(/Measurement.*workload.*cost/s);
  expect(blank.prompt).toMatch(/innym kosztem.*innym workload|równym kosztem.*odrzucon/i);
  expect(workloadGate.prompt).toMatch(
    /same_workload\(baseline: Measurement, candidate: Measurement\)/,
  );
  expect(workloadGate.evaluator?.kind).toBe("tests");
  if (workloadGate.evaluator?.kind === "tests") {
    expect(workloadGate.evaluator.tests).toMatch(/different_workload_same_cost/);
    expect(workloadGate.evaluator.tests).toMatch(/same_input_different_cost/);
    expect(workloadGate.evaluator.tests).toMatch(/same_input_different_output/);
    expect(workloadGate.evaluator.tests).toMatch(/different_input_same_output/);
  }
  const review = profileEvidenceReviewExercises["optimization-transfer"]!;
  expect(review.prompt).toMatch(/same_workload/);
  expect(review.prompt).toMatch(/innym.*Cost|różnych koszt/i);
  expect(review.code).toContain("fn same_workload");
  expect(review.code).not.toBe(review.solution);
});

it("keeps the instruction review on its own budget contract", () => {
  const review = profileEvidenceReviewExercises["instruction-cost-record"]!;
  expect(review.prompt).toMatch(/within_instruction_budget/);
  expect(review.code).toContain("fn within_instruction_budget");
  expect(review.code).not.toContain("fn record_instruction_cost");
  expect(review.code).not.toBe(review.solution);
});

it("uses primary profile sources with reviewed metadata", () => {
  expect(profileEvidenceSources.map((source) => source.url)).toEqual(
    expect.arrayContaining([
      "https://nnethercote.github.io/perf-book/",
      "https://valgrind.org/docs/manual/cl-manual.html",
      "https://valgrind.org/docs/manual/dh-manual.html",
    ]),
  );
  for (const source of profileEvidenceSources) {
    expect(source.title, source.id).toBeTruthy();
    expect(source.reviewedAt, source.id).toBe("2026-09-18");
    expect(source.recheckPolicy, source.id).toBeTruthy();
  }
});

it("executes every profile fixture with deterministic authored tests", () => {
  const codingSteps = profileEvidenceLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  );
  codingSteps.push(...Object.values(profileEvidenceReviewExercises));
  expect(codingSteps).toHaveLength(20);
  for (const step of codingSteps) {
    expect(step.solution, step.id).toBeTruthy();
    if (step.evaluator?.kind !== "tests") continue;
    expect(step.evaluator.tests).toMatch(/#\[test\]/);
    expect(step.evaluator.tests).toMatch(/assert/);
    expect(step.evaluator.tests).not.toMatch(
      /Instant|SystemTime|elapsed|sleep|rand|thread_rng/i,
    );

    const directory = mkdtempSync(join(tmpdir(), "profile-evidence-"));
    try {
      const file = join(directory, `${step.id}.rs`);
      const binary = join(directory, step.id);
      writeFileSync(
        file,
        appendHiddenTests(step.solution!, step.evaluator.tests),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error, `${step.id}: compiler`).toBeUndefined();
      expect(compiled.signal, `${step.id}: compiler signal`).toBeNull();
      expect(compiled.status, `${step.id}: ${compiled.stderr}`).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(executed.error, `${step.id}: runner`).toBeUndefined();
      expect(executed.signal, `${step.id}: runner signal`).toBeNull();
      expect(executed.status, `${step.id}: ${executed.stderr}`).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 120_000);
