import { describe, expect, it } from "vitest";
import { lessons, modules, concepts, reviewExercises } from "./course";
import { createInitialState } from "../persistence/state";
import { evaluate } from "../engine/evaluate";
import { moduleGate } from "../engine/learning";
import { nextLessonForNavigation } from "../engine/course-route";

describe("data modeling learning path", () => {
  it("connects ownership to eight modeling lessons without moving an existing resume", () => {
    const courseModule = modules.find((item) => item.id === "data-modeling");
    expect(courseModule).toBeDefined();
    expect(courseModule!.prerequisites).toEqual(["ownership"]);
    expect(courseModule!.lessonIds).toEqual([
      "slices-and-views",
      "structs-and-fields",
      "methods-and-state",
      "enums-and-match",
      "option-and-absence",
      "modeling-assessment",
      "nested-patterns-and-destructuring",
      "ownership-foundation-transfer",
    ]);
    const state = createInitialState();
    state.resume.lessonId = "scenario-assessment";
    state.resume.stepIndex = 3;
    expect(moduleGate(state, lessons, courseModule!).passed).toBe(false);
    expect(state.resume).toMatchObject({
      lessonId: "scenario-assessment",
      stepIndex: 3,
    });
    const nestedGate = courseModule!.gateCriteria!.find(
      (criterion) => criterion.id === "nested-pattern-gate",
    );
    expect(nestedGate).toEqual({
      id: "nested-pattern-gate",
      label: "Zagnieżdżone wzorce rozróżniają brak, stan i dane pożyczone",
      taskRefs: [
        {
          lessonId: "nested-patterns-and-destructuring",
          stepId: "nested-repair",
        },
        {
          lessonId: "nested-patterns-and-destructuring",
          stepId: "nested-transfer",
        },
      ],
    });
    expect(nestedGate?.requiredIndependentCodingTasks).toBeUndefined();
    expect(moduleGate(state, lessons, courseModule!).passed).toBe(false);
    expect(state.events).toEqual([]);
    expect(
      nextLessonForNavigation("modeling-assessment", lessons, modules)?.id,
    ).toBe("nested-patterns-and-destructuring");
    expect(state.resume).toMatchObject({
      lessonId: "scenario-assessment",
      stepIndex: 3,
    });
    for (const criterion of courseModule!.gateCriteria!) {
      expect(criterion.taskRefs.length).toBeGreaterThanOrEqual(2);
      for (const ref of criterion.taskRefs) {
        const task = lessons
          .find((lesson) => lesson.id === ref.lessonId)!
          .steps.find((step) => step.id === ref.stepId)!;
        expect(["tests", "exact-output"]).toContain(task.evaluator?.kind);
        expect(["fix", "transfer", "project", "assessment"]).toContain(
          task.evidenceKind,
        );
      }
    }
  });

  it("gives each new concept an active review separate from lesson tasks", () => {
    const ids = [
      "slice-views",
      "struct-records",
      "method-receivers",
      "enum-variants",
      "exhaustive-match",
      "optional-values",
      "modeling-transfer",
      "nested-pattern-matching",
    ];
    for (const id of ids) {
      expect(
        concepts.find((concept) => concept.id === id),
        id,
      ).toBeDefined();
      const review = reviewExercises[id];
      expect(review?.evaluator, id).toBeDefined();
      expect(review?.evaluator?.kind, id).not.toBe("rubric");
      expect(
        lessons.flatMap((lesson) => lesson.steps).includes(review),
        id,
      ).toBe(false);
    }
  });

  it("keeps the nested review outside lesson steps and uses its executable evaluator", () => {
    const review = reviewExercises["nested-pattern-matching"];
    expect(review).toMatchObject({
      id: "review-nested-pattern-matching",
      evaluator: { kind: "tests" },
    });
    expect(reviewExercises["nested-pattern-matching"].evaluator).toMatchObject({
      kind: "tests",
    });
    expect(lessons.flatMap((lesson) => lesson.steps).includes(review)).toBe(
      false,
    );
  });
});

it.each([
  ["slices-and-views", "slice-repair"],
  ["structs-and-fields", "record-repair"],
  ["methods-and-state", "method-repair"],
])(
  "requires tested behavior for %s/%s, not just an empty compiling program",
  (lessonId, stepId) => {
    const step = lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.find((item) => item.id === stepId)!;
    expect(
      evaluate(step.evaluator!, {
        code: "fn main() {}",
        result: {
          status: "success",
          stdout: "",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
        },
      }).passed,
    ).toBe(false);
  },
);
