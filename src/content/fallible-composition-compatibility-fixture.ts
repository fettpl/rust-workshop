/** Test-only historical view: named new additions are checked separately by integration tests.
 * This never edits or upgrades saved state, identity fixtures, or production registries.
 */
import type * as Course from "./course";
const additions = new Set([
  "fallible-value-composition",
  "fallible-iterator-contracts",
]);
const sources = new Set(["fallible-std-option", "fallible-std-result"]);
const gates = new Set([
  "iterators-fallible-values-gate",
  "iterators-fallible-rows-gate",
]);
export function historicalBeforeFallibleComposition(course: typeof Course) {
  return {
    ...course,
    lessons: course.lessons.filter((lesson) => !additions.has(lesson.id)),
    concepts: course.concepts.filter((concept) => !additions.has(concept.id)),
    sources: course.sources.filter((source) => !sources.has(source.id)),
    reviewExercises: Object.fromEntries(
      Object.entries(course.reviewExercises).filter(
        ([id]) => !additions.has(id),
      ),
    ) as typeof course.reviewExercises,
    reviewExercisesById: Object.fromEntries(
      Object.entries(course.reviewExercisesById).filter(
        ([, step]) =>
          !["review-fallible-retry-delay", "review-fallible-flags"].includes(
            step.id,
          ),
      ),
    ),
    modules: course.modules.map((module) =>
      module.id !== "iterators"
        ? module
        : {
            ...module,
            lessonIds: module.lessonIds.filter((id) => !additions.has(id)),
            gateCriteria: module.gateCriteria?.filter(
              (gate) => !gates.has(gate.id),
            ),
          },
    ),
  };
}
