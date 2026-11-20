/** Runs fixed repository-authored scaffolds only, never learner or imported code. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { EvidenceEvent, LessonStep } from "../domain/types";
import { lengthPrefixedTexts, replaceCurrentFile } from "./todo-io-archive-practice";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import { lessons, modules } from "./course";
import { ioModule, ioReviewExercises } from "./io";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseLessonExposure,
  recordSuppliedSolutions,
} from "./learning-context";

const disclosures = [
  [
    "todo-file-persistence",
    "file-debug",
    "todo-storage-format",
    "format-debug",
    "format-gate",
    0,
  ],
  [
    "todo-file-persistence",
    "file-gate",
    "todo-storage-format",
    "format-gate",
    "format-debug",
    0,
  ],
  [
    "todo-terminal-cli",
    "cli-debug",
    "todo-storage-format",
    "format-debug",
    "format-gate",
    0,
  ],
  [
    "todo-terminal-cli",
    "cli-debug",
    "todo-file-persistence",
    "file-debug",
    "file-gate",
    1,
  ],
  [
    "todo-terminal-cli",
    "cli-gate",
    "todo-storage-format",
    "format-gate",
    "format-debug",
    0,
  ],
  [
    "todo-terminal-cli",
    "cli-gate",
    "todo-file-persistence",
    "file-gate",
    "file-debug",
    1,
  ],
] as const;

function stepAt(lessonId: string, stepId: string) {
  return lessons
    .find((lesson) => lesson.id === lessonId)!
    .steps.find((step) => step.id === stepId)!;
}

function eventFor(lessonId: string, stepId: string, at = 200): EvidenceEvent {
  const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
  const step = stepAt(lessonId, stepId);
  return {
    id: `supplied-solution/${lessonId}/${stepId}/${at}`,
    lessonId,
    stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    gate: step.evidenceGate === true,
    hints: 0,
    revealed: false,
    at,
  };
}

function visit(lessonId: string, stepId: string) {
  const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
  const state = recordCourseLessonExposure(createInitialState(), {
    lessonId,
    stepId,
    conceptIds: lesson.conceptIds,
    at: 100,
  });
  return recordSuppliedSolutions(state, stepAt(lessonId, stepId), "code", 100);
}

function nativeStatus(source: string, task: LessonStep) {
  if (task.evaluator?.kind !== "tests")
    throw new Error("Expected authored native contract");
  const directory = mkdtempSync(join(tmpdir(), "todo-io-supplied-"));
  try {
    const path = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(path, appendHiddenTests(source, task.evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", path, "-o", binary],
      {
        encoding: "utf8",
        timeout: 60_000,
      },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      env: { ...process.env, TMPDIR: directory, TMP: directory, TEMP: directory },
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(run.error).toBeUndefined();
    expect([0, 101]).toContain(run.status);
    return run.status;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each(disclosures)(
  "%s/%s starter supplies the complete earlier %s/%s implementation",
  (sourceLesson, sourceId, targetLesson, targetId) => {
    const source = stepAt(sourceLesson, sourceId);
    const target = stepAt(targetLesson, targetId);
    expect(nativeStatus(source.code!, target)).toBe(0);
    // The source is still a real exercise: its supplied dependencies do not solve its own task.
    expect(nativeStatus(source.code!, source)).toBe(101);
  },
  60_000,
);

it.each(disclosures)(
  "visiting %s/%s prevents subsequent clean-looking %s/%s credit and keeps the other domain fresh",
  (sourceLesson, sourceId, targetLesson, targetId, otherId, criterionIndex) => {
    const target = stepAt(targetLesson, targetId);
    const lesson = lessons.find((lesson) => lesson.id === targetLesson)!;
    const state = visit(sourceLesson, sourceId);
    expect(assistanceForLessonStep(state, lesson, target)).toEqual({
      hints: 0,
      revealed: true,
    });
    state.events.push(eventFor(targetLesson, targetId));
    const restored = importState(exportState(state));
    const before = JSON.stringify(restored);
    expect(
      courseModuleGate(restored, lessons, ioModule).criteria[criterionIndex]
        .passed,
    ).toBe(false);
    expect(
      courseGateRecovery(
        restored,
        ioModule.gateCriteria![criterionIndex],
        lessons,
      ),
    ).toEqual({
      status: "available",
      task: { lessonId: targetLesson, stepId: otherId },
    });
    expect(JSON.stringify(restored)).toBe(before);
    restored.events.push(eventFor(targetLesson, otherId, 300));
    expect(
      courseModuleGate(importState(exportState(restored)), lessons, ioModule)
        .criteria[criterionIndex].passed,
    ).toBe(true);
  },
);

it.each(disclosures)(
  "later %s/%s exposure preserves earlier independent %s/%s events",
  (
    sourceLesson,
    sourceId,
    targetLesson,
    targetId,
    _otherId,
    criterionIndex,
  ) => {
    const initial = createInitialState();
    const success = eventFor(targetLesson, targetId, 50);
    initial.events = [success];
    const source = lessons.find((lesson) => lesson.id === sourceLesson)!;
    const visited = recordCourseLessonExposure(initial, {
      lessonId: sourceLesson,
      stepId: sourceId,
      conceptIds: source.conceptIds,
      at: 100,
    });
    const state = recordSuppliedSolutions(
      visited,
      stepAt(sourceLesson, sourceId),
      "code",
      100,
    );
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, ioModule).criteria[criterionIndex]
        .passed,
    ).toBe(true);
    expect(restored.events[0]).toEqual(success);
  },
);

it("unvisited later scaffolds do not contaminate either format task", () => {
  const lesson = lessons.find((lesson) => lesson.id === "todo-storage-format")!;
  for (const id of ["format-debug", "format-gate"]) {
    const state = createInitialState();
    const step = stepAt(lesson.id, id);
    expect(assistanceForLessonStep(state, lesson, step)).toEqual({
      hints: 0,
      revealed: false,
    });
    state.events = [eventFor(lesson.id, id)];
    expect(courseModuleGate(state, lessons, ioModule).criteria[0].passed).toBe(
      true,
    );
  }
});

const reviewDisclosures = [
  ["io-format-roundtrip", "solution", "todo-storage-format", "format-gate", 0],
  ["io-safe-persistence", "code", "todo-storage-format", "format-gate", 0],
  ["io-safe-persistence", "solution", "todo-storage-format", "format-gate", 0],
  ["io-safe-persistence", "solution", "todo-file-persistence", "file-gate", 1],
  ["io-terminal-boundary", "code", "todo-storage-format", "format-gate", 0],
  ["io-terminal-boundary", "code", "todo-file-persistence", "file-gate", 1],
  ["io-terminal-boundary", "solution", "todo-storage-format", "format-gate", 0],
  ["io-terminal-boundary", "solution", "todo-file-persistence", "file-gate", 1],
  ["io-terminal-boundary", "solution", "todo-terminal-cli", "cli-gate", 2],
] as const;

it.each(reviewDisclosures)(
  "%s %s supplies %s/%s without creating primary independent credit",
  (sourceId, variant, targetLesson, targetId, criterionIndex) => {
    const source = ioReviewExercises[sourceId];
    const target = stepAt(targetLesson, targetId);
    expect(nativeStatus(source[variant]!, target)).toBe(0);
    const state = recordSuppliedSolutions(
      createInitialState(),
      source,
      variant,
      100,
    );
    state.events.push(eventFor(targetLesson, targetId));
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, ioModule).criteria[criterionIndex]
        .passed,
    ).toBe(false);
    expect(
      assistanceForLessonStep(
        restored,
        lessons.find((lesson) => lesson.id === targetLesson)!,
        target,
      ),
    ).toEqual({ hints: 0, revealed: true });
    const before = createInitialState();
    const independent = eventFor(targetLesson, targetId, 50);
    before.events = [independent];
    const later = recordSuppliedSolutions(before, source, variant, 100);
    expect(
      courseModuleGate(importState(exportState(later)), lessons, ioModule)
        .criteria[criterionIndex].passed,
    ).toBe(true);
    expect(later.events[0]).toEqual(independent);
  },
  60_000,
);

it("an unopened review starter leaves earlier tasks independent", () => {
  const source = ioReviewExercises["io-terminal-boundary"];
  const state = recordCourseLessonExposure(createInitialState(), {
    lessonId: "review",
    stepId: `${source.id}:fixture-session`,
    conceptIds: ["io-terminal-boundary"],
    at: 100,
  });
  state.events.push(eventFor("todo-storage-format", "format-gate"));
  expect(courseModuleGate(state, lessons, ioModule).criteria[0].passed).toBe(
    true,
  );
});

const upstreamTargets = [
  ["todo-command-parser", "parser-debug", 0],
  ["todo-command-parser", "parser-add-gate", 0],
  ["todo-state-invariants", "state-debug", null],
  ["todo-state-invariants", "state-add-done-gate", 1],
  ["todo-state-invariants", "state-list-gate", 2],
] as const;

it.each(upstreamTargets)(
  "the supplied Todo IO model really passes the entire upstream %s/%s contract",
  (lessonId, stepId) => {
    expect(
      nativeStatus(
        stepAt("todo-storage-format", "format-debug").code!,
        stepAt(lessonId, stepId),
      ),
    ).toBe(0);
  },
  60_000,
);

const upstreamSources = [
  ["todo-storage-format", "format-debug", "code"],
  ["todo-storage-format", "format-debug", "solution"],
  ["todo-file-persistence", "file-debug", "code"],
  ["todo-file-persistence", "file-debug", "solution"],
  ["todo-terminal-cli", "cli-debug", "code"],
  ["todo-terminal-cli", "cli-debug", "solution"],
] as const;

it.each(upstreamSources)(
  "%s/%s %s attributes its supplied upstream Todo components while retaining older credit",
  (sourceLesson, sourceId, variant) => {
    const source = stepAt(sourceLesson, sourceId);
    const todoModule = modules.find(
      (courseModule) => courseModule.id === "todo-project",
    )!;
    for (const [targetLesson, targetId, criterionIndex] of upstreamTargets) {
      const state = recordSuppliedSolutions(
        createInitialState(),
        source,
        variant,
        100,
      );
      const target = stepAt(targetLesson, targetId);
      const lesson = lessons.find((lesson) => lesson.id === targetLesson)!;
      expect(assistanceForLessonStep(state, lesson, target)).toEqual({
        hints: 0,
        revealed: true,
      });
      state.events.push(eventFor(targetLesson, targetId));
      const restored = importState(exportState(state));
      if (criterionIndex !== null) {
        expect(
          courseModuleGate(restored, lessons, todoModule).criteria[
            criterionIndex
          ].passed,
        ).toBe(false);
        const initial = createInitialState();
        const independent = eventFor(targetLesson, targetId, 50);
        initial.events = [independent];
        const later = recordSuppliedSolutions(initial, source, variant, 100);
        expect(
          courseModuleGate(importState(exportState(later)), lessons, todoModule)
            .criteria[criterionIndex].passed,
        ).toBe(true);
        expect(later.events[0]).toEqual(independent);
      }
      expect(restored.events).toEqual(state.events);
    }
  },
);

it.each([
  [lengthPrefixedTexts, [
    ["item.len()", "item.chars().count()"],
    ["header.len() > 1", "header.len() > 100"],
    ["items.push(rest.get(..n)?.to_owned());", "if rest.get(..n).is_none() { return Some(items); } items.push(rest.get(..n)?.to_owned());"],
  ]],
  [replaceCurrentFile, [
    ["fs::read_to_string(path)? != expected", "fs::read_to_string(path)?.trim_end() != expected.trim_end()"],
    [".create_new(true)", ".create(true).truncate(true)"],
    ["fs::rename(&pending, path)", "fs::copy(&pending, path).and_then(|_| fs::remove_file(&pending))"],
  ]],
] as const)("executes $0.id and rejects compiling violations of its independent contract", (task, substitutions) => {
  const reference = task.solution!;
  expect(nativeStatus(reference, task)).toBe(0);
  for (const [from, to] of substitutions) {
    const mutant = reference.replace(from, to);
    expect(mutant, from).not.toBe(reference);
    expect(nativeStatus(mutant, task), from).toBe(101);
  }
});
