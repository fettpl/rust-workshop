import { describe, expect, it } from "vitest";
import type { Evaluator, EvaluationInput, RunResult } from "@/domain/types";
import { evaluate } from "./evaluate";

const success = (stdout = ""): RunResult => ({
  status: "success",
  stdout,
  stderr: "",
  diagnostics: [],
  durationMs: 1,
});

const run = (evaluator: Evaluator, input: EvaluationInput) =>
  evaluate(evaluator, input);

describe("evaluate", () => {
  it("recognizes a code-less expected compiler diagnostic without accepting warnings or infrastructure errors", () => {
    const diagnostic = "future cannot be sent between threads safely";
    const evaluator = { kind: "expected-error", diagnostic } as Evaluator;
    const result: RunResult = {
      ...success(),
      status: "compile-error",
      diagnostics: [{ message: diagnostic, level: "error" }],
    };
    expect(run(evaluator, { result }).passed).toBe(true);
    expect(
      run(evaluator, { result: { ...result, status: "infrastructure-error" } })
        .passed,
    ).toBe(false);
    expect(
      run(evaluator, {
        result: {
          ...result,
          diagnostics: [{ message: diagnostic, level: "warning" }],
        },
      }).passed,
    ).toBe(false);
    expect(
      run(evaluator, {
        result: {
          ...result,
          diagnostics: [{ message: "another compiler error", level: "error" }],
        },
      }).passed,
    ).toBe(false);
    expect(
      run({ kind: "expected-error" } as Evaluator, { result }).passed,
    ).toBe(false);
  });
  it("compares normalized exact output and compilation status", () => {
    expect(
      run(
        { kind: "exact-output", expected: "hello\n" },
        { result: success("hello\r\n") },
      ).passed,
    ).toBe(true);
    expect(run({ kind: "compilation" }, { result: success() }).passed).toBe(
      true,
    );
    expect(
      run(
        { kind: "compilation" },
        { result: { ...success(), status: "compile-error" } },
      ).passed,
    ).toBe(false);
  });

  it("enforces exact-output syntax guards after removing comments", () => {
    const evaluator: Evaluator = {
      kind: "exact-output",
      expected: "correct\ntry again\n",
      requiredPatterns: ["-> String", "if"],
    };
    expect(
      run(evaluator, {
        code: '// fn verdict() -> String { if true { String::new() } else { String::new() } }\nfn main() { println!("correct\\ntry again"); }',
        result: success("correct\ntry again\n"),
      }).passed,
    ).toBe(false);
    expect(
      run(evaluator, {
        code: 'fn verdict(guess: i32, secret: i32) -> String { if guess == secret { String::from("correct") } else { String::from("try again") } }\nfn main() { println!("{}", verdict(4, 4)); println!("{}", verdict(3, 4)); }',
        result: success("correct\ntry again\n"),
      }).passed,
    ).toBe(true);
  });

  it.each([
    ["nested block comments", "/* outer /* nested */ .clone( */ fn f() {}"],
    [
      "an unmatched lifetime before a comment",
      "fn f(x: &str) -> &str { x } type View = &'static str; // .clone(",
    ],
    ["ordinary string contents", 'fn f() { let help = "use .clone("; }'],
    ["raw string contents", 'fn f() { let help = r#"use .clone("#; }'],
    ["identifier suffixes", "fn my_unsafe_helper() {}"],
  ])("does not treat %s as a forbidden operation", (_, code) => {
    expect(
      run(
        {
          kind: "tests",
          tests: "authored tests",
          forbiddenPatterns: [".clone(", "unsafe"],
        },
        { code, result: { ...success(), tests: { passed: 1, failed: 0 } } },
      ).passed,
    ).toBe(true);
  });

  it.each([
    'fn f() { let quote = r#"a " // still a string"#; value.clone(); }',
    'fn f() { let quote = r##"a "# // still a string"##; value.clone(); }',
    "fn f() { let slash = '/'; value.clone(); }",
    String.raw`fn f() { let slash = '\\'; value.clone(); }`,
  ])("detects a forbidden operation after Rust literal syntax: %s", (code) => {
    expect(
      run(
        {
          kind: "tests",
          tests: "authored tests",
          forbiddenPatterns: [".clone("],
        },
        { code, result: { ...success(), tests: { passed: 1, failed: 0 } } },
      ).passed,
    ).toBe(false);
  });

  it.each([
    'fn main() { let hint = "-> String if"; println!("correct"); }',
    'fn difference() -> String { String::from("correct") } fn main() { println!("{}", difference()); }',
  ])(
    "requires syntax tokens rather than literal text or identifier fragments: %s",
    (code) => {
      expect(
        run(
          {
            kind: "exact-output",
            expected: "correct",
            requiredPatterns: ["-> String", "if"],
          },
          { code, result: success("correct") },
        ).passed,
      ).toBe(false);
    },
  );

  it.each(["value.r#clone()", "Clone::r#clone(&value)"])(
    "recognizes raw identifier calls in authored method guards: %s",
    (code) => {
      expect(
        run(
          {
            kind: "tests",
            tests: "authored",
            forbiddenPatterns: [".clone(", "Clone::clone("],
          },
          {
            code,
            result: { ...success(), tests: { passed: 1, failed: 0 } },
          },
        ).passed,
      ).toBe(false);
    },
  );

  it("does not confuse a raw identifier with an unsafe keyword", () => {
    const evaluator: Evaluator = {
      kind: "tests",
      tests: "authored",
      forbiddenPatterns: ["unsafe"],
    };
    const result = { ...success(), tests: { passed: 1, failed: 0 } };
    expect(run(evaluator, { code: "fn r#unsafe() {}", result }).passed).toBe(
      true,
    );
    expect(run(evaluator, { code: "unsafe {}", result }).passed).toBe(false);
  });

  it("requires the declared diagnostic code for expected errors", () => {
    const result = {
      ...success(),
      status: "compile-error" as const,
      diagnostics: [
        { code: "E0382", message: "moved", level: "error" as const },
      ],
    };
    expect(
      run({ kind: "expected-error", code: "E0382" }, { result }).passed,
    ).toBe(true);
    expect(
      run({ kind: "expected-error", code: "E0499" }, { result }).passed,
    ).toBe(false);
  });

  it("matches E0515 from a real lifetime diagnostic without trusting message text", () => {
    const evaluator: Evaluator = { kind: "expected-error", code: "E0515" };
    const result: RunResult = {
      ...success(),
      status: "compile-error",
      diagnostics: [
        {
          code: "E0515",
          message: "cannot return value referencing local variable `view`",
          level: "error",
        },
      ],
    };
    expect(run(evaluator, { result }).passed).toBe(true);
    expect(
      run(evaluator, {
        result: {
          ...result,
          diagnostics: [{ ...result.diagnostics[0], code: "E0597" }],
        },
      }).passed,
    ).toBe(false);
    expect(
      run(evaluator, { result: { ...result, status: "success" } }).passed,
    ).toBe(false);
  });

  it("requires a passing test result and evaluates forbidden source outside comments", () => {
    const evaluator: Evaluator = {
      kind: "tests",
      tests: "hidden",
      forbiddenPatterns: ["clone()"],
    };
    expect(
      run(evaluator, {
        code: "// clone()\nfn main() {}",
        result: { ...success(), tests: { passed: 1, failed: 0 } },
      }).passed,
    ).toBe(true);
    expect(
      run(evaluator, {
        code: "fn main() { value . clone ( ); }",
        result: { ...success(), tests: { passed: 1, failed: 0 } },
      }).passed,
    ).toBe(false);
    expect(
      run(evaluator, {
        result: { ...success(), tests: { passed: 1, failed: 1 } },
      }).passed,
    ).toBe(false);
    expect(
      run(evaluator, {
        code: "fn main() {}",
        result: { ...success(), tests: { passed: 0, failed: 0 } },
      }).passed,
    ).toBe(false);
    expect(
      run(
        { kind: "tests", tests: "   " },
        { result: { ...success(), tests: { passed: 1, failed: 0 } } },
      ).passed,
    ).toBe(false);
  });

  it("evaluates answers, choices, ordering and rubric checks", () => {
    expect(
      run(
        { kind: "answer", accepted: ["move"], feedback: "Try again" },
        { answer: " move " },
      ).passed,
    ).toBe(true);
    expect(
      run(
        {
          kind: "choice",
          correct: "b",
          explanations: { a: "Ta odpowiedź myli zakres własności." },
        },
        { answer: "a" },
      ).feedback,
    ).toBe("Ta odpowiedź myli zakres własności.");
    expect(
      run(
        { kind: "ordering", correct: ["predict", "run"] },
        { answer: '["predict","run"]' },
      ).passed,
    ).toBe(true);
    expect(
      run(
        { kind: "rubric", criteria: ["ownership", "move"] },
        { rubricChecks: ["ownership"] },
      ).passed,
    ).toBe(false);
    expect(
      run(
        { kind: "rubric", criteria: ["ownership"] },
        { rubricChecks: ["ownership"] },
      ).passed,
    ).toBe(false);
    expect(
      run(
        { kind: "rubric", criteria: ["ownership"] },
        {
          answer: "Własność przechodzi przy move.",
          rubricChecks: ["ownership"],
        },
      ).passed,
    ).toBe(true);
  });

  it("nudges ordering without revealing the correct sequence", () => {
    const feedback = run(
      { kind: "ordering", correct: ["predict", "run"] },
      { answer: '["run","predict"]' },
    ).feedback;
    expect(feedback).not.toContain("predict");
    expect(feedback).not.toContain("run");
  });
});
