import assessmentDelta from "./fixtures/workshop-assessment-repair-delta.json";
import ownershipDecisionDelta from "./fixtures/ownership-borrow-decision-delta.json";
import { expect, it } from "vitest";
import * as actualCourse from "./course";
import {
  hashRegistryValue,
  historicalBeforeA12,
} from "./file-schema-evolution-compatibility-fixture";

// Synthetic Vitest namespace uses the observed loader key order and preserves its aggregate aliases.
const course = {
  ...actualCourse,
  default: Object.fromEntries(
    Object.keys(actualCourse)
      .sort()
      .filter((key) => key !== "reviewExerciseForId")
      .map((key) => [key, (actualCourse as Record<string, unknown>)[key]]),
  ),
} as typeof actualCourse & { default: typeof actualCourse };

// JSON fingerprints from the actual pre-authoring capture; functions are tested by reference below.
const predecessor = {
  competencies:
    "d1544599ed95c2ce90402c9a16acd4645170fe619d6e2158ee3ca9d03754e181",
  concepts: "e7f714e1acccae15ccf930b8e6512019c4a708ee439145ff0e540559cb3a9c9e",
  default: "15e4f680c4bea5d75d3975d58daa633d88ed0343d67af2f181f3b2e432b745e0",
  delayedReviewExercises:
    "420207547e86af34b82e50d6735ba5a262554ca77b409c9609f2fa2e3cc96d7c",
  lessons: "09bc0301c0db0a5d7d43f8e7b103c8da8b6ac8f9c535701adae45cbef6e94217",
  modules: "9ef8361c9702dccaa65d1ad66a9a13b6ab77efa15e69fd69b3ec92a4d7eb1132",
  ownershipModule:
    "a49b89d28c14ca64c42429ac0d946ee13b6f5d638cd55ea311c1e6746b44cec1",
  project: "6e6174f2465c09cd958a9bfd1ccc0a6394e69dc1e338c2281195f33d29691550",
  projects: "9db011fe8357c80fd5792c67cae69f799ccdaa45eeec1cdbc71750552fdd2fa8",
  reviewExercises:
    "67699ce641ba5e18def722c9a7ff2952a5a386cdaa5fa90d5a8dbb0cef87a19b",
  reviewExercisesById:
    "e57f8f9b824e689d81151718c7bffdd09104a4e4fa9ff37424847b38b5bcf378",
  roadmap: "63c94381759dcb101770b8f8f56e3d66aebdcf27e19e6fccfaa21c1d8971792a",
  shortReviewExercises:
    "646f785b505ac5f45e8ba5230e4b87decb39a5edadb08bde83f7e4d7603a1db7",
  sources: "e9ae605cb3b4accd0483bef877e991c113a53ae4b069838bcde34d3c52ff194a",
  traces: "f501901ba89841109381b3f99e858606cb6cebd888b595518f556504efcaa263",
};

it("restores all fifteen captured predecessor values and the whole course hash", () => {
  const projected = historicalBeforeA12(course);
  const registry = Object.fromEntries(
    Object.keys(predecessor).map((key) => [
      key,
      (projected as Record<string, unknown>)[key],
    ]),
  );
  for (const [key, expected] of Object.entries(predecessor))
    expect(hashRegistryValue(registry[key]), key).toBe(expected);
  expect(hashRegistryValue(registry)).toBe(
    "183e9524baa28ef00567b74a079e58ff181f3bf519375718fd2f95cc4f221151",
  );
  expect(historicalBeforeA12(projected)).toBe(projected);
});

it("preserves original references, aliases, unknown properties and explicit undefined", () => {
  const symbol = Symbol("unrelated");
  const marker = { keep: true };
  const input = {
    ...course,
    marker,
    explicit: undefined,
    [symbol]: marker,
    lessonAlias: course.lessons,
  };
  Object.defineProperty(input, "hidden", { value: marker, enumerable: false });
  const before = hashRegistryValue(input);
  const result = historicalBeforeA12(input);
  expect(result).not.toBe(input);
  expect(result.default.lessons).toBe(result.lessons);
  expect(result.default.reviewExercises).toBe(result.reviewExercises);
  expect(result.default.project).toBe(result.project);
  expect(result.lessonAlias).toBe(result.lessons);
  expect(result.marker).toBe(marker);
  expect(result[symbol]).toBe(marker);
  expect(Object.hasOwn(result, "explicit")).toBe(true);
  expect(Object.getOwnPropertyDescriptor(result, "hidden")).toEqual(
    Object.getOwnPropertyDescriptor(input, "hidden"),
  );
  expect(result.sources).toBe(input.sources);
  expect(result.project).toBe(input.project);
  expect(result.reviewExerciseForId).toBe(input.reviewExerciseForId);
  const repairedLessons = new Set([
    ...assessmentDelta.restorations.map((entry) => entry.lessonId),
    ...ownershipDecisionDelta.restorations.map((entry) => entry.lessonId),
  ]);
  for (const key of ["lessons", "concepts", "competencies", "modules"] as const)
    result[key].forEach((item, index) => {
      if (
        (key === "lessons" &&
          (repairedLessons.has(item.id) ||
            ["tokio-graceful-shutdown", "hashmap-and-entry"].includes(
              item.id,
            ))) ||
        (key === "modules" &&
          ["tokio-flow-control", "tokio-io-streams"].includes(item.id))
      )
        return;
      expect(item).toBe(input[key][index]);
    });
  result.projects.forEach((item, index) => {
    if (
      item.id !== "durable-log-retry" &&
      item.id !== "miri-safety" &&
      item.id !== "service-authorization"
    )
      expect(item).toBe(input.projects[index]);
  });
  expect(result.default.projects).toBe(result.projects);
  expect(hashRegistryValue(input)).toBe(before);
  expect(input.lessons).toHaveLength(204);
});

it("leaves incomplete, moved, duplicated or modified additions wholly intact", () => {
  const oldLessons = course.lessons.slice(0, 202);
  const [normalization, upgrade] = course.lessons.slice(202);
  const { "review-file-version-meaning": review, ...oldReviews } =
    course.reviewExercisesById;
  const variants = [
    { ...course, lessons: oldLessons },
    { ...course, lessons: [...oldLessons, normalization] },
    { ...course, lessons: [...oldLessons, upgrade, normalization] },
    { ...course, lessons: [...course.lessons, normalization] },
    {
      ...course,
      lessons: [
        ...oldLessons,
        { ...normalization, title: "Near match" },
        upgrade,
      ],
    },
    {
      ...course,
      lessons: [
        ...oldLessons,
        { ...normalization, minutes: undefined },
        upgrade,
      ],
    },
    { ...course, reviewExercisesById: oldReviews },
    { ...course, reviewExercisesById: { ...oldReviews, [review.id]: review } },
    { ...course, default: { ...course.default, lessons: oldLessons } },
  ];
  for (const input of variants) expect(historicalBeforeA12(input)).toBe(input);
});

it("retains unrelated successor values and supports a direct default self-alias", () => {
  const unknown = { ...course.lessons[0], id: "unrelated-future-lesson" };
  const input = {
    ...actualCourse,
    lessons: [...course.lessons, unknown],
    default: actualCourse,
  };
  Object.defineProperty(input, "default", {
    value: input,
    configurable: false,
  });
  const projected = historicalBeforeA12(input);
  expect(projected.lessons.at(-1)).toBe(unknown);
  expect(projected.default).toBe(projected);
  expect(input.default).toBe(input);
});

it("does not read unknown accessors and preserves the default back-reference", () => {
  const input = { ...course, default: { ...course.default } };
  const get = () => {
    throw new Error("unrelated accessor was read");
  };
  Object.defineProperty(input, "unrelated", { get, enumerable: true });
  Object.defineProperty(input.default, "back", {
    value: input,
    enumerable: false,
  });
  const projected = historicalBeforeA12(input);
  expect(Object.getOwnPropertyDescriptor(projected, "unrelated")?.get).toBe(
    get,
  );
  expect(
    Object.getOwnPropertyDescriptor(projected.default, "back")?.value,
  ).toBe(projected);
  expect(Object.getOwnPropertyDescriptor(input.default, "back")?.value).toBe(
    input,
  );
});

it("reverses only the exact formatted retry project in historical views", () => {
  const retryIndex = 13;
  const live = course.projects[retryIndex];
  expect(live.id).toBe("durable-log-retry");
  expect(hashRegistryValue(live)).toBe(
    "d0bee7811bd12b1a612b90f77be726d8accf6ac6ffadb7211ec04c9be787a0a5",
  );
  const projected = historicalBeforeA12({ ...course, retryAlias: live });
  const previous = projected.projects[retryIndex];
  expect(projected.retryAlias).toBe(previous);
  expect(projected.default.projects).toBe(projected.projects);
  expect(hashRegistryValue(previous)).toBe(
    "e364d16da0b15fba65f1acc67cfc5cd885265bbb96c0ed1d5a968f8c2be090f3",
  );
  expect(
    live
      .package!.files.filter(
        (file, index) => file !== previous.package!.files[index],
      )
      .map((file) => file.path),
  ).toEqual([
    "crates/ingest-service/src/bin/ingest-retry-client.rs",
    "crates/ingest-service/tests/retry_client.rs",
  ]);
  expect(course.projects[retryIndex]).toBe(live);

  const nearMiss = { ...live, title: "Unrelated change" };
  const hiddenProperty = { ...live };
  Object.defineProperty(hiddenProperty, "unknown", { value: undefined });
  for (const candidate of [nearMiss, hiddenProperty]) {
    const projects = course.projects.map((project, index) =>
      index === retryIndex ? candidate : project,
    );
    const input = {
      ...course,
      projects,
      default: { ...course.default, projects },
    };
    const projected = historicalBeforeA12(input);
    expect(projected.projects[retryIndex]).toBe(candidate);
    expect(projected.default.projects).toBe(projected.projects);
    expect(input.projects[retryIndex]).toBe(candidate);
  }
});

it.each([
  {
    index: 11,
    id: "miri-safety",
    liveHash:
      "983152a95721ceca060f55c7d9f854431254689a0013af4dbcc6d05e0481ef91",
    historicalHash:
      "bac8d3f35d3a3abf93d9ae4f7ab583b3057f7b695284a489975124db1c190109",
    path: "tests/mut_slot_with_mut.rs",
  },
  {
    index: 14,
    id: "service-authorization",
    liveHash:
      "ce2042b890db806eab63108681a14db213c240a30dfedc345ddfd872659262ea",
    historicalHash:
      "b0c2b9fd0aced454ad04eff90c150332f72c56357f1d5da60c22cb1c197a338e",
    path: "src/lib.rs",
  },
])(
  "reverses only the exact packaged $id solution signature in historical views",
  ({ index, id, liveHash, historicalHash, path }) => {
    const live = course.projects[index];
    expect(live.id).toBe(id);
    expect(hashRegistryValue(live)).toBe(liveHash);
    const projected = historicalBeforeA12({
      ...course,
      packageProjectAlias: live,
    });
    const restored = projected.projects[index];
    expect(projected.packageProjectAlias).toBe(restored);
    expect(projected.default.projects).toBe(projected.projects);
    expect(hashRegistryValue(restored)).toBe(historicalHash);
    expect(
      restored
        .package!.files.filter((file, i) => file !== live.package!.files[i])
        .map((file) => file.path),
    ).toEqual([path]);
    expect(course.projects[index]).toBe(live);

    const packageWithNearMiss = {
      ...live.package!,
      files: live.package!.files.map((file) =>
        file.path === path ? { ...file, solution: file.solution + "\n" } : file,
      ),
    };
    const nearMiss = { ...live, package: packageWithNearMiss };
    const projects = course.projects.map((item, i) =>
      i === index ? nearMiss : item,
    );
    const input = {
      ...course,
      projects,
      default: { ...course.default, projects },
    };
    expect(historicalBeforeA12(input).projects[index]).toBe(nearMiss);
  },
);
