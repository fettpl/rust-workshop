import { describe, expect, it } from "vitest";
import {
  classifyInitializedPrefixDiagnostics,
  classifyInitializedPrefixMiri,
} from "./unsafe-miri-initialized-prefix-proof";
import {
  initializedPrefixNativePlan,
  isInitializedPrefixControlAccepted,
  verifyInitializedPrefixNative,
} from "./unsafe-miri-initialized-prefix-native";

const controlsAuthorized =
  process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED === "1";

describe("initialized-prefix maintained native proof contract", () => {
  it("keeps the complete finite proof inventory", () => {
    expect(initializedPrefixNativePlan.fullHarnessTests).toBe(42);
    expect(initializedPrefixNativePlan.positiveMechanisms).toEqual([
      "element",
      "bulk",
    ]);
    expect(initializedPrefixNativePlan.safeVariantCount).toBe(14);
    expect(initializedPrefixNativePlan.compilerModes).toEqual([
      "stable",
      "msrv",
      "miri",
    ]);
    expect(initializedPrefixNativePlan.boundaries).toEqual([
      "owner-escape",
      "reborrow",
      "static-demand",
    ]);
    expect(initializedPrefixNativePlan.miriFixtures).toEqual([
      "skipped-write-ub",
      "sound-twin",
    ]);
  });

  it("fails closed when a compiler recipe has no reviewed diagnostics", () => {
    const result = classifyInitializedPrefixDiagnostics({
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
      outcome: {
        exitCode: 1,
        signal: null,
        spawnError: null,
        timedOut: false,
        outputLimit: false,
        drainTimedOut: false,
      },
      sourceFiles: {},
      expected: {
        id: "client-negative",
        mode: "stable",
        operation: "client-negative",
        sourceId: "client-negative",
        sourceSha256: "",
        expectedExitCode: 1,
      },
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.map((entry) => entry.code)).toContain(
      "diagnostic-expectation-missing",
    );
  });

  it("rejects an ordinary panic as the first Miri event", () => {
    const result = classifyInitializedPrefixMiri({
      stdout: new TextEncoder().encode(
        "thread 'main' panicked at src/main.rs:1:1",
      ),
      stderr: new Uint8Array(),
      outcome: {
        exitCode: 1,
        signal: null,
        spawnError: null,
        timedOut: false,
        outputLimit: false,
        drainTimedOut: false,
      },
      sourceFiles: {},
      expected: {
        id: "miri-ub",
        mode: "miri",
        operation: "miri-ub",
        sourceId: "artifacts/miri/element/src/main.rs",
        sourceSha256: "",
        expectedExitCode: 1,
        miri: {
          category: "uninitialized-read",
          sourceId: "artifacts/miri/element/src/main.rs",
          sourceSha256: "",
          expression: "view[0]",
          line: 1,
          column: 1,
          byteStart: 0,
          byteEnd: 7,
        },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.map((entry) => entry.code)).toContain(
      "miri-error-missing",
    );
  });

  it("rejects an intended tamper reason paired with unrelated semantic faults", () => {
    const expected = {
      id: "mutate-source",
      rejected: true,
      reasons: [
        { code: "source-binding-mismatch" },
        { code: "source-binding-mismatch" },
      ],
    };
    expect(isInitializedPrefixControlAccepted(expected)).toBe(true);

    for (const unrelated of [
      "compiled-output-hash-mismatch",
      "diagnostic-source-mismatch",
      "file-hash-mismatch",
      "command-closure-incomplete",
    ]) {
      expect(
        isInitializedPrefixControlAccepted({
          ...expected,
          reasons: [...expected.reasons, { code: unrelated }],
        }),
      ).toBe(false);
    }
  });

  it.skipIf(!controlsAuthorized)(
    "awaits the maintained current stable proof",
    { timeout: 10 * 60 * 1000 },
    async () => {
      const result = await verifyInitializedPrefixNative({ mode: "stable" });
      expect(result.ok).toBe(true);
    },
  );
});
