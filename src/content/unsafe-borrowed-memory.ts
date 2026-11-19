import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";
import {
  autoTraitsCanonical,
  autoTraitsEquivalent,
  autoTraitsRecallMutant,
  autoTraitsRecallTests,
  autoTraitsMutant,
  autoTraitsTests,
  autoTraitsSoundnessCanonical,
  autoTraitsSoundnessEquivalent,
  autoTraitsSoundnessTests,
  cellMarkerBlankMutant,
  cellMarkerBlankTests,
  traitViewReviewMutant,
  traitViewReviewTests,
  borrowedTextReviewCanonical,
  borrowedTextReviewEquivalent,
  borrowedWindowBlankCanonical,
  borrowedWindowBlankEquivalent,
  borrowedWindowBlankMutant,
  borrowedWindowBlankTests,
  borrowedBytesCanonical,
  borrowedBytesEquivalent,
  borrowedBytesMutant,
  borrowedBytesTests,
  borrowedBytesSoundnessCanonical,
  borrowedBytesSoundnessEquivalent,
  borrowedBytesSoundnessMutant,
  borrowedBytesSoundnessTests,
  borrowedTextReviewMutant,
  borrowedTextReviewTests,
  cellMarkerBlankCanonical,
  cellMarkerBlankEquivalent,
  invariantBorrowCanonical,
  invariantBorrowEquivalent,
  invariantBorrowMutant,
  invariantBorrowSoundnessMutant,
  invariantBorrowTests,
  invariantVarianceMutant,
  byteSpanTransferCanonical,
  byteSpanTransferMutant,
  byteSpanTransferTests,
  pairLoanTransferCanonical,
  pairLoanTransferMutant,
  pairLoanTransferTests,
  replaceSlotTransferCanonical,
  replaceSlotTransferMutant,
  replaceSlotTransferTests,
  sharedLeaseTransferCanonical,
  sharedLeaseTransferMutant,
  sharedLeaseTransferTests,
  safeSlotCanonical,
  safeSlotEquivalent,
  safeSlotMutant,
  safeSlotTests,
  safeSlotSoundnessCanonical,
  safeSlotSoundnessEquivalent,
  safeSlotSoundnessMutant,
  safeSlotSoundnessTests,
  initCellBlankCanonical,
  initCellBlankEquivalent,
  initCellBlankMutant,
  initCellBlankTests,
  leaseSlotReviewCanonical,
  leaseSlotReviewEquivalent,
  leaseSlotReviewMutant,
  leaseSlotReviewTests,
  markerSplitReviewCanonical,
  markerSplitReviewEquivalent,
  markerSplitReviewMutant,
  markerSplitReviewTests,
  partitionWindowBlankCanonical,
  partitionWindowBlankEquivalent,
  partitionWindowBlankMutant,
  partitionWindowBlankTests,
  splitBorrowedCanonical,
  splitBorrowedEquivalent,
  splitBorrowedMutant,
  splitBorrowedTests,
  traitViewReviewCanonical,
  traitViewReviewEquivalent,
} from "./unsafe-borrowed-memory-contracts";

const reviewedAt = "2026-09-21";
const moduleId = "unsafe-borrowed-memory-soundness";

export const unsafeBorrowedMemorySources: Source[] = [
  {
    id: "unsafe-borrowed-memory-slice",
    title: "Rust standard library: slice::from_raw_parts",
    url: "https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Recheck raw slice preconditions and empty-range policy when the contract changes.",
  },
  {
    id: "unsafe-borrowed-memory-maybe-uninit",
    title: "Rust standard library: MaybeUninit",
    url: "https://doc.rust-lang.org/std/mem/union.MaybeUninit.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Recheck initialization and drop rules when the slot fixture changes.",
  },
  {
    id: "unsafe-borrowed-memory-variance",
    title: "The Rustonomicon: Subtyping and variance",
    url: "https://doc.rust-lang.org/nomicon/subtyping.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Recheck variance examples and mutable-reference invariance.",
  },
  {
    id: "unsafe-borrowed-memory-send-sync",
    title: "The Rustonomicon: Send and Sync",
    url: "https://doc.rust-lang.org/nomicon/send-and-sync.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Recheck auto-trait derivation and negative clients.",
  },
];

export const unsafeBorrowedMemoryCompetencies: Competency[] = [
  {
    id: "unsafe-borrowed-memory-provenance",
    title: "Łączysz bezpieczny lifetime właściciela z warunkami raw boundary.",
  },
  {
    id: "unsafe-borrowed-memory-reborrow",
    title:
      "Rozdzielasz mutowalne regiony i skracasz wyłącznie zewnętrzną pożyczkę.",
  },
  {
    id: "unsafe-borrowed-memory-init",
    title:
      "Utrzymujesz stan inicjalizacji i dokładne przekazanie własności wartości.",
  },
  {
    id: "unsafe-borrowed-memory-auto-traits",
    title:
      "Sprawdzasz niezmienniczość oraz dziedziczenie Send i Sync bez ręcznego unsafe impl.",
  },
];

export const unsafeBorrowedMemoryConcepts: Concept[] = [
  {
    id: "unsafe-borrowed-provenance-contract",
    title: "Widok jest związany z żywym właścicielem",
    prerequisites: ["unsafe-miri-byte-view-contract"],
    competencyIds: ["unsafe-borrowed-memory-provenance"],
    reviewPrompt:
      "Dlaczego bezpieczne `from_slice` musi przyjąć właściciela, a raw constructor ma caller obligations?",
    reviewAnswer:
      "Safe constructor wiąże wynik z lifetime referencji właściciela. Raw boundary nie może sprawdzić życia alokacji, więc caller musi zapewnić jedną żywą, zainicjalizowaną i niealiasującą alokację przez całe `'a`.",
    distinguish: "Lifetime nie przedłuża storage; opisuje relację użycia.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-borrowed-reborrow-contract",
    title: "Reborrow skraca dostęp bez overlap",
    prerequisites: ["unsafe-borrowed-provenance-contract"],
    competencyIds: ["unsafe-borrowed-memory-reborrow"],
    reviewPrompt: "Jak odróżnić granicę split od skrócenia outer loan?",
    reviewAnswer:
      "Najpierw odrzuca się `mid > len`, a potem split tworzy rozłączne slice'y. Reborrow pożycza wrapper krótko, nie zmienia wewnętrznego typu T.",
    distinguish:
      "Zewnętrzny loan może być krótszy, ale `&mut T` pozostaje niezmiennicze w T.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-borrowed-slot-contract",
    title: "Stan slotu kontroluje inicjalizację",
    prerequisites: ["unsafe-borrowed-reborrow-contract"],
    competencyIds: ["unsafe-borrowed-memory-init"],
    reviewPrompt: "Kiedy slot może przenieść lub dropować T?",
    reviewAnswer:
      "Tylko po przejściu do stanu Full; take zmienia stan przed odczytem, a drop dotyka wartości najwyżej raz.",
    distinguish: "Adres MaybeUninit nie dowodzi inicjalizacji.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "unsafe-borrowed-auto-traits-contract",
    title: "Marker zachowuje auto-traits i inwariantność",
    prerequisites: ["unsafe-borrowed-slot-contract"],
    competencyIds: ["unsafe-borrowed-memory-auto-traits"],
    reviewPrompt: "Dlaczego Cell i Rc są potrzebne jako negatywne klienty?",
    reviewAnswer:
      "Pokazują, że wrapper nie może dopisać Send/Sync blanket impl; `Cell` jest Send, lecz nie Sync, a Rc nie jest ani Send, ani Sync.",
    distinguish: "PhantomData output-only może ukryć zależność od T.",
    evidenceArtifact: "rust-code",
  },
];

function predict(
  id: string,
  title: string,
  prompt: string,
  choices: [string, string, string],
  correct: "0" | "1" | "2",
  explanations: Record<string, string>,
): LessonStep {
  return {
    id,
    kind: "predict",
    title,
    prompt,
    choices: choices.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct,
      explanations,
    },
    evidenceKind: "prediction",
  };
}
function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected = "bytes=3\n",
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
function explain(id: string, title: string, prompt: string): LessonStep {
  return {
    id,
    kind: "explain",
    title,
    prompt,
    rubric: [
      "Wymienia caller precondition.",
      "Rozróżnia lifetime od inicjalizacji.",
      "Wskazuje obserwowalną granicę.",
    ],
    evaluator: {
      kind: "rubric",
      criteria: ["precondition", "lifetime", "boundary"],
    },
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
      "Zapisz niezmiennik przed implementacją.",
      "Sprawdź pustkę, obie krawędzie i nazwany mutant.",
    ],
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "recall"
          ? "recall"
          : "transfer",
    evidenceGate: options.gate ?? false,
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
  };
}
function compileFail(id: string, prompt: string, code: string): LessonStep {
  return {
    id,
    kind: "observe",
    title: "Compile-fail klienta",
    prompt,
    code,
    evaluator: { kind: "expected-error", code: "E0515" },
    expectedStatus: "compile-error",
    expectedError: "E0515",
    evidenceKind: "exposure",
  };
}

const simpleRun = String.raw`fn main(){let owner=[1_u8,2,3];let view=&owner[..];assert_eq!(view.len(),3);println!("bytes={}",view.len());}`;
const partitionRun = String.raw`fn main(){let mut input=[1_u8,2,3];let (left,right)=input.split_at_mut(1);assert_eq!(left.len(),1);assert_eq!(right.len(),2);println!("parts=1+2");}`;
const slotRun = String.raw`fn main(){let mut state=None;state=Some("live");assert!(state.is_some());println!("state=full");}`;
const autoTraitRun = String.raw`fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}fn main(){assert_send::<u8>();assert_sync::<u8>();println!("bounds=send-sync");}`;
const lifetimeClient = `fn escape<'a>() -> &'a [u8] {
    let value = 7_u8;
    std::slice::from_ref(&value)
}

fn main() { let _view = escape(); }`;

export const unsafeBorrowedMemoryLessons: Lesson[] = [
  {
    id: "unsafe-borrowed-provenance",
    moduleId,
    conceptIds: ["unsafe-borrowed-provenance-contract"],
    competencyIds: ["unsafe-borrowed-memory-provenance"],
    prerequisites: ["unsafe-miri-mut-slot"],
    title: "Pożyczony widok z właścicielem",
    subtitle:
      "Zwiąż bezpieczny konstruktor z życiem danych i oddziel raw boundary.",
    minutes: 30,
    outcomes: [
      "Zaimplementujesz BorrowedBytes bez wydłużania lifetime.",
      "Wymienisz caller obligations raw boundary.",
      "Odróżnisz pusty widok od dereferencji null.",
    ],
    steps: [
      predict(
        "unsafe-borrowed-provenance-predict",
        "Przewidź lifetime",
        "Czy `from_slice` może samodzielnie wydłużyć lifetime właściciela?",
        ["Tak", "Nie", "Tylko po skopiowaniu danych"],
        "1",
        {
          "0": "Lifetime nie jest tworzony przez konstruktor; pochodzi z referencji właściciela.",
          "1": "Nie; `from_slice` może jedynie związać widok z istniejącym lifetime właściciela.",
          "2": "Skopiowanie danych tworzy nową własność, ale nie sprawia, że konstruktor wydłuża lifetime istniejącego właściciela.",
        },
      ),
      run(
        "unsafe-borrowed-provenance-run",
        "Uruchom widok",
        "Wypisz wynik bez raw code.",
        simpleRun,
      ),
      explain(
        "unsafe-borrowed-provenance-explain",
        "Wyjaśnij właściciela",
        "Wyjaśnij, czemu `from_slice` przyjmuje `&'owner [u8]`.",
      ),
      coding({
        id: "unsafe-borrowed-provenance-boundary-gate",
        kind: "modify",
        title: "Zbuduj BorrowedBytes",
        prompt:
          "Zaimplementuj `BorrowedBytes<'owner>` z polem `bytes: &'owner [u8]`, `from_slice(owner: &'owner [u8]) -> Self`, `reborrow<'short>(&'short self) -> BorrowedBytes<'short>` i `as_slice`. Nie dodawaj raw pointera.",
        code: borrowedBytesMutant,
        solution: borrowedBytesCanonical,
        tests: borrowedBytesTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-provenance-soundness-gate",
        kind: "apply",
        title: "Sprawdź caller obligations",
        prompt:
          "Zaimplementuj `OwnedSlice<'owner>` z `attach(data: &'owner [u8])`, `shorten<'short>(&'short self) -> OwnedSlice<'short>` i `bytes(&self) -> &[u8]`. Test ma potwierdzić, że skrócenie zachowuje te same bajty właściciela oraz że długość wielobajtowego tekstu jest liczona w bajtach.",
        code: borrowedBytesSoundnessMutant,
        solution: borrowedBytesSoundnessCanonical,
        tests: borrowedBytesSoundnessTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-provenance-blank",
        kind: "blank",
        title: "Od pustej kartki: BorrowedWindow",
        prompt:
          "Od pustej kartki napisz `BorrowedWindow<'owner>` z `new(owner: &'owner [u8])`, `tail(&self) -> &[u8]` i `bytes(&self) -> &[u8]`. Safe blank nie wymaga raw pointera; zachowaj długość w bajtach i pusty tail dla pustego właściciela.",
        solution: borrowedWindowBlankCanonical,
        tests: borrowedWindowBlankTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-provenance-recall",
        kind: "recall",
        title: "Powtórka: lifetime właściciela",
        prompt: "Odtwórz safe BorrowedBytes z innym układem ciała.",
        code: borrowedBytesMutant,
        solution: borrowedBytesEquivalent,
        tests: borrowedBytesTests,
      }),
      coding({
        id: "unsafe-borrowed-provenance-soundness-transfer",
        kind: "apply",
        title: "Transfer: zakres bajtów",
        prompt:
          "Zaimplementuj `ByteSpan<'owner>` z `from_range(owner: &'owner [u8], start: usize, len: usize) -> Option<Self>`, `subspan<'short>(&'short self, start: usize, len: usize) -> Option<ByteSpan<'short>>` i `bytes(&self) -> &[u8]`. Użyj offsetów bajtowych, odrzuć overflow oraz zakres poza właścicielem, dopuść pusty zakres na końcu i zachowaj pointer identity bez kopiowania.",
        code: byteSpanTransferMutant,
        solution: byteSpanTransferCanonical,
        tests: byteSpanTransferTests,
        gate: true,
      }),
    ],
    misconceptions: [
      "Lifetime przedłuża alokację.",
      "Null i pusty widok są tym samym co odczyt null.",
    ],
    transferTask: "Zaprojektuj borrowed parser, który nie posiada wejścia.",
    evidenceGate: "Niezależny test sprawdza relację właściciel–widok.",
    sourceIds: unsafeBorrowedMemorySources
      .slice(0, 2)
      .map((source) => source.id),
  },
  {
    id: "unsafe-borrowed-reborrow",
    moduleId,
    conceptIds: ["unsafe-borrowed-reborrow-contract"],
    competencyIds: ["unsafe-borrowed-memory-reborrow"],
    prerequisites: ["unsafe-borrowed-provenance"],
    title: "Rozłączne regiony i reborrow",
    subtitle: "Skróć outer loan i zachowaj niezmienniczość T.",
    minutes: 30,
    outcomes: [
      "Obsłużysz mid == len.",
      "Zwrócisz dwa rozłączne slice'y.",
      "Zaimplementujesz dokładny reborrow.",
    ],
    steps: [
      predict(
        "unsafe-borrowed-reborrow-predict",
        "Przewidź granicę",
        "Czy `mid == len` jest poprawne?",
        ["Tak", "Nie", "Tylko gdy `mid < len`"],
        "0",
        {
          "0": "Tak; `split_at_mut(len)` zwraca pełny lewy prefix i pusty prawy suffix.",
          "1": "Nie; odrzucamy tylko `mid > len`, więc równość jest dozwolona.",
          "2": "Nie trzeba wymagać `mid < len`; równość jest prawidłową granicą splitu.",
        },
      ),
      run(
        "unsafe-borrowed-reborrow-run",
        "Uruchom split",
        "Uruchom mały program safe.",
        partitionRun,
        "parts=1+2\n",
      ),
      explain(
        "unsafe-borrowed-reborrow-explain",
        "Wyjaśnij overlap",
        "Wyjaśnij, dlaczego dwa `&mut` nie mogą obejmować tego samego elementu.",
      ),
      coding({
        id: "unsafe-borrowed-reborrow-boundary-gate",
        kind: "modify",
        title: "Podziel bufor",
        prompt:
          "Zaimplementuj `split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>`. Odrzuć wyłącznie `mid > len`.",
        code: splitBorrowedMutant,
        solution: splitBorrowedCanonical,
        tests: splitBorrowedTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-reborrow-soundness-gate",
        kind: "apply",
        title: "Skróć outer loan",
        prompt:
          "Zaimplementuj `InvariantBorrow<'owner, T>` przez `from_mut` i dokładne `reborrow<'short>(&'short mut self)`. Lifetime outer loan może się skrócić, ale T pozostaje niezmiennicze.",
        code: invariantBorrowSoundnessMutant,
        solution: invariantBorrowCanonical,
        tests: invariantBorrowTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-reborrow-blank",
        kind: "blank",
        title: "Od pustej kartki: rozłączność",
        prompt:
          "Napisz `partition_window<'a>(input: &'a mut [u8], cut: usize)` z wynikiem `Result<(&'a mut [u8], &'a mut [u8]), CutError>`. `cut` oznacza długość prawego suffixu: zwróć lewy prefix i prawy suffix jako rozłączne slices; `cut == len` daje pusty lewy prefix i cały prawy suffix, a większy cut zwraca `CutError::TooLarge`. Nie używaj overlap ani unsafe.",
        solution: partitionWindowBlankCanonical,
        tests: partitionWindowBlankTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-reborrow-recall",
        kind: "recall",
        title: "Powtórka: reborrow",
        prompt: "Odtwórz reborrow na innym typie wartości.",
        code: invariantVarianceMutant,
        solution: invariantBorrowEquivalent,
        tests: invariantBorrowTests,
      }),
      coding({
        id: "unsafe-borrowed-reborrow-soundness-transfer",
        kind: "apply",
        title: "Transfer: para z krótką pożyczką",
        prompt:
          "Zaimplementuj `PairLoan<'owner, T>` nad `&'owner mut (T, T)` z `attach`, `reborrow<'short>(&'short mut self) -> PairLoan<'short, T>`, `swap(&mut self)` i `values(&self) -> (&T, &T)`. Dziecko może zamienić parę, a po jego zakresie rodzic nadal działa; nie dodawaj unsafe, Clone ani Copy bounds.",
        code: pairLoanTransferMutant,
        solution: pairLoanTransferCanonical,
        tests: pairLoanTransferTests,
        gate: true,
      }),
    ],
    misconceptions: [
      "`mid == len` jest błędem.",
      "Skrócenie outer loan skraca dowolne T.",
    ],
    transferTask: "Zastosuj split do bezpiecznego parsera rekordów.",
    evidenceGate: "Granica i reborrow są oceniane osobno.",
    sourceIds: unsafeBorrowedMemorySources
      .slice(0, 3)
      .map((source) => source.id),
  },
  {
    id: "unsafe-borrowed-slot",
    moduleId,
    conceptIds: ["unsafe-borrowed-slot-contract"],
    competencyIds: ["unsafe-borrowed-memory-init"],
    prerequisites: ["unsafe-borrowed-reborrow"],
    title: "Stan inicjalizacji",
    subtitle:
      "Zacznij od SafeSlot, a maintainer-only MaybeUninit trzymaj za granicą.",
    minutes: 30,
    outcomes: [
      "Zachowasz exactly-once Drop.",
      "Odrzucisz drugi put.",
      "Rozdzielisz safe i maintainer fixture.",
    ],
    steps: [
      predict(
        "unsafe-borrowed-slot-predict",
        "Przewidź Drop",
        "Czy sam adres MaybeUninit oznacza wartość gotową do Drop?",
        ["Tak", "Nie", "Tak, jeśli adres jest wyrównany"],
        "1",
        {
          "0": "Sam adres nie dowodzi, że `T` zostało zainicjalizowane i można je bezpiecznie dropować.",
          "1": "Nie; `MaybeUninit<T>` nie uruchamia Drop dla niezainicjalizowanego `T`, a stan Full musi być dowiedziony.",
          "2": "Wyrównanie adresu jest potrzebne, ale nadal nie dowodzi, że przechowywane `T` zostało zainicjalizowane.",
        },
      ),
      run(
        "unsafe-borrowed-slot-run",
        "Uruchom stan",
        "Uruchom wynik safe slotu.",
        slotRun,
        "state=full\n",
      ),
      explain(
        "unsafe-borrowed-slot-explain",
        "Wyjaśnij stan",
        "Wyjaśnij, dlaczego stan musi zmienić się przed take.",
      ),
      coding({
        id: "unsafe-borrowed-slot-boundary-gate",
        kind: "modify",
        title: "Zbuduj SafeSlot",
        prompt:
          "Zaimplementuj `SafeSlot<T>` na `Option<T>` z `empty`, `put`, `take`, `drop_initialized` i `is_full`. Drugi put zwraca wartość.",
        code: safeSlotMutant,
        solution: safeSlotCanonical,
        tests: safeSlotTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-slot-soundness-gate",
        kind: "apply",
        title: "Sprawdź własność",
        prompt:
          "Zachowaj przejścia Empty/Full i exactly-once Drop dla nie-Copy wartości.",
        code: safeSlotSoundnessMutant,
        solution: safeSlotSoundnessCanonical,
        tests: safeSlotSoundnessTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-slot-blank",
        kind: "blank",
        title: "Od pustej kartki: InitCell",
        prompt:
          "Napisz `InitCell<T>` z `vacant`, `insert_once`, `remove` i `occupied`, bez `MaybeUninit`, raw pointera i ukrytego unsafe. `insert_once` jest operacją jednorazową: drugi insert zwraca przekazaną wartość także po `remove`; `remove` oddaje bieżącą wartość i zwalnia stan occupied, ale nie uzbraja ponownie komórki. Test używa nie-Copy DropProbe.",
        solution: initCellBlankCanonical,
        tests: initCellBlankTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-slot-recall",
        kind: "recall",
        title: "Powtórka: stan slotu",
        prompt: "Odtwórz stan slotu z inną składnią match.",
        code: safeSlotMutant,
        solution: safeSlotEquivalent,
        tests: safeSlotTests,
      }),
      coding({
        id: "unsafe-borrowed-slot-soundness-transfer",
        kind: "apply",
        title: "Transfer: warunkowa wymiana slotu",
        prompt:
          "Zaimplementuj `ReplaceSlot<T>` z `empty`, `replace(&mut self, value: T) -> Option<T>`, `take_if(&mut self, predicate: impl FnOnce(&T) -> bool) -> Option<T>`, `clear` i `is_full`. Oddaj starą własność bez dropowania, uruchom predykat tylko dla pełnego slotu, zachowaj wartość przy false i wyczyść ją przy true.",
        code: replaceSlotTransferMutant,
        solution: replaceSlotTransferCanonical,
        tests: replaceSlotTransferTests,
        gate: true,
      }),
    ],
    misconceptions: [
      "MaybeUninit samo dropuje T.",
      "Drugi put może zastąpić żywą wartość bez kosztu.",
    ],
    transferTask:
      "Dodaj stan do bufora parsera, który oddaje ownership po sukcesie.",
    evidenceGate: "Stan i własność są sprawdzane niezależnie.",
    sourceIds: unsafeBorrowedMemorySources
      .slice(1, 3)
      .map((source) => source.id),
  },
  {
    id: "unsafe-borrowed-auto-traits",
    moduleId,
    conceptIds: ["unsafe-borrowed-auto-traits-contract"],
    competencyIds: ["unsafe-borrowed-memory-auto-traits"],
    prerequisites: ["unsafe-borrowed-slot"],
    title: "Inwariantność i Send/Sync",
    subtitle: "Nie dopisuj traitów, których marker nie uzasadnia.",
    minutes: 30,
    outcomes: [
      "Zachowasz invariance lifetime.",
      "Przetestujesz u8 jako Send+Sync.",
      "Rozpoznasz negatywne Cell i Rc clients.",
    ],
    steps: [
      predict(
        "unsafe-borrowed-auto-traits-predict",
        "Przewidź trait",
        "Czy output-only PhantomData może bezpiecznie dodać Sync?",
        ["Tak", "Nie", "Tak, jeśli `T: Send`"],
        "1",
        {
          "0": "Nie; output-only marker może ukryć zależność od `T` i sprawić, że wrapper wygląda na Sync bez uzasadnienia.",
          "1": "Nie; marker musi zachować rzeczywistą zależność od `T`, aby auto-traits nie zostały dopisane.",
          "2": "`Send` nie zastępuje zależności potrzebnej do bezpiecznego wyznaczenia `Sync`; output-only marker nadal ją ukrywa.",
        },
      ),
      run(
        "unsafe-borrowed-auto-traits-run",
        "Uruchom bounds",
        "Uruchom positive trait bounds.",
        autoTraitRun,
        "bounds=send-sync\n",
      ),
      explain(
        "unsafe-borrowed-auto-traits-explain",
        "Wyjaśnij auto-traits",
        "Wyjaśnij, skąd wrapper dziedziczy Send i Sync.",
      ),
      coding({
        id: "unsafe-borrowed-auto-traits-boundary-gate",
        kind: "modify",
        title: "Zachowaj marker",
        prompt:
          "Zaimplementuj `InvariantBorrow<'owner, T>` z polem `value: &'owner mut T`, funkcjami `from_mut`, `reborrow`, `get` i `get_mut`, markerem funkcji czyniącym T invariant oraz markerem `PhantomData<&'owner mut T>`. Ukryte testy bezpośrednio sprawdzają Send+Sync dla `u8`, Send dla `Cell<u8>`, reborrow i dostęp do wartości. Nie implementuj helperów testowych ani unsafe impl.",
        code: autoTraitsEquivalent
          .replace(
            "PhantomData<(&'owner mut T,fn(T)->T)>",
            "PhantomData<*mut T>",
          )
          .replace(
            "fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}\nfn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}",
            "",
          ),
        solution: autoTraitsCanonical,
        tests: autoTraitsTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-auto-traits-soundness-gate",
        kind: "apply",
        title: "Sprawdź positive bounds",
        prompt:
          "Zachowaj `InvariantBorrow<'owner, T>` z `from_mut`, `reborrow`, `get`, `get_mut`, invariant markerem funkcji i markerem `PhantomData<&'owner mut T>`. Ukryte testy bezpośrednio sprawdzają Send+Sync dla `u8`, Send dla `Cell<u8>` oraz działanie reborrow. Nie implementuj helperów testowych ani unsafe impl.",
        code: autoTraitsSoundnessEquivalent
          .replace(
            "PhantomData<(&'owner mut T,fn(T)->T)>",
            "PhantomData<*mut T>",
          )
          .replace(
            "fn soundness_send<T:Send>(){} fn soundness_sync<T:Sync>(){}\nfn soundness_bounds(){soundness_send::<InvariantBorrow<'_,u8>>();soundness_sync::<InvariantBorrow<'_,u8>>();}",
            "",
          ),
        solution: autoTraitsSoundnessCanonical,
        tests: autoTraitsSoundnessTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-auto-traits-blank",
        kind: "blank",
        title: "Od pustej kartki: marker",
        prompt:
          "Napisz `CellMarker<'owner, T>` z `borrow(&'owner mut T)` i `get(&self) -> &T` bez ręcznego unsafe impl. Opisz, że Cell jest Send lecz nie Sync, a Rc nie jest żadnym z nich.",
        solution: cellMarkerBlankCanonical,
        tests: cellMarkerBlankTests,
        gate: true,
      }),
      coding({
        id: "unsafe-borrowed-auto-traits-recall",
        kind: "recall",
        title: "Powtórka: auto-traits",
        prompt:
          "Odtwórz positive bounds, naprawiając marker `PhantomData<*mut T>` na marker funkcji czyniący T invariant oraz `PhantomData<&'owner mut T>`. Ukryte testy niezależnie sprawdzają, że `InvariantBorrow<'_, u8>` jest Send+Sync, a `InvariantBorrow<'_, Cell<u8>>` jest Send, oraz sprawdzają działanie reborrow; nie implementuj helperów testowych ani unsafe impl.",
        code: autoTraitsRecallMutant,
        solution: autoTraitsEquivalent,
        tests: autoTraitsRecallTests,
      }),
      compileFail(
        "unsafe-borrowed-auto-traits-compile-fail",
        "Uruchom klienta bezpiecznego API std::slice::from_ref. Nawet gdy u8 implementuje Send i Sync, widok lokalnej wartości nie może przeżyć wywołania funkcji. Sprawdź, do czego odnosi się E0515.",
        lifetimeClient,
      ),
      coding({
        id: "unsafe-borrowed-auto-traits-soundness-transfer",
        kind: "apply",
        title: "Transfer: współdzielony lease",
        prompt:
          "Zaimplementuj `SharedLease<'owner, T>` przechowujący `&'owner T` z `attach`, `reborrow<'short>(&'short self) -> SharedLease<'short, T>` i `get(&self) -> &T`. Zachowaj pointer identity i positive Send+Sync dla `u8`; nie dodawaj unsafe impl ani kopiowania T. Ten fixture ocenia wyłącznie jawnie opisane pozytywne zachowanie.",
        code: sharedLeaseTransferMutant,
        solution: sharedLeaseTransferCanonical,
        tests: sharedLeaseTransferTests,
        gate: true,
      }),
    ],
    misconceptions: [
      "Send można dopisać blanket impl.",
      "Sync oznacza, że samo T jest Sync.",
    ],
    transferTask: "Zastosuj marker w lokalnym wrapperze pożyczonego bufora.",
    evidenceGate:
      "Bramki przeglądarkowe sprawdzają pozytywne bounds i reborrow; pokazany compile-fail odrzuca lifetime escape. Negatywne klienty Rc/Cell należą do autorskiego pakietu weryfikowanego natywnie, a zaliczenie w przeglądarce nie dowodzi ich uruchomienia.",
    sourceIds: unsafeBorrowedMemorySources.slice(2).map((source) => source.id),
  },
];

export const unsafeBorrowedMemoryReviewExercises: Record<string, LessonStep> = {
  "unsafe-borrowed-provenance-contract": coding({
    id: "review-unsafe-borrowed-provenance",
    kind: "apply",
    title: "Powtórka: widok właściciela",
    prompt:
      "Zaimplementuj `BorrowedText<'owner>` z `from_text`, `words` i `raw`; zachowaj Unicode oraz pożyczone bajty.",
    code: borrowedTextReviewMutant,
    solution: borrowedTextReviewEquivalent,
    tests: borrowedTextReviewTests,
  }),
  "unsafe-borrowed-reborrow-contract": coding({
    id: "review-unsafe-borrowed-reborrow",
    kind: "apply",
    title: "Powtórka: rozłączny split",
    prompt: "Odtwórz split i pokaż oba przypadki brzegowe.",
    code: markerSplitReviewMutant,
    solution: markerSplitReviewEquivalent,
    tests: markerSplitReviewTests,
  }),
  "unsafe-borrowed-slot-contract": coding({
    id: "review-unsafe-borrowed-slot",
    kind: "apply",
    title: "Powtórka: ownership slotu",
    prompt:
      "Odtwórz `LeaseSlot<T>` z `new`, `store`, `release`, `clear` i `generation()`, zachowując exactly-once Drop. Generacja startuje od 0, rośnie po udanym `store`, po `release`/`clear` tylko gdy slot zawierał wartość; odrzucony `store` jej nie zmienia.",
    code: leaseSlotReviewMutant,
    solution: leaseSlotReviewEquivalent,
    tests: leaseSlotReviewTests,
  }),
  "unsafe-borrowed-auto-traits-contract": coding({
    id: "review-unsafe-borrowed-auto-traits",
    kind: "apply",
    title: "Powtórka: Send i Sync",
    prompt:
      "Odtwórz `TraitView<'owner, T>` z `attach`, `get` i krótszym `reattach`; T pozostaje invariant, a outer owner lifetime może być reborrowed krócej.",
    code: traitViewReviewCanonical
      .replace("fn get(&self)->&T{self.value}", "fn get(&self)->&T{self.value}")
      .replace(
        "fn reattach<'short>(&'short mut self)->TraitView<'short,T>{TraitView{value:&mut*self.value,ty:PhantomData,owner:PhantomData}}",
        "",
      ),
    solution: traitViewReviewEquivalent,
    tests: traitViewReviewTests,
  }),
};

export const unsafeBorrowedMemoryModule: CourseModule = {
  id: moduleId,
  title: "Soundness borrowed memory: lifetime, stan i auto-traits",
  whyItMatters:
    "Bezpieczny wrapper musi wiązać lifetime z właścicielem, zachować stan inicjalizacji i nie wymyślać Send/Sync. Browser sprawdza tylko learner-safe API, a maintainer verifier osobno uruchamia authored Miri fixtures.",
  capabilities: unsafeBorrowedMemoryCompetencies.map((item) => item.title),
  prerequisites: ["unsafe-miri-contracts"],
  lessonIds: unsafeBorrowedMemoryLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zbudujesz safe BorrowedBytes.",
    "Rozdzielisz split i reborrow.",
    "Utrzymasz SafeSlot.",
    "Sprawdzisz marker auto-traits.",
  ],
  projectConnection:
    "Dowód dotyczy wyłącznie authored fixtures i nie oznacza pełnej soundness arbitralnego unsafe code.",
  assessmentId: "unsafe-borrowed-auto-traits/unsafe-borrowed-auto-traits-blank",
  gateCriteria: unsafeBorrowedMemoryLessons.flatMap((lesson) => [
    {
      id: `${lesson.id}-boundary-criterion`,
      label: `${lesson.title}: boundary evidence`,
      taskRefs: [
        { lessonId: lesson.id, stepId: `${lesson.id}-boundary-gate` },
        { lessonId: lesson.id, stepId: `${lesson.id}-blank` },
      ],
    },
    {
      id: `${lesson.id}-soundness-criterion`,
      label: `${lesson.title}: soundness evidence`,
      taskRefs: [
        { lessonId: lesson.id, stepId: `${lesson.id}-soundness-gate` },
        { lessonId: lesson.id, stepId: `${lesson.id}-soundness-transfer` },
      ],
    },
  ]),
};
