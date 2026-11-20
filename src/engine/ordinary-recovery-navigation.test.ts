import { expect, it } from "vitest";
import { lessons, modules } from "../content/course";
import {
  courseGateRecovery,
  courseNextGateTask,
} from "../content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";

it("recommends only unassisted routes for the ordinary Vec borrowing criterion", () => {
  const stage = modules.find((module) => module.id === "collections")!;
  const criterion = stage.gateCriteria![0];
  const [first, alternate] = criterion.taskRefs;
  const scope = lessons.filter((lesson) => lesson.moduleId === stage.id);
  const state = createInitialState();
  state.steps[stepKey(first.lessonId, first.stepId)] = {
    ...createStepProgress(),
    revealed: true,
  };
  state.steps[stepKey(alternate.lessonId, alternate.stepId)] = {
    ...createStepProgress(),
    completed: true,
  };
  expect(courseNextGateTask(state, criterion, scope)).toEqual(alternate);
  state.steps[stepKey(alternate.lessonId, alternate.stepId)].hints = 1;
  const restored = importState(exportState(state));
  expect(courseGateRecovery(restored, criterion, scope)).toEqual({
    status: "exhausted",
  });
  expect(courseNextGateTask(restored, criterion, scope)).toBeUndefined();
});
