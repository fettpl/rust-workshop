import { guessingModule } from "./guessing-module";
import {
  guessingCoreLessons,
  guessingCoreConcepts,
  guessingCoreCompetencies,
  guessingCoreSources,
  guessingCoreReviewExercises,
} from "./guessing-core";
import {
  guessingIoLessons,
  guessingIoConcepts,
  guessingIoCompetencies,
  guessingIoSources,
  guessingIoReviewExercises,
} from "./guessing-io";
import { numberGuessingProject } from "./projects/number-guessing";
import { miniGrepModule } from "./mini-grep-module";
import {
  miniGrepSearchLessons,
  miniGrepSearchConcepts,
  miniGrepSearchCompetencies,
  miniGrepSearchSources,
  miniGrepSearchReviewExercises,
} from "./mini-grep-search";
import {
  miniGrepSystemLessons,
  miniGrepSystemConcepts,
  miniGrepSystemCompetencies,
  miniGrepSystemSources,
  miniGrepSystemReviewExercises,
} from "./mini-grep-system";
import { miniGrepProject } from "./projects/mini-grep";
import { publicApiModule } from "./public-api-module";
import {
  publicApiValueLessons,
  publicApiValueConcepts,
  publicApiValueCompetencies,
  publicApiValueSources,
  publicApiValueReviewExercises,
} from "./public-api-values";
import {
  publicApiEvolutionLessons,
  publicApiEvolutionConcepts,
  publicApiEvolutionCompetencies,
  publicApiEvolutionSources,
  publicApiEvolutionReviewExercises,
} from "./public-api-evolution";
import { frameProtocolProject } from "./projects/frame-protocol";
import { tokioNetworkModule } from "./tokio-network-module";
import {
  tokioTcpLessons,
  tokioTcpConcepts,
  tokioTcpCompetencies,
  tokioTcpSources,
  tokioTcpReviewExercises,
} from "./tokio-tcp";
import {
  tokioNetworkLifecycleLessons,
  tokioNetworkLifecycleConcepts,
  tokioNetworkLifecycleCompetencies,
  tokioNetworkLifecycleSources,
  tokioNetworkLifecycleReviewExercises,
} from "./tokio-network-lifecycle";
import { tokioServiceProject } from "./projects/tokio-service";
import { tokioIoModule, tokioBlockingModule } from "./tokio-io-modules";
import {
  tokioIoLessons,
  tokioIoConcepts,
  tokioIoCompetencies,
  tokioIoSources,
  tokioIoReviewExercises,
} from "./tokio-io";
import {
  tokioStreamLessons,
  tokioStreamConcepts,
  tokioStreamCompetencies,
  tokioStreamSources,
  tokioStreamReviewExercises,
} from "./tokio-streams";
import {
  tokioBlockingLessons,
  tokioBlockingConcepts,
  tokioBlockingCompetencies,
  tokioBlockingSources,
  tokioBlockingReviewExercises,
} from "./tokio-blocking";
import { tokioPipelineProject } from "./projects/tokio-pipeline";
import { tokioFlowModule } from "./tokio-flow-control";
import {
  tokioChannelLessons,
  tokioChannelConcepts,
  tokioChannelCompetencies,
  tokioChannelSources,
  tokioChannelReviewExercises,
} from "./tokio-channels";
import {
  tokioTimeLessons,
  tokioTimeConcepts,
  tokioTimeCompetencies,
  tokioTimeSources,
  tokioTimeReviewExercises,
} from "./tokio-time-select";
import {
  tokioShutdownLessons,
  tokioShutdownConcepts,
  tokioShutdownCompetencies,
  tokioShutdownSources,
  tokioShutdownReviewExercises,
} from "./tokio-shutdown";
import { concurrencyLabProject } from "./projects/concurrency-lab";
import {
  tokioRuntimeLessons,
  tokioRuntimeConcepts,
  tokioRuntimeCompetencies,
  tokioRuntimeSources,
  tokioRuntimeReviewExercises,
  tokioRuntimeModule,
} from "./tokio-runtime-tasks";
import {
  asyncFoundationsLessons,
  asyncFoundationsConcepts,
  asyncFoundationsCompetencies,
  asyncFoundationsSources,
  asyncFoundationsReviewExercises,
  asyncFoundationsModule,
} from "./async-foundations";
import {
  atomicStateLessons,
  atomicStateConcepts,
  atomicStateCompetencies,
  atomicStateSources,
  atomicStateReviewExercises,
  atomicStateModule,
} from "./atomic-state";
import {
  memoryOrderingLessons,
  memoryOrderingConcepts,
  memoryOrderingCompetencies,
  memoryOrderingSources,
  memoryOrderingReviewExercises,
  memoryOrderingModule,
} from "./memory-ordering";
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
  guessingModule,
  logAnalyzerModule,
  boxedValuesModule,
  sharedOwnershipModule,
  threadsModule,
  channelsModule,
  synchronizedStateModule,
  atomicStateModule,
  memoryOrderingModule,
  asyncFoundationsModule,
  tokioRuntimeModule,
  tokioFlowModule,
  tokioIoModule,
  tokioBlockingModule,
  tokioNetworkModule,
  publicApiModule,
  miniGrepModule,
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
  ...guessingCoreLessons,
  ...guessingIoLessons,
  ...logAnalyzerLessons,
  ...boxedValuesLessons,
  ...sharedOwnershipLessons,
  ...threadsLessons,
  ...channelsLessons,
  ...synchronizedStateLessons,
  ...atomicStateLessons,
  ...memoryOrderingLessons,
  ...asyncFoundationsLessons,
  ...tokioRuntimeLessons,
  ...tokioChannelLessons,
  ...tokioTimeLessons,
  ...tokioShutdownLessons,
  ...tokioIoLessons,
  ...tokioStreamLessons,
  ...tokioBlockingLessons,
  ...tokioTcpLessons,
  ...tokioNetworkLifecycleLessons,
  ...publicApiValueLessons,
  ...publicApiEvolutionLessons,
  ...miniGrepSearchLessons,
  ...miniGrepSystemLessons,
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
  ...guessingCoreConcepts,
  ...guessingIoConcepts,
  ...logAnalyzerConcepts,
  ...boxedValuesConcepts,
  ...sharedOwnershipConcepts,
  ...threadsConcepts,
  ...channelsConcepts,
  ...synchronizedStateConcepts,
  ...atomicStateConcepts,
  ...memoryOrderingConcepts,
  ...asyncFoundationsConcepts,
  ...tokioRuntimeConcepts,
  ...tokioChannelConcepts,
  ...tokioTimeConcepts,
  ...tokioShutdownConcepts,
  ...tokioIoConcepts,
  ...tokioStreamConcepts,
  ...tokioBlockingConcepts,
  ...tokioTcpConcepts,
  ...tokioNetworkLifecycleConcepts,
  ...publicApiValueConcepts,
  ...publicApiEvolutionConcepts,
  ...miniGrepSearchConcepts,
  ...miniGrepSystemConcepts,
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
  ...guessingCoreCompetencies,
  ...guessingIoCompetencies,
  ...logAnalyzerCompetencies,
  ...boxedValuesCompetencies,
  ...sharedOwnershipCompetencies,
  ...threadsCompetencies,
  ...channelsCompetencies,
  ...synchronizedStateCompetencies,
  ...atomicStateCompetencies,
  ...memoryOrderingCompetencies,
  ...asyncFoundationsCompetencies,
  ...tokioRuntimeCompetencies,
  ...tokioChannelCompetencies,
  ...tokioTimeCompetencies,
  ...tokioShutdownCompetencies,
  ...tokioIoCompetencies,
  ...tokioStreamCompetencies,
  ...tokioBlockingCompetencies,
  ...tokioTcpCompetencies,
  ...tokioNetworkLifecycleCompetencies,
  ...publicApiValueCompetencies,
  ...publicApiEvolutionCompetencies,
  ...miniGrepSearchCompetencies,
  ...miniGrepSystemCompetencies,
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
  ...guessingCoreSources,
  ...guessingIoSources,
  ...logAnalyzerSources,
  ...boxedValuesSources,
  ...sharedOwnershipSources,
  ...threadsSources,
  ...channelsSources,
  ...synchronizedStateSources,
  ...atomicStateSources,
  ...memoryOrderingSources,
  ...asyncFoundationsSources,
  ...tokioRuntimeSources,
  ...tokioChannelSources,
  ...tokioTimeSources,
  ...tokioShutdownSources,
  ...tokioIoSources,
  ...tokioStreamSources,
  ...tokioBlockingSources,
  ...tokioTcpSources,
  ...tokioNetworkLifecycleSources,
  ...publicApiValueSources,
  ...publicApiEvolutionSources,
  ...miniGrepSearchSources,
  ...miniGrepSystemSources,
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
  ...guessingCoreReviewExercises,
  ...guessingIoReviewExercises,
  ...logAnalyzerReviewExercises,
  ...boxedValuesReviewExercises,
  ...sharedOwnershipReviewExercises,
  ...threadsReviewExercises,
  ...channelsReviewExercises,
  ...synchronizedStateReviewExercises,
  ...atomicStateReviewExercises,
  ...memoryOrderingReviewExercises,
  ...asyncFoundationsReviewExercises,
  ...tokioRuntimeReviewExercises,
  ...tokioChannelReviewExercises,
  ...tokioTimeReviewExercises,
  ...tokioShutdownReviewExercises,
  ...tokioIoReviewExercises,
  ...tokioStreamReviewExercises,
  ...tokioBlockingReviewExercises,
  ...tokioTcpReviewExercises,
  ...tokioNetworkLifecycleReviewExercises,
  ...publicApiValueReviewExercises,
  ...publicApiEvolutionReviewExercises,
  ...miniGrepSearchReviewExercises,
  ...miniGrepSystemReviewExercises,
};
export const project = numberGuessingProject;
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
  concurrencyLabProject,
  tokioPipelineProject,
  tokioServiceProject,
  frameProtocolProject,
  miniGrepProject,
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
  { title: "Number Guessing+: pełna gra i pakiet CLI", status: "available" },
  { title: "Log Analyzer: parser, strumień i pakiet CLI", status: "available" },
  { title: "Box, Deref, Drop oraz Rc, RefCell i Weak", status: "available" },
  { title: "Wątki, kanały, Send/Sync oraz Arc/Mutex", status: "available" },
  {
    title: "Atomics, porządkowanie pamięci i laboratorium Loom",
    status: "available",
  },
  {
    title: "Podstawy async: Future, await, własność i anulowanie",
    status: "available",
  },
  {
    title: "Tokio: runtime, zadania, Send i wyniki JoinHandle",
    status: "available",
  },
  {
    title: "Tokio: bounded kanały, timeout, select i zamknięcie",
    status: "available",
  },
  {
    title: "Zaawansowane Cargo, zależności i publikacja bibliotek",
    status: "planned",
  },
  {
    title: "Tokio: I/O, ramki, streamy i operacje blokujące",
    status: "available",
  },
  {
    title: "Serwis sieciowy Tokio i integracja większego systemu",
    status: "available",
  },
  {
    title: "Publiczne API: kontrakty i workspace Cargo",
    status: "available",
  },
  {
    title: "Mini grep: ograniczone wejście, kontekst i CLI",
    status: "available",
  },
  { title: "Profilowanie, benchmarki i koszty alokacji", status: "planned" },
  { title: "Unsafe, FFI, Miri i testowanie współbieżności", status: "planned" },
  {
    title: "Architektura, bezpieczeństwo, obserwowalność i przegląd incydentów",
    status: "planned",
  },
  { title: "Większy projekt końcowy", status: "planned" },
];
