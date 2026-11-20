import { describe, expect, it } from "vitest";
import type {
  EvidenceEvent,
  ModuleGateTaskRef,
  UserState,
} from "@/domain/types";
import { revealProjectSolution } from "@/domain/project-package";
import { createInitialState, stepKey } from "@/persistence/state";
import { lessons, modules, projects } from "./course";
import {
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  recordCourseEvidence,
} from "./learning-context";

const cases = [
  {
    moduleId: "tokio-flow-control",
    lessonId: "tokio-graceful-shutdown",
    criteria: ["tokio-close-and-drain", "tokio-signal-and-join"],
    steps: [
      "tokio-graceful-shutdown-drain-gate",
      "tokio-graceful-shutdown-join-blank",
    ],
  },
  {
    moduleId: "tokio-io-streams",
    lessonId: "tokio-receiver-stream-drain",
    criteria: [
      "tokio-receiver-close-and-drain",
      "tokio-receiver-stop-preserves-next",
    ],
    steps: [
      "tokio-receiver-stream-drain-close-and-drain-gate",
      "tokio-receiver-stream-drain-next-or-stop-blank",
    ],
  },
] as const;

function success(
  state: UserState,
  ref: ModuleGateTaskRef,
  overrides: Partial<EvidenceEvent> = {},
): UserState {
  const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
  const step = lesson.steps.find((entry) => entry.id === ref.stepId)!;
  return recordCourseEvidence(state, {
    id: `shutdown-${state.events.length}`,
    ...ref,
    conceptIds: [...(step.evidence?.conceptIds ?? lesson.conceptIds)],
    ...(step.evidence ? { evidenceVersion: step.evidence.version } : {}),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at: 1000 + state.events.length,
    ...overrides,
  });
}

for (const testCase of cases) {
  describe(`${testCase.moduleId} requires both shutdown contracts`, () => {
    const stage = modules.find((entry) => entry.id === testCase.moduleId)!;
    const refs = testCase.steps.map((stepId) => ({
      lessonId: testCase.lessonId,
      stepId,
    }));
    const unrelated = () =>
      stage
        .gateCriteria!.filter((criterion) =>
          criterion.taskRefs.every((ref) => ref.lessonId !== testCase.lessonId),
        )
        .reduce(
          (state, criterion) => success(state, criterion.taskRefs[0]),
          createInitialState(),
        );
    const shutdownProgress = (state: UserState) =>
      courseModuleGate(state, lessons, stage)
        .criteria.slice(4)
        .map((criterion) => criterion.passed);

    it("keeps both shutdown contracts unproven even when all other skills pass", () => {
      const state = unrelated();
      expect(
        courseModuleGate(state, lessons, stage)
          .criteria.slice(0, 4)
          .every((criterion) => criterion.passed),
      ).toBe(true);
      expect(shutdownProgress(state)).toEqual([false, false]);
      expect(courseModuleGate(state, lessons, stage).passed).toBe(false);
    });

    it.each([
      { completed: 0, missing: 1, expected: [true, false] },
      { completed: 1, missing: 0, expected: [false, true] },
    ])(
      "leaves contract $missing unproven after repeated success on contract $completed",
      ({ completed, missing, expected }) => {
        let state = unrelated();
        state = success(state, refs[completed]);
        state = success(state, refs[completed]);
        expect(shutdownProgress(state)).toEqual(expected);
        expect(courseModuleGate(state, lessons, stage).passed).toBe(false);
        const missingCriterion = stage.gateCriteria!.find(
          (criterion) => criterion.id === testCase.criteria[missing],
        );
        expect(missingCriterion).toBeDefined();
        expect(courseGateRecovery(state, missingCriterion!)).toEqual({
          status: "available",
          task: refs[missing],
        });
        expect(courseNextGateTask(state, missingCriterion!)).toEqual(
          refs[missing],
        );
        const completedCriterion = stage.gateCriteria!.find(
          (criterion) => criterion.id === testCase.criteria[completed],
        );
        expect(courseGateRecovery(state, completedCriterion!)).toEqual({
          status: "complete",
        });
      },
    );

    it("passes the whole module only after independent evidence for both contracts", () => {
      const state = refs.reduce(
        (current, ref) => success(current, ref),
        unrelated(),
      );
      expect(shutdownProgress(state)).toEqual([true, true]);
      expect(courseModuleGate(state, lessons, stage).passed).toBe(true);
    });

    it.each([
      {
        missing: 0,
        completed: 1,
        assistance: { hints: 1 },
        expected: [false, true],
      },
      {
        missing: 0,
        completed: 1,
        assistance: { revealed: true },
        expected: [false, true],
      },
      {
        missing: 1,
        completed: 0,
        assistance: { hints: 1 },
        expected: [true, false],
      },
      {
        missing: 1,
        completed: 0,
        assistance: { revealed: true },
        expected: [true, false],
      },
    ])(
      "rejects assisted contract $missing with $assistance",
      ({ missing, completed, assistance, expected }) => {
        let state = success(unrelated(), refs[completed]);
        state = success(state, refs[missing], assistance);
        expect(shutdownProgress(state)).toEqual(expected);
        expect(courseModuleGate(state, lessons, stage).passed).toBe(false);
      },
    );
  });
}

it("can prove drain and join independently after revealing the pipeline archive", () => {
  const archive = projects.find(
    (entry) => entry.id === "tokio-pipeline",
  )!.package!;
  const stage = modules.find((entry) => entry.id === "tokio-flow-control")!;
  let state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  for (const criterion of stage.gateCriteria!.slice(0, 4)) {
    const fresh = criterion.taskRefs.find(
      (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
    )!;
    state = success(state, fresh);
  }
  const ref = {
    lessonId: "tokio-graceful-shutdown",
    stepId: "tokio-graceful-shutdown-join-transfer",
  };
  const step = lessons
    .find((lesson) => lesson.id === ref.lessonId)!
    .steps.find((step) => step.id === ref.stepId);
  expect(step?.evaluator?.kind).toBe("tests");
  state = success(state, ref);
  expect(
    courseModuleGate(state, lessons, stage)
      .criteria.slice(4)
      .map((criterion) => criterion.passed),
  ).toEqual([false, true]);
  expect(courseModuleGate(state, lessons, stage).passed).toBe(false);
  state = success(state, {
    lessonId: "tokio-graceful-shutdown",
    stepId: "tokio-graceful-shutdown-drain-gate",
  });
  expect(courseModuleGate(state, lessons, stage).passed).toBe(true);
});
