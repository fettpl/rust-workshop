import { expect, it } from "vitest";
import { concepts, lessons, modules, reviewExercises } from "./course";
import { fuzzEvidenceConcepts, fuzzEvidenceLessons } from "./fuzz-evidence";

it("registers the bounded fuzz evidence module and four independent alternatives", () => {
  const stage = modules.find((item) => item.id === "fuzz-evidence-lifecycle")!;
  expect(stage.prerequisites).toEqual(["property-contracts"]);
  expect(stage.lessonIds).toEqual(fuzzEvidenceLessons.map((lesson) => lesson.id));
  expect(stage.gateCriteria).toHaveLength(4);
  expect(fuzzEvidenceLessons).toHaveLength(4);
  expect(fuzzEvidenceConcepts.find((concept) => concept.id === "fuzz-campaign-evidence")?.evidenceArtifact).toBe("rust-code");
  for (const lesson of fuzzEvidenceLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(1);
    const retrieval = reviewExercises[lesson.conceptIds[0]];
    expect(retrieval).toBeDefined();
    expect(retrieval.code).toBeTruthy();
    expect(retrieval.solution).toBeTruthy();
    expect(retrieval.evaluator?.kind).toBe("tests");
    if (retrieval.evaluator?.kind === "tests") {
      expect(retrieval.evaluator.tests).toContain("#[test]");
      expect(retrieval.evaluator.tests).not.toContain("assert!(true)");
    }
    for (const gate of lesson.steps.filter((step) => step.evidenceGate)) {
      expect(gate.evaluator?.kind).toBe("tests");
      if (gate.evaluator?.kind === "tests") expect(gate.evaluator.tests).not.toContain("assert!(true)");
    }
    expect(lesson.conceptIds).toEqual([lesson.id]);
  }
  expect(lessons).toHaveLength(184);
  expect(concepts).toHaveLength(187);
});
