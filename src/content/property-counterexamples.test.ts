/** Executes only fixed property-contract fixtures authored in this repository. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import {
  propertyCounterexampleLessons,
  propertyCounterexampleReviewExercises,
} from "./property-counterexamples";
import { propertyCounterexampleAssessmentFixtures } from "./property-counterexample-assessment-fixtures";

const assessments = [
  ...propertyCounterexampleLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(propertyCounterexampleReviewExercises),
];

it("covers each counterexample coding task with an independent fixed fixture", () => {
  expect(assessments).toHaveLength(8);
  expect(propertyCounterexampleAssessmentFixtures).toHaveLength(8);
  expect(
    new Set(
      propertyCounterexampleAssessmentFixtures.map((fixture) => fixture.id),
    ).size,
  ).toBe(8);
  expect(
    propertyCounterexampleAssessmentFixtures
      .map((fixture) => fixture.id)
      .sort(),
  ).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of propertyCounterexampleAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    expect(step.solution?.trim(), fixture.id).toBeTruthy();
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant.replace(/\s+/g, ""), fixture.id).not.toBe(
      fixture.equivalent.replace(/\s+/g, ""),
    );
  }
});

it.each(propertyCounterexampleAssessmentFixtures)(
  "$id accepts the equivalent and rejects the compiling semantic mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id);
    if (!step?.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing fixture: ${fixture.id}`);
    const directory = mkdtempSync(
      join(tmpdir(), "property-counterexample-assessment-"),
    );
    try {
      for (const [name, source, shouldPass] of [
        ["canonical", step.solution, true],
        ["equivalent", fixture.equivalent, true],
        ["mutant", fixture.mutant, false],
      ] as const) {
        const file = join(directory, `${name}.rs`);
        const binary = join(directory, name);
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
        expect(
          compiled.error,
          `${fixture.id}/${name}: compiler infrastructure`,
        ).toBeUndefined();
        expect(
          compiled.signal,
          `${fixture.id}/${name}: compiler signal`,
        ).toBeNull();
        expect(
          compiled.status,
          `${fixture.id}/${name}: ${compiled.stderr}`,
        ).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
          maxBuffer: 1024 * 1024,
        });
        const output = executed.stdout + executed.stderr;
        expect(
          executed.error,
          `${fixture.id}/${name}: runner infrastructure`,
        ).toBeUndefined();
        expect(
          executed.signal,
          `${fixture.id}/${name}: runner signal`,
        ).toBeNull();
        expect(executed.status, `${fixture.id}/${name}: ${output}`).toBe(
          shouldPass ? 0 : 101,
        );
        expect(output, `${fixture.id}/${name}: Rust report`).toMatch(
          shouldPass
            ? /test result: ok\. [1-9]\d* passed;/
            : /test result: FAILED\./,
        );
        const counts = output.match(
          /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/,
        );
        expect(counts, `${fixture.id}/${name}: test counts`).not.toBeNull();
        const result = evaluate(step.evaluator, {
          code: source,
          result: {
            status: executed.status === 0 ? "success" : "test-failure",
            stdout: executed.stdout,
            stderr: executed.stderr,
            diagnostics: [],
            durationMs: 0,
            tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
          },
        });
        expect(
          result.passed,
          `${fixture.id}/${name}: production evaluator`,
        ).toBe(shouldPass);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);
