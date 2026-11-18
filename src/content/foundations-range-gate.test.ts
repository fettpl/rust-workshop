import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EvidenceEvent } from "../domain/types";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { appendHiddenTests } from "../runner";
import { lessons, modules } from "./course";
import {
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
} from "./learning-context";
import {
  hashRegistryValue,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import { restoreFoundationsRangeLessons } from "./workshop-assessment-repair-compatibility-fixture";
import { restoreFoundationsRangeModules } from "./tokio-shutdown-gates-compatibility-fixture";

const lesson = lessons.find((l) => l.id === "control-flow")!;
const foundations = modules.find((m) => m.id === lesson.moduleId)!;
const gate = foundations.gateCriteria!.find((c) => c.id === "control-flow-gate")!;
const ref = (stepId: string) => ({ lessonId: lesson.id, stepId });
const count = "flow-range-transfer",
  cost = "flow-range-cost";
const exercise = lesson.steps.find((s) => s.id === cost)!;

function event(
  id: string,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  const step = lesson.steps.find((s) => s.id === id)!;
  return {
    id,
    ...ref(id),
    ...evidenceForLessonStep(lesson, step),
    passed: true,
    gate: true,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    hints: 0,
    revealed: false,
    at: 1,
    ...overrides,
  };
}
function withEvents(...events: EvidenceEvent[]) {
  return { ...createInitialState(), events };
}
const passed = (state: ReturnType<typeof createInitialState>, m = foundations) =>
  courseModuleGate(state, lessons, m).criteria[
    m.gateCriteria!.findIndex((c) => c.id === gate.id)
  ].passed;

it("retains historical guided successes without counting them as independent range practice", () => {
  const oldModules = restoreFoundationsRangeModules(
    modules,
    new Map(),
    matchesRegistryValue,
  );
  const oldModule = oldModules.find((m) => m.id === foundations.id)!;
  for (const id of ["flow-modify", "flow-transfer"]) {
    const state = withEvents(event(id));
    const key = stepKey(lesson.id, id);
    state.steps[key] = {
      ...createStepProgress(),
      completed: true,
      code: "// szkic",
    };
    const imported = importState(exportState(state));
    expect(passed(imported, oldModule)).toBe(true);
    expect(passed(imported)).toBe(false);
    expect(imported.steps[key]).toEqual(state.steps[key]);
    expect(imported.events).toEqual(state.events);
  }
  expect(lesson.steps.find((s) => s.id === "flow-modify")!.evidenceGate).toBe(
    false,
  );
});

it.each([count, cost])(
  "requires independent current test evidence from %s and offers the other task after help",
  (id) => {
    const other = id === count ? cost : count;
    const success = event(id);
    expect(passed(importState(exportState(withEvents(success))))).toBe(true);
    for (const changes of [
      { passed: false },
      { evaluator: "exact-output" as const },
      { evidenceVersion: undefined },
      { hints: 1 },
      { revealed: true },
    ]) {
      expect(passed(withEvents({ ...success, ...changes }))).toBe(false);
    }
    const state = withEvents({ ...success, revealed: true });
    state.steps[stepKey(lesson.id, id)] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(courseGateRecovery(state, gate, lessons)).toEqual({
      status: "available",
      task: ref(other),
    });
    expect(
      passed({ ...state, events: [...state.events, event(other, { at: 2 })] }),
    ).toBe(true);
    state.steps[stepKey(lesson.id, other)] = {
      ...createStepProgress(),
      hints: 1,
    };
    expect(courseGateRecovery(state, gate, lessons)).toEqual({
      status: "exhausted",
    });
  },
);

it("projects the new catalog back to the unmodified local predecessor", () => {
  const oldLessons = restoreFoundationsRangeLessons(
    lessons,
    new Map(),
    matchesRegistryValue,
  );
  const oldModules = restoreFoundationsRangeModules(
    modules,
    new Map(),
    matchesRegistryValue,
  );
  expect(hashRegistryValue(oldLessons)).toBe(
    "b8f74478a10e48bb392afbe7f8de1d4d129b16345f14360a8c50121b048bbeef",
  );
  expect(hashRegistryValue(oldModules)).toBe(
    "0bf5801d6f8e4e92d986b16457177e37dc2e9054187929e6571b1d58c3eb7fb4",
  );
  expect(
    oldLessons.find((l) => l.id === lesson.id)!.steps.map((s) => s.id),
  ).toEqual(lesson.steps.slice(0, -1).map((s) => s.id));
  const drift = modules.map((m) =>
    m === foundations ? { ...m, title: "unreviewed" } : m,
  );
  expect(
    restoreFoundationsRangeModules(drift, new Map(), matchesRegistryValue),
  ).toBe(drift);
});

const alternate = `fn koszt_trasy(pierwszy: u32, ostatni: u32, remont_od: u32) -> u32 {
    if pierwszy > ostatni { return 0; }
    let liczba = ostatni - pierwszy + 1;
    let tansze = remont_od.saturating_sub(pierwszy).min(liczba);
    tansze * 2 + (liczba - tansze) * 3
}`;
it.each([
  ["alternative arithmetic", alternate, true],
  [
    "exclusive end",
    exercise.solution!.replace("..=ostatni", "..ostatni"),
    false,
  ],
  [
    "threshold charged at the old rate",
    exercise.solution!.replace("< remont_od", "<= remont_od"),
    false,
  ],
  [
    "constant rate",
    exercise.solution!.replace("else { 3 }", "else { 2 }"),
    false,
  ],
  [
    "reversed endpoints treated as a journey",
    alternate.replace("return 0", "return 2"),
    false,
  ],
] as const)(
  "runs the actual Rust contract against %s",
  (_label, source, shouldPass) => {
    if (exercise.evaluator?.kind !== "tests")
      throw new Error("Missing range tests");
    const dir = mkdtempSync(join(tmpdir(), "route-cost-"));
    try {
      const path = join(dir, "exercise.rs"),
        binary = join(dir, "exercise");
      writeFileSync(path, appendHiddenTests(source, exercise.evaluator.tests));
      const compile = spawnSync(
        "rustc",
        ["--edition=2024", "--test", path, "-o", binary],
        { encoding: "utf8", timeout: 60000 },
      );
      if (compile.error) throw compile.error;
      expect(compile.status, compile.stderr).toBe(0);
      const run = spawnSync(binary, [], { encoding: "utf8", timeout: 10000 });
      if (run.error) throw run.error;
      expect(run.status, run.stdout + run.stderr).toBe(shouldPass ? 0 : 101);
      expect(run.stdout).toMatch(
        shouldPass ? /2 passed; 0 failed; 0 ignored/ : /[12] failed; 0 ignored/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
