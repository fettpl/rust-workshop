import { linkSplitRegionSolutions } from "./split-region-solutions";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-18";
const moduleId = "unsafe-ffi-contracts";

export const unsafeFfiSources: Source[] = [
  {
    id: "unsafe-ffi-nomicon",
    title: "The Rustonomicon: FFI",
    url: "https://doc.rust-lang.org/nomicon/ffi.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów granicy C ABI, własności uchwytu albo polityki walidacji danych z obcego kodu.",
  },
  {
    id: "unsafe-ffi-pointer",
    title: "Rust standard library: raw pointers",
    url: "https://doc.rust-lang.org/std/primitive.pointer.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie reguł null pointera, dereferencji lub tworzenia widoku z surowych adresów.",
  },
  {
    id: "unsafe-ffi-slice",
    title: "Rust standard library: slice::from_raw_parts",
    url: "https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie warunków bezpieczeństwa długości, wyrównania, ważności pamięci albo pustego widoku.",
  },
  {
    id: "unsafe-ffi-repr-c",
    title: "Rust Reference: repr(C)",
    url: "https://doc.rust-lang.org/reference/type-layout.html#reprc",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu układu pól, tagu, flag albo zgodności z rekordem C.",
  },
];

export const unsafeFfiCompetencies: Competency[] = [
  {
    id: "unsafe-ffi-raw-contract",
    title:
      "Opisujesz precondition surowego wejścia i zamykasz `unsafe` za sprawdzalną granicą.",
  },
  {
    id: "unsafe-ffi-alias-boundary",
    title:
      "Rozdzielasz mutowalne regiony bez tworzenia nakładających się pożyczek.",
  },
  {
    id: "unsafe-ffi-layout-validation",
    title:
      "Walidujesz rekord `#[repr(C)]` przed przekształceniem go w bezpieczny typ domenowy.",
  },
  {
    id: "unsafe-ffi-raii-ownership",
    title:
      "Modelujesz własność zasobu FFI przez `borrow()` i dokładnie jednokrotne `Drop`.",
  },
];

export const unsafeFfiConcepts: Concept[] = [
  {
    id: "unsafe-ffi-checked-view-contract",
    title: "Jawna polityka null i zero dla widoku z surowego adresu",
    prerequisites: [],
    competencyIds: ["unsafe-ffi-raw-contract"],
    reviewPrompt:
      "Jakie precondition musi spełnić caller `unsafe fn checked_view(raw, len)` przed utworzeniem widoku i dlaczego długość zero jest osobną gałęzią?",
    reviewAnswer:
      "Caller musi zagwarantować, że dla `len > 0` adres jest niezerowy, poprawnie wyrównany, wskazuje `len` zainicjalizowanych bajtów w jednym żywym alokowanym obiekcie, `len <= isize::MAX`, a obliczenie końca zakresu nie zawija adresu. Pamięć musi pozostać ważna i nie być mutowalnie aliasowana przez całe życie zwróconego widoku. Dla `len == 0` null jest dozwolony i funkcja zwraca `Some(&[])` bez wywołania `from_raw_parts`.",
    distinguish:
      "Samo oznaczenie funkcji jako `unsafe` nie jest kontraktem. `# Safety` musi wymienić ważność, długość `len <= isize::MAX`, wyrównanie, nieprzepełniający się koniec zakresu, brak mutowalnego aliasowania i czas życia danych; gałąź `len == 0` może przyjąć null bez wykonywania `from_raw_parts`.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-ffi-split-regions-contract",
    title: "Rozłączne regiony mutowalne jako bezpieczny podział",
    prerequisites: ["unsafe-ffi-checked-view-contract"],
    competencyIds: ["unsafe-ffi-alias-boundary"],
    reviewPrompt:
      "Jak `split_regions` powinno potraktować `mid == len` i dlaczego `split_at_mut` nie tworzy konfliktu aliasowania?",
    reviewAnswer:
      "`mid == len` jest poprawne: lewa część obejmuje cały bufor, a prawa jest pusta. Po sprawdzeniu `mid <= len` można użyć `split_at_mut`, który zwraca dwa rozłączne wycinki i pozwala kompilatorowi zachować regułę jednej aktywnej pożyczki mutowalnej dla każdego elementu.",
    distinguish:
      "Błąd granicy powinien być jawny i zwrócony jako `Err`, zanim nastąpi indeksowanie. Rozłączne wycinki są dowodem zakresów, lecz nie pozwalają na równoległy dostęp do tego samego elementu przez dwa `&mut`.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-ffi-repr-c-record-contract",
    title: "Walidacja tagu i flag rekordu C przed dekodowaniem",
    prerequisites: ["unsafe-ffi-split-regions-contract"],
    competencyIds: ["unsafe-ffi-layout-validation"],
    reviewPrompt:
      "Co musi sprawdzić `parse_record`, zanim z `RawRecord` powstanie `Record`, i czemu nie wolno traktować nieznanych bitów flag jako rozszerzenia?",
    reviewAnswer:
      "Rekord ma `#[repr(C)]`, więc jego układ jest częścią granicy, lecz poprawny układ nie gwarantuje poprawnej wartości. `parse_record` musi zaakceptować wyłącznie znany tag i maskę dozwolonych flag; każdy nieznany tag lub ustawiony bit zarezerwowany zwraca właściwy `DecodeError` zamiast cichego dekodowania.",
    distinguish:
      "`repr(C)` opisuje layout, a nie znaczenie pól. Walidacja semantyczna tagu i flag jest osobnym krokiem, dzięki któremu dalszy kod może pracować na bezpiecznym `Record` bez ukrytego założenia o wersji protokołu.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-ffi-owned-handle-contract",
    title: "RAII uchwytu z pożyczką i deterministycznym zwolnieniem",
    prerequisites: ["unsafe-ffi-repr-c-record-contract"],
    competencyIds: ["unsafe-ffi-raii-ownership"],
    reviewPrompt:
      "Jak `OwnedHandle` ma zapewnić `borrow()` i pojedyncze wywołanie zwalniacza, skoro konstruktor sam alokuje własność przez zaufany fixture ABI?",
    reviewAnswer:
      "Konstruktor sam wywołuje zaufany `fixture_alloc`, zapisuje niezerowy wynik w `NonNull`, `borrow()` zwraca referencję tak długo, jak żyje uchwyt, a `Drop` przekazuje własność do `fixture_free` dokładnie raz. Test może policzyć wywołania zwalniacza atomikiem, bez zegara, losowych adresów ani caller-supplied ownership boundary.",
    distinguish:
      "RAII nie oznacza wycieku ani ręcznego `free` w każdej ścieżce. Właściciel opakowuje dokładnie jeden zasób, nie implementuje `Copy`, a `Drop` jest jedynym miejscem zwolnienia; `borrow()` nie przejmuje i nie zwalnia zasobu.",
    evidenceArtifact: "rust-code",
  },
];

function choice(
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
        explanations.map((explanation, index) => [String(index), explanation]),
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

function gate(options: {
  id: string;
  kind: "modify" | "apply" | "blank" | "recall";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  evidenceGate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: [
      "Najpierw wypisz przypadki brzegowe i warunek, który musi obowiązywać przed wejściem do unsafe.",
      "Uruchom testy także dla mutanta: zielony test nie może zależeć wyłącznie od przykładu nominalnego.",
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
    evidenceGate: options.evidenceGate ?? false,
  };
}

const checkedPrefixTransfer: LessonStep = {
  ...gate({
    id: "checked-view-prefix-transfer",
    kind: "blank",
    title: "Pożycz ograniczony prefiks bufora C",
    prompt:
      "Od pustej kartki napisz `unsafe fn checked_prefix<'a>(raw: *const u8, available: usize, requested: usize) -> Option<&'a [u8]>`. Najpierw odrzuć requested > available przez None, bez dotykania pamięci. Dla requested == 0 zwróć Some(&[]), także przy null i available == 0. W pozostałych poprawnych przypadkach pożycz dokładnie requested pierwszych bajtów bez kopiowania. # Safety: jeśli available > 0, caller zapewnia niezerowy, wyrównany adres available zainicjalizowanych bajtów w jednej żywej alokacji, available <= isize::MAX, koniec adresu bez zawijania oraz ważność i brak mutowalnego aliasowania przez całe 'a. Jeśli available == 0, raw może być null i nie jest dereferencjonowany. Ten kontrakt pozwala odrzucić zbyt duże requested przy ważnym buforze; nie weryfikuje ważności obcego adresu. Testy używają tylko ważnych alokacji albo dozwolonego pustego null.",
    solution: String.raw`/// # Safety
/// For available > 0, raw addresses available initialized bytes in one live allocation,
/// is non-null and aligned, available <= isize::MAX, and the end address does not wrap.
/// The allocation stays valid without mutable aliasing throughout the returned lifetime.
/// For available == 0, raw may be null and is never dereferenced.
unsafe fn checked_prefix<'a>(raw: *const u8, available: usize, requested: usize) -> Option<&'a [u8]> {
    if requested > available { return None; }
    if requested == 0 { return Some(&[]); }
    if raw.is_null() { return None; }
    Some(unsafe { std::slice::from_raw_parts(raw, requested) })
}`,
    tests: String.raw`#[test]
fn prefixes_preserve_the_original_allocation_and_requested_length() {
    let bytes = [7_u8, 0, 255, 9];
    for requested in 1..=bytes.len() {
        let view = unsafe { checked_prefix(bytes.as_ptr(), bytes.len(), requested) }.unwrap();
        assert_eq!(view, &bytes[..requested]);
        assert_eq!(view.as_ptr(), bytes.as_ptr());
    }
}

#[test]
fn rejects_excess_length_before_touching_memory_and_allows_empty_null() {
    let bytes = [3_u8, 4, 5];
    assert_eq!(unsafe { checked_prefix(bytes.as_ptr(), bytes.len(), bytes.len() + 1) }, None);
    assert_eq!(unsafe { checked_prefix(bytes.as_ptr(), bytes.len(), usize::MAX) }, None);
    assert_eq!(unsafe { checked_prefix(bytes.as_ptr(), bytes.len(), 0) }, Some(&[][..]));
    assert_eq!(unsafe { checked_prefix(std::ptr::null(), 0, 0) }, Some(&[][..]));
    assert_eq!(unsafe { checked_prefix(std::ptr::null(), 0, 1) }, None);
}`,
    evidenceGate: true,
  }),
  evidence: {
    version: 1,
    conceptIds: ["unsafe-ffi-checked-view-contract"],
    codingTaskId: "unsafe-ffi/bounded-prefix-v1",
  },
};

const splitEnvelopeTransfer: LessonStep = {
  ...gate({
    id: "split-envelope-transfer",
    kind: "blank",
    title: "Rozdziel nagłówek, treść i trailer",
    prompt:
      "Napisz `#[derive(Debug, PartialEq, Eq)] enum RegionsError { Outside }` oraz `fn split_envelope(buffer: &mut [u8], header: usize, trailer: usize) -> Result<(&mut [u8], &mut [u8], &mut [u8]), RegionsError>`. Zwróć kolejno pierwsze header bajtów, środkową treść i ostatnie trailer bajtów jako trzy rozłączne mutowalne pożyczki. Odrzuć przez Outside tylko overflow sumy header + trailer albo sumę większą od długości. Równość jest poprawna i daje pustą treść; zero jest dozwolone dla każdej części, także pustego bufora. Przy błędzie nie zmieniaj danych. Użyj bezpiecznego split_at_mut bez raw pointerów i unsafe.",
    solution: String.raw`#[derive(Debug, PartialEq, Eq)]
enum RegionsError { Outside }

fn split_envelope(buffer: &mut [u8], header: usize, trailer: usize) -> Result<(&mut [u8], &mut [u8], &mut [u8]), RegionsError> {
    let Some(edges) = header.checked_add(trailer) else { return Err(RegionsError::Outside) };
    if edges > buffer.len() { return Err(RegionsError::Outside); }
    let body_len = buffer.len() - edges;
    let (head, remaining) = buffer.split_at_mut(header);
    let (body, tail) = remaining.split_at_mut(body_len);
    Ok((head, body, tail))
}`,
    tests: String.raw`#[test]
fn all_three_regions_mutate_independently_in_the_original_buffer() {
    let mut bytes = [1_u8, 2, 3, 4, 5, 6];
    {
        let (header, body, trailer) = split_envelope(&mut bytes, 2, 1).unwrap();
        assert_eq!(header, &[1, 2]);
        assert_eq!(body, &[3, 4, 5]);
        assert_eq!(trailer, &[6]);
        header[1] = 20;
        body[0] = 30;
        trailer[0] = 60;
    }
    assert_eq!(bytes, [1, 20, 30, 4, 5, 60]);
}

#[test]
fn accepts_empty_sections_equal_boundaries_and_rejects_overflow_without_mutation() {
    let mut bytes = [7_u8, 8, 9];
    assert_eq!(split_envelope(&mut bytes, 1, 2), Ok((&mut [7][..], &mut [][..], &mut [8, 9][..])));
    assert_eq!(split_envelope(&mut bytes, 0, 0), Ok((&mut [][..], &mut [7, 8, 9][..], &mut [][..])));
    assert_eq!(split_envelope(&mut bytes, 3, 0), Ok((&mut [7, 8, 9][..], &mut [][..], &mut [][..])));
    assert_eq!(split_envelope(&mut [], 0, 0), Ok((&mut [][..], &mut [][..], &mut [][..])));
    assert_eq!(split_envelope(&mut bytes, 2, 2), Err(RegionsError::Outside));
    assert_eq!(split_envelope(&mut bytes, usize::MAX, 1), Err(RegionsError::Outside));
    assert_eq!(bytes, [7, 8, 9]);
}`,
    evidenceGate: true,
  }),
  evidence: {
    version: 1,
    conceptIds: ["unsafe-ffi-split-regions-contract"],
    codingTaskId: "unsafe-ffi/three-region-envelope-v1",
  },
};

const rawHeaderTransfer: LessonStep = {
  ...gate({
    id: "raw-header-transfer",
    kind: "blank",
    title: "Zwaliduj nowy nagłówek C",
    prompt:
      "Zdefiniuj `#[repr(C)] struct RawHeader { version: u8, flags: u16, length: u32 }`, porównywalne przez Debug, PartialEq i Eq `struct Header { urgent: bool, encrypted: bool, payload_len: u32 }` oraz `enum HeaderError { Version(u8), Flags(u16) }`. `fn decode_header(raw: RawHeader) -> Result<Header, HeaderError>` najpierw wymaga version == 3, potem odrzuca każdy bit flags spoza maski 0b0101. Błąd zachowuje pełną oryginalną wartość. Bit 0 oznacza urgent, bit 2 encrypted; length przenieś bez zmian, także 0 i u32::MAX. Układ RawHeader to offsety version=0, flags=2, length=4, rozmiar 8 i wyrównanie 4. Nie używaj transmute ani odczytu nieważnej pamięci: fixture tworzy poprawnie zainicjalizowane wartości Rust.",
    solution: String.raw`#[repr(C)]
struct RawHeader { version: u8, flags: u16, length: u32 }

#[derive(Debug, PartialEq, Eq)]
struct Header { urgent: bool, encrypted: bool, payload_len: u32 }

#[derive(Debug, PartialEq, Eq)]
enum HeaderError { Version(u8), Flags(u16) }

fn decode_header(raw: RawHeader) -> Result<Header, HeaderError> {
    if raw.version != 3 { return Err(HeaderError::Version(raw.version)); }
    if raw.flags & !0b0101 != 0 { return Err(HeaderError::Flags(raw.flags)); }
    Ok(Header { urgent: raw.flags & 1 != 0, encrypted: raw.flags & 4 != 0, payload_len: raw.length })
}`,
    tests: String.raw`#[test]
fn header_layout_and_all_defined_flag_combinations_match_the_c_contract() {
    assert_eq!(std::mem::offset_of!(RawHeader, version), 0);
    assert_eq!(std::mem::offset_of!(RawHeader, flags), 2);
    assert_eq!(std::mem::offset_of!(RawHeader, length), 4);
    assert_eq!(std::mem::size_of::<RawHeader>(), 8);
    assert_eq!(std::mem::align_of::<RawHeader>(), 4);
    for length in [0, 17, u32::MAX] {
        for flags in [0, 1, 4, 5] {
            assert_eq!(decode_header(RawHeader { version: 3, flags, length }), Ok(Header {
                urgent: flags & 1 != 0, encrypted: flags & 4 != 0, payload_len: length,
            }));
        }
    }
}

#[test]
fn unknown_versions_precede_flags_and_every_reserved_bit_is_rejected() {
    for version in 0..=u8::MAX {
        if version != 3 {
            assert_eq!(decode_header(RawHeader { version, flags: u16::MAX, length: 0 }), Err(HeaderError::Version(version)));
        }
    }
    for flags in 0..=u16::MAX {
        if flags & !0b0101 != 0 {
            assert_eq!(decode_header(RawHeader { version: 3, flags, length: 9 }), Err(HeaderError::Flags(flags)));
        }
    }
}`,
    evidenceGate: true,
  }),
  evidence: {
    version: 1,
    conceptIds: ["unsafe-ffi-repr-c-record-contract"],
    codingTaskId: "unsafe-ffi/versioned-header-v1",
  },
};

const ownedPairFixture = String.raw`use std::ptr::NonNull;
use std::sync::atomic::{AtomicUsize, Ordering};

static PAIR_RELEASES: AtomicUsize = AtomicUsize::new(0);
static PAIR_ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);

unsafe extern "C" fn fixture_pair_alloc(value: u16) -> *mut u16 {
    PAIR_ALLOCATIONS.fetch_add(1, Ordering::SeqCst);
    Box::into_raw(Box::new(value))
}

/// # Safety
/// raw is a live allocation returned by fixture_pair_alloc, released exactly once.
unsafe extern "C" fn fixture_pair_release(raw: *mut u16) {
    PAIR_RELEASES.fetch_add(1, Ordering::SeqCst);
    unsafe { drop(Box::from_raw(raw)); }
}`;

const ownedPairStarter = `${ownedPairFixture}

struct OwnedPair { first: NonNull<u16>, second: NonNull<u16> }

impl OwnedPair {
    fn new(_first: u16, _second: u16) -> Self { todo!("allocate two owned handles") }
    fn borrow(&self) -> (&u16, &u16) { todo!("borrow both without releasing") }
}

impl Drop for OwnedPair {
    fn drop(&mut self) {}
}`;

const ownedPairTransfer: LessonStep = {
  ...gate({
    id: "owned-pair-transfer",
    kind: "apply",
    title: "Zachowaj dwie własności ABI w jednym RAII",
    prompt:
      "Napraw OwnedPair. Zaufany fixture ABI jest dostarczony: fixture_pair_alloc(u16) tworzy osobną, niezerową i wyrównaną alokację u16 oraz zwiększa PAIR_ALLOCATIONS; fixture_pair_release(*mut u16) zwalnia ją i zwiększa PAIR_RELEASES. `OwnedPair::new(first: u16, second: u16) -> Self` przejmuje dokładnie dwa uchwyty przez dwa wywołania allocator-a. Zachowaj dostarczone funkcje ABI i ich liczniki. `borrow(&self) -> (&u16, &u16)` pożycza oryginalne wartości w tej kolejności, bez zwalniania lub kopii. Drop zwalnia każdy z dwóch uchwytów dokładnie raz. Przeniesienie wrappera i borrow nie alokują ponownie: jedna para daje 2 alokacje, dwie pary 4. Nie implementuj Copy/Clone ani ręcznej metody zwalniania; układ prywatnych pól możesz zmienić. Test jest serializowany i używa tylko wewnętrznie utworzonych ważnych alokacji. To deterministyczny model własności ABI, nie integracja z zewnętrzną biblioteką C.",
    code: ownedPairStarter,
    solution: `${ownedPairFixture}

struct OwnedPair { first: NonNull<u16>, second: NonNull<u16> }

impl OwnedPair {
    fn new(first: u16, second: u16) -> Self {
        let first = NonNull::new(unsafe { fixture_pair_alloc(first) }).expect("trusted first allocation");
        let second = NonNull::new(unsafe { fixture_pair_alloc(second) }).expect("trusted second allocation");
        Self { first, second }
    }
    fn borrow(&self) -> (&u16, &u16) {
        unsafe { (self.first.as_ref(), self.second.as_ref()) }
    }
}

impl Drop for OwnedPair {
    fn drop(&mut self) {
        unsafe {
            fixture_pair_release(self.first.as_ptr());
            fixture_pair_release(self.second.as_ptr());
        }
    }
}`,
    tests: String.raw`#[test]
fn pair_owns_borrows_moves_and_releases_each_original_handle_once() {
    PAIR_RELEASES.store(0, Ordering::SeqCst);
    PAIR_ALLOCATIONS.store(0, Ordering::SeqCst);
    let pair = OwnedPair::new(0, u16::MAX);
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 2);
    let pointers = {
        let (first, second) = pair.borrow();
        assert_eq!((*first, *second), (0, u16::MAX));
        assert_ne!(first as *const u16, second as *const u16);
        (first as *const u16, second as *const u16)
    };
    assert_eq!(PAIR_RELEASES.load(Ordering::SeqCst), 0);
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 2);
    let relocated = pair;
    let (first, second) = relocated.borrow();
    assert_eq!((first as *const u16, second as *const u16), pointers);
    assert_eq!((*first, *second), (0, u16::MAX));
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 2);
    let other = OwnedPair::new(21, 34);
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 4);
    assert_eq!((*other.borrow().0, *other.borrow().1), (21, 34));
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 4);
    drop(relocated);
    assert_eq!(PAIR_RELEASES.load(Ordering::SeqCst), 2);
    assert_eq!((*other.borrow().0, *other.borrow().1), (21, 34));
    drop(other);
    assert_eq!(PAIR_RELEASES.load(Ordering::SeqCst), 4);
    assert_eq!(PAIR_ALLOCATIONS.load(Ordering::SeqCst), 4);
}`,
    evidenceGate: true,
  }),
  evidence: {
    version: 1,
    conceptIds: ["unsafe-ffi-owned-handle-contract"],
    codingTaskId: "unsafe-ffi/owned-abi-pair-v1",
  },
};

const checkedViewStarter = String.raw`/// # Safety
/// For len > 0, raw must be non-null, aligned, and point to len initialized bytes
/// in one live allocation; len must be <= isize::MAX and raw.add(len) must not wrap.
/// The allocation remains valid and unaliased for the returned lifetime.
/// For len == 0, raw may be null and no dereference occurs.
unsafe fn checked_view<'a>(raw: *const u8, len: usize) -> Option<&'a [u8]> {
    if raw.is_null() { return None; }
    unsafe { Some(std::slice::from_raw_parts(raw, len)) }
}`;

const checkedViewSolution = String.raw`/// # Safety
/// For len > 0, raw must be non-null, aligned, and point to len initialized bytes
/// in one live allocation; len must be <= isize::MAX and raw.add(len) must not wrap.
/// The allocation remains valid and unaliased for the returned lifetime.
/// For len == 0, raw may be null and no dereference occurs.
unsafe fn checked_view<'a>(raw: *const u8, len: usize) -> Option<&'a [u8]> {
    if len == 0 { return Some(&[]); }
    if raw.is_null() { return None; }
    Some(unsafe { std::slice::from_raw_parts(raw, len) })
}`;

const checkedViewTests = String.raw`#[test]
fn checked_view_enforces_null_and_zero_policy() {
    let bytes = [4_u8, 5, 6];
    assert_eq!(unsafe { checked_view(bytes.as_ptr(), bytes.len()) }, Some(&bytes[..]));
    assert_eq!(unsafe { checked_view(std::ptr::null(), 0) }, Some(&[][..]));
}

#[test]
fn checked_view_preserves_empty_non_null_view() {
    let bytes = [1_u8];
    let view = unsafe { checked_view(bytes.as_ptr(), 0) }.expect("zero length is valid");
    assert!(view.is_empty());
}`;

const checkedViewEquivalent = String.raw`/// # Safety
/// For len > 0, raw must be non-null, aligned, and point to len initialized bytes
/// in one live allocation; len must be <= isize::MAX and raw.add(len) must not wrap.
/// The allocation remains valid and unaliased for the returned lifetime.
/// For len == 0, raw may be null and no dereference occurs.
unsafe fn checked_view<'a>(raw: *const u8, len: usize) -> Option<&'a [u8]> {
    match (raw.is_null(), len) {
        (_, 0) => Some(&[]),
        (true, _) => None,
        (false, _) => Some(unsafe { std::slice::from_raw_parts(raw, len) }),
    }
}`;

const checkedViewMutant = String.raw`unsafe fn checked_view<'a>(raw: *const u8, len: usize) -> Option<&'a [u8]> {
    if raw.is_null() { return None; }
    if len == 0 { return Some(&[]); }
    Some(unsafe { std::slice::from_raw_parts(raw, len) })
}`;

const splitRegionsStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid >= buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;

const splitRegionsSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid > buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;

const splitRegionsTests = String.raw`#[test]
fn split_regions_accepts_empty_sides_and_rejects_only_out_of_bounds() {
    let mut data = [0_u8; 4];
    {
        let (left, right) = split_regions(&mut data, 0).expect("zero split");
        assert!(left.is_empty());
        right[0] = 7;
    }
    let len = data.len();
    assert_eq!(split_regions(&mut data, len).unwrap().1, &[]);
    assert_eq!(split_regions(&mut data, len + 1), Err(SplitError::OutOfBounds));
}

#[test]
fn split_regions_returns_disjoint_mutable_regions() {
    let mut data = [0_u8; 4];
    let (left, right) = split_regions(&mut data, 2).unwrap();
    left[0] = 1;
    right[0] = 2;
    assert_eq!(data, [1, 0, 2, 0]);
}`;

const splitRegionsEquivalent = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    match buffer.get(mid..) {
        None => Err(SplitError::OutOfBounds),
        Some(_) => Ok(buffer.split_at_mut(mid)),
    }
}`;

const splitRegionsMutant = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }

fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid >= buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;

const rawRecordSolution = String.raw`#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RawRecord { tag: u8, flags: u16, value: i64 }

#[derive(Debug, PartialEq, Eq)]
struct Record { value: i64, flags: u16 }

#[derive(Debug, PartialEq, Eq)]
enum DecodeError { InvalidTag, InvalidFlags }

fn parse_record(raw: RawRecord) -> Result<Record, DecodeError> {
    if raw.tag != 0xCA { return Err(DecodeError::InvalidTag); }
    if raw.flags & !0b0011 != 0 { return Err(DecodeError::InvalidFlags); }
    Ok(Record { value: raw.value, flags: raw.flags })
}`;

const rawRecordStarter = String.raw`#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RawRecord { tag: u8, flags: u16, value: i64 }

#[derive(Debug, PartialEq, Eq)]
struct Record { value: i64, flags: u16 }

#[derive(Debug, PartialEq, Eq)]
enum DecodeError { InvalidTag, InvalidFlags }

fn parse_record(raw: RawRecord) -> Result<Record, DecodeError> {
    if raw.tag != 0xCA { return Err(DecodeError::InvalidTag); }
    Ok(Record { value: raw.value, flags: raw.flags })
}`;

const rawRecordTests = String.raw`#[test]
fn parse_record_validates_layout_values_and_reserved_flags() {
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0, value: -4 }), Ok(Record { value: -4, flags: 0 }));
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0b0001, value: 1 }), Ok(Record { value: 1, flags: 0b0001 }));
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0b0010, value: 2 }), Ok(Record { value: 2, flags: 0b0010 }));
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0b0011, value: 8 }), Ok(Record { value: 8, flags: 0b0011 }));
    assert_eq!(parse_record(RawRecord { tag: 7, flags: 0, value: 1 }), Err(DecodeError::InvalidTag));
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0b0100, value: 1 }), Err(DecodeError::InvalidFlags));
}

#[test]
fn raw_record_exposes_the_c_layout_contract() {
    assert_eq!(std::mem::size_of::<RawRecord>(), 16);
    assert_eq!(std::mem::align_of::<RawRecord>(), 8);
    assert_eq!(std::mem::offset_of!(RawRecord, tag), 0);
    assert_eq!(std::mem::offset_of!(RawRecord, flags), 2);
    assert_eq!(std::mem::offset_of!(RawRecord, value), 8);
}

#[test]
fn parse_record_does_not_normalize_unknown_bits() {
    assert_eq!(parse_record(RawRecord { tag: 0xCA, flags: 0x8000, value: 0 }), Err(DecodeError::InvalidFlags));
}`;

const rawRecordEquivalent = String.raw`#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RawRecord { tag: u8, flags: u16, value: i64 }

#[derive(Debug, PartialEq, Eq)]
struct Record { value: i64, flags: u16 }

#[derive(Debug, PartialEq, Eq)]
enum DecodeError { InvalidTag, InvalidFlags }

fn parse_record(raw: RawRecord) -> Result<Record, DecodeError> {
    match (raw.tag, raw.flags & !0b0011) {
        (0xCA, 0) => Ok(Record { value: raw.value, flags: raw.flags }),
        (0xCA, _) => Err(DecodeError::InvalidFlags),
        _ => Err(DecodeError::InvalidTag),
    }
}`;

const rawRecordMutant = String.raw`#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RawRecord { tag: u8, flags: u16, value: i64 }

#[derive(Debug, PartialEq, Eq)]
struct Record { value: i64, flags: u16 }

#[derive(Debug, PartialEq, Eq)]
enum DecodeError { InvalidTag, InvalidFlags }

fn parse_record(raw: RawRecord) -> Result<Record, DecodeError> {
    if raw.tag != 0xCA { return Err(DecodeError::InvalidTag); }
    Ok(Record { value: raw.value, flags: raw.flags & 0b0011 })
}`;

const ownedHandleSolution = String.raw`use std::ptr::NonNull;
use std::sync::atomic::{AtomicUsize, Ordering};

static RELEASES: AtomicUsize = AtomicUsize::new(0);

extern "C" fn fixture_alloc(value: u8) -> *mut u8 { Box::into_raw(Box::new(value)) }
extern "C" fn fixture_free(raw: *mut u8) {
    if raw.is_null() { return; }
    unsafe { drop(Box::from_raw(raw)); }
    RELEASES.fetch_add(1, Ordering::SeqCst);
}

struct OwnedHandle { raw: NonNull<u8> }

impl OwnedHandle {
    fn new(value: u8) -> Self {
        let raw = NonNull::new(fixture_alloc(value)).expect("fixture_alloc returns an owned handle");
        Self { raw }
    }
    fn borrow(&self) -> &u8 { unsafe { self.raw.as_ref() } }
}

impl Drop for OwnedHandle {
    fn drop(&mut self) { fixture_free(self.raw.as_ptr()); }
}`;

const ownedHandleStarter = String.raw`use std::ptr::NonNull;
use std::sync::atomic::{AtomicUsize, Ordering};

static RELEASES: AtomicUsize = AtomicUsize::new(0);

extern "C" fn fixture_alloc(value: u8) -> *mut u8 { Box::into_raw(Box::new(value)) }
extern "C" fn fixture_free(raw: *mut u8) {
    if raw.is_null() { return; }
    unsafe { drop(Box::from_raw(raw)); }
    RELEASES.fetch_add(1, Ordering::SeqCst);
}

struct OwnedHandle { raw: NonNull<u8> }

impl OwnedHandle {
    fn new(value: u8) -> Self {
        let raw = NonNull::new(fixture_alloc(value)).expect("fixture_alloc returns an owned handle");
        Self { raw }
    }
    fn borrow(&self) -> &u8 { unsafe { self.raw.as_ref() } }
}

impl Drop for OwnedHandle {
    fn drop(&mut self) { /* zwolnij dokładnie raz */ }
}`;

const ownedHandleTests = String.raw`#[test]
fn owned_handle_borrows_and_releases_once() {
    RELEASES.store(0, Ordering::SeqCst);
    {
        let handle = OwnedHandle::new(42);
        assert_eq!(*handle.borrow(), 42);
    }
    assert_eq!(RELEASES.load(Ordering::SeqCst), 1);
}`;

const ownedHandleEquivalent = String.raw`use std::ptr::NonNull;
use std::sync::atomic::{AtomicUsize, Ordering};

static RELEASES: AtomicUsize = AtomicUsize::new(0);
extern "C" fn fixture_alloc(value: u8) -> *mut u8 { Box::into_raw(Box::new(value)) }
extern "C" fn fixture_free(raw: *mut u8) {
    if let Some(raw) = NonNull::new(raw) { unsafe { drop(Box::from_raw(raw.as_ptr())); } RELEASES.fetch_add(1, Ordering::SeqCst); }
}
struct OwnedHandle { raw: NonNull<u8> }
impl OwnedHandle {
    fn new(value: u8) -> Self { Self { raw: NonNull::new(fixture_alloc(value)).expect("fixture_alloc returns an owned handle") } }
    fn borrow(&self) -> &u8 { unsafe { self.raw.as_ref() } }
}
impl Drop for OwnedHandle { fn drop(&mut self) { fixture_free(self.raw.as_ptr()); } }`;

const ownedHandleMutant = String.raw`use std::ptr::NonNull;
use std::sync::atomic::{AtomicUsize, Ordering};

static RELEASES: AtomicUsize = AtomicUsize::new(0);
extern "C" fn fixture_alloc(value: u8) -> *mut u8 { Box::into_raw(Box::new(value)) }
extern "C" fn fixture_free(raw: *mut u8) { if !raw.is_null() { RELEASES.fetch_add(1, Ordering::SeqCst); } }
struct OwnedHandle { raw: NonNull<u8> }
impl OwnedHandle {
    fn new(value: u8) -> Self { Self { raw: NonNull::new(fixture_alloc(value)).expect("fixture_alloc returns an owned handle") } }
    fn borrow(&self) -> &u8 { unsafe { self.raw.as_ref() } }
}
impl Drop for OwnedHandle { fn drop(&mut self) { } }`;

const checkedViewRun = String.raw`/// # Safety
/// For len > 0, raw points to len initialized bytes in one live allocation.
/// Offsets up to len are valid, len <= isize::MAX, and no write aliases the reads.
/// For len == 0, raw may be null; no pointer is dereferenced.
unsafe fn copy_bytes(raw: *const u8, len: usize) -> Option<Vec<u8>> {
    if len > 0 && raw.is_null() { return None; }
    let mut owned = Vec::with_capacity(len);
    for index in 0..len {
        owned.push(unsafe { raw.add(index).read() });
    }
    Some(owned)
}
fn main() {
    let bytes = [7_u8, 8, 9];
    println!("{:?} {:?}", unsafe { copy_bytes(bytes.as_ptr(), 2) }.unwrap(), unsafe { copy_bytes(std::ptr::null(), 0) }.unwrap());
}`;

const splitRegionsRun = String.raw`fn split_regions<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), &'static str> {
    if mid > buffer.len() { return Err("poza zakresem"); }
    Ok(buffer.split_at_mut(mid))
}
fn main() {
    let mut data = [1_u8, 2, 3];
    let (left, right) = split_regions(&mut data, 1).unwrap();
    left[0] = 9;
    println!("{:?} {:?}", left, right);
}`;

const rawRecordRun = String.raw`#[repr(C)]
struct RawRecord { tag: u8, flags: u16, value: i64 }
fn parse_record(raw: RawRecord) -> Result<i64, &'static str> {
    if raw.tag != 0xCA { return Err("tag"); }
    if raw.flags & !0b0011 != 0 { return Err("flags"); }
    Ok(raw.value)
}
fn main() {
    println!("{:?} {:?}", parse_record(RawRecord { tag: 0xCA, flags: 3, value: 8 }), parse_record(RawRecord { tag: 1, flags: 0, value: 8 }));
}`;

const ownedHandleRun = String.raw`use std::ptr::NonNull;
extern "C" fn fixture_alloc(value: u8) -> *mut u8 { Box::into_raw(Box::new(value)) }
extern "C" fn fixture_free(raw: *mut u8) { if !raw.is_null() { unsafe { drop(Box::from_raw(raw)); } } }
struct OwnedHandle { raw: NonNull<u8> }
impl OwnedHandle { fn new(value: u8) -> Self { Self { raw: NonNull::new(fixture_alloc(value)).expect("fixture_alloc returns an owned handle") } } fn borrow(&self) -> &u8 { unsafe { self.raw.as_ref() } } }
impl Drop for OwnedHandle { fn drop(&mut self) { fixture_free(self.raw.as_ptr()); } }
fn main() { let handle = OwnedHandle::new(5); println!("{}", handle.borrow()); }`;

const checkedViewReviewTests = checkedViewTests;
const splitRegionsReviewTests = splitRegionsTests;
const rawRecordReviewTests = rawRecordTests;
const ownedHandleReviewTests = ownedHandleTests;

export const unsafeFfiLessons: Lesson[] = [
  {
    id: "unsafe-ffi-checked-view",
    moduleId,
    conceptIds: ["unsafe-ffi-checked-view-contract"],
    competencyIds: ["unsafe-ffi-raw-contract"],
    prerequisites: [],
    title: "Zamknij surowy adres w sprawdzonym widoku",
    subtitle:
      "Zdefiniujesz null/zero policy i ograniczysz jedyną operację `from_raw_parts` do sprawdzonej gałęzi.",
    minutes: 25,
    outcomes: [
      "Rozróżnisz dozwolony null z długością zero od naruszenia precondition dla dodatniej długości.",
      "Zaimplementujesz `unsafe fn checked_view` z jawnym kontraktem caller safety.",
      "Nie wykonasz dereferencji nieważnego adresu ani nie wywołasz funkcji z niespełnioną precondition.",
    ],
    steps: [
      choice(
        "checked-view-predict",
        "Przewidź politykę pustego widoku",
        "Który wynik najlepiej opisuje kontrakt `checked_view(null, 0)`?",
        [
          "Some(&[])",
          "None, bo każdy null jest błędem",
          "Undefined behavior w każdej implementacji",
        ],
        0,
        [
          "Jawna polityka dopuszcza pusty widok bez dereferencji.",
          "Dodatnia długość z nullem narusza precondition `unsafe fn`; tylko null z zero jest dozwolony.",
          "Sama obecność nulla nie wymusza UB, jeśli `len == 0` i funkcja nie wywołuje `from_raw_parts`.",
        ],
      ),
      run(
        "checked-view-run",
        "Uruchom bezpieczną granicę",
        "Zobacz kopiowanie bajtów z ważnego adresu i pustego null. copy_bytes oddaje własny Vec, więc nie wiąże lifetime wyniku z pamięcią źródłową. W zadaniu głównym checked_view ma oddać pożyczony wycinek bez kopiowania.",
        checkedViewRun,
        "[7, 8] []\n",
      ),
      explain(
        "checked-view-explain",
        "Wyjaśnij precondition",
        "Wyjaśnij, co musi być prawdą przed `from_raw_parts` i czemu długość zero jest osobną gałęzią.",
        [
          "Adres z dodatnią długością musi być ważny, poprawnie wyrównany, obejmować cały zakres, mieć `len <= isize::MAX`, a koniec zakresu nie może zawijać.",
          "Null z dodatnią długością narusza precondition; null z zero jest dozwolony i nie trafia do `from_raw_parts`.",
          "Lifetime widoku musi obejmować użycie danych; funkcja nie wydłuża życia pamięci.",
        ],
      ),
      gate({
        id: "checked-view-gate",
        kind: "modify",
        title: "Napraw `checked_view`",
        prompt:
          "Napraw `unsafe fn checked_view`. Caller safety: dla `len > 0` `raw` musi być niezerowy, poprawnie wyrównany i wskazywać `len` zainicjalizowanych bajtów w jednym żywym alokowanym obiekcie, `len <= isize::MAX`, a koniec zakresu (`raw + len`) nie może zawijać; pamięć musi pozostać ważna i niealiasowana przez życie widoku. Dla `len == 0` null jest dozwolony i zwracasz `Some(&[])` bez dereferencji.",
        code: checkedViewStarter,
        solution: checkedViewSolution,
        tests: checkedViewTests,
        evidenceGate: true,
      }),
      gate({
        id: "checked-view-contract-gate",
        kind: "apply",
        title: "Zachowaj politykę na nowych przypadkach",
        prompt:
          "Zaimplementuj ponownie `unsafe fn checked_view` z dokładnym kontraktem `from_raw_parts`: dla dodatniej długości adres jest ważny i niezerowy, `len <= isize::MAX`, a koniec zakresu (`raw + len`) nie może zawijać; null z zerem daje `Some(&[])`. Test używa wyłącznie ważnych adresów i pustego null view.",
        code: checkedViewStarter,
        solution: checkedViewEquivalent,
        tests: checkedViewTests,
        evidenceGate: true,
      }),
      gate({
        id: "checked-view-blank",
        kind: "blank",
        title: "Blank page: widok z adresu C",
        prompt:
          "Od pustej kartki napisz `unsafe fn checked_view<'a>(raw: *const u8, len: usize) -> Option<&'a [u8]>`. Dla `len > 0` caller musi zapewnić niezerowy, poprawnie wyrównany adres do `len` zainicjalizowanych bajtów w jednym żywym alokowanym obiekcie, `len <= isize::MAX`, koniec zakresu (`raw + len`) bez zawijania, ważność i brak mutowalnego aliasowania przez życie widoku; dla `len == 0` null jest dozwolony, zwróć `Some(&[])` i nie dereferencjonuj adresu. Testy wywołują funkcję tylko ze spełnioną precondition.",
        solution: checkedViewSolution,
        tests: checkedViewTests,
      }),
      gate({
        id: "checked-view-recall",
        kind: "recall",
        title: "Retrieval: precondition surowego widoku",
        prompt:
          "Odtwórz z pamięci `unsafe fn checked_view` i jego precondition: ważny, niezerowy i żywy zakres dla `len > 0`, `len <= isize::MAX`, nieprzepełniający się koniec adresu, a null tylko dla `len == 0`. Test wywołuje funkcję wyłącznie z ważnymi adresami.",
        code: checkedViewStarter,
        solution: checkedViewEquivalent,
        tests: checkedViewReviewTests,
      }),
      checkedPrefixTransfer,
    ],
    misconceptions: [
      "Każdy null musi być dereferencjonowany, aby zwrócić pusty slice.",
      "`from_raw_parts` samo sprawdza ważność adresu i długości.",
      "Lifetime referencji z raw pointera automatycznie przedłuża życie alokacji.",
    ],
    transferTask:
      "Zaprojektuj wrapper dla bufora C, który przyjmuje wskaźnik i długość oraz opisuje, kto spełnia precondition `unsafe fn` i gwarantuje ważność pamięci.",
    evidenceGate:
      "Bramki muszą wyraźnie opisać safety precondition, dopuścić null wyłącznie dla zera i nie mogą wykonywać ani testować dereferencji nieważnego adresu.",
    sourceIds: ["unsafe-ffi-nomicon", "unsafe-ffi-pointer", "unsafe-ffi-slice"],
  },
  {
    id: "unsafe-ffi-split-regions",
    moduleId,
    conceptIds: ["unsafe-ffi-split-regions-contract"],
    competencyIds: ["unsafe-ffi-alias-boundary"],
    prerequisites: ["unsafe-ffi-checked-view"],
    title: "Podziel mutowalny bufor bez aliasowania",
    subtitle:
      "Zamienisz granicę indeksu na dwa rozłączne regiony i zachowasz przypadki zero oraz len.",
    minutes: 25,
    outcomes: [
      "Odrzucisz wyłącznie `mid > len`.",
      "Zwrócisz rozłączne `&mut [u8]` przez `split_at_mut`.",
      "Sprawdzisz, że obie strony mogą być modyfikowane bez nakładania zakresów.",
    ],
    steps: [
      choice(
        "split-regions-predict",
        "Przewidź granicę",
        "Czy `split_regions(&mut [], 0)` jest poprawnym wywołaniem?",
        [
          "Tak, zwraca dwa puste regiony",
          "Nie, pusty slice nie ma granicy",
          "Tylko z unsafe",
        ],
        0,
        [
          "Granica zero jest równa długości pustego bufora i daje dwa rozłączne puste wycinki.",
          "`mid == len` jest poprawne także dla pustego wejścia.",
          "`split_at_mut` oferuje bezpieczny API bez ręcznego unsafe.",
        ],
      ),
      run(
        "split-regions-run",
        "Uruchom podział",
        "Zmodyfikuj lewą stronę i zobacz, że prawa zachowuje własny region.",
        splitRegionsRun,
        "[9] [2, 3]\n",
      ),
      explain(
        "split-regions-explain",
        "Wyjaśnij rozłączne pożyczki",
        "Wyjaśnij, jak warunek granicy i `split_at_mut` wspólnie chronią przed aliasowaniem.",
        [
          "`mid > len` jest jedynym błędem zakresu; równość daje pustą prawą stronę.",
          "`split_at_mut` dowodzi rozłączności elementów i zwraca dwa `&mut` z jednego borrow.",
          "Dwa regiony nie dają prawa do dotykania tego samego elementu przez oba wycinki.",
        ],
      ),
      gate({
        id: "split-regions-gate",
        kind: "modify",
        title: "Napraw `split_regions`",
        prompt:
          "Napraw błąd granicy: `mid == len` ma przejść, a tylko `mid > len` ma zwrócić `Err(SplitError::OutOfBounds)`.",
        code: splitRegionsStarter,
        solution: splitRegionsSolution,
        tests: splitRegionsTests,
        evidenceGate: true,
      }),
      gate({
        id: "split-regions-alias-gate",
        kind: "apply",
        title: "Zachowaj rozłączność regionów",
        prompt:
          "Zaimplementuj kontrakt `split_regions` tak, by puste strony, równość granicy i niezależne mutacje były poprawne.",
        code: splitRegionsStarter,
        solution: splitRegionsEquivalent,
        tests: splitRegionsTests,
        evidenceGate: true,
      }),
      gate({
        id: "split-regions-blank",
        kind: "blank",
        title: "Blank page: dwa regiony",
        prompt:
          "Napisz `SplitError` i `split_regions(&mut [u8], mid) -> Result<(&mut [u8], &mut [u8]), SplitError>`. Nie twórz nakładających się pożyczek.",
        solution: splitRegionsSolution,
        tests: splitRegionsTests,
      }),
      gate({
        id: "split-regions-recall",
        kind: "recall",
        title: "Retrieval: bezpieczny podział",
        prompt:
          "Odtwórz `split_regions` z pamięci, w tym przypadek `mid == len` i błąd dla granicy poza buforem.",
        code: splitRegionsStarter,
        solution: splitRegionsEquivalent,
        tests: splitRegionsReviewTests,
      }),
      splitEnvelopeTransfer,
    ],
    misconceptions: [
      "`mid == len` jest zawsze błędem, bo prawa strona musi mieć element.",
      "Dwa `&mut` mogą bezpiecznie wskazywać ten sam element, jeśli są z jednego slice.",
      "Do rozdzielenia bufora trzeba pisać własne `from_raw_parts_mut`.",
    ],
    transferTask:
      "Przenieś kontrakt na ramkę protokołu: oddziel nagłówek od payloadu i określ, co dzieje się dla pustego payloadu.",
    evidenceGate:
      "Bramki sprawdzają równość granicy, out-of-bounds oraz niezależne mutacje rozłącznych regionów.",
    sourceIds: ["unsafe-ffi-slice", "unsafe-ffi-nomicon"],
  },
  {
    id: "unsafe-ffi-raw-record",
    moduleId,
    conceptIds: ["unsafe-ffi-repr-c-record-contract"],
    competencyIds: ["unsafe-ffi-layout-validation"],
    prerequisites: ["unsafe-ffi-split-regions"],
    title: "Zwaliduj rekord `#[repr(C)]`",
    subtitle:
      "Oddziel układ pamięci od semantyki protokołu, sprawdzając tag i zarezerwowane bity flag.",
    minutes: 25,
    outcomes: [
      "Rozpoznasz, co gwarantuje `#[repr(C)]`, a czego nie gwarantuje.",
      "Odrzucisz nieznany tag i nieznane bity flag.",
      "Zwrócisz bezpieczny `Record` dopiero po pełnej walidacji.",
    ],
    steps: [
      choice(
        "raw-record-predict",
        "Przewidź rolę `repr(C)`",
        "Co wynika bezpośrednio z `#[repr(C)]` dla `RawRecord`?",
        [
          "Stabilny układ pól, nie poprawność wartości",
          "Że wszystkie tagi są obsługiwane",
          "Że flagi nie wymagają walidacji",
        ],
        0,
        [
          "`repr(C)` określa layout względem C, ale nie semantyczną poprawność danych.",
          "Obsługiwane tagi pozostają kontraktem parsera.",
          "Flag validation jest niezależnym krokiem dekodowania.",
        ],
      ),
      run(
        "raw-record-run",
        "Uruchom dekoder",
        "Porównaj poprawny rekord i rekord z nieznanym tagiem.",
        rawRecordRun,
        'Ok(8) Err("tag")\n',
      ),
      explain(
        "raw-record-explain",
        "Wyjaśnij layout i walidację",
        "Wyjaśnij, dlaczego `repr(C)` oraz sprawdzenie tagu/flag są osobnymi dowodami.",
        [
          "`repr(C)` stabilizuje układ pól na granicy, lecz nie potwierdza znaczenia wartości.",
          "Tag musi być znany, a bity spoza dozwolonej maski muszą dać `InvalidFlags`.",
          "Dopiero poprawny rekord można zamienić na bezpieczny typ domenowy.",
        ],
      ),
      gate({
        id: "raw-record-gate",
        kind: "modify",
        title: "Napraw walidację rekordu",
        prompt:
          "Uzupełnij `parse_record`. Zachowaj dokładny kontrakt `#[repr(C)] struct RawRecord { tag: u8, flags: u16, value: i64 }`; akceptuj tag `0xCA` i wyłącznie flagi z maski `0b0011`, zwracając osobny błąd dla tagu i flag.",
        code: rawRecordStarter,
        solution: rawRecordSolution,
        tests: rawRecordTests,
        evidenceGate: true,
      }),
      gate({
        id: "raw-record-flags-gate",
        kind: "apply",
        title: "Odrzuć zarezerwowane bity",
        prompt:
          "Zachowaj `RawRecord` jako `#[repr(C)]` i nie normalizuj flag przez maskowanie; nieznany bit ma zakończyć dekodowanie błędem.",
        code: rawRecordStarter,
        solution: rawRecordEquivalent,
        tests: rawRecordTests,
        evidenceGate: true,
      }),
      gate({
        id: "raw-record-blank",
        kind: "blank",
        title: "Blank page: dekoder C ABI",
        prompt:
          "Od pustej kartki napisz dokładnie `#[repr(C)] #[derive(Debug, Clone, Copy, PartialEq, Eq)] struct RawRecord { tag: u8, flags: u16, value: i64 }`, `#[derive(Debug, PartialEq, Eq)] struct Record { value: i64, flags: u16 }`, `#[derive(Debug, PartialEq, Eq)] enum DecodeError { InvalidTag, InvalidFlags }` oraz `fn parse_record(raw: RawRecord) -> Result<Record, DecodeError>`, która akceptuje tag `0xCA` i tylko flagi z maski `0b0011`. Dodaj wykonywalny test `size_of == 16`, `align_of == 8`, offsetów `tag == 0`, `flags == 2`, `value == 8`, aby usunięcie `repr(C)` nie mogło przejść.",
        solution: rawRecordSolution,
        tests: rawRecordTests,
      }),
      gate({
        id: "raw-record-recall",
        kind: "recall",
        title: "Retrieval: semantyka flag",
        prompt:
          "Odtwórz `parse_record` z pamięci i pokaż w teście, że nieznany bit flag nie zostaje po cichu usunięty.",
        code: rawRecordStarter,
        solution: rawRecordEquivalent,
        tests: rawRecordReviewTests,
      }),
      rawHeaderTransfer,
    ],
    misconceptions: [
      "`repr(C)` automatycznie waliduje wartości tagu i flag.",
      "Nieznane bity można zamaskować, bo zachowują layout.",
      "Bezpieczny typ domenowy może powstać przed sprawdzeniem wersji rekordu.",
    ],
    transferTask:
      "Zaprojektuj dekoder wersjonowanego nagłówka C z odrzuconymi polami zarezerwowanymi i osobnym błędem kompatybilności.",
    evidenceGate:
      "Bramki wymagają poprawnego `repr(C)`, rozróżnienia `InvalidTag`/`InvalidFlags` i odrzucenia wszystkich nieznanych bitów.",
    sourceIds: ["unsafe-ffi-repr-c", "unsafe-ffi-nomicon"],
  },
  {
    id: "unsafe-ffi-owned-handle",
    moduleId,
    conceptIds: ["unsafe-ffi-owned-handle-contract"],
    competencyIds: ["unsafe-ffi-raii-ownership"],
    prerequisites: ["unsafe-ffi-raw-record"],
    title: "Zamknij uchwyt FFI przez RAII",
    subtitle:
      "Zbudujesz deterministyczny fixture ABI, pożyczkę `borrow()` i pojedyncze zwolnienie w `Drop`.",
    minutes: 25,
    outcomes: [
      "Zamkniesz własność alokacji wewnątrz konstruktora uchwytu.",
      "Zwrócisz pożyczoną wartość przez `borrow()` bez przejęcia własności.",
      "Sprawdzisz atomowym licznikiem dokładnie jedno wywołanie zwalniacza.",
    ],
    steps: [
      choice(
        "owned-handle-predict",
        "Przewidź właściciela zasobu",
        "Kto powinien wywołać `fixture_free`, gdy `OwnedHandle` wychodzi z zakresu?",
        [
          "Implementacja `Drop` uchwytu",
          "Każdy caller po `borrow()`",
          "Fixture przy każdym odczycie",
        ],
        0,
        [
          "RAII centralizuje zwolnienie w destruktorze właściciela.",
          "Borrow nie przenosi własności i nie powinien zwalniać zasobu.",
          "Odczyt nie jest operacją zwalniającą.",
        ],
      ),
      run(
        "owned-handle-run",
        "Uruchom deterministyczny fixture ABI",
        "Utwórz ważny uchwyt, odczytaj wartość i pozwól RAII zakończyć zakres.",
        ownedHandleRun,
        "5\n",
      ),
      explain(
        "owned-handle-explain",
        "Wyjaśnij RAII i borrow",
        "Wyjaśnij, dlaczego `borrow()` nie może przejąć zasobu i skąd wiadomo, że `Drop` wywołuje fixture raz.",
        [
          "`OwnedHandle` przechowuje pojedynczy ważny uchwyt i nie jest `Copy`.",
          "`borrow()` daje referencję ograniczoną życiem uchwytu, bez free.",
          "`Drop` wywołuje fixture zwalniający raz; licznik atomowy daje deterministyczny dowód.",
        ],
      ),
      gate({
        id: "owned-handle-gate",
        kind: "modify",
        title: "Napraw `Drop` uchwytu",
        prompt:
          "Uzupełnij `Drop`, aby uchwyt utworzony przez wewnętrznie alokujący `OwnedHandle::new(value: u8)` został zwolniony dokładnie raz. Konstruktor sam wywołuje zaufane `fixture_alloc`; caller nie przekazuje surowego adresu.",
        code: ownedHandleStarter,
        solution: ownedHandleSolution,
        tests: ownedHandleTests,
        evidenceGate: true,
      }),
      gate({
        id: "owned-handle-borrow-gate",
        kind: "apply",
        title: "Zachowaj pożyczkę i własność",
        prompt:
          "Zaimplementuj RAII wrapper, w którym `new(value: u8)` wewnętrznie przejmuje wynik zaufanego `fixture_alloc`, `borrow()` tylko obserwuje wartość, a `Drop` przekazuje uchwyt do deterministycznego `fixture_free`.",
        code: ownedHandleStarter,
        solution: ownedHandleEquivalent,
        tests: ownedHandleTests,
        evidenceGate: true,
      }),
      gate({
        id: "owned-handle-blank",
        kind: "blank",
        title: "Blank page: właściciel uchwytu",
        prompt:
          'Od pustej kartki napisz `OwnedHandle::new(value: u8) -> OwnedHandle`, `borrow() -> &u8` i `Drop`. Zaufany fixture ABI jest częścią zadania: `static RELEASES: AtomicUsize`, `Ordering::SeqCst`, `extern "C" fn fixture_alloc(value: u8) -> *mut u8` zawsze zwracający nową własność oraz `extern "C" fn fixture_free(raw: *mut u8)` zwalniający ją i zwiększający `RELEASES`. Konstruktor ma wywołać `fixture_alloc` wewnętrznie, więc caller nie przekazuje ani nie zwalnia raw pointera.',
        solution: ownedHandleSolution,
        tests: ownedHandleTests,
      }),
      gate({
        id: "owned-handle-recall",
        kind: "recall",
        title: "Retrieval: dokładnie jeden release",
        prompt:
          "Odtwórz RAII uchwytu z pamięci. `new` alokuje przez zaufany `fixture_alloc`, `borrow` nie przejmuje własności, a jeden test serialnie sprawdza pożyczkę i pojedyncze wywołanie `fixture_free` przez `RELEASES`.",
        code: ownedHandleStarter,
        solution: ownedHandleEquivalent,
        tests: ownedHandleReviewTests,
      }),
      ownedPairTransfer,
    ],
    misconceptions: [
      "`borrow()` powinno zwolnić zasób, bo zna jego adres.",
      "Bezpieczny caller może przekazać dowolny raw pointer do konstruktora, jeśli Drop będzie ostrożny.",
      "Dwa ręczne wywołania free są bezpieczne, jeśli wartość nie jest już potrzebna.",
    ],
    transferTask:
      "Zaprojektuj wrapper na uchwyt C, którego konstruktor sam alokuje własność, fixture ma licznik release, a Drop ma jasno opisany kontrakt zwolnienia.",
    evidenceGate:
      "Bramki muszą wykazać wewnętrzną alokację, obserwowalny borrow i pojedynczy release w deterministycznym fixture ABI.",
    sourceIds: ["unsafe-ffi-nomicon", "unsafe-ffi-pointer"],
  },
];

linkSplitRegionSolutions(unsafeFfiLessons.find(lesson => lesson.id === "unsafe-ffi-split-regions")!);

export const unsafeFfiReviewExercises: Record<string, LessonStep> = {
  "unsafe-ffi-checked-view-contract": gate({
    id: "review-unsafe-ffi-checked-view",
    kind: "apply",
    title: "Powtórka: null/zero policy",
    prompt:
      "Uzupełnij `unsafe fn checked_view` z precondition `len <= isize::MAX` i nieprzepełniającym się końcem zakresu; test valid bytes oraz null/zero ma odrzucić mutanta, który nie dopuszcza pustego null view.",
    code: checkedViewStarter,
    solution: checkedViewEquivalent,
    tests: checkedViewTests,
  }),
  "unsafe-ffi-split-regions-contract": gate({
    id: "review-unsafe-ffi-split-regions",
    kind: "apply",
    title: "Powtórka: rozłączne regiony",
    prompt:
      "Odtwórz `split_regions` z poprawnym `mid == len` i rozłącznymi pożyczkami.",
    code: splitRegionsStarter,
    solution: splitRegionsEquivalent,
    tests: splitRegionsTests,
  }),
  "unsafe-ffi-repr-c-record-contract": gate({
    id: "review-unsafe-ffi-raw-record",
    kind: "apply",
    title: "Powtórka: rekord C",
    prompt:
      "Zaimplementuj `parse_record` i odrzuć nieznany tag oraz każdy zarezerwowany bit flag.",
    code: rawRecordStarter,
    solution: rawRecordEquivalent,
    tests: rawRecordTests,
  }),
  "unsafe-ffi-owned-handle-contract": gate({
    id: "review-unsafe-ffi-owned-handle",
    kind: "apply",
    title: "Powtórka: RAII uchwytu",
    prompt:
      "Zaimplementuj wewnętrznie alokujący `OwnedHandle` z borrow i Drop, zachowując dokładnie jeden release.",
    code: ownedHandleStarter,
    solution: ownedHandleEquivalent,
    tests: ownedHandleTests,
  }),
};

export const unsafeFfiModule: CourseModule = {
  id: moduleId,
  title: "Unsafe i FFI: kontrakty raw pointerów oraz RAII",
  whyItMatters:
    "Granica FFI łączy layout, surowe adresy i obcą własność. Zbudujesz małe bezpieczne wrappery, które jawnie walidują null, zakres, tagi i release zamiast przenosić założenia do niezdefiniowanego zachowania.",
  capabilities: unsafeFfiCompetencies.map((item) => item.title),
  prerequisites: ["performance-evidence"],
  lessonIds: unsafeFfiLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zamkniesz surowy adres w `checked_view` z jawną polityką null/zero i bez invalid dereference.",
    "Podzielisz bufor na rozłączne regiony, zwalidujesz `#[repr(C)] RawRecord` i odrzucisz nieznane flagi.",
    "Zaimplementujesz `OwnedHandle` z `borrow()` oraz deterministycznym, pojedynczym `Drop` przez fixture ABI.",
  ],
  projectConnection:
    "Kontrakty przeniesiesz do modułu ram protokołu: wejście C zostaje sprawdzone na granicy, rekord jest dekodowany dopiero po walidacji, a zasób zewnętrzny ma jednego właściciela i testowalny release.",
  assessmentId: "unsafe-ffi-owned-handle/owned-handle-blank",
  gateCriteria: [
    {
      id: "unsafe-ffi-checked-view-gate",
      label: "Widok z raw pointera jawnie obsługuje null, zero i valid bytes.",
      taskRefs: [
        { lessonId: "unsafe-ffi-checked-view", stepId: "checked-view-gate" },
        { lessonId: "unsafe-ffi-checked-view", stepId: "checked-view-blank" },
        {
          lessonId: "unsafe-ffi-checked-view",
          stepId: "checked-view-prefix-transfer",
        },
      ],
    },
    {
      id: "unsafe-ffi-split-regions-gate",
      label: "Podział bufora zachowuje równość granicy i rozłączne mutacje.",
      taskRefs: [
        { lessonId: "unsafe-ffi-split-regions", stepId: "split-regions-gate" },
        { lessonId: "unsafe-ffi-split-regions", stepId: "split-regions-blank" },
        {
          lessonId: "unsafe-ffi-split-regions",
          stepId: "split-envelope-transfer",
        },
      ],
    },
    {
      id: "unsafe-ffi-raw-record-gate",
      label: "Dekoder `repr(C)` odrzuca nieznany tag i zarezerwowane flagi.",
      taskRefs: [
        { lessonId: "unsafe-ffi-raw-record", stepId: "raw-record-gate" },
        { lessonId: "unsafe-ffi-raw-record", stepId: "raw-record-blank" },
        { lessonId: "unsafe-ffi-raw-record", stepId: "raw-header-transfer" },
      ],
    },
    {
      id: "unsafe-ffi-owned-handle-gate",
      label:
        "RAII wrapper pożycza wartości i wykonuje dokładnie jeden release każdego posiadanego zasobu.",
      taskRefs: [
        { lessonId: "unsafe-ffi-owned-handle", stepId: "owned-handle-gate" },
        { lessonId: "unsafe-ffi-owned-handle", stepId: "owned-handle-blank" },
        { lessonId: "unsafe-ffi-owned-handle", stepId: "owned-pair-transfer" },
      ],
    },
  ],
};

export const unsafeFfiAssessmentSources = {
  checkedPrefix: {
    canonical: checkedPrefixTransfer.solution!,
    equivalent: String.raw`/// # Safety
/// raw covers available initialized bytes in one live allocation for the returned lifetime;
/// it is non-null for available > 0, aligned, has a non-wrapping end and available <= isize::MAX.
/// No mutable access aliases the returned view; null is permitted when available == 0.
unsafe fn checked_prefix<'a>(raw: *const u8, available: usize, requested: usize) -> Option<&'a [u8]> {
    match requested.cmp(&available) {
        std::cmp::Ordering::Greater => None,
        _ if requested == 0 => Some(&[]),
        _ if raw.is_null() => None,
        _ => Some(unsafe { std::slice::from_raw_parts(raw, requested) }),
    }
}`,
    mutant: checkedPrefixTransfer.solution!.replace(
      "if requested == 0 { return Some(&[]); }",
      "if requested == 0 { return None; }",
    ),
  },
  splitEnvelope: {
    canonical: splitEnvelopeTransfer.solution!,
    equivalent: String.raw`#[derive(Debug, PartialEq, Eq)]
enum RegionsError { Outside }

fn split_envelope(buffer: &mut [u8], header: usize, trailer: usize) -> Result<(&mut [u8], &mut [u8], &mut [u8]), RegionsError> {
    let length = buffer.len();
    match header.checked_add(trailer) {
        Some(total) if total <= length => {},
        _ => return Err(RegionsError::Outside),
    }
    let (prefix, tail) = buffer.split_at_mut(length - trailer);
    let (head, body) = prefix.split_at_mut(header);
    Ok((head, body, tail))
}`,
    mutant: splitEnvelopeTransfer.solution!.replace(
      "if edges > buffer.len()",
      "if edges >= buffer.len()",
    ),
  },
  rawHeader: {
    canonical: rawHeaderTransfer.solution!,
    equivalent: String.raw`#[repr(C)]
struct RawHeader { version: u8, flags: u16, length: u32 }
#[derive(Debug, PartialEq, Eq)]
struct Header { urgent: bool, encrypted: bool, payload_len: u32 }
#[derive(Debug, PartialEq, Eq)]
enum HeaderError { Version(u8), Flags(u16) }

fn decode_header(raw: RawHeader) -> Result<Header, HeaderError> {
    match raw.version {
        3 => {},
        other => return Err(HeaderError::Version(other)),
    }
    let (urgent, encrypted) = match raw.flags {
        0 => (false, false),
        1 => (true, false),
        4 => (false, true),
        5 => (true, true),
        other => return Err(HeaderError::Flags(other)),
    };
    Ok(Header { urgent, encrypted, payload_len: raw.length })
}`,
    mutant: rawHeaderTransfer.solution!.replace(
      "if raw.flags & !0b0101 != 0",
      "if raw.flags & !0b1111 != 0",
    ),
  },
  ownedPair: {
    canonical: ownedPairTransfer.solution!,
    equivalent: `${ownedPairFixture}

struct OwnedPair([NonNull<u16>; 2]);

impl OwnedPair {
    fn new(first: u16, second: u16) -> Self {
        let handles = [unsafe { fixture_pair_alloc(first) }, unsafe { fixture_pair_alloc(second) }];
        Self(handles.map(|raw| NonNull::new(raw).expect("trusted allocation")))
    }
    fn borrow(&self) -> (&u16, &u16) {
        let [first, second] = &self.0;
        unsafe { (first.as_ref(), second.as_ref()) }
    }
}

impl Drop for OwnedPair {
    fn drop(&mut self) {
        for handle in self.0 {
            unsafe { fixture_pair_release(handle.as_ptr()); }
        }
    }
}`,
    // A finite omitted release is the only negative ownership behavior executed here.
    mutant: ownedPairTransfer.solution!.replace(
      "fixture_pair_release(self.second.as_ptr());",
      "// Intentionally omit the second release; never double-free either pointer.",
    ),
  },
  checkedView: {
    canonical: checkedViewSolution,
    equivalent: checkedViewEquivalent,
    mutant: checkedViewMutant,
  },
  splitRegions: {
    canonical: splitRegionsSolution,
    equivalent: splitRegionsEquivalent,
    mutant: splitRegionsMutant,
  },
  rawRecord: {
    canonical: rawRecordSolution,
    equivalent: rawRecordEquivalent,
    mutant: rawRecordMutant,
  },
  ownedHandle: {
    canonical: ownedHandleSolution,
    equivalent: ownedHandleEquivalent,
    mutant: ownedHandleMutant,
  },
};
