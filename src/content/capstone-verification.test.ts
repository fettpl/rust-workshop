import { describe, expect, it } from "vitest";
import {
  classifyCommandResult,
  isAllowedCapstoneArgs,
  isRejectedMutant,
  parseCapstoneArgs,
  serializeToolchainMetadata,
  servedArchiveMatches,
} from "../../scripts/verify-capstone";

describe("capstone verifier boundaries", () => {
  it("accepts only unique fetch and msrv flags", () => {
    expect(parseCapstoneArgs([])).toEqual({ fetch: false, msrv: false });
    expect(parseCapstoneArgs(["--fetch", "--msrv"])).toEqual({
      fetch: true,
      msrv: true,
    });
    expect(isAllowedCapstoneArgs(["--fetch"])).toBe(true);
    expect(() => parseCapstoneArgs(["--fetch", "--fetch"])).toThrow(
      /unique|duplicate/i,
    );
    expect(() => parseCapstoneArgs(["--source", "learner.rs"])).toThrow(
      /unsupported|source|path/i,
    );
  });

  it("does not treat stale archive bytes as current evidence", () => {
    expect(servedArchiveMatches(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(servedArchiveMatches(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
  });

  it("classifies compile, timeout, signal, empty and named-test failures separately", () => {
    expect(
      classifyCommandResult({ status: 1, signal: null, stdout: "error[E]", stderr: "" }, "named"),
    ).toBe("compile-error");
    expect(
      classifyCommandResult({ status: 124, signal: null, stdout: "", stderr: "" }, "named"),
    ).toBe("timeout");
    expect(
      classifyCommandResult({ status: null, signal: "SIGTERM", stdout: "running 1 test", stderr: "" }, "named"),
    ).toBe("signal");
    expect(
      classifyCommandResult({ status: 1, signal: null, stdout: "", stderr: "" }, "named"),
    ).toBe("empty-output");
    expect(
      classifyCommandResult(
        { status: 101, signal: null, stdout: "running 1 test\ntest named ... FAILED\n\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n", stderr: "" },
        "named",
      ),
    ).toBe("test-failure");
  });

  it("accepts a mutant only after clean compile and its named test fails", () => {
    const compile = { status: 0, signal: null, stdout: "Finished", stderr: "" };
    expect(isRejectedMutant(compile, { phase: "compile", namedTest: "named" })).toBe(false);
    expect(
      isRejectedMutant(
        { status: 101, signal: null, stdout: "running 1 test\ntest named ... FAILED\n\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n", stderr: "" },
        { phase: "test", namedTest: "named" },
      ),
    ).toBe(true);
    expect(
      isRejectedMutant(
        { status: 101, signal: null, stdout: "running 1 test\ntest other ... FAILED\n\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n", stderr: "" },
        { phase: "test", namedTest: "named" },
      ),
    ).toBe(false);
  });

  it("rejects ambiguous or unrelated named-test summaries", () => {
    const unrelated = "running 2 tests\ntest named ... FAILED\ntest other ... FAILED\ntest result: FAILED. 0 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s";
    expect(isRejectedMutant({ status: 101, signal: null, stdout: unrelated, stderr: "" }, { phase: "test", namedTest: "named" })).toBe(false);
    const duplicate = "running 2 tests\ntest named ... FAILED\ntest named ... FAILED\ntest result: FAILED. 0 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s";
    expect(isRejectedMutant({ status: 101, signal: null, stdout: duplicate, stderr: "" }, { phase: "test", namedTest: "named" })).toBe(false);
    const extraPassing = "running 2 tests\ntest named ... FAILED\ntest helper ... ok\ntest result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s";
    expect(isRejectedMutant({ status: 101, signal: null, stdout: extraPassing, stderr: "" }, { phase: "test", namedTest: "named" })).toBe(false);
    expect(isRejectedMutant({ status: 0, signal: null, stdout: unrelated, stderr: "" }, { phase: "test", namedTest: "named" })).toBe(false);
  });

  it("does not serialize environment secrets into toolchain metadata", () => {
    const metadata = serializeToolchainMetadata({
      label: "stable",
      cargo: "/rust/bin/cargo",
      rustc: "/rust/bin/rustc",
      rustdoc: "/rust/bin/rustdoc",
      versions: { cargo: "cargo 1.85.0", rustc: "rustc 1.85.0", rustdoc: "rustdoc 1.85.0" },
      selectedArgs: ["--fetch"],
      env: { CAPSTONE_SECRET: "TOP_SECRET_SHOULD_NOT_APPEAR" },
    });
    expect(JSON.stringify(metadata)).not.toContain("TOP_SECRET_SHOULD_NOT_APPEAR");
    expect(metadata).toEqual(expect.objectContaining({ label: "stable", selectedArgs: ["--fetch"] }));
  });
});
