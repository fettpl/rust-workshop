import type { CourseModule } from "../domain/types";

const criteria = [
  [
    "property-invariants",
    "Formułujesz obserwowalną własność i niezależny oracle dla ograniczonej dziedziny.",
  ],
  [
    "property-generated-inputs",
    "Projektujesz generator z jawnym podziałem danych poprawnych i malformed.",
  ],
  [
    "property-shrinking-replay",
    "Redukujesz kontrprzykład, zachowujesz klasę awarii i odtwarzasz go przez stabilny kontrakt.",
  ],
  [
    "property-metamorphic-transfer",
    "Zapisujesz precondition, transformację i pełny wynik relacji metamorfologicznej.",
  ],
] as const;

export const propertyContractsModule: CourseModule = {
  id: "property-contracts",
  title: "Property testing: kontrakty, generatory i kontrprzykłady",
  whyItMatters:
    "Pojedynczy przykład może przejść mimo błędu na granicy danych. Zbudujesz wykonywalne własności, jawnie ograniczone generatory i replay kontrprzykładu, a następnie odróżnisz property testing od fuzzingu.",
  capabilities: criteria.map(([, label]) => label),
  prerequisites: ["mini-grep"],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Rozwiążesz cztery kontrakty bez podglądania referencji: oracle, mieszankę valid/malformed, shrink i relację metamorfologiczną.",
    "W pobieranym pakiecie Cargo uruchomisz przypięty Proptest, replay zapisanej regresji i kontrolowanego mutanta. Zakres dowodu pozostaje ograniczony do zadeklarowanej strategii i oracle.",
  ],
  projectConnection:
    "Projekt łączy kontrakty selekcji Mini grep z podsumowaniem Log Analyzer w prawdziwym pakiecie Cargo. Pakiet używa Proptest wyłącznie jako zależności deweloperskiej; aplikacja udostępnia starter i rozwiązanie, lecz nie uruchamia Cargo ani kodu uczącego się.",
  assessmentId:
    "property-metamorphic-transfer/property-metamorphic-transfer-blank",
  gateCriteria: criteria.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      { lessonId, stepId: `${lessonId}-blank` },
    ],
  })),
};
