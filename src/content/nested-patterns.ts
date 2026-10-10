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
    let _ = banner;
    false
}`;

const bannerSolution = `#[derive(Debug, PartialEq)]
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
  {
    id: "core-patterns-if-let",
    title: "The Rust Programming Language: if let and let...else",
    url: "https://doc.rust-lang.org/book/ch06-03-if-let.html",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj po zmianie opisanego kontraktu lub wspieranego toolchaina.",
  },
  {
    id: "core-patterns-loops",
    title: "The Rust Reference: while let Patterns",
    url: "https://doc.rust-lang.org/reference/expressions/loop-expr.html#while-let-patterns",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj po zmianie powtarzanego dopasowania while let lub wspieranego toolchaina.",
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
    sourceIds: [
      "core-patterns-book",
      "core-patterns-reference",
      "core-patterns-if-let",
      "core-patterns-loops",
    ],
    sessionStops: [
      {
        afterStepId: "nested-recall",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Pożycz tekst we wzorcu i sprawdź wczesne wyjście let-else. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "patterns-let-else-repair",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Przewidź while let i przenieś je do odliczania Delivery. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
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
        solution: noticeStarter,
        evaluator: { kind: "tests", tests: noticeTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
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
      {
        // Flat conditional patterns support practice without claiming nested-enum evidence.
        id: "patterns-if-let-predict",
        evidence: { version: 2, conceptIds: [] },
        kind: "predict",
        title: "Pożyczka we wzorcu",
        prompt:
          '`let value = Some(String::from("żółć")); if let Some(text) = &value { println!("{}", text.len()); } println!("{:?}", value);` Czy ostatni odczyt jest dozwolony? if let wybiera pasujący przypadek i pomija inne; w przeciwieństwie do match nie wymaga osobnej gałęzi dla każdego wariantu. Bez &value wzorzec Some(text) przeniósłby String, który nie jest Copy.',
        choices: [
          {
            id: "0",
            label:
              "Tak: text ma typ &String, a właściciel value pozostaje dostępny",
          },
          {
            id: "1",
            label: "Nie: każdy wzorzec Some zawsze przenosi String",
          },
          {
            id: "2",
            label: "Tak: String jest Copy",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "0",
          explanations: {
            "0": "Dopasowujemy pożyczone &value, więc wiązanie text też pożycza.",
            "1": "Rodzaj dopasowywanej wartości wpływa na rodzaj wiązania.",
            "2": "String nie jest Copy; referencja pozwala czytać bez move.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "patterns-borrow-repair",
        evidence: { version: 2, conceptIds: [] },
        kind: "debug",
        title: "Napraw przeniesienie we wzorcu",
        prompt:
          "Napraw `fn text_bytes(value: &Option<String>) -> Option<usize>`, używając if let. Some tekstu daje jego długość w bajtach, także Some(0) dla pustego String; None pozostaje None. Starter próbuje przenieść niekopiowalny String z pożyczonego Option. Zachowaj podpis, aby wywołujący mógł ponownie czytać właściciela.",
        code: `fn text_bytes(value: &Option<String>) -> Option<usize> {
    if let Some(text) = *value { Some(text.len()) } else { None }
}`,
        solution: `fn text_bytes(value: &Option<String>) -> Option<usize> {
    if let Some(text) = value { Some(text.len()) } else { None }
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn borrows_non_copy_text_and_keeps_empty_present() {
    for (text, expected) in [("", 0), ("Rust", 4), ("żółć", 8)] {
        let mut value = Some(String::from(text));
        assert_eq!(text_bytes(&value), Some(expected));
        assert_eq!(text_bytes(&value), Some(expected));
        assert_eq!(value.as_deref(), Some(text));
        value = None;
        assert_eq!(text_bytes(&value), None);
    }
}`,
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0507",
      },
      {
        id: "patterns-let-else-repair",
        evidence: { version: 2, conceptIds: [] },
        kind: "debug",
        title: "Gałąź else musi opuścić bieżący przepływ",
        prompt:
          "`let Some(text) = value else { ... };` udostępnia text po instrukcji tylko dla pasującego wzorca. Gdy wzorzec nie pasuje, else musi się rozejść (diverge), np. przez return; inaczej późniejszy text nie miałby wartości. Napraw else w `fn present_label(value: &Option<String>) -> Option<&str>`. Zwróć pożyczony tekst dla Some, także pusty; dla None zakończ funkcję wynikiem None. To stabilny let-else bez łańcuchów let.",
        code: `fn present_label(value: &Option<String>) -> Option<&str> {
    let Some(text) = value else { None };
    Some(text.as_str())
}`,
        solution: `fn present_label(value: &Option<String>) -> Option<&str> {
    let Some(text) = value else { return None; };
    Some(text.as_str())
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn let_else_keeps_borrow_and_present_empty_text() {
    assert_eq!(present_label(&None), None);
    for text in ["", "Rust", "żółć"] {
        let value = Some(String::from(text));
        assert_eq!(present_label(&value), Some(text));
        assert_eq!(present_label(&value), Some(text));
        assert_eq!(value.as_deref(), Some(text));
    }
}`,
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0308",
      },
      {
        id: "patterns-while-let-predict",
        evidence: { version: 2, conceptIds: [] },
        kind: "predict",
        title: "Zatrzymaj powtarzane dopasowanie",
        prompt:
          '`let mut state = Some(1); while let Some(n) = state { println!("{n}"); state = if n > 0 { Some(n - 1) } else { None }; }` while let powtarza ciało tak długo, jak pasuje wzorzec. Jaki jest wydruk i końcowy state? i32 jest Copy, więc wiązanie n kopiuje liczbę; ciało jawnie zmienia state.',
        choices: [
          {
            id: "0",
            label: "Wydruk 1, potem 0; końcowy state to None",
          },
          {
            id: "1",
            label: "Wydruk tylko 1; Some(0) nie pasuje do Some(n)",
          },
          {
            id: "2",
            label: "Pętla kończy się, ale state pozostaje Some(0)",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "0",
          explanations: {
            "0": "Some(0) nadal pasuje; ciało dla zera ustawia None i następny warunek kończy pętlę.",
            "1": "Wzorzec sprawdza wariant, a zero nadal jest obecne.",
            "2": "Zakończenie wynika z jawnego przypisania None.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "patterns-delivery-transfer",
        evidence: { version: 2, conceptIds: [] },
        kind: "blank",
        title: "Nowa domena: opróżnij odliczanie",
        prompt:
          "Od pustej kartki zdefiniuj `struct Delivery { label: String, remaining: Option<i32> }`, `fn delivery_label(delivery: &Delivery) -> Option<&str>` i `fn drain(delivery: &mut Delivery) -> usize`. delivery_label daje widok label dla każdego Some, także Some(0) lub ujemnego; None daje None. drain powtarza ekstrakcję przez while let: każda obecna liczba liczy się jako jedno przejście, dodatnia zmniejsza się o 1, a zero lub ujemna przechodzi do None. Końcowy stan to None; następne drain zwraca 0. label pozostaje identyczny. Wejście remaining mieści się od i32::MIN do 1000, więc dodatnie odliczanie jest krótkie. Użyj let-else do wczesnego wyjścia z delivery_label. Testy sprawdzają zachowanie kontraktu, nie wymuszają jednej składni rozwiązania.",
        code: "",
        solution: `struct Delivery {
    label: String,
    remaining: Option<i32>,
}

fn delivery_label(delivery: &Delivery) -> Option<&str> {
    let Some(_) = delivery.remaining else { return None; };
    Some(&delivery.label)
}

fn drain(delivery: &mut Delivery) -> usize {
    let mut count = 0;
    while let Some(value) = delivery.remaining {
        count += 1;
        delivery.remaining = if value > 0 { Some(value - 1) } else { None };
    }
    count
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn repeated_extraction_preserves_owner_zero_and_final_state() {
    for (label, initial, expected) in [("", None, 0), ("żółć", Some(0), 1), ("Rust", Some(3), 4), ("ujemny", Some(i32::MIN), 1), ("granica", Some(1000), 1001)] {
        let mut delivery = Delivery { label: String::from(label), remaining: initial };
        assert_eq!(delivery_label(&delivery), initial.map(|_| label));
        assert_eq!(delivery_label(&delivery), initial.map(|_| label));
        assert_eq!(drain(&mut delivery), expected);
        assert_eq!(delivery.remaining, None);
        assert_eq!(delivery_label(&delivery), None);
        assert_eq!(drain(&mut delivery), 0);
        assert_eq!(delivery.label, label);
        delivery.remaining = Some(0);
        assert_eq!(delivery_label(&delivery), Some(label));
        assert_eq!(drain(&mut delivery), 1);
        assert_eq!(delivery.remaining, None);
        assert_eq!(delivery.label, label);
    }
}`,
        },
        evidenceKind: "transfer",
        expectedStatus: "success",
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
    solution: bannerSolution,
    evaluator: { kind: "tests", tests: bannerTests },
    evidenceKind: "transfer",
    expectedStatus: "test-failure",
  },
};
