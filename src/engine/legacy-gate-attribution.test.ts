import { describe, expect, it } from "vitest";
import { lessons, modules } from "@/content/course";
import {
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
} from "@/content/learning-context";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import type { EvidenceEvent, ModuleGateTaskRef } from "@/domain/types";

function authored(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
  return {
    lesson,
    step: lesson.steps.find((entry) => entry.id === ref.stepId)!,
  };
}
function success(ref: ModuleGateTaskRef): EvidenceEvent {
  const { lesson, step } = authored(ref);
  return {
    id: "legacy-pass",
    ...ref,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evaluator?.kind === "rubric" ? "self-rating" : step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    at: 100,
  };
}
const ordinary = modules.flatMap((stage) =>
  (stage.gateCriteria ?? []).flatMap((criterion) =>
    criterion.requiredIndependentCodingTasks !== undefined
      ? []
      : criterion.taskRefs.flatMap((ref) => {
          const { lesson, step } = authored(ref);
          return !step.evidence ||
            (step.evidence.version === 1 && !step.evidence.codingTaskId)
            ? [{ stage, criterion, ref, lesson, step }]
            : [];
        }),
  ),
);

describe("legacy ordinary task attribution", () => {
  for (const { stage, criterion, ref, lesson, step } of ordinary) {
    it(`${ref.lessonId}/${ref.stepId}: requires a legitimate historical concept vector`, () => {
      const single = {
        ...stage,
        gateCriteria: [
          { ...criterion, taskRefs: [ref], supplementaryStepRefs: [] },
        ],
      };
      const scoped = lessons.filter((entry) => entry.moduleId === stage.id);
      const current = success(ref);
      function check(event: EvidenceEvent, expected: boolean) {
        const state = importState(
          exportState({ ...createInitialState(), events: [event] }),
        );
        const before = structuredClone(state);
        expect(courseModuleGate(state, scoped, single).passed).toBe(expected);
        expect(
          courseGateRecovery(state, single.gateCriteria[0], scoped).status ===
            "complete",
        ).toBe(expected);
        expect(state).toEqual(before);
      }
      check(current, true);
      if (!step.evidence) check({ ...current, evidenceVersion: 999 }, false);
      const historical = {
        ...current,
        evidenceVersion: undefined,
        conceptIds: [...lesson.conceptIds],
      };
      check(historical, true);
      if (step.evaluator?.kind !== "manifest-contract")
        check({ ...historical, evaluator: undefined }, true);
      for (const conceptIds of [
        [],
        ["unrelated"],
        [...lesson.conceptIds, "unrelated"],
        [...lesson.conceptIds, lesson.conceptIds[0]],
      ])
        check({ ...historical, conceptIds }, false);
      if (step.evidence) {
        check(
          { ...historical, conceptIds: [...step.evidence.conceptIds] },
          true,
        );
        check({ ...current, conceptIds: [] }, false);
      }
    });
  }
});

describe("legacy supplementary attribution", () => {
  for (const stage of modules)
    for (const criterion of stage.gateCriteria ?? []) {
      if (!criterion.supplementaryStepRefs?.length) continue;
      it(`${stage.id}/${criterion.id}: legacy reflections retain recognized lesson and step claims`, () => {
        const primary = criterion.taskRefs.map((ref, index) => ({
          ...success(ref),
          id: "primary:" + index,
        }));
        const scoped = lessons.filter((entry) => entry.moduleId === stage.id);
        for (const ref of criterion.supplementaryStepRefs!) {
          const { lesson, step } = authored(ref);
          function check(conceptIds: string[], expected: boolean) {
            const event = {
              ...success(ref),
              evidenceVersion: undefined,
              conceptIds,
            };
            const state = importState(
              exportState({
                ...createInitialState(),
                events: [...primary, event],
              }),
            );
            expect(
              courseModuleGate(state, scoped, {
                ...stage,
                gateCriteria: [criterion],
              }).passed,
            ).toBe(expected);
          }
          check([...lesson.conceptIds], true);
          if (step.evidence) check([...step.evidence.conceptIds], true);
          for (const concepts of [
            [],
            ["unrelated"],
            [...lesson.conceptIds, "unrelated"],
            [...lesson.conceptIds, lesson.conceptIds[0]],
          ])
            check(concepts, false);
        }
      });
    }
});

it("unversioned historical rubric completion cannot claim an unauthored explicit version", async () => {
  const { moduleGate } = await import("./learning");
  const primaryRef = { lessonId: "vec-and-borrowing", stepId: "vec-last-gate" };
  const supplement = { lessonId: "borrow-intro", stepId: "borrow-explain" };
  const { lesson: original } = authored(supplement);
  const historicalLesson = {
    ...original,
    steps: original.steps.map((step) =>
      step.id === supplement.stepId ? { ...step, evidence: undefined } : step,
    ),
  };
  const scoped = [authored(primaryRef).lesson, historicalLesson];
  const stage = {
    ...modules.find((stage) => stage.id === "collections")!,
    gateCriteria: [
      {
        id: "historical-reflection",
        label: "Reflection",
        taskRefs: [primaryRef],
        supplementaryStepRefs: [supplement],
      },
    ],
  };
  const reflection = {
    ...success(supplement),
    id: "reflection",
    evidenceVersion: undefined,
    conceptIds: [...original.conceptIds],
  };
  const state = {
    ...createInitialState(),
    events: [success(primaryRef), reflection],
  };
  expect(moduleGate(state, scoped, stage).passed).toBe(true);
  for (const evidenceVersion of [1, 2, 999]) {
    expect(
      moduleGate(
        {
          ...state,
          events: [state.events[0], { ...reflection, evidenceVersion }],
        },
        scoped,
        stage,
      ).passed,
    ).toBe(false);
  }
});
