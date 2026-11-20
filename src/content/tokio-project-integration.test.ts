import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate } from "../engine/learning";
import { courseGateRecovery } from "./learning-context";

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
  for (const ref of archive.revealStepRefs) {
    expect(state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).toBe(true);
  }
  for (const criterion of stage.gateCriteria!) {
    expect(
      criterion.taskRefs.filter(
        (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
      ),
    ).not.toHaveLength(0);
  }
});

it("retains a fresh join-report gate route after the pipeline archive solution is revealed", () => {
  const archive = projects.find(
    (entry) => entry.id === "tokio-pipeline",
  )!.package!;
  const stage = modules.find((entry) => entry.id === "tokio-flow-control")!;
  const state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  expect(
    state.steps[
      stepKey("tokio-graceful-shutdown", "tokio-graceful-shutdown-join-blank")
    ]?.revealed,
  ).toBe(true);
  const join = stage.gateCriteria!.find(
    (criterion) => criterion.id === "tokio-signal-and-join",
  )!;
  expect(courseGateRecovery(state, join)).toEqual({
    status: "available",
    task: {
      lessonId: "tokio-graceful-shutdown",
      stepId: "tokio-graceful-shutdown-join-transfer",
    },
  });
  const drain = stage.gateCriteria!.find(
    (criterion) => criterion.id === "tokio-close-and-drain",
  )!;
  expect(courseGateRecovery(state, drain)).toEqual({
    status: "available",
    task: {
      lessonId: "tokio-graceful-shutdown",
      stepId: "tokio-graceful-shutdown-drain-gate",
    },
  });
});
