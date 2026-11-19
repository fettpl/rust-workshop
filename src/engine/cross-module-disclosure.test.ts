import { expect, it } from "vitest";
import { lessons, modules, projects } from "../content/course";
import {
  assistanceForLessonStep,
  courseEvidenceSummary,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  evidenceForLessonStep,
  recordCourseLessonExposure,
  recordSuppliedSolutions,
  revealCourseProjectPackageVariant,
} from "../content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import type { ModuleGateTaskRef, UserState } from "../domain/types";

const ffi = "unsafe-ffi-split-regions",
  miri = "unsafe-miri-disjoint-regions";
const cases = [
  [
    ffi,
    "split-regions-gate",
    miri,
    "unsafe-miri-disjoint-regions-gate",
    "disjoint-regions-range-transfer",
  ],
  [
    ffi,
    "split-regions-alias-gate",
    miri,
    "unsafe-miri-disjoint-regions-recall",
    "disjoint-regions-range-transfer",
  ],
  [
    miri,
    "disjoint-regions-recall",
    ffi,
    "unsafe-ffi-split-regions-gate",
    "split-envelope-transfer",
  ],
  [
    "conversion-ownership-views",
    "conversions-label-repair",
    "scenario-assessment",
    "unseen-task",
    "project-blank",
  ],
] as const;
function locate(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((l) => l.id === ref.lessonId)!;
  return { lesson, step: lesson.steps.find((s) => s.id === ref.stepId)! };
}
function pass(ref: ModuleGateTaskRef, at: number) {
  const { lesson, step } = locate(ref);
  return {
    id: "pass/" + at,
    ...ref,
    at,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
  };
}
function reveal(
  state: UserState,
  ref: ModuleGateTaskRef,
  at: number,
  mode: string,
) {
  const { lesson, step } = locate(ref);
  if (mode === "flag") {
    state.steps[stepKey(ref.lessonId, ref.stepId)] = {
      ...createStepProgress("// szkic"),
      revealed: true,
    };
    return state;
  }
  if (mode === "hint")
    return recordCourseLessonExposure(state, {
      ...ref,
      at,
      conceptIds: lesson.conceptIds,
      revealed: true,
    });
  const current =
    mode === "coach"
      ? recordSuppliedSolutions(state, step, "solution", at)
      : state;
  return recordCourseLessonExposure(
    current,
    { ...ref, at, conceptIds: lesson.conceptIds, revealed: true },
    "supplied-solution",
  );
}
it.each(cases)(
  "%s/%s changes only the disclosed contract in %s",
  (sourceLesson, sourceStep, dest, id, fresh) => {
    const lesson = lessons.find((l) => l.id === dest)!;
    const stage = modules.find((m) => m.id === lesson.moduleId)!;
    const criterion = stage.gateCriteria!.find((c) => c.id === id)!;
    const target = criterion.taskRefs.find((r) => r.lessonId === dest)!;
    const source = { lessonId: sourceLesson, stepId: sourceStep };
    const unrelated = criterion.taskRefs.find((r) => r.stepId === fresh)!;
    const index = stage.gateCriteria!.indexOf(criterion);
    for (const mode of ["coach", "source-event", "flag", "hint"]) {
      const state = importState(
        exportState(reveal(createInitialState(), source, 10, mode)),
      );
      const helped = mode !== "hint";
      expect(
        assistanceForLessonStep(state, lesson, locate(target).step).revealed,
        mode,
      ).toBe(helped);
      expect(
        assistanceForLessonStep(
          state,
          locate(unrelated).lesson,
          locate(unrelated).step,
        ).revealed,
        mode,
      ).toBe(false);
      for (const scope of [
        lessons,
        lessons.filter((item) => item.moduleId === lesson.moduleId),
      ]) {
        if (helped)
          expect(courseNextGateTask(state, criterion, scope), mode).toEqual(
            unrelated,
          );
        if (mode === "flag") continue; // Untimed flags qualify a new attempt; dated events qualify historical attempts.
        for (const time of [5, 20]) {
          const events = [...state.events, pass(target, time)];
          const recorded = { ...state, events };
          expect(
            courseModuleGate(recorded, scope, stage).criteria[index].passed,
            mode,
          ).toBe(!helped || time === 5);
          if (dest === miri)
            expect(
              courseEvidenceSummary(recorded, lesson.conceptIds[0])
                .qualifyingCodingTasks,
              mode,
            ).toBe(Number(!helped || time === 5));
        }
        const completed = {
          ...state,
          events: [...state.events, pass(unrelated, 20)],
        };
        expect(courseGateRecovery(completed, criterion, scope)).toEqual({
          status: "complete",
        });
      }
    }
  },
);
it.each([
  [ffi, "split-regions-gate", miri, "disjoint-regions-gate"],
  [miri, "disjoint-regions-blank", ffi, "split-regions-blank"],
  [
    "conversion-ownership-views",
    "conversions-label-repair",
    "adversarial-no-clone",
    "adversarial-code",
  ],
])(
  "keeps visible assistance, independent task counts and mastery aligned after a %s disclosure",
  (sourceLesson, sourceId, targetLesson, targetId) => {
    const target = { lessonId: targetLesson, stepId: targetId };
    const { lesson, step } = locate(target);
    const state = reveal(
      createInitialState(),
      { lessonId: sourceLesson, stepId: sourceId },
      10,
      "source-event",
    );
    expect(assistanceForLessonStep(state, lesson, step).revealed).toBe(true);
    state.events.push(pass(target, 20)); // Imported submission without a local assistance flag.
    const restored = importState(exportState(state));
    const original = JSON.stringify(restored.events);
    for (const concept of step.evidence?.conceptIds ?? lesson.conceptIds) {
      const summary = courseEvidenceSummary(restored, concept);
      expect(summary.qualifyingCodingTasks, concept).toBe(0);
      expect(["new", "exposed"], concept).toContain(summary.mastery.level);
    }
    expect(JSON.stringify(restored.events)).toBe(original);
  },
);

it("keeps the Miri split exercise independent after either opaque FFI buffer archive", () => {
  const pkg = projects.find(
    (p) => p.package?.id === "ffi-buffer-workshop",
  )!.package!;
  const stage = modules.find((m) => m.id === "unsafe-miri-contracts")!;
  const criterion = stage.gateCriteria!.find(
    (c) => c.id === "unsafe-miri-disjoint-regions-gate",
  )!;
  for (const variant of ["starter", "solution"] as const) {
    const state = importState(
      exportState(
        revealCourseProjectPackageVariant(
          createInitialState(),
          pkg,
          lessons,
          variant,
          10,
        ),
      ),
    );
    expect(courseNextGateTask(state, criterion)?.stepId).toBe(
      "disjoint-regions-gate",
    );
  }
});

it("distinguishes an archive's dated prerequisite disclosure from a previous independent attempt", () => {
  const pkg = projects.find(
    (p) => p.package?.id === "todo-cli-workshop",
  )!.package!;
  const target = {
    lessonId: "todo-state-invariants",
    stepId: "state-list-gate",
  };
  const { lesson } = locate(target);
  for (const at of [5, 20]) {
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      pkg,
      lessons,
      "starter",
      10,
    );
    state.events.push(pass(target, at));
    const summary = courseEvidenceSummary(
      importState(exportState(state)),
      lesson.conceptIds[0],
    );
    expect(summary.qualifyingCodingTasks).toBe(Number(at < 10));
    expect(summary.mastery.level).toBe(at < 10 ? "practiced" : "exposed");
  }
});

const crossModuleLinks = lessons.flatMap((sourceLesson) =>
  sourceLesson.steps.flatMap((source) =>
    (["code", "solution"] as const).flatMap((variant) =>
      (source.suppliedSolutions?.[variant] ?? [])
        .filter((ref) => locate(ref).lesson.moduleId !== sourceLesson.moduleId)
        .map((target) => ({ sourceLesson, source, variant, target })),
    ),
  ),
);
it("covers every declared starter and solution link between course modules", () => {
  expect(
    crossModuleLinks.filter((link) => link.variant === "code"),
  ).toHaveLength(16);
  expect(
    crossModuleLinks.filter((link) => link.variant === "solution"),
  ).toHaveLength(48);
});
it.each(crossModuleLinks)(
  "$sourceLesson.id/$source.id ($variant) supplies $target.lessonId/$target.stepId",
  ({ source, variant, target }) => {
    const state = importState(
      exportState(
        recordSuppliedSolutions(createInitialState(), source, variant, 10),
      ),
    );
    const { lesson, step } = locate(target);
    expect(assistanceForLessonStep(state, lesson, step).revealed).toBe(true);
    const stage = modules.find((m) => m.id === lesson.moduleId)!;
    for (const criterion of stage.gateCriteria ?? []) {
      if (
        criterion.taskRefs.some(
          (ref) => ref.lessonId === lesson.id && ref.stepId === step.id,
        )
      ) {
        const recovery = courseGateRecovery(state, criterion);
        expect(recovery.status).toBe("available");
        if (recovery.status === "available")
          expect(recovery.task).not.toEqual(target);
      }
    }
  },
);

it("checks external disclosures in a lesson-only gate without expanding its list of tasks", () => {
  const target = { lessonId: miri, stepId: "disjoint-regions-gate" };
  const { lesson, step } = locate(target);
  const state = reveal(
    createInitialState(),
    { lessonId: ffi, stepId: "split-regions-gate" },
    10,
    "source-event",
  );
  state.events.push(pass(target, 20));
  const gate = courseModuleGate(state, [{ ...lesson, steps: [step] }]);
  expect(gate.criteria).toHaveLength(1);
  expect(gate.passed).toBe(false);
});

it("a displayed conversions starter leaves a dated record for the entire ownership reading task", () => {
  const source = locate({
    lessonId: "conversion-ownership-views",
    stepId: "conversions-label-repair",
  }).step;
  const target = {
    lessonId: "adversarial-no-clone",
    stepId: "adversarial-code",
  };
  const { lesson, step } = locate(target);
  for (const at of [5, 20]) {
    const helped = recordSuppliedSolutions(
      createInitialState(),
      source,
      "code",
      10,
    );
    const state = importState(
      exportState({
        ...helped,
        steps: {},
        events: [...helped.events, pass(target, at)],
      }),
    );
    expect(assistanceForLessonStep(state, lesson, step).revealed).toBe(true);
    for (const id of step.evidence!.conceptIds) {
      const summary = courseEvidenceSummary(state, id);
      expect(summary.qualifyingCodingTasks).toBe(Number(at < 10));
      expect(summary.mastery.level).toBe(at < 10 ? "practiced" : "exposed");
    }
  }
});
