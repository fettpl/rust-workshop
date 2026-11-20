import { describe, expect, it } from "vitest";
import {
  findFreshNeutralExposure,
  hasFreshNeutralExposureSuffix,
} from "./offline-exposure-contract";

const exposure = (overrides: Record<string, unknown> = {}) => ({
  id: "fresh-exposure",
  conceptIds: ["mutable-borrow"],
  lessonId: "borrow-intro",
  stepId: "borrow-conflict",
  kind: "exposure",
  passed: true,
  hints: 0,
  revealed: false,
  at: 101,
  gate: false,
  ...overrides,
});

describe("fresh offline neutral exposure witness", () => {
  it("rejects an empty appended suffix", () => {
    const events = [exposure({ id: "historical" })];
    expect(hasFreshNeutralExposureSuffix(events, events.length, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("does not count a matching historical event before a later appended event", () => {
    const events = [
      exposure({ id: "historical-match" }),
      exposure({ id: "appended-unrelated", lessonId: "other-lesson", stepId: "other-step" }),
    ];
    expect(hasFreshNeutralExposureSuffix(events, 1, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("records that the old every-only control vacuously accepts an empty suffix", () => {
    const appended: readonly Record<string, unknown>[] = [];
    expect(appended.every((event) => event.passed === true)).toBe(true);
    expect(hasFreshNeutralExposureSuffix(appended, 0, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("rejects a wrong lesson identity", () => {
    const events = [exposure({ lessonId: "other-lesson" })];
    expect(hasFreshNeutralExposureSuffix(events, 0, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("rejects a wrong step identity", () => {
    const events = [exposure({ stepId: "borrow-transfer" })];
    expect(hasFreshNeutralExposureSuffix(events, 0, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("rejects nonneutral passed, gate, evaluator, or evidence-version fields", () => {
    for (const event of [
      exposure({ passed: 1 }),
      exposure({ passed: "true" }),
      exposure({ passed: false }),
      exposure({ gate: true }),
      exposure({ evaluator: "model" }),
      exposure({ evidenceVersion: 2 }),
    ]) {
      expect(hasFreshNeutralExposureSuffix([event], 0, "borrow-intro", "borrow-conflict")).toBe(false);
    }
  });

  it("accepts one exact fresh neutral target", () => {
    expect(findFreshNeutralExposure([exposure()], 0, "borrow-intro", "borrow-conflict")).toMatchObject({
      lessonId: "borrow-intro",
      stepId: "borrow-conflict",
      kind: "exposure",
      passed: true,
    });
    expect(hasFreshNeutralExposureSuffix([exposure()], 0, "borrow-intro", "borrow-conflict")).toBe(true);
  });

  it("rejects a valid target mixed with a nonneutral appended event", () => {
    const events = [
      exposure({ id: "other", lessonId: "other-lesson", stepId: "other-step", evaluator: "tests" }),
      exposure({ id: "target" }),
    ];
    expect(findFreshNeutralExposure(events, 0, "borrow-intro", "borrow-conflict")?.id).toBe("target");
    expect(hasFreshNeutralExposureSuffix(events, 0, "borrow-intro", "borrow-conflict")).toBe(false);
  });

  it("does not mutate the event array or event objects", () => {
    const events = [exposure()];
    const before = JSON.stringify(events);
    findFreshNeutralExposure(events, 0, "borrow-intro", "borrow-conflict");
    expect(JSON.stringify(events)).toBe(before);
  });
});
