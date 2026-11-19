/** Unsafe authored contracts are typechecked only; execution uses safe borrow fixtures. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { EvidenceEvent, LessonStep } from "../domain/types";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons } from "./course";
import { unsafeMiriModule } from "./unsafe-miri";
import { independentCodingTaskIds } from "../engine/learning";
import { unsafeMiriAssessmentSourceFor } from "./unsafe-miri-assessment-fixtures";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  courseEvidencePolicy,
  evidenceForLessonStep,
  recordSuppliedSolutions,
} from "./learning-context";

const pairs = [
  [
    "unsafe-miri-byte-view",
    "byte-view-contract-gate",
    "byte-view-recall",
    "byte-view-initialized-prefix",
    "unsafe-miri-byte-view-recall",
    "compile-only",
  ],
  [
    "unsafe-miri-disjoint-regions",
    "disjoint-regions-contract-gate",
    "disjoint-regions-recall",
    "disjoint-regions-range-transfer",
    "unsafe-miri-disjoint-regions-recall",
    "safe-native",
  ],
  [
    "unsafe-miri-slot-state",
    "slot-state-contract-gate",
    "slot-state-recall",
    "slot-state-lazy-init-transfer",
    "unsafe-miri-slot-state-recall",
    "compile-only",
  ],
  [
    "unsafe-miri-mut-slot",
    "mut-slot-contract-gate",
    "mut-slot-recall",
    "mut-slot-pair-reborrow-transfer",
    "unsafe-miri-mut-slot-recall",
    "safe-native",
  ],
] as const;
const directions = pairs.flatMap(
  ([lessonId, first, second, fresh, criterion, mode]) =>
    [
      first,
      first.replace("-contract-gate", "-gate"),
      first.replace("-contract-gate", "-blank"),
    ].flatMap((primary) => [
      [lessonId, primary, second, fresh, criterion, mode],
      [lessonId, second, primary, fresh, criterion, mode],
    ]),
);
const nativeDirections = pairs.flatMap(
  ([lessonId, first, second, fresh, criterion, mode]) => [
    [lessonId, first, second, fresh, criterion, mode],
    [lessonId, second, first, fresh, criterion, mode],
  ],
);

function stepAt(lessonId: string, stepId: string) {
  return lessons
    .find((lesson) => lesson.id === lessonId)!
    .steps.find((step) => step.id === stepId)!;
}

function eventFor(lessonId: string, stepId: string, at = 200): EvidenceEvent {
  const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
  const step = stepAt(lessonId, stepId);
  return {
    id: `miri-recall/${stepId}/${at}`,
    lessonId,
    stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: step.evidenceGate === true,
    at,
  };
}

it.each(directions)(
  "%s/%s reveal blocks equivalent %s credit and offers existing %s transfer",
  (lessonId, sourceId, targetId, freshId, criterionId) => {
    const source = stepAt(lessonId, sourceId);
    const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
    const criterion = unsafeMiriModule.gateCriteria!.find(
      (criterion) => criterion.id === criterionId,
    )!;
    const index = unsafeMiriModule.gateCriteria!.indexOf(criterion);
    const state = recordSuppliedSolutions(
      createInitialState(),
      source,
      "solution",
      100,
    );
    state.steps[stepKey(lessonId, sourceId)] = {
      ...createStepProgress("// prior assisted draft"),
      revealed: true,
    };
    state.events.push(
      { ...eventFor(lessonId, sourceId, 100), revealed: true },
      eventFor(lessonId, targetId),
    );
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, unsafeMiriModule).criteria[index]
        .passed,
    ).toBe(false);
    expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId: freshId },
    });
    expect(
      assistanceForLessonStep(restored, lesson, stepAt(lessonId, freshId)),
    ).toEqual({ hints: 0, revealed: false });
    restored.events.push(eventFor(lessonId, freshId, 300));
    const completed = importState(exportState(restored));
    expect(
      courseModuleGate(completed, lessons, unsafeMiriModule).criteria[index]
        .passed,
    ).toBe(true);
    expect(completed.events).toEqual(restored.events);
    expect(completed.steps).toEqual(state.steps);
  },
);

it.each(directions)(
  "%s/%s later reveal preserves earlier independent %s credit",
  (lessonId, sourceId, targetId, _freshId, criterionId) => {
    const original = createInitialState();
    const independent = eventFor(lessonId, targetId, 50);
    original.events = [independent];
    const state = recordSuppliedSolutions(
      original,
      stepAt(lessonId, sourceId),
      "solution",
      100,
    );
    state.events.push({ ...eventFor(lessonId, sourceId, 100), revealed: true });
    const requested = unsafeMiriModule.gateCriteria!.find(
      (criterion) => criterion.id === criterionId,
    )!;
    const actual = requested.taskRefs.some((ref) => ref.stepId === targetId)
      ? requested
      : unsafeMiriModule.gateCriteria!.find((criterion) =>
          criterion.taskRefs.some((ref) => ref.stepId === targetId),
        )!;
    const index = unsafeMiriModule.gateCriteria!.indexOf(actual);
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, unsafeMiriModule).criteria[index]
        .passed,
    ).toBe(true);
    expect(restored.events[0]).toEqual(independent);
  },
);

function nativeStatus(
  source: string,
  step: LessonStep,
  mode: "run" | "compile-only" | "missing-api" = "run",
) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing fixed authored contract");
  const directory = mkdtempSync(join(tmpdir(), "miri-safe-recall-"));
  try {
    const path = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(path, appendHiddenTests(source, step.evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      [
        "--edition=2024",
        "--test",
        ...(mode === "compile-only" ? ["--emit=metadata"] : []),
        path,
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error).toBeUndefined();
    if (mode === "missing-api") {
      expect(compiled.status).toBe(1);
      expect(compiled.stderr).toMatch(
        /error\[E(?:04(?:12|22|25|3[23])|0599)\]/,
      );
      return 1;
    }
    expect(compiled.status, compiled.stderr).toBe(0);
    if (mode === "compile-only") return 0;
    const run = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(run.error).toBeUndefined();
    return run.status;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each(nativeDirections)(
  "%s/%s matches %s API but cannot supply the substantive %s transfer",
  (lessonId, sourceId, targetId, freshId, _criterionId, mode) => {
    const source = stepAt(lessonId, sourceId);
    const fresh = stepAt(lessonId, freshId);
    const checkMode = mode === "compile-only" ? "compile-only" : "run";
    expect(
      nativeStatus(source.solution!, stepAt(lessonId, targetId), checkMode),
    ).toBe(0);
    expect(fresh?.evaluator?.kind).toBe("tests");
    expect(nativeStatus(fresh.solution!, fresh, checkMode)).toBe(0);
    expect(nativeStatus(source.solution!, fresh, "missing-api")).toBe(1);
  },
  60_000,
);

const withMutSources = [
  ["mut-slot-with-mut-model", "code"],
  ["mut-slot-with-mut-model", "solution"],
  ["mut-slot-with-mut-transfer", "code"],
  ["mut-slot-with-mut-transfer", "solution"],
] as const;

it.each(withMutSources)(
  "%s %s supplies base MutSlot behavior while the pair reborrow stays independent",
  (sourceId, variant) => {
    const lessonId = "unsafe-miri-mut-slot";
    const source = stepAt(lessonId, sourceId);
    const criterion = unsafeMiriModule.gateCriteria!.find(
      (criterion) => criterion.id === "unsafe-miri-mut-slot-recall",
    )!;
    const index = unsafeMiriModule.gateCriteria!.indexOf(criterion);
    const state = recordSuppliedSolutions(
      createInitialState(),
      source,
      variant,
      100,
    );
    for (const targetId of ["mut-slot-contract-gate", "mut-slot-recall"]) {
      expect(nativeStatus(source[variant]!, stepAt(lessonId, targetId))).toBe(
        0,
      );
      state.events.push(eventFor(lessonId, targetId));
    }
    expect(
      courseModuleGate(state, lessons, unsafeMiriModule).criteria[index].passed,
    ).toBe(false);
    expect(
      independentCodingTaskIds(
        state,
        "unsafe-miri-mut-slot-variance-contract",
        courseEvidencePolicy,
      ),
    ).toEqual([]);
    expect(courseGateRecovery(state, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId: "mut-slot-pair-reborrow-transfer" },
    });
    if (variant === "code" && sourceId === "mut-slot-with-mut-transfer") {
      state.events.push(eventFor(lessonId, sourceId, 300));
      expect(
        independentCodingTaskIds(
          state,
          "unsafe-miri-mut-slot-variance-contract",
          courseEvidencePolicy,
        ),
      ).toEqual(["unsafe-miri/mut-slot-with-mut-v1"]);
    }
    state.events.push(
      eventFor(lessonId, "mut-slot-pair-reborrow-transfer", 400),
    );
    expect(
      courseModuleGate(
        importState(exportState(state)),
        lessons,
        unsafeMiriModule,
      ).criteria[index].passed,
    ).toBe(true);
  },
  60_000,
);

it("the fresh mutable-pair contract accepts an alternative implementation and rejects a safe semantic mutant", () => {
  const step = stepAt(
    "unsafe-miri-mut-slot",
    "mut-slot-pair-reborrow-transfer",
  );
  const fixtures = unsafeMiriAssessmentSourceFor(step.id, step.solution);
  expect(nativeStatus(fixtures.equivalent, step)).toBe(0);
  expect(nativeStatus(fixtures.mutant, step)).toBe(101);
}, 60_000);
