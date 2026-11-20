import { expect, it } from "vitest";
import type { EvidenceEvent } from "../domain/types";
import { DAY } from "../engine/learning";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import { lessons, reviewExercises, shortReviewExercises } from "./course";
import {
  courseEvidencePolicy,
  courseEvidenceSummary,
  courseMastery,
  courseDelayedReviewEligibility,
  recordCourseEvidence,
} from "./learning-context";

const converted = ["stack-heap", "scope-drop", "function-ownership"] as const;
function historical(
  conceptId: string,
  changes: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  return {
    id: `historical-${conceptId}`,
    conceptIds: [conceptId],
    lessonId: "review",
    stepId: `${conceptId}:old-session`,
    kind: "recall",
    evaluator: "answer",
    evidenceVersion: 2,
    passed: true,
    hints: 0,
    revealed: false,
    at: 1000,
    delayed: false,
    gate: false,
    ...changes,
  };
}

it.each(converted)(
  "restores valid historical %s answer recalls as contact without rewriting them",
  (conceptId) => {
    const step = reviewExercises[conceptId];
    for (const prefix of [conceptId, step.id]) {
      for (const delayed of [false, true, undefined]) {
        const event = historical(conceptId, {
          stepId: `${prefix}:old-session`,
          delayed,
        });
        const saved = createInitialState();
        saved.events = [event];
        const restored = importState(exportState(saved));
        const before = structuredClone(restored);
        expect(courseEvidencePolicy.definitionForEvent(event)).toBe(
          step.evidence,
        );
        expect(courseMastery(restored, conceptId).level).toBe("exposed");
        expect(
          courseEvidenceSummary(restored, conceptId).qualifyingCodingTasks,
        ).toBe(0);
        expect(
          courseDelayedReviewEligibility(restored, conceptId, 3 * DAY),
        ).toBe(false);
        expect(restored).toEqual(before);
        expect(restored.events).toEqual([event]);
      }
    }
  },
);

it.each([
  { evaluator: "tests" },
  { evaluator: "choice" },
  { evaluator: "rubric" },
  { evaluator: undefined },
  { kind: "assessment" },
  { kind: "transfer" },
  { kind: "self-rating" },
  { kind: "exposure" },
  { evidenceVersion: 1 },
  { evidenceVersion: 3 },
  { evidenceVersion: undefined },
  { conceptIds: [] },
  { conceptIds: ["stack-heap", "scope-drop"] },
  { conceptIds: ["stack-heap", "stack-heap"] },
  { conceptIds: ["scope-drop"] },
  { lessonId: "memory-intro" },
  { stepId: "missing:old-session" },
  { stepId: "review-scope-drop:old-session" },
  { stepId: "stack-heap:" },
  { gate: true },
] satisfies Partial<EvidenceEvent>[])(
  "rejects forged historical attribution %j",
  (changes) => {
    const event = historical("stack-heap", changes);
    expect(courseEvidencePolicy.definitionForEvent(event)).toBeUndefined();
    const recorded = recordCourseEvidence(createInitialState(), event);
    expect(recorded.events).toEqual([event]);
    expect(
      courseEvidenceSummary(recorded, "stack-heap").qualifyingCodingTasks,
    ).toBe(0);
  },
);

it.each(converted)(
  "keeps current %s rubric events as self-rating without coding or retention",
  (conceptId) => {
    const step = reviewExercises[conceptId];
    const event = historical(conceptId, {
      stepId: `${step.id}:current-session`,
      kind: "self-rating",
      evaluator: "rubric",
      delayed: true,
    });
    expect(courseEvidencePolicy.definitionForEvent(event)).toBe(step.evidence);
    const recorded = recordCourseEvidence(createInitialState(), event);
    expect(recorded.events).toEqual([event]);
    expect(
      courseEvidenceSummary(recorded, conceptId).qualifyingCodingTasks,
    ).toBe(0);
    expect(courseMastery(recorded, conceptId).level).toBe("new");
    expect(recorded.review).toEqual([]);
  },
);

it("leaves unaffected literal reviews and marked practice probes under their current rules", () => {
  const literal = historical("copy-semantics");
  expect(courseEvidencePolicy.definitionForEvent(literal)).toBe(
    reviewExercises["copy-semantics"].evidence,
  );
  const unrelated = historical("struct-records");
  expect(courseEvidencePolicy.definitionForEvent(unrelated)).toBeUndefined();
  const probe = shortReviewExercises["io-format-roundtrip"];
  const original = historical("io-format-roundtrip", {
    stepId: `${probe.id}:probe-session`,
    evaluator: probe.evaluator!.kind,
    kind: "exposure",
    delayed: false,
    evidenceVersion: probe.evidence!.version,
  });
  expect(courseEvidencePolicy.definitionForEvent(original)).toBe(
    probe.evidence,
  );
  expect(
    courseEvidencePolicy.definitionForEvent({ ...original, kind: "recall" }),
  ).toBeUndefined();
  expect(
    courseEvidencePolicy.definitionForEvent({ ...original, delayed: true }),
  ).toBeUndefined();
  expect(
    courseEvidencePolicy.definitionForEvent({
      ...original,
      evaluator: "answer",
      kind: "recall",
    }),
  ).toBeUndefined();
});

it.each([
  [
    "scope-drop",
    ["ownership-foundation-transfer", "scope-nested-drop-transfer"],
    ["ownership-foundation-transfer", "scope-conditional-drop-transfer"],
  ],
  [
    "function-ownership",
    ["scenario-assessment", "assessment-repair"],
    ["function-ownership-calibration", "function-is-empty-text"],
  ],
] as const)(
  "%s answer history and rubric self-ratings cannot promote practiced coding to retention",
  (conceptId, first, second) => {
    const base = createInitialState();
    for (const [index, [lessonId, stepId]] of [first, second].entries()) {
      const step = lessons
        .find((lesson) => lesson.id === lessonId)!
        .steps.find((item) => item.id === stepId)!;
      base.events.push({
        ...historical(conceptId),
        id: `primary-${index}`,
        lessonId,
        stepId,
        kind: step.evidenceKind,
        evaluator: step.evaluator!.kind,
        conceptIds: [...step.evidence!.conceptIds],
        evidenceVersion: step.evidence!.version,
        at: 1000 + index,
      });
    }
    expect(courseMastery(base, conceptId).level).toBe("understood");
    for (const changes of [
      {},
      { kind: "self-rating", evaluator: "rubric" },
    ] satisfies Partial<EvidenceEvent>[]) {
      const event = historical(conceptId, {
        ...changes,
        at: 3 * DAY,
        delayed: true,
      });
      const next = recordCourseEvidence(base, event);
      expect(courseMastery(next, conceptId).level).toBe("understood");
      expect(courseEvidenceSummary(next, conceptId).qualifyingCodingTasks).toBe(
        2,
      );
      expect(next.events).toEqual([...base.events, event]);
    }
  },
);
