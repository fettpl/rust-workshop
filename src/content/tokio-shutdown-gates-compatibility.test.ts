import { expect, it } from "vitest";
import * as currentCourse from "./course";
import delta from "./fixtures/tokio-shutdown-gates-delta.json";
import {
  hashRegistryValue,
  historicalBeforeA12,
  historicalBeforeRemainingCriteria,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import {
  restoreFoundationsRangeModules,
  restoreTokioShutdownModules,
} from "./tokio-shutdown-gates-compatibility-fixture";
import { restoreTokioShutdownLessons } from "./workshop-assessment-repair-compatibility-fixture";

// Exercise the historical split against its input before the later alternatives.
const course = historicalBeforeRemainingCriteria(currentCourse);
const restore = (modules: typeof course.modules) =>
  restoreTokioShutdownModules(modules, new Map(), matchesRegistryValue);

it("restores genuine pre-split modules and lessons without changing captured fingerprints", () => {
  expect(delta.baseline.sha).toBe("5824b7e3966fc241e1cff72005e1947c1b3a0372");
  const before = hashRegistryValue(course.modules);
  const previous = restoreFoundationsRangeModules(
    course.modules,
    new Map(),
    matchesRegistryValue,
  );
  const restored = restore(previous);
  expect(hashRegistryValue(restored)).toBe(delta.baseline.modulesSha256);
  expect(hashRegistryValue(course.modules)).toBe(before);
  expect(restore(restored)).toBe(restored);
  for (const entry of delta.modules) {
    expect(hashRegistryValue(restored[entry.index])).toBe(entry.beforeSha256);
    expect(restored[entry.index].gateCriteria?.at(-1)).toEqual(
      entry.beforeCriterion,
    );
    expect(
      restored[entry.index].gateCriteria?.slice(0, entry.criterionIndex),
    ).toEqual(
      course.modules[entry.index].gateCriteria?.slice(0, entry.criterionIndex),
    );
  }
  restored.forEach((module, index) => {
    if (!delta.modules.some((entry) => entry.index === index))
      expect(module).toBe(previous[index]);
  });
  const lessons = restoreTokioShutdownLessons(
    course.lessons,
    new Map(),
    matchesRegistryValue,
  );
  expect(hashRegistryValue(lessons)).toBe(delta.baseline.lessonsSha256);
  expect(
    restoreTokioShutdownLessons(lessons, new Map(), matchesRegistryValue),
  ).toBe(lessons);
});

it.each(delta.modules)(
  "leaves changed, moved and duplicated $id successors observable",
  (entry) => {
    const live = course.modules[entry.index];
    const criteria = live.gateCriteria!;
    const unrelated = { ...live, title: `${live.title} unrelated drift` };
    const undefinedField = { ...live, extra: undefined };
    const hiddenField = { ...live };
    const symbolField = { ...live, [Symbol("marker")]: true };
    Object.defineProperty(hiddenField, "hidden", { value: true });
    const variants = [
      unrelated,
      undefinedField,
      hiddenField,
      symbolField,
      { ...live, exitGate: [...live.exitGate, "unreviewed"] },
      {
        ...live,
        gateCriteria: [
          ...criteria.slice(0, -1),
          { ...criteria.at(-1)!, label: "near match" },
        ],
      },
      { ...live, gateCriteria: [...criteria, criteria.at(-1)!] },
      { ...live, gateCriteria: [criteria.at(-1)!, ...criteria.slice(0, -1)] },
    ];
    for (const candidate of variants) {
      const modules = course.modules.map((module) =>
        module === live ? candidate : module,
      );
      const result = restore(modules);
      expect(result[entry.index]).toBe(candidate);
      expect(hashRegistryValue(result)).not.toBe(delta.baseline.modulesSha256);
    }
    const moved = [...course.modules];
    [moved[entry.index], moved[entry.index + 1]] = [
      moved[entry.index + 1],
      moved[entry.index],
    ];
    expect(restore(moved).find((module) => module.id === entry.id)).toBe(live);
    const duplicated = [...course.modules, live];
    expect(restore(duplicated)[entry.index]).toBe(live);
  },
);

it.each(delta.modules)("checks both reviewed hashes for $id", (entry) => {
  for (const rejected of [entry.beforeSha256, entry.successorSha256]) {
    const restored = restoreTokioShutdownModules(
      course.modules,
      new Map(),
      (value, expected) =>
        expected !== rejected && matchesRegistryValue(value, expected),
    );
    expect(restored[entry.index]).toBe(course.modules[entry.index]);
    expect(hashRegistryValue(restored)).not.toBe(delta.baseline.modulesSha256);
  }
});

it("keeps namespace, default, module, criteria-array and lesson aliases coherent", () => {
  const live = course.modules[delta.modules[0].index];
  const lesson = course.lessons.find(
    (item) => item.id === delta.appendedSteps[0].lessonId,
  )!;
  const input = {
    ...course,
    moduleAlias: live,
    criteriaAlias: live.gateCriteria,
    exitGateAlias: live.exitGate,
    modulesAlias: course.modules,
    lessonAlias: lesson,
    stepsAlias: lesson.steps,
    default: { ...course },
  };
  const result = historicalBeforeA12(input);
  const restored = result.modules[delta.modules[0].index];
  expect(result.moduleAlias).toBe(restored);
  expect(result.criteriaAlias).toBe(restored.gateCriteria);
  expect(result.exitGateAlias).toBe(restored.exitGate);
  expect(result.modulesAlias).toBe(result.modules);
  expect(result.default.modules).toBe(result.modules);
  const historicalLesson = result.lessons.find(
    (item) => item.id === lesson.id,
  )!;
  expect(result.lessonAlias).toBe(historicalLesson);
  expect(result.stepsAlias).toBe(historicalLesson.steps);
  expect(result.default.lessons).toBe(result.lessons);
  expect(historicalLesson.steps).toHaveLength(delta.appendedSteps[0].index);
  expect(input.moduleAlias).toBe(live);
});

it("preserves module-array descriptors and does not read unknown accessors", () => {
  const modules = [...course.modules];
  const symbol = Symbol("marker");
  const marker = {};
  const getter = () => {
    throw new Error("unknown accessor read");
  };
  Object.defineProperty(modules, symbol, { value: marker });
  Object.defineProperty(modules, "unknown", { get: getter });
  const restored = restore(modules);
  expect(Object.getOwnPropertyDescriptor(restored, symbol)).toEqual(
    Object.getOwnPropertyDescriptor(modules, symbol),
  );
  expect(Object.getOwnPropertyDescriptor(restored, "unknown")).toEqual(
    Object.getOwnPropertyDescriptor(modules, "unknown"),
  );
});

it("does not remove changed, moved or duplicated appended transfer practice", () => {
  const entry = delta.appendedSteps[0];
  const lesson = course.lessons.find((item) => item.id === entry.lessonId)!;
  const appended = lesson.steps[entry.index];
  for (const steps of [
    [
      ...lesson.steps.slice(0, entry.index),
      { ...appended, title: "near match" },
    ],
    [...lesson.steps.slice(0, entry.index), { ...appended, extra: undefined }],
    [...lesson.steps, appended],
    [appended, ...lesson.steps.slice(0, entry.index)],
  ]) {
    const lessons = course.lessons.map((item) =>
      item === lesson ? { ...lesson, steps } : item,
    );
    const result = restoreTokioShutdownLessons(
      lessons,
      new Map(),
      matchesRegistryValue,
    );
    expect(result.find((item) => item.id === entry.lessonId)!.steps).toBe(
      steps,
    );
    expect(hashRegistryValue(result)).not.toBe(delta.baseline.lessonsSha256);
  }
});

it("reuses projected module nodes across distinct namespace and default arrays", () => {
  const live = course.modules[delta.modules[0].index];
  const input = {
    ...course,
    moduleAlias: live,
    default: { ...course, modules: [...course.modules], moduleAlias: live },
  };
  const result = historicalBeforeA12(input);
  expect(result.default.modules).not.toBe(result.modules);
  for (const entry of delta.modules)
    expect(result.default.modules[entry.index]).toBe(
      result.modules[entry.index],
    );
  expect(result.moduleAlias).toBe(result.modules[delta.modules[0].index]);
  expect(result.default.moduleAlias).toBe(result.moduleAlias);
});
