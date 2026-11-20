import { createHash } from "node:crypto";
import type * as Course from "./course";
import {
  historicalBeforeA9,
  historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair,
  historicalBeforeA9ThenCapstoneMaintenance,
} from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";
import { historicalBeforeExistingContractRepair as historicalBeforeC1 } from "./existing-contract-repair-compatibility-fixture";

export const a10ModuleId = "service-client-retry" as const;
export const a10LessonIds = [
  "service-client-bounded-retry",
  "service-client-ambiguous-driver",
] as const;
export const a10ConceptIds = [
  "service-client-retry-policy",
  "service-client-ambiguity-contract",
] as const;
export const a10CompetencyIds = [
  "service-client-bounded-policy-competency",
  "service-client-ambiguity-competency",
] as const;
export const a10SourceIds = [] as const;
export const a10ReviewIds = [
  "service-client-retry-policy",
  "service-client-ambiguity-contract",
] as const;
export const a10GenuineRegistrySha256 =
  "dcb472f00e3ef9e1053852db94794b53339e0bbb59b3874d31f2f814a08591e6";
export const a10GenuineStateSha256 =
  "3a284ea133d650a89bb81e105c2941337db1933121e09fa881311ec9de9d03cb";
export const a10WholeCourseSha256 =
  "19fdd3279623a88525bee94d613ca7619f04b6575f6ca6c90f3b07301e04d3d7";
export const a10CaptureBinding = {
  registryPath: "research/authentic-pre-a10-registry.json",
  registrySha256: a10GenuineRegistrySha256,
  statePath: "research/state-history-pre-a10.json",
  stateSha256: a10GenuineStateSha256,
  wholeCourseSha256: a10WholeCourseSha256,
} as const;
export const a10PreAuthoringRegistrySha256ByKey = {
  competencies: "4e3a94355c196b6276e2aec7f1c6188f8c534ee806333bcb31a996cfb4fa1851",
  concepts: "5c8c7c63490fe024c47b6dab628e0c804c8e1f32b7be54123d8898c5482df358",
  default: "e44d2e8427b5c60217ddc4cadf8e54364146ac42058c6cd92f963c79ca7dfc9c",
  delayedReviewExercises: "420207547e86af34b82e50d6735ba5a262554ca77b409c9609f2fa2e3cc96d7c",
  lessons: "069f438aed62c3a15fbe961da2b6c03679c10de7dad63b6a76c3e0e9f73cda4e",
  modules: "01ae65942a932b94ea7a2702db7bfe7d27d9ee4f7bec7624739bed13363b504b",
  ownershipModule: "a49b89d28c14ca64c42429ac0d946ee13b6f5d638cd55ea311c1e6746b44cec1",
  project: "6e6174f2465c09cd958a9bfd1ccc0a6394e69dc1e338c2281195f33d29691550",
  projects: "1ec5c951cca3e3f98793581ef8b1921c5514e2d21e5a2eca9c48a2814176fac0",
  reviewExercises: "7cea35a71e381a39be8fc48555421b1d99b6c255bd1a88c1a9e47a3585d3e388",
  reviewExercisesById: "b18e4b1a3f2a17dbc317f27a20772a213f43b8b8150435bc8237fe32e86c0a2e",
  roadmap: "63c94381759dcb101770b8f8f56e3d66aebdcf27e19e6fccfaa21c1d8971792a",
  shortReviewExercises: "646f785b505ac5f45e8ba5230e4b87decb39a5edadb08bde83f7e4d7603a1db7",
  sources: "e9ae605cb3b4accd0483bef877e991c113a53ae4b069838bcde34d3c52ff194a",
  traces: "f501901ba89841109381b3f99e858606cb6cebd888b595518f556504efcaa263",
} as const;

/** Exact successor records; projection removes only these positions and hashes. */
export const a10SuccessorRecords = {
  modules: [{ index: 48, sha256: "903abea9c9be668ccb043cde3ec2836ca99edef128c9f251f069ba1476de6571" }],
  lessons: [
    { index: 187, sha256: "7bb8205b85e546e63de79ab5aa67cc58b5ee6c15735aecbe46bcac6810cfc963" },
    { index: 188, sha256: "abcb5a58d5ba9388fb3ff659324921fe70d999f15ae74d615201430d10359ee1" },
  ],
  concepts: [
    { index: 187, sha256: "dace8ee5697a3154f28526ede2af59539983eb275a59e194f8f018d1f890001d" },
    { index: 188, sha256: "589fe4c6e01ba6906a7be756d527d88cc729a3599cd3191cd13ae563ef74bd24" },
  ],
  competencies: [
    { index: 192, sha256: "07f3c69bfb00042306404162ffadd8a6c086cdf35f7a2872dc41b84568ff211a" },
    { index: 193, sha256: "bdbfb03d1dd1e1a2f9faeb30c6131d7d9f6db87f29cd8e968d7d95532b3e26ea" },
  ],
  sources: [],
  projects: [{ index: 13, sha256: "e364d16da0b15fba65f1acc67cfc5cd885265bbb96c0ed1d5a968f8c2be090f3" }],
  reviewExercises: [
    { key: "service-client-retry-policy", sha256: "8fc839237ea8aecb18e76bbbb292f30c7b7ddd3430e8961476b121cd516a8d49" },
    { key: "service-client-ambiguity-contract", sha256: "2834fc7d18cd2eb4935d5fba2e1381a9e32e76341b4946274cb1d8982a9ae497" },
  ],
  reviewExercisesById: [
    { key: "review-service-client-retry-policy", sha256: "8fc839237ea8aecb18e76bbbb292f30c7b7ddd3430e8961476b121cd516a8d49" },
    { key: "review-service-client-ambiguity-contract", sha256: "2834fc7d18cd2eb4935d5fba2e1381a9e32e76341b4946274cb1d8982a9ae497" },
  ],
} as const;

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const a10ArrayIdentities = {
  modules: [a10ModuleId],
  lessons: [...a10LessonIds],
  concepts: [...a10ConceptIds],
  competencies: [...a10CompetencyIds],
  sources: [],
  projects: ["durable-log-retry"],
} as const;

function hasId(value: unknown, id: string): boolean {
  return typeof value === "object" && value !== null && "id" in value && value.id === id;
}

function withoutA10<T extends Record<string, unknown>>(registry: T): T {
  const result: Record<string, unknown> = { ...registry };
  for (const key of ["modules", "lessons", "concepts", "competencies", "sources", "projects"] as const) {
    const value = result[key];
    const expected = a10SuccessorRecords[key];
    if (!Array.isArray(value)) continue;
    const identities = a10ArrayIdentities[key];
    const identityCount = identities.filter((id) => value.some((item) => hasId(item, id))).length;
    if (identityCount === 0) continue;
    const exact = expected.filter(
      (record, recordIndex) => record.index >= 0 && record.index < value.length &&
        hashJson(value[record.index]) === record.sha256 &&
        hasId(value[record.index], identities[recordIndex] ?? ""),
    );
    // A missing, moved, duplicated or near-miss successor must remain visible;
    // do not strip any part of a partially matching authored addition.
    if (identityCount !== expected.length || exact.length !== expected.length) continue;
    let projected = value;
    for (const record of [...expected].sort((left, right) => right.index - left.index)) {
      projected = projected.filter((_, index) => index !== record.index);
    }
    result[key] = projected;
  }
  for (const key of ["reviewExercises", "reviewExercisesById"] as const) {
    const value = result[key];
    const expected = a10SuccessorRecords[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const copy = { ...(value as Record<string, unknown>) };
    for (const record of expected) {
      if (copy[record.key] === undefined) continue;
      if (hashJson(copy[record.key]) !== record.sha256) continue;
      delete copy[record.key];
    }
    result[key] = copy;
  }
  return result as T;
}

export function historicalBeforeA10<T extends typeof Course>(course: T): T {
  const projected: Record<string, unknown> = withoutA10(course as unknown as Record<string, unknown>);
  const defaultRegistry = (course as T & { default?: unknown }).default;
  if (defaultRegistry && typeof defaultRegistry === "object")
    projected.default = withoutA10(defaultRegistry as Record<string, unknown>);
  return projected as T;
}

export function historicalBeforeA10ThenA9<T extends typeof Course>(course: T): T {
  return historicalBeforeA9(historicalBeforeA10(course));
}

export function historicalBeforeA10ThenA9ThenCapstoneMaintenance<T extends typeof Course>(course: T): T {
  return historicalBeforeA9ThenCapstoneMaintenance(historicalBeforeA10(course));
}

export function historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair<T extends typeof Course>(course: T): T {
  return historicalBeforeA9ThenA8ThenA7ThenExistingContractRepair(historicalBeforeA10(course));
}

export function historicalBeforeA10ThenExistingContractRepair<T extends typeof Course>(course: T): T {
  return historicalBeforeC1(historicalBeforeA10(course)) as T;
}

export { hashJson };
