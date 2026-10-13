import { fallibleCompositionLessons } from "./fallible-composition";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const iteratorsSources: Source[] = [
  {
    id: "iterators-std-cell",
    title: "Rust standard library: Cell",
    url: "https://doc.rust-lang.org/std/cell/struct.Cell.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie sposobu obserwowania licznika leniwego potoku.",
  },
  {
    id: "iterators-book",
    title:
      "The Rust Programming Language: Processing a Series of Items with Iterators",
    url: "https://doc.rust-lang.org/book/ch13-02-iterators.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu leniwości, adapterów, konsumentów lub własnego Iterator.",
  },
  {
    id: "iterators-std-iterator",
    title: "Rust standard library: Iterator trait",
    url: "https://doc.rust-lang.org/std/iter/trait.Iterator.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu next, Item lub metod short-circuit.",
  },
  {
    id: "iterators-std-into-iterator",
    title: "Rust standard library: IntoIterator trait",
    url: "https://doc.rust-lang.org/std/iter/trait.IntoIterator.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładu generycznego konsumenta i implementacji IntoIterator.",
  },
  {
    id: "iterators-error-move",
    title: "Rust Error Index: E0382 — borrow of moved value",
    url: "https://doc.rust-lang.org/error_codes/E0382.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty komunikat rustc przy zmianie przykładu przeniesienia przez into_iter.",
  },
];

export const iteratorsCompetencies: Competency[] = [
  {
    id: "choose-iterator-ownership",
    title:
      "Dobierasz iter, iter_mut albo into_iter do tego, kto ma czytać, zmieniać lub przejąć elementy.",
  },
  {
    id: "compose-lazy-iterators",
    title:
      "Budujesz leniwe potoki adapterów i rozpoznajesz moment ich wykonania oraz wcześniejsze zakończenie.",
  },
  {
    id: "implement-iterator-contracts",
    title:
      "Implementujesz Iterator i IntoIterator oraz piszesz konsumenta działającego z dowolnym iterowalnym źródłem.",
  },
];

export const iteratorsConcepts: Concept[] = [
  {
    id: "iterator-item-ownership",
    title: "Item mówi, czy iteracja pożycza, zmienia czy oddaje element",
    prerequisites: ["callable-contracts"],
    competencyIds: ["choose-iterator-ownership"],
    reviewPrompt:
      "Co otrzymasz z v.iter(), v.iter_mut() i v.into_iter() oraz kiedy właściciel v może być użyty ponownie?",
    reviewAnswer:
      "iter() daje kolejne &T, iter_mut() daje &mut T, a into_iter() zużywa kolekcję i daje T. Dwa pierwsze zachowują właściciela do dalszego użycia po zakończeniu pożyczki; into_iter przenosi kolekcję, więc jej dalsze użycie wymaga wcześniejszej własności lub innego widoku.",
    distinguish:
      "into_iter nie oznacza automatycznego klonowania. To wybór własności elementów wynikający z implementacji IntoIterator dla użytego odbiorcy.",
  },
  {
    id: "lazy-iterator-pipelines",
    title: "Leniwy potok adapterów i konsument kończący pracę",
    prerequisites: ["iterator-item-ownership"],
    competencyIds: ["compose-lazy-iterators"],
    reviewPrompt:
      "Kiedy wykona się map i filter oraz czym różni się collect od find w potoku z efektami ubocznymi?",
    reviewAnswer:
      "map i filter tylko opisują następne operacje; ich ciała wykonują się dopiero, gdy konsument poprosi o element. collect do Vec pobiera cały potok, a find pobiera do pierwszego dopasowania i kończy wcześniej, więc licznik efektów może być mniejszy.",
    distinguish:
      "Iterator nie jest kolekcją wyników. Utworzenie adaptera nie uruchamia callbacków; dopiero konsument taki jak collect, fold albo find przesuwa źródło.",
  },
  {
    id: "iterator-contracts",
    title: "Iterator::next i IntoIterator jako kontrakty API",
    prerequisites: ["lazy-iterator-pipelines"],
    competencyIds: ["implement-iterator-contracts"],
    reviewPrompt:
      "Jakie zachowanie musi zapewnić next i jak generyczny konsument może przyjąć Vec, tablicę albo własne źródło?",
    reviewAnswer:
      "Iterator ustala typ Item i zwraca Option<Item> z next: Some dla kolejnego elementu, None po wyczerpaniu. Konsument może przyjąć I: IntoIterator i iterować po I, delegując sposób uzyskania iteratora do implementacji IntoIterator.",
    distinguish:
      "Pierwsze None nie daje wszystkim iteratorom formalnej gwarancji, że kolejne next też zwróci None. Możesz tak zaprojektować własny finite iterator, ale nie wolno przypisywać tej cechy każdemu Iteratorowi bez kontraktu FusedIterator.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correctIndex: number,
  answers: [string, string, string],
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
      correct: String(correctIndex),
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
  code: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
  error?: string;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    code: options.code,
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    expectedStatus: options.error ? "compile-error" : "success",
    ...(options.error ? { expectedError: options.error } : {}),
    evidenceKind:
      options.kind === "debug"
        ? "fix"
        : options.kind === "blank"
          ? "assessment"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const ownershipRun = `fn main() {
    let mut records = vec![String::from("A"), String::from("B")];
    let borrowed: Vec<&String> = records.iter().collect();
    println!("{}|{}", borrowed[0], borrowed[1]);
    for record in records.iter_mut() {
        record.push('!');
    }
    println!("{}|{}", records[0], records[1]);
    let labels: Vec<String> = records.into_iter().map(|record| format!("owned:{record}")).collect();
    println!("{}|{}", labels[0], labels[1]);
}`;

const ownershipBroken = `struct Parcel { label: String }

fn main() {
    let parcels = vec![Parcel { label: String::from("Łódź") }];
    let first = parcels.into_iter().next();
    println!("pozostało: {}", parcels.len());
    println!("pierwszy: {}", first.unwrap().label);
}`;

const ownershipRepair = `struct Parcel { label: String }

fn main() {
    let parcels = vec![Parcel { label: String::from("Łódź") }];
    let remaining = parcels.len();
    let first = parcels.into_iter().next();
    println!("pozostało: {}", remaining);
    println!("pierwszy: {}", first.unwrap().label);
}`;

const ownershipModify = `#[derive(Debug, PartialEq)]
struct Record { label: String, seen: bool }

fn mark_seen(records: &mut [Record]) {
}

fn labels(records: Vec<Record>) -> Vec<String> {
    Vec::new()
}`;

const ownershipModifySolution = `#[derive(Debug, PartialEq)]
struct Record { label: String, seen: bool }

fn mark_seen(records: &mut [Record]) {
    for record in records.iter_mut() {
        record.seen = true;
    }
}

fn labels(records: Vec<Record>) -> Vec<String> {
    records.into_iter().map(|record| record.label).collect()
}`;

const ownershipModifyTests = `#[test]
fn mutating_borrows_and_consuming_owned_records_are_distinct() {
    let mut records = vec![
        Record { label: String::from("żółć"), seen: false },
        Record { label: String::from("Łódź"), seen: false },
    ];
    mark_seen(&mut records);
    assert!(records.iter().all(|record| record.seen));
    assert_eq!(records[0].label, "żółć");
    let pointers: Vec<_> = records.iter().map(|record| record.label.as_ptr()).collect();
    let owned = labels(records);
    assert_eq!(owned, vec!["żółć", "Łódź"]);
    assert_eq!(owned.iter().map(|label| label.as_ptr()).collect::<Vec<_>>(), pointers);
    let mut empty = Vec::new();
    mark_seen(&mut empty);
    assert!(labels(empty).is_empty());
}`;

const borrowedViewsSolution = `fn views<'a>(log: &'a [String], prefix: &str) -> Vec<&'a str> {
    log.iter()
        .filter(|line| line.starts_with(prefix))
        .map(|line| line.as_str())
        .collect()
}`;

const borrowedViewsStarter = `fn views<'a>(log: &'a [String], prefix: &str) -> Vec<&'a str> {
    Vec::new()
}`;

const borrowedViewsTests = `#[test]
fn views_borrow_unicode_in_order_and_keep_the_log_owned() {
    let log = vec![
        String::from("INFO: żółć"),
        String::from("WARN: Łódź"),
        String::from("INFO: pusty"),
        String::from("INFO: żółć"),
    ];
    let viewed = views(&log, "INFO:");
    assert_eq!(viewed, ["INFO: żółć", "INFO: pusty", "INFO: żółć"]);
    assert!(std::ptr::eq(viewed[0].as_ptr(), log[0].as_ptr()));
    assert_eq!(views(&log, "ERROR:"), Vec::<&str>::new());
    assert_eq!(log[1], "WARN: Łódź");
}`;

const pipelineRun = `fn main() {
    let words = ["rdzeń", "Rust", "iter", "żółć"];
    let result: Vec<String> = words
        .iter()
        .filter(|word| word.len() >= 4)
        .map(|word| word.to_uppercase())
        .collect();
    println!("{}", result.join("|"));
}`;

const foldRun = `fn main() {
    let values = [3, -2, 4];
    let total = values.iter().copied().fold(0i32, |sum, value| sum + value);
    println!("suma: {}", total);
}`;

const pipelineModify = `fn selected_lengths(words: &[String], minimum: usize) -> Vec<usize> {
    words.iter()
        .filter(|word| word.len() >= minimum)
        .map(|word| word.len())
        .collect()
}`;

const pipelineModifySolution = pipelineModify;
const pipelineModifyStarter = `fn selected_lengths(words: &[String], minimum: usize) -> Vec<usize> {
    Vec::new()
}`;

const pipelineModifyTests = `#[test]
fn map_filter_collect_keep_order_and_unicode_byte_lengths() {
    let words = [
        String::from("a"),
        String::from("żółć"),
        String::from("Rust"),
        String::from(""),
    ];
    assert_eq!(selected_lengths(&words, 4), vec![8, 4]);
    assert_eq!(selected_lengths(&words, 99), Vec::<usize>::new());
    assert_eq!(selected_lengths(&words, usize::MAX), Vec::<usize>::new());
    assert_eq!(selected_lengths(&[], 0), Vec::<usize>::new());
    assert_eq!(words[1], "żółć");
}`;

const shortCircuitStarter = `fn first_accepted<F>(values: &[i32], mut accepts: F) -> Option<i32>
where
    F: FnMut(i32) -> bool,
{
    None
}`;

const shortCircuitSolution = `fn first_accepted<F>(values: &[i32], mut accepts: F) -> Option<i32>
where
    F: FnMut(i32) -> bool,
{
    values.iter().copied().find(|value| accepts(*value))
}`;

const shortCircuitTests = `#[test]
fn find_stops_at_first_accepted_value_and_preserves_order() {
    let values = [-4, 0, 8, 11];
    let mut seen = Vec::new();
    let found = first_accepted(&values, |value| {
        seen.push(value);
        value > 0
    });
    assert_eq!(found, Some(8));
    assert_eq!(seen, vec![-4, 0, 8]);
    assert_eq!(first_accepted(&[], |_| true), None);
    assert_eq!(first_accepted(&[0, -1], |value| value > 0), None);
    assert_eq!(first_accepted(&values, |value| value >= 11), Some(11));
    assert_eq!(values, [-4, 0, 8, 11]);
}`;

const lazyCounterStarter = `use std::cell::Cell;

fn even_squares<'a>(values: &'a [i32], calls: &'a Cell<usize>) -> impl Iterator<Item = i32> + 'a {
    std::iter::empty::<i32>()
}`;

const lazyCounterSolution = `use std::cell::Cell;

fn even_squares<'a>(values: &'a [i32], calls: &'a Cell<usize>) -> impl Iterator<Item = i32> + 'a {
    values.iter()
        .map(|value| {
            calls.set(calls.get() + 1);
            value * value
        })
        .filter(|value| value % 2 == 0)
}`;

const lazyCounterTests = `#[test]
fn lazy_pipeline_does_nothing_before_collect_and_then_visits_all() {
    let values = [1, 2, 3, 4];
    let calls = std::cell::Cell::new(0);
    let mut pipeline = even_squares(&values, &calls);
    assert_eq!(calls.get(), 0);
    assert_eq!(pipeline.next(), Some(4));
    assert_eq!(calls.get(), 2);
    let rest: Vec<_> = pipeline.collect();
    assert_eq!(rest, vec![16]);
    assert_eq!(calls.get(), 4);
    let empty_calls = std::cell::Cell::new(0);
    assert_eq!(even_squares(&[], &empty_calls).collect::<Vec<_>>(), Vec::<i32>::new());
    assert_eq!(empty_calls.get(), 0);
}`;

const deferredMapStarter = `fn deferred_map<'a, F>(values: &'a [i32], mut transform: F) -> impl Iterator<Item = i32> + 'a
where F: FnMut(i32) -> i32 + 'a,
{
    let eager: Vec<i32> = values.iter().map(|value| transform(*value)).collect();
    eager.into_iter()
}`;
const deferredMapSolution = `fn deferred_map<'a, F>(values: &'a [i32], mut transform: F) -> impl Iterator<Item = i32> + 'a
where F: FnMut(i32) -> i32 + 'a,
{
    values.iter().map(move |value| transform(*value))
}`;
const deferredMapTests = `#[test]
fn callback_runs_only_for_requested_items() {
    let calls = std::cell::Cell::new(0);
    let values = [7, -2, 0];
    let mut pending = deferred_map(&values, |value| {
        calls.set(calls.get() + 1);
        value + 3
    });
    assert_eq!(calls.get(), 0);
    assert_eq!(pending.next(), Some(10));
    assert_eq!(calls.get(), 1);
    assert_eq!(pending.next(), Some(1));
    assert_eq!(calls.get(), 2);
    drop(pending);
    assert_eq!(calls.get(), 2);
    assert_eq!(deferred_map(&values, |value| -value).collect::<Vec<_>>(), [-7, 2, 0]);
    let empty = deferred_map(&[], |value| { calls.set(99); value });
    assert_eq!(empty.count(), 0);
    assert_eq!(calls.get(), 2);
}`;

const bagSolution = `struct Bag<T> { items: Vec<T> }

impl<T> IntoIterator for Bag<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        self.items.into_iter()
    }
}

fn render_all<I, T>(items: I) -> String
where
    I: IntoIterator<Item = T>,
    T: std::fmt::Display,
{
    items.into_iter().map(|item| item.to_string()).collect::<Vec<_>>().join(",")
}`;

const bagStarter = `struct Bag<T> { items: Vec<T> }

impl<T> IntoIterator for Bag<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        Vec::new().into_iter()
    }
}

fn render_all<I, T>(items: I) -> String
where
    I: IntoIterator<Item = T>,
    T: std::fmt::Display,
{
    String::new()
}`;

const bagTests = `struct Ticket { number: u8 }
impl std::fmt::Display for Ticket {
    fn fmt(&self, output: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(output, "T{}", self.number)
    }
}
#[test]
fn generic_consumer_accepts_owned_bag_array_and_empty_input() {
    let text = render_all(Bag { items: vec![String::from("żółć"), String::from("Łódź")] });
    assert_eq!(text, "żółć,Łódź");
    assert_eq!(render_all([3, 1, 2]), "3,1,2");
    assert_eq!(render_all(Vec::<u8>::new()), "");
    assert_eq!(render_all(Bag { items: vec![Ticket { number: 7 }, Ticket { number: 0 }] }), "T7,T0");
}`;

const positionsSolution = `struct FinitePositions {
    next: usize,
    end: usize,
}

impl Iterator for FinitePositions {
    type Item = usize;

    fn next(&mut self) -> Option<Self::Item> {
        if self.next >= self.end {
            None
        } else {
            let position = self.next;
            self.next += 1;
            Some(position)
        }
    }
}

fn positions(end: usize) -> FinitePositions {
    FinitePositions { next: 0, end }
}`;

const positionsTests = `#[test]
fn finite_positions_are_ordered_empty_and_stably_exhausted() {
    let mut iterator = positions(3);
    assert_eq!(iterator.next(), Some(0));
    assert_eq!(iterator.next(), Some(1));
    assert_eq!(iterator.next(), Some(2));
    assert_eq!(iterator.next(), None);
    assert_eq!(iterator.next(), None);
    assert_eq!(positions(0).collect::<Vec<_>>(), Vec::<usize>::new());
    assert_eq!(positions(4).collect::<Vec<_>>(), vec![0, 1, 2, 3]);
}`;

export const iteratorsLessons: Lesson[] = [
  {
    id: "iterator-ownership",
    moduleId: "iterators",
    conceptIds: ["iterator-item-ownership"],
    competencyIds: ["choose-iterator-ownership"],
    prerequisites: ["closure-contracts"],
    title: "Trzy sposoby przejścia po danych",
    subtitle:
      "Zobaczysz, kiedy iterator pożycza element, zmienia go albo przejmuje na własność.",
    minutes: 22,
    outcomes: [
      "Rozróżnisz Item = &T, &mut T i T w typowych kolekcjach.",
      "Dobierzesz iter_mut do zmiany rekordów bez klonowania.",
      "Rozpoznasz E0382 po użyciu into_iter i naprawisz kolejność operacji.",
    ],
    sessionStops: [
      {
        afterStepId: "ownership-explain",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zmień elementy przez iter_mut i zachowaj właściciela. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "ownership-modify",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Przenieś wybór własności iteratora do zadania od pustej kartki. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      choose(
        "ownership-predict",
        "predict",
        "Przewidź właściciela elementów",
        "W jednym programie records.iter() ma wypisać pożyczone etykiety, iter_mut() dopisać !, a into_iter() zbudować Vec<String> z posiadanych rekordów. Które zdanie opisuje kolejność i własność poprawnie?",
        0,
        [
          "iter daje &String, iter_mut daje &mut String, a into_iter zużywa Vec i daje String",
          "Każdy z trzech iteratorów daje String, więc kolekcja jest klonowana trzy razy",
          "iter_mut zużywa Vec, a into_iter zawsze tylko pożycza elementy",
        ],
        [
          "To trzy różne kontrakty Item; tylko trzeci przejmuje kolekcję.",
          "Pożyczone elementy nie są automatycznie klonowane, a typ Item zależy od iteratora.",
          "iter_mut pożycza mutably, a into_iter dla posiadanej Vec oddaje własność elementów.",
        ],
      ),
      run(
        "ownership-run",
        "Uruchom trzy widoki",
        "Uruchom kod i porównaj trzy linie. Pierwsza nie modyfikuje rekordów, druga korzysta z mutable borrow, a trzecia działa już na posiadanych danych i może oddać String bez Clone.",
        ownershipRun,
        "A|B\nA!|B!\nowned:A!|owned:B!\n",
      ),
      compilerError(
        "ownership-error",
        "Zobacz E0382 po przeniesieniu",
        "Uruchom diagnostykę. into_iter konsumuje parcels, więc próba użycia parcels.len() po tej linii odwołuje się do przeniesionej wartości. Najpierw odczytaj potrzebny fakt albo użyj pożyczającego iteratora.",
        ownershipBroken,
        ownershipRepair,
        "E0382",
      ),
      choose(
        "ownership-explain",
        "explain",
        "Pożyczka kontra własność",
        "Dlaczego funkcja może przyjąć &mut [Record], ustawić pole seen, a osobna funkcja przyjąć Vec<Record> i oddać etykiety jako Vec<String>?",
        1,
        [
          "&mut zawsze kopiuje rekordy, a Vec zawsze je usuwa po jednym elemencie",
          "&mut pozwala zmienić istniejące elementy przez pożyczkę, a Vec daje funkcji własność do przeniesienia pól",
          "Obie funkcje muszą wymagać Clone, bo iterator nie rozróżnia pożyczki i przeniesienia",
        ],
        [
          "Mutable borrow zmienia dane u właściciela i nie robi kopii.",
          "Odbiorca Vec może zużyć strukturę i przenieść String bez klonowania.",
          "Iterator zachowuje kontrakt Item; Clone nie jest potrzebny do tych operacji.",
        ],
      ),
      coding({
        id: "ownership-modify",
        kind: "modify",
        title: "Zmień rekordy, potem je przejmij",
        prompt:
          "Zachowaj dwa osobne kontrakty. mark_seen ma przez iter_mut ustawić seen dla każdego rekordu. labels ma skonsumować Vec<Record> przez into_iter i oddać etykiety w tej samej kolejności. Nie dodawaj Clone ani nie twórz kopii String.",
        code: ownershipModify,
        solution: ownershipModifySolution,
        tests: ownershipModifyTests,
        gate: true,
        hints: [
          "Pierwsza funkcja potrzebuje mutable borrow elementu; druga ma już własność całej Vec.",
          "Użyj iter_mut w pętli do pola seen, a w labels map przenoszącego record.label i collect.",
        ],
      }),
      coding({
        id: "ownership-blank",
        kind: "apply",
        title: "Napraw pożyczane widoki logu",
        prompt:
          "Napraw views. Ma przyjąć pożyczony wycinek napisów oraz pożyczony prefiks, przejść po liniach w kolejności, zatrzymać te zaczynające się od prefiksu i oddać Vec pożyczonych widoków. Widoki muszą wskazywać na napisy z wejścia: nie przenoś ich, nie alokuj nowych Stringów i zachowaj znaki Unicode. Dla braku dopasowań wynik jest pusty.",
        code: borrowedViewsStarter,
        solution: borrowedViewsSolution,
        tests: borrowedViewsTests,
        gate: true,
        hints: [
          "Szukaj pożyczającego przejścia po logu, a wynik opisuj jako widoki związane z jego życiem.",
          "Filtruj line.starts_with(prefix), potem zamień &String na &str przez as_str i zbierz pożyczone referencje.",
        ],
      }),
    ],
    misconceptions: [
      "iter zawsze oddaje własność String, bo pętla może użyć wartości jako argumentu.",
      "iter_mut tworzy kopię elementu, więc zmiana nie dotyczy oryginalnej kolekcji.",
      "into_iter jest tylko inną nazwą dla iter i pozwala użyć kolekcji po pętli.",
      "Pożyczane widoki Unicode wymagają Clone, aby były bezpieczne.",
    ],
    transferTask:
      "Zaprojektuj funkcję, która pożycza dopasowane widoki, mutuje rekordy przez iter_mut i dopiero osobno konsumuje kolekcję, gdy ma oddać własność.",
    evidenceGate:
      "Zadania ownership-modify i ownership-blank przechodzą testy dla typów niekopiowalnych, pustych wejść, Unicode i zachowanej kolejności.",
    sourceIds: [
      "iterators-book",
      "iterators-std-iterator",
      "iterators-error-move",
    ],
  },
  {
    id: "iterator-pipelines",
    moduleId: "iterators",
    conceptIds: ["lazy-iterator-pipelines"],
    competencyIds: ["compose-lazy-iterators"],
    prerequisites: ["iterator-ownership"],
    title: "Potok, który rusza dopiero na żądanie",
    subtitle:
      "Łączysz adaptery i kończysz pracę dokładnie przy pierwszym wyniku.",
    minutes: 20,
    outcomes: [
      "Połączysz filter, map i collect w potok zachowujący kolejność.",
      "Porównasz pobranie całego potoku z zakończeniem przy pierwszym dopasowaniu.",
      "Użyjesz find i fold, rozumiejąc pełną oraz skróconą konsumpcję.",
    ],
    steps: [
      choose(
        "pipelines-predict",
        "predict",
        "Kiedy wykona się callback?",
        "Kod tworzy values.iter().map(|value| { calls += 1; value * 2 }).filter(...), ale jeszcze nie wywołuje collect. Ile wynosi calls przed konsumentem?",
        0,
        [
          "0",
          "Liczba elementów values",
          "1, bo utworzenie map pobiera pierwszy element",
        ],
        [
          "Adaptery są leniwe; sama konstrukcja potoku nie przesuwa źródła.",
          "Bez konsumenta żaden element nie przechodzi przez map.",
          "Pierwszy element jest pobierany dopiero po next wywołanym przez konsumenta.",
        ],
      ),
      run(
        "pipelines-run",
        "Uruchom map i filter",
        "Uruchom kod, zwróć uwagę na kolejność i Unicode. filter decyduje, które elementy trafią do mapowanego wyniku, a collect konsumuje cały potok.",
        pipelineRun,
        "RDZEŃ|RUST|ITER|ŻÓŁĆ\n",
      ),
      run(
        "pipelines-fold-run",
        "Zredukuj cały potok przez fold",
        "fold jest konsumentem: pobiera każdy element i zaczyna od jawnego akumulatora 0. Uruchom kod i sprawdź, że wynik liczbowy zachowuje znaki oraz kolejność dodawania.",
        foldRun,
        "suma: 5\n",
      ),
      choose(
        "pipelines-explain",
        "explain",
        "Adapter i konsument",
        "Które zdanie poprawnie odróżnia adaptery od konsumentów iteratora?",
        2,
        [
          "filter i map od razu tworzą Vec, a collect tylko zmienia nazwę Vec",
          "find zawsze odwiedza wszystkie elementy, aby udowodnić brak kolejnych wyników",
          "map i filter opisują pracę, a collect, fold i find proszą źródło o elementy",
        ],
        [
          "Adapter zwraca iterator, a nie gotową kolekcję.",
          "find kończy się przy pierwszym dopasowaniu i nie musi znać reszty.",
          "Konsument uruchamia leniwy potok, a find dodatkowo może zakończyć go wcześnie.",
        ],
      ),
      coding({
        id: "pipelines-modify",
        kind: "modify",
        title: "Zachowaj kolejność długości",
        prompt:
          "Uzupełnij selected_lengths. Przejdź pożyczająco po words, zostaw słowa o długości co najmniej minimum, zamień je na długość i zbierz wynik. Nie sortuj, nie zmieniaj wejścia i nie wymagaj własności String.",
        code: pipelineModifyStarter,
        solution: pipelineModifySolution,
        tests: pipelineModifyTests,
        gate: true,
        hints: [
          "Potok potrzebuje dwóch etapów: decyzji filter i wartości wynikowej map.",
          "iter pożycza String, więc filter może badać word, a map zwrócić word.len(); collect domyka Vec<usize>.",
        ],
      }),
      coding({
        id: "pipelines-apply",
        kind: "apply",
        title: "Zatrzymaj się na pierwszym zaakceptowanym",
        prompt:
          "Dokończ first_accepted bez ręcznej pętli po indeksach. Callback accepts definiuje warunek akceptacji i ma być wywoływany w kolejności aż do pierwszej wartości true (testy użyją różnych progów). Zwróć tę wartość, a po pustym wejściu lub braku dopasowania None. Nie wywołuj callbacka dla elementów po znalezionym wyniku.",
        code: shortCircuitStarter,
        solution: shortCircuitSolution,
        tests: shortCircuitTests,
        gate: true,
        hints: [
          "Potrzebujesz konsumenta short-circuit, który oddaje pierwszy pasujący element.",
          "Pożycz values przez iter, skopiuj tylko i32 przez copied, a następnie użyj find z predykatem accepts.",
        ],
      }),
    ],
    misconceptions: [
      "map wykonuje callback natychmiast i przechowuje wszystkie wyniki.",
      "collect zawsze zatrzymuje się po pierwszym elemencie.",
      "find musi przejść całość, zanim zwróci Some.",
      "Unicode ma długość równą liczbie znaków w każdej metodzie len.",
    ],
    transferTask:
      "Zbuduj potok, którego efekt uboczny pozwala zmierzyć pełną konsumpcję przez collect i wcześniejsze zakończenie przez find.",
    evidenceGate:
      "Zadania pipelines-modify i pipelines-apply zachowują kolejność, pustkę, Unicode oraz kończą wyszukiwanie przy pierwszym dopasowaniu.",
    sourceIds: ["iterators-book", "iterators-std-iterator"],
  },
  {
    id: "iterator-laziness",
    moduleId: "iterators",
    conceptIds: ["lazy-iterator-pipelines"],
    competencyIds: ["compose-lazy-iterators"],
    prerequisites: ["iterator-pipelines"],
    title: "Leniwość: wykonaj dopiero na żądanie",
    subtitle:
      "Mierzysz moment wykonania potoku i odraczasz callback do pobrania elementu.",
    minutes: 18,
    outcomes: [
      "Rozpoznasz brak pracy przy samym utworzeniu adaptera.",
      "Sprawdzisz, że next wykonuje tylko pracę potrzebną do kolejnego wyniku.",
      "Zwrócisz iterator, który przechowuje callback bez przedwczesnego collect.",
    ],
    steps: [
      choose(
        "laziness-predict",
        "predict",
        "Przewidź moment pracy",
        "Potok ma map zwiększający licznik, ale jeszcze nie wywołano next ani collect. Ile razy wykona się callback przy samym utworzeniu iteratora?",
        0,
        ["0", "Raz", "Tyle, ile jest elementów wejścia"],
        [
          "Adapter opisuje pracę, ale nie pobiera elementu bez konsumenta.",
          "Pierwsza prośba o element dopiero uruchamia potrzebne adaptery.",
          "Pełne przejście następuje dopiero przy konsumencie pobierającym całość.",
        ],
      ),
      choose(
        "laziness-cell-explain",
        "explain",
        "Po co Cell w obserwacji?",
        "Dlaczego ćwiczenie używa `Cell<usize>` przy liczniku callbacków zamiast przekazywać zwykły `&mut usize` do zwracanego iteratora?",
        0,
        [
          "Cell pozwala odczytać i zmienić prosty licznik przez współdzieloną referencję, aby obserwować stan podczas życia iteratora.",
          "Cell jest inteligentnym wskaźnikiem i przejmuje własność całego wejścia.",
          "Cell sprawia, że adapter staje się eager i wykona map przy tworzeniu.",
        ],
        [
          "Cell to mały pojemnik z interior mutability użyty tu jako przyrząd pomiarowy; nie jest smart pointerem.",
          "Cell nie jest wskaźnikiem i nie zmienia własności źródła.",
          "Licznik obserwuje właśnie opóźnione wykonanie; Cell go nie uruchamia.",
        ],
      ),
      coding({
        id: "pipelines-lazy-counter",
        kind: "debug",
        title: "Napraw obserwację leniwości",
        prompt:
          "Zwróć leniwy iterator parzystych kwadratów dla liczb wejściowych od -1000 do 1000. Samo utworzenie nie może wykonać obliczeń. Każde next ma odwiedzić tylko elementy potrzebne do kolejnego wyniku; collect pobierze resztę. Do obserwacji używamy Cell<usize>: get odczytuje licznik, set go zmienia przez współdzieloną referencję. Zwiększaj licznik raz na odwiedzony element. Puste wejście nie wywołuje żadnej operacji.",
        code: lazyCounterStarter,
        solution: lazyCounterSolution,
        tests: lazyCounterTests,
        gate: true,
        hints: [
          "Licznik zwiększaj wewnątrz map, a nie przy tworzeniu iteratora ani poza nim.",
          "Zwróć adaptery bez collect. Testy proszą najpierw tylko o jeden pasujący wynik, a potem konsumują resztę.",
        ],
      }),
      coding({
        id: "pipelines-deferred-gate",
        kind: "debug",
        title: "Odrocz callback do żądania klienta",
        prompt:
          "deferred_map ma zwrócić iterator przekształconych liczb. Starter oddaje iterator, lecz za wcześnie wywołuje transform. Napraw moment wykonania: zero wywołań przy tworzeniu, dokładnie jedno na każde pobrane wejście, żadnych dla niepobranej reszty lub pustki. Callback może zmieniać stan. impl Iterator opisuje typ wyniku; + 'a pozwala mu przechowywać pożyczki ważne przez 'a. Zachowaj API.",
        code: deferredMapStarter,
        solution: deferredMapSolution,
        tests: deferredMapTests,
        gate: true,
        hints: [
          "Znajdź operację, która prosi o wszystkie elementy jeszcze wewnątrz funkcji.",
          "Zwróć leniwy adapter i przenieś callback do jego closure. Wyniki powstaną dopiero przy pobieraniu elementów.",
        ],
      }),
      choose(
        "laziness-recall",
        "recall",
        "Adapter nie jest wynikiem",
        "Co robi `map` bez konsumenta?",
        0,
        [
          "Zwraca opis dalszej pracy jako iterator; nie wywołuje jeszcze callbacku.",
          "Tworzy gotowy Vec i wykonuje callback dla wszystkich elementów.",
          "Zawsze pobiera dokładnie jeden element, nawet bez next.",
        ],
        [
          "Adapter pozostaje leniwy do czasu next, collect, fold lub innego konsumenta.",
          "map nie materializuje wyników samodzielnie.",
          "Bez konsumenta nie ma żądania pobrania elementu.",
        ],
      ),
    ],
    misconceptions: [
      "Utworzenie adaptera od razu wywołuje map i filter.",
      "collect jest częścią każdego adaptera i nie zmienia momentu pracy.",
      "Cell przejmuje własność źródłowego wycinka.",
    ],
    transferTask:
      "Zaprojektuj iterator z obserwowalnym licznikiem, który przy next wykonuje tylko konieczny fragment transformacji, a przy collect kończy resztę.",
    evidenceGate:
      "Zadania pipelines-lazy-counter i pipelines-deferred-gate potwierdzają zero pracy przy utworzeniu, częściową konsumpcję przez next i pełną przez collect.",
    sourceIds: [
      "iterators-book",
      "iterators-std-iterator",
      "iterators-std-cell",
    ],
  },
  {
    id: "iterator-contracts",
    moduleId: "iterators",
    conceptIds: ["iterator-contracts"],
    competencyIds: ["implement-iterator-contracts"],
    prerequisites: ["iterator-laziness"],
    title: "Własny iterator i wspólny konsument",
    subtitle:
      "Zaimplementujesz next, ustalisz Item i przyjmiesz różne źródła przez IntoIterator.",
    minutes: 25,
    outcomes: [
      "Zaimplementujesz Iterator z Option<Item> i kontrolą wyczerpania.",
      "Zaimplementujesz IntoIterator dla własnego pojemnika bez Clone.",
      "Napiszesz generycznego konsumenta dla Vec, tablicy i własnego źródła.",
    ],
    sessionStops: [
      {
        afterStepId: "contracts-explain",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Napraw IntoIterator i generycznego konsumenta. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "contracts-modify",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zbuduj własny skończony iterator od pustej kartki. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "contracts-recall",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Podejmij otwarty problem raportu, wybierając własne API i politykę błędu. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      choose(
        "contracts-predict",
        "predict",
        "Co zwróci kolejne next?",
        "Własny finite iterator zwraca 0, 1, 2, potem None. Jaki wynik ma sekwencja next(), next(), next(), next(), next() po poprawnym zakończeniu?",
        1,
        [
          "Some(0), Some(1), Some(2), Some(2), Some(2)",
          "Some(0), Some(1), Some(2), None, None",
          "None, Some(0), Some(1), Some(2), None",
        ],
        [
          "Iterator może oddawać ten sam element dopiero po ponownym ustawieniu stanu; poprawne wyczerpanie nie powtarza 2.",
          "Ten własny kontrakt po osiągnięciu końca pozostaje wyczerpany, więc kolejne next też dają None.",
          "Pierwsze next pobiera bieżącą pozycję 0, nie kończy iteratora.",
        ],
      ),
      run(
        "contracts-run",
        "Uruchom własne next",
        "Uruchom przykład. Zobacz, że Iterator oddaje Option<Item>, a explicitne ponowne next po None pozostaje None, bo tak zaprojektowano ten finite iterator.",
        `${positionsSolution}

fn main() {
    let mut positions = positions(3);
    println!("{:?} {:?} {:?} {:?} {:?}", positions.next(), positions.next(), positions.next(), positions.next(), positions.next());
}`,
        "Some(0) Some(1) Some(2) None None\n",
      ),
      choose(
        "contracts-explain",
        "explain",
        "Iterator a IntoIterator",
        "Co najlepiej opisuje relację Iterator i IntoIterator w funkcji render_all<I: IntoIterator>(items: I)?",
        0,
        [
          "IntoIterator opisuje, jak z I uzyskać iterator, a Iterator opisuje kolejne Item przez next",
          "IntoIterator wymaga, aby każdy element był Copy, a Iterator zawsze zużywa właściciela",
          "To dwa niezależne sposoby formatowania i żaden nie definiuje Option<Item>",
        ],
        [
          "Generyczny konsument może wywołać into_iter, a potem używać wspólnego interfejsu next/pętli.",
          "Własność wynika z konkretnej implementacji; Item może być pożyczką lub wartością.",
          "Iterator::next ma właśnie wynik Option<Self::Item>.",
        ],
      ),
      coding({
        id: "contracts-modify",
        kind: "modify",
        title: "Uruchom pojemnik przez IntoIterator",
        prompt:
          "Napraw Bag::into_iter oraz render_all. Pojemnik ma oddać swoje elementy, a konsument ma przyjąć dowolne I: IntoIterator<Item = T>, wywołać into_iter, zamienić każdy T przez Display na String i połączyć elementy przecinkiem. Zachowaj Bag<T> jako konsumowany pojemnik; nie dodawaj Clone ani sortowania.",
        code: bagStarter,
        solution: bagSolution,
        tests: bagTests,
        gate: true,
        hints: [
          "Kontrakt mówi o całym wejściu I, ale wynik budujesz po uzyskaniu jego iteratora.",
          "Wywołaj items.into_iter(), map item.to_string(), zbierz Vec<String> i użyj join(',').",
        ],
      }),
      coding({
        id: "contracts-blank",
        kind: "blank",
        title: "Od pustej strony: skończony iterator pozycji",
        prompt:
          "Od pustej strony zaprojektuj API małego iteratora FinitePositions. Konstruktor positions przyjmuje granicę końcową typu usize i zwraca iterator pozycji od zera do wartości o jeden mniejszej. Każde next ma zwrócić kolejną liczbę w Option; po końcu ma zwracać None także przy wszystkich dalszych wywołaniach. Zachowaj kolejność, obsłuż granicę zero i nie używaj gotowego range w środku next. Nie dostajesz startera ani podpisu — zapisz sam typ, implementację kontraktu i konstruktor na podstawie opisu.",
        code: "",
        solution: positionsSolution,
        tests: positionsTests,
        gate: true,
        hints: [
          "Stan musi pamiętać następną pozycję i granicę, a Item powinien być prostym typem liczbowym.",
          "W next sprawdź, czy bieżąca pozycja osiągnęła end; jeśli nie, zapisz ją, zwiększ stan i zwróć Some.",
        ],
      }),
      choose(
        "contracts-recall",
        "recall",
        "Nie obiecuj za dużo Iteratorowi",
        "Własny FinitePositions zwraca None bez końca. Które zdanie jest precyzyjne?",
        2,
        [
          "Każdy typ implementujący Iterator musi być FusedIterator.",
          "Po pierwszym None każdy Iterator musi zwracać Some w kolejnym next, aby dać się wznowić.",
          "Ten własny typ może mieć stabilne None; to jego świadomie zaprojektowane zachowanie, a nie automatyczna obietnica całego Iteratora.",
        ],
        [
          "Iterator nie gwarantuje automatycznie fused behavior; FusedIterator wyraża silniejszy kontrakt.",
          "Po None typ może pozostać wyczerpany; nie istnieje taka ogólna reguła wznowienia.",
          "Kontrakt konkretnego typu może zapewnić powtarzalne None, co sprawdzają testy.",
        ],
      ),
      {
        id: "contracts-open-checkpoint",
        kind: "assessment",
        title: "Otwarty problem: raport z odczytów",
        prompt:
          "Zaprojektuj analizę małej kolekcji odczytów trzymanej w pamięci. Każdy wpis ma własną etykietę, informację o aktywności i tekstowy zapis liczby. Raport wybiera aktywne wpisy o wartości co najmniej ustalonego progu i porządkuje je od największej wartości; sam określ i uzasadnij kolejność remisów. Wybierz jawną politykę dla aktywnego wpisu z niepoprawną liczbą: odrzucenie całego raportu albo pominięcie z informacją o odrzuceniu. Nie zastępuj błędu zerem. Nazwy, podpisy, typy, podział i sposób użycia iteratorów wybierasz sam. Uzasadnij też, czy kolekcja pozostaje dostępna po analizie. Napisz własny test zwykły i graniczny obejmujący pustkę, zero, remis lub błędną liczbę. Następnie zmień wymaganie: raport pokazuje tylko pierwsze k pozycji, także k = 0; zaktualizuj rozwiązanie i test. Dokumentacja jest dozwolona, lokalny Cargo opcjonalny, pomoc ujawnij. Zapisz, co faktycznie uruchomiono. Kryteria służą samoocenie; aplikacja nie potwierdza automatycznie poprawności semantycznej, niezależnej architektury ani opanowania materiału.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Uzasadniam własne typy, API, podział odpowiedzialności i wybór pożyczania lub przejmowania danych.",
            "Pokazuję selekcję, kolejność i jednoznaczne zachowanie przy niepoprawnych danych oraz remisie.",
            "Dołączam własny test zwykły i graniczny (pusta kolekcja, zero, remis lub niepoprawny zapis); zapisuję rzeczywisty wynik albo brak uruchomienia.",
            "Realizuję zmienione wymaganie i aktualizuję testy, wyjaśniając wpływ na potok.",
            "Samoocena i ujawniona pomoc nie zastępują sprawdzenia semantyki, architektury ani samodzielności.",
          ],
        },
        rubric: [
          "Uzasadniam własne typy, API, podział odpowiedzialności i wybór pożyczania lub przejmowania danych.",
          "Pokazuję selekcję, kolejność i jednoznaczne zachowanie przy niepoprawnych danych oraz remisie.",
          "Dołączam własny test zwykły i graniczny (pusta kolekcja, zero, remis lub niepoprawny zapis); zapisuję rzeczywisty wynik albo brak uruchomienia.",
          "Realizuję zmienione wymaganie i aktualizuję testy, wyjaśniając wpływ na potok.",
          "Samoocena i ujawniona pomoc nie zastępują sprawdzenia semantyki, architektury ani samodzielności.",
        ],
        evidenceKind: "self-rating",
      },
    ],
    misconceptions: [
      "Iterator::next zwraca zawsze Item, więc None jest tylko sygnałem błędu.",
      "Implementacja IntoIterator wymaga Clone, bo pętla for kopiuje elementy.",
      "Każdy Iterator jest automatycznie FusedIterator po pierwszym None.",
      "Generyczny IntoIterator konsument musi znać konkretny typ kolekcji.",
    ],
    transferTask:
      "Zaimplementuj własne źródło z wyraźnym stanem końca i przepuść je przez generyczny konsument akceptujący także puste oraz niekopiowalne dane.",
    evidenceGate:
      "Zadania contracts-modify i contracts-blank sprawdzają IntoIterator, kolejność, typy bez Clone, pusty zakres i wielokrotne next po None.",
    sourceIds: [
      "iterators-book",
      "iterators-std-iterator",
      "iterators-std-into-iterator",
    ],
  },
];

const reviewOwnershipSolution = `struct Parcel { label: String, priority: bool }

fn urgent_labels(parcels: &[Parcel]) -> Vec<&str> {
    parcels.iter()
        .filter(|parcel| parcel.priority)
        .map(|parcel| parcel.label.as_str())
        .collect()
}`;

const reviewOwnershipStarter = `struct Parcel { label: String, priority: bool }

fn urgent_labels(parcels: &[Parcel]) -> Vec<&str> {
    Vec::new()
}`;

const reviewOwnershipTests = `#[test]
fn review_views_borrow_and_filter_without_consuming_parcels() {
    let parcels = [
        Parcel { label: String::from("A"), priority: false },
        Parcel { label: String::from("żółć"), priority: true },
        Parcel { label: String::from("Łódź"), priority: true },
    ];
    assert_eq!(urgent_labels(&parcels), ["żółć", "Łódź"]);
    assert_eq!(urgent_labels(&[]), Vec::<&str>::new());
    assert_eq!(parcels[0].label, "A");
}`;

const reviewPipelineSolution = `fn first_large<F>(values: &[i32], mut seen: F) -> Option<i32>
where
    F: FnMut(i32) -> bool,
{
    values.iter().copied().find(|value| seen(*value))
}`;

const reviewPipelineTests = `#[test]
fn review_short_circuit_preserves_order_and_empty_behavior() {
    let values = [1, 2, 10, 20];
    let mut visited = Vec::new();
    assert_eq!(first_large(&values, |value| {
        visited.push(value);
        value >= 10
    }), Some(10));
    assert_eq!(visited, vec![1, 2, 10]);
    assert_eq!(first_large(&values, |value| value >= 20), Some(20));
    assert_eq!(first_large(&values, |_| false), None);
    assert_eq!(first_large(&[], |_| true), None);
    assert_eq!(values, [1, 2, 10, 20]);
}`;

const reviewContractsSolution = `struct Counter {
    current: usize,
    end: usize,
}

impl Iterator for Counter {
    type Item = usize;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current >= self.end {
            None
        } else {
            let value = self.current;
            self.current += 1;
            Some(value)
        }
    }
}

fn counter(end: usize) -> Counter {
    Counter { current: 0, end }
}`;

const reviewContractsTests = `#[test]
fn review_iterator_handles_empty_order_and_repeated_exhaustion() {
    let mut values = counter(2);
    assert_eq!(values.next(), Some(0));
    assert_eq!(values.next(), Some(1));
    assert_eq!(values.next(), None);
    assert_eq!(values.next(), None);
    assert_eq!(counter(0).collect::<Vec<_>>(), Vec::<usize>::new());
    assert_eq!(counter(5).collect::<Vec<_>>(), vec![0, 1, 2, 3, 4]);
}`;

export const iteratorsReviewExercises: Record<string, LessonStep> = {
  "iterator-item-ownership": coding({
    id: "review-iterator-ownership",
    kind: "apply",
    title: "Powtórka: pilne widoki przesyłek",
    prompt:
      "Uzupełnij urgent_labels tak, aby pożyczyć etykiety pilnych Parcel w kolejności wejścia. Funkcja nie może skonsumować tablicy, klonować String ani zwracać własnych napisów. Puste wejście daje pusty Vec; test dodaje nieznane wcześniej znaki Unicode.",
    code: reviewOwnershipStarter,
    solution: reviewOwnershipSolution,
    tests: reviewOwnershipTests,
    hints: [
      "Wynik ma pożyczać fragmenty z parcels, więc przejście zacznij od iter().",
      "Filtruj priority, zamień label na &str przez as_str i zbierz pożyczone widoki.",
    ],
  }),
  "lazy-iterator-pipelines": coding({
    id: "review-iterator-pipeline",
    kind: "apply",
    title: "Powtórka: pierwsza duża wartość",
    prompt:
      "Dokończ first_large. Callback seen definiuje warunek akceptacji. Wywołuj go w kolejności tylko do pierwszego true; testy użyją różnych predykatów. Oddaj tę wartość jako Some, a przy pustym lub bezdopasowanym wejściu None. Nie zmieniaj tablicy i nie odwiedzaj dalszych elementów.",
    code: reviewPipelineSolution.replace(
      "values.iter().copied().find(|value| seen(*value))",
      "None",
    ),
    solution: reviewPipelineSolution,
    tests: reviewPipelineTests,
    hints: [
      "Potrzebujesz konsumenta, który kończy wyszukiwanie po pierwszym true.",
      "Pożycz values, użyj copied dla i32 i przekaż seen do predykatu find.",
    ],
  }),
  "iterator-contracts": coding({
    id: "review-iterator-contract",
    kind: "modify",
    title: "Powtórka: stabilny licznik",
    prompt:
      "Napraw Counter::next. Ma oddawać liczby od 0 do end - 1, zwiększać stan tylko przy Some i zwracać None od granicy także przy dalszych wywołaniach. Zachowaj Item = usize i konstruktor counter. Testy obejmują pusty zakres oraz pełną kolejność.",
    code: reviewContractsSolution.replace(
      "if self.current >= self.end {\n            None\n        } else {\n            let value = self.current;\n            self.current += 1;\n            Some(value)\n        }",
      "None",
    ),
    solution: reviewContractsSolution,
    tests: reviewContractsTests,
    hints: [
      "next musi rozdzielić stan przed granicą od stanu wyczerpanego.",
      "Po Some zapisz bieżące current, zwiększ je o 1 i zwróć wartość; po granicy nic już nie zwiększaj.",
    ],
  }),
};

export const iteratorsModule: CourseModule = {
  id: "iterators",
  title: "Iteratory: pożycz, przekształć, zakończ",
  whyItMatters:
    "Dane w Log Analyzer nie powinny być kopiowane tylko po to, by je odczytać. Iteratory pozwalają wyrazić własność elementów, leniwe przekształcenia i wcześniejsze zakończenie w kodzie, który można testować małymi kontraktami.",
  capabilities: [
    "Dobierasz iter, iter_mut i into_iter do celu oraz własności danych.",
    "Budujesz leniwe potoki z map, filter, collect, fold i find.",
    "Implementujesz Iterator i IntoIterator oraz piszesz generycznego konsumenta.",
  ],
  prerequisites: ["closures"],
  lessonIds: [...iteratorsLessons, ...fallibleCompositionLessons].map(
    (lesson) => lesson.id,
  ),
  exitGate: [
    "Kod rozróżnia pożyczane, mutable i posiadane elementy bez Clone i zachowuje Unicode oraz kolejność.",
    "Potok wykonuje callbacki dopiero przy konsumpcji, a find kończy dokładnie po pierwszym dopasowaniu.",
    "Własny iterator obsługuje pustkę, kolejność i kolejne next po None, a IntoIterator przyjmuje różne źródła.",
  ],
  projectConnection:
    "W Log Analyzer potoki będą wybierały widoki logów, liczyły statystyki bez zbędnych alokacji i zatrzymywały skanowanie po pierwszym zaakceptowanym wpisie.",
  assessmentId: "iterator-contracts/contracts-blank",
  gateCriteria: [
    {
      id: "iterators-ownership-gate",
      label:
        "Wybór Item zachowuje pożyczkę, mutable zmianę i konsumpcję niekopiowalnych rekordów.",
      taskRefs: [
        { lessonId: "iterator-ownership", stepId: "ownership-modify" },
        { lessonId: "iterator-ownership", stepId: "ownership-blank" },
      ],
    },
    {
      id: "iterators-pipelines-gate",
      label:
        "Przetwarzanie zachowuje kolejność i Unicode, a konsument short-circuit nie odwiedza dalszych danych.",
      taskRefs: [
        { lessonId: "iterator-pipelines", stepId: "pipelines-modify" },
        { lessonId: "iterator-pipelines", stepId: "pipelines-apply" },
      ],
    },
    {
      id: "iterators-laziness-gate",
      label:
        "Utworzenie iteratora nie wywołuje callbacków, a next przetwarza tylko żądaną część wejścia.",
      taskRefs: [
        { lessonId: "iterator-laziness", stepId: "pipelines-lazy-counter" },
        { lessonId: "iterator-laziness", stepId: "pipelines-deferred-gate" },
      ],
    },
    {
      id: "iterators-contracts-gate",
      label:
        "Iterator i IntoIterator mają sprawdzalny kontrakt dla pustki, własności i wyczerpania.",
      taskRefs: [
        { lessonId: "iterator-contracts", stepId: "contracts-modify" },
        { lessonId: "iterator-contracts", stepId: "contracts-blank" },
      ],
    },
    {
      id: "iterators-fallible-values-gate",
      label:
        "Rozróżniasz brak, składnię i zakres oraz zachowujesz właściciela i politykę opcjonalnego wyniku.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        {
          lessonId: "fallible-value-composition",
          stepId: "fallible-config-contract",
        },
        {
          lessonId: "fallible-value-composition",
          stepId: "fallible-optional-transfer",
        },
      ],
    },
    {
      id: "iterators-fallible-rows-gate",
      label:
        "Zachowujesz pozycje i pierwszy błąd z tożsamością bez żądań po błędzie.",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        {
          lessonId: "fallible-iterator-contracts",
          stepId: "fallible-rows-contract",
        },
        {
          lessonId: "fallible-iterator-contracts",
          stepId: "fallible-readings-transfer",
        },
        {
          lessonId: "fallible-iterator-contracts",
          stepId: "fallible-readings-blank",
        },
      ],
    },
  ],
};
