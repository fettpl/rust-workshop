/** Test-only pre-initialized-prefix projection; the accepted bytes are immutable. */
import type * as Course from "./course";
import baseline from "./fixtures/unsafe-miri-pre-prefix.json";
import { historicalBeforeDisjointRanges } from "./unsafe-miri-disjoint-ranges-compatibility-fixture";

export const initializedPrefixLessonId = "unsafe-miri-byte-view";
export const initializedPrefixStepIds = [
  "byte-view-initialized-prefix-model",
  "byte-view-initialized-prefix",
] as const;
export const initializedPrefixPrimaryStepId = initializedPrefixStepIds[1];
export const initializedPrefixConceptId = "unsafe-miri-byte-view-contract";
export const initializedPrefixFamily = "unsafe-miri/initialized-prefix-v1";
export const acceptedInitializedPrefixBaseline = baseline;
export const acceptedPreInitializedPrefixCourseSha256 =
  baseline.wholeCourseSha256;

export function historicalBeforeInitializedPrefix(course: typeof Course) {
  const beforeDisjointRanges = historicalBeforeDisjointRanges(course);
  return {
    ...beforeDisjointRanges,
    lessons: beforeDisjointRanges.lessons.map((lesson) =>
      lesson.id !== initializedPrefixLessonId
        ? lesson
        : {
            ...lesson,
            steps: lesson.steps.filter(
              (step) =>
                !initializedPrefixStepIds.includes(
                  step.id as (typeof initializedPrefixStepIds)[number],
                ),
            ),
          },
    ),
    modules: beforeDisjointRanges.modules.map((module) =>
      module.id !== "unsafe-miri-contracts"
        ? module
        : {
            ...module,
            gateCriteria: module.gateCriteria?.map((criterion) =>
              criterion.id !== "unsafe-miri-byte-view-gate"
                ? criterion
                : {
                    ...criterion,
                    taskRefs: criterion.taskRefs.filter(
                      (ref) =>
                        !(
                          ref.lessonId === initializedPrefixLessonId &&
                          ref.stepId === initializedPrefixPrimaryStepId
                        ),
                    ),
                  },
            ),
          },
    ),
  };
}
