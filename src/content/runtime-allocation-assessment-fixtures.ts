import {
  runtimeAllocationEvidenceLessons,
  runtimeAllocationEvidenceReviewExercises,
} from "./runtime-allocation-evidence";

export interface RuntimeAllocationAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
  mutants?: { id: string; source: string }[];
}

const equivalents: Record<string, string> = {
  "allocation-scope-gate": `#[derive(Debug, PartialEq, Eq)]
enum Event { Setup { input_len: usize }, Open, Measured { ok: bool, value: usize }, Closed, Reported { value: usize }, ErrorClosed, Teardown }
enum Measurement { Success(usize), Error }
struct Window { active: bool, result: Option<Measurement>, reported: bool, events: Vec<Event> }
impl Window {
    fn new() -> Self { Self { active: false, result: None, reported: false, events: Vec::new() } }
    fn setup(&mut self, bytes: usize) -> Result<(), &'static str> { if self.active || !self.events.is_empty() { return Err("setup-inside-window"); } self.events.push(Event::Setup { input_len: bytes }); Ok(()) }
    fn open(&mut self) -> Result<(), &'static str> { if self.active { return Err("already-open"); } self.active = true; self.events.push(Event::Open); Ok(()) }
    fn work(&mut self, job: impl FnOnce() -> Result<usize, &'static str>) -> Result<usize, &'static str> { if !self.active { return Err("work-before-open"); } match job() { Ok(value) => { self.result = Some(Measurement::Success(value)); self.events.push(Event::Measured { ok: true, value }); Ok(value) }, Err(error) => { self.result = Some(Measurement::Error); self.events.push(Event::Measured { ok: false, value: 0 }); Err(error) } } }
    fn close(&mut self) -> Result<(), &'static str> { if !self.active { return Err("already-closed"); } self.active = false; self.events.push(Event::Closed); Ok(()) }
    fn report(&mut self) -> Result<usize, &'static str> { if self.active { return Err("report-inside-window"); } let value = match self.result.as_ref() { Some(Measurement::Success(value)) => *value, Some(Measurement::Error) => return Err("report-after-error"), None => return Err("report-before-work") }; self.reported = true; self.events.push(Event::Reported { value }); Ok(value) }
    fn error_close(&mut self) -> Result<(), &'static str> { if !self.active { return Err("already-closed"); } self.active = false; self.events.push(Event::ErrorClosed); Ok(()) }
    fn teardown(&mut self) -> Result<(), &'static str> { if self.active { return Err("teardown-while-open"); } if !self.reported && !self.events.iter().any(|event| matches!(event, Event::ErrorClosed)) { return Err("teardown-before-close"); } self.events.push(Event::Teardown); Ok(()) }
    fn collect(self) -> Result<Vec<Event>, &'static str> { if !matches!(self.events.last(), Some(Event::Teardown)) { return Err("missing-teardown"); } Ok(self.events) }
}
fn close_window(input: &[u8], work: impl FnOnce() -> Result<usize, &'static str>) -> (Result<usize, &'static str>, Vec<Event>) {
    let mut window = Window::new(); window.setup(input.len()).unwrap(); window.open().unwrap();
    match window.work(work) { Ok(value) => { window.close().unwrap(); window.report().unwrap(); window.teardown().unwrap(); (Ok(value), window.collect().unwrap()) }, Err(error) => { window.error_close().unwrap(); window.teardown().unwrap(); (Err(error), window.collect().unwrap()) } }
}`,
  "allocation-scope-error-gate": `fn measurement_status<T, E>(result: Result<T, E>, closed: bool) -> &'static str {
    if !closed { return "incomplete"; }
    if result.is_ok() { "ok-closed" } else { "err-closed" }
}`,
  "allocation-scope-blank": `#[derive(Debug, PartialEq, Eq)]
enum Event { Setup { input_len: usize }, Open, Measured { ok: bool, value: usize }, Closed, Reported { value: usize }, ErrorClosed, Teardown }
enum Measurement { Success(usize), Error(&'static str) }
struct Window { active: bool, measured: Option<Measurement>, events: Vec<Event> }
impl Window {
    fn empty() -> Self { Self { active: false, measured: None, events: Vec::new() } }
    fn setup(&mut self, bytes: usize) -> Result<(), &'static str> { if self.active || !self.events.is_empty() { return Err("setup-inside-window"); } self.events.push(Event::Setup { input_len: bytes }); Ok(()) }
    fn begin(&mut self) -> Result<(), &'static str> { self.active = true; self.events.push(Event::Open); Ok(()) }
    fn measure(&mut self, job: impl FnOnce() -> Result<usize, &'static str>) -> Result<usize, &'static str> { if !self.active { return Err("work-before-open"); } match job() { Ok(value) => { self.measured = Some(Measurement::Success(value)); self.events.push(Event::Measured { ok: true, value }); Ok(value) }, Err(error) => { self.measured = Some(Measurement::Error(error)); self.events.push(Event::Measured { ok: false, value: 0 }); Err(error) } } }
    fn finish(&mut self, result: Result<usize, &'static str>) -> Result<(), &'static str> { if !self.active { return Err("already-closed"); } match (self.measured.as_ref(), result) { (None, _) => Err("finish-before-measure"), (Some(Measurement::Success(measured)), Ok(value)) if *measured == value => { self.active = false; self.events.push(Event::Closed); self.events.push(Event::Reported { value: *measured }); Ok(()) }, (Some(Measurement::Error(measured)), Err(error)) if *measured == error => { self.active = false; self.events.push(Event::ErrorClosed); Ok(()) }, _ => Err("finish-result-mismatch") } }
    fn teardown(&mut self) -> Result<(), &'static str> { if self.active { return Err("teardown-while-open"); } if !self.events.iter().any(|event| matches!(event, Event::Closed | Event::ErrorClosed)) { return Err("teardown-before-close"); } self.events.push(Event::Teardown); Ok(()) }
    fn collect(self) -> Result<Vec<Event>, &'static str> { if !matches!(self.events.last(), Some(Event::Teardown)) { return Err("missing-teardown"); } Ok(self.events) }
}
fn scope(input: &[u8], work: impl FnOnce() -> Result<usize, &'static str>) -> (Result<usize, &'static str>, Vec<Event>) {
    let mut window = Window::empty(); window.setup(input.len()).unwrap(); window.begin().unwrap();
    let result = window.measure(work); let outcome = match result { Ok(value) => { window.finish(Ok(value)).unwrap(); Ok(value) }, Err(error) => { window.finish(Err(error)).unwrap(); Err(error) } };
    window.teardown().unwrap();
    (outcome, window.collect().unwrap())
}`,
  "allocation-comparison-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Observation { input: &'static str, summary: u64, allocations: usize, requested: usize, retained: usize }
fn comparable(baseline: Observation, candidate: Observation) -> bool {
    let same_input = baseline.input == candidate.input;
    let same_summary = baseline.summary == candidate.summary;
    same_input && same_summary
}`,
  "allocation-comparison-complete-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { complete: bool, same_workload: bool, same_summary: bool }
fn accept_evidence(evidence: Evidence) -> bool {
    match evidence { Evidence { complete: true, same_workload: true, same_summary: true } => true, _ => false }
}`,
  "allocation-comparison-blank": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Report { input: &'static str, summary: u64, allocator_calls: usize, requested_bytes: usize, retained_bytes: usize, complete: bool }
fn comparable_reports(baseline: Report, candidate: Report) -> bool {
    let complete = baseline.complete && candidate.complete;
    complete && baseline.input == candidate.input && baseline.summary == candidate.summary
}`,
  "allocation-scope-review": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Marker { Setup(usize), Work(usize), Report(usize), Teardown }
#[derive(Debug, PartialEq, Eq)]
struct Observation { input_bytes: usize, markers: Vec<Marker>, output: usize }
fn verify(observation: &Observation) -> Result<usize, &'static str> {
    let setup = matches!(observation.markers.first(), Some(Marker::Setup(bytes)) if *bytes == observation.input_bytes);
    let work = matches!(observation.markers.get(1), Some(Marker::Work(value)) if *value == observation.output);
    let report = Marker::Report(observation.output);
    let terminal = matches!(observation.markers.last(), Some(Marker::Teardown));
    if observation.markers.len() != 4 || !setup || !work || observation.markers[2] != report || !terminal { return Err("sequence"); }
    Ok(observation.output)
}`,
  "allocation-comparison-review": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { input: &'static str, summary: u64, complete: bool, calls: usize }
fn compare(baseline: Evidence, candidate: Evidence) -> Result<usize, &'static str> {
    match (baseline.complete, candidate.complete) {
        (true, true) if baseline.input == candidate.input && baseline.summary == candidate.summary => Ok(candidate.calls.saturating_sub(baseline.calls)),
        (false, _) | (_, false) => Err("incomplete"),
        (true, true) if baseline.input != candidate.input => Err("input"),
        _ => Err("summary"),
    }
}`,
};

const mutants: Record<string, string> = {
  "allocation-scope-gate": equivalents["allocation-scope-gate"].replace("window.open().unwrap();", "window.open().unwrap(); window.setup(input.len()).unwrap();"),
  "allocation-scope-error-gate": equivalents["allocation-scope-error-gate"].replace("if result.is_ok() { \"ok-closed\" }", "if result.is_ok() { \"err-closed\" }"),
  "allocation-scope-blank": equivalents["allocation-scope-blank"].replace("let result = window.measure(work);", "window.finish(Ok(0)).unwrap();\n    let result = window.measure(work);"),
  "allocation-comparison-gate": equivalents["allocation-comparison-gate"].replace("let same_summary = baseline.summary == candidate.summary;", "let same_summary = baseline.allocations == candidate.allocations;"),
  "allocation-comparison-complete-gate": equivalents["allocation-comparison-complete-gate"].replace("complete: true, same_workload: true, same_summary: true", "complete: false, same_workload: true, same_summary: true"),
  "allocation-comparison-blank": equivalents["allocation-comparison-blank"].replace("let complete = baseline.complete && candidate.complete;", "let complete = true;"),
  "allocation-scope-review": equivalents["allocation-scope-review"].replace("let report = Marker::Report(observation.output);", "let report = Marker::Work(observation.output);"),
  "allocation-comparison-review": equivalents["allocation-comparison-review"].replace("baseline.input == candidate.input", "baseline.input != candidate.input"),
};

const namedMutants: Record<string, { id: string; source: string }[]> = {
  "allocation-scope-blank": [
    {
      id: "allocation-scope-blank-wrong-error-payload",
      source: equivalents["allocation-scope-blank"].replace(
        "(Some(Measurement::Error(measured)), Err(error)) if *measured == error =>",
        "(Some(Measurement::Error(_)), Err(_)) =>",
      ),
    },
    {
      id: "allocation-scope-blank-premature-finish",
      source: mutants["allocation-scope-blank"],
    },
  ],
};

const assessed = [
  ...runtimeAllocationEvidenceLessons.flatMap((lesson) => lesson.steps.filter((step) => step.evaluator?.kind === "tests")),
  ...Object.values(runtimeAllocationEvidenceReviewExercises),
];

export const runtimeAllocationAssessmentFixtures: RuntimeAllocationAssessmentFixture[] = assessed.map((step) => ({
  id: step.id,
  equivalent: equivalents[step.id],
  mutant: mutants[step.id],
  ...(namedMutants[step.id] ? { mutants: namedMutants[step.id] } : {}),
}));
