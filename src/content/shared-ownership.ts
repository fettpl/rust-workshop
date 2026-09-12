import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const sharedOwnershipSources: Source[] = [
  {
    id: "shared-ownership-book-rc",
    title: "The Rust Programming Language: Rc<T>",
    url: "https://doc.rust-lang.org/book/ch15-04-rc.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu Rc::clone, strong_count, Drop lub ograniczenia do jednego wątku.",
  },
  {
    id: "shared-ownership-std-rc",
    title: "Rust standard library: Rc<T>",
    url: "https://doc.rust-lang.org/std/rc/struct.Rc.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisów clone, ptr_eq, strong_count albo downgrade.",
  },
  {
    id: "shared-ownership-book-refcell",
    title: "The Rust Programming Language: RefCell<T> and interior mutability",
    url: "https://doc.rust-lang.org/book/ch15-05-interior-mutability.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu kontroli pożyczek w runtime i zakresu strażników RefCell.",
  },
  {
    id: "shared-ownership-std-refcell",
    title: "Rust standard library: RefCell<T>",
    url: "https://doc.rust-lang.org/std/cell/struct.RefCell.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie API borrow, try_borrow_mut lub warunków odmowy pożyczki.",
  },
  {
    id: "shared-ownership-book-weak",
    title: "The Rust Programming Language: Reference Cycles and Weak<T>",
    url: "https://doc.rust-lang.org/book/ch15-06-reference-cycles.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu weak_count, upgrade, cykli i modelu rodzic Weak–dzieci Rc.",
  },
  {
    id: "shared-ownership-std-weak",
    title: "Rust standard library: Weak<T>",
    url: "https://doc.rust-lang.org/std/rc/struct.Weak.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisów downgrade, upgrade albo weak_count.",
  },
];

export const sharedOwnershipCompetencies: Competency[] = [
  {
    id: "reason-about-rc-identity",
    title:
      "Rozpoznajesz, że Rc::clone współdzieli jedną wartość, zwiększa licznik i nie tworzy kopii zawartości.",
  },
  {
    id: "control-refcell-borrows",
    title:
      "Zarządzasz strażnikami RefCell w krótkich zakresach i obsługujesz odmowę try_borrow_mut bez niekontrolowanej paniki.",
  },
  {
    id: "model-weak-graphs",
    title:
      "Projektujesz relację rodzic Weak i dzieci Rc oraz przewidujesz None po zniknięciu ostatniego silnego właściciela.",
  },
];

export const sharedOwnershipConcepts: Concept[] = [
  {
    id: "rc-sharing",
    title: "Rc::clone współdzieli wartość przez silny licznik",
    prerequisites: ["drop-resources"],
    competencyIds: ["reason-about-rc-identity"],
    reviewPrompt:
      "Co zmienia `Rc::clone(&value)`, a co pozostaje wspólną częścią obu uchwytów? Co pokazują `strong_count` i `Rc::ptr_eq`?",
    reviewAnswer:
      "Rc::clone tworzy drugi silny uchwyt do tej samej wartości i zwiększa strong_count o jeden; nie kopiuje zawartości. Rc::ptr_eq potwierdza, że uchwyty wskazują tę samą alokację, a wartość pozostaje żywa do drop ostatniego silnego Rc.",
    distinguish:
      "`Rc::clone` klonuje uchwyt i zwiększa wspólny licznik, nie dane. Rc jest przeznaczone do odczytu w jednym wątku; współdzielenie między wątkami wymaga późniejszego, innego narzędzia.",
  },
  {
    id: "refcell-borrows",
    title: "RefCell sprawdza reguły pożyczek w runtime",
    prerequisites: ["rc-sharing"],
    competencyIds: ["control-refcell-borrows"],
    reviewPrompt:
      "Dlaczego `try_borrow_mut` może zwrócić `Err`, gdy istnieje strażnik `borrow`, i jak zakres strażnika wpływa na kolejną próbę?",
    reviewAnswer:
      "Aktywny strażnik współdzielonej pożyczki blokuje mutowalną pożyczkę zgodnie z regułami Rust. try_borrow_mut nie panikuje, tylko zwraca Err; po zakończeniu lub jawnym drop strażnika kolejna próba może się udać.",
    distinguish:
      "RefCell nie omija reguł pożyczania; przenosi ich sprawdzenie z kompilacji do wykonania. `borrow_mut` panikuje przy konflikcie, a `try_borrow_mut` pozwala obsłużyć odmowę jako wynik.",
  },
  {
    id: "weak-links",
    title: "Weak obserwuje Rc bez utrzymywania wartości przy życiu",
    prerequisites: ["refcell-borrows"],
    competencyIds: ["model-weak-graphs"],
    reviewPrompt:
      "Co zwróci `weak.upgrade()` po drop ostatniego Rc i dlaczego rodzic w grafie powinien być Weak, gdy dzieci są Rc?",
    reviewAnswer:
      "Po drop ostatniego silnego Rc upgrade zwróci None; Weak może jeszcze utrzymywać samą alokację liczników, lecz nie wartość. Rodzic jako Weak nie zwiększa strong_count, więc dzieci jako Rc nie tworzą silnego cyklu utrzymującego rodzica przy życiu.",
    distinguish:
      "Silny Rc wyraża własność i utrzymuje zawartość. Weak wyraża obserwację, wymaga upgrade do bezpiecznego Rc i nie jest drogą do wartości po jej zniszczeniu.",
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

function compileError(
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

const rcRun = `use std::rc::Rc;

fn main() {
    let value = Rc::new(String::from("żółć"));
    println!("przed: {}", Rc::strong_count(&value));
    let alias = Rc::clone(&value);
    println!("po clone: {}", Rc::strong_count(&value));
    println!("ta sama wartość: {}", Rc::ptr_eq(&value, &alias));
    drop(alias);
    println!("po drop alias: {}", Rc::strong_count(&value));
}`;

const rcMove = `use std::rc::Rc;

fn main() {
    let first = Rc::new(String::from("wspólne dane"));
    let second = first;
    println!("{} {}", first, second);
}`;

const rcCloneRepair = `use std::rc::Rc;

fn main() {
    let first = Rc::new(String::from("wspólne dane"));
    let second = Rc::clone(&first);
    println!("{} {}", first, second);
}`;

const rcAliasSolution = `use std::rc::Rc;

fn aliases(value: Rc<String>) -> (Rc<String>, Rc<String>) {
    let left = Rc::clone(&value);
    let right = Rc::clone(&value);
    (left, right)
}`;

const rcAliasStarter = rcAliasSolution.replace(
  "let right = Rc::clone(&value);",
  'let right = Rc::new(String::from("zastępcza wartość"));',
);

const rcAliasTests = `#[test]
fn clone_handles_share_identity_and_count() {
    let original = Rc::new(String::from("żółć"));
    let (left, right) = aliases(Rc::clone(&original));
    assert!(Rc::ptr_eq(&left, &right));
    assert!(Rc::ptr_eq(&original, &left));
    assert_eq!(&*left, "żółć");
    assert_eq!(Rc::strong_count(&original), 3);
    drop(left);
    assert_eq!(Rc::strong_count(&original), 2);
    drop(right);
    assert_eq!(Rc::strong_count(&original), 1);
}`;

const rcLifetimeSolution = `use std::cell::Cell;
use std::rc::Rc;

struct Marker(Rc<Cell<bool>>);

impl Drop for Marker {
    fn drop(&mut self) {
        self.0.set(true);
    }
}

fn keep_one(value: &Rc<Marker>) -> Rc<Marker> {
    Rc::clone(value)
}`;

const rcLifetimeStarter = rcLifetimeSolution.replace(
  "Rc::clone(value)",
  "Rc::new(Marker(Rc::clone(&value.0)))",
);

const rcLifetimeTests = `#[test]
fn value_survives_until_last_strong_handle_then_drops() {
    let dropped = Rc::new(Cell::new(false));
    let value = Rc::new(Marker(Rc::clone(&dropped)));
    let alias = keep_one(&value);
    assert!(Rc::ptr_eq(&value, &alias));
    assert_eq!(Rc::strong_count(&value), 2);
    drop(value);
    assert!(!dropped.get());
    assert_eq!(Rc::strong_count(&alias), 1);
    drop(alias);
    assert!(dropped.get());
}`;

const refcellRun = `use std::cell::RefCell;

fn main() {
    let cell = RefCell::new(String::from("start"));
    {
        let mut writer = cell.borrow_mut();
        writer.push('!');
    }
    println!("po zmianie: {}", cell.borrow());
    let reader = cell.borrow();
    let result = cell.try_borrow_mut();
    println!("mut przy odczycie: {}", if result.is_err() { "odmowa" } else { "ok" });
    drop(reader);
    println!("po zakresie: {}", cell.borrow());
}`;

const refcellAddSolution = `use std::cell::RefCell;

fn add_one(cell: &RefCell<i32>) -> Result<i32, &'static str> {
    let mut value = cell.try_borrow_mut().map_err(|_| "aktywny odczyt")?;
    *value = value.checked_add(1).ok_or("poza zakresem")?;
    Ok(*value)
}`;

const refcellAddStarter = refcellAddSolution.replace(
  'let mut value = cell.try_borrow_mut().map_err(|_| "aktywny odczyt")?;\n    *value = value.checked_add(1).ok_or("poza zakresem")?;\n    Ok(*value)',
  'Err("aktywny odczyt")',
);

const refcellAddTests = `#[test]
fn refused_mutation_keeps_original_value_and_later_retry_works() {
    let cell = RefCell::new(4);
    let reader = cell.borrow();
    assert_eq!(add_one(&cell), Err("aktywny odczyt"));
    assert_eq!(*reader, 4);
    drop(reader);
    assert_eq!(add_one(&cell), Ok(5));
    assert_eq!(*cell.borrow(), 5);
    assert_eq!(add_one(&cell), Ok(6));
    let maximum = RefCell::new(i32::MAX);
    assert_eq!(add_one(&maximum), Err("poza zakresem"));
    assert_eq!(*maximum.borrow(), i32::MAX);
}`;

const refcellReplaceSolution = `use std::cell::RefCell;

fn append_history(
    history: &RefCell<Vec<String>>,
    entry: String,
) -> Result<usize, &'static str> {
    let mut entries = history.try_borrow_mut().map_err(|_| "zajęte")?;
    entries.push(entry);
    Ok(entries.len())
}`;

const refcellReplaceTests = `use std::rc::Rc;

#[test]
fn shared_history_observes_success_and_keeps_original_after_conflict() {
    let history = Rc::new(RefCell::new(vec![String::from("start")]));
    let other_owner = Rc::clone(&history);
    {
        let reader = other_owner.borrow();
        assert_eq!(
            append_history(&history, String::from("blocked-read")),
            Err("zajęte")
        );
        assert_eq!(reader.as_slice(), ["start"]);
    }
    {
        let held = other_owner.borrow_mut();
        assert_eq!(
            append_history(&history, String::from("blocked-write")),
            Err("zajęte")
        );
        assert_eq!(held.as_slice(), ["start"]);
    }
    assert_eq!(append_history(&history, String::from("żółć")), Ok(2));
    assert_eq!(other_owner.borrow().as_slice(), ["start", "żółć"]);
    let empty = Rc::new(RefCell::new(Vec::new()));
    assert_eq!(append_history(&empty, String::new()), Ok(1));
    assert_eq!(empty.borrow().as_slice(), [""]);
}`;

const nodeRun = `use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    name: String,
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}

fn node(name: &str) -> Rc<Node> {
    Rc::new(Node {
        name: name.to_owned(),
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    })
}

fn attach(parent: &Rc<Node>, child: &Rc<Node>) {
    *child.parent.borrow_mut() = Rc::downgrade(parent);
    parent.children.borrow_mut().push(Rc::clone(child));
}

fn main() {
    let parent = node("rodzic");
    let child = node("dziecko");
    attach(&parent, &child);
    println!("parent strong: {}", Rc::strong_count(&parent));
    println!("child strong po podpięciu: {}", Rc::strong_count(&child));
    println!("rodzic dostępny: {}", child.parent.borrow().upgrade().is_some());
    drop(parent);
    println!("rodzic po drop: {}", child.parent.borrow().upgrade().is_some());
    println!("dziecko: {}", child.name);
}`;

const weakLinkSolution = `use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    name: String,
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}

fn link(parent: &Rc<Node>, child: &Rc<Node>) {
    *child.parent.borrow_mut() = Rc::downgrade(parent);
    parent.children.borrow_mut().push(Rc::clone(child));
}`;

const weakLinkStarter = weakLinkSolution.replace(
  "*child.parent.borrow_mut() = Rc::downgrade(parent);\n    parent.children.borrow_mut().push(Rc::clone(child));",
  "let _ = (parent, child);",
);

const weakLinkTests = `#[test]
fn parent_is_weak_child_is_strong_and_child_survives_parent_drop() {
    let parent = Rc::new(Node {
        name: String::from("P"),
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    });
    let child = Rc::new(Node {
        name: String::from("żółć"),
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    });
    let existing = Rc::new(Node {
        name: String::from("istniejące"),
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    });
    parent.children.borrow_mut().push(Rc::clone(&existing));
    link(&parent, &child);
    assert_eq!(Rc::strong_count(&parent), 1);
    assert_eq!(Rc::strong_count(&child), 2);
    assert!(!Rc::ptr_eq(&parent, &child));
    assert_eq!(parent.children.borrow().len(), 2);
    assert!(Rc::ptr_eq(&parent.children.borrow()[0], &existing));
    assert!(Rc::ptr_eq(&parent.children.borrow()[1], &child));
    assert_eq!(child.parent.borrow().upgrade().unwrap().name, "P");
    drop(parent);
    assert!(child.parent.borrow().upgrade().is_none());
    assert_eq!(child.name, "żółć");
}`;

const weakInspectSolution = `use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    name: String,
    parent: RefCell<Weak<Node>>,
}

fn parent_name(child: &Rc<Node>) -> Option<String> {
    child.parent.borrow().upgrade().map(|parent| parent.name.clone())
}`;

const weakInspectTests = `#[test]
fn upgrade_observes_parent_then_returns_none_after_last_strong_drop() {
    let parent = Rc::new(Node { name: String::from("P"), parent: RefCell::new(Weak::new()) });
    let child = Rc::new(Node { name: String::from("C"), parent: RefCell::new(Rc::downgrade(&parent)) });
    assert_eq!(parent_name(&child).as_deref(), Some("P"));
    let orphan = Rc::new(Node { name: String::from("orphan"), parent: RefCell::new(Weak::new()) });
    assert_eq!(parent_name(&orphan), None);
    let weak = Rc::downgrade(&parent);
    assert_eq!(Rc::strong_count(&parent), 1);
    drop(parent);
    assert!(weak.upgrade().is_none());
    assert_eq!(parent_name(&child), None);
    assert_eq!(child.name, "C");
}`;

export const sharedOwnershipLessons: Lesson[] = [
  {
    id: "rc-sharing",
    moduleId: "shared-ownership",
    conceptIds: ["rc-sharing"],
    competencyIds: ["reason-about-rc-identity"],
    prerequisites: ["drop-resources"],
    title: "Rc: kilku czytelników jednej wartości",
    subtitle:
      "Klonujesz uchwyty, obserwujesz liczniki i rozumiesz ostatni drop.",
    minutes: 35,
    outcomes: [
      "Rozróżnisz Rc::clone od głębokiej kopii danych.",
      "Odczytasz strong_count i potwierdzisz tożsamość przez Rc::ptr_eq.",
      "Wyjaśnisz, dlaczego wartość żyje do ostatniego silnego uchwytu.",
    ],
    steps: [
      choose(
        "rc-predict",
        "predict",
        "Przewidź licznik po clone",
        "`value` jest `Rc<String>` z licznikiem 1. Co będzie prawdą po `let alias = Rc::clone(&value)`?",
        1,
        [
          "Powstaną dwa niezależne Stringi, a każdy licznik będzie równy 1",
          "Będą dwa silne uchwyty do tego samego Stringa, a strong_count wyniesie 2",
          "String zostanie przeniesiony do alias, a użycie value da E0382",
        ],
        [
          "Rc::clone nie tworzy drugiej kopii zawartości.",
          "Klon uchwytu zwiększa silny licznik i pozostawia tę samą wartość dostępną przez oba Rc.",
          "Zwykłe przypisanie przeniosłoby Rc; jawne Rc::clone służy właśnie współdzieleniu.",
        ],
      ),
      run(
        "rc-run",
        "Zobacz wspólną alokację",
        "Uruchom przykład i śledź licznik przed clone, po clone oraz po drop aliasu. `ptr_eq` porównuje tożsamość wartości, a nie tekst dwóch niezależnych Stringów.",
        rcRun,
        "przed: 1\npo clone: 2\nta sama wartość: true\npo drop alias: 1\n",
      ),
      choose(
        "rc-explain",
        "explain",
        "Rc czy głęboka kopia?",
        "Dlaczego `Rc::clone(&value)` jest właściwe, gdy dwa moduły mają tylko czytać jeden duży raport?",
        2,
        [
          "Bo zawsze kopiuje wszystkie bajty, więc oba moduły dostają niezależny raport",
          "Bo usuwa potrzebę liczenia właścicieli przez natychmiastowy wyciek wartości",
          "Bo kopiuje mały uchwyt i zwiększa licznik, zachowując jedną zawartość do odczytu",
        ],
        [
          "Kopia zawartości byłaby osobnym kosztem i nie byłaby dowodem współdzielenia.",
          "Rc sprząta wartość po ostatnim silnym uchwycie; nie jest mechanizmem wycieku.",
          "To dokładny kontrakt Rc: wiele silnych uchwytów do jednej wartości w jednym wątku.",
        ],
      ),
      compileError(
        "rc-observe-move",
        "Odróżnij move od clone",
        "Kod używa zwykłego move Rc do `second`, więc `first` jest nieważne. Przeczytaj E0382, a potem porównaj naprawę z Rc::clone.",
        rcMove,
        rcCloneRepair,
        "E0382",
      ),
      exercise({
        id: "rc-alias-gate",
        kind: "modify",
        title: "Napraw dwa wspólne uchwyty",
        prompt:
          "Dokończ `aliases`, aby oba wyniki wskazywały dokładnie tę samą wartość co wejściowy Rc. Testy sprawdzą Unicode, ptr_eq, licznik 3 oraz zmniejszanie licznika po drop kolejnych uchwytów. Nie twórz zastępczego Stringa.",
        code: rcAliasStarter,
        solution: rcAliasSolution,
        tests: rcAliasTests,
        hints: [
          "Potrzebujesz dwóch silnych uchwytów do jednego wejściowego Rc.",
          "Wywołaj Rc::clone na `value` dla obu wyników; nie wywołuj clone na Stringu przez dereferencję.",
        ],
        gate: true,
      }),
      exercise({
        id: "rc-lifetime-gate",
        kind: "apply",
        title: "Zachowaj wartość do ostatniego Rc",
        prompt:
          "Uzupełnij `keep_one`, aby zwracało dodatkowy uchwyt do tego samego `Marker`. Test z Drop sprawdzi, że po drop pierwszego Rc wartość nadal żyje, a po drop ostatniego ustawia flagę. Każdy nowy Marker byłby błędnym rozwiązaniem.",
        code: rcLifetimeStarter,
        solution: rcLifetimeSolution,
        tests: rcLifetimeTests,
        hints: [
          "Funkcja ma przedłużyć życie tej samej wartości, więc przyjmij referencję do Rc i sklonuj uchwyt.",
          "Rc::clone(value) zwiększa licznik; nie konstruuj nowego Marker ani nowej alokacji zawartości.",
        ],
        gate: true,
      }),
      choose(
        "rc-recall",
        "recall",
        "Przypomnij granicę Rc",
        "Które stwierdzenie o `Rc<T>` jest prawidłowe?",
        0,
        [
          "Jest przeznaczone do współdzielenia w jednym wątku i nie daje ogólnie mutowalnego dostępu do zawartości",
          "Jest bezpiecznym zamiennikiem Arc<T> między dowolnymi wątkami",
          "Rc::clone zawsze wykonuje głęboką kopię T, aby uniknąć wspólnego stanu",
        ],
        [
          "To granica Rc: współdzielenie do odczytu w jednym wątku; Arc i synchronizacja należą do kolejnego etapu.",
          "Rc nie jest Send ani Sync.",
          "Klonowany jest uchwyt, nie zawartość.",
        ],
      ),
    ],
    misconceptions: [
      "Rc::clone kopiuje całą zawartość tak jak Clone na wartości T.",
      "Silny licznik zmniejsza się tylko po ręcznym wywołaniu specjalnej funkcji.",
      "Rc można bez zmian wysłać do innego wątku.",
    ],
    transferTask:
      "Zaprojektuj jednowątkowy raport, w którym kilka odbiorców czyta tę samą Rc<String>, a test zapisuje ptr_eq, liczniki i działanie po drop jednego odbiorcy.",
    evidenceGate:
      "Zadania rc-alias-gate i rc-lifetime-gate niezależnie sprawdzają tożsamość, liczniki, brak głębokiej kopii oraz drop po ostatnim silnym uchwycie.",
    sourceIds: ["shared-ownership-book-rc", "shared-ownership-std-rc"],
  },
  {
    id: "refcell-borrows",
    moduleId: "shared-ownership",
    conceptIds: ["refcell-borrows"],
    competencyIds: ["control-refcell-borrows"],
    prerequisites: ["rc-sharing"],
    title: "RefCell: jawna odmowa konfliktu pożyczek",
    subtitle:
      "Strażnik ma zakres, a try_borrow_mut pozwala zwrócić błąd zamiast paniki.",
    minutes: 35,
    outcomes: [
      "Rozpoznasz, że RefCell kontroluje pożyczki w runtime.",
      "Ograniczysz strażnika do zakresu potrzebnego do odczytu lub zmiany.",
      "Obsłużysz konflikt przez Result z try_borrow_mut i zachowasz oryginalną wartość.",
    ],
    steps: [
      choose(
        "refcell-predict",
        "predict",
        "Przewidź próbę mutacji",
        "W czasie życia `let reader = cell.borrow()` wywołujesz `cell.try_borrow_mut()`. Co zobaczysz?",
        2,
        [
          "Mutacja zawsze się uda, bo RefCell wyłącza reguły pożyczania",
          "Program zawsze zakończy się błędem kompilacji, zanim wykona try_borrow_mut",
          "Dostaniesz Err; aktywny reader pozostanie ważny, a wartość nie zmieni się",
        ],
        [
          "RefCell nadal pilnuje reguły wyłączności, tylko robi to w runtime.",
          "RefCell może przejść kontrolę kompilatora, ale konflikt jest rozstrzygany podczas wykonania.",
          "try_borrow_mut daje jawny wynik odmowy i nie zmienia wartości, gdy nie można uzyskać mutowalnego strażnika.",
        ],
      ),
      run(
        "refcell-run",
        "Zamknij zakres strażnika",
        "Uruchom przykład. Mutowalny strażnik kończy się przed odczytem, a następnie aktywny reader powoduje bezpieczną odmowę try_borrow_mut. Kod nie używa borrow_mut w konflikcie.",
        refcellRun,
        "po zmianie: start!\nmut przy odczycie: odmowa\npo zakresie: start!\n",
      ),
      choose(
        "refcell-explain",
        "explain",
        "Strażnik to zakres",
        "Dlaczego blok `{ let mut value = cell.borrow_mut(); ... }` jest częścią poprawnego rozwiązania?",
        1,
        [
          "Blok wymusza głęboką kopię wartości przed każdą mutacją",
          "Drop strażnika przy zamknięciu bloku zwalnia pożyczkę przed następnym dostępem",
          "Blok sprawia, że RefCell staje się bezpieczny między wątkami",
        ],
        [
          "Strażnik nie kopiuje zawartości; reprezentuje aktywną pożyczkę.",
          "Koniec zakresu strażnika usuwa aktywną pożyczkę, więc następna może być sprawdzona osobno.",
          "Zamknięcie bloku nie dodaje synchronizacji. RefCell nie służy do jednoczesnego pożyczania zawartości z wielu wątków.",
        ],
      ),
      exercise({
        id: "refcell-add-gate",
        kind: "debug",
        title: "Napraw try_borrow_mut",
        prompt:
          'Napraw `add_one`. Przy aktywnej pożyczce ma zwrócić Err("aktywny odczyt") i pozostawić oryginał bez zmian. Bez konfliktu zwiększ liczbę o 1 i zwróć ją w Ok. Jeśli zwiększenie przekroczyłoby zakres i32, zwróć Err("poza zakresem") bez zmiany liczby. Nie używaj unwrap, expect ani borrow_mut.',
        code: refcellAddStarter,
        solution: refcellAddSolution,
        tests: refcellAddTests,
        hints: [
          "Rozdziel odmowę dostępu od udanej zmiany: wynik ma opisać konflikt i nie dotykać liczby, gdy odczyt jest aktywny.",
          "Po uzyskaniu wyłącznego dostępu sprawdź także, czy zwiększenie mieści się w i32, a dopiero potem zwróć nową wartość.",
        ],
        gate: true,
      }),
      exercise({
        id: "refcell-add-blank",
        kind: "blank",
        title: "Zaprojektuj bezpieczną zmianę",
        prompt:
          'Od pustej kartki napisz funkcję `append_history`, która przyjmuje referencję do RefCell przechowującej Vec<String> oraz nowy String. Zwraca Result<usize, &\'static str>: po sukcesie aktualną długość historii, a przy aktywnym mutowalnym strażniku Err("zajęte"). Odmowa nie może zmienić oryginału ani wywołać paniki; po zwolnieniu strażnika wpis ma być widoczny przez drugi silny Rc. Uwzględnij pustą historię i pusty String.',
        solution: refcellReplaceSolution,
        tests: refcellReplaceTests,
        hints: [
          "Pomyśl o historii jako o współdzielonym stanie: konflikt ma zatrzymać całe dopisanie, a udana operacja ma zwrócić nową długość.",
          "Drugi Rc powinien obserwować ten sam Vec po zakończeniu aktywnego strażnika; wpis dodaj dopiero po uzyskaniu wyłącznego dostępu.",
        ],
        gate: true,
      }),
      choose(
        "refcell-recall",
        "recall",
        "Dobierz API do kontraktu",
        "Który wariant najlepiej pasuje do biblioteki, która nie może pozwolić na niekontrolowaną panikę przy konflikcie?",
        0,
        [
          "try_borrow_mut i jawny Result z krótkim zakresem strażnika",
          "borrow_mut bez zakresów, bo każdy konflikt powinien przerwać program",
          "Rc::clone, bo sam licznik silnych uchwytów rozwiązuje konflikt mutowalnej pożyczki",
        ],
        [
          "try_borrow_mut opisuje odmowę w wartości, a zakres ogranicza czas aktywnej pożyczki.",
          "borrow_mut może panikować przy konflikcie; to nie spełnia kontraktu kontrolowanej odmowy.",
          "Rc współdzieli właściciela, ale nie daje wielu mutowalnych referencji do zawartości.",
        ],
      ),
    ],
    misconceptions: [
      "RefCell pozwala na dowolną liczbę jednoczesnych mutowalnych strażników.",
      "Strażnik Ref lub RefMut jest zwykłą kopią wartości.",
      "try_borrow_mut zmienia wartość nawet wtedy, gdy zwraca Err.",
    ],
    transferTask:
      "Przenieś wzorzec do jednowątkowego stanu licznika: każda operacja ma strażnika ograniczonego do krótkiego zakresu, jawny wynik odmowy i test potwierdzający oryginał po konflikcie.",
    evidenceGate:
      "Zadania refcell-add-gate i refcell-add-blank sprawdzają odmowę try_borrow_mut, brak zmiany przy konflikcie, późniejszy sukces oraz bezpieczne zwiększenie i współdzielenie historii.",
    sourceIds: [
      "shared-ownership-book-refcell",
      "shared-ownership-std-refcell",
    ],
  },
  {
    id: "weak-links",
    moduleId: "shared-ownership",
    conceptIds: ["weak-links"],
    competencyIds: ["model-weak-graphs"],
    prerequisites: ["refcell-borrows"],
    title: "Weak: graf bez silnego cyklu",
    subtitle: "Rodzic jest obserwowany przez Weak, a dzieci posiadają Rc.",
    minutes: 40,
    outcomes: [
      "Rozróżnisz silne i słabe uchwyty oraz wartość od alokacji liczników.",
      "Użyjesz upgrade i obsłużysz None po drop ostatniego silnego Rc.",
      "Zbudujesz relację rodzic Weak–dzieci Rc bez celowo wyciekającego cyklu.",
    ],
    steps: [
      choose(
        "weak-predict",
        "predict",
        "Przewidź upgrade",
        "`weak` powstał przez `Rc::downgrade(&parent)`. Co zwróci `weak.upgrade()` po `drop(parent)`, gdy nie istnieje inne Rc do rodzica?",
        1,
        [
          "Zawsze Some, bo Weak utrzymuje zawartość przy życiu tak jak Rc",
          "None; Weak może pozostać jako uchwyt do alokacji, lecz nie odzyska zniszczonej wartości",
          "E0382, bo upgrade przenosi własność weak do parent",
        ],
        [
          "Weak nie zwiększa strong_count i nie jest właścicielem zawartości.",
          "upgrade bezpiecznie sygnalizuje brak wartości przez Option; sama alokacja metadanych może jeszcze istnieć.",
          "upgrade pożycza Weak przez referencję i próbuje utworzyć nowy silny Rc.",
        ],
      ),
      run(
        "weak-run",
        "Podepnij dziecko przez Weak",
        "Uruchom przykład i obserwuj, że dziecięce Vec utrzymuje dziecko przez Rc, a parent link nie utrzymuje rodzica. Po drop rodzica upgrade daje false, lecz dziecko nadal ma własnego silnego właściciela.",
        nodeRun,
        "parent strong: 1\nchild strong po podpięciu: 2\nrodzic dostępny: true\nrodzic po drop: false\ndziecko: dziecko\n",
      ),
      {
        id: "weak-trace",
        kind: "trace",
        title: "Prześledź jawne uchwyty Rc i Weak",
        prompt:
          "Przejdź przez trace i zaznacz, kiedy żyje wartość, kiedy znika ostatni silny Rc oraz dlaczego Weak może jeszcze utrzymać samą alokację liczników. Uzasadnij wynik upgrade po ostatnim silnym drop. Nie utożsamiaj liczby widocznych uchwytów Weak z wynikiem Weak::weak_count.",
        traceId: "trace-rc-weak",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Rozróżnia jawne silne uchwyty Rc jako właścicieli wartości od jawnych uchwytów Weak jako obserwatorów.",
            "Wskazuje, że wartość jest zwolniona po ostatnim silnym Rc.",
            "Wyjaśnia, że upgrade po tym momencie zwraca None, nawet jeśli alokacja metadanych czeka na ostatni Weak; nie utożsamia tego z wynikiem Weak::weak_count.",
          ],
        },
        evidenceKind: "exposure",
      },
      choose(
        "weak-explain",
        "explain",
        "Rodzic słaby, dziecko silne",
        "Dlaczego typowy `Node` przechowuje `parent: RefCell<Weak<Node>>`, ale `children: RefCell<Vec<Rc<Node>>>`?",
        2,
        [
          "Weak jest szybszym Rc i pozwala czytać bez upgrade",
          "Rc w parent zawsze gwarantuje automatyczne usunięcie całego grafu",
          "Rodzic posiada dzieci przez listę Rc, a link dziecka do rodzica tylko obserwuje, więc nie tworzy silnego cyklu",
        ],
        [
          "Weak wymaga upgrade, zanim bezpiecznie użyjesz wartości.",
          "Silny parent link wraz z children Rc może utrzymać cykl i wartości przy życiu.",
          "Kierunek własności jest jawny: dzieci żyją dzięki Rc, a przejście do rodzica jest warunkowym Weak.",
        ],
      ),
      exercise({
        id: "weak-link-gate",
        kind: "modify",
        title: "Napraw link rodzica",
        prompt:
          "Dokończ `link`, aby zapisać w dziecku Weak do rodzica i dodać Rc dziecka do listy rodzica. Test sprawdzi strong_count rodzica = 1, strong_count dziecka = 2, dostęp przed drop oraz None po drop rodzica. Nie twórz silnego pola parent ani cyklu.",
        code: weakLinkStarter,
        solution: weakLinkSolution,
        tests: weakLinkTests,
        hints: [
          "Rozdziel relację, która utrzymuje obiekt przy życiu, od relacji, która tylko pozwala go obserwować.",
          "Zapisz połączenie rodzic–dziecko bez usuwania wcześniejszych dzieci i sprawdź liczniki po obu stronach.",
        ],
        gate: true,
      }),
      exercise({
        id: "weak-inspect-blank",
        kind: "blank",
        title: "Zaprojektuj bezpieczne odpytywanie",
        prompt:
          "Od pustej kartki zdefiniuj Node z polem name typu String oraz polem parent przechowującym Weak<Node>. Następnie napisz funkcję `parent_name`, która przyjmuje dziecko wskazane przez Rc<Node> i zwraca opcjonalny, własnościowy tekst. Zwróć nazwę tylko po udanym upgrade, a po zniszczeniu rodzica None. Nie przechowuj Rc rodzica w dziecku.",
        solution: weakInspectSolution,
        tests: weakInspectTests,
        hints: [
          "Najpierw sprawdź, czy obserwowany rodzic jeszcze istnieje, i zaplanuj osobną ścieżkę dla pustego wyniku.",
          "Wynik ma być własnym tekstem, aby funkcja nie wynosiła pożyczki poza zakres sprawdzenia.",
        ],
        gate: true,
      }),
      choose(
        "weak-recall",
        "recall",
        "Wartość a alokacja",
        "Co jest prawdą po drop ostatniego Rc, gdy nadal istnieje Weak?",
        0,
        [
          "Payload jest zniszczony, upgrade daje None, a metadane alokacji mogą czekać na drop Weak",
          "Payload i alokacja muszą zostać natychmiast zniszczone, więc Weak staje się dangling pointer",
          "Weak automatycznie zamienia się w Rc i utrzymuje wartość do końca programu",
        ],
        [
          "To rozróżnienie pozwala bezpiecznie obserwować graf bez utrzymywania wartości przy życiu.",
          "Weak nie jest dangling referencją: upgrade sprawdza stan i zwraca None.",
          "Weak nie zwiększa strong_count i nie konwertuje się samoczynnie w silny uchwyt.",
        ],
      ),
    ],
    misconceptions: [
      "Weak::upgrade zawsze zwraca Some, bo sam Weak posiada wartość.",
      "Rc rodzica w każdym dziecku jest bezpieczniejszy niż Weak.",
      "Jeśli istnieje Weak, wartość musi nadal istnieć.",
    ],
    transferTask:
      "Zbuduj mały jednowątkowy graf folderów: folder posiada dzieci przez Rc, dziecko obserwuje rodzica przez Weak, a odpytywanie rodzica zwraca Option po upgrade.",
    evidenceGate:
      "Zadania weak-link-gate i weak-inspect-blank niezależnie sprawdzają kierunek własności, przeżycie dziecka, None po ostatnim parent Rc oraz brak silnego cyklu.",
    sourceIds: ["shared-ownership-book-weak", "shared-ownership-std-weak"],
  },
];

export const sharedOwnershipReviewExercises: Record<string, LessonStep> = {
  "rc-sharing": exercise({
    id: "review-rc-sharing",
    kind: "apply",
    title: "Powtórka: współdziel nagłówek",
    prompt:
      "Dokończ `clone_header`, aby oddać Rc do tego samego Stringa. Testy sprawdzą ptr_eq, Unicode, licznik po dwóch klonach i działanie po drop jednego wyniku. Nie klonuj zawartości String.",
    code: `use std::rc::Rc;

fn clone_header(value: &Rc<String>) -> Rc<String> {
    Rc::new(String::new())
}`,
    solution: `use std::rc::Rc;

fn clone_header(value: &Rc<String>) -> Rc<String> {
    Rc::clone(value)
}`,
    tests: `#[test]
fn review_rc_preserves_identity_and_lifetime() {
    let source = Rc::new(String::from("Łódź"));
    let first = clone_header(&source);
    let second = clone_header(&source);
    assert!(Rc::ptr_eq(&source, &first));
    assert!(Rc::ptr_eq(&first, &second));
    assert_eq!(Rc::strong_count(&source), 3);
    drop(first);
    assert_eq!(&*second, "Łódź");
    assert_eq!(Rc::strong_count(&source), 2);
}`,
    hints: [
      "Wynik ma współdzielić istniejący Rc, więc nie twórz nowego Stringa.",
      "Rc::clone przyjmuje referencję do uchwytu i zwiększa strong_count.",
    ],
  }),
  "refcell-borrows": exercise({
    id: "review-refcell-borrows",
    kind: "apply",
    title: "Powtórka: kontrolowana aktualizacja",
    prompt:
      'Dokończ `set_if_free`, aby ustawić liczbę przez try_borrow_mut i zwrócić Ok(()) albo Err("zajęte"). Aktywny reader nie może spowodować paniki ani zmiany. Test sprawdzi ponowną próbę po końcu zakresu.',
    code: `use std::cell::RefCell;

fn set_if_free(cell: &RefCell<i32>, value: i32) -> Result<(), &'static str> {
    Err("zajęte")
}`,
    solution: `use std::cell::RefCell;

fn set_if_free(cell: &RefCell<i32>, value: i32) -> Result<(), &'static str> {
    *cell.try_borrow_mut().map_err(|_| "zajęte")? = value;
    Ok(())
}`,
    tests: `#[test]
fn review_refcell_rejects_conflict_and_keeps_value() {
    let cell = RefCell::new(8);
    {
        let reader = cell.borrow();
        assert_eq!(set_if_free(&cell, 9), Err("zajęte"));
        assert_eq!(*reader, 8);
    }
    assert_eq!(set_if_free(&cell, -2), Ok(()));
    assert_eq!(*cell.borrow(), -2);
}`,
    hints: [
      "Nie wywołuj borrow_mut, bo kontrakt wymaga jawnej odmowy.",
      "Po `?` otrzymasz RefMut; przypisz przez dereferencję, a potem zwróć Ok.",
    ],
  }),
  "weak-links": exercise({
    id: "review-weak-links",
    kind: "apply",
    title: "Powtórka: odczytaj żyjącego rodzica",
    prompt:
      "Dokończ `parent_label`, aby przejść przez Weak i zwrócić Option<String>. Test sprawdzi istniejącego rodzica, pusty Weak i None po drop ostatniego Rc. Nie zwracaj referencji ani nie przechowuj silnego Rc.",
    code: `use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node { label: String, parent: RefCell<Weak<Node>> }

fn parent_label(child: &Rc<Node>) -> Option<String> {
    None
}`,
    solution: `use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node { label: String, parent: RefCell<Weak<Node>> }

fn parent_label(child: &Rc<Node>) -> Option<String> {
    child.parent.borrow().upgrade().map(|parent| parent.label.clone())
}`,
    tests: `#[test]
fn review_weak_upgrade_is_optional_and_does_not_retain_parent() {
    let parent = Rc::new(Node { label: String::from("P"), parent: RefCell::new(Weak::new()) });
    let child = Rc::new(Node { label: String::from("C"), parent: RefCell::new(Rc::downgrade(&parent)) });
    assert_eq!(parent_label(&child).as_deref(), Some("P"));
    let orphan = Rc::new(Node { label: String::from("orphan"), parent: RefCell::new(Weak::new()) });
    assert_eq!(parent_label(&orphan), None);
    drop(parent);
    assert_eq!(parent_label(&child), None);
    assert_eq!(child.label, "C");
}`,
    hints: [
      "Weak nie udostępnia zawartości bez upgrade, więc wynik funkcji powinien być mapowany z Option.",
      "Sklonuj label po uzyskaniu tymczasowego Rc; po drop parent następne upgrade musi dać None.",
    ],
  }),
};

export const sharedOwnershipModule: CourseModule = {
  id: "shared-ownership",
  title: "Współdzielenie: Rc, RefCell i Weak",
  whyItMatters:
    "Nie każda struktura ma jednego właściciela znanego w czasie kompilacji. Rc pozwala kilku częściom jednego wątku czytać tę samą wartość, RefCell kontroluje wybrane pożyczki podczas wykonania, a Weak opisuje obserwację bez podtrzymywania wartości.",
  capabilities: [
    "Rozumiesz tożsamość Rc::clone, silne liczniki i drop ostatniego właściciela.",
    "Tworzysz krótkie strażniki RefCell i obsługujesz konflikty przez try_borrow_mut.",
    "Modelujesz graf rodzic Weak–dzieci Rc i obsługujesz None z upgrade.",
  ],
  prerequisites: ["boxed-values"],
  lessonIds: sharedOwnershipLessons.map((lesson) => lesson.id),
  exitGate: [
    "Rc::clone zachowuje ptr_eq, licznik i wspólną zawartość, a wartość jest zwalniana dopiero po ostatnim strong Rc.",
    "RefCell ma jawne zakresy strażników, a try_borrow_mut odmawia bez paniki i bez częściowej zmiany.",
    "Weak parent nie utrzymuje rodzica, upgrade daje None po jego zniszczeniu, a dzieci Rc nadal żyją.",
  ],
  projectConnection:
    "W przyszłym Log Analyzerze te wzorce pomogą współdzielić niezmienny katalog między raportami, kontrolować mały stan jednowątkowego indeksu i budować relacje rekordów bez silnych cykli.",
  assessmentId: "weak-links/weak-inspect-blank",
  gateCriteria: [
    {
      id: "shared-ownership-rc-gate",
      label:
        "Rc::clone współdzieli tożsamość, liczniki i czas życia wartości bez głębokiej kopii.",
      taskRefs: [
        { lessonId: "rc-sharing", stepId: "rc-alias-gate" },
        { lessonId: "rc-sharing", stepId: "rc-lifetime-gate" },
      ],
    },
    {
      id: "shared-ownership-refcell-gate",
      label:
        "RefCell odmawia konfliktu w kontrolowany sposób, zachowując oryginał i pozwalając na późniejszy sukces.",
      taskRefs: [
        { lessonId: "refcell-borrows", stepId: "refcell-add-gate" },
        { lessonId: "refcell-borrows", stepId: "refcell-add-blank" },
      ],
    },
    {
      id: "shared-ownership-weak-gate",
      label:
        "Weak parent nie tworzy silnego cyklu, a upgrade bezpiecznie przechodzi do None.",
      taskRefs: [
        { lessonId: "weak-links", stepId: "weak-link-gate" },
        { lessonId: "weak-links", stepId: "weak-inspect-blank" },
      ],
    },
  ],
};
