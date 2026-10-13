import { expect, it } from "vitest";
import * as course from "./course";
import { evaluate } from "../engine/evaluate";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "../persistence/state";

const additions = ["fallible-value-composition", "fallible-iterator-contracts"];
it("appends the two fallible lessons to the iterator module with distinct callable retrievals", () => {
  const stage = course.modules.find((m) => m.id === "iterators")!;
  expect(stage.lessonIds.slice(-3)).toEqual([
    "iterator-contracts",
    ...additions,
  ]);
  expect(course.modules).toHaveLength(48);
  expect(course.lessons).toHaveLength(191);
  expect(course.concepts).toHaveLength(193);
  for (const id of additions) {
    const lesson = course.lessons.find((l) => l.id === id)!;
    expect(lesson).toBeDefined();
    expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
    expect(lesson.steps.length).toBeLessThanOrEqual(9);
    const review =
      course.reviewExercises[id as keyof typeof course.reviewExercises];
    expect(review?.evaluator?.kind).toBe("tests");
    expect(lesson.steps.some((s) => s.id === review.id)).toBe(false);
    for (const s of lesson.steps.filter((s) => s.evaluator?.kind === "tests")) {
      expect(
        evaluate(s.evaluator!, { answer: "correct", code: s.solution }).passed,
      ).toBe(false);
    }
  }
});
it("keeps old iterator resume and success raw without crediting appended work", () => {
  const state = createInitialState();
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: "iterator-contracts",
    stepIndex: 3,
  };
  state.events = [
    {
      id: "old",
      lessonId: "iterator-contracts",
      stepId: "contracts-modify",
      conceptIds: ["iterator-contracts"],
      kind: "transfer",
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      at: 123,
    },
  ];
  const restored = importState(exportState(state));
  expect(restored.resume).toEqual(state.resume);
  expect(restored.events).toEqual(state.events);
  expect(restored.events.some((e) => additions.includes(e.lessonId))).toBe(
    false,
  );
  expect(restored.steps).toEqual({});
});

it("registers only named additions after the historical prefixes and preserves the old iterator gates", async () => {
  const { historicalBeforeFallibleComposition } =
    await import("./fallible-composition-compatibility-fixture");
  const previous = historicalBeforeFallibleComposition(course);
  expect(course.lessons.slice(0, previous.lessons.length)).toEqual(
    previous.lessons,
  );
  expect(
    course.lessons.slice(previous.lessons.length).map((l) => l.id),
  ).toEqual(additions);
  expect(course.concepts.slice(0, previous.concepts.length)).toEqual(
    previous.concepts,
  );
  expect(
    course.concepts.slice(previous.concepts.length).map((c) => c.id),
  ).toEqual(additions);
  expect(course.sources.slice(0, previous.sources.length)).toEqual(
    previous.sources,
  );
  expect(
    course.sources.slice(previous.sources.length).map((s) => s.id),
  ).toEqual(["fallible-std-option", "fallible-std-result"]);
  expect(
    Object.keys(course.reviewExercises).slice(
      Object.keys(previous.reviewExercises).length,
    ),
  ).toEqual(additions);
  const stage = course.modules.find((m) => m.id === "iterators")!;
  const old = previous.modules.find((m) => m.id === "iterators")!;
  expect(stage.lessonIds.slice(0, old.lessonIds.length)).toEqual(old.lessonIds);
  expect(stage.gateCriteria?.slice(0, old.gateCriteria!.length)).toEqual(
    old.gateCriteria,
  );
  expect(
    stage.gateCriteria?.slice(old.gateCriteria!.length).map((g) => g.id),
  ).toEqual(["iterators-fallible-values-gate", "iterators-fallible-rows-gate"]);
  expect(stage.assessmentId).toBe(old.assessmentId);
  const first = course.lessons.find((l) => l.id === additions[0])!;
  expect(first.prerequisites).toEqual([
    "iterator-contracts",
    "result-and-recovery",
    "checked-conversions",
    "closure-contracts",
  ]);
  expect(
    course.lessons.find((l) => l.id === additions[1])!.prerequisites,
  ).toEqual([additions[0]]);
  expect(course.lessons.flatMap((l) => l.steps)).toHaveLength(1260);
});

it("self-rates rationale explicitly and keeps blank/reference attempts in the same task family", () => {
  for (const id of additions) {
    const lesson = course.lessons.find((l) => l.id === id)!;
    const rationale = lesson.steps.at(-1)!;
    if (rationale.evaluator?.kind !== "rubric")
      throw new Error("Missing self-review rubric");
    expect(rationale.evidenceKind).toBe("self-rating");
    expect(rationale.evidenceGate).toBe(false);
    expect(
      evaluate(rationale.evaluator, { answer: "Moje uzasadnienie" }).passed,
    ).toBe(false);
    expect(
      evaluate(rationale.evaluator, {
        answer: "Moje uzasadnienie",
        rubricChecks: rationale.evaluator.criteria,
      }).passed,
    ).toBe(true);
  }
  const second = course.lessons.find((l) => l.id === additions[1])!;
  const reference = second.steps.find(
    (s) => s.id === "fallible-readings-transfer",
  )!;
  const blank = second.steps.find((s) => s.id === "fallible-readings-blank")!;
  expect(blank.code).toBeUndefined();
  expect(blank.evidence?.codingTaskId).toBe(reference.evidence?.codingTaskId);
});

it("counts real selector families rather than transfer/blank aliases and carries family assistance", async () => {
  const { independentCodingTaskIds } = await import("../engine/learning");
  const {
    courseEvidencePolicy,
    evidenceForLessonStep,
    recordCourseEvidence,
    assistanceForLessonStep,
  } = await import("./learning-context");
  const lesson = course.lessons.find(
    (l) => l.id === "fallible-iterator-contracts",
  )!;
  const submit = (
    state: ReturnType<typeof createInitialState>,
    stepId: string,
    hints = 0,
  ) => {
    const step = lesson.steps.find((s) => s.id === stepId)!;
    return recordCourseEvidence(state, {
      id: `${stepId}/${state.events.length}`,
      lessonId: lesson.id,
      stepId,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints,
      revealed: false,
      at: state.events.length + 1,
    });
  };
  let clean = submit(createInitialState(), "fallible-readings-transfer");
  clean = submit(clean, "fallible-readings-blank");
  expect(
    independentCodingTaskIds(clean, lesson.id, courseEvidencePolicy),
  ).toEqual(["fallible/optional-rows"]);
  clean = submit(clean, "fallible-rows-contract");
  expect(
    independentCodingTaskIds(clean, lesson.id, courseEvidencePolicy),
  ).toEqual(["fallible/optional-rows", "fallible/required-rows"]);
  const helped = submit(
    submit(createInitialState(), "fallible-readings-transfer", 1),
    "fallible-readings-blank",
  );
  expect(
    independentCodingTaskIds(helped, lesson.id, courseEvidencePolicy),
  ).toEqual([]);
  const draft = createInitialState();
  draft.steps[`${lesson.id}:fallible-readings-transfer`] = {
    ...createStepProgress("// draft"),
    hints: 1,
  };
  expect(
    assistanceForLessonStep(
      draft,
      lesson,
      lesson.steps.find((s) => s.id === "fallible-readings-blank")!,
    ),
  ).toEqual({ hints: 1, revealed: false });
});

it("keeps changed-domain review retrieval out of primary calibrated families", async () => {
  const { independentCodingTaskIds } = await import("../engine/learning");
  const { courseEvidencePolicy, evidenceForReview, recordCourseEvidence } =
    await import("./learning-context");
  for (const conceptId of additions) {
    const review =
      course.reviewExercises[conceptId as keyof typeof course.reviewExercises];
    expect(review.evidenceKind).toBe("recall");
    const state = recordCourseEvidence(createInitialState(), {
      id: conceptId,
      lessonId: "review",
      stepId: `${review.id}:session`,
      ...evidenceForReview(conceptId, review),
      kind: review.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    });
    expect(
      independentCodingTaskIds(state, conceptId, courseEvidencePolicy),
    ).toEqual([]);
  }
});

it("offers executable empty editors for both changed-domain recall reviews without primary credit", () => {
  for (const conceptId of additions) {
    const review =
      course.reviewExercises[conceptId as keyof typeof course.reviewExercises];
    // The review UI requires defined code plus an executable evaluator to offer a Rust editor.
    expect(review.code, `${conceptId} must offer an executable editor`).toBe(
      "",
    );
    expect(review.kind).toBe("recall");
    expect(review.evidenceKind).toBe("recall");
    expect(review.evidenceGate).toBe(false);
    expect(review.evaluator?.kind).toBe("tests");
    expect(
      evaluate(review.evaluator!, { answer: "correct", code: review.solution })
        .passed,
    ).toBe(false);
    expect(
      evaluate(review.evaluator!, {
        code: review.solution,
        result: {
          status: "success",
          stdout: "",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 1, failed: 0 },
        },
      }).passed,
    ).toBe(true);
  }
});
