/** Test-only central projection for the genuine pre-C1 historical course. */
import { createHash } from "node:crypto";
import type * as Course from "./course";
import projection from "./fixtures/existing-contract-pre-c1-projection.json";

type PathPart = string | number;
type Restoration = {
  registry: string;
  selector: string;
  path: PathPart[];
  before: unknown;
  successorSha256: string;
};

const successorHashOverrides: Record<string, string> = {
  "concepts|unsafe-miri-byte-view-contract|reviewAnswer":
    "da0aa9a2989304dd6363b03e34874f1d38e512578d93fe1fe95b9b8ec62ac688",
  "reviewExercises|unsafe-miri-byte-view-contract|prompt":
    "e5673ed3e49371fc0306d110390373def4db439fff6b7da4b66f0606b526e0a2",
  "reviewExercisesById|review-unsafe-miri-byte-view|prompt":
    "e5673ed3e49371fc0306d110390373def4db439fff6b7da4b66f0606b526e0a2",
};

const restorationKey = (entry: Restoration) =>
  `${entry.registry}|${entry.selector}|${entry.path.join(".")}`;

const guardedProjection = {
  ...projection,
  restorations: (projection.restorations as Restoration[]).map((entry) => ({
    ...entry,
    successorSha256:
      successorHashOverrides[restorationKey(entry)] ?? entry.successorSha256,
  })),
};

const restorations = guardedProjection.restorations as Restoration[];

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

function setAtPath(
  value: unknown,
  path: PathPart[],
  replacement: unknown,
): unknown {
  if (path.length === 0) return replacement;
  const [head, ...tail] = path;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value) && typeof head === "number") {
    if (head < 0 || head >= value.length) return value;
    const child: unknown = setAtPath(value[head], tail, replacement);
    if (child === value[head]) return value;
    const copy = [...value];
    copy[head] = child;
    return copy;
  }
  if (typeof value !== "object") return value;
  const object = value as Record<
    string,
    string | number | object | null | undefined
  >;
  if (!(head in object)) return value;
  const child = setAtPath(object[head], tail, replacement);
  if (child === object[head]) return value;
  return { ...object, [head]: child };
}

function projectOneRegistry(registry: unknown, entries: Restoration[]) {
  let projected: unknown = registry;
  for (const entry of entries) {
    const array = Array.isArray(projected) ? projected : undefined;
    const index = array
      ? array.findIndex(
          (item: unknown) =>
            item !== null &&
            typeof item === "object" &&
            (item as { id?: unknown }).id === entry.selector,
        )
      : -1;
    const current = array
      ? index < 0
        ? undefined
        : array[index]
      : (projected as Record<string, unknown> | undefined)?.[entry.selector];
    if (current === undefined) continue;
    const successor = getAtPath(current, entry.path);
    if (sha256Json(successor) !== entry.successorSha256) continue;
    const restored = setAtPath(current, entry.path, entry.before);
    if (restored === current) continue;
    if (array) {
      const copy = [...array];
      copy[index] = restored;
      projected = copy;
    } else {
      projected = {
        ...(projected as Record<string, unknown>),
        [entry.selector]: restored,
      };
    }
  }
  return projected;
}

/**
 * Projects only the five reviewed C1 presentation/contract repairs away for
 * historical tests. Unknown keys, aliases, registry order, and unrelated
 * mutations remain in the returned namespace.
 */
export function historicalBeforeExistingContractRepair(
  course: typeof Course,
): typeof Course {
  const projected: Record<string, unknown> = { ...course };
  const registryNames = [
    ...new Set(restorations.map((entry) => entry.registry)),
  ];
  for (const registryName of registryNames) {
    const entries = restorations.filter(
      (entry) => entry.registry === registryName,
    );
    projected[registryName] = projectOneRegistry(
      projected[registryName],
      entries,
    );
  }
  return projected as typeof Course;
}

export const acceptedPreC1Projection = guardedProjection;
