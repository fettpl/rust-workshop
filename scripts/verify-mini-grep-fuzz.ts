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
import { verifyFuzzResult, type FuzzExpectation } from "./fuzz-result";
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
let phaseErrors: string[] = [];
let reductionEvidence: ReductionResult | undefined;

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
    join(report, `${name}.log`),
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
    writeFileSync(join(report, "mutant-stable-regression.log"), `${stableMutation.stdout ?? ""}${stableMutation.stderr ?? ""}\nstatus=${stableMutation.status}; signal=${stableMutation.signal}; error=${stableMutation.error?.message ?? "none"}\n`);
    assert(stableMutation.status !== 0 && !stableMutation.error && !stableMutation.signal, "Controlled mutant unexpectedly passed stable regression");
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
    run("mutant-replay", binary, [crashPath, "-runs=1", "-timeout=3", "-rss_limit_mb=1024"], {
      kind: "counterexample",
      artifactWritten: true,
    });
    mutantReplayStatus = "failed";
    let candidateNumber = 0;
    reductionEvidence = reduceWitness(readFileSync(crashPath), (candidate) => {
      const candidatePath = join(root, `reduction-candidate-${candidateNumber++}.seed`);
      writeFileSync(candidatePath, candidate);
      const candidateResult = spawnSync(binary, [candidatePath, "-runs=1", "-timeout=3", "-rss_limit_mb=1024"], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 3_500,
        maxBuffer: 8 * 1024 * 1024,
      });
      const candidateOutput = `${candidateResult.stdout ?? ""}${candidateResult.stderr ?? ""}`;
      if (candidateResult.error || candidateResult.signal) {
        return candidateResult.error?.message.includes("timed out") || candidateResult.signal === "SIGTERM"
          ? { status: "timeout" as const }
          : { status: "other" as const };
      }
      if (candidateResult.status === 77 && candidateOutput.includes("mini-grep selection oracle mismatch"))
        return { status: "finding" as const, failureKind: "SelectionMismatch" as const };
      return { status: "other" as const };
    });
    if (reductionEvidence.status === "reduced")
      writeFileSync(join(report, "reduced.seed"), reductionEvidence.reduced);
    writeFileSync(
      join(report, "reducer.json"),
      `${JSON.stringify({
        attempts: reductionEvidence.attempts,
        status: reductionEvidence.status,
        observations: reductionEvidence.observations.map(({ bytes, observation }) => ({ bytes: bytes.length, observation })),
      }, null, 2)}\n`,
    );
    console.log(
      "ok fixed substring-to-prefix mutant rejected by oracle with saved input",
    );
  } finally {
    writeFileSync(searchPath, original);
  }
  build("restored-build");
  restoredReplayStatus = "passed";
  const stableEnv = { ...env, PATH: `${dirname(stableCargo)}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`, RUSTC: stableCompiler, RUSTDOC: stableRustdoc };
  const stable = spawnSync(stableCargo, ["test", "--manifest-path", join(root, "Cargo.toml"), "--locked"], { cwd: root, env: stableEnv, encoding: "utf8", timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(join(report, "stable-regression.log"), `${stable.stdout ?? ""}${stable.stderr ?? ""}\nstatus=${stable.status}; signal=${stable.signal}; error=${stable.error?.message ?? "none"}\n`);
  stableRegressionStatus = !stable.error && !stable.signal && stable.status === 0 ? "passed" : "infrastructure";
  if (stableRegressionStatus !== "passed") throw new Error(`Stable regression failed; see ${report}/stable-regression.log`);
  const restoredArtifacts = [
    ...readdirSync(artifacts).filter((name) => name.startsWith("crash-")),
    ...(reductionEvidence?.status === "reduced" ? ["../../reduced.seed"] : []),
  ];
  for (const artifact of restoredArtifacts)
    run(`replay-restored-${artifact}`, binary, [artifact.startsWith("../") ? join(report, "reduced.seed") : join(artifacts, artifact), "-runs=1", "-timeout=3", "-rss_limit_mb=1024"], {
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
} finally {
  for (const directory of ["corpus", "artifacts"]) {
    const source = join(root, "fuzz", directory);
    try {
      cpSync(source, join(report, directory), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const artifactDirectory = join(report, "artifacts/selection");
  const artifact = existsSync(artifactDirectory)
    ? readdirSync(artifactDirectory, { withFileTypes: true }).find((entry) => entry.name.startsWith("crash-"))
    : undefined;
  const artifactPath = artifact ? join(report, "artifacts/selection", artifact.name) : "";
  const artifactBytes = artifactPath ? readFileSync(artifactPath) : new Uint8Array();
  const reduced = reductionEvidence;
  const evidence = createPartialReport({
    runId,
    archiveSha256,
    manifestSha256,
    host,
    status: campaignStatus === "passed" && mutantStatus === "failed" && mutantReplayStatus === "failed" && restoredReplayStatus === "passed" && stableRegressionStatus === "passed" ? "passed" : "infrastructure",
    referenceCampaign: { status: campaignStatus, observedRuns, instrumentation: campaignStatus === "passed", normalCompletion: campaignStatus === "passed", replayOnly: false },
    observedExecutions: observedRuns,
    mutant: { identity: "substring-to-prefix", status: mutantStatus === "failed" ? "failed" : mutantStatus, assertion: "mini-grep selection oracle mismatch" },
    artifacts: { original: { path: artifactPath, sha256: artifactBytes.length ? sha256Bytes(artifactBytes) : "0".repeat(64), bytes: artifactBytes.length }, ...(reduced && reduced.status === "reduced" ? { reduced: { path: join(report, "reduced.seed"), sha256: sha256Bytes(reduced.reduced), bytes: reduced.reduced.length } } : {}) },
    reduction: reduced ? { attempts: reduced.attempts, status: reduced.status, failureKind: "SelectionMismatch" } : undefined,
    mutantReplay: { status: mutantReplayStatus, failureKind: "SelectionMismatch" },
    restoredReplay: { status: restoredReplayStatus, failureKind: "none" },
    stableRegression: { status: stableRegressionStatus, toolchain: "rustc 1.85.0", sha256: "9a4e5eea45a79d6a59b9c9e64d3e043ad612e9340526492e52f020526c4deaa1" },
    phaseErrors,
  });
  try { validateEvidenceReport(evidence); } catch (error) { phaseErrors = [...phaseErrors, String(error)]; }
  writeFileSync(join(report, "report.json"), `${JSON.stringify({ ...evidence, phaseErrors }, null, 2)}\n`);
  rmSync(root, { recursive: true, force: true });
}
