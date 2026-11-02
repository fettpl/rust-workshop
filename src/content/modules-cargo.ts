import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const cargoSources: Source[] = [
  {
    id: "cargo-book-module-tree",
    title: "The Rust Programming Language: Defining Modules",
    url: "https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie przykładów mod i korzenia crate.",
  },
  {
    id: "cargo-book-paths",
    title: "The Rust Programming Language: Paths in the Module Tree",
    url: "https://doc.rust-lang.org/book/ch07-03-paths-for-referring-to-an-item-in-the-module-tree.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie ćwiczeń ścieżek i prywatności pól.",
  },
  {
    id: "cargo-reference-visibility",
    title: "The Rust Reference: Visibility and Privacy",
    url: "https://doc.rust-lang.org/reference/visibility-and-privacy.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie zakresów pub(crate) i re-eksportów.",
  },
  {
    id: "cargo-book-use",
    title: "The Rust Programming Language: Bringing Paths into Scope",
    url: "https://doc.rust-lang.org/book/ch07-04-bringing-paths-into-scope-with-the-use-keyword.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie przykładów use, aliasów i pub use.",
  },
  {
    id: "cargo-book-packages",
    title: "The Rust Programming Language: Packages and Crates",
    url: "https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie opisu pakietu, crate i targetów.",
  },
  {
    id: "cargo-book-separate-files",
    title: "The Rust Programming Language: Separating Modules into Files",
    url: "https://doc.rust-lang.org/book/ch07-05-separating-modules-into-different-files.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie instrukcji przenoszenia mod do plików.",
  },
  {
    id: "cargo-guide-layout",
    title: "The Cargo Book: Package Layout",
    url: "https://doc.rust-lang.org/cargo/guide/project-layout.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie Cargo lub struktury pobieranego projektu.",
  },
  {
    id: "cargo-reference-targets",
    title: "The Cargo Book: Cargo Targets",
    url: "https://doc.rust-lang.org/cargo/reference/cargo-targets.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie domyślnych targetów Cargo.",
  },
  ...[
    ["new", "Tworzenie pakietu"],
    ["check", "Sprawdzanie kompilacji"],
    ["build", "Budowanie programu"],
    ["test", "Uruchamianie testów"],
    ["run", "Uruchamianie programu"],
  ].map(([command, title]): Source => ({
    id: `cargo-command-${command}`,
    title: `The Cargo Book: cargo ${command} — ${title}`,
    url: `https://doc.rust-lang.org/cargo/commands/cargo-${command}.html`,
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie poleceń w instrukcji lokalnego projektu.",
  })),
];

export const cargoCompetencies: Competency[] = [
  {
    id: "navigate-modules",
    title: "Budujesz drzewo modułów i wskazujesz funkcje poprawną ścieżką.",
  },
  {
    id: "protect-module-api",
    title:
      "Chronisz dane prywatnymi polami i walidujesz ich tworzenie w publicznym API.",
  },
  {
    id: "shape-import-api",
    title:
      "Wprowadzasz lokalne nazwy i aliasy oraz udostępniasz spójne API przez pub use.",
  },
  {
    id: "integrate-cargo-targets",
    title:
      "Oddzielasz bibliotekę od klienta i rozumiesz granice targetów pakietu Cargo.",
  },
];

export const cargoConcepts: Concept[] = [
  {
    id: "module-paths",
    title: "Drzewo mod oraz ścieżki crate, self i super",
    prerequisites: ["session-boundaries"],
    competencyIds: ["navigate-modules"],
    reviewPrompt:
      "Gdzie zaczynają się ścieżki crate::, self:: i super:: wewnątrz zagnieżdżonego modułu?",
    reviewAnswer:
      "crate zaczyna w korzeniu bieżącego crate, self w bieżącym module, a super w jego rodzicu. Kolejne nazwy po :: wskazują elementy drzewa.",
    distinguish:
      "Moduł organizuje nazwy i dostęp; sam blok mod nie uruchamia funkcji ani nie tworzy nowego crate.",
  },
  {
    id: "visibility-boundaries",
    title: "Publiczny typ, prywatny stan i konstruktor z walidacją",
    prerequisites: ["module-paths"],
    competencyIds: ["protect-module-api"],
    reviewPrompt:
      "Dlaczego pub struct z prywatnym polem może wymagać wywołania konstruktora?",
    reviewAnswer:
      "Klient poza modułem nie może sam wypełnić prywatnego pola. Publiczny konstruktor sprawdza dane przed utworzeniem wartości, a metoda odczytu pozwala użyć poprawnego stanu.",
    distinguish:
      "pub nie upublicznia pól struktury. pub(crate) ogranicza dostęp do jednego crate, a nie do wszystkich crate w tym samym pakiecie.",
  },
  {
    id: "scoped-imports",
    title: "Lokalne use, alias oraz publiczny re-eksport",
    prerequisites: ["visibility-boundaries"],
    competencyIds: ["shape-import-api"],
    reviewPrompt:
      "Czym różnią się use path::Name as Alias i pub use path::Name?",
    reviewAnswer:
      "use wprowadza nazwę w danym zakresie, a as wybiera jej lokalny alias. pub use dodatkowo udostępnia tę nazwę jako część API modułu, bez kopiowania definicji.",
    distinguish:
      "Import nie jest nową definicją i nie omija prywatności. Dziecko modułu nie dostaje automatycznie krótkich nazw importowanych przez rodzica.",
  },
  {
    id: "cargo-targets",
    title: "Pakiet Cargo, crate i publiczna granica biblioteki",
    prerequisites: ["scoped-imports"],
    competencyIds: ["integrate-cargo-targets"],
    reviewPrompt:
      "Co łączy src/lib.rs i src/main.rs w jednym pakiecie, a co je rozdziela?",
    reviewAnswer:
      "Wspólny Cargo.toml opisuje pakiet, lecz lib.rs i main.rs są korzeniami osobnych crate. Program korzysta z publicznego API biblioteki przez nazwę jej crate.",
    distinguish:
      "Udany test jednego pliku w przeglądarce nie potwierdza konfiguracji Cargo, wykrycia plików ani dostępności API dla osobnego crate.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  answers: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  const correctIndex =
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const ordered = [0, 1, 2].map((index) => (index - correctIndex + 3) % 3);
  return {
    id,
    kind,
    title,
    prompt,
    choices: ordered.map((answerIndex, index) => ({
      id: String(index),
      label: answers[answerIndex],
    })),
    evaluator: {
      kind: "choice",
      correct: String(correctIndex),
      explanations: Object.fromEntries(
        ordered.map((answerIndex, index) => [
          String(index),
          explanations[answerIndex],
        ]),
      ),
    },
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}

function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function compilerError(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  error: string,
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: { kind: "expected-error", code: error },
    expectedStatus: "compile-error",
    expectedError: error,
    evidenceKind: "exposure",
  };
}

function exercise(options: {
  id: string;
  kind: "debug" | "modify" | "apply" | "blank";
  title: string;
  prompt: string;
  code: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
  error?: string;
  forbidden?: string[];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    code: options.code,
    solution: options.solution,
    hints: options.hints,
    evaluator: {
      kind: "tests",
      tests: options.tests,
      forbiddenPatterns: options.forbidden,
    },
    expectedStatus: options.error ? "compile-error" : "success",
    ...(options.error ? { expectedError: options.error } : {}),
    evidenceKind:
      options.kind === "debug"
        ? "fix"
        : options.kind === "blank"
          ? "assessment"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const pathRun = `mod reports {
    fn prefix() -> String { String::from("Plan") }

    pub mod daily {
        fn clean(text: &str) -> String { String::from(text.trim()) }

        pub fn label(text: &str) -> String {
            format!("{}: {}", super::prefix(), self::clean(text))
        }
    }
}

fn main() {
    println!("{}", crate::reports::daily::label("  dostawa  "));
}`;

const pathBroken = `mod reports {
    pub mod daily {
        pub fn label(text: &str) -> String { format!("Plan: {}", text.trim()) }
    }
}

fn report(text: &str) -> String {
    crate::daily::label(text)
}

fn main() { println!("{}", report("dostawa")); }`;
const pathRepair = pathBroken.replace(
  "crate::daily::label",
  "crate::reports::daily::label",
);

const notesStarter = `mod notes {
    fn prefix() -> String { String::from("Notatka") }
    pub mod lines {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn render(text: &str) -> String { String::from(text) }
    }
}
fn summary(text: &str) -> String { String::from(text) }`;
const notesSolution = `mod notes {
    fn prefix() -> String { String::from("Notatka") }
    pub mod lines {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn render(text: &str) -> String {
            format!("{}: {}", super::prefix(), self::clean(text))
        }
    }
}
fn summary(text: &str) -> String { crate::notes::lines::render(text) }`;
const notesTests = `#[test]
fn nested_api_and_root_client_agree() {
    for (input, expected) in [(" plan ", "Notatka: plan"), ("żółć", "Notatka: żółć"), ("", "Notatka: "), ("a  b", "Notatka: a  b")] {
        assert_eq!(crate::notes::lines::render(input), expected);
        assert_eq!(crate::summary(input), expected);
    }
}`;
const badgePathStarter = `mod badges {
    fn prefix() -> String { String::from("Gość") }
    pub mod names {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn render(text: &str) -> String { String::from(text) }
    }
}
fn badge(text: &str) -> String { String::from(text) }`;
const badgePathSolution = `mod badges {
    fn prefix() -> String { String::from("Gość") }
    pub mod names {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn render(text: &str) -> String {
            format!("{}: {}", super::prefix(), self::clean(text))
        }
    }
}
fn badge(text: &str) -> String { crate::badges::names::render(text) }`;
const badgePathTests = `#[test]
fn nested_badge_api_and_client_agree() {
    for (input, expected) in [(" Ada ", "Gość: Ada"), ("Łucja", "Gość: Łucja"), ("", "Gość: "), ("A  B", "Gość: A  B")] {
        assert_eq!(crate::badges::names::render(input), expected);
        assert_eq!(crate::badge(input), expected);
    }
}`;

const seatSolution = `mod booking {
    #[derive(Debug, PartialEq, Eq)]
    pub enum SeatError { Outside }

    pub struct Seat { number: u8 }

    pub(crate) fn limit() -> u8 { 8 }

    impl Seat {
        pub fn new(number: u8) -> Result<Seat, SeatError> {
            if number == 0 || number > self::limit() {
                Err(SeatError::Outside)
            } else {
                Ok(Seat { number })
            }
        }
        pub fn number(&self) -> u8 { self.number }
    }
}`;
const seatRun = `${seatSolution}
fn main() {
    match crate::booking::Seat::new(8) {
        Ok(seat) => println!("miejsce {}", seat.number()),
        Err(error) => println!("{:?}", error),
    }
    println!("limit {}", crate::booking::limit());
    println!("odrzucono: {}", crate::booking::Seat::new(0).is_err());
}`;
const seatBroken = `${seatSolution}
fn chosen() -> u8 {
    match crate::booking::Seat::new(3) {
        Ok(seat) => seat.number,
        Err(_) => 0,
    }
}
fn main() { println!("{}", chosen()); }`;
const seatRepair = seatBroken.replace(
  "Ok(seat) => seat.number,",
  "Ok(seat) => seat.number(),",
);
const seatStarter = seatSolution.replace(
  "if number == 0 || number > self::limit()",
  "if number > self::limit()",
);
const seatTests = `#[test]
fn constructor_accepts_only_real_seats() {
    assert_eq!(crate::booking::limit(), 8);
    for number in [1, 2, 7, 8] {
        match crate::booking::Seat::new(number) {
            Ok(seat) => assert_eq!(seat.number(), number),
            Err(_) => panic!("valid seat rejected"),
        }
    }
    for number in [0, 9, u8::MAX] {
        match crate::booking::Seat::new(number) {
            Ok(_) => panic!("invalid seat accepted"),
            Err(error) => assert_eq!(error, crate::booking::SeatError::Outside),
        }
    }
}`;
const lockerSolution = `mod storage {
    #[derive(Debug, PartialEq, Eq)]
    pub enum LockerError { Outside }
    pub struct Locker { number: u8 }
    pub(crate) fn limit() -> u8 { 12 }
    impl Locker {
        pub fn new(number: u8) -> Result<Locker, LockerError> {
            if number == 0 || number > self::limit() {
                Err(LockerError::Outside)
            } else {
                Ok(Locker { number })
            }
        }
        pub fn number(&self) -> u8 { self.number }
    }
}`;
const lockerStarter = lockerSolution.replace(
  "if number == 0 || number > self::limit()",
  "if number == 0",
);
const lockerTests = `#[test]
fn constructor_accepts_only_real_lockers() {
    assert_eq!(crate::storage::limit(), 12);
    for number in [1, 2, 11, 12] {
        match crate::storage::Locker::new(number) {
            Ok(locker) => assert_eq!(locker.number(), number),
            Err(_) => panic!("valid locker rejected"),
        }
    }
    for number in [0, 13, u8::MAX] {
        match crate::storage::Locker::new(number) {
            Ok(_) => panic!("invalid locker accepted"),
            Err(error) => assert_eq!(error, crate::storage::LockerError::Outside),
        }
    }
}`;

const privateNumber = [
  "pub number:",
  "pub(crate) number:",
  "pub(super) number:",
  ".unwrap(",
  ".expect(",
];

const importsPrelude = `mod messages {
    pub fn tag(text: &str) -> String { format!("Wiadomość: {}", text.trim()) }
}
use crate::messages::tag;`;
const importsBroken = `${importsPrelude}
mod screen {
    pub fn show(text: &str) -> String { tag(text) }
}
fn main() { println!("{}", crate::screen::show("start")); }`;
const importsRepair = importsBroken.replace(
  "mod screen {",
  "mod screen {\n    use crate::messages::tag;",
);

const formatsStarter = `mod formats {
    mod incoming {
        pub fn label(text: &str) -> String { format!("IN:{}", text.trim()) }
    }
    mod outgoing {
        pub fn label(text: &str) -> String { format!("OUT:{}", text.trim()) }
    }
    pub fn pair(text: &str) -> String { String::from(text) }
}`;
const formatsSolution = `mod formats {
    mod incoming {
        pub fn label(text: &str) -> String { format!("IN:{}", text.trim()) }
    }
    mod outgoing {
        pub fn label(text: &str) -> String { format!("OUT:{}", text.trim()) }
    }
    pub use self::incoming::label as incoming_label;
    pub use self::outgoing::label as outgoing_label;

    pub fn pair(text: &str) -> String {
        use self::incoming::label as input;
        use self::outgoing::label as output;
        format!("{} | {}", input(text), output(text))
    }
}`;
const importsRun = `${formatsSolution}
use crate::formats::{incoming_label, outgoing_label};
fn main() {
    println!("{}", incoming_label("  paczka  "));
    println!("{}", outgoing_label("  paczka  "));
    println!("{}", crate::formats::pair("  paczka  "));
}`;
const formatsTests = `#[test]
fn public_names_and_composed_result_match() {
    use crate::formats::{incoming_label, outgoing_label, pair};
    for text in ["", "  start  ", "żółć", "a  b"] {
        let clean = text.trim();
        assert_eq!(incoming_label(text), format!("IN:{}", clean));
        assert_eq!(outgoing_label(text), format!("OUT:{}", clean));
        assert_eq!(pair(text), format!("IN:{} | OUT:{}", clean, clean));
    }
}`;
const displayStarter = `mod display {
    mod short {
        pub fn label(text: &str) -> String { format!("[{}]", text.trim()) }
    }
    mod long {
        pub fn label(text: &str) -> String { format!("Nazwa: {}", text.trim()) }
    }
    pub fn pair(text: &str) -> String { String::from(text) }
}`;
const displaySolution = `mod display {
    mod short {
        pub fn label(text: &str) -> String { format!("[{}]", text.trim()) }
    }
    mod long {
        pub fn label(text: &str) -> String { format!("Nazwa: {}", text.trim()) }
    }
    pub use self::short::label as short_label;
    pub use self::long::label as long_label;
    pub fn pair(text: &str) -> String {
        use self::short::label as compact;
        use self::long::label as descriptive;
        format!("{} | {}", compact(text), descriptive(text))
    }
}`;
const displayTests = `#[test]
fn display_facade_keeps_both_formats() {
    use crate::display::{short_label, long_label, pair};
    for text in ["", "  narzędzia  ", "Łódź", "x  y"] {
        let clean = text.trim();
        assert_eq!(short_label(text), format!("[{}]", clean));
        assert_eq!(long_label(text), format!("Nazwa: {}", clean));
        assert_eq!(pair(text), format!("[{}] | Nazwa: {}", clean, clean));
    }
}`;

const dispatchContract =
  "Moduł dispatch udostępnia Parcel, ParcelError i register przez swoją granicę. Prywatny model przechowuje Parcel z prywatnym polem label typu String. Publiczna metoda label pożycza zapisany tekst jako &str. register przyjmuje pożyczony tekst, obcina brzegi przez trim, odrzuca pusty wynik jako ParcelError::Empty, a LF lub CR wewnątrz jako ParcelError::Multiline. Poprawny tekst zachowuje bez dalszych zmian i zwraca Parcel w Ok. Moduł desk udostępnia receipt, który przyjmuje tekst i korzysta wyłącznie z API dispatch: sukces daje String przyjęto: LABEL, Empty daje brak etykiety, Multiline daje jedna linia. Bez unwrap i expect.";
const dispatchSolution = String.raw`mod dispatch {
    mod model {
        #[derive(Debug, PartialEq, Eq)]
        pub enum ParcelError { Empty, Multiline }
        pub struct Parcel { label: String }
        impl Parcel {
            pub fn new(text: &str) -> Result<Parcel, ParcelError> {
                let label = text.trim();
                if label.is_empty() { return Err(ParcelError::Empty); }
                if label.contains('\n') || label.contains('\r') {
                    return Err(ParcelError::Multiline);
                }
                Ok(Parcel { label: String::from(label) })
            }
            pub fn label(&self) -> &str { &self.label }
        }
    }
    pub use self::model::{Parcel, ParcelError};
    pub fn register(text: &str) -> Result<Parcel, ParcelError> {
        Parcel::new(text)
    }
}
mod desk {
    use crate::dispatch::{register, ParcelError};
    pub fn receipt(text: &str) -> String {
        match register(text) {
            Ok(parcel) => format!("przyjęto: {}", parcel.label()),
            Err(ParcelError::Empty) => String::from("brak etykiety"),
            Err(ParcelError::Multiline) => String::from("jedna linia"),
        }
    }
}`;
const dispatchStarter = dispatchSolution
  .replace("if label.is_empty() { return Err(ParcelError::Empty); }", "")
  .replace(
    String.raw`if label.contains('\n') || label.contains('\r')`,
    "if false",
  )
  .replace(
    'Err(ParcelError::Multiline) => String::from("jedna linia")',
    'Err(ParcelError::Multiline) => String::from("brak etykiety")',
  );
const dispatchRun = String.raw`${dispatchSolution}
fn main() {
    println!("{}", crate::desk::receipt("  Szkło  "));
    println!("{}", crate::desk::receipt(" "));
    println!("{}", crate::desk::receipt("a\nb"));
}`;
const dispatchTests = String.raw`#[test]
fn public_api_and_client_keep_validation_results() {
    use crate::dispatch::{Parcel, ParcelError, register};
    for label in ["Szkło", "a  b", "Łódź", "x:y"] {
        let input = format!("  {}  ", label);
        let parcel: Result<Parcel, ParcelError> = register(&input);
        match parcel {
            Ok(value) => assert_eq!(value.label(), label),
            Err(_) => panic!("valid label rejected"),
        }
        assert_eq!(crate::desk::receipt(&input), format!("przyjęto: {}", label));
    }
    for (input, expected, receipt) in [("", ParcelError::Empty, "brak etykiety"), (" \t ", ParcelError::Empty, "brak etykiety"), ("a\nb", ParcelError::Multiline, "jedna linia"), ("a\rb", ParcelError::Multiline, "jedna linia")] {
        match register(input) {
            Ok(_) => panic!("invalid label accepted"),
            Err(error) => assert_eq!(error, expected),
        }
        assert_eq!(crate::desk::receipt(input), receipt);
    }
    assert_eq!(crate::desk::receipt("\nKarton\r\n"), "przyjęto: Karton");
}`;

const exportBroken = `mod status {
    mod detail {
        pub(crate) fn ready() -> bool { true }
    }
    pub use self::detail::ready;
}
fn main() { println!("{}", crate::status::ready()); }`;
const exportRepair = exportBroken.replace(
  "pub(crate) fn ready",
  "pub fn ready",
);

const clubContract =
  "Zaprojektuj API zapisów do klubu i jego klienta. Publiczne nazwy modułu club to Member, MemberError i enroll; szczegóły przechowuje prywatny moduł model. Member posiada prywatny String name i publiczną metodę name pożyczającą tę nazwę jako &str. enroll przyjmuje pożyczony tekst i zwraca Result z Member albo MemberError. Obcina białe znaki na brzegach; pusty wynik oznacza wariant Empty, dokładne admin oznacza wariant Reserved. Wielkość liter ma znaczenie: Admin jest dozwolone. Inne nazwy, także Unicode i spacje wewnętrzne, zachowuje dokładnie po obcięciu brzegów. Moduł welcome udostępnia message: dla tekstu wejściowego używa tylko API club i daje String Witaj, NAME! przy sukcesie, brak nazwy dla Empty albo nazwa zajęta dla Reserved. Udostępnij typy przez re-eksport z prywatnego modelu. Nie ujawniaj pola name, nie używaj unwrap ani expect. To jedno źródło Rust; testy sprawdzają API i klienta, a nie istnienie pakietu Cargo.";
const clubSolution = `mod club {
    mod model {
        #[derive(Debug, PartialEq, Eq)]
        pub enum MemberError { Empty, Reserved }
        pub struct Member { name: String }
        impl Member {
            pub fn new(text: &str) -> Result<Member, MemberError> {
                let name = text.trim();
                if name.is_empty() { return Err(MemberError::Empty); }
                if name == "admin" { return Err(MemberError::Reserved); }
                Ok(Member { name: String::from(name) })
            }
            pub fn name(&self) -> &str { &self.name }
        }
    }
    pub use self::model::{Member, MemberError};
    pub fn enroll(text: &str) -> Result<Member, MemberError> { Member::new(text) }
}
mod welcome {
    use crate::club::{enroll, MemberError};
    pub fn message(text: &str) -> String {
        match enroll(text) {
            Ok(member) => format!("Witaj, {}!", member.name()),
            Err(MemberError::Empty) => String::from("brak nazwy"),
            Err(MemberError::Reserved) => String::from("nazwa zajęta"),
        }
    }
}`;
const clubTests = `#[test]
fn public_types_and_client_respect_membership_contract() {
    use crate::club::{Member, MemberError, enroll};
    for (input, name) in [("  Ada  ", "Ada"), ("Żaneta", "Żaneta"), ("Admin", "Admin"), ("a  b", "a  b"), ("administrator", "administrator")] {
        let result: Result<Member, MemberError> = enroll(input);
        match result {
            Ok(member) => assert_eq!(member.name(), name),
            Err(_) => panic!("valid member rejected"),
        }
        assert_eq!(crate::welcome::message(input), format!("Witaj, {}!", name));
    }
    for (input, error, message) in [("", MemberError::Empty, "brak nazwy"), (" \t ", MemberError::Empty, "brak nazwy"), ("admin", MemberError::Reserved, "nazwa zajęta"), ("  admin  ", MemberError::Reserved, "nazwa zajęta")] {
        match enroll(input) {
            Ok(_) => panic!("invalid member accepted"),
            Err(actual) => assert_eq!(actual, error),
        }
        assert_eq!(crate::welcome::message(input), message);
    }
}`;

export const cargoLessons: Lesson[] = [
  {
    id: "module-tree-paths",
    moduleId: "modules-cargo",
    conceptIds: ["module-paths"],
    competencyIds: ["navigate-modules"],
    prerequisites: ["todo-session-project"],
    title: "Moduły: znajdź funkcję w drzewie",
    subtitle: "Porządkujesz znane funkcje za pomocą mod i ścieżek.",
    minutes: 30,
    outcomes: [
      "Zbudujesz zagnieżdżony moduł bez tworzenia osobnego pliku.",
      "Odróżnisz korzeń crate, bieżący self i rodzica super.",
      "Naprawisz ścieżkę, zachowując odpowiedzialność funkcji.",
    ],
    steps: [
      run(
        "paths-run",
        "Uruchom funkcję z modułu",
        "Todo połączyło kilka funkcji i typów w jednym źródle. Gdy ich przybywa, mod reports { ... } nadaje wspólną nazwę grupie elementów. Zagnieżdżone mod daily tworzy dziecko reports. Drzewo całej jednostki kompilacji, czyli crate, ma korzeń crate. Zapis :: przechodzi do kolejnej nazwy: crate::reports::daily::label. self::clean zaczyna szukanie w daily, a super::prefix w jego rodzicu reports. Funkcja prefix rodzica może być użyta przez dziecko. Na razie pub przed daily i label pozwala wywołać je spoza reports; pełne reguły dostępu poznasz w następnej lekcji. mod samo niczego nie wykonuje: dopiero wywołanie label w main tworzy wynik. Uruchom przykład i wskaż trzy miejsca startu ścieżek. Wszystkie moduły są tu rzeczywistymi modułami Rust w jednym pliku.",
        pathRun,
        "Plan: dostawa\n",
      ),
      choose(
        "paths-predict",
        "predict",
        "Przewidź start ścieżki",
        "Jesteś wewnątrz reports::daily z poprzedniego przykładu. Gdzie self::clean i super::prefix szukają funkcji?",
        [
          "clean w daily, prefix w reports",
          "Obie funkcje w korzeniu crate",
          "clean w reports, prefix w daily",
        ],
        [
          "self wskazuje bieżący moduł, a jeden super przechodzi o jeden poziom do rodzica.",
          "Tylko ścieżka rozpoczynająca się od crate ma zawsze korzeń crate jako punkt startu.",
          "Kierunki są odwrotne: self pozostaje na miejscu, super wychodzi do rodzica.",
        ],
      ),
      compilerError(
        "paths-error",
        "Zobacz brakujący poziom",
        "Uruchom celowo błędny program. E0433 oznacza tutaj, że w korzeniu crate nie ma modułu daily. Istnieje on dopiero wewnątrz reports. Przeczytaj ścieżkę od lewej strony i porównaj ją z blokami mod; nie zmieniaj jeszcze struktury.",
        pathBroken,
        pathRepair,
        "E0433",
      ),
      exercise({
        id: "paths-debug",
        kind: "debug",
        title: "Napraw drogę do funkcji",
        prompt:
          "Napraw wywołanie w report, tak aby trafiało do istniejącego reports::daily::label. report ma zwracać Plan: i spację przed tekstem po trim, także przy pustym tekście. Zachowaj moduły i funkcję label; nie przenoś jej do korzenia.",
        code: pathBroken,
        solution: pathRepair,
        error: "E0433",
        tests: `#[test]
fn repaired_path_handles_more_than_one_label() {
    assert_eq!(report(" nowy plan "), "Plan: nowy plan");
    assert_eq!(report(""), "Plan: ");
    assert_eq!(crate::reports::daily::label("żółć"), "Plan: żółć");
}`,
        hints: [
          "Narysuj kolejno crate, reports, daily i label.",
          "Między crate:: a daily:: brakuje nazwy modułu rodzica.",
        ],
      }),
      exercise({
        id: "paths-modify",
        kind: "modify",
        title: "Połącz trzy punkty startu",
        prompt:
          "Uzupełnij notes::lines::render i summary. render tworzy String Notatka: TEKST, obcinając tylko brzegi argumentu. Nie zmieniaj prefix ani clean: wywołaj prefix przez super i clean przez self. summary ma zwrócić ten sam wynik, wywołując render ścieżką od crate. Zachowaj zagnieżdżone moduły i publiczne render. Testy sprawdzają ścieżkę API oraz wynik dla pustego tekstu, Unicode i wewnętrznych spacji.",
        code: notesStarter,
        solution: notesSolution,
        tests: notesTests,
        gate: true,
        hints: [
          "render jest w lines, więc jego rodzicem jest notes.",
          "W format! połącz super::prefix() i self::clean(text); klient z korzenia wskazuje crate::notes::lines::render(text).",
        ],
      }),
      exercise({
        id: "paths-transfer",
        kind: "apply",
        title: "Przenieś drzewo do identyfikatorów",
        prompt:
          "Uzupełnij nową domenę identyfikatorów gości. badges::names::render zwraca Gość: TEKST, z trim tylko na brzegach. Użyj istniejących prefix rodzica przez super i clean bieżącego modułu przez self. Funkcja badge w korzeniu wywołuje render ścieżką od crate i zwraca ten sam String. Zachowaj hierarchię badges → names i oba pomocniki.",
        code: badgePathStarter,
        solution: badgePathSolution,
        tests: badgePathTests,
        gate: true,
        hints: [
          "To inne nazwy modułów, ale te same relacje rodzica i dziecka.",
          "Z wnętrza names rodzic to super; pełna ścieżka klienta biegnie przez badges oraz names.",
        ],
      }),
      choose(
        "paths-explain",
        "explain",
        "Oddziel drzewo od wykonania",
        "Co zmienia otoczenie istniejących funkcji blokiem mod reports { ... }?",
        [
          "Ich miejsce w drzewie nazw i reguły dostępu",
          "Uruchamia każdą funkcję raz przy starcie",
          "Tworzy osobny program z własnym main",
        ],
        [
          "Moduł grupuje elementy. Wywołania nadal decydują, kiedy funkcje pracują.",
          "Definicja funkcji wewnątrz mod nie jest jej wywołaniem.",
          "Jeden plik może zawierać wiele modułów należących do tego samego crate.",
        ],
      ),
      choose(
        "paths-recall",
        "recall",
        "Odtwórz drogę bez uruchamiania",
        "Funkcja jest w crate::a::b. Która para wskazuje moduł b i jego rodzica a?",
        ["self oraz super", "crate oraz self", "super oraz crate"],
        [
          "self pozostaje w b, super zaczyna w a.",
          "crate jest korzeniem całej jednostki, a nie bieżącym b.",
          "super wskazuje a, a crate korzeń ponad a.",
        ],
      ),
    ],
    misconceptions: [
      "Każdy mod wymaga osobnego pliku.",
      "super wskazuje zawsze korzeń całego programu.",
      "Blok mod wykonuje funkcje w kolejności ich definicji.",
    ],
    transferTask:
      "Przenieś układ notes → lines do badges → names i zachowaj poprawne wywołania między poziomami.",
    evidenceGate:
      "Jedno z dwóch zadań z kodem poprawnie udostępnia zagnieżdżoną funkcję i łączy ją z klientem w korzeniu.",
    sourceIds: ["cargo-book-module-tree", "cargo-book-paths"],
    sessionStops: [
      {
        afterStepId: "paths-transfer",
        title: "Opcjonalna przerwa po ścieżkach",
        nextGoal:
          "Wróć do modułu, widoczności i importów, aby utrwalić granice API przed kolejną lekcją.",
      },
    ],
  },
  {
    id: "module-visibility",
    moduleId: "modules-cargo",
    conceptIds: ["visibility-boundaries"],
    competencyIds: ["protect-module-api"],
    prerequisites: ["module-tree-paths"],
    title: "Prywatny stan, publiczna obietnica",
    subtitle: "Konstruktor sprawdza dane, zanim powstanie wartość.",
    minutes: 35,
    outcomes: [
      "Rozróżnisz prywatność, pub i pub(crate).",
      "Zachowasz prywatne pole publicznej struktury.",
      "Zaimplementujesz konstruktor, który odrzuca niepoprawny zakres przez Result.",
    ],
    steps: [
      run(
        "visibility-run",
        "Uruchom kontrolowaną konstrukcję",
        "Wcześniej pola struct można było wypełniać w tym samym module. Po umieszczeniu typu w booking potrzebujemy granicy: element bez pub jest dostępny w module, który go definiuje, i jego potomkach. Rodzic nie dostaje dostępu do prywatnego wnętrza dziecka. pub struct Seat udostępnia nazwę typu, ale pole number pozostaje prywatne. Publiczne Seat::new sprawdza numer przed zbudowaniem wartości, dlatego nazywamy je konstruktorem z walidacją; new to zwykła wybrana przez nas nazwa funkcji skojarzonej, nie specjalne słowo Rust. Publiczna metoda number pożycza &self i zwraca Copy liczby. Zapis Seat { number } jest skrótem Seat { number: number }. pub(crate) przy limit pozwala użyć pomocnika w bieżącym crate. Nie daje dostępu innemu crate. Publiczny enum SeatError udostępnia też swój wariant Outside. is_err() sprawdza, czy Result jest Err. Uruchom: poprawne miejsce 8 powstaje, zero jest odrzucone.",
        seatRun,
        "miejsce 8\nlimit 8\nodrzucono: true\n",
      ),
      choose(
        "visibility-predict",
        "predict",
        "Przewidź skutek pub struct",
        "Kod poza booking widzi publiczny Seat z prywatnym number. Który sposób chroni zakres 1–8?",
        [
          "Seat::new sprawdza numer, a number() pozwala go odczytać",
          "pub struct automatycznie pozwala ustawić każde pole",
          "pub(crate) sprawia, że number jest dostępne w każdym pakiecie",
        ],
        [
          "Pole pozostaje ukryte, więc klient korzysta z kontrolowanej konstrukcji i odczytu.",
          "Widoczność pól jest osobna od widoczności struktury.",
          "pub(crate) dotyczy tylko jednego crate; tutaj nie umieszczono go nawet przy polu.",
        ],
      ),
      compilerError(
        "visibility-error",
        "Odczytaj E0616",
        "Uruchom próbę odczytu seat.number spoza booking. Kompilator zgłosi E0616: pole number jest prywatne. To celowa ochrona danych. Publiczna metoda number() daje odczyt bez udostępniania samego pola do zapisu.",
        seatBroken,
        seatRepair,
        "E0616",
      ),
      exercise({
        id: "visibility-debug",
        kind: "debug",
        title: "Użyj API zamiast pola",
        prompt:
          "Napraw chosen: odczytaj numer poprawnego Seat przez istniejącą publiczną metodę. Zachowaj prywatne pole i konstruktor. Wynik chosen pozostaje liczbą 3. Nie dodawaj pub do number.",
        code: seatBroken,
        solution: seatRepair,
        error: "E0616",
        tests:
          "#[test]\nfn client_reads_through_api() { assert_eq!(chosen(), 3); }",
        forbidden: privateNumber,
        hints: [
          "Nazwa pola i nazwa metody mogą być takie same; odróżnia je wywołanie.",
          "seat.number() wywołuje metodę, a seat.number próbuje czytać prywatne pole.",
        ],
      }),
      exercise({
        id: "visibility-modify",
        kind: "modify",
        title: "Uszczelnij konstruktor Seat",
        prompt:
          "Starter przyjmuje zero. Napraw Seat::new: wyłącznie numery od 1 do limit() włącznie dają Ok z dokładnie tym numerem. Pozostałe u8 dają SeatError::Outside. Zachowaj publiczny typ i metody, prywatne number oraz pomocnik limit z pub(crate). Klient może odczytać numer, ale nie może ustawić pola bez walidacji. Bez unwrap i expect.",
        code: seatStarter,
        solution: seatSolution,
        tests: seatTests,
        gate: true,
        forbidden: privateNumber,
        hints: [
          "Sprawdź obie granice przed utworzeniem Seat.",
          "Niepoprawny jest numer równy zero albo większy od self::limit().",
        ],
      }),
      exercise({
        id: "visibility-transfer",
        kind: "apply",
        title: "Chroń numery szafek",
        prompt:
          "Napraw analogiczną granicę w nowej domenie. storage::Locker::new przyjmuje tylko numery u8 od 1 do limit() włącznie; limit wynosi 12. Inne numery dają LockerError::Outside. Publiczna metoda number zwraca dokładnie przyjęty numer. Pozostaw pole prywatne, limit dostępne przez pub(crate), a typ i metody publiczne. Bez unwrap i expect.",
        code: lockerStarter,
        solution: lockerSolution,
        tests: lockerTests,
        gate: true,
        forbidden: privateNumber,
        hints: [
          "Samo odrzucenie zera nie chroni końca zakresu.",
          "Walidacja ma poprzedzać Ok(Locker { number }); sprawdź też limit oraz u8::MAX.",
        ],
      }),
      choose(
        "visibility-explain",
        "explain",
        "Sprawdź granicę pomocnika",
        "Biblioteka udostępnia pub(crate) fn limit. Osobny program w tym samym pakiecie Cargo jest innym crate. Czy może wywołać ten pomocnik biblioteki?",
        [
          "Nie, pub(crate) kończy się na granicy crate biblioteki",
          "Tak, bo oba pliki należą do jednego pakietu",
          "Tak, jeśli użyje pełnej ścieżki z crate::",
        ],
        [
          "Pakiet może grupować kilka crate. Dostęp ograniczony do jednego nie rozszerza się na pozostałe.",
          "Wspólny pakiet nie usuwa granicy widoczności. Strukturę pakietu przećwiczysz w ostatniej lekcji.",
          "Pełna ścieżka wskazuje element, ale nie omija zasad prywatności.",
        ],
      ),
      choose(
        "visibility-recall",
        "recall",
        "Odtwórz cel prywatnego pola",
        "Dlaczego walidacja new przestaje wystarczać, gdy klient może sam ustawić publiczne pole number?",
        [
          "Klient może utworzyć lub zmienić stan, pomijając new",
          "Publiczne pola automatycznie wyłączają Result",
          "Rust nigdy nie pozwala użyć publicznych pól",
        ],
        [
          "Ukryte pole sprawia, że klient spoza modułu musi użyć dozwolonej drogi do zmiany stanu.",
          "Result nadal działa, lecz nie kontroluje operacji, które w ogóle nie wywołują new.",
          "Publiczne pola są legalne; wybór zależy od tego, czy dane wymagają chronionych niezmienników.",
        ],
      ),
    ],
    misconceptions: [
      "pub struct oznacza publiczne pola.",
      "Pełna ścieżka pozwala obejść prywatność.",
      "pub(crate) oznacza dostęp ze wszystkich crate jednego pakietu.",
    ],
    transferTask:
      "Zastosuj tę samą granicę konstrukcji do szafek o innym dozwolonym zakresie.",
    evidenceGate:
      "Konstruktor przyjmuje wszystkie sprawdzane poprawne numery, odrzuca obie niepoprawne granice i zachowuje prywatne pole.",
    sourceIds: ["cargo-book-paths", "cargo-reference-visibility"],
    sessionStops: [
      {
        afterStepId: "visibility-transfer",
        title: "Opcjonalna przerwa po widoczności",
        nextGoal:
          "Wróć do importów i re-eksportów, zachowując dokładny punkt wznowienia.",
      },
    ],
  },
  {
    id: "imports-and-reexports",
    moduleId: "modules-cargo",
    conceptIds: ["scoped-imports"],
    competencyIds: ["shape-import-api"],
    prerequisites: ["module-visibility"],
    title: "use: krótkie nazwy i małe API",
    subtitle:
      "Alias usuwa kolizję nazw, a pub use pokazuje klientowi wybraną drogę.",
    minutes: 35,
    outcomes: [
      "Wprowadzisz nazwę przez use w miejscu, które jej potrzebuje.",
      "Rozróżnisz dwie funkcje label przy pomocy as.",
      "Udostępnisz funkcje z prywatnych modułów przez pub use.",
    ],
    steps: [
      run(
        "imports-run",
        "Uruchom dwa formaty",
        "Długie ścieżki są jednoznaczne, lecz przy wielu wywołaniach przydaje się lokalna nazwa. use path::name wprowadza nazwę do bieżącego zakresu; niczego nie kopiuje i nie wywołuje. as input nadaje alias, więc dwie różne funkcje label mogą współistnieć w pair jako input i output. use można umieścić także wewnątrz funkcji. Zapis use crate::formats::{incoming_label, outgoing_label} skraca dwa importy o wspólnym początku. pub use jest re-eksportem: klient widzi nazwę formats::incoming_label, chociaż definicja pozostaje w prywatnym incoming. Funkcja w środku musi być publiczna, lecz moduł zawierający implementację może zostać prywatny. Uruchom i porównaj wywołania przez re-eksport z lokalnymi aliasami.",
        importsRun,
        "IN:paczka\nOUT:paczka\nIN:paczka | OUT:paczka\n",
      ),
      choose(
        "imports-predict",
        "predict",
        "Przewidź zakres importu",
        "Rodzic zawiera use crate::messages::tag. Jego dziecko screen chce użyć krótkiego tag(text). Co należy zrobić?",
        [
          "Wprowadzić tag w screen albo użyć jawnej ścieżki",
          "Nic: każdy import rodzica automatycznie działa jako krótka nazwa dziecka",
          "Skopiować definicję tag do każdego modułu",
        ],
        [
          "Import należy do zakresu. Dziecko może wprowadzić własną nazwę lub wskazać istniejącą ścieżkę, np. super::tag.",
          "Dziecko nie dziedziczy automatycznie krótkich nazw importowanych w rodzicu.",
          "use pozwala korzystać z jednej definicji, więc kopiowanie nie jest potrzebne.",
        ],
      ),
      compilerError(
        "imports-error",
        "Zobacz brak lokalnej nazwy",
        "Uruchom przykład. E0425 wskazuje, że screen nie ma w swoim zakresie funkcji o krótkiej nazwie tag. Definicja istnieje w messages; problem dotyczy miejsca importu, a nie treści funkcji.",
        importsBroken,
        importsRepair,
        "E0425",
      ),
      exercise({
        id: "imports-debug",
        kind: "debug",
        title: "Przenieś użycie do właściwego zakresu",
        prompt:
          "Napraw screen::show, wprowadzając istniejącą tag w screen przez use. show ma zwracać Wiadomość: i spację przed tekstem po trim. Nie duplikuj funkcji tag. Import w korzeniu można usunąć, jeśli przestaje być potrzebny.",
        code: importsBroken,
        solution: importsRepair,
        error: "E0425",
        tests: `#[test]
fn child_scope_uses_the_existing_function() {
    assert_eq!(crate::screen::show("  gotowe  "), "Wiadomość: gotowe");
    assert_eq!(crate::screen::show(""), "Wiadomość: ");
}`,
        hints: [
          "Import musi być widoczny tam, gdzie używasz krótkiej nazwy.",
          "Wewnątrz screen dodaj use crate::messages::tag;.",
        ],
      }),
      exercise({
        id: "imports-modify",
        kind: "modify",
        title: "Udostępnij fasadę formatowania",
        prompt:
          "Fasada to mały zestaw nazw, przez które klient używa większego wnętrza. Zachowaj prywatne incoming i outgoing oraz ich funkcje label. Udostępnij je z formats przez pub use jako incoming_label i outgoing_label. W pair wprowadź dwie funkcje label lokalnymi aliasami i zwróć ich wyniki w kolejności IN, OUT, oddzielone dokładnie spacją, pionową kreską i spacją. Dla pustego tekstu wynik to IN: | OUT:. Nie upubliczniaj modułów implementacji.",
        code: formatsStarter,
        solution: formatsSolution,
        tests: formatsTests,
        gate: true,
        forbidden: [
          "pub mod incoming",
          "pub mod outgoing",
          "pub(crate) mod incoming",
          "pub(crate) mod outgoing",
        ],
        hints: [
          "Re-eksport może jednocześnie nadać alias: pub use ścieżka as nazwa;.",
          "W pair użyj dwóch różnych nazw lokalnych, aby oba label były dostępne bez kolizji.",
        ],
      }),
      exercise({
        id: "imports-transfer",
        kind: "apply",
        title: "Zmień wnętrze, zachowaj prosty dostęp",
        prompt:
          "Zbuduj fasadę display. Prywatne short i long definiują funkcje label. Udostępnij je przez pub use jako short_label i long_label. W pair użyj lokalnych aliasów do obu label i zwróć krótki wynik, separator | otoczony pojedynczymi spacjami, a potem długi wynik. Zachowaj trim w istniejących funkcjach i prywatność obu modułów. Dla tekstu x wynik to [x] | Nazwa: x.",
        code: displayStarter,
        solution: displaySolution,
        tests: displayTests,
        gate: true,
        forbidden: [
          "pub mod short",
          "pub mod long",
          "pub(crate) mod short",
          "pub(crate) mod long",
        ],
        hints: [
          "Publiczne nazwy klienta mogą różnić się od nazw definicji.",
          "Re-eksporty mają należeć do display, a aliasy wywołań mogą należeć tylko do pair.",
        ],
      }),
      choose(
        "imports-explain",
        "explain",
        "Wyjaśnij trwałość API",
        "Zmieniasz nazwę prywatnego modułu incoming na received, ale chcesz zachować formats::incoming_label dla klientów. Co aktualizujesz?",
        [
          "Ścieżkę w re-eksporcie, zachowując jego publiczny alias",
          "Wszystkie wywołania klienta, bo alias nie może zostać",
          "Nic, Rust sam odgadnie nową ścieżkę definicji",
        ],
        [
          "Publiczna nazwa może pozostać stała, kiedy wskazana definicja przesuwa się wewnątrz modułu.",
          "Alias pozwala właśnie oddzielić publiczną nazwę od prywatnego położenia implementacji.",
          "Ścieżki muszą odpowiadać nowemu drzewu; zmieniasz je świadomie.",
        ],
      ),
      choose(
        "imports-recall",
        "recall",
        "Odtwórz trzy narzędzia",
        "Które przypisanie jest poprawne?",
        [
          "use — nazwa w zakresie; as — alias; pub use — publiczny re-eksport",
          "use — kopia kodu; as — uruchomienie; pub use — nowy crate",
          "use — dostęp do każdego pola; as — zmiana typu; pub use — wyłączenie prywatności",
        ],
        [
          "Te narzędzia organizują dostępne nazwy bez powielania implementacji.",
          "Żadne z tych poleceń nie tworzy kopii implementacji ani nowego crate.",
          "W tej składni as nadaje alias importu. Prywatne pola nadal pozostają prywatne.",
        ],
      ),
    ],
    misconceptions: [
      "use kopiuje implementację do nowego modułu.",
      "Import rodzica automatycznie staje się krótką nazwą dziecka.",
      "Publiczny re-eksport wymaga publicznego modułu implementacji.",
    ],
    transferTask:
      "Zbuduj drugą fasadę dla krótkiego i długiego formatu, bez ujawniania wewnętrznego drzewa.",
    evidenceGate:
      "Jedna z fasad udostępnia oba wymagane re-eksporty i składa poprawne wyniki przy zachowaniu prywatnych modułów.",
    sourceIds: ["cargo-book-use", "cargo-reference-visibility"],
    sessionStops: [
      {
        afterStepId: "imports-transfer",
        title: "Opcjonalna przerwa po fasadzie API",
        nextGoal:
          "Wróć do granicy Cargo i sprawdź, które nazwy pozostają publiczne.",
      },
    ],
  },
  {
    id: "cargo-package-integration",
    moduleId: "modules-cargo",
    conceptIds: ["cargo-targets"],
    competencyIds: ["integrate-cargo-targets"],
    prerequisites: ["imports-and-reexports"],
    title: "Cargo: biblioteka i program mają osobne granice",
    subtitle: "Przygotowujesz API do prawdziwego pakietu, testów i klienta.",
    minutes: 40,
    outcomes: [
      "Odróżnisz pakiet opisany w Cargo.toml od kompilowanego crate.",
      "Wyjaśnisz role src/lib.rs, src/main.rs i tests/integration.rs.",
      "Zbudujesz publiczną granicę API oraz klienta i wybierzesz właściwe polecenia Cargo.",
    ],
    steps: [
      run(
        "cargo-run",
        "Uruchom API i jego klienta",
        "Cargo zarządza pakietem: katalogiem z manifestem Cargo.toml opisującym m.in. nazwę, wersję, edycję i zależności. Target to wynik, który Cargo może zbudować, np. bibliotekę lub program. Konwencjonalnie src/lib.rs jest korzeniem crate biblioteki, a src/main.rs korzeniem osobnego crate programu. Pakiet może mieć jedną bibliotekę i wiele programów, np. z src/bin/, ale potrzebuje co najmniej jednego targetu biblioteki lub programu. Poniższy przykład nadal jest jednym źródłem i jednym crate. dispatch reprezentuje granicę API, a desk jest klientem używającym tylko jej publicznych nazw. To przygotowanie do rozdzielenia kodu, nie uruchomienie Cargo w przeglądarce. Metoda label(&self) -> &str pożycza tekst pola; Rust wiąże użyteczność tego widoku z pożyczką obiektu. Najpierw uruchom wyniki poprawnej etykiety i dwóch różnych błędów. " +
          dispatchContract,
        dispatchRun,
        "przyjęto: Szkło\nbrak etykiety\njedna linia\n",
      ),
      choose(
        "cargo-predict",
        "predict",
        "Przewidź granicę prawdziwego pakietu",
        "Pakiet todo-cli-workshop ma src/lib.rs i src/main.rs. Domyślna nazwa crate biblioteki zastępuje myślniki podkreśleniami: todo_cli_workshop. Jak main.rs powinien użyć publicznego API biblioteki?",
        [
          "Przez todo_cli_workshop::..., bo main.rs jest osobnym crate",
          "Przez crate::..., bo crate zawsze oznacza bibliotekę pakietu",
          "Przez mod lib;, aby drugi raz dołączyć plik biblioteki",
        ],
        [
          "Ścieżka od nazwy biblioteki przekracza prawdziwą granicę crate i wymaga publicznego API.",
          "W main.rs crate wskazuje korzeń crate programu, a nie automatycznie bibliotekę.",
          "mod lib tworzyłoby moduł w programie, nie korzystanie z osobnego targetu biblioteki. To niepotrzebne dublowanie jej drzewa.",
        ],
      ),
      compilerError(
        "cargo-export-error",
        "Odróżnij pomocnik od eksportu",
        "Spróbuj upublicznić ready, które ma pub(crate). E0364 odrzuca rozszerzenie jego widoczności przez pub use. To prawdziwy test reguł Rust nawet w jednym pliku: publiczna fasada nie może obiecać większego dostępu niż pozwala definicja elementu.",
        exportBroken,
        exportRepair,
        "E0364",
      ),
      exercise({
        id: "cargo-debug",
        kind: "debug",
        title: "Napraw publiczną obietnicę",
        prompt:
          "status::ready ma być częścią publicznego API i zwracać true. Napraw widoczność definicji tak, aby istniejący publiczny re-eksport działał. Zachowaj prywatny detail; klient ma używać status::ready, nie wnętrza implementacji.",
        code: exportBroken,
        solution: exportRepair,
        error: "E0364",
        tests:
          "#[test]\nfn ready_is_available_through_public_facade() { assert!(crate::status::ready()); }",
        forbidden: ["pub mod detail", "pub(crate) mod detail"],
        hints: [
          "Publiczny re-eksport nie może rozszerzyć pub(crate) na dostęp publiczny.",
          "Publiczna ma być funkcja ready w detail. Sam moduł detail może pozostać prywatny.",
        ],
      }),
      exercise({
        id: "cargo-modify",
        kind: "modify",
        title: "Dokończ API oraz klienta",
        prompt:
          "Napraw walidację bibliotecznego API i obsługę błędów w jego kliencie. Zachowaj prywatny model, prywatne pole label i publiczne re-eksporty. " +
          dispatchContract +
          " Testy uruchamiają te moduły w jednym źródle: potwierdzają zachowanie API i klienta, lecz nie konfigurację Cargo ani dostęp z osobnego crate.",
        code: dispatchStarter,
        solution: dispatchSolution,
        tests: dispatchTests,
        gate: true,
        forbidden: [
          "pub mod model",
          "pub(crate) mod model",
          "pub label:",
          "pub(crate) label:",
          "pub(super) label:",
          ".unwrap(",
          ".expect(",
        ],
        hints: [
          "Waliduj obcięty tekst przed utworzeniem Parcel, a potem zachowaj wariant błędu aż do klienta.",
          "Empty i Multiline są różnymi stanami. Fasada re-eksportuje typy, aby klient nie wchodził do model.",
        ],
      }),
      exercise({
        id: "cargo-blank",
        kind: "blank",
        title: "Pusta strona: zapisy do klubu",
        prompt: clubContract,
        code: "",
        solution: clubSolution,
        tests: clubTests,
        gate: true,
        forbidden: [
          "pub mod model",
          "pub(crate) mod model",
          "pub name:",
          "pub(crate) name:",
          "pub(super) name:",
          ".unwrap(",
          ".expect(",
        ],
        hints: [
          "Oddziel reguły poprawnej wartości od tego, jak klient zamienia wynik na komunikat.",
          "Prywatne pole wymaga kontrolowanej konstrukcji. Publiczna fasada udostępnia typ, błąd oraz operację, a klient rozpatruje oba warianty błędu.",
        ],
      }),
      choose(
        "cargo-local-workflow",
        "explain",
        "Przenieś strukturę na dysk",
        "Lokalnie cargo new --lib --edition 2024 parcel-workshop tworzy pakiet z biblioteką. Po dodaniu src/main.rs uzyskasz także program. Jeśli wyjmiesz zawartość mod dispatch do src/lib.rs, klient w main.rs użyje parcel_workshop::register; crate:: wewnątrz biblioteki nadal oznacza jej własny korzeń. Zamiast inline mod model { ... } możesz napisać mod model; w lib.rs i przenieść samą zawartość do src/model.rs. Nie powtarzasz wtedy otaczającego mod model w pliku. Samo utworzenie pliku go nie dołącza: potrzebna jest deklaracja mod. Test w tests/integration.rs jest osobnym crate, więc również importuje publiczne API przez nazwę biblioteki. #[test] oznacza funkcję testową uruchamianą przez cargo test; poznałeś takie asercje w ćwiczeniach. Pobierany w następnym etapie projekt Todo stosuje ten układ. Który opis poleceń uruchamianych w katalogu z Cargo.toml jest poprawny?",
        [
          "cargo check sprawdza kod; cargo build buduje; cargo test uruchamia testy; cargo run uruchamia program",
          "cargo check uruchamia main, a cargo test tylko sprawdza nazwy plików",
          "Przycisk Uruchom w tej lekcji wykonuje Cargo.toml i wszystkie pliki projektu",
        ],
        [
          "check pomija końcowe generowanie kodu wynikowego. build buduje wybrane targety. test buduje i uruchamia testy. run buduje w razie potrzeby i uruchamia wybrany program; przy wielu programach użyj --bin nazwa. cargo check --all-targets obejmuje też m.in. kod testów i przykładów.",
          "check nie uruchamia main. test faktycznie uruchamia funkcje testowe i sprawdza ich asercje.",
          "Runner tej aplikacji kompiluje jedno źródło Rust. Manifest, fizyczne pliki i granice crate potwierdzisz lokalnymi poleceniami w pobranym projekcie.",
        ],
      ),
      choose(
        "cargo-recall",
        "recall",
        "Odtwórz granicę dowodu",
        "Testy API w przeglądarce przeszły. Co jeszcze musi potwierdzić lokalny pakiet?",
        [
          "Cargo wykrywa targety i pliki, a osobny klient oraz test integracyjny używają publicznego API",
          "Nic: jeden plik dowodzi poprawności wszystkich ścieżek na dysku",
          "Tylko to, że każda funkcja biblioteki jest publiczna",
        ],
        [
          "To dodatkowe właściwości struktury projektu i granic crate. Sprawdź je przez cargo check --all-targets, cargo test i cargo run zgodnie z README projektu.",
          "Moduły inline nie testują istnienia Cargo.toml, układu plików ani zależności między targetami.",
          "Publiczne powinno być potrzebne API; pomocniki i chroniony stan mogą pozostać prywatne.",
        ],
      ),
    ],
    misconceptions: [
      "Pakiet i crate to zawsze to samo.",
      "src/main.rs może używać pub(crate) biblioteki, bo leży w tym samym pakiecie.",
      "Dodanie pliku model.rs automatycznie dołącza go do drzewa modułów.",
      "Test jednego źródła w przeglądarce potwierdza działanie całego Cargo projektu.",
    ],
    transferTask:
      "Zbuduj od pustej strony API członkostwa i klienta, a następnie wyjaśnij, które fragmenty staną się biblioteką, programem i testem integracyjnym.",
    evidenceGate:
      "Jedno z dwóch zadań z kodem łączy publiczną fasadę, chroniony model i klienta zachowującego wszystkie wyniki. Dowód uruchomienia rzeczywistego Cargo należy do lokalnego projektu.",
    sourceIds: [
      "cargo-book-packages",
      "cargo-book-separate-files",
      "cargo-guide-layout",
      "cargo-reference-targets",
      "cargo-reference-visibility",
      "cargo-command-new",
      "cargo-command-check",
      "cargo-command-build",
      "cargo-command-test",
      "cargo-command-run",
    ],
    sessionStops: [
      {
        afterStepId: "cargo-modify",
        title: "Opcjonalna przerwa przed pustą stroną",
        nextGoal:
          "Wróć do Cargo: biblioteka i program mają osobne granice. Następny krok to cargo-blank.",
      },
    ],
  },
];

export const cargoReviewExercises: Record<string, LessonStep> = {
  "module-paths": exercise({
    id: "review-module-paths",
    kind: "debug",
    title: "Powtórka: droga przez nowe drzewo",
    prompt:
      "Napraw drogę do prefix rodzica wewnątrz garden::labels::make. Zachowaj clean w bieżącym module i poprawne już wywołanie make w view. Obie funkcje mają zwracać Roślina: TEKST z trim na brzegach. Nie przenoś definicji ani nie zmieniaj ich wyników.",
    code: `mod garden {
    fn prefix() -> String { String::from("Roślina") }
    pub mod labels {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn make(text: &str) -> String {
            format!("{}: {}", crate::prefix(), self::clean(text))
        }
    }
}
fn view(text: &str) -> String { crate::garden::labels::make(text) }`,
    solution: `mod garden {
    fn prefix() -> String { String::from("Roślina") }
    pub mod labels {
        fn clean(text: &str) -> String { String::from(text.trim()) }
        pub fn make(text: &str) -> String {
            format!("{}: {}", super::prefix(), self::clean(text))
        }
    }
}
fn view(text: &str) -> String { crate::garden::labels::make(text) }`,
    tests: `#[test]
fn label_routes_from_root_and_parent() {
    assert_eq!(view("  mięta  "), "Roślina: mięta");
    assert_eq!(crate::garden::labels::make("a  b"), "Roślina: a  b");
    assert_eq!(view(""), "Roślina: ");
}`,
    error: "E0425",
    hints: [
      "prefix znajduje się w rodzicu labels, nie w korzeniu crate.",
      "W make użyj super::prefix(); ścieżka w view już przechodzi przez właściwe poziomy.",
    ],
  }),
  "visibility-boundaries": exercise({
    id: "review-visibility-boundaries",
    kind: "debug",
    title: "Powtórka: zakres obejmujący zero",
    prompt:
      "Napraw moisture::Reading::new. Każde u8 od 0 do 100 włącznie jest poprawne i ma być odczytywane przez value(). Większe daje ReadingError::Outside. W tej domenie zero jest dozwolone. Zachowaj prywatne value i publiczne API; nie używaj unwrap ani expect.",
    code: `mod moisture {
    #[derive(Debug, PartialEq, Eq)]
    pub enum ReadingError { Outside }
    pub struct Reading { value: u8 }
    impl Reading {
        pub fn new(value: u8) -> Result<Reading, ReadingError> {
            if value == 0 { Err(ReadingError::Outside) } else { Ok(Reading { value }) }
        }
        pub fn value(&self) -> u8 { self.value }
    }
}`,
    solution: `mod moisture {
    #[derive(Debug, PartialEq, Eq)]
    pub enum ReadingError { Outside }
    pub struct Reading { value: u8 }
    impl Reading {
        pub fn new(value: u8) -> Result<Reading, ReadingError> {
            if value > 100 { Err(ReadingError::Outside) } else { Ok(Reading { value }) }
        }
        pub fn value(&self) -> u8 { self.value }
    }
}`,
    tests: `#[test]
fn new_invariant_includes_zero() {
    for value in [0, 1, 50, 99, 100] {
        match crate::moisture::Reading::new(value) {
            Ok(reading) => assert_eq!(reading.value(), value),
            Err(_) => panic!("valid reading rejected"),
        }
    }
    for value in [101, u8::MAX] {
        match crate::moisture::Reading::new(value) {
            Ok(_) => panic!("invalid reading accepted"),
            Err(error) => assert_eq!(error, crate::moisture::ReadingError::Outside),
        }
    }
}`,
    forbidden: [
      "pub value:",
      "pub(crate) value:",
      "pub(super) value:",
      ".unwrap(",
      ".expect(",
    ],
    hints: [
      "Zacznij od kontraktu tej domeny, nie od zapamiętanego zakresu miejsc.",
      "Jedyny niepoprawny zakres u8 jest tutaj powyżej 100.",
    ],
  }),
  "scoped-imports": exercise({
    id: "review-scoped-imports",
    kind: "modify",
    title: "Powtórka: importy dwóch opisów",
    prompt:
      "Pozostaw prywatne moduły local i remote. Udostępnij ich funkcje describe z modułu labels jako local_label i remote_label przez pub use. W both użyj lokalnych aliasów i zwróć ich wyniki w kolejności local, remote, oddzielone dokładnie przecinkiem bez spacji. Dla x wynik to L:x,R:x. Argument zachowaj bez trim.",
    code: `mod labels {
    mod local { pub fn describe(text: &str) -> String { format!("L:{}", text) } }
    mod remote { pub fn describe(text: &str) -> String { format!("R:{}", text) } }
    pub fn both(text: &str) -> String { String::from(text) }
}`,
    solution: `mod labels {
    mod local { pub fn describe(text: &str) -> String { format!("L:{}", text) } }
    mod remote { pub fn describe(text: &str) -> String { format!("R:{}", text) } }
    pub use self::local::describe as local_label;
    pub use self::remote::describe as remote_label;
    pub fn both(text: &str) -> String {
        use self::local::describe as nearby;
        use self::remote::describe as distant;
        format!("{},{}", nearby(text), distant(text))
    }
}`,
    tests: `#[test]
fn two_reexports_keep_exact_input() {
    use crate::labels::{local_label, remote_label, both};
    for text in ["", " x ", "żółć"] {
        assert_eq!(local_label(text), format!("L:{}", text));
        assert_eq!(remote_label(text), format!("R:{}", text));
        assert_eq!(both(text), format!("L:{},R:{}", text, text));
    }
}`,
    forbidden: [
      "pub mod local",
      "pub mod remote",
      "pub(crate) mod local",
      "pub(crate) mod remote",
    ],
    hints: [
      "Obie definicje mają tę samą nazwę, więc ich nazwy dla klienta muszą je odróżniać.",
      "pub use self::local::describe as local_label; jest publiczną nazwą, a zwykłe use z as wystarczy wewnątrz both.",
    ],
  }),
  "cargo-targets": exercise({
    id: "review-cargo-targets",
    kind: "debug",
    title: "Powtórka: klient publicznej granicy",
    prompt:
      "Napraw dostęp z client do API meter. Klient ma importować Kind i classify z meter, nie z prywatnego model. Wartość u8 równa zero to Kind::Empty, każda dodatnia to Kind::Present. client::show daje odpowiednio pusty lub aktywny. Zachowaj prywatny model i udostępnij jego elementy publicznym re-eksportem z meter. To ćwiczenie jednego źródła; osobny program Cargo później importowałby API od nazwy biblioteki.",
    code: `mod meter {
    mod model {
        pub enum Kind { Empty, Present }
        pub fn classify(value: u8) -> Kind {
            if value == 0 { Kind::Empty } else { Kind::Present }
        }
    }
}
mod client {
    use crate::meter::model::{Kind, classify};
    pub fn show(value: u8) -> String {
        match classify(value) {
            Kind::Empty => String::from("pusty"),
            Kind::Present => String::from("aktywny"),
        }
    }
}`,
    solution: `mod meter {
    mod model {
        pub enum Kind { Empty, Present }
        pub fn classify(value: u8) -> Kind {
            if value == 0 { Kind::Empty } else { Kind::Present }
        }
    }
    pub use self::model::{Kind, classify};
}
mod client {
    use crate::meter::{Kind, classify};
    pub fn show(value: u8) -> String {
        match classify(value) {
            Kind::Empty => String::from("pusty"),
            Kind::Present => String::from("aktywny"),
        }
    }
}`,
    tests: `#[test]
fn client_consumes_only_public_api() {
    use crate::meter::{Kind, classify};
    assert!(matches!(classify(0), Kind::Empty));
    for value in [1, 100, u8::MAX] {
        assert!(matches!(classify(value), Kind::Present));
        assert_eq!(crate::client::show(value), "aktywny");
    }
    assert_eq!(crate::client::show(0), "pusty");
}`,
    error: "E0603",
    forbidden: ["pub mod model", "pub(crate) mod model"],
    hints: [
      "Nie zmieniaj widoczności całego wnętrza tylko po to, by klient mógł się do niego dostać.",
      "Re-eksportuj Kind i classify w meter; import klienta powinien kończyć się bez segmentu model.",
    ],
  }),
};

export const cargoModule: CourseModule = {
  id: "modules-cargo",
  title: "Moduły i Cargo: granice programu",
  whyItMatters:
    "Rosnący program potrzebuje czytelnych nazw, kontrolowanego stanu i publicznego API, które da się wykorzystać z osobnego programu oraz testów.",
  capabilities: [
    "Nawigujesz po drzewie modułów przez crate, self i super.",
    "Chronisz niezmienniki typów prywatnymi polami i konstruktorami.",
    "Projektujesz małą publiczną fasadę przez importy i re-eksporty.",
    "Rozpoznajesz osobne crate biblioteki i programu w jednym pakiecie Cargo.",
  ],
  prerequisites: ["todo-project"],
  lessonIds: cargoLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zagnieżdżone API i klient w korzeniu zachowują ten sam wynik.",
    "Konstruktor chroni pełny zakres danych, a prywatne pole zostaje ukryte.",
    "Publiczna fasada udostępnia wymagane nazwy bez upubliczniania modułów implementacji.",
    "Klient rozróżnia wyniki API i jest gotowy do przeniesienia za granicę crate; rzeczywisty pakiet sprawdzasz lokalnie.",
  ],
  projectConnection:
    "Przygotowujesz rdzeń Todo do biblioteki z osobnym programem i testami integracyjnymi. Następny etap doda wejście i wyjście oraz pobierany pakiet Cargo. Ćwiczenia tego modułu używają rzeczywistych modułów inline w jednym źródle.",
  assessmentId: "cargo-package-integration/cargo-blank",
  gateCriteria: [
    {
      id: "cargo-module-paths-gate",
      label:
        "Zagnieżdżona funkcja i klient w korzeniu zachowują kontrakt tekstu.",
      taskRefs: [
        { lessonId: "module-tree-paths", stepId: "paths-modify" },
        { lessonId: "module-tree-paths", stepId: "paths-transfer" },
      ],
    },
    {
      id: "cargo-visibility-gate",
      label:
        "Konstruktor odrzuca oba końce niepoprawnego zakresu i zachowuje chroniony odczyt.",
      taskRefs: [
        { lessonId: "module-visibility", stepId: "visibility-modify" },
        { lessonId: "module-visibility", stepId: "visibility-transfer" },
      ],
    },
    {
      id: "cargo-import-api-gate",
      label:
        "Fasada udostępnia oba formaty i ich połączenie przez publiczne nazwy.",
      taskRefs: [
        { lessonId: "imports-and-reexports", stepId: "imports-modify" },
        { lessonId: "imports-and-reexports", stepId: "imports-transfer" },
      ],
    },
    {
      id: "cargo-library-client-gate",
      label:
        "Chroniony model, publiczna fasada i klient zachowują sukces oraz oba warianty błędu w jednym źródle.",
      taskRefs: [
        { lessonId: "cargo-package-integration", stepId: "cargo-modify" },
        { lessonId: "cargo-package-integration", stepId: "cargo-blank" },
      ],
    },
  ],
};
