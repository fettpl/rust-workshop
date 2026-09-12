import type {
  Concept,
  MasteryLevel,
  ModuleGateCriterion,
  UserState,
} from "@/domain/types";
import { isIndependentSuccess } from "./learning";
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
) {
  const related = concepts.filter((concept) =>
    concept.competencyIds.includes(competencyId),
  );
  const ids = new Set(related.map((concept) => concept.id));
  const ranks = related.map((concept) =>
    levels.indexOf(state.mastery[concept.id]?.level ?? "new"),
  );
  const evidence = state.events.filter(
    (event) =>
      event.conceptIds.some((id) => ids.has(id)) && isIndependentSuccess(event),
  );
  return {
    level: levels[ranks.length ? Math.min(...ranks) : 0],
    proven: ranks.filter((rank) => rank >= 3).length,
    total: related.length,
    independentTasks: new Set(
      evidence.map((event) => stepKey(event.lessonId, event.stepId)),
    ).size,
    lessonCount: new Set(
      evidence
        .filter((event) => event.lessonId !== "review")
        .map((event) => event.lessonId),
    ).size,
  };
}

export function nextGateTask(state: UserState, criterion: ModuleGateCriterion) {
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
