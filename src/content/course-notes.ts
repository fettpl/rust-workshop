import { lessons, projects } from "./course";
import { studySessionNoteTitle } from "@/domain/study-session-practice";

const lessonTitles = new Map(
  lessons.map((lesson) => [lesson.id, lesson.title]),
);
const projectTitles = new Map(
  projects.map((project) => [project.id, project.title]),
);
const sharedIds = new Set(
  projects
    .filter((project) => lessonTitles.has(project.id))
    .map((project) => project.id),
);

// Old exports used one note for a lesson and project with the same id.
export function courseNoteKey(kind: "lesson" | "project", id: string) {
  return sharedIds.has(id) ? `${kind}:${id}` : id;
}

export function courseNoteTitle(key: string) {
  for (const id of sharedIds) {
    if (key === id)
      return `Wcześniejsza wspólna notatka · ${lessonTitles.get(id)}`;
    if (key === courseNoteKey("lesson", id))
      return `Lekcja · ${lessonTitles.get(id)}`;
    if (key === courseNoteKey("project", id))
      return `Projekt · ${projectTitles.get(id)}`;
  }
  return (
    studySessionNoteTitle(key) ??
    lessonTitles.get(key) ??
    projectTitles.get(key) ??
    key
  );
}
