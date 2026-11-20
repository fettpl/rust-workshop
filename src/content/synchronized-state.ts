import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const synchronizedStateSources: Source[] = [
  {
    id: "synchronized-state-book-send-sync",
    title:
      "The Rust Programming Language: Extensible Concurrency with Send and Sync",
    url: "https://doc.rust-lang.org/book/ch16-04-extensible-concurrency-sync-and-send.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie definicji Send, Sync, Rc, Arc albo ręcznej implementacji marker traits.",
  },
  {
    id: "synchronized-state-std-send",
    title: "Rust standard library: Send",
    url: "https://doc.rust-lang.org/std/marker/trait.Send.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu przenoszenia własności między wątkami albo implementacji Rc i Arc.",
  },
  {
    id: "synchronized-state-std-sync",
    title: "Rust standard library: Sync",
    url: "https://doc.rust-lang.org/std/marker/trait.Sync.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie relacji `T: Sync` i `&T: Send`, RefCell albo Mutex.",
  },
  {
    id: "synchronized-state-std-arc",
    title: "Rust standard library: Arc<T>",
    url: "https://doc.rust-lang.org/std/sync/struct.Arc.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie boundów Arc, przykładu Arc<RefCell<T>> albo doboru Mutex.",
  },
  {
    id: "synchronized-state-error-e0277",
    title: "Rust Error Index: E0277 — trait bound is not satisfied",
    url: "https://doc.rust-lang.org/error_codes/E0277.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty kod E0277 po zmianie przykładów wymagających Send lub Sync.",
  },
  {
    id: "synchronized-state-book-shared-state",
    title: "The Rust Programming Language: Shared-State Concurrency",
    url: "https://doc.rust-lang.org/book/ch16-03-shared-state.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie Arc, Mutex, zakresu MutexGuard albo wzorca join wszystkich wątków.",
  },
  {
    id: "synchronized-state-std-mutex",
    title: "Rust standard library: Mutex<T>",
    url: "https://doc.rust-lang.org/std/sync/struct.Mutex.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie lock, try_lock, MutexGuard, poisoning, clear_poison albo into_inner.",
  },
  {
    id: "synchronized-state-std-poison-error",
    title: "Rust standard library: PoisonError<T>",
    url: "https://doc.rust-lang.org/std/sync/struct.PoisonError.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie into_inner i opisu advisory poisoning oraz wyniku lock.",
  },
];

export const synchronizedStateCompetencies: Competency[] = [
  {
    id: "reason-about-send-sync",
    title:
      "Rozróżniasz Send od Sync, dobierasz Arc do współwłasności między wątkami i nie traktujesz Arc jako automatycznej synchronizacji zawartości.",
  },
  {
    id: "guard-critical-sections",
    title:
      "Projektujesz krótką sekcję krytyczną z MutexGuard, kontrolujesz przepełnienie i zwalniasz blokadę przed callbackiem lub join.",
  },
  {
    id: "recover-poisoned-invariants",
    title:
      "Rozpoznajesz poison jako ostrzeżenie, propagujesz błąd albo naprawiasz sprawdzony niezmiennik przed clear_poison.",
  },
];

export const synchronizedStateConcepts: Concept[] = [
  {
    id: "send-sync",
    title: "Send przenosi własność, a Sync pozwala bezpiecznie wysłać &T",
    prerequisites: ["channel-backpressure"],
    competencyIds: ["reason-about-send-sync"],
    reviewPrompt:
      "Co oznaczają `T: Send` i `T: Sync` oraz dlaczego `Arc<RefCell<T>>` nadal może dać E0277?",
    reviewAnswer:
      "Send oznacza, że własność T można bezpiecznie przenieść do innego wątku. Sync oznacza, że `&T` można bezpiecznie wysłać między wątkami. Arc synchronizuje licznik własności, ale nie zmienia RefCell w thread-safe typ, więc Arc<RefCell<T>> nadal nie spełnia wymaganych boundów.",
    distinguish:
      "Send dotyczy przeniesienia wartości, a Sync dotyczy współdzielenia referencji. Arc daje atomowy licznik i współwłasność; bezpieczeństwo payloadu wynika dopiero z jego własnych boundów, a mutację zwykle osłania Mutex.",
  },
  {
    id: "mutex-state",
    title: "MutexGuard chroni krótki, sprawdzony update wspólnego stanu",
    prerequisites: ["send-sync"],
    competencyIds: ["guard-critical-sections"],
    reviewPrompt:
      "Jak zaprojektować aktualizację przez Mutex, aby odmowa przepełnienia zostawiła stan bez zmian, a callback wykonał się po zwolnieniu guarda?",
    reviewAnswer:
      "Wewnątrz krótkiego zakresu należy zablokować Mutex, policzyć checked_add i zapisać wynik dopiero po sukcesie. Trzeba wynieść wynik poza zakres MutexGuard, a dopiero potem wywołać callback; wtedy callback może użyć try_lock, a odmowa nie wykonuje częściowej zmiany.",
    distinguish:
      "Mutex serializuje dostęp do chronionej wartości, lecz nie zna jej reguł biznesowych. Guard jest blokadą zakresową, więc nie należy trzymać go podczas callbacku ani join; checked_add i jawny Result nadal są obowiązkiem programu.",
  },
  {
    id: "mutex-recovery",
    title:
      "Poison wymaga jawnej decyzji: propaguj albo napraw zweryfikowany stan",
    prerequisites: ["mutex-state"],
    competencyIds: ["recover-poisoned-invariants"],
    reviewPrompt:
      "Co sygnalizuje poisoned Mutex i kiedy można wywołać clear_poison po przejęciu guarda z PoisonError?",
    reviewAnswer:
      "Poison sygnalizuje, że wątek trzymający lock panikował i niezmiennik może być naruszony; jest to ostrzeżenie, nie dowód automatycznej naprawy. Można propagować błąd albo przejąć guard przez into_inner, sprawdzić i przywrócić kanoniczny poprawny stan, a dopiero potem wywołać clear_poison.",
    distinguish:
      "into_inner tylko daje dostęp do danych mimo poison i nie naprawia ich. Propagowanie odrzuca skażony stan, a naprawa musi mieć konkretny sprawdzalny niezmiennik; clear_poison wolno wykonać po udanej naprawie, nie w ciemno. Wykrywanie poison jest pomocnicze i może nie objąć każdej paniki; brak flagi sam nie dowodzi poprawności danych.",
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
  error?: string,
  solution?: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(code === undefined
      ? {}
      : {
          code,
          solution: solution ?? code,
          expectedStatus: error
            ? ("compile-error" as const)
            : ("success" as const),
          ...(error ? { expectedError: error } : {}),
        }),
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

function observe(
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

function exercise(options: {
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
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const rcBroken = `use std::rc::Rc;
use std::thread;

fn main() {
    let value = Rc::new(String::from("wspólne"));
    let worker = thread::spawn(move || value.len());
    println!("{}", worker.join().unwrap());
}`;

const arcFixed = `use std::sync::Arc;
use std::thread;

fn main() {
    let value = Arc::new(String::from("wspólne"));
    let worker = thread::spawn(move || value.len());
    println!("{}", worker.join().unwrap());
}`;

const arcRefcellBroken = `use std::cell::RefCell;
use std::sync::Arc;
use std::thread;

fn main() {
    let value = Arc::new(RefCell::new(7));
    let worker_value = Arc::clone(&value);
    let worker = thread::spawn(move || *worker_value.borrow());
    println!("{}", worker.join().unwrap());
}`;

const arcRefcellFixed = `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let value = Arc::new(Mutex::new(7));
    let worker_value = Arc::clone(&value);
    let worker = thread::spawn(move || *worker_value.lock().unwrap());
    println!("{}", worker.join().unwrap());
}`;

const arcIdentityRun = `use std::sync::Arc;
use std::thread;

fn main() {
    let value = Arc::new(String::from("Rust"));
    let left = Arc::clone(&value);
    let right = Arc::clone(&value);
    let first = thread::spawn(move || left.len());
    let second = thread::spawn(move || right.len());
    let lengths = [first.join().unwrap(), second.join().unwrap()];
    println!("{} {}", lengths[0], lengths[1]);
    println!("ta sama alokacja: {}", Arc::ptr_eq(&value, &Arc::clone(&value)));
}`;

const sendFunctionSolution = `use std::thread;

fn send_to_thread<T, F>(value: T, callback: F) -> (T, thread::ThreadId)
where
    T: Send + 'static,
    F: FnOnce(&T) + Send + 'static,
{
    thread::spawn(move || {
        callback(&value);
        let worker = thread::current().id();
        (value, worker)
    })
    .join()
    .unwrap()
}`;

const sendFunctionStarter = `use std::thread;

fn send_to_thread<T, F>(value: T, callback: F) -> (T, thread::ThreadId)
where
    T: Send + 'static,
    F: FnOnce(&T) + Send + 'static,
{
    panic!("uzupełnij transfer przez wątek")
}`;

const sendFunctionTests = `#[test]
fn ownership_crosses_thread_without_clone() {
    struct Token(String);
    let seen = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let callback_seen = std::sync::Arc::clone(&seen);
    let parent = std::thread::current().id();
    let token = Token(String::from("nieklonowalny"));
    let (returned, worker) = send_to_thread(token, move |token| {
        callback_seen
            .lock()
            .unwrap()
            .push((token.0.len(), std::thread::current().id()));
    });
    assert_ne!(worker, parent);
    assert_eq!(returned.0, "nieklonowalny");
    assert_eq!(seen.lock().unwrap().as_slice(), &[(13, worker)]);
}`;

const callbackThreadSolution = `use std::thread;

fn run_on_other_thread<F>(job: F) -> thread::ThreadId
where
    F: FnOnce() + Send + 'static,
{
    thread::spawn(move || {
        job();
        thread::current().id()
    })
    .join()
    .unwrap()
}`;

const callbackThreadTests = `#[test]
fn callback_runs_on_joined_worker() {
    let (sender, receiver) = std::sync::mpsc::channel();
    let parent = std::thread::current().id();
    let worker = run_on_other_thread(move || sender.send(std::thread::current().id()).unwrap());
    assert_ne!(worker, parent);
    assert_eq!(receiver.recv().unwrap(), worker);
    assert!(matches!(receiver.try_recv(), Err(std::sync::mpsc::TryRecvError::Disconnected)));
}`;

const checkedUpdateSolution = `use std::sync::Mutex;

fn update_and_notify<F>(state: &Mutex<u32>, delta: i64, callback: F) -> Result<u32, &'static str>
where
    F: FnOnce(u32),
{
    let amount = u32::try_from(delta.unsigned_abs()).map_err(|_| "poza zakresem")?;
    let next = {
        let mut guard = state.lock().unwrap();
        let next = if delta >= 0 {
            guard.checked_add(amount)
        } else {
            guard.checked_sub(amount)
        }
        .ok_or("poza zakresem")?;
        *guard = next;
        next
    };
    callback(next);
    Ok(next)
}`;

const checkedUpdateStarter = `use std::sync::Mutex;

fn update_and_notify<F>(state: &Mutex<u32>, delta: i64, callback: F) -> Result<u32, &'static str>
where
    F: FnOnce(u32),
{
    let mut guard = state.lock().unwrap();
    let next = if delta >= 0 {
        guard.saturating_add(delta as u32)
    } else {
        guard.saturating_sub(delta.unsigned_abs() as u32)
    };
    *guard = next;
    callback(next);
    Ok(next)
}`;

const checkedUpdateTests = `#[test]
fn callback_is_outside_guard_and_overflow_is_atomic() {
    let state = std::sync::Mutex::new(4);
    let callback_state = &state;
    let callback_count = std::cell::Cell::new(0);
    let callback_value = std::cell::Cell::new(0);
    let result = update_and_notify(&state, 3, |value| {
        assert_eq!(*callback_state.try_lock().expect("callback trzyma guard"), value);
        callback_count.set(callback_count.get() + 1);
        callback_value.set(value);
    });
    assert_eq!(result, Ok(7));
    assert_eq!(*state.lock().unwrap(), 7);
    assert_eq!(callback_count.get(), 1);
    assert_eq!(callback_value.get(), 7);

    let full = std::sync::Mutex::new(u32::MAX);
    let callback_called = std::cell::Cell::new(false);
    let result = update_and_notify(&full, 1, |_| callback_called.set(true));
    assert_eq!(result, Err("poza zakresem"));
    assert_eq!(*full.lock().unwrap(), u32::MAX);
    assert!(!callback_called.get());

    let empty = std::sync::Mutex::new(2);
    let result = update_and_notify(&empty, -3, |_| panic!("callback po underflow"));
    assert_eq!(result, Err("poza zakresem"));
    assert_eq!(*empty.lock().unwrap(), 2);
    assert_eq!(update_and_notify(&state, -2, |value| assert_eq!(value, 5)), Ok(5));
    assert_eq!(*state.lock().unwrap(), 5);
    for delta in [i64::MIN, i64::MAX, 1_i64 << 32, -(1_i64 << 32)] {
        assert_eq!(update_and_notify(&state, delta, |_| panic!("callback po odmowie")), Err("poza zakresem"));
        assert_eq!(*state.lock().unwrap(), 5);
    }
    assert_eq!(update_and_notify(&state, 0, |value| assert_eq!(value, 5)), Ok(5));
}

#[test]
fn callback_observes_committed_value_and_its_change_is_not_overwritten() {
    let state = std::sync::Mutex::new(10);
    let result = update_and_notify(&state, 2, |value| {
        let mut guard = state.try_lock().expect("callback trzyma guard");
        assert_eq!(*guard, value);
        assert_eq!(value, 12);
        *guard = 90;
    });
    assert_eq!(result, Ok(12));
    assert_eq!(*state.lock().unwrap(), 90);
}`;

const aggregateSolution = `use std::sync::{Arc, Mutex};
use std::thread;

fn parallel_total<F>(total: Arc<Mutex<u32>>, parts: [u32; 3], observe: F) -> u32
where
    F: Fn(thread::ThreadId) + Send + Sync + 'static,
{
    let observe = Arc::new(observe);
    let mut handles = Vec::new();
    for part in parts {
        let total = Arc::clone(&total);
        let observe = Arc::clone(&observe);
        handles.push(thread::spawn(move || {
            {
                let mut guard = total.lock().unwrap();
                *guard += part;
            }
            observe(thread::current().id());
        }));
    }
    let outcomes: Vec<_> = handles.into_iter().map(|handle| handle.join()).collect();
    for outcome in outcomes {
        outcome.expect("panika workera po dołączeniu wszystkich dzieci");
    }
    *total.lock().unwrap()
}`;

const aggregateTests = `#[test]
fn three_workers_update_the_supplied_aggregate() {
    for (initial, parts, expected) in [(7, [2, 5, 8], 22), (9, [0, 1, 0], 10)] {
        let total = std::sync::Arc::new(std::sync::Mutex::new(initial));
        let calls = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let callback_calls = std::sync::Arc::clone(&calls);
        let parent = std::thread::current().id();
        struct Tag(String);
        let tag = Tag(String::from("bez Clone"));
        let result = parallel_total(total.clone(), parts, move |id| {
            assert_eq!(tag.0, "bez Clone");
            assert_eq!(id, std::thread::current().id());
            assert_ne!(id, parent);
            callback_calls.lock().unwrap().push(id);
        });
        assert_eq!(result, expected);
        assert_eq!(*total.lock().unwrap(), expected);
        let ids = calls.lock().unwrap();
        assert_eq!(ids.len(), 3);
        assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
    }
}

#[test]
fn callback_panics_do_not_poison_state_or_skip_other_workers() {
    let total = std::sync::Arc::new(std::sync::Mutex::new(8));
    let (sender, receiver) = std::sync::mpsc::channel();
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        parallel_total(total.clone(), [2, 3, 4], move |id| {
            sender.send(id).unwrap();
            panic!("celowa panika callbacku po zwolnieniu guarda");
        })
    }));
    assert!(result.is_err());
    assert!(!total.is_poisoned(), "callback nie może panikować pod guardem");
    assert_eq!(*total.lock().unwrap(), 17);
    let ids: Vec<_> = receiver.try_iter().collect();
    assert_eq!(ids.len(), 3, "każdy worker musi zakończyć callback przed powrotem");
    assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
}`;

const propagateSolution = `use std::sync::{Arc, Mutex};

fn read_after_worker(state: Arc<Mutex<u32>>) -> Result<u32, &'static str> {
    match state.lock() {
        Ok(guard) => Ok(*guard),
        Err(_) => Err("zatruty stan"),
    }
}`;

const propagateStarter = `use std::sync::{Arc, Mutex};

fn read_after_worker(state: Arc<Mutex<u32>>) -> Result<u32, &'static str> {
    Ok(*state.lock().unwrap_or_else(|poisoned| poisoned.into_inner()))
}`;

const poisonTests = `#[test]
fn joined_panicking_worker_poison_is_propagated() {
    let healthy = std::sync::Arc::new(std::sync::Mutex::new(4));
    assert_eq!(read_after_worker(healthy), Ok(4));

    let state = std::sync::Arc::new(std::sync::Mutex::new(12));
    let worker_state = std::sync::Arc::clone(&state);
    let worker = std::thread::spawn(move || {
        let mut guard = worker_state.lock().unwrap();
        *guard = 99;
        panic!("celowa panika");
    });
    assert!(worker.join().is_err());
    assert_eq!(read_after_worker(state), Err("zatruty stan"));
}`;

const repairSolution = `use std::sync::Mutex;

fn repair_counter(state: &Mutex<u32>) -> Result<u32, &'static str> {
    let mut guard = match state.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if *guard > 100 {
        return Err("poza zakresem");
    }
    *guard = 0;
    state.clear_poison();
    Ok(*guard)
}`;

const repairTests = `#[test]
fn repair_restores_canonical_state_before_clearing_poison() {
    let state = std::sync::Arc::new(std::sync::Mutex::new(55));
    let worker_state = std::sync::Arc::clone(&state);
    let worker = std::thread::spawn(move || {
        let mut guard = worker_state.lock().unwrap();
        *guard = 55;
        panic!("celowa panika");
    });
    assert!(worker.join().is_err());
    assert!(state.is_poisoned());
    assert_eq!(repair_counter(&state), Ok(0));
    assert!(!state.is_poisoned());
    assert_eq!(*state.lock().unwrap(), 0);

    let invalid = std::sync::Arc::new(std::sync::Mutex::new(150));
    let invalid_worker_state = std::sync::Arc::clone(&invalid);
    let invalid_worker = std::thread::spawn(move || {
        let _guard = invalid_worker_state.lock().unwrap();
        panic!("celowa panika dla nieprawidłowego stanu");
    });
    assert!(invalid_worker.join().is_err());
    assert!(invalid.is_poisoned());
    assert_eq!(repair_counter(&invalid), Err("poza zakresem"));
    assert!(invalid.is_poisoned());
    match invalid.lock() {
        Err(poisoned) => assert_eq!(*poisoned.into_inner(), 150),
        Ok(_) => panic!("odmowa naprawy nie może czyścić poison"),
    }
}`;

export const synchronizedStateLessons: Lesson[] = [
  {
    id: "send-sync",
    moduleId: "synchronized-state",
    conceptIds: ["send-sync"],
    competencyIds: ["reason-about-send-sync"],
    prerequisites: ["channel-backpressure"],
    title: "Send i Sync: granice wątku",
    subtitle:
      "Przeniesiesz własność przez join, rozpoznasz E0277 i zobaczysz, że Arc nie naprawia payloadu.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz różnicę między Send a Sync przez relację wartości i referencji.",
      "Rozpoznasz, dlaczego Rc nie przechodzi przez granicę wątku, a Arc wymaga bezpiecznego payloadu.",
      "Zaimplementujesz transfer nieklonowalnej wartości i potwierdzisz ThreadId callbacku.",
    ],
    steps: [
      choose(
        "send-sync-predict",
        "predict",
        "Przewidź granicę Rc",
        "Widoczny program przenosi Rc<String> do thread::spawn. Przewidź, czy przejdzie kompilację, zanim go uruchomisz.",
        1,
        [
          "Wątek skopiuje Rc przez Clone i zawsze wypisze tekst",
          "Kompilator odrzuci program, bo Rc nie implementuje Send",
          "Program skompiluje się, ale wynik zależy od kolejności wątków",
        ],
        [
          "Spawn nie dopisuje automatycznego Clone do przechwyconej wartości.",
          "Licznik Rc jest aktualizowany bez atomowych operacji przy klonowaniu i drop, więc Rc nie jest Send.",
          "To ograniczenie typów jest rozstrzygane przy kompilacji, przed schedulerem.",
        ],
        rcBroken,
        "E0277",
        arcFixed,
      ),
      observe(
        "send-sync-rc-e0277",
        "Zobacz E0277 dla Rc",
        "Skompiluj program. E0277 powinien wskazać niespełniony bound Send. Naprawa zamienia uchwyt na Arc, ale nie tworzy jeszcze ogólnej reguły, że każdy payload jest bezpieczny.",
        rcBroken,
        arcFixed,
        "E0277",
      ),
      run(
        "send-sync-arc-run",
        "Uruchom Arc po join",
        "Arc ma atomowy licznik własności. Obie długości są zbierane po join, a ptr_eq pokazuje jedną alokację; nie wyciągaj z tego wniosku, że Arc sam synchronizuje mutację.",
        arcIdentityRun,
        "4 4\nta sama alokacja: true\n",
      ),
      observe(
        "send-sync-arc-refcell-e0277",
        "Arc nie dodaje Sync RefCell",
        "Arc<RefCell<u32>> nadal jest odrzucane, bo RefCell kontroluje pożyczki niesynchronizowanym licznikiem. Poprawiony wariant używa Mutex.",
        arcRefcellBroken,
        arcRefcellFixed,
        "E0277",
      ),
      choose(
        "send-sync-distinguish",
        "explain",
        "Przenieść czy współdzielić?",
        "Send opisuje bezpieczne przeniesienie wartości T do innego wątku. Sync oznacza, że &T jest Send. Kompilator wyprowadza te traity ze składowych typu; nie dopisujemy tutaj unsafe impl. RefCell<String> jest Send, ale nie Sync. Arc<T> wymaga T: Send + Sync, aby sam był Send i Sync. Która decyzja wynika z tych reguł?",
        1,
        [
          "RefCell<String> nie wolno nigdy przekazać do innego wątku",
          "Można przenieść cały RefCell<String> do jednego wątku; Arc<RefCell<String>> nie wystarcza do współdzielenia między wątkami",
          "Arc dodaje Sync do każdego typu, który opakowuje",
        ],
        [
          "Przeniesienie całej wartości wymaga Send. Brak Sync dotyczy współdzielenia przez &T.",
          "Jeden nowy właściciel i równoczesne współdzielenie to różne kontrakty. Arc chroni licznik, a nie operacje RefCell.",
          "Atomowy licznik Arc nie synchronizuje wewnętrznego stanu RefCell.",
        ],
      ),
      exercise({
        id: "send-sync-transfer-gate",
        kind: "debug",
        title: "Przenieś właściciela bez Clone",
        prompt:
          "Napraw funkcję `send_to_thread`, aby przeniosła generyczne T do nowego wątku, uruchomiła callback przyjmujący pożyczone T i oddała T razem z ThreadId po join. Zachowaj boundy `Send + 'static`; test używa Token bez Clone.",
        code: sendFunctionStarter,
        solution: sendFunctionSolution,
        tests: sendFunctionTests,
        hints: [
          "Zidentyfikuj, które dane callbacku i wartości wyniku muszą przekroczyć granicę wątku.",
          "Połącz marker Send z własnością callbacku i uporządkuj wynik dopiero po zakończeniu workera; nie twórz ani nie klonuj zastępczego Token.",
        ],
        gate: true,
      }),
      exercise({
        id: "send-sync-thread-id-blank",
        kind: "blank",
        title: "Udowodnij ThreadId callbacku",
        prompt:
          "Od pustej kartki napisz funkcję `run_on_other_thread`, która przyjmuje callback typu `F: FnOnce() + Send + 'static` i zwraca `std::thread::ThreadId`. Uruchom job w jednym dołączonym wątku. Test sprawdzi, że callback wysłał własne ThreadId i że nie jest to ThreadId wywołującego.",
        solution: callbackThreadSolution,
        tests: callbackThreadTests,
        hints: [
          "Potrzebujesz jednego uchwytu, wyniku join oraz miejsca, w którym worker zna własny identyfikator.",
          "Callback powinien wykonać się w workerze, a handle musi zostać dołączony niezależnie od kolejności planowania.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Send oznacza, że typ można jednocześnie współdzielić przez referencję.",
      "Arc automatycznie czyni każdy typ wewnętrzny thread-safe.",
      "Brak deterministycznej kolejności wypisywania można naprawić przez sleep.",
      "Ręczne unsafe impl Send lub Sync jest zwykłym sposobem dopisania boundu.",
    ],
    transferTask:
      "Zaprojektuj funkcję, która przenosi własność nieklonowalnego rekordu do jednego wątku i przez join zwraca wynik, a następnie opisz, jaki bound dotyczy wartości i jaki referencji.",
    evidenceGate:
      "send-sync-transfer-gate sprawdza przejście własności bez Clone, a send-sync-thread-id-blank sprawdza wykonanie callbacku w dołączonym wątku przez ThreadId.",
    sourceIds: [
      "synchronized-state-book-send-sync",
      "synchronized-state-std-send",
      "synchronized-state-std-sync",
      "synchronized-state-std-arc",
      "synchronized-state-error-e0277",
    ],
  },
  {
    id: "mutex-state",
    moduleId: "synchronized-state",
    conceptIds: ["mutex-state"],
    competencyIds: ["guard-critical-sections"],
    prerequisites: ["send-sync"],
    title: "Mutex: krótka sekcja krytyczna",
    subtitle:
      "Zaktualizujesz wspólną sumę przez guard, odrzucisz przepełnienie i oddasz blokadę przed callbackiem.",
    minutes: 20,
    outcomes: [
      "Rozpoznasz MutexGuard jako zakresowy dostęp do jednego stanu naraz.",
      "Zastosujesz checked_add tak, aby błąd nie zostawił częściowego update.",
      "Dołączysz wszystkich workerów i nie przetrzymasz guarda podczas callbacku lub join.",
    ],
    steps: [
      choose(
        "mutex-state-predict",
        "predict",
        "Przewidź zakres guarda",
        "Model jest jawny: `Mutex::lock()` zwraca `Result<MutexGuard<'_, T>, PoisonError<MutexGuard<'_, T>>>`; Ok guard daje wyłączny dostęp, a jego Drop zwalnia blokadę. Kod tworzy `let guard = state.lock().unwrap()`, odczytuje wartość i kończy blok. Kiedy drugi lock może się wykonać bez czekania?",
        2,
        [
          "Dopiero po drop całego Arc na końcu programu",
          "Nigdy, bo MutexGuard jest kopią Mutex",
          "Po wyjściu z zakresu, w którym żyje guard",
        ],
        [
          "Arc zarządza własnością, ale nie określa życia guarda.",
          "Guard nie jest kopią blokady; reprezentuje aktywnie zablokowany Mutex.",
          "Koniec życia guarda zwalnia blokadę, gdy guard wypada z krótkiego zakresu.",
        ],
      ),
      run(
        "mutex-state-run",
        "Uruchom kontrolowany update",
        "Wartość jest zmieniona wewnątrz zakresu guarda, a odczyt po jego zakończeniu jest jawny. Program nie drukuje z workerów, więc wynik nie zależy od schedulera.",
        `use std::sync::Mutex;

fn main() {
    let state = Mutex::new(10u32);
    {
        let mut guard = state.lock().unwrap();
        *guard += 2;
    }
    println!("stan po zakresie: {}", *state.lock().unwrap());
}`,
        "stan po zakresie: 12\n",
      ),
      choose(
        "mutex-state-explain",
        "explain",
        "Znajdź zbyt długą blokadę",
        "Callback chce wywołać `state.try_lock()`. Który układ zachowuje możliwość callbacku bez blokady reentrantnej?",
        0,
        [
          "Oblicz i zapisz wynik w wewnętrznym zakresie, zwolnij guard, potem wywołaj callback",
          "Wywołaj callback natychmiast po lock, aby obserwował stan przed zapisem",
          "Przetrzymaj guard przez callback i dodaj sleep przed try_lock",
        ],
        [
          "Wynik można skopiować lub przenieść poza guard; callback dostaje już zatwierdzony stan.",
          "Callback nie powinien widzieć częściowo zaktualizowanej wartości.",
          "Sleep nie zwalnia guarda i nie jest synchronizacją; try_lock nadal odmawia.",
        ],
      ),
      choose(
        "mutex-state-update-rule",
        "recall",
        "Wybierz operację checked",
        "Który kontrakt zachowuje wartość przy próbie zwiększenia `u32::MAX` o 1?",
        1,
        [
          "Zapisz `guard + amount`, a po panice odczytaj dowolny wynik",
          "Policz `checked_add`, zwróć Err przed zapisem i nie wywołuj callbacku",
          "Użyj saturating_add i zgłoś sukces, bo stan jest wtedy zawsze poprawny",
        ],
        [
          "Panic nie jest kontraktem odmowy i nie daje programu o zachowaniu, którego uczymy.",
          "Checked operation pozwala zachować stary stan i jawnie poinformować o odmowie.",
          "Saturating add ukrywa odmowę jako inny wynik i zmienia semantykę update.",
        ],
      ),
      exercise({
        id: "mutex-state-callback-gate",
        kind: "debug",
        title: "Zwolnij guard przed callbackiem",
        prompt:
          "Napraw `update_and_notify` dla niezatrutego Mutex. Zastosuj zmianę delta typu i64 do wartości u32; dodatnia zmiana zwiększa, ujemna zmniejsza. Odrzuć wynik poza zakresem u32 przez Err z tekstem `poza zakresem`, bez zmiany stanu i callbacku. Nie obcinaj delta rzutowaniem. Po sukcesie zapisz nową wartość i przekaż ją do callbacku dokładnie raz po zwolnieniu guarda; zwróć tę samą wartość w Ok.",
        code: checkedUpdateStarter,
        solution: checkedUpdateSolution,
        tests: checkedUpdateTests,
        hints: [
          "Sprawdź osobno zakres delta oraz życie guarda w chwili powiadomienia.",
          "Konwersja sprawdzana i operacje checked rozróżniają odmowę od sukcesu. Zapis należy do sekcji krytycznej, a callback do pracy po jej zakończeniu.",
        ],
        gate: true,
      }),
      exercise({
        id: "mutex-state-aggregate-blank",
        kind: "blank",
        title: "Zsumuj przez trzech workerów",
        prompt:
          "Napisz funkcję `parallel_total`. Przyjmuje kolejno współdzielony stan typu `Arc<Mutex<u32>>`, tablicę `[u32; 3]` i callback F, który przyjmuje `std::thread::ThreadId` oraz nie zwraca wartości. F spełnia `Fn + Send + Sync + 'static` z tym argumentem. Wynikiem funkcji jest u32. Każdy z dokładnie trzech nowych wątków dodaje swój element do istniejącego stanu i następnie wywołuje callback z własnym identyfikatorem, po zwolnieniu własnego guarda. Funkcja zwraca końcowy stan po dołączeniu wszystkich dzieci. Jeżeli callback panikuje, wolno propagować panikę dopiero po dołączeniu pozostałych. Zakładamy niezatruty Mutex i sumę mieszczącą się w u32; zadanie nie obiecuje wycofania już wykonanych zmian.",
        solution: aggregateSolution,
        tests: aggregateTests,
        hints: [
          "Zaplanuj współwłasność stanu i osobne uchwyty dla dokładnie trzech workerów; główny wątek musi zebrać ich zakończenie.",
          "Arc pozwala przekazać współwłasność bez klonowania zawartości. Zbieranie wszystkich wyników join przed reakcją na panikę zachowuje kontrolę nad życiem dzieci.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Mutex sam sprawdza przepełnienie albo inne reguły domeny.",
      "MutexGuard należy trzymać podczas callbacku, bo wtedy callback widzi najnowszy stan.",
      "Jeden udany join pozwala pominąć pozostałe handle.",
      "Sleep jest dowodem, że sekcja krytyczna została zwolniona.",
    ],
    transferTask:
      "Zaimplementuj mały licznik zamówień, który odrzuca przekroczenie zakresu bez zmiany wartości, a powiadomienie wykonuje po zwolnieniu guarda.",
    evidenceGate:
      "mutex-state-callback-gate sprawdza try_lock wewnątrz callbacku po zwolnieniu guarda i atomowej odmowy overflow, a mutex-state-aggregate-blank sprawdza poprawną sumę trzech workerów po join.",
    sourceIds: [
      "synchronized-state-book-shared-state",
      "synchronized-state-std-mutex",
    ],
  },
  {
    id: "mutex-recovery",
    moduleId: "synchronized-state",
    conceptIds: ["mutex-recovery"],
    competencyIds: ["recover-poisoned-invariants"],
    prerequisites: ["mutex-state"],
    title: "Poison: propagowanie i naprawa",
    subtitle:
      "Po panice workera rozpoznasz ostrzeżenie, odrzucisz skażony stan albo naprawisz go przed clear_poison.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz, dlaczego lock zwraca PoisonError po panice właściciela guarda.",
      "Zaimplementujesz politykę propagowania błędu bez ślepego into_inner.",
      "Naprawisz wyłącznie sprawdzony stan kanoniczny i wywołasz clear_poison dopiero po naprawie.",
    ],
    steps: [
      choose(
        "mutex-recovery-predict",
        "predict",
        "Przewidź wynik po panice",
        "Worker trzyma MutexGuard, zmienia chronioną liczbę i panikuje, nadal trzymając guard. Rodzic odbiera Err z join. Co w tym przykładzie zwróci następny lock?",
        0,
        [
          "Err z PoisonError, bo stan może naruszać niezmiennik",
          "Zawsze Ok, bo Mutex automatycznie cofa zapis",
          "Deadlock, bo join nie pozwala workerowi zakończyć się po panice",
        ],
        [
          "Poison jest advisory sygnałem skażenia po panice w sekcji krytycznej.",
          "Mutex nie jest transakcją i nie przywraca poprzedniej wartości.",
          "Join odbiera wynik paniki; po zakończeniu worker nie trzyma już guarda.",
        ],
      ),
      run(
        "mutex-recovery-run",
        "Zobacz deterministyczny poison",
        "Panika zachodzi w dołączonym workerze, a główny wątek sprawdza Err dopiero po join. into_inner służy tu do pokazania danych diagnostycznych, nie do automatycznej naprawy.",
        `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let state = Arc::new(Mutex::new(1u32));
    let worker_state = Arc::clone(&state);
    let worker = thread::spawn(move || {
        let mut guard = worker_state.lock().unwrap();
        *guard = 99;
        panic!("celowa panika");
    });
    assert!(worker.join().is_err());
    match state.lock() {
        Err(poisoned) => println!("poison: {}", *poisoned.into_inner()),
        Ok(_) => println!("brak poison"),
    }
}`,
        "poison: 99\n",
      ),
      choose(
        "mutex-recovery-explain",
        "explain",
        "Wybierz politykę poison",
        "Masz `Err(poisoned)` i licznik, którego niezmiennik mówi `0..=100`. Co robisz, gdy odczyt wynosi 55?",
        2,
        [
          "Zawsze wywołujesz into_inner i clear_poison, bo Mutex już pilnuje danych",
          "Ignorujesz wynik lock i tworzysz nowy Mutex lokalnie",
          "Przejmujesz guard, sprawdzasz zakres, ustawiasz kanoniczne 0, dopiero potem clear_poison",
        ],
        [
          "into_inner nie weryfikuje niezmiennika, a clear_poison nie naprawia stanu.",
          "Nowy lokalny Mutex nie naprawia ani nie zastępuje współdzielonego stanu.",
          "Naprawa jest jawna: najpierw dowód poprawności i zapis kanoniczny, potem usunięcie ostrzeżenia.",
        ],
      ),
      choose(
        "mutex-recovery-distinguish",
        "recall",
        "Rozróżnij błąd od danych",
        "Co gwarantuje `PoisonError::into_inner()`?",
        1,
        [
          "Że dane są poprawne i można bezwarunkowo wznowić pracę",
          "Dostęp do guarda mimo poison; poprawność danych nadal musi sprawdzić program",
          "Automatyczne wywołanie clear_poison po opuszczeniu guarda",
        ],
        [
          "Poison sygnalizuje ryzyko. Ani into_inner, ani brak flagi poison nie dowodzą poprawności niezmiennika.",
          "into_inner omija domyślną odmowę i oddaje guard do jawnej inspekcji lub naprawy.",
          "clear_poison jest osobną, świadomą operacją i nie uruchamia się automatycznie.",
        ],
      ),
      exercise({
        id: "mutex-recovery-propagate-gate",
        kind: "debug",
        title: "Propaguj skażenie",
        prompt:
          'Napraw `read_after_worker`, aby po poisoned Mutex zwracał `Err("zatruty stan")`, a po zwykłym locku wartość. Test tworzy poison przez dołączonego panikującego workera; nie używaj ślepego `into_inner`.',
        code: propagateStarter,
        solution: propagateSolution,
        tests: poisonTests,
        hints: [
          "Dopasuj Result z `state.lock()` zamiast ukrywać PoisonError wartością zastępczą.",
          "Sukces mapuj do skopiowanej liczby, a każdy Err z lock zamień na dokładny komunikat.",
        ],
        gate: true,
      }),
      exercise({
        id: "mutex-recovery-repair-blank",
        kind: "blank",
        title: "Napraw kanoniczny licznik",
        prompt:
          "Od pustej kartki napisz funkcję `repair_counter`, która przyjmuje `&Mutex<u32>` i zwraca `Result<u32, &'static str>`. Po zwykłym locku i po poison zaakceptuj tylko stan `<= 100`; dla poprawnego stanu ustaw kanoniczne 0, zwróć Ok(0) i wywołaj clear_poison dopiero po zapisie. Dla każdej wartości powyżej 100 zwróć Err z tekstem `poza zakresem` i pozostaw wartość oraz poison bez zmian.",
        solution: repairSolution,
        tests: repairTests,
        hints: [
          "Rozdziel ścieżkę zdrowego locka od ścieżki PoisonError i zweryfikuj istniejący stan przed podjęciem decyzji.",
          "Kanoniczny zapis i usunięcie ostrzeżenia muszą nastąpić po udanej weryfikacji; przy odmowie zachowaj dane i poison.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Poison automatycznie cofa wszystkie zapisy wykonane przed paniką.",
      "into_inner jest dowodem, że payload ma poprawny niezmiennik.",
      "clear_poison naprawia wartość samym wywołaniem.",
      "Po pierwszym join można przerwać i nie dołączać pozostałych workerów.",
    ],
    transferTask:
      "Zdefiniuj politykę dla wspólnego salda: propaguj poison do wywołującego albo napraw wyłącznie stan, który potrafisz sprawdzić i sprowadzić do kanonicznej wartości.",
    evidenceGate:
      "mutex-recovery-propagate-gate sprawdza deterministyczny poison po join i propagowanie błędu, a mutex-recovery-repair-blank sprawdza naprawę, clear_poison po sukcesie i odmowę bez zmiany.",
    sourceIds: [
      "synchronized-state-std-mutex",
      "synchronized-state-std-poison-error",
      "synchronized-state-book-shared-state",
    ],
  },
];

export const synchronizedStateReviewExercises: Record<string, LessonStep> = {
  "send-sync": exercise({
    id: "review-send-sync",
    kind: "apply",
    title: "Powtórka: oddaj Send przez join",
    prompt:
      "Dokończ `round_trip`, aby jeden wątek obejrzał pożyczoną wartość przez callback, a następnie zwrócił jej własność przez join. Obserwacja ma nastąpić dokładnie raz; callback i dane mogą nie implementować Clone.",
    code: `use std::thread;

fn round_trip<T, F>(value: T, inspect: F) -> T
where T: Send + 'static, F: FnOnce(&T) + Send + 'static {
    panic!("uzupełnij transfer przez wątek")
}`,
    solution: `use std::thread;

fn round_trip<T, F>(value: T, inspect: F) -> T
where T: Send + 'static, F: FnOnce(&T) + Send + 'static {
    thread::spawn(move || { inspect(&value); value }).join().unwrap()
}`,
    tests: `#[test]
fn review_send_keeps_generic_identity() {
    struct Token(u8);
    let parent = thread::current().id();
    let (sender, receiver) = std::sync::mpsc::channel();
    let capture = Token(9);
    let value = round_trip(Token(17), move |value| {
        let consumed = capture;
        sender.send((value.0 + consumed.0, thread::current().id())).unwrap();
    });
    assert_eq!(value.0, 17);
    let (sum, worker) = receiver.recv().unwrap();
    assert_eq!(sum, 26);
    assert_ne!(worker, parent);
    assert!(matches!(receiver.try_recv(), Err(std::sync::mpsc::TryRecvError::Disconnected)));
}`,
    hints: [
      "Przeniesienie zachodzi przez closure wątku, a wynik wraca dopiero po join.",
      "Callback potrzebuje tylko pożyczki, więc własność może później wrócić jako wynik pracy wątku.",
    ],
  }),
  "mutex-state": exercise({
    id: "review-mutex-state",
    kind: "apply",
    title: "Powtórka: bezpieczny przyrost",
    prompt:
      'Dokończ `try_add`, aby checked_add zwracał Err("przepełnienie") i nie zmieniał Mutex przy overflow. Test sprawdza także zwykły przyrost.',
    code: `use std::sync::Mutex;

fn try_add(state: &Mutex<u32>, amount: u32) -> Result<u32, &'static str> {
    Ok(*state.lock().unwrap())
}`,
    solution: `use std::sync::Mutex;

fn try_add(state: &Mutex<u32>, amount: u32) -> Result<u32, &'static str> {
    let mut guard = state.lock().unwrap();
    let next = guard.checked_add(amount).ok_or("przepełnienie")?;
    *guard = next;
    Ok(next)
}`,
    tests: `#[test]
fn review_mutex_rejects_overflow_without_partial_write() {
    let state = Mutex::new(8);
    assert_eq!(try_add(&state, 2), Ok(10));
    assert_eq!(*state.lock().unwrap(), 10);
    assert_eq!(try_add(&state, 0), Ok(10));
    let full = Mutex::new(u32::MAX);
    assert_eq!(try_add(&full, 1), Err("przepełnienie"));
    assert_eq!(*full.lock().unwrap(), u32::MAX);
}`,
    hints: [
      "Guard daje dostęp do liczby, ale Mutex nie zna reguły overflow.",
      "Oblicz next przed zapisem i użyj `?`, aby Err ominął przypisanie.",
    ],
  }),
  "mutex-recovery": exercise({
    id: "review-mutex-recovery",
    kind: "apply",
    title: "Powtórka: jawna naprawa poison",
    prompt:
      "Dokończ `recover`, aby z poisoned Mutex przejąć guard, ustawić 0 wyłącznie dla wartości <= 10 i dopiero wtedy wyczyścić poison. Dla każdej wartości powyżej 10 zwróć Err z tekstem `poza zakresem` bez zmiany wartości ani flagi poison.",
    code: `use std::sync::Mutex;

fn recover(state: &Mutex<u32>) -> Result<u32, &'static str> {
    Ok(*state.lock().unwrap_or_else(|poisoned| poisoned.into_inner()))
}`,
    solution: `use std::sync::Mutex;

fn recover(state: &Mutex<u32>) -> Result<u32, &'static str> {
    let mut guard = match state.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if *guard > 10 {
        return Err("poza zakresem");
    }
    *guard = 0;
    state.clear_poison();
    Ok(*guard)
}`,
    tests: `#[test]
fn review_recovery_requires_verified_state() {
    let valid = std::sync::Arc::new(Mutex::new(7));
    let valid_worker_state = std::sync::Arc::clone(&valid);
    let valid_worker = std::thread::spawn(move || {
        let _guard = valid_worker_state.lock().unwrap();
        panic!("celowa panika valid");
    });
    assert!(valid_worker.join().is_err());
    assert!(valid.is_poisoned());
    assert_eq!(recover(&valid), Ok(0));
    assert!(!valid.is_poisoned());
    assert_eq!(*valid.lock().unwrap(), 0);

    let invalid = std::sync::Arc::new(Mutex::new(20));
    let invalid_worker_state = std::sync::Arc::clone(&invalid);
    let invalid_worker = std::thread::spawn(move || {
        let _guard = invalid_worker_state.lock().unwrap();
        panic!("celowa panika invalid");
    });
    assert!(invalid_worker.join().is_err());
    assert!(invalid.is_poisoned());
    assert_eq!(recover(&invalid), Err("poza zakresem"));
    assert!(invalid.is_poisoned());
    match invalid.lock() {
        Err(poisoned) => assert_eq!(*poisoned.into_inner(), 20),
        Ok(_) => panic!("odmowa naprawy nie może czyścić poison"),
    }
}`,
    hints: [
      "PoisonError::into_inner oddaje guard, lecz nie gwarantuje poprawności liczby.",
      "Sprawdź zakres przed zapisem i wywołaj clear_poison dopiero po ustawieniu kanonicznego 0.",
    ],
  }),
};

export const synchronizedStateModule: CourseModule = {
  id: "synchronized-state",
  title: "Wspólny stan: Send, Arc i Mutex",
  whyItMatters:
    "Wątki mogą bezpiecznie przenosić wartości i współdzielić stan, gdy typy spełniają Send i Sync, własność jest opisana przez Arc, a mutacja ma krótką sekcję Mutex z jawną polityką błędu.",
  capabilities: [
    "Rozróżniasz Send i Sync oraz wyjaśniasz Rc, Arc i Arc<RefCell<T>> przez boundy.",
    "Budujesz krótkie sekcje MutexGuard, sprawdzasz update i zwalniasz guard przed callbackiem lub join.",
    "Propagujesz poison albo naprawiasz sprawdzony niezmiennik przed clear_poison.",
  ],
  prerequisites: ["channels"],
  lessonIds: synchronizedStateLessons.map((lesson) => lesson.id),
  exitGate: [
    "Send przenosi własność, Sync dotyczy bezpiecznego wysłania &T, Rc jest odrzucane przez E0277, a Arc nie dodaje bezpieczeństwa payloadu.",
    "MutexGuard obejmuje sprawdzenie i zapis aktualizacji; callback działa po zwolnieniu własnego guarda, a wszystkie dzieci są dołączone przed odczytem wyniku lub propagacją paniki.",
    "Poison jest jawnie propagowany albo naprawiany do sprawdzonego stanu kanonicznego przed clear_poison; odmowa pozostawia dane bez zmian.",
  ],
  projectConnection:
    "W rozszerzeniu istniejącego analizatora logów te wzorce pozwolą przekazać rekordy kanałem, współdzielić mały indeks między workerami i bezpiecznie obsłużyć przerwanie aktualizacji.",
  assessmentId: "mutex-recovery/mutex-recovery-repair-blank",
  gateCriteria: [
    {
      id: "synchronized-state-send-sync-gate",
      label:
        "Własność przechodzi między wątkami przez Send, a callback ma dowód ThreadId po join.",
      taskRefs: [
        { lessonId: "send-sync", stepId: "send-sync-transfer-gate" },
        { lessonId: "send-sync", stepId: "send-sync-thread-id-blank" },
      ],
    },
    {
      id: "synchronized-state-mutex-state-gate",
      label:
        "Krótki Mutex update zachowuje niezmiennik, zwalnia guard przed callbackiem i agreguje wynik po wszystkich workerach.",
      taskRefs: [
        { lessonId: "mutex-state", stepId: "mutex-state-callback-gate" },
        { lessonId: "mutex-state", stepId: "mutex-state-aggregate-blank" },
      ],
    },
    {
      id: "synchronized-state-mutex-recovery-gate",
      label:
        "Poison jest propagowany albo naprawiany dopiero po weryfikacji, z zachowaniem wartości przy odmowie.",
      taskRefs: [
        { lessonId: "mutex-recovery", stepId: "mutex-recovery-propagate-gate" },
        { lessonId: "mutex-recovery", stepId: "mutex-recovery-repair-blank" },
      ],
    },
  ],
};
