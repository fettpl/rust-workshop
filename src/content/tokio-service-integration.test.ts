import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

it("attributes both frame directions and the handler while keeping distinct networking contracts fresh", () => {
  const project = projects.find((entry) => entry.id === "tokio-service");
  expect(project).toBeDefined();
  const stage = modules.find((entry) => entry.id === "tokio-network-service")!;
  expect(stage).toBeDefined();
  expect(project!.lessonIds).toEqual(stage.lessonIds);
  expect(project!.reviewConceptIds).toEqual(
    stage.lessonIds.flatMap(
      (id) => lessons.find((lesson) => lesson.id === id)!.conceptIds,
    ),
  );
  const archive = project!.package!;
  expect(archive.id).toBe("tokio-service-workshop");
  expect(archive.files.map((file) => file.path)).toEqual(
    expect.arrayContaining(["Cargo.toml", "Cargo.lock", "README.md", "ADR.md"]),
  );
  expect(archive.revealStepRefs).toHaveLength(3);
  expect(stage.gateCriteria).toHaveLength(4);
  let state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  expect(moduleGate(state, lessons, stage).passed).toBe(false);
  expect(state.events).toHaveLength(14);
  for (const criterion of stage.gateCriteria!) {
    expect(criterion.taskRefs).toHaveLength(
      criterion.id === "tokio-frame-deadlines-contract" ? 3 : 2,
    );
    const fresh = criterion.taskRefs.filter(
      (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
    );
    const expectedFresh =
      criterion.id === "tokio-frame-deadlines-contract"
        ? 1
        : criterion.id === "tokio-admission-lifecycle-contract"
          ? 1
          : 2;
    expect(fresh).toHaveLength(expectedFresh);
    if (!fresh.length) continue;
    const ref = fresh[0];
    const lesson = lessons.find((item) => item.id === ref.lessonId)!;
    const step = lesson.steps.find((item) => item.id === ref.stepId)!;
    expect(["modify", "debug", "blank", "apply"]).toContain(step.kind);
    expect(step.evaluator?.kind).toBe("tests");
    state = recordEvidence(state, {
      id: `fresh-service/${ref.stepId}`,
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
  }
  expect(moduleGate(state, lessons, stage).passed).toBe(true);
});
