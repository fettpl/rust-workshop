import type {
  Attempt,
  LessonStep,
  ModuleGateTaskRef,
  StepProgress,
} from "../domain/types";

/** An empty starter is still a coding task; observation controls editability. */
export function stepInteraction(step: LessonStep | undefined) {
  if (!step) return { executable: false, hasCode: false, editable: false };
  const executable =
    step.evaluator !== undefined &&
    ["exact-output", "compilation", "expected-error", "tests"].includes(
      step.evaluator.kind,
    );
  return {
    executable,
    hasCode: step.code !== undefined || step.kind === "blank" || executable,
    editable:
      !["predict", "observe", "explain", "trace", "recall"].includes(
        step.kind,
      ) ||
      (step.kind === "recall" &&
        (step.evaluator?.kind === "tests" ||
          step.evaluator?.kind === "manifest-contract")),
  };
}

export function predictsRunResult(step: LessonStep | undefined): boolean {
  return (
    !!step?.code &&
    (step.kind === "predict" || step.evidenceKind === "prediction") &&
    (step.evaluator?.kind === "answer" || step.evaluator?.kind === "choice")
  );
}

export function answerProgressKey(ref: ModuleGateTaskRef) {
  return ref.lessonId === "review"
    ? `review:${ref.stepId.slice(ref.stepId.indexOf(":") + 1)}`
    : `${ref.lessonId}:${ref.stepId}`;
}

export function receivedChoiceFeedback(
  step?: LessonStep,
  attempt?: Attempt,
): boolean {
  const evaluator = step?.evaluator;
  return (
    evaluator?.kind === "choice" &&
    !!attempt &&
    !attempt.result &&
    !attempt.passed &&
    !!attempt.answer &&
    attempt.answer !== evaluator.correct &&
    !!attempt.feedback.trim() &&
    evaluator.explanations[attempt.answer] === attempt.feedback
  );
}

/** Older saves kept the revealed output or corrective feedback only in the attempt list. */
export function hadAnswerHelp(
  step: LessonStep | undefined,
  progress: StepProgress | undefined,
  at = Infinity,
): boolean {
  if (!progress || !step) return false;
  const prediction = predictsRunResult(step);
  if (!prediction && step.evaluator?.kind !== "choice") return false;
  // At a tied timestamp the attempt list establishes whether a correct forecast
  // was already on record before the learner saw the result.
  const tiedPass = progress.attempts.findIndex(
    (attempt) =>
      attempt.at === at &&
      attempt.passed &&
      !attempt.result &&
      attempt.answer !== undefined,
  );
  return progress.attempts.some(
    (attempt, index) =>
      (receivedChoiceFeedback(step, attempt) ||
        (prediction &&
          attempt.result !== undefined &&
          attempt.result.status !== "infrastructure-error" &&
          attempt.result.status !== "timeout")) &&
      (attempt.at < at ||
        (attempt.at === at && (tiedPass < 0 || index < tiedPass))),
  );
}
