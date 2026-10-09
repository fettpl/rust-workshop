import { describe, expect, it } from "vitest";
import { capstoneMutants, capstoneMutantTestArgs } from "../../scripts/capstone-mutants";
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

  it("requires the designated restored test to run and pass", () => {
    const result = (stdout: string) => ({
      status: 0,
      signal: null,
      stdout,
      stderr: "",
    });
    expect(
      classifyCommandResult(
        result(
          "running 0 tests\ntest result: ok. 0 passed; 0 failed; 0 ignored;",
        ),
        "named",
      ),
    ).toBe("missing-test");
    expect(
      classifyCommandResult(
        result(
          "running 1 test\ntest other ... ok\ntest result: ok. 1 passed; 0 failed; 0 ignored;",
        ),
        "named",
      ),
    ).toBe("missing-test");
    expect(
      classifyCommandResult(
        result(
          "running 1 test\ntest named ... ignored\ntest result: ok. 0 passed; 0 failed; 1 ignored;",
        ),
        "named",
      ),
    ).toBe("infrastructure-error");
    expect(
      classifyCommandResult(
        result(
          "running 1 test\ntest named ... ok\ntest result: ok. 1 passed; 0 failed; 0 ignored;",
        ),
        "named",
      ),
    ).toBe("passed");
  });

  it("keeps subprocess errors and mixed compile output inconclusive", () => {
    const stdout =
      "running 1 test\ntest named ... FAILED\ntest result: FAILED. 0 passed; 1 failed; 0 ignored;";
    expect(
      classifyCommandResult(
        { status: 101, signal: null, stdout, error: { code: "ENOENT" } },
        "named",
      ),
    ).toBe("infrastructure-error");
    expect(
      classifyCommandResult(
        {
          status: 101,
          signal: null,
          stdout,
          stderr: "error[E0308]: could not compile",
        },
        "named",
      ),
    ).toBe("compile-error");
    expect(
      isRejectedMutant(
        {
          status: 101,
          signal: null,
          stdout,
          stderr: "error[E0308]: could not compile",
        },
        { phase: "test", namedTest: "named" },
      ),
    ).toBe(false);
  });

  it("declares the Rust target for each existing mutant explicitly", () => {
    expect(
      capstoneMutants
        .slice(0, 8)
        .map((mutant) => Reflect.get(mutant, "testTarget")),
    ).toEqual([
      { crate: "ingest-store", integration: "transactions" },
      { crate: "ingest-store", integration: "transactions" },
      { crate: "ingest-store", library: true },
      { crate: "ingest-service", integration: "lifecycle" },
      { crate: "ingest-service", integration: "lifecycle" },
      { crate: "ingest-service", integration: "lifecycle" },
      { crate: "ingest-core", integration: "public_api" },
      { crate: "ingest-store", integration: "migrations" },
    ]);
  });

  it("routes a stream mutant through metadata even when its name resembles another target", () => {
    const mutant = {
      ...capstoneMutants[0],
      path: "crates/ingest-core/src/protocol.rs",
      namedTest: "migration_failed_commit",
      testTarget: {
        crate: "ingest-store",
        integration: "stream_capacity",
      } as const,
    };
    expect(capstoneMutantTestArgs(mutant)).toEqual([
      "test",
      "-p",
      "ingest-store",
      "--test",
      "stream_capacity",
      "--offline",
      "--locked",
      "migration_failed_commit",
    ]);
  });

  it("declares five independently caught capacity defects on the maintained target", () => {
    const expected = [
      [
        "stream-count-is-global",
        "stream_capacity_k_two_counts_each_source_independently",
      ],
      [
        "stream-admission-before-identity",
        "stream_capacity_k_one_preserves_retry_conflict_and_rejected_rows",
      ],
      [
        "stream-count-ignores-committed-rows",
        "stream_capacity_same_limit_reopen_uses_committed_occupancy",
      ],
      [
        "lower-stream-limit-deletes-rows",
        "stream_capacity_lower_then_raise_preserves_rows_and_original_receipts",
      ],
      [
        "stream-full-returns-success",
        "stream_capacity_k_one_preserves_retry_conflict_and_rejected_rows",
      ],
    ];
    expect(
      capstoneMutants.slice(8).map(({ id, namedTest }) => [id, namedTest]),
    ).toEqual(expected);
    for (const mutant of capstoneMutants.slice(8)) {
      expect(mutant.testTarget).toEqual({
        crate: "ingest-store",
        integration: "stream_capacity",
      });
    }
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
