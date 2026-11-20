import { asyncOwnershipLesson, asyncOwnershipReview } from "./async-ownership";
import {
  asyncCancellationLesson,
  asyncCancellationReview,
} from "./async-cancellation";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const asyncFoundationsSources: Source[] = [
  {
    id: "async-foundations-std-future",
    title: "Rust standard library: Future",
    url: "https://doc.rust-lang.org/std/future/trait.Future.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisu poll, kontraktu Pending/Ready, rejestracji Waker albo ostrzeżenia przed ponownym poll po Ready.",
  },
  {
    id: "async-foundations-std-waker",
    title: "Rust standard library: Waker",
    url: "https://doc.rust-lang.org/std/task/struct.Waker.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie budzenia zadania, Wake::wake_by_ref albo bezpiecznego tworzenia Waker z Arc.",
  },
  {
    id: "async-foundations-std-pin",
    title: "Rust standard library: Pin",
    url: "https://doc.rust-lang.org/std/pin/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie gwarancji Pin, Unpin albo wymogu przypięcia stanu maszyny async przed poll.",
  },
  {
    id: "async-foundations-book-17",
    title: "The Rust Programming Language, chapter 17: Async and Await",
    url: "https://doc.rust-lang.org/book/ch17-00-async-await.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie objaśnienia futures, await points, zadań i granicy między językiem a runtime.",
  },
  {
    id: "async-foundations-book-17-futures",
    title:
      "The Rust Programming Language, chapter 17.1: Futures and async syntax",
    url: "https://doc.rust-lang.org/book/ch17-01-futures-and-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu leniwego future, pollingu, await i stanu między punktami await.",
  },
  {
    id: "async-foundations-reference-async",
    title: "Rust Reference: async blocks",
    url: "https://doc.rust-lang.org/reference/expressions/block-expr.html#async-blocks",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie reguł przechwytywania async block, async move albo zakresu wartości zwracanej przez blok.",
  },
  {
    id: "async-foundations-reference-await",
    title: "Rust Reference: await expressions",
    url: "https://doc.rust-lang.org/reference/expressions/await-expr.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu IntoFuture, przekazywania bieżącego Context, Pending albo wznowienia po await.",
  },
];

export const asyncFoundationsCompetencies: Competency[] = [
  {
    id: "model-future-laziness",
    title:
      "Przewidujesz, które efekty powstaną przy utworzeniu async future, a które dopiero po jego poll, i bezpiecznie obserwujesz to przez Pin<Box<_>>.",
  },
  {
    id: "compose-await-progress",
    title:
      "Łączysz futures przez await, propagujesz Pending i błędy w określonej kolejności oraz nie mylisz await z uruchomieniem niezależnego zadania.",
  },
  {
    id: "reason-about-future-ownership",
    title:
      "Rozpoznajesz wartości przejęte przez async move przed pierwszym poll, ograniczenia pożyczonych referencji oraz moment, w którym future może zostać bezpiecznie przypięty.",
  },
  {
    id: "design-cancellation-contracts",
    title:
      "Projektujesz skończony kontrakt anulowania: Drop zatrzymuje dalszy postęp future, zachowane efekty nie są cofane, a niezależna praca może trwać dalej.",
  },
];

export const asyncFoundationsConcepts: Concept[] = [
  {
    id: "future-laziness",
    title: "Ciało async future jest leniwe aż do poll",
    prerequisites: ["weak-links", "callable-contracts"],
    competencyIds: ["model-future-laziness"],
    reviewPrompt:
      "Co dzieje się przy wywołaniu `async fn`, kiedy obliczane są argumenty i kiedy zaczyna się ciało? Dlaczego po `Ready` nie wolno ponownie pollować future?",
    reviewAnswer:
      "Wywołanie `async fn` tworzy wartość implementującą Future; argumenty są obliczane przy wywołaniu, lecz ciało funkcji zaczyna wykonywać się dopiero, gdy future jest pollowany, zwykle przez await. Future trzeba najpierw bezpiecznie przypiąć, bo poll przyjmuje `Pin<&mut Self>`. `Poll::Pending` oznacza brak gotowego wyniku i wymaga późniejszego poll po wake, a po `Poll::Ready` kontrakt Future nie nakłada wymogu kolejnego poll: może on spanikować, zablokować się albo zachować się inaczej.",
    distinguish:
      "Leniwość dotyczy ciała future zbudowanego przez async fn lub async block, nie obliczania argumentów wywołania. Future będący uchwytem do niezależnej pracy może obserwować pracę już rozpoczętą gdzie indziej. Poll nie jest blokującym oczekiwaniem: ma szybko zwrócić Pending i zarejestrować najnowszy Waker. `Ready` kończy kontrakt konkretnego future; samo to, że metoda poll nie jest oznaczona unsafe, nie daje prawa do używania jej po zakończeniu.",
  },
  {
    id: "await-progress",
    title: "await składa postęp future, ale nie tworzy zadania",
    prerequisites: ["future-laziness"],
    competencyIds: ["compose-await-progress"],
    reviewPrompt:
      "Jak `await` reaguje na `Pending`, kiedy przechodzi do drugiego future i dlaczego samo utworzenie dwóch futures nie uruchamia ich równolegle?",
    reviewAnswer:
      "`await` polluje oczekiwany future i gdy dostaje Pending, oddaje postęp na zewnątrz; oczekiwany future odpowiada za budzenie bieżącego zadania, gdy możliwy będzie postęp. Dopiero `Ready` pozwala przejść do instrukcji po await, więc drugi future w tej sekwencji zaczyna być pollowany po pierwszym. Samo utworzenie dwóch bloków async nie uruchamia ich ciał i `await` nie jest spawn. Niezależne zadania wymagają osobnego mechanizmu planowania, który pojawi się w module Tokio.",
    distinguish:
      "Await jest punktem współpracy bieżącego future z runtime, a nie obietnicą, że zawsze odda wątek. Future może być natychmiast Ready i wtedy await nie musi wykonać widocznego przełączenia. Pending oznacza oczekiwanie bez blokowania pollującego wątku; ciasne ponawianie poll bez wake narusza kontrakt postępu.",
  },
  {
    id: "future-ownership",
    title: "Async move przejmuje wartości przechowywane między poll",
    prerequisites: ["await-progress"],
    competencyIds: ["reason-about-future-ownership"],
    reviewPrompt:
      "Co dokładnie przenosi `async move`, zanim future zostanie pierwszy raz pollowany, i dlaczego nie można z tego wywnioskować przedłużenia życia pożyczonej referencji?",
    reviewAnswer:
      "`async move` przejmuje wartości użyte w swoim ciele do stanu future już przy tworzeniu bloku, więc własność String lub innego non-Copy może należeć do future przed pierwszym poll. To przejęcie nie zmienia reguł życia referencji: future przechowujący `&str` nadal wymaga, aby właściciel żył wystarczająco długo. Po przypięciu future można bezpiecznie przekazywać `Pin<&mut Future>` do poll, a właściciel jest zwalniany razem z future, jeśli future zostanie odrzucony.",
    distinguish:
      "`async move` przenosi dane do maszyny stanu; nie jest klonem, spawnem ani automatycznym `Arc`. Wartość może zostać przeniesiona i pozostać nieużyta do pierwszego poll, a pożyczka może być używana tylko w wyznaczonym zakresie. Pin chroni adres przypiętej wartości, nie przedłuża życia referencji i nie zmienia własności.",
  },
  {
    id: "future-cancellation",
    title: "Drop future zatrzymuje jego dalszy postęp bez rollbacku",
    prerequisites: ["future-ownership"],
    competencyIds: ["design-cancellation-contracts"],
    reviewPrompt:
      "Co daje porzucenie future po Pending, które efekty zostają, i dlaczego Drop future nie anuluje automatycznie niezależnego zadania?",
    reviewAnswer:
      "Gdy właściciel future znika, Drop niszczy jego przechowywany stan i nie będzie już kolejnego poll tego future, więc jego dalsze kroki nie wykonają się. Efekty wykonane przed Drop, takie jak zapis do logu lub zmiana współdzielonego licznika, pozostają; Drop nie jest transakcją ani rollbackiem. Jeśli future jest tylko uchwytem do pracy uruchomionej gdzie indziej, porzucenie uchwytu nie musi zatrzymać tej niezależnej pracy. Zatrzymanie jej wymaga osobnego kontraktu, na przykład flagi anulowania lub zamknięcia kanału, który zna właściciel zadania.",
    distinguish:
      "Anulowanie przez Drop jest lokalnym faktem własności konkretnego future. Nie oznacza, że każdy zasób zewnętrzny został cofnięty ani że niezależne zadanie przestało działać. Future, który zwrócił Ready, powinien być traktowany jako zakończony; Future, który zwrócił Pending, może być odrzucony po skończonym, jawnie kontrolowanym poll.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: number,
  answers: [string, string, string],
  explanations: [string, string, string],
  code?: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(code === undefined
      ? {}
      : { code, solution: code, expectedStatus: "success" as const }),
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
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

function exercise(options: {
  id: string;
  kind: "modify" | "apply" | "debug" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  forbiddenPatterns?: string[];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: {
      kind: "tests",
      tests: options.tests,
      forbiddenPatterns: ["unsafe", ...(options.forbiddenPatterns ?? [])],
    },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const lazinessRun = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Noop;
impl Wake for Noop { fn wake(self: Arc<Self>) {} }

fn make_arg() -> usize {
    println!("argument");
    7
}

async fn announce(value: usize) -> usize {
    println!("ciało");
    value
}

fn main() {
    let mut future = Box::pin(announce(make_arg()));
    println!("utworzono");
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let result = Pin::as_mut(&mut future).poll(&mut cx);
    println!("wynik={result:?}");
}`;

const lazinessStarter = `use std::future::Future;
use std::sync::{Arc, Mutex};

fn deferred_note(log: Arc<Mutex<Vec<String>>>, note: String) -> impl Future<Output = usize> {
    log.lock().unwrap().push(note.clone());
    async move {
        let mut log = log.lock().unwrap();
        log.push(note);
        log.len()
    }
}`;

const lazinessSolution = `use std::future::Future;
use std::sync::{Arc, Mutex};

fn deferred_note(log: Arc<Mutex<Vec<String>>>, note: String) -> impl Future<Output = usize> {
    async move {
        let mut log = log.lock().unwrap();
        log.push(note);
        log.len()
    }
}`;

const lazinessTests = `#[test]
fn body_effect_is_absent_until_first_poll_and_preserves_unicode() {
    use std::future::Future;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let log = Arc::new(std::sync::Mutex::new(Vec::new()));
    let mut future = Box::pin(deferred_note(Arc::clone(&log), "żółć".to_owned()));
    assert!(log.lock().unwrap().is_empty());
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(1));
    assert_eq!(*log.lock().unwrap(), vec!["żółć"]);

    fn make_arg(log: &std::sync::Arc<std::sync::Mutex<Vec<&'static str>>>) -> String {
        log.lock().unwrap().push("argument");
        "arg".to_owned()
    }
    async fn worker(value: String) -> usize { value.len() }
    let argument_log = Arc::new(std::sync::Mutex::new(Vec::new()));
    let _unused = worker(make_arg(&argument_log));
    assert_eq!(*argument_log.lock().unwrap(), vec!["argument"]);
}

#[test]
fn empty_note_is_still_one_deferred_effect() {
    use std::future::Future;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let log = Arc::new(std::sync::Mutex::new(Vec::new()));
    let mut future = Box::pin(deferred_note(Arc::clone(&log), String::new()));
    assert_eq!(log.lock().unwrap().len(), 0);
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(1));
    assert_eq!(*log.lock().unwrap(), vec![String::new()]);
}`;

const lazinessBlankSolution = `use std::future::Future;

fn defer_factory<T, F>(factory: F) -> impl Future<Output = T>
where
    F: FnOnce() -> T,
{
    async move { factory() }
}`;

const lazinessBlankTests = `#[test]
fn local_factory_can_borrow_and_return_a_non_static_reference() {
    use std::cell::Cell;
    use std::future::Future;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let calls = Cell::new(0);
    let message = String::from("lokalny zasób");
    let mut future = Box::pin(defer_factory(|| {
        calls.set(calls.get() + 1);
        message.as_str()
    }));
    assert_eq!(calls.get(), 0);
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(message.as_str()));
    assert_eq!(calls.get(), 1);
}

#[test]
fn factory_runs_once_only_when_polled_and_returns_non_copy_value() {
    use std::future::Future;
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let calls = Arc::new(AtomicUsize::new(0));
    let captured = String::from("zażółć");
    let mut future = Box::pin(defer_factory({
        let calls = Arc::clone(&calls);
        move || { calls.fetch_add(1, Ordering::SeqCst); captured }
    }));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(String::from("zażółć")));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[test]
fn dropping_unpolled_future_drops_factory_capture_without_running_it() {
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    struct DropProbe(Arc<AtomicUsize>);
    impl Drop for DropProbe { fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); } }
    let calls = Arc::new(AtomicUsize::new(0));
    let drops = Arc::new(AtomicUsize::new(0));
    let probe = DropProbe(Arc::clone(&drops));
    let future = defer_factory({
        let calls = Arc::clone(&calls);
        move || { calls.fetch_add(1, Ordering::SeqCst); probe }
    });
    drop(future);
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}`;

const awaitRun = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

struct Noop;
impl Wake for Noop { fn wake(self: Arc<Self>) {} }

fn main() {
    let mut polls = 0;
    let mut future = Box::pin(std::future::poll_fn(move |cx| {
        polls += 1;
        if polls == 1 {
            cx.waker().wake_by_ref();
            Poll::Pending
        } else { Poll::Ready("gotowe") }
    }));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    println!("pierwszy={:?}", Pin::as_mut(&mut future).poll(&mut cx));
    println!("drugi={:?}", Pin::as_mut(&mut future).poll(&mut cx));
}`;

const awaitStarter = `use std::future::Future;

async fn sequence(
    first: impl Future<Output = Result<usize, &'static str>>,
    second: impl Future<Output = Result<usize, &'static str>>,
) -> Result<(usize, usize), &'static str> {
    let left = first.await?;
    Ok((left, 0))
}`;

const awaitSolution = `use std::future::Future;

async fn sequence(
    first: impl Future<Output = Result<usize, &'static str>>,
    second: impl Future<Output = Result<usize, &'static str>>,
) -> Result<(usize, usize), &'static str> {
    let left = first.await?;
    let right = second.await?;
    Ok((left, right))
}`;

const awaitTests = `#[test]
fn sequence_awaits_both_in_order_and_propagates_pending() {
    use std::future::Future;
    use std::sync::{Arc, Mutex};
    use std::task::{Context, Poll, Wake, Waker};
    struct Probe { name: &'static str, polls: usize, ready_after: usize, log: Arc<Mutex<Vec<&'static str>>> }
    impl Future for Probe {
        type Output = Result<usize, &'static str>;
        fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            self.polls += 1;
            self.log.lock().unwrap().push(self.name);
            if self.polls <= self.ready_after {
                cx.waker().wake_by_ref();
                Poll::Pending
            } else { Poll::Ready(Ok(self.polls)) }
        }
    }
    struct RecordingWake(Arc<Mutex<usize>>);
    impl Wake for RecordingWake { fn wake(self: Arc<Self>) { *self.0.lock().unwrap() += 1; } }
    let log = Arc::new(Mutex::new(Vec::new()));
    let first = Probe { name: "first", polls: 0, ready_after: 1, log: Arc::clone(&log) };
    let second = Probe { name: "second", polls: 0, ready_after: 0, log: Arc::clone(&log) };
    let mut outer = Box::pin(sequence(first, second));
    let wake_count = Arc::new(Mutex::new(0));
    let waker: Waker = Arc::new(RecordingWake(Arc::clone(&wake_count))).into();
    let mut cx = Context::from_waker(&waker);
    assert!(outer.as_mut().poll(&mut cx).is_pending());
    assert_eq!(*log.lock().unwrap(), vec!["first"]);
    assert!(*wake_count.lock().unwrap() > 0);
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Ok((2, 1))));
    assert_eq!(*log.lock().unwrap(), vec!["first", "first", "second"]);
}

#[test]
fn sequence_does_not_poll_second_after_first_error() {
    use std::future::{ready, Future};
    use std::sync::{Arc, Mutex};
    use std::task::{Context, Poll, Wake, Waker};
    struct CountedError(Arc<Mutex<usize>>);
    impl Future for CountedError {
        type Output = Result<usize, &'static str>;
        fn poll(self: std::pin::Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
            *self.0.lock().unwrap() += 1;
            Poll::Ready(Err("drugi"))
        }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let second_polls = Arc::new(Mutex::new(0));
    let mut outer = Box::pin(sequence(ready(Ok::<usize, &'static str>(1)), CountedError(Arc::clone(&second_polls))));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Err("drugi")));
    assert_eq!(*second_polls.lock().unwrap(), 1);

    let second_skipped = Arc::new(Mutex::new(0));
    let mut failed_first = Box::pin(sequence(ready(Err::<usize, _>("pierwszy")), CountedError(Arc::clone(&second_skipped))));
    assert_eq!(failed_first.as_mut().poll(&mut cx), Poll::Ready(Err("pierwszy")));
    assert_eq!(*second_skipped.lock().unwrap(), 0);
}

#[test]
fn pending_future_keeps_only_the_latest_waker() {
    use std::future::Future;
    use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
    use std::task::{Context, Poll, Wake, Waker};
    struct Gate { ready: Arc<AtomicBool>, saved: Arc<Mutex<Option<Waker>>> }
    impl Future for Gate {
        type Output = Result<usize, &'static str>;
        fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            *self.saved.lock().unwrap() = Some(cx.waker().clone());
            if self.ready.load(Ordering::SeqCst) { Poll::Ready(Ok(1)) } else { Poll::Pending }
        }
    }
    struct Recorder { id: &'static str, calls: Arc<Mutex<Vec<&'static str>>> }
    impl Wake for Recorder { fn wake(self: Arc<Self>) { self.calls.lock().unwrap().push(self.id); } }
    let calls = Arc::new(Mutex::new(Vec::new()));
    let ready = Arc::new(AtomicBool::new(false));
    let saved = Arc::new(Mutex::new(None));
    let mut future = Box::pin(sequence(
        Gate { ready: Arc::clone(&ready), saved: Arc::clone(&saved) },
        std::future::ready(Ok::<usize, &'static str>(2)),
    ));
    let first: Waker = Arc::new(Recorder { id: "A", calls: Arc::clone(&calls) }).into();
    let second: Waker = Arc::new(Recorder { id: "B", calls: Arc::clone(&calls) }).into();
    let mut cx_a = Context::from_waker(&first);
    assert!(future.as_mut().poll(&mut cx_a).is_pending());
    let mut cx_b = Context::from_waker(&second);
    assert!(future.as_mut().poll(&mut cx_b).is_pending());
    ready.store(true, Ordering::SeqCst);
    saved.lock().unwrap().take().unwrap().wake();
    assert_eq!(*calls.lock().unwrap(), vec!["B"]);
    assert_eq!(future.as_mut().poll(&mut cx_b), Poll::Ready(Ok((1, 2))));
}

#[test]
fn await_does_not_repoll_a_ready_child() {
    use std::future::Future;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct ReadyOnce { used: bool }
    impl Future for ReadyOnce {
        type Output = Result<usize, &'static str>;
        fn poll(mut self: std::pin::Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
            assert!(!self.used, "Ready child was polled again");
            self.used = true;
            Poll::Ready(Ok(4))
        }
    }
    struct Later { ready: bool }
    impl Future for Later {
        type Output = Result<usize, &'static str>;
        fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            if !self.ready { self.ready = true; cx.waker().wake_by_ref(); Poll::Pending } else { Poll::Ready(Ok(5)) }
        }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let mut outer = Box::pin(sequence(ReadyOnce { used: false }, Later { ready: false }));
    assert!(outer.as_mut().poll(&mut cx).is_pending());
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Ok((4, 5))));
}`;

const awaitBlankSolution = `use std::future::Future;

fn and_then_future<T, U, F, Next>(
    first: impl Future<Output = Result<T, &'static str>>,
    factory: F,
) -> impl Future<Output = Result<U, &'static str>>
where
    F: FnOnce(T) -> Next,
    Next: Future<Output = Result<U, &'static str>>,
{
    async move {
        let value = first.await?;
        factory(value).await
    }
}`;

const awaitBlankTests = `#[test]
fn factory_waits_for_first_ok_and_both_stages_can_be_pending() {
    use std::future::Future;
    use std::sync::{Arc, atomic::{AtomicBool, AtomicUsize, Ordering}};
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let first_ready = Arc::new(AtomicBool::new(false));
    let second_ready = Arc::new(AtomicBool::new(false));
    let observed_second_ready = Arc::clone(&second_ready);
    let first_polls = Arc::new(AtomicUsize::new(0));
    let second_polls = Arc::new(AtomicUsize::new(0));
    let observed_second_polls = Arc::clone(&second_polls);
    let factory_calls = Arc::new(AtomicUsize::new(0));
    let first = {
        let ready = Arc::clone(&first_ready);
        let polls = Arc::clone(&first_polls);
        std::future::poll_fn(move |cx| {
            polls.fetch_add(1, Ordering::SeqCst);
            if ready.load(Ordering::SeqCst) { Poll::Ready(Ok::<String, &'static str>("pierwszy".to_owned())) }
            else { cx.waker().wake_by_ref(); Poll::Pending }
        })
    };
    let mut outer = Box::pin(and_then_future(first, {
        let calls = Arc::clone(&factory_calls);
        move |value| {
            calls.fetch_add(1, Ordering::SeqCst);
            let ready = Arc::clone(&second_ready);
            let polls = Arc::clone(&second_polls);
            std::future::poll_fn(move |cx| {
                polls.fetch_add(1, Ordering::SeqCst);
                if ready.load(Ordering::SeqCst) { Poll::Ready(Ok::<String, &'static str>(format!("{value}!"))) }
                else { cx.waker().wake_by_ref(); Poll::Pending }
            })
        }
    }));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert!(outer.as_mut().poll(&mut cx).is_pending());
    assert_eq!(factory_calls.load(Ordering::SeqCst), 0);
    first_ready.store(true, Ordering::SeqCst);
    assert!(outer.as_mut().poll(&mut cx).is_pending());
    assert_eq!(factory_calls.load(Ordering::SeqCst), 1);
    assert_eq!(first_polls.load(Ordering::SeqCst), 2);
    assert_eq!(observed_second_polls.load(Ordering::SeqCst), 1);
    observed_second_ready.store(true, Ordering::SeqCst);
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Ok("pierwszy!".to_owned())));
    assert_eq!(observed_second_polls.load(Ordering::SeqCst), 2);
}

#[test]
fn factory_is_never_called_when_first_future_errors() {
    use std::future::{ready, Future};
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let calls = Arc::new(AtomicUsize::new(0));
    let mut outer = Box::pin(and_then_future(ready(Err::<String, _>("pierwszy")), {
        let calls = Arc::clone(&calls);
        move |_value| { calls.fetch_add(1, Ordering::SeqCst); ready(Ok::<String, &'static str>("nie".to_owned())) }
    }));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Err("pierwszy")));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
}

#[test]
fn second_future_error_is_preserved() {
    use std::future::{ready, Future};
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let mut outer = Box::pin(and_then_future(
        ready(Ok::<String, &'static str>("wejście".to_owned())),
        |_value| ready(Err::<String, _>("drugi błąd")),
    ));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(outer.as_mut().poll(&mut cx), Poll::Ready(Err("drugi błąd")));
}`;

const reviewLaziness = exercise({
  id: "review-future-laziness",
  kind: "apply",
  title: "Powtórka: odrocz pobranie z kolejki",
  prompt:
    "Dokończ `lazy_pop`, aby future pobrał pierwszy element ze współdzielonej kolejki dopiero przy pierwszym poll. Element dodany do kolejki po utworzeniu future ma być widoczny, a pusta kolejka ma zwracać None.",
  code: `use std::future::Future;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

fn lazy_pop(queue: Arc<Mutex<VecDeque<String>>>) -> impl Future<Output = Option<String>> {
    let value = queue.lock().unwrap().pop_front();
    async move { value }
}`,
  solution: `use std::future::Future;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

fn lazy_pop(queue: Arc<Mutex<VecDeque<String>>>) -> impl Future<Output = Option<String>> {
    async move { queue.lock().unwrap().pop_front() }
}`,
  tests: `#[test]
fn review_laziness_observes_queue_changed_after_creation() {
    use std::future::Future;
    use std::collections::VecDeque;
    use std::sync::{Arc, Mutex};
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let queue = Arc::new(Mutex::new(VecDeque::from(["stary".to_owned()])));
    let mut future = Box::pin(lazy_pop(Arc::clone(&queue)));
    queue.lock().unwrap().push_front("nowszy".to_owned());
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(Some("nowszy".to_owned())));
    assert_eq!(queue.lock().unwrap().iter().cloned().collect::<Vec<_>>(), vec!["stary"]);
}

#[test]
fn review_laziness_returns_none_for_empty_queue_at_poll() {
    use std::future::Future;
    use std::collections::VecDeque;
    use std::sync::{Arc, Mutex};
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let queue = Arc::new(Mutex::new(VecDeque::new()));
    let mut future = Box::pin(lazy_pop(Arc::clone(&queue)));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(None));
}`,
  hints: [
    "Nie pobieraj kolejki przed `async move`; blok ma wykonać `pop_front` dopiero po poll.",
    "Użyj Arc<Mutex<VecDeque<String>>> i zachowaj Option<String>, aby pustka była obserwowalnym None.",
  ],
});

const reviewAwait = exercise({
  id: "review-await-progress",
  kind: "apply",
  title: "Powtórka: zbierz futures sekwencyjnie",
  prompt:
    "Dokończ `collect_sequential`, aby zebrać wyniki z przekazanej Vec futures w tej samej kolejności. Pusta Vec daje pusty wynik, a pierwszy błąd kończy zbieranie bez pollowania reszty.",
  code: `use std::future::Future;

fn collect_sequential<T, F>(futures: Vec<F>) -> impl Future<Output = Result<Vec<T>, &'static str>>
where F: Future<Output = Result<T, &'static str>> {
    async move {
        match futures.into_iter().next() {
            Some(future) => Ok(vec![future.await?]),
            None => Ok(Vec::new()),
        }
    }
}`,
  solution: `use std::future::Future;

fn collect_sequential<T, F>(futures: Vec<F>) -> impl Future<Output = Result<Vec<T>, &'static str>>
where F: Future<Output = Result<T, &'static str>> {
    async move {
        let mut values = Vec::with_capacity(futures.len());
        for future in futures {
            values.push(future.await?);
        }
        Ok(values)
    }
}`,
  tests: `#[test]
fn review_await_collects_in_order_across_pending_polls() {
    use std::future::Future;
    use std::sync::{Arc, Mutex};
    use std::task::{Context, Poll, Wake, Waker};
    struct Probe { name: &'static str, polls: usize, pending: usize, log: Arc<Mutex<Vec<&'static str>>> }
    impl Future for Probe {
        type Output = Result<&'static str, &'static str>;
        fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            self.polls += 1;
            self.log.lock().unwrap().push(self.name);
            if self.polls <= self.pending { cx.waker().wake_by_ref(); Poll::Pending }
            else { Poll::Ready(Ok(self.name)) }
        }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let log = Arc::new(Mutex::new(Vec::new()));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(collect_sequential(vec![
        Probe { name: "A", polls: 0, pending: 1, log: Arc::clone(&log) },
        Probe { name: "B", polls: 0, pending: 1, log: Arc::clone(&log) },
    ]));
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert_eq!(future.as_mut().poll(&mut cx), Poll::Ready(Ok(vec!["A", "B"])));
    assert_eq!(*log.lock().unwrap(), vec!["A", "A", "B", "B"]);
}

#[test]
fn review_await_empty_and_first_error_skip_remaining_future() {
    use std::future::{ready, Future};
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    use std::task::{Context, Poll, Wake, Waker};
    struct Counted { calls: Arc<AtomicUsize>, result: Result<usize, &'static str> }
    impl Future for Counted {
        type Output = Result<usize, &'static str>;
        fn poll(self: std::pin::Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            Poll::Ready(self.result)
        }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let empty: Vec<std::future::Ready<Result<String, &'static str>>> = Vec::new();
    let mut no_values = Box::pin(collect_sequential(empty));
    assert_eq!(no_values.as_mut().poll(&mut cx), Poll::Ready(Ok(Vec::<String>::new())));
    let first_calls = Arc::new(AtomicUsize::new(0));
    let second_calls = Arc::new(AtomicUsize::new(0));
    let mut failed = Box::pin(collect_sequential(vec![
        Counted { calls: Arc::clone(&first_calls), result: Err("pierwszy") },
        Counted { calls: Arc::clone(&second_calls), result: Ok(9) },
    ]));
    assert_eq!(failed.as_mut().poll(&mut cx), Poll::Ready(Err("pierwszy")));
    assert_eq!(first_calls.load(Ordering::SeqCst), 1);
    assert_eq!(second_calls.load(Ordering::SeqCst), 0);
}`,
  hints: [
    "Iteruj po całej Vec i wykonuj `future.await?`; `?` zakończy funkcję na pierwszym błędzie.",
    "Zachowaj kolejność push do Vec; pustą Vec można obsłużyć przez pętlę bez specjalnego wyniku.",
  ],
});

export const asyncFoundationsLessons: Lesson[] = [
  {
    id: "future-laziness",
    moduleId: "async-foundations",
    conceptIds: ["future-laziness"],
    competencyIds: ["model-future-laziness"],
    prerequisites: ["weak-links", "closure-contracts"],
    title: "Leniwy Future: od utworzenia do poll",
    subtitle:
      "Zobaczysz, że async tworzy wartość, a ciało zaczyna działać dopiero po poll, z bezpiecznym Pin<Box<_>> i Waker.",
    minutes: 20,
    outcomes: [
      "Rozróżnisz obliczanie argumentów od uruchomienia ciała async.",
      "Przewidzisz Pending i Ready oraz nie spróbujesz pollować zakończonego future.",
      "Zbudujesz mały, skończony probe z Waker i Pin<Box<_>> bez tworzenia runtime.",
    ],
    steps: [
      choose(
        "future-laziness-predict",
        "predict",
        "Przewidź moment efektu",
        '`let future = announce(); println!("po");` gdzie `announce` wypisuje w swoim async body `ciało`. Co zobaczymy przed ręcznym poll?',
        1,
        [
          "Najpierw `ciało`, potem `po`, bo wywołanie async fn uruchamia ciało",
          "Tylko `po`, bo utworzenie future nie polluje ciała",
          "Program nie skompiluje się, bo async fn nie zwraca wartości",
        ],
        [
          "Wywołanie tworzy future; ciało nie wykona się przed await lub poll.",
          "To poprawna obserwacja leniwości: `po` pojawi się przed efektem ciała.",
          "Async fn zwraca Future, niezależnie od tego, czy jego Output jest `()` czy inną wartością.",
        ],
      ),
      run(
        "future-laziness-run",
        "Uruchom pierwszy poll",
        "Najpierw przewidź kolejność `argument`, `utworzono`, `ciało`, `wynik`: argument funkcji jest obliczony przy wywołaniu, a body async dopiero po poll. Uruchom skończony probe; `Wake` jest pusty, bo future jest natychmiast gotowy. Słownik scaffoldu: Arc współdzieli posiadany obserwator; Mutex::lock pożycza dostęp przez guard, a Drop guarda zwalnia dostęp. Wake i Context obsługują tę skończoną obserwację poll. unwrap polega tu na dostarczonym obserwatorze bez paniki, nie jest zaleceniem obsługi błędów. Polityka synchronizacji jest poza celem zadania.",
        lazinessRun,
        "argument\nutworzono\nciało\nwynik=Ready(7)\n",
      ),
      choose(
        "future-laziness-arguments",
        "explain",
        "Argumenty to nie ciało",
        "`async fn take(text: String) -> usize { text.len() }` jest wywołane jako `take(make_text())`. Które zdanie jest precyzyjne?",
        2,
        [
          "Ani `make_text`, ani ciało `take` nie wykonają się przed poll",
          "Zarówno argument, jak i ciało są wykonywane natychmiast przy wywołaniu",
          "`make_text()` oblicza argument przy wywołaniu, a ciało `take` czeka na poll",
        ],
        [
          "Argument wywołania trzeba obliczyć, aby zbudować wartość future.",
          "Async odracza body, lecz nie odracza ogólnych reguł obliczania argumentów.",
          "To rozróżnienie jest kluczowe: utworzenie future nie oznacza wykonania jego ciała.",
        ],
      ),
      exercise({
        id: "future-laziness-deferred-gate",
        kind: "debug",
        title: "Napraw efekt wykonujący się za wcześnie",
        prompt:
          "Napraw `deferred_note`: log ma pozostać pusty po utworzeniu future, a przy pierwszym poll ma dostać dokładnie jeden wpis i zwrócić nową długość. Zachowaj `Future<Output = usize>`, obsłuż Unicode i pusty String. Słownik scaffoldu: Arc współdzieli posiadany obserwator; Mutex::lock pożycza dostęp przez guard, a Drop guarda zwalnia dostęp. Wake i Context obsługują tę skończoną obserwację poll. unwrap polega tu na dostarczonym obserwatorze bez paniki, nie jest zaleceniem obsługi błędów. Polityka synchronizacji jest poza celem zadania.",
        code: lazinessStarter,
        solution: lazinessSolution,
        tests: lazinessTests,
        hints: [
          "Push wykonany przed `async move` jest efektem utworzenia, więc przenieś go do ciała future.",
          "Przechwyć note przez move; po poll zwróć długość tego samego logu.",
        ],
        forbiddenPatterns: ["std::thread::sleep", "loop {", "block_on"],
        gate: true,
      }),
      exercise({
        id: "future-laziness-blank",
        kind: "blank",
        title: "Od pustej kartki: odroczona fabryka FnOnce",
        prompt:
          "Bez startera napisz funkcję `defer_factory`, która przyjmuje jednorazową fabrykę `FnOnce() -> T` i zwraca future z wynikiem T. Konstrukcja future nie może wywołać fabryki; pierwszy poll ma wywołać ją dokładnie raz i zwrócić non-Copy wynik, a Drop niepollowanego future ma zwolnić przechwycone dane bez uruchomienia fabryki. Fabryka może też pożyczać lokalne dane i zwracać referencję do nich, jeśli dane żyją odpowiednio długo.",
        solution: lazinessBlankSolution,
        tests: lazinessBlankTests,
        hints: [
          "Przenieś fabrykę do `async move`; wywołanie `factory()` ma znaleźć się dopiero w ciele future.",
          "Użyj ograniczenia FnOnce, aby non-Copy wynik mógł zostać zwrócony dokładnie raz, a przechwycenie mogło zostać zwolnione przez Drop.",
        ],
        forbiddenPatterns: ["std::thread::sleep", "loop {", "block_on"],
        gate: true,
      }),
    ],
    misconceptions: [
      "Wywołanie async fn natychmiast wykonuje jej body.",
      "Leniwość future odracza również obliczenie argumentów.",
      "Pending oznacza błąd albo blokowanie wątku.",
      "Po Ready można zawsze pollować jeszcze raz.",
    ],
    transferTask:
      "Zaprojektuj funkcję przyjmującą nie-Copy String i log, której utworzenie nie zapisuje do logu, a poll zapisuje dokładnie raz; opisz osobno moment obliczenia argumentu i moment efektu body.",
    evidenceGate:
      "future-laziness-deferred-gate obserwuje brak efektu ciała async przed poll, a future-laziness-blank sprawdza odroczoną FnOnce, jeden rzeczywisty factory call, non-Copy wynik oraz Drop niepollowanego future.",
    sourceIds: [
      "async-foundations-std-future",
      "async-foundations-std-pin",
      "async-foundations-std-waker",
      "async-foundations-reference-async",
    ],
  },
  {
    id: "await-progress",
    moduleId: "async-foundations",
    conceptIds: ["await-progress"],
    competencyIds: ["compose-await-progress"],
    prerequisites: ["future-laziness"],
    title: "Await i postęp: Pending, Ready, kolejność",
    subtitle:
      "Złożysz dwa futures przez await, sprawdzisz propagację Pending i błędu oraz odróżnisz await od spawn.",
    minutes: 22,
    outcomes: [
      "Wyjaśnisz, że await przekazuje Pending i wraca do future zewnętrznego.",
      "Sprawdzisz, że drugi await zaczyna się dopiero po Ready pierwszego.",
      "Nie dodasz ciasnej pętli poll ani obietnicy równoległego uruchomienia.",
    ],
    steps: [
      choose(
        "await-progress-predict",
        "predict",
        "Przewidź kolejność await",
        "Pierwszy future zwraca Pending przy pierwszym poll i Ready przy drugim. Co powinien zwrócić zewnętrzny future po pierwszym poll?",
        0,
        [
          "Pending, a drugi future nie powinien być jeszcze pollowany",
          "Ready, bo await zawsze robi tyle poll, ile potrzeba",
          "Błąd, bo Pending jest niedozwolone wewnątrz async fn",
        ],
        [
          "Await propaguje brak postępu na zewnątrz; runtime ma wrócić po wake.",
          "Await nie może sam zagwarantować gotowości ani wykonywać tight loop.",
          "Pending jest normalnym wynikiem poll future i nie jest błędem.",
        ],
      ),
      run(
        "await-progress-run",
        "Obserwuj dwa skończone poll",
        "Probe ma kontrolowany stan: pierwszy poll daje Pending, drugi Ready. To ręczna obserwacja, nie executor i nie pętla oczekująca.",
        awaitRun,
        'pierwszy=Pending\ndrugi=Ready("gotowe")\n',
      ),
      choose(
        "await-progress-spawn",
        "explain",
        "Await nie jest spawn",
        "Masz `let a = fetch_a(); let b = fetch_b(); let value = a.await?;`. Co wynika z tego kodu bez runtime i bez dodatkowego mechanizmu planowania?",
        1,
        [
          "Oba futures są na pewno wykonywane równolegle",
          "`a` jest awaitowane w bieżącej sekwencji; samo utworzenie `b` nie uruchamia jego body",
          "`b` zostanie automatycznie anulowane przed utworzeniem",
        ],
        [
          "Rust nie daje automatycznej równoległości przez samo utworzenie wartości Future.",
          "Await bieżącego future oddaje kontrolę dopiero zgodnie z kontraktem await; niezależne zadanie wymaga runtime.",
          "Samo posiadanie `b` nie wystarcza do wniosku o anulowaniu ani o uruchomieniu.",
        ],
      ),
      exercise({
        id: "await-progress-sequence-gate",
        kind: "modify",
        title: "Dokończ sekwencję dwóch wyników",
        prompt:
          "Uzupełnij `sequence`, aby awaitować `first`, potem `second`, zwrócić obie wartości i propagować pierwszy napotkany błąd. Testowy Probe sam steruje Pending/Ready i zapisuje kolejność oraz liczbę poll; nie dodawaj runtime, sleep ani spin loop.",
        code: awaitStarter,
        solution: awaitSolution,
        tests: awaitTests,
        hints: [
          "Po `let left = first.await?` drugi future ma być użyty przez osobny `let right = second.await?`.",
          "Pending pierwszego musi wrócić z zewnętrznego poll; kolejność logu ma być first, first, second.",
        ],
        forbiddenPatterns: [
          "std::thread::sleep",
          "loop {",
          "block_on",
          "spawn",
        ],
        gate: true,
      }),
      exercise({
        id: "await-progress-blank",
        kind: "blank",
        title: "Od pustej kartki: fabryka po udanym await",
        prompt:
          "Bez startera napisz `and_then_future`: pierwszy Future ma Output `Result<T, &'static str>`, fabryka ma typ `FnOnce(T) -> Next`, a `Next` jest Future z Output `Result<U, &'static str>`. Zwróć future z wynikiem `Result<U, &'static str>`; fabrykę wywołaj dopiero po Ok pierwszego, nigdy po Err. Oba etapy mają propagować Pending i błędy, a wynik drugiego future ma być non-Copy.",
        solution: awaitBlankSolution,
        tests: awaitBlankTests,
        hints: [
          "Pierwsze `await?` ma zakończyć funkcję przy Err, więc drugi await musi wystąpić dopiero po nim.",
          "Nie twórz fałszywego Ready ani nie używaj `unwrap`; zwróć dokładny wynik drugiego future.",
        ],
        forbiddenPatterns: [
          "std::thread::sleep",
          "loop {",
          "block_on",
          "spawn",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Await zawsze blokuje wątek do Ready.",
      "Await automatycznie tworzy niezależne zadanie.",
      "Pending powinno być obsługiwane przez tight loop w body.",
      "Drugi future trzeba pollować przed pierwszym, aby uniknąć opóźnienia.",
    ],
    transferTask:
      "Zaprojektuj sekwencję dwóch operacji, w której pierwsza może chwilowo zwrócić Pending, błąd zatrzymuje drugą, a log polli pozwala udowodnić kolejność bez runtime.",
    evidenceGate:
      "await-progress-sequence-gate sprawdza kolejność, Pending, latest Waker i pominięcie drugiego future po błędzie, a await-progress-blank sprawdza opóźnioną fabrykę drugiego future, Pending obu etapów, non-Copy wynik i błędy.",
    sourceIds: [
      "async-foundations-std-future",
      "async-foundations-book-17",
      "async-foundations-book-17-futures",
      "async-foundations-reference-await",
    ],
  },
  asyncOwnershipLesson,
  asyncCancellationLesson,
];

export const asyncFoundationsReviewExercises: Record<string, LessonStep> = {
  "future-laziness": reviewLaziness,
  "await-progress": reviewAwait,
  "future-ownership": asyncOwnershipReview,
  "future-cancellation": asyncCancellationReview,
};

export const asyncFoundationsModule: CourseModule = {
  id: "async-foundations",
  title: "Podstawy async: Future, await i anulowanie",
  whyItMatters:
    "Przed użyciem Tokio trzeba rozumieć, czym jest Future, kiedy ciało async robi postęp, jak await przekazuje Pending oraz co naprawdę oznacza własność i Drop. Te granice pozwalają później dobrać runtime, timeout, select i graceful shutdown bez mylenia mechanizmu języka z infrastrukturą wykonawczą.",
  capabilities: [
    "Tworzysz i bezpiecznie pollujesz rzeczywiste futures przez Pin<Box<_>>, aktualny Context i Waker, obserwując Pending oraz Ready.",
    "Składasz operacje przez await w określonej kolejności, propagujesz błędy i nie obiecujesz spawn ani automatycznej równoległości.",
    "Projektujesz przejęcie non-Copy danych przez async move, rozumiesz lifetime pożyczek i opisujesz anulowanie przez Drop bez rollbacku.",
  ],
  prerequisites: ["shared-ownership", "closures"],
  lessonIds: asyncFoundationsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Ciało async fn lub async block nie wykonuje się przy utworzeniu, argumenty są obliczane przy wywołaniu, Pending wymaga późniejszego wake/poll, a po Ready nie ma kontraktu kolejnego poll.",
    "Await przekazuje Pending, przechodzi dalej dopiero po Ready, propaguje błąd i nie jest spawnem ani gwarancją widocznego przełączenia.",
    "Async move przejmuje wartości przed pierwszym poll, nie przedłuża lifetime referencji, a Pin stabilizuje przypięty stan bez zmiany własności.",
    "Drop zatrzymuje dalszy postęp dropped future, zachowane efekty pozostają, a niezależne zadanie wymaga osobnego kontraktu anulowania.",
  ],
  projectConnection:
    "Późniejszy serwis Tokio użyje tych samych kontraktów przy timeout, bounded pipeline i graceful shutdown: najpierw będzie wiadomo, co jest future, kto go posiada i gdzie może wrócić Pending, a dopiero potem runtime zorganizuje wiele zadań. Zakładasz własność, współdzielenie i closures; zaczniesz od zwykłego zachowania Future — utworzenia, poll, wake i Drop — przed zadaniami runtime. Dostarczony probe z Arc/AtomicUsize służy tylko do obserwacji i nie wymaga projektowania orderingu.",
  assessmentId: "future-cancellation/future-cancellation-blank",
  gateCriteria: [
    {
      id: "async-foundations-laziness-gate",
      label:
        "Efekt ciała async jest odroczony do poll, a argumenty i wynik są obserwowane przez realny, bezpiecznie przypięty future.",
      taskRefs: [
        {
          lessonId: "future-laziness",
          stepId: "future-laziness-deferred-gate",
        },
        { lessonId: "future-laziness", stepId: "future-laziness-blank" },
      ],
    },
    {
      id: "async-foundations-await-gate",
      label:
        "Await propaguje Pending, zachowuje kolejność i błędy oraz nie uruchamia drugiej pracy przed sukcesem pierwszej.",
      taskRefs: [
        {
          lessonId: "await-progress",
          stepId: "await-progress-sequence-gate",
        },
        { lessonId: "await-progress", stepId: "await-progress-blank" },
      ],
    },
    {
      id: "async-foundations-ownership-gate",
      label:
        "Async move przejmuje zasób przed poll, zachowuje go przez Pending i oddaje wynik bez przedwczesnego Drop; nie przedłuża życia pożyczki.",
      taskRefs: [
        {
          lessonId: "future-ownership",
          stepId: "future-ownership-move-gate",
        },
        { lessonId: "future-ownership", stepId: "future-ownership-blank" },
      ],
    },
    {
      id: "async-foundations-cancellation-gate",
      label:
        "Skończony poll Pending i Drop zachowują wcześniejszy efekt, zatrzymują dalszy poll i nie udają rollbacku.",
      taskRefs: [
        {
          lessonId: "future-cancellation",
          stepId: "future-cancellation-drop-gate",
        },
        {
          lessonId: "future-cancellation",
          stepId: "future-cancellation-blank",
        },
      ],
    },
  ],
};
