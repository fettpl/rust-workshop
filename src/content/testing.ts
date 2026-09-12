import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const testingSources: Source[] = [
  {
    id: "testing-book-automated",
    title: "The Rust Programming Language: Writing Automated Tests",
    url: "https://doc.rust-lang.org/book/ch11-00-testing.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu asercji, atrybutu #[test] lub zachowania test harness.",
  },
  {
    id: "testing-book-organization",
    title: "The Rust Programming Language: Test Organization",
    url: "https://doc.rust-lang.org/book/ch11-03-test-organization.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie granicy unit, integration albo doc tests.",
  },
  {
    id: "testing-std-assert",
    title: "Rust standard library: assert_eq! macro",
    url: "https://doc.rust-lang.org/std/macro.assert_eq.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów porównywania wyniku i komunikatu błędu.",
  },
  {
    id: "testing-std-catch-unwind",
    title: "Rust standard library: panic::catch_unwind",
    url: "https://doc.rust-lang.org/std/panic/fn.catch_unwind.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu instruktorskiego testowania paniki; to narzędzie harnessu, nie ogólny mechanizm Result.",
  },
  {
    id: "testing-cargo-test",
    title: "The Cargo Book: cargo test",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-test.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie listy targetów, filtrów i testów dokumentacji.",
  },
  {
    id: "testing-cargo-fmt",
    title: "Rustfmt: formatting Rust code",
    url: "https://github.com/rust-lang/rustfmt",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie polecenia formatowania albo statusu rustfmt w toolchainie.",
  },
  {
    id: "testing-cargo-clippy",
    title: "The Rust Clippy Book: Usage",
    url: "https://doc.rust-lang.org/clippy/usage.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie polecenia lintowania lub zalecanej polityki ostrzeżeń.",
  },
];

export const testingCompetencies: Competency[] = [
  {
    id: "write-executable-contracts",
    title:
      "Piszesz mały, wykonywalny kontrakt asercji i sprawdzasz zachowanie przez tabelę przypadków.",
  },
  {
    id: "design-regression-cases",
    title:
      "Dobierasz przypadki brzegowe, regresyjne i dane Unicode tak, by test odróżniał poprawny kod od sensownych mutantów.",
  },
  {
    id: "run-rust-quality-workflow",
    title:
      "Rozróżniasz unit, integration i doc tests oraz uruchamiasz testy, rustfmt i Clippy jako osobne kroki jakości.",
  },
];

export const testingConcepts: Concept[] = [
  {
    id: "testing-contracts",
    title: "Kontrakt funkcji zapisany w asercjach i tabeli przypadków",
    prerequisites: ["iterator-contracts"],
    competencyIds: ["write-executable-contracts"],
    reviewPrompt:
      "Co powinien sprawdzić helper, który przyjmuje fn(i32) -> i32, i dlaczego jedna wartość wejściowa to za mało?",
    reviewAnswer:
      "Helper powinien przejść po tabeli kilku wejść i oczekiwanych wyników, a dla każdego użyć assert_eq!(candidate(input), expected). Kilka wejść sprawdza różne gałęzie i pozwala odrzucić między innymi funkcję, która działa tylko dla jednego przykładu.",
    distinguish:
      "#[test] jest wrapperem uruchamianym przez harness; helper jest zwykłą funkcją z parametrem fn i zwykłymi asercjami. Rust nie dopowiada kontraktu za autora testu.",
  },
  {
    id: "testing-regressions",
    title: "Przypadki brzegowe jako ochrona przed regresją",
    prerequisites: ["testing-contracts"],
    competencyIds: ["design-regression-cases"],
    reviewPrompt:
      "Jak rozpoznać dobry zestaw regresyjny dla funkcji dzielącej zakres na etykiety?",
    reviewAnswer:
      "Tabela powinna zawierać pustkę lub minimum, obie strony granicy i typowy środek, a jeśli funkcja przyjmuje tekst także prawdziwe dane Unicode. Każdy wiersz opisuje obserwowalne zachowanie, więc test nie zależy od prywatnego sposobu implementacji.",
    distinguish:
      "Przypadek brzegowy nie oznacza przypadkowego dziwactwa. To wejście blisko zmiany zachowania, na przykład dokładnie 0 albo dokładnie 10; test regresyjny zostaje, bo chroni ustalony kontrakt.",
  },
  {
    id: "testing-quality-workflow",
    title: "Unit, integration i doc tests oraz osobne kroki jakości",
    prerequisites: ["testing-regressions"],
    competencyIds: ["run-rust-quality-workflow"],
    reviewPrompt:
      "Co daje każdy z trzech rodzajów testu i czym różnią się cargo test, cargo fmt oraz cargo clippy?",
    reviewAnswer:
      "Unit test szybko sprawdza małą część, także prywatną; integration test używa publicznego API jak zewnętrzny klient; doc test kompiluje i uruchamia przykład z dokumentacji. cargo test uruchamia testy, cargo fmt formatuje kod, a cargo clippy zgłasza lints — zielony test nie zastępuje dwóch pozostałych kontroli.",
    distinguish:
      "Formatter i linter nie są testami zachowania. Lokalna checklista Cargo jest samosprawdzeniem projektu; wykonanie ćwiczenia w przeglądarce daje dowód runnera, ale nie twierdzi, że przeglądarka uruchomiła cargo fmt lub cargo clippy.",
  },
];

function choice(
  id: string,
  kind: "observe" | "recall" | "predict",
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
      kind === "recall"
        ? "recall"
        : kind === "predict"
          ? "prediction"
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

function explain(
  id: string,
  title: string,
  prompt: string,
  criteria: string[],
): LessonStep {
  return {
    id,
    kind: "explain",
    title,
    prompt,
    evaluator: { kind: "rubric", criteria },
    rubric: criteria,
    evidenceKind: "exposure",
  };
}

function tested(options: {
  id: string;
  kind: "modify" | "debug" | "apply" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { code: options.code, expectedStatus: "success" as const }),
    evidenceKind: options.kind === "debug" ? "fix" : "transfer",
    evidenceGate: true,
  };
}

const contractsGateOneStarter = `fn assert_increment_contract(_candidate: fn(i32) -> i32) {
    // Zbuduj tabelę (wejście, oczekiwany wynik) i sprawdź każdy wiersz.
}`;

const contractsGateOneSolution = `fn assert_increment_contract(candidate: fn(i32) -> i32) {
    let cases = [(-9, -8), (0, 1), (4, 5), (27, 28)];
    for (input, expected) in cases {
        assert_eq!(candidate(input), expected, "wejście: {input}");
    }
}`;

const contractsGateOneTests = `
fn increment(value: i32) -> i32 { value + 1 }
fn always_one(_: i32) -> i32 { 1 }
fn plus_two(value: i32) -> i32 { value + 2 }
fn wrong_for_negative(value: i32) -> i32 { if value < 0 { value } else { value + 1 } }
fn wrong_for_zero(value: i32) -> i32 { if value == 0 { 0 } else { value + 1 } }
fn wrong_for_positive(value: i32) -> i32 { if value > 0 { value } else { value + 1 } }

#[test]
fn helper_accepts_correct_function() {
    assert!(std::panic::catch_unwind(|| assert_increment_contract(increment)).is_ok());
}

#[test]
fn helper_rejects_multiple_meaningful_mutants() {
    assert!(std::panic::catch_unwind(|| assert_increment_contract(always_one)).is_err());
    assert!(std::panic::catch_unwind(|| assert_increment_contract(plus_two)).is_err());
    assert!(std::panic::catch_unwind(|| assert_increment_contract(wrong_for_negative)).is_err());
    assert!(std::panic::catch_unwind(|| assert_increment_contract(wrong_for_zero)).is_err());
    assert!(std::panic::catch_unwind(|| assert_increment_contract(wrong_for_positive)).is_err());
}`;

const contractsGateTwoStarter = `fn assert_double_contract(_candidate: fn(i32) -> i32) {
    // Ten sam rodzaj kontraktu przećwicz na funkcji, która podwaja liczbę.
}`;

const contractsGateTwoSolution = `fn assert_double_contract(candidate: fn(i32) -> i32) {
    let cases = [(-4, -8), (-1, -2), (0, 0), (6, 12)];
    for (input, expected) in cases {
        assert_eq!(candidate(input), expected);
    }
}`;

const contractsGateTwoTests = `
fn double(value: i32) -> i32 { value * 2 }
fn add_two(value: i32) -> i32 { value + 2 }
fn negate(value: i32) -> i32 { -value }
fn wrong_for_negative(value: i32) -> i32 { if value < 0 { value } else { value * 2 } }
fn wrong_for_zero(value: i32) -> i32 { if value == 0 { 1 } else { value * 2 } }
fn wrong_for_positive(value: i32) -> i32 { if value > 0 { value } else { value * 2 } }

#[test]
fn double_helper_accepts_correct_function() {
    assert!(std::panic::catch_unwind(|| assert_double_contract(double)).is_ok());
}

#[test]
fn double_helper_rejects_boundary_mutants() {
    assert!(std::panic::catch_unwind(|| assert_double_contract(add_two)).is_err());
    assert!(std::panic::catch_unwind(|| assert_double_contract(negate)).is_err());
    assert!(std::panic::catch_unwind(|| assert_double_contract(wrong_for_negative)).is_err());
    assert!(std::panic::catch_unwind(|| assert_double_contract(wrong_for_zero)).is_err());
    assert!(std::panic::catch_unwind(|| assert_double_contract(wrong_for_positive)).is_err());
}`;

const regressionsGateOneStarter = `fn assert_temperature_contract(_classify: fn(i32) -> &'static str) {
    // Granice 0 i 10 są częścią kontraktu, nie przypadkiem do pominięcia.
}`;

const regressionsGateOneSolution = `fn assert_temperature_contract(classify: fn(i32) -> &'static str) {
    let cases = [(-1, "zimno"), (0, "łagodnie"), (5, "łagodnie"), (10, "łagodnie"), (11, "gorąco")];
    for (input, expected) in cases {
        assert_eq!(classify(input), expected, "temperatura: {input}");
    }
}`;

const regressionsGateOneTests = `
fn classify(value: i32) -> &'static str {
    if value < 0 { "zimno" } else if value <= 10 { "łagodnie" } else { "gorąco" }
}
fn wrong_inclusive_lower(value: i32) -> &'static str {
    if value <= 0 { "zimno" } else if value < 10 { "łagodnie" } else { "gorąco" }
}
fn wrong_upper_bound(value: i32) -> &'static str {
    if value < 0 { "zimno" } else if value < 10 { "łagodnie" } else { "gorąco" }
}
fn typical_only(value: i32) -> &'static str {
    if value == 5 { "łagodnie" } else { "nieznane" }
}
fn wrong_for_negative(value: i32) -> &'static str {
    if value < 0 { "łagodnie" } else if value <= 10 { "łagodnie" } else { "gorąco" }
}
fn wrong_for_zero(value: i32) -> &'static str {
    if value < 0 { "zimno" } else if value == 0 { "zimno" } else if value <= 10 { "łagodnie" } else { "gorąco" }
}
fn wrong_for_positive(value: i32) -> &'static str {
    if value < 0 { "zimno" } else if value <= 10 { "łagodnie" } else { "łagodnie" }
}

#[test]
fn temperature_contract_covers_boundaries() {
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(classify)).is_ok());
}

#[test]
fn temperature_contract_rejects_boundary_and_partial_mutants() {
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(wrong_inclusive_lower)).is_err());
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(wrong_upper_bound)).is_err());
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(typical_only)).is_err());
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(wrong_for_negative)).is_err());
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(wrong_for_zero)).is_err());
    assert!(std::panic::catch_unwind(|| assert_temperature_contract(wrong_for_positive)).is_err());
}`;

const regressionsGateTwoStarter = `fn assert_normalize_contract(_normalize: fn(&str) -> String) {
    // Wpisz prawdziwe przypadki: pusty tekst, spacje, Unicode i powtórzenia.
}`;

const regressionsGateTwoSolution = `fn assert_normalize_contract(normalize: fn(&str) -> String) {
    let cases = [
        ("", ""),
        ("  Rust  ", "rust"),
        ("ZaŻółĆ", "zażółć"),
        ("  A  B  ", "a  b"),
    ];
    for (input, expected) in cases {
        assert_eq!(normalize(input), expected, "tekst: {input:?}");
    }
}`;

const regressionsGateTwoTests = `
fn normalize(value: &str) -> String { value.trim().to_lowercase() }
fn trim_only(value: &str) -> String { value.trim().to_string() }
fn first_word(value: &str) -> String { value.split_whitespace().next().unwrap_or("").to_lowercase() }
fn ascii_only(value: &str) -> String { value.trim().to_ascii_lowercase() }
fn empty_wrong(value: &str) -> String { if value.is_empty() { String::from("pusty") } else { value.trim().to_lowercase() } }

#[test]
fn normalization_contract_keeps_unicode_and_spaces() {
    assert!(std::panic::catch_unwind(|| assert_normalize_contract(normalize)).is_ok());
}

#[test]
fn normalization_contract_rejects_shortcuts() {
    assert!(std::panic::catch_unwind(|| assert_normalize_contract(trim_only)).is_err());
    assert!(std::panic::catch_unwind(|| assert_normalize_contract(first_word)).is_err());
    assert!(std::panic::catch_unwind(|| assert_normalize_contract(ascii_only)).is_err());
    assert!(std::panic::catch_unwind(|| assert_normalize_contract(empty_wrong)).is_err());
}`;

const qualityGateOneStarter = `fn assert_sum_contract(_sum: fn(&[i32]) -> i32) {
    // Test opisuje sumowanie także dla pustej i powtarzającej się listy.
}`;

const qualityGateOneSolution = `fn assert_sum_contract(sum: fn(&[i32]) -> i32) {
    let cases: &[(&[i32], i32)] = &[
        (&[], 0),
        (&[7], 7),
        (&[-2, 5, -2], 1),
        (&[100, 0, 100], 200),
    ];
    for (input, expected) in cases {
        assert_eq!(sum(input), *expected, "lista: {input:?}");
    }
}`;

const qualityGateOneTests = `
fn sum(values: &[i32]) -> i32 { values.iter().sum() }
fn skip_duplicates(values: &[i32]) -> i32 {
    let mut total = 0;
    for (index, value) in values.iter().enumerate() {
        if !values[..index].contains(value) { total += *value; }
    }
    total
}
fn first_only(values: &[i32]) -> i32 { values.first().copied().unwrap_or(0) }
fn empty_sum_wrong(values: &[i32]) -> i32 { if values.is_empty() { 1 } else { sum(values) } }
fn singleton_wrong(values: &[i32]) -> i32 { if values.len() == 1 { 0 } else { sum(values) } }
fn positive_values_only(values: &[i32]) -> i32 { values.iter().filter(|value| **value > 0).sum() }

#[test]
fn sum_contract_accepts_real_implementation() {
    assert!(std::panic::catch_unwind(|| assert_sum_contract(sum)).is_ok());
}

#[test]
fn sum_contract_rejects_silent_shortcuts() {
    assert!(std::panic::catch_unwind(|| assert_sum_contract(skip_duplicates)).is_err());
    assert!(std::panic::catch_unwind(|| assert_sum_contract(first_only)).is_err());
    assert!(std::panic::catch_unwind(|| assert_sum_contract(empty_sum_wrong)).is_err());
    assert!(std::panic::catch_unwind(|| assert_sum_contract(singleton_wrong)).is_err());
    assert!(std::panic::catch_unwind(|| assert_sum_contract(positive_values_only)).is_err());
}`;

const qualityGateTwoSolution = `fn assert_first_even_contract(first_even: fn(&[i32]) -> Option<i32>) {
    assert_eq!(first_even(&[]), None);
    assert_eq!(first_even(&[1, 3, 4, 8]), Some(4));
    assert_eq!(first_even(&[2, 4, 6]), Some(2));
    assert_eq!(first_even(&[1, 5, 9]), None);
}`;

const qualityGateTwoTests = `
fn first_even(values: &[i32]) -> Option<i32> {
    values.iter().copied().find(|value| value % 2 == 0)
}
fn last_even(values: &[i32]) -> Option<i32> {
    values.iter().rev().copied().find(|value| value % 2 == 0)
}
fn skips_first(values: &[i32]) -> Option<i32> {
    values.iter().skip(1).copied().find(|value| value % 2 == 0)
}
fn odd_fallback(values: &[i32]) -> Option<i32> {
    first_even(values).or_else(|| values.first().copied())
}
fn zero_for_none(values: &[i32]) -> Option<i32> {
    Some(values.iter().copied().find(|value| value % 2 == 0).unwrap_or(0))
}

#[test]
fn first_even_contract_accepts_real_implementation() {
    assert!(std::panic::catch_unwind(|| assert_first_even_contract(first_even)).is_ok());
}

#[test]
fn first_even_contract_rejects_order_and_empty_mutants() {
    assert!(std::panic::catch_unwind(|| assert_first_even_contract(last_even)).is_err());
    assert!(std::panic::catch_unwind(|| assert_first_even_contract(zero_for_none)).is_err());
    assert!(std::panic::catch_unwind(|| assert_first_even_contract(skips_first)).is_err());
    assert!(std::panic::catch_unwind(|| assert_first_even_contract(odd_fallback)).is_err());
}`;

const firstTestStarter = `fn increment(value: i32) -> i32 { value + 1 }

#[test]
fn zero_increments_to_one() {
    assert_eq!(increment(0), 0);
}`;
const firstTestSolution = firstTestStarter.replace(
  "increment(0), 0",
  "increment(0), 1",
);
const qualityTestStarter = `pub mod counter {
    fn count(values: &[i32]) -> usize { values.len() }
    pub fn item_count(values: &[i32]) -> usize { count(values) }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn private_helper_counts_empty_input() {
            assert_eq!(count(&[]), 0);
        }
    }
}

#[test]
fn client_counts_each_item() {
    assert_eq!(counter::item_count(&[4, 4, 9]), 2);
}`;
const qualityTestSolution = qualityTestStarter.replace(
  "&[4, 4, 9]), 2",
  "&[4, 4, 9]), 3",
);

export const testingLessons: Lesson[] = [
  {
    id: "testing-contracts",
    moduleId: "testing-quality",
    conceptIds: ["testing-contracts"],
    competencyIds: ["write-executable-contracts"],
    prerequisites: ["iterator-contracts"],
    title: "Kontrakt, który naprawdę może się nie udać",
    subtitle:
      "Zamień opis oczekiwania w helper asercji i sprawdź kilka implementacji przez prawdziwy test.",
    minutes: 18,
    outcomes: [
      "Rozpoznajesz różnicę między zwykłą funkcją helpera a wrapperem #[test].",
      "Budujesz tabelę wejście–wynik i używasz assert_eq! z informacją o przypadku.",
      "Widzisz, że poprawny test musi przepuścić poprawną funkcję i odrzucać więcej niż jednego mutanta.",
    ],
    steps: [
      {
        ...choice(
          "contracts-discover",
          "predict",
          "Przewidź wynik pierwszego testu",
          "increment dodaje 1. Test oczekuje zera dla wejścia 0. Co pokaże uruchomienie testów?",
          [
            "Test przejdzie, bo kod się kompiluje.",
            "Test nie przejdzie: wynik 1 różni się od oczekiwanego 0.",
            "#[test] spowoduje błąd kompilacji.",
          ],
          1,
          [
            "Kompilacja nie porównuje wyniku z oczekiwaniem testu.",
            "assert_eq! zgłosi różnicę; tutaj trzeba naprawić oczekiwanie testu, nie poprawną funkcję.",
            "#[test] to poprawny atrybut; funkcję uruchamia test harness.",
          ],
        ),
      },
      {
        id: "contracts-run",
        kind: "run",
        title: "Uruchom test i odczytaj różnicę",
        prompt:
          "Uruchom testy i odczytaj surowy raport: left jest wynikiem increment(0), right pochodzi z asercji. Funkcja prawidłowo dodaje 1. Popraw oczekiwanie testu, a następnie uruchom go ponownie. #[test] oznacza funkcję uruchamianą w trybie testów; nie potrzebujesz main.",
        code: firstTestStarter,
        solution: firstTestSolution,
        evaluator: {
          kind: "tests",
          tests:
            "#[test] fn implementation_still_increments() { assert_eq!(increment(-3), -2); }",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
        hints: [
          "Porównaj argument i wynik dodawania, zanim zmienisz kod funkcji.",
          "Dla wejścia 0 kontrakt dodawania 1 wymaga wyniku 1.",
        ],
      },
      explain(
        "contracts-explain",
        "Wyjaśnij: tabela to kilka obserwacji",
        "Dlaczego tabela [(-9, -8), (0, 1), (4, 5)] daje mocniejszy kontrakt niż samo sprawdzenie candidate(0) == 1? W odpowiedzi wspomnij o mutancie, który przechodzi tylko jeden wiersz.",
        [
          "Helper przechodzi po kilku wierszach tabeli i dla każdego używa oczekiwanego wyniku.",
          "Pojedyncza asercja może przepuścić mutanta działającego tylko dla jednego wejścia.",
          "Wrapper #[test] uruchamia helper, ale nie dopowiada jego dziedzinowego kontraktu.",
        ],
      ),
      tested({
        id: "contracts-modify-gate",
        kind: "modify",
        title: "Zaimplementuj: kontrakt inkrementacji",
        prompt:
          "Uzupełnij assert_increment_contract dla liczb od -1000 do 1000 i kontraktu x + 1. To zwykła funkcja z asercjami, przyjmująca badaną funkcję jako argument candidate. Ukryte testy uruchomią ją dla poprawnej oraz wadliwych implementacji: poprawna musi przejść, a błędne mają wywołać panikę asercji. Przechwytywanie tej paniki należy do mechanizmu oceny, nie do Twojego helpera. Przejdź po tabeli wejście–wynik i porównaj każdy wynik przez assert_eq!. Nie wywołuj konkretnej funkcji z testów po nazwie: argument candidate ma być jedyną badaną implementacją.",
        code: contractsGateOneStarter,
        solution: contractsGateOneSolution,
        tests: contractsGateOneTests,
        hints: [
          "Tablica krotek może przechować wejście i oczekiwany wynik; for rozpakowuje każdy wiersz.",
          "assert_eq!(candidate(input), expected) sprawdza kontrakt dowolnego wskaźnika fn.",
        ],
      }),
      tested({
        id: "contracts-apply-gate",
        kind: "apply",
        title: "Zastosuj: ten sam wzorzec do podwajania",
        prompt:
          "Uzupełnij assert_double_contract dla funkcji podwajającej liczby od -1000 do 1000. Testy używają ujemnych liczb, zera i dodatniej liczby oraz kilku mutantów.",
        code: contractsGateTwoStarter,
        solution: contractsGateTwoSolution,
        tests: contractsGateTwoTests,
        hints: [
          "Nie kopiuj nazwy funkcji z testów. Kontrakt jest tabelą danych, a nie rozpoznawaniem implementacji.",
          "Sprawdź między innymi (-4, -8), (0, 0) i (6, 12).",
        ],
      }),
      choice(
        "contracts-recall",
        "recall",
        "Przypomnij: co oznacza zielony wynik?",
        "Jeśli helper nic nie robi, a wrapper przechwytuje panikę tylko po to, by sprawdzić, że zły kandydat ją wywołuje, jaki jest problem?",
        [
          "No-op może zaakceptować złą implementację, więc test jakości helpera powinien celowo sprawdzić poprawną i błędne funkcje.",
          "To wystarczy, bo udana kompilacja dowodzi poprawnego zachowania.",
          "catch_unwind zamienia każdą błędną funkcję w poprawną.",
        ],
        0,
        [
          "Właśnie: test musi wykazać akceptację poprawnej funkcji i odrzucenie znaczących mutantów.",
          "Kompilator sprawdza typy, nie dziedzinowy wynik funkcji.",
          "catch_unwind tylko obserwuje panikę; nie naprawia badanego kodu.",
        ],
      ),
    ],
    misconceptions: [
      "#[test] nie wylicza oczekiwanego wyniku i nie zastępuje asercji.",
      "Funkcja przekazana jako fn(...) -> ... nie jest magicznym testem; helper musi ją wywołać.",
      "catch_unwind należy tu do testowego harnessu oceniającego panikę, a zwykłe błędy domenowe nadal powinny używać Result.",
    ],
    transferTask:
      "Napisz helper dla funkcji fn(i32) -> bool, która rozpoznaje liczby parzyste. Dodaj zero, liczbę ujemną i dodatnią oraz wadliwe warianty implementacji.",
    evidenceGate:
      "Dwa niezależne helpery kontraktu muszą przejść poprawne funkcje i odrzucić kilka mutantów.",
    sourceIds: [
      "testing-book-automated",
      "testing-std-assert",
      "testing-std-catch-unwind",
    ],
  },
  {
    id: "testing-regressions",
    moduleId: "testing-quality",
    conceptIds: ["testing-regressions"],
    competencyIds: ["design-regression-cases"],
    prerequisites: ["testing-contracts"],
    title: "Regresja zaczyna się na granicy",
    subtitle:
      "Dobierz dane, które ujawniają off-by-one, skróty i utratę znaków Unicode.",
    minutes: 19,
    outcomes: [
      "Rozróżniasz typowy przypadek od granicy, która zmienia wynik.",
      "Piszesz niezależne tabele dla liczb i tekstu z Unicode.",
      "Potrafisz nazwać mutanta, którego odrzuca konkretny wiersz testu.",
    ],
    steps: [
      choice(
        "regressions-discover",
        "observe",
        "Odkryj: wybór danych",
        "Dla kontraktu: wartość ujemna → zimno, 0..=10 → łagodnie, >10 → gorąco, który zestaw najpewniej wykryje błąd granicy?",
        ["[-1, 0, 5, 10, 11]", "[5, 6, 7]", "[100, 200, 300]"],
        0,
        [
          "Zawiera minimum, oba końce zakresu i typowy środek.",
          "Nie sprawdza żadnego końca zakresu.",
          "Pokazuje tylko jedną gałąź pośrednią i górny zakres.",
        ],
      ),
      run(
        "regressions-run",
        "Uruchom: obserwacja konkretnego wiersza",
        "Zobacz, jak komunikat asercji wskazuje przypadek, który ujawnił regresję.",
        `fn classify(value: i32) -> &'static str {
    if value < 0 { "zimno" } else if value <= 10 { "łagodnie" } else { "gorąco" }
}

fn main() {
    let cases = [(-1, "zimno"), (0, "łagodnie"), (10, "łagodnie"), (11, "gorąco")];
    let mut checked = 0;
    for (input, expected) in cases {
        assert_eq!(classify(input), expected);
        checked += 1;
    }
    println!("sprawdzono przypadków: {checked}");
}`,
        "sprawdzono przypadków: 4\n",
      ),
      explain(
        "regressions-explain",
        "Wyjaśnij: dlaczego Unicode jest regresją",
        'Dlaczego przypadek "ZaŻółĆ" ma sens w tabeli funkcji normalizującej tekst, nawet jeśli jej podstawowy przykład używa ASCII?',
        [
          "Unicode jest prawdziwym wejściem, które może ujawnić założenie o jednym bajcie na znak.",
          "Przypadek regresyjny opisuje obserwowalny wynik, a nie prywatny warunek implementacji.",
        ],
      ),
      tested({
        id: "regressions-debug-gate",
        kind: "debug",
        title: "Napraw: granice temperatury",
        prompt:
          "Uzupełnij helper regresyjny. Zachowaj obie granice zakresu: 0 należy do łagodnie, a 10 także należy do łagodnie. Testy osobno uruchamiają poprawną funkcję i mutanty.",
        code: regressionsGateOneStarter,
        solution: regressionsGateOneSolution,
        tests: regressionsGateOneTests,
        hints: [
          "Wiersze (-1, ...), (0, ...), (5, ...), (10, ...) i (11, ...) mają różne role.",
          "Porównaj wynik classify(input) z expected dla każdego wiersza, nie tylko dla środka.",
        ],
      }),
      tested({
        id: "regressions-apply-gate",
        kind: "apply",
        title: "Zastosuj: tekst, spacje i znaki",
        prompt:
          "Napisz helper dla funkcji normalizującej: usuwa zewnętrzne białe znaki, zachowuje wewnętrzne powtórzenia i zamienia litery na małe. Tabela ma obejmować pustkę, spacje oraz polskie znaki.",
        code: regressionsGateTwoStarter,
        solution: regressionsGateTwoSolution,
        tests: regressionsGateTwoTests,
        hints: [
          "trim i to_lowercase są częścią obserwowalnego kontraktu, ale helper ma sprawdzać wynik, nie prywatne wywołania.",
          'Wiersz "  A  B  " odróżnia usunięcie brzegów od zredukowania środka do jednego odstępu.',
        ],
      }),
      choice(
        "regressions-recall",
        "recall",
        "Przypomnij: który test ma największą wartość?",
        "Mutant zamienia `<= 10` na `< 10`. Który wiersz powinien ujawnić błąd?",
        ['(10, "łagodnie")', '(5, "łagodnie")', '(-1, "zimno")'],
        0,
        [
          "Dokładnie 10 zmienia wynik przy tej mutacji.",
          "5 nadal przechodzi w obu implementacjach.",
          "-1 nie dotyka zmienionej górnej granicy.",
        ],
      ),
    ],
    misconceptions: [
      "Więcej losowych przykładów nie zastępuje wejścia dokładnie na granicy.",
      "Unicode nie jest ozdobą testu: ujawnia założenie, że każdy znak ma jeden bajt.",
      "Test powinien obserwować wynik publicznego kontraktu, nie kopiować prywatne warunki implementacji.",
    ],
    transferTask:
      "Dla funkcji fn(u32) -> &'static str oznaczającej przedział 0..=100 zaprojektuj minimum, oba końce i wartości tuż poza zakresem.",
    evidenceGate:
      "Dwie niezależne tabele — klasyfikacja liczb i normalizacja Unicode — wykrywają błędy granic oraz skróty implementacyjne.",
    sourceIds: ["testing-book-automated", "testing-std-assert"],
  },
  {
    id: "testing-quality-workflow",
    moduleId: "testing-quality",
    conceptIds: ["testing-quality-workflow"],
    competencyIds: ["run-rust-quality-workflow"],
    prerequisites: ["testing-regressions"],
    title: "Zielony test to początek kontroli jakości",
    subtitle:
      "Połącz kontrakt z organizacją testów i osobno sprawdź zachowanie, format oraz lint.",
    minutes: 20,
    outcomes: [
      "Rozróżniasz unit, integration i doc test według granicy użycia.",
      "Rozumiesz, że cargo test, cargo fmt i cargo clippy odpowiadają na różne pytania.",
      "Czytasz wynik runnera jako dowód ćwiczenia i planujesz lokalną checklistę Cargo dla pobranego projektu.",
    ],
    steps: [
      choice(
        "quality-discover",
        "observe",
        "Odkryj: trzy pytania kontroli",
        "Masz prywatny helper w src/lib.rs, publiczną funkcję używaną z tests/public_api.rs i przykład /// przy answer. Które przyporządkowanie poleceń jest poprawne?",
        [
          "cargo test: zachowanie; cargo fmt: układ kodu; cargo clippy: ostrzeżenia i wzorce.",
          "cargo fmt: uruchamia testy; cargo test: poprawia wcięcia; cargo clippy: generuje dokumentację.",
          "Wszystkie trzy polecenia robią to samo, tylko z innym poziomem szczegółów.",
        ],
        0,
        [
          "To trzy osobne kontrole i każda ma inny wynik.",
          "Formatowanie nie uruchamia testów, a cargo test nie przepisuje kodu.",
          "Ich cele są różne, nawet jeśli wszystkie uruchamiasz lokalnie.",
        ],
      ),
      {
        id: "quality-run",
        kind: "run",
        title: "Test środka i test publicznej granicy",
        prompt:
          "Uruchom testy. Wewnętrzny mod tests ma dostęp do prywatnego count przez use super::*. Test klienta korzysta wyłącznie z publicznego counter::item_count. Duplikaty są osobnymi elementami: popraw jego błędną asercję. Tu oba testy mieszczą się w jednym pliku; w pakiecie Log Analyzer tests/integration.rs jest osobnym klientem biblioteki, a przykład w src/lib.rs sprawdza cargo test --doc.",
        code: qualityTestStarter,
        solution: qualityTestSolution,
        evaluator: {
          kind: "tests",
          tests:
            "#[test] fn public_api_preserves_all_items() { assert_eq!(counter::item_count(&[-1, -1, 0, 7]), 4); }",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
        hints: [
          "Test prywatnego helpera przechodzi. Błąd dotyczy oczekiwanej liczby elementów w teście klienta.",
          "[4, 4, 9] zawiera trzy elementy, nawet gdy dwie wartości są równe.",
        ],
      },
      explain(
        "quality-explain",
        "Wyjaśnij: gdzie uruchomić każdy test",
        "Opisz jednym zdaniem różnicę: unit test w module src, integration test w tests/ oraz doc test w komentarzu ///. Dodaj, dlaczego cargo test nie zastępuje cargo fmt.",
        [
          "Unit test może sprawdzać prywatną część w module src, integration test używa publicznego API w tests/.",
          "Doc test jest przykładem w komentarzu ///, a cargo fmt formatuje kod i nie uruchamia testów zachowania.",
        ],
      ),
      tested({
        id: "quality-modify-gate",
        kind: "modify",
        title: "Zaimplementuj: kontrakt sumy",
        prompt:
          "Uzupełnij helper dla sumowania list liczb z zakresu -1000..=1000 o najwyżej 1000 elementach. Sprawdź pustą tablicę, pojedynczy element, wartości ujemne i duplikat. To jest test zachowania; format i lint będą osobnymi krokami lokalnego projektu.",
        code: qualityGateOneStarter,
        solution: qualityGateOneSolution,
        tests: qualityGateOneTests,
        hints: [
          "Tablica krotek może przechowywać slice i oczekiwaną sumę bez klonowania danych.",
          "Wartość z krotki jest pożyczona, więc porównaj wynik z *expected.",
        ],
      }),
      tested({
        id: "quality-blank-gate",
        kind: "blank",
        title: "Od zera: kontrakt pierwszego parzystego",
        prompt:
          "Napisz od pustej kartki funkcję assert_first_even_contract, która otrzymuje funkcję przyjmującą pożyczoną listę i32 i zwracającą Option<i32> z pierwszą parzystą wartością. Twój helper ma zwracać () i zgłaszać niezgodności asercjami. Musi sprawdzić pustkę, pierwsze dopasowanie, dopasowanie na początku i brak dopasowania. Testy odrzucają wybranie ostatniego elementu oraz zamianę None na Some(0).",
        solution: qualityGateTwoSolution,
        tests: qualityGateTwoTests,
        hints: [
          "Cztery asercje pokrywają cztery różne obserwacje kontraktu.",
          "Nie potrzebujesz catch_unwind w helperze; harness testuje jego panikę na zewnątrz.",
        ],
      }),
      {
        id: "quality-terminal-experiment",
        kind: "apply",
        title: "Sprawdź trzy narzędzia w terminalu",
        prompt:
          "Opcjonalny warsztat poza przeglądarką: pobierz pakiet Log Analyzer z karty Projekt. Uzupełnij starter i doprowadź cargo test --offline --locked do sukcesu; testy jednostkowe są w src/analyzer.rs, integracyjne w tests/integration.rs, a przykład dokumentacyjny w src/lib.rs. Zmień oczekiwany poziom w jednej asercji z Warn na Info: test ma wykazać błąd. Cofnij zmianę. Zepsuj wcięcia w src/analyzer.rs: cargo fmt --check ma zgłosić różnicę, a cargo fmt ją naprawić. Przed blokiem #[cfg(test)] w tym pliku dopisz pub fn empty(values: &[i32]) -> bool { values.len() == 0 }. Uruchom cargo clippy --offline --locked --all-targets -- -D warnings, odczytaj lint len_zero i zmień wyrażenie na values.is_empty(). Uruchom ponownie testy, cargo test --doc --offline --locked, fmt i Clippy. Ta lista zapisuje własną obserwację; aplikacja nie potwierdza lokalnego wykonania poleceń.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Widziałem test, który oblał błędną asercję, a po jej cofnięciu przeszedł.",
            "Porównałem działanie cargo fmt --check i cargo fmt.",
            "Usunąłem przyczynę lint len_zero przez is_empty zamiast wyciszać ostrzeżenie.",
            "Oddzielam wynik lokalnych narzędzi od automatycznego dowodu w przeglądarce.",
          ],
        },
        evidenceKind: "exposure",
      },
      choice(
        "quality-recall",
        "recall",
        "Przypomnij: co uruchomić po zmianie API?",
        "Zmieniłeś publiczną funkcję biblioteki i komentarz z przykładem. Jaka kolejność daje sensowną lokalną kontrolę?",
        [
          "cargo test, potem cargo fmt -- --check i cargo clippy -- -D warnings.",
          "Tylko cargo fmt, bo formatowanie wykrywa błędne wyniki.",
          "Tylko uruchomienie przykładu w przeglądarce, bo lokalne Cargo jest niepotrzebne.",
        ],
        0,
        [
          "Testy sprawdzają zachowanie, fmt raportuje format, a Clippy lints; to uzupełniające kontrole.",
          "Formatter nie wykonuje kontraktu funkcji.",
          "Runner przeglądarkowy nie jest deklaracją, że Cargo wykonało lokalne formatowanie i lint.",
        ],
      ),
    ],
    misconceptions: [
      "Zielone cargo test nie gwarantuje czytelnego formatu ani braku ostrzeżeń Clippy.",
      "Integration test korzysta z publicznego API, więc może wykryć zbyt wąską granicę modułu.",
      "Ukryte testy runnera są dowodem wykonania ćwiczenia; checklistę Cargo projektu uruchamiasz lokalnie według README.",
    ],
    transferTask:
      "W pobranym warsztacie Log Analyzer uruchom cargo test, cargo test --doc, cargo fmt -- --check i cargo clippy -- -D warnings, a przy każdym wyniku zapisz, jakie pytanie jakości odpowiada.",
    evidenceGate:
      "Dwa helpery sprawdzają agregację i wybór pierwszego wyniku; terminalowy eksperyment uzupełnia je o testy dokumentacji, rustfmt i Clippy.",
    sourceIds: [
      "testing-book-organization",
      "testing-cargo-test",
      "testing-cargo-fmt",
      "testing-cargo-clippy",
    ],
  },
];

const reviewContractsStarter = `fn assert_even_contract(_is_even: fn(i32) -> bool) {
    // Sprawdź ujemną nieparzystą, zero, ujemną parzystą i dodatnią nieparzystą.
}`;

const reviewContractsSolution = `fn assert_even_contract(is_even: fn(i32) -> bool) {
    let cases = [(-3, false), (0, true), (-4, true), (7, false)];
    for (input, expected) in cases {
        assert_eq!(is_even(input), expected);
    }
}`;

const reviewContractsTests = `
fn even(value: i32) -> bool { value % 2 == 0 }
fn positive_even(value: i32) -> bool { value > 0 && value % 2 == 0 }
fn always_true(_: i32) -> bool { true }
fn negative_even_wrong(value: i32) -> bool { value >= 0 && value % 2 == 0 }
#[test]
fn review_contract_accepts_and_rejects() {
    assert!(std::panic::catch_unwind(|| assert_even_contract(even)).is_ok());
    assert!(std::panic::catch_unwind(|| assert_even_contract(positive_even)).is_err());
    assert!(std::panic::catch_unwind(|| assert_even_contract(always_true)).is_err());
    assert!(std::panic::catch_unwind(|| assert_even_contract(negative_even_wrong)).is_err());
}`;

const reviewRegressionsStarter = `fn assert_discount_contract(_discount: fn(u32) -> u32) {
    // Cena 0..=100 ma pozostać bez zmian, a powyżej 100 ma być obniżona o 10.
}`;

const reviewRegressionsSolution = `fn assert_discount_contract(discount: fn(u32) -> u32) {
    let cases = [(0, 0), (1, 1), (100, 100), (101, 91), (150, 140)];
    for (input, expected) in cases {
        assert_eq!(discount(input), expected, "cena: {input}");
    }
}`;

const reviewRegressionsTests = `
fn discount(price: u32) -> u32 { if price > 100 { price - 10 } else { price } }
fn wrong_boundary(price: u32) -> u32 { if price >= 100 { price - 10 } else { price } }
fn no_discount(price: u32) -> u32 { price }
#[test]
fn review_regression_contract_is_mutation_sensitive() {
    assert!(std::panic::catch_unwind(|| assert_discount_contract(discount)).is_ok());
    assert!(std::panic::catch_unwind(|| assert_discount_contract(wrong_boundary)).is_err());
    assert!(std::panic::catch_unwind(|| assert_discount_contract(no_discount)).is_err());
}`;

const reviewQualityStarter = `fn assert_occurrence_contract(_count: fn(&[i32], i32) -> usize) {
    // Policz każde wystąpienie, także duplikaty i brak wartości.
}`;

const reviewQualitySolution = `fn assert_occurrence_contract(count: fn(&[i32], i32) -> usize) {
    assert_eq!(count(&[], 2), 0);
    assert_eq!(count(&[2], 2), 1);
    assert_eq!(count(&[1, 2, 2, 3], 2), 2);
    assert_eq!(count(&[1, 3], 2), 0);
    assert_eq!(count(&[0, 0, 1], 0), 2);
}`;

const reviewQualityTests = `
fn count(values: &[i32], needle: i32) -> usize { values.iter().filter(|value| **value == needle).count() }
fn first_occurrence(values: &[i32], needle: i32) -> usize { values.iter().position(|value| *value == needle).map_or(0, |_| 1) }
fn count_nonzero(values: &[i32], needle: i32) -> usize { if needle == 0 { 0 } else { values.iter().filter(|value| **value == needle).count() } }
#[test]
fn review_quality_contract_rejects_lost_duplicates() {
    assert!(std::panic::catch_unwind(|| assert_occurrence_contract(count)).is_ok());
    assert!(std::panic::catch_unwind(|| assert_occurrence_contract(first_occurrence)).is_err());
    assert!(std::panic::catch_unwind(|| assert_occurrence_contract(count_nonzero)).is_err());
}`;

export const testingReviewExercises: Record<string, LessonStep> = {
  "testing-contracts": {
    id: "review-testing-contracts",
    kind: "apply",
    title: "Powtórka: parzystość jako kontrakt",
    prompt:
      "Uzupełnij helper, który sprawdza fn(i32) -> bool na ujemnej nieparzystej, zerze, ujemnej parzystej i dodatniej nieparzystej. Testy podają poprawną funkcję oraz trzy błędne warianty.",
    code: reviewContractsStarter,
    solution: reviewContractsSolution,
    hints: [
      "Wpisz cztery krotki z oczekiwanym bool i przejdź po nich pętlą.",
      "Wywołaj przekazany is_even dla każdego input, nie funkcję o znanej nazwie.",
    ],
    evaluator: { kind: "tests", tests: reviewContractsTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
  "testing-regressions": {
    id: "review-testing-regressions",
    kind: "apply",
    title: "Powtórka: cena dokładnie na granicy",
    prompt:
      "Zaimplementuj helper dla rabatu: ceny do 100 włącznie zostają, a powyżej 100 tracą 10. Tabela musi obejmować 100 i 101.",
    code: reviewRegressionsStarter,
    solution: reviewRegressionsSolution,
    hints: [
      "Krawędzie 100 i 101 odróżniają `>` od `>=`.",
      "Dodaj również cenę 0 i zwykłą cenę 150.",
    ],
    evaluator: { kind: "tests", tests: reviewRegressionsTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
  "testing-quality-workflow": {
    id: "review-testing-quality-workflow",
    kind: "apply",
    title: "Powtórka: liczba wystąpień",
    prompt:
      "Napisz helper dla fn(&[i32], i32) -> usize. Sprawdź pustkę, pojedyncze wystąpienie, duplikaty i brak wartości, także gdy szukaną liczbą jest zero. Potem lokalnie rozdziel cargo test od cargo fmt i cargo clippy.",
    code: reviewQualityStarter,
    solution: reviewQualitySolution,
    hints: [
      "Wiersz z [1, 2, 2, 3] ma wykryć helper, który zwraca tylko 0 albo 1.",
      "Nie usuwaj duplikatów wejścia; kontrakt liczy każde wystąpienie.",
    ],
    evaluator: { kind: "tests", tests: reviewQualityTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
};

export const testingModule: CourseModule = {
  id: "testing-quality",
  title: "Testowanie, regresje i jakość kodu",
  whyItMatters:
    "Rust sprawdza typy i własność, lecz nie zna znaczenia wyniku funkcji. Małe kontrakty testowe ujawniają regresje, a osobne kontrole Cargo pomagają utrzymać kod czytelny i ostrzegawczo czysty.",
  capabilities: [
    "Piszesz assertion helper z tabelą przypadków dla wskaźnika do funkcji.",
    "Dobierasz granice, Unicode, pustkę, kolejność i duplikaty do testów regresyjnych.",
    "Rozróżniasz unit, integration i doc tests oraz cargo test, cargo fmt i cargo clippy.",
  ],
  prerequisites: ["iterators"],
  lessonIds: testingLessons.map((lesson) => lesson.id),
  exitGate: [
    "Helper przyjmuje dowolną funkcję o ustalonej sygnaturze, asercje przechodzą poprawną implementację i odrzucają sensowne mutanty.",
    "Tabela obejmuje przypadki brzegowe, Unicode lub duplikaty i opisuje obserwowalny kontrakt.",
    "Potrafisz zaplanować cargo test, cargo fmt -- --check i cargo clippy -- -D warnings jako trzy osobne kontrole.",
  ],
  projectConnection:
    "W Log Analyzer testy kontraktów ochronią parser, strumieniowe liczenie i raport przed pustką, Unicode, duplikatami, końcową linią bez newline oraz błędem odczytu.",
  assessmentId: "testing-quality-workflow/quality-blank-gate",
  gateCriteria: [
    {
      id: "testing-contracts-gate",
      label:
        "Samodzielny helper sprawdza poprawną funkcję i odrzuca błędne warianty; dostępne są dwa zadania do wyboru.",
      taskRefs: [
        { lessonId: "testing-contracts", stepId: "contracts-modify-gate" },
        { lessonId: "testing-contracts", stepId: "contracts-apply-gate" },
      ],
    },
    {
      id: "testing-regressions-gate",
      label:
        "Testy regresyjne trafiają w granice liczb oraz Unicode i nie akceptują skrótów.",
      taskRefs: [
        { lessonId: "testing-regressions", stepId: "regressions-debug-gate" },
        { lessonId: "testing-regressions", stepId: "regressions-apply-gate" },
      ],
    },
    {
      id: "testing-quality-gate",
      label:
        "Samodzielny kontrakt obejmuje przypadki brzegowe agregacji lub wyboru pierwszego wyniku.",
      taskRefs: [
        { lessonId: "testing-quality-workflow", stepId: "quality-modify-gate" },
        { lessonId: "testing-quality-workflow", stepId: "quality-blank-gate" },
      ],
    },
  ],
};
