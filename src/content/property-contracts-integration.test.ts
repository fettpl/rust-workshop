import { expect, it } from "vitest";
import { lessons, modules, projects, reviewExercises } from "./course";
import { moduleGate } from "../engine/learning";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";

const lessonIds = [
  "property-invariants",
  "property-generated-inputs",
  "property-shrinking-replay",
  "property-metamorphic-transfer",
];

it("connects the property contracts project to four independent module gates", () => {
  const stage = modules.find((entry) => entry.id === "property-contracts");
  const project = projects.find((entry) => entry.id === "property-contracts");
  expect(stage).toBeDefined();
  expect(project).toBeDefined();
  expect(stage!.lessonIds).toEqual(lessonIds);
  expect(stage!.prerequisites).toEqual(["mini-grep"]);
  expect(modules[modules.indexOf(stage!) - 1].id).toBe("mini-grep");
  expect(stage!.gateCriteria).toHaveLength(4);
  expect(project!.lessonIds).toEqual(lessonIds);
  expect(project!.reviewConceptIds).toEqual([
    "property-invariant-contracts",
    "property-generated-inputs",
    "property-shrinking-replay",
    "property-metamorphic-transfer",
  ]);
  expect(project!.package?.revealStepRefs).toHaveLength(2);

  const state = revealProjectSolution(
    createInitialState(),
    project!.package!,
    lessons,
    1000,
  );
  expect(moduleGate(state, lessons, stage!).passed).toBe(false);

  for (const [index, criterion] of stage!.gateCriteria!.entries()) {
    const [primary, blank] = criterion.taskRefs;
    expect(primary.lessonId).toBe(lessonIds[index]);
    expect(
      Boolean(state.steps[stepKey(primary.lessonId, primary.stepId)]?.revealed),
    ).toBe(index < 2);
    expect(
      state.steps[stepKey(blank.lessonId, blank.stepId)]?.revealed,
    ).toBeFalsy();
    const lesson = lessons.find((entry) => entry.id === blank.lessonId)!;
    const blankStep = lesson.steps.find((entry) => entry.id === blank.stepId)!;
    expect(blankStep.kind).toBe("blank");
    expect(blankStep.code).toBeUndefined();
    expect(blankStep.evaluator?.kind).toBe("tests");
    expect(reviewExercises[lesson.conceptIds[0]]).toBeDefined();
    expect(reviewExercises[lesson.conceptIds[0]].evaluator?.kind).toBe("tests");
  }
});
