import {
  competencies,
  concepts,
  delayedReviewExercises,
  lessons,
  modules,
  project,
  projects,
  reviewExercises,
  reviewExercisesById,
  roadmap,
  shortReviewExercises,
  sources,
  traces,
} from "@/content/course";
import { diagnosticTasks } from "@/domain/diagnostic";
import type { LessonStep } from "@/domain/types";
import englishText from "./course.en.json";
import polishText from "./course.pl.json";
import {
  courseMessages,
  englishSolutionNotes,
  polishRecheckPolicies,
  pseudocode,
  translateGeneratedCourseText,
} from "./course-messages";

import type { Locale } from "./ui-locale";

const canonicalCourse = {
  modules,
  lessons,
  concepts,
  competencies,
  sources,
  traces,
  project,
  projects,
  roadmap,
  reviewExercises,
  delayedReviewExercises,
  shortReviewExercises,
  reviewExercisesById,
  diagnosticTasks,
};

const textFields = new Set([
  "title",
  "subtitle",
  "summary",
  "description",
  "instructions",
  "points",
  "prompt",
  "feedback",
  "outcomes",
  "misconceptions",
  "transferTask",
  "evidenceGate",
  "whyItMatters",
  "capabilities",
  "exitGate",
  "projectConnection",
  "label",
  "objective",
  "requiredBehaviors",
  "requiredEvidence",
  "constraints",
  "adversarialInject",
  "retrospective",
  "reviewPrompt",
  "reviewAnswer",
  "distinguish",
  "hints",
  "explanation",
  "nextGoal",
  "recheckPolicy",
]);

const englishCatalog: Readonly<Record<string, string>> = englishText;

function lookup(table: Readonly<Record<string, string>>, text: string) {
  return Object.hasOwn(table, text) ? table[text] : undefined;
}

function directTranslation(text: string): string | undefined {
  return (
    lookup(courseMessages, text) ??
    lookup(englishSolutionNotes, text) ??
    lookup(pseudocode, text) ??
    lookup(englishCatalog, text)
  );
}

export function translateCourseText(text: string, locale: Locale): string {
  if (locale === "pl") return lookup(polishText, text) ?? lookup(polishRecheckPolicies, text) ?? text;
  return (
    directTranslation(text) ??
    translateGeneratedCourseText(text, directTranslation) ??
    text
  );
}

/** Project only known prose fields. Canonical keys and executable content
 * retain their original values, including previously saved rubric selections.
 */
function projectText(
  value: unknown,
  translate: (text: string) => string,
  key = "",
): unknown {
  if (Array.isArray(value))
    return value.map((item) => projectText(item, translate, key));
  if (typeof value === "string") {
    return textFields.has(key) || key === "choice-explanation"
      ? translate(value)
      : value;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => {
      if (
        typeof item === "string" &&
        name === "solution" &&
        "prompt" in value
      ) {
        return [
          name,
          lookup(englishSolutionNotes, item) === undefined
            ? item
            : translate(item),
        ];
      }
      if (typeof item === "string" && name === "code" && "feedback" in value) {
        return [
          name,
          lookup(pseudocode, item) === undefined ? item : translate(item),
        ];
      }
      if (
        typeof item === "string" &&
        (name === "value" || name === "owner") &&
        ("state" in value || "owner" in value) &&
        lookup(courseMessages, item) !== undefined
      ) {
        return [name, translate(item)];
      }
      return [
        name,
        projectText(
          item,
          translate,
          key === "explanations" ? "choice-explanation" : name,
        ),
      ];
    }),
  );
}

export function localizeCourseStep(
  step: LessonStep,
  locale: Locale,
): LessonStep {
  return projectText(step, (text) => translateCourseText(text, locale)) as LessonStep;
}

const localizedCourses: Partial<Record<Locale, typeof canonicalCourse>> = {};

export function getLocalizedCourse(locale: Locale): typeof canonicalCourse {
  return (localizedCourses[locale] ??= projectText(canonicalCourse, (text) =>
    translateCourseText(text, locale),
  ) as typeof canonicalCourse);
}

/** The same traversal inventories the learner-visible course presentation. */
export function courseTextInventory(): string[] {
  const strings = new Set<string>();
  const collect = (text: string) => {
    strings.add(text);
    return text;
  };
  projectText(canonicalCourse, collect);
  for (const step of [
    ...lessons.flatMap((lesson) => lesson.steps),
    ...Object.values(reviewExercisesById),
  ]) {
    step.rubric?.forEach(collect);
    if (step.evaluator?.kind === "rubric")
      step.evaluator.criteria.forEach(collect);
  }
  return [...strings];
}

export function hasEnglishCourseText(text: string): boolean {
  return directTranslation(text) !== undefined;
}
