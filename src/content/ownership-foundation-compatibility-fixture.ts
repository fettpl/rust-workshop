import type * as Course from "./course";
import baseline from "./fixtures/ownership-foundation-pre-a5-registry.json";
import type { Lesson } from "../domain/types";

export const ownershipFoundationLessonId =
  "ownership-foundation-transfer" as const;
export const ownershipFoundationStepIds = [
  "foundation-contract-model",
  "ownership-restore-rejection-transfer",
  "scope-nested-drop-transfer",
  "scope-conditional-drop-transfer",
  "copy-counter-transfer",
  "copy-array-snapshot-transfer",
] as const;
export const acceptedPreFoundationCourseSha256 = baseline.wholeCourseSha256;
export const acceptedPreFoundationRegistry = baseline;

const cargoStopShapes = new Map<
  string,
  Array<{
    afterStepId: string;
    title: string;
    nextGoal: string;
  }>
>([
  [
    "module-tree-paths",
    [
      {
        afterStepId: "paths-transfer",
        title: "Opcjonalna przerwa po ścieżkach",
        nextGoal:
          "Wróć do modułu, widoczności i importów, aby utrwalić granice API przed kolejną lekcją.",
      },
    ],
  ],
  [
    "module-visibility",
    [
      {
        afterStepId: "visibility-transfer",
        title: "Opcjonalna przerwa po widoczności",
        nextGoal:
          "Wróć do importów i re-eksportów, zachowując dokładny punkt wznowienia.",
      },
    ],
  ],
  [
    "imports-and-reexports",
    [
      {
        afterStepId: "imports-transfer",
        title: "Opcjonalna przerwa po fasadzie API",
        nextGoal:
          "Wróć do granicy Cargo i sprawdź, które nazwy pozostają publiczne.",
      },
    ],
  ],
  [
    "cargo-package-integration",
    [
      {
        afterStepId: "cargo-modify",
        title: "Opcjonalna przerwa przed pustą stroną",
        nextGoal:
          "Wróć do Cargo: biblioteka i program mają osobne granice. Następny krok to cargo-blank.",
      },
    ],
  ],
]);

function sameStop(
  left: { afterStepId: string; title: string; nextGoal: string },
  right: { afterStepId: string; title: string; nextGoal: string },
) {
  return (
    left.afterStepId === right.afterStepId &&
    left.title === right.title &&
    left.nextGoal === right.nextGoal
  );
}

function removeFoundationStops(lesson: Lesson): Lesson {
  const additions = cargoStopShapes.get(lesson.id);
  if (!additions || !lesson.sessionStops) return lesson;
  const remaining = lesson.sessionStops.filter(
    (stop) => !additions.some((addition) => sameStop(stop, addition)),
  );
  if (remaining.length === lesson.sessionStops.length) return lesson;
  const withoutStops = { ...lesson };
  delete withoutStops.sessionStops;
  return remaining.length > 0
    ? { ...withoutStops, sessionStops: remaining }
    : withoutStops;
}

function removeFoundationLesson(lesson: Lesson): Lesson | undefined {
  if (lesson.id === ownershipFoundationLessonId) return undefined;
  return removeFoundationStops(lesson);
}

function removeFoundationModule(module: (typeof Course.modules)[number]) {
  if (module.id !== "data-modeling") return module;
  return {
    ...module,
    lessonIds: module.lessonIds.filter(
      (lessonId) => lessonId !== ownershipFoundationLessonId,
    ),
  };
}

/**
 * Remove only the A5 foundation delta.  This intentionally starts from the
 * assembled current course and leaves every older lesson, stop, registry and
 * evidence record untouched for the historical projections that compose it.
 */
export function historicalBeforeOwnershipFoundation(current: typeof Course) {
  return {
    ...current,
    lessons: current.lessons.flatMap((lesson) => {
      const restored = removeFoundationLesson(lesson);
      return restored ? [restored] : [];
    }),
    modules: current.modules.map(removeFoundationModule),
  };
}
