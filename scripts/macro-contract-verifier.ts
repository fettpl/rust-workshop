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

export type MacroContractMode = "stable" | "msrv";
export type MacroContractScenario = "external-client";
export type MacroMutantId =
  | "unqualified-crate-path"
  | "duplicate-evaluation"
  | "strict-entry-grammar"
  | "expr-2021-fragment";
export type MacroMutantRejection =
  "compile-error" | "test-failure" | "unrejected" | "infrastructure-error";

const MSRV = "1.85.0";
const MAX_OUTPUT_CHARS = 2_000;
const COMMAND_TIMEOUT_MS = 45_000;
const MAX_COMMANDS = 12;
const ROOT = dirname(fileURLToPath(import.meta.url));
export const MACRO_CONTRACT_FIXTURE_ROOT = join(
  ROOT,
  "fixtures/macro-contracts",
);

const REQUIRED_MUTANTS: readonly MacroMutantId[] = [
  "unqualified-crate-path",
  "duplicate-evaluation",
  "strict-entry-grammar",
  "expr-2021-fragment",
];

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
  root: "scripts/fixtures/macro-contracts";
  files: Array<{ path: string; bytes: number; sha256: string }>;
  sha256: string;
}

export interface ScenarioEvidence {
  id: MacroContractScenario;
  passed: boolean;
  commands?: number[];
  detail?: string;
}

export interface MutantEvidence {
  id: MacroMutantId;
  scenario: MacroContractScenario;
  phase: "compile" | "test";
  rejection: MacroMutantRejection;
  rejected: boolean;
  command?: number;
  detail?: string;
}

export interface MacroContractReport {
  reportVersion: 1;
  mode: MacroContractMode;
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
  const candidate = error as { code?: unknown } | undefined;
  return typeof candidate?.code === "string" ? candidate.code : undefined;
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
  const result = spawnSync("rustup", ["which", "--toolchain", MSRV, tool], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  if (result.error || result.status !== 0 || !result.stdout.trim())
    throw new InfrastructureError(
      `Exact Rust ${MSRV} toolchain is unavailable: ${tool}`,
    );
  return result.stdout.trim();
}

function version(path: string, name: string): string {
  const result = spawnSync(path, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new InfrastructureError(
      `Unable to read ${name} version: ${result.stderr ?? result.error?.message ?? "unknown error"}`,
    );
  const output = result.stdout.trim();
  if (!output.startsWith(`${name} `))
    throw new InfrastructureError(
      `Unexpected ${name} version output: ${output}`,
    );
  return output;
}

interface ToolchainContext extends ToolchainEvidence {
  env: NodeJS.ProcessEnv;
}

export function resolveMacroToolchain(
  mode: MacroContractMode,
): ToolchainContext {
  const cargoPath = mode === "msrv" ? rustupPath("cargo") : locate("cargo");
  const rustcPath = mode === "msrv" ? rustupPath("rustc") : locate("rustc");
  const rustdocPath =
    mode === "msrv" ? rustupPath("rustdoc") : locate("rustdoc");
  const cargo = version(cargoPath, "cargo");
  const rustc = version(rustcPath, "rustc");
  const rustdoc = version(rustdocPath, "rustdoc");
  if (
    mode === "stable" &&
    /nightly|dev|beta/i.test(`${cargo} ${rustc} ${rustdoc}`)
  )
    throw new InfrastructureError(
      "Stable verifier selected a non-stable toolchain",
    );
  if (mode === "msrv" && !rustc.startsWith(`rustc ${MSRV} `))
    throw new InfrastructureError(
      `Expected exact MSRV rustc ${MSRV}, got ${rustc}`,
    );

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

function fixtureFiles(root = MACRO_CONTRACT_FIXTURE_ROOT): FixtureEvidence {
  const files: Array<{ path: string; bytes: number; sha256: string }> = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory).sort()) {
      if (entry === "target") continue;
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
  const manifest = files
    .map((file) => `${file.path}\0${file.sha256}\n`)
    .join("");
  return {
    root: "scripts/fixtures/macro-contracts",
    files,
    sha256: sha256(manifest),
  };
}

export function currentMacroContractFixture(): FixtureEvidence {
  return fixtureFiles();
}

function combinedOutput(evidence: CommandEvidence): string {
  return `${evidence.stdoutTail}\n${evidence.stderrTail}`;
}

function commandInfrastructure(evidence: CommandEvidence): boolean {
  return (
    evidence.status === null ||
    evidence.signal !== null ||
    evidence.timedOut ||
    !!evidence.errorCode
  );
}

export function classifyMacroMutant(
  evidence: CommandEvidence,
  expected?: MacroMutantId,
): MacroMutantRejection {
  if (commandInfrastructure(evidence)) return "infrastructure-error";
  const output = combinedOutput(evidence);
  if (
    evidence.status !== null &&
    evidence.status !== 0 &&
    /test result: FAILED\. \d+ passed; \d+ failed;/.test(output)
  )
    return "test-failure";
  if (evidence.status !== null && evidence.status !== 0) {
    const compileDiagnostic =
      expected === "strict-entry-grammar"
        ? /no rules expected [`',)]|unexpected end of macro invocation/.test(
            output,
          )
        : expected === "expr-2021-fragment"
          ? /no rules expected keyword [`']const/.test(output)
          : expected === "unqualified-crate-path"
            ? /error\[E\d{4}\]:/.test(output)
            : /error\[E\d{4}\]:|no rules expected|unexpected end of macro invocation/.test(
                output,
              );
    if (compileDiagnostic) return "compile-error";
  }
  return "unrejected";
}

function passedTests(evidence: CommandEvidence): boolean {
  const match = combinedOutput(evidence).match(
    /test result: ok\. (\d+) passed;/,
  );
  return evidence.status === 0 && !!match && Number(match[1]) > 0;
}

function runCommand(
  toolchain: ToolchainContext,
  fixtureRoot: string,
  cwd: string,
  args: string[],
  commands: CommandEvidence[],
): CommandEvidence {
  if (commands.length >= MAX_COMMANDS)
    throw new InfrastructureError(
      `Verifier command bound exceeded (${MAX_COMMANDS})`,
    );
  const started = Date.now();
  const result: SpawnSyncReturns<string> = spawnSync(
    toolchain.cargoPath,
    args,
    {
      cwd,
      env: toolchain.env,
      encoding: "utf8",
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const evidence: CommandEvidence = {
    cwd: relative(fixtureRoot, cwd).replaceAll("\\", "/") || ".",
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

function replaceOnce(
  source: string,
  from: string,
  to: string,
  label: string,
): string {
  const occurrences = source.split(from).length - 1;
  assert.equal(occurrences, 1, `${label} mutation anchor must occur once`);
  return source.replace(from, to);
}

type Mutant = {
  id: MacroMutantId;
  scenario: MacroContractScenario;
  phase: "compile" | "test";
  rejection: Exclude<
    MacroMutantRejection,
    "unrejected" | "infrastructure-error"
  >;
  description: string;
  apply: (root: string) => void;
};

export const macroContractMutants: readonly Mutant[] = [
  {
    id: "unqualified-crate-path",
    scenario: "external-client",
    phase: "compile",
    rejection: "compile-error",
    description:
      "removes the library crate qualification from the constructor path",
    apply(root) {
      const path = join(root, "macro_contracts/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "$crate::Reading::new($name, $value)",
          "Reading::new($name, $value)",
          "unqualified crate path",
        ),
      );
    },
  },
  {
    id: "duplicate-evaluation",
    scenario: "external-client",
    phase: "test",
    rejection: "test-failure",
    description: "expands each supplied value expression twice",
    apply(root) {
      const path = join(root, "macro_contracts/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "$crate::Reading::new($name, $value)",
          "$crate::Reading::new($name, { $value; $value })",
          "duplicate evaluation",
        ),
      );
    },
  },
  {
    id: "strict-entry-grammar",
    scenario: "external-client",
    phase: "compile",
    rejection: "compile-error",
    description:
      "requires one or more entries and removes the optional trailing comma",
    apply(root) {
      const path = join(root, "macro_contracts/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "=> $value:expr ),* $(,)?) => {{",
          "=> $value:expr ),+ ) => {{",
          "strict entry grammar",
        ),
      );
    },
  },
  {
    id: "expr-2021-fragment",
    scenario: "external-client",
    phase: "compile",
    rejection: "compile-error",
    description: "uses the pre-2024 expression fragment matcher",
    apply(root) {
      const path = join(root, "macro_contracts/src/lib.rs");
      const source = readFileSync(path, "utf8");
      writeFileSync(
        path,
        replaceOnce(
          source,
          "$value:expr",
          "$value:expr_2021",
          "expr 2021 fragment",
        ),
      );
    },
  },
] as const;

function runScenario(
  toolchain: ToolchainContext,
  root: string,
  commands: CommandEvidence[],
): ScenarioEvidence {
  const cwd = join(root, "external_consumer");
  const check = runCommand(
    toolchain,
    root,
    cwd,
    ["check", "--offline", "--locked"],
    commands,
  );
  if (commandInfrastructure(check))
    throw new InfrastructureError(
      "External macro client check infrastructure failure",
    );
  if (check.status !== 0)
    throw new ProductError(
      `External macro client check failed: ${combinedOutput(check)}`,
    );
  const test = runCommand(
    toolchain,
    root,
    cwd,
    ["test", "--offline", "--locked"],
    commands,
  );
  if (commandInfrastructure(test))
    throw new InfrastructureError(
      "External macro client test infrastructure failure",
    );
  if (!passedTests(test))
    throw new ProductError(
      `External macro client tests failed: ${combinedOutput(test)}`,
    );
  return {
    id: "external-client",
    passed: true,
    commands: [commands.length - 2, commands.length - 1],
  };
}

function runMutants(
  toolchain: ToolchainContext,
  commands: CommandEvidence[],
): MutantEvidence[] {
  const records: MutantEvidence[] = [];
  for (const mutant of macroContractMutants) {
    const mutantRoot = mkdtempSync(join(tmpdir(), "macro-contract-mutant-"));
    try {
      cpSync(MACRO_CONTRACT_FIXTURE_ROOT, mutantRoot, { recursive: true });
      mutant.apply(mutantRoot);
      const evidence = runCommand(
        toolchain,
        mutantRoot,
        join(mutantRoot, "external_consumer"),
        [mutant.phase === "test" ? "test" : "check", "--offline", "--locked"],
        commands,
      );
      if (commandInfrastructure(evidence))
        throw new InfrastructureError(
          `Mutant ${mutant.id} did not produce a bounded result`,
        );
      const rejection = classifyMacroMutant(evidence, mutant.id);
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

function successfulCommand(evidence: CommandEvidence, args: string[]): boolean {
  return (
    evidence.cwd === "external_consumer" &&
    JSON.stringify(evidence.args) === JSON.stringify(args) &&
    evidence.status === 0 &&
    evidence.signal === null &&
    !evidence.timedOut &&
    !evidence.errorCode
  );
}

export function validateMacroContractReport(
  value: unknown,
): asserts value is MacroContractReport {
  if (!value || typeof value !== "object")
    throw new Error("Macro contract report must be an object");
  const report = value as Partial<MacroContractReport>;
  if (report.reportVersion !== 1)
    throw new Error("Unsupported macro contract report version");
  if (report.mode !== "stable" && report.mode !== "msrv")
    throw new Error("Invalid macro contract report mode");
  if (
    !report.fixture ||
    report.fixture.root !== "scripts/fixtures/macro-contracts"
  )
    throw new Error("Report fixture provenance is invalid");
  if (!/^[0-9a-f]{64}$/.test(report.fixture.sha256))
    throw new Error("Report fixture hash is invalid");
  if (!Array.isArray(report.fixture.files) || report.fixture.files.length === 0)
    throw new Error("Report fixture file list is empty");
  const seenFiles = new Set<string>();
  for (const file of report.fixture.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      file.path.startsWith("/") ||
      file.path.includes("..") ||
      seenFiles.has(file.path)
    )
      throw new Error("Report contains an unsafe or duplicate fixture path");
    seenFiles.add(file.path);
    if (
      !Number.isInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(file.sha256)
    )
      throw new Error("Report fixture file evidence is invalid");
  }
  if (report.status === "passed") {
    const expected = currentMacroContractFixture();
    if (JSON.stringify(report.fixture) !== JSON.stringify(expected))
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
      !/^[0-9a-f]{64}$/.test(command.stderrSha256) ||
      command.stdoutTail.length > MAX_OUTPUT_CHARS ||
      command.stderrTail.length > MAX_OUTPUT_CHARS
    )
      throw new Error("Report command output or hashes are invalid");
  }
  if (!Array.isArray(report.scenarios) || !Array.isArray(report.mutants))
    throw new Error("Report matrix evidence is missing");
  if (report.status !== "passed") {
    if (
      report.status !== "product-error" &&
      report.status !== "infrastructure-error"
    )
      throw new Error("Invalid macro contract report status");
    return;
  }

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
    report.scenarios.length !== 1 ||
    report.scenarios[0].id !== "external-client" ||
    report.scenarios[0].passed !== true ||
    !Array.isArray(report.scenarios[0].commands) ||
    report.scenarios[0].commands.length !== 2
  )
    throw new Error(
      "Passed report is missing external-client check/test evidence",
    );
  const references: number[] = [];
  const [checkIndex, testIndex] = report.scenarios[0].commands;
  if (
    !Number.isInteger(checkIndex) ||
    !Number.isInteger(testIndex) ||
    checkIndex === testIndex ||
    checkIndex < 0 ||
    testIndex < 0 ||
    checkIndex >= report.commands.length ||
    testIndex >= report.commands.length ||
    !successfulCommand(report.commands[checkIndex], [
      "check",
      "--offline",
      "--locked",
    ]) ||
    !successfulCommand(report.commands[testIndex], [
      "test",
      "--offline",
      "--locked",
    ]) ||
    !passedTests(report.commands[testIndex])
  )
    throw new Error(
      "External-client scenario does not contain successful check/test evidence",
    );
  references.push(checkIndex, testIndex);

  if (report.mutants.length !== REQUIRED_MUTANTS.length)
    throw new Error("Report does not contain exactly the controlled mutants");
  const seenMutants = new Set<MacroMutantId>();
  for (const expected of macroContractMutants) {
    const mutant = report.mutants.find(
      (candidate) => candidate.id === expected.id,
    );
    if (!mutant || seenMutants.has(expected.id))
      throw new Error(`Mutant ${expected.id} is missing or duplicated`);
    seenMutants.add(expected.id);
    const commandIndex = mutant?.command;
    if (
      mutant.rejected !== true ||
      mutant.scenario !== expected.scenario ||
      mutant.phase !== expected.phase ||
      mutant.rejection !== expected.rejection ||
      typeof commandIndex !== "number" ||
      !Number.isInteger(commandIndex) ||
      commandIndex < 0 ||
      commandIndex >= report.commands.length
    )
      throw new Error(
        `Mutant ${expected.id} is missing expected rejection evidence`,
      );
    const command = report.commands[commandIndex];
    if (
      command.cwd !== "external_consumer" ||
      JSON.stringify(command.args) !==
        JSON.stringify([
          expected.phase === "test" ? "test" : "check",
          "--offline",
          "--locked",
        ]) ||
      classifyMacroMutant(command, expected.id) !== expected.rejection
    )
      throw new Error(
        `Mutant ${expected.id} lacks the expected bounded rejection`,
      );
    references.push(commandIndex);
  }
  const sortedReferences = [...references].sort((left, right) => left - right);
  if (
    sortedReferences.length !== report.commands.length ||
    sortedReferences.some((index, position) => index !== position) ||
    new Set(references).size !== references.length
  )
    throw new Error(
      "Passed report command references have duplicate or missing indices",
    );
}

function reportPath(mode: MacroContractMode): string {
  return join(
    process.cwd(),
    "test-results/macro-contracts",
    mode,
    "report.json",
  );
}

function writeReport(
  mode: MacroContractMode,
  report: MacroContractReport,
): void {
  const path = reportPath(mode);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
}

export function runMacroContractVerification(
  mode: MacroContractMode,
  options: { writeReport?: boolean } = {},
): MacroContractReport {
  const report: MacroContractReport = {
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
    const toolchain = resolveMacroToolchain(mode);
    report.toolchain = {
      requested: toolchain.requested,
      cargo: toolchain.cargo,
      rustc: toolchain.rustc,
      rustdoc: toolchain.rustdoc,
      cargoPath: toolchain.cargoPath,
      rustcPath: toolchain.rustcPath,
      rustdocPath: toolchain.rustdocPath,
    };
    const root = mkdtempSync(join(tmpdir(), `macro-contracts-${mode}-`));
    temporaryRoot = root;
    cpSync(MACRO_CONTRACT_FIXTURE_ROOT, root, { recursive: true });
    report.scenarios.push(runScenario(toolchain, root, report.commands));
    report.mutants = runMutants(toolchain, report.commands);
    report.status = "passed";
  } catch (error) {
    const infrastructure = error instanceof InfrastructureError;
    report.status = infrastructure ? "infrastructure-error" : "product-error";
    report.error = {
      kind: infrastructure ? "infrastructure" : "product",
      message:
        error instanceof Error
          ? error.message.slice(0, 500)
          : String(error).slice(0, 500),
    };
  } finally {
    if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  }
  validateMacroContractReport(report);
  if (options.writeReport !== false) writeReport(mode, report);
  return report;
}
