import { expect, it } from "vitest";
import * as rawCurrentCourse from "./course";
import { historicalBeforeA11 } from "./file-schema-evolution-compatibility-fixture";
const currentCourse = historicalBeforeA11(rawCurrentCourse);
import {
  a10PreAuthoringRegistrySha256ByKey,
  hashJson,
  historicalBeforeA10,
  historicalBeforeA10ThenA9,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair,
  a10CaptureBinding,
  a10GenuineRegistrySha256,
  a10GenuineStateSha256,
  a10WholeCourseSha256,
} from "./service-client-retry-compatibility-fixture";
import {
  historicalBeforeA9,
  historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair,
} from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";

it("restores the genuine pre-A10 registry without mutating current content", () => {
  const input = {
    ...currentCourse,
    default: Object.fromEntries(
      Object.keys(a10PreAuthoringRegistrySha256ByKey)
        .filter((key) => key !== "default")
        .map((key) => [key, (currentCourse as Record<string, unknown>)[key]]),
    ),
  } as typeof currentCourse & { default: Record<string, unknown> };
  const projected = historicalBeforeA10(input);
  expect(currentCourse.lessons.some((lesson) => lesson.id === "service-client-bounded-retry")).toBe(true);
  expect(projected.lessons.some((lesson) => lesson.id === "service-client-bounded-retry")).toBe(false);
  for (const key of Object.keys(a10PreAuthoringRegistrySha256ByKey)) {
    const value = key === "default" ? (projected as typeof projected & { default?: unknown }).default : projected[key as keyof typeof projected];
    expect(hashJson(value), key).toBe(a10PreAuthoringRegistrySha256ByKey[key as keyof typeof a10PreAuthoringRegistrySha256ByKey]);
  }
  expect(historicalBeforeA10(projected)).toEqual(projected);
  expect(projected.reviewExerciseForId).toBe(input.reviewExerciseForId);
});

it("composes newest-first with A9 and older accepted adapters", () => {
  const beforeA10 = historicalBeforeA10(currentCourse);
  expect(historicalBeforeA10ThenA9(currentCourse)).toEqual(historicalBeforeA9(beforeA10));
  expect(historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair(currentCourse)).toEqual(
    historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair(beforeA10),
  );
});

it("fails closed for a near-miss successor and preserves unknown members", () => {
  const input = {
    ...currentCourse,
    unknownMarker: { source: "synthetic", keep: true },
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === "service-client-bounded-retry"
        ? { ...lesson, title: `${lesson.title} mutation` }
        : lesson,
    ),
    default: {
      ...(currentCourse as typeof currentCourse & { default: object }).default,
      lessons: currentCourse.lessons,
    },
  } as typeof currentCourse & { unknownMarker: { source: string; keep: boolean }; default: typeof currentCourse };
  const projected = historicalBeforeA10(input);
  expect(projected.lessons.some((lesson) => lesson.id === "service-client-bounded-retry")).toBe(true);
  expect(projected.lessons.find((lesson) => lesson.id === "service-client-bounded-retry")?.title).toContain("mutation");
  expect(projected.unknownMarker).toEqual(input.unknownMarker);
});

it("does not partially strip a missing or moved successor", () => {
  const input = {
    ...currentCourse,
    lessons: currentCourse.lessons.filter((lesson) => lesson.id !== "service-client-ambiguous-driver"),
  };
  const projected = historicalBeforeA10(input);
  expect(projected.lessons.some((lesson) => lesson.id === "service-client-bounded-retry")).toBe(true);
  expect(projected.lessons.some((lesson) => lesson.id === "service-client-ambiguous-driver")).toBe(false);
});

it("binds the private capture identity constants without importing private capture data", () => {
  for (const digest of [a10GenuineRegistrySha256, a10GenuineStateSha256, a10WholeCourseSha256])
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  expect(Object.keys(a10PreAuthoringRegistrySha256ByKey)).toEqual([
    "competencies", "concepts", "default", "delayedReviewExercises", "lessons", "modules",
    "ownershipModule", "project", "projects", "reviewExercises", "reviewExercisesById",
    "roadmap", "shortReviewExercises", "sources", "traces",
  ]);
  expect(a10CaptureBinding).toEqual({
    registryPath: "research/authentic-pre-a10-registry.json",
    registrySha256: a10GenuineRegistrySha256,
    statePath: "research/state-history-pre-a10.json",
    stateSha256: a10GenuineStateSha256,
    wholeCourseSha256: a10WholeCourseSha256,
  });
});
