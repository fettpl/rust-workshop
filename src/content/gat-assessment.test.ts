/** Executes only fixed repository-authored GAT fixtures, never learner drafts. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import {
  gatProducerLessons,
  gatProducerReviewExercises,
} from "./gat-producers";
import {
  gatConsumerLessons,
  gatConsumerReviewExercises,
} from "./gat-consumers";
import { gatProducerAssessmentFixtures } from "./gat-producer-assessment-fixtures";
import { gatConsumerAssessmentFixtures } from "./gat-consumer-assessment-fixtures";

const assessments = [
  ...[...gatProducerLessons, ...gatConsumerLessons].flatMap((lesson) =>
    lesson.steps.filter((step) => step.evidenceGate),
  ),
  ...Object.values(gatProducerReviewExercises),
  ...Object.values(gatConsumerReviewExercises),
];
const fixtures = [
  ...gatProducerAssessmentFixtures,
  ...gatConsumerAssessmentFixtures,
];

it("covers every GAT gate and retrieval with a distinct fixed semantic challenge", () => {
  expect(assessments).toHaveLength(12);
  expect(fixtures).toHaveLength(12);
  expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(12);
  expect(fixtures.map((fixture) => fixture.id).sort()).toEqual(
    assessments.map((step) => step.id).sort(),
  );
  for (const fixture of fixtures) {
    const step = assessments.find((item) => item.id === fixture.id)!;
    expect(step.evaluator?.kind).toBe("tests");
    expect(step.solution?.trim()).toBeTruthy();
    expect(fixture.equivalent.trim()).toBeTruthy();
    expect(fixture.mutant.trim()).toBeTruthy();
    expect(fixture.equivalent).not.toBe(step.solution);
    expect(
      fixture.equivalent.replace(/\s+/g, ""),
      `${fixture.id}: an equivalent must change more than formatting`,
    ).not.toBe(step.solution!.replace(/\s+/g, ""));
    expect(fixture.mutant).not.toBe(step.solution);
    expect(fixture.mutant).not.toBe(fixture.equivalent);
  }
});

it.each(fixtures)(
  "$id accepts an equivalent answer and rejects a compiling semantic mutant",
  (fixture) => {
    const step = assessments.find((item) => item.id === fixture.id);
    if (!step?.solution || step.evaluator?.kind !== "tests") {
      throw new Error(`Missing authored Rust assessment: ${fixture.id}`);
    }
    const directory = mkdtempSync(join(tmpdir(), "gat-authored-assessment-"));
    try {
      const variants: [string, string, boolean, boolean][] = [
        ["canonical", step.solution, true, true],
        ["equivalent", fixture.equivalent, true, true],
        ["mutant", fixture.mutant, false, false],
      ];
      const restrictedReplacements: Record<string, [string, string]> = {
        "gat-overlapping-mutable-windows-gate": [
          "self.data.get_mut(start..end)",
          "Some(unsafe { std::slice::from_raw_parts_mut(self.data.as_mut_ptr().add(start), end - start) })",
        ],
        "gat-overlapping-mutable-windows-blank": [
          "self.data.get_mut(..end)",
          "Some(unsafe { std::slice::from_raw_parts_mut(self.data.as_mut_ptr(), end) })",
        ],
      };
      const replacement = restrictedReplacements[fixture.id];
      if (replacement) {
        const restricted = step.solution.replace(...replacement);
        expect(restricted).not.toBe(step.solution);
        // Correct behavior alone cannot satisfy the explicit safe-Rust task.
        variants.push(["forbidden-unsafe", restricted, true, false]);
      }
      for (const [name, source, shouldPass, assessmentShouldPass] of variants) {
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
        const label = `${fixture.id}/${name}`;
        expect(
          compiled.error,
          `${label}: compiler infrastructure`,
        ).toBeUndefined();
        expect(compiled.signal, `${label}: compiler signal`).toBeNull();
        expect(compiled.status, `${label}: ${compiled.stderr}`).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
          maxBuffer: 1024 * 1024,
        });
        expect(
          executed.error,
          `${label}: execution infrastructure`,
        ).toBeUndefined();
        expect(executed.signal, `${label}: execution signal`).toBeNull();
        const output = executed.stdout + executed.stderr;
        if (shouldPass) {
          expect(executed.status, `${label}: ${output}`).toBe(0);
          expect(output, label).toMatch(/test result: ok\. [1-9]\d* passed;/);
        } else {
          expect(executed.status, `${label}: ${output}`).toBe(101);
          expect(output, label).toMatch(/test result: FAILED\./);
          expect(output, label).toMatch(/[1-9]\d* failed;/);
        }
        const counts = executed.stdout.match(
          /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/,
        );
        expect(counts, `${label}: real Rust test report`).not.toBeNull();
        const outcome = evaluate(step.evaluator, {
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
        expect(outcome.passed, `${label}: production evaluator`).toBe(
          assessmentShouldPass,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);
