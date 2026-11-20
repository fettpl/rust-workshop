import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lessons } from "@/content/course";
import { unsafeFfiReviewExercises } from "@/content/unsafe-ffi";
import { unsafeMiriReviewExercises } from "@/content/unsafe-miri";
import type { LessonStep } from "@/domain/types";
import { appendHiddenTests } from "@/runner";

function authored(ref: string): LessonStep {
  const [lessonId, stepId] = ref.split("/");
  const step = lessons
    .find((lesson) => lesson.id === lessonId)
    ?.steps.find((candidate) => candidate.id === stepId);
  if (!step?.solution || step.evaluator?.kind !== "tests")
    throw new Error(`Missing fixed authored Rust fixture: ${ref}`);
  return step;
}

const ffiSources = [
  "split-regions-gate",
  "split-regions-alias-gate",
  "split-regions-blank",
  "split-regions-recall",
].map((step) => `unsafe-ffi-split-regions/${step}`);
const miriSources = [
  "disjoint-regions-gate",
  "disjoint-regions-contract-gate",
  "disjoint-regions-blank",
  "disjoint-regions-recall",
].map((step) => `unsafe-miri-disjoint-regions/${step}`);
const ffiTargets = ffiSources;
const miriTargets = miriSources;
const crossModuleCases = [
  ...ffiSources.flatMap((source) =>
    miriTargets.map((target) => ({ source, target })),
  ),
  ...miriSources.flatMap((source) =>
    ffiTargets.map((target) => ({ source, target })),
  ),
];
const reviews = [
  unsafeFfiReviewExercises["unsafe-ffi-split-regions-contract"],
  unsafeMiriReviewExercises["unsafe-miri-disjoint-regions-contract"],
];

// These are closed, repository-authored safe split implementations, never
// learner/imported source or an undefined-behavior fixture. Review solutions
// are native contract controls; their presence does not establish UI exposure.
function compileFixture(solution: string, target: LessonStep) {
  if (target.evaluator?.kind !== "tests")
    throw new Error(`Expected authored test contract: ${target.id}`);
  const directory = mkdtempSync(join(tmpdir(), "cross-module-rust-"));
  const file = join(directory, "fixture.rs");
  const binary = join(directory, "fixture");
  writeFileSync(file, appendHiddenTests(solution, target.evaluator.tests));
  const compiled = spawnSync(
    "rustc",
    ["--edition=2024", "--test", file, "-o", binary],
    { cwd: directory, encoding: "utf8", timeout: 60_000 },
  );
  return { directory, binary, compiled, tests: target.evaluator.tests };
}

function expectFullContract(solution: string, target: LessonStep) {
  const fixture = compileFixture(solution, target);
  try {
    expect(fixture.compiled.error).toBeUndefined();
    expect(fixture.compiled.signal).toBeNull();
    expect(fixture.compiled.status, fixture.compiled.stderr).toBe(0);
    const names = [...fixture.tests.matchAll(/#\[test\]\s*fn\s+(\w+)/g)].map(
      (match) => match[1],
    );
    expect(names.length).toBeGreaterThan(0);
    const executed = spawnSync(fixture.binary, ["--test-threads=1"], {
      cwd: fixture.directory,
      encoding: "utf8",
      timeout: 10_000,
    });
    const output = `${executed.stdout}\n${executed.stderr}`;
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, output).toBe(0);
    for (const name of names)
      expect(output).toContain(
        `test __rust_workshop_hidden_tests::${name} ... ok`,
      );
    expect(output).toContain(
      `test result: ok. ${names.length} passed; 0 failed; 0 ignored`,
    );
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
}

describe("authored cross-module Rust contract overlap", () => {
  it("covers all legacy FFI/Miri split implementations and their alternate spellings", () => {
    expect(crossModuleCases).toHaveLength(32);
    expect(
      crossModuleCases.filter(
        ({ source, target }) =>
          authored(source).solution!.trim() ===
          authored(target).solution!.trim(),
      ),
    ).toHaveLength(12);
  });

  it.each(crossModuleCases)(
    "$source passes $target unchanged",
    ({ source, target }) => {
      const solution = authored(source).solution!;
      expect(solution).not.toMatch(/\bunsafe\b/);
      expectFullContract(solution, authored(target));
    },
    70_000,
  );

  it.each(
    reviews.flatMap((review) =>
      [...ffiTargets, ...miriTargets].map((target) => ({ review, target })),
    ),
  )(
    "authored $review.id passes $target unchanged without implying review UI exposure",
    ({ review, target }) => {
      expect(review.solution).toBeTruthy();
      expect(review.solution).not.toMatch(/\bunsafe\b/);
      expectFullContract(review.solution!, authored(target));
    },
    70_000,
  );

  it("accepts a generic authored length reader in the earlier ownership assessment", () => {
    const source = authored(
      "conversion-ownership-views/conversions-label-repair",
    );
    const target = authored("scenario-assessment/assessment-repair");
    expect(source.solution!.trim()).not.toBe(target.solution!.trim());
    expectFullContract(source.solution!, target);
  }, 70_000);
});

describe("new region behavior has a separate executable contract", () => {
  const fresh = [
    {
      target: "unsafe-ffi-split-regions/split-envelope-transfer",
      oldSources: miriSources,
      missingFunction: "split_envelope",
    },
    {
      target: "unsafe-miri-disjoint-regions/disjoint-regions-range-transfer",
      oldSources: ffiSources,
      missingFunction: "select_regions",
    },
  ];

  it.each(fresh)(
    "passes the full positive control for $target",
    ({ target }) => {
      const step = authored(target);
      expectFullContract(step.solution!, step);
    },
    70_000,
  );

  it.each(
    fresh.flatMap(({ target, oldSources, missingFunction }) =>
      oldSources.map((source) => ({ source, target, missingFunction })),
    ),
  )(
    "$source cannot satisfy $target unchanged",
    ({ source, target, missingFunction }) => {
      const fixture = compileFixture(
        authored(source).solution!,
        authored(target),
      );
      try {
        expect(fixture.compiled.error).toBeUndefined();
        expect(fixture.compiled.signal).toBeNull();
        expect(fixture.compiled.status).toBe(1);
        expect(fixture.compiled.stderr).toContain(
          `cannot find function \`${missingFunction}\``,
        );
      } finally {
        rmSync(fixture.directory, { recursive: true, force: true });
      }
    },
    70_000,
  );
});

describe("borrowed show retains its existing unit-return API", () => {
  const targets = [
    "functions-and-ownership/function-error",
    "number-guessing-transfer/project-error",
  ];

  it.each(targets)(
    "rejects the unrelated string-returning formatter for %s",
    (ref) => {
      const formatter = lessons
        .find((lesson) => lesson.id === "result-and-recovery")!
        .steps.find((step) => step.id === "result-run")!.solution!;
      const fixture = compileFixture(formatter, authored(ref));
      try {
        expect(fixture.compiled.error).toBeUndefined();
        expect(fixture.compiled.signal).toBeNull();
        expect(fixture.compiled.status).toBe(1);
        expect(fixture.compiled.stderr).toContain("error[E0308]");
        expect(fixture.compiled.stderr).toContain(
          "expected `()`, found `String`",
        );
      } finally {
        rmSync(fixture.directory, { recursive: true, force: true });
      }
    },
    70_000,
  );

  it.each(targets)(
    "accepts the canonical borrowed implementation for %s",
    (ref) => {
      const target = authored(ref);
      expectFullContract(target.solution!, target);
    },
    70_000,
  );

  it.each(targets)(
    "also accepts an independently authored str borrow for %s",
    (ref) => {
      expectFullContract(
        'fn show(text: &str) { println!("{text}"); }',
        authored(ref),
      );
    },
    70_000,
  );
});

it("the worked conversion starter already displays the ownership assessment length reader", () => {
  const conversion = authored(
    "conversion-ownership-views/conversions-label-repair",
  );
  const target = authored("scenario-assessment/assessment-repair");
  const helper = conversion.code!.match(/^fn measure[^\n]+$/m)?.[0];
  expect(helper).toBeTruthy();
  // Use the displayed helper verbatim; the old call site receives the borrow
  // required by that helper. No completed conversion exercise is needed.
  const repaired = target
    .code!.replace(
      /fn measure\(value: String\) -> usize \{\n    value.len\(\)\n\}/,
      helper!,
    )
    .replace("measure(text);", "measure(&text);");
  expect(repaired).toContain(helper!);
  expectFullContract(repaired, target);
}, 70_000);
