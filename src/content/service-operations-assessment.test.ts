import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import {
  serviceOperationsLessons,
  serviceOperationsReviewExercises,
} from "./service-operations";
import { serviceOperationsAssessmentFixtures } from "./service-operations-assessment-fixtures";

const assessments = [
  ...serviceOperationsLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(serviceOperationsReviewExercises),
];

const primaryGateIds = [
  "trust-admission-gate",
  "trust-admission-budget-gate",
  "telemetry-correlation-gate",
  "telemetry-correlation-allowlist-gate",
  "readiness-drain-gate",
  "readiness-drain-accounting-gate",
  "incident-diagnosis-gate",
  "incident-diagnosis-evidence-gate",
];

const retrievalIds = [
  "trust-admission-recall",
  "telemetry-correlation-recall",
  "readiness-drain-recall",
  "incident-diagnosis-recall",
];

it("covers every Service Operations coding task with an equivalent and mutant", () => {
  expect(serviceOperationsAssessmentFixtures).toHaveLength(24);
  expect(
    serviceOperationsAssessmentFixtures.map((fixture) => fixture.id).sort(),
  ).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of serviceOperationsAssessmentFixtures) {
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

it("keeps primary gates and retrievals incomplete while preserving their solutions", () => {
  for (const id of [...primaryGateIds, ...retrievalIds]) {
    const step = assessments.find((candidate) => candidate.id === id);
    expect(step?.code, id).toBeTruthy();
    expect(step?.solution, id).toBeTruthy();
    expect(step?.code, id).not.toBe(step?.solution);
    expect(step?.code, id).toContain("todo!()");
  }
});

it.each(serviceOperationsAssessmentFixtures)(
  "$id accepts the equivalent and rejects its deterministic mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id);
    if (!step?.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing Service Operations task: ${fixture.id}`);
    const directory = mkdtempSync(join(tmpdir(), "service-operations-"));
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
