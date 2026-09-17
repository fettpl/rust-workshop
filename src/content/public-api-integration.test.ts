import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import { revealProjectSolution } from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

it("preserves independent API evidence after revealing the workspace reference", () => {
  const project = projects.find((entry) => entry.id === "frame-protocol");
  const stage = modules.find((entry) => entry.id === "public-api-workspaces");
  expect(project).toBeDefined();
  expect(stage).toBeDefined();
  expect(stage!.prerequisites).toEqual(["tokio-network-service"]);
  expect(project!.lessonIds).toEqual(expect.arrayContaining(stage!.lessonIds));
  expect(project!.reviewConceptIds).toEqual(
    expect.arrayContaining(stage!.lessonIds),
  );
  const archive = project!.package!;
  expect(archive.id).toBe("frame-protocol-workspace");
  expect(archive.files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      "Cargo.toml",
      "Cargo.lock",
      "README.md",
      "ADR.md",
      "CHANGELOG.md",
    ]),
  );
  expect(archive.revealStepRefs).toHaveLength(4);
  expect(stage!.gateCriteria).toHaveLength(4);
  let state = revealProjectSolution(
    createInitialState(),
    archive,
    lessons,
    1000,
  );
  expect(moduleGate(state, lessons, stage!).passed).toBe(false);
  expect(
    state.events.filter((event) => stage!.lessonIds.includes(event.lessonId)),
  ).toHaveLength(4);
  for (const criterion of stage!.gateCriteria!) {
    expect(criterion.taskRefs).toHaveLength(2);
    const fresh = criterion.taskRefs.filter(
      (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
    );
    expect(fresh).toHaveLength(1);
    const ref = fresh[0];
    const lesson = lessons.find((item) => item.id === ref.lessonId)!;
    const step = lesson.steps.find((item) => item.id === ref.stepId)!;
    expect(step.kind).toBe("blank");
    expect(step.code).toBeUndefined();
    expect(step.evaluator?.kind).toBe("tests");
    state = recordEvidence(state, {
      id: `fresh-api/${ref.stepId}`,
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
  expect(moduleGate(state, lessons, stage!).passed).toBe(true);
});
