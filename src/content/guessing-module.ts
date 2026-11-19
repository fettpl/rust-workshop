import type { CourseModule } from "../domain/types";

const skills = [
  ["guess-input-contract", "Walidujesz polecenie przed zmianą stanu gry."],
  [
    "guess-round-state",
    "Rozliczasz próby i odróżniasz wygraną, przegraną oraz zakończoną rundę.",
  ],
  [
    "guess-session-io",
    "Prowadzisz sesję terminalową, obsługując EOF, limity i błędy I/O.",
  ],
  [
    "guess-random-boundary",
    "Oddzielasz losowanie w grze od deterministycznego testu jej zachowania.",
  ],
] as const;

export const guessingModule: CourseModule = {
  id: "number-guessing-plus",
  title: "Number Guessing+: od komunikatu do pełnej gry",
  prerequisites: ["testing-quality"],
  lessonIds: skills.map(([id]) => id),
  whyItMatters:
    "Porównanie dwóch liczb to dopiero początek gry. Błędne wejście nie powinno zabierać próby, ostatnia poprawna odpowiedź musi wygrywać, a prompt musi dotrzeć do gracza przed odczytem.",
  capabilities: [
    "Rozdzielisz parsowanie tekstu od zmiany stanu rundy.",
    "Zapiszesz reguły końca gry w typach i testach granicznych.",
    "Połączysz bibliotekę z wejściem i wyjściem terminala.",
    "Przetestujesz losową grę bez uzależnienia oczekiwań od konkretnej sekwencji generatora.",
  ],
  exitGate: [
    "Rozwiążesz cztery nowe zadania: parser, stan, sesję I/O i wstrzykiwane źródło wartości.",
    "Pakiet Cargo umożliwi testy prawdziwego procesu. Pobranie archiwum i uruchomienie referencji nie zastępują samodzielnego rozwiązania.",
  ],
  projectConnection:
    "Wracasz do pierwszego projektu o własności i rozwijasz go w Number Guessing+: losowy sekret, ograniczoną rundę, obsługę błędów oraz binarkę i bibliotekę z testami.",
  assessmentId: "guess-random-boundary/guess-random-boundary-blank",
  gateCriteria: skills.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      {
        lessonId,
        stepId:
          lessonId === "guess-round-state"
            ? "guess-round-score-transfer"
            : `${lessonId}-blank`,
      },
    ],
  })),
};
