import multiArchivesDelta from "./fixtures/multi-archives-delta.json";
import projectArchivesDelta from "./fixtures/project-archives-delta.json";
import crossModuleDelta from "./fixtures/cross-module-delta.json";
import allVariantsDelta from "./fixtures/all-variants-delta.json";
import remainingDelta from "./fixtures/remaining-criteria-delta.json";
import practiceDelta from "./fixtures/independent-practice-delta.json";
/** Test-only reversal of the reviewed November assessment repairs. */
import type { Lesson } from "../domain/types";
import curriculumRecoveryDelta from "./fixtures/curriculum-recovery-nov19-delta.json";
import regressionDelta from "./fixtures/regression-skills-delta.json";
import firstEvenDelta from "./fixtures/first-even-assessment-delta.json";
import exerciseDelta from "./fixtures/exercise-contracts-delta.json";
import recoveryPracticeDelta from "./fixtures/recovery-practice-delta.json";
import foundationsRangeDelta from "./fixtures/foundations-range-gate-delta.json";
import logRecallDelta from "./fixtures/log-analyzer-recall-delta.json";
import eventReportDelta from "./fixtures/collections-event-report-delta.json";
import tokioShutdownDelta from "./fixtures/tokio-shutdown-gates-delta.json";
import delta from "./fixtures/workshop-assessment-repair-delta.json";
import ownershipDecisionDelta from "./fixtures/ownership-borrow-decision-delta.json";

type FieldRestoration = {
  lessonId: string;
  path: string[];
  before: unknown;
  beforeSha256: string | null;
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
  predecessor: string | null,
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
  // A null predecessor hash records a field absent from the previous object.
  if (predecessor === null) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (
      before !== null ||
      !matches(current, successor) ||
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true ||
      descriptor.writable !== true ||
      descriptor.configurable !== true
    )
      return object;
    const descriptors = Object.getOwnPropertyDescriptors(object);
    delete descriptors[key];
    const copy = Object.create(Object.getPrototypeOf(object), descriptors);
    replacements.set(object, copy);
    return copy;
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
    ).sort((a, b) => b.index - a.index)) {
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

// Repeated worked examples share their predecessor value in the fixture.
const beforeValues: Record<string, unknown> = { ...multiArchivesDelta.beforeValues, ...projectArchivesDelta.beforeValues, ...crossModuleDelta.beforeValues, ...allVariantsDelta.beforeValues, ...remainingDelta.beforeValues, ...practiceDelta.beforeValues };
function withPredecessor<T extends { beforeSha256: string | null }>(entry: T) {
  return { ...entry, before: entry.beforeSha256 === null ? null : beforeValues[entry.beforeSha256] };
}
const practiceLessons = {
  ...practiceDelta,
  restorations: practiceDelta.restorations.map(withPredecessor),
  lessonRestorations: practiceDelta.lessonRestorations.map(withPredecessor),
};
const practiceRegistries = practiceDelta.registries.map(withPredecessor);

const multiArchivesLessons = {
  ...multiArchivesDelta,
  restorations: multiArchivesDelta.restorations.map(withPredecessor),
  lessonRestorations: multiArchivesDelta.lessonRestorations.map(withPredecessor),
};
const multiArchivesRegistries = multiArchivesDelta.registries.map(withPredecessor);

export function restoreMultiArchivesLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(lessons, replacements, matches, multiArchivesLessons);
}

export function restoreMultiArchivesRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, multiArchivesRegistries);
}

const projectArchivesLessons = {
  ...projectArchivesDelta,
  restorations: projectArchivesDelta.restorations.map(withPredecessor),
  lessonRestorations: projectArchivesDelta.lessonRestorations.map(withPredecessor),
};
const projectArchivesRegistries = projectArchivesDelta.registries.map(withPredecessor);

export function restoreProjectArchivesLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(restoreMultiArchivesLessons(lessons, replacements, matches), replacements, matches, projectArchivesLessons);
}

export function restoreProjectArchivesRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, [...multiArchivesRegistries, ...projectArchivesRegistries]);
}

const crossModuleLessons = {
  ...crossModuleDelta,
  restorations: crossModuleDelta.restorations.map(withPredecessor),
  lessonRestorations: crossModuleDelta.lessonRestorations.map(withPredecessor),
};
const crossModuleRegistries = crossModuleDelta.registries.map(withPredecessor);

export function restoreCrossModuleLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(restoreProjectArchivesLessons(lessons, replacements, matches), replacements, matches, crossModuleLessons);
}

export function restoreCrossModuleRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, [...multiArchivesRegistries, ...projectArchivesRegistries, ...crossModuleRegistries]);
}

const allVariantsLessons = {
  ...allVariantsDelta,
  restorations: allVariantsDelta.restorations.map(withPredecessor),
  lessonRestorations: allVariantsDelta.lessonRestorations.map(withPredecessor),
};
const allVariantsRegistries = allVariantsDelta.registries.map(withPredecessor);

export function restoreAllVariantsLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(restoreCrossModuleLessons(lessons, replacements, matches), replacements, matches, allVariantsLessons);
}

export function restoreAllVariantsRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, [...multiArchivesRegistries, ...projectArchivesRegistries, ...crossModuleRegistries, ...allVariantsRegistries]);
}

const remainingLessons = {
  ...remainingDelta,
  restorations: remainingDelta.restorations.map(withPredecessor),
  lessonRestorations: remainingDelta.lessonRestorations.map(withPredecessor),
};
const remainingRegistries = remainingDelta.registries.map(withPredecessor);

export function restoreRemainingCriteriaLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(restoreAllVariantsLessons(lessons, replacements, matches), replacements, matches, remainingLessons);
}

export function restoreRemainingCriteriaRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, [...multiArchivesRegistries, ...projectArchivesRegistries, ...crossModuleRegistries, ...allVariantsRegistries, ...remainingRegistries]);
}

export function restoreIndependentPracticeLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(restoreRemainingCriteriaLessons(lessons, replacements, matches), replacements, matches, practiceLessons);
}

export function restoreIndependentPracticeRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): T {
  return restoreCurriculumRecoveryRegistry(registry, name, replacements, matches, [...multiArchivesRegistries, ...projectArchivesRegistries, ...crossModuleRegistries, ...allVariantsRegistries, ...remainingRegistries, ...practiceRegistries]);
}

/** Restores this batch first, so all older projections still see their authored successors. */
export function restoreCurriculumRecoveryLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(
    restoreIndependentPracticeLessons(lessons, replacements, matches),
    replacements,
    matches,
    curriculumRecoveryDelta,
  );
}

type RegistryRestoration = {
  registry: string;
  selector: string;
  id?: string;
  path: string[];
  before: unknown;
  beforeSha256: string | null;
  successorSha256: string;
};

/** Field-level registry restoration, preserving unmatched drift and object descriptors. */
export function restoreCurriculumRecoveryRegistry<T extends object>(
  registry: T,
  name: string,
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
  entries: readonly RegistryRestoration[] = [...multiArchivesRegistries, ...projectArchivesRegistries, ...crossModuleRegistries, ...allVariantsRegistries, ...remainingRegistries, ...practiceRegistries, ...curriculumRecoveryDelta.registries],
): T {
  let result = registry;
  for (const entry of entries.filter(
    (item) =>
      item.registry === name ||
      (name === "reviewExercisesById" && item.registry === "reviewExercises"),
  )) {
    const selected = Array.isArray(result)
      ? result.flatMap((value, index) =>
          ownValue(value, "id") === entry.selector ? [String(index)] : [],
        )
      : [name === "reviewExercisesById" ? entry.id! : entry.selector];
    if (selected.length !== 1) continue;
    const key = selected[0];
    const current = ownValue(result, key);
    if (current === null || typeof current !== "object") continue;
    if (entry.id && ownValue(current, "id") !== entry.id) continue;
    const cached = replacements.get(current);
    const base =
      cached !== null && typeof cached === "object" ? cached : current;
    const restored = restorePath(
      base,
      entry.path,
      entry.before,
      entry.successorSha256,
      entry.beforeSha256,
      replacements,
      matches,
    );
    if (restored !== current) {
      replacements.set(current, restored);
      result = replaceField(result, key, restored, replacements);
    }
  }
  for (const [original, replacement] of replacements) {
    let final = replacement;
    while (replacements.has(final)) final = replacements.get(final);
    replacements.set(original, final);
  }
  return result;
}

export function restoreRecoveryPracticeLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  const recovered = restoreCurriculumRecoveryLessons(
    lessons,
    replacements,
    matches,
  );
  const beforeSplit = restoreReviewedLessons(
    recovered,
    replacements,
    matches,
    regressionDelta,
  );
  const beforeFirstEven = restoreReviewedLessons(
    beforeSplit,
    replacements,
    matches,
    firstEvenDelta,
  );
  return restoreReviewedLessons(
    restoreReviewedLessons(
      beforeFirstEven,
      replacements,
      matches,
      exerciseDelta,
    ),
    replacements,
    matches,
    recoveryPracticeDelta,
  );
}

export function restoreFoundationsRangeLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(
    restoreRecoveryPracticeLessons(lessons, replacements, matches),
    replacements,
    matches,
    foundationsRangeDelta,
  );
}

/** Reverses only the reviewed fields of the three Log Analyzer recall questions. */
export function restoreLogAnalyzerRecallLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(
    restoreFoundationsRangeLessons(lessons, replacements, matches),
    replacements,
    matches,
    logRecallDelta,
  );
}

/** Projects the reviewed event-report addition back to its predecessor catalog. */
export function restoreCollectionsEventLessons(
  lessons: Lesson[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): Lesson[] {
  return restoreReviewedLessons(
    restoreLogAnalyzerRecallLessons(lessons, replacements, matches),
    replacements,
    matches,
    eventReportDelta,
  );
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
