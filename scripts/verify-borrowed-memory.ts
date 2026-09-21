import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { appendHiddenTests } from "../src/runner";
import {
  unsafeBorrowedMemoryAssessmentFixtures,
  unsafeBorrowedMemoryCompileFailFixtures,
} from "../src/content/unsafe-borrowed-memory-assessment-fixtures";
import { invariantVarianceMutant } from "../src/content/unsafe-borrowed-memory-contracts";

export type BorrowedMemoryMode = "stable" | "msrv" | "miri";
export type BorrowedMemoryPhaseStatus =
  "pending" | "passed" | "failed" | "infrastructure";
export interface BorrowedMemoryReport {
  schemaVersion: 1;
  runId: string;
  mode: BorrowedMemoryMode;
  toolchain: string;
  compilerVersion: string;
  budgets: {
    compileTimeoutMs: number;
    testTimeoutMs: number;
    miriTimeoutMs: number;
    maxSubprocesses: number;
  };
  executionCount: number;
  budgetUsedMs: number;
  sourceHashes: Record<string, string>;
  fixtureHashes: Record<string, string>;
  phaseStatuses: Record<string, BorrowedMemoryPhaseStatus>;
  phaseErrors: string[];
  compileFailChecks: { id: string; status: BorrowedMemoryPhaseStatus }[];
  miriChecks: {
    id: string;
    status: BorrowedMemoryPhaseStatus;
    diagnostic?: string;
    command: string[];
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: string | null;
    source: string;
    sourceHash: string;
    authoredSourceHash: string;
    manifestPath: string;
    manifest: string;
    manifestHash: string;
    tooling: {
      rustfmt: CommandEvidence;
      cargoFmt: CommandEvidence;
      cargoClippy: CommandEvidence;
    };
  }[];
  artifactPaths: string[];
  artifactHashes: Record<string, string>;
  limitations: string[];
  status: BorrowedMemoryPhaseStatus;
}

const MIRI_TOOLCHAIN = "nightly-2026-08-08";
const MSRV_TOOLCHAIN = "1.85.0";
const MIRI_MANIFEST =
  '[package]\nname = "borrowed_memory_fixture"\nversion = "0.1.0"\nedition = "2024"\n';
type CommandEvidence = {
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  status: BorrowedMemoryPhaseStatus;
};
const REQUIRED_PHASES = ["compile", "tests", "report"] as const;
const BUDGETS = {
  compileTimeoutMs: 120_000,
  testTimeoutMs: 8_000,
  miriTimeoutMs: 60_000,
  // The safe matrix currently executes 145 bounded commands (including
  // rustfmt, rustc, test binaries, compiler-version probes, and compile-fail
  // clients). Keep headroom for toolchain probes while retaining a hard cap.
  maxSubprocesses: 192,
} as const;
const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
let executionCount = 0;
let budgetUsedMs = 0;
let executionDeadline = 0;

export function parseBorrowedMemoryMode(args: string[]): BorrowedMemoryMode {
  if (args.length === 0) return "stable";
  if (args.length !== 1 || !["--msrv", "--miri"].includes(args[0]))
    throw new Error(
      "Only no arguments, --msrv, or --miri are accepted; paths, --fetch, combinations, and arbitrary toolchains are rejected.",
    );
  return args[0] === "--msrv" ? "msrv" : "miri";
}

function expectedToolchain(mode: BorrowedMemoryMode) {
  return mode === "stable"
    ? "stable"
    : mode === "msrv"
      ? MSRV_TOOLCHAIN
      : MIRI_TOOLCHAIN;
}

type MiriVariant = "canonical" | "equivalent" | "mutant";
type MiriFixture = (typeof unsafeBorrowedMemoryAssessmentFixtures)[number];

/**
 * The source body is authored once here. The same bytes feed the Miri cargo
 * run, the per-check evidence, and the trusted current-source hashes.
 */
function generatedMiriSource(fixture: MiriFixture, variant: MiriVariant) {
  const source =
    variant === "canonical"
      ? fixture.canonical
      : variant === "equivalent"
        ? fixture.equivalent
        : fixture.mutant;
  const hasOwnMain =
    fixture.id.includes("alias") || fixture.id.includes("wrapped-range");
  const body = hasOwnMain
    ? ""
    : fixture.id === "raw-borrowed-negative"
      ? "fn main(){let view=unsafe{RawBorrowed::from_raw_parts_unchecked(std::ptr::null(),1)};let _=view.map(|view|view.bytes.len());}"
      : fixture.id === "maybe-uninit-negative"
        ? "fn main(){let slot=MaintainerSlot::<u8>::empty();drop(slot);}"
        : fixture.id === "maybe-uninit-double-drop-negative"
          ? 'fn main(){let mut slot=MaintainerSlot::<String>::empty();slot.put(String::from("live")).unwrap();let _=slot.take();let _=slot.take();}'
          : fixture.id.startsWith("raw-borrowed")
            ? "fn main(){let bytes=[1_u8,2];let view=unsafe{RawBorrowed::from_raw_parts_unchecked(bytes.as_ptr(),2)};let _=view.map(|view|view.bytes.len());}"
            : 'fn main(){let mut slot=MaintainerSlot::<String>::empty();slot.put(String::from("live")).unwrap();let value=slot.take().unwrap();drop(value);slot.put(String::from("drop")).unwrap();}';
  return {
    source,
    body,
    fullSource: `${source}\n${body}\n`,
  };
}

function currentMiriSources() {
  return unsafeBorrowedMemoryAssessmentFixtures
    .filter((fixture) => fixture.mode.startsWith("miri"))
    .flatMap((fixture) => {
      const variants: MiriVariant[] =
        fixture.mode === "miri-positive"
          ? ["canonical", "equivalent"]
          : ["mutant"];
      return variants.map((variant) => {
        const generated = generatedMiriSource(fixture, variant);
        return {
          id: `${fixture.id}:${variant}`,
          source: generated.fullSource,
          sourceHash: sha256(generated.fullSource),
        };
      });
    });
}

export function currentBorrowedMemoryMiriSources() {
  return currentMiriSources().map((entry) => ({
    ...entry,
    manifest: MIRI_MANIFEST,
    manifestHash: sha256(MIRI_MANIFEST),
  }));
}

function assertHashMap(values: Record<string, string>, label: string) {
  if (
    !Object.keys(values).length ||
    Object.values(values).some((value) => !/^[0-9a-f]{64}$/.test(value))
  )
    throw new Error(`${label} must contain SHA-256 values`);
}

function currentAuthoredHashes() {
  const fixtureHashes = Object.fromEntries(
    unsafeBorrowedMemoryAssessmentFixtures.map((fixture) => [
      fixture.id,
      sha256(
        JSON.stringify({
          canonical: fixture.canonical,
          equivalent: fixture.equivalent,
          mutant: fixture.mutant,
          tests: fixture.tests,
          mode: fixture.mode,
          expectedDiagnostic: fixture.expectedDiagnostic ?? null,
          autoTraitNegativeClient: fixture.autoTraitNegativeClient ?? null,
        }),
      ),
    ]),
  );
  const compileFailHashes = Object.fromEntries(
    unsafeBorrowedMemoryCompileFailFixtures.map((fixture) => [
      `compile-fail:${fixture.id}`,
      sha256(JSON.stringify(fixture)),
    ]),
  );
  const allFixtureHashes = { ...fixtureHashes, ...compileFailHashes };
  const miriSourceHashes = Object.fromEntries(
    currentMiriSources().map((entry) => [
      `miri-source:${entry.id}`,
      entry.sourceHash,
    ]),
  );
  const miriManifestHash = sha256(MIRI_MANIFEST);
  return {
    sourceHashes: {
      contracts: sha256(
        JSON.stringify({
          fixtures: allFixtureHashes,
          miriSourceHashes,
          varianceMutant: sha256(invariantVarianceMutant),
        }),
      ),
      "miri-manifest": miriManifestHash,
      ...miriSourceHashes,
    },
    fixtureHashes: allFixtureHashes,
  };
}

export function currentBorrowedMemoryFixtureHashes() {
  return currentAuthoredHashes();
}

export function validateBorrowedMemoryReport(report: BorrowedMemoryReport) {
  if (report.schemaVersion !== 1) throw new Error("unsupported report schema");
  if (!/^[A-Za-z0-9._-]+$/.test(report.runId))
    throw new Error("unsafe run identity");
  if (report.toolchain !== expectedToolchain(report.mode))
    throw new Error("wrong toolchain for mode");
  if (!report.compilerVersion || report.compilerVersion === "pending")
    throw new Error("compiler version was not executed");
  if (
    !report.budgets ||
    Object.values(report.budgets).some(
      (value) => !Number.isInteger(value) || value <= 0,
    )
  )
    throw new Error("invalid execution budgets");
  if (
    !Number.isInteger(report.executionCount) ||
    report.executionCount < 1 ||
    report.executionCount > report.budgets.maxSubprocesses ||
    !Number.isInteger(report.budgetUsedMs) ||
    report.budgetUsedMs < 0 ||
    report.budgetUsedMs >
      report.budgets.compileTimeoutMs +
        report.budgets.testTimeoutMs +
        report.budgets.miriTimeoutMs
  )
    throw new Error("execution count or total budget is invalid");
  assertHashMap(report.sourceHashes, "sourceHashes");
  assertHashMap(report.fixtureHashes, "fixtureHashes");
  const expectedHashes = currentAuthoredHashes();
  if (
    JSON.stringify(report.sourceHashes) !==
      JSON.stringify(expectedHashes.sourceHashes) ||
    JSON.stringify(report.fixtureHashes) !==
      JSON.stringify(expectedHashes.fixtureHashes)
  )
    throw new Error("authored fixture hashes are stale or incomplete");
  if (
    !Array.isArray(report.phaseErrors) ||
    !Array.isArray(report.compileFailChecks) ||
    !Array.isArray(report.miriChecks)
  )
    throw new Error("incomplete report fields");
  if (
    JSON.stringify(Object.keys(report.phaseStatuses).sort()) !==
    JSON.stringify([...REQUIRED_PHASES].sort())
  )
    throw new Error("incomplete phase set");
  const statuses = Object.values(report.phaseStatuses);
  if (
    statuses.some(
      (status) => !["passed", "failed", "infrastructure"].includes(status),
    )
  )
    throw new Error("invalid phase status");
  if (
    report.status === "passed" &&
    (statuses.some((status) => status !== "passed") ||
      report.phaseErrors.length)
  )
    throw new Error("passed report has incomplete phases or errors");
  if (
    report.status === "failed" &&
    (!report.phaseErrors.length || !statuses.includes("failed"))
  )
    throw new Error("failed report lacks failed phase evidence");
  if (
    report.status === "infrastructure" &&
    (!report.phaseErrors.length || !statuses.includes("infrastructure"))
  )
    throw new Error("infrastructure report lacks phase error");
  if (!["passed", "failed", "infrastructure"].includes(report.status))
    throw new Error("invalid report status");
  if (report.artifactPaths.length !== Object.keys(report.artifactHashes).length)
    throw new Error("artifact paths and hashes do not match");
  for (const path of report.artifactPaths) {
    if (path.includes("..")) throw new Error("artifact path escapes run");
    if (report.artifactHashes[path] !== sha256(readFileSync(path)))
      throw new Error(`artifact bytes do not match report: ${path}`);
  }
  for (const [path, digest] of Object.entries(report.artifactHashes))
    if (!/^[0-9a-f]{64}$/.test(digest) || !path)
      throw new Error("invalid artifact provenance");
  const expectedCompileIds: string[] =
    unsafeBorrowedMemoryCompileFailFixtures.map((fixture) => fixture.id);
  if (report.mode === "miri") {
    if (report.compileFailChecks.length)
      throw new Error("Miri report contains non-Miri compile-fail evidence");
  } else if (
    report.compileFailChecks.length !== expectedCompileIds.length ||
    new Set(report.compileFailChecks.map((check) => check.id)).size !==
      expectedCompileIds.length ||
    report.compileFailChecks.some(
      (check) =>
        !expectedCompileIds.includes(check.id) || check.status !== "passed",
    )
  )
    throw new Error("compile-fail evidence is incomplete");
  if (report.mode === "miri") {
    const expectedMiriIds = unsafeBorrowedMemoryAssessmentFixtures
      .filter((fixture) => fixture.mode.startsWith("miri"))
      .flatMap((fixture) =>
        fixture.mode === "miri-positive"
          ? [`${fixture.id}:canonical`, `${fixture.id}:equivalent`]
          : [`${fixture.id}:mutant`],
      );
    const expectedMiriSources = new Map(
      currentMiriSources().map((entry) => [entry.id, entry]),
    );
    if (
      report.miriChecks.length !== expectedMiriIds.length ||
      new Set(report.miriChecks.map((check) => check.id)).size !==
        expectedMiriIds.length ||
      report.miriChecks.some(
        (check) =>
          !expectedMiriIds.includes(check.id) || check.status !== "passed",
      )
    )
      throw new Error("Miri evidence is incomplete");
    if (
      report.miriChecks.some(
        (check) =>
          !Array.isArray(check.command) ||
          typeof check.stdout !== "string" ||
          typeof check.stderr !== "string" ||
          (check.exitCode !== null && !Number.isInteger(check.exitCode)) ||
          (check.signal !== null && typeof check.signal !== "string") ||
          typeof check.source !== "string" ||
          !/^[0-9a-f]{64}$/.test(check.sourceHash) ||
          !/^[0-9a-f]{64}$/.test(check.authoredSourceHash) ||
          sha256(check.source) !== check.sourceHash ||
          expectedMiriSources.get(check.id)?.source !== check.source ||
          expectedMiriSources.get(check.id)?.sourceHash !==
            check.authoredSourceHash ||
          report.sourceHashes[`miri-source:${check.id}`] !==
            check.authoredSourceHash ||
          !check.manifestPath ||
          typeof check.manifest !== "string" ||
          check.manifestHash !== sha256(check.manifest) ||
          check.manifestHash !== report.sourceHashes["miri-manifest"] ||
          !check.tooling ||
          Object.values(check.tooling).some(
            (tooling) =>
              tooling.status !== "passed" ||
              !Array.isArray(tooling.command) ||
              typeof tooling.stdout !== "string" ||
              typeof tooling.stderr !== "string" ||
              (tooling.exitCode !== null &&
                !Number.isInteger(tooling.exitCode)) ||
              (tooling.signal !== null && typeof tooling.signal !== "string"),
          ),
      )
    )
      throw new Error("Miri raw command evidence is incomplete");
  } else if (report.miriChecks.length)
    throw new Error("non-Miri report contains Miri evidence");
  return true;
}

function command(
  executable: string,
  args: string[],
  cwd: string,
  timeout = 120_000,
) {
  if (executionDeadline && Date.now() >= executionDeadline)
    throw new Error("total verifier budget exhausted before subprocess");
  if (executionCount >= BUDGETS.maxSubprocesses)
    throw new Error("maximum verifier subprocess count reached before spawn");
  executionCount += 1;
  const started = Date.now();
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    timeout: executionDeadline
      ? Math.min(timeout, Math.max(1, executionDeadline - started))
      : timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  budgetUsedMs += Date.now() - started;
  if (executionDeadline && Date.now() > executionDeadline)
    throw new Error("total verifier budget exhausted after subprocess");
  return result;
}

function rustcFor(toolchain: string) {
  const located = command(
    "rustup",
    ["which", "--toolchain", toolchain, "rustc"],
    process.cwd(),
    15_000,
  );
  if (located.status !== 0 || located.error)
    throw new Error(
      `toolchain ${toolchain} unavailable: ${located.stderr ?? located.error?.message ?? "unknown"}`,
    );
  return located.stdout.trim();
}

function compileAndRun(
  source: string,
  tests: string,
  rustc: string,
  directory: string,
  id: string,
  shouldPass: boolean,
) {
  const file = join(directory, `${id}.rs`);
  const binary = join(directory, id);
  writeFileSync(file, appendHiddenTests(source, tests));
  const formatted = command(
    "rustfmt",
    ["--edition", "2024", file],
    directory,
    BUDGETS.compileTimeoutMs,
  );
  if (formatted.status !== 0 || formatted.error)
    throw new Error(
      `${id} rustfmt error: ${formatted.stderr ?? formatted.error?.message ?? "unknown"}`,
    );
  const formatCheck = command(
    "rustfmt",
    ["--edition", "2024", "--check", file],
    directory,
    BUDGETS.compileTimeoutMs,
  );
  if (formatCheck.status !== 0 || formatCheck.error)
    throw new Error(
      `${id} rustfmt --check error: ${formatCheck.stderr ?? formatCheck.error?.message ?? "unknown"}`,
    );
  const compiled = command(
    rustc,
    ["--edition=2024", "--test", file, "-o", binary],
    directory,
  );
  if (compiled.status !== 0 || compiled.error)
    throw new Error(
      `${id} compile error: ${compiled.stderr ?? compiled.error?.message ?? "unknown"}`,
    );
  const executed = command(binary, ["--test-threads=1"], directory, 8_000);
  if (shouldPass ? executed.status !== 0 : executed.status === 0)
    throw new Error(`${id} did not meet named test expectation`);
  if (!shouldPass && executed.signal)
    throw new Error(`${id} mutant terminated by signal`);
}

function runSafe(mode: BorrowedMemoryMode, report: BorrowedMemoryReport) {
  const toolchain = expectedToolchain(mode);
  const rustc = rustcFor(toolchain);
  report.compilerVersion = command(
    rustc,
    ["--version"],
    process.cwd(),
  ).stdout.trim();
  const directory = mkdtempSync(join(tmpdir(), "unsafe-borrowed-memory-"));
  try {
    for (const fixture of unsafeBorrowedMemoryAssessmentFixtures.filter(
      (entry) => entry.mode === "safe-behavior",
    )) {
      compileAndRun(
        fixture.canonical,
        fixture.tests,
        rustc,
        directory,
        `${fixture.id}-canonical`,
        true,
      );
      compileAndRun(
        fixture.equivalent,
        fixture.tests,
        rustc,
        directory,
        `${fixture.id}-equivalent`,
        true,
      );
      if (fixture.autoTraitNegativeClient) {
        const canonicalFile = join(
          directory,
          `${fixture.id}-canonical-negative.rs`,
        );
        writeFileSync(
          canonicalFile,
          `${fixture.canonical}\n${fixture.autoTraitNegativeClient}`,
        );
        const canonicalRejected = command(
          rustc,
          ["--edition=2024", canonicalFile],
          directory,
        );
        if (
          canonicalRejected.status === 0 ||
          !/Sync|trait bound/.test(
            `${canonicalRejected.stdout}${canonicalRejected.stderr}`,
          )
        )
          throw new Error(
            `${fixture.id} Cell Sync negative client was accepted`,
          );
        const file = join(directory, `${fixture.id}-mutant.rs`);
        writeFileSync(
          file,
          `${fixture.mutant}\n${fixture.autoTraitNegativeClient}`,
        );
        const leaked = command(rustc, ["--edition=2024", file], directory);
        if (leaked.status !== 0)
          throw new Error(
            `${fixture.id} auto-trait mutant did not expose Sync leakage`,
          );
      } else if (fixture.id === "unsafe-borrowed-reborrow-soundness-gate") {
        const varianceClient = unsafeBorrowedMemoryCompileFailFixtures
          .find((entry) => entry.id === "borrowed-memory-invariant-write")!
          .source.split("\n")
          .at(-1)!;
        const canonical = join(
          directory,
          `${fixture.id}-variance-canonical.rs`,
        );
        const mutant = join(directory, `${fixture.id}-variance-mutant.rs`);
        writeFileSync(canonical, `${fixture.canonical}\n${varianceClient}`);
        writeFileSync(mutant, `${invariantVarianceMutant}\n${varianceClient}`);
        const canonicalRejected = command(
          rustc,
          ["--edition=2024", canonical],
          directory,
        );
        const mutantAccepted = command(
          rustc,
          ["--edition=2024", mutant],
          directory,
        );
        if (canonicalRejected.status === 0 || mutantAccepted.status !== 0)
          throw new Error(
            `${fixture.id} variance mutant was not distinguished`,
          );
      } else
        compileAndRun(
          fixture.mutant,
          fixture.tests,
          rustc,
          directory,
          `${fixture.id}-mutant`,
          false,
        );
    }
    for (const fixture of unsafeBorrowedMemoryCompileFailFixtures) {
      const file = join(directory, `${fixture.id}.rs`);
      writeFileSync(file, fixture.source);
      const result = command(rustc, ["--edition=2024", file], directory);
      if (
        result.status === 0 ||
        !new RegExp(fixture.expectedDiagnostic).test(
          `${result.stdout}${result.stderr}`,
        )
      )
        throw new Error(
          `${fixture.id} compile-fail contract was not rejected by its diagnostic class`,
        );
      report.compileFailChecks.push({ id: fixture.id, status: "passed" });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function runMiri(report: BorrowedMemoryReport) {
  const result = command(
    "rustup",
    ["run", MIRI_TOOLCHAIN, "cargo", "miri", "--version"],
    process.cwd(),
    30_000,
  );
  if (result.status !== 0 || result.error)
    throw new Error(
      `Miri ${MIRI_TOOLCHAIN} unavailable: ${result.stderr ?? result.error?.message ?? "unknown"}`,
    );
  report.compilerVersion = command(
    "rustup",
    ["run", MIRI_TOOLCHAIN, "rustc", "--version"],
    process.cwd(),
    30_000,
  ).stdout.trim();
  const directory = mkdtempSync(join(tmpdir(), "unsafe-borrowed-memory-miri-"));
  try {
    writeFileSync(join(directory, "Cargo.toml"), MIRI_MANIFEST);
    const sourceDir = join(directory, "src");
    mkdirSync(sourceDir, { recursive: true });
    for (const fixture of unsafeBorrowedMemoryAssessmentFixtures.filter(
      (entry) => entry.mode.startsWith("miri"),
    )) {
      const variants =
        fixture.mode === "miri-positive"
          ? (["canonical", "equivalent"] as const)
          : (["mutant"] as const);
      for (const variant of variants) {
        const generated = generatedMiriSource(fixture, variant);
        const sourcePath = join(sourceDir, "main.rs");
        const manifestPath = join(directory, "Cargo.toml");
        writeFileSync(sourcePath, generated.fullSource);
        const toolingDirectory = mkdtempSync(
          join(directory, `tooling-${fixture.id}-${variant}-`),
        );
        const toolingSourceDir = join(toolingDirectory, "src");
        mkdirSync(toolingSourceDir, { recursive: true });
        const toolingManifestPath = join(toolingDirectory, "Cargo.toml");
        const toolingSourcePath = join(toolingSourceDir, "main.rs");
        writeFileSync(toolingManifestPath, MIRI_MANIFEST);
        writeFileSync(toolingSourcePath, generated.fullSource);
        const formatCommand = [
          "rustup",
          "run",
          MIRI_TOOLCHAIN,
          "rustfmt",
          "--edition",
          "2024",
          toolingSourcePath,
        ];
        const formatted = command(
          "rustup",
          formatCommand.slice(1),
          directory,
          BUDGETS.compileTimeoutMs,
        );
        if (formatted.status !== 0 || formatted.error)
          throw new Error(
            `${fixture.id}:${variant} rustfmt error: ${formatted.stderr ?? formatted.error?.message ?? "unknown"}`,
          );
        const formatCheckCommand = [
          ...formatCommand.slice(0, -1),
          "--check",
          toolingSourcePath,
        ];
        const formatCheck = command(
          "rustup",
          formatCheckCommand.slice(1),
          directory,
          BUDGETS.compileTimeoutMs,
        );
        if (formatCheck.status !== 0 || formatCheck.error)
          throw new Error(
            `${fixture.id}:${variant} rustfmt --check error: ${formatCheck.stderr ?? formatCheck.error?.message ?? "unknown"}`,
          );
        const cargoFmtCommand = [
          "rustup",
          "run",
          MIRI_TOOLCHAIN,
          "cargo",
          "fmt",
          "--manifest-path",
          toolingManifestPath,
          "--",
          "--check",
        ];
        const cargoFmt = command(
          "rustup",
          cargoFmtCommand.slice(1),
          directory,
          BUDGETS.compileTimeoutMs,
        );
        const cargoClippyCommand = [
          "rustup",
          "run",
          MIRI_TOOLCHAIN,
          "cargo",
          "clippy",
          "--manifest-path",
          toolingManifestPath,
          "--all-targets",
          "--",
          "-D",
          "warnings",
        ];
        const cargoClippy = command(
          "rustup",
          cargoClippyCommand.slice(1),
          directory,
          BUDGETS.compileTimeoutMs,
        );
        if (
          cargoFmt.status !== 0 ||
          cargoFmt.error ||
          cargoClippy.status !== 0 ||
          cargoClippy.error
        )
          throw new Error(
            `${fixture.id}:${variant} Cargo format/lint failed: ${cargoFmt.stderr ?? cargoClippy.stderr ?? cargoFmt.error?.message ?? cargoClippy.error?.message ?? "unknown"}`,
          );
        const executedSource = readFileSync(sourcePath, "utf8");
        const executed = command(
          "rustup",
          [
            "run",
            MIRI_TOOLCHAIN,
            "cargo",
            "miri",
            "run",
            "--manifest-path",
            manifestPath,
            "--quiet",
          ],
          directory,
          BUDGETS.miriTimeoutMs,
        );
        const output = `${executed.stdout ?? ""}${executed.stderr ?? ""}`;
        const expectedPass = fixture.mode === "miri-positive";
        const passed = expectedPass
          ? executed.status === 0 && !executed.signal && !executed.error
          : executed.status !== 0 &&
            !executed.signal &&
            !executed.error &&
            output.includes(fixture.expectedDiagnostic ?? "") &&
            output.includes("Undefined Behavior");
        if (!passed)
          throw new Error(
            `${fixture.id}:${variant} Miri result did not match ${fixture.expectedDiagnostic ?? "success"}: ${output}`,
          );
        report.miriChecks.push({
          id: `${fixture.id}:${variant}`,
          status: "passed",
          diagnostic: fixture.expectedDiagnostic,
          command: [
            "rustup",
            "run",
            MIRI_TOOLCHAIN,
            "cargo",
            "miri",
            "run",
            "--manifest-path",
            manifestPath,
            "--quiet",
          ],
          stdout: executed.stdout ?? "",
          stderr: executed.stderr ?? "",
          exitCode: executed.status,
          signal: executed.signal ?? null,
          source: executedSource,
          sourceHash: sha256(executedSource),
          authoredSourceHash: sha256(generated.fullSource),
          manifestPath,
          manifest: MIRI_MANIFEST,
          manifestHash: sha256(MIRI_MANIFEST),
          tooling: {
            rustfmt: {
              command: formatCommand,
              stdout: formatted.stdout ?? "",
              stderr: formatted.stderr ?? "",
              exitCode: formatted.status,
              signal: formatted.signal ?? null,
              status: "passed",
            },
            cargoFmt: {
              command: cargoFmtCommand,
              stdout: cargoFmt.stdout ?? "",
              stderr: cargoFmt.stderr ?? "",
              exitCode: cargoFmt.status,
              signal: cargoFmt.signal ?? null,
              status: "passed",
            },
            cargoClippy: {
              command: cargoClippyCommand,
              stdout: cargoClippy.stdout ?? "",
              stderr: cargoClippy.stderr ?? "",
              exitCode: cargoClippy.status,
              signal: cargoClippy.signal ?? null,
              status: "passed",
            },
          },
        });
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function buildBorrowedMemoryReport(
  mode: BorrowedMemoryMode,
): BorrowedMemoryReport {
  const hashes = currentAuthoredHashes();
  return {
    schemaVersion: 1,
    runId: `borrowed-memory-${randomUUID()}`,
    mode,
    toolchain: expectedToolchain(mode),
    compilerVersion: "pending",
    budgets: BUDGETS,
    executionCount: 1,
    budgetUsedMs: 0,
    sourceHashes: hashes.sourceHashes,
    fixtureHashes: hashes.fixtureHashes,
    phaseStatuses: { compile: "pending", tests: "pending", report: "pending" },
    phaseErrors: [],
    compileFailChecks: [],
    miriChecks: [],
    artifactPaths: [],
    artifactHashes: {},
    limitations: [],
    status: "pending",
  };
}

export function runBorrowedMemoryVerification(
  mode: BorrowedMemoryMode,
): BorrowedMemoryReport {
  const report = buildBorrowedMemoryReport(mode);
  executionCount = 0;
  budgetUsedMs = 0;
  executionDeadline =
    Date.now() +
    BUDGETS.compileTimeoutMs +
    BUDGETS.testTimeoutMs +
    BUDGETS.miriTimeoutMs;
  try {
    if (mode === "miri") runMiri(report);
    else runSafe(mode, report);
    report.phaseStatuses = {
      compile: "passed",
      tests: "passed",
      report: "passed",
    };
    report.status = "passed";
  } catch (error) {
    const failureStatus = mode === "miri" ? "infrastructure" : "failed";
    report.phaseStatuses = {
      compile: failureStatus,
      tests: failureStatus,
      report: failureStatus,
    };
    report.phaseErrors.push(
      error instanceof Error ? error.message : String(error),
    );
    report.status = mode === "miri" ? "infrastructure" : "failed";
  }
  report.executionCount = executionCount;
  report.budgetUsedMs = budgetUsedMs;
  try {
    if (report.status === "passed") validateBorrowedMemoryReport(report);
  } catch (error) {
    report.status = "failed";
    report.phaseStatuses.report = "failed";
    report.phaseErrors.push(
      error instanceof Error ? error.message : String(error),
    );
  }
  return report;
}

export function attachBorrowedMemoryEvidenceArtifact(
  report: BorrowedMemoryReport,
  directory: string,
) {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${report.mode}-${report.runId}.log.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        runId: report.runId,
        mode: report.mode,
        compilerVersion: report.compilerVersion,
        phaseStatuses: report.phaseStatuses,
        phaseErrors: report.phaseErrors,
        sourceHashes: report.sourceHashes,
        fixtureHashes: report.fixtureHashes,
        compileFailChecks: report.compileFailChecks,
        miriChecks: report.miriChecks,
        executionCount: report.executionCount,
        budgetUsedMs: report.budgetUsedMs,
      },
      null,
      2,
    ),
  );
  report.artifactPaths = [path];
  report.artifactHashes = { [path]: sha256(readFileSync(path)) };
  return report;
}

if (process.argv[1]?.endsWith("verify-borrowed-memory.ts")) {
  const mode = parseBorrowedMemoryMode(process.argv.slice(2));
  const report = runBorrowedMemoryVerification(mode);
  if (process.env.BORROWED_MEMORY_ARTIFACT_DIR)
    attachBorrowedMemoryEvidenceArtifact(
      report,
      process.env.BORROWED_MEMORY_ARTIFACT_DIR,
    );
  if (report.status === "passed") validateBorrowedMemoryReport(report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === "passed" ? 0 : 1;
}
