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
  expect(oldGate.prompt).toContain("evidence_present == false");
  expect(oldGate.prompt).toContain('Hold(\"public-api\")');
  expect(oldGate.prompt).toContain('Hold(\"missing-evidence\")');
  expect(oldGate.prompt).toContain('Hold(\"unclassified-build\")');
  expect(oldGate.prompt).toContain('Hold(\"contradictory\")');
  expect(oldGate.solution).toContain("ClientObservation");
  expect(oldGate.solution).toContain("ReleaseDecision");
  expect(oldGate.solution).toContain("BuildOutcome");
  expect(oldGate.solution).toContain("OtherCompileFailure");
  expect(oldGate.solution).toContain("ContradictoryObservation");
  expect(oldGate.solution).not.toContain("dyn Beacon");
});

it("publishes the exact blank contracts without prefilled learner code", () => {
  const oldBlank = apiReleaseMatrixLessons[0].steps.find(
    (step) => step.id === "api-release-old-contracts-blank",
  )!;
  const matrixGate = apiReleaseMatrixLessons[1].steps.find(
    (step) => step.id === "api-release-matrix-decision-gate",
  )!;
  const matrixBlank = apiReleaseMatrixLessons[1].steps.find(
    (step) => step.id === "api-release-matrix-decision-blank",
  )!;

  expect(oldBlank.code).toBeUndefined();
  expect(oldBlank.prompt).toMatch(
    /ProbeResult.*MissingSymbol.*OtherCompileFailure.*ChangedOutput.*Contradictory.*TimedOut.*NotRecorded.*SameContract/s,
  );
  expect(oldBlank.prompt).toMatch(
    /Verdict.*Release.*Stop\(&'static str\).*inspect\(result: ProbeResult\)/s,
  );
  expect(oldBlank.prompt).toMatch(
    /derive\(Debug, PartialEq\).*public-api.*unclassified-build.*behavior.*contradictory.*infrastructure.*missing-evidence/s,
  );
  expect(matrixGate.prompt).toMatch(
    /Outcome.*Pass.*Fail.*Evidence.*dimension.*toolchain.*config.*client.*captured_ymd.*artifact_hash.*Decision.*Ship.*Hold\(&'static str\).*approve\(records: &\[Evidence\], as_of_ymd: u32\)/s,
  );
  expect(matrixGate.prompt).not.toContain("Proof");
  expect(matrixGate.prompt).not.toContain("decide(");
  expect(matrixGate.prompt).toMatch(
    /legacy-client.*external.*old-consumer.*stable.*default.*no-default.*diagnostics.*msrv.*1\.85\.0/s,
  );
  expect(matrixGate.prompt).toContain("captured_ymd == as_of_ymd");
  expect(matrixGate.prompt).toContain("w tym przyszłe");
  expect(matrixBlank.code).toBeUndefined();
  expect(matrixBlank.prompt).toMatch(
    /ResultKind.*Pass.*Fail.*Verdict.*Accept.*Defer\(&'static str\).*decide\(proofs: &\[Proof\], as_of_ymd: u32\)/s,
  );
  expect(matrixBlank.prompt).toMatch(
    /caller.*stable.*external.*old-consumer.*default.*no-default.*opt-in.*diagnostics.*floor.*1\.85\.0/s,
  );
  expect(matrixBlank.prompt).toMatch(
    /observed_ymd == as_of_ymd.*sha256:.*64.*hex.*missing.*duplicate.*provenance.*failed.*stale.*malformed-hash/s,
  );
  expect(reviewExercises["api-release-old-contracts"]?.code).toBe("");
  expect(reviewExercises["api-release-feature-msrv-matrix"]?.code).toBe("");
  expect(reviewExercises["api-release-old-contracts"]?.prompt).toContain(
    "RunStatus",
  );
  expect(reviewExercises["api-release-feature-msrv-matrix"]?.prompt).toContain(
    "observed_ymd",
  );
});

it("runs independent correct solutions against both hidden contracts", () => {
  const oldBlank = apiReleaseMatrixLessons[0].steps.find(
    (step) => step.id === "api-release-old-contracts-blank",
  )!;
  const matrixBlank = apiReleaseMatrixLessons[1].steps.find(
    (step) => step.id === "api-release-matrix-decision-blank",
  )!;
  expect(oldBlank.evaluator?.kind).toBe("tests");
  expect(matrixBlank.evaluator?.kind).toBe("tests");
  if (oldBlank.evaluator?.kind !== "tests" || matrixBlank.evaluator?.kind !== "tests") return;

  const oldSolution = `
#[derive(Debug, PartialEq)]
enum ProbeResult { MissingSymbol, OtherCompileFailure, ChangedOutput, Contradictory, TimedOut, NotRecorded, SameContract }
#[derive(Debug, PartialEq)]
enum Verdict { Release, Stop(&'static str) }
fn inspect(result: ProbeResult) -> Verdict {
    match result {
        ProbeResult::MissingSymbol => Verdict::Stop("public-api"),
        ProbeResult::OtherCompileFailure => Verdict::Stop("unclassified-build"),
        ProbeResult::ChangedOutput => Verdict::Stop("behavior"),
        ProbeResult::Contradictory => Verdict::Stop("contradictory"),
        ProbeResult::TimedOut => Verdict::Stop("infrastructure"),
        ProbeResult::NotRecorded => Verdict::Stop("missing-evidence"),
        ProbeResult::SameContract => Verdict::Release,
    }
}`;
  const matrixSolution = `
#[derive(Debug, PartialEq, Clone)]
enum ResultKind { Pass, Fail }
#[derive(Debug, PartialEq, Clone)]
struct Proof { key: &'static str, compiler: &'static str, mode: &'static str, consumer: &'static str, result: ResultKind, observed_ymd: u32, digest: &'static str }
#[derive(Debug, PartialEq)]
enum Verdict { Accept, Defer(&'static str) }
fn decide(proofs: &[Proof], as_of_ymd: u32) -> Verdict {
    let required = [("caller", "stable", "external"), ("default", "stable", "default"), ("bare", "stable", "no-default"), ("opt-in", "stable", "diagnostics"), ("floor", "1.85.0", "default")];
    for (key, compiler, mode) in required {
        let matches: Vec<&Proof> = proofs.iter().filter(|proof| proof.key == key).collect();
        if matches.is_empty() { return Verdict::Defer("missing"); }
        if matches.len() > 1 { return Verdict::Defer("duplicate"); }
        let proof = matches[0];
        if proof.compiler != compiler || proof.mode != mode || proof.consumer != "old-consumer" { return Verdict::Defer("provenance"); }
        if proof.result != ResultKind::Pass { return Verdict::Defer("failed"); }
        if proof.observed_ymd != as_of_ymd { return Verdict::Defer("stale"); }
        if !proof.digest.strip_prefix("sha256:").is_some_and(|hex| hex.len() == 64 && hex.bytes().all(|byte| byte.is_ascii_hexdigit())) { return Verdict::Defer("malformed-hash"); }
    }
    Verdict::Accept
}`;
  const oldResult = runFixture(oldSolution, oldBlank.evaluator.tests, "independent-old");
  const matrixResult = runFixture(matrixSolution, matrixBlank.evaluator.tests, "independent-matrix");
  expect(oldResult.compiled.status, oldResult.compiled.stderr).toBe(0);
  expect(oldResult.executed?.status, oldResult.executed?.stderr).toBe(0);
  expect(matrixResult.compiled.status, matrixResult.compiled.stderr).toBe(0);
  expect(matrixResult.executed?.status, matrixResult.executed?.stderr).toBe(0);
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
