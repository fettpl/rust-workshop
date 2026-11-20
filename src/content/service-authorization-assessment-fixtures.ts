// MIT: fixed authored assessment controls, never learner/imported source.
import {
  authorizationOperations,
  authorizationOrdinaryReviews,
} from "./service-authorization-contracts";
export interface AuthorizationAssessmentFixture {
  operation: "policy" | "attenuation" | "binding" | "admission";
  canonical: string;
  equivalent: string;
  starter: string;
  promptScaffold: string;
  tests: string;
  expectedTest: string;
  semanticMutants: readonly {
    name: string;
    source: string;
    expectedTest: string;
  }[];
}
const operations = ["policy", "attenuation", "binding", "admission"] as const;
const entries: [string, AuthorizationAssessmentFixture][] = operations.flatMap(
  (operation) =>
    ["apply", "blank", "recall"].map((suffix) => {
      const data = authorizationOperations[operation];
      const expectedTest = `authorization_${operation}_contract${suffix === "recall" ? "_recall" : ""}`;
      return [
        `authorization-${operation}-${suffix}`,
        {
          ...data,
          operation,
          tests: suffix === "recall" ? data.recallTests : data.tests,
          expectedTest,
          semanticMutants: data.semanticMutants.map((mutant) => ({
            ...mutant,
            expectedTest,
          })),
        },
      ] as [string, AuthorizationAssessmentFixture];
    }),
);
for (const [id, key, operation, expectedTest] of [
  [
    "review-service-scoped-authority",
    "scopedAuthority",
    "attenuation",
    "authorization_scoped_review",
  ],
  [
    "review-service-bound-authorization-use",
    "boundUse",
    "admission",
    "authorization_bound_use_review",
  ],
] as const)
  entries.push([
    id,
    { ...authorizationOrdinaryReviews[key], operation, expectedTest },
  ]);
export const serviceAuthorizationAssessmentFixtures: Readonly<
  Record<string, AuthorizationAssessmentFixture>
> = Object.fromEntries(entries);
