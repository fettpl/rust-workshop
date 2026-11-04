import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/unsafe-miri-pre-mut-slot-with-mut.json";
import {
  expectedPostMutSlotWithMutProjectSha256,
  expectedPreMutSlotWithMutProjectSha256,
  historicalBeforeMutSlotWithMut,
  mutSlotWithMutLessonId,
  mutSlotWithMutPrimaryStepId,
  mutSlotWithMutSessionStop,
  mutSlotWithMutStepIds,
} from "./unsafe-miri-mut-slot-with-mut-compatibility-fixture";
import {
  expectedPreSlotMiriProjectSha256,
  historicalBeforeSlotLazyInit,
} from "./unsafe-miri-slot-lazy-init-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./service-client-retry-compatibility-fixture";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const serializedRegistry = (course: typeof currentCourse) =>
  Object.fromEntries(
    baseline.registryKeys.map((key) => [
      key,
      (course as unknown as Record<string, unknown>)[key],
    ]),
  );

describe("MutSlot with_mut historical compatibility", () => {
  it("projects the authentic 8a registry and removes only the reviewed successor delta", () => {
    const projected = historicalBeforeMutSlotWithMut(
      historicalBeforeExistingContractRepair(currentCourse),
    );
    const lesson = projected.lessons.find(
      (candidate) => candidate.id === mutSlotWithMutLessonId,
    );
    const project = projected.projects.find(
      (candidate) => candidate.id === "miri-safety",
    )!;

    expect(baseline.lessonId).toBe(mutSlotWithMutLessonId);
    expect(baseline.stepIds).toEqual(
      baseline.lesson.steps.map((step) => step.id),
    );
    expect(baseline.primaryStepId).toBe("mut-slot-gate");
    expect(
      hashJson(
        currentCourse.projects.find(
          (candidate) => candidate.id === "miri-safety",
        ),
      ),
    ).toBe(expectedPostMutSlotWithMutProjectSha256);
    expect(hashJson(project)).toBe(expectedPreMutSlotWithMutProjectSha256);
    expect(lesson?.steps.map((step) => step.id)).toEqual(
      baseline.lesson.steps.map((step) => step.id),
    );
    expect(
      lesson?.steps.some((step) =>
        mutSlotWithMutStepIds.includes(step.id as never),
      ),
    ).toBe(false);
    expect(lesson?.sessionStops).toBeUndefined();
    expect(project).toEqual(baseline.project);
    expect(
      projected.modules.find((module) => module.id === "unsafe-miri-contracts"),
    ).toEqual(baseline.module);
    expect(hashJson(serializedRegistry(projected))).toBe(
      baseline.wholeCourseSha256,
    );
  });

  it("fails closed for old step edits and near-miss package mutations", () => {
    const oldStepMutation = {
      ...currentCourse,
      lessons: currentCourse.lessons.map((lesson) =>
        lesson.id !== mutSlotWithMutLessonId
          ? lesson
          : {
              ...lesson,
              steps: lesson.steps.map((step) =>
                step.id !== "mut-slot-gate"
                  ? step
                  : { ...step, title: `${step.title} old mutation` },
              ),
            },
      ),
    };
    expect(
      hashJson(
        serializedRegistry(
          historicalBeforeMutSlotWithMut(
            historicalBeforeExistingContractRepair(oldStepMutation),
          ),
        ),
      ),
    ).not.toBe(baseline.wholeCourseSha256);

    const packageMutation = {
      ...currentCourse,
      projects: currentCourse.projects.map((project) =>
        project.id !== "miri-safety"
          ? project
          : {
              ...project,
              package: project.package && {
                ...project.package,
                files: project.package.files.map((file) =>
                  file.path === "tests/mut_slot_with_mut.rs"
                    ? { ...file, solution: `${file.solution}\nmutation` }
                    : file,
                ),
              },
            },
      ),
    };
    const projected = historicalBeforeMutSlotWithMut(
      historicalBeforeExistingContractRepair(packageMutation),
    );
    const packageAfter = projected.projects.find(
      (p) => p.id === "miri-safety",
    )!.package!;
    expect(
      packageAfter.files.some(
        (file) => file.path === "tests/mut_slot_with_mut.rs",
      ),
    ).toBe(true);
    expect(
      hashJson(projected.projects.find((p) => p.id === "miri-safety")),
    ).not.toBe(expectedPreMutSlotWithMutProjectSha256);

    const nearMissStopMutation = {
      ...currentCourse,
      lessons: currentCourse.lessons.map((lesson) =>
        lesson.id !== mutSlotWithMutLessonId
          ? lesson
          : {
              ...lesson,
              sessionStops: lesson.sessionStops?.map((stop) =>
                stop.afterStepId === mutSlotWithMutSessionStop.afterStepId
                  ? { ...stop, title: `${stop.title} near miss` }
                  : stop,
              ),
            },
      ),
    };
    const nearMissProjected = historicalBeforeMutSlotWithMut(
      historicalBeforeExistingContractRepair(nearMissStopMutation),
    );
    const nearMissLesson = nearMissProjected.lessons.find(
      (lesson) => lesson.id === mutSlotWithMutLessonId,
    )!;
    expect(nearMissLesson.sessionStops).toEqual([
      {
        ...mutSlotWithMutSessionStop,
        title: `${mutSlotWithMutSessionStop.title} near miss`,
      },
    ]);
    expect(hashJson(serializedRegistry(nearMissProjected))).not.toBe(
      baseline.wholeCourseSha256,
    );
  });

  it("composes before the older Slot helper without erasing the 8a predecessor delta", () => {
    const projected = historicalBeforeSlotLazyInit(
      historicalBeforeMutSlotWithMut(
        historicalBeforeExistingContractRepair(currentCourse),
      ),
    );
    const project = projected.projects.find(
      (candidate) => candidate.id === "miri-safety",
    )!;
    expect(hashJson(project)).toBe(expectedPreSlotMiriProjectSha256);
  });

  it.each([1, 2, 3] as const)(
    "round-trips the true historical state V%s while preserving evidence and resume fields",
    (version) => {
      const state = createInitialState();
      const oldKey = stepKey(mutSlotWithMutLessonId, "mut-slot-gate");
      state.steps[oldKey] = {
        ...createStepProgress("old MutSlot answer"),
        answer: "old MutSlot answer",
        completed: true,
        revealed: true,
        hints: 1,
      };
      state.events = [
        {
          id: `old-mut-slot-v${version}`,
          lessonId: mutSlotWithMutLessonId,
          stepId: "mut-slot-gate",
          conceptIds: ["unsafe-miri-mut-slot-variance-contract"],
          evidenceVersion: 2,
          kind: "transfer",
          evaluator: "tests",
          passed: true,
          hints: 1,
          revealed: true,
          at: 1_700_000_100_000 + version,
        },
      ];
      state.notes[mutSlotWithMutLessonId] = "pre-feature note";
      state.bookmarks = [oldKey];
      state.resume = {
        ...state.resume,
        view: "lesson",
        lessonId: mutSlotWithMutLessonId,
        stepIndex: 3,
        panel: "code",
        focus: true,
      };
      const historicalFields =
        version === 1
          ? Object.fromEntries(
              Object.entries(state).filter(
                ([key]) => key !== "routePreference",
              ),
            )
          : state;
      const raw = {
        ...historicalFields,
        schemaVersion: version,
        onboarding:
          version === 3
            ? state.onboarding
            : { ...state.onboarding, background: "both" },
      };
      const restored = importState(
        JSON.stringify({
          schemaVersion: version,
          appVersion: state.appVersion,
          exportedAt: "2026-10-26T12:00:00.000Z",
          state: raw,
        }),
      );
      expect(restored.steps[oldKey]).toEqual(state.steps[oldKey]);
      expect(restored.events).toEqual(state.events);
      expect(restored.notes).toEqual(state.notes);
      expect(restored.bookmarks).toEqual(state.bookmarks);
      expect(restored.resume).toEqual(state.resume);
      expect(
        restored.steps[
          stepKey(mutSlotWithMutLessonId, mutSlotWithMutPrimaryStepId)
        ],
      ).toBeUndefined();
      expect(importState(exportState(restored))).toEqual(restored);
    },
  );
});
