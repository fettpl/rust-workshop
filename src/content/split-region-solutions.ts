import type { Lesson } from "../domain/types";

// These four implementations in either module pass all four opposite contracts.
// Keep the models, incomplete starters and distinct transfer tasks outside the group.
const ffi = [
  "split-regions-gate",
  "split-regions-alias-gate",
  "split-regions-blank",
  "split-regions-recall",
];
const miri = [
  "disjoint-regions-gate",
  "disjoint-regions-contract-gate",
  "disjoint-regions-blank",
  "disjoint-regions-recall",
];

export function linkSplitRegionSolutions(lesson: Lesson) {
  const fromFfi = lesson.id === "unsafe-ffi-split-regions";
  const sourceIds = fromFfi ? ffi : miri;
  const targetLessonId = fromFfi
    ? "unsafe-miri-disjoint-regions"
    : "unsafe-ffi-split-regions";
  const targets = (fromFfi ? miri : ffi).map((stepId) => ({
    lessonId: targetLessonId,
    stepId,
  }));
  for (const step of lesson.steps) {
    if (sourceIds.includes(step.id)) {
      step.suppliedSolutions = {
        ...step.suppliedSolutions,
        solution: [...(step.suppliedSolutions?.solution ?? []), ...targets],
      };
    }
  }
}
