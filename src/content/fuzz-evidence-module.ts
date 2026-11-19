import type { CourseModule } from "@/domain/types";

const criteria = [
  ["fuzz-input-domain", "Zachowujesz granicę domeny surowych bajtów i bezpiecznie dekodujesz ramkę."],
  ["fuzz-oracle-sensitivity", "Porównujesz pełny uporządkowany wynik z niezależnym oraclem."],
  ["fuzz-counterexample-regression", "Redukujesz świadka bez zmiany klasy awarii i zapisujesz wykonywalną regresję."],
  ["fuzz-campaign-evidence", "Rozróżniasz kampanię, replay, finding i błąd infrastruktury w dossier z pochodzeniem."],
] as const;

export const fuzzEvidenceModule: CourseModule = {
  id: "fuzz-evidence-lifecycle",
  title: "Fuzz evidence: od bajtów do audytowalnej regresji",
  whyItMatters:
    "Fuzzing daje obserwacje z określonej domeny, a nie dowód braku błędów. Przejdziesz od surowych bajtów i niezależnego oracle przez redukcję świadka do rozdzielonego replay oraz kampanii z pochodzeniem.",
  capabilities: criteria.map(([, label]) => label),
  prerequisites: ["property-contracts"],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Rozwiążesz cztery kontrakty bez podglądania referencji: domenę wejścia, czułość oracle, regresję świadka i klasyfikację dossier.",
    "W archiwum Mini grep rozdzielisz stabilny replay od przypiętej nocnej kampanii. Żaden seed, raport ani pobranie rozwiązania nie jest dowodem odkrycia nieznanego błędu.",
  ],
  projectConnection:
    "Istniejący pakiet mini-grep-workshop udostępnia authored harness, niezależny oracle, stałą regresję i ograniczoną kampanię libFuzzer. Ćwiczenia w przeglądarce modelują kontrakty i nie uruchamiają kodu uczącego się.",
  assessmentId: "fuzz-campaign-evidence/fuzz-campaign-evidence-blank",
  gateCriteria: criteria.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      { lessonId, stepId: `${lessonId}-blank` },
      ...(lessonId === "fuzz-oracle-sensitivity"
        ? [{ lessonId, stepId: "fuzz-oracle-batch-mismatches-transfer" }]
        : []),
    ],
  })),
};
