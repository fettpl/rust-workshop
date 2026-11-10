import { createHash } from "node:crypto";
import type * as Course from "./course";
import {
  historicalBeforeA11 as beforeA11,
  historicalBeforeA10 as beforeA10,
  historicalBeforeA10ThenA9 as beforeA10ThenA9,
  historicalBeforeA10ThenA9ThenCapstoneMaintenance as beforeCapstoneMaintenance,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as beforeExistingContractRepairThroughA7,
  historicalBeforeA10ThenExistingContractRepair as beforeExistingContractRepair,
} from "./service-authorization-compatibility-fixture";

const arrayAdditions = {
  modules: [
    {
      index: 50,
      id: "file-schema-evolution",
      hash: "cbbe5fba12015318335eb9d5fc6cbf356167ee297affdba88054b652d80facf5",
    },
  ],
  lessons: [
    {
      index: 202,
      id: "file-schema-normalization",
      hash: "2c5b5f91ff0d40f60fdfe331cddec348a6c33071a4bbb8d25ba030ddf89bd9f9",
    },
    {
      index: 203,
      id: "file-schema-explicit-upgrade",
      hash: "0616247d6b890f0b3011c20e1fb1bbd481516c5f5dc20826525e1f7efc196a45",
    },
  ],
  concepts: [
    {
      index: 198,
      id: "file-version-meaning",
      hash: "3a1a083a0d252360fbc8451a77bc03fcb5bb1b8380fd1d7a06ca384757976f30",
    },
  ],
  competencies: [
    {
      index: 199,
      id: "file-identity-evolution",
      hash: "4b4ed2914e355d4ae5145da2e6c2a096853b9047b157fa3f5aac56b141ca3f7c",
    },
  ],
  projects: [
    {
      index: 15,
      id: "file-schema-evolution",
      hash: "73188b4905d95ce8d25ae077b34cb4bd43a2af6a8243f705b9a1ca50c59dbac6",
    },
  ],
};
const reviewAdditions = {
  reviewExercises: "file-version-meaning",
  reviewExercisesById: "review-file-version-meaning",
};
const reviewIndex = 198;
const reviewHash =
  "3135a1ab6abf8a0c21aed342ee5fa6bb4e369baa349e794de136338f589137d8";

// The retry starter formatting follow-up changes two virtual Rust files.
const retryProjectFormat = {
  index: 13,
  liveHash: "d0bee7811bd12b1a612b90f77be726d8accf6ac6ffadb7211ec04c9be787a0a5",
  historicalHash:
    "e364d16da0b15fba65f1acc67cfc5cd885265bbb96c0ed1d5a968f8c2be090f3",
  members: [
    {
      path: "crates/ingest-service/src/bin/ingest-retry-client.rs",
      historical: String.raw`#![forbid(unsafe_code)]
fn main() { eprintln!("uzupełnij zamknięty klient retry"); }
`,
    },
    {
      path: "crates/ingest-service/tests/retry_client.rs",
      historical: String.raw`#![forbid(unsafe_code)]
#[test]
fn retry_contract_is_your_work() { todo!("zapisz parser, budżet i agregację Unknown"); }
`,
    },
  ],
} as const;

export const hashRegistryValue = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

type Registry = Record<PropertyKey, unknown>;

function objectRecord(value: unknown): value is Registry {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// A hash of JSON alone would accept extra undefined, symbol, or non-enumerable fields.
function isCompleteJson(
  value: unknown,
  ancestors = new Set<object>(),
): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return true;
  if (typeof value === "number")
    return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  const array = Array.isArray(value);
  if (
    Object.getPrototypeOf(value) !==
    (array ? Array.prototype : Object.prototype)
  )
    return false;
  const keys = Reflect.ownKeys(value);
  if (
    array &&
    (keys.length !== value.length + 1 ||
      !keys.slice(0, -1).every((key, index) => key === String(index)))
  )
    return false;
  ancestors.add(value);
  const complete = keys.every((key) => {
    if (array && key === "length") return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      typeof key === "string" &&
      descriptor?.enumerable === true &&
      "value" in descriptor &&
      isCompleteJson(descriptor.value, ancestors)
    );
  });
  ancestors.delete(value);
  return complete;
}

function matches(value: unknown, hash: string): boolean {
  return isCompleteJson(value) && hashRegistryValue(value) === hash;
}

function recognized(registry: Registry): boolean {
  for (const [key, additions] of Object.entries(arrayAdditions)) {
    const records = registry[key];
    if (!Array.isArray(records)) return false;
    for (const { id, index, hash } of additions) {
      if (
        !matches(records[index], hash) ||
        records.filter((item) => objectRecord(item) && item.id === id)
          .length !== 1
      )
        return false;
    }
  }
  for (const [key, addition] of Object.entries(reviewAdditions)) {
    const reviews = registry[key];
    if (
      !objectRecord(reviews) ||
      Object.keys(reviews)[reviewIndex] !== addition ||
      !matches(reviews[addition], reviewHash)
    )
      return false;
  }
  return true;
}

function copyRegistry(input: Registry, replacements: Map<unknown, unknown>) {
  const result = replacements.get(input) as Registry;
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    const projectedKey =
      key === "default" ||
      Object.hasOwn(arrayAdditions, key) ||
      Object.hasOwn(reviewAdditions, key);
    // Only the known authored getters may be read. Unknown accessors stay intact.
    const value =
      "value" in descriptor
        ? descriptor.value
        : projectedKey
          ? input[key]
          : undefined;
    Object.defineProperty(
      result,
      key,
      replacements.has(value)
        ? {
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable,
            writable: descriptor.writable ?? false,
            value: replacements.get(value),
          }
        : descriptor,
    );
  }
}

function withValue<T extends object, Key extends keyof T>(
  value: T,
  key: Key,
  replacement: T[Key],
): T {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  descriptors[key] = { ...descriptors[key], value: replacement };
  return Object.create(Object.getPrototypeOf(value), descriptors);
}

function restoreRetryStarter(projects: typeof Course.projects) {
  const { index, liveHash, historicalHash, members } = retryProjectFormat;
  const project = projects[index];
  if (
    !matches(project, liveHash) ||
    project.id !== "durable-log-retry" ||
    projects.some(
      (item, other) =>
        other !== index &&
        objectRecord(item) &&
        Object.getOwnPropertyDescriptor(item, "id")?.value === project.id,
    ) ||
    project.package?.id !== "durable-log-retry-workspace"
  )
    return;

  const files = project.package.files;
  const descriptors = Object.fromEntries(
    Object.entries(Object.getOwnPropertyDescriptors(files)),
  );
  for (const member of members) {
    const index = files.findIndex((file) => file.path === member.path);
    const file = files[index];
    if (!file) return;
    descriptors[index] = {
      ...descriptors[index],
      value: withValue(file, "starter", member.historical),
    };
  }
  const historical = withValue(
    project,
    "package",
    withValue(
      project.package,
      "files",
      Object.defineProperties([], descriptors),
    ),
  );
  if (matches(historical, historicalHash)) return { project, historical };
}

function collectAdditions(
  registry: Registry,
  replacements: Map<unknown, unknown>,
) {
  for (const [key, additions] of Object.entries(arrayAdditions)) {
    const items = registry[key] as unknown[];
    if (replacements.has(items)) continue;
    const indices = new Set(additions.map(({ index }) => index));
    const projected = items.filter((_, index) => !indices.has(index));
    if (key === "projects") {
      const retry = restoreRetryStarter(items as typeof Course.projects);
      if (retry) {
        if (!replacements.has(retry.project))
          replacements.set(retry.project, retry.historical);
        projected[retryProjectFormat.index] = replacements.get(retry.project);
      }
    }
    for (const key of Reflect.ownKeys(items)) {
      if (
        key === "length" ||
        (typeof key === "string" &&
          /^(0|[1-9]\d*)$/.test(key) &&
          Number(key) < items.length)
      )
        continue;
      Object.defineProperty(
        projected,
        key,
        Object.getOwnPropertyDescriptor(items, key)!,
      );
    }
    replacements.set(items, projected);
  }
  for (const [key, addition] of Object.entries(reviewAdditions)) {
    const items = registry[key] as Registry;
    if (replacements.has(items)) continue;
    const descriptors = Object.getOwnPropertyDescriptors(items);
    delete descriptors[addition];
    replacements.set(
      items,
      Object.create(Object.getPrototypeOf(items), descriptors),
    );
  }
}

/** Removes the complete authored A12 successor or returns the input unchanged. */
export function historicalBeforeA12<T extends typeof Course>(course: T): T {
  const input = course as unknown as Registry;
  const defaultRegistry = input.default;
  if (
    !recognized(input) ||
    (objectRecord(defaultRegistry) &&
      defaultRegistry !== input &&
      !recognized(defaultRegistry))
  )
    return course;

  const registries =
    objectRecord(defaultRegistry) && defaultRegistry !== input
      ? [input, defaultRegistry]
      : [input];
  const replacements = new Map<unknown, unknown>();
  for (const registry of registries) {
    collectAdditions(registry, replacements);
    replacements.set(registry, Object.create(Object.getPrototypeOf(registry)));
  }
  for (const registry of registries) copyRegistry(registry, replacements);
  return replacements.get(input) as T;
}

export function historicalBeforeA11<T extends typeof Course>(course: T): T {
  return beforeA11(historicalBeforeA12(course));
}
export function historicalBeforeA10<T extends typeof Course>(course: T): T {
  return beforeA10(historicalBeforeA12(course));
}
export function historicalBeforeA10ThenA9<T extends typeof Course>(
  course: T,
): T {
  return beforeA10ThenA9(historicalBeforeA12(course));
}
export function historicalBeforeA10ThenA9ThenCapstoneMaintenance<
  T extends typeof Course,
>(course: T): T {
  return beforeCapstoneMaintenance(historicalBeforeA12(course));
}
export function historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return beforeExistingContractRepairThroughA7(historicalBeforeA12(course));
}
export function historicalBeforeA10ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return beforeExistingContractRepair(historicalBeforeA12(course));
}
