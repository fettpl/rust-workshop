import type { LessonStep } from "@/domain/types";

export const mutSlotWithMutPrimaryStepId =
  "mut-slot-with-mut-transfer" as const;
export const mutSlotWithMutFamily = "unsafe-miri/mut-slot-with-mut-v1" as const;
export const mutSlotWithMutSessionStop = {
  afterStepId: "mut-slot-recall",
  title: "Zatrzymaj się przed transferem callbacka",
  nextGoal:
    "Przewidź, jak HRTB ograniczy krótką pożyczkę callbacka przed implementacją with_mut.",
} as const;

export const mutSlotWithMutModel = String.raw`struct MutSlot<'a, T> { value: &'a mut T }

impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        MutSlot { value: &mut *self.value }
    }

    fn with_mut<R, F>(&mut self, f: F) -> R
    where
        F: for<'short> FnOnce(&'short mut T) -> R,
    {
        f(&mut *self.value)
    }
}

fn main() {
    let mut value = String::from("Rust");
    let mut slot = MutSlot::new(&mut value);
    let report = slot.with_mut(|text| {
        text.push_str(" + HRTB");
        text.len()
    });
    assert_eq!(report, 11);
    println!("{}", report);
    slot.with_mut(|text| text.push('!'));
    assert_eq!(slot.get(), "Rust + HRTB!");
}

// for<'short> daje przy każdym wywołaniu świeżą, krótką pożyczkę.
// R ma jeden typ wyniku niezależny od chwilowej pożyczki, ale może pożyczać
// z zewnętrznego właściciela albo ze wspólnych danych niesionych przez T.
// FnOnce wywołuje callback dokładnie raz; zwykły unwind zachowuje wcześniejsze
// mutacje i nie obiecuje rollbacku.
`;

export const mutSlotWithMutStarter = String.raw`struct MutSlot<'a, T> {
    value: &'a mut T,
}

impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self {
        Self { value }
    }
    fn get(&self) -> &T {
        self.value
    }
    fn get_mut(&mut self) -> &mut T {
        self.value
    }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        MutSlot {
            value: &mut *self.value,
        }
    }
    fn with_mut<R, F>(&mut self, f: F) -> R
    where
        F: for<'short> FnOnce(&'short mut T) -> R,
    {
        let _result = f(&mut *self.value);
        panic!("TODO: return the callback result")
    }
}
`;

export const mutSlotWithMutSolution = String.raw`struct MutSlot<'a, T> {
    value: &'a mut T,
}

impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self {
        Self { value }
    }
    fn get(&self) -> &T {
        self.value
    }
    fn get_mut(&mut self) -> &mut T {
        self.value
    }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        MutSlot {
            value: &mut *self.value,
        }
    }
    fn with_mut<R, F>(&mut self, f: F) -> R
    where
        F: for<'short> FnOnce(&'short mut T) -> R,
    {
        f(&mut *self.value)
    }
}
`;

export const mutSlotWithMutEquivalent = String.raw`struct MutSlot<'a, T> {
    value: &'a mut T,
}
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self {
        Self { value }
    }
    fn get(&self) -> &T {
        &*self.value
    }
    fn get_mut(&mut self) -> &mut T {
        &mut *self.value
    }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        let value = &mut *self.value;
        MutSlot { value }
    }
    fn with_mut<R, F>(&mut self, f: F) -> R
    where
        F: for<'short> FnOnce(&'short mut T) -> R,
    {
        let view = &mut *self.value;
        f(view)
    }
}
`;

export const mutSlotWithMutMutant = String.raw`struct MutSlot<'a, T> {
    value: &'a mut T,
}
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self {
        Self { value }
    }
    fn get(&self) -> &T {
        self.value
    }
    fn get_mut(&mut self) -> &mut T {
        self.value
    }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        MutSlot {
            value: &mut *self.value,
        }
    }
    fn with_mut<R, F>(&mut self, f: F) -> R
    where
        F: for<'short> FnOnce(&'short mut T) -> R,
    {
        let _ = f(&mut *self.value);
        panic!("mutant: callback result discarded")
    }
}
`;

export const mutSlotWithMutTests = String.raw`use std::cell::Cell;
use std::marker::PhantomPinned;
use std::rc::Rc;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

fn accepts_with_mut<T, R, F>(slot: &mut MutSlot<'_, T>, f: F) -> R
where
    F: for<'short> FnOnce(&'short mut T) -> R,
{
    slot.with_mut(f)
}

#[test]
fn with_mut_mutates_non_copy_string_and_reuses_parent() {
    let mut value = String::from("abc");
    let mut slot = MutSlot::new(&mut value);
    let report: String = slot.with_mut(|text| {
        text.push_str("-first");
        text.clone()
    });
    assert_eq!(report, "abc-first");
    assert_eq!(slot.reborrow().get(), "abc-first");
    assert_eq!(slot.get_mut().as_str(), "abc-first");
    slot.with_mut(|text| text.push_str("-second"));
    assert_eq!(slot.get(), "abc-first-second");
}

#[test]
fn with_mut_accepts_non_send_capture_and_genuine_fnonce_once() {
    struct NoCloneResult(String);
    struct PinnedCounter {
        count: Rc<Cell<usize>>,
        _pin: PhantomPinned,
    }
    let calls = Rc::new(Cell::new(0));
    let captured = Rc::clone(&calls);
    let value_count = Rc::new(Cell::new(0));
    let capture_drops = Arc::new(AtomicUsize::new(0));
    struct CaptureDrop(Arc<AtomicUsize>);
    impl Drop for CaptureDrop {
        fn drop(&mut self) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }
    let capture = CaptureDrop(Arc::clone(&capture_drops));
    let mut value = PinnedCounter {
        count: value_count,
        _pin: PhantomPinned,
    };
    let mut slot = MutSlot::new(&mut value);
    let result: NoCloneResult = slot.with_mut(move |text| {
        let _capture = capture;
        captured.set(captured.get() + 1);
        text.count.set(text.count.get() + 1);
        NoCloneResult(text.count.get().to_string())
    });
    assert_eq!(calls.get(), 1);
    assert_eq!(result.0, "1");
    assert_eq!(capture_drops.load(Ordering::SeqCst), 1);
    slot.with_mut(|text| text.count.set(text.count.get() + 1));
    assert_eq!(value.count.get(), 2);
}

#[test]
fn with_mut_returns_data_carried_by_t_and_external_borrow_without_static() {
    struct Carrier<'owner> {
        text: &'owner str,
        edits: usize,
    }
    let owner = String::from("carried");
    let external = String::from("external");
    let mut carrier = Carrier {
        text: owner.as_str(),
        edits: 0,
    };
    let mut slot = MutSlot::new(&mut carrier);
    let carried: &str = accepts_with_mut(&mut slot, |value| {
        value.edits += 1;
        value.text
    });
    let external_view: &str = slot.with_mut(|_| external.as_str());
    assert_eq!(carried, "carried");
    assert_eq!(external_view, "external");
    assert_eq!(slot.get().edits, 1);
}

#[test]
fn with_mut_calls_callback_once_and_handles_empty_and_zero_sized_values() {
    let calls = Rc::new(Cell::new(0));
    let captured = Rc::clone(&calls);
    let mut empty = String::new();
    let mut slot = MutSlot::new(&mut empty);
    let length = slot.with_mut(move |text| {
        captured.set(captured.get() + 1);
        text.len()
    });
    assert_eq!(length, 0);
    assert_eq!(calls.get(), 1);
    struct Zst;
    let mut zst = Zst;
    let mut zst_slot = MutSlot::new(&mut zst);
    let seen = zst_slot.with_mut(|_| 42_u8);
    assert_eq!(seen, 42);
}

#[test]
fn with_mut_returns_exact_result_and_preserves_mutation_on_result_error() {
    let mut value = String::from("before");
    let mut slot = MutSlot::new(&mut value);
    let result: Result<usize, &'static str> = slot.with_mut(|text| {
        text.push_str("-changed");
        Err("expected")
    });
    assert_eq!(result, Err("expected"));
    assert_eq!(slot.get(), "before-changed");
    let next = slot.with_mut(|text| {
        text.push('!');
        text.len()
    });
    assert_eq!(next, 15);
}

#[test]
fn with_mut_does_not_drop_or_move_owner_and_preserves_pointer_identity() {
    struct DropProbe(Arc<AtomicUsize>);
    impl Drop for DropProbe {
        fn drop(&mut self) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }
    struct Pinned {
        probe: DropProbe,
        _pin: PhantomPinned,
    }
    let drops = Arc::new(AtomicUsize::new(0));
    let mut value = Pinned {
        probe: DropProbe(Arc::clone(&drops)),
        _pin: PhantomPinned,
    };
    let owner_ptr = &value as *const Pinned;
    {
        let mut slot = MutSlot::new(&mut value);
        let observed = slot.with_mut(|value| {
            value.probe.0.fetch_add(1, Ordering::SeqCst);
            value as *mut Pinned
        });
        assert_eq!(observed, owner_ptr.cast_mut());
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    drop(value);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}

#[test]
fn with_mut_panic_propagates_without_rollback_promise() {
    let mut value = String::from("before");
    let mut slot = MutSlot::new(&mut value);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        slot.with_mut(|text| {
            text.push_str("-persisted");
            panic!("callback panic");
        });
    }));
    assert!(result.is_err());
    slot.with_mut(|text| text.push('!'));
    assert_eq!(value, "before-persisted!");
}
`;

export const mutSlotWithMutStandaloneWitness = String.raw`// Standalone authored transfer witness: these tests exercise the lesson's
// MutSlot::with_mut implementation independently of the packaged library.
`;

export const mutSlotWithMutSteps: LessonStep[] = [
  {
    id: "mut-slot-with-mut-model",
    kind: "run",
    title: "Zobacz callback z krótkim reborrow",
    prompt:
      "Prześledź, jak `with_mut` przez HRTB dostaje przy każdym wywołaniu świeżą krótką pożyczkę `for<'short>`, wywołuje callback dokładnie raz i oddaje wynik bez przenoszenia T. Wróć myślą do wcześniejszej lekcji „Callback odwiedza lokalne pożyczki”: R jest niezależne od chwilowej pożyczki, ale może pożyczać z zewnętrznego właściciela albo ze wspólnych danych niesionych przez T. FnOnce oznacza jedno wywołanie, a zwykły unwind zachowuje mutacje wykonane przed paniką — bez obietnicy rollbacku.",
    code: mutSlotWithMutModel,
    solution: mutSlotWithMutModel,
    evaluator: {
      kind: "exact-output",
      expected: "11\n",
    },
    expectedStatus: "success",
    evidenceKind: "exposure",
  },
  {
    id: mutSlotWithMutPrimaryStepId,
    kind: "apply",
    title: "Dodaj transfer przez with_mut",
    prompt:
      "Uzupełnij `with_mut<R, F>(&mut self, f: F) -> R` z dokładnym boundem `F: for<'short> FnOnce(&'short mut T) -> R`. Przy każdym wywołaniu utwórz świeży reborrow, wywołaj callback dokładnie raz i zwróć dokładnie jego R. R może być pożyczonym, nie-`'static` wynikiem z zewnętrznego właściciela albo ze wspólnych danych niesionych przez T; po zakończeniu pożyczki pozwól użyć outer slotu. Zachowaj mutacje wykonane przed zwykłym unwindem, bez obietnicy rollbacku. Nie dodawaj żadnych wymagań dla T, R ani F: `Clone`, `Copy`, `Debug`, `Default`, `Send`, `Sync`, `Unpin`, `'static` ani `UnwindSafe`.",
    code: mutSlotWithMutStarter,
    solution: mutSlotWithMutSolution,
    evaluator: { kind: "tests", tests: mutSlotWithMutTests },
    hints: [
      "Zacznij od `f(&mut *self.value)`: ten reborrow dostaje świeży krótki lifetime przy każdym wywołaniu.",
      "Zwróć bezpośrednio wynik callbacka i nie dodawaj boundów traitów; `FnOnce` wywołuje go raz, a R może być pożyczone spoza T.",
    ],
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
  },
];
