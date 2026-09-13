import { choose, tokioError, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const tokioChannelSources: Source[] = [
  {
    id: "tokio-mpsc-sender",
    title: "Tokio 1.53.1: mpsc::Sender",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Sender.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki capacity, send, reserve lub kolejki oczekujących nadawców.",
  },
  {
    id: "tokio-mpsc-receiver",
    title: "Tokio 1.53.1: mpsc::Receiver",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Receiver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie close, recv albo warunków, po których odbiornik zwraca None.",
  },
  {
    id: "tokio-mpsc-permit",
    title: "Tokio 1.53.1: mpsc::Permit",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Permit.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie własności po reserve, zwalniania po Drop Permit lub możliwości send po Receiver::close.",
  },
  {
    id: "tokio-mpsc-send-error",
    title: "Tokio 1.53.1: mpsc::SendError",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/error/struct.SendError.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie typu błędu send albo dostępności niesłanej wartości w SendError<T>.",
  },
];

export const tokioChannelCompetencies: Competency[] = [
  {
    id: "control-bounded-tokio-flow",
    title:
      "Kontrolujesz bounded kanał: backpressure, odzyskanie danych i drain.",
  },
  {
    id: "reserve-before-moving-tokio-data",
    title: "Rezerwujesz capacity przed przeniesieniem danych.",
  },
];

export const tokioChannelConcepts: Concept[] = [
  {
    id: "tokio-bounded-channels",
    title: "Bounded mpsc: pojemność i zamknięcie",
    prerequisites: ["tokio-join-outcomes"],
    competencyIds: ["control-bounded-tokio-flow"],
    reviewPrompt:
      "Co dzieje się z posiadanym T, gdy Sender::send kończy się błędem, oraz jak Receiver::close i drain różnią się od natychmiastowego porzucenia odbiornika?",
    reviewAnswer:
      "Sender::send przyjmuje T przez wartość. Gdy kanał jest zamknięty, zwraca SendError<T>, więc wywołujący odzyskuje dokładnie tę niesłaną wartość. Receiver::close zatrzymuje nowe zwykłe send, ale nie usuwa już zbuforowanych wiadomości ani wcześniej uzyskanych Permit; odbiornik powinien wywoływać recv aż do None, aby je odebrać. Drop Receiver natomiast kończy możliwość odebrania pozostałych danych.",
    distinguish:
      "Pojemność bounded to liczba miejsc na wiadomości, a nie gwarancja kolejności wykonywania zadań. Pełny kanał zatrzymuje Future send w Pending, dopóki recv nie zwolni miejsca. Zamknięty kanał nie oznacza pustego kanału: buffered wiadomości i wcześniej nabyte Permit mogą jeszcze zostać odebrane.",
  },
  {
    id: "tokio-reservation-cancellation",
    title: "reserve chroni miejsce, a położenie w kolejce nie jest trwałe",
    prerequisites: ["tokio-bounded-channels"],
    competencyIds: ["reserve-before-moving-tokio-data"],
    reviewPrompt:
      "Dlaczego przechowanie wiadomości w Option<T> poza Future reserve pozwala zachować ją po anulowaniu lub zamknięciu kanału, a czego nie zachowuje anulowanie oczekującego reserve?",
    reviewAnswer:
      "Future reserve nie otrzymuje T, więc Option<T> pozostaje właścicielem wiadomości, dopóki po uzyskaniu Permit kod nie wykona take i Permit::send. Drop oczekującego Future zwalnia jego zasoby bez niszczenia wartości w zewnętrznym Option; błąd zamkniętego kanału także pozostawia tam T. Tokio ustawia oczekujących send i reserve w kolejce, lecz anulowanie reserve usuwa dane oczekiwanie, więc przy następnej próbie można stracić wcześniejsze miejsce w kolejce.",
    distinguish:
      "Permit oznacza zarezerwowane jedno miejsce, nie przechowywaną wiadomość. Drop Permit zwraca pojemność. Gdy forward najpierw uzyska Permit outputu, a potem czeka na input, anulowanie tej operacji zwalnia Permit; gdy output był pełny przed recv, input nie został jeszcze pobrany i pozostaje w swoim kanale.",
  },
];

const boundedRun = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel(1);
    println!("start={}", tx.capacity());
    tx.send("first").await.unwrap();
    println!("after-send={}", tx.capacity());
    println!("received={}", rx.recv().await.unwrap());
    let permit = tx.reserve().await.unwrap();
    println!("after-reserve={}", tx.capacity());
    permit.send("second");
    println!("received={}", rx.recv().await.unwrap());
}`;

const sendErrorType = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(1);
    rx.close();
    let _: mpsc::error::SendError<String> = tx.reserve().await.unwrap_err();
}`;

const sendErrorTypeSolution = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(1);
    rx.close();
    let error = tx.reserve().await.unwrap_err();
    assert_eq!(error.0, ());
    println!("reserve has no String to return");
}`;

const sendWhenSpaceStarter = `use tokio::sync::mpsc;

async fn send_when_space<T>(
    _tx: &mpsc::Sender<T>,
    _value: T,
) -> Result<(), mpsc::error::SendError<T>> {
    panic!("wait for the channel to accept this value")
}`;

const sendWhenSpaceSolution = `use tokio::sync::mpsc;

async fn send_when_space<T>(
    tx: &mpsc::Sender<T>,
    value: T,
) -> Result<(), mpsc::error::SendError<T>> {
    tx.send(value).await
}`;

const sendWhenSpaceTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}
struct DropProbe {
    label: &'static str,
    drops: Arc<AtomicUsize>,
}
impl Drop for DropProbe {
    fn drop(&mut self) {
        self.drops.fetch_add(1, Ordering::SeqCst);
    }
}

#[tokio::test(flavor = "current_thread")]
async fn waits_while_full_then_moves_non_copy_value_after_a_real_receive() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let drops = Arc::new(AtomicUsize::new(0));
    tx.send(DropProbe {
        label: "first",
        drops: Arc::clone(&drops),
    })
    .await
    .unwrap();
    let mut sending = Box::pin(send_when_space(
        &tx,
        DropProbe {
            label: "second",
            drops: Arc::clone(&drops),
        },
    ));

    assert!(poll_once(sending.as_mut()).is_pending());
    assert_eq!(tx.capacity(), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let first = rx.recv().await.unwrap();
    assert_eq!(first.label, "first");
    drop(first);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    assert!(sending.await.is_ok());
    let second = rx.recv().await.unwrap();
    assert_eq!(second.label, "second");
    drop(second);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}

#[tokio::test(flavor = "current_thread")]
async fn returns_the_unsent_owned_value_when_the_receiver_is_closed() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    rx.close();

    let error = send_when_space(&tx, String::from("recover me"))
        .await
        .unwrap_err();
    assert_eq!(error.0, "recover me");
}`;

const closeThenDrainSolution = `use tokio::sync::mpsc;

async fn close_then_drain<T>(rx: &mut mpsc::Receiver<T>) -> Vec<T> {
    rx.close();
    let mut values = Vec::new();
    while let Some(value) = rx.recv().await {
        values.push(value);
    }
    values
}`;

const closeThenDrainTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}

#[tokio::test(flavor = "current_thread")]
async fn drains_buffered_messages_and_a_permit_reserved_before_close() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(3);
    tx.send(String::from("buffered")).await.unwrap();
    let permit = tx.reserve().await.unwrap();
    rx.close();
    let error = tx.send(String::from("rejected")).await.unwrap_err();
    assert_eq!(error.0, "rejected");
    permit.send(String::from("reserved"));

    assert_eq!(
        close_then_drain(&mut rx).await,
        vec![String::from("buffered"), String::from("reserved")],
    );
    assert_eq!(rx.recv().await, None);
}

#[tokio::test(flavor = "current_thread")]
async fn close_then_drain_finishes_empty_with_a_live_sender_and_rejects_its_value() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);
    let mut draining = Box::pin(close_then_drain(&mut rx));
    assert!(matches!(
        poll_once(draining.as_mut()),
        Poll::Ready(values) if values.is_empty(),
    ));
    drop(draining);
    assert!(rx.is_closed());
    match tx.try_send(String::from("late")) {
        Err(tokio::sync::mpsc::error::TrySendError::Closed(value)) => {
            assert_eq!(value, "late");
        }
        other => panic!("expected closed sender, got {other:?}"),
    }
}`;

const sendPairStarter = `use tokio::sync::mpsc;

async fn send_pair_and_close<T>(
    _tx: mpsc::Sender<T>,
    _first: T,
    _second: T,
) -> Result<(), mpsc::error::SendError<T>> {
    panic!("send both values and release this sender")
}`;

const sendPairSolution = `use tokio::sync::mpsc;

async fn send_pair_and_close<T>(
    tx: mpsc::Sender<T>,
    first: T,
    second: T,
) -> Result<(), mpsc::error::SendError<T>> {
    tx.send(first).await?;
    tx.send(second).await?;
    drop(tx);
    Ok(())
}`;

const sendPairTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}

#[tokio::test(flavor = "current_thread")]
async fn delivers_two_owned_values_then_closes_the_only_sender() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let producer = tokio::spawn(send_pair_and_close(
        tx,
        String::from("first"),
        String::from("second"),
    ));

    assert_eq!(rx.recv().await.unwrap(), "first");
    assert_eq!(rx.recv().await.unwrap(), "second");
    assert!(producer.await.unwrap().is_ok());
    assert_eq!(rx.recv().await, None);
}

#[tokio::test(flavor = "current_thread")]
async fn returns_the_first_unsent_value_if_the_receiver_was_closed() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    rx.close();

    let error = send_pair_and_close(tx, String::from("first"), String::from("second"))
        .await
        .unwrap_err();
    assert_eq!(error.0, "first");
}

#[tokio::test(flavor = "current_thread")]
async fn close_after_the_first_receive_returns_the_exact_second_value() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let mut producer = Box::pin(send_pair_and_close(
        tx,
        String::from("first"),
        String::from("second"),
    ));

    assert!(poll_once(producer.as_mut()).is_pending());
    assert_eq!(rx.recv().await.unwrap(), "first");
    rx.close();
    assert_eq!(producer.await.unwrap_err().0, "second");
    assert_eq!(rx.recv().await, None);
}`;

const reservationRun = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel(1);
    let permit = tx.reserve().await.unwrap();
    println!("capacity={}", tx.capacity());
    permit.send("reserved");
    println!("value={}", rx.recv().await.unwrap());
}`;

const reservationError = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(1);
    rx.close();
    let _: mpsc::error::SendError<String> = tx.reserve().await.unwrap_err();
}`;

const reservationErrorSolution = `use tokio::sync::mpsc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(1);
    rx.close();
    let error = tx.reserve().await.unwrap_err();
    assert_eq!(error.0, ());
    println!("the String remains outside reserve");
}`;

const sendRetainedStarter = `use tokio::sync::mpsc;

async fn send_retained<T>(
    _tx: &mpsc::Sender<T>,
    _pending: &mut Option<T>,
) -> Result<(), ()> {
    panic!("reserve capacity before taking the pending value")
}`;

const sendRetainedSolution = `use tokio::sync::mpsc;

async fn send_retained<T>(
    tx: &mpsc::Sender<T>,
    pending: &mut Option<T>,
) -> Result<(), ()> {
    if pending.is_none() {
        return Ok(());
    }
    let permit = tx.reserve().await.map_err(|_| ())?;
    permit.send(pending.take().expect("value stays in the external slot"));
    Ok(())
}`;

const sendRetainedTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}
struct DropProbe {
    label: &'static str,
    drops: Arc<AtomicUsize>,
}
impl Drop for DropProbe {
    fn drop(&mut self) {
        self.drops.fetch_add(1, Ordering::SeqCst);
    }
}

#[tokio::test(flavor = "current_thread")]
async fn cancellation_while_full_keeps_the_external_value_until_a_receive_releases_capacity() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let drops = Arc::new(AtomicUsize::new(0));
    tx.send(DropProbe {
        label: "blocker",
        drops: Arc::clone(&drops),
    })
    .await
    .unwrap();
    let mut pending = Some(DropProbe {
        label: "retained",
        drops: Arc::clone(&drops),
    });
    let mut future = Box::pin(send_retained(&tx, &mut pending));

    assert!(poll_once(future.as_mut()).is_pending());
    drop(future);
    assert_eq!(pending.as_ref().unwrap().label, "retained");
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let blocker = rx.recv().await.unwrap();
    assert_eq!(blocker.label, "blocker");
    drop(blocker);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    assert_eq!(send_retained(&tx, &mut pending).await, Ok(()));
    assert!(pending.is_none());
    let delivered = rx.recv().await.unwrap();
    assert_eq!(delivered.label, "retained");
    drop(delivered);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}

#[tokio::test(flavor = "current_thread")]
async fn close_keeps_the_slot_and_an_empty_slot_does_not_reserve_capacity() {
    let (empty_tx, _empty_rx) = tokio::sync::mpsc::channel(1);
    let mut empty: Option<String> = None;
    assert_eq!(send_retained(&empty_tx, &mut empty).await, Ok(()));
    assert_eq!(empty_tx.capacity(), 1);

    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    rx.close();
    let drops = Arc::new(AtomicUsize::new(0));
    let mut pending = Some(DropProbe {
        label: "closed",
        drops: Arc::clone(&drops),
    });
    assert_eq!(send_retained(&tx, &mut pending).await, Err(()));
    assert_eq!(pending.as_ref().unwrap().label, "closed");
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(pending);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}`;

const forwardReservedSolution = `use tokio::sync::mpsc;

async fn forward_reserved<T>(
    input: &mut mpsc::Receiver<T>,
    output: &mpsc::Sender<T>,
) -> Result<bool, ()> {
    let permit = output.reserve().await.map_err(|_| ())?;
    match input.recv().await {
        Some(value) => {
            permit.send(value);
            Ok(true)
        }
        None => Ok(false),
    }
}`;

const forwardReservedTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}
struct DropProbe {
    label: &'static str,
    drops: Arc<AtomicUsize>,
}
impl Drop for DropProbe {
    fn drop(&mut self) {
        self.drops.fetch_add(1, Ordering::SeqCst);
    }
}

#[tokio::test(flavor = "current_thread")]
async fn cancellation_while_output_is_full_leaves_the_input_item_queued() {
    let (out_tx, mut out_rx) = tokio::sync::mpsc::channel(1);
    let occupied_drops = Arc::new(AtomicUsize::new(0));
    out_tx
        .send(DropProbe {
            label: "occupied",
            drops: Arc::clone(&occupied_drops),
        })
        .await
        .unwrap();
    let (in_tx, mut in_rx) = tokio::sync::mpsc::channel(1);
    let drops = Arc::new(AtomicUsize::new(0));
    in_tx
        .send(DropProbe {
            label: "queued",
            drops: Arc::clone(&drops),
        })
        .await
        .unwrap();
    let mut future = Box::pin(forward_reserved(&mut in_rx, &out_tx));

    assert!(poll_once(future.as_mut()).is_pending());
    drop(future);
    assert_eq!(in_rx.len(), 1);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let occupied = out_rx.recv().await.unwrap();
    assert_eq!(occupied.label, "occupied");
    drop(occupied);
    assert_eq!(occupied_drops.load(Ordering::SeqCst), 1);
    assert_eq!(forward_reserved(&mut in_rx, &out_tx).await, Ok(true));
    let delivered = out_rx.recv().await.unwrap();
    assert_eq!(delivered.label, "queued");
    drop(delivered);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn cancellation_while_input_is_empty_releases_the_reserved_output_slot() {
    let (out_tx, mut out_rx) = tokio::sync::mpsc::channel::<String>(1);
    let (_in_tx, mut in_rx) = tokio::sync::mpsc::channel::<String>(1);
    let mut future = Box::pin(forward_reserved(&mut in_rx, &out_tx));

    assert!(poll_once(future.as_mut()).is_pending());
    assert_eq!(out_tx.capacity(), 0);
    drop(future);
    assert_eq!(out_tx.capacity(), 1);
    out_tx.try_send(String::from("available")).unwrap();
    assert_eq!(out_rx.recv().await.unwrap(), "available");
}

#[tokio::test(flavor = "current_thread")]
async fn a_closed_output_keeps_input_and_input_eof_releases_the_permit() {
    let (out_tx, mut out_rx) = tokio::sync::mpsc::channel::<String>(1);
    let (in_tx, mut in_rx) = tokio::sync::mpsc::channel(1);
    in_tx.send(String::from("keep me")).await.unwrap();
    out_rx.close();
    assert_eq!(forward_reserved(&mut in_rx, &out_tx).await, Err(()));
    assert_eq!(in_rx.recv().await.unwrap(), "keep me");

    let (out_tx, _out_rx) = tokio::sync::mpsc::channel::<String>(1);
    let (in_tx, mut in_rx) = tokio::sync::mpsc::channel::<String>(1);
    drop(in_tx);
    assert_eq!(forward_reserved(&mut in_rx, &out_tx).await, Ok(false));
    assert_eq!(out_tx.capacity(), 1);
}`;

const factoryStarter = `use tokio::sync::mpsc;

async fn send_from_factory<T, F>(
    _tx: &mpsc::Sender<T>,
    _factory: F,
) -> Result<(), F>
where
    F: FnOnce() -> T,
{
    panic!("wait for capacity before calling the factory")
}`;

const factorySolution = `use tokio::sync::mpsc;

async fn send_from_factory<T, F>(
    tx: &mpsc::Sender<T>,
    factory: F,
) -> Result<(), F>
where
    F: FnOnce() -> T,
{
    let permit = match tx.reserve().await {
        Ok(permit) => permit,
        Err(_) => return Err(factory),
    };
    permit.send(factory());
    Ok(())
}`;

const factoryTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use std::task::{Context, Poll, Wake, Waker};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut cx = Context::from_waker(&waker);
    future.poll(&mut cx)
}

#[tokio::test(flavor = "current_thread")]
async fn factory_is_not_called_while_reservation_is_pending_then_runs_once_after_capacity() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    tx.send(String::from("occupied")).await.unwrap();
    let calls = Arc::new(AtomicUsize::new(0));
    let recorded = Arc::clone(&calls);
    let mut future = Box::pin(send_from_factory(&tx, move || {
        recorded.fetch_add(1, Ordering::SeqCst);
        String::from("not-made")
    }));

    assert!(poll_once(future.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    drop(future);
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(rx.recv().await.unwrap(), "occupied");

    let recorded = Arc::clone(&calls);
    assert!(
        send_from_factory(&tx, move || {
            recorded.fetch_add(1, Ordering::SeqCst);
            String::from("made")
        })
        .await
        .is_ok()
    );
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(rx.recv().await.unwrap(), "made");
}

#[tokio::test(flavor = "current_thread")]
async fn a_closed_channel_returns_the_uninvoked_factory() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);
    rx.close();
    let calls = Arc::new(AtomicUsize::new(0));
    let recorded = Arc::clone(&calls);

    let factory = send_from_factory(&tx, move || {
        recorded.fetch_add(1, Ordering::SeqCst);
        String::from("recovered")
    })
    .await
    .unwrap_err();
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(factory(), "recovered");
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}`;

export const tokioChannelLessons: Lesson[] = [
  {
    id: "tokio-bounded-channels",
    moduleId: "tokio-flow-control",
    conceptIds: ["tokio-bounded-channels"],
    competencyIds: ["control-bounded-tokio-flow"],
    prerequisites: ["tokio-join-outcomes"],
    title: "Kanał bounded: miejsce, własność i prawidłowy koniec",
    subtitle:
      "Zobaczysz backpressure jako stan kanału, odzyskasz niesłaną wartość i zamkniesz odbiornik bez gubienia zaakceptowanych wiadomości.",
    minutes: 27,
    outcomes: [
      "Wyjaśnisz, dlaczego pełny bounded kanał daje Pending, aż recv zwolni miejsce.",
      "Odzyskasz posiadane T z SendError<T>, gdy odbiornik jest zamknięty.",
      "Zamkniesz Receiver i opróżnisz buffered wiadomości oraz Permit utworzony przed close.",
    ],
    steps: [
      choose(
        "tokio-bounded-channels-predict",
        "predict",
        "Co zmienia pełny kanał?",
        "Kanał mpsc ma capacity 1 i zawiera już jedną wiadomość. Tworzysz Future `tx.send(second)`, ale jeszcze go nie kończysz. Jaki stan może obserwować pierwszy poll?",
        1,
        [
          "Ready(Ok(())), bo Sender ma własną kopię miejsca w buforze.",
          "Pending; Future czeka, aż Receiver odbierze wiadomość i zwolni miejsce.",
          "Ready(Err(_)), bo pełny kanał jest zawsze zamknięty.",
        ],
        [
          "Sender nie ma prywatnego miejsca; capacity jest wspólnym zasobem kanału.",
          "Bounded capacity tworzy backpressure. `send` czeka na miejsce, a `recv` faktycznie je zwalnia.",
          "Pełny i zamknięty to różne stany. Błąd send dotyczy zamkniętego odbiornika.",
        ],
      ),
      tokioRun(
        "tokio-bounded-channels-run",
        "Obserwuj pojemność i Permit",
        "Uruchom przykład. `capacity` maleje po send i reserve, a recv zwraca konkretne miejsce do kanału. Kolejność tu wynika z kolejnych await w jednym Future, nie z harmonogramu rodzeństwa.",
        boundedRun,
        "start=1\nafter-send=0\nreceived=first\nafter-reserve=0\nreceived=second\n",
      ),
      tokioError(
        "tokio-bounded-channels-observe",
        "Obserwuj różnicę między send i reserve",
        "Ten kod zakłada, że błąd `reserve` zawiera String. Skompiluj go i przeczytaj E0308: reserve nie przyjmuje wiadomości, więc jego błąd ma `SendError<()>`. Przy zwykłym send String jest już argumentem operacji, dlatego jego `SendError<T>` może go zwrócić.",
        sendErrorType,
        sendErrorTypeSolution,
        { code: "E0308" },
      ),
      choose(
        "tokio-bounded-channels-explain",
        "explain",
        "Co zostaje po Receiver::close?",
        "Receiver ma jedną wiadomość w buforze, a Sender uzyskał Permit przed `rx.close()`. Co ma zrobić odbiornik, aby zakończyć bez gubienia zaakceptowanych danych?",
        2,
        [
          "Od razu upuścić Receiver; close usuwa buffered wiadomości i unieważnia każdy Permit.",
          "Wywołać jeszcze jeden zwykły send; close oznacza tylko chwilowe zatrzymanie.",
          "Wywoływać recv aż do None; buffered wiadomość i wcześniejszy Permit mogą jeszcze zostać odebrane, a nowe send dostanie błąd.",
        ],
        [
          "Drop Receiver kończy możliwość odebrania danych. `close` ma umożliwić drain.",
          "close zatrzymuje nowe zwykłe send; nie otwiera kanału ponownie.",
          "To kontrakt clean shutdown mpsc: drain trwa do None, także po wiadomości przesłanej przez Permit sprzed close.",
        ],
      ),
      tokioExercise({
        id: "tokio-bounded-channels-send-gate",
        kind: "modify",
        title: "Czekaj na miejsce i odzyskaj niesłaną wartość",
        prompt:
          "Uzupełnij `send_when_space`. Funkcja ma przekazać posiadane T do bounded Sender i czekać tylko wtedy, gdy kanał jest pełny. Po zamknięciu odbiornika zwróć prawdziwy `SendError<T>`, aby wywołujący odzyskał dokładnie niesłaną wartość. Test najpierw wykonuje jeden bezpieczny poll pełnego kanału, potem prawdziwe `recv().await` zwalnia miejsce; używa nie-Copy DropProbe i osobno sprawdza payload błędu.",
        code: sendWhenSpaceStarter,
        solution: sendWhenSpaceSolution,
        tests: sendWhenSpaceTests,
        hints: [
          "Sender::send już łączy oczekiwanie na bounded capacity z wynikiem `Result<(), SendError<T>>`.",
          "Nie zamieniaj błędu na (), nie klonuj T i nie wywołuj try_send: ukryty test obserwuje Pending.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-bounded-channels-blank",
        kind: "blank",
        title: "Od pustej kartki: zamknij i opróżnij odbiornik",
        prompt:
          "Od pustej kartki napisz `async fn close_then_drain<T>(rx: &mut mpsc::Receiver<T>) -> Vec<T>`. Najpierw zamknij receiving half, potem odbieraj do None i zachowaj kolejność wszystkich wartości. Kontrakt obejmuje już zbuforowane dane, wiadomość przesłaną przez Permit uzyskany przed close oraz pusty kanał. Nie wolno odrzucać nowych send przez Drop Receiver ani zakładać, że close usuwa istniejące wiadomości.",
        solution: closeThenDrainSolution,
        tests: closeThenDrainTests,
        hints: [
          "Receiver::close nie konsumuje danych; dopiero pętla z recv zbiera je do końca.",
          "Zakończ dopiero na None. Vec może przechować T bez wymagania Copy albo Clone.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Pełny bounded kanał jest tym samym co kanał zamknięty.",
      "Błąd send zawsze niszczy przekazaną wiadomość.",
      "Receiver::close usuwa buffered wiadomości albo unieważnia Permit uzyskany wcześniej.",
    ],
    transferTask:
      "Projektujesz producenta obrazów z buforem wielkości 8. Opisz, gdzie jego Future ma czekać na capacity, jak zachowasz konkretny obraz po zamknięciu konsumenta oraz jak konsument zatrzyma przyjmowanie nowych obrazów i odbierze osiem już zaakceptowanych.",
    evidenceGate:
      "tokio-bounded-channels-send-gate obserwuje Pending pełnego kanału, późniejsze zwolnienie capacity, własność nie-Copy T i SendError<T>; tokio-bounded-channels-blank zamyka Receiver, a potem drainuje buffered oraz wcześniej zarezerwowaną wiadomość do None.",
    sourceIds: [
      "tokio-mpsc-sender",
      "tokio-mpsc-receiver",
      "tokio-mpsc-permit",
      "tokio-mpsc-send-error",
    ],
  },
  {
    id: "tokio-reservation-cancellation",
    moduleId: "tokio-flow-control",
    conceptIds: ["tokio-reservation-cancellation"],
    competencyIds: ["reserve-before-moving-tokio-data"],
    prerequisites: ["tokio-bounded-channels"],
    title: "Rezerwacja capacity i anulowanie bez utraty danych",
    subtitle:
      "Oddzielisz oczekiwanie na miejsce od przeniesienia wiadomości i sprawdzisz, który zasób wraca po anulowaniu Future.",
    minutes: 31,
    outcomes: [
      "Uzyskasz Permit przez reserve przed utworzeniem albo zabraniem kosztownej wiadomości.",
      "Zachowasz T w zewnętrznym Option<T> po anulowaniu oczekującej rezerwacji albo zamknięciu kanału.",
      "Przekażesz jedną wiadomość po rezerwacji outputu i sprawdzisz oba bezpieczne punkty anulowania.",
    ],
    steps: [
      choose(
        "tokio-reservation-cancellation-predict",
        "predict",
        "Gdzie ma czekać wiadomość?",
        "Masz `pending: Option<String>` oraz pełny output. Chcesz móc przerwać oczekiwanie bez niszczenia String. Która kolejność zachowuje ten kontrakt?",
        0,
        [
          "Sprawdź, że Option nie jest puste, awaituj reserve, a dopiero po Permit wykonaj pending.take() i permit.send(value).",
          "Najpierw pending.take(), potem przekaż String do Future send i awaituj miejsce.",
          "Najpierw sklonuj String, aby Future send i Option miały osobne kopie.",
        ],
        [
          "T pozostaje poza oczekującym Future; po Permit można przenieść je tylko raz do kanału.",
          "Po take wartość należy już do Future; Drop całego Future może ją zniszczyć.",
          "Klonowanie nie jest odzyskaniem tej samej posiadanej wartości i nie działa dla każdego T.",
        ],
      ),
      tokioRun(
        "tokio-reservation-cancellation-run",
        "Zarezerwuj miejsce przed wiadomością",
        'Uruchom przykład. Permit zajmuje jedno miejsce jeszcze zanim dostanie wartość; dopiero `permit.send` przenosi `"reserved"` do kanału.',
        reservationRun,
        "capacity=0\nvalue=reserved\n",
      ),
      tokioError(
        "tokio-reservation-cancellation-observe",
        "Obserwuj pusty błąd rezerwacji",
        "Kod próbuje przypisać błąd reserve do `SendError<String>`. Skompiluj go: E0308 pokazuje, że reserve zwraca `SendError<()>`, ponieważ String nie został do niego przekazany i może nadal należeć do zewnętrznego Option.",
        reservationError,
        reservationErrorSolution,
        { code: "E0308" },
      ),
      choose(
        "tokio-reservation-cancellation-explain",
        "explain",
        "Anulowanie czego nie zachowuje?",
        "Dwa Future reserve czekają na pełny kanał. Pierwsze Future zostaje upuszczone przed zwolnieniem miejsca, a jego wiadomość pozostaje w Option poza Future. Co Tokio nadal może zmienić?",
        1,
        [
          "Przenieść wartość z Option do kanału mimo Drop Future.",
          "Usunąć pierwsze oczekiwanie z kolejki, więc następna próba może mieć inne miejsce względem innych nadawców.",
          "Zachować na zawsze Permit dla upuszczonego Future.",
        ],
        [
          "reserve nie posiada tej wartości, a upuszczone Future nie może samodzielnie wysłać danych.",
          "Kolejka zapewnia porządek aktywnych oczekiwań, ale anulowanie rezygnuje z własnego miejsca w kolejce.",
          "Permit istnieje dopiero po Ready. Drop istniejącego Permit zwraca capacity.",
        ],
      ),
      tokioExercise({
        id: "tokio-reservation-cancellation-retain-gate",
        kind: "apply",
        title: "Zachowaj wiadomość poza oczekującym reserve",
        prompt:
          "Uzupełnij `send_retained`. `pending` jest właścicielem Option<T>. Pusty slot ma zwrócić Ok bez rezerwacji. Dla niepustego: czekaj na `tx.reserve()` bez take, po Permit przenieś dokładnie jedną wartość do `permit.send`, a po zamknięciu zwróć Err bez zmiany Option. Test wykonuje pojedynczy poll pełnego kanału i upuszcza Future, kontroluje DropProbe poza Twoim kodem, potem prawdziwe recv zwalnia miejsce. Drugi przypadek sprawdza close oraz capacity pustego slotu.",
        code: sendRetainedStarter,
        solution: sendRetainedSolution,
        tests: sendRetainedTests,
        hints: [
          "Najpierw rozpoznaj None; po await nie możesz odzyskać wartości, jeśli zabierzesz ją przed rezerwacją.",
          "reserve zwraca Permit albo SendError<()>; zmapuj ten błąd, pozostawiając Option nietknięty.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-reservation-cancellation-blank",
        kind: "blank",
        title: "Od pustej kartki: forward po rezerwacji outputu",
        prompt:
          "Od pustej kartki napisz `async fn forward_reserved<T>(input: &mut mpsc::Receiver<T>, output: &mpsc::Sender<T>) -> Result<bool, ()>`. Najpierw rezerwuj output. Jeśli jest zamknięty, zwróć Err bez pobrania input. Po Permit odbierz jedną wartość z input i wyślij ją przez Permit, zwracając Ok(true); przy EOF input zwróć Ok(false). Kontrakt anulowania: podczas pełnego outputu Future nie może zabrać input; po Permit, gdy input jest pusty, Drop Future ma oddać capacity. Nie używaj zegara, yield ani pętli oczekiwania.",
        solution: forwardReservedSolution,
        tests: forwardReservedTests,
        hints: [
          "Kolejność await ma znaczenie: output.reserve przed input.recv chroni kolejkę input przed pobraniem bez miejsca docelowego.",
          "Permit zostanie upuszczony automatycznie przy EOF albo anulowaniu przed send, więc nie przechowuj go poza Future.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "reserve przyjmuje wiadomość tak jak send i może zwrócić jej T po błędzie.",
      "Anulowanie reserve zachowuje kolejkę oczekiwania tak samo jak zewnętrzny Option zachowuje wartość.",
      "Po zdobyciu Permit można bez skutku czekać na input; jego capacity nie jest wtedy zajęte.",
    ],
    transferTask:
      "Masz dwa etapy pipeline: wejście z plikami i bounded wyjście do zapisu. Zaproponuj pętlę przesyłającą po jednym pliku z rezerwacją wyjścia, a potem wyjaśnij osobno, co zostaje po anulowaniu, gdy wyjście jest pełne, i gdy wyjście ma Permit, ale wejście jest puste.",
    evidenceGate:
      "tokio-reservation-cancellation-retain-gate sprawdza, że T żyje poza Future podczas Pending i błędu close, a tokio-reservation-cancellation-blank sprawdza kolejność reserve/recv, input pozostawiony w kanale oraz capacity zwrócone przez Drop Pending forward.",
    sourceIds: [
      "tokio-mpsc-sender",
      "tokio-mpsc-receiver",
      "tokio-mpsc-permit",
      "tokio-mpsc-send-error",
    ],
  },
];

export const tokioChannelReviewExercises: Record<string, LessonStep> = {
  "tokio-bounded-channels": tokioExercise({
    id: "review-tokio-bounded-channels",
    kind: "apply",
    title: "Powtórka: wyślij parę i domknij własnego Sender",
    prompt:
      "Uzupełnij `send_pair_and_close`. Funkcja dostaje jedynego Sender oraz dwa posiadane T. Ma wysłać oba przez prawdziwe await send, potem upuścić własnego Sender i zwrócić Ok. Jeśli Receiver został wcześniej zamknięty, zwróć `SendError<T>` z pierwszą niesłaną wartością. Test używa capacity 1, więc prawdziwe recv musi zwolnić miejsce między wysyłkami; następnie odbiornik obserwuje None po domknięciu. To inny kontrakt niż `close_then_drain`: tutaj producent kończy własność send-side.",
    code: sendPairStarter,
    solution: sendPairSolution,
    tests: sendPairTests,
    hints: [
      "Zastosuj ? do obu `send(...).await`; dzięki temu pierwszy błąd zachowa właściwe T.",
      "Dopiero po udanych wysyłkach zwolnij posiadany Sender. Samo zakończenie async fn nie musi wyrażać tego kroku wprost.",
    ],
  }),
  "tokio-reservation-cancellation": tokioExercise({
    id: "review-tokio-reservation-cancellation",
    kind: "apply",
    title: "Powtórka: odłóż fabrykę do czasu Permit",
    prompt:
      "Uzupełnij `send_from_factory`. Przyjmuje FnOnce produkujące T, lecz nie może go wywołać przed udanym `reserve`. Gdy kanał jest pełny, pojedynczy kontrolowany poll ma pozostawić licznik wywołań na zero; upuszczenie Future także nie może tworzyć T. Po uzyskaniu Permit wywołaj fabrykę raz i wyślij wynik. Gdy kanał jest zamknięty, zwróć niewywołaną fabrykę w Err, aby wywołujący zdecydował, co dalej. To różni się od `send_retained`: tutaj własność fabryki należy do Future, a kontrakt dotyczy chwili jej wywołania.",
    code: factoryStarter,
    solution: factorySolution,
    tests: factoryTests,
    hints: [
      "reserve daj w match; gałąź Err może zwrócić factory bez wywoływania go.",
      "W gałęzi Ok Permit istnieje już przed factory(), więc jego wynik można przesłać bez drugiego oczekiwania.",
    ],
  }),
};
