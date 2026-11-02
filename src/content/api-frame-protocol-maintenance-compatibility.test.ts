import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/frame-protocol-pre-a6-projection.json";
import {
  frameProtocolMaintenanceLessonId,
  frameProtocolMaintenanceStepIds,
  historicalBeforeFrameProtocolMaintenance,
} from "./frame-maintenance-compatibility-fixture";
import { historicalBeforeOwnershipFoundation } from "./ownership-foundation-compatibility-fixture";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const registryKeys = baseline.registryKeys;
type RegistryAlias = Record<string, unknown> & {
  lessons: typeof currentCourse.lessons;
  project: typeof currentCourse.project;
  projects: typeof currentCourse.projects;
};
const currentRecord = currentCourse as unknown as Record<string, unknown>;
const currentDefaultAlias = (currentRecord.default ??
  currentRecord) as RegistryAlias;
const serializableRegistryKeys = (course: typeof currentCourse) =>
  Object.keys(course as unknown as Record<string, unknown>)
    .filter(
      (key) =>
        JSON.stringify((course as unknown as Record<string, unknown>)[key]) !==
        undefined,
    )
    .sort((left, right) => {
      const leftIndex = registryKeys.indexOf(left);
      const rightIndex = registryKeys.indexOf(right);
      if (leftIndex < 0 && rightIndex < 0) return 0;
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    });
const serializedRegistry = (course: typeof currentCourse) =>
  Object.fromEntries(
    serializableRegistryKeys(course).map((key) => [
      key,
      (course as unknown as Record<string, unknown>)[key],
    ]),
  );

describe("Frame Protocol A6 historical compatibility", () => {
  it("projects the genuine complete pre-A6 registry and preserves counts", () => {
    const projected = historicalBeforeFrameProtocolMaintenance(currentCourse);

    expect(serializableRegistryKeys(projected)).toEqual(registryKeys);
    expect(hashJson(serializedRegistry(projected))).toBe(
      baseline.wholeCourseSha256,
    );
    for (const [key, expectedHash] of Object.entries(
      baseline.registrySha256ByKey,
    )) {
      expect(hashJson((projected as Record<string, unknown>)[key]), key).toBe(
        expectedHash,
      );
    }
    expect(projected.modules).toHaveLength(baseline.counts.modules);
    expect(projected.projects).toHaveLength(baseline.counts.projects);
    expect(projected.sources).toHaveLength(baseline.counts.sources);
    expect(projected.lessons).toHaveLength(baseline.counts.lessons);
    expect(
      projected.lessons.reduce(
        (total, lesson) => total + lesson.steps.length,
        0,
      ),
    ).toBe(baseline.counts.steps);
    expect(
      projected.lessons.some(
        (lesson) => lesson.id === frameProtocolMaintenanceLessonId,
      ),
    ).toBe(false);
    expect(
      projected.lessons
        .flatMap((lesson) => lesson.steps)
        .some((step) =>
          frameProtocolMaintenanceStepIds.includes(step.id as never),
        ),
    ).toBe(false);
  });

  it("composes A6 before the existing A5 projection entrypoint", () => {
    const projected = historicalBeforeOwnershipFoundation(currentCourse);
    expect(
      projected.lessons.some(
        (lesson) => lesson.id === frameProtocolMaintenanceLessonId,
      ),
    ).toBe(false);
    expect(
      projected.lessons.some(
        (lesson) => lesson.id === "ownership-foundation-transfer",
      ),
    ).toBe(false);
  });

  it("preserves unknown aliases, metadata, and near-miss canonical fields", () => {
    const mutated = {
      ...currentCourse,
      project: {
        ...currentCourse.project,
        title: `${currentCourse.project.title} — unknown primary alias change`,
      },
      projects: currentCourse.projects.map((project) =>
        project.id !== "frame-protocol"
          ? project
          : {
              ...project,
              unknownMetadata: { keep: true },
              package: project.package && {
                ...project.package,
                files: project.package.files.map((file) =>
                  file.path === "evidence/release-evidence.json"
                    ? { ...file, starter: `${file.starter}\nnear-miss` }
                    : file,
                ),
              },
            },
      ),
    } as typeof currentCourse;

    const projected = historicalBeforeFrameProtocolMaintenance(mutated);
    expect(projected.project.title).toContain("unknown primary alias change");
    const frame = projected.projects.find(
      (project) => project.id === "frame-protocol",
    )!;
    expect(
      (frame as typeof frame & { unknownMetadata?: unknown }).unknownMetadata,
    ).toEqual({
      keep: true,
    });
    expect(
      frame.package!.files.find(
        (file) => file.path === "evidence/release-evidence.json",
      )!.starter,
    ).toContain("near-miss");
    expect(hashJson(serializedRegistry(projected))).not.toBe(
      baseline.wholeCourseSha256,
    );
  });

  it("does not hide mismatched default aliases or unknown serializable exports", () => {
    const mutated = {
      ...currentCourse,
      default: {
        ...currentDefaultAlias,
        project: {
          ...currentDefaultAlias.project,
          title: "UNEXPECTED_ALIAS_METADATA",
        },
        projects: [...currentDefaultAlias.projects, { unknown: true }],
        lessons: currentDefaultAlias.lessons.map((lesson, index) =>
          index === 0
            ? { ...lesson, title: "UNEXPECTED_ALIAS_LESSON" }
            : lesson,
        ),
        unknownAliasMetadata: { keep: true },
      },
      unknownTopLevelAlias: { keep: true },
    } as typeof currentCourse;

    const projected = historicalBeforeFrameProtocolMaintenance(mutated);
    const projectedDefault = (projected as unknown as Record<string, unknown>)
      .default as RegistryAlias;
    expect(projectedDefault.project.title).toBe("UNEXPECTED_ALIAS_METADATA");
    expect(projectedDefault.projects).toHaveLength(
      currentDefaultAlias.projects.length + 1,
    );
    expect(projectedDefault.lessons[0].title).toBe("UNEXPECTED_ALIAS_LESSON");
    expect(projectedDefault.unknownAliasMetadata).toEqual({ keep: true });
    expect(
      (projected as typeof projected & { unknownTopLevelAlias?: unknown })
        .unknownTopLevelAlias,
    ).toEqual({ keep: true });
    expect(serializableRegistryKeys(projected)).toContain(
      "unknownTopLevelAlias",
    );
    expect(hashJson(serializedRegistry(projected))).not.toBe(
      baseline.wholeCourseSha256,
    );
  });

  it("is idempotent after exact A6 restoration", () => {
    const once = historicalBeforeFrameProtocolMaintenance(currentCourse);
    expect(historicalBeforeFrameProtocolMaintenance(once)).toEqual(once);
  });
});
