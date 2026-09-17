import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import {
  gatProducerLessons,
  gatProducerReviewExercises,
} from "./gat-producers";

const trait = `trait LendingIterator {
    type Item<'a> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}`;

const starters = {
  row: `${trait}
struct RowLender<T> { rows: Vec<Vec<T>>, next: usize }
impl<T> RowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, next: 0 } } }
impl<T> LendingIterator for RowLender<T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
  present: `${trait}
struct PresentValueLender<T> { values: Vec<Option<T>>, next: usize }
impl<T> PresentValueLender<T> { fn new(values: Vec<Option<T>>) -> Self { Self { values, next: 0 } } }
impl<T> LendingIterator for PresentValueLender<T> { type Item<'a> = &'a mut T where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
  windows: `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct WindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> WindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) } } }
impl<T> LendingIterator for WindowsMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
  prefixes: `${trait}
struct GrowingPrefixesMut<'data, T> { data: &'data mut [T], maximum: usize, length: usize, done: bool }
impl<'data, T> GrowingPrefixesMut<'data, T> { fn new(data: &'data mut [T], maximum: usize) -> Self { Self { data, maximum, length: 1, done: false } } }
impl<T> LendingIterator for GrowingPrefixesMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
  reverseRows: `${trait}
struct ReverseRowLender<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> ReverseRowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { let position = rows.len().saturating_sub(1); Self { rows, position } } }
impl<T> LendingIterator for ReverseRowLender<T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
  reverseWindows: `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct ReverseWindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> ReverseWindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) } } }
impl<T> LendingIterator for ReverseWindowsMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }`,
};

function step(id: string) {
  for (const lesson of gatProducerLessons) {
    const found = lesson.steps.find((candidate) => candidate.id === id);
    if (found) return found;
  }
  const found = Object.values(gatProducerReviewExercises).find(
    (candidate) => candidate.id === id,
  );
  if (!found) throw new Error(`missing producer step ${id}`);
  return found;
}

function testsFor(id: string): string {
  const evaluator = step(id).evaluator;
  if (evaluator?.kind !== "tests") throw new Error(`missing tests for ${id}`);
  return evaluator.tests;
}

function runRust(source: string, tests: string) {
  const directory = mkdtempSync(join(tmpdir(), "gat-producers-red-"));
  try {
    const file = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(
      file,
      `${source}\n#[cfg(test)] mod tests { use super::*; ${tests} }`,
    );
    const compile = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compile.error, compile.stderr).toBeUndefined();
    expect(compile.signal, compile.stderr).toBeNull();
    expect(compile.status, compile.stderr).toBe(0);
    const executed = spawnSync(binary, [], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, executed.stderr).toBeUndefined();
    expect(executed.signal, executed.stderr).toBeNull();
    return executed;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("GAT producer contracts", () => {
  it("keeps independent test gates, source-free blanks, and reviews", () => {
    for (const lesson of gatProducerLessons) {
      const gate = lesson.steps.find(
        (candidate) => candidate.id === `${lesson.id}-gate`,
      )!;
      const blank = lesson.steps.find(
        (candidate) => candidate.id === `${lesson.id}-blank`,
      )!;
      expect(gate.evaluator?.kind).toBe("tests");
      expect(gate.evidenceGate).toBe(true);
      expect(blank.code).toBeUndefined();
      expect(blank.evidenceGate).toBe(true);
      expect(gatProducerReviewExercises[lesson.id].evaluator?.kind).toBe(
        "tests",
      );
    }
  });

  it("rejects unfinished starters using the actual step evaluators", () => {
    const unfinished: [string, string][] = [
      [starters.row, testsFor("gat-receiver-borrows-gate")],
      [starters.present, testsFor("gat-receiver-borrows-blank")],
      [starters.windows, testsFor("gat-overlapping-mutable-windows-gate")],
      [starters.prefixes, testsFor("gat-overlapping-mutable-windows-blank")],
      [starters.reverseRows, testsFor("gat-receiver-borrows-review")],
      [
        starters.reverseWindows,
        testsFor("gat-overlapping-mutable-windows-review"),
      ],
    ];
    for (const [source, tests] of unfinished)
      expect(runRust(source, tests).status).toBe(101);
  });

  it("keeps constructor, order, maximum, and scratch regressions rejected", () => {
    const reverseRows = step("gat-receiver-borrows-review").solution!;
    const reverseWindows = step(
      "gat-overlapping-mutable-windows-review",
    ).solution!;
    const prefixes = step("gat-overlapping-mutable-windows-blank").solution!;
    const present = step("gat-receiver-borrows-blank").solution!;
    const badReverseRows = reverseRows.replace(
      "rows.len().checked_sub(1)",
      "Some(rows.len() - 1)",
    );
    const badReverseOrder = reverseRows.replace(
      "self.rows[position].as_mut_slice()",
      "{ let wrong = self.rows.len() - 1 - position; self.rows[wrong].as_mut_slice() }",
    );
    const badReverseWindows = reverseWindows.replace(
      "data.len().checked_sub(width)",
      "Some(data.len() - width)",
    );
    const badPrefixes = prefixes
      .replace(/self\.length > self\.maximum \|\| /g, "false || ")
      .replace(/end >= self\.maximum \|\| /g, "false || ");
    const badPresentEarly = present.replace(
      "let start = self.next.get(); let len = self.values.len();",
      "let start = self.next.get(); let len = self.values.len(); if start > 0 { self.values[start - 1] = None; }",
    );
    const badPresent = `${trait}
use std::cell::Cell;
struct PresentValueLender<T> { values: Vec<Option<T>>, next: Cell<usize>, current: Option<T> }
impl<T> PresentValueLender<T> { fn new(values: Vec<Option<T>>) -> Self { Self { values, next: Cell::new(0), current: None } } }
impl<T> LendingIterator for PresentValueLender<T> { type Item<'a> = &'a mut T where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let len = self.values.len(); while self.next.get() < len { let index = self.next.get(); self.next.set(index + 1); if let Some(value) = self.values[index].take() { self.current = Some(value); return self.current.as_mut(); } } None } }`;
    expect(
      runRust(badReverseRows, testsFor("gat-receiver-borrows-review")).status,
    ).toBe(101);
    expect(
      runRust(badReverseOrder, testsFor("gat-receiver-borrows-review")).status,
    ).toBe(101);
    expect(
      runRust(
        badReverseWindows,
        testsFor("gat-overlapping-mutable-windows-review"),
      ).status,
    ).toBe(101);
    expect(
      runRust(badPrefixes, testsFor("gat-overlapping-mutable-windows-blank"))
        .status,
    ).toBe(101);
    expect(
      runRust(badPresent, testsFor("gat-receiver-borrows-blank")).status,
    ).toBe(101);
    expect(
      runRust(badPresentEarly, testsFor("gat-receiver-borrows-blank")).status,
    ).toBe(101);
  });

  it("passes the scoped trusted verifier for producer lessons and reviews", () => {
    const results = verifyTrustedRust({
      lessons: gatProducerLessons,
      reviewExercises: gatProducerReviewExercises,
      traces: {},
    });
    expect(
      results.filter((result) => !result.passed),
      JSON.stringify(results, null, 2),
    ).toEqual([]);
  }, 240_000);
});
