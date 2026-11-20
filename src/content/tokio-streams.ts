import {
  receiverBatchTransfer,
  receiverPartitionTransfer,
} from "./tokio-shutdown-recovery";
import { choose, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const takeAtMostTests = `#[tokio::test(flavor = "current_thread")]
async fn bounded_read_waits_through_pending_and_leaves_the_suffix() {
    use std::{
        cell::{Cell, RefCell},
        collections::VecDeque,
        marker::PhantomPinned,
        pin::Pin,
        rc::Rc,
        task::{Context, Poll},
    };
    use tokio_stream::{Stream, StreamExt};

    struct Payload(String);

    struct Scripted {
        steps: RefCell<VecDeque<Poll<Option<Payload>>>>,
        polls: Rc<Cell<usize>>,
        _pin: PhantomPinned,
    }

    impl Scripted {
        fn new(steps: Vec<Poll<Option<Payload>>>, polls: Rc<Cell<usize>>) -> Self {
            Self {
                steps: RefCell::new(steps.into()),
                polls,
                _pin: PhantomPinned,
            }
        }
    }

    impl Stream for Scripted {
        type Item = Payload;

        fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            let this = self.as_ref().get_ref();
            this.polls.set(this.polls.get() + 1);
            match this.steps.borrow_mut().pop_front().unwrap_or(Poll::Ready(None)) {
                Poll::Pending => {
                    cx.waker().wake_by_ref();
                    Poll::Pending
                }
                Poll::Ready(value) => Poll::Ready(value),
            }
        }
    }

    let polls = Rc::new(Cell::new(0));
    let source = Scripted::new(
        vec![
            Poll::Pending,
            Poll::Ready(Some(Payload(String::from("first")))),
            Poll::Ready(Some(Payload(String::from("second")))),
            Poll::Ready(Some(Payload(String::from("suffix")))),
        ],
        Rc::clone(&polls),
    );
    tokio::pin!(source);

    let values = take_at_most(source.as_mut(), 2).await;
    assert_eq!(
        values.into_iter().map(|payload| payload.0).collect::<Vec<_>>(),
        vec![String::from("first"), String::from("second")],
    );
    assert_eq!(polls.get(), 3, "limit must prevent an extra poll");
    assert_eq!(source.as_mut().next().await.unwrap().0, "suffix");
}

#[tokio::test(flavor = "current_thread")]
async fn zero_limit_does_not_poll_a_pinned_stream() {
    use std::{cell::Cell, marker::PhantomPinned, pin::Pin, rc::Rc, task::{Context, Poll}};
    use tokio_stream::Stream;

    struct NeverPolled {
        polls: Rc<Cell<usize>>,
        _pin: PhantomPinned,
    }

    impl Stream for NeverPolled {
        type Item = String;

        fn poll_next(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            self.as_ref().get_ref().polls.set(self.as_ref().get_ref().polls.get() + 1);
            Poll::Ready(Some(String::from("unexpected")))
        }
    }

    let polls = Rc::new(Cell::new(0));
    let source = NeverPolled { polls: Rc::clone(&polls), _pin: PhantomPinned };
    tokio::pin!(source);
    assert!(take_at_most(source.as_mut(), 0).await.is_empty());
    assert_eq!(polls.get(), 0);
}

#[tokio::test(flavor = "current_thread")]
async fn a_limit_above_the_remaining_items_stops_at_none_once() {
    use std::{cell::Cell, collections::VecDeque, pin::Pin, rc::Rc, task::{Context, Poll}};
    use tokio_stream::Stream;

    struct Finite {
        values: VecDeque<Option<String>>,
        polls: Rc<Cell<usize>>,
    }

    impl Stream for Finite {
        type Item = String;

        fn poll_next(mut self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            self.polls.set(self.polls.get() + 1);
            Poll::Ready(self.values.pop_front().unwrap_or(None))
        }
    }

    let short_polls = Rc::new(Cell::new(0));
    let mut short = Finite {
        values: vec![Some(String::from("only")), None].into(),
        polls: Rc::clone(&short_polls),
    };
    assert_eq!(take_at_most(Pin::new(&mut short), 10).await, vec![String::from("only")]);
    assert_eq!(short_polls.get(), 2, "None must end the loop without another poll");

    let empty_polls = Rc::new(Cell::new(0));
    let mut empty = Finite {
        values: vec![None].into(),
        polls: Rc::clone(&empty_polls),
    };
    assert!(take_at_most(Pin::new(&mut empty), 10).await.is_empty());
    assert_eq!(empty_polls.get(), 1, "an empty stream is polled only for its EOF");
}`;

const firstMatchingTests = `#[tokio::test(flavor = "current_thread")]
async fn first_matching_returns_the_owned_match_and_keeps_the_suffix() {
    use std::{
        cell::{Cell, RefCell},
        collections::VecDeque,
        marker::PhantomPinned,
        pin::Pin,
        rc::Rc,
        task::{Context, Poll},
    };
    use tokio_stream::{Stream, StreamExt};

    struct Record { label: String }

    struct Scripted {
        steps: RefCell<VecDeque<Poll<Option<Record>>>>,
        polls: Rc<Cell<usize>>,
        _pin: PhantomPinned,
    }

    impl Stream for Scripted {
        type Item = Record;

        fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            let this = self.as_ref().get_ref();
            this.polls.set(this.polls.get() + 1);
            match this.steps.borrow_mut().pop_front().unwrap_or(Poll::Ready(None)) {
                Poll::Pending => { cx.waker().wake_by_ref(); Poll::Pending }
                Poll::Ready(value) => Poll::Ready(value),
            }
        }
    }

    let polls = Rc::new(Cell::new(0));
    let source = Scripted {
        steps: RefCell::new(vec![
            Poll::Pending,
            Poll::Ready(Some(Record { label: String::from("skip") })),
            Poll::Ready(Some(Record { label: String::from("match") })),
            Poll::Ready(Some(Record { label: String::from("suffix") })),
        ].into()),
        polls: Rc::clone(&polls),
        _pin: PhantomPinned,
    };
    let wanted = String::from("match");
    tokio::pin!(source);

    let found = first_matching(source.as_mut(), |record| {
        record.label.as_str() == wanted.as_str()
    }).await.unwrap();

    assert_eq!(found.label, "match");
    assert_eq!(wanted, "match", "the predicate borrowed its local value");
    assert_eq!(polls.get(), 3);
    assert_eq!(source.as_mut().next().await.unwrap().label, "suffix");
}

#[tokio::test(flavor = "current_thread")]
async fn first_matching_handles_first_match_no_match_and_empty_streams() {
    use std::pin::Pin;
    use tokio_stream::{StreamExt, iter};

    struct Record(String);

    let mut first = iter(vec![
        Record(String::from("match")),
        Record(String::from("suffix")),
    ]);
    let found = first_matching(Pin::new(&mut first), |record| record.0 == "match")
        .await
        .unwrap();
    assert_eq!(found.0, "match");
    assert_eq!(first.next().await.unwrap().0, "suffix");

    let mut no_match = iter(vec![Record(String::from("skip"))]);
    assert!(first_matching(Pin::new(&mut no_match), |record| record.0 == "match")
        .await
        .is_none());

    let mut empty = iter(Vec::<Record>::new());
    assert!(first_matching(Pin::new(&mut empty), |_| true).await.is_none());
}`;

const closeAndDrainTests = `#[tokio::test(flavor = "current_thread")]
async fn close_and_drain_rejects_a_sender_but_keeps_a_preissued_permit_value() {
    use std::{future::{poll_fn, Future}, task::Poll};
    use tokio::sync::mpsc;
    use tokio_stream::wrappers::ReceiverStream;

    struct Ticket { label: String }

    let (tx, rx) = mpsc::channel(2);
    tx.send(Ticket { label: String::from("buffered") }).await.unwrap();
    let permit = tx.reserve().await.unwrap();
    let draining = close_and_drain(ReceiverStream::new(rx));
    tokio::pin!(draining);

    poll_fn(|cx| {
        assert!(draining.as_mut().poll(cx).is_pending());
        Poll::Ready(())
    }).await;

    assert!(matches!(
        tx.try_send(Ticket { label: String::from("rejected") }),
        Err(mpsc::error::TrySendError::Closed(_))
    ));
    permit.send(Ticket { label: String::from("reserved") });
    drop(tx);

    let labels = draining.await.into_iter().map(|ticket| ticket.label).collect::<Vec<_>>();
    assert_eq!(labels, vec![String::from("buffered"), String::from("reserved")]);
}`;

const nextOrStopTests = `#[tokio::test(flavor = "current_thread")]
async fn stop_wins_without_consuming_the_queued_receiver_stream_item() {
    use std::{future::{poll_fn, Future}, task::Poll};
    use tokio::sync::{mpsc, oneshot};
    use tokio_stream::{wrappers::ReceiverStream, StreamExt};

    let (tx, rx) = mpsc::channel(1);
    let mut stream = ReceiverStream::new(rx);
    let (stop_tx, mut stop) = oneshot::channel();

    {
        let waiting = next_or_stop(&mut stream, &mut stop);
        tokio::pin!(waiting);
        poll_fn(|cx| {
            assert!(waiting.as_mut().poll(cx).is_pending());
            Poll::Ready(())
        }).await;
    }

    tx.send(String::from("queued")).await.unwrap();
    stop_tx.send(()).unwrap();
    assert!(matches!(next_or_stop(&mut stream, &mut stop).await, Read::Stopped));
    assert_eq!(stream.next().await.as_deref(), Some("queued"));
}

#[tokio::test(flavor = "current_thread")]
async fn an_open_stop_returns_an_owned_item_and_preserves_the_follow_up() {
    use tokio::sync::{mpsc, oneshot};
    use tokio_stream::{wrappers::ReceiverStream, StreamExt};

    struct Job(String);

    let (tx, rx) = mpsc::channel(2);
    tx.send(Job(String::from("first"))).await.unwrap();
    tx.send(Job(String::from("follow-up"))).await.unwrap();
    let mut stream = ReceiverStream::new(rx);
    let (_stop_tx, mut stop) = oneshot::channel();

    match next_or_stop(&mut stream, &mut stop).await {
        Read::Item(job) => assert_eq!(job.0, "first"),
        Read::Closed | Read::Stopped => panic!("the open stop must not replace a queued item"),
    }
    assert_eq!(stream.next().await.unwrap().0, "follow-up");
}

#[tokio::test(flavor = "current_thread")]
async fn dropped_stop_sender_is_stopped_and_closed_stream_is_distinct() {
    use tokio::sync::{mpsc, oneshot};
    use tokio_stream::wrappers::ReceiverStream;

    let (_tx, rx) = mpsc::channel::<String>(1);
    let mut stream = ReceiverStream::new(rx);
    let (stop_tx, mut stop) = oneshot::channel();
    drop(stop_tx);
    assert!(matches!(next_or_stop(&mut stream, &mut stop).await, Read::Stopped));

    let (tx, rx) = mpsc::channel::<String>(1);
    drop(tx);
    let mut closed_stream = ReceiverStream::new(rx);
    let (_stop_tx, mut open_stop) = oneshot::channel();
    assert!(matches!(next_or_stop(&mut closed_stream, &mut open_stop).await, Read::Closed));
}`;

const takeAtMostStarter = `use std::pin::Pin;
use tokio_stream::Stream;

async fn take_at_most<S>(stream: Pin<&mut S>, limit: usize) -> Vec<S::Item>
where
    S: Stream + ?Sized,
{
    let _ = (stream, limit);
    Vec::new()
}`;

const takeAtMostSolution = `use std::pin::Pin;
use tokio_stream::{Stream, StreamExt};

async fn take_at_most<S>(mut stream: Pin<&mut S>, limit: usize) -> Vec<S::Item>
where
    S: Stream + ?Sized,
{
    let mut values = Vec::new();

    while values.len() < limit {
        match stream.as_mut().next().await {
            Some(value) => values.push(value),
            None => break,
        }
    }

    values
}`;

const firstMatchingSolution = `use std::pin::Pin;
use tokio_stream::{Stream, StreamExt};

async fn first_matching<S, F>(mut stream: Pin<&mut S>, mut predicate: F) -> Option<S::Item>
where
    S: Stream + ?Sized,
    F: FnMut(&S::Item) -> bool,
{
    while let Some(value) = stream.as_mut().next().await {
        if predicate(&value) {
            return Some(value);
        }
    }

    None
}`;

const closeAndDrainStarter = `use tokio_stream::wrappers::ReceiverStream;

async fn close_and_drain<T>(stream: ReceiverStream<T>) -> Vec<T> {
    let _ = stream;
    Vec::new()
}`;

const closeAndDrainSolution = `use tokio_stream::{wrappers::ReceiverStream, StreamExt};

async fn close_and_drain<T>(mut stream: ReceiverStream<T>) -> Vec<T> {
    stream.close();
    let mut values = Vec::new();

    while let Some(value) = stream.next().await {
        values.push(value);
    }

    values
}`;

const nextOrStopSolution = `use tokio::sync::oneshot;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

enum Read<T> {
    Item(T),
    Closed,
    Stopped,
}

async fn next_or_stop<T>(
    stream: &mut ReceiverStream<T>,
    stop: &mut oneshot::Receiver<()>,
) -> Read<T> {
    tokio::select! {
        biased;
        _ = stop => Read::Stopped,
        value = stream.next() => match value {
            Some(value) => Read::Item(value),
            None => Read::Closed,
        },
    }
}`;

const streamPendingRun = `use std::{
    cell::RefCell,
    collections::VecDeque,
    pin::Pin,
    task::{Context, Poll},
};
use tokio_stream::{Stream, StreamExt};

struct Scripted {
    steps: RefCell<VecDeque<Poll<Option<&'static str>>>>,
}

impl Stream for Scripted {
    type Item = &'static str;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        match self.as_ref().get_ref().steps.borrow_mut().pop_front().unwrap_or(Poll::Ready(None)) {
            Poll::Pending => {
                cx.waker().wake_by_ref();
                Poll::Pending
            }
            Poll::Ready(value) => Poll::Ready(value),
        }
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let mut stream = Scripted {
        steps: RefCell::new(vec![
            Poll::Pending,
            Poll::Ready(Some("frame")),
            Poll::Ready(None),
        ].into()),
    };

    println!("first={:?}", stream.next().await);
    println!("second={:?}", stream.next().await);
}`;

const receiverCloseRun = `use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, rx) = mpsc::channel(2);
    tx.send(String::from("buffered")).await.unwrap();
    let permit = tx.reserve().await.unwrap();
    let mut stream = ReceiverStream::new(rx);

    stream.close();
    println!("ordinary_rejected={}", tx.send(String::from("late")).await.is_err());
    permit.send(String::from("reserved"));

    let mut drained = Vec::new();
    while let Some(value) = stream.next().await {
        drained.push(value);
    }
    println!("drained={drained:?}");
}`;

const nextFrameReviewStarter = `use std::pin::Pin;
use tokio_stream::Stream;

enum Frame<T> {
    Item(T),
    Closed,
}

async fn next_frame<S>(stream: Pin<&mut S>) -> Frame<S::Item>
where
    S: Stream + ?Sized,
{
    let _ = stream;
    Frame::Closed
}`;

const nextFrameReviewSolution = `use std::pin::Pin;
use tokio_stream::{Stream, StreamExt};

enum Frame<T> {
    Item(T),
    Closed,
}

async fn next_frame<S>(mut stream: Pin<&mut S>) -> Frame<S::Item>
where
    S: Stream + ?Sized,
{
    match stream.as_mut().next().await {
        Some(value) => Frame::Item(value),
        None => Frame::Closed,
    }
}`;

const nextFrameReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn next_frame_waits_for_an_owned_value_then_reports_eof() {
    use std::{cell::Cell, marker::PhantomPinned, pin::Pin, task::{Context, Poll}};
    use tokio_stream::Stream;
    struct Packet(String);
    struct Delayed {
        stage: Cell<u8>,
        _pin: PhantomPinned,
    }
    impl Stream for Delayed {
        type Item = Packet;
        fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Packet>> {
            let stage = &self.as_ref().get_ref().stage;
            let previous = stage.replace(stage.get() + 1);
            match previous {
                0 => { cx.waker().wake_by_ref(); Poll::Pending }
                1 => Poll::Ready(Some(Packet(String::from("frame")))),
                2 => Poll::Ready(None),
                _ => panic!("polled again after EOF"),
            }
        }
    }
    let stream = Delayed { stage: Cell::new(0), _pin: PhantomPinned };
    tokio::pin!(stream);
    match next_frame(stream.as_mut()).await {
        Frame::Item(packet) => assert_eq!(packet.0, "frame"),
        Frame::Closed => panic!("Pending is not EOF"),
    }
    assert!(matches!(next_frame(stream.as_mut()).await, Frame::Closed));
}`;

const stopThenDrainReviewStarter = `use tokio::sync::oneshot;
use tokio_stream::wrappers::ReceiverStream;

async fn stop_then_drain<T>(
    stream: &mut ReceiverStream<T>,
    stop: &mut oneshot::Receiver<()>,
) -> Vec<T> {
    let _ = (stream, stop);
    Vec::new()
}`;

const stopThenDrainReviewSolution = `use tokio::sync::oneshot;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

async fn stop_then_drain<T>(
    stream: &mut ReceiverStream<T>,
    stop: &mut oneshot::Receiver<()>,
) -> Vec<T> {
    let _ = stop.await;
    stream.close();

    let mut values = Vec::new();
    while let Some(value) = stream.next().await {
        values.push(value);
    }
    values
}`;

const stopThenDrainReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn stop_then_drain_keeps_values_accepted_before_close() {
    use std::{future::Future, pin::Pin, sync::Arc, task::{Context, Poll, Wake, Waker}};
    use tokio::sync::{mpsc, oneshot};
    use tokio_stream::wrappers::ReceiverStream;
    struct Silent;
    impl Wake for Silent { fn wake(self: Arc<Self>) {} }
    fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
        let waker = Waker::from(Arc::new(Silent));
        future.poll(&mut Context::from_waker(&waker))
    }
    struct Entry(String);
    for drop_stop in [false, true] {
        let (tx, rx) = mpsc::channel(2);
        tx.send(Entry(String::from("buffered"))).await.unwrap();
        let permit = tx.reserve().await.unwrap();
        let mut stream = ReceiverStream::new(rx);
        let (stop_tx, mut stop) = oneshot::channel();
        let mut draining = Box::pin(stop_then_drain(&mut stream, &mut stop));
        assert!(poll_once(draining.as_mut()).is_pending());
        assert!(!tx.is_closed(), "do not close before stop");
        assert_eq!(tx.capacity(), 0, "do not consume before stop");
        if drop_stop { drop(stop_tx); } else { stop_tx.send(()).unwrap(); }
        assert!(poll_once(draining.as_mut()).is_pending(), "outstanding permit is not EOF");
        assert!(tx.is_closed(), "both explicit stop and dropped sender must close admission");
        assert!(matches!(tx.try_send(Entry(String::from("late"))), Err(mpsc::error::TrySendError::Closed(_))));
        permit.send(Entry(String::from("reserved")));
        let labels = match poll_once(draining.as_mut()) {
            Poll::Ready(values) => values.into_iter().map(|entry| entry.0).collect::<Vec<_>>(),
            Poll::Pending => panic!("closed stream with no permits must finish draining"),
        };
        assert_eq!(labels, vec![String::from("buffered"), String::from("reserved")]);
    }
}`;

export const tokioStreamSources: Source[] = [
  {
    id: "tokio-stream-stream-ext-next",
    title: "tokio-stream 0.1.19: StreamExt::next",
    url: "https://docs.rs/tokio-stream/0.1.19/tokio_stream/trait.StreamExt.html#method.next",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie wymagania Unpin dla next albo sposobu użycia Pin<&mut S>.",
  },
  {
    id: "tokio-stream-receiver-stream",
    title: "tokio-stream 0.1.19: wrappers::ReceiverStream",
    url: "https://docs.rs/tokio-stream/0.1.19/tokio_stream/wrappers/struct.ReceiverStream.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie close, końca streamu albo relacji ReceiverStream z mpsc::Receiver.",
  },
  {
    id: "tokio-stream-mpsc-close",
    title: "Tokio 1.54.1: mpsc::Receiver::close",
    url: "https://docs.rs/tokio/1.54.1/tokio/sync/mpsc/struct.Receiver.html#method.close",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie odrzucania Sender, drenażu bufora lub wyjątku dla Permit wydanego przed close.",
  },
  {
    id: "tokio-stream-select-cancellation",
    title: "Tokio 1.54.1: tokio::select! i cancellation safety",
    url: "https://docs.rs/tokio/1.54.1/tokio/macro.select.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie listy cancellation-safe API albo reguł biased; w select!.",
  },
];

export const tokioStreamCompetencies: Competency[] = [
  {
    id: "consume-pinned-stream-with-a-bound",
    title:
      "Odbierasz elementy z generycznego przypiętego Stream bez Unpin i bez odpytywania poza limitem.",
  },
  {
    id: "preserve-unread-stream-state",
    title:
      "Zwracasz posiadany dopasowany element, zostawiając nieprzeczytany suffix tego samego Stream.",
  },
  {
    id: "close-and-drain-receiver-stream",
    title:
      "Zamykasz ReceiverStream dla nowych zwykłych send i drenujesz całą wcześniej zaakceptowaną pracę.",
  },
  {
    id: "stop-a-supported-receiver-stream-read",
    title:
      "Nadajesz stop pierwszeństwo nad gotową wiadomością, zachowując wiadomość w ReceiverStream po anulowaniu next.",
  },
];

export const tokioStreamConcepts: Concept[] = [
  {
    id: "tokio-stream-next-pinning",
    title: "Stream::next, Pin i granica odczytu",
    prerequisites: ["tokio-cancellation-safe-frame-progress"],
    competencyIds: [
      "consume-pinned-stream-with-a-bound",
      "preserve-unread-stream-state",
    ],
    reviewPrompt:
      "Dlaczego zwykłe wywołanie next wymaga Unpin, jak Pin<&mut S> pozwala obsłużyć !Unpin Stream oraz co dokładnie obiecuje limit odbioru?",
    reviewAnswer:
      "next pożycza stream przez &mut self, dlatego zwykłe wywołanie wymaga Unpin. Gdy źródło może być !Unpin, właściciel przypina je i przekazuje Pin<&mut S>; adapter wywołuje next na przypiętej pożyczce, nie przenosząc źródła. Limit jest granicą poll: po zebraniu dokładnie limitu elementów helper nie pyta o następny element, więc nie może go zużyć ani nawet zaobserwować. Pending znaczy tylko brak gotowego elementu teraz; None znaczy koniec streamu.",
    distinguish:
      "Pin chroni położenie wartości, a nie tworzy kolejki ani nie zamienia Pending w EOF. Adapter może zwrócić posiadany Item i zostawić suffix w tym samym streamie, ale nie może obiecać ogólnej cancellation safety dowolnej własnej implementacji Stream. Dla tej części kontrakt bezpieczeństwa anulowania jest sprawdzany osobno dla udokumentowanych wrapperów Tokio.",
  },
  {
    id: "tokio-receiver-stream-shutdown",
    title: "ReceiverStream: close, drain i stop bez utraty kolejki",
    prerequisites: ["tokio-stream-next-pinning"],
    competencyIds: [
      "close-and-drain-receiver-stream",
      "stop-a-supported-receiver-stream-read",
    ],
    reviewPrompt:
      "Co close robi z nowym Sender, buforem i Permit wydanym wcześniej oraz dlaczego stop w select! nie musi usuwać gotowej wiadomości z ReceiverStream?",
    reviewAnswer:
      "close zatrzymuje kolejne zwykłe send, ale odbiorca nadal ma obowiązek czytać aż do None, aby zachować elementy już w buforze. Permit zdobyty przed close może jeszcze wysłać jedną wartość, więc także ona należy do drenażu. Dla ReceiverStream next korzysta z udokumentowanego cancellation-safe odbioru mpsc: gdy stop wygra gałąź select!, upuszczone oczekiwanie next nie pobiera wiadomości. W tej lekcji biased; jest jawną polityką, aby stop wygrał, gdy oba wyniki są gotowe.",
    distinguish:
      "close nie jest Drop: zachowuje odbiornik i zbuforowane dane, natomiast Drop odbiornika informuje Sender o braku odbiorcy. Stop tej lekcji kończy jedno oczekiwanie i nie jest globalnym rollbackiem ani obietnicą dla dowolnego Stream. Kolejna wiadomość pozostaje dostępna tylko dlatego, że kontrakt jest ograniczony do ReceiverStream nad Tokio mpsc.",
  },
];

export const tokioStreamLessons: Lesson[] = [
  {
    id: "tokio-stream-next",
    moduleId: "tokio-io-streams",
    conceptIds: ["tokio-stream-next-pinning"],
    competencyIds: [
      "consume-pinned-stream-with-a-bound",
      "preserve-unread-stream-state",
    ],
    prerequisites: ["tokio-retained-frame-progress"],
    title: "Stream::next: Pending, koniec i Pin",
    subtitle:
      "Odczytasz generyczny stream bez Unpin, zatrzymasz się dokładnie na limicie i zachowasz nieprzeczytany suffix.",
    minutes: 28,
    outcomes: [
      "Odróżnisz Pending od None: brak gotowej ramki nie jest końcem streamu.",
      "Przyjmiesz Pin<&mut S>, aby helper nie wymagał Unpin od źródła.",
      "Zwrócisz niekopiowalny element albo ograniczoną liczbę elementów bez zużywania suffixu.",
    ],
    steps: [
      choose(
        "tokio-stream-next-predict-pending",
        "predict",
        "Czy Pending znaczy EOF?",
        'Scripted Stream najpierw zwraca Pending, potem Some("frame"), a na końcu None. Co powinny zwrócić dwa kolejne awaity next?',
        1,
        [
          "None, potem None, bo pierwszy Pending zamyka źródło.",
          'Some("frame"), potem None, bo Pending tylko odkłada gotowość.',
          'Some("frame"), potem Some("frame"), bo next zachowuje ostatnią wartość.',
        ],
        [
          "Pending nie oznacza końca; przyszły poll może jeszcze zwrócić wartość.",
          "Tak. next czeka przez Pending, a None pojawia się dopiero jako odpowiedź streamu o zakończeniu.",
          "next przenosi element do wywołującego; nie buforuje ani nie duplikuje go samodzielnie.",
        ],
      ),
      tokioRun(
        "tokio-stream-next-pending-run",
        "Pending nie jest końcem",
        "Uruchom kontrolowany Stream. Waker planuje następny poll bez sleep ani yield; pierwszy await przechodzi przez Pending, a dopiero drugi czyta prawdziwe None.",
        streamPendingRun,
        'first=Some("frame")\nsecond=None\n',
      ),
      choose(
        "tokio-stream-next-pinning",
        "explain",
        "Który interfejs nie wymaga Unpin od źródła?",
        "Twój helper ma pracować z własnym Stream zawierającym PhantomPinned. Którą granicę API wybierasz?",
        2,
        [
          "&mut S, bo każdy Stream jest automatycznie Unpin.",
          "S przez wartość, bo przeniesienie zwalnia z wymagań Pin.",
          "Pin<&mut S>, bo wywołujący przypina źródło, a helper pożycza je bez przenoszenia.",
        ],
        [
          "!Unpin jest poprawnym stanem wielu Future i Stream; zwykłe next na &mut S wymaga Unpin.",
          "Przeniesienie po utworzeniu pin może złamać kontrakt położenia wartości.",
          "Tak. Pin<&mut S> opisuje pożyczkę do przypiętej wartości i pozwala adapterowi odpytować ją bez wymagania Unpin.",
        ],
      ),
      tokioExercise({
        id: "tokio-stream-next-take-at-most-gate",
        kind: "modify",
        title: "Odbierz nie więcej niż limit",
        prompt:
          "Uzupełnij `take_at_most`. Pracuje na przypiętym generycznym Stream, przyjmuje dowolny limit i zwraca posiadane elementy w kolejności. Limit zero nie odpytuje źródła, Pending nie kończy odbioru, a po osiągnięciu limitu nie wolno odpytować następnego elementu. Nie wymagaj Unpin i nie twórz zastępczego streamu.",
        code: takeAtMostStarter,
        solution: takeAtMostSolution,
        tests: takeAtMostTests,
        hints: [
          "Sprawdź dokumentację StreamExt::next: zwykłe wywołanie stawia granicę Unpin, a przypięta pożyczka zmienia miejsce tej granicy.",
          "Sprawdź granicę przed awaitem. Some dodaj do Vec, a None zakończy odbiór przed limitem.",
        ],
        forbiddenPatterns: [
          "Box::leak",
          "std::mem::forget",
          "yield_now",
          "sleep(",
        ],
        gate: true,
      }),
      choose(
        "tokio-stream-next-limit-contract",
        "recall",
        "Co zostaje po limicie?",
        "`take_at_most` zwrócił dwa elementy z streamu, który ma jeszcze trzeci. Którego faktu musi dowieść test?",
        0,
        [
          "Licznik poll nie przekroczył liczby potrzebnej do dwóch elementów, a kolejny next zwraca trzeci element.",
          "Helper odpytał trzeci element i włożył go do ukrytego cache, aby przyspieszyć przyszłość.",
          "Helper zwrócił None, bo limit jest inną nazwą dla EOF.",
        ],
        [
          "Tak. Limit ogranicza zużycie źródła, nie tylko długość zwróconego Vec.",
          "Taki cache zmieniałby własność i obserwowalny stan streamu poza kontraktem helpera.",
          "EOF pochodzi wyłącznie z None zwróconego przez Stream, nie z decyzji wywołującego o limicie.",
        ],
      ),
      tokioExercise({
        id: "tokio-stream-next-first-matching-blank",
        kind: "blank",
        title: "Od pustej kartki: znajdź i przenieś pierwszy match",
        prompt:
          "Od pustej kartki utwórz publiczny helper `first_matching`. Przyjmuje przypięty generyczny stream oraz lokalny predykat pożyczający każdy element. Ma zwrócić pierwszy pasujący, posiadany element albo None po prawdziwym końcu; wcześniejsze niepasujące elementy są zużyte, a suffix po matchu zostaje w tym samym streamie. Obsłuż !Unpin źródło i niekopiowalny element bez klonowania.",
        solution: firstMatchingSolution,
        tests: firstMatchingTests,
        hints: [
          "Zacznij od relacji własności: predykat ma jedynie zajrzeć do wartości, lecz wynik ma ją przejąć.",
          "Każde kolejne next wykonuj na następnej przypiętej pożyczce tego samego streamu.",
        ],
        forbiddenPatterns: [
          "clone()",
          "Box::leak",
          "std::mem::forget",
          "yield_now",
          "sleep(",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Pending jest tym samym co EOF i pozwala zakończyć odbiór.",
      "Każdy Stream jest Unpin, więc Pin<&mut S> nie ma praktycznego znaczenia.",
      "Limit wolno przekroczyć jednym dodatkowym pollem, jeśli nadmiarowy element nie trafi do Vec.",
      "Predykat musi sklonować element, aby zdecydować o dopasowaniu.",
    ],
    transferTask:
      "Masz parser zdarzeń zwracający !Unpin Stream z rekordami audytu. Opisz, jak pobierzesz najwyżej sto rekordów bez odczytania numeru 101 oraz jak znajdziesz pierwszy rekord dla pożyczonego identyfikatora, pozostawiając dalsze rekordy innemu etapowi pipeline.",
    evidenceGate:
      "Gate limitu używa własnego !Unpin Stream, obserwuje Pending, niekopiowalne wartości, zero poll dla limitu zero i dokładny licznik poll przed suffixem. Blank sprawdza lokalnie pożyczony predykat, własność matchu oraz suffix tego samego streamu.",
    sourceIds: ["tokio-stream-stream-ext-next"],
  },
  {
    id: "tokio-receiver-stream-drain",
    moduleId: "tokio-io-streams",
    conceptIds: ["tokio-receiver-stream-shutdown"],
    competencyIds: [
      "close-and-drain-receiver-stream",
      "stop-a-supported-receiver-stream-read",
    ],
    prerequisites: ["tokio-stream-next"],
    title: "ReceiverStream: zamknij wejście, zachowaj kolejkę",
    subtitle:
      "Zamkniesz mpsc dla nowych zwykłych send, opróżnisz zaakceptowane dane i dasz stopowi jawne pierwszeństwo bez utraty wiadomości.",
    minutes: 30,
    outcomes: [
      "Wywołasz close, odrzucisz późny zwykły Sender i odbierzesz każdą wartość już zaakceptowaną przez kanał.",
      "Uwzględnisz Permit wydany przed close jako wartość należącą do drenażu.",
      "Rozróżnisz Item, Closed i Stopped oraz ograniczysz cancellation claim do ReceiverStream nad Tokio mpsc.",
    ],
    steps: [
      choose(
        "tokio-receiver-stream-drain-predict-close",
        "predict",
        "Co pozostaje po close?",
        "Kanał ma jedną wartość w buforze i jeden Permit zdobyty przed close. Co powinien zrobić odbiorca opakowany w ReceiverStream?",
        1,
        [
          "Natychmiast zwrócić None i porzucić bufor, bo close oznacza Drop receivera.",
          "Odrzucić nowy zwykły send, lecz odebrać bufor i wartość wysłaną przez wcześniejszy Permit aż do None.",
          "Akceptować zwykłe send dalej, dopóki istnieje klon Sendera.",
        ],
        [
          "close zachowuje Receiver; nie jest Drop i nie usuwa zaakceptowanych wartości.",
          "Tak. close zamyka admission dla zwykłego Sender, a drain rozlicza wszystko przyjęte wcześniej, także Permit.",
          "Zwykły Sender po close dostaje błąd; szczególny jest wyłącznie Permit zdobyty przed zamknięciem.",
        ],
      ),
      tokioRun(
        "tokio-receiver-stream-drain-run",
        "close nie kasuje bufora",
        "Uruchom przykład. Ordinary Sender dostaje błąd po close, ale zbuforowana wartość i wartość z Permit trafiają do tego samego drenażu.",
        receiverCloseRun,
        'ordinary_rejected=true\ndrained=["buffered", "reserved"]\n',
      ),
      choose(
        "tokio-receiver-stream-drain-permit",
        "explain",
        "Dlaczego nie wolno kończyć drenażu po samym close?",
        "Która własność Permit zmienia prostą regułę „po close nie ma nowych wartości”?",
        2,
        [
          "Permit zamienia ReceiverStream w nieskończony stream.",
          "Permit pozwala cofnąć close i ponownie otworzyć kanał.",
          "Permit zarezerwował pojemność przed close, więc może dostarczyć jedną dodatkową, wcześniej zaakceptowaną wartość.",
        ],
        [
          "Permit nie zmienia końca kanału; po jego rozliczeniu i drenażu next zwraca None.",
          "close pozostaje aktywne dla zwykłych send; Permit nie jest przełącznikiem kanału.",
          "Tak. Należy zwolnić albo wysłać przez Permit, zanim test lub aplikacja będzie czekać na koniec drenażu.",
        ],
      ),
      tokioExercise({
        id: "tokio-receiver-stream-drain-close-and-drain-gate",
        kind: "modify",
        title: "Zamknij i opróżnij ReceiverStream",
        prompt:
          "Uzupełnij `close_and_drain`. Ma przejąć ReceiverStream, zatrzymać nowe zwykłe send i zwrócić w kolejności wszystkie wartości zaakceptowane wcześniej. Drenuj do prawdziwego None; nie używaj try_recv, czasu ani odłączania zadania. Test ręcznie odpytuje helper, aby close nastąpił przed późniejszym send, potem sprawdza odrzucenie Sendera i wartość z wcześniejszego Permit.",
        code: closeAndDrainStarter,
        solution: closeAndDrainSolution,
        tests: closeAndDrainTests,
        hints: [
          "Odszukaj metodę ReceiverStream, która zatrzymuje admission, zachowując zdolność do odczytu.",
          "Po close zwykły Sender może zawieść, ale `while let Some` nadal musi rozliczyć istniejący bufor.",
        ],
        forbiddenPatterns: [
          "try_recv",
          "abort",
          "std::mem::forget",
          "yield_now",
          "sleep(",
        ],
        gate: true,
      }),
      choose(
        "tokio-receiver-stream-drain-stop-contract",
        "recall",
        "Jaką decyzję podejmuje stop i next, gdy oba są gotowe?",
        "Helper tej lekcji ma jawną politykę: stop ma pierwszeństwo nad gotową wiadomością. Co musi zostać po powrocie Stopped?",
        0,
        [
          "Wiadomość pozostaje w ReceiverStream, a następny odbiór może ją pobrać.",
          "Wiadomość jest porzucona, ponieważ select! anulował jej Sender.",
          "Kanał zostaje automatycznie zamknięty i wszyscy Sender dostają błąd.",
        ],
        [
          "Tak. Ta gwarancja jest tu celowo ograniczona do udokumentowanego mpsc/ReceiverStream; stop anuluje oczekiwanie, nie odbiera wartości.",
          "Anulowanie oczekiwania next nie cofa Sendera ani nie przenosi wartości do stop branch.",
          "Stop określa wynik jednego helpera. Nie wywołuje close, jeśli kontrakt tego nie mówi.",
        ],
      ),
      tokioExercise({
        id: "tokio-receiver-stream-drain-next-or-stop-blank",
        kind: "blank",
        title: "Od pustej kartki: odczyt albo stop",
        prompt:
          "Od pustej kartki utwórz publiczny enum `Read<T>` z rozróżnialnymi wynikami Item, Closed i Stopped oraz helper `next_or_stop`. Helper pożycza ReceiverStream i oneshot stop. Gdy oba są gotowe, stop ma jawne pierwszeństwo; wysłanie stopu albo Drop jego Sendera daje Stopped. Prawdziwy koniec streamu daje Closed. Po Stopped nie wolno zużyć oczekującej wiadomości ReceiverStream.",
        solution: nextOrStopSolution,
        tests: nextOrStopTests,
        hints: [
          "Sprawdź zachowanie oneshot::Receiver, gdy jego Sender istnieje, wysyła sygnał albo zostaje upuszczony.",
          "`biased;` i kolejność gałęzi dokumentują priorytet stopu; nie zastępuj stream.next przez try_recv.",
        ],
        forbiddenPatterns: [
          "try_recv",
          "abort",
          "std::mem::forget",
          "yield_now",
          "sleep(",
        ],
        gate: true,
      }),
      receiverPartitionTransfer,
      receiverBatchTransfer,
    ],
    misconceptions: [
      "close ReceiverStream usuwa wartości już zbuforowane przez kanał.",
      "Wcześniej wydany Permit przestaje mieć znaczenie w chwili close.",
      "Stop wygrywający select! automatycznie kasuje wiadomość z mpsc.",
      "Każdy własny Stream daje taką samą gwarancję cancellation safety jak ReceiverStream.",
    ],
    transferTask:
      "Projektujesz worker przyjmujący niekopiowalne zlecenia przez bounded mpsc. Opisz, kiedy wywołasz close, jak rozliczysz Permit wydane przed stopem oraz które trzy wyniki zwróci pojedynczy odczyt ścigający się z sygnałem zakończenia. Wskaż, dlaczego tej polityki nie wolno uogólnić na nieudokumentowany Stream własnej implementacji.",
    evidenceGate:
      "Gate close kontroluje pierwszy poll, więc udowadnia kolejne zdarzenia: close, odrzucenie zwykłego Sendera, zwolnienie Permit i pełny drain niekopiowalnych wartości. Blank kontroluje pending next, potem jednocześnie udostępnia wiadomość i stop; biased stop zwraca Stopped, a ten sam ReceiverStream nadal zwraca niezużytą wiadomość. Osobne przypadki rozróżniają Drop stop Sendera i Closed.",
    sourceIds: [
      "tokio-stream-stream-ext-next",
      "tokio-stream-receiver-stream",
      "tokio-stream-mpsc-close",
      "tokio-stream-select-cancellation",
    ],
  },
];

export const tokioStreamReviewExercises: Record<string, LessonStep> = {
  "tokio-stream-next-pinning": tokioExercise({
    id: "review-tokio-stream-next-pinning",
    kind: "debug",
    title: "Przegląd kodu: zwróć ramkę albo prawdziwy koniec",
    prompt:
      "Popraw `next_frame`. Kontrakt code review jest mniejszy niż limit i wyszukiwanie: helper bierze przypięty dowolny Stream i zwraca publiczny enum z posiadanym pojedynczym elementem albo Closed. Pending ma pozostać oczekiwaniem, nie Closed. Test sprawdza niekopiowalny Packet i następny prawdziwy EOF.",
    code: nextFrameReviewStarter,
    solution: nextFrameReviewSolution,
    tests: nextFrameReviewTests,
    hints: [
      "Sprawdź kontrakt StreamExt::next dla Pin<&mut S> i rozdziel znaczenie gotowości od zakończenia.",
      "Dopasuj tylko wynik next: Some przenosi Packet do Frame::Item, a None tworzy Frame::Closed.",
    ],
    forbiddenPatterns: ["try_recv", "std::mem::forget", "yield_now", "sleep("],
    gate: false,
  }),
  "tokio-receiver-stream-shutdown": tokioExercise({
    id: "review-tokio-receiver-stream-shutdown",
    kind: "debug",
    title: "Przegląd kodu: po stopie zamknij admission i rozlicz kolejkę",
    prompt:
      "Popraw `stop_then_drain`. Ten kontrakt code review różni się od pojedynczego odczytu: stop, także przez Drop Sendera, rozpoczyna close na pożyczonym ReceiverStream i helper zwraca wszystkie wcześniej zaakceptowane wartości. Test sprawdza oba sposoby zatrzymania, bufor oraz wiadomość wysłaną przez wcześniejszy Permit już po close. Zwykły późny Sender ma zostać odrzucony.",
    code: stopThenDrainReviewStarter,
    solution: stopThenDrainReviewSolution,
    tests: stopThenDrainReviewTests,
    hints: [
      "Rozpisz kolejność zdarzeń: sygnał stopu, odcięcie nowych send i odczyt elementów już zaakceptowanych.",
      "Po close pętla next musi dojść do None, aby nie zgubić bufora ani wartości Permit.",
    ],
    forbiddenPatterns: [
      "try_recv",
      "abort",
      "std::mem::forget",
      "yield_now",
      "sleep(",
    ],
    gate: false,
  }),
};
