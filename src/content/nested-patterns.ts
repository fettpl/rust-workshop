import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

const reviewedAt = "2026-10-07";

const readingStarter = `#[derive(Debug, PartialEq)]
enum ReadingState {
    Ready { value: i32 },
    Failed,
}

#[derive(Debug, PartialEq)]
struct Reading {
    label: String,
    state: Option<ReadingState>,
}

fn describe(reading: &Reading) -> &'static str {
    match &reading.state {
        Some(ReadingState::Ready { value }) if *value > 0 => "ready",
        Some(ReadingState::Ready { .. }) => "ready-nonpositive",
        None => "missing",
    }
}`;

const readingSolution = `#[derive(Debug, PartialEq)]
enum ReadingState {
    Ready { value: i32 },
    Failed,
}

#[derive(Debug, PartialEq)]
struct Reading {
    label: String,
    state: Option<ReadingState>,
}

fn describe(reading: &Reading) -> &'static str {
    match &reading.state {
        Some(ReadingState::Ready { value }) if *value > 0 => "ready",
        Some(ReadingState::Ready { .. }) => "ready-nonpositive",
        Some(ReadingState::Failed) => "failed",
        None => "missing",
    }
}`;

const readingTests = `#[test]
fn reading_cases_and_borrow_preservation() {
    let mut cases = vec![
        Reading { label: String::new(), state: None },
        Reading { label: "ASCII".to_owned(), state: Some(ReadingState::Ready { value: 7 }) },
        Reading { label: "zero".to_owned(), state: Some(ReadingState::Ready { value: 0 }) },
        Reading { label: "negative".to_owned(), state: Some(ReadingState::Ready { value: -3 }) },
        Reading { label: "żółć".to_owned(), state: Some(ReadingState::Failed) },
    ];
    let expected = ["missing", "ready", "ready-nonpositive", "ready-nonpositive", "failed"];
    for (reading, expected) in cases.iter_mut().zip(expected) {
        let before = reading.label.clone();
        assert_eq!(describe(reading), expected);
        assert_eq!(describe(reading), expected);
        assert_eq!(reading.label, before);
    }
}`;

const noticeStarter = `#[derive(Debug, PartialEq)]
enum Notice {
    Disabled,
    Ready { detail: Option<Details> },
}

#[derive(Debug, PartialEq)]
struct Details {
    urgent: bool,
    headline: String,
}

fn needs_attention(notice: &Notice) -> bool {
    match notice {
        Notice::Disabled => false,
        Notice::Ready { detail: Some(details) } => {
            details.urgent && !details.headline.is_empty()
        }
        Notice::Ready { detail: None } => false,
    }
}`;

const noticeTests = `#[test]
fn notice_cases_and_borrow_preservation() {
    let mut notices = vec![
        Notice::Disabled,
        Notice::Ready { detail: None },
        Notice::Ready { detail: Some(Details { urgent: false, headline: "ASCII".to_owned() }) },
        Notice::Ready { detail: Some(Details { urgent: true, headline: String::new() }) },
        Notice::Ready { detail: Some(Details { urgent: true, headline: "ASCII".to_owned() }) },
        Notice::Ready { detail: Some(Details { urgent: true, headline: "żółć".to_owned() }) },
    ];
    let expected = [false, false, false, false, true, true];
    for (notice, expected) in notices.iter_mut().zip(expected) {
        let before = format!("{notice:?}");
        assert_eq!(needs_attention(notice), expected);
        assert_eq!(needs_attention(notice), expected);
        assert_eq!(format!("{notice:?}"), before);
    }
}`;

const bannerStarter = `#[derive(Debug, PartialEq)]
enum Banner {
    Off,
    On { message: Option<String> },
}

fn has_message(banner: &Banner) -> bool {
    match banner {
        Banner::Off => false,
        Banner::On { message: Some(_) } => true,
        Banner::On { message: None } => false,
    }
}`;

const bannerTests = `#[test]
fn banner_cases_keep_empty_some_distinct_from_none() {
    let mut banners = vec![
        Banner::Off,
        Banner::On { message: None },
        Banner::On { message: Some(String::new()) },
        Banner::On { message: Some("żółć".to_owned()) },
    ];
    let expected = [false, false, true, true];
    for (banner, expected) in banners.iter_mut().zip(expected) {
        let before = format!("{banner:?}");
        assert_eq!(has_message(banner), expected);
        assert_eq!(has_message(banner), expected);
        assert_eq!(format!("{banner:?}"), before);
    }
}`;

export const nestedPatternSources: Source[] = [
  {
    id: "core-patterns-book",
    title: "The Rust Programming Language: Pattern Syntax",
    url: "https://doc.rust-lang.org/book/ch19-03-pattern-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie składni wzorców, wiązania pól lub przykładów zagnieżdżonego dopasowania.",
  },
  {
    id: "core-patterns-reference",
    title: "Rust Reference: Patterns",
    url: "https://doc.rust-lang.org/reference/patterns.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie reguł wzorców, dopasowania pożyczonych wartości lub match ergonomics.",
  },
];

export const nestedPatternCompetencies: Competency[] = [
  {
    id: "destructure-borrowed-state",
    title:
      "Rozkładaj pożyczony stan na warianty i dane bez odbierania własności.",
  },
];

export const nestedPatternConcepts: Concept[] = [
  {
    id: "nested-pattern-matching",
    title: "Zagnieżdżone wzorce rozdzielają brak, stan i dane",
    prerequisites: ["enum-variants", "exhaustive-match", "optional-values"],
    competencyIds: ["destructure-borrowed-state"],
    reviewPrompt:
      "Jak czytasz wzorzec Some(Ready { value }) i czym różni się on od None?",
    reviewAnswer:
      "Najpierw rozpoznaję zewnętrzny wariant Some, potem wewnętrzny wariant Ready i wiążę jego value; None oznacza brak wartości wewnątrz Option.",
    distinguish:
      "Zewnętrzny Option opisuje obecność albo brak, a wewnętrzny enum opisuje konkretny stan i jego dane.",
    evidenceArtifact: "rust-code",
  },
];

export const nestedPatternLessons: Lesson[] = [
  {
    id: "nested-patterns-and-destructuring",
    moduleId: "data-modeling",
    conceptIds: ["nested-pattern-matching"],
    competencyIds: ["destructure-borrowed-state"],
    prerequisites: ["modeling-assessment"],
    title: "Zagnieżdżone wzorce rozróżniają brak, stan i dane",
    subtitle:
      "Czytaj Option i enum razem, wiąż dane pożyczonego rekordu i zachowaj jego własność.",
    minutes: 20,
    outcomes: [
      "Rozpoznasz zewnętrzny Option i wewnętrzny wariant enumu we wzorcu.",
      "Naprawisz E0004, obsługując brakujący wariant w pożyczonym rekordzie.",
      "Przeniesiesz zagnieżdżone dopasowanie do osobnego modelu bez zmiany własności danych.",
    ],
    misconceptions: [
      "Some(0) oznacza brak — w rzeczywistości niesie obecną wartość równą zero.",
      "Dopasowanie pożyczonego rekordu przenosi jego String — match ergonomics wiąże dane pożyczone.",
      "Obsłużenie Some wystarcza — wewnętrzny enum nadal wymaga pokrycia każdego wariantu.",
    ],
    transferTask:
      "Dla Notice i Details napisz needs_attention, która rozpoznaje zagnieżdżony detal oraz oba warunki jego treści.",
    evidenceGate:
      "Napraw E0004 w Reading, a następnie samodzielnie zaimplementuj odrębny kontrakt Notice z pożyczonym odczytem.",
    sourceIds: ["core-patterns-book", "core-patterns-reference"],
    steps: [
      {
        evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
        id: "nested-predict",
        kind: "predict",
        title: "Przewidź dwa poziomy",
        prompt:
          "Spójrz na cztery wartości `None`, `Some(Ready { value: 0 })`, `Some(Ready { value: -3 })` i `Some(Failed)`. Który przypadek oznacza zewnętrzny brak wartości?",
        choices: [
          { id: "none", label: "None — nie ma wewnętrznego stanu" },
          {
            id: "ready-zero",
            label: "Some(Ready { value: 0 }) — obecny stan z zerem",
          },
          {
            id: "ready-negative",
            label: "Some(Ready { value: -3 }) — obecny stan z liczbą ujemną",
          },
          {
            id: "failed",
            label: "Some(Failed) — obecny stan zakończony błędem",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "none",
          explanations: {
            none: "Poprawnie: None jest zewnętrznym wariantem braku.",
            "ready-zero":
              "Some oznacza obecność, nawet gdy przechowywana liczba to zero.",
            "ready-negative":
              "Some oznacza obecność; ujemna liczba jest danymi wariantu Ready.",
            failed: "Some(Failed) jest obecnym stanem wewnętrznego enumu.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
        id: "nested-run",
        kind: "run",
        title: "Uruchom klasyfikację",
        prompt:
          "Uruchom kod i porównaj `missing`, `ready-nonpositive`, `failed` oraz `ready`. Zwróć uwagę, że zero i liczba ujemna są obecnymi, lecz niegotowymi odczytami.",
        code: `${readingSolution}

fn main() {
    let readings = [
        Reading { label: "none".to_owned(), state: None },
        Reading { label: "zero".to_owned(), state: Some(ReadingState::Ready { value: 0 }) },
        Reading { label: "negative".to_owned(), state: Some(ReadingState::Ready { value: -3 }) },
        Reading { label: "failed".to_owned(), state: Some(ReadingState::Failed) },
        Reading { label: "positive".to_owned(), state: Some(ReadingState::Ready { value: 7 }) },
    ];
    for reading in &readings {
        println!("{}: {}", reading.label, describe(reading));
    }
}`,
        solution: `${readingSolution}

fn main() {
    let readings = [
        Reading { label: "none".to_owned(), state: None },
        Reading { label: "zero".to_owned(), state: Some(ReadingState::Ready { value: 0 }) },
        Reading { label: "negative".to_owned(), state: Some(ReadingState::Ready { value: -3 }) },
        Reading { label: "failed".to_owned(), state: Some(ReadingState::Failed) },
        Reading { label: "positive".to_owned(), state: Some(ReadingState::Ready { value: 7 }) },
    ];
    for reading in &readings {
        println!("{}: {}", reading.label, describe(reading));
    }
}`,
        evaluator: {
          kind: "exact-output",
          expected:
            "none: missing\nzero: ready-nonpositive\nnegative: ready-nonpositive\nfailed: failed\npositive: ready\n",
        },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        evidence: {
          version: 2,
          conceptIds: ["nested-pattern-matching"],
          codingTaskId: "nested-repair",
        },
        id: "nested-repair",
        kind: "debug",
        title: "Napraw brakujący wariant",
        prompt:
          'Uruchom kod i odczytaj E0004. Uzupełnij jawne ramię dla `Some(ReadingState::Failed)`, zwracając `"failed"`. Zachowaj `match &reading.state`: funkcja czyta przez pożyczkę, więc wywołujący nadal ma swój `label`.',
        code: readingStarter,
        solution: readingSolution,
        evaluator: { kind: "tests", tests: readingTests },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0004",
        hints: [
          "Rozdziel zewnętrzne `Some` i `None`, a potem sprawdź wszystkie warianty ReadingState.",
          'Dodaj jawne `Some(ReadingState::Failed) => "failed"`; nie zmieniaj parametru na własność.',
        ],
      },
      {
        evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
        id: "nested-transfer",
        kind: "blank",
        title: "Przenieś wzorzec do Notice",
        prompt:
          "W pustym edytorze zdefiniuj `Notice`, `Details` i `needs_attention(notice: &Notice) -> bool`. Zwróć `true` wyłącznie dla `Ready { detail: Some(details) }`, gdy `urgent` jest prawdziwe, a `headline` nie jest pusty. Obsłuż też `Disabled` i `Ready { detail: None }`.",
        code: "",
        solution: noticeStarter,
        evaluator: { kind: "tests", tests: noticeTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Najpierw dopasuj zewnętrzny wariant Notice, potem Some i pola Details.",
          "Warunek dla danych w Some łączy `details.urgent` z `!details.headline.is_empty()`.",
        ],
      },
      {
        evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
        id: "nested-explain",
        kind: "explain",
        title: "Wyjaśnij pożyczone wiązania",
        prompt:
          "Wyjaśnij, dlaczego `match &reading.state` używa match ergonomics i domyślnych pożyczonych wiązań, dlaczego `Some(Ready { value: 0 })` jest obecne, oraz dlaczego `None` trzeba obsłużyć jako osobny zewnętrzny wariant. Wskaż, dlaczego własny `String` w `Reading` pozostaje użyteczny po wywołaniu `describe`.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Rozróżnia zewnętrzne None od obecnego Some, także dla wartości 0.",
            "Wyjaśnia, że match &reading.state dopasowuje pożyczony scrutinee i wiąże dane w pożyczonym trybie domyślnym.",
            "Łączy parametr &Reading z zachowaniem własnego String po wywołaniu.",
          ],
        },
        rubric: [
          "Rozróżnia zewnętrzne None od obecnego Some, także dla wartości 0.",
          "Wyjaśnia, że match &reading.state dopasowuje pożyczony scrutinee i wiąże dane w pożyczonym trybie domyślnym.",
          "Łączy parametr &Reading z zachowaniem własnego String po wywołaniu.",
        ],
        evidenceKind: "self-rating",
      },
      {
        evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
        id: "nested-recall",
        kind: "recall",
        title: "Przypomnij wzorzec Option",
        prompt:
          "Dla `enum Packet { Lost, Arrived { code: Option<u16> } }` wybierz wzorzec, który rozpoznaje Arrived z obecną wartością kodu.",
        choices: [
          { id: "some", label: "Packet::Arrived { code: Some(value) }" },
          { id: "none", label: "Packet::Arrived { code: None }" },
          { id: "lost", label: "Packet::Lost" },
        ],
        evaluator: {
          kind: "choice",
          correct: "some",
          explanations: {
            some: "Poprawnie: wzorzec schodzi przez Arrived do obecnego Some.",
            none: "None oznacza brak kodu, więc nie pasuje do obecnej wartości.",
            lost: "Lost jest zewnętrznym wariantem bez pola code.",
          },
        },
        evidenceKind: "recall",
      },
    ],
  },
];

export const nestedPatternReviewExercises: Record<string, LessonStep> = {
  "nested-pattern-matching": {
    evidence: { version: 2, conceptIds: ["nested-pattern-matching"] },
    id: "review-nested-pattern-matching",
    kind: "apply",
    title: "Powtórka: rozpoznaj komunikat",
    prompt:
      "Zaimplementuj `has_message(banner: &Banner) -> bool`. Zwróć `true` dla On z Some, także dla pustego String, oraz `false` dla Off i On z None.",
    code: bannerStarter,
    solution: bannerStarter,
    evaluator: { kind: "tests", tests: bannerTests },
    evidenceKind: "transfer",
  },
};
