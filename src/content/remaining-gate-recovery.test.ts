import { expect, it } from "vitest";
import { lessons, modules } from "./course";
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
const originalSingletons = new Set<string>([
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
const criteria = modules.flatMap((stage) =>
  (stage.gateCriteria ?? [])
    .map((criterion, index) => ({ stage, criterion, index }))
    .filter(
      ({ criterion }) =>
        originalSingletons.has(criterion.id) ||
        criterion.requiredIndependentCodingTasks !== undefined,
    ),
);

function task(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
  return {
    lesson,
    step: lesson.steps.find((entry) => entry.id === ref.stepId)!,
  };
}

function pass(state: UserState, ref: ModuleGateTaskRef, at: number) {
  const { lesson, step } = task(ref);
  const displayed = recordSuppliedSolutions(state, step, "code", at);
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

it("covers the 23 original singletons and all counted criteria", () => {
  expect(
    criteria.filter(({ criterion }) => originalSingletons.has(criterion.id)),
  ).toHaveLength(23);
  expect(
    criteria.filter(
      ({ criterion }) => criterion.requiredIndependentCodingTasks !== undefined,
    ),
  ).toHaveLength(25);
});

it.each(criteria)(
  "$stage.id / $criterion.id remains attainable after a single solution is shown",
  ({ stage, criterion, index }) => {
    for (const shown of criterion.taskRefs) {
      for (const explicit of [false, true]) {
        const first = task(shown);
        let state = createInitialState();
        state.steps[stepKey(shown.lessonId, shown.stepId)] = {
          ...createStepProgress("// mój szkic"),
          revealed: true,
        };
        if (explicit) {
          state = recordSuppliedSolutions(state, first.step, "solution", 1);
          state = recordCourseLessonExposure(
            state,
            {
              ...shown,
              conceptIds:
                first.step.evidence?.conceptIds ?? first.lesson.conceptIds,
              at: 1,
              revealed: true,
            },
            "supplied-solution",
          );
        }
        state = importState(exportState(state));
        expect(
          state.steps[stepKey(shown.lessonId, shown.stepId)],
        ).toMatchObject({
          code: "// mój szkic",
          revealed: true,
        });
        // A passing submission of the disclosed implementation cannot open the gate.
        state = pass(state, shown, 2);
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
          expect(criterion.taskRefs, label).toContainEqual(recovery.task);
          expect(recovery.task, label).not.toEqual(shown);
          const { step } = task(recovery.task);
          const id = step.evidence?.codingTaskId ?? step.id;
          expect(seen.has(id), label).toBe(false);
          seen.add(id);
          state = pass(state, recovery.task, n + 3);
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
          state = pass(state, extra.task, required + 3);
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
  },
);
