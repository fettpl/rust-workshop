/** Native controls for the remaining core-course review contract gaps. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import { reviewExercises } from "./course";

function rust(source: string, tests: string) {
  const dir = mkdtempSync(join(tmpdir(), "core-review-contract-"));
  try {
    const file = join(dir, "fixture.rs");
    const binary = join(dir, "fixture");
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(run.error).toBeUndefined();
    return run.status;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function testsOf(step: LessonStep) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing native contract");
  return step.evaluator.tests;
}

it("the Copy review requests the exact output accepted by its evaluator", () => {
  const step = reviewExercises["copy-semantics"];
  expect(step.prompt).toMatch(/dokładny (?:tekst|wynik)/i);
  expect(step.evaluator).toBeDefined();
  expect(evaluate(step.evaluator!, { answer: step.solution }).passed).toBe(
    true,
  );
  expect(
    evaluate(step.evaluator!, { answer: "(2, true) (2, true)" }).passed,
  ).toBe(true);
  expect(evaluate(step.evaluator!, { answer: "(2, true)" }).passed).toBe(false);
});

it("the closure capture review covers zero and negative offsets within its arithmetic domain", () => {
  const step = reviewExercises["closure-capture-modes"];
  const tests = testsOf(step);
  expect(rust(step.solution!, tests)).toBe(0);
  const ignoresZero = step.solution!.replace(
    "    let mut add",
    "    if offset == 0 { return; }\n    let mut add",
  );
  const ignoresNegative = step.solution!.replace(
    "    let mut add",
    "    if offset < 0 { return; }\n    let mut add",
  );
  expect(rust(ignoresZero, tests)).toBe(101);
  expect(rust(ignoresNegative, tests)).toBe(101);
  expect(step.prompt).toContain("mieści się w i32");
  const alternative = `fn mark_events(values: &[i32], offset: i32, log: &mut Vec<i32>) {
    log.extend(values.iter().map(|value| value + offset));
}`;
  expect(rust(alternative, tests)).toBe(0);
}, 60_000);

it("the power review rejects narrowing its advertised million-value domain to u8", () => {
  const step = reviewExercises["loop-values"];
  const tests = testsOf(step);
  expect(rust(step.solution!, tests)).toBe(0);
  const narrowed = step.solution!.replace(
    "    if limit < 1",
    "    let limit = i32::from(limit as u8);\n    if limit < 1",
  );
  expect(rust(narrowed, tests)).toBe(101);
  const alternative = `fn last_power_of_two(limit: i32) -> i32 {
    if limit == 0 { return 0; }
    let mut result = 1;
    while result <= limit / 2 { result *= 2; }
    result
}`;
  expect(rust(alternative, tests)).toBe(0);
}, 60_000);

it.each(["stack-heap", "scope-drop", "function-ownership"])(
  "%s accepts a learner's Polish explanation through explicit self-assessment",
  (id) => {
    const step = reviewExercises[id];
    expect(step.evaluator?.kind).toBe("rubric");
    expect(step.evidenceKind).toBe("self-rating");
    if (step.evaluator?.kind !== "rubric")
      throw new Error("Expected explanation rubric");
    const ownWords =
      "Moje uzasadnienie: dane pozostają pod opieką aktualnego właściciela.";
    expect(
      evaluate(step.evaluator, {
        answer: ownWords,
        rubricChecks: step.evaluator.criteria,
      }).passed,
    ).toBe(true);
    expect(
      evaluate(step.evaluator, {
        answer: "",
        rubricChecks: step.evaluator.criteria,
      }).passed,
    ).toBe(false);
    expect(
      evaluate(step.evaluator, { answer: ownWords, rubricChecks: [] }).passed,
    ).toBe(false);
    expect(step.prompt).toContain("samoocena");
  },
);

it("the early ownership review uses String before Vec is taught", () => {
  const step = reviewExercises["stack-heap"];
  expect(step.prompt).toContain("String");
  expect(step.prompt).not.toContain("Vec");
});

it("the record review checks an owned name that outlives the source", () => {
  const step = reviewExercises["struct-records"];
  const checks = testsOf(step);
  expect(step.evidenceKind).toBe("recall");
  expect(rust(step.code!, checks)).toBe(101);
  expect(rust(step.solution!, checks)).toBe(0);
  expect(
    rust(
      step.solution!.replace("String::from(name)", "name.to_owned()"),
      checks,
    ),
  ).toBe(0);
  expect(
    rust(
      step.solution!.replace("String::from(name)", "String::from(name.trim())"),
      checks,
    ),
  ).toBe(101);
}, 60_000);
