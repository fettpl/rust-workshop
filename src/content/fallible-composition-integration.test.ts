import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./capstone-maintenance-compatibility-fixture";
const course = historicalBeforeDocumentationRepair(
  historicalBeforeSendHandoff(
    historicalBeforeCancellationTransfer(
      historicalBeforeInitializedPrefix(
        historicalBeforeExistingContractRepair(currentCourse),
      ),
    ),
  ),
);
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

for (const criterionId of [
  "iterators-fallible-values-gate",
  "iterators-fallible-rows-gate",
]) {
  it(`${criterionId} exhausts all assisted families without offering a stale task`, async () => {
    const { gateRecovery, moduleGate } = await import("../engine/learning");
    const { evidenceForLessonStep, recordCourseEvidence } =
      await import("./learning-context");
    const stage = course.modules.find((m) => m.id === "iterators")!;
    const criterion = stage.gateCriteria!.find((g) => g.id === criterionId)!;
    const boundedStage = { ...stage, gateCriteria: [criterion] };
    const saved = createInitialState();
    for (const ref of criterion.taskRefs) {
      saved.steps[`${ref.lessonId}:${ref.stepId}`] = {
        ...createStepProgress(),
        hints: 1,
        revealed: true,
      };
    }
    expect(gateRecovery(saved, criterion, course.lessons)).toEqual({
      status: "exhausted",
    });
    expect(moduleGate(saved, course.lessons, boundedStage).passed).toBe(false);
    let history = createInitialState();
    for (const ref of criterion.taskRefs) {
      const lesson = course.lessons.find((l) => l.id === ref.lessonId)!;
      const step = lesson.steps.find((s) => s.id === ref.stepId)!;
      history = recordCourseEvidence(history, {
        id: `${criterionId}/${ref.stepId}`,
        ...ref,
        ...evidenceForLessonStep(lesson, step),
        kind: step.evidenceKind,
        evaluator: "tests",
        passed: true,
        hints: 1,
        revealed: true,
        at: history.events.length + 1,
      });
    }
    expect(gateRecovery(history, criterion, course.lessons)).toEqual({
      status: "exhausted",
    });
    expect(moduleGate(history, course.lessons, boundedStage).passed).toBe(
      false,
    );
  });

  it(`${criterionId} offers a genuinely fresh alternate and completes after one clean success`, async () => {
    const { gateRecovery, moduleGate } = await import("../engine/learning");
    const { evidenceForLessonStep, recordCourseEvidence } =
      await import("./learning-context");
    const stage = course.modules.find((m) => m.id === "iterators")!;
    const criterion = stage.gateCriteria!.find((g) => g.id === criterionId)!;
    const boundedStage = { ...stage, gateCriteria: [criterion] };
    let state = createInitialState();
    const [helped, fresh] = criterion.taskRefs;
    state.steps[`${helped.lessonId}:${helped.stepId}`] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(gateRecovery(state, criterion, course.lessons)).toEqual({
      status: "available",
      task: fresh,
    });
    expect(moduleGate(state, course.lessons, boundedStage).passed).toBe(false);
    const lesson = course.lessons.find((l) => l.id === fresh.lessonId)!;
    const step = lesson.steps.find((s) => s.id === fresh.stepId)!;
    state = recordCourseEvidence(state, {
      id: `${criterionId}/clean`,
      ...fresh,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    });
    expect(gateRecovery(state, criterion, course.lessons)).toEqual({
      status: "complete",
    });
    expect(moduleGate(state, course.lessons, boundedStage).passed).toBe(true);
  });
}

it("fallible rows recovery excludes the blank alias after guided family assistance in saves or events", async () => {
  const { gateRecovery, moduleGate } = await import("../engine/learning");
  const {
    assistanceForLessonStep,
    evidenceForLessonStep,
    recordCourseEvidence,
  } = await import("./learning-context");
  const stage = course.modules.find((m) => m.id === "iterators")!;
  const criterion = stage.gateCriteria!.find(
    (g) => g.id === "iterators-fallible-rows-gate",
  )!;
  const boundedStage = { ...stage, gateCriteria: [criterion] };
  const lesson = course.lessons.find(
    (l) => l.id === "fallible-iterator-contracts",
  )!;
  const guided = lesson.steps.find(
    (s) => s.id === "fallible-readings-transfer",
  )!;
  const blank = lesson.steps.find((s) => s.id === "fallible-readings-blank")!;
  for (const mode of ["saved", "event"] as const) {
    let state = createInitialState();
    if (mode === "saved") {
      state.steps[`${lesson.id}:${guided.id}`] = {
        ...createStepProgress(),
        hints: 1,
      };
    } else {
      state = recordCourseEvidence(state, {
        id: "guided-help",
        lessonId: lesson.id,
        stepId: guided.id,
        ...evidenceForLessonStep(lesson, guided),
        kind: guided.evidenceKind,
        evaluator: "tests",
        passed: true,
        hints: 1,
        revealed: false,
        at: 1,
      });
    }
    // The distinct required-row family remains fresh; the guided/blank family does not.
    expect(gateRecovery(state, criterion, course.lessons), mode).toEqual({
      status: "available",
      task: criterion.taskRefs[0],
    });
    state.steps[`${lesson.id}:fallible-rows-contract`] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(gateRecovery(state, criterion, course.lessons), mode).toEqual({
      status: "exhausted",
    });
    expect(moduleGate(state, course.lessons, boundedStage).passed, mode).toBe(
      false,
    );
    state = recordCourseEvidence(state, {
      id: "blank-after-guided-help",
      lessonId: lesson.id,
      stepId: blank.id,
      ...evidenceForLessonStep(lesson, blank),
      kind: blank.evidenceKind,
      evaluator: "tests",
      passed: true,
      ...assistanceForLessonStep(state, lesson, blank),
      at: 2,
    });
    expect(moduleGate(state, course.lessons, boundedStage).passed, mode).toBe(
      false,
    );
    expect(gateRecovery(state, criterion, course.lessons), mode).toEqual({
      status: "exhausted",
    });
  }
});

for (const requiredRowsAssisted of [false, true]) {
  it(`credits guided readings and stops duplicate recovery with required rows assisted=${requiredRowsAssisted}`, async () => {
    const { gateRecovery, moduleGate } = await import("../engine/learning");
    const { evidenceForLessonStep, recordCourseEvidence } =
      await import("./learning-context");
    const stage = course.modules.find((m) => m.id === "iterators")!;
    const criterion = stage.gateCriteria!.find(
      (g) => g.id === "iterators-fallible-rows-gate",
    )!;
    const lesson = course.lessons.find(
      (l) => l.id === "fallible-iterator-contracts",
    )!;
    const guided = lesson.steps.find(
      (s) => s.id === "fallible-readings-transfer",
    )!;
    let state = createInitialState();
    if (requiredRowsAssisted)
      state.steps[`${lesson.id}:fallible-rows-contract`] = {
        ...createStepProgress(),
        revealed: true,
      };
    state = recordCourseEvidence(state, {
      id: "clean-guided",
      lessonId: lesson.id,
      stepId: guided.id,
      ...evidenceForLessonStep(lesson, guided),
      kind: guided.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    });
    expect({
      passed: moduleGate(state, course.lessons, {
        ...stage,
        gateCriteria: [criterion],
      }).passed,
      recovery: gateRecovery(state, criterion, course.lessons),
    }).toEqual({ passed: true, recovery: { status: "complete" } });
  });
}

it("credits either readings alias once while keeping concept mastery at two distinct families", async () => {
  const { gateRecovery, moduleGate, independentCodingTaskIds } =
    await import("../engine/learning");
  const {
    courseEvidencePolicy,
    courseMastery,
    evidenceForLessonStep,
    recordCourseEvidence,
  } = await import("./learning-context");
  const stage = course.modules.find((m) => m.id === "iterators")!;
  const criterion = stage.gateCriteria!.find(
    (g) => g.id === "iterators-fallible-rows-gate",
  )!;
  const lesson = course.lessons.find(
    (l) => l.id === "fallible-iterator-contracts",
  )!;
  const submit = (
    state: ReturnType<typeof createInitialState>,
    stepId: string,
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
      hints: 0,
      revealed: false,
      at: state.events.length + 1,
    });
  };
  for (const alias of [
    "fallible-readings-transfer",
    "fallible-readings-blank",
  ]) {
    const state = submit(createInitialState(), alias);
    expect(
      moduleGate(state, course.lessons, { ...stage, gateCriteria: [criterion] })
        .passed,
      alias,
    ).toBe(true);
    expect(gateRecovery(state, criterion, course.lessons), alias).toEqual({
      status: "complete",
    });
  }
  const aliases = submit(
    submit(createInitialState(), "fallible-readings-transfer"),
    "fallible-readings-blank",
  );
  expect(
    independentCodingTaskIds(aliases, lesson.id, courseEvidencePolicy),
  ).toEqual(["fallible/optional-rows"]);
  expect(courseMastery(aliases, lesson.id).level).toBe("practiced");
  // A diagnostic two-family view checks the gate's own deduplication; the
  // authored criterion above still requires just one independent family.
  const twoFamilyCriterion = {
    ...criterion,
    requiredIndependentCodingTasks: 2,
  };
  expect(
    moduleGate(aliases, course.lessons, {
      ...stage,
      gateCriteria: [twoFamilyCriterion],
    }).passed,
  ).toBe(false);
  expect(gateRecovery(aliases, twoFamilyCriterion, course.lessons)).toEqual({
    status: "available",
    task: criterion.taskRefs[0],
  });
  expect(
    course.concepts.find((c) => c.id === lesson.id)!.evidenceCalibration
      ?.minimumCodingTasks,
  ).toBe(2);
  const distinct = submit(aliases, "fallible-rows-contract");
  expect(
    independentCodingTaskIds(distinct, lesson.id, courseEvidencePolicy),
  ).toEqual(["fallible/optional-rows", "fallible/required-rows"]);
  expect(courseMastery(distinct, lesson.id).level).toBe("understood");
  expect(
    moduleGate(distinct, course.lessons, {
      ...stage,
      gateCriteria: [twoFamilyCriterion],
    }).passed,
  ).toBe(true);
  expect(gateRecovery(distinct, twoFamilyCriterion, course.lessons)).toEqual({
    status: "complete",
  });
});

it("keeps both directions of readings sibling assistance exhausted in saved and event history", async () => {
  const { gateRecovery, moduleGate } = await import("../engine/learning");
  const {
    assistanceForLessonStep,
    evidenceForLessonStep,
    recordCourseEvidence,
  } = await import("./learning-context");
  const stage = course.modules.find((m) => m.id === "iterators")!;
  const criterion = stage.gateCriteria!.find(
    (g) => g.id === "iterators-fallible-rows-gate",
  )!;
  const lesson = course.lessons.find(
    (l) => l.id === "fallible-iterator-contracts",
  )!;
  for (const [helpedId, attemptedId] of [
    ["fallible-readings-transfer", "fallible-readings-blank"],
    ["fallible-readings-blank", "fallible-readings-transfer"],
  ]) {
    const helped = lesson.steps.find((s) => s.id === helpedId)!;
    const attempted = lesson.steps.find((s) => s.id === attemptedId)!;
    for (const mode of ["saved", "event"] as const) {
      let state = createInitialState();
      state.steps[`${lesson.id}:fallible-rows-contract`] = {
        ...createStepProgress(),
        revealed: true,
      };
      if (mode === "saved")
        state.steps[`${lesson.id}:${helpedId}`] = {
          ...createStepProgress(),
          hints: 1,
        };
      else
        state = recordCourseEvidence(state, {
          id: "sibling-help",
          lessonId: lesson.id,
          stepId: helped.id,
          ...evidenceForLessonStep(lesson, helped),
          kind: helped.evidenceKind,
          evaluator: "tests",
          passed: true,
          hints: 1,
          revealed: false,
          at: 1,
        });
      expect(
        gateRecovery(state, criterion, course.lessons),
        `${helpedId}/${mode}`,
      ).toEqual({ status: "exhausted" });
      state = recordCourseEvidence(state, {
        id: "attempted-alias",
        lessonId: lesson.id,
        stepId: attempted.id,
        ...evidenceForLessonStep(lesson, attempted),
        kind: attempted.evidenceKind,
        evaluator: "tests",
        passed: true,
        ...assistanceForLessonStep(state, lesson, attempted),
        at: 2,
      });
      expect(
        moduleGate(state, course.lessons, {
          ...stage,
          gateCriteria: [criterion],
        }).passed,
        `${attemptedId}/${mode}`,
      ).toBe(false);
      expect(
        gateRecovery(state, criterion, course.lessons),
        `${attemptedId}/${mode}`,
      ).toEqual({ status: "exhausted" });
    }
  }
});

it("covers all eligible fallible gate aliases without broadening the values error-policy gate", () => {
  const stage = course.modules.find((m) => m.id === "iterators")!;
  const values = stage.gateCriteria!.find(
    (g) => g.id === "iterators-fallible-values-gate",
  )!;
  const rows = stage.gateCriteria!.find(
    (g) => g.id === "iterators-fallible-rows-gate",
  )!;
  // borrowed-number deliberately collapses absence/parse errors, so it does not
  // satisfy the values gate's distinct Missing/Syntax/Range policy.
  expect(values.taskRefs.map((r) => r.stepId)).toEqual([
    "fallible-config-contract",
    "fallible-optional-transfer",
  ]);
  expect(values.requiredIndependentCodingTasks).toBe(1);
  expect(rows.taskRefs.map((r) => r.stepId)).toEqual([
    "fallible-rows-contract",
    "fallible-readings-transfer",
    "fallible-readings-blank",
  ]);
  expect(rows.requiredIndependentCodingTasks).toBe(1);
  const lesson = course.lessons.find(
    (l) => l.id === "fallible-iterator-contracts",
  )!;
  expect(rows.taskRefs.map((r) => r.stepId)).toEqual(
    lesson.steps
      .filter(
        (s) =>
          s.evaluator?.kind === "tests" &&
          s.evidenceGate &&
          s.evidence?.codingTaskId,
      )
      .map((s) => s.id),
  );
  expect(
    new Set(
      rows.taskRefs.map(
        (ref) =>
          lesson.steps.find((s) => s.id === ref.stepId)!.evidence!.codingTaskId,
      ),
    ).size,
  ).toBe(2);
});
