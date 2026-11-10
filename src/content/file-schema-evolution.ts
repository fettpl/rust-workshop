// Original Polish learning material: CC BY 4.0. Executable model data: MIT.
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";
import { fileSchemaNormalizationContract as contract } from "./file-schema-evolution-contracts";

const moduleId = "file-schema-evolution";
const normalizeId = "file-schema-normalization";
const upgradeId = "file-schema-explicit-upgrade";
const conceptId = "file-version-meaning";
const competencyId = "file-identity-evolution";
const family = "file-schema-evolution/normalize-v1";
const sourceIds = [
  "io-std-file",
  "io-std-write",
  "io-std-rename",
  "io-std-path",
];
const normalizationEvidence = { version: 2, conceptIds: [conceptId] };
const modelScaffold = "\n\n```rust\n" + contract.promptScaffold + "```";

export const fileSchemaEvolutionSources: Source[] = [];
export const fileSchemaEvolutionCompetencies: Competency[] = [
  {
    id: competencyId,
    title: "Przenosisz tożsamość i historię numeracji między wersjami pliku.",
  },
];
export const fileSchemaEvolutionConcepts: Concept[] = [
  {
    id: conceptId,
    title: "Zachowanie znaczenia podczas zmiany formatu pliku",
    prerequisites: ["io-format-roundtrip", "io-safe-persistence"],
    competencyIds: [competencyId],
    reviewPrompt:
      "Co pozostaje takie samo podczas normalizacji i skąd bierze się następny identyfikator?",
    reviewAnswer:
      "V1 dostaje identyfikatory według pozycji. V2 zachowuje kolejność, identyfikatory i zapisany NEXT, także stan wyczerpania. Status i tytuł pozostają bez zmian.",
    distinguish:
      "Wersja wejścia opisuje pochodzenie danych. Znormalizowana lista ma bieżący model niezależnie od tego, z którego formatu pochodzi.",
    evidenceArtifact: "rust-code",
    evidenceCalibration: { version: 2, minimumCodingTasks: 1 },
  },
];

function coding(
  id: string,
  kind: "apply" | "blank" | "recall",
  title: string,
  prompt: string,
): LessonStep {
  const review = kind === "recall";
  return {
    id,
    kind,
    title,
    prompt,
    code: kind === "apply" ? contract.starter : "",
    solution: contract.canonical,
    expectedStatus: "success",
    evaluator: {
      kind: "tests",
      tests: review ? contract.reviewTests : contract.tests,
    },
    evidenceKind: review ? "recall" : "transfer",
    evidenceGate: !review,
    evidence: { ...normalizationEvidence, codingTaskId: family },
  };
}

function practiceRubric(
  id: string,
  kind: "apply" | "recall" | "assessment",
  title: string,
  prompt: string,
  criteria: string[],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    rubric: criteria,
    evaluator: { kind: "rubric", criteria },
    evidenceKind: "self-rating",
    evidenceGate: false,
  };
}

export const fileSchemaEvolutionLessons: Lesson[] = [
  {
    id: normalizeId,
    moduleId,
    title: "Zachowaj znaczenie danych po zmianie formatu",
    subtitle:
      "Nadaj tożsamość starym rekordom i zachowaj historię numeracji nowych.",
    conceptIds: [conceptId],
    competencyIds: [competencyId],
    prerequisites: [
      "todo-storage-format",
      "todo-file-persistence",
      "todo-terminal-cli",
      "cargo-package-integration",
    ],
    outcomes: [
      "Rozróżniasz wersję wejścia od bieżącego modelu danych.",
      "Zachowujesz kolejność, statusy, tytuły i powtórzone rekordy.",
      "Zachowujesz NEXT i stan wyczerpania dla bieżącego pliku.",
    ],
    misconceptions: [
      "Taki sam tytuł identyfikuje ten sam rekord.",
      "Następny identyfikator wynika z największego widocznego numeru.",
    ],
    transferTask:
      "Porównaj wynik z niezależną tabelą wartości, uwzględniając dwa takie same tytuły i luki w identyfikatorach.",
    evidenceGate:
      "Apply i blank sprawdzają jedną rodzinę normalizacji. Samodzielne zaliczenie jednej wersji wystarczy.",
    sourceIds,
    steps: [
      {
        id: "schema-normalize-predict",
        kind: "predict",
        title: "Przewidź tożsamość rekordów",
        prompt:
          "V1 zawiera wiersze (0, „  plan⇥A  ”), (1, „dup”), (0, „dup”). Znak ⇥ oznacza tabulator. V2 zawiera identyfikatory 9, 2 w tej kolejności oraz NEXT=12. Który wynik zachowuje znaczenie?",
        choices: [
          {
            id: "positions",
            label:
              "V1: 1, 2, 3 i NEXT=4, wszystkie tytuły oraz statusy bez zmian. V2: 9, 2 i NEXT=12.",
          },
          {
            id: "dedup",
            label:
              "V1: jeden rekord „dup” po połączeniu tytułów. V2: sortowanie po identyfikatorze.",
          },
          {
            id: "recount",
            label:
              "V1: identyfikatory od 0. V2: NEXT=10, bo największy widoczny numer to 9.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "positions",
          explanations: {
            positions:
              "Pozycja nadaje V1 pierwszą tożsamość. V2 ma już własną kolejność i historię numeracji.",
            dedup:
              "Dwa wiersze z takim samym tytułem pozostają odrębnymi rekordami.",
            recount:
              "Identyfikatory są dodatnie. NEXT może wskazywać dalej niż największy widoczny numer.",
          },
        },
        evidenceKind: "prediction",
        evidence: normalizationEvidence,
      },
      {
        id: "schema-normalize-model",
        kind: "observe",
        title: "Prześledź wejście i wynik",
        prompt:
          "Zapis na dysku przechodzi walidację przed utworzeniem Decoded. Normalize przyjmuje dopiero tę sprawdzoną wartość i zwraca Loaded.\n\n| Dane wejściowe | Wersja w Loaded | Dane w Todo |\n| --- | --- | --- |\n| V1: dwa wiersze „dup” | V1 | Dwa odrębne rekordy 1 i 2, NEXT=3 |\n| V2: rekordy 9 i 2, NEXT=12 | V2 | Rekordy 9 i 2 w tej kolejności, NEXT=12 |\n| V2: pusta lista, NEXT=- | V2 | Pusta lista i wyczerpana numeracja |",
        evaluator: {
          kind: "answer",
          accepted: ["Prześledzony model"],
          feedback:
            "Loaded pamięta wersję wejścia, a Todo opisuje bieżącą postać danych.",
        },
        evidenceKind: "exposure",
        evidence: normalizationEvidence,
      },
      {
        id: "schema-normalize-debug",
        kind: "debug",
        title: "Znajdź lukę w sprawdzeniu",
        prompt:
          "Po normalizacji V1 sprawdzasz tylko `loaded.version() == Version::V1`. Które dodatkowe sprawdzenie wykryje utratę znaczenia?",
        choices: [
          {
            id: "tuples",
            label:
              "Porównanie z literalnymi krotkami ID, status, tytuł w oczekiwanej kolejności i z oczekiwanym NEXT.",
          },
          {
            id: "version",
            label: "Ponowne sprawdzenie tej samej wersji po wypisaniu listy.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "tuples",
          explanations: {
            tuples:
              "Sprawdzasz tożsamość i historię numeracji niezależnie od znacznika wersji.",
            version:
              "Poprawny znacznik wersji może towarzyszyć przestawionym albo zgubionym rekordom.",
          },
        },
        evidenceKind: "prediction",
        evidence: normalizationEvidence,
      },
      coding(
        "schema-normalize-apply",
        "apply",
        "Zaimplementuj normalizację",
        "Uzupełnij wyłącznie normalize. Dla Legacy przypisz dodatnie ID od 1 według pozycji. Zachowaj kolejność, status i dokładny tytuł, także spacje i tabulatory. NEXT wskazuje kolejny numer albo stan wyczerpania. Sprawdzaj arytmetykę i zwróć TooManyLegacyRecords, jeśli nie można nadać ID kolejnemu wierszowi. Dla Current zachowaj cały Todo. Loaded wskazuje wersję wejścia.",
      ),
      coding(
        "schema-normalize-blank",
        "blank",
        "Odtwórz normalizację od zera",
        "Skopiuj deklaracje do pustego edytora i samodzielnie uzupełnij normalize. Zachowaj pozycje V1, dokładne tytuły i statusy oraz pełną tożsamość i NEXT z V2. To druga postać tego samego zadania." +
          modelScaffold,
      ),
      {
        id: "schema-normalize-recall",
        kind: "recall",
        title: "Wyjaśnij znaczenie NEXT",
        prompt:
          "W V2 zapisano rekordy 9 i 2 oraz NEXT=12. Wyjaśnij, dlaczego usunięcie 9 nie zmienia NEXT i dlaczego dwa identyczne tytuły pozostają dwiema pozycjami.",
        rubric: [
          "NEXT opisuje historię przydzielania numerów.",
          "Identyfikator lub pozycja odróżnia rekordy niezależnie od tytułu.",
        ],
        evaluator: {
          kind: "rubric",
          criteria: [
            "NEXT opisuje historię przydzielania numerów.",
            "Identyfikator lub pozycja odróżnia rekordy niezależnie od tytułu.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
        evidence: normalizationEvidence,
      },
    ],
  },
  {
    id: upgradeId,
    moduleId,
    practiceOnly: true,
    title: "Przeprowadź jawną aktualizację pliku",
    subtitle: "Rozdziel odczyt i przygotowanie od zatwierdzenia zapisu.",
    conceptIds: ["io-safe-persistence", "io-terminal-boundary"],
    competencyIds: ["io-file-persistence", "io-cli-orchestration"],
    prerequisites: [normalizeId],
    outcomes: [
      "Rozpoznajesz etap bez zapisu.",
      "Wskazujesz moment zatwierdzenia.",
      "Porównujesz bajty pliku przed próbą i po niej.",
    ],
    misconceptions: [
      "Wczytanie V1 zapisuje V2.",
      "Każdy błąd po zatwierdzeniu oznacza wycofanie zmiany.",
    ],
    transferTask:
      "W pobranym projekcie porównaj bajty pliku przed jawną aktualizacją i po niej, używając danych przykładowych.",
    evidenceGate: "Ćwiczenie praktyczne bez dodatkowego zadania bramkowego.",
    sourceIds,
    steps: [
      {
        id: "schema-upgrade-predict",
        kind: "predict",
        title: "Przewidź wynik dla przyszłej wersji",
        prompt:
          "Narzędzie obsługuje V1 i V2, a plik ma poprawny nagłówek RUST_TODO_V3. Co robi jawna aktualizacja?",
        choices: [
          {
            id: "refuse",
            label:
              "Zwraca informację o nieobsługiwanej wersji i zachowuje bajty.",
          },
          { id: "guess", label: "Próbuje zapisać plik jako pustą listę V2." },
        ],
        evaluator: {
          kind: "choice",
          correct: "refuse",
          explanations: {
            refuse:
              "Odmowa zachowuje znaczenie danych, których narzędzie jeszcze nie rozumie.",
            guess:
              "Pusta lista utraciłaby wszystkie dane z nieznanego formatu.",
          },
        },
        evidenceKind: "prediction",
        evidenceGate: false,
      },
      {
        id: "schema-upgrade-model",
        kind: "observe",
        title: "Wskaż moment zatwierdzenia",
        prompt:
          "Odczyt i przygotowanie planu nie zapisują pliku. Przed zapisem porównujesz odczytane bajty z planem. Potem tworzysz nowy plik obok celu, zapisujesz, synchronizujesz i zamykasz go. Udane przemianowanie na ścieżkę celu zatwierdza zmianę. Przećwicz tę kolejność dla jednego zapisującego.",
        evaluator: {
          kind: "answer",
          accepted: ["Prześledzony model"],
          feedback:
            "Zapis pliku roboczego przygotowuje zmianę. Udane przemianowanie zastępuje plik docelowy.",
        },
        evidenceKind: "exposure",
        evidenceGate: false,
      },
      {
        id: "schema-upgrade-inspect",
        kind: "debug",
        title: "Sprawdź cały bieżący plik",
        prompt:
          "Nagłówek wskazuje V2, lecz dwa wiersze mają to samo ID. Co powinno się stać przed zgłoszeniem AlreadyCurrent?",
        choices: [
          {
            id: "validate",
            label: "Pełna walidacja i odmowa z powodu duplikatu.",
          },
          {
            id: "header",
            label: "Pominięcie walidacji, ponieważ numer wersji jest bieżący.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "validate",
          explanations: {
            validate:
              "Bieżący numer wersji nie potwierdza poprawności rekordów.",
            header:
              "Już po nagłówku wiadomo, jak czytać dane. Poprawność rekordów wciąż wymaga sprawdzenia.",
          },
        },
        evidenceKind: "prediction",
        evidenceGate: false,
      },
      practiceRubric(
        "schema-upgrade-rehearse",
        "apply",
        "Zbadaj bajty w pobranym projekcie",
        "Rozpakuj projekt w osobnym katalogu. Uruchom tam `cargo generate-lockfile --offline`, a następnie `cargo test --offline --locked`. Zapisz literalne bajty V1 i oczekiwane bajty V2 z przypadku testowego. Porównaj zachowanie przy drugim wywołaniu. To próba w lokalnym Cargo, poza edytorem przeglądarki.",
        [
          "Porównujesz literalne bajty przed i po zatwierdzeniu.",
          "Rozróżniasz aktualizację od potwierdzenia poprawnego V2.",
        ],
      ),
      practiceRubric(
        "schema-upgrade-review",
        "recall",
        "Odtwórz dwa przypadki odmowy",
        "Przygotowano plan dla bajtów A, lecz bieżący plik zawiera B. W osobnym przypadku ścieżka pliku roboczego już istnieje. Co zachowujesz w obu sytuacjach?",
        [
          "Stary plan nie zastępuje pliku o zmienionych bajtach.",
          "Cudzy plik roboczy i oryginał pozostają bez zmian.",
        ],
      ),
      practiceRubric(
        "schema-upgrade-reflect",
        "assessment",
        "Oddziel zapis od raportu",
        "Zakładasz jednego zapisującego. Przemianowanie się udało, a późniejsze wypisanie komunikatu przez program wywołujący zawiodło. Opisz stan pliku i granicę gwarancji przy zaniku zasilania.",
        [
          "Udane przemianowanie już zatwierdziło zmianę.",
          "Samo zsynchronizowanie pliku roboczego nie gwarantuje trwałości wpisu katalogu po zaniku zasilania.",
        ],
      ),
    ],
  },
];

export const fileSchemaEvolutionReviewExercises: Record<string, LessonStep> = {
  [conceptId]: coding(
    "review-file-version-meaning",
    "recall",
    "Powtórka normalizacji",
    "Odtwórz normalize w pustym edytorze, korzystając z deklaracji poniżej. Inne rekordy sprawdzają ten sam kontrakt i tę samą rodzinę." +
      modelScaffold,
  ),
};
export const fileSchemaEvolutionModule: CourseModule = {
  id: moduleId,
  title: "Ewolucja formatu pliku",
  whyItMatters:
    "Zmiana formatu może zachować dane i ich tożsamość, jeśli przeniesiesz także historię numeracji.",
  capabilities: fileSchemaEvolutionCompetencies.map(({ title }) => title),
  prerequisites: ["todo-io"],
  lessonIds: [normalizeId, upgradeId],
  exitGate: [
    "Normalizujesz dane z V1 i V2 bez utraty kolejności, tożsamości i NEXT.",
  ],
  projectConnection:
    "Projekt natywny sprawdza walidację i jawną aktualizację rzeczywistych plików przy jednym zapisującym.",
  assessmentId: "schema-normalize-apply",
  gateCriteria: [
    {
      id: "file-schema-normalization-gate",
      label: "Zachowaj znaczenie danych przy normalizacji",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        { lessonId: normalizeId, stepId: "schema-normalize-apply" },
        { lessonId: normalizeId, stepId: "schema-normalize-blank" },
      ],
    },
  ],
};
