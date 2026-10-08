import type { ReviewSession, UserState } from "@/domain/types";

export function reviewSessionKey(sessionId: string): string {
  return `review:${sessionId}`;
}

export function reviewSessionFinished(
  state: UserState,
  session: ReviewSession,
): boolean {
  const progress = state.steps[reviewSessionKey(session.sessionId)];
  return Boolean(
    progress?.completed ||
    state.ratings.some(
      (rating) =>
        rating.conceptId === session.conceptId &&
        rating.at >= session.startedAt,
    ),
  );
}

export function startReviewSession(
  state: UserState,
  conceptId: string,
  now: number,
  wasDue: boolean,
  sessionId: string,
  exerciseId?: string,
): ReviewSession {
  const current = state.reviewSession;
  if (
    current &&
    current.conceptId === conceptId &&
    !reviewSessionFinished(state, current)
  )
    return current;
  return {
    conceptId,
    mode: "challenge",
    sessionId,
    startedAt: now,
    wasDue,
    ...(exerciseId === undefined ? {} : { exerciseId }),
  };
}
