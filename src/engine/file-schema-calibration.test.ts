import { expect, it } from "vitest";
import type { Concept, EvidenceEvent } from "../domain/types";
import { createInitialState } from "../persistence/state";
import {
  deriveConceptMastery,
  evidencePolicyForConcepts,
  independentCodingTaskIds,
  recordEvidence,
} from "./learning";

const concept: Concept = {
  id: "calibration-test",
  title: "Calibration test",
  prerequisites: [],
  competencyIds: [],
  reviewPrompt: "Prompt",
  reviewAnswer: "Answer",
  distinguish: "Distinct operation",
  evidenceArtifact: "rust-code",
  evidenceCalibration: { version: 2, minimumCodingTasks: 1 },
};

function recorded(minimum: number, families: string[]) {
  const policy = {
    ...evidencePolicyForConcepts([
      {
        ...concept,
        evidenceCalibration: { version: 2, minimumCodingTasks: minimum },
      },
    ]),
    definitionForEvent: (event: EvidenceEvent) => ({
      version: 2,
      conceptIds: [concept.id],
      codingTaskId: families[Number(event.id)],
    }),
  };
  const state = families.reduce(
    (previous, _, index) =>
      recordEvidence(
        previous,
        {
          id: String(index),
          lessonId: "lesson",
          stepId: String(index),
          conceptIds: [concept.id],
          evidenceVersion: 2,
          kind: "transfer",
          evaluator: "tests",
          passed: true,
          gate: true,
          revealed: false,
          hints: 0,
          at: 100 + index,
        },
        policy,
      ),
    createInitialState(),
  );
  return { state, policy };
}

it("describes one independent family with singular wording and its actual event time", () => {
  const { state, policy } = recorded(1, ["one", "one"]);
  expect(independentCodingTaskIds(state, concept.id, policy)).toEqual(["one"]);
  expect(deriveConceptMastery(state, concept.id, policy)).toEqual({
    level: "understood",
    reason:
      "Potwierdzone w jednym samodzielnym zadaniu kodowym bez podpowiedzi.",
    updatedAt: 101,
  });
});

it.each([1, 2])(
  "keeps plural wording for two different families with minimum %i",
  (minimum) => {
    const { state, policy } = recorded(minimum, ["one", "two"]);
    expect(deriveConceptMastery(state, concept.id, policy)).toEqual({
      level: "understood",
      reason: "Potwierdzone w różnych zadaniach kodowych bez podpowiedzi.",
      updatedAt: 101,
    });
  },
);

it("keeps the older uncalibrated two-task reason and timestamp", () => {
  const policy = evidencePolicyForConcepts([
    { ...concept, evidenceCalibration: undefined },
  ]);
  const event: EvidenceEvent = {
    id: "older-first",
    lessonId: "older-lesson",
    stepId: "older-first",
    conceptIds: [concept.id],
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    gate: true,
    revealed: false,
    hints: 0,
    at: 100,
  };
  const first = recordEvidence(createInitialState(), event, policy);
  const both = recordEvidence(
    first,
    { ...event, id: "older-second", stepId: "older-second", at: 101 },
    policy,
  );
  expect(deriveConceptMastery(both, concept.id, policy)).toEqual({
    level: "understood",
    reason:
      "Dwa różne, samodzielne zadania bramkujące lub transferowe zakończone powodzeniem.",
    updatedAt: 101,
  });
});
