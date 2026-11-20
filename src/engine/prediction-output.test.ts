import { expect, it } from "vitest";
import { lessons, modules } from "../content/course";
import {
  assistanceForLessonStep,
  courseModuleGate,
  courseNextGateTask,
  evidenceForLessonStep,
  courseEvidencePolicy,
} from "../content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { observedSubmission } from "./learning";
import type { Attempt, EvidenceEvent } from "../domain/types";

const lesson = lessons.find((l) => l.id === "scenario-assessment")!;
const step = lesson.steps.find((s) => s.id === "assessment-unseen-copy")!;
const stage = modules.find((m) => m.id === lesson.moduleId)!;
const gate = stage.gateCriteria!.find((g) =>
  g.taskRefs.some((r) => r.stepId === step.id),
)!;
const answer: Attempt = {
  at: 20,
  passed: true,
  answer: "(8, true) (8, true)",
  feedback: "OK",
};
const output: Attempt = {
  at: 20,
  passed: false,
  feedback: "Output",
  code: step.code,
  result: {
    status: "success",
    stdout: "(8, true) (8, true)",
    stderr: "",
    diagnostics: [],
    durationMs: 1,
  },
};
const event: EvidenceEvent = {
  id: "prediction",
  lessonId: lesson.id,
  stepId: step.id,
  ...evidenceForLessonStep(lesson, step),
  kind: step.evidenceKind,
  evaluator: step.evaluator!.kind,
  at: 20,
  gate: true,
  hints: 0,
  revealed: false,
  passed: true,
};
it.each([
  ["output then answer at the same time", [output, answer], false],
  ["answer then output at the same time", [answer, output], true],
  ["earlier output listed last", [answer, { ...output, at: 19 }], false],
  ["later output listed first", [{ ...output, at: 21 }, answer], true],
  [
    "infrastructure failure",
    [
      {
        ...output,
        result: { ...output.result!, status: "infrastructure-error" as const },
      },
      answer,
    ],
    true,
  ],
] as const)(
  "grades an imported prediction with %s",
  (_, attempts, independent) => {
    const state = createInitialState();
    state.events = [event];
    state.steps[stepKey(lesson.id, step.id)] = {
      ...createStepProgress(),
      attempts: [...attempts],
      completed: true,
    };
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, { ...stage, gateCriteria: [gate] })
        .passed,
    ).toBe(independent);
    expect(observedSubmission(restored, 0, courseEvidencePolicy).hints).toBe(
      independent ? 0 : 1,
    );
    const next = courseNextGateTask(restored, gate);
    if (independent) expect(next).toBeUndefined();
    else
      expect(next).toEqual(gate.taskRefs.find((ref) => ref.stepId !== step.id));
    expect(assistanceForLessonStep(restored, lesson, step).hints).toBe(
      attempts.some((a) => a.result?.status === "success") ? 1 : 0,
    );
    expect(restored.events).toEqual([event]);
  },
);

it("keeps a wrong choice's corrective explanation with its question", () => {
  const task = lessons.find((l) => l.id === "move-copy-discovery")!;
  const choice = task.steps.find((s) => s.id === "move-predict")!;
  if (choice.evaluator?.kind !== "choice") throw new Error(choice.id);
  const first = {
    ...answer,
    at: 10,
    passed: false,
    answer: "string",
    feedback: choice.evaluator.explanations.string,
  };
  const later = { ...answer, answer: "integer" };
  const state = createInitialState();
  state.steps[stepKey(task.id, choice.id)] = {
    ...createStepProgress(),
    attempts: [first, later],
  };
  state.events = [
    {
      ...event,
      lessonId: task.id,
      stepId: choice.id,
      ...evidenceForLessonStep(task, choice),
      evaluator: "choice",
    },
  ];
  const criterion = stage.gateCriteria!.find((c) =>
    c.taskRefs.some((r) => r.stepId === choice.id),
  )!;
  expect(
    courseModuleGate(state, lessons, { ...stage, gateCriteria: [criterion] })
      .passed,
  ).toBe(false);
  expect(assistanceForLessonStep(state, task, choice).hints).toBe(1);
  expect(observedSubmission(state, 0, courseEvidencePolicy).hints).toBe(1);
  state.steps[stepKey(task.id, choice.id)].attempts = [
    later,
    { ...first, at: 21 },
  ];
  expect(
    courseModuleGate(state, lessons, { ...stage, gateCriteria: [criterion] })
      .passed,
  ).toBe(true);
});
