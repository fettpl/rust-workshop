import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-17";

export const gatConsumerSources: Source[] = [
  {
    id: "gat-reference-trait-bounds",
    title: "Rust Reference: Trait and lifetime bounds",
    url: "https://doc.rust-lang.org/reference/trait-bounds.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie przykładów boundów GAT i HRTB.",
  },
  {
    id: "gat-reference-dyn-compatibility",
    title: "Rust Reference: dyn compatibility",
    url: "https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie obserwacji o obiektach traitów.",
  },
  {
    id: "gat-iterator",
    title: "Rust standard library: Iterator trait",
    url: "https://doc.rust-lang.org/stable/std/iter/trait.Iterator.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie kontraktu zwykłego Iterator::next.",
  },
  {
    id: "gat-error-e0038",
    title: "Rust Error Index: E0038 — dyn compatibility",
    url: "https://doc.rust-lang.org/error_codes/E0038.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Uruchamiaj rzeczywistą diagnostykę po zmianie przykładu dyn.",
  },
];

export const gatConsumerCompetencies: Competency[] = [
  {
    id: "use-declared-gat-capabilities",
    title:
      "Używasz możliwości elementu zapisanych w deklaracji rodzinnego GAT.",
  },
  {
    id: "stop-lending-consumers",
    title:
      "Kończysz każdą pożyczkę w konsumencie i respektujesz zatrzymanie callbacku.",
  },
  {
    id: "adapt-lending-to-owned-results",
    title:
      "Budujesz leniwy adapter, który oddaje własne wyniki bez pożyczonego stanu.",
  },
];

export const gatConsumerConcepts: Concept[] = [
  {
    id: "gat-item-capabilities",
    title: "Możliwości elementu zapisane w GAT",
    prerequisites: ["gat-overlapping-mutable-windows"],
    competencyIds: ["use-declared-gat-capabilities", "stop-lending-consumers"],
    reviewPrompt:
      "Gdzie umieszczasz AsRef<[T]> + AsMut<[T]>, gdy generyczny konsument ma bezpiecznie używać możliwości każdego elementu GAT?",
    reviewAnswer:
      "W wyspecjalizowanej deklaracji SliceLender<T>, przy type Item<'a>, razem z where Self: 'a. Dzięki temu każdy implementujący typ gwarantuje obie możliwości; zewnętrzny bound projekcji nie jest potrzebny.",
    distinguish:
      "To węższy kontrakt SliceLender, a nie obietnica wcześniejszego LendingIterator. Sam GAT nie oznacza, że wynik jest slice'em ani że callback może przechować pożyczkę.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "gat-owned-iterator-adapters",
    title: "Adapter kończący pożyczkę i oddający własność",
    prerequisites: ["gat-item-capabilities"],
    competencyIds: ["adapt-lending-to-owned-results"],
    reviewPrompt:
      "Dlaczego OwnedSummaries może implementować zwykły Iterator, chociaż jego źródło zwraca rodzinny element zależny od pożyczki odbiorcy?",
    reviewAnswer:
      "Adapter pobiera jeden element, odczytuje jego długość w czasie trwania pożyczki, a potem zwraca posiadający WindowSummary. Żaden slice nie wychodzi z next, więc zwykły Iterator ma stały Item.",
    distinguish:
      "Leniwość i polityka końca należą do konkretnego adaptera. Konstrukcja nie odpytuje źródła, a po terminalnym None ten adapter już nie odpytuje go ponownie.",
    evidenceArtifact: "rust-code",
  },
];

const sliceLenderApi = `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}`;

const mutateAndCountStarter = `${sliceLenderApi}

fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    Vec::new()
}`;

const mutateAndCountSolution = `${sliceLenderApi}

fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    let mut counts = Vec::new();
    while let Some(mut item) = lender.next() {
        counts.push(visit(item.as_mut()));
    }
    counts
}`;

const mutateAndCountTests = `struct Rows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for Rows<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        let row = self.rows.get_mut(self.position)?;
        self.position += 1;
        Some(row.as_mut_slice())
    }
}

struct Wrapper<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapper<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapper<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedRows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for WrappedRows<T> {
    type Item<'a> = Wrapper<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        let row = self.rows.get_mut(self.position)?;
        self.position += 1;
        Some(Wrapper(row.as_mut_slice()))
    }
}

struct Note<'a> { text: &'a str, marks: usize }

#[test]
fn visits_direct_and_custom_items_in_order_including_empty_items() {
    let mut rows = Rows { rows: vec![vec![1, 2], vec![], vec![3]], position: 0 };
    let mut calls = 0;
    let counts = mutate_and_count(&mut rows, |slice| {
        calls += 1;
        for value in slice.iter_mut() { *value += 10; }
        slice.len() + calls
    });
    assert_eq!(counts, vec![3, 2, 4]);
    assert_eq!(calls, 3);
    assert_eq!(rows.rows, vec![vec![11, 12], vec![], vec![13]]);

    let mut wrapped = WrappedRows { rows: vec![vec![4], vec![5, 6]], position: 0 };
    assert_eq!(mutate_and_count(&mut wrapped, |slice| { slice[0] *= 2; slice.len() }), vec![1, 2]);
    assert_eq!(wrapped.rows, vec![vec![8], vec![10, 6]]);

    let mut local_text = String::from("lokal");
    let mut borrowed = Rows { rows: vec![vec![Note { text: local_text.as_str(), marks: 0 }]], position: 0 };
    let marks = mutate_and_count(&mut borrowed, |slice| { slice[0].marks += 1; slice[0].text.len() });
    assert_eq!(marks, vec![5]);
    assert_eq!(borrowed.rows[0][0].marks, 1);
}`;

const visitUntilSolution = `${sliceLenderApi}

fn visit_until<L, T, F>(lender: &mut L, mut visit: F) -> usize
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> bool,
{
    let mut visited = 0;
    while let Some(mut item) = lender.next() {
        visited += 1;
        if !visit(item.as_mut()) { break; }
    }
    visited
}`;

const visitUntilTests = `struct Source { values: Vec<Vec<i32>>, position: usize, polls: usize }
impl SliceLender<i32> for Source {
    type Item<'a> = &'a mut [i32] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        self.polls += 1;
        let value = self.values.get_mut(self.position)?;
        self.position += 1;
        Some(value.as_mut_slice())
    }
}

struct Wrapped<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapped<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapped<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedSource<T> { values: Vec<Vec<T>>, position: usize, polls: usize }
impl<T> SliceLender<T> for WrappedSource<T> {
    type Item<'a> = Wrapped<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        self.polls += 1;
        let value = self.values.get_mut(self.position)?;
        self.position += 1;
        Some(Wrapped(value.as_mut_slice()))
    }
}

#[test]
fn stops_without_an_extra_poll_and_resumes_after_the_stopping_item() {
    let mut source = Source { values: vec![vec![1], vec![2], vec![3], vec![4]], position: 0, polls: 0 };
    let mut seen = Vec::new();
    assert_eq!(visit_until(&mut source, |slice| { seen.push(slice[0]); slice[0] += 10; slice[0] < 12 }), 2);
    assert_eq!(seen, vec![1, 2]);
    assert_eq!(source.polls, 2);
    assert_eq!(visit_until(&mut source, |slice| { seen.push(slice[0]); true }), 2);
    assert_eq!(seen, vec![1, 2, 3, 4]);
    assert_eq!(source.polls, 5);
}

#[test]
fn handles_empty_source_and_local_borrowed_records() {
    let mut empty = Source { values: Vec::new(), position: 0, polls: 0 };
    assert_eq!(visit_until(&mut empty, |_| true), 0);
    let text = String::from("żółć");
    struct Record<'a> { text: &'a str, touched: bool }
    let mut records = vec![Record { text: text.as_str(), touched: false }];
    struct RecordSource<'r, 'd> { records: &'r mut Vec<Record<'d>>, done: bool }
    impl<'r, 'd> SliceLender<Record<'d>> for RecordSource<'r, 'd> {
        type Item<'a> = &'a mut [Record<'d>] where Self: 'a;
        fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done { None } else { self.done = true; Some(self.records.as_mut_slice()) } }
    }
    let mut record_source = RecordSource { records: &mut records, done: false };
    assert_eq!(visit_until(&mut record_source, |slice| { slice[0].touched = true; false }), 1);
    drop(record_source);
    assert!(records[0].touched);
}

#[test]
fn visits_empty_some_and_stops_on_the_last_item_with_exact_polls() {
    let mut source = Source { values: vec![vec![], vec![7]], position: 0, polls: 0 };
    let mut callbacks = 0;
    assert_eq!(visit_until(&mut source, |slice| { callbacks += 1; if !slice.is_empty() { slice[0] += 1; } true }), 2);
    assert_eq!(callbacks, 2);
    assert_eq!(source.polls, 3);
    let mut last = Source { values: vec![vec![1], vec![2]], position: 0, polls: 0 };
    let mut seen = Vec::new();
    assert_eq!(visit_until(&mut last, |slice| { seen.push(slice[0]); slice[0] += 1; slice[0] < 3 }), 2);
    assert_eq!(seen, vec![1, 2]);
    assert_eq!(last.polls, 2);
}

#[test]
fn accepts_a_custom_item_wrapper() {
    let mut source = WrappedSource { values: vec![vec![3], vec![4]], position: 0, polls: 0 };
    assert_eq!(visit_until(&mut source, |slice| { slice[0] += 1; true }), 2);
    assert_eq!(source.values, vec![vec![4], vec![5]]);
    assert_eq!(source.polls, 3);
}`;

const selectReportsSolution = `${sliceLenderApi}

fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    let mut reports = Vec::new();
    while let Some(item) = lender.next() {
        let slice = item.as_ref();
        if !slice.is_empty() {
            if let Some(report) = choose(slice) { reports.push(report); }
        }
    }
    reports
}`;

const selectReportsStarter = `${sliceLenderApi}

fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    Vec::new()
}`;

const selectReportsTests = `struct Rows<T> { rows: Vec<Vec<T>>, position: usize, polls: usize }
impl<T> SliceLender<T> for Rows<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls += 1; let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) }
}
struct Wrapped<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapped<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapped<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedRows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for WrappedRows<T> {
    type Item<'a> = Wrapped<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(Wrapped(row.as_mut_slice())) }
}

#[test]
fn selects_owned_reports_for_nonempty_items_only() {
    let mut rows = Rows { rows: vec![vec![], vec![1, 2], vec![3], vec![4]], position: 0, polls: 0 };
    let mut calls = 0;
    let reports: Vec<String> = select_reports(&mut rows, |slice| { calls += 1; if slice[0] == 3 { None } else { Some(format!("r{}:{}", calls, slice.len())) } });
    assert_eq!(reports, vec!["r1:2", "r3:1"]);
    assert_eq!(calls, 3);
    assert_eq!(rows.polls, 5);
    let owner = String::from("lokal");
    struct Record<'a> { text: &'a str, mark: usize }
    let mut wrapped = WrappedRows { rows: vec![vec![Record { text: owner.as_str(), mark: 0 }]], position: 0 };
    struct Report<'ctx> { context: &'ctx str, text: String, mark: usize }
    let context = String::from("kontekst");
    let prefix = String::from("raport");
    let owned: Vec<Report<'_>> = select_reports(&mut wrapped, |slice| Some(Report { context: context.as_str(), text: format!("{}:{}", prefix, slice[0].text), mark: slice[0].mark + 1 }));
    assert_eq!(owned.len(), 1);
    assert_eq!(owned[0].text, "raport:lokal");
    assert_eq!(owned[0].mark, 1);
    drop(wrapped);
    drop(owner);
    assert_eq!(owned[0].context, "kontekst");
}`;

const ownedSummariesSolution = `use std::marker::PhantomData;

${sliceLenderApi}

#[derive(Debug, PartialEq, Eq)]
struct WindowSummary { index: usize, len: usize }

struct OwnedSummaries<L, T> {
    source: L,
    index: usize,
    done: bool,
    marker: PhantomData<fn() -> T>,
}

impl<L, T> OwnedSummaries<L, T> where L: SliceLender<T> {
    fn new(source: L) -> Self { Self { source, index: 0, done: false, marker: PhantomData } }
}

impl<L, T> Iterator for OwnedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        match self.source.next() {
            Some(item) => {
                let summary = WindowSummary { index: self.index, len: item.as_ref().len() };
                self.index = self.index.saturating_add(1);
                Some(summary)
            }
            None => { self.done = true; None }
        }
    }
}`;

const ownedSummariesStarter = ownedSummariesSolution.replace(
  "match self.source.next() {\n            Some(item) => {\n                let summary = WindowSummary { index: self.index, len: item.as_ref().len() };\n                self.index = self.index.saturating_add(1);\n                Some(summary)\n            }\n            None => { self.done = true; None }\n        }",
  "None",
);

const ownedSummariesTests = `struct Counting { rows: Vec<Vec<usize>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Counting {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get() + 1); let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) }
}
struct Scripted { items: Vec<Option<Vec<usize>>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Scripted {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        self.polls.set(self.polls.get() + 1);
        let entry = self.items.get_mut(self.position)?;
        self.position += 1;
        match entry { Some(values) => Some(values.as_mut_slice()), None => None }
    }
}

struct LocalRecord<'a> { text: &'a str }
struct BorrowedRows<'d> { rows: Vec<Vec<LocalRecord<'d>>>, position: usize }
impl<'d> SliceLender<LocalRecord<'d>> for BorrowedRows<'d> {
    type Item<'a> = &'a mut [LocalRecord<'d>] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) }
}
struct Wrapped<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapped<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapped<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedRows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for WrappedRows<T> {
    type Item<'a> = Wrapped<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(Wrapped(row.as_mut_slice())) }
}

#[test]
fn construction_is_lazy_and_each_next_polls_once_for_owned_reports() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut adapter = OwnedSummaries::new(Counting { rows: vec![vec![], vec![1, 2], vec![3]], position: 0, polls: polls.clone() });
    assert_eq!(polls.get(), 0);
    assert_eq!(adapter.next(), Some(WindowSummary { index: 0, len: 0 }));
    assert_eq!(polls.get(), 1);
    let first = adapter.next().unwrap();
    assert_eq!(first.index, 1);
    assert_eq!(first.len, 2);
    assert_eq!(polls.get(), 2);
    let rest: Vec<_> = (&mut adapter).collect();
    assert_eq!(rest, vec![WindowSummary { index: 2, len: 1 }]);
    assert_eq!(polls.get(), 4);
    assert_eq!(adapter.next(), None);
    assert_eq!(polls.get(), 4);
}

#[test]
fn none_is_terminal_even_when_a_non_fused_source_would_resume() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut adapter = OwnedSummaries::new(Scripted { items: vec![None, Some(vec![9])], position: 0, polls: polls.clone() });
    assert_eq!(adapter.next(), None);
    assert_eq!(adapter.next(), None);
    assert_eq!(polls.get(), 1);
}

#[test]
fn reports_are_owned_across_calls_and_local_borrowed_wrappers() {
    let owner = String::from("żółć");
    let mut adapter = OwnedSummaries::new(BorrowedRows { rows: vec![vec![LocalRecord { text: owner.as_str() }], vec![]], position: 0 });
    let first = adapter.next().unwrap();
    assert_eq!(first.index, 0);
    assert_eq!(first.len, 1);
    let second = adapter.next().unwrap();
    assert_eq!(second.index, 1);
    assert_eq!(second.len, 0);
    drop(adapter);
    drop(owner);
    assert_eq!(first.index, 0);
    assert_eq!(first.len, 1);
    let owner2 = String::from("x");
    let mut wrapped = OwnedSummaries::new(WrappedRows { rows: vec![vec![LocalRecord { text: owner2.as_str() }]], position: 0 });
    let wrapped_report = wrapped.next().unwrap();
    assert_eq!(wrapped_report.index, 0);
    assert_eq!(wrapped_report.len, 1);
    drop(wrapped);
    drop(owner2);
}`;

const nonEmptySummariesSolution = `use std::marker::PhantomData;

${sliceLenderApi}

// The blank contract does not require Debug or comparison derives.
struct WindowSummary { index: usize, len: usize }
struct NonEmptySummaries<L, T> { source: L, index: usize, done: bool, marker: PhantomData<fn() -> T> }
impl<L, T> NonEmptySummaries<L, T> where L: SliceLender<T> {
    fn new(source: L) -> Self { Self { source, index: 0, done: false, marker: PhantomData } }
}
impl<L, T> Iterator for NonEmptySummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        loop {
            match self.source.next() {
                Some(item) => {
                    let index = self.index;
                    self.index = self.index.saturating_add(1);
                    let len = item.as_ref().len();
                    if len > 0 { return Some(WindowSummary { index, len }); }
                }
                None => { self.done = true; return None; }
            }
        }
    }
}`;

const nonEmptySummariesTests = `struct Counting { rows: Vec<Vec<usize>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Counting {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get()+1); let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) }
}
struct Scripted { items: Vec<Option<Vec<usize>>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Scripted {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get()+1); let item = self.items.get_mut(self.position)?; self.position += 1; match item { Some(values) => Some(values.as_mut_slice()), None => None } }
}

struct Wrapper<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapper<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapper<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedRows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for WrappedRows<T> {
    type Item<'a> = Wrapper<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(Wrapper(row.as_mut_slice())) }
}

#[test]
fn skips_empty_items_but_keeps_source_ordinals_and_is_lazy() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut adapter = NonEmptySummaries::new(Counting { rows: vec![vec![], vec![1, 2], vec![], vec![3]], position: 0, polls: polls.clone() });
    assert_eq!(polls.get(), 0);
    let first = adapter.next().unwrap();
    assert_eq!(first.index, 1);
    assert_eq!(first.len, 2);
    assert_eq!(polls.get(), 2);
    let second = adapter.next().unwrap();
    assert_eq!(second.index, 3);
    assert_eq!(second.len, 1);
    assert_eq!(polls.get(), 4);
    assert!(adapter.next().is_none());
    assert_eq!(polls.get(), 5);
    assert!(adapter.next().is_none());
    assert_eq!(polls.get(), 5);
}

#[test]
fn all_empty_and_empty_sources_are_terminal() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut all_empty = NonEmptySummaries::new(Counting { rows: vec![vec![], vec![]], position: 0, polls: polls.clone() });
    assert!(all_empty.next().is_none());
    assert_eq!(polls.get(), 3);
    assert!(all_empty.next().is_none());
    assert_eq!(polls.get(), 3);
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut empty = NonEmptySummaries::new(Counting { rows: vec![], position: 0, polls: polls.clone() });
    assert!(empty.next().is_none());
    assert!(empty.next().is_none());
    assert_eq!(polls.get(), 1);
}

#[test]
fn accepts_local_non_copy_records_through_a_custom_wrapper() {
    let owner = String::from("lokal");
    struct Record<'a> { text: &'a str }
    let mut adapter = NonEmptySummaries::new(WrappedRows { rows: vec![vec![], vec![Record { text: owner.as_str() }]], position: 0 });
    let report = adapter.next().unwrap();
    assert_eq!(report.index, 1);
    assert_eq!(report.len, 1);
    assert!(adapter.next().is_none());
    drop(adapter);
    drop(owner);
    assert_eq!(report.index, 1);
    assert_eq!(report.len, 1);
}

#[test]
fn none_then_some_source_is_sealed_without_extra_poll() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut adapter = NonEmptySummaries::new(Scripted { items: vec![None, Some(vec![9])], position: 0, polls: polls.clone() });
    assert!(adapter.next().is_none());
    assert!(adapter.next().is_none());
    assert_eq!(polls.get(), 1);
}`;

const cappedSummariesSolution = `use std::marker::PhantomData;

${sliceLenderApi}

#[derive(Debug, PartialEq, Eq)]
struct WindowSummary { index: usize, len: usize }
struct CappedSummaries<L, T> { source: L, maximum: usize, index: usize, done: bool, marker: PhantomData<fn() -> T> }
impl<L, T> CappedSummaries<L, T> where L: SliceLender<T> {
    fn new(source: L, maximum: usize) -> Self { Self { source, maximum, index: 0, done: false, marker: PhantomData } }
}
impl<L, T> Iterator for CappedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        match self.source.next() {
            Some(item) => {
                let index = self.index;
                self.index = self.index.saturating_add(1);
                let len = item.as_ref().len();
                if len > self.maximum { self.done = true; None } else { Some(WindowSummary { index, len }) }
            }
            None => { self.done = true; None }
        }
    }
}`;

const cappedSummariesStarter = cappedSummariesSolution.replace(
  "match self.source.next() {\n            Some(item) => {\n                let index = self.index;\n                self.index = self.index.saturating_add(1);\n                let len = item.as_ref().len();\n                if len > self.maximum { self.done = true; None } else { Some(WindowSummary { index, len }) }\n            }\n            None => { self.done = true; None }\n        }",
  "None",
);

const cappedSummariesTests = `struct Source { rows: Vec<Vec<usize>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Source {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get()+1); let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) }
}

struct Scripted { items: Vec<Option<Vec<usize>>>, position: usize, polls: std::rc::Rc<std::cell::Cell<usize>> }
impl SliceLender<usize> for Scripted {
    type Item<'a> = &'a mut [usize] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get()+1); let item = self.items.get_mut(self.position)?; self.position += 1; match item { Some(values) => Some(values.as_mut_slice()), None => None } }
}
struct Wrapper<'a, T>(&'a mut [T]);
impl<T> AsRef<[T]> for Wrapper<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
impl<T> AsMut<[T]> for Wrapper<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
struct WrappedRows<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> SliceLender<T> for WrappedRows<T> {
    type Item<'a> = Wrapper<'a, T> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(Wrapper(row.as_mut_slice())) }
}

#[test]
fn yields_through_the_limit_and_stops_at_first_oversize() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let source = Source { rows: vec![vec![], vec![1, 2], vec![3, 4, 5], vec![6]], position: 0, polls: polls.clone() };
    let mut adapter = CappedSummaries::new(source, 2);
    assert_eq!(polls.get(), 0);
    assert_eq!(adapter.next(), Some(WindowSummary { index: 0, len: 0 }));
    assert_eq!(polls.get(), 1);
    assert_eq!(adapter.next(), Some(WindowSummary { index: 1, len: 2 }));
    assert_eq!(polls.get(), 2);
    assert_eq!(adapter.next(), None);
    assert_eq!(polls.get(), 3);
    assert_eq!(adapter.next(), None);
    assert_eq!(polls.get(), 3);
    let partial_polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut partial = CappedSummaries::new(Source { rows: vec![vec![9]], position: 0, polls: partial_polls.clone() }, 2);
    assert_eq!(partial_polls.get(), 0);
    let partial_report = partial.next().unwrap();
    assert_eq!(partial_polls.get(), 1);
    drop(partial);
    assert_eq!(partial_polls.get(), 1);
    assert_eq!(partial_report.index, 0);
    assert_eq!(partial_report.len, 1);
}

#[test]
fn maximum_zero_allows_empty_items_but_not_nonempty_ones() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut adapter = CappedSummaries::new(Source { rows: vec![vec![], vec![1]], position: 0, polls: polls.clone() }, 0);
    let empty = adapter.next().unwrap();
    assert_eq!(empty.index, 0);
    assert_eq!(empty.len, 0);
    assert!(adapter.next().is_none());
    assert!(adapter.next().is_none());
    assert_eq!(polls.get(), 2);
}

#[test]
fn handles_oversize_first_absent_and_normal_terminal_none() {
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut first = CappedSummaries::new(Source { rows: vec![vec![1, 2, 3], vec![4]], position: 0, polls: polls.clone() }, 2);
    assert!(first.next().is_none());
    assert!(first.next().is_none());
    assert_eq!(polls.get(), 1);
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut absent = CappedSummaries::new(Source { rows: vec![vec![], vec![1]], position: 0, polls: polls.clone() }, 4);
    let first = absent.next().unwrap();
    assert_eq!(first.index, 0);
    assert_eq!(first.len, 0);
    let second = absent.next().unwrap();
    assert_eq!(second.index, 1);
    assert_eq!(second.len, 1);
    assert!(absent.next().is_none());
    assert!(absent.next().is_none());
    assert_eq!(polls.get(), 3);
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut normal = CappedSummaries::new(Source { rows: vec![], position: 0, polls: polls.clone() }, 0);
    assert!(normal.next().is_none());
    assert!(normal.next().is_none());
    assert_eq!(polls.get(), 1);
    let owner = String::from("lokal");
    struct Record<'a> { text: &'a str }
    let mut local = CappedSummaries::new(WrappedRows { rows: vec![vec![Record { text: owner.as_str() }]], position: 0 }, 1);
    let report = local.next().unwrap();
    assert_eq!(report.index, 0);
    assert_eq!(report.len, 1);
    assert!(local.next().is_none());
    drop(local);
    drop(owner);
    assert_eq!(report.index, 0);
    assert_eq!(report.len, 1);
    let polls = std::rc::Rc::new(std::cell::Cell::new(0));
    let mut non_fused = CappedSummaries::new(Scripted { items: vec![None, Some(vec![8])], position: 0, polls: polls.clone() }, 2);
    assert!(non_fused.next().is_none());
    assert!(non_fused.next().is_none());
    assert_eq!(polls.get(), 1);
}`;

function choice(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: number,
  answers: [string, string, string],
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
        explanations.map((text, index) => [String(index), text]),
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

function observe(
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

function gate(
  id: string,
  kind: "modify" | "blank",
  title: string,
  prompt: string,
  code: string | undefined,
  solution: string | undefined,
  tests: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(code === undefined ? {} : { code }),
    ...(solution === undefined ? {} : { solution }),
    evaluator: { kind: "tests", tests },
    expectedStatus: "success",
    evidenceKind: kind === "blank" ? "assessment" : "transfer",
    evidenceGate: true,
    hints: [
      "Zakończ bieżącą pożyczkę przed następnym next i przechowuj wyłącznie własny wynik.",
      "Sprawdź, czy bound możliwości jest zapisany w deklaracji Item<'a>.",
    ],
  };
}

const capabilityObservationOutput = `fn main() {
    trait SliceLender<T> {
        type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
        fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
    }
    struct Wrapper<'a, T>(&'a mut [T]);
    impl<T> AsRef<[T]> for Wrapper<'_, T> { fn as_ref(&self) -> &[T] { self.0 } }
    impl<T> AsMut<[T]> for Wrapper<'_, T> { fn as_mut(&mut self) -> &mut [T] { self.0 } }
    struct One<T>(Vec<T>);
    impl<T> SliceLender<T> for One<T> {
        type Item<'a> = Wrapper<'a, T> where Self: 'a;
        fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { Some(Wrapper(self.0.as_mut_slice())) }
    }
    struct Record<'a> { text: &'a str, seen: usize }
    let owner = String::from("żółć");
    let mut lender = One(vec![Record { text: owner.as_str(), seen: 0 }]);
    let item = lender.next().unwrap();
    println!("{}:{}", item.as_ref()[0].text, item.as_ref()[0].seen);
}`;

const adapterObservation = `use std::cell::Cell;
use std::rc::Rc;

trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
struct Record<'a> { text: &'a str }
struct Source<'a> { values: Vec<Vec<Record<'a>>>, pos: usize, polls: Rc<Cell<usize>> }
impl<'d> SliceLender<Record<'d>> for Source<'d> { type Item<'a> = &'a mut [Record<'d>] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { self.polls.set(self.polls.get()+1); let value = self.values.get_mut(self.pos)?; self.pos += 1; Some(value.as_mut_slice()) } }
#[derive(Debug, PartialEq, Eq)] struct WindowSummary { index: usize, len: usize }
struct OwnedSummaries<L, T> { source: L, index: usize, done: bool, marker: std::marker::PhantomData<fn() -> T> }
impl<L, T> OwnedSummaries<L, T> where L: SliceLender<T> { fn new(source: L) -> Self { Self { source, index: 0, done: false, marker: std::marker::PhantomData } } }
impl<L, T> Iterator for OwnedSummaries<L, T> where L: SliceLender<T> { type Item = WindowSummary; fn next(&mut self) -> Option<Self::Item> { if self.done { return None; } match self.source.next() { Some(item) => { let out = WindowSummary { index: self.index, len: item.as_ref().len() }; self.index = self.index.saturating_add(1); Some(out) }, None => { self.done = true; None } } } }
fn main() { let polls = Rc::new(Cell::new(0)); let owner = String::from("lokal"); let source = Source { values: vec![vec![Record { text: owner.as_str() }], vec![]], pos: 0, polls: polls.clone() }; let mut adapter = OwnedSummaries::new(source); println!("{}", polls.get()); let first = adapter.next().unwrap(); println!("{}", polls.get()); let second = adapter.next().unwrap(); println!("{}", polls.get()); let _ = second; let _ = (&mut adapter).count(); println!("{}", polls.get()); drop(adapter); drop(owner); println!("{}:{}", first.index, first.len); }`;

const dynObservation = `trait LendingIterator { type Item<'a> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
fn needs_dyn(_: &mut dyn LendingIterator<Item<'static> = &'static str>) {}
fn main() {}`;

const dynObservationSolution = `trait StringLender { fn next_strings(&mut self) -> Option<&mut [String]>; }
struct Rows { rows: Vec<Vec<String>>, position: usize }
impl StringLender for Rows { fn next_strings(&mut self) -> Option<&mut [String]> { let row = self.rows.get_mut(self.position)?; self.position += 1; Some(row.as_mut_slice()) } }
fn needs_dyn(lender: &mut dyn StringLender) { let _ = lender.next_strings(); }
fn main() { let mut rows = Rows { rows: vec![vec![String::from("ok")]], position: 0 }; needs_dyn(&mut rows); }`;

const capabilityHrtbObservation = `trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
fn use_projection<L, T>(lender: &mut L) where L: SliceLender<T>, for<'a> L::Item<'a>: AsRef<[T]> { let _ = lender.next(); }
struct Local<'d>(&'d mut [i32]);
impl SliceLender<i32> for Local<'_> { type Item<'a> = &'a mut [i32] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { Some(self.0) } }
fn main() { let mut data = [1,2]; let mut local = Local(&mut data); use_projection(&mut local); }`;

const capabilityHrtbObservationSolution = `trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
fn use_declared_capability<L, T>(lender: &mut L) where L: SliceLender<T> { let _ = lender.next(); }
struct Local<'d>(&'d mut [i32]);
impl SliceLender<i32> for Local<'_> { type Item<'a> = &'a mut [i32] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { Some(self.0) } }
fn main() { let mut data = [1,2]; let mut local = Local(&mut data); use_declared_capability(&mut local); }`;

export const gatConsumerLessons: Lesson[] = [
  {
    id: "gat-item-capabilities",
    moduleId: "gat-lending-iterators",
    conceptIds: ["gat-item-capabilities"],
    competencyIds: ["use-declared-gat-capabilities", "stop-lending-consumers"],
    prerequisites: ["gat-overlapping-mutable-windows"],
    title: "Możliwości elementu zapisane w GAT",
    subtitle:
      "Deklarujesz zdolności rodziny elementów i kończysz pożyczkę w callbacku.",
    minutes: 24,
    outcomes: [
      "Zapiszesz AsRef i AsMut przy Item<'a>.",
      "Zbudujesz eager consumer z callbackiem FnMut.",
      "Rozpoznasz ograniczenie zewnętrznego projection HRTB bez uogólniania go na wszystkie HRTB.",
    ],
    steps: [
      choice(
        "gat-item-capabilities-predict",
        "predict",
        "Przewidź miejsce boundu",
        "Gdzie powinien znaleźć się kontrakt AsRef<[T]> + AsMut<[T]>, aby każdy element SliceLender miał te możliwości?",
        1,
        [
          "Tylko przy parametrze callbacku",
          "Przy deklaracji type Item<'a> w wyspecjalizowanym trait",
          "W osobnym Clone boundzie na T",
        ],
        [
          "Callback nie opisuje rodzinnego typu elementu.",
          "Deklaracja SliceLender zawęża każdą implementację w jednym miejscu.",
          "Clone nie daje dostępu do slice capabilities.",
        ],
      ),
      observe(
        "gat-item-capabilities-hrtb",
        "Zobacz zmierzoną granicę projection HRTB",
        "Ten świadomie wąski przykład próbuje dołożyć AsRef jako zewnętrzny bound projekcji. Uruchom go i zapamiętaj rzeczywisty kod diagnostyki; nie wyciągaj z niego wniosku, że każdy HRTB wymaga 'static.",
        capabilityHrtbObservation,
        capabilityHrtbObservationSolution,
        "E0597",
      ),
      run(
        "gat-item-capabilities-observation",
        "Uruchom wyspecjalizowany trait",
        "Deklaracja przechodzi z lokalnym tekstem pożyczonym na krótko. Bound capabilities jest częścią API, a wynik nadal kończy się przed kolejnym poll.",
        capabilityObservationOutput,
        "żółć:0\n",
      ),
      choice(
        "gat-item-capabilities-explain",
        "explain",
        "Węższy kontrakt konsumenta",
        "Co daje deklaracja SliceLender<T> w porównaniu z wcześniejszym LendingIterator?",
        0,
        [
          "Gwarantuje AsRef i AsMut dla każdej rodziny Item, lecz nie twierdzi, że każdy GAT jest slice'em",
          "Sprawia, że każda pożyczka ma 'static",
          "Pozwala trzymać dwa &mut item jednocześnie",
        ],
        [
          "To dokładnie zawężenie możliwości zapisane przy associated type.",
          "where Self: 'a wiąże wynik z receiver borrow, nie z 'static.",
          "Kolejny poll nadal wymaga zakończenia bieżącej pożyczki.",
        ],
      ),
      gate(
        "gat-item-capabilities-gate",
        "modify",
        "Odwiedź i zmień każdy element",
        "Zaimplementuj mutate_and_count. Odpytuj lender aż do None. Dla każdej wartości Some wywołaj visit dokładnie raz z item.as_mut(), zachowaj zwrócone usize w Vec w kolejności i zakończ pożyczkę przed następnym poll. Puste slice też są odwiedzane. Nie dodawaj Clone ani 'static.",
        mutateAndCountStarter,
        mutateAndCountSolution,
        mutateAndCountTests,
      ),
      gate(
        "gat-item-capabilities-blank",
        "blank",
        "Zatrzymaj wizytę bez dodatkowego pollu",
        "Od pustej kartki napisz generyczną funkcję `visit_until` z typami `L`, `T` i `F`, argumentami `lender: &mut L` oraz `visit: F`, wynikiem `usize`, boundem `L: SliceLender<T>` i callbackiem `F: FnMut(&mut [T]) -> bool`. W rozwiązaniu zdefiniuj pełny trait `SliceLender<T>` z rodzinnym `Item<'a>` ograniczonym przez `AsRef<[T]> + AsMut<[T]>` oraz `where Self: 'a`; nie ma ukrytego traitu. Metoda `next` pożycza odbiorcę mutowalnie na lifetime `'a` i zwraca `Option<Self::Item<'a>>` związane z tą samą pożyczką. Pobieraj elementy w kolejności i dla każdego `Some(item)` wywołaj callback dokładnie raz z `item.as_mut()`, zwiększ wynik o jeden niezależnie od bool. `true` oznacza dalszą wizytę, pierwsze `false` natychmiast zatrzymuje funkcję bez kolejnego pytania źródła; wcześniejsze `None` zwraca dotychczasową liczbę. Drugie wywołanie z tym samym źródłem ma zacząć po elemencie zatrzymującym. Zmiany callbacku pozostają w danych. Nie dodawaj Clone, 'static ani innych boundów i nie przechowuj pożyczonego itemu.",
        undefined,
        visitUntilSolution,
        visitUntilTests,
      ),
      choice(
        "gat-item-capabilities-recall",
        "recall",
        "Przypomnij granicę",
        "Co musi zrobić visit_until po callbacku zwracającym false?",
        2,
        [
          "Odpytać źródło jeszcze raz, aby sprawdzić, czy nie ma elementu",
          "Zresetować źródło przed zwróceniem wyniku",
          "Zakończyć callback, pożyczkę i funkcję bez dodatkowego pollu",
        ],
        [
          "Dodatkowy poll łamie kontrakt stop.",
          "Źródło zachowuje pozycję na przyszłe wznowienie.",
          "Wynik jest własny, a bieżący item może zostać zwolniony.",
        ],
      ),
    ],
    misconceptions: [
      "Bound projekcji dopisany na zewnątrz jest równoważny deklaracji możliwości w GAT na każdym compilerze.",
      "Każdy GAT automatycznie zwraca referencję do właściciela.",
      "Callback może zachować item po powrocie funkcji.",
      "false oznacza, że trzeba najpierw pobrać następny element.",
    ],
    transferTask:
      "Zaimplementuj consumer, który wybiera własne raporty z niepustych itemów i nie wymaga Clone ani 'static.",
    evidenceGate:
      "Przejście primary i source-free blank sprawdza capability bound, mutację, stop/resume i dokładną liczbę polli.",
    sourceIds: [
      "gat-reference-trait-bounds",
      "gat-reference-dyn-compatibility",
    ],
  },
  {
    id: "gat-owned-iterator-adapters",
    moduleId: "gat-lending-iterators",
    conceptIds: ["gat-owned-iterator-adapters"],
    competencyIds: ["adapt-lending-to-owned-results"],
    prerequisites: ["gat-item-capabilities"],
    title: "Adapter kończący pożyczkę i oddający własność",
    subtitle: "Przekształcasz krótkie pożyczki w leniwe, własne podsumowania.",
    minutes: 24,
    outcomes: [
      "Rozdzielisz zwykły Iterator od źródła z rodzinnym Item.",
      "Udowodnisz leniwość przez licznik polli.",
      "Zastosujesz saturating_add i terminalny stan adaptera.",
    ],
    steps: [
      choice(
        "gat-owned-iterator-adapters-predict",
        "predict",
        "Przewidź pracę konstruktora",
        "Ile razy OwnedSummaries::new powinno odpytac źródło?",
        0,
        [
          "Zero",
          "Raz, aby poznać długość pierwszego itemu",
          "Tyle razy, ile wynosi liczba wyników",
        ],
        [
          "Konstrukcja przechowuje źródło i liczniki; pierwszy poll należy do next.",
          "To złamałoby leniwość i zgubiło pierwszy item.",
          "Adapter zwykłego Iteratora nadal pobiera po jednym itemie.",
        ],
      ),
      run(
        "gat-owned-iterator-adapters-observation",
        "Zmierz leniwe podsumowania",
        "Przed konstrukcją licznik wynosi zero. Każde next pobiera najwyżej jeden item i oddaje posiadający raport.",
        adapterObservation,
        "0\n1\n2\n3\n0:1\n",
      ),
      observe(
        "gat-owned-iterator-adapters-dyn",
        "Zobacz E0038 dla tego GAT",
        "LendingIterator z rodzinnym associated type nie spełnia obecnej granicy dyn compatibility. To obserwacja konkretnego API; nie każdy trait z metodą lifetime ma ten problem.",
        dynObservation,
        dynObservationSolution,
        "E0038",
      ),
      choice(
        "gat-owned-iterator-adapters-explain",
        "explain",
        "Gdzie kończy się pożyczka?",
        "Dlaczego zwykły Iterator może oddać WindowSummary, choć źródło zwraca pożyczony item?",
        1,
        [
          "Bo WindowSummary ukrywa pożyczkę przez Clone",
          "Bo długość jest odczytana wewnątrz next, a zwracana wartość nie zawiera slice'a",
          "Bo GAT oznacza, że każdy raport jest 'static",
        ],
        [
          "Clone nie jest wymagany przez kontrakt.",
          "Loan kończy się przed zwróceniem własnego raportu.",
          "Własność raportu wynika z jego pól usize, nie z GAT.",
        ],
      ),
      gate(
        "gat-owned-iterator-adapters-gate",
        "modify",
        "Oddaj własne raporty leniwe",
        "Zaimplementuj `OwnedSummaries<L, T>` zgodnie z pokazanym publicznym kształtem, `WindowSummary { index, len }` i boundem `L: SliceLender<T>`. `new` nie może odpytować źródła. Jedno `next` odpytuje najwyżej raz; dla Some zapisz ordinal wszystkich wcześniejszych Some (także pustych) oraz długość itemu, zwolnij pożyczkę i oddaj własny raport. Zwiększ ordinal przez `saturating_add(1)`. None ustawia stan terminalny, a późniejsze next nie odpytują źródła. Nie używaj Clone ani 'static.",
        ownedSummariesStarter,
        ownedSummariesSolution,
        ownedSummariesTests,
      ),
      gate(
        "gat-owned-iterator-adapters-blank",
        "blank",
        "Filtruj puste itemy w leniwym adapterze",
        "Od pustej kartki napisz `NonEmptySummaries<L, T>` z prywatnym źródłem `L: SliceLender<T>`. Konstruktor `new(source: L)` ma przyjąć źródło i zwrócić `NonEmptySummaries<L, T>`, bez odpytania go; następnie zaimplementuj zwykły `Iterator<Item = WindowSummary>`. Zdefiniuj pełny trait `SliceLender<T>` z `Item<'a>` ograniczonym przez `AsRef<[T]> + AsMut<[T]>` i `where Self: 'a`; jego `next` pożycza odbiorcę mutowalnie na `'a` i zwraca `Option<Self::Item<'a>>` związane z tą samą pożyczką. Zdefiniuj `WindowSummary` z polami `index` i `len`, oba `usize`. W `next` pytaj tak długo, aż znajdziesz niepusty item albo None. Każdy Some, także zwracany niepusty item, zwiększa ordinal przez `saturating_add(1)`; pusty item pomiń, a dla niepustego zwróć `{ index, len }`, gdzie index obejmuje wszystkie wcześniejsze Some, a len jest długością zwracanego niepustego itemu. Po None ustaw stan terminalny: kolejne next nie mogą już odpytować źródła. Jedno wywołanie może wykonać wiele polli, ale po wyniku nie wykonuje dalszej pracy. Nie zwracaj slice'a, nie używaj Clone ani 'static.",
        undefined,
        nonEmptySummariesSolution,
        nonEmptySummariesTests,
      ),
      choice(
        "gat-owned-iterator-adapters-recall",
        "recall",
        "Przypomnij terminalność",
        "Co dzieje się po pierwszym None w OwnedSummaries?",
        0,
        [
          "Adapter zapamiętuje done i każde kolejne next zwraca None bez pollu",
          "Adapter resetuje ordinal i próbuje źródło ponownie",
          "Adapter pobiera jeszcze jeden item, aby potwierdzić None",
        ],
        [
          "To konkretna gwarancja adaptera, silniejsza niż sam trait źródła.",
          "Reset zniszczyłby kolejność i kontrakt terminalny.",
          "Dodatkowe odpytanie łamie ustaloną politykę.",
        ],
      ),
    ],
    misconceptions: [
      "Adapter może odpytac źródło w new, bo wynik i tak będzie leniwy.",
      "Pusty item nie ma ordinalu źródłowego.",
      "Zwykły Iterator nie może zwrócić zewnętrznego slice'a, choć może zwrócić slice, którego lifetime podąża za bieżącą pożyczką adaptera.",
      "Każde źródło po None musi samo być fused.",
    ],
    transferTask:
      "Zaprojektuj adapter z inną polityką granicy, który oddaje własne raporty i zatrzymuje się przy pierwszym zbyt dużym itemie.",
    evidenceGate:
      "Przejście primary i source-free blank sprawdza leniwość, owned reports, ordinale, puste itemy i terminalne zatrzymanie.",
    sourceIds: [
      "gat-iterator",
      "gat-reference-trait-bounds",
      "gat-reference-dyn-compatibility",
      "gat-error-e0038",
    ],
  },
];

export const gatConsumerReviewExercises: Record<string, LessonStep> = {
  "gat-item-capabilities": {
    id: "gat-item-capabilities-review",
    kind: "modify",
    title: "Wybierz własne raporty",
    prompt:
      "Zaimplementuj select_reports zgodnie z pełnym kontraktem: odpytuj każde źródło do None, zużywaj także puste itemy lecz nie wywołuj dla nich choose, dla każdego niepustego itemu wywołaj choose(&[T]) dokładnie raz, pomiń None raportu i zachowaj kolejność własnych R. Użyj SliceLender z capabilities w deklaracji, nie dodawaj Clone ani 'static.",
    code: selectReportsStarter,
    solution: selectReportsSolution,
    evaluator: { kind: "tests", tests: selectReportsTests },
    expectedStatus: "success",
    evidenceKind: "assessment",
  },
  "gat-owned-iterator-adapters": {
    id: "gat-owned-iterator-adapters-review",
    kind: "modify",
    title: "Zakończ po pierwszym zbyt dużym itemie",
    prompt:
      "Zaimplementuj CappedSummaries z prywatnym źródłem, new(source, maximum) i zwykłym Iterator<Item = WindowSummary>. Każde next odpytuje najwyżej raz, zachowuje ordinal każdego Some przez saturating_add(1), zwraca puste i krótkie itemy, a pierwszy item dłuższy niż maximum zużywa i natychmiast kończy adapter bez dalszych polli. None także jest terminalne.",
    code: cappedSummariesStarter,
    solution: cappedSummariesSolution,
    evaluator: { kind: "tests", tests: cappedSummariesTests },
    expectedStatus: "success",
    evidenceKind: "assessment",
  },
};
