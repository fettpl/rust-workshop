import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { lessons } from "./course";
import {
  hashRegistryValue,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import { restoreCollectionsEventLessons } from "./workshop-assessment-repair-compatibility-fixture";

const lesson = lessons.find((item) => item.id === "hashmap-and-entry")!;
const exercise = lesson.steps.at(-1)!;

// Unlike the worked solution, this version uses a map from names to row indices.
const counting = `fn zlicz(input: &[&str]) -> Vec<(String, usize)> {
    let mut positions = std::collections::HashMap::new();
    let mut rows = Vec::<(String, usize)>::new();
    for &name in input {
        let index = *positions.entry(name).or_insert_with(|| {
            rows.push((name.to_owned(), 0));
            rows.len() - 1
        });
        rows[index].1 += 1;
    }
    rows
}`;
const firstSeenReport = `fn raport_awarii(input: &[&str]) -> Vec<(String, usize)> { zlicz(input) }`;
const sortedReport = `fn raport_nazw(input: &[&str]) -> Vec<(String, usize)> {
    let mut rows = zlicz(input);
    rows.sort();
    rows
}`;

const sortedFailure = "test_kursanta_wykrywa_sortowanie";
const countFailure = "test_kursanta_wykrywa_zgubione_powtorzenia";
const correctFailure = "test_kursanta_przyjmuje_poprawny_raport";
const cases = [
  {
    name: "a different data structure and a discriminating test",
    input: '["Z", "", "Z"]',
    expected: '[("Z", 2), ("", 1)]',
    failed: [],
  },
  {
    name: "the original view incorrectly using arrival order",
    nameReport:
      "fn raport_nazw(input: &[&str]) -> Vec<(String, usize)> { zlicz(input) }",
    input: '["Z", "", "Z"]',
    expected: '[("Z", 2), ("", 1)]',
    failed: ["raport_w_porzadku_nazw"],
  },
  {
    name: "the incident view incorrectly using name order",
    incidentReport:
      "fn raport_awarii(input: &[&str]) -> Vec<(String, usize)> { raport_nazw(input) }",
    input: '["Z", "", "Z"]',
    expected: '[("Z", 2), ("", 1)]',
    failed: ["raport_w_porzadku_pierwszych_wystapien", "moja_regresja"],
  },
  {
    name: "a test with already sorted first appearances",
    input: '["a", "a", "b"]',
    expected: '[("a", 2), ("b", 1)]',
    failed: [sortedFailure],
  },
  {
    name: "a test with no repeats",
    input: '["z", "a"]',
    expected: '[("z", 1), ("a", 1)]',
    failed: [countFailure],
  },
  { name: "a vacuous test", body: "", failed: [sortedFailure, countFailure] },
  {
    name: "a test that always fails",
    body: 'panic!("wrong expectation");',
    failed: [correctFailure, "moja_regresja"],
  },
];

it.each(cases)("checks $name with the real Rust harness", (candidate) => {
  if (exercise.evaluator?.kind !== "tests")
    throw new Error("Missing report tests");
  const body =
    candidate.body ??
    `let expected = ${candidate.expected}.map(|(s, n)| (String::from(s), n));
    assert_eq!(raport(&${candidate.input}), expected);`;
  const code = `${counting}
${candidate.incidentReport ?? firstSeenReport}
${candidate.nameReport ?? sortedReport}
fn sprawdz(raport: fn(&[&str]) -> Vec<(String, usize)>) { ${body} }
#[test] fn moja_regresja() { sprawdz(raport_awarii); }`;
  const dir = mkdtempSync(join(tmpdir(), "event-report-"));
  try {
    const file = join(dir, "exercise.rs");
    const binary = join(dir, "exercise");
    writeFileSync(file, appendHiddenTests(code, exercise.evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (compiled.error) throw compiled.error;
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    if (run.error) throw run.error;
    expect(run.status, run.stdout + run.stderr).toBe(
      candidate.failed.length ? 101 : 0,
    );
    const failed = [
      ...run.stdout.matchAll(/^test (?:\w+::)*(\w+) \.\.\. FAILED$/gm),
    ].map((match) => match[1]);
    expect(failed.sort(), run.stdout).toEqual([...candidate.failed].sort());
    expect(run.stdout).toContain(
      `${6 - failed.length} passed; ${failed.length} failed; 0 ignored`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("appends the exercise without shifting historical steps or hiding other edits", () => {
  expect(exercise.id).toBe("events-report-regression");
  const restore = (catalog: typeof lessons) =>
    restoreCollectionsEventLessons(catalog, new Map(), matchesRegistryValue);
  const restored = restore(lessons);
  expect(hashRegistryValue(restored)).toBe(
    "4c2917681583247dc05680516b2cde81e24937521d94cec127e4d86e1fd4d145",
  );
  expect(restore(restored)).toBe(restored);
  restored.forEach((item, index) => {
    if (item.id === lesson.id) {
      expect(item).toEqual({ ...lesson, steps: lesson.steps.slice(0, 8) });
      item.steps.forEach((step, i) => expect(step).toBe(lesson.steps[i]));
    } else {
      expect(item).toBe(lessons[index]);
    }
  });
  for (const steps of [
    [...lesson.steps.slice(0, -1), { ...exercise, title: "Unreviewed change" }],
    [exercise, ...lesson.steps.slice(0, -1)],
    [...lesson.steps, exercise],
  ]) {
    const changed = lessons.map((item) =>
      item === lesson ? { ...lesson, steps } : item,
    );
    expect(restore(changed)).toBe(changed);
  }
});
