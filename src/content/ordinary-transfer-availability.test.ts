import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import {
  courseGateRecovery,
  recordSuppliedSolutions,
} from "./learning-context";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";

it.each(["restored flag", "visible solution"])(
  "every ordinary criterion with alternatives offers independent practice after the first %s",
  (source) => {
    const missing: string[] = [];
    for (const stage of modules) {
      for (const criterion of stage.gateCriteria ?? []) {
        if (
          criterion.requiredIndependentCodingTasks !== undefined ||
          criterion.taskRefs.length < 2
        )
          continue;
        const first = criterion.taskRefs[0];
        let state = createInitialState();
        state.steps[stepKey(first.lessonId, first.stepId)] = {
          ...createStepProgress(),
          revealed: true,
        };
        if (source === "visible solution") {
          const lesson = lessons.find((entry) => entry.id === first.lessonId)!;
          const step = lesson.steps.find((entry) => entry.id === first.stepId)!;
          state = revealAuthoredStepSolutions(state, [first], lessons, 1);
          state = recordSuppliedSolutions(state, step, "solution", 1);
        }
        const recovery = courseGateRecovery(state, criterion, lessons);
        if (recovery.status !== "available")
          missing.push(stage.id + "/" + criterion.id);
      }
    }
    expect(missing).toEqual([]);
  },
);
