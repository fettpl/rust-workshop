import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  parseBorrowedMemoryMode,
  validateBorrowedMemoryReport,
  type BorrowedMemoryReport,
} from "../../scripts/verify-borrowed-memory";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function report(
  overrides: Partial<BorrowedMemoryReport> = {},
): BorrowedMemoryReport {
  return {
    schemaVersion: 1,
    runId: "borrowed-memory-test",
    mode: "stable",
    toolchain: "stable",
    sourceHashes: { authored: hash("source") },
    fixtureHashes: { canonical: hash("fixture") },
    phaseStatuses: { compile: "passed", tests: "passed", report: "passed" },
    phaseErrors: [],
    compileFailChecks: [{ id: "lifetime", status: "passed" }],
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
