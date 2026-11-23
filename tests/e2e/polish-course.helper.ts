import { getLocalizedCourse } from "../../src/i18n/course";

// Polish browser scenarios navigate by the titles a learner sees. The locale
// projection preserves lesson IDs, evaluator inputs and executable examples.
export * from "../../src/content/course";
export const {
  modules,
  lessons,
  projects,
  concepts,
  reviewExercises,
  reviewExercisesById,
} = getLocalizedCourse("pl");
