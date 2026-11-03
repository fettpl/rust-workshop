import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/unsafe-miri-pre-disjoint-ranges.json";
import {
  acceptedPreDisjointRangesCourseSha256,
  historicalBeforeDisjointRanges,
  disjointRangesLessonId,
  disjointRangesPrimaryStepId,
  disjointRangesStepIds,
} from "./unsafe-miri-disjoint-ranges-compatibility-fixture";
import { historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";
import {
  assistanceForLessonStep,
  evidenceForLessonStep,
  recordCourseEvidence,
  revealCourseProjectPackageVariant,
  courseEvidencePolicy,
} from "./learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import type {
  EvidenceEvent,
  Lesson,
  LessonStep,
  UserState,
} from "../domain/types";
import { gateRecovery, independentCodingTaskIds } from "../engine/learning";
import { lessons, modules, projects, reviewExercises } from "./course";

const hashText = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const hashJson = (value: unknown) => hashText(JSON.stringify(value));

const serializedRegistry = (course: typeof currentCourse) =>
  Object.fromEntries(
    [
      "competencies",
      "concepts",
      "delayedReviewExercises",
      "lessons",
      "modules",
      "ownershipModule",
      "project",
      "projects",
      "reviewExercises",
      "reviewExercisesById",
      "roadmap",
      "shortReviewExercises",
      "sources",
      "traces",
    ].map((key) => [key, (course as Record<string, unknown>)[key]]),
  );

function lessonStep(lessonId: string, stepId: string) {
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  const step = lesson?.steps.find((candidate) => candidate.id === stepId);
  if (!lesson || !step) throw new Error(`Missing ${lessonId}/${stepId}`);
  return { lesson, step };
}

function eventFor(
  lesson: Lesson,
  step: LessonStep,
  id: string,
  at: number,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  return {
    id,
    ...evidenceForLessonStep(lesson, step),
    lessonId: lesson.id,
    stepId: step.id,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    at,
    gate: step.evidenceGate,
    ...overrides,
  };
}

type SyntheticState = Omit<UserState, "schemaVersion" | "onboarding"> & {
  schemaVersion: 1 | 2 | 3;
  onboarding: UserState["onboarding"] & {
    background?: "java" | "python" | "both";
  };
};

function oldState(version: 1 | 2 | 3): SyntheticState {
  const state = createInitialState();
  const oldLesson = baseline.lesson as {
    id: string;
    steps: Array<{ id: string }>;
  };
  for (const [index, step] of oldLesson.steps.entries()) {
    state.steps[stepKey(oldLesson.id, step.id)] = {
      ...createStepProgress(`// old disjoint ${index}`),
      answer: `old answer ${index}`,
      completed: true,
      hints: index === 1 ? 1 : 0,
      revealed: index === 2,
      attempts: [
        {
          at: 1_700_000_000_000 + index,
          code: `// attempt ${index}`,
          passed: true,
          feedback: "old feedback",
        },
      ],
    };
  }
  state.events = oldLesson.steps.map((step, index) => ({
    id: `old-disjoint-${index}`,
    lessonId: oldLesson.id,
    stepId: step.id,
    conceptIds: ["unsafe-miri-disjoint-regions-contract"],
    evidenceVersion: 2,
    kind: index % 2 ? "transfer" : "exposure",
    evaluator: index % 2 ? "tests" : "exact-output",
    passed: true,
    hints: index === 1 ? 1 : 0,
    revealed: index === 2,
    at: 1_700_000_000_000 + index,
  }));
  state.notes = { [oldLesson.id]: "stara notatka disjoint" };
  state.bookmarks = [oldLesson.id];
  state.review = [
    {
      conceptId: "unsafe-miri-disjoint-regions-contract",
      dueAt: 1_700_000_000_100,
      intervalDays: 2,
      attempts: 3,
      reason: "old",
    },
  ];
  state.ratings = [
    {
      conceptId: "unsafe-miri-disjoint-regions-contract",
      rating: "good",
      at: 1_700_000_000_200,
    },
  ];
  state.reviewSession = {
    conceptId: "unsafe-miri-disjoint-regions-contract",
    mode: "challenge",
    sessionId: "old-disjoint-review",
    startedAt: 1_700_000_000_000,
    wasDue: true,
    exerciseId: "review-unsafe-miri-disjoint-regions",
  };
  state.resume = {
    view: "lesson",
    lessonId: oldLesson.id,
    stepIndex: oldLesson.steps.length - 1,
    panel: "code",
    focus: true,
  };
  if (version === 3) return state as SyntheticState;
  if (version === 2)
    return {
      ...state,
      schemaVersion: 2,
      onboarding: { ...state.onboarding, background: "both" },
    };
  const v1 = Object.fromEntries(
    Object.entries(state).filter(
      ([key]) => key !== "schemaVersion" && key !== "routePreference",
    ),
  ) as Omit<UserState, "schemaVersion" | "routePreference">;
  return {
    ...v1,
    schemaVersion: 1,
    onboarding: { ...state.onboarding, background: "both" },
  };
}

describe("disjoint range compatibility and evidence", () => {
  it("projects the exact pre-feature course and preserves the supplied baseline bytes", () => {
    const projected = historicalBeforeDisjointRanges(
      historicalBeforeExistingContractRepair(currentCourse),
    );
    expect(acceptedPreDisjointRangesCourseSha256).toBe(
      "ce77d3f044159372bacc143ff4d22c04241333e09fbbba3b52bba8b1dc1296d5",
    );
    expect(baseline.inventory).toEqual({
      modules: 48,
      lessons: 192,
      concepts: 194,
      steps: 1275,
      sources: 349,
    });
    expect(hashJson(serializedRegistry(projected))).toBe(
      acceptedPreDisjointRangesCourseSha256,
    );
    expect(acceptedPreDisjointRangesCourseSha256).toBe(
      baseline.wholeCourseSha256,
    );
    expect(
      hashText(
        readFileSync(
          new URL(
            "./fixtures/unsafe-miri-pre-disjoint-ranges.json",
            import.meta.url,
          ),
        ),
      ),
    ).toBe("444504d56d8cc858f227db1f0c93212a20ec14dac6b9e8c9daa95c832e99da14");
    expect(
      projected.lessons.find((lesson) => lesson.id === disjointRangesLessonId),
    ).toEqual(baseline.lesson);
    expect(
      projected.modules.find((module) => module.id === "unsafe-miri-contracts"),
    ).toEqual(baseline.module);
    expect(
      projected.projects.find((project) => project.id === "miri-safety"),
    ).toEqual(baseline.project);
  });

  it("removes only the reviewed additions and lets unrelated mutations fail the old digest", () => {
    const mutations: Array<
      [
        string,
        (course: typeof currentCourse) => typeof currentCourse,
        (projected: typeof currentCourse) => void,
      ]
    > = [
      [
        "old lesson metadata",
        (course) => ({
          ...course,
          lessons: course.lessons.map((lesson) =>
            lesson.id === disjointRangesLessonId
              ? { ...lesson, title: `${lesson.title} mutation` }
              : lesson,
          ),
        }),
        (projected) =>
          expect(
            projected.lessons.find((item) => item.id === disjointRangesLessonId)
              ?.title,
          ).toContain("mutation"),
      ],
      [
        "old lesson step body",
        (course) => ({
          ...course,
          lessons: course.lessons.map((lesson) =>
            lesson.id === disjointRangesLessonId
              ? {
                  ...lesson,
                  steps: lesson.steps.map((step) =>
                    step.id === "disjoint-regions-gate"
                      ? { ...step, prompt: `${step.prompt} mutation` }
                      : step,
                  ),
                }
              : lesson,
          ),
        }),
        (projected) =>
          expect(
            projected.lessons
              .find((item) => item.id === disjointRangesLessonId)
              ?.steps.find((step) => step.id === "disjoint-regions-gate")
              ?.prompt,
          ).toContain("mutation"),
      ],
      [
        "old criterion ref",
        (course) => ({
          ...course,
          modules: course.modules.map((module) =>
            module.id === "unsafe-miri-contracts"
              ? {
                  ...module,
                  gateCriteria: module.gateCriteria?.map((criterion) =>
                    criterion.id === "unsafe-miri-disjoint-regions-gate"
                      ? {
                          ...criterion,
                          taskRefs: criterion.taskRefs.map((ref, index) =>
                            index === 0
                              ? { ...ref, stepId: "mutated-old-ref" }
                              : ref,
                          ),
                        }
                      : criterion,
                  ),
                }
              : module,
          ),
        }),
        (projected) =>
          expect(
            projected.modules
              .find((module) => module.id === "unsafe-miri-contracts")
              ?.gateCriteria?.find(
                (criterion) =>
                  criterion.id === "unsafe-miri-disjoint-regions-gate",
              )?.taskRefs[0].stepId,
          ).toBe("mutated-old-ref"),
      ],
      [
        "package file",
        (course) => ({
          ...course,
          projects: course.projects.map((project) =>
            project.id === "miri-safety"
              ? {
                  ...project,
                  package: project.package && {
                    ...project.package,
                    files: project.package.files.map((file, index) =>
                      index === 0
                        ? {
                            ...file,
                            solution: `${file.solution ?? file.starter}\nmutation`,
                          }
                        : file,
                    ),
                  },
                }
              : project,
          ),
        }),
        (projected) =>
          expect(
            projected.projects.find((project) => project.id === "miri-safety")
              ?.package?.files[0].solution,
          ).toContain("mutation"),
      ],
      [
        "project metadata",
        (course) => ({
          ...course,
          projects: course.projects.map((project) =>
            project.id === "miri-safety"
              ? { ...project, title: `${project.title} mutation` }
              : project,
          ),
        }),
        (projected) =>
          expect(
            projected.projects.find((project) => project.id === "miri-safety")
              ?.title,
          ).toContain("mutation"),
      ],
    ];
    for (const [label, apply, assertMutation] of mutations) {
      const projected = historicalBeforeDisjointRanges(
        historicalBeforeExistingContractRepair(apply(currentCourse)),
      );
      assertMutation(projected);
      expect(hashJson(serializedRegistry(projected)), label).not.toBe(
        acceptedPreDisjointRangesCourseSha256,
      );
    }
  });

  it.each([1, 2, 3] as const)(
    "round-trips old saved state V%s without synthesizing new primary progress",
    (version) => {
      const raw = oldState(version);
      const restored = importState(
        JSON.stringify({
          schemaVersion: version,
          appVersion: raw.appVersion,
          exportedAt: "2026-10-15T12:00:00.000Z",
          state: raw,
        }),
      );
      expect(restored.steps).toEqual(raw.steps);
      expect(restored.events).toEqual(raw.events);
      expect(restored.notes).toEqual(raw.notes);
      expect(restored.bookmarks).toEqual(raw.bookmarks);
      expect(restored.review).toEqual(raw.review);
      expect(restored.reviewSession).toEqual(raw.reviewSession);
      expect(restored.ratings).toEqual(raw.ratings);
      expect(restored.resume).toEqual(raw.resume);
      expect(
        restored.steps[
          stepKey(disjointRangesLessonId, disjointRangesPrimaryStepId)
        ],
      ).toBeUndefined();
      expect(
        restored.events.some(
          (event) => event.stepId === disjointRangesPrimaryStepId,
        ),
      ).toBe(false);
      expect(importState(exportState(restored))).toEqual(restored);
    },
  );

  it("keeps old aliases together and gives only the new primary its second family", () => {
    const lesson = lessons.find(
      (candidate) => candidate.id === disjointRangesLessonId,
    )!;
    const oldSteps = lesson.steps.filter(
      (step) => !disjointRangesStepIds.includes(step.id as never),
    );
    const oldFamily = "unsafe-miri/disjoint-regions-v1";
    for (const step of oldSteps) {
      if (
        step.id === "disjoint-regions-gate" ||
        step.id === "disjoint-regions-contract-gate" ||
        step.id === "disjoint-regions-blank"
      )
        expect(step.evidence?.codingTaskId).toBe(oldFamily);
      else expect(step.evidence?.codingTaskId).not.toBe(disjointRangesFamily);
    }
    const primary = lessonStep(
      disjointRangesLessonId,
      disjointRangesPrimaryStepId,
    ).step;
    expect(primary.evidence?.codingTaskId).toBe(disjointRangesFamily);
    expect(primary.evidence?.version).toBe(2);
    expect(
      lesson.steps.find((step) => step.id === "disjoint-regions-range-model")
        ?.evidence?.codingTaskId,
    ).toBeUndefined();
    expect(
      lesson.steps.find((step) => step.id === "disjoint-regions-recall")
        ?.evidence?.codingTaskId,
    ).not.toBe(disjointRangesFamily);
    expect(
      reviewExercises[lesson.conceptIds[0]]?.evidence?.codingTaskId,
    ).not.toBe(disjointRangesFamily);
  });

  it("counts two clean families, excludes assisted work, and keeps old raw events immutable", () => {
    const { lesson, step: oldStep } = lessonStep(
      disjointRangesLessonId,
      "disjoint-regions-gate",
    );
    const { step: newStep } = lessonStep(
      disjointRangesLessonId,
      disjointRangesPrimaryStepId,
    );
    const cleanOld = eventFor(lesson, oldStep, "old-clean", 1_000);
    const cleanNew = eventFor(lesson, newStep, "new-clean", 2_000);
    const twoClean = recordCourseEvidence(
      recordCourseEvidence(createInitialState(), cleanOld),
      cleanNew,
    );
    expect(
      independentCodingTaskIds(
        twoClean,
        lesson.conceptIds[0],
        courseEvidencePolicy,
      ),
    ).toEqual(["unsafe-miri/disjoint-regions-v1", disjointRangesFamily]);

    const assistedOld = eventFor(lesson, oldStep, "old-assisted", 1_000, {
      revealed: true,
    });
    const oldAssisted = recordCourseEvidence(
      recordCourseEvidence(createInitialState(), assistedOld),
      cleanNew,
    );
    expect(
      independentCodingTaskIds(
        oldAssisted,
        lesson.conceptIds[0],
        courseEvidencePolicy,
      ),
    ).toEqual([disjointRangesFamily]);

    const laterHelp = recordCourseEvidence(
      twoClean,
      eventFor(lesson, oldStep, "old-later-help", 3_000, { revealed: true }),
    );
    expect(laterHelp.events[0]).toEqual(cleanOld);
  });

  it("offers the new primary after old-family assistance and handles solution versus starter exposure", () => {
    const criterion = modules
      .find((module) => module.id === "unsafe-miri-contracts")!
      .gateCriteria!.find(
        (gate) => gate.id === "unsafe-miri-disjoint-regions-gate",
      )!;
    const lesson = lessons.find(
      (candidate) => candidate.id === disjointRangesLessonId,
    )!;
    const oldStep = lessonStep(
      disjointRangesLessonId,
      "disjoint-regions-gate",
    ).step;
    const oldHelp = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, oldStep, "old-help", 1_000, { revealed: true }),
    );
    expect(gateRecovery(oldHelp, criterion, lessons)).toEqual({
      status: "available",
      task: {
        lessonId: disjointRangesLessonId,
        stepId: disjointRangesPrimaryStepId,
      },
    });

    const project = projects.find(
      (candidate) => candidate.id === "miri-safety",
    )!.package!;
    expect(project.revealStepRefs).toHaveLength(7);
    const starter = revealCourseProjectPackageVariant(
      createInitialState(),
      project,
      lessons,
      "starter",
      2_000,
    );
    expect(starter.events).toHaveLength(0);
    const oldClean = eventFor(lesson, oldStep, "old-clean-before-help", 2_500);
    const prior = recordCourseEvidence(createInitialState(), oldClean);
    const exposed = revealCourseProjectPackageVariant(
      prior,
      project,
      lessons,
      "solution",
      3_000,
    );
    expect(
      exposed.steps[
        stepKey(disjointRangesLessonId, disjointRangesPrimaryStepId)
      ]?.revealed,
    ).toBe(true);
    expect(
      exposed.events.some(
        (event) =>
          event.stepId === disjointRangesPrimaryStepId && event.revealed,
      ),
    ).toBe(true);
    const { step: newStep } = lessonStep(
      disjointRangesLessonId,
      disjointRangesPrimaryStepId,
    );
    const rawOld = structuredClone(
      exposed.events.find((event) => event.id === oldClean.id),
    );
    const newAfterDownload = recordCourseEvidence(exposed, {
      ...eventFor(lesson, newStep, "new-after-download", 5_000),
      ...assistanceForLessonStep(exposed, lesson, newStep),
    });
    expect(
      newAfterDownload.events.find((event) => event.id === oldClean.id),
    ).toEqual(rawOld);
    expect(
      independentCodingTaskIds(
        newAfterDownload,
        lesson.conceptIds[0],
        courseEvidencePolicy,
      ),
    ).toEqual(["unsafe-miri/disjoint-regions-v1"]);
  });
});

const disjointRangesFamily = "unsafe-miri/disjoint-ranges-v1";
