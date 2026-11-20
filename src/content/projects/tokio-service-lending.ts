import type { ProjectPackage } from "../../domain/types";

const lendingStarter = String.raw`#![forbid(unsafe_code)]

use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub const MAX_PACKET_BYTES: usize = 4096;
pub const MAX_PACKET_RECORDS: usize = 32;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PacketError {
    TooLarge { length: usize, limit: usize },
    TooMany { count: usize, limit: usize },
}

#[derive(Debug)]
pub struct PacketSource {
    packets: Vec<Box<[u8]>>,
    cursor: std::cell::Cell<usize>,
    pending_once: bool,
}

impl PacketSource {
    pub fn new<I, B>(packets: I) -> Result<Self, PacketError>
    where
        I: IntoIterator<Item = B>,
        B: Into<Vec<u8>>,
    {
        let mut owned = Vec::new();
        for (index, packet) in packets.into_iter().enumerate() {
            if index >= MAX_PACKET_RECORDS {
                return Err(PacketError::TooMany {
                    count: index + 1,
                    limit: MAX_PACKET_RECORDS,
                });
            }
            let packet = packet.into();
            if packet.len() > MAX_PACKET_BYTES {
                return Err(PacketError::TooLarge {
                    length: packet.len(),
                    limit: MAX_PACKET_BYTES,
                });
            }
            owned.push(packet.into_boxed_slice());
        }
        Ok(Self {
            packets: owned,
            cursor: std::cell::Cell::new(0),
            pending_once: true,
        })
    }

    pub fn cursor(&self) -> usize {
        self.cursor.get()
    }

    pub fn receive(&mut self) -> ReceiveFuture<'_> {
        let pending = self.pending_once;
        self.pending_once = false;
        ReceiveFuture {
            source: Some(self),
            pending,
        }
    }
}

pub struct ReceiveFuture<'a> {
    source: Option<&'a mut PacketSource>,
    pending: bool,
}

impl<'a> Future for ReceiveFuture<'a> {
    type Output = Option<BorrowedPacket<'a>>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        if this.pending {
            this.pending = false;
            cx.waker().wake_by_ref();
            return Poll::Pending;
        }
        let source_ref = match this.source.as_ref() {
            Some(source) => source,
            None => return Poll::Ready(None),
        };
        let index = source_ref.cursor.get();
        let available = source_ref.packets.get(index).is_some();
        let source = this.source.take().expect("receive future polled once");
        if available {
            Poll::Ready(Some(BorrowedPacket {
                source: Some(source),
                index,
            }))
        } else {
            Poll::Ready(None)
        }
    }
}

pub struct BorrowedPacket<'a> {
    source: Option<&'a mut PacketSource>,
    index: usize,
}

impl BorrowedPacket<'_> {
    pub fn sequence(&self) -> usize {
        self.index
    }

    pub fn bytes(&self) -> &[u8] {
        &self
            .source
            .as_ref()
            .expect("borrowed packet owns source")
            .packets[self.index]
    }

    pub fn commit(mut self) -> CommittedPacket {
        let source = self.source.take().expect("borrowed packet owns source");
        debug_assert_eq!(source.cursor.get(), self.index);
        source.cursor.set(self.index + 1);
        CommittedPacket {
            sequence: self.index,
            length: source.packets[self.index].len(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommittedPacket {
    pub sequence: usize,
    pub length: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VisitReport {
    pub visited: usize,
    pub committed: usize,
}

#[derive(Debug, PartialEq, Eq)]
pub struct VisitError<E> {
    pub error: E,
    pub visited: usize,
    pub committed: usize,
}

pub async fn visit_sequentially<F, E>(
    source: &mut PacketSource,
    mut visit: F,
) -> Result<VisitReport, VisitError<E>>
where
    F: AsyncFnMut(&[u8]) -> Result<(), E>,
{
    let mut report = VisitReport {
        visited: 0,
        committed: 0,
    };
    while let Some(packet) = source.receive().await {
        report.visited += 1;
        let result = visit(packet.bytes()).await;
        match result {
            Ok(()) => {
                let _ = packet.commit();
                report.committed += 1;
            }
            Err(error) => {
                return Err(VisitError {
                    error,
                    visited: report.visited,
                    committed: report.committed,
                });
            }
        }
    }
    Ok(report)
}
`;

const lendingSolution = lendingStarter.replace(
  "type Output = Option<BorrowedPacket<'static>>;",
  "type Output = Option<BorrowedPacket<'static>>;",
);

const reportStarter = String.raw`#![forbid(unsafe_code)]

use std::future::Future;
use std::pin::Pin;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OwnedReport {
    pub sequence: usize,
    pub bytes: Vec<u8>,
}

#[derive(Clone, Debug)]
pub struct ReportSource {
    reports: Vec<OwnedReport>,
    cursor: usize,
}

impl ReportSource {
    pub fn new(reports: Vec<OwnedReport>) -> Self {
        Self { reports, cursor: 0 }
    }

    pub fn next_owned(&mut self) -> Option<OwnedReport> {
        todo!("take one owned report")
    }
}

#[allow(clippy::manual_async_fn)]
pub fn owned_report_future(
    mut source: ReportSource,
) -> impl Future<Output = Vec<OwnedReport>> + Send + 'static {
    async move {
        let mut reports = Vec::new();
        while let Some(report) = source.next_owned() {
            reports.push(report);
        }
        reports
    }
}

pub trait LocalReportProvider {
    fn next_boxed<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<OwnedReport>> + 'a>>;
}

pub struct BoxedReportProvider<'a> {
    provider: Box<dyn LocalReportProvider + 'a>,
}

impl<'a> BoxedReportProvider<'a> {
    pub fn new<P>(provider: P) -> Self
    where
        P: LocalReportProvider + 'a,
    {
        Self {
            provider: Box::new(provider),
        }
    }

    pub async fn collect(mut self) -> Vec<OwnedReport> {
        let mut reports = Vec::new();
        while let Some(report) = self.provider.next_boxed().await {
            reports.push(report);
        }
        reports
    }
}

pub async fn collect_boxed(provider: BoxedReportProvider<'_>) -> Vec<OwnedReport> {
    provider.collect().await
}
`;

const reportSolution = reportStarter.replace(
  '        todo!("take one owned report")',
  "        let report = self.reports.get(self.cursor)?.clone();\n        self.cursor += 1;\n        Some(report)",
);

const lendingTests = String.raw`use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Wake, Waker};
use tokio_service_workshop::lending::{PacketError, PacketSource, VisitError};

struct WakeCounter(std::sync::atomic::AtomicUsize);
impl Wake for WakeCounter {
    fn wake(self: Arc<Self>) {
        self.0.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    }
}

#[tokio::test]
async fn receive_controls_pending_and_ready_without_losing_bytes() {
    let mut source = PacketSource::new(vec![b"pierwszy".to_vec(), b"drugi".to_vec()]).unwrap();
    let mut future = Box::pin(source.receive());
    let wake = Arc::new(WakeCounter(std::sync::atomic::AtomicUsize::new(0)));
    let waker = Waker::from(wake.clone());
    let mut cx = Context::from_waker(&waker);
    assert!(future.as_mut().poll(&mut cx).is_pending());
    let packet = match future.as_mut().poll(&mut cx) {
        std::task::Poll::Ready(Some(packet)) => packet,
        _ => panic!("expected first packet"),
    };
    assert_eq!(packet.sequence(), 0);
    assert_eq!(packet.bytes(), b"pierwszy");
    assert!(wake.0.load(std::sync::atomic::Ordering::SeqCst) > 0);
    assert_eq!(packet.commit().length, 8);
    assert!(matches!(
        future.as_mut().poll(&mut cx),
        std::task::Poll::Ready(None)
    ));
    assert!(matches!(
        future.as_mut().poll(&mut cx),
        std::task::Poll::Ready(None)
    ));
    assert_eq!(source.cursor(), 1);
}

#[tokio::test]
async fn consumer_does_not_repoll_callback_after_ready() {
    let mut source = PacketSource::new(vec![b"callback".to_vec()]).unwrap();
    let mut callback_calls = 0usize;
    let report = tokio_service_workshop::lending::visit_sequentially(&mut source, async |_| {
        callback_calls += 1;
        std::future::ready(()).await;
        Ok::<(), ()>(())
    })
    .await
    .unwrap();
    assert_eq!(report.committed, 1);
    assert_eq!(callback_calls, 1);
}

#[tokio::test]
async fn callback_error_does_not_commit_the_packet_and_stops() {
    let mut source = PacketSource::new(vec![b"a".to_vec(), b"b".to_vec(), b"c".to_vec()]).unwrap();
    let mut seen = Vec::new();
    let result = tokio_service_workshop::lending::visit_sequentially(&mut source, async |bytes| {
        seen.push(bytes[0]);
        if bytes == b"b" { Err("stop") } else { Ok(()) }
    })
    .await;
    assert_eq!(seen, vec![b'a', b'b']);
    assert_eq!(
        result,
        Err(VisitError {
            error: "stop",
            visited: 2,
            committed: 1
        })
    );
    assert_eq!(source.cursor(), 1);
}

#[tokio::test]
async fn borrowed_callback_can_suspend_then_be_dropped_without_losing_effects() {
    let mut source = PacketSource::new(vec![b"prior".to_vec(), b"retry".to_vec()]).unwrap();
    let mut effects = Vec::new();
    let mut callback_count = 0usize;
    let mut first_poll = true;
    let mut recorded = false;
    let mut visitor = Box::pin(tokio_service_workshop::lending::visit_sequentially(
        &mut source,
        async |bytes| {
            callback_count += 1;
            if callback_count == 1 {
                return Ok::<(), ()>(());
            }
            if !recorded {
                effects.push(bytes.to_vec());
                recorded = true;
            }
            std::future::poll_fn(|cx| {
                assert_eq!(bytes, b"retry");
                if first_poll {
                    first_poll = false;
                    cx.waker().wake_by_ref();
                    std::task::Poll::Pending
                } else {
                    std::task::Poll::Ready(())
                }
            })
            .await;
            Ok::<(), ()>(())
        },
    ));
    let wake = Arc::new(WakeCounter(std::sync::atomic::AtomicUsize::new(0)));
    let waker = Waker::from(wake);
    let mut cx = Context::from_waker(&waker);
    assert!(visitor.as_mut().poll(&mut cx).is_pending());
    assert!(visitor.as_mut().poll(&mut cx).is_pending());
    drop(visitor);
    assert_eq!(effects, vec![b"retry".to_vec()]);
    assert_eq!(source.cursor(), 1);

    let retry = tokio_service_workshop::lending::visit_sequentially(&mut source, async |bytes| {
        assert_eq!(bytes, b"retry");
        effects.push(bytes.to_vec());
        Ok::<(), ()>(())
    })
    .await
    .unwrap();
    assert_eq!(retry.committed, 1);
    assert_eq!(source.cursor(), 2);
    assert_eq!(effects, vec![b"retry".to_vec(), b"retry".to_vec()]);
}

#[tokio::test]
async fn a_second_borrow_is_available_only_after_the_first_commit() {
    let mut source = PacketSource::new(vec![b"a".to_vec(), b"b".to_vec()]).unwrap();
    let first = source.receive().await.unwrap();
    assert_eq!(first.bytes(), b"a");
    let _ = first.commit();
    let second = source.receive().await.unwrap();
    assert_eq!(second.bytes(), b"b");
}

#[test]
fn packet_source_rejects_more_than_the_bounded_record_budget() {
    let packets = (0..33).map(|_| vec![0u8]);
    assert!(matches!(
        PacketSource::new(packets),
        Err(PacketError::TooMany {
            count: 33,
            limit: 32,
        })
    ));
}
`;

const reportTests = String.raw`use std::pin::Pin;
use tokio_service_workshop::report_source::{
    BoxedReportProvider, LocalReportProvider, OwnedReport, ReportSource,
};

#[tokio::test]
async fn owned_future_can_cross_tokio_spawn() {
    let source = ReportSource::new(vec![OwnedReport {
        sequence: 1,
        bytes: b"raport".to_vec(),
    }]);
    let handle = tokio::spawn(tokio_service_workshop::report_source::owned_report_future(
        source,
    ));
    assert_eq!(handle.await.unwrap()[0].bytes, b"raport");
}

struct LocalProvider<'a> {
    source: &'a [u8],
    done: bool,
    calls: &'a std::cell::Cell<usize>,
}
impl LocalReportProvider for LocalProvider<'_> {
    fn next_boxed<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<OwnedReport>> + 'a>> {
        self.calls.set(self.calls.get() + 1);
        Box::pin(async move {
            if self.done {
                return None;
            }
            self.done = true;
            Some(OwnedReport {
                sequence: 0,
                bytes: self.source.to_vec(),
            })
        })
    }
}

#[tokio::test(flavor = "current_thread")]
async fn boxed_adapter_keeps_a_local_provider_lifetime() {
    let local = String::from("lokalne dane");
    let calls = std::cell::Cell::new(0);
    let provider = BoxedReportProvider::new(LocalProvider {
        source: local.as_bytes(),
        done: false,
        calls: &calls,
    });
    assert_eq!(calls.get(), 0);
    let collection = Box::pin(provider.collect());
    assert_eq!(calls.get(), 0);
    let reports = collection.await;
    assert_eq!(reports[0].bytes, local.as_bytes());
    assert_eq!(calls.get(), 2);
}
`;

const example = String.raw`use tokio_service_workshop::{
    lending::{PacketSource, visit_sequentially},
    report_source::{OwnedReport, ReportSource, owned_report_future},
};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let mut source =
        PacketSource::new(vec![b"pierwszy".to_vec(), b"drugi".to_vec()]).expect("bounded packets");
    let mut total = 0usize;
    let report = visit_sequentially(&mut source, async |packet| {
        total += packet.len();
        Ok::<(), ()>(())
    })
    .await
    .expect("visitor completes");
    println!("odwiedzono={} bajtow={}", report.committed, total);

    let owned = ReportSource::new(vec![OwnedReport {
        sequence: 7,
        bytes: b"owned".to_vec(),
    }]);
    let reports = tokio::spawn(owned_report_future(owned))
        .await
        .expect("join");
    println!("raportow={}", reports.len());
}
`;

const asyncLendingReadme = String.raw`# Async lending contracts

Ten dodatek do laboratorium serwisu TCP skupia się na granicy między pożyczonym wynikiem i pracą wysłaną do zadania.

## Własność i zawieszenie

\`\`\`text
PacketSource --receive()--> ReceiveFuture --Pending--> wake
      |                         |
      |                         +-- Ready(BorrowedPacket<'source>)
      |                                      |
      |                         callback borrows bytes and awaits
      |                                      |
      +<-------------------------- commit() only after callback Ready
\`\`\`

\`BorrowedPacket\` trzyma wyłączną pożyczkę źródła. Drop po \`Pending\` albo błąd callbacku nie przesuwa kursora. Dopiero \`commit\` po ukończonym callbacku zapisuje postęp. Efekt wykonany przez callback nie jest cofany przez późniejsze anulowanie.

## Granica Send

\`owned_report_future(ReportSource)\` przenosi wyłącznie dane posiadane i zwraca \`Future + Send + 'static\`, więc może wejść do \`tokio::spawn\`. \`BoxedReportProvider<'a>\` jest osobnym adapterem: pozwala przechować heterogenicznego providera z lokalnym lifetime, ale kosztuje alokację pudełka i dynamiczne wywołanie. Nie udajemy, że każdy trait z rodzinnym wynikiem jest automatycznie dyn-compatible.

## Ograniczenia

Pakiet ogranicza pojedynczy rekord do 4096 bajtów, całość do 32 rekordów i utrzymuje sekwencyjne odwiedzanie. Test kontraktowy polluje borrowed callback do Pending, obserwuje trwały efekt po Drop, a następnie ponawia ten sam rekord bez cofania wcześniejszych commitów. Nie zapewnia transakcyjnego rollbacku efektów callbacku, exactly-once ani anulowania arbitralnej pracy blokującej.
`;

export const tokioServiceLendingFiles: ProjectPackage["files"] = [
  {
    path: "src/lending.rs",
    starter: lendingStarter,
    solution: lendingSolution,
  },
  {
    path: "src/report_source.rs",
    starter: reportStarter,
    solution: reportSolution,
  },
  { path: "examples/borrowed_batch.rs", starter: example, solution: example },
  {
    path: "tests/lending_contract.rs",
    starter: lendingTests + "\n" + reportTests,
    solution: lendingTests + "\n" + reportTests,
  },
  {
    path: "ASYNC-LENDING.md",
    starter: asyncLendingReadme,
    solution: asyncLendingReadme,
  },
];
