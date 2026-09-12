import type { Lesson, LessonStep } from "@/domain/types";

const run = (
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep => ({
  id,
  kind: "run",
  title,
  prompt,
  code,
  solution: code,
  evaluator: { kind: "exact-output", expected },
  expectedStatus: "success",
  evidenceKind: "exposure",
});

const predict = (
  id: string,
  title: string,
  prompt: string,
  code: string,
  correct: number,
  choices: [string, string, string],
  explanations: [string, string, string],
): LessonStep => ({
  id,
  kind: "predict",
  title,
  prompt,
  code,
  solution: code,
  expectedStatus: "success",
  choices: choices.map((label, index) => ({ id: String(index), label })),
  evaluator: {
    kind: "choice",
    correct: String(correct),
    explanations: Object.fromEntries(
      explanations.map((explanation, index) => [String(index), explanation]),
    ),
  },
  evidenceKind: "prediction",
});

const observeError = (
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  error: string,
): LessonStep => ({
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
});

const coding = (options: {
  id: string;
  kind: "modify" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate: boolean;
}): LessonStep => ({
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
    forbiddenPatterns: ["unsafe"],
  },
  ...(options.code === undefined ? {} : { expectedStatus: "success" }),
  evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
  evidenceGate: options.gate,
});

const predictionCode = `fn main() {
    let text = String::from("owned");
    let future = async move { text.len() };
    println!("future owns text before poll");
    let _ = future;
}`;

const ownershipRun = `use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};

fn deferred_take<T>(value: T) -> impl Future<Output = T> {
    async move { value }
}

struct Noop;
impl Wake for Noop { fn wake(self: Arc<Self>) {} }

fn main() {
    let future = deferred_take(String::from("owned"));
    println!("utworzono future");
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    match future.as_mut().poll(&mut cx) {
        Poll::Ready(value) => println!("wynik={value}"),
        Poll::Pending => println!("oczekiwanie"),
    }
}`;

const movedString = `use std::future::Future;

fn main() {
    let text = String::from("owned");
    let future = async move { text.len() };
    println!("{}", text);
    let _ = future;
}`;

const movedStringSolution = `use std::future::Future;

fn main() {
    let text = String::from("owned");
    println!("{}", text);
    let future = async move { text.len() };
    let _ = future;
}`;

const escapingBorrow = `use std::future::Future;

fn borrowed_future<'a>(text: &'a str) -> impl Future<Output = usize> + 'a {
    async move { text.len() }
}

fn main() {
    let future;
    {
        let text = String::from("krótkie");
        future = borrowed_future(text.as_str());
    }
    let _ = future;
}`;

const escapingBorrowSolution = `use std::future::Future;

fn owned_future(text: String) -> impl Future<Output = usize> {
    async move { text.len() }
}

fn main() {
    let future = owned_future(String::from("krótkie"));
    let _ = future;
}`;

const moveGateStarter = `use std::future::Future;

fn deferred_take<T>(value: T) -> impl Future<Output = T> {
    async move {
        let _keep = value;
        panic!("zwróć przejętą wartość dopiero z future");
    }
}`;

const moveGateSolution = `use std::future::Future;

fn deferred_take<T>(value: T) -> impl Future<Output = T> {
    async move { value }
}`;

const moveGateTests = `#[test]
fn returned_future_owns_probe_before_poll_and_returned_value_owns_it_after_ready() {
    use std::future::Future;
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
    use std::task::{Context, Poll, Wake, Waker};

    struct DropProbe { drops: Arc<AtomicUsize>, id: usize }
    impl Drop for DropProbe {
        fn drop(&mut self) { self.drops.fetch_add(1, Ordering::SeqCst); }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }

    let drops = Arc::new(AtomicUsize::new(0));
    let probe = DropProbe { drops: Arc::clone(&drops), id: 41 };
    let mut future = Box::pin(deferred_take(probe));
    assert_eq!(drops.load(Ordering::SeqCst), 0, "future must own probe before poll");
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    let returned = match future.as_mut().poll(&mut cx) {
        Poll::Ready(probe) => probe,
        Poll::Pending => panic!("deferred_take must be ready after one poll"),
    };
    assert_eq!(returned.id, 41);
    assert_eq!(drops.load(Ordering::SeqCst), 0, "returned probe is still owned by caller");
    drop(future);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(returned);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn dropping_unpolled_future_releases_owned_probe_once() {
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};

    struct DropProbe { drops: Arc<AtomicUsize> }
    impl Drop for DropProbe {
        fn drop(&mut self) { self.drops.fetch_add(1, Ordering::SeqCst); }
    }

    let drops = Arc::new(AtomicUsize::new(0));
    let future = deferred_take(DropProbe { drops: Arc::clone(&drops) });
    assert_eq!(drops.load(Ordering::SeqCst), 0, "constructing future must not drop probe");
    drop(future);
    assert_eq!(drops.load(Ordering::SeqCst), 1, "dropping an unpolled future drops its owned state");
}`;

const blankSolution = `use std::future::Future;

fn hold_until<T, G>(value: T, gate: G) -> impl Future<Output = (T, G::Output)>
where
    G: Future,
{
    async move { (value, gate.await) }
}`;

const blankTests = `#[test]
fn owned_probe_survives_pending_gate_and_returns_with_gate_result() {
    use std::future::Future;
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
    use std::task::{Context, Poll, Wake, Waker};

    struct DropProbe { drops: Arc<AtomicUsize>, id: usize }
    impl Drop for DropProbe {
        fn drop(&mut self) { self.drops.fetch_add(1, Ordering::SeqCst); }
    }
    struct Gate { polls: usize }
    impl Future for Gate {
        type Output = usize;
        fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            self.polls += 1;
            if self.polls == 1 {
                cx.waker().wake_by_ref();
                Poll::Pending
            } else {
                Poll::Ready(7)
            }
        }
    }
    struct RecordingWake(Arc<AtomicUsize>);
    impl Wake for RecordingWake {
        fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
        fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
    }

    let drops = Arc::new(AtomicUsize::new(0));
    let probe = DropProbe { drops: Arc::clone(&drops), id: 99 };
    let mut future = Box::pin(hold_until(probe, Gate { polls: 0 }));
    let wakes = Arc::new(AtomicUsize::new(0));
    let waker: Waker = Arc::new(RecordingWake(Arc::clone(&wakes))).into();
    let mut cx = Context::from_waker(&waker);
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert_eq!(drops.load(Ordering::SeqCst), 0, "value must survive the pending await");
    assert_eq!(wakes.load(Ordering::SeqCst), 1, "gate must wake once");
    let (returned, gate_result) = match future.as_mut().poll(&mut cx) {
        Poll::Ready(pair) => pair,
        Poll::Pending => panic!("finite gate must complete on second poll"),
    };
    assert_eq!(returned.id, 99, "the same owned value must be returned");
    assert_eq!(gate_result, 7);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(future);
    drop(returned);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn cancellation_while_gate_is_pending_drops_owned_value_once() {
    use std::future::Future;
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
    use std::task::{Context, Poll, Wake, Waker};

    struct DropProbe(Arc<AtomicUsize>);
    impl Drop for DropProbe {
        fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); }
    }
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }

    let drops = Arc::new(AtomicUsize::new(0));
    let mut future = Box::pin(hold_until(
        DropProbe(Arc::clone(&drops)),
        std::future::pending::<()>(),
    ));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(future);
    assert_eq!(drops.load(Ordering::SeqCst), 1, "dropping pending future cancels and releases its owned value");
}`;

const reviewStarter = `use std::future::Future;

fn deferred_map<F, T, U>(value: F, transform: impl FnOnce(T) -> U) -> impl Future<Output = U>
where
    F: Future<Output = T>,
{
    async move {
        let _value = value.await;
        panic!("zastosuj transform po Ready wartości");
    }
}`;

const reviewSolution = `use std::future::Future;

fn deferred_map<F, T, U>(value: F, transform: impl FnOnce(T) -> U) -> impl Future<Output = U>
where
    F: Future<Output = T>,
{
    async move {
        let value = value.await;
        transform(value)
    }
}`;

const reviewTests = `#[test]
fn review_map_waits_for_ready_then_returns_owned_non_copy_output() {
    use std::future::Future;
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
    use std::task::{Context, Poll, Wake, Waker};

    struct DropProbe { drops: Arc<AtomicUsize>, identity: usize }
    impl Drop for DropProbe {
        fn drop(&mut self) { self.drops.fetch_add(1, Ordering::SeqCst); }
    }
    struct InputGate { probe: Option<DropProbe>, polls: usize }
    impl Future for InputGate {
        type Output = DropProbe;
        fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
            self.polls += 1;
            if self.polls == 1 {
                cx.waker().wake_by_ref();
                Poll::Pending
            } else {
                Poll::Ready(self.probe.take().expect("input probe present"))
            }
        }
    }

    let drops = Arc::new(AtomicUsize::new(0));
    let transforms = Arc::new(AtomicUsize::new(0));
    let wakes = Arc::new(AtomicUsize::new(0));
    let mut future = Box::pin(deferred_map(
        InputGate {
            probe: Some(DropProbe { drops: Arc::clone(&drops), identity: 123 }),
            polls: 0,
        },
        {
            let transforms = Arc::clone(&transforms);
            move |probe| {
                transforms.fetch_add(1, Ordering::SeqCst);
                Box::new((probe, String::from("wrapped")))
            }
        },
    ));
    struct RecordingWake(Arc<AtomicUsize>);
    impl Wake for RecordingWake {
        fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
        fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
    }
    let waker: Waker = Arc::new(RecordingWake(Arc::clone(&wakes))).into();
    let mut cx = Context::from_waker(&waker);
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    assert_eq!(transforms.load(Ordering::SeqCst), 0, "transform waits for Ready");
    assert_eq!(wakes.load(Ordering::SeqCst), 1);
    let mapped = match future.as_mut().poll(&mut cx) {
        Poll::Ready(output) => output,
        Poll::Pending => panic!("controlled input should be ready on second poll"),
    };
    assert_eq!(transforms.load(Ordering::SeqCst), 1);
    assert_eq!(mapped.as_ref().0.identity, 123);
    assert_eq!(mapped.as_ref().1, "wrapped");
    drop(future);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(mapped);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn review_map_never_ready_input_never_invokes_transform() {
    use std::future::Future;
    use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
    use std::task::{Context, Wake, Waker};

    struct DropProbe;
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }

    let calls = Arc::new(AtomicUsize::new(0));
    let mut future = Box::pin(deferred_map(
        std::future::pending::<DropProbe>(),
        {
            let calls = Arc::clone(&calls);
            move |probe| {
                drop(probe);
                calls.fetch_add(1, Ordering::SeqCst);
                7usize
            }
        },
    ));
    let waker: Waker = Arc::new(Noop).into();
    let mut cx = Context::from_waker(&waker);
    assert!(future.as_mut().poll(&mut cx).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    drop(future);
    assert_eq!(calls.load(Ordering::SeqCst), 0, "cancelled input never reaches transform");
}`;

export const asyncOwnershipLesson: Lesson = {
  id: "future-ownership",
  moduleId: "async-foundations",
  conceptIds: ["future-ownership"],
  competencyIds: ["reason-about-future-ownership"],
  prerequisites: ["await-progress"],
  title: "Własność future: zasób żyje od utworzenia do Drop",
  subtitle:
    "Sprawdzisz własność przez non-Copy DropProbe, kontrolowany Pending i rzeczywisty moment zwolnienia stanu future.",
  minutes: 24,
  outcomes: [
    "Wyjaśnisz, że async move przejmuje non-Copy wartość przed pierwszym poll.",
    "Udowodnisz przez DropProbe, że future utrzymuje zasób przed poll i zwalnia go po Drop albo po oddaniu wyniku.",
    "Rozdzielisz przeniesienie własności od lifetime pożyczonej referencji i nazwiesz E0382 oraz E0597.",
    "Zbudujesz future, który przechowuje T przez Pending i zwraca posiadaną parę po spełnieniu warunku.",
  ],
  steps: [
    predict(
      "future-ownership-predict",
      "Przewidź właściciela przed poll",
      "Przewidź wynik dla poniższego programu. Czy `text` można użyć po utworzeniu `future`, ale przed jego pierwszym poll?",
      predictionCode,
      1,
      [
        "Tak, bo body async jeszcze się nie wykonało",
        "Nie, `async move` przejął `text` już przy utworzeniu future",
        "Tylko po przypięciu future przez `Box::pin`",
      ],
      [
        "Brak poll odracza body, ale nie cofa przejęcia przez move.",
        "To właściwe rozróżnienie: wartość jest w stanie future przed pierwszym poll.",
        "Pin stabilizuje adres stanu; nie przywraca własności przeniesionej wartości.",
      ],
    ),
    run(
      "future-ownership-run",
      "Zobacz oddanie posiadanego wyniku",
      "Uruchom skończony `deferred_take<String>`. `Box::pin` i jeden ręczny poll wystarczą; nie potrzebujesz runtime.",
      ownershipRun,
      "utworzono future\nwynik=owned\n",
    ),
    observeError(
      "future-ownership-moved-string",
      "Odczytaj E0382 po async move",
      "Uruchom przykład i odczytaj E0382. `async move` przejęło `String`, więc naprawa musi zmienić właściciela używanego po utworzeniu future.",
      movedString,
      movedStringSolution,
      "E0382",
    ),
    observeError(
      "future-ownership-escaping-borrow",
      "Odczytaj E0597 dla pożyczki",
      "Uruchom przykład i odczytaj E0597. Future może przechowywać `&str`, ale nie może żyć dłużej niż właściciel `String`; Pin nie przedłuża lifetime.",
      escapingBorrow,
      escapingBorrowSolution,
      "E0597",
    ),
    coding({
      id: "future-ownership-move-gate",
      kind: "modify",
      title: "Przekaż DropProbe przez deferred_take",
      prompt:
        "Uzupełnij `deferred_take<T>(value: T) -> impl Future<Output = T>`. `T` ma pozostać własnością zwróconego future przed poll, po jednym poll ma wrócić jako posiadany wynik, a Drop future jeszcze przed pierwszym poll ma zwolnić `T`. Test dostarcza non-Copy `DropProbe` z licznikiem Drop i sprawdza tożsamość wyniku oraz moment zwolnienia.",
      code: moveGateStarter,
      solution: moveGateSolution,
      tests: moveGateTests,
      hints: [
        "Zwróć `async move`, w którym `value` jest wynikiem future; nie klonuj T i nie chowaj go w globalnym stanie.",
        "Test rozróżnia trzy momenty: po utworzeniu future DropProbe żyje, po Ready żyje w wyniku, a po drop wyniku ma dokładnie jeden Drop.",
      ],
      gate: true,
    }),
    coding({
      id: "future-ownership-blank",
      kind: "blank",
      title: "Od pustej kartki: zasób przez Pending",
      prompt:
        "Napisz funkcję `hold_until`, której pierwszy argument to posiadane `value: T`, a drugi to `gate: G` implementujące `Future`; zwrócony future ma mieć `Output = (T, G::Output)`, zachować T przez oczekiwanie na G, a po zakończeniu oddać tę samą wartość razem z wynikiem bramki. Test pollowuje skończoną bramkę, która raz zwraca `Poll::Pending` i budzi `Waker`, potem `Poll::Ready`; sprawdza tożsamość `DropProbe`, brak Drop podczas Pending i Drop dokładnie raz po anulowaniu albo oddaniu wyniku. Dla ścieżki anulowania użyj `std::future::pending::<()>`: to przyszłość bez źródła gotowości, więc nie czekamy na wake; `Context` jest potrzebny tylko do ręcznego poll. Polityka: anulowanie przed Ready zwalnia przejęty zasób, sukces oddaje go callerowi. Nie używaj runtime, sleep, spin loop, unsafe ani klonowania.",
      solution: blankSolution,
      tests: blankTests,
      hints: [
        "Wybierz `async move`, aby T należało do maszyny future także w punkcie Pending; G powinno być awaitowane jako warunek zakończenia.",
        "Zwróć posiadaną parę dopiero po `G::Output`; nie zwracaj referencji do lokalnego stanu i nie używaj `mem::forget` do ukrycia Drop.",
      ],
      gate: true,
    }),
  ],
  misconceptions: [
    "Brak poll oznacza, że async move jeszcze niczego nie przejęło.",
    "Pin przedłuża lifetime referencji albo jest właścicielem danych.",
    "Drop przyszłego wyniku i Drop future jeszcze przed pierwszym poll następują w tym samym miejscu.",
    "Zwrócenie `&T` jest równoważne zwróceniu posiadanego T po await.",
  ],
  transferTask:
    "Zaprojektuj własny kontrakt future dla non-Copy zasobu: wskaż właściciela przed poll, zachowanie po jednym Pending, politykę anulowania i moment, w którym caller odzyskuje posiadaną wartość.",
  evidenceGate:
    "future-ownership-move-gate i future-ownership-blank muszą przez zewnętrzny non-Copy DropProbe obserwować własność przed poll, przeżycie Pending, stabilną tożsamość wyniku oraz dokładnie jeden Drop po anulowaniu lub oddaniu wartości.",
  sourceIds: [
    "async-foundations-std-future",
    "async-foundations-std-pin",
    "async-foundations-reference-async",
    "async-foundations-book-17-futures",
  ],
};

export const asyncOwnershipReview: LessonStep = {
  id: "review-future-ownership",
  kind: "apply",
  title: "Powtórka: przekształć wynik po kontrolowanym await",
  prompt:
    "Zaimplementuj świeży kontrakt `deferred_map(value, transform)`: `value` to future F z `Output = T`, a `transform` to `FnOnce(T) -> U`. Zwrócony future ma awaitować F, dopiero po jego `Ready` wywołać transform na posiadanym T i zwrócić posiadane U. Test dostarcza non-Copy DropProbe, kontrolowany poll/wake i liczniki: transform nie może działać przed Ready ani po anulowaniu, a ukończony wynik ma uwolnić zasób dopiero po Drop U.",
  code: reviewStarter,
  solution: reviewSolution,
  hints: [
    "Utrzymaj F i transform w jednym `async move`; po `let value = value.await` przekaż wartość do `FnOnce` i oddaj jego U.",
    "Transform ma być wywołany dokładnie po Ready F. Po ukończeniu caller posiada U i odpowiada za jego Drop; Drop pending future nie może wywołać transform.",
  ],
  evaluator: {
    kind: "tests",
    tests: reviewTests,
    forbiddenPatterns: ["unsafe"],
  },
  expectedStatus: "success",
  evidenceKind: "transfer",
};
