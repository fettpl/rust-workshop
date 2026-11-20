import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  buildBorrowedMemoryReport,
  classifyMiriResult,
  currentBorrowedMemoryMiriSources,
  parseBorrowedMemoryMode,
  runBorrowedMemoryVerification,
  validateBorrowedMemoryReport,
  type BorrowedMemoryReport,
} from "../../scripts/verify-borrowed-memory";

import {
  unsafeBorrowedMemoryAssessmentFixtures,
  unsafeBorrowedMemoryCompileFailFixtures,
} from "./unsafe-borrowed-memory-assessment-fixtures";

function report(
  overrides: Partial<BorrowedMemoryReport> = {},
): BorrowedMemoryReport {
  const base = buildBorrowedMemoryReport("stable");
  return {
    ...base,
    compilerVersion: "rustc test",
    phaseStatuses: { compile: "passed", tests: "passed", report: "passed" },
    phaseErrors: [],
    compileFailChecks: unsafeBorrowedMemoryCompileFailFixtures.map(
      (fixture) => ({
        id: fixture.id,
        status: "passed" as const,
      }),
    ),
    miriChecks: [],
    artifactPaths: [],
    artifactHashes: {},
    limitations: [],
    status: "passed",
    ...overrides,
  };
}

function miriReport(): BorrowedMemoryReport {
  const executed = buildBorrowedMemoryReport("miri");
  const sources = currentBorrowedMemoryMiriSources();
  const tooling = (kind: "rustfmt" | "cargoFmt" | "cargoClippy") => {
    const sourcePath = "/tmp/borrowed-memory/src/main.rs";
    const manifestPath = "/tmp/borrowed-memory/tooling/Cargo.toml";
    const command =
      kind === "rustfmt"
        ? [
            "rustup",
            "run",
            "nightly-2026-08-08",
            "rustfmt",
            "--edition",
            "2024",
            sourcePath,
          ]
        : kind === "cargoFmt"
          ? [
              "rustup",
              "run",
              "nightly-2026-08-08",
              "cargo",
              "fmt",
              "--manifest-path",
              manifestPath,
              "--",
              "--check",
            ]
          : [
              "rustup",
              "run",
              "nightly-2026-08-08",
              "cargo",
              "clippy",
              "--manifest-path",
              manifestPath,
              "--all-targets",
              "--",
              "-D",
              "warnings",
            ];
    return {
      command,
      stdout: "",
      stderr: "",
      exitCode: 0,
      signal: null,
      status: "passed" as const,
    };
  };
  executed.compilerVersion = "rustc nightly test";
  executed.phaseStatuses = {
    compile: "passed",
    tests: "passed",
    report: "passed",
  };
  executed.status = "passed";
  executed.miriChecks = sources.map((entry) => {
    const fixtureId = entry.id.slice(0, entry.id.lastIndexOf(":"));
    const fixture = unsafeBorrowedMemoryAssessmentFixtures.find(
      (candidate) => candidate.id === fixtureId,
    )!;
    const manifestPath = "/tmp/borrowed-memory/Cargo.toml";
    const isPositive = fixture.mode === "miri-positive";
    const diagnostic = fixture.expectedDiagnostic;
    const outputDiagnostic =
      fixture.id === "maybe-uninit-double-drop-negative"
        ? "dangling reference (use-after-free)"
        : fixture.id === "raw-borrowed-wrapped-range-negative"
          ? "dangling reference: pointer has no provenance"
          : diagnostic?.replaceAll("\\s", " ");
    const output = isPositive
      ? "Finished `dev` profile"
      : `error: Undefined Behavior: ${outputDiagnostic ?? ""}`;
    return {
      id: entry.id,
      status: "passed" as const,
      diagnostic,
      command: [
        "rustup",
        "run",
        "nightly-2026-08-08",
        "cargo",
        "miri",
        "run",
        "--manifest-path",
        manifestPath,
        "--quiet",
      ],
      stdout: isPositive ? output : "",
      stderr: isPositive ? "" : output,
      exitCode: isPositive ? 0 : 1,
      signal: null,
      source: entry.source,
      sourceHash: entry.sourceHash,
      authoredSourceHash: entry.sourceHash,
      manifestPath,
      manifest: entry.manifest,
      manifestHash: entry.manifestHash,
      tooling: {
        rustfmt: tooling("rustfmt"),
        cargoFmt: tooling("cargoFmt"),
        cargoClippy: tooling("cargoClippy"),
      },
    };
  });
  return executed;
}

it("accepts only the documented verifier modes", () => {
  expect(parseBorrowedMemoryMode([])).toBe("stable");
  expect(parseBorrowedMemoryMode(["--msrv"])).toBe("msrv");
  expect(parseBorrowedMemoryMode(["--miri"])).toBe("miri");
  for (const args of [
    ["--fetch"],
    ["--msrv", "--miri"],
    ["./path"],
    ["--toolchain", "stable"],
  ])
    expect(() => parseBorrowedMemoryMode(args)).toThrow();
});

it("classifies a wrong Miri diagnostic as failed evidence", () => {
  expect(
    classifyMiriResult({
      status: 1,
      signal: null,
      hasError: false,
      output: "error: Undefined Behavior: encountered a different diagnostic",
      expectedPass: false,
      expectedDiagnostic: "tag does not exist",
    }),
  ).toBe("failed");
  expect(
    classifyMiriResult({
      status: null,
      signal: "SIGTERM",
      hasError: true,
      output: "",
      expectedPass: false,
      expectedDiagnostic: "tag does not exist",
    }),
  ).toBe("infrastructure");
});

it("rejects incomplete passed reports and preserves phase errors", () => {
  expect(() => validateBorrowedMemoryReport(report())).not.toThrow();
  expect(() =>
    validateBorrowedMemoryReport(
      report({
        phaseStatuses: {
          compile: "infrastructure",
          tests: "passed",
          report: "passed",
        },
      }),
    ),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport(
      report({ status: "passed", phaseErrors: ["Miri unavailable"] }),
    ),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport(
      report({
        status: "failed",
        phaseErrors: ["mutant accepted"],
        phaseStatuses: { compile: "passed", tests: "failed", report: "passed" },
      }),
    ),
  ).not.toThrow();
});

it("requires exact mode toolchains and nonempty provenance", () => {
  expect(() =>
    validateBorrowedMemoryReport(report({ mode: "msrv", toolchain: "stable" })),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport(
      report({ mode: "miri", toolchain: "nightly" }),
    ),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport(report({ sourceHashes: {} })),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport(report({ runId: "../other-run" })),
  ).toThrow();
});

it("does not treat an unexecuted or report-only dossier as passed", () => {
  const pending = buildBorrowedMemoryReport("stable");
  expect(pending.status).not.toBe("passed");
  expect(() => validateBorrowedMemoryReport(pending)).toThrow();

  expect(() =>
    validateBorrowedMemoryReport(
      report({
        compileFailChecks: [],
        phaseStatuses: { compile: "passed", tests: "passed", report: "passed" },
      }),
    ),
  ).toThrow();
  const executed = runBorrowedMemoryVerification("stable");
  expect(executed.status, JSON.stringify(executed, null, 2)).toBe("passed");
  expect(executed.compileFailChecks).toHaveLength(4);
}, 60_000);

it("rejects stale hashes and partial phase reports", () => {
  const executed = report();
  expect(() =>
    validateBorrowedMemoryReport({
      ...executed,
      fixtureHashes: {
        ...executed.fixtureHashes,
        [Object.keys(executed.fixtureHashes)[0]]: "0".repeat(64),
      },
    }),
  ).toThrow();
  expect(() =>
    validateBorrowedMemoryReport({
      ...executed,
      status: "passed",
      phaseStatuses: {
        compile: "passed",
        tests: "pending",
        report: "passed",
      } as never,
    }),
  ).toThrow();
}, 60_000);

it("rejects substituted Miri source even when its hash is recomputed", () => {
  const executed = miriReport();
  expect(() => validateBorrowedMemoryReport(executed)).not.toThrow();

  const tampered = {
    ...executed,
    miriChecks: executed.miriChecks.map((check, index) =>
      index === 0
        ? {
            ...check,
            source: `${check.source}\n// substituted fixture\n`,
            sourceHash: createHash("sha256")
              .update(`${check.source}\n// substituted fixture\n`)
              .digest("hex"),
          }
        : check,
    ),
  };
  expect(() => validateBorrowedMemoryReport(tampered)).toThrow(
    "Miri raw command evidence is incomplete",
  );
});

it("rejects forged positive and negative Miri evidence", () => {
  const executed = miriReport();
  const negativeIndex = executed.miriChecks.findIndex((check) =>
    check.id.startsWith("raw-borrowed-negative:"),
  );
  const positiveIndex = executed.miriChecks.findIndex((check) =>
    check.id.startsWith("raw-borrowed-positive:"),
  );
  expect(negativeIndex).toBeGreaterThanOrEqual(0);
  expect(positiveIndex).toBeGreaterThanOrEqual(0);

  const wrongDiagnostic = structuredClone(executed);
  wrongDiagnostic.miriChecks[negativeIndex].stderr =
    "error: Undefined Behavior: different diagnostic";
  expect(() => validateBorrowedMemoryReport(wrongDiagnostic)).toThrow(
    "wrong diagnostic",
  );

  const missingDiagnostic = structuredClone(executed);
  missingDiagnostic.miriChecks[negativeIndex].stderr = "error: failed";
  expect(() => validateBorrowedMemoryReport(missingDiagnostic)).toThrow(
    "lacks UB evidence",
  );

  const wrongExit = structuredClone(executed);
  wrongExit.miriChecks[positiveIndex].exitCode = 1;
  expect(() => validateBorrowedMemoryReport(wrongExit)).toThrow(
    "positive fixture did not exit successfully",
  );

  const wrongCommand = structuredClone(executed);
  wrongCommand.miriChecks[positiveIndex].command[2] = "nightly";
  expect(() => validateBorrowedMemoryReport(wrongCommand)).toThrow(
    "pinned fixture invocation",
  );

  const wrongToolchain = structuredClone(executed);
  wrongToolchain.miriChecks[positiveIndex].tooling.cargoFmt.command[2] =
    "nightly";
  expect(() => validateBorrowedMemoryReport(wrongToolchain)).toThrow(
    "pinned and successful",
  );
});
