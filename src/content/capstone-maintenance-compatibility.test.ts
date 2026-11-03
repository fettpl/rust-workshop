import { expect, it } from "vitest";
import { capstoneMaintenanceRecoveryLesson } from "./capstone-maintenance-lesson";
import { capstoneMaintenanceModuleExtension } from "./capstone-maintenance-lesson";
import { lessons, modules, projects } from "./course";
import {
  acceptedPreA8Projection,
} from "./capstone-maintenance-compatibility-fixture";
import { historicalBeforeA9ThenCapstoneMaintenance as historicalBeforeCapstoneMaintenance } from "./unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture";
import * as currentCourse from "./course";
import { createHash } from "node:crypto";

const lessonId = "capstone-maintenance-recovery";
const stepIds = [
  "capstone-maintenance-predict",
  "capstone-maintenance-contrast",
  "capstone-maintenance-explain",
  "capstone-maintenance-packet",
  "capstone-maintenance-review-response",
  "capstone-maintenance-witness",
];
const oldCapstoneLessonIds = [
  "capstone-domain-boundary",
  "capstone-idempotent-commit",
  "capstone-bounded-lifecycle",
  "capstone-protocol-evolution",
  "capstone-incident-recovery",
  "capstone-release-evidence",
];

it("publishes one optional six-step lesson without new credit surfaces", () => {
  expect(capstoneMaintenanceRecoveryLesson.id).toBe(lessonId);
  expect(capstoneMaintenanceRecoveryLesson.practiceOnly).toBe(true);
  expect(capstoneMaintenanceRecoveryLesson.minutes).toBe(16);
  expect(capstoneMaintenanceRecoveryLesson.prerequisites).toEqual([
    "capstone-incident-recovery",
  ]);
  expect(capstoneMaintenanceRecoveryLesson.steps.map((step) => step.id)).toEqual(
    stepIds,
  );
  expect(capstoneMaintenanceRecoveryLesson.evidenceGate).toMatch(
    /bez bramki/i,
  );
  expect(capstoneMaintenanceRecoveryLesson.steps).toHaveLength(6);
  for (const step of capstoneMaintenanceRecoveryLesson.steps) {
    expect(step.evidenceGate, step.id).toBeUndefined();
    expect(step.evidence?.codingTaskId, step.id).toBeUndefined();
    expect(step.code, step.id).toBeUndefined();
    expect(["choice", "rubric"], step.id).toContain(step.evaluator?.kind);
    expect(["prediction", "exposure", "self-rating"], step.id).toContain(
      step.evidenceKind,
    );
  }
  expect(
    capstoneMaintenanceRecoveryLesson.steps.filter(
      (step) => step.evaluator?.kind === "tests",
    ),
  ).toHaveLength(0);
});

it("appends the lesson only through the explicit capstone module/project composition", () => {
  const lessonIndex = lessons.findIndex((candidate) => candidate.id === lessonId);
  expect(lessonIndex).toBeGreaterThan(-1);
  expect(lessons[lessonIndex - 1]?.id).toBe("capstone-release-evidence");
  expect(capstoneMaintenanceModuleExtension.lessonIds).toEqual([
    ...oldCapstoneLessonIds,
    lessonId,
  ]);
  const courseModule = modules.find((candidate) => candidate.id === "capstone-integration");
  expect(courseModule?.lessonIds).toEqual(capstoneMaintenanceModuleExtension.lessonIds);
  expect(courseModule?.gateCriteria).toHaveLength(12);
  const project = projects.find((candidate) => candidate.id === "durable-log-service");
  expect(project?.lessonIds).toEqual([...oldCapstoneLessonIds, lessonId]);
  expect(project?.requiredEvidence).toContain(
    "Wypełniony pakiet A8-MAINTENANCE.md i własny plan przeglądu utrzymania.",
  );
});

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function captureRegistry(course: typeof currentCourse) {
  const keys = acceptedPreA8Projection.predecessor.registryKeys;
  const values = course as unknown as Record<string, unknown>;
  const defaultNamespace = (course as typeof currentCourse & {
    default?: Record<string, unknown>;
  }).default;
  const defaultRegistry =
    defaultNamespace ??
    Object.fromEntries(
      keys
        .filter((key) => key !== "default")
        .map((key) => [key, values[key]]),
    );
  return Object.fromEntries(
    keys.map((key) => [key, key === "default" ? defaultRegistry : values[key]]),
  );
}

it("restores only the exact genuine pre-A8 registry and keeps aliases observable", () => {
  const projected = historicalBeforeCapstoneMaintenance(currentCourse);
  const registry = captureRegistry(projected);
  expect(hashJson(registry)).toBe(
    acceptedPreA8Projection.predecessor.wholeCourseSha256,
  );
  for (const key of acceptedPreA8Projection.predecessor.registryKeys) {
    expect(hashJson(registry[key])).toBe(
      (acceptedPreA8Projection.predecessor.registrySha256ByKey as Record<
        string,
        string
      >)[key],
    );
  }
  expect(projected.lessons).toHaveLength(195);
  expect(projected.modules).toHaveLength(48);
  expect(projected.lessons.some((lesson) => lesson.id === lessonId)).toBe(false);
  expect(
    projected.modules.find((module) => module.id === "capstone-integration")
      ?.lessonIds,
  ).toEqual(oldCapstoneLessonIds);
  expect(
    projected.projects.find((project) => project.id === "durable-log-service")
      ?.lessonIds,
  ).toEqual(oldCapstoneLessonIds);
});

it("is idempotent, non-mutating, and rejects near-miss A8 mutations", () => {
  const before = captureRegistry(currentCourse);
  const projected = historicalBeforeCapstoneMaintenance(currentCourse);
  expect(captureRegistry(currentCourse)).toEqual(before);
  expect(historicalBeforeCapstoneMaintenance(projected)).toEqual(projected);

  const mutated = {
    ...currentCourse,
    lessons: currentCourse.lessons.map((lesson) =>
      lesson.id === lessonId ? { ...lesson, title: `${lesson.title} near-miss` } : lesson,
    ),
  } as typeof currentCourse;
  const nearMiss = historicalBeforeCapstoneMaintenance(mutated);
  expect(nearMiss.lessons.find((lesson) => lesson.id === lessonId)?.title).toContain(
    "near-miss",
  );
});

it("preserves unknown aliases and functions in both namespaces", () => {
  const topLevelHelper = currentCourse.reviewExerciseForId;
  const synthetic = {
    ...currentCourse,
    unknownRegistryAlias: { marker: "top-level" },
    default: {
      lessons: currentCourse.lessons,
      modules: currentCourse.modules,
      projects: currentCourse.projects,
      unknownDefaultAlias: { marker: "default" },
      helper: topLevelHelper,
    },
    modules: currentCourse.modules.map((module) =>
      module.id === "capstone-integration"
        ? {
            ...module,
            lessonIds: [...module.lessonIds, "unrelated-near-miss"],
          }
        : module,
    ),
  } as typeof currentCourse & {
    unknownRegistryAlias: { marker: string };
    default: Record<string, unknown>;
  };
  const projected = historicalBeforeCapstoneMaintenance(synthetic);
  expect(projected.unknownRegistryAlias).toEqual({ marker: "top-level" });
  expect((projected.default as Record<string, unknown>).unknownDefaultAlias).toEqual(
    { marker: "default" },
  );
  expect((projected.default as Record<string, unknown>).helper).toBe(
    topLevelHelper,
  );
  expect(
    projected.modules.find((module) => module.id === "capstone-integration")
      ?.lessonIds,
  ).toContain("unrelated-near-miss");
});
