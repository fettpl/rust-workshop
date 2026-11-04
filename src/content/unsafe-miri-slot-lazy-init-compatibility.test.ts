import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/unsafe-miri-pre-slot-lazy-init.json";
import {
  expectedPostSlotMiriProjectSha256,
  expectedPreSlotMiriProjectSha256,
  historicalBeforeSlotLazyInit,
  slotLazyInitLessonId,
  slotLazyInitPrimaryStepId,
  slotLazyInitStepIds,
} from "./unsafe-miri-slot-lazy-init-compatibility-fixture";
import { historicalBeforeMutSlotWithMut } from "./unsafe-miri-mut-slot-with-mut-compatibility-fixture";
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

describe("slot lazy-init historical compatibility", () => {
  it("projects the authentic e1 predecessor and restores only the new package delta", () => {
    const beforeMutSlotWithMut = historicalBeforeMutSlotWithMut(
      historicalBeforeExistingContractRepair(currentCourse),
    );
    const projected = historicalBeforeSlotLazyInit(beforeMutSlotWithMut);
    const lesson = projected.lessons.find(
      (candidate) => candidate.id === slotLazyInitLessonId,
    );
    const project = projected.projects.find(
      (candidate) => candidate.id === "miri-safety",
    )!;

    expect(baseline.lessonId).toBe(slotLazyInitLessonId);
    expect(baseline.stepIds).toEqual(slotLazyInitStepIds);
    expect(baseline.primaryStepId).toBe(slotLazyInitPrimaryStepId);
    expect(
      hashJson(
        beforeMutSlotWithMut.projects.find(
          (project) => project.id === "miri-safety",
        ),
      ),
    ).toBe(expectedPostSlotMiriProjectSha256);
    expect(baseline.preSlotMiriProjectSha256).toBe(
      expectedPreSlotMiriProjectSha256,
    );
    expect(
      lesson?.steps.some((step) =>
        slotLazyInitStepIds.includes(step.id as never),
      ),
    ).toBe(false);
    expect(
      projected.modules
        .find((module) => module.id === "unsafe-miri-contracts")
        ?.gateCriteria?.find(
          (criterion) => criterion.id === "unsafe-miri-slot-state-gate",
        )
        ?.taskRefs.some((ref) => ref.stepId === slotLazyInitPrimaryStepId),
    ).toBe(false);
    expect(
      project.package?.files.some(
        (file) => file.path === "tests/slot_lazy_init.rs",
      ),
    ).toBe(false);
    expect(
      project.package?.revealStepRefs.some(
        (ref) => ref.stepId === slotLazyInitPrimaryStepId,
      ),
    ).toBe(false);
    expect(hashJson(project)).toBe(expectedPreSlotMiriProjectSha256);
  });

  it("keeps unrelated changes visible when the reviewed successor hash no longer matches", () => {
    const mutations = [
      (project: (typeof currentCourse.projects)[number]) => ({
        ...project,
        title: `${project.title} unrelated mutation`,
      }),
      (project: (typeof currentCourse.projects)[number]) => ({
        ...project,
        package: project.package && {
          ...project.package,
          files: project.package.files.map((file) =>
            file.path !== "tests/slot_lazy_init.rs"
              ? file
              : { ...file, solution: `${file.solution}\nmutation` },
          ),
        },
      }),
    ];
    for (const mutate of mutations) {
      const mutated = {
        ...currentCourse,
        projects: currentCourse.projects.map((project) =>
          project.id === "miri-safety" ? mutate(project) : project,
        ),
      };
      const projected = historicalBeforeSlotLazyInit(
        historicalBeforeExistingContractRepair(mutated),
      );
      const project = projected.projects.find(
        (candidate) => candidate.id === "miri-safety",
      )!;
      expect(
        project.package?.files.some(
          (file) => file.path === "tests/slot_lazy_init.rs",
        ),
      ).toBe(true);
      expect(hashJson(project)).not.toBe(expectedPreSlotMiriProjectSha256);
    }
  });

  it.each([1, 2, 3] as const)(
    "round-trips real saved state V%s and preserves assisted predecessor evidence",
    (version) => {
      const state = createInitialState();
      const oldKey = stepKey(slotLazyInitLessonId, "slot-state-gate");
      state.steps[oldKey] = {
        ...createStepProgress("// predecessor slot answer"),
        answer: "old slot answer",
        completed: true,
        revealed: true,
        hints: 1,
      };
      state.events = [
        {
          id: `old-slot-v${version}`,
          lessonId: slotLazyInitLessonId,
          stepId: "slot-state-gate",
          conceptIds: ["unsafe-miri-slot-state-contract"],
          evidenceVersion: 2,
          kind: "exposure",
          evaluator: "exact-output",
          passed: true,
          hints: 1,
          revealed: true,
          at: 1_700_000_000_000 + version,
        },
      ];
      state.notes[slotLazyInitLessonId] = "preserved pre-feature note";
      state.bookmarks = [oldKey];
      state.resume = {
        ...state.resume,
        view: "lesson",
        lessonId: slotLazyInitLessonId,
        stepIndex: 6,
        panel: "code",
        focus: true,
      };
      // Build actual historical input shapes, rather than relabel current V3.
      // V2 required the old onboarding field; V1 had no routePreference.
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
          exportedAt: "2026-10-24T12:00:00.000Z",
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
          stepKey(slotLazyInitLessonId, slotLazyInitPrimaryStepId)
        ],
      ).toBeUndefined();
      expect(
        restored.events.some(
          (event) => event.stepId === slotLazyInitPrimaryStepId,
        ),
      ).toBe(false);
      expect(importState(exportState(restored))).toEqual(restored);
    },
  );
});

const serializedRegistry = (course: typeof currentCourse) =>
  Object.fromEntries(
    baseline.registryKeys.map((key) => [
      key,
      (course as unknown as Record<string, unknown>)[key],
    ]),
  );

it("preserves the complete authentic e1 registry and original seven-step Slot prefix", () => {
  const projected = historicalBeforeSlotLazyInit(
    historicalBeforeExistingContractRepair(currentCourse),
  );
  expect(hashJson(serializedRegistry(projected))).toBe(
    baseline.wholeCourseSha256,
  );
  expect(
    projected.lessons.find((lesson) => lesson.id === slotLazyInitLessonId),
  ).toEqual(baseline.lesson);
  expect(
    projected.modules.find((module) => module.id === "unsafe-miri-contracts"),
  ).toEqual(baseline.module);
  expect(
    projected.projects.find((project) => project.id === "miri-safety"),
  ).toEqual(baseline.project);
});

it("does not erase changes to original Slot or previously authored disjoint transfer steps", () => {
  for (const [lessonId, stepId] of [
    [slotLazyInitLessonId, baseline.lesson.steps[0].id],
    ["unsafe-miri-disjoint-regions", "disjoint-regions-range-transfer"],
  ]) {
    const mutated = {
      ...currentCourse,
      lessons: currentCourse.lessons.map((lesson) =>
        lesson.id !== lessonId
          ? lesson
          : {
              ...lesson,
              steps: lesson.steps.map((step) =>
                step.id !== stepId
                  ? step
                  : {
                      ...step,
                      title: step.title + " unrelated old-source mutation",
                    },
              ),
            },
      ),
    };
    const projected = historicalBeforeSlotLazyInit(
      historicalBeforeExistingContractRepair(mutated),
    );
    expect(hashJson(serializedRegistry(projected))).not.toBe(
      baseline.wholeCourseSha256,
    );
  }
});
