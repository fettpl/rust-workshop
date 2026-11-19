import { expect, it } from "vitest";
import * as rawCourse from "./course";
import delta from "./fixtures/curriculum-recovery-nov19-delta.json";
import {
  historicalBeforeProjectArchives,
  historicalBeforeCrossModule,
  historicalBeforeAllVariants,
  historicalBeforeRemainingCriteria,
  historicalBeforeIndependentPractice,
  historicalBeforeA12,
  historicalBeforeCurriculumRecovery,
  hashRegistryValue,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import {
  restoreCurriculumRecoveryLessons,
  restoreCurriculumRecoveryRegistry,
} from "./workshop-assessment-repair-compatibility-fixture";

const course = historicalBeforeIndependentPractice(rawCourse);

it("reverses the complete November recovery before existing historical projections", () => {
  const previous = historicalBeforeA12(course);
  expect(hashRegistryValue(previous.lessons)).toBe(
    "09bc0301c0db0a5d7d43f8e7b103c8da8b6ac8f9c535701adae45cbef6e94217",
  );
  expect(hashRegistryValue(previous.reviewExercises)).toBe(
    "67699ce641ba5e18def722c9a7ff2952a5a386cdaa5fa90d5a8dbb0cef87a19b",
  );
  expect(hashRegistryValue(previous.projects)).toBe(
    "9db011fe8357c80fd5792c67cae69f799ccdaa45eeec1cdbc71750552fdd2fa8",
  );
  expect(previous.project).toBe(
    previous.projects.find((project) => project.id === previous.project.id),
  );
  expect(historicalBeforeA12(previous)).toBe(previous);
});

it("projects lesson fields through the direct restoration entry point without mutation", () => {
  const original = hashRegistryValue(course.lessons);
  const restored = restoreCurriculumRecoveryLessons(
    course.lessons,
    new Map(),
    matchesRegistryValue,
  );
  expect(hashRegistryValue(restored)).toBe(
    "28416386d13c4b2b2100ca7e365221365891766d2a7cd9433bd7380513efd0ff",
  );
  expect(hashRegistryValue(course.lessons)).toBe(original);
  expect(
    restoreCurriculumRecoveryLessons(restored, new Map(), matchesRegistryValue),
  ).toBe(restored);
});

it("retains successor drift, descriptors and aliases while restoring known sibling fields", () => {
  const original = course.reviewExercises["atomic-cas"];
  const marker = {};
  const symbol = Symbol("marker");
  const drift = { ...original, prompt: "unreviewed review prompt", marker };
  Object.defineProperty(drift, symbol, { value: marker, enumerable: false });
  Object.defineProperty(drift, "accessor", {
    get() {
      throw new Error("unexpected accessor read");
    },
  });
  const input = {
    ...course,
    reviewExercises: { ...course.reviewExercises, "atomic-cas": drift },
    reviewExercisesById: { ...course.reviewExercisesById, [drift.id]: drift },
    reviewAlias: drift,
    evaluatorAlias: drift.evaluator,
  };
  const previous = historicalBeforeA12(input);
  const review = previous.reviewExercises["atomic-cas"];
  expect(review.prompt).toBe(drift.prompt);
  expect(review.evaluator).not.toBe(drift.evaluator);
  expect(previous.reviewExercisesById[drift.id]).toBe(review);
  expect(previous.reviewAlias).toBe(review);
  expect(previous.evaluatorAlias).toBe(review.evaluator);
  expect(Reflect.getOwnPropertyDescriptor(review, symbol)).toEqual(
    Reflect.getOwnPropertyDescriptor(drift, symbol),
  );
  expect(Reflect.getOwnPropertyDescriptor(review, "accessor")).toEqual(
    Reflect.getOwnPropertyDescriptor(drift, "accessor"),
  );
  expect(original.prompt).not.toBe(drift.prompt);
  expect(delta.registries.some((entry) => entry.registry === "projects")).toBe(
    true,
  );
});

it("restores every captured pre-batch registry hash without replacing unchanged registries", () => {
  const before = hashRegistryValue(course);
  const previous = historicalBeforeCurriculumRecovery(course);
  for (const name of [
    "lessons",
    "modules",
    "projects",
    "reviewExercises",
    "shortReviewExercises",
    "delayedReviewExercises",
  ] as const) {
    expect(hashRegistryValue(previous[name]), name).toBe(
      delta.baseline[`${name}Sha256`],
    );
  }
  expect(previous.modules).toBe(course.modules);
  expect(previous.shortReviewExercises).toBe(course.shortReviewExercises);
  expect(previous.delayedReviewExercises).toBe(course.delayedReviewExercises);
  expect(previous.sources).toBe(course.sources);
  expect(historicalBeforeCurriculumRecovery(previous)).toBe(previous);
  expect(hashRegistryValue(course)).toBe(before);
});

it("validates both leaf hashes and leaves a stale successor or tampered predecessor visible", () => {
  const target = delta.registries.find(
    (entry) =>
      entry.registry === "reviewExercises" &&
      entry.selector === "atomic-cas" &&
      entry.path.join(".") === "prompt",
  )!;
  for (const corrupted of [
    { ...target, successorSha256: "0".repeat(64) },
    { ...target, beforeSha256: "0".repeat(64) },
    { ...target, before: "unreviewed historical wording" },
  ]) {
    const restored = restoreCurriculumRecoveryRegistry(
      course.reviewExercises,
      "reviewExercises",
      new Map(),
      matchesRegistryValue,
      [corrupted],
    );
    expect(restored).toBe(course.reviewExercises);
  }
  expect(delta.restorations).toHaveLength(19);
  expect(delta.registries).toHaveLength(55);
  for (const entry of [...delta.restorations, ...delta.registries]) {
    if (entry.beforeSha256 !== null)
      expect(hashRegistryValue(entry.before)).toBe(entry.beforeSha256);
  }
});

it("preserves unmatched project drift, duplicate identities and nested direct aliases", () => {
  const original = course.projects.find(
    (project) => project.id === "number-guessing-result-message",
  )!;
  const instructions = [...original.package!.instructions];
  instructions[2] = "unreviewed dependency instruction";
  const project = {
    ...original,
    package: { ...original.package!, instructions },
  };
  const input = {
    ...course,
    projects: course.projects.map((item) =>
      item === original ? project : item,
    ),
    project,
    packageAlias: project.package,
  };
  const previous = historicalBeforeCurriculumRecovery(input);
  expect(previous.project.package!.instructions[2]).toBe(instructions[2]);
  expect(previous.project.constraints[0]).toContain("0.10.2");
  expect(previous.packageAlias).toBe(previous.project.package);
  expect(previous.project).toBe(
    previous.projects.find((item) => item.id === project.id),
  );
  const duplicated = [...course.projects, original];
  const restored = restoreCurriculumRecoveryRegistry(
    duplicated,
    "projects",
    new Map(),
    matchesRegistryValue,
  );
  expect(restored[0]).toBe(original);
  expect(restored.at(-1)).toBe(original);
  expect(restored.filter((item) => item.id === original.id)).toHaveLength(2);
});

it("removes the exact new code field while preserving absence and any later code drift", () => {
  const live = course.reviewExercises["struct-records"];
  expect(Object.hasOwn(live, "code")).toBe(true);
  const previous = historicalBeforeCurriculumRecovery(course);
  const old = previous.reviewExercises["struct-records"];
  expect(Object.hasOwn(old, "code")).toBe(false);
  expect(previous.reviewExercisesById[old.id]).toBe(old);
  for (const variant of [
    { ...live, code: `${live.code}\n// unreviewed code` },
    Object.defineProperty({ ...live }, "code", {
      value: live.code,
      enumerable: false,
    }),
    Object.defineProperty({ ...live }, "code", {
      value: live.code,
      writable: false,
    }),
    Object.defineProperty({ ...live }, "code", {
      value: live.code,
      configurable: false,
    }),
  ]) {
    const restored = restoreCurriculumRecoveryRegistry(
      { ...course.reviewExercises, "struct-records": variant },
      "reviewExercises",
      new Map(),
      matchesRegistryValue,
    );
    expect(
      Object.getOwnPropertyDescriptor(restored["struct-records"], "code"),
    ).toEqual(Object.getOwnPropertyDescriptor(variant, "code"));
    expect(
      matchesRegistryValue(restored["struct-records"], hashRegistryValue(old)),
    ).toBe(false);
  }
});

it("restores all six catalog registries to the audited 02b6126 predecessor", async () => {
  const { baseline } = await import("./fixtures/independent-practice-delta.json");
  expect(baseline.sha).toBe("02b6126");
  for (const key of [
    "lessons", "modules", "projects", "reviewExercises", "shortReviewExercises", "delayedReviewExercises",
  ] as const) {
    expect(hashRegistryValue(course[key]), key).toBe(baseline[`${key}Sha256`]);
  }
  expect(course.ownershipModule).toBe(course.modules.find((module) => module.id === "ownership"));
  expect(historicalBeforeIndependentPractice(course)).toBe(course);
});

it("restores all six ea82ec2 registries and preserves independent edits to appended alternatives", async () => {
  const { baseline } = await import("./fixtures/remaining-criteria-delta.json");
  const preceding = historicalBeforeRemainingCriteria(rawCourse);
  for (const name of ["lessons","modules","projects","reviewExercises","shortReviewExercises","delayedReviewExercises"] as const) {
    expect(hashRegistryValue(preceding[name]), name).toBe(baseline[`${name}Sha256`]);
  }
  expect(historicalBeforeRemainingCriteria(preceding)).toBe(preceding);
  const lessonId = "service-client-bounded-retry";
  const edited = rawCourse.lessons.map(lesson => lesson.id === lessonId ? {
    ...lesson,
    steps: lesson.steps.map(step => step.id === "retry-time-windows" ? { ...step, title: "Independent revision" } : step),
  } : lesson);
  const steps = historicalBeforeRemainingCriteria({ ...rawCourse, lessons: edited }).lessons.find(lesson => lesson.id === lessonId)!.steps;
  expect(steps.at(-1)?.title).toBe("Independent revision");
  expect(steps.some(step => step.id === "retry-ready-queue")).toBe(false);
});

it("restores the reviewed catalog at f3a0081 before any earlier projection", async () => {
  const { baseline } = await import("./fixtures/all-variants-delta.json");
  const prior = historicalBeforeAllVariants(rawCourse);
  expect(baseline.sha).toBe("f3a0081");
  for (const key of ["lessons", "modules", "projects", "reviewExercises", "shortReviewExercises", "delayedReviewExercises"] as const) {
    expect(hashRegistryValue(prior[key]), key).toBe(baseline[`${key}Sha256`]);
  }
  expect(historicalBeforeAllVariants(prior)).toBe(prior);
});

it("restores the reviewed catalog at 758c4a2 before any earlier projection", async () => {
  const { baseline } = await import("./fixtures/cross-module-delta.json");
  const prior = historicalBeforeCrossModule(rawCourse);
  expect(baseline.sha).toBe("758c4a2");
  for (const key of ["lessons", "modules", "projects", "reviewExercises", "shortReviewExercises", "delayedReviewExercises"] as const) {
    expect(hashRegistryValue(prior[key]), key).toBe(baseline[`${key}Sha256`]);
  }
  expect(historicalBeforeCrossModule(prior)).toBe(prior);
});

it("restores the reviewed catalog at 3bb18b7 before any earlier projection", async () => {
  const { baseline } = await import("./fixtures/project-archives-delta.json");
  const prior = historicalBeforeProjectArchives(rawCourse);
  expect(baseline.sha).toBe("3bb18b7");
  for (const key of ["lessons", "modules", "projects", "reviewExercises", "shortReviewExercises", "delayedReviewExercises"] as const) {
    expect(hashRegistryValue(prior[key]), key).toBe(baseline[`${key}Sha256`]);
  }
  expect(historicalBeforeProjectArchives(prior)).toBe(prior);
});
