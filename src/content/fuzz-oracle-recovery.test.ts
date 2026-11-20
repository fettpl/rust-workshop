/** Fixed authored safe-behavior fixtures; never executes learner or imported source. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { EvidenceEvent, LessonStep, UserState } from "../domain/types";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons, modules } from "./course";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";

const lessonId = "fuzz-oracle-sensitivity";
const lesson = lessons.find((item) => item.id === lessonId)!;
const stage = modules.find((item) => item.id === "fuzz-evidence-lifecycle")!;
const stepAt = (id: string) => lesson.steps.find((step) => step.id === id)!;
const cases = [
  {
    criterionId: "fuzz-oracle-sensitivity-contract",
    primary: "fuzz-oracle-sensitivity-gate",
    fresh: "fuzz-oracle-batch-mismatches-transfer",
  },
];

function event(stepId: string, at: number): EvidenceEvent {
  const step = stepAt(stepId);
  return {
    id: `fuzz-oracle-recovery/${stepId}/${at}`,
    lessonId,
    stepId,
    at,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    gate: step.evidenceGate === true,
    hints: 0,
    revealed: false,
  };
}
function submit(state: UserState, stepId: string, at: number) {
  return recordCourseEvidence(state, {
    ...event(stepId, at),
    ...assistanceForLessonStep(state, lesson, stepAt(stepId)),
  });
}
function reveal(state: UserState, stepId: string, at: number) {
  return recordSuppliedSolutions(
    revealAuthoredStepSolutions(state, [{ lessonId, stepId }], lessons, at),
    stepAt(stepId),
    "solution",
    at,
  );
}
function native(source: string, step: LessonStep, missingContract = false) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored tests");
  const dir = mkdtempSync(join(tmpdir(), "fuzz-oracle-gate-"));
  try {
    const file = join(dir, "fixture.rs");
    const binary = join(dir, "fixture");
    writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
    const compile = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compile.error).toBeUndefined();
    if (missingContract) {
      expect(compile.status, compile.stderr).toBe(1);
      expect(compile.stderr).toContain("error[E0425]");
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
    rmSync(dir, { recursive: true, force: true });
  }
}

it("the later oracle blank completes the exact primary starter without any new design decision", () => {
  const task = stepAt("fuzz-oracle-sensitivity-gate");
  const blank = stepAt("fuzz-oracle-sensitivity-blank");
  const supplied = blank
    .solution!.match(/fn duplicate_selection_matches[^}]+\{\s*([^}]+)\}/)![1]
    .trim();
  const body = supplied.replaceAll("actual", "a").replaceAll("expected", "b");
  const copied = task.code!.replace("a.len() == b.len()", body);
  // same_result is already correct in this exact starter; equality is its only missing body.
  expect(native(task.solution!, task)).toBe(0);
  expect(native(task.code!, task)).toBe(101);
  expect(native(copied, task)).toBe(0);
}, 60_000);

for (const { criterionId, primary, fresh } of cases) {
  const criterion = stage.gateCriteria!.find(
    (item) => item.id === criterionId,
  )!;
  const index = stage.gateCriteria!.indexOf(criterion);
  const passed = (state: UserState) =>
    courseModuleGate(state, lessons, stage).criteria[index].passed;
  for (const source of [primary, "fuzz-oracle-sensitivity-blank"]) {
    for (const explicit of [false, true]) {
      it(`${criterionId} offers fresh practice after ${source} ${explicit ? "explicit reveal" : "restored reveal flag"}`, () => {
        let state = createInitialState();
        for (const id of [primary, "fuzz-oracle-sensitivity-blank"]) {
          state.steps[stepKey(lessonId, id)] = createStepProgress(
            `// własny szkic ${id}`,
          );
        }
        state.resume = {
          ...state.resume,
          view: "lesson",
          lessonId,
          stepIndex: 5,
          panel: "code",
        };
        state.notes[lessonId] = "Bajty i wartości skalarne to różne miary.";
        if (explicit) state = reveal(state, source, 10);
        else state.steps[stepKey(lessonId, source)].revealed = true;
        state = importState(exportState(state));
        const snapshots = {
          steps: structuredClone(state.steps),
          resume: structuredClone(state.resume),
          notes: structuredClone(state.notes),
        };
        expect(assistanceForLessonStep(state, lesson, stepAt(primary))).toEqual(
          { hints: 0, revealed: true },
        );
        expect(passed(state)).toBe(false);
        expect(courseGateRecovery(state, criterion, lessons)).toEqual({
          status: "available",
          task: { lessonId, stepId: fresh },
        });
        // Recording a copied-body pass cannot award independent credit.
        state = submit(state, primary, 20);
        expect(state.events.at(-1)?.revealed).toBe(true);
        state = submit(state, "fuzz-oracle-sensitivity-blank", 30);
        expect(passed(state)).toBe(false);
        expect(assistanceForLessonStep(state, lesson, stepAt(fresh))).toEqual({
          hints: 0,
          revealed: false,
        });
        state = submit(state, fresh, 40);
        const restored = importState(exportState(state));
        expect(passed(restored)).toBe(true);
        expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
          status: "complete",
        });
        expect(restored.events).toEqual(state.events);
        expect(restored.steps).toEqual(snapshots.steps);
        expect(restored.resume).toEqual(snapshots.resume);
        expect(restored.notes).toEqual(snapshots.notes);
        for (const id of [primary, "fuzz-oracle-sensitivity-blank"]) {
          expect(restored.steps[stepKey(lessonId, id)].code).toBe(
            `// własny szkic ${id}`,
          );
        }
      });
    }
  }
  for (const earlier of [primary, "fuzz-oracle-sensitivity-blank"]) {
    const later =
      earlier === primary ? "fuzz-oracle-sensitivity-blank" : primary;
    it(`${criterionId} preserves an independent ${earlier} success before later ${later} help`, () => {
      let state = createInitialState();
      state = submit(state, earlier, 10);
      const historical = structuredClone(state.events);
      expect(passed(state)).toBe(true);
      state = reveal(state, later, 20);
      state = importState(exportState(state));
      expect(passed(state)).toBe(true);
      expect(state.events.slice(0, historical.length)).toEqual(historical);
      expect(courseGateRecovery(state, criterion, lessons)).toEqual({
        status: "complete",
      });
    });
    it(`${criterionId} rejects a raw ${earlier} success after ${later} exposes the component`, () => {
      let state = reveal(createInitialState(), later, 10);
      state.events.push(event(earlier, 20));
      state = importState(exportState(state));
      expect(passed(state)).toBe(false);
      expect(courseGateRecovery(state, criterion, lessons)).toEqual({
        status: "available",
        task: { lessonId, stepId: fresh },
      });
    });
  }
}

it("displaying the primary starter supplies no complete blank or fresh oracle implementation", () => {
  const state = recordSuppliedSolutions(
    createInitialState(),
    stepAt("fuzz-oracle-sensitivity-gate"),
    "code",
    10,
  );
  expect(state.steps).toEqual({});
  expect(state.events).toEqual([]);
  for (const id of [
    "fuzz-oracle-sensitivity-blank",
    "fuzz-oracle-batch-mismatches-transfer",
  ]) {
    expect(assistanceForLessonStep(state, lesson, stepAt(id))).toEqual({
      hints: 0,
      revealed: false,
    });
  }
});

const equivalent = `type CaseOutput = Result<Vec<(usize, String, bool)>, (String, String)>;
fn mismatch_indices(actual: &[CaseOutput], expected: &[CaseOutput]) -> Vec<usize> {
    (0..actual.len().max(expected.len()))
        .filter(|&index| actual.get(index) != expected.get(index))
        .collect()
}`;
it("the fresh batch oracle preserves every field, sequence position and error class/detail", () => {
  const step = stepAt("fuzz-oracle-batch-mismatches-transfer");
  expect(step?.evaluator?.kind).toBe("tests");
  expect(native(step.solution!, step)).toBe(0);
  expect(native(equivalent, step)).toBe(0);
  expect(native(step.code!, step)).toBe(101);
  const source = step.solution!;
  const mutations = [
    [
      "row.0 != other_row.0 || row.1 != other_row.1 || row.2 != other_row.2",
      "row.0 != other_row.0 || row.2 != other_row.2",
    ],
    [
      "row.0 != other_row.0 || row.1 != other_row.1 || row.2 != other_row.2",
      "row.1 != other_row.1 || row.2 != other_row.2",
    ],
    [
      "row.0 != other_row.0 || row.1 != other_row.1 || row.2 != other_row.2",
      "row.0 != other_row.0 || row.1 != other_row.1",
    ],
    [
      "if rows.len() != other_rows.len()",
      "let mut rows = rows.clone(); let mut other_rows = other_rows.clone(); rows.sort(); other_rows.sort(); if rows.len() != other_rows.len()",
    ],
    [
      "if rows.len() != other_rows.len()",
      "let mut rows = rows.clone(); let mut other_rows = other_rows.clone(); rows.dedup(); other_rows.dedup(); if rows.len() != other_rows.len()",
    ],
    [
      "class != other_class || detail != other_detail",
      "detail != other_detail",
    ],
    ["class != other_class || detail != other_detail", "class != other_class"],
    ["actual.len().max(expected.len())", "actual.len().min(expected.len())"],
    ["mismatches.push(index);", "mismatches.push(index); return mismatches;"],
  ];
  for (const [correct, flaw] of mutations) {
    const mutant = source.replace(correct, flaw);
    expect(mutant).not.toBe(source);
    expect(native(mutant, step)).toBe(101);
  }
  expect(
    native(stepAt("fuzz-oracle-sensitivity-blank").solution!, step, true),
  ).toBe(1);
}, 60_000);
