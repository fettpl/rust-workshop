import { expect, it } from "vitest";
import * as currentCourse from "./course";
import {
  competencies,
  concepts,
  lessons,
  modules,
  reviewExercises,
  sources,
} from "./course";
import { historicalBeforePerformanceInvestigation } from "./performance-investigation-compatibility-fixture";

const lessonId = "api-frame-protocol-maintenance";
const stepIds = [
  "api-frame-protocol-maintenance-predict",
  "api-frame-protocol-maintenance-model",
  "api-frame-protocol-maintenance-run",
  "api-frame-protocol-maintenance-challenge",
  "api-frame-protocol-maintenance-review",
  "api-frame-protocol-maintenance-recall",
];

it("registers the optional Frame Protocol maintenance checkpoint", () => {
  const lesson = lessons.find((entry) => entry.id === lessonId);
  const moduleData = modules.find(
    (entry) => entry.id === "public-api-workspaces",
  );

  expect(lesson).toBeDefined();
  expect(moduleData).toBeDefined();
  expect(moduleData!.lessonIds.slice(-1)).toEqual([lessonId]);
  expect(lesson!.conceptIds).toEqual([
    "api-compatible-surface",
    "api-error-source-chain",
  ]);
  expect(lesson!.competencyIds).toEqual([
    "preserve-public-call-surface",
    "public-api-preserved-error-causes",
  ]);
  expect(lesson!.prerequisites).toEqual(["api-compatible-surface"]);
  expect(lesson!.steps.map((step) => step.id)).toEqual(stepIds);
  expect(lesson!.steps.map((step) => step.evidenceKind)).toEqual([
    "prediction",
    "exposure",
    "exposure",
    "transfer",
    "self-rating",
    "recall",
  ]);
  expect(lesson!.steps[3].evidenceGate).toBeUndefined();
  expect(lesson!.steps[4].evidenceGate).toBe(false);
  expect(
    lesson!.steps.every((step) => step.evidence?.codingTaskId === undefined),
  ).toBe(true);
  expect(lesson!.steps[3].evaluator?.kind).toBe("rubric");
  expect(lesson!.steps[4].evaluator?.kind).toBe("rubric");
  expect(lesson!.steps[5].kind).toBe("recall");
  expect(lesson!.steps[5].prompt).toContain("tej samej sesji");
  expect(lesson!.steps[5].prompt).not.toMatch(/opóźnion|retencj/i);
  expect(
    concepts.filter((concept) => lesson!.conceptIds.includes(concept.id)),
  ).toHaveLength(2);
  expect(
    competencies.filter((competency) =>
      lesson!.competencyIds.includes(competency.id),
    ),
  ).toHaveLength(2);
  expect(
    sources.filter((source) => lesson!.sourceIds.includes(source.id)),
  ).toHaveLength(lesson!.sourceIds.length);
  expect(reviewExercises[lessonId]).toBeUndefined();
});

it("preserves the existing public API module gate while appending the checkpoint", () => {
  const moduleData = modules.find(
    (entry) => entry.id === "public-api-workspaces",
  )!;

  expect(moduleData.gateCriteria).toHaveLength(4);
  expect(moduleData.gateCriteria!.map((criterion) => criterion.id)).toEqual([
    "api-validated-construction-contract",
    "api-error-source-chain-contract",
    "api-trait-compatibility-contract",
    "api-compatible-surface-contract",
  ]);
  expect(moduleData.exitGate).toEqual([
    "Rozwiążesz cztery nowe kontrakty API bez podglądania referencji.",
    "Testy sprawdzą poprawność wartości, źródła błędów oraz wcześniejsze sposoby użycia API. Nie są pełnym dowodem zgodności każdej przyszłej zmiany.",
  ]);
});

it("keeps the historical A6 catalog count limited to one lesson and six steps", () => {
  const historicalA6 = historicalBeforePerformanceInvestigation(currentCourse);

  expect(historicalA6.lessons).toHaveLength(194);
  expect(
    historicalA6.lessons.reduce(
      (total, lesson) => total + lesson.steps.length,
      0,
    ),
  ).toBe(1293);
});
