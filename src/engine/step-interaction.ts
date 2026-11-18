import type { LessonStep } from "../domain/types";

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
