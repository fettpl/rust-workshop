import type { ReviewSession, UserState } from "@/domain/types";

export function reviewEventStepId(session: ReviewSession): string {
  return (session.exerciseId ?? session.conceptId) + ":" + session.sessionId;
}

export function reviewSessionKey(sessionId: string): string {
  return `review:${sessionId}`;
}

/** Ratings appended after an app-created start belong to its current attempt.
 * Legacy sessions have no snapshot, so keep their conservative timestamp rule.
 */
export function reviewSessionRated(
  state: UserState,
  session: ReviewSession,
): boolean {
  const count = session.ratingCountAtStart;
  const hasSnapshot =
    count !== undefined &&
    Number.isInteger(count) &&
    count >= 0 &&
    count <= state.ratings.length;
  return state.ratings.some(
    (rating, index) =>
      rating.conceptId === session.conceptId &&
      (hasSnapshot ? index >= count! : rating.at >= session.startedAt),
  );
}

export function reviewSessionFinished(
  state: UserState,
  session: ReviewSession,
): boolean {
  const progress = state.steps[reviewSessionKey(session.sessionId)];
  return Boolean(progress?.completed || reviewSessionRated(state, session));
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
    ratingCountAtStart: state.ratings.length,
    ...(exerciseId === undefined ? {} : { exerciseId }),
  };
}
