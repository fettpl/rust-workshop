import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-17";

export const gatProducerSources: Source[] = [
  {
    id: "gat-reference-associated-items",
    title: "Rust Reference: Associated items",
    url: "https://doc.rust-lang.org/reference/items/associated-items.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie przykładów GAT i rodzin typów.",
  },
  {
    id: "gat-slice-windows",
    title: "Rust standard library: slice::windows",
    url: "https://doc.rust-lang.org/std/primitive.slice.html#method.windows",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie porównania niemutowalnych okien slice.",
  },
  {
    id: "gat-gats-stabilization",
    title: "Rust blog: Generic associated types stabilization",
    url: "https://blog.rust-lang.org/2022/10/28/gats-stabilization/",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie ograniczeń i przykładów stabilnych GAT.",
  },
  {
    id: "gat-error-e0499",
    title: "Rust Error Index: E0499 — multiple mutable borrows",
    url: "https://doc.rust-lang.org/error_codes/E0499.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Uruchamiaj rzeczywisty fixture rustc po zmianie obserwacji aliasingu.",
  },
];

export const gatProducerCompetencies: Competency[] = [
  {
    id: "design-receiver-bound-item-family",
    title:
      "Projektujesz rodzinę elementów zależną od bieżącej pożyczki odbiorcy.",
  },
  {
    id: "implement-sequential-lending-producers",
    title:
      "Implementujesz bezpiecznego producenta lending bez jednoczesnych pożyczek mutowalnych.",
  },
  {
    id: "define-overlapping-window-contract",
    title:
      "Definiujesz granice, kolejność i wyczerpanie nakładających się okien.",
  },
  {
    id: "explain-gat-loan-invariants",
    title:
      "Wyjaśniasz, co gwarantuje GAT, a co pozostaje konkretną regułą producenta.",
  },
];

export const gatProducerConcepts: Concept[] = [
  {
    id: "gat-receiver-borrows",
    title: "GAT zależny od pożyczki odbiorcy",
    prerequisites: ["hrtb-borrowed-projections", "iterator-contracts"],
    competencyIds: [
      "design-receiver-bound-item-family",
      "implement-sequential-lending-producers",
      "explain-gat-loan-invariants",
    ],
    reviewPrompt:
      "Co zmienia w kontrakcie `LendingIterator` zapis `type Item<'a> where Self: 'a`?",
    reviewAnswer:
      "Typ elementu jest rodziną zależną od lifetime bieżącej pożyczki `&'a mut self`. To wiąże ważność wyniku z tym wywołaniem, ale samo nie obiecuje referencji, pochodzenia z odbiorcy, mutowalności ani trwałego `None`.",
    distinguish:
      "`RowLender` ustala własne pochodzenie, kolejność i fused behavior. GAT opisuje relację typu z pożyczką odbiorcy, a nie ogólną semantykę każdej implementacji.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "gat-overlapping-mutable-windows",
    title: "Sekwencyjne nakładające się okna mutowalne",
    prerequisites: ["gat-receiver-borrows"],
    competencyIds: [
      "define-overlapping-window-contract",
      "implement-sequential-lending-producers",
      "explain-gat-loan-invariants",
    ],
    reviewPrompt:
      "Dlaczego `WindowsMut` może zwracać nakładające się okna, ale nie pozwala zachować dwóch żywych pożyczek?",
    reviewAnswer:
      "Każde okno jest mutowalnym widokiem związanym z aktualną pożyczką odbiorcy; trzeba zakończyć tę pożyczkę przed kolejnym `next`. Konkretny producent przesuwa początek o jeden i po wyczerpaniu pozostaje przy `None`.",
    distinguish:
      "`slice::windows` daje współistniejące niemutowalne widoki zewnętrznego slice, a zwykły `Iterator` może bezpiecznie rozdzielać niepokrywające się `&mut`. Ten GAT opisuje trzeci przypadek: kolejne, krótkie pożyczki, które mogą się nakładać.",
    evidenceArtifact: "rust-code",
  },
];

function choice(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
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
        explanations.map((value, index) => [String(index), value]),
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

function coding(options: {
  id: string;
  kind: "debug" | "blank" | "apply";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  forbiddenPatterns?: string[];
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
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "debug"
          ? "fix"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const lendingTrait = `trait LendingIterator {
    type Item<'a> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}`;

const rowStarter = `${lendingTrait}

struct RowLender<T> {
    rows: Vec<Vec<T>>,
    next: usize,
}

impl<T> RowLender<T> {
    fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, next: 0 } }
}

impl<T> LendingIterator for RowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        None
    }
}
`;

const rowSolution = `${lendingTrait}

struct RowLender<T> {
    rows: Vec<Vec<T>>,
    next: usize,
}

impl<T> RowLender<T> {
    fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, next: 0 } }
}

impl<T> LendingIterator for RowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.next >= self.rows.len() { return None; }
        let row = self.next;
        self.next += 1;
        Some(self.rows[row].as_mut_slice())
    }
}
`;

const rowTests = `#[test]
fn rows_are_mutable_ordered_and_fused() {
    struct Record<'a> { text: &'a str, hits: usize }
    let labels = [String::from("A"), String::from("żółć"), String::from("終")];
    let mut rows = vec![
        vec![Record { text: labels[0].as_str(), hits: 0 }, Record { text: labels[1].as_str(), hits: 0 }],
        Vec::new(),
        vec![Record { text: labels[2].as_str(), hits: 0 }],
    ];
    let first_pointer = rows[0].as_ptr();
    let third_pointer = rows[2].as_ptr();
    let mut lender = RowLender::new(rows);
    let first = lender.next().unwrap();
    assert_eq!(first.as_ptr(), first_pointer);
    assert_eq!(first[0].text, "A"); assert_eq!(first[1].text, "żółć");
    first[0].hits += 1; first[1].hits += 2; drop(first);
    let empty = lender.next().unwrap(); assert!(empty.is_empty()); drop(empty);
    let third = lender.next().unwrap();
    assert_eq!(third.as_ptr(), third_pointer); assert_eq!(third[0].text, "終"); third[0].hits += 3; drop(third);
    assert!(lender.next().is_none()); assert!(lender.next().is_none());
}

#[test]
fn empty_outer_input_is_immediately_exhausted() {
    let mut lender = RowLender::<String>::new(Vec::new());
    assert!(lender.next().is_none()); assert!(lender.next().is_none());
}
`;

const presentTests = `#[test]
fn skips_vacancies_and_mutates_each_occupied_value() {
    use std::cell::Cell;
    let labels = [String::from("Łódź"), String::from("lokalne"), String::from("終")];
    let drops = Cell::new(0);
    let seen_sum = Cell::new(0);
    struct Record<'a> { text: &'a str, seen: usize, drops: &'a Cell<usize>, seen_sum: &'a Cell<usize> }
    impl Drop for Record<'_> { fn drop(&mut self) { self.drops.set(self.drops.get() + 1); self.seen_sum.set(self.seen_sum.get() + self.seen); } }
    let mut values = vec![None, Some(Record { text: labels[0].as_str(), seen: 0, drops: &drops, seen_sum: &seen_sum }), None, Some(Record { text: labels[1].as_str(), seen: 0, drops: &drops, seen_sum: &seen_sum }), Some(Record { text: labels[2].as_str(), seen: 0, drops: &drops, seen_sum: &seen_sum })];
    let first_pointer = values[1].as_ref().unwrap() as *const Record;
    let second_pointer = values[3].as_ref().unwrap() as *const Record;
    let third_pointer = values[4].as_ref().unwrap() as *const Record;
    let mut lender = PresentValueLender::new(values);
    let first = lender.next().unwrap(); assert_eq!(first as *const Record, first_pointer); assert_eq!(first.text, "Łódź"); first.seen += 1; drop(first);
    assert_eq!(drops.get(), 0);
    let second = lender.next().unwrap(); assert_eq!(second as *const Record, second_pointer); assert_eq!(second.text, "lokalne"); second.seen += 2; drop(second);
    assert_eq!(drops.get(), 0);
    let third = lender.next().unwrap(); assert_eq!(third as *const Record, third_pointer); assert_eq!(third.text, "終"); third.seen += 3; drop(third);
    assert_eq!(drops.get(), 0);
    assert!(lender.next().is_none()); assert_eq!(drops.get(), 0);
    assert!(lender.next().is_none()); assert_eq!(drops.get(), 0);
    assert_eq!(drops.get(), 0);
    drop(lender); assert_eq!(drops.get(), 3); assert_eq!(seen_sum.get(), 6); let _ = first_pointer;
}

#[test]
fn all_vacancies_and_empty_input_have_no_items() {
    let mut vacancies = PresentValueLender::<String>::new(vec![None, None]);
    assert!(vacancies.next().is_none()); assert!(vacancies.next().is_none());
    let mut empty = PresentValueLender::<String>::new(Vec::new()); assert!(empty.next().is_none());
}
`;

const windowsStarter = `${lendingTrait}

#[derive(Debug, PartialEq, Eq)]
enum WidthError { Zero }

struct WindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }

impl<'data, T> WindowsMut<'data, T> {
    fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> {
        if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) }
    }
}

impl<T> LendingIterator for WindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None }
}
`;

const windowsSolution = `${lendingTrait}

#[derive(Debug, PartialEq, Eq)]
enum WidthError { Zero }

struct WindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }

impl<'data, T> WindowsMut<'data, T> {
    fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> {
        if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) }
    }
}

impl<T> LendingIterator for WindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.done || self.position >= self.data.len() || self.width > self.data.len() - self.position { self.done = true; return None; }
        let start = self.position;
        let end = match start.checked_add(self.width) { Some(end) => end, None => { self.done = true; return None; } };
        self.position = match start.checked_add(1) { Some(next) => next, None => { self.done = true; start } };
        if end > self.data.len() { self.done = true; return None; }
        self.data.get_mut(start..end)
    }
}
`;

const windowsTests = `struct Record<'a> { label: &'a str, hits: usize }

#[test]
fn overlapping_windows_mutate_non_copy_records() {
    let labels = [String::from("a"), String::from("ż"), String::from("c"), String::from("終")];
    let mut data = [Record { label: labels[0].as_str(), hits: 0 }, Record { label: labels[1].as_str(), hits: 0 }, Record { label: labels[2].as_str(), hits: 0 }, Record { label: labels[3].as_str(), hits: 0 }];
    let mut lender = WindowsMut::new(&mut data, 3).unwrap();
    let window = lender.next().unwrap(); for value in window.iter_mut() { value.hits += 1; } drop(window);
    let window = lender.next().unwrap(); for value in window.iter_mut() { value.hits += 10; } drop(window);
    assert!(lender.next().is_none()); assert!(lender.next().is_none()); drop(lender);
    assert_eq!(data[0].label, "a"); assert_eq!(data[1].label, "ż"); assert_eq!(data[2].label, "c"); assert_eq!(data[3].label, "終");
    assert_eq!(data[0].hits, 1); assert_eq!(data[1].hits, 11); assert_eq!(data[2].hits, 11); assert_eq!(data[3].hits, 10);
}

#[test]
fn all_width_boundaries_are_defined() {
    let mut zero_data = [String::from("x")]; assert!(matches!(WindowsMut::new(&mut zero_data, 0), Err(WidthError::Zero)));
    let mut oversized = [String::from("x")]; let mut oversized_lender = WindowsMut::new(&mut oversized, usize::MAX).unwrap(); assert!(oversized_lender.next().is_none()); assert!(oversized_lender.next().is_none());
    let mut empty: [String; 0] = []; let mut empty_lender = WindowsMut::new(&mut empty, 1).unwrap(); assert!(empty_lender.next().is_none());
    let mut exact = [String::from("a"), String::from("b")]; let mut exact_lender = WindowsMut::new(&mut exact, 2).unwrap(); assert_eq!(exact_lender.next().unwrap().len(), 2); assert!(exact_lender.next().is_none());
    let mut one = [String::from("a"), String::from("b")]; let mut one_lender = WindowsMut::new(&mut one, 1).unwrap(); assert_eq!(one_lender.next().unwrap()[0], "a"); assert_eq!(one_lender.next().unwrap()[0], "b"); assert!(one_lender.next().is_none());
}
`;

const growingTests = `#[test]
fn prefixes_grow_from_zero_and_accumulate_mutation() {
    struct Record<'a> { text: &'a str, hits: usize }
    let labels = [String::from("a"), String::from("b"), String::from("c")];
    let mut data = [Record { text: labels[0].as_str(), hits: 0 }, Record { text: labels[1].as_str(), hits: 0 }, Record { text: labels[2].as_str(), hits: 0 }]; let mut lender = GrowingPrefixesMut::new(&mut data, 3);
    let prefix = lender.next().unwrap(); prefix[0].hits += 1; drop(prefix);
    let prefix = lender.next().unwrap(); assert_eq!(prefix[0].text, "a"); assert_eq!(prefix[0].hits, 1); assert_eq!(prefix.len(), 2); prefix[1].hits += 2; drop(prefix);
    let prefix = lender.next().unwrap(); assert_eq!(prefix[0].text, "a"); assert_eq!(prefix[1].text, "b"); assert_eq!(prefix[2].text, "c"); assert_eq!([prefix[0].hits, prefix[1].hits, prefix[2].hits], [1, 2, 0]); assert_eq!(prefix.len(), 3); drop(prefix);
    assert!(lender.next().is_none()); assert!(lender.next().is_none());
    drop(lender); assert_eq!([data[0].hits, data[1].hits, data[2].hits], [1, 2, 0]);
}

#[test]
fn zero_empty_and_oversized_maximums_are_fused() {
    let mut zero = [String::from("x")]; let mut zero_lender = GrowingPrefixesMut::new(&mut zero, 0); assert!(zero_lender.next().is_none());
    let mut empty: [String; 0] = []; let mut empty_lender = GrowingPrefixesMut::new(&mut empty, 4); assert!(empty_lender.next().is_none());
    let mut short = [String::from("x"), String::from("y")]; let mut short_lender = GrowingPrefixesMut::new(&mut short, 99); assert_eq!(short_lender.next().unwrap().len(), 1); assert_eq!(short_lender.next().unwrap().len(), 2); assert!(short_lender.next().is_none()); assert!(short_lender.next().is_none());
    struct Local<'a> { text: &'a str, hits: usize }
    let mut limited_data = [Local { text: "p", hits: 0 }, Local { text: "q", hits: 0 }, Local { text: "r", hits: 0 }]; let mut limited = GrowingPrefixesMut::new(&mut limited_data, 2); assert_eq!(limited.next().unwrap().len(), 1); assert_eq!(limited.next().unwrap().len(), 2); assert!(limited.next().is_none()); assert!(limited.next().is_none());
}
`;

// Worked producers have different state/behavior from the assessed row/window APIs.
const singleRowObservation = `${lendingTrait}
struct SingleRowLender<T> { row: Vec<T>, yielded: bool }
impl<T> SingleRowLender<T> {
    fn new(row: Vec<T>) -> Self { Self { row, yielded: false } }
    fn into_row(self) -> Vec<T> { self.row }
}
impl<T> LendingIterator for SingleRowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.yielded { return None; }
        self.yielded = true;
        Some(self.row.as_mut_slice())
    }
}
`;

const observationRows = `${singleRowObservation}
fn main() {
    let mut first = SingleRowLender::new(vec![String::from("A")]);
    let mut empty = SingleRowLender::<String>::new(Vec::new());
    let mut last = SingleRowLender::new(vec![String::from("Łódź")]);
    { let row = first.next().unwrap(); row[0].push('!'); }
    { let row = empty.next().unwrap(); println!("pusty: {}", row.is_empty()); }
    { let row = last.next().unwrap(); println!("ostatni: {}", row[0]); }
    println!("koniec: {:?}", last.next().is_none());
    println!("końcowe: {:?}", vec![first.into_row(), empty.into_row(), last.into_row()]);
}
`;

const rejectedLoan = `${singleRowObservation}
fn main() {
    let mut lender = SingleRowLender::new(vec![String::from("A")]);
    let first = lender.next().unwrap();
    let _second = lender.next();
    println!("{}", first.len());
}
`;

const suffixObservation = `${lendingTrait}
struct SuffixesMut<'data, T> { data: &'data mut [T], position: usize }
impl<'data, T> SuffixesMut<'data, T> {
    fn new(data: &'data mut [T]) -> Self { Self { data, position: 0 } }
}
impl<T> LendingIterator for SuffixesMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.position >= self.data.len() { return None; }
        let start = self.position;
        self.position += 1;
        self.data.get_mut(start..)
    }
}
`;

const windowsObservation = `${suffixObservation}
fn main() {
    let data = [1, 2, 3, 4];
    for window in data.windows(3) { println!("niemutowalne: {window:?}"); }
    let mut separate = [1, 2, 3, 4];
    for value in separate.iter_mut() { *value += 100; }
    println!("niepokrywające mutable: {separate:?}");
    let mut data = [1, 2, 3, 4]; let mut lender = SuffixesMut::new(&mut data);
    { let suffix = lender.next().unwrap(); suffix[1] += 10; }
    { let suffix = lender.next().unwrap(); println!("nakłada się: {suffix:?}"); }
    println!("dane: {data:?}");
}
`;

const rejectedWindowLoan = `${suffixObservation}
fn main() {
    let mut data = [1, 2, 3]; let mut lender = SuffixesMut::new(&mut data);
    let first = lender.next().unwrap(); let _second = lender.next(); println!("{}", first.len());
}
`;

const reverseRowStarter = `${lendingTrait}
struct ReverseRowLender<T> { rows: Vec<Vec<T>>, position: usize }
impl<T> ReverseRowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { let position = rows.len().saturating_sub(1); Self { rows, position } } }
impl<T> LendingIterator for ReverseRowLender<T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }
`;

const reverseRowSolution = `${lendingTrait}
struct ReverseRowLender<T> { rows: Vec<Vec<T>>, position: Option<usize>, done: bool }
impl<T> ReverseRowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { let position = rows.len().checked_sub(1); Self { rows, position, done: false } } }
impl<T> LendingIterator for ReverseRowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.done { return None; }
        let position = match self.position { Some(position) => position, None => { self.done = true; return None; } };
        self.position = position.checked_sub(1);
        if self.position.is_none() { self.done = true; }
        Some(self.rows[position].as_mut_slice())
    }
}
`;

const reverseRowTests = `#[test]
fn reverse_rows_preserve_empty_slots_and_pointer_identity() {
    struct Record<'a> { text: &'a str, seen: usize }
    let labels = [String::from("pierwszy"), String::from("ostatni")];
    let mut rows = vec![vec![Record { text: labels[0].as_str(), seen: 0 }], Vec::new(), vec![Record { text: labels[1].as_str(), seen: 0 }]];
    let first_pointer = rows[0].as_ptr(); let last_pointer = rows[2].as_ptr(); let mut lender = ReverseRowLender::new(rows);
    let last = lender.next().unwrap(); assert_eq!(last.as_ptr(), last_pointer); assert_eq!(last[0].text, "ostatni"); last[0].seen += 1; drop(last);
    let empty = lender.next().unwrap(); assert!(empty.is_empty()); drop(empty);
    let first = lender.next().unwrap(); assert_eq!(first.as_ptr(), first_pointer); assert_eq!(first[0].text, "pierwszy"); first[0].seen += 2; drop(first);
    assert!(lender.next().is_none()); assert!(lender.next().is_none());
}

#[test]
fn reverse_empty_input_is_fused_without_panicking() {
    let mut lender = ReverseRowLender::<String>::new(Vec::new());
    assert!(lender.next().is_none()); assert!(lender.next().is_none());
}
`;

const reverseWindowStarter = `${lendingTrait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct ReverseWindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> ReverseWindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) } } }
impl<T> LendingIterator for ReverseWindowsMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { None } }
`;

const reverseWindowSolution = `${lendingTrait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct ReverseWindowsMut<'data, T> { data: &'data mut [T], width: usize, position: Option<usize>, done: bool }
impl<'data, T> ReverseWindowsMut<'data, T> {
    fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> {
        if width == 0 { return Err(WidthError::Zero); }
        let position = data.len().checked_sub(width);
        Ok(Self { data, width, position, done: false })
    }
}
impl<T> LendingIterator for ReverseWindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.done { return None; }
        let start = match self.position { Some(start) => start, None => { self.done = true; return None; } };
        let end = start + self.width;
        self.position = start.checked_sub(1);
        if self.position.is_none() { self.done = true; }
        self.data.get_mut(start..end)
    }
}
`;

const reverseWindowTests = `#[test]
fn reverse_windows_cover_each_start_and_overlap() {
    struct Record<'a> { text: &'a str, hits: usize }
    let labels = [String::from("a"), String::from("b"), String::from("c"), String::from("d")];
    let mut data = [Record { text: labels[0].as_str(), hits: 0 }, Record { text: labels[1].as_str(), hits: 0 }, Record { text: labels[2].as_str(), hits: 0 }, Record { text: labels[3].as_str(), hits: 0 }];
    let original_pointer = data.as_ptr();
    let mut lender = ReverseWindowsMut::new(&mut data, 3).unwrap();
    let window = lender.next().unwrap(); assert_eq!(window.as_ptr(), original_pointer.wrapping_add(1)); assert_eq!(window[0].text, "b"); assert_eq!(window[1].text, "c"); assert_eq!(window[2].text, "d"); window[0].hits += 1; drop(window);
    let window = lender.next().unwrap(); assert_eq!(window.as_ptr(), original_pointer); assert_eq!(window[0].text, "a"); assert_eq!(window[1].text, "b"); assert_eq!(window[1].hits, 1); window[1].hits += 2; drop(window);
    assert!(lender.next().is_none()); assert!(lender.next().is_none()); drop(lender); assert_eq!(data[1].hits, 3);
}

#[test]
fn reverse_window_boundaries_are_defined() {
    let mut zero = [String::from("x")]; assert!(matches!(ReverseWindowsMut::new(&mut zero, 0), Err(WidthError::Zero)));
    let mut oversized = [String::from("x")]; let mut oversized_lender = ReverseWindowsMut::new(&mut oversized, 2).unwrap(); assert!(oversized_lender.next().is_none()); assert!(oversized_lender.next().is_none());
    let mut maximum = [String::from("x")]; let mut maximum_lender = ReverseWindowsMut::new(&mut maximum, usize::MAX).unwrap(); assert!(maximum_lender.next().is_none()); assert!(maximum_lender.next().is_none());
    let mut empty: [String; 0] = []; let mut empty_lender = ReverseWindowsMut::new(&mut empty, 1).unwrap(); assert!(empty_lender.next().is_none()); assert!(empty_lender.next().is_none());
    let mut equal = [String::from("a"), String::from("b")]; let mut equal_lender = ReverseWindowsMut::new(&mut equal, 2).unwrap(); assert_eq!(equal_lender.next().unwrap().len(), 2); assert!(equal_lender.next().is_none());
    let mut one = [String::from("a"), String::from("b")]; let mut one_lender = ReverseWindowsMut::new(&mut one, 1).unwrap(); assert_eq!(one_lender.next().unwrap()[0], "b"); assert_eq!(one_lender.next().unwrap()[0], "a"); assert!(one_lender.next().is_none());
}
`;

const rowBlankSolution = `${lendingTrait}
use std::cell::Cell;
struct PresentValueLender<T> { values: Vec<Option<T>>, next: Cell<usize> }
impl<T> PresentValueLender<T> { fn new(values: Vec<Option<T>>) -> Self { Self { values, next: Cell::new(0) } } }
impl<T> LendingIterator for PresentValueLender<T> { type Item<'a> = &'a mut T where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let start = self.next.get(); let len = self.values.len(); let found = self.values.iter_mut().enumerate().skip(start).find_map(|(index, slot)| slot.as_mut().map(|value| (index, value))); match found { Some((index, value)) => { self.next.set(index + 1); Some(value) }, None => { self.next.set(len); None } } } }
`;

const prefixBlankSolution = `${lendingTrait}
struct GrowingPrefixesMut<'data, T> { data: &'data mut [T], maximum: usize, length: usize, done: bool }
impl<'data, T> GrowingPrefixesMut<'data, T> { fn new(data: &'data mut [T], maximum: usize) -> Self { Self { data, maximum, length: 1, done: false } } }
impl<T> LendingIterator for GrowingPrefixesMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done || self.length == 0 || self.length > self.maximum || self.length > self.data.len() { self.done = true; return None; } let end = self.length; self.length = self.length.saturating_add(1); if end >= self.maximum || end >= self.data.len() { self.done = true; } self.data.get_mut(..end) } }
`;

export const gatProducerLessons: Lesson[] = [
  {
    id: "gat-receiver-borrows",
    moduleId: "gat-lending-iterators",
    conceptIds: ["gat-receiver-borrows"],
    competencyIds: [
      "design-receiver-bound-item-family",
      "implement-sequential-lending-producers",
      "explain-gat-loan-invariants",
    ],
    prerequisites: ["hrtb-borrowed-projections", "iterator-contracts"],
    title: "GAT zależny od pożyczki odbiorcy",
    subtitle:
      "Rodzina elementów zmienia się razem z krótką pożyczką producenta",
    minutes: 26,
    outcomes: [
      "Zapiszesz Item<'a> związany z &'a mut self.",
      "Zaimplementujesz własny producent w kolejności wejściowej, zachowując puste wiersze.",
      "Rozpoznasz, że fused behavior i pochodzenie wyniku są regułami konkretnego typu.",
    ],
    steps: [
      choice(
        "receiver-predict",
        "predict",
        "Czy typ Item jest stały?",
        "Czy `LendingIterator` może oddać inny typ pożyczki przy kolejnym lifetime bieżącego `&mut self`?",
        [
          "Tak: `Item<'a>` jest rodziną typów zależną od `'a`.",
          "Nie: każdy iterator musi mieć jeden typ Item bez lifetime.",
          "Tak, ale tylko gdy elementy implementują Copy.",
        ],
        0,
        [
          "GAT opisuje rodzinę projekcji, której lifetime jest wybrany przez bieżącą pożyczkę odbiorcy.",
          "To ograniczenie zwykłego Iteratora; tutaj uczymy osobnego traitu.",
          "Copy nie opisuje relacji pożyczki i nie jest wymagane.",
        ],
      ),
      run(
        "receiver-run",
        "Użyj wiersza, zwolnij pożyczkę",
        "Trzy osobne SingleRowLender oddają po jednym wierszu, w tym pustym. Każdy producer kończy się po jednej pożyczce. Zadanie główne wymaga jednego RowLender przechodzącego przez wiele wierszy.",
        observationRows,
        'pusty: true\nostatni: Łódź\nkoniec: true\nkońcowe: [["A!"], [], ["Łódź"]]\n',
      ),
      observe(
        "receiver-discover",
        "Zobacz E0499",
        "Pierwszy mutable view pozostaje żywy podczas drugiego `next`. Uruchom kod i odczytaj rzeczywisty błąd wielokrotnej pożyczki.",
        rejectedLoan,
        singleRowObservation,
        "E0499",
      ),
      choice(
        "receiver-explain",
        "explain",
        "Co należy do producenta?",
        "Które zdanie poprawnie rozdziela GAT od kontraktu `RowLender`?",
        [
          "GAT gwarantuje, że Item jest referencją z rows i że None jest zawsze końcowe.",
          "GAT wiąże Item z pożyczką odbiorcy; RowLender osobno ustala widok, kolejność i fused behavior.",
          "GAT wymaga `'static`, aby przechować każdy wiersz.",
        ],
        1,
        [
          "Pochodzenie i wyczerpanie wynikają z implementacji producenta.",
          "To właśnie rozdział między relacją lifetime a semantyką konkretnego API.",
          "Bieżąca pożyczka jest krótka i nie wymaga `'static`.",
        ],
      ),
      coding({
        id: "gat-receiver-borrows-gate",
        kind: "debug",
        title: "Oddaj pożyczone wiersze",
        prompt:
          "Napraw `RowLender<T>`. Konstruktor przejmuje `Vec<Vec<T>>` bez klonowania, sortowania i spłaszczania. `next` ma zwracać każdy wiersz jako `&'a mut [T]` w kolejności wejścia, także pusty wiersz jako `Some(&mut [])`. Po wyczerpaniu zwracaj `None` bez końca. Aktualna pożyczka musi zakończyć się przed kolejnym `next`; nie dodawaj `Copy`, `Clone` ani `'static`.",
        code: rowStarter,
        solution: rowSolution,
        tests: rowTests,
        hints: [
          "Najpierw zapisz indeks i zwiększ pozycję, potem oddaj `self.rows[index].as_mut_slice()`.",
          "Pusty wewnętrzny Vec nadal ma własny indeks; tylko wyjście poza długość oznacza None.",
        ],
        gate: true,
      }),
      coding({
        id: "gat-receiver-borrows-blank",
        kind: "blank",
        title: "Pomiń wakaty",
        prompt:
          "Od pustej kartki zaprojektuj `PresentValueLender<T>`, który przejmuje `Vec<Option<T>>` przez konstruktor `new` przyjmujący ten wektor i zwracający `PresentValueLender<T>`, a następnie implementuje pokazany trait `LendingIterator`. W odpowiedzi zdefiniuj także pełny trait `LendingIterator` z rodzinnym `Item<'a>` i wymaganym `where Self: 'a`; zadanie nie dostarcza ukrytej deklaracji ani typu bazowego poza biblioteką standardową. Metoda traitu `next` pożycza odbiorcę mutowalnie na wybrany lifetime `'a` i zwraca `Option<Self::Item<'a>>` powiązane z tą samą pożyczką. `Item<'a>` ma być `&'a mut T`. Odwiedzaj elementy od lewej do prawej, pomijaj każde `None`, a dla `Some(value)` oddaj pożyczkę do samego `value`; nie przenoś wartości, nie klonuj ich i nie zmieniaj kolejności. Puste wejście oraz wejście zawierające wyłącznie wakaty od razu się kończy. Po pierwszym wyczerpaniu każde następne `next` także zwraca `None`. Zmiany wykonane przez odbiorcę mają pozostać w przejętym stanie. Napisz sam typ, prywatny stan pozycji, implementację `next` i konstruktor na podstawie tego opisu; nie otrzymujesz startera ani podpisu funkcji poza kontraktem konstruktora podanym powyżej.",
        solution: rowBlankSolution,
        tests: presentTests,
        hints: [
          "Zwiększ pozycję także wtedy, gdy trafisz na None.",
          "`as_mut()` oddaje pożyczkę do wartości w Option bez przenoszenia jej na zewnątrz.",
        ],
        gate: true,
      }),
      choice(
        "receiver-recall",
        "recall",
        "Krótka pożyczka",
        "Co musi zrobić wywołujący między dwoma mutowalnymi wynikami?",
        [
          "Zakończyć użycie pierwszego wyniku przed drugim `next`.",
          "Skopiować pierwszy wynik przez Clone.",
          "Wydłużyć oba wyniki do `'static`.",
        ],
        0,
        [
          "Jedna pożyczka `&mut self` nie może współistnieć z następną.",
          "Kontrakt nie wymaga Clone; klonowanie byłoby zbędną kopią, a nie dowodem właściwej pożyczki odbiorcy.",
          "Lifetimes wynikają z bieżącego odbiorcy, nie z `'static`.",
        ],
      ),
    ],
    misconceptions: [
      "GAT automatycznie gwarantuje, że Item jest referencją z self.",
      "Pierwszy pusty wiersz oznacza koniec całego producenta.",
      "Dwa mutowalne wiersze można trzymać, bo ich typ jest taki sam.",
    ],
    transferTask:
      "Zaimplementuj odwrotnego producenta wierszy, zachowując puste wiersze i pożyczkę tylko na czas bieżącego użycia.",
    evidenceGate:
      "Kod zachowuje kolejność, puste wiersze, mutację, lokalne dane i trwałe None po wyczerpaniu.",
    sourceIds: [
      "gat-reference-associated-items",
      "gat-gats-stabilization",
      "gat-error-e0499",
    ],
  },
  {
    id: "gat-overlapping-mutable-windows",
    moduleId: "gat-lending-iterators",
    conceptIds: ["gat-overlapping-mutable-windows"],
    competencyIds: [
      "define-overlapping-window-contract",
      "implement-sequential-lending-producers",
      "explain-gat-loan-invariants",
    ],
    prerequisites: ["gat-receiver-borrows"],
    title: "Sekwencyjne nakładające się okna mutowalne",
    subtitle:
      "Ten sam element może być zmieniany przez kolejne, zakończone pożyczki",
    minutes: 28,
    outcomes: [
      "Zaimplementujesz bezpieczne okna o szerokości jeden, równej długości i większej od danych.",
      "Obsłużysz WidthError::Zero oraz trwałe wyczerpanie bez paniki.",
      "Wyjaśnisz różnicę między współistniejącymi oknami shared a sekwencyjnymi oknami mutable.",
    ],
    steps: [
      choice(
        "windows-predict",
        "predict",
        "Co znaczy overlap?",
        "Czy dwa kolejne mutable okna mogą obejmować ten sam element?",
        [
          "Tak, jeśli pierwsza pożyczka kończy się przed następnym `next`.",
          "Tak, a oba wyniki mogą być żywe jednocześnie.",
          "Nie, overlap wymaga unsafe.",
        ],
        0,
        [
          "GAT wiąże każde okno z osobną, krótką pożyczką odbiorcy.",
          "Jednoczesne mutable aliasy odrzuca borrow checker.",
          "Sekwencyjne reborrow jest bezpieczne bez unsafe.",
        ],
      ),
      run(
        "windows-run",
        "Porównaj shared i lending",
        "Najpierw zwykłe slice::windows, potem dwa sekwencyjne sufiksy mutable z SuffixesMut. Sufiksy maleją, lecz obejmują wspólne elementy; w zadaniu głównym WindowsMut ma oddawać okna stałej szerokości.",
        windowsObservation,
        "niemutowalne: [1, 2, 3]\nniemutowalne: [2, 3, 4]\nniepokrywające mutable: [101, 102, 103, 104]\nnakłada się: [12, 3, 4]\ndane: [1, 12, 3, 4]\n",
      ),
      observe(
        "windows-discover",
        "Sprawdź E0499 dla okien",
        "Zostaw pierwszy sufiks żywy podczas drugiego next. Ten przykład z SuffixesMut powinien zakończyć się E0499; ta sama granica pożyczki dotyczy późniejszych okien stałej szerokości.",
        rejectedWindowLoan,
        suffixObservation,
        "E0499",
      ),
      choice(
        "windows-explain",
        "explain",
        "Kiedy kończy się producer?",
        "Które zdanie opisuje `WindowsMut`, a nie sam trait?",
        [
          "Każdy LendingIterator jest automatycznie fused.",
          "`WindowsMut` ustala szerokość, przesuw o jeden i trwałe None jako własne niezmienniki.",
          "WidthError::Zero jest wymagany przez każdy GAT.",
        ],
        1,
        [
          "Trait nie narzuca trwałego None.",
          "To konkretna polityka tego producenta.",
          "Błąd jest częścią API WindowsMut, nie ogólną cechą GAT.",
        ],
      ),
      coding({
        id: "gat-overlapping-mutable-windows-gate",
        kind: "debug",
        title: "Przesuwaj okno o jeden",
        prompt:
          "Napraw `WindowsMut<'data, T>` i dokładny konstruktor `new(data, width) -> Result<Self, WidthError>`. Zero ma zwracać dokładnie `Err(WidthError::Zero)`; dodatnia szerokość większa od danych i puste dane dają zainicjalizowany lender bez okien. Zwracaj okna długości `width`, każde przesunięte o jeden, także nakładające się. Pożyczkę aktualnego okna zakończ przed kolejnym poll; po wyczerpaniu każde `next` daje None. Obsłuż `checked_add`, nie używaj `unsafe`, `Copy`, `Clone`, gotowego iteratora okien ani dodatkowych boundów.",
        code: windowsStarter,
        solution: windowsSolution,
        tests: windowsTests,
        forbiddenPatterns: ["unsafe"],
        hints: [
          "Najpierw sprawdź `width > data.len() - position`, potem wylicz koniec i ustaw pozycję przed zwróceniem reborrow.",
          "Stan `done` chroni trwałe None; `position + 1` jest bezpieczne po sprawdzeniu poprawnego okna.",
        ],
        gate: true,
      }),
      coding({
        id: "gat-overlapping-mutable-windows-blank",
        kind: "blank",
        title: "Buduj rosnące prefiksy",
        prompt:
          "Zaimplementuj od pustej kartki `GrowingPrefixesMut<'data, T>` z konstruktorem `new` przyjmującym `&'data mut [T]` oraz `maximum: usize` i zwracającym ten typ, implementacją `LendingIterator` i `Item<'a> = &'a mut [T]`. Zdefiniuj również pełny trait `LendingIterator` w rozwiązaniu, włącznie z generycznym `Item<'a>` i `where Self: 'a`; nie ma ukrytej deklaracji poza biblioteką standardową. Metoda traitu `next` pożycza odbiorcę mutowalnie na lifetime `'a` i zwraca `Option<Self::Item<'a>>` związane z tą pożyczką. Przy pierwszym `next` oddaj prefiks długości 1, potem prefiksy długości 2, aż do długości równej `maximum` albo długości danych — wybierz mniejszą granicę. Dla `maximum == 0`, pustych danych lub po oddaniu najdłuższego prefiksu od razu zwracaj `None`; późniejsze `next` też mają zwracać `None`. Każdy prefiks zaczyna się w pozycji zero, więc kolejne wywołania mogą dotykać tych samych elementów; pożyczkę trzeba zakończyć przed kolejnym `next`. Nie używaj `unsafe`, `Copy`, `Clone` ani gotowego iteratora okien. Zdefiniuj prywatny stan, pełny podpis typu, implementację traitu i konstruktor na podstawie opisu.",
        solution: prefixBlankSolution,
        tests: growingTests,
        forbiddenPatterns: ["unsafe"],
        hints: [
          "Długość pierwszego prefiksu to 1; po oddaniu zwiększ ją przez saturating_add.",
          "Granica jest minimum z maximum i długości danych, a każdy zakres zaczyna się od zera.",
        ],
        gate: true,
      }),
      choice(
        "windows-recall",
        "recall",
        "Shared kontra mutable",
        "Dlaczego dwa `slice::windows` mogą żyć razem, a dwa wyniki `WindowsMut` nie?",
        [
          "Shared `&[T]` nie tworzą mutable aliasu; `&mut [T]` wymaga zakończenia pierwszej pożyczki.",
          "GAT zmienia zasady aliasingu tylko dla mutable.",
          "Oba przypadki wymagają Clone.",
        ],
        0,
        [
          "To różnica aliasingu referencji, a nie samego słowa GAT.",
          "GAT opisuje lifetime itemu i nie wyłącza borrow checkera.",
          "Clone nie rozwiązuje utrzymywania żywych pożyczek.",
        ],
      ),
    ],
    misconceptions: [
      "Wszystkie `windows` wymagają GAT.",
      "Nakładanie oznacza legalne jednoczesne mutable aliasy.",
      "Zero width można potraktować jak przeniesienie o zero i zwrócić pusty wynik.",
    ],
    transferTask:
      "Zaimplementuj odwrotne okna o stałej szerokości, z tym samym błędem zero i sekwencyjnym zwalnianiem pożyczek.",
    evidenceGate:
      "Kod definiuje granice szerokości, nakładanie, mutację niekopiowalnych rekordów, overflow-safe exhaustion i kolejne None.",
    sourceIds: [
      "gat-slice-windows",
      "gat-reference-associated-items",
      "gat-gats-stabilization",
      "gat-error-e0499",
    ],
  },
];

export const gatProducerReviewExercises: Record<string, LessonStep> = {
  "gat-receiver-borrows": coding({
    id: "gat-receiver-borrows-review",
    kind: "apply",
    title: "Powtórka: odwróć wiersze",
    prompt:
      "Zaimplementuj `ReverseRowLender<T>` z prywatnym stanem i `new(rows: Vec<Vec<T>>)`. Zdefiniuj pełny `LendingIterator` z `Item<'a> = &'a mut [T]`. Zacznij od ostatniego wiersza i idź do pierwszego; pusty wiersz nadal oddaj jako Some, pusty Vec nie daje elementów, a po ostatnim wierszu każde kolejne `next` zwraca None. Każdą pożyczkę zakończ przed następnym poll; nie klonuj, nie sortuj i nie spłaszczaj danych.",
    code: reverseRowStarter,
    solution: reverseRowSolution,
    tests: reverseRowTests,
    hints: [
      "Użyj pozycji `Option<usize>`, aby bezpiecznie obsłużyć pustą kolekcję i zejście do zera.",
      "Zapisz poprzednią pozycję przed reborrow; stan terminalny ustaw po zwróceniu wiersza o indeksie zero.",
    ],
  }),
  "gat-overlapping-mutable-windows": coding({
    id: "gat-overlapping-mutable-windows-review",
    kind: "apply",
    title: "Powtórka: okna od końca",
    prompt:
      "Zaimplementuj `ReverseWindowsMut<'data, T>` z `new(data, width) -> Result<Self, WidthError>` i tym samym traitem `LendingIterator`. Zwracaj okna stałej szerokości od ostatniego poprawnego początku do zera, więc dla danych długości 4 i width 3 kolejność początków to 1, 0. Zero daje `Err(WidthError::Zero)`, szerokość większa od danych i puste dane nie dają okien, a po wyczerpaniu wynik jest zawsze None. Użyj niekopiowalnych wartości i zwalniaj bieżącą pożyczkę przed kolejnym `next`.",
    code: reverseWindowStarter,
    solution: reverseWindowSolution,
    tests: reverseWindowTests,
    hints: [
      "Ostatni poprawny start to `data.len().checked_sub(width)`.",
      "Po zwróceniu startu zero zaznacz terminalny stan; nie odejmuj od zera bez checked_sub.",
    ],
  }),
};

export {
  rowTests,
  presentTests,
  windowsTests,
  growingTests,
  reverseRowTests,
  reverseWindowTests,
};
