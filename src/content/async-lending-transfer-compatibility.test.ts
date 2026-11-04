import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import type { LessonStep } from "@/domain/types";
import * as currentCourse from "./course";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeFallibleComposition } from "./fallible-composition-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./service-authorization-compatibility-fixture";
const course = historicalBeforeFallibleComposition(
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
import baseline from "./fixtures/m11-m10-identity.json";
import correctionDelta from "./baseline-correction-delta.json";
import { asyncLendingAssessmentFixtures } from "./async-lending-assessment-fixtures";

const appended = {
  "async-lending-callbacks": "async-lending-callbacks-bounded-transform",
  "async-lending-dyn-adapter": "async-lending-dyn-adapter-borrowed-sources",
} as const;
function stepIdentity(step: LessonStep, index: number) {
  return {
    index,
    id: step.id,
    kind: step.kind,
    evidenceKind: step.evidenceKind,
    evidenceGate: step.evidenceGate ?? null,
    evidence: step.evidence ?? null,
    evaluatorKind: step.evaluator?.kind ?? null,
    reviewPurpose: step.reviewPurpose ?? null,
  };
}
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

it("preserves M10 occurrences with the two M11 tasks and explicit baseline correction deltas", () => {
  expect(baseline.provenance.sourceHead).toBe(
    "eb7ae8be22cef252f6a74c09023b4d56a0c179cc",
  );
  expect(baseline.provenance.sourceTree).toBe(
    "3503a34bba8ce693f4398ec30e826ecf50fc46ba",
  );
  expect(course.lessons.map((item) => item.id)).toEqual(
    baseline.orderedLessonIds,
  );
  const oldLocations: Record<string, unknown[]> = {};
  for (const [lessonIndex, old] of baseline.lessons.entries()) {
    const current = course.lessons[lessonIndex];
    expect({
      id: current.id,
      moduleId: current.moduleId,
      conceptIds: current.conceptIds,
      prerequisites: current.prerequisites,
    }).toEqual({
      id: old.id,
      moduleId: old.moduleId,
      conceptIds: old.conceptIds,
      prerequisites: old.prerequisites,
    });
    expect(current.steps.slice(0, old.stepCount).map(stepIdentity)).toEqual(
      old.steps.map((step) =>
        [
          "memory-run",
          "memory-modify",
          "function-expression-run",
          "project-result-run",
        ].includes(step.id)
          ? {
              ...step,
              evaluatorKind: "exact-output",
              evidenceKind:
                step.id === "memory-modify" ? "transfer" : "exposure",
            }
          : step,
      ),
    );
    const addition = appended[old.id as keyof typeof appended];
    expect(current.steps.slice(old.stepCount).map((step) => step.id)).toEqual([
      ...(addition ? [addition] : []),
      ...(correctionDelta.appendedSteps[
        old.id as keyof typeof correctionDelta.appendedSteps
      ] ?? []),
    ]);
    for (const step of old.steps) {
      (oldLocations[step.id] ??= []).push({
        stepId: current.steps[step.index].id,
        lessonId: current.id,
        lessonIndex,
        stepIndex: step.index,
      });
    }
  }
  expect(oldLocations).toEqual(baseline.stepIdLocations);
  expect(
    Object.values(oldLocations).filter((locations) => locations.length > 1),
  ).toHaveLength(24);
  expect(course.lessons.flatMap((item) => item.steps)).toHaveLength(
    baseline.counts.lessonSteps + 2 + 23,
  );
  expect(course.lessons.flatMap((item) => item.steps)).toHaveLength(1242);
});

it("preserves ordered inventories, review identities, calibration and old module references", () => {
  for (const [actual, expected] of [
    [course.modules.map((item) => item.id), baseline.orderedModuleIds],
    [course.concepts.map((item) => item.id), baseline.orderedConceptIds],
    [course.competencies.map((item) => item.id), baseline.orderedCompetencyIds],
    [course.projects.map((item) => item.id), baseline.orderedProjectIds],
    [
      course.sources
        .filter((source) => !correctionDelta.addedSourceIds.includes(source.id))
        .map((item) => item.id),
      baseline.orderedSourceIds,
    ],
    [Object.keys(course.traces), baseline.orderedTraceIds],
  ])
    expect(actual).toEqual(expected);
  expect(course.project.id).toBe(baseline.primaryProjectId);
  for (const old of baseline.concepts) {
    const current = course.concepts[old.index];
    for (const [key, value] of Object.entries(old))
      if (key !== "index")
        expect(current[key as keyof typeof current]).toEqual(value);
  }
  for (const old of baseline.projects) {
    const current = course.projects[old.index];
    for (const [key, value] of Object.entries(old))
      if (key !== "index")
        expect(
          key === "packageId"
            ? current.package?.id
            : current[key as keyof typeof current],
        ).toEqual(value);
  }
  for (const old of baseline.modules) {
    const current = course.modules[old.index];
    for (const [key, value] of Object.entries(old))
      if (key !== "index" && key !== "gateCriteria")
        expect(current[key as keyof typeof current]).toEqual(value);
    expect(current.gateCriteria).toHaveLength(old.gateCriteria.length);
    for (const [index, previous] of old.gateCriteria.entries()) {
      const criterion = current.gateCriteria![index];
      for (const [key, value] of Object.entries(previous))
        if (key !== "taskRefs")
          expect(criterion[key as keyof typeof criterion]).toEqual(value);
      expect(criterion.taskRefs.slice(0, previous.taskRefs.length)).toEqual(
        previous.taskRefs,
      );
      const lessonId = previous.taskRefs[0]?.lessonId;
      const addition =
        old.id === "async-lending-contracts"
          ? appended[lessonId as keyof typeof appended]
          : undefined;
      expect(criterion.taskRefs.slice(previous.taskRefs.length)).toEqual(
        old.id === "rust-foundations" && previous.id === "control-flow-gate"
          ? [{ lessonId: "control-flow", stepId: "flow-range-transfer" }]
          : addition
            ? [{ lessonId, stepId: addition }]
            : [],
      );
    }
  }
  for (const [name, identities] of Object.entries(baseline.reviews)) {
    const registry = course[name as keyof typeof course] as Record<
      string,
      LessonStep
    >;
    expect(
      Object.entries(registry).map(([key, step], index) => ({
        ...stepIdentity(step, index),
        key,
      })),
    ).toEqual(identities);
  }
});

it("keeps the old async fixture order and all original fixture strings", () => {
  const oldIds = new Set(
    baseline.asyncAssessmentFixtures.map((item) => item.id),
  );
  const old = asyncLendingAssessmentFixtures.filter((item) =>
    oldIds.has(item.id),
  );
  expect(old.map((item) => item.id)).toEqual(
    baseline.asyncAssessmentFixtures.map((item) => item.id),
  );
  old.forEach((fixture, index) => {
    const previous = baseline.asyncAssessmentFixtures[index];
    expect(sha(fixture.equivalent)).toBe(previous.equivalentSha256);
    expect(sha(fixture.mutant)).toBe(previous.mutantSha256);
    expect((fixture.mutants ?? []).map(sha)).toEqual(
      previous.additionalMutantSha256,
    );
  });
});
