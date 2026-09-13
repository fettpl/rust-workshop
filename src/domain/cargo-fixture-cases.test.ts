import { describe, expect, it } from "vitest";
import type { LessonStep } from "./types";
import { tokioCasesForStep } from "../../scripts/cargo-fixture-cases";

const step: LessonStep = {
  id: "work",
  title: "Work",
  prompt: "Work",
  kind: "debug",
  evidenceKind: "fix",
  trustedFixtureTarget: "cargo-tokio-runtime-1.53.1",
  code: "fn start() { tokio::spawn(async {}); }",
  solution: "fn start() { tokio::spawn(async {}); }",
  expectedStatus: "success",
  evaluator: { kind: "tests", tests: "#[test] fn checks() { start(); }" },
};

describe("complete authored Tokio case inventory", () => {
  it("rejects missing and whitespace-only solutions even when a starter exists", () => {
    for (const solution of [undefined, "", "   "])
      expect(() => tokioCasesForStep("lesson", { ...step, solution })).toThrow(
        "requires an authored solution",
      );
  });
  it("includes targeted non-function solutions and rejects an empty source inventory", () => {
    const nonFunction = {
      ...step,
      kind: "blank" as const,
      code: undefined,
      solution: "use tokio::task::JoinHandle;",
      evaluator: {
        kind: "answer" as const,
        accepted: ["yes"],
        feedback: "Correct",
      },
    };
    expect(tokioCasesForStep("review", nonFunction).map((x) => x.id)).toEqual([
      "review/work/solution",
    ]);
    expect(() =>
      tokioCasesForStep("review", { ...nonFunction, solution: undefined }),
    ).toThrow();
  });
  it("checks visible code, hidden starter rejection, empty implementations and the solution", () => {
    const cases = tokioCasesForStep("lesson", step);
    expect(cases.map((x) => x.id)).toEqual([
      "lesson/work/reject-empty-implementation",
      "lesson/work/starter",
      "lesson/work/starter-rejected",
      "lesson/work/solution",
    ]);
    expect(cases[0].expectedCompileError).toBe("any");
    expect(cases[2].expectRejection).toBe(true);
    expect(cases[3].tests).toBe(
      step.evaluator?.kind === "tests" ? step.evaluator.tests : "",
    );
    expect(cases[3].evaluator).toBe(step.evaluator);
  });
  it("still verifies blank solutions and rejects unknown fixture metadata", () => {
    expect(
      tokioCasesForStep("review", {
        ...step,
        kind: "blank",
        code: undefined,
      }).map((x) => x.id),
    ).toEqual([
      "review/work/reject-empty-implementation",
      "review/work/solution",
    ]);
    expect(
      tokioCasesForStep("std", {
        ...step,
        trustedFixtureTarget: undefined,
        code: "fn start() {}",
        solution: "fn start() {}",
      }),
    ).toEqual([]);
    expect(() =>
      tokioCasesForStep("bad", {
        ...step,
        trustedFixtureTarget: "unknown",
      } as unknown as LessonStep),
    ).toThrow();
  });
  it("requires a diagnostic on broken code but a successful corrected solution", () => {
    const cases = tokioCasesForStep("borrow", {
      ...step,
      expectedStatus: "compile-error",
      expectedError: "E0373",
      evaluator: { kind: "compilation" },
    });
    expect(
      cases.find((x) => x.id.endsWith("/starter"))?.expectedCompileError,
    ).toBe("E0373");
    expect(
      cases.find((x) => x.id.endsWith("/solution"))?.expectedCompileError,
    ).toBeUndefined();
  });
  it("checks exact visible output and does not mistake runtime failure for a compiler error", () => {
    const output = tokioCasesForStep("run", {
      ...step,
      evaluator: { kind: "exact-output", expected: "done\n" },
    });
    expect(output.every((x) => x.expectedOutput === "done\n")).toBe(true);
    const panic = tokioCasesForStep("panic", {
      ...step,
      expectedStatus: "runtime-error",
      evaluator: { kind: "compilation" },
    });
    expect(panic[0].expectRuntimeFailure).toBe(true);
    expect(panic[0].expectedCompileError).toBeUndefined();
    expect(panic[1].expectRuntimeFailure).toBeUndefined();
  });
});
