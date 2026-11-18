/** Test-only reversal of the reviewed Tokio shutdown gate splits. */
import type { CourseModule } from "../domain/types";
import rangeDelta from "./fixtures/foundations-range-gate-delta.json";
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

/** Project the single replaced criterion before applying older historical deltas. */
export function restoreFoundationsRangeModules(
  modules: CourseModule[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): CourseModule[] {
  const entry = rangeDelta.module;
  const current = modules[entry.index];
  if (
    !matches(current, entry.successorSha256) ||
    modules.filter((m) => ownValue(m, "id") === entry.id).length !== 1
  )
    return modules;
  const cached = replacements.get(current);
  if (matches(cached, entry.beforeSha256)) {
    const result = replaceField(modules, String(entry.index), cached);
    replacements.set(modules, result);
    return result;
  }
  const criteria = current.gateCriteria!;
  const restored = replaceField(
    criteria,
    String(entry.criterionIndex),
    entry.beforeCriterion,
  );
  const historical = replaceField(current, "gateCriteria", restored);
  if (!matches(historical, entry.beforeSha256)) return modules;
  replacements.set(criteria[entry.criterionIndex], entry.beforeCriterion);
  replacements.set(
    criteria[entry.criterionIndex].taskRefs,
    entry.beforeCriterion.taskRefs,
  );
  replacements.set(criteria, restored);
  replacements.set(current, historical);
  const result = replaceField(modules, String(entry.index), historical);
  replacements.set(modules, result);
  return result;
}

/** Complete module hashes keep all edits outside the reviewed split observable. */
export function restoreTokioShutdownModules(
  modules: CourseModule[],
  replacements: Map<unknown, unknown>,
  matches: (value: unknown, expected: string) => boolean,
): CourseModule[] {
  let result = restoreFoundationsRangeModules(modules, replacements, matches);
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
