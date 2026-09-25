import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { delimiter, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export type ApiReleaseMode = "stable" | "msrv";
export type ScenarioId = "default" | "no-default-features" | "metrics";

const MSRV = "1.85.0";
const COMMAND_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_CHARS = 2_000;
const MAX_COMMANDS = 32;
const REQUIRED_MUTANTS = [
  "removed-legacy-path",
  "lost-dyn-compatibility",
  "hidden-legacy-path-under-metrics",
  "behavior-regression",
] as const;
const ROOT = dirname(fileURLToPath(import.meta.url));
export const API_RELEASE_FIXTURE_ROOT = join(ROOT, "fixtures/api-release");

export interface CommandEvidence {
  cwd: string;
  args: string[];
  status: number | null;
  signal: string | null;
  timedOut: boolean;
  durationMs: number;
  stdoutSha256: string;
  stderrSha256: string;
  stdoutTail: string;
  stderrTail: string;
  errorCode?: string;
}

export interface ToolchainEvidence {
  requested: "stable" | "1.85.0";
  cargo: string;
  rustc: string;
  rustdoc: string;
  cargoPath: string;
  rustcPath: string;
  rustdocPath: string;
}

export interface FixtureEvidence {
  root: "scripts/fixtures/api-release";
  files: Array<{ path: string; bytes: number; sha256: string }>;
  sha256: string;
}

export interface ScenarioEvidence {
  id: ScenarioId;
  passed: boolean;
  commands?: number[];
  detail?: string;
}

export interface MutantEvidence {
  id: (typeof REQUIRED_MUTANTS)[number];
  scenario: ScenarioId;
  phase: "compile" | "test";
  rejection:
    | "compile-error"
    | "test-failure"
    | "unrejected"
    | "infrastructure-error";
  rejected: boolean;
  command?: number;
  detail?: string;
}

export interface ApiReleaseReport {
  reportVersion: 1;
  mode: ApiReleaseMode;
  status: "passed" | "product-error" | "infrastructure-error";
  fixture: FixtureEvidence;
  toolchain: ToolchainEvidence | null;
  commands: CommandEvidence[];
  scenarios: ScenarioEvidence[];
  mutants: MutantEvidence[];
  error?: { kind: "product" | "infrastructure"; message: string };
}

export class InfrastructureError extends Error {
  readonly kind = "infrastructure" as const;
}

export class ProductError extends Error {
  readonly kind = "product" as const;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tail(value: string): string {
  return value.length <= MAX_OUTPUT_CHARS
    ? value
    : value.slice(value.length - MAX_OUTPUT_CHARS);
}

function errorCode(error: unknown): string | undefined {
  const value = error as { code?: unknown } | undefined;
  return typeof value?.code === "string" ? value.code : undefined;
}

function version(path: string, expectedName: string): string {
  const result = spawnSync(path, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new InfrastructureError(
      `Unable to read ${expectedName} version: ${result.stderr ?? result.error?.message ?? "unknown error"}`,
    );
  }
  const output = result.stdout.trim();
  if (!output.startsWith(`${expectedName} `))
    throw new InfrastructureError(
      `Unexpected ${expectedName} version output: ${output}`,
    );
  return output;
}

function locate(name: string): string {
  const result = spawnSync("which", [name], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  if (result.error || result.status !== 0 || !result.stdout.trim())
    throw new InfrastructureError(
      `Required toolchain executable is unavailable: ${name}`,
    );
  return result.stdout.trim();
}

function rustupPath(tool: string): string {
  const result = spawnSync(
    "rustup",
    ["which", "--toolchain", MSRV, tool],
    { encoding: "utf8", timeout: 10_000, maxBuffer: 16 * 1024 },
  );
  if (result.error || result.status !== 0 || !result.stdout.trim())
    throw new InfrastructureError(
      `Exact Rust ${MSRV} toolchain is unavailable: ${tool}`,
    );
  return result.stdout.trim();
}

interface ToolchainContext extends ToolchainEvidence {
  env: NodeJS.ProcessEnv;
}

export function resolveToolchain(mode: ApiReleaseMode): ToolchainContext {
  const cargoPath = mode === "msrv" ? rustupPath("cargo") : locate("cargo");
  const rustcPath = mode === "msrv" ? rustupPath("rustc") : locate("rustc");
  const rustdocPath = mode === "msrv" ? rustupPath("rustdoc") : locate("rustdoc");
  const cargo = version(cargoPath, "cargo");
  const rustc = version(rustcPath, "rustc");
  const rustdoc = version(rustdocPath, "rustdoc");
  if (mode === "stable" && /nightly|dev|beta/i.test(`${cargo} ${rustc} ${rustdoc}`))
    throw new InfrastructureError("Stable verifier selected a non-stable toolchain");
  if (mode === "msrv" && !rustc.startsWith(`rustc ${MSRV} `))
    throw new InfrastructureError(`Expected exact MSRV rustc ${MSRV}, got ${rustc}`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CARGO_NET_OFFLINE: "true",
    CARGO_TERM_COLOR: "never",
    RUSTC: rustcPath,
    RUSTDOC: rustdocPath,
    PATH: `${dirname(cargoPath)}${delimiter}${process.env.PATH ?? ""}`,
  };
  if (mode === "msrv") env.RUSTUP_TOOLCHAIN = MSRV;
  else delete env.RUSTUP_TOOLCHAIN;
  return {
    requested: mode === "msrv" ? MSRV : "stable",
    cargo,
    rustc,
    rustdoc,
    cargoPath,
    rustcPath,
    rustdocPath,
    env,
  };
}

function fixtureFiles(root = API_RELEASE_FIXTURE_ROOT): FixtureEvidence {
  const files: Array<{ path: string; bytes: number; sha256: string }> = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory).sort()) {
      const absolute = join(directory, entry);
      const stat = statSync(absolute);
      if (stat.isDirectory()) visit(absolute);
      else if (stat.isFile()) {
        const path = relative(root, absolute).replaceAll("\\", "/");
        const bytes = readFileSync(absolute);
        files.push({ path, bytes: bytes.byteLength, sha256: sha256(bytes) });
      }
    }
  }
  visit(root);
  const manifest = files.map((file) => `${file.path}\0${file.sha256}\n`).join("");
  return {
    root: "scripts/fixtures/api-release",
    files,
    sha256: sha256(manifest),
  };
}

export function currentApiReleaseFixture(): FixtureEvidence {
  return fixtureFiles();
}

function combinedOutput(evidence: CommandEvidence): string {
  return `${evidence.stdoutTail}\n${evidence.stderrTail}`;
}

export type MutantRejection =
  | "compile-error"
  | "test-failure"
  | "unrejected"
  | "infrastructure-error";

export function classifyMutantRejection(
  evidence: CommandEvidence,
): MutantRejection {
  if (commandInfrastructure(evidence)) return "infrastructure-error";
  const output = combinedOutput(evidence);
  if (
    evidence.status !== null &&
    evidence.status !== 0 &&
    /error\[E\d+\]|could not compile|aborting due to/.test(output)
  )
    return "compile-error";
  if (
    evidence.status !== null &&
    evidence.status !== 0 &&
    /test result: FAILED\. \d+ passed; \d+ failed;/.test(output)
  )
    return "test-failure";
  return "unrejected";
}

export function isRejectedMutant(evidence: CommandEvidence): boolean {
  const rejection = classifyMutantRejection(evidence);
  return rejection === "compile-error" || rejection === "test-failure";
}

function runCommand(
  toolchain: ToolchainContext,
  cwd: string,
  args: string[],
  commands: CommandEvidence[],
): CommandEvidence {
  if (commands.length >= MAX_COMMANDS)
    throw new InfrastructureError(`Verifier command bound exceeded (${MAX_COMMANDS})`);
  const started = Date.now();
  const result: SpawnSyncReturns<string> = spawnSync(toolchain.cargoPath, args, {
    cwd,
    env: toolchain.env,
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const evidence: CommandEvidence = {
    cwd: cwd.endsWith("/old_consumer") ? "old_consumer" : relative(process.cwd(), cwd).replaceAll("\\", "/") || ".",
    args: [...args],
    status: result.status,
    signal: result.signal,
    timedOut: errorCode(result.error) === "ETIMEDOUT",
    durationMs: Date.now() - started,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
    ...(errorCode(result.error) ? { errorCode: errorCode(result.error) } : {}),
  };
  commands.push(evidence);
  return evidence;
}

function commandInfrastructure(evidence: CommandEvidence): boolean {
  return (
    evidence.status === null ||
    !!evidence.signal ||
    evidence.timedOut ||
    !!evidence.errorCode
  );
}

function passedTests(evidence: CommandEvidence): boolean {
  const match = combinedOutput(evidence).match(/test result: ok\. (\d+) passed;/);
  return evidence.status === 0 && !!match && Number(match[1]) > 0;
}

function replaceOnce(source: string, from: string, to: string, label: string): string {
  const occurrences = source.split(from).length - 1;
  assert.equal(occurrences, 1, `${label} mutation anchor must occur once`);
  return source.replace(from, to);
}

type Mutant = {
  id: (typeof REQUIRED_MUTANTS)[number];
  scenario: ScenarioId;
  phase: "compile" | "test";
  rejection: Exclude<MutantRejection, "unrejected" | "infrastructure-error">;
  description: string;
  apply: (root: string) => void;
};

export const apiReleaseMutants: readonly Mutant[] = [
  {
    id: "removed-legacy-path",
    scenario: "default",
    phase: "compile",
    rejection: "compile-error",
    description: "renames the pre-release public re-export",
    apply(root) {
      const path = join(root, "release_probe/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "pub use PacketView as LegacyView;",
          "pub use PacketView as RenamedLegacyView;",
          "removed legacy path",
        ),
      );
    },
  },
  {
    id: "lost-dyn-compatibility",
    scenario: "default",
    phase: "compile",
    rejection: "compile-error",
    description: "adds Sized to the existing public trait",
    apply(root) {
      const path = join(root, "release_probe/src/lib.rs");
      const source = readFileSync(path, "utf8");
      const withTrait = replaceOnce(
        source,
        "pub trait PacketView {",
        "pub trait PacketView: Sized {",
        "lost dyn compatibility trait",
      );
      writeFileSync(
        path,
        replaceOnce(
          withTrait,
          "impl<T: PacketView + ?Sized> PacketMetrics for T",
          "impl<T: PacketView> PacketMetrics for T",
          "lost dyn compatibility extension",
        ),
      );
    },
  },
  {
    id: "hidden-legacy-path-under-metrics",
    scenario: "no-default-features",
    phase: "compile",
    rejection: "compile-error",
    description: "hides the old path behind the new feature",
    apply(root) {
      const path = join(root, "release_probe/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "pub use PacketView as LegacyView;",
          "#[cfg(feature = \"metrics\")]\npub use PacketView as LegacyView;",
          "feature-gated legacy path",
        ),
      );
    },
  },
  {
    id: "behavior-regression",
    scenario: "default",
    phase: "test",
    rejection: "test-failure",
    description: "changes the bytes observed through the old public trait",
    apply(root) {
      const path = join(root, "release_probe/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "        &self.bytes\n",
          "        &self.bytes[..0]\n",
          "behavior regression payload",
        ),
      );
    },
  },
] as const;

function scenarioFlags(id: ScenarioId): string[] {
  if (id === "no-default-features") return ["--no-default-features"];
  if (id === "metrics") return ["--no-default-features", "--features", "metrics"];
  return [];
}

function runScenario(
  toolchain: ToolchainContext,
  root: string,
  id: ScenarioId,
  commands: CommandEvidence[],
  includeTests: boolean,
): ScenarioEvidence {
  const cwd = join(root, "old_consumer");
  const flags = scenarioFlags(id);
  const check = runCommand(toolchain, cwd, ["check", "--offline", "--locked", ...flags], commands);
  if (commandInfrastructure(check))
    throw new InfrastructureError(`Cargo check infrastructure failure for ${id}`);
  if (check.status !== 0)
    throw new ProductError(`Candidate failed external-client check for ${id}: ${combinedOutput(check)}`);
  const indexes = [commands.length - 1];
  if (includeTests) {
    const test = runCommand(toolchain, cwd, ["test", "--offline", "--locked", ...flags], commands);
    if (commandInfrastructure(test))
      throw new InfrastructureError(`Cargo test infrastructure failure for ${id}`);
    if (!passedTests(test))
      throw new ProductError(`Candidate did not pass external-client tests for ${id}: ${combinedOutput(test)}`);
    indexes.push(commands.length - 1);
  }
  return { id, passed: true, commands: indexes };
}

function runMutants(
  toolchain: ToolchainContext,
  root: string,
  commands: CommandEvidence[],
): MutantEvidence[] {
  const records: MutantEvidence[] = [];
  for (const mutant of apiReleaseMutants) {
    const mutantRoot = mkdtempSync(join(dirname(root), "api-release-mutant-"));
    try {
      cpSync(API_RELEASE_FIXTURE_ROOT, mutantRoot, { recursive: true });
      mutant.apply(mutantRoot);
      const evidence = runCommand(
        toolchain,
        join(mutantRoot, "old_consumer"),
        [
          mutant.phase === "test" ? "test" : "check",
          "--offline",
          "--locked",
          ...scenarioFlags(mutant.scenario),
        ],
        commands,
      );
      if (commandInfrastructure(evidence))
        throw new InfrastructureError(`Mutant ${mutant.id} did not produce a bounded result`);
      const rejection = classifyMutantRejection(evidence);
      const rejected = rejection === mutant.rejection;
      records.push({
        id: mutant.id,
        scenario: mutant.scenario,
        phase: mutant.phase,
        rejection,
        rejected,
        command: commands.length - 1,
        detail: mutant.description,
      });
      if (!rejected)
        throw new ProductError(`Controlled mutant was accepted: ${mutant.id}`);
    } finally {
      rmSync(mutantRoot, { recursive: true, force: true });
    }
  }
  return records;
}

function successfulCommand(
  evidence: CommandEvidence,
  expectedArgs: string[],
): boolean {
  return (
    evidence.cwd === "old_consumer" &&
    JSON.stringify(evidence.args) === JSON.stringify(expectedArgs) &&
    evidence.status === 0 &&
    evidence.signal === null &&
    !evidence.timedOut &&
    !evidence.errorCode
  );
}

export function validateApiReleaseReport(value: unknown): asserts value is ApiReleaseReport {
  if (!value || typeof value !== "object")
    throw new Error("API release report must be an object");
  const report = value as Partial<ApiReleaseReport>;
  if (report.reportVersion !== 1)
    throw new Error("Unsupported API release report version");
  if (report.mode !== "stable" && report.mode !== "msrv")
    throw new Error("Invalid API release report mode");
  if (!report.fixture || report.fixture.root !== "scripts/fixtures/api-release")
    throw new Error("Report fixture provenance is invalid");
  if (!/^[0-9a-f]{64}$/.test(report.fixture.sha256))
    throw new Error("Report fixture hash is invalid");
  if (!Array.isArray(report.fixture.files) || report.fixture.files.length === 0)
    throw new Error("Report fixture file list is empty");
  for (const file of report.fixture.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      file.path.startsWith("/") ||
      file.path.includes("..")
    )
      throw new Error("Report contains an unsafe fixture path");
    if (
      !Number.isInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(file.sha256)
    )
      throw new Error("Report fixture file evidence is invalid");
  }
  if (report.status === "passed") {
    const expectedFixture = currentApiReleaseFixture();
    if (JSON.stringify(report.fixture) !== JSON.stringify(expectedFixture))
      throw new Error("Passed report fixture manifest is stale or forged");
  }
  if (
    !Array.isArray(report.commands) ||
    report.commands.length > MAX_COMMANDS ||
    (report.status === "passed" && report.commands.length === 0)
  )
    throw new Error("Report command evidence is unbounded or missing");
  for (const command of report.commands) {
    if (
      !command ||
      !Array.isArray(command.args) ||
      command.args.length === 0 ||
      command.args.some((arg) => typeof arg !== "string")
    )
      throw new Error("Report command arguments are invalid");
    if (
      !Number.isInteger(command.durationMs) ||
      command.durationMs < 0 ||
      (typeof command.status !== "number" && command.status !== null)
    )
      throw new Error("Report command status evidence is invalid");
    if (
      (typeof command.signal !== "string" && command.signal !== null) ||
      typeof command.timedOut !== "boolean" ||
      typeof command.stdoutTail !== "string" ||
      typeof command.stderrTail !== "string" ||
      (command.errorCode !== undefined && typeof command.errorCode !== "string")
    )
      throw new Error("Report command lifecycle evidence is invalid");
    if (
      !/^[0-9a-f]{64}$/.test(command.stdoutSha256) ||
      !/^[0-9a-f]{64}$/.test(command.stderrSha256)
    )
      throw new Error("Report command hashes are invalid");
    if (
      command.stdoutTail.length > MAX_OUTPUT_CHARS ||
      command.stderrTail.length > MAX_OUTPUT_CHARS
    )
      throw new Error("Report command output exceeds bound");
  }
  if (!Array.isArray(report.scenarios) || !Array.isArray(report.mutants))
    throw new Error("Report matrix evidence is missing");
  if (report.status === "passed") {
    const scenarios = report.scenarios;
    const mutants = report.mutants;
    const commands = report.commands;
    const toolchain = report.toolchain;
    if (
      !toolchain ||
      Object.values(toolchain).some(
        (field) => typeof field !== "string" || field.length === 0,
      ) ||
      toolchain.requested !== (report.mode === "msrv" ? MSRV : "stable")
    )
      throw new Error("Passed report toolchain mode is missing or incorrect");
    if (
      report.mode === "msrv" &&
      (!toolchain.cargo.startsWith(`cargo ${MSRV} `) ||
        !toolchain.rustc.startsWith(`rustc ${MSRV} `) ||
        !toolchain.rustdoc.startsWith(`rustdoc ${MSRV} `))
    )
      throw new Error(`Passed MSRV report does not prove exact Rust ${MSRV}`);
    if (
      report.mode === "stable" &&
      /nightly|dev|beta/i.test(
        `${toolchain.cargo} ${toolchain.rustc} ${toolchain.rustdoc}`,
      )
    )
      throw new Error("Passed stable report contains a non-stable toolchain");
    if (report.error)
      throw new Error("Passed report cannot contain an error record");
    if (
      scenarios.length !== 3 ||
      new Set(scenarios.map((scenario) => scenario.id)).size !== 3 ||
      (["default", "no-default-features", "metrics"] as ScenarioId[]).some(
        (id) => !scenarios.some((scenario) => scenario.id === id),
      ) ||
      scenarios.some((scenario) => scenario.passed !== true)
    )
      throw new Error("Passed report is missing successful feature matrix evidence");

    const references: number[] = [];
    for (const scenario of scenarios) {
      if (
        !Array.isArray(scenario.commands) ||
        scenario.commands.length !== 2 ||
        scenario.commands.some(
          (index) => !Number.isInteger(index) || index < 0 || index >= commands.length,
        )
      )
        throw new Error(`Scenario ${scenario.id} is missing check/test command evidence`);
      const [checkIndex, testIndex] = scenario.commands;
      if (checkIndex === testIndex)
        throw new Error(`Scenario ${scenario.id} reuses one command for check and test`);
      const expectedFlags = scenarioFlags(scenario.id);
      const check = commands[checkIndex];
      const test = commands[testIndex];
      if (
        !successfulCommand(check, ["check", "--offline", "--locked", ...expectedFlags]) ||
        !successfulCommand(test, ["test", "--offline", "--locked", ...expectedFlags]) ||
        !passedTests(test)
      )
        throw new Error(`Scenario ${scenario.id} does not contain successful check/test evidence`);
      references.push(checkIndex, testIndex);
    }

    if (mutants.length !== REQUIRED_MUTANTS.length)
      throw new Error("Report does not contain exactly the controlled mutants");
    const mutantIds = new Set<string>();
    for (const expected of apiReleaseMutants) {
      const mutant = mutants.find((candidate) => candidate.id === expected.id);
      if (!mutant || mutantIds.has(expected.id))
        throw new Error(`Mutant ${expected.id} is missing or duplicated`);
      mutantIds.add(expected.id);
      if (mutant.rejected !== true)
        throw new Error(`Mutant ${expected.id} was not rejected`);
      const mutantCommand = mutant.command;
      if (
        mutant.scenario !== expected.scenario ||
        mutant.phase !== expected.phase ||
        mutant.rejection !== expected.rejection ||
        typeof mutantCommand !== "number" ||
        !Number.isInteger(mutantCommand) ||
        mutantCommand < 0 ||
        mutantCommand >= commands.length
      )
        throw new Error(`Mutant ${expected.id} is missing command evidence`);
      const command = commands[mutantCommand];
      if (
        command.cwd !== "old_consumer" ||
        JSON.stringify(command.args) !==
          JSON.stringify([
            expected.phase === "test" ? "test" : "check",
            "--offline",
            "--locked",
            ...scenarioFlags(expected.scenario),
          ]) ||
        classifyMutantRejection(command) !== expected.rejection
      )
        throw new Error(`Mutant ${expected.id} lacks the expected bounded rejection`);
      references.push(mutantCommand);
    }
    const sortedReferences = [...references].sort((left, right) => left - right);
    if (
      sortedReferences.length !== commands.length ||
      sortedReferences.some((index, position) => index !== position)
    )
      throw new Error("Passed report command references have duplicate or missing indices");
  } else if (
    report.status !== "product-error" &&
    report.status !== "infrastructure-error"
  ) {
    throw new Error("Invalid API release report status");
  }
}

function reportPath(mode: ApiReleaseMode): string {
  return join(process.cwd(), "test-results/api-release", mode, "report.json");
}

function writeReport(mode: ApiReleaseMode, report: ApiReleaseReport): void {
  const path = reportPath(mode);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
}

export function runApiReleaseVerification(
  mode: ApiReleaseMode,
  options: { writeReport?: boolean } = {},
): ApiReleaseReport {
  const report: ApiReleaseReport = {
    reportVersion: 1,
    mode,
    status: "infrastructure-error",
    fixture: fixtureFiles(),
    toolchain: null,
    commands: [],
    scenarios: [],
    mutants: [],
  };
  let temporaryRoot: string | undefined;
  try {
    const toolchain = resolveToolchain(mode);
    report.toolchain = {
      requested: toolchain.requested,
      cargo: toolchain.cargo,
      rustc: toolchain.rustc,
      rustdoc: toolchain.rustdoc,
      cargoPath: toolchain.cargoPath,
      rustcPath: toolchain.rustcPath,
      rustdocPath: toolchain.rustdocPath,
    };
    const root = mkdtempSync(join(tmpdir(), `api-release-${mode}-`));
    temporaryRoot = root;
    cpSync(API_RELEASE_FIXTURE_ROOT, root, { recursive: true });
    for (const id of ["default", "no-default-features", "metrics"] as const)
      report.scenarios.push(runScenario(toolchain, root, id, report.commands, true));
    report.mutants = runMutants(toolchain, root, report.commands);
    report.status = "passed";
  } catch (error) {
    const isInfrastructure = error instanceof InfrastructureError;
    report.status = isInfrastructure ? "infrastructure-error" : "product-error";
    report.error = {
      kind: isInfrastructure ? "infrastructure" : "product",
      message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    };
  } finally {
    if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  }
  validateApiReleaseReport(report);
  if (options.writeReport !== false) writeReport(mode, report);
  return report;
}
