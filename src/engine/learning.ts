import type {
  CourseModule,
  EvidenceEvent,
  Lesson,
  LessonExposure,
  MasteryLevel,
  ReviewItem,
  UserState,
} from "@/domain/types";

const DAY = 24 * 60 * 60 * 1000;
const STRONG_KINDS = new Set<EvidenceEvent["kind"]>([
  "fix",
  "transfer",
  "project",
  "assessment",
]);
const CODING_KINDS = new Set<EvidenceEvent["kind"]>([
  "fix",
  "transfer",
  "project",
  "assessment",
]);
const VERIFIED_CODING_EVALUATORS = new Set([
  "tests",
  "exact-output",
  "compilation",
]);

export function isIndependentSuccess(event: EvidenceEvent): boolean {
  return (
    event.passed &&
    event.hints === 0 &&
    !event.revealed &&
    event.kind !== "self-rating" &&
    event.kind !== "exposure" &&
    event.evaluator !== "rubric" &&
    event.evaluator !== "expected-error"
  );
}

function copyState(state: UserState): UserState {
  const steps = Object.fromEntries(
    Object.entries(state.steps).map(([key, progress]) => {
      const attempts = progress.attempts.map((attempt) => ({
        ...attempt,
        result: attempt.result
          ? {
              ...attempt.result,
              diagnostics: attempt.result.diagnostics.map((diagnostic) => ({
                ...diagnostic,
              })),
              tests: attempt.result.tests
                ? { ...attempt.result.tests }
                : undefined,
            }
          : undefined,
      }));
      return [
        key,
        { ...progress, attempts, rubricChecks: [...progress.rubricChecks] },
      ];
    }),
  );
  return {
    ...state,
    onboarding: { ...state.onboarding },
    diagnostic: {
      ...state.diagnostic,
      answers: { ...state.diagnostic.answers },
    },
    resume: { ...state.resume },
    steps,
    events: state.events.map((event) => ({
      ...event,
      conceptIds: [...event.conceptIds],
    })),
    mastery: Object.fromEntries(
      Object.entries(state.mastery).map(([key, mastery]) => [
        key,
        { ...mastery },
      ]),
    ),
    review: state.review.map((item) => ({ ...item })),
    notes: { ...state.notes },
    bookmarks: [...state.bookmarks],
    ratings: state.ratings.map((rating) => ({ ...rating })),
    settings: { ...state.settings },
  };
}

function strongEvidence(
  events: EvidenceEvent[],
  conceptId: string,
): EvidenceEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (
      !event.conceptIds.includes(conceptId) ||
      !event.passed ||
      event.hints !== 0 ||
      event.revealed ||
      event.kind === "self-rating" ||
      event.evaluator === "rubric"
    )
      return false;
    if (event.evaluator === "expected-error") return false;
    if (!(event.gate === true || STRONG_KINDS.has(event.kind))) return false;
    const key = `${event.lessonId}:${event.stepId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasVerifiedCodingEvidence(
  events: EvidenceEvent[],
  conceptId: string,
): boolean {
  return events.some((event) => {
    if (
      !event.conceptIds.includes(conceptId) ||
      !event.passed ||
      event.hints !== 0 ||
      event.revealed ||
      event.kind === "self-rating" ||
      event.evaluator === "expected-error" ||
      event.evaluator === "rubric" ||
      !CODING_KINDS.has(event.kind)
    )
      return false;
    return (
      (event.evaluator !== undefined &&
        VERIFIED_CODING_EVALUATORS.has(event.evaluator)) ||
      (event.evaluator === undefined &&
        (event.kind === "fix" || event.kind === "project"))
    );
  });
}

function passedEvidence(
  events: EvidenceEvent[],
  conceptId: string,
): EvidenceEvent[] {
  return events.filter(
    (event) =>
      event.conceptIds.includes(conceptId) &&
      event.passed &&
      event.kind !== "self-rating" &&
      event.evaluator !== "rubric" &&
      event.evaluator !== "expected-error",
  );
}

function hasVerifiedRetention(
  events: EvidenceEvent[],
  conceptId: string,
  ratings: UserState["ratings"],
): boolean {
  return events.some((candidate) => {
    if (
      !candidate.conceptIds.includes(conceptId) ||
      !candidate.passed ||
      candidate.kind !== "recall" ||
      candidate.delayed !== true ||
      candidate.hints !== 0 ||
      candidate.revealed
    )
      return false;
    const prior = events.filter((event) => event.at < candidate.at);
    const priorStrong = strongEvidence(prior, conceptId);
    const latestPriorEvent = prior
      .filter((event) => event.conceptIds.includes(conceptId))
      .reduce<number | undefined>(
        (latest, event) =>
          latest === undefined ? event.at : Math.max(latest, event.at),
        undefined,
      );
    const latestPriorRating = ratings
      .filter(
        (rating) => rating.conceptId === conceptId && rating.at < candidate.at,
      )
      .reduce<number | undefined>(
        (latest, rating) =>
          latest === undefined ? rating.at : Math.max(latest, rating.at),
        undefined,
      );
    const latestPriorEvidence = [latestPriorEvent, latestPriorRating].reduce<
      number | undefined
    >(
      (latest, at) =>
        at === undefined
          ? latest
          : latest === undefined
            ? at
            : Math.max(latest, at),
      undefined,
    );
    return (
      priorStrong.length >= 2 &&
      hasVerifiedCodingEvidence(prior, conceptId) &&
      latestPriorEvidence !== undefined &&
      candidate.at - latestPriorEvidence > DAY
    );
  });
}

function deriveMastery(
  events: EvidenceEvent[],
  conceptId: string,
  previous: MasteryLevel | undefined,
  ratings: UserState["ratings"],
): { level: MasteryLevel; reason: string } {
  const passed = passedEvidence(events, conceptId);
  const strong = strongEvidence(events, conceptId);
  if (hasVerifiedRetention(events, conceptId, ratings))
    return {
      level: "retained",
      reason: "Zweryfikowane, samodzielne przypomnienie po ponad 24 godzinach.",
    };
  if (strong.length >= 2 && hasVerifiedCodingEvidence(events, conceptId))
    return {
      level: "understood",
      reason:
        "Dwa różne, samodzielne zadania bramkujące lub transferowe zakończone powodzeniem.",
    };
  if (strong.length > 0)
    return {
      level: "practiced",
      reason:
        "Samodzielne zadanie bramkujące lub transferowe zakończone powodzeniem.",
    };
  if (passed.some((event) => event.kind !== "exposure"))
    return { level: "exposed", reason: "Zweryfikowane ćwiczenie zakończone." };
  if (passed.length > 0)
    return {
      level: "exposed",
      reason: "Kontakt z przykładem; samodzielność potwierdzą kolejne zadania.",
    };
  return {
    level: previous ?? "new",
    reason: previous
      ? "Dotychczasowy poziom zachowany po nieudanej próbie."
      : "Brak zweryfikowanych dowodów.",
  };
}

function queueFailure(
  review: ReviewItem[],
  conceptId: string,
  at: number,
): void {
  const existing = review.find((item) => item.conceptId === conceptId);
  if (existing) {
    existing.dueAt = Math.min(existing.dueAt, at);
    existing.reason = "Nieudany dowód dodany do powtórki.";
    return;
  }
  review.push({
    conceptId,
    dueAt: at,
    intervalDays: 0,
    attempts: 0,
    reason: "Nieudany dowód dodany do powtórki.",
  });
}

function queueSuccess(
  review: ReviewItem[],
  conceptId: string,
  event: EvidenceEvent,
): void {
  const existing = review.find((item) => item.conceptId === conceptId);
  if (!existing) {
    review.push({
      conceptId,
      dueAt: event.at + DAY,
      intervalDays: 1,
      attempts: 0,
      reason: "Pierwsza powtórka zaplanowana za około 24 godziny.",
    });
    return;
  }
  const verifiedRecall =
    event.kind === "recall" &&
    event.delayed === true &&
    event.hints === 0 &&
    !event.revealed;
  if (verifiedRecall) {
    existing.intervalDays = Math.max(1, existing.intervalDays * 2);
    existing.dueAt = event.at + existing.intervalDays * DAY;
    existing.reason =
      "Samodzielne odtworzenie zaliczone; następna powtórka odsunięta.";
    return;
  }
  if (existing.dueAt <= event.at) {
    existing.intervalDays = Math.max(1, existing.intervalDays);
    existing.dueAt = event.at + existing.intervalDays * DAY;
    existing.reason =
      "Powtórka zaliczona; kolejna zaplanowana za około 24 godziny.";
  }
}

export function recordEvidence(
  state: UserState,
  event: EvidenceEvent,
): UserState {
  if (state.events.some((existing) => existing.id === event.id)) return state;
  const next = copyState(state);
  next.events.push({ ...event, conceptIds: [...event.conceptIds] });
  for (const conceptId of event.conceptIds) {
    if (
      !event.passed &&
      event.kind !== "self-rating" &&
      event.evaluator !== "rubric"
    )
      queueFailure(next.review, conceptId, event.at);
    else if (
      event.kind !== "self-rating" &&
      event.kind !== "exposure" &&
      event.evaluator !== "expected-error" &&
      event.evaluator !== "rubric"
    )
      queueSuccess(next.review, conceptId, event);
  }
  for (const conceptId of event.conceptIds) {
    const previous = state.mastery[conceptId]?.level;
    const derived = deriveMastery(
      next.events,
      conceptId,
      previous,
      next.ratings,
    );
    next.mastery[conceptId] = { ...derived, updatedAt: event.at };
  }
  next.updatedAt = Math.max(next.updatedAt, event.at);
  return next;
}

export function recordLessonExposure(
  state: UserState,
  exposure: LessonExposure,
): UserState {
  const revealed = exposure.revealed === true;
  return recordEvidence(state, {
    id: `exposure:${exposure.lessonId}:${exposure.stepId}:${exposure.at}:${revealed ? "revealed" : "opened"}`,
    conceptIds: exposure.conceptIds,
    lessonId: exposure.lessonId,
    stepId: exposure.stepId,
    kind: "exposure",
    passed: true,
    hints: 0,
    revealed,
    at: exposure.at,
    gate: false,
  });
}

function intervalFor(
  rating: "again" | "hard" | "good" | "easy",
  previous: number,
): number {
  switch (rating) {
    case "again":
      return 0;
    case "hard":
      return Math.max(1, previous * 1.2);
    case "good":
      return Math.max(1, previous ? previous * 2 : 1);
    case "easy":
      return Math.max(4, previous ? previous * 3 : 4);
  }
}

export function rateReview(
  state: UserState,
  conceptId: string,
  rating: "again" | "hard" | "good" | "easy",
  now: number,
): UserState {
  const next = copyState(state);
  const item =
    next.review.find((candidate) => candidate.conceptId === conceptId) ??
    (() => {
      const created: ReviewItem = {
        conceptId,
        dueAt: now,
        intervalDays: 0,
        attempts: 0,
        reason: "Powtórka zaplanowana.",
      };
      next.review.push(created);
      return created;
    })();
  const intervalDays = intervalFor(rating, item.intervalDays);
  item.intervalDays = intervalDays;
  item.attempts += 1;
  item.lastReviewedAt = now;
  item.dueAt = now + intervalDays * DAY;
  item.reason =
    rating === "again"
      ? "Jeszcze raz: powtórka jest wymagana teraz."
      : `Ocena „${rating}”: powtórka zaplanowana według oceny.`;
  next.ratings.push({ conceptId, rating, at: now });
  next.updatedAt = Math.max(next.updatedAt, now);
  return next;
}

export function dueReviews(state: UserState, now: number): ReviewItem[] {
  return state.review
    .filter((item) => item.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || a.conceptId.localeCompare(b.conceptId))
    .map((item) => ({ ...item }));
}

export function moduleGate(
  state: UserState,
  lessons: Lesson[],
  courseModule?: CourseModule,
): { passed: boolean; criteria: { label: string; passed: boolean }[] } {
  if (courseModule?.gateCriteria) {
    const criteria = courseModule.gateCriteria.map((criterion) => ({
      label: criterion.label,
      passed:
        criterion.taskRefs.some((taskRef) =>
          state.events.some(
            (event) =>
              event.lessonId === taskRef.lessonId &&
              event.stepId === taskRef.stepId &&
              isIndependentSuccess(event),
          ),
        ) &&
        (criterion.supplementaryStepRefs === undefined ||
          criterion.supplementaryStepRefs.length === 0 ||
          criterion.supplementaryStepRefs.some((stepRef) =>
            state.events.some(
              (event) =>
                event.lessonId === stepRef.lessonId &&
                event.stepId === stepRef.stepId &&
                event.passed &&
                event.kind === "self-rating" &&
                event.evaluator === "rubric",
            ),
          )),
    }));
    return {
      criteria,
      passed:
        criteria.length > 0 && criteria.every((criterion) => criterion.passed),
    };
  }
  const criteria: { label: string; passed: boolean }[] = [];
  for (const lesson of lessons)
    for (const step of lesson.steps) {
      if (!step.evidenceGate || step.evaluator?.kind === "rubric") continue;
      const passed = state.events.some(
        (event) =>
          event.lessonId === lesson.id &&
          event.stepId === step.id &&
          isIndependentSuccess(event),
      );
      criteria.push({ label: `${lesson.title}: ${step.title}`, passed });
    }
  return {
    criteria,
    passed:
      criteria.length > 0 && criteria.every((criterion) => criterion.passed),
  };
}
