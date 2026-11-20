import { expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "./course";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import {
  moduleGate,
  recordEvidence,
  recordLessonExposure,
} from "../engine/learning";

it("keeps independent borrowed-API challenges after revealing every primary solution and restoring progress", () => {
  const stage = modules.find((item) => item.id === "borrowed-callbacks");
  expect(
    stage,
    "The advanced borrowed-API module must be registered",
  ).toBeDefined();
  expect(stage!.gateCriteria).toHaveLength(4);
  let state = createInitialState();
  const previousKey = stepKey("number-guessing-transfer", "project-blank");
  const savedDraft = createStepProgress("fn previous_draft() {}\n");
  state.steps[previousKey] = savedDraft;
  state.notes["number-guessing-result-message"] =
    "Wcześniejsze decyzje projektu.";
  for (const criterion of stage!.gateCriteria!) {
    const [primary, blank] = criterion.taskRefs;
    const lesson = lessons.find((item) => item.id === primary.lessonId)!;
    const primaryStep = lesson.steps.find(
      (item) => item.id === primary.stepId,
    )!;
    const blankStep = lesson.steps.find((item) => item.id === blank.stepId)!;
    expect(primaryStep.evaluator?.kind).toBe("tests");
    expect(blankStep.kind).toBe("blank");
    expect(blankStep.code).toBeUndefined();
    expect(blankStep.evaluator?.kind).toBe("tests");
    expect(reviewExercises[lesson.conceptIds[0]].evaluator?.kind).toBe("tests");
    state.steps[stepKey(primary.lessonId, primary.stepId)] = {
      ...createStepProgress(primaryStep.code),
      revealed: true,
    };
    state = recordLessonExposure(state, {
      lessonId: lesson.id,
      stepId: primaryStep.id,
      conceptIds: lesson.conceptIds,
      revealed: true,
      at: state.updatedAt + 1,
    });
    state = recordEvidence(state, {
      id: `borrowed-helped/${primaryStep.id}`,
      lessonId: lesson.id,
      stepId: primaryStep.id,
      conceptIds: lesson.conceptIds,
      kind: primaryStep.evidenceKind,
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: true,
      at: state.updatedAt + 1,
    });
    expect(
      state.steps[stepKey(blank.lessonId, blank.stepId)]?.revealed,
    ).not.toBe(true);
  }
  state = importState(exportState(state));
  expect(state.steps[previousKey]).toEqual(savedDraft);
  expect(state.notes["number-guessing-result-message"]).toBe(
    "Wcześniejsze decyzje projektu.",
  );
  expect(
    moduleGate(state, lessons, stage!).criteria.map((item) => item.passed),
  ).toEqual([false, false, false, false]);

  for (const [criterionIndex, criterion] of stage!.gateCriteria!.entries()) {
    const blank = criterion.taskRefs[1];
    const lesson = lessons.find((item) => item.id === blank.lessonId)!;
    const step = lesson.steps.find((item) => item.id === blank.stepId)!;
    state = recordEvidence(state, {
      id: `borrowed-independent/${step.id}`,
      lessonId: lesson.id,
      stepId: step.id,
      conceptIds: lesson.conceptIds,
      kind: step.evidenceKind,
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: state.updatedAt + 1,
    });
    expect(
      moduleGate(state, lessons, stage!).criteria.map((item) => item.passed),
    ).toEqual(stage!.gateCriteria!.map((_, index) => index <= criterionIndex));
  }
  expect(moduleGate(state, lessons, stage!).passed).toBe(true);
  const restored = importState(exportState(state));
  expect(moduleGate(restored, lessons, stage!).passed).toBe(true);
  expect(restored.steps[previousKey]).toEqual(savedDraft);
});
