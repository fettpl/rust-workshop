import {
  initializedPrefixEquivalent,
  initializedPrefixMutant,
  initializedPrefixPrimaryStepId,
} from "./unsafe-miri-initialized-prefix";
import {
  disjointRangesPrimaryStepId,
} from "./unsafe-miri-disjoint-ranges";
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
  if (id === initializedPrefixPrimaryStepId) {
    return {
      equivalent: initializedPrefixEquivalent,
      mutant: initializedPrefixMutant,
    };
  }
  const sourceById: Record<
    string,
    (typeof unsafeMiriAssessmentSources)[keyof typeof unsafeMiriAssessmentSources]
  > = {
    "byte-view-gate": unsafeMiriAssessmentSources.byteView,
    "byte-view-contract-gate": unsafeMiriAssessmentSources.byteView,
    "byte-view-blank": unsafeMiriAssessmentSources.byteView,
    "byte-view-recall": unsafeMiriAssessmentSources.byteView,
    "review-unsafe-miri-byte-view": unsafeMiriAssessmentSources.byteView,
    "disjoint-regions-gate": unsafeMiriAssessmentSources.disjointRegions,
    "disjoint-regions-contract-gate": unsafeMiriAssessmentSources.disjointRegions,
    "disjoint-regions-blank": unsafeMiriAssessmentSources.disjointRegions,
    "disjoint-regions-recall": unsafeMiriAssessmentSources.disjointRegions,
    "review-unsafe-miri-disjoint-regions": unsafeMiriAssessmentSources.disjointRegions,
    [disjointRangesPrimaryStepId]: unsafeMiriAssessmentSources.disjointRanges,
    "slot-state-gate": unsafeMiriAssessmentSources.slotState,
    "slot-state-contract-gate": unsafeMiriAssessmentSources.slotState,
    "slot-state-blank": unsafeMiriAssessmentSources.slotState,
    "slot-state-recall": unsafeMiriAssessmentSources.slotState,
    "review-unsafe-miri-slot-state": unsafeMiriAssessmentSources.slotState,
    "mut-slot-gate": unsafeMiriAssessmentSources.mutSlot,
    "mut-slot-contract-gate": unsafeMiriAssessmentSources.mutSlot,
    "mut-slot-blank": unsafeMiriAssessmentSources.mutSlot,
    "mut-slot-recall": unsafeMiriAssessmentSources.mutSlot,
    "review-unsafe-miri-mut-slot": unsafeMiriAssessmentSources.mutSlot,
  };
  const source = sourceById[id];
  if (!source) {
    throw new Error(`Unknown unsafe-miri assessment fixture id: ${id}`);
  }
  return {
    equivalent:
      solution.replace(/\s+/g, "") === source.canonical.replace(/\s+/g, "")
        ? source.equivalent
        : source.canonical,
    mutant: source.mutant,
  };
}

export function unsafeMiriAssessmentSourceFor(id: string, solution = "") {
  return sourceFor(id, solution);
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
