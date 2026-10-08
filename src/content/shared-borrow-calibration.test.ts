import { expect, it } from "vitest";
import type { LessonStep } from "@/domain/types";
import {
  delayedReviewExercises,
  sharedBorrowCalibrationLesson,
} from "./shared-borrow-calibration";
import {
  delayedReviewExercises as registeredDelayedReviews,
  lessons,
  ownershipModule,
  reviewExerciseForId,
} from "./course";
import {
  delayedSharedCountLinesContract,
  sharedCountWordsContract,
  sharedHasSuffixContract,
} from "./ownership-evidence-contracts";
import { validateContent } from "./validate";
import {
  concepts,
  competencies,
  modules,
  project,
  projects,
  reviewExercises,
  roadmap,
  sources,
  traces,
} from "./course";

const bundle = {
  lessons,
  concepts,
  competencies,
  modules,
  reviewExercises,
  delayedReviewExercises: registeredDelayedReviews,
  sources,
  traces,
  project,
  projects,
  roadmap,
};

it("authors the shared borrow lesson as the exact five step pair", () => {
  expect(sharedBorrowCalibrationLesson).toMatchObject({
    id: "shared-borrow-calibration",
    moduleId: "ownership",
    conceptIds: ["shared-borrow"],
    competencyIds: ["borrow-without-taking", "repair-compiler-feedback"],
    prerequisites: ["function-ownership-calibration"],
    sourceIds: [
      "rust-book-ownership",
      "rust-book-borrowing",
      "records-book-slices",
      "records-std-str",
    ],
  });
  expect(sharedBorrowCalibrationLesson.steps.map((step) => step.id)).toEqual([
    "shared-borrow-preview",
    "shared-view-predict",
    "shared-count-words",
    "shared-has-suffix",
    "shared-borrow-explain",
  ]);
  expect(
    sharedBorrowCalibrationLesson.steps.map((step) => step.evidence),
  ).toEqual([
    { version: 2, conceptIds: ["shared-borrow"] },
    { version: 2, conceptIds: ["shared-borrow"] },
    {
      version: 2,
      conceptIds: ["shared-borrow"],
      codingTaskId: "ownership/shared-count-words-v1",
    },
    {
      version: 2,
      conceptIds: ["shared-borrow"],
      codingTaskId: "ownership/shared-has-suffix-v1",
    },
    { version: 2, conceptIds: ["shared-borrow"] },
  ]);
  expect(
    sharedBorrowCalibrationLesson.steps.filter((step) => step.evidenceGate),
  ).toHaveLength(2);
  expect(sharedBorrowCalibrationLesson.steps[2].evaluator).toEqual({
    kind: "tests",
    tests: expect.any(String),
  });
  expect(sharedBorrowCalibrationLesson.steps[3].evaluator).toEqual({
    kind: "tests",
    tests: expect.any(String),
  });
  expect(sharedBorrowCalibrationLesson.steps[4].evaluator?.kind).toBe("rubric");
  expect(sharedBorrowCalibrationLesson.steps[2].code).toBe(
    sharedCountWordsContract.starter,
  );
  expect(sharedBorrowCalibrationLesson.steps[3].code).toBe(
    sharedHasSuffixContract.starter,
  );
  expect(delayedSharedCountLinesContract.starter).toContain(
    "fn count_lines(text: String)",
  );
});

it("registers the lesson, exact pair criterion, and both delayed reviews", () => {
  expect(ownershipModule.lessonIds.at(-1)).toBe("shared-borrow-calibration");
  expect(lessons.at(-1)).toEqual(sharedBorrowCalibrationLesson);
  expect(ownershipModule.gateCriteria?.at(-1)).toEqual({
    id: "shared-borrow-pair-v1",
    label: "Dwie różne naprawy pożyczonego odczytu bez podpowiedzi",
    requiredIndependentCodingTasks: 2,
    taskRefs: [
      {
        lessonId: "shared-borrow-calibration",
        stepId: "shared-count-words",
      },
      {
        lessonId: "shared-borrow-calibration",
        stepId: "shared-has-suffix",
      },
    ],
  });
  expect(Object.keys(delayedReviewExercises)).toEqual(["shared-borrow"]);
  expect(registeredDelayedReviews["function-ownership"]?.id).toBe(
    "review-function-ownership-delayed-v1",
  );
  expect(registeredDelayedReviews["shared-borrow"]?.id).toBe(
    "review-shared-borrow-delayed-v1",
  );
  expect(registeredDelayedReviews["shared-borrow"]).toMatchObject({
    expectedStatus: "compile-error",
    expectedError: "E0382",
  });
  expect(reviewExerciseForId("review-shared-borrow-delayed-v1")).toBe(
    registeredDelayedReviews["shared-borrow"],
  );
  expect(reviewExercises["shared-borrow"]?.id).toBe("review-shared-borrow");
});

it.each([
  ["id", { id: "review-wrong-id" }],
  [
    "attribution",
    { evidence: { version: 2, conceptIds: ["function-ownership"] } },
  ],
  [
    "family",
    {
      evidence: {
        version: 2,
        conceptIds: ["shared-borrow"],
        codingTaskId: "ownership/wrong-family",
      },
    },
  ],
  ["kind", { kind: "modify" }],
  ["evidence kind", { evidenceKind: "fix" }],
  ["evaluator", { evaluator: { kind: "compilation" } }],
  ["starter", { code: "fn main() {}" }],
  ["solution", { solution: "fn main() {}" }],
  ["tests", { evaluator: { kind: "tests", tests: "#[test] fn drift() {}" } }],
  ["status", { expectedStatus: "success" }],
  ["diagnostic", { expectedDiagnostic: "E0382" }],
] as const)("rejects shared delayed contract %s drift", (_field, change) => {
  const delayed = registeredDelayedReviews["shared-borrow"];
  const changedDelayed = (change: Partial<LessonStep>): LessonStep => ({
    ...delayed,
    ...change,
  });
  const broken = {
    ...bundle,
    delayedReviewExercises: {
      ...registeredDelayedReviews,
      "shared-borrow": changedDelayed(change as Partial<LessonStep>),
    },
  };
  expect(
    validateContent(broken).some(
      (error) =>
        error.includes("shared-borrow") && error.includes("authored delayed"),
    ),
  ).toBe(true);
});
