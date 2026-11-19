import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests, parseTests } from "../runner";
import {
  addMarkContract,
  frameTextContract,
  isEmptyTextContract,
} from "./ownership-evidence-contracts";
import {
  functionOwnershipCalibrationLesson,
  delayedReviewExercises,
} from "./function-ownership-calibration";

type FixtureBudget = { compileMs: number; executionMs: number };

function rustFixture(
  code: string,
  tests: string | undefined,
  budget: FixtureBudget,
) {
  const dir = mkdtempSync(join(tmpdir(), "function-ownership-contract-"));
  const source = join(dir, "fixture.rs");
  const binary = join(dir, "fixture.bin");
  try {
    const testMode = tests !== undefined;
    writeFileSync(
      source,
      testMode ? appendHiddenTests(code, tests) : code,
      "utf8",
    );
    const compile = spawnSync(
      process.env.RUSTC_BIN ?? "rustc",
      [
        "--edition",
        "2024",
        ...(testMode ? ["--test"] : []),
        source,
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: budget.compileMs },
    );
    if (compile.status !== 0 || !testMode)
      return {
        compiled: compile.status === 0,
        status: compile.status,
        processError: compile.error?.message,
        signal: compile.signal,
        tests: undefined,
        stderr: compile.stderr ?? "",
        stdout: compile.stdout ?? "",
      };
    const execution = spawnSync(binary, [], {
      encoding: "utf8",
      timeout: budget.executionMs,
    });
    return {
      compiled: true,
      status: execution.status,
      processError: execution.error?.message,
      signal: execution.signal,
      tests: parseTests(`${execution.stdout ?? ""}\n${execution.stderr ?? ""}`),
      stderr: execution.stderr ?? "",
      stdout: execution.stdout ?? "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

it("exports the exact lesson and delayed review shape", () => {
  expect(functionOwnershipCalibrationLesson.id).toBe(
    "function-ownership-calibration",
  );
  expect(functionOwnershipCalibrationLesson.conceptIds).toEqual([
    "function-ownership",
  ]);
  expect(functionOwnershipCalibrationLesson.prerequisites).toEqual([
    "scenario-assessment",
  ]);
  expect(functionOwnershipCalibrationLesson.steps.map((step) => step.id)).toEqual([
    "function-boundary-preview",
    "function-return-predict",
    "function-is-empty-text",
    "function-add-mark",
    "function-boundary-explain",
    "function-split-owned",
  ]);
  expect(functionOwnershipCalibrationLesson.steps[1].evidence).toEqual({
    version: 2,
    conceptIds: ["function-ownership"],
  });
  expect(functionOwnershipCalibrationLesson.steps[1].evaluator).toEqual({
    kind: "choice",
    correct: "caller-rebinds-return",
    explanations: {
      "caller-rebinds-return":
        "String został przeniesiony do funkcji; po return wywołujący używa zwróconej wartości pod nową nazwą.",
      "caller-keeps-original":
        "Parametr String przejmuje własność, więc stare text nie jest już dostępne; użyj wartości zwróconej.",
    },
  });
  expect(functionOwnershipCalibrationLesson.steps[2].evidence).toEqual({
    version: 2,
    conceptIds: ["function-ownership"],
    codingTaskId: "ownership/function-predicate-v1",
  });
  expect(functionOwnershipCalibrationLesson.steps[3].evidence).toEqual({
    version: 2,
    conceptIds: ["function-ownership"],
    codingTaskId: "ownership/function-return-owned-v1",
  });
  const delayed = delayedReviewExercises["function-ownership"];
  expect(delayed).toMatchObject({
    id: "review-function-ownership-delayed-v1",
    kind: "recall",
    evidenceKind: "recall",
    evidence: {
      version: 2,
      conceptIds: ["function-ownership"],
      codingTaskId: "ownership/function-delayed-recall-v1",
    },
    evaluator: { kind: "tests" },
    expectedStatus: "success",
  });
  expect(delayed.code).toBe(frameTextContract.starter);
  expect(delayed.evaluator?.kind === "tests" && delayed.evaluator.tests).toBe(
    frameTextContract.tests,
  );
  expect(delayed.solution).toBe(frameTextContract.solution);
});

const isEmptyTextStarter = [
  "fn main() {",
  '    let text = String::from("Rust");',
  '    println!("{} {}", is_empty_text(&text), text);',
  "}",
  "",
  "fn is_empty_text(text: String) -> bool {",
  "    text.is_empty()",
  "}",
].join("\n");

const addMarkStarter = [
  "fn main() {",
  '    let text = String::from("ready");',
  "    let marked = add_mark(text);",
  '    println!("{marked}");',
  "}",
  "",
  "fn add_mark(text: String) -> String {",
  "    text",
  "}",
].join("\n");

const frameTextStarter = [
  "fn main() {",
  '    let text = String::from("ready!");',
  "    let framed = frame_text(text);",
  '    println!("{framed}");',
  "}",
  "",
  "fn frame_text(text: String) -> String {",
  "    text",
  "}",
].join("\n");

const borrowedLocalReturn = [
  "fn add_mark<'a>(text: String) -> &'a str {",
  "    text.as_str()",
  "}",
].join("\n");

const borrowedSignature = [
  "fn main() {",
  '    let text = String::from("ready");',
  "    let marked: fn(&String) -> String = add_mark;",
  '    println!("{}", marked(&text));',
  "}",
  "fn add_mark(text: String) -> String { text }",
].join("\n");

const isEmptyTextTests = [
  "#[test]",
  "fn checks_borrowed_input_without_consuming_it() {",
  '    let check: fn(&String) -> bool = is_empty_text;',
  '    for (input, expected) in [("", true), ("Rust", false), ("   ", false), ("żółw 🦀", false), ("!?", false)] {',
  "        let value = String::from(input);",
  "        assert_eq!(check(&value), expected);",
  "        assert_eq!(value, input);",
  "        assert_eq!(check(&value), expected);",
  "    }",
  "}",
].join("\n");

const addMarkTests = [
  "#[test]",
  "fn returns_exactly_one_new_mark_each_call() {",
  '    let add: fn(String) -> String = add_mark;',
  '    for (input, expected) in [("", "!"), ("ready!", "ready!!"), ("żółw 🦀", "żółw 🦀!"), ("?!", "?!!")] {',
  "        assert_eq!(add(String::from(input)), expected);",
  "    }",
  "}",
].join("\n");

const frameTextTests = [
  "#[test]",
  "fn returns_exact_delimiters_and_preserves_text() {",
  '    let frame: fn(String) -> String = frame_text;',
  '    for (input, expected) in [("", "<>"), ("ready!", "<ready!>"), ("żółw 🦀", "<żółw 🦀>"), ("<x>", "<<x>>")] {',
  "        assert_eq!(frame(String::from(input)), expected);",
  "    }",
  "}",
].join("\n");

const compileBudget = { compileMs: 60_000, executionMs: 1_000 };
const testBudget = { compileMs: 60_000, executionMs: 8_000 };

it("rejects the owning is_empty_text starter at E0308", () => {
  const result = rustFixture(isEmptyTextStarter, undefined, compileBudget);
  expect(result.compiled).toBe(false);
  expect(result.stderr).toContain("E0308");
}, 70_000);
it("compiles add_mark pass-through then fails its hidden tests", () => {
  const result = rustFixture(addMarkStarter, addMarkTests, testBudget);
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests).toEqual(expect.objectContaining({ failed: 1 }));
  expect(result.tests!.passed + result.tests!.failed).toBeGreaterThan(0);
}, 70_000);
it("compiles frame_text pass-through then fails its hidden tests", () => {
  const result = rustFixture(frameTextStarter, frameTextTests, testBudget);
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests).toEqual(expect.objectContaining({ failed: 1 }));
  expect(result.tests!.passed + result.tests!.failed).toBeGreaterThan(0);
}, 70_000);
it("rejects the borrowed caller signature at E0308", () => {
  const result = rustFixture(borrowedSignature, undefined, compileBudget);
  expect(result.compiled).toBe(false);
  expect(result.stderr).toContain("E0308");
}, 70_000);
it("rejects the borrowed local return at E0515", () => {
  const result = rustFixture(borrowedLocalReturn, undefined, compileBudget);
  expect(result.compiled).toBe(false);
  expect(result.stderr).toContain("E0515");
}, 70_000);

const isEmptyTextAlwaysTrue =
  `fn is_empty_text(text: &String) -> bool { let _ = text; true }`;
const isEmptyTextAlwaysFalse =
  `fn is_empty_text(text: &String) -> bool { let _ = text; false }`;
const isEmptyTextTrimmed =
  `fn is_empty_text(text: &String) -> bool { text.trim().is_empty() }`;
const addMarkUnchanged = `fn add_mark(text: String) -> String { text }`;
const addMarkHardCoded =
  `fn add_mark(text: String) -> String { let _ = text; String::from("fixed!") }`;
const addMarkDelimiterLost = `fn add_mark(text: String) -> String { text + "" }`;
const addMarkDelimiterDuplicated =
  `fn add_mark(text: String) -> String { text + "!!" }`;
const frameTextUnicodeAltered =
  `fn frame_text(text: String) -> String { format!("<{}>", text.replace("🦀", "?")) }`;
const isEmptyTextCanonical =
  `fn is_empty_text(text: &String) -> bool { text.is_empty() }`;
const isEmptyTextEquivalent =
  `fn is_empty_text(text: &String) -> bool { text.len() == 0 }`;
const addMarkCanonical =
  `fn add_mark(text: String) -> String { format!("{}!", text) }`;
const addMarkEquivalent =
  `fn add_mark(mut text: String) -> String { text.push('!'); text }`;
const frameTextCanonical =
  `fn frame_text(text: String) -> String { format!("<{text}>") }`;
const frameTextEquivalent =
  `fn frame_text(text: String) -> String { let mut out = String::from("<"); out.push_str(&text); out.push('>'); out }`;

it("accepts canonical is_empty_text", () => {
  expectSemanticPass(rustFixture(isEmptyTextCanonical, isEmptyTextTests, testBudget));
}, 70_000);
it("accepts equivalent is_empty_text", () => {
  expectSemanticPass(rustFixture(isEmptyTextEquivalent, isEmptyTextTests, testBudget));
}, 70_000);
it("accepts canonical add_mark", () => {
  expectSemanticPass(rustFixture(addMarkCanonical, addMarkTests, testBudget));
}, 70_000);
it("accepts equivalent add_mark", () => {
  expectSemanticPass(rustFixture(addMarkEquivalent, addMarkTests, testBudget));
}, 70_000);
it("accepts canonical frame_text", () => {
  expectSemanticPass(rustFixture(frameTextCanonical, frameTextTests, testBudget));
}, 70_000);
it("accepts equivalent frame_text", () => {
  expectSemanticPass(rustFixture(frameTextEquivalent, frameTextTests, testBudget));
}, 70_000);

function expectSemanticPass(result: ReturnType<typeof rustFixture>) {
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBe(0);
  expect(result.tests?.passed).toBeGreaterThan(0);
}

function expectSemanticFailure(source: string, hiddenTests: string) {
  const result = rustFixture(source, hiddenTests, testBudget);
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBeGreaterThan(0);
  expect((result.tests?.passed ?? 0) + (result.tests?.failed ?? 0)).toBeGreaterThan(0);
}
it("rejects is_empty_text always true", () =>
  expectSemanticFailure(isEmptyTextAlwaysTrue, isEmptyTextTests), 70_000);
it("rejects is_empty_text always false", () =>
  expectSemanticFailure(isEmptyTextAlwaysFalse, isEmptyTextTests), 70_000);
it("rejects is_empty_text after whitespace trim", () =>
  expectSemanticFailure(isEmptyTextTrimmed, isEmptyTextTests), 70_000);
it("rejects add_mark unchanged", () =>
  expectSemanticFailure(addMarkUnchanged, addMarkTests), 70_000);
it("rejects add_mark hard coded output", () =>
  expectSemanticFailure(addMarkHardCoded, addMarkTests), 70_000);
it("rejects add_mark delimiter loss", () =>
  expectSemanticFailure(addMarkDelimiterLost, addMarkTests), 70_000);
it("rejects add_mark delimiter duplication", () =>
  expectSemanticFailure(addMarkDelimiterDuplicated, addMarkTests), 70_000);
it("rejects frame_text Unicode alteration", () =>
  expectSemanticFailure(frameTextUnicodeAltered, frameTextTests), 70_000);
