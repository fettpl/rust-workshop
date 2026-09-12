import type { LessonStep } from "../domain/types";

export function choicesForStep(step: LessonStep, contextId: string) {
  const choices = step.choices ?? [];
  if (step.evaluator?.kind !== "choice" || choices.length < 2) return choices;
  // Stable per question, independent of its answer key and the learner's state.
  // Keep IDs intact so drafts and prior answers still select the same meaning.
  let hash = 2166136261;
  for (const character of `${contextId}/${step.id}`)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  const start = hash % choices.length;
  return [...choices.slice(start), ...choices.slice(0, start)];
}
