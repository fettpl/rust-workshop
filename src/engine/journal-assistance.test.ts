import { expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "../content/course";
import {
  assistanceForLessonStep,
  courseCompetencyProgress,
  courseEvidenceSummary,
  courseModuleGate,
  courseNextGateTask,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordCourseLessonExposure,
} from "../content/learning-context";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import type { EvidenceEvent } from "../domain/types";
import { DAY } from "./learning";

const lesson = lessons.find((l) => l.id === "vec-and-borrowing")!;
const primary = lesson.steps.find((s) => s.id === "vec-last-gate")!;
const criterion = modules
  .find((m) => m.id === lesson.moduleId)!
  .gateCriteria!.find((g) => g.id === "vec-gate")!;
const concept = lesson.conceptIds[0];

function pass(step = primary, at = 200): EvidenceEvent {
  return {
    id: step.id + "-" + at,
    lessonId: lesson.id,
    stepId: step.id,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator!.kind,
    at,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
  };
}
const hinted = recordCourseLessonExposure(createInitialState(), {
  lessonId: lesson.id,
  stepId: primary.id,
  conceptIds: [concept],
  at: 200,
  revealed: true,
}).events[0]; // Older lesson clients recorded the hint as a generic exposure.
function restored(events: EvidenceEvent[]) {
  return importState(exportState({ ...createInitialState(), events }));
}
it.each([
  ["earlier hint stored last", [pass(primary, 201), hinted], false],
  ["later hint stored first", [hinted, pass(primary, 199)], true],
  ["same time, hint first", [hinted, pass()], false],
  ["same time, pass first", [pass(), hinted], true],
  ["unrelated hint", [{ ...hinted, stepId: "vec-even-gate" }, pass()], true],
  ["neutral visit", [{ ...hinted, revealed: false }, pass()], true],
] as const)(
  "ordinary gate, concept and competency agree for %s",
  (_, events, independent) => {
    const state = restored([...events]);
    const stage = modules.find((m) => m.id === lesson.moduleId)!;
    expect(
      courseModuleGate(state, lessons, { ...stage, gateCriteria: [criterion] })
        .passed,
    ).toBe(independent);
    expect(courseEvidenceSummary(state, concept).qualifyingCodingTasks).toBe(
      Number(independent),
    );
    expect(courseEvidenceSummary(state, concept).mastery.level).toBe(
      independent ? "practiced" : "exposed",
    );
    expect(courseCompetencyProgress(state, concept).independentTasks).toBe(
      Number(independent),
    );
    const next = courseNextGateTask(state, criterion);
    if (independent) expect(next).toBeUndefined();
    else
      expect(next).toEqual(
        criterion.taskRefs.find((r) => r.stepId !== primary.id),
      );
    expect(state.events).toEqual(events);
  },
);

it("restores the assistance for the next submission when step flags are missing", () => {
  const state = restored([hinted]);
  expect(assistanceForLessonStep(state, lesson, primary)).toEqual({
    hints: 1,
    revealed: false,
  });
  expect(
    assistanceForLessonStep(
      state,
      lesson,
      lesson.steps.find((s) => s.id === "vec-even-gate")!,
    ),
  ).toEqual({ hints: 0, revealed: false });
});

it("uses dated family hints for an imported primary and for its next live attempt", () => {
  const l = lessons.find((l) => l.id === "service-authorization-policy")!;
  const shown = l.steps.find((s) => s.id === "authorization-policy-apply")!;
  const blank = l.steps.find((s) => s.id === "authorization-policy-blank")!;
  const other = l.steps.find(
    (s) => s.id === "authorization-policy-matching-indexes",
  )!;
  const failed = {
    ...pass(),
    lessonId: l.id,
    stepId: shown.id,
    ...evidenceForLessonStep(l, shown),
    kind: shown.evidenceKind,
    passed: false,
    hints: 2,
  };
  const later = {
    ...failed,
    id: "blank",
    stepId: blank.id,
    kind: blank.evidenceKind,
    hints: 0,
    passed: true,
    at: failed.at + 10,
  };
  const state = restored([later, failed]);
  expect(assistanceForLessonStep(state, l, blank)).toEqual({
    hints: 2,
    revealed: false,
  });
  expect(assistanceForLessonStep(state, l, other)).toEqual({
    hints: 0,
    revealed: false,
  });
  const summary = courseEvidenceSummary(state, l.conceptIds[0]);
  expect(summary.qualifyingCodingTasks).toBe(0);
  expect(summary.mastery.level).toBe("exposed");
});

const recallAt = 2 * DAY;
const recall: EvidenceEvent = {
  ...pass(),
  id: "recall",
  lessonId: "review",
  stepId: reviewExercises[concept].id + ":session",
  kind: "recall",
  at: recallAt,
  gate: false,
  delayed: true,
};
const foundations = [
  pass(primary, 20),
  pass(
    lesson.steps.find((s) => s.id === "vec-even-gate")!,
    30,
  ),
];
it("keeps reminder help scoped to its review session when deriving retention and scheduling the next review", () => {
  const reminder = {
    ...hinted,
    id: "reminder",
    lessonId: "review",
    stepId: recall.stepId,
    at: 100,
  };
  for (const [session, expected] of [
    [recall.stepId, false],
    [concept + ":session", false],
    [concept + ":session-fresh", true],
    [recall.stepId + "-fresh", true],
  ] as const) {
    const state = restored([...foundations, reminder]);
    state.review = [
      {
        conceptId: concept,
        dueAt: recallAt,
        intervalDays: 2,
        attempts: 1,
        reason: "due",
      },
    ];
    const saved = recordCourseEvidence(state, { ...recall, stepId: session });
    expect(courseEvidenceSummary(saved, concept).mastery.level).toBe(
      expected ? "retained" : "understood",
    );
    expect(saved.review[0].intervalDays).toBe(expected ? 4 : 2);
    expect(saved.events.at(-1)).toEqual({ ...recall, stepId: session });
  }
});

it("checks same-millisecond journal order for the quiet interval before an ordinary recall", () => {
  const contact = { ...hinted, revealed: false, at: recallAt };
  expect(
    courseEvidenceSummary(restored([...foundations, contact, recall]), concept)
      .mastery.level,
  ).toBe("understood");
  expect(
    courseEvidenceSummary(restored([...foundations, recall, contact]), concept)
      .mastery.level,
  ).toBe("retained");
});

it("records each hint level even when multiple actions share a timestamp", () => {
  const exposure = {
    lessonId: lesson.id,
    stepId: primary.id,
    conceptIds: [concept],
    at: 42,
  };
  let state = createInitialState();
  for (const hints of [0, 1, 1, 2, 2]) {
    state = recordCourseLessonExposure(state, { ...exposure, hints });
  }
  expect(state.events.map((e) => [e.hints, e.revealed])).toEqual([
    [0, false],
    [1, false],
    [2, false],
  ]);
  expect(
    assistanceForLessonStep(restored(state.events), lesson, primary),
  ).toEqual({ hints: 2, revealed: false });
  const shown = recordCourseLessonExposure(
    state,
    { ...exposure, revealed: true },
    "supplied-solution",
  );
  expect(
    assistanceForLessonStep(restored(shown.events), lesson, primary),
  ).toEqual({ hints: 2, revealed: true });
});
