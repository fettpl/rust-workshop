import { expect, it } from "vitest";
import { concepts, lessons, modules, reviewExercises } from "./course";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { moduleGate } from "../engine/learning";
import {
  recordCourseEvidence,
  recordCourseLessonExposure,
} from "./learning-context";

const ids = [
  "gat-receiver-borrows",
  "gat-overlapping-mutable-windows",
  "gat-item-capabilities",
  "gat-owned-iterator-adapters",
];

it("preserves four independent GAT gates after primary reveals and a progress round trip", () => {
  const stage = modules.find((item) => item.id === "gat-lending-iterators");
  expect(stage, "The lending module must be registered").toBeDefined();
  expect(stage!.lessonIds).toEqual(ids);
  expect(stage!.prerequisites).toEqual(["borrowed-callbacks", "iterators"]);
  expect(modules[modules.indexOf(stage!) - 1].id).toBe("iterators");
  expect(stage!.gateCriteria).toHaveLength(4);

  let state = createInitialState();
  const oldBlank = lessons
    .find((item) => item.id === "iterator-contracts")!
    .steps.find((item) => item.kind === "blank")!;
  const oldDraftKey = stepKey("iterator-contracts", oldBlank.id);
  const oldDraft = createStepProgress("// wcześniejszy szkic iteratora\n");
  state.steps[oldDraftKey] = oldDraft;
  state.notes["hrtb-borrowed-projections"] = "Wynik wiążę z bieżącym wejściem.";

  for (const [index, id] of ids.entries()) {
    const lesson = lessons.find((item) => item.id === id)!;
    const concept = concepts.find((item) => item.id === id)!;
    const prerequisites =
      index === 0
        ? ["hrtb-borrowed-projections", "iterator-contracts"]
        : [ids[index - 1]];
    expect(lesson.prerequisites).toEqual(prerequisites);
    expect(concept.prerequisites).toEqual(prerequisites);
    expect(concept.evidenceArtifact).toBe("rust-code");
    const primary = lesson.steps.find((item) => item.id === `${id}-gate`)!;
    const blank = lesson.steps.find((item) => item.id === `${id}-blank`)!;
    expect(stage!.gateCriteria![index].taskRefs).toEqual([
      { lessonId: id, stepId: primary.id },
      { lessonId: id, stepId: blank.id },
    ]);
    expect(primary.evaluator?.kind).toBe("tests");
    expect(blank.evaluator?.kind).toBe("tests");
    expect(primary.evidenceGate).toBe(true);
    expect(blank.evidenceGate).toBe(true);
    expect(blank.kind).toBe("blank");
    expect(blank.code).toBeUndefined();
    expect(reviewExercises[id].id).toBe(`${id}-review`);
    expect(reviewExercises[id].evaluator?.kind).toBe("tests");
    expect(reviewExercises[id].solution).not.toBe(primary.solution);
    expect(reviewExercises[id].solution).not.toBe(blank.solution);

    state.steps[stepKey(id, primary.id)] = {
      ...createStepProgress(primary.code),
      revealed: true,
    };
    state = recordCourseLessonExposure(state, {
      lessonId: id,
      stepId: primary.id,
      conceptIds: [id],
      revealed: true,
      at: state.updatedAt + 1,
    });
    state = recordCourseEvidence(state, {
      id: `gat-assisted/${id}`,
      lessonId: id,
      stepId: primary.id,
      conceptIds: [id],
      kind: primary.evidenceKind,
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: true,
      at: state.updatedAt + 1,
    });
    expect(state.steps[stepKey(id, blank.id)]?.revealed).not.toBe(true);
    expect(state.steps[stepKey(id, reviewExercises[id].id)]?.revealed).not.toBe(
      true,
    );
  }

  state = importState(exportState(state));
  expect(
    moduleGate(state, lessons, stage!).criteria.map((item) => item.passed),
  ).toEqual([false, false, false, false]);

  for (const [index, id] of ids.entries()) {
    const blank = lessons
      .find((item) => item.id === id)!
      .steps.find((item) => item.id === `${id}-blank`)!;
    state = recordCourseEvidence(state, {
      id: `gat-independent/${id}`,
      lessonId: id,
      stepId: blank.id,
      conceptIds: [id],
      kind: blank.evidenceKind,
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: state.updatedAt + 1,
    });
    expect(
      moduleGate(state, lessons, stage!).criteria.map((item) => item.passed),
    ).toEqual(ids.map((_, criterion) => criterion <= index));
  }

  const restored = importState(exportState(state));
  expect(moduleGate(restored, lessons, stage!).passed).toBe(true);
  expect(restored.steps[oldDraftKey]).toEqual(oldDraft);
  expect(restored.notes["hrtb-borrowed-projections"]).toBe(
    "Wynik wiążę z bieżącym wejściem.",
  );
});
