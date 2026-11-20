import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import { appendHiddenTests } from "../runner";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import {
  courseEvidencePolicy,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";
import type { LessonStep } from "../domain/types";
import { performanceRecoveryFixtures } from "./performance-recovery-fixtures";

const bindings = [
  [
    "performance-evidence",
    "performance-measured-workload",
    "workload-prefix-transfer",
    ["performance-workload-gate", "performance-budget-gate"],
  ],
  [
    "performance-evidence",
    "performance-borrowed-stream",
    "borrow-tagged-messages-transfer",
    ["performance-borrow-gate", "performance-stream-gate"],
  ],
  [
    "performance-evidence",
    "performance-bounded-buffer",
    "buffer-line-report-transfer",
    ["performance-buffer-gate", "performance-capacity-gate"],
  ],
  [
    "performance-evidence",
    "performance-evidence-decisions",
    "decision-batch-audit-transfer",
    ["performance-decision-gate", "performance-interpretation-gate"],
  ],
  [
    "profile-evidence",
    "profile-instruction-cost",
    "instruction-batch-budget-transfer",
    ["profile-instruction-record-gate", "profile-instruction-budget-gate"],
  ],
  [
    "profile-evidence",
    "profile-allocation-events",
    "allocation-site-bytes-transfer",
    ["profile-allocation-bytes-gate"],
  ],
  [
    "profile-evidence",
    "profile-optimization-transfer",
    "optimization-trial-batch-transfer",
    ["profile-transfer-improvement-gate", "profile-transfer-workload-gate"],
  ],
  [
    "profile-evidence",
    "profile-regression-decision",
    "profile-regression-batch-transfer",
    [
      "profile-regression-threshold-gate",
      "profile-regression-correctness-gate",
    ],
  ],
] as const;

const criteria = bindings.flatMap(
  ([moduleId, lessonId, stepId, criterionIds]) =>
    criterionIds.flatMap((criterionId) =>
      ["saved-flag", "explicit-reveal"].map((mode) => ({
        moduleId,
        lessonId,
        stepId,
        criterionId,
        mode,
      })),
    ),
);

it.each(criteria)(
  "offers fresh practice for $criterionId after $mode",
  ({ moduleId, lessonId, stepId, criterionId, mode }) => {
    const courseModule = modules.find(
      (candidate) => candidate.id === moduleId,
    )!;
    const criterion = courseModule.gateCriteria!.find(
      (candidate) => candidate.id === criterionId,
    )!;
    const initial = createInitialState();
    const ref = criterion.taskRefs[0];
    const first = lessons
      .find((entry) => entry.id === ref.lessonId)!
      .steps.find((entry) => entry.id === ref.stepId)!;
    const revealed =
      mode === "explicit-reveal"
        ? revealAuthoredStepSolutions(
            initial,
            [ref],
            lessons,
            100,
            courseEvidencePolicy,
          )
        : {
            ...initial,
            steps: {
              [stepKey(ref.lessonId, ref.stepId)]: {
                ...createStepProgress(first.code),
                revealed: true,
              },
            },
          };
    const restored = importState(exportState(revealed));
    const history = restored.events.slice();
    expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId },
    });
    expect(restored.events).toEqual(history);
    const lesson = lessons.find((candidate) => candidate.id === lessonId)!;
    const step = lesson.steps.find((candidate) => candidate.id === stepId)!;
    const next = recordCourseEvidence(restored, {
      id: `fresh/${criterionId}`,
      lessonId,
      stepId,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: step.evaluator?.kind,
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: 200,
    });
    expect(
      courseModuleGate(next, lessons, courseModule).criteria.find(
        (item) => item.label === criterion.label,
      )?.passed,
    ).toBe(true);
    expect(next.events.slice(0, history.length)).toEqual(history);
  },
);

function nativeResult(source: string, step: LessonStep, name: string) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored tests");
  const directory = mkdtempSync(join(tmpdir(), "performance-recovery-"));
  try {
    const file = join(directory, "fixture.rs"),
      binary = join(directory, "fixture");
    writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 30_000 },
    );
    expect(compiled.error, name).toBeUndefined();
    expect(compiled.signal, name).toBeNull();
    expect(compiled.status, name + compiled.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(run.error, name).toBeUndefined();
    expect(run.signal, name).toBeNull();
    return { status: run.status, output: run.stdout + run.stderr };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each(performanceRecoveryFixtures)(
  "$id executes canonical/equivalent and rejects semantic controls",
  (fixture) => {
    const step = lessons
      .flatMap((lesson) => lesson.steps)
      .find((step) => step.id === fixture.id)!;
    for (const [name, source, expected] of [
      ["canonical", step.solution!, 0],
      ["equivalent", fixture.equivalent, 0],
      ["mutant", fixture.mutant, 101],
      ...Object.entries(fixture.additionalMutants).map(
        ([name, source]) => [name, source, 101] as const,
      ),
    ] as const) {
      if (expected === 101) expect(source, name).not.toBe(step.solution);
      const run = nativeResult(source, step, name);
      expect(run.status, name + run.output).toBe(expected);
    }
  },
  120_000,
);

it.each([
  ["instruction-gate", "instruction-blank"],
  ["instruction-blank", "instruction-gate"],
] as const)(
  "declares %s -> %s supplied solution without rewriting earlier successes",
  (sourceId, targetId) => {
    const lesson = lessons.find(
      (candidate) => candidate.id === "profile-instruction-cost",
    )!;
    const source = lesson.steps.find((step) => step.id === sourceId)!;
    const target = lesson.steps.find((step) => step.id === targetId)!;
    const targetRef = { lessonId: lesson.id, stepId: target.id };
    expect(source.suppliedSolutions?.solution).toContainEqual(targetRef);
    expect(
      nativeResult(source.solution!, target, "historical-identical-behavior")
        .status,
    ).toBe(0);

    const initial = recordCourseEvidence(createInitialState(), {
      id: `preserved/${targetId}`,
      lessonId: lesson.id,
      stepId: targetId,
      ...evidenceForLessonStep(lesson, target),
      kind: target.evidenceKind,
      evaluator: target.evaluator?.kind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: target.evidenceGate === true,
      at: 50,
    });
    const disclosed = revealAuthoredStepSolutions(
      initial,
      [{ lessonId: lesson.id, stepId: source.id }],
      lessons,
      100,
      courseEvidencePolicy,
    );
    const after = recordSuppliedSolutions(disclosed, source, "solution", 100);
    expect(after.steps[stepKey(lesson.id, targetId)].revealed).toBe(true);
    expect(after.events.slice(0, initial.events.length)).toEqual(
      initial.events,
    );
    const courseModule = modules.find(
      (candidate) => candidate.id === "profile-evidence",
    )!;
    expect(
      courseModuleGate(importState(exportState(after)), lessons, courseModule)
        .criteria[0].passed,
    ).toBe(true);
    expect(recordSuppliedSolutions(after, source, "solution", 101)).toBe(after);
  },
  60_000,
);

it("preserves the old workload variants and appends a new blank with distinct behavior", () => {
  const lesson = lessons.find(
    (candidate) => candidate.id === "performance-measured-workload",
  )!;
  expect(lesson.steps.slice(0, 6).map((step) => step.id)).toEqual([
    "workload-predict",
    "workload-run",
    "workload-gate",
    "workload-budget-gate",
    "workload-blank",
    "workload-recall",
  ]);
  const gate = lesson.steps.find((step) => step.id === "workload-gate")!;
  const oldBlank = lesson.steps.find((step) => step.id === "workload-blank")!;
  expect(
    nativeResult(gate.solution!, oldBlank, "preserved-old-workload").status,
  ).toBe(0);
  const fresh = lesson.steps.at(-1)!;
  expect(fresh.id).toBe("workload-prefix-transfer");
  expect(fresh.kind).toBe("blank");
  expect(fresh.code).toBeUndefined();
  expect(fresh.solution).not.toBe(gate.solution);
});
