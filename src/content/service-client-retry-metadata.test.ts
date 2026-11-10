import { describe, expect, it } from "vitest";
import * as rawCurrentCourse from "./course";
import { historicalBeforeA11 } from "./file-schema-evolution-compatibility-fixture";
const { lessons, concepts, competencies, modules, reviewExercises, delayedReviewExercises, sources, traces, project, projects, roadmap } = historicalBeforeA11(rawCurrentCourse);
import { validateContent } from "./validate";

const bundle = { lessons, concepts, competencies, modules, reviewExercises, delayedReviewExercises, sources, traces, project, projects, roadmap };

describe("forward lesson duration metadata", () => {
  it("allows an omitted estimate while preserving every old duration", () => {
    const added = lessons.find((lesson) => lesson.id === "service-client-bounded-retry")!;
    expect(added.minutes).toBeUndefined();
    expect(lessons.filter((lesson) => lesson.moduleId !== "service-client-retry").every((lesson) => typeof lesson.minutes === "number")).toBe(true);
    expect(validateContent(bundle).filter((error) => error.includes("minutes"))).toEqual([]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid provided estimate %s", (minutes) => {
    const copy = { ...bundle, lessons: lessons.map((lesson) => lesson.id === "service-client-bounded-retry" ? { ...lesson, minutes } : lesson) };
    expect(validateContent(copy).some((error) => error.includes("learning metadata"))).toBe(true);
  });
});
