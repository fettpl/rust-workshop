import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  capstoneIntegrationLessons,
  capstoneIntegrationReviewExercises,
} from "./capstone-integration";
import { capstoneIntegrationAssessmentFixtures } from "./capstone-integration-assessment-fixtures";

const assessments = [
  ...capstoneIntegrationLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(capstoneIntegrationReviewExercises),
];

it("pokrywa dokładnie 35 stałe kontrakty i odrzuca każdy kompilujący mutant", () => {
  expect(capstoneIntegrationAssessmentFixtures).toHaveLength(35);
  expect(
    capstoneIntegrationAssessmentFixtures.map((fixture) => fixture.id).sort(),
  ).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of capstoneIntegrationAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    expect(step.solution, fixture.id).toBeTruthy();
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant.replace(/\s+/g, ""), fixture.id).not.toBe(
      fixture.equivalent.replace(/\s+/g, ""),
    );
  }
});

it.each(capstoneIntegrationAssessmentFixtures)(
  "$id passes canonical/equivalent and rejects its compiling mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id);
    if (!step?.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Brak kontraktu: ${fixture.id}`);
    const directory = mkdtempSync(join(tmpdir(), "capstone-assessment-"));
    try {
      const namedTest = step.evaluator.tests.match(/fn\s+([A-Za-z0-9_]+)/)?.[1];
      expect(namedTest, `${fixture.id}: named assertion test`).toBeTruthy();
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
        const executed = spawnSync(binary, ["--test-threads=1"], {
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
        expect(output).toMatch(
          /test result: (ok|FAILED)\. \d+ passed; \d+ failed;/,
        );
        expect(output).not.toMatch(/running 0 tests/);
        if (!shouldPass) {
          expect(output).toContain(`::${namedTest}`);
          expect(output).toMatch(/FAILED/);
          expect(output).toMatch(/assertion failed|panicked at/);
        }
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);

it("każdy starter kompiluje się, ale kończy się nieukończonym zachowaniem", () => {
  const directory = mkdtempSync(join(tmpdir(), "capstone-starters-"));
  try {
    for (const step of assessments) {
      if (step.evaluator?.kind !== "tests" || !step.code) continue;
      const file = join(directory, `${step.id}.rs`);
      const binary = join(directory, step.id);
      writeFileSync(file, appendHiddenTests(step.code, step.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.status, step.id).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(executed.status, step.id).toBe(101);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 240_000);
