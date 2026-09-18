import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { unsafeFfiLessons, unsafeFfiReviewExercises } from "./unsafe-ffi";
import { unsafeFfiAssessmentFixtures } from "./unsafe-ffi-assessment-fixtures";

const assessments = [
  ...unsafeFfiLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(unsafeFfiReviewExercises),
];

it("covers every unsafe FFI coding task with valid and mutant fixtures", () => {
  expect(unsafeFfiAssessmentFixtures).toHaveLength(assessments.length);
  expect(
    unsafeFfiAssessmentFixtures.map((fixture) => fixture.id).sort(),
  ).toEqual(assessments.map((step) => step.id).sort());

  for (const fixture of unsafeFfiAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id);
    expect(step?.solution?.trim(), fixture.id).toBeTruthy();
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step!.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant.replace(/\s+/g, ""), fixture.id).not.toBe(
      fixture.equivalent.replace(/\s+/g, ""),
    );
  }
});

it.each(unsafeFfiAssessmentFixtures)(
  "$id accepts the valid fixture and rejects its semantic mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id);
    if (!step?.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing unsafe FFI fixture: ${fixture.id}`);
    const directory = mkdtempSync(join(tmpdir(), "unsafe-ffi-assessment-"));
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
          { cwd: directory, encoding: "utf8", timeout: 60_000 },
        );
        expect(
          compiled.error,
          `${fixture.id}/${name}: compiler`,
        ).toBeUndefined();
        expect(
          compiled.signal,
          `${fixture.id}/${name}: compiler signal`,
        ).toBeNull();
        expect(
          compiled.status,
          `${fixture.id}/${name}: ${compiled.stderr}`,
        ).toBe(0);
        const executed = spawnSync(binary, [], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        const output = executed.stdout + executed.stderr;
        expect(executed.error, `${fixture.id}/${name}: runner`).toBeUndefined();
        expect(
          executed.signal,
          `${fixture.id}/${name}: runner signal`,
        ).toBeNull();
        expect(executed.status, `${fixture.id}/${name}: ${output}`).toBe(
          shouldPass ? 0 : 101,
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
        expect(result.passed, `${fixture.id}/${name}: evaluator`).toBe(
          shouldPass,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);
