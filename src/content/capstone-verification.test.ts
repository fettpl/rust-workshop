import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { capstoneMutants, capstoneMutantTestArgs } from "../../scripts/capstone-mutants";
import {
  classifyCommandResult,
  isAllowedCapstoneArgs,
  isRejectedMutant,
  parseCapstoneArgs,
  serializeToolchainMetadata,
  servedArchiveMatches,
} from "../../scripts/verify-capstone";
import * as currentCourse from "./course";
import preA6 from "./fixtures/frame-protocol-pre-a6-projection.json";
import preA7 from "./fixtures/performance-investigation-pre-a7-projection.json";
import preA8 from "./fixtures/capstone-maintenance-pre-a8-projection.json";
import {
  historicalBeforeFrameProtocolMaintenance,
} from "./frame-maintenance-compatibility-fixture";
import {
  historicalBeforePerformanceInvestigation,
} from "./performance-investigation-compatibility-fixture";
import {
  historicalBeforeA10ThenA9ThenCapstoneMaintenance,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair,
} from "./file-schema-evolution-compatibility-fixture";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const serializedRegistry = (
  course: typeof currentCourse,
  keys: readonly string[],
) => {
  const namespace = course as typeof currentCourse & {
    default?: Record<string, unknown>;
  };
  const values = course as unknown as Record<string, unknown>;
  const defaultRegistry =
    namespace.default ??
    Object.fromEntries(
      keys
        .filter((key) => key !== "default")
        .map((key) => [key, values[key]]),
    );
  return Object.fromEntries(
    keys.map((key) => [
      key,
      key === "default" ? defaultRegistry : values[key],
    ]),
  );
};

const lessonIds = (course: typeof currentCourse) =>
  course.lessons.map((lesson) => lesson.id);

describe("capstone verifier boundaries", () => {
  it("records authored snapshot chronology separately from runtime acceptance", () => {
    // These are immutable authored-availability snapshots. They do not claim
    // that a private runtime admission or execution was accepted.
    const preA8Course = historicalBeforeA10ThenA9ThenCapstoneMaintenance(currentCourse);
    const preA7Course = historicalBeforePerformanceInvestigation(preA8Course);
    const preA6Course = historicalBeforeFrameProtocolMaintenance(
      historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair(currentCourse),
    );

    expect(preA6.predecessor.head).toBe("16356613b729f5a456e506fc7508424994ab369b");
    expect(preA6.predecessor.tree).toBe("e68b5123d83ac456c59d4e5c4125c9f94ac698fc");
    expect(preA7.head).toBe("da97ed42bfb3e2bf341195545c32489dacbf0bdc");
    expect(preA7.tree).toBe("721f026c962eb15580ecdb19db34dfc7b8a8b059");
    expect(preA8.head).toBe("eaaee0b2398ebffffb2c666e0c932389671158d4");
    expect(preA8.tree).toBe("9bd1490800de24f4d30a06d56845cf90620e16d4");

    expect(
      hashJson(serializedRegistry(preA6Course, preA6.registryKeys)),
    ).toBe(preA6.wholeCourseSha256);
    expect(
      hashJson(serializedRegistry(preA7Course, preA7.predecessor.registryKeys)),
    ).toBe(preA7.predecessor.wholeCourseSha256);
    expect(
      hashJson(serializedRegistry(preA8Course, preA8.predecessor.registryKeys)),
    ).toBe(preA8.predecessor.wholeCourseSha256);

    const preA8Registry = serializedRegistry(
      preA8Course,
      preA8.predecessor.registryKeys,
    );
    for (const [key, expectedHash] of Object.entries(
      preA8.predecessor.registrySha256ByKey,
    )) {
      expect(hashJson(preA8Registry[key]), key).toBe(expectedHash);
    }

    expect(preA6Course.lessons).toHaveLength(preA6.counts.lessons);
    expect(preA7Course.lessons).toHaveLength(preA7.predecessor.counts.lessons);
    expect(preA8Course.lessons).toHaveLength(preA8.predecessor.counts.lessons);

    expect(lessonIds(preA6Course)).not.toEqual(
      expect.arrayContaining([
        "api-frame-protocol-maintenance",
        "performance-evidence-investigation",
        "capstone-maintenance-recovery",
      ]),
    );
    expect(lessonIds(preA7Course)).toEqual(
      expect.arrayContaining(["api-frame-protocol-maintenance"]),
    );
    expect(lessonIds(preA7Course)).not.toEqual(
      expect.arrayContaining([
        "performance-evidence-investigation",
        "capstone-maintenance-recovery",
      ]),
    );
    expect(lessonIds(preA8Course)).toEqual(
      expect.arrayContaining([
        "api-frame-protocol-maintenance",
        "performance-evidence-investigation",
      ]),
    );
    expect(lessonIds(preA8Course)).not.toContain("capstone-maintenance-recovery");
    expect(lessonIds(currentCourse)).toEqual(
      expect.arrayContaining([
        "api-frame-protocol-maintenance",
        "performance-evidence-investigation",
        "capstone-maintenance-recovery",
      ]),
    );
  });

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
      capstoneMutants.slice(8, 13).map(({ id, namedTest }) => [id, namedTest]),
    ).toEqual(expected);
    for (const mutant of capstoneMutants.slice(8, 13)) {
      expect(mutant.testTarget).toEqual({
        crate: "ingest-store",
        integration: "stream_capacity",
      });
    }
  });

  it("routes the A8 reopen-limit mutant through its exact maintenance selector", () => {
    const mutant = capstoneMutants.at(-1)!;
    expect(mutant.id).toBe("a8-reopen-limit-ignores-k3");
    expect(mutant.namedTest).toBe("maintenance_reconfiguration_recovery_trace");
    expect(mutant.testTarget).toEqual({
      crate: "ingest-store",
      integration: "maintenance_recovery",
    });
    expect(capstoneMutantTestArgs(mutant)).toEqual([
      "test",
      "-p",
      "ingest-store",
      "--test",
      "maintenance_recovery",
      "--offline",
      "--locked",
      "maintenance_reconfiguration_recovery_trace",
      "--",
      "--exact",
    ]);
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
