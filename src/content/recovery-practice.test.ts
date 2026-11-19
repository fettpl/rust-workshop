import exerciseDelta from "./fixtures/exercise-contracts-delta.json";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import { lessons, reviewExercises } from "./course";
import {
  hashRegistryValue,
  historicalBeforeA12,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import { restoreRecoveryPracticeLessons } from "./workshop-assessment-repair-compatibility-fixture";
import * as course from "./course";
import snapshot from "./fixtures/recovery-practice-delta.json";

const before = restoreRecoveryPracticeLessons(
  lessons,
  new Map(),
  matchesRegistryValue,
);
const step = (id: string, catalog = lessons) =>
  catalog.flatMap((l) => l.steps).find((s) => s.id === id)!;

// Invoke only the fixed repository-authored controls below.
function checkRust(source: string, tests: string, passes: boolean | "E0308") {
  const dir = mkdtempSync(join(tmpdir(), "recovery-curriculum-"));
  try {
    const file = join(dir, "exercise.rs"),
      binary = join(dir, "exercise");
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--test", "--edition=2024", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (compiled.error) throw compiled.error;
    if (passes === "E0308") {
      expect(compiled.status, compiled.stderr).toBe(1);
      expect(compiled.stderr).toContain("error[E0308]");
      return;
    }
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, [], { encoding: "utf8", timeout: 10_000 });
    if (run.error) throw run.error;
    expect(run.status, run.stdout + run.stderr).toBe(passes ? 0 : 101);
    expect(run.stdout).toMatch(
      passes
        ? /[1-9]\d* passed; 0 failed; 0 ignored/
        : /[1-9]\d* failed; 0 ignored/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const testsOf = (s: LessonStep) => {
  if (s.evaluator?.kind !== "tests")
    throw new Error("Missing Rust contract for " + s.id);
  return s.evaluator.tests;
};

const recovery = step("recovery-readings-policy");
const strict = `const POMIJAJ_BRAKI: bool = false;
fn podsumuj(wiersze: &[&str]) -> Result<(i64, usize), usize> {
    let mut suma = 0;
    for (i, s) in wiersze.iter().enumerate() {
        suma += i64::from(s.parse::<i16>().map_err(|_| i + 1)?);
    }
    Ok((suma, 0))
}`;
it.each([
  ["skip missing rows", recovery.solution!, true],
  ["stop on first missing row", strict, true],
  [
    "contradict declared policy",
    strict.replace("bool = false", "bool = true"),
    false,
  ],
  [
    "accept malformed as missing",
    recovery.solution!.replace(
      "tekst.is_empty()",
      "tekst.parse::<i16>().is_err()",
    ),
    false,
  ],
  ["wrong source line", strict.replace("i + 1", "i"), false],
  [
    "silently discard whitespace",
    strict.replace("s.parse::<i16>()", "s.trim().parse::<i16>()"),
    false,
  ],
  [
    "lose missing count",
    recovery.solution!.replace("Ok((suma, braki))", "Ok((suma, 0))"),
    false,
  ],
] as const)("checks the caller's policy: %s", (_name, candidate, passes) => {
  expect(recovery.code).toBeUndefined();
  checkRust(candidate, testsOf(recovery), passes);
});

const vecControls = [
  [
    "vec-last-gate",
    "fn last_value(v: &[i32]) -> Option<&i32> { let last = v.last()?; v.iter().find(|x| *x == last) }",
    "fn last_value(v: &[i32]) -> Option<&i32> { v.iter().next_back() }",
  ],
  [
    "vec-transfer",
    "fn summary(v: &[i32]) -> (Option<&i32>, usize) { (v.first().and_then(|x| v.iter().rev().find(|y| *y == x)), v.iter().filter(|n| **n < 0).count()) }",
    "fn summary(v: &[i32]) -> (Option<&i32>, usize) { (v.get(0), v.iter().filter(|n| **n < 0).count()) }",
  ],
  [
    "review-vec-borrowing",
    "fn second(v: &[i32]) -> Option<&i32> { let x = v.get(1)?; v.iter().find(|y| *y == x) }",
    "fn second(v: &[i32]) -> Option<&i32> { v.iter().nth(1) }",
  ],
];
it.each(vecControls)("checks slot identity for %s", (id, wrong, valid) => {
  const isReview = id === "review-vec-borrowing";
  const live = isReview ? reviewExercises["vec-borrowing"] : step(id);
  checkRust(
    wrong,
    isReview ? snapshot.review.beforeTests : testsOf(step(id, before)),
    true,
  );
  checkRust(wrong, testsOf(live), false);
  checkRust(valid, testsOf(live), true);
});

const paraphrases = [
  [
    "async-lending-cancel-commit-recall",
    "Po wykonaniu callbacku zatwierdzam rekord. Przerwanie w trakcie oczekiwania zostawia go dla kolejnego odbiorcy.",
  ],
  [
    "allocation-scope-recall",
    "Widzę żądania zarejestrowane w danym oknie, a rezydentne strony i żywe obiekty wymagają innych pomiarów.",
  ],
  [
    "allocation-comparison-recall",
    "Sprawdzam wejście, wynik i kompletność w obu oknach. Mniej wywołań jest wnioskiem tylko o liczniku.",
  ],
  [
    "bounded-retry-recall",
    "Bez próby kończę, gdy limit wynosi zero albo termin już minął. Po BUSY lub QUEUE_FULL mogę ponowić to samo żądanie, o ile wystarczy budżetu.",
  ],
  [
    "ambiguous-driver-recall",
    "Potwierdzenie INSERTED lub DUPLICATE z właściwą dodatnią sekwencją rozstrzyga wynik. Po urwanej odpowiedzi nie wiem, czy serwer zapisał dane.",
  ],
  [
    "async-lending-receiver-recall",
    "Dopiero gdy poprzedni odbiór zwolni wyłączną pożyczkę. Porzucenie rekordu zwalnia ją bez zatwierdzenia, a finish przesuwa pozycję.",
  ],
  [
    "async-lending-dyn-adapter-recall",
    "Przy znanym typie mogę zachować statyczne pożyczenie; adapter ma sens dla różnych typów pod wspólnym interfejsem, kosztem opakowania i wywołania dynamicznego.",
  ],
];
it.each(paraphrases)(
  "accepts a self-checked explanation for %s",
  (id, answer) => {
    const live = step(id),
      old = step(id, before);
    expect(old.evaluator?.kind).toBe("answer");
    expect(evaluate(old.evaluator!, { answer }).passed).toBe(false);
    expect(live.evidenceKind).toBe("self-rating");
    expect(live.evidenceGate).toBeFalsy();
    if (live.evaluator?.kind !== "rubric") throw new Error(id);
    const rubricChecks = live.evaluator.criteria;
    expect(new Set(rubricChecks).size).toBeGreaterThanOrEqual(2);
    expect(evaluate(live.evaluator, { answer, rubricChecks }).passed).toBe(
      true,
    );
    expect(
      evaluate(live.evaluator, { answer: "  ", rubricChecks }).passed,
    ).toBe(false);
    for (const c of rubricChecks)
      expect(
        evaluate(live.evaluator, {
          answer,
          rubricChecks: rubricChecks.filter((v) => v !== c),
        }).passed,
      ).toBe(false);
  },
);

it("preserves the captured previous lessons and the historical Vec review aliases", () => {
  expect(hashRegistryValue(before)).toBe(
    "f50143ed57fac8c71cefdd0979510b1a9b5dd197212e54c7cfa7f36363e2e8ab",
  );
  const live = reviewExercises["vec-borrowing"];
  const historical = historicalBeforeA12({ ...course, reviewAlias: live });
  expect(historical.reviewAlias).toBe(
    historical.reviewExercises["vec-borrowing"],
  );
  expect(historical.reviewAlias).toBe(historical.reviewExercisesById[live.id]);
  expect(hashRegistryValue(historical.reviewAlias)).toBe(
    snapshot.review.beforeSha256,
  );
});

const iteratorViewsStep = lessons
  .find((lesson) => lesson.id === "iterator-ownership")!
  .steps.find((exercise) => exercise.id === "ownership-blank")!;

const gradingControls = [
  {
    exercise: step("panic-modify"),
    incorrect: `fn percentage(text: &str) -> Result<i32, &str> {
    use std::num::IntErrorKind::*;
    match text.parse::<i32>() {
        Ok(n @ (0 | 100)) => Ok(n),
        Ok(_) => Err("outside"),
        Err(e) if matches!(e.kind(), PosOverflow | NegOverflow) => Err("outside"),
        Err(_) => Err("invalid"),
    }
}`,
  },
  {
    exercise: step("pipelines-modify"),
    incorrect: `fn selected_lengths(words: &[String], minimum: usize) -> Vec<usize> {
    let mut lengths: Vec<_> = words.iter().map(String::len).filter(|n| *n >= minimum).collect();
    lengths.sort_by(|a, b| b.cmp(a));
    lengths
}`,
  },
  {
    exercise: iteratorViewsStep,
    incorrect: `fn views<'a>(log: &'a [String], prefix: &str) -> Vec<&'a str> {
    log.iter().filter(|line| line.starts_with(prefix))
        .map(|line| log.iter().find(|other| *other == line).unwrap().as_str()).collect()
}`,
  },
  {
    exercise: reviewExercises["iterator-item-ownership"],
    incorrect: `struct Parcel { label: String, priority: bool }
fn urgent_labels(parcels: &[Parcel]) -> Vec<&str> {
    parcels.iter().filter(|parcel| parcel.priority)
        .map(|parcel| parcels.iter().find(|other| other.label == parcel.label).unwrap().label.as_str())
        .collect()
}`,
  },
];

it.each(gradingControls)(
  "$exercise.id rejects the audited incorrect implementation and accepts the reference",
  ({ exercise, incorrect }) => {
    checkRust(incorrect, testsOf(exercise), false);
    checkRust(exercise.solution!, testsOf(exercise), true);
  },
);

it("vec-even-gate requires a slice-compatible API", () => {
  const exercise = step("vec-even-gate");
  const narrowed = `fn count_even(values: &Vec<i32>) -> usize {
    values.iter().filter(|n| *n % 2 == 0).count()
}`;
  checkRust(narrowed, testsOf(exercise), "E0308");
  checkRust(exercise.solution!, testsOf(exercise), true);
});

it("restores the original iterator review through both registry aliases", () => {
  const live = reviewExercises["iterator-item-ownership"];
  const historical = historicalBeforeA12({ ...course, reviewAlias: live });
  expect(historical.reviewAlias).toBe(historical.reviewExercises["iterator-item-ownership"]);
  expect(historical.reviewAlias).toBe(historical.reviewExercisesById[live.id]);
  expect(hashRegistryValue(historical.reviewAlias)).toBe(exerciseDelta.review.beforeSha256);
});

const firstEvenExercise = step("quality-blank-gate");
const firstEvenCases = {
  empty: "assert_eq!(candidate(&[]), None);",
  delayed: "assert_eq!(candidate(&[7, -3, -8, 6]), Some(-8));",
  initial: "assert_eq!(candidate(&[2, 4]), Some(2));",
  absent: "assert_eq!(candidate(&[1, -3]), None);",
};

function firstEvenHelper(assertions: string[]) {
  return `fn assert_first_even_contract(candidate: fn(&[i32]) -> Option<i32>) {
    ${assertions.join("\n    ")}
}`;
}

it.each(Object.keys(firstEvenCases))(
  "first-even assessment rejects a learner suite missing the %s case",
  (omitted) => {
    const remaining = Object.entries(firstEvenCases)
      .filter(([name]) => name !== omitted)
      .map(([, assertion]) => assertion);
    checkRust(firstEvenHelper(remaining), testsOf(firstEvenExercise), false);
  },
);

it("first-even assessment accepts independent cases and the published solution", () => {
  const tests = testsOf(firstEvenExercise);
  checkRust(firstEvenHelper(Object.values(firstEvenCases)), tests, true);
  checkRust(firstEvenExercise.solution!, tests, true);
});
