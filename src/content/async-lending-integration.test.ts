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
  expect(taskRefs).toHaveLength(11);
  expect(
    new Set(taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`)).size,
  ).toBe(11);
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
    const expectedRefs = [
      { lessonId: id, stepId: gate.id },
      { lessonId: id, stepId: blank.id },
      ...(id === "async-lending-receiver"
        ? [
            {
              lessonId: id,
              stepId: "async-lending-receiver-bounded-batch",
            },
          ]
        : []),
    ];
    expect(stage!.gateCriteria![index].taskRefs).toEqual(expectedRefs);
  }
});

it("keeps the receiver batch as an explicit second primary family", () => {
  const lesson = lessons.find(
    (candidate) => candidate.id === "async-lending-receiver",
  )!;
  const batch = lesson.steps.find(
    (step) => step.id === "async-lending-receiver-bounded-batch",
  );
  expect(batch).toMatchObject({
    kind: "apply",
    evidenceKind: "transfer",
    evidenceGate: true,
    evaluator: { kind: "tests" },
    evidence: {
      version: 2,
      conceptIds: ["async-lending-borrowed-readiness"],
      codingTaskId: "async-lending/receiver-bounded-batch-v1",
    },
  });
  expect(batch?.prompt).toContain("BatchReceiver");
  expect(batch?.prompt).toContain("receive_up_to");
  expect(batch?.prompt).toContain("finish");
  expect(
    modules.find((module) => module.id === "async-lending-contracts")!
      .gateCriteria![0].requiredIndependentCodingTasks,
  ).toBe(1);
});
