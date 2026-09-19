import { durableLogServicePackage } from "./durable-log-service/archive";

export const durableLogServiceProject = {
  id: "durable-log-service",
  title: "Projekt: trwały serwis logów",
  objective:
    "Zbuduj loopbackowy serwis ingestujący zdarzenia z idempotentnym receipt, trwałym magazynem i dowodem restartu.",
  requiredBehaviors: [
    "Walidacja domeny odrzuca przekroczenia bajtów i znaki sterujące.",
    "Retry tego samego klucza zwraca pierwotny sequence.",
    "Shutdown dołącza workera i bilansuje przyjęte prace.",
  ],
  requiredEvidence: [
    "Testy publicznego API i protokołu.",
    "Testy transakcji i migracji.",
    "Testy loopback, restartu i procesu.",
  ],
  constraints: [
    "Tylko loopback i bounded zasoby.",
    "Brak unsafe oraz publicznego listenera.",
    "Pobranie paczki nie przyznaje mastery.",
  ],
  lessonId: "capstone-domain-boundary",
  adversarialLessonId: "capstone-release-evidence",
  adversarialInject:
    "Po utracie odpowiedzi klient ponawia to samo żądanie, a raport wydania może dotyczyć innego digestu.",
  retrospective: [
    "Który dowód był niezależny od referencji?",
    "Który wynik pozostał Unknown?",
    "Jakie ograniczenie pozostaje otwarte?",
  ],
  lessonIds: [
    "capstone-domain-boundary",
    "capstone-idempotent-commit",
    "capstone-bounded-lifecycle",
    "capstone-protocol-evolution",
    "capstone-incident-recovery",
    "capstone-release-evidence",
  ],
  reviewConceptIds: [
    "capstone-domain-boundary-contract",
    "capstone-idempotent-commit-contract",
    "capstone-bounded-lifecycle-contract",
    "capstone-protocol-evolution-contract",
    "capstone-incident-recovery-contract",
    "capstone-release-evidence-contract",
  ],
  package: durableLogServicePackage,
};
