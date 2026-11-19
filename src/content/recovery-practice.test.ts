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
function checkRust(source: string, tests: string, passes: boolean) {
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
