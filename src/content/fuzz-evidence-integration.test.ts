import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import { historicalBeforeFallibleComposition } from "./fallible-composition-compatibility-fixture";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./service-client-retry-compatibility-fixture";
const { concepts, lessons, modules, reviewExercises } =
  historicalBeforeFallibleComposition(
    historicalBeforeDocumentationRepair(
      historicalBeforeSendHandoff(
        historicalBeforeCancellationTransfer(
          historicalBeforeInitializedPrefix(
            historicalBeforeExistingContractRepair(currentCourse),
          ),
        ),
      ),
    ),
  );
import { fuzzEvidenceConcepts, fuzzEvidenceLessons } from "./fuzz-evidence";
import { nestedPatternConcepts, nestedPatternLessons } from "./nested-patterns";
import { functionOwnershipCalibrationLesson } from "./function-ownership-calibration";
import { sharedBorrowCalibrationLesson } from "./shared-borrow-calibration";

it("registers the bounded fuzz evidence module and four independent alternatives", () => {
  const stage = modules.find((item) => item.id === "fuzz-evidence-lifecycle")!;
  expect(stage.prerequisites).toEqual(["property-contracts"]);
  expect(stage.lessonIds).toEqual(
    fuzzEvidenceLessons.map((lesson) => lesson.id),
  );
  expect(stage.gateCriteria).toHaveLength(4);
  expect(fuzzEvidenceLessons).toHaveLength(4);
  expect(
    fuzzEvidenceConcepts.find(
      (concept) => concept.id === "fuzz-campaign-evidence",
    )?.evidenceArtifact,
  ).toBe("rust-code");
  for (const lesson of fuzzEvidenceLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
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
      if (gate.evaluator?.kind === "tests")
        expect(gate.evaluator.tests).not.toContain("assert!(true)");
    }
    expect(lesson.conceptIds).toEqual([lesson.id]);
  }
  // Frozen post-PR40/PR41 pre-nested catalog cut plus the accepted nested exports.
  expect(lessons).toHaveLength(186 + nestedPatternLessons.length + 2);
  expect(lessons.at(-2)).toEqual(functionOwnershipCalibrationLesson);
  expect(lessons.at(-1)).toEqual(sharedBorrowCalibrationLesson);
  expect(concepts).toHaveLength(190 + nestedPatternConcepts.length);
});
