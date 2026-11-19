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
it("preserves the original session boundaries and offers a stop before the extra Unicode practice", () => {
  expect(scopedLessons).toHaveLength(10);
  for (const lesson of scopedLessons) {
    const stops = lesson.sessionStops!;
    if (lesson.id === "string-and-utf8") {
      expect(stops.map((stop) => stop.afterStepId)).toEqual([
        "string-explain",
        "string-char-gate",
        "string-recall",
      ]);
    } else {
      expect(stops, lesson.id).toHaveLength(2);
    }
    let previous = -1;
    for (const stop of stops) {
      const index = lesson.steps.findIndex(
        (step) => step.id === stop.afterStepId,
      );
      expect(index, lesson.id).toBeGreaterThan(previous);
      expect(index, lesson.id).toBeLessThan(lesson.steps.length - 1);
      expect(stop.nextGoal.trim().length).toBeGreaterThan(10);
      previous = index;
    }
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
