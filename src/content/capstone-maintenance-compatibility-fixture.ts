/** Test-only exact projection for the genuine pre-A8 course registry. */
import { createHash } from "node:crypto";
import type * as Course from "./course";
import {
  historicalBeforeA7ThenExistingContractRepair,
} from "./performance-investigation-compatibility-fixture";
import projection from "./fixtures/capstone-maintenance-pre-a8-projection.json";

type PathPart = string | number;
type Restoration = {
  registry: string;
  selector: string;
  path?: PathPart[];
  operation:
    | "remove-exact-item"
    | "remove-exact-appended-id"
    | "remove-exact-appended-files";
  removeValue?: string;
  removeCount?: number;
  removePaths?: string[];
  prefixSha256?: string;
  successorSha256: string;
  successorIndex?: number;
};

export const acceptedPreA8Projection = projection;
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

function replaceAtPath(
  value: unknown,
  path: PathPart[],
  replacement: unknown,
): Record<string | number, unknown> {
  if (path.length === 0 || !value || typeof value !== "object") {
    return value as Record<string | number, unknown>;
  }
  const [head, ...tail] = path;
  const container = value as Record<string | number, unknown>;
  return {
    ...container,
    [head]: tail.length
      ? replaceAtPath(container[head], tail, replacement)
      : replacement,
  };
}

function projectOneRegistry(registry: unknown, entries: Restoration[]) {
  let projected: unknown = registry;
  for (const entry of entries) {
    if (Array.isArray(projected)) {
      const index = projected.findIndex(
        (item: unknown) =>
          item !== null &&
          typeof item === "object" &&
          (item as { id?: unknown }).id === entry.selector,
      );
      if (index < 0) continue;
      if (entry.operation === "remove-exact-item") {
        if (
          sha256Json(projected[index]) === entry.successorSha256 &&
          (entry.successorIndex === undefined || entry.successorIndex === index)
        ) {
          projected = projected.filter((_, itemIndex) => itemIndex !== index);
        }
        continue;
      }
      if (
        entry.operation === "remove-exact-appended-id" ||
        entry.operation === "remove-exact-appended-files"
      ) {
        const selected = projected[index];
        if (!selected || typeof selected !== "object") continue;
        const currentField = getAtPath(selected, entry.path ?? []);
        const removeCount = entry.removeCount ?? 1;
        const tail = Array.isArray(currentField)
          ? currentField.slice(-removeCount)
          : [];
        const tailPaths = tail.map((item) =>
          item && typeof item === "object" && "path" in item
            ? (item as { path?: unknown }).path
            : undefined,
        );
        if (
          !Array.isArray(currentField) ||
          sha256Json(currentField) !== entry.successorSha256 ||
          sha256Json(currentField.slice(0, -removeCount)) !==
            entry.prefixSha256 ||
          (entry.operation === "remove-exact-appended-id"
            ? currentField.at(-1) !== entry.removeValue
            : JSON.stringify(tailPaths) !== JSON.stringify(entry.removePaths))
        ) {
          continue;
        }
        const replacement = {
          ...replaceAtPath(
            selected,
            entry.path ?? [],
            currentField.slice(0, -removeCount),
          ),
        };
        projected = projected.map((item, itemIndex) =>
          itemIndex === index ? replacement : item,
        );
      }
      continue;
    }

    if (!projected || typeof projected !== "object") continue;
    const selectorValue = (projected as Record<string, unknown>)[entry.selector];
    if (!selectorValue || typeof selectorValue !== "object") continue;
    const currentField = getAtPath(selectorValue, entry.path ?? []);
    if (
      entry.operation !== "remove-exact-appended-id" ||
      !Array.isArray(currentField) ||
      sha256Json(currentField) !== entry.successorSha256 ||
      sha256Json(currentField.slice(0, -1)) !== entry.prefixSha256 ||
      currentField.at(-1) !== entry.removeValue
    )
      continue;
    const path = entry.path ?? [];
    if (path.length !== 1 || typeof path[0] !== "string") continue;
    projected = {
      ...(projected as Record<string, unknown>),
      [entry.selector]: {
        ...(selectorValue as Record<string, unknown>),
        [path[0]]: currentField.slice(0, -1),
      },
    };
  }
  return projected;
}

/**
 * Removes only the exact authored A8 lesson and its two composition bindings.
 * Near misses, unrelated mutations, unknown aliases and function references
 * remain observable to historical consumers.
 */
export function historicalBeforeCapstoneMaintenance<T extends typeof Course>(
  course: T,
): T {
  const projected: Record<string, unknown> = { ...course };
  for (const registryName of new Set(
    restorations.map((entry) => entry.registry),
  )) {
    projected[registryName] = projectOneRegistry(
      projected[registryName],
      restorations.filter((entry) => entry.registry === registryName),
    );
  }

  const namespace = course as T & {
    default?: Record<string, unknown>;
  };
  if (namespace.default && typeof namespace.default === "object") {
    const defaultProjected: Record<string, unknown> = {
      ...namespace.default,
    };
    for (const registryName of new Set(
      restorations.map((entry) => entry.registry),
    )) {
      defaultProjected[registryName] = projectOneRegistry(
        defaultProjected[registryName],
        restorations.filter((entry) => entry.registry === registryName),
      );
    }
    projected.default = defaultProjected;
  }
  return projected as T;
}

/** Newest-first historical view for consumers predating A8, A7 and C1. */
export function historicalBeforeA8ThenA7ThenExistingContractRepair<
  T extends typeof Course,
>(course: T): T {
  return historicalBeforeA7ThenExistingContractRepair(
    historicalBeforeCapstoneMaintenance(course),
  ) as T;
}
