import { expect, it } from "vitest";
import { modules, reviewExercises } from "./course";
import {
  unsafeBorrowedMemoryConcepts,
  unsafeBorrowedMemoryLessons,
  unsafeBorrowedMemoryModule,
  unsafeBorrowedMemoryReviewExercises,
} from "./unsafe-borrowed-memory";

const lessonIds = [
  "unsafe-borrowed-provenance",
  "unsafe-borrowed-reborrow",
  "unsafe-borrowed-slot",
  "unsafe-borrowed-auto-traits",
];

it("registers the four borrowed-memory lessons with independent evidence gates", () => {
  expect(unsafeBorrowedMemoryLessons.map((lesson) => lesson.id)).toEqual(
    lessonIds,
  );
  expect(unsafeBorrowedMemoryModule.lessonIds).toEqual(lessonIds);
  expect(unsafeBorrowedMemoryModule.prerequisites).toEqual([
    "unsafe-miri-contracts",
  ]);
  expect(unsafeBorrowedMemoryConcepts).toHaveLength(4);
  expect(unsafeBorrowedMemoryModule.gateCriteria).toHaveLength(12);

  const evidenceSteps = unsafeBorrowedMemoryLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evidenceGate),
  );
  expect(evidenceSteps).toHaveLength(12);
  expect(evidenceSteps.filter((step) => step.kind === "blank")).toHaveLength(4);

  for (const lesson of unsafeBorrowedMemoryLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    const review = unsafeBorrowedMemoryReviewExercises[lesson.conceptIds[0]];
    expect(review).toBeDefined();
    expect(reviewExercises[lesson.conceptIds[0]]).toBe(review);
    expect(review?.evaluator?.kind).toBe("tests");
    const codeSteps = lesson.steps.filter(
      (step) => step.evaluator?.kind === "tests",
    );
    expect(codeSteps.length).toBeGreaterThanOrEqual(4);
    expect(new Set(codeSteps.map((step) => step.id)).size).toBe(
      codeSteps.length,
    );
  }

  const refs = unsafeBorrowedMemoryModule.gateCriteria!.flatMap((criterion) =>
    criterion.taskRefs.flatMap((ref) => `${ref.lessonId}/${ref.stepId}`),
  );
  expect(refs).toHaveLength(12);
  expect(new Set(refs).size).toBe(12);
  expect(
    unsafeBorrowedMemoryModule.gateCriteria!.every(
      (criterion) => criterion.taskRefs.length === 1,
    ),
  ).toBe(true);
  expect(refs.filter((ref) => ref.endsWith("-boundary-gate"))).toHaveLength(4);
  expect(refs.filter((ref) => ref.endsWith("-soundness-gate"))).toHaveLength(4);
  expect(refs.filter((ref) => ref.endsWith("-blank"))).toHaveLength(4);
  expect(
    modules.findIndex((module) => module.id === unsafeBorrowedMemoryModule.id),
  ).toBe(
    modules.findIndex((module) => module.id === "unsafe-miri-contracts") + 1,
  );
});

it("publishes learner-safe signatures and maintainer-only boundaries", () => {
  const prompts = unsafeBorrowedMemoryLessons
    .flatMap((lesson) => lesson.steps)
    .map((step) => step.prompt)
    .join("\n");
  expect(prompts).toContain("BorrowedBytes");
  expect(prompts).toContain("from_slice");
  expect(prompts).toContain("reborrow<'short>");
  expect(prompts).toContain("SafeSlot<T>");
  expect(prompts).toContain("InvariantBorrow");
  expect(prompts).toContain("Send");
  expect(prompts).toContain("Sync");

  const blanks = unsafeBorrowedMemoryLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.kind === "blank"),
  );
  expect(blanks.every((step) => step.code === undefined)).toBe(true);
  expect(blanks.every((step) => step.solution)).toBe(true);
});
