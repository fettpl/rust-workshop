/** Runs fixed repository-authored candidates only; never learner/imported Rust. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import {
  coreConversionsLessons,
  coreConversionsConcepts,
  coreConversionsCompetencies,
  coreConversionsSources,
  coreConversionsReviewExercises,
} from "./core-conversions";
import { coreConversionsFixtures } from "./core-conversions-fixtures";

const both = ["from-owned-conversions", "asref-borrowed-views"];
const ids = [
  "conversions-predict",
  "conversions-run",
  "conversions-read-api",
  "conversions-label-repair",
  "conversions-samples-transfer",
  "conversions-explain",
  "conversions-recall",
];
const tasks = [
  ...coreConversionsLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(coreConversionsReviewExercises),
];

it("exports the fixed lesson, sources, concepts and narrow evidence contracts", () => {
  expect(coreConversionsLessons).toHaveLength(1);
  const lesson = coreConversionsLessons[0];
  expect(lesson).toMatchObject({
    id: "conversion-ownership-views",
    moduleId: "traits",
    prerequisites: ["trait-dispatch"],
    minutes: 20,
    conceptIds: both,
    competencyIds: ["consume-conversion-apis"],
  });
  expect(lesson.steps.map((step) => step.id)).toEqual(ids);
  expect(coreConversionsConcepts.map((concept) => concept.id)).toEqual(both);
  for (const concept of coreConversionsConcepts)
    expect(concept.prerequisites).toEqual([
      "trait-contract",
      "trait-consumers",
    ]);
  expect(
    coreConversionsCompetencies.map((competency) => competency.id),
  ).toEqual(["consume-conversion-apis"]);
  expect(coreConversionsSources.map((source) => source.id)).toEqual([
    "core-conversions-std-from",
    "core-conversions-std-asref",
  ]);
  expect(coreConversionsSources.map((source) => source.url)).toEqual([
    "https://doc.rust-lang.org/std/convert/trait.From.html",
    "https://doc.rust-lang.org/std/convert/trait.AsRef.html",
  ]);
  for (const source of coreConversionsSources)
    expect(source).toMatchObject({
      classification: "dynamic",
      reviewedAt: "2026-10-07",
    });
  expect(lesson.steps.map((step) => step.evidence?.conceptIds)).toEqual([
    both,
    both,
    [both[1]],
    [both[1]],
    both,
    both,
    both,
  ]);
  for (const step of lesson.steps) expect(step.evidence?.version).toBe(2);
  expect(
    lesson.steps
      .filter((step) => step.evidenceGate)
      .map((step) => [step.id, step.evidenceKind]),
  ).toEqual([
    [ids[2], "transfer"],
    [ids[3], "fix"],
    [ids[4], "assessment"],
  ]);
  expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(1);
  expect(lesson.steps[4].code).toBe("");
  expect(lesson.steps[3]).toMatchObject({
    expectedStatus: "compile-error",
    expectedError: "E0277",
  });
  expect(Object.keys(coreConversionsReviewExercises)).toEqual(both);
  expect(
    Object.values(coreConversionsReviewExercises).map((step) => step.id),
  ).toEqual(["review-from-owned-conversions", "review-asref-borrowed-views"]);
  for (const [concept, step] of Object.entries(
    coreConversionsReviewExercises,
  )) {
    expect(step.evidence).toMatchObject({ version: 2, conceptIds: [concept] });
    expect(step.kind).not.toBe("blank");
  }
  expect(tasks).toHaveLength(5);
  expect(Object.keys(coreConversionsFixtures)).toEqual(
    tasks.map((step) => step.id),
  );
  for (const step of tasks) {
    expect(step.hints).toHaveLength(2);
    expect(step.solution?.trim()).toBeTruthy();
    const candidates = coreConversionsFixtures[step.id];
    expect(candidates.some((candidate) => candidate.outcome === "pass")).toBe(
      true,
    );
    expect(
      candidates.some((candidate) => candidate.outcome === "assertion-failure"),
    ).toBe(true);
    for (const candidate of candidates.filter(
      (item) => item.outcome === "pass",
    )) {
      expect(candidate.source.replace(/\s+/g, "")).not.toBe(
        step.solution!.replace(/\s+/g, ""),
      );
    }
  }
});

function completed(result: SpawnSyncReturns<string>, stage: string) {
  if (result.error || result.signal || result.status === null)
    throw new Error(
      `${stage}: infrastructure failure: ${result.error?.message ?? result.signal ?? "missing exit status"}`,
    );
}

const cases = tasks.flatMap((step) => [
  { step, name: "reference", source: step.solution!, outcome: "pass" as const },
  ...(step.code
    ? [
        {
          step,
          name: "starter",
          source: step.code,
          outcome:
            step.expectedStatus === "compile-error"
              ? ("E0277" as const)
              : ("assertion-failure" as const),
        },
      ]
    : []),
  ...coreConversionsFixtures[step.id].map((candidate) => ({
    step,
    ...candidate,
  })),
]);
it.each(cases)(
  "$step.id/$name: $outcome",
  ({ step, name, source, outcome }) => {
    if (step.evaluator?.kind !== "tests")
      throw new Error(`Missing tests: ${step.id}`);
    const directory = mkdtempSync(join(tmpdir(), "core-conversions-authored-"));
    try {
      const file = join(directory, "candidate.rs");
      const binary = join(directory, "candidate");
      writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 60_000,
          maxBuffer: 1024 * 1024,
        },
      );
      completed(compiled, `${step.id}/${name}/compile`);
      if (outcome === "E0277") {
        expect(compiled.status, compiled.stderr).not.toBe(0);
        const errors = [...compiled.stderr.matchAll(/error\[(E\d+)\]/g)].map(
          (match) => match[1],
        );
        expect(errors.length).toBeGreaterThan(0);
        expect(new Set(errors)).toEqual(new Set(["E0277"]));
        expect(compiled.stderr).not.toMatch(
          /error: (?:expected|aborting due to 0)/,
        );
        return;
      }
      expect(compiled.status, compiled.stderr).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
        maxBuffer: 1024 * 1024,
      });
      completed(executed, `${step.id}/${name}/execute`);
      const report = executed.stdout.match(
        /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/,
      );
      if (
        !report ||
        Number(report[2]) + Number(report[3]) === 0 ||
        report.slice(4).some((value) => Number(value) !== 0)
      )
        throw new Error(
          `${step.id}/${name}: malformed/missing Rust test report`,
        );
      const shouldPass = outcome === "pass";
      expect(executed.status, executed.stdout + executed.stderr).toBe(
        shouldPass ? 0 : 101,
      );
      expect(report[1]).toBe(shouldPass ? "ok" : "FAILED");
      expect(Number(report[3])).toBe(shouldPass ? 0 : 1);
      if (!shouldPass)
        expect(executed.stdout + executed.stderr).toMatch(/assertion .*failed/);
      expect(
        evaluate(step.evaluator, {
          code: source,
          result: {
            status: shouldPass ? "success" : "test-failure",
            stdout: executed.stdout,
            stderr: executed.stderr,
            diagnostics: [],
            durationMs: 0,
            tests: { passed: Number(report[2]), failed: Number(report[3]) },
          },
        }).passed,
      ).toBe(shouldPass);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  75_000,
);

it("runs the standard conversion example with its exact output", () => {
  const step = coreConversionsLessons[0].steps[1];
  if (step.evaluator?.kind !== "exact-output" || !step.code)
    throw new Error("Missing conversion run");
  const directory = mkdtempSync(join(tmpdir(), "core-conversions-run-"));
  try {
    const file = join(directory, "run.rs");
    const binary = join(directory, "run");
    writeFileSync(file, step.code);
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", file, "-o", binary],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      },
    );
    completed(compiled, "run/compile");
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, [], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
    });
    completed(executed, "run/execute");
    expect(executed.status, executed.stderr).toBe(0);
    expect(executed.stdout).toBe(step.evaluator.expected);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 75_000);
