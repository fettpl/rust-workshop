/** Verifies only the repository-authored Log Analyzer performance archive. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { homedir, tmpdir, userInfo } from "node:os";
import {
  existsSync,
  lstatSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const a7Ids = [
  "log_analyzer_a7/baseline/filtered-mixed-2048-v1",
  "log_analyzer_a7/candidate/filtered-mixed-2048-v1",
] as const;
const A7_SAMPLE_SIZE = 30;
const A7_MANIFEST_PATHS = [
  "tests/support/a7_filtered_mixed_2048.rs",
  "tests/a7_performance_contract.rs",
  "tests/a7_filter_ignored_mutant.rs",
  "A7-PERFORMANCE-MANIFEST.json",
  "A7-REPLAY.md",
  "A7-INVESTIGATION.md",
] as const;
const A7_ARCHIVE_FILE_COUNT = 26;
const A7_PROBE_TIMEOUT_MS = 30_000;
const A7_NATIVE_TIMEOUT_MS = 600_000;
const A7_FIXED_OFFLINE_CONFIG = "[net]\noffline = true\n";
const A7_CHILD_ENV_KEYS = [
  "HOME",
  "PATH",
  "CARGO_HOME",
  "RUSTUP_HOME",
  "RUSTUP_TOOLCHAIN",
  "RUSTUP_AUTO_INSTALL",
  "CARGO_NET_OFFLINE",
  "CRITERION_HOME",
  "CARGO_TARGET_DIR",
  "TMPDIR",
  "TMP",
  "TEMP",
  "CARGO_TERM_COLOR",
  "RUSTC",
  "RUSTDOC",
] as const;
const A7_NEUTRALIZED_ENV_KEYS = [
  "RUSTFLAGS",
  "RUSTDOCFLAGS",
  "CARGO_ENCODED_RUSTFLAGS",
  "RUSTC_WRAPPER",
  "RUSTC_WORKSPACE_WRAPPER",
  "CARGO_BUILD_RUSTC_WRAPPER",
  "CARGO_CONFIG",
  "CARGO_BUILD_TARGET",
  "RUSTUP_DIST_SERVER",
  "RUSTUP_UPDATE_ROOT",
] as const;
const A7_FIXED_SYSTEM_PATH_DIRS = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"] as const;

type A7ChildEnvironmentInput = {
  ambient: Record<string, string | undefined>;
  realHome: string;
  cargoHome: string;
  rustupHome: string;
  criterionHome: string;
  targetDir: string;
  tempDir: string;
  requestedToolchain: "stable" | "1.85.0";
  rustup: string;
  tools: { cargo: string; rustc: string; rustdoc: string };
  systemPathDirs: readonly string[];
};

/** Builds the closed A7 child environment without copying ambient variables. */
export function buildA7ChildEnvironment(input: A7ChildEnvironmentInput): {
  env: Record<string, string>;
  omittedKeys: string[];
  pathEntries: string[];
} {
  const pathEntries = [
    dirname(input.rustup),
    dirname(input.tools.cargo),
    dirname(input.tools.rustc),
    dirname(input.tools.rustdoc),
    ...input.systemPathDirs,
  ].filter((entry, index, all) => all.indexOf(entry) === index);
  const env: Record<string, string> = {
    HOME: input.realHome,
    PATH: pathEntries.join(delimiter),
    CARGO_HOME: input.cargoHome,
    RUSTUP_HOME: input.rustupHome,
    RUSTUP_TOOLCHAIN: input.requestedToolchain,
    RUSTUP_AUTO_INSTALL: "0",
    CARGO_NET_OFFLINE: "true",
    CRITERION_HOME: input.criterionHome,
    CARGO_TARGET_DIR: input.targetDir,
    TMPDIR: input.tempDir,
    TMP: input.tempDir,
    TEMP: input.tempDir,
    CARGO_TERM_COLOR: "never",
    RUSTC: input.tools.rustc,
    RUSTDOC: input.tools.rustdoc,
  };
  const overridden = new Set<string>([
    ...A7_CHILD_ENV_KEYS,
    ...A7_NEUTRALIZED_ENV_KEYS,
  ]);
  const omittedKeys = Object.keys(input.ambient)
    .filter(
      (key) =>
        key !== "HOME" &&
        (overridden.has(key) ||
          /^CARGO_PROFILE_/.test(key) ||
          (/^CARGO_NET_/.test(key) && key !== "CARGO_NET_OFFLINE") ||
          /^(CARGO_HTTP_|CARGO_REGISTRIES_|RUSTUP_DIST_|RUSTUP_UPDATE_)/.test(
            key,
          )),
    )
    .sort();
  return { env, omittedKeys, pathEntries };
}

/** Pure policy check for the only Cargo config accepted by closed A7. */
export function validateA7CargoConfigPolicy(input: {
  cargoHomeConfig: string | null;
  ancestorConfigs: readonly string[];
}): { config: "absent" | "fixed-offline" } {
  if (input.ancestorConfigs.length !== 0)
    throw new Error("Unexpected Cargo config in package cwd ancestors");
  if (input.cargoHomeConfig === null) return { config: "absent" };
  if (input.cargoHomeConfig !== A7_FIXED_OFFLINE_CONFIG)
    throw new Error("Unexpected Cargo HOME config");
  return { config: "fixed-offline" };
}

export function validateA7HomeBinding(input: {
  configuredHome: string;
  osHome: string;
  canonicalHome: string;
  exists: boolean;
  regularDirectory: boolean;
  canonicalAncestors: boolean;
}): string {
  assert.equal(input.configuredHome, input.osHome, "HOME differs from the OS user home");
  assert(isAbsolute(input.osHome), "OS user home must be absolute");
  assert.equal(resolve(input.osHome), input.osHome, "OS user home must be normalized");
  assert.equal(input.canonicalHome, input.osHome, "OS user home must be canonical");
  assert(input.exists, "OS user home must exist");
  assert(input.regularDirectory, "OS user home must be a directory");
  assert(input.canonicalAncestors, "OS user home ancestors must be canonical");
  return input.osHome;
}

export function a7ArchiveTempPrefix(tempDir: string): string {
  assert(isAbsolute(tempDir), "A7 archive temp root must be absolute");
  assert.equal(resolve(tempDir), tempDir, "A7 archive temp root must be normalized");
  assert(!tempDir.includes("<"), "A7 archive temp root must be raw");
  return join(tempDir, "archive-");
}

export function parseA7RustupVersion(raw: string): string {
  const version = raw.trim();
  assert(/^rustup\s+\S+/.test(version), "Qualified rustup version probe was invalid");
  return version;
}
export const A7_CARGO_TOML_SHA256 =
  "7fd629a19e5aba4b51fa03b1daec55153973cd5534f40b19e6c29052f7d59436";
export const A7_CARGO_LOCK_SHA256 =
  "c822762f52d50dc2083478d8549ea0361b0fe93692654994812041075a556da5";
export const A7_CRITERION_VERSION = "0.5.1";
const A7_PACKAGE_NAME = "log-analyzer-workshop";
const A7_PACKAGE_VERSION = "0.1.0";
const A7_EXPECTED_ARCHIVE_PATHS = [
  "Cargo.toml",
  "Cargo.lock",
  "src/lib.rs",
  "src/analyzer.rs",
  "src/main.rs",
  "tests/integration.rs",
  "tests/process.rs",
  "benches/log_analyzer.rs",
  "tests/performance_contract.rs",
  "tests/source_model_contract.rs",
  "PROFILE-MANIFEST.json",
  "PERFORMANCE.md",
  "examples/allocation_probe.rs",
  "examples/support/allocation_counter.rs",
  "tests/allocation_counter_contract.rs",
  "ALLOCATION-MANIFEST.json",
  "ALLOCATION-EVIDENCE.md",
  "fixtures/mixed.log",
  "README.md",
  ".gitignore",
  ...A7_MANIFEST_PATHS,
] as const;

export function parsePerformanceArgs(args: readonly string[]) {
  const allowed = new Set(["--a7", "--fetch", "--msrv"]);
  assert(
    args.every((argument) => allowed.has(argument)),
    "Only --a7, --fetch and --msrv are supported",
  );
  assert(
    new Set(args).size === args.length,
    "Duplicate verifier arguments are not accepted",
  );
  const a7 = args.includes("--a7");
  const fetch = args.includes("--fetch");
  const msrv = args.includes("--msrv");
  assert(!(a7 && fetch), "--a7 cannot be combined with --fetch");
  return { a7, fetch, msrv } as const;
}
interface A7Interval {
  unit: "ns/iteration";
  pointEstimate: number;
  ci95: { confidenceLevel: number; low: number; high: number };
}
interface A7Measurement extends A7Interval {
  id: string;
  sampleCount: number;
  throughputBytes: number;
  artifacts: { path: string; bytes: number; sha256: string }[];
}
function object(value: unknown, label: string): Record<string, unknown> {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}
function positive(value: unknown, label: string): number {
  assert(
    typeof value === "number" && Number.isFinite(value) && value > 0,
    `${label} must be finite and positive`,
  );
  return value;
}
function interval(value: unknown): A7Interval {
  const data = object(value, "Interval"),
    ci = object(data.ci95, "Confidence interval");
  assert(
    data.unit === "ns/iteration" && ci.confidenceLevel === 0.95,
    "Only ns/iteration mean 95% intervals are comparable",
  );
  const pointEstimate = positive(data.pointEstimate, "Mean"),
    low = positive(ci.low, "Lower bound"),
    high = positive(ci.high, "Upper bound");
  assert(
    low <= pointEstimate && pointEstimate <= high,
    "Mean must lie inside ordered interval bounds",
  );
  return {
    unit: "ns/iteration",
    pointEstimate,
    ci95: { confidenceLevel: 0.95, low, high },
  };
}

/** Parses only the two closed A7 identities and their current-run raw triplets. */
export function parseA7CriterionTriplet(input: unknown): {
  baseline: A7Measurement;
  candidate: A7Measurement;
} {
  const data = object(input, "A7 evidence");
  assert(
    typeof data.namespace === "string" &&
      /^[a-zA-Z0-9_-]+$/.test(data.namespace),
    "A7 requires one safe current-run namespace",
  );
  const namespace = data.namespace;
  assert(
    Array.isArray(data.records) && data.records.length === 2,
    "Exactly two A7 benchmark records required",
  );
  const records = data.records.map((value) =>
    object(value, "Benchmark record"),
  );
  assert(
    new Set(records.map((r) => r.id)).size === 2 &&
      records.every((r) => a7Ids.some((id) => id === r.id)),
    "Both exact, distinct A7 benchmark IDs required",
  );
  const parse = (id: string): A7Measurement => {
    const entry = records.find((r) => r.id === id)!;
    assert(
      Array.isArray(entry.files) && entry.files.length === 3,
      "One complete Criterion triplet required",
    );
    const files = entry.files.map((value) => object(value, "Raw artifact"));
    const names = ["benchmark", "estimates", "sample"];
    const paths = names.map(
      (name) =>
        `test-results/performance-a7/${namespace}/criterion/${id}/new/${name}.json`,
    );
    assert(
      new Set(files.map((f) => f.path)).size === 3 &&
        files.every(
          (f) => typeof f.path === "string" && paths.includes(f.path),
        ),
      "Exact distinct current new/ triplet paths required",
    );
    const values = paths.map((path) => {
      const file = files.find((f) => f.path === path)!;
      assert(
        file.namespace === namespace && typeof file.raw === "string",
        "Raw artifact namespace/bytes mismatch",
      );
      assert(
        file.byteLength === Buffer.byteLength(file.raw) &&
          Number(file.byteLength) > 0,
        "Raw artifact byte length mismatch",
      );
      assert(
        typeof file.sha256 === "string" &&
          /^[a-f0-9]{64}$/.test(file.sha256) &&
          createHash("sha256").update(file.raw).digest("hex") === file.sha256,
        "Raw artifact SHA-256 mismatch",
      );
      return object(JSON.parse(file.raw) as unknown, "Criterion JSON");
    });
    const [benchmark, estimates, sample] = values;
    assert(
      benchmark.full_id === id &&
        benchmark.directory_name === id &&
        benchmark.group_id === "log_analyzer_a7" &&
        benchmark.function_id === id.split("/")[1] &&
        benchmark.value_str === "filtered-mixed-2048-v1",
      "Criterion benchmark identity mismatch",
    );
    const throughputBytes = positive(
      object(benchmark.throughput, "Throughput").Bytes,
      "Workload bytes",
    );
    assert(
      Number.isSafeInteger(throughputBytes),
      "Workload byte count must be an integer",
    );
    const mean = object(estimates.mean, "Criterion mean"),
      ci = object(
        mean.confidence_interval,
        "Criterion mean confidence interval",
      );
    assert(
      typeof mean.standard_error === "number" &&
        Number.isFinite(mean.standard_error) &&
        mean.standard_error >= 0,
      "Invalid mean standard error",
    );
    const measured = interval({
      unit: "ns/iteration",
      pointEstimate: mean.point_estimate,
      ci95: {
        confidenceLevel: ci.confidence_level,
        low: ci.lower_bound,
        high: ci.upper_bound,
      },
    });
    assert(
      Array.isArray(sample.iters) &&
        Array.isArray(sample.times) &&
        sample.iters.length > 0 &&
        sample.iters.length === sample.times.length,
      "Paired nonempty Criterion samples required",
    );
    assert(
      sample.iters.every(
        (v) =>
          typeof v === "number" &&
          Number.isFinite(v) &&
          v > 0 &&
          Number.isSafeInteger(v),
      ) &&
        sample.times.every(
          (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
        ),
      "Criterion samples must be finite and positive with integer iterations",
    );
    return {
      id,
      ...measured,
      sampleCount: sample.iters.length,
      throughputBytes,
      artifacts: files.map((f) => ({
        path: f.path as string,
        bytes: f.byteLength as number,
        sha256: f.sha256 as string,
      })),
    };
  };
  const baseline = parse(a7Ids[0]),
    candidate = parse(a7Ids[1]);
  assert(
    baseline.throughputBytes === candidate.throughputBytes,
    "Both benchmarks must process the same byte workload",
  );
  return { baseline, candidate };
}

export function compareA7Intervals(baseline: unknown, candidate: unknown) {
  const b = interval(baseline),
    c = interval(candidate);
  if (c.ci95.high < b.ci95.low)
    return "measured-faster-on-this-workload" as const;
  if (c.ci95.low > b.ci95.high)
    return "measured-slower-on-this-workload" as const;
  return "overlap-inconclusive" as const;
}

/** A nonzero process alone never proves the named behavioral control. */
export function classifyA7Mutant(input: unknown) {
  const evidence = object(input, "Mutant evidence");
  const issue = (value: unknown) => {
    const command = object(value, "Mutant command");
    if (
      !["timedOut", "signal", "error"].every((key) =>
        Object.hasOwn(command, key),
      ) ||
      typeof command.timedOut !== "boolean" ||
      !(
        command.signal === null ||
        (typeof command.signal === "string" && command.signal.length > 0)
      ) ||
      !(
        command.error === null ||
        (typeof command.error === "string" && command.error.length > 0)
      )
    )
      return "tool-error" as const;
    if (command.timedOut === true) return "timeout" as const;
    if (command.signal) return "signal" as const;
    if (
      command.error ||
      typeof command.status !== "number" ||
      !Number.isInteger(command.status) ||
      typeof command.stdout !== "string" ||
      typeof command.stderr !== "string"
    )
      return "tool-error" as const;
    return null;
  };
  if (!evidence.compile) return "not-run" as const;
  const compileIssue = issue(evidence.compile);
  if (compileIssue) return compileIssue;
  const compile = object(evidence.compile, "Compile");
  if (compile.status !== 0) return "compile-error" as const;
  if (!evidence.run) return "not-run" as const;
  const runIssue = issue(evidence.run);
  if (runIssue) return runIssue;
  const run = object(evidence.run, "Ignored run");
  if (run.status === 0) return "unexpected-pass" as const;
  const text = `${run.stdout}\n${run.stderr}`;
  const left =
    /left:\s*Summary\s*\{\s*info:\s*1,\s*warn:\s*1,\s*error:\s*2,\s*malformed:\s*2\s*\}/;
  const right =
    /right:\s*Summary\s*\{\s*info:\s*0,\s*warn:\s*0,\s*error:\s*2,\s*malformed:\s*2\s*\}/;
  return run.status === 101 &&
    /test a7_filter_ignored_v1_named_oracle \.\.\. FAILED/.test(text) &&
    text.includes("A7_FILTER_IGNORED_ORACLE") &&
    text.includes("assertion `left == right` failed") &&
    left.test(text) &&
    right.test(text) &&
    /test result: FAILED\. 0 passed; 1 failed; 0 ignored;/.test(text)
    ? ("expected-rejection" as const)
    : ("wrong-failure" as const);
}

export function isA7RunComplete(
  terminal: boolean,
  infrastructure: boolean,
  mutantStatus: string,
): boolean {
  return (
    terminal &&
    !infrastructure &&
    ["expected-rejection", "unexpected-pass"].includes(mutantStatus)
  );
}

type A7CommandEvidence = {
  name: string;
  executable: string;
  args: string[];
  timeoutMs: number;
  cwd: string;
  env: Record<string, string>;
  status: number | null;
  signal: string | null;
  timedOut: boolean;
  error: string | null;
  errorCode: string | null;
  outcome: "passed" | "failed" | "infrastructure";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutSha256: string;
  stderrSha256: string;
  stdoutTail: string;
  stderrTail: string;
};

type A7MutantCommandEvidence = Pick<
  A7CommandEvidence,
  "status" | "signal" | "timedOut" | "error"
> & {
  outcome: A7CommandEvidence["outcome"] | "not-run";
};

export function projectA7MutantCommand(
  command: A7MutantCommandEvidence,
  stdout: string,
  stderr: string,
) {
  if (command.outcome === "not-run") return undefined;
  return {
    status: command.status,
    signal: command.signal,
    timedOut: command.timedOut,
    error: command.error,
    stdout,
    stderr,
  };
}

export function classifyA7CommandResult(input: {
  status: number | null;
  signal: string | null;
  timedOut: boolean;
  error: string | null;
}): "passed" | "failed" | "infrastructure" {
  if (input.timedOut || input.signal || input.error || input.status === null)
    return "infrastructure";
  return input.status === 0 ? "passed" : "failed";
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

type A7ByteInput = string | Uint8Array;

function bytes(value: unknown, label: string): Uint8Array {
  assert(
    typeof value === "string" || value instanceof Uint8Array,
    `${label} must be UTF-8 bytes or text`,
  );
  return typeof value === "string" ? Buffer.from(value, "utf8") : value;
}

function utf8(value: Uint8Array): string {
  return Buffer.from(value).toString("utf8");
}

/** Binds extracted Cargo bytes to the public, pre-A7 captured graph contract. */
export function validateA7CargoBinding(input: {
  manifest?: A7ByteInput;
  lock?: A7ByteInput;
}): {
  manifestSha256: string;
  lockSha256: string;
  criterionVersion: string;
  package: { name: string; version: string };
} {
  const manifest = bytes(input.manifest, "Cargo.toml");
  const lock = bytes(input.lock, "Cargo.lock");
  const manifestSha256 = digest(manifest);
  const lockSha256 = digest(lock);
  assert(
    manifestSha256 === A7_CARGO_TOML_SHA256,
    "A7 Cargo.toml bytes differ from the captured pre-A7 manifest",
  );
  assert(
    lockSha256 === A7_CARGO_LOCK_SHA256,
    "A7 Cargo.lock bytes differ from the captured pre-A7 graph",
  );
  const manifestText = utf8(manifest);
  const packageMatch = manifestText.match(
    /^\[package\]\nname = "([^"]+)"\nversion = "([^"]+)"/m,
  );
  assert(
    packageMatch?.[1] === A7_PACKAGE_NAME &&
      packageMatch[2] === A7_PACKAGE_VERSION,
    "A7 Cargo package identity/version changed",
  );
  const devDependencies =
    manifestText.match(/^\[dev-dependencies\]\n([\s\S]*?)(?=^\[|$)/m)?.[1] ??
    "";
  assert(
    devDependencies.includes(
      `criterion = { version = "=${A7_CRITERION_VERSION}", default-features = false }`,
    ),
    "A7 Criterion must remain an exact dev-only 0.5.1 dependency",
  );
  const dependencies =
    manifestText.match(/^\[dependencies\]\n([\s\S]*?)(?=^\[|$)/m)?.[1] ?? "";
  assert(
    !dependencies.includes("criterion"),
    "Criterion must not become a production dependency",
  );
  const lockText = utf8(lock);
  assert(
    lockText.includes(
      `name = "criterion"\nversion = "${A7_CRITERION_VERSION}"`,
    ),
    "A7 lock graph must pin Criterion 0.5.1",
  );
  assert(
    lockText.includes(
      `name = "${A7_PACKAGE_NAME}"\nversion = "${A7_PACKAGE_VERSION}"\ndependencies = [\n "criterion",\n]`,
    ),
    "A7 lock graph package edge changed",
  );
  return {
    manifestSha256,
    lockSha256,
    criterionVersion: A7_CRITERION_VERSION,
    package: { name: A7_PACKAGE_NAME, version: A7_PACKAGE_VERSION },
  };
}

/** Requires every authored ZIP member to retain the exact projectFiles UTF-8 bytes. */
export function validateA7ExtractedAuthoredBytes(
  entries: Record<string, Uint8Array>,
  packageId: string,
  expectedFiles: Record<string, string>,
): {
  authoredFileCount: number;
  files: { path: string; bytes: number; sha256: string }[];
} {
  const paths = Object.keys(expectedFiles).sort();
  assert(
    paths.length === A7_ARCHIVE_FILE_COUNT,
    `A7 expected authored file count changed from ${A7_ARCHIVE_FILE_COUNT}`,
  );
  const files = paths.map((path) => {
    const archivePath = `${packageId}/${path}`;
    const actual = entries[archivePath];
    assert(
      actual instanceof Uint8Array,
      `Missing extracted authored ZIP member: ${archivePath}`,
    );
    const expected = Buffer.from(expectedFiles[path], "utf8");
    assert(
      Buffer.from(actual).equals(expected),
      `Extracted authored ZIP bytes changed: ${archivePath}`,
    );
    return { path, bytes: actual.byteLength, sha256: digest(actual) };
  });
  return { authoredFileCount: files.length, files };
}

function tail(value: string): string {
  const sanitized = value
    .replaceAll(process.cwd(), "<repo>")
    .replaceAll(homedir(), "<home>")
    .replaceAll(tmpdir(), "<tmp>");
  return sanitized.length <= 4000 ? sanitized : sanitized.slice(-4000);
}

function repositoryPath(path: string): string {
  const value = relative(process.cwd(), path).split("\\").join("/");
  assert(
    value && !value.startsWith("../") && value !== "..",
    `Path escapes repository: ${value}`,
  );
  return value;
}

function commandEnv(env: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    [
      "CARGO_HOME",
      "CRITERION_HOME",
      "RUSTUP_TOOLCHAIN",
      "RUSTC",
      "RUSTDOC",
    ].flatMap((key) =>
      env[key] === undefined ? [] : [[key, tail(env[key] as string)]],
    ),
  );
}

function runA7Command(
  name: string,
  executable: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
  campaignDir: string,
  timeoutMs: number,
): A7CommandEvidence {
  const commandDir = join(campaignDir, "commands");
  mkdirSync(commandDir, { recursive: true });
  const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const stdoutPath = join(commandDir, `${safeName}.stdout`);
  const stderrPath = join(commandDir, `${safeName}.stderr`);
  let status: number | null = null;
  let signal: string | null = null;
  let error: string | null = null;
  let errorCode: string | null = null;
  let timedOut = false;
  let stdout = "";
  let stderr = "";
  const startedAt = new Date();
  const startedMs = Date.now();
  try {
    const result = spawnSync(executable, args, {
      cwd,
      env: env as NodeJS.ProcessEnv,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: timeoutMs,
    });
    stdout =
      typeof result.stdout === "string"
        ? result.stdout
        : String(result.stdout ?? "");
    stderr =
      typeof result.stderr === "string"
        ? result.stderr
        : String(result.stderr ?? "");
    status = typeof result.status === "number" ? result.status : null;
    signal = result.signal ?? null;
    error = result.error ? result.error.message : null;
    errorCode =
      result.error && "code" in result.error ? String(result.error.code) : null;
    timedOut = errorCode === "ETIMEDOUT";
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    errorCode =
      caught && typeof caught === "object" && "code" in caught
        ? String(caught.code)
        : null;
    timedOut = errorCode === "ETIMEDOUT";
  }
  const finishedAt = new Date();
  writeFileSync(stdoutPath, stdout);
  writeFileSync(stderrPath, stderr);
  const outcome = classifyA7CommandResult({ status, signal, timedOut, error });
  return {
    name,
    executable,
    args,
    timeoutMs,
    cwd: "<disposable-archive>",
    env: commandEnv(env),
    status,
    signal,
    timedOut,
    error: error ? tail(error) : null,
    errorCode,
    outcome,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Date.now() - startedMs,
    stdoutPath: repositoryPath(stdoutPath),
    stderrPath: repositoryPath(stderrPath),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    stdoutSha256: digest(stdout),
    stderrSha256: digest(stderr),
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function notRunStage(
  name: string,
  reason: string,
  executable = "not-run",
  args: string[] = [],
) {
  return {
    name,
    executable,
    args,
    timeoutMs: A7_NATIVE_TIMEOUT_MS,
    cwd: "<disposable-archive>",
    env: {},
    outcome: "not-run" as const,
    reason,
    status: null,
    signal: null,
    timedOut: false,
    error: null,
    errorCode: null,
    startedAt: null,
    finishedAt: null,
    durationMs: 0,
  };
}

function classifyCorrectnessFailure(
  stage: A7CommandEvidence,
):
  | "passed"
  | "assertion-failure"
  | "compile-error"
  | "infrastructure"
  | "command-failure" {
  if (stage.outcome === "passed") return "passed";
  if (stage.outcome === "infrastructure") return "infrastructure";
  const output = `${stage.stdoutTail}\n${stage.stderrTail}`;
  if (
    /test result:\s*FAILED|panicked at|assertion .* failed|FAILED:/i.test(
      output,
    )
  )
    return "assertion-failure";
  if (
    /could not compile|error\[[A-Z]\d+\]|can't find crate|unresolved import/i.test(
      output,
    )
  )
    return "compile-error";
  return "command-failure";
}

function validateA7AuthoredFiles(files: Record<string, string>): {
  fileCount: number;
  files: { path: string; bytes: number; sha256: string }[];
} {
  const paths = Object.keys(files).sort();
  assert(
    paths.length === A7_ARCHIVE_FILE_COUNT,
    `A7 solution archive must contain exactly ${A7_ARCHIVE_FILE_COUNT} files`,
  );
  assert(
    JSON.stringify(paths) ===
      JSON.stringify([...A7_EXPECTED_ARCHIVE_PATHS].sort()),
    "A7 solution archive membership changed",
  );
  for (const path of paths) {
    assert(
      !path.startsWith("/") &&
        !path.includes("\\") &&
        !path
          .split("/")
          .some((part) => part === ".." || part === "." || part === ""),
      `Unsafe A7 archive path: ${path}`,
    );
  }
  return {
    fileCount: paths.length,
    files: paths.map((path) => ({
      path,
      bytes: Buffer.byteLength(files[path]),
      sha256: digest(files[path]),
    })),
  };
}

function extractA7SolutionZip(
  archiveBytes: Uint8Array,
  packageId: string,
  expectedFiles: Record<string, string>,
  root: string,
  unzipSync: (bytes: Uint8Array) => Record<string, Uint8Array>,
): { packageRoot: string; entries: Record<string, Uint8Array> } {
  const entries = unzipSync(archiveBytes);
  const expected = Object.keys(expectedFiles)
    .map((path) => `${packageId}/${path}`)
    .sort();
  const actual = Object.keys(entries).sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    "Solution ZIP members differ from the exact authored-plus-notices set",
  );
  const prefix = `${packageId}/`;
  for (const archivePath of actual) {
    assert(
      archivePath.startsWith(prefix),
      `Solution ZIP member outside package: ${archivePath}`,
    );
    const path = archivePath.slice(prefix.length);
    assert(
      path &&
        !path.startsWith("/") &&
        !path.includes("\\") &&
        !path
          .split("/")
          .some((part) => part === "." || part === ".." || part === ""),
      `Unsafe solution ZIP member: ${archivePath}`,
    );
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entries[archivePath]);
  }
  return { packageRoot: root, entries };
}

function assertCanonicalRegular(path: string): void {
  assert(existsSync(path), `Missing A7 Criterion path: ${path}`);
  const absolute = resolve(path);
  for (let current = absolute; ; current = dirname(current)) {
    const entry = lstatSync(current);
    assert(
      !entry.isSymbolicLink(),
      `A7 Criterion path cannot contain a symlink: ${current}`,
    );
    if (current === dirname(current)) break;
  }
  assert(
    lstatSync(absolute).isFile(),
    `A7 Criterion artifact is not a regular file: ${path}`,
  );
  assert(
    realpathSync(absolute) === absolute,
    `A7 Criterion artifact is not canonical: ${path}`,
  );
}

function assertCanonicalDirectory(path: string): void {
  assert(existsSync(path), `Missing A7 directory: ${path}`);
  const absolute = resolve(path);
  const metadata = lstatSync(absolute);
  assert(
    !metadata.isSymbolicLink() && metadata.isDirectory(),
    `A7 path is not a canonical directory: ${path}`,
  );
  assert(
    realpathSync(absolute) === absolute,
    `A7 directory is not canonical: ${path}`,
  );
}

function scanCriterionNewFiles(root: string): string[] {
  const found: string[] = [];
  const visit = (directory: string): void => {
    const directoryEntry = lstatSync(directory);
    assert(
      !directoryEntry.isSymbolicLink() && directoryEntry.isDirectory(),
      `A7 Criterion directory is not canonical: ${directory}`,
    );
    assert(
      realpathSync(directory) === directory,
      `A7 Criterion directory is not canonical: ${directory}`,
    );
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = join(directory, entry.name);
      assert(
        !entry.isSymbolicLink(),
        `A7 Criterion output cannot contain a symlink: ${child}`,
      );
      if (entry.isDirectory()) visit(child);
      else {
        assert(entry.isFile(), `A7 Criterion output is not regular: ${child}`);
        if (dirname(child).split(/[\\/]/).at(-1) === "new")
          found.push(relative(root, child).split("\\").join("/"));
      }
    }
  };
  assert(existsSync(root), `Missing fresh Criterion home: ${root}`);
  visit(root);
  return found.sort();
}

function readCriterionEvidence(namespace: string, criterionHome: string) {
  const expectedFiles = a7Ids
    .flatMap((id) =>
      ["benchmark", "estimates", "sample", "tukey"].map(
        (name) =>
          `log_analyzer_a7/${id.split("/")[1]}/${id.split("/")[2]}/new/${name}.json`,
      ),
    )
    .sort();
  assert(
    JSON.stringify(scanCriterionNewFiles(criterionHome)) ===
      JSON.stringify(expectedFiles),
    "Fresh Criterion output must contain exactly the two requested IDs, three required triplet artifacts, and Criterion's tukey ancillary artifact per ID",
  );
  const records = a7Ids.map((id) => ({
    id,
    files: ["benchmark", "estimates", "sample"].map((name) => {
      const path = `test-results/performance-a7/${namespace}/criterion/${id}/new/${name}.json`;
      const absolute = resolve(path);
      const rawBytes = readFileSync(absolute);
      const raw = rawBytes.toString("utf8");
      assertCanonicalRegular(absolute);
      return {
        path,
        namespace,
        raw,
        byteLength: rawBytes.byteLength,
        sha256: digest(rawBytes),
      };
    }),
  }));
  const evidence = parseA7CriterionTriplet({ namespace, records });
  assert(
    evidence.baseline.sampleCount === A7_SAMPLE_SIZE &&
      evidence.candidate.sampleCount === A7_SAMPLE_SIZE,
    `A7 Criterion samples must contain exactly ${A7_SAMPLE_SIZE} observations`,
  );
  return evidence;
}

function measurement(value: A7Measurement) {
  return {
    id: value.id,
    unit: value.unit,
    sampleCount: value.sampleCount,
    throughputBytes: value.throughputBytes,
    pointEstimate: value.pointEstimate,
    ci95: value.ci95,
    artifacts: value.artifacts,
  };
}

type ObservedSummary = {
  implementation: "baseline" | "candidate";
  filter: "none" | "error";
  info: number;
  warn: number;
  error: number;
  malformed: number;
};

const a7ExpectedSummaries: ObservedSummary[] = [
  {
    implementation: "baseline",
    filter: "none",
    info: 1171,
    warn: 588,
    error: 196,
    malformed: 93,
  },
  {
    implementation: "baseline",
    filter: "error",
    info: 0,
    warn: 0,
    error: 196,
    malformed: 93,
  },
  {
    implementation: "candidate",
    filter: "none",
    info: 1171,
    warn: 588,
    error: 196,
    malformed: 93,
  },
  {
    implementation: "candidate",
    filter: "error",
    info: 0,
    warn: 0,
    error: 196,
    malformed: 93,
  },
];

function parseObservedSummaries(output: string): ObservedSummary[] {
  const rows: ObservedSummary[] = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith("A7_SUMMARY ")) continue;
    const value = JSON.parse(
      line.slice("A7_SUMMARY ".length),
    ) as Partial<ObservedSummary>;
    assert(
      (value.implementation === "baseline" ||
        value.implementation === "candidate") &&
        (value.filter === "none" || value.filter === "error"),
      "Invalid A7 observed summary identity",
    );
    for (const key of ["info", "warn", "error", "malformed"] as const)
      assert(
        Number.isInteger(value[key]) && (value[key] as number) >= 0,
        `Invalid A7 observed summary count: ${key}`,
      );
    rows.push(value as ObservedSummary);
  }
  assert(
    rows.length === a7ExpectedSummaries.length,
    "A7 correctness must emit exactly four observed summaries",
  );
  const keys = rows.map((row) => `${row.implementation}:${row.filter}`);
  assert(
    new Set(keys).size === rows.length,
    "A7 observed summaries must identify four distinct implementation/filter pairs",
  );
  for (const expected of a7ExpectedSummaries) {
    const actual = rows.find(
      (row) =>
        row.implementation === expected.implementation &&
        row.filter === expected.filter,
    );
    assert(
      actual && JSON.stringify(actual) === JSON.stringify(expected),
      `A7 observed summary mismatch for ${expected.implementation}/${expected.filter}`,
    );
  }
  return rows;
}

function executableEvidence(path: string): {
  path: string;
  realpath: string;
  bytes: number;
  mode: number;
  sha256: string;
} {
  assert(
    resolve(path) === path && path.startsWith("/"),
    `Tool path is not qualified: ${path}`,
  );
  const realpath = realpathSync(path);
  assert(realpath === path, `Tool path is not canonical: ${path}`);
  const metadata = lstatSync(realpath);
  assert(
    metadata.isFile() && (metadata.mode & 0o111) !== 0,
    `Tool is not a regular executable: ${path}`,
  );
  const bytes = readFileSync(realpath);
  return {
    path,
    realpath,
    bytes: bytes.byteLength,
    mode: metadata.mode & 0o777,
    sha256: digest(bytes),
  };
}

function canonicalA7LocalDirectory(
  input: string,
  label: string,
  realHome: string,
  packageRoot: string,
): string {
  validateA7LocalRootRelationship(input, realHome, packageRoot);
  const absolute = input;
  const canonical = realpathSync(absolute);
  assert.equal(canonical, absolute, `${label} must not contain symlinks`);
  const metadata = lstatSync(canonical);
  assert(metadata.isDirectory(), `${label} must be a directory`);
  assert(canonical !== "/" && canonical !== realHome, `${label} is too broad`);
  return canonical;
}

export function validateA7LocalRootRelationship(
  candidate: string,
  realHome: string,
  packageRoot: string,
): void {
  assert(isAbsolute(candidate), "A7 local root must be absolute");
  const absolute = resolve(candidate);
  assert.equal(absolute, candidate, "A7 local root must be normalized");
  assert(candidate !== "/" && candidate !== realHome, "A7 local root is too broad");
  const fromPackage = relative(packageRoot, candidate);
  const fromCandidate = relative(candidate, packageRoot);
  assert(
    (fromPackage.startsWith("..") || isAbsolute(fromPackage)) &&
      (fromCandidate.startsWith("..") || isAbsolute(fromCandidate)),
    "A7 local root must not overlap the package root",
  );
}

function cargoConfigPathsFromPackageRoot(packageRoot: string): string[] {
  const paths: string[] = [];
  let current = realpathSync(packageRoot);
  while (true) {
    for (const name of ["config", "config.toml"]) {
      const path = join(current, ".cargo", name);
      if (existsSync(path)) paths.push(path);
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return paths;
}

export function selectA7CanonicalRustup(
  candidates: readonly {
    raw: string;
    canonical: string;
    regularExecutable: boolean;
  }[],
): string {
  const canonical = [
    ...new Set(
      candidates
        .filter(
          (candidate) =>
            isAbsolute(candidate.raw) &&
            isAbsolute(candidate.canonical) &&
            candidate.regularExecutable,
        )
        .map((candidate) => candidate.canonical),
    ),
  ];
  assert.equal(
    canonical.length,
    1,
    "PATH must resolve exactly one canonical regular rustup executable",
  );
  return canonical[0];
}

function inspectA7CargoConfig(
  packageRoot: string,
  cargoHome: string,
): { config: "absent" | "fixed-offline"; path: string | null; bytes: number; sha256: string | null } {
  const ancestorConfigs = cargoConfigPathsFromPackageRoot(packageRoot);
  assert.equal(
    ancestorConfigs.length,
    0,
    `Unexpected Cargo config in package cwd ancestors: ${ancestorConfigs.join(", ")}`,
  );
  const homeConfigs = ["config", "config.toml"]
    .map((name) => join(cargoHome, name))
    .filter((path) => existsSync(path));
  assert(homeConfigs.length <= 1, "Multiple Cargo HOME configs are ambiguous");
  if (homeConfigs.length === 0)
    return { config: "absent", path: null, bytes: 0, sha256: null };
  const path = homeConfigs[0];
  const metadata = lstatSync(path);
  assert(metadata.isFile() && realpathSync(path) === path, "Cargo config must be a canonical regular file");
  const raw = readFileSync(path, "utf8");
  const result = validateA7CargoConfigPolicy({
    cargoHomeConfig: raw,
    ancestorConfigs: [],
  });
  return { config: result.config, path, bytes: Buffer.byteLength(raw), sha256: digest(raw) };
}

function resolveA7RustupFromPath(rawPath: string): string {
  const candidates = rawPath
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => join(entry, "rustup"))
    .filter((path) => isAbsolute(path) && existsSync(path))
    .map((path) => {
      const canonical = realpathSync(path);
      const metadata = lstatSync(canonical);
      return {
        raw: path,
        canonical,
        regularExecutable:
          metadata.isFile() && (metadata.mode & 0o111) !== 0,
      };
    });
  return selectA7CanonicalRustup(candidates);
}

export function parseQualifiedToolPath(raw: string): string {
  const path = raw.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? "";
  assert(
    path.startsWith("/") && !path.includes("<"),
    "Tool probe did not return a qualified raw path",
  );
  return path;
}

function discoverA7Toolchain(
  mode: "stable" | "msrv",
  cwd: string,
  env: Record<string, string>,
  campaignDir: string,
  rustup: string,
): {
  requested: string;
  rustup: ReturnType<typeof executableEvidence> & { version: string };
  executables: Record<string, string>;
  binaries: Record<string, ReturnType<typeof executableEvidence>>;
  versions: Record<string, string>;
  hosts: { rustc: string };
  probes: A7CommandEvidence[];
} {
  const requested = mode === "msrv" ? "1.85.0" : "stable";
  const probes: A7CommandEvidence[] = [];
  const executables: Record<string, string> = {};
  const binaries: Record<string, ReturnType<typeof executableEvidence>> = {};
  const versions: Record<string, string> = {};
  let rustcHost = "";
  const rustupVersionProbe = runA7Command(
    "rustup-version",
    rustup,
    ["--version"],
    cwd,
    env,
    campaignDir,
    A7_PROBE_TIMEOUT_MS,
  );
  probes.push(rustupVersionProbe);
  assert(rustupVersionProbe.outcome === "passed", "rustup version probe failed");
  const rustupVersion = parseA7RustupVersion(
    readFileSync(resolve(rustupVersionProbe.stdoutPath), "utf8"),
  );
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const which = runA7Command(
      `toolchain-${tool}-which`,
      rustup,
      ["which", "--toolchain", requested, tool],
      cwd,
      env,
      campaignDir,
      A7_PROBE_TIMEOUT_MS,
    );
    probes.push(which);
    assert(
      which.outcome === "passed",
      `Unable to locate ${tool} for ${requested}`,
    );
    const executable = parseQualifiedToolPath(
      readFileSync(resolve(which.stdoutPath), "utf8"),
    );
    executables[tool] = executable;
    binaries[tool] = executableEvidence(executable);
    const version = runA7Command(
      `toolchain-${tool}-version`,
      executable,
      [tool === "rustc" ? "-vV" : "--version"],
      cwd,
      env,
      campaignDir,
      A7_PROBE_TIMEOUT_MS,
    );
    probes.push(version);
    assert(version.outcome === "passed", `${tool} version probe failed`);
    const text = version.stdoutTail.trim();
    assert(!/nightly/i.test(text), `${tool} must not be nightly`);
    if (mode === "msrv")
      assert(
        text.startsWith(`${tool} 1.85.0 `),
        `${tool} is not exact Rust 1.85.0: ${text}`,
      );
    versions[tool] = text;
    if (tool === "rustc") {
      const host = text.match(/^host:\s*(\S+)/m)?.[1];
      assert(host, "rustc -vV did not report a host triple");
      rustcHost = host;
    }
  }
  return {
    requested,
    rustup: { ...executableEvidence(rustup), version: rustupVersion },
    executables,
    binaries,
    versions,
    hosts: { rustc: rustcHost },
    probes,
  };
}

async function runA7(mode: "stable" | "msrv") {
  const worktreeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  assert(
    resolve(process.cwd()) === worktreeRoot,
    `A7 must run from the verifier worktree: ${worktreeRoot}`,
  );
  const runName = `a7-${mode}-${randomUUID()}`;
  const campaignParent = resolve(
    worktreeRoot,
    "test-results",
    "performance-a7",
  );
  mkdirSync(campaignParent, { recursive: true });
  assertCanonicalDirectory(resolve(worktreeRoot, "test-results"));
  assertCanonicalDirectory(campaignParent);
  const campaignDir = resolve(campaignParent, runName);
  const criterionHome = join(campaignDir, "criterion");
  assert(
    !existsSync(campaignDir),
    `A7 run namespace already exists: ${runName}`,
  );
  mkdirSync(campaignDir, { recursive: false });
  mkdirSync(criterionHome, { recursive: false });
  const targetDir = join(campaignDir, "target");
  const tempDir = join(campaignDir, "tmp");
  mkdirSync(targetDir, { recursive: false });
  mkdirSync(tempDir, { recursive: false });
  const reportPath = join(campaignDir, "report.json");
  const noticesPath = join(campaignDir, "notices.json");
  const report: Record<string, unknown> = {
    schema: "rust-workshop.a7-performance.v2",
    mode,
    namespace: runName,
    runComplete: false,
    featureCorrectness: "blocked",
    decision: "inconclusive",
    comparison: null,
    unit: "ns/iteration",
    reportPath: repositoryPath(reportPath),
    notices: { path: repositoryPath(noticesPath), observedMeasurements: false },
    stages: {},
  };
  let archiveRoot: string | undefined;
  try {
    const { projectFiles, validateProjectPackage } =
      await import("../src/domain/project-package");
    const { logAnalyzerPackage } =
      await import("../src/content/projects/log-analyzer");
    const { buildProjectArchive, projectArchiveFiles } =
      await import("./project-archive");
    const { unzipSync } = await import("fflate");
    const packageErrors = validateProjectPackage(logAnalyzerPackage);
    assert(packageErrors.length === 0, packageErrors.join("; "));
    assert(
      logAnalyzerPackage.id === "log-analyzer-workshop",
      "Unexpected A7 package identity",
    );
    const files = projectFiles(logAnalyzerPackage, "solution");
    const authored = validateA7AuthoredFiles(files);
    const repositoryRoot = worktreeRoot;
    const archiveEntries = projectArchiveFiles(logAnalyzerPackage, "solution", {
      repositoryRoot,
    });
    const solutionArchive = buildProjectArchive(
      logAnalyzerPackage,
      "solution",
      { repositoryRoot },
    );
    const solutionZipPath = join(
      campaignDir,
      "log-analyzer-workshop-solution.zip",
    );
    writeFileSync(solutionZipPath, solutionArchive);
    archiveRoot = mkdtempSync(a7ArchiveTempPrefix(tempDir));
    const extracted = extractA7SolutionZip(
      solutionArchive,
      logAnalyzerPackage.id,
      archiveEntries,
      join(archiveRoot, logAnalyzerPackage.id),
      unzipSync,
    );
    const packageRoot = extracted.packageRoot;
    const authoredExtracted = validateA7ExtractedAuthoredBytes(
      extracted.entries,
      logAnalyzerPackage.id,
      files,
    );
    const cargoBinding = validateA7CargoBinding({
      manifest: extracted.entries[`${logAnalyzerPackage.id}/Cargo.toml`],
      lock: extracted.entries[`${logAnalyzerPackage.id}/Cargo.lock`],
    });
    const archiveFiles = Object.entries(extracted.entries)
      .map(([path, content]) => ({
        path: path.slice(`${logAnalyzerPackage.id}/`.length),
        bytes: content.byteLength,
        sha256: digest(content),
      }))
      .sort((left, right) => left.path.localeCompare(right.path));
    const noticeFiles = archiveFiles.filter(
      (file) => !Object.hasOwn(files, file.path),
    );
    report.archive = {
      kind: "authored-project-zip",
      path: repositoryPath(solutionZipPath),
      sha256: digest(solutionArchive),
      bytes: solutionArchive.byteLength,
      memberCount: archiveFiles.length,
      authoredMemberCount: authoredExtracted.authoredFileCount,
      files: archiveFiles,
      memberManifestSha256: digest(JSON.stringify(archiveFiles)),
    };
    report.sourceHashes = Object.fromEntries(
      authored.files.map((file) => [file.path, file.sha256]),
    );
    report.projectHashes = {
      cargoToml: authored.files.find((file) => file.path === "Cargo.toml")
        ?.sha256,
      cargoLock: authored.files.find((file) => file.path === "Cargo.lock")
        ?.sha256,
      manifest: authored.files.find(
        (file) => file.path === "A7-PERFORMANCE-MANIFEST.json",
      )?.sha256,
      sourceFiles: Object.fromEntries(
        authored.files
          .filter((file) => file.path.startsWith("src/"))
          .map((file) => [file.path, file.sha256]),
      ),
    };
    report.criterion = {
      version: A7_CRITERION_VERSION,
      package: "criterion",
      binding: {
        manifestSha256: cargoBinding.manifestSha256,
        lockSha256: cargoBinding.lockSha256,
        hashDomains: [
          "raw extracted Cargo.toml UTF-8 bytes",
          "raw extracted Cargo.lock UTF-8 bytes",
        ],
      },
      parserShape: {
        primaryReference:
          "Criterion 0.5.1 new/benchmark.json, estimates.json, sample.json shape",
        cacheBinding:
          "offline Cargo.lock dev-dependency binding; cached-source digest is not claimed",
        hashDomains: [
          "raw current-run new/benchmark.json bytes",
          "raw current-run new/estimates.json bytes",
          "raw current-run new/sample.json bytes",
        ],
        cachedSourceProbe:
          "not-run; no cached source is presented as an observed probe",
      },
    };
    const verifierPath = fileURLToPath(import.meta.url);
    const verifierTestPath = resolve("scripts/verify-performance.test.ts");
    report.verifierHashes = {
      script: {
        path: repositoryPath(verifierPath),
        bytes: readFileSync(verifierPath).byteLength,
        sha256: digest(readFileSync(verifierPath)),
      },
      test: existsSync(verifierTestPath)
        ? {
            path: repositoryPath(verifierTestPath),
            bytes: readFileSync(verifierTestPath).byteLength,
            sha256: digest(readFileSync(verifierTestPath)),
          }
        : null,
    };
    const manifest = authored.files.find(
      (file) => file.path === "A7-PERFORMANCE-MANIFEST.json",
    );
    assert(manifest, "A7 manifest is missing from archive");
    const notices = {
      schema: "rust-workshop.a7-performance-notices.v1",
      package: logAnalyzerPackage.id,
      source: {
        zipPath: repositoryPath(solutionZipPath),
        sha256: digest(solutionArchive),
        bytes: solutionArchive.byteLength,
      },
      authoredArchiveFiles: authored.fileCount,
      noticeArchiveFiles: noticeFiles,
      manifest: {
        path: manifest.path,
        bytes: manifest.bytes,
        sha256: manifest.sha256,
      },
      observedMeasurements: false,
    };
    writeJson(noticesPath, notices);
    report.notices = {
      path: repositoryPath(noticesPath),
      schema: notices.schema,
      observedMeasurements: false,
    };
    const osHome = userInfo().homedir;
    const canonicalOsHome = realpathSync(osHome);
    const homeMetadata = lstatSync(canonicalOsHome);
    const configuredHome = process.env.HOME ?? osHome;
    const realHome = validateA7HomeBinding({
      configuredHome,
      osHome,
      canonicalHome: canonicalOsHome,
      exists: existsSync(canonicalOsHome),
      regularDirectory: homeMetadata.isDirectory(),
      canonicalAncestors: canonicalOsHome === osHome,
    });
    const cargoHome = canonicalA7LocalDirectory(
      process.env.CARGO_HOME ?? join(realHome, ".cargo"),
      "CARGO_HOME",
      realHome,
      packageRoot,
    );
    const rustupHome = canonicalA7LocalDirectory(
      process.env.RUSTUP_HOME ?? join(realHome, ".rustup"),
      "RUSTUP_HOME",
      realHome,
      packageRoot,
    );
    const configBinding = inspectA7CargoConfig(packageRoot, cargoHome);
    const systemPathDirs = A7_FIXED_SYSTEM_PATH_DIRS.filter((path) => {
      if (!existsSync(path)) return false;
      const metadata = lstatSync(path);
      return metadata.isDirectory() && realpathSync(path) === path;
    });
    const rustup = resolveA7RustupFromPath(process.env.PATH ?? "");
    const requestedToolchain = mode === "msrv" ? "1.85.0" : "stable";
    const discoveryEnv = buildA7ChildEnvironment({
      ambient: process.env,
      realHome,
      cargoHome,
      rustupHome,
      criterionHome,
      targetDir,
      tempDir,
      requestedToolchain,
      rustup,
      tools: { cargo: rustup, rustc: rustup, rustdoc: rustup },
      systemPathDirs,
    }).env;
    const toolchain = discoverA7Toolchain(
      mode,
      packageRoot,
      discoveryEnv,
      campaignDir,
      rustup,
    );
    const projectedEnvironment = buildA7ChildEnvironment({
      ambient: process.env,
      realHome,
      cargoHome,
      rustupHome,
      criterionHome,
      targetDir,
      tempDir,
      requestedToolchain,
      rustup,
      tools: {
        cargo: toolchain.executables.cargo,
        rustc: toolchain.executables.rustc,
        rustdoc: toolchain.executables.rustdoc,
      },
      systemPathDirs,
    });
    const env = projectedEnvironment.env;
    report.environment = {
      policy: "a7-closed-allowlist-v2",
      allowlistedKeys: A7_CHILD_ENV_KEYS,
      omittedAmbientKeys: projectedEnvironment.omittedKeys,
      pathEntries: projectedEnvironment.pathEntries,
      fixedSystemPathDirs: systemPathDirs,
      home: realHome,
      cargoHome,
      rustupHome,
      criterionHome: repositoryPath(criterionHome),
      targetDir: repositoryPath(targetDir),
      tempDir: repositoryPath(tempDir),
      cargoConfig: {
        ...configBinding,
        path: configBinding.path ? repositoryPath(configBinding.path) : null,
      },
      rustup: { ...executableEvidence(rustup), version: toolchain.rustup.version },
      authenticityClaim: false,
    };
    report.toolchain = {
      ...toolchain,
      executablePathPolicy:
        "qualified-absolute-canonical-regular-executable; paths are explicit tool provenance",
    };

    const formatGate = runA7Command(
      "cargo-fmt-check",
      toolchain.executables.cargo,
      ["fmt", "--all", "--", "--check"],
      packageRoot,
      env,
      campaignDir,
      A7_NATIVE_TIMEOUT_MS,
    );
    const checkGate = runA7Command(
      "cargo-check-all-targets",
      toolchain.executables.cargo,
      ["check", "--offline", "--locked", "--all-targets"],
      packageRoot,
      env,
      campaignDir,
      A7_NATIVE_TIMEOUT_MS,
    );
    (report.stages as Record<string, unknown>).format = formatGate;
    (report.stages as Record<string, unknown>).check = checkGate;

    const correctness = runA7Command(
      "correctness-a7-contract",
      toolchain.executables.cargo,
      [
        "test",
        "--offline",
        "--locked",
        "--test",
        "a7_performance_contract",
        "--",
        "--nocapture",
      ],
      packageRoot,
      env,
      campaignDir,
      A7_NATIVE_TIMEOUT_MS,
    );
    (report.stages as Record<string, unknown>).correctness = correctness;
    let observedSummaries: ObservedSummary[] | undefined;
    let correctnessObservationError: string | undefined;
    if (correctness.outcome === "passed") {
      try {
        observedSummaries = parseObservedSummaries(
          `${readFileSync(resolve(correctness.stdoutPath), "utf8")}\n${readFileSync(resolve(correctness.stderrPath), "utf8")}`,
        );
        report.observedSummaries = observedSummaries;
        report.literalExpectedSummaries = a7ExpectedSummaries;
      } catch (caught) {
        correctnessObservationError =
          caught instanceof Error ? caught.message : String(caught);
        report.correctnessObservationError = correctnessObservationError;
      }
    }
    report.correctnessClassification = correctnessObservationError
      ? "observation-invalid"
      : classifyCorrectnessFailure(correctness);
    const correctnessReady =
      formatGate.outcome === "passed" &&
      checkGate.outcome === "passed" &&
      correctness.outcome === "passed" &&
      observedSummaries !== undefined;
    let benchmark: A7CommandEvidence | undefined;
    if (correctnessReady) {
      benchmark = runA7Command(
        "criterion-a7-benchmark",
        toolchain.executables.cargo,
        [
          "bench",
          "--offline",
          "--locked",
          "--bench",
          "log_analyzer",
          "--",
          "log_analyzer_a7",
        ],
        packageRoot,
        env,
        campaignDir,
        A7_NATIVE_TIMEOUT_MS,
      );
      (report.stages as Record<string, unknown>).benchmark = benchmark;
      if (benchmark.outcome === "passed") {
        try {
          const evidence = readCriterionEvidence(runName, criterionHome);
          report.baseline = measurement(evidence.baseline);
          report.candidate = measurement(evidence.candidate);
          const comparison = compareA7Intervals(
            evidence.baseline,
            evidence.candidate,
          );
          report.comparison = comparison;
        } catch (caught) {
          report.measurementError =
            caught instanceof Error ? caught.message : String(caught);
        }
      }
    } else {
      (report.stages as Record<string, unknown>).benchmark = notRunStage(
        "criterion-a7-benchmark",
        "correctness did not produce four valid observed summaries",
      );
    }
    const mutantCompile = runA7Command(
      "mutant-a7-compile",
      toolchain.executables.cargo,
      [
        "test",
        "--offline",
        "--locked",
        "--test",
        "a7_filter_ignored_mutant",
        "--no-run",
      ],
      packageRoot,
      env,
      campaignDir,
      A7_NATIVE_TIMEOUT_MS,
    );
    const mutantRun =
      mutantCompile.outcome === "passed"
        ? runA7Command(
            "mutant-a7-ignored-run",
            toolchain.executables.cargo,
            [
              "test",
              "--offline",
              "--locked",
              "--test",
              "a7_filter_ignored_mutant",
              "--",
              "--ignored",
            ],
            packageRoot,
            env,
            campaignDir,
            A7_NATIVE_TIMEOUT_MS,
          )
        : notRunStage(
            "mutant-a7-ignored-run",
            "mutant compile did not complete successfully",
            toolchain.executables.cargo,
            [
              "test",
              "--offline",
              "--locked",
              "--test",
              "a7_filter_ignored_mutant",
              "--",
              "--ignored",
            ],
          );
    (report.stages as Record<string, unknown>).mutantCompile = mutantCompile;
    (report.stages as Record<string, unknown>).mutantRun = mutantRun;
    const mutantStatus = classifyA7Mutant({
      compile: projectA7MutantCommand(
        mutantCompile,
        readFileSync(resolve(mutantCompile.stdoutPath), "utf8"),
        readFileSync(resolve(mutantCompile.stderrPath), "utf8"),
      ),
      run:
        mutantRun.outcome === "not-run"
          ? undefined
          : projectA7MutantCommand(
              mutantRun,
              readFileSync(resolve(mutantRun.stdoutPath), "utf8"),
              readFileSync(resolve(mutantRun.stderrPath), "utf8"),
            ),
    });
    report.mutant = {
      status: mutantStatus,
      compileExit: mutantCompile.status,
      runExit: mutantRun.status,
      test: "a7_filter_ignored_v1_named_oracle",
      marker: "A7_FILTER_IGNORED_ORACLE",
      failureClass: "assertion_mismatch_behavioral",
    };

    const stages = report.stages as Record<
      string,
      A7CommandEvidence | { outcome: string }
    >;
    const requestedStages = [
      stages.correctness,
      stages.benchmark,
      stages.mutantCompile,
      stages.mutantRun,
    ];
    const terminal = requestedStages.every(
      (stage) =>
        stage && ["passed", "failed", "infrastructure"].includes(stage.outcome),
    );
    const measurementReady =
      benchmark?.outcome === "passed" &&
      Boolean(report.baseline) &&
      Boolean(report.candidate) &&
      !report.measurementError;
    const infrastructure =
      [formatGate, checkGate, ...requestedStages].some(
        (stage) => stage?.outcome === "infrastructure",
      ) ||
      formatGate.outcome !== "passed" ||
      checkGate.outcome !== "passed" ||
      !measurementReady ||
      !observedSummaries ||
      Boolean(correctnessObservationError);
    const correctnessRejected =
      report.correctnessClassification === "assertion-failure";
    const mutantRejected = mutantStatus === "unexpected-pass";
    const mutantBlocked = !["expected-rejection", "unexpected-pass"].includes(
      mutantStatus,
    );
    report.runComplete = isA7RunComplete(
      terminal,
      infrastructure,
      mutantStatus,
    );
    if (correctnessRejected || mutantRejected) {
      report.featureCorrectness = "rejected";
      report.decision = "investigate-performance";
    } else if (
      !report.runComplete ||
      mutantBlocked ||
      report.correctnessClassification !== "passed"
    ) {
      report.featureCorrectness = "blocked";
      report.decision = "inconclusive";
    } else {
      report.featureCorrectness = "accepted";
      report.decision =
        report.comparison === "measured-faster-on-this-workload"
          ? "keep"
          : report.comparison === "measured-slower-on-this-workload"
            ? "investigate-performance"
            : "inconclusive";
    }
  } catch (caught) {
    report.error = tail(
      caught instanceof Error ? caught.message : String(caught),
    );
  } finally {
    writeJson(reportPath, report);
    if (archiveRoot) rmSync(archiveRoot, { recursive: true, force: true });
  }
  console.log(`${mode} A7 report: ${repositoryPath(reportPath)}`);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parsePerformanceArgs(args);
  if (parsed.a7) {
    const report = await runA7(parsed.msrv ? "msrv" : "stable");
    if (report.featureCorrectness !== "accepted") process.exitCode = 1;
    return;
  }

  const { projectFiles, validateProjectPackage } =
    await import("../src/domain/project-package");
  const { logAnalyzerPackage } =
    await import("../src/content/projects/log-analyzer");

  const useMsrv = parsed.msrv;
  const env = { ...process.env };
  let cargo = "cargo";

  if (useMsrv) {
    const paths: Record<string, string> = {};
    for (const tool of ["cargo", "rustc", "rustdoc"]) {
      const result = spawnSync(
        "rustup",
        ["which", "--toolchain", "1.85.0", tool],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stderr);
      paths[tool] = result.stdout.trim();
      const version = spawnSync(paths[tool], ["--version"], {
        encoding: "utf8",
      });
      assert.equal(version.status, 0, version.stderr);
      assert(
        version.stdout.startsWith(`${tool} 1.85.0 `),
        `${tool} is not Rust 1.85.0: ${version.stdout}`,
      );
      console.log(version.stdout.trim());
    }
    cargo = paths.cargo;
    env.RUSTC = paths.rustc;
    env.RUSTDOC = paths.rustdoc;
    env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
  } else {
    const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
    assert.equal(version.status, 0, version.stderr);
    assert(
      !version.stdout.includes("nightly"),
      `stable rustc required: ${version.stdout}`,
    );
    console.log(version.stdout.trim());
  }

  const root = mkdtempSync(join(tmpdir(), "rust-workshop-log-performance-"));

  function writeArchive(directory: string) {
    for (const [path, contents] of Object.entries(
      projectFiles(logAnalyzerPackage, "solution"),
    )) {
      const target = join(directory, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
  }

  function run(command: string, commandArgs: string[]) {
    const result = spawnSync(
      command === "cargo" ? cargo : command,
      commandArgs,
      {
        cwd: root,
        env,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.error || result.status !== 0)
      throw new Error(`${command} ${commandArgs.join(" ")} failed:\n${output}`);
    console.log(`ok ${command} ${commandArgs.join(" ")}`);
    return output;
  }

  try {
    assert.deepEqual(validateProjectPackage(logAnalyzerPackage), []);
    assert.equal(logAnalyzerPackage.id, "log-analyzer-workshop");
    const files = projectFiles(logAnalyzerPackage, "solution");
    assert(files["benches/log_analyzer.rs"].includes("criterion_main!"));
    assert(
      files["tests/performance_contract.rs"].includes(
        "baseline_and_candidate_have_the_same_result_shape",
      ),
    );
    writeArchive(root);

    if (args.includes("--fetch")) run("cargo", ["fetch", "--locked"]);

    const offline = ["--offline", "--locked"];
    run("cargo", ["fmt", "--all", "--", "--check"]);
    run("cargo", ["check", ...offline, "--all-targets"]);
    run("cargo", ["test", ...offline, "--test", "performance_contract"]);
    run("cargo", ["bench", ...offline, "--bench", "log_analyzer", "--no-run"]);
    run("cargo", ["bench", ...offline, "--bench", "log_analyzer"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
