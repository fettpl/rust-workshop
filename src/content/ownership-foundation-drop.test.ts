import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests, parseTests } from "../runner";
import {
  ownershipFoundationDropSteps,
  ownershipFoundationDropFixtures,
  dropSupportModule,
  nestedDropStarter,
  nestedDropCanonical,
  nestedDropValidAlternate,
  nestedDropHarness,
  nestedDropSemanticMutants,
  nestedDropCompilerPairs,
  conditionalDropStarter,
  conditionalDropCanonical,
  conditionalDropValidAlternate,
  conditionalDropHarness,
  conditionalDropSemanticMutants,
  conditionalDropCompilerPairs,
} from "./ownership-foundation-drop";

type FixtureResult = {
  compiled: boolean;
  status: number | null;
  stderr: string;
  stdout: string;
  tests?: { passed: number; failed: number };
  processError?: string;
};

type RustDiagnosticSpan = {
  file_name?: string;
  line_start?: number;
  is_primary?: boolean;
  text?: Array<{ text?: string }>;
};

type RustDiagnostic = {
  message?: string;
  level?: string;
  code?: { code?: string } | null;
  spans?: RustDiagnosticSpan[];
};

function parseRustJsonDiagnostics(stderr: string): RustDiagnostic[] {
  const lines = stderr.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.map((line) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `rustc emitted a non-JSON diagnostic line: ${line}\n${String(error)}`,
      );
    }
    if (parsed === null || typeof parsed !== "object") {
      throw new Error(`rustc diagnostic was not an object: ${line}`);
    }
    return parsed as RustDiagnostic;
  });
}

function sourceLineContaining(source: string, text: string): number {
  const line = source
    .split("\n")
    .findIndex((candidate) => candidate.includes(text));
  if (line < 0) throw new Error(`source does not contain ${text}`);
  return line + 1;
}

type FoundationToolchain = "stable" | "1.85.0";

function chooseFoundationToolchain(
  value: string | undefined,
): FoundationToolchain {
  const selected = value ?? "stable";
  if (selected !== "stable" && selected !== "1.85.0") {
    throw new Error(
      `RUST_WORKSHOP_FOUNDATION_TOOLCHAIN must be stable or 1.85.0; received ${selected}`,
    );
  }
  return selected;
}

const foundationToolchain = chooseFoundationToolchain(
  process.env.RUST_WORKSHOP_FOUNDATION_TOOLCHAIN,
);

function rustFixture(
  toolchain: FoundationToolchain,
  sourceCode: string,
  hiddenTests?: string,
): FixtureResult {
  const dir = mkdtempSync(join(tmpdir(), "ownership-foundation-drop-"));
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
        toolchain,
        "rustc",
        "--error-format=json",
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
      tests: parseTests(`${execution.stdout ?? ""}\n${execution.stderr ?? ""}`),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectPass(result: FixtureResult): void {
  expect(result.compiled).toBe(true);
  expect(result.status, result.stderr).toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.tests?.failed, result.stdout).toBe(0);
  expect(result.tests?.passed).toBeGreaterThan(0);
}

function expectBehaviorFailure(result: FixtureResult): void {
  expect(result.compiled, result.stderr).toBe(true);
  expect(result.status, result.stderr).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.tests?.failed, result.stdout).toBeGreaterThan(0);
  expect(
    (result.tests?.passed ?? 0) + (result.tests?.failed ?? 0),
  ).toBeGreaterThan(0);
}

function expectNamedBehaviorFailure(
  result: FixtureResult,
  testName: string,
): void {
  expectBehaviorFailure(result);
  expect(result.stdout).toContain(`__rust_workshop_hidden_tests::${testName}`);
}

function expectCompile(result: FixtureResult): void {
  expect(result.compiled, result.stderr).toBe(true);
  expect(result.status, result.stderr).toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
}

const nestedAssertions: Record<string, string> = {
  "missing-inner":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "wrong-order-label":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "wrong-order":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "wrong-label":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "forgotten-outer":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "constant-tuple":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "wrong-checkpoints":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "early-return-before-inner":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
  "no-lifecycle":
    "nested_scope_observes_both_checkpoints_and_reverse_drop_order",
};

const conditionalAssertions: Record<string, string> = {
  "missing-inner": "success_returns_typed_value_and_drops_inner_then_outer",
  "wrong-order-label": "success_returns_typed_value_and_drops_inner_then_outer",
  "wrong-order": "success_returns_typed_value_and_drops_inner_then_outer",
  "wrong-label": "success_returns_typed_value_and_drops_inner_then_outer",
  "forgotten-on-error": "failure_returns_typed_error_and_drops_only_outer",
  "skip-outer-on-error": "failure_returns_typed_error_and_drops_only_outer",
  "no-lifecycle": "failure_returns_typed_error_and_drops_only_outer",
  "create-inner-on-error": "failure_returns_typed_error_and_drops_only_outer",
  "count-before-drop": "success_returns_typed_value_and_drops_inner_then_outer",
  "wrong-typed-result": "failure_returns_typed_error_and_drops_only_outer",
};

it("exports the two approved scope/drop transfer steps in order", () => {
  expect(ownershipFoundationDropSteps.map((step) => step.id)).toEqual([
    "scope-nested-drop-transfer",
    "scope-conditional-drop-transfer",
  ]);
  expect(ownershipFoundationDropSteps).toHaveLength(2);
  expect(ownershipFoundationDropSteps.every((step) => step.evidenceGate)).toBe(
    true,
  );
  expect(ownershipFoundationDropSteps.map((step) => step.evidence)).toEqual([
    {
      version: 2,
      conceptIds: ["scope-drop"],
      codingTaskId: "ownership/nested-drop-timeline-v1",
    },
    {
      version: 2,
      conceptIds: ["scope-drop"],
      codingTaskId: "ownership/conditional-drop-return-v1",
    },
  ]);
});

it("keeps canonical and valid alternate implementations distinct", () => {
  expect(nestedDropCanonical).not.toEqual(nestedDropValidAlternate);
  expect(conditionalDropCanonical).not.toEqual(conditionalDropValidAlternate);
});

it("accepts only the two closed toolchain selectors before rustup can spawn", () => {
  expect(chooseFoundationToolchain(undefined)).toBe("stable");
  expect(chooseFoundationToolchain("stable")).toBe("stable");
  expect(chooseFoundationToolchain("1.85.0")).toBe("1.85.0");
  for (const invalid of ["", "nightly", "custom-rustc", "1.85.0-aarch64"]) {
    expect(() => chooseFoundationToolchain(invalid)).toThrow(
      "must be stable or 1.85.0",
    );
  }
});

it("publishes opaque support and complete named fixture groups", () => {
  expect(dropSupportModule).toContain("events: RefCell<Vec<&'static str>>");
  expect(dropSupportModule).not.toContain("pub events:");
  expect(dropSupportModule).toContain("impl Drop for Marker");
  expect(ownershipFoundationDropFixtures.nested.harness).toBe(
    nestedDropHarness,
  );
  expect(ownershipFoundationDropFixtures.conditional.harness).toBe(
    conditionalDropHarness,
  );
  expect(Object.keys(nestedDropSemanticMutants)).toEqual(
    expect.arrayContaining([
      "missing-inner",
      "wrong-order-label",
      "wrong-order",
      "wrong-label",
      "forgotten-outer",
      "constant-tuple",
      "wrong-checkpoints",
      "early-return-before-inner",
      "no-lifecycle",
    ]),
  );
  expect(Object.keys(conditionalDropSemanticMutants)).toEqual(
    expect.arrayContaining([
      "missing-inner",
      "wrong-order-label",
      "wrong-order",
      "wrong-label",
      "forgotten-on-error",
      "skip-outer-on-error",
      "no-lifecycle",
      "create-inner-on-error",
      "count-before-drop",
      "wrong-typed-result",
    ]),
  );
  expect(nestedDropCompilerPairs.directDestructor.negative).toContain(
    "marker.drop()",
  );
  expect(nestedDropCompilerPairs.directDestructor.positive).toContain(
    "std::mem::drop",
  );
  expect(conditionalDropCompilerPairs.directDestructor.negative).toContain(
    "marker.drop()",
  );
  expect(conditionalDropCompilerPairs.directDestructor.positive).toContain(
    "std::mem::drop",
  );
});

it("keeps RefCell and Drop implementation out of learner code and solutions", () => {
  for (const step of ownershipFoundationDropSteps) {
    for (const learnerSource of [step.code, step.solution]) {
      expect(learnerSource).toContain(
        "use __rust_workshop_hidden_tests::support;",
      );
      expect(learnerSource).not.toContain("RefCell");
      expect(learnerSource).not.toContain("impl Drop");
      expect(learnerSource).not.toContain("mod support");
    }
  }
  expect(nestedDropHarness).toContain("pub mod support");
  expect(conditionalDropHarness).toContain("pub mod support");
  expect(nestedDropHarness).toContain("impl Drop for Marker");
  expect(conditionalDropHarness).toContain("RefCell");
});

it("runs the nested starter as a compiling TODO, then accepts canonical and alternate", () => {
  expectBehaviorFailure(
    rustFixture(foundationToolchain, nestedDropStarter, nestedDropHarness),
  );
  expectPass(
    rustFixture(foundationToolchain, nestedDropCanonical, nestedDropHarness),
  );
  expectPass(
    rustFixture(
      foundationToolchain,
      nestedDropValidAlternate,
      nestedDropHarness,
    ),
  );
});

it("runs the conditional starter as a compiling TODO, then accepts canonical and alternate", () => {
  expectBehaviorFailure(
    rustFixture(
      foundationToolchain,
      conditionalDropStarter,
      conditionalDropHarness,
    ),
  );
  expectPass(
    rustFixture(
      foundationToolchain,
      conditionalDropCanonical,
      conditionalDropHarness,
    ),
  );
  expectPass(
    rustFixture(
      foundationToolchain,
      conditionalDropValidAlternate,
      conditionalDropHarness,
    ),
  );
});

it.each(Object.entries(nestedDropSemanticMutants))(
  "rejects compiling nested semantic mutant %s through its named contract",
  (name, source) => {
    const result = rustFixture(foundationToolchain, source, nestedDropHarness);
    expectNamedBehaviorFailure(result, nestedAssertions[name]);
    if (process.env.RUST_WORKSHOP_FOUNDATION_DROP_RECEIPTS === "1") {
      console.log(
        JSON.stringify({
          family: "nested",
          mutant: name,
          compiled: result.compiled,
          status: result.status,
          passed: result.tests?.passed,
          failed: result.tests?.failed,
        }),
      );
    }
  },
);

it.each(Object.entries(conditionalDropSemanticMutants))(
  "rejects compiling conditional semantic mutant %s through its named contract",
  (name, source) => {
    const result = rustFixture(
      foundationToolchain,
      source,
      conditionalDropHarness,
    );
    expectNamedBehaviorFailure(result, conditionalAssertions[name]);
    if (process.env.RUST_WORKSHOP_FOUNDATION_DROP_RECEIPTS === "1") {
      console.log(
        JSON.stringify({
          family: "conditional",
          mutant: name,
          compiled: result.compiled,
          status: result.status,
          passed: result.tests?.passed,
          failed: result.tests?.failed,
        }),
      );
    }
  },
);

it("keeps direct destructor diagnostics separate from the valid std::mem::drop witness", () => {
  for (const pair of [
    nestedDropCompilerPairs.directDestructor,
    conditionalDropCompilerPairs.directDestructor,
  ]) {
    const negative = rustFixture(foundationToolchain, pair.negative);
    expect(negative.compiled).toBe(false);
    expect(negative.status).toBe(1);
    const diagnostics = parseRustJsonDiagnostics(negative.stderr);
    const codedErrors = diagnostics.filter(
      (item) => item.level === "error" && item.code?.code,
    );
    expect(codedErrors).toHaveLength(1);
    expect(codedErrors.map((item) => item.code?.code)).toEqual(["E0040"]);
    expect(
      diagnostics
        .filter((item) => item.level === "error" && !item.code?.code)
        .every(
          (item) =>
            item.spans?.length === 0 &&
            item.message?.startsWith("aborting due to") === true,
        ),
    ).toBe(true);
    const diagnostic = codedErrors[0];
    expect(diagnostic.level).toBe("error");
    expect(diagnostic.code?.code).toBe("E0040");
    const primarySpans = (diagnostic.spans ?? []).filter(
      (span) => span.is_primary === true,
    );
    expect(primarySpans).toHaveLength(1);
    const [primary] = primarySpans;
    expect(primary.file_name).toMatch(/(?:^|[/\\])fixture\.rs$/);
    expect(primary.line_start).toBe(
      sourceLineContaining(pair.negative, "marker.drop();"),
    );
    expect(primary.text?.map((line) => line.text ?? "").join("\n")).toContain(
      "marker.drop();",
    );
    const positive = rustFixture(foundationToolchain, pair.positive);
    expectCompile(positive);
    if (process.env.RUST_WORKSHOP_FOUNDATION_DROP_RECEIPTS === "1") {
      console.log(
        JSON.stringify({
          family:
            pair === nestedDropCompilerPairs.directDestructor
              ? "nested"
              : "conditional",
          compilerNegative: {
            compiled: negative.compiled,
            status: negative.status,
            diagnostic: "E0040",
            structuredDiagnosticCount: diagnostics.length,
            codedErrorCodes: codedErrors.map((item) => item.code?.code),
            primaryFile: primary.file_name,
            primaryLine: primary.line_start,
            primaryText: primary.text
              ?.map((line) => line.text ?? "")
              .join("\n"),
          },
          compilerPositive: {
            compiled: positive.compiled,
            status: positive.status,
            stderrBytes: positive.stderr.length,
          },
        }),
      );
    }
  }
});
