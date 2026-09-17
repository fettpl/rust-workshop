import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import {
  propertyFoundationCompetencies,
  propertyFoundationConcepts,
  propertyFoundationLessons,
  propertyFoundationReviewExercises,
  propertyFoundationSources,
} from "./property-foundations";
import { propertyFoundationAssessmentFixtures } from "./property-foundation-assessment-fixtures";

function step(id: string) {
  for (const lesson of propertyFoundationLessons) {
    const found = lesson.steps.find((candidate) => candidate.id === id);
    if (found) return found;
  }
  const review = Object.values(propertyFoundationReviewExercises).find(
    (candidate) => candidate.id === id,
  );
  if (!review) throw new Error(`missing property foundation step ${id}`);
  return review;
}

describe("property contract foundations", () => {
  it("keeps two independent lessons with gates, blanks, and review exercises", () => {
    expect(propertyFoundationLessons.map((lesson) => lesson.id)).toEqual([
      "property-invariants",
      "property-generated-inputs",
    ]);
    expect(propertyFoundationConcepts.map((concept) => concept.id)).toEqual([
      "property-invariant-contracts",
      "property-generated-inputs",
    ]);
    expect(propertyFoundationCompetencies).toHaveLength(2);
    expect(propertyFoundationSources).toHaveLength(4);

    for (const lesson of propertyFoundationLessons) {
      const gate = step(`${lesson.id}-gate`);
      const blank = step(`${lesson.id}-blank`);
      expect(gate.evaluator?.kind).toBe("tests");
      expect(gate.evidenceGate).toBe(true);
      expect(blank.code).toBeUndefined();
      expect(blank.evaluator?.kind).toBe("tests");
      expect(blank.evidenceGate).toBe(true);
      expect(
        propertyFoundationReviewExercises[lesson.conceptIds[0]],
      ).toBeDefined();
    }
  });

  it("accepts both authored coding solutions and rejects meaningful mutants", () => {
    const results = verifyTrustedRust({
      lessons: propertyFoundationLessons,
      reviewExercises: propertyFoundationReviewExercises,
      traces: {},
    });
    expect(
      results.filter((result) => !result.passed),
      JSON.stringify(results, null, 2),
    ).toEqual([]);
  }, 120_000);

  it("keeps an independent fixture for every foundations gate and review", () => {
    const assessments = [
      ...propertyFoundationLessons.flatMap((lesson) =>
        lesson.steps.filter(
          (candidate) =>
            candidate.evidenceGate && candidate.evaluator?.kind === "tests",
        ),
      ),
      ...Object.values(propertyFoundationReviewExercises),
    ];
    expect(propertyFoundationAssessmentFixtures).toHaveLength(
      assessments.length,
    );
    expect(
      propertyFoundationAssessmentFixtures.map((fixture) => fixture.id).sort(),
    ).toEqual(assessments.map((candidate) => candidate.id).sort());
    for (const fixture of propertyFoundationAssessmentFixtures) {
      const assessment = assessments.find(
        (candidate) => candidate.id === fixture.id,
      );
      expect(assessment?.solution?.trim(), fixture.id).toBeTruthy();
      expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
        assessment!.solution!.replace(/\s+/g, ""),
      );
      expect(fixture.mutant.replace(/\s+/g, ""), fixture.id).not.toBe(
        fixture.equivalent.replace(/\s+/g, ""),
      );
    }
  });

  it.each(propertyFoundationAssessmentFixtures)(
    "$id accepts an equivalent and rejects a compiling semantic mutant",
    (fixture) => {
      const assessment = [
        ...propertyFoundationLessons.flatMap((lesson) =>
          lesson.steps.filter(
            (candidate) =>
              candidate.evidenceGate && candidate.evaluator?.kind === "tests",
          ),
        ),
        ...Object.values(propertyFoundationReviewExercises),
      ].find((candidate) => candidate.id === fixture.id);
      if (!assessment?.solution || assessment.evaluator?.kind !== "tests") {
        throw new Error(`Missing fixture: ${fixture.id}`);
      }
      const directory = mkdtempSync(
        join(tmpdir(), "property-foundation-assessment-"),
      );
      try {
        for (const [name, source, shouldPass] of [
          ["canonical", assessment.solution, true],
          ["equivalent", fixture.equivalent, true],
          ["mutant", fixture.mutant, false],
        ] as const) {
          const file = join(directory, `${name}.rs`);
          const binary = join(directory, name);
          writeFileSync(
            file,
            appendHiddenTests(source, assessment.evaluator.tests),
          );
          const compiled = spawnSync(
            "rustc",
            ["--edition=2024", "--test", file, "-o", binary],
            { cwd: directory, encoding: "utf8", timeout: 60_000 },
          );
          expect(
            compiled.error,
            `${fixture.id}/${name}: compiler infrastructure`,
          ).toBeUndefined();
          expect(
            compiled.signal,
            `${fixture.id}/${name}: compiler signal`,
          ).toBe(null);
          expect(
            compiled.status,
            `${fixture.id}/${name}: ${compiled.stderr}`,
          ).toBe(0);

          const executed = spawnSync(binary, ["--test-threads=1"], {
            cwd: directory,
            encoding: "utf8",
            timeout: 8_000,
          });
          const output = executed.stdout + executed.stderr;
          expect(
            executed.error,
            `${fixture.id}/${name}: runner infrastructure`,
          ).toBeUndefined();
          expect(executed.signal, `${fixture.id}/${name}: runner signal`).toBe(
            null,
          );
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
          const result = evaluate(assessment.evaluator, {
            code: source,
            result: {
              status: executed.status === 0 ? "success" : "test-failure",
              stdout: executed.stdout,
              stderr: executed.stderr,
              diagnostics: [],
              durationMs: 0,
              tests: {
                passed: Number(counts![1]),
                failed: Number(counts![2]),
              },
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
});
