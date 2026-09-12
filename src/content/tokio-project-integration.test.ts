import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate } from "../engine/learning";

it("connects the Tokio pipeline to all five concepts without consuming fresh gates on reveal", () => {
  const project = projects.find((entry) => entry.id === "tokio-pipeline");
  expect(project).toBeDefined();
  const stage = modules.find((entry) => entry.id === "tokio-flow-control")!;
  const archive = project!.package!;
  expect(project!.lessonIds).toEqual(stage.lessonIds);
  expect(project!.reviewConceptIds).toEqual(stage.lessonIds);
  expect(archive.files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      "Cargo.toml",
      "Cargo.lock",
      "README.md",
      "ADR.md",
      "src/lib.rs",
      "tests/contract.rs",
    ]),
  );
  const state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  expect(moduleGate(state, lessons, stage).passed).toBe(false);
  expect(archive.revealStepRefs).toHaveLength(5);
  for (const criterion of stage.gateCriteria!) {
    expect(criterion.taskRefs).toHaveLength(2);
    expect(
      criterion.taskRefs.filter(
        (ref) => state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
      ),
    ).toHaveLength(1);
  }
});
