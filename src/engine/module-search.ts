import type { CourseModule, Lesson } from "@/domain/types";

type SearchableModule = Pick<CourseModule, "id" | "title" | "capabilities">;
type SearchableLesson = Pick<
  Lesson,
  "moduleId" | "title" | "subtitle" | "outcomes" | "conceptIds"
>;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
}

export function searchModules<T extends SearchableModule>(
  query: string,
  modules: readonly T[],
  lessons: readonly SearchableLesson[],
): T[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [...modules];

  return modules.filter((module) => {
    const searchableText = normalize(
      [
        module.title,
        ...module.capabilities,
        ...lessons
          .filter((lesson) => lesson.moduleId === module.id)
          .flatMap((lesson) => [
            lesson.title,
            lesson.subtitle,
            ...lesson.outcomes,
            ...lesson.conceptIds,
          ]),
      ].join(" "),
    );
    return words.every((word) => searchableText.includes(word));
  });
}
