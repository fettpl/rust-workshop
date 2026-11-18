import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as course from "./course";
import type { Lesson } from "../domain/types";
import delta from "./fixtures/ownership-borrow-decision-delta.json";
import {
  historicalBeforeA12,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import {
  restoreOwnershipBorrowDecisionLessons,
  restoreLogAnalyzerRecallLessons,
} from "./workshop-assessment-repair-compatibility-fixture";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const lesson = course.lessons.find(
  (item) => item.id === "scenario-assessment",
)!;
const restore = (lessons: Lesson[]) =>
  restoreOwnershipBorrowDecisionLessons(
    lessons,
    new Map(),
    matchesRegistryValue,
  );
const replaceLesson = (updated: Lesson) =>
  course.lessons.map((item) => (item === lesson ? updated : item));
const assessment = (lessons: Lesson[]) =>
  lessons.find((item) => item.id === lesson.id)!;

it("restores the captured 9bb12fe lessons without mutating the live catalog", () => {
  const before = hash(course.lessons);
  const previous = restoreLogAnalyzerRecallLessons(
    course.lessons,
    new Map(),
    matchesRegistryValue,
  );
  const restored = restore(previous);
  expect(delta.baseline).toEqual({
    sha: "9bb12fee1dbeacb8b8349314e4b0119acbed9ad0",
    lessonsSha256:
      "c47395413045c1f1afe26f335d0d63a2bcf20f7cd408c87ffd7da2d5104def88",
  });
  expect(hash(restored)).toBe(delta.baseline.lessonsSha256);
  expect(hash(course.lessons)).toBe(before);
  expect(restore(restored)).toBe(restored);
  expect(assessment(restored).steps.map((step) => step.id)).toEqual(
    lesson.steps.slice(0, 6).map((step) => step.id),
  );
  restored.forEach((item, index) => {
    if (
      ![lesson.id, "tokio-graceful-shutdown", "hashmap-and-entry"].includes(
        item.id,
      )
    )
      expect(item).toBe(previous[index]);
  });
});

it("retains independent field drift while restoring other reviewed fields", () => {
  const step = lesson.steps.find((item) => item.id === "assessment-retrieval")!;
  const mutated = { ...step, prompt: `${step.prompt} independent drift` };
  const marker = {};
  const symbol = Symbol("step marker");
  const getter = () => {
    throw new Error("unknown accessor read");
  };
  Object.defineProperty(mutated, symbol, { value: marker });
  Object.defineProperty(mutated, "unknown", { get: getter });
  const input = replaceLesson({
    ...lesson,
    title: `${lesson.title} independent drift`,
    steps: lesson.steps.map((item) => (item === step ? mutated : item)),
  });
  const restored = assessment(restore(input));
  const observed = restored.steps.find((item) => item.id === step.id)!;
  expect(restored.title).toBe(`${lesson.title} independent drift`);
  expect(observed.prompt).toBe(mutated.prompt);
  expect(observed.kind).toBe("recall");
  expect(observed.evaluator?.kind).toBe("answer");
  expect(Object.getOwnPropertyDescriptor(observed, symbol)).toEqual(
    Object.getOwnPropertyDescriptor(mutated, symbol),
  );
  expect(Object.getOwnPropertyDescriptor(observed, "unknown")).toEqual(
    Object.getOwnPropertyDescriptor(mutated, "unknown"),
  );
  expect(input.find((item) => item.id === lesson.id)!.steps[4]).toBe(mutated);
});

it("does not remove modified, moved or duplicated appended preview practice", () => {
  const appended = lesson.steps[6];
  const extraUndefined = { ...appended, unknown: undefined };
  for (const steps of [
    [...lesson.steps.slice(0, 6), { ...appended, title: "near match" }],
    [...lesson.steps.slice(0, 6), extraUndefined],
    [...lesson.steps, appended],
    [appended, ...lesson.steps.slice(0, 6)],
  ]) {
    const result = assessment(restore(replaceLesson({ ...lesson, steps })));
    expect(result.steps.filter((step) => step.id === appended.id)).toHaveLength(
      steps.filter((step) => step.id === appended.id).length,
    );
  }
});

it("validates both predecessor and successor field hashes", () => {
  const entry = delta.restorations[0];
  for (const key of ["beforeSha256", "successorSha256"] as const) {
    const broken = {
      ...delta,
      restorations: delta.restorations.map((item, index) =>
        index === 0 ? { ...item, [key]: "0".repeat(64) } : item,
      ),
    };
    const restored = restoreOwnershipBorrowDecisionLessons(
      course.lessons,
      new Map(),
      matchesRegistryValue,
      broken,
    );
    const observed = assessment(restored).steps.find(
      (step) => step.id === entry.stepId,
    )!;
    const current = lesson.steps.find((step) => step.id === entry.stepId)!;
    expect(Reflect.get(observed, entry.path[0])).toEqual(
      Reflect.get(current, entry.path[0]),
    );
    expect(hash(restored)).not.toBe(delta.baseline.lessonsSha256);
  }
});

it("keeps direct lesson, step and steps aliases coherent through earlier projections", () => {
  const step = lesson.steps[4];
  const input = {
    ...course,
    lessonAlias: lesson,
    stepAlias: step,
    stepsAlias: lesson.steps,
    lessonsAlias: course.lessons,
  };
  const before = hash(input.lessons);
  const projected = historicalBeforeA12(input);
  const restored = assessment(projected.lessons);
  expect(projected.lessonAlias).toBe(restored);
  expect(projected.stepAlias).toBe(restored.steps[4]);
  expect(projected.stepsAlias).toBe(restored.steps);
  expect(projected.lessonsAlias).toBe(projected.lessons);
  expect(hash(input.lessons)).toBe(before);
  expect(input.stepAlias).toBe(step);
});

it("leaves independent lesson prose drift and rejects either invalid lesson hash", () => {
  const drift = `${lesson.evidenceGate} independent drift`;
  const observed = assessment(
    restore(replaceLesson({ ...lesson, evidenceGate: drift })),
  );
  expect(observed.evidenceGate).toBe(drift);
  expect(observed.steps[4].kind).toBe("recall");
  for (const key of ["beforeSha256", "successorSha256"] as const) {
    const broken = {
      ...delta,
      lessonRestorations: delta.lessonRestorations.map((entry) => ({
        ...entry,
        [key]: "0".repeat(64),
      })),
    };
    const restored = restoreOwnershipBorrowDecisionLessons(
      course.lessons,
      new Map(),
      matchesRegistryValue,
      broken,
    );
    expect(assessment(restored).evidenceGate).toBe(lesson.evidenceGate);
    expect(hash(restored)).not.toBe(delta.baseline.lessonsSha256);
  }
});
