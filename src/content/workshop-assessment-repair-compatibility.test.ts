import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as course from "./course";
import delta from "./fixtures/workshop-assessment-repair-delta.json";
import ownershipDecisionDelta from "./fixtures/ownership-borrow-decision-delta.json";
import { restoreWorkshopAssessmentLessons } from "./workshop-assessment-repair-compatibility-fixture";
import {
  historicalBeforeA12,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
it("restores the immutable audited predecessor using only reviewed field deltas", () => {
  const before = hash(course.lessons);
  const restored = restoreWorkshopAssessmentLessons(
    course.lessons,
    new Map(),
    matchesRegistryValue,
  );
  expect(hash(restored)).toBe(delta.baseline.lessonsSha256);
  expect(hash(course.lessons)).toBe(before);
  expect(
    restoreWorkshopAssessmentLessons(restored, new Map(), matchesRegistryValue),
  ).toBe(restored);
  const changed = new Set([
    ...delta.restorations.map((entry) => entry.lessonId),
    ...ownershipDecisionDelta.restorations.map((entry) => entry.lessonId),
  ]);
  expect(changed.size).toBe(14);
  restored.forEach((lesson, index) => {
    if (!changed.has(lesson.id)) expect(lesson).toBe(course.lessons[index]);
  });
});
it("preserves unrelated descriptors and reverses only the exact known fields", () => {
  const lesson = course.lessons.find((item) => item.id === "generic-values")!;
  const step = lesson.steps.find((item) => item.id === "values-discover")!;
  const symbol = Symbol("marker");
  const marker = {};
  const mutated = { ...step, prompt: `${step.prompt} unexpected`, marker };
  Object.defineProperty(mutated, symbol, { value: marker, enumerable: false });
  Object.defineProperty(mutated, "unrelated", {
    get: () => {
      throw Error("accessor read");
    },
  });
  const steps = lesson.steps.map((item) => (item === step ? mutated : item));
  const lessons = course.lessons.map((item) =>
    item === lesson ? { ...lesson, steps } : item,
  );
  const restored = restoreWorkshopAssessmentLessons(
    lessons,
    new Map(),
    matchesRegistryValue,
  );
  const observed = restored
    .find((item) => item.id === lesson.id)!
    .steps.find((item) => item.id === step.id)!;
  expect(observed).toBe(mutated);
  expect(Reflect.getOwnPropertyDescriptor(observed, symbol)).toEqual(
    Reflect.getOwnPropertyDescriptor(mutated, symbol),
  );
  expect(restored.find((item) => item.id === "generic-impl")).not.toBe(
    course.lessons.find((item) => item.id === "generic-impl"),
  );
});
it("fails closed for modified, duplicated, or moved appended practice", () => {
  const lesson = course.lessons.find(
    (item) => item.id === "property-generated-inputs",
  )!;
  const appended = lesson.steps.at(-1)!;
  for (const steps of [
    [...lesson.steps.slice(0, -1), { ...appended, title: "near match" }],
    [...lesson.steps, appended],
    [appended, ...lesson.steps.slice(0, -1)],
  ]) {
    const restored = restoreWorkshopAssessmentLessons(
      course.lessons.map((item) =>
        item === lesson ? { ...lesson, steps } : item,
      ),
      new Map(),
      matchesRegistryValue,
    );
    expect(
      restored
        .find((item) => item.id === lesson.id)!
        .steps.filter((item) => item.id === appended.id),
    ).toHaveLength(steps.filter((item) => item.id === appended.id).length);
  }
});
it("validates both successor and predecessor leaf hashes", () => {
  for (const field of ["beforeSha256", "successorSha256"] as const) {
    const broken = {
      ...delta,
      restorations: delta.restorations.map((entry, index) =>
        index === 0 ? { ...entry, [field]: "0".repeat(64) } : entry,
      ),
    };
    const restored = restoreWorkshopAssessmentLessons(
      course.lessons,
      new Map(),
      matchesRegistryValue,
      broken,
    );
    const target = restored.find(
      (item) => item.id === delta.restorations[0].lessonId,
    )!;
    expect(target).toBe(course.lessons.find((item) => item.id === target.id));
    expect(hash(restored)).not.toBe(delta.baseline.lessonsSha256);
  }
});
it("keeps namespace, default and direct aliases to projected lesson nodes coherent", () => {
  const lesson = course.lessons.find((item) => item.id === "generic-values")!;
  const step = lesson.steps.find((item) => item.id === "values-discover")!;
  const input = {
    ...course,
    lessonAlias: lesson,
    stepAlias: step,
    stepsAlias: lesson.steps,
    lessonsAlias: course.lessons,
  };
  const result = historicalBeforeA12(input);
  const restored = result.lessons.find((item) => item.id === lesson.id)!;
  expect(result.lessonAlias).toBe(restored);
  expect(result.stepAlias).toBe(
    restored.steps.find((item) => item.id === step.id),
  );
  expect(result.stepsAlias).toBe(restored.steps);
  expect(result.lessonsAlias).toBe(result.lessons);
});

it("preserves symbol and accessor descriptors on the steps array when removing the canonical appended practice", () => {
  const lesson = course.lessons.find(
    (item) => item.id === "property-generated-inputs",
  )!;
  const steps = [...lesson.steps];
  const symbol = Symbol("steps marker");
  const marker = {};
  const getter = () => {
    throw new Error("unknown steps accessor was read");
  };
  Object.defineProperty(steps, symbol, { value: marker, enumerable: false });
  Object.defineProperty(steps, "unknown", { get: getter, enumerable: true });
  const input = course.lessons.map((item) =>
    item === lesson ? { ...lesson, steps } : item,
  );
  const restored = restoreWorkshopAssessmentLessons(
    input,
    new Map(),
    matchesRegistryValue,
  );
  const historical = restored.find((item) => item.id === lesson.id)!.steps;
  expect(historical.map((item) => item.id)).toEqual(
    lesson.steps.slice(0, -1).map((item) => item.id),
  );
  expect(Object.getOwnPropertyDescriptor(historical, symbol)).toEqual(
    Object.getOwnPropertyDescriptor(steps, symbol),
  );
  expect(Object.getOwnPropertyDescriptor(historical, "unknown")).toEqual(
    Object.getOwnPropertyDescriptor(steps, "unknown"),
  );
  expect(steps).toHaveLength(lesson.steps.length);
});
