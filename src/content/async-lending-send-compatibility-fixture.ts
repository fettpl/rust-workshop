/** Test-only pre-A1 view. Remove exactly the declared additions; never saved state. */
import type * as Course from "./course";
import baseline from "./fixtures/async-send-pre-handoff.json";
export const sendHandoffLessonId = "async-lending-send-boundary";
export const sendHandoffStepIds = [
  "async-lending-send-boundary-handoff-model",
  "async-lending-send-boundary-prepared-handoff",
] as const;
export function historicalBeforeSendHandoff(course: typeof Course) {
  return {
    ...course,
    lessons: course.lessons.map((lesson) =>
      lesson.id !== sendHandoffLessonId
        ? lesson
        : {
            ...lesson,
            steps: lesson.steps.filter(
              (step) => !sendHandoffStepIds.some((id) => id === step.id),
            ),
          },
    ),
    modules: course.modules.map((module) =>
      module.id !== "async-lending-contracts"
        ? module
        : {
            ...module,
            exitGate: module.exitGate.map((line, index) =>
              index === 0 ? baseline.oldExitGateFirst : line,
            ),
            gateCriteria: module.gateCriteria?.map((criterion) =>
              criterion.id !== "async-lending-send-boundary-contract"
                ? criterion
                : {
                    ...criterion,
                    taskRefs: criterion.taskRefs.filter(
                      (ref) =>
                        !(
                          ref.lessonId === sendHandoffLessonId &&
                          ref.stepId === sendHandoffStepIds[1]
                        ),
                    ),
                  },
            ),
          },
    ),
  };
}
