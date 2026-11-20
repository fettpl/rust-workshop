import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const threadsSources: Source[] = [
  {
    id: "threads-book-spawn-join",
    title:
      "The Rust Programming Language: Using Threads to Run Code Simultaneously",
    url: "https://doc.rust-lang.org/book/ch16-01-threads.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów thread::spawn, JoinHandle, join lub własności zamykanej przez wątek.",
  },
  {
    id: "threads-std-module",
    title: "Rust standard library: std::thread",
    url: "https://doc.rust-lang.org/std/thread/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu spawn, ThreadId, Result lub ograniczeń F: Send + 'static.",
  },
  {
    id: "threads-std-join-handle",
    title: "Rust standard library: JoinHandle",
    url: "https://doc.rust-lang.org/std/thread/struct.JoinHandle.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie zachowania join albo skutków drop uchwytu.",
  },
  {
    id: "threads-error-e0373",
    title: "Rust Error Index: E0373",
    url: "https://doc.rust-lang.org/error_codes/E0373.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty komunikat rustc, gdy przykład pożyczki w thread::spawn ulegnie zmianie.",
  },
  {
    id: "threads-error-e0382",
    title: "Rust Error Index: E0382",
    url: "https://doc.rust-lang.org/error_codes/E0382.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty komunikat rustc, gdy przykład użycia wartości po move ulegnie zmianie.",
  },
  {
    id: "threads-std-scope",
    title: "Rust standard library: thread::scope",
    url: "https://doc.rust-lang.org/std/thread/fn.scope.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie gwarancji końca scope, pożyczania danych i automatycznego join.",
  },
  {
    id: "threads-std-scope-type",
    title: "Rust standard library: Scope",
    url: "https://doc.rust-lang.org/std/thread/struct.Scope.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisu Scope::spawn i zachowania ScopedJoinHandle::join.",
  },
];

export const threadsCompetencies: Competency[] = [
  {
    id: "join-thread-results",
    title:
      "Uruchamiasz ograniczoną liczbę wątków, zachowujesz JoinHandle i jawnie łączysz wszystkie wyniki oraz paniki.",
  },
  {
    id: "move-owned-thread-data",
    title:
      "Rozpoznajesz, kiedy thread::spawn wymaga move, i śledzisz przeniesienie własności bez użycia wartości po move.",
  },
  {
    id: "borrow-with-scoped-threads",
    title:
      "Używasz thread::scope, aby pożyczyć dane nie-'static bez klonowania i zakończyć pracę przed wyjściem ze scope.",
  },
];

export const threadsConcepts: Concept[] = [
  {
    id: "thread-join",
    title: "JoinHandle jest jedynym uchwytem pozwalającym dołączyć wątek",
    prerequisites: ["weak-links"],
    competencyIds: ["join-thread-results"],
    reviewPrompt:
      "Co daje wartość zwrócona przez `thread::spawn`, co zwraca `join`, i jak zachowasz wszystkie JoinHandle, gdy jeden wątek zwróci błąd?",
    reviewAnswer:
      "spawn zwraca JoinHandle<T>, którego join czeka na zakończenie i daje thread::Result<T>: Ok z wartością albo Err z payloadem paniki. Uchwyty trzeba zebrać i przejść wszystkie w pętli, zapisując błąd zamiast wracać wcześnie, aby pozostałe dzieci także zostały połączone.",
    distinguish:
      "Samo wywołanie spawn nie gwarantuje obserwacji wyniku, a drop JoinHandle odłącza wątek. join jest oczekiwaniem i wynikiem, nie gwarancją kolejności wykonywania. Zebranie i uporządkowanie wyników przed wypisaniem pozwala uzyskać stały stdout mimo różnej kolejności pracy dzieci.",
  },
  {
    id: "thread-move",
    title: "move przekazuje własność danych do zamknięcia wątku",
    prerequisites: ["thread-join"],
    competencyIds: ["move-owned-thread-data"],
    reviewPrompt:
      "Dlaczego `thread::spawn(|| text.len())` może dać E0373, a po `move` użycie `text` po spawn może dać E0382?",
    reviewAnswer:
      "Zwykłe zamknięcie próbuje pożyczyć lokalne text, lecz niezależny wątek wymaga domknięcia bez pożyczki krótszej niż 'static, więc pojawia się E0373. move przenosi text do zamknięcia; poprzednia nazwa traci własność i użycie jej później daje E0382. Wynik można odzyskać przez join.",
    distinguish:
      "move nie uruchamia wątku i nie klonuje danych: zmienia sposób przechwycenia wartości. Dla Copy przeniesienie może wyglądać jak kopia, lecz String i Vec przekazują własność. Zwykły spawn może przejąć również referencję static; scope dopuszcza pożyczki o krótszym czasie życia. Samo move nie wydłuża ważności referencji.",
  },
  {
    id: "scoped-threads",
    title: "thread::scope kończy wątki przed zwrotem pożyczanych danych",
    prerequisites: ["thread-move"],
    competencyIds: ["borrow-with-scoped-threads"],
    reviewPrompt:
      "W jaki sposób `thread::scope` pozwala wątkowi czytać `&[String]`, którego nie klonujemy, i kiedy można bezpiecznie użyć kolekcji po scope?",
    reviewAnswer:
      "scope wyznacza zakres, w którym każde scoped spawn może pożyczać dane żyjące co najmniej tak długo jak scope. Gdy scope wraca, wątki są zakończone; jawne join pozwala obsłużyć ich wynik lub panikę. Po tym punkcie można odzyskać wyłączny lub mutowalny dostęp do kolekcji, podczas gdy zwykłe współdzielenie odczytu może trwać zgodnie z regułami pożyczania.",
    distinguish:
      "thread::scope nie czyni zwykłego spawn bezpiecznym i nie jest mechanizmem współdzielenia mutowalnego stanu bez reguł pożyczania. Jego gwarancja czasu życia zastępuje wymóg 'static, a nie zasady Send ani synchronizację.",
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

function compilerError(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  error: string,
): LessonStep {
  return {
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
  };
}

function coding(options: {
  id: string;
  kind: "modify" | "apply" | "debug" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined
      ? {}
      : { code: options.code, expectedStatus: "success" as const }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const joinPredictCode = `use std::thread;

fn main() {
    let handle = thread::spawn(|| 2 + 3);
    let result = handle.join().expect("dziecko zakończyło się paniką");
    println!("{}", result);
}`;

const joinRunCode = `use std::thread;

fn main() {
    let first = thread::spawn(|| String::from("pierwszy"));
    let second = thread::spawn(|| String::from("drugi"));
    let mut results = vec![first.join().unwrap(), second.join().unwrap()];
    results.sort();
    println!("{}|{}", results[0], results[1]);
}`;

const panicRunCode = `use std::thread;

fn main() {
    let handle = thread::spawn(|| -> Result<&'static str, &'static str> {
        panic!("awaria dziecka");
    });
    match handle.join() {
        Ok(Ok(value)) => println!("ok: {}", value),
        Ok(Err(error)) => println!("błąd: {}", error),
        Err(_) => println!("panika obsłużona przez join"),
    }
}`;

const joinAllSolution = `use std::thread;

fn join_all_jobs(
    jobs: Vec<(
        u32,
        Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>,
    )>,
) -> (u32, Vec<thread::ThreadId>, usize) {
    let handles: Vec<_> = jobs
        .into_iter()
        .map(|(job, worker)| {
            thread::spawn(move || {
                let id = thread::current().id();
                (id, worker(job, id))
            })
        })
        .collect();
    let mut total = 0;
    let mut ids = Vec::new();
    let mut failures = 0;
    for handle in handles {
        ids.push(handle.thread().id());
        match handle.join() {
            Ok((_, Ok(value))) => total += value,
            Ok((_, Err(_))) | Err(_) => failures += 1,
        }
    }
    (total, ids, failures)
}`;

const joinAllStarter = `use std::thread;

fn join_all_jobs(
    jobs: Vec<(
        u32,
        Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>,
    )>,
) -> (u32, Vec<thread::ThreadId>, usize) {
    let _ = jobs;
    (0, Vec::new(), 0)
}`;

const joinAllTests = `#[test]
fn panic_keeps_identity_and_does_not_discard_later_results() {
    let jobs = vec![
        (0, Box::new(|_, _| -> Result<u32, &'static str> { panic!("celowy błąd") }) as Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>),
        (7, Box::new(|value, _| Ok(value))),
        (9, Box::new(|value, _| Ok(value))),
    ];
    let (total, ids, failures) = join_all_jobs(jobs);
    assert_eq!(total, 16);
    assert_eq!(failures, 1);
    assert_eq!(ids.len(), 3);
    assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
    assert_eq!(join_all_jobs(Vec::new()), (0, Vec::new(), 0));
}

#[test]
fn joins_every_bounded_child_and_keeps_successes() {
    let parent = thread::current().id();
    let jobs = vec![
        (1, Box::new(move |value, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); Ok(value * 10_u32) }) as Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>),
        (2, Box::new(move |_, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); Err("wadliwe zadanie") })),
        (3, Box::new(move |value, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); Ok(value * 10) })),
    ];
    let (total, ids, failures) = join_all_jobs(jobs);
    assert_eq!(total, 40);
    assert_eq!(ids.len(), 3);
    assert_eq!(failures, 1);
    assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
}

#[test]
fn the_error_does_not_short_circuit_later_joins() {
    let jobs = vec![
        (10, Box::new(|_, id| { assert_eq!(id, thread::current().id()); Err("pierwszy błąd") }) as Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>),
        (20, Box::new(|value, id| { assert_eq!(id, thread::current().id()); Ok(value) })),
        (30, Box::new(|value, id| { assert_eq!(id, thread::current().id()); Ok(value) })),
    ];
    let (total, ids, failures) = join_all_jobs(jobs);
    assert_eq!(total, 50);
    assert_eq!(ids.len(), 3);
    assert_eq!(failures, 1);
}

#[test]
fn all_jobs_report_ids_in_input_order_even_for_panicking_jobs() {
    let (sender, receiver) = std::sync::mpsc::channel();
    let jobs = (0..3).map(|position| {
        let sender = sender.clone();
        (position, Box::new(move |value, id| {
            assert_eq!(id, thread::current().id());
            sender.send((value, id)).unwrap();
            if value == 1_u32 { panic!("controlled panic"); }
            Ok(value + 1_u32)
        }) as Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>)
    }).collect();
    let (total, ids, failures) = join_all_jobs(jobs);
    let mut observed: Vec<_> = receiver.try_iter().collect();
    observed.sort_by_key(|(position, _)| *position);
    assert_eq!(observed.len(), 3);
    assert_eq!(ids, observed.into_iter().map(|(_, id)| id).collect::<Vec<_>>());
    assert_eq!((total, failures), (4, 1));
}`;

const joinAllBlankSolution = `use std::thread;

fn run_jobs(
    jobs: Vec<(u32, Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>)>,
) -> (u32, Vec<thread::ThreadId>) {
    let handles: Vec<_> = jobs
        .into_iter()
        .map(|(value, worker)| {
            thread::spawn(move || {
                let id = thread::current().id();
                (id, worker(value, id))
            })
        })
        .collect();
    let mut total = 0;
    let mut ids = Vec::new();
    let outcomes: Vec<_> = handles.into_iter().map(|handle| handle.join()).collect();
    for outcome in outcomes {
        let (id, value) = outcome.expect("panika po dołączeniu wszystkich dzieci");
        ids.push(id);
        total += value;
    }
    (total, ids)
}`;

const joinAllBlankTests = `#[test]
fn blank_api_joins_three_known_jobs() {
    let parent = thread::current().id();
    let jobs = vec![
        (2, Box::new(move |value, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); value * value }) as Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>),
        (4, Box::new(move |value, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); value * value })),
        (6, Box::new(move |value, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, parent); value * value })),
    ];
    let (total, ids) = run_jobs(jobs);
    assert_eq!(total, 56);
    assert_eq!(ids.len(), 3);
    assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
}

#[test]
fn blank_api_is_repeatable_for_bounded_work() {
    let jobs = vec![
        (3, Box::new(|value, _| value * value) as Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>),
        (5, Box::new(|value, _| value * value)),
    ];
    let (total, ids) = run_jobs(jobs);
    assert_eq!(total, 34);
    assert_eq!(ids.len(), 2);
}

#[test]
fn blank_api_reports_callback_ids_in_input_order_and_accepts_empty_jobs() {
    let (sender, receiver) = std::sync::mpsc::channel();
    let jobs = (0..3).map(|position| {
        let sender = sender.clone();
        (position, Box::new(move |value, id| {
            assert_eq!(id, thread::current().id());
            sender.send((value, id)).unwrap();
            value + 7_u32
        }) as Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>)
    }).collect();
    let (total, ids) = run_jobs(jobs);
    let mut observed: Vec<_> = receiver.try_iter().collect();
    observed.sort_by_key(|(position, _)| *position);
    assert_eq!(observed.len(), 3);
    assert_eq!(ids, observed.into_iter().map(|(_, id)| id).collect::<Vec<_>>());
    assert_eq!(total, 24);
    assert_eq!(run_jobs(Vec::new()), (0, Vec::new()));
}

#[test]
fn blank_api_joins_blocked_sibling_before_propagating_panic() {
    use std::sync::{Arc, atomic::{AtomicBool, Ordering}, mpsc};
    use std::time::Duration;
    let completed = Arc::new(AtomicBool::new(false));
    let child_completed = Arc::clone(&completed);
    let (panicking_tx, panicking_rx) = mpsc::channel();
    let (release_tx, release_rx) = mpsc::channel();
    let (returned_tx, returned_rx) = mpsc::channel();
    let coordinator = thread::spawn(move || {
        let jobs = vec![
            (0, Box::new(move |_, _| -> u32 {
                panicking_tx.send(()).unwrap();
                panic!("controlled panic");
            }) as Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>),
            (1, Box::new(move |_, _| {
                release_rx.recv().unwrap();
                child_completed.store(true, Ordering::SeqCst);
                9
            })),
        ];
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| run_jobs(jobs)));
        returned_tx.send((result.is_err(), completed.load(Ordering::SeqCst))).unwrap();
    });
    panicking_rx.recv_timeout(Duration::from_secs(2)).unwrap();
    // The sibling is held at an explicit gate. A return before release violates join.
    let early = returned_rx.recv_timeout(Duration::from_millis(100));
    release_tx.send(()).unwrap();
    let outcome = match early {
        Ok(value) => value,
        Err(mpsc::RecvTimeoutError::Timeout) => returned_rx.recv_timeout(Duration::from_secs(2)).unwrap(),
        Err(error) => panic!("coordinator channel: {error}"),
    };
    coordinator.join().unwrap();
    assert_eq!(outcome, (true, true), "panic must propagate after sibling completion");
}`;

const moveRunCode = `use std::thread;

fn main() {
    let message = String::from("własność");
    let handle = thread::spawn(move || message.len());
    println!("{}", handle.join().unwrap());
}`;

const moveBorrowError = `use std::thread;

fn main() {
    let text = String::from("pożyczka");
    let handle = thread::spawn(|| text.len());
    println!("{}", handle.join().unwrap());
}`;

const moveUseAfterError = `use std::thread;

fn main() {
    let text = String::from("przeniesione");
    let handle = thread::spawn(move || text.len());
    println!("{}", text);
    let _ = handle.join();
}`;

const moveBorrowSolution = moveBorrowError.replace(
  "thread::spawn(|| text.len())",
  "thread::spawn(move || text.len())",
);

const moveUseAfterSolution = `use std::thread;

fn main() {
    let text = String::from("przeniesione");
    let handle = thread::spawn(move || text.len());
    println!("{}", handle.join().unwrap());
}`;

const ownedLabelSolution = `use std::thread;

fn spawn_owned_label(
    label: String,
    worker: Box<dyn FnOnce(String, thread::ThreadId) -> String + Send>,
) -> (String, thread::ThreadId) {
    thread::spawn(move || {
        let id = thread::current().id();
        (worker(label, id), id)
    })
    .join()
    .expect("dziecko nie powinno panikować")
}`;

const ownedLabelStarter = `use std::thread;

fn spawn_owned_label(
    label: String,
    worker: Box<dyn FnOnce(String, thread::ThreadId) -> String + Send>,
) -> (String, thread::ThreadId) {
    let _ = (label, worker);
    (String::new(), thread::current().id())
}`;

const ownedLabelTests = `#[test]
fn moved_string_returns_owned_result() {
    let parent = thread::current().id();
    let expected_parent = parent.clone();
    let (result, child) = spawn_owned_label(
        String::from("hej"),
        Box::new(move |label, id| { assert_eq!(id, thread::current().id()); assert_ne!(id, expected_parent); format!("{}!", label) }),
    );
    assert_eq!(result, "hej!");
    assert_ne!(child, parent);
}

#[test]
fn moved_unicode_survives_join() {
    let parent = thread::current().id();
    let (result, child) = spawn_owned_label(
        String::from("Żółw"),
        Box::new(|label, id| { assert_eq!(id, thread::current().id()); label.to_uppercase() }),
    );
    assert_eq!(result, "ŻÓŁW");
    assert_ne!(child, parent);
}`;

const moveBlankSolution = `use std::thread;

fn move_and_join(
    words: Vec<String>,
    worker: Box<dyn FnOnce(Vec<String>, thread::ThreadId) -> usize + Send>,
) -> (usize, thread::ThreadId) {
    thread::spawn(move || {
        let id = thread::current().id();
        (worker(words, id), id)
    })
    .join()
    .expect("dziecko nie powinno panikować")
}`;

const moveBlankTests = `#[test]
fn blank_api_moves_non_copy_collection_once() {
    let words = vec![String::from("Rust"), String::from("wątek")];
    let parent = thread::current().id();
    let (total, child) = move_and_join(
        words,
        Box::new(|words, id| { assert_eq!(id, thread::current().id()); words.iter().map(String::len).sum() }),
    );
    assert_eq!(total, 10);
    assert_ne!(child, parent);
}

#[test]
fn blank_api_handles_empty_collection() {
    let (total, _) = move_and_join(Vec::new(), Box::new(|words, id| { assert_eq!(id, thread::current().id()); words.len() }));
    assert_eq!(total, 0);
}`;

const scopedPredictCode = `use std::thread;

fn main() {
    let labels = [String::from("A"), String::from("BB")];
    let total = thread::scope(|scope| {
        let left = scope.spawn(|| labels[0].len());
        let right = scope.spawn(|| labels[1].len());
        left.join().unwrap() + right.join().unwrap()
    });
    println!("{}", total);
}`;

const scopedRunCode = `use std::thread;

struct Label(String);

fn main() {
    let labels = [Label(String::from("kot")), Label(String::from("pies"))];
    let total = thread::scope(|scope| {
        let first = scope.spawn(|| labels[0].0.len());
        let second = scope.spawn(|| labels[1].0.len());
        first.join().unwrap() + second.join().unwrap()
    });
    println!("{}", total);
}`;

const scopedBorrowError = `use std::thread;

fn main() {
    let labels = [String::from("A")];
    let handle = thread::spawn(|| labels[0].len());
    let _ = handle.join();
}`;

const scopedBorrowSolution = `use std::thread;

fn main() {
    let labels = [String::from("A")];
    let length = thread::scope(|scope| scope.spawn(|| labels[0].len()).join().unwrap());
    println!("{}", length);
}`;

const borrowedPartsSolution = `use std::thread;

struct BorrowedLabel(String);

fn sum_borrowed_parts(
    items: &[BorrowedLabel],
    worker: &(dyn Fn(&[BorrowedLabel], thread::ThreadId) -> usize + Sync),
) -> (usize, Vec<thread::ThreadId>) {
    let (left, right) = items.split_at(items.len() / 2);
    thread::scope(|scope| {
        let left_sum = scope.spawn(|| {
            let id = thread::current().id();
            (worker(left, id), id)
        });
        let right_sum = scope.spawn(|| {
            let id = thread::current().id();
            (worker(right, id), id)
        });
        let (left_value, left_id) = left_sum.join().unwrap();
        let (right_value, right_id) = right_sum.join().unwrap();
        (left_value + right_value, vec![left_id, right_id])
    })
}`;

const borrowedPartsStarter = `use std::thread;

struct BorrowedLabel(String);

fn sum_borrowed_parts(
    items: &[BorrowedLabel],
    worker: &(dyn Fn(&[BorrowedLabel], thread::ThreadId) -> usize + Sync),
) -> (usize, Vec<thread::ThreadId>) {
    let _ = (items, worker);
    (0, Vec::new())
}`;

const borrowedPartsTests = `#[test]
fn borrows_original_slices_and_uses_the_supplied_callback() {
    let items = vec![BorrowedLabel("a".into()), BorrowedLabel("b".into()), BorrowedLabel("c".into())];
    let (total, ids) = sum_borrowed_parts(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        assert!((part.as_ptr() == items.as_ptr() && part.len() == 1)
            || (part.as_ptr() == items[1..].as_ptr() && part.len() == 2));
        part.len() * 5 + 1
    });
    assert_eq!(total, 17);
    assert_eq!(ids.len(), 2);
    assert_ne!(ids[0], ids[1]);
    let (total, ids) = sum_borrowed_parts(&[], &|part, _| part.len());
    assert_eq!(total, 0);
    assert_eq!(ids.len(), 2);
}

#[test]
fn scoped_workers_borrow_non_clone_items_without_copying() {
    let parent = thread::current().id();
    let expected_parent = parent.clone();
    let items = vec![
        BorrowedLabel(String::from("a")),
        BorrowedLabel(String::from("żółć")),
        BorrowedLabel(String::from("rust")),
        BorrowedLabel(String::from("wątek")),
    ];
    let (total, ids) = sum_borrowed_parts(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        assert_ne!(id, expected_parent);
        part.iter().map(|item| item.0.len()).sum()
    });
    assert_eq!(total, 19);
    assert_eq!(ids.len(), 2);
    assert!(ids.iter().all(|id| *id != parent));
    assert_eq!(items.len(), 4);
}

#[test]
fn scoped_workers_finish_before_caller_reuses_collection() {
    let mut items = vec![
        BorrowedLabel(String::from("x")),
        BorrowedLabel(String::from("yy")),
        BorrowedLabel(String::from("zzz")),
        BorrowedLabel(String::from("wwww")),
    ];
    let (total, ids) = sum_borrowed_parts(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        part.iter().map(|item| item.0.len()).sum()
    });
    assert_eq!(total, 10);
    assert_eq!(ids.len(), 2);
    items.push(BorrowedLabel(String::from("done")));
    assert_eq!(items.len(), 5);
}`;

const scopedBlankSolution = `use std::thread;

fn max_borrowed_len(
    items: &[String],
    worker: &(dyn Fn(&[String], thread::ThreadId) -> usize + Sync),
) -> (usize, Vec<thread::ThreadId>) {
    let (left, right) = items.split_at(items.len() / 2);
    thread::scope(|scope| {
        let left_max = scope.spawn(|| {
            let id = thread::current().id();
            (worker(left, id), id)
        });
        let right_max = scope.spawn(|| {
            let id = thread::current().id();
            (worker(right, id), id)
        });
        let (left_value, left_id) = left_max.join().unwrap();
        let (right_value, right_id) = right_max.join().unwrap();
        (left_value.max(right_value), vec![left_id, right_id])
    })
}`;

const scopedBlankTests = `#[test]
fn callback_observes_the_exact_original_halves() {
    let items = vec![String::from("A"), String::from("BB"), String::from("CCC")];
    let (maximum, ids) = max_borrowed_len(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        assert!((part.as_ptr() == items.as_ptr() && part.len() == 1)
            || (part.as_ptr() == items[1..].as_ptr() && part.len() == 2));
        part.len()
    });
    assert_eq!(maximum, 2);
    assert_eq!(ids.len(), 2);
    assert_ne!(ids[0], ids[1]);
}

#[test]
fn blank_api_borrows_string_slices_and_returns_maximum() {
    let items = vec![String::from("a"), String::from("cztery"), String::from("bb")];
    let parent = thread::current().id();
    let (maximum, ids) = max_borrowed_len(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        assert_ne!(id, parent);
        part.iter().map(String::len).max().unwrap_or(0)
    });
    assert_eq!(maximum, 6);
    assert_eq!(ids.len(), 2);
}

#[test]
fn blank_api_handles_empty_and_reuses_input() {
    let mut items: Vec<String> = Vec::new();
    let (maximum, ids) = max_borrowed_len(&items, &|part, id| {
        assert_eq!(id, thread::current().id());
        part.len()
    });
    assert_eq!(maximum, 0);
    assert_eq!(ids.len(), 2);
    items.push(String::from("po scope"));
    assert_eq!(items[0], "po scope");
}`;

export const threadsLessons: Lesson[] = [
  {
    id: "thread-join",
    moduleId: "threads",
    conceptIds: ["thread-join"],
    competencyIds: ["join-thread-results"],
    prerequisites: ["weak-links"],
    title: "spawn i join: doprowadź pracę do końca",
    subtitle:
      "Zachowaj JoinHandle, odbierz wynik i obsłuż panikę bez obiecywania kolejności schedulerowi.",
    minutes: 22,
    outcomes: [
      "Wyjaśnisz, dlaczego JoinHandle trzeba zachować, gdy wynik wątku ma znaczenie.",
      "Rozpoznasz Ok i Err zwracane przez join, także dla paniki dziecka.",
      "Połączysz wszystkie dzieci po ograniczonym zestawie zadań, nawet gdy jedno zawiedzie.",
    ],
    steps: [
      choose(
        "join-predict",
        "predict",
        "Przewidź wynik po join",
        "Kod tworzy jedno dziecko, od razu wywołuje join i dopiero potem drukuje wynik. Jaki dokładny wiersz zobaczysz?",
        1,
        [
          "nic, bo spawn nie uruchamia kodu",
          "5",
          "kolejność zależy od schedulera",
        ],
        [
          "spawn planuje pracę, a join może ją zakończyć i odebrać wynik.",
          "join czeka na dziecko, więc println! dostaje wartość 5 i drukuje dokładnie `5`.",
          "W tym programie wynik jest drukowany dopiero po join; scheduler nie zmienia tej wartości.",
        ],
        joinPredictCode,
      ),
      run(
        "join-run",
        "Uporządkuj dwa wyniki",
        "Uruchom kod. Dwa wątki mogą skończyć w dowolnej kolejności, dlatego program sortuje odebrane Stringi przed println!.",
        joinRunCode,
        "drugi|pierwszy\n",
      ),
      run(
        "join-panic-run",
        "Odczytaj panikę przez join",
        "Uruchom przykład. Nie przewiduj treści komunikatu panic na stderr; kontrakt ćwiczenia dotyczy stabilnej gałęzi Err zwróconej przez join.",
        panicRunCode,
        "panika obsłużona przez join\n",
      ),
      choose(
        "join-thread-id",
        "explain",
        "Sprawdź, że to osobny wątek",
        "Dlaczego pomocniczy test powinien porównać `ThreadId` rodzica i dziecka, zamiast wymagać konkretnego numeru identyfikatora?",
        2,
        [
          "Numer ThreadId zawsze wynosi 1 dla nowego wątku",
          "stdout z identyfikatorem jest zawsze taki sam na wszystkich systemach",
          "kontrakt to różne wykonujące się wątki, a sam numer jest przydzielany przez runtime",
        ],
        [
          "ThreadId nie ma takiej stałej gwarancji.",
          "Identyfikatory i ich reprezentacja nie są dobrym dokładnym stdout.",
          "Test tożsamości wątku sprawdza właściwe zachowanie bez fałszywej gwarancji numeracji.",
        ],
      ),
      coding({
        id: "join-all-gate",
        kind: "modify",
        title: "Połącz wszystkie dzieci",
        prompt:
          "Uzupełnij `join_all_jobs`, które przyjmuje `Vec<(u32, Box<dyn FnOnce(u32, ThreadId) -> Result<u32, &'static str> + Send>)>` i zwraca `(u32, Vec<ThreadId>, usize)`. Dla każdej dostarczonej pary uruchom jeden wątek, przekaż callbackowi liczbę i rzeczywiste ID tego wątku. Wynik zawiera sumę udanych wyników, ID wszystkich dzieci w kolejności wejścia oraz liczbę Err lub panik. ID można odczytać przez handle.thread().id() także przed join, więc nie ginie po panice. Dołącz wszystkie dzieci również po błędzie. Testy używają najwyżej trzech zadań; suma mieści się w u32, a pusta lista daje zero i pustą listę ID.",
        code: joinAllStarter,
        solution: joinAllSolution,
        tests: joinAllTests,
        hints: [
          "Oddziel życie dziecka od jego wyniku. Panika nie usuwa obowiązku dołączenia pozostałych.",
          "Zewnętrzny Result opisuje zakończenie wątku, a wewnętrzny wynik callbacku. Każda gałąź nadal prowadzi do obsługi następnego uchwytu.",
        ],
        gate: true,
      }),
      coding({
        id: "join-report-blank",
        kind: "blank",
        title: "Od pustej kartki: kontrakt zakończenia",
        prompt:
          "Od pustej kartki zaprojektuj funkcję `run_jobs`, która przyjmuje `Vec<(u32, Box<dyn FnOnce(u32, ThreadId) -> u32 + Send>)>` i zwraca `(u32, Vec<ThreadId>)`. Każda para to liczba i jednorazowa praca do wykonania w osobnym wątku. Zwróć sumę wyników callbacków oraz rzeczywiste ID dzieci w kolejności wejścia. Każdy callback dostaje swoją liczbę i własne ThreadId. Lista może być pusta; testy używają najwyżej trzech par i sum mieszczących się w u32. Jeżeli callback panikuje, najpierw dołącz wszystkie dzieci, dopiero potem propaguj panikę. Nie zakładaj kolejności schedulera ani jednej konkretnej transformacji.",
        solution: joinAllBlankSolution,
        tests: joinAllBlankTests,
        hints: [
          "Dane i zachowanie pochodzą z parametrów. Zakończenie jednego zadania nie oznacza końca pozostałych.",
          "Wyniki join można najpierw zebrać, a później ocenić. Pozwala to reagować na panikę po zakończeniu wszystkich dzieci.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "spawn gwarantuje, że println dziecka pojawi się przed println rodzica.",
      "drop JoinHandle zawsze czeka na dziecko.",
      "Po błędzie jednego join można wrócić, bo pozostałe wątki same są już obsłużone.",
    ],
    transferTask:
      "Zaprojektuj mały raport z trzech niezależnych obliczeń: zapisz JoinHandle, odbierz każdy wynik, uporządkuj dane dopiero po join i jawnie zdecyduj, co zrobić z paniką.",
    evidenceGate:
      "join-all-gate i join-report-blank niezależnie sprawdzają trzy join, zachowanie sukcesów po błędzie oraz brak przedwczesnego powrotu.",
    sourceIds: [
      "threads-book-spawn-join",
      "threads-std-module",
      "threads-std-join-handle",
    ],
  },
  {
    id: "thread-move",
    moduleId: "threads",
    conceptIds: ["thread-move"],
    competencyIds: ["move-owned-thread-data"],
    prerequisites: ["thread-join"],
    title: "move: przekaż własność do wątku",
    subtitle:
      "Czytaj E0373 i E0382 jako wskazówki o czasie życia oraz właścicielu przejętym przez closure.",
    minutes: 22,
    outcomes: [
      "Wyjaśnisz, dlaczego zwykła pożyczka do niezależnego spawn jest odrzucana przez E0373.",
      "Przewidzisz, że move odbiera wcześniejszej nazwie własność String lub Vec.",
      "Odzyskasz wynik z zamknięcia przez join bez klonowania danych wejściowych.",
    ],
    steps: [
      compilerError(
        "move-e0373",
        "Zlokalizuj E0373",
        "Uruchom kompilację i przeczytaj miejsce, w którym closure próbuje pożyczyć lokalny String do niezależnego wątku. Najpierw wskaż problem z czasem życia, potem użyj sugestii kompilatora.",
        moveBorrowError,
        moveBorrowSolution,
        "E0373",
      ),
      choose(
        "move-predict",
        "predict",
        "Przewidź własność po move",
        "Po `thread::spawn(move || message.len())` która nazwa posiada String, gdy rodzic wywołuje join?",
        1,
        [
          "message nadal posiada String, bo move dotyczy tylko kodu closure",
          "closure dziecka posiada message, a rodzic odzyskuje wyłącznie wynik join",
          "String jest sklonowany automatycznie przed startem wątku",
        ],
        [
          "move dotyczy przechwycenia i zmienia właściciela.",
          "Po move poprzednia nazwa nie jest już właścicielem; join zwraca len, nie String.",
          "String nie implementuje Copy, a thread::spawn nie klonuje go automatycznie.",
        ],
        moveRunCode,
      ),
      compilerError(
        "move-e0382",
        "Zlokalizuj E0382",
        "Ten kod naprawił czas życia przez move, ale używa `text` po przekazaniu go closure. Znajdź przeniesioną nazwę i zmień program tak, aby wartość została użyta w jednym właścicielu.",
        moveUseAfterError,
        moveUseAfterSolution,
        "E0382",
      ),
      run(
        "move-run",
        "Odbierz wynik własnego closure",
        "Uruchom kod. Wątek przejmuje String, oblicza długość, a rodzic drukuje dopiero wartość odzyskaną przez join.",
        moveRunCode,
        "11\n",
      ),
      coding({
        id: "move-owned-gate",
        kind: "modify",
        title: "Oddaj własny tekst",
        prompt:
          "Uzupełnij `spawn_owned_label`, aby przekazać String i callback do jednego nowego wątku oraz zwrócić z join parę `(String, ThreadId)`. Callback typu `FnOnce(String, ThreadId) -> String + Send` dostaje przejęty tekst i ID własnego wątku; testy sprawdzą różne transformacje Unicode i różny ThreadId dziecka. Nie twórz kopii wejścia przed spawn.",
        code: ownedLabelStarter,
        solution: ownedLabelSolution,
        tests: ownedLabelTests,
        hints: [
          "Closure musi przejąć label, bo niezależny spawn nie może pożyczyć lokalnej wartości.",
          "Callback otrzymuje przejęty String i ThreadId, a join zwraca Result z parą. To callback wybiera transformację wyniku.",
        ],
        gate: true,
      }),
      coding({
        id: "move-collection-blank",
        kind: "blank",
        title: "Od pustej kartki: przenieś kolekcję",
        prompt:
          "Od pustej kartki zaprojektuj `move_and_join`, która przyjmuje własnościowy `Vec<String>` oraz callback w Box typu `Box<dyn FnOnce(Vec<String>, ThreadId) -> usize + Send>`, przekazuje oba do dokładnie jednego wątku i zwraca `(usize, ThreadId)`. Test callbacku oblicza sumę długości, ale API ma przekazywać dowolną transformację. Opisz w kodzie własność wynikającą z move i połącz dziecko przez JoinHandle. Nie klonuj elementów i nie zostawiaj odłączonego uchwytu.",
        solution: moveBlankSolution,
        tests: moveBlankTests,
        hints: [
          "Parametr Vec jest już własnością funkcji; zewnętrzny callback i cały Vec mogą przejść do closure jednym move.",
          "Iterator po `words` pozostaje w callbacku dziecka. Po join rodzic otrzymuje sumę oraz rzeczywisty ThreadId.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "move oznacza głębokie klonowanie Stringa.",
      "Wywołanie join cofnie move i przywróci dawną nazwę jako właściciela.",
      "E0373 znika tylko wtedy, gdy dodamy sleep przed join.",
    ],
    transferTask:
      "Prześledź przepływ własności dla jednego Vec<String>: zaznacz właściciela przed spawn, w closure i po join, a następnie wskaż, gdzie kompilator odrzuci próbę użycia starej nazwy.",
    evidenceGate:
      "move-owned-gate i move-collection-blank niezależnie testują przejęcie String oraz kolekcji, wyniki join i brak ukrytego klonowania.",
    sourceIds: [
      "threads-book-spawn-join",
      "threads-error-e0373",
      "threads-error-e0382",
    ],
  },
  {
    id: "scoped-threads",
    moduleId: "threads",
    conceptIds: ["scoped-threads"],
    competencyIds: ["borrow-with-scoped-threads"],
    prerequisites: ["thread-move"],
    title: "thread::scope: pożyczaj do końca zakresu",
    subtitle:
      "Pożycz nieklonowane dane na czas ograniczonego scope i wróć do nich dopiero po join.",
    minutes: 24,
    outcomes: [
      "Rozróżnisz zwykły spawn z wymogiem 'static od scoped spawn.",
      "Podzielisz pożyczoną kolekcję na niepokrywające się części i złączysz wyniki.",
      "Wyjaśnisz, dlaczego scope kończy dzieci przed ponownym użyciem danych przez rodzica.",
    ],
    steps: [
      choose(
        "scoped-predict",
        "predict",
        "Przewidź moment bezpiecznego użycia",
        "W przykładzie oba scoped handle są jawnie połączone wewnątrz scope, a println jest po `scope`. Jaki stabilny wynik zobaczysz?",
        2,
        [
          "2, bo jedno dziecko ma etykietę A",
          "zależny od kolejności dzieci",
          "3, bo scope zwraca sumę długości po join",
        ],
        [
          "Są dwa elementy o długościach 1 i 2, więc nie jest to 2.",
          "Kolejność zakończenia nie zmienia dodawania długości, a oba wyniki są zebrane.",
          "scope oddaje 1 + 2, a drukowanie jest po zakończeniu scope: `3`.",
        ],
        scopedPredictCode,
      ),
      run(
        "scoped-run",
        "Pożycz nieklonowane etykiety",
        "Uruchom autorski fixture. Label nie implementuje Clone; dwa wątki czytają pożyczone elementy, a jawne join oddaje sumę przed końcem scope.",
        scopedRunCode,
        "7\n",
      ),
      compilerError(
        "scoped-spawn-error",
        "Porównaj zwykły spawn i scope",
        "Zwykły spawn próbuje pożyczyć lokalną kolekcję. Zlokalizuj E0373 i napraw kod przez thread::scope, tak aby wynik został zebrany przed końcem scope.",
        scopedBorrowError,
        scopedBorrowSolution,
        "E0373",
      ),
      choose(
        "scoped-recall",
        "recall",
        "Przypomnij gwarancję scope",
        "Co musi być prawdą po powrocie z `thread::scope`?",
        0,
        [
          "Wszystkie niepołączone scoped dzieci zostały zakończone, więc można odzyskać wyłączny lub mutowalny dostęp do danych środowiska",
          "Każdy wątek wykonał się w kolejności utworzenia",
          "Dane zostały sklonowane do osobnych stosów",
        ],
        [
          "To gwarancja czasu życia scope; jawne join nadal daje kontrolę nad wynikiem i paniką.",
          "Scheduler nie obiecuje kolejności startu ani końca.",
          "Przykład wykorzystuje pożyczkę, nie klonowanie.",
        ],
      ),
      coding({
        id: "scoped-borrowed-gate",
        kind: "modify",
        title: "Podziel pożyczoną kolekcję",
        prompt:
          "Uzupełnij `sum_borrowed_parts`, które przyjmuje `&[BorrowedLabel]` oraz callback `&(dyn Fn(&[BorrowedLabel], ThreadId) -> usize + Sync)` i zwraca `(usize, Vec<ThreadId>)`. W scope uruchom dokładnie dwa wątki, także dla pustego wejścia. Każdy wywołuje callback raz na swojej części oryginalnego slice, podzielonego w indeksie len / 2. Zwróć sumę wyników callbacków i oba ID w kolejności części. Suma mieści się w usize; funkcja ma obsłużyć również małe i puste wejścia. Callback dostaje slice i rzeczywisty ThreadId; test porówna go z callerem. BorrowedLabel nie implementuje Clone. Jawnie połącz oba ScopedJoinHandle i oddaj parę po zakończeniu scope.",
        code: borrowedPartsStarter,
        solution: borrowedPartsSolution,
        tests: borrowedPartsTests,
        hints: [
          "Oddziel granice pożyczanych części od zakresu życia wątków. Żadna część nie wymaga kopii danych.",
          "scope.spawn może pożyczyć left i right oraz wywołać callback z ThreadId. Zsumuj oba wyniki join wewnątrz scope, a kolekcja pozostanie dostępna po jego końcu.",
        ],
        gate: true,
      }),
      coding({
        id: "scoped-max-blank",
        kind: "blank",
        title: "Od pustej kartki: maksimum z pożyczek",
        prompt:
          "Od pustej kartki zaprojektuj `max_borrowed_len`, która przyjmuje `&[String]` oraz callback `&(dyn Fn(&[String], ThreadId) -> usize + Sync)` i zwraca `(usize, Vec<ThreadId>)`. W scope utwórz dokładnie dwa wątki, także przy pustym wejściu, dla części oryginalnego slice podzielonego w indeksie len / 2. Wynik to większy z wyników dwóch callbacków oraz oba ThreadId w kolejności części. Callback liczący długości zwraca 0 dla pustej części. Callback dostaje pożyczony slice i ThreadId, a dzieci muszą skończyć przed zwrotem. Nie twórz Vec kopii ani nie wymagaj Clone.",
        solution: scopedBlankSolution,
        tests: scopedBlankTests,
        hints: [
          "Wynik oblicza dostarczony callback. Twoje zadanie polega na organizacji pożyczek, pracy i odbioru wyników.",
          "Każdy closure pożycza własny slice, callback zwraca lokalne maksimum i ThreadId, a wynik z obu jawnych join wybiera rodzic po zakończeniu pracy.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "scope klonuje dane, aby mogły wejść do niezależnych wątków.",
      "Pożyczka w scope pozwala dwóm wątkom mutować ten sam fragment bez synchronizacji.",
      "Automatyczny join ze scope gwarantuje kolejność działania wątków.",
    ],
    transferTask:
      "Weź nieklonowaną kolekcję rekordów, podziel ją na ograniczone slice, zaplanuj pożyczone odczyty w scope i wskaż dokładny punkt, po którym rodzic może ją zmienić.",
    evidenceGate:
      "scoped-borrowed-gate i scoped-max-blank niezależnie dowodzą pożyczania nieklonowanych danych, ograniczenia liczby dzieci i zakończenia przed ponownym użyciem kolekcji.",
    sourceIds: [
      "threads-std-scope",
      "threads-std-scope-type",
      "threads-std-module",
    ],
  },
];

const reviewJoinSolution = `use std::thread;

fn spawned_is_distinct<F>(worker: F) -> thread::ThreadId
where
    F: FnOnce(thread::ThreadId) -> thread::ThreadId + Send + 'static,
{
    thread::spawn(move || worker(thread::current().id()))
        .join()
        .expect("dziecko nie powinno panikować")
}`;

const reviewJoinTests = `#[test]
fn spawn_really_runs_on_a_different_thread() {
    let parent = thread::current().id();
    let child = spawned_is_distinct(move |id| {
        assert_eq!(id, thread::current().id());
        assert_ne!(id, parent);
        id
    });
    assert_ne!(child, parent);
}

#[test]
fn the_thread_identity_check_is_repeatable() {
    let parent = thread::current().id();
    assert_ne!(spawned_is_distinct(|id| {
        assert_eq!(id, thread::current().id());
        id
    }), parent);
    assert_ne!(spawned_is_distinct(|id| {
        assert_eq!(id, thread::current().id());
        id
    }), parent);
}`;

const reviewJoinStarter = `use std::thread;

fn spawned_is_distinct<F>(worker: F) -> thread::ThreadId
where
    F: FnOnce(thread::ThreadId) -> thread::ThreadId + Send + 'static,
{
    let _ = worker;
    thread::current().id()
}`;

const reviewMoveSolution = `use std::thread;

fn owned_length<F>(text: String, worker: F) -> (usize, thread::ThreadId)
where
    F: FnOnce(String, thread::ThreadId) -> usize + Send + 'static,
{
    thread::spawn(move || {
        let id = thread::current().id();
        (worker(text, id), id)
    })
        .join()
        .expect("dziecko nie powinno panikować")
}`;

const reviewMoveTests = `#[test]
fn review_move_returns_unicode_byte_length() {
    let parent = thread::current().id();
    let (rust_len, rust_id) = owned_length(String::from("Rust"), |text, id| {
        assert_eq!(id, thread::current().id());
        text.len()
    });
    let (polish_len, polish_id) = owned_length(String::from("żółć"), |text, id| {
        assert_eq!(id, thread::current().id());
        text.len()
    });
    assert_eq!(rust_len, 4);
    assert_eq!(polish_len, 8);
    assert_ne!(rust_id, parent);
    assert_ne!(polish_id, parent);
}

#[test]
fn review_move_handles_empty_owned_string() {
    let (length, _) = owned_length(String::new(), |text, id| {
        assert_eq!(id, thread::current().id());
        text.len()
    });
    assert_eq!(length, 0);
}`;

const reviewMoveStarter = `use std::thread;

fn owned_length<F>(text: String, worker: F) -> (usize, thread::ThreadId)
where
    F: FnOnce(String, thread::ThreadId) -> usize + Send + 'static,
{
    let _ = (text, worker);
    (0, thread::current().id())
}`;

const reviewScopedSolution = `use std::thread;

fn borrowed_sum(
    values: &[i32],
    worker: &(dyn Fn(&[i32], thread::ThreadId) -> i32 + Sync),
) -> (i32, Vec<thread::ThreadId>) {
    let (left, right) = values.split_at(values.len() / 2);
    thread::scope(|scope| {
        let left_sum = scope.spawn(|| {
            let id = thread::current().id();
            (worker(left, id), id)
        });
        let right_sum = scope.spawn(|| {
            let id = thread::current().id();
            (worker(right, id), id)
        });
        let (left_value, left_id) = left_sum.join().unwrap();
        let (right_value, right_id) = right_sum.join().unwrap();
        (left_value + right_value, vec![left_id, right_id])
    })
}`;

const reviewScopedTests = `#[test]
fn review_scope_borrows_without_cloning() {
    let values = vec![1, 2, 3, 4];
    let parent = thread::current().id();
    let (sum, ids) = borrowed_sum(&values, &|part, id| {
        assert_eq!(id, thread::current().id());
        assert_ne!(id, parent);
        part.iter().sum()
    });
    assert_eq!(sum, 10);
    assert_eq!(ids.len(), 2);
    assert_eq!(values, vec![1, 2, 3, 4]);
}

#[test]
fn review_scope_handles_empty_input() {
    let values: Vec<i32> = Vec::new();
    let (sum, ids) = borrowed_sum(&values, &|part, id| {
        assert_eq!(id, thread::current().id());
        part.iter().sum()
    });
    assert_eq!(sum, 0);
    assert_eq!(ids.len(), 2);
}`;

const reviewScopedStarter = `use std::thread;

fn borrowed_sum(
    values: &[i32],
    worker: &(dyn Fn(&[i32], thread::ThreadId) -> i32 + Sync),
) -> (i32, Vec<thread::ThreadId>) {
    let _ = (values, worker);
    (0, vec![thread::current().id()])
}`;

export const threadsReviewExercises: Record<string, LessonStep> = {
  "thread-join": coding({
    id: "review-thread-join",
    kind: "apply",
    title: "Powtórka: sprawdź tożsamość dziecka",
    prompt:
      "Uzupełnij `spawned_is_distinct`: jeden nowy wątek wywołuje callback z własnym ThreadId i zwraca wynik tego callbacku. Funkcja ma oddać ten ThreadId po join; test sprawdza rzeczywisty wątek wywołania. Nie porównuj stałego numeru ani tekstu stdout.",
    code: reviewJoinStarter,
    solution: reviewJoinSolution,
    tests: reviewJoinTests,
    hints: [
      "Pobierz `thread::current().id()` osobno w rodzicu i w closure dziecka.",
      "join zwraca id dziecka; porównaj je z id rodzica po obsłużeniu Result.",
    ],
  }),
  "thread-move": coding({
    id: "review-thread-move",
    kind: "apply",
    title: "Powtórka: długość po move",
    prompt:
      "Uzupełnij `owned_length`, aby przekazać String do jednego wątku i zwrócić jego długość przez join. Test obejmuje UTF-8 i pusty String; nie używaj wartości po move i nie klonuj wejścia.",
    code: reviewMoveStarter,
    solution: reviewMoveSolution,
    tests: reviewMoveTests,
    hints: [
      "Niezależny spawn potrzebuje closure przejmującego String przez move.",
      "Długość policz wewnątrz closure i wyciągnij usize przez join().expect(...).",
    ],
  }),
  "scoped-threads": coding({
    id: "review-scoped-threads",
    kind: "apply",
    title: "Powtórka: suma dwóch pożyczek",
    prompt:
      "Uzupełnij `borrowed_sum`, aby w jednym scope podzielić `&[i32]` na dwie części, uruchomić najwyżej dwa scoped threads i zwrócić sumę po dwóch join. Test sprawdzi ponowne użycie oryginalnego Vec po scope.",
    code: reviewScopedStarter,
    solution: reviewScopedSolution,
    tests: reviewScopedTests,
    hints: [
      "split_at tworzy dwa pożyczone slice bez kopiowania elementów.",
      "Oba scoped closure sumują własny slice, a rodzic dodaje wyniki po join.",
    ],
  }),
};

export const threadsModule: CourseModule = {
  id: "threads",
  title: "Wątki: uruchom, przenieś i zakończ",
  whyItMatters:
    "Współbieżność zaczyna się od jasnego kontraktu życia pracy: wątek ma własny przebieg, JoinHandle daje możliwość czekania, move przekazuje własność, a scope wyznacza bezpieczny koniec pożyczek. Te reguły przygotowują grunt pod kanały i wspólny stan.",
  capabilities: [
    "Zachowujesz JoinHandle, odbierasz thread::Result i dołączasz wszystkie ograniczone dzieci.",
    "Naprawiasz E0373 i E0382 przez świadome przeniesienie własności do closure.",
    "Używasz thread::scope do pożyczania nieklonowanych danych i jawnego join.",
  ],
  prerequisites: ["shared-ownership"],
  lessonIds: threadsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Każde spawn ma zachowany JoinHandle, test odróżnia ThreadId dziecka, a błąd jednego dziecka nie pomija kolejnych join.",
    "move rozwiązuje wymóg czasu życia i przenosi String lub Vec dokładnie do jednego właściciela.",
    "scope pozwala pożyczyć slice bez Clone, ogranicza liczbę dzieci i kończy je przed ponownym użyciem danych.",
  ],
  projectConnection:
    "W Log Analyzerze te reguły pozwolą bezpiecznie uruchomić kilka małych etapów analizy i jasno zakończyć każdy z nich. Kanały przejmą później przekazywanie wielu wyników, a Arc i Mutex dopiero potem opiszą współdzielony stan.",
  assessmentId: "scoped-threads/scoped-max-blank",
  gateCriteria: [
    {
      id: "threads-join-gate",
      label:
        "JoinHandle daje kontrolę nad każdym ograniczonym dzieckiem, także po błędzie innego dziecka.",
      taskRefs: [
        { lessonId: "thread-join", stepId: "join-all-gate" },
        { lessonId: "thread-join", stepId: "join-report-blank" },
      ],
    },
    {
      id: "threads-move-gate",
      label:
        "move przekazuje własność do closure i pozwala odzyskać wynik przez join.",
      taskRefs: [
        { lessonId: "thread-move", stepId: "move-owned-gate" },
        { lessonId: "thread-move", stepId: "move-collection-blank" },
      ],
    },
    {
      id: "threads-scope-gate",
      label:
        "thread::scope pożycza nieklonowane dane i kończy wszystkie ograniczone dzieci przed zwrotem.",
      taskRefs: [
        { lessonId: "scoped-threads", stepId: "scoped-borrowed-gate" },
        { lessonId: "scoped-threads", stepId: "scoped-max-blank" },
      ],
    },
  ],
};
