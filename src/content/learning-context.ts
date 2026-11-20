import {
  dueReviews,
  recordEvidence,
  recordLessonExposure,
  evidencePolicyForConcepts,
  deriveConceptMastery,
  independentCodingTaskIds,
  hasEquivalentSolutionReveal,
  hasExternalSolutionHelp,
  hasRecordedSuppliedSolution,
  journalTaskAssistance,
  hasComponentSolutionReveal,
  isIndependentSuccess,
  delayedReviewEligibility,
  gateRecovery,
  moduleGate,
} from "@/engine/learning";
import {
  revealProjectPackageVariant,
  revealAuthoredStepSolutions,
  type PackageVariant,
} from "@/domain/project-package";
import type {
  CourseModule,
  EvidenceEvent,
  ModuleGateCriterion,
  LessonExposure,
  Lesson,
  LessonStep,
  ProjectPackage,
  ReviewSession,
  UserState,
} from "@/domain/types";
import { reviewEventStepId, reviewSessionKey } from "@/engine/review-session";
import { stepKey } from "@/persistence/state";
import { competencyProgress, nextGateTask } from "@/engine/progress";
import {
  concepts,
  delayedReviewExercises,
  lessons,
  reviewExerciseForId,
  reviewExercises,
  shortReviewExercises,
} from "./course";

export type ReviewExerciseResolution =
  | { status: "ready"; exerciseId: string; step: LessonStep }
  | { status: "unavailable"; reason: "unknown-id" | "wrong-concept" };

export type ReviewOrigin = "due" | "practice";
export type ReviewSelection = "short" | "extended";

/** Exact current source lookup; review UUIDs identify sessions, never task families. */
function currentStep(lessonId: string, stepId: string): LessonStep | undefined {
  if (lessonId === "review") {
    const separator = stepId.indexOf(":");
    if (separator <= 0 || separator === stepId.length - 1) return undefined;
    const prefix = stepId.slice(0, separator);
    const historical = Object.prototype.hasOwnProperty.call(
      reviewExercises,
      prefix,
    )
      ? reviewExercises[prefix]
      : undefined;
    return reviewExerciseForId(prefix) ?? historical;
  }
  return lessons
    .find((lesson) => lesson.id === lessonId)
    ?.steps.find((step) => step.id === stepId);
}
// These three v2 ordinary reviews previously recorded answer/recall events.
// Keep their contact attribution without rewriting history or granting coding proof.
const historicalAnswerReviewIds = new Map([
  ["stack-heap", "review-stack-heap"],
  ["scope-drop", "review-scope-drop"],
  ["function-ownership", "review-function-ownership"],
]);
function isHistoricalAnswerReview(
  event: EvidenceEvent,
  step: LessonStep | undefined,
): boolean {
  const conceptId = event.conceptIds[0];
  return (
    event.lessonId === "review" &&
    event.kind === "recall" &&
    event.evaluator === "answer" &&
    event.evidenceVersion === 2 &&
    event.gate !== true &&
    event.conceptIds.length === 1 &&
    historicalAnswerReviewIds.get(conceptId) === step?.id &&
    step === reviewExercises[conceptId] &&
    step?.evaluator?.kind === "rubric" &&
    step.evidenceKind === "self-rating" &&
    step.reviewPurpose === undefined &&
    step.evidence?.version === 2 &&
    step.evidence.codingTaskId === undefined
  );
}

export const courseEvidencePolicy = {
  disclosureLessons: lessons,
  reviewAttemptKey: (stepId: string) => {
    const exercise = currentStep("review", stepId);
    return exercise && exercise.id + stepId.slice(stepId.indexOf(":"));
  },
  ...evidencePolicyForConcepts(concepts),
  definitionForTask: (lessonId: string, stepId: string) =>
    currentStep(lessonId, stepId)?.evidence,
  definitionForEvent: (event: EvidenceEvent) => {
    const step = currentStep(event.lessonId, event.stepId);
    const definition = step?.evidence;
    if (
      step?.reviewPurpose === "practice-probe" &&
      (event.kind !== "exposure" || event.delayed !== false)
    )
      return undefined;
    if (
      !step ||
      !definition ||
      ((event.evaluator !== step.evaluator?.kind ||
        event.kind !==
          (step.evaluator?.kind === "rubric"
            ? "self-rating"
            : step.evidenceKind)) &&
        !isHistoricalAnswerReview(event, step)) ||
      event.evidenceVersion !== definition.version ||
      event.conceptIds.length !== definition.conceptIds.length ||
      new Set(event.conceptIds).size !== event.conceptIds.length ||
      !event.conceptIds.every((id) => definition.conceptIds.includes(id))
    )
      return undefined;
    return definition;
  },
};

const currentReviewConceptIds = new Set(concepts.map((concept) => concept.id));

/** Keep retired concepts in saved history while showing only actionable reviews. */
export function courseReviewQueue(state: UserState, now: number) {
  const review = state.review.filter((item) => currentReviewConceptIds.has(item.conceptId));
  return {
    due: dueReviews({ review }, now),
    upcoming: review.filter((item) => item.dueAt > now).sort((a, b) => a.dueAt - b.dueAt),
  };
}

export function reviewExerciseIdForSelection(
  conceptId: string,
  selection: ReviewSelection,
): string | undefined {
  const step =
    selection === "short"
      ? shortReviewExercises[conceptId]
      : reviewExercises[conceptId];
  return step?.id;
}

export function reviewPurposeForExercise(
  conceptId: string,
  exerciseId: string | undefined,
): "practice-probe" | "extended" | "neutral" {
  const step =
    exerciseId === undefined
      ? reviewExercises[conceptId]
      : reviewExerciseForId(exerciseId);
  if (step?.reviewPurpose === "practice-probe") return "practice-probe";
  if (
    shortReviewExercises[conceptId] !== undefined &&
    step?.id === reviewExercises[conceptId]?.id
  )
    return "extended";
  return "neutral";
}

export function resolveReviewExercise(
  conceptId: string,
  exerciseId?: string,
): ReviewExerciseResolution {
  const step =
    exerciseId === undefined
      ? Object.prototype.hasOwnProperty.call(reviewExercises, conceptId)
        ? reviewExercises[conceptId]
        : undefined
      : reviewExerciseForId(exerciseId);
  if (!step) return { status: "unavailable", reason: "unknown-id" };
  if (
    exerciseId !== undefined &&
    (step.evidence?.conceptIds.length !== 1 ||
      step.evidence.conceptIds[0] !== conceptId)
  )
    return { status: "unavailable", reason: "wrong-concept" };
  return {
    status: "ready",
    exerciseId: step.id,
    step,
  };
}

export function courseDelayedReviewEligibility(
  state: UserState,
  conceptId: string,
  now: number,
): boolean {
  return delayedReviewEligibility(state, conceptId, now, courseEvidencePolicy);
}

export function reviewExerciseIdForOrigin(
  state: UserState,
  conceptId: string,
  origin: ReviewOrigin,
  now: number,
  selection: ReviewSelection = "short",
): string | undefined {
  if (origin === "due" && courseDelayedReviewEligibility(state, conceptId, now))
    return delayedReviewExercises[conceptId]?.id;
  return reviewExerciseIdForSelection(conceptId, selection);
}

/** Submission metadata only: never stamps or rewrites saved history. */
export function evidenceForLessonStep(
  lesson: Lesson,
  step: LessonStep,
): Pick<EvidenceEvent, "conceptIds" | "evidenceVersion"> {
  return step.evidence
    ? {
        conceptIds: [...step.evidence.conceptIds],
        evidenceVersion: step.evidence.version,
      }
    : { conceptIds: [...lesson.conceptIds] };
}
/** Saved assistance affects only the newly submitted primary, never earlier raw evidence. */
export function assistanceForLessonStep(
  state: UserState,
  lesson: Lesson,
  step: LessonStep,
): Pick<EvidenceEvent, "hints" | "revealed"> {
  const current = state.steps[stepKey(lesson.id, step.id)];
  const ref = { lessonId: lesson.id, stepId: step.id };
  const family = ["fix", "transfer", "project", "assessment"].includes(step.evidenceKind)
    ? step.evidence?.codingTaskId
    : undefined;
  const flags = journalTaskAssistance(state.events, ref, {
    family,
    definitionForTask: (lessonId, stepId) =>
      lessonId === "review" ? undefined : currentStep(lessonId, stepId)?.evidence,
  });
  flags.hints = Math.max(flags.hints, current?.hints ?? 0);
  flags.revealed ||= Boolean(current?.revealed) ||
    hasRecordedSuppliedSolution(state.events, ref, lessons) ||
    hasEquivalentSolutionReveal(state, ref, lessons);
  if (!family) return flags;
  flags.revealed ||= hasExternalSolutionHelp(
    state,
    { lessonId: lesson.id, stepId: step.id },
    lessons,
  );
  for (const authoredLesson of lessons) {
    for (const authoredStep of authoredLesson.steps) {
      if (authoredStep.evidence?.codingTaskId !== family) continue;
      const saved = state.steps[stepKey(authoredLesson.id, authoredStep.id)];
      flags.hints = Math.max(flags.hints, saved?.hints ?? 0);
      flags.revealed ||= saved?.revealed ?? false;
    }
  }
  return flags;
}
export function assistanceForReviewSession(state: UserState, session: ReviewSession) {
  const current = state.steps[reviewSessionKey(session.sessionId)];
  const history = journalTaskAssistance(
    state.events,
    { lessonId: "review", stepId: reviewEventStepId(session) },
    { reviewAttemptKey: courseEvidencePolicy.reviewAttemptKey },
  );
  return {
    hints: Math.max(current?.hints ?? 0, history.hints),
    revealed: Boolean(current?.revealed || history.revealed),
  };
}

export function evidenceForReview(
  conceptId: string,
  step: LessonStep,
): Pick<EvidenceEvent, "conceptIds" | "evidenceVersion"> {
  return {
    conceptIds: [conceptId],
    ...(step.evidence ? { evidenceVersion: step.evidence.version } : {}),
  };
}
export function courseMastery(state: UserState, conceptId: string) {
  return deriveConceptMastery(state, conceptId, courseEvidencePolicy);
}
export function courseEvidenceSummary(state: UserState, conceptId: string) {
  return {
    mastery: courseMastery(state, conceptId),
    qualifyingCodingTasks: independentCodingTaskIds(
      state,
      conceptId,
      courseEvidencePolicy,
    ).length,
    requiredCodingTasks:
      courseEvidencePolicy.calibrationForConcept?.(conceptId)
        ?.minimumCodingTasks,
    hasLegacyEvidence: state.events.some(
      (event) =>
        event.kind !== "exposure" &&
        event.conceptIds.includes(conceptId) &&
        event.evidenceVersion === undefined,
    ),
  };
}
export function courseCompetencyProgress(
  state: UserState,
  competencyId: string,
) {
  return competencyProgress(
    state,
    concepts,
    competencyId,
    courseEvidencePolicy,
  );
}

export function courseModuleGate(
  state: UserState,
  scopedLessons: Lesson[],
  module?: CourseModule,
) {
  return moduleGate(
    state,
    scopedLessons,
    module,
    courseEvidencePolicy.definitionForTask,
    lessons,
  );
}

export function courseGateRecovery(
  state: UserState,
  criterion: ModuleGateCriterion,
  scopedLessons: readonly Lesson[] = lessons,
) {
  return gateRecovery(
    state,
    criterion,
    scopedLessons,
    courseEvidencePolicy.definitionForTask,
    lessons,
  );
}

export function courseNextGateTask(
  state: UserState,
  criterion: ModuleGateCriterion,
  scopedLessons: readonly Lesson[] = lessons,
) {
  return nextGateTask(
    state,
    criterion,
    scopedLessons,
    courseEvidencePolicy.definitionForTask,
    lessons,
  );
}

/** Course boundary: apply authored artifact policy to every recorded event. */
export function recordCourseEvidence(
  state: UserState,
  event: EvidenceEvent,
): UserState {
  if (!isIndependentSuccess(event)) return recordEvidence(state, event, courseEvidencePolicy);
  const supplied = currentStep(event.lessonId, event.stepId)?.suppliedSolutions;
  if (!supplied) return recordEvidence(state, event, courseEvidencePolicy);
  if (state.events.some((existing) => existing.id === event.id)) return state;
  // Old saves may only have a reveal flag on the component or its source.
  // Date its first observation before this submission, without backdating help.
  const savedFlags = { ...state, events: [] };
  const restoredComponents = [
    ...(supplied.code ?? []),
    ...(supplied.solution ?? []),
  ].filter(
    (ref) =>
      hasComponentSolutionReveal(savedFlags, ref, lessons) &&
      !hasComponentSolutionReveal(state, ref, lessons, event.at),
  );
  const observed = revealAuthoredStepSolutions(
    state,
    restoredComponents,
    lessons,
    event.at,
    courseEvidencePolicy,
  );
  return recordEvidence(observed, event, courseEvidencePolicy);
}

/** Course boundary: apply authored artifact policy to neutral lesson exposure. */
export function recordCourseLessonExposure(
  state: UserState,
  exposure: LessonExposure,
  source: "exposure" | "supplied-solution" = "exposure",
): UserState {
  return recordLessonExposure(state, exposure, courseEvidencePolicy, source);
}

/** Attribute a complete prerequisite implementation only when its authored source is displayed. */
export function recordSuppliedSolutions(
  state: UserState,
  source: LessonStep,
  variant: "code" | "solution",
  now: number,
): UserState {
  const refs = source.suppliedSolutions?.[variant];
  return refs?.length
    ? revealAuthoredStepSolutions(state, refs, lessons, now, courseEvidencePolicy)
    : state;
}

/** Course boundary: expose only the refs belonging to the requested archive variant. */
export function revealCourseProjectPackageVariant(
  state: UserState,
  project: ProjectPackage,
  lessons: Lesson[],
  variant: PackageVariant,
  now: number,
): UserState {
  return revealProjectPackageVariant(
    state,
    project,
    lessons,
    variant,
    now,
    courseEvidencePolicy,
  );
}
