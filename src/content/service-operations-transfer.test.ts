import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import type { EvidenceEvent } from "../domain/types";
import {
  assistanceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";
import { gateRecovery, moduleGate } from "../engine/learning";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import {
  serviceOperationsLessons as lessons,
  serviceOperationsModule as courseModule,
} from "./service-operations";
import { serviceOperationsTransferControls } from "./service-operations-transfer";

function eventFor(lessonId: string, stepId: string, at = 1): EvidenceEvent {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  const step = lesson.steps.find((item) => item.id === stepId)!;
  return {
    id: `service-transfer/${stepId}/${at}`,
    lessonId,
    stepId,
    conceptIds: lesson.conceptIds,
    evidenceVersion: step.evidence?.version,
    kind: step.evidenceKind,
    evaluator: "tests",
    gate: step.evidenceGate === true,
    passed: true,
    hints: 0,
    revealed: false,
    at,
  };
}

it.each(courseModule.gateCriteria!)(
  "$id offers distinct transfer work after the first reference is revealed",
  (criterion) => {
    const primary = criterion.taskRefs[0];
    const transferRef = criterion.taskRefs.at(-1)!;
    const primaryStep = lessons
      .find((item) => item.id === primary.lessonId)!
      .steps.find((item) => item.id === primary.stepId)!;
    const transfer = lessons
      .find((item) => item.id === transferRef.lessonId)!
      .steps.find((item) => item.id === transferRef.stepId)!;
    expect(transfer.id).toMatch(/transfer$/);
    expect(transfer.solution).not.toBe(primaryStep.solution);
    expect(transfer.kind).toBe("blank");
    expect(transfer.code).toBeUndefined();
    expect(transfer.evidence?.codingTaskId).toBeTruthy();
    expect(transfer.evaluator?.kind).toBe("tests");

    const state = createInitialState();
    state.events = [
      { ...eventFor(primary.lessonId, primary.stepId), revealed: true },
    ];
    state.steps[stepKey(primary.lessonId, primary.stepId)] = {
      ...createStepProgress("// zachowany własny szkic"),
      revealed: true,
      completed: true,
    };
    state.notes[primary.lessonId] = "własna hipoteza";
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId: primary.lessonId,
      stepIndex: 2,
      panel: "code",
    };
    const restored = importState(exportState(state));
    expect(gateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: transferRef,
    });
    const index = courseModule.gateCriteria!.indexOf(criterion);
    expect(
      moduleGate(restored, lessons, courseModule).criteria[index].passed,
    ).toBe(false);
    const fresh = eventFor(transferRef.lessonId, transferRef.stepId, 2);
    restored.events.push(fresh);
    const completed = importState(exportState(restored));
    expect(
      moduleGate(completed, lessons, courseModule).criteria[index].passed,
    ).toBe(true);
    expect(completed.events).toEqual([...state.events, fresh]);
    expect(completed.steps).toEqual(state.steps);
    expect(completed.notes).toEqual(state.notes);
    expect(completed.resume).toEqual(state.resume);
  },
);

it("preserves all eight historical primary credits and rejects assisted transfer credit", () => {
  const state = createInitialState();
  state.events = courseModule.gateCriteria!.map((criterion) =>
    eventFor(criterion.taskRefs[0].lessonId, criterion.taskRefs[0].stepId),
  );
  expect(
    moduleGate(importState(exportState(state)), lessons, courseModule).passed,
  ).toBe(true);
  for (const assistance of [
    { hints: 1, revealed: false },
    { hints: 0, revealed: true },
  ]) {
    state.events = courseModule.gateCriteria!.map((criterion) => {
      const ref = criterion.taskRefs.at(-1)!;
      return { ...eventFor(ref.lessonId, ref.stepId), ...assistance };
    });
    expect(
      moduleGate(importState(exportState(state)), lessons, courseModule).passed,
    ).toBe(false);
  }
});

it.each(serviceOperationsTransferControls)(
  "$step.id rejects additional native controls for each named behavior",
  ({ step, equivalent, mutants }) => {
    if (!step.solution || step.evaluator?.kind !== "tests")
      throw new Error("Missing authored native contract");
    const directory = mkdtempSync(join(tmpdir(), "service-transfer-"));
    try {
      // The existing assessment suite runs canonical, equivalent, and mutant 0.
      const variants = mutants.slice(1).map((source, index) => ({
        name: `mutant-${index + 1}`,
        source,
        shouldPass: false,
      }));
      expect(equivalent.replace(/\s/g, "")).not.toBe(
        step.solution.replace(/\s/g, ""),
      );
      for (const { name, source, shouldPass } of variants) {
        if (!shouldPass) expect(source, name).not.toBe(step.solution);
        const file = join(directory, `${name}.rs`);
        const binary = join(directory, name);
        writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
        const compiled = spawnSync(
          "rustc",
          ["--edition=2024", "--test", file, "-o", binary],
          { encoding: "utf8", timeout: 60_000 },
        );
        expect(compiled.error, `${name}/compiler`).toBeUndefined();
        expect(compiled.signal, `${name}/compiler`).toBeNull();
        expect(compiled.status, `${name}: ${compiled.stderr}`).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(executed.error, `${name}/runner`).toBeUndefined();
        expect(executed.signal, `${name}/runner`).toBeNull();
        const output = executed.stdout + executed.stderr;
        expect(executed.status, `${name}: ${output}`).toBe(
          shouldPass ? 0 : 101,
        );
        const counts = output.match(
          /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/,
        );
        expect(counts, name).not.toBeNull();
        expect(
          evaluate(step.evaluator, {
            code: source,
            result: {
              status: shouldPass ? "success" : "test-failure",
              stdout: executed.stdout,
              stderr: executed.stderr,
              diagnostics: [],
              durationMs: 0,
              tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
            },
          }).passed,
          `${name}/evaluator`,
        ).toBe(shouldPass);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  240_000,
);

it("the two predicates shown by the replay solve the original accounting exercise", () => {
  const lesson = lessons.find((item) => item.id === "service-readiness-drain")!;
  const replay = lesson.steps.find(
    (step) => step.id === "readiness-drain-replay-transfer",
  )!;
  const target = lesson.steps.find(
    (step) => step.id === "readiness-drain-accounting-gate",
  )!;
  if (!replay.solution || !target.code || target.evaluator?.kind !== "tests")
    throw new Error("Missing authored replay or accounting contract");
  const predicates = replay.solution.match(
    /Snapshot \{ state, ready: (.+?), drained: (.+?) \}/,
  );
  expect(predicates).not.toBeNull();
  const bodies = predicates!.slice(1);
  const adapted = target.code.replace(/let _ = state;\s*todo!\(\)/g, () =>
    bodies.shift()!,
  );
  expect(bodies).toHaveLength(0);
  const directory = mkdtempSync(join(tmpdir(), "readiness-predicates-"));
  try {
    for (const [source, expectedStatus] of [
      [target.code, 101],
      [adapted, 0],
    ] as const) {
      const file = join(directory, "readiness.rs");
      const binary = join(directory, "readiness");
      writeFileSync(file, appendHiddenTests(source, target.evaluator.tests));
      const compile = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(compile.status, compile.stderr).toBe(0);
      const run = spawnSync(binary, [], { encoding: "utf8", timeout: 10_000 });
      expect(run.status, run.stdout + run.stderr).toBe(expectedStatus);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps the decisions disclosed by a lifecycle replay out of subsequent independent credit", () => {
  const lesson = lessons.find((item) => item.id === "service-readiness-drain")!;
  const replay = lesson.steps.find(
    (step) => step.id === "readiness-drain-replay-transfer",
  )!;
  const state = createInitialState();
  state.steps[stepKey(lesson.id, replay.id)] = {
    ...createStepProgress(),
    revealed: true,
  };
  const recovered = importState(exportState(state));
  for (const criterion of courseModule.gateCriteria!.filter((item) =>
    item.taskRefs.some((ref) => ref.stepId === replay.id),
  )) {
    const first = criterion.taskRefs[0];
    expect(gateRecovery(recovered, criterion, lessons), criterion.id).toEqual({
      status: "available",
      task: { lessonId: lesson.id, stepId: "readiness-job-ledger-transfer" },
    });
    const after = recordSuppliedSolutions(recovered, replay, "solution", 2);
    const recorded = recordCourseEvidence(after, {
      ...eventFor(lesson.id, first.stepId, 3),
      ...assistanceForLessonStep(
        after,
        lesson,
        lesson.steps.find((step) => step.id === first.stepId)!,
      ),
    });
    expect(
      moduleGate(recorded, lessons, courseModule).criteria[
        courseModule.gateCriteria!.indexOf(criterion)
      ].passed,
    ).toBe(false);
  }
});
