import type { CourseModule } from "../domain/types";

const skills = [
  [
    "grep-context-selection",
    "Wybierasz dopasowania i kontekst bez powtórzeń ani utraty końcowej linii.",
  ],
  [
    "grep-bounded-input",
    "Ograniczasz odczyt przed nadmierną alokacją i zachowujesz błędy wejścia.",
  ],
  [
    "grep-path-policy",
    "Przetwarzasz ścieżki w jawnej kolejności i respektujesz politykę błędów oraz dowiązań.",
  ],
  [
    "grep-cli-contract",
    "Rozdzielasz poprawny wynik, brak trafień i błąd programu w kontrakcie CLI.",
  ],
] as const;

export const miniGrepModule: CourseModule = {
  id: "mini-grep",
  title: "Mini grep: wyszukaj, ogranicz, wyjaśnij wynik",
  whyItMatters:
    "Program wyszukujący może pokazać trafienie i jednocześnie zgubić błąd innego pliku. Zbudujesz narzędzie, którego wynik ma jasny kontrakt także dla pustych danych, dużych linii i nieudanej operacji.",
  prerequisites: ["log-analyzer"],
  lessonIds: skills.map(([id]) => id),
  capabilities: [
    "Połączysz nakładające się okna kontekstu i zachowasz numery linii.",
    "Przeczytasz tekst porcjami z kontrolą limitu, UTF-8 oraz błędów I/O.",
    "Rozdzielisz wybór ścieżek, wyszukiwanie i prezentację wyniku.",
    "Zaprojektujesz argumenty, stdout, stderr i kody wyjścia programu.",
    "Sprawdzisz gotowy projekt testami biblioteki i osobnego procesu CLI.",
  ],
  exitGate: [
    "Rozwiążesz cztery nowe kontrakty bez podglądania referencji: selekcję, ograniczone wejście, politykę ścieżek i wynik CLI.",
    "W pakiecie projektu sprawdzisz także prawdziwe pliki i proces. Pobranie pakietu ani lista wykonanych poleceń nie są automatycznym dowodem samodzielności.",
  ],
  projectConnection:
    "Cztery lekcje prowadzą do Mini grep: biblioteki i programu terminalowego obsługującego wiele plików, kontekst, limity i błędy. Ćwiczenia jednego pliku uczą kontraktów; system plików i proces są sprawdzane osobno w pakiecie Cargo. Zakładasz pracę z istniejącym Log Analyzerem i jego deterministycznym raportem; możesz od razu rozwinąć ten projekt o wybór kontekstu i bezpieczny odczyt.",
  assessmentId: "grep-cli-contract/grep-cli-contract-blank",
  gateCriteria: skills.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      { lessonId, stepId: `${lessonId}-blank` },
    ],
  })),
};
