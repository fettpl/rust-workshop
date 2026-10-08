import { expect, it } from "vitest";
import {
  delayedReviewExercises,
  lessons,
  reviewExercises,
  shortReviewExercises,
} from "./course";
import { appendHiddenTests, requestError, RUNNER_LIMITS } from "../runner";
import type { RunRequest } from "../domain/types";

it("can submit every authored reference and its hidden tests through the actual runner limits", () => {
  const steps = [
    ...lessons.flatMap((lesson) =>
      lesson.steps.map((step) => ({ key: `${lesson.id}/${step.id}`, step })),
    ),
    ...Object.entries(reviewExercises).map(([key, step]) => ({
      key: `review/${key}`,
      step,
    })),
    ...Object.entries(delayedReviewExercises).map(([key, step]) => ({
      key: `delayed-review/${key}`,
      step,
    })),
    ...Object.entries(shortReviewExercises).map(([key, step]) => ({
      key: `short-review/${key}`,
      step,
    })),
  ];
  for (const { key, step } of steps) {
    if (
      !step.solution ||
      !["tests", "compilation", "exact-output", "expected-error"].includes(
        step.evaluator?.kind ?? "",
      )
    )
      continue;
    const tests =
      step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined;
    const request: RunRequest = {
      code: step.solution,
      mode: tests === undefined ? "run" : "test",
      ...(tests === undefined ? {} : { tests }),
    };
    expect(requestError(request), key).toBeUndefined();
    expect(Buffer.byteLength(JSON.stringify(request)), key).toBeLessThanOrEqual(
      RUNNER_LIMITS.maxRequestBytes,
    );
    expect(
      Buffer.byteLength(
        tests === undefined
          ? request.code
          : appendHiddenTests(request.code, tests),
      ),
      key,
    ).toBeLessThanOrEqual(RUNNER_LIMITS.maxRequestBytes);
  }
});
