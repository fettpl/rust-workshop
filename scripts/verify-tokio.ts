/** Executes only registered, repository-authored Tokio fixtures. Never accepts code, paths or manifests. */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { lessons, reviewExercises } from "../src/content/course";
import { appendHiddenTests } from "../src/runner";
import { evaluate } from "../src/engine/evaluate";
import type { RunResult } from "../src/domain/types";
import {
  tokioCasesForStep,
  type AuthoredCargoCase,
} from "./cargo-fixture-cases";
import {
  authoredCargoError,
  cargoExecutable,
  testCounts,
  behavioralRejection,
  type CargoObservation,
} from "./cargo-observation";

type Verification = { id: string; passed: boolean; detail: string };
const profile = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "tokio-runtime-1.54.1",
);
const flags = process.argv.slice(2);
if (flags.length > 1 || flags.some((flag) => flag !== "--fetch"))
  throw new Error(
    "Only --fetch is supported; source, paths and dependency overrides are not accepted",
  );
const cases = [
  ...lessons.flatMap((lesson) =>
    lesson.steps.flatMap((step) => tokioCasesForStep(lesson.id, step)),
  ),
  ...Object.entries(reviewExercises).flatMap(([id, step]) =>
    tokioCasesForStep(`review/${id}`, step),
  ),
];
if (!cases.length)
  throw new Error("No registered authored Tokio fixtures to verify");
const directory = mkdtempSync(join(tmpdir(), "rust-workshop-authored-tokio-"));
const targetDirectory = join(directory, "target");
const results: Verification[] = [];

function command(
  program: string,
  args: string[],
  timeout: number,
): CargoObservation {
  return spawnSync(program, args, {
    cwd: directory,
    encoding: "utf8",
    timeout,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, CARGO_TARGET_DIR: targetDirectory },
  });
}
function cargo(args: string[]) {
  return command("cargo", [...args, "--offline", "--locked"], 60_000);
}
function failedDetail(result: CargoObservation) {
  return (result.error?.message ?? `${result.stdout}\n${result.stderr}`).slice(
    -1800,
  );
}
function record(id: string, passed: boolean, detail: string) {
  results.push({ id, passed, detail });
  console.log(`${passed ? "ok" : "FAIL"} ${id}: ${detail}`);
}
function verify(fixture: AuthoredCargoCase) {
  const testMode = fixture.tests !== undefined;
  const source = testMode
    ? appendHiddenTests(fixture.code, fixture.tests!)
    : fixture.code;
  const binaryMode = !testMode && /\bfn\s+main\s*\(/.test(source);
  const file = binaryMode ? "src/main.rs" : "src/lib.rs";
  writeFileSync(join(directory, "src/lib.rs"), binaryMode ? "" : source);
  writeFileSync(
    join(directory, "src/main.rs"),
    binaryMode ? source : "fn main() {}\n",
  );
  const target = binaryMode
    ? "authored_fixture"
    : "rust_workshop_tokio_fixtures";
  const compile = cargo(
    testMode
      ? ["test", "--no-run", "--lib", "--message-format=json"]
      : [
          "build",
          ...(binaryMode ? ["--bin", target] : ["--lib"]),
          "--message-format=json",
        ],
  );
  if (fixture.expectedCompileError) {
    const passed = authoredCargoError(
      compile,
      file,
      fixture.expectedCompileError,
      fixture.expectedDiagnostic,
    );
    record(
      fixture.id,
      passed,
      passed
        ? `authored diagnostic ${fixture.expectedDiagnostic ?? fixture.expectedCompileError}`
        : failedDetail(compile),
    );
    return;
  }
  if (compile.error || compile.status !== 0) {
    const expected =
      fixture.expectRejection && authoredCargoError(compile, file, "any");
    record(
      fixture.id,
      !!expected,
      expected
        ? "starter does not satisfy the hidden API contract"
        : failedDetail(compile),
    );
    return;
  }
  if (!testMode && !binaryMode) {
    record(
      fixture.id,
      fixture.expectedOutput === undefined && !fixture.expectRuntimeFailure,
      "compiled as a library (no executable)",
    );
    return;
  }
  const emitted = cargoExecutable(compile.stdout, target);
  if (
    !emitted ||
    !resolve(emitted).startsWith(resolve(targetDirectory) + sep)
  ) {
    record(
      fixture.id,
      false,
      "Cargo did not emit an executable inside this temporary profile",
    );
    return;
  }
  const execution = command(emitted, [], 8000);
  const counts = testMode ? testCounts(execution.stdout) : undefined;
  const validTests = !testMode || (counts && counts.passed + counts.failed > 0);
  const infrastructureFailure =
    execution.error ||
    execution.signal ||
    execution.status === null ||
    !validTests;
  const run: RunResult = {
    status: infrastructureFailure
      ? "infrastructure-error"
      : execution.status === 0
        ? "success"
        : testMode
          ? "test-failure"
          : "runtime-error",
    stdout: execution.stdout,
    stderr: execution.stderr,
    diagnostics: [],
    durationMs: 0,
    ...(counts ? { tests: counts } : {}),
  };
  if (fixture.expectRejection) {
    const rejected =
      !infrastructureFailure &&
      (behavioralRejection(execution) ||
        (execution.status === 0 &&
          !!fixture.evaluator &&
          !evaluate(fixture.evaluator, { code: fixture.code, result: run })
            .passed));
    record(
      fixture.id,
      !!rejected,
      rejected
        ? "starter rejected by behavioral assertions or authored evaluator"
        : `starter rejection unproven: ${failedDetail(execution)}`,
    );
    return;
  }
  if (fixture.expectRuntimeFailure) {
    record(
      fixture.id,
      run.status === "runtime-error",
      run.status === "runtime-error"
        ? "authored runtime failure observed"
        : failedDetail(execution),
    );
    return;
  }
  let passed =
    run.status === "success" &&
    (!testMode || (!!counts && counts.passed > 0 && counts.failed === 0));
  let detail = failedDetail(execution);
  if (
    passed &&
    fixture.expectedOutput !== undefined &&
    execution.stdout !== fixture.expectedOutput
  ) {
    passed = false;
    detail = `output ${JSON.stringify(execution.stdout)}, expected ${JSON.stringify(fixture.expectedOutput)}`;
  }
  if (
    passed &&
    fixture.evaluator &&
    ["tests", "exact-output", "compilation"].includes(fixture.evaluator.kind)
  ) {
    const outcome = evaluate(fixture.evaluator, {
      code: fixture.code,
      result: run,
    });
    passed = outcome.passed;
    detail = outcome.feedback;
  }
  record(
    fixture.id,
    passed,
    passed
      ? testMode
        ? `${counts!.passed} hidden assertions tests passed`
        : "compiled and executed"
      : detail,
  );
}

try {
  mkdirSync(join(directory, "src"));
  for (const file of ["Cargo.toml", "Cargo.lock", "src/lib.rs", "src/main.rs"])
    copyFileSync(join(profile, file), join(directory, file));
  const originalLock = readFileSync(join(profile, "Cargo.lock"));
  if (flags.includes("--fetch")) {
    const fetched = command("cargo", ["fetch", "--locked"], 60_000);
    if (fetched.error || fetched.status !== 0)
      throw new Error(
        `Fixed dependency fetch failed: ${failedDetail(fetched)}`,
      );
  }
  const preflight = cargo(["test", "--lib"]);
  if (
    preflight.error ||
    preflight.status !== 0 ||
    !testCounts(preflight.stdout)?.passed
  )
    throw new Error(
      `Fixed Cargo profile preflight failed: ${failedDetail(preflight)}`,
    );
  for (const fixture of cases) verify(fixture);
  if (!originalLock.equals(readFileSync(join(directory, "Cargo.lock"))))
    throw new Error("Cargo.lock changed during locked verification");
} catch (error) {
  record(
    "tokio/infrastructure",
    false,
    error instanceof Error ? error.message : String(error),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(
  `${results.filter((item) => item.passed).length}/${results.length} authored Tokio cases verified.`,
);
if (results.some((item) => !item.passed)) process.exitCode = 1;
