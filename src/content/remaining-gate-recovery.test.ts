import { expect, it } from "vitest";
import { modules } from "./course";
import {
  checkRecoveryAfterEachReveal,
  originalSingletons,
} from "./gate-recovery-test-helpers";

const criteria = modules.flatMap((stage) =>
  (stage.gateCriteria ?? [])
    .map((criterion, index) => ({ stage, criterion, index }))
    .filter(
      ({ criterion }) =>
        originalSingletons.has(criterion.id) ||
        criterion.requiredIndependentCodingTasks !== undefined,
    ),
);

it("covers the 23 original singletons and all counted criteria", () => {
  expect(
    criteria.filter(({ criterion }) => originalSingletons.has(criterion.id)),
  ).toHaveLength(23);
  expect(
    criteria.filter(
      ({ criterion }) => criterion.requiredIndependentCodingTasks !== undefined,
    ),
  ).toHaveLength(25);
});

it.each(criteria)(
  "$stage.id / $criterion.id remains attainable after a single solution is shown",
  ({ stage, index }) => checkRecoveryAfterEachReveal(stage, index),
);
