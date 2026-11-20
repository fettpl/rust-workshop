import type {
  Concept,
  MasteryLevel,
  Lesson,
  ModuleGateCriterion,
  UserState,
} from "@/domain/types";
import {
  deriveConceptMastery,
  independentCodingTaskIdForEvent,
  isIndependentSuccess,
  observedSubmission,
  gateRecovery,
  type EvidencePolicy,
} from "./learning";
export { gateRecovery, type GateRecovery } from "./learning";
import { stepKey } from "@/persistence/state";

const levels: MasteryLevel[] = [
  "new",
  "exposed",
  "practiced",
  "understood",
  "retained",
];

/** Conservative summary: a competency is only as established as its least demonstrated concept. */
export function competencyProgress(
  state: UserState,
  concepts: Concept[],
  competencyId: string,
  policy?: EvidencePolicy,
) {
  const related = concepts.filter((concept) =>
    concept.competencyIds.includes(competencyId),
  );
  const ids = new Set(related.map((concept) => concept.id));
  const ranks = related.map((concept) =>
    levels.indexOf(
      policy?.disclosureLessons || policy?.calibrationForConcept?.(concept.id)
        ? deriveConceptMastery(state, concept.id, policy).level
        : (state.mastery[concept.id]?.level ?? "new"),
    ),
  );
  const evidence = state.events.flatMap((event, index) => {
    const relatedIds = event.conceptIds.filter((id) => ids.has(id));
    const codingIds = relatedIds.flatMap((id) => {
      const taskId = policy?.calibrationForConcept?.(id)
        ? independentCodingTaskIdForEvent(state, index, id, policy)
        : undefined;
      return taskId ? [taskId] : [];
    });
    const ordinaryTaskKey =
      event.lessonId === "review" && policy?.reviewTaskKey
        ? policy.reviewTaskKey(event.stepId)
        : stepKey(event.lessonId, event.stepId);
    // An accepted calibrated family is one task even when its exact subset
    // also supports an uncalibrated concept in this competency.
    const taskIds =
      codingIds.length > 0
        ? codingIds.map((id) => `coding:${id}`)
        : relatedIds.some(
              (id) =>
                !policy?.calibrationForConcept?.(id) &&
                (policy
                  ? isIndependentSuccess(
                      observedSubmission(state, index, policy),
                      id,
                      policy,
                    )
                  : isIndependentSuccess(event)),
            )
          ? ordinaryTaskKey
            ? [ordinaryTaskKey]
            : []
          : [];
    return taskIds.length > 0 ? [{ event, taskIds }] : [];
  });
  return {
    level: levels[ranks.length ? Math.min(...ranks) : 0],
    proven: ranks.filter((rank) => rank >= 3).length,
    total: related.length,
    independentTasks: new Set(evidence.flatMap(({ taskIds }) => taskIds)).size,
    lessonCount: new Set(
      evidence
        .filter(({ event }) => event.lessonId !== "review")
        .map(({ event }) => event.lessonId),
    ).size,
  };
}

export function nextGateTask(
  state: UserState,
  criterion: ModuleGateCriterion,
  lessons: readonly Lesson[] = [],
  definitionForTask?: EvidencePolicy["definitionForTask"],
  disclosureLessons: readonly Lesson[] = lessons,
) {
  if (
    criterion.requiredIndependentCodingTasks !== undefined ||
    lessons.length > 0
  ) {
    const recovery = gateRecovery(
      state,
      criterion,
      lessons,
      definitionForTask,
      disclosureLessons,
    );
    return recovery.status === "available" ? recovery.task : undefined;
  }
  const taskPassed = criterion.taskRefs.some((ref) =>
    state.events.some(
      (event) =>
        event.lessonId === ref.lessonId &&
        event.stepId === ref.stepId &&
        isIndependentSuccess(event),
    ),
  );
  if (taskPassed && criterion.supplementaryStepRefs?.length) {
    const missing = criterion.supplementaryStepRefs.find(
      (ref) =>
        !state.events.some(
          (event) =>
            event.lessonId === ref.lessonId &&
            event.stepId === ref.stepId &&
            event.passed &&
            event.kind === "self-rating" &&
            event.evaluator === "rubric",
        ),
    );
    if (missing) return missing;
  }
  return (
    criterion.taskRefs.find((ref) => {
      const progress = state.steps[stepKey(ref.lessonId, ref.stepId)];
      return !progress?.completed && !progress?.revealed && !progress?.hints;
    }) ?? criterion.taskRefs[0]
  );
}
