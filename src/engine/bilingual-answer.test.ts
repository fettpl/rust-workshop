import { describe, expect, it } from "vitest";
import { lessons } from "@/content/course";
import { evaluate } from "./evaluate";

function evaluatorFor(id: string) {
  const evaluator = lessons
    .flatMap((lesson) => lesson.steps)
    .find((step) => step.id === id)?.evaluator;
  if (evaluator?.kind !== "answer")
    throw new Error(`No answer evaluator for ${id}`);
  return evaluator;
}

describe("bilingual short answers", () => {
  it("accepts a translated recall answer without accepting the opposite action", () => {
    const evaluator = evaluatorFor("async-lending-callbacks-recall");
    expect(evaluate(evaluator, { answer: "kończy wizytę" }).passed).toBe(true);
    expect(evaluate(evaluator, { answer: "ends the visit" }).passed).toBe(true);
    expect(evaluate(evaluator, { answer: "continues the visit" }).passed).toBe(
      false,
    );
  });

  it("preserves case-sensitive Rust names", () => {
    const evaluator = evaluatorFor("modeling-fresh-retrieval");
    expect(
      evaluate(evaluator, { answer: "TaskState and Option<i32>" }).passed,
    ).toBe(true);
    expect(
      evaluate(evaluator, { answer: "taskstate and Option<i32>" }).passed,
    ).toBe(false);
  });

  it("requires program output literally even if the program prints Polish words", () => {
    const evaluator = evaluatorFor("memory-owner-out-of-block");
    expect(evaluate(evaluator, { answer: "chwila\nzostaje" }).passed).toBe(
      true,
    );
    expect(evaluate(evaluator, { answer: "moment\nstays" }).passed).toBe(false);
  });
});
