import { historicalBeforeSlotLazyInit } from "./unsafe-miri-slot-lazy-init-compatibility-fixture";
import { historicalBeforeDependencyRefresh } from "./dependency-maintenance-compatibility-fixture";
import { createHash } from "node:crypto";
import type * as Course from "./course";
import baseline from "./fixtures/unsafe-miri-pre-disjoint-ranges.json";
import type { CourseModule, ModuleGateCriterion } from "../domain/types";

export const disjointRangesLessonId = "unsafe-miri-disjoint-regions" as const;
export const disjointRangesStepIds = [
  "disjoint-regions-range-model",
  "disjoint-regions-range-transfer",
] as const;
export const disjointRangesPrimaryStepId = disjointRangesStepIds[1];
export const disjointRangesFamily = "unsafe-miri/disjoint-ranges-v1" as const;
export const acceptedPreDisjointRangesCourseSha256 = baseline.wholeCourseSha256;

const currentSubtitle =
  "Zachowaj rozłączność `&mut` na obu krawędziach, także przy dwóch zakresach wybranych przez wywołującego.";
const currentOutcome =
  "Przeniesiesz dowód na dwa półotwarte zakresy z kolejnością podanych zakresów i jawną polityką pustych zakresów.";
const currentExitGate =
  "Podzielisz mutowalny bufor po obu krawędziach bez aliasowania, a następnie wybierzesz dwa rozłączne zakresy z zachowaniem kolejności podanych zakresów; druga forma starego podziału nie tworzy nowej rodziny.";
const newCriterionRef = {
  lessonId: disjointRangesLessonId,
  stepId: disjointRangesPrimaryStepId,
};
const expectedPostDisjointMiriProjectSha256 =
  "d89637d76561828110eaedcb72b82f652b41fd04896effc7a64fffa39efba8c3";

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function removeNewLessonShape(lesson: (typeof Course.lessons)[number]) {
  return {
    ...lesson,
    steps: lesson.steps.filter(
      (step) =>
        !disjointRangesStepIds.includes(
          step.id as (typeof disjointRangesStepIds)[number],
        ),
    ),
    subtitle:
      lesson.subtitle === currentSubtitle
        ? baseline.lesson.subtitle
        : lesson.subtitle,
    outcomes: lesson.outcomes.filter((outcome) => outcome !== currentOutcome),
  };
}

function removeNewCriterionRef(criterion: ModuleGateCriterion) {
  if (criterion.id !== "unsafe-miri-disjoint-regions-gate") return criterion;
  return {
    ...criterion,
    taskRefs: criterion.taskRefs.filter(
      (ref) =>
        ref.lessonId !== newCriterionRef.lessonId ||
        ref.stepId !== newCriterionRef.stepId,
    ),
  };
}

function removeNewModuleShape(module: CourseModule) {
  if (module.id !== "unsafe-miri-contracts") return module;
  return {
    ...module,
    exitGate: module.exitGate?.map((text) =>
      text === currentExitGate ? baseline.module.exitGate[1] : text,
    ),
    gateCriteria: module.gateCriteria?.map(removeNewCriterionRef),
  };
}

function removeNewProjectDelta(course: typeof Course) {
  return course.projects.map((project) => {
    if (project.id !== "miri-safety") return project;
    if (hashJson(project) !== expectedPostDisjointMiriProjectSha256)
      return project;
    return baseline.project as typeof project;
  });
}

/**
 * Project the assembled course back to the exact course before disjoint ranges.
 * The package replacement is guarded by the complete reviewed successor hash so
 * unrelated project edits remain visible and fail the frozen digest.
 */
export function historicalBeforeDisjointRanges(current: typeof Course) {
  const course = historicalBeforeDependencyRefresh(
    historicalBeforeSlotLazyInit(current),
  );
  return {
    ...course,
    lessons: course.lessons.map((lesson) =>
      lesson.id === disjointRangesLessonId
        ? removeNewLessonShape(lesson)
        : lesson,
    ),
    modules: course.modules.map(removeNewModuleShape),
    projects: removeNewProjectDelta(course),
  };
}
