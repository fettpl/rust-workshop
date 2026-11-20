import { expect } from "vitest";
import { lessons, type modules } from "./course";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordCourseLessonExposure,
  recordSuppliedSolutions,
} from "./learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import type { ModuleGateTaskRef, UserState } from "../domain/types";

// These ordinary criteria each had a single route at ea82ec2.
export const originalSingletons = new Set<string>([
  "tokio-close-and-drain",
  "tokio-receiver-close-and-drain",
  "tokio-receiver-stop-preserves-next",
  "dependency-graph-diagnosis-primary-contract",
  "dependency-graph-diagnosis-blank-contract",
  "dependency-source-license-policy-primary-contract",
  "dependency-source-license-policy-blank-contract",
  "dependency-advisory-exceptions-primary-contract",
  "dependency-advisory-exceptions-blank-contract",
  "dependency-release-dossier-primary-contract",
  "dependency-release-dossier-blank-contract",
  "capstone-domain-validate-criterion",
  "capstone-domain-errors-criterion",
  "capstone-commit-replay-criterion",
  "capstone-commit-atomicity-criterion",
  "capstone-lifecycle-admit-criterion",
  "capstone-lifecycle-settle-criterion",
  "capstone-protocol-decode-criterion",
  "capstone-protocol-migrate-criterion",
  "capstone-incident-correlate-criterion",
  "capstone-incident-decide-criterion",
  "capstone-release-bind-criterion",
  "capstone-release-decide-criterion",
]);
function task(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
  return {
    lesson,
    step: lesson.steps.find((entry) => entry.id === ref.stepId)!,
  };
}

export function submitPassingExercise(
  state: UserState,
  ref: ModuleGateTaskRef,
  at: number,
) {
  const { lesson, step } = task(ref);
  const draft = state.steps[stepKey(ref.lessonId, ref.stepId)]?.code;
  const displayed =
    draft === undefined || draft === step.code
      ? recordSuppliedSolutions(state, step, "code", at)
      : state;
  return recordCourseEvidence(displayed, {
    id: "recovery/" + at,
    ...ref,
    at,
    ...evidenceForLessonStep(lesson, step),
    ...assistanceForLessonStep(displayed, lesson, step),
    kind: step.evaluator?.kind === "rubric" ? "self-rating" : step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    gate: step.evidenceGate === true,
  });
}

export function checkRecoveryAfterEachReveal(
  stage: (typeof modules)[number],
  index: number,
) {
  const criterion = stage.gateCriteria![index];
  for (const shown of criterion.taskRefs) {
    const disclosed = task(shown);
    // Choice-only steps can have an imported flag, but the coach has no solution to display.
    for (const explicit of disclosed.step.solution ? [false, true] : [false]) {
      let state = createInitialState();
      state.steps[stepKey(shown.lessonId, shown.stepId)] = {
        ...createStepProgress("// mój szkic"),
        revealed: true,
        hints: explicit ? 2 : 0,
      };
      if (explicit) {
        state = recordSuppliedSolutions(state, disclosed.step, "solution", 1);
        state = recordCourseLessonExposure(
          state,
          {
            ...shown,
            conceptIds:
              disclosed.step.evidence?.conceptIds ??
              disclosed.lesson.conceptIds,
            at: 1,
            revealed: true,
          },
          "supplied-solution",
        );
      }
      state = importState(exportState(state));
      expect(state.steps[stepKey(shown.lessonId, shown.stepId)]).toMatchObject({
        code: "// mój szkic",
        revealed: true,
      });
      // A learner can return directly to any sibling on the lesson map.
      for (const target of disclosed.step.suppliedSolutions?.solution ?? []) {
        if (
          !criterion.taskRefs.some(
            (ref) =>
              ref.lessonId === target.lessonId && ref.stepId === target.stepId,
          )
        )
          continue;
        const sibling = task(target);
        expect(
          assistanceForLessonStep(state, sibling.lesson, sibling.step).revealed,
          shown.stepId + " -> " + target.stepId,
        ).toBe(true);
        const manualSubmission = submitPassingExercise(state, target, 2);
        expect(
          courseModuleGate(manualSubmission, lessons, stage).criteria[index]
            .passed,
          target.stepId,
        ).toBe(false);
      }
      const firstRecovery = courseGateRecovery(state, criterion, lessons);
      expect(firstRecovery.status, shown.stepId).toBe("available");
      if (firstRecovery.status !== "available") throw new Error(shown.stepId);
      expect(firstRecovery.task, shown.stepId).not.toEqual(shown);
      // A passing submission of the disclosed implementation cannot open the gate.
      state = submitPassingExercise(state, shown, 2);
      const label =
        shown.stepId + (explicit ? " (explicit reveal)" : " (restored flag)");
      const required = criterion.requiredIndependentCodingTasks ?? 1;
      const seen = new Set<string>();
      for (let n = 0; n < required; n++) {
        expect(
          courseModuleGate(state, lessons, stage).criteria[index].passed,
          label,
        ).toBe(false);
        const recovery = courseGateRecovery(state, criterion, lessons);
        expect(
          recovery.status,
          label + " after " + seen.size + " independent families",
        ).toBe("available");
        if (recovery.status !== "available") throw new Error(label);
        if (n === 0) expect(recovery, label).toEqual(firstRecovery);
        expect(criterion.taskRefs, label).toContainEqual(recovery.task);
        expect(recovery.task, label).not.toEqual(shown);
        const { step } = task(recovery.task);
        const id = step.evidence?.codingTaskId ?? step.id;
        expect(seen.has(id), label).toBe(false);
        seen.add(id);
        state = submitPassingExercise(state, recovery.task, n + 3);
      }
      if (criterion.supplementaryStepRefs?.length) {
        expect(
          courseModuleGate(state, lessons, stage).criteria[index].passed,
          label,
        ).toBe(false);
        const extra = courseGateRecovery(state, criterion, lessons);
        expect(extra.status, label).toBe("available");
        if (extra.status !== "available") throw new Error(label);
        expect(criterion.supplementaryStepRefs).toContainEqual(extra.task);
        state = submitPassingExercise(state, extra.task, required + 3);
      }
      expect(
        courseModuleGate(state, lessons, stage).criteria[index].passed,
        label,
      ).toBe(true);
      expect(courseGateRecovery(state, criterion, lessons), label).toEqual({
        status: "complete",
      });
    }
  }
}
