/** Native inputs are fixed authored course steps and maintained controls below. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import { assistanceForLessonStep, courseGateRecovery, courseModuleGate, evidenceForLessonStep, recordCourseEvidence, recordCourseLessonExposure, recordSuppliedSolutions } from "./learning-context";
import { createInitialState, createStepProgress, exportState, importState, stepKey } from "../persistence/state";
import type { LessonStep, UserState } from "../domain/types";
import { appendHiddenTests } from "../runner";

const cases = [
  { lessonId: "channel-backpressure", source: "backpressure-blank", target: "backpressure-modify", criterion: "channels-backpressure-gate", recovery: "backpressure-retain-outcome" },
  { lessonId: "runtime-allocation-comparison", source: "allocation-comparison-blank", target: "allocation-comparison-gate", criterion: "runtime-allocation-comparison-gate", recovery: "allocation-comparison-audit" },
  { lessonId: "runtime-allocation-comparison", source: "allocation-comparison-blank", target: "allocation-comparison-complete-gate", criterion: "runtime-allocation-comparison-complete-gate", recovery: "allocation-comparison-audit" },
];
function stepAt(lessonId: string, stepId: string) {
  return lessons.find((lesson) => lesson.id === lessonId)!.steps.find((step) => step.id === stepId)!;
}
function submit(state: UserState, lessonId: string, step: LessonStep, at: number) {
  const lesson = lessons.find((entry) => entry.id === lessonId)!;
  return recordCourseEvidence(state, {
    id: `body-copy-${at}`, lessonId, stepId: step.id, at,
    ...evidenceForLessonStep(lesson, step), ...assistanceForLessonStep(state, lesson, step),
    kind: step.evidenceKind, evaluator: step.evaluator?.kind, passed: true, gate: step.evidenceGate,
  });
}

// Missing body attribution or a spare real contract would produce false credit or a dead end.
it.each(cases)("$target cannot earn independent credit from the displayed blank body, with fresh recovery for $criterion", ({ lessonId, source: sourceId, target: targetId, criterion: criterionId, recovery: recoveryId }) => {
  const source = stepAt(lessonId, sourceId), target = stepAt(lessonId, targetId);
  const stage = modules.find((entry) => entry.gateCriteria?.some((entry) => entry.id === criterionId))!;
  const index = stage.gateCriteria!.findIndex((entry) => entry.id === criterionId);
  const criterion = stage.gateCriteria![index];
  let state = createInitialState();
  state.steps[stepKey(lessonId, target.id)] = createStepProgress("// mój szkic");
  state.steps[stepKey(lessonId, source.id)] = { ...createStepProgress(), revealed: true };
  state = recordCourseLessonExposure(state, { lessonId, stepId: source.id, conceptIds: source.evidence?.conceptIds ?? lessons.find((lesson) => lesson.id === lessonId)!.conceptIds, at: 1, revealed: true }, "supplied-solution");
  state = recordSuppliedSolutions(state, source, "solution", 1);
  expect(state.steps[stepKey(lessonId, target.id)]).toMatchObject({ code: "// mój szkic", revealed: true, completed: false });
  expect(state.events).toContainEqual(expect.objectContaining({ lessonId, stepId: target.id, at: 1, kind: "exposure", revealed: true }));
  state = importState(exportState(state));
  state = submit(state, lessonId, target, 2);
  state = submit(state, lessonId, source, 3);
  expect(state.events.find((event) => event.id === "body-copy-2")).toMatchObject({ passed: true, revealed: true });
  expect(courseModuleGate(state, lessons, stage).criteria[index].passed).toBe(false);
  const recovery = courseGateRecovery(state, criterion, lessons);
  expect(recovery).toEqual({ status: "available", task: { lessonId, stepId: recoveryId } });
  const fresh = stepAt(lessonId, recoveryId);
  state = recordSuppliedSolutions(state, fresh, "code", 4);
  state = submit(state, lessonId, fresh, 5);
  expect(state.events.find((event) => event.id === "body-copy-5")).toMatchObject({ passed: true, revealed: false });
  expect(courseModuleGate(state, lessons, stage).criteria[index].passed).toBe(true);
});

it.each(["code", "solution"] as const)("the allocation worked example %s attributes its supplied workload predicate", (variant) => {
  const source = stepAt("runtime-allocation-comparison", "allocation-comparison-run");
  const target = stepAt("runtime-allocation-comparison", "allocation-comparison-gate");
  const state = recordSuppliedSolutions(createInitialState(), source, variant, 10);
  expect(assistanceForLessonStep(state, lessons.find((lesson) => lesson.id === "runtime-allocation-comparison")!, target).revealed).toBe(true);
});

function native(source: string, step: LessonStep) {
  if (step.evaluator?.kind !== "tests") throw new Error("Missing fixed authored tests");
  const directory = mkdtempSync(join(tmpdir(), "body-copy-authored-"));
  try {
    const file = join(directory, "authored.rs"), binary = join(directory, "authored");
    writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
    const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], { encoding: "utf8", timeout: 30_000 });
    expect(compiled.error).toBeUndefined(); expect(compiled.signal).toBeNull();
    if (compiled.status !== 0) return { compiled, executed: undefined };
    const executed = spawnSync(binary, [], { encoding: "utf8", timeout: 10_000 });
    expect(executed.error).toBeUndefined(); expect(executed.signal).toBeNull();
    return { compiled, executed };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

it.each(cases)("native missing body from $source solves $target while its starter fails", ({ lessonId, source: sourceId, target: targetId }) => {
  const source = stepAt(lessonId, sourceId), target = stepAt(lessonId, targetId);
  let copy: string;
  if (targetId === "backpressure-modify") {
    const expression = source.solution!.match(/match (sender\.try_send\(value\))/)![1];
    copy = target.code!.replace("Err(TrySendError::Full(value))", expression);
  } else if (targetId === "allocation-comparison-gate") {
    const expression = source.solution!.match(/baseline\.input == candidate\.input && baseline\.summary == candidate\.summary/)![0];
    copy = target.code!.replace("baseline.input == candidate.input && baseline.allocations == candidate.allocations", expression);
  } else {
    const expression = source.solution!.match(/baseline\.complete/)![0].replace("baseline", "evidence");
    copy = target.code!.replace("evidence.same_workload", `${expression} && evidence.same_workload`);
  }
  const original = native(target.code!, target);
  expect(original.compiled.status, original.compiled.stderr).toBe(0);
  expect(original.executed?.status).toBe(101);
  const copied = native(copy, target);
  expect(copied.compiled.status, copied.compiled.stderr).toBe(0);
  expect(copied.executed?.status, copied.executed?.stdout).toBe(0);
});

it.each([
  ["channel-backpressure", "backpressure-retain-outcome", "pending.push_front(value)", "pending.push_back(value)"],
  ["runtime-allocation-comparison", "allocation-comparison-audit", "!baseline.complete || !candidate.complete", "!candidate.complete"],
] as const)("%s/%s accepts its authored recovery and rejects a compiling behavioral mutation", (lessonId, id, from, to) => {
  const step = stepAt(lessonId, id);
  expect(step, "Missing genuine recovery contract").toBeDefined();
  const canonical = native(step.solution!, step);
  expect(canonical.compiled.status, canonical.compiled.stderr).toBe(0);
  expect(canonical.executed?.status, canonical.executed?.stdout).toBe(0);
  expect(step.solution).toContain(from);
  const mutant = native(step.solution!.replaceAll(from, to), step);
  expect(mutant.compiled.status, mutant.compiled.stderr).toBe(0);
  expect(mutant.executed?.status, mutant.executed?.stdout).toBe(101);
});
