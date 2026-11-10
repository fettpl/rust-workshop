import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as rawCourse from "./course";
import {
  historicalBeforeA11,
  historicalBeforeA12,
} from "./file-schema-evolution-compatibility-fixture";
const actualCourse = historicalBeforeA12(rawCourse);
// Vitest ESM has no default; exercise a labeled synthetic namespace matching the captured loader shape.
const course = {
  ...actualCourse,
  default: Object.fromEntries(
    Object.keys(actualCourse)
      .sort()
      .filter((key) => key !== "reviewExerciseForId")
      .map((key) => [key, (actualCourse as Record<string, unknown>)[key]]),
  ),
} as typeof actualCourse & { default: typeof actualCourse };
const hashes = {
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
};
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
it("restores_all_fifteen_genuine_predecessor_fingerprints_and_whole_course", () => {
  const projected = historicalBeforeA11(course);
  const registry = Object.fromEntries(
    Object.keys(hashes).map((key) => [
      key,
      (projected as unknown as Record<string, unknown>)[key],
    ]),
  );
  for (const [key, digest] of Object.entries(hashes))
    expect(hash(registry[key]), key).toBe(digest);
  expect(hash(registry)).toBe(
    "310c52f02de0658c1adc7f59f2ae205379a5829291443d7523fe1d2f0cd1cbed",
  );
});
it("preserves_legacy_object_source_function_and_default_alias_references", () => {
  const projected = historicalBeforeA11(course);
  expect(projected.projects).toHaveLength(14);
  for (const key of [
    "lessons",
    "concepts",
    "competencies",
    "modules",
    "sources",
    "projects",
  ] as const)
    projected[key].forEach((item, i) => expect(item).toBe(course[key][i]));
  expect(projected.reviewExerciseForId).toBe(course.reviewExerciseForId);
  expect(projected.default.lessons).toBe(projected.lessons);
  expect(projected.default.project).toBe(course.project);
  expect(projected.project).toBe(course.project);
  expect(historicalBeforeA11(projected)).toEqual(projected);
  expect(course.lessons).toHaveLength(202);
});
it("preserves_unknown_values_and_explicit_undefined_without_mutation", () => {
  const marker = { keep: true };
  const input = { ...course, extra: marker, explicitlyUndefined: undefined };
  const before = hash(input);
  const projected = historicalBeforeA11(input);
  expect(projected.extra).toBe(marker);
  expect(Object.hasOwn(projected, "explicitlyUndefined")).toBe(true);
  expect(hash(input)).toBe(before);
});
it("keeps_all_additions_on_partial_moved_duplicate_or_changed_successors", () => {
  const alterations = [
    course.lessons.filter(
      (lesson) => lesson.id !== "service-authorization-binding",
    ),
    [
      ...course.lessons.slice(0, 198),
      ...course.lessons.slice(198).toReversed(),
    ],
    [...course.lessons, course.lessons[198]],
    course.lessons.map((lesson, i) =>
      i === 198 ? { ...lesson, title: "near miss" } : lesson,
    ),
  ];
  for (const lessons of alterations) {
    const input = { ...course, lessons };
    const projected = historicalBeforeA11(input);
    expect(projected.lessons).toBe(lessons);
    expect(projected.modules).toBe(course.modules);
    expect(projected.projects).toBe(course.projects);
    expect(projected.reviewExercises).toBe(course.reviewExercises);
  }
});
