import {
  recordEvidence,
  recordLessonExposure,
  evidencePolicyForConcepts,
  deriveConceptMastery,
  independentCodingTaskIds,
} from "@/engine/learning";
import {
  revealProjectPackageVariant,
  type PackageVariant,
} from "@/domain/project-package";
import type {
  EvidenceEvent,
  LessonExposure,
  Lesson,
  LessonStep,
  ProjectPackage,
  UserState,
} from "@/domain/types";
import { stepKey } from "@/persistence/state";
import { competencyProgress } from "@/engine/progress";
import { concepts, lessons, reviewExercises } from "./course";

/** Exact current source lookup; review UUIDs identify sessions, never task families. */
function currentStep(lessonId: string, stepId: string): LessonStep | undefined {
  if (lessonId === "review") {
    const separator = stepId.indexOf(":");
    if (separator <= 0 || separator === stepId.length - 1) return undefined;
    return reviewExercises[stepId.slice(0, separator)];
  }
  return lessons
    .find((lesson) => lesson.id === lessonId)
    ?.steps.find((step) => step.id === stepId);
}
const courseEvidencePolicy = {
  ...evidencePolicyForConcepts(concepts),
  definitionForTask: (lessonId: string, stepId: string) =>
    currentStep(lessonId, stepId)?.evidence,
  definitionForEvent: (event: EvidenceEvent) => {
    const step = currentStep(event.lessonId, event.stepId);
    const definition = step?.evidence;
    if (
      !step ||
      !definition ||
      event.evaluator !== step.evaluator?.kind ||
      event.kind !==
        (step.evaluator?.kind === "rubric"
          ? "self-rating"
          : step.evidenceKind) ||
      event.evidenceVersion !== definition.version ||
      event.conceptIds.length !== definition.conceptIds.length ||
      new Set(event.conceptIds).size !== event.conceptIds.length ||
      !event.conceptIds.every((id) => definition.conceptIds.includes(id))
    )
      return undefined;
    return definition;
  },
};

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
  const flags = {
    hints: current?.hints ?? 0,
    revealed: current?.revealed ?? false,
  };
  const family = step.evidence?.codingTaskId;
  if (
    !family?.trim() ||
    !["fix", "transfer", "project", "assessment"].includes(step.evidenceKind)
  )
    return flags;
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

/** Course boundary: apply authored artifact policy to every recorded event. */
export function recordCourseEvidence(
  state: UserState,
  event: EvidenceEvent,
): UserState {
  return recordEvidence(state, event, courseEvidencePolicy);
}

/** Course boundary: apply authored artifact policy to neutral lesson exposure. */
export function recordCourseLessonExposure(
  state: UserState,
  exposure: LessonExposure,
): UserState {
  return recordLessonExposure(state, exposure, courseEvidencePolicy);
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
