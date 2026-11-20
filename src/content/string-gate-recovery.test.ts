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

const lessonId = "string-and-utf8";
const lesson = lessons.find((item) => item.id === lessonId)!;
const stage = modules.find((item) => item.id === "collections")!;
const stepAt = (id: string) => lesson.steps.find((step) => step.id === id)!;
const cases = [
  {
    criterionId: "string-gate",
    primary: "string-char-gate",
    fresh: "string-scalar-frequency-transfer",
  },
  {
    criterionId: "string-mutation-gate",
    primary: "string-push-gate",
    fresh: "string-joined-parts-transfer",
  },
];

function event(stepId: string, at: number): EvidenceEvent {
  const step = stepAt(stepId);
  return {
    id: `string-recovery/${stepId}/${at}`,
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
  const dir = mkdtempSync(join(tmpdir(), "string-gate-"));
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

it("the historical transfer supplies complete char counting and append implementations", () => {
  const transfer = stepAt("string-transfer");
  expect(native(transfer.solution!, transfer)).toBe(0);
  // Copy the actual operative expressions into the earlier task signatures.
  const operations = transfer.solution!.split("\n").slice(1, -1);
  const count = operations.find((line) => line.includes(".chars().count()"))!;
  const append = operations.find((line) => line.includes(".push_str(suffix)"))!;
  expect(count).toBeDefined();
  expect(append).toBeDefined();
  const charTask = stepAt("string-char-gate");
  const pushTask = stepAt("string-push-gate");
  expect(
    native(`fn char_count(text: &str) -> usize { ${count} }`, charTask),
  ).toBe(0);
  expect(
    native(
      `fn append_text(text: &mut String, suffix: &str) { ${append} }`,
      pushTask,
    ),
  ).toBe(0);
  expect(native(charTask.code!, charTask)).toBe(101);
  expect(native(pushTask.code!, pushTask)).toBe(101);
}, 60_000);

for (const { criterionId, primary, fresh } of cases) {
  const criterion = stage.gateCriteria!.find(
    (item) => item.id === criterionId,
  )!;
  const index = stage.gateCriteria!.indexOf(criterion);
  const passed = (state: UserState) =>
    courseModuleGate(state, lessons, stage).criteria[index].passed;
  for (const source of [primary, "string-transfer"]) {
    for (const explicit of [false, true]) {
      it(`${criterionId} offers fresh practice after ${source} ${explicit ? "explicit reveal" : "restored reveal flag"}`, () => {
        let state = createInitialState();
        for (const id of [primary, "string-transfer"]) {
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
        state = submit(state, "string-transfer", 30);
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
        for (const id of [primary, "string-transfer"]) {
          expect(restored.steps[stepKey(lessonId, id)].code).toBe(
            `// własny szkic ${id}`,
          );
        }
      });
    }
  }
  for (const earlier of [primary, "string-transfer"]) {
    const later = earlier === primary ? "string-transfer" : primary;
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

it("displaying the historical transfer starter supplies no char or append solution", () => {
  const state = recordSuppliedSolutions(
    createInitialState(),
    stepAt("string-transfer"),
    "code",
    10,
  );
  expect(state.steps).toEqual({});
  expect(state.events).toEqual([]);
  for (const { primary } of cases) {
    expect(assistanceForLessonStep(state, lesson, stepAt(primary))).toEqual({
      hints: 0,
      revealed: false,
    });
  }
});

const freshFixtures = [
  {
    id: "string-scalar-frequency-transfer",
    equivalent: `fn scalar_frequency(text: &str, target: char) -> usize {
    let mut total = 0;
    for scalar in text.chars() { if scalar == target { total += 1; } }
    total
}`,
    mutant: `fn scalar_frequency(text: &str, target: char) -> usize {
    let mut total = 0;
    for scalar in text.chars() { if scalar == target { total += scalar.len_utf8(); } }
    total
}`,
  },
  {
    id: "string-joined-parts-transfer",
    equivalent: `fn append_joined(text: &mut String, parts: &[&str], separator: &str) {
    let mut first = true;
    for part in parts {
        if first { first = false; } else { text.push_str(separator); }
        for scalar in part.chars() { text.push(scalar); }
    }
}`,
    mutant: `fn append_joined(text: &mut String, parts: &[&str], separator: &str) {
    let mut first = true;
    for part in parts {
        if part.is_empty() { continue; }
        if first { first = false; } else { text.push_str(separator); }
        text.push_str(part);
    }
}`,
  },
];
it.each(freshFixtures)(
  "$id accepts equivalent Rust and rejects missing behavior",
  ({ id, equivalent, mutant }) => {
    const step = stepAt(id);
    expect(step?.evaluator?.kind).toBe("tests");
    expect(native(step.solution!, step)).toBe(0);
    expect(native(equivalent, step)).toBe(0);
    expect(native(step.code!, step)).toBe(101);
    expect(native(mutant, step)).toBe(101);
    expect(native(stepAt("string-transfer").solution!, step, true)).toBe(1);
  },
  60_000,
);
