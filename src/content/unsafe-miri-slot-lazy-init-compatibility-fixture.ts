/** Test-only predecessor projection for the reviewed slot lazy-init successor. */
import { createHash } from "node:crypto";
import type * as Course from "./course";
import type { ModuleGateCriterion, ProjectContract } from "../domain/types";

export const slotLazyInitLessonId = "unsafe-miri-slot-state" as const;
export const slotLazyInitStepIds = [
  "slot-state-lazy-init-model",
  "slot-state-lazy-init-transfer",
] as const;
export const slotLazyInitPrimaryStepId = slotLazyInitStepIds[1];
export const expectedPostSlotMiriProjectSha256 =
  "02fc7cfeb73ce283ef977b068ec4423f269e934b5b3e1a40938a805463a5cb3c";
export const expectedPreSlotMiriProjectSha256 =
  "d89637d76561828110eaedcb72b82f652b41fd04896effc7a64fffa39efba8c3";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function removeNewLessonShape(lesson: (typeof Course.lessons)[number]) {
  if (lesson.id !== slotLazyInitLessonId) return lesson;
  return {
    ...lesson,
    steps: lesson.steps.filter(
      (step) =>
        !slotLazyInitStepIds.includes(
          step.id as (typeof slotLazyInitStepIds)[number],
        ),
    ),
  };
}

function removeNewCriterionRef(criterion: ModuleGateCriterion) {
  if (criterion.id !== "unsafe-miri-slot-state-gate") return criterion;
  return {
    ...criterion,
    taskRefs: criterion.taskRefs.filter(
      (ref) =>
        !(
          ref.lessonId === slotLazyInitLessonId &&
          ref.stepId === slotLazyInitPrimaryStepId
        ),
    ),
  };
}

function removeNewModuleShape(module: (typeof Course.modules)[number]) {
  if (module.id !== "unsafe-miri-contracts") return module;
  return {
    ...module,
    gateCriteria: module.gateCriteria?.map(removeNewCriterionRef),
  };
}

function removeNewProjectDelta(project: ProjectContract) {
  if (project.id !== "miri-safety" || !project.package) return project;
  if (hashJson(project) !== expectedPostSlotMiriProjectSha256) return project;
  const restored = {
    ...project,
    package: {
      ...project.package,
      files: project.package.files.filter(
        (file) => file.path !== "tests/slot_lazy_init.rs",
      ),
      revealStepRefs: project.package.revealStepRefs.filter(
        (ref) =>
          !(
            ref.lessonId === slotLazyInitLessonId &&
            ref.stepId === slotLazyInitPrimaryStepId
          ),
      ),
    },
  };
  if (hashJson(restored) !== expectedPreSlotMiriProjectSha256) {
    throw new Error("Invalid slot lazy-init predecessor project identity");
  }
  return restored;
}

/**
 * Project the assembled course back to the exact e1 predecessor before this
 * feature. This adapter is intentionally before dependency/disjoint helpers;
 * it never imports a later predecessor projection.
 */
export function historicalBeforeSlotLazyInit(current: typeof Course) {
  return {
    ...current,
    lessons: current.lessons.map(removeNewLessonShape),
    modules: current.modules.map(removeNewModuleShape),
    projects: current.projects.map(removeNewProjectDelta),
  };
}
