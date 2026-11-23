/** Closed verifier for the authored durable-log retry package. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { strFromU8, unzipSync } from "fflate";
import { serviceAuthorizationPackage } from "../src/content/projects/service-authorization";
import { durableLogRetryPackage } from "../src/content/projects/durable-log-retry";
import { fileSchemaEvolutionPackage } from "../src/content/projects/file-schema-evolution/package";
import { buildProjectArchive, projectArchiveFiles } from "./project-archive";

export type RetryVerifierArgs = { msrv: boolean };
export type CommandClassification = "passed" | "test-failure" | "compile-error" | "timeout" | "signal" | "infrastructure-error";
export interface RecordedCommand {
  args: string[];
  status: number | null;
  signal: string | null;
  classification: CommandClassification;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  timedOut: boolean;
  errorCode: string | null;
}

type ToolName = "cargo" | "rustc" | "rustdoc";
type ToolObservation = {
  path: string;
  bytes: number;
  mode: number;
  sha256: string;
  version: string;
};
type RetryToolProfile = {
  mode: "stable" | "msrv";
  toolchain: string;
  executables: Record<ToolName, ToolObservation>;
  rustup: ToolObservation;
  cargoHome: string;
};

export function parseClientRetryArgs(argv: readonly string[]): RetryVerifierArgs {
  if (new Set(argv).size !== argv.length) throw new Error("Retry verifier flags must be unique");
  for (const arg of argv) if (arg !== "--msrv") throw new Error("Only --msrv is accepted; fetch, paths and tool overrides are forbidden");
  return { msrv: argv.includes("--msrv") };
}

export function classifyRetryCommand(result: Pick<RecordedCommand, "status" | "signal" | "stdout" | "stderr"> & { error?: { code?: string } }): CommandClassification {
  if (result.signal || result.error?.code === "SIGTERM" || result.error?.code === "SIGKILL") return "signal";
  if (result.error?.code === "ETIMEDOUT" || result.status === 124) return "timeout";
  if (result.error) return "infrastructure-error";
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) return "passed";
  if (/could not compile|error\[E\d+\]|aborting due to/.test(output)) return "compile-error";
  if (/test result: FAILED/.test(output)) return "test-failure";
  return "infrastructure-error";
}

function sha256(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function repoRoot(): string { return resolve(process.cwd()); }
function assertRegularNoSymlink(path: string): void {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `expected regular file: ${path}`);
}
function canonicalExecutable(path: string): string {
  assertRegularNoSymlink(path);
  assert((lstatSync(path).mode & 0o111) !== 0, `expected executable tool: ${path}`);
  const canonical = realpathSync(path);
  assert.equal(canonical, resolve(path), `tool path must already be canonical: ${path}`);
  return canonical;
}

function canonicalRustup(path: string): string {
  const canonical = realpathSync(path);
  const stat = lstatSync(canonical);
  assert(stat.isFile() && (stat.mode & 0o111) !== 0, `resolved rustup must be an executable regular file: ${canonical}`);
  return canonical;
}

function hashFile(path: string): { bytes: number; mode: number; sha256: string } {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `expected regular executable: ${path}`);
  const bytes = readFileSync(path);
  return { bytes: bytes.byteLength, mode: stat.mode & 0o777, sha256: sha256(bytes) };
}

function commandText(path: string, args: string[], timeout = 30_000): string {
  const result = spawnSync(path, args, { encoding: "utf8", timeout, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, `${path} ${args.join(" ")} failed: ${result.stderr ?? ""}`);
  assert.equal(result.signal, null, `${path} ${args.join(" ")} was signalled`);
  assert.equal(result.error, undefined, `${path} ${args.join(" ")} could not start`);
  return `${result.stdout ?? ""}`.trim();
}

function discoverRustup(): string {
  const result = spawnSync("which", ["rustup"], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, "rustup must be discoverable on PATH");
  const candidates = `${result.stdout ?? ""}`.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(candidates.length, 1, "rustup discovery must produce one path");
  return canonicalRustup(candidates[0]);
}

function profileFor(msrv: boolean): RetryToolProfile {
  const mode = msrv ? "msrv" : "stable";
  const toolchain = msrv ? "1.89.0" : "stable";
  const rustup = discoverRustup();
  const profileRoot = process.env.RUST_WORKSHOP_CLIENT_RETRY_QUALIFICATION_ROOT;
  let expected: { mode: string; toolchain: string; executables?: Record<string, { path: string; bytes: number; mode: number; sha256: string }>; versionContains?: Record<string, string>; } | undefined;
  if (profileRoot !== undefined) {
    assert(profileRoot.startsWith("/"), "qualification root must be an absolute path");
    const canonicalRoot = realpathSync(profileRoot);
    const profilePath = join(canonicalRoot, `${mode}.json`);
    assertRegularNoSymlink(profilePath);
    expected = JSON.parse(readFileSync(profilePath, "utf8")) as typeof expected;
    assert.equal(expected?.mode, mode);
    assert.equal(expected?.toolchain, toolchain);
  }
  const rustupObserved = { path: rustup, ...hashFile(rustup), version: commandText(rustup, ["--version"]) };
  const expectedRustup = expected?.executables?.rustup;
  if (expectedRustup) {
    assert.equal(rustupObserved.path, resolve(expectedRustup.path), "rustup path differs from qualification profile");
    assert.equal(rustupObserved.bytes, expectedRustup.bytes, "rustup byte length differs from qualification profile");
    assert.equal(rustupObserved.mode, expectedRustup.mode, "rustup mode differs from qualification profile");
    assert.equal(rustupObserved.sha256, expectedRustup.sha256, "rustup digest differs from qualification profile");
    assert.equal(rustupObserved.version, expected?.versionContains?.rustup, "rustup version output differs from qualification profile");
  }
  const tools = Object.fromEntries(([
    ["cargo", commandText(rustup, ["which", "--toolchain", toolchain, "cargo"])],
    ["rustc", commandText(rustup, ["which", "--toolchain", toolchain, "rustc"])],
    ["rustdoc", commandText(rustup, ["which", "--toolchain", toolchain, "rustdoc"])],
  ] as const).map(([name, path]) => {
    const canonical = canonicalExecutable(path);
    const observed = hashFile(canonical);
    const version = commandText(canonical, ["--version", "--verbose"]);
    const binding = expected?.executables?.[name];
    if (binding) {
      assert.equal(canonical, resolve(binding.path), `${name} path differs from qualification profile`);
      assert.equal(observed.bytes, binding.bytes, `${name} byte length differs from qualification profile`);
      assert.equal(observed.mode, binding.mode, `${name} mode differs from qualification profile`);
      assert.equal(observed.sha256, binding.sha256, `${name} digest differs from qualification profile`);
      assert.equal(version, expected?.versionContains?.[name], `${name} version output differs from qualification profile`);
    }
    if (msrv) assert(new RegExp(`\\b${toolchain.replace(".", "\\.")}\\b`).test(version), `${name} is not exact MSRV ${toolchain}`);
    return [name, { ...observed, path: canonical, version }] as const;
  }));
  const cargoHome = process.env.CARGO_HOME ? resolve(process.env.CARGO_HOME) : join(homedir(), ".cargo");
  assert(cargoHome.startsWith("/"), "CARGO_HOME must be absolute");
  return { mode, toolchain, executables: tools as Record<ToolName, ToolObservation>, rustup: rustupObserved, cargoHome };
}

export function buildRetryChildEnv(profile: Pick<RetryToolProfile, "cargoHome" | "toolchain" | "executables">, target: string): NodeJS.ProcessEnv {
  const toolDirs = Object.values(profile.executables).map((tool) => dirname(tool.path));
  return {
    HOME: process.env.HOME ?? homedir(),
    PATH: [...new Set([...toolDirs, "/usr/bin", "/bin"])].join(":"),
    CARGO_HOME: profile.cargoHome,
    CARGO_NET_OFFLINE: "true",
    CARGO_TARGET_DIR: target,
    RUSTUP_TOOLCHAIN: profile.toolchain,
    RUSTC: profile.executables.rustc.path,
    RUSTDOC: profile.executables.rustdoc.path,
    CARGO_TERM_COLOR: "never",
    NODE_ENV: "production",
  };
}

function run(profile: RetryToolProfile, cwd: string, args: string[], target: string): RecordedCommand {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const env = buildRetryChildEnv(profile, target);
  const result = spawnSync(profile.executables.cargo.path, args, { cwd, env, encoding: "utf8", timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const errorCode = result.error ? (result.error as NodeJS.ErrnoException).code ?? "UNKNOWN" : null;
  return { args, status: result.status, signal: result.signal, classification: classifyRetryCommand({ status: result.status, signal: result.signal, stdout, stderr, error: result.error ? { code: errorCode ?? undefined } : undefined }), stdout, stderr, durationMs: Date.now() - started, startedAt, finishedAt: new Date().toISOString(), timedOut: errorCode === "ETIMEDOUT", errorCode };
}

function expectedFiles(variant: "starter" | "solution") { return projectArchiveFiles(durableLogRetryPackage, variant, { repositoryRoot: repoRoot() }); }
function extractExact(archive: Uint8Array, destination: string, variant: "starter" | "solution"): string {
  const expected = expectedFiles(variant);
  const entries = unzipSync(archive);
  const prefix = `${durableLogRetryPackage.id}/`;
  const actual = Object.keys(entries).map((path) => path.startsWith(prefix) ? path.slice(prefix.length) : path);
  assert.equal(actual.some((path) => path.startsWith("/") || path.includes("..")), false);
  assert.deepEqual(actual.sort(), Object.keys(expected).sort());
  const packageRoot = join(destination, durableLogRetryPackage.id);
  for (const [path, content] of Object.entries(entries)) {
    assert(path.startsWith(prefix), `archive member outside package: ${path}`);
    const relative = path.slice(prefix.length);
    assert.equal(strFromU8(content), expected[relative], `archive content differs: ${relative}`);
    const target = join(packageRoot, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  assert.equal(Object.keys(entries).length, Object.keys(expected).length);
  assert.equal(sha256(archive).length, 64);
  return packageRoot;
}

function expectPass(command: RecordedCommand, label: string): void {
  assert.equal(command.classification, "passed", `${label}: ${command.stdout}\n${command.stderr}`);
}

function expectNamedRejected(command: RecordedCommand, testName: string, label: string): void {
  const output = `${command.stdout}\n${command.stderr}`;
  assert.equal(command.status, 101, `${label}: expected Rust test exit 101`);
  assert.equal(command.signal, null, `${label}: test was signalled`);
  assert.equal(command.timedOut, false, `${label}: test timed out`);
  assert.equal(command.classification, "test-failure", `${label}: not a semantic test failure`);
  assert.match(output, new RegExp(`running\\s+1 test`), `${label}: missing positive test count`);
  assert.match(output, new RegExp(`test\\s+${testName}\\s+\\.\\.\\. FAILED`), `${label}: intended named test did not fail`);
  assert.match(output, /test result: FAILED\.\s+0 passed;\s+1 failed;/, `${label}: expected one failed and zero passed`);
  assert.doesNotMatch(output, /could not compile|error\[E\d+\]|aborting due to|signal|timed out/i, `${label}: infrastructure failure masqueraded as mutant rejection`);
}

const expectedPositiveControlNames = [
  "parser_covers_receipts_errors_and_boundary",
  "invalid_policy_has_no_io_budget",
  "invalid_policy_returns_not_attempted_without_connecting",
  "shared_deadline_bounds_connect_write_read_at_the_same_boundary",
  "lost_response_replays_identical_frame_and_accepts_duplicate_receipt",
  "real_service_proxy_drops_first_receipt_then_returns_duplicate",
  "storage_is_terminal_unknown_and_queue_full_is_refused",
  "malformed_response_is_terminal_unknown_without_replay",
  "all_busy_stops_at_attempt_limit",
  "terminal_conflict_is_refused_without_uncertainty",
  "prior_uncertainty_then_conflict_stays_unknown",
  "backoff_deadline_overflow_stops_unknown_explicitly",
  "per_attempt_deadline_overflow_is_not_attempted",
] as const;

function expectPositiveControls(command: RecordedCommand, label: string): void {
  expectPass(command, label);
  const output = `${command.stdout}\n${command.stderr}`;
  assert.match(output, new RegExp(`running\\s+${expectedPositiveControlNames.length} tests`), `${label}: exact positive test count missing`);
  for (const name of expectedPositiveControlNames)
    assert.match(output, new RegExp(`test\\s+${name}\\s+\\.\\.\\. ok`), `${label}: required named control missing: ${name}`);
  assert.match(output, new RegExp(`test result: ok\\.\\s+${expectedPositiveControlNames.length} passed;\\s+0 failed;\\s+0 ignored`), `${label}: positive control summary is incomplete`);
  assert.doesNotMatch(output, /[1-9]\d* ignored|[1-9]\d* skipped/i, `${label}: ignored or skipped control output is not accepted`);
}

export const legacyRetryArchiveProjectIds = [
  "concurrency-lab-workshop",
  "durable-log-service-workspace",
  "ffi-buffer-workshop",
  "frame-protocol-workspace",
  "log-analyzer-workshop",
  "mini-grep-workshop",
  "miri-safety-workshop",
  "number-guessing-workshop",
  "property-contracts-workshop",
  "service-operations-workshop",
  "todo-cli-workshop",
  "tokio-pipeline-workshop",
  "tokio-service-workshop",
] as const;

export type RetryArchiveTopology = "empty" | "pre-generation" | "post-generation" | "post-authorization-generation" | "post-file-schema-generation";
export type GeneratedRetryArchiveHashes = { starter: string; solution: string };

const retryArchiveNames = {
  starter: `${durableLogRetryPackage.id}/starter.zip`,
  solution: `${durableLogRetryPackage.id}/solution.zip`,
} as const;

const authorizationArchiveNames = {
  starter: `${serviceAuthorizationPackage.id}/starter.zip`,
  solution: `${serviceAuthorizationPackage.id}/solution.zip`,
} as const;

const fileSchemaArchiveNames = {
  starter: `${fileSchemaEvolutionPackage.id}/starter.zip`,
  solution: `${fileSchemaEvolutionPackage.id}/solution.zip`,
} as const;

function legacyRetryArchiveNames(): string[] {
  return legacyRetryArchiveProjectIds.flatMap((project) => [`${project}/starter.zip`, `${project}/solution.zip`]);
}

export function classifyRetryArchiveTopology(snapshot: Record<string, string>): RetryArchiveTopology {
  const names = Object.keys(snapshot).sort();
  const legacyNames = legacyRetryArchiveNames();
  const allowed = new Set([...legacyNames, retryArchiveNames.starter, retryArchiveNames.solution, authorizationArchiveNames.starter, authorizationArchiveNames.solution, fileSchemaArchiveNames.starter, fileSchemaArchiveNames.solution]);
  assert(names.every((name) => allowed.has(name)), "archive topology contains an unknown project archive");
  const legacyPresent = names.filter((name) => legacyNames.includes(name));
  const retryPresent = names.filter((name) => name === retryArchiveNames.starter || name === retryArchiveNames.solution);
  const authorizationPresent = names.filter((name) => name === authorizationArchiveNames.starter || name === authorizationArchiveNames.solution);
  const fileSchemaPresent = names.filter((name) => name === fileSchemaArchiveNames.starter || name === fileSchemaArchiveNames.solution);
  if (names.length === 0) return "empty";
  assert.equal(legacyPresent.length, legacyNames.length, "archive topology has a partial legacy archive set");
  assert.equal(retryPresent.length === 0 || retryPresent.length === 2, true, "archive topology has a partial generated retry pair");
  assert(authorizationPresent.length === 0 || authorizationPresent.length === 2, "archive topology has a partial authorization pair");
  assert(authorizationPresent.length === 0 || retryPresent.length === 2, "authorization archives require the retry pair");
  assert(fileSchemaPresent.length === 0 || fileSchemaPresent.length === 2, "archive topology has a partial file schema pair");
  assert(fileSchemaPresent.length === 0 || authorizationPresent.length === 2, "file schema archives require the authorization pair");
  if (fileSchemaPresent.length === 2) return "post-file-schema-generation";
  if (authorizationPresent.length === 2) return "post-authorization-generation";
  return retryPresent.length === 0 ? "pre-generation" : "post-generation";
}

export function assertRetryArchiveTopology(snapshot: Record<string, string>, generated?: GeneratedRetryArchiveHashes, generatedAuthorization?: GeneratedRetryArchiveHashes, generatedFileSchema?: GeneratedRetryArchiveHashes): RetryArchiveTopology {
  const topology = classifyRetryArchiveTopology(snapshot);
  if (topology === "post-generation" || topology === "post-authorization-generation" || topology === "post-file-schema-generation") {
    assert(generated, "post-generation archive topology requires generated retry hashes");
    assert.equal(snapshot[retryArchiveNames.starter], generated.starter, "generated starter archive differs from authored bytes");
    assert.equal(snapshot[retryArchiveNames.solution], generated.solution, "generated solution archive differs from authored bytes");
  }
  if (topology === "post-authorization-generation" || topology === "post-file-schema-generation") {
    assert(generatedAuthorization, "authorization archive topology requires authored authorization hashes");
    assert.equal(snapshot[authorizationArchiveNames.starter], generatedAuthorization.starter, "authorization starter archive differs from authored bytes");
    assert.equal(snapshot[authorizationArchiveNames.solution], generatedAuthorization.solution, "authorization solution archive differs from authored bytes");
  }
  if (topology === "post-file-schema-generation") {
    assert(generatedFileSchema, "file schema topology requires authored file schema hashes");
    assert.equal(snapshot[fileSchemaArchiveNames.starter], generatedFileSchema.starter, "file schema starter archive differs from authored bytes");
    assert.equal(snapshot[fileSchemaArchiveNames.solution], generatedFileSchema.solution, "file schema solution archive differs from authored bytes");
  }
  return topology;
}

export function archiveSnapshot(root: string): Record<string, string> {
  const base = join(root, "public", "projects");
  const result: Record<string, string> = {};
  if (!existsSync(base)) return result;
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".zip")) result[path.slice(base.length + 1)] = sha256(readFileSync(path));
    }
  };
  walk(base);
  return result;
}

type Mutant = { id: string; marker: string; replacement: string; testName: string; replaceAll?: boolean };

function mutantCheck(profile: RetryToolProfile, sourceArchive: Uint8Array, runRoot: string): Array<{ id: string; compile: RecordedCommand; rejected: RecordedCommand; restored: RecordedCommand }> {
  const mutants: Mutant[] = [
    {
      id: "receipt-after-uncertainty",
      marker: "Ok(Observation::Receipt(receipt)) => return Final::Delivered { receipt, attempts },",
      replacement: "Ok(Observation::Receipt(receipt)) => { last = Some(LastObservation::Malformed); unresolved = true; },",
      testName: "lost_response_replays_identical_frame_and_accepts_duplicate_receipt",
    },
    {
      id: "malformed-terminal-retry",
      marker: "Err(error @ (LastObservation::Malformed | LastObservation::Unrecognized)) => {\n                last = Some(error);\n                return stopped(last, unresolved, StopReason::Terminal, attempts);\n            }",
      replacement: "Err(error @ (LastObservation::Malformed | LastObservation::Unrecognized)) => {\n                last = Some(error);\n                unresolved = true;\n            }",
      testName: "malformed_response_is_terminal_unknown_without_replay",
    },
    {
      id: "storage-as-refusal",
      marker: "return Final::Unknown {\n                    last: LastObservation::Storage,\n                    stopped: StopReason::Terminal,\n                    attempts,\n                };",
      replacement: "return Final::Refused { reason: Refusal::Storage, stopped: StopReason::Terminal, attempts };",
      testName: "storage_is_terminal_unknown_and_queue_full_is_refused",
    },
    {
      id: "mutable-frame-replay",
      marker: "match one_attempt(addr, &frame, deadline).await {",
      replacement: "let attempt_frame = if attempts > 1 { [frame.as_slice(), b\"mutated\"].concat() } else { frame.clone() };\n        match one_attempt(addr, &attempt_frame, deadline).await {",
      testName: "lost_response_replays_identical_frame_and_accepts_duplicate_receipt",
    },
    {
      id: "attempt-limit-off-by-one",
      marker: "if attempts >= policy.max_attempts",
      replacement: "if attempts > policy.max_attempts",
      testName: "all_busy_stops_at_attempt_limit",
      replaceAll: true,
    },
    {
      id: "per-attempt-overflow-fallback",
      marker: "None => {\n                return Final::NotAttempted {\n                    stopped: StopReason::BackoffOverflow,\n                };\n            }",
      replacement: "None => { let _ = policy.global_deadline; global },",
      testName: "per_attempt_deadline_overflow_is_not_attempted",
    },
    {
      id: "retry-after-conflict",
      marker: "Ok(Observation::Refusal(kind)) => {\n                last = Some(LastObservation::Refusal(kind));\n                return stopped(last, unresolved, StopReason::Terminal, attempts);\n            }",
      replacement: "Ok(Observation::Refusal(kind)) => {\n                last = Some(LastObservation::Refusal(kind));\n            }",
      testName: "terminal_conflict_is_refused_without_uncertainty",
    },
    {
      id: "erase-prior-uncertainty",
      marker: "Err(error) => {\n                last = Some(error);\n                unresolved = true;\n            }",
      replacement: "Err(error) => {\n                last = Some(error);\n                unresolved = false;\n            }",
      testName: "prior_uncertainty_then_conflict_stays_unknown",
    },
    {
      id: "ignore-shared-deadline",
      marker: ".map(|per_attempt_deadline| std::cmp::min(global, per_attempt_deadline))",
      replacement: ".map(|_per_attempt_deadline| global)",
      testName: "shared_deadline_bounds_connect_write_read_at_the_same_boundary",
    },
  ];
  return mutants.map((mutant) => {
    const mutantRoot = mkdtempSync(join(runRoot, `mutant-${mutant.id}-`));
    const packageRoot = extractExact(sourceArchive, mutantRoot, "solution");
    const sourcePath = join(packageRoot, "crates/ingest-service/src/retry_client.rs");
    const original = readFileSync(sourcePath, "utf8");
    assert(original.includes(mutant.marker), `${mutant.id}: mutation marker missing`);
    const mutated = mutant.replaceAll ? original.replaceAll(mutant.marker, mutant.replacement) : original.replace(mutant.marker, mutant.replacement);
    assert.notEqual(mutated, original, `${mutant.id}: mutation did not change source`);
    writeFileSync(sourcePath, mutated);
    const target = join(mutantRoot, "target");
    let compile: RecordedCommand;
    let rejected: RecordedCommand;
    try {
      compile = run(profile, packageRoot, ["test", "-p", "ingest-service", "--test", "retry_client", "--offline", "--locked", "--no-run"], target);
      expectPass(compile, `${mutant.id} compile`);
      rejected = run(profile, packageRoot, ["test", "-p", "ingest-service", "--test", "retry_client", mutant.testName, "--offline", "--locked", "--", "--exact"], target);
      expectNamedRejected(rejected, mutant.testName, mutant.id);
    } finally {
      writeFileSync(sourcePath, original);
    }
    const restored = run(profile, packageRoot, ["test", "-p", "ingest-service", "--test", "retry_client", mutant.testName, "--offline", "--locked", "--", "--exact"], target);
    expectPass(restored, `${mutant.id} restored`);
    return { id: mutant.id, compile, rejected, restored };
  });
}

export function runClientRetryVerification(options: RetryVerifierArgs): unknown {
  const root = repoRoot();
  assert.equal(resolve(process.cwd()), root, "run from the repository root");
  const profile = profileFor(options.msrv);
  const reportRoot = join(root, "test-results", "client-retry", options.msrv ? "msrv" : "stable");
  mkdirSync(reportRoot, { recursive: true });
  const runRoot = mkdtempSync(join(reportRoot, "run-"));
  const beforeArchives = archiveSnapshot(root);
  const commands: RecordedCommand[] = [];
  const archives = {
    starter: buildProjectArchive(durableLogRetryPackage, "starter", { repositoryRoot: root }),
    solution: buildProjectArchive(durableLogRetryPackage, "solution", { repositoryRoot: root }),
  };
  const generatedHashes = {
    starter: sha256(archives.starter),
    solution: sha256(archives.solution),
  };
  const authorizationArchive = Object.fromEntries((["starter", "solution"] as const).map((variant) => {
    const bytes = buildProjectArchive(serviceAuthorizationPackage, variant, { repositoryRoot: root });
    const members = projectArchiveFiles(serviceAuthorizationPackage, variant, { repositoryRoot: root });
    return [variant, { sha256: sha256(bytes), bytes: bytes.byteLength, members: Object.fromEntries(Object.entries(members).map(([path, content]) => [path, sha256(content)])) }];
  })) as Record<"starter" | "solution", { sha256: string; bytes: number; members: Record<string, string> }>;
  const generatedAuthorization = { starter: authorizationArchive.starter.sha256, solution: authorizationArchive.solution.sha256 };
  const fileSchemaArchive = Object.fromEntries((["starter", "solution"] as const).map((variant) => {
    const bytes = buildProjectArchive(fileSchemaEvolutionPackage, variant, { repositoryRoot: root });
    const members = projectArchiveFiles(fileSchemaEvolutionPackage, variant, { repositoryRoot: root });
    return [variant, { sha256: sha256(bytes), bytes: bytes.byteLength, members: Object.fromEntries(Object.entries(members).map(([path, content]) => [path, sha256(content)])) }];
  })) as Record<"starter" | "solution", { sha256: string; bytes: number; members: Record<string, string> }>;
  const generatedFileSchema = { starter: fileSchemaArchive.starter.sha256, solution: fileSchemaArchive.solution.sha256 };
  const beforeTopology = assertRetryArchiveTopology(beforeArchives, generatedHashes, generatedAuthorization, generatedFileSchema);
  const results: Record<string, unknown> = { schema: "rust-workshop.client-retry.v1", variant: options.msrv ? "msrv" : "stable", archive: {}, authorizationArchive, fileSchemaArchive, commands };
  for (const variant of ["starter", "solution"] as const) {
    const packageRoot = extractExact(archives[variant], join(runRoot, variant), variant);
    const target = join(runRoot, variant, "target");
    if (variant === "solution") {
      const fmt = run(profile, packageRoot, ["fmt", "--all", "--", "--check"], target); commands.push(fmt); expectPass(fmt, `${variant} fmt`);
    }
    const check = run(profile, packageRoot, ["check", "--workspace", "--all-targets", "--offline", "--locked"], target); commands.push(check); expectPass(check, `${variant} check`);
    const test = run(profile, packageRoot, ["test", "-p", "ingest-service", "--test", "retry_client", "--offline", "--locked", "--no-fail-fast"], target); commands.push(test);
    if (variant === "solution") expectPositiveControls(test, "solution retry tests");
    else assert.equal(test.classification, "test-failure", "starter must remain unfinished");
    (results.archive as Record<string, unknown>)[variant] = { sha256: sha256(archives[variant]), bytes: archives[variant].byteLength, memberCount: Object.keys(expectedFiles(variant)).length };
  }
  const mutantCommands = mutantCheck(profile, archives.solution, runRoot);
  for (const mutant of mutantCommands) commands.push(mutant.compile, mutant.rejected, mutant.restored);
  const afterArchives = archiveSnapshot(root);
  const afterTopology = assertRetryArchiveTopology(afterArchives, generatedHashes, generatedAuthorization, generatedFileSchema);
  assert.equal(afterTopology, beforeTopology, "public archive topology changed during standalone verification");
  assert.deepEqual(afterArchives, beforeArchives, "public project archives changed");
  results.commands = commands;
  (results as Record<string, unknown>).mutants = mutantCommands;
  writeFileSync(join(runRoot, "receipt.json"), JSON.stringify({ ...results, beforeArchives, afterArchives, toolchain: profile }, null, 2));
  return results;
}

function main(): void {
  const result = runClientRetryVerification(parseClientRetryArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
