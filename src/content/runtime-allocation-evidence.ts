import type { Concept, Lesson, LessonStep } from "../domain/types";

const choice = (id: string, title: string, prompt: string, answers: [string, string, string], correct: number): LessonStep => ({
  id, kind: "predict", title, prompt,
  choices: answers.map((label, index) => ({ id: String(index), label })),
  evaluator: { kind: "choice", correct: String(correct), explanations: { "0": "Zakres obserwacji musi być jawny.", "1": "Sama liczba bajtów nie pokazuje granicy pomiaru.", "2": "RSS i czas wymagają osobnego eksperymentu." } },
  evidenceKind: "prediction",
});

const run = (id: string, title: string, prompt: string, code: string, expected: string, suppliedSolutions?: LessonStep["suppliedSolutions"]): LessonStep => ({
  id, kind: "run", title, prompt, code, solution: code,
  ...(suppliedSolutions ? { suppliedSolutions } : {}),
  evaluator: { kind: "exact-output", expected }, expectedStatus: "success", evidenceKind: "exposure",
});

const tested = (options: { id: string; kind: "modify" | "apply" | "blank"; title: string; prompt: string; code?: string; solution: string; tests: string; gate?: boolean; suppliedSolutions?: LessonStep["suppliedSolutions"] }): LessonStep => ({
  id: options.id, kind: options.kind, title: options.title, prompt: options.prompt,
  ...(options.code === undefined ? {} : { code: options.code, expectedStatus: "success" as const }),
  solution: options.solution,
  ...(options.suppliedSolutions ? { suppliedSolutions: options.suppliedSolutions } : {}),
  hints: ["Najpierw zaznacz przygotowanie, okno pomiaru i sprzątanie.", "Porównuj ten sam input i Summary, a licznik wyzeruj przed wejściem do okna."],
  evaluator: { kind: "tests", tests: options.tests }, evidenceKind: options.kind === "blank" ? "assessment" : "transfer", evidenceGate: options.gate ?? false,
});

const recall = (id: string, title: string, prompt: string, solution: string, criteria: string[]): LessonStep => ({
  id, kind: "recall", title, prompt, solution, evaluator: { kind: "rubric", criteria }, evidenceKind: "self-rating",
});

const scopeGateSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Event { Setup { input_len: usize }, Open, Measured { ok: bool, value: usize }, Closed, Reported { value: usize }, ErrorClosed, Teardown }
enum Measurement { Success(usize), Error }

struct Window { open: bool, measured: Option<Measurement>, reported: bool, events: Vec<Event> }
impl Window {
    fn new() -> Self { Self { open: false, measured: None, reported: false, events: Vec::new() } }
    fn setup(&mut self, input_len: usize) -> Result<(), &'static str> {
        if self.open || !self.events.is_empty() { return Err("setup-inside-window"); }
        self.events.push(Event::Setup { input_len }); Ok(())
    }
    fn open(&mut self) -> Result<(), &'static str> {
        if self.open { return Err("already-open"); }
        self.open = true; self.events.push(Event::Open); Ok(())
    }
    fn work(&mut self, work: impl FnOnce() -> Result<usize, &'static str>) -> Result<usize, &'static str> {
        if !self.open { return Err("work-before-open"); }
        match work() {
            Ok(value) => { self.measured = Some(Measurement::Success(value)); self.events.push(Event::Measured { ok: true, value }); Ok(value) }
            Err(error) => { self.measured = Some(Measurement::Error); self.events.push(Event::Measured { ok: false, value: 0 }); Err(error) }
        }
    }
    fn close(&mut self) -> Result<(), &'static str> {
        if !self.open { return Err("already-closed"); }
        self.open = false; self.events.push(Event::Closed); Ok(())
    }
    fn report(&mut self) -> Result<usize, &'static str> {
        if self.open { return Err("report-inside-window"); }
        let value = match self.measured.as_ref() { Some(Measurement::Success(value)) => *value, Some(Measurement::Error) => return Err("report-after-error"), None => return Err("report-before-work") };
        self.reported = true; self.events.push(Event::Reported { value }); Ok(value)
    }
    fn error_close(&mut self) -> Result<(), &'static str> {
        if !self.open { return Err("already-closed"); }
        self.open = false; self.events.push(Event::ErrorClosed); Ok(())
    }
    fn teardown(&mut self) -> Result<(), &'static str> {
        if self.open { return Err("teardown-while-open"); }
        if !self.reported && !self.events.iter().any(|event| matches!(event, Event::ErrorClosed)) { return Err("teardown-before-close"); }
        self.events.push(Event::Teardown); Ok(())
    }
    fn collect(self) -> Result<Vec<Event>, &'static str> {
        if !matches!(self.events.last(), Some(Event::Teardown)) { return Err("missing-teardown"); }
        Ok(self.events)
    }
}

fn close_window(input: &[u8], work: impl FnOnce() -> Result<usize, &'static str>) -> (Result<usize, &'static str>, Vec<Event>) {
    let mut window = Window::new();
    window.setup(input.len()).unwrap();
    window.open().unwrap();
    let result = window.work(work);
    match result {
        Ok(value) => { window.close().unwrap(); window.report().unwrap(); window.teardown().unwrap(); (Ok(value), window.collect().unwrap()) }
        Err(error) => { window.error_close().unwrap(); window.teardown().unwrap(); (Err(error), window.collect().unwrap()) }
    }
}`;
const scopeGateStarter = scopeGateSolution.replace("window.open().unwrap();", "window.open().unwrap();\n    window.setup(input.len()).unwrap();");
const scopeGateTests = String.raw`#[test]
fn closes_the_window_after_success_and_error() {
    let input = b"records";
    let (ok, success) = close_window(input, || Ok::<_, &'static str>(7));
    assert_eq!(ok, Ok(7));
    assert_eq!(success, vec![Event::Setup { input_len: 7 }, Event::Open, Event::Measured { ok: true, value: 7 }, Event::Closed, Event::Reported { value: 7 }, Event::Teardown]);
    let (err, failure) = close_window(input, || Err::<usize, _>("parser"));
    assert_eq!(err, Err("parser"));
    assert_eq!(failure, vec![Event::Setup { input_len: 7 }, Event::Open, Event::Measured { ok: false, value: 0 }, Event::ErrorClosed, Event::Teardown]);
    let mut invalid = Window::new();
    assert_eq!(invalid.work(|| Ok(1)), Err("work-before-open"));
    invalid.setup(7).unwrap(); invalid.open().unwrap();
    assert_eq!(invalid.setup(7), Err("setup-inside-window"));
    assert_eq!(invalid.report(), Err("report-inside-window"));
    invalid.close().unwrap();
    assert_eq!(invalid.report(), Err("report-before-work"));
    assert_eq!(invalid.teardown(), Err("teardown-before-close"));
    assert_eq!(invalid.collect(), Err("missing-teardown"));
    let mut open = Window::new(); open.setup(7).unwrap(); open.open().unwrap();
    assert_eq!(open.teardown(), Err("teardown-while-open"));
}`;

const errorGateSolution = String.raw`fn measurement_status<T, E>(result: Result<T, E>, closed: bool) -> &'static str {
    match (result.is_ok(), closed) {
        (true, true) => "ok-closed",
        (false, true) => "err-closed",
        _ => "incomplete",
    }
}`;
const errorGateStarter = errorGateSolution.replace("(true, true) => \"ok-closed\"", "(true, false) => \"ok-closed\"");
const errorGateTests = String.raw`#[test]
fn distinguishes_closed_success_and_error_from_incomplete_reports() {
    assert_eq!(measurement_status::<usize, &str>(Ok(1), true), "ok-closed");
    assert_eq!(measurement_status::<usize, &str>(Err("io"), true), "err-closed");
    assert_eq!(measurement_status::<usize, &str>(Ok(1), false), "incomplete");
}`;

const scopeBlankSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Event { Setup { input_len: usize }, Open, Measured { ok: bool, value: usize }, Closed, Reported { value: usize }, ErrorClosed, Teardown }
enum Measurement { Success(usize), Error(&'static str) }

struct Window { open: bool, measured: Option<Measurement>, events: Vec<Event> }
impl Window {
    fn empty() -> Self { Self { open: false, measured: None, events: Vec::new() } }
    fn setup(&mut self, input_len: usize) -> Result<(), &'static str> { if self.open || !self.events.is_empty() { return Err("setup-inside-window"); } self.events.push(Event::Setup { input_len }); Ok(()) }
    fn begin(&mut self) -> Result<(), &'static str> { if self.open { return Err("already-open"); } self.open = true; self.events.push(Event::Open); Ok(()) }
    fn measure(&mut self, work: impl FnOnce() -> Result<usize, &'static str>) -> Result<usize, &'static str> {
        if !self.open { return Err("work-before-open"); }
        match work() {
            Ok(value) => { self.measured = Some(Measurement::Success(value)); self.events.push(Event::Measured { ok: true, value }); Ok(value) }
            Err(error) => { self.measured = Some(Measurement::Error(error)); self.events.push(Event::Measured { ok: false, value: 0 }); Err(error) }
        }
    }
    fn finish(&mut self, result: Result<usize, &'static str>) -> Result<(), &'static str> {
        if !self.open { return Err("already-closed"); }
        match (self.measured.as_ref(), result) {
            (None, _) => Err("finish-before-measure"),
            (Some(Measurement::Success(measured)), Ok(value)) if *measured == value => { self.open = false; self.events.push(Event::Closed); self.events.push(Event::Reported { value: *measured }); Ok(()) },
            (Some(Measurement::Error(measured)), Err(error)) if *measured == error => { self.open = false; self.events.push(Event::ErrorClosed); Ok(()) },
            _ => Err("finish-result-mismatch"),
        }
    }
    fn teardown(&mut self) -> Result<(), &'static str> { if self.open { return Err("teardown-while-open"); } if !self.events.iter().any(|event| matches!(event, Event::Closed | Event::ErrorClosed)) { return Err("teardown-before-close"); } self.events.push(Event::Teardown); Ok(()) }
    fn collect(self) -> Result<Vec<Event>, &'static str> { if !matches!(self.events.last(), Some(Event::Teardown)) { return Err("missing-teardown"); } Ok(self.events) }
}

fn scope(input: &[u8], work: impl FnOnce() -> Result<usize, &'static str>) -> (Result<usize, &'static str>, Vec<Event>) {
    let mut window = Window::empty();
    window.setup(input.len()).unwrap();
    window.begin().unwrap();
    let result = window.measure(work);
    let outcome = match result { Ok(value) => { window.finish(Ok(value)).unwrap(); Ok(value) }, Err(error) => { window.finish(Err(error)).unwrap(); Err(error) } };
    window.teardown().unwrap();
    (outcome, window.collect().unwrap())
}`;
const scopeBlankTests = String.raw`#[test]
fn setup_is_outside_and_teardown_runs_for_both_results() {
    let input = b"records";
    assert_eq!(scope(input, || Ok(11)).1, vec![Event::Setup { input_len: 7 }, Event::Open, Event::Measured { ok: true, value: 11 }, Event::Closed, Event::Reported { value: 11 }, Event::Teardown]);
    assert_eq!(scope(input, || Err("bad")).1, vec![Event::Setup { input_len: 7 }, Event::Open, Event::Measured { ok: false, value: 0 }, Event::ErrorClosed, Event::Teardown]);
    let mut before_measure = Window::empty(); before_measure.setup(7).unwrap(); before_measure.begin().unwrap();
    assert_eq!(before_measure.finish(Ok(11)), Err("finish-before-measure"));
    assert_eq!(before_measure.teardown(), Err("teardown-while-open"));
    assert_eq!(before_measure.collect(), Err("missing-teardown"));
    let mut mismatch = Window::empty(); mismatch.setup(7).unwrap(); mismatch.begin().unwrap();
    assert_eq!(mismatch.measure(|| Ok(11)), Ok(11));
    assert_eq!(mismatch.finish(Ok(999)), Err("finish-result-mismatch"));
    assert_eq!(mismatch.teardown(), Err("teardown-while-open"));
    assert_eq!(mismatch.finish(Ok(11)), Ok(()));
    mismatch.teardown().unwrap();
    let mut fresh = Window::empty();
    assert_eq!(fresh.teardown(), Err("teardown-before-close"));
}

#[test]
fn allocation_finish_rejects_different_error_keeps_window_open() {
    let mut window = Window::empty(); window.setup(7).unwrap(); window.begin().unwrap();
    assert_eq!(window.measure(|| Err::<usize, _>("measured-error")), Err("measured-error"));
    assert_eq!(window.finish(Err("reported-error")), Err("finish-result-mismatch"));
    assert_eq!(window.teardown(), Err("teardown-while-open"));
}

#[test]
fn allocation_finish_accepts_measured_error_emits_error_closed() {
    let mut window = Window::empty(); window.setup(7).unwrap(); window.begin().unwrap();
    assert_eq!(window.measure(|| Err::<usize, _>("measured-error")), Err("measured-error"));
    assert_eq!(window.finish(Err("measured-error")), Ok(()));
    window.teardown().unwrap();
    assert_eq!(window.collect().unwrap(), vec![Event::Setup { input_len: 7 }, Event::Open, Event::Measured { ok: false, value: 0 }, Event::ErrorClosed, Event::Teardown]);
}

#[test]
fn allocation_finish_accepts_equal_direct_error_closes() {
    let mut window = Window::empty(); window.setup(7).unwrap(); window.begin().unwrap();
    assert_eq!(window.measure(|| Err::<usize, _>("parser")), Err("parser"));
    assert_eq!(window.finish(Err("parser")), Ok(()));
    assert_eq!(window.teardown(), Ok(()));
}

#[test]
fn allocation_success_value_mismatch_keeps_window_open_for_correct_retry() {
    let mut window = Window::empty(); window.setup(7).unwrap(); window.begin().unwrap();
    assert_eq!(window.measure(|| Ok(11)), Ok(11));
    assert_eq!(window.finish(Ok(999)), Err("finish-result-mismatch"));
    assert_eq!(window.teardown(), Err("teardown-while-open"));
    assert_eq!(window.finish(Ok(11)), Ok(()));
    assert_eq!(window.teardown(), Ok(()));
}`;

const compareGateSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Observation { input: &'static str, summary: u64, allocations: usize, requested: usize, retained: usize }

fn comparable(baseline: Observation, candidate: Observation) -> bool {
    baseline.input == candidate.input && baseline.summary == candidate.summary
}`;
const compareGateStarter = compareGateSolution.replace("baseline.summary == candidate.summary", "baseline.allocations == candidate.allocations");
const compareGateTests = String.raw`#[test]
fn compares_input_and_summary_without_confusing_allocation_metrics() {
    let baseline = Observation { input: "512-info", summary: 512, allocations: 8, requested: 90, retained: 12 };
    assert!(comparable(baseline, Observation { allocations: 4, requested: 40, retained: 4, ..baseline }));
    assert!(!comparable(baseline, Observation { input: "empty", ..baseline }));
    assert!(!comparable(baseline, Observation { summary: 511, ..baseline }));
}`;

const completeGateSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { complete: bool, same_workload: bool, same_summary: bool }

fn accept_evidence(evidence: Evidence) -> bool {
    evidence.complete && evidence.same_workload && evidence.same_summary
}`;
const completeGateStarter = completeGateSolution.replace("evidence.complete && evidence.same_workload", "evidence.same_workload");
const completeGateTests = String.raw`#[test]
fn rejects_incomplete_or_incomparable_evidence() {
    assert!(accept_evidence(Evidence { complete: true, same_workload: true, same_summary: true }));
    assert!(!accept_evidence(Evidence { complete: false, same_workload: true, same_summary: true }));
    assert!(!accept_evidence(Evidence { complete: true, same_workload: false, same_summary: true }));
    assert!(!accept_evidence(Evidence { complete: true, same_workload: true, same_summary: false }));
}`;

const comparisonBlankSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Report { input: &'static str, summary: u64, allocator_calls: usize, requested_bytes: usize, retained_bytes: usize, complete: bool }

fn comparable_reports(baseline: Report, candidate: Report) -> bool {
    baseline.complete && candidate.complete && baseline.input == candidate.input && baseline.summary == candidate.summary
}`;
const comparisonBlankTests = String.raw`#[test]
fn result_equality_and_completion_precede_cost_interpretation() {
    let baseline = Report { input: "records-512", summary: 512, allocator_calls: 10, requested_bytes: 200, retained_bytes: 32, complete: true };
    assert!(comparable_reports(baseline, Report { allocator_calls: 6, requested_bytes: 120, retained_bytes: 16, ..baseline }));
    assert!(!comparable_reports(baseline, Report { complete: false, ..baseline }));
    assert!(!comparable_reports(baseline, Report { input: "empty", ..baseline }));
    assert!(!comparable_reports(baseline, Report { summary: 511, ..baseline }));
    assert!(!comparable_reports(Report { complete: false, ..baseline }, baseline));
}`;

// A scalar predicate cannot supply the ordered diagnostic and metric audit.
const comparisonAuditSolution = String.raw`#[derive(Debug, Clone, Copy)]
struct Sample { input: &'static str, summary: u64, complete: bool, calls: usize }
#[derive(Debug, PartialEq, Eq)]
enum Audit { Incomplete, DifferentInput, DifferentSummary, MoreCalls(usize), SameOrFewer }

fn audit_reports(baseline: Sample, candidates: &[Sample]) -> Vec<Audit> {
    candidates.iter().map(|candidate| {
        if !baseline.complete || !candidate.complete { Audit::Incomplete }
        else if baseline.input != candidate.input { Audit::DifferentInput }
        else if baseline.summary != candidate.summary { Audit::DifferentSummary }
        else if candidate.calls > baseline.calls { Audit::MoreCalls(candidate.calls - baseline.calls) }
        else { Audit::SameOrFewer }
    }).collect()
}`;
const comparisonAuditStarter = comparisonAuditSolution.slice(0, comparisonAuditSolution.indexOf("    candidates.iter()")) + `    Vec::new()
}`;
const comparisonAuditTests = String.raw`#[test]
fn audits_each_candidate_in_order_before_interpreting_calls() {
    let base = Sample { input: "żółć", summary: 7, complete: true, calls: 10 };
    let candidates = [
        Sample { calls: 4, ..base }, Sample { calls: 15, ..base },
        Sample { calls: 10, ..base }, Sample { complete: false, input: "other", summary: 0, ..base },
        Sample { input: "other", summary: 0, ..base }, Sample { summary: 0, ..base },
    ];
    assert_eq!(audit_reports(base, &candidates), vec![Audit::SameOrFewer, Audit::MoreCalls(5), Audit::SameOrFewer, Audit::Incomplete, Audit::DifferentInput, Audit::DifferentSummary]);
    assert_eq!(audit_reports(Sample { complete: false, ..base }, &candidates), vec![Audit::Incomplete, Audit::Incomplete, Audit::Incomplete, Audit::Incomplete, Audit::Incomplete, Audit::Incomplete]);
    assert!(audit_reports(base, &[]).is_empty());
}

#[test]
fn empty_workload_and_extreme_costs_keep_their_meaning() {
    let base = Sample { input: "", summary: 0, complete: true, calls: 0 };
    assert_eq!(audit_reports(base, &[base, Sample { calls: usize::MAX, ..base }]), vec![Audit::SameOrFewer, Audit::MoreCalls(usize::MAX)]);
    assert_eq!(audit_reports(Sample { calls: usize::MAX, ..base }, &[base]), vec![Audit::SameOrFewer]);
}`;

const scopeReviewSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Marker { Setup(usize), Work(usize), Report(usize), Teardown }
#[derive(Debug, PartialEq, Eq)]
struct Observation { input_bytes: usize, markers: Vec<Marker>, output: usize }

fn verify(observation: &Observation) -> Result<usize, &'static str> {
    let expected = vec![Marker::Setup(observation.input_bytes), Marker::Work(observation.output), Marker::Report(observation.output), Marker::Teardown];
    if observation.markers != expected { return Err("sequence"); }
    Ok(observation.output)
}`;
const scopeReviewStarter = scopeReviewSolution.replace("Marker::Report(observation.output)", "Marker::Work(observation.output)");
const scopeReviewTests = String.raw`#[test]
fn transfer_evidence_requires_complete_observed_sequence() {
    let good = Observation { input_bytes: 9, markers: vec![Marker::Setup(9), Marker::Work(21), Marker::Report(21), Marker::Teardown], output: 21 };
    assert_eq!(verify(&good), Ok(21));
    assert_eq!(verify(&Observation { markers: vec![Marker::Setup(9), Marker::Report(21), Marker::Teardown], ..good }), Err("sequence"));
    assert_eq!(verify(&Observation { markers: vec![Marker::Setup(8), Marker::Work(21), Marker::Report(21), Marker::Teardown], ..good }), Err("sequence"));
    assert_eq!(verify(&Observation { markers: vec![Marker::Setup(9), Marker::Work(21), Marker::Report(20), Marker::Teardown], ..good }), Err("sequence"));
    assert_eq!(verify(&Observation { markers: vec![Marker::Setup(9), Marker::Work(21), Marker::Report(21)], ..good }), Err("sequence"));
}`;

const comparisonReviewSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { input: &'static str, summary: u64, complete: bool, calls: usize }

fn compare(baseline: Evidence, candidate: Evidence) -> Result<usize, &'static str> {
    if !baseline.complete || !candidate.complete { return Err("incomplete"); }
    if baseline.input != candidate.input { return Err("input"); }
    if baseline.summary != candidate.summary { return Err("summary"); }
    Ok(candidate.calls.saturating_sub(baseline.calls))
}`;
const comparisonReviewStarter = comparisonReviewSolution.replace("if baseline.input != candidate.input", "if baseline.input == candidate.input");
const comparisonReviewTests = String.raw`#[test]
fn compares_before_interpreting_calls() {
    let baseline = Evidence { input: "records", summary: 4, complete: true, calls: 8 };
    assert_eq!(compare(baseline, Evidence { calls: 5, ..baseline }), Ok(0));
    assert_eq!(compare(baseline, Evidence { input: "other", ..baseline }), Err("input"));
    assert_eq!(compare(baseline, Evidence { summary: 3, ..baseline }), Err("summary"));
    assert_eq!(compare( Evidence { complete: false, ..baseline }, baseline), Err("incomplete"));
    assert_eq!(compare(baseline, Evidence { complete: false, ..baseline }), Err("incomplete"));
}`;

export const runtimeAllocationEvidenceConcepts: Concept[] = [
  { id: "runtime-allocation-window", title: "Okno pomiaru alokacji ma trzy jawne fazy", prerequisites: ["allocation-event-model"], competencyIds: ["model-allocation-events"], reviewPrompt: "Co musi pozostać poza oknem pomiaru i co robisz po wyniku Err?", reviewAnswer: "Przygotowanie, warm-up, formatowanie i teardown są poza oknem; licznik zamykam także po Err, a niedomknięte okno oznaczam jako niekompletne.", distinguish: "GlobalAlloc raportuje wywołania obserwowanego procesu. Nie jest to RSS, retained memory ani uniwersalny koszt parsera na każdej maszynie.", evidenceArtifact: "rust-code" },
  { id: "runtime-allocation-comparison", title: "Porównanie alokacji wymaga wspólnego inputu i wyniku", prerequisites: ["runtime-allocation-window"], competencyIds: ["transfer-optimization-evidence"], reviewPrompt: "Kiedy mniejsza liczba wywołań alokatora nie jest poprawą?", reviewAnswer: "Gdy input, Summary albo kompletność raportu różnią się między wariantami. Liczba wywołań, żądane bajty i pamięć zachowana odpowiadają na różne pytania.", distinguish: "Mutant materializujący owned payloady ma zachować Summary, aby różnica dotyczyła obserwowanego kosztu, a nie semantyki.", evidenceArtifact: "rust-code" },
];

export const runtimeAllocationEvidenceLessons: Lesson[] = [
  { id: "runtime-allocation-scope", moduleId: "profile-evidence", conceptIds: ["runtime-allocation-window"], competencyIds: ["model-allocation-events"], prerequisites: ["profile-allocation-events"], title: "Wyznacz zakres pomiaru alokacji", subtitle: "Oddzielisz przygotowanie, okno realnego parsera i teardown, także dla Err.", minutes: 25, outcomes: ["Wyłączysz setup i warm-up z pomiaru.", "Zamkniesz okno po Ok i Err.", "Nazwiesz GlobalAlloc jako obserwację wywołań procesu."], steps: [
    choice("allocation-scope-predict", "Wybierz granicę", "Co powinno znaleźć się w oknie?", ["Tylko wywołanie analyze_reader", "Budowa inputu i formatowanie JSON", "Sprzątanie procesu i start test harness"], 0),
    run("allocation-scope-run", "Zobacz trzy fazy", "Setup, pomiar i teardown wynikają z rzeczywistego wywołania work.", `#[derive(Debug)]
enum Event { Setup { input_len: usize }, Measured { ok: bool }, Reported { value: usize }, Teardown }
fn close_window(input: &[u8], work: impl FnOnce(&[u8]) -> Result<usize, &'static str>) -> Vec<Event> {
    let mut events = vec![Event::Setup { input_len: input.len() }];
    let result = work(input);
    events.push(Event::Measured { ok: result.is_ok() });
    if let Ok(value) = result { events.push(Event::Reported { value }); }
    events.push(Event::Teardown);
    events
}
fn main() { println!("{:?}", close_window(b"records", |bytes| Ok(bytes.len()))); }`, "[Setup { input_len: 7 }, Measured { ok: true }, Reported { value: 7 }, Teardown]\n"),
    tested({ id: "allocation-scope-gate", kind: "modify", title: "Zamknij okno po sukcesie i błędzie", prompt: "Uzupełnij close_window tak, aby wynik pozostał bez zmian, a teardown i measured były zapisane po Ok i Err.", code: scopeGateStarter, solution: scopeGateSolution, tests: scopeGateTests, gate: true }),
    tested({ id: "allocation-scope-error-gate", kind: "apply", title: "Odrzuć niedomknięty raport", prompt: "Rozróżnij poprawnie zamknięte Ok, poprawnie zamknięte Err i niekompletne okno.", code: errorGateStarter, solution: errorGateSolution, tests: errorGateTests, gate: true }),
    tested({ id: "allocation-scope-blank", kind: "blank", title: "Blank page: trzy fazy pomiaru", prompt: "Zaimplementuj publiczny kontrakt Rust: enum Event (Debug, PartialEq, Eq) z wariantami Setup { input_len: usize }, Open, Measured { ok: bool, value: usize }, Closed, Reported { value: usize }, ErrorClosed i Teardown oraz struct Window. Udostępnij Window::empty() -> Window, fn setup(&mut self, input_len: usize) -> Result<(), &'static str>, fn begin(&mut self) -> Result<(), &'static str>, fn measure(&mut self, work: impl FnOnce() -> Result<usize, &'static str>) -> Result<usize, &'static str>, fn finish(&mut self, result: Result<usize, &'static str>) -> Result<(), &'static str>, fn teardown(&mut self) -> Result<(), &'static str> i fn collect(self) -> Result<Vec<Event>, &'static str>. Udostępnij też fn scope(input: &[u8], work: impl FnOnce() -> Result<usize, &'static str>) -> (Result<usize, &'static str>, Vec<Event>). Hidden tests wymagają, aby po Err pojawiło się Measured { ok: false, value: 0 }, po sukcesie Measured { ok: true, value } i Reported { value }, a kolejność obejmowała Setup, Open, Measured, Closed lub ErrorClosed, opcjonalnie Reported, Teardown. Zachowaj payload Err(&'static str) w Measurement::Error: finish(Err(...)) zamyka okno tylko dla identycznego komunikatu, a inny komunikat zwraca finish-result-mismatch i pozostawia okno otwarte do poprawnej próby. setup musi odrzucić setup-inside-window, begin już otwarte okno jako already-open, measure poza oknem jako work-before-open, finish przed pomiarem jako finish-before-measure i rozbieżny wynik jako finish-result-mismatch, a zamknięte okno jako already-closed; teardown ma odrzucać teardown-while-open i teardown-before-close, zaś collect brak końcowego Teardown jako missing-teardown.", solution: scopeBlankSolution, tests: scopeBlankTests }),
    recall("allocation-scope-recall", "Wyjaśnij granicę pomiaru", "Licznik GlobalAlloc zarejestrował wywołania podczas analizy danych. Co mierzy ta obserwacja i co możesz na jej podstawie powiedzieć o pamięci procesu? Wyjaśnij własnymi słowami.", "Nie; to obserwacja wywołań alokatora w nazwanym oknie procesu, nie RSS ani retained memory.", [
      "Wskazuję, które wywołania alokatora i jaki przedział wykonania obejmuje pomiar.",
      "Wyjaśniam, dlaczego licznik wywołań nie podaje ani RSS procesu, ani ilości pamięci nadal zajętej po analizie.",
    ]),
  ], misconceptions: ["Formatowanie JSON może być częścią pomiaru.", "Err nie wymaga zamknięcia okna.", "GlobalAlloc mierzy RSS całego systemu."], transferTask: "Rozpisz setup, warm-up, pomiar analyze_reader i teardown dla własnego workloadu.", evidenceGate: "Bramki wymagają jawnej granicy i kompletności po obu ścieżkach wyniku.", sourceIds: ["profile-global-allocator", "profile-criterion"] },
  { id: "runtime-allocation-comparison", moduleId: "profile-evidence", conceptIds: ["runtime-allocation-comparison"], competencyIds: ["transfer-optimization-evidence"], prerequisites: ["runtime-allocation-scope"], title: "Porównaj identyczny workload", subtitle: "Sprawdzisz wynik, kompletność i zakres, zanim nazwiesz różnicę poprawą.", minutes: 27, outcomes: ["Porównasz baseline, candidate i mutanta na tym samym input.", "Oddzielisz calls, requested bytes i retained memory.", "Odrzucisz niekompletne lub różne Summary."], steps: [
    choice("allocation-comparison-predict", "Wybierz warunek", "Co musi być równe przed porównaniem kosztu?", ["Input i Summary", "Tylko liczba alokacji", "Tylko czas procesu"], 0),
    run("allocation-comparison-run", "Rozdziel metryki", "Calls, requested bytes i retained bytes są trzema polami po porównaniu tego samego inputu.", `#[derive(Clone, Copy)]
struct Observation { input: &'static str, summary: u64, calls: usize, requested: usize, retained: usize }
fn comparable(a: Observation, b: Observation) -> bool { a.input == b.input && a.summary == b.summary }
fn main() {
    let baseline = Observation { input: "records-512", summary: 512, calls: 8, requested: 90, retained: 12 };
    let candidate = Observation { input: "records-512", summary: 512, calls: 3, requested: 48, retained: 16 };
    println!("comparable={} calls={} requested={} retained={}", comparable(baseline, candidate), candidate.calls, candidate.requested, candidate.retained);
}`, "comparable=true calls=3 requested=48 retained=16\n", {
      code: [{ lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-gate" }],
      solution: [{ lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-gate" }],
    }),
    tested({ id: "allocation-comparison-gate", kind: "modify", title: "Porównaj input i Summary", prompt: "Zaimplementuj comparable bez używania kosztu jako warunku równoważności workloadu.", code: compareGateStarter, solution: compareGateSolution, tests: compareGateTests, gate: true }),
    tested({ id: "allocation-comparison-complete-gate", kind: "apply", title: "Odrzuć niekompletne dowody", prompt: "Akceptuj dowód tylko wtedy, gdy oba raporty są kompletne, mają ten sam workload i ten sam Summary.", code: completeGateStarter, solution: completeGateSolution, tests: completeGateTests, gate: true }),
    tested({ id: "allocation-comparison-blank", kind: "blank", title: "Blank page: raport porównania", prompt: "Zaimplementuj publiczny kontrakt Rust: #[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Report { input: &'static str, summary: u64, allocator_calls: usize, requested_bytes: usize, retained_bytes: usize, complete: bool } oraz fn comparable_reports(baseline: Report, candidate: Report) -> bool. Zwróć true wyłącznie dla dwóch kompletnych raportów z tym samym input i Summary; pola allocator_calls, requested_bytes i retained_bytes opisują różne metryki kosztu i nie mogą zastępować warunku porównywalności. Zwróć false dla niekompletnego baseline albo candidate oraz dla różnego inputu lub Summary.", solution: comparisonBlankSolution, tests: comparisonBlankTests, suppliedSolutions: { solution: [
      { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-gate" },
      { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-complete-gate" },
    ] } }),
    recall("allocation-comparison-recall", "Zinterpretuj różnicę", "Druga wersja zarejestrowała mniej wywołań alokatora. Co sprawdzisz przed porównaniem i jaki wniosek wolno Ci sformułować? Odpowiedz własnymi słowami.", "Nie; najpierw trzeba potwierdzić ten sam input, ten sam Summary i kompletność, a metryka dotyczy tylko wywołań obserwowanego alokatora.", [
      "Porównuję to samo wejście i wynik Summary oraz sprawdzam kompletność obu pomiarów i zgodność okien.",
      "Ograniczam wniosek do zaobserwowanych wywołań. Ocena czasu lub pamięci procesu wymaga osobnego pomiaru.",
    ]),
    tested({ id: "allocation-comparison-audit", kind: "apply", title: "Audytuj serię kandydatów", prompt: "Uzupełnij audit_reports(baseline: Sample, candidates: &[Sample]) -> Vec<Audit>. Zachowaj kolejność i liczbę kandydatów. Dla każdego wybierz pierwszy pasujący wynik: Incomplete, gdy baseline lub kandydat jest niekompletny; DifferentInput dla różnego input; DifferentSummary dla różnego summary; MoreCalls(n), gdy kompletny porównywalny kandydat ma więcej calls, gdzie n to różnica; w pozostałych porównywalnych przypadkach SameOrFewer. Pusta lista daje pusty Vec. Liczba calls opisuje tylko tę metrykę kosztu, a mniejsza wartość sama nie dowodzi mniejszej pamięci procesu.", code: comparisonAuditStarter, solution: comparisonAuditSolution, tests: comparisonAuditTests, gate: true }),
  ], misconceptions: ["Mniejszy requested bytes zawsze oznacza mniejszy RSS.", "Różny input nadal daje porównywalny wynik.", "Niekompletny raport jest poprawą."], transferTask: "Zaprojektuj tabelę baseline/candidate/mutant dla pustego, poprawnego i uszkodzonego inputu.", evidenceGate: "Bramki wymagają tej samej pracy i wyniku przed interpretacją calls, bajtów i pamięci zachowanej.", sourceIds: ["profile-global-allocator", "profile-criterion"] },
];

export const runtimeAllocationEvidenceReviewExercises: Record<string, LessonStep> = {
  "runtime-allocation-window": tested({ id: "allocation-scope-review", kind: "apply", title: "Powtórka: zdarzenia pomiaru", prompt: "Odtwórz obserwowalny przebieg faz dla Ok i Err.", code: scopeReviewStarter, solution: scopeReviewSolution, tests: scopeReviewTests }),
  "runtime-allocation-comparison": tested({ id: "allocation-comparison-review", kind: "apply", title: "Powtórka: porównywalny dowód", prompt: "Zwróć strukturalny błąd przed interpretacją calls.", code: comparisonReviewStarter, solution: comparisonReviewSolution, tests: comparisonReviewTests }),
};
