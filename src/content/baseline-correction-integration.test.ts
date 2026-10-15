import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import { historicalBeforeFallibleComposition } from "./fallible-composition-compatibility-fixture";
const course = historicalBeforeFallibleComposition(
  historicalBeforeDocumentationRepair(
    historicalBeforeSendHandoff(
      historicalBeforeCancellationTransfer(currentCourse),
    ),
  ),
);
import baseline from "./baseline-correction-legacy.json";
import delta from "./baseline-correction-delta.json";
import saves from "./fixtures/baseline-correction-saves.json";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import {
  courseEvidencePolicy,
  courseEvidenceSummary,
} from "./learning-context";
import { independentCodingTaskIds } from "../engine/learning";
import type { EvidenceEvent } from "../domain/types";

it("preserves the immutable pre-correction registry and every old saved index", () => {
  expect(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("./baseline-correction-legacy.json", import.meta.url),
        ),
      )
      .digest("hex"),
  ).toBe("f44dea3bddecea8e60e4adbb3ae97c5f93ee02bf7ab8c6e8ee555fb207fa9052");
  expect(course.modules.map((item) => item.id)).toEqual(baseline.moduleIds);
  expect(course.concepts.map((item) => item.id)).toEqual(baseline.conceptIds);
  expect(
    course.sources
      .filter((item) => !delta.addedSourceIds.includes(item.id))
      .map((item) => item.id),
  ).toEqual(baseline.sourceIds);
  expect(
    course.sources
      .filter((item) => delta.addedSourceIds.includes(item.id))
      .map((item) => item.id),
  ).toEqual(delta.addedSourceIds);
  expect(course.lessons.map((item) => item.id)).toEqual(
    baseline.lessons.map((item) => item.id),
  );
  for (const old of baseline.lessons) {
    const current = course.lessons.find((item) => item.id === old.id)!;
    expect(current.moduleId).toBe(old.moduleId);
    expect(
      current.steps.slice(0, old.stepIds.length).map((item) => item.id),
      old.id,
    ).toEqual(old.stepIds);
    expect(
      current.steps.slice(old.stepIds.length).map((item) => item.id),
      old.id,
    ).toEqual(
      delta.appendedSteps[old.id as keyof typeof delta.appendedSteps] ?? [],
    );
  }
  for (const old of baseline.modules)
    expect(
      course.modules.find((item) => item.id === old.id)?.lessonIds,
    ).toEqual(old.lessonIds);
  expect(course.lessons.flatMap((item) => item.steps)).toHaveLength(1242);
});

it("keeps historical answer evidence raw without converting it into new execution success", () => {
  const state = createInitialState();
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: "memory-intro",
    stepIndex: 1,
    panel: "output",
  };
  state.events = [
    {
      id: "historical-answer",
      lessonId: "memory-intro",
      stepId: "memory-run",
      conceptIds: ["stack-heap"],
      evidenceVersion: 2,
      kind: "prediction",
      evaluator: "answer",
      passed: true,
      hints: 2,
      revealed: true,
      at: 1234,
    },
  ];
  const imported = importState(exportState(state));
  expect(imported.events).toEqual(state.events);
  expect(imported.resume).toEqual(state.resume);
  expect(
    courseEvidencePolicy.definitionForEvent(imported.events[0]),
  ).toBeUndefined();
  expect(
    courseEvidenceSummary(imported, "stack-heap").qualifyingCodingTasks,
  ).toBe(0);
  expect(imported.events).toHaveLength(1);
  expect(imported.steps).toEqual(state.steps);
});

it("derives four ownership and six advanced provisional concepts through the current selector", () => {
  // Synthetic clean author events measure available definitions, never saved learner passes.
  const state = createInitialState();
  state.events = course.lessons.flatMap((lesson) =>
    lesson.steps
      .filter((step) => step.evidence)
      .map((step, index): EvidenceEvent => ({
        id: `${lesson.id}/${step.id}`,
        lessonId: lesson.id,
        stepId: step.id,
        conceptIds: [...step.evidence!.conceptIds],
        evidenceVersion: step.evidence!.version,
        kind: step.evidenceKind,
        evaluator: step.evaluator?.kind,
        passed: true,
        hints: 0,
        revealed: false,
        at: index + 1,
      })),
  );
  const provisional = course.concepts
    .filter(
      (concept) =>
        concept.evidenceCalibration &&
        independentCodingTaskIds(state, concept.id, courseEvidencePolicy)
          .length < concept.evidenceCalibration.minimumCodingTasks,
    )
    .map((concept) => concept.id);
  expect(provisional).toEqual([
    "stack-heap",
    "scope-drop",
    "copy-semantics",
    "ownership-repair",
    "async-lending-cancel-commit",
    "async-lending-send-boundary",
    "unsafe-miri-byte-view-contract",
    "unsafe-miri-disjoint-regions-contract",
    "unsafe-miri-slot-state-contract",
    "unsafe-miri-mut-slot-variance-contract",
  ]);
  expect(
    independentCodingTaskIds(state, "move-semantics", courseEvidencePolicy),
  ).toEqual(["ownership/owned-uppercase", "ownership/read-length"]);
  expect(createInitialState().events).toEqual([]);
});

it("imports representative V1/V2/V3 saves without erasing historical data or passing new work", () => {
  expect(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("./fixtures/baseline-correction-saves.json", import.meta.url),
        ),
      )
      .digest("hex"),
  ).toBe("89c666e72f395a07f97b1afb648c84d4c53b882da044a6ce681e807d0ac4a60d");
  for (const fixture of saves.fixtures) {
    const raw = fixture.state;
    const before = structuredClone(raw);
    const imported = importState(
      JSON.stringify({
        schemaVersion: raw.schemaVersion,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-09T10:00:00.000Z",
        state: raw,
      }),
    );
    expect(raw).toEqual(before);
    expect(imported.schemaVersion).toBe(3);
    expect(imported.updatedAt).toBe(raw.updatedAt);
    expect(imported.events, fixture.name).toEqual(raw.events);
    expect(imported.steps, fixture.name).toEqual(raw.steps);
    expect(imported.mastery).toEqual(raw.mastery);
    expect(imported.notes).toEqual(raw.notes);
    expect(imported.bookmarks).toEqual(raw.bookmarks);
    expect(imported.review).toEqual(raw.review);
    expect(imported.ratings).toEqual(raw.ratings ?? []);
    expect(imported.reviewSession).toEqual(raw.reviewSession);
    expect(imported.resume).toEqual({
      ...createInitialState().resume,
      ...raw.resume,
    });
    expect(imported.settings).toEqual({
      ...createInitialState().settings,
      ...raw.settings,
    });
    expect(imported.onboarding).toEqual({
      completed: raw.onboarding.completed,
      name: raw.onboarding.name,
      minutes: raw.onboarding.minutes,
    });
    const oldLesson = baseline.lessons.find(
      (lesson) => lesson.id === raw.resume.lessonId,
    )!;
    const currentLesson = course.lessons.find(
      (lesson) => lesson.id === raw.resume.lessonId,
    )!;
    expect(currentLesson.steps[imported.resume.stepIndex].id).toBe(
      oldLesson.stepIds[raw.resume.stepIndex],
    );
    for (const [lessonId, stepIds] of Object.entries(delta.appendedSteps)) {
      for (const stepId of stepIds) {
        expect(imported.steps[`${lessonId}:${stepId}`]).toBeUndefined();
        expect(
          imported.events.some(
            (event) => event.lessonId === lessonId && event.stepId === stepId,
          ),
        ).toBe(false);
      }
    }
    expect(
      courseEvidenceSummary(imported, "move-semantics").qualifyingCodingTasks,
    ).toBe(0);
    expect(
      courseEvidenceSummary(imported, "stack-heap").qualifyingCodingTasks,
    ).toBe(0);
    expect(importState(exportState(imported))).toEqual(imported);
  }
});
