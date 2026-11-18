/** Test-only reversal of the reviewed November assessment repairs. */
import type { Lesson } from "../domain/types";
import eventReportDelta from "./fixtures/collections-event-report-delta.json";
import tokioShutdownDelta from "./fixtures/tokio-shutdown-gates-delta.json";
import delta from "./fixtures/workshop-assessment-repair-delta.json";
import ownershipDecisionDelta from "./fixtures/ownership-borrow-decision-delta.json";

type FieldRestoration = {
  lessonId: string;
  path: string[];
  before: unknown;
  beforeSha256: string;
  successorSha256: string;
};
type Projection = {
  baseline: { sha: string; lessonsSha256: string };
  restorations: Array<FieldRestoration & { stepId: string }>;
  lessonRestorations?: FieldRestoration[];
  appendedSteps: Array<{
    lessonId: string;
    index: number;
    id: string;
    successorSha256: string;
  }>;
};
const ownValue = (object: unknown, key: PropertyKey): unknown =>
  object !== null && typeof object === "object"
    ? Object.getOwnPropertyDescriptor(object, key)?.value
    : undefined;

function replaceField(
  object: object,
  key: PropertyKey,
  value: unknown,
  replacements: Map<unknown, unknown>,
) {
  const descriptors = Object.getOwnPropertyDescriptors(object);
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !("value" in descriptor)) return object;
  Reflect.set(descriptors, key, { ...descriptor, value });
  const copy = Array.isArray(object)
    ? Object.defineProperties([], descriptors)
    : Object.create(Object.getPrototypeOf(object), descriptors);
  replacements.set(object, copy);
  return copy;
}

function restorePath(
  object: object,
  path: string[],
  before: unknown,
  successor: string,
  predecessor: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): object {
  const [key, ...tail] = path;
  if (key === undefined) return object;
  const current = ownValue(object, key);
  if (tail.length > 0) {
    if (current === null || typeof current !== "object") return object;
    const restored = restorePath(
      current,
      tail,
      before,
      successor,
      predecessor,
      replacements,
      matches,
    );
    return restored === current
      ? object
      : replaceField(object, key, restored, replacements);
  }
  if (!matches(current, successor) || !matches(before, predecessor))
    return object;
  return replaceField(object, key, before, replacements);
}

function removeIndex<T>(array: T[], index: number): T[] {
  const descriptors: PropertyDescriptorMap = {};
  for (const key of Reflect.ownKeys(array)) {
    Reflect.set(descriptors, key, Object.getOwnPropertyDescriptor(array, key)!);
  }
  for (let next = index; next < array.length - 1; next++)
    descriptors[next] = descriptors[next + 1];
  delete descriptors[array.length - 1];
  descriptors.length = { ...descriptors.length, value: array.length - 1 };
  return Object.defineProperties([], descriptors);
}

/** Restores individual known fields; independent edits remain observable. */
function restoreReviewedLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
  projection: Projection = delta,
): Lesson[] {
  let result = lessons;
  for (const lessonId of new Set([
    ...(projection.lessonRestorations ?? []).map((entry) => entry.lessonId),
    ...projection.restorations.map((entry) => entry.lessonId),
    ...projection.appendedSteps.map((entry) => entry.lessonId),
  ])) {
    const indices = result.flatMap((lesson, index) =>
      ownValue(lesson, "id") === lessonId ? [index] : [],
    );
    if (indices.length !== 1) continue;
    const index = indices[0];
    const original = result[index];
    let restoredLesson = original;
    for (const entry of (projection.lessonRestorations ?? []).filter(
      (entry) => entry.lessonId === lessonId,
    )) {
      restoredLesson = restorePath(
        restoredLesson,
        entry.path,
        entry.before,
        entry.successorSha256,
        entry.beforeSha256,
        replacements,
        matches,
      ) as Lesson;
    }
    const originalSteps = ownValue(original, "steps");
    if (!Array.isArray(originalSteps)) continue;
    let steps = originalSteps;
    for (const entry of projection.restorations.filter(
      (entry) => entry.lessonId === lessonId,
    )) {
      const indices = steps.flatMap((step, index) =>
        ownValue(step, "id") === entry.stepId ? [index] : [],
      );
      if (indices.length !== 1) continue;
      const index = indices[0];
      const restored = restorePath(
        steps[index],
        entry.path,
        entry.before,
        entry.successorSha256,
        entry.beforeSha256,
        replacements,
        matches,
      );
      if (restored !== steps[index])
        steps = replaceField(
          steps,
          String(index),
          restored,
          replacements,
        ) as typeof steps;
    }
    for (const entry of projection.appendedSteps.filter(
      (entry) => entry.lessonId === lessonId,
    )) {
      const current = steps[entry.index];
      if (
        steps.filter((step) => ownValue(step, "id") === entry.id).length !==
          1 ||
        !matches(current, entry.successorSha256)
      )
        continue;
      const removed = removeIndex(steps, entry.index);
      replacements.set(steps, removed);
      steps = removed;
    }
    if (steps === originalSteps && restoredLesson === original) continue;
    const restored =
      steps === originalSteps
        ? restoredLesson
        : (replaceField(
            restoredLesson,
            "steps",
            steps,
            replacements,
          ) as Lesson);
    result = replaceField(
      result,
      String(index),
      restored,
      replacements,
    ) as Lesson[];
  }
  // Intermediate clones can result from several independent field restorations.
  // Resolve them so direct aliases point at the final instance, too.
  for (const [original, replacement] of replacements) {
    let final = replacement;
    while (replacements.has(final)) final = replacements.get(final);
    replacements.set(original, final);
  }
  return result;
}

/** Projects the reviewed event-report addition back to its predecessor catalog. */
export function restoreCollectionsEventLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(lessons, replacements, matches, eventReportDelta);
}

/** Removes only the exact authored Tokio transfer practice at its appended position. */
export function restoreTokioShutdownLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(
    restoreCollectionsEventLessons(lessons, replacements, matches),
    replacements,
    matches,
    tokioShutdownDelta,
  );
}

/** Reverses only the exact reviewed ownership decision repair for historical tests. */
export function restoreOwnershipBorrowDecisionLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
  projection: Projection = ownershipDecisionDelta,
): Lesson[] {
  return restoreReviewedLessons(
    restoreTokioShutdownLessons(lessons, replacements, matches),
    replacements,
    matches,
    projection,
  );
}

/** Compose the newer reviewed repair before the unchanged historical workshop delta. */
export function restoreWorkshopAssessmentLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
  projection: Projection = delta,
): Lesson[] {
  return restoreReviewedLessons(
    restoreOwnershipBorrowDecisionLessons(lessons, replacements, matches),
    replacements,
    matches,
    projection,
  );
}
