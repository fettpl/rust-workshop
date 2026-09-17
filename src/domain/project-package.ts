import type { Lesson, ProjectPackage, UserState } from "./types";
import { createStepProgress, stepKey } from "../persistence/state";
import { recordLessonExposure, type EvidencePolicy } from "../engine/learning";

export type PackageVariant = "starter" | "solution";

export function validateProjectPackage(project: ProjectPackage): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id))
    errors.push("Invalid package id");
  if (
    !project.title.trim() ||
    !project.description.trim() ||
    !project.instructions.length
  )
    errors.push("Package needs a title, description and instructions");
  if (!project.revealStepRefs.length)
    errors.push("Package needs solution exposure references");
  for (const [label, refs] of [
    ["solution", project.revealStepRefs],
    ["starter", project.starterRevealStepRefs],
  ] as const) {
    if (refs === undefined) continue;
    const seen = new Set<string>();
    for (const ref of refs) {
      if (
        !ref ||
        typeof ref.lessonId !== "string" ||
        typeof ref.stepId !== "string" ||
        !ref.lessonId.trim() ||
        !ref.stepId.trim()
      )
        errors.push(`Invalid ${label} exposure reference`);
      const key = `${ref?.lessonId ?? ""}:${ref?.stepId ?? ""}`;
      if (seen.has(key))
        errors.push(`Duplicate ${label} exposure reference: ${key}`);
      seen.add(key);
    }
  }
  const paths = new Set<string>();
  for (const file of project.files) {
    const parts = file.path.split("/");
    if (
      parts.some(
        (part) =>
          !/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..",
      )
    )
      errors.push(`Invalid package path: ${file.path}`);
    const path = file.path.toLowerCase();
    if (paths.has(path)) errors.push(`Duplicate package path: ${file.path}`);
    paths.add(path);
  }
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++)
      if (paths.has(parts.slice(0, i).join("/")))
        errors.push(`File/directory collision: ${path}`);
  }
  const exactPaths = new Set(project.files.map((file) => file.path));
  if (!exactPaths.has("Cargo.toml"))
    errors.push("Cargo package needs Cargo.toml");
  if (project.workspaceMembers !== undefined) {
    if (!project.workspaceMembers.length)
      errors.push("Workspace needs members");
    const members = new Set<string>();
    for (const member of project.workspaceMembers) {
      if (
        member
          .split("/")
          .some(
            (part) =>
              !/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..",
          )
      )
        errors.push(`Invalid workspace member: ${member}`);
      if (members.has(member.toLowerCase()))
        errors.push(`Duplicate workspace member: ${member}`);
      members.add(member.toLowerCase());
      if (
        !exactPaths.has(`${member}/Cargo.toml`) ||
        (!exactPaths.has(`${member}/src/lib.rs`) &&
          !exactPaths.has(`${member}/src/main.rs`))
      )
        errors.push(
          `Workspace member needs Cargo.toml and a library or binary root: ${member}`,
        );
    }
  } else if (!exactPaths.has("src/lib.rs") && !exactPaths.has("src/main.rs")) {
    errors.push("Cargo package needs a library or binary root");
  }
  return errors;
}

export function projectFiles(
  project: ProjectPackage,
  variant: PackageVariant,
): Record<string, string> {
  const errors = validateProjectPackage(project);
  if (errors.length) throw new Error(errors.join("; "));
  return Object.fromEntries(
    project.files.map((file) => [
      file.path,
      variant === "solution" ? (file.solution ?? file.starter) : file.starter,
    ]),
  );
}

/** Reading a reference is help, not completion; existing independent work remains evidence. */
export function revealProjectSolution(
  state: UserState,
  project: ProjectPackage,
  lessons: Lesson[],
  now: number,
  policy?: EvidencePolicy,
): UserState {
  return revealProjectPackageVariant(
    state,
    project,
    lessons,
    "solution",
    now,
    policy,
  );
}

/** Record help for the requested package variant while preserving independent work. */
export function revealProjectPackageVariant(
  state: UserState,
  project: ProjectPackage,
  lessons: Lesson[],
  variant: PackageVariant,
  now: number,
  policy?: EvidencePolicy,
): UserState {
  const errors = validateProjectPackage(project);
  if (errors.length) throw new Error(errors.join("; "));
  const refs =
    variant === "starter"
      ? (project.starterRevealStepRefs ?? [])
      : [...project.revealStepRefs, ...(project.starterRevealStepRefs ?? [])];
  const uniqueRefs = Array.from(
    new Map(refs.map((ref) => [`${ref.lessonId}:${ref.stepId}`, ref])).values(),
  );
  let next = state;
  for (const ref of uniqueRefs) {
    const lesson = lessons.find((candidate) => candidate.id === ref.lessonId);
    const step = lesson?.steps.find((candidate) => candidate.id === ref.stepId);
    if (!lesson || !step)
      throw new Error(
        `Unknown ${variant} exposure reference: ${ref.lessonId}:${ref.stepId}`,
      );
    {
      const key = stepKey(lesson.id, step.id);
      if (next.steps[key]?.revealed) continue;
      next = recordLessonExposure(
        {
          ...next,
          steps: {
            ...next.steps,
            [key]: {
              ...(next.steps[key] ?? createStepProgress(step.code)),
              revealed: true,
            },
          },
        },
        {
          lessonId: lesson.id,
          stepId: step.id,
          conceptIds: lesson.conceptIds,
          at: now,
          revealed: true,
        },
        policy,
      );
    }
  }
  return next;
}

export function packageDownloadPath(
  project: ProjectPackage,
  variant: PackageVariant,
): string {
  return `/projects/${project.id}/${variant}.zip`;
}
