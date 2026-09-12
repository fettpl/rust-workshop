/** Executes repository-authored examples in the remote sandbox, never learner drafts. */
import assert from "node:assert/strict";
import { lessons } from "../src/content/course";
import { evaluate } from "../src/engine/evaluate";
import type { LessonStep, RunResult } from "../src/domain/types";

export async function smokeLessons(
  lessonIds: string[],
  diagnosticLessonIds: string[],
) {
  const base = (
    process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3002"
  ).replace(/\/$/, "");
  let cases = 0;
  let tests = 0;
  async function run(lessonId: string, step: LessonStep, starter: boolean) {
    const code = starter ? step.code : step.solution;
    assert.ok(code?.trim(), `${lessonId}/${step.id}: authored code missing`);
    const evaluator = step.evaluator;
    const response = await fetch(`${base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({
        code,
        mode: evaluator?.kind === "tests" ? "test" : "run",
        tests: evaluator?.kind === "tests" ? evaluator.tests : undefined,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(
      response.status,
      200,
      `${lessonId}/${step.id}: HTTP ${response.status}`,
    );
    const result: RunResult = await response.json();
    assert.equal(
      result.status,
      starter ? "compile-error" : "success",
      result.stderr,
    );
    if (starter) {
      assert.ok(step.expectedError);
      assert.ok(
        result.diagnostics.some(
          (diagnostic) => diagnostic.code === step.expectedError,
        ),
        result.stderr,
      );
    } else {
      assert.equal(evaluator?.kind, "tests");
      assert.ok(result.tests && result.tests.passed > 0);
      assert.equal(result.tests.failed, 0);
      assert.ok(evaluate(evaluator!, { code, result }).passed);
      tests += result.tests.passed;
    }
    cases++;
    console.log(
      `ok ${lessonId}/${step.id}/${starter ? "starter" : "solution"}: ${result.status}; ${result.tests?.passed ?? 0} tests; ${result.durationMs}ms`,
    );
  }
  for (const id of lessonIds) {
    const lesson = lessons.find((item) => item.id === id);
    assert.ok(lesson, `Missing lesson ${id}`);
    const gate = lesson.steps.find(
      (step) => step.evidenceGate && step.evaluator?.kind === "tests",
    );
    assert.ok(gate, `No tested gate for ${id}`);
    await run(id, gate, false);
    if (diagnosticLessonIds.includes(id)) {
      const broken = lesson.steps.find(
        (step) => step.expectedStatus === "compile-error" && step.expectedError,
      );
      assert.ok(broken, `No compiler-error experiment for ${id}`);
      await run(id, broken, true);
    }
  }
  console.log(`${cases} live lesson cases verified; ${tests} tests passed.`);
}
if (process.argv[1]?.endsWith("smoke-abstractions.ts"))
  void smokeLessons(
    [
      "generic-values",
      "generic-impl",
      "generic-bounds",
      "trait-contracts",
      "trait-consumers",
      "associated-types",
      "trait-dispatch",
    ],
    ["generic-bounds", "trait-dispatch"],
  ).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
