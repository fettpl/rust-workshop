/**
 * Test-only pre-A2 view.  The snapshot is captured from the accepted A1
 * source before cancellation/transfer authoring and is never regenerated from
 * the candidate course.  Remove only the two declared A2 steps and restore
 * the one changed criterion/module projection.
 */
import type * as Course from "./course";
import baseline from "./fixtures/async-cancel-pre-transfer.json";

export const cancellationTransferLessonId = "async-lending-cancel-commit";
export const cancellationTransferStepIds = [
  "async-lending-cancel-commit-reply-model",
  "async-lending-cancel-commit-lost-reply",
] as const;

export const acceptedCancellationLesson = baseline.lesson;
export const acceptedSendLesson = baseline.sendLesson;
export const acceptedCancellationModule = baseline.module;
export const acceptedBaselineInputs = {
  acceptedPreA2CourseSha256:
    "07f4b4bd0e6a825ac04483e525a757e884d40d3b6ef66ba54ff2daf4183c7c02",
  acceptedSourceFilesSha256:
    "57f1a345a8531675613880754db863a3c2317fe066be82af95e330c929f5ffb7",
  captureResultSha256:
    "aea8f68139d3dfbf1012d7d394030c93f14c9dd88583c687ff09243b26b54051",
} as const;
export const acceptedCancellationCriterion = baseline.module.gateCriteria.find(
  (criterion) => criterion.id === "async-lending-cancel-commit-contract",
)!;

export function historicalBeforeCancellationTransfer(course: typeof Course) {
  return {
    ...course,
    lessons: course.lessons.map((lesson) =>
      lesson.id !== cancellationTransferLessonId
        ? lesson
        : {
            ...lesson,
            steps: lesson.steps.filter(
              (step) =>
                !cancellationTransferStepIds.includes(
                  step.id as (typeof cancellationTransferStepIds)[number],
                ),
            ),
          },
    ),
    modules: course.modules.map((module) =>
      module.id !== "async-lending-contracts"
        ? module
        : {
            ...module,
            exitGate: module.exitGate.map((line, index) =>
              index === 0 ? baseline.module.exitGate[0] : line,
            ),
            gateCriteria: module.gateCriteria?.map((criterion) =>
              criterion.id !== "async-lending-cancel-commit-contract"
                ? criterion
                : {
                    ...criterion,
                    taskRefs: criterion.taskRefs.filter(
                      (ref) =>
                        !(
                          ref.lessonId === cancellationTransferLessonId &&
                          ref.stepId === cancellationTransferStepIds[1]
                        ),
                    ),
                  },
            ),
          },
    ),
  };
}
