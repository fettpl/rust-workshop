/** Executes only the reviewed Mini grep archive and one fixed mutant, never learner code. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { miniGrepPackage } from "../src/content/projects/mini-grep";
import { projectFiles } from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";
import { verifyFuzzResult, verifyNamedRegressionFailure, type FuzzExpectation } from "./fuzz-result";
import { createPartialReport, reduceWitness, sha256Bytes, validateEvidenceReport, type ReductionResult } from "./fuzz-evidence";

const args = process.argv.slice(2);
assert(
  args.length <= 1 && args.every((arg) => arg === "--fetch"),
  "Only --fetch is accepted, never code or paths",
);
const toolchain = "nightly-2026-08-08";
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-fuzz-"));
// Keep each run's corpus and crash artifact, including failures, for diagnosis.
const reports = join(process.cwd(), "test-results/mini-grep-fuzz");
mkdirSync(reports, { recursive: true });
const report = mkdtempSync(join(reports, "run-"));
let env = { ...process.env };
const runId = report.split("/").at(-1)!;
let archiveSha256 = "0".repeat(64);
let manifestSha256 = "0".repeat(64);
let host = "unknown";
let observedRuns = 0;
let campaignStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let mutantStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let mutantReplayStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let restoredReplayStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let stableRegressionStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let reductionReplayStatus: "passed" | "failed" | "infrastructure" = "infrastructure";
let phaseErrors: string[] = [];
let reductionEvidence: ReductionResult | undefined;
let authoredOriginalPath = "";
let authoredRegressionSha256 = "";
let stableRegressionSha256 = "0".repeat(64);

function recordPhaseError(error: unknown): void {
  phaseErrors = [...phaseErrors, String(error)];
  if (campaignStatus === "passed") campaignStatus = "failed";
}

function run(
  name: string,
  binary: string,
  commandArgs: string[],
  expectation?: FuzzExpectation,
  timeout = 60_000,
) {
  const result = spawnSync(binary, commandArgs, {
    cwd: root,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  writeFileSync(
    join(report, `${name.replace(/[\\/]/g, "_")}.log`),
    `${binary} ${commandArgs.join(" ")}\n${output}\nstatus=${result.status}; signal=${result.signal}; error=${result.error?.message ?? "none"}\n`,
  );
  const passed = expectation
    ? verifyFuzzResult(
        { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" },
        expectation,
      )
    : !result.error && !result.signal && result.status === 0;
  console.log(`${passed ? "ok" : "FAIL"} ${name}`);
  if (!passed)
    throw new Error(
      `${name}: ${result.error?.message ?? output}\nReports: ${report}`,
    );
  return output;
}

try {
  const served = readFileSync(
    join(process.cwd(), "public/projects", miniGrepPackage.id, "solution.zip"),
  );
  archiveSha256 = sha256Bytes(served);
  assert.deepEqual(
    served,
    Buffer.from(buildProjectArchive(miniGrepPackage, "solution")),
    "Fuzz must verify the exact downloadable archive",
  );
  for (const [path, content] of Object.entries(
    projectFiles(miniGrepPackage, "solution"),
  )) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const lockFiles = ["Cargo.lock", "fuzz/Cargo.lock"];
  const locks = lockFiles.map((path) => readFileSync(join(root, path), "utf8"));
  const manifestBytes = readFileSync(join(root, "FUZZ-MANIFEST.json"));
  manifestSha256 = sha256Bytes(manifestBytes);
  const manifest = JSON.parse(manifestBytes.toString()) as {
    sourceHashes?: Record<string, string>;
  };
  for (const [path, expectedHash] of Object.entries(manifest.sourceHashes ?? {}))
    assert.equal(sha256Bytes(readFileSync(join(root, path))), expectedHash, `Stale authored source hash for ${path}`);
  stableRegressionSha256 = sha256Bytes(readFileSync(join(root, "fuzz/regressions/substring-prefix.seed")));
  const compiler = run("resolve-rustc", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "rustc",
  ]).trim();
  const cargo = run("resolve-cargo", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "cargo",
  ]).trim();
  const rustdoc = run("resolve-rustdoc", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "rustdoc",
  ]).trim();
  const rustfmt = run("resolve-rustfmt", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "rustfmt",
  ]).trim();
  const stableCompiler = run("resolve-stable-rustc", "rustup", ["which", "--toolchain", "1.85.0", "rustc"]).trim();
  const stableCargo = run("resolve-stable-cargo", "rustup", ["which", "--toolchain", "1.85.0", "cargo"]).trim();
  const stableRustdoc = run("resolve-stable-rustdoc", "rustup", ["which", "--toolchain", "1.85.0", "rustdoc"]).trim();
  // cargo-fuzz spawns bare cargo/rustc; rustup run alone can still select a
  // non-proxy Homebrew compiler. Pin the entire child process chain explicitly.
  env = {
    ...env,
    PATH: `${dirname(cargo)}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`,
    RUSTC: compiler,
    RUSTDOC: rustdoc,
    RUSTFLAGS: "",
  };
  delete env.CARGO_ENCODED_RUSTFLAGS;
  const version = run("compiler-version", compiler, ["-vV"]);
  assert(
    version.includes("nightly"),
    "A nightly compiler is required for instrumentation",
  );
  const resolvedHost = version.match(/^host: (\S+)$/m)?.[1];
  assert(resolvedHost, "Compiler must report its native target");
  host = resolvedHost;
  assert.match(
    run("cargo-fuzz-version", "cargo-fuzz", ["--version"]),
    /^cargo-fuzz 0\.13\.2\s*$/,
  );
  if (args.includes("--fetch"))
    run("fetch", cargo, [
      "fetch",
      "--manifest-path",
      "fuzz/Cargo.toml",
      "--locked",
    ]);
  env.CARGO_NET_OFFLINE = "true";
  run("oracle-build", compiler, [
    "--edition",
    "2024",
    "--test",
    "fuzz/oracle.rs",
    "-o",
    join(root, "oracle-tests"),
  ]);
  assert.match(
    run("oracle-test", join(root, "oracle-tests"), []),
    /test result: ok\. 3 passed/,
  );
  run("authored-fuzz-rustfmt", rustfmt, [
    "--edition",
    "2024",
    "--check",
    "fuzz/fuzz_targets/selection.rs",
    "tests/fuzz_regressions.rs",
    "fuzz/support/case.rs",
    "fuzz/support/check.rs",
    "fuzz/oracle.rs",
  ]);
  run("fuzz-format", cargo, [
    "fmt",
    "--manifest-path",
    "fuzz/Cargo.toml",
    "--",
    "--check",
  ]);
  const target = join(root, "fuzz/target");
  const binary = join(target, host, "release", "selection");
  const build = (name: string) =>
    run(
      name,
      "cargo-fuzz",
      ["fuzz", "build", "selection", "--target", host, "--target-dir", target],
      undefined,
      180_000,
    );
  const corpus = join(root, "fuzz/corpus/selection");
  const artifacts = join(root, "fuzz/artifacts/selection");
  mkdirSync(artifacts, { recursive: true });
  const limits = [
    "-seed=20260913",
    "-runs=20000",
    "-max_len=4096",
    "-max_total_time=30",
    "-timeout=3",
    "-rss_limit_mb=1024",
    `-artifact_prefix=${artifacts}/`,
  ];
  build("reference-build");
  const campaignOutput = run("reference-campaign", binary, [corpus, ...limits], {
    kind: "campaign",
    minimumRuns: 1000,
  });
  observedRuns = Number(campaignOutput.match(/^#(\d+)\s+DONE/m)?.[1] ?? 0);
  campaignStatus = "passed";
  const searchPath = join(root, "src/search.rs");
  const original = readFileSync(searchPath, "utf8");
  const needle = "if !line.contains(query.as_str()) {";
  assert.equal(
    original.split(needle).length,
    2,
    "Fixed mutation must match exactly once",
  );
  try {
    writeFileSync(
      searchPath,
      original.replace(needle, "if !line.starts_with(query.as_str()) {"),
    );
    build("mutant-build");
    const stableMutationEnv = { ...env, PATH: `${dirname(stableCargo)}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`, RUSTC: stableCompiler, RUSTDOC: stableRustdoc };
    const stableMutation = spawnSync(stableCargo, ["test", "--manifest-path", join(root, "Cargo.toml"), "--locked", "--test", "fuzz_regressions"], { cwd: root, env: stableMutationEnv, encoding: "utf8", timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
    const stableMutationOutput = `${stableMutation.stdout ?? ""}${stableMutation.stderr ?? ""}`;
    writeFileSync(join(report, "mutant-stable-regression.log"), `${stableMutationOutput}\nstatus=${stableMutation.status}; signal=${stableMutation.signal}; error=${stableMutation.error?.message ?? "none"}\n`);
    assert(
      verifyNamedRegressionFailure(
        { ...stableMutation, stdout: stableMutation.stdout ?? "", stderr: stableMutation.stderr ?? "" },
        "substring_prefix_witness_is_exact_and_replays_selection_mismatch",
      ),
      "Controlled mutant must compile and fail the named stable regression",
    );
    const result = spawnSync(binary, [corpus, ...limits], {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    writeFileSync(
      join(report, "mutant-campaign.log"),
      `${result.stdout ?? ""}${result.stderr ?? ""}\nstatus=${result.status}; signal=${result.signal}; error=${result.error?.message ?? "none"}\n`,
    );
    const crashes = readdirSync(artifacts).filter(
      (name) =>
        name.startsWith("crash-") &&
        readFileSync(join(artifacts, name)).length > 0,
    );
    assert(
      verifyFuzzResult(
        { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" },
        { kind: "counterexample", artifactWritten: crashes.length > 0 },
      ),
      `Intended mutation was not detected; see ${report}`,
    );
    mutantStatus = "failed";
    const crash = crashes[0];
    assert(crash, "The controlled mutant must produce a fresh crash artifact");
    const crashPath = join(artifacts, crash);
    const replayMutantArtifact = (name: string, witnessPath: string) => {
      const replayArtifacts = join(root, `fuzz/artifacts/${name}`);
      mkdirSync(replayArtifacts, { recursive: true });
      const result = spawnSync(binary, [witnessPath, "-runs=1", "-timeout=3", "-rss_limit_mb=1024", `-artifact_prefix=${replayArtifacts}/`], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      writeFileSync(
        join(report, `${name}.log`),
        `${output}\nstatus=${result.status}; signal=${result.signal}; error=${result.error?.message ?? "none"}\n`,
      );
      const artifactWritten = readdirSync(replayArtifacts).length > 0;
      assert(
        verifyFuzzResult(
          { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" },
          { kind: "counterexample", artifactWritten },
        ),
        `Mutant replay did not reproduce SelectionMismatch; see ${report}/${name}.log`,
      );
    };
    replayMutantArtifact("mutant-replay", crashPath);
    mutantReplayStatus = "failed";
    const paddedWitnessPath = join(root, "fuzz/regressions/substring-prefix-padded.seed");
    authoredOriginalPath = join(report, "padded-original.seed");
    writeFileSync(authoredOriginalPath, readFileSync(paddedWitnessPath));
    authoredRegressionSha256 = sha256Bytes(readFileSync(paddedWitnessPath));
    replayMutantArtifact("padded-mutant-replay", paddedWitnessPath);
    let candidateNumber = 0;
    const reductionDeadline = Date.now() + 30_000;
    reductionEvidence = reduceWitness(readFileSync(paddedWitnessPath), (candidate) => {
      const remainingMs = reductionDeadline - Date.now();
      if (remainingMs <= 0)
        return { status: "timeout" as const };
      const candidatePath = join(root, `reduction-candidate-${candidateNumber++}.seed`);
      writeFileSync(candidatePath, candidate);
      const candidateResult = spawnSync(binary, [candidatePath, "-runs=1", "-timeout=3", "-rss_limit_mb=1024"], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: Math.min(3_500, remainingMs),
        maxBuffer: 8 * 1024 * 1024,
      });
      const candidateOutput = `${candidateResult.stdout ?? ""}${candidateResult.stderr ?? ""}`;
      if (Date.now() > reductionDeadline)
        return { status: "timeout" as const };
      if (candidateResult.error || candidateResult.signal) {
        return candidateResult.error?.message.includes("timed out") || candidateResult.signal === "SIGTERM"
          ? { status: "timeout" as const }
          : { status: "other" as const, failureKind: "CompileError" };
      }
      if (candidateResult.status === 77 && candidateOutput.includes("mini-grep selection oracle mismatch"))
        return { status: "finding" as const, failureKind: "SelectionMismatch" as const };
      return candidateResult.status !== 0
        ? { status: "other" as const, failureKind: "OtherAssertion" }
        : { status: "other" as const };
    }, { minInputBytes: 3, maxInputBytes: 4096, maxAttempts: 256, deadlineMs: 30_000 });
    assert.equal(reductionEvidence.status, "reduced", "Authored padded witness must strictly reduce through the mutant");
    writeFileSync(join(report, "reduced.seed"), reductionEvidence.reduced);
    replayMutantArtifact("reduced-mutant-replay", join(report, "reduced.seed"));
    reductionReplayStatus = "failed";
    writeFileSync(
      join(report, "reducer.json"),
      `${JSON.stringify({
        attempts: reductionEvidence.attempts,
        status: reductionEvidence.status,
        observations: reductionEvidence.observations.map(({ bytes, observation }) => ({ bytes: bytes.length, observation })),
      }, null, 2)}\n`,
    );
    console.log(
      "ok fixed substring-to-prefix mutant rejected by oracle with saved padded witness",
    );
    /*
     * A compiler failure is an infrastructure observation, never a fuzz
     * finding. Keep this negative control separate from the mutant campaign.
     */
    const compileNegative = spawnSync(compiler, ["--definitely-invalid-fuzz-flag"], { cwd: root, env, encoding: "utf8", timeout: 10_000 });
    writeFileSync(join(report, "compile-error-negative.log"), `${compileNegative.stdout ?? ""}${compileNegative.stderr ?? ""}\nstatus=${compileNegative.status}; error=${compileNegative.error?.message ?? "none"}\n`);
    assert(compileNegative.status !== 0 && !verifyFuzzResult({ ...compileNegative, stdout: compileNegative.stdout ?? "", stderr: compileNegative.stderr ?? "" }, { kind: "counterexample", artifactWritten: false }), "Compile failure must not be a fuzz finding");
  } finally {
    writeFileSync(searchPath, original);
  }
  build("restored-build");
  const stableEnv = { ...env, PATH: `${dirname(stableCargo)}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`, RUSTC: stableCompiler, RUSTDOC: stableRustdoc };
  const stable = spawnSync(stableCargo, ["test", "--manifest-path", join(root, "Cargo.toml"), "--locked"], { cwd: root, env: stableEnv, encoding: "utf8", timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(join(report, "stable-regression.log"), `${stable.stdout ?? ""}${stable.stderr ?? ""}\nstatus=${stable.status}; signal=${stable.signal}; error=${stable.error?.message ?? "none"}\n`);
  stableRegressionStatus = !stable.error && !stable.signal && stable.status === 0 ? "passed" : "infrastructure";
  if (stableRegressionStatus !== "passed") throw new Error(`Stable regression failed; see ${report}/stable-regression.log`);
  const restoredArtifacts = [
    ...readdirSync(artifacts).filter((name) => name.startsWith("crash-")),
    ...(authoredOriginalPath ? [authoredOriginalPath] : []),
    ...(reductionEvidence?.status === "reduced" ? ["../../reduced.seed"] : []),
  ];
  for (const artifact of restoredArtifacts)
    run(`replay-restored-${artifact}`, binary, [artifact.startsWith("../") ? join(report, "reduced.seed") : artifact.startsWith(report) ? artifact : join(artifacts, artifact), "-runs=1", "-timeout=3", "-rss_limit_mb=1024"], {
      kind: "replay",
    });
  restoredReplayStatus = "passed";
  lockFiles.forEach((path, index) =>
    assert.equal(
      readFileSync(join(root, path), "utf8"),
      locks[index],
      `Verification rewrote ${path}`,
    ),
  );
  console.log(
    `Mini grep fuzz passed: instrumented campaign, controlled counterexample and restored replay. Reports: ${report}`,
  );
} catch (error) {
  recordPhaseError(error);
  throw error;
} finally {
  for (const directory of ["corpus", "artifacts"]) {
    const source = join(root, "fuzz", directory);
    try {
      cpSync(source, join(report, directory), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") recordPhaseError(error);
    }
  }
  const artifactDirectory = join(report, "artifacts/selection");
  const artifact = existsSync(artifactDirectory)
    ? readdirSync(artifactDirectory, { withFileTypes: true }).find((entry) => entry.name.startsWith("crash-"))
    : undefined;
  const artifactPath = authoredOriginalPath || (artifact ? join(report, "artifacts/selection", artifact.name) : "");
  let artifactBytes = new Uint8Array();
  if (artifactPath) {
    try {
      artifactBytes = readFileSync(artifactPath);
    } catch (error) {
      recordPhaseError(error);
    }
  }
  const reduced = reductionEvidence;
  const allPhasesPassed = phaseErrors.length === 0 && campaignStatus === "passed" && mutantStatus === "failed" && mutantReplayStatus === "failed" && reductionReplayStatus === "failed" && restoredReplayStatus === "passed" && stableRegressionStatus === "passed";
  const evidence = createPartialReport({
    runId,
    archiveSha256,
    manifestSha256,
    host,
    status: allPhasesPassed ? "passed" : "infrastructure",
    referenceCampaign: { status: campaignStatus, observedRuns, instrumentation: campaignStatus === "passed", normalCompletion: campaignStatus === "passed", replayOnly: false },
    observedExecutions: observedRuns,
    mutant: { identity: "substring-to-prefix", status: mutantStatus === "failed" ? "failed" : mutantStatus, assertion: "mini-grep selection oracle mismatch" },
    artifacts: { original: { path: artifactPath, sha256: artifactBytes.length ? sha256Bytes(artifactBytes) : "0".repeat(64), bytes: artifactBytes.length, runId, archiveSha256, manifestSha256 }, ...(reduced && reduced.status === "reduced" ? { reduced: { path: join(report, "reduced.seed"), sha256: sha256Bytes(reduced.reduced), bytes: reduced.reduced.length, runId, archiveSha256, manifestSha256 } } : {}) },
    reduction: reduced ? { attempts: reduced.attempts, status: reduced.status, failureKind: "SelectionMismatch", replay: { status: reductionReplayStatus, failureKind: "SelectionMismatch" } } : undefined,
    mutantReplay: { status: mutantReplayStatus, failureKind: "SelectionMismatch" },
    restoredReplay: { status: restoredReplayStatus, failureKind: "none" },
    stableRegression: { identity: "substring-prefix-seed", status: stableRegressionStatus, toolchain: "1.85.0", channel: "stable", sha256: stableRegressionSha256 },
    phaseErrors,
  });
  try {
    validateEvidenceReport(evidence, { runId, archiveSha256, manifestSha256, regressionSha256: authoredRegressionSha256, stableRegressionSha256 });
  } catch (error) {
    recordPhaseError(error);
    evidence.status = "infrastructure";
  }
  try {
    writeFileSync(join(report, "report.json"), `${JSON.stringify({ ...evidence, status: phaseErrors.length ? "infrastructure" : evidence.status, phaseErrors }, null, 2)}\n`);
  } catch (error) {
    recordPhaseError(error);
  }
  // A phase error is a failed verification even when it happened while the
  // report was being finalized. CI must not accept a partial dossier as a
  // successful command.
  if (phaseErrors.length > 0) process.exitCode = 1;
  rmSync(root, { recursive: true, force: true });
}
