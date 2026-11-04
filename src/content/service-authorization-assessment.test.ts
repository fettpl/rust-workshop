import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { serviceAuthorizationAssessmentFixtures as fixtures } from "./service-authorization-assessment-fixtures";
import {
  serviceAuthorizationLessons,
  serviceAuthorizationReviewExercises,
} from "./service-authorization";

// Optional diagnostics select only an output directory; fixed sources, tools and classifiers are unchanged.
const outputDirectory =
  process.env.RUST_WORKSHOP_AUTHORIZATION_ASSESSMENT_OUTPUT_DIR;
const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
let compilerIdentity: { path: string; sha256: string } | undefined;
function saveReceipt(name: string, value: unknown) {
  if (!outputDirectory) return;
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    join(outputDirectory, `${name}.json`),
    JSON.stringify(value, null, 2) + "\n",
    { flag: "wx" },
  );
}
function observedCompiler() {
  if (!outputDirectory || compilerIdentity) return compilerIdentity;
  const compiler = process.env.RUSTC_BIN ?? "rustc";
  const resolved = isAbsolute(compiler)
    ? compiler
    : (process.env.PATH ?? "")
        .split(":")
        .map((directory) => join(directory, compiler))
        .find((path) => existsSync(path));
  if (!resolved)
    throw new Error("Cannot resolve compiler for assessment diagnostics");
  const path = realpathSync(resolved);
  compilerIdentity = { path, sha256: sha256(readFileSync(path)) };
  const startedAt = new Date().toISOString();
  const result = spawnSync(compiler, ["--version", "--verbose"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 8_000,
  });
  saveReceipt("compiler-identity", {
    ...compilerIdentity,
    argv: [compiler, "--version", "--verbose"],
    cwd: process.cwd(),
    startedAt,
    finishedAt: new Date().toISOString(),
    timeoutMs: 8_000,
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error
      ? {
          message: result.error.message,
          code: (result.error as NodeJS.ErrnoException).code,
        }
      : null,
  });
  if (result.error || result.signal || result.status !== 0)
    throw new Error("Compiler identity observation failed");
  return compilerIdentity;
}
function saveChild(
  name: string,
  argv: string[],
  cwd: string,
  source: string,
  tests: string,
  expectedTest: string,
  expected: string,
  phase: string,
  startedAt: string,
  timeoutMs: number,
  result: SpawnSyncReturns<string>,
) {
  if (!outputDirectory) return;
  const finishedAt = new Date().toISOString();
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const counts = output.match(
    /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored;/,
  );
  saveReceipt(`${name}--${phase}`, {
    argv,
    cwd,
    sourceSha256: sha256(source),
    testsSha256: sha256(tests),
    completeSourceSha256: sha256(appendHiddenTests(source, tests)),
    compiler: observedCompiler(),
    expectedTest: `__rust_workshop_hidden_tests::${expectedTest}`,
    expected,
    phase,
    startedAt,
    finishedAt,
    timeoutMs,
    timedOut:
      (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT",
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error
      ? {
          name: result.error.name,
          message: result.error.message,
          code: (result.error as NodeJS.ErrnoException).code,
        }
      : null,
    namedResult:
      phase === "execute"
        ? {
            name: expectedTest,
            observed: output.includes(
              `__rust_workshop_hidden_tests::${expectedTest}`,
            ),
            assertionFailed: /assertion .*failed/.test(output),
            counts: counts
              ? {
                  passed: Number(counts[1]),
                  failed: Number(counts[2]),
                  ignored: Number(counts[3]),
                }
              : null,
          }
        : null,
  });
}

it("maps_exactly_fourteen_executable_lesson_and_ordinary_review_assessments", () => {
  const steps = [
    ...serviceAuthorizationLessons.flatMap((lesson) => lesson.steps),
    ...Object.values(serviceAuthorizationReviewExercises),
  ].filter((step) => step.evaluator?.kind === "tests");
  expect(steps).toHaveLength(14);
  expect(Object.keys(fixtures).sort()).toEqual(
    steps.map((step) => step.id).sort(),
  );
  for (const step of steps) {
    expect(step.solution, step.id).toBe(fixtures[step.id].canonical);
    if (step.evaluator?.kind === "tests")
      expect(step.evaluator.tests, step.id).toBe(fixtures[step.id].tests);
  }
});

for (const [id, fixture] of Object.entries(fixtures)) {
  it(`${id}: real hidden child passes canonical/equivalent and rejects compiling semantic controls`, () => {
    const directory = mkdtempSync(join(tmpdir(), "authorization-assessment-"));
    try {
      const file = join(directory, "case.rs");
      const binary = join(directory, "case");
      for (const [name, source, expected] of [
        ["canonical", fixture.canonical, "pass"],
        ["equivalent", fixture.equivalent, "pass"],
        ...fixture.semanticMutants.map((mutant) => [
          mutant.name,
          mutant.source,
          "assertion",
        ]),
        ["scaffold", fixture.starter, "todo"],
        ["empty", "", "compile"],
      ]) {
        const label = `${id}/${name}`;
        writeFileSync(file, appendHiddenTests(source, fixture.tests));
        const compileStartedAt = new Date().toISOString();
        const compiled = spawnSync(
          process.env.RUSTC_BIN ?? "rustc",
          ["--edition=2024", "--test", file, "-o", binary],
          { cwd: directory, encoding: "utf8", timeout: 60_000 },
        );
        saveChild(
          `${id}--${name}`,
          [
            process.env.RUSTC_BIN ?? "rustc",
            "--edition=2024",
            "--test",
            file,
            "-o",
            binary,
          ],
          directory,
          source,
          fixture.tests,
          fixture.expectedTest,
          expected,
          "compile",
          compileStartedAt,
          60_000,
          compiled,
        );
        expect(compiled.error, label).toBeUndefined();
        expect(compiled.signal, label).toBeNull();
        if (expected === "compile") {
          expect(compiled.status, label).not.toBe(0);
          expect(compiled.stderr, label).toMatch(/error\[E/);
          continue;
        }
        expect(
          compiled.status,
          `${label}: must compile before execution: ${compiled.stderr}`,
        ).toBe(0);
        const executeStartedAt = new Date().toISOString();
        const executed = spawnSync(
          binary,
          [
            "--exact",
            `__rust_workshop_hidden_tests::${fixture.expectedTest}`,
            "--nocapture",
            "--test-threads=1",
          ],
          { cwd: directory, encoding: "utf8", timeout: 8_000 },
        );
        saveChild(
          `${id}--${name}`,
          [
            binary,
            "--exact",
            `__rust_workshop_hidden_tests::${fixture.expectedTest}`,
            "--nocapture",
            "--test-threads=1",
          ],
          directory,
          source,
          fixture.tests,
          fixture.expectedTest,
          expected,
          "execute",
          executeStartedAt,
          8_000,
          executed,
        );
        expect(executed.error, label).toBeUndefined();
        expect(executed.signal, label).toBeNull();
        const output = `${executed.stdout}${executed.stderr}`;
        expect(output, label).toContain(
          `__rust_workshop_hidden_tests::${fixture.expectedTest}`,
        );
        const counts = output.match(
          /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored;/,
        );
        expect(counts, label).not.toBeNull();
        const tests = {
          passed: Number(counts![1]),
          failed: Number(counts![2]),
        };
        expect(Number(counts![3]), label).toBe(0);
        expect(tests, label).toEqual(
          expected === "pass"
            ? { passed: 1, failed: 0 }
            : { passed: 0, failed: 1 },
        );
        expect(executed.status, `${label}: ${output}`).toBe(
          expected === "pass" ? 0 : 101,
        );
        if (expected === "assertion")
          expect(
            output,
            `${label}: intended assertion, not a compiler/panic substitute`,
          ).toMatch(/assertion .*failed/);
        if (expected === "todo")
          expect(output, label).toContain("implement this operation");
        const evaluation = evaluate(
          { kind: "tests", tests: fixture.tests },
          {
            code: source,
            result: {
              status: executed.status === 0 ? "success" : "test-failure",
              stdout: executed.stdout,
              stderr: executed.stderr,
              diagnostics: [],
              durationMs: 0,
              tests,
            },
          },
        );
        expect(evaluation.passed, label).toBe(expected === "pass");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60_000);
}
