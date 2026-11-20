import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-17";

export const propertyFoundationSources: Source[] = [
  {
    id: "property-proptest-introduction",
    title: "Proptest book: Introduction",
    url: "https://proptest-rs.github.io/proptest/",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wprowadzenia do property testing, zakresu dowodu lub przykładu własności.",
  },
  {
    id: "property-proptest-strategies",
    title: "Proptest book: Strategy basics",
    url: "https://proptest-rs.github.io/proptest/proptest/tutorial/strategy-basics.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu strategii, kompozycji danych lub rozróżnienia valid/invalid input.",
  },
  {
    id: "property-proptest-runner",
    title: "Proptest book: Test runner and configuration",
    url: "https://proptest-rs.github.io/proptest/proptest/tutorial/test-runner.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie limitu przypadków, konfiguracji runnera lub granicy między fixture a pakietem Cargo.",
  },
  {
    id: "property-log-analyzer",
    title: "RustCrushCourse: Log Analyzer contract",
    url: "https://github.com/fettpl/rust-workshop/blob/main/src/content/log-analyzer.ts",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie formatu rekordu, poziomów logu albo kontraktu malformed w module Log Analyzer.",
  },
];

export const propertyFoundationCompetencies: Competency[] = [
  {
    id: "state-executable-invariant",
    title:
      "Formułujesz obserwowalną własność i niezależny oracle dla ograniczonej dziedziny danych.",
  },
  {
    id: "design-bounded-generators",
    title:
      "Budujesz jawnie ograniczony generator, który rozróżnia poprawne i niepoprawne dane.",
  },
];

export const propertyFoundationConcepts: Concept[] = [
  {
    id: "property-invariant-contracts",
    title: "Własność jako kontrakt obserwowalnego wyniku",
    prerequisites: ["testing-regressions", "grep-context-selection"],
    competencyIds: ["state-executable-invariant"],
    reviewPrompt:
      "Jak zapisać własność wyboru kontekstu w Mini grep tak, aby oracle nie był kopią implementacji i aby było jasne, czego generator nie obejmuje?",
    reviewAnswer:
      "Dla każdej ograniczonej tablicy linii, zapytania i kontekstu wynik ma zawierać w kolejności każdą wybraną linię dokładnie raz, z jej numerem, tekstem i flagą dopasowania zgodną z prostym oracle opartym na regule odległości od dopasowań. Trzeba opisać granice generatora, na przykład najwyżej 24 linie, zapytanie do 32 bajtów i poprawny UTF-8; własność nie dowodzi zachowania poza tą dziedziną.",
    distinguish:
      "Oracle opisuje znaczenie danych przez niezależne reguły, a testowana funkcja wybiera wynik. Pojedynczy przykład ani porównanie z drugim skopiowanym algorytmem nie stanowią własności dla zadeklarowanej rodziny przypadków.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "property-generated-inputs",
    title: "Generator z jawnym podziałem valid i invalid",
    prerequisites: ["property-invariant-contracts"],
    competencyIds: ["design-bounded-generators"],
    reviewPrompt:
      "Dlaczego generator Log Analyzer musi jawnie produkować także malformed records, gdy podsumowanie ma filtr poziomu?",
    reviewAnswer:
      "Filtr ogranicza liczenie poprawnych rekordów, lecz nie usuwa niepoprawnych wierszy z kontraktu: malformed powinno rosnąć niezależnie od filtra. Generator musi mieć osobne gałęzie dla poprawnego timestampu, poziomu i komunikatu oraz dla wariantów, które zmieniają dokładnie jedno pole. Ograniczenie do valid-only albo ciche odrzucanie invalid danych może dać zielony test bez dowodu klasy błędów.",
    distinguish:
      "Generator wyznacza obserwowaną dziedzinę i nie jest dowodem losowości ani pełnego pokrycia wejść. `filter_map` może być użyte w implementacji po świadomej klasyfikacji, ale nie może ukrywać odrzuconych malformed records przed oracle.",
    evidenceArtifact: "rust-code",
  },
];

function choice(
  id: string,
  kind: "predict" | "observe" | "recall",
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
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: true,
  };
}

const invariantGateStarter = `fn assert_selection_property(
    _candidate: fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>,
) {
    // Zbuduj niezależny oracle i porównaj nim każdy przypadek.
}`;

const invariantGateSolution = `fn assert_selection_property(
    candidate: fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>,
) {
    let cases: &[(&[&str], &str, usize)] = &[
        (&[], "Rust", 0),
        (&["zero", "Rust", "koniec"], "Rust", 0),
        (&["Rust", "Rust", "x"], "Rust", 0),
        (&["początek", "środek", "Rust 🙂", "koniec"], "Rust", 1),
        (&["ala", "ma", "kota"], "brak", 2),
        (&["a", "Rust", "b", "Rust", "c"], "Rust", 1),
    ];
    for (lines, query, context) in cases {
        let mut expected = Vec::new();
        for (index, line) in lines.iter().enumerate() {
            let selected = lines.iter().enumerate().any(|(match_index, value)| {
                value.contains(query) && index.abs_diff(match_index) <= *context
            });
            if selected {
                expected.push((
                    index,
                    (*line).to_owned(),
                    line.contains(query),
                ));
            }
        }
        assert_eq!(candidate(lines, query, *context), expected);
    }
}`;

const invariantGateTests = `
fn select_lines(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    let mut result = Vec::new();
    for (index, line) in lines.iter().enumerate() {
        if lines.iter().enumerate().any(|(match_index, value)| value.contains(query) && index.abs_diff(match_index) <= context) {
            result.push((index, (*line).to_owned(), line.contains(query)));
        }
    }
    result
}
fn drops_adjacent_match(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    select_lines(lines, query, context).into_iter().enumerate().filter_map(|(position, item)| if position > 0 && item.2 { None } else { Some(item) }).collect()
}
fn shifts_line_number(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    select_lines(lines, query, context).into_iter().map(|(index, text, matched)| (index + 1, text, matched)).collect()
}
#[test]
fn oracle_accepts_reference_across_boundaries() {
    assert!(std::panic::catch_unwind(|| assert_selection_property(select_lines)).is_ok());
}
#[test]
fn oracle_rejects_sequence_and_index_mutants() {
    assert!(std::panic::catch_unwind(|| assert_selection_property(drops_adjacent_match)).is_err());
    assert!(std::panic::catch_unwind(|| assert_selection_property(shifts_line_number)).is_err());
}

fn wrong_empty_selection(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    if lines.is_empty() { vec![(0, String::new(), false)] } else { select_lines(lines, query, context) }
}
fn wrong_no_match_selection(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    if !lines.is_empty() && !lines.iter().any(|line| line.contains(query)) { vec![(0, lines[0].to_owned(), false)] } else { select_lines(lines, query, context) }
}
fn wrong_unicode_selection(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    if lines.iter().any(|line| !line.is_ascii()) { Vec::new() } else { select_lines(lines, query, context) }
}
fn ignores_positive_context(lines: &[&str], query: &str, _: usize) -> Vec<(usize, String, bool)> {
    select_lines(lines, query, 0)
}
fn reverses_selection(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    let mut result = select_lines(lines, query, context); result.reverse(); result
}
fn changes_selection_text(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    select_lines(lines, query, context).into_iter().map(|(index, _, matched)| (index, String::new(), matched)).collect()
}
fn marks_context_as_match(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
    select_lines(lines, query, context).into_iter().map(|(index, text, _)| (index, text, true)).collect()
}
#[test]
fn oracle_exercises_each_declared_boundary_and_every_output_field() {
    let mutants: &[fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>] = &[
        wrong_empty_selection, wrong_no_match_selection, wrong_unicode_selection,
        ignores_positive_context, reverses_selection, changes_selection_text, marks_context_as_match,
    ];
    for (index, mutant) in mutants.iter().enumerate() {
        assert!(std::panic::catch_unwind(|| assert_selection_property(*mutant)).is_err(), "unchecked selection contract {index}");
    }
}`;

const invariantObserveCode = `fn select_lines(lines: &[&str], query: &str) -> Vec<usize> {
    lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some(index)).take(1).collect()
}

fn main() {
    let lines = ["Rust", "Rust", "koniec"];
    let selected = select_lines(&lines, "Rust");
    println!("wynik mutanta: {selected:?}");
}`;

const invariantObserveTests = `#[test]
fn adjacent_matches_are_distinct() {
    let lines = ["Rust", "Rust", "koniec"];
    assert_eq!(select_lines(&lines, "Rust"), vec![0, 1]);
}`;

const invariantObserveSolution = `fn select_lines(lines: &[&str], query: &str) -> Vec<usize> {
    lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some(index)).collect()
}

fn main() {
    let lines = ["Rust", "Rust", "koniec"];
    let selected = select_lines(&lines, "Rust");
    println!("naprawiony wynik: {selected:?}");
}`;

const invariantBlankSolution = `#[derive(Debug, PartialEq, Eq)]
struct SelectionEvent {
    line_number: usize,
    text: String,
    matched: bool,
}

fn assert_event_selection_property(
    candidate: fn(&[&str], &str, usize) -> Vec<SelectionEvent>,
) {
    let cases: &[(&[&str], &str, usize)] = &[
        (&["Rust", "dalej"], "Rust", 0),
        (&["przed", "Rust", "po"], "Rust", 1),
        (&["a", "b"], "x", 1),
        (&["🙂 Rust", "Rust"], "Rust", 0),
    ];
    for (lines, query, context) in cases {
        let mut expected = Vec::new();
        for (index, line) in lines.iter().enumerate() {
            if lines.iter().enumerate().any(|(match_index, value)| {
                value.contains(query) && index.abs_diff(match_index) <= *context
            }) {
                expected.push(SelectionEvent {
                    line_number: index,
                    text: (*line).to_owned(),
                    matched: line.contains(query),
                });
            }
        }
        assert_eq!(candidate(lines, query, *context), expected);
    }
}`;

const invariantBlankTests = `
fn event_selection(lines: &[&str], query: &str, context: usize) -> Vec<SelectionEvent> {
    lines.iter().enumerate().filter_map(|(index, line)| {
        let selected = lines.iter().enumerate().any(|(match_index, value)| value.contains(query) && index.abs_diff(match_index) <= context);
        selected.then(|| SelectionEvent { line_number: index, text: (*line).to_owned(), matched: line.contains(query) })
    }).collect()
}
fn duplicate_events(lines: &[&str], query: &str, context: usize) -> Vec<SelectionEvent> {
    let mut result = event_selection(lines, query, context);
    if let Some(first) = result.first() {
        let duplicate = SelectionEvent { line_number: first.line_number, text: first.text.clone(), matched: first.matched };
        result.insert(1.min(result.len()), duplicate);
    }
    result
}
#[test]
fn event_property_keeps_order_text_and_match_flag() {
    assert!(std::panic::catch_unwind(|| assert_event_selection_property(event_selection)).is_ok());
}
#[test]
fn event_property_rejects_duplicate_events() {
    assert!(std::panic::catch_unwind(|| assert_event_selection_property(duplicate_events)).is_err());
}`;

const generatedGateStarter = `fn assert_log_summary_property(
    _candidate: fn(&[&str], Option<&str>) -> (usize, usize, usize, usize),
) {
    // Kontrakt zwraca (INFO, WARN, ERROR, malformed).
}`;

const generatedGateSolution = `fn assert_log_summary_property(
    candidate: fn(&[&str], Option<&str>) -> (usize, usize, usize, usize),
) {
    let cases: &[(&[&str], Option<&str>, (usize, usize, usize, usize))] = &[
        (&[], None, (0, 0, 0, 0)),
        (&["0 INFO start", "1 WARN retry", "2 ERROR żółć 🙂"], None, (1, 1, 1, 0)),
        (&["0 INFO start", "bad INFO broken", "1 ERROR stop"], Some("ERROR"), (0, 0, 1, 1)),
        (&["0 INFO a", "1 INFO b", "2 WARN c", "3 TRACE d", "x ERROR e"], Some("INFO"), (2, 0, 0, 2)),
        (&["0 WARN ", "1 WARN retry", "2 ERROR ok"], None, (0, 1, 1, 1)),
    ];
    for (records, filter, expected) in cases {
        assert_eq!(candidate(records, *filter), *expected);
    }
}`;

const generatedGateTests = `
fn summarize(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut counts = (0, 0, 0, 0);
    for record in records {
        let mut fields = record.splitn(3, ' ');
        let timestamp = fields.next();
        let level = fields.next();
        let message = fields.next();
        let valid_timestamp = timestamp.is_some_and(|value| !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit()));
        let valid_level = matches!(level, Some("INFO" | "WARN" | "ERROR"));
        if !valid_timestamp || !valid_level || message.is_none_or(|value| value.trim().is_empty()) { counts.3 += 1; continue; }
        if filter.is_some_and(|wanted| level != Some(wanted)) { continue; }
        match level.unwrap() { "INFO" => counts.0 += 1, "WARN" => counts.1 += 1, "ERROR" => counts.2 += 1, _ => unreachable!() }
    }
    counts
}
fn loses_filtered_malformed(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter);
    if filter.is_some() { result.3 = 0; }
    result
}
#[test]
fn summary_property_accepts_valid_and_invalid_mixture() {
    assert!(std::panic::catch_unwind(|| assert_log_summary_property(summarize)).is_ok());
}
#[test]
fn summary_property_rejects_filter_mutant() {
    assert!(std::panic::catch_unwind(|| assert_log_summary_property(loses_filtered_malformed)).is_err());
}

fn wrong_empty_summary(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    if records.is_empty() { (1, 0, 0, 0) } else { summarize(records, filter) }
}
fn loses_info(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter); result.0 = 0; result
}
fn loses_warn(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter); result.1 = 0; result
}
fn loses_error(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter); result.2 = 0; result
}
fn ignores_level_filter(records: &[&str], _: Option<&str>) -> (usize, usize, usize, usize) {
    summarize(records, None)
}
fn rejects_unicode_message(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter);
    if records.iter().any(|line| !line.is_ascii()) { result.3 += 1; }
    result
}
fn accepts_unknown_level(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter);
    if records.iter().any(|line| line.split(' ').nth(1).is_some_and(|level| !matches!(level, "INFO" | "WARN" | "ERROR"))) { result.3 = 0; }
    result
}
fn accepts_bad_timestamp(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter);
    if records.iter().any(|line| line.split(' ').next().is_some_and(|at| at.is_empty() || !at.bytes().all(|byte| byte.is_ascii_digit()))) { result.3 = 0; }
    result
}
fn accepts_empty_message(records: &[&str], filter: Option<&str>) -> (usize, usize, usize, usize) {
    let mut result = summarize(records, filter);
    if records.iter().any(|line| line.splitn(3, ' ').nth(2).is_none_or(|message| message.trim().is_empty())) { result.3 = 0; }
    result
}
#[test]
fn summary_property_exercises_valid_levels_filters_and_malformed_classes() {
    let mutants: &[fn(&[&str], Option<&str>) -> (usize, usize, usize, usize)] = &[
        wrong_empty_summary, loses_info, loses_warn, loses_error, ignores_level_filter,
        rejects_unicode_message, accepts_unknown_level, accepts_bad_timestamp, accepts_empty_message,
    ];
    for (index, mutant) in mutants.iter().enumerate() {
        assert!(std::panic::catch_unwind(|| assert_log_summary_property(*mutant)).is_err(), "unchecked summary contract {index}");
    }
}`;

const generatedObserveCode = `fn classify_record(line: &str) -> &'static str {
    let fields: Vec<_> = line.splitn(3, ' ').collect();
    if fields.len() == 3 && !fields[0].is_empty() && fields[0].bytes().all(|byte| byte.is_ascii_digit()) && matches!(fields[1], "INFO" | "WARN" | "ERROR") && !fields[2].trim().is_empty() { "valid" } else { "malformed" }
}

fn main() {
    let cases = ["0 INFO start", "bad INFO broken", "1 WARN retry"];
    let valid = cases.iter().filter(|line| classify_record(line) == "valid").count();
    let malformed = cases.len() - valid;
    println!("valid={valid}, malformed={malformed}");
}`;

const generatedBlankSolution = `fn generate_reading_cases(seed: u64) -> Vec<String> {
    let samples = [
        "0|C|start",
        "1|kPa|ciśnienie 🙂",
        "bad|C|broken",
        "2|F|wrong unit",
        "3|C|   ",
    ];
    let offset = (seed as usize) % samples.len();
    (0..samples.len())
        .map(|index| samples[(index + offset) % samples.len()].to_owned())
        .collect()
}

fn assert_reading_generator_contract(
    generator: fn(u64) -> Vec<String>,
) {
    for seed in [0, 1, 17, 64] {
        let cases = generator(seed);
        assert_eq!(cases, generator(seed), "generator musi być deterministyczny");
        assert!(cases.len() <= 24, "generator nie może zwrócić ponad 24 rekordów");
        let mut valid = 0;
        let mut invalid = 0;
        for case in cases {
            let mut fields = case.splitn(3, '|');
            let at = fields.next().unwrap_or("");
            let unit = fields.next().unwrap_or("");
            let note = fields.next().unwrap_or("");
            if at.bytes().all(|byte| byte.is_ascii_digit())
                && !at.is_empty()
                && matches!(unit, "C" | "kPa")
                && !note.trim().is_empty()
            { valid += 1; } else { invalid += 1; }
        }
        assert!(valid > 0 && invalid > 0);
    }
}`;

const generatedBlankTests = `
fn assert_generator_rejects(generator: fn(u64) -> Vec<String>) {
    assert!(std::panic::catch_unwind(|| assert_reading_generator_contract(generator)).is_err());
}
fn balanced_generator(seed: u64) -> Vec<String> {
    let mut result = Vec::new();
    if seed % 2 == 0 { result.push("0|C|ok".to_owned()); } else { result.push("bad|C|broken".to_owned()); }
    result.push("1|kPa|🙂".to_owned());
    result.push("2|F|wrong".to_owned());
    result
}
fn valid_only_generator(_: u64) -> Vec<String> {
    vec!["0|C|ok".to_owned(), "1|kPa|fine".to_owned()]
}
fn empty_generator(_: u64) -> Vec<String> { Vec::new() }
fn over_limit_generator(_: u64) -> Vec<String> {
    (0..25).map(|index| format!("{index}|C|ok")).collect()
}
fn nondeterministic_generator(seed: u64) -> Vec<String> {
    use std::sync::atomic::{AtomicUsize, Ordering};
    static CALLS: AtomicUsize = AtomicUsize::new(0);
    let call = CALLS.fetch_add(1, Ordering::Relaxed);
    vec![format!("{seed}|C|call-{call}"), "bad|F|broken".to_owned()]
}
#[test]
fn learner_generator_contract_is_executed() {
    assert_reading_generator_contract(generate_reading_cases);
}
#[test]
fn equivalent_generator_contract_requires_bounded_mixed_partition() {
    assert_reading_generator_contract(balanced_generator);
}
#[test]
fn generator_contract_rejects_empty_valid_only_and_over_limit() {
    assert_generator_rejects(empty_generator);
    assert_generator_rejects(valid_only_generator);
    assert_generator_rejects(over_limit_generator);
}
#[test]
fn generator_contract_rejects_nondeterminism() {
    assert_generator_rejects(nondeterministic_generator);
}`;

export const propertyFoundationReviewExercises: Record<string, LessonStep> = {
  "property-invariant-contracts": {
    id: "property-invariant-contracts-review",
    kind: "apply",
    title: "Powtórka: własność kolejności wyników",
    prompt:
      "Uzupełnij `assert_occurrence_property` dla funkcji `fn(&[i32], i32) -> Vec<usize>`. Oracle ma zwrócić wszystkie indeksy wartości, także duplikaty i brak dopasowania. Testy odrzucą funkcję zwracającą tylko pierwszy indeks.",
    code: `fn assert_occurrence_property(_candidate: fn(&[i32], i32) -> Vec<usize>) {
    // Zbuduj tabelę i porównaj pełną sekwencję indeksów.
}`,
    solution: `fn assert_occurrence_property(candidate: fn(&[i32], i32) -> Vec<usize>) {
    let cases: &[(&[i32], i32, &[usize])] = &[(&[], 2, &[]), (&[2, 1, 2], 2, &[0, 2]), (&[4, 4], 4, &[0, 1])];
    for (values, needle, expected) in cases { assert_eq!(candidate(values, *needle), *expected); }
}`,
    evaluator: {
      kind: "tests",
      tests: `
fn occurrences(values: &[i32], needle: i32) -> Vec<usize> { values.iter().enumerate().filter_map(|(index, value)| (*value == needle).then_some(index)).collect() }
fn first_only(values: &[i32], needle: i32) -> Vec<usize> { values.iter().position(|value| *value == needle).into_iter().collect() }
#[test] fn occurrence_review_is_mutation_sensitive() {
    assert!(std::panic::catch_unwind(|| assert_occurrence_property(occurrences)).is_ok());
    assert!(std::panic::catch_unwind(|| assert_occurrence_property(first_only)).is_err());
}`,
    },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
  "property-generated-inputs": {
    id: "property-generated-inputs-review",
    kind: "apply",
    title: "Powtórka: podział poprawnych i błędnych rekordów",
    prompt:
      "Uzupełnij `assert_partition_property` dla `fn(&[&str]) -> (usize, usize)`. Format to `AT|UNIT|NOTE`; poprawne są dziesiętne AT, jednostka C lub kPa oraz niepusta po trim notatka. Wynik to (valid, invalid).",
    code: `fn assert_partition_property(_candidate: fn(&[&str]) -> (usize, usize)) {
    // Nie odrzucaj malformed przed policzeniem drugiej części wyniku.
}`,
    solution: `fn assert_partition_property(candidate: fn(&[&str]) -> (usize, usize)) {
    let cases: &[(&[&str], (usize, usize))] = &[(&[], (0, 0)), (&["0|C|ok", "bad|C|x", "1|kPa|🙂"], (2, 1)), (&["2|F|x", "3|C|   "], (0, 2))];
    for (records, expected) in cases { assert_eq!(candidate(records), *expected); }
}`,
    evaluator: {
      kind: "tests",
      tests: `
fn partition(records: &[&str]) -> (usize, usize) { records.iter().fold((0, 0), |(valid, invalid), record| { let fields: Vec<_> = record.splitn(3, '|').collect(); let ok = fields.len() == 3 && !fields[0].is_empty() && fields[0].bytes().all(|byte| byte.is_ascii_digit()) && matches!(fields[1], "C" | "kPa") && !fields[2].trim().is_empty(); if ok { (valid + 1, invalid) } else { (valid, invalid + 1) } }) }
fn discards_invalid(records: &[&str]) -> (usize, usize) { (partition(records).0, 0) }
#[test] fn partition_review_keeps_invalid_branch() {
    assert!(std::panic::catch_unwind(|| assert_partition_property(partition)).is_ok());
    assert!(std::panic::catch_unwind(|| assert_partition_property(discards_invalid)).is_err());
}`,
    },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
};

export const propertyFoundationLessons: Lesson[] = [
  {
    id: "property-invariants",
    moduleId: "property-contracts",
    conceptIds: ["property-invariant-contracts"],
    competencyIds: ["state-executable-invariant"],
    prerequisites: ["testing-regressions", "grep-context-selection"],
    title: "Własność zaczyna się od obserwowalnego kontraktu",
    subtitle:
      "Zapisz regułę dla rodziny wejść i zbuduj oracle, który nie kopiuje badanego algorytmu.",
    minutes: 24,
    outcomes: [
      "Formułujesz własność jako relację między wejściem a pełną sekwencją wyniku.",
      "Oddzielasz prosty oracle od implementacji selekcji kontekstu.",
      "Rozpoznajesz, że generator i oracle ograniczają zakres dowodu.",
    ],
    steps: [
      choice(
        "property-invariants-predict",
        "predict",
        "Przewidź: który wiersz odrzuca mutanta?",
        "Mutant usuwa drugie sąsiadujące dopasowanie. Który warunek najlepiej ujawni błąd?",
        [
          "Dwie sąsiadujące linie zawierające zapytanie.",
          "Jedna linia bez zapytania.",
          "Tylko pusta tablica.",
        ],
        0,
        [
          "Pełna sekwencja i duplikaty są częścią własności.",
          "Nieobecność dopasowania nie odróżnia tego mutanta.",
          "Pustka jest ważna, lecz nie ujawnia utraty drugiego wyniku.",
        ],
      ),
      run(
        "property-invariants-run",
        "Uruchom: oracle i wynik",
        "Obserwuj, że oracle porównuje numery, tekst i flagę dopasowania, a nie tylko liczbę elementów.",
        `fn select<'a>(lines: &'a [&'a str], query: &str) -> Vec<(usize, &'a str, bool)> {
    lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some((index, *line, true))).collect()
}
fn main() {
    let lines = ["a", "Rust", "Rust"];
    let expected = [(1, "Rust", true), (2, "Rust", true)];
    let actual = select(&lines, "Rust");
    assert_eq!(actual, expected);
    println!("oracle: {} zdarzenia, kolejność zachowana", actual.len());
}`,
        "oracle: 2 zdarzenia, kolejność zachowana\n",
      ),
      {
        id: "property-invariants-observe",
        kind: "observe",
        title: "Odczytaj porażkę mutanta",
        prompt:
          "Uruchom test obserwacyjny. Kod kompiluje się, ale własność pełnej sekwencji ujawnia utratę sąsiedniego dopasowania.",
        code: invariantObserveCode,
        solution: invariantObserveSolution,
        evaluator: { kind: "tests", tests: invariantObserveTests },
        expectedStatus: "test-failure",
        evidenceKind: "exposure",
      },
      explain(
        "property-invariants-explain",
        "Wyjaśnij: co dokładnie dowodzi własność?",
        "Wymień oracle, domenę generatora i obserwowalne pola wyniku. Dodaj jedno ograniczenie takiego dowodu.",
        [
          "Oracle niezależnie wylicza oczekiwane numery, tekst i flagi dla zadeklarowanych przypadków.",
          "Własność obejmuje całą sekwencję: kolejność i dokładnie jedno wystąpienie każdej wybranej linii.",
          "Ograniczenia generatora, na przykład rozmiar wejścia i UTF-8, wyznaczają zakres dowodu.",
        ],
      ),
      tested({
        id: "property-invariants-gate",
        kind: "debug",
        title: "Napraw: własność selekcji kontekstu",
        prompt:
          "Uzupełnij helper dla funkcji `fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>`. Zbuduj niezależny oracle: wybierz każdą linię, która leży najwyżej `context` pozycji od dowolnej linii zawierającej query, zachowaj kolejność, numer, tekst i flagę dopasowania. Sprawdź pustkę, brak dopasowania, duplikaty, kontekst 0 i 1 oraz Unicode. Nie uznawaj samej liczby wyników za własność.",
        code: invariantGateStarter,
        solution: invariantGateSolution,
        tests: invariantGateTests,
        hints: [
          "Przejdź po wszystkich indeksach wejścia i osobno sprawdź, czy któryś match jest w odległości context.",
          "Wynik porównuj jako Vec<(usize, String, bool)>; deduplikacja lub zmiana numeru ma oblać test.",
        ],
      }),
      tested({
        id: "property-invariants-blank",
        kind: "blank",
        title: "Od zera: sekwencja zdarzeń",
        prompt:
          "Zdefiniuj `SelectionEvent { line_number: usize, text: String, matched: bool }` z Debug, PartialEq i Eq oraz `assert_event_selection_property(fn(&[&str], &str, usize) -> Vec<SelectionEvent>)`. Zachowaj pełną kolejność i jedno zdarzenie na wybraną linię według tej samej reguły kontekstu. Testy odrzucą duplikowanie zdarzeń.",
        solution: invariantBlankSolution,
        tests: invariantBlankTests,
        hints: [
          "Najpierw wylicz boolean selected dla każdego indeksu, potem utwórz pojedyncze zdarzenie.",
          "`matched` oznacza bezpośrednie zawieranie query; linia wybrana wyłącznie jako kontekst ma false.",
        ],
      }),
      choice(
        "property-invariants-recall",
        "recall",
        "Przypomnij: własność czy przykład?",
        "Co jest mocniejszym kontraktem dla wyniku selekcji?",
        [
          "Dla ograniczonej rodziny wejść wynik równa się oracle pod względem numeru, tekstu, flagi i kolejności.",
          "Dla jednego przykładu wynik ma długość 2.",
          "Wynik zawiera co najmniej jedno dopasowanie.",
        ],
        0,
        [
          "To opisuje relację wejście–wynik, a nie pojedynczą obserwację.",
          "Jedna długość nie wykrywa utraty tekstu, numeru ani kolejności.",
          "Nie opisuje pustki, duplikatów ani kontekstu.",
        ],
      ),
    ],
    misconceptions: [
      "Własność nie oznacza dowodu dla wszystkich możliwych danych; obowiązuje w jawnie opisanej dziedzinie generatora.",
      "Oracle nie powinien być drugą kopią badanego algorytmu.",
      "Sama liczba wyników nie chroni kolejności, numerów, tekstu ani duplikatów.",
    ],
    transferTask:
      "Zaprojektuj własność dla funkcji zwracającej indeksy wszystkich wystąpień słowa w tekście: określ oracle, przypadki Unicode, duplikaty i granice generatora.",
    evidenceGate:
      "Zaimplementujesz helper dla selekcji kontekstu oraz niezależne zadanie zdarzeń; oba odrzucą sensowne mutanty sekwencji.",
    sourceIds: [
      "property-proptest-introduction",
      "property-proptest-strategies",
      "property-log-analyzer",
    ],
  },
  {
    id: "property-generated-inputs",
    moduleId: "property-contracts",
    conceptIds: ["property-generated-inputs"],
    competencyIds: ["design-bounded-generators"],
    prerequisites: ["property-invariants"],
    title: "Generator pokazuje, czego test naprawdę dotyka",
    subtitle:
      "Buduj ograniczone dane poprawne i malformed, zamiast ukrywać niewygodne przypadki.",
    minutes: 25,
    outcomes: [
      "Projektujesz mieszankę rekordów poprawnych i niepoprawnych z jawnymi granicami.",
      "Zachowujesz malformed niezależnie od filtra poziomu.",
      "Rozpoznajesz bias generatora valid-only i ciche odrzucanie danych.",
    ],
    steps: [
      choice(
        "property-generated-inputs-predict",
        "predict",
        "Przewidź: co robi filtr z malformed?",
        "Podsumowanie ma filtr WARN, a dane zawierają poprawny WARN i niepoprawny rekord. Co powinno się stać?",
        [
          "WARN rośnie, a malformed także rośnie.",
          "Oba rekordy znikają, bo filtr usuwa wszystko poza WARN.",
          "Malformed zamienia się w INFO.",
        ],
        0,
        [
          "Filtr dotyczy poprawnych poziomów; klasyfikacja malformed jest niezależna.",
          "To ukryłoby klasę błędów i zafałszowało kontrakt.",
          "Nieznany lub uszkodzony rekord nie staje się poprawnym poziomem.",
        ],
      ),
      run(
        "property-generated-inputs-run",
        "Uruchom: jawny podział danych",
        "Zobacz, że generator nie musi być losowy, aby ujawnić, jakie klasy danych obejmuje.",
        generatedObserveCode,
        "valid=2, malformed=1\n",
      ),
      {
        id: "property-generated-inputs-observe",
        kind: "observe",
        title: "Odczytaj bias valid-only",
        prompt:
          "Uruchom generator valid-only: odrzuca uszkodzony rekord i wypisuje 2. Ten krok zalicza obserwacja utraty klasy malformed. W następnym kroku wyjaśnij jej skutek, a w końcowym edytowalnym zadaniu „Przywróć malformed w generatorze” (property-generated-inputs-repair) napraw generator i sprawdź, że zachowuje wszystkie 3 rekordy.",
        code: `fn generated() -> Vec<&'static str> {
    ["0 INFO ok", "bad INFO broken", "1 WARN retry"]
        .into_iter()
        .filter(|line| line.bytes().next().is_some_and(|byte| byte.is_ascii_digit()))
        .collect()
}
fn main() { println!("wygenerowano: {} rekordy", generated().len()); }`,
        solution: `fn generated() -> Vec<&'static str> {
    ["0 INFO ok", "bad INFO broken", "1 WARN retry"]
        .into_iter()
        .filter(|line| line.bytes().next().is_some_and(|byte| byte.is_ascii_digit()))
        .collect()
}
fn main() { println!("wygenerowano: {} rekordy", generated().len()); }`,
        evaluator: {
          kind: "exact-output",
          expected: "wygenerowano: 2 rekordy\n",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      explain(
        "property-generated-inputs-explain",
        "Wyjaśnij: generator to część dowodu",
        "W odpowiedzi nazwij osobną gałąź invalid, limit rozmiaru i klasę błędu, którą traci valid-only generator.",
        [
          "Generator powinien jawnie tworzyć poprawne oraz malformed rekordy, zamiast odrzucać invalid przed obserwacją.",
          "Jawną granicą jest na przykład 0–24 rekordy i ograniczona długość wiadomości; wynik nie obejmuje danych poza nią.",
          "Przy filtrze malformed nadal wpływa na licznik błędów, więc valid-only traci tę klasę dowodu.",
        ],
      ),
      tested({
        id: "property-generated-inputs-gate",
        kind: "debug",
        title: "Napraw: własność podsumowania logów",
        prompt:
          "Uzupełnij `assert_log_summary_property` dla `fn(&[&str], Option<&str>) -> (usize, usize, usize, usize)`, gdzie tuple oznacza INFO, WARN, ERROR, malformed. Rekord ma format `TIMESTAMP LEVEL MESSAGE`: timestamp to niepusty dziesiętny ASCII, poziom to dokładnie INFO/WARN/ERROR, a wiadomość jest niepusta po trim. Filtr ogranicza tylko poprawne poziomy; malformed licz niezależnie. Uwzględnij pustkę, Unicode, nieznany poziom, zły timestamp i pustą wiadomość.",
        code: generatedGateStarter,
        solution: generatedGateSolution,
        tests: generatedGateTests,
        hints: [
          "Oracle najpierw klasyfikuje cały rekord, dopiero potem stosuje filtr do poprawnego poziomu.",
          'Przypadek z Some("ERROR") i uszkodzonym rekordem odróżnia poprawny helper od mutanta zerującego malformed.',
        ],
      }),
      tested({
        id: "property-generated-inputs-blank",
        kind: "blank",
        title: "Od zera: generator odczytów",
        prompt:
          "Zaimplementuj `generate_reading_cases(seed: u64) -> Vec<String>` dla formatu `AT|UNIT|NOTE` oraz `assert_reading_generator_contract(fn(u64) -> Vec<String>)`. Generator ma być deterministyczny, mieć najwyżej 24 rekordy i dla seedów 0, 1, 17 oraz 64 zawierać jednocześnie valid i invalid. Valid oznacza niepusty dziesiętny AT, jednostkę C albo kPa i niepustą po trim NOTE. Nie używaj losowości, plików ani sieci.",
        solution: generatedBlankSolution,
        tests: generatedBlankTests,
        hints: [
          "Stała tablica pięciu przykładów wystarczy; seed może wyznaczać przesunięcie, ale nie może usuwać jednej z klas.",
          "Testuj klasyfikację każdego wygenerowanego Stringa osobno i sprawdź valid > 0 oraz invalid > 0.",
        ],
      }),
      choice(
        "property-generated-inputs-recall",
        "recall",
        "Przypomnij: czego nie dowodzi zielony generator?",
        "Generator tworzy 24 poprawne rekordy i własność przechodzi. Jakie zdanie jest prawdziwe?",
        [
          "Nie wiemy, jak zachowuje się parser dla malformed danych, bo generator ich nie obejmuje.",
          "Dowiedliśmy poprawności dla każdego możliwego rekordu.",
          "Liczba 24 oznacza pełne pokrycie domeny.",
        ],
        0,
        [
          "Valid-only to jawne ograniczenie dowodu, nie dowód odrzucania błędów.",
          "Własność nie rozszerza się automatycznie poza generator i oracle.",
          "Limit przypadków opisuje budżet, a nie pełną dziedzinę.",
        ],
      ),
      {
        id: "property-generated-inputs-repair",
        kind: "debug",
        title: "Przywróć malformed w generatorze",
        prompt:
          "Napraw generator z obserwacji valid-only. `generated() -> Vec<&'static str>` ma zwracać wszystkie trzy wejściowe rekordy w tej samej kolejności: 0 INFO ok, bad INFO broken oraz 1 WARN retry. Zachowaj także uszkodzony timestamp; klasyfikacja jest zadaniem badanego parsera, a generator ma udostępniać obie klasy danych. Testy sprawdzą liczbę 3 i obecność niepoprawnego rekordu, a nie tylko napis z main.",
        code: `fn generated() -> Vec<&'static str> {
    ["0 INFO ok", "bad INFO broken", "1 WARN retry"]
        .into_iter()
        .filter(|line| line.bytes().next().is_some_and(|byte| byte.is_ascii_digit()))
        .collect()
}
fn main() { println!("wygenerowano: {} rekordy", generated().len()); }`,
        solution: `fn generated() -> Vec<&'static str> {
    ["0 INFO ok", "bad INFO broken", "1 WARN retry"].to_vec()
}
fn main() { println!("wygenerowano: {} rekordy", generated().len()); }`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn preserves_valid_and_malformed_records_in_order() {
    let cases = generated();
    assert_eq!(cases.len(), 3);
    assert_eq!(cases, vec!["0 INFO ok", "bad INFO broken", "1 WARN retry"]);
    assert!(cases.contains(&"bad INFO broken"));
}`,
        },
        expectedStatus: "success",
        evidenceKind: "fix",
        evidenceGate: false,
      },
    ],
    misconceptions: [
      "Filtr poziomu nie powinien usuwać malformed z licznika błędów.",
      "Valid-only generator może być potrzebny dla jednej własności, ale wymaga osobnej własności invalid.",
      "Mały limit i deterministyczny seed są częścią reprodukowalnego dowodu, lecz nie dowodzą wszystkich danych.",
    ],
    transferTask:
      "Zaprojektuj generator zdarzeń poleceń Todo z osobnymi gałęziami poprawnych i błędnych komend oraz napisz, które ograniczenia pozostają poza dowodem.",
    evidenceGate:
      "Zaimplementujesz podsumowanie z filtrem i generator odczytów; ukryte testy wymagają zachowania obu klas valid/invalid.",
    sourceIds: [
      "property-proptest-strategies",
      "property-proptest-runner",
      "property-log-analyzer",
    ],
  },
];
