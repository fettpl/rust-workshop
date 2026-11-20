import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  classifyMacroMutant,
  currentMacroContractFixture,
  validateMacroContractReport,
  type CommandEvidence,
  type MacroContractReport,
} from "./macro-contract-verifier";

function command(args: string[], stdout = "", status = 0): CommandEvidence {
  return {
    cwd: "external_consumer",
    args,
    status,
    signal: null,
    timedOut: false,
    durationMs: 10,
    stdoutSha256: createHash("sha256").update(stdout).digest("hex"),
    stderrSha256: createHash("sha256").update("").digest("hex"),
    stdoutTail: stdout,
    stderrTail: "",
  };
}

function rejectedCommand(
  args: string[],
  stderr: string,
  stdout = "",
): CommandEvidence {
  return {
    ...command(args, stdout, 101),
    stderrSha256: createHash("sha256").update(stderr).digest("hex"),
    stderrTail: stderr,
  };
}

function report(): MacroContractReport {
  const check = command(["check", "--offline", "--locked"]);
  const test = command(
    ["test", "--offline", "--locked"],
    "test result: ok. 5 passed; 0 failed;",
  );
  const commands = [
    check,
    test,
    rejectedCommand(
      ["check", "--offline", "--locked"],
      "error[E0433]: failed to resolve: use of undeclared type `Reading`",
    ),
    rejectedCommand(
      ["test", "--offline", "--locked"],
      "test result: FAILED. 4 passed; 1 failed;",
    ),
    rejectedCommand(
      ["check", "--offline", "--locked"],
      "error: no rules expected `,`",
    ),
    rejectedCommand(
      ["check", "--offline", "--locked"],
      "error: no rules expected keyword `const`",
    ),
  ];
  return {
    reportVersion: 1,
    mode: "stable",
    status: "passed",
    fixture: currentMacroContractFixture(),
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
    scenarios: [{ id: "external-client", passed: true, commands: [0, 1] }],
    mutants: [
      {
        id: "unqualified-crate-path",
        scenario: "external-client",
        phase: "compile",
        rejection: "compile-error",
        rejected: true,
        command: 2,
      },
      {
        id: "duplicate-evaluation",
        scenario: "external-client",
        phase: "test",
        rejection: "test-failure",
        rejected: true,
        command: 3,
      },
      {
        id: "strict-entry-grammar",
        scenario: "external-client",
        phase: "compile",
        rejection: "compile-error",
        rejected: true,
        command: 4,
      },
      {
        id: "expr-2021-fragment",
        scenario: "external-client",
        phase: "compile",
        rejection: "compile-error",
        rejected: true,
        command: 5,
      },
    ],
  };
}

describe("macro contract verifier report", () => {
  it("accepts complete linked positive and mutant evidence", () => {
    expect(() => validateMacroContractReport(report())).not.toThrow();
  });

  it("rejects a passed report without linked command evidence", () => {
    const candidate = report();
    candidate.commands = [];
    expect(() => validateMacroContractReport(candidate)).toThrow(/command/i);
  });

  it("rejects stale fixture content", () => {
    const candidate = report();
    candidate.fixture.sha256 = "0".repeat(64);
    expect(() => validateMacroContractReport(candidate)).toThrow(/fixture/i);
  });

  it("rejects duplicate mutant identities", () => {
    const candidate = report();
    candidate.mutants[1].id = candidate.mutants[0].id;
    expect(() => validateMacroContractReport(candidate)).toThrow(/mutant/i);
  });

  it("rejects a toolchain mismatch in exact MSRV mode", () => {
    const candidate = report();
    candidate.mode = "msrv";
    candidate.toolchain!.requested = "stable";
    expect(() => validateMacroContractReport(candidate)).toThrow(
      /toolchain|MSRV/i,
    );
  });

  it("rejects infrastructure-only command evidence as a pass", () => {
    const candidate = report();
    candidate.commands[0].status = null;
    candidate.commands[0].signal = "SIGTERM";
    candidate.commands[0].timedOut = true;
    expect(() => validateMacroContractReport(candidate)).toThrow(
      /scenario|successful/i,
    );
  });

  it("rejects unlinked extra command evidence", () => {
    const candidate = report();
    candidate.commands.push(command(["check", "--offline", "--locked"]));
    expect(() => validateMacroContractReport(candidate)).toThrow(
      /references|duplicate|missing/i,
    );
  });

  it("does not classify infrastructure failures as mutant rejection", () => {
    const evidence = command(["check", "--offline", "--locked"]);
    evidence.status = null;
    evidence.timedOut = true;
    expect(classifyMacroMutant(evidence)).toBe("infrastructure-error");
  });

  it("does not treat a Cargo manifest failure as a grammar mutant rejection", () => {
    const evidence = rejectedCommand(
      ["check", "--offline", "--locked"],
      "error: failed to load manifest for workspace member `external_consumer`",
    );
    expect(classifyMacroMutant(evidence, "strict-entry-grammar")).toBe(
      "unrejected",
    );
  });
});
