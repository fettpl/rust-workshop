import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import type { Lesson } from "../domain/types";

const starter = `macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),+) => {{
        vec![$(($name, $value)),+]
    }};
}`;

const solution = `macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut readings = Vec::<(&str, i32)>::new();
        $( readings.push(($name, $value)); )*
        readings
    }};
}`;

const tests = `#[test]
fn accepts_an_empty_reading_list() {
    assert_eq!(metric_readings!(), Vec::<(&str, i32)>::new());
}`;

const syntaxError = "fn answer() -> i32 { let = ; 0 }";

function lessonWithSteps(steps: Lesson["steps"]): Lesson {
  return {
    id: "macro-diagnostic-fixtures",
    moduleId: "fixture",
    conceptIds: [],
    competencyIds: [],
    prerequisites: [],
    title: "Macro diagnostic fixtures",
    subtitle: "Trusted authored verifier cases",
    minutes: 1,
    outcomes: [],
    misconceptions: [],
    transferTask: "",
    evidenceGate: "",
    sourceIds: [],
    steps,
  };
}

describe("authored Rust macro diagnostic classification", () => {
  it("accepts the expected + matcher rejection but rejects unrelated code-null syntax errors", () => {
    const results = verifyTrustedRust({
      lessons: [
        lessonWithSteps([
          {
            id: "macro-matcher",
            kind: "modify",
            title: "Macro matcher",
            prompt: "Accept an empty list.",
            code: starter,
            solution,
            evidenceKind: "transfer",
            evaluator: { kind: "tests", tests },
          },
          {
            id: "unrelated-syntax",
            kind: "modify",
            title: "Unrelated syntax",
            prompt: "Keep the function valid.",
            code: syntaxError,
            solution: "fn answer() -> i32 { 0 }",
            evidenceKind: "transfer",
            evaluator: {
              kind: "tests",
              tests: "#[test] fn answer_is_zero() { assert_eq!(answer(), 0); }",
            },
          },
        ]),
      ],
      reviewExercises: {},
      delayedReviewExercises: {},
      traces: {},
    });

    expect(
      results.find(
        (result) =>
          result.id ===
          "macro-diagnostic-fixtures/macro-matcher/starter-rejected",
      ),
    ).toMatchObject({ passed: true });
    expect(
      results.find(
        (result) =>
          result.id ===
          "macro-diagnostic-fixtures/unrelated-syntax/starter-rejected",
      ),
    ).toMatchObject({ passed: false });
    expect(
      results.find(
        (result) =>
          result.id === "macro-diagnostic-fixtures/macro-matcher/solution",
      ),
    ).toMatchObject({ passed: true });
  }, 30_000);
});
