import { expect, it } from "vitest";
import {
  delayedReviewExercises,
  lessons,
  modules,
  projects,
} from "../content/course";
import { submitPassingExercise } from "../content/gate-recovery-test-helpers";
import {
  assistanceForLessonStep,
  courseEvidenceSummary,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  revealCourseProjectPackageVariant,
} from "../content/learning-context";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import type {
  ProjectPackage,
  ModuleGateTaskRef,
  UserState,
} from "../domain/types";
import type { PackageVariant } from "../domain/project-package";

const archives = projects.flatMap((project) =>
  project.package ? [project.package] : [],
);
const variants = ["starter", "solution"] as const;
const key = (ref: ModuleGateTaskRef) => ref.lessonId + ":" + ref.stepId;
function open(
  state: UserState,
  archive: ProjectPackage,
  variant: PackageVariant,
  at: number,
) {
  return revealCourseProjectPackageVariant(
    state,
    archive,
    lessons,
    variant,
    at,
  );
}

it.each(archives)(
  "$id combines with every other archive without moving the first disclosure",
  (first) => {
    for (const a of variants) {
      const firstState = open(createInitialState(), first, a, 10);
      const firstKeys = new Set(firstState.events.map(key));
      for (const second of archives.filter((archive) => archive !== first)) {
        for (const b of variants) {
          const combined = open(firstState, second, b, 20);
          const secondOnly = open(createInitialState(), second, b, 20);
          expect(combined.events).toEqual([
            ...firstState.events,
            ...secondOnly.events.filter((event) => !firstKeys.has(key(event))),
          ]);
          const reopened = open(combined, first, a, 30);
          expect(reopened.events.slice(0, combined.events.length)).toEqual(
            combined.events,
          );
          expect(
            reopened.events
              .slice(combined.events.length)
              .every(
                (event) =>
                  event.kind === "exposure" &&
                  event.gate === false &&
                  event.at === 30,
              ),
          ).toBe(true);
        }
      }
    }
  },
);

it.each(["forward", "reverse", "interleaved"] as const)(
  "keeps a route through every module across cumulative archives and %s practice order",
  (order) => {
    const sequence = order === "reverse" ? archives.toReversed() : archives;
    let state = createInitialState();
    let at = 0;
    function openAll(variant: PackageVariant) {
      const previousEvents = [...state.events];
      for (const archive of sequence)
        state = open(state, archive, variant, ++at);
      state = importState(exportState(state));
      expect(state.events.slice(0, previousEvents.length)).toEqual(
        previousEvents,
      );
    }
    if (order !== "interleaved") {
      openAll("starter");
      openAll("solution");
    }
    const stages = order === "reverse" ? modules.toReversed() : modules;
    for (const [index, stage] of stages.entries()) {
      if (order === "interleaved") {
        if (index === Math.floor(stages.length / 3)) openAll("starter");
        if (index === Math.floor((2 * stages.length) / 3)) openAll("solution");
      }
      const criteria = stage.gateCriteria!;
      for (const criterion of order === "forward"
        ? criteria
        : criteria.toReversed()) {
        const label = stage.id + "/" + criterion.id;
        for (
          let i = 0;
          i <=
          criterion.taskRefs.length +
            (criterion.supplementaryStepRefs?.length ?? 0);
          i++
        ) {
          const recovery = courseGateRecovery(state, criterion);
          if (recovery.status === "complete") break;
          expect(recovery.status, label).toBe("available");
          if (recovery.status !== "available") throw new Error(label);
          const ref = recovery.task;
          expect(courseNextGateTask(state, criterion), label).toEqual(ref);
          const lesson = lessons.find((l) => l.id === ref.lessonId)!;
          const step = lesson.steps.find((s) => s.id === ref.stepId)!;
          if (step.evaluator?.kind === "tests")
            expect(assistanceForLessonStep(state, lesson, step), label).toEqual(
              { hints: 0, revealed: false },
            );
          state = submitPassingExercise(state, ref, ++at);
        }
      }
      expect(courseModuleGate(state, lessons, stage).passed, stage.id).toBe(
        true,
      );
    }
    for (const stage of modules)
      expect(courseModuleGate(state, lessons, stage).passed, stage.id).toBe(
        true,
      );
  },
  120_000,
);

function archiveFor(projectId: string) {
  return projects.find((project) => project.id === projectId)!.package!;
}

it.each([
  [
    "service-trust-admission",
    "trust-admission-blank",
    "trust-admission-gate-contract",
  ],
  [
    "service-correlated-telemetry",
    "telemetry-correlation-blank",
    "telemetry-correlation-gate-contract",
  ],
  [
    "service-readiness-drain",
    "readiness-drain-blank",
    "readiness-drain-gate-contract",
  ],
])(
  "counts only submissions made before the archive supplied the equivalent %s implementation",
  (lessonId, stepId, criterionId) => {
    const ref = { lessonId, stepId };
    const lesson = lessons.find((l) => l.id === lessonId)!;
    const stage = modules.find((m) => m.id === lesson.moduleId)!;
    const criterion = stage.gateCriteria!.find((g) => g.id === criterionId)!;
    let opened = open(
      createInitialState(),
      archiveFor("tokio-service"),
      "starter",
      10,
    );
    opened = open(opened, archiveFor("service-operations"), "solution", 30);
    for (const [at, qualifies] of [
      [20, true],
      [40, false],
    ] as const) {
      const success = submitPassingExercise(
        createInitialState(),
        ref,
        at,
      ).events.at(-1)!;
      const restored = importState(
        exportState({ ...opened, events: [success, ...opened.events] }),
      );
      expect(
        courseEvidenceSummary(restored, lesson.conceptIds[0])
          .qualifyingCodingTasks,
      ).toBe(Number(qualifies));
      expect(
        courseModuleGate(restored, lessons, {
          ...stage,
          gateCriteria: [criterion],
        }).passed,
      ).toBe(qualifies);
      expect(restored.events[0]).toEqual(success);
    }
  },
);

it("preserves an earned delayed recall when an import lists earlier evidence after it", () => {
  const concept = "function-ownership";
  const day = 86_400_000;
  let state = createInitialState();
  for (const [i, stepId] of [
    "function-is-empty-text",
    "function-add-mark",
  ].entries()) {
    state = submitPassingExercise(
      state,
      { lessonId: "function-ownership-calibration", stepId },
      100 + i,
    );
  }
  state.events.push({
    id: "completed-review",
    lessonId: "review",
    stepId: delayedReviewExercises[concept].id + ":session",
    at: day + 102,
    kind: "recall",
    passed: true,
    hints: 0,
    revealed: false,
    gate: false,
    delayed: true,
    evaluator: "tests",
    evidenceVersion: 2,
    conceptIds: [concept],
  });
  expect(courseEvidenceSummary(state, concept).mastery.level).toBe("retained");
  state = open(state, archiveFor("durable-log-service"), "solution", 2 * day);
  state = open(state, archiveFor("durable-log-retry"), "starter", 2 * day + 1);
  const history = state.events.toReversed();
  const restored = importState(exportState({ ...state, events: history }));
  expect(courseEvidenceSummary(restored, concept).mastery.level).toBe(
    "retained",
  );
  expect(restored.events).toEqual(history);
});
