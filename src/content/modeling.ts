import type { CourseModule } from "@/domain/types";
import {
  recordsLessons,
  recordsConcepts,
  recordsCompetencies,
  recordsSources,
  recordsReviewExercises,
} from "./modeling-records";
import {
  variantsLessons,
  variantsConcepts,
  variantsCompetencies,
  variantsSources,
  variantsReviewExercises,
} from "./modeling-variants";

export const modelingLessons = [...recordsLessons, ...variantsLessons];
export const modelingConcepts = [...recordsConcepts, ...variantsConcepts];
export const modelingCompetencies = [
  ...recordsCompetencies,
  ...variantsCompetencies,
];
export const modelingSources = [...recordsSources, ...variantsSources];
export const modelingReviewExercises = {
  ...recordsReviewExercises,
  ...variantsReviewExercises,
};

export const modelingModule: CourseModule = {
  id: "data-modeling",
  title: "Modelowanie danych",
  whyItMatters:
    "Gdy program zaczyna przechowywać więcej danych, sam zestaw zmiennych przestaje wystarczać. Nauczysz się wybierać pożyczony widok, nazywać pola i możliwe stany oraz odróżniać brak wartości od zera.",
  capabilities: [
    "Dobierzesz wycinek &[i32] lub &str i sprawdzisz granice zakresu.",
    "Połączysz powiązane dane w strukturze posiadającej własny tekst.",
    "Oddzielisz odczyt przez &self od zmiany stanu przez &mut self.",
    "Obsłużysz warianty enumu przez match oraz brak danych przez Option.",
    "Zbudujesz mały model zadania i przetestujesz przejścia stanu oraz przypadki brzegowe.",
  ],
  prerequisites: ["ownership"],
  lessonIds: modelingLessons.map((lesson) => lesson.id),
  exitGate: [
    "Funkcja operuje na pożyczonym wycinku i daje poprawne wyniki dla różnych danych.",
    "Rekord oraz metody zachowują własność danych i prawidłowo zmieniają stan.",
    "Match pokrywa warianty, a Option rozróżnia brak i obecne zero.",
    "Samodzielny model przechodzi testy dla nowych danych i kolejnych zmian stanu.",
  ],
  projectConnection:
    "Zbudujesz rdzeń danych dla przyszłego Todo CLI: własny tytuł, nazwany stan i opcjonalną estymatę. Dzięki temu kolejne lekcje będą mogły dodać kolekcję zadań, wejście użytkownika i zapis.",
  assessmentId: "modeling-assessment/modeling-blank",
  gateCriteria: [
    {
      id: "slice-gate",
      label: "Pożyczony wycinek działa dla różnych danych",
      taskRefs: [
        { lessonId: "slices-and-views", stepId: "slice-repair" },
        { lessonId: "slices-and-views", stepId: "slice-gate" },
        { lessonId: "slices-and-views", stepId: "slice-edge-gate" },
      ],
    },
    {
      id: "record-gate",
      label: "Nazwane pola zachowują właściwą własność tekstu",
      taskRefs: [
        { lessonId: "structs-and-fields", stepId: "record-repair" },
        { lessonId: "structs-and-fields", stepId: "record-gate" },
        { lessonId: "structs-and-fields", stepId: "record-state-gate" },
      ],
    },
    {
      id: "method-gate",
      label: "Metoda zmienia stan przez właściwy rodzaj dostępu",
      taskRefs: [
        { lessonId: "methods-and-state", stepId: "method-repair" },
        { lessonId: "methods-and-state", stepId: "method-gate" },
        { lessonId: "methods-and-state", stepId: "method-reset-gate" },
      ],
    },
    {
      id: "variant-gate",
      label: "Match obsługuje nazwane warianty enumu",
      taskRefs: [
        { lessonId: "enums-and-match", stepId: "enum-error" },
        { lessonId: "enums-and-match", stepId: "enum-payload" },
      ],
    },
    {
      id: "option-gate",
      label: "Option odróżnia brak wartości od obecnego zera",
      taskRefs: [
        { lessonId: "option-and-absence", stepId: "option-error" },
        { lessonId: "option-and-absence", stepId: "option-match" },
      ],
    },
    {
      id: "model-transfer-gate",
      label: "Nowy model z rekordem, stanem i opcjonalnością przechodzi testy",
      taskRefs: [
        { lessonId: "modeling-assessment", stepId: "modeling-blank" },
        { lessonId: "modeling-assessment", stepId: "modeling-alt" },
      ],
    },
  ],
};
