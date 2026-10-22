import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";
import {
  initializedPrefixConceptId,
  initializedPrefixFamily,
  initializedPrefixSteps,
} from "./unsafe-miri-initialized-prefix";

const reviewedAt = "2026-09-18";
const moduleId = "unsafe-miri-contracts";

export const unsafeMiriSources: Source[] = [
  {
    id: "unsafe-miri-guide",
    title:
      "Miri: an interpreter for Rust's mid-level intermediate representation",
    url: "https://github.com/rust-lang/miri",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wspieranej wersji toolchaina, flagi Miri albo zakresu wykrywanych błędów UB.",
  },
  {
    id: "unsafe-miri-maybe-uninit",
    title: "Rust standard library: MaybeUninit",
    url: "https://doc.rust-lang.org/std/mem/union.MaybeUninit.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie reguł inicjalizacji, assume_init, assume_init_drop lub zapisu do storage.",
  },
  {
    id: "unsafe-miri-from-raw-parts",
    title: "Rust standard library: slice::from_raw_parts",
    url: "https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie precondition ważności, wyrównania, inicjalizacji, długości i aliasowania widoku.",
  },
  {
    id: "unsafe-miri-nomicon-subtyping",
    title: "The Rustonomicon: Subtyping and variance",
    url: "https://doc.rust-lang.org/nomicon/subtyping.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyjaśnienia kowariancji lifetime, niezmienniczości `&mut T` albo kontraktu reborrow.",
  },
];

export const unsafeMiriCompetencies: Competency[] = [
  {
    id: "unsafe-miri-initialized-views",
    title:
      "Opisujesz i testujesz kontrakt inicjalizacji oraz lifetime widoku utworzonego z raw pointera.",
  },
  {
    id: "unsafe-miri-disjoint-mutation",
    title:
      "Budujesz bezpieczny podział mutowalnego storage i dowodzisz rozłączności granicami wejścia.",
  },
  {
    id: "unsafe-miri-maybe-uninit-state",
    title:
      "Modelujesz stan `MaybeUninit<T>` tak, aby `Drop` dotykał wartości wyłącznie po inicjalizacji.",
  },
  {
    id: "unsafe-miri-variance-reborrow",
    title:
      "Rozróżniasz kowariancję lifetime od niezmienniczości zawartości `&mut T` i stosujesz krótkie reborrow.",
  },
];

export const unsafeMiriConcepts: Concept[] = [
  {
    id: "unsafe-miri-byte-view-contract",
    title: "ByteView wymaga zainicjalizowanych bajtów i nie wydłuża ich życia",
    prerequisites: ["unsafe-ffi-owned-handle-contract"],
    competencyIds: ["unsafe-miri-initialized-views"],
    reviewPrompt:
      "Jakie warunki musi spełnić caller `ByteView::from_raw_parts`, zanim widok może zostać użyty, i co zmienia długość zero?",
    reviewAnswer:
      "Caller musi zapewnić niezerowy i poprawnie wyrównany adres dla dodatniej długości, jeden żywy alokowany obiekt z `len` zainicjalizowanymi bajtami, poprawny zakres oraz brak mutowalnego aliasowania przez życie widoku. Dla zera można zwrócić pusty widok bez odczytu; lifetime jest pożyczką, a nie sposobem na przedłużenie życia storage.",
    distinguish:
      "`MaybeUninit<u8>` nie staje się zainicjalnym `u8` tylko dlatego, że ma adres. Miri pomaga ujawnić odczyt niezainicjalizowanej pamięci, ale poprawny kontrakt musi być spełniony także poza Miri.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-miri-disjoint-regions-contract",
    title: "Rozłączne regiony mutowalne są dowodem braku aliasowania",
    prerequisites: ["unsafe-miri-byte-view-contract"],
    competencyIds: ["unsafe-miri-disjoint-mutation"],
    reviewPrompt:
      "Dlaczego `mid == len` jest poprawne, a `mid > len` musi zostać odrzucone przed utworzeniem dwóch `&mut`?",
    reviewAnswer:
      "Równość tworzy cały lewy region i pusty prawy region, więc zakresy nadal są rozłączne. Po odrzuceniu tylko `mid > len` można użyć `split_at_mut`; funkcja biblioteczna przenosi dowód rozdzielenia elementów do typów referencji.",
    distinguish:
      "Dwa `&mut` nie są bezpieczne dlatego, że adresy wyglądają na różne. Bezpieczna abstrakcja musi wyznaczyć zakresy z jednego slice'a i zachować granicę także dla pustych stron.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-miri-slot-state-contract",
    title: "Slot<T> rozdziela stan storage od wartości T",
    prerequisites: ["unsafe-miri-disjoint-regions-contract"],
    competencyIds: ["unsafe-miri-maybe-uninit-state"],
    reviewPrompt:
      "Kiedy `Slot<T>` może wykonać `assume_init_drop`, a kiedy `take` musi najpierw zmienić stan?",
    reviewAnswer:
      "`assume_init_drop` jest dozwolone wyłącznie w stanie Full. `take` sprawdza Full, przełącza stan na Empty i dopiero odczytuje wartość dokładnie raz; po przejęciu slot nie może ponownie dropować tego storage.",
    distinguish:
      "`MaybeUninit<T>` nie ma automatycznego Drop dla T, a zapisanie bitów nie jest równoznaczne z poprawną inicjalizacją. Osobny stan jest częścią niezmiennika i musi obejmować ścieżkę Drop, take oraz odrzucenie drugiego put.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-miri-mut-slot-variance-contract",
    title: "MutSlot łączy krótkie reborrow z niezmienniczością T",
    prerequisites: ["unsafe-miri-slot-state-contract"],
    competencyIds: ["unsafe-miri-variance-reborrow"],
    reviewPrompt:
      "Co wolno skrócić w `MutSlot<'a, T>`, a czego nie wolno podmienić przez udawane skrócenie lifetime wewnętrznego T?",
    reviewAnswer:
      "Lifetime samej pożyczki można skrócić przez reborrow, aby oddać krótkotrwały `MutSlot<'short, T>`. Zawartość `T` jest traktowana niezmienniczo, gdy obejmuje `&mut T`; nie wolno użyć skrócenia lifetime typu do zapisania krótszej referencji w miejscu wymagającym dłuższej.",
    distinguish:
      "Kowariancja lifetime pożyczki nie oznacza kowariancji zawartości. `reborrow` ogranicza czas dostępu i kończy się przed kolejnym użyciem właściciela, a compile-fail contract chroni przed zapisem nieodpowiedniej referencji.",
    evidenceArtifact: "rust-code",
  },
];

const unsafeEvidenceFamilies: Record<string, string> = {
  "unsafe-miri-byte-view": "unsafe-miri/byte-view-v1",
  "unsafe-miri-disjoint-regions": "unsafe-miri/disjoint-regions-v1",
  "unsafe-miri-slot-state": "unsafe-miri/slot-state-v1",
  "unsafe-miri-mut-slot": "unsafe-miri/mut-slot-v1",
};

for (const concept of unsafeMiriConcepts) {
  concept.evidenceCalibration = { version: 2, minimumCodingTasks: 2 };
}

function predict(
  id: string,
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind: "predict",
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((value, index) => [String(index), value]),
      ),
    },
    evidenceKind: "prediction",
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

function explain(
  id: string,
  title: string,
  prompt: string,
  criteria: string[],
): LessonStep {
  return {
    id,
    kind: "explain",
    title,
    prompt,
    evaluator: { kind: "rubric", criteria },
    rubric: criteria,
    evidenceKind: "exposure",
  };
}

function coding(options: {
  id: string;
  kind: "modify" | "apply" | "blank" | "recall";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: [
      "Najpierw zapisz niezmiennik i wszystkie granice wejścia; dopiero potem użyj operacji unsafe.",
      "Uruchom testy dla pustego wejścia, granic oraz mutanta łamiącego stan, Drop albo lifetime.",
    ],
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "recall"
          ? "recall"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

function compileFail(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution = code,
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: { kind: "expected-error", diagnostic: "lifetime" },
    expectedStatus: "compile-error",
    expectedDiagnostic: "lifetime",
    evidenceKind: "exposure",
  };
}

const byteViewSolution = String.raw`use std::slice;

#[derive(Debug, PartialEq, Eq)]
struct ByteView<'a> { bytes: &'a [u8] }

impl<'a> ByteView<'a> {
    /// # Safety
    /// For len > 0, raw points to len initialized bytes in one live allocation,
    /// is aligned, non-null, and remains valid and unaliased for 'a.
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        if len == 0 { return Some(Self { bytes: &[] }); }
        if raw.is_null() { return None; }
        Some(Self { bytes: unsafe { slice::from_raw_parts(raw, len) } })
    }

    fn as_slice(&self) -> &[u8] { self.bytes }
}`;

const byteViewStarter = String.raw`use std::slice;

#[derive(Debug, PartialEq, Eq)]
struct ByteView<'a> { bytes: &'a [u8] }

impl<'a> ByteView<'a> {
    /// # Safety
    /// For len > 0, the caller must supply an aligned, non-null pointer to
    /// len initialized bytes in one live allocation and keep them valid and
    /// unaliased for the returned borrow's lifetime.
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        if raw.is_null() { return None; }
        Some(Self { bytes: unsafe { slice::from_raw_parts(raw, len) } })
    }

    fn as_slice(&self) -> &[u8] { self.bytes }
}`;

const byteViewEquivalent = String.raw`use std::slice;

#[derive(Debug, PartialEq, Eq)]
struct ByteView<'a> { bytes: &'a [u8] }

impl<'a> ByteView<'a> {
    /// The caller must keep the storage initialized, aligned, valid, and
    /// alive for the returned borrow; this constructor cannot extend it.
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        match (raw.is_null(), len) {
            (_, 0) => Some(Self { bytes: &[] }),
            (true, _) => None,
            (false, _) => Some(Self { bytes: unsafe { slice::from_raw_parts(raw, len) } }),
        }
    }
    fn as_slice(&self) -> &[u8] { self.bytes }
}`;

const byteViewTests = String.raw`#[test]
fn byte_view_accepts_initialized_bytes_and_empty_null() {
    let bytes = [0_u8, 2, 255];
    let view = unsafe { ByteView::from_raw_parts(bytes.as_ptr(), bytes.len()) }.unwrap();
    assert_eq!(view.as_slice(), &[0, 2, 255]);
    assert_eq!(unsafe { ByteView::from_raw_parts(std::ptr::null(), 0) }.unwrap().as_slice(), &[]);
}

#[test]
fn byte_view_is_used_only_while_storage_is_alive() {
    let mut bytes = [4_u8, 5];
    {
        let view = unsafe { ByteView::from_raw_parts(bytes.as_mut_ptr(), 1) }.unwrap();
        assert_eq!(view.as_slice().as_ptr(), bytes.as_ptr());
    }
    bytes[0] = 9;
    assert_eq!(bytes, [9, 5]);
}`;

const byteViewRecallStarter = String.raw`use std::slice;

#[derive(Debug, PartialEq, Eq)]
struct ByteView<'a> { bytes: &'a [u8] }

impl<'a> ByteView<'a> {
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        if len == 0 { return None; }
        if raw.is_null() { return None; }
        Some(Self { bytes: unsafe { slice::from_raw_parts(raw, len) } })
    }
    fn as_slice(&self) -> &[u8] { self.bytes }
}`;

const byteViewRecallSolution = String.raw`use std::slice;

#[derive(Debug, PartialEq, Eq)]
struct ByteView<'a> { bytes: &'a [u8] }

impl<'a> ByteView<'a> {
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        if len == 0 { return Some(Self { bytes: &[] }); }
        if raw.is_null() { return None; }
        let bytes = unsafe { slice::from_raw_parts(raw, len) };
        Some(Self { bytes })
    }
    fn as_slice(&self) -> &[u8] { self.bytes }
}`;

const byteViewRecallTests = String.raw`#[test]
fn recalled_byte_view_preserves_data_and_empty_policy() {
    let bytes = [8_u8, 13, 21];
    let view = unsafe { ByteView::from_raw_parts(bytes.as_ptr(), bytes.len()) }.unwrap();
    assert_eq!(view.as_slice(), &[8, 13, 21]);
    assert_eq!(unsafe { ByteView::from_raw_parts(std::ptr::null(), 0) }.unwrap().as_slice(), &[]);
}

#[test]
fn recalled_byte_view_stays_borrowed() {
    let mut bytes = [3_u8, 5];
    let view = unsafe { ByteView::from_raw_parts(bytes.as_mut_ptr(), 2) }.unwrap();
    assert_eq!(view.as_slice().as_ptr(), bytes.as_ptr());
}`;

const regionsSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid > buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;

const regionsStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid >= buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;

const regionsEquivalent = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    match buffer.get(mid..) {
        None => Err(SplitError::OutOfBounds),
        Some(_) => Ok(buffer.split_at_mut(mid)),
    }
}`;

const regionsTests = String.raw`#[test]
fn regions_keep_both_edges_and_reject_only_out_of_bounds() {
    let mut data = [0_u8; 4];
    let (left, right) = split_regions(&mut data, 0).unwrap();
    assert!(left.is_empty());
    right[0] = 7;
    drop((left, right));
    let len = data.len();
    let (left, right) = split_regions(&mut data, len).unwrap();
    assert_eq!(left, &[7, 0, 0, 0]);
    assert!(right.is_empty());
    assert_eq!(split_regions(&mut data, len + 1), Err(SplitError::OutOfBounds));
}

#[test]
fn regions_allow_disjoint_mutations() {
    let mut data = [0_u8; 4];
    let (left, right) = split_regions(&mut data, 2).unwrap();
    left[0] = 1;
    right[0] = 2;
    assert_eq!(data, [1, 0, 2, 0]);
}`;

const regionsRecallStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid >= buffer.len() { return Err(SplitError::OutOfBounds); }
    let (left, right) = buffer.split_at_mut(mid);
    Ok((left, right))
}`;

const regionsRecallSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid > buffer.len() { return Err(SplitError::OutOfBounds); }
    let regions = buffer.split_at_mut(mid);
    Ok(regions)
}`;

const regionsRecallTests = String.raw`#[test]
fn recalled_regions_keep_both_boundary_sides() {
    let mut data = [0_u8; 3];
    let (left, right) = split_regions(&mut data, 0).unwrap();
    assert!(left.is_empty());
    assert_eq!(right.len(), 3);
    drop((left, right));
    let len = data.len();
    let (left, right) = split_regions(&mut data, len).unwrap();
    assert_eq!(left.len(), 3);
    assert!(right.is_empty());
    assert_eq!(split_regions(&mut data, len + 1), Err(SplitError::OutOfBounds));
}

#[test]
fn recalled_regions_mutate_disjoint_elements() {
    let mut data = [0_u8; 4];
    let (left, right) = split_regions(&mut data, 2).unwrap();
    left[1] = 4;
    right[1] = 9;
    assert_eq!(data, [0, 4, 0, 9]);
}`;

const slotSolution = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }

struct Slot<T> { value: MaybeUninit<T>, state: SlotState }

impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> {
        if self.state == SlotState::Full { return Err(value); }
        self.value.write(value);
        self.state = SlotState::Full;
        Ok(())
    }
    fn take(&mut self) -> Option<T> {
        if self.state == SlotState::Empty { return None; }
        self.state = SlotState::Empty;
        Some(unsafe { self.value.assume_init_read() })
    }
    fn is_full(&self) -> bool { self.state == SlotState::Full }
}

impl<T> Drop for Slot<T> {
    fn drop(&mut self) {
        if self.state == SlotState::Full { unsafe { self.value.assume_init_drop(); } }
    }
}`;

const slotStarter = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }

struct Slot<T> { value: MaybeUninit<T>, state: SlotState }

impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> {
        if self.state == SlotState::Full { return Err(value); }
        self.value.write(value);
        self.state = SlotState::Full;
        Ok(())
    }
    fn take(&mut self) -> Option<T> {
        if self.state == SlotState::Empty { return None; }
        self.state = SlotState::Empty;
        None
    }
    fn is_full(&self) -> bool { self.state == SlotState::Full }
}

impl<T> Drop for Slot<T> {
    fn drop(&mut self) {
        if self.state == SlotState::Full { unsafe { self.value.assume_init_drop(); } }
    }
}`;

const slotEquivalent = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }
struct Slot<T> { value: MaybeUninit<T>, state: SlotState }
impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> {
        match self.state { SlotState::Full => Err(value), SlotState::Empty => { self.value.write(value); self.state = SlotState::Full; Ok(()) } }
    }
    fn take(&mut self) -> Option<T> {
        let value = (self.state == SlotState::Full).then(|| unsafe { self.value.assume_init_read() });
        if value.is_some() { self.state = SlotState::Empty; }
        value
    }
    fn is_full(&self) -> bool { matches!(self.state, SlotState::Full) }
}
impl<T> Drop for Slot<T> { fn drop(&mut self) { if matches!(self.state, SlotState::Full) { unsafe { self.value.assume_init_drop(); } } } }`;

const slotTests = String.raw`use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Debug)]
struct DropProbe(std::sync::Arc<AtomicUsize>);
impl Drop for DropProbe { fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); } }

#[test]
fn empty_slot_never_drops_uninitialized_storage() {
    let drops = std::sync::Arc::new(AtomicUsize::new(0));
    let slot = Slot::<DropProbe>::empty();
    assert!(!slot.is_full());
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
}

#[test]
fn full_slot_drops_once_and_take_transfers_ownership() {
    let drops = std::sync::Arc::new(AtomicUsize::new(0));
    {
        let mut slot = Slot::empty();
        slot.put(DropProbe(drops.clone())).unwrap();
        assert!(slot.is_full());
        let value = slot.take().unwrap();
        assert!(!slot.is_full());
        drop(value);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn second_put_is_rejected_without_overwriting_the_live_value() {
    let drops = std::sync::Arc::new(AtomicUsize::new(0));
    let mut slot = Slot::empty();
    slot.put(DropProbe(drops.clone())).unwrap();
    let rejected = slot.put(DropProbe(drops.clone())).unwrap_err();
    drop(rejected);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}`;

const slotRecallStarter = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }
struct Slot<T> { value: MaybeUninit<T>, state: SlotState }
impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> {
        if self.state == SlotState::Full { return Err(value); }
        self.value.write(value);
        self.state = SlotState::Full;
        Ok(())
    }
    fn take(&mut self) -> Option<T> {
        if self.state == SlotState::Empty { return None; }
        self.state = SlotState::Empty;
        None
    }
    fn is_full(&self) -> bool { self.state == SlotState::Full }
}
impl<T> Drop for Slot<T> { fn drop(&mut self) { if self.state == SlotState::Full { unsafe { self.value.assume_init_drop(); } } } }`;

const slotRecallSolution = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }
struct Slot<T> { value: MaybeUninit<T>, state: SlotState }
impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> {
        match self.state {
            SlotState::Full => Err(value),
            SlotState::Empty => { self.value.write(value); self.state = SlotState::Full; Ok(()) }
        }
    }
    fn take(&mut self) -> Option<T> {
        match self.state {
            SlotState::Empty => None,
            SlotState::Full => {
                self.state = SlotState::Empty;
                Some(unsafe { self.value.assume_init_read() })
            }
        }
    }
    fn is_full(&self) -> bool { self.state == SlotState::Full }
}
impl<T> Drop for Slot<T> { fn drop(&mut self) { if let SlotState::Full = self.state { unsafe { self.value.assume_init_drop(); } } } }`;

const slotRecallTests = String.raw`use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};

#[derive(Debug)]
struct RecallDrop(Arc<AtomicUsize>);
impl Drop for RecallDrop { fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); } }

#[test]
fn recalled_slot_transfers_full_value_once() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut slot = Slot::empty();
    slot.put(RecallDrop(drops.clone())).unwrap();
    let value = slot.take().unwrap();
    assert!(!slot.is_full());
    drop(value);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[test]
fn recalled_slot_rejects_second_value_without_replacing_first() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut slot = Slot::empty();
    slot.put(RecallDrop(drops.clone())).unwrap();
    let rejected = slot.put(RecallDrop(drops.clone())).unwrap_err();
    drop(rejected);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}`;

const mutSlotSolution = String.raw`struct MutSlot<'a, T> { value: &'a mut T }

impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        MutSlot { value: &mut *self.value }
    }
}

fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) {
    let mut short = slot.reborrow();
    *short.get_mut() += 1;
}`;

const mutSlotStarter = String.raw`struct MutSlot<'a, T> { value: &'a mut T }

impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        panic!("TODO: implement the short reborrow")
    }
}

fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) {
    let mut short = slot.reborrow();
    *short.get_mut() += 1;
}`;

const mutSlotEquivalent = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { &*self.value }
    fn get_mut(&mut self) -> &mut T { &mut *self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> { MutSlot { value: &mut *self.value } }
}
fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) { *slot.reborrow().get_mut() += 1; }`;

const mutSlotReviewStarter = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { panic!("TODO: implement mutable access") }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> { MutSlot { value: &mut *self.value } }
}
fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) { *slot.reborrow().get_mut() += 1; }`;

const slotMutant = String.raw`use std::mem::MaybeUninit;
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SlotState { Empty, Full }
struct Slot<T> { value: MaybeUninit<T>, state: SlotState }
impl<T> Slot<T> {
    fn empty() -> Self { Self { value: MaybeUninit::uninit(), state: SlotState::Empty } }
    fn put(&mut self, value: T) -> Result<(), T> { if self.state == SlotState::Full { Err(value) } else { self.value.write(value); self.state = SlotState::Full; Ok(()) } }
    fn take(&mut self) -> Option<T> { if self.state == SlotState::Empty { None } else { self.state = SlotState::Empty; None } }
    fn is_full(&self) -> bool { self.state == SlotState::Full }
}
impl<T> Drop for Slot<T> { fn drop(&mut self) { if self.state == SlotState::Full { unsafe { self.value.assume_init_drop(); } } } }`;

const mutSlotMutant = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { panic!("mutant: mutable access disabled") }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> { MutSlot { value: &mut *self.value } }
}
fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) { let mut short = slot.reborrow(); *short.get_mut() += 1; }`;

const mutSlotTests = String.raw`#[test]
fn reborrow_shortens_access_and_preserves_the_outer_slot() {
    let mut value = 4;
    let mut slot = MutSlot::new(&mut value);
    {
        let mut short = slot.reborrow();
        *short.get_mut() += 3;
        assert_eq!(*short.get(), 7);
    }
    *slot.get_mut() += 2;
    assert_eq!(value, 9);
}

#[test]
fn generic_mut_slot_can_hold_a_borrowed_value_without_static() {
    let text = String::from("życie");
    let mut selected = text.as_str();
    let mut slot = MutSlot::new(&mut selected);
    assert_eq!(*slot.get(), "życie");
    *slot.reborrow().get_mut() = "zmiana";
    assert_eq!(selected, "zmiana");
}`;

const mutSlotRecallStarter = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { &*self.value }
    fn get_mut(&mut self) -> &mut T { &mut *self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        panic!("TODO: implement the short reborrow")
    }
}
fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) { let mut short = slot.reborrow(); *short.get_mut() += 1; }`;

const mutSlotRecallSolution = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> {
    fn new(value: &'a mut T) -> Self { Self { value } }
    fn get(&self) -> &T { self.value }
    fn get_mut(&mut self) -> &mut T { self.value }
    fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> {
        let value = &mut *self.value;
        MutSlot { value }
    }
}
fn increment<'a>(slot: &'a mut MutSlot<'_, i32>) {
    let mut short = slot.reborrow();
    *short.get_mut() += 1;
}`;

const mutSlotRecallTests = String.raw`#[test]
fn recalled_mut_slot_releases_outer_slot_after_short_use() {
    let mut value = 10;
    let mut slot = MutSlot::new(&mut value);
    {
        let mut short = slot.reborrow();
        *short.get_mut() -= 3;
    }
    *slot.get_mut() += 2;
    assert_eq!(value, 9);
}

#[test]
fn recalled_mut_slot_supports_a_local_inner_borrow() {
    let text = String::from("lokalne");
    let mut selected = text.as_str();
    let mut slot = MutSlot::new(&mut selected);
    *slot.reborrow().get_mut() = "odtworzone";
    assert_eq!(selected, "odtworzone");
}`;

const mutSlotCompileFail = String.raw`struct MutSlot<'a, T> { value: &'a mut T }

fn write_short<'short>(slot: &mut MutSlot<'static, &'static str>, value: &'short str) {
    // &mut T is invariant in T: this assignment cannot shorten the inner reference.
    *slot.value = value;
}

fn main() {}`;

const mutSlotCompileFailSolution = String.raw`struct MutSlot<'a, T> { value: &'a mut T }

fn write_short<'short>(slot: &mut MutSlot<'short, &'short str>, value: &'short str) {
    *slot.value = value;
}

fn main() {}`;

const byteViewRun = String.raw`use std::slice;
struct ByteView<'a> { bytes: &'a [u8] }
impl<'a> ByteView<'a> {
    unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self> {
        if len == 0 { return Some(Self { bytes: &[] }); }
        if raw.is_null() { return None; }
        Some(Self { bytes: unsafe { slice::from_raw_parts(raw, len) } })
    }
}
fn main() { let bytes = [1_u8, 2, 3]; let view = unsafe { ByteView::from_raw_parts(bytes.as_ptr(), 2) }.unwrap(); println!("{:?}", view.bytes); }`;

const regionsRun = String.raw`fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), &'static str> {
    if mid > buffer.len() { return Err("poza zakresem"); }
    Ok(buffer.split_at_mut(mid))
}
fn main() { let mut data = [1_u8, 2, 3]; let (left, right) = split_regions(&mut data, 1).unwrap(); left[0] = 9; println!("{:?} {:?}", left, right); }`;

const slotRun = String.raw`use std::mem::MaybeUninit;
struct Slot<T> { value: MaybeUninit<T>, full: bool }
impl<T> Slot<T> { fn empty() -> Self { Self { value: MaybeUninit::uninit(), full: false } } fn put(&mut self, value: T) { self.value.write(value); self.full = true; } fn take(&mut self) -> Option<T> { if self.full { self.full = false; Some(unsafe { self.value.assume_init_read() }) } else { None } } }
impl<T> Drop for Slot<T> { fn drop(&mut self) { if self.full { unsafe { self.value.assume_init_drop(); } } } }
fn main() { let mut slot = Slot::empty(); slot.put(8_u8); println!("{}", slot.take().unwrap()); }`;

const mutSlotRun = String.raw`struct MutSlot<'a, T> { value: &'a mut T }
impl<'a, T> MutSlot<'a, T> { fn new(value: &'a mut T) -> Self { Self { value } } fn reborrow<'short>(&'short mut self) -> MutSlot<'short, T> { MutSlot { value: &mut *self.value } } }
fn main() { let mut value = 4; let mut slot = MutSlot::new(&mut value); *slot.reborrow().value += 2; println!("{}", value); }`;

export const unsafeMiriLessons: Lesson[] = [
  {
    id: "unsafe-miri-byte-view",
    moduleId,
    conceptIds: ["unsafe-miri-byte-view-contract"],
    competencyIds: ["unsafe-miri-initialized-views"],
    prerequisites: ["unsafe-ffi-owned-handle"],
    title: "Zbuduj ByteView z jawne inicjalizacją",
    subtitle:
      "Połącz lifetime pożyczki z precondition inicjalizacji i sprawdź pusty widok bez odczytu pamięci.",
    minutes: 30,
    outcomes: [
      "Opiszesz, dlaczego adres `MaybeUninit<u8>` nie jest jeszcze zainicjalizowanym bajtem.",
      "Zamkniesz `slice::from_raw_parts` w kontrakcie `ByteView` bez wydłużania życia storage.",
      "Sprawdzisz ważne dane, pusty null view i zakres użycia tylko przy żywym storage w niezależnych testach.",
    ],
    steps: [
      predict(
        "byte-view-predict",
        "Przewidź odczyt",
        "Czy sam niezerowy adres gwarantuje, że `ByteView` może odczytać bajty?",
        [
          "Tak, adres zawiera już ważne dane",
          "Nie, caller musi zapewnić inicjalizację, ważność i lifetime",
          "Tylko Miri może zdecydować",
        ],
        1,
        [
          "Adres nie dowodzi inicjalizacji.",
          "To precondition konstruktora i gwarancja życia danych.",
          "Miri wykrywa część naruszeń, ale nie zastępuje kontraktu.",
        ],
      ),
      run(
        "byte-view-run",
        "Uruchom widok",
        "Utwórz widok z ważnego storage i wypisz dwa bajty.",
        byteViewRun,
        "[1, 2]\n",
      ),
      explain(
        "byte-view-explain",
        "Wyjaśnij inicjalizację",
        "Wyjaśnij, czemu lifetime referencji nie inicjalizuje pamięci.",
        [
          "Inicjalizacja i lifetime to osobne warunki.",
          "Dla len == 0 można nie czytać adresu i zwrócić pusty slice.",
          "Miri może ujawnić użycie niezainicjalizowanej wartości, ale test nie powinien wykonywać UB.",
        ],
      ),
      coding({
        id: "byte-view-gate",
        kind: "modify",
        title: "Napraw ByteView",
        prompt:
          "Uzupełnij `ByteView<'a>` i `unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<ByteView<'a>>`. Dla dodatniej długości caller musi zapewnić niezerowy, wyrównany adres do `len` zainicjalizowanych bajtów w jednej żywej alokacji, bez mutowalnego aliasowania przez `'a`; dla zera zwróć pusty widok bez odczytu. Nie wydłużaj życia storage.",
        code: byteViewStarter,
        solution: byteViewSolution,
        tests: byteViewTests,
        gate: true,
      }),
      coding({
        id: "byte-view-contract-gate",
        kind: "apply",
        title: "Przenieś kontrakt na pusty widok",
        prompt:
          "Zachowaj ten sam kontrakt ByteView dla ważnych bajtów, pustego null view i pożyczki kończącej się wraz ze storage. To równoważna forma gate i należy do tej samej rodziny dowodu.",
        code: byteViewStarter,
        solution: byteViewEquivalent,
        tests: byteViewTests,
        gate: true,
      }),
      coding({
        id: "byte-view-blank",
        kind: "blank",
        title: "Blank page: initialized bytes",
        prompt:
          "Od pustej kartki zdefiniuj dokładnie `struct ByteView<'a> { bytes: &'a [u8] }` oraz `impl<'a> ByteView<'a> { unsafe fn from_raw_parts(raw: *const u8, len: usize) -> Option<Self>; fn as_slice(&self) -> &[u8]; }`. Dodaj safety contract o inicjalizacji, wyrównaniu, ważności, niealiasowaniu i lifetime; `len == 0` ma zwrócić pusty widok bez dereferencji. Nie implementuj odczytu z `MaybeUninit` jako `u8`. Blank jest drugą formą tej samej rodziny co gate.",
        solution: byteViewSolution,
        tests: byteViewTests,
        gate: true,
      }),
      coding({
        id: "byte-view-recall",
        kind: "recall",
        title: "Retrieval: widok i initialized storage",
        prompt:
          "Odtwórz kontrakt `ByteView` z pamięci: zainicjalizowane bajty, żywa alokacja, brak aliasowania, null tylko dla zera i lifetime ograniczony do storage.",
        code: byteViewRecallStarter,
        solution: byteViewRecallSolution,
        tests: byteViewRecallTests,
      }),
      ...initializedPrefixSteps,
    ],
    misconceptions: [
      "Każdy raw pointer wskazuje gotowe wartości.",
      "Miri naprawia brakujący lifetime.",
      "Pusty slice wymaga dereferencji null.",
    ],
    transferTask:
      "Zaprojektuj pure-Rust wrapper na bufor z `MaybeUninit<u8>`, który najpierw publikuje dowód inicjalizacji, a dopiero potem udostępnia `ByteView`.",
    evidenceGate:
      "Bramki wymagają pełnego kontraktu inicjalizacji i testów pustego oraz niepustego wejścia.",
    sourceIds: [
      "unsafe-miri-guide",
      "unsafe-miri-from-raw-parts",
      "unsafe-miri-maybe-uninit",
    ],
  },
  {
    id: "unsafe-miri-disjoint-regions",
    moduleId,
    conceptIds: ["unsafe-miri-disjoint-regions-contract"],
    competencyIds: ["unsafe-miri-disjoint-mutation"],
    prerequisites: ["unsafe-miri-byte-view"],
    title: "Rozdziel mutowalne regiony",
    subtitle:
      "Zachowaj rozłączność `&mut` na obu krawędziach i nie ukrywaj błędu granicy.",
    minutes: 25,
    outcomes: [
      "Zaakceptujesz `mid == 0` i `mid == len`.",
      "Odrzucisz tylko indeks poza buforem.",
      "Udowodnisz niezależne mutacje bez nakładających się pożyczek.",
    ],
    steps: [
      predict(
        "disjoint-regions-predict",
        "Przewidź pustą stronę",
        "Czy `mid == len` może zwrócić pusty prawy region?",
        ["Tak", "Nie, bo prawa strona musi mieć element", "Tylko w unsafe"],
        0,
        [
          "Równość jest poprawną granicą.",
          "Pusty region jest częścią kontraktu.",
          "`split_at_mut` jest bezpiecznym API.",
        ],
      ),
      run(
        "disjoint-regions-run",
        "Uruchom podział",
        "Zmień tylko lewy region i wypisz obie strony.",
        regionsRun,
        "[9] [2, 3]\n",
      ),
      explain(
        "disjoint-regions-explain",
        "Wyjaśnij rozłączność",
        "Dlaczego `split_at_mut` może zwrócić dwa `&mut`?",
        [
          "Granica pochodzi z jednego slice'a i rozdziela elementy.",
          "`mid == len` daje pustą prawą stronę.",
          "Dwa regiony nie pozwalają na dostęp do tego samego elementu.",
        ],
      ),
      coding({
        id: "disjoint-regions-gate",
        kind: "modify",
        title: "Napraw granicę",
        prompt:
          "Napraw `split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>`. `mid == 0` i `mid == buffer.len()` są poprawne; tylko `mid > len` zwraca `OutOfBounds`.",
        code: regionsStarter,
        solution: regionsSolution,
        tests: regionsTests,
        gate: true,
      }),
      coding({
        id: "disjoint-regions-contract-gate",
        kind: "apply",
        title: "Przenieś dowód rozłączności",
        prompt:
          "Zaimplementuj ten sam podpis i zachowaj niezależne mutacje oraz oba puste przypadki bez ręcznego tworzenia nakładających się referencji. To ta sama rodzina dowodu co gate.",
        code: regionsStarter,
        solution: regionsEquivalent,
        tests: regionsTests,
        gate: true,
      }),
      coding({
        id: "disjoint-regions-blank",
        kind: "blank",
        title: "Blank page: disjoint mutable regions",
        prompt:
          "Od pustej kartki zdefiniuj `enum SplitError { OutOfBounds }` oraz `fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>`. Wymień w kodzie pełną deklarację typu i zachowaj rozłączność także przy `mid == 0` oraz `mid == len`; nie używaj unsafe jako zamiennika dowodu. Blank dzieli rodzinę dowodu z gate.",
        solution: regionsSolution,
        tests: regionsTests,
        gate: true,
      }),
      coding({
        id: "disjoint-regions-recall",
        kind: "recall",
        title: "Retrieval: granice regionów",
        prompt:
          "Odtwórz `split_regions` z pamięci i przetestuj `0`, `len` oraz `len + 1`.",
        code: regionsRecallStarter,
        solution: regionsRecallSolution,
        tests: regionsRecallTests,
      }),
    ],
    misconceptions: [
      "`mid == len` to błąd.",
      "Ręczne pointer arithmetic jest dowodem rozłączności.",
      "Dwa `&mut` mogą wskazywać ten sam element, jeśli test odczytuje go szybko.",
    ],
    transferTask:
      "Zaprojektuj API dzielące bufor rekordów na region roboczy i region kontrolny, z jawną polityką granicy i bez aliasowania.",
    evidenceGate:
      "Bramki muszą przejść przypadki zero, len, out-of-bounds i niezależne mutacje.",
    sourceIds: ["unsafe-miri-guide", "unsafe-miri-from-raw-parts"],
  },
  {
    id: "unsafe-miri-slot-state",
    moduleId,
    conceptIds: ["unsafe-miri-slot-state-contract"],
    competencyIds: ["unsafe-miri-maybe-uninit-state"],
    prerequisites: ["unsafe-miri-disjoint-regions"],
    title: "Utrzymaj stan Slot<T> z MaybeUninit",
    subtitle:
      "Zapisz niezmiennik Empty/Full i udowodnij dokładny Drop przez liczniki fixture.",
    minutes: 35,
    outcomes: [
      "Oddzielisz niezainicjalizowany storage od żywej wartości.",
      "Zaimplementujesz `put`, `take` i Drop bez double-drop.",
      "Sprawdzisz odrzucony drugi put oraz transfer własności.",
    ],
    steps: [
      predict(
        "slot-state-predict",
        "Przewidź Drop",
        "Czy `Drop` może zawsze wywołać `assume_init_drop`?",
        [
          "Tak, MaybeUninit zawsze ma T",
          "Nie, tylko w stanie Full",
          "Tylko Miri tego zabrania",
        ],
        1,
        [
          "Nie każdy storage zawiera żywe T.",
          "Stan Full jest warunkiem bezpieczeństwa.",
          "To wymaganie modelu Rust, Miri je tylko pomaga ujawnić.",
        ],
      ),
      run(
        "slot-state-run",
        "Uruchom slot",
        "Włóż i wyjmij wartość, obserwując jawny transfer.",
        slotRun,
        "8\n",
      ),
      explain(
        "slot-state-explain",
        "Wyjaśnij niezmiennik",
        "Wyjaśnij kolejność zmiany stanu i `assume_init_read`.",
        [
          "Empty nie może być odczytany ani dropowany jako T.",
          "Po take stan musi być Empty, aby Drop nie powtórzył zwolnienia.",
          "Odrzucony drugi put zachowuje wartość przekazaną callerowi.",
        ],
      ),
      coding({
        id: "slot-state-gate",
        kind: "modify",
        title: "Napraw Slot<T>",
        prompt:
          "Uzupełnij `Slot<T>` z pełnymi deklaracjami `SlotState`, `MaybeUninit<T>`, `empty`, `put`, `take`, `is_full` i `Drop`. `assume_init_drop` wolno wykonać wyłącznie dla Full; `take` ma transferować dokładnie jedną żywą wartość.",
        code: slotStarter,
        solution: slotSolution,
        tests: slotTests,
        gate: true,
      }),
      coding({
        id: "slot-state-contract-gate",
        kind: "apply",
        title: "Zachowaj licznik Drop",
        prompt:
          "Zaimplementuj ten sam kontrakt Slot<T> dla pustego drop, pełnego drop, take i odrzuconego drugiego put. Nie rozwiązuj problemu przez mem::forget. To równoważna forma gate w tej samej rodzinie.",
        code: slotStarter,
        solution: slotEquivalent,
        tests: slotTests,
        gate: true,
      }),
      coding({
        id: "slot-state-blank",
        kind: "blank",
        title: "Blank page: MaybeUninit state machine",
        prompt:
          "Od pustej kartki zdefiniuj kompletne `enum SlotState { Empty, Full }` i `struct Slot<T> { value: MaybeUninit<T>, state: SlotState }`, a następnie `empty()`, `put(value: T) -> Result<(), T>`, `take() -> Option<T>`, `is_full()` i `Drop`. Opisz w kodzie niezmiennik, że tylko Full zawiera żywe T; nie czytaj ani nie dropuj Empty. Blank jest drugą formą tej samej rodziny co gate.",
        solution: slotSolution,
        tests: slotTests,
        gate: true,
      }),
      coding({
        id: "slot-state-recall",
        kind: "recall",
        title: "Retrieval: Empty, Full i Drop",
        prompt:
          "Odtwórz z pamięci Slot<T> i test z DropProbe, który odróżnia drop wartości po take od drop przez destruktor slotu.",
        code: slotRecallStarter,
        solution: slotRecallSolution,
        tests: slotRecallTests,
      }),
    ],
    misconceptions: [
      "MaybeUninit automatycznie dropuje T.",
      "`assume_init_read` można wykonać wiele razy.",
      "`mem::forget` jest dowodem poprawnej własności.",
    ],
    transferTask:
      "Zaprojektuj pojedynczy slot wiadomości, który może przechować wynik inicjalizacji i musi bezpiecznie posprzątać przy anulowaniu właściciela.",
    evidenceGate:
      "Bramki muszą wykazać brak drop dla Empty, pojedynczy drop dla Full oraz odzyskanie wartości z nieudanego put.",
    sourceIds: ["unsafe-miri-guide", "unsafe-miri-maybe-uninit"],
  },
  {
    id: "unsafe-miri-mut-slot",
    moduleId,
    conceptIds: ["unsafe-miri-mut-slot-variance-contract"],
    competencyIds: ["unsafe-miri-variance-reborrow"],
    prerequisites: ["unsafe-miri-slot-state"],
    title: "Skróć reborrow bez łamania wariancji MutSlot",
    subtitle:
      "Rozpoznaj, co jest kowariantne w lifetime, a co pozostaje niezmiennicze w `&mut T`.",
    minutes: 35,
    outcomes: [
      "Zwrócisz krótkotrwały MutSlot przez reborrow.",
      "Wykorzystasz kompilator do odrzucenia złego zapisu wewnętrznego lifetime.",
      "Odseparujesz bezpieczny reborrow od niebezpiecznej próby podmiany T.",
    ],
    steps: [
      predict(
        "mut-slot-predict",
        "Przewidź skrócenie",
        "Co może skrócić `reborrow`?",
        [
          "Lifetime zewnętrznej pożyczki",
          "Dowolny lifetime wewnętrznego T",
          "Oba bez ograniczeń",
        ],
        0,
        [
          "Reborrow ogranicza czas dostępu do slotu.",
          "`&mut T` jest niezmiennicze w zawartości T.",
          "Skrócenie ma konkretny zakres.",
        ],
      ),
      run(
        "mut-slot-run",
        "Uruchom reborrow",
        "Zmień wartość przez krótki reborrow i użyj outer slotu po jego zakończeniu.",
        mutSlotRun,
        "6\n",
      ),
      explain(
        "mut-slot-explain",
        "Wyjaśnij wariancję",
        "Wyjaśnij różnicę między lifetime pożyczki a lifetime referencji przechowywanej w T.",
        [
          "Można skrócić dostęp do samego `MutSlot`.",
          "Wewnętrzny T nie może zostać uznany za bezpiecznie krótszy przy zapisie przez `&mut`.",
          "Kompilator compile-fail jest dowodem ograniczenia API, nie awarią runtime.",
        ],
      ),
      coding({
        id: "mut-slot-gate",
        kind: "modify",
        title: "Napraw reborrow",
        prompt:
          "Uzupełnij `MutSlot<'a, T>` z deklaracją `new`, `get`, `get_mut` oraz `reborrow<'short>(&'short mut self) -> MutSlot<'short, T>`. Reborrow ma kończyć się przed ponownym użyciem outer slotu.",
        code: mutSlotStarter,
        solution: mutSlotSolution,
        tests: mutSlotTests,
        gate: true,
      }),
      coding({
        id: "mut-slot-contract-gate",
        kind: "apply",
        title: "Zachowaj niezmienniczość T",
        prompt:
          "Zaimplementuj reborrow, który skraca lifetime dostępu, ale nie pozwala zapisać krótszej referencji w miejscu wymagającym dłuższej. Zachowaj test wartości po reborrow; ta forma dzieli rodzinę dowodu z gate.",
        code: mutSlotStarter,
        solution: mutSlotEquivalent,
        tests: mutSlotTests,
        gate: true,
      }),
      compileFail(
        "mut-slot-variance-compile-fail",
        "Zobacz odrzuconą konwersję",
        "Uruchom compile-fail-like contract. Kompilator powinien odrzucić zapis krótkiej referencji do `MutSlot<'static, &'static str>`, ponieważ `&mut T` nie pozwala skrócić wewnętrznego T.",
        mutSlotCompileFail,
        mutSlotCompileFailSolution,
      ),
      coding({
        id: "mut-slot-blank",
        kind: "blank",
        title: "Blank page: MutSlot lifetime and variance",
        prompt:
          "Od pustej kartki zdefiniuj dokładnie `struct MutSlot<'a, T> { value: &'a mut T }` oraz `new(value: &'a mut T) -> Self`, `get(&self) -> &T`, `get_mut(&mut self) -> &mut T` i `reborrow<'short>(&'short mut self) -> MutSlot<'short, T>`. Dodaj test lokalnego, nie-`'static` tekstu i osobny przypadek, który kompilator ma odrzucić przy próbie skrócenia wewnętrznego T. Blank pozostaje drugą formą tej samej rodziny co gate.",
        solution: mutSlotSolution,
        tests: mutSlotTests,
        gate: true,
      }),
      coding({
        id: "mut-slot-recall",
        kind: "recall",
        title: "Retrieval: reborrow kontra variance",
        prompt:
          "Odtwórz MutSlot, krótkie reborrow i wyjaśnienie, dlaczego nie można skrócić lifetime wewnętrznej referencji przez zapis do `&mut T`.",
        code: mutSlotRecallStarter,
        solution: mutSlotRecallSolution,
        tests: mutSlotRecallTests,
      }),
    ],
    misconceptions: [
      "Skoro lifetime można skrócić, można też skrócić każdy lifetime w T.",
      "`&mut T` zachowuje się jak `&T` w każdym wymiarze.",
      "Jeśli test runtime przechodzi, zła konwersja lifetime jest bezpieczna.",
    ],
    transferTask:
      "Zaprojektuj API reborrow dla bufora roboczego, które pozwala helperowi użyć krótkiego zakresu bez przejęcia prawa do zapisania referencji o niewłaściwym lifetime.",
    evidenceGate:
      "Bramki muszą zawierać przechodzący test reborrow oraz osobny compile-fail-like kontrakt wariancji.",
    sourceIds: ["unsafe-miri-guide", "unsafe-miri-nomicon-subtyping"],
  },
];

for (const lesson of unsafeMiriLessons) {
  const family = unsafeEvidenceFamilies[lesson.id];
  for (const step of lesson.steps) {
    const isPrimaryFamilyStep =
      step.id.endsWith("-gate") ||
      step.id.endsWith("-blank") ||
      step.id.endsWith("-contract-gate");
    step.evidence = {
      version: 2,
      conceptIds: [...lesson.conceptIds],
      ...(isPrimaryFamilyStep ? { codingTaskId: family } : {}),
    };
  }
}

// The initialized-prefix primary assignment is intentionally explicit and
// follows the historical family loop above. It must not be inferred by the
// broad `-gate`/`-blank` naming convention.
const initializedPrefixPrimary = unsafeMiriLessons
  .find((lesson) => lesson.id === "unsafe-miri-byte-view")!
  .steps.find((step) => step.id === "byte-view-initialized-prefix")!;
initializedPrefixPrimary.evidence = {
  version: 2,
  conceptIds: [initializedPrefixConceptId],
  codingTaskId: initializedPrefixFamily,
};

export const unsafeMiriReviewExercises: Record<string, LessonStep> = {
  "unsafe-miri-byte-view-contract": coding({
    id: "review-unsafe-miri-byte-view",
    kind: "apply",
    title: "Powtórka: initialized ByteView",
    prompt:
      "Utwórz ByteView bez odczytu null/zero i z kontraktem zainicjalizowanych bajtów.",
    code: byteViewStarter,
    solution: byteViewEquivalent,
    tests: byteViewTests,
  }),
  "unsafe-miri-disjoint-regions-contract": coding({
    id: "review-unsafe-miri-disjoint-regions",
    kind: "apply",
    title: "Powtórka: rozłączne regiony",
    prompt: "Odtwórz podział z poprawnymi granicami i rozłącznymi mutacjami.",
    code: regionsStarter,
    solution: regionsEquivalent,
    tests: regionsTests,
  }),
  "unsafe-miri-slot-state-contract": coding({
    id: "review-unsafe-miri-slot-state",
    kind: "apply",
    title: "Powtórka: Slot<T>",
    prompt:
      "Odtwórz niezmiennik Empty/Full i policz Drop po take oraz po drop slotu.",
    code: slotStarter,
    solution: slotEquivalent,
    tests: slotTests,
  }),
  "unsafe-miri-mut-slot-variance-contract": coding({
    id: "review-unsafe-miri-mut-slot",
    kind: "apply",
    title: "Powtórka: MutSlot",
    prompt: "Odtwórz krótkie reborrow i niezmienniczość T w `&mut T`.",
    code: mutSlotReviewStarter,
    solution: mutSlotEquivalent,
    tests: mutSlotTests,
  }),
};

for (const [conceptId, review] of Object.entries(unsafeMiriReviewExercises)) {
  review.evidence = {
    version: 2,
    conceptIds: [conceptId],
    codingTaskId: `review/${review.id}-v1`,
  };
  review.evidenceKind = "recall";
}

export const unsafeMiriModule: CourseModule = {
  id: moduleId,
  title: "Miri i pure-Rust unsafe: inicjalizacja, aliasowanie oraz wariancja",
  whyItMatters:
    "Miri nie zastępuje proofu, ale pozwala uruchomić małe pure-Rust fixtures, które ujawniają część naruszeń UB. Nauczysz się najpierw zbudować kontrakt i niezmiennik, a dopiero potem użyć interpreterowego dowodu dla raw views, rozłącznych regionów, MaybeUninit i reborrow.",
  capabilities: unsafeMiriCompetencies.map((item) => item.title),
  prerequisites: ["unsafe-ffi-contracts"],
  lessonIds: unsafeMiriLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zbudujesz ByteView tylko z zainicjalizowanych, żywych bajtów i nie wydłużysz lifetime storage; gate i blank należą do jednej rodziny.",
    "Podzielisz mutowalny bufor po obu krawędziach bez aliasowania; druga forma nie tworzy nowej rodziny.",
    "Utrzymasz Slot<T> z poprawnym stanem MaybeUninit i dokładnym Drop; powtórka recall pozostaje osobnym sprawdzeniem.",
    "Rozpoznasz bezpieczny reborrow MutSlot oraz odrzucisz niepoprawne skrócenie wewnętrznego lifetime; przy jednej rodzinie potwierdzenie pozostaje prowizoryczne, a pomoc nie otwiera nowej wersji.",
  ],
  projectConnection:
    "Pure-Rust Miri fixtures są osobnym dowodem dla abstrakcji pamięci; nie przenoszą automatycznie zaufania na natywny C ABI ani na kod ucznia.",
  assessmentId: "unsafe-miri-mut-slot/mut-slot-blank",
  gateCriteria: [
    {
      id: "unsafe-miri-byte-view-gate",
      label: "ByteView zachowuje kontrakt inicjalizacji i lifetime.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        { lessonId: "unsafe-miri-byte-view", stepId: "byte-view-gate" },
        { lessonId: "unsafe-miri-byte-view", stepId: "byte-view-blank" },
        {
          lessonId: "unsafe-miri-byte-view",
          stepId: "byte-view-initialized-prefix",
        },
      ],
    },
    {
      id: "unsafe-miri-disjoint-regions-gate",
      label: "Regiony są rozłączne dla obu krawędzi i mutacji.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        {
          lessonId: "unsafe-miri-disjoint-regions",
          stepId: "disjoint-regions-gate",
        },
        {
          lessonId: "unsafe-miri-disjoint-regions",
          stepId: "disjoint-regions-blank",
        },
      ],
    },
    {
      id: "unsafe-miri-slot-state-gate",
      label: "Slot<T> nie czyta ani nie dropuje Empty i nie dubluje Drop.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        { lessonId: "unsafe-miri-slot-state", stepId: "slot-state-gate" },
        { lessonId: "unsafe-miri-slot-state", stepId: "slot-state-blank" },
      ],
    },
    {
      id: "unsafe-miri-mut-slot-gate",
      label: "MutSlot skraca reborrow, ale odrzuca niepoprawną konwersję T.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        { lessonId: "unsafe-miri-mut-slot", stepId: "mut-slot-gate" },
        { lessonId: "unsafe-miri-mut-slot", stepId: "mut-slot-blank" },
      ],
    },
    {
      id: "unsafe-miri-byte-view-recall",
      label: "Retrieval ByteView zachowuje initialized storage.",
      taskRefs: [
        {
          lessonId: "unsafe-miri-byte-view",
          stepId: "byte-view-contract-gate",
        },
        { lessonId: "unsafe-miri-byte-view", stepId: "byte-view-recall" },
      ],
    },
    {
      id: "unsafe-miri-disjoint-regions-recall",
      label: "Retrieval regionów zachowuje granice.",
      taskRefs: [
        {
          lessonId: "unsafe-miri-disjoint-regions",
          stepId: "disjoint-regions-contract-gate",
        },
        {
          lessonId: "unsafe-miri-disjoint-regions",
          stepId: "disjoint-regions-recall",
        },
      ],
    },
    {
      id: "unsafe-miri-slot-state-recall",
      label: "Retrieval Slot<T> zachowuje stan.",
      taskRefs: [
        {
          lessonId: "unsafe-miri-slot-state",
          stepId: "slot-state-contract-gate",
        },
        { lessonId: "unsafe-miri-slot-state", stepId: "slot-state-recall" },
      ],
    },
    {
      id: "unsafe-miri-mut-slot-recall",
      label: "Retrieval MutSlot rozróżnia reborrow i variance.",
      taskRefs: [
        { lessonId: "unsafe-miri-mut-slot", stepId: "mut-slot-contract-gate" },
        { lessonId: "unsafe-miri-mut-slot", stepId: "mut-slot-recall" },
      ],
    },
  ],
};

export const unsafeMiriAssessmentSources = {
  byteView: {
    canonical: byteViewSolution,
    equivalent: byteViewEquivalent,
    mutant: byteViewStarter,
  },
  disjointRegions: {
    canonical: regionsSolution,
    equivalent: regionsEquivalent,
    mutant: regionsStarter,
  },
  slotState: {
    canonical: slotSolution,
    equivalent: slotEquivalent,
    mutant: slotMutant,
  },
  mutSlot: {
    canonical: mutSlotSolution,
    equivalent: mutSlotEquivalent,
    mutant: mutSlotMutant,
  },
};
