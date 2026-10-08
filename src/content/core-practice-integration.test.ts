import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as course from "./course";
import legacy from "./core-practice-legacy-baseline.json";
import { traitsModule as originalTraitsModule } from "./traits";
import {
  coreConversionsConcepts,
  coreConversionsLessons,
  coreConversionsSources,
} from "./core-conversions";
import {
  coreCheckedConversionsConcepts,
  coreCheckedConversionsLessons,
  coreCheckedConversionsSources,
} from "./core-checked-conversions";
import {
  nestedPatternConcepts,
  nestedPatternCompetencies,
  nestedPatternLessons,
  nestedPatternReviewExercises,
  nestedPatternSources,
} from "./nested-patterns";
import { functionOwnershipCalibrationLesson } from "./function-ownership-calibration";
import { sharedBorrowCalibrationLesson } from "./shared-borrow-calibration";
import { nextLessonForNavigation } from "../engine/course-route";
import { gateRecovery, moduleGate } from "../engine/learning";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import type { ModuleGateCriterion, UserState } from "../domain/types";
import {
  evidenceForLessonStep,
  recordCourseEvidence,
} from "./learning-context";

const newLessonIds = ["conversion-ownership-views", "checked-conversions"];
const nestedLessonIds = ["nested-patterns-and-destructuring"];
const newConceptIds = [
  "from-owned-conversions",
  "asref-borrowed-views",
  "checked-conversion-errors",
];
const traits = () => course.modules.find((module) => module.id === "traits")!;
const frozenPreNestedInventory = {
  lessons: 186,
  modules: 48,
  concepts: 190,
  blank: 141,
  sources: 332,
  projects: 13,
  traces: 7,
  competencies: 194,
  steps: 1199,
  testEvaluators: 444,
  reviews: 190,
};
const nestedInventory = {
  lessons: nestedPatternLessons.length,
  concepts: nestedPatternConcepts.length,
  competencies: nestedPatternCompetencies.length,
  sources: nestedPatternSources.length,
  steps: nestedPatternLessons.flatMap((lesson) => lesson.steps).length,
  blank: nestedPatternLessons
    .flatMap((lesson) => lesson.steps)
    .filter((step) => step.kind === "blank").length,
  testEvaluators: nestedPatternLessons
    .flatMap((lesson) => lesson.steps)
    .filter((step) => step.evaluator?.kind === "tests").length,
  reviews: Object.keys(nestedPatternReviewExercises).length,
};

it("preserves the immutable legacy prefixes, module order and every old step index", () => {
  expect(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("./core-practice-legacy-baseline.json", import.meta.url),
        ),
      )
      .digest("hex"),
  ).toBe("dcade79f66c1142a5dfcd52b305c4d6d33ef574179d0184e69924e7d44fc025b");
  expect(course.modules.map((module) => module.id)).toEqual(legacy.moduleIds);
  const expectedLegacyLessons = legacy.lessons.map((lesson) =>
    lesson.id === "async-lending-receiver"
      ? {
          ...lesson,
          stepIds: [...lesson.stepIds, "async-lending-receiver-bounded-batch"],
        }
      : lesson,
  );
  expect(
    course.lessons.slice(0, legacy.lessons.length).map((lesson) => ({
      id: lesson.id,
      moduleId: lesson.moduleId,
      stepIds: lesson.steps.map((step) => step.id),
    })),
  ).toEqual(expectedLegacyLessons);
  expect(
    course.concepts
      .slice(0, legacy.conceptIds.length)
      .map((concept) => concept.id),
  ).toEqual(legacy.conceptIds);
  expect(
    course.sources.slice(0, legacy.sourceIds.length).map((source) => source.id),
  ).toEqual(legacy.sourceIds);
  for (const original of legacy.modules) {
    const current = course.modules.find((module) => module.id === original.id)!;
    expect(current.lessonIds).toEqual(
      original.id === "traits"
        ? [...original.lessonIds, ...newLessonIds]
        : original.id === "data-modeling"
          ? [...original.lessonIds, ...nestedLessonIds]
          : original.id === "ownership"
            ? [
                ...original.lessonIds,
                "function-ownership-calibration",
                "shared-borrow-calibration",
              ]
            : original.lessonIds,
    );
    expect(
      current.gateCriteria
        ?.slice(0, original.gateIds.length)
        .map((gate) => gate.id) ?? [],
    ).toEqual(original.gateIds);
  }
  expect(
    traits().gateCriteria?.slice(0, originalTraitsModule.gateCriteria!.length),
  ).toEqual(originalTraitsModule.gateCriteria);
  expect(traits().prerequisites).toEqual(originalTraitsModule.prerequisites);
  expect(traits().assessmentId).toBe(originalTraitsModule.assessmentId);
  expect(
    traits().capabilities.slice(0, originalTraitsModule.capabilities.length),
  ).toEqual(originalTraitsModule.capabilities);
  expect(
    traits().exitGate.slice(0, originalTraitsModule.exitGate.length),
  ).toEqual(originalTraitsModule.exitGate);
});

it("appends the bounded practices and their reviews with unique, resolvable registry IDs", () => {
  expect(course.lessons.slice(legacy.lessons.length)).toEqual([
    ...coreConversionsLessons,
    ...coreCheckedConversionsLessons,
    ...nestedPatternLessons,
    functionOwnershipCalibrationLesson,
    sharedBorrowCalibrationLesson,
  ]);
  expect(course.concepts.slice(legacy.conceptIds.length)).toEqual([
    ...coreConversionsConcepts,
    ...coreCheckedConversionsConcepts,
    ...nestedPatternConcepts,
  ]);
  expect(course.sources.slice(legacy.sourceIds.length)).toEqual([
    ...coreConversionsSources,
    ...coreCheckedConversionsSources,
    ...nestedPatternSources,
  ]);
  expect(course.lessons.at(-1)).toEqual(sharedBorrowCalibrationLesson);
  expect(nestedPatternLessons[0].prerequisites).toEqual([
    "modeling-assessment",
  ]);
  expect(nestedPatternLessons[0].steps.map((step) => step.id)).toEqual([
    "nested-predict",
    "nested-run",
    "nested-repair",
    "nested-transfer",
    "nested-explain",
    "nested-recall",
  ]);
  expect(
    nestedPatternLessons[0].steps.filter((step) => step.kind === "blank"),
  ).toHaveLength(1);
  expect(
    nestedPatternLessons[0].steps.filter(
      (step) => step.evaluator?.kind === "tests",
    ),
  ).toHaveLength(2);
  expect(
    nestedPatternReviewExercises["nested-pattern-matching"]?.evaluator,
  ).toMatchObject({
    kind: "tests",
  });
  expect(nestedPatternSources).toMatchObject([
    {
      id: "core-patterns-book",
      url: "https://doc.rust-lang.org/book/ch19-03-pattern-syntax.html",
      classification: "stable",
      reviewedAt: "2026-10-07",
    },
    {
      id: "core-patterns-reference",
      url: "https://doc.rust-lang.org/reference/patterns.html",
      classification: "stable",
      reviewedAt: "2026-10-07",
    },
  ]);
  expect(nestedPatternConcepts[0].prerequisites).toEqual([
    "enum-variants",
    "exhaustive-match",
    "optional-values",
  ]);
  expect(nestedPatternConcepts[0].evidenceCalibration).toBeUndefined();
  expect(nestedPatternCompetencies).toHaveLength(1);
  for (const step of nestedPatternLessons[0].steps) {
    expect(step.evidence, step.id).toMatchObject({
      version: 2,
      conceptIds: ["nested-pattern-matching"],
    });
    expect(step.evidence?.conceptIds).toEqual(["nested-pattern-matching"]);
  }
  expect(
    nestedPatternLessons[0].steps.find((step) => step.id === "nested-repair")
      ?.evidence?.codingTaskId,
  ).toBe("nested-repair");
  expect(
    nestedPatternLessons[0].steps.find((step) => step.id === "nested-transfer")
      ?.evidence?.codingTaskId,
  ).toBeUndefined();
  expect({
    lessons: course.lessons.length,
    modules: course.modules.length,
    concepts: course.concepts.length,
    blank: course.lessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.kind === "blank"),
    ).length,
    sources: course.sources.length,
    projects: course.projects.length,
    traces: Object.keys(course.traces).length,
    competencies: course.competencies.length,
    steps: course.lessons.flatMap((lesson) => lesson.steps).length,
    testEvaluators: course.lessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
    ).length,
    reviews: Object.keys(course.reviewExercises).length,
  }).toEqual({
    lessons: frozenPreNestedInventory.lessons + nestedInventory.lessons + 2,
    modules: frozenPreNestedInventory.modules,
    concepts: frozenPreNestedInventory.concepts + nestedInventory.concepts,
    blank: frozenPreNestedInventory.blank + nestedInventory.blank,
    sources: frozenPreNestedInventory.sources + nestedInventory.sources,
    projects: frozenPreNestedInventory.projects,
    traces: frozenPreNestedInventory.traces,
    competencies:
      frozenPreNestedInventory.competencies + nestedInventory.competencies,
    steps: frozenPreNestedInventory.steps + nestedInventory.steps + 11,
    testEvaluators:
      frozenPreNestedInventory.testEvaluators +
      nestedInventory.testEvaluators +
      5,
    reviews: frozenPreNestedInventory.reviews + nestedInventory.reviews,
  });
  for (const registry of [
    course.modules,
    course.lessons,
    course.concepts,
    course.competencies,
    course.sources,
  ])
    expect(new Set(registry.map((item) => item.id)).size).toBe(registry.length);
  for (const lesson of course.lessons) {
    for (const prerequisite of lesson.prerequisites)
      expect(
        course.lessons.some((item) => item.id === prerequisite),
        `${lesson.id}/${prerequisite}`,
      ).toBe(true);
    for (const id of lesson.sourceIds)
      expect(course.sources.some((item) => item.id === id)).toBe(true);
    for (const id of lesson.conceptIds)
      expect(course.concepts.some((item) => item.id === id)).toBe(true);
  }
  for (const concept of course.concepts)
    for (const prerequisite of concept.prerequisites)
      expect(course.concepts.some((item) => item.id === prerequisite)).toBe(
        true,
      );
  for (const id of newConceptIds) {
    expect(
      course.concepts.find((concept) => concept.id === id)?.evidenceCalibration,
    ).toBeUndefined();
    const review = course.reviewExercises[id];
    expect(review.evidence).toMatchObject({ version: 2, conceptIds: [id] });
    expect(review.evaluator?.kind).toBe("tests");
  }
  const nestedConcept = course.concepts.find(
    (concept) => concept.id === "nested-pattern-matching",
  )!;
  expect(nestedConcept.evidenceCalibration).toBeUndefined();
  expect(course.reviewExercises["nested-pattern-matching"]).toEqual(
    nestedPatternReviewExercises["nested-pattern-matching"],
  );
  expect(
    course.reviewExercises["nested-pattern-matching"].evaluator?.kind,
  ).toBe("tests");
  expect(newConceptIds.map((id) => course.reviewExercises[id].id)).toEqual([
    "review-from-owned-conversions",
    "review-asref-borrowed-views",
    "review-checked-conversion-errors",
  ]);
  const fresh = course.lessons.filter((lesson) =>
    [...newLessonIds, ...nestedLessonIds].includes(lesson.id),
  );
  expect(fresh.flatMap((lesson) => lesson.steps)).toHaveLength(20);
  expect(
    fresh.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
    ),
  ).toHaveLength(8);
  for (const lesson of fresh)
    for (const step of lesson.steps) {
      expect(step.evidence?.version).toBe(2);
      expect(
        step.evidence!.conceptIds.every((id) => lesson.conceptIds.includes(id)),
      ).toBe(true);
    }
  expect(fresh[0].steps[3].evidence?.conceptIds).toEqual([
    "asref-borrowed-views",
  ]);
  expect(fresh[1].steps[3].evidence?.conceptIds).toEqual([
    "checked-conversion-errors",
  ]);
});

it("follows module order from old trait dispatch through both practices to lifetimes without creating state", () => {
  const state = createInitialState();
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: "trait-dispatch",
    stepIndex: 3,
    panel: "output",
  };
  const before = structuredClone(state);
  expect(
    course.lessons.find((lesson) => lesson.id === "trait-dispatch")!.steps[
      state.resume.stepIndex
    ].id,
  ).toBe(
    legacy.lessons.find((lesson) => lesson.id === "trait-dispatch")!.stepIds[3],
  );
  expect(
    nextLessonForNavigation("trait-dispatch", course.lessons, course.modules)
      ?.id,
  ).toBe(newLessonIds[0]);
  expect(
    nextLessonForNavigation(newLessonIds[0], course.lessons, course.modules)
      ?.id,
  ).toBe(newLessonIds[1]);
  expect(
    nextLessonForNavigation(newLessonIds[1], course.lessons, course.modules)
      ?.id,
  ).toBe(
    course.modules.find((module) => module.id === "lifetimes")!.lessonIds[0],
  );
  expect(state).toEqual(before);
  expect(state.events).toEqual([]);
});

const newCriteria = [
  {
    id: "traits-conversion-views-gate",
    lessonId: newLessonIds[0],
    stepIds: ["conversions-label-repair", "conversions-samples-transfer"],
  },
  {
    id: "traits-checked-conversions-gate",
    lessonId: newLessonIds[1],
    stepIds: ["checked-level-repair", "checked-percent-transfer"],
  },
];
function submit(
  state: UserState,
  criterion: ModuleGateCriterion,
  index: number,
  revealed: boolean,
): UserState {
  const ref = criterion.taskRefs[index];
  const lesson = course.lessons.find((lesson) => lesson.id === ref.lessonId)!;
  const step = lesson.steps.find((step) => step.id === ref.stepId)!;
  return recordCourseEvidence(state, {
    id: `${ref.lessonId}/${ref.stepId}/${state.events.length}`,
    lessonId: ref.lessonId,
    stepId: ref.stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: "tests",
    gate: true,
    passed: true,
    hints: 0,
    revealed,
    at: state.updatedAt + 1,
  });
}
it.each(newCriteria)(
  "$id uses one existing independent alternative and preserves assistance/drafts",
  ({ id, lessonId, stepIds }) => {
    const criterion = traits().gateCriteria?.find((gate) => gate.id === id);
    expect(criterion).toBeDefined();
    expect(criterion!.taskRefs).toEqual(
      stepIds.map((stepId) => ({ lessonId, stepId })),
    );
    expect(criterion!.requiredIndependentCodingTasks).toBeUndefined();
    const stage = { ...traits(), gateCriteria: [criterion!] };
    let state = createInitialState();
    const key = stepKey(lessonId, stepIds[0]);
    state.steps[key] = {
      ...createStepProgress("// zachowany szkic\n"),
      hints: 2,
      revealed: true,
      completed: true,
    };
    const savedProgress = structuredClone(state.steps[key]);
    state = submit(state, criterion!, 0, true);
    state = submit(state, criterion!, 0, true);
    expect(moduleGate(state, course.lessons, stage).passed).toBe(false);
    expect(gateRecovery(state, criterion!, course.lessons)).toEqual({
      status: "available",
      task: criterion!.taskRefs[1],
    });
    state = submit(state, criterion!, 1, false);
    expect(moduleGate(state, course.lessons, stage).passed).toBe(true);
    expect(state.steps[key]).toEqual(savedProgress);
  },
);

describe("saved pre-integration state", () => {
  it.each(["trait-dispatch", "capstone-release-evidence"])(
    "round-trips %s resume and raw learner collections",
    (lessonId) => {
      const original = legacy.lessons.find((lesson) => lesson.id === lessonId)!;
      const key = stepKey(lessonId, original.stepIds[3]);
      const state = createInitialState();
      delete state.routePreference;
      state.resume = {
        view: "lesson",
        lessonId,
        stepIndex: 3,
        panel: "output",
        focus: true,
      };
      state.steps[key] = {
        ...createStepProgress("// historyczny szkic ż\n"),
        answer: "history",
        hints: 2,
        revealed: true,
        completed: true,
        attempts: [
          { at: 50, answer: "history", passed: false, feedback: "zachowaj" },
        ],
      };
      state.notes = { [lessonId]: "historyczna notatka ż" };
      state.bookmarks = [lessonId, "trait-contracts"];
      state.events = [
        {
          id: "legacy-unchanged",
          lessonId,
          stepId: original.stepIds[3],
          conceptIds: [
            course.lessons.find((lesson) => lesson.id === lessonId)!
              .conceptIds[0],
          ],
          kind: "self-rating",
          passed: true,
          hints: 2,
          revealed: true,
          at: 40,
          evaluator: "rubric",
        },
      ];
      state.mastery = {
        legacy: { level: "retained", reason: "saved cache", updatedAt: 40 },
      };
      state.review = [
        {
          conceptId: "legacy",
          dueAt: 80,
          intervalDays: 1,
          attempts: 2,
          reason: "saved queue",
        },
      ];
      state.ratings = [{ conceptId: "legacy", rating: "good", at: 40 }];
      const restored = importState(exportState(state));
      expect(restored).toEqual({ ...state, routePreference: "core" });
      expect(restored.schemaVersion).toBe(3);
      expect(
        course.lessons.find((lesson) => lesson.id === restored.resume.lessonId)!
          .steps[restored.resume.stepIndex].id,
      ).toBe(original.stepIds[3]);
    },
  );
});

it("round-trips an advanced resume before nested navigation and recovers a fresh transfer", () => {
  const advancedLesson = course.lessons.find(
    (lesson) => lesson.id === "capstone-release-evidence",
  )!;
  const advancedStep = advancedLesson.steps[3];
  const state = createInitialState();
  delete state.routePreference;
  state.resume = {
    view: "lesson",
    lessonId: advancedLesson.id,
    stepIndex: 3,
    panel: "output",
    focus: true,
  };
  const advancedKey = stepKey(advancedLesson.id, advancedStep.id);
  state.steps[advancedKey] = {
    ...createStepProgress("// zachowany szkic advanced ż\n"),
    answer: "history",
    hints: 2,
    revealed: true,
    completed: true,
    attempts: [{ at: 50, answer: "history", passed: false, feedback: "keep" }],
  };
  state.notes = { [advancedLesson.id]: "historyczna notatka" };
  state.bookmarks = [advancedLesson.id, "trait-contracts"];
  state.events = [
    {
      id: "advanced-history",
      lessonId: advancedLesson.id,
      stepId: advancedStep.id,
      conceptIds: [advancedLesson.conceptIds[0]],
      kind: "self-rating",
      evaluator: "rubric",
      passed: true,
      hints: 2,
      revealed: true,
      at: 40,
    },
  ];
  state.mastery = {
    legacy: { level: "retained", reason: "saved cache", updatedAt: 40 },
  };
  state.review = [
    {
      conceptId: "legacy",
      dueAt: 80,
      intervalDays: 1,
      attempts: 2,
      reason: "saved queue",
    },
  ];
  state.ratings = [{ conceptId: "legacy", rating: "good", at: 40 }];

  const restored = importState(exportState(state));
  expect(restored).toEqual({ ...state, routePreference: "core" });
  const beforeNavigation = structuredClone(restored);
  expect(
    nextLessonForNavigation(
      "modeling-assessment",
      course.lessons,
      course.modules,
    )?.id,
  ).toBe("nested-patterns-and-destructuring");
  const modeling = course.modules.find(
    (module) => module.id === "data-modeling",
  )!;
  expect(moduleGate(restored, course.lessons, modeling).passed).toBe(false);
  expect(restored).toEqual(beforeNavigation);
  expect(restored.events).toEqual(beforeNavigation.events);

  const criterion = modeling.gateCriteria!.find(
    (gate) => gate.id === "nested-pattern-gate",
  )!;
  let assisted = submit(restored, criterion, 0, true);
  assisted = submit(assisted, criterion, 0, true);
  expect(gateRecovery(assisted, criterion, course.lessons)).toEqual({
    status: "available",
    task: criterion.taskRefs[1],
  });
  const clean = submit(createInitialState(), criterion, 1, false);
  expect(
    moduleGate(clean, course.lessons, {
      ...modeling,
      gateCriteria: [criterion],
    }).passed,
  ).toBe(true);
});
