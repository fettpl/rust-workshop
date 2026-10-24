import type { LessonStep } from "@/domain/types";

export const slotLazyInitPrimaryStepId =
  "slot-state-lazy-init-transfer" as const;
export const slotLazyInitFamily = "unsafe-miri/slot-lazy-init-v1" as const;
export const slotLazyInitConceptId = "unsafe-miri-slot-state-contract" as const;

/** A safe Option model used only to expose the state machine, not the unsafe proof. */
export const slotLazyInitModel = String.raw`fn main() {
    let mut slot: Option<String> = None;
    let mut calls = 0;
    println!("pusty: {}", slot.is_none());

    let failed: Result<(), &str> = Err("spróbuj ponownie");
    println!(
        "Err zachowuje pusty: {}, błąd: {:?}",
        slot.is_none(),
        failed
    );

    calls += 1;
    slot = Some(String::from("zainicjalizowany"));
    println!("pełny: {}, wywołania: {}", slot.is_some(), calls);

    let skipped = || {
        calls += 1;
        String::from("nieużyte")
    };
    if slot.is_some() {
        drop(skipped);
    }
    println!(
        "pełny pomija ciało: {}, wywołania: {}",
        slot.is_some(),
        calls
    );

    let taken = slot.take();
    println!("przejęty: {:?}, pusty po take: {}", taken, slot.is_none());

    calls += 1;
    slot = Some(String::from("udana ponowna próba"));
    println!("ponowna próba: {}, wywołania: {}", slot.is_some(), calls);
}
`;

/** Memory-safe starter: the learner supplies the lazy transition body. */
export const slotLazyInitStarter = String.raw`use std::mem::MaybeUninit;

pub struct LazySlot<T> {
    value: MaybeUninit<T>,
    full: bool,
}

impl<T> LazySlot<T> {
    pub fn new() -> Self {
        Self {
            value: MaybeUninit::uninit(),
            full: false,
        }
    }

    pub fn get_or_try_init<E, F>(&mut self, _init: F) -> Result<&mut T, E>
    where
        F: FnOnce() -> Result<T, E>,
    {
        todo!("zaimplementuj leniwą inicjalizację")
    }

    pub fn take(&mut self) -> Option<T> {
        if !self.full {
            return None;
        }
        self.full = false;
        Some(unsafe { self.value.assume_init_read() })
    }
}

impl<T> Drop for LazySlot<T> {
    fn drop(&mut self) {
        if self.full {
            unsafe {
                self.value.assume_init_drop();
            }
        }
    }
}

impl<T> Default for LazySlot<T> {
    fn default() -> Self {
        Self::new()
    }
}
`;

/** Canonical implementation: the Full bit is the sole MaybeUninit invariant. */
export const slotLazyInitSolution = String.raw`use std::mem::MaybeUninit;

pub struct LazySlot<T> {
    value: MaybeUninit<T>,
    full: bool,
}

impl<T> LazySlot<T> {
    pub fn new() -> Self {
        Self {
            value: MaybeUninit::uninit(),
            full: false,
        }
    }

    pub fn get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>
    where
        F: FnOnce() -> Result<T, E>,
    {
        if self.full {
            // SAFETY: full means value contains exactly one live T.
            return Ok(unsafe { self.value.assume_init_mut() });
        }

        let value = init()?;
        self.value.write(value);
        self.full = true;

        // SAFETY: the write immediately above established the invariant.
        Ok(unsafe { self.value.assume_init_mut() })
    }

    pub fn take(&mut self) -> Option<T> {
        if !self.full {
            return None;
        }
        self.full = false;

        // SAFETY: the old state was Full and is cleared before ownership moves.
        Some(unsafe { self.value.assume_init_read() })
    }
}

impl<T> Drop for LazySlot<T> {
    fn drop(&mut self) {
        if self.full {
            // SAFETY: only a Full slot contains a live value to drop.
            unsafe {
                self.value.assume_init_drop();
            }
        }
    }
}

impl<T> Default for LazySlot<T> {
    fn default() -> Self {
        Self::new()
    }
}
`;

/** Equivalent MaybeUninit implementation written with an explicit match. */
export const slotLazyInitEquivalent = String.raw`use std::mem::MaybeUninit;

pub struct LazySlot<T> {
    value: MaybeUninit<T>,
    full: bool,
}

impl<T> LazySlot<T> {
    pub fn new() -> Self {
        Self {
            value: MaybeUninit::uninit(),
            full: false,
        }
    }

    pub fn get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>
    where
        F: FnOnce() -> Result<T, E>,
    {
        match self.full {
            true => Ok(unsafe { self.value.assume_init_mut() }),
            false => {
                let next = init()?;
                self.value.write(next);
                self.full = true;
                Ok(unsafe { self.value.assume_init_mut() })
            }
        }
    }

    pub fn take(&mut self) -> Option<T> {
        match self.full {
            false => None,
            true => {
                self.full = false;
                Some(unsafe { self.value.assume_init_read() })
            }
        }
    }
}

impl<T> Drop for LazySlot<T> {
    fn drop(&mut self) {
        if self.full {
            unsafe {
                self.value.assume_init_drop();
            }
        }
    }
}

impl<T> Default for LazySlot<T> {
    fn default() -> Self {
        Self::new()
    }
}
`;

/** Safe behavioral twin, retained for native grading and explanation. */
export const slotLazyInitSafeOption = String.raw`pub struct LazySlot<T> {
    value: Option<T>,
}

impl<T> LazySlot<T> {
    pub fn new() -> Self {
        Self { value: None }
    }

    pub fn get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>
    where
        F: FnOnce() -> Result<T, E>,
    {
        if self.value.is_none() {
            self.value = Some(init()?);
        }
        Ok(self
            .value
            .as_mut()
            .expect("initialized above or already full"))
    }

    pub fn take(&mut self) -> Option<T> {
        self.value.take()
    }
}

impl<T> Default for LazySlot<T> {
    fn default() -> Self {
        Self::new()
    }
}
`;

/** Safe semantic mutant: it eagerly consumes the initializer on the Full path. */
export const slotLazyInitMutant = slotLazyInitSafeOption.replace(
  "        if self.value.is_none() {\n            self.value = Some(init()?);\n        }",
  "        if self.value.is_some() {\n            let _ = init()?;\n        } else {\n            self.value = Some(init()?);\n        }",
);

/** The same behavioral contract is exercised for every native positive fixture. */
export const slotLazyInitTests = String.raw`use std::cell::Cell;
use std::marker::PhantomPinned;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::rc::Rc;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

#[derive(Debug)]
struct DropProbe(Arc<AtomicUsize>);

impl Drop for DropProbe {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

#[derive(Debug)]
struct CaptureDrop(Arc<AtomicUsize>);

impl Drop for CaptureDrop {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

static ZST_DROPS: AtomicUsize = AtomicUsize::new(0);

struct Zst;

impl Drop for Zst {
    fn drop(&mut self) {
        ZST_DROPS.fetch_add(1, Ordering::SeqCst);
    }
}

#[test]
fn full_suppresses_initializer_and_drops_captured_closure() {
    let calls = Arc::new(AtomicUsize::new(0));
    let captures = Arc::new(AtomicUsize::new(0));
    let mut slot = LazySlot::new();
    *slot
        .get_or_try_init(|| {
            calls.fetch_add(1, Ordering::SeqCst);
            Ok::<_, ()>(10_i32)
        })
        .unwrap() += 1;

    {
        let capture = CaptureDrop(captures.clone());
        let value = slot
            .get_or_try_init(move || -> Result<i32, ()> {
                drop(capture);
                panic!("full slots must not invoke init");
            })
            .unwrap();
        assert_eq!(*value, 11);
    }

    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        captures.load(Ordering::SeqCst),
        1,
        "unused capture still drops"
    );
}

#[test]
fn error_is_returned_unchanged_and_slot_stays_empty() {
    struct SentinelError(u8);

    let mut slot = LazySlot::<String>::new();
    let original = Box::new(SentinelError(7));
    let original_ptr = &*original as *const SentinelError;
    let error = slot
        .get_or_try_init(move || Err::<String, _>(original))
        .unwrap_err();
    assert_eq!(error.as_ref() as *const SentinelError, original_ptr);
    assert_eq!(error.0, 7);
    drop(error);
    assert!(slot.take().is_none());
    let retry = slot
        .get_or_try_init(|| Ok::<_, Box<SentinelError>>(String::from("retry")))
        .ok()
        .expect("retry initialized");
    assert_eq!(*retry, "retry");
}

#[test]
fn failed_initialization_can_be_retried() {
    let attempts = Arc::new(AtomicUsize::new(0));
    let mut slot = LazySlot::new();
    assert_eq!(
        slot.get_or_try_init(|| {
            attempts.fetch_add(1, Ordering::SeqCst);
            Err::<u32, _>("retry")
        }),
        Err("retry")
    );
    assert_eq!(
        *slot
            .get_or_try_init(|| {
                attempts.fetch_add(1, Ordering::SeqCst);
                Ok::<_, &str>(42)
            })
            .unwrap(),
        42
    );
    assert_eq!(attempts.load(Ordering::SeqCst), 2);
}

#[test]
fn caught_initializer_panic_leaves_slot_empty_and_retryable() {
    let mut slot = LazySlot::<u32>::new();
    let panic_result = catch_unwind(AssertUnwindSafe(|| {
        let _ = slot.get_or_try_init(|| -> Result<u32, ()> {
            panic!("fixed initializer panic");
        });
    }));
    assert!(panic_result.is_err());
    assert_eq!(*slot.get_or_try_init(|| Ok::<_, ()>(7)).unwrap(), 7);
}

#[test]
fn resident_value_drops_exactly_once() {
    let drops = Arc::new(AtomicUsize::new(0));
    {
        let mut slot = LazySlot::new();
        slot.get_or_try_init(|| Ok::<_, ()>(DropProbe(drops.clone())))
            .unwrap();
        assert_eq!(drops.load(Ordering::SeqCst), 0);
    }
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn take_transfers_ownership_and_allows_a_new_value() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut slot = LazySlot::new();
    slot.get_or_try_init(|| Ok::<_, ()>(DropProbe(drops.clone())))
        .unwrap();
    let first = slot.take().unwrap();
    assert!(slot.take().is_none());
    drop(first);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    slot.get_or_try_init(|| Ok::<_, ()>(DropProbe(drops.clone())))
        .unwrap();
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}

#[test]
fn returned_mutable_borrow_can_be_reused_after_scope() {
    let mut slot = LazySlot::new();
    {
        let value = slot.get_or_try_init(|| Ok::<_, ()>(1_u32)).unwrap();
        *value += 4;
    }
    *slot
        .get_or_try_init(|| -> Result<u32, ()> {
            panic!("initializer must be suppressed");
        })
        .unwrap() += 2;
    assert_eq!(slot.take().unwrap(), 7);
}

#[test]
fn borrowed_non_static_value_is_supported() {
    let owner = String::from("lokalne");
    let mut slot = LazySlot::new();
    let value = slot
        .get_or_try_init(|| Ok::<_, ()>(owner.as_str()))
        .unwrap();
    assert_eq!(*value, "lokalne");
}

#[test]
fn true_zst_drop_is_still_exactly_once() {
    assert_eq!(std::mem::size_of::<Zst>(), 0);
    ZST_DROPS.store(0, Ordering::SeqCst);
    let mut slot = LazySlot::new();
    slot.get_or_try_init(|| Ok::<_, ()>(Zst)).unwrap();
    drop(slot.take());
    assert_eq!(ZST_DROPS.load(Ordering::SeqCst), 1);
}

#[test]
fn non_clone_value_needs_no_extra_trait_bound() {
    struct NonClone {
        cell: Rc<Cell<u8>>,
        _pin: PhantomPinned,
    }

    let shared = Rc::new(Cell::new(3));
    let mut slot = LazySlot::new();
    {
        let value = slot
            .get_or_try_init(|| {
                Ok::<_, ()>(NonClone {
                    cell: Rc::clone(&shared),
                    _pin: PhantomPinned,
                })
            })
            .unwrap();
        value.cell.set(value.cell.get() + 4);
        assert_eq!(value.cell.get(), 7);
    }
    assert_eq!(shared.get(), 7);
    let taken = slot.take().unwrap();
    assert_eq!(taken.cell.get(), 7);
}

#[test]
fn initializer_capture_drops_after_error() {
    let captures = Arc::new(AtomicUsize::new(0));
    let mut slot = LazySlot::<u8>::new();
    {
        let capture = CaptureDrop(captures.clone());
        assert_eq!(
            slot.get_or_try_init(move || {
                drop(capture);
                Err::<u8, _>(())
            }),
            Err(())
        );
    }
    assert_eq!(captures.load(Ordering::SeqCst), 1);
}

#[test]
fn take_on_empty_does_not_call_or_drop_anything() {
    let mut slot = LazySlot::<DropProbe>::new();
    assert!(slot.take().is_none());
}

#[test]
fn retry_after_take_returns_the_new_value() {
    let mut slot = LazySlot::new();
    assert_eq!(*slot.get_or_try_init(|| Ok::<_, ()>(1_u8)).unwrap(), 1);
    assert_eq!(slot.take(), Some(1));
    assert_eq!(*slot.get_or_try_init(|| Ok::<_, ()>(2_u8)).unwrap(), 2);
}

#[test]
fn full_path_does_not_construct_a_second_resident() {
    let constructed = Arc::new(AtomicUsize::new(0));
    let mut slot = LazySlot::new();
    slot.get_or_try_init(|| {
        constructed.fetch_add(1, Ordering::SeqCst);
        Ok::<_, ()>(String::from("pierwszy"))
    })
    .unwrap();
    slot.get_or_try_init(|| {
        constructed.fetch_add(1, Ordering::SeqCst);
        Ok::<_, ()>(String::from("drugi"))
    })
    .unwrap();
    assert_eq!(constructed.load(Ordering::SeqCst), 1);
    assert_eq!(slot.take().as_deref(), Some("pierwszy"));
}
`;

const modelStep: LessonStep = {
  id: "slot-state-lazy-init-model",
  kind: "run",
  title: "Zobacz model Empty/Full",
  prompt:
    "Model `Option<T>` pokazuje przejście pusty → pełny → przejęty. To intuicja stanu, a nie dowód bezpieczeństwa `MaybeUninit<T>`. ",
  code: slotLazyInitModel,
  solution: slotLazyInitModel,
  evaluator: {
    kind: "exact-output",
    expected:
      'pusty: true\nErr zachowuje pusty: true, błąd: Err("spróbuj ponownie")\npełny: true, wywołania: 1\npełny pomija ciało: true, wywołania: 1\nprzejęty: Some("zainicjalizowany"), pusty po take: true\nponowna próba: true, wywołania: 2\n',
  },
  expectedStatus: "success",
  evidenceKind: "exposure",
  evidenceGate: false,
};

const primaryStep: LessonStep = {
  id: slotLazyInitPrimaryStepId,
  kind: "apply",
  title: "Dodaj leniwą inicjalizację z wynikiem",
  prompt:
    "Uzupełnij `LazySlot<T>` z `MaybeUninit<T>` i stanem Empty/Full. `get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>` ma wywołać `init` tylko w Empty, pozostawić slot Empty po Err lub panic, zapisać T przed zwróceniem mutowalnej pożyczki i umożliwić `take` oraz ponowną próbę. Nie dodawaj ograniczeń Clone, 'static, Send ani Unpin. Pełny slot ma pominąć ciało inicjalizatora, ale jego przechwycone wartości nadal muszą zostać poprawnie zniszczone po dropie closure.",
  code: slotLazyInitStarter,
  solution: slotLazyInitSolution,
  hints: [
    "Najpierw zapisz niezmiennik: full == true oznacza dokładnie jedną żywą wartość T.",
    "Uruchom testy Err, panic, take, Drop i pożyczki o lokalnym lifetime; nie wykonuj odczytu z Empty.",
  ],
  evaluator: { kind: "tests", tests: slotLazyInitTests },
  expectedStatus: "success",
  evidenceKind: "transfer",
  evidenceGate: true,
};

export const slotLazyInitSteps: LessonStep[] = [modelStep, primaryStep];
