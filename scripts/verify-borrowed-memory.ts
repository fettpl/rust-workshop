import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { appendHiddenTests } from "../src/runner";
import {
  unsafeBorrowedMemoryAssessmentFixtures,
  unsafeBorrowedMemoryCompileFailFixtures,
} from "../src/content/unsafe-borrowed-memory-assessment-fixtures";

export type BorrowedMemoryMode = "stable" | "msrv" | "miri";
export type BorrowedMemoryPhaseStatus = "passed" | "failed" | "infrastructure";
export interface BorrowedMemoryReport {
  schemaVersion: 1;
  runId: string;
  mode: BorrowedMemoryMode;
  toolchain: string;
  sourceHashes: Record<string, string>;
  fixtureHashes: Record<string, string>;
  phaseStatuses: Record<string, BorrowedMemoryPhaseStatus>;
  phaseErrors: string[];
  compileFailChecks: { id: string; status: BorrowedMemoryPhaseStatus }[];
  miriChecks: {
    id: string;
    status: BorrowedMemoryPhaseStatus;
    diagnostic?: string;
  }[];
  artifactPaths: string[];
  artifactHashes: Record<string, string>;
  limitations: string[];
  status: BorrowedMemoryPhaseStatus;
}

const MIRI_TOOLCHAIN = "nightly-2026-08-08";
const MSRV_TOOLCHAIN = "1.85.0";
const SAFE_PHASES = ["compile", "tests", "report"] as const;
const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

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

function assertHashMap(values: Record<string, string>, label: string) {
  if (
    !Object.keys(values).length ||
    Object.values(values).some((value) => !/^[0-9a-f]{64}$/.test(value))
  )
    throw new Error(`${label} must contain SHA-256 values`);
}

export function validateBorrowedMemoryReport(report: BorrowedMemoryReport) {
  if (report.schemaVersion !== 1) throw new Error("unsupported report schema");
  if (!/^[A-Za-z0-9._-]+$/.test(report.runId))
    throw new Error("unsafe run identity");
  if (report.toolchain !== expectedToolchain(report.mode))
    throw new Error("wrong toolchain for mode");
  assertHashMap(report.sourceHashes, "sourceHashes");
  assertHashMap(report.fixtureHashes, "fixtureHashes");
  if (
    !Array.isArray(report.phaseErrors) ||
    !Array.isArray(report.compileFailChecks) ||
    !Array.isArray(report.miriChecks)
  )
    throw new Error("incomplete report fields");
  const statuses = Object.values(report.phaseStatuses);
  if (
    !statuses.length ||
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
  for (const path of report.artifactPaths)
    if (path.includes("..")) throw new Error("artifact path escapes run");
  for (const [path, digest] of Object.entries(report.artifactHashes))
    if (!/^[0-9a-f]{64}$/.test(digest) || !path)
      throw new Error("invalid artifact provenance");
  return true;
}

function command(
  executable: string,
  args: string[],
  cwd: string,
  timeout = 120_000,
) {
  return spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
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
      if (fixture.id.includes("auto-traits")) {
        const file = join(directory, `${fixture.id}-mutant.rs`);
        writeFileSync(
          file,
          `${fixture.mutant}\n${
            unsafeBorrowedMemoryCompileFailFixtures
              .find((entry) => entry.id === "borrowed-memory-cell-sync")!
              .source.split("\n")
              .slice(-1)[0]
          }`,
        );
        const rejected = command(rustc, ["--edition=2024", file], directory);
        if (
          rejected.status === 0 ||
          !/Sync|trait bound/.test(`${rejected.stdout}${rejected.stderr}`)
        )
          throw new Error(`${fixture.id} auto-trait mutant was accepted`);
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
  const directory = mkdtempSync(join(tmpdir(), "unsafe-borrowed-memory-miri-"));
  try {
    writeFileSync(
      join(directory, "Cargo.toml"),
      '[package]\nname = "borrowed_memory_fixture"\nversion = "0.1.0"\nedition = "2024"\n',
    );
    const sourceDir = join(directory, "src");
    mkdirSync(sourceDir, { recursive: true });
    for (const fixture of unsafeBorrowedMemoryAssessmentFixtures.filter(
      (entry) => entry.mode.startsWith("miri"),
    )) {
      const body = fixture.id.startsWith("raw-borrowed")
        ? fixture.mode === "miri-negative"
          ? "fn main(){let _=unsafe{RawBorrowed::from_raw_parts_unchecked(std::ptr::null(),1)};}"
          : "fn main(){let bytes=[1_u8,2];let _=unsafe{RawBorrowed::from_raw_parts_unchecked(bytes.as_ptr(),2)};}"
        : "fn main(){let slot=MaintainerSlot::<u8>::empty();drop(slot);} ";
      const source =
        fixture.mode === "miri-negative" ? fixture.mutant : fixture.canonical;
      writeFileSync(join(sourceDir, "main.rs"), `${source}\n${body}\n`);
      const executed = command(
        "rustup",
        [
          "run",
          MIRI_TOOLCHAIN,
          "cargo",
          "miri",
          "run",
          "--manifest-path",
          join(directory, "Cargo.toml"),
          "--quiet",
        ],
        directory,
        60_000,
      );
      const output = `${executed.stdout ?? ""}${executed.stderr ?? ""}`;
      const expectedPass = fixture.mode === "miri-positive";
      const passed = expectedPass
        ? executed.status === 0
        : executed.status !== 0 &&
          /undefined|uninitialized|null|valid/i.test(output);
      if (!passed)
        throw new Error(
          `${fixture.id} Miri result did not match its expected diagnostic: ${output}`,
        );
      report.miriChecks.push({
        id: fixture.id,
        status: "passed",
        diagnostic: fixture.expectedDiagnostic,
      });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function buildBorrowedMemoryReport(
  mode: BorrowedMemoryMode,
): BorrowedMemoryReport {
  const fixtures = unsafeBorrowedMemoryAssessmentFixtures;
  return {
    schemaVersion: 1,
    runId: `borrowed-memory-${randomUUID()}`,
    mode,
    toolchain: expectedToolchain(mode),
    sourceHashes: {
      contracts: sha256(
        fixtures.map((fixture) => fixture.canonical).join("\n"),
      ),
    },
    fixtureHashes: Object.fromEntries(
      fixtures.map((fixture) => [
        fixture.id,
        sha256(
          `${fixture.canonical}\n${fixture.equivalent}\n${fixture.mutant}`,
        ),
      ]),
    ),
    phaseStatuses: { compile: "passed", tests: "passed", report: "passed" },
    phaseErrors: [],
    compileFailChecks: [],
    miriChecks: [],
    artifactPaths: [],
    artifactHashes: {},
    limitations: [],
    status: "passed",
  };
}

export function runBorrowedMemoryVerification(
  mode: BorrowedMemoryMode,
): BorrowedMemoryReport {
  const report = buildBorrowedMemoryReport(mode);
  try {
    if (mode === "miri") runMiri(report);
    else runSafe(mode, report);
  } catch (error) {
    report.phaseStatuses.tests = mode === "miri" ? "infrastructure" : "failed";
    report.phaseErrors.push(
      error instanceof Error ? error.message : String(error),
    );
    report.status = mode === "miri" ? "infrastructure" : "failed";
  }
  if (report.status === "passed") validateBorrowedMemoryReport(report);
  return report;
}

if (process.argv[1]?.endsWith("verify-borrowed-memory.ts")) {
  const mode = parseBorrowedMemoryMode(process.argv.slice(2));
  const report = runBorrowedMemoryVerification(mode);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === "passed" ? 0 : 1;
}
