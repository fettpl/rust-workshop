/** Test-only predecessor projection; never imported by production course or evidence code. */
import { createHash } from "node:crypto";
import type * as Course from "./course";
import ledger from "./dependency-maintenance-compatibility-deltas.json";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Delta = (typeof ledger.deltas)[number];

function predecessor(value: unknown, delta: Delta): unknown {
  // A changed task, identity, evidence field or unrelated metadata never matches.
  if (hash(value) !== delta.currentSha256) return value;
  const restored = structuredClone(value);
  for (const change of delta.changes) {
    let owner = restored as Record<string, unknown>;
    for (const key of change.path.slice(0, -1))
      owner = owner[key] as Record<string, unknown>;
    owner[change.path.at(-1)!] = change.previous;
  }
  if (hash(restored) !== delta.previousSha256)
    throw new Error(
      `Invalid dependency predecessor: ${delta.registry}/${delta.id}`,
    );
  return restored;
}

export function historicalBeforeDependencyRefresh(course: typeof Course) {
  const projected = { ...course };
  const registries = projected as unknown as Record<string, unknown>;
  for (const registry of new Set(
    ledger.deltas.map((delta) => delta.registry),
  )) {
    const deltas = ledger.deltas.filter((delta) => delta.registry === registry);
    const value = registries[registry];
    if (deltas.length === 1 && !("id" in deltas[0])) {
      registries[registry] = predecessor(value, deltas[0]);
    } else if (Array.isArray(value)) {
      registries[registry] = value.map((entity, index) => {
        const id = entity.id ?? `#${index}`;
        const delta = deltas.find((candidate) => candidate.id === id);
        return delta ? predecessor(entity, delta) : entity;
      });
    } else {
      registries[registry] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([id, entity]) => {
          const delta = deltas.find((candidate) => candidate.id === id);
          return [id, delta ? predecessor(entity, delta) : entity];
        }),
      );
    }
  }
  return projected;
}

import fileSuccessors from "./dependency-maintenance-file-successors.json";
/** Fixed reviewed paths only; a historical receipt must match before selecting its successor. */
export function dependencyFileSuccessor(
  path: string,
  historicalSha256: string,
  bytes?: Uint8Array,
) {
  if (!Object.hasOwn(fileSuccessors, path)) {
    if (bytes !== undefined)
      throw new Error(`Unsupported dependency successor: ${path}`);
    return undefined;
  }
  const successor = (
    fileSuccessors as Record<
      string,
      {
        previousSha256: string;
        currentPath: string;
        currentSha256: string;
      }
    >
  )[path];
  if (!successor) return undefined;
  if (successor.previousSha256 !== historicalSha256)
    throw new Error(`Unexpected historical dependency file identity: ${path}`);
  if (
    bytes !== undefined &&
    createHash("sha256").update(bytes).digest("hex") !== successor.currentSha256
  )
    throw new Error(`Unexpected current dependency file identity: ${path}`);
  return successor;
}
