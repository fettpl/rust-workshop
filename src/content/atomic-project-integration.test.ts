import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";

it("connects the atomic lab to both modules and keeps an independent gate after package reveal", () => {
  const project = projects.find((item) => item.id === "concurrency-lab");
  expect(project, "real downloadable Loom lab is required").toBeDefined();
  const archive = project!.package!;
  expect(archive.id).toBe("concurrency-lab-workshop");
  expect(archive.files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      "Cargo.toml",
      "Cargo.lock",
      "src/lib.rs",
      "src/sync.rs",
      "tests/standard.rs",
      "tests/models.rs",
      "tests/counterexamples.rs",
      "README.md",
    ]),
  );
  const state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  for (const id of ["atomic-state", "memory-ordering"]) {
    const stage = modules.find((entry) => entry.id === id)!;
    expect(stage).toBeDefined();
    expect(stage.gateCriteria).toHaveLength(3);
    for (const criterion of stage.gateCriteria!) {
      expect(criterion.taskRefs).toHaveLength(2);
      expect(
        criterion.taskRefs.some(
          (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
        ),
      ).toBe(true);
    }
  }
  for (const ref of archive.revealStepRefs) {
    expect(state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).toBe(true);
  }
});
