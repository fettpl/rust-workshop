import { expect, it } from "vitest";
import { concepts, lessons, modules, reviewExercises } from "./course";
import { fuzzEvidenceLessons } from "./fuzz-evidence";

it("registers the bounded fuzz evidence module and four independent alternatives", () => {
  const stage = modules.find((item) => item.id === "fuzz-evidence-lifecycle")!;
  expect(stage.prerequisites).toEqual(["property-contracts"]);
  expect(stage.lessonIds).toEqual(fuzzEvidenceLessons.map((lesson) => lesson.id));
  expect(stage.gateCriteria).toHaveLength(4);
  expect(fuzzEvidenceLessons).toHaveLength(4);
  for (const lesson of fuzzEvidenceLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(1);
    expect(reviewExercises[lesson.conceptIds[0]]).toBeDefined();
    expect(lesson.conceptIds).toEqual([lesson.id]);
  }
  expect(lessons).toHaveLength(175);
  expect(concepts).toHaveLength(178);
});
