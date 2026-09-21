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
const MIRI_BODY_CONTRACT =
  "raw-valid;raw-null-range;raw-alias;raw-wrapped-range;maybe-put-take-drop;maybe-uninitialized;maybe-double-drop";
const REQUIRED_PHASES = ["compile", "tests", "report"] as const;
const BUDGETS = {
  compileTimeoutMs: 120_000,
  testTimeoutMs: 8_000,
  miriTimeoutMs: 60_000,
  maxSubprocesses: 64,
} as const;
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
  return {
    sourceHashes: {
      contracts: sha256(
        JSON.stringify({
          fixtures: allFixtureHashes,
          miriBodyContract: MIRI_BODY_CONTRACT,
        }),
      ),
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
    writeFileSync(
      join(directory, "Cargo.toml"),
      '[package]\nname = "borrowed_memory_fixture"\nversion = "0.1.0"\nedition = "2024"\n',
    );
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
            ? "fn main(){let _=unsafe{RawBorrowed::from_raw_parts_unchecked(std::ptr::null(),1)};}"
            : fixture.id === "maybe-uninit-negative"
              ? "fn main(){let slot=MaintainerSlot::<u8>::empty();drop(slot);}"
              : fixture.id === "maybe-uninit-double-drop-negative"
                ? 'fn main(){let mut slot=MaintainerSlot::<String>::empty();slot.put(String::from("live")).unwrap();let _=slot.take();let _=slot.take();}'
                : fixture.id.startsWith("raw-borrowed")
                  ? "fn main(){let bytes=[1_u8,2];let _=unsafe{RawBorrowed::from_raw_parts_unchecked(bytes.as_ptr(),2)};}"
                  : 'fn main(){let mut slot=MaintainerSlot::<String>::empty();slot.put(String::from("live")).unwrap();let value=slot.take().unwrap();drop(value);slot.put(String::from("drop")).unwrap();}';
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
  if (report.status === "passed") validateBorrowedMemoryReport(report);
  return report;
}

if (process.argv[1]?.endsWith("verify-borrowed-memory.ts")) {
  const mode = parseBorrowedMemoryMode(process.argv.slice(2));
  const report = runBorrowedMemoryVerification(mode);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === "passed" ? 0 : 1;
}
