import * as ownership from "./catalog";
import {
  todoModule,
  todoLessons,
  todoConcepts,
  todoCompetencies,
  todoSources,
  todoReviewExercises,
  todoProject,
} from "./todo-project";
import {
  collectionsModule,
  collectionsLessons,
  collectionsConcepts,
  collectionsCompetencies,
  collectionsSources,
  collectionsReviewExercises,
} from "./collections";
import {
  errorsModule,
  errorsLessons,
  errorsConcepts,
  errorsCompetencies,
  errorsSources,
  errorsReviewExercises,
} from "./error-handling";
import {
  modelingModule,
  modelingLessons,
  modelingConcepts,
  modelingCompetencies,
  modelingSources,
  modelingReviewExercises,
} from "./modeling";
import {
  foundationsModule,
  foundationsLessons,
  foundationsConcepts,
  foundationsCompetencies,
  foundationsSources,
  foundationsReviewExercises,
} from "./foundations";

export const ownershipModule = {
  ...ownership.ownershipModule,
  prerequisites: [foundationsModule.id],
};
export const modules = [
  foundationsModule,
  ownershipModule,
  modelingModule,
  collectionsModule,
  errorsModule,
  todoModule,
];
export const lessons = [
  ...foundationsLessons,
  ...ownership.lessons.map((lesson) =>
    lesson.id === "memory-intro"
      ? { ...lesson, prerequisites: [foundationsLessons.at(-1)!.id] }
      : lesson,
  ),
  ...modelingLessons,
  ...collectionsLessons,
  ...errorsLessons,
  ...todoLessons,
];
export const concepts = [
  ...foundationsConcepts,
  ...ownership.concepts,
  ...modelingConcepts,
  ...collectionsConcepts,
  ...errorsConcepts,
  ...todoConcepts,
];
export const competencies = [
  ...foundationsCompetencies,
  ...ownership.competencies,
  ...modelingCompetencies,
  ...collectionsCompetencies,
  ...errorsCompetencies,
  ...todoCompetencies,
];
export const sources = [
  ...foundationsSources,
  ...ownership.sources,
  ...modelingSources,
  ...collectionsSources,
  ...errorsSources,
  ...todoSources,
];
export const reviewExercises = {
  ...foundationsReviewExercises,
  ...ownership.reviewExercises,
  ...modelingReviewExercises,
  ...collectionsReviewExercises,
  ...errorsReviewExercises,
  ...todoReviewExercises,
};
export const { traces, project } = ownership;
export const projects = [project, todoProject];
export const roadmap = [
  { title: "Setup, Cargo i pierwszy program", status: "available" },
  { title: "Zmienne, typy, funkcje i wyrażenia", status: "available" },
  { title: "Sterowanie przepływem", status: "available" },
  { title: "Pamięć, ownership i podstawy borrowing", status: "available" },
  {
    title: "Slices, struktury, metody, enum, Option i match",
    status: "available",
  },
  { title: "Kolekcje oraz Result i obsługa błędów", status: "available" },
  { title: "Rdzeń Todo CLI: parser, kolekcja i sesje", status: "available" },
  { title: "Moduły, crates, generics i traits", status: "planned" },
  { title: "Lifetimes, closures i iterators", status: "planned" },
  { title: "Testowanie, rustfmt i Clippy w projekcie", status: "planned" },
  { title: "Smart pointers, threads i async", status: "planned" },
  {
    title: "Todo CLI, Log Analyzer, Mini grep i projekt końcowy",
    status: "planned",
  },
  {
    title: "Biblioteki, publiczne API, semver, Cargo features i MSRV",
    status: "planned",
  },
  {
    title: "Async w praktyce: anulowanie, limity, backpressure i shutdown",
    status: "planned",
  },
  { title: "Profilowanie, benchmarki i koszty alokacji", status: "planned" },
  { title: "Unsafe, FFI, Miri i testowanie współbieżności", status: "planned" },
  {
    title: "Architektura, bezpieczeństwo, obserwowalność i przegląd incydentów",
    status: "planned",
  },
];
