import type { CourseModule, Lesson, LessonStep } from "../domain/types";

type Practice = {
  lessonId: string;
  criterionIds: string[];
  step: LessonStep;
};

function practice(options: {
  lessonId: string;
  criterionIds: string[];
  conceptId: string;
  id: string;
  title: string;
  prompt: string;
  solution: string;
  tests: string;
  blank?: boolean;
}): Practice {
  return {
    lessonId: options.lessonId,
    criterionIds: options.criterionIds,
    step: {
      id: options.id,
      kind: options.blank ? "blank" : "apply",
      title: options.title,
      prompt: options.prompt,
      solution: options.solution,
      evaluator: { kind: "tests", tests: options.tests },
      hints: [
        "Rozdziel wymagania na dwa obserwowalne warunki i sprawdź także pustą partię.",
        "Sprawdź granice i błędny element po poprawnym; pojedynczy poprawny przykład nie wystarcza.",
      ],
      evidenceKind: options.blank ? "assessment" : "transfer",
      evidenceGate: true,
      evidence: {
        version: 1,
        conceptIds: [options.conceptId],
        codingTaskId: `performance-recovery/${options.id}-v1`,
      },
    },
  };
}

export const performanceRecoveryPractices: Practice[] = [
  practice({
    lessonId: "performance-measured-workload",
    criterionIds: ["performance-workload-gate", "performance-budget-gate"],
    conceptId: "measured-workload-contract",
    id: "workload-prefix-transfer",
    blank: true,
    title: "Od pustej kartki: zbadaj ograniczoną partię cyfr",
    prompt:
      "Napisz od zera `#[derive(Debug, PartialEq, Eq)] struct PrefixEvidence { visited: usize, accepted: usize, rejected: usize, within_limits: bool }` oraz `fn inspect_prefix(items: &[u8], limit: usize, max_visits: usize, max_rejections: usize) -> PrefixEvidence`. Workload obejmuje wyłącznie pierwsze min(limit, items.len()) bajtów; dalsze dane nie wpływają na raport. Akceptuj cyfry ASCII 0–9, pozostałe bajty odrzucaj. Zlicz odwiedzone, zaakceptowane i odrzucone bajty, zachowując visited = accepted + rejected. within_limits jest prawdziwe wtedy i tylko wtedy, gdy visited <= max_visits i rejected <= max_rejections. Równość obu limitów jest sukcesem; dla limit = 0 raport ma zera i true. To deterministyczny opis pracy, bez pomiaru czasu.",
    solution: String.raw`#[derive(Debug, PartialEq, Eq)]
struct PrefixEvidence { visited: usize, accepted: usize, rejected: usize, within_limits: bool }
fn inspect_prefix(items: &[u8], limit: usize, max_visits: usize, max_rejections: usize) -> PrefixEvidence {
    let mut visited = 0;
    let mut accepted = 0;
    for byte in items.iter().take(limit) {
        visited += 1;
        if byte.is_ascii_digit() { accepted += 1; }
    }
    let rejected = visited - accepted;
    PrefixEvidence { visited, accepted, rejected, within_limits: visited <= max_visits && rejected <= max_rejections }
}`,
    tests: String.raw`#[test]
fn prefix_counts_only_selected_bytes_and_ascii_digits() {
    assert_eq!(inspect_prefix(b"1!23", 3, 3, 1), PrefixEvidence { visited: 3, accepted: 2, rejected: 1, within_limits: true });
    assert_eq!(inspect_prefix(b"1!23", 0, 0, 0), PrefixEvidence { visited: 0, accepted: 0, rejected: 0, within_limits: true });
    assert_eq!(inspect_prefix(&[], usize::MAX, 0, 0), PrefixEvidence { visited: 0, accepted: 0, rejected: 0, within_limits: true });
    let all: Vec<u8> = (0..=255).collect();
    assert_eq!(inspect_prefix(&all, usize::MAX, 256, 246), PrefixEvidence { visited: 256, accepted: 10, rejected: 246, within_limits: true });
    assert_eq!(inspect_prefix(b"78!!!", 2, 2, 0), PrefixEvidence { visited: 2, accepted: 2, rejected: 0, within_limits: true });
}
#[test]
fn each_budget_is_inclusive_and_independent() {
    assert!(inspect_prefix(b"1!23", 3, 3, 1).within_limits);
    assert!(!inspect_prefix(b"1!23", 3, 2, 1).within_limits);
    assert!(!inspect_prefix(b"1!23", 3, 3, 0).within_limits);
    let report = inspect_prefix(b"0a9", 99, 3, 1);
    assert_eq!(report.visited, report.accepted + report.rejected);
    assert!(report.within_limits);
}`,
  }),
  practice({
    lessonId: "performance-borrowed-stream",
    criterionIds: ["performance-borrow-gate", "performance-stream-gate"],
    conceptId: "borrowed-stream-no-materialization",
    id: "borrow-tagged-messages-transfer",
    title: "Wybierz pożyczane komunikaty z etykietą",
    prompt:
      "Napisz od pustej kartki `fn select_messages<'a>(lines: &'a [&'a str], tag: &str) -> Vec<&'a str>`. W każdym wpisie pierwszy dwukropek oddziela etykietę od komunikatu. Zwróć cały tekst po tym separatorze tylko dla etykiety dokładnie równej tag. Nie używaj dopasowania prefiksu etykiety. Zachowaj kolejność, duplikaty, pusty komunikat i dalsze dwukropki; brak separatora oznacza pominięcie wpisu. Pusta etykieta jest poprawna. Każdy wynik ma wskazywać oryginalny fragment wejścia, bez kopiowania treści lub wycieku pamięci. Vec przechowujący same widoki jest dozwolony.",
    solution: String.raw`fn select_messages<'a>(lines: &'a [&'a str], tag: &str) -> Vec<&'a str> {
    let mut messages = Vec::new();
    for line in lines {
        if let Some((label, message)) = line.split_once(':') {
            if label == tag { messages.push(message); }
        }
    }
    messages
}`,
    tests: String.raw`#[test]
fn selected_remainders_are_original_slices_in_order() {
    let first = String::from("warn:żółć:🙂");
    let duplicate = String::from("warn:powtórz");
    let lines = [first.as_str(), "warning:nie", "warn:", duplicate.as_str(), duplicate.as_str(), "brak", ":puste"];
    let views = select_messages(&lines, "warn");
    assert_eq!(views, ["żółć:🙂", "", "powtórz", "powtórz"]);
    assert_eq!(views[0].as_ptr(), first.as_ptr().wrapping_add(5));
    assert_eq!(views[2].as_ptr(), duplicate.as_ptr().wrapping_add(5));
    assert_eq!(views[3].as_ptr(), duplicate.as_ptr().wrapping_add(5));
    assert_eq!(select_messages(&lines, ""), ["puste"]);
    assert!(select_messages(&lines, "missing").is_empty());
    assert!(select_messages(&[], "warn").is_empty());
    let unicode = String::from("ż:猫:ogon"); let input = [unicode.as_str()];
    let selected = select_messages(&input, "ż");
    assert_eq!(selected, ["猫:ogon"]);
    assert_eq!(selected[0].as_ptr(), unicode.as_ptr().wrapping_add("ż:".len()));
}`,
  }),
  practice({
    lessonId: "performance-bounded-buffer",
    criterionIds: ["performance-buffer-gate", "performance-capacity-gate"],
    conceptId: "bounded-buffer-reuse",
    id: "buffer-line-report-transfer",
    title: "Zbuduj raport linii i pojemności scratch",
    prompt:
      "Napisz `#[derive(Debug, PartialEq, Eq)] struct BufferReport { lengths: Vec<usize>, peak_capacity: usize, within_limit: bool }` oraz `fn inspect_lines<R: std::io::BufRead>(reader: R, scratch: &mut String, limit: usize) -> std::io::Result<BufferReport>`. Przed każdym read_line wyczyść przekazany scratch i używaj właśnie tego obiektu. Dodatni wynik read_line dopisz do lengths jako liczbę bajtów wraz z ewentualnym LF; EOF nie dodaje rekordu. Po poprawnym EOF scratch ma być pusty. peak_capacity obejmuje początkową pojemność oraz pojemność po każdym poprawnym odczycie. within_limit oznacza peak_capacity <= limit, także przy równości; to obserwacja pojemności, nie blokada jej wzrostu. Błąd odczytu przekaż bez kolejnego czytania; na tej ścieżce scratch może zawierać częściowy tekst. Nie mierz czasu ani liczby wywołań alokatora.",
    solution: String.raw`use std::io::{self, BufRead};
#[derive(Debug, PartialEq, Eq)]
struct BufferReport { lengths: Vec<usize>, peak_capacity: usize, within_limit: bool }
fn inspect_lines<R: BufRead>(mut reader: R, scratch: &mut String, limit: usize) -> io::Result<BufferReport> {
    let mut lengths = Vec::new();
    let mut peak_capacity = scratch.capacity();
    loop {
        scratch.clear();
        let bytes = reader.read_line(scratch)?;
        peak_capacity = peak_capacity.max(scratch.capacity());
        if bytes == 0 { break; }
        lengths.push(bytes);
    }
    Ok(BufferReport { lengths, peak_capacity, within_limit: peak_capacity <= limit })
}`,
    tests: String.raw`struct ObservedReader { input: std::io::Cursor<Vec<u8>>, scratch: *mut String }
impl std::io::Read for ObservedReader { fn read(&mut self, bytes: &mut [u8]) -> std::io::Result<usize> { std::io::Read::read(&mut self.input, bytes) } }
impl std::io::BufRead for ObservedReader {
    fn fill_buf(&mut self) -> std::io::Result<&[u8]> { std::io::BufRead::fill_buf(&mut self.input) }
    fn consume(&mut self, n: usize) { std::io::BufRead::consume(&mut self.input, n); }
    fn read_line(&mut self, scratch: &mut String) -> std::io::Result<usize> {
        assert_eq!(scratch as *mut String, self.scratch);
        assert!(scratch.is_empty());
        std::io::BufRead::read_line(&mut self.input, scratch)
    }
}
#[test]
fn reports_raw_line_lengths_and_real_capacity_using_caller_scratch() {
    let mut scratch = String::with_capacity(64); scratch.push_str("stale");
    let initial = scratch.capacity();
    let reader = ObservedReader { input: std::io::Cursor::new("a\n\nżółć".as_bytes().to_vec()), scratch: &mut scratch };
    let report = inspect_lines(reader, &mut scratch, initial).unwrap();
    assert_eq!(report, BufferReport { lengths: vec![2, 1, "żółć".len()], peak_capacity: initial, within_limit: true });
    assert!(scratch.is_empty());
    assert!(!inspect_lines(std::io::Cursor::new(""), &mut scratch, initial - 1).unwrap().within_limit);
    let long = "x".repeat(initial + 1);
    let report = inspect_lines(std::io::Cursor::new(long.as_bytes()), &mut scratch, 0).unwrap();
    assert_eq!(report.lengths, [long.len()]);
    assert_eq!(report.peak_capacity, scratch.capacity());
    assert!(report.peak_capacity >= long.len());
    assert!(!report.within_limit);
    assert!(scratch.is_empty());
    assert!(inspect_lines(std::io::Cursor::new(""), &mut scratch, usize::MAX).unwrap().lengths.is_empty());
}
#[test]
fn propagates_read_failure_without_a_second_read() {
    struct Failure<'a>(&'a std::cell::Cell<usize>);
    impl std::io::Read for Failure<'_> { fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> { unreachable!() } }
    impl std::io::BufRead for Failure<'_> {
        fn fill_buf(&mut self) -> std::io::Result<&[u8]> { unreachable!() }
        fn consume(&mut self, _: usize) { unreachable!() }
        fn read_line(&mut self, scratch: &mut String) -> std::io::Result<usize> { self.0.set(self.0.get() + 1); assert_eq!(self.0.get(), 1, "a failed read must not be retried"); scratch.push_str("partial"); Err(std::io::Error::new(std::io::ErrorKind::BrokenPipe, "fixture")) }
    }
    let mut scratch = String::new(); let calls = std::cell::Cell::new(0);
    let error = inspect_lines(Failure(&calls), &mut scratch, 0).unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::BrokenPipe);
    assert_eq!(error.to_string(), "fixture");
    assert_eq!(calls.get(), 1);
}`,
  }),
  practice({
    lessonId: "performance-evidence-decisions",
    criterionIds: [
      "performance-decision-gate",
      "performance-interpretation-gate",
    ],
    conceptId: "conditional-performance-decision",
    id: "decision-batch-audit-transfer",
    title: "Oceń każdy raport w partii kosztów",
    prompt:
      "Zdefiniuj `struct CostRow { baseline: usize, candidate: usize, budget: usize }`, `#[derive(Debug, PartialEq, Eq)] enum CostDecision { Keep, Budget, Regression }` i `fn audit_costs(rows: &[CostRow]) -> (Vec<CostDecision>, bool)`. Dla każdego wiersza w kolejności zwróć Budget, gdy candidate > budget; inaczej Regression, gdy candidate > baseline; inaczej Keep. Obie równości są sukcesem, a budget ma pierwszeństwo przy dwóch naruszeniach. Drugi wynik oznacza niepustą partię złożoną wyłącznie z Keep. Pusta partia oddaje pusty Vec i false; poprawny sąsiad nie może ukryć odrzuconego raportu. To interpretacja jawnych danych, nie pomiar szybkości.",
    solution: String.raw`struct CostRow { baseline: usize, candidate: usize, budget: usize }
#[derive(Debug, PartialEq, Eq)]
enum CostDecision { Keep, Budget, Regression }
fn audit_costs(rows: &[CostRow]) -> (Vec<CostDecision>, bool) {
    let mut decisions = Vec::new();
    for row in rows {
        decisions.push(if row.candidate > row.budget { CostDecision::Budget }
            else if row.candidate > row.baseline { CostDecision::Regression }
            else { CostDecision::Keep });
    }
    let kept = !rows.is_empty() && decisions.iter().all(|decision| *decision == CostDecision::Keep);
    (decisions, kept)
}`,
    tests: String.raw`#[test]
fn each_row_keeps_both_boundaries_and_budget_priority() {
    let rows = [CostRow { baseline: 10, candidate: 10, budget: 10 }, CostRow { baseline: 10, candidate: 11, budget: 20 }, CostRow { baseline: 10, candidate: 12, budget: 9 }, CostRow { baseline: usize::MAX, candidate: usize::MAX, budget: usize::MAX }];
    assert_eq!(audit_costs(&rows), (vec![CostDecision::Keep, CostDecision::Regression, CostDecision::Budget, CostDecision::Keep], false));
    assert_eq!(audit_costs(&[]), (Vec::new(), false));
    assert_eq!(audit_costs(&rows[..1]), (vec![CostDecision::Keep], true));
    assert_eq!(audit_costs(&rows[3..]), (vec![CostDecision::Keep], true));
    assert_eq!(audit_costs(&[CostRow { baseline: 10, candidate: 8, budget: 7 }]), (vec![CostDecision::Budget], false));
}`,
  }),
  practice({
    lessonId: "profile-instruction-cost",
    criterionIds: [
      "profile-instruction-record-gate",
      "profile-instruction-budget-gate",
    ],
    conceptId: "instruction-cost-record",
    id: "instruction-batch-budget-transfer",
    title: "Zapisz ślady i sprawdź budżet partii",
    prompt:
      "Napisz `#[derive(Debug, PartialEq, Eq)] struct TraceRecord { label: &'static str, steps: usize }` oraz `fn record_trace_batch(traces: &[&[&str]]) -> Vec<TraceRecord>`. Dla każdego dostarczonego śladu w kolejności oddaj rekord z etykietą parser i dokładnie jego liczbą elementów; pusty ślad ma zero, pusta partia nie ma rekordów. Treść tokenów nie dodaje ukrytego kosztu. Napisz też `fn instruction_batch_fits(costs: &[usize], per_item: usize, total_limit: usize) -> bool`. Każda liczba to koszt jednego dostarczonego śladu. Wynik jest true wyłącznie, gdy każdy koszt <= per_item oraz suma kosztów <= total_limit. Równość jest sukcesem. Pusta partia ma koszt zero. Suma niemieszcząca się w usize oznacza false; nie zawijaj jej ani nie zastępuj przez saturację, która mogłaby zaakceptować przepełnienie przy usize::MAX. Testujesz jawne liczby kroków, nie czas CPU.",
    solution: String.raw`#[derive(Debug, PartialEq, Eq)]
struct TraceRecord { label: &'static str, steps: usize }
fn record_trace_batch(traces: &[&[&str]]) -> Vec<TraceRecord> {
    traces.iter().map(|trace| TraceRecord { label: "parser", steps: trace.len() }).collect()
}
fn instruction_batch_fits(costs: &[usize], per_item: usize, total_limit: usize) -> bool {
    let mut total = 0usize;
    for &cost in costs {
        if cost > per_item { return false; }
        total = match total.checked_add(cost) { Some(value) => value, None => return false };
    }
    total <= total_limit
}`,
    tests: String.raw`#[test]
fn each_trace_and_total_have_independent_inclusive_budgets() {
    let label = String::from("lokalny token");
    let traces: &[&[&str]] = &[&[label.as_str(), "scan"], &[], &["emit", "emit", "żółć"]];
    let records = record_trace_batch(traces);
    assert_eq!(records, [TraceRecord { label: "parser", steps: 2 }, TraceRecord { label: "parser", steps: 0 }, TraceRecord { label: "parser", steps: 3 }]);
    assert!(record_trace_batch(&[]).is_empty());
    let costs: Vec<_> = records.iter().map(|record| record.steps).collect();
    assert!(instruction_batch_fits(&costs, 3, 5));
    assert!(instruction_batch_fits(&[], 0, 0));
    assert!(instruction_batch_fits(&[2, 3, 0], 3, 5));
    assert!(!instruction_batch_fits(&[2, 3], 2, 10));
    assert!(!instruction_batch_fits(&[2, 3], 3, 4));
    assert!(instruction_batch_fits(&[usize::MAX], usize::MAX, usize::MAX));
    assert!(!instruction_batch_fits(&[usize::MAX, 1], usize::MAX, usize::MAX));
}`,
  }),
  practice({
    lessonId: "profile-allocation-events",
    criterionIds: ["profile-allocation-bytes-gate"],
    conceptId: "allocation-event-model",
    id: "allocation-site-bytes-transfer",
    title: "Zsumuj alokowane bajty wybranego miejsca",
    prompt:
      "Zdefiniuj `struct HeapEvent<'a> { site: &'a str, allocated: bool, bytes: usize }` i `fn allocated_at(events: &[HeapEvent<'_>], site: &str) -> Option<usize>`. Zsumuj bytes tylko dla zdarzeń z allocated = true i dokładnie pasującym site. Zdarzenia zwalniania pamięci i inne miejsca pomijaj, bez odejmowania. Brak pasujących zdarzeń daje Some(0). Przepełnienie sumy pasujących zdarzeń daje None. Kolejność nie zmienia sumy; ogromny rozmiar pominiętego zdarzenia nie może jej unieważnić. To model zdarzeń, nie obserwacja GlobalAlloc.",
    solution: String.raw`struct HeapEvent<'a> { site: &'a str, allocated: bool, bytes: usize }
fn allocated_at(events: &[HeapEvent<'_>], site: &str) -> Option<usize> {
    let mut bytes = 0usize;
    for event in events {
        if event.allocated && event.site == site { bytes = bytes.checked_add(event.bytes)?; }
    }
    Some(bytes)
}`,
    tests: String.raw`#[test]
fn sums_only_allocations_at_the_selected_site() {
    let events = [HeapEvent { site: "parse", allocated: true, bytes: 4 }, HeapEvent { site: "parse", allocated: false, bytes: 100 }, HeapEvent { site: "other", allocated: true, bytes: usize::MAX }, HeapEvent { site: "parse", allocated: true, bytes: 7 }];
    assert_eq!(allocated_at(&events, "parse"), Some(11));
    assert_eq!(allocated_at(&events, "missing"), Some(0));
    assert_eq!(allocated_at(&[], "parse"), Some(0));
    assert_eq!(allocated_at(&[HeapEvent { site: "żółć", allocated: true, bytes: 9 }], "żółć"), Some(9));
    assert_eq!(allocated_at(&[HeapEvent { site: "", allocated: true, bytes: 0 }], ""), Some(0));
    assert_eq!(allocated_at(&[HeapEvent { site: "x", allocated: true, bytes: usize::MAX }, HeapEvent { site: "x", allocated: true, bytes: 1 }], "x"), None);
}`,
  }),
  practice({
    lessonId: "profile-optimization-transfer",
    criterionIds: [
      "profile-transfer-improvement-gate",
      "profile-transfer-workload-gate",
    ],
    conceptId: "optimization-transfer",
    id: "optimization-trial-batch-transfer",
    title: "Porównaj serię wariantów tego samego workloadu",
    prompt:
      "Napisz `struct Trial<'a> { input: &'a str, output: &'a str, instructions: usize, allocations: usize }` oraz `fn compare_trials(baseline: &Trial<'_>, candidates: &[Trial<'_>]) -> Vec<Option<(usize, usize)>>`. Zachowaj kolejność i liczbę kandydatów. Dla równego input i output zwróć Some((spadek instrukcji, spadek alokacji)); każdą różnicę oblicz jako saturating_sub, więc wzrost danego kosztu daje zero tylko w tym komponencie. Inny input albo output daje None niezależnie od kosztu. Porównuj treść etykiet, a nie adresy. Pusta partia daje pusty Vec. To porównanie danych z tego samego workloadu, bez twierdzenia o uniwersalnej szybkości.",
    solution: String.raw`struct Trial<'a> { input: &'a str, output: &'a str, instructions: usize, allocations: usize }
fn compare_trials(baseline: &Trial<'_>, candidates: &[Trial<'_>]) -> Vec<Option<(usize, usize)>> {
    let mut differences = Vec::new();
    for candidate in candidates {
        if baseline.input == candidate.input && baseline.output == candidate.output {
            differences.push(Some((baseline.instructions.saturating_sub(candidate.instructions), baseline.allocations.saturating_sub(candidate.allocations))));
        } else { differences.push(None); }
    }
    differences
}`,
    tests: String.raw`#[test]
fn each_component_saturates_only_for_the_same_input_and_output() {
    let baseline = Trial { input: "żółć", output: "raport", instructions: 10, allocations: 5 };
    let equal_input = String::from("żółć"); let equal_output = String::from("raport");
    let candidates = [Trial { input: &equal_input, output: &equal_output, instructions: 7, allocations: 2 }, Trial { input: "żółć", output: "raport", instructions: 12, allocations: 1 }, Trial { input: "żółć", output: "raport", instructions: 1, allocations: 8 }, Trial { input: "inne", output: "raport", instructions: 1, allocations: 1 }, Trial { input: "żółć", output: "inny", instructions: 1, allocations: 1 }, Trial { input: "żółć", output: "raport", instructions: 10, allocations: 5 }];
    assert_eq!(compare_trials(&baseline, &candidates), [Some((3, 3)), Some((0, 4)), Some((9, 0)), None, None, Some((0, 0))]);
    assert!(compare_trials(&baseline, &[]).is_empty());
    let maximum = Trial { input: "", output: "", instructions: usize::MAX, allocations: 0 };
    assert_eq!(compare_trials(&maximum, &[Trial { input: "", output: "", instructions: 0, allocations: usize::MAX }]), [Some((usize::MAX, 0))]);
}`,
  }),
  practice({
    lessonId: "profile-regression-decision",
    criterionIds: [
      "profile-regression-threshold-gate",
      "profile-regression-correctness-gate",
    ],
    conceptId: "allocation-regression-decision",
    id: "profile-regression-batch-transfer",
    title: "Sprawdź poprawność przed kosztem każdego wariantu",
    prompt:
      "Napisz `struct RegressionSample { correct: bool, baseline: usize, candidate: usize, allowance: usize }`, `#[derive(Debug, PartialEq, Eq)] enum Verdict { Keep, WrongOutput, CostRegression }` i `fn judge_samples(samples: &[RegressionSample]) -> Vec<Verdict>`. Oceniaj każdy raport osobno i zachowaj kolejność. Najpierw odrzuć correct = false jako WrongOutput, niezależnie od kosztu. Dla poprawnego wyniku wzrost candidate ponad baseline nie większy od allowance daje Keep; większy daje CostRegression. Spadek kosztu i równość progu są sukcesem. Arytmetyka ma działać także przy usize::MAX bez zawijania. Pusta partia daje pusty Vec. To interpretacja dostarczonego proxy, nie pomiar czasu ani alokacji.",
    solution: String.raw`struct RegressionSample { correct: bool, baseline: usize, candidate: usize, allowance: usize }
#[derive(Debug, PartialEq, Eq)]
enum Verdict { Keep, WrongOutput, CostRegression }
fn judge_samples(samples: &[RegressionSample]) -> Vec<Verdict> {
    let mut verdicts = Vec::new();
    for sample in samples {
        verdicts.push(if !sample.correct { Verdict::WrongOutput }
            else if sample.candidate.saturating_sub(sample.baseline) <= sample.allowance { Verdict::Keep }
            else { Verdict::CostRegression });
    }
    verdicts
}`,
    tests: String.raw`#[test]
fn correctness_precedes_inclusive_cost_threshold_for_each_report() {
    let samples = [RegressionSample { correct: true, baseline: 10, candidate: 12, allowance: 2 }, RegressionSample { correct: true, baseline: 10, candidate: 13, allowance: 2 }, RegressionSample { correct: false, baseline: 10, candidate: 0, allowance: usize::MAX }, RegressionSample { correct: false, baseline: 0, candidate: usize::MAX, allowance: 0 }, RegressionSample { correct: true, baseline: usize::MAX, candidate: usize::MAX, allowance: 1 }, RegressionSample { correct: true, baseline: 8, candidate: 0, allowance: 0 }];
    assert_eq!(judge_samples(&samples), [Verdict::Keep, Verdict::CostRegression, Verdict::WrongOutput, Verdict::WrongOutput, Verdict::Keep, Verdict::Keep]);
    assert!(judge_samples(&[]).is_empty());
}`,
  }),
];

/** Append new identities; every historical step and its authored contract stays intact. */
export function appendPerformanceRecoverySteps(lessons: Lesson[]): Lesson[] {
  return lessons.map((lesson) => ({
    ...lesson,
    steps: [
      ...lesson.steps,
      ...performanceRecoveryPractices
        .filter((entry) => entry.lessonId === lesson.id)
        .map((entry) => entry.step),
    ],
  }));
}

/** Each integration task validates only the explicit criterion IDs listed above. */
export function addPerformanceRecoveryRefs(module: CourseModule): CourseModule {
  return {
    ...module,
    gateCriteria: module.gateCriteria?.map((criterion) => ({
      ...criterion,
      taskRefs: [
        ...criterion.taskRefs,
        ...performanceRecoveryPractices
          .filter((entry) => entry.criterionIds.includes(criterion.id))
          .map((entry) => ({
            lessonId: entry.lessonId,
            stepId: entry.step.id,
          })),
      ],
    })),
  };
}
