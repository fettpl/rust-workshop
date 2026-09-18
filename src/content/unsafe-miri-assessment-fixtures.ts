import {
  unsafeMiriAssessmentSources,
  unsafeMiriLessons,
  unsafeMiriReviewExercises,
} from "./unsafe-miri";

export interface UnsafeMiriAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
}

function sourceFor(id: string, solution: string) {
  const source = id.includes("byte-view")
    ? unsafeMiriAssessmentSources.byteView
    : id.includes("disjoint-regions")
      ? unsafeMiriAssessmentSources.disjointRegions
      : id.includes("slot-state")
        ? unsafeMiriAssessmentSources.slotState
        : unsafeMiriAssessmentSources.mutSlot;
  return {
    equivalent:
      solution.replace(/\s+/g, "") === source.canonical.replace(/\s+/g, "")
        ? source.equivalent
        : source.canonical,
    mutant: source.mutant,
  };
}

const assessments = [
  ...unsafeMiriLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(unsafeMiriReviewExercises),
];

export const unsafeMiriAssessmentFixtures: UnsafeMiriAssessmentFixture[] =
  assessments.map((step) => {
    const source = sourceFor(step.id, step.solution ?? "");
    return {
      id: step.id,
      ...source,
    };
  });
