import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";
import { revealProjectSolution } from "../domain/project-package";
import { moduleGate, recordEvidence } from "../engine/learning";

it("keeps Log Analyzer package help separate from Todo and leaves a fresh route through each gate", () => {
  const project = projects.find(
    (item) => item.package?.id === "log-analyzer-workshop",
  );
  expect(
    project,
    "Log Analyzer needs its own downloadable package",
  ).toBeDefined();
  const archive = project!.package!;
  const stage = modules.find((item) => item.id === "log-analyzer")!;
  const state = createInitialState();
  const draftKey = stepKey("log-analyzer-project", "report-blank");
  state.steps[draftKey] = createStepProgress("// mój niezakończony raport");
  let helped = revealProjectSolution(
    state,
    archive,
    lessons,
    state.updatedAt + 1,
  );
  expect(helped.steps[draftKey].code).toBe("// mój niezakończony raport");
  expect(helped.steps[draftKey].revealed).toBe(true);
  expect(helped.events).toHaveLength(archive.revealStepRefs.length);
  expect(helped.events.every((event) => event.kind === "exposure")).toBe(true);
  const todo = projects.find(
    (item) => item.package?.id === "todo-cli-workshop",
  )!.package!;
  for (const ref of todo.revealStepRefs)
    expect(helped.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).not.toBe(
      true,
    );
  expect(moduleGate(helped, lessons, stage).passed).toBe(false);
  for (const criterion of stage.gateCriteria!) {
    const fresh = criterion.taskRefs.find(
      (ref) => !helped.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
    );
    expect(fresh, criterion.label).toBeDefined();
    const lesson = lessons.find((item) => item.id === fresh!.lessonId)!;
    const step = lesson.steps.find((item) => item.id === fresh!.stepId)!;
    expect(step.evaluator?.kind).toBe("tests");
    helped = recordEvidence(helped, {
      id: `independent/${lesson.id}/${step.id}`,
      conceptIds: lesson.conceptIds,
      lessonId: lesson.id,
      stepId: step.id,
      kind: step.evidenceKind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      evaluator: "tests",
      at: helped.updatedAt + 1,
    });
  }
  expect(moduleGate(helped, lessons, stage).passed).toBe(true);
});
