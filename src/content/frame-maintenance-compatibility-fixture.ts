import { createHash } from "node:crypto";
import type * as Course from "./course";
import baseline from "./fixtures/frame-protocol-pre-a6-projection.json";
import type { ProjectPackage } from "../domain/types";

export const frameProtocolMaintenanceLessonId =
  "api-frame-protocol-maintenance" as const;
export const frameProtocolMaintenanceStepIds = [
  "api-frame-protocol-maintenance-predict",
  "api-frame-protocol-maintenance-model",
  "api-frame-protocol-maintenance-run",
  "api-frame-protocol-maintenance-challenge",
  "api-frame-protocol-maintenance-review",
  "api-frame-protocol-maintenance-recall",
] as const;

export const acceptedPreA6CourseSha256 = baseline.wholeCourseSha256;
export const acceptedPreA6Registry = baseline;

const canonicalA6LessonSha256 =
  "1db190a8a5062191a21745805681551fd3da7acb0f37a11195b9696c5af3b974";
const canonicalA6ModuleLessonIds = [
  ...baseline.publicApiModuleLessonIds,
  frameProtocolMaintenanceLessonId,
];
const canonicalA6ProjectLessonIds = [
  ...baseline.frameProject.lessonIds,
  frameProtocolMaintenanceLessonId,
];

type CanonicalFile = {
  successorStarterSha256: string;
  successorSolutionSha256?: string;
};

const canonicalA6Files: Record<string, CanonicalFile> = {
  "Cargo.toml": {
    successorStarterSha256:
      "e53c3732be35fc3cf2a69021a7bce4612c9c7bd6e91bae7a3573896341f13559",
  },
  "Cargo.lock": {
    successorStarterSha256:
      "f876b9c7e20bd120f445cf8579eb7d7f1f277a42dc2a105c5dee3f0aad580c60",
  },
  "README.md": {
    successorStarterSha256:
      "641ca3a23c1ff20030cbd068b5caf88d605dfe3957ae40441e81764f93d17ad1",
  },
  "ADR.md": {
    successorStarterSha256:
      "c7f9d45983abe63cfaf101a8c4aed1a62a78f29d02d8380a71b4aca301510020",
  },
  "CHANGELOG.md": {
    successorStarterSha256:
      "29e13fc5c05967ba1486b11c8e190ebe9060278fb031274898f206bbbfaceb7f",
  },
  "RELEASE-EVIDENCE.json": {
    successorStarterSha256:
      "a1d94590da8045337cc865ef1fc1159b4b52e1af7196b743efb778e783274526",
  },
  "evidence/actual-cargo-tree.txt": {
    successorStarterSha256:
      "40a15f3f731de047bdd3b8855d77efd7fa386308172d99a16cb41ce5afe1efc7",
  },
  "evidence/release-evidence.json": {
    successorStarterSha256:
      "a1d94590da8045337cc865ef1fc1159b4b52e1af7196b743efb778e783274526",
  },
  "evidence/package-list.txt": {
    successorStarterSha256:
      "fe3aa03bd1ce2641e3366cef772535883030daee30c357db0de51e9012836518",
  },
  "crates/frame-protocol/src/lib.rs": {
    successorStarterSha256:
      "eef0b7c2dd4e92f4e1ab7259c809f76a01ac0a63c0515c79c09e45f647f1b834",
    successorSolutionSha256:
      "05b9229958893b60bb66b12cddfb2dac6b12ad1e1782cd6a4d8b23acfe6b9519",
  },
  "crates/frame-protocol/tests/public_consumer.rs": {
    successorStarterSha256:
      "79e2df0ef0509ce93be24d88ce23899f116d58e22fa3850a82b01454758f686b",
  },
  "crates/frame-probe/src/main.rs": {
    successorStarterSha256:
      "df93f26b62e5276f61464a125b97e21206695205bb0fa995926bb65f821ed4c1",
  },
  "crates/frame-probe/tests/cli.rs": {
    successorStarterSha256:
      "5439c289de13428b79fae42f84c7221480c92fdfd03984dc9e47a3b4ae75b1e5",
  },
};

const canonicalA6AddedFileSha256: Record<string, string> = {
  "MAINTENANCE-CHALLENGE.md":
    "674ade941079b31515f902339f98c1f9031138bd7b4b93ff58887bb9b880b66e",
  "CHANGE-REVIEW.md":
    "24bfb41bc9991635aee095b376b0ac366c0b9d67b7c9f4f7c65844a9f41d6c0f",
};

const canonicalA6ExistingLessonFields: Record<
  string,
  { code?: string; solution?: string }
> = {
  "cargo-dependency-contract": {
    code: "668685f9b7b9eef6ed0986e5a1dc2b92e1a7d546bdb85cbfb75695c2611e4d75",
    solution:
      "e53c3732be35fc3cf2a69021a7bce4612c9c7bd6e91bae7a3573896341f13559",
  },
  "cargo-lock-msrv-policy": {
    code: "3c4aba550f2f9664d6dc7f62071dbec6097762a09cedb4047ce63cdee5788b81",
    solution:
      "e53c3732be35fc3cf2a69021a7bce4612c9c7bd6e91bae7a3573896341f13559",
  },
  "cargo-package-rehearsal": {
    code: "8fca05659b5fa71a960a1fc0432d1595aa87cbd9a3527c16cbf1f826702bb4c6",
    solution:
      "e53c3732be35fc3cf2a69021a7bce4612c9c7bd6e91bae7a3573896341f13559",
  },
};

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashText(value: string | undefined) {
  return value === undefined ? undefined : hashJson(value);
}

function predecessorFiles() {
  return new Map(
    baseline.frameProject.package.files.map((file) => [file.path, file]),
  );
}

function restoreCanonicalPackage(packageValue: ProjectPackage) {
  const oldFiles = predecessorFiles();
  const files = packageValue.files.flatMap((file) => {
    const addedHash = canonicalA6AddedFileSha256[file.path];
    if (addedHash !== undefined)
      return hashJson(file) === addedHash ? [] : [file];

    const canonical = canonicalA6Files[file.path];
    const predecessor = oldFiles.get(file.path);
    if (!canonical || !predecessor) return [file];

    const restored = { ...file };
    if (hashText(file.starter) === canonical.successorStarterSha256)
      restored.starter = predecessor.starter;
    if (
      canonical.successorSolutionSha256 !== undefined &&
      hashText(file.solution) === canonical.successorSolutionSha256
    ) {
      restored.solution = predecessor.solution;
    }
    return [restored];
  });
  return { ...packageValue, files };
}

function restoreFrameProject(project: (typeof Course.projects)[number]) {
  if (project.id !== baseline.frameProject.id) return project;
  const withLessonIds =
    JSON.stringify(project.lessonIds) ===
    JSON.stringify(canonicalA6ProjectLessonIds)
      ? { ...project, lessonIds: baseline.frameProject.lessonIds }
      : project;
  if (!withLessonIds.package) return withLessonIds;
  return {
    ...withLessonIds,
    package: restoreCanonicalPackage(withLessonIds.package),
  };
}

function restoreFrameModule(module: (typeof Course.modules)[number]) {
  if (module.id !== "public-api-workspaces") return module;
  return JSON.stringify(module.lessonIds) ===
    JSON.stringify(canonicalA6ModuleLessonIds)
    ? { ...module, lessonIds: baseline.publicApiModuleLessonIds }
    : module;
}

function removeMaintenanceLesson(lesson: (typeof Course.lessons)[number]) {
  return hashJson(lesson) === canonicalA6LessonSha256 ? undefined : lesson;
}

function restoreExistingLessonFields(lesson: (typeof Course.lessons)[number]) {
  const expected = canonicalA6ExistingLessonFields[lesson.id];
  const predecessor = (
    baseline.existingLessonFields as Record<
      string,
      { stepId: string; code?: string; solution?: string }
    >
  )[lesson.id];
  if (!expected || !predecessor) return lesson;
  const stepIndex = lesson.steps.findIndex(
    (step) => step.id === predecessor.stepId,
  );
  if (stepIndex < 0) return lesson;
  const step = lesson.steps[stepIndex];
  const restoredStep = { ...step };
  let changed = false;
  if (expected.code !== undefined && hashText(step.code) === expected.code) {
    restoredStep.code = predecessor.code;
    changed = true;
  }
  if (
    expected.solution !== undefined &&
    hashText(step.solution) === expected.solution
  ) {
    restoredStep.solution = predecessor.solution;
    changed = true;
  }
  if (!changed) return lesson;
  return {
    ...lesson,
    steps: lesson.steps.map((candidate, index) =>
      index === stepIndex ? restoredStep : candidate,
    ),
  };
}

function projectDefaultAlias(
  projected: Record<string, unknown>,
  current: Record<string, unknown>,
) {
  const defaultAlias = current.default;
  const projectedAlias =
    defaultAlias && typeof defaultAlias === "object"
      ? { ...(defaultAlias as Record<string, unknown>) }
      : {};
  for (const key of baseline.registryKeys) {
    if (key === "default") continue;
    if (key in projected) projectedAlias[key] = projected[key];
  }
  projected.default = projectedAlias;
}

/**
 * Project the assembled course back to the genuine pre-A6 source cut.
 *
 * Every A6 removal is conditional on the exact authored successor value. A
 * near miss or unknown field is retained so the old digest remains visibly
 * different instead of being hidden by a replacement snapshot.
 */
export function historicalBeforeFrameProtocolMaintenance(
  current: typeof Course,
) {
  const currentRecord = current as unknown as Record<string, unknown>;
  const projected = {
    ...current,
    lessons: current.lessons
      .flatMap((lesson) => {
        if (lesson.id !== frameProtocolMaintenanceLessonId) return [lesson];
        const restored = removeMaintenanceLesson(lesson);
        return restored ? [restored] : [];
      })
      .map(restoreExistingLessonFields),
    modules: current.modules.map(restoreFrameModule),
    project: restoreFrameProject(current.project),
    projects: current.projects.map(restoreFrameProject),
  } as typeof Course & Record<string, unknown>;
  projectDefaultAlias(projected, currentRecord);

  if (
    projected.modules.length !== baseline.counts.modules ||
    projected.projects.length !== baseline.counts.projects ||
    projected.sources.length !== baseline.counts.sources
  ) {
    throw new Error("A6 projection changed module, project, or source counts");
  }
  return projected;
}
