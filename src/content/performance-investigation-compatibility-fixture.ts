/** Test-only central projection for the genuine pre-A7 performance investigation course. */
import { createHash } from "node:crypto";
import type * as Course from "./course";
import { historicalBeforeExistingContractRepair } from "./existing-contract-repair-compatibility-fixture";
import projection from "./fixtures/performance-investigation-pre-a7-projection.json";

type PathPart = string | number;
type Restoration = {
  registry: string;
  selector: string;
  path?: PathPart[];
  operation:
    | "remove-exact-item"
    | "remove-exact-appended-id"
    | "remove-exact-appended-files"
    | "restore-exact-file-fields";
  removeValue?: string;
  removeValues?: string[];
  prefixSha256?: string;
  filePath?: string;
  fields?: string[];
  before?: string;
  successorSha256: string;
  successorIndex?: number;
};

export const acceptedPreA7Projection = projection;

const restorations = projection.restorations as Restoration[];

const sha256Json = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function getAtPath(value: unknown, path: PathPart[]): unknown {
  let current: unknown = value;
  for (const part of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[part];
  }
  return current;
}

function projectOneRegistry(registry: unknown, entries: Restoration[]) {
  let projected: unknown = registry;
  for (const entry of entries) {
    if (!Array.isArray(projected)) {
      if (entry.operation !== "remove-exact-appended-id") continue;
      const current = (projected as Record<string, unknown> | undefined)?.[
        entry.selector
      ];
      if (!current || typeof current !== "object") continue;
      const currentField = getAtPath(current, entry.path ?? []);
      if (
        !Array.isArray(currentField) ||
        sha256Json(currentField) !== entry.successorSha256 ||
        currentField.at(-1) !== entry.removeValue
      )
        continue;
      const restored = {
        ...(current as Record<string, unknown>),
        ...(entry.path?.length === 1
          ? { [entry.path[0]]: currentField.slice(0, -1) }
          : {}),
      };
      projected = {
        ...(projected as Record<string, unknown>),
        [entry.selector]: restored,
      };
      continue;
    }

    const index = projected.findIndex(
      (item: unknown) =>
        item !== null &&
        typeof item === "object" &&
        (item as { id?: unknown }).id === entry.selector,
    );
    if (
      index < 0 ||
      (entry.successorIndex !== undefined && index !== entry.successorIndex)
    )
      continue;
    const current = projected[index];
    if (entry.operation === "restore-exact-file-fields") {
      const currentField = getAtPath(current, entry.path ?? []);
      if (
        !Array.isArray(currentField) ||
        !entry.filePath ||
        !entry.fields?.length ||
        typeof entry.before !== "string"
      )
        continue;
      const fileIndex = currentField.findIndex(
        (item: unknown) =>
          item !== null &&
          typeof item === "object" &&
          (item as { path?: unknown }).path === entry.filePath,
      );
      if (fileIndex < 0) continue;
      const file = currentField[fileIndex] as Record<string, unknown>;
      if (
        entry.fields.some(
          (field) => sha256Json(file[field]) !== entry.successorSha256,
        )
      )
        continue;
      const restoredFiles = [...currentField];
      restoredFiles[fileIndex] = {
        ...file,
        ...Object.fromEntries(
          entry.fields.map((field) => [field, entry.before]),
        ),
      };
      const path = entry.path ?? [];
      if (
        path.length !== 2 ||
        typeof path[0] !== "string" ||
        typeof path[1] !== "string"
      )
        continue;
      const restored = {
        ...(current as Record<string, unknown>),
        [path[0]]: {
          ...(current[path[0]] as Record<string, unknown>),
          [path[1]]: restoredFiles,
        },
      };
      const copy = [...projected];
      copy[index] = restored;
      projected = copy;
      continue;
    }
    if (entry.operation === "remove-exact-item") {
      if (sha256Json(current) !== entry.successorSha256) continue;
      projected = projected.filter((_, itemIndex) => itemIndex !== index);
      continue;
    }
    const currentField = getAtPath(current, entry.path ?? []);
    const appendedFileCount = entry.removeValues?.length ?? 0;
    if (
      !Array.isArray(currentField) ||
      (entry.operation === "remove-exact-appended-files"
        ? sha256Json(currentField.slice(0, -appendedFileCount)) !==
            entry.prefixSha256 ||
          sha256Json(currentField) !== entry.successorSha256
        : sha256Json(currentField) !== entry.successorSha256) ||
      (entry.operation === "remove-exact-appended-id"
        ? currentField.at(-1) !== entry.removeValue
        : JSON.stringify(
            currentField
              .slice(-(entry.removeValues?.length ?? 0))
              .map((item) => (item as { path?: unknown }).path),
          ) !== JSON.stringify(entry.removeValues))
    )
      continue;
    const path = entry.path ?? [];
    const restoredField =
      entry.operation === "remove-exact-appended-files"
        ? currentField.slice(0, -(entry.removeValues?.length ?? 0))
        : currentField.slice(0, -1);
    let restored: Record<string, unknown>;
    if (path.length === 1 && typeof path[0] === "string") {
      restored = {
        ...(current as Record<string, unknown>),
        [path[0]]: restoredField,
      };
    } else if (
      path.length === 2 &&
      typeof path[0] === "string" &&
      typeof path[1] === "string" &&
      current[path[0]] !== null &&
      typeof current[path[0]] === "object"
    ) {
      restored = {
        ...(current as Record<string, unknown>),
        [path[0]]: {
          ...(current[path[0]] as Record<string, unknown>),
          [path[1]]: restoredField,
        },
      };
    } else continue;
    const copy = [...projected];
    copy[index] = restored;
    projected = copy;
  }
  return projected;
}

/**
 * Projects only the exact authored A7 lesson and its appended module lesson ID
 * away for historical tests. Unknown keys, aliases, registry order, unrelated
 * mutations, and near misses remain observable.
 */
export function historicalBeforePerformanceInvestigation<
  T extends typeof Course,
>(course: T): T {
  const projected: Record<string, unknown> = { ...course };
  for (const registryName of new Set(
    restorations.map((entry) => entry.registry),
  )) {
    const entries = restorations.filter(
      (entry) => entry.registry === registryName,
    );
    projected[registryName] = projectOneRegistry(
      projected[registryName],
      entries,
    );
  }
  const namespace = course as typeof Course & {
    default?: Record<string, unknown>;
  };
  if (namespace.default && typeof namespace.default === "object") {
    const defaultProjected: Record<string, unknown> = {
      ...namespace.default,
    };
    for (const registryName of new Set(
      restorations.map((entry) => entry.registry),
    )) {
      const entries = restorations.filter(
        (entry) => entry.registry === registryName,
      );
      defaultProjected[registryName] = projectOneRegistry(
        defaultProjected[registryName],
        entries,
      );
    }
    projected.default = defaultProjected;
  }
  return projected as T;
}

/** Newest-first adapter for historical consumers that require the pre-C1 view. */
export function historicalBeforeA7ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  const a7Projected = historicalBeforePerformanceInvestigation(course);
  const projected = historicalBeforeExistingContractRepair(a7Projected) as T & {
    default?: Record<string, unknown>;
  };
  const originalDefault = (
    course as T & {
      default?: Record<string, unknown>;
    }
  ).default;
  const a7Default = a7Projected as T & {
    default?: Record<string, unknown>;
  };
  if (!originalDefault || !a7Default.default) return projected;

  // The capture's `default` namespace is a real independent registry object,
  // not a pointer to the module namespace. Project it through the immutable C1
  // helper separately, while retaining unknown default keys/functions.
  const defaultInput = {
    ...a7Projected,
    ...a7Default.default,
  } as typeof Course;
  const defaultAfterC1 = historicalBeforeExistingContractRepair(defaultInput);
  const defaultOutput: Record<string, unknown> = {
    ...a7Default.default,
  };
  for (const registryName of acceptedPreA7Projection.predecessor.registryKeys) {
    if (registryName !== "default") {
      defaultOutput[registryName] = (
        defaultAfterC1 as unknown as Record<string, unknown>
      )[registryName];
    }
  }
  projected.default = defaultOutput;
  return projected as T;
}
