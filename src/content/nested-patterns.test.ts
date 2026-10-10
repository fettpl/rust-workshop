import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import {
  nestedPatternConcepts,
  nestedPatternCompetencies,
  nestedPatternLessons,
  nestedPatternReviewExercises,
  nestedPatternSources,
} from "./nested-patterns";
import { nestedPatternFixtures } from "./nested-patterns-fixtures";

const lesson = nestedPatternLessons[0];

it("preserves the original six-step nested-pattern prefix before its approved bridge", () => {
  expect(nestedPatternLessons).toHaveLength(1);
  expect(lesson).toMatchObject({
    id: "nested-patterns-and-destructuring",
    moduleId: "data-modeling",
    prerequisites: ["modeling-assessment"],
    conceptIds: ["nested-pattern-matching"],
    competencyIds: ["destructure-borrowed-state"],
  });
  expect(lesson.steps.slice(0, 6).map((step) => step.id)).toEqual([
    "nested-predict",
    "nested-run",
    "nested-repair",
    "nested-transfer",
    "nested-explain",
    "nested-recall",
  ]);
  expect(
    lesson.steps.slice(0, 6).filter((step) => step.kind === "blank"),
  ).toHaveLength(1);
  expect(lesson.steps.find((step) => step.id === "nested-transfer")?.code).toBe(
    undefined,
  );
  expect(
    lesson.steps.find((step) => step.id === "nested-transfer")?.expectedStatus,
  ).toBe("success");
  expect(
    lesson.steps.find((step) => step.id === "nested-repair"),
  ).toMatchObject({
    expectedStatus: "compile-error",
    expectedError: "E0004",
  });
  expect(nestedPatternConcepts.map((item) => item.id)).toEqual([
    "nested-pattern-matching",
  ]);
  expect(nestedPatternConcepts[0].prerequisites).toEqual([
    "enum-variants",
    "exhaustive-match",
    "optional-values",
  ]);
  expect(nestedPatternConcepts[0].competencyIds).toEqual([
    "destructure-borrowed-state",
  ]);
  expect(nestedPatternConcepts[0].evidenceCalibration).toBeUndefined();
  expect(nestedPatternCompetencies.map((item) => item.id)).toEqual([
    "destructure-borrowed-state",
  ]);
  expect(nestedPatternSources.slice(0, 2).map((item) => item.id)).toEqual([
    "core-patterns-book",
    "core-patterns-reference",
  ]);
  expect(nestedPatternSources.slice(0, 2)).toMatchObject([
    {
      id: "core-patterns-book",
      url: "https://doc.rust-lang.org/book/ch19-03-pattern-syntax.html",
      classification: "stable",
      reviewedAt: "2026-10-07",
    },
    {
      id: "core-patterns-reference",
      url: "https://doc.rust-lang.org/reference/patterns.html",
      classification: "stable",
      reviewedAt: "2026-10-07",
    },
  ]);
  expect(
    nestedPatternSources.every((source) => source.recheckPolicy.length > 0),
  ).toBe(true);
  expect(nestedPatternReviewExercises["nested-pattern-matching"].id).toBe(
    "review-nested-pattern-matching",
  );
});

it("keeps repair, transfer, and review contracts distinct", () => {
  const repair = lesson.steps.find((step) => step.id === "nested-repair")!;
  const transfer = lesson.steps.find((step) => step.id === "nested-transfer")!;
  const review = nestedPatternReviewExercises["nested-pattern-matching"];
  expect(repair.code).toContain("match &reading.state");
  expect(repair.code).not.toContain("Some(ReadingState::Failed)");
  expect(repair.solution).toContain("Some(ReadingState::Failed)");
  expect(repair.solution).toContain("match &reading.state");
  expect(transfer.solution).toContain("enum Notice");
  expect(transfer.solution).toContain("fn needs_attention(notice: &Notice)");
  expect(transfer.solution).toContain("struct Details");
  expect(transfer.solution).not.toContain("fn describe(reading: &Reading)");
  expect(review.code).toContain("Option<String>");
  expect(review.code).not.toContain("enum ReadingState");
  expect(review.code).not.toEqual(review.solution);
  expect(review.code).toContain("let _ = banner;");
  expect(review.expectedStatus).toBe("test-failure");
  expect(review.solution).toContain("Banner::On { message: Some(_) }");
  expect(review.solution).toContain("Banner::On { message: None }");
});

it("keeps evidence versioned and evaluator-owned tests nonempty", () => {
  const review = nestedPatternReviewExercises["nested-pattern-matching"];
  for (const step of [...lesson.steps.slice(0, 6), review]) {
    expect(step.evidence, step.id).toMatchObject({
      version: 2,
      conceptIds: ["nested-pattern-matching"],
    });
    expect(step.evidence?.conceptIds).toHaveLength(1);
  }
  const transfer = lesson.steps.find((step) => step.id === "nested-transfer")!;
  expect(transfer.evidence?.codingTaskId).toBeUndefined();
  expect(review.evidence?.codingTaskId).toBeUndefined();
  expect(
    lesson.steps.find((step) => step.id === "nested-repair")?.evidence
      ?.codingTaskId,
  ).toBe("nested-repair");
  for (const step of [...lesson.steps.slice(0, 6), review]) {
    if (step.evaluator?.kind === "tests")
      expect(step.evaluator.tests.trim().length, step.id).toBeGreaterThan(0);
  }
  expect(transfer.evaluator?.kind).toBe("tests");
  expect(
    transfer.evaluator?.kind === "tests"
      ? transfer.evaluator.forbiddenPatterns
      : [],
  ).toBeUndefined();
});

it("uses the distinct predictive and recall evaluators", () => {
  const predict = lesson.steps.find((step) => step.id === "nested-predict")!;
  const run = lesson.steps.find((step) => step.id === "nested-run")!;
  const explain = lesson.steps.find((step) => step.id === "nested-explain")!;
  const recall = lesson.steps.find((step) => step.id === "nested-recall")!;
  expect(predict.evaluator?.kind).toBe("choice");
  expect(predict.choices?.map((choice) => choice.id)).toEqual([
    "none",
    "ready-zero",
    "ready-negative",
    "failed",
  ]);
  expect(run.evaluator?.kind).toBe("exact-output");
  expect(
    run.evaluator?.kind === "exact-output" ? run.evaluator.expected : "",
  ).toContain("missing");
  expect(explain.evaluator?.kind).toBe("rubric");
  expect(recall.evaluator?.kind).toBe("choice");
});

it("keeps semantic fixture coverage independent from learner prose", () => {
  for (const step of lesson.steps
    .slice(0, 6)
    .filter((item) => item.evaluator?.kind === "tests")) {
    const cases = nestedPatternFixtures[step.id];
    expect(cases, step.id).toBeDefined();
    expect(
      cases.some((item) => item.outcome === "pass"),
      step.id,
    ).toBe(true);
    expect(
      cases.some((item) => item.outcome === "assertion-failure"),
      step.id,
    ).toBe(true);
  }
  const reviewFixtures =
    nestedPatternFixtures["review-nested-pattern-matching"];
  expect(reviewFixtures.some((item) => item.name === "equivalent-if-let")).toBe(
    true,
  );
  expect(
    reviewFixtures.filter((item) => item.outcome === "assertion-failure"),
  ).toHaveLength(3);
  expect(
    reviewFixtures.find(
      (item) => item.name === "starter-rejected-missing-some",
    ),
  ).toMatchObject({
    source: review.code,
    outcome: "assertion-failure",
  });
});

const rustc = process.env.RUSTC_BIN ?? "rustc";
const review = nestedPatternReviewExercises["nested-pattern-matching"];
const testCases = [
  ...lesson.steps
    .slice(0, 6)
    .filter((step) => step.evaluator?.kind === "tests")
    .flatMap((step) =>
      nestedPatternFixtures[step.id].map((fixture) => ({
        stepId: step.id,
        evaluator: step.evaluator!,
        ...fixture,
      })),
    ),
  ...nestedPatternFixtures["review-nested-pattern-matching"].map((fixture) => ({
    stepId: review.id,
    evaluator: review.evaluator!,
    ...fixture,
  })),
];

function completed(result: SpawnSyncReturns<string>, stage: string) {
  if (result.error || result.signal || result.status === null)
    throw new Error(
      stage +
        ": infrastructure failure: " +
        (result.error?.message ?? result.signal ?? "missing status"),
    );
}

it.each(testCases)(
  "$stepId/$name: $outcome",
  ({ stepId, name, evaluator, source, outcome }) => {
    if (evaluator.kind !== "tests") throw new Error("Missing tests evaluator");
    const directory = mkdtempSync(join(tmpdir(), "nested-patterns-authored-"));
    try {
      const file = join(directory, "candidate.rs");
      const binary = join(directory, "candidate");
      writeFileSync(file, appendHiddenTests(source, evaluator.tests));
      const compiled = spawnSync(
        rustc,
        ["--edition=2024", "--test", file, "-o", binary],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 60_000,
          maxBuffer: 1024 * 1024,
        },
      );
      completed(compiled, stepId + "/" + name + "/compile");
      if (outcome === "compile-error") {
        expect(compiled.status, compiled.stderr).not.toBe(0);
        expect(
          [...compiled.stderr.matchAll(/error\[(E\d+)\]/g)].map(
            (match) => match[1],
          ),
        ).toContain("E0004");
      } else {
        expect(compiled.status, compiled.stderr).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
          maxBuffer: 1024 * 1024,
        });
        completed(executed, stepId + "/" + name + "/execute");
        const report = executed.stdout.match(
          /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/,
        );
        if (
          !report ||
          Number(report[2]) + Number(report[3]) === 0 ||
          report.slice(4).some((value) => Number(value) !== 0)
        )
          throw new Error(
            stepId + "/" + name + ": malformed/missing Rust test report",
          );
        const pass = outcome === "pass";
        expect(executed.status).toBe(pass ? 0 : 101);
        expect(report[1]).toBe(pass ? "ok" : "FAILED");
        if (pass) expect(Number(report[3])).toBe(0);
        else {
          expect(Number(report[3])).toBeGreaterThan(0);
          expect(executed.stdout + executed.stderr).toMatch(
            /assertion .*failed/,
          );
        }
        expect(
          evaluate(evaluator, {
            code: source,
            result: {
              status: pass ? "success" : "test-failure",
              stdout: executed.stdout,
              stderr: executed.stderr,
              diagnostics: [],
              durationMs: 0,
              tests: {
                passed: Number(report[2]),
                failed: Number(report[3]),
              },
            },
          }).passed,
        ).toBe(pass);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  75_000,
);

it("keeps flat-pattern practice outside nested-pattern family credit", () => {
  expect(lesson.steps.slice(6).map((step) => step.id)).toEqual([
    "patterns-if-let-predict",
    "patterns-borrow-repair",
    "patterns-let-else-repair",
    "patterns-while-let-predict",
    "patterns-delivery-transfer",
  ]);
  for (const step of lesson.steps.slice(6))
    expect(step.evidence, step.id).toEqual({ version: 2, conceptIds: [] });
});
