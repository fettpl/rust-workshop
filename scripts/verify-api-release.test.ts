import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  classifyMutantRejection,
  currentApiReleaseFixture,
  isRejectedMutant,
  validateApiReleaseReport,
  type ApiReleaseReport,
  type CommandEvidence,
} from "./api-release-verifier";

function report(): ApiReleaseReport {
  const commands: CommandEvidence[] = [
    command(["check", "--offline", "--locked"]),
    command(
      ["test", "--offline", "--locked"],
      "test result: ok. 3 passed; 0 failed;",
    ),
    command(["check", "--offline", "--locked", "--no-default-features"]),
    command(
      ["test", "--offline", "--locked", "--no-default-features"],
      "test result: ok. 2 passed; 0 failed;",
    ),
    command([
      "check",
      "--offline",
      "--locked",
      "--no-default-features",
      "--features",
      "metrics",
    ]),
    command(
      [
        "test",
        "--offline",
        "--locked",
        "--no-default-features",
        "--features",
        "metrics",
      ],
      "test result: ok. 3 passed; 0 failed;",
    ),
    mutantCommand(),
    mutantCommand("error[E0038]: the trait `PacketView` is not dyn compatible"),
    mutantCommand(
      "error[E0432]: unresolved import `release_probe::LegacyView`",
      ["check", "--offline", "--locked", "--no-default-features"],
    ),
    behaviorMutantCommand(),
  ];
  return {
    reportVersion: 1,
    mode: "stable",
    status: "passed",
    fixture: {
      ...currentApiReleaseFixture(),
    },
    toolchain: {
      requested: "stable",
      cargo: "cargo 1.98.1",
      rustc: "rustc 1.98.1",
      rustdoc: "rustdoc 1.98.1",
      cargoPath: "/usr/bin/cargo",
      rustcPath: "/usr/bin/rustc",
      rustdocPath: "/usr/bin/rustdoc",
    },
    commands,
    scenarios: [
      { id: "default", passed: true, commands: [0, 1] },
      { id: "no-default-features", passed: true, commands: [2, 3] },
      { id: "metrics", passed: true, commands: [4, 5] },
    ],
    mutants: [
      {
        id: "removed-legacy-path",
        scenario: "default",
        rejected: true,
        command: 6,
        phase: "compile",
        rejection: "compile-error",
      },
      {
        id: "lost-dyn-compatibility",
        scenario: "default",
        rejected: true,
        command: 7,
        phase: "compile",
        rejection: "compile-error",
      },
      {
        id: "hidden-legacy-path-under-metrics",
        scenario: "no-default-features",
        rejected: true,
        command: 8,
        phase: "compile",
        rejection: "compile-error",
      },
      {
        id: "behavior-regression",
        scenario: "default",
        rejected: true,
        command: 9,
        phase: "test",
        rejection: "test-failure",
      },
    ],
  };
}

function command(args: string[], stdout = ""): CommandEvidence {
  return {
    cwd: "old_consumer",
    args,
    status: 0,
    signal: null,
    timedOut: false,
    durationMs: 10,
    stdoutSha256: createHash("sha256").update(stdout).digest("hex"),
    stderrSha256: createHash("sha256").update("").digest("hex"),
    stdoutTail: stdout,
    stderrTail: "",
  };
}

function mutantCommand(
  message = "error[E0432]: unresolved import `release_probe::LegacyView`",
  args = ["check", "--offline", "--locked"],
): CommandEvidence {
  return {
    cwd: "old_consumer",
    args,
    status: 101,
    signal: null,
    timedOut: false,
    durationMs: 10,
    stdoutSha256: "a".repeat(64),
    stderrSha256: createHash("sha256").update(message).digest("hex"),
    stdoutTail: "",
    stderrTail: message,
  };
}

function behaviorMutantCommand(): CommandEvidence {
  const message = "test result: FAILED. 2 passed; 1 failed; 0 ignored;";
  return {
    cwd: "old_consumer",
    args: ["test", "--offline", "--locked"],
    status: 101,
    signal: null,
    timedOut: false,
    durationMs: 10,
    stdoutSha256: createHash("sha256").update(message).digest("hex"),
    stderrSha256: createHash("sha256").update("").digest("hex"),
    stdoutTail: message,
    stderrTail: "",
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

  it("rejects a forged passed report with no command evidence", () => {
    const candidate = report();
    candidate.commands = [];
    candidate.scenarios = [
      { id: "default", passed: true },
      { id: "no-default-features", passed: true },
      { id: "metrics", passed: true },
    ];
    candidate.mutants = candidate.mutants.map((mutant) => ({
      ...mutant,
      rejected: true,
    }));
    expect(() => validateApiReleaseReport(candidate)).toThrow(/command/i);
  });

  it("rejects a scenario with a failed command", () => {
    const candidate = report();
    candidate.commands[1].status = 101;
    candidate.commands[1].stderrTail = "error[E0308]: mismatched types";
    expect(() => validateApiReleaseReport(candidate)).toThrow(
      /scenario|successful/i,
    );
  });

  it("rejects a stale fixture hash", () => {
    const candidate = report();
    candidate.fixture.sha256 = "0".repeat(64);
    expect(() => validateApiReleaseReport(candidate)).toThrow(/fixture/i);
  });

  it("rejects a mutant without its compiler command", () => {
    const candidate = report();
    delete candidate.mutants[0].command;
    expect(() => validateApiReleaseReport(candidate)).toThrow(
      /mutant|command/i,
    );
  });

  it("rejects a report whose requested mode disagrees with its toolchain", () => {
    const candidate = report();
    candidate.mode = "msrv";
    candidate.toolchain!.requested = "stable";
    expect(() => validateApiReleaseReport(candidate)).toThrow(
      /toolchain|MSRV/i,
    );
  });

  it("rejects a behavior mutant labeled as a compiler mutant", () => {
    const candidate = report();
    candidate.mutants[3].rejection = "compile-error";
    expect(() => validateApiReleaseReport(candidate)).toThrow(
      /behavior-regression|test-failure/i,
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

  it("classifies a compiling behavior regression as a test failure", () => {
    const evidence = behaviorMutantCommand();
    expect(classifyMutantRejection(evidence)).toBe("test-failure");
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

  it("preserves infrastructure status when no toolchain commands ran", () => {
    const candidate = report();
    candidate.status = "infrastructure-error";
    candidate.toolchain = null;
    candidate.commands = [];
    candidate.scenarios = [];
    candidate.mutants = [];
    candidate.error = { kind: "infrastructure", message: "rustup unavailable" };
    expect(() => validateApiReleaseReport(candidate)).not.toThrow();
  });
});
