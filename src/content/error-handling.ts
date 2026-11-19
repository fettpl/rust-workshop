import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const errorsSources: Source[] = [
  {
    id: "errors-rust-book-overview",
    title: "The Rust Programming Language: Error Handling",
    url: "https://doc.rust-lang.org/book/ch09-00-error-handling.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie rozróżnienia błędów naprawialnych i nieodwracalnych.",
  },
  {
    id: "errors-rust-book-result",
    title: "The Rust Programming Language: Recoverable Errors with Result",
    url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów Result, operatora ? lub propagacji błędów.",
  },
  {
    id: "errors-rust-book-panic",
    title: "The Rust Programming Language: Unrecoverable Errors with panic!",
    url: "https://doc.rust-lang.org/book/ch09-01-unrecoverable-errors-with-panic.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie granic panic, unwrap lub walidacji danych wejściowych.",
  },
  {
    id: "errors-std-result",
    title: "Rust standard library: Result",
    url: "https://doc.rust-lang.org/std/result/enum.Result.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego API Result lub wspieranego toolchaina.",
  },
];

export const errorsCompetencies: Competency[] = [
  {
    id: "result-recovery",
    title:
      "Rozpoznajesz Ok i Err oraz odzyskujesz kontrolę nad naprawialnym błędem przez Result.",
  },
  {
    id: "error-propagation",
    title:
      "Propagujesz Result operatorem ?, zachowując kontekst wielu trybów niepowodzenia.",
  },
  {
    id: "panic-contracts",
    title:
      "Odgradzasz panic od danych wejściowych i projektujesz API pozostawiające decyzję wywołującemu.",
  },
];

export const errorsConcepts: Concept[] = [
  {
    id: "result-recoverable",
    title: "Result<T, E> jako wynik albo opis błędu",
    prerequisites: ["optional-values", "modeling-transfer"],
    competencyIds: ["result-recovery"],
    reviewPrompt: "Co oznaczają warianty Ok i Err w Result<T, E>?",
    reviewAnswer:
      "Ok przechowuje udany wynik typu T, a Err przechowuje informację o niepowodzeniu typu E.",
    distinguish:
      "Result przenosi decyzję o odzyskaniu kontroli do kodu wywołującego; panic kończy bieżące wykonanie programu.",
  },
  {
    id: "explicit-error-conversion",
    title: "Jawna zamiana błędu parsera na błąd domeny",
    prerequisites: ["result-recoverable"],
    competencyIds: ["error-propagation"],
    reviewPrompt:
      "Po co jawnie zamieniać ParseIntError na własny wariant DomainError?",
    reviewAnswer:
      "Własny wariant zachowuje znaczenie domenowe i pozwala funkcji zwrócić jeden przewidywalny typ błędu.",
    distinguish:
      "Konwersja typu błędu opisuje granicę domeny; samo użycie ? propaguje wynik i wymaga zgodnych typów błędów.",
  },
  {
    id: "question-mark-propagation",
    title: "Operator ? jako wczesny powrót Err",
    prerequisites: ["explicit-error-conversion"],
    competencyIds: ["error-propagation"],
    reviewPrompt: "Co robi ? po napotkaniu Err w funkcji zwracającej Result?",
    reviewAnswer:
      "Kończy bieżącą funkcję z tym błędem, a wartość z Ok przepuszcza dalej jako zwykły wynik.",
    distinguish:
      "? nie obsługuje błędu za wywołującego i nie wywołuje automatycznie panic; przekazuje decyzję funkcji wyżej.",
  },
  {
    id: "panic-boundaries",
    title: "Granica panic i kontrakt API",
    prerequisites: ["question-mark-propagation"],
    competencyIds: ["panic-contracts"],
    reviewPrompt:
      "Kiedy wejście użytkownika powinno zwrócić Result zamiast używać unwrap?",
    reviewAnswer:
      "Gdy błąd jest przewidywalny i wywołujący może go pokazać, poprawić albo obsłużyć, należy zwrócić Result.",
    distinguish:
      "Panic pasuje do naruszonego założenia programu; błędny tekst, indeks lub zakres od użytkownika to dane, które API powinno opisać wynikiem.",
  },
];

const parseResultTests = `#[test]
fn parses_success_zero_and_invalid_text() {
    assert_eq!(parse_count("12"), Ok(12));
    assert_eq!(parse_count("0"), Ok(0));
    assert!(parse_count("abc").is_err());
    assert!(parse_count("").is_err());
}`;

const recoverTransferTests = `#[test]
fn recovers_each_input_without_panicking() {
    assert_eq!(read_count("7"), "count 7");
    assert_eq!(read_count("-2"), "count -2");
    assert_eq!(read_count("nope"), "could not read count");
    assert_eq!(read_count(""), "could not read count");
}`;

const domainParseTests = `#[test]
fn preserves_syntax_range_and_i32_boundaries() {
    assert_eq!(parse_value("-100"), Ok(-100));
    assert_eq!(parse_value("-1"), Ok(-1));
    assert_eq!(parse_value("0"), Ok(0));
    assert_eq!(parse_value("99"), Ok(99));
    assert_eq!(parse_value("100"), Ok(100));
    assert_eq!(parse_value("2147483647"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("-2147483648"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("abc"), Err(DomainError::InvalidSyntax));
    assert_eq!(parse_value(""), Err(DomainError::InvalidSyntax));
    assert_eq!(parse_value("101"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("-101"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("2147483648"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("-2147483649"), Err(DomainError::OutOfRange));
    assert_eq!(parse_value("999999999999999999999"), Err(DomainError::OutOfRange));
}`;

const propagationTransferTests = `#[test]
fn keeps_both_failure_modes_and_composes_value() {
    assert_eq!(read_domain("-100"), Ok(-99));
    assert_eq!(read_domain("-1"), Ok(0));
    assert_eq!(read_domain("8"), Ok(9));
    assert_eq!(read_domain("0"), Ok(1));
    assert_eq!(read_domain("100"), Ok(101));
    assert_eq!(read_domain("x"), Err(DomainError::InvalidSyntax));
    assert_eq!(read_domain("1000"), Err(DomainError::OutOfRange));
}`;

const boundaryTests = `#[test]
fn validates_input_at_the_boundary() {
    for value in 0..=100 {
        assert_eq!(percentage(&value.to_string()), Ok(value), "procent {value}");
    }
    assert_eq!(percentage("2147483647"), Err("outside"));
    assert_eq!(percentage("-2147483648"), Err("outside"));
    assert_eq!(percentage("-1"), Err("outside"));
    assert_eq!(percentage("101"), Err("outside"));
    assert_eq!(percentage("2147483648"), Err("outside"));
    assert_eq!(percentage("-2147483649"), Err("outside"));
    assert_eq!(percentage("999999999999999999999"), Err("outside"));
    assert_eq!(percentage("abc"), Err("invalid"));
    assert_eq!(percentage(""), Err("invalid"));
}`;

export const errorsLessons: Lesson[] = [
  {
    id: "result-and-recovery",
    moduleId: "error-handling",
    conceptIds: ["result-recoverable"],
    competencyIds: ["result-recovery"],
    prerequisites: ["hashmap-and-entry"],
    title: "Result: odzyskaj kontrolę nad błędem",
    subtitle:
      "Zobacz Ok i Err, napraw parsowanie oraz wybierz zachowanie dla pustego lub niepoprawnego wejścia.",
    minutes: 18,
    outcomes: [
      "Wyjaśnisz Result<i32, E> jako udany wynik albo błąd.",
      "Rozpoznasz, że parse::<i32>() zwraca Result, a nie gotową liczbę.",
      "Obsłużysz sukces, zero, tekst UTF-8 i pusty tekst bez panic.",
    ],
    steps: [
      {
        id: "result-predict",
        kind: "predict",
        title: "Przewiduj dwa warianty",
        prompt:
          '`parse::<i32>()` próbuje zamienić tekst na i32 i zwraca `Result<i32, ParseIntError>`. Który wynik wypisze ten match dla "42"? `Ok(value)` niesie liczbę, a `Err(error)` opisuje niepowodzenie.',
        code: `fn main() {
    let parsed = "42".parse::<i32>();
    match parsed {
        Ok(value) => println!("ok {value}"),
        Err(_error) => println!("error"),
    }
}`,
        solution: `fn main() {
    let parsed = "42".parse::<i32>();
    match parsed {
        Ok(value) => println!("ok {value}"),
        Err(_error) => println!("error"),
    }
}`,
        choices: [
          { id: "ok", label: "ok 42" },
          { id: "err", label: "error" },
          { id: "panic", label: "Program zawsze panikuje" },
        ],
        evaluator: {
          kind: "choice",
          correct: "ok",
          explanations: {
            ok: "Tekst 42 można sparsować, więc match wiąże liczbę w Ok(value).",
            err: "Err dotyczy tekstu, którego nie da się odczytać jako i32.",
            panic: "Jawny match rozróżnia oba warianty bez unwrap i bez panic.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Najpierw sprawdź, czy tekst wygląda jak liczba całkowita.",
          "Wartość 42 jest payloadem wariantu Ok.",
        ],
      },
      {
        id: "result-run",
        kind: "run",
        title: "Uruchom Ok i Err",
        prompt:
          "Uruchom przykład z jednym poprawnym tekstem i jednym tekstem, którego nie da się sparsować.",
        code: `fn show(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("ok {value}"),
        Err(_error) => String::from("error"),
    }
}

fn main() {
    println!("{} {}", show("0"), show("nie liczba"));
}`,
        solution: `fn show(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("ok {value}"),
        Err(_error) => String::from("error"),
    }
}

fn main() {
    println!("{} {}", show("0"), show("nie liczba"));
}`,
        evaluator: { kind: "exact-output", expected: "ok 0 error\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "result-observe",
        kind: "observe",
        title: "Zauważ kontrakt parse",
        prompt:
          'Wybierz zdanie, które poprawnie opisuje wywołanie `"42".parse::<i32>()`.',
        choices: [
          { id: "result", label: "Zwraca Result z Ok albo Err" },
          { id: "integer", label: "Zawsze zwraca i32, a błąd pomija" },
          { id: "panic", label: "Zawsze kończy program dla pustego tekstu" },
        ],
        evaluator: {
          kind: "choice",
          correct: "result",
          explanations: {
            result: "Parser sygnalizuje oba możliwe wyniki w typie Result.",
            integer:
              "Niepoprawny tekst nie może zostać po cichu zamieniony na i32.",
            panic:
              "Sam parse zwraca Err; panic pojawiłby się dopiero po wybraniu unwrap lub podobnej decyzji.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "result-explain",
        kind: "explain",
        title: "Dobierz reakcję",
        prompt:
          "Dla danych wpisywanych przez użytkownika wybierz właściwą reakcję na Err.",
        choices: [
          { id: "return", label: "Pokaż komunikat lub zwróć błąd wyżej" },
          { id: "unwrap", label: "Zawsze użyj unwrap" },
          { id: "ignore", label: "Zamień każdy błąd na zero bez informacji" },
        ],
        evaluator: {
          kind: "choice",
          correct: "return",
          explanations: {
            return:
              "Błąd wejścia jest przewidywalny, więc wywołujący może zdecydować, co z nim zrobić.",
            unwrap: "unwrap kończy wykonanie panic, gdy dane są niepoprawne.",
            ignore:
              "Ciche zero miesza prawdziwe zero z błędem i gubi kontekst.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "result-debug",
        kind: "debug",
        title: "Napraw typ wyniku",
        prompt:
          "Napraw parse_count. Starter zwraca `Result<i32, ParseIntError>`, choć kontrakt funkcji wymaga `Result<i32, String>`; kompilator zgłasza E0308. Jawnie rozgałęź wynik parsera i zbuduj Err(String).",
        code: `fn parse_count(text: &str) -> Result<i32, String> {
    text.parse::<i32>()
}

fn main() {
    println!("{:?}", parse_count("12"));
}`,
        solution: `fn parse_count(text: &str) -> Result<i32, String> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(String::from("invalid number")),
    }
}

fn main() {
    println!("{:?}", parse_count("12"));
}`,
        evaluator: { kind: "tests", tests: parseResultTests },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Typ ParseIntError nie jest tym samym co String.",
          "W ramieniu Err zbuduj własny komunikat i opakuj go w Err.",
        ],
      },
      {
        id: "result-modify",
        kind: "modify",
        title: "Odzyskaj komunikat",
        prompt:
          "Uzupełnij read_count tak, aby poprawna liczba dawała tekst `count N`, a każda niepoprawna lub pusta wartość tekst `could not read count`. Zachowaj oba przypadki jako bezpieczny wynik funkcji.",
        code: `fn read_count(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("count {value}"),
        Err(_error) => format!("count 0"),
    }
}

fn main() {
    println!("{}", read_count("7"));
}`,
        solution: `fn read_count(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("count {value}"),
        Err(_error) => String::from("could not read count"),
    }
}

fn main() {
    println!("{}", read_count("7"));
}`,
        evaluator: { kind: "tests", tests: recoverTransferTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Nie zmieniaj sukcesu: formatuj wartość z Ok.",
          "W Err zwróć stały komunikat błędu zamiast wartości zastępczej.",
        ],
      },
      {
        id: "result-transfer",
        kind: "apply",
        title: "Przenieś Result do innego wejścia",
        prompt:
          "Wybierz kontrakt funkcji, która odczytuje liczbę stron z tekstu i może dostać pusty lub błędny wpis.",
        choices: [
          { id: "result", label: "`Result<i32, String>`" },
          { id: "sentinel", label: "`i32`, gdzie -1 zawsze oznacza błąd" },
          { id: "panic", label: "`i32` i unwrap dla każdego tekstu" },
        ],
        evaluator: {
          kind: "choice",
          correct: "result",
          explanations: {
            result:
              "Kontrakt zachowuje sukces oraz informację o błędzie dla wywołującego.",
            sentinel:
              "Ustalone -1 może być prawdziwą liczbą i zaciera przyczynę błędu.",
            panic:
              "Dane z zewnątrz nie spełniają bezwarunkowego założenia programu.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "result-recall",
        kind: "recall",
        title: "Przypomnij dwa warianty",
        prompt: "Wpisz dwa warianty Result<T, E>, oddzielając je przecinkiem.",
        evaluator: {
          kind: "answer",
          accepted: ["Ok, Err", "Ok,Err", "Err, Ok", "Err,Ok"],
          feedback: "Ok niesie sukces, a Err opisuje niepowodzenie.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "parse::<i32>() zwraca liczbę niezależnie od tekstu.",
      "Err trzeba natychmiast zamienić na panic.",
      "Zero jest dobrym zamiennikiem każdego błędu.",
    ],
    transferTask:
      "Zaprojektuj funkcję, która czyta tekstowe dane wejściowe i jawnie rozróżnia poprawne zero, inną liczbę oraz błąd.",
    evidenceGate:
      "Naprawiony parse_count oraz niezależny read_count przechodzą testy sukcesu, zera, pustego i błędnego tekstu.",
    sourceIds: [
      "errors-rust-book-overview",
      "errors-rust-book-result",
      "errors-std-result",
    ],
  },
  {
    id: "propagation-and-errors",
    moduleId: "error-handling",
    conceptIds: ["explicit-error-conversion", "question-mark-propagation"],
    competencyIds: ["error-propagation"],
    prerequisites: ["result-and-recovery"],
    title: "Propagowanie: zachowaj kontekst błędu",
    subtitle:
      "Najpierw zobacz problem z ?, potem jawnie zamień błąd parsera i zachowaj osobno składnię oraz zakres.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz, że ? zwraca Err z bieżącej funkcji, zamiast go ukrywać.",
      "Zamienisz błąd parsera na jawny wariant DomainError bez map_err i bez closures.",
      "Zachowasz dwa tryby błędu: InvalidSyntax i OutOfRange.",
    ],
    steps: [
      {
        id: "propagate-predict",
        kind: "predict",
        title: "Przewiduj działanie ?",
        prompt:
          'Helper parse_raw zwraca `Result<i32, String>`. W `double_nonnegative` zapis `let value = parse_raw(text)?;` przekazuje Err wyżej, a po Ok pozwala użyć value. Co wypisze program dla "18"?',
        code: `fn parse_raw(text: &str) -> Result<i32, String> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(String::from("invalid")),
    }
}

fn double_nonnegative(text: &str) -> Result<i32, String> {
    let value = parse_raw(text)?;
    if value >= 0 {
        Ok(value * 2)
    } else {
        Err(String::from("negative"))
    }
}

fn main() {
    match double_nonnegative("18") {
        Ok(value) => println!("ok {value}"),
        Err(error) => println!("error {error}"),
    }
}`,
        solution: `fn parse_raw(text: &str) -> Result<i32, String> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(String::from("invalid")),
    }
}

fn double_nonnegative(text: &str) -> Result<i32, String> {
    let value = parse_raw(text)?;
    if value >= 0 {
        Ok(value * 2)
    } else {
        Err(String::from("negative"))
    }
}

fn main() {
    match double_nonnegative("18") {
        Ok(value) => println!("ok {value}"),
        Err(error) => println!("error {error}"),
    }
}`,
        choices: [
          { id: "ok", label: "ok 36" },
          { id: "error", label: "error invalid" },
          { id: "panic", label: "Program się zatrzyma" },
        ],
        evaluator: {
          kind: "choice",
          correct: "ok",
          explanations: {
            ok: "Poprawny tekst przechodzi przez parse_raw, a potem value jest użyte do obliczenia 18 * 2.",
            error: "Err pojawiłby się dla tekstu niebędącego liczbą.",
            panic: "Jawna obsługa Err nie wymusza panic.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "propagate-run",
        kind: "run",
        title: "Uruchom propagację",
        prompt:
          "Uruchom kompozycję dwóch funkcji: helper zwraca Result, a funkcja wyżej używa `let value = parse_raw(text)?;` i sprawdza wartość po propagacji.",
        code: `fn parse_raw(text: &str) -> Result<i32, String> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(String::from("invalid")),
    }
}

fn positive_plus_one(text: &str) -> Result<i32, String> {
    let value = parse_raw(text)?;
    if value >= 0 {
        Ok(value + 1)
    } else {
        Err(String::from("negative"))
    }
}

fn main() {
    println!("{:?} {:?}", positive_plus_one("0"), positive_plus_one("-1"));
}`,
        solution: `fn parse_raw(text: &str) -> Result<i32, String> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(String::from("invalid")),
    }
}

fn positive_plus_one(text: &str) -> Result<i32, String> {
    let value = parse_raw(text)?;
    if value >= 0 {
        Ok(value + 1)
    } else {
        Err(String::from("negative"))
    }
}

fn main() {
    println!("{:?} {:?}", positive_plus_one("0"), positive_plus_one("-1"));
}`,
        evaluator: {
          kind: "exact-output",
          expected: 'Ok(1) Err("negative")\n',
        },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "propagate-observe",
        kind: "observe",
        title: "Zobacz brak zgodności typów",
        prompt:
          "Dlaczego samo `text.parse::<i32>()?` nie może działać w funkcji zwracającej `Result<i32, DomainError>`, gdy parser zwraca `ParseIntError`?",
        choices: [
          { id: "convert", label: "Trzeba jawnie zamienić typ błędu" },
          { id: "ignore", label: "? ignoruje różnicę typów błędów" },
          { id: "panic", label: "? zawsze wywołuje panic" },
        ],
        evaluator: {
          kind: "choice",
          correct: "convert",
          explanations: {
            convert:
              "? może propagować tylko błąd zgodny z kontraktem funkcji, więc granica wymaga konwersji.",
            ignore: "Kompilator nie pomija niezgodności typów.",
            panic: "? przekazuje Err, a nie wywołuje panic.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "propagate-explain",
        kind: "explain",
        title: "Rozdziel dwa powody błędu",
        prompt:
          "Wybierz model, który zachowuje zarówno informację o niepoprawnej składni, jak i o liczbie poza zakresem -100..100.",
        choices: [
          { id: "domain", label: "DomainError::InvalidSyntax oraz OutOfRange" },
          { id: "one", label: "Jeden Err bez informacji o przyczynie" },
          { id: "panic", label: "Panic dla obu przewidywalnych przypadków" },
        ],
        evaluator: {
          kind: "choice",
          correct: "domain",
          explanations: {
            domain:
              "Dwa jawne warianty pozwalają wywołującemu dobrać reakcję do przyczyny.",
            one: "Zgubienie przyczyny utrudnia komunikat i testowanie.",
            panic:
              "Niepoprawne dane wejściowe są obsługiwalnym wynikiem domeny.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "propagate-debug",
        kind: "debug",
        title: "Napraw pierwszy ?",
        prompt:
          "Funkcja ma zwracać DomainError. #[derive(Debug, PartialEq)] generuje diagnostyczny wydruk i porównywanie tego enumu dla testów. Napraw E0277: helper parse_text ma przez error.kind() odczytać przyczynę ParseIntError. Import use std::num::IntErrorKind wprowadza nazwy przyczyn. Wzorzec A | B obsługuje jeden lub drugi wariant w tym samym ramieniu: PosOverflow i NegOverflow dają OutOfRange, pozostałe przyczyny dają InvalidSyntax. Następnie w parse_value użyj let value = parse_text(text)? i sprawdź zakres domknięty od -100 do 100. Klasyfikujemy przyczynę zgłoszoną przez parser, bez osobnego skanera składni.",
        code: `#[derive(Debug, PartialEq)]
enum DomainError {
    InvalidSyntax,
    OutOfRange,
}

fn parse_value(text: &str) -> Result<i32, DomainError> {
    let value = text.parse::<i32>()?;
    if value < -100 || value > 100 {
        Err(DomainError::OutOfRange)
    } else {
        Ok(value)
    }
}

fn main() {
    println!("{:?}", parse_value("0"));
}`,
        solution: `#[derive(Debug, PartialEq)]
enum DomainError {
    InvalidSyntax,
    OutOfRange,
}

fn parse_text(text: &str) -> Result<i32, DomainError> {
    use std::num::IntErrorKind;
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(error) => match error.kind() {
            IntErrorKind::PosOverflow | IntErrorKind::NegOverflow => {
                Err(DomainError::OutOfRange)
            }
            _ => Err(DomainError::InvalidSyntax),
        },
    }
}

fn parse_value(text: &str) -> Result<i32, DomainError> {
    let value = parse_text(text)?;
    if value < -100 || value > 100 {
        Err(DomainError::OutOfRange)
    } else {
        Ok(value)
    }
}

fn main() {
    println!("{:?}", parse_value("0"));
}`,
        evaluator: { kind: "tests", tests: domainParseTests },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0277",
        hints: [
          "? nie zamienia automatycznie ParseIntError w każdy własny typ.",
          "Sprawdź kind() dla overflow, zbuduj parse_text, a potem użyj `parse_text(text)?`.",
        ],
      },
      {
        id: "propagate-modify",
        kind: "modify",
        title: "Nie gub propagowanego błędu",
        prompt:
          "Zmień read_domain tak, aby wykonała `let value = parse_value(text)?;` i zwróciła `Ok(value + 1)` dla poprawnego tekstu. InvalidSyntax i OutOfRange mają przejść wyżej bez zamiany na Ok(0).",
        code: `#[derive(Debug, PartialEq)]
enum DomainError {
    InvalidSyntax,
    OutOfRange,
}

fn parse_text(text: &str) -> Result<i32, DomainError> {
    use std::num::IntErrorKind;
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(error) => match error.kind() {
            IntErrorKind::PosOverflow | IntErrorKind::NegOverflow => {
                Err(DomainError::OutOfRange)
            }
            _ => Err(DomainError::InvalidSyntax),
        },
    }
}

fn parse_value(text: &str) -> Result<i32, DomainError> {
    let value = match parse_text(text) {
        Ok(value) => value,
        Err(error) => return Err(error),
    };
    if value < -100 || value > 100 {
        Err(DomainError::OutOfRange)
    } else {
        Ok(value)
    }
}

fn read_domain(text: &str) -> Result<i32, DomainError> {
    match parse_value(text) {
        Ok(value) => Ok(value),
        Err(_error) => Ok(0),
    }
}

fn main() {
    println!("{:?}", read_domain("101"));
}`,
        solution: `#[derive(Debug, PartialEq)]
enum DomainError {
    InvalidSyntax,
    OutOfRange,
}

fn parse_text(text: &str) -> Result<i32, DomainError> {
    use std::num::IntErrorKind;
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(error) => match error.kind() {
            IntErrorKind::PosOverflow | IntErrorKind::NegOverflow => {
                Err(DomainError::OutOfRange)
            }
            _ => Err(DomainError::InvalidSyntax),
        },
    }
}

fn parse_value(text: &str) -> Result<i32, DomainError> {
    let value = parse_text(text)?;
    if value < -100 || value > 100 {
        Err(DomainError::OutOfRange)
    } else {
        Ok(value)
    }
}

fn read_domain(text: &str) -> Result<i32, DomainError> {
    let value = parse_value(text)?;
    Ok(value + 1)
}

fn main() {
    println!("{:?}", read_domain("101"));
}`,
        evaluator: { kind: "tests", tests: propagationTransferTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Funkcja wyżej nie zna bezpiecznego zamiennika dla obu błędów.",
          "Po `let value = parse_value(text)?;` możesz wykonać dalsze obliczenie na value.",
        ],
      },
      {
        id: "propagate-transfer",
        kind: "apply",
        title: "Przenieś kontekst na stronę",
        prompt:
          "Wybierz kontrakt dla kompozycji, która wywołuje `parse_page(text)?`, a potem oblicza następną stronę. `?` przekazuje Err, natomiast Ok daje wartość do dalszego użycia.",
        choices: [
          {
            id: "domain",
            label:
              "Helper Result<i32, DomainError> + `let page = parse_page(text)?;` + dalsze obliczenie",
          },
          {
            id: "sentinel",
            label: "Result<i32, String> z tekstem `bad` dla wszystkiego",
          },
          { id: "panic", label: "i32 z panic dla błędnego tekstu" },
        ],
        evaluator: {
          kind: "choice",
          correct: "domain",
          explanations: {
            domain:
              "Kontrakt przekazuje wywołującemu oba znaczenia błędu i pozwala mu zdecydować.",
            sentinel: "Jeden tekst nadal gubi rozróżnienie składni i zakresu.",
            panic:
              "Błąd danych wejściowych jest przewidywalny i może być odzyskany.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "propagate-recall",
        kind: "recall",
        title: "Przypomnij rolę ?",
        prompt:
          "Wpisz słowo, które oznacza wczesny zwrot błędu przez operator ?.",
        evaluator: {
          kind: "answer",
          accepted: ["Err", "err"],
          feedback:
            "Po napotkaniu Err operator ? zwraca ten błąd z bieżącej funkcji.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "? naprawia błąd za wywołującego.",
      "Niezgodne typy błędów można przemilczeć operatorem ?.",
      "Jeden tekstowy błąd zawsze zachowuje wystarczający kontekst.",
    ],
    transferTask:
      "Zbuduj helper zwracający własny enum błędu i propaguj go przez kolejną funkcję bez zamiany Err na wartość domyślną.",
    evidenceGate:
      "Naprawiony parse_value i niezależny read_domain zachowują sukces, InvalidSyntax, OutOfRange oraz zero.",
    sourceIds: ["errors-rust-book-result", "errors-std-result"],
  },
  {
    id: "panic-and-contracts",
    moduleId: "error-handling",
    conceptIds: ["panic-boundaries"],
    competencyIds: ["panic-contracts"],
    prerequisites: ["propagation-and-errors"],
    title: "Panic jako granica kontraktu",
    subtitle:
      "Rozróżnij błąd programu od danych wejściowych i zostaw decyzję wywołującemu API.",
    minutes: 18,
    outcomes: [
      "Rozpoznasz unwrap jako świadomą decyzję, która może wywołać panic.",
      "Zastąpisz panic walidacją na granicy funkcji.",
      "Zaprojektujesz bezpieczny dostęp do indeksu dla pustych i zbyt krótkich danych.",
    ],
    steps: [
      {
        id: "panic-predict",
        kind: "predict",
        title: "Przewiduj granicę",
        prompt:
          'Kod używa `unwrap` na wyniku parsowania. Dla tekstu "12" jaki wynik zobaczysz? `unwrap` wyciąga Ok, ale dla Err przerwałby program przez panic.',
        code: `fn main() {
    let number = "12".parse::<i32>().unwrap();
    println!("{number}");
}`,
        solution: `fn main() {
    let number = "12".parse::<i32>().unwrap();
    println!("{number}");
}`,
        choices: [
          { id: "twelve", label: "12" },
          { id: "error", label: "Opis Err" },
          { id: "panic", label: "Panic także dla 12" },
        ],
        evaluator: {
          kind: "choice",
          correct: "twelve",
          explanations: {
            twelve:
              "Ten konkretny tekst jest poprawny, więc unwrap wyciąga 12 z Ok.",
            error: "Err powstaje dopiero dla tekstu niebędącego liczbą.",
            panic: "Panic dotyczy Err, a tutaj parser zwraca Ok.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "panic-run",
        kind: "run",
        title: "Uruchom bezpieczny przykład",
        prompt:
          "Uruchom helper, który waliduje wynik parsera i zwraca opis bez używania unwrap dla danych wejściowych.",
        code: `fn number_or_message(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("number {value}"),
        Err(_error) => String::from("invalid input"),
    }
}

fn main() {
    println!("{} {}", number_or_message("0"), number_or_message("żółć"));
}`,
        solution: `fn number_or_message(text: &str) -> String {
    match text.parse::<i32>() {
        Ok(value) => format!("number {value}"),
        Err(_error) => String::from("invalid input"),
    }
}

fn main() {
    println!("{} {}", number_or_message("0"), number_or_message("żółć"));
}`,
        evaluator: {
          kind: "exact-output",
          expected: "number 0 invalid input\n",
        },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "panic-observe",
        kind: "observe",
        title: "Zobacz, kto podejmuje decyzję",
        prompt:
          "Gdy funkcja dostaje błędny tekst od użytkownika, kto powinien zdecydować, czy pokazać komunikat, poprosić o ponowienie albo zakończyć program?",
        choices: [
          { id: "caller", label: "Wywołujący, jeśli API zwraca Result" },
          { id: "unwrap", label: "Zawsze unwrap wewnątrz helpera" },
          { id: "compiler", label: "Kompilator wybiera reakcję za program" },
        ],
        evaluator: {
          kind: "choice",
          correct: "caller",
          explanations: {
            caller:
              "Result zachowuje informację i oddaje decyzję kodowi, który zna cel operacji.",
            unwrap: "unwrap odbiera tę decyzję i może wywołać panic.",
            compiler:
              "Kompilator sprawdza typy, lecz nie wybiera reakcji domenowej.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "panic-explain",
        kind: "explain",
        title: "Oddziel założenie od danych",
        prompt: "Który przypadek lepiej pasuje do panic niż do Result?",
        choices: [
          {
            id: "invariant",
            label: "Wewnętrzne założenie programu zostało złamane",
          },
          { id: "input", label: "Użytkownik wpisał pusty tekst" },
          { id: "index", label: "Użytkownik podał indeks poza zakresem" },
        ],
        evaluator: {
          kind: "choice",
          correct: "invariant",
          explanations: {
            invariant:
              "To sygnał błędu logiki programu, a nie zwykły przypadek danych.",
            input:
              "Pusty tekst jest przewidywalnym wejściem i może być opisany Err.",
            index:
              "Granica indeksu powinna pozwolić wywołującemu obsłużyć brak elementu.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "panic-debug",
        kind: "debug",
        title: "Usuń unwrap z granicy",
        prompt:
          'Napraw to_number tak, aby poprawny tekst dawał `Ok(liczba)`, w tym `Ok(0)`, a błędny tekst dawał `Err("invalid")`. Typ &\'static str oznacza tu pożyczony literał tekstowy dostępny przez cały czas działania programu; nie pożyczamy błędu od inputu. Starter panikuje przez unwrap dla błędnego tekstu; nie używaj unwrap ani expect w rozwiązaniu.',
        code: `fn to_number(text: &str) -> Result<i32, &'static str> {
    Ok(text.parse::<i32>().unwrap())
}

fn main() {
    println!("{:?}", to_number("12"));
}`,
        solution: `fn to_number(text: &str) -> Result<i32, &'static str> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err("invalid"),
    }
}

fn main() {
    println!("{:?}", to_number("12"));
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn invalid_input_does_not_panic() {
    assert_eq!(to_number("12"), Ok(12));
    assert_eq!(to_number("0"), Ok(0));
    assert_eq!(to_number("abc"), Err("invalid"));
    assert_eq!(to_number(""), Err("invalid"));
}`,
          forbiddenPatterns: ["unwrap(", "expect("],
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Błąd z zewnątrz nie spełnia bezwarunkowego założenia.",
          "Dopasuj Err i wybierz jawny, zgodny z kontraktem wynik.",
        ],
      },
      {
        id: "panic-modify",
        kind: "modify",
        title: "Waliduj zakres na wejściu",
        prompt:
          'Zmień percentage tak, aby każda liczba całkowita z zakresu `0..=100` zapisana jako tekst dawała Ok, tekst z błędną składnią dawał Err("invalid"), a liczba poza zakresem — także przepełnienie i32 — Err("outside"). `ParseIntError::kind()` rozróżnia overflow od InvalidDigit/Empty. Nie wywołuj panic dla danych wejściowych.',
        code: `use std::num::IntErrorKind;

fn percentage(text: &str) -> Result<i32, &str> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(error) => match error.kind() {
            IntErrorKind::PosOverflow | IntErrorKind::NegOverflow => Err("outside"),
            _ => Err("invalid"),
        },
    }
}

fn main() {
    println!("{:?}", percentage("50"));
}`,
        solution: `use std::num::IntErrorKind;

fn percentage(text: &str) -> Result<i32, &str> {
    let value = match text.parse::<i32>() {
        Ok(value) => value,
        Err(error) => return match error.kind() {
            IntErrorKind::PosOverflow | IntErrorKind::NegOverflow => Err("outside"),
            _ => Err("invalid"),
        },
    };
    if (0..=100).contains(&value) {
        Ok(value)
    } else {
        Err("outside")
    }
}

fn main() {
    println!("{:?}", percentage("50"));
}`,
        evaluator: { kind: "tests", tests: boundaryTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Najpierw rozdziel błąd składni od liczby, potem sprawdź granice.",
          "Zakres 0..=100 możesz sprawdzić warunkiem bez unwrap.",
        ],
      },
      {
        id: "panic-transfer",
        kind: "apply",
        title: "Zabezpiecz dostęp do danych",
        prompt:
          "Wybierz implementację safe_item, która dla indeksu poza tablicą i pustej tablicy zwraca None, a dla poprawnego indeksu Some(wartość).",
        choices: [
          { id: "get", label: "`values.get(index).copied()`" },
          { id: "index", label: "`Some(values[index])`" },
          { id: "unwrap", label: "`values.get(index).unwrap()`" },
        ],
        evaluator: {
          kind: "choice",
          correct: "get",
          explanations: {
            get: "get opisuje brak jako Option, a copied zwraca Copy i32 bez przejęcia tablicy.",
            index: "Bezpośredni indeks może wywołać panic poza zakresem.",
            unwrap: "unwrap znów zamienia przewidywalny brak w panic.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "panic-recall",
        kind: "recall",
        title: "Przypomnij granicę",
        prompt:
          "Wpisz nazwę typu, który pozwala zwrócić sukces albo błąd wywołującemu.",
        evaluator: {
          kind: "answer",
          accepted: ["Result", "result"],
          feedback:
            "Result zachowuje Ok lub Err i pozwala wywołującemu podjąć decyzję.",
        },
        evidenceKind: "recall",
      },
      {
        id: "recovery-readings-policy",
        kind: "blank",
        title: "Zdecyduj, kiedy kontynuować import",
        prompt:
          "Projektujesz import dziennika pomiarów. Liczbę zapisaną w wierszu odczytaj tak jak przez parse::<i16>(). Uszkodzony zapis (np. litery, same spacje lub liczba poza zakresem i16) musi zatrzymać import. Pusty napis ma inne znaczenie: może oznaczać dopuszczalną przerwę w zapisie albo brak wymaganej próbki. Wybierz odbiorcę raportu i zdecyduj, czy pominiesz takie braki z ostrzeżeniem, czy zakończysz import na pierwszym braku. W notatce uzasadnij swój wybór i opisz jego koszt dla odbiorcy.\n\nZadeklaruj własną decyzję przez `const POMIJAJ_BRAKI: bool`. Napisz `fn podsumuj(wiersze: &[&str]) -> Result<(i64, usize), usize>`. Przy sukcesie zwróć sumę pomiarów i liczbę pominiętych braków. Ta liczba pełni rolę ostrzeżenia dla odbiorcy. Przy błędzie zwróć numer pierwszego odrzuconego wiersza, licząc od 1. Pusta lista daje sumę 0 i zero braków. Wejście ma najwyżej 1000 wierszy. Typ wyniku służy do porównania raportów; reprezentację problemów wewnątrz funkcji dobierz samodzielnie. Przed uruchomieniem zapisz, co Twoja polityka zrobi z pustym napisem, liczbą zero i uszkodzonym wierszem w jednym dzienniku.",
        solution: `const POMIJAJ_BRAKI: bool = true;

fn podsumuj(wiersze: &[&str]) -> Result<(i64, usize), usize> {
    let mut suma = 0;
    let mut braki = 0;
    for (indeks, &tekst) in wiersze.iter().enumerate() {
        if tekst.is_empty() && POMIJAJ_BRAKI {
            braki += 1;
            continue;
        }
        match tekst.parse::<i16>() {
            Ok(pomiar) => suma += i64::from(pomiar),
            Err(_) => return Err(indeks + 1),
        }
    }
    Ok((suma, braki))
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn poprawne_pomiary() {
    assert_eq!(podsumuj(&[]), Ok((0, 0)));
    assert_eq!(podsumuj(&["+04", "-0", "-12"]), Ok((-8, 0)));
    assert_eq!(podsumuj(&["0", "32767", "32767", "-32768"]), Ok((32766, 0)));
}
#[test]
fn braki_zgodne_z_deklaracja() {
    let oczekiwane = if POMIJAJ_BRAKI { Ok((5, 2)) } else { Err(2) };
    assert_eq!(podsumuj(&["-3", "", "8", ""]), oczekiwane);
    assert_eq!(podsumuj(&[""]), if POMIJAJ_BRAKI { Ok((0, 1)) } else { Err(1) });
}
#[test]
fn pierwszy_blad_i_jego_kontekst() {
    for bledny in [" ", " 1", "1 ", "x", "32768", "-32769"] {
        assert_eq!(podsumuj(&["10", bledny, "0", "x"]), Err(2));
        assert_eq!(podsumuj(&["", "1", bledny]), if POMIJAJ_BRAKI { Err(3) } else { Err(1) });
    }
}`,
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "unwrap jest bezpieczny dla każdego tekstu użytkownika.",
      "Panic jest lepszym komunikatem dla każdego błędu danych.",
      "Indeks poza zakresem to zawsze błąd logiki programu.",
    ],
    transferTask:
      "Zamień jedną niebezpieczną granicę danych na kontrakt Result lub Option i sprawdź przypadek pusty, poprawny oraz graniczny.",
    evidenceGate:
      "Naprawiony to_number, niezależny percentage i wybór bezpiecznego indeksu potwierdzają walidację bez panic dla danych z zewnątrz.",
    sourceIds: ["errors-rust-book-panic", "errors-rust-book-result"],
  },
];

export const errorsModule: CourseModule = {
  id: "error-handling",
  title: "Result i obsługa błędów",
  whyItMatters:
    "Jawne wyniki błędów pozwalają programowi zachować kontekst i oddać decyzję kodowi, który zna cel operacji.",
  capabilities: [
    "Rozpoznajesz Ok i Err w Result.",
    "Jawnie zamieniasz błąd parsera na błąd domeny.",
    "Propagujesz błędy przez ? bez ich ukrywania.",
    "Projektujesz granice bez panic dla przewidywalnych danych wejściowych.",
  ],
  prerequisites: ["collections"],
  lessonIds: errorsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Naprawić funkcję Result dla sukcesu, zera i błędu tekstu.",
    "Zachować osobne tryby błędu po propagacji.",
    "Zastąpić unwrap walidacją na granicy danych.",
  ],
  projectConnection:
    "Result przyda się w przyszłym Todo CLI do komunikowania błędnych argumentów, plików i danych bez kończenia programu w nieprzewidywalnym miejscu.",
  assessmentId: "panic-and-contracts/panic-transfer",
  gateCriteria: [
    {
      id: "result-recovery-gate",
      label: "Result odzyskuje kontrolę nad błędem",
      taskRefs: [
        { lessonId: "result-and-recovery", stepId: "result-debug" },
        { lessonId: "result-and-recovery", stepId: "result-modify" },
      ],
    },
    {
      id: "error-propagation-gate",
      label: "Propagacja zachowuje typ i kontekst błędu",
      taskRefs: [
        { lessonId: "propagation-and-errors", stepId: "propagate-debug" },
        { lessonId: "propagation-and-errors", stepId: "propagate-modify" },
      ],
    },
    {
      id: "panic-contract-gate",
      label: "Granica danych nie wymusza panic",
      taskRefs: [
        { lessonId: "panic-and-contracts", stepId: "panic-debug" },
        { lessonId: "panic-and-contracts", stepId: "panic-modify" },
      ],
    },
  ],
};

export const errorsReviewExercises: Record<string, LessonStep> = {
  "result-recoverable": {
    id: "review-result-recoverable",
    kind: "debug",
    title: "Review: zwróć Err",
    prompt:
      'Napraw classify, aby dla dodatniej liczby zwracała Ok(value), a dla zera i liczby ujemnej dokładnie Err("not positive"). Nie używaj panic.',
    code: `fn classify(value: i32) -> Result<i32, &'static str> {
    if value > 0 {
        Ok(value)
    } else {
        Ok(0)
    }
}

fn main() {
    println!("{:?}", classify(2));
}`,
    solution: `fn classify(value: i32) -> Result<i32, &'static str> {
    if value > 0 {
        Ok(value)
    } else {
        Err("not positive")
    }
}

fn main() {
    println!("{:?}", classify(2));
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn classifies_zero_and_negative_as_errors() {
    assert_eq!(classify(3), Ok(3));
    assert_eq!(classify(0), Err("not positive"));
    assert_eq!(classify(-2), Err("not positive"));
}`,
    },
    evidenceKind: "fix",
    expectedStatus: "success",
  },
  "explicit-error-conversion": {
    id: "review-explicit-error-conversion",
    kind: "debug",
    title: "Review: jawna konwersja",
    prompt:
      "Napraw convert, aby błędny tekst dawał DomainError::Invalid, a poprawny tekst Ok. Użyj match zamiast map_err.",
    code: `#[derive(Debug, PartialEq)]
enum DomainError {
    Invalid,
}

fn convert(text: &str) -> Result<i32, DomainError> {
    text.parse::<i32>()
}

fn main() {
    println!("{:?}", convert("4"));
}`,
    solution: `#[derive(Debug, PartialEq)]
enum DomainError {
    Invalid,
}

fn convert(text: &str) -> Result<i32, DomainError> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_parse_error) => Err(DomainError::Invalid),
    }
}

fn main() {
    println!("{:?}", convert("4"));
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn converts_success_and_failure() {
    assert_eq!(convert("4"), Ok(4));
    assert_eq!(convert(""), Err(DomainError::Invalid));
}`,
    },
    evidenceKind: "fix",
    expectedStatus: "compile-error",
    expectedError: "E0308",
  },
  "question-mark-propagation": {
    id: "review-question-mark-propagation",
    kind: "modify",
    title: "Review: nie ukrywaj Err",
    prompt:
      "Zmień forward, aby używała `let value = read_limit(text)?;` i przekazywała Err bez zamiany na Ok(0). Następnie zwiększ value o 1 przez `value.checked_add(1)`: ta metoda zwraca Some(sumy), jeśli suma mieści się w i32, albo None przy przepełnieniu. Dopasuj Option przez match: Some(next) daje Ok(next), a None daje Err(DomainError::OutOfRange). Dotyczy to także i32::MAX, dla którego zwykłe + 1 może panikować. read_limit pozostaje bez zmian: tekst, którego nie da się sparsować jako i32, daje Invalid.",
    code: `#[derive(Debug, PartialEq)]
enum DomainError {
    Invalid,
    OutOfRange,
}

fn read_limit(text: &str) -> Result<i32, DomainError> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(DomainError::Invalid),
    }
}

fn forward(text: &str) -> Result<i32, DomainError> {
    match read_limit(text) {
        Ok(value) => Ok(value),
        Err(_error) => Ok(0),
    }
}

fn main() {
    println!("{:?}", forward("bad"));
}`,
    solution: `#[derive(Debug, PartialEq)]
enum DomainError {
    Invalid,
    OutOfRange,
}

fn read_limit(text: &str) -> Result<i32, DomainError> {
    match text.parse::<i32>() {
        Ok(value) => Ok(value),
        Err(_error) => Err(DomainError::Invalid),
    }
}

fn forward(text: &str) -> Result<i32, DomainError> {
    let value = read_limit(text)?;
    match value.checked_add(1) {
        Some(next) => Ok(next),
        None => Err(DomainError::OutOfRange),
    }
}

fn main() {
    println!("{:?}", forward("bad"));
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn forwards_errors_and_increments_without_overflow() {
    assert_eq!(forward("bad"), Err(DomainError::Invalid));
    assert_eq!(forward(""), Err(DomainError::Invalid));
    assert_eq!(forward("2147483648"), Err(DomainError::Invalid));
    assert_eq!(forward("0"), Ok(1));
    assert_eq!(forward("-3"), Ok(-2));
    assert_eq!(forward("-2147483648"), Ok(-2147483647));
    assert_eq!(forward("2147483646"), Ok(2147483647));
    assert_eq!(forward("2147483647"), Err(DomainError::OutOfRange));
}`,
    },
    evidenceKind: "transfer",
    expectedStatus: "success",
  },
  "panic-boundaries": {
    id: "review-panic-boundaries",
    kind: "modify",
    title: "Review: bezpieczna granica",
    prompt:
      "Zmień take_first tak, aby pusty tekst dawał None, a nie panic; dla niepustego zwróć pierwszy znak jako String.",
    code: `fn take_first(text: &str) -> Option<String> {
    Some(text.chars().next().unwrap().to_string())
}

fn main() {
    println!("{:?}", take_first("Rust"));
}`,
    solution: `fn take_first(text: &str) -> Option<String> {
    match text.chars().next() {
        Some(character) => Some(character.to_string()),
        None => None,
    }
}

fn main() {
    println!("{:?}", take_first("Rust"));
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn handles_empty_and_utf8_text() {
    assert_eq!(take_first(""), None);
    assert_eq!(take_first("żółć"), Some(String::from("ż")));
    assert_eq!(take_first("Rust"), Some(String::from("R")));
}`,
      forbiddenPatterns: ["unwrap(", "expect("],
    },
    evidenceKind: "transfer",
    expectedStatus: "success",
  },
};
