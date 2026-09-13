import { choose, tokioRun, tokioExercise } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const tokioTimeSources: Source[] = [
  {
    id: "tokio-timeout",
    title: "Tokio 1.53: time::timeout",
    url: "https://docs.rs/tokio/1.53.1/tokio/time/fn.timeout.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki Elapsed, Drop Future po przekroczeniu deadline albo wymaganej funkcji time.",
  },
  {
    id: "tokio-select",
    title: "Tokio 1.53: tokio::select!",
    url: "https://docs.rs/tokio/1.53.1/tokio/macro.select.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie anulowania przegranych gałęzi, cancellation safety, fairness lub semantyki biased;.",
  },
  {
    id: "tokio-join-handle-time",
    title: "Tokio 1.53: task::JoinHandle",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/struct.JoinHandle.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyniku await albo semantyki Drop JoinHandle i odłączenia zadania.",
  },
  {
    id: "tokio-mpsc-recv-cancellation",
    title: "Tokio 1.53: sync::mpsc::Receiver::recv",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Receiver.html#method.recv",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie cancellation safety recv, zamknięcia kanału lub znaczenia None.",
  },
  {
    id: "tokio-oneshot-receiver-cancellation",
    title: "Tokio 1.53: sync::oneshot::Receiver",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/oneshot/struct.Receiver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie await Receiver, RecvError lub gwarancji cancellation safety dla &mut Receiver.",
  },
];

export const tokioTimeCompetencies: Competency[] = [
  {
    id: "timebox-work-without-losing-cleanup",
    title:
      "Ograniczasz czas oczekiwania bez utraty JoinHandle i jawnie doprowadzasz zadanie do zakończenia.",
  },
  {
    id: "select-with-retained-operation",
    title:
      "Zachowujesz trwającą operację przez kolejne iteracje select!, oceniasz cancellation safety i zapisujesz świadomą politykę priorytetu.",
  },
];

export const tokioTimeConcepts: Concept[] = [
  {
    id: "tokio-timeouts",
    title: "Timeout: co zostaje anulowane",
    prerequisites: ["tokio-reservation-cancellation"],
    competencyIds: ["timebox-work-without-losing-cleanup"],
    reviewPrompt:
      "Co zostaje upuszczone po `timeout(deadline, future)`, czym różni się przekazanie posiadanego Future od `&mut JoinHandle`, i jak po Elapsed kończysz dziecko bez odłączenia go przypadkiem?",
    reviewAnswer:
      "`timeout` posiada przekazany Future i upuszcza go po Elapsed; Drop nie cofa efektów, które Future zdążył już wykonać. Gdy tym Future jest sam `JoinHandle`, Drop odłącza działające zadanie i kod traci możliwość awaitowania jego wyniku. Gdy przekazujemy `&mut JoinHandle`, timeout upuszcza wyłącznie krótką pożyczkę, więc właściciel nadal ma handle. Po Elapsed trzeba wybrać prawdziwą politykę zakończenia, na przykład wysłać dziecku jawny sygnał release, awaitować ten sam handle i zachować jego JoinError.",
    distinguish:
      "Elapsed nie jest rollbackiem ani dowodem, że zadanie potomne się zatrzymało. Timeout własnego Future anuluje ten Future przez Drop. Timeout `&mut JoinHandle` ogranicza tylko oczekiwanie; dziecko dalej działa, dopóki nie dokończy, nie dostanie własnego sygnału zakończenia albo nie zostanie jawnie aborted przez inną politykę.",
  },
  {
    id: "tokio-select-cancellation",
    title: "select!: zachowana operacja i priorytet",
    prerequisites: ["tokio-timeouts"],
    competencyIds: ["select-with-retained-operation"],
    reviewPrompt:
      "Co `select!` robi z przegraną gałęzią, dlaczego `&mut oneshot::Receiver` można zachować w pętli, a kiedy wolno użyć `biased;`?",
    reviewAnswer:
      "Po ukończeniu zwycięskiej gałęzi `select!` upuszcza Futures pozostałych gałęzi. `mpsc::Receiver::recv` i await na `&mut oneshot::Receiver` są cancellation safe: anulowanie oczekiwania nie odbiera wiadomości. Mimo to zachowujemy jedną wartość `operation` i przekazujemy do kolejnych selekcji `&mut operation`, aby nie zastępować pracy nowym Future ani nie zgubić jej wyniku. Domyślny wybór jest fair w przybliżeniu przez losową kolejność odpytania; `biased;` wolno włączyć tylko wtedy, gdy kontrakt jawnie wymaga kolejności, na przykład shutdown przed gotową pracą, oraz gdy kod przejmuje odpowiedzialność za fairness.",
    distinguish:
      "Anulowanie gałęzi nie jest anulowaniem źródłowego zadania ani automatyczną gwarancją bezpieczeństwa każdego API. Cancellation safety znaczy, że upuszczenie nieukończonego Future i utworzenie go ponownie nie utraci postępu. `biased;` nie jest optymalizacją dającą ogólną poprawność: zmienia obserwowalny priorytet oraz przenosi odpowiedzialność za brak zagłodzenia na autora.",
  },
];

const timeoutOwnedRun = `use std::future;
use tokio::sync::{mpsc, oneshot};
use tokio::time::{timeout, Duration};

struct DropProbe {
    name: &'static str,
    dropped: mpsc::UnboundedSender<&'static str>,
}

impl Drop for DropProbe {
    fn drop(&mut self) {
        self.dropped.send(self.name).unwrap();
    }
}

#[tokio::main(flavor = "current_thread", start_paused = true)]
async fn main() {
    let (committed_tx, committed_rx) = oneshot::channel();
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();

    let outcome = timeout(Duration::from_secs(3), async move {
        let probe = DropProbe { name: "owned", dropped: dropped_tx };
        committed_tx.send(String::from("zapisane")).unwrap();
        future::pending::<()>().await;
        drop(probe);
    })
    .await;

    println!("commit={}", committed_rx.await.unwrap());
    println!("elapsed={}", outcome.is_err());
    println!("dropped={}", dropped_rx.recv().await.unwrap());
}`;

const timeoutDetachedHandleRun = `use tokio::sync::{mpsc, oneshot};
use tokio::time::{timeout, Duration};

struct DropProbe {
    dropped: mpsc::UnboundedSender<&'static str>,
}

impl Drop for DropProbe {
    fn drop(&mut self) {
        self.dropped.send("child-resource").unwrap();
    }
}

#[tokio::main(flavor = "current_thread", start_paused = true)]
async fn main() {
    let (release_tx, release_rx) = oneshot::channel();
    let (finished_tx, finished_rx) = oneshot::channel();
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
    let handle = tokio::spawn(async move {
        let probe = DropProbe { dropped: dropped_tx };
        release_rx.await.unwrap();
        finished_tx.send(String::from("dziecko-zakonczone")).unwrap();
        drop(probe);
    });

    println!("elapsed={}", timeout(Duration::from_secs(4), handle).await.is_err());
    release_tx.send(()).unwrap();
    println!("finished={}", finished_rx.await.unwrap());
    println!("dropped={}", dropped_rx.recv().await.unwrap());
}`;

const timeoutOwnedGateTests = `use std::future;
use tokio::sync::mpsc;
use tokio::time::{Duration, Instant};

struct DropProbe {
    dropped: mpsc::UnboundedSender<&'static str>,
}

impl Drop for DropProbe {
    fn drop(&mut self) {
        self.dropped.send("owned-pending").unwrap();
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn preserves_an_arbitrary_ready_output() {
    let result = timebox_owned(Duration::from_secs(8), async {
        vec![String::from("first"), String::from("second")]
    })
    .await
    .unwrap();

    assert_eq!(result, vec!["first", "second"]);
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn each_nonzero_deadline_drops_the_owned_pending_future_at_its_exact_timer_event() {
    for deadline in [Duration::from_secs(3), Duration::from_secs(17)] {
        let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
        let started = Instant::now();

        let result = timebox_owned(deadline, async move {
            let probe = DropProbe { dropped: dropped_tx };
            future::pending::<()>().await;
            drop(probe);
            String::from("unreachable")
        })
        .await;

        assert!(result.is_err());
        assert_eq!(started.elapsed(), deadline);
        assert_eq!(dropped_rx.recv().await.unwrap(), "owned-pending");
    }
}`;

const timeoutBlankTests = `#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn returns_the_non_copy_join_result_before_the_nonzero_deadline() {
    let mut handle = tokio::spawn(async {
        vec![String::from("first"), String::from("second")]
    });

    match join_before(Duration::from_secs(9), &mut handle).await {
        JoinBeforeDeadline::Completed(Ok(value)) => {
            assert_eq!(value, vec!["first", "second"]);
        }
        JoinBeforeDeadline::Completed(Err(error)) => panic!("unexpected JoinError: {error}"),
        JoinBeforeDeadline::Elapsed => panic!("ready child must finish before deadline"),
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn each_elapsed_deadline_keeps_the_same_handle_for_explicit_cleanup() {
    use tokio::sync::oneshot;
    use tokio::time::Instant;

    for deadline in [Duration::from_secs(3), Duration::from_secs(17)] {
        let (release_tx, release_rx) = oneshot::channel();
        let (effect_tx, effect_rx) = oneshot::channel();
        let mut handle = tokio::spawn(async move {
            release_rx.await.unwrap();
            effect_tx.send(String::from("cleanup-observed")).unwrap();
            String::from("joined-after-release")
        });
        let started = Instant::now();

        assert!(matches!(
            join_before(deadline, &mut handle).await,
            JoinBeforeDeadline::Elapsed,
        ));
        assert_eq!(started.elapsed(), deadline);
        release_tx.send(()).unwrap();
        assert_eq!(effect_rx.await.unwrap(), "cleanup-observed");
        assert_eq!(handle.await.unwrap(), "joined-after-release");
    }
}`;

const timeoutReviewTests = `#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn each_expiry_releases_then_joins_the_retained_child() {
    use tokio::sync::{mpsc, oneshot};
    use tokio::time::Instant;

    for deadline in [Duration::from_secs(3), Duration::from_secs(17)] {
        let (release_tx, release_rx) = oneshot::channel();
        let (effect_tx, mut effect_rx) = mpsc::unbounded_channel();
        let mut handle = tokio::spawn(async move {
            release_rx.await.unwrap();
            effect_tx.send(String::from("flushed")).unwrap();
            vec![String::from("child-result")]
        });
        let started = Instant::now();

        let result = deadline_then_release(deadline, &mut handle, release_tx)
            .await
            .unwrap();
        assert_eq!(started.elapsed(), deadline);
        assert_eq!(effect_rx.recv().await.unwrap(), "flushed");
        assert_eq!(result, vec!["child-result"]);
        assert!(handle.is_finished());
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn ready_child_returns_its_join_result_without_waiting_for_release() {
    use tokio::sync::oneshot;

    let mut handle = tokio::spawn(async { String::from("ready") });
    let (release_tx, release_rx) = oneshot::channel();
    assert_eq!(
        deadline_then_release(Duration::from_secs(12), &mut handle, release_tx)
            .await
            .unwrap(),
        "ready",
    );
    assert!(release_rx.await.is_err());
}`;

const timeoutBlankSolution = `use tokio::task::{JoinError, JoinHandle};
use tokio::time::{timeout, Duration};

enum JoinBeforeDeadline<T> {
    Completed(Result<T, JoinError>),
    Elapsed,
}

async fn join_before<T>(deadline: Duration, handle: &mut JoinHandle<T>) -> JoinBeforeDeadline<T> {
    match timeout(deadline, handle).await {
        Ok(result) => JoinBeforeDeadline::Completed(result),
        Err(_) => JoinBeforeDeadline::Elapsed,
    }
}`;

const timeoutOwnedGateStarter = `use std::future::Future;
use tokio::time::{timeout, error::Elapsed, Duration};

async fn timebox_owned<T, F>(
    _deadline: Duration,
    future: F,
) -> Result<T, Elapsed>
where
    F: Future<Output = T>,
{
    timeout(Duration::from_secs(0), future).await
}`;

const timeoutOwnedGateSolution = `use std::future::Future;
use tokio::time::{timeout, error::Elapsed, Duration};

async fn timebox_owned<T, F>(deadline: Duration, future: F) -> Result<T, Elapsed>
where
    F: Future<Output = T>,
{
    timeout(deadline, future).await
}`;

const timeoutReviewStarter = `use tokio::sync::oneshot;
use tokio::task::{JoinError, JoinHandle};
use tokio::time::Duration;

async fn deadline_then_release<T>(
    _deadline: Duration,
    _handle: &mut JoinHandle<T>,
    _release: oneshot::Sender<()>,
) -> Result<T, JoinError> {
    panic!("observe the deadline, then clean up and join the same task")
}`;

const timeoutReviewSolution = `use tokio::sync::oneshot;
use tokio::task::{JoinError, JoinHandle};
use tokio::time::{timeout, Duration};

async fn deadline_then_release<T>(
    deadline: Duration,
    handle: &mut JoinHandle<T>,
    release: oneshot::Sender<()>,
) -> Result<T, JoinError> {
    match timeout(deadline, &mut *handle).await {
        Ok(result) => result,
        Err(_) => {
            release.send(()).unwrap();
            handle.await
        }
    }
}`;

const selectDropRun = `use tokio::sync::{mpsc, oneshot};

struct DropProbe {
    name: &'static str,
    dropped: mpsc::UnboundedSender<&'static str>,
}

impl Drop for DropProbe {
    fn drop(&mut self) {
        self.dropped.send(self.name).unwrap();
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
    let (_slow_tx, slow_rx) = oneshot::channel::<()>();
    let (fast_tx, mut fast_rx) = oneshot::channel();
    fast_tx.send("ready").unwrap();
    let probe = DropProbe { name: "losing", dropped: dropped_tx };
    let losing = async move {
        slow_rx.await.unwrap();
        drop(probe);
    };

    tokio::select! {
        _ = losing => println!("winner=slow"),
        value = &mut fast_rx => println!("winner={}", value.unwrap()),
    }
    println!("dropped={}", dropped_rx.recv().await.unwrap());
}`;

const selectBlankTests = `use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Noop;

impl Wake for Noop {
    fn wake(self: Arc<Self>) {}
}

fn poll_once<F: Future>(future: std::pin::Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Noop));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[tokio::test(flavor = "current_thread")]
async fn keeps_one_pending_operation_while_forwarding_each_wake() {
    use tokio::sync::{mpsc, oneshot};

    let (work_tx, work_rx) = oneshot::channel();
    let (wake_tx, wake_rx) = mpsc::channel(2);
    wake_tx.try_send(String::from("first-wake")).unwrap();
    wake_tx.try_send(String::from("second-wake")).unwrap();
    let (observed_tx, mut observed_rx) = mpsc::unbounded_channel();
    let mut waiting = Box::pin(await_operation_through_wakes(work_rx, wake_rx, observed_tx));

    assert!(matches!(poll_once(waiting.as_mut()), Poll::Pending));
    assert_eq!(observed_rx.try_recv().unwrap(), "first-wake");
    assert_eq!(observed_rx.try_recv().unwrap(), "second-wake");

    drop(wake_tx);
    assert!(matches!(poll_once(waiting.as_mut()), Poll::Pending));
    work_tx
        .send(vec![String::from("preserved"), String::from("operation")])
        .unwrap();
    assert_eq!(
        waiting.await.unwrap(),
        vec![String::from("preserved"), String::from("operation")],
    );
}

#[tokio::test(flavor = "current_thread")]
async fn closed_wake_stream_preserves_the_operation_error() {
    use tokio::sync::{mpsc, oneshot};

    let (work_tx, work_rx) = oneshot::channel::<String>();
    let (wake_tx, wake_rx) = mpsc::channel(1);
    drop(wake_tx);
    drop(work_tx);
    let (observed_tx, mut observed_rx) = mpsc::unbounded_channel();

    assert!(await_operation_through_wakes(work_rx, wake_rx, observed_tx)
        .await
        .is_err());
    assert!(observed_rx.try_recv().is_err());
}`;

const selectReceiveGateTests = `use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Noop;

impl Wake for Noop {
    fn wake(self: Arc<Self>) {}
}

fn poll_once<F: Future>(future: std::pin::Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Noop));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[tokio::test(flavor = "current_thread")]
async fn serves_buffered_messages_then_stops_on_an_explicit_signal() {
    use tokio::sync::{mpsc, oneshot};

    let (tx, mut rx) = mpsc::channel(2);
    tx.try_send(String::from("first")).unwrap();
    tx.try_send(String::from("second")).unwrap();
    let (stop_tx, stop_rx) = oneshot::channel();
    let mut service = Box::pin(collect_until_stop(&mut rx, stop_rx));

    assert!(matches!(poll_once(service.as_mut()), Poll::Pending));
    stop_tx.send(()).unwrap();
    assert_eq!(service.await, vec!["first", "second"]);
}

#[tokio::test(flavor = "current_thread")]
async fn cancelled_receive_does_not_consume_a_later_message() {
    use tokio::sync::{mpsc, oneshot};

    let (tx, mut rx) = mpsc::channel(1);
    let (stop_tx, stop_rx) = oneshot::channel();
    let mut service = Box::pin(collect_until_stop(&mut rx, stop_rx));

    assert!(matches!(poll_once(service.as_mut()), Poll::Pending));
    stop_tx.send(()).unwrap();
    assert!(service.await.is_empty());
    tx.send(String::from("still-available")).await.unwrap();
    assert_eq!(rx.recv().await.unwrap(), "still-available");
}

#[tokio::test(flavor = "current_thread")]
async fn dropped_stop_controller_also_requests_stop() {
    use tokio::sync::{mpsc, oneshot};

    let (tx, mut rx) = mpsc::channel(1);
    let (stop_tx, stop_rx) = oneshot::channel();
    let service = collect_until_stop(&mut rx, stop_rx);

    drop(stop_tx);
    assert!(service.await.is_empty());
    tx.send(String::from("still-available")).await.unwrap();
    assert_eq!(rx.recv().await.unwrap(), "still-available");
}

#[tokio::test(flavor = "current_thread")]
async fn closed_message_stream_returns_all_already_buffered_values() {
    use tokio::sync::{mpsc, oneshot};

    let (tx, mut rx) = mpsc::channel(2);
    tx.try_send(String::from("drained")).unwrap();
    drop(tx);
    let (_stop_tx, stop_rx) = oneshot::channel();

    assert_eq!(collect_until_stop(&mut rx, stop_rx).await, vec!["drained"]);
}`;

const selectReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn explicit_biased_contract_gives_shutdown_priority_when_both_are_ready() {
    use tokio::sync::oneshot;

    let (work_tx, work_rx) = oneshot::channel();
    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    work_tx.send(String::from("work")).unwrap();
    shutdown_tx.send(()).unwrap();

    assert!(matches!(
        choose_shutdown_first(work_rx, shutdown_rx).await,
        Next::Shutdown,
    ));
}

#[tokio::test(flavor = "current_thread")]
async fn explicit_priority_does_not_hide_the_only_work_result_or_its_error() {
    use tokio::sync::oneshot;

    let (work_tx, work_rx) = oneshot::channel();
    let (_shutdown_tx, shutdown_rx) = oneshot::channel();
    work_tx.send(vec![String::from("non-copy")]).unwrap();
    match choose_shutdown_first(work_rx, shutdown_rx).await {
        Next::Work(Ok(value)) => assert_eq!(value, vec!["non-copy"]),
        Next::Work(Err(error)) => panic!("unexpected work error: {error}"),
        Next::Shutdown => panic!("shutdown sender was not ready"),
    }

    let (work_tx, work_rx) = oneshot::channel::<String>();
    let (_shutdown_tx, shutdown_rx) = oneshot::channel();
    drop(work_tx);
    assert!(matches!(
        choose_shutdown_first(work_rx, shutdown_rx).await,
        Next::Work(Err(_)),
    ));
}`;

const selectBlankSolution = `use tokio::sync::{mpsc, oneshot};

async fn await_operation_through_wakes<T>(
    mut operation: oneshot::Receiver<T>,
    mut wakeups: mpsc::Receiver<String>,
    observed: mpsc::UnboundedSender<String>,
) -> Result<T, oneshot::error::RecvError> {
    loop {
        tokio::select! {
            result = &mut operation => return result,
            wake = wakeups.recv() => match wake {
                Some(wake) => observed.send(wake).unwrap(),
                None => break,
            },
        }
    }
    operation.await
}`;

const selectReceiveGateStarter = `use tokio::sync::{mpsc, oneshot};

async fn collect_until_stop(
    _receiver: &mut mpsc::Receiver<String>,
    _stop: oneshot::Receiver<()>,
) -> Vec<String> {
    Vec::new()
}`;

const selectReceiveGateSolution = `use tokio::sync::{mpsc, oneshot};

async fn collect_until_stop(
    receiver: &mut mpsc::Receiver<String>,
    mut stop: oneshot::Receiver<()>,
) -> Vec<String> {
    let mut values = Vec::new();
    loop {
        tokio::select! {
            message = receiver.recv() => match message {
                Some(message) => values.push(message),
                None => break,
            },
            _ = &mut stop => break,
        }
    }
    values
}`;

const selectReviewStarter = `use tokio::sync::oneshot;

enum Next<T> {
    Work(Result<T, oneshot::error::RecvError>),
    Shutdown,
}

async fn choose_shutdown_first<T>(
    work: oneshot::Receiver<T>,
    shutdown: oneshot::Receiver<()>,
) -> Next<T> {
    let _ = (work, shutdown);
    Next::Shutdown
}`;

const selectReviewSolution = `use tokio::sync::oneshot;

enum Next<T> {
    Work(Result<T, oneshot::error::RecvError>),
    Shutdown,
}

async fn choose_shutdown_first<T>(
    mut work: oneshot::Receiver<T>,
    mut shutdown: oneshot::Receiver<()>,
) -> Next<T> {
    tokio::select! {
        biased;
        _ = &mut shutdown => Next::Shutdown,
        result = &mut work => Next::Work(result),
    }
}`;

export const tokioTimeLessons: Lesson[] = [
  {
    id: "tokio-timeouts",
    moduleId: "tokio-flow-control",
    conceptIds: ["tokio-timeouts"],
    competencyIds: ["timebox-work-without-losing-cleanup"],
    prerequisites: ["tokio-reservation-cancellation"],
    title: "Timeout: anulowanie Future i odpowiedzialność za zadanie",
    subtitle:
      "Ograniczysz czas prawdziwym zegarem Tokio, zachowasz JoinHandle i dokończysz dziecko przez jawną politykę cleanup.",
    minutes: 27,
    outcomes: [
      "Rozpoznasz, że Elapsed upuszcza posiadany Future, lecz nie cofa wykonanego efektu.",
      "Odróżnisz timeout samego JoinHandle, który odłącza zadanie, od timeoutu `&mut JoinHandle`, który zachowuje uchwyt.",
      "Zwrócisz rozróżnialny wynik gotowego zadania i Elapsed dla dowolnego deadline, a następnie jawnie zakończysz dziecko.",
    ],
    steps: [
      choose(
        "tokio-timeouts-predict-owner",
        "predict",
        "Która wartość znika po Elapsed?",
        "Masz `timeout(deadline, future)`. Future najpierw wysyła przez oneshot String `zapisane`, potem pozostaje Pending i zawiera DropProbe. Co jest właściwą obserwacją po Elapsed?",
        1,
        [
          "Timeout cofa wysłany String, bo Future nie doszło do końca.",
          "Timeout upuszcza Future i DropProbe, ale już wysłany String pozostaje efektem zewnętrznym.",
          "Timeout przejmuje Sender z powrotem i pozwala wysłać wartość drugi raz.",
        ],
        [
          "Drop Future nie może cofnąć wartości, którą kanał już przyjął.",
          "To rozdziela anulowanie Future przez Drop od rollbacku efektów; kanał i DropProbe dają dwa niezależne obserwowalne dowody.",
          "Sender zostaje zużyty przez `send`; timeout nie odwraca własności ani nie odtwarza wiadomości.",
        ],
      ),
      tokioRun(
        "tokio-timeouts-owned-drop-run",
        "Zobacz zapis przed Drop posiadanego Future",
        "Zegar Tokio jest zatrzymany na początku testowego runtime i automatycznie przechodzi do jedynego deadline. Nie mierzymy czasu ściennego: oneshot potwierdza zapis, a DropProbe po Elapsed potwierdza anulowanie tego samego Future.",
        timeoutOwnedRun,
        "commit=zapisane\nelapsed=true\ndropped=owned\n",
      ),
      tokioExercise({
        id: "tokio-timeouts-owned-gate",
        kind: "modify",
        title: "Ogranicz posiadany Future przez deadline wywołującego",
        prompt:
          "Uzupełnij `timebox_owned`. Ma przyjąć dowolny `Future<Output = T>` i przekazany przez wywołującego `Duration`, a potem zwrócić dokładnie `Result<T, Elapsed>` Tokio. Zachowaj dowolny, także nie-Copy Output, gdy Future kończy się przed deadline. Gdy Future pozostaje Pending, zatrzymany zegar Tokio automatycznie przechodzi przez niezerowy deadline; test sprawdza dokładny moment `Instant`, `Err(Elapsed)` i DropProbe posiadanego Future. Nie zastępuj deadline zerem, sleep, yield ani ręcznym executorem.",
        code: timeoutOwnedGateStarter,
        solution: timeoutOwnedGateSolution,
        tests: timeoutOwnedGateTests,
        hints: [
          "`tokio::time::timeout` już zwraca `Result<T, Elapsed>`; przekaż do niego parametr `deadline` i dokładnie przekazany Future.",
          "Nie awaituj Future osobno: wtedy ominiesz timer i nie będzie on właścicielem Future, który ma anulować przez Drop.",
        ],
        forbiddenPatterns: [
          "Duration::ZERO",
          "Duration::from_secs(0)",
          "sleep(",
          "yield_now",
          "std::thread",
        ],
        gate: true,
      }),
      tokioRun(
        "tokio-timeouts-owned-handle-run",
        "Zobacz, jak timeout własnego handle odłącza dziecko",
        "Tu `timeout` posiada sam JoinHandle. Po Elapsed handle zostaje upuszczony, więc nie da się już odebrać jego wyniku. Jawny `release` i kanały pokazują jednak, że odłączone dziecko nadal kończy pracę oraz zwalnia własny zasób. W produkcyjnym helperze zachowamy handle przez pożyczkę.",
        timeoutDetachedHandleRun,
        "elapsed=true\nfinished=dziecko-zakonczone\ndropped=child-resource\n",
      ),
      choose(
        "tokio-timeouts-borrow-handle",
        "explain",
        "Który argument zachowuje odpowiedzialność za dziecko?",
        "Chcesz po Elapsed wysłać dziecku sygnał cleanup i potem odebrać jego rzeczywisty `Result<T, JoinError>`. Co przekazujesz do `timeout`?",
        2,
        [
          "Sam JoinHandle: jego Drop zatrzyma dziecko automatycznie.",
          "Klon JoinHandle: każdy JoinHandle można klonować do niezależnego awaitowania.",
          "`&mut handle`: timeout może skończyć oczekiwanie, a właściciel nadal ma ten sam handle do cleanup i await.",
        ],
        [
          "Drop JoinHandle odłącza task; nie jest sygnałem anulowania ani sposobem na późniejszy await.",
          "JoinHandle nie jest klonowalnym biletem do wyniku; trzeba zachować konkretny uchwyt.",
          "Pożyczka jest Future dla timeout, lecz handle nie zmienia właściciela. Po zakończeniu pożyczki można wysłać domenowy sygnał i awaitować task.",
        ],
      ),
      tokioExercise({
        id: "tokio-timeouts-blank",
        kind: "blank",
        title: "Od pustej kartki: wynik przed deadline bez utraty JoinHandle",
        prompt:
          "Od pustej kartki zaprojektuj enum `JoinBeforeDeadline<T>` z `Completed(Result<T, JoinError>)` i `Elapsed`, a także `async fn join_before<T>(deadline: Duration, handle: &mut JoinHandle<T>) -> JoinBeforeDeadline<T>`. Kontrakt przyjmuje dowolny niezerowy deadline: gotowe zadanie zwraca pełny Result (w tym JoinError), a Elapsed nie konsumuje handle. Test z zatrzymanym zegarem Tokio uruchamia gotowe dziecko i osobne dziecko czekające na oneshot; po Elapsed test wysyła release, obserwuje efekt oraz awaituje dokładnie ten sam handle. Nie używaj sleep, yield, własnego executora ani deadline równego zeru.",
        solution: timeoutBlankSolution,
        tests: timeoutBlankTests,
        hints: [
          "`timeout(deadline, handle).await` działa na pożyczonym JoinHandle; dopasuj Ok(Result<T, JoinError>) oraz Err(Elapsed) do własnego enum.",
          "Nie używaj `?`: JoinError jest prawidłową częścią wariantu Completed, a po Err(Elapsed) funkcja ma wrócić bez awaitowania handle.",
        ],
        forbiddenPatterns: [
          "Duration::ZERO",
          "sleep(",
          "yield_now",
          "std::thread",
        ],
        gate: true,
      }),
      choose(
        "tokio-timeouts-cleanup-policy",
        "recall",
        "Co robi helper po Elapsed?",
        "Dziecko czeka na oneshot `release`, a kod wywołujący potrzebuje jego Output albo JoinError. Która polityka daje kontrolowane zakończenie bez odłączenia?",
        0,
        [
          "Zachowaj `&mut JoinHandle`, wyślij release, potem awaituj ten sam handle i zwróć jego Result.",
          "Upuść handle i załóż, że Drop kończy zadanie oraz zwalnia jego zasoby.",
          "Po Elapsed wywołaj `std::mem::forget(handle)`, aby task nie mógł niczego zrobić.",
        ],
        [
          "To jawnie opisuje cleanup i zachowuje wynik zadania; konkretny sygnał może być inny, ale właściciel musi go wybrać.",
          "Drop tylko odłącza uchwyt. Bez niezależnego potwierdzenia nie wiadomo, co dzieje się z dzieckiem ani jego błędem.",
          "Zapomnienie uchwytu nie jest cleanupem i ukrywa odpowiedzialność za cykl życia zadania.",
        ],
      ),
    ],
    misconceptions: [
      "Elapsed cofa każdy efekt wykonany przed anulowaniem Future.",
      "Drop JoinHandle jest równoważny abort i zwalnia z odbioru wyniku dziecka.",
      "Timeout wymaga zera albo ściennego sleep, aby test był deterministyczny.",
      "Pożyczony JoinHandle można bezpiecznie zgubić po jednym timeout.",
    ],
    transferTask:
      "Masz task zapisujący plik tymczasowy i czekający na sygnał commit lub cleanup. Opisz enum wyniku deadline, kto pozostaje właścicielem JoinHandle, jaki sygnał wyślesz po Elapsed oraz gdzie odbierzesz JoinError. Wskaż też efekt, którego Drop posiadanego Future nie cofnie.",
    evidenceGate:
      "tokio-timeouts-owned-gate sprawdza niezerowy deadline, dowolny Output i DropProbe posiadanego Future; tokio-timeouts-blank oddziela gotowy Result od Elapsed dla pożyczonego handle i po Elapsed obserwuje jawne zakończenie tego samego tasku. Powtórka `review-tokio-timeouts` sprawdza osobno, że helper najpierw ogranicza oczekiwanie, a dopiero potem uwalnia i joinuje dziecko.",
    sourceIds: [
      "tokio-timeout",
      "tokio-join-handle-time",
      "tokio-oneshot-receiver-cancellation",
    ],
  },
  {
    id: "tokio-select-cancellation",
    moduleId: "tokio-flow-control",
    conceptIds: ["tokio-select-cancellation"],
    competencyIds: ["select-with-retained-operation"],
    prerequisites: ["tokio-timeouts"],
    title: "select!: anulowanie gałęzi, zachowana operacja i jawny priorytet",
    subtitle:
      "Zachowasz pending operation przez wake-upy, odczytasz cancellation safety kanałów i wpiszesz `biased;` tylko do kontraktu, który naprawdę wymaga priorytetu.",
    minutes: 29,
    outcomes: [
      "Wykażesz przez DropProbe, że zwycięska gałąź select! upuszcza przegrany Future.",
      "Zachowasz jeden oneshot Receiver przez pętlę, wake-upy i zamknięcie kanału bez zastępowania operacji.",
      "Rozróżnisz domyślną fairness od jawnego `biased;` z shutdown przed gotową pracą.",
    ],
    steps: [
      choose(
        "tokio-select-cancellation-fairness",
        "predict",
        "Czy pierwszy zapisany branch zawsze wygrywa?",
        "Dwie gałęzie `select!` są gotowe w tym samym momencie. Bez `biased;` jaki kontrakt daje Tokio?",
        1,
        [
          "Pierwsza gałąź zawsze wygrywa, bo makro czyta kod od góry do dołu.",
          "Makro losowo wybiera gałąź do pierwszego odpytywania; nie wolno obiecać stałego priorytetu.",
          "Obie gałęzie wykonują się do końca i zwracają dwa wyniki.",
        ],
        [
          "Taka kolejność pojawia się dopiero po świadomym `biased;`.",
          "Domyślna kolejność daje pewną fairness w pętli, lecz nie jest API dla deterministycznego priorytetu.",
          "select! kończy się przy zwycięskiej gałęzi i anuluje Futures pozostałych gałęzi.",
        ],
      ),
      tokioRun(
        "tokio-select-cancellation-drop-run",
        "Obserwuj Drop przegranej gałęzi",
        "Szybki oneshot jest już gotowy, a drugi Future czeka. DropProbe zostaje utworzony poza ciałem pending branch, więc kanał obserwuje jego Drop nawet wtedy, gdy select! nie zdąży odpytac tej gałęzi przed wyborem zwycięzcy.",
        selectDropRun,
        "winner=ready\ndropped=losing\n",
      ),
      choose(
        "tokio-select-cancellation-safety",
        "explain",
        "Które oczekiwanie można anulować i odtworzyć?",
        "W pętli select! inna gałąź może wygrać zanim oczekiwanie dojdzie do końca. Który zestaw Tokio jest opisany jako cancellation safe?",
        0,
        [
          "`mpsc::Receiver::recv` oraz await na `&mut oneshot::Receiver`.",
          "`Mutex::lock` oraz `Semaphore::acquire`, bo kolejka sama przywróci miejsce.",
          "`AsyncReadExt::read_exact`, bo zawsze zwraca pełny bufor.",
        ],
        [
          "Anulowanie tych oczekiwań nie odbiera wiadomości. Nadal świadomie przechowujemy Receiver, aby jego wynik i zamknięcie były własnością jednego przepływu.",
          "Te Future tracą miejsce w kolejce fairness po anulowaniu, więc pętla może głodzić operację.",
          "read_exact może stracić częściowy postęp, jeśli Future zostanie upuszczony przed pełnym wynikiem.",
        ],
      ),
      tokioExercise({
        id: "tokio-select-cancellation-recv-gate",
        kind: "modify",
        title:
          "Obsłuż wiadomości do jawnego stop bez utraty późniejszej wiadomości",
        prompt:
          "Uzupełnij `collect_until_stop`. Pożycza `mpsc::Receiver<String>` oraz posiada oneshot stop. W pętli `tokio::select!` zbieraj każdą otrzymaną wiadomość w kolejności do Vec; zakończ po `None` albo zakończonym stop: wysłanie `()` i Drop Sendera są tu jawną polityką żądania zatrzymania. `recv` ma pozostać prawdziwym Tokio API w gałęzi select!. Test ręcznie odpytuje Future z dwoma zbuforowanymi wiadomościami, następnie daje stop; drugi test odpytuje pusty recv, daje stop i wysyła wiadomość dopiero po zakończeniu helpera — pożyczony receiver musi ją nadal odebrać. Trzeci test upuszcza Sender stop i wymaga tej samej polityki, a czwarty zamyka nadawcę po wiadomości i wymaga drain. Nie używaj sleep, yield, try_recv ani zamiennika kanału.",
        code: selectReceiveGateStarter,
        solution: selectReceiveGateSolution,
        tests: selectReceiveGateTests,
        hints: [
          "`receiver.recv()` zwraca `Option<String>`; Some dodaj do Vec, a None ma zakończyć pętlę po drain.",
          "Receiver jest pożyczony przez helper, a stop trzeba awaitować jako `&mut stop`; po wyborze wysłanego albo zamkniętego stop Future zwraca Vec i kończy pożyczkę.",
        ],
        forbiddenPatterns: [
          "try_recv",
          "sleep(",
          "yield_now",
          "std::thread",
          "std::mem::forget",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-select-cancellation-blank",
        kind: "blank",
        title:
          "Od pustej kartki: zachowaj operation przez wake-upy i zamknięcie",
        prompt:
          "Od pustej kartki napisz `await_operation_through_wakes`. Przyjmuje posiadany `oneshot::Receiver<T>` jako operation, `mpsc::Receiver<String>` z wake-upami oraz `UnboundedSender<String>` obserwacji. Kontrakt: zachowaj jedną mutable wartość operation i do każdej iteracji `select!` przekazuj `&mut operation`; dla każdego wake wyślij jego dokładny String do `observed`; `None` z wakeups kończy wyłącznie obsługę wake-upów, po czym zwracasz prawdziwy Result operation. Nie twórz zastępczego Receiver ani Future, nie upuszczaj operation po wake i nie kręć pętli po zamkniętym wake stream. Test ręcznie odpytuje prawdziwy Future z kanałami Tokio: obserwuje dwa wake-upy, zamyka wake stream, potem wysyła nie-Copy wynik operation; osobny test zachowuje RecvError operation po zamknięciu obu stron.",
        solution: selectBlankSolution,
        tests: selectBlankTests,
        hints: [
          "Nadaj nazwę `mut operation`; branch `result = &mut operation` zachowuje ten sam Receiver po wygranej gałęzi wake-up.",
          "Gdy `wakeups.recv()` zwróci None, wyjdź z pętli i awaituj nadal posiadany `operation`; nie twórz kolejnego kanału.",
        ],
        forbiddenPatterns: [
          "std::thread",
          "std::mem::forget",
          "mem::forget",
          "yield_now",
          "sleep(",
        ],
        gate: true,
      }),
      choose(
        "tokio-select-cancellation-priority-contract",
        "recall",
        "Kiedy `biased;` jest częścią poprawności?",
        "Pipeline może mieć gotową pracę i gotowy sygnał shutdown w tej samej selekcji. Jaka decyzja jest uczciwa wobec przyszłego czytelnika kodu?",
        2,
        [
          "Dodaj `biased;` zawsze: będzie szybciej i Tokio zagwarantuje fairness.",
          "Zostaw domyślność, ale załóż, że shutdown i tak zwykle wygra.",
          "Jeśli kontrakt mówi „shutdown ma pierwszeństwo”, użyj `biased;`, umieść shutdown przed pracą i opisz odpowiedzialność za fairness.",
        ],
        [
          "biased; zmienia obserwowalną politykę i może głodzić późniejsze gałęzie.",
          "Domyślna losowość nie obiecuje wymaganego zwycięzcy, gdy oba Future są gotowe.",
          "To jedyny wariant, który zamienia wymagany priorytet w czytelny, testowalny kontrakt zamiast przypadkowej własności harmonogramu.",
        ],
      ),
      choose(
        "tokio-select-cancellation-transfer",
        "explain",
        "Co sprawdzasz przed wstawieniem Future do pętli select!?",
        "Chcesz dodać branch do pętli, w której często wygrywają wake-upy. Jaka kolejność pytań chroni stan operacji?",
        1,
        [
          "Najpierw dopisz branch, a gdy test czasem zgubi dane, wstaw `biased;`.",
          "Ustal, czy Drop i ponowne utworzenie Future jest no-op dla postępu; jeśli nie, zachowaj jeden Future lub wybierz inną strukturę przepływu.",
          "Zamień każdy Future na spawn, ponieważ taski nie mogą być anulowane przez select!.",
        ],
        [
          "biased; nie naprawia cancellation safety, tylko wybiera kolejność odpytywania.",
          "To definicja cancellation safety użyteczna w pętli: operacja musi bezpiecznie znosić przerwanie albo pozostać zachowana poza kolejną selekcją.",
          "select! może odłączyć JoinHandle, gdy posiada go bezpośrednio; spawn nie usuwa potrzeby decyzji o własności i cleanup.",
        ],
      ),
    ],
    misconceptions: [
      "select! wykonuje wszystkie gotowe gałęzie i nie upuszcza przegranych Future.",
      "Każde async API jest cancellation safe, jeśli jest używane w Tokio.",
      "Po None z mpsc::Receiver należy stale wywoływać recv w pętli.",
      "biased; jest bezpiecznym domyślnym sposobem na deterministyczny kod.",
    ],
    transferTask:
      "Projektujesz worker, który ma jeden wynik walidacji, wake-upy z kontrolera i sygnał shutdown. Opisz, które Future zachowasz jako zmienne, co dzieje się po zamknięciu wake stream, które API sprawdzisz pod kątem cancellation safety oraz czy shutdown musi mieć jawny priorytet nad gotową pracą.",
    evidenceGate:
      "tokio-select-cancellation-recv-gate sprawdza cancellation-safe recv, stop wysłany albo wynikający z Drop Sendera, późniejszą wiadomość i drain zamkniętego kanału; tokio-select-cancellation-blank ręcznie odpytuje jeden prawdziwy Future nad kanałami Tokio, aby sprawdzić dwa wake-upy, zamknięcie streamu i nie-Copy wynik tego samego operation. Powtórka `review-tokio-select-cancellation` sprawdza osobno deterministyczny priorytet shutdown tylko przez jawne `biased;` oraz zachowanie Result pracy.",
    sourceIds: [
      "tokio-select",
      "tokio-mpsc-recv-cancellation",
      "tokio-oneshot-receiver-cancellation",
    ],
  },
];

export const tokioTimeReviewExercises: Record<string, LessonStep> = {
  "tokio-timeouts": tokioExercise({
    id: "review-tokio-timeouts",
    kind: "debug",
    title: "Przegląd kodu: po Elapsed zwolnij i joinuj zachowany task",
    prompt:
      "Popraw `deadline_then_release`. Kontrakt code review: helper bierze dowolny deadline, mutable JoinHandle i Sender release. Jeśli task zdąży przed deadline, zwraca jego rzeczywisty Result i nie wysyła release. Jeśli nadejdzie Elapsed, timeout może zakończyć wyłącznie oczekiwanie na `&mut handle`; dopiero potem helper wysyła release i awaituje ten sam handle. Test zatrzymuje czas Tokio, sprawdza non-Copy wynik dziecka, efekt cleanup przez kanał i brak release w ścieżce gotowego tasku. Nie upuszczaj handle, nie używaj abort, sleep, yield ani zerowego deadline.",
    code: timeoutReviewStarter,
    solution: timeoutReviewSolution,
    tests: timeoutReviewTests,
    hints: [
      "W match rozdziel `Ok(result)` od `Err(_)` zwróconych przez timeout na pożyczonym `&mut *handle`.",
      "Tylko gałąź Err ma wysłać release. Potem `handle.await` nadal zwraca Result<T, JoinError> tego samego tasku.",
    ],
    forbiddenPatterns: [
      "Duration::ZERO",
      ".abort()",
      "std::mem::forget",
      "mem::forget",
      "yield_now",
      "sleep(",
    ],
    gate: true,
  }),
  "tokio-select-cancellation": tokioExercise({
    id: "review-tokio-select-cancellation",
    kind: "debug",
    title: "Przegląd kodu: shutdown przed pracą tylko przez jawny priorytet",
    prompt:
      "Popraw `choose_shutdown_first`. Ten helper ma udokumentowaną politykę: kiedy work i shutdown są jednocześnie gotowe, zwraca `Next::Shutdown`; gdy wyłącznie work jest gotowy, zachowuje jego pełny `Result<T, RecvError>`. Użyj prawdziwego `tokio::select!` z `biased;`, umieść shutdown jako pierwszą gałąź i pożycz oba Receiver przez `&mut`. To jest świadoma reguła priorytetu, nie ogólna rada dla każdej selekcji. Test daje oba oneshoty gotowe, potem sam sukces i błąd work. Nie zastępuj select! if-em, try_recv ani losową kolejnością.",
    code: selectReviewStarter,
    solution: selectReviewSolution,
    tests: selectReviewTests,
    hints: [
      "Receiver oneshot jest Future; nadaj obu parametrom `mut`, aby branch mógł awaitować `&mut shutdown` i `&mut work`.",
      "`biased;` stoi zaraz po otwierającym `{`, a shutdown musi być przed branch work, aby polityka była deterministyczna.",
    ],
    forbiddenPatterns: [
      "try_recv",
      "if shutdown",
      "std::thread",
      "std::mem::forget",
    ],
    gate: true,
  }),
};
