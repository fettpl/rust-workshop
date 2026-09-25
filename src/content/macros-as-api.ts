import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-25";

export const macrosAsApiSources: Source[] = [
  {
    id: "macros-book-by-example",
    title: "The Rust Programming Language: Macros",
    url: "https://doc.rust-lang.org/book/ch20-05-macros.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów `macro_rules!`, ekspansji i ograniczeń deklaratywnych makr.",
  },
  {
    id: "macros-reference-by-example",
    title: "Rust Reference: Macros By Example",
    url: "https://doc.rust-lang.org/reference/macros-by-example.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po aktualizacji reguł dopasowania, powtórzeń, higieny i fragmentów makra.",
  },
  {
    id: "macros-edition-2024-fragments",
    title: "Rust 2024 Edition Guide: Macro Fragment Specifiers",
    url: "https://doc.rust-lang.org/edition-guide/rust-2024/macro-fragment-specifiers.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie edition lub MSRV, zwłaszcza dla różnicy `expr` i `expr_2021`.",
  },
];

export const macrosAsApiCompetencies: Competency[] = [
  {
    id: "macro-exactly-once-contract",
    title:
      "Projektujesz regułę `macro_rules!`, która przechwytuje każde wyrażenie i oblicza je dokładnie raz w kolejności wejścia.",
  },
  {
    id: "macro-repetition-grammar-contract",
    title:
      "Definiujesz powtórzenie obsługujące zero, jeden i wiele elementów oraz opcjonalny separator końcowy.",
  },
  {
    id: "macro-exported-path-contract",
    title:
      "Utrzymujesz publiczną ścieżkę `$crate` i dobierasz fragment `expr` do kontraktu makra w Rust 2024.",
  },
];

export const macrosAsApiConcepts: Concept[] = [
  {
    id: "macros-exactly-once",
    title: "Przechwycenie wyrażenia i dokładnie jedno obliczenie",
    prerequisites: ["api-compatible-surface"],
    competencyIds: ["macro-exactly-once-contract"],
    reviewPrompt:
      "Dlaczego lokalne `let` wewnątrz rozwinięcia makra chroni kontrakt dokładnie jednego obliczenia?",
    reviewAnswer:
      "Każde wejściowe wyrażenie trafia do osobnego lokalnego wiązania, a dalszy kod używa tego wiązania. Test z efektami ubocznymi sprawdza kolejność i liczbę wywołań, więc czysty wynik nie wystarczy.",
    distinguish:
      "Makro może skrócić powtarzalną składnię, lecz zwykła funkcja jest prostsza przy stałej liczbie argumentów i typowanym zachowaniu. Browserowy plik sprawdza model; zewnętrzny crate potwierdza granicę API.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "macros-repetition-grammar",
    title: "Powtórzenie, pusty input i przecinek końcowy",
    prerequisites: ["macros-exactly-once"],
    competencyIds: ["macro-repetition-grammar-contract"],
    reviewPrompt:
      "Jak zapisać regułę dla zera lub większej liczby par z opcjonalnym przecinkiem końcowym?",
    reviewAnswer:
      "Użyj `$( $name:expr => $value:expr ),* $(,)?`: gwiazdka dopuszcza zero elementów, separator należy do powtórzenia, a osobna opcjonalna grupa dopuszcza najwyżej jeden przecinek na końcu.",
    distinguish:
      "To kontrakt gramatyki wywołania, nie dowód publicznej widoczności typu ani zewnętrznej rezolucji ścieżki. Te granice sprawdza zaufany verifier Cargo.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "macros-exported-paths-2024",
    title: "Eksport, `$crate` i fragment `expr` w Rust 2024",
    prerequisites: ["macros-repetition-grammar"],
    competencyIds: ["macro-exported-path-contract"],
    reviewPrompt:
      "Co zapewnia `$crate`, a co zmienia wybór `expr` zamiast `expr_2021` w edycji 2024?",
    reviewAnswer:
      "`$crate` wskazuje crate definiujący makro, więc klient z lokalnym `Reading` nadal używa publicznego typu biblioteki; widoczność tego typu nadal musi być publiczna. W Rust 2024 fragment `expr` obejmuje także top-level `const { ... }`, czego `expr_2021` nie dopuszcza.",
    distinguish:
      "Higiena makr ma reguły zależne od rodzaju nazwy; `$crate` rozwiązuje publiczną ścieżkę biblioteki, lecz nie omija prywatności. Jednoplikowe ćwiczenie nie zastępuje klienta w osobnym crate.",
    evidenceArtifact: "rust-code",
  },
];

const macroPrelude = `#[derive(Debug, PartialEq, Eq)]
pub struct Reading {
    pub name: String,
    pub value: i32,
}

impl Reading {
    pub fn new(name: impl Into<String>, value: i32) -> Self {
        Self { name: name.into(), value }
    }
}

#[macro_export]
macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut readings = ::std::vec::Vec::<$crate::Reading>::new();
        $(
            let captured_name = $name;
            let captured_value = $value;
            readings.push($crate::Reading::new(captured_name, captured_value));
        )*
        readings
    }};
}`;

const exactStarter = `#[derive(Debug, PartialEq, Eq)]
pub struct Reading { pub name: String, pub value: i32 }
impl Reading {
    pub fn new(name: impl Into<String>, value: i32) -> Self { Self { name: name.into(), value } }
}

macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut readings = ::std::vec::Vec::new();
        $( let _duplicate_probe = $value; readings.push(Reading::new($name, $value)); )*
        readings
    }};
}`;

const exactTests = `fn record_name<'a>(events: &'a mut Vec<&'static str>, label: &'static str) -> &'static str {
    events.push(label);
    label
}
fn record_value<'a>(events: &'a mut Vec<&'static str>, label: &'static str, value: i32) -> i32 {
    events.push(label);
    value
}

#[test]
fn supplied_names_and_values_are_evaluated_once_in_input_order() {
    let mut events = Vec::new();
    let readings = metric_readings!(
        record_name(&mut events, "name-a") => record_value(&mut events, "value-a", 10),
        record_name(&mut events, "name-b") => record_value(&mut events, "value-b", 20),
    );
    assert_eq!(events, ["name-a", "value-a", "name-b", "value-b"]);
    assert_eq!(readings, vec![
        Reading::new("name-a", 10),
        Reading::new("name-b", 20),
    ]);
}`;

const exactBlankCode = `${macroPrelude}

fn log_name<'a>(events: &'a mut Vec<&'static str>, label: &'static str) -> &'static str {
    events.push(label);
    label
}
fn log_value<'a>(events: &'a mut Vec<&'static str>, label: &'static str, value: i32) -> i32 {
    events.push(label);
    value
}

`;

const exactBlankTests = `#[test]
fn blank_transfer_preserves_evaluation_order() {
    let mut events = Vec::new();
    let output = metric_readings!(
        log_name(&mut events, "first-name") => log_value(&mut events, "first-value", 4),
        log_name(&mut events, "second-name") => log_value(&mut events, "second-value", 8),
    );
    assert_eq!(events, ["first-name", "first-value", "second-name", "second-value"]);
    assert_eq!(output, vec![
        Reading::new("first-name", 4),
        Reading::new("second-name", 8),
    ]);
}`;

const exactReviewCode = `${macroPrelude}`;

const exactReviewTests = `#[test]
fn retrieval_keeps_one_evaluation_for_each_non_copy_value() {
    let mut calls = 0;
    let readings = metric_readings!(
        { calls += 1; "temperature".to_owned() } => { calls += 1; 21 },
    );
    assert_eq!(calls, 2);
    assert_eq!(readings[0], Reading::new("temperature", 21));
}`;

const repetitionStarter = `#[derive(Debug, PartialEq, Eq)]
pub struct Reading { pub name: String, pub value: i32 }
impl Reading {
    pub fn new(name: impl Into<String>, value: i32) -> Self { Self { name: name.into(), value } }
}

macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),+) => {{
        let mut readings = ::std::vec::Vec::new();
        $( readings.push(Reading::new($name, $value)); )+
        readings
    }};
}`;

const repetitionTests = `#[test]
fn grammar_accepts_zero_one_many_and_one_trailing_comma() {
    assert_eq!(metric_readings!(), Vec::<Reading>::new());
    assert_eq!(metric_readings!("one" => 1), vec![Reading::new("one", 1)]);
    assert_eq!(metric_readings!("a" => 1, "b" => 2,), vec![
        Reading::new("a", 1),
        Reading::new("b", 2),
    ]);
}`;

const repetitionBlankCode = `macro_rules! checkpoints {
    ($( $name:expr ),* $(,)?) => {{
        let mut labels = ::std::vec::Vec::<String>::new();
        $( labels.push($name.to_owned()); )*
        labels
    }};
}
`;

const repetitionBlankTests = `#[test]
fn blank_transfer_accepts_empty_and_trailing_separator() {
    assert_eq!(checkpoints!(), Vec::<String>::new());
    assert_eq!(checkpoints!("start", "middle", "end",), vec![
        "start".to_owned(),
        "middle".to_owned(),
        "end".to_owned(),
    ]);
    assert_eq!(checkpoints!("solo",), vec!["solo".to_owned()]);

    fn record<'a>(events: &'a mut Vec<&'static str>, label: &'static str) -> &'static str {
        events.push(label);
        label
    }
    let mut events = Vec::new();
    let observed = checkpoints!(
        record(&mut events, "first"),
        record(&mut events, "second"),
    );
    assert_eq!(events, ["first", "second"]);
    assert_eq!(observed, vec!["first".to_owned(), "second".to_owned()]);
}`;

const repetitionReviewCode = `macro_rules! readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut output = ::std::vec::Vec::<(String, i32)>::new();
        $( output.push(($name.to_owned(), $value)); )*
        output
    }};
}`;

const repetitionReviewTests = `#[test]
fn retrieval_keeps_order_for_empty_and_nonempty_input() {
    assert_eq!(readings!(), Vec::<(String, i32)>::new());
    assert_eq!(readings!("low" => 2, "high" => 9,), vec![
        ("low".to_owned(), 2),
        ("high".to_owned(), 9),
    ]);
}`;

const exportedStarter = `#[derive(Debug, PartialEq, Eq)]
pub struct Reading { pub name: String, pub value: i32 }
impl Reading {
    pub fn new(name: impl Into<String>, value: i32) -> Self { Self { name: name.into(), value } }
}

#[macro_export]
macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut readings = ::std::vec::Vec::<Reading>::new();
        $(
            readings.push(Reading::new($name, $value));
        )*
        readings
    }};
}

mod external_like {
    struct Reading;
    #[test]
    fn local_type_does_not_supply_the_macro_result() {
        let readings = crate::metric_readings!("cpu" => const { 7 },);
        assert_eq!(readings, vec![crate::Reading::new("cpu", 7)]);
    }
}`;

const exportedTests = `mod caller_shadow {
    struct Reading;

    #[test]
    fn caller_shadow_does_not_change_library_type() {
        let readings = crate::metric_readings!("cpu" => const { 7 },);
        assert_eq!(readings, vec![crate::Reading::new("cpu", 7)]);
    }
}

#[test]
fn rust_2024_expr_accepts_top_level_const_block() {
    let readings = metric_readings!("limit" => const { 9 },);
    assert_eq!(readings, vec![Reading::new("limit", 9)]);
}`;

const exportedBlankCode = `#[derive(Debug, PartialEq, Eq)]
pub struct Reading { pub name: String, pub value: i32 }
impl Reading {
    pub fn new(name: impl Into<String>, value: i32) -> Self { Self { name: name.into(), value } }
}

#[macro_export]
macro_rules! exported_pairs {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut output = ::std::vec::Vec::<$crate::Reading>::new();
        $( output.push($crate::Reading::new($name, $value)); )*
        output
    }};
}

mod client {
    struct Reading;
}`;

const exportedBlankTests = `mod client_tests {
    struct Reading;

    #[test]
    fn const_expression_and_crate_path_survive_a_caller_shadow() {
        let result = crate::exported_pairs!("latency" => const { 12 },);
        assert_eq!(result, vec![crate::Reading::new("latency", 12)]);
    }
}`;

const exportedReviewCode = `${macroPrelude}`;

const exportedReviewTests = `mod client {
    struct Reading;

    #[test]
    fn retrieval_uses_exported_type_and_2024_expression() {
        let result = crate::metric_readings!("queue" => const { 3 },);
        assert_eq!(result, vec![crate::Reading::new("queue", 3)]);
    }
}`;

function choiceStep(
  id: string,
  kind: "predict" | "explain" | "recall",
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
        explanations.map((explanation, index) => [String(index), explanation]),
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

function runStep(
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

function testStep(options: {
  id: string;
  kind: "modify" | "blank" | "apply";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "apply"
          ? "transfer"
          : "fix",
    evidenceGate: options.gate ?? false,
  };
}

const exactDebug = `macro_rules! once {
    ($value:expr) => {{
        let captured = $value;
        (captured, captured)
    }};
}

fn main() {
    let text = String::from("one reading");
    let _ = once!(text);
}`;

const exactDebugSolution = `macro_rules! once {
    ($value:expr) => {{
        let captured = $value;
        (captured.clone(), captured)
    }};
}

fn main() {
    let text = String::from("one reading");
    let _ = once!(text);
}`;

const repetitionDebug = `macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut output = ::std::vec::Vec::new();
        $( output.push(($name, $value)); )*
        output
    }};
}

fn main() {
    let _ = metric_readings!("a" => 1,,);
}`;

const repetitionDebugSolution = `macro_rules! metric_readings {
    ($( $name:expr => $value:expr ),* $(,)?) => {{
        let mut output = ::std::vec::Vec::new();
        $( output.push(($name, $value)); )*
        output
    }};
}

fn main() {
    let _ = metric_readings!("a" => 1,);
}`;

const exportedDebug = `macro_rules! edition_sensitive {
    ($value:expr_2021) => { $value };
}

fn main() {
    let _ = edition_sensitive!(const { 7 });
}`;

const exportedDebugSolution = `macro_rules! edition_sensitive {
    ($value:expr) => { $value };
}

fn main() {
    let _ = edition_sensitive!(const { 7 });
}`;

export const macrosAsApiLessons: Lesson[] = [
  {
    id: "macros-exactly-once",
    moduleId: "macros-as-api",
    conceptIds: ["macros-exactly-once"],
    competencyIds: ["macro-exactly-once-contract"],
    prerequisites: ["api-compatible-surface"],
    title: "Makro jako kontrakt: oblicz każdy argument raz",
    subtitle:
      "Zobaczysz efekty uboczne w kolejności wejścia i zapiszesz każde wyrażenie w lokalnym wiązaniu.",
    minutes: 19,
    outcomes: [
      "Wyjaśnisz, że matcher opisuje składnię, a rozwinięcie musi ustalić liczbę użyć wyrażenia.",
      "Zaimplementujesz makro pomiarów, które oblicza nazwę i wartość raz w kolejności par.",
      "Odrzucisz czysty przykład jako zbyt słaby dowód exactly-once i użyjesz efektu obserwowalnego.",
      "Rozpoznasz, kiedy stała liczba argumentów lepiej pasuje do zwykłej funkcji.",
    ],
    steps: [
      choiceStep(
        "macros-exactly-once-predict",
        "predict",
        "Przewidź kolejność efektów",
        "Makro przyjmuje pary `name => value`, a oba wyrażenia zapisują etykietę do dziennika. Która kolejność powinna wynikać z sekwencyjnego rozwinięcia par?",
        [
          "Pierwsza nazwa, pierwsza wartość, druga nazwa, druga wartość.",
          "Najpierw wszystkie nazwy, potem wszystkie wartości.",
          "Kolejność jest dowolna, bo macro_rules! nie zachowuje efektów.",
        ],
        0,
        [
          "Każda para rozwija się jako kolejny fragment instrukcji, więc efekty zachowują kolejność wejścia.",
          "Powtórzenie nie rozdziela automatycznie nazw i wartości na dwie fazy.",
          "Makro rozwija tokeny; wynik wykonywania nadal podlega kolejności instrukcji Rust.",
        ],
      ),
      runStep(
        "macros-exactly-once-run",
        "Uruchom odczyt",
        "Uruchom przykład z dwoma odczytami i porównaj wydruk. To obserwacja pliku przeglądarkowego, nie test granicy osobnego crate.",
        `${macroPrelude}

fn main() {
    let readings = metric_readings!("cpu" => 7, "queue" => 3,);
    for reading in readings {
        println!("{}={}", reading.name, reading.value);
    }
}`,
        "cpu=7\nqueue=3\n",
      ),
      choiceStep(
        "macros-exactly-once-explain",
        "explain",
        "Kiedy wybrać funkcję?",
        "Masz zawsze dokładnie dwa argumenty tego samego typu i żadnej potrzeby zmiany składni. Co jest najprostszym kontraktem?",
        [
          "Zwykła funkcja z typowanym podpisem, bo makro nie wnosi tu potrzebnej elastyczności składni.",
          "Makro zawsze, bo każda funkcja wykonuje argumenty dwa razy.",
          "Proceduralne makro, bo stała liczba argumentów wymaga parsera.",
        ],
        0,
        [
          "Funkcja daje typowanie i prostszą dokumentację, gdy arność i typy są stałe.",
          "Funkcja oblicza argument zgodnie z normalną semantyką wywołania; nie jest to powód do makra.",
          "Proceduralne makro byłoby nadmiarowe dla tego kontraktu.",
        ],
      ),
      testStep({
        id: "macros-exactly-once-gate",
        kind: "modify",
        title: "Zachowaj dokładnie jedno obliczenie",
        prompt:
          "Uzupełnij `metric_readings!` dla par `name => value`. Każde wejściowe wyrażenie ma zostać obliczone dokładnie raz, w kolejności wejścia, a wynik ma być `Vec<Reading>`. Testy wywołują funkcje zapisujące efekty do dziennika; sam poprawny wynik liczbowy nie wystarczy. To browserowy model zachowania; osobny crate w zaufanym verifierze sprawdzi później publiczną ścieżkę.",
        code: exactStarter,
        solution: `${macroPrelude}`,
        tests: exactTests,
        hints: [
          "W każdej iteracji powtórzenia najpierw przypisz `$name` i `$value` do lokalnych zmiennych.",
          "Użyj publicznego konstruktora `Reading::new`, lecz nie wywołuj ponownie żadnego wejściowego wyrażenia.",
        ],
        gate: true,
      }),
      {
        id: "macros-exactly-once-debug",
        kind: "debug",
        title: "Zobacz błąd podwójnego użycia",
        prompt:
          "Uruchom wadliwy helper, który przenosi `String`, a następnie próbuje użyć tej samej lokalnej wartości drugi raz. Odczytaj diagnostykę ruchu; to obserwacja błędu kompilacji przed oceną wyniku.",
        code: exactDebug,
        solution: exactDebugSolution,
        evaluator: { kind: "expected-error", diagnostic: "use of moved value" },
        expectedStatus: "compile-error",
        expectedDiagnostic: "use of moved value",
        evidenceKind: "exposure",
      },
      testStep({
        id: "macros-exactly-once-blank",
        kind: "blank",
        title: "Pusta strona: odczyty z dziennikiem",
        prompt:
          "Od zera napisz publiczne `Reading`, konstruktor oraz `metric_readings!` z matcherem par `name => value`. Makro ma zachować kolejność i dokładnie jedno obliczenie każdego wyrażenia; ukryte testy wywołają funkcje zapisujące kolejno `first-name`, `first-value`, `second-name`, `second-value`, a wynik ma zawierać dwa odczyty. Nie dostajesz startera ani gotowej ścieżki biblioteki.",
        solution: exactBlankCode,
        tests: exactBlankTests,
        hints: [
          "Jedna para powinna rozwinąć się do dwóch przypisań i jednego `push`.",
          "Test efektów ubocznych odróżnia dokładnie jedno obliczenie od przypadkowo poprawnego wyniku.",
        ],
        gate: true,
      }),
      choiceStep(
        "macros-exactly-once-recall",
        "recall",
        "Odtwórz regułę",
        "Który opis jest konieczny, aby makro nie powtarzało efektownego wyrażenia?",
        [
          "Przechwycić token do lokalnego `let`, a potem używać wyłącznie tego wiązania.",
          "Wstawić `$value` w każdym miejscu, w którym potrzebna jest liczba.",
          "Zażądać `Copy` od każdego wyrażenia bez zmiany rozwinięcia.",
        ],
        0,
        [
          "Lokalne wiązanie daje jedno miejsce obliczenia i kolejne użycia już obliczonej wartości.",
          "Każde wstawienie fragmentu może ponownie wykonać wyrażenie.",
          "Copy nie ogranicza liczby wywołań funkcji z efektami ubocznymi.",
        ],
      ),
    ],
    misconceptions: [
      "Czysty wynik liczbowy dowodzi exactly-once.",
      "Powtórzenie tokenu `$value` jest tym samym co użycie obliczonej zmiennej.",
      "Makro jest lepsze od funkcji przy każdym stałym podpisie.",
    ],
    transferTask:
      "Zaprojektuj małą funkcję dla stałej arności, a makro zostaw tylko tam, gdzie powtarzalna składnia wnosi wartość.",
    evidenceGate:
      "Gate można zaliczyć przez obserwację kolejności i liczby efektów w zadaniu głównym albo przez niezależną implementację z pustej kartki.",
    sourceIds: ["macros-book-by-example", "macros-reference-by-example"],
  },
  {
    id: "macros-repetition-grammar",
    moduleId: "macros-as-api",
    conceptIds: ["macros-repetition-grammar"],
    competencyIds: ["macro-repetition-grammar-contract"],
    prerequisites: ["macros-exactly-once"],
    title: "Powtórzenie makra: zero, wiele i przecinek",
    subtitle:
      "Zapiszesz gramatykę, która opisuje pusty, pojedynczy i wieloelementowy odczyt.",
    minutes: 19,
    outcomes: [
      "Rozróżnisz `*` i `+` w matcherze powtórzenia.",
      "Dopuścisz najwyżej jeden opcjonalny separator na końcu wywołania.",
      "Sprawdzisz pusty input, pojedynczą parę, wiele par i trailing comma przez testy Rust.",
      "Rozpoznasz błąd składni przed etapem działania makra.",
    ],
    steps: [
      choiceStep(
        "macros-repetition-grammar-predict",
        "predict",
        "Wybierz operator",
        "Który operator powtórzenia dopuści `metric_readings!()` bez sztucznego elementu?",
        [
          "`*`, bo dopuszcza zero lub więcej dopasowań.",
          "`+`, bo wymaga co najmniej jednego.",
          "`?`, bo opisuje dowolnie wiele par.",
        ],
        0,
        [
          "Gwiazdka obejmuje zero, jeden lub wiele elementów.",
          "Plus odrzuci pusty input.",
          "Znak zapytania dopuszcza najwyżej jeden element.",
        ],
      ),
      runStep(
        "macros-repetition-grammar-run",
        "Uruchom cztery kształty",
        "Uruchom wywołania puste, pojedyncze, wieloelementowe i z przecinkiem końcowym. Zauważ, że są to osobne przypadki gramatyki.",
        `${macroPrelude}

fn main() {
    println!("{}", metric_readings!().len());
    println!("{}", metric_readings!("one" => 1).len());
    println!("{}", metric_readings!("a" => 1, "b" => 2).len());
    println!("{}", metric_readings!("tail" => 3,).len());
}`,
        "0\n1\n2\n1\n",
      ),
      choiceStep(
        "macros-repetition-grammar-explain",
        "explain",
        "Oddziel powtórzenie od separatora",
        "Co daje osobna grupa `$(,)?` po powtórzeniu par?",
        [
          "Pozwala na najwyżej jeden przecinek końcowy bez tworzenia pustej pary.",
          "Pozwala na dowolną liczbę pustych par po ostatniej wartości.",
          "Wymusza co najmniej jedną parę przed rozwinięciem.",
        ],
        0,
        [
          "Separator końcowy jest opcjonalny i występuje raz poza powtórzeniem par.",
          "`?` nie oznacza dowolnej liczby elementów.",
          "Wymaganie co najmniej jednej pary pochodziłoby z `+`, nie z separatora.",
        ],
      ),
      testStep({
        id: "macros-repetition-grammar-gate",
        kind: "modify",
        title: "Uzupełnij gramatykę odczytów",
        prompt:
          "Zmień starter tak, aby `metric_readings!` akceptowało zero, jeden i wiele par `name => value` oraz najwyżej jeden przecinek końcowy. Testy sprawdzają kształty wywołania i kolejność danych; błędna składnia ma pozostać błędem kompilacji. Browserowy gate nie zastępuje zewnętrznego klienta Cargo.",
        code: repetitionStarter,
        solution: macroPrelude,
        tests: repetitionTests,
        hints: [
          "Zastąp `+` przez `*`, a po powtórzeniu dodaj osobne `$(,)?`.",
          "Nie wkładaj przecinka do wartości ani do `Vec`; separator jest tylko składnią matchera.",
        ],
        gate: true,
      }),
      {
        id: "macros-repetition-grammar-debug",
        kind: "debug",
        title: "Zobacz odrzucony pusty element",
        prompt:
          "Uruchom wywołanie z dwoma przecinkami. Kompilator powinien odrzucić pustą parę po poprawnym trailing comma; odczytaj nazwany fragment diagnostyki.",
        code: repetitionDebug,
        solution: repetitionDebugSolution,
        evaluator: { kind: "expected-error", diagnostic: "no rules expected" },
        expectedStatus: "compile-error",
        expectedDiagnostic: "no rules expected",
        evidenceKind: "exposure",
      },
      testStep({
        id: "macros-repetition-grammar-blank",
        kind: "blank",
        title: "Pusta strona: lista punktów kontrolnych",
        prompt:
          "Napisz od zera `checkpoints!`, które przyjmuje zero lub więcej wyrażeń nazw i opcjonalny przecinek końcowy, a zwraca `Vec<String>` w kolejności wejścia. Ukryte testy sprawdzą pustą listę, pojedynczy i wieloelementowy input z przecinkiem końcowym oraz alternatywne wyrażenia z obserwowalną kolejnością efektów. Nie musisz dopisywać własnego testu: evaluator dostarczy testy po Twoim rozwiązaniu. Nie używaj gotowego parsera ani startera.",
        solution: repetitionBlankCode,
        tests: repetitionBlankTests,
        hints: [
          "`*` dopuszcza pustą listę; `$(,)?` jest poza powtórzeniem nazw.",
          "Każde wyrażenie nazw oblicz raz przed `push`.",
        ],
        gate: true,
      }),
      choiceStep(
        "macros-repetition-grammar-recall",
        "recall",
        "Granice gramatyki",
        "Które wywołanie jest zgodne z kontraktem jednej opcjonalnej przecinkowej końcówki?",
        [
          '`metric_readings!("a" => 1, "b" => 2,)`',
          '`metric_readings!("a" => 1,,)`',
          "`metric_readings!(=> 1)`",
        ],
        0,
        [
          "Dwie pary i jeden końcowy przecinek pasują do reguły.",
          "Podwójny przecinek próbuje dopasować pustą parę.",
          "Brakuje wyrażenia nazwy przed strzałką.",
        ],
      ),
    ],
    misconceptions: [
      "`+` i `*` mają tę samą gramatykę pustego inputu.",
      "Opcjonalny przecinek oznacza dowolną liczbę przecinków.",
      "Pusty input trzeba obsługiwać osobną regułą z duplikacją rozwinięcia.",
    ],
    transferTask:
      "Przenieś ten kontrakt na listę nazw bez wartości, zachowując pusty input i pojedynczy separator końcowy.",
    evidenceGate:
      "Gate można zaliczyć przez działające przypadki 0/1/N/trailing comma w zadaniu głównym albo przez osobną implementację listy z innej domeny.",
    sourceIds: ["macros-book-by-example", "macros-reference-by-example"],
  },
  {
    id: "macros-exported-paths-2024",
    moduleId: "macros-as-api",
    conceptIds: ["macros-exported-paths-2024"],
    competencyIds: ["macro-exported-path-contract"],
    prerequisites: ["macros-repetition-grammar"],
    title: "Makro jako publiczne API: `$crate` i Rust 2024",
    subtitle:
      "Utrzymasz typ biblioteki przy lokalnym cieniu klienta i zaakceptujesz `const { ... }` przez `expr`.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz, dlaczego `$crate::Reading` jest częścią publicznego kontraktu eksportowanego makra.",
      "Sprawdzisz, że lokalny typ `Reading` klienta nie zmienia typu zwracanego przez bibliotekę.",
      "Uruchomisz top-level `const { ... }` przez fragment `expr` w edycji 2024.",
      "Oddzielisz dowód browserowego źródła od dowodu osobnego crate w verifierze Cargo.",
    ],
    steps: [
      choiceStep(
        "macros-exported-paths-2024-predict",
        "predict",
        "Przewidź ścieżkę typu",
        "Klient ma własny, niezwiązany `Reading`. Co powinno pozostać wynikiem wywołania eksportowanego makra?",
        [
          "Publiczny `Reading` z crate definiującego makro, wskazany przez `$crate`.",
          "Lokalny `Reading` klienta, bo każda nazwa w ekspansji jest automatycznie lokalna.",
          "Dowolny typ, który ma pola `name` i `value`.",
        ],
        0,
        [
          "`$crate` kotwiczy ścieżkę w crate definiującym; publiczna widoczność nadal jest wymagana.",
          "Część nazw ma reguły higieny, lecz publiczna ścieżka typu wymaga jawnego `$crate`.",
          "Rust nie wybiera typu strukturalnie po samych polach.",
        ],
      ),
      runStep(
        "macros-exported-paths-2024-run",
        "Uruchom stały limit",
        "Uruchom wywołanie z `const { 7 }`. Ten plik jest modelem kompilacji Rust 2024; zewnętrzny klient i MSRV należą do osobnego verifiera.",
        `${macroPrelude}

fn main() {
    let reading = metric_readings!("limit" => const { 7 },);
    println!("{}={}", reading[0].name, reading[0].value);
}`,
        "limit=7\n",
      ),
      choiceStep(
        "macros-exported-paths-2024-explain",
        "explain",
        "Wybierz granicę dowodu",
        "Które zdanie uczciwie opisuje browserowy test `$crate`?",
        [
          "Pokazuje rozwinięcie w jednym źródle; osobny verifier musi sprawdzić klienta z innym crate i prywatność.",
          "Dowodzi wszystkich zachowań dowolnego przyszłego klienta biblioteki.",
          "Dowodzi poprawnego MSRV, nawet jeśli stable jest jedynym uruchomionym toolchainem.",
        ],
        0,
        [
          "Jednoplikowy runner może pokazać model i lokalny cień; granicę crate oraz exact 1.85.0 sprawdza Cargo.",
          "Żaden pojedynczy test nie obejmuje nieograniczonej przyszłej powierzchni API.",
          "Stable nie jest dowodem exact MSRV bez osobnego uruchomienia.",
        ],
      ),
      testStep({
        id: "macros-exported-paths-2024-gate",
        kind: "modify",
        title: "Utrzymaj publiczną ścieżkę",
        prompt:
          "Uzupełnij eksportowane `metric_readings!`. Typ wewnątrz rozwinięcia ma pochodzić z crate definiującego makro przez `$crate::Reading`, lokalny `Reading` klienta ma być niezależny, a matcher `:expr` ma przyjąć `const { 7 }` w Rust 2024. Nie deklaruj wymyślonej prywatności ani nie przechwytuj typu klienta. Browserowy gate jest modelem; osobny Cargo verifier potwierdzi zewnętrzną granicę.",
        code: exportedStarter,
        solution: macroPrelude,
        tests: exportedTests,
        hints: [
          "Użyj `$crate::Reading` oraz `$crate::Reading::new`; oba elementy muszą być publiczne.",
          "Pozostaw fragment `expr`, ponieważ `expr_2021` odrzuca top-level `const { ... }`.",
        ],
        gate: true,
      }),
      {
        id: "macros-exported-paths-2024-debug",
        kind: "debug",
        title: "Porównaj `expr` i `expr_2021`",
        prompt:
          "Uruchom regułę z `expr_2021` dla top-level `const { 7 }`. Zobacz, że błąd dopasowania wynika z wyboru fragmentu w edycji 2024.",
        code: exportedDebug,
        solution: exportedDebugSolution,
        evaluator: { kind: "expected-error", diagnostic: "no rules expected" },
        expectedStatus: "compile-error",
        expectedDiagnostic: "no rules expected",
        evidenceKind: "exposure",
      },
      testStep({
        id: "macros-exported-paths-2024-blank",
        kind: "blank",
        title: "Pusta strona: publiczny helper",
        prompt:
          "Od zera napisz publiczny `Reading` i eksportowane `exported_pairs!`, używając `$crate::Reading`, par `name => value` z opcjonalnym przecinkiem oraz `:expr` dla `const { 12 }` w Rust 2024. Dostarczony ukryty test klienta doda lokalny, niezwiązany `Reading` i porówna wynik do publicznego typu crate definiującego; nie udawaj dowodu zewnętrznego workspace.",
        solution: exportedBlankCode,
        tests: exportedBlankTests,
        hints: [
          "`$crate` wskazuje crate definiujący makro, lecz `Reading` i konstruktor muszą być publiczne.",
          "W edycji 2024 użyj `:expr`, aby top-level const block pasował do matchera.",
        ],
        gate: true,
      }),
      choiceStep(
        "macros-exported-paths-2024-recall",
        "recall",
        "Odtwórz dwa kontrakty",
        "Które dwa elementy razem są potrzebne do tego milestone?",
        [
          "`$crate::Reading` dla publicznej ścieżki oraz `:expr` dla `const { ... }` w 2024.",
          "Prywatny `Reading` i `:expr_2021`, bo klient ma własny typ.",
          "Tylko `#[macro_export]`; ścieżka i edition nie wpływają na API.",
        ],
        0,
        [
          "Ścieżka i fragment rozwiązują dwa różne kontrakty: pochodzenie typu oraz gramatykę argumentu.",
          "Prywatność łamie zewnętrzną granicę, a `expr_2021` nie przyjmuje top-level const block.",
          "Eksport bez poprawnej ścieżki i matchera nie daje opisanego API.",
        ],
      ),
    ],
    misconceptions: [
      "`$crate` omija wymóg publicznej widoczności typu.",
      "Stable automatycznie dowodzi Rust 1.85.0.",
      "`expr` i `expr_2021` są równoważne w każdym edition.",
      "Jednoplikowy test dowodzi klienta z osobnego crate.",
    ],
    transferTask:
      "Zapisz krótką decyzję: kiedy publiczna funkcja jest lepsza od eksportowanego makra oraz jaki osobny test Cargo potwierdziłby granicę klienta.",
    evidenceGate:
      "Gate można zaliczyć przez lokalny cień typu i działające `const { ... }` w zadaniu głównym albo przez niezależną implementację eksportu; zewnętrzny verifier dostarcza osobny dowód crate boundary.",
    sourceIds: [
      "macros-book-by-example",
      "macros-reference-by-example",
      "macros-edition-2024-fragments",
    ],
  },
];

export const macrosAsApiReviewExercises: Record<string, LessonStep> = {
  "macros-exactly-once": testStep({
    id: "macros-exactly-once-review",
    kind: "apply",
    title: "Powtórka: pojedynczy odczyt",
    prompt:
      "Odtwórz makro `metric_readings!`, tak aby niekopiowalny `String` oraz licznik pokazały, że nazwa i wartość są obliczone raz. Zachowaj kolejność i zwróć `Vec<Reading>`; dostarczony evaluator dołączy test sprawdzający ten kontrakt.",
    solution: exactReviewCode,
    tests: exactReviewTests,
    hints: [
      "Zapisz każde wejściowe wyrażenie do lokalnego wiązania w rozwinięciu.",
      "Nie mierz samej równości końcowego wyniku; policz obserwowalne wywołania.",
    ],
  }),
  "macros-repetition-grammar": testStep({
    id: "macros-repetition-grammar-review",
    kind: "apply",
    title: "Powtórka: lista progów",
    prompt:
      "Odtwórz `readings!` dla pustej listy oraz dwóch par z jednym przecinkiem końcowym. Zwróć kolejność jako `Vec<(String, i32)>`, bez duplikowania reguły dla pustego inputu.",
    solution: repetitionReviewCode,
    tests: repetitionReviewTests,
    hints: [
      "Użyj `*` i osobnego `$(,)?`.",
      "Pusty wynik powinien mieć jawny typ, aby test pokazał kontrakt.",
    ],
  }),
  "macros-exported-paths-2024": testStep({
    id: "macros-exported-paths-2024-review",
    kind: "apply",
    title: "Powtórka: klient z cieniem",
    prompt:
      "Odtwórz eksportowane makro i publiczny `Reading`, używając `$crate` oraz `:expr`. Dostarczony evaluator dołączy klienta z lokalnym typem o tej samej nazwie i wywoła makro z `const { 3 }`.",
    solution: exportedReviewCode,
    tests: exportedReviewTests,
    hints: [
      "Ścieżka `$crate` ma wskazywać bibliotekę, nie moduł klienta.",
      "Rust 2024 wymaga `expr`, jeżeli const block ma być pojedynczym argumentem.",
    ],
  }),
};

export const macrosAsApiModule: CourseModule = {
  id: "macros-as-api",
  title: "Makra deklaratywne jako publiczne API",
  whyItMatters:
    "Makro może stać się częścią API biblioteki: jego gramatyka, liczba obliczeń i ścieżki typów są kontraktem dla klienta. Zbudujesz mały, obserwowalny kontrakt od pojedynczego pliku do zewnętrznego verifiera.",
  capabilities: macrosAsApiCompetencies.map((competency) => competency.title),
  prerequisites: ["api-release-matrix"],
  lessonIds: macrosAsApiLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zaimplementujesz makro odczytów, które oblicza każde wyrażenie raz i zachowuje kolejność.",
    "Obsłużysz zero, jeden, wiele i trailing comma bez osobnych, rozjeżdżających się reguł.",
    "Wyjaśnisz `$crate`, wymóg publiczności oraz różnicę `expr`/`expr_2021` w Rust 2024.",
    "Oddzielisz dowód browserowego pliku od zaufanego testu Cargo z osobnym klientem crate.",
  ],
  projectConnection:
    "Zaufany verifier uruchomi std-only workspace z biblioteką eksportującą makro i osobnym klientem, w stable oraz exact Rust 1.85.0. Ćwiczenia przeglądarkowe dowodzą tylko obserwacji jednego źródła i nie zastępują Cargo, granicy crate ani raportu MSRV.",
  assessmentId: "macros-exported-paths-2024/macros-exported-paths-2024-blank",
  gateCriteria: macrosAsApiLessons.map((lesson) => ({
    id: `${lesson.id}-gate`,
    label: lesson.evidenceGate,
    taskRefs: [
      { lessonId: lesson.id, stepId: `${lesson.id}-gate` },
      { lessonId: lesson.id, stepId: `${lesson.id}-blank` },
    ],
  })),
};

export { exactTests, repetitionTests, exportedTests };
