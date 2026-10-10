import { describe, expect, it } from "vitest";
import { lessons } from "./catalog";
import { foundationsLessons } from "./foundations";
import { evaluate } from "../engine/evaluate";

const executionTasks = [
  ["memory-intro", "memory-run", "3\n"],
  ["memory-intro", "memory-modify", "warm\n"],
  ["functions-and-ownership", "function-expression-run", "42\n"],
  ["number-guessing-transfer", "project-result-run", "correct\n"],
] as const;

describe("authored execution steps", () => {
  for (const [lessonId, stepId, expected] of executionTasks) {
    it(`${lessonId}/${stepId} requires successful code execution`, () => {
      const step = lessons
        .find((lesson) => lesson.id === lessonId)!
        .steps.find((step) => step.id === stepId)!;
      expect(step.evaluator?.kind).toBe("exact-output");
      expect(
        evaluate(step.evaluator!, { answer: expected.trim(), code: step.code })
          .passed,
      ).toBe(false);
      for (const [status, stdout] of [
        ["success", "wrong\n"],
        ["compile-error", expected],
      ] as const) {
        expect(
          evaluate(step.evaluator!, {
            answer: expected.trim(),
            code: "fn main() {}",
            result: {
              status,
              stdout,
              stderr: "",
              diagnostics: [],
              durationMs: 0,
            },
          }).passed,
        ).toBe(false);
      }
      expect(
        evaluate(step.evaluator!, {
          code: step.solution,
          result: {
            status: "success",
            stdout: expected,
            stderr: "",
            diagnostics: [],
            durationMs: 0,
          },
        }).passed,
      ).toBe(true);
      expect(step.evidence?.codingTaskId).toBeUndefined();
    });
  }
  it("keeps genuine predictions available before execution and warm/cool unattributed", () => {
    const memory = lessons.find((lesson) => lesson.id === "memory-intro")!;
    expect(
      memory.steps.find((step) => step.id === "memory-modify")!.evidence
        ?.conceptIds,
    ).toEqual([]);
    for (const [lessonId, stepId, answer] of [
      ["move-copy-discovery", "copy-int-run", "7 7"],
      ["move-copy-discovery", "move-string-run", "rust"],
    ]) {
      const step = lessons
        .find((lesson) => lesson.id === lessonId)!
        .steps.find((step) => step.id === stepId)!;
      expect(evaluate(step.evaluator!, { answer }).passed).toBe(true);
    }
  });
  for (const [lessonId, stepId] of [
    ["bindings-types", "numeric-halves-transfer"],
    ["functions-expressions", "function-tuple-repair"],
    ["control-flow", "flow-range-transfer"],
    ["move-copy-discovery", "move-owned-transform"],
  ]) {
    it(`${lessonId}/${stepId} checks callable behavior`, () => {
      const step = [...foundationsLessons, ...lessons]
        .find((lesson) => lesson.id === lessonId)!
        .steps.find((step) => step.id === stepId);
      expect(step, "append-only executable task").toBeDefined();
      expect(step?.evaluator?.kind).toBe("tests");
      expect(
        evaluate(step!.evaluator!, { answer: "correct", code: step!.solution })
          .passed,
      ).toBe(false);
    });
  }
});

it("requires an own-words move/Copy explanation and rubric self-assessment", () => {
  const reflection = lessons
    .find((lesson) => lesson.id === "move-copy-discovery")!
    .steps.find((step) => step.id === "move-copy-own-words")!;
  if (reflection.evaluator?.kind !== "rubric")
    throw new Error("Missing self-assessment rubric");
  const rubricChecks = reflection.evaluator.criteria;
  expect(evaluate(reflection.evaluator, { rubricChecks }).passed).toBe(false);
  expect(
    evaluate(reflection.evaluator, {
      answer:
        "String zmienia właściciela, a i32 pozostaje dostępne dzięki Copy.",
    }).passed,
  ).toBe(false);
  expect(
    evaluate(reflection.evaluator, {
      answer:
        "String zmienia właściciela, a i32 pozostaje dostępne dzięki Copy.",
      rubricChecks,
    }).passed,
  ).toBe(true);
  expect(reflection.evidenceKind).toBe("self-rating");
  expect(reflection.evidenceGate).toBe(false);
});

it("keeps new prediction sources verifiable under the existing content validator", async () => {
  const { contentBundle } = await import("../../scripts/validate-content");
  const { validateContent } = await import("./validate");
  const owned = new Set(
    [...foundationsLessons, ...lessons].map((lesson) => lesson.id),
  );
  const issues = validateContent(contentBundle).filter((error) => {
    const lessonId = /^step ([^/]+)\//.exec(error)?.[1];
    return lessonId !== undefined && owned.has(lessonId);
  });
  expect(issues).toEqual([]);
});
