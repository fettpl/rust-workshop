import {
  serviceOperationsLessons,
  serviceOperationsReviewExercises,
  serviceOperationsAssessmentSources,
} from "./service-operations";

export interface ServiceOperationsAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
}

const assessments = [
  ...serviceOperationsLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(serviceOperationsReviewExercises),
];

export const serviceOperationsAssessmentFixtures = assessments.map((step) => {
  const source = serviceOperationsAssessmentSources[step.id];
  if (!source)
    throw new Error(`Missing Service Operations fixture: ${step.id}`);
  return {
    id: step.id,
    equivalent: source.equivalent,
    mutant: source.mutant,
  };
});
