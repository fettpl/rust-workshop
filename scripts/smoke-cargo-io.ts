/** Sends repository-authored Cargo/IO fixtures only, never learner drafts. */
import assert from "node:assert/strict";
import { lessons } from "../src/content/course";
import type { RunResult } from "../src/domain/types";
import { evaluate } from "../src/engine/evaluate";

const fixtures = [
  ["module-visibility", "visibility-debug"],
  ["todo-storage-format", "format-debug"],
  ["todo-file-persistence", "file-debug"],
  ["todo-terminal-cli", "cli-debug"],
  ["todo-file-persistence", "file-gate"],
  ["todo-terminal-cli", "cli-gate"],
] as const;

async function main() {
  const base = (
    process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  let verified = 0;
  let passedTests = 0;

  for (const [lessonId, stepId] of fixtures) {
    const step = lessons
      .find((lesson) => lesson.id === lessonId)
      ?.steps.find((item) => item.id === stepId);
    assert.ok(step, `Missing authored fixture: ${lessonId}/${stepId}`);
    assert.equal(step.evaluator?.kind, "tests");
    if (step.evaluator?.kind !== "tests")
      throw new Error(`Expected tested exercise: ${lessonId}/${stepId}`);

    const variants =
      step.expectedStatus === "compile-error"
        ? (["starter", "solution"] as const)
        : (["solution"] as const);
    for (const variant of variants) {
      const name = `${lessonId}/${stepId}/${variant}`;
      const code = variant === "starter" ? step.code : step.solution;
      assert.ok(code?.trim(), `Missing authored code: ${name}`);
      const response: Response = await fetch(`${base}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base },
        body: JSON.stringify({
          code,
          mode: "test",
          tests: step.evaluator.tests,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
      const result: RunResult = await response.json();
      assert.equal(
        result.status,
        variant === "starter" ? "compile-error" : "success",
        `${name}: ${result.stderr}`,
      );
      let detail: string;
      if (variant === "starter") {
        assert.ok(step.expectedError, `${name}: missing expected diagnostic`);
        assert.ok(
          result.diagnostics.some(
            (diagnostic) => diagnostic.code === step.expectedError,
          ),
          `${name}: expected ${step.expectedError}; ${result.stderr}`,
        );
        detail = step.expectedError;
      } else {
        assert.ok(result.tests && result.tests.passed > 0, `${name}: no tests`);
        assert.equal(result.tests.failed, 0, `${name}: failed tests`);
        const outcome = evaluate(step.evaluator, { code, result });
        assert.ok(outcome.passed, `${name}: ${outcome.feedback}`);
        passedTests += result.tests.passed;
        detail = `${result.tests.passed} passed, ${result.tests.failed} failed`;
      }
      verified++;
      console.log(
        `ok ${name}: ${result.status}; ${detail}; ${result.durationMs}ms`,
      );
    }
  }

  console.log(
    `${verified} live API cases verified; ${passedTests} tests passed. ` +
      "Filesystem cases use the runner's temporary filesystem. " +
      "This does not verify a local Cargo package, terminal process, or persistence between requests.",
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
