import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import type { Lesson, LessonStep } from "../domain/types";

function fixture(
  id: string,
  code: string,
  forbiddenPatterns?: string[],
): LessonStep {
  return {
    id,
    title: id,
    kind: "modify",
    prompt: "Implement answer, returning 2.",
    code,
    solution: "fn answer() -> i32 { 2 }",
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
    evaluator: {
      kind: "tests",
      tests: "#[test] fn answer_is_two() { assert_eq!(answer(), 2); }",
      forbiddenPatterns,
    },
  };
}

describe("authored Rust starter verification", () => {
  it("detects pre-solved exercises and accepts genuine behavior or source-rule failures", () => {
    const lesson: Lesson = {
      id: "verifier-fixtures",
      moduleId: "fixture",
      conceptIds: [],
      competencyIds: [],
      prerequisites: [],
      title: "Verifier",
      subtitle: "Repository-authored checks",
      minutes: 1,
      outcomes: [],
      misconceptions: [],
      transferTask: "",
      evidenceGate: "",
      sourceIds: [],
      steps: [
        {
          id: "toml-observation",
          title: "TOML observation",
          kind: "observe",
          prompt: "Read the authored manifest declaration.",
          editorMode: "toml",
          code: '[package]\nname = "probe"\n# fn main() {}',
          solution: '[package]\nname = "probe"\n# fn main() {}',
          evidenceKind: "exposure",
          evaluator: {
            kind: "answer",
            accepted: ["probe"],
            feedback: "Odczytana deklaracja.",
          },
        },
        fixture("already-correct", "fn answer() -> i32 { 1 + 1 }"),
        fixture("wrong-value", "fn answer() -> i32 { 0 }"),
        fixture("unimplemented", 'fn answer() -> i32 { todo!("implement") }'),
        fixture("missing-api", "fn helper() {}"),
        fixture(
          "no-test-report",
          "fn answer() -> i32 { std::process::exit(0) }",
        ),
        fixture(
          "source-constraint",
          "fn answer() -> i32 { Some(2).unwrap() }",
          [".unwrap("],
        ),
        {
          ...fixture("generic-only", "fn answer<T>(value: T) -> T { value }"),
          solution: "fn answer<T>(_value: T) -> T { todo!() }",
          evaluator: {
            kind: "tests",
            tests: "#[test] fn generic_value() { assert_eq!(answer(2), 2); }",
          },
        },
        {
          ...fixture("empty-tests", "fn answer() -> i32 { 0 }"),
          evaluator: { kind: "tests", tests: "" },
        },
        {
          ...fixture("ignored-tests", "fn answer() -> i32 { 0 }"),
          evaluator: {
            kind: "tests",
            tests:
              "#[test] #[ignore] fn answer_is_two() { assert_eq!(answer(), 2); }",
          },
        },
      ],
    };
    const results = verifyTrustedRust({
      lessons: [lesson],
      reviewExercises: {},
      traces: {},
    });
    expect(
      results.some((result) => result.id.includes("toml-observation")),
    ).toBe(false);
    for (const [id, passed] of [
      ["already-correct", false],
      ["wrong-value", true],
      ["unimplemented", true],
      ["missing-api", true],
      ["no-test-report", false],
      ["source-constraint", true],
      ["generic-only", false],
      ["empty-tests", false],
      ["ignored-tests", false],
    ] as const) {
      expect(
        results.find(
          (result) => result.id === `${lesson.id}/${id}/starter-rejected`,
        ),
        id,
      ).toMatchObject({ passed });
    }
    expect(
      results.filter((result) => !result.passed).map((result) => result.id),
      JSON.stringify(
        results.filter((result) => !result.passed),
        null,
        2,
      ),
    ).toEqual([
      "verifier-fixtures/already-correct/starter-rejected",
      "verifier-fixtures/no-test-report/starter-rejected",
      "verifier-fixtures/generic-only/starter-rejected",
      "verifier-fixtures/generic-only/solution",
      "verifier-fixtures/empty-tests/reject-empty-implementation",
      "verifier-fixtures/empty-tests/starter-rejected",
      "verifier-fixtures/ignored-tests/starter-rejected",
      "verifier-fixtures/ignored-tests/solution",
    ]);
  }, 90_000);
});
