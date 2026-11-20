import { functionOwnedCountRecovery } from "./counted-family-recovery";
import type { Lesson, LessonStep } from "../domain/types";
import {
  addMarkContract,
  frameTextContract,
  isEmptyTextContract,
} from "./ownership-evidence-contracts";

const functionOwnershipEvidence = {
  version: 2,
  conceptIds: ["function-ownership"],
};

export const functionOwnershipCalibrationLesson: Lesson = {
  id: "function-ownership-calibration",
  moduleId: "ownership",
  conceptIds: ["function-ownership"],
  competencyIds: ["design-function-boundary", "repair-compiler-feedback"],
  prerequisites: ["scenario-assessment"],
  title: "Kalibracja granicy funkcji",
  subtitle:
    "Czytaj sygnaturę, przewiduj ruch własności i sprawdzaj zachowanie wywołującego.",
  minutes: 18,
  outcomes: [
    "Rozpoznajesz różnicę między String a &String w sygnaturze funkcji.",
    "Naprawiasz funkcję pożyczającą tekst bez przejmowania własności.",
    "Zwracasz i ponownie wiążesz własność wyniku funkcji.",
  ],
  steps: [
    {
      id: "function-boundary-preview",
      evidence: functionOwnershipEvidence,
      kind: "predict",
      title: "Przeczytaj granicę funkcji",
      prompt:
        "Porównaj sygnatury `fn inspect(text: &String) -> bool` oraz `fn add_mark(text: String) -> String`. Po pierwszej wywołujący nadal może użyć `text`; po drugiej własność przechodzi do funkcji. Co powinien zrobić wywołujący, gdy druga funkcja zwraca String?",
      choices: [
        {
          id: "borrow-keeps-input",
          label: "Pożyczka zostawia text, a wynik własnościowy trzeba przejąć",
        },
        {
          id: "all-calls-consume",
          label: "Każde wywołanie zużywa text bez względu na sygnaturę",
        },
      ],
      evaluator: {
        kind: "choice",
        correct: "borrow-keeps-input",
        explanations: {
          "borrow-keeps-input":
            "&String pozwala odczytać wartość bez przejęcia własności, a String przenosi ją do funkcji i wymaga użycia zwróconej wartości.",
          "all-calls-consume":
            "Typ parametru jest częścią kontraktu: &String pożycza, natomiast String przejmuje własność.",
        },
      },
      evidenceKind: "prediction",
    },
    {
      id: "function-return-predict",
      evidence: { ...functionOwnershipEvidence },
      kind: "predict",
      title: "Przewidź zwróconą własność",
      prompt:
        "W kodzie wywołującego funkcja fn add_mark(text: String) -> String wykonuje let marked = add_mark(text). Co pozostaje poprawnym użyciem po wywołaniu?",
      choices: [
        {
          id: "caller-rebinds-return",
          label: "Wywołujący używa nowej zmiennej marked",
        },
        {
          id: "caller-keeps-original",
          label: "Wywołujący nadal używa starego text",
        },
      ],
      evaluator: {
        kind: "choice",
        correct: "caller-rebinds-return",
        explanations: {
          "caller-rebinds-return":
            "String został przeniesiony do funkcji; po return wywołujący używa zwróconej wartości pod nową nazwą.",
          "caller-keeps-original":
            "Parametr String przejmuje własność, więc stare text nie jest już dostępne; użyj wartości zwróconej.",
        },
      },
      evidenceKind: "prediction",
    },
    {
      id: "function-is-empty-text",
      evidence: {
        ...functionOwnershipEvidence,
        codingTaskId: "ownership/function-predicate-v1",
      },
      kind: "debug",
      title: "Napraw pożyczany predykat",
      prompt:
        "Napraw `is_empty_text`, aby przyjmowała `&String`, zwracała true wyłącznie dla pustego tekstu i nie zużywała wartości wywołującego. Bezpośredni caller oraz testy typowane sprawdzają tę granicę, także dla Unicode.",
      code: isEmptyTextContract.starter,
      solution: isEmptyTextContract.solution,
      hints: [
        "Porównaj typ argumentu w wywołaniu z typem parametru funkcji.",
        "`is_empty()` sprawdza dokładnie pusty String; pożyczka pozwala wywołać funkcję ponownie.",
      ],
      evaluator: { kind: "tests", tests: isEmptyTextContract.tests },
      evidenceKind: "fix",
      evidenceGate: true,
      expectedStatus: "compile-error",
      expectedDiagnostic: "E0308",
    },
    {
      id: "function-add-mark",
      evidence: {
        ...functionOwnershipEvidence,
        codingTaskId: "ownership/function-return-owned-v1",
      },
      kind: "modify",
      title: "Zwróć oznaczony tekst",
      prompt:
        "Uzupełnij `add_mark(text: String) -> String`, aby dodawała dokładnie jeden znak `!` i zwracała własność wyniku. Wywołujący wiąże wynik jako `marked`; testy sprawdzają kolejne wywołania, znaki Unicode i istniejące wykrzykniki.",
      code: addMarkContract.starter,
      solution: addMarkContract.solution,
      hints: [
        "Funkcja posiada wejściowy String, więc może zmienić go przed zwróceniem.",
        "Dodaj jeden ASCII `!` i zwróć ten sam owned String.",
      ],
      evaluator: { kind: "tests", tests: addMarkContract.tests },
      evidenceKind: "transfer",
      evidenceGate: true,
      expectedStatus: "success",
    },
    {
      id: "function-boundary-explain",
      evidence: { ...functionOwnershipEvidence },
      kind: "explain",
      title: "Wyjaśnij ruch własności",
      prompt:
        "Wyjaśnij, czym różnią się trzy granice: `String` przenosi własność do funkcji, `&String` tylko pożycza odczyt, a zwrócony `String` pozwala wywołującemu ponownie związać własność. Odnieś wyjaśnienie do obu naprawionych funkcji.",
      evaluator: {
        kind: "rubric",
        criteria: [
          "Rozróżnia parametr String przejmujący własność od &String pożyczającego odczyt.",
          "Wyjaśnia, dlaczego wynik add_mark musi zostać użyty pod nową nazwą.",
          "Łączy regułę z obserwacją kompilatora lub testów.",
        ],
      },
      evidenceKind: "self-rating",
    },
    functionOwnedCountRecovery,
  ],
  misconceptions: [
    "Każdy parametr String zachowuje wiązanie wywołującego po wywołaniu.",
    "Zwrócenie String przywraca starą nazwę bez ponownego przypisania.",
    "Pożyczka i przejęcie własności mają ten sam skutek dla callera.",
  ],
  transferTask:
    "Zaprojektuj sygnaturę funkcji, która odczytuje String bez przejęcia własności, oraz osobną funkcję, która zwraca nowy owned wynik.",
  evidenceGate:
    "Dwie niezależne funkcje przechodzą testy typed caller; wyjaśnienie nazywa ruch, pożyczkę i zwróconą własność.",
  sourceIds: ["rust-book-functions", "rust-book-ownership"],
};

export const delayedReviewExercises: Record<string, LessonStep> = {
  "function-ownership": {
    id: "review-function-ownership-delayed-v1",
    evidence: {
      version: 2,
      conceptIds: ["function-ownership"],
      codingTaskId: "ownership/function-delayed-recall-v1",
    },
    kind: "recall",
    title: "Powtórka: opraw zwrócony tekst",
    prompt:
      "Odtwórz `frame_text(text: String) -> String`. Funkcja ma zwrócić dokładnie tekst otoczony przez `<` i `>`, a wywołujący ma użyć zwróconego String.",
    code: frameTextContract.starter,
    solution: frameTextContract.solution,
    evaluator: { kind: "tests", tests: frameTextContract.tests },
    evidenceKind: "recall",
    expectedStatus: "success",
  },
};
