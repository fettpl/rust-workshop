import { expect, it } from "vitest";
import type { EvidenceEvent, UserState } from "../domain/types";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import { lessons, modules } from "./course";
import {
  assistanceForLessonStep,
  evidenceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  recordCourseEvidence,
} from "./learning-context";

const lessonId = "testing-regressions";
const stage = modules.find((module) => module.id === "testing-quality")!;
const numeric = "regressions-debug-gate";
const text = "regressions-apply-gate";
const alternateNumeric = "regressions-window-blank";
const alternateText = "regressions-tag-blank";

function submit(
  state: UserState,
  stepId: string,
  changes: Partial<EvidenceEvent> = {},
  sourceLessonId = lessonId,
) {
  const lesson = lessons.find((entry) => entry.id === sourceLessonId)!;
  const step = lesson.steps.find((entry) => entry.id === stepId)!;
  return recordCourseEvidence(state, {
    id: `attempt-${state.events.length}`,
    at: state.events.length + 1,
    lessonId: sourceLessonId,
    stepId,
    kind: step.evidenceKind,
    evaluator: step.evaluator!.kind,
    ...evidenceForLessonStep(lesson, step),
    passed: true,
    ...assistanceForLessonStep(state, lesson, step),
    ...changes,
  });
}

const criteria = stage.gateCriteria!.filter((c) =>
  c.taskRefs.some((ref) => ref.lessonId === lessonId),
);
const progress = (state: UserState) =>
  courseModuleGate(state, lessons, {
    ...stage,
    gateCriteria: criteria,
  }).criteria.map((c) => c.passed);

it.each([
  [numeric, [true, false]],
  [text, [false, true]],
] as const)(
  "keeps repeated independent successes on %s specific to one skill",
  (id, expected) => {
    const once = submit(createInitialState(), id);
    const imported = importState(exportState(once));
    expect(imported.events).toEqual(once.events);
    expect(progress(submit(imported, id))).toEqual(expected);
  },
);

it.each([
  [numeric, alternateNumeric],
  [text, alternateText],
])(
  "offers fresh practice in the same skill after assistance on %s",
  (id, alternative) => {
    const state = submit(createInitialState(), id, { revealed: true });
    const criterion = criteria.find((c) =>
      c.taskRefs.some((ref) => ref.stepId === id),
    )!;
    expect(courseGateRecovery(state, criterion)).toEqual({
      status: "available",
      task: { lessonId, stepId: alternative },
    });
    expect(progress(state)).toEqual([false, false]);
  },
);

it("accepts both independent skills through either pair of exercises", () => {
  for (const n of [numeric, alternateNumeric]) {
    for (const t of [text, alternateText]) {
      expect(progress(submit(submit(createInitialState(), n), t))).toEqual([
        true,
        true,
      ]);
    }
  }
});

it("keeps the full module open until both regression skills are demonstrated", () => {
  let ready = createInitialState();
  for (const criterion of stage.gateCriteria!.filter(
    (c) => !criteria.includes(c),
  )) {
    const tasks = criterion.taskRefs.slice(
      0,
      criterion.requiredIndependentCodingTasks ?? 1,
    );
    for (const ref of [...tasks, ...(criterion.supplementaryStepRefs ?? [])]) {
      ready = submit(ready, ref.stepId, {}, ref.lessonId);
    }
  }
  for (const single of [numeric, text]) {
    expect(courseModuleGate(submit(ready, single), lessons, stage).passed).toBe(
      false,
    );
  }
  expect(
    courseModuleGate(submit(submit(ready, numeric), text), lessons, stage)
      .passed,
  ).toBe(true);
});

it.each([numeric, text, alternateNumeric, alternateText])(
  "requires Rust test evidence for %s even after importing progress",
  (id) => {
    for (const evidenceVersion of [undefined, 1]) {
      const wrong = submit(createInitialState(), id, {
        evaluator: "exact-output",
        evidenceVersion,
      });
      expect(progress(importState(exportState(wrong)))).toEqual([false, false]);
    }
  },
);

it.each([
  [numeric, [true, false]],
  [text, [false, true]],
] as const)("preserves a pre-versioned test success on %s", (id, expected) => {
  const state = submit(createInitialState(), id, {
    evidenceVersion: undefined,
  });
  const imported = importState(exportState(state));
  expect(imported.events).toEqual(state.events);
  expect(progress(imported)).toEqual(expected);
});
