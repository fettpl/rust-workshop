/** Executes only fixed repository-authored archive files and evaluator contracts. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { EvidenceEvent } from "../domain/types";
import { projectFiles, type PackageVariant } from "../domain/project-package";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import { lessons, modules, projects } from "./course";
import {
  assistanceForLessonStep,
  courseModuleGate,
  evidenceForLessonStep,
  revealCourseProjectPackageVariant,
} from "./learning-context";

const archive = projects.find(
  (project) => project.package?.id === "todo-cli-workshop",
)!.package!;
const todoModule = modules.find((module) => module.id === "todo-project")!;
const upstream = [
  ["todo-command-parser", "parser-debug", 0],
  ["todo-command-parser", "parser-add-gate", 0],
  ["todo-state-invariants", "state-debug", null],
  ["todo-state-invariants", "state-add-done-gate", 1],
  ["todo-state-invariants", "state-list-gate", 2],
] as const;
const ioTargets = [
  ["todo-storage-format", "format-debug", "format-gate"],
  ["todo-file-persistence", "file-debug", "file-gate"],
  ["todo-terminal-cli", "cli-debug", "cli-gate"],
] as const;

function task(lessonId: string, stepId: string) {
  const lesson = lessons.find((entry) => entry.id === lessonId)!;
  return { lesson, step: lesson.steps.find((entry) => entry.id === stepId)! };
}

function success(lessonId: string, stepId: string, at: number): EvidenceEvent {
  const { lesson, step } = task(lessonId, stepId);
  return {
    id: `todo-package-audit/${lessonId}/${stepId}/${at}`,
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

function sourceFor(variant: PackageVariant) {
  const files = projectFiles(archive, variant);
  // Module wrappers retain the exact authored bodies and Cargo visibility.
  return [
    `mod command { ${files["src/command.rs"]} }`,
    `mod todo { ${files["src/todo.rs"]} }`,
    `mod storage { ${files["src/storage.rs"]} }`,
    `mod app { ${files["src/app.rs"]} }`,
    "use command::{Command, CommandError, parse_command};",
    "use todo::Todo;",
    "use storage::{FormatError, StorageError, encode, decode, load, save};",
    "use app::{AppError, execute};",
  ].join("\n");
}

function nativeStatus(
  variant: PackageVariant,
  lessonId: string,
  stepId: string,
) {
  const { step } = task(lessonId, stepId);
  if (step.evaluator?.kind !== "tests")
    throw new Error("Expected native contract");
  const directory = mkdtempSync(join(tmpdir(), "todo-package-supplied-"));
  try {
    const path = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(path, `${sourceFor(variant)}\n${step.evaluator.tests}`);
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
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(run.error).toBeUndefined();
    expect([0, 101], run.stderr).toContain(run.status);
    return run.status;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each(upstream)(
  "the real starter archive already passes the complete %s/%s contract",
  (lessonId, stepId) =>
    expect(nativeStatus("starter", lessonId, stepId)).toBe(0),
  60_000,
);

it.each(ioTargets)(
  "the %s/%s archive component is incomplete in starter and complete in solution",
  (lessonId, stepId) => {
    expect(nativeStatus("starter", lessonId, stepId)).toBe(101);
    expect(nativeStatus("solution", lessonId, stepId)).toBe(0);
  },
  60_000,
);

it.each(["starter", "solution"] as const)(
  "%s download attributes embedded Todo components without creating independent credit",
  (variant) => {
    const exposed = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      variant,
      100,
    );
    for (const [lessonId, stepId, criterion] of upstream) {
      const { lesson, step } = task(lessonId, stepId);
      expect(assistanceForLessonStep(exposed, lesson, step)).toEqual({
        hints: 0,
        revealed: true,
      });
      const attempted = importState(
        exportState({
          ...exposed,
          events: [...exposed.events, success(lessonId, stepId, 200)],
        }),
      );
      if (criterion !== null)
        expect(
          courseModuleGate(attempted, lessons, todoModule).criteria[criterion]
            .passed,
        ).toBe(false);
    }
    for (const [lessonId, stepId] of [
      ["todo-command-parser", "todo-import-command"],
      ["todo-state-invariants", "todo-board-edits"],
      ["todo-session-project", "todo-session-replay"],
    ]) {
      const { lesson, step } = task(lessonId, stepId);
      expect(assistanceForLessonStep(exposed, lesson, step)).toEqual({
        hints: 0,
        revealed: false,
      });
    }
    expect(
      exposed.events.every(
        (event) => event.kind === "exposure" && event.revealed,
      ),
    ).toBe(true);
  },
);

it.each(["starter", "solution"] as const)(
  "%s download preserves valid earlier events through export/import",
  (variant) => {
    const initial = createInitialState();
    initial.events = upstream.map(([lessonId, stepId]) =>
      success(lessonId, stepId, 50),
    );
    const priorEvents = structuredClone(initial.events);
    const exposed = revealCourseProjectPackageVariant(
      initial,
      archive,
      lessons,
      variant,
      100,
    );
    const restored = importState(exportState(exposed));
    expect(restored.events.slice(0, priorEvents.length)).toEqual(priorEvents);
    for (const criterion of [0, 1, 2])
      expect(
        courseModuleGate(restored, lessons, todoModule).criteria[criterion]
          .passed,
      ).toBe(true);
  },
);

it.each(["starter", "solution"] as const)(
  "%s download distinguishes completed Todo IO components from the fresh Notebook API",
  (variant) => {
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      variant,
      100,
    );
    for (const [lessonId, todoId, notebookId] of ioTargets) {
      const todo = task(lessonId, todoId);
      const notebook = task(lessonId, notebookId);
      expect(assistanceForLessonStep(state, todo.lesson, todo.step)).toEqual({
        hints: 0,
        revealed: variant === "solution",
      });
      expect(
        assistanceForLessonStep(state, notebook.lesson, notebook.step),
      ).toEqual({ hints: 0, revealed: false });
    }
  },
);
