import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "@/persistence/state";
import { reviewSessionKey, startReviewSession } from "./review-session";

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

  it("persists the active session while keeping it optional for older state", () => {
    const state = createInitialState();
    state.reviewSession = startReviewSession(
      state,
      "move-semantics",
      10_000,
      true,
      "session-a",
    );

    expect(importState(exportState(state)).reviewSession).toEqual(
      state.reviewSession,
    );
    expect(importState(exportState(createInitialState())).reviewSession).toBe(
      undefined,
    );
  });
});
