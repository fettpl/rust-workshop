/** Executes only reviewed, repository-authored curriculum fixtures. Never accept user paths or code. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { lessons, reviewExercises, traces } from "../src/content/course";
import type { Lesson, LessonStep, Trace } from "../src/domain/types";
import { appendHiddenTests } from "../src/runner";
import { evaluate } from "../src/engine/evaluate";
import { getTrustedFixtureTarget } from "../src/domain/trusted-fixtures";
export type Verification = { id: string; passed: boolean; detail: string };
export type VerificationReporter = (result: Verification) => void;
const COMPILE_TIMEOUT = 60_000;
const EXECUTION_TIMEOUT = 8_000;
function command(cmd: string, args: string[], cwd: string, timeout: number) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout,
    maxBuffer: 1024 * 1024,
  });
}
export function verifyTrustedRust(
  content: {
    lessons: Lesson[];
    reviewExercises: Record<string, LessonStep>;
    traces: Record<string, Trace>;
  } = { lessons, reviewExercises, traces },
  reporter?: VerificationReporter,
): Verification[] {
  const dir = mkdtempSync(join(tmpdir(), "rust-workshop-authored-"));
  const results: Verification[] = [];
  let number = 0;
  function record(result: Verification) {
    results.push(result);
    reporter?.(result);
  }
  function verify(
    id: string,
    code: string,
    options: {
      error?: string;
      diagnostic?: string;
      tests?: string;
      expectedOutput?: string;
      solutionStep?: LessonStep;
      run?: boolean;
      expectTestFailure?: boolean;
      expectStarterRejection?: boolean;
    } = {},
  ) {
    if (options.expectStarterRejection && !options.tests?.trim()) {
      record({
        id,
        passed: false,
        detail: "brak testów do oceny startera",
      });
      return;
    }
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
        ...(options.expectStarterRejection ? ["--error-format=json"] : []),
        "-o",
        binary,
      ],
      dir,
      COMPILE_TIMEOUT,
    );
    if (options.error || options.diagnostic) {
      const passed =
        !compile.error &&
        !compile.signal &&
        compile.status !== null &&
        compile.status !== 0 &&
        (!options.error ||
          options.error === "any" ||
          compile.stderr.includes(`error[${options.error}]`)) &&
        (!options.diagnostic || compile.stderr.includes(options.diagnostic));
      record({
        id,
        passed,
        detail: passed
          ? `przewidziany błąd ${options.diagnostic ?? options.error}`
          : `oczekiwano ${options.diagnostic ?? options.error}: ${compile.error?.message ?? compile.stderr.slice(0, 700)}`,
      });
      return;
    }
    if (compile.error || compile.status !== 0) {
      const sourceError =
        options.expectStarterRejection &&
        compile.stderr.split("\n").some((line) => {
          try {
            const diagnostic = JSON.parse(line) as {
              $message_type?: string;
              level?: string;
              code?: { code?: string } | null;
              spans?: { is_primary?: boolean; file_name?: string }[];
            } | null;
            return (
              diagnostic?.$message_type === "diagnostic" &&
              diagnostic.level === "error" &&
              /^E\d{4}$/.test(diagnostic.code?.code ?? "") &&
              Array.isArray(diagnostic.spans) &&
              diagnostic.spans.some(
                (span) => span.is_primary && span.file_name === path,
              )
            );
          } catch {
            return false;
          }
        });
      if (
        options.expectStarterRejection &&
        !compile.error &&
        compile.status === 1 &&
        !compile.signal &&
        sourceError
      ) {
        record({
          id,
          passed: true,
          detail: "starter nie spełnia API wymaganego przez testy",
        });
        return;
      }
      record({
        id,
        passed: false,
        detail: `kompilacja: ${compile.error?.message ?? compile.stderr.slice(0, 900)}`,
      });
      return;
    }
    if ((!main && !testMode) || options.run === false) {
      record({ id, passed: true, detail: "kompiluje się (biblioteka)" });
      return;
    }
    const execution = command(binary, [], dir, EXECUTION_TIMEOUT);
    if (options.expectStarterRejection) {
      const counts = execution.stdout.match(
        /test result:.*?\. (\d+) passed; (\d+) failed;/,
      );
      const tests = counts
        ? { passed: Number(counts[1]), failed: Number(counts[2]) }
        : undefined;
      const validRun =
        !execution.error &&
        execution.status !== null &&
        tests &&
        tests.passed + tests.failed > 0;
      const outcome =
        validRun && options.solutionStep?.evaluator
          ? evaluate(options.solutionStep.evaluator, {
              code,
              result: {
                status: execution.status === 0 ? "success" : "test-failure",
                stdout: execution.stdout,
                stderr: execution.stderr,
                diagnostics: [],
                durationMs: 0,
                tests,
              },
            })
          : undefined;
      record({
        id,
        passed: outcome !== undefined && !outcome.passed,
        detail: !validRun
          ? `nie udało się ocenić startera: ${execution.error?.message ?? execution.stderr}`
          : outcome?.passed
            ? "starter już zalicza zadanie bez zmiany kodu"
            : "starter wymaga poprawy przed zaliczeniem evaluatora",
      });
      return;
    }
    if (options.expectTestFailure) {
      const failed = execution.stdout.match(
        /test result: FAILED.*?(\d+) passed; (\d+) failed;/,
      );
      const passed =
        !execution.error &&
        !execution.signal &&
        execution.status !== null &&
        execution.status !== 0 &&
        !!failed &&
        Number(failed[2]) > 0;
      record({
        id,
        passed,
        detail: passed
          ? "zmieniona implementacja nie omija asercji testów"
          : `oczekiwano nieprzechodzącej asercji; status=${execution.status}, signal=${execution.signal}, error=${execution.error?.message ?? "brak"}; stdout=${execution.stdout.slice(0, 900)}; stderr=${execution.stderr.slice(0, 900)}`,
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
    record({
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
    if (step.editorMode === "toml") return;
    if (getTrustedFixtureTarget(step) !== "rustc-2024") return;
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
        diagnostic:
          step.expectedStatus === "compile-error"
            ? step.expectedDiagnostic
            : undefined,
        run: step.expectedStatus !== "runtime-error",
      });
      if (
        step.evaluator?.kind === "tests" &&
        step.expectedStatus !== "compile-error"
      )
        verify(`${prefix}/${step.id}/starter-rejected`, step.code, {
          tests: step.evaluator.tests,
          solutionStep: step,
          expectStarterRejection: true,
        });
    }
    if (
      step.solution &&
      (["tests", "compilation", "expected-error", "exact-output"].includes(
        step.evaluator?.kind ?? "",
      ) ||
        /\bfn\s+\w+\s*(?:<|\()/.test(step.solution))
    )
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
    for (const lesson of content.lessons)
      for (const step of lesson.steps) stepCases(lesson.id, step);
    for (const [concept, step] of Object.entries(content.reviewExercises))
      stepCases(`review/${concept}`, step);
    for (const [id, trace] of Object.entries(content.traces))
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
  const PROGRESS_INTERVAL = 100;
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  console.log(version.stdout.trim());
  let completed = 0;
  let passed = 0;
  let failed = 0;
  console.log("Verifying authored Rust cases...");
  const results = verifyTrustedRust(undefined, (result) => {
    completed++;
    if (result.passed) passed++;
    else {
      failed++;
      console.log(`FAIL ${result.id}`);
    }
    if (completed % PROGRESS_INTERVAL === 0)
      console.log(
        `Progress: ${completed} authored Rust cases checked (${passed} passed, ${failed} failed).`,
      );
  });
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} authored Rust cases verified.`,
  );
  if (results.some((r) => !r.passed)) process.exitCode = 1;
}
