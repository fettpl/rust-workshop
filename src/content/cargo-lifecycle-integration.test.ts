import { expect, it } from "vitest";
import { lessons, modules, projects, reviewExercises } from "./course";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate } from "../engine/learning";
import { evaluate } from "../engine/evaluate";

it("offers four independent declaration gates after either Frame archive is exposed", async () => {
  const stage = modules.find(
    (item) => item.id === "cargo-dependency-lifecycle",
  );
  expect(stage).toBeDefined();
  expect(stage!.prerequisites).toEqual(["public-api-workspaces"]);
  expect(modules[modules.indexOf(stage!) - 1].id).toBe("public-api-workspaces");
  expect(stage!.gateCriteria).toHaveLength(4);
  const { recordCourseEvidence, revealCourseProjectPackageVariant } =
    await import("./learning-context");
  const archive = projects.find(
    (item) => item.id === "frame-protocol",
  )!.package!;
  for (const variant of ["starter", "solution"] as const) {
    let state = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      variant,
      1000,
    );
    expect(moduleGate(state, lessons, stage!).passed).toBe(false);
    for (const criterion of stage!.gateCriteria!) {
      const [primary, blank] = criterion.taskRefs;
      expect(
        state.steps[stepKey(primary.lessonId, primary.stepId)]?.revealed,
      ).toBe(true);
      expect(
        state.steps[stepKey(blank.lessonId, blank.stepId)]?.revealed,
      ).toBeFalsy();
      const lesson = lessons.find((item) => item.id === blank.lessonId)!;
      const step = lesson.steps.find((item) => item.id === blank.stepId)!;
      expect(step.code).toBeUndefined();
      expect(step.editorMode).toBe("toml");
      expect(step.evaluator?.kind).toBe("manifest-contract");
      expect(evaluate(step.evaluator!, { code: step.solution }).passed).toBe(
        true,
      );
      const review = reviewExercises[lesson.conceptIds[0]];
      expect(review.evaluator?.kind).toBe("manifest-contract");
      expect(
        evaluate(review.evaluator!, { code: review.solution }).passed,
      ).toBe(true);
      state = recordCourseEvidence(state, {
        id: `fresh-${variant}-${step.id}`,
        conceptIds: lesson.conceptIds,
        lessonId: lesson.id,
        stepId: step.id,
        kind: "transfer",
        evaluator: "manifest-contract",
        gate: true,
        passed: true,
        hints: 0,
        revealed: false,
        at: state.updatedAt + 1,
      });
    }
    expect(moduleGate(state, lessons, stage!).passed).toBe(true);
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((item) => item.id === "public-api-workspaces")!,
      ).passed,
    ).toBe(false);
  }
});
