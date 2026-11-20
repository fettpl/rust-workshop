import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "@/persistence/state";
import {
  reviewSessionFinished,
  reviewSessionKey,
  startReviewSession,
} from "./review-session";

describe("review sessions", () => {
  it("reuses an unfinished session so a reload resumes the exact draft", () => {
    const state = createInitialState();
    const first = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
    );
    const withDraft = {
      ...state,
      reviewSession: first,
      steps: {
        [reviewSessionKey(first.sessionId)]: {
          ...createStepProgress(),
          answer: "move",
          revealed: true,
        },
      },
    };

    expect(
      startReviewSession(
        withDraft,
        "move-semantics",
        20_000,
        true,
        "session-b",
      ),
    ).toEqual(first);
  });

  it("starts a fresh session after the prior session was rated", () => {
    const state = createInitialState();
    const first = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
    );
    const rated = {
      ...state,
      reviewSession: first,
      ratings: [
        { conceptId: "move-semantics", rating: "good" as const, at: 11_000 },
      ],
    };

    expect(
      startReviewSession(rated, "move-semantics", 20_000, true, "session-b"),
    ).toEqual({
      conceptId: "move-semantics",
      mode: "challenge",
      sessionId: "session-b",
      startedAt: 20_000,
      wasDue: true,
      ratingCountAtStart: 1,
    });
  });

  it("starts a fresh session after a completed challenge", () => {
    const state = createInitialState();
    const first = startReviewSession(
      state,
      "move-semantics",
      10_000,
      false,
      "session-a",
    );
    const completed = {
      ...state,
      reviewSession: first,
      steps: {
        [reviewSessionKey(first.sessionId)]: {
          ...createStepProgress(),
          completed: true,
        },
      },
    };

    expect(
      startReviewSession(
        completed,
        "move-semantics",
        20_000,
        false,
        "session-b",
      ).sessionId,
    ).toBe("session-b");
  });

  it("reuses an unfinished pinned session byte-for-byte", () => {
    const state = createInitialState();
    const first = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
      "review-move-semantics-delayed-v1",
    );
    const withUnknownPinnedDraft = {
      ...state,
      reviewSession: { ...first, exerciseId: "future-opaque-exercise" },
    };

    expect(
      startReviewSession(
        withUnknownPinnedDraft,
        "move-semantics",
        20_000,
        true,
        "session-b",
        "new-exercise",
      ),
    ).toBe(withUnknownPinnedDraft.reviewSession);
    expect(reviewSessionFinished(withUnknownPinnedDraft, first)).toBe(false);
  });

  it("creates a fresh pinned session after the prior one is completed", () => {
    const state = createInitialState();
    const first = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
      "exercise-a",
    );
    const completed = {
      ...state,
      reviewSession: first,
      steps: {
        [reviewSessionKey(first.sessionId)]: {
          ...createStepProgress(),
          completed: true,
        },
      },
    };

    expect(
      startReviewSession(
        completed,
        "move-semantics",
        20_000,
        false,
        "session-b",
        "exercise-b",
      ),
    ).toEqual({
      conceptId: "move-semantics",
      mode: "challenge",
      sessionId: "session-b",
      startedAt: 20_000,
      wasDue: false,
      exerciseId: "exercise-b",
      ratingCountAtStart: 0,
    });
    expect(reviewSessionFinished(completed, first)).toBe(true);
  });

  it("persists the active session while keeping it optional for older state", () => {
    const state = createInitialState();
    state.reviewSession = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
      "review-move-semantics-delayed-v1",
    );

    expect(importState(exportState(state)).reviewSession).toEqual(
      state.reviewSession,
    );
    expect(importState(exportState(createInitialState())).reviewSession).toBe(
      undefined,
    );

    const legacy = exportState({
      ...state,
      reviewSession: { ...state.reviewSession, exerciseId: undefined },
    });
    expect(importState(legacy).reviewSession?.exerciseId).toBeUndefined();
  });
});

describe("rating chronology at session start", () => {
  it.each([10_000, 20_000])(
    "does not finish a fresh session from an existing rating at %i",
    (at) => {
      const state = createInitialState();
      state.ratings = [{ conceptId: "move-semantics", rating: "good", at }];
      const session = startReviewSession(
        state,
        "move-semantics",
        10_000,
        false,
        "fresh",
      );
      expect(reviewSessionFinished(state, session)).toBe(false);
      state.ratings.push({
        conceptId: "move-semantics",
        rating: "hard",
        at: 10_000,
      });
      expect(reviewSessionFinished(state, session)).toBe(true);
    },
  );

  it("retains the legacy timestamp rule without rewriting imported sessions", () => {
    const state = createInitialState();
    const session = {
      conceptId: "move-semantics",
      mode: "card" as const,
      sessionId: "legacy",
      startedAt: 10_000,
      wasDue: false,
    };
    const before = structuredClone(session);
    state.ratings = [
      { conceptId: "move-semantics", rating: "good", at: 9_999 },
    ];
    expect(reviewSessionFinished(state, session)).toBe(false);
    state.ratings.push({
      conceptId: "move-semantics",
      rating: "good",
      at: 10_000,
    });
    expect(reviewSessionFinished(state, session)).toBe(true);
    expect(session).toEqual(before);
  });
});

it.each([1, 2, 3])(
  "preserves the rating snapshot through schema %i restoration",
  (schemaVersion) => {
    const state = createInitialState();
    state.ratings = [
      { conceptId: "move-semantics", rating: "good", at: 20_000 },
    ];
    state.reviewSession = startReviewSession(
      state,
      "move-semantics",
      10_000,
      false,
      "snapshot",
    );
    const envelope = JSON.parse(exportState(state));
    envelope.schemaVersion = schemaVersion;
    envelope.state.schemaVersion = schemaVersion;
    if (schemaVersion === 1) delete envelope.state.routePreference;
    if (schemaVersion === 2) envelope.state.onboarding.background = "python";
    const restored = importState(JSON.stringify(envelope));
    expect(restored.reviewSession).toEqual(state.reviewSession);
    expect(reviewSessionFinished(restored, restored.reviewSession!)).toBe(
      false,
    );
  },
);

it("does not finish a current session when only another concept is rated", () => {
  const state = createInitialState();
  const session = startReviewSession(
    state,
    "move-semantics",
    10_000,
    false,
    "snapshot",
  );
  state.ratings = [{ conceptId: "shared-borrow", rating: "good", at: 20_000 }];
  expect(reviewSessionFinished(state, session)).toBe(false);
});

it("falls back conservatively when an imported rating snapshot exceeds the available history", () => {
  const state = createInitialState();
  const session = {
    ...startReviewSession(state, "move-semantics", 100, false, "partial"),
    ratingCountAtStart: 9,
  };
  state.ratings = [{ conceptId: "move-semantics", rating: "good", at: 101 }];
  expect(reviewSessionFinished(state, session)).toBe(true);
});
