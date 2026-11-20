import { describe, expect, it } from "vitest";
import { createInitialState, createStepProgress } from "../persistence/state";
import type {
  Concept,
  Lesson,
  CourseModule,
  EvidenceEvent,
  ModuleGateCriterion,
} from "../domain/types";
import { competencyProgress, nextGateTask, gateRecovery } from "./progress";

import { moduleGate, type EvidencePolicy } from "./learning";

const concepts: Concept[] = ["one", "two"].map((id) => ({
  id,
  title: id,
  prerequisites: [],
  competencyIds: ["coding"],
  reviewPrompt: "question",
  reviewAnswer: "answer",
  distinguish: "other",
}));
const event: EvidenceEvent = {
  id: "a",
  lessonId: "lesson-a",
  stepId: "step",
  conceptIds: ["one"],
  kind: "transfer",
  passed: true,
  hints: 0,
  revealed: false,
  at: 100,
  gate: true,
  evaluator: "tests",
};

describe("cross-lesson progress", () => {
  it("does not infer full competency from one mastered concept or completed steps", () => {
    const state = createInitialState();
    state.mastery.one = {
      level: "understood",
      reason: "tested",
      updatedAt: 100,
    };
    state.steps.example = { ...createStepProgress(), completed: true };
    state.events = [
      event,
      { ...event, id: "repeat" },
      { ...event, id: "assisted", lessonId: "lesson-b", hints: 1 },
      { ...event, id: "read", kind: "exposure" },
    ];
    expect(competencyProgress(state, concepts, "coding")).toMatchObject({
      level: "new",
      proven: 1,
      total: 2,
      independentTasks: 1,
      lessonCount: 1,
    });
    state.mastery.two = {
      level: "retained",
      reason: "delayed",
      updatedAt: 100,
    };
    state.events.push({
      ...event,
      id: "second",
      lessonId: "lesson-b",
      conceptIds: ["two"],
    });
    expect(competencyProgress(state, concepts, "coding")).toMatchObject({
      level: "understood",
      proven: 2,
      total: 2,
      independentTasks: 2,
      lessonCount: 2,
    });
  });

  it("links a gate to an unused variant and then to its missing explanation", () => {
    const state = createInitialState();
    const criterion: ModuleGateCriterion = {
      id: "repair",
      label: "Repair and explain",
      taskRefs: [
        { lessonId: "lesson-a", stepId: "step" },
        { lessonId: "lesson-b", stepId: "step" },
      ],
      supplementaryStepRefs: [{ lessonId: "lesson-b", stepId: "explain" }],
    };
    state.steps["lesson-a:step"] = { ...createStepProgress(), hints: 1 };
    expect(nextGateTask(state, criterion)).toEqual(criterion.taskRefs[1]);
    state.events = [{ ...event, lessonId: "lesson-b" }];
    expect(nextGateTask(state, criterion)).toEqual(
      criterion.supplementaryStepRefs![0],
    );
  });

  it("prefers a fresh variant when completion has no independent evidence", () => {
    const state = createInitialState();
    const criterion: ModuleGateCriterion = {
      id: "repair",
      label: "Repair independently",
      taskRefs: [
        { lessonId: "lesson-a", stepId: "step" },
        { lessonId: "lesson-b", stepId: "step" },
      ],
    };
    state.steps["lesson-a:step"] = {
      ...createStepProgress(),
      completed: true,
    };
    expect(nextGateTask(state, criterion)).toEqual(criterion.taskRefs[1]);
  });
});

const gateLessons = [
  {
    id: "gate-lesson",
    steps: [
      ...["a", "duplicate", "b", "c"].map((id) => ({
        id,
        kind: "modify",
        title: id,
        prompt: "",
        evidenceKind: "assessment",
        evaluator: { kind: "tests", tests: "" },
        evidence: {
          version: 2,
          conceptIds: ["one"],
          codingTaskId: id === "duplicate" ? "a" : id,
        },
      })),
      {
        id: "reflection",
        kind: "explain",
        title: "",
        prompt: "",
        evidenceKind: "self-rating",
        evaluator: { kind: "rubric", criteria: [] },
      },
    ],
    moduleId: "gate",
    conceptIds: ["one"],
    competencyIds: [],
    prerequisites: [],
    title: "",
    subtitle: "",
    minutes: 1,
    outcomes: [],
    misconceptions: [],
    transferTask: "",
    evidenceGate: "",
    sourceIds: [],
  },
] as Lesson[];
const countedCriterion: ModuleGateCriterion = {
  id: "counted",
  label: "Two tasks",
  requiredIndependentCodingTasks: 2,
  taskRefs: ["a", "duplicate", "b", "c"].map((stepId) => ({
    lessonId: "gate-lesson",
    stepId,
  })),
  supplementaryStepRefs: [{ lessonId: "gate-lesson", stepId: "reflection" }],
};
const gateEvent = (
  stepId: string,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent => ({
  ...event,
  id: stepId,
  lessonId: "gate-lesson",
  stepId,
  kind: "assessment",
  evidenceVersion: 2,
  ...overrides,
});
const gateModule = { gateCriteria: [countedCriterion] } as CourseModule;
const gatePolicy: EvidencePolicy = {
  artifactForConcept: () => "rust-code",
  calibrationForConcept: (id) =>
    id === "one" ? { version: 2, minimumCodingTasks: 2 } : undefined,
  definitionForEvent: (candidate) =>
    candidate.lessonId === "gate-lesson" &&
    candidate.evaluator === "tests" &&
    candidate.kind === "assessment"
      ? gateLessons[0].steps.find((step) => step.id === candidate.stepId)
          ?.evidence
      : undefined,
};

describe("counted gate recovery", () => {
  it("requires two current distinct coding families and historical reflection", () => {
    const state = createInitialState();
    state.events = [
      gateEvent("a"),
      gateEvent("duplicate"),
      gateEvent("reflection", {
        kind: "self-rating",
        evaluator: "rubric",
        evidenceVersion: undefined,
      }),
    ];
    expect(moduleGate(state, gateLessons, gateModule).passed).toBe(false);
    expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
      status: "available",
      task: countedCriterion.taskRefs[2],
    });
    state.events.push(gateEvent("b"));
    expect(moduleGate(state, gateLessons, gateModule).passed).toBe(true);
    expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
      status: "complete",
    });
    expect(nextGateTask(state, countedCriterion, gateLessons)).toBeUndefined();
  });
  it.each([
    { evidenceVersion: undefined },
    { evidenceVersion: 1 },
    { hints: 1 },
    { revealed: true },
    { evaluator: "choice" as const },
    { conceptIds: ["one", "two"] },
    { kind: "recall" as const },
  ])("does not credit invalid primary %o", (override) => {
    const state = createInitialState();
    state.events = [
      gateEvent("a", override),
      gateEvent("b"),
      gateEvent("reflection", { kind: "self-rating", evaluator: "rubric" }),
    ];
    expect(moduleGate(state, gateLessons, gateModule).passed).toBe(false);
  });
  it("rechecks an unassisted completed legacy draft but skips assisted variants and credited families", () => {
    const state = createInitialState();
    state.steps["gate-lesson:a"] = {
      ...createStepProgress("preserved"),
      completed: true,
    };
    state.events = [gateEvent("a", { evidenceVersion: undefined })];
    expect(nextGateTask(state, countedCriterion, gateLessons)).toEqual(
      countedCriterion.taskRefs[0],
    );
    state.steps["gate-lesson:a"].hints = 1;
    state.events.push(gateEvent("b"));
    state.steps["gate-lesson:duplicate"] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
      status: "available",
      task: countedCriterion.taskRefs[3],
    });
    state.steps["gate-lesson:c"] = { ...createStepProgress(), hints: 1 };
    expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
      status: "exhausted",
    });
    expect(nextGateTask(state, countedCriterion, gateLessons)).toBeUndefined();
  });
  it("offers missing reflection after sufficient code without counting it as code", () => {
    const state = createInitialState();
    state.events = [gateEvent("a"), gateEvent("b")];
    expect(moduleGate(state, gateLessons, gateModule).passed).toBe(false);
    expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
      status: "available",
      task: countedCriterion.supplementaryStepRefs![0],
    });
  });
  it("summarizes calibrated competency with current selectors and stable task IDs", () => {
    const state = createInitialState();
    state.mastery.one = { level: "retained", reason: "legacy", updatedAt: 100 };
    state.events = [
      gateEvent("a"),
      gateEvent("duplicate"),
      gateEvent("b", { evaluator: "choice" }),
      { ...event, id: "ordinary", conceptIds: ["two"] },
    ];
    expect(
      competencyProgress(state, concepts, "coding", gatePolicy),
    ).toMatchObject({
      level: "new",
      proven: 0,
      independentTasks: 2,
      lessonCount: 2,
    });
    state.events.push(gateEvent("b"));
    expect(
      competencyProgress(state, concepts, "coding", gatePolicy),
    ).toMatchObject({ proven: 1, independentTasks: 3 });
  });
});

it("shares current authored qualification for uncounted gate navigation", () => {
  const state = createInitialState();
  const criterion: ModuleGateCriterion = {
    ...countedCriterion,
    requiredIndependentCodingTasks: undefined,
    taskRefs: [countedCriterion.taskRefs[0]],
  };
  state.steps["gate-lesson:a"] = {
    ...createStepProgress("legacy draft"),
    completed: true,
  };
  state.events = [gateEvent("a", { evidenceVersion: undefined })];
  expect(
    moduleGate(state, gateLessons, {
      gateCriteria: [criterion],
    } as CourseModule).passed,
  ).toBe(false);
  expect(nextGateTask(state, criterion, gateLessons)).toEqual(
    criterion.taskRefs[0],
  );
  state.events.push(gateEvent("a", { id: "current" }));
  expect(nextGateTask(state, criterion, gateLessons)).toEqual(
    criterion.supplementaryStepRefs![0],
  );
});

it("does not inflate a mixed competency from surplus uncalibrated attribution", () => {
  const state = createInitialState();
  state.events = [gateEvent("a", { conceptIds: ["one", "two"] })];
  expect(
    competencyProgress(state, concepts, "coding", gatePolicy),
  ).toMatchObject({ independentTasks: 0, lessonCount: 0, proven: 0 });
});

it("counts one accepted authored coding family once across a mixed concept subset", () => {
  const state = createInitialState();
  state.events = [gateEvent("a", { conceptIds: ["one", "two"] })];
  const mixedPolicy: EvidencePolicy = {
    ...gatePolicy,
    definitionForEvent: () => ({
      version: 2,
      conceptIds: ["one", "two"],
      codingTaskId: "shared-family",
    }),
  };
  expect(
    competencyProgress(state, concepts, "coding", mixedPolicy),
  ).toMatchObject({ independentTasks: 1, lessonCount: 1 });
});

it("retains default competency counting for existing noncalibrated manifest tasks", () => {
  const state = createInitialState();
  state.events = [{ ...event, evaluator: "manifest-contract" }];
  expect(competencyProgress(state, concepts, "coding")).toMatchObject({
    independentTasks: 1,
    lessonCount: 1,
  });
});

it("does not credit or recommend another ref from an earlier assisted coding family", () => {
  const state = createInitialState();
  state.events = [
    gateEvent("duplicate", {
      id: "old-assisted",
      evidenceVersion: undefined,
      hints: 1,
      at: 10,
    }),
    gateEvent("a", { at: 20 }),
    gateEvent("b", { at: 30 }),
  ];
  expect(moduleGate(state, gateLessons, gateModule).passed).toBe(false);
  expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
    status: "available",
    task: countedCriterion.taskRefs[3],
  });
});

it("uses full assistance chronology for calibrated competency task counts", () => {
  const state = createInitialState();
  state.events = [
    gateEvent("duplicate", {
      id: "assisted",
      hints: 1,
      evidenceVersion: undefined,
      at: 10,
    }),
    gateEvent("a", { at: 20 }),
    gateEvent("b", { at: 30 }),
  ];
  const chronologicalPolicy: EvidencePolicy = {
    ...gatePolicy,
    definitionForTask: (lessonId, stepId) =>
      gateLessons
        .find((lesson) => lesson.id === lessonId)
        ?.steps.find((step) => step.id === stepId)?.evidence,
  };
  expect(
    competencyProgress(state, concepts, "coding", chronologicalPolicy),
  ).toMatchObject({ independentTasks: 1, lessonCount: 1 });
});

it("preserves an earned gate family after later assistance on its duplicate ref", () => {
  const state = createInitialState();
  state.events = [
    gateEvent("a", { at: 10 }),
    gateEvent("duplicate", { id: "later-assistance", hints: 1, at: 20 }),
    gateEvent("b", { at: 30 }),
    gateEvent("reflection", {
      kind: "self-rating",
      evaluator: "rubric",
      evidenceVersion: undefined,
      at: 40,
    }),
  ];
  expect(moduleGate(state, gateLessons, gateModule).passed).toBe(true);
  expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
    status: "complete",
  });
});

it("does not offer a family with timeless saved assistance on another authored ref", () => {
  const state = createInitialState();
  state.steps["gate-lesson:duplicate"] = {
    ...createStepProgress("preserved"),
    hints: 1,
    completed: true,
  };
  expect(gateRecovery(state, countedCriterion, gateLessons)).toEqual({
    status: "available",
    task: countedCriterion.taskRefs[2],
  });
});

it("forwards an authoritative counted-gate assistance resolver through recovery and next task", () => {
  const criterion: ModuleGateCriterion = {
    id: "one-family",
    label: "One family",
    requiredIndependentCodingTasks: 1,
    taskRefs: countedCriterion.taskRefs.slice(0, 2),
  };
  const definition = gateLessons[0].steps[0].evidence!;
  const resolveReview: EvidencePolicy["definitionForTask"] = (
    lessonId,
    stepId,
  ) =>
    lessonId === "review" && stepId === "family-a:session"
      ? definition
      : undefined;
  const gate = { ...gateModule, gateCriteria: [criterion] };
  const state = createInitialState();
  state.events = [
    gateEvent("family-a:session", {
      lessonId: "review",
      kind: "exposure",
      revealed: true,
      at: 90,
    }),
  ];
  expect(gateRecovery(state, criterion, gateLessons)).toEqual({
    status: "available",
    task: criterion.taskRefs[0],
  });
  expect(nextGateTask(state, criterion, gateLessons)).toEqual(
    criterion.taskRefs[0],
  );
  expect(gateRecovery(state, criterion, gateLessons, resolveReview)).toEqual({
    status: "exhausted",
  });
  expect(
    nextGateTask(state, criterion, gateLessons, resolveReview),
  ).toBeUndefined();
  state.events.push(gateEvent("a"));
  expect(moduleGate(state, gateLessons, gate).passed).toBe(true);
  expect(moduleGate(state, gateLessons, gate, resolveReview).passed).toBe(
    false,
  );
  expect(gateRecovery(state, criterion, gateLessons, resolveReview)).toEqual({
    status: "exhausted",
  });

  // An explicit resolver may leave a reference unknown. The lesson-only default
  // must not be applied to an undefined result from that resolver.
  state.events = [gateEvent("duplicate", { hints: 1, at: 90 }), gateEvent("a")];
  expect(moduleGate(state, gateLessons, gate).passed).toBe(false);
  expect(moduleGate(state, gateLessons, gate, resolveReview).passed).toBe(true);
  expect(gateRecovery(state, criterion, gateLessons, resolveReview)).toEqual({
    status: "complete",
  });
  expect(moduleGate(state, [], gate, () => definition).passed).toBe(false);

  const uncounted = {
    id: criterion.id,
    label: criterion.label,
    taskRefs: criterion.taskRefs,
  };
  expect(
    nextGateTask(createInitialState(), uncounted, [], () => {
      throw new Error(
        "Legacy no-lesson selection must not consult an assistance resolver",
      );
    }),
  ).toEqual(uncounted.taskRefs[0]);
});
