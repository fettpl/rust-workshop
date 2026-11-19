import type {
  Concept,
  CourseModule,
  EvidenceEvent,
  Lesson,
  LessonExposure,
  MasteryLevel,
  MasteryRecord,
  ModuleGateCriterion,
  ModuleGateTaskRef,
  StepEvidenceDefinition,
  ReviewItem,
  UserState,
} from "@/domain/types";

export type EvidenceArtifact = "rust-code" | "manifest";

export interface EvidencePolicy {
  artifactForConcept(conceptId: string): EvidenceArtifact;
  calibrationForConcept?(
    conceptId: string,
  ): { version: number; minimumCodingTasks: number } | undefined;
  definitionForEvent?(event: EvidenceEvent): StepEvidenceDefinition | undefined;
  /** Authored identity only; never upgrades historical evidence into current proof. */
  definitionForTask?(
    lessonId: string,
    stepId: string,
  ): StepEvidenceDefinition | undefined;
}

const DEFAULT_EVIDENCE_POLICY: EvidencePolicy = {
  artifactForConcept: () => "rust-code",
};

export function evidencePolicyForConcepts(
  concepts: readonly Concept[],
): EvidencePolicy {
  const artifacts = new Map(
    concepts.map((concept) => [
      concept.id,
      concept.evidenceArtifact ?? ("rust-code" as const),
    ]),
  );
  return {
    artifactForConcept: (conceptId) => artifacts.get(conceptId) ?? "rust-code",
    calibrationForConcept: (conceptId) =>
      concepts.find((concept) => concept.id === conceptId)?.evidenceCalibration,
  };
}

export const DAY = 24 * 60 * 60 * 1000;
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
const NEUTRAL_EVALUATORS = new Set(["answer", "choice", "ordering", "rubric"]);

function eventMatchesConceptArtifact(
  event: EvidenceEvent,
  conceptId: string,
  policy: EvidencePolicy,
): boolean {
  // Exposure and answer-only evaluators are neutral contact with a lesson or
  // reference. They remain useful for every concept, including manifest ones,
  // while verified manifest evidence still requires manifest-contract.
  if (event.kind === "exposure") return true;
  if (!hasCurrentAttribution(event, policy)) return false;
  const expected = policy.artifactForConcept(conceptId);
  if (NEUTRAL_EVALUATORS.has(event.evaluator ?? "")) return true;
  const actual: EvidenceArtifact =
    event.evaluator === "manifest-contract" ? "manifest" : "rust-code";
  return actual === expected;
}

export function isIndependentSuccess(
  event: EvidenceEvent,
  conceptId?: string,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): boolean {
  if (
    conceptId &&
    (!event.conceptIds.includes(conceptId) ||
      !eventMatchesConceptArtifact(event, conceptId, policy))
  )
    return false;
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

function matchesDefinition(
  event: EvidenceEvent,
  definition: StepEvidenceDefinition | undefined,
): definition is StepEvidenceDefinition {
  return (
    definition !== undefined &&
    Number.isInteger(definition.version) &&
    definition.version > 0 &&
    event.evidenceVersion === definition.version &&
    event.conceptIds.length === definition.conceptIds.length &&
    new Set(event.conceptIds).size === event.conceptIds.length &&
    event.conceptIds.every((id) => definition.conceptIds.includes(id))
  );
}

function hasCurrentAttribution(
  event: EvidenceEvent,
  policy: EvidencePolicy,
): boolean {
  const calibratedClaim = event.conceptIds.some((id) =>
    policy.calibrationForConcept?.(id),
  );
  if (
    !calibratedClaim &&
    !(policy.definitionForEvent && event.evidenceVersion !== undefined)
  )
    return true;
  const definition = policy.definitionForEvent?.(event);
  return (
    matchesDefinition(event, definition) &&
    event.conceptIds.every((id) => {
      const calibration = policy.calibrationForConcept?.(id);
      return !calibration || definition.version === calibration.version;
    })
  );
}

function currentDefinition(
  event: EvidenceEvent,
  conceptId: string,
  policy: EvidencePolicy,
): StepEvidenceDefinition | undefined {
  const calibration = policy.calibrationForConcept?.(conceptId);
  const definition = policy.definitionForEvent?.(event);
  return calibration &&
    matchesDefinition(event, definition) &&
    definition.version === calibration.version &&
    definition.conceptIds.includes(conceptId) &&
    eventMatchesConceptArtifact(event, conceptId, policy)
    ? definition
    : undefined;
}

function eventsBeforeSubmission(
  events: readonly EvidenceEvent[],
  index: number,
): EvidenceEvent[] {
  const at = events[index].at;
  // Import preserves array order. Use it only to order events at the same time.
  return events.filter(
    (entry, position) => entry.at < at || (entry.at === at && position < index),
  );
}

function hasTaskAssistance(
  candidate: Pick<EvidenceEvent, "lessonId" | "stepId" | "at">,
  definition: StepEvidenceDefinition,
  prior: readonly EvidenceEvent[],
  definitionForTask?: EvidencePolicy["definitionForTask"],
): boolean {
  return prior.some((event) => {
    if (event.at > candidate.at || (event.hints === 0 && !event.revealed))
      return false;
    if (
      event.lessonId === candidate.lessonId &&
      event.stepId === candidate.stepId
    )
      return true;
    const historical = definitionForTask?.(event.lessonId, event.stepId);
    return (
      !!definition.codingTaskId &&
      historical?.codingTaskId === definition.codingTaskId
    );
  });
}

// One qualification boundary for selectors, competency counts and counted gates.
// A recall may use an executable contract, but cannot add a primary task family.
function codingTaskId(
  event: EvidenceEvent,
  definition: StepEvidenceDefinition | undefined,
  prior: readonly EvidenceEvent[] = [],
  definitionForTask?: EvidencePolicy["definitionForTask"],
): string | undefined {
  return matchesDefinition(event, definition) &&
    definition.conceptIds.length > 0 &&
    definition.codingTaskId &&
    isIndependentSuccess(event) &&
    event.evaluator === "tests" &&
    CODING_KINDS.has(event.kind) &&
    !hasTaskAssistance(event, definition, prior, definitionForTask)
    ? definition.codingTaskId
    : undefined;
}

function authoredEvidenceKind(
  step: Lesson["steps"][number] | undefined,
): EvidenceEvent["kind"] | undefined {
  return step?.evaluator?.kind === "rubric"
    ? "self-rating"
    : step?.evidenceKind;
}

function definitionForStep(
  event: EvidenceEvent,
  step: Lesson["steps"][number] | undefined,
): StepEvidenceDefinition | undefined {
  const kind = authoredEvidenceKind(step);
  return step && event.kind === kind && event.evaluator === step.evaluator?.kind
    ? step.evidence
    : undefined;
}

function equivalentSolutionPeers(
  lessons: readonly Lesson[],
  ref: ModuleGateTaskRef,
): ModuleGateTaskRef[] {
  const lesson = lessons.find((candidate) => candidate.id === ref.lessonId);
  const step = lesson?.steps.find((candidate) => candidate.id === ref.stepId);
  if (!step || !VERIFIED_CODING_EVALUATORS.has(step.evaluator?.kind ?? ""))
    return [];
  const solution = step.solution?.trim();
  return lessons.flatMap((source) =>
    source.steps.flatMap((candidate) => {
      if (source.id === ref.lessonId && candidate.id === ref.stepId) return [];
      const suppliesSolution = candidate.suppliedSolutions?.solution?.some(
        (target) =>
          target.lessonId === ref.lessonId && target.stepId === ref.stepId,
      );
      const sameImplementation =
        source.moduleId === lesson?.moduleId &&
        !!solution &&
        candidate.solution?.trim() === solution &&
        VERIFIED_CODING_EVALUATORS.has(candidate.evaluator?.kind ?? "");
      return suppliesSolution || sameImplementation
        ? [{ lessonId: source.id, stepId: candidate.id }]
        : [];
    }),
  );
}

function hasRevealedRef(
  state: UserState,
  ref: ModuleGateTaskRef,
  at: number,
): boolean {
  return (
    (at === Infinity &&
      state.steps[`${ref.lessonId}:${ref.stepId}`]?.revealed === true) ||
    state.events.some(
      (event) =>
        eventForRef(event, ref) &&
        event.at <= at &&
        event.revealed &&
        // Legacy exposure.revealed also represented hint clicks. Only an actual
        // submission or an explicitly supplied implementation discloses a peer.
        (event.kind !== "exposure" ||
          event.id.startsWith("supplied-solution:")),
    )
  );
}

/** Exact or explicitly authored implementations share solution reveals, not hints.
 * Finite timestamps protect earlier credit from untimed current progress flags.
 */
export function hasEquivalentSolutionReveal(
  state: UserState,
  ref: ModuleGateTaskRef,
  lessons: readonly Lesson[],
  at = Infinity,
): boolean {
  return equivalentSolutionPeers(lessons, ref).some((peer) =>
    hasRevealedRef(state, peer, at),
  );
}

/** A component can have been shown directly or inside another authored solution. */
export function hasComponentSolutionReveal(
  state: UserState,
  ref: ModuleGateTaskRef,
  lessons: readonly Lesson[],
  at = Infinity,
): boolean {
  return (
    hasRevealedRef(state, ref, at) ||
    hasEquivalentSolutionReveal(state, ref, lessons, at)
  );
}

function hasCriterionComponentAssistance(
  state: UserState,
  criterion: ModuleGateCriterion,
  ref: ModuleGateTaskRef,
  lessons: readonly Lesson[],
  at = Infinity,
): boolean {
  const supplied = stepForRef(lessons, ref)?.suppliedSolutions;
  return [...(supplied?.code ?? []), ...(supplied?.solution ?? [])].some(
    (component) =>
      criterion.taskRefs.some(
        (target) =>
          target.lessonId === component.lessonId &&
          target.stepId === component.stepId,
      ) && hasComponentSolutionReveal(state, component, lessons, at),
  );
}

function isIndependentTaskSuccess(
  event: EvidenceEvent,
  step: Lesson["steps"][number] | undefined,
  allowLegacyOrdinaryV1 = false,
  history: readonly EvidenceEvent[] = [],
): boolean {
  if (
    !step ||
    !isIndependentSuccess(event) ||
    event.kind !== authoredEvidenceKind(step) ||
    (event.evaluator !== undefined &&
      event.evaluator !== step.evaluator?.kind) ||
    history.some(
      (prior) =>
        eventForRef(prior, event) &&
        prior.at <= event.at &&
        (prior.hints > 0 || prior.revealed),
    )
  )
    return false;
  const legacyOrdinaryV1 =
    allowLegacyOrdinaryV1 &&
    step?.evidence?.version === 1 &&
    step.evidence.codingTaskId === undefined &&
    event.evidenceVersion === undefined;
  if (
    step?.evidence &&
    !legacyOrdinaryV1 &&
    !matchesDefinition(event, definitionForStep(event, step))
  )
    return false;
  if (step?.evaluator?.kind === "manifest-contract")
    return event.evaluator === "manifest-contract";
  return event.evaluator !== "manifest-contract";
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
  policy: EvidencePolicy,
): EvidenceEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (
      !event.conceptIds.includes(conceptId) ||
      !eventMatchesConceptArtifact(event, conceptId, policy) ||
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
  policy: EvidencePolicy,
): boolean {
  const expected = policy.artifactForConcept(conceptId);
  return events.some((event) => {
    if (
      !event.conceptIds.includes(conceptId) ||
      !eventMatchesConceptArtifact(event, conceptId, policy) ||
      !event.passed ||
      event.hints !== 0 ||
      event.revealed ||
      event.kind === "self-rating" ||
      event.evaluator === "expected-error" ||
      event.evaluator === "rubric" ||
      !CODING_KINDS.has(event.kind)
    )
      return false;
    if (expected === "manifest") return event.evaluator === "manifest-contract";
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
  policy: EvidencePolicy,
): EvidenceEvent[] {
  return events.filter(
    (event) =>
      event.conceptIds.includes(conceptId) &&
      eventMatchesConceptArtifact(event, conceptId, policy) &&
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
  policy: EvidencePolicy,
): boolean {
  return events.some((candidate) => {
    if (
      !candidate.conceptIds.includes(conceptId) ||
      !eventMatchesConceptArtifact(candidate, conceptId, policy) ||
      !candidate.passed ||
      candidate.kind !== "recall" ||
      candidate.delayed !== true ||
      candidate.hints !== 0 ||
      candidate.revealed
    )
      return false;
    const prior = events.filter((event) => event.at < candidate.at);
    const priorStrong = strongEvidence(prior, conceptId, policy);
    const latestPriorEvent = prior
      .filter(
        (event) =>
          event.conceptIds.includes(conceptId) &&
          eventMatchesConceptArtifact(event, conceptId, policy),
      )
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
      hasVerifiedCodingEvidence(prior, conceptId, policy) &&
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
  policy: EvidencePolicy,
): { level: MasteryLevel; reason: string } {
  const passed = passedEvidence(events, conceptId, policy);
  const strong = strongEvidence(events, conceptId, policy);
  if (hasVerifiedRetention(events, conceptId, ratings, policy))
    return {
      level: "retained",
      reason: "Zweryfikowane, samodzielne przypomnienie po ponad 24 godzinach.",
    };
  if (
    strong.length >= 2 &&
    hasVerifiedCodingEvidence(events, conceptId, policy)
  )
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

export function independentCodingTaskIdForEvent(
  state: UserState,
  eventIndex: number,
  conceptId: string,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): string | undefined {
  const event = state.events[eventIndex];
  if (!event) return undefined;
  if (!policy.calibrationForConcept?.(conceptId)) {
    return hasVerifiedCodingEvidence([event], conceptId, policy)
      ? `${event.lessonId}:${event.stepId}`
      : undefined;
  }
  const definition = currentDefinition(event, conceptId, policy);
  if (!definition) return undefined;
  return codingTaskId(
    event,
    definition,
    eventsBeforeSubmission(state.events, eventIndex),
    policy.definitionForTask,
  );
}

export function independentCodingTaskIds(
  state: UserState,
  conceptId: string,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): string[] {
  return [
    ...new Set(
      state.events
        .map((_, index) =>
          independentCodingTaskIdForEvent(state, index, conceptId, policy),
        )
        .filter((id): id is string => id !== undefined),
    ),
  ];
}

export function hasQuietInterval(
  state: UserState,
  conceptId: string,
  at: number,
): boolean {
  const contact = [
    ...state.events
      .filter((event) => event.conceptIds.includes(conceptId) && event.at <= at)
      .map((event) => event.at),
    ...state.ratings
      .filter((rating) => rating.conceptId === conceptId && rating.at <= at)
      .map((rating) => rating.at),
  ];
  return contact.length > 0 && at - Math.max(...contact) > DAY;
}

export function delayedReviewEligibility(
  state: UserState,
  conceptId: string,
  now: number,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): boolean {
  const calibration = policy.calibrationForConcept?.(conceptId);
  const due = state.review.some(
    (item) => item.conceptId === conceptId && item.dueAt <= now,
  );
  return Boolean(
    calibration &&
    due &&
    independentCodingTaskIds(state, conceptId, policy).length >=
      calibration.minimumCodingTasks &&
    hasQuietInterval(state, conceptId, now),
  );
}

function isCalibratedRecall(
  state: UserState,
  index: number,
  conceptId: string,
  policy: EvidencePolicy,
  required: number,
): boolean {
  const candidate = state.events[index];
  const definition = currentDefinition(candidate, conceptId, policy);
  if (
    !definition?.codingTaskId ||
    candidate.evaluator !== "tests" ||
    candidate.kind !== "recall" ||
    candidate.delayed !== true ||
    !isIndependentSuccess(candidate) ||
    hasTaskAssistance(
      candidate,
      { ...definition, codingTaskId: undefined },
      state.events.slice(0, index),
    )
  )
    return false;
  const prior = state.events
    .slice(0, index)
    .filter((event) => event.at <= candidate.at);
  if (
    independentCodingTaskIds({ ...state, events: prior }, conceptId, policy)
      .length < required
  )
    return false;
  // Include legacy and neutral contact, and preceding same-millisecond events.
  // Queue dates and cached timestamps are not evidence of learner contact.
  return hasQuietInterval({ ...state, events: prior }, conceptId, candidate.at);
}

function hasCalibratedRetention(
  state: UserState,
  conceptId: string,
  policy: EvidencePolicy,
  required: number,
): boolean {
  return state.events.some((_, index) =>
    isCalibratedRecall(state, index, conceptId, policy, required),
  );
}

export function deriveConceptMastery(
  state: UserState,
  conceptId: string,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): MasteryRecord {
  const calibration = policy.calibrationForConcept?.(conceptId);
  if (!calibration) {
    return {
      ...deriveMastery(
        state.events,
        conceptId,
        state.mastery[conceptId]?.level,
        state.ratings,
        policy,
      ),
      updatedAt: state.mastery[conceptId]?.updatedAt ?? 0,
    };
  }
  const relevant = state.events.filter((event) =>
    event.conceptIds.includes(conceptId),
  );
  const updatedAt = Math.max(
    0,
    ...relevant.map((event) => event.at),
    ...state.ratings
      .filter((rating) => rating.conceptId === conceptId)
      .map((rating) => rating.at),
  );
  const tasks = independentCodingTaskIds(state, conceptId, policy);
  if (
    hasCalibratedRetention(
      state,
      conceptId,
      policy,
      calibration.minimumCodingTasks,
    )
  )
    return {
      level: "retained",
      reason:
        "Samodzielne rozwiązanie kodowe odtworzone po ponad 24 godzinach.",
      updatedAt,
    };
  if (tasks.length >= calibration.minimumCodingTasks)
    return {
      level: "understood",
      reason:
        calibration.minimumCodingTasks === 1 && tasks.length === 1
          ? "Potwierdzone w jednym samodzielnym zadaniu kodowym bez podpowiedzi."
          : "Potwierdzone w różnych zadaniach kodowych bez podpowiedzi.",
      updatedAt,
    };
  const current = relevant.filter((event) =>
    currentDefinition(event, conceptId, policy),
  );
  if (tasks.length > 0 || strongEvidence(current, conceptId, policy).length > 0)
    return {
      level: "practiced",
      reason:
        "Praktyka wymaga jeszcze różnych niezależnych rozwiązań kodowych.",
      updatedAt,
    };
  // Legacy history establishes contact, never current coding confirmation.
  if (
    relevant.some(
      (event) =>
        event.kind === "exposure" || event.evidenceVersion === undefined,
    ) ||
    passedEvidence(current, conceptId, policy).length > 0 ||
    state.ratings.some((rating) => rating.conceptId === conceptId)
  )
    return {
      level: "exposed",
      reason:
        "Historia kontaktu pozostaje zapisana; bieżące potwierdzenie wymaga nowych dowodów kodowych.",
      updatedAt,
    };
  return {
    level: "new",
    reason: "Brak bieżących zweryfikowanych dowodów.",
    updatedAt,
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
  verifiedRecallOverride?: boolean,
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
    verifiedRecallOverride ??
    (event.kind === "recall" &&
      event.delayed === true &&
      event.hints === 0 &&
      !event.revealed);
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
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
): UserState {
  if (state.events.some((existing) => existing.id === event.id)) return state;
  const next = copyState(state);
  next.events.push({ ...event, conceptIds: [...event.conceptIds] });
  for (const conceptId of event.conceptIds) {
    if (!eventMatchesConceptArtifact(event, conceptId, policy)) continue;
    const calibration = policy.calibrationForConcept?.(conceptId);
    if (
      calibration &&
      event.kind !== "exposure" &&
      !currentDefinition(event, conceptId, policy)
    )
      continue;
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
      queueSuccess(
        next.review,
        conceptId,
        event,
        calibration
          ? isCalibratedRecall(
              next,
              next.events.length - 1,
              conceptId,
              policy,
              calibration.minimumCodingTasks,
            )
          : undefined,
      );
  }
  for (const conceptId of event.conceptIds) {
    const derived = deriveConceptMastery(next, conceptId, policy);
    next.mastery[conceptId] = { ...derived, updatedAt: event.at };
  }
  next.updatedAt = Math.max(next.updatedAt, event.at);
  return next;
}

export function recordLessonExposure(
  state: UserState,
  exposure: LessonExposure,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
  source: "exposure" | "supplied-solution" = "exposure",
): UserState {
  const revealed = exposure.revealed === true;
  return recordEvidence(
    state,
    {
      id: `${source}:${exposure.lessonId}:${exposure.stepId}:${exposure.at}:${revealed ? "revealed" : "opened"}`,
      conceptIds: exposure.conceptIds,
      lessonId: exposure.lessonId,
      stepId: exposure.stepId,
      kind: "exposure",
      passed: true,
      hints: 0,
      revealed,
      at: exposure.at,
      gate: false,
    },
    policy,
  );
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

export type GateRecovery =
  | { status: "complete" }
  | { status: "available"; task: ModuleGateTaskRef }
  | { status: "exhausted" };

function stepForRef(lessons: readonly Lesson[], ref: ModuleGateTaskRef) {
  return lessons
    .find((lesson) => lesson.id === ref.lessonId)
    ?.steps.find((step) => step.id === ref.stepId);
}

function eventForRef(event: EvidenceEvent, ref: ModuleGateTaskRef): boolean {
  return event.lessonId === ref.lessonId && event.stepId === ref.stepId;
}

function supplementaryPassed(
  state: UserState,
  criterion: ModuleGateCriterion,
): boolean {
  return (
    !criterion.supplementaryStepRefs?.length ||
    criterion.supplementaryStepRefs.some((ref) =>
      state.events.some(
        (event) =>
          eventForRef(event, ref) &&
          event.passed &&
          event.kind === "self-rating" &&
          event.evaluator === "rubric",
      ),
    )
  );
}

function creditedGateTasks(
  state: UserState,
  criterion: ModuleGateCriterion,
  lessons: readonly Lesson[],
  definitionForTask?: EvidencePolicy["definitionForTask"],
): Set<string> {
  const ids = new Set<string>();
  const resolveDefinition =
    definitionForTask ??
    ((lessonId, stepId) => stepForRef(lessons, { lessonId, stepId })?.evidence);
  for (const ref of criterion.taskRefs) {
    const step = stepForRef(lessons, ref);
    for (const [index, event] of state.events.entries()) {
      if (!eventForRef(event, ref)) continue;
      const history = eventsBeforeSubmission(state.events, index);
      if (criterion.requiredIndependentCodingTasks !== undefined) {
        const id = codingTaskId(
          event,
          definitionForStep(event, step),
          history,
          resolveDefinition,
        );
        if (id) ids.add(id);
        continue;
      }
      const prior = { ...state, events: history };
      if (
        isIndependentTaskSuccess(event, step, true, history) &&
        !(
          step?.evidence?.codingTaskId &&
          CODING_KINDS.has(event.kind) &&
          hasTaskAssistance(event, step.evidence, history, resolveDefinition)
        ) &&
        !hasEquivalentSolutionReveal(prior, ref, lessons, event.at) &&
        !hasCriterionComponentAssistance(
          prior,
          criterion,
          ref,
          lessons,
          event.at,
        )
      ) {
        ids.add(`${ref.lessonId}:${ref.stepId}`);
      }
    }
  }
  return ids;
}

function familyHasSavedAssistance(
  state: UserState,
  codingTaskId: string,
  lessons: readonly Lesson[],
): boolean {
  return lessons.some((lesson) =>
    lesson.steps.some((step) => {
      if (step.evidence?.codingTaskId !== codingTaskId) return false;
      const progress = state.steps[`${lesson.id}:${step.id}`];
      return !!progress?.hints || progress?.revealed === true;
    }),
  );
}

export function gateRecovery(
  state: UserState,
  criterion: ModuleGateCriterion,
  lessons: readonly Lesson[],
  definitionForTask?: EvidencePolicy["definitionForTask"],
): GateRecovery {
  const credited = creditedGateTasks(
    state,
    criterion,
    lessons,
    definitionForTask,
  );
  const required = criterion.requiredIndependentCodingTasks ?? 1;
  if (credited.size >= required) {
    if (supplementaryPassed(state, criterion)) return { status: "complete" };
    return { status: "available", task: criterion.supplementaryStepRefs![0] };
  }
  const eligible = criterion.taskRefs.filter((ref) => {
    const progress = state.steps[`${ref.lessonId}:${ref.stepId}`];
    if (
      progress?.hints ||
      progress?.revealed ||
      hasEquivalentSolutionReveal(state, ref, lessons) ||
      (criterion.requiredIndependentCodingTasks === undefined &&
        hasCriterionComponentAssistance(state, criterion, ref, lessons)) ||
      state.events.some(
        (event) =>
          eventForRef(event, ref) && (event.hints > 0 || event.revealed),
      )
    )
      return false;
    const step = stepForRef(lessons, ref);
    const family = step?.evidence?.codingTaskId;
    if (step?.evidence && family && CODING_KINDS.has(step.evidenceKind)) {
      if (
        familyHasSavedAssistance(state, family, lessons) ||
        hasTaskAssistance(
          { ...ref, at: Infinity },
          step.evidence,
          state.events,
          definitionForTask ??
            ((lessonId, stepId) =>
              stepForRef(lessons, { lessonId, stepId })?.evidence),
        )
      )
        return false;
    }
    return (
      criterion.requiredIndependentCodingTasks === undefined ||
      (step?.evaluator?.kind === "tests" &&
        !!family &&
        !!step.evidence?.conceptIds.length &&
        !credited.has(family))
    );
  });
  // Counted families can be retried even when an older draft is marked complete.
  const task =
    criterion.requiredIndependentCodingTasks !== undefined
      ? eligible[0]
      : (eligible.find(
          (ref) => !state.steps[`${ref.lessonId}:${ref.stepId}`]?.completed,
        ) ?? eligible[0]);
  if (task) return { status: "available", task };
  return { status: "exhausted" };
}

export function moduleGate(
  state: UserState,
  lessons: Lesson[],
  courseModule?: CourseModule,
  definitionForTask?: EvidencePolicy["definitionForTask"],
): { passed: boolean; criteria: { label: string; passed: boolean }[] } {
  if (courseModule?.gateCriteria) {
    const criteria = courseModule.gateCriteria.map((criterion) => ({
      label: criterion.label,
      passed:
        creditedGateTasks(state, criterion, lessons, definitionForTask).size >=
          (criterion.requiredIndependentCodingTasks ?? 1) &&
        supplementaryPassed(state, criterion),
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
          isIndependentTaskSuccess(event, step, true, state.events) &&
          !hasEquivalentSolutionReveal(state, event, lessons, event.at),
      );
      criteria.push({ label: `${lesson.title}: ${step.title}`, passed });
    }
  return {
    criteria,
    passed:
      criteria.length > 0 && criteria.every((criterion) => criterion.passed),
  };
}
