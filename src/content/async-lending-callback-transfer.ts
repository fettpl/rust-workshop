import type { LessonStep } from "../domain/types";

// Pure source fixtures: no runtime registry or assessment imports.
type TransferMutant = { id: string; source: string; testName: string };
type TransferBoundary = {
  id: string;
  failSuffix: string;
  passSuffix: string;
  passTestName: string;
  diagnosticCodes: readonly string[];
};

const callbackTransferTests = `use std::cell::{Cell, RefCell};
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::task::{Context, Poll, Wake, Waker};

#[derive(Default)]
struct WakeCount(AtomicUsize);
impl Wake for WakeCount {
    fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
    fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
}
fn context_waker() -> (Arc<WakeCount>, Waker) {
    let count = Arc::new(WakeCount::default());
    let waker = Waker::from(count.clone());
    (count, waker)
}
// For callbacks with no suspension, require immediate completion. Never spin.
fn ready<F: Future>(future: F) -> F::Output {
    let (_, waker) = context_waker();
    let mut context = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    match future.as_mut().poll(&mut context) {
        Poll::Ready(value) => value,
        Poll::Pending => panic!("unexpected Pending in an immediately-ready case"),
    }
}

#[derive(Default)]
struct Gate {
    released: Cell<bool>,
    polls: Cell<usize>,
    supplied_waker: RefCell<Option<Waker>>,
}
impl Gate {
    fn release(&self) {
        self.released.set(true);
        self.supplied_waker.borrow_mut().take().expect("real Pending registered its waker").wake();
    }
}
// Both input and mutable captured-local state are borrowed until this completes.
// Rc<Gate> is deliberately !Send and holds only per-instance observations.
struct BorrowedPause<'a> {
    input: &'a [u8],
    local: &'a mut Vec<String>,
    gate: Rc<Gate>,
}
impl Future for BorrowedPause<'_> {
    type Output = String;
    fn poll(self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<String> {
        let this = self.get_mut();
        this.gate.polls.set(this.gate.polls.get() + 1);
        if !this.gate.released.get() {
            *this.gate.supplied_waker.borrow_mut() = Some(context.waker().clone());
            return Poll::Pending;
        }
        // Read borrowed input and mutate the borrowed capture after suspension.
        let owned = String::from_utf8(this.input.to_vec()).unwrap();
        this.local.push(format!("ready:{owned}"));
        Poll::Ready(owned)
    }
}

#[test]
fn zero_limit_and_empty_source_do_not_invoke_callback() {
    let mut source = ChunkSource::new(vec![b"a".to_vec()]);
    let mut callback = async |_: &[u8]| -> Result<Option<String>, ()> {
        panic!("zero/exhaustion must never invoke callback")
    };
    assert_eq!(ready(transform_up_to(&mut source, 0, &mut callback)), Ok(Chunk { consumed: 0, output: vec![] }));
    assert_eq!(source.remaining(), 1);
    let mut empty = ChunkSource::new(vec![]);
    assert_eq!(ready(transform_up_to(&mut empty, 10, &mut callback)), Ok(Chunk { consumed: 0, output: vec![] }));
    assert_eq!(empty.remaining(), 0);
}

#[test]
fn input_budget_counts_filtered_records_and_repeated_calls_resume() {
    let mut source = ChunkSource::new(vec![b"emit-a".to_vec(), b"skip".to_vec(), b"emit-c".to_vec()]);
    let mut calls = 0;
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        calls += 1;
        Ok(if input == b"skip" { None } else { Some(String::from_utf8(input.to_vec()).unwrap()) })
    };
    assert_eq!(ready(transform_up_to(&mut source, 2, &mut callback)), Ok(Chunk { consumed: 2, output: vec!["emit-a".into()] }));
    assert_eq!(source.remaining(), 1);
    assert_eq!(ready(transform_up_to(&mut source, 99, &mut callback)), Ok(Chunk { consumed: 1, output: vec!["emit-c".into()] }));
    assert_eq!(source.remaining(), 0);
    assert_eq!(ready(transform_up_to(&mut source, 1, &mut callback)), Ok(Chunk { consumed: 0, output: vec![] }));
    drop(callback);
    assert_eq!(calls, 3);
}

#[test]
fn empty_input_record_is_valid_and_owned_output_outlives_source() {
    let output = {
        let mut source = ChunkSource::new(vec![vec![], b"x".to_vec()]);
        let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> { Ok(Some(String::from_utf8(input.to_vec()).unwrap())) };
        let chunk = ready(transform_up_to(&mut source, 1, &mut callback)).unwrap();
        assert_eq!(chunk, Chunk { consumed: 1, output: vec![String::new()] });
        assert_eq!(source.remaining(), 1);
        chunk.output
    };
    assert_eq!(output, vec![String::new()]);
}

#[test]
fn local_nonsend_capture_and_input_are_borrowed_through_real_pending() {
    let mut source = ChunkSource::new(vec![b"borrowed".to_vec()]);
    let gate = Rc::new(Gate::default());
    let mut local = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        let output = BorrowedPause { input, local: &mut local, gate: gate.clone() }.await;
        Ok(Some(output))
    };
    let (wake_count, waker) = context_waker();
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(transform_up_to(&mut source, 1, &mut callback));
    assert!(matches!(operation.as_mut().poll(&mut context), Poll::Pending));
    assert_eq!(gate.polls.get(), 1, "outer poll forwards one Pending without spinning");
    assert_eq!(wake_count.0.load(Ordering::SeqCst), 0);
    assert!(gate.supplied_waker.borrow().as_ref().unwrap().will_wake(&waker));
    gate.release();
    assert_eq!(wake_count.0.load(Ordering::SeqCst), 1, "the registered supplied waker actually ran");
    assert_eq!(operation.as_mut().poll(&mut context), Poll::Ready(Ok(Chunk { consumed: 1, output: vec!["borrowed".into()] })));
    assert_eq!(gate.polls.get(), 2);
    drop(operation);
    drop(callback);
    assert_eq!(source.remaining(), 0);
    assert_eq!(local, vec!["ready:borrowed"]);
}

#[test]
fn first_error_keeps_prior_commits_and_replays_failing_record() {
    let mut source = ChunkSource::new(vec![b"a".to_vec(), b"skip".to_vec(), b"bad".to_vec(), b"c".to_vec()]);
    let visits = Rc::new(RefCell::new(Vec::new()));
    let retry_allowed = Rc::new(Cell::new(false));
    let mut callback = async |input: &[u8]| -> Result<Option<String>, &'static str> {
        visits.borrow_mut().push(input.to_vec());
        if input == b"bad" && !retry_allowed.get() { return Err("first-error"); }
        Ok(if input == b"skip" { None } else { Some(String::from_utf8(input.to_vec()).unwrap()) })
    };
    assert_eq!(ready(transform_up_to(&mut source, 99, &mut callback)), Err("first-error"));
    assert_eq!(source.remaining(), 2, "a and filtered skip committed; bad and c remain");
    assert_eq!(*visits.borrow(), vec![b"a".to_vec(), b"skip".to_vec(), b"bad".to_vec()]);
    retry_allowed.set(true);
    assert_eq!(ready(transform_up_to(&mut source, 1, &mut callback)), Ok(Chunk { consumed: 1, output: vec!["bad".into()] }));
    assert_eq!(source.remaining(), 1);
    assert_eq!(ready(transform_up_to(&mut source, 99, &mut callback)), Ok(Chunk { consumed: 1, output: vec!["c".into()] }));
    assert_eq!(source.remaining(), 0);
}

#[test]
fn dropping_pending_second_callback_keeps_current_input_and_prior_commits() {
    let mut source = ChunkSource::new(vec![b"a".to_vec(), b"b".to_vec(), b"c".to_vec()]);
    let visits = Rc::new(RefCell::new(Vec::new()));
    let gate = Rc::new(Gate::default());
    let mut local = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        visits.borrow_mut().push(input.to_vec());
        local.push(format!("start:{}", String::from_utf8_lossy(input)));
        let output = if input == b"b" {
            BorrowedPause { input, local: &mut local, gate: gate.clone() }.await
        } else { String::from_utf8(input.to_vec()).unwrap() };
        Ok(Some(output))
    };
    let (wake_count, waker) = context_waker();
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(transform_up_to(&mut source, 3, &mut callback));
    assert!(matches!(operation.as_mut().poll(&mut context), Poll::Pending));
    assert_eq!(gate.polls.get(), 1);
    assert_eq!(*visits.borrow(), vec![b"a".to_vec(), b"b".to_vec()]);
    drop(operation);
    assert_eq!(source.remaining(), 2, "a stays committed; Pending b and later c remain");
    gate.release();
    assert_eq!(wake_count.0.load(Ordering::SeqCst), 1);
    assert_eq!(ready(transform_up_to(&mut source, 1, &mut callback)), Ok(Chunk { consumed: 1, output: vec!["b".into()] }));
    assert_eq!(source.remaining(), 1);
    assert_eq!(ready(transform_up_to(&mut source, 99, &mut callback)), Ok(Chunk { consumed: 1, output: vec!["c".into()] }));
    assert_eq!(source.remaining(), 0);
    drop(callback);
    assert_eq!(*visits.borrow(), vec![b"a".to_vec(), b"b".to_vec(), b"b".to_vec(), b"c".to_vec()]);
    assert_eq!(local, vec!["start:a", "start:b", "start:b", "ready:b", "start:c"], "callback side effects from cancelled b are retained");
}

#[test]
fn all_filtered_records_still_use_input_budget() {
    let mut source = ChunkSource::new(vec![b"a".to_vec(), b"b".to_vec(), b"c".to_vec()]);
    let mut visits = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        visits.push(input.to_vec());
        Ok(None)
    };
    assert_eq!(ready(transform_up_to(&mut source, 2, &mut callback)), Ok(Chunk { consumed: 2, output: vec![] }));
    assert_eq!(source.remaining(), 1);
    drop(callback);
    assert_eq!(visits, vec![b"a".to_vec(), b"b".to_vec()]);
}

#[test]
fn opaque_bytes_and_empty_record_are_forwarded_without_interpretation() {
    let mut source = ChunkSource::new(vec![vec![0xff], vec![]]);
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        Ok(Some(format!("{}", input.len())))
    };
    assert_eq!(ready(transform_up_to(&mut source, 9, &mut callback)), Ok(Chunk { consumed: 2, output: vec!["1".into(), "0".into()] }));
    assert_eq!(source.remaining(), 0);
}
`;

const callbackTransferStarter = `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    // TODO: odwiedzaj najwyżej limit wejść; commit dopiero po Ok.
    let _ = (source, limit, transform);
    Ok(Chunk { consumed: 0, output: Vec::new() })
}
`;

const callbackTransferSolution = `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.consumed < limit {
        let Some(input) = source.records.get(source.next) else { break; };
        let transformed = transform(input).await?;
        // Błąd lub drop podczas Pending nie dociera do commit tego wejścia.
        source.next += 1;
        chunk.consumed += 1;
        if let Some(text) = transformed { chunk.output.push(text); }
    }
    Ok(chunk)
}
`;

export const callbackTransferEquivalent = `use std::collections::VecDeque;

pub struct ChunkSource { pending: VecDeque<Vec<u8>> }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { pending: records.into() } }
    pub fn remaining(&self) -> usize { self.pending.len() }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut output = Vec::new();
    let mut consumed = 0;
    for _ in 0..limit {
        let Some(input) = source.pending.front() else { break; };
        let value = transform(input).await?;
        source.pending.pop_front();
        consumed += 1;
        if let Some(text) = value { output.push(text); }
    }
    Ok(Chunk { consumed, output })
}
`;

export const callbackTransferMutants: readonly TransferMutant[] = [
  {
    id: "emitted-output-budget",
    testName: "input_budget_counts_filtered_records_and_repeated_calls_resume",
    source: `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.output.len() < limit {
        let Some(input) = source.records.get(source.next) else { break; };
        let transformed = transform(input).await?;
        // Błąd lub drop podczas Pending nie dociera do commit tego wejścia.
        source.next += 1;
        chunk.consumed += 1;
        if let Some(text) = transformed { chunk.output.push(text); }
    }
    Ok(chunk)
}
`,
  },
  {
    id: "commit-before-await",
    testName: "first_error_keeps_prior_commits_and_replays_failing_record",
    source: `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.consumed < limit {
        let Some(input) = source.records.get(source.next) else { break; };
        source.next += 1;
        let transformed = transform(input).await?;
        chunk.consumed += 1;
        if let Some(text) = transformed { chunk.output.push(text); }
    }
    Ok(chunk)
}
`,
  },
  {
    id: "skip-without-consumed-count",
    testName: "all_filtered_records_still_use_input_budget",
    source: `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.consumed < limit {
        let Some(input) = source.records.get(source.next) else { break; };
        let transformed = transform(input).await?;
        // Błąd lub drop podczas Pending nie dociera do commit tego wejścia.
        source.next += 1;
        if let Some(text) = transformed {
            chunk.consumed += 1;
            chunk.output.push(text);
        }
    }
    Ok(chunk)
}
`,
  },
  {
    id: "ignore-error-and-continue",
    testName: "first_error_keeps_prior_commits_and_replays_failing_record",
    source: `pub struct ChunkSource { records: Vec<Vec<u8>>, next: usize }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { records, next: 0 } }
    pub fn remaining(&self) -> usize { self.records.len() - self.next }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.consumed < limit {
        let Some(input) = source.records.get(source.next) else { break; };
        let transformed = match transform(input).await {
            Ok(value) => value,
            Err(_) => { source.next += 1; continue; }
        };
        // Błąd lub drop podczas Pending nie dociera do commit tego wejścia.
        source.next += 1;
        chunk.consumed += 1;
        if let Some(text) = transformed { chunk.output.push(text); }
    }
    Ok(chunk)
}
`,
  },
  {
    id: "remove-pending-input",
    testName:
      "dropping_pending_second_callback_keeps_current_input_and_prior_commits",
    source: `use std::collections::VecDeque;

pub struct ChunkSource { pending: VecDeque<Vec<u8>> }
impl ChunkSource {
    pub fn new(records: Vec<Vec<u8>>) -> Self { Self { pending: records.into() } }
    pub fn remaining(&self) -> usize { self.pending.len() }
}
#[derive(Debug, PartialEq, Eq)]
pub struct Chunk { pub consumed: usize, pub output: Vec<String> }
pub async fn transform_up_to<F, E>(
    source: &mut ChunkSource, limit: usize, transform: &mut F,
) -> Result<Chunk, E>
where F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E> {
    let mut chunk = Chunk { consumed: 0, output: Vec::new() };
    while chunk.consumed < limit {
        let Some(input) = source.pending.pop_front() else { break; };
        let transformed = match transform(&input).await {
            Ok(value) => value,
            Err(error) => { source.pending.push_front(input); return Err(error); }
        };
        chunk.consumed += 1;
        if let Some(text) = transformed { chunk.output.push(text); }
    }
    Ok(chunk)
}
`,
  },
];

export const callbackTransferBoundaries: readonly TransferBoundary[] = [
  {
    id: "local-operation-static",
    failSuffix: `
#[test]
fn callback_local_operation_static_scoped() {
    use std::cell::Cell;
    use std::future::Future;
    use std::rc::Rc;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct NoWake;
    impl Wake for NoWake { fn wake(self: Arc<Self>) {} }
    fn constrain<T: 'static>(value: T) -> T { value }
    let mut source = ChunkSource::new(vec![b"local".to_vec()]);
    let local_counter = Rc::new(Cell::new(0));
    let mut local_output = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        std::future::ready(()).await;
        local_counter.set(local_counter.get() + 1);
        local_output.push(input.to_vec());
        Ok(Some(String::from_utf8(input.to_vec()).unwrap()))
    };
    let operation = constrain(transform_up_to(&mut source, 1, &mut callback));
    let waker = Waker::from(Arc::new(NoWake));
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(operation);
    assert_eq!(operation.as_mut().poll(&mut context), Poll::Ready(Ok(Chunk { consumed: 1, output: vec!["local".into()] })));
    drop(operation);
    drop(callback);
    assert_eq!(source.remaining(), 0);
    assert_eq!(local_counter.get(), 1);
    assert_eq!(local_output, vec![b"local".to_vec()]);
}
`,
    passSuffix: `
#[test]
fn callback_local_operation_static_scoped() {
    use std::cell::Cell;
    use std::future::Future;
    use std::rc::Rc;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct NoWake;
    impl Wake for NoWake { fn wake(self: Arc<Self>) {} }
    fn constrain<T>(value: T) -> T { value }
    let mut source = ChunkSource::new(vec![b"local".to_vec()]);
    let local_counter = Rc::new(Cell::new(0));
    let mut local_output = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        std::future::ready(()).await;
        local_counter.set(local_counter.get() + 1);
        local_output.push(input.to_vec());
        Ok(Some(String::from_utf8(input.to_vec()).unwrap()))
    };
    let operation = constrain(transform_up_to(&mut source, 1, &mut callback));
    let waker = Waker::from(Arc::new(NoWake));
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(operation);
    assert_eq!(operation.as_mut().poll(&mut context), Poll::Ready(Ok(Chunk { consumed: 1, output: vec!["local".into()] })));
    drop(operation);
    drop(callback);
    assert_eq!(source.remaining(), 0);
    assert_eq!(local_counter.get(), 1);
    assert_eq!(local_output, vec![b"local".to_vec()]);
}
`,
    passTestName: "callback_local_operation_static_scoped",
    diagnosticCodes: ["E0597"],
  },
  {
    id: "local-rc-send",
    failSuffix: `
#[test]
fn callback_local_rc_send_scoped() {
    use std::cell::Cell;
    use std::future::Future;
    use std::rc::Rc;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct NoWake;
    impl Wake for NoWake { fn wake(self: Arc<Self>) {} }
    fn constrain<T: Send>(value: T) -> T { value }
    let mut source = ChunkSource::new(vec![b"local".to_vec()]);
    let local_counter = Rc::new(Cell::new(0));
    let mut local_output = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        std::future::ready(()).await;
        local_counter.set(local_counter.get() + 1);
        local_output.push(input.to_vec());
        Ok(Some(String::from_utf8(input.to_vec()).unwrap()))
    };
    let operation = constrain(transform_up_to(&mut source, 1, &mut callback));
    let waker = Waker::from(Arc::new(NoWake));
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(operation);
    assert_eq!(operation.as_mut().poll(&mut context), Poll::Ready(Ok(Chunk { consumed: 1, output: vec!["local".into()] })));
    drop(operation);
    drop(callback);
    assert_eq!(source.remaining(), 0);
    assert_eq!(local_counter.get(), 1);
    assert_eq!(local_output, vec![b"local".to_vec()]);
}
`,
    passSuffix: `
#[test]
fn callback_local_rc_send_scoped() {
    use std::cell::Cell;
    use std::future::Future;
    use std::rc::Rc;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct NoWake;
    impl Wake for NoWake { fn wake(self: Arc<Self>) {} }
    fn constrain<T>(value: T) -> T { value }
    let mut source = ChunkSource::new(vec![b"local".to_vec()]);
    let local_counter = Rc::new(Cell::new(0));
    let mut local_output = Vec::new();
    let mut callback = async |input: &[u8]| -> Result<Option<String>, ()> {
        std::future::ready(()).await;
        local_counter.set(local_counter.get() + 1);
        local_output.push(input.to_vec());
        Ok(Some(String::from_utf8(input.to_vec()).unwrap()))
    };
    let operation = constrain(transform_up_to(&mut source, 1, &mut callback));
    let waker = Waker::from(Arc::new(NoWake));
    let mut context = Context::from_waker(&waker);
    let mut operation = Box::pin(operation);
    assert_eq!(operation.as_mut().poll(&mut context), Poll::Ready(Ok(Chunk { consumed: 1, output: vec!["local".into()] })));
    drop(operation);
    drop(callback);
    assert_eq!(source.remaining(), 0);
    assert_eq!(local_counter.get(), 1);
    assert_eq!(local_output, vec![b"local".to_vec()]);
}
`,
    passTestName: "callback_local_rc_send_scoped",
    diagnosticCodes: ["E0277"],
  },
];

export const callbackTransferStep: LessonStep = {
  id: "async-lending-callbacks-bounded-transform",
  kind: "apply",
  title: "Przekształć ograniczoną liczbę wejść",
  prompt:
    "Przed implementacją przewidź wynik dla emit-a / skip / emit-c i limitu 2: ile wejść zostanie zużytych, ile tekstów wróci i co pozostanie? Zaimplementuj publiczne ChunkSource::new(Vec<Vec<u8>>) -> Self i remaining(&self) -> usize, publiczne Chunk { consumed: usize, output: Vec<String> } oraz async fn transform_up_to<F, E>(source: &mut ChunkSource, limit: usize, transform: &mut F) -> Result<Chunk, E>, gdzie F: std::ops::AsyncFnMut(&[u8]) -> Result<Option<String>, E>. Odwiedzaj wejścia w kolejności; awaituj pożyczający callback do końca, dopiero po Ok commituj to wejście. Some emituje owned String, None filtruje; oba zwiększają consumed. Limit dotyczy wejść, także filtrowanych. Zero i wyczerpanie nie wywołują callbacku; puste i dowolne bajty są poprawnymi wejściami. Kolejne wywołanie wznawia od pierwszego niezatwierdzonego wejścia. Pierwszy Err natychmiast zwraca oryginalny błąd: wcześniejsze wejścia pozostają zużyte, bieżące i późniejsze pozostają w źródle, a teksty zebrane w tym wywołaniu przepadają. Drop podczas Pending nie commituje bieżącego wejścia; wcześniejsze commity i efekty callbacku pozostają. Nie wymagaj Send ani 'static i nie zaczynaj następnego callbacku podczas Pending. String i Vec mogą alokować; nie jest to atomowy rollback ani API błędu z częściowym wynikiem. Po uruchomieniu wyjaśnij, dlaczego consumed=2 może oznaczać tylko jeden tekst oraz co zostanie powtórzone po anulowaniu drugiego callbacku. To nowa rodzina dowodu wyłącznie dla callbacku; obserwacja anulowania nie daje osobnego zaliczenia tego pojęcia. Odsłonięcie rozwiązania pozostaje pomocą.",
  code: callbackTransferStarter,
  solution: callbackTransferSolution,
  evaluator: { kind: "tests", tests: callbackTransferTests },
  expectedStatus: "success",
  hints: [
    "Oddziel liczbę zatwierdzonych wejść od długości output. None także zużywa jedno wejście.",
    "Pożycz rekord przez await; commit i zwiększenie consumed wykonaj dopiero po Ok. Operator ? zachowuje oryginalny błąd.",
  ],
  explanation:
    "Dla emit/skip/emit i limitu 2 wynik ma consumed=2 i jeden tekst; trzecie wejście czeka. Err usuwa wyniki bieżącego wywołania, lecz zachowuje wcześniejsze commity. Po anulowaniu Pending drugiego callbacku drugie wejście wróci przy następnej próbie, a jego już wykonane efekty nie zostaną cofnięte. Wyjaśnij to własnymi słowami po wykonaniu zadania.",
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["async-lending-callback-borrow"],
    codingTaskId: "async-lending/callback-bounded-transform-v1",
  },
};
