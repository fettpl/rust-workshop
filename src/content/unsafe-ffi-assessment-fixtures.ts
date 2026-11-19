import {
  unsafeFfiAssessmentSources,
  unsafeFfiLessons,
  unsafeFfiReviewExercises,
} from "./unsafe-ffi";

export interface UnsafeFfiAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
}

const sourceFor = (id: string, solution: string) => {
  const transferSources = {
    "checked-view-prefix-transfer": unsafeFfiAssessmentSources.checkedPrefix,
    "split-envelope-transfer": unsafeFfiAssessmentSources.splitEnvelope,
    "raw-header-transfer": unsafeFfiAssessmentSources.rawHeader,
    "owned-pair-transfer": unsafeFfiAssessmentSources.ownedPair,
  };
  const source =
    transferSources[id as keyof typeof transferSources] ??
    (id.includes("checked-view")
      ? unsafeFfiAssessmentSources.checkedView
      : id.includes("split-regions")
        ? unsafeFfiAssessmentSources.splitRegions
        : id.includes("raw-record")
          ? unsafeFfiAssessmentSources.rawRecord
          : unsafeFfiAssessmentSources.ownedHandle);
  return {
    equivalent:
      solution.replace(/\s+/g, "") === source.canonical.replace(/\s+/g, "")
        ? source.equivalent
        : source.canonical,
    mutant: source.mutant,
  };
};

const assessments = [
  ...unsafeFfiLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(unsafeFfiReviewExercises),
];

export const unsafeFfiAssessmentFixtures: UnsafeFfiAssessmentFixture[] =
  assessments.map((step) => ({
    id: step.id,
    ...sourceFor(step.id, step.solution ?? ""),
  }));
