/** Test-only, explicitly named Feature2 projection; immutable older fixtures remain unchanged. */
import type * as Course from "./course";
const lessonId = "documentation-guided-repair";
const sourceIds = new Set([
  "docs-str-strip-prefix",
  "docs-str-split-once",
  "docs-str-rsplit-once",
  "docs-rustc-explain",
  "docs-cargo-doc",
  "docs-rustdoc",
]);
export function historicalBeforeDocumentationRepair(course: typeof Course) {
  return {
    ...course,
    lessons: course.lessons.filter((l) => l.id !== lessonId),
    concepts: course.concepts.filter((c) => c.id !== lessonId),
    sources: course.sources.filter((s) => !sourceIds.has(s.id)),
    reviewExercises: Object.fromEntries(
      Object.entries(course.reviewExercises).filter(([id]) => id !== lessonId),
    ) as typeof course.reviewExercises,
    reviewExercisesById: Object.fromEntries(
      Object.entries(course.reviewExercisesById).filter(
        ([, step]) => step.id !== "review-documentation-revision",
      ),
    ),
    modules: course.modules.map((m) =>
      m.id !== "testing-quality"
        ? m
        : {
            ...m,
            lessonIds: m.lessonIds.filter((id) => id !== lessonId),
            gateCriteria: m.gateCriteria?.filter(
              (g) => g.id !== "testing-documentation-repair-gate",
            ),
          },
    ),
  };
}
