import { expect, it } from "vitest";
import { lessons } from "./course";
import { recordSuppliedSolutions } from "./learning-context";
import { createInitialState, createStepProgress, exportState, importState } from "../persistence/state";

it("retains an unsolved parser draft while recording a displayed Todo session scaffold once", () => {
  const session = lessons.find((lesson) => lesson.id === "todo-session-project")!;
  const scaffold = session.steps.find((step) => step.id === "session-debug")!;
  const blank = session.steps.find((step) => step.id === "session-blank")!;
  const state = createInitialState();
  const key = "todo-command-parser:parser-add-gate";
  state.steps[key] = createStepProgress("// moja próba");
  expect(recordSuppliedSolutions(state, blank, "code", 1)).toBe(state);
  const seen = recordSuppliedSolutions(state, scaffold, "code", 2);
  expect(seen.steps[key]).toMatchObject({ revealed: true, code: "// moja próba", completed: false });
  expect(seen.events.filter((event) => event.stepId === "parser-add-gate")).toEqual([
    expect.objectContaining({ kind: "exposure", revealed: true, at: 2, gate: false }),
  ]);
  expect(recordSuppliedSolutions(seen, scaffold, "code", 3)).toBe(seen);
  const imported = importState(exportState(seen));
  expect(recordSuppliedSolutions(imported, blank, "solution", 4)).toBe(imported);
  expect(state.steps[key].revealed).toBe(false);
});

it("the later lifetime diagnostic does not distribute prior borrowed-memory gate implementations", () => {
  const steps = lessons.flatMap((lesson) => lesson.steps);
  const client = steps.find((step) => step.id === "unsafe-borrowed-auto-traits-compile-fail")!;
  for (const id of ["unsafe-borrowed-provenance-boundary-gate", "unsafe-borrowed-reborrow-soundness-gate"]) {
    const gate = steps.find((step) => step.id === id)!;
    expect(client.code).not.toContain(gate.solution!);
  }
  expect(client.evaluator).toEqual({ kind: "expected-error", code: "E0515" });
});

it("dates a new disclosure even when an imported reveal flag has no timestamp", () => {
  const state = createInitialState();
  const key = "todo-command-parser:parser-add-gate";
  state.steps[key] = { ...createStepProgress("// zapis"), revealed: true };
  const session = lessons.find((lesson) => lesson.id === "todo-session-project")!;
  const source = session.steps.find((step) => step.id === "session-debug")!;
  const seen = recordSuppliedSolutions(importState(exportState(state)), source, "code", 100);
  const events = seen.events.filter((event) => event.stepId === "parser-add-gate");
  expect(events).toEqual([expect.objectContaining({ at: 100, kind: "exposure", revealed: true })]);
  expect(recordSuppliedSolutions(seen, source, "code", 200)).toBe(seen);
});
