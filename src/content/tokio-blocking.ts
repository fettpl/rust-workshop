import { choose, tokioError, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

export const tokioBlockingSources: Source[] = [
  {
    id: "tokio-blocking-spawn",
    title: "Tokio 1.54.1: task::spawn_blocking",
    url: "https://docs.rs/tokio/1.54.1/tokio/task/fn.spawn_blocking.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie granic FnOnce, Send i 'static, puli blokującej albo zachowania abort dla rozpoczętej pracy.",
  },
  {
    id: "tokio-blocking-runtime-shutdown",
    title: "Tokio 1.54.1: runtime::Runtime shutdown",
    url: "https://docs.rs/tokio/1.54.1/tokio/runtime/struct.Runtime.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie Drop runtime, shutdown_timeout albo warunków dalszego działania rozpoczętego blocking closure.",
  },
  {
    id: "tokio-blocking-semaphore",
    title: "Tokio 1.54.1: sync::Semaphore",
    url: "https://docs.rs/tokio/1.54.1/tokio/sync/struct.Semaphore.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie acquire_owned, AcquireError, OwnedSemaphorePermit albo zwalniania permit przez Drop.",
  },
  {
    id: "tokio-blocking-join-handle",
    title: "Tokio 1.54.1: task::JoinHandle",
    url: "https://docs.rs/tokio/1.54.1/tokio/task/struct.JoinHandle.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie Result zwracanego przez await, JoinError panic lub skutków abort i Drop uchwytu.",
  },
];

export const tokioBlockingCompetencies: Competency[] = [
  {
    id: "offload-owned-blocking-work",
    title:
      "Przenosisz krótką pracę blokującą z posiadanymi danymi poza executor i zachowujesz jej pełny wynik JoinHandle.",
  },
  {
    id: "coordinate-blocking-stop",
    title:
      "Koordynujesz zatrzymanie rozpoczętej pracy blokującej przez jawny sygnał i potwierdzone join.",
  },
  {
    id: "bound-blocking-admission",
    title:
      "Ograniczasz przyjmowanie pracy blokującej tak, aby permit trwał do rzeczywistego końca closure.",
  },
];

export const tokioBlockingConcepts: Concept[] = [
  {
    id: "tokio-spawn-blocking-owned-work",
    title: "spawn_blocking przenosi posiadaną pracę do granicy blokowania",
    prerequisites: ["tokio-receiver-stream-shutdown"],
    competencyIds: ["offload-owned-blocking-work"],
    reviewPrompt:
      "Jakie granice ma closure przekazane do spawn_blocking, co daje await JoinHandle i dlaczego consumer uruchomiony po join może zostać lokalny?",
    reviewAnswer:
      "`spawn_blocking` przyjmuje jednorazowe closure FnOnce, które wraz z Output musi być Send + 'static, bo runtime przekazuje je do puli wątków blokujących. Zwraca JoinHandle; jego await daje `Result<T, JoinError>`, więc sukces, panic i anulowanie nie mogą zostać spłaszczone przez unwrap. Po udanym join T wraca do oczekującego Future, dlatego następny consumer może pożyczać lokalny String lub używać Rc<Cell<_>> i nie potrzebuje granicy Send ani 'static, jeśli nie jest ponownie spawniony.",
    distinguish:
      "Current-thread runtime nie wykonuje closure blokującego na swoim jedynym wątku asynchronicznym: spawn_blocking tworzy dodatkowe wątki puli blokującej. Nie jest to jednak obietnica nieograniczonej ani właściwej dla CPU równoległości. Pula ma limit i kolejkę, a wiele ciężkich obliczeń wymaga własnego limitu admission albo wyspecjalizowanego executora.",
  },
  {
    id: "tokio-blocking-cooperative-stop",
    title: "Rozpoczęta praca blokująca kończy się współpracująco",
    prerequisites: ["tokio-spawn-blocking-owned-work"],
    competencyIds: ["coordinate-blocking-stop", "bound-blocking-admission"],
    reviewPrompt:
      "Dlaczego abort rozpoczętego spawn_blocking nie zastępuje stopu, co musi zrobić closure po sygnale i gdzie ma żyć OwnedSemaphorePermit?",
    reviewAnswer:
      "Closure, które już rozpoczęło działanie przez spawn_blocking, nie jest Future i abort go nie przerwie; abort może jedynie czasem uniemożliwić start pracy jeszcze z kolejki. Właściciel wysyła więc sygnał rozumiany przez daną domenę, closure kończy własny cleanup, a potem JoinHandle zwraca rzeczywisty Result. `OwnedSemaphorePermit` należy przenieść do samego closure i zachować tam do jego powrotu. Gdy permit zostanie upuszczony wcześniej albo w anulowanym Future oczekującym na JoinHandle, następny job może wejść, choć poprzedni nadal blokuje wątek.",
    distinguish:
      "`shutdown_timeout` tylko przestaje czekać na runtime; nie anuluje rozpoczętej pracy blokującej, która może dalej działać na odłączonym wątku. Semaphore ogranicza liczbę wpuszczonych jobów, a nie tworzy anulowania ani nie cofa efektów zewnętrznych. Sygnał stopu, idempotentny cleanup i join są odrębną polityką programu.",
  },
];

const blockingRun = `use tokio::task;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let label = String::from("blokuj");
    let value = task::spawn_blocking(move || format!("{label}:gotowe"))
        .await
        .unwrap();
    println!("{value}");
}`;

const borrowedBlockingError = `#[tokio::main(flavor = "current_thread")]
async fn main() {
    let label = String::from("krótko");
    let _ = tokio::task::spawn_blocking(|| label.len()).await.unwrap();
}`;

const borrowedBlockingSolution = `#[tokio::main(flavor = "current_thread")]
async fn main() {
    let label = String::from("krótko");
    let _ = tokio::task::spawn_blocking(move || label.len()).await.unwrap();
}`;

const spawnOwnedStarter = `use tokio::task::JoinHandle;

fn spawn_owned_blocking<T, F>(_work: F) -> JoinHandle<T>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    panic!("uruchom closure na puli blokującej Tokio")
}`;

const spawnOwnedSolution = `use tokio::task::JoinHandle;

fn spawn_owned_blocking<T, F>(work: F) -> JoinHandle<T>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(work)
}`;

const spawnOwnedTests = `#[tokio::test(flavor = "current_thread")]
async fn starts_owned_non_copy_work_on_the_blocking_pool_and_returns_it_intact() {
    use std::thread;
    use tokio::sync::{mpsc, oneshot};

    struct Ticket {
        label: String,
        dropped: mpsc::UnboundedSender<String>,
    }
    impl Drop for Ticket {
        fn drop(&mut self) {
            self.dropped.send(self.label.clone()).unwrap();
        }
    }

    let executor = thread::current().id();
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
    let handle = spawn_owned_blocking(move || {
        let ticket = Ticket {
            label: String::from("owned"),
            dropped: dropped_tx,
        };
        started_tx.send(thread::current().id()).unwrap();
        release_rx.blocking_recv().unwrap();
        ticket
    });

    let worker = started_rx.await.unwrap();
    assert_ne!(worker, executor);
    assert_eq!(dropped_rx.try_recv(), Err(mpsc::error::TryRecvError::Empty));
    release_tx.send(()).unwrap();
    let ticket = handle.await.unwrap();
    assert_eq!(ticket.label, "owned");
    assert_eq!(dropped_rx.try_recv(), Err(mpsc::error::TryRecvError::Empty));
    drop(ticket);
    assert_eq!(dropped_rx.recv().await.unwrap(), "owned");
}

#[tokio::test(flavor = "current_thread")]
async fn keeps_the_real_join_error_instead_of_flattening_it() {
    let result = spawn_owned_blocking::<(), _>(|| panic!("blocking panic")).await;
    assert!(result.unwrap_err().is_panic());
}`;

const offloadThenSolution = `use std::future::Future;

async fn offload_then<T, U, F, G, Fut>(work: F, consume: G) -> Result<U, tokio::task::JoinError>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
    G: FnOnce(T) -> Fut,
    Fut: Future<Output = U>,
{
    let value = tokio::task::spawn_blocking(work).await?;
    Ok(consume(value).await)
}`;

const offloadThenTests = `#[tokio::test(flavor = "current_thread")]
async fn creates_a_local_consumer_only_after_owned_blocking_work_finishes() {
    use std::cell::Cell;
    use std::rc::Rc;
    use std::thread;
    use tokio::sync::oneshot;

    let calls = Rc::new(Cell::new(0));
    let seen = Rc::clone(&calls);
    let prefix = String::from("local");
    let executor = thread::current().id();
    let (worker_tx, worker_rx) = oneshot::channel();
    let value = offload_then(
        move || {
            worker_tx.send(thread::current().id()).unwrap();
            vec![String::from("first"), String::from("second")]
        },
        |mut values| async move {
            seen.set(seen.get() + 1);
            format!("{prefix}:{}:{}", values.remove(0), values.remove(0))
        },
    )
    .await
    .unwrap();

    assert_eq!(value, "local:first:second");
    assert_eq!(calls.get(), 1);
    assert_ne!(worker_rx.await.unwrap(), executor);
}

#[tokio::test(flavor = "current_thread")]
async fn does_not_call_the_local_consumer_when_blocking_work_panics() {
    use std::cell::Cell;
    use std::rc::Rc;

    let calls = Rc::new(Cell::new(0));
    let seen = Rc::clone(&calls);
    let result = offload_then(
        || -> String { panic!("worker panic") },
        move |_| {
            seen.set(seen.get() + 1);
            async { String::from("must not run") }
        },
    )
    .await;

    assert!(result.unwrap_err().is_panic());
    assert_eq!(calls.get(), 0);
}`;

const labeledResultStarter = `use tokio::task::{JoinError, JoinHandle};

async fn label_blocking<T>(label: String, handle: JoinHandle<T>) -> (String, Result<T, JoinError>) {
    (label, Ok(handle.await.unwrap()))
}`;

const labeledResultSolution = `use tokio::task::{JoinError, JoinHandle};

async fn label_blocking<T>(label: String, handle: JoinHandle<T>) -> (String, Result<T, JoinError>) {
    (label, handle.await)
}`;

const labeledResultTests = `#[tokio::test(flavor = "current_thread")]
async fn keeps_a_label_with_non_copy_success_or_join_error() {
    let success = label_blocking(
        String::from("success"),
        tokio::task::spawn_blocking(|| vec![String::from("owned")]),
    )
    .await;
    assert_eq!(success.0, "success");
    assert_eq!(success.1.unwrap(), vec!["owned"]);

    let failed = label_blocking(
        String::from("panic"),
        tokio::task::spawn_blocking(|| -> String { panic!("worker panic") }),
    )
    .await;
    assert_eq!(failed.0, "panic");
    assert!(failed.1.unwrap_err().is_panic());
}`;

const abortStartedRun = `use tokio::sync::oneshot;
use tokio::task;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let handle = task::spawn_blocking(move || {
        started_tx.send(()).unwrap();
        release_rx.blocking_recv().unwrap();
        String::from("po-release")
    });

    started_rx.await.unwrap();
    handle.abort();
    release_tx.send(()).unwrap();
    println!("wynik={}", handle.await.unwrap());
}`;

const stopThenJoinStarter = `use tokio::task::JoinHandle;

async fn stop_then_join<T, Stop>(handle: JoinHandle<T>, request_stop: Stop) -> Result<T, tokio::task::JoinError>
where
    Stop: FnOnce(),
{
    let result = handle.await;
    request_stop();
    result
}`;

const stopThenJoinSolution = `use tokio::task::JoinHandle;

async fn stop_then_join<T, Stop>(handle: JoinHandle<T>, request_stop: Stop) -> Result<T, tokio::task::JoinError>
where
    Stop: FnOnce(),
{
    request_stop();
    handle.await
}`;

const stopThenJoinTests = `#[tokio::test(flavor = "current_thread")]
async fn requests_stop_in_the_first_poll_then_joins_the_cleaned_up_non_copy_result() {
    use std::future::Future;
    use std::pin::Pin;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    use tokio::sync::{mpsc, oneshot};

    struct Silent;
    impl Wake for Silent {
        fn wake(self: Arc<Self>) {}
    }
    fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
        let waker = Waker::from(Arc::new(Silent));
        let mut context = Context::from_waker(&waker);
        future.poll(&mut context)
    }
    struct Ticket {
        label: String,
        dropped: mpsc::UnboundedSender<String>,
    }
    impl Drop for Ticket {
        fn drop(&mut self) {
            self.dropped.send(self.label.clone()).unwrap();
        }
    }

    let (started_tx, started_rx) = oneshot::channel();
    let (stop_tx, mut stop_rx) = mpsc::unbounded_channel::<()>();
    let stop_for_helper = stop_tx.clone();
    let (forward_tx, mut forward_rx) = mpsc::unbounded_channel();
    let (cleanup_tx, mut cleanup_rx) = mpsc::unbounded_channel();
    let (finish_tx, finish_rx) = oneshot::channel();
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
    let handle = tokio::task::spawn_blocking(move || {
        let ticket = Ticket {
            label: String::from("cleaned"),
            dropped: dropped_tx,
        };
        started_tx.send(()).unwrap();
        stop_rx.blocking_recv().expect("cooperative stop");
        cleanup_tx.send(String::from("cleanup")).unwrap();
        finish_rx.blocking_recv().unwrap();
        ticket
    });

    started_rx.await.unwrap();
    let mut joining = Box::pin(stop_then_join(handle, move || {
        forward_tx.send(String::from("stop-requested")).unwrap();
        let _ = stop_for_helper.send(());
    }));
    assert!(poll_once(joining.as_mut()).is_pending());
    let observed = forward_rx.try_recv();
    stop_tx.send(()).unwrap();
    finish_tx.send(()).unwrap();

    assert_eq!(cleanup_rx.recv().await.unwrap(), "cleanup");
    let ticket = joining.await.unwrap();
    assert_eq!(ticket.label, "cleaned");
    assert_eq!(dropped_rx.try_recv(), Err(mpsc::error::TryRecvError::Empty));
    drop(ticket);
    assert_eq!(dropped_rx.recv().await.unwrap(), "cleaned");
    assert_eq!(observed.unwrap(), "stop-requested");
}`;

const spawnLimitedSolution = `use std::sync::Arc;
use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinHandle;

async fn spawn_limited<T, F>(limit: Arc<Semaphore>, work: F) -> Result<JoinHandle<T>, AcquireError>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    let permit = limit.acquire_owned().await?;
    Ok(tokio::task::spawn_blocking(move || {
        let _permit = permit;
        work()
    }))
}`;

const spawnLimitedTests = `#[tokio::test(flavor = "current_thread")]
async fn refuses_closed_admission_and_releases_a_panic_after_the_join_result() {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::sync::Semaphore;

    let closed = Arc::new(Semaphore::new(1));
    closed.close();
    let calls = Arc::new(AtomicUsize::new(0));
    let counted = Arc::clone(&calls);
    assert!(spawn_limited(Arc::clone(&closed), move || {
        counted.fetch_add(1, Ordering::SeqCst);
    })
    .await
    .is_err());
    assert_eq!(calls.load(Ordering::SeqCst), 0);

    let limit = Arc::new(Semaphore::new(1));
    let handle = spawn_limited(Arc::clone(&limit), || -> () {
        panic!("blocking panic")
    })
    .await
    .unwrap();
    assert!(handle.await.unwrap_err().is_panic());
    assert_eq!(limit.available_permits(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn keeps_capacity_occupied_after_abort_until_the_started_closure_returns() {
    use std::future::Future;
    use std::pin::Pin;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    use tokio::sync::{oneshot, Semaphore, TryAcquireError};

    struct Silent;
    impl Wake for Silent {
        fn wake(self: Arc<Self>) {}
    }
    fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
        let waker = Waker::from(Arc::new(Silent));
        let mut context = Context::from_waker(&waker);
        future.poll(&mut context)
    }

    let limit = Arc::new(Semaphore::new(1));
    let (first_started_tx, first_started_rx) = oneshot::channel();
    let (first_release_tx, first_release_rx) = oneshot::channel();
    let first = spawn_limited(Arc::clone(&limit), move || {
        first_started_tx.send(()).unwrap();
        first_release_rx.blocking_recv().unwrap();
        String::from("first")
    })
    .await
    .unwrap();
    first_started_rx.await.unwrap();
    first.abort();
    let held_after_abort = matches!(
        limit.clone().try_acquire_owned(),
        Err(TryAcquireError::NoPermits)
    );

    let (second_started_tx, second_started_rx) = oneshot::channel();
    let mut second = Box::pin(spawn_limited(Arc::clone(&limit), move || {
        second_started_tx.send(()).unwrap();
        String::from("second")
    }));
    let initial = poll_once(second.as_mut());
    let initial_was_pending = initial.is_pending();

    first_release_tx.send(()).unwrap();
    let first_result = first.await;
    let second_handle = match initial {
        Poll::Pending => match poll_once(second.as_mut()) {
            Poll::Ready(Ok(handle)) => handle,
            Poll::Ready(Err(error)) => panic!("unexpected acquire error: {error}"),
            Poll::Pending => panic!("released capacity must wake the queued admission"),
        },
        Poll::Ready(Ok(handle)) => handle,
        Poll::Ready(Err(error)) => panic!("unexpected acquire error: {error}"),
    };
    let second_started = second_started_rx.await;
    let second_result = second_handle.await;

    assert!(held_after_abort);
    assert!(initial_was_pending);
    assert_eq!(first_result.unwrap(), "first");
    assert_eq!(second_started.unwrap(), ());
    assert_eq!(second_result.unwrap(), "second");
    assert_eq!(limit.available_permits(), 1);
}`;

const abortReviewStarter = `use tokio::task::JoinHandle;

async fn request_then_join<T, Stop>(handle: JoinHandle<T>, request_stop: Stop) -> Result<T, tokio::task::JoinError>
where
    Stop: FnOnce(),
{
    handle.abort();
    request_stop();
    handle.await
}`;

const abortReviewSolution = `use tokio::task::JoinHandle;

async fn request_then_join<T, Stop>(handle: JoinHandle<T>, request_stop: Stop) -> Result<T, tokio::task::JoinError>
where
    Stop: FnOnce(),
{
    request_stop();
    handle.await
}`;

const abortReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn sends_a_domain_stop_and_preserves_the_blocking_panic() {
    use tokio::sync::{mpsc, oneshot};

    let (started_tx, started_rx) = oneshot::channel();
    let (stop_tx, mut stop_rx) = mpsc::unbounded_channel();
    let handle = tokio::task::spawn_blocking(move || {
        started_tx.send(()).unwrap();
        stop_rx.blocking_recv().expect("stop");
        panic!("cleanup reported a panic")
    });

    started_rx.await.unwrap();
    let result = request_then_join(handle, move || {
        stop_tx.send(()).unwrap();
    })
    .await;
    assert!(result.unwrap_err().is_panic());
}`;

const transformPresentStarter = `async fn transform_if_present<T, U, F>(_input: Option<T>, _work: F) -> Result<Option<U>, tokio::task::JoinError>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnOnce(T) -> U + Send + 'static,
{
    panic!("uruchom worker tylko dla Some")
}`;

const transformPresentSolution = `async fn transform_if_present<T, U, F>(input: Option<T>, work: F) -> Result<Option<U>, tokio::task::JoinError>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnOnce(T) -> U + Send + 'static,
{
    match input {
        None => Ok(None),
        Some(value) => tokio::task::spawn_blocking(move || work(value))
            .await
            .map(Some),
    }
}`;

const transformPresentTests = `#[tokio::test(flavor = "current_thread")]
async fn none_skips_worker_and_some_uses_a_real_blocking_thread() {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::thread;
    use tokio::sync::oneshot;

    let calls = Arc::new(AtomicUsize::new(0));
    let none_calls = Arc::clone(&calls);
    assert_eq!(
        transform_if_present::<String, String, _>(None, move |_| {
            none_calls.fetch_add(1, Ordering::SeqCst);
            String::from("must not run")
        })
        .await
        .unwrap(),
        None,
    );
    assert_eq!(calls.load(Ordering::SeqCst), 0);

    let executor = thread::current().id();
    let (worker_tx, worker_rx) = oneshot::channel();
    let result = transform_if_present(Some(vec![String::from("owned")]), move |value| {
        worker_tx.send(thread::current().id()).unwrap();
        (value, String::from("done"))
    })
    .await
    .unwrap()
    .unwrap();
    assert_eq!(result, (vec![String::from("owned")], String::from("done")));
    assert_ne!(worker_rx.await.unwrap(), executor);
}

#[tokio::test(flavor = "current_thread")]
async fn worker_panic_is_a_join_error_for_some() {
    let result = transform_if_present(Some(String::from("owned")), |_| -> String {
        panic!("worker panic")
    })
    .await;
    assert!(result.unwrap_err().is_panic());
}`;

const optionalAdmissionStarter = `use std::sync::Arc;
use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinHandle;

async fn admit_optional_blocking<T, F>(
    _limit: Arc<Semaphore>,
    _input: Option<T>,
    _work: F,
) -> Result<Option<JoinHandle<T>>, (AcquireError, Option<T>)>
where
    T: Send + 'static,
    F: FnOnce(T) -> T + Send + 'static,
{
    panic!("zachowaj input do chwili skutecznego admission")
}`;

const optionalAdmissionSolution = `use std::sync::Arc;
use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinHandle;

async fn admit_optional_blocking<T, F>(
    limit: Arc<Semaphore>,
    input: Option<T>,
    work: F,
) -> Result<Option<JoinHandle<T>>, (AcquireError, Option<T>)>
where
    T: Send + 'static,
    F: FnOnce(T) -> T + Send + 'static,
{
    let Some(value) = input else {
        return Ok(None);
    };
    let permit = match limit.acquire_owned().await {
        Ok(permit) => permit,
        Err(error) => return Err((error, Some(value))),
    };
    Ok(Some(tokio::task::spawn_blocking(move || {
        let _permit = permit;
        work(value)
    })))
}`;

const optionalAdmissionTests = `#[tokio::test(flavor = "current_thread")]
async fn none_skips_closed_admission_and_closed_some_returns_the_same_owned_value() {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::sync::{mpsc, Semaphore};

    let closed = Arc::new(Semaphore::new(0));
    closed.close();
    let calls = Arc::new(AtomicUsize::new(0));
    let none_calls = Arc::clone(&calls);
    assert!(admit_optional_blocking(Arc::clone(&closed), None::<String>, move |_| {
        none_calls.fetch_add(1, Ordering::SeqCst);
        String::from("must not run")
    })
    .await
    .unwrap()
    .is_none());
    assert_eq!(calls.load(Ordering::SeqCst), 0);

    struct Ticket {
        label: String,
        dropped: mpsc::UnboundedSender<String>,
    }
    impl Drop for Ticket {
        fn drop(&mut self) {
            self.dropped.send(self.label.clone()).unwrap();
        }
    }
    let (dropped_tx, mut dropped_rx) = mpsc::unbounded_channel();
    let ticket = Ticket {
        label: String::from("retained"),
        dropped: dropped_tx,
    };
    let (error, returned) = match admit_optional_blocking(Arc::clone(&closed), Some(ticket), |value| value).await {
        Err(error) => error,
        Ok(_) => panic!("closed admission must return the input"),
    };
    assert!(error.to_string().contains("closed"));
    let ticket = returned.unwrap();
    assert_eq!(ticket.label, "retained");
    assert_eq!(dropped_rx.try_recv(), Err(mpsc::error::TryRecvError::Empty));
    drop(ticket);
    assert_eq!(dropped_rx.recv().await.unwrap(), "retained");
}

#[tokio::test(flavor = "current_thread")]
async fn some_moves_work_and_permit_into_the_started_blocking_closure() {
    use std::sync::Arc;
    use tokio::sync::{oneshot, Semaphore, TryAcquireError};

    let limit = Arc::new(Semaphore::new(1));
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let handle = admit_optional_blocking(Arc::clone(&limit), Some(String::from("owned")), move |value| {
        started_tx.send(()).unwrap();
        release_rx.blocking_recv().unwrap();
        format!("{value}:done")
    })
    .await
    .unwrap()
    .unwrap();
    started_rx.await.unwrap();
    handle.abort();
    let held_after_abort = matches!(
        limit.clone().try_acquire_owned(),
        Err(TryAcquireError::NoPermits)
    );
    release_tx.send(()).unwrap();
    let result = handle.await;

    assert!(held_after_abort);
    assert_eq!(result.unwrap(), "owned:done");
    assert_eq!(limit.available_permits(), 1);
}`;

export const tokioBlockingLessons: Lesson[] = [
  {
    id: "tokio-spawn-blocking-boundary",
    moduleId: "tokio-blocking-work",
    conceptIds: ["tokio-spawn-blocking-owned-work"],
    competencyIds: ["offload-owned-blocking-work"],
    prerequisites: ["tokio-receiver-stream-drain"],
    title: "Granica spawn_blocking i posiadana praca",
    subtitle:
      "Przeniesiesz krótką pracę synchroniczną poza executor, odbierzesz pełny Result i wrócisz do lokalnego Future.",
    minutes: 28,
    outcomes: [
      "Przeniesiesz FnOnce wraz z posiadanymi danymi przez granicę Send + 'static do puli blokującej.",
      "Zachowasz Result<T, JoinError> zamiast ukrywać panic albo anulowanie przez unwrap.",
      "Po udanym join uruchomisz lokalny consumer bez niepotrzebnych granic Send i 'static.",
    ],
    steps: [
      choose(
        "tokio-spawn-blocking-boundary-predict",
        "predict",
        "Która praca przekracza granicę?",
        "Current-thread runtime obsługuje Future asynchroniczne na swoim wątku. Musisz wywołać synchroniczne API, które czeka na odpowiedź i zwraca String. Co opisuje `spawn_blocking`?",
        1,
        [
          "Wykonuje closure na tym samym wątku executor, ale oznacza go jako bezpieczny.",
          "Przenosi posiadane closure do puli blokującej; await uchwytu odbiera Result jego pracy.",
          "Tworzy Future, którego nie trzeba ani wykonywać, ani odbierać.",
        ],
        [
          "Blokowanie wątku current-thread nadal zatrzymałoby inne Future na tym executorze.",
          "To oddziela synchroniczne oczekiwanie od wątku executor, lecz nadal zostawia obowiązek odebrania wyniku JoinHandle.",
          "spawn_blocking zwraca uruchomiony JoinHandle; bez await albo świadomego odłączenia nie ma rozliczenia wyniku.",
        ],
      ),
      tokioRun(
        "tokio-spawn-blocking-boundary-run",
        "Przenieś posiadany String do closure",
        "`label` przechodzi przez `move` do closure blokującego, a wynik wraca przez JoinHandle. Ten przykład nie wypisuje identyfikatora wątku, bo nie jest on kontraktem danych programu.",
        blockingRun,
        "blokuj:gotowe\n",
      ),
      tokioError(
        "tokio-spawn-blocking-boundary-borrow-error",
        "Obserwuj E0373: pożyczka nie może zostać w closure",
        "Closure pożyczające `label` może wykonać się po powrocie z `measure`, więc nie może zachować referencji do lokalnego String. Odczytaj E0373, a potem porównaj naprawę: dane należą do closure przez `move`.",
        borrowedBlockingError,
        borrowedBlockingSolution,
        { code: "E0373" },
      ),
      tokioExercise({
        id: "tokio-spawn-blocking-boundary-owned-gate",
        kind: "modify",
        title: "Uruchom posiadaną pracę blokującą",
        prompt:
          "Uzupełnij `spawn_owned_blocking`. Ma zwracać prawdziwy JoinHandle z Tokio bez awaitowania go w helperze. Zachowaj pokazane granice dla jednorazowego closure i Output. Test uruchamia current-thread runtime, niezależnym kanałem potwierdza start worker, porównuje ThreadId tylko jako obserwator testu, zatrzymuje closure kanałem użytym wewnątrz rzeczywistej pracy blokującej i sprawdza cykl życia nie-Copy zasobu. Drugi test wymaga prawdziwego JoinError po panic.",
        code: spawnOwnedStarter,
        solution: spawnOwnedSolution,
        tests: spawnOwnedTests,
        hints: [
          "To helper dla już uruchamianej pracy, więc zwraca JoinHandle zamiast awaitować go za wywołującego.",
          "Dokładnie `tokio::task::spawn_blocking` ma pokazane granice i zachowuje Output wewnątrz uchwytu.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-spawn-blocking-boundary-blank",
        kind: "blank",
        title: "Od pustej kartki: wróć z worker do lokalnego consumera",
        prompt:
          "Od pustej kartki utwórz funkcję o nazwie `offload_then`. Jej umowa publiczna przyjmuje krótką, posiadaną pracę blocking oraz jednorazowy consumer jej wyniku. Praca blocking i jej wynik przekraczają granicę puli Tokio; consumer i zwracany przez niego Future działają już lokalnie po join. Funkcja zwraca `Result`, którego błąd zachowuje `JoinError`. Test przekazuje do consumera pożyczony String i Rc<Cell<_>>; osobny panic worker ma zwrócić JoinError bez wywołania consumera.",
        solution: offloadThenSolution,
        tests: offloadThenTests,
        hints: [
          "Granice Send i 'static dotyczą wejścia do closure blocking oraz wartości, która z niego wraca.",
          "Consumer powstaje tylko po sukcesie JoinHandle, więc jego Future może pozostać lokalny.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-spawn-blocking-boundary-result-review",
        kind: "debug",
        title: "Przegląd kodu: zachowaj label i JoinError",
        prompt:
          "Popraw `label_blocking`. Code review wymaga zachowania String będącego etykietą oraz całego Result z JoinHandle. Nie rozpakowuj wyniku: test daje nie-Copy sukces i osobny worker kończący się panic, dla którego wywołujący ma otrzymać JoinError.",
        code: labeledResultStarter,
        solution: labeledResultSolution,
        tests: labeledResultTests,
        hints: [
          "`handle.await` już ma typ Result; nie trzeba ani nie wolno go zamieniać w sukces przez unwrap.",
          "Etykieta i Result są niezależnymi danymi raportu, więc zwróć je razem.",
        ],
      }),
    ],
    misconceptions: [
      "spawn_blocking wykonuje closure na tym samym wątku current-thread runtime.",
      "'static oznacza, że String musi być globalny, zamiast należeć do przeniesionego closure.",
      "JoinHandle z pracy blocking daje sam T, więc panic można ukryć przez unwrap.",
      "Duża pula blocking oznacza bezpieczną, nieograniczoną równoległość obliczeń CPU.",
    ],
    transferTask:
      "Masz synchroniczny parser dużego dokumentu oraz lokalny Rc<Cell<usize>> liczący elementy widoku. Opisz, co przeniesiesz do closure blocking, gdzie odbierzesz Result<_, JoinError>, a kiedy uruchomisz lokalne zliczanie. Ustal też limit admission, jeśli parserów ma być wiele.",
    evidenceGate:
      "tokio-spawn-blocking-boundary-owned-gate sprawdza realny worker, własność nie-Copy zasobu i JoinError, a tokio-spawn-blocking-boundary-blank sprawdza przejście z Send + 'static pracy blocking do lokalnego consumera oraz pominięcie go po panic.",
    sourceIds: ["tokio-blocking-spawn", "tokio-blocking-join-handle"],
  },
  {
    id: "tokio-blocking-cooperative-stop",
    moduleId: "tokio-blocking-work",
    conceptIds: ["tokio-blocking-cooperative-stop"],
    competencyIds: ["coordinate-blocking-stop", "bound-blocking-admission"],
    prerequisites: ["tokio-spawn-blocking-boundary"],
    title: "Stop współpracujący i limit pracy blocking",
    subtitle:
      "Nie pomylisz abort z zatrzymaniem rozpoczętego closure i utrzymasz permit aż do jego rzeczywistego końca.",
    minutes: 31,
    outcomes: [
      "Wyślesz domenowy sygnał stopu przed join, a closure dokończy własny cleanup.",
      "Sprawdzisz, że abort rozpoczętego closure blocking nie zwalnia jego zasobów ani wątku.",
      "Przeniesiesz OwnedSemaphorePermit do closure, aby ograniczyć aktywną pracę aż do jej zakończenia.",
    ],
    steps: [
      choose(
        "tokio-blocking-cooperative-stop-predict",
        "predict",
        "Co robi abort po potwierdzonym starcie?",
        "Closure `spawn_blocking` wysłało `started`, czeka synchronicznie na `release`, a jego JoinHandle otrzymuje `abort`. Co jest poprawną polityką?",
        2,
        [
          "abort przerywa closure natychmiast, więc release i join są zbędne.",
          "abort odwołuje każdą pracę blocking, niezależnie od tego, czy już wystartowała.",
          "Wyślij własny sygnał zakończenia, pozwól closure wrócić i odbierz jego Result przez ten sam JoinHandle.",
        ],
        [
          "Rozpoczęte closure blocking nie jest Future, który Tokio może bezpiecznie dropnąć przy abort.",
          "Jedynie praca, która jeszcze nie zaczęła się z kolejki, może czasem nie wystartować.",
          "To rozdziela intencję zatrzymania od faktycznego końca, cleanup i raportu JoinHandle.",
        ],
      ),
      tokioRun(
        "tokio-blocking-cooperative-stop-run",
        "Abort nie zatrzymuje rozpoczętego closure",
        "Najpierw kanał potwierdza start. `abort` następuje dopiero potem, więc closure nadal odbiera `release` i zwraca String. To obserwacja API Tokio, nie wzór na zatrzymywanie każdego rodzaju pracy.",
        abortStartedRun,
        "wynik=po-release\n",
      ),
      choose(
        "tokio-blocking-cooperative-stop-permit",
        "explain",
        "Gdzie kończy się permit?",
        "Async helper uzyskał OwnedSemaphorePermit, uruchomił closure blocking i może zostać anulowany podczas await JoinHandle. Gdzie permit musi być właścicielem, aby limit opisywał aktywną pracę?",
        1,
        [
          "W Future helpera, bo utworzył spawn_blocking.",
          "W ciele closure blocking, aż closure zwróci wynik albo panic zakończy jego wykonanie.",
          "W zmiennej globalnej, aby żaden task go nie upuścił.",
        ],
        [
          "Drop outer Future może nastąpić po abort, gdy closure nadal zajmuje wątek.",
          "Wtedy Drop permit zachodzi razem z rzeczywistym końcem closure, także po panic, i pojemność opisuje pracę faktycznie wykonywaną.",
          "Globalny permit nie jest powiązany z pojedynczym jobem i nie ustanawia zwalniania po jego końcu.",
        ],
      ),
      tokioExercise({
        id: "tokio-blocking-cooperative-stop-stop-gate",
        kind: "modify",
        title: "Zasygnalizuj stop przed join",
        prompt:
          "Popraw `stop_then_join`. Przyjmuje uruchomiony JoinHandle i jednorazowy callback wysyłający domenowy stop, po czym zwraca pełny Result dziecka. Kontrakt wymaga, aby prośba o stop nastąpiła przed rozpoczęciem oczekiwania na join. Closure potwierdza sygnał, wykonuje cleanup i zwraca nie-Copy wynik; test sprawdza też jego DropProbe. Zła kolejność join przed stopem musi zostać wykryta bez zegara. Nie używaj abort ani nie odłączaj uchwytu.",
        code: stopThenJoinStarter,
        solution: stopThenJoinSolution,
        tests: stopThenJoinTests,
        hints: [
          "Callback jest lokalnym krokiem helpera; wywołaj go zanim powstanie oczekiwanie na JoinHandle.",
          "Po sygnale zachowaj ten sam JoinHandle, bo jego await jest raportem końca closure.",
        ],
        forbiddenPatterns: [
          ".abort(",
          "::abort",
          "std::mem::forget",
          "mem::forget",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-blocking-cooperative-stop-blank",
        kind: "blank",
        title: "Od pustej kartki: ogranicz admission do puli blocking",
        prompt:
          "Od pustej kartki utwórz funkcję o nazwie `spawn_limited`. Jej publiczna umowa przyjmuje współdzielony `Arc<Semaphore>` i jednorazową pracę blocking, a zwraca `Result` zawierający JoinHandle albo `AcquireError`. Zamknięty semaphore nie może uruchomić pracy. Uzyskany owned permit ma pozostać własnością closure blocking do jego normalnego powrotu lub panic, także gdy ktoś wywoła abort na uchwycie po potwierdzonym starcie. Test sprawdza zamknięte admission, panic, pojedynczy poll kolejnego jobu i pojemność przed oraz po rzeczywistym końcu pierwszego closure.",
        solution: spawnLimitedSolution,
        tests: spawnLimitedTests,
        hints: [
          "`acquire_owned` daje permit, który można przenieść bez pożyczki z async helpera.",
          "Limit opisuje aktywne closure, więc jego zasób musi przeżyć wewnątrz closure aż do końca pracy.",
        ],
        forbiddenPatterns: [
          ".abort(",
          "::abort",
          "std::mem::forget",
          "mem::forget",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-blocking-cooperative-stop-abort-review",
        kind: "debug",
        title: "Przegląd kodu: abort nie jest prośbą o cleanup",
        prompt:
          "Popraw `request_then_join`. Code review: closure jest już rozpoczęte, dlatego helper ma wysłać domenową prośbę o stop i awaitować pełny Result. Test pozwala closure odebrać stop, a następnie wymusza panic; wynik musi pozostać JoinError panic. Usuń abort zamiast traktować go jako skrót do cooperative shutdown.",
        code: abortReviewStarter,
        solution: abortReviewSolution,
        tests: abortReviewTests,
        hints: [
          "Domenowy callback wyraża współpracę closure; abort nie komunikuje jej żadnego protokołu.",
          "Po wysłaniu stopu zwróć bezpośrednio Result z await JoinHandle.",
        ],
        forbiddenPatterns: [
          ".abort(",
          "::abort",
          "std::mem::forget",
          "mem::forget",
        ],
      }),
    ],
    misconceptions: [
      "abort rozpoczętego spawn_blocking zatrzymuje synchroniczne wywołanie.",
      "shutdown_timeout anuluje closure, które już blokuje wątek.",
      "Permit Semaphore może należeć do outer Future, bo JoinHandle i tak reprezentuje pracę.",
      "Pula blocking samodzielnie dobiera bezpieczną równoległość dla dowolnego obciążenia CPU.",
    ],
    transferTask:
      "Proces zapisuje obrazy przez synchroniczną bibliotekę. Zdefiniuj sygnał zakończenia bezpieczny dla rozpoczętego zapisu, cleanup po sygnale, miejsce odbioru JoinError oraz limit równoległych zapisów. Wyjaśnij, co dzieje się z rozpoczętą pracą po shutdown_timeout i dlaczego ten fakt nie jest sukcesem zamknięcia.",
    evidenceGate:
      "tokio-blocking-cooperative-stop-stop-gate ręcznie sprawdza wysłanie stopu przed join i kończy cleanup niezależnie od mutanta, a tokio-blocking-cooperative-stop-blank sprawdza closed admission, panic oraz permit zachowany w rozpoczętym closure po abort aż do prawdziwego końca pracy.",
    sourceIds: [
      "tokio-blocking-spawn",
      "tokio-blocking-runtime-shutdown",
      "tokio-blocking-semaphore",
      "tokio-blocking-join-handle",
    ],
  },
];

export const tokioBlockingReviewExercises: Record<string, LessonStep> = {
  "tokio-spawn-blocking-owned-work": tokioExercise({
    id: "review-tokio-spawn-blocking-owned-work",
    kind: "apply",
    title: "Powtórka: uruchom worker tylko dla Some",
    prompt:
      "Uzupełnij `transform_if_present`. None ma natychmiast zwrócić Ok(None) bez wywołania workera. Some ma przenieść posiadane T oraz FnOnce do prawdziwego closure blocking, poczekać na JoinHandle i zwrócić Some jego Output albo JoinError. Test sprawdza zero wywołań dla None, ThreadId workera poza API, nie-Copy wynik Some i panic jako JoinError. To inny kontrakt niż `offload_then`, bo wybór Some/None poprzedza admission do puli.",
    code: transformPresentStarter,
    solution: transformPresentSolution,
    tests: transformPresentTests,
    hints: [
      "None nie potrzebuje ani closure blocking, ani JoinHandle.",
      "Dla Some przenieś T i worker do closure, a JoinError zostaw w wyniku helpera.",
    ],
  }),
  "tokio-blocking-cooperative-stop": tokioExercise({
    id: "review-tokio-blocking-cooperative-stop",
    kind: "apply",
    title: "Powtórka: zachowaj optional input do admission",
    prompt:
      "Uzupełnij `admit_optional_blocking`. None nie próbuje admission i zwraca Ok(None). Dla Some zachowaj posiadane T aż do wyniku acquire_owned: gdy Semaphore jest zamknięty, zwróć AcquireError razem z tym samym Some(T). Po udanym admission przenieś T, work i owned permit do closure blocking, zwracając Some(JoinHandle). Test sprawdza zachowanie non-Copy T na błędzie, brak wywołania dla None oraz permit obecny w rozpoczętym closure po abort aż do release i join.",
    code: optionalAdmissionStarter,
    solution: optionalAdmissionSolution,
    tests: optionalAdmissionTests,
    hints: [
      "Najpierw rozdziel None; Some musi nadal istnieć, gdy acquire_owned zwróci błąd.",
      "Po sukcesie permit, wartość i work mają wspólny czas życia closure blocking.",
    ],
    forbiddenPatterns: [
      ".abort(",
      "::abort",
      "std::mem::forget",
      "mem::forget",
    ],
  }),
};
