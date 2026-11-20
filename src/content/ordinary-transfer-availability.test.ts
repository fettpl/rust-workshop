import { expect, it } from "vitest";
import * as course from "./course";
import {
  historicalBeforeAllVariants,
  historicalBeforeRemainingCriteria,
} from "./file-schema-evolution-compatibility-fixture";
import { checkRecoveryAfterEachReveal } from "./gate-recovery-test-helpers";

// Select the same criteria as the first-reveal audit, even if the live catalog changes.
const earlierModules = historicalBeforeRemainingCriteria(course).modules;
const audited = historicalBeforeAllVariants(course).modules;
const criteria = earlierModules.flatMap((earlier) => {
  const stage = course.modules.find((item) => item.id === earlier.id)!;
  const prior = audited.find((item) => item.id === earlier.id)!;
  return (earlier.gateCriteria ?? [])
    .filter(
      (criterion) =>
        criterion.requiredIndependentCodingTasks === undefined &&
        criterion.taskRefs.length > 1,
    )
    .map(({ id }) => ({
      stage,
      id,
      index: stage.gateCriteria!.findIndex((criterion) => criterion.id === id),
      priorRefs: prior.gateCriteria!.find((criterion) => criterion.id === id)!
        .taskRefs,
    }));
});

it("retains all 429 routes of the original 192 ordinary criteria", () => {
  expect(criteria).toHaveLength(192);
  expect(
    criteria.reduce(
      (total, criterion) => total + criterion.priorRefs.length,
      0,
    ),
  ).toBe(429);
  for (const { stage, id, index, priorRefs } of criteria) {
    expect(index, id).toBeGreaterThanOrEqual(0);
    expect(stage.gateCriteria![index].taskRefs, id).toEqual(
      expect.arrayContaining(priorRefs),
    );
  }
});

it.each(criteria)(
  "$stage.id / $id remains attainable after revealing any one variant",
  ({ stage, index }) => checkRecoveryAfterEachReveal(stage, index),
);
