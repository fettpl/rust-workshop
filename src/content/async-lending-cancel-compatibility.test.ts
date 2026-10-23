import {
  assertReviewedHistoryRedaction,
  historyRedactionDeltas,
  historyRedactionPath,
} from "./history-redaction-test-support";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import {
  acceptedCancellationCriterion,
  acceptedBaselineInputs,
  acceptedCancellationLesson,
  acceptedSendLesson,
  cancellationTransferLessonId,
  cancellationTransferStepIds,
  historicalBeforeCancellationTransfer,
} from "./async-lending-cancel-compatibility-fixture";
import baseline from "./fixtures/async-cancel-pre-transfer.json";
import savedFixtures from "./fixtures/baseline-correction-saves.json";
import {
  asyncLendingAssessmentFixtures,
  asyncLendingTransferMutants,
} from "./async-lending-assessment-fixtures";
import {
  createInitialState,
  exportState,
  importState,
  stepKey,
  createStepProgress,
} from "../persistence/state";
import { courseEvidenceSummary } from "./learning-context";

const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

// This maintenance successor is deliberately narrow and reversible: the
// historical receipt remains pinned to the pre-maintenance source hash while
// this test accepts only the explicitly reviewed maintenance replacement bytes.
const reviewedMaintenanceDeltas = {
  [historyRedactionPath]: {
    reviewedOn: "2026-10-23",
    ...historyRedactionDeltas[historyRedactionPath],
  },
  "src/content/async-lending-native-test-support.ts": {
    reviewedOn: "2026-10-22",
    previousSha256:
      "aa602cc670e557951af547a3d471363af4c2a6c2863f72f179bffa5ca69f0ebc",
    currentSha256:
      "b1590e6615c7156c4815b162134d04ef88ce4e1723e181bd0ce3965805abdd3e",
  },
} as const;

function cancellationHistoryState(version: 1 | 2 | 3) {
  const initial = createInitialState();
  const oldStepIds = acceptedCancellationLesson.steps.map((step) => step.id);
  for (const [index, stepId] of oldStepIds.entries()) {
    initial.steps[stepKey(cancellationTransferLessonId, stepId)] = {
      ...createStepProgress(index === 0 ? "// old draft" : undefined),
      answer: index === 1 ? "old answer" : "",
      completed: true,
      hints: index === 2 ? 1 : 0,
      attempts:
        index === 0
          ? [
              {
                at: 1_700_000_000_000,
                code: "// first attempt",
                passed: false,
                feedback: "retained feedback",
              },
            ]
          : [],
    };
    initial.events.push({
      id: `cancel-old-${index}`,
      lessonId: cancellationTransferLessonId,
      stepId,
      conceptIds: ["async-lending-cancel-commit"],
      evidenceVersion: 2,
      kind: index === 0 ? "exposure" : "transfer",
      evaluator: index === 0 ? "answer" : "tests",
      passed: true,
      hints: index === 2 ? 1 : 0,
      revealed: false,
      at: 1_700_000_000_000 + index,
    });
  }
  initial.updatedAt = 1_700_000_000_100;
  initial.resume = {
    ...initial.resume,
    view: "lesson",
    lessonId: cancellationTransferLessonId,
    stepIndex: 4,
    panel: "code",
    focus: true,
  };
  initial.notes[cancellationTransferLessonId] = "old cancellation note";
  initial.bookmarks = [cancellationTransferLessonId];
  initial.review = [
    {
      conceptId: "async-lending-cancel-commit",
      dueAt: 1_700_000_000_200,
      intervalDays: 2,
      attempts: 1,
      reason: "old queue",
    },
  ];
  initial.reviewSession = {
    conceptId: "async-lending-cancel-commit",
    mode: "challenge",
    sessionId: "old-cancel-session",
    startedAt: 1_700_000_000_000,
    wasDue: true,
    exerciseId: currentCourse.reviewExercises["async-lending-cancel-commit"].id,
  };
  initial.ratings = [
    {
      conceptId: "async-lending-cancel-commit",
      rating: "good",
      at: 1_700_000_000_300,
    },
  ];
  if (version === 3) return initial;
  if (version === 2) {
    return {
      ...initial,
      schemaVersion: 2 as const,
      onboarding: { ...initial.onboarding, background: "both" as const },
    };
  }
  const v1 = Object.fromEntries(
    Object.entries(initial).filter(
      ([key]) => key !== "schemaVersion" && key !== "routePreference",
    ),
  ) as Omit<typeof initial, "schemaVersion" | "routePreference">;
  return {
    ...v1,
    schemaVersion: 1 as const,
    onboarding: { ...initial.onboarding, background: "both" as const },
  };
}

it("binds the immutable accepted A1 cancellation and Send snapshots", () => {
  expect(baseline.provenance.acceptedBase).toBe(
    "f975409feb0f1972089c2b368dc994417ca958d0",
  );
  expect(baseline.provenance.tree).toBe(
    "fad6f04d491b8e83a125327c7ba17a3818ca8a6c",
  );
  expect(acceptedBaselineInputs).toEqual({
    acceptedPreA2CourseSha256:
      "07f4b4bd0e6a825ac04483e525a757e884d40d3b6ef66ba54ff2daf4183c7c02",
    acceptedSourceFilesSha256:
      "57f1a345a8531675613880754db863a3c2317fe066be82af95e330c929f5ffb7",
    captureResultSha256:
      "aea8f68139d3dfbf1012d7d394030c93f14c9dd88583c687ff09243b26b54051",
  });
  expect(acceptedCancellationLesson.steps).toHaveLength(5);
  expect(acceptedSendLesson.steps).toHaveLength(7);
  expect(acceptedCancellationCriterion.taskRefs).toEqual([
    {
      lessonId: cancellationTransferLessonId,
      stepId: "async-lending-cancel-commit-gate",
    },
    {
      lessonId: cancellationTransferLessonId,
      stepId: "async-lending-cancel-commit-blank",
    },
  ]);
});

it("appends exactly the declared A2 cancellation steps with the frozen metadata", () => {
  const lesson = currentCourse.lessons.find(
    (candidate) => candidate.id === cancellationTransferLessonId,
  )!;
  expect(lesson.steps.slice(0, 5)).toEqual(acceptedCancellationLesson.steps);
  expect(lesson.steps.slice(5).map((step) => step.id)).toEqual(
    cancellationTransferStepIds,
  );
  const [model, transfer] = lesson.steps.slice(5);
  expect(model).toMatchObject({
    id: cancellationTransferStepIds[0],
    kind: "predict",
    evidenceKind: "exposure",
    evidence: { version: 2, conceptIds: ["async-lending-cancel-commit"] },
  });
  expect(model.evidenceGate).toBeFalsy();
  expect(transfer).toMatchObject({
    id: cancellationTransferStepIds[1],
    kind: "apply",
    evidenceKind: "transfer",
    evidenceGate: true,
    evidence: {
      version: 2,
      conceptIds: ["async-lending-cancel-commit"],
      codingTaskId: "async-lending/cancel-lost-reply-v1",
    },
  });
  expect(transfer.evaluator?.kind).toBe("tests");
});

it("keeps the A2 model supplementary without primary credit", () => {
  const model = currentCourse.lessons
    .find((lesson) => lesson.id === cancellationTransferLessonId)!
    .steps.find((step) => step.id === cancellationTransferStepIds[0])!;
  const state = createInitialState();
  state.events = [
    {
      id: "a2-model-exposure",
      lessonId: cancellationTransferLessonId,
      stepId: model.id,
      conceptIds: ["async-lending-cancel-commit"],
      evidenceVersion: 2,
      kind: model.evidenceKind,
      evaluator: model.evaluator?.kind,
      passed: true,
      hints: 0,
      revealed: false,
      at: 1_700_000_000_000,
    },
  ];
  expect(
    courseEvidenceSummary(state, "async-lending-cancel-commit")
      .qualifyingCodingTasks,
  ).toBe(0);
  expect(model.evidence).not.toHaveProperty("codingTaskId");
});

it("matches accepted identities and reviewed maintenance successors", () => {
  const previous = historicalBeforeCancellationTransfer(
    historicalBeforeInitializedPrefix(currentCourse),
  );
  for (const [name, expected] of Object.entries(baseline.registryHashes)) {
    const registry = previous[name as keyof typeof previous];
    const actual = Array.isArray(registry)
      ? registry.map((value, index) => ({
          id: (value as { id?: string }).id ?? null,
          ...("index" in (expected[index] as object) ? { index } : {}),
          sha256: sha(value),
        }))
      : Object.entries(registry).map(([id, value]) => ({
          id,
          sha256: sha(value),
        }));
    expect(actual, name).toEqual(expected);
  }
  const hashText = (text: string) =>
    createHash("sha256").update(text).digest("hex");
  const oldFixtures = new Set(
    baseline.oldAsyncFixtures.map((fixture) => fixture.id),
  );
  expect(
    asyncLendingAssessmentFixtures
      .filter((fixture) => oldFixtures.has(fixture.id))
      .map((fixture) => ({
        id: fixture.id,
        equivalentSha256: hashText(fixture.equivalent),
        mutantSha256: hashText(fixture.mutant),
        additionalMutantSha256: (fixture.mutants ?? []).map(hashText),
      })),
  ).toEqual(
    baseline.oldAsyncFixtures.map((fixture) => ({
      id: fixture.id,
      equivalentSha256: hashText(fixture.equivalent),
      mutantSha256: hashText(fixture.mutant),
      additionalMutantSha256: (fixture.mutants ?? []).map(hashText),
    })),
  );
  expect(
    Object.fromEntries(
      Object.keys(baseline.oldAsyncMutants).map((stepId) => [
        stepId,
        (asyncLendingTransferMutants[stepId] ?? []).map((mutant) => ({
          id: mutant.id,
          testName: mutant.testName,
          source: mutant.source,
        })),
      ]),
    ),
  ).toEqual(baseline.oldAsyncMutants);
  const immutablePaths = new Set(
    baseline.immutableFiles.map((file) => file.path),
  );
  assertReviewedHistoryRedaction(
    baseline.immutableFiles,
    readFileSync(new URL(`../../${historyRedactionPath}`, import.meta.url)),
  );
  expect(Object.keys(reviewedMaintenanceDeltas)).toEqual([
    historyRedactionPath,
    "src/content/async-lending-native-test-support.ts",
  ]);
  for (const [path, delta] of Object.entries(reviewedMaintenanceDeltas)) {
    expect(immutablePaths.has(path), path).toBe(true);
    expect(
      baseline.immutableFiles
        .filter((file) => file.path === path)
        .map((file) => file.sha256),
      `${path} historical receipt (${delta.reviewedOn})`,
    ).toEqual([delta.previousSha256]);
  }
  for (const file of baseline.immutableFiles) {
    const actual = createHash("sha256")
      .update(readFileSync(new URL(`../../${file.path}`, import.meta.url)))
      .digest("hex");
    const delta =
      reviewedMaintenanceDeltas[
        file.path as keyof typeof reviewedMaintenanceDeltas
      ];
    expect(actual, file.path).toBe(delta?.currentSha256 ?? file.sha256);
  }
});

it("cannot mask unrelated old lesson or criterion metadata", () => {
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((item) =>
      item.id === cancellationTransferLessonId
        ? { ...item, sourceIds: [...item.sourceIds, "mutation-must-survive"] }
        : item,
    ),
    modules: currentCourse.modules.map((item) =>
      item.id !== "async-lending-contracts"
        ? item
        : {
            ...item,
            gateCriteria: item.gateCriteria!.map((candidate) =>
              candidate.id !== acceptedCancellationCriterion.id
                ? candidate
                : {
                    ...candidate,
                    taskRefs: [
                      ...candidate.taskRefs,
                      {
                        lessonId: "historical-unrelated",
                        stepId: "historical-ref",
                      },
                    ],
                  },
            ),
          },
    ),
  } as typeof currentCourse;
  const projected = historicalBeforeCancellationTransfer(
    historicalBeforeInitializedPrefix(mutated),
  );
  expect(
    projected.lessons.find((item) => item.id === cancellationTransferLessonId)!
      .sourceIds,
  ).toContain("mutation-must-survive");
  expect(
    projected.modules
      .find((item) => item.id === "async-lending-contracts")!
      .gateCriteria!.find(
        (item) => item.id === acceptedCancellationCriterion.id,
      )!.taskRefs,
  ).toContainEqual({
    lessonId: "historical-unrelated",
    stepId: "historical-ref",
  });
});

it("projects pre-A2 history by removing only the two declared steps and criterion ref", () => {
  const previous = historicalBeforeCancellationTransfer(
    historicalBeforeInitializedPrefix(currentCourse),
  );
  const lesson = previous.lessons.find(
    (candidate) => candidate.id === cancellationTransferLessonId,
  )!;
  expect(lesson.steps).toEqual(acceptedCancellationLesson.steps);
  expect(
    previous.lessons.find(
      (candidate) => candidate.id === "async-lending-send-boundary",
    )?.steps,
  ).toEqual(acceptedSendLesson.steps);
  const contractModule = previous.modules.find(
    (candidate) => candidate.id === "async-lending-contracts",
  )!;
  expect(contractModule.exitGate[0]).toBe(baseline.module.exitGate[0]);
  expect(
    contractModule.gateCriteria?.find(
      (criterion) => criterion.id === acceptedCancellationCriterion.id,
    ),
  ).toEqual(acceptedCancellationCriterion);
  expect(previous.lessons.flatMap((item) => item.steps)).toHaveLength(1271);
  expect(
    previous.lessons
      .find((candidate) => candidate.id === cancellationTransferLessonId)!
      .steps.some((step) =>
        cancellationTransferStepIds.includes(step.id as never),
      ),
  ).toBe(false);
});

it("keeps accepted saved locations and raw history free of fabricated A2 progress", () => {
  for (const fixture of savedFixtures.fixtures) {
    const raw = fixture.state;
    const restored = importState(
      JSON.stringify({
        schemaVersion: raw.schemaVersion,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-15T12:00:00.000Z",
        state: raw,
      }),
    );
    expect(restored.events).toEqual(raw.events);
    expect(restored.steps).toEqual(raw.steps);
    expect(restored.notes).toEqual(raw.notes);
    expect(restored.bookmarks).toEqual(raw.bookmarks);
    expect(restored.review).toEqual(raw.review);
    expect(restored.ratings).toEqual(raw.ratings ?? []);
    expect(restored.reviewSession).toEqual(raw.reviewSession);
    expect(restored.resume).toEqual({
      ...createInitialState().resume,
      ...raw.resume,
    });
    for (const stepId of cancellationTransferStepIds) {
      expect(
        restored.steps[`${cancellationTransferLessonId}:${stepId}`],
      ).toBeUndefined();
      expect(
        restored.events.some(
          (event) =>
            event.lessonId === cancellationTransferLessonId &&
            event.stepId === stepId,
        ),
      ).toBe(false);
    }
    expect(importState(exportState(restored))).toEqual(restored);
    expect(
      courseEvidenceSummary(restored, "async-lending-cancel-commit")
        .qualifyingCodingTasks,
    ).toBe(0);
  }
});

it.each([1, 2, 3] as const)(
  "preserves cancellation history and normalizes defaults for schema v%s",
  (version) => {
    const raw = cancellationHistoryState(version);
    const restored = importState(
      JSON.stringify({
        schemaVersion: version,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-15T12:00:00.000Z",
        state: raw,
      }),
    );
    const oldStepIds = acceptedCancellationLesson.steps.map((step) => step.id);
    const expectedResume = {
      ...createInitialState().resume,
      view: "lesson",
      lessonId: cancellationTransferLessonId,
      stepIndex: 4,
      panel: "code",
      focus: true,
    };
    expect(restored.resume).toEqual(expectedResume);
    expect(restored.steps).toEqual(raw.steps);
    expect(restored.events).toEqual(raw.events);
    for (const stepId of oldStepIds) {
      expect(
        restored.steps[stepKey(cancellationTransferLessonId, stepId)],
      ).toEqual(raw.steps[stepKey(cancellationTransferLessonId, stepId)]);
    }
    expect(restored.notes).toEqual({
      [cancellationTransferLessonId]: "old cancellation note",
    });
    expect(restored.bookmarks).toEqual([cancellationTransferLessonId]);
    expect(restored.review).toEqual(raw.review);
    expect(restored.reviewSession).toEqual(raw.reviewSession);
    expect(restored.ratings).toEqual(raw.ratings);
    expect(restored.routePreference).toBe("core");
    expect(restored.onboarding).toEqual({
      completed: false,
      name: "",
      minutes: 15,
    });
    expect(restored.settings).toEqual({
      theme: "light",
      editorFontSize: 16,
      accessibleEditor: false,
    });
    expect(importState(exportState(restored))).toEqual(restored);
    for (const stepId of cancellationTransferStepIds) {
      expect(
        restored.steps[stepKey(cancellationTransferLessonId, stepId)],
      ).toBeUndefined();
      expect(restored.events.some((event) => event.stepId === stepId)).toBe(
        false,
      );
    }
  },
);

it("derives the post-A2 registry inventory without changing the accepted source count", () => {
  expect(currentCourse.modules).toHaveLength(48);
  expect(currentCourse.lessons).toHaveLength(192);
  expect(currentCourse.concepts).toHaveLength(194);
  expect(currentCourse.sources).toHaveLength(349);
  expect(currentCourse.lessons.flatMap((lesson) => lesson.steps)).toHaveLength(
    1277,
  );
  expect(Object.keys(currentCourse.reviewExercises)).toHaveLength(194);
  expect(
    currentCourse.lessons
      .flatMap((lesson) => lesson.steps)
      .filter((step) => cancellationTransferStepIds.includes(step.id as never)),
  ).toHaveLength(2);
  expect(sha(acceptedSendLesson.steps)).toBe(
    sha(
      currentCourse.lessons.find(
        (lesson) => lesson.id === "async-lending-send-boundary",
      )!.steps,
    ),
  );
});
