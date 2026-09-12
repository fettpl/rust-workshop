import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const genericsSources: Source[] = [
  {
    id: "generics-book-syntax",
    title: "The Rust Programming Language: Generic Data Types",
    url: "https://doc.rust-lang.org/book/ch10-01-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów T, T/U i metod generycznych.",
  },
  {
    id: "generics-reference-parameters",
    title: "The Rust Reference: Generic Parameters and Where Clauses",
    url: "https://doc.rust-lang.org/reference/items/generics.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie składni parametrów i klauzul where.",
  },
  {
    id: "generics-reference-impl",
    title: "The Rust Reference: Generic Implementations",
    url: "https://doc.rust-lang.org/reference/items/implementations.html#generic-implementations",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie przykładów impl<T>.",
  },
  {
    id: "generics-book-borrowing",
    title: "The Rust Programming Language: References and Borrowing",
    url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie ćwiczeń pożyczania i przenoszenia pól.",
  },
  {
    id: "generics-error-move",
    title: "Rust Error Index: E0507 — move out of borrowed content",
    url: "https://doc.rust-lang.org/error_codes/E0507.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj kod błędu w komunikacie używanego rustc po jego aktualizacji.",
  },
  {
    id: "generics-book-bounds",
    title: "The Rust Programming Language: Trait Bounds",
    url: "https://doc.rust-lang.org/book/ch10-02-traits.html#trait-bound-syntax",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie wprowadzenia ograniczeń i where.",
  },
  {
    id: "generics-error-operator",
    title: "Rust Error Index: E0369 — unsupported binary operation",
    url: "https://doc.rust-lang.org/error_codes/E0369.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj kod błędu w komunikacie używanego rustc po jego aktualizacji.",
  },
  {
    id: "generics-std-partial-eq",
    title: "Rust standard library: std::cmp::PartialEq",
    url: "https://doc.rust-lang.org/std/cmp/trait.PartialEq.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie zakresu porównań i przykładu NaN.",
  },
  {
    id: "generics-reference-comparison",
    title: "The Rust Reference: Comparison Operators",
    url: "https://doc.rust-lang.org/reference/expressions/operator-expr.html#comparison-operators",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie wyjaśnienia pożyczania przez ==.",
  },
];

export const genericsCompetencies: Competency[] = [
  {
    id: "design-generic-values",
    title:
      "Zapisujesz wspólny algorytm dla wielu typów i dobierasz T lub T, U.",
  },
  {
    id: "preserve-generic-ownership",
    title:
      "Projektujesz metody generyczne, które pożyczają lub oddają własność danych.",
  },
  {
    id: "require-minimal-bounds",
    title:
      "Wyprowadzasz minimalne ograniczenia typów z operacji użytych w funkcji.",
  },
];

export const genericsConcepts: Concept[] = [
  {
    id: "generic-type-parameters",
    title: "Parametry typów: ten sam T i niezależne T, U",
    prerequisites: ["io-terminal-boundary"],
    competencyIds: ["design-generic-values"],
    reviewPrompt:
      "Co obiecuje fn pair<T>(a: T, b: T), a co zmienia drugi parametr U?",
    reviewAnswer:
      "W jednym wywołaniu oba wystąpienia T oznaczają ten sam konkretny typ. Dodanie U pozwala wybrać typ drugiego argumentu niezależnie; T i U nadal mogą być takie same. Każde kolejne wywołanie może dobrać typy na nowo.",
    distinguish:
      "T jest nazwą parametru typu, a nie wartością ani dowolnie zmieniającym się typem podczas wykonania.",
  },
  {
    id: "generic-ownership",
    title: "impl<T>, pożyczający odczyt i metoda konsumująca",
    prerequisites: ["generic-type-parameters"],
    competencyIds: ["preserve-generic-ownership"],
    reviewPrompt:
      "Kiedy metoda generyczna może zwrócić pole T bez Copy lub Clone?",
    reviewAnswer:
      "Pożyczający odczyt przez &self zwraca &T i zostawia właściciela. Metoda przyjmująca self może przenieść pole jako T, bo przejęła strukturę. impl<T> wprowadza parametr typu dla definicji tych metod.",
    distinguish:
      "Generyczność nie znosi reguł własności. &self nie daje prawa do wyjęcia dowolnego T, a self nie oznacza automatycznej kopii struktury.",
  },
  {
    id: "minimal-trait-bounds",
    title: "Operacja wyznacza minimalny bound",
    prerequisites: ["generic-ownership"],
    competencyIds: ["require-minimal-bounds"],
    reviewPrompt:
      "Funkcja porównuje dwa T i zwraca jedno z nich. Jakiego bound potrzebuje?",
    reviewAnswer:
      "Porównanie == wymaga T: PartialEq. Przeniesienie posiadanej wartości do wyniku nie wymaga Copy ani Clone. where T: PartialEq zapisuje ten sam warunek co ograniczenie obok T w nawiasach ostrych.",
    distinguish:
      "Bound opisuje wymagane zachowanie typu, nie wybiera jednej konkretnej klasy danych. Debug jest potrzebne do formatowania {:?}, a nie do samego porównania.",
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

function discover(
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
  kind: "debug" | "modify" | "apply" | "blank";
  title: string;
  prompt: string;
  code: string;
  solution: string;
  tests: string;
  hints: [string, string];
  error?: string;
  gate?: boolean;
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

const carryRun = `fn carry<T>(value: T) -> Option<T> {
    Some(value)
}

fn main() {
    match carry(7) {
        Some(number) => println!("liczba: {}", number),
        None => println!("brak"),
    }
    match carry(String::from("żółć")) {
        Some(text) => println!("tekst: {}", text),
        None => println!("brak"),
    }
}`;

const duoBroken = `fn duo<T>(left: T, right: T) -> (T, T) {
    (left, right)
}
fn main() {
    let result = duo(4, String::from("pilne"));
    println!("{}: {}", result.0, result.1);
}`;
const duoSolution = duoBroken.replace(
  "duo<T>(left: T, right: T) -> (T, T)",
  "duo<T, U>(left: T, right: U) -> (T, U)",
);

const stampBroken = `struct Stamp<T> {
    key: T,
    value: T,
}
fn stamp<T>(key: T, value: T) -> Stamp<T> {
    Stamp { key, value }
}
fn main() {
    let stamped = stamp(String::from("priorytet"), 2u8);
    println!("{}: {}", stamped.key, stamped.value);
}`;
const stampSolution = `struct Stamp<T, U> {
    key: T,
    value: U,
}
fn stamp<T, U>(key: T, value: U) -> Stamp<T, U> {
    Stamp { key, value }
}
fn main() {
    let stamped = stamp(String::from("priorytet"), 2u8);
    println!("{}: {}", stamped.key, stamped.value);
}`;
const stampTests = `struct Secret { text: String }
#[test]
fn independent_key_and_value_types() {
    let a = stamp(String::from("żółć"), 7u8);
    assert_eq!(a.key, "żółć");
    assert_eq!(a.value, 7);
    let b = stamp(false, String::new());
    assert!(!b.key);
    assert_eq!(b.value, "");
    let c = stamp(Secret { text: String::from("klucz") }, Secret { text: String::from("wartość") });
    assert_eq!(c.key.text, "klucz");
    assert_eq!(c.value.text, "wartość");
}`;

const pairStarter = `struct Pair<T> {
    first: T,
    second: T,
}
fn pair<T>(first: T, second: T) -> Pair<T> {
    Pair { first, second }
}
fn swap<T>(values: Pair<T>) -> Pair<T> {
    values
}`;
const pairSolution = pairStarter.replace(
  "    values\n}",
  "    Pair { first: values.second, second: values.first }\n}",
);
const pairTests = `struct Parcel { name: String }
#[test]
fn construction_and_swap_preserve_both_owned_values() {
    let a: Pair<i32> = pair(-3, 8);
    assert_eq!(a.first, -3);
    assert_eq!(a.second, 8);
    let b = swap(a);
    assert_eq!((b.first, b.second), (8, -3));
    let text = swap(pair(String::new(), String::from("Łódź")));
    assert_eq!(text.first, "Łódź");
    assert_eq!(text.second, "");
    let parcels = swap(pair(Parcel { name: String::from("A") }, Parcel { name: String::from("B") }));
    assert_eq!(parcels.first.name, "B");
    assert_eq!(parcels.second.name, "A");
    let again = swap(parcels);
    assert_eq!(again.first.name, "A");
    assert_eq!(again.second.name, "B");
}`;

const packetStarter = `struct Packet<T, U> {
    payload: T,
    tag: U,
}
fn merge_packet<T, U>(earlier: Packet<T, U>, later: Packet<T, U>) -> Packet<T, U> {
    earlier
}`;
const packetSolution = packetStarter.replace(
  "    earlier\n}",
  "    Packet { payload: earlier.payload, tag: later.tag }\n}",
);
const packetTests = `struct Body { text: String }
struct Mark { text: String }
#[test]
fn first_payload_and_second_tag_have_independent_types() {
    let a: Packet<String, u8> = merge_packet(
        Packet { payload: String::from("żółć"), tag: 1 },
        Packet { payload: String::from("zbędny"), tag: 9 },
    );
    assert_eq!(a.payload, "żółć");
    assert_eq!(a.tag, 9);
    let b: Packet<bool, String> = merge_packet(
        Packet { payload: false, tag: String::from("stary") },
        Packet { payload: true, tag: String::new() },
    );
    assert!(!b.payload);
    assert_eq!(b.tag, "");
    let c = merge_packet(
        Packet { payload: Body { text: String::from("treść") }, tag: Mark { text: String::from("dawny") } },
        Packet { payload: Body { text: String::new() }, tag: Mark { text: String::from("nowy") } },
    );
    assert_eq!(c.payload.text, "treść");
    assert_eq!(c.tag.text, "nowy");
}`;

const sensorRun = `struct Sensor<T> {
    reading: T,
}
impl<T> Sensor<T> {
    fn reading(&self) -> &T {
        &self.reading
    }
}
fn main() {
    let label = Sensor { reading: String::from("północ") };
    println!("{}", label.reading());
    println!("{}", label.reading());
    let count = Sensor { reading: 12 };
    println!("{}", count.reading());
}`;

const holderBroken = `struct Holder<T> { value: T }
impl<T> Holder<T> {
    fn extract(&self) -> T { self.value }
}
fn main() {
    let holder = Holder { value: String::from("dokument") };
    let document = holder.extract();
    println!("{}", document);
}`;
const holderSolution = holderBroken.replace(
  "fn extract(&self)",
  "fn extract(self)",
);
const holderTests = `struct Document { body: String }
#[test]
fn extraction_moves_values_without_extra_bounds() {
    assert_eq!(Holder { value: -5i32 }.extract(), -5);
    assert_eq!(Holder { value: String::new() }.extract(), "");
    let document = Holder { value: Document { body: String::from("zażółć") } }.extract();
    assert_eq!(document.body, "zażółć");
}`;

const archiveStarter = `struct Archive<T> {
    current: T,
    previous: T,
}
impl<T> Archive<T> {
    fn new(current: T, previous: T) -> Archive<T> {
        Archive { current, previous }
    }
    fn peek(&self) -> &T {
        &self.previous
    }
    fn into_parts(self) -> (T, T) {
        (self.previous, self.current)
    }
}`;
const archiveSolution = archiveStarter
  .replace("&self.previous", "&self.current")
  .replace("(self.previous, self.current)", "(self.current, self.previous)");
const archiveTests = `struct Draft { text: String }
#[test]
fn borrowed_current_and_consumed_parts_agree() {
    let numbers: Archive<i32> = Archive::new(9, -2);
    assert_eq!(*numbers.peek(), 9);
    assert_eq!(*numbers.peek(), 9);
    assert_eq!(numbers.into_parts(), (9, -2));
    let words = Archive::new(String::from("Łódź"), String::new());
    assert_eq!(words.peek(), "Łódź");
    let (current, previous) = words.into_parts();
    assert_eq!(current, "Łódź");
    assert_eq!(previous, "");
    let drafts = Archive::new(Draft { text: String::from("teraz") }, Draft { text: String::from("wcześniej") });
    assert_eq!(drafts.peek().text, "teraz");
    assert!(std::ptr::eq(drafts.peek(), &drafts.current));
    let (current, previous) = drafts.into_parts();
    assert_eq!(current.text, "teraz");
    assert_eq!(previous.text, "wcześniej");
}`;

const envelopeStarter = `struct Envelope<T> { value: T }
impl<T> Envelope<T> {
    fn new(value: T) -> Envelope<T> { Envelope { value } }
    fn peek(&self) -> &T { &self.value }
    fn replace(self, replacement: T) -> (Envelope<T>, T) {
        (self, replacement)
    }
}`;
const envelopeSolution = envelopeStarter.replace(
  "(self, replacement)",
  "(Envelope { value: replacement }, self.value)",
);
const envelopeTests = `struct Key { text: String }
#[test]
fn replacement_returns_old_ownership_and_new_container() {
    let numbers: Envelope<i32> = Envelope::new(2);
    assert_eq!(*numbers.peek(), 2);
    assert_eq!(*numbers.peek(), 2);
    let (numbers, old) = numbers.replace(-7);
    assert_eq!(old, 2);
    assert_eq!(*numbers.peek(), -7);
    let (words, old) = Envelope::new(String::new()).replace(String::from("żółć"));
    assert_eq!(old, "");
    assert_eq!(words.peek(), "żółć");
    let keys = Envelope::new(Key { text: String::from("stary") });
    assert_eq!(keys.peek().text, "stary");
    let (keys, old) = keys.replace(Key { text: String::from("nowy") });
    assert_eq!(old.text, "stary");
    assert_eq!(keys.peek().text, "nowy");
    let (keys, old) = keys.replace(old);
    assert_eq!(keys.peek().text, "stary");
    assert_eq!(old.text, "nowy");
}`;

const comparisonRun = `fn main() {
    let left = String::from("żółć");
    let right = String::from("żółć");
    println!("równe: {}", left == right);
    println!("dalej: {} / {}", left, right);
    println!("liczby: {}", 2 == 3);
}`;
const equalityBroken = `fn same<T>(left: &T, right: &T) -> bool {
    left == right
}
fn main() {
    println!("{}", same(&3, &3));
}`;
const equalitySolution = equalityBroken.replace(
  "fn same<T>",
  "fn same<T: PartialEq>",
);
const equalityTests = `#[derive(PartialEq)]
struct Badge { text: String }
#[test]
fn comparison_only_requires_equality() {
    assert!(same(&3i32, &3));
    assert!(!same(&3i32, &-3));
    let nan = f64::NAN;
    assert!(!same(&nan, &nan));
    let a = String::from("żółć");
    let b = String::from("żółć");
    assert!(same(&a, &b));
    assert!(!same(&a, &String::new()));
    assert_eq!(a, "żółć");
    assert_eq!(b, "żółć");
    let one = Badge { text: String::new() };
    let two = Badge { text: String::from("A") };
    assert!(!same(&one, &two));
    assert!(same(&one, &one));
    assert_eq!(two.text, "A");
}`;

const changeStarter = `fn replace_if_different<T>(old: T, proposed: T) -> (T, bool)
where
    T: PartialEq,
{
    (old, false)
}`;
const changeSolution = `fn replace_if_different<T>(old: T, proposed: T) -> (T, bool)
where
    T: PartialEq,
{
    if old == proposed {
        (old, false)
    } else {
        (proposed, true)
    }
}`;
const changeTests = `#[derive(PartialEq)]
struct Setting { text: String }
#[test]
fn change_flag_and_selected_value_match_equality() {
    assert_eq!(replace_if_different(4i32, 4), (4, false));
    assert_eq!(replace_if_different(4i32, -8), (-8, true));
    assert_eq!(replace_if_different(String::from("Łódź"), String::new()), (String::new(), true));
    assert_eq!(replace_if_different(String::new(), String::new()), (String::new(), false));
    let old = Setting { text: String::from("zażółć") };
    let old_allocation = old.text.as_ptr();
    let (kept, changed) = replace_if_different(old, Setting { text: String::from("zażółć") });
    assert!(!changed);
    assert_eq!(kept.text.as_ptr(), old_allocation);
    let proposed = Setting { text: String::from("nowy") };
    let proposed_allocation = proposed.text.as_ptr();
    let (updated, changed) = replace_if_different(kept, proposed);
    assert!(changed);
    assert_eq!(updated.text, "nowy");
    assert_eq!(updated.text.as_ptr(), proposed_allocation);
}`;

const admissionSolution = `fn admit<T>(current: &T, candidate: T) -> Result<T, T>
where
    T: PartialEq,
{
    if current == &candidate {
        Err(candidate)
    } else {
        Ok(candidate)
    }
}`;
const admissionTests = `#[derive(PartialEq)]
struct Ticket { name: String }
#[test]
fn borrowed_current_and_owned_candidate_survive_both_branches() {
    let number = 4i32;
    assert_eq!(admit(&number, 4), Err(4));
    assert_eq!(admit(&number, -9), Ok(-9));
    assert_eq!(number, 4);
    let city = String::from("Łódź");
    assert_eq!(admit(&city, String::from("Łódź")), Err(String::from("Łódź")));
    assert_eq!(admit(&city, String::new()), Ok(String::new()));
    assert_eq!(admit(&String::new(), String::new()), Err(String::new()));
    assert_eq!(city, "Łódź");
    let current = Ticket { name: String::from("Ada") };
    let candidate = Ticket { name: String::from("Ada") };
    let candidate_allocation = candidate.name.as_ptr();
    match admit(&current, candidate) {
        Err(returned) => {
            assert_eq!(returned.name, "Ada");
            assert_eq!(returned.name.as_ptr(), candidate_allocation);
        }
        Ok(_) => panic!("duplicate admitted"),
    }
    match admit(&current, Ticket { name: String::from("Żaneta") }) {
        Ok(accepted) => assert_eq!(accepted.name, "Żaneta"),
        Err(_) => panic!("different ticket rejected"),
    }
    assert_eq!(current.name, "Ada");
}`;

export const genericsLessons: Lesson[] = [
  {
    id: "generic-values",
    moduleId: "generics",
    conceptIds: ["generic-type-parameters"],
    competencyIds: ["design-generic-values"],
    prerequisites: ["todo-terminal-cli"],
    title: "Jeden algorytm, różne typy",
    subtitle: "Zastępujesz powtarzane typy parametrami T i U.",
    minutes: 18,
    outcomes: [
      "Zadeklarujesz parametr typu w funkcji i strukturze.",
      "Odróżnisz powtórzenie T od niezależnych T i U.",
      "Przeniesiesz wartości String przez algorytm bez kopiowania danych.",
    ],
    steps: [
      choose(
        "values-predict",
        "predict",
        "Przewidź dwie instancje funkcji",
        'Znasz Option<String> i Option<u8>. W definicji fn carry<T>(value: T) -> Option<T> { Some(value) } zapis <T> wprowadza nazwę typu dobieranego przy wywołaniu. Co stanie się, gdy ten sam main wywoła carry(7), a potem carry(String::from("żółć"))? Najpierw wybierz przewidywanie.',
        1,
        [
          "Drugie wywołanie musi też przyjąć liczbę",
          "Oba zadziałają; każde wywołanie dobierze swoje T",
          "Rust zamieni tekst na liczbę",
        ],
        [
          "Typ pierwszego wywołania nie wiąże następnych wywołań funkcji generycznej.",
          "T jest stałe wewnątrz jednego wywołania, ale drugie może użyć innego typu.",
          "Parametr typu nie poleca konwersji danych.",
        ],
      ),
      run(
        "values-run",
        "Uruchom znane Option z parametrem",
        "Uruchom i porównaj wynik z przewidywaniem. carry dostaje własność value i wkłada tę wartość do Some. Nie musi wiedzieć, jak wyświetla się każdy T: println! jest dopiero w main, gdzie typy są konkretne. <T> po nazwie funkcji deklaruje parametr, a T przy value i w Option<T> wskazuje jego użycia. Tak samo struct Pair<T> { first: T, second: T } opisuje parę pól jednego typu. Samo przenoszenie i przechowywanie T nie wymaga kopiowania. Zmień napis na pusty i ponownie uruchom, zanim wrócisz do oryginalnego przykładu.",
        carryRun,
        "liczba: 7\ntekst: żółć\n",
      ),
      discover(
        "values-discover",
        "Odkryj, co znaczy ten sam T",
        "Uruchom duo. Pierwszy argument ustala tutaj typ liczbowy, a drugi jest String: otrzymasz E0308. Dwa wystąpienia T muszą pasować do tego samego konkretnego typu. Gdy kontrakt pozwala na różne typy, zadeklaruj <T, U>, użyj U przy drugim argumencie i przy drugiej pozycji wyniku. Krotka (T, U) zachowuje oba typy, a pola .0 i .1 odczytują jej pozycje. Popraw podpis i sprawdź ponownie komunikaty kompilatora.",
        duoBroken,
        duoSolution,
        "E0308",
      ),
      choose(
        "values-explain",
        "explain",
        "Wybierz właściwą obietnicę API",
        "Para współrzędnych ma dwa elementy tego samego typu. Rekord pomiaru ma wartość i etykietę o niezależnych typach. Który wybór parametrów wyraża oba wymagania?",
        2,
        [
          "Dwa T, U wszędzie, bo muszą być różne",
          "Jedno T wszędzie, bo Rust zgadnie drugi typ osobno",
          "Pair<T> dla współrzędnych, Record<T, U> dla wartości i etykiety",
        ],
        [
          "T i U pozwalają na różne typy, ale nie wymagają ich różności.",
          "Dwa pola T jednego rekordu mają ten sam typ; nazwa T nie jest osobną zagadką przy każdym polu.",
          "Liczba parametrów zapisuje relacje między polami. Niezależne typy nadal mogą przypadkiem być takie same.",
        ],
      ),
      coding({
        id: "values-debug",
        kind: "debug",
        title: "Napraw mieszany rekord",
        prompt:
          "Napraw E0308 bez zmiany danych w main. Stamp ma przechowywać key typu T i value niezależnego typu U. Funkcja stamp(key, value) zwraca Stamp z dokładnie przekazanymi polami. Uzgodnij deklarację struktury, deklarację funkcji, argumenty i typ wyniku. Nie ograniczaj danych do String i u8: testy podadzą też inne typy.",
        code: stampBroken,
        solution: stampSolution,
        tests: stampTests,
        error: "E0308",
        hints: [
          "Jeden parametr T wymusza wspólny typ obu pól.",
          "Sprawdź, czy deklaracje struktury i funkcji zapisują tę samą relację między typami pól. Prześledź także typ wyniku.",
        ],
      }),
      coding({
        id: "values-modify",
        kind: "modify",
        title: "Zamień kolejność bez kopiowania",
        prompt:
          "pair(first, second) już poprawnie tworzy Pair<T>. Zmień swap: przejmuje Pair<T> i oddaje nową parę z dawnym second jako first oraz dawnym first jako second. Zachowaj nazwy, pola i oba generyczne podpisy. Ma działać dla liczb, pustych i niepustych String oraz struktur, których nie można kopiować ani klonować. Nie porównuj i nie formatuj T. Podwójna zamiana ma odtworzyć kolejność.",
        code: pairStarter,
        solution: pairSolution,
        tests: pairTests,
        gate: true,
        hints: [
          "Funkcja dostała całą parę na własność, więc może przenieść jej oba pola.",
          "Rozpisz, do której pozycji wyniku trafia każde posiadane pole; żadne nie może zostać użyte dwukrotnie.",
        ],
      }),
      coding({
        id: "values-transfer",
        kind: "apply",
        title: "Połącz zawartość ze świeżą etykietą",
        prompt:
          "Nowy kontrakt: Packet<T, U> przechowuje payload i tag o niezależnych typach. merge_packet przejmuje wcześniejszy i późniejszy pakiet, po czym zwraca payload wcześniejszego oraz tag późniejszego. Pozostałe pola nie trafiają do wyniku. Zachowaj strukturę oraz generyczny podpis. Testy sprawdzą także payload bool z tag String oraz dwa różne własne typy bez Copy, Clone i Debug. Ten wariant może dać świeży dowód po odsłonięciu rozwiązania zamiany pary.",
        code: packetStarter,
        solution: packetSolution,
        tests: packetTests,
        gate: true,
        hints: [
          "Wybierasz pola z dwóch właścicieli; nie zamieniasz miejscami T z U.",
          "Wybierz osobno właściciela każdej części wyniku; nie musisz przekazywać całego jednego pakietu.",
        ],
      }),
      choose(
        "values-recall",
        "recall",
        "Odtwórz regułę bez kodu",
        "Bez wracania do przykładów: czy fn f<T, U>(a: T, b: U) przyjmie dwa String?",
        0,
        [
          "Tak, niezależne parametry mogą oznaczać ten sam typ",
          "Nie, U oznacza obowiązkowo typ inny od T",
          "Tylko po sklonowaniu drugiego argumentu",
        ],
        [
          "Niezależność usuwa wymóg zgodności; nie dodaje wymogu różności.",
          "Różne nazwy parametrów nie są testem nierówności typów.",
          "Dwa posiadane String można przenieść do dwóch argumentów bez klonowania.",
        ],
      ),
    ],
    misconceptions: [
      "Pierwsze wywołanie ustala T dla wszystkich następnych.",
      "T i U muszą być różnymi typami.",
      "Funkcja generyczna potrzebuje Clone do przenoszenia String.",
    ],
    transferTask:
      "Połącz pola dwóch pakietów o niezależnych typach zamiast zamieniać dwa pola tego samego typu.",
    evidenceGate:
      "Samodzielny swap albo merge_packet przechodzi testy dla wielu typów, w tym danych bez Copy i Clone.",
    sourceIds: ["generics-book-syntax", "generics-reference-parameters"],
  },
  {
    id: "generic-impl",
    moduleId: "generics",
    conceptIds: ["generic-ownership"],
    competencyIds: ["preserve-generic-ownership"],
    prerequisites: ["generic-values"],
    title: "Generyczne metody i właściciel danych",
    subtitle: "Oddzielasz podgląd przez &self od oddania wartości przez self.",
    minutes: 20,
    outcomes: [
      "Napiszesz impl<T> dla struktury z parametrem typu.",
      "Pożyczysz &T bez odbierania właściciela struktury.",
      "Oddasz posiadane pola z metody przyjmującej self bez dodawania Clone.",
    ],
    steps: [
      choose(
        "impl-predict",
        "predict",
        "Przewidź drugi podgląd",
        "Sensor<T> zawiera reading: T. Metoda reading(&self) -> &T zwraca &self.reading. Po wywołaniu na Sensor<String> chcesz wywołać ją ponownie. Czy pierwszy podgląd zużyje String?",
        2,
        [
          "Tak, bo T może zawierać tekst na stercie",
          "Nie, ponieważ każdy parametr T automatycznie ma Copy",
          "Nie, &self pożycza strukturę, a &T pożycza jej pole",
        ],
        [
          "Miejsce przechowania danych nie zmienia znaczenia referencji.",
          "T nie uzyskuje Copy przez samo umieszczenie w metodzie generycznej.",
          "Oba podglądy są pożyczkami. Właścicielem pola pozostaje Sensor.",
        ],
      ),
      run(
        "impl-run",
        "Uruchom metody dla String i liczby",
        "impl<T> Sensor<T> deklaruje T dla tego bloku metod. Samo T w definicji struct nie deklaruje go ponownie w osobnym impl. Metoda reading bierze &self i oddaje &T; referencja odnosi się do pola właściciela. Rust wywnioskuje tutaj powiązanie pożyczki wyniku z pożyczką self, więc nie dodajemy żadnych nowych adnotacji. Uruchom dwa podglądy String oraz odczyt liczby. Potem zmień tekst i sprawdź oba odczyty; przywróć oryginalny przykład, aby zaliczyć jego oczekiwany wynik.",
        sensorRun,
        "północ\npółnoc\n12\n",
      ),
      discover(
        "impl-discover",
        "Odkryj granicę pożyczki",
        "Uruchom extract. E0507 wskazuje próbę przeniesienia self.value z pożyczonego obiektu. Nie znamy T, więc nie możemy założyć Copy. Wymaganie tego API brzmi: oddać posiadaną wartość i zużyć Holder. Zmień odbiorcę metody na self. W alternatywnym API służącym wyłącznie do podglądu pasowałby wynik &T oraz &self, ale taki wynik nie realizuje kontraktu extract.",
        holderBroken,
        holderSolution,
        "E0507",
      ),
      choose(
        "impl-explain",
        "explain",
        "Dobierz podpis do celu",
        "Wartość T może być zasobem, którego nie da się skopiować ani sklonować. Który zestaw metod pozwala najpierw odczytywać, a na końcu przejąć dane?",
        0,
        [
          "peek(&self) -> &T oraz into_value(self) -> T",
          "peek(&self) -> T oraz into_value(&self) -> T",
          "Obie metody muszą wymagać T: Copy",
        ],
        [
          "Podgląd nie oddaje własności, a metoda konsumująca przejmuje właściciela i może przenieść pole.",
          "Z &self nie można wyjąć dowolnego posiadanego T; trzeba pożyczyć pole lub przejąć strukturę.",
          "Takie ograniczenie odrzuciłoby między innymi String, mimo że żądane operacje nie potrzebują kopii.",
        ],
      ),
      coding({
        id: "impl-debug",
        kind: "debug",
        title: "Napraw konsumującą metodę",
        prompt:
          "Napraw Holder::extract: ma zwrócić posiadane T i zużyć Holder. Usuń przyczynę E0507 przez dobór odbiorcy metody. Zachowaj nazwę, pole value i wynik T; nie zmieniaj kontraktu na referencję, nie dodawaj Copy ani Clone. Testy wywołają extract również dla własnej struktury zawierającej String.",
        code: holderBroken,
        solution: holderSolution,
        tests: holderTests,
        error: "E0507",
        hints: [
          "Sprawdź, jakie prawo do pola daje obecny sposób otrzymania obiektu przez metodę.",
          "Dopasuj odbiorcę metody do kontraktu oddania własności. Sama zmiana ciała nie usuwa ograniczenia pożyczki.",
        ],
      }),
      coding({
        id: "impl-modify",
        kind: "modify",
        title: "Podgląd i rozłożenie archiwum",
        prompt:
          "Archive<T> przechowuje current i previous. new(current, previous) już poprawnie tworzy archiwum. Napraw peek(&self) -> &T, aby pożyczało current, oraz into_parts(self) -> (T, T), aby oddawało (current, previous) w tej kolejności. Użytkownik może wykonać kilka podglądów, a potem zużyć archiwum. Zachowaj pola i metody. Bez wymagania Copy, Clone lub Debug dla T.",
        code: archiveStarter,
        solution: archiveSolution,
        tests: archiveTests,
        gate: true,
        hints: [
          "Zwracana referencja i pierwszy element wyniku powinny dotyczyć current.",
          "Sprawdź niezależnie cel pożyczki i kolejność części oddawanych przy zużyciu archiwum.",
        ],
      }),
      coding({
        id: "impl-transfer",
        kind: "apply",
        title: "Wymień zawartość i odzyskaj starą",
        prompt:
          "Envelope<T> ma new(value), pożyczający peek() i replace(self, replacement). Napraw replace: zużywa kopertę, tworzy kopertę z replacement i zwraca parę (nowa_koperta, dawna_wartość). Stara wartość nie może zaginąć. Zachowaj działający podgląd oraz podpisy metod. Klient może odzyskaną starą wartość przekazać do następnej wymiany. Typ T nie musi dawać się klonować, kopiować ani formatować. To inny kontrakt niż rozłożenie Archive.",
        code: envelopeStarter,
        solution: envelopeSolution,
        tests: envelopeTests,
        gate: true,
        hints: [
          "Masz dwóch właścicieli: self.value i argument replacement. Każdy trafia w inne miejsce wyniku.",
          "Przed zbudowaniem wyniku przypisz każdej z dwóch posiadanych wartości jedno miejsce docelowe. Żadna nie powinna zaginąć ani zostać użyta dwukrotnie.",
        ],
      }),
      choose(
        "impl-recall",
        "recall",
        "Odtwórz rolę obu wystąpień T",
        "Bez wracania do kodu: dlaczego piszemy impl<T> Envelope<T>, zamiast samego impl Envelope<T>?",
        1,
        [
          "Pierwsze T kopiuje pola struktury",
          "Pierwsze <T> deklaruje parametr dla impl, drugie stosuje go do Envelope",
          "Drugie T jest zmienną przechowującą wartość",
        ],
        [
          "Składnia deklaracji typu nie wykonuje żadnego kopiowania.",
          "Deklaracja parametru w struct i deklaracja w impl mają własne zakresy.",
          "W obu miejscach T dotyczy typu, a nie zmiennej programu.",
        ],
      ),
    ],
    misconceptions: [
      "T zadeklarowane przy struct jest automatycznie zadeklarowane w każdym impl.",
      "&self pozwala przenieść dowolne pole T.",
      "Dodanie Clone jest konieczną naprawą każdego E0507.",
    ],
    transferTask:
      "Zaprojektuj wymianę, która zwraca nowy kontener i oddaje klientowi poprzednią posiadaną wartość.",
    evidenceGate:
      "Archive albo Envelope zachowuje wielokrotny podgląd i prawidłowo przenosi wszystkie wartości także dla typu bez Copy, Clone i Debug.",
    sourceIds: [
      "generics-reference-impl",
      "generics-book-borrowing",
      "generics-error-move",
    ],
  },
  {
    id: "generic-bounds",
    moduleId: "generics",
    conceptIds: ["minimal-trait-bounds"],
    competencyIds: ["require-minimal-bounds"],
    prerequisites: ["generic-impl"],
    title: "Wymagaj tylko potrzebnego zachowania",
    subtitle:
      "Wyprowadzasz PartialEq z błędu kompilatora i zapisujesz warunek where.",
    minutes: 20,
    outcomes: [
      "Wyjaśnisz E0369 w generycznym porównaniu.",
      "Użyjesz standardowego PartialEq i równoważnego zapisu where.",
      "Zachowasz przenoszenie danych bez zbędnych Copy, Clone i Debug.",
    ],
    steps: [
      choose(
        "bounds-predict",
        "predict",
        "Przewidź granicę dowolnego T",
        "Dotąd algorytmy jedynie przechowywały i przenosiły T. Teraz piszesz fn same<T>(left: &T, right: &T) -> bool { left == right }. Czy kompilator może założyć, że każdy T obsługuje ==?",
        0,
        [
          "Nie, podpis musi wymagać obsługi tej operacji",
          "Tak, każdy typ ma automatyczne porównanie wszystkich pól",
          "Tak, wystarczy wywołać funkcję tylko z liczbami",
        ],
        [
          "Ciało funkcji generycznej musi być poprawne przy wymaganiach zapisanych w podpisie.",
          "Własny typ nie otrzymuje automatycznie porównania wszystkich pól.",
          "Kompilator sprawdza generyczną definicję; wywołanie z i32 nie dopisuje jej brakujących wymagań.",
        ],
      ),
      run(
        "bounds-run",
        "Sprawdź porównanie konkretnych danych",
        "Uruchom porównanie String i liczb. == pożycza operandy, więc dwa String pozostają dostępne w kolejnym println!. Znane typy obsługują to porównanie, lecz nie wynika z tego, że dowolny T też je obsłuży. Najpierw sprawdź to na definicji w następnym kroku. Ten eksperyment bada samą operację; decyzję o tym, którą wartość zwrócić klientowi, zaprogramujesz samodzielnie.",
        comparisonRun,
        "równe: true\ndalej: żółć / żółć\nliczby: false\n",
      ),
      discover(
        "bounds-discover",
        "Odczytaj E0369 i nazwij wymaganie",
        "Uruchom same i odczytaj E0369 przy ==. Trait to nazwana umowa opisująca zachowanie typu. Standardowy PartialEq udostępnia porównanie == i !=; dodanie <T: PartialEq> ogranicza funkcję do typów, które tę umowę spełniają. To ograniczenie nazywa się bound. Popraw podpis i uruchom ponownie. Nie tworzysz teraz własnego traitu. PartialEq nie obiecuje, że każda wartość jest równa samej sobie: na przykład f64::NAN == f64::NAN daje false. Nasz kod stosuje wynik ==, a nie założenie o każdej parze danych.",
        equalityBroken,
        equalitySolution,
        "E0369",
      ),
      choose(
        "bounds-explain",
        "explain",
        "Ograniczenie wynika z operacji",
        "Zapis fn same<T>(a: &T, b: &T) -> bool where T: PartialEq { a == b } ma tę samą obietnicę co <T: PartialEq>. where przenosi warunki za listę argumentów i wynik, przed ciało. Funkcja porównuje dwa posiadane T i następnie przenosi jedno do wyniku. Jakich warunków wymaga samo takie ciało?",
        2,
        [
          "PartialEq + Copy, bo return zawsze kopiuje",
          "PartialEq + Clone + Debug na wszelki wypadek",
          "PartialEq; samo przeniesienie wyniku nie wymaga dodatkowego traitu",
        ],
        [
          "Zwrócenie posiadanej wartości może ją przenieść. Copy nie jest konieczne.",
          "Clone dotyczy jawnego klonowania, Debug formatowania {:?}. Zbędne warunki odrzucają poprawnych klientów.",
          "Każdy bound powinien mieć uzasadnienie w operacji. Możesz porównać wartości i później oddać jedną przez przeniesienie.",
        ],
      ),
      coding({
        id: "bounds-debug",
        kind: "debug",
        title: "Napraw porównanie bez zwężania API",
        prompt:
          "Napraw E0369 w same, zachowując pożyczone argumenty &T i wynik bool zgodny z ==. Dodaj wyłącznie potrzebny warunek PartialEq, obok T albo w where. Nie wymagaj Copy, Clone ani Debug. Testy używają liczb, String oraz struktury obsługującej równość, ale bez tych trzech dodatkowych cech.",
        code: equalityBroken,
        solution: equalitySolution,
        tests: equalityTests,
        error: "E0369",
        hints: [
          "Komunikat błędu dotyczy operatora użytego w ciele funkcji.",
          "Poszukaj w komunikacie nazwy wymaganego zachowania. Zapisz je jako warunek parametru typu, zachowując pożyczone argumenty.",
        ],
      }),
      coding({
        id: "bounds-modify",
        kind: "modify",
        title: "Zastosuj zmianę tylko przy różnicy",
        prompt:
          "Uzupełnij replace_if_different(old, proposed) -> (T, bool). Jeśli old == proposed, zwróć dokładnie dawną wartość old oraz false. Gdy wartości się różnią, zwróć proposed oraz true. Funkcja przejmuje oba argumenty; nie wyświetla ich i nie klonuje. Zostaw wyłącznie where T: PartialEq. Testy sprawdzają też, którego właściciela danych oddajesz przy równości. Nie wystarczy poprawna flaga obok niewłaściwej wartości.",
        code: changeStarter,
        solution: changeSolution,
        tests: changeTests,
        gate: true,
        hints: [
          "Porównanie nie zużywa argumentów, więc po nim możesz przenieść old albo proposed.",
          "Rozpisz dwie gałęzie i w każdej sprawdź osobno flagę oraz tożsamość zwracanego właściciela danych.",
        ],
      }),
      coding({
        id: "bounds-blank",
        kind: "blank",
        title: "Od pustego pliku: przyjmij inny bilet",
        prompt:
          "Napisz od zera generyczną funkcję admit. Przyjmuje current: &T oraz candidate: T, zwraca Result<T, T>. Gdy candidate jest równy current według ==, oddaje kandydata w Err. Gdy jest inny, oddaje go w Ok. current jest tylko pożyczone i ma pozostać do dalszego użycia, a candidate wraca w obu gałęziach bez klonowania. Wymagaj tylko PartialEq; możesz zapisać warunek w where. Nazwa funkcji i podany kontrakt to całe wymagane API. Napisz sam podpis i ciało, bez obowiązkowego szkieletu oraz bez main. To świeży wariant po odsłonięciu poprzedniego zadania: zmienił się właściciel argumentu i sposób raportowania decyzji.",
        code: "",
        solution: admissionSolution,
        tests: admissionTests,
        gate: true,
        hints: [
          "Typ wyniku przechowuje posiadanego kandydata zarówno w Ok, jak i Err. Do porównania pożycz candidate.",
          "Oddziel sprawdzenie warunku od oddania kandydata. Wynik porównania nie zużywa argumentów, więc wybór wariantu Result może nastąpić później.",
        ],
      }),
      choose(
        "bounds-recall",
        "recall",
        "Odtwórz powód każdego bound",
        "Nowa funkcja jedynie przenosi T do Some(T). Nie porównuje, nie klonuje i nie formatuje. Jakie dodatkowe ograniczenia PartialEq, Copy, Clone lub Debug należy dopisać?",
        1,
        [
          "Wszystkie, aby funkcja była bezpieczna",
          "Żadnego z nich; potrzebne wymagania wynikają z użytych operacji",
          "PartialEq, bo Option zawsze porównuje zawartość",
        ],
        [
          "Takie ograniczenia wykluczyłyby poprawne typy bez korzyści dla tego ciała.",
          "Przenoszenie wartości do znanego kontenera nie potrzebuje żadnej z wymienionych operacji.",
          "Utworzenie Some niczego nie porównuje. Porównanie Option byłoby osobną operacją.",
        ],
      ),
    ],
    misconceptions: [
      "Jeśli testowy i32 ma ==, generyczne T też musi je mieć.",
      "PartialEq wymaga Clone albo Debug.",
      "where zmienia zachowanie funkcji względem tego samego bound obok T.",
      "PartialEq gwarantuje równość każdej wartości z samą sobą.",
    ],
    transferTask:
      "Napisz od pustej strony funkcję, która pożycza bieżącą wartość i zwraca posiadanego kandydata przez Result.",
    evidenceGate:
      "replace_if_different albo admit zachowuje obie gałęzie, przenosi właściwą wartość i akceptuje typ obsługujący wyłącznie porównanie.",
    sourceIds: [
      "generics-book-bounds",
      "generics-reference-parameters",
      "generics-error-operator",
      "generics-std-partial-eq",
      "generics-reference-comparison",
    ],
  },
];

export const genericsReviewExercises: Record<string, LessonStep> = {
  "generic-type-parameters": coding({
    id: "review-generic-routing",
    kind: "modify",
    title: "Powtórka: zmień adres przesyłki",
    prompt:
      "Z pamięci napraw reroute<T, U>. Shipment ma item: T i address: U. Funkcja przejmuje przesyłkę oraz nowy adres tego samego typu U, po czym zwraca przesyłkę z dokładnie dawnym item i nowym address. Stary adres nie trafia do wyniku. Typ przedmiotu i adresu mogą być różne, a żaden nie musi mieć Copy, Clone ani Debug.",
    code: `struct Shipment<T, U> { item: T, address: U }
fn reroute<T, U>(shipment: Shipment<T, U>, address: U) -> Shipment<T, U> {
    shipment
}`,
    solution: `struct Shipment<T, U> { item: T, address: U }
fn reroute<T, U>(shipment: Shipment<T, U>, address: U) -> Shipment<T, U> {
    Shipment { item: shipment.item, address }
}`,
    tests: `struct Cargo { text: String }
struct Address { street: String }
#[test]
fn independent_item_and_address_move_to_new_route() {
    let a = reroute(Shipment { item: 7u8, address: String::from("stary") }, String::from("Łódź"));
    assert_eq!(a.item, 7);
    assert_eq!(a.address, "Łódź");
    let b = reroute(Shipment { item: String::new(), address: 2u8 }, 9u8);
    assert_eq!(b.item, "");
    assert_eq!(b.address, 9);
    let c = reroute(
        Shipment { item: Cargo { text: String::from("szkło") }, address: Address { street: String::from("A") } },
        Address { street: String::from("B") },
    );
    assert_eq!(c.item.text, "szkło");
    assert_eq!(c.address.street, "B");
}`,
    hints: [
      "T dotyczy przedmiotu; U łączy typ starego i nowego adresu.",
      "Ustal źródło każdego pola nowej przesyłki. Zwrócenie starej struktury w całości zachowa także adres, który miał się zmienić.",
    ],
  }),
  "generic-ownership": coding({
    id: "review-generic-slot",
    kind: "modify",
    title: "Powtórka: odbierz depozyt",
    prompt:
      "Slot<T> przechowuje Option<T>. new(value) tworzy Some(value), present(&self) informuje o obecności bez zużywania schowka, a release(self) oddaje całe przechowywane Option<T>. Napraw release, które obecnie gubi wartość. Zachowaj podpisy i brak dodatkowych warunków dla T. Testy sprawdzą również pusty Slot utworzony z None.",
    code: `struct Slot<T> { value: Option<T> }
impl<T> Slot<T> {
    fn new(value: T) -> Slot<T> { Slot { value: Some(value) } }
    fn present(&self) -> bool { self.value.is_some() }
    fn release(self) -> Option<T> { None }
}`,
    solution: `struct Slot<T> { value: Option<T> }
impl<T> Slot<T> {
    fn new(value: T) -> Slot<T> { Slot { value: Some(value) } }
    fn present(&self) -> bool { self.value.is_some() }
    fn release(self) -> Option<T> { self.value }
}`,
    tests: `struct Deposit { label: String }
#[test]
fn borrowed_presence_does_not_remove_owned_deposit() {
    let number: Slot<i32> = Slot::new(-4);
    assert!(number.present());
    assert!(number.present());
    assert_eq!(number.release(), Some(-4));
    let text = Slot::new(String::new());
    assert!(text.present());
    assert_eq!(text.release(), Some(String::new()));
    let deposit = Slot::new(Deposit { label: String::from("żółć") });
    assert!(deposit.present());
    match deposit.release() {
        Some(value) => assert_eq!(value.label, "żółć"),
        None => panic!("deposit lost"),
    }
    let empty: Slot<Deposit> = Slot { value: None };
    assert!(!empty.present());
    assert!(empty.release().is_none());
}`,
    hints: [
      "release dostało schowek na własność, łącznie z jego Option<T>.",
      "Przechowywane pole już ma typ wymagany przez wynik; zastanów się, czy potrzebujesz rozpatrywać jego warianty.",
    ],
  }),
  "minimal-trait-bounds": coding({
    id: "review-generic-count",
    kind: "modify",
    title: "Powtórka: policz zgodne próbki",
    prompt:
      "Napisz ciało count_matches<T>(first: &T, second: &T, target: &T) -> u8 z minimalnym warunkiem PartialEq. Wynik to liczba próbek first i second równych target: 0, 1 lub 2. Nie wybieraj jednej gałęzi zamiast sprawdzenia obu próbek. Wszystkie argumenty pozostają pożyczone. Nie wymagaj Copy, Clone ani Debug.",
    code: `fn count_matches<T>(first: &T, second: &T, target: &T) -> u8
where
    T: PartialEq,
{
    0
}`,
    solution: `fn count_matches<T>(first: &T, second: &T, target: &T) -> u8
where
    T: PartialEq,
{
    let mut count = 0;
    if first == target { count += 1; }
    if second == target { count += 1; }
    count
}`,
    tests: `#[derive(PartialEq)]
struct Sample { code: String }
#[test]
fn each_sample_contributes_independently() {
    assert_eq!(count_matches(&1i32, &2, &3), 0);
    assert_eq!(count_matches(&1i32, &2, &1), 1);
    assert_eq!(count_matches(&1i32, &2, &2), 1);
    assert_eq!(count_matches(&2i32, &2, &2), 2);
    let nan = f64::NAN;
    assert_eq!(count_matches(&nan, &nan, &nan), 0);
    let first = String::from("Łódź");
    let second = String::new();
    assert_eq!(count_matches(&first, &second, &String::new()), 1);
    assert_eq!(first, "Łódź");
    assert_eq!(second, "");
    let a = Sample { code: String::from("A") };
    let b = Sample { code: String::from("B") };
    assert_eq!(count_matches(&a, &b, &b), 1);
    assert_eq!(count_matches(&a, &a, &b), 0);
    assert_eq!(count_matches(&a, &a, &a), 2);
    assert_eq!(a.code, "A");
    assert_eq!(b.code, "B");
}`,
    hints: [
      "Wynik może być 2: równość pierwszej próbki nie kończy sprawdzania drugiej.",
      "Rozważ akumulator wyniku: każda próbka ma własny wkład, a rozłączne gałęzie mogą pominąć drugi wkład.",
    ],
  }),
};

export const genericsModule: CourseModule = {
  id: "generics",
  title: "Generyki: wspólny kod, konkretne obietnice",
  whyItMatters:
    "Po zbudowaniu Todo rozpoznajesz algorytmy zależne od układu danych, a nie od jednego konkretnego typu. Parametry typów pozwalają je współdzielić z zachowaniem kontroli własności.",
  capabilities: [
    "Dobierasz wspólne i niezależne parametry typów do relacji między danymi.",
    "Oddzielasz pożyczający podgląd od metod oddających własność.",
    "Wymagasz tylko zachowań faktycznie użytych przez algorytm.",
  ],
  prerequisites: ["todo-io"],
  lessonIds: ["generic-values", "generic-impl", "generic-bounds"],
  exitGate: [
    "Funkcja generyczna zachowuje kontrakt pól dla liczb, String i własnych typów.",
    "Metody pozwalają powtarzać podgląd, a później przenoszą właściwe posiadane dane.",
    "Porównująca funkcja wymaga PartialEq i poprawnie oddaje dane w obu gałęziach.",
  ],
  projectConnection:
    "W Todo możesz rozpoznać powtarzalne operacje przenoszenia danych i wykrywania zmian. Teraz oddzielasz je od konkretnego modelu; następny moduł nauczy definiować własne umowy zachowania przez traits.",
  assessmentId: "generic-bounds/bounds-blank",
  gateCriteria: [
    {
      id: "generics-values-gate",
      label:
        "Generyczne funkcje zachowują relacje między typami i przenoszonymi polami.",
      taskRefs: [
        { lessonId: "generic-values", stepId: "values-modify" },
        { lessonId: "generic-values", stepId: "values-transfer" },
      ],
    },
    {
      id: "generics-ownership-gate",
      label:
        "Pożyczający podgląd i konsumująca metoda zachowują własność danych bez zbędnych kopii.",
      taskRefs: [
        { lessonId: "generic-impl", stepId: "impl-modify" },
        { lessonId: "generic-impl", stepId: "impl-transfer" },
      ],
    },
    {
      id: "generics-bounds-gate",
      label:
        "Warunek PartialEq wystarcza do poprawnej decyzji i zwrócenia właściwej wartości.",
      taskRefs: [
        { lessonId: "generic-bounds", stepId: "bounds-modify" },
        { lessonId: "generic-bounds", stepId: "bounds-blank" },
      ],
    },
  ],
};
