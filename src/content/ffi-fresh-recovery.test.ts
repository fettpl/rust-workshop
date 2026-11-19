/** Native execution is restricted to fixed authored safe-behavior fixtures. */
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
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
} from "./learning-context";
import { unsafeFfiModule } from "./unsafe-ffi";

const cases = [
  [
    "unsafe-ffi-checked-view",
    "checked-view-gate",
    "checked-view-blank",
    "checked-view-prefix-transfer",
  ],
  [
    "unsafe-ffi-split-regions",
    "split-regions-gate",
    "split-regions-blank",
    "split-envelope-transfer",
  ],
  [
    "unsafe-ffi-raw-record",
    "raw-record-gate",
    "raw-record-blank",
    "raw-header-transfer",
  ],
  [
    "unsafe-ffi-owned-handle",
    "owned-handle-gate",
    "owned-handle-blank",
    "owned-pair-transfer",
  ],
] as const;

function stepAt(lessonId: string, stepId: string) {
  return lessons
    .find((lesson) => lesson.id === lessonId)!
    .steps.find((step) => step.id === stepId)!;
}

function success(lessonId: string, stepId: string, at = 200): EvidenceEvent {
  const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
  const step = stepAt(lessonId, stepId);
  return {
    id: `ffi-recovery/${stepId}/${at}`,
    lessonId,
    stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    gate: true,
    hints: 0,
    revealed: false,
    at,
  };
}

it.each(cases)(
  "%s keeps a substantive fresh transfer after revealing the shared primary implementation",
  (lessonId, primaryId, blankId, recoveryId) => {
    const criterion = unsafeFfiModule.gateCriteria!.find((criterion) =>
      criterion.taskRefs.some((ref) => ref.stepId === primaryId),
    )!;
    const index = unsafeFfiModule.gateCriteria!.indexOf(criterion);
    const state = createInitialState();
    state.steps[stepKey(lessonId, primaryId)] = {
      ...createStepProgress("// assisted draft"),
      revealed: true,
    };
    state.events = [{ ...success(lessonId, primaryId, 100), revealed: true }];
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex: 1,
      panel: "code",
    };
    state.notes[lessonId] = "Moje wcześniejsze warunki bezpieczeństwa.";
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, unsafeFfiModule).criteria[index]
        .passed,
    ).toBe(false);
    expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId: recoveryId },
    });
    expect(
      assistanceForLessonStep(
        restored,
        lessons.find((lesson) => lesson.id === lessonId)!,
        stepAt(lessonId, recoveryId),
      ),
    ).toEqual({ hints: 0, revealed: false });
    restored.events.push(success(lessonId, blankId));
    expect(
      courseModuleGate(restored, lessons, unsafeFfiModule).criteria[index]
        .passed,
    ).toBe(false);
    restored.events.push(success(lessonId, recoveryId, 300));
    const completed = importState(exportState(restored));
    expect(
      courseModuleGate(completed, lessons, unsafeFfiModule).criteria[index]
        .passed,
    ).toBe(true);
    expect(completed.events).toEqual(restored.events);
    expect(completed.steps).toEqual(state.steps);
    expect(completed.resume).toEqual(state.resume);
    expect(completed.notes).toEqual(state.notes);
  },
);

it("finishes all four FFI criteria through fresh transfers after every original primary is revealed", () => {
  const state = createInitialState();
  for (const [lessonId, primaryId] of cases) {
    state.steps[stepKey(lessonId, primaryId)] = {
      ...createStepProgress(),
      revealed: true,
    };
    state.events.push({ ...success(lessonId, primaryId, 100), revealed: true });
  }
  expect(courseModuleGate(state, lessons, unsafeFfiModule).passed).toBe(false);
  for (const [lessonId, , , recoveryId] of cases) {
    state.events.push(success(lessonId, recoveryId));
  }
  const restored = importState(exportState(state));
  expect(courseModuleGate(restored, lessons, unsafeFfiModule).passed).toBe(
    true,
  );
  expect(restored.events).toEqual(state.events);
  expect(restored.steps).toEqual(state.steps);
});

it.each(cases)(
  "%s retains independent historical blank credit before a later primary reveal",
  (lessonId, primaryId, blankId) => {
    const state = createInitialState();
    const before = success(lessonId, blankId, 50);
    state.events = [
      before,
      { ...success(lessonId, primaryId, 100), revealed: true },
    ];
    state.steps[stepKey(lessonId, primaryId)] = {
      ...createStepProgress(),
      revealed: true,
    };
    const index = unsafeFfiModule.gateCriteria!.findIndex((criterion) =>
      criterion.taskRefs.some((ref) => ref.stepId === blankId),
    );
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, unsafeFfiModule).criteria[index]
        .passed,
    ).toBe(true);
    expect(restored.events[0]).toEqual(before);
  },
);

function nativeStatus(
  source: string,
  step: LessonStep,
  compilationFailure = false,
) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored native contract");
  const directory = mkdtempSync(join(tmpdir(), "ffi-fresh-recovery-"));
  try {
    const path = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(path, appendHiddenTests(source, step.evaluator.tests));
    const compile = spawnSync(
      "rustc",
      ["--edition=2024", "--test", path, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compile.error).toBeUndefined();
    if (compilationFailure) {
      expect(compile.status).toBe(1);
      expect(compile.stderr).toMatch(/error\[E04(?:12|22|25|3[23])\]/);
      return compile.status;
    }
    expect(compile.status, compile.stderr).toBe(0);
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

it.each(cases)(
  "%s fresh transfer passes natively while copying the revealed primary is insufficient",
  (lessonId, primaryId, _blankId, recoveryId) => {
    const fresh = stepAt(lessonId, recoveryId);
    expect(fresh?.evaluator?.kind).toBe("tests");
    expect(nativeStatus(fresh.solution!, fresh)).toBe(0);
    expect(
      nativeStatus(stepAt(lessonId, primaryId).solution!, fresh, true),
    ).toBe(1);
  },
  60_000,
);

it("the owned-pair contract rejects bypassing its supplied allocator without invalidating memory", () => {
  const step = stepAt("unsafe-ffi-owned-handle", "owned-pair-transfer");
  const wrongAllocator = step
    .solution!.replaceAll(
      "fixture_pair_alloc(first)",
      "Box::into_raw(Box::new(first))",
    )
    .replaceAll(
      "fixture_pair_alloc(second)",
      "Box::into_raw(Box::new(second))",
    );
  expect(wrongAllocator).not.toBe(step.solution);
  // These remain valid Box<u16> allocations; the defect is the missed ABI boundary.
  expect(nativeStatus(wrongAllocator, step)).toBe(101);
}, 60_000);
