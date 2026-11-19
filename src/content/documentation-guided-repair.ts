import { documentationKeyedSettingRecovery } from "./counted-family-recovery";
import type { Concept, Lesson, LessonStep, Source } from "@/domain/types";
import {
  documentationPrefixContract,
  documentationSettingContract,
  documentationRevisionContract,
  prefixTypeError,
  movedOwnerError,
} from "./documentation-guided-repair-contracts";

const conceptId = "documentation-guided-repair";
export const documentationRepairSources: Source[] = [
  {
    id: "docs-str-strip-prefix",
    title: "Rust std: str::strip_prefix",
    url: "https://doc.rust-lang.org/std/primitive.str.html#method.strip_prefix",
    classification: "stable",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź po zmianie opisu pożyczki, jednorazowego usuwania prefiksu lub pustego wyniku; wykonaj kontrakty na dokładnym Rust 1.85.0.",
  },
  {
    id: "docs-str-split-once",
    title: "Rust std: str::split_once",
    url: "https://doc.rust-lang.org/std/primitive.str.html#method.split_once",
    classification: "stable",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź po zmianie pierwszego separatora, pustych pól i zachowania całej reszty; wykonaj kontrakty na dokładnym Rust 1.85.0.",
  },
  {
    id: "docs-str-rsplit-once",
    title: "Rust std: str::rsplit_once",
    url: "https://doc.rust-lang.org/std/primitive.str.html#method.rsplit_once",
    classification: "stable",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź po zmianie powtórki rozdzielającej przy ostatnim separatorze; odróżnij jej kontrakt od split_once.",
  },
  {
    id: "docs-rustc-explain",
    title: "rustc: --explain",
    url: "https://doc.rust-lang.org/rustc/command-line-arguments.html#--explain-provide-a-detailed-explanation-of-an-error-message",
    classification: "versioned",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź przy zmianie lokalnych komend i rzeczywistych świadków E0308/E0382; numer błędu nie zastępuje odczytania typów i miejsca przeniesienia.",
  },
  {
    id: "docs-cargo-doc",
    title: "Cargo: cargo doc",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-doc.html",
    classification: "versioned",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź po zmianie --open, --no-deps i ścieżki lokalnej dokumentacji; checklista nie potwierdza wykonania komend.",
  },
  {
    id: "docs-rustdoc",
    title: "The rustdoc book: generated documentation",
    url: "https://doc.rust-lang.org/rustdoc/what-is-rustdoc.html",
    classification: "stable",
    reviewedAt: "2026-10-13",
    recheckPolicy:
      "Sprawdź przy zmianie opisu komentarzy ///, wygenerowanego HTML lub różnicy między generowaniem dokumentacji a testami dokumentacji.",
  },
];
export const documentationRepairConcepts: Concept[] = [
  {
    id: conceptId,
    title: "Od sygnatury i diagnostyki do małej poprawki z regresją",
    prerequisites: ["testing-quality-workflow"],
    competencyIds: [
      "repair-compiler-feedback",
      "function-contracts",
      "design-regression-cases",
      "run-rust-quality-workflow",
    ],
    evidenceCalibration: { version: 1, minimumCodingTasks: 2 },
    reviewPrompt:
      "Jak z sygnatury pożyczonej metody i błędu rustc wyprowadzisz małą poprawkę, a potem przypadek regresyjny?",
    reviewAnswer:
      "Porównuję odbiorcę, argument i typ wyniku z miejscem wywołania; sprawdzam pożyczkę, brak/pustkę, granice i stabilność. Formułuję hipotezę o niezgodności, zmieniam najmniejszą potrzebną część i uruchamiam test zwykłego oraz granicznego przypadku. Nie mylę błędu kompilacji z paniką albo błędną asercją; odczyt źródła i jakość własnej hipotezy opisuję i oceniam samodzielnie.",
    distinguish:
      "Zielony kontrakt potwierdza wykonane zachowanie, nie dowodzi samodzielnego znalezienia dokumentacji. Kliknięcie źródła, checklista lokalnych komend i tekst uzasadnienia nie tworzą niezależnej rodziny kodu.",
  },
];
function choice(
  id: string,
  kind: "predict" | "explain",
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((text, index) => [String(index), text]),
      ),
    },
    evidenceKind: kind === "predict" ? "prediction" : "exposure",
  };
}
function diagnostic(
  id: string,
  title: string,
  prompt: string,
  code: string,
  error: string,
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    evaluator: { kind: "expected-error", code: error },
    expectedStatus: "compile-error",
    expectedError: error,
    evidenceKind: "exposure",
  };
}
function primary(
  id: string,
  kind: "debug" | "apply" | "blank",
  title: string,
  prompt: string,
  contract: { starter: string; solution: string; tests: string },
  family: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(kind === "blank" ? {} : { code: contract.starter }),
    solution: contract.solution,
    evaluator: { kind: "tests", tests: contract.tests },
    expectedStatus: kind === "debug" ? "compile-error" : "success",
    ...(kind === "debug" ? { expectedError: "E0308" } : {}),
    hints:
      kind === "debug"
        ? [
            "Odbiorca &str zachowuje właściciela; strip_prefix zwraca Option<&str>. Porównaj to z deklaracją wyniku helpera.",
            'Zachowaj Some("") dla dokładnego tag:. Nie używaj unwrap ani domyślnego sukcesu. Wpisz własne asercje wewnątrz #[test], bo test harness nie wykonuje main.',
          ]
        : [
            "split_once zwraca dwie pożyczone części przy pierwszym separatorze; obecność pustego pola jest poprawnym dopasowaniem.",
            "Zachowaj całą prawą część, także dalsze znaki =, białe znaki i Unicode. Brak separatora to None; oba widoki pochodzą z wejściowego właściciela.",
          ],
    evidenceKind:
      kind === "debug" ? "fix" : kind === "blank" ? "assessment" : "transfer",
    evidenceGate: true,
    evidence: { version: 1, conceptIds: [conceptId], codingTaskId: family },
  };
}
const prefixSnapshot = `Migawka API, opracowana na podstawie oficjalnego std 13.10.2026: str::strip_prefix<P>(&self, prefix: P) -> Option<&str>, P: Pattern. W konkretnym wywołaniu text.strip_prefix("tag:") odbiorcą jest pożyczony tekst, argumentem wzorzec &str, a wynikiem Option z pożyczonym podciągiem. Życie wyniku wiąże się z odbiorcą, nie z nową alokacją. Metoda usuwa dopasowany prefiks dokładnie raz; "tag:tag:x" daje Some("tag:x"), "tag:" daje Some(""), brak prefiksu daje None. Sam brak nie powoduje paniki; unwrap na None już może. Nie ma dodatkowego trim ani normalizacji Unicode. Zwykła metoda jest stabilna od Rust 1.45.0. Nie musisz implementować Pattern. Źródło: str::strip_prefix w panelu źródeł; migawka pozostaje czytelna bez sieci.`;
const splitSnapshot = `Migawka std 13.10.2026: str::split_once<P>(&self, delimiter: P) -> Option<(&str, &str)>, P: Pattern; zwykła metoda stabilna od 1.52.0. Dla text.split_once('=') argument char jest wzorcem separatora. Dwa widoki pożyczają odbiorcę. Podział jest przy pierwszym =: "a=b=c" daje Some(("a", "b=c")); "=" daje Some(("", "")); brak = daje None. Dopasowanie i puste pola nie powodują paniki. Żadnego trim ani normalizacji. Alternatywa find + bezpieczne wycinki też może spełnić kontrakt; indeksy bajtowe muszą leżeć na granicach UTF-8. Źródło: str::split_once w panelu; nie potrzebujesz sieci, by wykonać zadanie.`;
const rationaleCriteria = [
  "Podaję metodę i źródło (tytuł lub adres) oraz typy odbiorcy, argumentu i wyniku.",
  "Opisuję własną hipotezę, najmniejszą poprawkę i powód zachowania pożyczki.",
  "Sam sprawdzam obecność i wykonanie własnej zwykłej oraz granicznej asercji w #[test] i oceniam ich jakość; automatyczne zaliczenie parsera tego nie potwierdza.",
  "Odróżniam diagnostykę kompilatora, panikę i błędną asercję oraz wynik programu od dowodu przeczytania dokumentacji.",
];
export const documentationRepairLessons: Lesson[] = (
  [
    {
      id: conceptId,
      moduleId: "testing-quality",
      conceptIds: [conceptId],
      competencyIds: [
        "repair-compiler-feedback",
        "function-contracts",
        "design-regression-cases",
        "run-rust-quality-workflow",
      ],
      prerequisites: ["testing-quality-workflow"],
      title: "Dokumentacja i kompilator: od sygnatury do poprawki",
      subtitle:
        "Przeczytaj pożyczony wynik, sprawdź hipotezę i zabezpiecz granicę testem.",
      minutes: 35,
      outcomes: [
        "Połączysz typ zwracany przez API z rzeczywistym E0308 i miejscem przeniesienia z E0382.",
        "Naprawisz pożyczony parser prefiksu i dodasz wykonywaną asercję regresyjną.",
        "Przeniesiesz odczyt dokumentacji na pierwszy separator bez utraty pustych pól i reszty tekstu.",
      ],
      sessionStops: [
        {
          afterStepId: "docs-signature-decision",
          title: "Opcjonalna przerwa — wróć do tego miejsca",
          nextGoal:
            "Napraw funkcję i dopisz test. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
        },
        {
          afterStepId: "docs-split-transfer",
          title: "Opcjonalna przerwa — wróć do tego miejsca",
          nextGoal:
            "Sprawdź ten sam kontrakt od pustego edytora i zapisz uzasadnienie. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
        },
      ],
      steps: [
        choice(
          "docs-mismatch-predict",
          "predict",
          "Przewidź niezgodność z sygnatury",
          'Helper deklaruje fn remove_tag(text: &str) -> &str, a jego ciało to text.strip_prefix("tag:"). Dokumentacja mówi, że strip_prefix zwraca Option<&str>. Co powinieneś sprawdzić najpierw?',
          [
            "Typ wyniku helpera: Option<&str> nie jest samym &str.",
            "Czy tekst ma dość znaków, bo brak prefiksu zawsze panikuje.",
            "Czy dodać clone, bo każda metoda str zużywa String.",
          ],
          0,
          [
            "Porównujesz dwa konkretne typy i możesz postawić małą hipotezę o deklaracji wyniku.",
            "Brak prefiksu jest None. Ten program nie dochodzi jeszcze do wykonania — najpierw nie zgadzają się typy.",
            "Odbiorca &self pożycza tekst. Klonowanie nie usuwa niezgodności Option<&str> z &str.",
          ],
        ),
        diagnostic(
          "docs-type-observe",
          "Odczytaj rzeczywiste E0308",
          "Uruchom kompilator. Znajdź oczekiwane &str i otrzymane Option<&str> przy wyniku strip_prefix. Ten celowy błąd kompilacji różni się od niezgodnego wyniku asercji: program jeszcze nie działa. Lokalnie rustc --explain E0308 rozwija opis kategorii błędu; zapamiętanie numeru nie naprawia wywołania.",
          prefixTypeError,
          "E0308",
        ),
        diagnostic(
          "docs-owner-observe",
          "Znajdź przeniesienie w E0382",
          "Uruchom osobny przykład. Parametr String przejmuje owner; późniejsze println próbuje użyć przeniesionego właściciela. Znajdź oba miejsca w diagnostyce. Lokalnie rustc --explain E0382 wyjaśnia użycie po przeniesieniu. Przy helperze odczytującym tekst wybierz &str i przekaż &owner; wynik może pożyczać wejście, a właściciel pozostaje dostępny. To inna hipoteza niż zamiana błędnej asercji.",
          movedOwnerError,
          "E0382",
        ),
        choice(
          "docs-signature-decision",
          "explain",
          "Odczytaj brak, pustkę i pożyczkę",
          `${prefixSnapshot}\n\nKtóry publiczny kontrakt zachowa zarówno informację o braku tagu, jak i poprawny pusty wynik, bez przejęcia String?`,
          [
            'fn remove_tag(text: &str) -> Option<&str>; Some("") jest dopasowaniem, None brakiem.',
            "fn remove_tag(text: String) -> String; pusta String może oznaczać każdy przypadek.",
            "fn remove_tag(text: &str) -> &str; unwrap nadaje bezpieczną politykę dla braku.",
          ],
          0,
          [
            "Typ jawnie zachowuje oba przypadki, a pojedynczy pożyczony parametr wiąże życie wyniku z wejściem.",
            "Zużywasz właściciela i zlewasz brak z pustym dopasowaniem, łamiąc ten kontrakt.",
            "unwrap może panikować dla None; nie tworzy brakującej polityki ani informacji w typie.",
          ],
        ),
        primary(
          "docs-prefix-repair",
          "debug",
          "Napraw prefiks i dopisz wykonywany test",
          'Zadanie z ustalonym API: fn remove_tag(text: &str) -> Option<&str> z dokładnym tagiem tag:. Napraw deklarację wyniku, zachowaj pożyczkę oraz String do kolejnego wywołania. Usuń tag dokładnie raz; dokładne tag: daje Some(""), inny prefiks lub pusty tekst None. Zachowaj resztę dosłownie, także Unicode i białe znaki. Możesz zastosować strip_prefix albo poprawny równoważny zapis. Następnie w #[test] fn learner_regression() dopisz własną normalną i graniczną asercję oraz uruchom testy. Musisz sam sprawdzić, że obie asercje są obecne i wykonały się w tym teście; tryb testowy nie wykonuje main. Automatyczne zaliczenie tej pierwotnej rodziny kodu potwierdza wyłącznie kontrakt parsera. Nie sprawdza obecności ani jakości twoich dodatkowych asercji: nawet pusty learner_regression może przejść. Obecność, wykonanie i sens własnych przypadków oceniasz jawnie w ostatnim kroku.',
          documentationPrefixContract,
          "docs/prefix-repair",
        ),
        primary(
          "docs-split-transfer",
          "apply",
          "Nowe API: pierwszy separator ustawienia",
          `${splitSnapshot}\n\nZadanie z ustalonym API: fn split_setting(text: &str) -> Option<(&str, &str)>. Zwróć części przed i po pierwszym =, bez separatora. Zachowaj całe pozostałe pole prawe, puste pola, białe znaki i Unicode. Brak = daje None; pusty tekst też go nie zawiera. Nie zużywaj ani nie zmieniaj właściciela; oba wyniki mają być widokami jego tekstu. Nie wybieraj ostatniego separatora ani tylko następnego tokenu.`,
          documentationSettingContract,
          "docs/first-setting",
        ),
        primary(
          "docs-split-blank",
          "blank",
          "Od pustego edytora: ten sam pierwszy separator",
          `${splitSnapshot}\n\nAlternatywa do poprzedniego zadania, nie trzecia niezależna rodzina ani otwarty projekt. Napisz fn split_setting(text: &str) -> Option<(&str, &str)> oraz fn main() {}. Dziel tylko przy pierwszym =, zachowaj wszystkie dalsze = w prawej części, puste lewe/prawe/oba pola, Unicode i białe znaki bez trim. Brak separatora daje None. Oba widoki pożyczają wejście i pozwalają ponownie użyć niezmienionego String. Poprawne split_once, find/wycinki lub splitn przechodzą ten sam kontrakt.`,
          documentationSettingContract,
          "docs/first-setting",
        ),
        {
          id: "docs-local-documentation",
          kind: "explain",
          title: "Opcjonalnie: dokumentacja w lokalnym projekcie",
          prompt:
            "Poza przeglądarką możesz uruchomić rustc --explain E0308 i rustc --explain E0382. W istniejącym projekcie cargo doc --no-deps buduje dokumentację pakietu bez dokumentacji zależności; cargo doc --open buduje i otwiera wygenerowane strony. Zwykle znajdziesz je w target/doc. Komentarz /// opisuje kolejny element i może zawierać przykład. Budowanie dokumentacji nie jest wykonaniem doc testów: te uruchamia cargo test --doc. Dostępność zależności i lokalnych narzędzi sprawdzasz u siebie; ten opis nie obiecuje ich pobrania offline. Migawki API w lekcji są dostępne bez sieci. Możesz pominąć warsztat. Wybierz poniżej, co potwierdza przejście tego kroku; aplikacja nie wykonuje tych komend.",
          choices: [
            {
              id: "read",
              label:
                "Odczytałem instrukcję; komendy mogę wykonać lokalnie albo pominąć.",
            },
            {
              id: "ran",
              label: "Otwarcie kroku dowodzi lokalnego wykonania cargo doc.",
            },
            {
              id: "tests",
              label: "cargo doc wykonuje także wszystkie doc testy.",
            },
          ],
          evaluator: {
            kind: "choice",
            correct: "read",
            explanations: {
              read: "To sprawdzenie rozróżnia instrukcję od wyniku lokalnej pracy; nie potwierdza wykonania komend.",
              ran: "Otwarcie treści w przeglądarce nie uruchamia lokalnego Cargo ani rustc --explain.",
              tests:
                "cargo doc generuje dokumentację; cargo test --doc jest osobnym wykonaniem przykładów.",
            },
          },
          evidenceKind: "exposure",
        },
        {
          id: "docs-hypothesis-rationale",
          kind: "explain",
          title: "Źródło, hipoteza, poprawka i regresja — samoocena",
          prompt:
            "Wpisz własnymi słowami metodę i źródło (tytuł lub URL), hipotezę wyprowadzoną z sygnatury/diagnostyki, minimalną poprawkę oraz normalny i graniczny przypadek z własnego #[test]. Wyjaśnij, dlaczego naprawa zachowuje właściciela i rozróżnia pustkę od braku. Porównaj hipotezę z uruchomionym wynikiem. Musisz sam sprawdzić obecność i wykonanie obu własnych asercji oraz ocenić ich jakość. To jawna samoocena wypowiedzi i twoich testów; aplikacja wymaga niepustego tekstu i zaznaczenia kryteriów, ale nie sprawdza automatycznie obecności ani jakości własnych asercji, prawdziwości wypowiedzi ani samodzielnego odkrycia źródła. Automatyczny wynik pierwotnej rodziny prefiksu potwierdza wyłącznie kontrakt parsera.",
          evaluator: { kind: "rubric", criteria: rationaleCriteria },
          rubric: rationaleCriteria,
          evidenceKind: "self-rating",
          evidenceGate: false,
        },
        documentationKeyedSettingRecovery,
      ],
      misconceptions: [
        "Zielony test dowodzi, że samodzielnie znalazłem i przeczytałem dokumentację.",
        'Some("") i None można połączyć, bo oba wyglądają na pustkę.',
        "Uruchomienie test harness wykonuje także fn main.",
        "split_once może odrzucić pozostałe separatory w prawym polu.",
      ],
      transferTask:
        "Odczytaj nową sygnaturę split_once i zabezpiecz pierwszy separator, cały pozostały tekst oraz pożyczkę.",
      evidenceGate:
        "Dwie niezależne rodziny kodu (prefiks i ustawienie) plus jawna samoocena źródła/hipotezy/regresji; alias blank nie zwiększa liczby rodzin.",
      sourceIds: [
        "docs-str-strip-prefix",
        "docs-str-split-once",
        "docs-str-rsplit-once",
        "docs-rustc-explain",
        "docs-cargo-doc",
        "docs-rustdoc",
      ],
    },
  ] satisfies Lesson[]
).map((lesson) => ({
  ...lesson,
  steps: lesson.steps.map((step) => ({
    ...step,
    evidence: step.evidence ?? { version: 1, conceptIds: [conceptId] },
  })),
}));
export const documentationRepairReviewExercises: Record<string, LessonStep> = {
  [conceptId]: {
    id: "review-documentation-revision",
    kind: "recall",
    title: "Powtórka: rekord i ostatnia rewizja",
    prompt:
      'Nowa domena i inne API. Migawka std z 13.10.2026: str::rsplit_once<P>(&self, delimiter: P) -> Option<(&str, &str)>, P: Pattern z dodatkowym ograniczeniem ReverseSearcher; użyty char \'@\' spełnia wymagania. Zwykła metoda stabilna od 1.52.0. Zwraca pożyczone części przy OSTATNIM separatorze: record@old@new → Some(("record@old", "new")); brak @ → None, puste pola są poprawne. Metoda nie panikuje z powodu braku dopasowania. Oficjalne źródło: https://doc.rust-lang.org/std/primitive.str.html#method.rsplit_once . Ta migawka działa offline. Napisz fn split_revision(text: &str) -> Option<(&str, &str)> oraz fn main() {}. Zachowaj pełny lewy rekord, puste lewe/prawe/oba pola, Unicode i białe znaki bez trim, oraz wejściowy String do ponownego użycia. Nie kopiuj polityki pierwszego separatora ze split_setting. To powtórka, nie trzecia pierwotna rodzina kodu.',
    code: "",
    solution: documentationRevisionContract.solution,
    hints: [
      "Wybierz ostatnie @; wcześniejsze należą do identyfikatora rekordu.",
      'Brak separatora to None, a samo @ daje Some(("", "")). Obie części nadal pożyczają wejście.',
    ],
    evaluator: { kind: "tests", tests: documentationRevisionContract.tests },
    expectedStatus: "success",
    evidenceKind: "recall",
    evidenceGate: false,
    evidence: {
      version: 1,
      conceptIds: [conceptId],
      codingTaskId: "docs/review-last-revision",
    },
  },
};
