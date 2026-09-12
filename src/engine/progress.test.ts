import { describe, expect, it } from "vitest";
import { createInitialState, createStepProgress } from "../persistence/state";
import type {
  Concept,
  EvidenceEvent,
  ModuleGateCriterion,
} from "../domain/types";
import { competencyProgress, nextGateTask } from "./progress";

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
