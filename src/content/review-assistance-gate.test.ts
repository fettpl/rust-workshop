import { expect, it } from "vitest";
import type { UserState } from "../domain/types";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons, modules, reviewExerciseForId } from "./course";
import {
  assistanceForLessonStep,
  courseEvidenceSummary,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  evidenceForReview,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordCourseLessonExposure,
} from "./learning-context";

const operations = ["policy", "attenuation", "binding", "admission"] as const;
type Operation = (typeof operations)[number];
type Alias = "apply" | "blank";
const stage = modules.find((module) => module.id === "service-authorization")!;
const scopedLessons = lessons.filter((lesson) => lesson.moduleId === stage.id);
const reviewFamilies = [
  {
    operation: "attenuation",
    concept: "service-scoped-authority",
    reviewId: "review-service-scoped-authority",
    family: "service-authorization/attenuation-v1",
  },
  {
    operation: "admission",
    concept: "service-bound-authorization-use",
    reviewId: "review-service-bound-authorization-use",
    family: "service-authorization/consuming-admission-v1",
  },
] as const;
type ReviewFamily = (typeof reviewFamilies)[number];

function primary(operation: Operation, alias: Alias) {
  const lesson = scopedLessons.find(
    (item) => item.id === `service-authorization-${operation}`,
  )!;
  const step = lesson.steps.find(
    (item) => item.id === `authorization-${operation}-${alias}`,
  )!;
  return { lesson, step };
}

function primaryPass(
  state: UserState,
  operation: Operation,
  alias: Alias,
  at: number,
) {
  const { lesson, step } = primary(operation, alias);
  return recordCourseEvidence(state, {
    id: `controlled-maintenance-pass:${operation}:${alias}:${at}`,
    lessonId: lesson.id,
    stepId: step.id,
    ...evidenceForLessonStep(lesson, step),
    ...assistanceForLessonStep(state, lesson, step),
    evaluator: step.evaluator!.kind,
    kind: step.evidenceKind,
    gate: step.evidenceGate === true,
    passed: true,
    at,
  });
}

function reviewReveal(state: UserState, family: ReviewFamily, at: number) {
  const review = reviewExerciseForId(family.reviewId)!;
  expect(review.evidence?.codingTaskId).toBe(family.family);
  return recordCourseLessonExposure(state, {
    conceptIds: [family.concept],
    lessonId: "review",
    stepId: `${review.id}:maintenance-session`,
    at,
    revealed: true,
  });
}

it("rejects counted attenuation credit after ordinary review assistance", () => {
  const family = reviewFamilies[0];
  const targetIndex = operations.indexOf(family.operation);
  const criterion = stage.gateCriteria![targetIndex];
  let state = reviewReveal(createInitialState(), family, 100);
  state = primaryPass(state, family.operation, "apply", 200);
  state = primaryPass(state, family.operation, "blank", 201);
  expect(
    courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
  ).toBe(0);
  expect(
    state.events.slice(1).map(({ hints, revealed }) => ({ hints, revealed })),
  ).toEqual([
    { hints: 0, revealed: false },
    { hints: 0, revealed: false },
  ]);
  for (const [index, operation] of operations.entries()) {
    if (operation !== family.operation)
      state = primaryPass(state, operation, "apply", 210 + index);
  }
  const before = JSON.stringify(state);
  const gate = courseModuleGate(state, scopedLessons, stage);
  const recovery = courseGateRecovery(state, criterion, scopedLessons);
  const next = courseNextGateTask(state, criterion, scopedLessons);
  expect(JSON.stringify(state)).toBe(before);
  expect(
    gate.criteria[targetIndex].passed,
    JSON.stringify({
      gate,
      recovery,
      next,
      globalIndependentTasks: courseEvidenceSummary(state, family.concept)
        .qualifyingCodingTasks,
      targetEvents: state.events.slice(0, 3),
    }),
  ).toBe(false);
  expect(gate.criteria.map(({ passed }) => passed)).toEqual([
    true,
    false,
    true,
    true,
  ]);
  expect(gate.passed).toBe(false);
  expect(recovery).toEqual({ status: "available", task: recoveryRef(family) });
  expect(next).toEqual(recoveryRef(family));
});

function recoveryRef(family: ReviewFamily) {
  return {
    lessonId: `service-authorization-${family.operation}`,
    stepId:
      family.operation === "attenuation"
        ? "authorization-attenuation-intersection"
        : "authorization-admission-atomic-batch",
  };
}

function expectFamilySelectors(
  state: UserState,
  family: ReviewFamily,
  credited: boolean,
  recoveryStatus: "complete" | "available" | "exhausted",
) {
  const before = JSON.stringify(state);
  const index = operations.indexOf(family.operation);
  const criterion = stage.gateCriteria![index];
  const expectedRecovery =
    recoveryStatus === "available"
      ? { status: recoveryStatus, task: recoveryRef(family) }
      : { status: recoveryStatus };
  const expectedTask =
    recoveryStatus === "available" ? recoveryRef(family) : undefined;
  for (const scope of [scopedLessons, lessons]) {
    expect(courseModuleGate(state, scope, stage).criteria[index].passed).toBe(
      credited,
    );
    expect(courseGateRecovery(state, criterion, scope)).toEqual(
      expectedRecovery,
    );
    expect(courseNextGateTask(state, criterion, scope)).toEqual(expectedTask);
  }
  expect(courseGateRecovery(state, criterion)).toEqual(expectedRecovery);
  expect(courseNextGateTask(state, criterion)).toEqual(expectedTask);
  expect(JSON.stringify(state)).toBe(before);
}

for (const family of reviewFamilies) {
  it(`${family.operation}: a fresh distinct contract completes the gate without laundering review or alias help`, () => {
    let state = reviewReveal(createInitialState(), family, 100);
    state = primaryPass(state, family.operation, "apply", 200);
    state = primaryPass(state, family.operation, "blank", 201);
    expect(
      courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
    ).toBe(0);
    expectFamilySelectors(state, family, false, "available");
    const raw = structuredClone(state.events);
    const ref = recoveryRef(family);
    const lesson = scopedLessons.find((lesson) => lesson.id === ref.lessonId)!;
    const step = lesson.steps.find((step) => step.id === ref.stepId)!;
    const clean = recordCourseEvidence(state, {
      id: `controlled-maintenance-recovery:${ref.stepId}`,
      ...ref,
      ...evidenceForLessonStep(lesson, step),
      ...assistanceForLessonStep(state, lesson, step),
      kind: step.evidenceKind,
      evaluator: step.evaluator!.kind,
      gate: true,
      passed: true,
      at: 300,
    });
    expect(clean.events.slice(0, raw.length)).toEqual(raw);
    expect(
      courseEvidenceSummary(clean, family.concept).qualifyingCodingTasks,
    ).toBe(1);
    expectFamilySelectors(clean, family, true, "complete");
  });

  it(`${family.operation}: assistance to every eligible family still exhausts recovery`, () => {
    const state = reviewReveal(createInitialState(), family, 100);
    const ref = recoveryRef(family);
    state.steps[stepKey(ref.lessonId, ref.stepId)] = {
      ...createStepProgress(),
      hints: 1,
    };
    expect(
      courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
    ).toBe(0);
    expectFamilySelectors(state, family, false, "exhausted");
    const restored = importState(exportState(state));
    expect(restored.events).toEqual(state.events);
    expect(restored.steps).toEqual(state.steps);
    expectFamilySelectors(restored, family, false, "exhausted");
  });

  it.each(["apply", "blank"] as const)(
    `${family.operation}: counts clean %s once and completes recovery`,
    (alias) => {
      const state = primaryPass(
        createInitialState(),
        family.operation,
        alias,
        200,
      );
      expect(
        courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
      ).toBe(1);
      expectFamilySelectors(state, family, true, "complete");
      const duplicate = primaryPass(
        state,
        family.operation,
        alias === "apply" ? "blank" : "apply",
        201,
      );
      expect(
        courseEvidenceSummary(duplicate, family.concept).qualifyingCodingTasks,
      ).toBe(1);
      expectFamilySelectors(duplicate, family, true, "complete");
    },
  );

  it.each(["apply", "blank"] as const)(
    `${family.operation}: earlier ordinary review excludes clean-looking %s`,
    (alias) => {
      const revealed = reviewReveal(createInitialState(), family, 100);
      const state = primaryPass(revealed, family.operation, alias, 200);
      expect(state.events.at(-1)).toMatchObject({ hints: 0, revealed: false });
      expect(
        courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
      ).toBe(0);
      expectFamilySelectors(state, family, false, "available");
    },
  );

  it(`${family.operation}: reveal alone excludes both primary aliases and offers a distinct contract`, () => {
    const state = reviewReveal(createInitialState(), family, 100);
    expect(
      courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
    ).toBe(0);
    expectFamilySelectors(state, family, false, "available");
  });

  it(`${family.operation}: earlier review leaves the other three criteria intact`, () => {
    let state = reviewReveal(createInitialState(), family, 100);
    for (const [index, operation] of operations.entries()) {
      state = primaryPass(state, operation, "apply", 200 + index);
    }
    const target = operations.indexOf(family.operation);
    const expected = operations.map((_, index) => index !== target);
    expect(
      courseModuleGate(state, scopedLessons, stage).criteria.map(
        ({ passed }) => passed,
      ),
    ).toEqual(expected);
    expect(courseModuleGate(state, lessons, stage).passed).toBe(false);
    expect(
      courseEvidenceSummary(state, "service-scoped-authority")
        .qualifyingCodingTasks,
    ).toBe(family.operation === "attenuation" ? 1 : 2);
    expect(
      courseEvidenceSummary(state, "service-bound-authorization-use")
        .qualifyingCodingTasks,
    ).toBe(family.operation === "admission" ? 1 : 2);
    expectFamilySelectors(state, family, false, "available");
    const exported = JSON.parse(exportState(state));
    const imported = importState(JSON.stringify(exported));
    expect(imported).toEqual(state);
    expect({
      ...JSON.parse(exportState(imported)),
      exportedAt: exported.exportedAt,
    }).toEqual(exported);
    expectFamilySelectors(imported, family, false, "available");
  });

  it.each([
    {
      label: "earlier primary",
      primaryFirst: true,
      primaryAt: 100,
      reviewAt: 200,
      credited: true,
    },
    {
      label: "equal timestamp with primary first",
      primaryFirst: true,
      primaryAt: 200,
      reviewAt: 200,
      credited: true,
    },
    {
      label: "equal timestamp with review first",
      primaryFirst: false,
      primaryAt: 200,
      reviewAt: 200,
      credited: false,
    },
    {
      label: "later-timestamp review stored first",
      primaryFirst: false,
      primaryAt: 200,
      reviewAt: 300,
      credited: true,
    },
  ])(
    `${family.operation}: preserves chronology for $label`,
    ({ primaryFirst, primaryAt, reviewAt, credited }) => {
      const initial = createInitialState();
      const state = primaryFirst
        ? reviewReveal(
            primaryPass(initial, family.operation, "apply", primaryAt),
            family,
            reviewAt,
          )
        : primaryPass(
            reviewReveal(initial, family, reviewAt),
            family.operation,
            "apply",
            primaryAt,
          );
      expect(
        courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
      ).toBe(credited ? 1 : 0);
      expectFamilySelectors(
        state,
        family,
        credited,
        credited ? "complete" : "available",
      );
    },
  );

  it.each([
    { hints: 1, revealed: false },
    { hints: 0, revealed: true },
  ])(
    `${family.operation}: preserves saved lesson-alias assistance %o`,
    (flags) => {
      const state = createInitialState();
      const { lesson, step } = primary(family.operation, "blank");
      const key = stepKey(lesson.id, step.id);
      state.steps[key] = { ...createStepProgress(), ...flags };
      const recorded = primaryPass(state, family.operation, "apply", 200);
      expect(recorded.events.at(-1)).toMatchObject(flags);
      expect(recorded.steps[key]).toEqual(state.steps[key]);
      expect(
        courseEvidenceSummary(recorded, family.concept).qualifyingCodingTasks,
      ).toBe(0);
      expectFamilySelectors(recorded, family, false, "available");
    },
  );

  it.each(["unknown", "unrelated"] as const)(
    `${family.operation}: ignores %s review identity`,
    (identity) => {
      const initial = createInitialState();
      const reveal =
        identity === "unrelated"
          ? reviewReveal(
              initial,
              reviewFamilies.find((item) => item !== family)!,
              100,
            )
          : recordCourseLessonExposure(initial, {
              conceptIds: [family.concept],
              lessonId: "review",
              stepId: "unknown-maintenance-review:session",
              at: 100,
              revealed: true,
            });
      const state = primaryPass(reveal, family.operation, "blank", 200);
      expect(
        courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
      ).toBe(1);
      expectFamilySelectors(state, family, true, "complete");
    },
  );

  it(`${family.operation}: ordinary recall alone never credits a primary criterion`, () => {
    const review = reviewExerciseForId(family.reviewId)!;
    const state = recordCourseEvidence(createInitialState(), {
      id: `controlled-maintenance-recall:${review.id}`,
      lessonId: "review",
      stepId: `${review.id}:maintenance-session`,
      ...evidenceForReview(family.concept, review),
      kind: "recall",
      evaluator: "tests",
      gate: false,
      passed: true,
      hints: 0,
      revealed: false,
      at: 200,
    });
    expect(
      courseEvidenceSummary(state, family.concept).qualifyingCodingTasks,
    ).toBe(0);
    const index = operations.indexOf(family.operation);
    expect(
      courseModuleGate(state, scopedLessons, stage).criteria[index].passed,
    ).toBe(false);
    expect(courseGateRecovery(state, stage.gateCriteria![index])).toMatchObject(
      { status: "available" },
    );
  });
}
