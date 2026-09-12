import type { Lesson, ProjectPackage, UserState } from "./types";
import { createStepProgress, stepKey } from "../persistence/state";
import { recordLessonExposure } from "../engine/learning";

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
  if (
    !exactPaths.has("Cargo.toml") ||
    (!exactPaths.has("src/lib.rs") && !exactPaths.has("src/main.rs"))
  )
    errors.push("Cargo package needs Cargo.toml and a library or binary root");
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
): UserState {
  let next = state;
  for (const lesson of lessons) {
    for (const step of lesson.steps.filter((item) =>
      project.revealStepRefs.some(
        (ref) => ref.lessonId === lesson.id && ref.stepId === item.id,
      ),
    )) {
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
