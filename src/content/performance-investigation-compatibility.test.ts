import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import {
  acceptedPreA7Projection,
  historicalBeforePerformanceInvestigation as historicalBeforeA7Source,
} from "./performance-investigation-compatibility-fixture";
import {
  historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeA8ThenA7ThenExistingContractRepair,
  historicalBeforeA9ThenCapstoneMaintenance as historicalBeforeCapstoneMaintenance,
} from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";
import { acceptedPreC1Projection } from "./existing-contract-repair-compatibility-fixture";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const predecessorRegistryHashes = acceptedPreA7Projection.predecessor
  .registrySha256ByKey as Record<string, string>;

function captureRegistry(course: typeof currentCourse) {
  const namespace = course as typeof currentCourse & {
    default?: Record<string, unknown>;
  };
  const values = course as unknown as Record<string, unknown>;
  const registryKeys = acceptedPreA7Projection.predecessor.registryKeys;
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

const projectA7ThenC1 = (course: typeof currentCourse) =>
  historicalBeforeA8ThenA7ThenExistingContractRepair(course);

const historicalBeforePerformanceInvestigation = (course: typeof currentCourse) =>
  historicalBeforeA7Source(historicalBeforeCapstoneMaintenance(course));

it("restores the genuine pre-A7 registry without masking unrelated state", () => {
  const projected = historicalBeforePerformanceInvestigation(currentCourse);
  const registry = captureRegistry(projected);

  expect(hashJson(registry)).toBe(
    acceptedPreA7Projection.predecessor.wholeCourseSha256,
  );
  for (const key of acceptedPreA7Projection.predecessor.registryKeys) {
    expect(hashJson(registry[key])).toBe(predecessorRegistryHashes[key]);
  }
  expect(projected.lessons).toHaveLength(
    acceptedPreA7Projection.predecessor.counts.lessons,
  );
  expect(projected.modules).toHaveLength(
    acceptedPreA7Projection.predecessor.counts.modules,
  );
  expect(
    projected.lessons.some(
      (lesson) => lesson.id === "performance-evidence-investigation",
    ),
  ).toBe(false);
  expect(
    projected.modules.find((module) => module.id === "performance-evidence")
      ?.lessonIds,
  ).not.toContain("performance-evidence-investigation");
  expect(projected.delayedReviewExercises).toBe(
    currentCourse.delayedReviewExercises,
  );
  expect(projected.shortReviewExercises).toBe(
    currentCourse.shortReviewExercises,
  );
  expect(projected.project).toBe(currentCourse.project);
  expect(projected.ownershipModule).toBe(currentCourse.ownershipModule);
  expect(projected.reviewExerciseForId).toBe(currentCourse.reviewExerciseForId);
});

it("is idempotent and leaves the current namespace unmutated", () => {
  const before = captureRegistry(currentCourse);
  const projected = historicalBeforePerformanceInvestigation(currentCourse);

  expect(captureRegistry(currentCourse)).toEqual(before);
  expect(historicalBeforePerformanceInvestigation(projected)).toEqual(
    projected,
  );
});

it("projects a real synthetic default namespace independently", () => {
  const registryKeys = acceptedPreA7Projection.predecessor.registryKeys.filter(
    (key) => key !== "default",
  );
  const synthetic = {
    ...currentCourse,
    default: {
      ...Object.fromEntries(
        registryKeys.map((key) => [
          key,
          (currentCourse as unknown as Record<string, unknown>)[key],
        ]),
      ),
      unknownDefaultAlias: { marker: "keep" },
    },
  } as typeof currentCourse & {
    default: Record<string, unknown>;
  };
  const projected = historicalBeforePerformanceInvestigation(synthetic);
  const projectedDefault = (
    projected as typeof currentCourse & { default: Record<string, unknown> }
  ).default;

  expect(projectedDefault.unknownDefaultAlias).toEqual({ marker: "keep" });
  expect(
    (projectedDefault.lessons as typeof currentCourse.lessons).some(
      (lesson) => lesson.id === "performance-evidence-investigation",
    ),
  ).toBe(false);
  expect(
    hashJson(
      Object.fromEntries(
        registryKeys.map((key) => [key, projectedDefault[key]]),
      ),
    ),
  ).toBe(acceptedPreA7Projection.predecessor.registrySha256ByKey.default);
});

it("preserves unknown metadata and registry aliases while removing only exact A7 additions", () => {
  const target = currentCourse.lessons.find(
    (lesson) => lesson.id === "performance-evidence-investigation",
  )!;
  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === "performance-evidence-investigation"
        ? { ...lesson, unknownMetadata: { marker: "a7" } }
        : lesson,
    ),
    modules: currentCourse.modules.map((module) =>
      module.id === "performance-evidence"
        ? { ...module, unknownMetadata: { marker: "module" } }
        : module,
    ),
    reviewExercises: {
      ...currentCourse.reviewExercises,
      unknownRegistryAlias: { marker: "keep" },
    },
  } as unknown as typeof currentCourse & {
    unknownRegistryKey?: unknown;
  };
  mutated.unknownRegistryKey = { marker: "keep" };

  const projected = historicalBeforePerformanceInvestigation(mutated);
  expect(projected.reviewExercises.unknownRegistryAlias).toEqual({
    marker: "keep",
  });
  expect((projected as typeof mutated).unknownRegistryKey).toEqual({
    marker: "keep",
  });
  expect(
    (
      projected.modules.find(
        (module) => module.id === "performance-evidence",
      ) as (typeof currentCourse.modules)[number] & {
        unknownMetadata?: unknown;
      }
    ).unknownMetadata,
  ).toEqual({ marker: "module" });
  expect(target.id).toBe("performance-evidence-investigation");
});

it("does not remove a near-miss A7 lesson or module mutation", () => {
  const lesson = currentCourse.lessons.find(
    (candidate) => candidate.id === "performance-evidence-investigation",
  )!;
  const performanceStage = currentCourse.modules.find(
    (candidate) => candidate.id === "performance-evidence",
  )!;
  const nearMiss = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((candidate) =>
      candidate.id === lesson.id
        ? { ...candidate, title: `${candidate.title} near-miss` }
        : candidate,
    ),
    modules: currentCourse.modules.map((candidate) =>
      candidate.id === performanceStage.id
        ? {
            ...candidate,
            lessonIds: [...candidate.lessonIds.slice(0, -1), "wrong-successor"],
          }
        : candidate,
    ),
  };
  const projected = historicalBeforePerformanceInvestigation(nearMiss);

  expect(
    projected.lessons.find((candidate) => candidate.id === lesson.id)?.title,
  ).toBe(`${lesson.title} near-miss`);
  expect(
    projected.modules.find((candidate) => candidate.id === performanceStage.id)
      ?.lessonIds,
  ).toEqual([...performanceStage.lessonIds.slice(0, -1), "wrong-successor"]);
});

it("does not remove A7 files when an unrelated pre-existing file is mutated", () => {
  const project = currentCourse.projects.find(
    (candidate) => candidate.id === "log-analyzer-project",
  )!;
  const mutated = {
    ...currentCourse,
    projects: currentCourse.projects.map((candidate) => {
      if (candidate.id !== project.id) return candidate;
      if (!candidate.package) throw new Error("project package missing");
      return {
        ...candidate,
        package: {
          ...candidate.package,
          files: candidate.package.files.map((file, index) =>
            index === 0 ? { ...file, unrelatedMutation: true } : file,
          ),
        },
      };
    }),
  };
  const projected = historicalBeforePerformanceInvestigation(mutated);
  const projectedProject = projected.projects.find(
    (candidate) => candidate.id === project.id,
  );
  expect(projectedProject?.package).toBeDefined();
  if (!projectedProject?.package) throw new Error("project package missing");
  const files = projectedProject.package.files;

  expect(files).toHaveLength(26);
  expect(
    (files[0] as (typeof files)[number] & { unrelatedMutation?: boolean })
      .unrelatedMutation,
  ).toBe(true);
  expect(files.slice(-6).map((file) => file.path)).toEqual([
    "tests/support/a7_filtered_mixed_2048.rs",
    "tests/a7_performance_contract.rs",
    "tests/a7_filter_ignored_mutant.rs",
    "A7-PERFORMANCE-MANIFEST.json",
    "A7-REPLAY.md",
    "A7-INVESTIGATION.md",
  ]);
});

it("does not remove A7 files when an appended file is mutated", () => {
  const project = currentCourse.projects.find(
    (candidate) => candidate.id === "log-analyzer-project",
  )!;
  const mutated = {
    ...currentCourse,
    projects: currentCourse.projects.map((candidate) => {
      if (candidate.id !== project.id) return candidate;
      if (!candidate.package) throw new Error("project package missing");
      return {
        ...candidate,
        package: {
          ...candidate.package,
          files: candidate.package.files.map((file, index, files) =>
            index === files.length - 1
              ? {
                  ...file,
                  starter: `${file.starter ?? ""}\nappended-file-mutation`,
                }
              : file,
          ),
        },
      };
    }),
  };
  const projected = historicalBeforePerformanceInvestigation(mutated);
  const projectedProject = projected.projects.find(
    (candidate) => candidate.id === project.id,
  );
  expect(projectedProject?.package).toBeDefined();
  if (!projectedProject?.package) throw new Error("project package missing");
  expect(projectedProject.package.files).toHaveLength(26);
  expect(projectedProject.package.files.at(-1)?.starter).toContain(
    "appended-file-mutation",
  );
});

it("composes newest-first with the existing C1 historical projection", () => {
  const projected = projectA7ThenC1(currentCourse);
  const registry = captureRegistry(projected);

  expect(hashJson(registry)).toBe(
    acceptedPreA7Projection.predecessor.composedPreC1WholeCourseSha256,
  );
  expect(projected.lessons).toHaveLength(194);
});

it("composes an independent real default registry through A7 and C1", () => {
  const registryKeys = acceptedPreA7Projection.predecessor.registryKeys.filter(
    (key) => key !== "default",
  );
  const synthetic = {
    ...currentCourse,
    default: {
      ...Object.fromEntries(
        registryKeys.map((key) => [
          key,
          (currentCourse as unknown as Record<string, unknown>)[key],
        ]),
      ),
      unknownDefaultAlias: { marker: "keep" },
      helper: () => "keep",
    },
  } as typeof currentCourse & {
    default: Record<string, unknown>;
  };
  const projected = historicalBeforeA8ThenA7ThenExistingContractRepair(synthetic);
  const projectedDefault = projected.default as Record<string, unknown>;
  const knownDefault = Object.fromEntries(
    registryKeys.map((key) => [key, projectedDefault[key]]),
  );

  expect(hashJson(knownDefault)).toBe(
    acceptedPreC1Projection.predecessor.registrySha256ByKey.default,
  );
  expect(projectedDefault.unknownDefaultAlias).toEqual({ marker: "keep" });
  expect(projectedDefault.helper).toEqual(expect.any(Function));
  expect(
    (projectedDefault.lessons as typeof currentCourse.lessons).some(
      (lesson) => lesson.id === "performance-evidence-investigation",
    ),
  ).toBe(false);
});

it("keeps top-level and default-only mutations independent", () => {
  const target = currentCourse.lessons.find(
    (lesson) => lesson.id === "fuzz-campaign-evidence",
  )!;
  const registryKeys = acceptedPreA7Projection.predecessor.registryKeys.filter(
    (key) => key !== "default",
  );
  const synthetic = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === target.id
        ? { ...lesson, title: "top-only mutation" }
        : lesson,
    ),
    default: {
      ...Object.fromEntries(
        registryKeys.map((key) => [
          key,
          (currentCourse as unknown as Record<string, unknown>)[key],
        ]),
      ),
      lessons: currentCourse.lessons.map((lesson) =>
        lesson.id === target.id
          ? { ...lesson, title: "default-only mutation" }
          : lesson,
      ),
      unknownDefaultAlias: { marker: "keep" },
    },
  } as typeof currentCourse & {
    default: Record<string, unknown>;
  };
  const projected = historicalBeforeA8ThenA7ThenExistingContractRepair(synthetic);
  const defaultLessons = (projected.default as Record<string, unknown>)
    .lessons as typeof currentCourse.lessons;

  expect(
    projected.lessons.find((lesson) => lesson.id === target.id)?.title,
  ).toBe("top-only mutation");
  expect(defaultLessons.find((lesson) => lesson.id === target.id)?.title).toBe(
    "default-only mutation",
  );
  expect(
    (projected.default as Record<string, unknown>).unknownDefaultAlias,
  ).toEqual({ marker: "keep" });
});
