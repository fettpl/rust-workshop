import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import {
  gatConsumerCompetencies,
  gatConsumerConcepts,
  gatConsumerLessons,
  gatConsumerReviewExercises,
  gatConsumerSources,
} from "./gat-consumers";
import { gatConsumerAssessmentFixtures } from "./gat-consumer-assessment-fixtures";

const assessmentIds = [
  "gat-item-capabilities-gate",
  "gat-item-capabilities-blank",
  "gat-item-capabilities-review",
  "gat-owned-iterator-adapters-gate",
  "gat-owned-iterator-adapters-blank",
  "gat-owned-iterator-adapters-review",
];

describe("GAT consumer authoring contract", () => {
  it("exports the ordered lessons, concepts, competencies, and sources", () => {
    expect(gatConsumerLessons.map((lesson) => lesson.id)).toEqual([
      "gat-item-capabilities",
      "gat-owned-iterator-adapters",
    ]);
    expect(gatConsumerConcepts.map((concept) => concept.id)).toEqual([
      "gat-item-capabilities",
      "gat-owned-iterator-adapters",
    ]);
    expect(gatConsumerCompetencies.length).toBeGreaterThanOrEqual(2);
    expect(gatConsumerSources.map((source) => source.id)).toEqual([
      "gat-reference-trait-bounds",
      "gat-reference-dyn-compatibility",
      "gat-iterator",
      "gat-error-e0038",
    ]);
  });

  it("keeps primary and source-free blank gates independently assessable", () => {
    for (const lesson of gatConsumerLessons) {
      const gate = lesson.steps.find((step) => step.id === `${lesson.id}-gate`);
      const blank = lesson.steps.find(
        (step) => step.id === `${lesson.id}-blank`,
      );
      expect(gate?.evaluator?.kind, lesson.id).toBe("tests");
      expect(gate?.evidenceGate, lesson.id).toBe(true);
      expect(blank?.evaluator?.kind, lesson.id).toBe("tests");
      expect(blank?.code, lesson.id).toBeUndefined();
      expect(blank?.solution, lesson.id).toBeDefined();
      expect(blank?.evidenceGate, lesson.id).toBe(true);
      expect(gatConsumerReviewExercises[lesson.id]?.evaluator?.kind).toBe(
        "tests",
      );
      expect(gatConsumerReviewExercises[lesson.id]?.evidenceKind).toBe(
        "assessment",
      );
    }
  });

  it("uses complete fixture sources and distinct compiling mutants", () => {
    expect(gatConsumerAssessmentFixtures.map((fixture) => fixture.id)).toEqual(
      assessmentIds,
    );
    for (const fixture of gatConsumerAssessmentFixtures) {
      expect(fixture.equivalent.length, fixture.id).toBeGreaterThan(100);
      expect(fixture.mutant.length, fixture.id).toBeGreaterThan(100);
      expect(fixture.equivalent).not.toBe(fixture.mutant);
      expect(fixture.equivalent).toContain("fn ");
      expect(fixture.mutant).toContain("fn ");
    }
  });

  it("verifies every authored consumer solution and rejects unfinished gates", () => {
    const results = verifyTrustedRust({
      lessons: gatConsumerLessons,
      reviewExercises: gatConsumerReviewExercises,
      delayedReviewExercises: {},
      traces: {},
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((result) => result.passed),
      JSON.stringify(results, null, 2),
    ).toBe(true);
  }, 180_000);
});
