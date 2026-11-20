import { describe, expect, it } from "vitest";
import { lessons, reviewExercises } from "@/content/course";
import {
  courseCompetencyProgress,
  courseMastery,
  evidenceForLessonStep,
} from "@/content/learning-context";
import type { EvidenceEvent } from "@/domain/types";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import { DAY, deriveConceptMastery } from "./learning";

function review(conceptId: string, stepId: string, at: number): EvidenceEvent {
  return {
    id: `recall:${stepId}`,
    lessonId: "review",
    stepId,
    conceptIds: [conceptId],
    kind: "recall",
    evaluator: reviewExercises[conceptId].evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    at,
  };
}

describe("ordinary dashboard task identity", () => {
  it("counts repeated legacy and stable review identifiers as one registered exercise", () => {
    const state = createInitialState();
    const id = "program-entry";
    state.events = [
      review(id, `${id}:old-session`, 100),
      review(id, `${reviewExercises[id].id}:current-session`, 200),
      review(id, `${id}:third-session`, 300),
    ];
    const before = structuredClone(state);
    expect(
      courseCompetencyProgress(state, "syntax-expressions").independentTasks,
    ).toBe(1);
    expect(state).toEqual(before);
    state.events.push(
      review(
        "functions-expressions",
        `${reviewExercises["functions-expressions"].id}:different-exercise`,
        400,
      ),
    );
    expect(courseCompetencyProgress(state, "syntax-expressions")).toMatchObject(
      { independentTasks: 2, lessonCount: 0 },
    );
  });
});

describe("ordinary cached mastery provenance", () => {
  it.each([false, true])(
    "preserves historical cache without reporting current proof (rating=%s)",
    (hasRating) => {
      const state = createInitialState();
      state.mastery["vec-borrowing"] = {
        level: "retained",
        reason: "historical imported level",
        updatedAt: 100,
      };
      if (hasRating)
        state.ratings = [
          { conceptId: "vec-borrowing", rating: "easy", at: 200 },
        ];
      const restored = importState(exportState(state));
      const before = structuredClone(restored);
      expect(courseMastery(restored, "vec-borrowing")).toMatchObject({
        level: "new",
        reason: expect.stringMatching(/histori/i),
      });
      expect(courseMastery(restored, "vec-borrowing").reason).not.toMatch(
        /nieudan/i,
      );
      expect(courseCompetencyProgress(restored, "vec-borrowing")).toMatchObject(
        { level: "new", proven: 0, independentTasks: 0 },
      );
      expect(restored).toEqual(before);
      expect(importState(exportState(restored)).mastery).toEqual(state.mastery);
      // Generic engine consumers lacking the course catalog keep their legacy fallback.
      expect(deriveConceptMastery(restored, "vec-borrowing").level).toBe(
        "retained",
      );
    },
  );

  it("retains real prior demonstrated credit after later failure or assistance", () => {
    const state = createInitialState();
    const lesson = lessons.find((entry) => entry.id === "vec-and-borrowing")!;
    state.events = ["vec-last-gate", "vec-transfer"].map((stepId, index) => {
      const step = lesson.steps.find((entry) => entry.id === stepId)!;
      return {
        id: stepId,
        lessonId: lesson.id,
        stepId,
        ...evidenceForLessonStep(lesson, step),
        kind: step.evidenceKind,
        evaluator: step.evaluator?.kind,
        passed: true,
        hints: 0,
        revealed: false,
        at: 100 + index * 100,
      };
    });
    state.events.push({
      ...review(
        "vec-borrowing",
        "vec-borrowing:retained-session",
        200 + DAY + 1,
      ),
      delayed: true,
    });
    const prior = courseMastery(state, "vec-borrowing");
    expect(prior.level).toBe("retained");
    state.events.push({
      ...state.events[0],
      id: "later-helped-failure",
      at: 200 + DAY + 2,
      hints: 1,
      passed: false,
    });
    expect(courseMastery(state, "vec-borrowing").level).toBe("retained");
    expect(courseCompetencyProgress(state, "vec-borrowing").proven).toBe(1);
  });
});

it("rejects ordinary lesson claims for another concept across mastery, tasks and scheduling", async () => {
  const { courseEvidencePolicy, recordCourseEvidence } =
    await import("@/content/learning-context");
  const { independentCodingTaskIds } = await import("./learning");
  const lesson = lessons.find((entry) => entry.id === "vec-and-borrowing")!;
  const claims: EvidenceEvent[] = ["vec-repair", "vec-last-gate"].map(
    (stepId, index) => {
      const step = lesson.steps.find((entry) => entry.id === stepId)!;
      return {
        id: stepId,
        lessonId: lesson.id,
        stepId,
        conceptIds: ["while-progress"],
        kind: step.evidenceKind,
        evaluator: step.evaluator?.kind,
        passed: true,
        hints: 0,
        revealed: false,
        at: 100 + index,
      };
    },
  );
  const imported = importState(
    exportState({ ...createInitialState(), events: claims }),
  );
  const before = structuredClone(imported);
  expect(courseMastery(imported, "while-progress").level).toBe("new");
  expect(courseCompetencyProgress(imported, "while-progress")).toMatchObject({
    proven: 0,
    independentTasks: 0,
  });
  expect(
    independentCodingTaskIds(imported, "while-progress", courseEvidencePolicy),
  ).toEqual([]);
  expect(imported).toEqual(before);
  const recorded = claims.reduce(
    (state, event) => recordCourseEvidence(state, event),
    createInitialState(),
  );
  expect(recorded.review).toEqual([]);
  expect(recorded.events).toEqual(claims);
});

it.each([
  "vec-borrowing:legacy",
  "review-vec-borrowing:stable",
  "unknown-exercise:session",
])(
  "rejects unrelated or unknown ordinary review attribution %s",
  async (stepId) => {
    const { recordCourseEvidence } = await import("@/content/learning-context");
    const claim = {
      ...review("while-progress", stepId, 100),
      evaluator: "tests" as const,
      gate: false,
    };
    const state = recordCourseEvidence(createInitialState(), claim);
    expect(courseMastery(state, "while-progress").level).toBe("new");
    expect(courseCompetencyProgress(state, "while-progress")).toMatchObject({
      proven: 0,
      independentTasks: 0,
    });
    expect(state.review).toEqual([]);
    expect(state.events).toEqual([claim]);
  },
);

it("preserves genuine unversioned registered lesson and review evidence", async () => {
  const { recordCourseEvidence } = await import("@/content/learning-context");
  const lesson = lessons.find((entry) => entry.id === "vec-and-borrowing")!;
  const step = lesson.steps.find((entry) => entry.id === "vec-last-gate")!;
  const claim: EvidenceEvent = {
    id: "genuine",
    lessonId: lesson.id,
    stepId: step.id,
    conceptIds: [...lesson.conceptIds],
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    at: 100,
  };
  const initial = recordCourseEvidence(createInitialState(), claim);
  const state = recordCourseEvidence(
    initial,
    review("vec-borrowing", "vec-borrowing:legacy-real", 200),
  );
  expect(courseMastery(state, "vec-borrowing").level).toBe("practiced");
  expect(
    courseCompetencyProgress(state, "vec-borrowing").independentTasks,
  ).toBe(2);
  expect(state.review.map((item) => item.conceptId)).toEqual(["vec-borrowing"]);
  expect(state.events).toEqual([
    claim,
    review("vec-borrowing", "vec-borrowing:legacy-real", 200),
  ]);
});
