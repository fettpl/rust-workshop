import { expect, it } from "vitest";
import { collectionsLessons } from "./collections";
import { guessingCoreLessons } from "./guessing-core";
import { guessingIoLessons } from "./guessing-io";
import { logAnalyzerLessons } from "./log-analyzer";

const scopedLessons = [
  ...collectionsLessons,
  ...guessingCoreLessons,
  ...guessingIoLessons,
  ...logAnalyzerLessons,
];
it("offers two optional resumable boundaries in each substantial original lesson", () => {
  expect(scopedLessons).toHaveLength(10);
  for (const lesson of scopedLessons) {
    expect(lesson.sessionStops, lesson.id).toHaveLength(2);
    const indices = lesson.sessionStops!.map((stop) =>
      lesson.steps.findIndex((step) => step.id === stop.afterStepId),
    );
    expect(indices[0], lesson.id).toBeGreaterThanOrEqual(0);
    expect(indices[1], lesson.id).toBeGreaterThan(indices[0]);
    expect(indices[1], lesson.id).toBeLessThan(lesson.steps.length - 1);
    for (const stop of lesson.sessionStops!)
      expect(stop.nextGoal.trim().length).toBeGreaterThan(10);
  }
});

import * as course from "./course";
import { validateContent } from "./validate";
it("allows only the eleven-step append-only pattern bridge with optional stops", () => {
  const patterns = course.lessons.find(
    (lesson) => lesson.id === "nested-patterns-and-destructuring",
  )!;
  const sizeErrors = (lesson: typeof patterns) =>
    validateContent({
      ...course,
      lessons: course.lessons.map((item) =>
        item.id === patterns.id ? lesson : item,
      ),
    }).filter((error) => error.includes("steps"));
  expect(sizeErrors(patterns)).toEqual([]);
  expect(sizeErrors({ ...patterns, sessionStops: undefined })).not.toEqual([]);
  expect(
    sizeErrors({
      ...patterns,
      steps: [
        ...patterns.steps,
        { ...patterns.steps[0], id: "oversized-extra" },
      ],
    }),
  ).not.toEqual([]);
  expect(sizeErrors({ ...patterns, id: "unrelated-long-lesson" })).not.toEqual(
    [],
  );
});
