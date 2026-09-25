import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { concepts, modules, reviewExercises } from "./course";
import {
  apiReleaseMatrixLessons,
  apiReleaseMatrixModule,
  apiReleaseMatrixReviewExercises,
  apiReleaseMatrixSources,
} from "./api-release-matrix";

const lessonIds = ["api-release-old-contracts", "api-release-matrix-decision"];

function runFixture(solution: string, tests: string, id: string) {
  const directory = mkdtempSync(join(tmpdir(), "api-release-matrix-"));
  try {
    const source = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(source, appendHiddenTests(solution, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", source, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    const executed =
      compiled.status === 0
        ? spawnSync(binary, ["--test-threads=1"], {
            cwd: directory,
            encoding: "utf8",
            timeout: 8_000,
          })
        : undefined;
    return { compiled, executed };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it("registers the release matrix as a late two-lesson module", () => {
  expect(apiReleaseMatrixLessons.map((lesson) => lesson.id)).toEqual(lessonIds);
  expect(apiReleaseMatrixModule.lessonIds).toEqual(lessonIds);
  expect(apiReleaseMatrixModule.prerequisites).toEqual([
    "public-api-workspaces",
  ]);
  expect(
    modules.find((module) => module.id === apiReleaseMatrixModule.id),
  ).toEqual(apiReleaseMatrixModule);
  expect(apiReleaseMatrixModule.gateCriteria).toHaveLength(2);
  expect(
    apiReleaseMatrixModule.gateCriteria?.map((criterion) => criterion.taskRefs),
  ).toEqual([
    [
      { lessonId: lessonIds[0], stepId: "api-release-old-contracts-gate" },
      { lessonId: lessonIds[0], stepId: "api-release-old-contracts-blank" },
    ],
    [
      { lessonId: lessonIds[1], stepId: "api-release-matrix-decision-gate" },
      { lessonId: lessonIds[1], stepId: "api-release-matrix-decision-blank" },
    ],
  ]);

  for (const lesson of apiReleaseMatrixLessons) {
    expect(lesson.steps.map((step) => step.kind)).toEqual(
      expect.arrayContaining([
        "predict",
        "run",
        "explain",
        "modify",
        "debug",
        "blank",
      ]),
    );
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(lesson.steps.filter((step) => step.evidenceGate)).toHaveLength(2);
    expect(
      lesson.steps
        .filter((step) => step.evidenceGate)
        .every((step) => step.evaluator?.kind === "tests"),
    ).toBe(true);
    expect(reviewExercises[lesson.conceptIds[0]]).toEqual(
      apiReleaseMatrixReviewExercises[lesson.conceptIds[0]],
    );
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
    expect(
      lesson.steps.find((step) => step.kind === "blank")?.code,
    ).toBeUndefined();
  }
});

it("keeps the release lesson evidence distinct from Cargo proof", () => {
  expect(apiReleaseMatrixModule.projectConnection).toMatch(/Frame Protocol/);
  expect(apiReleaseMatrixModule.projectConnection).toMatch(/Cargo/);
  expect(apiReleaseMatrixModule.projectConnection).toMatch(
    /nie zastępuj|nie dowodzi/,
  );
  expect(
    apiReleaseMatrixLessons[1].steps.some((step) =>
      /trusted verifier|Cargo|cargo|MSRV/i.test(step.prompt),
    ),
  ).toBe(true);
  expect(apiReleaseMatrixSources.map((source) => source.url)).toEqual(
    expect.arrayContaining([
      "https://doc.rust-lang.org/cargo/reference/semver.html",
      "https://doc.rust-lang.org/cargo/reference/features.html",
      "https://doc.rust-lang.org/cargo/reference/rust-version.html",
    ]),
  );
  expect(
    apiReleaseMatrixSources.every(
      (source) => source.reviewedAt && source.recheckPolicy,
    ),
  ).toBe(true);
  const oldLesson = apiReleaseMatrixLessons[0];
  const oldGate = oldLesson.steps.find(
    (step) => step.id === "api-release-old-contracts-gate",
  )!;
  expect(oldGate.prompt).toMatch(
    /MissingPublicItem|OtherCompileFailure|ContradictoryObservation|public API break|regresj|infrastruktur|evidence/i,
  );
  expect(oldGate.solution).toContain("ClientObservation");
  expect(oldGate.solution).toContain("ReleaseDecision");
  expect(oldGate.solution).toContain("BuildOutcome");
  expect(oldGate.solution).toContain("OtherCompileFailure");
  expect(oldGate.solution).toContain("ContradictoryObservation");
  expect(oldGate.solution).not.toContain("dyn Beacon");
});

it("runs every primary, blank, and delayed retrieval fixture", () => {
  const fixtures = [
    ...apiReleaseMatrixLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
    ),
    ...Object.values(apiReleaseMatrixReviewExercises),
  ];
  expect(fixtures).toHaveLength(6);
  for (const step of fixtures) {
    expect(step.solution, step.id).toBeTruthy();
    expect(step.evaluator?.kind, step.id).toBe("tests");
    if (step.evaluator?.kind !== "tests") continue;
    expect(step.evaluator.tests).toMatch(/#\[test\]/);
    expect(step.evaluator.tests).toMatch(/assert/);
    const result = runFixture(step.solution!, step.evaluator.tests, step.id);
    expect(
      result.compiled.status,
      `${step.id}: ${result.compiled.stderr}`,
    ).toBe(0);
    expect(
      result.executed?.status,
      `${step.id}: ${result.executed?.stderr}`,
    ).toBe(0);
  }
});

it("rejects a trivial decision and a behavior-classification mutant", () => {
  const decision = apiReleaseMatrixLessons[1].steps.find(
    (step) => step.id === "api-release-matrix-decision-gate",
  )!;
  const oldContract = apiReleaseMatrixLessons[0].steps.find(
    (step) => step.id === "api-release-old-contracts-gate",
  )!;
  expect(decision.evaluator?.kind).toBe("tests");
  expect(oldContract.evaluator?.kind).toBe("tests");
  if (
    decision.evaluator?.kind !== "tests" ||
    oldContract.evaluator?.kind !== "tests"
  )
    return;
  expect(decision.prompt).toMatch(/provenance|pochod|stale|duplik|konflikt/i);
  expect(decision.evaluator.tests).toMatch(/stale|duplicate|conflict/i);

  const trivial = decision.solution!.replace(
    'if matches.is_empty() { return Decision::Hold("missing"); }',
    "if matches.is_empty() { return Decision::Ship; }",
  );
  const trivialResult = runFixture(
    trivial,
    decision.evaluator.tests,
    "trivial",
  );
  expect(
    trivialResult.executed?.status ?? trivialResult.compiled.status,
  ).not.toBe(0);

  const breaking = oldContract.solution!.replace(
    'ClientObservation::BehaviorRegression => ReleaseDecision::Hold("behavior"),',
    "ClientObservation::BehaviorRegression => ReleaseDecision::Ship,",
  );
  const breakingResult = runFixture(
    breaking,
    oldContract.evaluator.tests,
    "breaking",
  );
  expect(
    breakingResult.executed?.status ?? breakingResult.compiled.status,
  ).not.toBe(0);
});

it("keeps incorrect debug examples tied to their named compiler failures", () => {
  const dyn = apiReleaseMatrixLessons[0].steps.find(
    (step) => step.id === "api-release-old-contracts-debug",
  )!;
  const msrv = apiReleaseMatrixLessons[1].steps.find(
    (step) => step.id === "api-release-matrix-decision-debug",
  )!;
  expect(dyn.evaluator).toMatchObject({
    kind: "expected-error",
    diagnostic: "unresolved import `super::render`",
  });
  expect(msrv.evaluator).toMatchObject({
    kind: "expected-error",
    diagnostic: "mismatched types",
  });
  const dynResult = runFixture(dyn.code!, "", "dyn-debug");
  const msrvResult = runFixture(msrv.code!, "", "msrv-debug");
  expect(dynResult.compiled.status).not.toBe(0);
  expect(dynResult.compiled.stderr).toContain(
    "unresolved import `super::render`",
  );
  expect(msrvResult.compiled.status).not.toBe(0);
  expect(msrvResult.compiled.stderr).toContain("mismatched types");

  const dynSolutionResult = runFixture(dyn.solution!, "", "dyn-solution");
  const msrvSolutionResult = runFixture(
    msrv.solution!,
    "",
    "msrv-solution",
  );
  expect(
    dynSolutionResult.compiled.status,
    dynSolutionResult.compiled.stderr,
  ).toBe(0);
  expect(
    msrvSolutionResult.compiled.status,
    msrvSolutionResult.compiled.stderr,
  ).toBe(0);
});

it("exposes both concepts and their independent reviews in the course graph", () => {
  for (const lesson of apiReleaseMatrixLessons) {
    expect(lesson.conceptIds).toHaveLength(1);
    expect(
      concepts.find((concept) => concept.id === lesson.conceptIds[0]),
    ).toBeDefined();
    expect(reviewExercises[lesson.conceptIds[0]]?.id).toBe(
      `${lesson.conceptIds[0]}-review`,
    );
  }
});
