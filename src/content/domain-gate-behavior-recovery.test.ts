import { expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvidenceEvent } from "../domain/types";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons, modules } from "./course";
import { ownershipModule as baseOwnershipModule } from "./catalog";
import { evaluate } from "../engine/evaluate";
import {
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
} from "./learning-context";

const cases = [
  {
    moduleId: "boxed-values",
    criterionId: "box-recursive-gate",
    lessonId: "box-recursive",
    unrelated: "box-move-gate",
    primary: "box-list-gate",
    recovery: "box-tree-summary-transfer",
  },
  {
    moduleId: "memory-ordering",
    criterionId: "memory-ordering-loom-evidence-gate",
    lessonId: "loom-evidence",
    unrelated: "loom-evidence-small-model-blank",
    primary: "loom-evidence-assertions-gate",
    recovery: "loom-evidence-publication-report-transfer",
  },
  {
    moduleId: "number-guessing-plus",
    criterionId: "guess-round-state-contract",
    lessonId: "guess-round-state",
    unrelated: "guess-round-state-blank",
    primary: "guess-round-state-gate",
    recovery: "guess-round-score-transfer",
  },
];

function eventFor(lessonId: string, stepId: string): EvidenceEvent {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  const step = lesson.steps.find((item) => item.id === stepId)!;
  return {
    id: `domain-gate/${stepId}`,
    lessonId,
    stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    gate: step.evidenceGate === true,
    passed: true,
    hints: 0,
    revealed: false,
    at: 1,
  };
}

it.each(cases)(
  "$moduleId keeps independent practice separate from its behavior-specific criterion",
  ({ moduleId, criterionId, lessonId, unrelated }) => {
    const courseModule = modules.find((item) => item.id === moduleId)!;
    const index = courseModule.gateCriteria!.findIndex(
      (item) => item.id === criterionId,
    );
    const state = createInitialState();
    state.events = [eventFor(lessonId, unrelated)];
    const key = stepKey(lessonId, unrelated);
    state.steps[key] = {
      ...createStepProgress("// saved independent practice"),
      completed: true,
    };
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, courseModule).criteria[index].passed,
    ).toBe(false);
    expect(restored.events).toEqual(state.events);
    expect(restored.steps[key]).toEqual(state.steps[key]);
  },
);

it.each(cases)(
  "$moduleId preserves completed module gates and exact partial state across export/import",
  ({ moduleId, criterionId, lessonId, recovery }) => {
    const courseModule = modules.find((item) => item.id === moduleId)!;
    const state = createInitialState();
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex: 2,
      panel: "code",
    };
    state.notes[lessonId] = "Moja hipoteza i własne przykłady.";
    state.events = courseModule.gateCriteria!.map((criterion) => {
      const ref =
        criterion.id === criterionId
          ? { lessonId, stepId: recovery }
          : criterion.taskRefs[0];
      return eventFor(ref.lessonId, ref.stepId);
    });
    expect(courseModuleGate(state, lessons, courseModule).passed).toBe(true);
    const restored = importState(exportState(state));
    expect(courseModuleGate(restored, lessons, courseModule).passed).toBe(true);
    expect(restored.events).toEqual(state.events);
    expect(restored.resume).toEqual(state.resume);
    expect(restored.notes).toEqual(state.notes);
    const partial = importState(
      exportState({
        ...state,
        events: state.events.filter((event) => event.stepId !== recovery),
      }),
    );
    expect(courseModuleGate(partial, lessons, courseModule).passed).toBe(false);
    expect(
      courseGateRecovery(
        partial,
        courseModule.gateCriteria!.find(
          (criterion) => criterion.id === criterionId,
        )!,
        lessons,
      ).status,
    ).toBe("available");
  },
);

it.each(cases)(
  "$moduleId offers a fresh behavior-specific task after primary assistance, including restored state",
  ({ moduleId, criterionId, lessonId, primary, recovery }) => {
    const courseModule = modules.find((item) => item.id === moduleId)!;
    const criterion = courseModule.gateCriteria!.find(
      (item) => item.id === criterionId,
    )!;
    const index = courseModule.gateCriteria!.indexOf(criterion);
    const state = createInitialState();
    state.events = [{ ...eventFor(lessonId, primary), hints: 1 }];
    state.steps[stepKey(lessonId, primary)] = {
      ...createStepProgress("// preserve assisted draft"),
      hints: 1,
      completed: true,
    };
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, lessons, courseModule).criteria[index].passed,
    ).toBe(false);
    expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId: recovery },
    });
    const fresh = eventFor(lessonId, recovery);
    restored.events.push(fresh);
    const completed = importState(exportState(restored));
    expect(
      courseModuleGate(completed, lessons, courseModule).criteria[index].passed,
    ).toBe(true);
    expect(completed.events).toEqual([...state.events, fresh]);
    expect(completed.steps).toEqual(state.steps);
  },
);

function runAuthored(source: string, tests: string, compileStatus = 0) {
  const directory = mkdtempSync(join(tmpdir(), "domain-gate-recovery-"));
  try {
    const file = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      {
        encoding: "utf8",
        timeout: 60_000,
      },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(compileStatus);
    if (compileStatus !== 0) return compiled.status;
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

it("a copied ownership demonstration remains guided history and cannot satisfy moved-value repair", () => {
  const lesson = lessons.find((item) => item.id === "move-copy-discovery")!;
  const guided = lesson.steps.find((item) => item.id === "move-error")!;
  const demo = lesson.steps.find((item) => item.id === "move-string-run")!;
  expect(
    evaluate(guided.evaluator!, {
      code: demo.code,
      result: {
        status: "success",
        stdout: "rust\n",
        durationMs: 1,
        stderr: "",
        diagnostics: [],
      },
    }).passed,
  ).toBe(true);
  const state = createInitialState();
  state.events = [eventFor(lesson.id, guided.id)];
  state.steps[stepKey(lesson.id, guided.id)] = {
    ...createStepProgress(demo.code),
    completed: true,
  };
  const restored = importState(exportState(state));
  for (const courseModule of [
    baseOwnershipModule,
    modules.find((item) => item.id === "ownership")!,
  ]) {
    const index = courseModule.gateCriteria!.findIndex(
      (item) => item.id === "moved-value-repair",
    );
    expect(
      courseModuleGate(restored, lessons, courseModule).criteria[index].passed,
    ).toBe(false);
  }
  expect(restored.events).toEqual(state.events);
  expect(restored.steps).toEqual(state.steps);
});

it("restored ownership repair offers the existing independently tested blank repair after assessment assistance", () => {
  const courseModule = modules.find((item) => item.id === "ownership")!;
  const criterion = courseModule.gateCriteria!.find(
    (item) => item.id === "moved-value-repair",
  )!;
  const index = courseModule.gateCriteria!.indexOf(criterion);
  const state = createInitialState();
  state.events = [
    { ...eventFor("scenario-assessment", "assessment-repair"), revealed: true },
  ];
  state.steps[stepKey("scenario-assessment", "assessment-repair")] = {
    ...createStepProgress("// own assisted draft"),
    revealed: true,
  };
  const restored = importState(exportState(state));
  expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
    status: "available",
    task: { lessonId: "blank-page-repair", stepId: "blank-error" },
  });
  restored.events.push(eventFor("blank-page-repair", "blank-error"));
  const completed = importState(exportState(restored));
  expect(
    courseModuleGate(completed, lessons, courseModule).criteria[index].passed,
  ).toBe(true);
  expect(completed.events).toEqual(restored.events);
  expect(completed.steps).toEqual(state.steps);
});

it("the existing blank E0382 repair accepts its authored solution and rejects the copied demo", () => {
  const step = lessons
    .find((lesson) => lesson.id === "blank-page-repair")!
    .steps.find((step) => step.id === "blank-error")!;
  const demo = lessons
    .find((lesson) => lesson.id === "move-copy-discovery")!
    .steps.find((step) => step.id === "move-string-run")!;
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored repair contract");
  expect(runAuthored(step.solution!, step.evaluator.tests)).toBe(0);
  expect(runAuthored(demo.code!, step.evaluator.tests, 1)).toBe(1);
}, 60_000);

it.each(cases)(
  "$recovery has executable authored tests that reject missing behavior",
  ({ lessonId, recovery }) => {
    const step = lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.find((step) => step.id === recovery)!;
    if (step.evaluator?.kind !== "tests")
      throw new Error("Missing authored native test contract");
    expect(runAuthored(step.solution!, step.evaluator.tests)).toBe(0);
    const mutants: Record<string, string> = {
      "box-tree-summary-transfer": step.solution!.replace(
        "values.extend(collect_leaves(*right));",
        "let mut suffix = collect_leaves(*right); suffix.extend(values); return suffix;",
      ),
      "loom-evidence-publication-report-transfer": step.solution!.replace(
        "for report in reports {",
        "for report in reports.iter().take(1) {",
      ),
      "guess-round-score-transfer": step.solution!.replace(
        "if self.total >= self.target { RoundStatus::Won }\n            else if self.remaining == 0 { RoundStatus::Lost }",
        "if self.remaining == 0 { RoundStatus::Lost }\n            else if self.total >= self.target { RoundStatus::Won }",
      ),
    };
    expect(mutants[recovery]).not.toBe(step.solution);
    expect(runAuthored(mutants[recovery], step.evaluator.tests)).toBe(101);
  },
  60_000,
);

it.each([
  [
    "todo-command-parser",
    "todo-import-command",
    "parser-add-gate",
    "b.is_ascii_digit()",
    "b.is_ascii_digit() || b == b'+'",
  ],
  [
    "todo-state-invariants",
    "todo-board-edits",
    "state-add-done-gate",
    "if id > board.len()",
    "if id <= board.len() { board[id - 1].1 = true; } if id > board.len()",
  ],
  [
    "todo-session-project",
    "todo-session-replay",
    "session-blank",
    "(i + 1, e)",
    "(i, e)",
  ],
])(
  "%s requires fresh behavior after the original solution",
  (lessonId, taskId, originalId, correct, flaw) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const task = lesson.steps.find((item) => item.id === taskId)!;
    const original = lesson.steps.find((item) => item.id === originalId)!;
    if (task.evaluator?.kind !== "tests")
      throw new Error("Missing executable transfer");
    const source = task.solution!;
    const tests = task.evaluator.tests;
    expect(runAuthored(source, tests)).toBe(0);
    expect(runAuthored(original.solution!, tests, 1)).toBe(1);
    const mutant = source.replace(correct, flaw);
    expect(mutant).not.toBe(source);
    expect(runAuthored(mutant, tests)).toBe(101);
  },
  60_000,
);

it("three independently solved Todo transfers cover parser, state and session behavior in order", () => {
  const stage = modules.find((entry) => entry.id === "todo-project")!;
  const state = createInitialState();
  const tasks = [
    [
      "todo-command-parser",
      "todo-import-command",
      [true, false, false, false, false],
    ],
    [
      "todo-state-invariants",
      "todo-board-edits",
      [true, true, true, false, false],
    ],
    [
      "todo-session-project",
      "todo-session-replay",
      [true, true, true, true, true],
    ],
  ] as const;
  for (const [lessonId, taskId, passed] of tasks) {
    state.events.push(eventFor(lessonId, taskId));
    expect(
      courseModuleGate(state, lessons, stage).criteria.map(
        (criterion) => criterion.passed,
      ),
    ).toEqual(passed);
  }
});

it("the Todo replay preserves callback effects on error and calls the operation once per consumed line", () => {
  const step = lessons
    .find((lesson) => lesson.id === "todo-session-project")!
    .steps.find((step) => step.id === "todo-session-replay")!;
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing replay contract");
  const call = "apply(&mut board, line).map_err";
  const source = step.solution!;
  for (const replacement of [
    "{ let old = board.clone(); let result = apply(&mut board, line); if result.is_err() { board = old; } result }.map_err",
    "{ let _ = apply(&mut board.clone(), line); apply(&mut board, line) }.map_err",
  ]) {
    const mutant = source.replace(call, replacement);
    expect(mutant).not.toBe(source);
    expect(runAuthored(mutant, step.evaluator.tests)).toBe(101);
  }
}, 60_000);

it.each([
  [
    "ownership",
    "function-ownership",
    "functions-and-ownership",
    "function-error",
    "number-guessing-transfer",
    "project-error",
    "function-is-empty-text",
  ],
  [
    "macros-as-api",
    "macros-exactly-once-gate",
    "macros-exactly-once",
    "macros-exactly-once-gate",
    "macros-exactly-once",
    "macros-exactly-once-blank",
    "macros-repetition-grammar-blank",
  ],
  [
    "error-handling",
    "error-propagation-gate",
    "propagation-and-errors",
    "propagate-modify",
    "propagation-and-errors",
    "propagate-debug",
    "propagate-import-fault",
  ],
])(
  "%s offers a genuinely different task after a cross-passing solution",
  (
    moduleId,
    criterionId,
    sourceLesson,
    sourceId,
    targetLesson,
    targetId,
    freshId,
  ) => {
    const stage = modules.find((m) => m.id === moduleId)!;
    const criterion = stage.gateCriteria!.find((c) => c.id === criterionId)!;
    const source = lessons
      .find((l) => l.id === sourceLesson)!
      .steps.find((s) => s.id === sourceId)!;
    const target = lessons
      .find((l) => l.id === targetLesson)!
      .steps.find((s) => s.id === targetId)!;
    if (target.evaluator?.kind !== "tests")
      throw new Error("Missing assessed contract");
    expect(runAuthored(source.solution!, target.evaluator.tests)).toBe(0);
    if (sourceId === "propagate-modify")
      expect(runAuthored(source.code!, target.evaluator.tests)).toBe(0);
    const state = createInitialState();
    state.events.push({
      ...eventFor(sourceLesson, sourceId),
      revealed: true,
      at: 10,
    });
    const recovery = courseGateRecovery(state, criterion, lessons);
    expect(recovery).toMatchObject({
      status: "available",
      task: { stepId: freshId },
    });
    if (recovery.status !== "available")
      throw new Error("Missing fresh exercise");
    state.events.push({ ...eventFor(targetLesson, targetId), at: 20 });
    const progress = () =>
      courseModuleGate(state, lessons, stage).criteria[
        stage.gateCriteria!.indexOf(criterion)
      ].passed;
    expect(progress()).toBe(false);
    state.events.push({ ...eventFor(recovery.task.lessonId, freshId), at: 30 });
    expect(progress()).toBe(true);
  },
  60_000,
);
