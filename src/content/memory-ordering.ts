import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const memoryOrderingSources: Source[] = [
  {
    id: "memory-ordering-std-ordering",
    title: "Rust standard library: std::sync::atomic::Ordering",
    url: "https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wariantów Ordering, reguł Release/Acquire, RMW albo CAS success/failure.",
  },
  {
    id: "memory-ordering-std-atomic-usize",
    title: "Rust standard library: std::sync::atomic::AtomicUsize",
    url: "https://doc.rust-lang.org/std/sync/atomic/type.AtomicUsize.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie dostępności metod load, store, fetch_* lub compare_exchange dla AtomicUsize.",
  },
  {
    id: "memory-ordering-std-atomic-compare-exchange",
    title: "Rust standard library: Atomic::compare_exchange",
    url: "https://doc.rust-lang.org/std/sync/atomic/struct.Atomic.html#method.compare_exchange",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie listy legalnych Ordering success/failure albo zachowania compare_exchange przy sukcesie i mismatch.",
  },
  {
    id: "memory-ordering-loom-guide",
    title: "Loom 0.7.2 documentation: testing concurrent programs",
    url: "https://docs.rs/loom/0.7.2/loom/",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji wersji Loom, modelu pamięci, wymogu podmiany prymitywów albo ograniczeń modelu.",
  },
  {
    id: "memory-ordering-loom-atomic-usize",
    title: "Loom 0.7.2: loom::sync::atomic::AtomicUsize",
    url: "https://docs.rs/loom/0.7.2/loom/sync/atomic/struct.AtomicUsize.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie zgodności API loom::sync::atomic::AtomicUsize ze std::sync::atomic.",
  },
];

export const memoryOrderingCompetencies: Competency[] = [
  {
    id: "design-release-acquire-publication",
    title:
      "Projektujesz jednorazową publikację payloadu i flagi, wskazując dokładnie, kiedy Acquire czyta wartość zapisaną przez Release.",
  },
  {
    id: "validate-atomic-ordering-contracts",
    title:
      "Dobierasz legalne Ordering dla load, store, RMW i CAS oraz rozpoznajesz, że SeqCst porządkuje atomiki, ale nie tworzy transakcji.",
  },
  {
    id: "interpret-loom-evidence",
    title:
      "Budujesz mały model z ograniczonymi scenariuszami, odróżniasz dowód z Loom od testu stresowego i uczciwie opisujesz granice wniosku.",
  },
];

export const memoryOrderingConcepts: Concept[] = [
  {
    id: "release-acquire",
    title: "Release publikuje wcześniejsze zapisy, Acquire odbiera publikację",
    prerequisites: ["atomic-limits"],
    competencyIds: ["design-release-acquire-publication"],
    reviewPrompt:
      "Kiedy `payload.store(..., Relaxed)` przed `ready.store(true, Release)` może być odczytany po `ready.load(Acquire)`?",
    reviewAnswer:
      "Gdy Acquire odczyta wartość flagi zapisaną przez ten Release albo przez jego Release-sekwencję. Wtedy wcześniejszy zapis payloadu jest uporządkowany przed późniejszym odczytem payloadu. Samo zobaczenie true nie wystarczy, jeśli load nie odczytał zapisu Release.",
    distinguish:
      "Release/Acquire tworzy relację publikacji przez konkretną wartość atomiczną. Nie jest to globalna blokada ani transakcja; flaga może pozostać false, a Relaxed nie publikuje sąsiednich danych.",
  },
  {
    id: "ordering-contracts",
    title: "Ordering opisuje operację, a CAS ma osobne success i failure",
    prerequisites: ["release-acquire"],
    competencyIds: ["validate-atomic-ordering-contracts"],
    reviewPrompt:
      "Jakie uporządkowania są legalne dla load i store, co opisuje success/failure CAS i co zmienia Acquire na RMW?",
    reviewAnswer:
      "Load przyjmuje Relaxed, Acquire lub SeqCst, a store Relaxed, Release lub SeqCst. Sukces CAS opisuje RMW i może użyć każdego z pięciu Ordering; porażka opisuje tylko load i może użyć wyłącznie Relaxed, Acquire albo SeqCst. Acquire na RMW czyni część store Relaxed, a Release czyni część load Relaxed.",
    distinguish:
      "RMW łączy odczyt i zapis, lecz jedno Ordering nie oznacza dwóch niezależnie silnych połówek. SeqCst dodaje wspólny total order operacji SeqCst; nie sprawia, że kilka pól zmienia się atomowo jako rekord.",
  },
  {
    id: "loom-evidence",
    title: "Loom przeszukuje mały model, gdy program podmienia prymitywy",
    prerequisites: ["ordering-contracts"],
    competencyIds: ["interpret-loom-evidence"],
    reviewPrompt:
      "Dlaczego milion powtórzeń testu stresowego nie zastępuje małego modelu Loom i czego mimo to model Loom nie dowodzi?",
    reviewAnswer:
      "Stres losowo trafia w część harmonogramów i może nigdy nie pokazać rzadkiego przeplotu ani słabej kolejności. Loom systematycznie przechodzi dopuszczalne przeploty małego modelu, jeśli kod używa jego zastępczych atomików, wątków i współdzielenia. Nie obejmuje kodu ukrytego za std, wszystkich dozwolonych przestawień Relaxed ani wszystkich rozmiarów i konfiguracji sprzętu.",
    distinguish:
      "Loom daje dowód dla zdefiniowanego modelu i asercji, a nie magiczny dowód całego Rust memory model. Test standardowy sprawdza adapter i semantykę funkcji; test Loom w osobnym projekcie sprawdza przeploty po podmianie prymitywów.",
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

const publicationRun = `use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let payload = Arc::new(AtomicUsize::new(0));
    let ready = Arc::new(AtomicBool::new(false));
    let worker_payload = Arc::clone(&payload);
    let worker_ready = Arc::clone(&ready);
    let worker = thread::spawn(move || {
        worker_payload.store(42, Ordering::Relaxed);
        worker_ready.store(true, Ordering::Release);
    });
    worker.join().unwrap();
    let observed = ready.load(Ordering::Acquire);
    let value = payload.load(Ordering::Relaxed);
    println!("ready={observed} payload={value}");
}`;

const publicationGateStarter = `use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

pub trait PublicationOps {
    fn store_payload(&self, value: usize, ordering: Ordering);
    fn store_ready(&self, value: bool, ordering: Ordering);
    fn load_ready(&self, ordering: Ordering) -> bool;
    fn load_payload(&self, ordering: Ordering) -> usize;
}

pub struct StdPublication {
    payload: AtomicUsize,
    ready: AtomicBool,
}

impl StdPublication {
    pub fn new() -> Self {
        Self {
            payload: AtomicUsize::new(0),
            ready: AtomicBool::new(false),
        }
    }
}

impl PublicationOps for StdPublication {
    fn store_payload(&self, value: usize, ordering: Ordering) {
        self.payload.store(value, ordering);
    }
    fn store_ready(&self, value: bool, ordering: Ordering) {
        self.ready.store(value, ordering);
    }
    fn load_ready(&self, ordering: Ordering) -> bool {
        self.ready.load(ordering)
    }
    fn load_payload(&self, ordering: Ordering) -> usize {
        self.payload.load(ordering)
    }
}

pub fn publish_once<P: PublicationOps>(publication: &P, value: usize) {
    let _ = (publication, value);
}

pub fn observe_once<P: PublicationOps>(publication: &P) -> Option<usize> {
    let _ = publication;
    None
}`;

const publicationGateSolution = `use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

pub trait PublicationOps {
    fn store_payload(&self, value: usize, ordering: Ordering);
    fn store_ready(&self, value: bool, ordering: Ordering);
    fn load_ready(&self, ordering: Ordering) -> bool;
    fn load_payload(&self, ordering: Ordering) -> usize;
}

pub struct StdPublication {
    payload: AtomicUsize,
    ready: AtomicBool,
}

impl StdPublication {
    pub fn new() -> Self {
        Self {
            payload: AtomicUsize::new(0),
            ready: AtomicBool::new(false),
        }
    }
}

impl PublicationOps for StdPublication {
    fn store_payload(&self, value: usize, ordering: Ordering) {
        self.payload.store(value, ordering);
    }
    fn store_ready(&self, value: bool, ordering: Ordering) {
        self.ready.store(value, ordering);
    }
    fn load_ready(&self, ordering: Ordering) -> bool {
        self.ready.load(ordering)
    }
    fn load_payload(&self, ordering: Ordering) -> usize {
        self.payload.load(ordering)
    }
}

pub fn publish_once<P: PublicationOps>(publication: &P, value: usize) {
    publication.store_payload(value, Ordering::Relaxed);
    publication.store_ready(true, Ordering::Release);
}

pub fn observe_once<P: PublicationOps>(publication: &P) -> Option<usize> {
    if publication.load_ready(Ordering::Acquire) {
        Some(publication.load_payload(Ordering::Relaxed))
    } else {
        None
    }
}`;

const publicationGateTests = `#[test]
fn publication_probe_records_ordering_and_real_payload() {
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { payload: AtomicUsize, ready: AtomicBool, payload_loads: AtomicUsize, calls: Mutex<Vec<String>> }
    impl Probe { fn new(payload: usize) -> Self { Self { payload: AtomicUsize::new(payload), ready: AtomicBool::new(false), payload_loads: AtomicUsize::new(0), calls: Mutex::new(Vec::new()) } } }
    impl PublicationOps for Probe {
        fn store_payload(&self, value: usize, ordering: Ordering) { self.payload.store(value, ordering); self.calls.lock().unwrap().push(format!("store_payload:{ordering:?}:{value}")); }
        fn store_ready(&self, value: bool, ordering: Ordering) { self.ready.store(value, ordering); self.calls.lock().unwrap().push(format!("store_ready:{ordering:?}:{value}")); }
        fn load_ready(&self, ordering: Ordering) -> bool { let value = self.ready.load(ordering); self.calls.lock().unwrap().push(format!("load_ready:{ordering:?}:{value}")); value }
        fn load_payload(&self, ordering: Ordering) -> usize { self.payload_loads.fetch_add(1, Ordering::Relaxed); let value = self.payload.load(ordering); self.calls.lock().unwrap().push(format!("load_payload:{ordering:?}:{value}")); value }
    }
    for value in [0, usize::MAX] {
        let publication = Probe::new(value);
        publish_once(&publication, value);
        assert_eq!(observe_once(&publication), Some(value));
        assert_eq!(*publication.calls.lock().unwrap(), vec![format!("store_payload:Relaxed:{value}"), "store_ready:Release:true".to_string(), "load_ready:Acquire:true".to_string(), format!("load_payload:Relaxed:{value}")]);
    }
}

#[test]
fn publication_probe_does_not_read_payload_when_flag_is_false() {
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { payload: AtomicUsize, ready: AtomicBool, payload_loads: AtomicUsize, calls: Mutex<Vec<String>> }
    impl PublicationOps for Probe {
        fn store_payload(&self, value: usize, ordering: Ordering) { self.payload.store(value, ordering); self.calls.lock().unwrap().push(format!("store_payload:{ordering:?}:{value}")); }
        fn store_ready(&self, value: bool, ordering: Ordering) { self.ready.store(value, ordering); self.calls.lock().unwrap().push(format!("store_ready:{ordering:?}:{value}")); }
        fn load_ready(&self, ordering: Ordering) -> bool { let value = self.ready.load(ordering); self.calls.lock().unwrap().push(format!("load_ready:{ordering:?}:{value}")); value }
        fn load_payload(&self, ordering: Ordering) -> usize { self.payload_loads.fetch_add(1, Ordering::Relaxed); self.payload.load(ordering) }
    }
    let publication = Probe { payload: AtomicUsize::new(99), ready: AtomicBool::new(false), payload_loads: AtomicUsize::new(0), calls: Mutex::new(Vec::new()) };
    assert_eq!(observe_once(&publication), None);
    assert_eq!(publication.payload_loads.load(Ordering::Relaxed), 0);
    assert_eq!(*publication.calls.lock().unwrap(), vec!["load_ready:Acquire:false"]);
}

#[test]
fn std_publication_is_a_real_value_contract() {
    let publication = StdPublication::new();
    publish_once(&publication, 17);
    assert_eq!(observe_once(&publication), Some(17));
}`;

const publicationBlankSolution = `use std::sync::atomic::Ordering;

pub trait ReceiptPort {
    fn load_state(&self, ordering: Ordering) -> u8;
    fn read_payload(&self, ordering: Ordering) -> usize;
    fn acknowledge(&self, ordering: Ordering);
}

pub fn receive_once<P: ReceiptPort>(port: &P) -> Option<usize> {
    if port.load_state(Ordering::Acquire) != 1 {
        return None;
    }
    let payload = port.read_payload(Ordering::Relaxed);
    port.acknowledge(Ordering::Release);
    Some(payload)
}`;

const publicationBlankTests = `#[test]
fn blank_receipt_observes_payload_then_acknowledges() {
    use std::sync::atomic::{AtomicU8, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { state: AtomicU8, payload: AtomicUsize, calls: Mutex<Vec<String>> }
    impl Probe { fn new(state: u8, payload: usize) -> Self { Self { state: AtomicU8::new(state), payload: AtomicUsize::new(payload), calls: Mutex::new(Vec::new()) } } }
    impl ReceiptPort for Probe {
        fn load_state(&self, ordering: Ordering) -> u8 { let value = self.state.load(ordering); self.calls.lock().unwrap().push(format!("load_state:{ordering:?}:{value}")); value }
        fn read_payload(&self, ordering: Ordering) -> usize { let value = self.payload.load(ordering); self.calls.lock().unwrap().push(format!("read_payload:{ordering:?}:{value}")); value }
        fn acknowledge(&self, ordering: Ordering) { self.state.store(2, ordering); self.calls.lock().unwrap().push(format!("acknowledge:{ordering:?}")); }
    }
    for value in [0, usize::MAX] {
        let port = Probe::new(1, value);
        assert_eq!(receive_once(&port), Some(value));
        assert_eq!(*port.calls.lock().unwrap(), vec![format!("load_state:Acquire:1"), format!("read_payload:Relaxed:{value}"), "acknowledge:Release".to_string()]);
        assert_eq!(receive_once(&port), None);
        assert_eq!(*port.calls.lock().unwrap().last().unwrap(), "load_state:Acquire:2");
    }
}

#[test]
fn blank_receipt_does_not_read_or_ack_pending_state() {
    use std::sync::atomic::{AtomicU8, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { state: AtomicU8, payload: AtomicUsize, reads: AtomicUsize, acks: AtomicUsize, calls: Mutex<Vec<String>> }
    impl ReceiptPort for Probe {
        fn load_state(&self, ordering: Ordering) -> u8 { let value = self.state.load(ordering); self.calls.lock().unwrap().push(format!("load_state:{ordering:?}:{value}")); value }
        fn read_payload(&self, ordering: Ordering) -> usize { self.reads.fetch_add(1, Ordering::Relaxed); self.payload.load(ordering) }
        fn acknowledge(&self, ordering: Ordering) { self.acks.fetch_add(1, Ordering::Relaxed); self.state.store(2, ordering); }
    }
    for state in [0, 2] {
        let port = Probe { state: AtomicU8::new(state), payload: AtomicUsize::new(55), reads: AtomicUsize::new(0), acks: AtomicUsize::new(0), calls: Mutex::new(Vec::new()) };
        assert_eq!(receive_once(&port), None);
        assert_eq!(port.reads.load(Ordering::Relaxed), 0);
        assert_eq!(port.acks.load(Ordering::Relaxed), 0);
    }
}`;

const orderingRun = `use std::sync::atomic::Ordering;

fn main() {
    let names = [
        ("load", Ordering::Relaxed),
        ("load", Ordering::Acquire),
        ("load", Ordering::SeqCst),
        ("store", Ordering::Relaxed),
        ("store", Ordering::Release),
        ("store", Ordering::SeqCst),
    ];
    for (operation, ordering) in names {
        println!("{operation}:{ordering:?}");
    }
}`;

const orderingGateStarter = `use std::sync::atomic::Ordering;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Operation {
    Load,
    Store,
    ReadModifyWrite,
    CasSuccess,
    CasFailure,
}

pub fn ordering_allowed(operation: Operation, ordering: Ordering) -> bool {
    let _ = (operation, ordering);
    true
}

pub fn compare_exchange_allowed(success: Ordering, failure: Ordering) -> bool {
    let _ = success;
    matches!(failure, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst)
}`;

const orderingGateSolution = `use std::sync::atomic::Ordering;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Operation {
    Load,
    Store,
    ReadModifyWrite,
    CasSuccess,
    CasFailure,
}

pub fn ordering_allowed(operation: Operation, ordering: Ordering) -> bool {
    match operation {
        Operation::Load => matches!(ordering, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst),
        Operation::Store => matches!(ordering, Ordering::Relaxed | Ordering::Release | Ordering::SeqCst),
        Operation::ReadModifyWrite | Operation::CasSuccess => matches!(
            ordering,
            Ordering::Relaxed | Ordering::Acquire | Ordering::Release | Ordering::AcqRel | Ordering::SeqCst
        ),
        Operation::CasFailure => matches!(ordering, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst),
        _ => false,
    }
}

pub fn compare_exchange_allowed(success: Ordering, failure: Ordering) -> bool {
    let _ = success;
    matches!(failure, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst)
}`;

const orderingGateTests = `#[test]
fn ordering_contracts_cover_load_store_and_rmw() {
    let all = [Ordering::Relaxed, Ordering::Acquire, Ordering::Release, Ordering::AcqRel, Ordering::SeqCst];
    for ordering in all {
        assert_eq!(ordering_allowed(Operation::Load, ordering), matches!(ordering, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst));
        assert_eq!(ordering_allowed(Operation::Store, ordering), matches!(ordering, Ordering::Relaxed | Ordering::Release | Ordering::SeqCst));
        assert!(ordering_allowed(Operation::ReadModifyWrite, ordering));
        assert!(ordering_allowed(Operation::CasSuccess, ordering));
        assert_eq!(ordering_allowed(Operation::CasFailure, ordering), matches!(ordering, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst));
    }
}

#[test]
fn ordering_contracts_check_all_cas_pairs_and_real_operations() {
    let all = [Ordering::Relaxed, Ordering::Acquire, Ordering::Release, Ordering::AcqRel, Ordering::SeqCst];
    let failures = [Ordering::Relaxed, Ordering::Acquire, Ordering::SeqCst];
    for success in all {
        for failure in all {
            assert_eq!(compare_exchange_allowed(success, failure), failures.contains(&failure));
        }
        for failure in failures {
            assert!(compare_exchange_allowed(success, failure));
            let value = std::sync::atomic::AtomicUsize::new(0);
            assert_eq!(value.compare_exchange(0, 1, success, failure), Ok(0));
            assert_eq!(value.compare_exchange(0, 2, success, failure), Err(1));
        }
    }
}`;

const casBlankSolution = `use std::sync::atomic::{AtomicUsize, Ordering};

fn compare_exchange_allowed(success: Ordering, failure: Ordering) -> bool {
    let _ = success;
    matches!(failure, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst)
}

pub fn bounded_compare_exchange(
    value: &AtomicUsize,
    expected: usize,
    replacement: usize,
    success: Ordering,
    failure: Ordering,
) -> Result<usize, &'static str> {
    if !compare_exchange_allowed(success, failure) {
        return Err("nielegalne uporządkowanie CAS");
    }
    value
        .compare_exchange(expected, replacement, success, failure)
        .map_err(|_| "oczekiwana wartość różna")
}`;

const casBlankTests = `#[test]
fn blank_cas_handles_all_twenty_five_pairs() {
    let all = [Ordering::Relaxed, Ordering::Acquire, Ordering::Release, Ordering::AcqRel, Ordering::SeqCst];
    let valid_failures = [Ordering::Relaxed, Ordering::Acquire, Ordering::SeqCst];
    for success in all {
        for failure in valid_failures {
            let value = std::sync::atomic::AtomicUsize::new(4);
            assert_eq!(bounded_compare_exchange(&value, 4, 9, success, failure), Ok(4));
            assert_eq!(bounded_compare_exchange(&value, 4, 11, success, failure), Err("oczekiwana wartość różna"));
            assert_eq!(value.load(Ordering::Relaxed), 9);
        }
        for failure in [Ordering::Release, Ordering::AcqRel] {
            let value = std::sync::atomic::AtomicUsize::new(4);
            assert_eq!(bounded_compare_exchange(&value, 4, 9, success, failure), Err("nielegalne uporządkowanie CAS"));
            assert_eq!(value.load(Ordering::Relaxed), 4);
        }
    }
}

#[test]
fn blank_cas_accepts_zero_and_rejects_release_failure() {
    let value = std::sync::atomic::AtomicUsize::new(0);
    assert_eq!(bounded_compare_exchange(&value, 0, 0, Ordering::Relaxed, Ordering::Relaxed), Ok(0));
    assert_eq!(bounded_compare_exchange(&value, 0, 1, Ordering::Acquire, Ordering::Release), Err("nielegalne uporządkowanie CAS"));
}`;

const loomGateStarter = `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Observation {
    Published(usize),
    NotReady,
    Inconsistent,
}

pub fn assert_model_evidence(observations: &[Observation], expected_payload: usize) {
    let _ = (observations, expected_payload);
}`;

const loomGateSolution = `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Observation {
    Published(usize),
    NotReady,
    Inconsistent,
}

pub fn assert_model_evidence(observations: &[Observation], expected_payload: usize) {
    assert!(!observations.is_empty(), "brak sprawdzonych scenariuszy");
    assert!(
        !observations.iter().any(|observation| *observation == Observation::Inconsistent),
        "model dopuścił niespójny payload"
    );
    assert!(
        observations.iter().any(|observation| *observation == Observation::Published(expected_payload)),
        "brak obserwacji opublikowanego payloadu"
    );
    assert!(
        observations.iter().all(|observation| match observation {
            Observation::NotReady => true,
            Observation::Published(value) => *value == expected_payload,
            Observation::Inconsistent => false,
        }),
        "obserwacja ma nieoczekiwany payload"
    );
}`;

const loomGateTests = `#[test]
fn model_evidence_accepts_only_expected_outcomes() {
    assert_model_evidence(
        &[Observation::NotReady, Observation::Published(7)],
        7,
    );
    assert_model_evidence(&[Observation::Published(0)], 0);
}

#[test]
fn model_evidence_rejects_empty_inconclusive_and_inconsistent_runs() {
    for observations in [
        vec![],
        vec![Observation::NotReady],
        vec![Observation::Published(8)],
        vec![Observation::Inconsistent],
    ] {
        let result = std::panic::catch_unwind(|| assert_model_evidence(&observations, 7));
        assert!(result.is_err());
    }
}

#[test]
fn one_valid_publication_cannot_hide_a_contradictory_observation() {
    for contradictory in [Observation::Published(8), Observation::Inconsistent] {
        for observations in [
            vec![Observation::Published(7), contradictory],
            vec![contradictory, Observation::Published(7)],
        ] {
            assert!(std::panic::catch_unwind(|| assert_model_evidence(&observations, 7)).is_err());
        }
    }
    assert_model_evidence(&[Observation::Published(7), Observation::NotReady, Observation::Published(7)], 7);
}`;

const boundedModelSolution = `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    Read(usize),
    Write(usize),
}

pub fn replay(initial: usize, schedule: &[Action]) -> Result<usize, &'static str> {
    if schedule.len() != 4 {
        return Err("harmonogram musi mieć cztery kroki");
    }
    let mut read = [false; 2];
    let mut write = [false; 2];
    let mut saved = [0usize; 2];
    let mut value = initial;
    for action in schedule {
        match *action {
            Action::Read(thread) if thread < 2 => {
                if read[thread] { return Err("powtórny odczyt"); }
                read[thread] = true;
                saved[thread] = value;
            }
            Action::Read(_) => return Err("nieznany wątek"),
            Action::Write(thread) if thread < 2 => {
                if !read[thread] { return Err("zapis przed odczytem"); }
                if write[thread] { return Err("powtórny zapis"); }
                write[thread] = true;
                value = saved[thread].checked_add(1).ok_or("przepełnienie")?;
            }
            Action::Write(_) => return Err("nieznany wątek"),
        }
    }
    if read != [true; 2] || write != [true; 2] {
        return Err("niepełny harmonogram");
    }
    Ok(value)
}`;

const boundedModelTests = `#[test]
fn replay_accepts_all_six_two_thread_interleavings() {
    let schedules = [
        [Action::Read(0), Action::Write(0), Action::Read(1), Action::Write(1)],
        [Action::Read(0), Action::Read(1), Action::Write(0), Action::Write(1)],
        [Action::Read(0), Action::Read(1), Action::Write(1), Action::Write(0)],
        [Action::Read(1), Action::Write(1), Action::Read(0), Action::Write(0)],
        [Action::Read(1), Action::Read(0), Action::Write(1), Action::Write(0)],
        [Action::Read(1), Action::Read(0), Action::Write(0), Action::Write(1)],
    ];
    let results: Vec<_> = schedules.iter().map(|schedule| replay(1, schedule)).collect();
    assert_eq!(results, vec![Ok(3), Ok(2), Ok(2), Ok(3), Ok(2), Ok(2)]);
    assert_eq!(replay(0, &schedules[0]), Ok(2));
    assert_eq!(replay(9, &schedules[3]), Ok(11));
    assert_eq!(replay(0, &schedules[1]), Ok(1));
}

#[test]
fn replay_rejects_duplicate_out_of_range_incomplete_and_overflow() {
    assert_eq!(replay(1, &[Action::Read(0), Action::Read(0), Action::Write(0), Action::Write(1)]), Err("powtórny odczyt"));
    assert_eq!(replay(1, &[Action::Read(0), Action::Write(0), Action::Write(0), Action::Read(1)]), Err("powtórny zapis"));
    assert_eq!(replay(1, &[Action::Read(2), Action::Write(2), Action::Read(1), Action::Write(1)]), Err("nieznany wątek"));
    assert_eq!(replay(1, &[Action::Write(0), Action::Read(0), Action::Read(1), Action::Write(1)]), Err("zapis przed odczytem"));
    assert_eq!(replay(1, &[Action::Read(0), Action::Write(0), Action::Read(1)]), Err("harmonogram musi mieć cztery kroki"));
    let serial = [Action::Read(0), Action::Write(0), Action::Read(1), Action::Write(1)];
    let lost_update = [Action::Read(0), Action::Read(1), Action::Write(0), Action::Write(1)];
    assert_eq!(replay(usize::MAX - 1, &serial), Err("przepełnienie"));
    assert_eq!(replay(usize::MAX - 1, &lost_update), Ok(usize::MAX));
}`;

export const memoryOrderingLessons: Lesson[] = [
  {
    id: "release-acquire",
    moduleId: "memory-ordering",
    conceptIds: ["release-acquire"],
    competencyIds: ["design-release-acquire-publication"],
    prerequisites: ["atomic-limits"],
    title: "Release i Acquire: opublikuj jeden payload",
    subtitle:
      "Zobaczysz, kiedy odczyt flagi odbiera zapis Release i jak testować adapter bez unsafe.",
    minutes: 24,
    outcomes: [
      "Rozpoznasz relację synchronizes-with między store Release i load Acquire.",
      "Zbudujesz jednorazowy protokół payload plus flag z atomików std.",
      "Odróżnisz kontrakt adaptera testowany lokalnie od przeplotów sprawdzanych później przez Loom.",
    ],
    steps: [
      choose(
        "release-acquire-predict",
        "predict",
        "Przewidź publikację",
        "Worker zapisuje `payload.store(42, Relaxed)`, a potem `ready.store(true, Release)`. Odbiorca robi `ready.load(Acquire)` i widzi `true`. Co wynika z tego odczytu?",
        1,
        [
          "Acquire tworzy transakcję obejmującą każdy atomik w programie",
          "Jeśli load odczytał zapis Release, wcześniejszy zapis payloadu jest uporządkowany przed jego późniejszym odczytem",
          "Relaxed na payloadzie gwarantuje, że flaga nigdy nie będzie false",
        ],
        [
          "Ordering nie jest globalną blokadą ani transakcją wielu pól.",
          "Konkretna wartość flagi tworzy relację publikacji; payload może użyć Relaxed, bo flaga przenosi synchronizację.",
          "Relaxed nie narzuca kolejności między wątkami i nie zmienia wartości flagi.",
        ],
      ),
      run(
        "release-acquire-run",
        "Uruchom atomowy payload",
        "Join czyni ten przykład deterministycznym dla demonstracji. Sam kontrakt publikacji nadal jest widoczny w kolejności: payload przed Release, a Acquire przed odczytem payloadu.",
        publicationRun,
        "ready=true payload=42\n",
      ),
      choose(
        "release-acquire-read-source",
        "explain",
        "Sprawdź źródło synchronizacji",
        "Flaga ma kilka zapisów. Kiedy Acquire naprawdę odbiera publikację?",
        0,
        [
          "Gdy jego odczyt odczyta wartość zapisaną przez właściwy store Release albo jego release-sekwencję",
          "Zawsze, gdy flaga jest typu AtomicBool, niezależnie od Ordering",
          "Gdy dowolny inny atomic w tym samym wątku ma SeqCst",
        ],
        [
          "Synchronizacja zależy od konkretnego zapisu, który load zobaczył; samo typowanie atomowe nie publikuje payloadu.",
          "AtomicBool gwarantuje atomowość flagi, nie relację z sąsiednim payloadem.",
          "SeqCst innego atomika nie zamienia dowolnych operacji w jedną transakcję.",
        ],
      ),
      choose(
        "release-acquire-ordering",
        "recall",
        "Dobierz Ordering dla flagi",
        "Który wariant pasuje do jednokierunkowej publikacji: zapis flagi przez producenta i odczyt przez konsumenta?",
        2,
        [
          "store Acquire, load Release",
          "store Relaxed, load Relaxed, bo oba atomiki są bezpieczne",
          "store Release, load Acquire",
        ],
        [
          "Acquire dotyczy operacji mogących czytać, a Release operacji mogących zapisywać.",
          "Atomowość nie wystarcza do uporządkowania payloadu przed flagą.",
          "Release publikuje wcześniejsze operacje, a Acquire odbiera publikację po odczytaniu flagi.",
        ],
      ),
      exercise({
        id: "release-acquire-publication-gate",
        kind: "debug",
        title: "Napraw generyczny publisher",
        prompt:
          "Uzupełnij generyczne `publish_once`/`observe_once` nad `PublicationOps`. `StdPublication` jest już poprawnym adapterem std. Test dostarcza zewnętrzny Probe, który obserwuje każde wywołanie, Ordering i payload: sprawdzi kolejność, wartości 0/usize::MAX oraz to, że przy false payload nie jest ładowany. Ten test sprawdza kontrakt adaptera przez std; rzeczywiste przeploty projektu Loom są osobnym dowodem.",
        code: publicationGateStarter,
        solution: publicationGateSolution,
        tests: publicationGateTests,
        hints: [
          "Adapter ma już poprawne metody; funkcja publikująca musi wywołać payload Relaxed, a potem ready Release.",
          "observe_once ma wykonać Acquire na ready i wywołać load_payload Relaxed tylko w gałęzi true; nie dodawaj unsafe.",
        ],
        gate: true,
      }),
      exercise({
        id: "release-acquire-publication-blank",
        kind: "blank",
        title: "Od pustej kartki: odbiór z potwierdzeniem",
        prompt:
          "Zaprojektuj odbiór jednej wiadomości przez jednego odbiorcę; nadawca publikuje tylko raz. Zdefiniuj trait `ReceiptPort` z metodami przyjmującymi `&self`: `load_state(Ordering) -> u8`, `read_payload(Ordering) -> usize` i `acknowledge(Ordering)`. Funkcja `receive_once` pożycza implementację tego traitu i zwraca `Option<usize>`. Odczyt stanu używa Acquire. Dla stanu 1 wymagany jest odczyt payloadu Relaxed, potwierdzenie Release i zwrot wartości; stany 0 i 2 dają None bez odczytu payloadu i bez potwierdzenia. Potwierdzenie ustawia stan 2. Test dostarcza własny adapter i sprawdza kolejność, wartości 0/usize::MAX oraz ponowne wywołanie. Ten kontrakt nie obsługuje równoległych odbiorców ani ponownej publikacji.",
        solution: publicationBlankSolution,
        tests: publicationBlankTests,
        hints: [
          "Acquire dotyczy tylko load_state; payload czytaj Relaxed po stanie 1, a acknowledge wykonaj Release.",
          "Stany pending i acknowledged są ścieżkami bez payloadu i bez potwierdzenia; nie używaj stałej Some(input).",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Atomiczny payload i atomiczna flaga same z siebie tworzą transakcję.",
      "Acquire odbiera każdy wcześniejszy zapis, nawet gdy load nie odczytał Release.",
      "SeqCst jest konieczne dla każdej publikacji one-shot.",
      "Stress test albo sleep jest dowodem relacji happens-before.",
    ],
    transferTask:
      "Zaprojektuj jednorazowy sygnał gotowości dla małego rekordu: wskaż atomik publikujący, atomik odbierający i dowód, że odczyt payloadu zachodzi dopiero po odczycie flagi.",
    evidenceGate:
      "release-acquire-publication-gate sprawdza generyczny protokół przez zewnętrzny Probe, konkretne Orderings, payload i brak odczytu przy false, a release-acquire-publication-blank wymaga osobnego protokołu receipt z obserwowalnym acknowledge.",
    sourceIds: [
      "memory-ordering-std-ordering",
      "memory-ordering-std-atomic-usize",
    ],
  },
  {
    id: "ordering-contracts",
    moduleId: "memory-ordering",
    conceptIds: ["ordering-contracts"],
    competencyIds: ["validate-atomic-ordering-contracts"],
    prerequisites: ["release-acquire"],
    title: "Kontrakty Ordering: load, store, RMW i CAS",
    subtitle:
      "Zweryfikujesz legalne kombinacje i zobaczysz, że SeqCst nie scala kilku atomików w transakcję.",
    minutes: 25,
    outcomes: [
      "Rozróżnisz legalne Ordering dla load, store i read-modify-write.",
      "Sprawdzisz osobno success i failure compare_exchange.",
      "Wyjaśnisz, dlaczego SeqCst daje total order operacji SeqCst, ale nie chroni wieloatomowego invariantu.",
    ],
    steps: [
      run(
        "ordering-contracts-run",
        "Zobacz tabelę operacji",
        "Program wypisuje tylko legalne przykłady. Ordering jest kontraktem konkretnej operacji, nie etykietą całego programu.",
        orderingRun,
        "load:Relaxed\nload:Acquire\nload:SeqCst\nstore:Relaxed\nstore:Release\nstore:SeqCst\n",
      ),
      choose(
        "ordering-contracts-predict",
        "predict",
        "Przewidź legalność",
        "Które zestawienie jest legalne dla zwykłych operacji?",
        0,
        [
          "load Acquire i store Release",
          "load Release i store Acquire",
          "load AcqRel i store Acquire",
        ],
        [
          "Load może być Relaxed, Acquire lub SeqCst; store może być Relaxed, Release lub SeqCst.",
          "Release nie jest orderingiem zwykłego load, a Acquire nie jest orderingiem zwykłego store.",
          "AcqRel wymaga operacji łączącej load i store; zwykły load go nie przyjmuje.",
        ],
      ),
      choose(
        "ordering-contracts-cas",
        "explain",
        "Rozdziel success i failure",
        "W `compare_exchange(expected, replacement, success, failure)` CAS nie zapisuje przy nieudanym porównaniu. Co opisuje failure?",
        1,
        [
          "Zapis replacement, więc może użyć Release lub AcqRel",
          "Load starej wartości w ścieżce błędu; dopuszczalne są wyłącznie Relaxed, Acquire i SeqCst, niezależnie od success",
          "Globalny porządek wszystkich zwykłych zapisów w programie",
        ],
        [
          "Failure nie wykonuje store, więc Release i AcqRel są nielegalne jako failure.",
          "Success opisuje RMW, failure sam odczyt. W aktualnym API failure ma tylko własną listę trzech legalnych wariantów.",
          "SeqCst dotyczy operacji oznaczonych SeqCst, nie tworzy globalnej transakcji wszystkich atomików.",
        ],
      ),
      choose(
        "ordering-contracts-rmw-halves",
        "recall",
        "Przeczytaj dwie połówki RMW",
        "Co dzieje się z częścią store operacji RMW, gdy success ma `Ordering::Acquire`?",
        2,
        [
          "Staje się Release, bo Acquire zawsze wzmacnia zapis",
          "Operacja jest nielegalna; RMW wymaga zawsze AcqRel",
          "Store jest Relaxed; Acquire dotyczy części load",
        ],
        [
          "Acquire nie nadaje store semantyki Release.",
          "RMW może legalnie użyć Acquire; nie znaczy to jednak, że zapis jest Acquire.",
          "Acquire na RMW ma Acquire load i Relaxed store; analogicznie Release ma Relaxed load i Release store.",
        ],
      ),
      exercise({
        id: "ordering-contracts-validation-gate",
        kind: "debug",
        title: "Napraw walidator Ordering",
        prompt:
          "Uzupełnij `ordering_allowed` i `compare_exchange_allowed`. Walidator ma jawnie opisać pełną macierz load/store/RMW oraz CAS: success może użyć wszystkich pięciu wariantów, failure wyłącznie Relaxed, Acquire albo SeqCst, niezależnie od success. Nie zwracaj stałej i nie wywołuj compare_exchange, aby czekać na panic biblioteki.",
        code: orderingGateStarter,
        solution: orderingGateSolution,
        tests: orderingGateTests,
        hints: [
          "Rozbij zwykły load, store, RMW i failure CAS na osobne ramiona match; dodaj wildcard dla non_exhaustive Ordering.",
          "Dla CAS failure dopuść tylko Relaxed/Acquire/SeqCst; current API nie wymaga porównywania siły failure z success.",
        ],
        gate: true,
      }),
      exercise({
        id: "ordering-contracts-cas-blank",
        kind: "blank",
        title: "Zabezpiecz bounded CAS",
        prompt:
          "Napisz `bounded_compare_exchange`, które przyjmuje pożyczony AtomicUsize, oczekiwaną i nową wartość typu usize oraz Ordering success i failure. Zwróć `Result<usize, &'static str>`: Ok ze starą wartością po udanym CAS, Err `oczekiwana wartość różna` przy niezgodności albo Err `nielegalne uporządkowanie CAS` przy failure Release lub AcqRel. Nielegalne porządkowanie odrzuć przed operacją, bez panic i bez zmiany stanu. Success może być dowolnym z pięciu wariantów, a failure jednym z Relaxed/Acquire/SeqCst. Zero jest legalną wartością, a niezgodność nie może nic zapisać.",
        solution: casBlankSolution,
        tests: casBlankTests,
        hints: [
          "Najpierw sprawdź, czy failure jest Relaxed, Acquire albo SeqCst; success nie ogranicza tej listy.",
          "Result z compare_exchange zawiera poprzednią wartość przy sukcesie, a mismatch nie może zmienić atomika.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Każda wartość Ordering pasuje do każdej metody AtomicUsize.",
      "Failure CAS opisuje zapis replacement i może być Release.",
      "Acquire na RMW daje także Release store.",
      "SeqCst powoduje atomową zmianę kilku niezależnych pól.",
    ],
    transferTask:
      "Dla własnego wrappera AtomicUsize opisz tabelę legalnych Ordering i politykę błędu przed wywołaniem CAS, tak aby nie polegać na panic z niepoprawnej pary.",
    evidenceGate:
      "ordering-contracts-validation-gate sprawdza wszystkie klasy operacji i legalne/nielegalne pary, a ordering-contracts-cas-blank wymaga bounded CAS z błędem przed operacją i bez zapisu przy mismatch.",
    sourceIds: [
      "memory-ordering-std-ordering",
      "memory-ordering-std-atomic-usize",
      "memory-ordering-std-atomic-compare-exchange",
    ],
  },
  {
    id: "loom-evidence",
    moduleId: "memory-ordering",
    conceptIds: ["loom-evidence"],
    competencyIds: ["interpret-loom-evidence"],
    prerequisites: ["ordering-contracts"],
    title: "Loom: dowód dla małego modelu",
    subtitle:
      "Zaprojektujesz asercję przeciw kontrprzykładom i poznasz granice dowodu z przeplotów.",
    minutes: 24,
    outcomes: [
      "Odróżnisz losowy stress test od systematycznego modelu dwóch wątków.",
      "Rozpoznasz konieczność zastąpienia atomików, Arc i thread typami Loom w testowanym modelu.",
      "Odrzucisz pusty, niespójny albo nieograniczony wynik zamiast traktować timeout jako sukces.",
    ],
    steps: [
      choose(
        "loom-evidence-predict",
        "predict",
        "Przewidź wartość testu stresowego",
        "Test uruchamia ten sam wyścig milion razy na jednym komputerze i nie trafia w zły przeplot. Co możesz uczciwie powiedzieć?",
        1,
        [
          "Program jest dowiedziony dla wszystkich sprzętów i wszystkich przeplotów",
          "Ta seria nie znalazła błędu w wykonanych próbach; rzadki przeplot nadal może istnieć",
          "Brak timeoutu oznacza, że model pamięci jest poprawny",
        ],
        [
          "Losowe powtórzenia nie pokrywają wszystkich dopuszczalnych przeplotów ani słabych przestawień.",
          "Wynik stresu jest lokalną obserwacją wykonanych prób, nie dowodem wyczerpującym.",
          "Timeout i brak timeoutu nie są asercją wartości ani porządku pamięci.",
        ],
      ),
      choose(
        "loom-evidence-replace",
        "explain",
        "Wskaż typ widoczny dla Loom",
        "Co musi zostać podmienione w modelowanym teście, aby Loom widział operacje współbieżne?",
        2,
        [
          "Tylko nazwa testu; std atomiki są automatycznie przechwytywane",
          "Wyłącznie Ordering na końcu programu",
          "Atomiki, wątki i współdzielenie używane przez model, zwykle przez cfg wybierające loom zamiast std",
        ],
        [
          "Loom nie przechwytuje automatycznie zwykłych prymitywów std.",
          "Ordering bez podmiany prymitywu nie daje Loom dostępu do przeplotów.",
          "Adapter sync może wybierać loom::sync::atomic, loom::thread i loom::sync::Arc podczas model test.",
        ],
      ),
      choose(
        "loom-evidence-limits",
        "recall",
        "Uczciwie opisz zakres",
        "Które zdanie o `loom::model` jest poprawne?",
        0,
        [
          "Sprawdza dopuszczalne przeploty zdefiniowanego małego modelu; nie dowodzi kodu ukrytego za std ani wszystkich rozmiarów programu",
          "Gwarantuje poprawność każdego możliwego programu Rust, jeśli test nie ma sleep",
          "Zastępuje wszystkie testy domenowe i dowodzi zachowania sprzętu, którego nie modeluje",
        ],
        [
          "Dowód jest tak szeroki, jak model, podmiana prymitywów i asercje; ograniczony model ma jawne granice.",
          "Brak sleep nie rozszerza zakresu modelu i nie czyni asercji pełnym dowodem.",
          "Loom nie zastępuje testów wartości, błędów i integracji poza swoim małym modelem.",
        ],
      ),
      run(
        "loom-evidence-schedule-run",
        "Uruchom sześć harmonogramów",
        "Ten std-only szkic wypisuje dokładnie sześć legalnych harmonogramów dwóch wątków, w których każdy odczyt poprzedza własny zapis. To jawny materiał dla małego interpretera harmonogramu z sekwencyjnie spójną pamięcią (SC), nie implementacja silnika Loom ani dowód pełnego modelu Rust.",
        `fn main() {
    let schedules = [
        "R0 W0 R1 W1",
        "R0 R1 W0 W1",
        "R0 R1 W1 W0",
        "R1 W1 R0 W0",
        "R1 R0 W1 W0",
        "R1 R0 W0 W1",
    ];
    for (index, schedule) in schedules.iter().enumerate() {
        println!("{}: {}", index + 1, schedule);
    }
}`,
        "1: R0 W0 R1 W1\n2: R0 R1 W0 W1\n3: R0 R1 W1 W0\n4: R1 W1 R0 W0\n5: R1 R0 W1 W0\n6: R1 R0 W0 W1\n",
      ),
      exercise({
        id: "loom-evidence-assertions-gate",
        kind: "debug",
        title: "Zatrzymaj fałszywy dowód",
        prompt:
          "Uzupełnij `assert_model_evidence`. Asercja ma przyjąć niepusty zestaw, odrzucić `Inconsistent`, wymagać co najmniej jednego `Published(expected_payload)` i odrzucić każdy opublikowany inny payload. Hidden test używa catch_unwind dla pustki, wyniku inconclusive, błędnej wartości i niespójności.",
        code: loomGateStarter,
        solution: loomGateSolution,
        tests: loomGateTests,
        hints: [
          "Rozdziel brak scenariuszy, niespójność, brak oczekiwanego Published i błędny payload na jawne asercje.",
          "NotReady jest legalnym pojedynczym wynikiem, lecz sam zestaw NotReady jest inconclusive i nie może zaliczyć dowodu publikacji.",
        ],
        gate: true,
      }),
      exercise({
        id: "loom-evidence-small-model-blank",
        kind: "blank",
        title: "Odtwórz mały interpreter SC",
        prompt:
          "Od pustej kartki zdefiniuj enum `Action` z akcjami Read(thread) i Write(thread) oraz funkcję `replay`, która przyjmuje wartość początkową i harmonogram oraz zwraca `Result<usize, &'static str>`. To jawny mały interpreter z sekwencyjnie spójną pamięcią (SC) dla dokładnie dwóch wątków o ID 0 i 1: każdy ma wykonać dokładnie jeden Read przed własnym Write, a Write ma użyć zapisanej wartości odczytu plus 1. Odrzuć harmonogram niepełny, duplikaty, ID spoza 0/1 i overflow przez dokładne komunikaty `harmonogram musi mieć cztery kroki`, `powtórny odczyt`, `powtórny zapis`, `zapis przed odczytem`, `nieznany wątek`, `przepełnienie` lub `niepełny harmonogram`. Test obejmuje wszystkie sześć legalnych przeplotów, w tym utracone aktualizacje. Nie twierdź, że to pełny model Rust/Loom i nie używaj sleep, timeoutu ani nieograniczonego oczekiwania.",
        solution: boundedModelSolution,
        tests: boundedModelTests,
        hints: [
          "W tablicach read/write/saved zachowaj stan obu wątków; przed Write sprawdź własny Read i overflow checked_add.",
          "Mały interpreter SC ma sześć legalnych kolejności, lecz każdą akcję harmonogramu wykonuje deterministycznie i odrzuca błędne dane.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Milion przebiegów stress testu obejmuje wszystkie możliwe przeploty.",
      "Loom widzi operacje std bez podmiany typów.",
      "Timeout albo brak panic jest równoważny dowodowi asercji.",
      "Loom dowodzi wszystkich sprzętów, rozmiarów modelu i bibliotek zależnych.",
    ],
    transferTask:
      "Zdefiniuj sześć legalnych harmonogramów dwóch wątków, odtwórz je w małym interpreterze SC i osobno wskaż, które atomiki, Arc i thread przełączysz na Loom w Cargo test.",
    evidenceGate:
      "loom-evidence-assertions-gate wymaga asercji na rzeczywistym payloadzie i odrzuca pusty/inconclusive wynik, a loom-evidence-small-model-blank odtwarza sześć legalnych przeplotów SC oraz odrzuca duplikaty, błędne ID, niepełność i overflow bez przekroczenia czasu.",
    sourceIds: [
      "memory-ordering-loom-guide",
      "memory-ordering-loom-atomic-usize",
      "memory-ordering-std-ordering",
    ],
  },
];

export const memoryOrderingReviewExercises: Record<string, LessonStep> = {
  "release-acquire": exercise({
    id: "review-release-acquire",
    kind: "apply",
    title: "Powtórka: odbierz i potwierdź sygnał",
    prompt:
      "Dokończ generyczne `receive_signal` dla jednego odbiorcy i jednej publikacji. Trait udostępnia stan 0/1/2, payload i acknowledge. Odbiór ma czytać stan Acquire, payload Relaxed i potwierdzać Release tylko dla stanu 1; Probe w testach obserwuje metodę i Ordering. Stan 0/2 nie może dotknąć payloadu ani acknowledge, a powtórny odbiór po 2 zwraca None.",
    code: `use std::sync::atomic::Ordering;

trait SignalPort {
    fn load_state(&self, ordering: Ordering) -> u8;
    fn read_payload(&self, ordering: Ordering) -> usize;
    fn acknowledge(&self, ordering: Ordering);
}

fn receive_signal<P: SignalPort>(port: &P) -> Option<usize> {
    None
}`,
    solution: `use std::sync::atomic::Ordering;

trait SignalPort {
    fn load_state(&self, ordering: Ordering) -> u8;
    fn read_payload(&self, ordering: Ordering) -> usize;
    fn acknowledge(&self, ordering: Ordering);
}

fn receive_signal<P: SignalPort>(port: &P) -> Option<usize> {
    if port.load_state(Ordering::Acquire) != 1 { return None; }
    let payload = port.read_payload(Ordering::Relaxed);
    port.acknowledge(Ordering::Release);
    Some(payload)
}`,
    tests: `#[test]
fn review_signal_probe_observes_receipt_order_and_values() {
    use std::sync::atomic::{AtomicU8, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { state: AtomicU8, payload: AtomicUsize, calls: Mutex<Vec<String>> }
    impl Probe { fn new(payload: usize) -> Self { Self { state: AtomicU8::new(1), payload: AtomicUsize::new(payload), calls: Mutex::new(Vec::new()) } } }
    impl SignalPort for Probe {
        fn load_state(&self, ordering: Ordering) -> u8 { let v = self.state.load(ordering); self.calls.lock().unwrap().push(format!("load:{ordering:?}:{v}")); v }
        fn read_payload(&self, ordering: Ordering) -> usize { let v = self.payload.load(ordering); self.calls.lock().unwrap().push(format!("read:{ordering:?}:{v}")); v }
        fn acknowledge(&self, ordering: Ordering) { self.state.store(2, ordering); self.calls.lock().unwrap().push(format!("ack:{ordering:?}")); }
    }
    for value in [0, usize::MAX] {
        let probe = Probe::new(value);
        assert_eq!(receive_signal(&probe), Some(value));
        assert_eq!(*probe.calls.lock().unwrap(), vec![format!("load:Acquire:1"), format!("read:Relaxed:{value}"), "ack:Release".to_string()]);
        assert_eq!(receive_signal(&probe), None);
    }
}

#[test]
fn review_signal_probe_skips_payload_for_pending_or_acknowledged() {
    use std::sync::atomic::{AtomicU8, AtomicUsize, Ordering};
    use std::sync::Mutex;
    struct Probe { state: AtomicU8, payload: AtomicUsize, reads: AtomicUsize, acks: AtomicUsize, calls: Mutex<Vec<String>> }
    impl SignalPort for Probe {
        fn load_state(&self, ordering: Ordering) -> u8 { self.state.load(ordering) }
        fn read_payload(&self, ordering: Ordering) -> usize { self.reads.fetch_add(1, Ordering::Relaxed); self.payload.load(ordering) }
        fn acknowledge(&self, ordering: Ordering) { self.acks.fetch_add(1, Ordering::Relaxed); self.state.store(2, ordering); }
    }
    for state in [0, 2] {
        let probe = Probe { state: AtomicU8::new(state), payload: AtomicUsize::new(9), reads: AtomicUsize::new(0), acks: AtomicUsize::new(0), calls: Mutex::new(Vec::new()) };
        assert_eq!(receive_signal(&probe), None);
        assert_eq!(probe.reads.load(Ordering::Relaxed), 0);
        assert_eq!(probe.acks.load(Ordering::Relaxed), 0);
    }
}`,
    hints: [
      "Acquire należy do load_state; Release należy do acknowledge, który zmienia stan po odczycie payloadu.",
      "Stan 0/2 kończy się None bez payloadu i bez ack; nie zwracaj stałego Some ani nie zgaduj wartości.",
    ],
  }),
  "ordering-contracts": exercise({
    id: "review-ordering-contracts",
    kind: "apply",
    title: "Powtórka: bezpieczny wybór CAS",
    prompt:
      "Dokończ `try_cas`: failure Release/AcqRel daje Err `nielegalne uporządkowanie CAS` przed operacją; legalny CAS zwraca Ok z poprzednią wartością dla każdego success i failure z aktualnej listy. Niezgodność daje Err `oczekiwana wartość różna` i pozostawia atomik bez zmiany.",
    code: `use std::sync::atomic::{AtomicUsize, Ordering};

fn try_cas(
    value: &AtomicUsize,
    expected: usize,
    replacement: usize,
    success: Ordering,
    failure: Ordering,
) -> Result<usize, &'static str> {
    let _ = (value, expected, replacement, success, failure);
    Err("nielegalne uporządkowanie CAS")
}`,
    solution: `use std::sync::atomic::{AtomicUsize, Ordering};

fn valid_pair(success: Ordering, failure: Ordering) -> bool {
    let _ = success;
    matches!(failure, Ordering::Relaxed | Ordering::Acquire | Ordering::SeqCst)
}

fn try_cas(
    value: &AtomicUsize,
    expected: usize,
    replacement: usize,
    success: Ordering,
    failure: Ordering,
) -> Result<usize, &'static str> {
    if !valid_pair(success, failure) {
        return Err("nielegalne uporządkowanie CAS");
    }
    value.compare_exchange(expected, replacement, success, failure)
        .map_err(|_| "oczekiwana wartość różna")
}`,
    tests: `#[test]
fn review_cas_validates_all_fifteen_legal_pairs() {
    let all = [Ordering::Relaxed, Ordering::Acquire, Ordering::Release, Ordering::AcqRel, Ordering::SeqCst];
    let failures = [Ordering::Relaxed, Ordering::Acquire, Ordering::SeqCst];
    for success in all {
        for failure in failures {
            let value = AtomicUsize::new(2);
            assert_eq!(try_cas(&value, 2, 3, success, failure), Ok(2));
            assert_eq!(try_cas(&value, 2, 4, success, failure), Err("oczekiwana wartość różna"));
            assert_eq!(value.load(Ordering::Relaxed), 3);
        }
        for failure in [Ordering::Release, Ordering::AcqRel] {
            let value = AtomicUsize::new(2);
            assert_eq!(try_cas(&value, 2, 3, success, failure), Err("nielegalne uporządkowanie CAS"));
            assert_eq!(value.load(Ordering::Relaxed), 2);
        }
    }
}`,
    hints: [
      "Failure opisuje load i musi być jednym z Relaxed, Acquire albo SeqCst przed compare_exchange.",
      "Po legalnym mismatch mapuj Err compare_exchange bez dodatkowego store.",
    ],
  }),
  "loom-evidence": exercise({
    id: "review-loom-evidence",
    kind: "apply",
    title: "Powtórka: odrzuć wynik inconclusive",
    prompt:
      "Dokończ `evidence_ok`, aby dopuścić NotReady wraz z Published(expected), ale odrzucić pusty zestaw, sam NotReady, błędny payload i Inconsistent. Test używa catch_unwind.",
    code: `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Outcome { Published(usize), NotReady, Inconsistent }

fn evidence_ok(outcomes: &[Outcome], expected: usize) {
    let _ = (outcomes, expected);
}`,
    solution: `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Outcome { Published(usize), NotReady, Inconsistent }

fn evidence_ok(outcomes: &[Outcome], expected: usize) {
    assert!(!outcomes.is_empty());
    assert!(!outcomes.iter().any(|outcome| *outcome == Outcome::Inconsistent));
    assert!(outcomes.iter().any(|outcome| *outcome == Outcome::Published(expected)));
    assert!(outcomes.iter().all(|outcome| match outcome {
        Outcome::NotReady => true,
        Outcome::Published(value) => *value == expected,
        Outcome::Inconsistent => false,
    }));
}`,
    tests: `#[test]
fn review_evidence_checks_value_and_conclusion() {
    evidence_ok(&[Outcome::NotReady, Outcome::Published(5)], 5);
    for outcomes in [vec![], vec![Outcome::NotReady], vec![Outcome::Published(4)], vec![Outcome::Published(5), Outcome::Published(4)], vec![Outcome::NotReady, Outcome::Published(5), Outcome::Inconsistent], vec![Outcome::Inconsistent]] {
        assert!(std::panic::catch_unwind(|| evidence_ok(&outcomes, 5)).is_err());
    }
}`,
    hints: [
      "NotReady jest dopuszczalne jako gałąź, ale nie wystarcza do wniosku o publikacji.",
      "Asercja musi sprawdzić zarówno obecność expected, jak i brak każdego innego Published.",
    ],
  }),
};

export const memoryOrderingModule: CourseModule = {
  id: "memory-ordering",
  title: "Porządek pamięci: publikacja i dowód",
  whyItMatters:
    "Atomiki są bezpieczne pojedynczo, ale poprawny protokół wymaga relacji między operacjami. Release/Acquire pozwala opublikować dane przez flagę, właściwe kontrakty chronią load/store/RMW/CAS, a mały model Loom pomaga znaleźć przeplot, którego stress test może nie trafić.",
  capabilities: [
    "Projektujesz jednorazową publikację payload plus flag z konkretnym Release store i Acquire load.",
    "Walidujesz legalne Ordering dla zwykłych atomików, RMW oraz success/failure CAS.",
    "Formułujesz asercję i zakres małego modelu, odróżniając lokalny test std od właściwego testu Loom.",
  ],
  prerequisites: ["atomic-state"],
  lessonIds: memoryOrderingLessons.map((lesson) => lesson.id),
  exitGate: [
    "Acquire ma dowód, że odczytał flagę zapisaną przez Release; wtedy rzeczywisty payload jest odczytywany po publikacji, a false nie czyta payloadu.",
    "Walidator rozróżnia legalne load/store/RMW/CAS, sprawdza failure przed operacją i wyjaśnia, że SeqCst nie jest transakcją kilku atomików.",
    "Dowód Loom dotyczy dwóch wątków i jawnie ograniczonego modelu po podmianie prymitywów; nie obejmuje wszystkich dozwolonych przestawień Relaxed, a pusty, niespójny, niepoprawny wynik albo przekroczenie czasu nie zalicza asercji.",
  ],
  projectConnection:
    "Laboratorium: protokoły atomowe (`concurrency-lab`, pakiet `concurrency-lab-workshop`) rozwija funkcję publication() tworzącą Publisher i Subscriber, `Publisher::publish(self, usize)`, `Subscriber::try_read() -> Option<usize>` oraz reserve z limitem rezerwacji przez CAS. Prawdziwy model Loom 0.7.2 uruchamia się w Cargo przez feature `model`; sprawdza małe scenariusze dwóch uczestników bez limitu liczby permutacji, czasu i preempcji. Limit kroków powoduje błąd. Oba warianty wykonują ten sam kod biblioteki.",
  assessmentId: "loom-evidence/loom-evidence-small-model-blank",
  gateCriteria: [
    {
      id: "memory-ordering-release-acquire-gate",
      label:
        "Publikacja przekazuje konkretny payload przez Release/Acquire i nie czyta payloadu przed flagą.",
      taskRefs: [
        {
          lessonId: "release-acquire",
          stepId: "release-acquire-publication-gate",
        },
        {
          lessonId: "release-acquire",
          stepId: "release-acquire-publication-blank",
        },
      ],
    },
    {
      id: "memory-ordering-contracts-gate",
      label:
        "Ordering jest walidowany według operacji, a CAS odrzuca nielegalną parę porządkowań przed zapisem.",
      taskRefs: [
        {
          lessonId: "ordering-contracts",
          stepId: "ordering-contracts-validation-gate",
        },
        {
          lessonId: "ordering-contracts",
          stepId: "ordering-contracts-cas-blank",
        },
      ],
    },
    {
      id: "memory-ordering-loom-evidence-gate",
      label:
        "Asercja wymaga opublikowanej wartości w małym modelu i odrzuca wynik pusty, nierozstrzygający albo niespójny.",
      taskRefs: [
        { lessonId: "loom-evidence", stepId: "loom-evidence-assertions-gate" },
        {
          lessonId: "loom-evidence",
          stepId: "loom-evidence-small-model-blank",
        },
      ],
    },
  ],
};
