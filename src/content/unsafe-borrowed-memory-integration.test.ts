import { expect, it } from "vitest";
import { moduleGate, recordEvidence } from "../engine/learning";
import { createInitialState } from "../persistence/state";
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
  expect(unsafeBorrowedMemoryModule.gateCriteria).toHaveLength(4);

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
      (criterion) => criterion.taskRefs.length === 3,
    ),
  ).toBe(true);
  for (const criterion of unsafeBorrowedMemoryModule.gateCriteria!) {
    expect(criterion.taskRefs.map((ref) => ref.stepId)).toEqual([
      `${criterion.taskRefs[0].lessonId}-boundary-gate`,
      `${criterion.taskRefs[0].lessonId}-soundness-gate`,
      `${criterion.taskRefs[0].lessonId}-blank`,
    ]);
  }
  expect(
    modules.findIndex((module) => module.id === unsafeBorrowedMemoryModule.id),
  ).toBe(
    modules.findIndex((module) => module.id === "unsafe-miri-contracts") + 1,
  );
});

it("allows a fresh blank alternative after a failed or revealed primary", () => {
  let state = createInitialState();
  for (const lesson of unsafeBorrowedMemoryLessons) {
    const boundary = lesson.steps.find((step) => step.id.endsWith("-boundary-gate"))!;
    state = recordEvidence(state, {
      id: `${lesson.id}-revealed-boundary`,
      conceptIds: lesson.conceptIds,
      lessonId: lesson.id,
      stepId: boundary.id,
      kind: boundary.evidenceKind,
      passed: true,
      hints: 1,
      revealed: true,
      gate: true,
      evaluator: boundary.evaluator?.kind,
      at: state.updatedAt + 1,
    });
    const blank = lesson.steps.find((step) => step.id.endsWith("-blank"))!;
    state = recordEvidence(state, {
      id: `${lesson.id}-blank-success`,
      conceptIds: lesson.conceptIds,
      lessonId: lesson.id,
      stepId: blank.id,
      kind: blank.evidenceKind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      evaluator: blank.evaluator?.kind,
      at: state.updatedAt + 1,
    });
  }
  expect(moduleGate(state, unsafeBorrowedMemoryLessons, unsafeBorrowedMemoryModule).passed).toBe(true);
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

it("teaches the concrete answer for each borrowed-memory prediction", () => {
  const predictions = Object.fromEntries(
    unsafeBorrowedMemoryLessons
      .flatMap((lesson) => lesson.steps)
      .filter((step) => step.kind === "predict")
      .map((step) => [step.id, step]),
  );

  const expected = {
    "unsafe-borrowed-provenance-predict": {
      prompt:
        "Czy `from_slice` może samodzielnie wydłużyć lifetime właściciela?",
      choices: ["Tak", "Nie", "Tylko po skopiowaniu danych"],
      correct: "1",
    },
    "unsafe-borrowed-reborrow-predict": {
      prompt: "Czy `mid == len` jest poprawne?",
      choices: ["Tak", "Nie", "Tylko gdy `mid < len`"],
      correct: "0",
    },
    "unsafe-borrowed-slot-predict": {
      prompt: "Czy sam adres MaybeUninit oznacza wartość gotową do Drop?",
      choices: ["Tak", "Nie", "Tak, jeśli adres jest wyrównany"],
      correct: "1",
    },
    "unsafe-borrowed-auto-traits-predict": {
      prompt: "Czy output-only PhantomData może bezpiecznie dodać Sync?",
      choices: ["Tak", "Nie", "Tak, jeśli `T: Send`"],
      correct: "1",
    },
  } as const;

  expect(Object.keys(predictions).sort()).toEqual(Object.keys(expected).sort());

  for (const [stepId, assertion] of Object.entries(expected)) {
    const step = predictions[stepId];
    expect(step).toBeDefined();
    expect(step?.prompt).toBe(assertion.prompt);
    expect(step?.choices?.map((choice) => choice.label)).toEqual(
      assertion.choices,
    );

    const evaluator = step?.evaluator;
    expect(evaluator?.kind).toBe("choice");
    if (evaluator?.kind !== "choice") continue;

    expect(evaluator.correct).toBe(assertion.correct);
    expect(Object.keys(evaluator.explanations).sort()).toEqual(["0", "1", "2"]);
    expect(
      Object.values(evaluator.explanations).every(
        (explanation) => explanation.trim().length > 0,
      ),
    ).toBe(true);
  }

  const reborrowEvaluator =
    predictions["unsafe-borrowed-reborrow-predict"]?.evaluator;
  expect(reborrowEvaluator?.kind).toBe("choice");
  if (reborrowEvaluator?.kind === "choice") {
    expect(reborrowEvaluator.explanations[reborrowEvaluator.correct]).toContain(
      "pełny lewy prefix",
    );
    expect(reborrowEvaluator.explanations[reborrowEvaluator.correct]).toContain(
      "pusty prawy suffix",
    );
  }
});
