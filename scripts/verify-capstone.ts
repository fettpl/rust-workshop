/**
 * Verifies the repository-authored durable-log-service archives only.
 *
 * The module is intentionally side-effect free when imported by Vitest. The
 * executable entry below has a closed argument allow-list and never accepts a
 * source path, a tool override, or an imported workspace.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { strFromU8, unzipSync } from "fflate";
import { projectFiles } from "../src/domain/project-package";
import { durableLogServicePackage } from "../src/content/projects/durable-log-service/archive";
import { buildProjectArchive } from "./project-archive";
import { capstoneMutants, capstoneMutantTestArgs, type CapstoneMutant } from "./capstone-mutants";

export interface CapstoneArgs {
  fetch: boolean;
  msrv: boolean;
}

export type CommandClassification =
  | "passed"
  | "compile-error"
  | "test-failure"
  | "missing-test"
  | "timeout"
  | "signal"
  | "empty-output"
  | "infrastructure-error";

export interface CommandResultLike {
  status: number | null;
  signal: NodeJS.Signals | string | null;
  stdout?: string;
  stderr?: string;
  error?: { code?: string | number; message?: string };
}

export interface ToolchainReport {
  label: "stable" | "msrv";
  cargoPath: string;
  rustcPath: string;
  rustdocPath: string;
  versions: Record<string, string>;
  selectedArgs: string[];
}

/** Serialize only explicit tool metadata; process.env is deliberately excluded. */
export function serializeToolchainMetadata(input: {
  label: "stable" | "msrv";
  cargo: string;
  rustc: string;
  rustdoc: string;
  versions: Record<string, string>;
  selectedArgs: string[];
  /** Accepted for regression coverage only; never copied into report data. */
  env?: Record<string, string | undefined>;
}): ToolchainReport {
  return {
    label: input.label,
    cargoPath: input.cargo,
    rustcPath: input.rustc,
    rustdocPath: input.rustdoc,
    versions: { ...input.versions },
    selectedArgs: [...input.selectedArgs],
  };
}

export function parseCapstoneArgs(argv: readonly string[]): CapstoneArgs {
  const allowed = new Set(["--fetch", "--msrv"]);
  for (const arg of argv) {
    if (!allowed.has(arg)) {
      throw new Error(
        "Only --fetch and --msrv are supported; source, paths, imports, dependency overrides and arbitrary toolchains are not accepted.",
      );
    }
  }
  if (new Set(argv).size !== argv.length) {
    throw new Error("Flags must be unique; duplicate verifier flags are rejected.");
  }
  return { fetch: argv.includes("--fetch"), msrv: argv.includes("--msrv") };
}

export function isAllowedCapstoneArgs(argv: readonly string[]): boolean {
  try {
    parseCapstoneArgs(argv);
    return true;
  } catch {
    return false;
  }
}

export function servedArchiveMatches(
  generated: Uint8Array,
  served: Uint8Array,
): boolean {
  return Buffer.from(generated).equals(Buffer.from(served));
}

function combinedOutput(result: CommandResultLike): string {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

interface NamedTestObservation {
  discovered: string[];
  designated: string[];
  failures: string[];
  passes: string[];
  runCount: number | null;
  summary: { state: "ok" | "FAILED"; passed: number; failed: number } | null;
}

function observeNamedTest(
  result: CommandResultLike,
  namedTest: string,
): NamedTestObservation {
  const output = combinedOutput(result);
  const records = Array.from(
    output.matchAll(/^\s*test\s+(\S+)\s+\.\.\.\s+(FAILED|ok|ignored)\s*$/gm),
  ).map((match) => ({ name: match[1], state: match[2] }));
  const designated = records
    .filter(
      ({ name }) => name === namedTest || name.endsWith(`::${namedTest}`),
    )
    .map(({ name }) => name);
  const summaryMatch = output.match(
    /test result:\s+(ok|FAILED)\.\s+(\d+) passed;\s+(\d+) failed;/,
  );
  const runningMatch = output.match(/running\s+(\d+)\s+tests?/);
  return {
    discovered: records.map(({ name }) => name),
    designated,
    passes: records.filter(({ state }) => state === "ok").map(({ name }) => name),
    failures: records
      .filter(({ state }) => state === "FAILED")
      .map(({ name }) => name),
    runCount: runningMatch ? Number(runningMatch[1]) : null,
    summary: summaryMatch
      ? {
          state: summaryMatch[1] as "ok" | "FAILED",
          passed: Number(summaryMatch[2]),
          failed: Number(summaryMatch[3]),
        }
      : null,
  };
}

function hasExpectedNamedTestFailure(
  result: CommandResultLike,
  namedTest: string,
  expectedStatus = 101,
): boolean {
  if (
    result.status !== expectedStatus ||
    result.signal ||
    result.error ||
    /error\[E|could not compile|aborting due to/.test(combinedOutput(result))
  )
    return false;
  const observation = observeNamedTest(result, namedTest);
  return (
    observation.designated.length === 1 &&
    observation.runCount === 1 &&
    observation.discovered.length === 1 &&
    observation.failures.length === 1 &&
    observation.failures[0] === observation.designated[0] &&
    observation.summary?.state === "FAILED" &&
    observation.summary.failed === 1 &&
    observation.summary.passed + observation.summary.failed ===
      observation.discovered.length
  );
}

export function classifyCommandResult(
  result: CommandResultLike,
  namedTest?: string,
): CommandClassification {
  const output = combinedOutput(result);
  if (
    result.signal ||
    result.error?.code === "SIGTERM" ||
    result.error?.code === "SIGKILL"
  )
    return "signal";
  if (result.error?.code === "ETIMEDOUT" || result.status === 124)
    return "timeout";
  if (result.error) return "infrastructure-error";
  if (!output.trim()) return result.status === 0 && !namedTest ? "passed" : "empty-output";
  if (namedTest) {
    const observation = observeNamedTest(result, namedTest);
    if (/error\[E|could not compile|aborting due to/.test(output)) return "compile-error";
    if (hasExpectedNamedTestFailure(result, namedTest)) return "test-failure";
    if (observation.designated.length !== 1) return "missing-test";
    if (
      result.status === 0 && observation.runCount === 1 &&
      observation.discovered.length === 1 && observation.passes.length === 1 &&
      observation.passes[0] === observation.designated[0] &&
      observation.summary?.state === "ok" && observation.summary.passed === 1 &&
      observation.summary.failed === 0
    ) return "passed";
    return "infrastructure-error";
  }
  if (result.status === 0) return "passed";
  if (/test result: FAILED/.test(output)) return "test-failure";
  return /error\[E|could not compile|aborting due to/.test(output)
    ? "compile-error"
    : "infrastructure-error";
}

export function isRejectedMutant(
  result: CommandResultLike,
  options: { phase: "compile" | "test"; namedTest: string; expectedStatus?: number },
): boolean {
  return options.phase === "test" && hasExpectedNamedTestFailure(result, options.namedTest, options.expectedStatus);
}

interface Toolchain {
  label: "stable" | "msrv";
  cargo: string;
  rustc: string;
  rustdoc: string;
  env: NodeJS.ProcessEnv;
  versions: Record<string, string>;
}

interface RecordedCommand {
  command: string;
  args: string[];
  classification: CommandClassification;
  status: number | null;
  signal: NodeJS.Signals | string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface MutantRecord {
  id: string;
  testTarget: CapstoneMutant["testTarget"];
  namedTest: string;
  compile?: RecordedCommand;
  test?: RecordedCommand;
  restored?: RecordedCommand;
  accepted: boolean;
  error?: string;
}

interface VariantEvidence {
  externalConsumer?: RecordedCommand;
  workload?: RecordedCommand;
}

function toolVersion(executable: string): string {
  const result = spawnSync(executable, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function resolveToolchain(msrv: boolean): Toolchain {
  const expected = msrv ? "1.85.0" : undefined;
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    if (msrv) {
      const located = spawnSync(
        "rustup",
        ["which", "--toolchain", "1.85.0", tool],
        { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 },
      );
      assert.equal(located.status, 0, located.stderr);
      paths[tool] = located.stdout.trim();
    } else {
      paths[tool] = tool;
    }
    const version = toolVersion(paths[tool]);
    if (expected) assert(version.startsWith(`${tool} ${expected} `), version);
    else assert(!version.includes("nightly"), version);
  }
  const env = { ...process.env };
  env.RUSTC = paths.rustc;
  env.RUSTDOC = paths.rustdoc;
  if (msrv) env.PATH = `${dirname(paths.cargo)}${delimiter}${env.PATH ?? ""}`;
  return {
    label: msrv ? "msrv" : "stable",
    cargo: paths.cargo,
    rustc: paths.rustc,
    rustdoc: paths.rustdoc,
    env,
    versions: {
      cargo: toolVersion(paths.cargo),
      rustc: toolVersion(paths.rustc),
      rustdoc: toolVersion(paths.rustdoc),
    },
  };
}

function runCommand(
  toolchain: Toolchain,
  cwd: string,
  args: string[],
  timeoutMs = 120_000,
  namedTest?: string,
): RecordedCommand {
  const started = Date.now();
  const result = spawnSync(toolchain.cargo, args, {
    cwd,
    env: toolchain.env,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const classification = classifyCommandResult({
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    error: result.error
      ? { code: (result.error as NodeJS.ErrnoException).code, message: result.error.message }
      : undefined,
  }, namedTest);
  return {
    command: toolchain.cargo,
    args,
    classification,
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    durationMs: Date.now() - started,
  };
}

function recordCommand(commands: RecordedCommand[], command: RecordedCommand): RecordedCommand {
  commands.push(command);
  return command;
}

function expectSuccess(command: RecordedCommand, description: string): void {
  assert.equal(
    command.classification,
    "passed",
    `${description}: cargo ${command.args.join(" ")}\n${command.stdout}\n${command.stderr}`,
  );
}

function expectTestOutput(command: RecordedCommand, description: string): void {
  expectSuccess(command, description);
  assert.match(command.stdout + command.stderr, /test result: ok\. [1-9]\d* passed/);
}

const packageRootName = durableLogServicePackage.id;

function extractExactArchive(
  archive: Uint8Array,
  destination: string,
  variant: "starter" | "solution",
): string {
  const expected = projectFiles(durableLogServicePackage, variant);
  const entries = unzipSync(archive);
  const prefix = `${packageRootName}/`;
  const paths = Object.keys(entries).map((path) => path.slice(prefix.length));
  assert.equal(
    paths.some((path) => path === Object.keys(entries)[0] && !path),
    false,
  );
  for (const path of Object.keys(entries)) {
    assert(path.startsWith(prefix), `archive member outside package: ${path}`);
    const relative = path.slice(prefix.length);
    assert(relative && !relative.startsWith("/") && !relative.includes(".."));
  }
  assert.deepEqual(paths.sort(), Object.keys(expected).sort());
  const packageRoot = join(destination, packageRootName);
  for (const [path, contents] of Object.entries(entries)) {
    const relative = path.slice(prefix.length);
    const authored = expected[relative];
    assert.notEqual(authored, undefined, `unexpected authored path: ${relative}`);
    assert.equal(strFromU8(contents), authored, `archive bytes differ: ${relative}`);
    assert(!/\bunsafe\s+(?:fn|impl|trait|\{)/.test(authored), `unsafe source: ${relative}`);
    const target = join(packageRoot, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return packageRoot;
}

function validateManifests(packageRoot: string): void {
  const root = readFileSync(join(packageRoot, "Cargo.toml"), "utf8");
  assert.match(root, /members\s*=\s*\["crates\/ingest-core",\s*"crates\/ingest-store",\s*"crates\/ingest-service"\]/);
  assert.match(root, /resolver\s*=\s*"3"/);
  assert.match(root, /edition\s*=\s*"2024"/);
  assert.match(root, /rust-version\s*=\s*"1\.85\.0"/);
  assert.match(root, /publish\s*=\s*false/);
  for (const member of ["ingest-core", "ingest-store", "ingest-service"]) {
    const manifest = readFileSync(join(packageRoot, "crates", member, "Cargo.toml"), "utf8");
    assert.match(manifest, /edition\s*=\s*"2024"/);
    assert.match(manifest, /rust-version\s*=\s*"1\.85\.0"/);
    assert.match(manifest, /publish\s*=\s*false/);
    assert.match(manifest, /unsafe_code\s*=\s*"forbid"/);
    assert(!/\[features\]/.test(manifest), `${member} defines capability-removing features`);
  }
  const store = readFileSync(join(packageRoot, "crates/ingest-store/Cargo.toml"), "utf8");
  assert.match(store, /rusqlite\s*=\s*\{\s*version\s*=\s*"=0\.40\.2"/);
  assert.match(store, /default-features\s*=\s*false/);
  assert.match(store, /features\s*=\s*\["bundled"\]/);
  const service = readFileSync(join(packageRoot, "crates/ingest-service/Cargo.toml"), "utf8");
  assert.match(service, /tokio\s*=\s*\{\s*version\s*=\s*"=1\.53\.1"/);
  assert.match(service, /default-features\s*=\s*false/);
  const lock = readFileSync(join(packageRoot, "Cargo.lock"), "utf8");
  assert.match(lock, /name = "rusqlite"\nversion = "0\.40\.2"/);
  assert.match(lock, /name = "tokio"\nversion = "1\.53\.1"/);
  for (const path of ["README.md", "PROTOCOL.md", "THREAT_MODEL.md", "RUNBOOK.md", "CHANGELOG.md", "RELEASE.md", "PERFORMANCE.md"]) {
    assert.ok(readFileSync(join(packageRoot, path), "utf8"));
  }
}

function writeExternalConsumer(packageRoot: string, root: string): string {
  const consumer = join(root, "external-consumer");
  mkdirSync(join(consumer, "src"), { recursive: true });
  writeFileSync(
    join(consumer, "Cargo.toml"),
    `[package]\nname = "external-consumer"\nversion = "0.1.0"\nedition = "2024"\n\n[dependencies]\ningest-core = { path = "${join(packageRoot, "crates/ingest-core").replaceAll("\\", "\\\\")}" }\n`,
  );
  writeFileSync(
    join(consumer, "src/lib.rs"),
    `use ingest_core::{decode_frame, encode_v1, Event, Level};\n\n#[test]\nfn old_consumer_round_trips_v1() {\n    let event = Event::new("source".to_owned(), "key".to_owned(), Level::Info, "message".to_owned()).unwrap();\n    assert_eq!(event.source(), "source");\n    assert_eq!(event.key(), "key");\n    assert_eq!(event.message(), "message");\n    assert_eq!(decode_frame(&encode_v1(&event).unwrap()).unwrap(), event);\n}\n`,
  );
  return consumer;
}

function runMutant(
  toolchain: Toolchain,
  solutionArchive: Uint8Array,
  extractionRoot: string,
  mutant: CapstoneMutant,
  commands: RecordedCommand[],
  mutantRecords: MutantRecord[],
): MutantRecord {
  const record: MutantRecord = { id: mutant.id, testTarget: mutant.testTarget, namedTest: mutant.namedTest, accepted: false };
  mutantRecords.push(record);
  const packageRoot = extractExactArchive(
    solutionArchive,
    join(extractionRoot, mutant.id),
    "solution",
  );
  const sourcePath = join(packageRoot, mutant.path);
  const reference = readFileSync(sourcePath, "utf8");
  const mutated = mutant.mutate(reference);
  assert.notEqual(mutated, reference, `${mutant.id} did not mutate source`);
  const testArgs = capstoneMutantTestArgs(mutant);
  let failure: unknown;
  writeFileSync(sourcePath, mutated);
  try {
    record.compile = recordCommand(commands, runCommand(toolchain, packageRoot, ["test", "--workspace", "--offline", "--locked", "--no-run"]));
    expectSuccess(record.compile, `${mutant.id} must compile`);
    record.test = recordCommand(commands, runCommand(toolchain, packageRoot, testArgs, 60_000, mutant.namedTest));
    assert(isRejectedMutant(record.test, { phase: "test", namedTest: mutant.namedTest }), `${mutant.id} was not rejected: ${record.test.classification}\n${record.test.stdout}\n${record.test.stderr}`);
  } catch (error) {
    failure = error;
    record.error = error instanceof Error ? error.message : String(error);
  } finally {
    writeFileSync(sourcePath, reference);
    try {
      record.restored = recordCommand(commands, runCommand(toolchain, packageRoot, testArgs, 60_000, mutant.namedTest));
      expectTestOutput(record.restored, `${mutant.id} restored reference`);
    } catch (error) {
      record.error ??= error instanceof Error ? error.message : String(error);
      failure ??= error;
    }
  }
  if (failure) throw failure;
  record.accepted = true;
  return record;
}

function runWorkload(toolchain: Toolchain, packageRoot: string, commands: RecordedCommand[]): RecordedCommand {
  const result = recordCommand(commands, runCommand(toolchain, packageRoot, ["run", "--example", "fixed_workload", "--offline", "--locked"], 60_000));
  expectSuccess(result, "fixed_workload");
  assert.match(result.stdout + result.stderr, /events=512/);
  assert.match(result.stdout + result.stderr, /unique=/);
  assert.match(result.stdout + result.stderr, /count=/);
  return result;
}

function verifyVariant(
  toolchain: Toolchain,
  variant: "starter" | "solution",
  fetchDependencies: boolean,
  commands: RecordedCommand[],
  tempRoots: string[],
  evidence: VariantEvidence,
): { archiveSha256: string; packageRoot: string; extractionRoot: string } {
  const generated = buildProjectArchive(durableLogServicePackage, variant);
  const servedPath = join(process.cwd(), "public/projects", packageRootName, `${variant}.zip`);
  assert(existsSync(servedPath), `Missing served ${variant} archive`);
  const served = readFileSync(servedPath);
  assert(servedArchiveMatches(generated, served), `Stale served ${variant} archive`);
  const extractionRoot = mkdtempSync(join("/tmp", `capstone-${toolchain.label}-${variant}-`));
  tempRoots.push(extractionRoot);
  const packageRoot = extractExactArchive(generated, extractionRoot, variant);
  validateManifests(packageRoot);
  if (fetchDependencies) {
    const fetch = recordCommand(commands, runCommand(toolchain, packageRoot, ["fetch", "--locked"]));
    expectSuccess(fetch, `${variant} fetch`);
  }
  const check = recordCommand(commands, runCommand(toolchain, packageRoot, ["check", "--workspace", "--all-targets", "--offline", "--locked"]));
  expectSuccess(check, `${variant} check`);
  const tests = recordCommand(commands, runCommand(toolchain, packageRoot, ["test", "--workspace", "--offline", "--locked", "--no-fail-fast"]));
  if (variant === "starter") {
    assert.equal(tests.classification, "test-failure", `starter must fail unfinished behavior\n${tests.stdout}\n${tests.stderr}`);
    assert.match(tests.stdout + tests.stderr, /test result: FAILED/);
    assert.match(tests.stdout + tests.stderr, /not yet implemented/);
  } else {
    expectTestOutput(tests, `${variant} test`);
  }
  if (variant === "solution") {
    for (const args of [
      ["fmt", "--all", "--", "--check"],
      ["clippy", "--workspace", "--all-targets", "--offline", "--locked", "--", "-D", "warnings"],
      ["doc", "--workspace", "--offline", "--locked", "--no-deps"],
      ["test", "--workspace", "--offline", "--locked", "--doc"],
      ["check", "--workspace", "--all-targets", "--offline", "--locked", "--no-default-features"],
      ["check", "--workspace", "--all-targets", "--offline", "--locked", "--all-features"],
    ]) {
      const command = recordCommand(commands, runCommand(toolchain, packageRoot, args));
      if (args[0] === "test" && !args.includes("--doc"))
        expectTestOutput(command, args.join(" "));
      else expectSuccess(command, args.join(" "));
    }
    const consumer = writeExternalConsumer(packageRoot, extractionRoot);
    const consumerTest = recordCommand(commands, runCommand(toolchain, consumer, ["test", "--offline"], 60_000));
    evidence.externalConsumer = consumerTest;
    expectTestOutput(consumerTest, "external consumer");
    evidence.workload = runWorkload(toolchain, packageRoot, commands);
  }
  return {
    archiveSha256: createHash("sha256").update(served).digest("hex"),
    packageRoot,
    extractionRoot,
  };
}

export function runCapstoneVerification(options: CapstoneArgs): unknown {
  const reportLabel = options.msrv ? "msrv" : "stable";
  const reportDir = join(process.cwd(), "test-results/capstone", reportLabel);
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "report.json");
  rmSync(reportPath, { force: true });
  const commands: RecordedCommand[] = [];
  const mutantRecords: MutantRecord[] = [];
  const tempRoots: string[] = [];
  const evidence: VariantEvidence = {};
  let toolchain: Toolchain | undefined;
  let starter: ReturnType<typeof verifyVariant> | undefined;
  let solution: ReturnType<typeof verifyVariant> | undefined;
  let mutantRoot: string | undefined;
  let solutionArchive: Uint8Array | undefined;
  let failure: string | undefined;
  let completedReport: unknown;
  try {
    toolchain = resolveToolchain(options.msrv);
    starter = verifyVariant(toolchain, "starter", options.fetch, commands, tempRoots, evidence);
    solution = verifyVariant(toolchain, "solution", options.fetch, commands, tempRoots, evidence);
    mutantRoot = mkdtempSync(join("/tmp", `capstone-${toolchain.label}-mutants-`));
    tempRoots.push(mutantRoot);
    solutionArchive = buildProjectArchive(durableLogServicePackage, "solution");
    for (const mutant of capstoneMutants) runMutant(toolchain, solutionArchive, mutantRoot, mutant, commands, mutantRecords);
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    const label = toolchain?.label ?? (options.msrv ? "msrv" : "stable");
    const finalReport = {
      reportVersion: 2,
      status: failure ? "failed" : "passed",
      archiveKind: "authored-project-zip",
      variant: "solution",
      archiveSha256: solution?.archiveSha256 ?? null,
      generatedArchiveSha256: solutionArchive ? createHash("sha256").update(solutionArchive).digest("hex") : null,
      toolchain: toolchain ? serializeToolchainMetadata({ label: toolchain.label, cargo: toolchain.cargo, rustc: toolchain.rustc, rustdoc: toolchain.rustdoc, versions: toolchain.versions, selectedArgs: [...(options.fetch ? ["--fetch"] : []), ...(options.msrv ? ["--msrv"] : [])], env: toolchain.env }) : null,
      metadata: { platform: process.platform, arch: process.arch, nodeVersion: process.version },
      commands,
      schemaVersion: 2,
      wireVersions: [1, 2],
      starter: { failedUnfinishedBehavior: Boolean(starter) },
      externalConsumer: evidence.externalConsumer
        ? {
            state: "executed",
            result: evidence.externalConsumer,
            preCorrelationEventNew: null,
            v1RoundTrip: evidence.externalConsumer.classification === "passed",
          }
        : {
            state: "unexecuted",
            result: null,
            preCorrelationEventNew: null,
            v1RoundTrip: null,
            reason: "verification stopped before the external consumer command",
          },
      recovery: { mutants: mutantRecords },
      workload: { events: 512, expectedInserted: 256, expectedDuplicates: 256, deterministicDuplicateSchedule: "key = floor(index / 2)", result: evidence.workload ?? null },
      release: { status: "Hold", advisoryAndLicenseReview: "incomplete" },
      failure,
    };
    completedReport = finalReport;
    try {
      writeFileSync(reportPath, `${JSON.stringify(finalReport, null, 2)}\n`);
    } finally {
      for (const root of tempRoots) {
        if (root) rmSync(root, { recursive: true, force: true });
      }
    }
  }
  if (failure) throw new Error(failure);
  return completedReport;
}

function main(): void {
  const options = parseCapstoneArgs(process.argv.slice(2));
  runCapstoneVerification(options);
  console.log(`Capstone archive verified on ${options.msrv ? "exact Rust 1.85.0" : "stable Rust"}.`);
}

const invoked = process.argv[1] && fileURLToPath(pathToFileURL(process.argv[1])) === fileURLToPath(import.meta.url);
if (invoked) main();
