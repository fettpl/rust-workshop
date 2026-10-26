import { createHash } from "node:crypto";
import type * as Course from "./course";
import type { ModuleGateCriterion, ProjectContract } from "../domain/types";
import { mutSlotWithMutSessionStop } from "./unsafe-miri-mut-slot-with-mut";
export { mutSlotWithMutSessionStop };

export const mutSlotWithMutLessonId = "unsafe-miri-mut-slot" as const;
export const mutSlotWithMutStepIds = [
  "mut-slot-with-mut-model",
  "mut-slot-with-mut-transfer",
] as const;
export const mutSlotWithMutPrimaryStepId = mutSlotWithMutStepIds[1];
export const expectedPostMutSlotWithMutProjectSha256 =
  "bccb5c470eded65abbc31482e1c3da5afa672206d0d5e174f9dbb491dd5fc0e4";
export const expectedPreMutSlotWithMutProjectSha256 =
  "02fc7cfeb73ce283ef977b068ec4423f269e934b5b3e1a40938a805463a5cb3c";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function removeNewLessonShape(lesson: (typeof Course.lessons)[number]) {
  if (lesson.id !== mutSlotWithMutLessonId) return lesson;
  const lessonWithoutStops = { ...lesson };
  delete lessonWithoutStops.sessionStops;
  const remainingStops = lesson.sessionStops?.filter(
    (stop) =>
      stop.afterStepId !== mutSlotWithMutSessionStop.afterStepId ||
      stop.title !== mutSlotWithMutSessionStop.title ||
      stop.nextGoal !== mutSlotWithMutSessionStop.nextGoal,
  );
  return {
    ...lessonWithoutStops,
    steps: lesson.steps.filter(
      (step) =>
        !mutSlotWithMutStepIds.includes(
          step.id as (typeof mutSlotWithMutStepIds)[number],
        ),
    ),
    ...(remainingStops && remainingStops.length > 0
      ? { sessionStops: remainingStops }
      : {}),
  };
}

function removeNewCriterionRef(criterion: ModuleGateCriterion) {
  if (criterion.id !== "unsafe-miri-mut-slot-gate") return criterion;
  return {
    ...criterion,
    taskRefs: criterion.taskRefs.filter(
      (ref) =>
        !(
          ref.lessonId === mutSlotWithMutLessonId &&
          ref.stepId === mutSlotWithMutPrimaryStepId
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
  if (hashJson(project) !== expectedPostMutSlotWithMutProjectSha256) {
    return project;
  }
  const restored = {
    ...project,
    package: {
      ...project.package,
      files: project.package.files.filter(
        (file) => file.path !== "tests/mut_slot_with_mut.rs",
      ),
      revealStepRefs: project.package.revealStepRefs.filter(
        (ref) =>
          !(
            ref.lessonId === mutSlotWithMutLessonId &&
            ref.stepId === mutSlotWithMutPrimaryStepId
          ),
      ),
    },
  };
  if (hashJson(restored) !== expectedPreMutSlotWithMutProjectSha256) {
    throw new Error("Invalid MutSlot with_mut predecessor project identity");
  }
  return restored;
}

/**
 * Project the assembled course to the exact 8a predecessor before this
 * callback-transfer feature. A later compatibility stage may compose this
 * result with historicalBeforeSlotLazyInit; this helper never removes older
 * Slot, range, or project changes.
 */
export function historicalBeforeMutSlotWithMut(current: typeof Course) {
  return {
    ...current,
    lessons: current.lessons.map(removeNewLessonShape),
    modules: current.modules.map(removeNewModuleShape),
    projects: current.projects.map(removeNewProjectDelta),
  };
}
