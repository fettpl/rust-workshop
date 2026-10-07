import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const variantsSources: Source[] = [
  {
    id: "variants-rust-book-enums",
    title: "The Rust Programming Language: Enums and Pattern Matching",
    url: "https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie składni enumów, wariantów lub przykładów modelowania.",
  },
  {
    id: "variants-rust-book-match",
    title: "The Rust Programming Language: The match Control Flow Construct",
    url: "https://doc.rust-lang.org/book/ch06-02-match.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie reguł wyczerpującego match lub diagnostyki E0004.",
  },
  {
    id: "variants-option-std",
    title: "Rust standard library: Option",
    url: "https://doc.rust-lang.org/std/option/enum.Option.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego API Option lub wspieranego toolchaina.",
  },
];

export const variantsCompetencies: Competency[] = [
  {
    id: "model-variants",
    title:
      "Modeluj skończony stan enumem, wiąż dane wariantu i odczytuj je przez match.",
  },
  {
    id: "model-absence",
    title:
      "Koduj brak wyniku jako Option<T> i rozróżniaj None od Some, także Some(0).",
  },
  {
    id: "modeling-verification",
    title:
      "Weryfikuj model testami obejmującymi warianty, granice, pustkę i dane użytkownika.",
  },
];

export const variantsConcepts: Concept[] = [
  {
    id: "enum-variants",
    title: "Enum jako nazwana suma wariantów",
    prerequisites: ["struct-records"],
    competencyIds: ["model-variants"],
    reviewPrompt: "Co opisuje wariant enumu, a co opisuje pole struktury?",
    reviewAnswer:
      "Wariant enumu wybiera jeden z możliwych kształtów wartości; pole struktury jest częścią jednego kształtu rekordu.",
    distinguish:
      "Enum odpowiada na pytanie który przypadek, a struct na pytanie jakie pola ma jeden przypadek.",
  },
  {
    id: "exhaustive-match",
    title: "Wyczerpujące dopasowanie match",
    prerequisites: ["enum-variants"],
    competencyIds: ["model-variants", "modeling-verification"],
    reviewPrompt: "Dlaczego match musi mieć ramię dla każdego wariantu?",
    reviewAnswer:
      "Każda możliwa wartość musi mieć obsłużoną gałąź, inaczej kompilator zgłasza E0004.",
    distinguish:
      "Wyczerpanie opisuje pokrycie wszystkich wariantów; kolejność ramion opisuje wybór pierwszego pasującego wzorca.",
  },
  {
    id: "optional-values",
    title: "Option<T> jako obecność albo brak",
    prerequisites: ["exhaustive-match"],
    competencyIds: ["model-absence", "modeling-verification"],
    reviewPrompt: "Co różni None od Some(0) dla typu Option<i32>?",
    reviewAnswer:
      "None nie niesie liczby, a Some(0) niesie obecną liczbę równą zero.",
    distinguish:
      "Brak wartości nie jest tym samym co obecna wartość, która akurat wynosi zero.",
  },
  {
    id: "modeling-transfer",
    title: "Przeniesienie modelu do małego rdzenia zadania",
    prerequisites: ["optional-values", "method-receivers"],
    competencyIds: ["model-variants", "model-absence", "modeling-verification"],
    reviewPrompt:
      "Jak połączyć Task, TaskState i Option<i32>, aby odróżnić stan zadania od braku estymaty?",
    reviewAnswer:
      "Task przechowuje własny tytuł, TaskState opisuje stan, a Option<i32> osobno opisuje obecność estymaty.",
    distinguish:
      "Stan zadania i opcjonalna estymata to dwa niezależne wymiary modelu.",
  },
];

export const variantsLessons: Lesson[] = [
  {
    id: "enums-and-match",
    moduleId: "data-modeling",
    conceptIds: ["enum-variants", "exhaustive-match"],
    competencyIds: ["model-variants", "modeling-verification"],
    prerequisites: ["methods-and-state"],
    title: "Enumy mówią, który przypadek zachodzi",
    subtitle:
      "Zaprojektuj nazwane warianty, odczytaj dane wariantu i pozwól kompilatorowi pilnować kompletności.",
    minutes: 18,
    outcomes: [
      "Zapiszesz enum z wariantem bez danych i wariantem z payloadem.",
      "Użyjesz match do wiązania danych wariantu.",
      "Naprawisz E0004, dodając brakującą gałąź bez zasłaniania błędu wildcardem.",
    ],
    steps: [
      {
        id: "enum-discover",
        kind: "predict",
        title: "Odkryj kształt wariantu",
        prompt:
          "Przeczytaj kod. `=>` oddziela wzorzec od wyniku ramienia, a nazwa `reason` wiąże payload. Który opis najlepiej oddaje różnicę między Ready i Blocked(i32)?",
        code: 'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn main() {\n    let state = State::Blocked(3);\n    match state {\n        State::Ready => println!("ready"),\n        State::Blocked(reason) => println!("blocked {reason}"),\n    }\n}',
        solution:
          'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn main() {\n    let state = State::Blocked(3);\n    match state {\n        State::Ready => println!("ready"),\n        State::Blocked(reason) => println!("blocked {reason}"),\n    }\n}',
        choices: [
          {
            id: "payload",
            label: "Ready nie niesie danych, a Blocked niesie jedno i32",
          },
          {
            id: "fields",
            label: "Oba warianty są polami jednej struktury",
          },
          {
            id: "same",
            label: "Warianty enumu zawsze mają identyczny kształt",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "payload",
          explanations: {
            payload:
              "Poprawnie: nawias przy Blocked deklaruje dane, które match może związać jako reason.",
            fields:
              "Enum wybiera wariant; nie jest to zapis dwóch pól jednego rekordu.",
            same: "Warianty mogą nie mieć danych, mieć dane krotkowe albo pola nazwane.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Zwróć uwagę na `(i32)` przy nazwie wariantu.",
          "Nazwa reason pojawia się po lewej stronie ramienia match.",
        ],
      },
      {
        id: "enum-run",
        kind: "run",
        title: "Uruchom dopasowanie",
        prompt:
          "Uruchom gotowy przykład i zobacz, jak match wybiera ramię dla wariantu z payloadem.",
        code: 'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn main() {\n    let state = State::Blocked(3);\n    match state {\n        State::Ready => println!("ready"),\n        State::Blocked(reason) => println!("blocked {reason}"),\n    }\n}',
        solution:
          'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn main() {\n    let state = State::Blocked(3);\n    match state {\n        State::Ready => println!("ready"),\n        State::Blocked(reason) => println!("blocked {reason}"),\n    }\n}',
        evaluator: { kind: "exact-output", expected: "blocked 3\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "enum-error",
        kind: "debug",
        title: "Napraw brakujące ramię",
        prompt:
          "Uruchom kod. E0004 wskazuje, że jeden wariant State nie ma ramienia. Dodaj jawne ramię `State::Blocked(_reason)` i zwróć dla niego 0; nie używaj wildcarda `_ =>`, zachowaj funkcję label.",
        code: 'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn label(state: State) -> i32 {\n    match state {\n        State::Ready => 1,\n    }\n}\n\nfn main() {\n    println!("{}", label(State::Blocked(4)));\n}',
        solution:
          'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn label(state: State) -> i32 {\n    match state {\n        State::Ready => 1,\n        State::Blocked(_reason) => 0,\n    }\n}\n\nfn main() {\n    println!("{}", label(State::Blocked(4)));\n}',
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn labels_both_variants() {\n    assert_eq!(label(State::Ready), 1);\n    assert_eq!(label(State::Blocked(0)), 0);\n    assert_eq!(label(State::Blocked(9)), 0);\n}",
          forbiddenPatterns: ["_ =>"],
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0004",
        hints: [
          "Odczytaj listę wariantów enumu przed edycją match.",
          "Dodaj jawne State::Blocked(_reason), zamiast ukrywać model przez `_`.",
        ],
      },
      {
        id: "enum-payload",
        kind: "modify",
        title: "Odczytaj dane wariantu",
        prompt:
          "Zmień funkcję priority tak, aby zwracała kod zapisany w Blocked(code), a Ready nadal dawało 1. `code` po lewej stronie `=>` wiąże payload do użycia po prawej. Sprawdzenie obejmuje Blocked(0) i Blocked(7).",
        code: 'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn priority(state: State) -> i32 {\n    match state {\n        State::Ready => 1,\n        State::Blocked(_code) => 0,\n    }\n}\n\nfn main() {\n    println!("{} {}", priority(State::Ready), priority(State::Blocked(7)));\n}',
        solution:
          'enum State {\n    Ready,\n    Blocked(i32),\n}\n\nfn priority(state: State) -> i32 {\n    match state {\n        State::Ready => 1,\n        State::Blocked(code) => code,\n    }\n}\n\nfn main() {\n    println!("{} {}", priority(State::Ready), priority(State::Blocked(7)));\n}',
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn keeps_payload_value() {\n    assert_eq!(priority(State::Ready), 1);\n    assert_eq!(priority(State::Blocked(0)), 0);\n    assert_eq!(priority(State::Blocked(7)), 7);\n}",
        },
        evidenceKind: "transfer",
        expectedStatus: "success",
        hints: [
          "Nie potrzebujesz nowego pola poza payloadem wariantu.",
          "Zastąp `_code` nazwą, której użyjesz po prawej stronie ramienia.",
        ],
      },
      {
        id: "enum-recall",
        kind: "recall",
        title: "Przypomnij kompletność",
        prompt:
          "Który komunikat kompilatora oznacza nieobsłużony wariant match?",
        choices: [
          { id: "e0004", label: "E0004" },
          { id: "e0384", label: "E0384" },
          { id: "e0308", label: "E0308" },
        ],
        evaluator: {
          kind: "choice",
          correct: "e0004",
          explanations: {
            e0004: "E0004 oznacza niekompletne pokrycie możliwych wzorców.",
            e0384:
              "E0384 dotyczy ponownego przypisania do niemutowalnego wiązania.",
            e0308: "E0308 dotyczy niezgodności typów.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "enum-transfer",
        kind: "apply",
        title: "Przenieś model",
        prompt:
          "Dla nowego enumu `Urgency { Low, High(i32) }` wybierz ramię, które wiąże liczbę z High.",
        choices: [
          { id: "bind", label: "`Urgency::High(level) => level`" },
          { id: "ignore", label: "`Urgency::High(_) => 0`" },
          { id: "ready", label: "`Urgency::Low => 1`" },
        ],
        evaluator: {
          kind: "choice",
          correct: "bind",
          explanations: {
            bind: "Nazwane level przejmuje payload do wyrażenia ramienia.",
            ignore: "Wildcard odrzuca payload, więc nie pozwala go odczytać.",
            ready: "To obsługuje Low i nie pasuje do wariantu High(i32).",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Enum jest tylko aliasem dla jednego typu liczbowego.",
      "Wildcard zawsze lepiej ukrywa brakującą gałąź.",
      "Payload wariantu można odczytać bez związania go nazwą.",
    ],
    transferTask:
      "Zaprojektuj enum stanu z jednym wariantem bez danych i jednym z payloadem, a następnie napisz match pokrywający każdy wariant.",
    evidenceGate:
      "Naprawa label przechodzi testy dla obu wariantów, a osobny transfer sprawdza wiązanie payloadu.",
    sourceIds: ["variants-rust-book-enums", "variants-rust-book-match"],
  },
  {
    id: "option-and-absence",
    moduleId: "data-modeling",
    conceptIds: ["optional-values"],
    competencyIds: ["model-absence", "modeling-verification"],
    prerequisites: ["enums-and-match"],
    title: "Option rozdziela brak od zera",
    subtitle:
      "Modeluj opcjonalny wynik i sprawdzaj None, Some(0) oraz zwykłą obecną wartość.",
    minutes: 18,
    outcomes: [
      "Zapiszesz Option<i32> z wariantem None lub Some.",
      "Rozpoznasz, że Some(0) nadal niesie wartość.",
      "Naprawisz niezgodność typu Option<i32> i sprawdzisz obie gałęzie testami.",
    ],
    steps: [
      {
        id: "option-discover",
        kind: "predict",
        title: "Odkryj dwie możliwości",
        prompt:
          "`Option<i32>` oznacza liczbę obecną albo jej brak: `Some(value)` niesie liczbę, a `None` oznacza brak. Jaki tekst wypisze match dla Some(0)?",
        code: 'fn main() {\n    let estimate: Option<i32> = Some(0);\n    match estimate {\n        Some(value) => println!("some {value}"),\n        None => println!("none"),\n    }\n}',
        solution:
          'fn main() {\n    let estimate: Option<i32> = Some(0);\n    match estimate {\n        Some(value) => println!("some {value}"),\n        None => println!("none"),\n    }\n}',
        choices: [
          { id: "some-zero", label: "some 0" },
          { id: "none", label: "none" },
          { id: "panic", label: "Program zawsze panikuje" },
        ],
        evaluator: {
          kind: "choice",
          correct: "some-zero",
          explanations: {
            "some-zero":
              "Some(0) zawiera wartość 0, więc match wiąże value i wypisuje some 0.",
            none: "None oznacza brak wartości; przykład używa Some(0).",
            panic: "Jawny match obsługuje oba warianty bez unwrap.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Odczytaj konstruktor Some przed wejściem do match.",
          "Zero jest liczbą i może być payloadem.",
        ],
      },
      {
        id: "option-run",
        kind: "run",
        title: "Uruchom oba przypadki",
        prompt:
          "Uruchom przykład, który pokazuje obecny estimate 0 oraz brak estimate.",
        code: 'fn label(estimate: Option<i32>) -> i32 {\n    match estimate {\n        Some(value) => value,\n        None => -1,\n    }\n}\n\nfn main() {\n    println!("{} {}", label(Some(0)), label(None));\n}',
        solution:
          'fn label(estimate: Option<i32>) -> i32 {\n    match estimate {\n        Some(value) => value,\n        None => -1,\n    }\n}\n\nfn main() {\n    println!("{} {}", label(Some(0)), label(None));\n}',
        evaluator: { kind: "exact-output", expected: "0 -1\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "option-error",
        kind: "debug",
        title: "Napraw typ Option",
        prompt:
          "Funkcja estimate(enabled: bool) obiecuje Option<i32>, ale dla true zwraca surowe 0. Napraw ją przez właściwe warianty: true ma dać Some(0), a false None. `{:?}` w main to format debug, który potrafi pokazać `Some(0)` i `None`.",
        code: 'fn estimate(enabled: bool) -> Option<i32> {\n    if enabled {\n        0\n    } else {\n        None\n    }\n}\n\nfn main() {\n    println!("{:?} {:?}", estimate(true), estimate(false));\n}',
        solution:
          'fn estimate(enabled: bool) -> Option<i32> {\n    if enabled {\n        Some(0)\n    } else {\n        None\n    }\n}\n\nfn main() {\n    println!("{:?} {:?}", estimate(true), estimate(false));\n}',
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn estimate_distinguishes_zero_and_absence() {\n    assert_eq!(estimate(true), Some(0));\n    assert_eq!(estimate(false), None);\n}",
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Typ zwracany mówi, że wynik musi być Option<i32>.",
          "Owiń zero konstruktorem Some, a w drugiej gałęzi pozostaw None.",
        ],
      },
      {
        id: "option-match",
        kind: "modify",
        title: "Zachowaj brak",
        prompt:
          "Zmień gałąź None w add_bonus tak, aby brak pozostał None. Dla obecnych danych wejściowych od -1000 do i32::MAX - 1, Some(0) ma stać się Some(1), a Some(5) — Some(6); testy nie podają większych wartości.",
        code: 'fn add_bonus(value: Option<i32>) -> Option<i32> {\n    match value {\n        Some(amount) => Some(amount + 1),\n        None => Some(0),\n    }\n}\n\nfn main() {\n    println!("{:?} {:?}", add_bonus(None), add_bonus(Some(0)));\n}',
        solution:
          'fn add_bonus(value: Option<i32>) -> Option<i32> {\n    match value {\n        Some(amount) => Some(amount + 1),\n        None => None,\n    }\n}\n\nfn main() {\n    println!("{:?} {:?}", add_bonus(None), add_bonus(Some(0)));\n}',
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn keeps_absence_and_zero() {\n    for (input, expected) in [(-1000, -999), (-2, -1), (-1, 0), (0, 1), (5, 6), (i32::MAX - 1, i32::MAX)] {\n        assert_eq!(add_bonus(Some(input)), Some(expected));\n    }\n    assert_eq!(add_bonus(None), None);\n}",
        },
        evidenceKind: "transfer",
        expectedStatus: "success",
        hints: [
          "None ma pozostać wariantem braku, bez wymyślania liczby zastępczej.",
          "W ramieniu None zwróć None.",
        ],
      },
      {
        id: "option-recall",
        kind: "recall",
        title: "Rozróżnij None i Some(0)",
        prompt: "Która odpowiedź opisuje Some(0) dla Option<i32>?",
        choices: [
          { id: "present", label: "Wartość istnieje i wynosi 0" },
          { id: "absent", label: "Brak wartości" },
          { id: "type-error", label: "To zawsze błąd typu" },
        ],
        evaluator: {
          kind: "choice",
          correct: "present",
          explanations: {
            present: "Some(0) niesie obecną liczbę zero.",
            absent: "Brak reprezentuje None, nie Some(0).",
            "type-error": "Some(0) pasuje do Option<i32>.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "option-transfer",
        kind: "apply",
        title: "Przenieś opcjonalność",
        prompt:
          "Wybierz bezpieczny kontrakt dla funkcji, która może nie znaleźć estymaty zadania.",
        choices: [
          { id: "option", label: "`fn estimate() -> Option<i32>`" },
          { id: "zero", label: "`fn estimate() -> i32`, gdzie 0 znaczy brak" },
          {
            id: "panic",
            label: "`fn estimate() -> i32`, zawsze panic przy braku",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "option",
          explanations: {
            option:
              "Option rozdziela brak od obecnego zera bez umownej wartości.",
            zero: "Zero jest prawdziwą estymatą, więc nie powinno oznaczać braku.",
            panic:
              "Brak danych jest normalnym przypadkiem modelu, nie musi kończyć programu.",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Some(0) jest tym samym co None.",
      "Option wymaga unwrap, aby dało się go bezpiecznie użyć.",
      "Najłatwiej zastąpić brak specjalną liczbą zero.",
    ],
    transferTask:
      "Zaprojektuj małą funkcję zwracającą Option<i32>, która zachowuje różnicę między brakiem a estymatą zero.",
    evidenceGate:
      "Naprawa Option<i32> przechodzi test obecnego zera, a add_bonus przechodzi niezależne przypadki None, Some(0) i Some(5).",
    sourceIds: ["variants-rust-book-match", "variants-option-std"],
  },
  {
    id: "modeling-assessment",
    moduleId: "data-modeling",
    conceptIds: [
      "enum-variants",
      "exhaustive-match",
      "optional-values",
      "modeling-transfer",
    ],
    competencyIds: ["model-variants", "model-absence", "modeling-verification"],
    prerequisites: ["option-and-absence"],
    title: "Ocena modelowania: rdzeń przyszłego Todo CLI",
    subtitle:
      "Zbuduj mały model danych Task; interfejs wiersza poleceń zostaje poza zakresem.",
    minutes: 20,
    outcomes: [
      "Połączysz owned String, enum stanu i Option<i32> w jednym rekordzie.",
      "Napiszesz metody czytające przez &self i zwracające widok &str.",
      "Sprawdzisz UTF-8, pusty tytuł, None i Some(0) testami.",
    ],
    steps: [
      {
        id: "assessment-plan",
        kind: "assessment",
        title: "Zaplanuj rdzeń danych",
        prompt:
          "Który plan pasuje do rdzenia przyszłego Todo CLI bez budowania całego CLI?",
        choices: [
          {
            id: "task-core",
            label:
              "Task z owned String, TaskState i Option<i32> oraz metodami odczytu",
          },
          {
            id: "cli-now",
            label: "Parser argumentów, pliki i pętla interaktywna od razu",
          },
          {
            id: "sentinel",
            label:
              "i32, gdzie 0 oznacza brak estymaty i napis jest stałą globalną",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "task-core",
          explanations: {
            "task-core":
              "To mały model domeny: własny tytuł, nazwany stan i jawny brak lub obecność estymaty.",
            "cli-now":
              "Interfejs użytkownika wykracza poza oceniany rdzeń modelu.",
            sentinel:
              "Sentinel miesza obecne zero z brakiem, a globalny napis nie modeluje własności Task.",
          },
        },
        evidenceKind: "assessment",
      },
      {
        id: "assessment-recall",
        kind: "predict",
        title: "Odtwórz kontrakt nazw",
        prompt:
          "Wpisz cztery elementy kontraktu w jednej linii, oddzielone przecinkami: typ rekordu, enum stanu, typ opcjonalnej estymaty, odbiornik metody odczytującej tytuł.",
        evaluator: {
          kind: "answer",
          accepted: [
            "Task, TaskState, Option<i32>, &self",
            "Task,TaskState,Option<i32>,&self",
          ],
          feedback:
            "Kontrakt powinien wskazać Task, TaskState, Option<i32> i metodę z &self.",
        },
        evidenceKind: "recall",
      },
      {
        id: "modeling-blank",
        kind: "blank",
        title: "Napisz model Task od zera",
        prompt:
          "Napisz od pustej kartki mały rdzeń przyszłego Todo CLI. Kontrakt nazw i zachowania jest precyzyjny: zdefiniuj enum TaskState z wariantami Open i Done oraz struct Task z polami title typu String, state typu TaskState i estimate typu Option<i32>. Konstruktor Task::new przyjmuje własny String i Option<i32>, a nowy obiekt ma stan Open. Dodaj metodę title, która przez pożyczone self zwraca widok &str, metodę state_label zwracającą dokładnie open albo done oraz metodę estimate zwracającą Option<i32>; Option<i32> jest Copy, więc ten odczyt nie musi przejmować Task. Metoda complete przyjmuje mutowalny obiekt, ustawia stan Done, zachowuje title i estimate oraz jest bezpieczna przy drugim wywołaniu (drugie wywołanie także zostawia Done). Testy obejmują UTF-8 Zażółć, pusty tytuł, None, Some(-3), Some(0), Some(8), zachowanie title i estimate po complete oraz powtórne complete. Nie twórz parsera, plików ani pętli CLI.",
        solution:
          'enum TaskState {\n    Open,\n    Done,\n}\n\nstruct Task {\n    title: String,\n    state: TaskState,\n    estimate: Option<i32>,\n}\n\nimpl Task {\n    fn new(title: String, estimate: Option<i32>) -> Task {\n        Task {\n            title,\n            state: TaskState::Open,\n            estimate,\n        }\n    }\n\n    fn title(&self) -> &str {\n        &self.title\n    }\n\n    fn state_label(&self) -> &str {\n        match &self.state {\n            TaskState::Open => "open",\n            TaskState::Done => "done",\n        }\n    }\n\n    fn estimate(&self) -> Option<i32> {\n        self.estimate\n    }\n\n    fn complete(&mut self) {\n        self.state = TaskState::Done;\n    }\n}',
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn task_preserves_each_title_and_estimate_through_completion() {
    for (title, estimate) in [("", None), ("Zażółć", Some(0)), ("negative", Some(-3)), ("Rust", Some(8))] {
        let mut task = Task::new(String::from(title), estimate);
        let _: &String = &task.title;
        let _: &TaskState = &task.state;
        let _: &Option<i32> = &task.estimate;
        let view: &str = task.title();
        assert_eq!(view, title);
        assert_eq!(task.estimate(), estimate);
        assert_eq!(task.state_label(), "open");
        assert!(matches!(&task.state, TaskState::Open));
        for _ in 0..2 {
            task.complete();
            assert_eq!(task.state_label(), "done");
            assert!(matches!(&task.state, TaskState::Done));
            let view: &str = task.title();
            assert_eq!(view, title);
            assert_eq!(task.estimate(), estimate);
        }
    }
}`,
        },
        evidenceKind: "assessment",
        evidenceGate: true,
      },
      {
        id: "modeling-contract",
        kind: "apply",
        title: "Sprawdź granicę API",
        prompt:
          "Który podpis metody pozwala odczytać tytuł bez przejmowania owned String i bez tworzenia kopii?",
        choices: [
          { id: "borrowed", label: "`fn title(&self) -> &str`" },
          { id: "owned", label: "`fn title(self) -> String`" },
          { id: "clone", label: "`fn title(&self) -> String` przez clone" },
        ],
        evaluator: {
          kind: "choice",
          correct: "borrowed",
          explanations: {
            borrowed:
              "&self zachowuje właściciela, a &str daje widok na tytuł.",
            owned:
              "self przejmuje cały Task, więc nie jest metodą odczytu bez przejęcia.",
            clone:
              "Zwracanie String może wymagać kopii i ukrywa prostszą granicę odczytu.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "modeling-fresh-retrieval",
        kind: "recall",
        title: "Rozdziel dwa wymiary",
        prompt:
          "Wpisz dwa warianty lub typy, które osobno odpowiadają za stan zadania i brak estymaty.",
        evaluator: {
          kind: "answer",
          accepted: ["TaskState i Option<i32>", "TaskState, Option<i32>"],
          feedback:
            "Stan opisuje TaskState, a obecność estymaty opisuje Option<i32>.",
        },
        evidenceKind: "recall",
      },
      {
        id: "modeling-alt",
        kind: "blank",
        title: "Nowy problem: postęp czytania",
        prompt:
          "Rozwiąż nowy problem modelowania. To także niezależny wariant, jeśli w poprzednim zadaniu korzystano z pomocy. Zdefiniuj enum ReadingState z wariantami Reading i Finished oraz struct Reading z polami title typu String, state typu ReadingState i page typu Option<i32>. Konstruktor nazywa się new, przyjmuje własny tytuł i opcjonalną stronę oraz zaczyna w stanie Reading. Dodaj metodę title zwracającą pożyczony widok tytułu, metodę page zwracającą Option<i32>, metodę state_label zwracającą dokładnie reading albo finished oraz metodę finish. finish może ustawić Finished tylko wtedy, gdy page jest obecne, także dla Some(0); przy None ma zostawić Reading. finish zachowuje title i page oraz jest bezpieczne przy kolejnym wywołaniu. Testy obejmują pusty i UTF-8 tytuł, None, Some(0), Some(-2) i Some(12). Napisz rozwiązanie od pustej kartki. Nazwa page oznacza dowolny zapisany identyfikator strony, także ujemny; tutaj badamy obecność wartości, nie walidację numeracji stron.",
        solution:
          'enum ReadingState {\n    Reading,\n    Finished,\n}\n\nstruct Reading {\n    title: String,\n    state: ReadingState,\n    page: Option<i32>,\n}\n\nimpl Reading {\n    fn new(title: String, page: Option<i32>) -> Reading {\n        Reading {\n            title,\n            state: ReadingState::Reading,\n            page,\n        }\n    }\n\n    fn title(&self) -> &str {\n        &self.title\n    }\n\n    fn page(&self) -> Option<i32> {\n        self.page\n    }\n\n    fn state_label(&self) -> &str {\n        match &self.state {\n            ReadingState::Reading => "reading",\n            ReadingState::Finished => "finished",\n        }\n    }\n\n    fn finish(&mut self) {\n        if self.page.is_some() {\n            self.state = ReadingState::Finished;\n        }\n    }\n}',
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn reading_finishes_only_with_a_page_and_preserves_data() {
    for (title, page) in [("", None), ("Zażółć", Some(0)), ("notatki", Some(-2)), ("Rust", Some(12))] {
        let mut reading = Reading::new(String::from(title), page);
        let _: &String = &reading.title;
        let _: &ReadingState = &reading.state;
        let _: &Option<i32> = &reading.page;
        let view: &str = reading.title();
        assert_eq!(view, title);
        assert_eq!(reading.page(), page);
        assert_eq!(reading.state_label(), "reading");
        assert!(matches!(&reading.state, ReadingState::Reading));
        for _ in 0..2 {
            reading.finish();
            let expected = if page.is_some() { "finished" } else { "reading" };
            assert_eq!(reading.state_label(), expected);
            match page {
                Some(_) => assert!(matches!(&reading.state, ReadingState::Finished)),
                None => assert!(matches!(&reading.state, ReadingState::Reading)),
            }
            let view: &str = reading.title();
            assert_eq!(view, title);
            assert_eq!(reading.page(), page);
        }
    }
}`,
        },
        evidenceKind: "transfer",
        evidenceGate: true,
      },
    ],
    misconceptions: [
      "Option<i32> może zastąpić TaskState, bo oba mają warianty.",
      "Metoda odczytu musi zwrócić nowy String, nawet gdy wystarczy &str.",
      "Model rdzenia wymaga parsera i pełnej pętli CLI.",
    ],
    transferTask:
      "Zaprojektuj mały rekord domenowy z enumem stanu i niezależną wartością opcjonalną, a następnie sprawdź go na UTF-8, pustce i obecnym zerze.",
    evidenceGate:
      "Model Task przechodzi testy UTF-8, pustego tytułu, None, Some(0), ujemnej i dodatniej estymaty oraz przejścia Open → Done; niezależny model Reading sprawdza świeżą zmianę stanu zależną od Option.",
    sourceIds: [
      "variants-rust-book-enums",
      "variants-rust-book-match",
      "variants-option-std",
    ],
  },
];

export const variantsReviewExercises: Record<string, LessonStep> = {
  "enum-variants": {
    id: "review-enum-variants",
    kind: "recall",
    title: "Przypomnij wariant",
    prompt: "Co może nieść wariant enumu zapisany jako `Blocked(i32)`?",
    choices: [
      { id: "payload", label: "Jedną wartość i32" },
      { id: "field", label: "Zawsze pole struct" },
      { id: "none", label: "Nigdy żadnej wartości" },
    ],
    evaluator: {
      kind: "choice",
      correct: "payload",
      explanations: {
        payload: "Nawias wariantu deklaruje payload typu i32.",
        field: "To wariant enumu, nie pole struktury.",
        none: "Brak danych ma zapis `Blocked`, bez nawiasu.",
      },
    },
    evidenceKind: "recall",
  },
  "exhaustive-match": {
    id: "review-exhaustive-match",
    kind: "debug",
    title: "Napraw świeży match",
    prompt:
      "Napraw E0004 w funkcji can_enter: Gate::Open ma zwracać true, a Gate::Closed false. Dodaj jawne ramię dla drugiego wariantu i nie używaj wildcarda `_ =>`.",
    code: `enum Gate {
    Open,
    Closed,
}

fn can_enter(gate: Gate) -> bool {
    match gate {
        Gate::Open => true,
    }
}

fn main() {
    println!("{}", can_enter(Gate::Closed));
}`,
    solution: `enum Gate {
    Open,
    Closed,
}

fn can_enter(gate: Gate) -> bool {
    match gate {
        Gate::Open => true,
        Gate::Closed => false,
    }
}

fn main() {
    println!("{}", can_enter(Gate::Closed));
}`,
    evaluator: {
      kind: "tests",
      tests:
        "#[test]\nfn both_gates_are_explicit() {\n    assert!(can_enter(Gate::Open));\n    assert!(!can_enter(Gate::Closed));\n}",
      forbiddenPatterns: ["_ =>"],
    },
    evidenceKind: "fix",
    expectedStatus: "compile-error",
    expectedError: "E0004",
  },
  "optional-values": {
    id: "review-optional-values",
    kind: "recall",
    title: "Przypomnij Option",
    prompt: "Wpisz wariant Option<i32>, który oznacza brak wartości.",
    evaluator: {
      kind: "answer",
      accepted: ["None"],
      feedback: "None oznacza brak, a Some(value) oznacza obecną wartość.",
    },
    evidenceKind: "recall",
  },
  "modeling-transfer": {
    id: "review-modeling-transfer",
    kind: "recall",
    title: "Przypomnij rozdzielenie modelu",
    prompt:
      "Który typ przechowuje osobno stan zadania od opcjonalnej estymaty?",
    choices: [
      { id: "pair", label: "TaskState oraz Option<i32>" },
      { id: "sentinel", label: "Jedno i32 z zerem jako brak" },
      { id: "string", label: "Jeden String z opisem wszystkiego" },
    ],
    evaluator: {
      kind: "choice",
      correct: "pair",
      explanations: {
        pair: "Dwa typy modelują dwa niezależne wymiary danych.",
        sentinel: "Sentinel miesza brak z prawdziwą wartością zero.",
        string: "Jeden opis tekstowy traci strukturę, warianty i testowalność.",
      },
    },
    evidenceKind: "recall",
  },
};
