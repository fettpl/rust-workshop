/** Test-only reversal of the reviewed Tokio shutdown gate splits. */
import type { CourseModule } from "../domain/types";
import delta from "./fixtures/tokio-shutdown-gates-delta.json";

const ownValue = (object: unknown, key: PropertyKey): unknown =>
  object !== null && typeof object === "object"
    ? Object.getOwnPropertyDescriptor(object, key)?.value
    : undefined;

function replaceField<T extends object>(
  object: T,
  key: PropertyKey,
  value: unknown,
): T {
  const descriptors = Object.getOwnPropertyDescriptors(object);
  Reflect.set(descriptors, key, { ...descriptors[key as keyof T], value });
  return Array.isArray(object)
    ? (Object.defineProperties([], descriptors) as unknown as T)
    : Object.create(Object.getPrototypeOf(object), descriptors);
}

/** Complete module hashes keep all edits outside the reviewed split observable. */
export function restoreTokioShutdownModules(
  modules: CourseModule[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): CourseModule[] {
  let result = modules;
  for (const entry of delta.modules) {
    const current = modules[entry.index];
    if (
      !matches(current, entry.successorSha256) ||
      modules.filter((module) => ownValue(module, "id") === entry.id).length !==
        1
    )
      continue;
    const previous = replacements.get(current);
    if (matches(previous, entry.beforeSha256)) {
      result = replaceField(result, String(entry.index), previous);
      continue;
    }
    const gateCriteria = [
      ...current.gateCriteria!.slice(0, entry.criterionIndex),
      entry.beforeCriterion,
    ];
    const historical = replaceField(
      replaceField(current, "gateCriteria", gateCriteria),
      "exitGate",
      entry.beforeExitGate,
    );
    if (!matches(historical, entry.beforeSha256)) continue;
    replacements.set(current.gateCriteria, gateCriteria);
    replacements.set(current.exitGate, entry.beforeExitGate);
    replacements.set(current, historical);
    result = replaceField(result, String(entry.index), historical);
  }
  if (result !== modules) replacements.set(modules, result);
  return result;
}
