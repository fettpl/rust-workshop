import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-17";

export const propertyCounterexampleSources: Source[] = [
  {
    id: "property-shrinking-basics",
    title: "Proptest: Shrinking basics",
    url: "https://proptest-rs.github.io/proptest/proptest/tutorial/shrinking-basics.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu shrinkingu, zachowania kontrprzykładu albo przykładowego replay.",
  },
  {
    id: "property-failure-persistence",
    title: "Proptest: Failure persistence",
    url: "https://proptest-rs.github.io/proptest/proptest/failure-persistence.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu pliku regresji, seeda lub ograniczeń odtwarzania.",
  },
  {
    id: "property-strategy-basics",
    title: "Proptest: Strategy basics",
    url: "https://proptest-rs.github.io/proptest/proptest/tutorial/strategy-basics.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu strategii, precondition albo domeny generatora.",
  },
];

export const propertyCounterexampleCompetencies: Competency[] = [
  {
    id: "diagnose-shrink-and-replay",
    title:
      "Diagnozujesz kontrprzykład, ograniczasz go bez obietnicy globalnej minimalności i odtwarzasz po stabilnym kontrakcie.",
  },
  {
    id: "transfer-metamorphic-relation",
    title:
      "Formułujesz relację metamorfologiczną z precondition i przenosisz ją na inną domenę parsera.",
  },
  {
    id: "state-tool-evidence-boundary",
    title:
      "Rozdzielasz dowód z ograniczonego generatora, property testing i kampanii fuzzingowej.",
  },
];

export const propertyCounterexampleConcepts: Concept[] = [
  {
    id: "property-shrinking-replay",
    title: "Kontrolowany shrink, zapis kontrprzykładu i replay",
    prerequisites: ["property-generated-inputs"],
    competencyIds: ["diagnose-shrink-and-replay"],
    reviewPrompt:
      "Co musi zachować replay zapisanego kontrprzykładu i dlaczego mniejszy przypadek nie oznacza globalnie minimalnego?",
    reviewAnswer:
      "Replay sprawdza wersję schematu, identyfikator kontraktu, digest definicji i tę samą zakodowaną sprawę, a następnie odtwarza klasyfikację awarii bez nowej losowości. Shrinker może znaleźć najmniejszy przypadek w swoim ograniczonym porządku i budżecie, ale nie dowodzi globalnej minimalności.",
    distinguish:
      "Persisted seed lub plik regresji jest uchwytem do odtworzenia, nie obietnicą, że zmieniona strategia wytworzy identyczną wartość. Zmiana generatora albo kontraktu wymaga ponownej oceny świadka.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "property-metamorphic-transfer",
    title: "Relacja metamorfologiczna i jej warunki brzegowe",
    prerequisites: ["property-shrinking-replay"],
    competencyIds: [
      "transfer-metamorphic-relation",
      "state-tool-evidence-boundary",
    ],
    reviewPrompt:
      "Jak odróżnisz poprawną relację między dwoma uruchomieniami od przypadkowej równości samych liczników?",
    reviewAnswer:
      "Najpierw zapisujesz precondition, transformację i obserwowalny wynik. Sprawdzasz cały wynik istotny dla kontraktu, a przypadek spoza precondition zwracasz jako nieobjęty relacją. Sam równy total może ukryć zmianę poziomów, kolejności albo klasy błędu.",
    distinguish:
      "Relacja nie jest drugą kopią implementacji. Opisuje, co ma pozostać niezmienne po kontrolowanej transformacji; filtrowanie, stan parsera lub zmiana klasy danych mogą ją unieważnić.",
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

function coding(options: {
  id: string;
  kind: "debug" | "blank" | "recall";
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
    ...(options.code === undefined
      ? {}
      : { code: options.code, expectedStatus: "success" as const }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind:
      options.kind === "debug"
        ? "fix"
        : options.kind === "blank"
          ? "assessment"
          : "recall",
    evidenceGate: options.gate ?? false,
  };
}

const shrinkGateStarter = `#[derive(Clone, Debug, PartialEq, Eq)]
struct SearchCase { context: usize, query: String, lines: Vec<String> }

#[derive(Clone, Debug, PartialEq, Eq)]
struct SavedCounterexample { schema_version: u8, contract_id: String, case: SearchCase, failure: String, digest: u64 }

fn case_size(case: &SearchCase) -> usize {
    case.lines.len() + case.query.len() + case.lines.iter().map(String::len).sum::<usize>() + case.context
}

fn shrink_failure<F>(original: SearchCase, fails: F) -> SearchCase
where
    F: Fn(&SearchCase) -> bool + Copy,
{
    // Zwróć mniejszy przypadek, który nadal spełnia fails.
    original
}

fn save_counterexample(case: SearchCase) -> SavedCounterexample {
    SavedCounterexample { schema_version: 1, contract_id: String::from("mini-grep-boundary-v1"), case, failure: String::from("selection-mismatch"), digest: 0x51_48_52_31 }
}

fn boundary_failure(case: &SearchCase) -> bool {
    !case.lines.is_empty() && case.lines.iter().any(|line| line.contains(&case.query))
}

fn replay_counterexample(saved: &SavedCounterexample) -> Result<bool, &'static str> {
    if saved.schema_version != 1 || saved.contract_id != "mini-grep-boundary-v1" || saved.digest != 0x51_48_52_31 {
        return Err("stale-contract");
    }
    Ok(saved.failure == "selection-mismatch" && boundary_failure(&saved.case))
}`;

const shrinkGateSolution = `#[derive(Clone, Debug, PartialEq, Eq)]
struct SearchCase { context: usize, query: String, lines: Vec<String> }

#[derive(Clone, Debug, PartialEq, Eq)]
struct SavedCounterexample { schema_version: u8, contract_id: String, case: SearchCase, failure: String, digest: u64 }

fn case_size(case: &SearchCase) -> usize {
    case.lines.len() + case.query.len() + case.lines.iter().map(String::len).sum::<usize>() + case.context
}

fn shrink_failure<F>(original: SearchCase, fails: F) -> SearchCase
where
    F: Fn(&SearchCase) -> bool + Copy,
{
    let mut current = original;
    if !fails(&current) { return current; }
    let mut budget = 64;
    loop {
        let mut candidates = Vec::new();
        for index in 0..current.lines.len() {
            let mut candidate = current.clone();
            candidate.lines.remove(index);
            candidates.push(candidate);
        }
        if !current.query.is_empty() {
            let mut candidate = current.clone();
            candidate.query.pop();
            candidates.push(candidate);
        }
        if current.context > 0 {
            let mut candidate = current.clone();
            candidate.context -= 1;
            candidates.push(candidate);
        }
        for line_index in 0..current.lines.len() {
            let mut candidate = current.clone();
            candidate.lines[line_index].pop();
            candidates.push(candidate);
        }
        let mut progressed = false;
        for candidate in candidates {
            if budget == 0 { return current; }
            budget -= 1;
            if case_size(&candidate) < case_size(&current) && fails(&candidate) {
                current = candidate;
                progressed = true;
                break;
            }
        }
        if !progressed { return current; }
    }
}

fn save_counterexample(case: SearchCase) -> SavedCounterexample {
    SavedCounterexample { schema_version: 1, contract_id: String::from("mini-grep-boundary-v1"), case, failure: String::from("selection-mismatch"), digest: 0x51_48_52_31 }
}

fn boundary_failure(case: &SearchCase) -> bool {
    !case.lines.is_empty() && case.lines.iter().any(|line| line.contains(&case.query))
}

fn replay_counterexample(saved: &SavedCounterexample) -> Result<bool, &'static str> {
    if saved.schema_version != 1 || saved.contract_id != "mini-grep-boundary-v1" || saved.digest != 0x51_48_52_31 {
        return Err("stale-contract");
    }
    Ok(saved.failure == "selection-mismatch" && boundary_failure(&saved.case))
}`;

const shrinkGateTests = `
#[test]
fn shrink_is_strictly_smaller_and_preserves_the_failure() {
    let original = SearchCase { context: 2, query: String::from("needle"), lines: vec![String::from("prefix"), String::from("needle"), String::from("suffix")] };
    let before = case_size(&original);
    let still_fails = |case: &SearchCase| case.query == "needle" && case.lines.iter().any(|line| line == "needle");
    let reduced = shrink_failure(original.clone(), still_fails);
    assert!(case_size(&reduced) < before);
    assert!(still_fails(&reduced));
    assert!(reduced.lines.iter().any(|line| line == "needle"));
}

#[test]
fn shrink_uses_character_boundaries_for_unicode_and_respects_a_false_predicate() {
    let original = SearchCase { context: 1, query: String::from("needle"), lines: vec![String::from("préfix😀needle"), String::from("tail")] };
    let reduced = shrink_failure(original.clone(), |case| case.lines.iter().any(|line| line.contains("needle")));
    assert!(case_size(&reduced) < case_size(&original));
    assert!(reduced.lines.iter().any(|line| line.contains("needle")));
    assert_eq!(shrink_failure(original.clone(), |_| false), original);
}

#[test]
fn replay_checks_the_contract_and_rejects_stale_witnesses() {
    let case = SearchCase { context: 0, query: String::from("needle"), lines: vec![String::from("needle"), String::from("tail")] };
    let saved = save_counterexample(case);
    assert_eq!(replay_counterexample(&saved), Ok(true));
    let mut non_failure = saved.clone();
    non_failure.case.lines = vec![String::from("other")];
    assert_eq!(replay_counterexample(&non_failure), Ok(false));
    let mut stale = saved.clone(); stale.digest += 1;
    assert_eq!(replay_counterexample(&stale), Err("stale-contract"));
}`;

const shrinkBlankSolution = `#[derive(Clone, Debug, PartialEq, Eq)]
struct ReadingCase { records: Vec<String>, filter: Option<String> }

const SCHEMA: &str = "reading-v1";
const CONTRACT: &str = "log-summary-v1";
const DIGEST: u64 = 0x52_45_41_44;

fn replay_reading_witness(encoded: &str) -> Result<bool, &'static str> {
    let mut parts = encoded.split('|');
    if parts.next() != Some(SCHEMA) { return Err("schema"); }
    if parts.next() != Some(CONTRACT) { return Err("contract"); }
    let digest = parts.next().ok_or("schema")?.parse::<u64>().map_err(|_| "schema")?;
    if digest != DIGEST { return Err("digest"); }
    let failure_class = parts.next().ok_or("schema")?;
    if failure_class != "matched" && failure_class != "mismatch" { return Err("class"); }
    let filter = parts.next().ok_or("schema")?;
    let records: Vec<&str> = parts.collect();
    if records.is_empty() || records.iter().any(|record| record.is_empty()) { return Err("schema"); }
    let expected = filter == "ERROR";
    let observed = records.iter().any(|record| record.starts_with("ERROR:"));
    let actual_class = if expected == observed { "matched" } else { "mismatch" };
    Ok(actual_class == failure_class)
}`;

const shrinkBlankTests = `
#[test]
fn replays_a_saved_case_without_ambient_randomness() {
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1380270404|matched|ERROR|INFO:ok|ERROR:disk"), Ok(true));
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1380270404|matched|WARN|INFO:ok"), Ok(true));
}

#[test]
fn preserves_the_saved_class_and_rejects_stale_protocol_fields() {
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1380270404|matched|ERROR|INFO:ok"), Ok(false));
    assert_eq!(replay_reading_witness("reading-v2|log-summary-v1|1380270404|matched|ERROR|ERROR:disk"), Err("schema"));
    assert_eq!(replay_reading_witness("reading-v1|other-contract|1380270404|matched|ERROR|ERROR:disk"), Err("contract"));
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1|matched|ERROR|ERROR:disk"), Err("digest"));
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1380270404|unknown|ERROR|ERROR:disk"), Err("class"));
    assert_eq!(replay_reading_witness("reading-v1|log-summary-v1|1380270404|matched|ERROR|"), Err("schema"));
}`;

const shrinkRecallSolution = `#[derive(Clone, Debug, PartialEq, Eq)]
struct StreamCase { filter: Option<String>, chunks: Vec<String> }

const STREAM_SCHEMA: &str = "stream-v1";
const STREAM_CONTRACT: &str = "stream-summary-v1";
const STREAM_DIGEST: u64 = 0x53_54_52_4d;

fn replay_stream_witness(encoded: &str) -> Result<usize, &'static str> {
    let mut parts = encoded.split('|');
    if parts.next() != Some(STREAM_SCHEMA) { return Err("schema"); }
    if parts.next() != Some(STREAM_CONTRACT) { return Err("contract"); }
    let digest = parts.next().ok_or("schema")?.parse::<u64>().map_err(|_| "schema")?;
    if digest != STREAM_DIGEST { return Err("digest"); }
    let failure_class = parts.next().ok_or("schema")?;
    if failure_class != "matched" && failure_class != "mismatch" { return Err("class"); }
    let expected_count = parts.next().ok_or("schema")?.parse::<usize>().map_err(|_| "schema")?;
    let filter = parts.next().ok_or("schema")?;
    let chunks: Vec<&str> = parts.collect();
    if chunks.is_empty() || chunks.iter().any(|chunk| chunk.is_empty()) { return Err("schema"); }
    let count = chunks.iter().filter(|chunk| filter == "ANY" || chunk.starts_with(filter)).count();
    let actual_class = if count == expected_count { "matched" } else { "mismatch" };
    if actual_class != failure_class { return Err("class"); }
    Ok(count)
}`;

const shrinkRecallTests = `
#[test]
fn replays_an_unterminated_final_chunk_deterministically() {
    assert_eq!(replay_stream_witness("stream-v1|stream-summary-v1|1398035021|matched|1|ERROR|INFO:ok|ERROR:last"), Ok(1));
    assert_eq!(replay_stream_witness("stream-v1|stream-summary-v1|1398035021|matched|2|ANY|INFO:ok|ERROR:last"), Ok(2));
}

#[test]
fn validates_the_stream_contract_before_replaying_chunks() {
    assert_eq!(replay_stream_witness("stream-v1|stream-summary-v1|1398035021|matched|2|ERROR|INFO:ok|ERROR:last"), Err("class"));
    assert_eq!(replay_stream_witness("stream-v1|stream-summary-v2|1398035021|matched|1|ERROR|ERROR:last"), Err("contract"));
    assert_eq!(replay_stream_witness("stream-v1|stream-summary-v1|1398035021|matched|1|ERROR|"), Err("schema"));
}`;

const metamorphicGateStarter = `fn selected(lines: &[String], query: &str, context: usize) -> Vec<usize> {
    lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some(index)).collect()
}

fn append_nonmatching_preserves(selected: fn(&[String], &str, usize) -> Vec<usize>, lines: &[String], query: &str, context: usize, suffix: &str) -> bool {
    // Relacja obowiązuje wyłącznie dla context == 0 i niepasującego suffixu.
    false
}`;

const metamorphicGateSolution = `fn selected(lines: &[String], query: &str, _context: usize) -> Vec<usize> {
    lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some(index)).collect()
}

fn append_nonmatching_preserves(selected: fn(&[String], &str, usize) -> Vec<usize>, lines: &[String], query: &str, context: usize, suffix: &str) -> bool {
    if context != 0 || suffix.contains(query) { return false; }
    let before = selected(lines, query, context);
    let mut extended = lines.to_vec();
    extended.push(String::from(suffix));
    before == selected(&extended, query, context)
}`;

const metamorphicGateTests = `
#[test]
fn preserves_the_full_selection_under_the_declared_precondition() {
    let lines = vec![String::from("start"), String::from("needle"), String::from("end")];
    assert!(append_nonmatching_preserves(selected, &lines, "needle", 0, "other"));
    assert!(!append_nonmatching_preserves(selected, &lines, "needle", 1, "other"));
}

#[test]
fn rejects_a_matching_suffix_even_when_the_shape_looks_similar() {
    let lines = vec![String::from("start"), String::from("needle")];
    assert!(!append_nonmatching_preserves(selected, &lines, "needle", 0, "needle"));
}

#[test]
fn compares_both_full_callback_results_even_when_their_lengths_match() {
    fn shifts_on_append(lines: &[String], _query: &str, _context: usize) -> Vec<usize> {
        if lines.len() == 3 { vec![1] } else { vec![2] }
    }
    let lines = vec![String::from("start"), String::from("needle"), String::from("end")];
    assert!(!append_nonmatching_preserves(shifts_on_append, &lines, "needle", 0, "other"));
}`;

const metamorphicBlankSolution = `#[derive(Clone, Debug, PartialEq, Eq)]
struct Record { level: String, malformed: bool }

#[derive(Clone, Debug, PartialEq, Eq)]
struct Summary { info: usize, warn: usize, error: usize, malformed: usize }

fn summarize(records: &[Record], filter: Option<&str>) -> Summary {
    let mut summary = Summary { info: 0, warn: 0, error: 0, malformed: 0 };
    for record in records {
        if record.malformed { summary.malformed += 1; continue; }
        if filter.is_some_and(|value| value != record.level) { continue; }
        match record.level.as_str() { "INFO" => summary.info += 1, "WARN" => summary.warn += 1, "ERROR" => summary.error += 1, _ => summary.malformed += 1 }
    }
    summary
}

fn permutation_preserves_summary(summarize: fn(&[Record], Option<&str>) -> Summary, original: &[Record], permuted: &[Record], filter: Option<&str>) -> bool {
    if filter.is_some() || original.len() != permuted.len() { return false; }
    let mut left: Vec<(String, bool)> = original.iter().map(|record| (record.level.clone(), record.malformed)).collect();
    let mut right: Vec<(String, bool)> = permuted.iter().map(|record| (record.level.clone(), record.malformed)).collect();
    left.sort(); right.sort();
    left == right && summarize(original, filter) == summarize(permuted, filter)
}`;

const metamorphicBlankTests = `
#[test]
fn permutation_preserves_each_level_and_malformed_count() {
    let original = vec![Record { level: String::from("INFO"), malformed: false }, Record { level: String::from("ERROR"), malformed: false }, Record { level: String::from("BROKEN"), malformed: true }];
    let permuted = vec![original[2].clone(), original[0].clone(), original[1].clone()];
    assert!(permutation_preserves_summary(summarize, &original, &permuted, None));
}

#[test]
fn relation_rejects_changed_multiset_and_filter_precondition() {
    let original = vec![Record { level: String::from("INFO"), malformed: false }, Record { level: String::from("ERROR"), malformed: false }];
    let changed = vec![Record { level: String::from("WARN"), malformed: false }, Record { level: String::from("ERROR"), malformed: false }];
    assert!(!permutation_preserves_summary(summarize, &original, &changed, None));
    assert!(!permutation_preserves_summary(summarize, &original, &original, Some("INFO")));
}

#[test]
fn compares_every_summary_field_even_when_the_total_is_unchanged() {
    fn order_sensitive(records: &[Record], filter: Option<&str>) -> Summary {
        let mut summary = summarize(records, filter);
        if records.first().is_some_and(|record| record.malformed) {
            summary.info = summary.info.saturating_sub(1);
            summary.error += 1;
        }
        summary
    }
    let original = vec![Record { level: String::from("INFO"), malformed: false }, Record { level: String::from("ERROR"), malformed: false }, Record { level: String::from("BROKEN"), malformed: true }];
    let permuted = vec![original[2].clone(), original[0].clone(), original[1].clone()];
    assert!(!permutation_preserves_summary(order_sensitive, &original, &permuted, None));
}`;

const metamorphicRecallSolution = `#[derive(Clone, Debug, PartialEq, Eq)]
struct Event { kind: String, accepted: bool }

fn observe(events: &[Event], _filter: Option<&str>) -> Vec<(String, bool)> {
    let mut result: Vec<(String, bool)> = events.iter().map(|event| (event.kind.clone(), event.accepted)).collect();
    result.sort();
    result
}

fn streaming_relation(observe: fn(&[Event], Option<&str>) -> Vec<(String, bool)>, base: &[Event], permuted: &[Event], filter: Option<&str>) -> bool {
    if filter.is_some() || base.len() != permuted.len() { return false; }
    observe(base, filter) == observe(permuted, filter)
}`;

const metamorphicRecallTests = `
#[test]
fn transfers_the_relation_to_streaming_events() {
    let base = vec![Event { kind: String::from("open"), accepted: true }, Event { kind: String::from("close"), accepted: false }];
    let permuted = vec![base[1].clone(), base[0].clone()];
    assert!(streaming_relation(observe, &base, &permuted, None));
}

#[test]
fn reports_that_the_relation_does_not_apply_after_filter_change() {
    let event = Event { kind: String::from("open"), accepted: true };
    assert!(!streaming_relation(observe, &[event.clone()], &[event], Some("accepted")));
}

#[test]
fn compares_the_full_observation_when_event_counts_match() {
    fn order_sensitive(events: &[Event], _filter: Option<&str>) -> Vec<(String, bool)> {
        events.iter().map(|event| (event.kind.clone(), event.accepted)).collect()
    }
    let base = vec![Event { kind: String::from("open"), accepted: true }, Event { kind: String::from("close"), accepted: false }];
    let permuted = vec![base[1].clone(), base[0].clone()];
    assert!(!streaming_relation(order_sensitive, &base, &permuted, None));
}`;

export const propertyCounterexampleLessons: Lesson[] = [
  {
    id: "property-shrinking-replay",
    moduleId: "property-contracts",
    conceptIds: ["property-shrinking-replay"],
    competencyIds: ["diagnose-shrink-and-replay"],
    prerequisites: ["property-generated-inputs"],
    title: "Shrinking i replay kontrprzykładu",
    subtitle:
      "Zredukuj świadek, zachowaj awarię i sprawdź, czy kontrakt nadal jest ten sam.",
    minutes: 32,
    outcomes: [
      "Zredukujesz przypadek w jawnym, skończonym budżecie.",
      "Zapiszesz schemat, kontrakt, digest i klasyfikację awarii.",
      "Odtworzysz świadka bez losowania i rozpoznasz nieaktualny kontrakt.",
    ],
    steps: [
      choice(
        "property-shrinking-replay-predict",
        "predict",
        "Przewidź najlepszy shrink",
        "Który kandydat jest dobrym następnym krokiem dla awarii zależnej od jednego wiersza `needle`?",
        [
          "Usuń jeden z pozostałych wierszy, zachowując `needle`",
          "Wylosuj nowy query",
          "Zastąp świadek bieżącym czasem",
        ],
        0,
        [
          "Kandydat jest mniejszy i zachowuje obserwowalną przyczynę awarii.",
          "Nowy query nie jest redukcją tego samego świadka.",
          "Czas nie daje deterministycznego replay.",
        ],
      ),
      run(
        "property-shrinking-replay-run",
        "Mały świadek",
        "Uruchom prostą predykcję: czy ten przypadek zawiera błąd granicy?",
        `fn boundary_failure(lines: &[&str]) -> bool { lines.iter().filter(|line| line.contains("needle")).count() == 1 && lines.len() > 1 }
fn main() { println!("{}", boundary_failure(&["prefix", "needle", "suffix"])); }`,
        "true\n",
      ),
      choice(
        "property-shrinking-replay-observe",
        "observe",
        "Czytaj raport",
        "Co powinno zostać niezmienne podczas shrinkingu?",
        [
          "Klasyfikacja awarii i jawna precondition",
          "Seed bez wersji kontraktu",
          "Pełny rozmiar pierwszego wejścia",
        ],
        0,
        [
          "Redukcja ma sens tylko wtedy, gdy nadal pokazuje tę samą awarię.",
          "Seed bez kontraktu może po zmianie strategii wskazać coś innego.",
          "Celem jest zmniejszenie świadka, nie zachowanie rozmiaru.",
        ],
      ),
      explain(
        "property-shrinking-replay-explain",
        "Granica dowodu",
        "Wyjaśnij, dlaczego osiem rund i 64 kandydatów nie pozwalają nazwać wyniku globalnie minimalnym.",
        [
          "Wspomina o ograniczonym porządku lub budżecie kandydatów.",
          "Mówi, że witness nadal zachowuje awarię.",
          "Rozróżnia minimalność lokalną od dowodu dla wszystkich możliwych przypadków.",
        ],
      ),
      coding({
        id: "property-shrinking-replay-gate",
        kind: "debug",
        title: "Zredukuj i odtwórz",
        prompt:
          "Napraw shrinker tak, aby zwracał mniejszy przypadek zachowujący awarię; kandydatów twórz przez usuwanie wierszy, skracanie `query`, zmniejszanie `context` i skracanie końca wiersza, w budżecie 64 prób. Replay ma odrzucać `schema_version` różne od 1, `contract_id` różne od `mini-grep-boundary-v1` albo `digest` różny od `0x51_48_52_31`; przy poprawnym kontrakcie zwraca `Ok(true)` tylko dla zapisanej klasy `selection-mismatch` i `boundary_failure` (niepusty `lines`, dowolny wiersz zawierający `query`).",
        code: shrinkGateStarter,
        solution: shrinkGateSolution,
        tests: shrinkGateTests,
        hints: [
          "Generuj kandydatów przez usuwanie wierszy, skracanie query i zmniejszanie context; zaakceptuj tylko mniejszego świadka, który nadal zawodzi.",
          "W replay sprawdź wszystkie pola kontraktu przed uruchomieniem deterministycznej klasyfikacji.",
        ],
        gate: true,
      }),
      coding({
        id: "property-shrinking-replay-blank",
        kind: "blank",
        title: "Replay parsera logów",
        prompt:
          'Od pustej kartki napisz publiczne `fn replay_reading_witness(encoded: &str) -> Result<bool, &\'static str>`. Protokół wejścia to `reading-v1|log-summary-v1|digest|class|filter|record...`; zaakceptuj wyłącznie schema `reading-v1`, contract ID `log-summary-v1` i digest `1380270404` (`0x52_45_41_44`). Po tych polach `class` może być tylko `matched` albo `mismatch`, `filter` jest jednym zapisanym polem, a dalej musi być co najmniej jeden niepusty `record`. Obserwacja jest dokładnie `filter == "ERROR"` oraz `records.iter().any(|record| record.strip_prefix("ERROR:").is_some())`: prefiks musi wystąpić na początku rekordu, nie jako dowolny fragment. Klasa jest `matched`, gdy te dwie wartości bool są równe, w przeciwnym razie `mismatch`; dla poprawnego protokołu zwróć `Ok(actual_class == class)`, więc poprawna składniowo, lecz niezgodna zapisana klasa daje `Ok(false)`. Zwróć `Err("schema")`, `Err("contract")`, `Err("digest")` lub `Err("class")` dla odpowiedniej niepoprawności i nie generuj nowych danych ani losowości.',
        solution: shrinkBlankSolution,
        tests: shrinkBlankTests,
        hints: [
          "Rozdziel schema, contract ID, digest, klasę, filtr i rekordy przez stabilny separator; każdy rekord jest niepustym polem.",
          "Replay ma używać wyłącznie zapisanego tekstu i porównać zapisaną klasę z jednym deterministycznym wynikiem.",
        ],
        gate: true,
      }),
      coding({
        id: "property-shrinking-replay-recall",
        kind: "recall",
        title: "Odtwórz końcowy chunk",
        prompt:
          'Napisz publiczne `fn replay_stream_witness(encoded: &str) -> Result<usize, &\'static str>` dla protokołu `stream-v1|stream-summary-v1|digest|class|expected_count|filter|chunk...`. Zaakceptuj wyłącznie schema `stream-v1`, contract ID `stream-summary-v1` i digest `1398035021` (`0x53_54_52_4d`); `class` może być tylko `matched` albo `mismatch`, `expected_count` musi być `usize`, a po `filter` musi wystąpić co najmniej jeden niepusty chunk. Zachowaj ostatni fragment bez LF. Licz dokładnie chunki spełniające `filter == "ANY" || chunk.starts_with(filter)`: `ANY` oznacza każdy chunk, inne filtry są prefiksami od początku, a nie wyszukiwaniem podciągu. Klasa jest `matched`, gdy liczba równa się `expected_count`, w przeciwnym razie `mismatch`; niezgodna z liczbą klasa, także składniowo poprawna, ma zwrócić `Err("class")`. `Err` ma sygnalizować także niepoprawny schema, contract, digest lub protokół; bez ambient randomness.',
        solution: shrinkRecallSolution,
        tests: shrinkRecallTests,
        hints: [
          "Nie odrzucaj ostatniego niepustego chunku tylko dlatego, że nie kończy się LF.",
          "Najpierw zweryfikuj schema, contract ID, digest, klasę i expected_count, potem policz zapisane fragmenty.",
        ],
      }),
    ],
    misconceptions: [
      "Mniejszy przypadek zawsze jest globalnie minimalny.",
      "Seed sam wystarczy do odtworzenia kontraktu po zmianie strategii.",
      "Replay może losować nowy przypadek, jeśli ma podobny rozmiar.",
    ],
    transferTask:
      "Przenieś zapis świadka na parser, który odróżnia pusty rekord od rekordu z błędnym timestampem.",
    evidenceGate:
      "Przejdź gate i blank; każde odtworzenie musi sprawdzać schema, identyfikator kontraktu i klasyfikację awarii.",
    sourceIds: ["property-shrinking-basics", "property-failure-persistence"],
  },
  {
    id: "property-metamorphic-transfer",
    moduleId: "property-contracts",
    conceptIds: ["property-metamorphic-transfer"],
    competencyIds: [
      "transfer-metamorphic-relation",
      "state-tool-evidence-boundary",
    ],
    prerequisites: ["property-shrinking-replay"],
    title: "Relacje metamorfologiczne w innej domenie",
    subtitle: "Zapisz precondition, transformację i pełny obserwowalny wynik.",
    minutes: 34,
    outcomes: [
      "Oddzielisz relację od drugiej kopii implementacji.",
      "Odrzucisz transformacje poza precondition, w tym zmianę filtra.",
      "Przeniesiesz relację z Mini grep do podsumowania logów i strumienia zdarzeń.",
    ],
    steps: [
      choice(
        "property-metamorphic-transfer-predict",
        "predict",
        "Przewidź relację",
        "Co powinno poprzedzać porównanie dwóch uruchomień?",
        [
          "Precondition i dokładnie opisana transformacja",
          "Porównanie wyłącznie total",
          "Nowa losowa próbka zamiast transformacji",
        ],
        0,
        [
          "Bez warunku wstępnego relacja może obowiązywać poza swoją domeną.",
          "Równy total może ukryć zmianę poziomów lub klasy błędu.",
          "Metamorphic testing porównuje przypadki powiązane, nie dwie niezależne próbki.",
        ],
      ),
      run(
        "property-metamorphic-transfer-run",
        "Transformacja suffixu",
        "Uruchom relację dla context zero i niepasującego suffixu.",
        `fn main() { let query = "needle"; let suffix = "other"; println!("{}", !suffix.contains(query)); }`,
        "true\n",
      ),
      choice(
        "property-metamorphic-transfer-observe",
        "observe",
        "Rozpoznaj granicę",
        "Która zmiana unieważnia relację append-nonmatching?",
        [
          "Ustawienie context na 1, gdy relacja gwarantuje tylko context zero",
          "Zmiana nazwy lokalnej zmiennej",
          "Zachowanie tego samego query",
        ],
        0,
        [
          "Context zmienia to, co może wejść do okna wyniku.",
          "Nazwa lokalna nie zmienia obserwowalnej transformacji.",
          "To warunek potrzebny do porównania.",
        ],
      ),
      explain(
        "property-metamorphic-transfer-explain",
        "Wybór narzędzia",
        "Dla strukturalnej relacji parsera wybierz property testing albo fuzzing i opisz, czego wynik nie dowodzi.",
        [
          "Wybiera property testing dla jawnej relacji strukturalnej.",
          "Wspomina, że fuzzing lepiej szuka odporności na arbitralne bajty.",
          "Zaznacza, że skończony generator i kampania nie są dowodem dla całej przestrzeni wejść.",
        ],
      ),
      coding({
        id: "property-metamorphic-transfer-gate",
        kind: "debug",
        title: "Napraw checker Mini grep",
        prompt:
          "Napraw publiczny checker `fn append_nonmatching_preserves(selected: fn(&[String], &str, usize) -> Vec<usize>, lines: &[String], query: &str, context: usize, suffix: &str) -> bool`: relacja obowiązuje tylko dla context zero i niepasującego suffixu, a checker ma wywołać przekazaną funkcję na obu wejściach i porównać całą sekwencję indeksów.",
        code: metamorphicGateStarter,
        solution: metamorphicGateSolution,
        tests: metamorphicGateTests,
        hints: [
          "Sprawdź precondition przed transformacją.",
          "Porównaj wynik `selected` przed i po dopisaniu suffixu; sam rozmiar nie wystarcza.",
        ],
        gate: true,
      }),
      coding({
        id: "property-metamorphic-transfer-blank",
        kind: "blank",
        title: "Przenieś relację na logi",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Clone, Debug, PartialEq, Eq)] struct Record { level: String, malformed: bool }` oraz `#[derive(Clone, Debug, PartialEq, Eq)] struct Summary { info: usize, warn: usize, error: usize, malformed: usize }`, a potem publiczne `fn summarize(records: &[Record], filter: Option<&str>) -> Summary` i `fn permutation_preserves_summary(summarize: fn(&[Record], Option<&str>) -> Summary, original: &[Record], permuted: &[Record], filter: Option<&str>) -> bool`. `summarize` ma zawsze doliczać `malformed == true` do `Summary.malformed` i pomijać wtedy poziom; dla pozostałych rekordów `Some(value)` przepuszcza tylko `record.level == value`, `None` przepuszcza wszystkie, a poziomy `INFO`, `WARN` i `ERROR` zwiększają odpowiednie pola, zaś każdy inny poziom zwiększa `malformed`. Relacja obowiązuje tylko dla `filter == None` i równego multizbioru rekordów (oba pola `Record`, z zachowaniem duplikatów); wtedy wywołaj przekazany `summarize` na obu wejściach i porównaj każdy z czterech pól `Summary`, więc zmieniony multizbiór lub `Some(...)` daje `false`.",
        solution: metamorphicBlankSolution,
        tests: metamorphicBlankTests,
        hints: [
          "Sortuj prostą reprezentację rekordów wyłącznie do sprawdzenia precondition.",
          "Porównaj każdy licznik i malformed, a filtr zmieniający domenę oznacz jako poza relacją.",
        ],
        gate: true,
      }),
      coding({
        id: "property-metamorphic-transfer-recall",
        kind: "recall",
        title: "Relacja dla strumienia zdarzeń",
        prompt:
          "Zaimplementuj `#[derive(Clone, Debug, PartialEq, Eq)] struct Event { kind: String, accepted: bool }` oraz `fn observe(events: &[Event], filter: Option<&str>) -> Vec<(String, bool)>`: obserwacja ma zmapować każdy event na parę `(kind.clone(), accepted)`, zignorować `filter`, posortować wynik leksykograficznie po parze i zwrócić całą sekwencję. Następnie napisz publiczne `fn streaming_relation(observe: fn(&[Event], Option<&str>) -> Vec<(String, bool)>, base: &[Event], permuted: &[Event], filter: Option<&str>) -> bool`. Relacja obowiązuje tylko dla `filter == None` i równych długości wejść; w tej domenie wywołaj przekazane `observe` na obu wejściach i porównaj pełne obserwacje, a `Some(...)` ma jawnie dawać `false`.",
        solution: metamorphicRecallSolution,
        tests: metamorphicRecallTests,
        hints: [
          "Użyj pary kind/accepted jako pełnego obserwowalnego wyniku.",
          "Najpierw sprawdź precondition, potem porównaj uporządkowane multizbiory.",
        ],
      }),
    ],
    misconceptions: [
      "Metamorphic relation to drugi oracle skopiowany z implementacji.",
      "Równy total oznacza równy raport.",
      "Ta sama relacja obowiązuje po zmianie filtra i stanu parsera.",
    ],
    transferTask:
      "Opisz kontrakt relacji dla parsera, w którym kolejność rekordów wpływa na stan; wskaż dokładną precondition.",
    evidenceGate:
      "Przejdź gate i blank; relacja musi sprawdzać precondition oraz pełny wynik obserwowalny dla domeny.",
    sourceIds: ["property-strategy-basics", "property-failure-persistence"],
  },
];

export const propertyCounterexampleReviewExercises: Record<string, LessonStep> =
  {
    "property-shrinking-replay": coding({
      id: "property-shrinking-replay-review",
      kind: "recall",
      title: "Review: witness po zmianie schematu",
      prompt:
        'Zaimplementuj publiczny validator `replay_stream_witness(encoded: &str) -> Result<usize, &\'static str>` dla protokołu `stream-v1|stream-summary-v1|digest|class|expected_count|filter|chunk...`. Użyj dokładnie schema `stream-v1`, contract ID `stream-summary-v1` i digest `1398035021` (`0x53_54_52_4d`); filtr `ANY` liczy każdy niepusty chunk, a inny filtr tylko chunk zaczynający się od tego prefiksu. Zachowaj niepusty końcowy chunk bez LF. Klasa `matched` oznacza `count == expected_count`, `mismatch` oznacza nierówność; każda niezgodność zapisanej klasy z obliczoną ma zwrócić `Err("class")`, podobnie jak nieznana klasa.',
      solution: shrinkRecallSolution,
      tests: shrinkRecallTests,
      hints: [
        "Odrzuć wersję przed odczytem danych.",
        "Nie twórz nowej losowej sprawy.",
      ],
    }),
    "property-metamorphic-transfer": coding({
      id: "property-metamorphic-transfer-review",
      kind: "recall",
      title: "Review: pełna relacja",
      prompt:
        "Zaimplementuj publiczną relację `streaming_relation(observe: fn(&[Event], Option<&str>) -> Vec<(String, bool)>, base: &[Event], permuted: &[Event], filter: Option<&str>) -> bool` wraz z `#[derive(Clone, Debug, PartialEq, Eq)] struct Event { kind: String, accepted: bool }` i `fn observe(events: &[Event], filter: Option<&str>) -> Vec<(String, bool)>`. `observe` ma mapować na `(kind.clone(), accepted)`, ignorować filtr i sortować pełny wynik leksykograficznie po parze. Relacja zwraca `false` dla `Some(...)` lub różnych długości, a w pozostałych przypadkach wywołuje `observe` na obu wejściach i porównuje całe `Vec<(String, bool)>`.",
      solution: metamorphicRecallSolution,
      tests: metamorphicRecallTests,
      hints: [
        "Precondition należy do kontraktu.",
        "Porównaj pary kind/accepted.",
      ],
    }),
  };
