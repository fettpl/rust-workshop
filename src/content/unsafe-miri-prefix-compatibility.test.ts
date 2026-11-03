import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/unsafe-miri-pre-prefix.json";
import {
  acceptedInitializedPrefixBaseline,
  acceptedPreInitializedPrefixCourseSha256,
  historicalBeforeInitializedPrefix,
  initializedPrefixConceptId,
  initializedPrefixLessonId,
  initializedPrefixStepIds,
} from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./capstone-maintenance-compatibility-fixture";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import type { UserState } from "../domain/types";

const hashText = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const hashJson = (value: unknown) => hashText(JSON.stringify(value));

const oldLesson = () =>
  acceptedInitializedPrefixBaseline.lesson as {
    id: string;
    steps: Array<{ id: string }>;
  };

type SyntheticState = Omit<UserState, "schemaVersion" | "onboarding"> & {
  schemaVersion: 1 | 2 | 3;
  onboarding: UserState["onboarding"] & {
    background?: "java" | "python" | "both";
  };
};
type SyntheticEvidenceEvent = UserState["events"][number];

function syntheticInitializedPrefixState(version: 1 | 2 | 3): SyntheticState {
  const state = createInitialState();
  const lesson = oldLesson();
  const oldStepIds = lesson.steps.map((step) => step.id);
  for (const [index, stepId] of oldStepIds.entries()) {
    state.steps[stepKey(initializedPrefixLessonId, stepId)] = {
      ...createStepProgress(`// preserved old seven ${index}`),
      answer: `old answer ${index}`,
      completed: true,
      hints: index === 1 ? 1 : 0,
      revealed: index === 2,
      attempts: [
        {
          at: 1_700_000_000_000 + index,
          code: `// old attempt ${index}`,
          passed: true,
          feedback: "retained historical feedback",
        },
      ],
    };
  }
  const events: SyntheticEvidenceEvent[] = Array.from(
    { length: 32 },
    (_, index): SyntheticEvidenceEvent => {
      const stepId = oldStepIds[index % oldStepIds.length];
      return {
        id: `pre-prefix-contact-${String(index).padStart(2, "0")}`,
        lessonId: initializedPrefixLessonId,
        stepId,
        conceptIds: ["unsafe-miri-byte-view-contract"],
        evidenceVersion: 2,
        kind: index % 3 === 0 ? "exposure" : "transfer",
        evaluator: index % 3 === 0 ? "exact-output" : "tests",
        passed: true,
        hints: index === 5 ? 1 : 0,
        revealed: index === 7,
        delayed: index > 24,
        at: 1_700_000_000_000 + index,
      };
    },
  );
  state.events = events;
  state.updatedAt = 1_700_000_000_100;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: initializedPrefixLessonId,
    stepIndex: oldStepIds.length - 1,
    panel: "code",
    focus: true,
  };
  state.notes[initializedPrefixLessonId] = "Notatka sprzed initialized prefix.";
  state.bookmarks = [initializedPrefixLessonId];
  state.review = [
    {
      conceptId: "unsafe-miri-byte-view-contract",
      dueAt: 1_700_000_000_200,
      intervalDays: 2,
      attempts: 2,
      reason: "history before prefix",
      lastReviewedAt: 1_700_000_000_000,
    },
  ];
  state.reviewSession = {
    conceptId: "unsafe-miri-byte-view-contract",
    mode: "challenge",
    sessionId: "pre-prefix-review-session",
    startedAt: 1_700_000_000_000,
    wasDue: true,
    exerciseId: "review-unsafe-miri-byte-view",
  };
  state.ratings = [
    {
      conceptId: "unsafe-miri-byte-view-contract",
      rating: "good",
      at: 1_700_000_000_300,
    },
  ];
  if (version === 3) return state as SyntheticState;
  if (version === 2)
    return {
      ...state,
      schemaVersion: 2 as const,
      onboarding: { ...state.onboarding, background: "both" as const },
    };
  const v1 = Object.fromEntries(
    Object.entries(state).filter(
      ([key]) => key !== "schemaVersion" && key !== "routePreference",
    ),
  ) as Omit<UserState, "schemaVersion" | "routePreference">;
  return {
    ...v1,
    schemaVersion: 1 as const,
    onboarding: { ...state.onboarding, background: "both" as const },
  };
}

it("pins the exact pre-prefix projection and accepted narrow metadata", () => {
  const projected = historicalBeforeInitializedPrefix(
    historicalBeforeExistingContractRepair(currentCourse),
  );
  const serializedProjection = Object.fromEntries(
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
    ].map((key) => [key, (projected as Record<string, unknown>)[key]]),
  );
  expect(acceptedPreInitializedPrefixCourseSha256).toBe(
    "f52219fceae0439d565960b6381936bdbdf0d9b377caeab27f21f88678c9039e",
  );
  expect(hashJson(serializedProjection)).toBe(
    acceptedPreInitializedPrefixCourseSha256,
  );
  expect(
    hashText(
      readFileSync(
        new URL("./fixtures/unsafe-miri-pre-prefix.json", import.meta.url),
      ),
    ),
  ).toBe("fe4d61f9a05629d00ca016455f1fd1f1917ff6b05522808fd80e3b46522cda27");
  expect(baseline.wholeCourseSha256).toBe(
    acceptedPreInitializedPrefixCourseSha256,
  );
  expect(
    projected.lessons.find((lesson) => lesson.id === initializedPrefixLessonId),
  ).toEqual(baseline.lesson);
  expect(
    projected.modules.find((module) => module.id === "unsafe-miri-contracts"),
  ).toEqual(baseline.module);
  expect(
    projected.concepts.find(
      (concept) => concept.id === initializedPrefixConceptId,
    ),
  ).toEqual(baseline.concept);
  expect(projected.reviewExercises[initializedPrefixConceptId]).toEqual(
    baseline.review,
  );
  expect(projected.reviewExercisesById[baseline.review.id]).toEqual(
    baseline.review,
  );
  expect(projected.modules).toHaveLength(baseline.inventory.modules);
  expect(projected.lessons).toHaveLength(baseline.inventory.lessons);
  expect(projected.concepts).toHaveLength(baseline.inventory.concepts);
  expect(projected.sources).toHaveLength(baseline.inventory.sources);
  expect(projected.lessons.flatMap((lesson) => lesson.steps)).toHaveLength(
    baseline.inventory.steps,
  );
  expect(projected.lessons.flatMap((lesson) => lesson.steps)).toHaveLength(
    1273,
  );
});

it("removes only the initialized-prefix additions and preserves unrelated mutations", () => {
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id !== initializedPrefixLessonId
        ? lesson
        : {
            ...lesson,
            sourceIds: [...lesson.sourceIds, "mutation-must-survive"],
          },
    ),
  } as typeof currentCourse;
  const projected = historicalBeforeInitializedPrefix(
    historicalBeforeExistingContractRepair(mutated),
  );
  const lesson = projected.lessons.find(
    (item) => item.id === initializedPrefixLessonId,
  )!;
  expect(lesson.sourceIds).toContain("mutation-must-survive");
  expect(
    lesson.steps.some((step) =>
      initializedPrefixStepIds.includes(step.id as never),
    ),
  ).toBe(false);
});

it.each([1, 2, 3] as const)(
  "preserves synthetic pre-prefix V%s state, ordered contact history, and durable collections",
  (version) => {
    const raw = syntheticInitializedPrefixState(version);
    const restored = importState(
      JSON.stringify({
        schemaVersion: version,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-15T12:00:00.000Z",
        state: raw,
      }),
    );
    expect(restored.events).toEqual(raw.events);
    expect(restored.events).toHaveLength(32);
    expect(restored.events.map((event) => event.id)).toEqual(
      raw.events.map((event) => event.id),
    );
    expect(restored.steps).toEqual(raw.steps);
    expect(restored.notes).toEqual(raw.notes);
    expect(restored.bookmarks).toEqual(raw.bookmarks);
    expect(restored.review).toEqual(raw.review);
    expect(restored.reviewSession).toEqual(raw.reviewSession);
    expect(restored.ratings).toEqual(raw.ratings);
    expect(restored.resume).toEqual(raw.resume);
    expect(restored).toEqual(
      expect.objectContaining({
        events: raw.events,
        steps: raw.steps,
        notes: raw.notes,
        bookmarks: raw.bookmarks,
        review: raw.review,
        reviewSession: raw.reviewSession,
        ratings: raw.ratings,
        resume: raw.resume,
      }),
    );
    for (const stepId of initializedPrefixStepIds) {
      expect(
        restored.steps[stepKey(initializedPrefixLessonId, stepId)],
      ).toBeUndefined();
      expect(restored.events.some((event) => event.stepId === stepId)).toBe(
        false,
      );
    }
    const reloaded = importState(exportState(restored));
    expect(reloaded.events).toEqual(restored.events);
    expect(reloaded.steps).toEqual(restored.steps);
    expect(reloaded.notes).toEqual(restored.notes);
    expect(reloaded.review).toEqual(restored.review);
    expect(reloaded.reviewSession).toEqual(restored.reviewSession);
    expect(reloaded.ratings).toEqual(restored.ratings);
    expect(reloaded.bookmarks).toEqual(restored.bookmarks);
    expect(reloaded).toEqual(restored);
    expect(reloaded.resume).toEqual(restored.resume);
  },
);
