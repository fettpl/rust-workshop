import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { concepts, modules, reviewExercises } from "./course";
import {
  macrosAsApiCompetencies,
  macrosAsApiConcepts,
  macrosAsApiLessons,
  macrosAsApiModule,
  macrosAsApiReviewExercises,
  macrosAsApiSources,
} from "./macros-as-api";

const lessonIds = [
  "macros-exactly-once",
  "macros-repetition-grammar",
  "macros-exported-paths-2024",
];

function runRust(source: string, id: string) {
  const directory = mkdtempSync(join(tmpdir(), `macros-as-api-${id}-`));
  try {
    const sourcePath = join(directory, `${id}.rs`);
    const binaryPath = join(directory, id);
    writeFileSync(sourcePath, source);
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", sourcePath, "-o", binaryPath],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    const executed =
      compiled.status === 0
        ? spawnSync(binaryPath, ["--test-threads=1"], {
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

it("registers three late macro lessons with independent gates and retrieval", () => {
  expect(macrosAsApiLessons.map((lesson) => lesson.id)).toEqual(lessonIds);
  expect(macrosAsApiModule.lessonIds).toEqual(lessonIds);
  expect(macrosAsApiModule.prerequisites).toEqual(["api-release-matrix"]);
  expect(modules.find((module) => module.id === macrosAsApiModule.id)).toEqual(
    macrosAsApiModule,
  );
  expect(macrosAsApiModule.gateCriteria).toHaveLength(3);
  expect(macrosAsApiCompetencies).toHaveLength(3);
  expect(macrosAsApiConcepts).toHaveLength(3);

  for (const lesson of macrosAsApiLessons) {
    expect(lesson.minutes).toBeGreaterThanOrEqual(18);
    expect(lesson.minutes).toBeLessThanOrEqual(20);
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
    const gates = lesson.steps.filter((step) => step.evidenceGate);
    expect(gates.map((step) => step.kind)).toEqual(
      expect.arrayContaining(["modify", "blank"]),
    );
    expect(gates).toHaveLength(2);
    expect(
      lesson.steps.find((step) => step.kind === "blank")?.code,
    ).toBeUndefined();
    expect(
      lesson.steps.find((step) => step.kind === "blank")?.solution,
    ).not.toBe(lesson.steps.find((step) => step.kind === "modify")?.solution);
    expect(lesson.evidenceGate).toMatch(/albo/);
    expect(lesson.evidenceGate).not.toMatch(/wymaga.*i/);
    const concept = concepts.find((item) => item.id === lesson.conceptIds[0]);
    expect(concept).toBeDefined();
    expect(reviewExercises[lesson.conceptIds[0]]?.id).toBe(
      `${lesson.conceptIds[0]}-review`,
    );
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
    expect(
      `${lesson.title} ${lesson.subtitle} ${lesson.transferTask}`,
    ).not.toMatch(/Java|Python|doświadczenie z programowania w/i);
  }
});

it("keeps blank helpers in the hidden harness and reviews executable", () => {
  const exactBlank = macrosAsApiLessons[0].steps.find(
    (step) => step.id === "macros-exactly-once-blank",
  )!;
  expect(exactBlank.solution).not.toContain("fn log_name");
  expect(exactBlank.solution).not.toContain("fn log_value");
  expect(exactBlank.evaluator?.kind).toBe("tests");
  if (exactBlank.evaluator?.kind === "tests") {
    expect(exactBlank.evaluator.tests).toContain("fn log_name");
    expect(exactBlank.evaluator.tests).toContain("fn log_value");
  }
  for (const review of Object.values(macrosAsApiReviewExercises)) {
    expect(review.code).toBe("");
    expect(review.evaluator?.kind).toBe("tests");
  }
});

it("keeps official macro sources and separates browser evidence from Cargo proof", () => {
  expect(macrosAsApiSources.map((source) => source.url)).toEqual(
    expect.arrayContaining([
      "https://doc.rust-lang.org/book/ch20-05-macros.html",
      "https://doc.rust-lang.org/reference/macros-by-example.html",
      "https://doc.rust-lang.org/edition-guide/rust-2024/macro-fragment-specifiers.html",
    ]),
  );
  expect(macrosAsApiSources).toHaveLength(3);
  expect(
    macrosAsApiSources.every(
      (source) => source.reviewedAt && source.recheckPolicy,
    ),
  ).toBe(true);
  expect(macrosAsApiModule.projectConnection).toMatch(/Cargo|crate|verifier/i);
  expect(macrosAsApiModule.projectConnection).toMatch(
    /nie zastępuj|nie dowodzi|oddziel/i,
  );
  expect(
    macrosAsApiLessons[2].steps.some((step) =>
      /zaufan|Cargo|zewnętrz/i.test(step.prompt),
    ),
  ).toBe(true);
});

it("compiles and runs every authored test gate, blank transfer, and review", () => {
  const fixtures = [
    ...macrosAsApiLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
    ),
    ...Object.values(macrosAsApiReviewExercises),
  ];
  expect(fixtures).toHaveLength(9);
  for (const step of fixtures) {
    expect(step.solution, step.id).toBeTruthy();
    expect(step.evaluator?.kind, step.id).toBe("tests");
    if (step.evaluator?.kind !== "tests") continue;
    const result = runRust(
      `${step.solution}\n${step.evaluator.tests}`,
      step.id,
    );
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

it("rejects the macro contract mutants", () => {
  const exact = macrosAsApiLessons[0].steps.find(
    (step) => step.id === "macros-exactly-once-gate",
  )!;
  const grammar = macrosAsApiLessons[1].steps.find(
    (step) => step.id === "macros-repetition-grammar-gate",
  )!;
  const paths = macrosAsApiLessons[2].steps.find(
    (step) => step.id === "macros-exported-paths-2024-gate",
  )!;
  expect(exact.evaluator?.kind).toBe("tests");
  expect(grammar.evaluator?.kind).toBe("tests");
  expect(paths.evaluator?.kind).toBe("tests");
  if (
    exact.evaluator?.kind !== "tests" ||
    grammar.evaluator?.kind !== "tests" ||
    paths.evaluator?.kind !== "tests"
  )
    return;

  const duplicate = exact.solution!.replace(
    "let captured_value = $value;",
    "let captured_value = $value; let _duplicate = $value;",
  );
  const duplicateResult = runRust(
    `${duplicate}\n${exact.evaluator.tests}`,
    "duplicate-evaluation",
  );
  expect(
    duplicateResult.executed?.status ?? duplicateResult.compiled.status,
  ).not.toBe(0);

  const starterResult = runRust(
    `${exact.code}\n${exact.evaluator.tests}`,
    "starter-duplicate-evaluation",
  );
  expect(
    starterResult.executed?.status ?? starterResult.compiled.status,
  ).not.toBe(0);

  const noEmptyOrTrailing = grammar
    .solution!.replace("),* $(,) ?", "),+")
    .replace("),* $(,)?", "),+");
  const grammarResult = runRust(
    `${noEmptyOrTrailing}\n${grammar.evaluator.tests}`,
    "missing-empty-trailing",
  );
  expect(
    grammarResult.executed?.status ?? grammarResult.compiled.status,
  ).not.toBe(0);

  const unqualified = paths.solution!.replaceAll("$crate::Reading", "Reading");
  const pathResult = runRust(
    `${unqualified}\n${paths.evaluator.tests}`,
    "unqualified-path",
  );
  expect(pathResult.executed?.status ?? pathResult.compiled.status).not.toBe(0);

  const wrongFragment = paths.solution!.replaceAll(":expr", ":expr_2021");
  const fragmentResult = runRust(
    `${wrongFragment}\n${paths.evaluator.tests}`,
    "expr-2021-mutant",
  );
  expect(
    fragmentResult.executed?.status ?? fragmentResult.compiled.status,
  ).not.toBe(0);

  const stub = exact.solution!.replace(
    "let captured_value = $value;",
    "let captured_value = 0;",
  );
  const stubResult = runRust(`${stub}\n${exact.evaluator.tests}`, "stub");
  expect(stubResult.executed?.status ?? stubResult.compiled.status).not.toBe(0);
});

it("keeps debug observations tied to compiler diagnostics", () => {
  for (const lesson of macrosAsApiLessons) {
    const debug = lesson.steps.find((step) => step.kind === "debug");
    expect(debug?.evaluator?.kind, lesson.id).toBe("expected-error");
    expect(debug?.expectedStatus, lesson.id).toBe("compile-error");
    expect(debug?.expectedDiagnostic, lesson.id).toBeTruthy();
  }
});

it("compiles each debug fixture and observes its authored diagnostic", () => {
  for (const lesson of macrosAsApiLessons) {
    const debug = lesson.steps.find((step) => step.kind === "debug");
    expect(debug?.code, lesson.id).toBeTruthy();
    expect(debug?.expectedDiagnostic, lesson.id).toBeTruthy();
    if (!debug?.code || !debug.expectedDiagnostic) continue;

    const result = runRust(debug.code, `${lesson.id}-debug`);
    expect(
      result.compiled.status,
      `${lesson.id}: ${result.compiled.stderr}`,
    ).not.toBe(0);
    expect(result.compiled.stderr, lesson.id).toContain(
      debug.expectedDiagnostic,
    );
  }
});
