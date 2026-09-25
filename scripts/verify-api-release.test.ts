import { describe, expect, it } from "vitest";
import {
  isRejectedMutant,
  validateApiReleaseReport,
  type ApiReleaseReport,
  type CommandEvidence,
} from "./api-release-verifier";

function report(): ApiReleaseReport {
  return {
    reportVersion: 1,
    mode: "stable",
    status: "passed",
    fixture: {
      root: "scripts/fixtures/api-release",
      files: [{ path: "Cargo.lock", bytes: 1, sha256: "a".repeat(64) }],
      sha256: "b".repeat(64),
    },
    toolchain: {
      cargo: "cargo 1.98.1",
      rustc: "rustc 1.98.1",
      rustdoc: "rustdoc 1.98.1",
      cargoPath: "/usr/bin/cargo",
      rustcPath: "/usr/bin/rustc",
      rustdocPath: "/usr/bin/rustdoc",
    },
    commands: [],
    scenarios: [
      { id: "default", passed: true },
      { id: "no-default-features", passed: true },
      { id: "metrics", passed: true },
    ],
    mutants: [
      { id: "removed-legacy-path", scenario: "default", rejected: true },
      { id: "lost-dyn-compatibility", scenario: "default", rejected: true },
      {
        id: "hidden-legacy-path-under-metrics",
        scenario: "no-default-features",
        rejected: true,
      },
    ],
  };
}

describe("API release verifier", () => {
  it("validates a bounded successful provenance report", () => {
    expect(() => validateApiReleaseReport(report())).not.toThrow();
  });

  it("rejects a report that claims a mutant passed", () => {
    const candidate = report();
    candidate.mutants[1].rejected = false;
    expect(() => validateApiReleaseReport(candidate)).toThrow(
      /mutant.*rejected/i,
    );
  });

  it("accepts a compiler failure as a rejected mutant", () => {
    const evidence: CommandEvidence = {
      cwd: "old_consumer",
      args: ["check", "--offline", "--locked"],
      status: 101,
      signal: null,
      timedOut: false,
      durationMs: 10,
      stdoutSha256: "a".repeat(64),
      stderrSha256: "b".repeat(64),
      stdoutTail: "",
      stderrTail: "error[E0432]: unresolved import `release_probe::LegacyView`",
    };
    expect(isRejectedMutant(evidence)).toBe(true);
  });

  it("does not treat a timeout as product evidence", () => {
    const evidence: CommandEvidence = {
      cwd: "old_consumer",
      args: ["check", "--offline", "--locked"],
      status: null,
      signal: "SIGTERM",
      timedOut: true,
      durationMs: 45_000,
      stdoutSha256: "a".repeat(64),
      stderrSha256: "b".repeat(64),
      stdoutTail: "",
      stderrTail: "",
    };
    expect(isRejectedMutant(evidence)).toBe(false);
  });
});
