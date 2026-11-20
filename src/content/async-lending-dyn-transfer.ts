import type { LessonStep } from "../domain/types";

// Pure authored fixtures: importing this module does not load the assessment registry.
type TransferMutant = { id: string; source: string; testName: string };
type TransferBoundary = {
  id: string;
  failSuffix: string;
  passSuffix: string;
  passTestName: string;
  diagnosticCodes: readonly string[];
};

const dynTransferStarter = `use std::future::Future;
use std::pin::Pin;
pub trait BorrowedProvider {
    fn next<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>>;
}
#[allow(dead_code)]
pub struct BoxedSources<'s> { providers: Vec<Box<dyn BorrowedProvider + 's>> }
impl<'s> BoxedSources<'s> {
    pub fn new(providers: Vec<Box<dyn BorrowedProvider + 's>>) -> Self { Self { providers } }
    pub fn next_at<'a>(&'a mut self, _index: usize) -> Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        // TODO: wywołaj wybranego providera dopiero po poll adaptera.
        Box::pin(async { None })
    }
    pub async fn collect_at(&mut self, _index: usize, _limit: usize) -> Vec<Vec<u8>> {
        // TODO: skopiuj ograniczoną liczbę widoków do owned wyników.
        Vec::new()
    }
}
`;

const dynTransferSolution = `#![allow(dead_code)]
use std::future::Future;
use std::pin::Pin;
pub trait BorrowedProvider {
    fn next<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>>;
}
pub struct BoxedSources<'s> { providers: Vec<Box<dyn BorrowedProvider + 's>> }
impl<'s> BoxedSources<'s> {
    pub fn new(providers: Vec<Box<dyn BorrowedProvider + 's>>) -> Self { Self { providers } }
    pub fn next_at<'a>(&'a mut self, index: usize) -> Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        Box::pin(async move {
            match self.providers.get_mut(index) {
                Some(provider) => provider.next().await,
                None => None,
            }
        })
    }
    pub async fn collect_at(&mut self, index: usize, limit: usize) -> Vec<Vec<u8>> {
        let mut owned = Vec::new();
        for _ in 0..limit {
            match self.next_at(index).await {
                Some(view) => owned.push(view.to_vec()),
                None => break,
            }
        }
        owned
    }
}
`;

const dynTransferSupport = `use std::cell::Cell;
use std::rc::Rc;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::task::{Context, Poll, Wake, Waker};

#[derive(Default)]
pub struct Observed { pub calls: Cell<usize>, pub polls: Cell<usize> }

pub struct ReadyLocal<'s> { rows: &'s [Vec<u8>], position: usize, seen: Rc<Observed> }
impl<'s> ReadyLocal<'s> {
    pub fn new(rows: &'s [Vec<u8>], seen: Rc<Observed>) -> Self { Self { rows, position: 0, seen } }
}
impl BorrowedProvider for ReadyLocal<'_> {
    fn next<'a>(&'a mut self) -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        self.seen.calls.set(self.seen.calls.get() + 1);
        Box::pin(async move {
            self.seen.polls.set(self.seen.polls.get() + 1);
            let result = self.rows.get(self.position).map(Vec::as_slice);
            if result.is_some() { self.position += 1; }
            result
        })
    }
}

pub struct PendingLocal<'s> { rows: &'s [Vec<u8>], position: usize, seen: Rc<Observed> }
impl<'s> PendingLocal<'s> {
    pub fn new(rows: &'s [Vec<u8>], seen: Rc<Observed>) -> Self { Self { rows, position: 0, seen } }
}
struct PendingItem<'a, 's> { owner: &'a mut PendingLocal<'s>, first: bool, done: bool }
impl<'a, 's: 'a> Future for PendingItem<'a, 's> {
    type Output = Option<&'a [u8]>;
    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        assert!(!this.done, "provider polled after Ready");
        this.owner.seen.polls.set(this.owner.seen.polls.get() + 1);
        if this.first {
            this.first = false;
            cx.waker().wake_by_ref();
            return Poll::Pending;
        }
        this.done = true;
        let rows: &'s [Vec<u8>] = this.owner.rows;
        let result = rows.get(this.owner.position).map(Vec::as_slice);
        if result.is_some() { this.owner.position += 1; }
        Poll::Ready(result)
    }
}
impl BorrowedProvider for PendingLocal<'_> {
    fn next<'a>(&'a mut self) -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        self.seen.calls.set(self.seen.calls.get() + 1);
        Box::pin(PendingItem { owner: self, first: true, done: false })
    }
}

#[derive(Default)]
pub struct WakeCount(pub AtomicUsize);
impl Wake for WakeCount {
    fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
    fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
}
pub fn run<F: Future>(future: F) -> F::Output {
    let count = Arc::new(WakeCount::default());
    let waker = Waker::from(count.clone());
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    // Bounded deterministic probe: each Pending must synchronously request a wake.
    // No sleeps, busy-to-completion provider loop, or production executor claim.
    for _ in 0..32 {
        let before = count.0.load(Ordering::SeqCst);
        match future.as_mut().poll(&mut cx) {
            Poll::Ready(output) => return output,
            Poll::Pending => assert!(count.0.load(Ordering::SeqCst) > before),
        }
    }
    panic!("probe exceeded its explicit poll bound")
}
pub fn local_sources(rows: &[Vec<u8>]) -> BoxedSources<'_> {
    BoxedSources::new(vec![Box::new(ReadyLocal::new(rows, Rc::new(Observed::default())))])
}

// Legal provider: progression happens in next(), before the returned future is polled.
pub struct EagerLocal<'s> { rows: &'s [Vec<u8>], position: usize, seen: Rc<Observed> }
impl<'s> EagerLocal<'s> {
    pub fn new(rows: &'s [Vec<u8>], seen: Rc<Observed>) -> Self { Self { rows, position: 0, seen } }
}
impl BorrowedProvider for EagerLocal<'_> {
    fn next<'a>(&'a mut self) -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        self.seen.calls.set(self.seen.calls.get() + 1);
        let row = self.rows.get(self.position).map(Vec::as_slice);
        if row.is_some() { self.position += 1; }
        Box::pin(std::future::ready(row))
    }
}
`;

const dynTransferTests = `${dynTransferSupport}
    #[test]
    fn heterogeneous_local_routing_pointer_and_real_pending() {
        let ready_rows = vec![b"ready".to_vec(), b"again".to_vec()];
        let pending_rows = vec![vec![0xff, 0x00, 0x81], b"later".to_vec()];
        let ready = Rc::new(Observed::default());
        let pending = Rc::new(Observed::default());
        let mut sources = BoxedSources::new(vec![
            Box::new(ReadyLocal::new(&ready_rows, ready.clone())),
            Box::new(PendingLocal::new(&pending_rows, pending.clone())),
        ]);
        let mut future = sources.next_at(1);
        assert_eq!(pending.calls.get(), 0);
        let wakes = Arc::new(WakeCount::default());
        let waker = Waker::from(wakes.clone());
        let mut cx = Context::from_waker(&waker);
        assert!(future.as_mut().poll(&mut cx).is_pending());
        assert_eq!(pending.calls.get(), 1);
        assert_eq!(pending.polls.get(), 1);
        assert_eq!(wakes.0.load(Ordering::SeqCst), 1);
        assert_eq!((ready.calls.get(), ready.polls.get()), (0, 0));
        let Poll::Ready(Some(view)) = future.as_mut().poll(&mut cx) else { panic!("expected borrowed result") };
        assert_eq!(view, &[0xff, 0x00, 0x81]);
        assert_eq!(view.as_ptr(), pending_rows[0].as_ptr());
        assert_eq!(view.len(), pending_rows[0].len());
        assert_eq!(pending.polls.get(), 2);
        assert_eq!((ready.calls.get(), ready.polls.get()), (0, 0));
        drop(future);
        assert_eq!(run(sources.next_at(0)), Some(ready_rows[0].as_slice()));
        assert_eq!(run(sources.next_at(1)), Some(pending_rows[1].as_slice()));
    }
    #[test]
    fn constructing_and_dropping_unpolled_adapter_does_not_call_provider() {
        let rows = vec![b"first".to_vec()];
        let seen = Rc::new(Observed::default());
        let mut sources = BoxedSources::new(vec![Box::new(PendingLocal::new(&rows, seen.clone()))]);
        drop(sources.next_at(0));
        assert_eq!((seen.calls.get(), seen.polls.get()), (0, 0));
        let mut future = sources.next_at(0);
        let waker = Waker::from(Arc::new(WakeCount::default()));
        assert!(future.as_mut().poll(&mut Context::from_waker(&waker)).is_pending());
        drop(future);
        // This provider commits only on Ready; no generic adapter rollback promise.
        assert_eq!(run(sources.next_at(0)), Some(rows[0].as_slice()));
    }
    #[test]
    fn bounded_collection_retains_empty_records_remainder_and_exhaustion() {
        let rows = vec![b"a".to_vec(), vec![], b"c".to_vec()];
        let seen = Rc::new(Observed::default());
        let mut sources = BoxedSources::new(vec![Box::new(PendingLocal::new(&rows, seen.clone()))]);
        assert_eq!(run(sources.collect_at(0, 2)), vec![b"a".to_vec(), vec![]]);
        assert_eq!(seen.calls.get(), 2);
        assert_eq!(run(sources.collect_at(0, 9)), vec![b"c".to_vec()]);
        assert!(run(sources.next_at(0)).is_none());
        assert!(run(sources.collect_at(0, 1)).is_empty());
    }
    #[test]
    fn zero_invalid_and_empty_sources_do_not_invoke_another_provider() {
        let rows = vec![b"untouched".to_vec()];
        let seen = Rc::new(Observed::default());
        let mut sources = BoxedSources::new(vec![Box::new(ReadyLocal::new(&rows, seen.clone()))]);
        assert!(run(sources.collect_at(0, 0)).is_empty());
        assert!(run(sources.next_at(4)).is_none());
        assert!(run(sources.collect_at(4, 2)).is_empty());
        assert_eq!((seen.calls.get(), seen.polls.get()), (0, 0));
        let mut empty = BoxedSources::new(vec![]);
        assert!(run(empty.next_at(0)).is_none());
        assert!(run(empty.collect_at(0, 2)).is_empty());
        assert_eq!(run(sources.next_at(0)), Some(rows[0].as_slice()));
    }
    #[test]
    fn owned_collection_survives_providers_and_local_storage() {
        let owned = {
            let rows = vec![b"owned".to_vec(), vec![]];
            let mut sources = local_sources(&rows);
            run(sources.collect_at(0, 5))
        };
        assert_eq!(owned, vec![b"owned".to_vec(), vec![]]);
    }

#[test]
fn eager_provider_is_not_invoked_by_unpolled_adapter() {
    let rows = vec![b"first".to_vec(), b"second".to_vec()];
    let seen = Rc::new(Observed::default());
    let mut sources = BoxedSources::new(vec![Box::new(EagerLocal::new(&rows, seen.clone()))]);
    drop(sources.next_at(0));
    assert_eq!(seen.calls.get(), 0, "constructing an adapter must not call even an eager provider");
    assert_eq!(run(sources.collect_at(0, 2)), rows);
}
#[test]
fn borrowed_bytes_are_forwarded_without_substitution() {
    let rows = vec![vec![0xff, 0x00], vec![0x80, 0xfe, 0x01]];
    let mut sources = local_sources(&rows);
    let view = run(sources.next_at(0)).unwrap();
    assert_eq!(view, rows[0].as_slice());
    assert_eq!(view.as_ptr(), rows[0].as_ptr());
    assert_eq!(view.len(), rows[0].len());
    assert_eq!(run(sources.collect_at(0, 4)), vec![rows[1].clone()]);
}
`;

export const dynTransferStep: LessonStep = {
  id: "async-lending-dyn-adapter-borrowed-sources",
  kind: "apply",
  title: "Pożyczony widok, własna kolekcja",
  prompt:
    "Opcjonalny transfer zaawansowany. Zaimplementuj BorrowedProvider i BoxedSources według API w starterze. Kolekcja przechowuje różne konkretne typy providerów, także pożyczające lokalne dane i bez Send ani 'static. next_at wybiera wyłącznie wskazany indeks, awaituje future providera i oddaje jego niezmieniony widok bajtów; zły indeks daje None. Samo utworzenie lub porzucenie niepollowanego future adaptera nie może wywołać providera. Przekaż Pending oraz kontekst/waker; nie kręć pętli w jednym poll. collect_at kopiuje najwyżej limit elementów z wybranego źródła do Vec<Vec<u8>>, zachowuje kolejność, puste rekordy i resztę na kolejne wywołanie, kończy na None; limit 0 niczego nie wywołuje. Bajty nie muszą być UTF-8. Przewidź: kiedy ostatnie użycie zwróconego &[u8] odblokuje następne next_at? Po uruchomieniu wyjaśnij, dlaczego wynik collect_at przetrwa zniszczenie adaptera, providerów i wejścia.",
  code: dynTransferStarter,
  solution: dynTransferSolution,
  evaluator: { kind: "tests", tests: dynTransferTests },
  expectedStatus: "success",
  hints: [
    "Umieść wywołanie provider.next() wewnątrz async move zwracanego przez next_at, aby adapter pozostał leniwy nawet dla providera, który przesuwa kursor już w next().",
    "W Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> końcowe + 'a ogranicza życie future, a &'a [u8] wiąże zwrócony widok z tym samym mutowalnym pożyczeniem adaptera. 's pozwala providerom pożyczać lokalnych właścicieli; nie wymaga 'static. W collect_at skopiuj widok przez to_vec() przed następnym żądaniem. Box future i wyniki Vec mogą alokować. Zgodność wskaźnika i długości w testowanych widokach to obserwacja dla tych danych, a nie dowód braku wszystkich alokacji.",
  ],
  explanation:
    "Borrowed wynik blokuje ponowne mutowalne żądanie do ostatniego użycia widoku; owned Vec kończy tę zależność przez jawną kopię. Adapter nie gwarantuje rollbacku: provider sam określa postęp i skutki anulowania. Testowany PendingLocal przesuwa kursor dopiero na Ready, więc po porzuceniu jego Pending odczyt powtarza rekord; legalny EagerLocal przesuwa go już przy wywołaniu next().",
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["async-lending-dyn-adapter"],
    codingTaskId: "async-lending/dyn-borrowed-sources-v1",
  },
};

export const dynTransferEquivalent: string = `#![allow(dead_code)]
use std::future::Future;
pub trait BorrowedProvider {
    fn next<'a>(&'a mut self) -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>>;
}
pub struct BoxedSources<'s> { providers: std::collections::VecDeque<Box<dyn BorrowedProvider + 's>> }
impl<'s> BoxedSources<'s> {
    pub fn new(providers: Vec<Box<dyn BorrowedProvider + 's>>) -> Self { Self { providers: providers.into() } }
    pub fn next_at<'a>(&'a mut self, index: usize) -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
        Box::pin(async move {
            match self.providers.get_mut(index) {
                Some(provider) => provider.next().await,
                None => None,
            }
        })
    }
    pub async fn collect_at(&mut self, index: usize, limit: usize) -> Vec<Vec<u8>> {
        let mut result = Vec::new();
        let mut left = limit;
        while left != 0 {
            let Some(bytes) = self.next_at(index).await else { break };
            result.push(Vec::from(bytes));
            left -= 1;
        }
        result
    }
}
`;

function mutateDynSource(before: string, after: string): string {
  if (!dynTransferSolution.includes(before))
    throw new Error("Missing dyn transfer mutation anchor");
  return dynTransferSolution.replace(before, after);
}

export const dynTransferMutants: readonly TransferMutant[] = [
  {
    id: "wrong-provider",
    source: mutateDynSource(
      `            match self.providers.get_mut(index) {
`,
      `            match self.providers.get_mut(if index == 1 { 0 } else { index }) {
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::heterogeneous_local_routing_pointer_and_real_pending",
  },
  {
    id: "pending-as-none",
    source: mutateDynSource(
      `                Some(provider) => provider.next().await,
`,
      `                Some(provider) => {
                    let mut future = provider.next();
                    std::future::poll_fn(move |cx| match future.as_mut().poll(cx) {
                        std::task::Poll::Pending => std::task::Poll::Ready(None),
                        ready => ready,
                    }).await
                },
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::heterogeneous_local_routing_pointer_and_real_pending",
  },
  {
    id: "eager-provider-call",
    source: mutateDynSource(
      `        Box::pin(async move {
            match self.providers.get_mut(index) {
                Some(provider) => provider.next().await,
`,
      `        let selected = self.providers.get_mut(index).map(|provider| provider.next());
        Box::pin(async move {
            match selected {
                Some(future) => future.await,
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::eager_provider_is_not_invoked_by_unpolled_adapter",
  },
  {
    id: "collect-one",
    source: mutateDynSource(
      `        for _ in 0..limit {
`,
      `        for _ in 0..limit.min(1) {
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::bounded_collection_retains_empty_records_remainder_and_exhaustion",
  },
  {
    id: "skip-empty",
    source: mutateDynSource(
      `                Some(view) => owned.push(view.to_vec()),
`,
      `                Some(view) => { if !view.is_empty() { owned.push(view.to_vec()); } },
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::bounded_collection_retains_empty_records_remainder_and_exhaustion",
  },
  {
    id: "wrong-borrowed-bytes",
    source: mutateDynSource(
      `                Some(provider) => provider.next().await,
`,
      `                Some(provider) => provider.next().await.map(|_| &b"wrong"[..]),
`,
    ),
    testName:
      "__rust_workshop_hidden_tests::borrowed_bytes_are_forwarded_without_substitution",
  },
];

export const dynTransferBoundaries: readonly TransferBoundary[] = [
  {
    id: "future-overlap",
    failSuffix: `${dynTransferSupport}
fn forbidden_future_overlap() {
    let rows = vec![b"first".to_vec()];
    let mut sources = local_sources(&rows);
    let first = sources.next_at(0);
    let second = sources.next_at(0);
    drop(second);
    drop(first); // The first mutable borrow is still live here.
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn future_drop_allows_reuse() {
    let rows = vec![b"first".to_vec()];
    let mut sources = local_sources(&rows);
    let first = sources.next_at(0);
    drop(first);
    assert_eq!(run(sources.next_at(0)), Some(rows[0].as_slice()));
}
`,
    passTestName: "future_drop_allows_reuse",
    diagnosticCodes: ["E0499"],
  },
  {
    id: "slice-overlap",
    failSuffix: `${dynTransferSupport}
fn forbidden_slice_overlap() {
    let rows = vec![b"first".to_vec(), b"second".to_vec()];
    let mut sources = local_sources(&rows);
    let first = run(sources.next_at(0)).unwrap();
    let second = sources.next_at(0);
    drop(second);
    assert_eq!(first, b"first"); // Live last use forbids the second mutable borrow.
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn slice_last_use_allows_reuse() {
    let rows = vec![b"first".to_vec(), b"second".to_vec()];
    let mut sources = local_sources(&rows);
    let first = run(sources.next_at(0)).unwrap();
    assert_eq!(first, b"first");
    assert_eq!(run(sources.next_at(0)), Some(rows[1].as_slice()));
}
`,
    passTestName: "slice_last_use_allows_reuse",
    diagnosticCodes: ["E0499"],
  },
  {
    id: "borrowed-output-escape",
    failSuffix: `${dynTransferSupport}
fn forbidden_output_escape<'a>() -> &'a [u8] {
    let rows = vec![b"local".to_vec()];
    let mut sources = local_sources(&rows);
    run(sources.next_at(0)).unwrap()
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn owned_output_survives_owners() {
    let owned = {
        let rows = vec![vec![0xff, 0x00], vec![]];
        let mut sources = local_sources(&rows);
        run(sources.collect_at(0, 4))
    };
    assert_eq!(owned, vec![vec![0xff, 0x00], vec![]]);
}
`,
    passTestName: "owned_output_survives_owners",
    diagnosticCodes: ["E0515"],
  },
  {
    id: "future-escape",
    failSuffix: `${dynTransferSupport}
fn forbidden_future_escape<'a>() -> std::pin::Pin<Box<dyn Future<Output = Option<&'a [u8]>> + 'a>> {
    let rows = vec![b"local".to_vec()];
    let mut sources = local_sources(&rows);
    sources.next_at(0)
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn future_finishes_with_live_owners() {
    let rows = vec![b"local".to_vec()];
    let mut sources = local_sources(&rows);
    assert_eq!(run(sources.next_at(0)), Some(rows[0].as_slice()));
}
`,
    passTestName: "future_finishes_with_live_owners",
    diagnosticCodes: ["E0515"],
  },
  {
    id: "provider-send",
    failSuffix: `${dynTransferSupport}
fn requires_send<T: Send>(_: T) {}
fn forbidden_send_requirement() {
    let rows = vec![b"local".to_vec()];
    requires_send(ReadyLocal::new(&rows, Rc::new(Observed::default())));
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn non_send_providers_are_accepted() {
    let rows = vec![b"local".to_vec()];
    let seen = Rc::new(Observed::default());
    let mut sources = BoxedSources::new(vec![Box::new(ReadyLocal::new(&rows, seen.clone()))]);
    assert_eq!(run(sources.next_at(0)), Some(rows[0].as_slice()));
    assert_eq!(seen.calls.get(), 1);
}
`,
    passTestName: "non_send_providers_are_accepted",
    diagnosticCodes: ["E0277"],
  },
  {
    id: "provider-static",
    failSuffix: `${dynTransferSupport}
fn requires_static(_: Box<dyn BorrowedProvider + 'static>) {}
fn forbidden_static_requirement() {
    let rows = vec![b"local".to_vec()];
    requires_static(Box::new(ReadyLocal::new(&rows, Rc::new(Observed::default()))));
}
`,
    passSuffix: `${dynTransferSupport}
#[test]
fn local_providers_are_accepted() {
    let rows = vec![b"local".to_vec()];
    let mut sources = local_sources(&rows);
    assert_eq!(run(sources.collect_at(0, 2)), rows);
}
`,
    passTestName: "local_providers_are_accepted",
    diagnosticCodes: ["E0597"],
  },
];
