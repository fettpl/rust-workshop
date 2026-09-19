import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { asyncLendingAssessmentFixtures } from "./async-lending-assessment-fixtures";
import {
  asyncLendingCoreLessons,
  asyncLendingCoreReviewExercises,
} from "./async-lending-core";
import {
  asyncLendingBoundaryLessons,
  asyncLendingBoundaryReviewExercises,
} from "./async-lending-boundaries";

const assessments = [
  ...asyncLendingCoreLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...asyncLendingBoundaryLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(asyncLendingCoreReviewExercises),
  ...Object.values(asyncLendingBoundaryReviewExercises),
];

it("covers ten gates and five independent reviews with distinct equivalents and compiling mutants", () => {
  expect(assessments).toHaveLength(15);
  expect(asyncLendingAssessmentFixtures).toHaveLength(15);
  expect(
    asyncLendingAssessmentFixtures.map((fixture) => fixture.id).sort(),
  ).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of asyncLendingAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant, fixture.id).not.toBe(fixture.equivalent);
  }
});

it.each(asyncLendingAssessmentFixtures)(
  "$id accepts its equivalent and rejects its behavior mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    if (!step.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing test step ${fixture.id}`);
    const directory = mkdtempSync(join(tmpdir(), "async-lending-assessment-"));
    try {
      for (const [name, source, expected] of [
        ["canonical", step.solution, 0],
        ["equivalent", fixture.equivalent, 0],
        ["mutant", fixture.mutant, 101],
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
          compiled.status,
          `${fixture.id}/${name}: ${compiled.stderr}`,
        ).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(
          executed.status,
          `${fixture.id}/${name}: ${executed.stdout}${executed.stderr}`,
        ).toBe(expected);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);

const reviewSteps = [
  ...Object.values(asyncLendingCoreReviewExercises),
  ...Object.values(asyncLendingBoundaryReviewExercises),
];

it.each(reviewSteps)(
  "$id rejects the unchanged canonical gate solution",
  (review) => {
    const canonical = assessments.find(
      (step) => step.id === review.id.replace("-review", "-gate"),
    );
    if (!canonical?.solution || review.evaluator?.kind !== "tests")
      throw new Error(`Missing canonical pair for ${review.id}`);
    const directory = mkdtempSync(join(tmpdir(), "async-lending-review-"));
    try {
      const file = join(directory, "review.rs");
      writeFileSync(
        file,
        appendHiddenTests(canonical.solution, review.evaluator.tests),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", join(directory, "review")],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.status, `${review.id}: ${compiled.stderr}`).not.toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  120_000,
);

it("rejects the Send gate starter because it borrows Rc across await", () => {
  const lesson = asyncLendingBoundaryLessons.find(
    (candidate) => candidate.id === "async-lending-send-boundary",
  );
  const gate = lesson?.steps.find(
    (step) => step.id === "async-lending-send-boundary-gate",
  );
  if (!gate?.code) throw new Error("Missing Send starter");
  const directory = mkdtempSync(join(tmpdir(), "async-lending-send-starter-"));
  try {
    const file = join(directory, "starter.rs");
    writeFileSync(file, gate.code);
    const result = spawnSync(
      "rustc",
      ["--edition=2024", file, "-o", join(directory, "starter")],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "future cannot be sent between threads safely",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
