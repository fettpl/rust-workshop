import { sharedCharacterCountRecovery } from "./counted-family-recovery";
import type { Lesson, LessonStep } from "../domain/types";
import {
  delayedSharedCountLinesContract,
  sharedCountWordsContract,
  sharedHasSuffixContract,
} from "./ownership-evidence-contracts";

const sharedBorrowEvidence = {
  version: 2,
  conceptIds: ["shared-borrow"],
};

export const sharedBorrowCalibrationLesson: Lesson = {
  id: "shared-borrow-calibration",
  moduleId: "ownership",
  conceptIds: ["shared-borrow"],
  competencyIds: ["borrow-without-taking", "repair-compiler-feedback"],
  prerequisites: ["function-ownership-calibration"],
  title: "Pożyczony widok tekstu",
  subtitle:
    "Odczytuj tekst przez &str, zachowując własność String po stronie wywołującego.",
  minutes: 18,
  outcomes: [
    "Rozróżniasz String jako właściciela, &String jako pożyczkę i &str jako widok tekstu.",
    "Naprawiasz granicę funkcji, która odczytuje tekst bez przejmowania własności.",
    "Sprawdzasz, że wywołujący może użyć właściciela po jednym i po wielu widokach.",
  ],
  steps: [
    {
      id: "shared-borrow-preview",
      evidence: { ...sharedBorrowEvidence },
      kind: "predict",
      title: "Zobacz pożyczony widok",
      prompt:
        'String jest właścicielem danych. &String pożycza tego właściciela do odczytu, a &str jest read-only widokiem tekstu. Rust może przy wywołaniu zamienić &String na &str: fn is_empty_view(text: &str) -> bool { text.is_empty() }. Po let text = String::from("Rust"); let empty = is_empty_view(&text); println!("{text}: {empty}"); które wiązanie nadal posiada dane?',
      choices: [
        {
          id: "string-keeps-owner",
          label: "text nadal jest właścicielem String",
        },
        {
          id: "view-takes-owner",
          label: "&str przejmuje dane od text",
        },
      ],
      evaluator: {
        kind: "choice",
        correct: "string-keeps-owner",
        explanations: {
          "string-keeps-owner":
            "&String i &str tylko pożyczają odczyt. Przekazanie &text do funkcji oczekującej &str nie przenosi String, więc wywołujący może użyć text później.",
          "view-takes-owner":
            "Widok &str nie przejmuje właściciela. String pozostaje przy text, a funkcja dostaje tylko read-only pożyczkę.",
        },
      },
      evidenceKind: "prediction",
    },
    {
      id: "shared-view-predict",
      evidence: { ...sharedBorrowEvidence },
      kind: "predict",
      title: "Przewidź dwa widoki",
      prompt:
        'Z jednego właściciela String możesz utworzyć dwa jednoczesne widoki &str i przekazać je do read-only helpera z dwoma parametrami. Możesz też przekazać literal "raport.txt" jako drugi widok. Po wywołaniu użyj obu widoków oraz właściciela. Czy takie wspólne czytniki zużywają lub kopiują String?',
      choices: [
        {
          id: "shared-views-preserve-owner",
          label: "Nie; oba widoki tylko czytają i właściciel zostaje ważny",
        },
        {
          id: "shared-view-consumes-owner",
          label: "Tak; drugi widok zużywa właściciela",
        },
      ],
      evaluator: {
        kind: "choice",
        correct: "shared-views-preserve-owner",
        explanations: {
          "shared-views-preserve-owner":
            "Wiele referencji współdzielonych może czytać ten sam String w tym samym czasie. Nie przenoszą własności i nie wymagają kopiowania danych.",
          "shared-view-consumes-owner":
            "&str jest pożyczonym, read-only widokiem. Możesz mieć dwa takie widoki, użyć ich po wywołaniu i nadal korzystać z właściciela String.",
        },
      },
      evidenceKind: "prediction",
    },
    {
      id: "shared-count-words",
      evidence: {
        ...sharedBorrowEvidence,
        codingTaskId: "ownership/shared-count-words-v1",
      },
      kind: "debug",
      title: "Napraw liczenie części tekstu",
      prompt:
        "Napraw granicę `count_words`, zachowując podane ciało `text.split_whitespace().count()`. Funkcja ma przyjmować `&str`, aby kod wywołujący mógł użyć własnego String po wywołaniu. Licz niepuste części rozdzielone białymi znakami: pusty tekst daje 0, a tabulatory, końce linii i wielokrotne odstępy są separatorami. Nie normalizuj tekstu i nie rozwiązuj zadania przez kopiowanie właściciela.",
      code: sharedCountWordsContract.starter,
      solution: sharedCountWordsContract.solution,
      hints: [
        "Porównaj typ argumentu w wywołaniu z typem parametru. `&text` jest widokiem pożyczonego String.",
        "Użyj dokładnie `&str` na granicy funkcji; split_whitespace liczy niepuste części oddzielone białymi znakami.",
      ],
      evaluator: { kind: "tests", tests: sharedCountWordsContract.tests },
      evidenceKind: "fix",
      evidenceGate: true,
      expectedStatus: "compile-error",
      expectedError: "E0308",
    },
    {
      id: "shared-has-suffix",
      evidence: {
        ...sharedBorrowEvidence,
        codingTaskId: "ownership/shared-has-suffix-v1",
      },
      kind: "debug",
      title: "Napraw sprawdzanie końcówki",
      prompt:
        "Napraw granicę `has_suffix`, zachowując operację `text.ends_with(suffix)`. Oba parametry mają być read-only widokami, a kod wywołujący ma użyć `text` i `suffix` po wywołaniu. `ends_with` sprawdza dokładną końcówkę: bez przycinania, zmiany wielkości liter ani normalizacji. Pusty suffix pasuje, końcowy terminator pozostaje częścią reguł tekstu.",
      code: sharedHasSuffixContract.starter,
      solution: sharedHasSuffixContract.solution,
      hints: [
        "E0382 wskazuje, że pierwszy argument został przejęty. Zamień go na pożyczony widok, tak jak drugi argument.",
        "Przekaż `&text` i zachowaj `&suffix`; `ends_with` nie przycina ani nie normalizuje żadnego tekstu.",
      ],
      evaluator: { kind: "tests", tests: sharedHasSuffixContract.tests },
      evidenceKind: "fix",
      evidenceGate: true,
      expectedStatus: "compile-error",
      expectedError: "E0382",
    },
    {
      id: "shared-borrow-explain",
      evidence: { ...sharedBorrowEvidence },
      kind: "explain",
      title: "Wyjaśnij relację właściciela i referencji",
      prompt:
        "Wyjaśnij, dlaczego w obu naprawach parametr `&str` oraz `&` przy wywołaniu pozwalają później użyć oryginalnego String. Opisz, jak dwa jednoczesne widoki czytają jednego właściciela i dlaczego literal też może być widokiem. Powiąż wyjaśnienie z błędami E0308/E0382. Sam wynik tekstowy nie mówi jeszcze, kto posiada wejście.",
      evaluator: {
        kind: "rubric",
        criteria: [
          "Rozróżnia String jako właściciela, &String jako pożyczkę i &str jako read-only widok.",
          "Wyjaśnia, że & przy wywołaniu zachowuje własność po stronie kodu wywołującego.",
          "Opisuje dwa jednoczesne widoki, literal oraz późniejsze użycie właściciela.",
        ],
      },
      evidenceKind: "self-rating",
    },
    sharedCharacterCountRecovery,
  ],
  misconceptions: [
    "Przekazanie &String do funkcji oczekującej &str przenosi właściciela.",
    "Drugi wspólny widok musi skopiować String albo zużyć pierwszy widok.",
    "Sam poprawny wynik tekstowy dowodzi, kto był właścicielem wejścia.",
  ],
  transferTask:
    "Zaprojektuj read-only granicę funkcji dla nowego tekstu i zachowaj użycie String przez kod wywołujący po jednym oraz po dwóch widokach.",
  evidenceGate:
    "Dwie różne naprawy pożyczonego odczytu przechodzą testy z typed caller bez podpowiedzi.",
  sourceIds: [
    "rust-book-ownership",
    "rust-book-borrowing",
    "records-book-slices",
    "records-std-str",
  ],
};

export const delayedReviewExercises: Record<string, LessonStep> = {
  "shared-borrow": {
    id: "review-shared-borrow-delayed-v1",
    evidence: {
      version: 2,
      conceptIds: ["shared-borrow"],
      codingTaskId: "ownership/shared-count-lines-delayed-v1",
    },
    kind: "recall",
    title: "Powtórka: policz linie przez widok",
    prompt:
      "Odtwórz `count_lines(text: &str) -> usize`, zachowując `text.lines().count()`. Kod wywołujący ma użyć `&text`, a potem nadal odczytać String. `lines().count()` liczy linie; pusty tekst daje 0, końcowy terminator nie dodaje pustej linii, a pusta linia wewnątrz tekstu się liczy.",
    code: delayedSharedCountLinesContract.starter,
    solution: delayedSharedCountLinesContract.solution,
    evaluator: {
      kind: "tests",
      tests: delayedSharedCountLinesContract.tests,
    },
    evidenceKind: "recall",
    expectedStatus: "compile-error",
    expectedError: "E0382",
  },
};
