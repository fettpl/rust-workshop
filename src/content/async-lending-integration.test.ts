import { expect, it } from "vitest";
import { concepts, lessons, modules, reviewExercises } from "./course";

const ids = [
  "async-lending-receiver",
  "async-lending-callbacks",
  "async-lending-cancel-commit",
  "async-lending-send-boundary",
  "async-lending-dyn-adapter",
];

it("registers five async lending lessons, concepts, gates and reviews", () => {
  const stage = modules.find(
    (candidate) => candidate.id === "async-lending-contracts",
  );
  expect(stage).toBeDefined();
  expect(stage!.lessonIds).toEqual(ids);
  expect(stage!.gateCriteria).toHaveLength(5);
  const taskRefs = stage!.gateCriteria!.flatMap(
    (criterion) => criterion.taskRefs,
  );
  expect(taskRefs).toHaveLength(10);
  expect(
    new Set(taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`)).size,
  ).toBe(10);
  for (const [index, id] of ids.entries()) {
    const lesson = lessons.find((candidate) => candidate.id === id)!;
    expect(lesson.conceptIds).toEqual([
      id === "async-lending-receiver"
        ? "async-lending-borrowed-readiness"
        : id === "async-lending-callbacks"
          ? "async-lending-callback-borrow"
          : id,
    ]);
    expect(
      concepts.some((concept) => lesson.conceptIds.includes(concept.id)),
    ).toBe(true);
    const gate = lesson.steps.find((step) => step.id === `${id}-gate`)!;
    const blank = lesson.steps.find((step) => step.id === `${id}-blank`)!;
    expect(gate.evidenceGate).toBe(true);
    expect(blank.evidenceGate).toBe(true);
    expect(blank.code).toBeUndefined();
    const reviewKey = lesson.conceptIds[0];
    expect(reviewExercises[reviewKey]?.id).toBe(`${id}-review`);
    expect(stage!.gateCriteria![index].taskRefs).toEqual([
      { lessonId: id, stepId: gate.id },
      { lessonId: id, stepId: blank.id },
    ]);
  }
});
