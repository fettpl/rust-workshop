import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { lessons } from "./course";
import { restoreExplanationEvaluationLessons } from "./workshop-assessment-repair-compatibility-fixture";
import { evaluate } from "@/engine/evaluate";

const restore = (input: typeof lessons) =>
  restoreExplanationEvaluationLessons(
    input,
    new Map(),
    (value, hash) =>
      value !== undefined &&
      createHash("sha256").update(JSON.stringify(value)).digest("hex") === hash,
  );
const stepFor = (input: typeof lessons, id: string) =>
  input.flatMap((lesson) => lesson.steps).find((step) => step.id === id)!;

it("restores precisely captured explanation and acknowledgement contracts for historical baselines", () => {
  const historical = restore(lessons);
  expect(
    evaluate(stepFor(historical, "capstone-domain-explain").evaluator!, {
      answer: "UTF-8",
    }).passed,
  ).toBe(true);
  expect(
    evaluate(stepFor(historical, "bounded-retry-model-trace").evaluator!, {
      answer: "Prześledzony model",
    }).passed,
  ).toBe(true);
  expect(stepFor(lessons, "capstone-domain-explain").evaluator?.kind).toBe(
    "rubric",
  );
  expect(
    stepFor(lessons, "bounded-retry-model-trace").evaluator,
  ).toBeUndefined();
});

it("keeps an unexpected rubric change observable instead of restoring an accepted legacy token", () => {
  const changed = structuredClone(lessons);
  const step = stepFor(changed, "capstone-domain-explain");
  if (step.evaluator?.kind !== "rubric")
    throw new Error("Missing authored rubric");
  step.evaluator.criteria[0] = "Unreviewed criterion";
  expect(
    evaluate(stepFor(restore(changed), step.id).evaluator!, { answer: "UTF-8" })
      .passed,
  ).toBe(false);
});

it("does not restore hidden-token grading after an unreviewed observation prompt change", () => {
  const changed = structuredClone(lessons);
  const step = stepFor(changed, "bounded-retry-model-trace");
  step.prompt += " Unreviewed observation.";
  expect(stepFor(restore(changed), step.id).evaluator).toBeUndefined();
});
