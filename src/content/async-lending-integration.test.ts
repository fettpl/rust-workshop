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
  expect(taskRefs).toHaveLength(15);
  expect(
    new Set(taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`)).size,
  ).toBe(15);
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
        : id === "async-lending-callbacks"
          ? [
              {
                lessonId: id,
                stepId: "async-lending-callbacks-bounded-transform",
              },
            ]
          : id === "async-lending-send-boundary"
            ? [
                {
                  lessonId: id,
                  stepId: "async-lending-send-boundary-prepared-handoff",
                },
              ]
            : id === "async-lending-cancel-commit"
              ? [
                  {
                    lessonId: id,
                    stepId: "async-lending-cancel-commit-lost-reply",
                  },
                ]
              : id === "async-lending-dyn-adapter"
                ? [
                    {
                      lessonId: id,
                      stepId: "async-lending-dyn-adapter-borrowed-sources",
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

it("states authored family availability separately from module completion and concept confirmation", () => {
  const stage = modules.find(
    (module) => module.id === "async-lending-contracts",
  )!;
  expect(stage.exitGate.join(" ")).toContain(
    "Receiver, callback, adapter dyn, Send i cancellation/commit mają po dwie opisane rodziny primary",
  );
  expect(stage.exitGate.join(" ")).toContain(
    "potwierdzenie pojęcia wymaga dwóch kwalifikujących się czystych rodzin",
  );
  expect(stage.exitGate.join(" ")).toContain("Ukończenie modułu");
  expect(
    stage.gateCriteria!.every(
      (item) => item.requiredIndependentCodingTasks === 1,
    ),
  ).toBe(true);
});

it("attributes the assembled handoff model and task only to the existing Send concept", () => {
  const lesson = lessons.find(
    (item) => item.id === "async-lending-send-boundary",
  )!;
  const model = lesson.steps.find(
    (step) => step.id === "async-lending-send-boundary-handoff-model",
  )!;
  const task = lesson.steps.find(
    (step) => step.id === "async-lending-send-boundary-prepared-handoff",
  )!;
  expect(model).toMatchObject({
    kind: "predict",
    evidenceKind: "prediction",
    evidence: { version: 2, conceptIds: [lesson.id] },
  });
  expect(model.evidence).not.toHaveProperty("codingTaskId");
  expect(model.evidenceGate).not.toBe(true);
  expect(task).toMatchObject({
    kind: "apply",
    evidenceKind: "transfer",
    evidenceGate: true,
    evaluator: { kind: "tests" },
    evidence: {
      version: 2,
      conceptIds: [lesson.id],
      codingTaskId: "async-lending/send-prepared-handoff-v1",
    },
  });
  expect(
    concepts.find((concept) => concept.id === lesson.id)?.evidenceCalibration,
  ).toEqual({ version: 2, minimumCodingTasks: 2 });
});
