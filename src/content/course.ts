import {
  fileSchemaEvolutionLessons,
  fileSchemaEvolutionConcepts,
  fileSchemaEvolutionCompetencies,
  fileSchemaEvolutionReviewExercises,
  fileSchemaEvolutionModule,
} from "./file-schema-evolution";
import { fileSchemaEvolutionProject } from "./projects/file-schema-evolution";
import { serviceAuthorizationLessons, serviceAuthorizationConcepts, serviceAuthorizationCompetencies, serviceAuthorizationReviewExercises, serviceAuthorizationModule } from "./service-authorization";
import { serviceAuthorizationProject } from "./projects/service-authorization";
import {
  documentationRepairLessons,
  documentationRepairConcepts,
  documentationRepairSources,
  documentationRepairReviewExercises,
} from "./documentation-guided-repair";
import {
  fallibleCompositionLessons,
  fallibleCompositionConcepts,
  fallibleCompositionSources,
  fallibleCompositionReviewExercises,
} from "./fallible-composition";
import { borrowedCallbacksModule } from "./borrowed-callbacks-module";
import type { LessonStep } from "@/domain/types";
import { gatLendingModule } from "./gat-lending-module";
import {
  gatProducerLessons,
  gatProducerConcepts,
  gatProducerCompetencies,
  gatProducerSources,
  gatProducerReviewExercises,
} from "./gat-producers";
import {
  gatConsumerLessons,
  gatConsumerConcepts,
  gatConsumerCompetencies,
  gatConsumerSources,
  gatConsumerReviewExercises,
} from "./gat-consumers";
import {
  borrowedVarianceLessons,
  borrowedVarianceConcepts,
  borrowedVarianceCompetencies,
  borrowedVarianceSources,
  borrowedVarianceReviewExercises,
} from "./borrowed-variance";
import {
  borrowedHrtbLessons,
  borrowedHrtbConcepts,
  borrowedHrtbCompetencies,
  borrowedHrtbSources,
  borrowedHrtbReviewExercises,
} from "./borrowed-hrtb";
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
import { propertyContractsModule } from "./property-contracts-module";
import {
  propertyFoundationLessons,
  propertyFoundationConcepts,
  propertyFoundationCompetencies,
  propertyFoundationSources,
  propertyFoundationReviewExercises,
} from "./property-foundations";
import {
  propertyCounterexampleLessons,
  propertyCounterexampleConcepts,
  propertyCounterexampleCompetencies,
  propertyCounterexampleSources,
  propertyCounterexampleReviewExercises,
} from "./property-counterexamples";
import { propertyContractsProject } from "./projects/property-contracts";
import { fuzzEvidenceModule } from "./fuzz-evidence-module";
import {
  fuzzEvidenceLessons,
  fuzzEvidenceConcepts,
  fuzzEvidenceCompetencies,
  fuzzEvidenceSources,
  fuzzEvidenceReviewExercises,
} from "./fuzz-evidence";
import { ffiBufferProject } from "./projects/ffi-buffer";
import { miriSafetyProject } from "./projects/miri-safety";
import {
  performanceEvidenceLessons,
  performanceEvidenceConcepts,
  performanceEvidenceCompetencies,
  performanceEvidenceSources,
  performanceEvidenceReviewExercises,
  performanceEvidenceModule,
} from "./performance-evidence";
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
import { apiFrameProtocolMaintenanceLesson } from "./api-frame-protocol-maintenance";
import {
  apiReleaseMatrixLessons,
  apiReleaseMatrixConcepts,
  apiReleaseMatrixCompetencies,
  apiReleaseMatrixSources,
  apiReleaseMatrixReviewExercises,
  apiReleaseMatrixModule,
} from "./api-release-matrix";
import {
  macrosAsApiLessons,
  macrosAsApiConcepts,
  macrosAsApiCompetencies,
  macrosAsApiSources,
  macrosAsApiReviewExercises,
  macrosAsApiModule,
} from "./macros-as-api";
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
import { serviceOperationsProject } from "./projects/service-operations";
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
  runtimeAllocationEvidenceLessons,
  runtimeAllocationEvidenceConcepts,
  runtimeAllocationEvidenceReviewExercises,
} from "./runtime-allocation-evidence";
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
  traitsModule as baseTraitsModule,
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
import { cargoDependencyLifecycleModule } from "./cargo-dependency-lifecycle-module";
import {
  cargoDependencyLessons,
  cargoDependencyConcepts,
  cargoDependencyCompetencies,
  cargoDependencySources,
  cargoDependencyReviewExercises,
} from "./cargo-dependencies";
import {
  cargoReleaseLessons,
  cargoReleaseConcepts,
  cargoReleaseCompetencies,
  cargoReleaseSources,
  cargoReleaseReviewExercises,
} from "./cargo-release-policy";
import { dependencyAssuranceModule } from "./dependency-assurance-module";
import {
  dependencyAssuranceLessons,
  dependencyAssuranceConcepts,
  dependencyAssuranceCompetencies,
  dependencyAssuranceSources,
  dependencyAssuranceReviewExercises,
} from "./dependency-assurance";
import {
  unsafeFfiLessons,
  unsafeFfiConcepts,
  unsafeFfiCompetencies,
  unsafeFfiSources,
  unsafeFfiReviewExercises,
  unsafeFfiModule,
} from "./unsafe-ffi";
import {
  unsafeMiriLessons,
  unsafeMiriConcepts,
  unsafeMiriCompetencies,
  unsafeMiriSources,
  unsafeMiriReviewExercises,
  unsafeMiriModule,
} from "./unsafe-miri";
import {
  unsafeBorrowedMemoryLessons,
  unsafeBorrowedMemoryConcepts,
  unsafeBorrowedMemoryCompetencies,
  unsafeBorrowedMemorySources,
  unsafeBorrowedMemoryReviewExercises,
  unsafeBorrowedMemoryModule,
} from "./unsafe-borrowed-memory";
import {
  serviceOperationsLessons,
  serviceOperationsConcepts,
  serviceOperationsCompetencies,
  serviceOperationsSources,
  serviceOperationsReviewExercises,
  serviceOperationsModule,
} from "./service-operations";
import {
  profileEvidenceLessons,
  profileEvidenceConcepts,
  profileEvidenceCompetencies,
  profileEvidenceSources,
  profileEvidenceReviewExercises,
  profileEvidenceModule,
} from "./profile-evidence";
import {
  capstoneIntegrationLessons,
  capstoneIntegrationConcepts,
  capstoneIntegrationCompetencies,
  capstoneIntegrationSources,
  capstoneIntegrationReviewExercises,
} from "./capstone-integration";
import {
  serviceClientRetryLessons,
  serviceClientRetryConcepts,
  serviceClientRetryCompetencies,
  serviceClientRetryReviewExercises,
  serviceClientRetryModule,
} from "./service-client-retry";
import {
  capstoneMaintenanceModuleExtension,
  capstoneMaintenanceRecoveryLesson,
} from "./capstone-maintenance-lesson";
import { durableLogServiceProject } from "./projects/durable-log-service";
import { durableLogRetryProject } from "./projects/durable-log-retry";
import {
  asyncLendingCoreLessons,
  asyncLendingCoreConcepts,
  asyncLendingCoreCompetencies,
  asyncLendingCoreSources,
  asyncLendingCoreReviewExercises,
} from "./async-lending-core";
import {
  asyncLendingBoundaryLessons,
  asyncLendingBoundaryConcepts,
  asyncLendingBoundaryCompetencies,
  asyncLendingBoundarySources,
  asyncLendingBoundaryReviewExercises,
} from "./async-lending-boundaries";
import { asyncLendingModule } from "./async-lending-module";

import {
  coreConversionsLessons,
  coreConversionsConcepts,
  coreConversionsCompetencies,
  coreConversionsSources,
  coreConversionsReviewExercises,
} from "./core-conversions";
import {
  coreCheckedConversionsLessons,
  coreCheckedConversionsConcepts,
  coreCheckedConversionsCompetencies,
  coreCheckedConversionsSources,
  coreCheckedConversionsReviewExercises,
} from "./core-checked-conversions";
import {
  nestedPatternLessons,
  nestedPatternConcepts,
  nestedPatternCompetencies,
  nestedPatternSources,
  nestedPatternReviewExercises,
} from "./nested-patterns";
import { ownershipFoundationTransferLesson } from "./ownership-foundation-transfer";
import {
  functionOwnershipCalibrationLesson,
  delayedReviewExercises as functionOwnershipDelayedReviewExercises,
} from "./function-ownership-calibration";
import {
  sharedBorrowCalibrationLesson,
  delayedReviewExercises as sharedBorrowDelayedReviewExercises,
} from "./shared-borrow-calibration";
import { shortReviewExercises } from "./io-review-probes";

const traitsModule = {
  ...baseTraitsModule,
  lessonIds: [
    ...baseTraitsModule.lessonIds,
    "conversion-ownership-views",
    "checked-conversions",
  ],
  capabilities: [
    ...baseTraitsModule.capabilities,
    "Ćwiczysz From i pożyczone widoki AsRef w jawnych kontraktach API.",
    "Ćwiczysz sprawdzane konwersje i przenoszenie błędów przez Result oraz ?.",
  ],
  exitGate: [
    ...baseTraitsModule.exitGate,
    "Naprawiasz widok Label albo implementujesz konwersję i widok Samples w testowanym API.",
    "Naprawiasz mapowanie błędu Level albo implementujesz sprawdzaną konwersję Percent w testowanym API.",
  ],
  gateCriteria: [
    ...(baseTraitsModule.gateCriteria ?? []),
    {
      id: "traits-conversion-views-gate",
      label: "Naprawiony AsRef dla Label albo From i AsRef dla Samples.",
      taskRefs: [
        {
          lessonId: "conversion-ownership-views",
          stepId: "conversions-label-repair",
        },
        {
          lessonId: "conversion-ownership-views",
          stepId: "conversions-samples-transfer",
        },
      ],
    },
    {
      id: "traits-checked-conversions-gate",
      label: "Naprawione mapowanie błędu Level albo TryFrom dla Percent.",
      taskRefs: [
        { lessonId: "checked-conversions", stepId: "checked-level-repair" },
        { lessonId: "checked-conversions", stepId: "checked-percent-transfer" },
      ],
    },
  ],
};

export const ownershipModule = {
  ...ownership.ownershipModule,
  prerequisites: [foundationsModule.id],
};
const dataModelingModule = {
  ...modelingModule,
  lessonIds: [
    ...modelingModule.lessonIds,
    ownershipFoundationTransferLesson.id,
  ],
};
export const modules = [
  foundationsModule,
  loopsModule,
  ownershipModule,
  dataModelingModule,
  collectionsModule,
  errorsModule,
  todoModule,
  cargoModule,
  ioModule,
  genericsModule,
  traitsModule,
  lifetimesModule,
  closuresModule,
  borrowedCallbacksModule,
  iteratorsModule,
  gatLendingModule,
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
  asyncLendingModule,
  publicApiModule,
  apiReleaseMatrixModule,
  macrosAsApiModule,
  cargoDependencyLifecycleModule,
  dependencyAssuranceModule,
  miniGrepModule,
  propertyContractsModule,
  fuzzEvidenceModule,
  performanceEvidenceModule,
  profileEvidenceModule,
  unsafeFfiModule,
  unsafeMiriModule,
  unsafeBorrowedMemoryModule,
  serviceOperationsModule,
  capstoneMaintenanceModuleExtension,
  serviceClientRetryModule,
  serviceAuthorizationModule,
  fileSchemaEvolutionModule,
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
  ...borrowedVarianceLessons,
  ...borrowedHrtbLessons,
  ...iteratorsLessons,
  ...gatProducerLessons,
  ...gatConsumerLessons,
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
  ...asyncLendingCoreLessons,
  ...asyncLendingBoundaryLessons,
  ...publicApiValueLessons,
  ...publicApiEvolutionLessons,
  apiFrameProtocolMaintenanceLesson,
  ...apiReleaseMatrixLessons,
  ...macrosAsApiLessons,
  ...cargoDependencyLessons,
  ...cargoReleaseLessons,
  ...dependencyAssuranceLessons,
  ...miniGrepSearchLessons,
  ...miniGrepSystemLessons,
  ...propertyFoundationLessons,
  ...propertyCounterexampleLessons,
  ...fuzzEvidenceLessons,
  ...performanceEvidenceLessons,
  ...profileEvidenceLessons,
  ...runtimeAllocationEvidenceLessons,
  ...unsafeFfiLessons,
  ...unsafeMiriLessons,
  ...unsafeBorrowedMemoryLessons,
  ...serviceOperationsLessons,
  ...capstoneIntegrationLessons,
  capstoneMaintenanceRecoveryLesson,
  ...serviceClientRetryLessons,
  ...coreConversionsLessons,
  ...coreCheckedConversionsLessons,
  ...nestedPatternLessons,
  functionOwnershipCalibrationLesson,
  sharedBorrowCalibrationLesson,
  ...fallibleCompositionLessons,
  ...documentationRepairLessons,
  ownershipFoundationTransferLesson,
  ...serviceAuthorizationLessons,
  ...fileSchemaEvolutionLessons,
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
  ...borrowedVarianceConcepts,
  ...borrowedHrtbConcepts,
  ...iteratorsConcepts,
  ...gatProducerConcepts,
  ...gatConsumerConcepts,
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
  ...asyncLendingCoreConcepts,
  ...asyncLendingBoundaryConcepts,
  ...publicApiValueConcepts,
  ...publicApiEvolutionConcepts,
  ...apiReleaseMatrixConcepts,
  ...macrosAsApiConcepts,
  ...cargoDependencyConcepts,
  ...cargoReleaseConcepts,
  ...dependencyAssuranceConcepts,
  ...miniGrepSearchConcepts,
  ...miniGrepSystemConcepts,
  ...propertyFoundationConcepts,
  ...propertyCounterexampleConcepts,
  ...fuzzEvidenceConcepts,
  ...performanceEvidenceConcepts,
  ...profileEvidenceConcepts,
  ...runtimeAllocationEvidenceConcepts,
  ...unsafeFfiConcepts,
  ...unsafeMiriConcepts,
  ...unsafeBorrowedMemoryConcepts,
  ...serviceOperationsConcepts,
  ...capstoneIntegrationConcepts,
  ...serviceClientRetryConcepts,
  ...coreConversionsConcepts,
  ...coreCheckedConversionsConcepts,
  ...nestedPatternConcepts,
  ...fallibleCompositionConcepts,
  ...documentationRepairConcepts,
  ...serviceAuthorizationConcepts,
  ...fileSchemaEvolutionConcepts,
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
  ...borrowedVarianceCompetencies,
  ...borrowedHrtbCompetencies,
  ...iteratorsCompetencies,
  ...gatProducerCompetencies,
  ...gatConsumerCompetencies,
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
  ...asyncLendingCoreCompetencies,
  ...asyncLendingBoundaryCompetencies,
  ...publicApiValueCompetencies,
  ...publicApiEvolutionCompetencies,
  ...apiReleaseMatrixCompetencies,
  ...macrosAsApiCompetencies,
  ...cargoDependencyCompetencies,
  ...cargoReleaseCompetencies,
  ...dependencyAssuranceCompetencies,
  ...miniGrepSearchCompetencies,
  ...miniGrepSystemCompetencies,
  ...propertyFoundationCompetencies,
  ...propertyCounterexampleCompetencies,
  ...fuzzEvidenceCompetencies,
  ...performanceEvidenceCompetencies,
  ...profileEvidenceCompetencies,
  ...unsafeFfiCompetencies,
  ...unsafeMiriCompetencies,
  ...unsafeBorrowedMemoryCompetencies,
  ...serviceOperationsCompetencies,
  ...capstoneIntegrationCompetencies,
  ...serviceClientRetryCompetencies,
  ...coreConversionsCompetencies,
  ...coreCheckedConversionsCompetencies,
  ...nestedPatternCompetencies,
  ...serviceAuthorizationCompetencies,
  ...fileSchemaEvolutionCompetencies,
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
  ...borrowedVarianceSources,
  ...borrowedHrtbSources,
  ...iteratorsSources,
  ...gatProducerSources,
  ...gatConsumerSources,
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
  ...asyncLendingCoreSources,
  ...asyncLendingBoundarySources,
  ...publicApiValueSources,
  ...publicApiEvolutionSources,
  ...apiReleaseMatrixSources,
  ...macrosAsApiSources,
  ...cargoDependencySources,
  ...cargoReleaseSources,
  ...dependencyAssuranceSources,
  ...miniGrepSearchSources,
  ...miniGrepSystemSources,
  ...propertyFoundationSources,
  ...propertyCounterexampleSources,
  ...fuzzEvidenceSources,
  ...performanceEvidenceSources,
  ...profileEvidenceSources,
  ...unsafeFfiSources,
  ...unsafeMiriSources,
  ...unsafeBorrowedMemorySources,
  ...serviceOperationsSources,
  ...capstoneIntegrationSources,
  ...coreConversionsSources,
  ...coreCheckedConversionsSources,
  ...nestedPatternSources,
  ...fallibleCompositionSources,
  ...documentationRepairSources,
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
  ...borrowedVarianceReviewExercises,
  ...borrowedHrtbReviewExercises,
  ...iteratorsReviewExercises,
  ...gatProducerReviewExercises,
  ...gatConsumerReviewExercises,
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
  ...asyncLendingCoreReviewExercises,
  ...asyncLendingBoundaryReviewExercises,
  ...publicApiValueReviewExercises,
  ...publicApiEvolutionReviewExercises,
  ...apiReleaseMatrixReviewExercises,
  ...macrosAsApiReviewExercises,
  ...cargoDependencyReviewExercises,
  ...cargoReleaseReviewExercises,
  ...dependencyAssuranceReviewExercises,
  ...miniGrepSearchReviewExercises,
  ...miniGrepSystemReviewExercises,
  ...propertyFoundationReviewExercises,
  ...propertyCounterexampleReviewExercises,
  ...fuzzEvidenceReviewExercises,
  ...performanceEvidenceReviewExercises,
  ...profileEvidenceReviewExercises,
  ...runtimeAllocationEvidenceReviewExercises,
  ...unsafeFfiReviewExercises,
  ...unsafeMiriReviewExercises,
  ...unsafeBorrowedMemoryReviewExercises,
  ...serviceOperationsReviewExercises,
  ...capstoneIntegrationReviewExercises,
  ...serviceClientRetryReviewExercises,
  ...coreConversionsReviewExercises,
  ...coreCheckedConversionsReviewExercises,
  ...nestedPatternReviewExercises,
  ...fallibleCompositionReviewExercises,
  ...documentationRepairReviewExercises,
  ...serviceAuthorizationReviewExercises,
  ...fileSchemaEvolutionReviewExercises,
};
export const delayedReviewExercises = {
  ...functionOwnershipDelayedReviewExercises,
  ...sharedBorrowDelayedReviewExercises,
};
export { shortReviewExercises };
const allReviewSteps = [
  ...Object.values(reviewExercises),
  ...Object.values(delayedReviewExercises),
  ...Object.values(shortReviewExercises),
];
const duplicateReviewIds = allReviewSteps
  .map((step) => step.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateReviewIds.length > 0)
  throw new Error(
    "Duplicate authored review step IDs: " +
      [...new Set(duplicateReviewIds)].join(", "),
  );
export const reviewExercisesById: Record<string, LessonStep> =
  Object.fromEntries(allReviewSteps.map((step) => [step.id, step]));
export function reviewExerciseForId(
  exerciseId: string,
): LessonStep | undefined {
  return Object.prototype.hasOwnProperty.call(reviewExercisesById, exerciseId)
    ? reviewExercisesById[exerciseId]
    : undefined;
}
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
  serviceOperationsProject,
  frameProtocolProject,
  miniGrepProject,
  propertyContractsProject,
  ffiBufferProject,
  miriSafetyProject,
  durableLogServiceProject,
  durableLogRetryProject,
  serviceAuthorizationProject,
  fileSchemaEvolutionProject,
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
  { title: "Pożyczone API: wariancja i HRTB", status: "available" },
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
    title:
      "Cargo: cykl zależności i ograniczony przegląd wydania (publikacja w rejestrze: później)",
    status: "available",
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
    title: "API Release Matrix: stary klient, features i MSRV",
    status: "available",
  },
  {
    title: "Makra deklaratywne jako publiczne API",
    status: "available",
  },
  {
    title: "Mini grep: ograniczone wejście, kontekst i CLI",
    status: "available",
  },
  {
    title: "Property testing: kontrakty, generatory i kontrprzykłady",
    status: "available",
  },
  {
    title:
      "Benchmarki i profilowanie: ograniczone workloady i pomiary alokacji",
    status: "available",
  },
  {
    title: "Unsafe i FFI: kontrakty raw pointerów oraz RAII",
    status: "available",
  },
  {
    title:
      "Service Operations: ograniczony model zagrożeń, telemetria i przegląd incydentu (produkcja: później)",
    status: "available",
  },
  {
    title: "Własny projekt końcowy: Study Session CLI (lokalnie, std-only)",
    status: "available",
  },
  {
    title: "Opcjonalny zaawansowany capstone: trwały serwis logów",
    status: "available",
  },
];
