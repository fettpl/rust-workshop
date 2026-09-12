import { describe, expect, it } from "vitest";
import { foundationsLessons } from "./foundations";
import { evaluate } from "../engine/evaluate";

const outputTasks = [
  { lesson: "bindings-types", step: "mut-error" },
  { lesson: "bindings-types", step: "shadow-types" },
  { lesson: "control-flow", step: "flow-modify" },
  { lesson: "control-flow", step: "flow-transfer" },
];

describe("foundation coding evidence", () => {
  it.each(outputTasks)(
    "rejects literal output as proof of $step",
    ({ lesson, step }) => {
      const task = foundationsLessons
        .find((item) => item.id === lesson)!
        .steps.find((item) => item.id === step)!;
      const evaluator = task.evaluator!;
      if (evaluator.kind !== "exact-output")
        throw new Error("Expected output task");
      const result = {
        status: "success" as const,
        stdout: evaluator.expected,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
      };
      expect(
        evaluate(evaluator, {
          code: `fn main() { print!(${JSON.stringify(evaluator.expected)}); }`,
          result,
        }).passed,
      ).toBe(false);
      expect(evaluate(evaluator, { code: task.solution, result }).passed).toBe(
        true,
      );
    },
  );

  it("requires the alternative binding task to retain mutation and control flow", () => {
    const task = foundationsLessons
      .find((item) => item.id === "control-flow")!
      .steps.find((item) => item.id === "flow-transfer")!;
    expect(
      evaluate(task.evaluator!, {
        code: 'fn main() { let band = "retry"; println!("{band}"); println!("2\\n3\\n4"); }',
        result: {
          status: "success",
          stdout: "retry\n2\n3\n4\n",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
        },
      }).passed,
    ).toBe(false);
  });
});
