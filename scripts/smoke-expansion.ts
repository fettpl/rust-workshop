/** Sends repository-authored fixtures only, never learner drafts. */
import assert from "node:assert/strict";
import { lessons } from "../src/content/course";
import type { RunResult } from "../src/domain/types";

async function main() {
  const base = process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3002";
  for (const [lessonId, stepId] of [
    ["vec-and-borrowing", "vec-repair"],
    ["propagation-and-errors", "propagate-modify"],
    ["todo-session-project", "session-blank"],
  ]) {
    const step = lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.find((step) => step.id === stepId)!;
    assert.equal(step.evaluator?.kind, "tests");
    if (step.evaluator?.kind !== "tests")
      throw new Error("Expected tested exercise");
    const variants =
      step.expectedStatus === "compile-error"
        ? ["starter", "solution"]
        : ["solution"];
    for (const variant of variants) {
      const response: Response = await fetch(`${base}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base },
        body: JSON.stringify({
          code: variant === "starter" ? step.code : step.solution,
          mode: "test",
          tests: step.evaluator.tests,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(response.status, 200);
      const result: RunResult = await response.json();
      assert.equal(
        result.status,
        variant === "starter" ? "compile-error" : "success",
        result.stderr,
      );
      if (variant === "starter") {
        assert.ok(
          result.diagnostics.some(
            (diagnostic) => diagnostic.code === step.expectedError,
          ),
        );
      } else {
        assert.ok(result.tests && result.tests.passed > 0);
        assert.equal(result.tests.failed, 0);
      }
      console.log(`ok ${lessonId}/${stepId}/${variant}: ${result.status}`);
    }
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
