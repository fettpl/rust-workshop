import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  coreCheckedConversionsLessons,
  coreCheckedConversionsConcepts,
  coreCheckedConversionsCompetencies,
  coreCheckedConversionsSources,
  coreCheckedConversionsReviewExercises,
} from "./core-checked-conversions";
import { coreCheckedConversionFixtures } from "./core-checked-conversions-fixtures";

const stepIds = [
  "checked-predict",
  "checked-run",
  "checked-read-api",
  "checked-level-repair",
  "checked-percent-transfer",
  "checked-explain",
  "checked-recall",
];
const lesson = coreCheckedConversionsLessons[0];
const review =
  coreCheckedConversionsReviewExercises["checked-conversion-errors"];
function step(id: string) {
  const found = [...lesson.steps, review].find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing authored step ${id}`);
  return found;
}
function completed(result: SpawnSyncReturns<string>, id: string) {
  if (result.error || result.signal || result.status === null) {
    throw new Error(
      `${id}: infrastructure failure: ${String(result.error ?? result.signal ?? "missing exit status")}`,
    );
  }
}
function reportCounts(result: SpawnSyncReturns<string>, id: string) {
  completed(result, id);
  const match = result.stdout.match(
    /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/,
  );
  if (
    !match ||
    Number(match[2]) + Number(match[3]) < 1 ||
    Number(match[4]) !== 0 ||
    Number(match[6]) !== 0
  ) {
    throw new Error(
      `${id}: infrastructure failure: missing/malformed/empty test report`,
    );
  }
  const passed = Number(match[2]),
    failed = Number(match[3]);
  if (
    (match[1] === "ok") !== (failed === 0) ||
    (result.status === 0) !== (failed === 0)
  ) {
    throw new Error(`${id}: infrastructure failure: inconsistent test report`);
  }
  return { passed, failed };
}
function rustCase(
  id: string,
  source: string,
  tests?: string,
  diagnostic?: string,
  success = true,
  output?: string,
) {
  const directory = mkdtempSync(join(tmpdir(), "core-checked-contract-"));
  try {
    const file = join(directory, "fixture.rs"),
      binary = join(directory, "fixture");
    writeFileSync(file, tests ? appendHiddenTests(source, tests) : source);
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", ...(tests ? ["--test"] : []), file, "-o", binary],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      },
    );
    completed(compiled, `${id}: rustc`);
    const logDirectory = process.env.CORE_CHECKED_LOG_DIR;
    if (logDirectory) {
      mkdirSync(logDirectory, { recursive: true });
      writeFileSync(
        join(logDirectory, `${id}-compile.log`),
        `${compiled.stdout}${compiled.stderr}`,
      );
    }
    if (diagnostic) {
      expect(compiled.status, `${id}: unexpectedly compiled`).not.toBe(0);
      expect(compiled.stderr, id).toContain(`error[${diagnostic}]`);
      return;
    }
    expect(
      compiled.status,
      `${id}: semantic fixture must compile\n${compiled.stderr}`,
    ).toBe(0);
    const executed = spawnSync(binary, tests ? ["--test-threads=1"] : [], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
    });
    completed(executed, `${id}: executable`);
    if (logDirectory)
      writeFileSync(
        join(logDirectory, `${id}-run.log`),
        `${executed.stdout}${executed.stderr}`,
      );
    if (tests) {
      const counts = reportCounts(executed, id);
      expect(
        executed.status === 0,
        `${id}: ${executed.stdout}${executed.stderr}`,
      ).toBe(success);
      if (success) expect(counts.failed, id).toBe(0);
      else {
        expect(counts.failed, id).toBeGreaterThan(0);
        expect(`${executed.stdout}${executed.stderr}`, id).toMatch(
          /assertion .*failed/,
        );
      }
    } else {
      expect(executed.status, `${id}: ${executed.stderr}`).toBe(0);
      expect(executed.stdout).toBe(output);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("checked conversion authoring contracts", () => {
  it("exports the fixed lesson, concept, competency, source and review", () => {
    expect(coreCheckedConversionsLessons.map((entry) => entry.id)).toEqual([
      "checked-conversions",
    ]);
    expect(lesson.moduleId).toBe("traits");
    expect(lesson.prerequisites).toEqual(["conversion-ownership-views"]);
    expect(lesson.minutes).toBe(20);
    expect(lesson.steps.map((entry) => entry.id)).toEqual(stepIds);
    expect(
      coreCheckedConversionFixtures.map((fixture) => fixture.stepId),
    ).toEqual([
      "checked-read-api",
      "checked-level-repair",
      "checked-percent-transfer",
      "review-checked-conversion-errors",
    ]);
    expect(coreCheckedConversionsConcepts.map((entry) => entry.id)).toEqual([
      "checked-conversion-errors",
    ]);
    expect(coreCheckedConversionsConcepts[0].prerequisites).toEqual([
      "associated-output",
      "result-recoverable",
    ]);
    expect(coreCheckedConversionsConcepts[0].competencyIds).toEqual([
      "validate-conversion-inputs",
    ]);
    expect(
      coreCheckedConversionsConcepts[0].evidenceCalibration,
    ).toBeUndefined();
    expect(coreCheckedConversionsCompetencies.map((entry) => entry.id)).toEqual(
      ["validate-conversion-inputs"],
    );
    expect(coreCheckedConversionsSources).toMatchObject([
      {
        id: "core-conversions-std-tryfrom",
        url: "https://doc.rust-lang.org/std/convert/trait.TryFrom.html",
        classification: "dynamic",
        reviewedAt: "2026-10-07",
      },
    ]);
    expect(coreCheckedConversionsSources).toHaveLength(1);
    expect(coreCheckedConversionsSources[0].recheckPolicy).toMatch(
      /TryFrom|Error/,
    );
    expect(Object.keys(coreCheckedConversionsReviewExercises)).toEqual([
      "checked-conversion-errors",
    ]);
    expect(review.id).toBe("review-checked-conversion-errors");
    expect(review.code?.trim().length).toBeGreaterThan(0);
    for (const entry of [...lesson.steps, review]) {
      expect(entry.evidence?.version, entry.id).toBe(2);
      expect(entry.evidence?.conceptIds, entry.id).toEqual([
        "checked-conversion-errors",
      ]);
    }
    for (const id of stepIds.slice(2, 5)) {
      const entry = step(id);
      expect(entry.evaluator?.kind, id).toBe("tests");
      expect(entry.evidenceGate, id).toBe(true);
      expect(entry.evidence?.codingTaskId, id).toBe(id);
      expect(entry.hints, id).toHaveLength(2);
      expect(entry.solution, id).toBeTruthy();
      expect(entry.solution, id).not.toBe(entry.code);
    }
    expect(step("checked-read-api").evidenceKind).toBe("transfer");
    expect(step("checked-level-repair").evidenceKind).toBe("fix");
    expect(step("checked-level-repair").expectedError).toBe("E0277");
    expect(step("checked-percent-transfer").evidenceKind).toBe("assessment");
    expect(step("checked-percent-transfer").code ?? "").toBe("");
    expect(step("checked-read-api").prompt).toContain(
      "fn try_from(value: T) -> Result<Self, Self::Error>",
    );
    expect(step("checked-read-api").prompt).toContain(
      "https://doc.rust-lang.org/std/convert/trait.TryFrom.html",
    );
    expect(step("checked-explain").evaluator?.kind).toBe("rubric");
    expect(step("checked-run").evidenceKind).toBe("exposure");
    expect(lesson.outcomes.length).toBeGreaterThan(0);
    expect(lesson.misconceptions.length).toBeGreaterThan(0);
    expect(lesson.transferTask).toBeTruthy();
    expect(lesson.evidenceGate).toBeTruthy();
    expect(lesson.sourceIds).toEqual(["core-conversions-std-tryfrom"]);
  });
  it("fails closed for infrastructure and malformed reports", () => {
    const normal = {
      status: 0,
      signal: null,
      error: undefined,
      stdout:
        "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;",
      stderr: "",
    } as SpawnSyncReturns<string>;
    for (const broken of [
      { error: new Error("ENOENT") },
      { error: new Error("ETIMEDOUT") },
      { error: new Error("ENOBUFS") },
      { signal: "SIGTERM" },
      { status: null },
      { stdout: "" },
      {
        stdout:
          "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;",
      },
      { status: 1 },
    ]) {
      expect(() =>
        reportCounts(
          { ...normal, ...broken } as SpawnSyncReturns<string>,
          "injected",
        ),
      ).toThrow(/infrastructure failure/);
    }
  });
  it("checks the standard conversion output", () => {
    const entry = step("checked-run");
    if (entry.evaluator?.kind !== "exact-output")
      throw new Error("Missing run output evaluator");
    rustCase(
      entry.id,
      entry.code!,
      undefined,
      undefined,
      true,
      entry.evaluator.expected,
    );
  }, 75_000);
});

for (const fixture of coreCheckedConversionFixtures) {
  const entry = step(fixture.stepId);
  if (entry.evaluator?.kind !== "tests")
    throw new Error(`Missing tests: ${entry.id}`);
  const tests = entry.evaluator.tests;
  it(
    `${fixture.stepId}: solution satisfies the public contract`,
    () => rustCase(`${fixture.stepId}-solution`, entry.solution!, tests),
    75_000,
  );
  it(
    `${fixture.stepId}: alternate satisfies the public contract`,
    () => rustCase(`${fixture.stepId}-alternate`, fixture.alternate, tests),
    75_000,
  );
  for (const [name, source] of Object.entries(fixture.semanticMutants)) {
    it(
      `${fixture.stepId}: compiled mutant ${name} fails assertions`,
      () =>
        rustCase(`${fixture.stepId}-${name}`, source, tests, undefined, false),
      75_000,
    );
  }
  for (const [name, mutant] of Object.entries(fixture.diagnosticMutants)) {
    it(
      `${fixture.stepId}: diagnostic mutant ${name} emits ${mutant.code}`,
      () =>
        rustCase(
          `${fixture.stepId}-${name}`,
          mutant.source,
          tests,
          mutant.code,
        ),
      75_000,
    );
  }
}
