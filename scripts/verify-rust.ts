/** Executes only reviewed, repository-authored curriculum fixtures. Never accept user paths or code. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { lessons, reviewExercises, traces } from "../src/content/course";
import type { LessonStep } from "../src/domain/types";
import { appendHiddenTests } from "../src/runner";
import { evaluate } from "../src/engine/evaluate";
type Verification = { id: string; passed: boolean; detail: string };
const TIMEOUT = 8000;
function command(cmd: string, args: string[], cwd: string) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT,
    maxBuffer: 1024 * 1024,
  });
}
export function verifyTrustedRust(): Verification[] {
  const dir = mkdtempSync(join(tmpdir(), "rust-workshop-authored-"));
  const results: Verification[] = [];
  let number = 0;
  function verify(
    id: string,
    code: string,
    options: {
      error?: string;
      tests?: string;
      expectedOutput?: string;
      solutionStep?: LessonStep;
      run?: boolean;
      expectTestFailure?: boolean;
    } = {},
  ) {
    const path = join(dir, `example_${number++}.rs`);
    const binary = path + ".bin";
    const testMode = !!options.tests;
    const source = testMode ? appendHiddenTests(code, options.tests!) : code;
    const main = /\bfn\s+main\s*\(/.test(source);
    writeFileSync(path, source);
    const compile = command(
      "rustc",
      [
        "--edition=2024",
        path,
        "--crate-name",
        "authored_example",
        ...(testMode ? ["--test"] : main ? [] : ["--crate-type", "lib"]),
        "-o",
        binary,
      ],
      dir,
    );
    if (options.error) {
      const passed =
        !compile.error &&
        compile.status !== 0 &&
        (options.error === "any" ||
          compile.stderr.includes(`error[${options.error}]`));
      results.push({
        id,
        passed,
        detail: passed
          ? `przewidziany błąd ${options.error}`
          : `oczekiwano ${options.error}: ${compile.error?.message ?? compile.stderr.slice(0, 700)}`,
      });
      return;
    }
    if (compile.error || compile.status !== 0) {
      results.push({
        id,
        passed: false,
        detail: `kompilacja: ${compile.error?.message ?? compile.stderr.slice(0, 900)}`,
      });
      return;
    }
    if ((!main && !testMode) || options.run === false) {
      results.push({ id, passed: true, detail: "kompiluje się (biblioteka)" });
      return;
    }
    const execution = command(binary, [], dir);
    if (options.expectTestFailure) {
      const failed = execution.stdout.match(
        /test result: FAILED.*?(\d+) passed; (\d+) failed;/,
      );
      results.push({
        id,
        passed:
          !execution.error &&
          execution.status !== 0 &&
          !!failed &&
          Number(failed[2]) > 0,
        detail: "zmieniona implementacja nie omija asercji testów",
      });
      return;
    }
    let passed = !execution.error && execution.status === 0;
    let detail = execution.error?.message ?? execution.stderr;
    if (
      options.expectedOutput !== undefined &&
      execution.stdout !== options.expectedOutput
    ) {
      passed = false;
      detail = `output ${JSON.stringify(execution.stdout)}, oczekiwano ${JSON.stringify(options.expectedOutput)}`;
    }
    if (testMode) {
      const match = execution.stdout.match(
        /test result:.*?\. (\d+) passed; (\d+) failed;/,
      );
      if (!match || Number(match[1]) === 0 || Number(match[2]) !== 0) {
        passed = false;
        detail =
          "Brak niepustego zestawu przechodzących testów: " + execution.stdout;
      }
      if (passed && options.solutionStep?.evaluator) {
        const outcome = evaluate(options.solutionStep.evaluator, {
          code,
          result: {
            status: "success",
            stdout: execution.stdout,
            stderr: execution.stderr,
            diagnostics: [],
            durationMs: 0,
            tests: { passed: Number(match![1]), failed: 0 },
          },
        });
        passed = outcome.passed;
        detail = outcome.feedback;
      }
    }
    if (
      passed &&
      !testMode &&
      options.solutionStep?.evaluator?.kind === "exact-output"
    ) {
      const outcome = evaluate(options.solutionStep.evaluator, {
        code,
        result: {
          status: "success",
          stdout: execution.stdout,
          stderr: execution.stderr,
          diagnostics: [],
          durationMs: 0,
        },
      });
      passed = outcome.passed;
      detail = outcome.feedback;
    }
    results.push({
      id,
      passed,
      detail: passed
        ? testMode
          ? "rozwiązanie przechodzi testy z evaluator.tests"
          : "kompilacja i wykonanie poprawne"
        : detail.slice(0, 1000),
    });
  }
  function stepCases(prefix: string, step: LessonStep) {
    if (step.evaluator?.kind === "tests")
      verify(`${prefix}/${step.id}/reject-empty-implementation`, "", {
        tests: step.evaluator.tests,
        error: "any",
      });
    if (step.code) {
      verify(`${prefix}/${step.id}/starter`, step.code, {
        error:
          step.expectedStatus === "compile-error"
            ? step.expectedError
            : undefined,
        run: step.expectedStatus !== "runtime-error",
      });
    }
    if (step.solution && /\bfn\s+\w+\s*\(/.test(step.solution))
      verify(`${prefix}/${step.id}/solution`, step.solution, {
        tests:
          step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
        expectedOutput:
          step.evaluator?.kind === "exact-output"
            ? step.evaluator.expected
            : undefined,
        solutionStep: step,
      });
  }
  try {
    verify(
      "runner/assertion-shadowing",
      "macro_rules! assert_eq { ($($t:tt)*) => {} } fn answer() -> i32 { 0 }",
      {
        tests: "#[test] fn rejects_wrong_answer(){ assert_eq!(answer(), 2); }",
        expectTestFailure: true,
      },
    );
    for (const lesson of lessons)
      for (const step of lesson.steps) stepCases(lesson.id, step);
    for (const [concept, step] of Object.entries(reviewExercises))
      stepCases(`review/${concept}`, step);
    for (const [id, trace] of Object.entries(traces))
      verify(`trace/${id}`, `fn main() {\n${trace.code}\n}`);
    verify("diagnostic/double", "fn double(n: i32) -> i32 { n * 2 }", {
      tests:
        "#[test] fn handles_sign_and_zero(){assert_eq!(double(4),8);assert_eq!(double(-3),-6);assert_eq!(double(0),0);}",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return results;
}
if (process.argv[1]?.endsWith("verify-rust.ts")) {
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  console.log(version.stdout.trim());
  const results = verifyTrustedRust();
  for (const result of results)
    console.log(
      `${result.passed ? "ok" : "FAIL"} ${result.id}: ${result.detail}`,
    );
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} authored Rust cases verified.`,
  );
  if (results.some((r) => !r.passed)) process.exitCode = 1;
}
