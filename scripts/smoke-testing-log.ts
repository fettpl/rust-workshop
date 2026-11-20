/** Sends only reviewed, repository-authored exercise fixtures to the remote sandbox. */
import assert from "node:assert/strict";
import { lessons } from "../src/content/course";
import { evaluate } from "../src/engine/evaluate";
import type { RunResult } from "../src/domain/types";
import { smokeLessons } from "./smoke-abstractions";

async function main() {
  await smokeLessons(
    [
      "testing-contracts",
      "testing-regressions",
      "testing-quality-workflow",
      "log-records",
      "log-streaming",
      "log-analyzer-project",
    ],
    [],
  );
  const lesson = lessons.find((item) => item.id === "testing-contracts")!;
  const step = lesson.steps.find(
    (item) => item.evidenceGate && item.evaluator?.kind === "tests",
  )!;
  assert.equal(step.evaluator?.kind, "tests");
  assert.ok(step.code?.trim());
  const base = (
    process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3002"
  ).replace(/\/$/, "");
  const response = await fetch(`${base}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      code: step.code,
      mode: "test",
      tests: step.evaluator!.kind === "tests" ? step.evaluator.tests : "",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200);
  const result: RunResult = await response.json();
  assert.equal(result.status, "test-failure", result.stderr);
  assert.ok(result.tests && result.tests.failed > 0);
  assert.equal(
    evaluate(step.evaluator!, { code: step.code, result }).passed,
    false,
  );
  console.log(
    `ok ${lesson.id}/${step.id}/starter: weak tests rejected; ${result.tests.failed} tests failed as expected`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
