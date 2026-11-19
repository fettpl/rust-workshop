import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import {
  historicalBeforeA8ThenA7ThenExistingContractRepair,
  historicalBeforeCapstoneMaintenance,
} from "./capstone-maintenance-compatibility-fixture";
import {
  a9CurrentPrompt,
  a9ModelLessonId,
  a9ModelStepId,
  a9PreAuthoringRegistrySha256ByKey,
  historicalBeforeA9,
} from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";
import {
  historicalBeforeA10ThenA9,
  historicalBeforeA10ThenA9ThenCapstoneMaintenance,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair,
} from "./file-schema-evolution-compatibility-fixture";
import { mutSlotWithMutSteps } from "./unsafe-miri-mut-slot-with-mut";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const registryKeys = Object.keys(a9PreAuthoringRegistrySha256ByKey) as Array<
  keyof typeof a9PreAuthoringRegistrySha256ByKey
>;

function withCapturedDefault() {
  const defaultRegistry = Object.fromEntries(
    registryKeys
      .filter((key) => key !== "default")
      .map((key) => [key, (currentCourse as Record<string, unknown>)[key]]),
  );
  const marker = () => "unknown-field-preserved";
  return {
    ...currentCourse,
    default: defaultRegistry,
    unknownMarker: marker,
  } as typeof currentCourse & {
    default: typeof defaultRegistry;
    unknownMarker: typeof marker;
  };
}

function promptVariant(
  course: ReturnType<typeof withCapturedDefault>,
  prompt: string,
) {
  const replaceInRegistry = (registry: unknown) => {
    const record = registry as { lessons: typeof currentCourse.lessons };
    return {
      ...record,
      lessons: record.lessons.map((lesson) =>
        lesson.id !== a9ModelLessonId
          ? lesson
          : {
              ...lesson,
              steps: lesson.steps.map((step) =>
                step.id !== a9ModelStepId ? step : { ...step, prompt },
              ),
            },
      ),
    };
  };
  return {
    ...course,
    ...replaceInRegistry(course),
    default: replaceInRegistry(course.default),
  };
}

it("requires the fixed independent-result wording in the model prompt", () => {
  const model = mutSlotWithMutSteps.find(
    (step) => step.id === "mut-slot-with-mut-model",
  );

  expect(model?.prompt).toContain("R jest niezależne od chwilowej pożyczki");
});

it("restores the A9 prompt across all 15 registries without mutating input", () => {
  const input = withCapturedDefault();
  const projected = historicalBeforeA10ThenA9(input);

  expect(
    (
      input.lessons.find((lesson) => lesson.id === a9ModelLessonId)?.steps ?? []
    ).find((step) => step.id === a9ModelStepId)?.prompt,
  ).toBe(a9CurrentPrompt);
  expect(
    projected.lessons
      .find((lesson) => lesson.id === a9ModelLessonId)
      ?.steps.find((step) => step.id === a9ModelStepId)?.prompt,
  ).toContain("R może być niezależne");
  expect(projected.unknownMarker).toBe(input.unknownMarker);
  expect(projected.project).toBe(
    projected.projects.find((project) => project.id === input.project.id),
  );
  expect(projected.ownershipModule).toBe(projected.modules.find((module) => module.id === "ownership"));
  expect(projected.reviewExerciseForId).toBe(input.reviewExerciseForId);
  expect(projected.default).not.toBe(input.default);

  for (const key of registryKeys) {
    const value = key === "default" ? projected.default : projected[key];
    expect(hashJson(value)).toBe(a9PreAuthoringRegistrySha256ByKey[key]);
  }
  expect(historicalBeforeA10ThenA9(projected)).toEqual(projected);
});

it("fails closed for an old, near-miss, missing, or unrelated model step", () => {
  const input = withCapturedDefault();
  const old = promptVariant(
    input,
    "R może być niezależne od chwilowej pożyczki",
  );
  expect(historicalBeforeA9(old)).toEqual(old);

  const nearMiss = promptVariant(input, `${a9CurrentPrompt}!`);
  expect(historicalBeforeA9(nearMiss)).toEqual(nearMiss);

  const missing = {
    ...input,
    lessons: input.lessons.map((lesson) =>
      lesson.id !== a9ModelLessonId
        ? lesson
        : {
            ...lesson,
            steps: lesson.steps.filter((step) => step.id !== a9ModelStepId),
          },
    ),
    default: {
      ...input.default,
      lessons: (
        input.default as { lessons: typeof currentCourse.lessons }
      ).lessons.map((lesson) =>
        lesson.id !== a9ModelLessonId
          ? lesson
          : {
              ...lesson,
              steps: lesson.steps.filter((step) => step.id !== a9ModelStepId),
            },
      ),
    },
  };
  expect(historicalBeforeA9(missing)).toEqual(missing);

  const unrelatedLessonId = input.lessons.find(
    (lesson) => lesson.id !== a9ModelLessonId,
  )!.id;
  const unrelated = {
    ...input,
    lessons: input.lessons.map((lesson) =>
      lesson.id !== unrelatedLessonId
        ? lesson
        : { ...lesson, title: `${lesson.title} mutation` },
    ),
  };
  const unrelatedProjected = historicalBeforeA9(unrelated);
  expect(
    unrelatedProjected.lessons.find((lesson) => lesson.id === unrelatedLessonId)
      ?.title,
  ).toBe(
    unrelated.lessons.find((lesson) => lesson.id === unrelatedLessonId)?.title,
  );
});

it("composes A9 newest-first with both accepted historical projections", () => {
  const input = withCapturedDefault();
  const beforeA9 = historicalBeforeA10ThenA9(input);
  expect(historicalBeforeA10ThenA9ThenCapstoneMaintenance(input)).toEqual(
    historicalBeforeCapstoneMaintenance(beforeA9),
  );
  expect(
    historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair(input),
  ).toEqual(historicalBeforeA8ThenA7ThenExistingContractRepair(beforeA9));
});
