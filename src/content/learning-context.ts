import {
  recordEvidence,
  recordLessonExposure,
  evidencePolicyForConcepts,
} from "@/engine/learning";
import {
  revealProjectPackageVariant,
  type PackageVariant,
} from "@/domain/project-package";
import type {
  EvidenceEvent,
  LessonExposure,
  Lesson,
  ProjectPackage,
  UserState,
} from "@/domain/types";
import { concepts } from "./course";

const courseEvidencePolicy = evidencePolicyForConcepts(concepts);

/** Course boundary: apply authored artifact policy to every recorded event. */
export function recordCourseEvidence(
  state: UserState,
  event: EvidenceEvent,
): UserState {
  return recordEvidence(state, event, courseEvidencePolicy);
}

/** Course boundary: apply authored artifact policy to neutral lesson exposure. */
export function recordCourseLessonExposure(
  state: UserState,
  exposure: LessonExposure,
): UserState {
  return recordLessonExposure(state, exposure, courseEvidencePolicy);
}

/** Course boundary: expose only the refs belonging to the requested archive variant. */
export function revealCourseProjectPackageVariant(
  state: UserState,
  project: ProjectPackage,
  lessons: Lesson[],
  variant: PackageVariant,
  now: number,
): UserState {
  return revealProjectPackageVariant(
    state,
    project,
    lessons,
    variant,
    now,
    courseEvidencePolicy,
  );
}
