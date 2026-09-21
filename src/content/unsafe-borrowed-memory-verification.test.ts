import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  buildBorrowedMemoryReport,
  currentBorrowedMemoryMiriSources,
  parseBorrowedMemoryMode,
  runBorrowedMemoryVerification,
  validateBorrowedMemoryReport,
  type BorrowedMemoryReport,
} from "../../scripts/verify-borrowed-memory";

import { unsafeBorrowedMemoryCompileFailFixtures } from "./unsafe-borrowed-memory-assessment-fixtures";

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
  expect(executed.status).toBe("passed");
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
  const sources = currentBorrowedMemoryMiriSources();
  const executed = buildBorrowedMemoryReport("miri");
  const tooling = {
    command: ["fixture-tool"],
    stdout: "",
    stderr: "",
    exitCode: 0,
    signal: null,
    status: "passed" as const,
  };
  executed.compilerVersion = "rustc nightly test";
  executed.phaseStatuses = {
    compile: "passed",
    tests: "passed",
    report: "passed",
  };
  executed.status = "passed";
  executed.miriChecks = sources.map((entry) => ({
    id: entry.id,
    status: "passed" as const,
    command: ["miri", "run", entry.id],
    stdout: "",
    stderr: "",
    exitCode: 0,
    signal: null,
    source: entry.source,
    sourceHash: entry.sourceHash,
    authoredSourceHash: entry.sourceHash,
    manifestPath: "/tmp/borrowed-memory/Cargo.toml",
    manifest: entry.manifest,
    manifestHash: entry.manifestHash,
    tooling: {
      rustfmt: tooling,
      cargoFmt: tooling,
      cargoClippy: tooling,
    },
  }));
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
