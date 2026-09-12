import { rcLifetimeTrace } from "./rc-trace";
import {
  threadsLessons,
  threadsConcepts,
  threadsCompetencies,
  threadsSources,
  threadsReviewExercises,
  threadsModule,
} from "./threads";
import {
  channelsLessons,
  channelsConcepts,
  channelsCompetencies,
  channelsSources,
  channelsReviewExercises,
  channelsModule,
} from "./channels";
import {
  synchronizedStateLessons,
  synchronizedStateConcepts,
  synchronizedStateCompetencies,
  synchronizedStateSources,
  synchronizedStateReviewExercises,
  synchronizedStateModule,
} from "./synchronized-state";
import {
  sharedOwnershipLessons,
  sharedOwnershipConcepts,
  sharedOwnershipCompetencies,
  sharedOwnershipSources,
  sharedOwnershipReviewExercises,
  sharedOwnershipModule,
} from "./shared-ownership";
import {
  boxedValuesLessons,
  boxedValuesConcepts,
  boxedValuesCompetencies,
  boxedValuesSources,
  boxedValuesReviewExercises,
  boxedValuesModule,
} from "./boxed-values";
import {
  loopsLessons,
  loopsConcepts,
  loopsCompetencies,
  loopsSources,
  loopsReviewExercises,
  loopsModule,
} from "./loops";
import {
  testingLessons,
  testingModule,
  testingConcepts,
  testingCompetencies,
  testingSources,
  testingReviewExercises,
} from "./testing";
import {
  logAnalyzerLessons,
  logAnalyzerModule,
  logAnalyzerConcepts,
  logAnalyzerCompetencies,
  logAnalyzerSources,
  logAnalyzerReviewExercises,
  logAnalyzerProject,
} from "./log-analyzer";
import { logAnalyzerPackage } from "./projects/log-analyzer";
import {
  iteratorsLessons,
  iteratorsConcepts,
  iteratorsCompetencies,
  iteratorsReviewExercises,
  iteratorsModule,
  iteratorsSources,
} from "./iterators";
import {
  closuresLessons,
  closuresConcepts,
  closuresCompetencies,
  closuresReviewExercises,
  closuresModule,
  closuresSources,
} from "./closures";
import {
  lifetimesLessons,
  lifetimesConcepts,
  lifetimesCompetencies,
  lifetimesReviewExercises,
  lifetimesModule,
  lifetimesSources,
} from "./lifetimes";
import * as ownership from "./catalog";
import {
  genericsLessons,
  genericsConcepts,
  genericsCompetencies,
  genericsReviewExercises,
  genericsModule,
  genericsSources,
} from "./generics";
import {
  traitsLessons,
  traitsConcepts,
  traitsCompetencies,
  traitsReviewExercises,
  traitsModule,
  traitsSources,
} from "./traits";
import {
  cargoLessons,
  cargoConcepts,
  cargoCompetencies,
  cargoSources,
  cargoReviewExercises,
  cargoModule,
} from "./modules-cargo";
import {
  ioLessons,
  ioConcepts,
  ioCompetencies,
  ioSources,
  ioReviewExercises,
  ioModule,
} from "./io";
import { todoCliPackage } from "./projects/todo-cli";
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
  loopsModule,
  ownershipModule,
  modelingModule,
  collectionsModule,
  errorsModule,
  todoModule,
  cargoModule,
  ioModule,
  genericsModule,
  traitsModule,
  lifetimesModule,
  closuresModule,
  iteratorsModule,
  testingModule,
  logAnalyzerModule,
  boxedValuesModule,
  sharedOwnershipModule,
  threadsModule,
  channelsModule,
  synchronizedStateModule,
];
export const lessons = [
  ...foundationsLessons,
  ...loopsLessons,
  ...ownership.lessons.map((lesson) =>
    lesson.id === "memory-intro"
      ? { ...lesson, prerequisites: [foundationsLessons.at(-1)!.id] }
      : lesson,
  ),
  ...modelingLessons,
  ...collectionsLessons,
  ...errorsLessons,
  ...todoLessons,
  ...cargoLessons,
  ...ioLessons,
  ...genericsLessons,
  ...traitsLessons,
  ...lifetimesLessons,
  ...closuresLessons,
  ...iteratorsLessons,
  ...testingLessons,
  ...logAnalyzerLessons,
  ...boxedValuesLessons,
  ...sharedOwnershipLessons,
  ...threadsLessons,
  ...channelsLessons,
  ...synchronizedStateLessons,
];
export const concepts = [
  ...foundationsConcepts,
  ...loopsConcepts,
  ...ownership.concepts,
  ...modelingConcepts,
  ...collectionsConcepts,
  ...errorsConcepts,
  ...todoConcepts,
  ...cargoConcepts,
  ...ioConcepts,
  ...genericsConcepts,
  ...traitsConcepts,
  ...lifetimesConcepts,
  ...closuresConcepts,
  ...iteratorsConcepts,
  ...testingConcepts,
  ...logAnalyzerConcepts,
  ...boxedValuesConcepts,
  ...sharedOwnershipConcepts,
  ...threadsConcepts,
  ...channelsConcepts,
  ...synchronizedStateConcepts,
];
export const competencies = [
  ...foundationsCompetencies,
  ...loopsCompetencies,
  ...ownership.competencies,
  ...modelingCompetencies,
  ...collectionsCompetencies,
  ...errorsCompetencies,
  ...todoCompetencies,
  ...cargoCompetencies,
  ...ioCompetencies,
  ...genericsCompetencies,
  ...traitsCompetencies,
  ...lifetimesCompetencies,
  ...closuresCompetencies,
  ...iteratorsCompetencies,
  ...testingCompetencies,
  ...logAnalyzerCompetencies,
  ...boxedValuesCompetencies,
  ...sharedOwnershipCompetencies,
  ...threadsCompetencies,
  ...channelsCompetencies,
  ...synchronizedStateCompetencies,
];
export const sources = [
  ...foundationsSources,
  ...loopsSources,
  ...ownership.sources,
  ...modelingSources,
  ...collectionsSources,
  ...errorsSources,
  ...todoSources,
  ...cargoSources,
  ...ioSources,
  ...genericsSources,
  ...traitsSources,
  ...lifetimesSources,
  ...closuresSources,
  ...iteratorsSources,
  ...testingSources,
  ...logAnalyzerSources,
  ...boxedValuesSources,
  ...sharedOwnershipSources,
  ...threadsSources,
  ...channelsSources,
  ...synchronizedStateSources,
];
export const reviewExercises = {
  ...foundationsReviewExercises,
  ...loopsReviewExercises,
  ...ownership.reviewExercises,
  ...modelingReviewExercises,
  ...collectionsReviewExercises,
  ...errorsReviewExercises,
  ...todoReviewExercises,
  ...cargoReviewExercises,
  ...ioReviewExercises,
  ...genericsReviewExercises,
  ...traitsReviewExercises,
  ...lifetimesReviewExercises,
  ...closuresReviewExercises,
  ...iteratorsReviewExercises,
  ...testingReviewExercises,
  ...logAnalyzerReviewExercises,
  ...boxedValuesReviewExercises,
  ...sharedOwnershipReviewExercises,
  ...threadsReviewExercises,
  ...channelsReviewExercises,
  ...synchronizedStateReviewExercises,
};
export const { project } = ownership;
export const traces: typeof ownership.traces = {
  ...ownership.traces,
  "trace-rc-weak": rcLifetimeTrace,
};
export const projects = [
  project,
  {
    ...todoProject,
    objective:
      "Zbuduj Todo CLI od parsera i stanu w pamięci do pakietu Cargo, który zachowuje zadania między uruchomieniami i jawnie obsługuje błędy wejścia oraz plików.",
    lessonIds: [
      ...todoProject.lessonIds!,
      ...ioLessons.map((lesson) => lesson.id),
    ],
    reviewConceptIds: [
      ...todoProject.reviewConceptIds!,
      ...ioConcepts.map((concept) => concept.id),
    ],
    requiredBehaviors: [
      ...todoProject.requiredBehaviors,
      "Plik zachowuje kolejność, tytuły Unicode i stan wykonania. CLI odczytuje go po ponownym uruchomieniu.",
      "Uszkodzony plik i nieudany zapis dają jawny błąd. List nie zapisuje pliku.",
    ],
    requiredEvidence: [
      ...todoProject.requiredEvidence,
      "Testy prawdziwych plików sprawdzają zapis, odczyt i zachowanie oryginału przy błędzie.",
      "Pakiet Cargo ma testy osobnego procesu: stdin, stdout, stderr, kody zakończenia i ponowne uruchomienie.",
    ],
    constraints: [
      ...todoProject.constraints.slice(0, 2),
      "Nie traktuj uszkodzonego pliku jako pustej listy. Nie zastępuj istniejącego pliku przed ukończeniem nowego zapisu.",
      "Pobranie projektu nie zalicza ćwiczeń. Polecenia Cargo uruchamiasz lokalnie według README.",
    ],
    adversarialLessonId: "todo-file-persistence",
    adversarialInject:
      "Program działa dla poprawnego pliku. Teraz plik jest uszkodzony albo istnieje już plik .tmp. Zachowaj wcześniejsze dane i zwróć błąd zamiast raportować nieutrwalony sukces.",
    package: todoCliPackage,
  },
  { ...logAnalyzerProject, package: logAnalyzerPackage },
];
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
  {
    title: "Moduły, widoczność, importy i podstawy Cargo",
    status: "available",
  },
  {
    title: "Todo: format pliku, zapis i pobierany projekt CLI",
    status: "available",
  },
  {
    title: "Generics, własne traity, typy powiązane i dyn",
    status: "available",
  },
  { title: "Lifetimes, closures i iterators", status: "available" },
  {
    title: "Podstawy testowania, rustfmt i Clippy w projekcie",
    status: "available",
  },
  { title: "Log Analyzer: parser, strumień i pakiet CLI", status: "available" },
  { title: "Box, Deref, Drop oraz Rc, RefCell i Weak", status: "available" },
  { title: "Wątki, kanały, Send/Sync oraz Arc/Mutex", status: "available" },
  { title: "Async i futures: wprowadzenie", status: "planned" },
  {
    title: "Mini grep i projekt końcowy",
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
