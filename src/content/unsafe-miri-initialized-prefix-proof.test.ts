import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { expect, it, vi } from "vitest";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  const realpath = vi.fn(actual.realpathSync);
  Object.defineProperty(realpath, "native", {
    configurable: true,
    value: vi.fn(actual.realpathSync.native),
  });
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
    realpathSync: realpath,
  };
});
import {
  classifyInitializedPrefixDiagnostics,
  classifyInitializedPrefixMiri,
  classifyInitializedPrefixLibtestOutput,
  loadInitializedPrefixObservedExpectations,
  verifyInitializedPrefixEvidence,
  verifyInitializedPrefixTamperControls,
  type PrefixArchivedInput,
  type PrefixCommandRecord,
  type PrefixFileRef,
  type PrefixObservedExpectations,
  type PrefixProofManifest,
  type PrefixRecordedCommand,
  type PrefixRecipeExpectation,
  type PrefixToolchainBinding,
  type PrefixOutcome,
} from "./unsafe-miri-initialized-prefix-proof";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const hashBytes = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const hash = (value: string | Uint8Array) =>
  hashBytes(typeof value === "string" ? encoder.encode(value) : value);

function outcome(exitCode: number | null): PrefixOutcome {
  return {
    exitCode,
    signal: null,
    spawnError: null,
    timedOut: false,
    outputLimit: false,
    drainTimedOut: false,
  };
}

function reasonsJson(result: { reasons: readonly unknown[] }): string {
  return JSON.stringify(result.reasons, null, 2);
}

function lineColumn(
  bytes: Uint8Array,
  offset: number,
): { line: number; column: number } {
  const lines = decoder.decode(bytes.slice(0, offset)).split("\n");
  return {
    line: lines.length,
    column: Array.from(lines.at(-1) ?? "").length + 1,
  };
}

function primaryFor(
  sourceId: string,
  source: string,
  expression: string,
  code: string,
) {
  const bytes = encoder.encode(source);
  const byteStart = Buffer.byteLength(
    source.slice(0, source.indexOf(expression)),
  );
  const byteEnd = byteStart + Buffer.byteLength(expression);
  const start = lineColumn(bytes, byteStart);
  const end = lineColumn(bytes, byteEnd);
  return {
    code,
    primary: [
      {
        sourceId,
        sourceSha256: hash(bytes),
        byteStart,
        byteEnd,
        expression,
        line: start.line,
        columnStart: start.column,
        columnEnd: end.column,
      },
    ],
  };
}

function diagnosticRecipe(source: string): PrefixRecipeExpectation {
  return {
    id: "compile-reborrow",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [primaryFor("reborrow.rs", source, "borrowed", "E0499")],
      allowedSummaries: ["error: aborting due to 1 previous error"],
    },
  };
}

function diagnosticOutput(
  sourcePath: string,
  source: string,
  errors: readonly { code: string; expression: string }[],
): Uint8Array {
  return encoder.encode(
    `${errors
      .map(({ code, expression }) => {
        const sourceBytes = encoder.encode(source);
        const start = Buffer.byteLength(
          source.slice(0, source.indexOf(expression)),
        );
        const end = start + Buffer.byteLength(expression);
        const first = lineColumn(sourceBytes, start);
        const last = lineColumn(sourceBytes, end);
        return JSON.stringify({
          $message_type: "diagnostic",
          message: `cannot borrow (${code})`,
          level: "error",
          code: { code },
          spans: [
            {
              file_name: sourcePath,
              byte_start: start,
              byte_end: end,
              line_start: first.line,
              line_end: last.line,
              column_start: first.column,
              column_end: last.column,
              is_primary: true,
              text: [{ text: expression }],
            },
          ],
        });
      })
      .join(
        "\n",
      )}\nerror: aborting due to ${errors.length} previous error${errors.length === 1 ? "" : "s"}\n`,
  );
}

it("classifies the complete diagnostic and exact UTF-8 source span", () => {
  const source = 'fn main() {\n    let borrowed = "ż";\n}\n';
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0499", expression: "borrowed" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected: diagnosticRecipe(source),
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("binds an abort summary to error records rather than repeated primary spans", () => {
  const source = "fn main() { let borrowed = 1; }\n";
  const one = primaryFor("reborrow.rs", source, "borrowed", "E0597");
  const expected: PrefixRecipeExpectation = {
    id: "one-error-two-primary-spans",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [{ code: one.code, primary: [one.primary[0], one.primary[0]] }],
      allowedSummaries: ["error: aborting due to 1 previous error"],
    },
  };
  const record = JSON.parse(
    decoder
      .decode(
        diagnosticOutput("reborrow.rs", source, [
          { code: "E0597", expression: "borrowed" },
        ]),
      )
      .split("\n")[0],
  ) as { spans: unknown[] };
  record.spans.push(record.spans[0]);
  const output = `${JSON.stringify(record)}\n{"$message_type":"diagnostic","message":"aborting due to 1 previous error","code":null,"level":"error","spans":[],"children":[],"rendered":"error: aborting due to 1 previous error\\n"}\n`;
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: encoder.encode(output),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("accepts reordered equivalent diagnostics as an unordered multiset", () => {
  const source = "fn main() {\n    let first = 1; let second = 2;\n}\n";
  const expected: PrefixRecipeExpectation = {
    id: "two-errors",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [
        primaryFor("reborrow.rs", source, "first", "E0499"),
        primaryFor("reborrow.rs", source, "second", "E0499"),
      ],
      allowedSummaries: ["error: aborting due to 2 previous errors"],
    },
  };
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0499", expression: "second" },
      { code: "E0499", expression: "first" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("matches multiple distinct errors that share a diagnostic code", () => {
  const source = "fn main() {\n    let first = 1; let second = 2;\n}\n";
  const expected: PrefixRecipeExpectation = {
    id: "two-errors",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [
        primaryFor("reborrow.rs", source, "first", "E0499"),
        primaryFor("reborrow.rs", source, "second", "E0499"),
      ],
      allowedSummaries: ["error: aborting due to 2 previous errors"],
    },
  };
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0499", expression: "first" },
      { code: "E0499", expression: "second" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("rejects duplicate, missing, and extra primary-span multisets precisely", () => {
  const source = "fn main() {\n    let first = 1; let second = 2;\n}\n";
  const expected: PrefixRecipeExpectation = {
    id: "two-errors",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [
        primaryFor("reborrow.rs", source, "first", "E0499"),
        primaryFor("reborrow.rs", source, "second", "E0499"),
      ],
      allowedSummaries: ["error: aborting due to 2 previous errors"],
    },
  };
  const sourceFiles = {
    "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
  };
  const variants = [
    {
      label: "duplicate",
      errors: [
        { code: "E0499", expression: "first" },
        { code: "E0499", expression: "first" },
      ],
      expectedReasons: ["diagnostic-primary-mismatch"],
      forbiddenReasons: ["diagnostic-multiplicity"],
    },
    {
      label: "missing",
      errors: [{ code: "E0499", expression: "first" }],
      expectedReasons: ["diagnostic-multiplicity", "diagnostic-code-mismatch"],
      forbiddenReasons: [],
    },
    {
      label: "extra",
      errors: [
        { code: "E0499", expression: "first" },
        { code: "E0499", expression: "second" },
        { code: "E0499", expression: "first" },
      ],
      expectedReasons: ["diagnostic-multiplicity"],
      forbiddenReasons: [],
    },
  ] as const;
  for (const variant of variants) {
    const result = classifyInitializedPrefixDiagnostics({
      stdout: new Uint8Array(),
      stderr: diagnosticOutput("reborrow.rs", source, variant.errors),
      outcome: outcome(1),
      sourceFiles,
      expected,
    });
    const codes = result.reasons.map((entry) => entry.code);
    expect(result.ok, `${variant.label}: ${reasonsJson(result)}`).toBe(false);
    for (const expectedReason of variant.expectedReasons)
      expect(codes, `${variant.label}: ${reasonsJson(result)}`).toContain(
        expectedReason,
      );
    for (const forbiddenReason of variant.forbiddenReasons)
      expect(codes, `${variant.label}: ${reasonsJson(result)}`).not.toContain(
        forbiddenReason,
      );
  }
});

it("rejects an independent same-line wrong expression", () => {
  const source = "fn main() {\n    let first = 1; let second = 2;\n}\n";
  const expected: PrefixRecipeExpectation = {
    id: "one-error",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [primaryFor("reborrow.rs", source, "first", "E0499")],
      allowedSummaries: ["error: aborting due to 1 previous error"],
    },
  };
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0499", expression: "second" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toEqual(
    expect.arrayContaining([
      "diagnostic-primary-mismatch",
      "diagnostic-expression-mismatch",
    ]),
  );
});

it("separates a changed diagnostic code from multiplicity", () => {
  const source = "fn main() { let borrowed = 1; }\n";
  const expected = diagnosticRecipe(source);
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0000", expression: "borrowed" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toEqual([
    "diagnostic-code-mismatch",
  ]);
});

it("retains code and primary multiplicity as independent diagnostics", () => {
  const source = "fn main() { let first = 1; let second = 2; }\n";
  const expected: PrefixRecipeExpectation = {
    id: "two-distinct-errors",
    mode: "msrv",
    operation: "compile",
    sourceId: "reborrow.rs",
    sourceSha256: hash(source),
    expectedExitCode: 1,
    diagnostic: {
      errors: [
        primaryFor("reborrow.rs", source, "first", "E0499"),
        primaryFor("reborrow.rs", source, "second", "E0500"),
      ],
      allowedSummaries: ["error: aborting due to 2 previous errors"],
    },
  };
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: diagnosticOutput("reborrow.rs", source, [
      { code: "E0499", expression: "first" },
      { code: "E0499", expression: "first" },
    ]),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: encoder.encode(source) },
    },
    expected,
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toEqual([
    "diagnostic-code-mismatch",
    "diagnostic-multiplicity",
  ]);
});

it("accepts a source-derived same-line range mutation as primary mismatch only", () => {
  const source = "fn main() { let borrowed = 1; }\n";
  const expected = diagnosticRecipe(source);
  const value = JSON.parse(
    decoder
      .decode(
        diagnosticOutput("reborrow.rs", source, [
          { code: "E0499", expression: "borrowed" },
        ]),
      )
      .trim()
      .split("\n")[0],
  ) as Record<string, unknown>;
  const span = (value.spans as Array<Record<string, unknown>>)[0];
  const sourceBytes = encoder.encode(source);
  const end = Number(span.byte_end) + 1;
  const endLocation = lineColumn(sourceBytes, end);
  span.byte_end = end;
  span.column_end = endLocation.column;
  span.text = [{ text: "borrowed " }];
  const result = classifyInitializedPrefixDiagnostics({
    stdout: new Uint8Array(),
    stderr: encoder.encode(
      `${JSON.stringify(value)}\nerror: aborting due to 1 previous error\n`,
    ),
    outcome: outcome(1),
    sourceFiles: {
      "reborrow.rs": { path: "reborrow.rs", bytes: sourceBytes },
    },
    expected,
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect([...new Set(result.reasons.map((entry) => entry.code))]).toEqual([
    "diagnostic-primary-mismatch",
  ]);
});

function miriRecipe(source: string): PrefixRecipeExpectation {
  const expression = "bytes[0]";
  const bytes = encoder.encode(source);
  const byteStart = Buffer.byteLength(
    source.slice(0, source.indexOf(expression)),
  );
  const location = lineColumn(bytes, byteStart);
  return {
    id: "miri-ub",
    mode: "miri",
    operation: "miri-ub",
    sourceId: "skipped-write.rs",
    sourceSha256: hash(bytes),
    expectedExitCode: 1,
    miri: {
      category: "uninitialized-read",
      sourceId: "skipped-write.rs",
      sourceSha256: hash(bytes),
      expression,
      line: location.line,
      column: location.column,
      byteStart,
      byteEnd: byteStart + Buffer.byteLength(expression),
    },
  };
}

const MIRI_SOURCE =
  "fn main() {\n    let bytes = [0u8; 1];\n    let _ = bytes[0];\n}\n";
const MIRI_STDERR =
  "error: Undefined Behavior: encountered uninitialized memory\n  --> skipped-write.rs:3:13\n   |\n3  |     let _ = bytes[0];\n   |             ^^^^^^^ uninitialized-read\n";

it("requires the earliest Miri error to identify the authored forced read", () => {
  const expected = miriRecipe(MIRI_SOURCE);
  const result = classifyInitializedPrefixMiri({
    stdout: new Uint8Array(),
    stderr: encoder.encode(MIRI_STDERR),
    outcome: outcome(1),
    sourceFiles: {
      "skipped-write.rs": {
        path: "skipped-write.rs",
        bytes: encoder.encode(MIRI_SOURCE),
      },
    },
    expected,
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
  const wrongRead = classifyInitializedPrefixMiri({
    stdout: new Uint8Array(),
    stderr: encoder.encode(MIRI_STDERR.replace("bytes[0]", "bytes[1]")),
    outcome: outcome(1),
    sourceFiles: {
      "skipped-write.rs": {
        path: "skipped-write.rs",
        bytes: encoder.encode(MIRI_SOURCE),
      },
    },
    expected,
  });
  expect(wrongRead.ok, reasonsJson(wrongRead)).toBe(false);
  expect(
    wrongRead.reasons.map((entry) => entry.code),
    reasonsJson(wrongRead),
  ).toContain("miri-read-mismatch");
});

it("rejects a later valid Miri event after an unrelated first error", () => {
  const result = classifyInitializedPrefixMiri({
    stdout: new Uint8Array(),
    stderr: encoder.encode(
      `error: unsupported operation before execution\n${MIRI_STDERR}`,
    ),
    outcome: outcome(1),
    sourceFiles: {
      "skipped-write.rs": {
        path: "skipped-write.rs",
        bytes: encoder.encode(MIRI_SOURCE),
      },
    },
    expected: miriRecipe(MIRI_SOURCE),
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toEqual(
    expect.arrayContaining([
      "miri-category-mismatch",
      "miri-location-mismatch",
    ]),
  );
});

it("rejects a correctly located non-UB first Miri error", () => {
  const result = classifyInitializedPrefixMiri({
    stdout: new Uint8Array(),
    stderr: encoder.encode(
      MIRI_STDERR.replace("Undefined Behavior", "execution failure"),
    ),
    outcome: outcome(1),
    sourceFiles: {
      "skipped-write.rs": {
        path: "skipped-write.rs",
        bytes: encoder.encode(MIRI_SOURCE),
      },
    },
    expected: miriRecipe(MIRI_SOURCE),
  });
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(
    result.reasons.map((entry) => entry.code),
    reasonsJson(result),
  ).toContain("miri-category-mismatch");
});

it("accepts a decimal PID only on the exact failed test header", () => {
  const expected: PrefixRecipeExpectation = {
    id: "pid-bound",
    mode: "stable",
    operation: "tests-full",
    sourceId: "src/lib.rs",
    sourceSha256: hash("fn f() {}\n"),
    expectedExitCode: 101,
    testNames: ["__rust_workshop_hidden_tests::case06_partial_array_prefix"],
    intendedTest: "__rust_workshop_hidden_tests::case06_partial_array_prefix",
    intendedAssertion: {
      expression: "::std::assert_eq!(left, right)",
      message: "prefix bytes must equal source",
      byteStart: 12,
      byteEnd: 43,
    },
  };
  const source = "fn main() {\n    ::std::assert_eq!(left, right);\n}\n";
  const output =
    "thread '__rust_workshop_hidden_tests::case06_partial_array_prefix' (31934105) panicked at src/lib.rs:2:5:\nassertion `left == right` failed: prefix bytes must equal source\n  left: [3, 2, 1]\n  right: [1, 2, 3]\n";
  const result = classifyInitializedPrefixLibtestOutput({
    output,
    failedTestNames: new Set([expected.intendedTest!]),
    sourcePath: "src/lib.rs",
    sourceBytes: encoder.encode(source),
    intendedFailure: {
      testName: expected.intendedTest!,
      message: expected.intendedAssertion!.message,
      allowTooLongUnwrap: false,
    },
  });
  expect(result.ok, reasonsJson(result)).toBe(true);
  expect(
    classifyInitializedPrefixLibtestOutput({
      output: output.replace("(31934105)", "(not-a-pid)"),
      failedTestNames: new Set([expected.intendedTest!]),
      sourcePath: "src/lib.rs",
      sourceBytes: encoder.encode(source),
      intendedFailure: {
        testName: expected.intendedTest!,
        message: expected.intendedAssertion!.message,
        allowTooLongUnwrap: false,
      },
    }).ok,
  ).toBe(false);
});

it("binds qualified assertion macro origin to the reviewed source range", () => {
  const source =
    "fn helper() { assert_eq!(1, 2); }\nfn main() {\n    ::std::assert_eq!(left, right);\n}\n";
  const result = classifyInitializedPrefixLibtestOutput({
    output:
      "thread 'intended' (77) panicked at src/lib.rs:3:5:\nassertion `left == right` failed: expected message\n  left: 1\n  right: 2\n",
    failedTestNames: new Set(["intended"]),
    sourcePath: "src/lib.rs",
    sourceBytes: encoder.encode(source),
    intendedFailure: {
      testName: "intended",
      message: "expected message",
      allowTooLongUnwrap: false,
    },
  });
  expect(result.ok, reasonsJson(result)).toBe(true);
});

it("parses source-bound ordinary array, tuple, scalar, pointer, unwrap, and bounds bodies", () => {
  const source =
    [
      'fn case_array() { ::std::assert_eq!(out, &[1, 2, 3], "array message"); }',
      "fn case_tuple() { ::std::assert_eq!((out[0], out[1]), (10, 20)); }",
      "fn case_scalar() { ::std::assert_eq!(out.len(), 3); }",
      'fn case_pointer() { ::std::assert_eq!(out.as_ptr(), start, "pointer message"); }',
      "fn case_unwrap() { let _ = result.unwrap(); }",
      "fn case_bounds() { let _ = values[2]; }",
    ].join("\n") + "\n";
  const bytes = encoder.encode(source);
  const qualified = (name: string) => `__rust_workshop_hidden_tests::${name}`;
  const location = (name: string) => {
    const fnStart = source.indexOf(`fn ${name}`);
    const macro = source.indexOf("::std::assert", fnStart);
    if (macro >= 0)
      return lineColumn(bytes, Buffer.byteLength(source.slice(0, macro)));
    const unwrap = source.indexOf(".unwrap", fnStart);
    if (unwrap >= 0)
      return lineColumn(bytes, Buffer.byteLength(source.slice(0, unwrap + 1)));
    const bounds = source.indexOf("values[2]", fnStart);
    return lineColumn(bytes, Buffer.byteLength(source.slice(0, bounds)));
  };
  const panic = (name: string, body: string) => {
    const loc = location(name);
    return `thread '${qualified(name)}' (1234) panicked at src/lib.rs:${loc.line}:${loc.column}:\n${body}\n`;
  };
  const output = [
    panic(
      "case_array",
      "assertion `left == right` failed: array message\n  left: [3, 2, 1]\n  right: [1, 2, 3]",
    ),
    panic(
      "case_tuple",
      "assertion `left == right` failed\n  left: (30, 20)\n  right: (10, 20)",
    ),
    panic(
      "case_scalar",
      "assertion `left == right` failed\n  left: 4\n  right: 3",
    ),
    panic(
      "case_pointer",
      "assertion `left == right` failed: pointer message\n  left: 0x1054bcfa0\n  right: 0x1054bcfa0",
    ),
    panic(
      "case_unwrap",
      "called `Result::unwrap()` on an `Err` value: TooLong",
    ),
    panic(
      "case_bounds",
      "index out of bounds: the len is 2 but the index is 2",
    ),
  ].join("\n");
  const expected: PrefixRecipeExpectation = {
    id: "ordinary-bodies",
    mode: "stable",
    operation: "tests-full",
    sourceId: "src/lib.rs",
    sourceSha256: hash(bytes),
    expectedExitCode: 101,
    testNames: [
      qualified("case_array"),
      qualified("case_tuple"),
      qualified("case_scalar"),
      qualified("case_pointer"),
      qualified("case_unwrap"),
      qualified("case_bounds"),
    ],
  };
  const result = classifyInitializedPrefixLibtestOutput({
    output,
    failedTestNames: new Set(expected.testNames!),
    sourcePath: "src/lib.rs",
    sourceBytes: bytes,
  });
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
  const wrongOrder = classifyInitializedPrefixLibtestOutput({
    output: output.replace(
      "  left: [3, 2, 1]\n  right:",
      "  right: [1, 2, 3]\n  left:",
    ),
    failedTestNames: new Set(expected.testNames!),
    sourcePath: "src/lib.rs",
    sourceBytes: bytes,
  });
  expect(wrongOrder.ok, reasonsJson(wrongOrder)).toBe(false);
});

const FULL_TEST_NAMES = [
  "case01_empty_destination_and_source",
  "case02_empty_source_fresh_destination",
  "case03_empty_source_initialized_sentinel_no_write",
  "case04_one_byte_zero",
  "case05_one_byte_high",
  "case06_partial_array_prefix",
  "case07_partial_vec_prefix",
  "case08_exact_capacity",
  "case09_oversized_source_returns_error",
  "case10_oversized_source_does_not_write",
  "case11_arbitrary_zero_high_bytes",
  "case12_invalid_utf8_bytes",
  "case13_nonempty_pointer_identity_array",
  "case14_nonempty_pointer_identity_vec",
  "case15_output_length_one",
  "case16_output_length_partial",
  "case17_empty_result_has_no_identity_requirement",
  "case18_source_lifetime_independence",
  "case19_destination_reusable_after_last_borrow",
  "case20_array_capacity_one",
  "case21_vec_capacity_one",
  "case22_destination_longer_than_source",
  "case23_nonempty_destination_empty_source",
  "case24_empty_destination_oversized_source",
  "case25_prefix_order",
  "case26_prefix_exact_values",
  "case27_initialized_suffix_preserved",
  "case28_too_long_preserves_first_sentinel",
  "case29_too_long_preserves_last_sentinel",
  "case30_repeated_calls",
  "case31_two_independent_backings",
  "case32_high_byte_255_survives",
  "case33_zero_byte_in_middle_survives",
  "case34_output_is_destination_slice",
  "case35_initialized_prefix_only_is_read",
  "intended_reverse_order",
  "intended_wrong_prefix_value",
  "intended_returned_length",
  "intended_exact_capacity",
  "intended_oversized_no_write",
  "intended_suffix_preservation",
  "intended_destination_identity",
] as const;
const QUALIFIED = (name: string) => `__rust_workshop_hidden_tests::${name}`;
const FULL_QUALIFIED = FULL_TEST_NAMES.map(QUALIFIED);
const ASSERTION_EXPRESSION =
  "crate::fill_prefix(&mut dst, &[1, 2, 3]).unwrap(), &[1, 2, 3]";
const ASSERTION_MESSAGE = "reverse mutant must preserve source order";
type FixtureKind =
  | "full-valid"
  | "full-101"
  | "named-valid"
  | "named-101"
  | "named-zero"
  | "named-extra"
  | "named-chatter"
  | "named-unknown-block"
  | "named-single-token"
  | "named-inside-chatter"
  | "named-inside-single-token"
  | "named-inside-cross-test-assertion"
  | "named-wrong-origin"
  | "client-positive"
  | "control"
  | "miri-control"
  | "miri-valid";
type Fixture = {
  parent: string;
  root: string;
  externalRoot: string;
  repeatedExternalPath: string;
  manifestPath: string;
  expected: PrefixObservedExpectations;
};

function writeFixtureRef(
  root: string,
  path: string,
  value: string | Uint8Array,
): PrefixFileRef {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  writeFileSync(absolute, bytes);
  return { path: absolute, bytes: bytes.byteLength, sha256: hash(bytes) };
}

function regularFileInventory(
  root: string,
  allowTrustedSymlinks = false,
): Map<string, string> {
  const inventory = new Map<string, string>();
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink() && !allowTrustedSymlinks)
        throw new Error(`fixture inventory encountered a symlink: ${path}`);
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(path);
      else if (entry.isFile()) inventory.set(path, hash(readFileSync(path)));
      else if (entry.isSymbolicLink())
        inventory.set(path, hash(readFileSync(path)));
    }
  };
  visit(root);
  return inventory;
}

function expectInventoryUnchanged(
  before: ReadonlyMap<string, string>,
  root: string,
  allowTrustedSymlinks = false,
): void {
  const after = regularFileInventory(root, allowTrustedSymlinks);
  expect([...after.entries()]).toEqual([...before.entries()]);
}

function nativeRealpathMock(): ReturnType<typeof vi.fn> {
  return (
    fs.realpathSync as typeof fs.realpathSync & {
      native: ReturnType<typeof vi.fn>;
    }
  ).native;
}

const defaultNativeRealpathImplementation =
  nativeRealpathMock().getMockImplementation();

function withForcedLinux<T>(callback: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: "linux",
  });
  try {
    return callback();
  } finally {
    if (descriptor) Object.defineProperty(process, "platform", descriptor);
  }
}

function restoreNativeRealpathMock(): void {
  const native = nativeRealpathMock();
  native.mockReset();
  if (!defaultNativeRealpathImplementation)
    throw new Error("native realpath mock lost its default implementation");
  native.mockImplementation(defaultNativeRealpathImplementation);
}

function durableTamperPacket(
  fixture: Pick<Fixture, "parent" | "root">,
  controlId: string,
): { packet: Record<string, unknown>; copiedRoot: string } {
  const prefix = `${basename(fixture.root)}-tamper-`;
  const candidates = (
    readdirSync(fixture.parent, { withFileTypes: true }) as unknown as {
      isDirectory: () => boolean;
      name: string;
    }[]
  )
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => join(fixture.parent, entry.name))
    .filter((candidate) => existsSync(join(candidate, "control-result.json")));
  const matches = candidates.filter((candidate) => {
    try {
      const packet = JSON.parse(
        readFileSync(join(candidate, "control-result.json"), "utf8"),
      ) as Record<string, unknown>;
      return packet.controlId === controlId;
    } catch {
      return false;
    }
  });
  expect(matches).toHaveLength(1);
  const packetPath = join(matches[0], "control-result.json");
  const packet = JSON.parse(readFileSync(packetPath, "utf8")) as Record<
    string,
    unknown
  >;
  expect(packet.copiedRoot).toBe(matches[0]);
  return { packet, copiedRoot: matches[0] };
}

function copiedFixtureText(root: string): string {
  const chunks: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) chunks.push(decoder.decode(readFileSync(path)));
    }
  };
  visit(root);
  return chunks.join("\n");
}

function expectDurableMutation(
  fixture: Pick<Fixture, "parent" | "root" | "manifestPath" | "expected">,
  controlId: string,
): void {
  const { packet, copiedRoot } = durableTamperPacket(fixture, controlId);
  expect(packet.originalBaseline).toMatchObject({ ok: true, reasons: [] });
  expect(packet.copiedBaseline).toMatchObject({ ok: true, reasons: [] });
  expect(packet.baseline).toMatchObject({ ok: true, reasons: [] });
  const packetExternalBefore = packet.externalBefore as Record<string, unknown>;
  const packetExternalAfter = packet.externalAfter as Record<string, unknown>;
  expect(Object.keys(packetExternalBefore)).toEqual(
    expect.arrayContaining(
      Object.keys(packetExternalAfter).filter((path) =>
        path.includes("qualification"),
      ),
    ),
  );
  const receipt = JSON.parse(
    readFileSync(join(copiedRoot, "control-rebind-receipt.json"), "utf8"),
  ) as Record<string, unknown>;
  expect(receipt.externalReadOnly).toEqual(
    expect.arrayContaining(Object.keys(packetExternalBefore)),
  );
  if (controlId === "baseline-valid") {
    expect(packet.result).toEqual({ ok: true, reasons: [] });
    return;
  }
  expect(packet.result).toMatchObject({ ok: false });
  const text = copiedFixtureText(copiedRoot);
  switch (controlId) {
    case "mutate-outcome":
      expect(text).toContain('"exitCode": 99');
      break;
    case "mutate-stream":
      expect(text).toContain("unapproved compiler stream mutation");
      break;
    case "mutate-source":
      expect(text).toContain("retained tamper source mutation");
      break;
    case "mutate-manifest-inventory":
      expect(text).toContain("tampered-");
      break;
    case "diagnostic-code":
      expect(text).toContain('"code":{"code":"E0000"');
      break;
    case "diagnostic-primary-same-line": {
      const copiedManifestPath = join(
        copiedRoot,
        relative(fixture.root, fixture.manifestPath),
      );
      const copiedManifest = JSON.parse(
        readFileSync(copiedManifestPath, "utf8"),
      ) as PrefixProofManifest;
      const recipe = fixture.expected.recipes.find(
        (candidate) =>
          candidate.diagnostic !== undefined &&
          copiedManifest.commands.some(
            (command) => command.record.spec.recipeId === candidate.id,
          ),
      );
      expect(recipe).toBeDefined();
      const selected = copiedManifest.commands.find(
        (command) => command.record.spec.recipeId === recipe?.id,
      );
      expect(selected).toBeDefined();
      const streamRef =
        selected && selected.record.stderr.bytes > 0
          ? selected.record.stderr
          : selected?.record.stdout;
      expect(streamRef).toBeDefined();
      const copiedStreamPath = streamRef?.path ?? "";
      const streamRelativePath = relative(copiedRoot, copiedStreamPath);
      expect(streamRelativePath.startsWith(".."), streamRelativePath).toBe(
        false,
      );
      const originalStreamPath = join(fixture.root, streamRelativePath);
      const parsePrimary = (bytes: Uint8Array): Record<string, unknown> => {
        for (const line of decoder.decode(bytes).split(/\r?\n/)) {
          if (!line.trim().startsWith("{")) continue;
          try {
            const value = JSON.parse(line) as Record<string, unknown>;
            if (!Array.isArray(value.spans)) continue;
            const primary = value.spans.find(
              (candidate): candidate is Record<string, unknown> =>
                typeof candidate === "object" &&
                candidate !== null &&
                !Array.isArray(candidate) &&
                (candidate as Record<string, unknown>).is_primary === true,
            );
            if (primary) return primary;
          } catch {
            // Non-JSON compiler lines are irrelevant to this retained span.
          }
        }
        throw new Error("retained diagnostic stream has no primary span");
      };
      const changedPrimary = parsePrimary(readFileSync(copiedStreamPath));
      const originalPrimary = parsePrimary(readFileSync(originalStreamPath));
      const sourceId = recipe?.sourceId;
      const expectedSpan = recipe?.diagnostic?.errors
        .flatMap((error) => error.primary)
        .find((span) => span.sourceId === sourceId);
      expect(expectedSpan).toBeDefined();
      const sourceRef = selected?.record.spec.inputs.find((input) => {
        try {
          return relative(copiedRoot, input.path) === sourceId;
        } catch {
          return false;
        }
      });
      expect(sourceRef).toBeDefined();
      const copiedSourceBytes = readFileSync(sourceRef?.path ?? "");
      const originalSourceBytes = readFileSync(
        join(fixture.root, sourceId ?? ""),
      );
      expect(hashBytes(copiedSourceBytes)).toBe(hashBytes(originalSourceBytes));
      const spanRange = (span: Record<string, unknown>) => {
        expect(Number.isInteger(span.byte_start)).toBe(true);
        expect(Number.isInteger(span.byte_end)).toBe(true);
        const start = span.byte_start as number;
        const end = span.byte_end as number;
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThanOrEqual(start);
        expect(end).toBeLessThanOrEqual(copiedSourceBytes.byteLength);
        return { start, end };
      };
      const changedRange = spanRange(changedPrimary);
      const originalRange = spanRange(originalPrimary);
      const changedBytes = copiedSourceBytes.slice(
        changedRange.start,
        changedRange.end,
      );
      const originalBytes = originalSourceBytes.slice(
        originalRange.start,
        originalRange.end,
      );
      expect(() =>
        new TextDecoder("utf-8", { fatal: true }).decode(changedBytes),
      ).not.toThrow();
      const changedText = decoder.decode(changedBytes);
      const originalText = decoder.decode(originalBytes);
      expect(
        changedRange.start !== originalRange.start ||
          changedRange.end !== originalRange.end ||
          changedText !== originalText,
      ).toBe(true);
      expect(changedText).toContain(expectedSpan?.expression ?? "");
      const changedStart = lineColumn(copiedSourceBytes, changedRange.start);
      const changedEnd = lineColumn(copiedSourceBytes, changedRange.end);
      expect(changedStart.line).toBe(changedEnd.line);
      expect(changedStart.line).toBe(expectedSpan?.line);
      expect(changedPrimary.line_start).toBe(changedStart.line);
      expect(changedPrimary.line_end).toBe(changedEnd.line);
      expect(changedPrimary.column_start).toBe(changedStart.column);
      expect(changedPrimary.column_end).toBe(changedEnd.column);
      const changedDiagnosticText = Array.isArray(changedPrimary.text)
        ? changedPrimary.text.find(
            (entry): entry is Record<string, unknown> =>
              typeof entry === "object" &&
              entry !== null &&
              !Array.isArray(entry) &&
              typeof (entry as Record<string, unknown>).text === "string",
          )
        : undefined;
      expect(changedDiagnosticText?.text).toBe(changedText);
      break;
    }
    case "diagnostic-multiplicity": {
      const diagnosticLines = text
        .split("\n")
        .filter((line) => line.includes('"$message_type":"diagnostic"'));
      expect(diagnosticLines.length).toBeGreaterThan(1);
      break;
    }
    case "diagnostic-collateral":
      expect(text).toContain("unapproved compiler chatter");
      break;
    case "miri-wrong-read":
      expect(text).toContain("wrong-read");
      break;
    case "miri-category":
      expect(text).toContain("different category");
      break;
  }
}

function archivedInput(
  root: string,
  id: string,
  index: number,
  input: PrefixFileRef,
  kind: "source" | "executable" | "external-input",
): PrefixArchivedInput {
  const bytes =
    kind === "source"
      ? readFileSync(input.path)
      : encoder.encode(
          `${JSON.stringify({ schema: "initialized-prefix-input-hash-v1", kind, input })}\n`,
        );
  return {
    input,
    archive: writeFixtureRef(
      root,
      `commands/${id}/archive-${index}.json`,
      bytes,
    ),
  };
}

function makeFixture(
  kind: FixtureKind,
  mutateLookupEnvironment?: (env: Record<string, string>) => void,
  repeatedExternalBytes = 0,
  versionStdoutOverrides: Partial<
    Record<"rustc" | "rustdoc" | "cargo" | "rustup", string>
  > = {},
): Fixture {
  const parent = realpathSync(
    mkdtempSync(join(tmpdir(), "initialized-prefix-native-shaped-")),
  );
  const root = join(parent, "attempt");
  const externalRoot = join(parent, "declared-external");
  mkdirSync(root, { recursive: true });
  mkdirSync(externalRoot, { recursive: true });
  for (const directory of [
    "artifacts/sources",
    "artifacts/binaries",
    "commands",
    "toolchain",
    "private-cargo",
    "private-home",
    "private-target",
    "private-tmp",
  ])
    mkdirSync(join(root, directory), { recursive: true });
  for (const directory of ["bin", "qualification", "sysroot/lib/rustlib"])
    mkdirSync(join(externalRoot, directory), { recursive: true });
  const attempt = root;
  const miriMode = kind === "miri-control" || kind === "miri-valid";
  const mode = miriMode ? "miri" : "stable";
  const toolchainName = miriMode ? "nightly-2026-08-08" : "stable";
  const attemptRef = writeFixtureRef(
    root,
    "attempt.json",
    `${JSON.stringify({ schema: "initialized-prefix-attempt-v1", mode, controls: { authorized: false } })}\n`,
  );
  const config = writeFixtureRef(
    externalRoot,
    "config/cargo-config-twin.toml",
    "[net]\noffline = true\n",
  );
  const consumedConfig = writeFixtureRef(
    root,
    "private-cargo/consumed-config.toml",
    "[net]\noffline = true\n",
  );
  const rustupTarget = writeFixtureRef(
    externalRoot,
    "bin/rustup-real",
    "rustup synthetic executable\n",
  );
  const rustupAliasPath = join(externalRoot, "bin/rustup");
  symlinkSync("rustup-real", rustupAliasPath);
  const rustup: PrefixFileRef = {
    path: rustupAliasPath,
    bytes: rustupTarget.bytes,
    sha256: rustupTarget.sha256,
  };
  const rustc = writeFixtureRef(
    externalRoot,
    "bin/rustc",
    "rustc synthetic executable\n",
  );
  const rustdoc = writeFixtureRef(
    externalRoot,
    "bin/rustdoc",
    "rustdoc synthetic executable\n",
  );
  const cargo = writeFixtureRef(
    externalRoot,
    "bin/cargo",
    "cargo synthetic executable\n",
  );
  const miri = writeFixtureRef(
    externalRoot,
    "bin/miri",
    "miri synthetic executable\n",
  );
  const cargoMiri = writeFixtureRef(
    externalRoot,
    "bin/cargo-miri",
    "cargo-miri synthetic executable\n",
  );
  const versionStdout = miriMode
    ? {
        rustc:
          "rustc 1.91.0-nightly (synthetic 2026-08-08)\nrelease: 1.91.0\nchannel: nightly\ncommit-date: 2026-08-07\n",
        rustdoc:
          "rustdoc 1.91.0-nightly (synthetic 2026-08-08)\nrelease: 1.91.0\nchannel: nightly\n",
        cargo:
          "cargo 1.91.0-nightly (synthetic 2026-08-08)\nrelease: 1.91.0\nchannel: nightly\n",
        miri: "rustc 1.99.0-nightly (synthetic 2026-08-07)\n",
        "cargo-miri": "miri 0.1.0 (synthetic 2026-08-07)\n",
        rustup: "rustup 1.28.1 stable\n",
      }
    : {
        rustc: "rustc 1.90.0 stable\nrelease: 1.90.0\nchannel: stable\n",
        rustdoc: "rustdoc 1.90.0 stable\nrelease: 1.90.0\nchannel: stable\n",
        cargo: "cargo 1.90.0 stable\nrelease: 1.90.0\nchannel: stable\n",
        rustup: "rustup 1.28.1 stable\n",
      };
  Object.assign(versionStdout, versionStdoutOverrides);
  const externalQualification = writeFixtureRef(
    externalRoot,
    `qualification/${mode}.json`,
    `${JSON.stringify({
      schema: "initialized-prefix-toolchain-qualification-v1",
      mode,
      toolchain: toolchainName,
      executables: {
        rustup,
        rustc,
        rustdoc,
        cargo,
        ...(miriMode ? { miri, "cargo-miri": cargoMiri } : {}),
      },
      versionContains: Object.fromEntries(
        Object.entries(versionStdout).map(([name, stdout]) => [
          name,
          stdout.trim(),
        ]),
      ),
      ...(miriMode
        ? {
            nightlyDistributionDate: "2026-08-08",
            compilerCommitDate: "2026-08-07",
          }
        : {}),
    })}\n`,
  );
  const sysrootManifest = miriMode
    ? writeFixtureRef(
        externalRoot,
        "sysroot/manifest.json",
        '{"schema":"synthetic-miri-sysroot-v1","distribution":"2026-08-08"}\n',
      )
    : undefined;
  const sysrootFile = miriMode
    ? writeFixtureRef(
        externalRoot,
        "sysroot/lib/rustlib/libstd.rlib",
        "synthetic pinned sysroot bytes\n",
      )
    : undefined;
  const externalConfig = writeFixtureRef(
    externalRoot,
    "config/cargo-config.toml",
    repeatedExternalBytes > 0
      ? `[net]\noffline = true\n${"# repeated external input padding\n".repeat(
          Math.ceil(repeatedExternalBytes / 32),
        )}`.slice(0, repeatedExternalBytes)
      : "[net]\noffline = true\n",
  );
  const qualification = externalQualification;
  const env = {
    CARGO_HOME: join(root, "private-cargo"),
    CARGO_NET_OFFLINE: "true",
    CARGO_TARGET_DIR: join(root, "private-target"),
    HOME: join(root, "private-home"),
    PATH: join(externalRoot, "bin"),
    RUSTC: rustc.path,
    RUSTDOC: rustdoc.path,
    RUSTUP_HOME: join(root, "rustup"),
    RUSTUP_TOOLCHAIN: toolchainName,
    TMPDIR: join(root, "private-tmp"),
  };
  const metadataInputs = [config, consumedConfig, qualification];
  const externalInputs = [externalConfig];
  const allMetadata = [
    [
      "lookup-rustc",
      rustup,
      ["which", "--toolchain", toolchainName, "rustc"],
      `${rustc.path}\n`,
    ],
    [
      "lookup-rustdoc",
      rustup,
      ["which", "--toolchain", toolchainName, "rustdoc"],
      `${rustdoc.path}\n`,
    ],
    [
      "lookup-cargo",
      rustup,
      ["which", "--toolchain", toolchainName, "cargo"],
      `${cargo.path}\n`,
    ],
    ["version-rustc", rustc, ["--version", "--verbose"], versionStdout.rustc],
    [
      "version-rustdoc",
      rustdoc,
      ["--version", "--verbose"],
      versionStdout.rustdoc,
    ],
    ["version-cargo", cargo, ["--version", "--verbose"], versionStdout.cargo],
    ["version-rustup", rustup, ["--version"], versionStdout.rustup],
    ...(miriMode
      ? ([
          [
            "version-miri",
            miri,
            ["--version"],
            "miri" in versionStdout ? versionStdout.miri : "",
          ],
          [
            "version-cargo-miri",
            cargoMiri,
            ["miri", "--version"],
            "cargo-miri" in versionStdout ? versionStdout["cargo-miri"] : "",
          ],
        ] as const)
      : []),
  ] as const;
  const metadataRecords: Record<string, PrefixRecordedCommand> = {};
  for (const [key, executable, argv, stdoutText] of allMetadata) {
    const stdout = writeFixtureRef(
      root,
      `commands/${key}/stdout.txt`,
      stdoutText ?? "",
    );
    const stderr = writeFixtureRef(
      root,
      `commands/${key}/stderr.txt`,
      new Uint8Array(),
    );
    const before = [
      ...metadataInputs.map((input, index) =>
        archivedInput(root, key, index, input, "source"),
      ),
      archivedInput(root, key, metadataInputs.length, executable, "executable"),
      ...externalInputs.map((input, index) =>
        archivedInput(
          root,
          key,
          metadataInputs.length + index + 1,
          input,
          "external-input",
        ),
      ),
    ];
    const after = [
      ...metadataInputs.map((input, index) =>
        archivedInput(root, key, index + 10, input, "source"),
      ),
      ...externalInputs.map((input, index) =>
        archivedInput(
          root,
          key,
          index + metadataInputs.length + 11,
          input,
          "external-input",
        ),
      ),
      archivedInput(
        root,
        key,
        metadataInputs.length + 10,
        executable,
        "executable",
      ),
    ];
    const record: PrefixCommandRecord = {
      schema: "initialized-prefix-command-v1",
      spec: {
        id: key,
        recipeId: `toolchain-${toolchainName}-${key.startsWith("lookup-") ? "lookup" : "version"}-${key.replace(/^(?:lookup|version)-/, "")}`,
        mode,
        operation: key.startsWith("lookup-") ? "tool-locate" : "tool-version",
        executable,
        argv,
        cwd: attempt,
        env: { ...env },
        timeoutMs: 30_000,
        maxBytesPerStream: 4 * 1024 * 1024,
        inputs: metadataInputs,
        externalInputs,
      },
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:01.000Z",
      outcome: outcome(0),
      stdout,
      stderr,
      before,
      after,
      guard: { ok: true, reasons: [] },
    };
    if (key === "lookup-rustc")
      mutateLookupEnvironment?.(record.spec.env as Record<string, string>);
    metadataRecords[key] = {
      record,
      ref: writeFixtureRef(
        root,
        `commands/${key}/record.json`,
        `${JSON.stringify(record, null, 2)}\n`,
      ),
    };
  }
  const executables: Record<string, PrefixFileRef> = {
    rustup,
    rustc,
    rustdoc,
    cargo,
    ...(miriMode ? { miri, "cargo-miri": cargoMiri } : {}),
  };
  const bindingWithoutRef: Omit<PrefixToolchainBinding, "ref"> = {
    mode,
    name: toolchainName,
    rustupHome: join(root, "rustup"),
    executables,
    versions: metadataRecords,
    env,
    config: consumedConfig,
    ...(miriMode && sysrootManifest && sysrootFile
      ? {
          sysroot: {
            root: join(externalRoot, "sysroot"),
            manifest: sysrootManifest,
            files: [sysrootFile],
          },
        }
      : {}),
  };
  const binding = writeFixtureRef(
    root,
    `toolchain/${miriMode ? "nightly-2026-08-08" : "stable"}.json`,
    `${JSON.stringify(bindingWithoutRef, null, 2)}\n`,
  );
  const toolchain: PrefixToolchainBinding = {
    ...bindingWithoutRef,
    ref: binding,
  };
  const sourceText =
    kind === "control"
      ? "fn main() {\n    let borrowed = 1;\n}\n"
      : miriMode
        ? "fn main() {\n    let mut bytes = [0u8; 4];\n    unsafe { std::ptr::read_volatile(bytes.as_mut_ptr().add(2)); }\n}\n"
        : `fn main() {\n    assert_eq!(${ASSERTION_EXPRESSION}, "${ASSERTION_MESSAGE}");\n}\n`;
  const sourceId =
    kind === "control"
      ? "artifacts/sources/reborrow.rs"
      : miriMode
        ? "artifacts/miri/src/main.rs"
        : "artifacts/sources/solution-element.rs";
  const source = writeFixtureRef(root, sourceId, sourceText);
  const negativeSourceText =
    kind === "control"
      ? "fn main() { let first = 1; let second = 2; }\n"
      : undefined;
  const negativeSource = negativeSourceText
    ? writeFixtureRef(
        root,
        "artifacts/sources/reborrow-negative.rs",
        negativeSourceText,
      )
    : undefined;
  const binary = miriMode
    ? undefined
    : writeFixtureRef(
        root,
        "artifacts/binaries/initialized_prefix_element",
        "synthetic compiled test binary\n",
      );
  const cargoManifest = miriMode
    ? writeFixtureRef(
        root,
        "artifacts/miri/Cargo.toml",
        '[package]\nname = "initialized-prefix-miri"\nversion = "0.0.0"\nedition = "2024"\n',
      )
    : undefined;
  const cargoLock = miriMode
    ? writeFixtureRef(
        root,
        "artifacts/miri/Cargo.lock",
        "# synthetic offline lock\nversion = 4\n",
      )
    : undefined;
  const sourceSha = hash(sourceText);
  const negativeSourceSha = negativeSourceText
    ? hash(negativeSourceText)
    : undefined;
  const sharedInputs = [
    source,
    ...(cargoManifest && cargoLock ? [cargoManifest, cargoLock] : []),
    config,
    consumedConfig,
    qualification,
    binding,
  ];
  const negativeInputs = negativeSource
    ? [negativeSource, ...sharedInputs]
    : undefined;
  const command = (
    id: string,
    operation: PrefixCommandRecord["spec"]["operation"],
    executable: PrefixFileRef,
    argv: readonly string[],
    exitCode: number,
    stdoutText: string,
    stderrText = "",
    commandInputs = sharedInputs,
  ): PrefixRecordedCommand => {
    const stdout = writeFixtureRef(
      root,
      `commands/${id}/stdout.txt`,
      stdoutText,
    );
    const stderr = writeFixtureRef(
      root,
      `commands/${id}/stderr.txt`,
      stderrText,
    );
    const before = [
      ...commandInputs.map((input, index) =>
        archivedInput(root, id, index, input, "source"),
      ),
      archivedInput(root, id, commandInputs.length, executable, "executable"),
      ...externalInputs.map((input, index) =>
        archivedInput(
          root,
          id,
          commandInputs.length + index + 1,
          input,
          "external-input",
        ),
      ),
    ];
    const after = [
      ...commandInputs.map((input, index) =>
        archivedInput(root, id, index + 10, input, "source"),
      ),
      archivedInput(
        root,
        id,
        commandInputs.length + 10,
        executable,
        "executable",
      ),
      ...externalInputs.map((input, index) =>
        archivedInput(
          root,
          id,
          commandInputs.length + index + 11,
          input,
          "external-input",
        ),
      ),
    ];
    const record: PrefixCommandRecord = {
      schema: "initialized-prefix-command-v1",
      spec: {
        id,
        recipeId: id,
        mode,
        operation,
        executable,
        argv,
        cwd: attempt,
        env,
        timeoutMs: 180_000,
        maxBytesPerStream: 4 * 1024 * 1024,
        inputs: commandInputs,
        externalInputs,
        toolchainBinding: binding,
      },
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:01.000Z",
      outcome: outcome(exitCode),
      stdout,
      stderr,
      before,
      after,
      guard: { ok: true, reasons: [] },
    };
    return {
      record,
      ref: writeFixtureRef(
        root,
        `commands/${id}/record.json`,
        `${JSON.stringify(record, null, 2)}\n`,
      ),
    };
  };
  const compileId =
    kind === "client-positive"
      ? "client-positive-element-compile"
      : "stable-positive-element-compile";
  const compile = miriMode
    ? undefined
    : command(
        compileId,
        kind === "client-positive" ? "client-positive" : "compile",
        rustc,
        [
          "--edition=2024",
          "--crate-name",
          kind === "client-positive"
            ? "initialized_prefix_client"
            : "initialized_prefix_element",
          ...(kind === "client-positive" ? [] : ["--test"]),
          ...(kind === "client-positive" ? ["--crate-type", "bin"] : []),
          "--error-format=json",
          source.path,
          "-o",
          binary?.path ?? join(root, "artifacts/binaries/failed-compile"),
        ],
        0,
        "",
        "",
      );
  const clientNegative = miriMode
    ? command(
        "miri-client-negative",
        "client-negative",
        rustc,
        ["--edition=2024", "--error-format=json", source.path],
        1,
        "",
        decoder.decode(
          diagnosticOutput(source.path, sourceText, [
            { code: "E0499", expression: "bytes" },
          ]),
        ),
      )
    : kind === "control" && negativeSource && negativeSourceText
      ? command(
          "control-negative-client",
          "client-negative",
          rustc,
          ["--edition=2024", "--error-format=json", negativeSource.path],
          1,
          "",
          decoder.decode(
            diagnosticOutput(negativeSource.path, negativeSourceText, [
              { code: "E0499", expression: "first" },
              { code: "E0500", expression: "second" },
            ]),
          ),
          negativeInputs,
        )
      : undefined;
  const compiledOutput =
    compile && binary
      ? writeFixtureRef(
          root,
          `commands/${compileId}/compiled-output.json`,
          `${JSON.stringify({
            schema: "initialized-prefix-compiled-output-v1",
            command: compile.ref,
            source,
            output: binary,
          })}\n`,
        )
      : undefined;
  const runId = `stable-${kind}`;
  const fullLines = FULL_QUALIFIED.map((name) => `test ${name} ... ok`).join(
    "\n",
  );
  const fullValid = `${fullLines}\n\ntest result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s\n`;
  const failedLines = FULL_QUALIFIED.map((name) =>
    name.endsWith("intended_reverse_order") ||
    name.endsWith("case05_one_byte_high")
      ? `test ${name} ... FAILED`
      : `test ${name} ... ok`,
  ).join("\n");
  const full101 = `${failedLines}\n\nthread '${QUALIFIED("intended_reverse_order")}' panicked at ${source.path}:2:5:\n${ASSERTION_MESSAGE}\ntest result: FAILED. 40 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s\n`;
  const namedValid = `test ${QUALIFIED("case01_empty_destination_and_source")} ... ok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 41 filtered out; finished in 0.01s\n`;
  const named101 = `test ${QUALIFIED("intended_reverse_order")} ... FAILED\n\nthread '${QUALIFIED("intended_reverse_order")}' panicked at ${source.path}:2:5:\n${ASSERTION_MESSAGE}\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 41 filtered out; finished in 0.01s\n`;
  const namedInsideChatter = `test ${QUALIFIED("intended_reverse_order")} ... FAILED\n\n---- ${QUALIFIED("intended_reverse_order")} stdout ----\nthread '${QUALIFIED("intended_reverse_order")}' panicked at ${source.path}:2:5:\n${ASSERTION_MESSAGE}\nunreviewed setup output\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 41 filtered out; finished in 0.01s\n`;
  const namedInsideSingleToken = namedInsideChatter.replace(
    "unreviewed setup output",
    "setup",
  );
  const namedInsideCrossTestAssertion = namedInsideChatter.replace(
    "unreviewed setup output",
    "assertion `left == right` failed: another reviewed test's assertion",
  );
  const namedZero =
    "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 42 filtered out; finished in 0.01s\n";
  const namedExtra = `${namedValid}test ${QUALIFIED("case02_empty_source_fresh_destination")} ... ok\n`;
  const namedChatter = `${namedValid}warning: unrelated chatter\n`;
  const namedUnknownBlock = `${namedValid}---- unrelated_test stdout ----\nunreviewed setup output\n`;
  const namedSingleToken = `${namedValid}setup\n`;
  const namedWrongOrigin = named101.replace(
    `${source.path}:2:5`,
    `${source.path}:1:5`,
  );
  const runOutput =
    kind === "full-valid" || kind === "control"
      ? fullValid
      : kind === "full-101"
        ? full101
        : kind === "named-valid"
          ? namedValid
          : kind === "named-101"
            ? named101
            : kind === "named-zero"
              ? namedZero
              : kind === "named-extra"
                ? namedExtra
                : kind === "named-chatter"
                  ? namedChatter
                  : kind === "named-unknown-block"
                    ? namedUnknownBlock
                    : kind === "named-single-token"
                      ? namedSingleToken
                      : kind === "named-inside-chatter"
                        ? namedInsideChatter
                        : kind === "named-inside-single-token"
                          ? namedInsideSingleToken
                          : kind === "named-inside-cross-test-assertion"
                            ? namedInsideCrossTestAssertion
                            : kind === "named-wrong-origin"
                              ? namedWrongOrigin
                              : "";
  const miriExpression = "std::ptr::read_volatile(bytes.as_mut_ptr().add(2))";
  const miriOutput = `error: Undefined Behavior: uninitialized-read\n --> ${source.path}:3:14\n  |\n3 |     unsafe { ${miriExpression}; }\n  |              ^ uninitialized-read\n`;
  const runOperation = kind.startsWith("named") ? "tests-named" : "tests-full";
  const runExpectedExit =
    kind === "full-101" ||
    kind === "named-101" ||
    kind === "named-inside-chatter" ||
    kind === "named-inside-single-token" ||
    kind === "named-inside-cross-test-assertion"
      ? 101
      : 0;
  const runArgv = kind.startsWith("named")
    ? [
        "--exact",
        kind === "named-valid" ||
        kind === "named-chatter" ||
        kind === "named-unknown-block" ||
        kind === "named-single-token" ||
        kind === "named-inside-chatter" ||
        kind === "named-inside-single-token"
          ? QUALIFIED("case01_empty_destination_and_source")
          : QUALIFIED("intended_reverse_order"),
        "--test-threads=1",
        "--nocapture",
      ]
    : ["--test-threads=1", "--nocapture"];
  const run = miriMode
    ? command(
        "miri-ub",
        "miri-ub",
        cargo,
        [
          "miri",
          "run",
          "--manifest-path",
          cargoManifest?.path ?? join(root, "artifacts/miri/Cargo.toml"),
          "--offline",
          "--locked",
        ],
        1,
        miriOutput,
      )
    : kind === "client-positive"
      ? undefined
      : command(
          runId,
          runOperation,
          binary as PrefixFileRef,
          runArgv,
          runExpectedExit,
          runOutput,
          "",
          [...sharedInputs, ...(compiledOutput ? [compiledOutput] : [])],
        );
  const controlNamedRun =
    (kind === "control" || kind === "full-valid") && binary
      ? command(
          "stable-control-named",
          "tests-named",
          binary,
          [
            "--exact",
            QUALIFIED("case01_empty_destination_and_source"),
            "--test-threads=1",
            "--nocapture",
          ],
          0,
          namedValid,
          "",
          [...sharedInputs, ...(compiledOutput ? [compiledOutput] : [])],
        )
      : undefined;
  const miriPositive = miriMode
    ? command(
        "miri-positive",
        "miri-positive",
        cargo,
        [
          "miri",
          "test",
          "--manifest-path",
          cargoManifest?.path ?? join(root, "artifacts/miri/Cargo.toml"),
          "--offline",
          "--locked",
        ],
        0,
        "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s\n",
      )
    : undefined;
  const clientPositiveRun =
    kind === "client-positive" && binary
      ? command(
          "client-positive-element-run",
          "client-positive",
          binary,
          [],
          0,
          "",
          "",
          [...sharedInputs, ...(compiledOutput ? [compiledOutput] : [])],
        )
      : undefined;
  const recipes: PrefixRecipeExpectation[] = miriMode
    ? [
        {
          id: "miri-client-negative",
          mode: "miri",
          operation: "client-negative",
          sourceId,
          sourceSha256: sourceSha,
          expectedExitCode: 1,
          diagnostic: {
            errors: [primaryFor(sourceId, sourceText, "bytes", "E0499")],
            allowedSummaries: ["error: aborting due to 1 previous error"],
          },
        },
        {
          id: "miri-positive",
          mode: "miri",
          operation: "miri-positive",
          sourceId,
          sourceSha256: sourceSha,
          expectedExitCode: 0,
        },
        {
          id: "miri-ub",
          mode: "miri",
          operation: "miri-ub",
          sourceId,
          sourceSha256: sourceSha,
          expectedExitCode: 1,
          miri: {
            category: "uninitialized-read",
            sourceId,
            sourceSha256: sourceSha,
            expression: miriExpression,
            line: 3,
            column: 14,
            byteStart: Buffer.byteLength(
              sourceText.slice(0, sourceText.indexOf(miriExpression)),
            ),
            byteEnd: Buffer.byteLength(
              sourceText.slice(
                0,
                sourceText.indexOf(miriExpression) + miriExpression.length,
              ),
            ),
          },
        },
      ]
    : [
        {
          id: compileId,
          mode: "stable",
          operation: kind === "client-positive" ? "client-positive" : "compile",
          sourceId,
          sourceSha256: sourceSha,
          expectedExitCode: 0,
        },
      ];
  if (kind === "control" && negativeSource && negativeSourceSha) {
    recipes.push({
      id: "control-negative-client",
      mode: "stable",
      operation: "client-negative",
      sourceId: "artifacts/sources/reborrow-negative.rs",
      sourceSha256: negativeSourceSha,
      expectedExitCode: 1,
      diagnostic: {
        errors: [
          primaryFor(
            "artifacts/sources/reborrow-negative.rs",
            negativeSourceText ?? "",
            "first",
            "E0499",
          ),
          primaryFor(
            "artifacts/sources/reborrow-negative.rs",
            negativeSourceText ?? "",
            "second",
            "E0500",
          ),
        ],
        allowedSummaries: ["error: aborting due to 2 previous errors"],
      },
    });
  }
  if (controlNamedRun)
    recipes.push({
      id: "stable-control-named",
      mode: "stable",
      operation: "tests-named",
      sourceId,
      sourceSha256: sourceSha,
      expectedExitCode: 0,
      testNames: [QUALIFIED("case01_empty_destination_and_source")],
    });
  if (kind === "client-positive")
    recipes.push({
      id: "client-positive-element-run",
      mode: "stable",
      operation: "client-positive",
      sourceId,
      sourceSha256: sourceSha,
      expectedExitCode: 0,
    });
  if (kind !== "client-positive" && !miriMode) {
    const named = kind.startsWith("named");
    const intended =
      kind === "full-101" ||
      kind === "named-101" ||
      kind === "named-zero" ||
      kind === "named-extra" ||
      kind === "named-wrong-origin" ||
      kind === "named-inside-chatter" ||
      kind === "named-inside-single-token" ||
      kind === "named-inside-cross-test-assertion";
    recipes.push({
      id: runId,
      mode: "stable",
      operation: runOperation,
      sourceId,
      sourceSha256: sourceSha,
      expectedExitCode: runExpectedExit,
      testNames: named
        ? [
            kind === "named-valid" ||
            kind === "named-chatter" ||
            kind === "named-unknown-block" ||
            kind === "named-single-token" ||
            kind === "named-inside-chatter" ||
            kind === "named-inside-single-token"
              ? QUALIFIED("case01_empty_destination_and_source")
              : QUALIFIED("intended_reverse_order"),
          ]
        : FULL_QUALIFIED,
      ...(intended
        ? {
            intendedTest: QUALIFIED("intended_reverse_order"),
            intendedAssertion: {
              expression: ASSERTION_EXPRESSION,
              message: ASSERTION_MESSAGE,
              byteStart: Buffer.byteLength(
                sourceText.slice(0, sourceText.indexOf(ASSERTION_EXPRESSION)),
              ),
              byteEnd: Buffer.byteLength(
                sourceText.slice(
                  0,
                  sourceText.indexOf(ASSERTION_EXPRESSION) +
                    ASSERTION_EXPRESSION.length,
                ),
              ),
            },
          }
        : {}),
    });
  }
  const provenance = writeFixtureRef(
    root,
    "artifacts/proof-observations.json",
    '{"schema":"synthetic-root-reviewed-provenance"}\n',
  );
  const authored = writeFixtureRef(
    root,
    "artifacts/authored-recipes.json",
    `${JSON.stringify({ schema: "initialized-prefix-authored-recipes-v1", mode, sourceBindings: { [sourceId]: sourceSha, ...(negativeSource && negativeSourceSha ? { ["artifacts/sources/reborrow-negative.rs"]: negativeSourceSha } : {}) }, recipes }, null, 2)}\n`,
  );
  const commands = [
    ...Object.values(metadataRecords),
    ...(compile ? [compile] : []),
    ...(clientNegative ? [clientNegative] : []),
    ...(miriPositive ? [miriPositive] : []),
    ...(clientPositiveRun ? [clientPositiveRun] : []),
    ...(run ? [run] : []),
    ...(controlNamedRun ? [controlNamedRun] : []),
  ];
  const manifest: PrefixProofManifest = {
    schema: "initialized-prefix-proof-v1",
    mode,
    phase: "strict",
    attemptDirectory: attempt,
    sourceBindings: {
      [sourceId]: sourceSha,
      ...(negativeSource && negativeSourceSha
        ? { ["artifacts/sources/reborrow-negative.rs"]: negativeSourceSha }
        : {}),
    },
    toolchain,
    expectedRecipes: recipes.map((recipe) => recipe.id),
    commands,
    artifacts: [
      attemptRef,
      source,
      ...(negativeSource ? [negativeSource] : []),
      ...(cargoManifest ? [cargoManifest] : []),
      ...(cargoLock ? [cargoLock] : []),
      ...(binary ? [binary] : []),
      ...(compiledOutput ? [compiledOutput] : []),
      provenance,
      authored,
    ],
  };
  const manifestRef = writeFixtureRef(
    root,
    "proof-manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const expected: PrefixObservedExpectations = {
    schema: "initialized-prefix-observations-v1",
    adjudication: { status: "root-reviewed", provenance: [provenance] },
    sourceBindings: {
      [sourceId]: sourceSha,
      ...(negativeSource && negativeSourceSha
        ? { ["artifacts/sources/reborrow-negative.rs"]: negativeSourceSha }
        : {}),
    },
    toolchainKinds: {
      stable: { name: "stable", release: "1.90.0", channel: "stable" },
      msrv: { name: "stable", release: "1.90.0", channel: "stable" },
      miri: {
        name: "nightly-2026-08-08",
        release: "1.91.0",
        channel: "nightly",
        distributionDate: "2026-08-08",
      },
    },
    recipes,
  };
  return {
    parent,
    root,
    externalRoot,
    repeatedExternalPath: externalConfig.path,
    manifestPath: manifestRef.path,
    expected,
  };
}

function rewriteFixtureCommandRecord(
  fixture: ReturnType<typeof makeFixture>,
  commandId: string,
  mutate: (record: PrefixCommandRecord) => void,
): void {
  const manifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const mutable = manifest as unknown as {
    commands: PrefixRecordedCommand[];
  };
  const command = mutable.commands.find(
    (entry) => entry.record.spec.id === commandId,
  );
  if (!command) throw new Error(`missing fixture command ${commandId}`);
  const record = JSON.parse(
    JSON.stringify(command.record),
  ) as PrefixCommandRecord;
  mutate(record);
  const bytes = encoder.encode(`${JSON.stringify(record, null, 2)}\n`);
  writeFileSync(command.ref.path, bytes);
  command.record = record;
  command.ref = {
    ...command.ref,
    bytes: bytes.byteLength,
    sha256: hashBytes(bytes),
  };
  writeFileSync(fixture.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function rewriteFixtureArtifact(
  fixture: ReturnType<typeof makeFixture>,
  suffix: string,
  mutate: (value: Record<string, unknown>) => void,
): void {
  const manifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const mutable = manifest as unknown as { artifacts: PrefixFileRef[] };
  const artifact = mutable.artifacts.find((ref) => ref.path.endsWith(suffix));
  if (!artifact) throw new Error(`missing fixture artifact ${suffix}`);
  const value = JSON.parse(readFileSync(artifact.path, "utf8")) as Record<
    string,
    unknown
  >;
  mutate(value);
  const bytes = encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
  writeFileSync(artifact.path, bytes);
  artifact.bytes = bytes.byteLength;
  artifact.sha256 = hashBytes(bytes);
  writeFileSync(fixture.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

it("verifies a canonical absolute-ref full-42 strict fixture", () => {
  const fixture = makeFixture("full-valid");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("accepts stable compiler release lines with prerelease words only in metadata", () => {
  const metadata =
    "release: 1.90.0\nchannel: stable\nauxiliary: beta nightly dev";
  const fixture = makeFixture("full-valid", undefined, 0, {
    rustc: `rustc 1.90.0 stable\n${metadata}\n`,
    rustdoc: `rustdoc 1.90.0 stable\n${metadata}\n`,
    cargo: `cargo 1.90.0 stable\n${metadata}\n`,
    rustup: `rustup 1.28.1 stable\n${metadata}\n`,
  });
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

const stablePrereleaseCases = [
  ["rustc", "beta"],
  ["rustc", "nightly"],
  ["rustc", "dev"],
  ["rustdoc", "beta"],
  ["rustdoc", "nightly"],
  ["rustdoc", "dev"],
  ["cargo", "beta"],
  ["cargo", "nightly"],
  ["cargo", "dev"],
] as const;

it.each(stablePrereleaseCases)(
  "rejects a stable %s first-line %s release token",
  (name, channel) => {
    const version = `${name} 1.90.0-${channel} (synthetic)\nrelease: 1.90.0\nchannel: stable\n`;
    const fixture = makeFixture("full-valid", undefined, 0, {
      [name]: version,
    });
    const result = verifyInitializedPrefixEvidence(
      fixture.manifestPath,
      fixture.expected,
    );
    expect(result.ok, reasonsJson(result)).toBe(false);
    expect(
      result.reasons.map((entry) => entry.code),
      reasonsJson(result),
    ).toContain("toolchain-version-mismatch");
  },
);

it("verifies the finite Miri run fixture with the reviewed direct-run argv", () => {
  const fixture = makeFixture("miri-valid");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("accepts full-101 evidence with the intended and an ordinary failure", () => {
  const fixture = makeFixture("full-101");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("accepts named-1 valid evidence with exactly 41 filtered tests", () => {
  const fixture = makeFixture("named-valid");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("accepts named-101 evidence and binds the authored macro invocation", () => {
  const fixture = makeFixture("named-101");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it.each([
  ["named-zero", "test-inventory-mismatch"],
  ["named-extra", "test-identity-extra"],
  ["named-chatter", "unexpected-collateral"],
  ["named-unknown-block", "unexpected-collateral"],
  ["named-single-token", "unexpected-collateral"],
  ["named-inside-chatter", "unexpected-collateral"],
  ["named-inside-single-token", "unexpected-collateral"],
  ["named-inside-cross-test-assertion", "unexpected-collateral"],
  ["named-wrong-origin", "assertion-origin-mismatch"],
] as const)("rejects named fixture %s for %s", (kind, reasonCode) => {
  const fixture = makeFixture(kind);
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(
    result.reasons.map((entry) => entry.code),
    reasonsJson(result),
  ).toContain(reasonCode);
});

it("fails closed for malformed nested diagnostic and test expectation JSON", () => {
  const fixture = makeFixture("control");
  const malformed = JSON.parse(JSON.stringify(fixture.expected)) as Record<
    string,
    unknown
  >;
  const recipe = (malformed.recipes as Array<Record<string, unknown>>)[0];
  recipe.diagnostic = { errors: "not-an-array", allowedSummaries: [] };
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    malformed as unknown as PrefixObservedExpectations,
  );
  expect(result.ok, reasonsJson(result)).toBe(false);
  expect(
    result.reasons.map((entry) => entry.code),
    reasonsJson(result),
  ).toContain("malformed-observations");
});

it("rejects unindexed files and canonical outside-attempt artifact aliases", () => {
  const unindexed = makeFixture("named-valid");
  writeFixtureRef(unindexed.root, "artifacts/unindexed-extra.bin", "extra\n");
  const unindexedResult = verifyInitializedPrefixEvidence(
    unindexed.manifestPath,
    unindexed.expected,
  );
  expect(unindexedResult.ok, reasonsJson(unindexedResult)).toBe(false);
  expect(
    unindexedResult.reasons.map((entry) => entry.code),
    reasonsJson(unindexedResult),
  ).toContain("unindexed-artifact");

  const outside = makeFixture("named-valid");
  const rogue = writeFixtureRef(
    outside.externalRoot,
    "rogue/unregistered-artifact.bin",
    "outside attempt\n",
  );
  const manifest = JSON.parse(
    readFileSync(outside.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  manifest.artifacts = [...manifest.artifacts, rogue];
  writeFileSync(outside.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const outsideResult = verifyInitializedPrefixEvidence(
    outside.manifestPath,
    outside.expected,
  );
  expect(outsideResult.ok, reasonsJson(outsideResult)).toBe(false);
  expect(
    outsideResult.reasons.map((entry) => entry.code),
    reasonsJson(outsideResult),
  ).toContain("reference-outside-attempt");

  const symlinked = makeFixture("named-valid");
  const target = writeFixtureRef(
    symlinked.externalRoot,
    "rogue/symlink-target.bin",
    "symlink escape\n",
  );
  const aliasPath = join(symlinked.root, "artifacts/symlinked-artifact.bin");
  symlinkSync(target.path, aliasPath);
  const symlinkManifest = JSON.parse(
    readFileSync(symlinked.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  symlinkManifest.artifacts = [
    ...symlinkManifest.artifacts,
    { path: aliasPath, bytes: target.bytes, sha256: target.sha256 },
  ];
  writeFileSync(
    symlinked.manifestPath,
    `${JSON.stringify(symlinkManifest, null, 2)}\n`,
  );
  const symlinkResult = verifyInitializedPrefixEvidence(
    symlinked.manifestPath,
    symlinked.expected,
  );
  expect(symlinkResult.ok, reasonsJson(symlinkResult)).toBe(false);
  expect(
    symlinkResult.reasons.map((entry) => entry.code),
    reasonsJson(symlinkResult),
  ).toContain("reference-outside-attempt");
});

it("keeps a client-positive compile argv and v4 binary receipt operation-specific", () => {
  const fixture = makeFixture("client-positive");
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result, reasonsJson(result)).toEqual({ ok: true, reasons: [] });
});

it("records the generated binary as an owned archived command input", () => {
  const fixture = makeFixture("client-positive");
  const manifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const compile = manifest.commands.find(
    (entry) => entry.record.spec.operation === "client-positive",
  );
  const run = manifest.commands.find(
    (entry) => entry.record.spec.id === "client-positive-element-run",
  );
  expect(compile).toBeDefined();
  expect(run).toBeDefined();
  const executable = run?.record.spec.executable;
  expect(executable?.path).toContain("artifacts/binaries/");
  expect(
    run?.record.before.some(
      (archived) =>
        archived.input.path === executable?.path &&
        archived.input.sha256 === executable?.sha256,
    ),
  ).toBe(true);
  const sidecar = manifest.artifacts.find((ref) =>
    ref.path.endsWith(
      "commands/client-positive-element-compile/compiled-output.json",
    ),
  );
  expect(sidecar).toBeDefined();
  expect(JSON.parse(readFileSync(sidecar?.path ?? "", "utf8"))).toMatchObject({
    output: executable,
    command: compile?.ref,
  });
});

it("gates source-dependent semantics after a source-byte binding failure", () => {
  const fixture = makeFixture("named-101");
  const manifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const source = manifest.artifacts.find((ref) =>
    ref.path.endsWith("artifacts/sources/solution-element.rs"),
  );
  expect(source).toBeDefined();
  writeFileSync(
    source?.path ?? "",
    `${readFileSync(source?.path ?? "", "utf8")}\n// source bytes changed\n`,
  );
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  const codes = result.reasons.map((entry) => entry.code);
  expect(codes).toContain("source-binding-mismatch");
  expect(codes).not.toContain("command-argv-mismatch");
  expect(
    codes.some((code) =>
      /^(?:assertion-|diagnostic-|miri-|unexpected-collateral|test-)/.test(
        code,
      ),
    ),
  ).toBe(false);
});

it("rejects a wrong compile source argv independently of source binding", () => {
  const fixture = makeFixture("full-valid");
  rewriteFixtureCommandRecord(
    fixture,
    "stable-positive-element-compile",
    (record) => {
      record.spec = {
        ...record.spec,
        argv: record.spec.argv.map((arg) =>
          arg.endsWith("artifacts/sources/solution-element.rs")
            ? `${arg}.wrong`
            : arg,
        ),
      };
    },
  );
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result.ok).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toContain(
    "command-argv-mismatch",
  );
  expect(result.reasons.map((entry) => entry.code)).not.toContain(
    "source-binding-mismatch",
  );
});

it("rejects a compiled-output receipt with an unrelated source identity", () => {
  const fixture = makeFixture("client-positive");
  rewriteFixtureArtifact(
    fixture,
    "commands/client-positive-element-compile/compiled-output.json",
    (receipt) => {
      const source = receipt.source as Record<string, unknown>;
      source.sha256 = "0".repeat(64);
    },
  );
  const result = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(result.ok).toBe(false);
  expect(result.reasons.map((entry) => entry.code)).toContain(
    "compiled-output-source-mismatch",
  );
});

it(
  "uses bounded local indexes for repeated artifact lookups",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("control");
    const externalBefore = regularFileInventory(fixture.externalRoot, true);
    const manifest = JSON.parse(
      readFileSync(fixture.manifestPath, "utf8"),
    ) as PrefixProofManifest;
    const padding = Array.from({ length: 256 }, (_, index) =>
      writeFixtureRef(
        fixture.root,
        `artifacts/index-padding-${index}.bin`,
        `padding-${index}\n`,
      ),
    );
    manifest.artifacts = [...padding, ...manifest.artifacts];
    writeFileSync(fixture.manifestPath, `${JSON.stringify(manifest)}\n`);
    const realpath = vi.mocked(fs.realpathSync);
    const native = nativeRealpathMock();
    realpath.mockClear();
    native.mockClear();
    const result = verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    expect(result[0]).toMatchObject({
      id: "baseline-valid",
      rejected: false,
      reasons: [],
    });
    expect(result).toHaveLength(9);
    expect(result.slice(1).every((control) => control.rejected)).toBe(true);
    expectInventoryUnchanged(externalBefore, fixture.externalRoot, true);
    expect(realpath.mock.calls.length + native.mock.calls.length).toBeLessThan(
      285_000,
    );
  },
);

it(
  "mutates the reviewed Miri category phrase from native stderr",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("miri-control");
    const manifest = JSON.parse(
      readFileSync(fixture.manifestPath, "utf8"),
    ) as PrefixProofManifest;
    const command = manifest.commands.find(
      (entry) => entry.record.spec.id === "miri-ub",
    );
    expect(command).toBeDefined();
    if (!command) return;
    const recipe = fixture.expected.recipes.find(
      (entry) => entry.id === "miri-ub",
    );
    const sourcePath = command.record.spec.inputs.find((ref) =>
      ref.path.endsWith("artifacts/miri/src/main.rs"),
    )?.path;
    expect(recipe?.miri?.expression).toBeDefined();
    expect(sourcePath).toBeDefined();
    if (!recipe?.miri?.expression || !sourcePath) return;
    const stderr = `error: Undefined Behavior: reading memory at alloc224[0x0..0x1], but memory is uninitialized at [0x0..0x1], and this operation requires initialized memory\n  --> ${sourcePath}:3:14\n   |\n3  |     unsafe { ${recipe.miri.expression}; }\n   |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Undefined Behavior occurred here\n`;
    const bytes = encoder.encode(stderr);
    writeFileSync(command.record.stderr.path, bytes);
    command.record.stderr = {
      ...command.record.stderr,
      bytes: bytes.byteLength,
      sha256: hashBytes(bytes),
    };
    const stdout = encoder.encode(
      "WARNING: Ignoring `RUSTC` environment variable; set `MIRI` if you want to control the binary used as the driver.\n",
    );
    writeFileSync(command.record.stdout.path, stdout);
    command.record.stdout = {
      ...command.record.stdout,
      bytes: stdout.byteLength,
      sha256: hashBytes(stdout),
    };
    const recordBytes = encoder.encode(
      `${JSON.stringify(command.record, null, 2)}\n`,
    );
    writeFileSync(command.ref.path, recordBytes);
    command.ref = {
      ...command.ref,
      bytes: recordBytes.byteLength,
      sha256: hashBytes(recordBytes),
    };
    writeFileSync(
      fixture.manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const originalAttempt = regularFileInventory(fixture.root);
    const originalExternal = regularFileInventory(fixture.externalRoot, true);

    const result = verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    expect(result).toHaveLength(11);
    expect(result[0]).toEqual({
      id: "baseline-valid",
      rejected: false,
      reasons: [],
    });
    expect(result.slice(1).every((entry) => entry.rejected)).toBe(true);
    const category = result.find((entry) => entry.id === "miri-category");
    expect(category).toBeDefined();
    expect(category?.rejected).toBe(true);
    expect(category?.reasons.map((entry) => entry.code)).toEqual([
      "miri-category-mismatch",
    ]);
    expectInventoryUnchanged(originalAttempt, fixture.root);
    expectInventoryUnchanged(originalExternal, fixture.externalRoot, true);
  },
);

it("keeps the observed expectation loader undefined until root adjudication", () => {
  expect(loadInitializedPrefixObservedExpectations()).toBeUndefined();
});

// Root runs these only after independent source-confinement review and a separate GO.
it("proof-control-stable-tamper-controls", { timeout: 30_000 }, () => {
  const fixture = makeFixture("control");
  const originalAttempt = regularFileInventory(fixture.root);
  const originalExternal = regularFileInventory(fixture.externalRoot, true);
  const result = verifyInitializedPrefixTamperControls({
    manifestPath: fixture.manifestPath,
    expected: fixture.expected,
    evidenceDirectory: fixture.root,
  });
  const expectedIds = [
    "baseline-valid",
    "mutate-outcome",
    "mutate-stream",
    "mutate-source",
    "mutate-manifest-inventory",
    "diagnostic-code",
    "diagnostic-primary-same-line",
    "diagnostic-multiplicity",
    "diagnostic-collateral",
  ] as const;
  expect(result.map((control) => control.id)).toEqual([...expectedIds]);
  expect(new Set(result.map((control) => control.id)).size).toBe(
    expectedIds.length,
  );
  const baseline = result.find((control) => control.id === "baseline-valid");
  expect(baseline).toEqual({
    id: "baseline-valid",
    rejected: false,
    reasons: [],
  });
  const expectedReasonSets: Record<
    (typeof expectedIds)[number],
    readonly string[]
  > = {
    "baseline-valid": [],
    "mutate-outcome": ["exit-code-mismatch"],
    "mutate-stream": ["unexpected-collateral"],
    "mutate-source": ["source-binding-mismatch"],
    "mutate-manifest-inventory": ["recipe-inventory-mismatch"],
    "diagnostic-code": ["diagnostic-code-mismatch"],
    "diagnostic-primary-same-line": ["diagnostic-primary-mismatch"],
    "diagnostic-multiplicity": ["diagnostic-multiplicity"],
    "diagnostic-collateral": ["unexpected-collateral"],
  };
  for (const control of result) {
    const expectedReasons =
      expectedReasonSets[control.id as (typeof expectedIds)[number]];
    expect(control.rejected, JSON.stringify(control.reasons)).toBe(
      expectedReasons.length > 0,
    );
    expect(
      [...new Set(control.reasons.map((entry) => entry.code))].sort(),
      JSON.stringify(control.reasons),
    ).toEqual([...expectedReasons].sort());
    expectDurableMutation(fixture, control.id);
  }
  expectInventoryUnchanged(originalAttempt, fixture.root);
  expectInventoryUnchanged(originalExternal, fixture.externalRoot, true);
});

it("keeps the existing tamper-control contract when no checkpoint is provided", () => {
  const fixture = makeFixture("control");
  const result = verifyInitializedPrefixTamperControls({
    manifestPath: fixture.manifestPath,
    expected: fixture.expected,
    evidenceDirectory: fixture.root,
  });
  expect(result.map((control) => control.id)).toEqual([
    "baseline-valid",
    "mutate-outcome",
    "mutate-stream",
    "mutate-source",
    "mutate-manifest-inventory",
    "diagnostic-code",
    "diagnostic-primary-same-line",
    "diagnostic-multiplicity",
    "diagnostic-collateral",
  ]);
  expect(result.slice(1).every((control) => control.rejected)).toBe(true);
});

it("reports before and after checkpoints in exact control order", () => {
  const fixture = makeFixture("control");
  const checkpoints: string[] = [];
  const result = verifyInitializedPrefixTamperControls({
    manifestPath: fixture.manifestPath,
    expected: fixture.expected,
    evidenceDirectory: fixture.root,
    checkpoint: ({ controlID, phase }) => {
      checkpoints.push(`${phase}:${controlID}`);
    },
  });
  const controlIDs = result.map((control) => control.id);
  expect(checkpoints).toEqual(
    controlIDs.flatMap((controlID) => [
      `before:${controlID}`,
      `after:${controlID}`,
    ]),
  );
});

it("propagates a before-checkpoint failure before creating the next clone", () => {
  const fixture = makeFixture("control");
  const original = regularFileInventory(fixture.root);
  const external = regularFileInventory(fixture.externalRoot, true);
  const checkpoints: string[] = [];
  expect(() =>
    verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
      checkpoint: ({ controlID, phase }) => {
        checkpoints.push(`${phase}:${controlID}`);
        if (phase === "before" && controlID === "mutate-outcome")
          throw new Error("checkpoint before second control");
      },
    }),
  ).toThrow("checkpoint before second control");
  expect(checkpoints).toEqual([
    "before:baseline-valid",
    "after:baseline-valid",
    "before:mutate-outcome",
  ]);
  expectDurableMutation(fixture, "baseline-valid");
  expect(() => durableTamperPacket(fixture, "mutate-outcome")).toThrow();
  expectInventoryUnchanged(original, fixture.root);
  expectInventoryUnchanged(external, fixture.externalRoot, true);
});

it("propagates an after-checkpoint failure only after the control packet is durable", () => {
  const fixture = makeFixture("control");
  const original = regularFileInventory(fixture.root);
  const external = regularFileInventory(fixture.externalRoot, true);
  const checkpoints: string[] = [];
  expect(() =>
    verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
      checkpoint: ({ controlID, phase }) => {
        checkpoints.push(`${phase}:${controlID}`);
        if (phase === "after" && controlID === "mutate-outcome")
          throw new Error("checkpoint after completed control");
      },
    }),
  ).toThrow("checkpoint after completed control");
  expect(checkpoints).toEqual([
    "before:baseline-valid",
    "after:baseline-valid",
    "before:mutate-outcome",
    "after:mutate-outcome",
  ]);
  expectDurableMutation(fixture, "baseline-valid");
  expectDurableMutation(fixture, "mutate-outcome");
  expectInventoryUnchanged(original, fixture.root);
  expectInventoryUnchanged(external, fixture.externalRoot, true);
});

it("falls back to a fresh legacy realpath after a native resolver error", () => {
  const fixture = makeFixture("full-valid");
  const realpath = vi.mocked(fs.realpathSync);
  const native = nativeRealpathMock();
  const nativeFailure = new Error("synthetic native realpath failure");
  native.mockReset();
  native.mockImplementation(() => {
    throw nativeFailure;
  });
  realpath.mockClear();
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixEvidence(fixture.manifestPath, fixture.expected),
    );
    expect(result).toEqual({ ok: true, reasons: [] });
    expect(native).toHaveBeenCalled();
    expect(realpath).toHaveBeenCalled();
  } finally {
    restoreNativeRealpathMock();
  }
});

it("preserves the legacy error contract when native and legacy resolution fail", () => {
  const fixture = makeFixture("full-valid");
  const realpath = vi.mocked(fs.realpathSync);
  const native = nativeRealpathMock();
  const legacyImplementation = realpath.getMockImplementation();
  expect(legacyImplementation).toBeDefined();
  native.mockReset();
  native.mockImplementation(() => {
    throw new Error("synthetic native ELOOP");
  });
  realpath.mockImplementation((path, options) => {
    if (path === fixture.root) throw new Error("synthetic legacy ELOOP");
    return legacyImplementation?.(path, options) as string;
  });
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixTamperControls({
        manifestPath: fixture.manifestPath,
        expected: fixture.expected,
        evidenceDirectory: fixture.root,
      }),
    );
    expect(result).toEqual([
      {
        id: "baseline-error",
        rejected: false,
        reasons: [
          {
            code: "tamper-baseline-error",
            message: "synthetic legacy ELOOP",
          },
        ],
      },
    ]);
    expect(native).toHaveBeenCalled();
    expect(realpath).toHaveBeenCalledWith(fixture.root);
  } finally {
    realpath.mockReset();
    realpath.mockImplementation(legacyImplementation!);
    restoreNativeRealpathMock();
  }
});

it("resolves a freshly retargeted external symlink for the next control", () => {
  const fixture = makeFixture("control");
  const original = regularFileInventory(fixture.root);
  const alias = join(fixture.externalRoot, "bin/rustup");
  const alternate = join(fixture.externalRoot, "bin/rustup-alt");
  writeFileSync(
    alternate,
    readFileSync(join(fixture.externalRoot, "bin/rustup-real")),
  );
  const external = regularFileInventory(fixture.externalRoot, true);
  const native = nativeRealpathMock();
  native.mockClear();
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixTamperControls({
        manifestPath: fixture.manifestPath,
        expected: fixture.expected,
        evidenceDirectory: fixture.root,
        checkpoint: ({ controlID, phase }) => {
          if (controlID === "baseline-valid" && phase === "after") {
            unlinkSync(alias);
            symlinkSync("rustup-alt", alias);
          }
        },
      }),
    );
    expect(result).toHaveLength(9);
    expect(result.slice(1).every((control) => control.rejected)).toBe(true);
    const packet = durableTamperPacket(fixture, "mutate-outcome").packet;
    const entries = packet.externalBeforeEntries as {
      qualifiedRef?: { path?: string };
      canonicalIdentity?: string;
    }[];
    const rustupEntry = entries.find(
      (entry) => entry.qualifiedRef?.path === alias,
    );
    expect(rustupEntry?.canonicalIdentity).toBe(alternate);
    expectInventoryUnchanged(original, fixture.root);
    expectInventoryUnchanged(external, fixture.externalRoot, true);
  } finally {
    if (existsSync(alias)) unlinkSync(alias);
    symlinkSync("rustup-real", alias);
    restoreNativeRealpathMock();
  }
});

it("rejects a symlink escape from the selected evidence root", () => {
  const fixture = makeFixture("full-valid");
  const outside = join(fixture.parent, "outside-sentinel");
  const escape = join(fixture.root, "private-tmp/escape");
  writeFileSync(outside, "outside\n");
  symlinkSync(outside, escape);
  const external = regularFileInventory(fixture.externalRoot, true);
  const native = nativeRealpathMock();
  native.mockClear();
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixTamperControls({
        manifestPath: fixture.manifestPath,
        expected: fixture.expected,
        evidenceDirectory: fixture.root,
      }),
    );
    expect(result).toEqual([
      {
        id: "baseline-error",
        rejected: false,
        reasons: [
          {
            code: "tamper-baseline-error",
            message: "evidence symlink is not allowed: " + escape,
          },
        ],
      },
    ]);
    expectInventoryUnchanged(external, fixture.externalRoot, true);
  } finally {
    restoreNativeRealpathMock();
  }
});

it("accepts UTF-8 paths through the native-first resolver", () => {
  const fixture = makeFixture("full-valid");
  const alias = join(fixture.externalRoot, "bin/rustup");
  const unicodeTarget = join(fixture.externalRoot, "bin/rüstup-éxecutable");
  writeFileSync(
    unicodeTarget,
    readFileSync(join(fixture.externalRoot, "bin/rustup-real")),
  );
  unlinkSync(alias);
  symlinkSync("rüstup-éxecutable", alias);
  const native = nativeRealpathMock();
  native.mockClear();
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixEvidence(fixture.manifestPath, fixture.expected),
    );
    expect(result).toEqual({ ok: true, reasons: [] });
    expect(native).toHaveBeenCalled();
  } finally {
    restoreNativeRealpathMock();
  }
});

it("handles long symlink chains and nested missing or broken targets", () => {
  const chained = makeFixture("full-valid");
  const alias = join(chained.externalRoot, "bin/rustup");
  const target = join(chained.externalRoot, "bin/rustup-chain-target");
  writeFileSync(
    target,
    readFileSync(join(chained.externalRoot, "bin/rustup-real")),
  );
  for (let index = 15; index >= 0; index -= 1) {
    const link = join(chained.externalRoot, `bin/rustup-chain-${index}`);
    const destination =
      index === 15 ? "rustup-chain-target" : `rustup-chain-${index + 1}`;
    symlinkSync(destination, link);
  }
  unlinkSync(alias);
  symlinkSync("rustup-chain-0", alias);
  const native = nativeRealpathMock();
  native.mockClear();
  try {
    const result = withForcedLinux(() =>
      verifyInitializedPrefixEvidence(chained.manifestPath, chained.expected),
    );
    expect(result).toEqual({ ok: true, reasons: [] });
    expect(native).toHaveBeenCalled();
  } finally {
    restoreNativeRealpathMock();
  }

  const missing = makeFixture("full-valid");
  const missingAlias = join(missing.externalRoot, "bin/rustup");
  unlinkSync(missingAlias);
  symlinkSync("nested/missing/rustup", missingAlias);
  const missingResult = withForcedLinux(() =>
    verifyInitializedPrefixEvidence(missing.manifestPath, missing.expected),
  );
  expect(missingResult.ok).toBe(false);
  expect(missingResult.reasons.length).toBeGreaterThan(0);

  const broken = makeFixture("full-valid");
  const brokenAlias = join(broken.externalRoot, "bin/rustup");
  mkdirSync(join(broken.externalRoot, "nested"), { recursive: true });
  unlinkSync(brokenAlias);
  symlinkSync("nested/broken/rustup", brokenAlias);
  const brokenResult = withForcedLinux(() =>
    verifyInitializedPrefixEvidence(broken.manifestPath, broken.expected),
  );
  expect(brokenResult.ok).toBe(false);
  expect(brokenResult.reasons.length).toBeGreaterThan(0);
});

it("proof-control-stable-outside-write-denial", { timeout: 30_000 }, () => {
  const fixture = makeFixture("full-valid");
  const sentinel = writeFixtureRef(
    fixture.externalRoot,
    "sentinel/outside-write.txt",
    "immutable sentinel\n",
  );
  const sentinelBefore = readFileSync(sentinel.path);
  const outsideManifest = writeFixtureRef(
    fixture.parent,
    "manifest-outside-attempt.json",
    readFileSync(fixture.manifestPath),
  );
  const traversalManifest = join(
    fixture.root,
    "..",
    "manifest-outside-attempt.json",
  );
  const symlinkManifest = join(fixture.root, "manifest-symlink.json");
  symlinkSync(outsideManifest.path, symlinkManifest);
  for (const manifestPath of [
    outsideManifest.path,
    traversalManifest,
    symlinkManifest,
  ]) {
    const result = verifyInitializedPrefixTamperControls({
      manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("baseline-error");
    expect(result[0].rejected).toBe(false);
    expect(result[0].reasons.map((entry) => entry.code)).toContain(
      "tamper-baseline-error",
    );
    expect(readFileSync(sentinel.path)).toEqual(sentinelBefore);
  }
});

it(
  "proof-control-miri-inventory-and-reason-specific-cases",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("miri-control", undefined, 128 * 1024);
    const originalAttempt = regularFileInventory(fixture.root);
    const originalExternal = regularFileInventory(fixture.externalRoot, true);
    const result = verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    const expectedIds = [
      "baseline-valid",
      "mutate-outcome",
      "mutate-stream",
      "mutate-source",
      "mutate-manifest-inventory",
      "diagnostic-code",
      "diagnostic-primary-same-line",
      "diagnostic-multiplicity",
      "diagnostic-collateral",
      "miri-wrong-read",
      "miri-category",
    ] as const;
    expect(result.map((control) => control.id)).toEqual([...expectedIds]);
    expect(new Set(result.map((control) => control.id)).size).toBe(
      expectedIds.length,
    );
    const baseline = result.find((control) => control.id === "baseline-valid");
    expect(baseline).toEqual({
      id: "baseline-valid",
      rejected: false,
      reasons: [],
    });
    const expectedReasonSets: Record<
      (typeof expectedIds)[number],
      readonly string[]
    > = {
      "baseline-valid": [],
      "mutate-outcome": ["exit-code-mismatch"],
      "mutate-stream": ["unexpected-collateral"],
      "mutate-source": ["source-binding-mismatch"],
      "mutate-manifest-inventory": ["recipe-inventory-mismatch"],
      "diagnostic-code": ["diagnostic-code-mismatch"],
      "diagnostic-primary-same-line": ["diagnostic-primary-mismatch"],
      "diagnostic-multiplicity": ["diagnostic-multiplicity"],
      "diagnostic-collateral": ["unexpected-collateral"],
      "miri-wrong-read": ["miri-read-mismatch"],
      "miri-category": ["miri-category-mismatch"],
    };
    for (const control of result) {
      const expectedReasons =
        expectedReasonSets[control.id as (typeof expectedIds)[number]];
      expect(control.rejected, JSON.stringify(control.reasons)).toBe(
        expectedReasons.length > 0,
      );
      expect(
        [...new Set(control.reasons.map((entry) => entry.code))].sort(),
        JSON.stringify(control.reasons),
      ).toEqual([...expectedReasons].sort());
      expectDurableMutation(fixture, control.id);
    }
    expectInventoryUnchanged(originalAttempt, fixture.root);
    expectInventoryUnchanged(originalExternal, fixture.externalRoot, true);
  },
);

it(
  "refreshes repeated external references once per canonical path per pass",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("miri-control", undefined, 128 * 1024);
    const originalAttempt = regularFileInventory(fixture.root);
    const originalExternal = regularFileInventory(fixture.externalRoot, true);
    const originalExternalBytes = readFileSync(fixture.repeatedExternalPath);
    const readFileSpy = vi.mocked(fs.readFileSync);
    readFileSpy.mockClear();

    try {
      const result = verifyInitializedPrefixTamperControls({
        manifestPath: fixture.manifestPath,
        expected: fixture.expected,
        evidenceDirectory: fixture.root,
      });

      expect(
        result.every(
          (control) => control.rejected || control.reasons.length === 0,
        ),
      ).toBe(true);
      const repeatedExternalReads = readFileSpy.mock.calls.filter(
        ([path]) => String(path) === fixture.repeatedExternalPath,
      ).length;
      expect(repeatedExternalReads).toBeGreaterThan(0);
      expect(repeatedExternalReads).toBeLessThan(2_500);

      writeFileSync(
        fixture.repeatedExternalPath,
        new Uint8Array([...originalExternalBytes, 0x0a]),
      );
      const changedResult = verifyInitializedPrefixTamperControls({
        manifestPath: fixture.manifestPath,
        expected: fixture.expected,
        evidenceDirectory: fixture.root,
      });
      expect(changedResult).toHaveLength(1);
      expect(changedResult[0].id).toBe("baseline-error");
      expect(changedResult[0].reasons.map((entry) => entry.code)).toContain(
        "file-size-mismatch",
      );
    } finally {
      writeFileSync(fixture.repeatedExternalPath, originalExternalBytes);
      readFileSpy.mockRestore();
    }
    expectInventoryUnchanged(originalAttempt, fixture.root);
    expectInventoryUnchanged(originalExternal, fixture.externalRoot, true);
  },
);

it("avoids duplicate validation-only reads without caching across verifications", () => {
  const fixture = makeFixture("miri-control", undefined, 128 * 1024);
  const readFileSpy = vi.mocked(fs.readFileSync);
  readFileSpy.mockClear();
  const baseline = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(baseline, reasonsJson(baseline)).toEqual({ ok: true, reasons: [] });
  const repeatedReads = readFileSpy.mock.calls.filter(
    ([path]) => String(path) === fixture.repeatedExternalPath,
  ).length;
  expect(repeatedReads).toBeGreaterThan(0);
  expect(repeatedReads).toBeLessThan(10);
});

it("retains duplicate-reference metadata and alias policy checks", () => {
  const fixture = makeFixture("miri-control", undefined, 128 * 1024);
  const manifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const repeatedRef = manifest.commands
    .flatMap((entry) => entry.record.spec.externalInputs)
    .find((ref) => ref.path === fixture.repeatedExternalPath);
  expect(repeatedRef).toBeDefined();

  if (!repeatedRef) return;
  const originalBytes = repeatedRef.bytes;
  const originalSha = repeatedRef.sha256;
  repeatedRef.bytes += 1;
  writeFileSync(fixture.manifestPath, `${JSON.stringify(manifest)}\n`);
  const metadataMismatch = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(metadataMismatch.ok).toBe(false);
  expect(metadataMismatch.reasons.map((entry) => entry.code)).toContain(
    "reference-overlap-mismatch",
  );

  const shaManifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const shaRef = shaManifest.commands
    .flatMap((entry) => entry.record.spec.externalInputs)
    .find((ref) => ref.path === fixture.repeatedExternalPath);
  expect(shaRef).toBeDefined();
  if (!shaRef) return;
  shaRef.bytes = originalBytes;
  shaRef.sha256 = "0".repeat(64);
  writeFileSync(fixture.manifestPath, `${JSON.stringify(shaManifest)}\n`);
  const shaMismatch = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(shaMismatch.ok).toBe(false);
  expect(shaMismatch.reasons.map((entry) => entry.code)).toContain(
    "reference-overlap-mismatch",
  );

  const aliasManifest = JSON.parse(
    readFileSync(fixture.manifestPath, "utf8"),
  ) as PrefixProofManifest;
  const aliasRef = aliasManifest.commands
    .flatMap((entry) => entry.record.spec.externalInputs)
    .find((ref) => ref.path === fixture.repeatedExternalPath);
  expect(aliasRef).toBeDefined();
  if (!aliasRef) return;
  aliasRef.bytes = originalBytes;
  aliasRef.sha256 = originalSha;
  aliasRef.path = `${dirname(fixture.repeatedExternalPath)}/./${basename(
    fixture.repeatedExternalPath,
  )}`;
  writeFileSync(fixture.manifestPath, `${JSON.stringify(aliasManifest)}\n`);
  const aliasMismatch = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(aliasMismatch.ok).toBe(false);
  expect(aliasMismatch.reasons.map((entry) => entry.code)).toContain(
    "external-reference-mismatch",
  );
});

it("keeps fresh changed and missing external bytes observable", () => {
  const fixture = makeFixture("miri-control", undefined, 128 * 1024);
  const before = regularFileInventory(fixture.externalRoot, true);
  const original = readFileSync(fixture.repeatedExternalPath);
  const baseline = verifyInitializedPrefixEvidence(
    fixture.manifestPath,
    fixture.expected,
  );
  expect(baseline, reasonsJson(baseline)).toEqual({ ok: true, reasons: [] });

  try {
    writeFileSync(
      fixture.repeatedExternalPath,
      new Uint8Array([...original, 0x0a]),
    );
    const changed = verifyInitializedPrefixEvidence(
      fixture.manifestPath,
      fixture.expected,
    );
    expect(changed.reasons.map((entry) => entry.code)).toContain(
      "file-size-mismatch",
    );

    fs.unlinkSync(fixture.repeatedExternalPath);
    const missing = verifyInitializedPrefixEvidence(
      fixture.manifestPath,
      fixture.expected,
    );
    expect(missing.reasons.map((entry) => entry.code)).toContain(
      "missing-evidence",
    );
  } finally {
    writeFileSync(fixture.repeatedExternalPath, original);
  }
  expectInventoryUnchanged(before, fixture.externalRoot, true);
});

// Construct and hash the complete synthetic closure after the mutation, so these
// assert exact environment policy rather than accidental stale receipt hashes.
it.each([
  [
    "value",
    (env: Record<string, string>) => {
      env.RUSTC = env.RUSTDOC;
    },
  ],
  [
    "missing key",
    (env: Record<string, string>) => {
      delete env.RUSTDOC;
    },
  ],
  [
    "extra permitted key",
    (env: Record<string, string>) => {
      env.RUSTFLAGS = "--cfg synthetic_extra";
    },
  ],
] as const)(
  "rejects lookup environment %s with current synthetic closure hashes",
  (_kind, mutate) => {
    const fixture = makeFixture("full-valid", mutate);
    const result = verifyInitializedPrefixEvidence(
      fixture.manifestPath,
      fixture.expected,
    );
    expect(result.ok).toBe(false);
    expect(new Set(result.reasons.map((entry) => entry.code))).toEqual(
      new Set(["command-environment-mismatch"]),
    );
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].message).toContain("lookup-rustc");
  },
);

function expectCopiedProducerArchiveClosure(copiedRoot: string): void {
  const manifest = JSON.parse(
    readFileSync(join(copiedRoot, "proof-manifest.json"), "utf8"),
  ) as PrefixProofManifest;
  const currentRef = (path: string): PrefixFileRef => {
    const bytes = readFileSync(path);
    return { path, bytes: bytes.byteLength, sha256: hashBytes(bytes) };
  };
  let consumers = 0;
  let bindingArchives = 0;
  for (const entry of manifest.commands) {
    expect(currentRef(entry.ref.path)).toEqual(entry.ref);
    expect(JSON.parse(readFileSync(entry.ref.path, "utf8"))).toEqual(
      entry.record,
    );
    for (const phase of ["before", "after"] as const) {
      for (const archived of entry.record[phase]) {
        expect(currentRef(archived.archive.path)).toEqual(archived.archive);
        const structured =
          archived.input.path === manifest.toolchain.ref.path ||
          archived.input.path.endsWith("/compiled-output.json");
        if (!structured) continue;
        expect(currentRef(archived.input.path)).toEqual(archived.input);
        expect(readFileSync(archived.archive.path)).toEqual(
          readFileSync(archived.input.path),
        );
        if (archived.input.path === manifest.toolchain.ref.path)
          bindingArchives++;
        else {
          if (phase === "before") consumers++;
          const sidecar = JSON.parse(
            readFileSync(archived.input.path, "utf8"),
          ) as { command: PrefixFileRef };
          expect(currentRef(sidecar.command.path)).toEqual(sidecar.command);
        }
      }
    }
  }
  expect(consumers).toBeGreaterThanOrEqual(2);
  expect(bindingArchives).toBeGreaterThan(0);
  for (const artifact of manifest.artifacts)
    expect(currentRef(artifact.path)).toEqual(artifact);
}

it(
  "archive-closure retains producer sidecars and raw archives through baseline and source controls",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("control");
    expect(
      verifyInitializedPrefixEvidence(fixture.manifestPath, fixture.expected),
    ).toEqual({ ok: true, reasons: [] });
    const original = regularFileInventory(fixture.root);
    const external = regularFileInventory(fixture.externalRoot, true);
    const controls = verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    const codes: Record<string, string[]> = {
      "baseline-valid": [],
      "mutate-outcome": ["exit-code-mismatch"],
      "mutate-stream": ["unexpected-collateral"],
      "mutate-source": ["source-binding-mismatch"],
      "mutate-manifest-inventory": ["recipe-inventory-mismatch"],
      "diagnostic-code": ["diagnostic-code-mismatch"],
      "diagnostic-primary-same-line": ["diagnostic-primary-mismatch"],
      "diagnostic-multiplicity": ["diagnostic-multiplicity"],
      "diagnostic-collateral": ["unexpected-collateral"],
    };
    expect(controls.map((control) => control.id).sort()).toEqual(
      Object.keys(codes).sort(),
    );
    for (const control of controls) {
      if (control.id === "baseline-valid" || control.id === "mutate-source") {
        const { copiedRoot } = durableTamperPacket(fixture, control.id);
        expectCopiedProducerArchiveClosure(copiedRoot);
        if (control.id === "mutate-source") {
          expect(
            readFileSync(
              join(copiedRoot, "artifacts/sources/reborrow-negative.rs"),
              "utf8",
            ),
          ).toContain("retained tamper source mutation");
          expect(
            readFileSync(join(copiedRoot, "artifacts/sources/reborrow.rs")),
          ).toEqual(
            readFileSync(join(fixture.root, "artifacts/sources/reborrow.rs")),
          );
        }
      }
      expect(control.rejected).toBe(control.id !== "baseline-valid");
      expect([
        ...new Set(control.reasons.map((reason) => reason.code)),
      ]).toEqual(codes[control.id]);
      const { packet, copiedRoot } = durableTamperPacket(fixture, control.id);
      expect(packet.originalBaseline).toEqual({ ok: true, reasons: [] });
      expect(packet.copiedBaseline).toEqual({ ok: true, reasons: [] });
      expect(packet.externalBefore).toEqual(packet.externalAfter);
      expect(packet.externalBeforeEntries).toEqual(packet.externalAfterEntries);
      if (control.id === "baseline-valid" || control.id === "mutate-source")
        expectCopiedProducerArchiveClosure(copiedRoot);
    }
    expectInventoryUnchanged(original, fixture.root);
    expectInventoryUnchanged(external, fixture.externalRoot, true);
  },
);

it(
  "archive-closure rejects corrupted consumed sidecar bytes after only enclosing hash rebinding",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("control");
    expect(
      verifyInitializedPrefixEvidence(fixture.manifestPath, fixture.expected),
    ).toEqual({ ok: true, reasons: [] });
    const original = regularFileInventory(fixture.root);
    const external = regularFileInventory(fixture.externalRoot, true);
    verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    const { packet, copiedRoot } = durableTamperPacket(
      fixture,
      "baseline-valid",
    );
    expect(packet.copiedBaseline).toEqual({ ok: true, reasons: [] });
    expectCopiedProducerArchiveClosure(copiedRoot);
    const manifestPath = join(copiedRoot, "proof-manifest.json");
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as PrefixProofManifest;
    // The retained packet is written after baseline verification; inventory its
    // current bytes explicitly before testing an otherwise valid finalized copy.
    const packetPath = join(copiedRoot, "control-result.json");
    const packetBytes = readFileSync(packetPath);
    (manifest as unknown as { artifacts: PrefixFileRef[] }).artifacts.push({
      path: packetPath,
      bytes: packetBytes.byteLength,
      sha256: hashBytes(packetBytes),
    });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const expected: PrefixObservedExpectations = {
      ...fixture.expected,
      adjudication: {
        ...fixture.expected.adjudication,
        provenance: fixture.expected.adjudication.provenance.map((ref) => ({
          ...ref,
          path: join(copiedRoot, relative(fixture.root, ref.path)),
        })),
      },
    };
    expect(verifyInitializedPrefixEvidence(manifestPath, expected)).toEqual({
      ok: true,
      reasons: [],
    });
    const consumer = manifest.commands.find(
      (entry) => entry.record.spec.id === "stable-control",
    );
    expect(consumer).toBeDefined();
    const archived = consumer?.record.before.find((entry) =>
      entry.input.path.endsWith("/compiled-output.json"),
    );
    expect(archived).toBeDefined();
    const archivePath = archived?.archive.path ?? "";
    const corrupted = encoder.encode(
      decoder.decode(readFileSync(archivePath)) + "\n",
    );
    writeFileSync(archivePath, corrupted);
    // Only update enclosing refs. Never call clone preparation or its archive repair here.
    rewriteFixtureCommandRecord(
      { ...fixture, root: copiedRoot, manifestPath },
      "stable-control",
      (record) => {
        for (const phase of ["before", "after"] as const)
          for (const entry of record[phase])
            if (entry.archive.path === archivePath) {
              entry.archive.bytes = corrupted.byteLength;
              entry.archive.sha256 = hashBytes(corrupted);
            }
      },
    );
    const result = verifyInitializedPrefixEvidence(manifestPath, expected);
    expect(result.ok).toBe(false);
    expect([...new Set(result.reasons.map((reason) => reason.code))]).toEqual([
      "archive-content-mismatch",
    ]);
    expectInventoryUnchanged(original, fixture.root);
    expectInventoryUnchanged(external, fixture.externalRoot, true);
  },
);

it(
  "archive-closure preserves coherent producer-source fallback without an isolated negative client",
  { timeout: 30_000 },
  () => {
    const fixture = makeFixture("full-valid");
    expect(
      fixture.expected.recipes.some(
        (recipe) => recipe.operation === "client-negative",
      ),
    ).toBe(false);
    expect(
      verifyInitializedPrefixEvidence(fixture.manifestPath, fixture.expected),
    ).toEqual({ ok: true, reasons: [] });
    const original = regularFileInventory(fixture.root);
    const external = regularFileInventory(fixture.externalRoot, true);
    verifyInitializedPrefixTamperControls({
      manifestPath: fixture.manifestPath,
      expected: fixture.expected,
      evidenceDirectory: fixture.root,
    });
    const { packet, copiedRoot } = durableTamperPacket(
      fixture,
      "mutate-source",
    );
    expect(packet.originalBaseline).toEqual({ ok: true, reasons: [] });
    expect(packet.copiedBaseline).toEqual({ ok: true, reasons: [] });
    expectCopiedProducerArchiveClosure(copiedRoot);
    const result = packet.result as {
      ok: boolean;
      reasons: { code: string }[];
    };
    expect(result.ok).toBe(false);
    expect(
      [...new Set(result.reasons.map((reason) => reason.code))].sort(),
    ).toEqual(["compiled-binary-link-mismatch", "source-binding-mismatch"]);
    expect(
      readFileSync(
        join(copiedRoot, "artifacts/sources/solution-element.rs"),
        "utf8",
      ),
    ).toContain("retained tamper source mutation");
    expect(
      readFileSync(
        join(copiedRoot, "artifacts/binaries/initialized_prefix_element"),
      ),
    ).toEqual(
      readFileSync(
        join(fixture.root, "artifacts/binaries/initialized_prefix_element"),
      ),
    );
    expect(packet.externalBefore).toEqual(packet.externalAfter);
    expect(packet.externalBeforeEntries).toEqual(packet.externalAfterEntries);
    expectInventoryUnchanged(original, fixture.root);
    expectInventoryUnchanged(external, fixture.externalRoot, true);
  },
);
