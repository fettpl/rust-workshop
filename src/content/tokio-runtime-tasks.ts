import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";
const tokioTarget = "cargo-tokio-runtime-1.53.1" as const;

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: number,
  answers: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
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

function tokioRun(
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
    trustedFixtureTarget: tokioTarget,
  };
}

function tokioError(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  expected: { code?: string; diagnostic?: string },
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: {
      kind: "expected-error",
      ...(expected.code === undefined ? {} : { code: expected.code }),
      ...(expected.diagnostic === undefined
        ? {}
        : { diagnostic: expected.diagnostic }),
    },
    expectedStatus: "compile-error",
    ...(expected.code === undefined ? {} : { expectedError: expected.code }),
    ...(expected.diagnostic === undefined
      ? {}
      : { expectedDiagnostic: expected.diagnostic }),
    evidenceKind: "exposure",
    trustedFixtureTarget: tokioTarget,
  };
}

function tokioExercise(options: {
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
      forbiddenPatterns: [
        "unsafe",
        "std::thread",
        ...(options.forbiddenPatterns ?? []),
      ],
    },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
    trustedFixtureTarget: tokioTarget,
  };
}

export const tokioRuntimeSources: Source[] = [
  {
    id: "tokio-runtime-builder",
    title: "Tokio 1.53: runtime::Builder",
    url: "https://docs.rs/tokio/1.53.1/tokio/runtime/struct.Builder.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu current-thread runtime, enter, block_on albo wymaganych feature flags.",
  },
  {
    id: "tokio-spawn",
    title: "Tokio 1.53: tokio::spawn",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie granicy Send/'static, momentu pierwszego poll albo zachowania JoinHandle.",
  },
  {
    id: "tokio-join-handle",
    title: "Tokio 1.53: JoinHandle",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/struct.JoinHandle.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyniku await, JoinError, abort lub semantyki Drop JoinHandle.",
  },
  {
    id: "tokio-task-id",
    title: "Tokio 1.53: task::id",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/fn.id.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie dostępności tożsamości zadania podczas wykonania przez Tokio.",
  },
  {
    id: "tokio-oneshot",
    title: "Tokio 1.53: sync::oneshot",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/oneshot/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie własności Sender/Receiver i zakończenia Receiver po Drop nadawcy.",
  },
  {
    id: "rust-book-async-tasks",
    title: "The Rust Programming Language, chapter 17.3: More Futures",
    url: "https://doc.rust-lang.org/book/ch17-03-more-futures.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyjaśnienia różnicy między Future, zadaniem runtime i współbieżnością.",
  },
];

export const tokioRuntimeCompetencies: Competency[] = [
  {
    id: "enter-current-thread-runtime",
    title:
      "Uruchamiasz lokalny Future w current-thread runtime i rozróżniasz utworzenie Future od wejścia do kontekstu runtime.",
  },
  {
    id: "spawn-and-join-tasks",
    title:
      "Tworzysz niezależne zadania Tokio, zachowujesz JoinHandle i odbierasz wyniki bez założeń o kolejności planowania.",
  },
  {
    id: "respect-task-boundaries",
    title:
      "Projektujesz API spawn z właściwymi granicami Send i 'static oraz zachowujesz własność danych przez pracę dziecka.",
  },
  {
    id: "account-for-join-outcomes",
    title:
      "Odbierasz każdy wynik JoinHandle, rozdzielasz sukcesy od JoinError i umiesz dowieść, że Drop uchwytu odłącza zadanie.",
  },
];

export const tokioRuntimeConcepts: Concept[] = [
  {
    id: "tokio-runtime-entry",
    title: "Current-thread runtime wykonuje lokalny Future",
    prerequisites: ["future-cancellation"],
    competencyIds: ["enter-current-thread-runtime"],
    reviewPrompt:
      "Dlaczego `run_local` może uruchomić Future pożyczający lokalny String i używający Rc<Cell<_>>, a fabrykę Future należy wywołać dopiero po `Runtime::enter`?",
    reviewAnswer:
      "`Runtime::block_on` wykonuje przekazany Future do zakończenia; samo API current-thread runtime nie wymaga, aby ten Future był Send ani 'static, więc może on pożyczać dane wywołującego i przechowywać Rc<Cell<_>>. Future przekazany bezpośrednio do `run_local` powstaje przed wejściem do runtime. Gdy jego konstrukcja potrzebuje `Handle::try_current`, funkcję-fabrykę trzeba wywołać wewnątrz tymczasowego `runtime.enter()`, a dopiero potem wykonać zwrócony Future przez `block_on`.",
    distinguish:
      "Runtime uruchamia bieżący Future; nie tworzy niezależnego zadania i nie nadaje danym dłuższego lifetime. Brak granicy Send/'static wynika tu z lokalnego wykonania przez funkcję wywołującą, nie z ogólnej własności wszystkich bloków async. `enter` ustawia kontekst podczas konstrukcji Future, a `block_on` wykonuje już utworzony Future.",
  },
  {
    id: "tokio-spawn-join",
    title: "spawn tworzy zadania, JoinHandle odbiera wynik",
    prerequisites: ["tokio-runtime-entry"],
    competencyIds: ["spawn-and-join-tasks"],
    reviewPrompt:
      "Co zwraca `tokio::spawn`, gdzie wykonuje się fabryka przekazana do `spawn_factory` i dlaczego test porównuje identyfikatory zadań zamiast kolejności logów?",
    reviewAnswer:
      "`tokio::spawn` zwraca JoinHandle, który jest Future dającym `Result<T, JoinError>` po zakończeniu dziecka. `spawn_factory` przenosi fabrykę do bloku async przekazanego do spawn, więc fabryka i zwrócony przez nią Future działają w tym samym dziecku. Tokio nie gwarantuje kolejności ukończenia rodzeństwa; tożsamość zadania pozwala sprawdzić, że powstały dwa różne zadania bez zamieniania przypadkowego harmonogramu w kontrakt.",
    distinguish:
      "Utworzenie dwóch Future nie jest spawn. JoinHandle jest uchwytem do pracy rozpoczętej przez runtime, a await uchwytu obserwuje wynik konkretnego dziecka. Dwa wyniki można odebrać w określonej kolejności przez await uchwytów, ale nie mówi to, która praca zakończyła się wcześniej.",
  },
  {
    id: "tokio-task-boundaries",
    title: "Granica spawn wymaga Send i 'static",
    prerequisites: ["tokio-spawn-join"],
    competencyIds: ["respect-task-boundaries"],
    reviewPrompt:
      "Skąd wynikają E0373 i diagnostyka `future cannot be sent between threads safely` przy `tokio::spawn`, i jak własność String albo Arc zmienia dane przekazywane do dziecka?",
    reviewAnswer:
      "E0373 oznacza, że async block pożycza lokalną wartość, choć uruchomione zadanie może żyć dłużej niż jego stos; zadanie potrzebuje danych posiadanych przez siebie, zwykle przez async move i String. Ten przykład Rc<Cell<_>> przechowywanego przez await zgłasza bezkodową diagnostykę `future cannot be sent between threads safely`, ponieważ `tokio::spawn` wymaga Send dla Future i Output. Arc może udostępnić posiadane dane wielu zadaniom, jeśli zawartość spełnia wymagania bezpieczeństwa współdzielenia; nie jest automatycznym lekarstwem na każdy borrow.",
    distinguish:
      "'static w spawn nie znaczy, że dane muszą być globalne: oznacza brak pożyczki krótszej niż potencjalne życie zadania. Send nie jest wymaganiem zwykłego lokalnego Future uruchomionego przez current-thread runtime. Arc daje współdzieloną własność, a Rc pozostaje lokalne; obie decyzje wynikają z tego, kto może wykonywać Future.",
  },
  {
    id: "tokio-join-outcomes",
    title: "Każdy JoinHandle ma wynik i właściciela",
    prerequisites: ["tokio-task-boundaries"],
    competencyIds: ["account-for-join-outcomes"],
    reviewPrompt:
      "Dlaczego `join_pair` nie może przestać po pierwszym JoinError, co zachowuje `collect_labeled`, a co oznacza Drop JoinHandle?",
    reviewAnswer:
      "`join_pair` awaituje oba uchwyty i zwraca dwa Result, więc błąd pierwszego nie ukrywa sukcesu ani błędu drugiego. `collect_labeled` zachowuje identyfikator wejścia, wartości sukcesów oraz rzeczywisty JoinError dla nieudanych zadań. Drop JoinHandle odłącza uchwyt od działającego zadania; samo zadanie może skończyć później. To potwierdzamy przez jawny oneshot od zadania, a nie sleep, timeout ani domysł o harmonogramie.",
    distinguish:
      "Odłączenie uchwytu nie jest anulowaniem zadania. `abort` daje JoinError anulowania i jest osobną decyzją. Wynik `JoinHandle::await` nie jest tym samym co Output zadania, bo zawiera też informację o anulowaniu lub panic; kod zbierający wyniki musi zdecydować, jak zachować oba rodzaje danych.",
  },
];

const runtimeRun = `use std::cell::Cell;
use std::future::Future;
use std::rc::Rc;

fn run_local<T>(future: impl Future<Output = T>) -> T {
    tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap()
        .block_on(future)
}

fn main() {
    let label = String::from("lokalne");
    let ticks = Rc::new(Cell::new(0));
    let seen = Rc::clone(&ticks);
    let result = run_local(async {
        seen.set(seen.get() + 1);
        format!("{label}:{}", seen.get())
    });
    println!("{result}");
}`;

const runtimeGateStarter = `use std::future::Future;

fn run_local<T>(_future: impl Future<Output = T>) -> T {
    panic!("enter a current-thread runtime and run the Future")
}`;

const runtimeGateSolution = `use std::future::Future;

fn run_local<T>(future: impl Future<Output = T>) -> T {
    tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap()
        .block_on(future)
}`;

const runtimeGateTests = `#[test]
fn runs_a_borrowed_and_non_send_local_future() {
    use std::cell::Cell;
    use std::rc::Rc;

    let label = String::from("zażółć");
    let calls = Rc::new(Cell::new(0));
    let inside = Rc::clone(&calls);
    let answer = run_local(async {
        assert!(tokio::runtime::Handle::try_current().is_ok());
        assert_eq!(
            tokio::runtime::Handle::current().runtime_flavor(),
            tokio::runtime::RuntimeFlavor::CurrentThread,
        );
        let child = tokio::spawn(async { String::from("child") });
        inside.set(inside.get() + 1);
        (format!("{label}:{}", inside.get()), child.await.unwrap())
    });

    assert_eq!(answer, (String::from("zażółć:1"), String::from("child")));
    assert_eq!(calls.get(), 1);
    assert_eq!(label, "zażółć");
}

#[test]
fn propagates_a_non_copy_output_once() {
    let answer = run_local(async { vec![String::from("first"), String::from("second")] });
    assert_eq!(answer, vec!["first", "second"]);
}`;

const runtimeFactorySolution = `use std::future::Future;

fn run_local_factory<T, F, Fut>(factory: F) -> T
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = T>,
{
    let runtime = tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap();
    let future = {
        let _entered = runtime.enter();
        factory()
    };
    runtime.block_on(future)
}`;

const runtimeFactoryTests = `#[test]
fn constructs_the_future_inside_an_entered_runtime() {
    use std::cell::Cell;
    use std::rc::Rc;

    let label = String::from("borrowed");
    let calls = Rc::new(Cell::new(0));
    let inside = Rc::clone(&calls);
    let result = run_local_factory(|| {
        assert!(tokio::runtime::Handle::try_current().is_ok());
        assert_eq!(
            tokio::runtime::Handle::current().runtime_flavor(),
            tokio::runtime::RuntimeFlavor::CurrentThread,
        );
        async {
            assert!(tokio::runtime::Handle::try_current().is_ok());
            assert_eq!(
                tokio::runtime::Handle::current().runtime_flavor(),
                tokio::runtime::RuntimeFlavor::CurrentThread,
            );
            let child = tokio::spawn(async { String::from("child") });
            inside.set(inside.get() + 1);
            format!("{label}:{}:{}", inside.get(), child.await.unwrap())
        }
    });

    assert_eq!(result, "borrowed:1:child");
    assert_eq!(calls.get(), 1);
    assert_eq!(label, "borrowed");
}

#[test]
fn factory_is_called_once_and_can_return_a_non_copy_value() {
    use std::cell::Cell;
    use std::rc::Rc;

    let calls = Rc::new(Cell::new(0));
    let observed = Rc::clone(&calls);
    let result = run_local_factory(|| {
        observed.set(observed.get() + 1);
        async { vec![String::from("owned")] }
    });
    assert_eq!(result, vec!["owned"]);
    assert_eq!(calls.get(), 1);
}`;

const runtimeReviewStarter = `use std::future::Future;

fn run_local_then<T, U, First, Next, Second>(_first: First, _next: Next) -> U
where
    First: Future<Output = T>,
    Next: FnOnce(T) -> Second,
    Second: Future<Output = U>,
{
    panic!("run both local Future stages in a current-thread runtime")
}`;

const runtimeReviewSolution = `use std::future::Future;

fn run_local_then<T, U, First, Next, Second>(first: First, next: Next) -> U
where
    First: Future<Output = T>,
    Next: FnOnce(T) -> Second,
    Second: Future<Output = U>,
{
    tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap()
        .block_on(async {
            let value = first.await;
            next(value).await
        })
}`;

const runtimeReviewTests = `#[test]
fn runs_two_local_stages_with_a_runtime_context_and_propagates_the_value() {
    use std::cell::Cell;
    use std::rc::Rc;

    let label = String::from("żółw");
    let first_calls = Rc::new(Cell::new(0));
    let second_calls = Rc::new(Cell::new(0));
    let first_inside = Rc::clone(&first_calls);
    let second_inside = Rc::clone(&second_calls);
    let result = run_local_then(
        async {
            assert!(tokio::runtime::Handle::try_current().is_ok());
            assert_eq!(
                tokio::runtime::Handle::current().runtime_flavor(),
                tokio::runtime::RuntimeFlavor::CurrentThread,
            );
            first_inside.set(first_inside.get() + 1);
            label.chars().count()
        },
        move |length| {
            assert!(tokio::runtime::Handle::try_current().is_ok());
            assert_eq!(
                tokio::runtime::Handle::current().runtime_flavor(),
                tokio::runtime::RuntimeFlavor::CurrentThread,
            );
            async move {
                assert!(tokio::runtime::Handle::try_current().is_ok());
                second_inside.set(second_inside.get() + 1);
                let child = tokio::spawn(async { String::from("child") });
                format!("{length}:{}", child.await.unwrap())
            }
        },
    );

    assert_eq!(result, "4:child");
    assert_eq!(first_calls.get(), 1);
    assert_eq!(second_calls.get(), 1);
    assert_eq!(label, "żółw");
}`;

const spawnRun = `use std::future::Future;
use tokio::task::JoinHandle;

fn spawn_pair<F, G, T, U>(first: F, second: G) -> (JoinHandle<T>, JoinHandle<U>)
where
    F: Future<Output = T> + Send + 'static,
    G: Future<Output = U> + Send + 'static,
    T: Send + 'static,
    U: Send + 'static,
{
    (tokio::spawn(first), tokio::spawn(second))
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (left, right) = spawn_pair(async { "left" }, async { "right" });
    println!("left={} right={}", left.await.unwrap(), right.await.unwrap());
}`;

const spawnPairStarter = `use std::future::Future;
use tokio::task::JoinHandle;

fn spawn_pair<F, G, T, U>(_first: F, _second: G) -> (JoinHandle<T>, JoinHandle<U>)
where
    F: Future<Output = T> + Send + 'static,
    G: Future<Output = U> + Send + 'static,
    T: Send + 'static,
    U: Send + 'static,
{
    panic!("spawn each future as its own Tokio task")
}`;

const spawnPairSolution = `use std::future::Future;
use tokio::task::JoinHandle;

fn spawn_pair<F, G, T, U>(first: F, second: G) -> (JoinHandle<T>, JoinHandle<U>)
where
    F: Future<Output = T> + Send + 'static,
    G: Future<Output = U> + Send + 'static,
    T: Send + 'static,
    U: Send + 'static,
{
    (tokio::spawn(first), tokio::spawn(second))
}`;

const spawnPairTests = `#[tokio::test(flavor = "current_thread")]
async fn spawns_two_distinct_tasks_and_keeps_both_outputs() {
    let (left, right) = spawn_pair(
        async { (tokio::task::id(), String::from("left")) },
        async { (tokio::task::id(), String::from("right")) },
    );
    let (left_id, left_value) = left.await.unwrap();
    let (right_id, right_value) = right.await.unwrap();

    assert_ne!(left_id, right_id);
    assert_eq!(left_value, "left");
    assert_eq!(right_value, "right");
}

#[tokio::test(flavor = "current_thread")]
async fn supports_different_send_output_types() {
    let (number, words) = spawn_pair(async { 7usize }, async { vec![String::from("owned")] });
    assert_eq!(number.await.unwrap(), 7);
    assert_eq!(words.await.unwrap(), vec!["owned"]);
}`;

const spawnFactorySolution = `use std::future::Future;
use tokio::task::JoinHandle;

fn spawn_factory<F, Fut, T>(factory: F) -> JoinHandle<T>
where
    F: FnOnce() -> Fut + Send + 'static,
    Fut: Future<Output = T> + Send + 'static,
    T: Send + 'static,
{
    tokio::spawn(async move { factory().await })
}`;

const spawnFactoryTests = `#[tokio::test(flavor = "current_thread")]
async fn factory_and_future_run_in_the_same_child_task() {
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    use tokio::sync::oneshot;

    struct DropProbe(Arc<AtomicUsize>);
    impl Drop for DropProbe {
        fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); }
    }

    let drops = Arc::new(AtomicUsize::new(0));
    let probe = DropProbe(Arc::clone(&drops));
    let (factory_tx, factory_rx) = oneshot::channel();
    let (body_tx, body_rx) = oneshot::channel();
    let handle = spawn_factory(move || {
        factory_tx.send(tokio::task::id()).unwrap();
        async move {
            body_tx.send(tokio::task::id()).unwrap();
            let _owned_by_child = probe;
            String::from("done")
        }
    });

    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let factory_id = factory_rx.await.unwrap();
    let body_id = body_rx.await.unwrap();
    assert_eq!(factory_id, body_id);
    assert_eq!(handle.await.unwrap(), "done");
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn child_task_identity_is_not_a_sibling_identity() {
    let child = spawn_factory(|| async { tokio::task::id() });
    let sibling = tokio::spawn(async { tokio::task::id() });
    assert_ne!(child.await.unwrap(), sibling.await.unwrap());
}`;

const spawnReviewStarter = `use tokio::task::JoinHandle;

fn spawn_labeled(_label: String) -> JoinHandle<(tokio::task::Id, String)> {
    panic!("move the label into a child task")
}`;

const spawnReviewSolution = `use tokio::task::JoinHandle;

fn spawn_labeled(label: String) -> JoinHandle<(tokio::task::Id, String)> {
    tokio::spawn(async move { (tokio::task::id(), label) })
}`;

const spawnReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn moves_the_label_to_a_real_child_task() {
    let handle = spawn_labeled(String::from("label"));
    let sibling = tokio::spawn(async { tokio::task::id() });
    let (child_id, label) = handle.await.unwrap();
    assert_eq!(label, "label");
    assert_ne!(child_id, sibling.await.unwrap());
}`;

const e0373 = `#[tokio::main(flavor = "current_thread")]
async fn main() {
    let label = String::from("borrowed");
    let task = tokio::spawn(async {
        label.len()
    });
    println!("{}", task.await.unwrap());
}`;

const sendBoundaryError = `use std::cell::Cell;
use std::rc::Rc;
use tokio::sync::oneshot;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (ready_tx, ready_rx) = oneshot::channel();
    let task = tokio::spawn(async move {
        let local = Rc::new(Cell::new(0));
        ready_tx.send(()).unwrap();
        std::future::pending::<()>().await;
        local.set(1);
    });
    let _ = ready_rx.await;
    let _ = task;
}`;

const e0373Solution = `#[tokio::main(flavor = "current_thread")]
async fn main() {
    let label = String::from("owned");
    let task = tokio::spawn(async move {
        label.len()
    });
    println!("{}", task.await.unwrap());
}`;

const sendBoundarySolution = `use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use tokio::sync::oneshot;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let shared = Arc::new(AtomicUsize::new(0));
    let task_shared = Arc::clone(&shared);
    let (ready_tx, ready_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let task = tokio::spawn(async move {
        task_shared.store(1, Ordering::SeqCst);
        ready_tx.send(()).unwrap();
        release_rx.await.unwrap();
        task_shared.store(2, Ordering::SeqCst);
    });
    ready_rx.await.unwrap();
    assert_eq!(shared.load(Ordering::SeqCst), 1);
    release_tx.send(()).unwrap();
    task.await.unwrap();
    assert_eq!(shared.load(Ordering::SeqCst), 2);
}`;

const spawnConsumeStarter = `use tokio::task::JoinHandle;

fn spawn_consume<T, U, F>(_value: T, _consumer: F) -> JoinHandle<U>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnOnce(T) -> U + Send + 'static,
{
    panic!("move both the value and consumer into a Tokio task")
}`;

const spawnConsumeSolution = `use tokio::task::JoinHandle;

fn spawn_consume<T, U, F>(value: T, consumer: F) -> JoinHandle<U>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnOnce(T) -> U + Send + 'static,
{
    tokio::spawn(async move { consumer(value) })
}`;

const spawnConsumeTests = `#[tokio::test(flavor = "current_thread")]
async fn does_not_poll_synchronously_and_consumes_owned_value_in_child() {
    use std::sync::{Arc, atomic::{AtomicBool, AtomicUsize, Ordering}};
    use tokio::sync::oneshot;

    struct DropProbe(Arc<AtomicUsize>);
    impl Drop for DropProbe {
        fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); }
    }

    let started = Arc::new(AtomicBool::new(false));
    let drops = Arc::new(AtomicUsize::new(0));
    let (id_tx, id_rx) = oneshot::channel();
    let started_in_child = Arc::clone(&started);
    let handle = spawn_consume(DropProbe(Arc::clone(&drops)), move |probe| {
        started_in_child.store(true, Ordering::SeqCst);
        id_tx.send(tokio::task::id()).unwrap();
        drop(probe);
        17usize
    });

    assert!(!started.load(Ordering::SeqCst));
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let child_id = id_rx.await.unwrap();
    let sibling_id = tokio::spawn(async { tokio::task::id() }).await.unwrap();
    assert_ne!(child_id, sibling_id);
    assert_eq!(handle.await.unwrap(), 17);
    assert!(started.load(Ordering::SeqCst));
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn handles_non_copy_owned_output() {
    let handle = spawn_consume(String::from("owned"), |text| vec![text, String::from("result")]);
    assert_eq!(handle.await.unwrap(), vec!["owned", "result"]);
}`;

const spawnSharedSolution = `use std::sync::Arc;
use tokio::task::JoinHandle;

fn spawn_shared_snapshot<T, U, F>(shared: Arc<T>, render: F) -> JoinHandle<U>
where
    T: Send + Sync + 'static,
    U: Send + 'static,
    F: FnOnce(Arc<T>) -> U + Send + 'static,
{
    tokio::spawn(async move { render(shared) })
}`;

const spawnSharedTests = `#[tokio::test(flavor = "current_thread")]
async fn preserves_arc_identity_until_the_child_consumes_its_handle() {
    use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

    struct Shared { value: String, seen: AtomicBool }

    let shared = Arc::new(Shared {
        value: String::from("shared"),
        seen: AtomicBool::new(false),
    });
    let expected_address = Arc::as_ptr(&shared) as usize;
    let handle = spawn_shared_snapshot(Arc::clone(&shared), move |inside| {
        assert_eq!(Arc::as_ptr(&inside) as usize, expected_address);
        inside.seen.store(true, Ordering::SeqCst);
        inside.value.len()
    });

    assert_eq!(Arc::strong_count(&shared), 2);
    assert!(!shared.seen.load(Ordering::SeqCst));
    assert_eq!(handle.await.unwrap(), 6);
    assert_eq!(Arc::strong_count(&shared), 1);
    assert!(shared.seen.load(Ordering::SeqCst));
}

#[tokio::test(flavor = "current_thread")]
async fn shared_snapshot_has_a_task_distinct_from_a_sibling() {
    use std::sync::Arc;
    let handle = spawn_shared_snapshot(Arc::new(3usize), |_| tokio::task::id());
    let sibling = tokio::spawn(async { tokio::task::id() });
    assert_ne!(handle.await.unwrap(), sibling.await.unwrap());
}`;

const boundaryReviewStarter = `use tokio::task::JoinHandle;

fn spawn_observe_owned<T, F>(_value: T, _observe: F) -> JoinHandle<T>
where
    T: Send + 'static,
    F: FnOnce(&T) + Send + 'static,
{
    panic!("observe the borrowed snapshot inside the spawned task")
}`;

const boundaryReviewSolution = `use tokio::task::JoinHandle;

fn spawn_observe_owned<T, F>(value: T, observe: F) -> JoinHandle<T>
where
    T: Send + 'static,
    F: FnOnce(&T) + Send + 'static,
{
    tokio::spawn(async move {
        observe(&value);
        value
    })
}`;

const boundaryReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn observes_a_borrowed_snapshot_only_inside_the_child() {
    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
    use tokio::sync::oneshot;

    struct DropProbe { label: String, drops: Arc<AtomicUsize> }
    impl Drop for DropProbe {
        fn drop(&mut self) { self.drops.fetch_add(1, Ordering::SeqCst); }
    }

    let drops = Arc::new(AtomicUsize::new(0));
    let calls = Arc::new(AtomicUsize::new(0));
    let (id_tx, id_rx) = oneshot::channel();
    let calls_in_child = Arc::clone(&calls);
    let handle = spawn_observe_owned(
        DropProbe { label: String::from("kept"), drops: Arc::clone(&drops) },
        move |value| {
            assert_eq!(value.label, "kept");
            calls_in_child.fetch_add(1, Ordering::SeqCst);
            id_tx.send(tokio::task::id()).unwrap();
        },
    );

    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let child_id = id_rx.await.unwrap();
    let sibling_id = tokio::spawn(async { tokio::task::id() }).await.unwrap();
    let returned = handle.await.unwrap();
    assert_ne!(child_id, sibling_id);
    assert_eq!(returned.label, "kept");
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(returned);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}`;

const joinRun = `use std::future::Future;
use tokio::task::{JoinError, JoinHandle};

fn spawn_pair<F, G, T, U>(first: F, second: G) -> (JoinHandle<T>, JoinHandle<U>)
where
    F: Future<Output = T> + Send + 'static,
    G: Future<Output = U> + Send + 'static,
    T: Send + 'static,
    U: Send + 'static,
{
    (tokio::spawn(first), tokio::spawn(second))
}

async fn join_pair<T, U>(left: JoinHandle<T>, right: JoinHandle<U>) -> (Result<T, JoinError>, Result<U, JoinError>) {
    (left.await, right.await)
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (left, right) = spawn_pair(async { "alpha" }, async { "beta" });
    let (left, right) = join_pair(left, right).await;
    println!("left={} right={}", left.unwrap(), right.unwrap());
}`;

const joinPairStarter = `use tokio::task::{JoinError, JoinHandle};

async fn join_pair<T, U>(left: JoinHandle<T>, right: JoinHandle<U>) -> (Result<T, JoinError>, Result<U, JoinError>) {
    right.abort();
    (left.await, right.await)
}`;

const joinPairSolution = `use tokio::task::{JoinError, JoinHandle};

async fn join_pair<T, U>(left: JoinHandle<T>, right: JoinHandle<U>) -> (Result<T, JoinError>, Result<U, JoinError>) {
    (left.await, right.await)
}`;

const joinPairTests = `#[tokio::test(flavor = "current_thread")]
async fn awaits_the_second_handle_after_the_first_is_cancelled() {
    use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

    let completed = Arc::new(AtomicBool::new(false));
    let first = tokio::spawn(async { std::future::pending::<usize>().await });
    first.abort();
    let second_completed = Arc::clone(&completed);
    let second = tokio::spawn(async move {
        second_completed.store(true, Ordering::SeqCst);
        String::from("second")
    });

    let (first, second) = join_pair(first, second).await;
    assert!(first.unwrap_err().is_cancelled());
    assert_eq!(second.unwrap(), "second");
    assert!(completed.load(Ordering::SeqCst));
}

#[tokio::test(flavor = "current_thread")]
async fn retains_a_right_side_panic_as_a_join_error() {
    let left = tokio::spawn(async { String::from("left") });
    let right = tokio::spawn(async { panic!("right panic") });
    let (left, right) = join_pair(left, right).await;
    assert_eq!(left.unwrap(), "left");
    let error = right.unwrap_err();
    assert!(error.is_panic());
    assert_eq!(*error.into_panic().downcast::<&'static str>().unwrap(), "right panic");
}

#[tokio::test(flavor = "current_thread")]
async fn retains_both_errors_without_replacing_the_right_outcome() {
    let left = tokio::spawn(async { std::future::pending::<usize>().await });
    left.abort();
    let right = tokio::spawn(async { panic!("right still panics") });

    let (left, right) = join_pair(left, right).await;
    assert!(left.unwrap_err().is_cancelled());
    let error = right.unwrap_err();
    assert!(error.is_panic());
    assert_eq!(
        *error.into_panic().downcast::<&'static str>().unwrap(),
        "right still panics",
    );
}

#[tokio::test(flavor = "current_thread")]
async fn retains_two_successful_non_copy_outputs() {
    let left = tokio::spawn(async { vec![String::from("left")] });
    let right = tokio::spawn(async { vec![String::from("right")] });
    let (left, right) = join_pair(left, right).await;
    assert_eq!(left.unwrap(), vec!["left"]);
    assert_eq!(right.unwrap(), vec!["right"]);
}`;

const collectLabeledSolution = `use tokio::task::{JoinError, JoinHandle};

struct Collected<T> {
    values: Vec<(String, T)>,
    failures: Vec<(String, JoinError)>,
}

async fn collect_labeled<T>(tasks: Vec<(String, JoinHandle<T>)>) -> Collected<T> {
    let mut values = Vec::new();
    let mut failures = Vec::new();
    for (label, handle) in tasks {
        match handle.await {
            Ok(value) => values.push((label, value)),
            Err(error) => failures.push((label, error)),
        }
    }
    Collected { values, failures }
}`;

const collectLabeledTests = `#[tokio::test(flavor = "current_thread")]
async fn partitions_labeled_successes_and_errors_without_stopping_early() {
    use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

    let stopped = tokio::spawn(async { std::future::pending::<String>().await });
    stopped.abort();
    let completed = Arc::new(AtomicBool::new(false));
    let completed_by_child = Arc::clone(&completed);
    let kept = tokio::spawn(async move {
        completed_by_child.store(true, Ordering::SeqCst);
        String::from("kept")
    });

    let collected = collect_labeled(vec![
        (String::from("stopped"), stopped),
        (String::from("kept"), kept),
    ]).await;
    assert_eq!(collected.values, vec![(String::from("kept"), String::from("kept"))]);
    assert_eq!(collected.failures.len(), 1);
    assert_eq!(collected.failures[0].0, "stopped");
    assert!(collected.failures[0].1.is_cancelled());
    assert!(completed.load(Ordering::SeqCst));
}

#[tokio::test(flavor = "current_thread")]
async fn accepts_an_empty_collection() {
    let collected = collect_labeled(Vec::<(String, tokio::task::JoinHandle<usize>)>::new()).await;
    assert!(collected.values.is_empty());
    assert!(collected.failures.is_empty());
}

#[tokio::test(flavor = "current_thread")]
async fn preserves_multiple_failure_labels_order_and_panic_payload() {
    let first = tokio::spawn(async { 1usize });
    let cancelled = tokio::spawn(async { std::future::pending::<usize>().await });
    cancelled.abort();
    let panicked = tokio::spawn(async { panic!("labeled panic") });
    let last = tokio::spawn(async { 3usize });
    let mut collected = collect_labeled(vec![
        (String::from("first"), first),
        (String::from("cancelled"), cancelled),
        (String::from("panicked"), panicked),
        (String::from("last"), last),
    ]).await;
    assert_eq!(collected.values.into_iter().map(|(label, value)| (label, value)).collect::<Vec<_>>(), vec![(String::from("first"), 1), (String::from("last"), 3)]);
    assert_eq!(collected.failures.len(), 2);
    assert_eq!(collected.failures[0].0, "cancelled");
    assert!(collected.failures[0].1.is_cancelled());
    assert_eq!(collected.failures[1].0, "panicked");
    assert!(collected.failures[1].1.is_panic());
    let panic = collected.failures.pop().unwrap().1;
    assert_eq!(*panic.into_panic().downcast::<&'static str>().unwrap(), "labeled panic");
}`;

const detachReviewStarter = `use tokio::sync::oneshot;
use tokio::task::JoinHandle;

async fn detach_and_confirm(
    handle: JoinHandle<()>,
    release: oneshot::Sender<()>,
    finished: oneshot::Receiver<&'static str>,
) -> &'static str {
    handle.abort();
    release.send(()).unwrap();
    finished.await.unwrap()
}`;

const detachReviewSolution = `use tokio::sync::oneshot;
use tokio::task::JoinHandle;

async fn detach_and_confirm(
    handle: JoinHandle<()>,
    release: oneshot::Sender<()>,
    finished: oneshot::Receiver<&'static str>,
) -> &'static str {
    drop(handle);
    release.send(()).unwrap();
    finished.await.unwrap()
}`;

const detachReviewTests = `#[tokio::test(flavor = "current_thread")]
async fn dropping_the_handle_does_not_cancel_the_started_task() {
    use tokio::sync::oneshot;

    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let (finished_tx, finished_rx) = oneshot::channel();
    let handle = tokio::spawn(async move {
        started_tx.send(()).unwrap();
        release_rx.await.unwrap();
        finished_tx.send("detached").unwrap();
    });

    started_rx.await.unwrap();
    assert_eq!(detach_and_confirm(handle, release_tx, finished_rx).await, "detached");
}

#[tokio::test(flavor = "current_thread")]
async fn a_started_detached_task_finishes_after_an_explicit_release() {
    use tokio::sync::oneshot;

    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let (finished_tx, finished_rx) = oneshot::channel();
    let handle = tokio::spawn(async move {
        started_tx.send(()).unwrap();
        release_rx.await.unwrap();
        finished_tx.send("still-running").unwrap();
    });

    started_rx.await.unwrap();
    assert_eq!(detach_and_confirm(handle, release_tx, finished_rx).await, "still-running");
}`;

export const tokioRuntimeLessons: Lesson[] = [
  {
    id: "tokio-runtime-entry",
    moduleId: "tokio-runtime-tasks",
    conceptIds: ["tokio-runtime-entry"],
    competencyIds: ["enter-current-thread-runtime"],
    prerequisites: ["future-cancellation"],
    title: "Wejście do current-thread runtime",
    subtitle:
      "Uruchomisz w Tokio lokalny Future, który pożycza dane lub przechowuje stan niespełniający Send.",
    minutes: 22,
    outcomes: [
      "Zbudujesz current-thread Runtime i wykonasz Future przez block_on.",
      "Rozpoznasz, że lokalny Future może pożyczać dane i przechowywać Rc<Cell<_>>.",
      "Utworzysz Future przez fabrykę dopiero wewnątrz kontekstu runtime.",
    ],
    steps: [
      choose(
        "tokio-runtime-entry-predict",
        "predict",
        "Które ograniczenie tu nie powstaje?",
        "`run_local` buduje current-thread runtime i od razu robi `block_on(async { ... })`. Future pożycza lokalny String i używa Rc<Cell<_>>. Które zdanie jest poprawne?",
        1,
        [
          "Future musi być Send + 'static, bo każde Tokio API ma tę granicę.",
          "Taki Future może działać lokalnie; granica Send + 'static należy do konkretnego API spawn.",
          "Rc<Cell<_>> staje się Send po wejściu do runtime.",
        ],
        [
          "To granica tokio::spawn, nie ogólna reguła block_on current-thread runtime.",
          "Kod wywołujący wykonuje lokalny Future do końca w tym samym synchronicznym wywołaniu, więc nie przekazuje go niezależnemu zadaniu.",
          "Runtime nie zmienia auto-traitów ani własności danych.",
        ],
      ),
      tokioRun(
        "tokio-runtime-entry-run",
        "Uruchom pożyczony lokalny Future",
        "Przewidź wynik. `label` jest pożyczony przez Future, a Rc<Cell<_>> nie jest Send; mimo to current-thread runtime może wykonać tę jedną lokalną pracę.",
        runtimeRun,
        "lokalne:1\n",
      ),
      choose(
        "tokio-runtime-entry-enter",
        "explain",
        "Kiedy fabryka widzi Handle?",
        "Chcesz przekazać `FnOnce() -> Future`, której kod konstrukcji wywołuje `Handle::try_current()`. Gdzie trzeba wywołać fabrykę?",
        2,
        [
          "Przed budową runtime, bo Future i tak będzie później awaitowany.",
          "Jako argument `runtime.block_on(factory())`, bo argument jest tworzony po wejściu do block_on.",
          "W zakresie `let _entered = runtime.enter(); factory()`, bo argument metody jest obliczany przed wywołaniem block_on.",
        ],
        [
          "Nie istnieje wtedy bieżący Handle tego runtime.",
          "Rust oblicza argument `factory()` przed wywołaniem metody block_on.",
          "enter ustawia bieżący kontekst na czas wywołania fabryki; potem gotowy Future można bezpiecznie wykonać przez block_on.",
        ],
      ),
      tokioExercise({
        id: "tokio-runtime-entry-local-gate",
        kind: "modify",
        title: "Wykonaj lokalny Future bez granicy spawn",
        prompt:
          "Uzupełnij `run_local`. Ma zbudować current-thread runtime i wykonać dokładnie przekazany Future. Ukryte testy pożyczają lokalny String, używają Rc<Cell<_>> oraz odbierają wynik bez Copy. Nie dodawaj Send, 'static, spawn ani klonowania danych tylko po to, aby przejść granicę, której to API nie ma.",
        code: runtimeGateStarter,
        solution: runtimeGateSolution,
        tests: runtimeGateTests,
        hints: [
          "Builder::new_current_thread().build() daje Runtime, którego block_on przyjmuje lokalny Future.",
          "Nie buduj future od nowa ani nie wymagaj Send; zwróć bezpośrednio wynik block_on.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-runtime-entry-blank",
        kind: "blank",
        title: "Od pustej kartki: fabryka w aktywnym kontekście runtime",
        prompt:
          "Od pustej kartki zaprojektuj `run_local_factory`: przyjmuje jednorazową fabrykę tworzącą Future i zwraca Output tego Future. Kontrakt: podczas konstrukcji Future `Handle::try_current()` ma zwrócić Ok, a następnie dokładnie ten Future ma zostać wykonany przez current-thread runtime. Fabryka i Future mogą pożyczać lokalny String, używać Rc<Cell<_>> i zwracać wynik, który nie implementuje Copy.",
        solution: runtimeFactorySolution,
        tests: runtimeFactoryTests,
        hints: [
          "Przechowaj runtime w lokalnej zmiennej, a future utwórz w bloku z guardem `runtime.enter()`.",
          "Argument `block_on` powstaje zbyt wcześnie, więc najpierw przypisz future, potem wywołaj `runtime.block_on(future)`.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Każdy Future używany z Tokio musi mieć Send + 'static.",
      "`block_on(factory())` konstruuje Future po wejściu do runtime.",
      "Runtime przedłuża lifetime pożyczonego String albo zmienia Rc w Send.",
    ],
    transferTask:
      "Masz parser pożyczający &str i lokalny Rc<Cell<usize>>. Opisz, które API może uruchomić go bez zmiany danych, a które wymusi własność lub inną reprezentację, gdy w kolejnym kroku pojawi się spawn.",
    evidenceGate:
      "tokio-runtime-entry-local-gate wykonuje realny pożyczony !Send Future, a tokio-runtime-entry-blank sprawdza osobno kontekst podczas konstrukcji Future przez fabrykę i wykonanie zwróconego Future.",
    sourceIds: ["tokio-runtime-builder", "rust-book-async-tasks"],
  },
  {
    id: "tokio-spawn-join",
    moduleId: "tokio-runtime-tasks",
    conceptIds: ["tokio-spawn-join"],
    competencyIds: ["spawn-and-join-tasks"],
    prerequisites: ["tokio-runtime-entry"],
    title: "spawn i JoinHandle: dwa niezależne zadania",
    subtitle:
      "Utworzysz osobne zadania Tokio i odbierzesz ich wyniki bez wpisywania harmonogramu w kontrakt programu.",
    minutes: 24,
    outcomes: [
      "Zwrócisz dwa prawdziwe JoinHandle z jednej funkcji spawn_pair.",
      "Sprawdzisz rozdzielność zadań przez ich identyfikatory, nie przez kolejność logów.",
      "Utworzysz Future przez fabrykę działającą w dziecku, nie w funkcji wywołującej.",
    ],
    steps: [
      choose(
        "tokio-spawn-join-predict",
        "predict",
        "Co jest kontraktem po spawn?",
        '`spawn_pair(async { "left" }, async { "right" })` zwraca dwa uchwyty. Co wolno później obiecać bez obserwacji konkretnego schedulera?',
        0,
        [
          "Każdy uchwyt jest Future wyniku swojego dziecka; można porównać tożsamości zadań, lecz nie kolejność ich ukończenia.",
          "Lewe zadanie zawsze skończy przed prawym, bo pierwszy argument jest zapisany wcześniej.",
          "Uchwyty są tylko Future bez uruchomionej pracy, więc przed await nic nie istnieje.",
        ],
        [
          "To sprawdzalny kontrakt: spawn tworzy zadania, a identyfikator zadania nie wymaga twierdzenia o kolejności.",
          "Kolejność wywołania spawn nie jest obietnicą kolejności ukończenia zadań.",
          "spawn przekazuje Future runtime; JoinHandle obserwuje niezależne dziecko.",
        ],
      ),
      tokioRun(
        "tokio-spawn-join-run",
        "Odbierz dwa wyniki w swojej kolejności",
        "Kod awaituje najpierw lewy uchwyt, potem prawy. Stabilny tekst opisuje tę kolejność odbioru, a nie kolejność wykonania dzieci.",
        spawnRun,
        "left=left right=right\n",
      ),
      choose(
        "tokio-spawn-join-factory",
        "explain",
        "Gdzie wykona się fabryka?",
        "`spawn_factory` ma przyjąć FnOnce tworzące Future. Jeśli fabryka zapisuje `tokio::task::id()`, a ciało zwróconego Future zapisuje drugi identyfikator, jaki kontrakt ma spełnić poprawna implementacja?",
        1,
        [
          "Fabryka ma działać w funkcji wywołującej, a tylko ciało Future w zadaniu dziecka.",
          "Fabryka i ciało Future mają działać w tym samym zadaniu potomnym, więc ich identyfikatory zadań są równe.",
          "Id muszą się różnić, bo każda instrukcja async tworzy nowe zadanie.",
        ],
        [
          "Takie wykonanie fabryki przed spawn ponownie wprowadza zależność od kontekstu wywołującego i nie realizuje kontraktu.",
          "Fabrykę trzeba przenieść do async move przekazanego do spawn i tam awaitować zwrócony Future.",
          "Identyfikator zadania opisuje task, nie pojedyncze wyrażenie w jego Future.",
        ],
      ),
      tokioExercise({
        id: "tokio-spawn-join-pair-gate",
        kind: "modify",
        title: "Uruchom dwa niezależne zadania",
        prompt:
          "Uzupełnij `spawn_pair`, aby zwracał dwa JoinHandle utworzone przez Tokio. Zachowaj podane granice Send + 'static dla obu Future i Output. Ukryte testy odczytują `tokio::task::id()` wewnątrz dzieci oraz odbierają dwa różne wyniki bez Copy; nie udowadniają współbieżności kolejnością, sleep ani yield.",
        code: spawnPairStarter,
        solution: spawnPairSolution,
        tests: spawnPairTests,
        hints: [
          "Wywołaj tokio::spawn osobno dla first i second, a oba JoinHandle zwróć w tej samej parze.",
          "Nie awaituj uchwytów w tej funkcji: kod wywołujący ma zachować odpowiedzialność za ich wyniki.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-spawn-join-blank",
        kind: "blank",
        title: "Od pustej kartki: fabryka wewnątrz dziecka",
        prompt:
          "Od pustej kartki zaprojektuj `spawn_factory`: przyjmuje Send + 'static FnOnce tworzącą Send + 'static Future z Send + 'static Output i zwraca JoinHandle tego Output. Kontrakt: fabryka oraz ciało utworzonego Future muszą działać w tym samym zadaniu potomnym, nie w funkcji wywołującej. Test porównuje ich identyfikatory, sprawdza odrębność od innego zadania i obserwuje DropProbe należący do dziecka.",
        solution: spawnFactorySolution,
        tests: spawnFactoryTests,
        hints: [
          "Zewnętrzny wynik ma typ JoinHandle<T>, więc tokio::spawn musi otrzymać Future kończący się T.",
          "`async move { factory().await }` przenosi fabrykę do dziecka; samo `tokio::spawn(factory())` uruchomiłoby fabrykę w funkcji wywołującej.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Kolejność argumentów spawn jest kolejnością ukończenia zadań.",
      "JoinHandle jest zwykłym Future i nie reprezentuje uruchomionej pracy.",
      "Fabryka Future przekazana do helpera spawn zawsze działa w dziecku.",
    ],
    transferTask:
      "Masz dwa niezależne obliczenia i potrzebujesz ich wartości. Zapisz, kto będzie właścicielem obu JoinHandle, jak odbierze wyniki oraz jak test sprawdzi rozdzielność zadań bez ustalania ich kolejności.",
    evidenceGate:
      "tokio-spawn-join-pair-gate sprawdza dwa rzeczywiste identyfikatory zadań i dwa wyniki, a tokio-spawn-join-blank sprawdza osobno kontekst fabryki, ciało zadania potomnego oraz cykl życia przeniesionego zasobu.",
    sourceIds: ["tokio-spawn", "tokio-join-handle", "tokio-task-id"],
  },
  {
    id: "tokio-task-boundaries",
    moduleId: "tokio-runtime-tasks",
    conceptIds: ["tokio-task-boundaries"],
    competencyIds: ["respect-task-boundaries"],
    prerequisites: ["tokio-spawn-join"],
    title: "Granice Send i 'static w tasku",
    subtitle:
      "Naprawisz pożyczkę i !Send na granicy spawn, zachowując prawdziwą własność danych w dziecku.",
    minutes: 26,
    outcomes: [
      "Rozpoznasz E0373 dla pożyczonego lokalnego String oraz bezkodową diagnostykę Send dla Rc<Cell<_>> przechowywanego przez await.",
      "Przeniesiesz generyczną wartość i konsumenta FnOnce do zadania potomnego bez przedwczesnego Drop.",
      "Użyjesz Arc dla wspólnej migawki, zachowując tożsamość alokacji i granice Send + Sync.",
    ],
    steps: [
      tokioError(
        "tokio-task-boundaries-borrow-error",
        "Obserwuj E0373: pożyczka nie może przeżyć stosu",
        "Ten async block pożycza `label`, lecz tokio::spawn może pozostawić zadanie po powrocie z funkcji. Odczytaj E0373; właściwa naprawa w następnym ćwiczeniu przeniesie dane do dziecka, zamiast wydłużać pożyczkę.",
        e0373,
        e0373Solution,
        { code: "E0373" },
      ),
      tokioError(
        "tokio-task-boundaries-send-error",
        "Obserwuj diagnostykę Send: Rc przez await nie przejdzie spawn",
        "Rc jest tworzony wewnątrz async block i używany dopiero po punkcie pending, więc pozostaje częścią stanu Future przez await, a tokio::spawn wymaga Send. Kod nie jest uruchamiany. Kompilator zgłasza komunikat `future cannot be sent between threads safely` bez numeru E. Odczytaj, która wartość przechowywana przez await uniemożliwia przekazanie Future do spawn.",
        sendBoundaryError,
        sendBoundarySolution,
        { diagnostic: "future cannot be sent between threads safely" },
      ),
      choose(
        "tokio-task-boundaries-explain",
        "explain",
        "Która zmiana odpowiada na właściwą granicę?",
        "Chcesz przekazać dane do `tokio::spawn`. Które zdanie jest precyzyjne?",
        2,
        [
          "Dodaj 'static do referencji &str; to automatycznie przedłuży życie String.",
          "Zamień każdy Rc na Arc; wtedy każde Future, także pożyczone, spełni wszystkie wymagania.",
          "Przenieś posiadane dane do async move; dla współdzielonego stanu użyj Arc tylko wtedy, gdy jego T jest Send + Sync.",
        ],
        [
          "Adnotacja lifetime nie tworzy dłuższego właściciela danych.",
          "Arc rozwiązuje współdzieloną własność, lecz nie naprawia przypadkowego borrow ani !Send wnętrza.",
          "Dziecko musi mieć własność lub bezpieczny współdzielony uchwyt; granice wynikają z konkretnego API spawn.",
        ],
      ),
      tokioExercise({
        id: "tokio-task-boundaries-owned-gate",
        kind: "modify",
        title: "Przenieś posiadaną wartość i konsumenta do dziecka",
        prompt:
          "Uzupełnij `spawn_consume<T, U, F>`. Ma przenieść posiadaną wartość i konsumenta FnOnce do jednego zadania Tokio, wywołać konsumenta dopiero w zadaniu potomnym i zwrócić JoinHandle<U>. Zachowaj podane granice. Test bieżącego current-thread runtime sprawdza, że spawn nie odpytuje zadania synchronicznie, konsument wykonuje się raz w zadaniu potomnym, DropProbe ma prawidłowy cykl życia, a wynik nie musi implementować Copy.",
        code: spawnConsumeStarter,
        solution: spawnConsumeSolution,
        tests: spawnConsumeTests,
        hints: [
          "Oba argumenty przenieś do `async move`; wtedy kod wywołujący nie zostawia krótkiej pożyczki w dziecku.",
          "Konsument jest synchroniczny, więc ciało zadania może zakończyć się wywołaniem `consumer(value)` bez dodatkowego await.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-task-boundaries-blank",
        kind: "blank",
        title: "Od pustej kartki: współdzielona migawka Arc",
        prompt:
          "Od pustej kartki zaprojektuj `spawn_shared_snapshot`: przyjmuje Arc<T> i jednorazową funkcję renderującą, zwracając JoinHandle wyniku renderowania. T musi spełniać Send + Sync + 'static, wynik i funkcja renderująca Send + 'static; funkcja renderująca dostaje posiadany uchwyt Arc w zadaniu potomnym. Nie kopiuj T ani nie zamieniaj Arc w surowy wskaźnik. Test obserwuje strong_count przed pierwszym odpytaniem dziecka, tę samą tożsamość Arc w dziecku, efekt renderowania po wykonaniu oraz odrębny identyfikator zadania względem zadania równoległego.",
        solution: spawnSharedSolution,
        tests: spawnSharedTests,
        hints: [
          "Arc<T> jest już posiadanym uchwytem; przenieś go przez async move, a renderowanie wywołaj dopiero w ciele zadania.",
          "Granica Sync dotyczy T, bo Arc może udostępniać referencję do tej samej wartości wielu wykonawcom.",
        ],
        forbiddenPatterns: ["as *", "std::mem::forget", "unsafe"],
        gate: true,
      }),
    ],
    misconceptions: [
      "'static oznacza, że String musi być globalny.",
      "async move usuwa automatycznie wymaganie Send.",
      "Arc jest zamiennikiem każdej pożyczki albo każde Arc<T> może przekroczyć granicę zadania.",
      "spawn musi odpytać zadanie przed zwróceniem JoinHandle.",
    ],
    transferTask:
      "Dostajesz parser z lokalnym Rc<Cell<_>> i osobny String z żądaniem, który ma obsłużyć zadanie potomne. Rozdziel, co zostaje lokalne, co należy przenieść oraz kiedy właściwy jest Arc zamiast klonowania lub pożyczki.",
    evidenceGate:
      "tokio-task-boundaries-owned-gate obserwuje brak synchronicznego odpytania, jednorazowego konsumenta i DropProbe w zadaniu potomnym, a tokio-task-boundaries-blank obserwuje własność Arc przed pracą dziecka, identyczną alokację oraz zwolnienie uchwytu po wyniku.",
    sourceIds: ["tokio-spawn", "tokio-task-id", "tokio-join-handle"],
  },
  {
    id: "tokio-join-outcomes",
    moduleId: "tokio-runtime-tasks",
    conceptIds: ["tokio-join-outcomes"],
    competencyIds: ["account-for-join-outcomes"],
    prerequisites: ["tokio-task-boundaries"],
    title: "Wyniki JoinHandle i odłączone zadania",
    subtitle:
      "Zachowasz sukces i JoinError każdego zadania, a Drop uchwytu udowodnisz przez jawne potwierdzenie zakończenia.",
    minutes: 27,
    outcomes: [
      "Zwrócisz oba Result z join_pair nawet po anulowaniu pierwszego zadania.",
      "Zbierzesz opisane sukcesy i błędy bez porzucania późniejszych uchwytów.",
      "Odróżnisz Drop JoinHandle od abort przez jawny sygnał oneshot.",
    ],
    steps: [
      choose(
        "tokio-join-outcomes-predict",
        "predict",
        "Co powinien zwrócić join_pair?",
        "Pierwszy handle kończy się JoinError anulowania, a drugi zwraca String. Jaki kontrakt jest potrzebny, aby pierwszy błąd nie zasłonił drugiego wyniku?",
        1,
        [
          "Zakończ funkcję przy pierwszym JoinError, bo drugie zadanie nie ma już znaczenia.",
          "Awaituj oba handle i zwróć parę Result, aby kod wywołujący zobaczył oba wyniki.",
          "Abortuj drugie zadanie po pierwszym JoinError, aby odzyskać zasoby szybciej.",
        ],
        [
          "To gubi własność wyniku drugiego zadania i łamie kontrakt tego helpera.",
          "Dopiero kod wywołujący może świadomie zdecydować, jak zinterpretować każdy sukces, cancel lub panic.",
          "Abort jest osobną polityką; nie wynika z faktu, że inny JoinHandle zwrócił błąd.",
        ],
      ),
      tokioRun(
        "tokio-join-outcomes-run",
        "Joinuje dwa sukcesy",
        "Ten przykład ma dwa natychmiastowe sukcesy, więc wynik jest prosty. Kolejność `left`, `right` opisuje kolejność odbioru JoinHandle, nie harmonogram dzieci.",
        joinRun,
        "left=alpha right=beta\n",
      ),
      choose(
        "tokio-join-outcomes-detach",
        "explain",
        "Co potwierdza oneshot po Drop?",
        "Zadanie wysyła `started`, czeka na `release`, a potem wysyła `finished`. Kod wywołujący odbiera started, robi drop(handle), wysyła release i odbiera finished. Co to dowodzi?",
        0,
        [
          "Drop JoinHandle odłączył uchwyt, lecz rozpoczęte zadanie dalej wykonało kontrolowane zakończenie.",
          "Drop JoinHandle anulował task, a oneshot sam odtworzył jego wynik.",
          "Zadanie na pewno wykonywało się równolegle z funkcją wywołującą przez określony czas.",
        ],
        [
          "Kanały wyznaczają zdarzenia bez sleep, limitu yield ani założenia o czasie planowania.",
          "Gdyby zadanie zostało przerwane przez abort, Sender finished zostałby upuszczony, a Receiver dałby błąd zamiast wiadomości.",
          "Test nie mierzy czasu ani równoległości; obserwuje tylko własność uchwytu i jawnie uwolnione zdarzenie.",
        ],
      ),
      tokioExercise({
        id: "tokio-join-outcomes-pair-gate",
        kind: "modify",
        title: "Zachowaj oba wyniki zadań",
        prompt:
          "Napraw `join_pair`. Ma awaitować lewy i prawy JoinHandle oraz zwrócić `(Result<T, JoinError>, Result<U, JoinError>)`. Nie abortuj żadnego zadania i nie używaj `?`: JoinError pierwszego musi zostać zwrócony razem z wynikiem drugiego. Zachowaj każdy rzeczywisty JoinError, również po panice jednego lub obu zadań. Wyniki nie muszą implementować Copy.",
        code: joinPairStarter,
        solution: joinPairSolution,
        tests: joinPairTests,
        hints: [
          "Przypisz lub zwróć osobno `left.await` i `right.await`; oba mają już właściwy typ Result.",
          "Nie stosuj `?`, bo wynik funkcji ma zachować JoinError zamiast kończyć await drugiego uchwytu.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-join-outcomes-blank",
        kind: "blank",
        title: "Od pustej kartki: zbierz opisane wyniki",
        prompt:
          "Od pustej kartki zaprojektuj typ `Collected<T>` z polami `values` typu `Vec<(String, T)>` i `failures` typu `Vec<(String, JoinError)>`, a także asynchroniczny helper `collect_labeled` przyjmujący Vec par etykieta–JoinHandle. Każdy sukces ma zachować etykietę i T, a każda porażka etykietę i rzeczywisty JoinError. Helper awaituje wszystkie uchwyty, nie anuluje pozostałych po błędzie i zachowuje kolejność wejścia wewnątrz obu partycji. Test anuluje jedno zadanie przed zebraniem, potem sprawdza sukcesy i JoinError kolejnych zadań.",
        solution: collectLabeledSolution,
        tests: collectLabeledTests,
        hints: [
          "Iteruj po wartości Vec, aby przejąć label i JoinHandle; `match handle.await` rozdziela Ok oraz Err.",
          "Dwa wektory Vec zachowują dane dla kodu wywołującego. Nie używaj `?`, bo wtedy nie awaitujesz uchwytów po pierwszej porażce.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Pierwszy JoinError zwalnia z awaitowania innych JoinHandle.",
      "Drop JoinHandle anuluje task tak jak abort.",
      "Sleep albo timeout dowodzą, że odłączone zadanie ukończyło pracę.",
      "JoinHandle::await zwraca zawsze bezpośredni Output dziecka.",
    ],
    transferTask:
      "W pipeline masz trzy opisane zadania i jeden jest anulowany przez świadomą politykę. Zaprojektuj typ wyniku zachowujący label, sukcesy i JoinError wszystkich zadań; osobno opisz, kiedy celowo odłączasz handle oraz jak potwierdzasz późniejsze zakończenie bez zegara.",
    evidenceGate:
      "tokio-join-outcomes-pair-gate sprawdza, że pierwszy JoinError nie ukrywa drugiego wyniku, a tokio-join-outcomes-blank zachowuje identyfikatory i pełne JoinError dla całej kolekcji bez przedwczesnego zakończenia.",
    sourceIds: ["tokio-join-handle", "tokio-spawn", "tokio-oneshot"],
  },
];

export const tokioRuntimeReviewExercises: Record<string, LessonStep> = {
  "tokio-runtime-entry": tokioExercise({
    id: "review-tokio-runtime-entry",
    kind: "apply",
    title: "Powtórka: przekaż wynik przez dwa lokalne Future",
    prompt:
      "Uzupełnij `run_local_then`. Ma zbudować current-thread runtime, wykonać pierwszy lokalny Future, przekazać jego Output do jednorazowej fabryki następnego Future i awaitować ten drugi etap. Test pożycza String, używa Rc<Cell<_>>, obserwuje bieżący Handle w pierwszym ciele Future, fabryce i drugim ciele Future, a także awaituje zadanie potomne. To inny kontrakt niż `run_local_factory`: pierwszy Future istnieje przed wejściem do helpera, lecz fabryka następnego Future powstaje podczas działania runtime.",
    code: runtimeReviewStarter,
    solution: runtimeReviewSolution,
    tests: runtimeReviewTests,
    hints: [
      "Zbuduj current-thread Runtime i w jednym async block najpierw awaituj first.",
      "Wywołaj `next` dopiero z Output `first`, a potem awaituj zwrócony `Second`; oba etapy pozostają lokalne.",
    ],
  }),
  "tokio-spawn-join": tokioExercise({
    id: "review-tokio-spawn-join",
    kind: "apply",
    title: "Powtórka: zwróć etykietę z identyfikatora zadania dziecka",
    prompt:
      "Uzupełnij `spawn_labeled`. Ma przenieść String do pojedynczego zadania potomnego utworzonego przez spawn i zwrócić JoinHandle z parą `(tokio::task::Id, String)`. Nie twórz identyfikatora zadania w funkcji wywołującej; test porównuje wynik z identyfikatorem innego zadania.",
    code: spawnReviewStarter,
    solution: spawnReviewSolution,
    tests: spawnReviewTests,
    hints: [
      "Przenieś label przez async move do tokio::spawn.",
      "`tokio::task::id()` wywołaj w ciele zadania razem ze zwracaną etykietą.",
    ],
  }),
  "tokio-task-boundaries": tokioExercise({
    id: "review-tokio-task-boundaries",
    kind: "apply",
    title: "Powtórka: pożycz migawkę dopiero w dziecku",
    prompt:
      "Uzupełnij `spawn_observe_owned`. Ma przenieść T i FnOnce(&T) do zadania, wywołać funkcję obserwującą na krótkiej referencji do T wyłącznie wewnątrz zadania potomnego, potem zwrócić to samo posiadane T. Test używa DropProbe, licznika i identyfikatora zadania: wartość nie może zostać zwolniona przed zwrotem JoinHandle, a obserwacja ma zajść raz w dziecku.",
    code: boundaryReviewStarter,
    solution: boundaryReviewSolution,
    tests: boundaryReviewTests,
    hints: [
      "Async move ma posiadać wartość oraz `observe`; utwórz `&value` dopiero wewnątrz ciała zadania.",
      "Po obserwacji zwróć `value`, aby kod wywołujący znów był jego właścicielem po await JoinHandle.",
    ],
  }),
  "tokio-join-outcomes": tokioExercise({
    id: "review-tokio-join-outcomes",
    kind: "apply",
    title: "Powtórka: odłącz uchwyt i potwierdź zakończenie",
    prompt:
      "Uzupełnij `detach_and_confirm`. Zadanie jest już uruchomione i zatrzymało się po wysłaniu `started`; funkcja dostaje jego JoinHandle, Sender `release` i Receiver `finished`. Najpierw odłącz uchwyt przez drop, potem wyślij `release` i awaituj `finished`. Jeśli ktoś użyje abort zamiast drop, Sender `finished` zostanie upuszczony i Receiver da błąd bez czekania na zegar. Nie używaj sleep, timeout, yield ani mem::forget.",
    code: detachReviewStarter,
    solution: detachReviewSolution,
    tests: detachReviewTests,
    hints: [
      "`drop(handle)` niszczy tylko uchwyt; zadanie może nadal posiadać Sender finished.",
      "Po drop wyślij release i zwróć wiadomość odebraną przez `finished.await.unwrap()`.",
    ],
    forbiddenPatterns: [".abort()", "mem::forget", "std::mem::forget"],
  }),
};

export const tokioRuntimeModule: CourseModule = {
  id: "tokio-runtime-tasks",
  title: "Tokio: runtime i odpowiedzialność za zadania",
  whyItMatters:
    "Po zrozumieniu Future trzeba świadomie wybrać executor i właściciela niezależnej pracy. Ten moduł ustanawia granicę między lokalnym Future uruchamianym przez current-thread runtime, zadaniem Tokio wymagającym Send + 'static oraz wynikiem JoinHandle, zanim kurs przejdzie do kanałów, timeoutów, select i graceful shutdown.",
  capabilities: [
    "Budujesz current-thread Runtime, wykonujesz lokalny Future i rozumiesz, kiedy Future trzeba skonstruować w kontekście runtime.",
    "Uruchamiasz niezależne zadania, zachowujesz ich JoinHandle oraz testujesz ich tożsamość bez kontraktu kolejności schedulera.",
    "Projektujesz granice Send/'static dla posiadanych i współdzielonych danych oraz odbierasz lub świadomie odłączasz każdy JoinHandle.",
  ],
  prerequisites: ["async-foundations"],
  lessonIds: tokioRuntimeLessons.map((lesson) => lesson.id),
  exitGate: [
    "Current-thread Runtime może wykonać lokalny Future !Send i pożyczkę, ale fabrykę zależną od Handle trzeba utworzyć w runtime.enter().",
    "tokio::spawn tworzy niezależne zadanie z granicami Send + 'static; identyfikator zadania dowodzi jego tożsamości bez założeń o kolejności wykonania.",
    "String przeniesiony do async move daje dziecku własność, Arc dzieli własność przy Send + Sync, a Rc<Cell<_>> pozostaje lokalne.",
    "Każdy JoinHandle ma wynik; JoinError jednego nie ukrywa pozostałych, a Drop handle odłącza zadanie zamiast go anulować.",
  ],
  projectConnection:
    "Następny etap doda kanały bounded, backpressure, timeout/select oraz graceful shutdown. Będzie opierał się na tych samych decyzjach: gdzie działa Future, kto posiada zadanie, jak przekazywane są dane przez granicę spawn i kto odbiera każdy wynik.",
  assessmentId: "tokio-join-outcomes/tokio-join-outcomes-blank",
  gateCriteria: [
    {
      id: "tokio-runtime-entry-gate",
      label:
        "Lokalny Future działa w current-thread runtime, a fabryka zależna od Handle powstaje po enter bez wprowadzania niepotrzebnych granic Send/'static.",
      taskRefs: [
        {
          lessonId: "tokio-runtime-entry",
          stepId: "tokio-runtime-entry-local-gate",
        },
        {
          lessonId: "tokio-runtime-entry",
          stepId: "tokio-runtime-entry-blank",
        },
      ],
    },
    {
      id: "tokio-spawn-join-gate",
      label:
        "Dwa wywołania spawn tworzą odrębne zadania, a fabryka Future pracuje wewnątrz właściwego dziecka z zachowaniem przeniesionego zasobu.",
      taskRefs: [
        { lessonId: "tokio-spawn-join", stepId: "tokio-spawn-join-pair-gate" },
        { lessonId: "tokio-spawn-join", stepId: "tokio-spawn-join-blank" },
      ],
    },
    {
      id: "tokio-task-boundaries-gate",
      label:
        "Dane przekraczają spawn przez posiadaną wartość lub Arc z poprawnymi granicami, a test obserwuje własność i zadanie potomne bez schedulera.",
      taskRefs: [
        {
          lessonId: "tokio-task-boundaries",
          stepId: "tokio-task-boundaries-owned-gate",
        },
        {
          lessonId: "tokio-task-boundaries",
          stepId: "tokio-task-boundaries-blank",
        },
      ],
    },
    {
      id: "tokio-join-outcomes-gate",
      label:
        "JoinError nie ukrywa drugiego wyniku, a zebrana kolekcja zachowuje opisane sukcesy i błędy każdego uchwytu.",
      taskRefs: [
        {
          lessonId: "tokio-join-outcomes",
          stepId: "tokio-join-outcomes-pair-gate",
        },
        {
          lessonId: "tokio-join-outcomes",
          stepId: "tokio-join-outcomes-blank",
        },
      ],
    },
  ],
};
