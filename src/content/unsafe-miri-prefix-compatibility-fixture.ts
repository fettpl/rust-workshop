/** Test-only pre-initialized-prefix projection; the accepted bytes are immutable. */
import type * as Course from "./course";
import baseline from "./fixtures/unsafe-miri-pre-prefix.json";

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
  return {
    ...course,
    lessons: course.lessons.map((lesson) =>
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
    modules: course.modules.map((module) =>
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
