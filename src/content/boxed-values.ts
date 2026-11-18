import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const boxedValuesSources: Source[] = [
  {
    id: "boxed-values-book-box",
    title: "The Rust Programming Language: Using Box<T> to Point to Data",
    url: "https://doc.rust-lang.org/book/ch15-01-box.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładu własności Box, typu rekurencyjnego lub opisu ograniczeń wielkości.",
  },
  {
    id: "boxed-values-std-box",
    title: "Rust standard library: std::boxed",
    url: "https://doc.rust-lang.org/std/boxed/index.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu Box::new, własności wartości albo przykładu z typem o znanym rozmiarze.",
  },
  {
    id: "boxed-values-error-e0072",
    title: "Rust Error Index: E0072 — recursive type has infinite size",
    url: "https://doc.rust-lang.org/error_codes/E0072.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty diagnostyk rustc przy zmianie niepośredniej definicji rekurencyjnego enumu.",
  },
  {
    id: "boxed-values-book-deref",
    title:
      "The Rust Programming Language: Treating Smart Pointers Like References",
    url: "https://doc.rust-lang.org/book/ch15-02-deref.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie implementacji Deref, Target lub przykładu deref coercion.",
  },
  {
    id: "boxed-values-std-deref",
    title: "Rust standard library: Deref in core::ops",
    url: "https://doc.rust-lang.org/std/ops/trait.Deref.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie podpisu deref, związanej referencji albo wskazówek o infallible API.",
  },
  {
    id: "boxed-values-std-drop",
    title: "Rust standard library: Drop in std::ops",
    url: "https://doc.rust-lang.org/std/ops/trait.Drop.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie automatycznego niszczenia wartości przy końcu zakresu, kolejności pól lub std::mem::drop.",
  },
  {
    id: "boxed-values-error-e0040",
    title:
      "Rust Error Index: E0040 — manually calling destructors is not allowed",
    url: "https://doc.rust-lang.org/error_codes/E0040.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty diagnostyk rustc przy zmianie przykładu value.drop() i jego naprawy.",
  },
];

export const boxedValuesCompetencies: Competency[] = [
  {
    id: "model-boxed-recursion",
    title:
      "Używasz Box do przerwania rekurencji rozmiaru i przenosisz właściciela bez kopiowania nieklonowalnej wartości.",
  },
  {
    id: "implement-deref-contracts",
    title:
      "Implementujesz Deref z właściwym Target i zwracasz pożyczkę, która pozwala na jawne dereferencjonowanie oraz coercion.",
  },
  {
    id: "control-drop-timing",
    title:
      "Rozpoznajesz automatyczny Drop i wybierasz std::mem::drop, gdy zasób ma zostać oddany przed końcem zakresu.",
  },
];

export const boxedValuesConcepts: Concept[] = [
  {
    id: "box-recursive",
    title: "Box daje znany rozmiar pośrednika i zachowuje własność wartości",
    prerequisites: ["log-deterministic-report"],
    competencyIds: ["model-boxed-recursion"],
    reviewPrompt:
      "Dlaczego `Cons(u32, Box<List>)` ma skończony rozmiar, choć `List` może mieć wiele węzłów, i co dzieje się z właścicielem elementu po `Box::new`?",
    reviewAnswer:
      "Pole Box ma rozmiar pośrednika znany kompilatorowi, więc sam enum nie musi zawierać całej następnej wartości inline. Box::new przyjmuje wartość na własność, a przejście Box do funkcji przenosi właściciela bez wymagania Clone.",
    distinguish:
      "Box nie jest kopią danych ani obietnicą konkretnego miejsca uchwytu. Przerywa rekurencję rozmiaru i jest właścicielem opakowanej wartości; ograniczona głębokość przykładu pozostaje decyzją programu.",
  },
  {
    id: "deref-contracts",
    title: "Deref wystawia pożyczony Target i uruchamia coercion",
    prerequisites: ["box-recursive"],
    competencyIds: ["implement-deref-contracts"],
    reviewPrompt:
      "Jaki typ musi zwrócić `deref(&self)` i dlaczego implementacja dla wrappera tekstu może przyjąć `Target = str` bez klonowania Stringa?",
    reviewAnswer:
      "Metoda zwraca `&Self::Target`, więc dla wrappera tekstu może zwrócić `&self.0`, a `Target` ustawić na `str`. Jest to pożyczony widok; kompilator może użyć go przy `*wrapper` oraz przy przekazaniu `&wrapper` do funkcji oczekującej `&str`.",
    distinguish:
      "Deref nie oddaje własności i nie tworzy kopii. Deref coercion konwertuje istniejącą referencję `&Wrapper` do `&Target` przez `deref`; nie jest automatycznym pożyczeniem dowolnej wartości, dlatego kontrakt powinien być tani, przewidywalny i nieoczekujący błędu.",
  },
  {
    id: "drop-resources",
    title: "Drop sprząta automatycznie, a mem::drop kończy życie wartości",
    prerequisites: ["deref-contracts"],
    competencyIds: ["control-drop-timing"],
    reviewPrompt:
      "Czym różni się automatyczne wywołanie `Drop::drop` przy zniszczeniu wartości od `std::mem::drop(value)` i dlaczego `value.drop()` jest odrzucane?",
    reviewAnswer:
      "Rust wywołuje destruktor, gdy wartość jest niszczona; dla lokalnego zasobu zwykle dzieje się to przy wyjściu z zakresu. `std::mem::drop(value)` przenosi wartość do zwykłej funkcji i niszczy ją wcześniej, natomiast bezpośrednie `value.drop()` próbuje ręcznie wywołać metodę destruktora i daje E0040.",
    distinguish:
      "mem::drop nie wywołuje Drop dwa razy: przenosi wartość do funkcji, która kończy jej życie. Po tym przeniesieniu nie wolno jej używać ponownie, a zakres i kolejność pól nadal wyznaczają pozostałe automatyczne zwolnienia.",
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
  kind: "modify" | "debug" | "apply" | "blank";
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
    expectedStatus: "success",
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const recursiveBroken = String.raw`enum List {
    Cons(u32, List),
    Nil,
}

fn main() {
    let _ = List::Cons(1, List::Nil);
}`;

const recursiveFixed = String.raw`enum List {
    Cons(u32, Box<List>),
    Nil,
}

fn sum(list: &List) -> u32 {
    match list {
        List::Cons(value, next) => value + sum(next),
        List::Nil => 0,
    }
}

fn main() {
    let list = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));
    println!("{}", sum(&list));
}`;

const boxRun = String.raw`struct Note(String);

fn take_note(note: Box<Note>) -> Box<Note> {
    note
}

fn main() {
    let note = Box::new(Note(String::from("ważne")));
    let address = (&*note) as *const Note as usize;
    let note = take_note(note);
    println!("{}|{}", note.0, address == ((&*note) as *const Note as usize));
}`;

const boxMoveStarter = String.raw`struct Token(String);
struct Ticket<T>(T);

fn move_ticket<T>(ticket: Ticket<T>) -> Box<Ticket<T>> {
    let _ = ticket;
    panic!("uzupełnij przeniesienie")
}`;

const boxMoveSolution = String.raw`struct Token(String);
struct Ticket<T>(T);

fn move_ticket<T>(ticket: Ticket<T>) -> Box<Ticket<T>> {
    Box::new(ticket)
}`;

const boxMoveTests = String.raw`#[test]
fn moves_a_non_clone_ticket_without_replacing_its_text() {
    let ticket = Ticket(Token(String::from("żółć 🙂")));
    let expected = ticket.0.0.as_ptr();
    let boxed = move_ticket(ticket);
    assert_eq!(boxed.0.0, "żółć 🙂");
    assert_eq!(boxed.0.0.as_ptr(), expected);
}

#[test]
fn accepts_empty_ticket_without_a_sentinel_value() {
    let ticket = Ticket(String::new());
    let boxed = move_ticket(ticket);
    assert_eq!(boxed.0, "");
}`;

const listStarter = String.raw`enum Chain {
    Link(u8, Box<Chain>),
    End,
}

fn count(chain: &Chain) -> usize {
    match chain {
        Chain::Link(_, _) => 0,
        Chain::End => 0,
    }
}`;

const listSolution = String.raw`enum Chain {
    Link(u8, Box<Chain>),
    End,
}

fn count(chain: &Chain) -> usize {
    match chain {
        Chain::Link(_, next) => 1 + count(next),
        Chain::End => 0,
    }
}`;

const listTests = String.raw`#[test]
fn counts_a_bounded_chain_and_the_empty_end() {
    let chain = Chain::Link(
        10,
        Box::new(Chain::Link(20, Box::new(Chain::Link(30, Box::new(Chain::End))))),
    );
    assert_eq!(count(&chain), 3);
    assert_eq!(count(&Chain::End), 0);
}

#[test]
fn supports_a_single_link_without_special_cases() {
    let chain = Chain::Link(7, Box::new(Chain::End));
    assert_eq!(count(&chain), 1);
}`;

const derefRun = String.raw`use std::ops::Deref;

struct Label(String);

impl Deref for Label {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.0.as_str()
    }
}

fn length(text: &str) -> usize {
    text.len()
}

fn main() {
    let label = Label(String::from("serwis: żółć"));
    println!("{}|{}", &*label, length(&label));
}`;

const derefStarter = String.raw`use std::ops::Deref;

struct Label(String);

impl Deref for Label {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        &self.0[..0]
    }
}

fn as_text(label: &Label) -> &str {
    label
}`;

const derefSolution = String.raw`use std::ops::Deref;

struct Label(String);

impl Deref for Label {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.0.as_str()
    }
}

fn as_text(label: &Label) -> &str {
    label
}`;

const derefTests = String.raw`#[test]
fn borrows_the_original_non_clone_text_and_coerces_to_str() {
    let label = Label(String::from("czujnik: żółć 🙂"));
    let original = label.0.as_ptr();
    let view = as_text(&label);
    assert_eq!(view, "czujnik: żółć 🙂");
    assert_eq!(view.as_ptr(), original);
    let accepted: &str = &label;
    assert_eq!(accepted.as_ptr(), original);
}

#[test]
fn empty_text_is_still_a_view_into_the_wrapper() {
    let label = Label(String::new());
    assert_eq!(as_text(&label), "");
    assert_eq!(as_text(&label).as_ptr(), label.0.as_ptr());
}`;

const derefSliceStarter = String.raw`use std::ops::Deref;

struct Bytes(Vec<u8>);

impl Deref for Bytes {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        &[]
    }
}

fn first(bytes: &Bytes) -> Option<&u8> {
    bytes.first()
}`;

const derefSliceSolution = String.raw`use std::ops::Deref;

struct Bytes(Vec<u8>);

impl Deref for Bytes {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        self.0.as_slice()
    }
}

fn first(bytes: &Bytes) -> Option<&u8> {
    bytes.first()
}`;

const derefSliceTests = String.raw`#[test]
fn exposes_the_original_slice_without_copying() {
    let bytes = Bytes(vec![3, 5, 8]);
    let address = bytes.0.as_ptr();
    let view: &[u8] = &bytes;
    assert_eq!(view, &[3, 5, 8]);
    assert_eq!(view.len(), 3);
    assert_eq!(view.as_ptr(), address);
    assert_eq!(first(&bytes), Some(&3));
    fn accepts_slice(values: &[u8]) -> usize { values.len() }
    assert_eq!(accepts_slice(&bytes), 3);
}

#[test]
fn empty_wrapper_has_no_first_element() {
    let bytes = Bytes(Vec::new());
    let view: &[u8] = &bytes;
    assert_eq!(view, &[]);
    assert_eq!(view.len(), 0);
    assert_eq!(first(&bytes), None);
}`;

const dropBroken = String.raw`struct Marker;

impl Drop for Marker {
    fn drop(&mut self) {}
}

fn main() {
    let marker = Marker;
    marker.drop();
}`;

const dropFixed = String.raw`struct Marker;

impl Drop for Marker {
    fn drop(&mut self) {
        println!("sprzątanie");
    }
}

fn main() {
    let marker = Marker;
    std::mem::drop(marker);
}`;

const dropRun = String.raw`use std::cell::Cell;

struct Lease<'a> {
    released: &'a Cell<u32>,
}

impl Drop for Lease<'_> {
    fn drop(&mut self) {
        self.released.set(self.released.get() + 1);
    }
}

fn main() {
    let released = Cell::new(0);
    {
        let _lease = Lease { released: &released };
        println!("w środku: {}", released.get());
    }
    println!("po zakresie: {}", released.get());
    let lease = Lease { released: &released };
    std::mem::drop(lease);
    println!("po jawnym drop: {}", released.get());
}`;

const dropStarter = String.raw`use std::cell::Cell;

struct Lease<'a> {
    released: &'a Cell<u32>,
}

impl Drop for Lease<'_> {
    fn drop(&mut self) {
        self.released.set(self.released.get() + 1);
    }
}

fn release_one(released: &Cell<u32>) -> u32 {
    let _lease = Lease { released };
    0
}`;

const dropSolution = String.raw`use std::cell::Cell;

struct Lease<'a> {
    released: &'a Cell<u32>,
}

impl Drop for Lease<'_> {
    fn drop(&mut self) {
        self.released.set(self.released.get() + 1);
    }
}

fn release_one(released: &Cell<u32>) -> u32 {
    let lease = Lease { released };
    std::mem::drop(lease);
    released.get()
}`;

const dropTests = String.raw`#[test]
fn automatic_drop_runs_once_at_the_end_of_a_block() {
    let released = Cell::new(0);
    {
        let _lease = Lease { released: &released };
        assert_eq!(released.get(), 0);
    }
    assert_eq!(released.get(), 1);
}

#[test]
fn mem_drop_runs_once_before_release_one_reads_the_tracker() {
    for initial in [0, 10] {
        let released = Cell::new(initial);
        assert_eq!(release_one(&released), initial + 1);
        assert_eq!(released.get(), initial + 1);
        assert_eq!(release_one(&released), initial + 2);
        assert_eq!(released.get(), initial + 2);
    }
}`;

const dropBlankSolution = String.raw`use std::cell::Cell;

struct Reservation<'a> {
    closed: &'a Cell<bool>,
}

impl Drop for Reservation<'_> {
    fn drop(&mut self) {
        self.closed.set(true);
    }
}

fn close_early(closed: &Cell<bool>) -> bool {
    let reservation = Reservation { closed };
    std::mem::drop(reservation);
    closed.get()
}`;

const dropBlankTests = String.raw`#[test]
fn reservation_is_open_until_the_block_ends() {
    let closed = Cell::new(false);
    {
        let _reservation = Reservation { closed: &closed };
        assert!(!closed.get());
    }
    assert!(closed.get());
}

#[test]
fn close_early_drops_reservation_before_reading_the_cell() {
    let closed = Cell::new(false);
    assert!(close_early(&closed));
    assert!(closed.get());
}`;

export const boxedValuesLessons: Lesson[] = [
  {
    id: "box-recursive",
    moduleId: "boxed-values",
    conceptIds: ["box-recursive"],
    competencyIds: ["model-boxed-recursion"],
    prerequisites: ["log-analyzer-project"],
    title: "Box: właściciel i skończona rekurencja",
    subtitle:
      "Najpierw zobaczysz E0072, potem przerwiesz rekurencję i przeniesiesz własność.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz, dlaczego bezpośrednie pole rekurencyjne nie ma skończonego rozmiaru.",
      "Zbudujesz mały rekurencyjny enum z Box i przejdziesz po nim do jawnej granicy.",
      "Przeniesiesz Box z nieklonowalną wartością, zachowując jej tożsamość i tekst.",
    ],
    steps: [
      choose(
        "box-predict",
        "predict",
        "Przewidź rozmiar List",
        "`Cons(u32, List)` zawiera następny element bez pośrednika. Co zrobi kompilator, zanim program się uruchomi?",
        1,
        [
          "Doda automatyczną granicę głębokości i skompiluje typ",
          "Odrzuci typ, bo jego rozmiar musiałby rosnąć bez końca",
          "Skopiuje każdy następny element do osobnej tablicy",
        ],
        [
          "Rust nie dopisuje runtime limitu do definicji typu.",
          "Bez pośrednika rozmiar wariantu zależy od kolejnego List, więc nie ma skończonego rozmiaru.",
          "Kompilator nie zmienia rekurencyjnego enumu w tablicę ani nie dodaje kopii.",
        ],
      ),
      observe(
        "box-e0072",
        "Zobacz E0072",
        "Uruchom definicję bez pośrednika, takiego jak `Box`. E0072 mówi o nieskończonym rozmiarze typu; diagnoza dotyczy definicji, a nie liczby elementów w tym konkretnym wywołaniu.",
        recursiveBroken,
        recursiveFixed,
        "E0072",
      ),
      run(
        "box-run",
        "Uruchom listę z Box",
        "W poprawionej definicji każde `Box<List>` ma rozmiar pośrednika znany kompilatorowi. Ten przykład ma tylko dwa węzły, więc przejście jest jawnie małe. Uruchom go.",
        recursiveFixed,
        "3\n",
      ),
      run(
        "box-ownership-run",
        "Uruchom przeniesienie właściciela Box",
        "`Box::new` przyjmuje `Note` na własność. `&*note` pożycza opakowaną wartość, a rzutowanie referencji na liczbę służy tu wyłącznie do porównania tożsamości adresu przed i po przeniesieniu uchwytu. Uruchom przykład i zobacz, że `take_note` przenosi Box, a tekst pozostaje ten sam.",
        boxRun,
        "ważne|true\n",
      ),
      coding({
        id: "box-move-gate",
        kind: "debug",
        title: "Napraw przeniesienie Ticket",
        prompt:
          "Napraw `move_ticket`, aby oddawał ten sam generyczny `Ticket<T>` w Box. Wrapper Ticket nie ma `Clone`, a test używa także własnego typu Token bez `Clone`; nie twórz zastępczej wartości.",
        code: boxMoveStarter,
        solution: boxMoveSolution,
        tests: boxMoveTests,
        hints: [
          "Parametr `ticket` już jest właścicielem wartości, której potrzebuje wynik.",
          "Wynik powinien opakować ten sam parametr T; zastępcza wartość zmieniłaby dane i tożsamość adresu.",
        ],
        gate: true,
      }),
      coding({
        id: "box-list-gate",
        kind: "apply",
        title: "Dokończ przejście po Chain",
        prompt:
          "Uzupełnij `count`, aby policzyć wyłącznie węzły `Link` do końcowego `End`. Nie rozwijaj wartości do wektora i nie zakładaj głębokości większej niż dane z testu.",
        code: listStarter,
        solution: listSolution,
        tests: listTests,
        hints: [
          "Dopasuj oba warianty enumu; `next` jest pożyczonym Boxem, więc możesz przekazać go do tej samej funkcji.",
          "Link wnosi jeden węzeł i przekazuje pożyczone dziecko do dalszego liczenia; End nie wnosi żadnego.",
        ],
        gate: true,
      }),
      choose(
        "box-recall",
        "recall",
        "Odtwórz rolę Box",
        "Które zdanie opisuje Box w tym module najdokładniej?",
        2,
        [
          "Box zawsze gwarantuje, że uchwyt leży na stosie",
          "Box automatycznie klonuje wartość przy każdym przeniesieniu",
          "Box ma własność wartości i może dostarczyć znany rozmiar pośrednika",
        ],
        [
          "Nie zakładamy gwarantowanego miejsca uchwytu w przykładzie.",
          "Przeniesienie Box jest zmianą właściciela, nie kopiowaniem.",
          "To kontrakt potrzebny do przerwania rekurencji rozmiaru i bezpiecznego zwolnienia wartości.",
        ],
      ),
    ],
    misconceptions: [
      "Rust automatycznie ogranicza głębokość rekurencyjnego typu.",
      "Box::new musi klonować wartość, żeby umieścić ją w opakowaniu.",
      "Każdy Box gwarantuje konkretny układ stosu i sterty, który można obserwować bez kontraktu.",
    ],
    transferTask:
      "Zaprojektuj mały enum z wariantem końcowym i jednym polem `Box`, a następnie przenieś przez funkcję wartość, która nie implementuje Clone.",
    evidenceGate:
      "Dwie niezależne implementacje testują generyczne przeniesienie danych bez Clone oraz przejście po ograniczonej liczbie węzłów Chain.",
    sourceIds: [
      "boxed-values-book-box",
      "boxed-values-std-box",
      "boxed-values-error-e0072",
    ],
  },
  {
    id: "deref-contracts",
    moduleId: "boxed-values",
    conceptIds: ["deref-contracts"],
    competencyIds: ["implement-deref-contracts"],
    prerequisites: ["box-recursive"],
    title: "Deref: pożyczony Target i coercion",
    subtitle:
      "Wrapper zachowuje własność, a jego kontrakt udostępnia widok bez klonowania.",
    minutes: 21,
    outcomes: [
      "Rozpoznasz rolę `Target` i podpisu `fn deref(&self) -> &Self::Target`.",
      "Zaimplementujesz Deref dla tekstu i slice bez tworzenia kopii.",
      "Sprawdzisz deref coercion oraz tożsamość adresu danych przez testy z typami bez Clone.",
    ],
    steps: [
      choose(
        "deref-predict",
        "predict",
        "Przewidź typ widoku",
        "Wrapper `Label(String)` ma udostępniać funkcję przyjmującą `&str`. Jaki Target pozwala na pożyczkę z pola String?",
        0,
        [
          "`Target = str`, a `deref` zwraca `&self.0` jako widok",
          "`Target = String`, a `deref` zwraca nowy String",
          "`Target = usize`, bo długość nie wymaga referencji",
        ],
        [
          "str jest typem widoku bez znanego rozmiaru, a `&self.0` pożycza istniejące dane.",
          "Ta odpowiedź miesza Target z własnością: `deref` musi zwracać `&Self::Target`, nie nowy String. `Target = str` wyraża bezpośredni widok dla funkcji oczekującej `&str`.",
          "Długość może być wynikiem, ale nie jest typem tekstowego Target.",
        ],
      ),
      run(
        "deref-run",
        "Uruchom jawne i niejawne dereferencjonowanie",
        "`&*label` pokazuje jawny widok, a `length(&label)` korzysta z coercion do `&str`. Obie ścieżki czytają ten sam tekst. Uruchom przykład.",
        derefRun,
        "serwis: żółć|16\n",
      ),
      choose(
        "deref-explain",
        "explain",
        "Znajdź źródło kopii",
        "W `deref(&self) -> &Self::Target` skąd powinien pochodzić zwracany adres?",
        2,
        [
          "Z nowego Stringa utworzonego w każdym wywołaniu",
          "Z dowolnego globalnego bufora, niezależnie od self",
          "Z danych należących do self, pożyczonych na czas referencji",
        ],
        [
          "Nowy String zmieniłby koszt i wymagałby zarządzania dodatkową własnością.",
          "Widok powinien opisywać dane wrappera, a nie niepowiązane globalne źródło.",
          "`&self` pozwala bezpiecznie pożyczyć pole, a ważność wyniku jest związana z obiektem wrappera.",
        ],
      ),
      coding({
        id: "deref-text-gate",
        kind: "debug",
        title: "Napraw Deref dla Label",
        prompt:
          "Napraw `Deref` i `as_text`, aby widok wskazywał na oryginalny bufor `String`. `Label` nie ma `Clone`, a testy wymagają zachowania Unicode, pustego tekstu i adresu bufora oryginalnego Stringa.",
        code: derefStarter,
        solution: derefSolution,
        tests: derefTests,
        hints: [
          "`deref` ma zwrócić referencję, więc nie twórz wartości, która zniknie po zakończeniu metody.",
          "Ustaw Target na str i pożycz tekstowe pole; `as_text` może wtedy oddać ten sam widok przez deref coercion.",
        ],
        gate: true,
      }),
      coding({
        id: "deref-slice-gate",
        kind: "apply",
        title: "Przenieś kontrakt na Bytes",
        prompt:
          "Uzupełnij Deref dla wrappera `Bytes(Vec<u8>)`. Oddaj slice z istniejącego wektora, aby `first` zwracał pożyczony element bez kopiowania. Obsłuż także pusty wrapper.",
        code: derefSliceStarter,
        solution: derefSliceSolution,
        tests: derefSliceTests,
        hints: [
          "Dla `Vec<u8>` właściwym Target jest slice `[u8]`, czyli typ widoku bez znanego rozmiaru.",
          "Pożycz slice należący do wewnętrznego Vec; `first` powinien wtedy zwrócić referencję do tego samego bufora.",
        ],
        gate: true,
      }),
      choose(
        "deref-recall",
        "recall",
        "Odtwórz granicę Deref",
        "Co daje coercion `&Label` → `&str` w poprawnej implementacji?",
        1,
        [
          "Przenosi Label do funkcji i pozwala użyć go ponownie tylko przez kopię",
          "Wstawia pożyczony widok zgodny z Target w miejscu oczekującym `&str`",
          "Zmienia String w `&'static str`",
        ],
        [
          "Coercion nie przenosi wrappera ani nie wymusza Clone.",
          "Kompilator może użyć `deref` i dopasować referencję do parametru funkcji.",
          "Lifetime widoku nadal zależy od wrappera; nie staje się globalny.",
        ],
      ),
    ],
    misconceptions: [
      "Deref jest metodą, która powinna zwracać nową kopię danych.",
      "Target musi być sized i nie może być str albo slice.",
      "Coercion wydłuża życie wrappera do końca programu.",
    ],
    transferTask:
      "Zaimplementuj wrapper nad innym typem widoku bez znanego rozmiaru, takim jak [u8], i opisz, w którym miejscu deref coercion konwertuje istniejącą referencję wrappera do `&[u8]`.",
    evidenceGate:
      "Dwie niezależne implementacje potwierdzają pożyczkę z oryginalnego Stringa oraz z Vec<u8>, z tożsamością adresu danych i przypadkiem pustym.",
    sourceIds: ["boxed-values-book-deref", "boxed-values-std-deref"],
  },
  {
    id: "drop-resources",
    moduleId: "boxed-values",
    conceptIds: ["drop-resources"],
    competencyIds: ["control-drop-timing"],
    prerequisites: ["deref-contracts"],
    title: "Drop: oddaj zasób w odpowiednim momencie",
    subtitle:
      "Obserwujesz koniec zakresu i używasz mem::drop, gdy wcześniejsze zwolnienie ma znaczenie.",
    minutes: 21,
    outcomes: [
      "Wyjaśnisz, kiedy Rust wywołuje Drop automatycznie.",
      "Rozpoznasz E0040 i naprawisz ręczne wywołanie przez std::mem::drop.",
      "Sprawdzisz moment zwolnienia za pomocą Cell bez podwójnego destruktora.",
    ],
    steps: [
      choose(
        "drop-predict",
        "predict",
        "Przewidź koniec Lease",
        "`Lease` zwiększa licznik w `Cell` w swoim Drop. Kiedy licznik wzrośnie dla wartości lokalnej w wewnętrznym bloku?",
        2,
        [
          "Natychmiast po utworzeniu Lease",
          "Dopiero po zakończeniu całego programu, niezależnie od zakresu",
          "Przy wyjściu z zakresu bloku, gdy Lease przestaje być używany",
        ],
        [
          "Drop sprząta przy końcu życia wartości, nie przy konstrukcji.",
          "Zakres może zakończyć wartość wcześniej niż cały program.",
          "Wyjście z bloku kończy zakres Lease i uruchamia jego Drop przed następnym println!.",
        ],
      ),
      observe(
        "drop-e0040",
        "Zobacz E0040",
        "Uruchom próbę `marker.drop()`. E0040 chroni przed ręcznym wywołaniem destruktora; poprawiony wariant używa funkcji `std::mem::drop`, która przenosi wartość i kończy jej użycie.",
        dropBroken,
        dropFixed,
        "E0040",
      ),
      run(
        "drop-run",
        "Uruchom obserwację zakresu",
        "Cell jest tu tylko obserwatorem stanu: nie zastępuje reguł własności. Porównaj licznik wewnątrz zakresu, po zakresie i po jawnym `std::mem::drop`.",
        dropRun,
        "w środku: 0\npo zakresie: 1\npo jawnym drop: 2\n",
      ),
      choose(
        "drop-explain",
        "explain",
        "Rozróżnij Drop i mem::drop",
        "Co dzieje się z `lease` po `std::mem::drop(lease)`?",
        0,
        [
          "Wartość jest przeniesiona do funkcji, Drop wykona się raz i lease nie można już użyć",
          "Drop zostaje wyłączony, aby można było wywołać go później ręcznie",
          "Wartość jest sklonowana, a oryginalny lease nadal istnieje",
        ],
        [
          "`mem::drop` kończy życie przeniesionej wartości bez bezpośredniego wywołania metody destruktora.",
          "Drop nie jest wyłączany; jest uruchamiany dla wartości przekazanej do funkcji.",
          "Funkcja przyjmuje T przez wartość i nie wymaga Clone.",
        ],
      ),
      coding({
        id: "drop-release-gate",
        kind: "debug",
        title: "Napraw wcześniejsze oddanie Lease",
        prompt:
          "Uzupełnij `release_one`, aby utworzony `Lease` został oddany dokładnie raz przed odczytem licznika. Jego Drop zwiększa dostarczony licznik o jeden, a funkcja zwraca nowy stan: dla początkowego 0 wynik to 1, a dla 10 to 11. Zachowaj `Cell` jako obserwowany stan, nie wywołuj `Drop::drop` bezpośrednio i nie używaj wartości po przeniesieniu.",
        code: dropStarter,
        solution: dropSolution,
        tests: dropTests,
        hints: [
          "Samo utworzenie `_lease` odda zasób dopiero przy końcu funkcji, po wyrażeniu zwracanym.",
          "Nadaj uchwytowi nazwę i użyj standardowej funkcji, która kończy życie przekazanej wartości; dopiero potem odczytaj Cell.",
        ],
        gate: true,
      }),
      coding({
        id: "drop-blank",
        kind: "blank",
        title: "Samodzielnie zamknij Reservation",
        prompt:
          "Zaprojektuj rezerwację `Reservation` z polem `closed`, które pożycza Cell<bool>. Początkowe false oznacza otwartą rezerwację; jej Drop ma ustawić true. Funkcja `close_early` przyjmuje referencję do tego Cell i zwraca bool odczytany z niego po wcześniejszym oddaniu utworzonej rezerwacji. Testy utworzą także Reservation bez tej funkcji i sprawdzą stan przed oraz po końcu zakresu. Napisz własne typy i implementację bez bezpośredniego wywoływania metody destruktora.",
        solution: dropBlankSolution,
        tests: dropBlankTests,
        hints: [
          "Kontrakt jest taki sam jak w Lease, ale stan ma typ bool: Drop ma ustawić go na true.",
          "Wcześniej oddaj nazwany Reservation, a dopiero po jego zniszczeniu odczytaj `closed.get()`.",
        ],
        gate: true,
      }),
      choose(
        "drop-recall",
        "recall",
        "Odtwórz bezpieczne wcześniejsze Drop",
        "Który zapis jest przeznaczony do wcześniejszego oddania wartości implementującej Drop?",
        1,
        ["value.drop()", "std::mem::drop(value)", "let _ = &value"],
        [
          "Bezpośrednie wywołanie metody destruktora daje E0040.",
          "Funkcja przyjmuje wartość przez przeniesienie i pozwala Rustowi wykonać Drop raz.",
          "Pożyczka nie kończy życia właściciela.",
        ],
      ),
    ],
    misconceptions: [
      "Drop trzeba wywołać ręcznie, aby zasób został zwolniony.",
      "std::mem::drop jest specjalnym drugim destruktorem i może spowodować podwójne zwolnienie.",
      "Koniec zakresu jest tylko wskazówką i nie wpływa na moment Drop.",
    ],
    transferTask:
      "Zaprojektuj typ z Drop, który zmienia prosty obserwowany stan, a potem pokaż różnicę między końcem zakresu i świadomym `std::mem::drop`.",
    evidenceGate:
      "Dwa testy zachowania sprawdzają wcześniejsze oddanie Lease oraz samodzielny kontrakt Reservation z Cell<bool>.",
    sourceIds: ["boxed-values-std-drop", "boxed-values-error-e0040"],
  },
];

export const boxedValuesReviewExercises: Record<string, LessonStep> = {
  "box-recursive": coding({
    id: "review-box-recursive",
    kind: "apply",
    title: "Powtórka: drzewo bez Clone",
    prompt:
      "Uzupełnij generyczne `height`, aby policzyć wysokość drzewa `Tree<T>`. Każda gałąź ma `Box<Tree<T>>`, liść ma wysokość 1, a `Empty` ma 0. Testy używają nieklonowalnego payloadu i sprawdzają pustkę oraz małe drzewo.",
    code: String.raw`struct Payload(String);

enum Tree<T> {
    Empty,
    Leaf(T),
    Branch(Box<Tree<T>>, Box<Tree<T>>),
}

fn height<T>(tree: &Tree<T>) -> usize {
    match tree {
        Tree::Empty => 0,
        Tree::Leaf(_) => 0,
        Tree::Branch(_, _) => 0,
    }
}`,
    solution: String.raw`struct Payload(String);

enum Tree<T> {
    Empty,
    Leaf(T),
    Branch(Box<Tree<T>>, Box<Tree<T>>),
}

fn height<T>(tree: &Tree<T>) -> usize {
    match tree {
        Tree::Empty => 0,
        Tree::Leaf(_) => 1,
        Tree::Branch(left, right) => 1 + height(left).max(height(right)),
    }
}`,
    tests: String.raw`#[test]
fn computes_height_without_needing_payload_clone() {
    let tree = Tree::Branch(
        Box::new(Tree::Leaf(Payload(String::from("lewy")))),
        Box::new(Tree::Branch(
            Box::new(Tree::Leaf(Payload(String::from("prawy")))),
            Box::new(Tree::Empty),
        )),
    );
    assert_eq!(height(&tree), 3);
    assert_eq!(height(&Tree::<Payload>::Empty), 0);
}

#[test]
fn one_leaf_has_height_one() {
    assert_eq!(height(&Tree::Leaf(Payload(String::new()))), 1);
}`,
    hints: [
      "Wysokość liścia jest 1, bo liczy sam węzeł; Empty nie wnosi węzła.",
      "Dla Branch dodaj 1 do większej z wysokości pożyczonych dzieci.",
    ],
  }),
  "deref-contracts": coding({
    id: "review-deref-contracts",
    kind: "apply",
    title: "Powtórka: widok nazwy",
    prompt:
      "Zaimplementuj Deref dla `Name(String)` i funkcję `starts_with_a`. Wynik ma pożyczać oryginalny tekst i działać przez coercion do `&str`; testy sprawdzą Unicode, pusty tekst i adres bufora.",
    code: String.raw`use std::ops::Deref;

struct Name(String);

impl Deref for Name {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        ""
    }
}

fn starts_with_a(name: &str) -> bool {
    name.starts_with('A')
}`,
    solution: String.raw`use std::ops::Deref;

struct Name(String);

impl Deref for Name {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.0.as_str()
    }
}

fn starts_with_a(name: &str) -> bool {
    name.starts_with('A')
}`,
    tests: String.raw`#[test]
fn coercion_reads_the_original_name() {
    let name = Name(String::from("Ala: żółć"));
    let pointer = name.0.as_ptr();
    assert!(starts_with_a(&name));
    assert_eq!((&*name).as_ptr(), pointer);
}

#[test]
fn empty_and_other_initials_are_false() {
    assert!(!starts_with_a(&Name(String::new())));
    assert!(!starts_with_a(&Name(String::from("Łukasz"))));
}`,
    hints: [
      "Target pozostaje str, a referencja ma pochodzić z pola Name.",
      "Zwróć `self.0.as_str()`; `starts_with` skorzysta z coercion bez alokacji.",
    ],
  }),
  "drop-resources": coding({
    id: "review-drop-resources",
    kind: "apply",
    title: "Powtórka: zamknij uchwyt",
    prompt:
      "Uzupełnij `close`, aby utworzyć `Handle`, oddać go przez `std::mem::drop` i zwrócić liczbę zamknięć. Drop ma zwiększyć Cell dokładnie raz; nie używaj uchwytu po przeniesieniu.",
    code: String.raw`use std::cell::Cell;

struct Handle<'a> {
    closed: &'a Cell<u32>,
}

impl Drop for Handle<'_> {
    fn drop(&mut self) {
        self.closed.set(self.closed.get() + 1);
    }
}

fn close(closed: &Cell<u32>) -> u32 {
    let _handle = Handle { closed };
    0
}`,
    solution: String.raw`use std::cell::Cell;

struct Handle<'a> {
    closed: &'a Cell<u32>,
}

impl Drop for Handle<'_> {
    fn drop(&mut self) {
        self.closed.set(self.closed.get() + 1);
    }
}

fn close(closed: &Cell<u32>) -> u32 {
    let handle = Handle { closed };
    std::mem::drop(handle);
    closed.get()
}`,
    tests: String.raw`#[test]
fn closes_before_reading_the_counter() {
    let closed = Cell::new(0);
    assert_eq!(close(&closed), 1);
    assert_eq!(closed.get(), 1);
}

#[test]
fn starts_from_an_existing_counter_without_extra_drop() {
    let closed = Cell::new(4);
    assert_eq!(close(&closed), 5);
    assert_eq!(closed.get(), 5);
}`,
    hints: [
      "Wartość musi mieć nazwę, żeby przekazać ją do funkcji przez wartość.",
      "Po `std::mem::drop(handle)` odczytaj `closed.get()`; nie wywołuj `handle.drop()`.",
    ],
  }),
};

export const boxedValuesModule: CourseModule = {
  id: "boxed-values",
  title: "Box, Deref i Drop: właściciel, widok, zasób",
  whyItMatters:
    "Te trzy kontrakty pokazują, jak Rust zachowuje własność wartości o zmiennym kształcie, jak wystawia pożyczony widok i jak kończy życie zasobu w przewidywalnym momencie.",
  capabilities: [
    "Przerywasz rekurencję rozmiaru przez Box i przenosisz nieklonowalne dane.",
    "Implementujesz Deref z Target dla tekstu lub slice bez ukrytej kopii.",
    "Rozpoznajesz automatyczny Drop i kończysz życie wartości wcześniej przez std::mem::drop.",
  ],
  prerequisites: ["log-analyzer"],
  lessonIds: boxedValuesLessons.map((lesson) => lesson.id),
  exitGate: [
    "Rekurencyjny typ ma skończony pośrednik Box, a przejście właściciela zachowuje dane bez Clone i ograniczoną głębokość.",
    "Deref zwraca pożyczony Target z oryginalnych danych, a coercion działa bez klonowania i bez obietnicy static.",
    "Drop jest automatyczny przy końcu zakresu, E0040 zostaje naprawione przez std::mem::drop, a test obserwuje dokładnie jeden release.",
  ],
  projectConnection:
    "Po Log Analyzerze Box może opisać ograniczoną strukturę zagnieżdżonych wpisów, Deref może wystawić tani widok pola, a Drop pozwala jawnie zakończyć lokalny uchwyt zasobu przed budowaniem raportu.",
  assessmentId: "drop-resources/drop-blank",
  gateCriteria: [
    {
      id: "box-recursive-gate",
      label:
        "Box przerywa rekurencję i zachowuje własność bez kopiowania danych.",
      taskRefs: [
        { lessonId: "box-recursive", stepId: "box-move-gate" },
        { lessonId: "box-recursive", stepId: "box-list-gate" },
      ],
    },
    {
      id: "deref-contracts-gate",
      label:
        "Deref wystawia pożyczony Target i umożliwia coercion bez zmiany tożsamości danych.",
      taskRefs: [
        { lessonId: "deref-contracts", stepId: "deref-text-gate" },
        { lessonId: "deref-contracts", stepId: "deref-slice-gate" },
      ],
    },
    {
      id: "drop-resources-gate",
      label:
        "Drop kończy zasób automatycznie albo jawnie przez mem::drop w obserwowalnym momencie.",
      taskRefs: [
        { lessonId: "drop-resources", stepId: "drop-release-gate" },
        { lessonId: "drop-resources", stepId: "drop-blank" },
      ],
    },
  ],
};
