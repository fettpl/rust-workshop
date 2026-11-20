import { describe, expect, it } from "vitest";
import {
  delayedReviewExercises,
  reviewExercises,
  reviewExercisesById,
  reviewExerciseForId,
  shortReviewExercises,
} from "./course";
import { shortReviewProbeFixtures } from "./io-review-probe-fixtures";

const expected = {
  "io-format-roundtrip": "review-io-format-flag-probe-v1",
  "io-safe-persistence": "review-io-missing-file-probe-v1",
  "io-terminal-boundary": "review-io-confirm-save-probe-v1",
} as const;

describe("short I/O review probes", () => {
  it("registers exactly the three authored probes without reclassifying old maps", () => {
    expect(Object.keys(shortReviewExercises)).toEqual(Object.keys(expected));
    expect(Object.keys(delayedReviewExercises)).toEqual([
      "function-ownership",
      "shared-borrow",
    ]);
    expect(Object.keys(reviewExercises)).toContain("io-format-roundtrip");
    expect(Object.keys(reviewExercises)).toContain("io-safe-persistence");
    expect(Object.keys(reviewExercises)).toContain("io-terminal-boundary");
    for (const [conceptId, exerciseId] of Object.entries(expected)) {
      const probe = shortReviewExercises[conceptId];
      expect(probe.id).toBe(exerciseId);
      expect(probe.reviewPurpose).toBe("practice-probe");
      expect(probe.evidenceKind).toBe("exposure");
      expect(probe.evidenceGate).toBe(false);
      expect(probe.evidence).toEqual({ version: 1, conceptIds: [conceptId] });
      expect(probe.evaluator?.kind).toBe("tests");
      expect(probe.hints).toHaveLength(2);
      expect(probe.explanation).toBeTruthy();
      expect(probe.evidence?.codingTaskId).toBeUndefined();
      expect(reviewExercisesById[exerciseId]).toBe(probe);
      expect(reviewExerciseForId(exerciseId)).toBe(probe);
      expect(shortReviewProbeFixtures[exerciseId]).toBeDefined();
    }
    expect(Object.keys(reviewExercisesById).slice(-3)).toEqual(
      Object.values(expected),
    );
    expect(Object.keys(reviewExercisesById)).toHaveLength(
      Object.keys(reviewExercises).length +
        Object.keys(delayedReviewExercises).length +
        Object.keys(shortReviewExercises).length,
    );
  });

  it("keeps the long I/O contracts as explicit recall exercises", () => {
    expect(reviewExercises["io-format-roundtrip"]).toMatchObject({
      id: "review-io-format",
      evidenceKind: "recall",
      evidence: { version: 1, conceptIds: ["io-format-roundtrip"] },
    });
    expect(reviewExercises["io-safe-persistence"]).toMatchObject({
      id: "review-io-files",
      evidenceKind: "recall",
      evidence: { version: 1, conceptIds: ["io-safe-persistence"] },
    });
    expect(reviewExercises["io-terminal-boundary"]).toMatchObject({
      id: "review-io-command",
      evidenceKind: "recall",
      evidence: { version: 1, conceptIds: ["io-terminal-boundary"] },
    });
  });

  it("rejects omissions, duplicate IDs, and cross-concept metadata in the test contract", () => {
    const ids = Object.values(shortReviewExercises).map((step) => step.id);
    expect(new Set(ids).size).toBe(3);
    expect(Object.values(shortReviewExercises)).toHaveLength(3);
    for (const [conceptId, step] of Object.entries(shortReviewExercises)) {
      expect(step.evidence?.conceptIds).toEqual([conceptId]);
      expect(step.evaluator?.kind).toBe("tests");
      expect(
        step.evaluator?.kind === "tests" ? step.evaluator.tests : "",
      ).not.toBe("");
    }
  });
});
