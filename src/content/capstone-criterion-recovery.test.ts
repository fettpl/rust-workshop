import { expect, it } from "vitest";
import {
  capstoneIntegrationLessons,
  capstoneIntegrationModule,
} from "./capstone-integration";
import { createInitialState } from "../persistence/state";
import { gateRecovery, moduleGate, recordEvidence } from "../engine/learning";

const fallbackIds = [
  "capstone-domain-validate-transfer",
  "capstone-domain-errors-transfer",
  "capstone-commit-replay-transfer",
  "capstone-commit-atomicity-transfer",
  "capstone-lifecycle-admit-transfer",
  "capstone-lifecycle-recall",
  "capstone-protocol-decode-transfer",
  "capstone-protocol-migrate-transfer",
  "capstone-incident-correlate-transfer",
  "capstone-incident-decide-transfer",
  "capstone-release-bind-transfer",
  "capstone-release-decide-transfer",
];

it("recovers every distinct behavior after all twelve primary solutions are revealed", () => {
  const criteria = capstoneIntegrationModule.gateCriteria!;
  let state = createInitialState();
  let at = 1;
  const submit = (
    lessonId: string,
    stepId: string,
    revealed = false,
    hints = 0,
  ) => {
    const lesson = capstoneIntegrationLessons.find(
      (candidate) => candidate.id === lessonId,
    )!;
    const step = lesson.steps.find((candidate) => candidate.id === stepId)!;
    state = recordEvidence(state, {
      id: `recovery/${at}`,
      lessonId,
      stepId,
      conceptIds: lesson.conceptIds,
      kind: step.evidenceKind,
      evaluator: step.evaluator?.kind,
      passed: true,
      hints,
      revealed,
      at: at++,
    });
  };
  for (const criterion of criteria)
    submit(criterion.taskRefs[0].lessonId, criterion.taskRefs[0].stepId, true);
  expect(
    moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
      .passed,
  ).toBe(false);
  for (const [index, criterion] of criteria.entries()) {
    const ref = {
      lessonId: criterion.taskRefs[0].lessonId,
      stepId: fallbackIds[index],
    };
    expect(
      gateRecovery(state, criterion, capstoneIntegrationLessons),
      criterion.id,
    ).toEqual({ status: "available", task: ref });
    const step = capstoneIntegrationLessons
      .find((lesson) => lesson.id === ref.lessonId)!
      .steps.find((candidate) => candidate.id === ref.stepId)!;
    expect(step.evaluator?.kind).toBe("tests");
    submit(ref.lessonId, ref.stepId);
    const result = moduleGate(
      state,
      capstoneIntegrationLessons,
      capstoneIntegrationModule,
    );
    expect(result.criteria.map((candidate) => candidate.passed)).toEqual(
      criteria.map((_, position) => position <= index),
    );
    expect(gateRecovery(state, criterion, capstoneIntegrationLessons)).toEqual({
      status: "complete",
    });
  }
  expect(
    moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
      .passed,
  ).toBe(true);
});

it.each(fallbackIds)(
  "does not credit assisted recovery through %s",
  (fallbackId) => {
    const criterion = capstoneIntegrationModule.gateCriteria!.find(
      (candidate) =>
        candidate.taskRefs.some((ref) => ref.stepId === fallbackId),
    );
    expect(criterion, fallbackId).toBeDefined();
    const [primary, fallback] = criterion!.taskRefs;
    for (const assistance of [
      { hints: 1, revealed: false },
      { hints: 0, revealed: true },
    ]) {
      let state = createInitialState();
      for (const [index, ref] of [primary, fallback].entries()) {
        const lesson = capstoneIntegrationLessons.find(
          (candidate) => candidate.id === ref.lessonId,
        )!;
        const step = lesson.steps.find(
          (candidate) => candidate.id === ref.stepId,
        )!;
        state = recordEvidence(state, {
          id: `${fallbackId}/${index}`,
          ...ref,
          conceptIds: lesson.conceptIds,
          kind: step.evidenceKind,
          evaluator: step.evaluator?.kind,
          passed: true,
          hints: index ? assistance.hints : 0,
          revealed: index ? assistance.revealed : true,
          at: index + 1,
        });
      }
      expect(
        gateRecovery(state, criterion!, capstoneIntegrationLessons),
      ).toEqual({ status: "exhausted" });
      expect(
        moduleGate(
          state,
          capstoneIntegrationLessons,
          capstoneIntegrationModule,
        ).criteria.find((candidate) => candidate.label === criterion!.label)
          ?.passed,
      ).toBe(false);
    }
  },
);
