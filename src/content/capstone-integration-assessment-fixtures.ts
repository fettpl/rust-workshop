import { capstoneContracts } from "./capstone-integration/contracts";

export interface CapstoneIntegrationAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
}

export const capstoneIntegrationAssessmentFixtures: CapstoneIntegrationAssessmentFixture[] =
  Object.values(capstoneContracts).map(({ id, equivalent, mutant }) => ({
    id,
    equivalent,
    mutant,
  }));
