import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const atomicStateSources: Source[] = [
  {
    id: "atomic-state-std-module",
    title: "Rust standard library: std::sync::atomic",
    url: "https://doc.rust-lang.org/std/sync/atomic/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie modelu atomików, gwarancji lock-free/wait-free, dostępności typów albo definicji data race.",
  },
  {
    id: "atomic-state-std-atomic-usize",
    title: "Rust standard library: AtomicUsize",
    url: "https://doc.rust-lang.org/std/sync/atomic/type.AtomicUsize.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisów fetch_add, load, store lub compare_exchange dla usize.",
  },
  {
    id: "atomic-state-std-atomic-methods",
    title: "Rust standard library: Atomic methods and compare_exchange",
    url: "https://doc.rust-lang.org/std/sync/atomic/struct.Atomic.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie różnicy compare_exchange i compare_exchange_weak, obserwowanej wartości błędu albo ostrzeżeń ABA.",
  },
  {
    id: "atomic-state-std-mutex",
    title: "Rust standard library: Mutex<T>",
    url: "https://doc.rust-lang.org/std/sync/struct.Mutex.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładu ochrony niezmiennika kilku powiązanych pól albo obsługi wyniku lock.",
  },
  {
    id: "atomic-state-std-ordering",
    title: "Rust standard library: Ordering",
    url: "https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu Relaxed, Acquire, Release, AcqRel lub SeqCst; pełne porównanie orderingów należy do późniejszego modułu.",
  },
  {
    id: "atomic-state-nomicon-atomics",
    title: "The Rustonomicon: Atomics",
    url: "https://doc.rust-lang.org/nomicon/atomics.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyjaśnienia widoczności, relacji happens-before albo ograniczeń atomowego modelu pamięci.",
  },
];

export const atomicStateCompetencies: Competency[] = [
  {
    id: "reason-about-atomic-rmw",
    title:
      "Rozpoznajesz utraconą aktualizację load/store i zastępujesz ją pojedynczą operacją RMW, poprawnie interpretując starą wartość oraz zawijanie.",
  },
  {
    id: "implement-cas-retry",
    title:
      "Projektujesz ograniczoną pętlę CAS, używasz obserwowanej wartości po porażce i odróżniasz porażkę warunku od dozwolonej porażki pozornej weak.",
  },
  {
    id: "bound-atomic-guarantees",
    title:
      "Wyznaczasz granice atomika: Relaxed chroni pojedynczą lokalizację, Mutex składa niezmiennik kilku pól, wersja wykrywa ABA, a lock-free nie obiecuje wait-free ani automatycznej przewagi szybkości.",
  },
];

export const atomicStateConcepts: Concept[] = [
  {
    id: "atomic-rmw",
    title: "RMW łączy odczyt i zapis jednej lokalizacji",
    prerequisites: ["mutex-recovery"],
    competencyIds: ["reason-about-atomic-rmw"],
    reviewPrompt:
      "Dlaczego dwie równoległe sekwencje `load`, `+`, `store` mogą zgubić update, a `fetch_add` zachowuje oba? Co zwraca `fetch_add` przy `usize::MAX`?",
    reviewAnswer:
      "Load i store są osobnymi punktami: oba workery mogą odczytać tę samą starą wartość i późniejszy zapis jednego nadpisze zapis drugiego. `fetch_add` jest jedną atomową operacją read-modify-write, więc każdy przyrost działa na wartości aktualnej w chwili RMW. Zwraca wartość sprzed operacji, a przepełnienie całkowicie zawija się zgodnie z typem, więc dla `usize::MAX` przyrost o 1 daje starą wartość `usize::MAX`, a nową 0.",
    distinguish:
      "Atomowość RMW dotyczy jednej lokalizacji i nie tworzy transakcji dla innych danych. Stara wartość z `fetch_add` jest wartością sprzed przyrostu, a stara wartość z `fetch_or` jest snapshotem bitów sprzed ustawienia maski. Żadna z nich nie jest gwarancją, że stan nadal jest aktualny po powrocie. Wbudowane RMW nie odrzuca overflow; jeśli domena tego wymaga, trzeba użyć jawnej polityki, np. CAS z checked_add.",
  },
  {
    id: "atomic-cas",
    title: "CAS zatwierdza zmianę tylko dla oczekiwanej wartości",
    prerequisites: ["atomic-rmw"],
    competencyIds: ["implement-cas-retry"],
    reviewPrompt:
      "Co oznacza `Err(obserwowane)` z `compare_exchange`, dlaczego retry musi użyć tej wartości, i czym weak różni się od strong?",
    reviewAnswer:
      "Porażka oznacza, że atomik nie miał wartości oczekiwanej; `Err` zawiera wartość zaobserwowaną podczas nieudanego odczytu. Retry powinien policzyć nowy kandydat na podstawie właśnie jej, a nie starego `current`. `compare_exchange_weak` może dodatkowo zwrócić porażkę pozorną mimo zgodności, dlatego pasuje do pętli; strong nie ma tej dozwolonej porażki pozornej, lecz nadal może przegrać z prawdziwym konkurencyjnym zapisem.",
    distinguish:
      "CAS nie rezerwuje wartości na czas między load i próbą: sprawdza ją i ewentualnie zapisuje w jednym RMW. Porażka warunku jest informacją do ponowienia albo odmowy, nie wyjątkiem. Równość bitów nie zawsze oznacza tę samą rzecz lub generację obiektu, więc wskaźnikowe użycie może mieć problem ABA; licznik wersji albo inny znacznik to osobna decyzja projektowa.",
  },
  {
    id: "atomic-limits",
    title: "Atomik nie składa niezmiennika kilku pól ani nie usuwa ABA",
    prerequisites: ["atomic-cas"],
    competencyIds: ["bound-atomic-guarantees"],
    reviewPrompt:
      "Co gwarantuje `Relaxed` dla jednej lokalizacji, kiedy para pól wymaga `Mutex`, i jak znacznik wersji odrzuca ABA? Jak rozumieć data race, lock-free i wait-free w tym zakresie?",
    reviewAnswer:
      "`Relaxed` zapewnia atomowy dostęp do jednej lokalizacji i spójne RMW tej lokalizacji, ale nie publikuje przez nią innych pól. Gdy niezmiennik obejmuje parę pól, `Mutex<(A, B)>` pozwala sprawdzić i zatwierdzić oba pola razem; dwa niezależne atomiki nie dają takiej transakcji. Znacznik wersji odróżnia stan A po przejściu A→B→A od pierwotnego A i pozwala odrzucić stary snapshot. Data race dotyczy niesynchronizowanych konfliktowych dostępów, a lock-free nie oznacza wait-free ani automatycznego przyspieszenia.",
    distinguish:
      "Ten moduł rozdziela trzy kontrakty: atomik z `Relaxed` dla jednej lokalizacji, `Mutex` dla niezmiennika kilku powiązanych pól oraz wersję dla wykrywania powrotu wartości. Nie wybiera jeszcze pełnego ordering dla publikacji. Brak blokady wewnętrznej nie oznacza, że retry zakończy się w stałej liczbie prób ani że kod będzie szybszy od `Mutex`.",
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
      ...(options.forbiddenPatterns
        ? { forbiddenPatterns: options.forbiddenPatterns }
        : {}),
    },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const rmwStarter = `use std::sync::atomic::{AtomicUsize, Ordering};

fn reserve_ticket(counter: &AtomicUsize, amount: usize) -> usize {
    counter.load(Ordering::Relaxed) + amount
}`;

const rmwSolution = `use std::sync::atomic::{AtomicUsize, Ordering};

fn reserve_ticket(counter: &AtomicUsize, amount: usize) -> usize {
    counter.fetch_add(amount, Ordering::Relaxed)
}`;

const rmwTests = `#[test]
fn reserve_ticket_returns_old_value_and_updates_supplied_atomic() {
    let counter = std::sync::atomic::AtomicUsize::new(10);
    assert_eq!(reserve_ticket(&counter, 3), 10);
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), 13);
    assert_eq!(reserve_ticket(&counter, 0), 13);
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), 13);
}

#[test]
fn reserve_ticket_wraps_at_max_like_fetch_add() {
    let counter = std::sync::atomic::AtomicUsize::new(usize::MAX);
    assert_eq!(reserve_ticket(&counter, 1), usize::MAX);
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), 0);
    assert_eq!(reserve_ticket(&counter, usize::MAX), 0);
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), usize::MAX);
}`;

const rmwBlankSolution = `use std::sync::atomic::{AtomicUsize, Ordering};

fn mark_flags(counter: &AtomicUsize, mask: usize) -> (usize, usize) {
    let old = counter.fetch_or(mask, Ordering::Relaxed);
    (old, old | mask)
}`;

const rmwBlankTests = `#[test]
fn mark_flags_returns_old_and_new_while_preserving_existing_bits() {
    let counter = std::sync::atomic::AtomicUsize::new(0b0101);
    assert_eq!(mark_flags(&counter, 0b0011), (0b0101, 0b0111));
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), 0b0111);
    assert_eq!(mark_flags(&counter, 0), (0b0111, 0b0111));
    assert_eq!(counter.load(std::sync::atomic::Ordering::Relaxed), 0b0111);
}

#[test]
fn mark_flags_handles_zero_and_all_bits_without_arithmetic_overflow() {
    let zero = std::sync::atomic::AtomicUsize::new(0);
    assert_eq!(mark_flags(&zero, 0), (0, 0));
    assert_eq!(mark_flags(&zero, usize::MAX), (0, usize::MAX));
    let full = std::sync::atomic::AtomicUsize::new(usize::MAX);
    assert_eq!(mark_flags(&full, 1), (usize::MAX, usize::MAX));
    assert_eq!(full.load(std::sync::atomic::Ordering::Relaxed), usize::MAX);
}`;

const casRetryStarter = `use std::sync::atomic::{AtomicUsize, Ordering};

trait CasCell {
    fn load(&self, order: Ordering) -> usize;
    fn compare_exchange_weak(
        &self,
        current: usize,
        new: usize,
        success: Ordering,
        failure: Ordering,
    ) -> Result<usize, usize>;
}

fn add_with_retry<C: CasCell>(cell: &C, amount: usize) -> Result<usize, &'static str> {
    let _ = (cell, amount);
    Err("nie zaimplementowano")
}`;

const casRetrySolution = `use std::sync::atomic::{AtomicUsize, Ordering};

trait CasCell {
    fn load(&self, order: Ordering) -> usize;
    fn compare_exchange_weak(
        &self,
        current: usize,
        new: usize,
        success: Ordering,
        failure: Ordering,
    ) -> Result<usize, usize>;
}

fn add_with_retry<C: CasCell>(cell: &C, amount: usize) -> Result<usize, &'static str> {
    let mut current = cell.load(Ordering::Relaxed);
    for _attempt in 0..8 {
        let next = current.checked_add(amount).ok_or("przepełnienie")?;
        match cell.compare_exchange_weak(
            current,
            next,
            Ordering::Relaxed,
            Ordering::Relaxed,
        ) {
            Ok(_) => return Ok(next),
            Err(observed) => current = observed,
        }
    }
    Err("za dużo kolizji")
}`;

const casRetryTests = `impl CasCell for std::sync::atomic::AtomicUsize {
    fn load(&self, order: std::sync::atomic::Ordering) -> usize {
        self.load(order)
    }

    fn compare_exchange_weak(
        &self,
        current: usize,
        new: usize,
        success: std::sync::atomic::Ordering,
        failure: std::sync::atomic::Ordering,
    ) -> Result<usize, usize> {
        self.compare_exchange_weak(current, new, success, failure)
    }
}

struct Scripted {
    value: std::sync::atomic::AtomicUsize,
    phase: std::cell::Cell<u8>,
    attempts: std::cell::Cell<usize>,
}

impl CasCell for Scripted {
    fn load(&self, _order: std::sync::atomic::Ordering) -> usize {
        self.value.load(std::sync::atomic::Ordering::Relaxed)
    }

    fn compare_exchange_weak(
        &self,
        current: usize,
        new: usize,
        success: std::sync::atomic::Ordering,
        failure: std::sync::atomic::Ordering,
    ) -> Result<usize, usize> {
        self.attempts.set(self.attempts.get() + 1);
        match self.phase.get() {
            0 => {
                self.phase.set(1);
                let observed = current.checked_add(2).unwrap_or(current.saturating_add(1));
                self.value.store(observed, std::sync::atomic::Ordering::Relaxed);
                return Err(observed);
            }
            1 => {
                self.phase.set(2);
                return Err(self.value.load(failure));
            }
            _ => {}
        }
        self.value.compare_exchange(current, new, success, failure)
    }
}

#[test]
fn retry_uses_actual_atomic_usize_adapter() {
    let cell = std::sync::atomic::AtomicUsize::new(4);
    match add_with_retry(&cell, 3) {
        Ok(value) => {
            assert_eq!(value, 7);
            assert_eq!(cell.load(std::sync::atomic::Ordering::Relaxed), 7);
        }
        Err(error) => {
            assert_eq!(error, "za dużo kolizji");
            assert_eq!(cell.load(std::sync::atomic::Ordering::Relaxed), 4);
        }
    }
}

#[test]
fn retry_uses_changed_observation_and_spurious_failure_then_succeeds() {
    let cell = Scripted {
        value: std::sync::atomic::AtomicUsize::new(6),
        phase: std::cell::Cell::new(0),
        attempts: std::cell::Cell::new(0),
    };
    assert_eq!(add_with_retry(&cell, 5), Ok(13));
    assert_eq!(cell.attempts.get(), 3);
    assert_eq!(cell.value.load(std::sync::atomic::Ordering::Relaxed), 13);
}

#[test]
fn retry_detects_overflow_after_a_competing_observation_without_writing() {
    let cell = Scripted {
        value: std::sync::atomic::AtomicUsize::new(usize::MAX - 1),
        phase: std::cell::Cell::new(0),
        attempts: std::cell::Cell::new(0),
    };
    assert_eq!(add_with_retry(&cell, 1), Err("przepełnienie"));
    assert_eq!(cell.attempts.get(), 1);
    assert_eq!(cell.value.load(std::sync::atomic::Ordering::Relaxed), usize::MAX);
}

struct AlwaysFail {
    value: std::sync::atomic::AtomicUsize,
    attempts: std::cell::Cell<usize>,
}

impl CasCell for AlwaysFail {
    fn load(&self, order: std::sync::atomic::Ordering) -> usize {
        self.value.load(order)
    }

    fn compare_exchange_weak(
        &self,
        _current: usize,
        _new: usize,
        _success: std::sync::atomic::Ordering,
        failure: std::sync::atomic::Ordering,
    ) -> Result<usize, usize> {
        self.attempts.set(self.attempts.get() + 1);
        Err(self.value.load(failure))
    }
}

#[test]
fn retry_stops_after_exactly_eight_failures() {
    let cell = AlwaysFail {
        value: std::sync::atomic::AtomicUsize::new(6),
        attempts: std::cell::Cell::new(0),
    };
    assert_eq!(add_with_retry(&cell, 1), Err("za dużo kolizji"));
    assert_eq!(cell.attempts.get(), 8);
    assert_eq!(cell.value.load(std::sync::atomic::Ordering::Relaxed), 6);
}`;

const casConditionalBlankSolution = `use std::sync::atomic::{AtomicUsize, Ordering};

fn add_below_limit(cell: &AtomicUsize, amount: usize, limit: usize) -> bool {
    let mut current = cell.load(Ordering::Relaxed);
    for _attempt in 0..8 {
        let Some(next) = current.checked_add(amount) else { return false };
        if next > limit { return false; }
        match cell.compare_exchange(current, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return true,
            Err(observed) => current = observed,
        }
    }
    false
}`;

const casConditionalBlankTests = `#[test]
fn conditional_add_checks_current_value_and_limit() {
    let cell = std::sync::atomic::AtomicUsize::new(4);
    assert!(!add_below_limit(&cell, 3, 6));
    assert_eq!(cell.load(std::sync::atomic::Ordering::Relaxed), 4);
    assert!(add_below_limit(&cell, 2, 6));
    assert_eq!(cell.load(std::sync::atomic::Ordering::Relaxed), 6);
    assert!(!add_below_limit(&cell, 1, 6));
    assert_eq!(cell.load(std::sync::atomic::Ordering::Relaxed), 6);
}

#[test]
fn conditional_add_handles_zero_and_max_without_wrapping() {
    let zero = std::sync::atomic::AtomicUsize::new(0);
    assert!(add_below_limit(&zero, 0, 0));
    assert_eq!(zero.load(std::sync::atomic::Ordering::Relaxed), 0);
    let full = std::sync::atomic::AtomicUsize::new(usize::MAX);
    assert!(!add_below_limit(&full, 1, usize::MAX));
    assert_eq!(full.load(std::sync::atomic::Ordering::Relaxed), usize::MAX);
}`;

const transferPairStarter = `use std::sync::Mutex;

fn transfer_pair(
    state: &Mutex<(usize, usize)>,
    amount: usize,
) -> Result<(), &'static str> {
    let _ = (state, amount);
    Err("nie zaimplementowano")
}`;

const transferPairSolution = `use std::sync::Mutex;

fn transfer_pair(
    state: &Mutex<(usize, usize)>,
    amount: usize,
) -> Result<(), &'static str> {
    let mut pair = state.lock().map_err(|_| "zablokowany stan")?;
    if pair.0 < amount {
        return Err("niedobór");
    }
    let right = pair.1.checked_add(amount).ok_or("przepełnienie")?;
    pair.0 -= amount;
    pair.1 = right;
    Ok(())
}`;

const transferPairTests = `#[test]
fn transfer_pair_commits_both_fields_together() {
    let state = std::sync::Mutex::new((10, 4));
    assert_eq!(transfer_pair(&state, 3), Ok(()));
    assert_eq!(*state.lock().unwrap(), (7, 7));
}

#[test]
fn transfer_pair_rejects_without_partial_change() {
    let insufficient = std::sync::Mutex::new((2, 4));
    assert_eq!(transfer_pair(&insufficient, 3), Err("niedobór"));
    assert_eq!(*insufficient.lock().unwrap(), (2, 4));

    let overflow = std::sync::Mutex::new((usize::MAX, usize::MAX));
    assert_eq!(transfer_pair(&overflow, 1), Err("przepełnienie"));
    assert_eq!(*overflow.lock().unwrap(), (usize::MAX, usize::MAX));
}`;

const relaxedSnapshotBlankSolution = `use std::sync::Mutex;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Stamp {
    value: usize,
    version: usize,
}

fn apply_if_current(
    slot: &Mutex<Stamp>,
    expected: Stamp,
    new_value: usize,
) -> bool {
    let mut current = match slot.lock() {
        Ok(value) => value,
        Err(_) => return false,
    };
    if *current != expected {
        return false;
    }
    let Some(version) = current.version.checked_add(1) else {
        return false;
    };
    *current = Stamp { value: new_value, version };
    true
}`;

const relaxedSnapshotBlankTests = `#[test]
fn apply_if_current_rejects_a_stale_snapshot_after_a_to_b_to_a() {
    let slot = std::sync::Mutex::new(Stamp { value: 1, version: 0 });
    let first = Stamp { value: 1, version: 0 };
    assert!(!apply_if_current(&slot, Stamp { value: 9, version: 0 }, 4));
    assert_eq!(*slot.lock().unwrap(), Stamp { value: 1, version: 0 });
    assert!(apply_if_current(&slot, first, 2));
    let second = Stamp { value: 2, version: 1 };
    assert!(apply_if_current(&slot, second, 1));
    assert_eq!(*slot.lock().unwrap(), Stamp { value: 1, version: 2 });
    assert!(!apply_if_current(&slot, first, 9));
    assert_eq!(*slot.lock().unwrap(), Stamp { value: 1, version: 2 });
}

#[test]
fn apply_if_current_keeps_max_version_unchanged_on_overflow() {
    let expected = Stamp { value: 7, version: usize::MAX };
    let slot = std::sync::Mutex::new(expected);
    assert!(!apply_if_current(&slot, expected, 8));
    assert_eq!(*slot.lock().unwrap(), expected);
}`;

const reviewRmw = exercise({
  id: "review-atomic-rmw",
  kind: "apply",
  title: "Powtórka: atomowy przydział zakresu",
  prompt:
    "Dokończ `allocate_id`, aby zwracać pierwszy numer przydzielonego zakresu i atomowo przesuwać dostarczony licznik o `width`. Użyj operacji RMW; test wymaga starej wartości, obsługi width=0 i jawnego zachowania zawijania.",
  code: `use std::sync::atomic::{AtomicUsize, Ordering};

fn allocate_id(counter: &AtomicUsize, width: usize) -> usize {
    counter.load(Ordering::Relaxed) + width
}`,
  solution: `use std::sync::atomic::{AtomicUsize, Ordering};

fn allocate_id(counter: &AtomicUsize, width: usize) -> usize {
    counter.fetch_add(width, Ordering::Relaxed)
}`,
  tests: `#[test]
fn review_allocate_id_returns_previous_start_and_moves_counter() {
    let counter = AtomicUsize::new(5);
    assert_eq!(allocate_id(&counter, 4), 5);
    assert_eq!(counter.load(Ordering::Relaxed), 9);
    assert_eq!(allocate_id(&counter, 0), 9);
    assert_eq!(counter.load(Ordering::Relaxed), 9);
}

#[test]
fn review_allocate_id_wraps_at_max() {
    let counter = AtomicUsize::new(usize::MAX - 1);
    assert_eq!(allocate_id(&counter, 3), usize::MAX - 1);
    assert_eq!(counter.load(Ordering::Relaxed), 1);
}`,
  hints: [
    "Potrzebujesz jednej operacji, która czyta starą wartość i zapisuje nową bez osobnego okna między nimi.",
    "Kontrakt `fetch_add` zwraca wartość sprzed przyrostu i używa arytmetyki zawijającej.",
  ],
  forbiddenPatterns: [".load(", ".store("],
});

const reviewCas = exercise({
  id: "review-atomic-cas",
  kind: "apply",
  title: "Powtórka: ustawienie minimum przez CAS",
  prompt:
    "Dokończ `raise_to`, aby ustawić `cell` na co najmniej `target` przez najwyżej 8 prób silnego compare_exchange. Nie używaj osobnego store. Testy sekwencyjne i ograniczenie kodu odrzucają prosty load/store; nie są dowodem wszystkich harmonogramów. Zwróć `true` tylko po faktycznym zapisie, `false` gdy wartość już wystarcza lub próby się skończą. Nie obniżaj wartości i nie zawijaj.",
  code: `use std::sync::atomic::{AtomicUsize, Ordering};

fn raise_to(cell: &AtomicUsize, target: usize) -> bool {
    cell.load(Ordering::Relaxed) >= target
}`,
  solution: `use std::sync::atomic::{AtomicUsize, Ordering};

fn raise_to(cell: &AtomicUsize, target: usize) -> bool {
    let mut current = cell.load(Ordering::Relaxed);
    for _attempt in 0..8 {
        if current >= target { return false; }
        match cell.compare_exchange(current, target, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return true,
            Err(observed) => current = observed,
        }
    }
    false
}`,
  tests: `#[test]
fn review_raise_to_only_commits_a_real_increase() {
    let cell = AtomicUsize::new(2);
    assert!(raise_to(&cell, 7));
    assert_eq!(cell.load(Ordering::Relaxed), 7);
    assert!(!raise_to(&cell, 7));
    assert!(!raise_to(&cell, 3));
    assert_eq!(cell.load(Ordering::Relaxed), 7);
}

#[test]
fn review_raise_to_handles_zero_and_max() {
    let zero = AtomicUsize::new(0);
    assert!(!raise_to(&zero, 0));
    assert!(raise_to(&zero, usize::MAX));
    assert_eq!(zero.load(Ordering::Relaxed), usize::MAX);
    assert!(!raise_to(&zero, usize::MAX));
}`,
  hints: [
    "Po nieudanym CAS `Err` jest nowym current; nie ignoruj zaobserwowanej wartości.",
    "Najpierw odrzuć stan, który już spełnia minimum, a zapis wykonuj tylko dla równego oczekiwania.",
  ],
  forbiddenPatterns: [".store("],
});

const reviewLimits = exercise({
  id: "review-atomic-limits",
  kind: "apply",
  title: "Powtórka: warunkowa transakcja pary",
  prompt:
    'Dokończ `transfer_pair_if_current`, aby pod jednym Mutex sprawdzić oczekiwaną parę i wykonać transfer `amount` z lewego pola do prawego. Zwróć Ok(()) po sukcesie; błędy to dokładnie Err("nieaktualny") dla starego snapshotu, Err("niedobór") przy braku jednostek i Err("przepełnienie") przy overflow. Sprawdzaj je w tej kolejności i pozostaw oba pola bez zmiany; opisz, dlaczego dwa niezależne atomiki nie zastępują tej transakcji.',
  code: `use std::sync::Mutex;

fn transfer_pair_if_current(
    state: &Mutex<(usize, usize)>,
    expected: (usize, usize),
    amount: usize,
) -> Result<(), &'static str> {
    let _ = (state, expected, amount);
    Err("nie zaimplementowano")
}`,
  solution: `use std::sync::Mutex;

fn transfer_pair_if_current(
    state: &Mutex<(usize, usize)>,
    expected: (usize, usize),
    amount: usize,
) -> Result<(), &'static str> {
    let mut pair = state.lock().map_err(|_| "zablokowany stan")?;
    if *pair != expected {
        return Err("nieaktualny");
    }
    if pair.0 < amount {
        return Err("niedobór");
    }
    let right = pair.1.checked_add(amount).ok_or("przepełnienie")?;
    pair.0 -= amount;
    pair.1 = right;
    Ok(())
}`,
  tests: `#[test]
fn review_transfer_pair_commits_both_fields_together() {
    let state = Mutex::new((10, 4));
    assert_eq!(transfer_pair_if_current(&state, (10, 4), 3), Ok(()));
    assert_eq!(*state.lock().unwrap(), (7, 7));
}

#[test]
fn review_transfer_pair_rejects_stale_snapshot_and_errors_without_change() {
    let stale = Mutex::new((10, 4));
    assert_eq!(transfer_pair_if_current(&stale, (9, 4), 3), Err("nieaktualny"));
    assert_eq!(*stale.lock().unwrap(), (10, 4));

    let insufficient = Mutex::new((2, 4));
    assert_eq!(transfer_pair_if_current(&insufficient, (2, 4), 3), Err("niedobór"));
    assert_eq!(*insufficient.lock().unwrap(), (2, 4));
    let overflow = Mutex::new((usize::MAX, usize::MAX));
    assert_eq!(transfer_pair_if_current(&overflow, (usize::MAX, usize::MAX), 1), Err("przepełnienie"));
    assert_eq!(*overflow.lock().unwrap(), (usize::MAX, usize::MAX));
}`,
  hints: [
    "Guard musi obejmować porównanie oczekiwanej pary, checked_add oraz oba zapisy; zwolnij go dopiero po zakończeniu transakcji.",
    "Najpierw odrzuć nieaktualny snapshot i policz prawy wynik, dopiero potem zmień lewą oraz prawą część.",
  ],
});

export const atomicStateLessons: Lesson[] = [
  {
    id: "atomic-rmw",
    moduleId: "atomic-state",
    conceptIds: ["atomic-rmw"],
    competencyIds: ["reason-about-atomic-rmw"],
    prerequisites: ["mutex-recovery"],
    title: "Atomic RMW: jeden krok dla jednej liczby",
    subtitle:
      "Zobaczysz utraconą aktualizację, odzyskasz starą wartość przez fetch_add i sprawdzisz zawijanie usize.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz, dlaczego osobne load i store nie tworzą bezpiecznego przyrostu.",
      "Użyjesz fetch_add jako pojedynczej operacji read-modify-write i zinterpretujesz zwróconą starą wartość.",
      "Rozpoznasz, że fetch_add zawija overflow i nie jest automatycznie checked.",
    ],
    steps: [
      choose(
        "atomic-rmw-predict",
        "predict",
        "Przewidź dwa zapisy",
        "Dwóch workerów wykonuje na wspólnym `AtomicUsize` sekwencję: `let old = counter.load(Relaxed); let next = old + 1; counter.store(next, Relaxed);`. Oba mogą odczytać 4 przed zapisaniem. Jaki końcowy stan jest możliwy?",
        1,
        [
          "Zawsze 6, bo oba workery widzą każdy zapis",
          "5, bo oba mogą obliczyć ten sam next i jeden zapisze nad drugim",
          "Program nie skompiluje się, bo Relaxed nie istnieje",
        ],
        [
          "Osobne operacje nie obejmują całego read-modify-write jednym atomowym krokiem.",
          "Oba load mogą zobaczyć 4, a dwa store wartości 5 nie kodują faktu, że zaszły dwa przyrosty.",
          "Relaxed jest prawidłowym orderingiem dla atomowych load i store; problemem jest protokół, nie kompilacja.",
        ],
      ),
      run(
        "atomic-rmw-run",
        "Uruchom fetch_add",
        "Program wykonuje dwie operacje sekwencyjnie na jednym atomiku. Odczyt po obu operacjach pokazuje stan, a fetch_add zwraca numery sprzed przydziału.",
        `use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let counter = AtomicUsize::new(10);
    let first = counter.fetch_add(3, Ordering::Relaxed);
    let second = counter.fetch_add(2, Ordering::Relaxed);
    println!("stare: {first} {second}; teraz: {}", counter.load(Ordering::Relaxed));
}`,
        "stare: 10 13; teraz: 15\n",
      ),
      choose(
        "atomic-rmw-explain",
        "explain",
        "Stara czy nowa wartość?",
        "`fetch_add(2, Relaxed)` na liczniku równym 7 zwraca 7. Które zdanie opisuje ten kontrakt?",
        0,
        [
          "Zwraca wartość sprzed RMW, a po operacji licznik wynosi 9",
          "Zwraca nową wartość 9, ale licznik pozostaje 7",
          "Zwraca zawsze 0, bo Relaxed nie odczytuje liczby",
        ],
        [
          "RMW zwraca starą wartość jako wynik operacji i zapisuje nową w tej samej atomowej czynności.",
          "Nowa wartość pozostaje w lokalizacji; wynik fetch_add jest poprzednim stanem.",
          "Relaxed nadal wykonuje atomowy odczyt i zapis tej lokalizacji.",
        ],
      ),
      choose(
        "atomic-rmw-overflow",
        "recall",
        "Rozpoznaj zawijanie",
        "Dla `AtomicUsize::new(usize::MAX)`, jaki wynik i stan da `fetch_add(1, Relaxed)`?",
        2,
        [
          "Panic i niezmieniony MAX",
          "Err i stan MAX",
          "Zwróci MAX, a zapisze 0",
        ],
        [
          "fetch_add nie jest checked i sam nie panikuje z powodu overflow.",
          "Operacja nie zwraca Result; overflow jest zdefiniowany przez zawijanie typu.",
          "Wynik to stara wartość MAX, a nowa wartość po modulo to 0.",
        ],
      ),
      exercise({
        id: "atomic-rmw-fetch-gate",
        kind: "debug",
        title: "Napraw przydział ticketu",
        prompt:
          "Napraw `reserve_ticket`, aby atomowo przydzielał `amount` na dostarczonym `AtomicUsize` i zwracał początek zakresu, czyli wartość sprzed update. Użyj jednej operacji RMW; test wymaga starej wartości, obsługi amount=0 i jawnego zachowania zawijania. Evaluator odrzuca osobne load/store w tej funkcji, lecz nie jest analizą dowolnych harmonogramów wątków.",
        code: rmwStarter,
        solution: rmwSolution,
        tests: rmwTests,
        hints: [
          "Dwa osobne load i store otwierają okno utraconej aktualizacji.",
          "Wybierz metodę AtomicUsize, która w jednym RMW zwraca starą wartość.",
        ],
        forbiddenPatterns: [".load(", ".store("],
        gate: true,
      }),
      exercise({
        id: "atomic-rmw-counter-blank",
        kind: "blank",
        title: "Od pustej kartki: atomowe flagi",
        prompt:
          "Napisz funkcję `mark_flags`, która przyjmuje dostarczony `&AtomicUsize` i maskę `usize`, a zwraca parę starej i nowej wartości. Jedną operacją RMW ustaw wszystkie bity z maski; zachowaj już ustawione bity i obsłuż maskę 0 oraz granicę MAX bez arytmetycznego overflow.",
        solution: rmwBlankSolution,
        tests: rmwBlankTests,
        hints: [
          "Wybierz bitową operację RMW, która zwraca wartość sprzed zmiany i nie wymaga osobnego load/store.",
          "Nową wartość pary policz ze starej wartości i maski; nie twórz drugiego atomika ani nie kasuj istniejących bitów.",
        ],
        forbiddenPatterns: [".load(", ".store("],
        gate: true,
      }),
    ],
    misconceptions: [
      "Atomiczny load, obliczenie i store jest tak samo atomowy jak fetch_add.",
      "Wynik fetch_add to nowa wartość po przyroście.",
      "fetch_add odrzuca overflow albo zgłasza go jako Err.",
      "Po Relaxed można wnioskować, że inne pola zostały opublikowane.",
    ],
    transferTask:
      "Zaprojektuj mały przydział numerów, w którym stare wartości z RMW są identyfikatorami rezerwacji, a następnie opisz osobno politykę overflow.",
    evidenceGate:
      "atomic-rmw-fetch-gate sprawdza starą wartość, update dostarczonego atomika i overflow, a atomic-rmw-counter-blank sprawdza niezależny kontrakt starej i nowej maski bitów.",
    sourceIds: ["atomic-state-std-module", "atomic-state-std-atomic-usize"],
  },
  {
    id: "atomic-cas",
    moduleId: "atomic-state",
    conceptIds: ["atomic-cas"],
    competencyIds: ["implement-cas-retry"],
    prerequisites: ["atomic-rmw"],
    title: "CAS: warunkowy update i retry",
    subtitle:
      "Odczytasz przegraną próbę, odróżnisz weak od strong i zbudujesz pętlę z jawnym limitem prób.",
    minutes: 25,
    outcomes: [
      "Wyjaśnisz, że compare_exchange zapisuje tylko przy zgodnym current.",
      "Zaktualizujesz current wartością z Err i bezpiecznie zatrzymasz retry po ograniczonej liczbie prób.",
      "Rozróżnisz prawdziwą kolizję od spurious failure compare_exchange_weak.",
    ],
    steps: [
      choose(
        "atomic-cas-predict",
        "predict",
        "Przewidź warunkowy zapis",
        "Atomik ma wartość 8. Worker wyliczył `current=8`, ale przed CAS inny zapis ustawił 10. Co zwróci `compare_exchange(current=8, new=9, ...)`?",
        1,
        [
          "Ok(8) i zapisze 9, bo pierwszy load rezerwuje wartość",
          "Err(10), a atomik pozostanie 10",
          "Ok(9), ale bez zmiany atomika",
        ],
        [
          "CAS nie rezerwuje wartości między odczytem a próbą.",
          "Porażka warunku zwraca wartość zaobserwowaną przy nieudanym sprawdzeniu i nie wykonuje zapisu.",
          "Ok oznacza udany zapis; nie może wystąpić przy niezgodnym current.",
        ],
      ),
      run(
        "atomic-cas-run",
        "Uruchom udany CAS",
        "Tu nie ma współbieżnego workera, więc próba jest deterministyczna. W kolejnym kroku zobaczysz, jak kod powinien reagować na Err.",
        `use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let cell = AtomicUsize::new(4);
    let result = cell.compare_exchange(4, 9, Ordering::Relaxed, Ordering::Relaxed);
    println!("wynik: {:?}; stan: {}", result, cell.load(Ordering::Relaxed));
}`,
        "wynik: Ok(4); stan: 9\n",
      ),
      choose(
        "atomic-cas-failure-value",
        "explain",
        "Użyj obserwowanej wartości",
        "Pętla dostała `Err(12)` po próbie z `current=8`. Co powinna zrobić przed następnym kandydatem?",
        2,
        [
          "Zignorować 12 i ponowić cały czas z 8",
          "Uznać, że CAS na pewno zapisał nową wartość",
          "Ustawić current=12, policzyć nowy i spróbować ponownie albo jawnie odmówić",
        ],
        [
          "Powtarzanie ze starym current skazuje próbę na błędne założenie o stanie.",
          "Err oznacza brak zapisu, nie jego sukces.",
          "Err niesie obserwację potrzebną do następnego kandydata; retry musi mieć także warunek końca.",
        ],
      ),
      choose(
        "atomic-cas-weak-strong",
        "recall",
        "Weak czy strong?",
        "Które zdanie poprawnie porównuje `compare_exchange_weak` i `compare_exchange`?",
        0,
        [
          "Weak może przegrać pozornie mimo zgodności i dlatego pasuje do pętli retry; strong nie ma porażek pozornych",
          "Strong zawsze czeka na wszystkie workery, a weak blokuje wątek",
          "Weak nie zwraca obserwowanej wartości, a strong zwraca ją tylko po sukcesie",
        ],
        [
          "Weak dopuszcza spurious failure; oba warianty jednak zwracają Err(obserwowane) przy realnej niezgodności.",
          "Żaden wariant nie jest mechanizmem join ani blokadą; ordering opisuje pamięć, nie harmonogram.",
          "Oba wyniki Result niosą wartość w Err; po sukcesie Ok jest zgodne z current.",
        ],
      ),
      exercise({
        id: "atomic-cas-retry-gate",
        kind: "debug",
        title: "Napraw ograniczony retry CAS",
        prompt:
          "Uzupełnij `add_with_retry`. Użyj dostarczonego interfejsu `CasCell`, aby test mógł podać prawdziwy adapter `AtomicUsize` oraz deterministycznie wstrzyknąć zmianę observed, porażkę pozorną i wyczerpanie budżetu. Po każdej porażce użyj obserwowanej wartości, sprawdź overflow przez checked_add, po sukcesie zwróć `Ok(new)`, po overflow `Err(\"przepełnienie\")`, a po 8 nieudanych próbach `Err(\"za dużo kolizji\")`. Wykonaj najwyżej 8 prób. Dla tego lokalnego countera Relaxed wystarcza; silniejsze orderingi i publikowanie poznasz później. Test instrumentowany dowodzi zachowania retry dla scenariusza testowego; nie jest dowodem wszystkich harmonogramów zwykłego runu.",
        code: casRetryStarter,
        solution: casRetrySolution,
        tests: casRetryTests,
        hints: [
          "Trait adapter pozwala testowi osobno pokazać zmianę observed, porażkę pozorną i deterministyczne wyczerpanie bez uzależniania wyniku od schedulera.",
          "Nie twórz nowego atomika w funkcji. Kandydat musi wynikać z aktualnego current, a po ośmiu próbach odmowa ma być jawna.",
        ],
        gate: true,
      }),
      exercise({
        id: "atomic-cas-conditional-blank",
        kind: "blank",
        title: "Od pustej kartki: update pod limitem",
        prompt:
          "Napisz `add_below_limit`, która przyjmuje `&AtomicUsize`, `amount: usize` i `limit: usize`, a przez bounded CAS doda amount tylko wtedy, gdy wynik nie przekroczy limitu. Użyj silnego `compare_exchange`, aby ten test nie zależał od losowej porażki pozornej. Zwróć true wyłącznie po udanym zapisie i wykonaj najwyżej 8 prób. Zachowaj stan przy odmowie i overflow; dla amount=0 zwróć true, gdy bieżąca wartość jest nie większa od limitu.",
        solution: casConditionalBlankSolution,
        tests: casConditionalBlankTests,
        hints: [
          "Po load sprawdź kandydata przez checked_add i limit, zanim spróbujesz zapisu.",
          "Err z CAS jest nową obserwacją; po ograniczonej liczbie prób odmowa ma zostawić komórkę bez dodatkowego zapisu. Osobny load i store nie tworzą warunkowego RMW.",
        ],
        forbiddenPatterns: [".store("],
        gate: true,
      }),
    ],
    misconceptions: [
      "CAS gwarantuje, że wartość z pierwszego load czeka na nas.",
      "Err z compare_exchange oznacza, że zapis już zaszedł.",
      "compare_exchange_weak jest błędny, bo porażka pozorna oznacza uszkodzony atomik.",
      "Pętla retry może być bezwarunkowo nieskończona w kodzie produkcyjnym.",
    ],
    transferTask:
      "Zaprojektuj bounded CAS dla reguły domenowej, która odrzuca kandydata bez zapisu i potrafi wyjaśnić, co oznacza każda zaobserwowana porażka.",
    evidenceGate:
      "atomic-cas-retry-gate sprawdza aktualny interfejs AtomicUsize, wstrzyknięte porażki pozorne, observed value, overflow i limit retry; atomic-cas-conditional-blank sprawdza niezależną regułę limitu na dostarczonym atomiku.",
    sourceIds: [
      "atomic-state-std-atomic-methods",
      "atomic-state-std-atomic-usize",
    ],
  },
  {
    id: "atomic-limits",
    moduleId: "atomic-state",
    conceptIds: ["atomic-limits"],
    competencyIds: ["bound-atomic-guarantees"],
    prerequisites: ["atomic-cas"],
    title: "Granice atomika: Relaxed, niezmiennik i ABA",
    subtitle:
      "Oddzielisz lokalny counter od transakcji kilku pól, rozpoznasz ABA dzięki wersji i nie pomylisz lock-free z wait-free.",
    minutes: 20,
    outcomes: [
      "Powiesz dokładnie, co Relaxed synchronizuje i czego nie obiecuje dla innych pól.",
      "Dobierzesz Mutex dla niezmiennika kilku pól i zatwierdzisz transfer bez częściowej zmiany.",
      "Odróżnisz logiczny problem ABA od data race i wskażesz potrzebę wersjonowania, gdy równość nie wystarcza.",
      "Rozróżnisz lock-free, wait-free i pytanie o rzeczywistą wydajność.",
    ],
    steps: [
      choose(
        "atomic-limits-predict",
        "predict",
        "Przewidź zakres Relaxed",
        "Worker zapisuje `payload = 42` do zwykłego pola, a potem `ready.store(true, Relaxed)`. Drugi worker widzi `ready=true`. Jaką gwarancję daje ten atomik sam z siebie?",
        2,
        [
          "Wszystkie zwykłe pola programu są automatycznie opublikowane",
          "ready=true dowodzi, że payload=42 jest widoczne w każdym wątku",
          "Zapewnia atomowy dostęp do ready; nie stanowi tu protokołu publikacji payloadu",
        ],
        [
          "Relaxed nie rozszerza się automatycznie na wszystkie pola.",
          "Samo odczytanie true nie daje tej obietnicy przy Relaxed.",
          "Ordering Relaxed ogranicza się do operacji atomowej i nie zastępuje acquire/release protokołu publikacji.",
        ],
      ),
      run(
        "atomic-limits-run",
        "Uruchom lokalny counter",
        "Obserwujemy tylko jedną lokalizację i odczytujemy ją po zakończeniu kodu. Program nie sugeruje, że counter publikuje jakiekolwiek sąsiednie dane.",
        `use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let counter = AtomicUsize::new(0);
    let old = counter.fetch_add(1, Ordering::Relaxed);
    println!("stara: {old}; nowa: {}", counter.load(Ordering::Relaxed));
}`,
        "stara: 0; nowa: 1\n",
      ),
      choose(
        "atomic-limits-aba",
        "explain",
        "Równość czy tożsamość?",
        "Wskaźnik obserwuje A, inny kod zmienia A→B→A, a CAS widzi ponownie A. Dlaczego samo porównanie równości może być niewystarczające?",
        1,
        [
          "To na pewno data race, bo każdy CAS jest nieatomowy",
          "Bitowa równość A nie dowodzi, że obiekt nie zmienił generacji; potrzebny może być znacznik wersji",
          "CAS zawsze wykrywa B, więc ABA nie jest możliwe",
        ],
        [
          "CAS jest atomowy dla swojej lokalizacji; problem dotyczy znaczenia ponownie równej wartości.",
          "ABA jest logiczną pułapką tożsamości, nawet gdy każde odwołanie do atomika jest poprawne.",
          "CAS może zobaczyć A po powrocie z B i wtedy nie odróżnić generacji bez dodatkowego znacznika.",
        ],
      ),
      choose(
        "atomic-limits-progress",
        "recall",
        "Rozróżnij gwarancje postępu",
        "Które zdanie jest zgodne z kontraktem modułu atomic?",
        0,
        [
          "Lock-free oznacza gwarancję postępu systemu dla dostępnych operacji, bez gwarancji ograniczonej liczby kroków każdej operacji ani szybszego programu",
          "Lock-free gwarantuje, że każda operacja kończy się po stałej liczbie kroków",
          "Wait-free i lock-free są synonimami, a oba zawsze wygrywają z Mutex",
        ],
        [
          "Lock-free mówi o postępie systemu; dostępne operacje atomowe nie używają globalnego Mutex, lecz pojedyncza operacja może nadal przegrywać z konkurencją. Wait-free dopiero ogranicza kroki każdej operacji, a wydajność wymaga osobnej oceny.",
          "Pętla CAS może ponawiać się przez konkurencję, więc lock-free nie jest wait-free.",
          "Wydajność zależy od sprzętu, kontencji i kosztu; nazwy gwarancji nie są obietnicą benchmarku.",
        ],
      ),
      exercise({
        id: "atomic-limits-counter-gate",
        kind: "debug",
        title: "Napraw transakcję dwóch pól",
        prompt:
          "Napraw `transfer_pair`, która przyjmuje `&Mutex<(usize, usize)>` i `amount: usize`, a zwraca `Result<(), &str>`. Pod jednym Mutex przenieś amount z lewego pola do prawego. Przy niedoborze zwróć `Err(\"niedobór\")`, przy overflow `Err(\"przepełnienie\")`, a oba pola pozostaw bez zmiany. Wyjaśnij, dlaczego dwa niezależne atomiki nie tworzą transakcji takiego niezmiennika.",
        code: transferPairStarter,
        solution: transferPairSolution,
        tests: transferPairTests,
        hints: [
          "Guard z `Mutex` musi obejmować sprawdzenie, `checked_add` i oba zapisy.",
          "Policz prawy wynik przed zmianą lewego pola; błąd ma zostawić całą parę bez zmian.",
        ],
        gate: true,
      }),
      exercise({
        id: "atomic-limits-snapshot-blank",
        kind: "blank",
        title: "Od pustej kartki: warunkowa zmiana z wersją",
        prompt:
          "Zdefiniuj `#[derive(Clone, Copy, Debug, PartialEq, Eq)] struct Stamp { value: usize, version: usize }` oraz `apply_if_current`, która przyjmuje `&Mutex<Stamp>`, `expected: Stamp` i `new_value: usize`, zwracając `bool`. Pod guardem zaakceptuj zmianę tylko wtedy, gdy zgadzają się wartość i wersja; zwiększ wersję przez `checked_add`. Test przeprowadza A→B→A, odrzuca stary snapshot i wymaga pozostawienia MAX wersji bez zmiany.",
        solution: relaxedSnapshotBlankSolution,
        tests: relaxedSnapshotBlankTests,
        hints: [
          "Porównaj parę `value` i `version` pod jednym guardem; sama równość value nie wykrywa ABA.",
          "Nie zapisuj nowego Stamp, jeśli `checked_add` wersji się nie uda; to odrzucenie ma być bez efektu ubocznego.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Relaxed atomik publikuje automatycznie wszystkie zwykłe zapisy wykonane obok niego.",
      "Dwa niezależne atomiki zapewniają transakcję dla niezmiennika obejmującego dwa pola.",
      "ABA to to samo co data race i zawsze oznacza UB.",
      "Lock-free znaczy wait-free.",
      "Atomiki są zawsze szybsze od Mutex, niezależnie od kontencji i protokołu.",
    ],
    transferTask:
      "Zaprojektuj zarówno kontrakt countera dla pojedynczej lokalizacji, jak i `transfer_pair` chroniący niezmiennik dwóch pól. Następnie pokaż, jak Stamp z wersją odrzuca stary snapshot po A→B→A, oraz wskaż, że Relaxed nie jest protokołem publikacji zwykłych pól.",
    evidenceGate:
      "atomic-limits-counter-gate sprawdza warunkowy transfer dwóch pól, niezmienność przy Err i ochronę Mutex; atomic-limits-snapshot-blank sprawdza wersję, scenariusz A→B→A oraz overflow wersji.",
    sourceIds: [
      "atomic-state-std-module",
      "atomic-state-std-mutex",
      "atomic-state-std-ordering",
      "atomic-state-nomicon-atomics",
    ],
  },
];

export const atomicStateReviewExercises: Record<string, LessonStep> = {
  "atomic-rmw": reviewRmw,
  "atomic-cas": reviewCas,
  "atomic-limits": reviewLimits,
};

export const atomicStateModule: CourseModule = {
  id: "atomic-state",
  title: "Atomiki: RMW, CAS i granice gwarancji",
  whyItMatters:
    "AtomicUsize pozwala bez blokady aktualizować pojedynczą współdzieloną lokalizację, lecz poprawny projekt wymaga rozróżnienia RMW, warunkowego CAS, orderingów oraz granic publikacji i postępu.",
  capabilities: [
    "Zastępujesz utracone aktualizacje load/store pojedynczym RMW i wykorzystujesz zwracaną starą wartość.",
    "Budujesz CAS retry z observed value, bounded próbami i testem adaptera dla porażek pozornych weak.",
    "Dobierasz Mutex dla niezmiennika kilku pól i znacznik wersji dla ABA, a z Relaxed i lock-free nie wyprowadzasz obietnic publikacji, wait-free ani szybkości.",
  ],
  prerequisites: ["synchronized-state"],
  lessonIds: atomicStateLessons.map((lesson) => lesson.id),
  exitGate: [
    "RMW obejmuje odczyt i zapis jednej lokalizacji, zwraca starą wartość, a fetch_add zawija overflow.",
    "CAS zapisuje wyłącznie dla oczekiwanego current; Err niesie observed value, weak może przegrać pozornie, a retry ma jawny limit.",
    "Relaxed dotyczy pojedynczej lokalizacji, Mutex składa transakcję kilku pól, wersja odróżnia ABA, a lock-free nie oznacza wait-free ani automatycznie szybkiego.",
  ],
  projectConnection:
    "W analizatorze logów atomowy licznik może bez blokady numerować zdarzenia lub zliczać próby, ale transfer kilku pól wymaga wspólnego Mutex, a rekordy i ich publikacja nadal wymagają osobnego, jawnego protokołu własności i orderingów.",
  assessmentId: "atomic-cas/atomic-cas-conditional-blank",
  gateCriteria: [
    {
      id: "atomic-state-rmw-gate",
      label:
        "Pojedynczy atomowy RMW zachowuje każdy update, zwraca starą wartość i ma jawnie sprawdzony kontrakt overflow.",
      taskRefs: [
        { lessonId: "atomic-rmw", stepId: "atomic-rmw-fetch-gate" },
        { lessonId: "atomic-rmw", stepId: "atomic-rmw-counter-blank" },
      ],
    },
    {
      id: "atomic-state-cas-gate",
      label:
        "CAS reaguje na observed value i weak failure w bounded retry, a warunkowy update nie zapisuje odrzuconej wartości.",
      taskRefs: [
        { lessonId: "atomic-cas", stepId: "atomic-cas-retry-gate" },
        { lessonId: "atomic-cas", stepId: "atomic-cas-conditional-blank" },
      ],
    },
    {
      id: "atomic-state-limits-gate",
      label:
        "Rozwiązanie rozdziela Relaxed dla pojedynczej lokalizacji, Mutex dla niezmiennika kilku pól i wersję wykrywającą ABA, bez obietnic wait-free ani wydajności.",
      taskRefs: [
        { lessonId: "atomic-limits", stepId: "atomic-limits-counter-gate" },
        { lessonId: "atomic-limits", stepId: "atomic-limits-snapshot-blank" },
      ],
    },
  ],
};
