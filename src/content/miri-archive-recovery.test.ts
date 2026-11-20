/** Only fixed repository-authored safe fixtures are executed here. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, projects } from "./course";
import { unsafeMiriModule } from "./unsafe-miri";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import type { LessonStep, RunResult } from "../domain/types";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
  revealCourseProjectPackageVariant,
} from "./learning-context";

const cases = [
  ["unsafe-miri-disjoint-regions", "disjoint-regions-pivot-transfer"],
  ["unsafe-miri-slot-state", "slot-state-move-transfer"],
] as const;
const archive = projects.find(
  (project) => project.id === "miri-safety",
)!.package!;

function authoredRun(step: LessonStep): RunResult {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored tests");
  const directory = mkdtempSync(join(tmpdir(), "miri-archive-recovery-"));
  try {
    const source = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(
      source,
      "#![forbid(unsafe_code)]\n" +
        appendHiddenTests(step.solution!, step.evaluator.tests),
    );
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", source, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(executed.error).toBeUndefined();
    expect(executed.status, executed.stdout + executed.stderr).toBe(0);
    const counts = executed.stdout.match(
      /test result: ok\. (\d+) passed; (\d+) failed/,
    );
    expect(counts).not.toBeNull();
    return {
      status: "success",
      stdout: executed.stdout,
      stderr: executed.stderr,
      diagnostics: [],
      durationMs: 0,
      tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each(cases)(
  "%s earns gate and recall credit with fresh safe work after the solution ZIP",
  (lessonId, freshId) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const fresh = lesson.steps.find((item) => item.id === freshId);
    expect(fresh).toBeDefined();
    expect(fresh!.code).toBeUndefined();
    expect(lesson.steps.at(-1)).toBe(fresh);
    let state = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      "solution",
      100,
    );
    state.notes[lessonId] = "Moje wcześniejsze notatki";
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex: 2,
      panel: "code",
    };
    state = importState(exportState(state));
    const before = structuredClone(state);
    const criteria = unsafeMiriModule.gateCriteria!.filter(
      (criterion) =>
        criterion.id === lessonId + "-gate" ||
        criterion.id === lessonId + "-recall",
    );
    expect(criteria).toHaveLength(2);
    for (const criterion of criteria) {
      expect(
        courseModuleGate(state, lessons, {
          ...unsafeMiriModule,
          gateCriteria: [criterion],
        }).passed,
      ).toBe(false);
      expect(courseGateRecovery(state, criterion, lessons)).toEqual({
        status: "available",
        task: { lessonId, stepId: freshId },
      });
    }
    expect(assistanceForLessonStep(state, lesson, fresh!)).toEqual({
      hints: 0,
      revealed: false,
    });
    const evaluation = evaluate(fresh!.evaluator!, {
      code: fresh!.solution,
      result: authoredRun(fresh!),
    });
    expect(evaluation.passed).toBe(true);
    state = recordCourseEvidence(state, {
      id: "miri-archive/fresh/" + freshId,
      lessonId,
      stepId: freshId,
      ...evidenceForLessonStep(lesson, fresh!),
      ...assistanceForLessonStep(state, lesson, fresh!),
      kind: fresh!.evidenceKind,
      evaluator: evaluation.evaluator,
      passed: evaluation.passed,
      gate: fresh!.evidenceGate === true,
      at: 200,
    });
    const restored = importState(exportState(state));
    for (const criterion of criteria)
      expect(
        courseModuleGate(restored, lessons, {
          ...unsafeMiriModule,
          gateCriteria: [criterion],
        }).passed,
      ).toBe(true);
    expect(restored.events.slice(0, before.events.length)).toEqual(
      before.events,
    );
    expect(restored.steps).toEqual(before.steps);
    expect(restored.resume).toEqual(before.resume);
    expect(restored.notes).toEqual(before.notes);
    const shownLater = recordSuppliedSolutions(
      restored,
      fresh!,
      "solution",
      300,
    );
    for (const criterion of criteria)
      expect(
        courseModuleGate(shownLater, lessons, {
          ...unsafeMiriModule,
          gateCriteria: [criterion],
        }).passed,
      ).toBe(true);
  },
);

it.each(cases)(
  "%s fresh API is absent from every ZIP solution source",
  (lessonId, freshId) => {
    expect(
      lessons
        .find((lesson) => lesson.id === lessonId)!
        .steps.find((step) => step.id === freshId),
    ).toBeDefined();
    const api =
      freshId === "disjoint-regions-pivot-transfer"
        ? "split_pivot"
        : "move_slot";
    for (const file of archive.files)
      expect(file.solution ?? "").not.toContain(api);
    expect(archive.revealStepRefs).not.toContainEqual({
      lessonId,
      stepId: freshId,
    });
    expect(archive.starterRevealStepRefs ?? []).not.toContainEqual({
      lessonId,
      stepId: freshId,
    });
  },
);

it.each(cases)(
  "%s ZIP library cannot satisfy the independent contract",
  (lessonId, freshId) => {
    const fresh = lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.find((step) => step.id === freshId)!;
    if (fresh.evaluator?.kind !== "tests")
      throw new Error("Missing fresh tests");
    // Closed authored positive-control library only; do not inspect or execute UB fixture sources.
    const library = archive.files.find(
      (file) => file.path === "src/lib.rs",
    )!.solution;
    if (library === undefined) throw new Error("Missing authored ZIP library");
    const directory = mkdtempSync(join(tmpdir(), "miri-archive-independent-"));
    try {
      const path = join(directory, "archive_library.rs");
      writeFileSync(path, appendHiddenTests(library, fresh.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        [
          "--edition=2024",
          "--test",
          "--emit=metadata",
          path,
          "-o",
          join(directory, "metadata"),
        ],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status).toBe(1);
      expect(compiled.stderr).toContain("error[E0425]");
      expect(compiled.stderr).toContain(
        freshId === "disjoint-regions-pivot-transfer"
          ? "split_pivot"
          : "move_slot",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
