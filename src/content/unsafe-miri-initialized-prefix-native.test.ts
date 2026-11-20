import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  classifyInitializedPrefixDiagnostics,
  classifyInitializedPrefixMiri,
} from "./unsafe-miri-initialized-prefix-proof";
import {
  initializedPrefixNativePlan,
  isInitializedPrefixControlAccepted,
  projectInitializedPrefixControlDiagnostic,
  verifyInitializedPrefixNative,
} from "./unsafe-miri-initialized-prefix-native";
import {
  createInitializedPrefixAttempt,
  qualifyInitializedPrefixToolchain,
  recordInitializedPrefixCommand,
} from "./unsafe-miri-initialized-prefix-recorder";

vi.mock("./unsafe-miri-initialized-prefix-recorder", async () => {
  const actual = await vi.importActual<
    typeof import("./unsafe-miri-initialized-prefix-recorder")
  >("./unsafe-miri-initialized-prefix-recorder");
  return {
    ...actual,
    createInitializedPrefixAttempt: vi.fn(
      actual.createInitializedPrefixAttempt,
    ),
    qualifyInitializedPrefixToolchain: vi.fn(
      actual.qualifyInitializedPrefixToolchain,
    ),
    recordInitializedPrefixCommand: vi.fn(
      actual.recordInitializedPrefixCommand,
    ),
  };
});

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

  it("projects finite failed-control codes without accepting them", () => {
    expect(
      projectInitializedPrefixControlDiagnostic({
        id: "miri-category",
        rejected: false,
        reasons: [
          { code: "miri-category-mismatch" },
          { code: "miri-read-mismatch" },
          { code: "tamper-control-error" },
          { code: "/private/secret raw message\n" },
        ],
      }),
    ).toEqual({
      controlID: "miri-category",
      rejected: false,
      expectedReasonCode: "miri-category-mismatch",
      observedReasonCodes: [
        "miri-category-mismatch",
        "miri-read-mismatch",
        "tamper-control-error",
        "other",
      ],
    });
    expect(
      projectInitializedPrefixControlDiagnostic({
        id: "miri-category",
        rejected: false,
        reasons: [],
      }),
    ).toEqual({
      controlID: "miri-category",
      rejected: false,
      expectedReasonCode: "miri-category-mismatch",
      observedReasonCodes: ["none"],
    });
    expect(
      projectInitializedPrefixControlDiagnostic({
        id: "baseline-valid",
        rejected: false,
        reasons: [{ code: "tamper-baseline-mutated" }],
      }),
    ).toBeUndefined();
  });

  it.skipIf(!controlsAuthorized)(
    "awaits the maintained current stable proof",
    { timeout: 10 * 60 * 1000 },
    async () => {
      const result = await verifyInitializedPrefixNative({ mode: "stable" });
      expect(result.ok).toBe(true);
    },
  );

  it("uses eight-minute stable/MSRV and thirty-minute Miri capture budgets", async () => {
    const qualificationEnv =
      "RUST_WORKSHOP_INITIALIZED_PREFIX_TOOLCHAIN_QUALIFICATION";
    const previousQualification = process.env[qualificationEnv];
    const createAttempt = vi.mocked(createInitializedPrefixAttempt);
    const qualify = vi.mocked(qualifyInitializedPrefixToolchain);
    const record = vi.mocked(recordInitializedPrefixCommand);
    const defaultCreateAttempt = createAttempt.getMockImplementation();
    const defaultQualify = qualify.getMockImplementation();
    const defaultRecord = record.getMockImplementation();
    let elapsedBeforeQualificationMs = 9 * 60 * 1000;
    const testEvidenceDirectory = mkdtempSync(
      join(tmpdir(), "initialized-prefix-native-budget-test-"),
    );
    vi.useFakeTimers();
    try {
      delete process.env[qualificationEnv];
      expect(defaultCreateAttempt).toBeDefined();
      createAttempt.mockImplementation((options) => {
        const attempt = defaultCreateAttempt!({
          ...options,
          evidenceDirectory: testEvidenceDirectory,
        });
        vi.setSystemTime(
          new Date(
            Date.parse("2026-10-22T00:00:00.000Z") +
              elapsedBeforeQualificationMs,
          ),
        );
        return attempt;
      });
      qualify.mockRejectedValue(new Error("synthetic missing qualification"));
      record.mockClear();
      for (const mode of ["stable", "msrv"] as const) {
        vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
        qualify.mockClear();
        const result = await verifyInitializedPrefixNative({ mode });
        expect(result.ok).toBe(false);
        expect(result.reasons[0]?.code).toBe("toolchain-qualification-failed");
        expect(result.reasons[0]?.message).toContain(
          "whole native proof deadline expired before qualification",
        );
        expect(qualify).not.toHaveBeenCalled();
        expect(record).not.toHaveBeenCalled();
      }

      qualify.mockClear();
      record.mockClear();
      vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
      const miriResult = await verifyInitializedPrefixNative({ mode: "miri" });
      expect(miriResult.ok).toBe(false);
      expect(miriResult.reasons[0]?.code).toBe(
        "toolchain-qualification-failed",
      );
      expect(miriResult.reasons[0]?.message).toContain(
        "synthetic missing qualification",
      );
      expect(qualify).toHaveBeenCalledTimes(1);
      expect(record).not.toHaveBeenCalled();

      qualify.mockClear();
      elapsedBeforeQualificationMs = 31 * 60 * 1000;
      vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
      const lateMiriResult = await verifyInitializedPrefixNative({
        mode: "miri",
      });
      expect(lateMiriResult.ok).toBe(false);
      expect(lateMiriResult.reasons[0]?.code).toBe(
        "toolchain-qualification-failed",
      );
      expect(lateMiriResult.reasons[0]?.message).toContain(
        "whole native proof deadline expired before qualification",
      );
      expect(qualify).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      if (previousQualification === undefined)
        delete process.env[qualificationEnv];
      else process.env[qualificationEnv] = previousQualification;
      qualify.mockReset();
      if (defaultQualify) qualify.mockImplementation(defaultQualify);
      record.mockReset();
      if (defaultRecord) record.mockImplementation(defaultRecord);
      createAttempt.mockReset();
      if (defaultCreateAttempt)
        createAttempt.mockImplementation(defaultCreateAttempt);
      rmSync(testEvidenceDirectory, { recursive: true, force: true });
    }
  });
});
