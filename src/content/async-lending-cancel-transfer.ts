import type { LessonStep } from "../domain/types";

/** The starter exposes the API but leaves the state machine unfinished. */
const starter = `use std::future::Future;

#[derive(Debug, PartialEq, Eq)]
pub enum SubmitError { Conflict }
struct Entry { key: String, payload: String, receipt: usize }
pub struct Ledger { entries: Vec<Entry>, next: usize }
impl Ledger {
    pub fn new() -> Self { Self { entries: Vec::new(), next: 0 } }
    pub fn len(&self) -> usize { self.entries.len() }
    pub fn receipt(&self, key: &str) -> Option<usize> { self.entries.iter().find(|entry| entry.key == key).map(|entry| entry.receipt) }
    pub fn value(&self, key: &str) -> Option<&str> { self.entries.iter().find(|entry| entry.key == key).map(|entry| entry.payload.as_str()) }
    pub async fn submit<P, Q>(&mut self, key: String, payload: String, before_commit: P, before_reply: Q) -> Result<usize, SubmitError>
    where P: Future<Output = ()>, Q: Future<Output = ()> {
        let _ = (key, payload, before_commit, before_reply);
        todo!("submit state machine is the learner's task")
    }
}
`;

const vecApi = `use std::future::Future;
#[derive(Debug, PartialEq, Eq)]
pub enum SubmitError { Conflict }
struct Entry { key: String, payload: String, receipt: usize }
pub struct Ledger { entries: Vec<Entry>, next: usize }
impl Ledger {
    pub fn new() -> Self { Self { entries: Vec::new(), next: 0 } }
    pub fn len(&self) -> usize { self.entries.len() }
    pub fn receipt(&self, key: &str) -> Option<usize> { self.entries.iter().find(|entry| entry.key == key).map(|entry| entry.receipt) }
    pub fn value(&self, key: &str) -> Option<&str> { self.entries.iter().find(|entry| entry.key == key).map(|entry| entry.payload.as_str()) }
    fn lookup(&self, key: &str) -> Option<(String, usize)> { self.entries.iter().find(|entry| entry.key == key).map(|entry| (entry.payload.clone(), entry.receipt)) }
    fn insert(&mut self, key: String, payload: String) -> usize { let receipt = self.next; self.next += 1; self.entries.push(Entry { key, payload, receipt }); receipt }
    pub async fn submit<P, Q>(&mut self, key: String, payload: String, before_commit: P, before_reply: Q) -> Result<usize, SubmitError>
    where P: Future<Output = ()>, Q: Future<Output = ()> {
        if let Some((old, receipt)) = self.lookup(&key) { if old == payload { return Ok(receipt); } return Err(SubmitError::Conflict); }
        before_commit.await;
        let receipt = self.insert(key, payload);
        before_reply.await;
        Ok(receipt)
    }
}
`;

const hashApi = `use std::collections::HashMap;
use std::future::Future;
#[derive(Debug, PartialEq, Eq)]
pub enum SubmitError { Conflict }
struct Entry { payload: String, receipt: usize }
pub struct Ledger { entries: HashMap<String, Entry>, next: usize }
impl Ledger {
    pub fn new() -> Self { Self { entries: HashMap::new(), next: 0 } }
    pub fn len(&self) -> usize { self.entries.len() }
    pub fn receipt(&self, key: &str) -> Option<usize> { self.entries.get(key).map(|entry| entry.receipt) }
    pub fn value(&self, key: &str) -> Option<&str> { self.entries.get(key).map(|entry| entry.payload.as_str()) }
    fn lookup(&self, key: &str) -> Option<(String, usize)> { self.entries.get(key).map(|entry| (entry.payload.clone(), entry.receipt)) }
    fn insert(&mut self, key: String, payload: String) -> usize { let receipt = self.next; self.next += 1; self.entries.insert(key, Entry { payload, receipt }); receipt }
    pub async fn submit<P, Q>(&mut self, key: String, payload: String, before_commit: P, before_reply: Q) -> Result<usize, SubmitError>
    where P: Future<Output = ()>, Q: Future<Output = ()> {
        if let Some((old, receipt)) = self.lookup(&key) { if old == payload { return Ok(receipt); } return Err(SubmitError::Conflict); }
        before_commit.await;
        let receipt = self.insert(key, payload);
        before_reply.await;
        Ok(receipt)
    }
}
`;

const btreeApi = `use std::collections::BTreeMap;
use std::future::Future;
#[derive(Debug, PartialEq, Eq)]
pub enum SubmitError { Conflict }
struct Entry { payload: String, receipt: usize }
pub struct Ledger { entries: BTreeMap<String, Entry>, next: usize }
impl Ledger {
    pub fn new() -> Self { Self { entries: BTreeMap::new(), next: 0 } }
    pub fn len(&self) -> usize { self.entries.len() }
    pub fn receipt(&self, key: &str) -> Option<usize> { self.entries.get(key).map(|entry| entry.receipt) }
    pub fn value(&self, key: &str) -> Option<&str> { self.entries.get(key).map(|entry| entry.payload.as_str()) }
    fn lookup(&self, key: &str) -> Option<(String, usize)> { self.entries.get(key).map(|entry| (entry.payload.clone(), entry.receipt)) }
    fn insert(&mut self, key: String, payload: String) -> usize { let receipt = self.next; self.next += 1; self.entries.insert(key, Entry { payload, receipt }); receipt }
    pub async fn submit<P, Q>(&mut self, key: String, payload: String, before_commit: P, before_reply: Q) -> Result<usize, SubmitError>
    where P: Future<Output = ()>, Q: Future<Output = ()> {
        if let Some((old, receipt)) = self.lookup(&key) { if old == payload { return Ok(receipt); } return Err(SubmitError::Conflict); }
        before_commit.await;
        let receipt = self.insert(key, payload);
        before_reply.await;
        Ok(receipt)
    }
}
`;

export const cancelTransferSolution = vecApi;
export const cancelTransferEquivalent = hashApi;
export const cancelTransferBtreeEquivalent = btreeApi;

export const cancelTransferTests = `
use std::cell::{Cell, RefCell};
use std::future::Future;
use std::marker::PhantomPinned;
use std::pin::Pin;
use std::rc::Rc;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::task::{Context, Poll, Wake, Waker};
#[derive(Default)] struct GateState { released: Cell<bool>, polls: Cell<usize>, latest: RefCell<Option<Waker>> }
impl GateState { fn release(&self) { self.released.set(true); self.latest.borrow_mut().take().expect("Pending must register latest waker").wake(); } }
struct Gate { state: Rc<GateState>, _pin: PhantomPinned }
impl Future for Gate { type Output = (); fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> { let state = &self.as_ref().get_ref().state; state.polls.set(state.polls.get() + 1); *state.latest.borrow_mut() = Some(cx.waker().clone()); if state.released.get() { Poll::Ready(()) } else { Poll::Pending } } }
fn gate() -> (Gate, Rc<GateState>) { let state = Rc::new(GateState::default()); (Gate { state: state.clone(), _pin: PhantomPinned }, state) }
fn ready_gate() -> (Gate, Rc<GateState>) { let state = Rc::new(GateState { released: Cell::new(true), polls: Cell::new(0), latest: RefCell::new(None) }); (Gate { state: state.clone(), _pin: PhantomPinned }, state) }
struct PanicGate;
impl Future for PanicGate { type Output = (); fn poll(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<()> { panic!("gate must be bypassed") } }
struct WakeCount(Arc<AtomicUsize>);
impl Wake for WakeCount { fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); } fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); } }
fn waker() -> (Arc<AtomicUsize>, Waker) { let count = Arc::new(AtomicUsize::new(0)); (count.clone(), Waker::from(Arc::new(WakeCount(count)))) }
fn poll_once<F: Future>(future: &mut Pin<Box<F>>, waker: &Waker) -> Poll<F::Output> { future.as_mut().poll(&mut Context::from_waker(waker)) }
fn ready<F: Future>(future: F) -> F::Output { let (_, waker) = waker(); let mut future = Box::pin(future); match poll_once(&mut future, &waker) { Poll::Ready(value) => value, Poll::Pending => panic!("ready gate must complete on its first poll") } }
#[test] fn lazy_unpolled_drop() { let mut ledger = Ledger::new(); let (p, ps) = gate(); let (q, qs) = gate(); drop(ledger.submit("lazy".into(), "v".into(), p, q)); assert_eq!(ledger.len(), 0); assert_eq!(ledger.receipt("lazy"), None); assert_eq!(ps.polls.get(), 0); assert_eq!(qs.polls.get(), 0); }
#[test] fn precommit_pending_drop() { let mut ledger = Ledger::new(); let (p, ps) = gate(); let (q, qs) = gate(); let mut f = Box::pin(ledger.submit("a".into(), "v".into(), p, q)); let (w1n, w1) = waker(); let (w2n, w2) = waker(); assert!(poll_once(&mut f, &w1).is_pending()); assert!(poll_once(&mut f, &w2).is_pending()); assert!(ps.latest.borrow().as_ref().unwrap().will_wake(&w2)); assert_eq!(ps.polls.get(), 2); ps.release(); assert_eq!(w1n.load(Ordering::SeqCst), 0); assert_eq!(w2n.load(Ordering::SeqCst), 1); drop(f); assert_eq!(ledger.len(), 0); assert_eq!(qs.polls.get(), 0); assert_eq!(ready(ledger.submit("a".into(), "v".into(), std::future::ready(()), std::future::ready(()))), Ok(0)); }
#[test] fn postcommit_pending_drop() { let mut ledger = Ledger::new(); let (p, _) = ready_gate(); let (q, qs) = gate(); let mut f = Box::pin(ledger.submit("a".into(), "v".into(), p, q)); let (_, w) = waker(); assert!(poll_once(&mut f, &w).is_pending()); assert_eq!(qs.polls.get(), 1); drop(f); assert_eq!(ledger.len(), 1); assert_eq!(ledger.receipt("a"), Some(0)); assert_eq!(ledger.value("a"), Some("v")); }
#[test] fn replay_bypasses_gates() { let mut ledger = Ledger::new(); let (p, _) = ready_gate(); let (q, qs) = gate(); let mut f = Box::pin(ledger.submit("a".into(), "v".into(), p, q)); let (_, w) = waker(); assert!(poll_once(&mut f, &w).is_pending()); assert_eq!(qs.polls.get(), 1); drop(f); assert_eq!(ready(ledger.submit("a".into(), "v".into(), PanicGate, PanicGate)), Ok(0)); assert_eq!(ready(ledger.submit("a".into(), "changed".into(), PanicGate, PanicGate)), Err(SubmitError::Conflict)); assert_eq!(ledger.len(), 1); assert_eq!(ledger.receipt("a"), Some(0)); assert_eq!(ledger.value("a"), Some("v")); }
#[test] fn conflict_bypasses_gates() { let mut ledger = Ledger::new(); assert_eq!(ready(ledger.submit("a".into(), "v".into(), std::future::ready(()), std::future::ready(()))), Ok(0)); assert_eq!(ready(ledger.submit("a".into(), "changed".into(), PanicGate, PanicGate)), Err(SubmitError::Conflict)); assert_eq!(ledger.len(), 1); assert_eq!(ledger.value("a"), Some("v")); }
#[test] fn postcommit_repoll_then_ready() { let mut ledger = Ledger::new(); let (p, ps) = gate(); let (q, qs) = gate(); let mut f = Box::pin(ledger.submit("a".into(), "v".into(), p, q)); let (pn, pw) = waker(); let (q1n, qw1) = waker(); let (q2n, qw2) = waker(); assert!(poll_once(&mut f, &pw).is_pending()); assert_eq!(ps.polls.get(), 1); ps.release(); assert_eq!(pn.load(Ordering::SeqCst), 1); assert!(poll_once(&mut f, &qw1).is_pending()); assert_eq!(ps.polls.get(), 2); assert_eq!(qs.polls.get(), 1); assert!(poll_once(&mut f, &qw2).is_pending()); assert_eq!(ps.polls.get(), 2); assert_eq!(qs.polls.get(), 2); qs.release(); assert_eq!(q1n.load(Ordering::SeqCst), 0); assert_eq!(q2n.load(Ordering::SeqCst), 1); assert_eq!(poll_once(&mut f, &qw2), Poll::Ready(Ok(0))); assert_eq!(ps.polls.get(), 2); assert_eq!(qs.polls.get(), 3); drop(f); assert_eq!(ledger.len(), 1); }
#[test] fn ordinal_sequence() { let mut ledger = Ledger::new(); let (_, w) = waker(); let (cancel_p, cancel_ps) = gate(); let (cancel_q, _) = ready_gate(); let mut canceled = Box::pin(ledger.submit("cancel".into(), "never".into(), cancel_p, cancel_q)); assert!(poll_once(&mut canceled, &w).is_pending()); assert_eq!(cancel_ps.polls.get(), 1); drop(canceled); assert_eq!(ledger.len(), 0); assert_eq!(ledger.receipt("cancel"), None); assert_eq!(ready(ledger.submit("a".into(), "one".into(), std::future::ready(()), std::future::ready(()))), Ok(0)); let (lost_p, _) = ready_gate(); let (lost_q, lost_qs) = gate(); let mut lost = Box::pin(ledger.submit("b".into(), "two".into(), lost_p, lost_q)); assert!(poll_once(&mut lost, &w).is_pending()); assert_eq!(lost_qs.polls.get(), 1); drop(lost); assert_eq!(ledger.receipt("b"), Some(1)); assert_eq!(ready(ledger.submit("b".into(), "two".into(), PanicGate, PanicGate)), Ok(1)); assert_eq!(ready(ledger.submit("b".into(), "changed".into(), PanicGate, PanicGate)), Err(SubmitError::Conflict)); assert_eq!(ready(ledger.submit("c".into(), "three".into(), std::future::ready(()), std::future::ready(()))), Ok(2)); assert_eq!(ledger.len(), 3); assert_eq!(ledger.receipt("a"), Some(0)); assert_eq!(ledger.receipt("b"), Some(1)); assert_eq!(ledger.receipt("c"), Some(2)); assert_eq!(ledger.value("a"), Some("one")); assert_eq!(ledger.value("b"), Some("two")); assert_eq!(ledger.value("c"), Some("three")); assert_eq!(ledger.value("missing"), None); }
#[test] fn opaque_strings() { let mut ledger = Ledger::new(); assert_eq!(ready(ledger.submit("".into(), "".into(), std::future::ready(()), std::future::ready(()))), Ok(0)); assert_eq!(ready(ledger.submit("Ż  ".into(), "λ".into(), std::future::ready(()), std::future::ready(()))), Ok(1)); assert_eq!(ready(ledger.submit("ż  ".into(), "λ".into(), std::future::ready(()), std::future::ready(()))), Ok(2)); assert_eq!(ready(ledger.submit(" same".into(), "x".into(), std::future::ready(()), std::future::ready(()))), Ok(3)); assert_eq!(ready(ledger.submit("same ".into(), "x".into(), std::future::ready(()), std::future::ready(()))), Ok(4)); assert_eq!(ledger.value("Ż  "), Some("λ")); assert_eq!(ledger.value("missing"), None); assert_eq!(ready(ledger.submit("Ż  ".into(), " λ".into(), PanicGate, PanicGate)), Err(SubmitError::Conflict)); }
struct LocalPinned<'a> { seen: &'a Cell<usize>, _pin: PhantomPinned, _not_clone: Rc<()> }
impl Future for LocalPinned<'_> { type Output = (); fn poll(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<()> { let n = self.as_ref().get_ref().seen.get(); self.as_ref().get_ref().seen.set(n + 1); Poll::Ready(()) } }
#[test] fn local_nonclone_pinned_gates() { let mut ledger = Ledger::new(); let pseen = Cell::new(0); let qseen = Cell::new(0); let p = LocalPinned { seen: &pseen, _pin: PhantomPinned, _not_clone: Rc::new(()) }; let q = LocalPinned { seen: &qseen, _pin: PhantomPinned, _not_clone: Rc::new(()) }; assert_eq!(ready(ledger.submit("local".into(), "данные".into(), p, q)), Ok(0)); assert_eq!(pseen.get(), 1); assert_eq!(qseen.get(), 1); }
`;

export const cancelTransferStep: LessonStep = {
  id: "async-lending-cancel-commit-lost-reply", kind: "apply", title: "Zachowaj commit po utracie odpowiedzi",
  prompt: "Zaimplementuj prywatny `Ledger` z `SubmitError::Conflict`, `new`, `len`, `receipt`, `value` i `submit`. Receipt zaczyna się od 0 i rośnie wyłącznie przy nowym wpisie w kolejności wstawiania: anulowanie przed commit, replay i konflikt nie zużywają ordinalu. Dla tego samego klucza i tego samego payloadu zwróć oryginalny receipt; dla tego samego klucza i innego payloadu zwróć `SubmitError::Conflict` i pozostaw zapisany stan bez zmian. Future jest leniwy: lookup istniejącego klucza nie polluje gate'ów; replay i konflikt zwracają wynik na pierwszym pollu. Dla nowego klucza awaituj `before_commit`, zapisz klucz, payload i receipt, a dopiero potem awaituj `before_reply`; Drop przed commitem nie tworzy wpisu, a Drop po commicie zachowuje wpis. Zachowaj dokładne, nieprzetworzone Stringi, brak wpisu dla nieznanego klucza i żadnych boundów Send, Sync, Clone, Unpin, Debug ani `'static` na P/Q. Dostarczony klient używa bezpiecznego `Box::pin`, `Context`, `Waker` i kontrolowanego `Poll::Pending`: pin stabilizuje adres future, Context dostarcza waker, Pending oddaje sterowanie do release; implementacja może zwyczajnie używać await i nie ma busy-loop executor. Submit nie obiecuje repollowania po Ready. Kontrakt obejmuje lokalny, niedurable stan pamięci; późniejszy capstone kursu durable-log-service (https://github.com/fettpl/rustcrushcourse/blob/main/docs/capstone-change-review.md) jest tylko późniejszym porównaniem, bez ukrytego prerekwizytu. Nie obiecuj transakcji, rollbacku, crash recovery ani równoległej exactly-once.",
  code: starter, expectedStatus: "success", solution: cancelTransferSolution,
  hints: ["Najpierw rozdziel immutable lookup replay/conflict od ścieżki nowego wpisu; pomocnicze `insert` może przydzielać niezależny ordinal od kolejności iteracji.", "W kodzie klienta użyj `Box::pin` i ręcznego pollowania tylko do obserwacji kontrolowanych stanów; po Drop pożyczka `&mut Ledger` wraca, lecz zapis wykonany przed `before_reply.await` pozostaje."],
  evaluator: { kind: "tests", tests: cancelTransferTests }, evidenceKind: "transfer", evidenceGate: true,
  evidence: { version: 2, conceptIds: ["async-lending-cancel-commit"], codingTaskId: "async-lending/cancel-lost-reply-v1" },
};

export const cancelTransferModelStep: LessonStep = {
  id: "async-lending-cancel-commit-reply-model", kind: "predict", title: "Przewiduj cztery stany po utracie odpowiedzi",
  prompt: "Wybierz i opisz wszystkie cztery stany: (1) przed pierwszym poll: len=0, receipt nie istnieje i gate'y nie są pollowane; (2) Pending `before_commit`: nadal brak wpisu, receipt 0 będzie pierwszym nowym ordinalem, a latest waker jest zastępowany; (3) Pending `before_reply` po commicie: wpis i receipt już istnieją, lecz wynik jeszcze nie wrócił; (4) Ready: zwrócony jest istniejący albo nowy receipt. Dla tego samego klucza i tego samego payloadu replay zwraca oryginalny receipt; inny payload daje `SubmitError::Conflict`, a zapisany stan pozostaje bez zmian. Replay i konflikt mają wynik na pierwszym pollu, a anulowanie przed commit nie zużywa ordinalu. Uwzględnij dokładne puste, whitespace i Unicode Stringi, brak lookupu dla None, pożyczkę `&mut Ledger`, Debug jako zwykłą cechę bez wymogu na P/Q, bezpieczny Box::pin/manualny Context/Waker/Pending bridge oraz zakaz repollowania submit po Ready. Mechanika klienta jest dostarczona; learner może użyć zwykłego await, bez busy-loop executora. Pamiętaj, że to lokalna niedurable pamięć; późniejszy capstone kursu durable-log-service (https://github.com/fettpl/rustcrushcourse/blob/main/docs/capstone-change-review.md) służy tylko późniejszemu porównaniu i nie jest prerekwizytem. Przeczytaj oficjalne: https://doc.rust-lang.org/std/future/trait.Future.html, https://doc.rust-lang.org/reference/expressions/await-expr.html oraz https://doc.rust-lang.org/std/pin/index.html.",
  choices: [{ id: "four-state-contract", label: "Cztery stany kontraktu" }, { id: "rollback-on-drop", label: "Drop cofa commit" }],
  evaluator: { kind: "choice", correct: "four-state-contract", explanations: { "four-state-contract": "Przed poll nic się nie dzieje; Pending before_commit nie ma wpisu; po commit i Pending before_reply wpis ma receipt; Ready ujawnia wynik. Ten sam klucz i payload replayują oryginalny receipt, inny payload daje Conflict bez zmiany stanu. Replay i konflikt kończą się na pierwszym pollu. Drop przed commitem nie zużywa ordinalu, lecz Drop po commicie zachowuje zapis, który już zużył ordinal. Box::pin stabilizuje future, Context niesie Waker, a Pending oddaje sterowanie do release; implementacja może użyć zwykłego await.", "rollback-on-drop": "Drop zatrzymuje future, lecz nie jest rollbackiem zapisu wykonanego przed późniejszym await." } },
  evidenceKind: "exposure", evidence: { version: 2, conceptIds: ["async-lending-cancel-commit"] },
};

type Mutant = { id: string; source: string; testName: string; family: string; assertion: string };
const target = (id: string) => `__rust_workshop_hidden_tests::${id === "early-commit" ? "precommit_pending_drop" : id === "late-commit" || id === "bypass-reply" ? "postcommit_pending_drop" : id === "replay-new-receipt" || id === "wait-on-replay" ? "replay_bypasses_gates" : id === "overwrite-conflict" ? "conflict_bypasses_gates" : id === "normalize-key" ? "opaque_strings" : "ordinal_sequence"}`;
const mutate = (id: string, source: string): Mutant => {
  let mutated = source;
  if (id === "early-commit") mutated = source.replace("before_commit.await;\n        let receipt = self.insert(key, payload);", "let receipt = self.insert(key, payload);\n        before_commit.await;");
  if (id === "late-commit") mutated = source.replace("before_commit.await;\n        let receipt = self.insert(key, payload);\n        before_reply.await;", "before_commit.await;\n        before_reply.await;\n        let receipt = self.insert(key, payload);");
  if (id === "bypass-reply") mutated = source.replace("before_reply.await;", "let _ = &before_reply;");
  if (id === "replay-new-receipt") mutated = source.replace("return Ok(receipt);", "return Ok(receipt + 1);");
  if (id === "overwrite-conflict") mutated = source.replace("return Err(SubmitError::Conflict);", "let _ = self.insert(key, payload); return Err(SubmitError::Conflict);");
  if (id === "normalize-key") mutated = source.replace("if let Some((old, receipt)) = self.lookup(&key)", "let key = key.trim().to_ascii_lowercase();\n        if let Some((old, receipt)) = self.lookup(&key)");
  if (id === "one-based-receipt") mutated = source.replace("let receipt = self.next;", "let receipt = self.next + 1;");
  if (id === "wait-on-replay") mutated = source.replace("if old == payload { return Ok(receipt); }", "if old == payload { before_commit.await; before_reply.await; return Ok(receipt); }");
  return { id, source: `${mutated}\n`, testName: target(id), family: id, assertion: id === "overwrite-conflict" ? "Conflict" : id };
};
const families = ["early-commit", "late-commit", "bypass-reply", "replay-new-receipt", "overwrite-conflict", "normalize-key", "one-based-receipt", "wait-on-replay"];
export const createCancelTransferMutants = (source: string) => families.map((id) => mutate(id, source));
export const cancelTransferMutants = createCancelTransferMutants(cancelTransferSolution);
export const cancelTransferNativeCandidates = [
  { id: "vec", source: cancelTransferSolution },
  { id: "hash", source: cancelTransferEquivalent },
  { id: "btree", source: cancelTransferBtreeEquivalent },
] as const;
