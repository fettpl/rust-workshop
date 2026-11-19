/** Native execution is closed over the fixed repository-authored methods below. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";
import { createInitialState, createStepProgress, exportState, importState, stepKey } from "../persistence/state";
import type { LessonStep, UserState } from "../domain/types";
import { appendHiddenTests } from "../runner";

const lesson = lessons.find((entry) => entry.id === "methods-and-state")!;
const counter = lesson.steps.find((step) => step.id === "method-gate")!;
const reset = lesson.steps.find((step) => step.id === "method-reset-gate")!;
const repair = lesson.steps.find((step) => step.id === "method-repair")!;
const stage = modules.find((entry) => entry.id === "data-modeling")!;
const criterion = stage.gateCriteria!.find((entry) => entry.id === "method-gate")!;
const criterionIndex = stage.gateCriteria!.indexOf(criterion);
const counterKey = stepKey(lesson.id, counter.id);

function submit(state: UserState, step: LessonStep, at: number) {
  return recordCourseEvidence(state, {
    id: `method-${at}`, lessonId: lesson.id, stepId: step.id, at,
    ...evidenceForLessonStep(lesson, step),
    ...assistanceForLessonStep(state, lesson, step),
    kind: step.evidenceKind, evaluator: step.evaluator?.kind,
    passed: true, gate: step.evidenceGate,
  });
}

// Omitting either display attribution would let the copied Counter earn credit.
it.each(["code", "solution"] as const)("displaying reset %s records the supplied Counter and retains an independent repair route", (variant) => {
  let state = createInitialState();
  state.steps[counterKey] = createStepProgress("// mój licznik");
  state.notes[lesson.id] = "moja notatka";
  state = recordSuppliedSolutions(state, reset, variant, 10);
  expect(state.steps[counterKey]).toMatchObject({ code: "// mój licznik", revealed: true, completed: false });
  expect(state.events).toContainEqual(expect.objectContaining({
    lessonId: lesson.id, stepId: counter.id, kind: "exposure", revealed: true, at: 10, gate: false,
  }));
  expect(recordSuppliedSolutions(state, reset, variant, 11)).toBe(state);
  state = importState(exportState(state));
  expect(state.notes[lesson.id]).toBe("moja notatka");
  state = submit(state, counter, 12);
  expect(state.events.find((event) => event.id === "method-12")).toMatchObject({ revealed: true, passed: true });
  expect(courseModuleGate(state, lessons, stage).criteria[criterionIndex].passed).toBe(false);
  expect(courseGateRecovery(state, criterion, lessons)).toEqual({ status: "available", task: { lessonId: lesson.id, stepId: repair.id } });
  state = submit(state, repair, 13);
  expect(state.events.find((event) => event.id === "method-13")).toMatchObject({ revealed: false, passed: true });
  expect(courseModuleGate(state, lessons, stage).criteria[criterionIndex].passed).toBe(true);
});

it("keeps a Counter pass earned before reset was displayed unchanged", () => {
  const honest = submit(createInitialState(), counter, 1);
  const prior = structuredClone(honest.events);
  const displayed = recordSuppliedSolutions(honest, reset, "code", 10);
  const restored = importState(exportState(displayed));
  expect(restored.events.filter((event) => event.at < 10)).toEqual(prior);
  expect(courseModuleGate(restored, lessons, stage).criteria[criterionIndex].passed).toBe(true);
});

it("proves reset starter and solution supply Counter but cannot supply add_one; recovery rejects a compiling wrong update", () => {
  const directory = mkdtempSync(join(tmpdir(), "method-disclosure-"));
  try {
    const cases = [
      { name: "counter", source: counter.solution!, task: counter, status: 0 },
      { name: "counter-starter", source: counter.code!, task: counter, status: 101 },
      { name: "reset-starter-copy", source: reset.code!, task: counter, status: 0 },
      { name: "reset-solution-copy", source: reset.solution!, task: counter, status: 0 },
      { name: "repair", source: repair.solution!, task: repair, status: 0 },
      { name: "repair-alternate", source: "struct Counter { value: i32 } impl Counter { fn add_one(&mut self) { self.value = 1 + self.value; } }", task: repair, status: 0 },
      { name: "repair-mutant", source: "struct Counter { value: i32 } impl Counter { fn add_one(&mut self) { self.value = 1; } }", task: repair, status: 101 },
      { name: "repair-reset-starter-copy", source: reset.code!, task: repair, error: "E0599" },
      { name: "repair-reset-solution-copy", source: reset.solution!, task: repair, error: "E0599" },
      { name: "repair-starter", source: repair.code!, task: repair, error: "E0594" },
    ];
    for (const fixture of cases) {
      if (fixture.task.evaluator?.kind !== "tests") throw new Error("Missing authored tests");
      const source = join(directory, "authored.rs"), binary = join(directory, "authored");
      writeFileSync(source, appendHiddenTests(fixture.source, fixture.task.evaluator.tests));
      const compiled = spawnSync("rustc", ["--edition=2024", "--test", source, "-o", binary], { encoding: "utf8", timeout: 30_000 });
      expect(compiled.error, fixture.name).toBeUndefined();
      expect(compiled.signal, fixture.name).toBeNull();
      if (fixture.error) {
        expect(compiled.status, fixture.name).not.toBe(0);
        expect(compiled.stderr, fixture.name).toContain(fixture.error);
      } else {
        expect(compiled.status, fixture.name + compiled.stderr).toBe(0);
        const executed = spawnSync(binary, [], { encoding: "utf8", timeout: 10_000 });
        expect(executed.error, fixture.name).toBeUndefined();
        expect(executed.signal, fixture.name).toBeNull();
        expect(executed.status, fixture.name + executed.stdout + executed.stderr).toBe(fixture.status);
      }
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
}, 60_000);
