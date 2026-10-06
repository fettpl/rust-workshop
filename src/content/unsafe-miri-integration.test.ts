import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { modules, reviewExercises } from "./course";
import {
  unsafeMiriLessons,
  unsafeMiriModule,
  unsafeMiriReviewExercises,
} from "./unsafe-miri";
import { unsafeMiriAssessmentFixtures } from "./unsafe-miri-assessment-fixtures";

const lessonIds = [
  "unsafe-miri-byte-view",
  "unsafe-miri-disjoint-regions",
  "unsafe-miri-slot-state",
  "unsafe-miri-mut-slot",
];

it("registers exactly four Miri lessons with eight rubric gates, twelve evidence gates, and independent retrievals", () => {
  expect(unsafeMiriLessons.map((lesson) => lesson.id)).toEqual(lessonIds);
  expect(unsafeMiriModule.lessonIds).toEqual(lessonIds);
  expect(unsafeMiriModule.prerequisites).toEqual(["unsafe-ffi-contracts"]);
  expect(unsafeMiriModule.gateCriteria).toHaveLength(8);
  expect(
    unsafeMiriLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evidenceGate),
    ),
  ).toHaveLength(12);

  for (const lesson of unsafeMiriLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(lesson.steps.filter((step) => step.evidenceGate)).toHaveLength(3);
    const blank = lesson.steps.find((step) => step.kind === "blank")!;
    expect(blank.evidenceGate).toBe(true);
    const retrieval = lesson.steps.find(
      (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
    )!;
    expect(retrieval.code).toBeTruthy();
    expect(retrieval.solution).toBeTruthy();
    const otherCodingSteps = lesson.steps.filter(
      (step) =>
        step.id !== retrieval.id &&
        step.evaluator?.kind === "tests" &&
        step.code !== undefined,
    );
    for (const step of otherCodingSteps) {
      expect(retrieval.code).not.toBe(step.code);
      expect(retrieval.solution).not.toBe(step.solution);
      if (
        retrieval.evaluator?.kind === "tests" &&
        step.evaluator?.kind === "tests"
      ) {
        expect(retrieval.evaluator.tests).not.toBe(step.evaluator.tests);
      }
    }
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
  }

  const refs = unsafeMiriModule.gateCriteria!.flatMap((criterion) =>
    criterion.taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`),
  );
  expect(refs).toHaveLength(16);
  expect(new Set(refs).size).toBe(16);
  expect(modules.findIndex((module) => module.id === unsafeMiriModule.id)).toBe(
    modules.findIndex((module) => module.id === "unsafe-ffi-contracts") + 1,
  );
});

it("publishes complete pure-Rust declarations in every blank prompt", () => {
  const blank = (id: string) =>
    unsafeMiriLessons
      .flatMap((lesson) => lesson.steps)
      .find((step) => step.id === id)!;
  expect(blank("byte-view-blank").prompt).toMatch(
    /struct ByteView<'a> \{ bytes: &'a \[u8\] \}/,
  );
  expect(blank("byte-view-blank").prompt).toMatch(/MaybeUninit|zainicjaliz/);
  expect(blank("disjoint-regions-blank").prompt).toMatch(
    /enum SplitError \{ OutOfBounds \}/,
  );
  expect(blank("disjoint-regions-blank").prompt).toMatch(
    /fn split_regions<'a>\(buffer: &'a mut \[u8\], mid: usize\)/,
  );
  expect(blank("slot-state-blank").prompt).toMatch(
    /struct Slot<T> \{ value: MaybeUninit<T>, state: SlotState \}/,
  );
  expect(blank("slot-state-blank").prompt).toMatch(
    /put\(value: T\).*take\(\)/s,
  );
  expect(blank("mut-slot-blank").prompt).toMatch(
    /struct MutSlot<'a, T> \{ value: &'a mut T \}/,
  );
  expect(blank("mut-slot-blank").prompt).toMatch(/reborrow<'short>/);
  for (const lesson of unsafeMiriLessons) {
    const blankStep = lesson.steps.find((step) => step.kind === "blank")!;
    expect(blankStep.code).toBeUndefined();
    expect(blankStep.solution).not.toBeUndefined();
    const starters = lesson.steps.filter(
      (step) =>
        step.code !== undefined &&
        ["modify", "apply", "recall"].includes(step.kind),
    );
    expect(starters.every((step) => step.code !== step.solution)).toBe(true);
  }
});

it("keeps the compile-fail-like variance contract separate from runtime fixtures", () => {
  const step = unsafeMiriLessons
    .flatMap((lesson) => lesson.steps)
    .find((candidate) => candidate.id === "mut-slot-variance-compile-fail")!;
  expect(step.evaluator).toEqual({
    kind: "expected-error",
    diagnostic: "lifetime",
  });
  expect(step.expectedStatus).toBe("compile-error");
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-compile-fail-"));
  try {
    const file = join(directory, "mut-slot.rs");
    writeFileSync(file, step.code!);
    const result = spawnSync("rustc", ["--edition=2024", file], {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/lifetime/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps Slot retrieval drop evidence independent under concurrent Rust tests", () => {
  const step = unsafeMiriLessons
    .flatMap((lesson) => lesson.steps)
    .find((candidate) => candidate.id === "slot-state-recall")!;
  expect(step.evaluator?.kind).toBe("tests");
  if (step.evaluator?.kind !== "tests") return;

  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-slot-recall-"));
  try {
    const fixtures = [
      ["solution", step.solution!, true],
      ["starter", step.code!, false],
    ] as const;
    for (const [name, source, shouldPass] of fixtures) {
      const file = join(directory, `${name}.rs`);
      const binary = join(directory, name);
      writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error, `${name}: compiler`).toBeUndefined();
      expect(compiled.status, `${name}: ${compiled.stderr}`).toBe(0);

      const attempts = shouldPass ? 20 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const executed = spawnSync(binary, ["--test-threads=2"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(executed.error, `${name}/${attempt}: runner`).toBeUndefined();
        expect(executed.signal, `${name}/${attempt}: signal`).toBeNull();
        expect(executed.status === 0, `${name}/${attempt}`).toBe(shouldPass);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it.each(unsafeMiriAssessmentFixtures)(
  "$id accepts an equivalent fixture and rejects its independent mutant",
  (fixture) => {
    const step = [
      ...unsafeMiriLessons.flatMap((lesson) => lesson.steps),
      ...Object.values(unsafeMiriReviewExercises),
    ].find((candidate) => candidate.id === fixture.id);
    expect(step?.evaluator?.kind, fixture.id).toBe("tests");
    if (!step || step.evaluator?.kind !== "tests") return;
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant.replace(/\s+/g, ""), fixture.id).not.toBe(
      fixture.equivalent.replace(/\s+/g, ""),
    );
    const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-assessment-"));
    try {
      for (const [name, source, shouldPass] of [
        ["canonical", step.solution!, true],
        ["equivalent", fixture.equivalent, true],
        ["mutant", fixture.mutant, false],
      ] as const) {
        const file = join(directory, `${name}.rs`);
        const binary = join(directory, name);
        writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
        const compiled = spawnSync(
          "rustc",
          ["--edition=2024", "--test", file, "-o", binary],
          { cwd: directory, encoding: "utf8", timeout: 60_000 },
        );
        expect(
          compiled.error,
          `${fixture.id}/${name}: compiler`,
        ).toBeUndefined();
        expect(
          compiled.status,
          `${fixture.id}/${name}: ${compiled.stderr}`,
        ).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(executed.error, `${fixture.id}/${name}: runner`).toBeUndefined();
        expect(executed.status === 0, `${fixture.id}/${name}`).toBe(shouldPass);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);
