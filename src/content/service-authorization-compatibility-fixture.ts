import { createHash } from "node:crypto";
import type * as Course from "./course";
import {
  historicalBeforeA10 as baseHistoricalBeforeA10,
  historicalBeforeA10ThenA9 as baseHistoricalBeforeA10ThenA9,
  historicalBeforeA10ThenA9ThenCapstoneMaintenance as baseHistoricalBeforeA10ThenA9ThenCapstoneMaintenance,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as baseHistoricalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair,
  historicalBeforeA10ThenExistingContractRepair as baseHistoricalBeforeA10ThenExistingContractRepair,
} from "./service-client-retry-compatibility-fixture";
export const a11CaptureBinding = {
  registrySha256:
    "e44b3a2c1673cea991b0aa4d56ad726b64d681662054723f29e6a93a45748761",
  stateSha256:
    "e3c53796150268af8426d3ea9f47a3f0cd6aee692ebf0f88c149ad0ba2171b11",
  wholeCourseSha256:
    "310c52f02de0658c1adc7f59f2ae205379a5829291443d7523fe1d2f0cd1cbed",
} as const;
export const a11PreAuthoringRegistrySha256ByKey = {
  competencies:
    "e75915964efa40f735c8f9fc6b3492261fe3c4594f30fa1347f5d40d8469c03e",
  concepts: "bcaf99dbf76b5690e35925b27bbafd1b06550aa62fdb1891c714d40f0ee7d368",
  default: "16fe5044afc26854e2d33bba993db2a2191fccff9cbaac53ab8d9506bfd19a02",
  delayedReviewExercises:
    "420207547e86af34b82e50d6735ba5a262554ca77b409c9609f2fa2e3cc96d7c",
  lessons: "aba9f8dcea45c41a28132f8f1df45027e113f0015373e6d514a6720a5843f7b3",
  modules: "ff2aa6dd45bc774495bd9835edd156ec77de97e53a1a07f22fa8637ab6db5e36",
  ownershipModule:
    "a49b89d28c14ca64c42429ac0d946ee13b6f5d638cd55ea311c1e6746b44cec1",
  project: "6e6174f2465c09cd958a9bfd1ccc0a6394e69dc1e338c2281195f33d29691550",
  projects: "79a293dffab2d75d131706054a6d8d742d1336b555e1e4f1fdadb9c0e68050cf",
  reviewExercises:
    "dc807174d0275b95975e12af40b14ac9c1db99c1b59d2c2ec610242bf15ffbf8",
  reviewExercisesById:
    "336e4e7d4746c7e6b2e8f5a3c4764e3e9f7297c031dc20d5b4a5b23b416ffcac",
  roadmap: "63c94381759dcb101770b8f8f56e3d66aebdcf27e19e6fccfaa21c1d8971792a",
  shortReviewExercises:
    "646f785b505ac5f45e8ba5230e4b87decb39a5edadb08bde83f7e4d7603a1db7",
  sources: "e9ae605cb3b4accd0483bef877e991c113a53ae4b069838bcde34d3c52ff194a",
  traces: "f501901ba89841109381b3f99e858606cb6cebd888b595518f556504efcaa263",
} as const;
// Exact authored successor positions and complete-object digests; no id-only deletion.
export const a11SuccessorRecords = {
  modules: [
    {
      index: 49,
      id: "service-authorization",
      sha256:
        "9d02a1c4c0479b379daa5c68ee88ef0296db897ef556a364f0ca94153c76a70d",
    },
  ],
  lessons: [
    {
      index: 198,
      id: "service-authorization-policy",
      sha256:
        "dd27e6f65f2a9416e958ad961ad26e5220512bd82a1da1583e56414ec7576329",
    },
    {
      index: 199,
      id: "service-authorization-attenuation",
      sha256:
        "a94594038138c10f043cffb7c629e46d1ca3bc82c6d6ff22384bef5e9da6856b",
    },
    {
      index: 200,
      id: "service-authorization-binding",
      sha256:
        "d32c6a78ea309d67e5fdfae3f06eff287484f9b052095ee585005fd8916dd5a8",
    },
    {
      index: 201,
      id: "service-authorization-admission",
      sha256:
        "10ffd3f6dc2504d94bbe39046d2b782582f56467f88901856a880154ba1fd5d1",
    },
  ],
  concepts: [
    {
      index: 196,
      id: "service-scoped-authority",
      sha256:
        "3b4c3b4e72a5490d4ee210f16bb2aef7d0ea920b810685f773f63a6e10bb310e",
    },
    {
      index: 197,
      id: "service-bound-authorization-use",
      sha256:
        "1b91f31438c95583e40d19c067a9e59d17c2e0d1bc164d60a35c6be9927dd959",
    },
  ],
  competencies: [
    {
      index: 197,
      id: "service-scoped-authority-competency",
      sha256:
        "c122fa40ddad649c46e26c39c049e741bcbeb49315876e51c3a9b4b5cb209590",
    },
    {
      index: 198,
      id: "service-bound-authorization-use-competency",
      sha256:
        "4ce81ce0a5463d76a5319473bd64142da7bae22a2ca12b33311a7f8b90a0a187",
    },
  ],
  projects: [
    {
      index: 14,
      id: "service-authorization",
      sha256:
        "b0c2b9fd0aced454ad04eff90c150332f72c56357f1d5da60c22cb1c197a338e",
    },
  ],
  reviewExercises: [
    {
      key: "service-scoped-authority",
      sha256:
        "6b21e755dd6bf2aeae8157b6e6dcd576792f93c79e4ddad7b614dc785ed2d89d",
    },
    {
      key: "service-bound-authorization-use",
      sha256:
        "b6f8531386c114124fd860e86ab0141a7fcdf3643e4e48209a5c00baf4c21617",
    },
  ],
  reviewExercisesById: [
    {
      key: "review-service-scoped-authority",
      sha256:
        "6b21e755dd6bf2aeae8157b6e6dcd576792f93c79e4ddad7b614dc785ed2d89d",
    },
    {
      key: "review-service-bound-authorization-use",
      sha256:
        "b6f8531386c114124fd860e86ab0141a7fcdf3643e4e48209a5c00baf4c21617",
    },
  ],
} as const;
const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const arrays = [
  "modules",
  "lessons",
  "concepts",
  "competencies",
  "projects",
] as const;
const maps = ["reviewExercises", "reviewExercisesById"] as const;
function recognized(registry: Record<string, unknown>): boolean {
  for (const key of arrays) {
    const value = registry[key];
    if (!Array.isArray(value)) return false;
    for (const record of a11SuccessorRecords[key]) {
      if (
        value.filter(
          (item) => item && typeof item === "object" && item.id === record.id,
        ).length !== 1
      )
        return false;
      if (
        !value[record.index] ||
        hashJson(value[record.index]) !== record.sha256
      )
        return false;
    }
  }
  for (const key of maps) {
    const value = registry[key];
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    for (const record of a11SuccessorRecords[key]) {
      const item = (value as Record<string, unknown>)[record.key];
      if (!item || hashJson(item) !== record.sha256) return false;
    }
  }
  return true;
}
function projectRegistry(
  registry: Record<string, unknown>,
  aliases?: Map<unknown, unknown>,
): Record<string, unknown> {
  if (!recognized(registry)) return registry;
  const result = { ...registry };
  for (const key of arrays) {
    const input = registry[key] as unknown[];
    const positions = new Set<number>(
      a11SuccessorRecords[key].map((record) => record.index),
    );
    const projected =
      aliases?.get(input) ?? input.filter((_, index) => !positions.has(index));
    result[key] = projected;
    aliases?.set(input, projected);
  }
  for (const key of maps) {
    const input = registry[key] as Record<string, unknown>;
    const projected =
      aliases?.get(input) ??
      Object.fromEntries(
        Object.entries(input).filter(
          ([name]) =>
            !a11SuccessorRecords[key].some((record) => record.key === name),
        ),
      );
    result[key] = projected;
    aliases?.set(input, projected);
  }
  return result;
}
/** Project only a complete recognized successor; preserve functions, undefined and unknown values. */
export function historicalBeforeA11<T extends typeof Course>(course: T): T {
  const input = course as unknown as Record<string, unknown>;
  if (!recognized(input)) return course;
  const aliases = new Map<unknown, unknown>();
  const result = projectRegistry(input, aliases);
  if (
    input.default &&
    typeof input.default === "object" &&
    !Array.isArray(input.default)
  ) {
    result.default =
      input.default === input
        ? result
        : projectRegistry(input.default as Record<string, unknown>, aliases);
  }
  return result as T;
}
export function historicalBeforeA10<T extends typeof Course>(course: T): T {
  return baseHistoricalBeforeA10(historicalBeforeA11(course));
}
export function historicalBeforeA10ThenA9<T extends typeof Course>(
  course: T,
): T {
  return baseHistoricalBeforeA10ThenA9(historicalBeforeA11(course));
}
export function historicalBeforeA10ThenA9ThenCapstoneMaintenance<
  T extends typeof Course,
>(course: T): T {
  return baseHistoricalBeforeA10ThenA9ThenCapstoneMaintenance(
    historicalBeforeA11(course),
  );
}
export function historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return baseHistoricalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair(
    historicalBeforeA11(course),
  );
}
export function historicalBeforeA10ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return baseHistoricalBeforeA10ThenExistingContractRepair(
    historicalBeforeA11(course),
  );
}
