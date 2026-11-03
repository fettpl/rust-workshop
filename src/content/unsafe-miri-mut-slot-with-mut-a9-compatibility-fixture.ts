import { createHash } from "node:crypto";
import type * as Course from "./course";
import {
  historicalBeforeCapstoneMaintenance,
  historicalBeforeA8ThenA7ThenExistingContractRepair,
} from "./capstone-maintenance-compatibility-fixture";

export const a9ModelLessonId = "unsafe-miri-mut-slot" as const;
export const a9ModelStepId = "mut-slot-with-mut-model" as const;
export const a9CurrentPrompt =
  "Prześledź jawny krótki reborrow i lokalny callback. Wcześniejsza lekcja „Callback odwiedza lokalne pożyczki” jest tu mostem: docelowe `with_mut` dopiero uogólni tę operację przez HRTB `F: for<'short> FnOnce(&'short mut T) -> R`, aby przy każdym wywołaniu dać świeżą pożyczkę, wywołać callback raz i oddać R. R jest niezależne od chwilowej pożyczki, ale może pożyczać z zewnętrznego właściciela albo ze wspólnych danych niesionych przez T; zwykły unwind zachowuje wcześniejsze mutacje bez obietnicy rollbacku.";
export const a9PreviousPrompt = a9CurrentPrompt.replace(
  "R jest niezależne",
  "R może być niezależne",
);

export const a9ModelStepSha256 =
  "61e59a428f8c4c27e32d749134c942d61b718895105bcd170dfdc08ddb983157";
export const a9PreviousModelStepSha256 =
  "0b678daf53b1a335429ae8bdf697c18cb259c12a0b1e7e10b1a8c8c7824de341";
export const a9GenuineRegistrySha256 =
  "befebce016382f1c2f8e35391e66f7a5d206707437122b56fd9a49b7e1b20841";
export const a9GenuineStateSha256 =
  "e09571847099b863e43684231cd57c5b6c11f9115c7c93f89347d9a005f5e5d9";

export const a9PreAuthoringRegistrySha256ByKey = {
  competencies:
    "4e3a94355c196b6276e2aec7f1c6188f8c534ee806333bcb31a996cfb4fa1851",
  concepts: "5c8c7c63490fe024c47b6dab628e0c804c8e1f32b7be54123d8898c5482df358",
  default: "295cf16835e2a2609e1bf163705e1e51e24963a70522a4d87864e7b87b88d6cd",
  delayedReviewExercises:
    "420207547e86af34b82e50d6735ba5a262554ca77b409c9609f2fa2e3cc96d7c",
  lessons: "cf217918c2c1447a01e19d1d843fc9568abf8fd853432c412f9a74a2389d72b6",
  modules: "01ae65942a932b94ea7a2702db7bfe7d27d9ee4f7bec7624739bed13363b504b",
  ownershipModule:
    "a49b89d28c14ca64c42429ac0d946ee13b6f5d638cd55ea311c1e6746b44cec1",
  project: "6e6174f2465c09cd958a9bfd1ccc0a6394e69dc1e338c2281195f33d29691550",
  projects: "1ec5c951cca3e3f98793581ef8b1921c5514e2d21e5a2eca9c48a2814176fac0",
  reviewExercises:
    "7cea35a71e381a39be8fc48555421b1d99b6c255bd1a88c1a9e47a3585d3e388",
  reviewExercisesById:
    "b18e4b1a3f2a17dbc317f27a20772a213f43b8b8150435bc8237fe32e86c0a2e",
  roadmap: "63c94381759dcb101770b8f8f56e3d66aebdcf27e19e6fccfaa21c1d8971792a",
  shortReviewExercises:
    "646f785b505ac5f45e8ba5230e4b87decb39a5edadb08bde83f7e4d7603a1db7",
  sources: "e9ae605cb3b4accd0483bef877e991c113a53ae4b069838bcde34d3c52ff194a",
  traces: "f501901ba89841109381b3f99e858606cb6cebd888b595518f556504efcaa263",
} as const;

export const a9PromptCompatibilityFixture = {
  schema: "a9-mut-slot-prompt-compatibility-fixture-v1",
  sourcePath: "src/content/unsafe-miri-mut-slot-with-mut.ts",
  sourceFileSha256:
    "f3b13643df7185f29147cffd92c02405feb37c5674c88b90ca1115fbc3bc30dd",
  captureSha256: a9GenuineRegistrySha256,
  stateSha256: a9GenuineStateSha256,
  lessonId: a9ModelLessonId,
  stepId: a9ModelStepId,
  previousPrompt: a9PreviousPrompt,
  currentPrompt: a9CurrentPrompt,
  previousModelStepSha256: a9PreviousModelStepSha256,
  currentModelStepSha256: a9ModelStepSha256,
  beforeRegistrySha256ByKey: a9PreAuthoringRegistrySha256ByKey,
} as const;

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

type Registry = Record<string, unknown>;

function restoreModelPrompt(registry: unknown): unknown {
  if (!registry || typeof registry !== "object") return registry;
  const record = registry as Registry;
  if (!Array.isArray(record.lessons)) return registry;
  let changed = false;
  const lessons = record.lessons.map((lesson) => {
    if (!lesson || typeof lesson !== "object") return lesson;
    const lessonRecord = lesson as Registry;
    if (
      lessonRecord.id !== a9ModelLessonId ||
      !Array.isArray(lessonRecord.steps)
    ) {
      return lesson;
    }
    const steps = lessonRecord.steps.map((step) => {
      if (!step || typeof step !== "object") return step;
      const stepRecord = step as Registry;
      if (
        stepRecord.id !== a9ModelStepId ||
        hashJson(stepRecord) !== a9ModelStepSha256
      ) {
        return step;
      }
      changed = true;
      return { ...stepRecord, prompt: a9PreviousPrompt };
    });
    return changed ? { ...lessonRecord, steps } : lesson;
  });
  return changed ? { ...record, lessons } : registry;
}

/**
 * Restore only the reviewed A9 prompt delta. The full namespace, aliases,
 * functions, unknown keys, and registry order remain untouched.
 */
export function historicalBeforeA9<T extends typeof Course>(course: T): T {
  const projected: Record<string, unknown> = { ...course };
  const topLevel = restoreModelPrompt(course) as T;
  if (topLevel !== course) projected.lessons = topLevel.lessons;
  const defaultRegistry = (course as T & { default?: unknown }).default;
  if (defaultRegistry !== undefined) {
    projected.default = restoreModelPrompt(defaultRegistry);
  }
  return projected as T;
}

export function historicalBeforeA9ThenCapstoneMaintenance<
  T extends typeof Course,
>(course: T): T {
  return historicalBeforeCapstoneMaintenance(historicalBeforeA9(course));
}

export function historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return historicalBeforeA8ThenA7ThenExistingContractRepair(
    historicalBeforeA9(course),
  );
}
