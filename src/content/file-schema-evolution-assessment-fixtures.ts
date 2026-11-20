// MIT: fixed authored maintainer cases. No learner source enters this map.
import { fileSchemaNormalizationContract as contract } from "./file-schema-evolution-contracts";

function fixture(review: boolean) {
  return {
    starter: contract.starter,
    canonical: contract.canonical,
    equivalents: contract.equivalents,
    tests: review ? contract.reviewTests : contract.tests,
    expectedTest: review ? contract.expectedReviewTest : contract.expectedTest,
    semanticMutants: contract.semanticMutants.map(
      ({ id, source, mainAssertion, reviewAssertion }) => ({
        id,
        source,
        expectedAssertion: review ? reviewAssertion : mainAssertion,
      }),
    ),
  };
}

export const fileSchemaEvolutionAssessmentFixtures = {
  "schema-normalize-apply": fixture(false),
  "schema-normalize-blank": fixture(false),
  "review-file-version-meaning": fixture(true),
};
