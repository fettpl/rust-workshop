import { describe, expect, it } from "vitest";
import {
  courseDelayedReviewEligibility,
  courseEvidencePolicy,
  courseEvidenceSummary,
  resolveReviewExercise,
  reviewExerciseIdForOrigin,
} from "./learning-context";
import { delayedReviewExercises, lessons, reviewExercises } from "./course";
import { ownershipModule } from "./catalog";
import {
  DAY,
  gateRecovery,
  independentCodingTaskIds,
  moduleGate,
} from "../engine/learning";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "../persistence/state";
import { reviewSessionKey, startReviewSession } from "../engine/review-session";
import type { EvidenceEvent, UserState } from "../domain/types";

const NOW = 10 * DAY;
const sharedCriterion = ownershipModule.gateCriteria!.find(
  (criterion) => criterion.id === "shared-borrow-pair-v1",
)!;
const sharedRefs = sharedCriterion.taskRefs;
const sharedDelayed = delayedReviewExercises["shared-borrow"];

function eventFor(
  lessonId: string,
  stepId: string,
  at: number,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  const step = lesson?.steps.find((candidate) => candidate.id === stepId);
  if (!step?.evidence || !step.evaluator)
    throw new Error(`Missing registered evidence for ${lessonId}/${stepId}`);
  return {
    id: `${lessonId}/${stepId}/${at}`,
    lessonId,
    stepId,
    kind: step.evidenceKind,
    evaluator: step.evaluator.kind,
    conceptIds: [...step.evidence.conceptIds],
    evidenceVersion: step.evidence.version,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at,
    ...overrides,
  };
}

function sharedEvent(stepId: string, at: number, overrides = {}) {
  return eventFor("shared-borrow-calibration", stepId, at, overrides);
}

function delayedRecall(at: number, overrides: Partial<EvidenceEvent> = {}) {
  return {
    id: `${sharedDelayed.id}:session/${at}`,
    lessonId: "review",
    stepId: `${sharedDelayed.id}:session`,
    kind: "recall" as const,
    evaluator: "tests" as const,
    conceptIds: ["shared-borrow"],
    evidenceVersion: sharedDelayed.evidence!.version,
    passed: true,
    hints: 0,
    revealed: false,
    delayed: true,
    at,
    ...overrides,
  } satisfies EvidenceEvent;
}

function stateWith(events: EvidenceEvent[]): UserState {
  const state = createInitialState();
  state.events = events;
  return state;
}

function dueSharedState(events: EvidenceEvent[], contactAt: number): UserState {
  const state = stateWith(events);
  state.review = [
    {
      conceptId: "shared-borrow",
      dueAt: contactAt,
      intervalDays: 1,
      attempts: 1,
      reason: "registered shared learner flow",
    },
  ];
  return state;
}

function sharedGate(state: UserState) {
  return moduleGate(state, lessons, ownershipModule).criteria.find(
    (criterion) => criterion.label === sharedCriterion.label,
  );
}

describe("registered shared-borrow learner flow", () => {
  it.each([
    {
      name: "no primary event",
      events: [],
      expectedFamilies: [],
    },
    {
      name: "one fresh member",
      events: [sharedEvent("shared-count-words", 100)],
      expectedFamilies: ["ownership/shared-count-words-v1"],
    },
    {
      name: "repeated same member",
      events: [
        sharedEvent("shared-count-words", 100),
        sharedEvent("shared-count-words", 200),
      ],
      expectedFamilies: ["ownership/shared-count-words-v1"],
    },
    {
      name: "old read-length only",
      events: [eventFor("adversarial-no-clone", "adversarial-code", 100)],
      expectedFamilies: ["ownership/read-length"],
    },
    {
      name: "old read-length plus one fresh member",
      events: [
        eventFor("adversarial-no-clone", "adversarial-code", 100),
        sharedEvent("shared-count-words", 200),
      ],
      expectedFamilies: [
        "ownership/read-length",
        "ownership/shared-count-words-v1",
      ],
    },
    {
      name: "delayed recall plus one fresh member",
      events: [
        sharedEvent("shared-count-words", 100),
        delayedRecall(100 + 2 * DAY),
      ],
      expectedFamilies: ["ownership/shared-count-words-v1"],
    },
    {
      name: "two distinct fresh members",
      events: [
        sharedEvent("shared-count-words", 100),
        sharedEvent("shared-has-suffix", 200),
      ],
      expectedFamilies: [
        "ownership/shared-count-words-v1",
        "ownership/shared-has-suffix-v1",
      ],
    },
  ])(
    "counts only registered primary families for $name",
    ({ events, expectedFamilies }) => {
      const state = stateWith(events);
      expect(
        independentCodingTaskIds(state, "shared-borrow", courseEvidencePolicy),
      ).toEqual(expectedFamilies);
      expect(
        courseEvidenceSummary(state, "shared-borrow").qualifyingCodingTasks,
      ).toBe(expectedFamilies.length);
      expect(sharedGate(state)?.passed).toBe(
        expectedFamilies.length === 2 &&
          expectedFamilies.every((id) => id.startsWith("ownership/shared-")),
      );
      if (
        expectedFamilies.length < 2 ||
        !expectedFamilies.every((id) => id.startsWith("ownership/shared-"))
      ) {
        expect(gateRecovery(state, sharedCriterion, lessons).status).toBe(
          "available",
        );
      } else {
        expect(gateRecovery(state, sharedCriterion, lessons)).toEqual({
          status: "complete",
        });
      }
    },
  );

  it.each([
    {
      name: "wrong current concept",
      override: { conceptIds: ["mutable-borrow"] },
    },
    { name: "wrong version", override: { evidenceVersion: 1 } },
    { name: "wrong kind", override: { kind: "recall" as const } },
    {
      name: "wrong evaluator",
      override: { evaluator: "compilation" as const },
    },
    {
      name: "invented neighboring ref",
      lessonId: "shared-borrow-calibration",
      stepId: "shared-count-wordz",
    },
  ])(
    "does not let $name shared attribution spill into a neighboring family",
    ({
      override,
      lessonId = "shared-borrow-calibration",
      stepId = "shared-count-words",
    }) => {
      const malformed =
        lessonId === "shared-borrow-calibration" &&
        stepId === "shared-count-words"
          ? sharedEvent(stepId, 100, override)
          : {
              ...sharedEvent("shared-count-words", 100),
              id: `invented/${Date.now()}`,
              lessonId,
              stepId,
            };
      const state = stateWith([
        malformed,
        sharedEvent("shared-has-suffix", 200),
      ]);
      expect(
        independentCodingTaskIds(state, "shared-borrow", courseEvidencePolicy),
      ).toEqual(["ownership/shared-has-suffix-v1"]);
      expect(gateRecovery(state, sharedCriterion, lessons)).toEqual({
        status: "available",
        task: sharedRefs[0],
      });
    },
  );

  it("keeps the global two-family boundary separate from the exact shared pair", () => {
    const state = dueSharedState(
      [
        eventFor("adversarial-no-clone", "adversarial-code", NOW - 2 * DAY),
        sharedEvent("shared-count-words", NOW - 2 * DAY + 1),
      ],
      NOW - 2 * DAY + 1,
    );
    expect(
      courseEvidenceSummary(state, "shared-borrow").qualifyingCodingTasks,
    ).toBe(2);
    expect(sharedGate(state)?.passed).toBe(false);
    expect(courseDelayedReviewEligibility(state, "shared-borrow", NOW)).toBe(
      true,
    );
  });

  it.each([
    {
      name: "exactly one day since contact",
      events: [
        sharedEvent("shared-count-words", 100),
        sharedEvent("shared-has-suffix", 101),
      ],
      now: 101 + DAY,
    },
    {
      name: "only one primary family",
      events: [sharedEvent("shared-count-words", NOW - 2 * DAY)],
      now: NOW,
    },
    {
      name: "recent exposure",
      events: [
        sharedEvent("shared-count-words", NOW - 2 * DAY),
        sharedEvent("shared-has-suffix", NOW - 2 * DAY + 1),
        {
          ...delayedRecall(NOW - 1),
          id: "recent-shared-exposure",
          kind: "exposure" as const,
          passed: false,
          delayed: undefined,
        } satisfies EvidenceEvent,
      ],
      now: NOW,
    },
    {
      name: "recent rating",
      events: [
        sharedEvent("shared-count-words", NOW - 2 * DAY),
        sharedEvent("shared-has-suffix", NOW - 2 * DAY + 1),
      ],
      now: NOW,
      ratingAt: NOW - 1,
    },
  ])(
    "keeps delayed selection ordinary for $name",
    ({ events, now, ratingAt }) => {
      const state = dueSharedState(events, NOW - 2 * DAY);
      if (ratingAt)
        state.ratings = [
          { conceptId: "shared-borrow", rating: "good", at: ratingAt },
        ];
      expect(courseDelayedReviewEligibility(state, "shared-borrow", now)).toBe(
        false,
      );
      expect(
        reviewExerciseIdForOrigin(state, "shared-borrow", "due", now),
      ).toBeUndefined();
    },
  );

  it("selects the registered delayed exercise only after two fresh families and quiet contact", () => {
    const state = dueSharedState(
      [
        sharedEvent("shared-count-words", NOW - 2 * DAY),
        sharedEvent("shared-has-suffix", NOW - 2 * DAY + 1),
      ],
      NOW - 2 * DAY + 1,
    );
    expect(courseDelayedReviewEligibility(state, "shared-borrow", NOW)).toBe(
      true,
    );
    expect(reviewExerciseIdForOrigin(state, "shared-borrow", "due", NOW)).toBe(
      sharedDelayed.id,
    );
    expect(
      independentCodingTaskIds(state, "shared-borrow", courseEvidencePolicy),
    ).toHaveLength(2);
    const withRecall = stateWith([...state.events, delayedRecall(NOW)]);
    expect(
      independentCodingTaskIds(
        withRecall,
        "shared-borrow",
        courseEvidencePolicy,
      ),
    ).toHaveLength(2);
  });

  it("preserves ordinary and delayed pinned IDs, drafts, and unavailable explicit IDs", () => {
    const ordinary = resolveReviewExercise(
      "shared-borrow",
      reviewExercises["shared-borrow"].id,
    );
    const delayed = resolveReviewExercise("shared-borrow", sharedDelayed.id);
    expect(ordinary).toMatchObject({
      status: "ready",
      exerciseId: "review-shared-borrow",
    });
    expect(delayed).toMatchObject({
      status: "ready",
      exerciseId: sharedDelayed.id,
    });
    expect(
      resolveReviewExercise("shared-borrow", "removed-shared-review"),
    ).toEqual({ status: "unavailable", reason: "unknown-id" });
    expect(
      resolveReviewExercise(
        "shared-borrow",
        reviewExercises["mutable-borrow"].id,
      ),
    ).toEqual({ status: "unavailable", reason: "wrong-concept" });

    const session = startReviewSession(
      createInitialState(),
      "shared-borrow",
      NOW,
      true,
      "shared-pinned-session",
      sharedDelayed.id,
    );
    const state = createInitialState();
    state.reviewSession = session;
    state.steps[reviewSessionKey(session.sessionId)] = {
      ...createStepProgress(sharedDelayed.code),
      code: `${sharedDelayed.code}\n// durable shared draft`,
      answer: "shared draft",
    };
    const roundTripped = importState(exportState(state));
    expect(roundTripped.reviewSession).toEqual(session);
    expect(roundTripped.steps[reviewSessionKey(session.sessionId)]).toEqual(
      state.steps[reviewSessionKey(session.sessionId)],
    );
    expect(
      startReviewSession(
        roundTripped,
        "shared-borrow",
        NOW + 1,
        true,
        "replacement-session",
        sharedDelayed.id,
      ),
    ).toEqual(session);
  });
});
