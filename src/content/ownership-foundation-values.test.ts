import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests, parseTests } from "../runner";
import {
  ownershipFoundationValueSteps,
  ownershipFoundationValueFixtures,
  ownershipRestoreRejectionStarter,
  ownershipRestoreRejectionCanonical,
  ownershipRestoreRejectionValidAlternate,
  ownershipRestoreRejectionHarness,
  ownershipRestoreRejectionSemanticMutants,
  ownershipRestoreRejectionCompilerPairs,
  ownershipCopyCounterStarter,
  ownershipCopyCounterCanonical,
  ownershipCopyCounterValidAlternate,
  ownershipCopyCounterHarness,
  ownershipCopyCounterSemanticMutants,
  ownershipCopyCounterCompilerPairs,
  ownershipCopyArrayStarter,
  ownershipCopyArrayCanonical,
  ownershipCopyArrayValidAlternate,
  ownershipCopyArrayHarness,
  ownershipCopyArraySemanticMutants,
  ownershipCopyArrayCompilerPairs,
} from "./ownership-foundation-values";

type FixtureResult = {
  compiled: boolean;
  status: number | null;
  stderr: string;
  stdout: string;
  tests?: { passed: number; failed: number };
  processError?: string;
  signal?: NodeJS.Signals | null;
};

type FoundationToolchain = "stable" | "1.85.0";

function selectedToolchain(): FoundationToolchain {
  const value = process.env.RUST_WORKSHOP_FOUNDATION_TOOLCHAIN ?? "stable";
  if (value !== "stable" && value !== "1.85.0") {
    throw new Error(
      "RUST_WORKSHOP_FOUNDATION_TOOLCHAIN must be exactly stable or 1.85.0",
    );
  }
  return value;
}

const toolchain = selectedToolchain();

function rustFixture(
  compiler: FoundationToolchain,
  sourceCode: string,
  hiddenTests: string | undefined,
): FixtureResult {
  const dir = mkdtempSync(join(tmpdir(), "ownership-foundation-values-"));
  const source = join(dir, "fixture.rs");
  const binary = join(dir, "fixture.bin");
  try {
    const testMode = hiddenTests !== undefined;
    writeFileSync(
      source,
      testMode ? appendHiddenTests(sourceCode, hiddenTests) : sourceCode,
      "utf8",
    );
    const compile = spawnSync(
      "rustup",
      [
        "run",
        compiler,
        "rustc",
        "--edition",
        "2024",
        ...(testMode ? ["--test"] : []),
        source,
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (compile.status !== 0 || !testMode) {
      return {
        compiled: compile.status === 0,
        status: compile.status,
        stderr: compile.stderr ?? "",
        stdout: compile.stdout ?? "",
        processError: compile.error?.message,
        signal: compile.signal,
      };
    }
    const execution = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    return {
      compiled: true,
      status: execution.status,
      stderr: execution.stderr ?? "",
      stdout: execution.stdout ?? "",
      processError: execution.error?.message,
      signal: execution.signal,
      tests: parseTests(`${execution.stdout ?? ""}\n${execution.stderr ?? ""}`),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectPass(result: FixtureResult): void {
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBe(0);
  expect(result.tests?.passed).toBeGreaterThan(0);
}

function expectBehaviorFailure(result: FixtureResult): void {
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBeGreaterThan(0);
  expect(
    (result.tests?.passed ?? 0) + (result.tests?.failed ?? 0),
  ).toBeGreaterThan(0);
}

it("exports the three value steps in the approved order and attributes only primary gates", () => {
  expect(ownershipFoundationValueSteps.map((step) => step.id)).toEqual([
    "ownership-restore-rejection-transfer",
    "copy-counter-transfer",
    "copy-array-snapshot-transfer",
  ]);
  expect(ownershipFoundationValueSteps.map((step) => step.evidence)).toEqual([
    {
      version: 2,
      conceptIds: ["ownership-repair"],
      codingTaskId: "ownership/restore-after-rejection-v1",
    },
    {
      version: 2,
      conceptIds: ["copy-semantics"],
      codingTaskId: "ownership/copy-counter-v1",
    },
    {
      version: 2,
      conceptIds: ["copy-semantics"],
      codingTaskId: "ownership/copy-array-snapshot-v1",
    },
  ]);
  for (const step of ownershipFoundationValueSteps) {
    expect(step.evidenceGate).toBe(true);
    expect(step.evaluator?.kind).toBe("tests");
    expect(step.hints).toHaveLength(2);
    expect(step.code).toBeTruthy();
    expect(step.solution).toBeTruthy();
  }
});

it("publishes named fixture groups with canonical, valid alternate, harness, mutants, and compiler pairs", () => {
  expect(ownershipFoundationValueFixtures.repair.canonical).toBe(
    ownershipRestoreRejectionCanonical,
  );
  expect(ownershipFoundationValueFixtures.counter.validAlternate).toBe(
    ownershipCopyCounterValidAlternate,
  );
  expect(ownershipFoundationValueFixtures.array.harness).toBe(
    ownershipCopyArrayHarness,
  );
  expect(Object.keys(ownershipRestoreRejectionSemanticMutants)).toEqual(
    expect.arrayContaining([
      "drop-on-rejection",
      "commit-on-rejection",
      "prefix-on-error",
      "always-ok",
      "hard-coded-output",
      "repeat-no-prefix",
      "none-as-empty",
      "restore-trimmed",
    ]),
  );
  expect(Object.keys(ownershipCopyCounterSemanticMutants)).toEqual(
    expect.arrayContaining([
      "constant-pair",
      "wrong-increment",
      "wrapping-increment",
      "reversed-pair",
    ]),
  );
  expect(Object.keys(ownershipCopyArraySemanticMutants)).toEqual(
    expect.arrayContaining([
      "flip-snapshot",
      "flip-all",
      "flip-last",
      "return-same-array",
    ]),
  );
  expect(ownershipRestoreRejectionCompilerPairs.movedUse.negative).toContain(
    "Option<String>",
  );
  expect(ownershipCopyCounterCompilerPairs.stringMove.negative).toContain(
    "String",
  );
  expect(ownershipCopyArrayCompilerPairs.stringArrayMove.negative).toContain(
    "[String; 3]",
  );
});

it("runs the repair starter as a compiling TODO that fails, then accepts canonical and alternate implementations", () => {
  expectNamedBehaviorFailure(
    rustFixture(
      toolchain,
      ownershipRestoreRejectionStarter,
      ownershipRestoreRejectionHarness,
    ),
    "rejection_restores_the_exact_owned_value",
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipRestoreRejectionCanonical,
      ownershipRestoreRejectionHarness,
    ),
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipRestoreRejectionValidAlternate,
      ownershipRestoreRejectionHarness,
    ),
  );
});

it("runs the scalar Copy starter, canonical, and valid alternate against the selected fixed compiler", () => {
  expectNamedBehaviorFailure(
    rustFixture(
      toolchain,
      ownershipCopyCounterStarter,
      ownershipCopyCounterHarness,
    ),
    "preserves_before_and_saturates_after",
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipCopyCounterCanonical,
      ownershipCopyCounterHarness,
    ),
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipCopyCounterValidAlternate,
      ownershipCopyCounterHarness,
    ),
  );
});

it("runs the array Copy starter, canonical, and valid alternate across all eight inputs", () => {
  expectNamedBehaviorFailure(
    rustFixture(
      toolchain,
      ownershipCopyArrayStarter,
      ownershipCopyArrayHarness,
    ),
    "preserves_the_snapshot_and_flips_only_index_zero",
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipCopyArrayCanonical,
      ownershipCopyArrayHarness,
    ),
  );
  expectPass(
    rustFixture(
      toolchain,
      ownershipCopyArrayValidAlternate,
      ownershipCopyArrayHarness,
    ),
  );
});

it.each(Object.entries(ownershipRestoreRejectionSemanticMutants))(
  "rejects the compiling repair semantic mutant %s at its designated assertion",
  (name, source) => {
    const designated: Record<string, string> = {
      "drop-on-rejection": "rejection_restores_the_exact_owned_value",
      "commit-on-rejection": "rejection_restores_the_exact_owned_value",
      "prefix-on-error": "rejection_restores_the_exact_owned_value",
      "always-ok": "missing_slot_reports_error_and_stays_empty",
      "hard-coded-output":
        "acceptance_prefixes_the_current_value_and_repeated_calls_observe_it",
      "repeat-no-prefix":
        "acceptance_prefixes_the_current_value_and_repeated_calls_observe_it",
      "none-as-empty": "missing_slot_reports_error_and_stays_empty",
      "restore-trimmed": "rejection_restores_the_exact_owned_value",
    };
    expectNamedBehaviorFailure(
      rustFixture(toolchain, source, ownershipRestoreRejectionHarness),
      designated[name],
    );
  },
);

it.each(Object.entries(ownershipCopyCounterSemanticMutants))(
  "rejects the compiling scalar Copy semantic mutant %s at the saturation assertion",
  (_name, source) => {
    expectNamedBehaviorFailure(
      rustFixture(toolchain, source, ownershipCopyCounterHarness),
      "preserves_before_and_saturates_after",
    );
  },
);

it.each(Object.entries(ownershipCopyArraySemanticMutants))(
  "rejects the compiling array Copy semantic mutant %s at the snapshot assertion",
  (_name, source) => {
    expectNamedBehaviorFailure(
      rustFixture(toolchain, source, ownershipCopyArrayHarness),
      "preserves_the_snapshot_and_flips_only_index_zero",
    );
  },
);

it("keeps compiler witnesses separate from behavior: moved String code is E0382 and corrected Copy pairs compile", () => {
  const repairNegative = rustFixture(
    toolchain,
    ownershipRestoreRejectionCompilerPairs.movedUse.negative,
    undefined,
  );
  expectStructuredDiagnostic(
    repairNegative,
    "E0382",
    'println!("{}", slot.is_some());',
  );
  expectPasslessCompile(
    rustFixture(
      toolchain,
      ownershipRestoreRejectionCompilerPairs.movedUse.positive,
      undefined,
    ),
  );

  const counterNegative = rustFixture(
    toolchain,
    ownershipCopyCounterCompilerPairs.stringMove.negative,
    undefined,
  );
  expectStructuredDiagnostic(counterNegative, "E0382", 'println!("{value}");');
  expectPasslessCompile(
    rustFixture(
      toolchain,
      ownershipCopyCounterCompilerPairs.stringMove.positive,
      undefined,
    ),
  );

  const arrayNegative = rustFixture(
    toolchain,
    ownershipCopyArrayCompilerPairs.stringArrayMove.negative,
    undefined,
  );
  expectStructuredDiagnostic(
    arrayNegative,
    "E0382",
    'println!("{}", values[0]);',
  );
  expectPasslessCompile(
    rustFixture(
      toolchain,
      ownershipCopyArrayCompilerPairs.stringArrayMove.positive,
      undefined,
    ),
  );
});

it("keeps the separate borrowed-local repair witness at E0515 with a compiling positive", () => {
  const result = rustFixture(
    toolchain,
    ownershipRestoreRejectionCompilerPairs.borrowedLocal.negative,
    undefined,
  );
  expectStructuredDiagnostic(result, "E0515", "text.as_str()");
  expectPasslessCompile(
    rustFixture(
      toolchain,
      ownershipRestoreRejectionCompilerPairs.borrowedLocal.positive,
      undefined,
    ),
  );
});

function expectStructuredDiagnostic(
  result: FixtureResult,
  code: string,
  sourceSpan: string,
): void {
  expect(result.compiled).toBe(false);
  expect(result.status).not.toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.stderr).toContain(`error[${code}]`);
  expect(result.stderr).toContain(sourceSpan);
  expect(result.stderr.match(/error\[[A-Z]\d+\]:/g)).toEqual([
    `error[${code}]:`,
  ]);
}

function expectNamedBehaviorFailure(
  result: FixtureResult,
  testName: string,
): void {
  expectBehaviorFailure(result);
  expect(result.stdout).toMatch(
    new RegExp(`test .*${testName.replaceAll("_", "_")} \.\.\. FAILED`),
  );
}

function expectPasslessCompile(result: FixtureResult): void {
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(0);
  expect(result.processError).toBeUndefined();
}
