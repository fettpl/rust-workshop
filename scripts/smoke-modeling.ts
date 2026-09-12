/** Live integration checks use only repository-authored exercises, never learner drafts. */
import assert from "node:assert/strict";
import { lessons } from "../src/content/course";

async function main() {
  const base = process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3002";
  for (const [lessonId, stepId] of [
    ["slices-and-views", "slice-repair"],
    ["enums-and-match", "enum-error"],
    ["modeling-assessment", "modeling-blank"],
  ]) {
    const step = lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.find((step) => step.id === stepId)!;
    assert.equal(step.evaluator?.kind, "tests");
    if (step.evaluator?.kind !== "tests")
      throw new Error("Expected a tested exercise");
    for (const variant of step.code ? ["starter", "solution"] : ["solution"]) {
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
      const result = await response.json();
      assert.equal(response.status, 200);
      const expected = variant === "starter" ? "compile-error" : "success";
      assert.equal(
        result.status,
        expected,
        `${lessonId}/${stepId}/${variant}: ${result.stderr}`,
      );
      if (variant === "starter") {
        assert.ok(
          result.diagnostics.some(
            (diagnostic: { code?: string }) =>
              diagnostic.code === step.expectedError,
          ),
        );
      } else {
        assert.ok(result.tests.passed > 0);
        assert.equal(result.tests.failed, 0);
      }
      console.log(`ok ${lessonId}/${stepId}/${variant}: ${result.status}`);
    }
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
