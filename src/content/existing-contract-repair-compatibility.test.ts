import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import {
  acceptedPreC1Projection,
  historicalBeforeExistingContractRepair,
} from "./existing-contract-repair-compatibility-fixture";
import { historicalBeforePerformanceInvestigation } from "./performance-investigation-compatibility-fixture";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const registryKeys = acceptedPreC1Projection.predecessor
  .registryKeys as string[];
const predecessorRegistryHashes = acceptedPreC1Projection.predecessor
  .registrySha256ByKey as Record<string, string>;

const historicalBeforeC1 = (course: typeof currentCourse) =>
  historicalBeforeExistingContractRepair(
    historicalBeforePerformanceInvestigation(course),
  );

function captureRegistry(course: typeof currentCourse) {
  const namespace = course as typeof currentCourse & {
    default?: Record<string, unknown>;
  };
  const values = course as unknown as Record<string, unknown>;
  const defaultRegistry =
    namespace.default ??
    Object.fromEntries(
      registryKeys
        .filter((key) => key !== "default")
        .map((key) => [key, values[key]]),
    );
  return Object.fromEntries(
    registryKeys.map((key) => [
      key,
      key === "default" ? defaultRegistry : values[key],
    ]),
  );
}

function lessonStep(
  course: typeof currentCourse,
  lessonId: string,
  stepId: string,
) {
  return course.lessons
    .find((lesson) => lesson.id === lessonId)
    ?.steps.find((step) => step.id === stepId);
}

function predecessorValue(
  registry: string,
  selector: string,
  path: (string | number)[],
) {
  const entry = acceptedPreC1Projection.restorations.find(
    (candidate) =>
      candidate.registry === registry &&
      candidate.selector === selector &&
      JSON.stringify(candidate.path) === JSON.stringify(path),
  );
  expect(entry).toBeDefined();
  return entry!.before;
}

it("projects the complete predecessor registry and preserves aliases/counts", () => {
  const projected = historicalBeforeC1(currentCourse);
  const registry = captureRegistry(projected);

  expect(hashJson(registry)).toBe(
    acceptedPreC1Projection.predecessor.wholeCourseSha256,
  );
  for (const key of registryKeys) {
    expect(hashJson(registry[key])).toBe(predecessorRegistryHashes[key]);
  }
  expect(projected.lessons).toHaveLength(
    acceptedPreC1Projection.predecessor.counts.lessons,
  );
  expect(projected.modules).toHaveLength(
    acceptedPreC1Projection.predecessor.counts.modules,
  );
  expect(projected.concepts).toHaveLength(
    acceptedPreC1Projection.predecessor.counts.concepts,
  );
  expect(projected.projects).toHaveLength(
    acceptedPreC1Projection.predecessor.counts.projects,
  );
  expect(projected.delayedReviewExercises).toEqual(
    currentCourse.delayedReviewExercises,
  );
  expect(projected.shortReviewExercises).toEqual(
    currentCourse.shortReviewExercises,
  );
  expect(projected.project).toEqual(
    projected.projects.find((project) => project.id === projected.project.id),
  );
  expect(projected.ownershipModule).toEqual(
    projected.modules.find(
      (module) => module.id === projected.ownershipModule.id,
    ),
  );
});

it("is idempotent and does not mutate its input namespace", () => {
  const before = captureRegistry(currentCourse);
  const projected = historicalBeforeC1(currentCourse);

  expect(captureRegistry(currentCourse)).toEqual(before);
  expect(historicalBeforeC1(projected)).toEqual(projected);
  expect(historicalBeforeC1(projected)).toEqual(
    historicalBeforeC1(currentCourse),
  );
});

it("keeps unrelated lesson metadata and unknown registry aliases observable", () => {
  const unrelated = currentCourse.lessons.find(
    (lesson) => lesson.id === "first-program",
  )!;
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === unrelated.id
        ? { ...lesson, unknownMetadata: { marker: "unrelated" } }
        : lesson,
    ),
    reviewExercises: {
      ...currentCourse.reviewExercises,
      unknownRegistryAlias: { marker: "keep" },
    },
  } as unknown as typeof currentCourse;
  const projected = historicalBeforeC1(mutated);

  expect(
    projected.lessons.find((lesson) => lesson.id === unrelated.id),
  ).toMatchObject({
    unknownMetadata: { marker: "unrelated" },
  });
  expect(
    (projected.reviewExercises as Record<string, unknown>).unknownRegistryAlias,
  ).toEqual({ marker: "keep" });
});

it("preserves unknown nested metadata while restoring an exact canonical field", () => {
  const target = lessonStep(
    currentCourse,
    "fuzz-campaign-evidence",
    "fuzz-campaign-evidence-gate",
  )!;
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === "fuzz-campaign-evidence"
        ? {
            ...lesson,
            steps: lesson.steps.map((step) =>
              step.id === target.id
                ? { ...step, unknownMetadata: { marker: "keep" } }
                : step,
            ),
          }
        : lesson,
    ),
  } as typeof currentCourse;
  const projected = historicalBeforeC1(mutated);
  const restored = lessonStep(
    projected,
    "fuzz-campaign-evidence",
    "fuzz-campaign-evidence-gate",
  )! as typeof target & { unknownMetadata?: unknown };

  expect(restored.prompt).toBe(
    predecessorValue("lessons", "fuzz-campaign-evidence", [
      "steps",
      3,
      "prompt",
    ]),
  );
  expect(restored.unknownMetadata).toEqual({ marker: "keep" });
});

it("leaves a near-miss canonical field unchanged instead of applying a broad lesson reset", () => {
  const target = lessonStep(
    currentCourse,
    "fuzz-campaign-evidence",
    "fuzz-campaign-evidence-gate",
  )!;
  const nearMiss = `${target.prompt} near-miss`;
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === "fuzz-campaign-evidence"
        ? {
            ...lesson,
            steps: lesson.steps.map((step) =>
              step.id === target.id ? { ...step, prompt: nearMiss } : step,
            ),
          }
        : lesson,
    ),
  } as typeof currentCourse;

  expect(
    lessonStep(
      historicalBeforeC1(mutated),
      "fuzz-campaign-evidence",
      "fuzz-campaign-evidence-gate",
    )!.prompt,
  ).toBe(nearMiss);
});

it("keeps alias-specific mutations observable", () => {
  const current =
    currentCourse.reviewExercisesById["fuzz-campaign-evidence-review"];
  const aliasMutation = `${current.prompt} alias-mutation`;
  const mutated = {
    ...currentCourse,
    reviewExercisesById: {
      ...currentCourse.reviewExercisesById,
      "fuzz-campaign-evidence-review": {
        ...current,
        prompt: aliasMutation,
      },
    },
  } as typeof currentCourse;
  const projected = historicalBeforeC1(mutated);

  expect(
    projected.reviewExercisesById["fuzz-campaign-evidence-review"].prompt,
  ).toBe(aliasMutation);
  expect(projected.reviewExercises["fuzz-campaign-evidence"].prompt).toBe(
    predecessorValue("reviewExercises", "fuzz-campaign-evidence", ["prompt"]),
  );
});

it("does not alter ordinary fuzz choice recall or allocation review/recall surfaces", () => {
  const projected = historicalBeforeC1(currentCourse);

  expect(
    lessonStep(
      projected,
      "fuzz-campaign-evidence",
      "fuzz-campaign-evidence-recall",
    ),
  ).toEqual(
    lessonStep(
      currentCourse,
      "fuzz-campaign-evidence",
      "fuzz-campaign-evidence-recall",
    ),
  );
  expect(projected.reviewExercises["runtime-allocation-window"]).toEqual(
    currentCourse.reviewExercises["runtime-allocation-window"],
  );
  expect(projected.reviewExercises["runtime-allocation-comparison"]).toEqual(
    currentCourse.reviewExercises["runtime-allocation-comparison"],
  );
});

it("introduces no IDs, families, credits, gates, calibrations, or learner labels", () => {
  const projected = historicalBeforeC1(currentCourse);
  const preC1 = historicalBeforePerformanceInvestigation(currentCourse);
  expect(projected.lessons.map((lesson) => lesson.id)).toEqual(
    preC1.lessons.map((lesson) => lesson.id),
  );
  expect(projected.modules.map((module) => module.id)).toEqual(
    preC1.modules.map((module) => module.id),
  );
  expect(projected.concepts.map((concept) => concept.id)).toEqual(
    currentCourse.concepts.map((concept) => concept.id),
  );
  expect(JSON.stringify(captureRegistry(projected))).not.toContain("c1-v1");
  expect(JSON.stringify(captureRegistry(projected))).not.toContain(
    "existing-contract-repair-v1",
  );
});
