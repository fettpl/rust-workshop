import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const traitsSources: Source[] = [
  {
    id: "traits-book-contracts",
    title:
      "The Rust Programming Language: Defining Shared Behavior with Traits",
    url: "https://doc.rust-lang.org/book/ch10-02-traits.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktów, metod domyślnych i boundów.",
  },
  {
    id: "traits-book-associated",
    title: "The Rust Programming Language: Advanced Traits — Associated Types",
    url: "https://doc.rust-lang.org/book/ch20-02-advanced-traits.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie porównania typu skojarzonego z parametrem traita.",
  },
  {
    id: "traits-reference-associated",
    title: "The Rust Reference: Associated Types",
    url: "https://doc.rust-lang.org/reference/items/associated-items.html#associated-types",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie składni Output i ograniczeń równości.",
  },
  {
    id: "traits-book-dispatch",
    title: "The Rust Programming Language: Using Trait Objects",
    url: "https://doc.rust-lang.org/book/ch18-02-trait-objects.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu monomorfizacji i dynamicznego wyboru metody.",
  },
  {
    id: "traits-reference-dyn",
    title: "The Rust Reference: Dyn Compatibility",
    url: "https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji Rust; reguły dyn compatibility mogą się rozwijać.",
  },
  ...["E0046", "E0599", "E0271", "E0038"].map((code): Source => ({
    id: `traits-error-${code.toLowerCase()}`,
    title: `Rust Error Index: ${code}`,
    url: `https://doc.rust-lang.org/error_codes/${code}.html`,
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty diagnostyk lokalnym rustc w edycji 2024 przy zmianie przykładu lub kompilatora.",
  })),
  {
    id: "traits-book-derive",
    title: "The Rust Programming Language: Derivable Traits",
    url: "https://doc.rust-lang.org/book/appendix-03-derivable-traits.html",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj po zmianie opisanego kontraktu lub wspieranego toolchaina.",
  },
  {
    id: "traits-reference-coherence",
    title: "The Rust Reference: Trait Implementation Coherence",
    url: "https://doc.rust-lang.org/reference/items/implementations.html#trait-implementation-coherence",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj po zmianie opisanego kontraktu lub wspieranego toolchaina.",
  },
];

export const traitsCompetencies: Competency[] = [
  {
    id: "define-trait-contracts",
    title:
      "Definiujesz wspólne zachowanie oraz implementacje z metodą domyślną i nadpisaniem.",
  },
  {
    id: "consume-trait-bounds",
    title:
      "Piszesz pożyczających konsumentów działających z nowymi implementacjami traita.",
  },
  {
    id: "constrain-associated-output",
    title:
      "Wiążesz typ wyniku z implementacją i ograniczasz go tam, gdzie wymaga tego operacja.",
  },
  {
    id: "choose-trait-dispatch",
    title:
      "Dobierasz generyki lub pożyczone obiekty dyn i rozpoznajesz niezgodne metody.",
  },
];

export const traitsConcepts: Concept[] = [
  {
    id: "trait-contract",
    title: "Własny trait, impl oraz metoda domyślna",
    prerequisites: ["minimal-trait-bounds"],
    competencyIds: ["define-trait-contracts"],
    reviewPrompt:
      "Co musi dostarczyć impl, gdy trait zawiera metodę wymaganą i domyślną?",
    reviewAnswer:
      "Implementacja dostarcza metodę bez ciała. Metodę z ciałem może odziedziczyć albo nadpisać; domyślna metoda może wywoływać wymaganą przez self.",
    distinguish:
      "self jest odbiorcą wywołania, a Self nazwą typu implementującego. Samo posiadanie metody o tej samej nazwie nie deklaruje impl Traitu.",
  },
  {
    id: "trait-consumers",
    title: "Konsument zależny od zachowania",
    prerequisites: ["trait-contract"],
    competencyIds: ["consume-trait-bounds"],
    reviewPrompt: "Co konsument fn use_it<T: Describe>(value: &T) wie o value?",
    reviewAnswer:
      "Wie, że może wywołać API Describe. Nie zna pól T; referencja pozwala używać także wartości bez Copy i Clone bez odbierania ich właścicielowi.",
    distinguish:
      "Jedno T oznacza jeden typ w danym wywołaniu. Dwa niezależne typy wymagają T i U; oba mogą mieć ten sam bound.",
  },
  {
    id: "associated-output",
    title: "Typ skojarzony i ograniczenie Output = ...",
    prerequisites: ["trait-consumers"],
    competencyIds: ["constrain-associated-output"],
    reviewPrompt: "Kiedy użyjesz S::Output, a kiedy S: Take<Output = String>?",
    reviewAnswer:
      "S::Output zachowuje typ wybrany przez implementację. Take<Output = String> ogranicza konsumenta do implementacji, których wynik jest dokładnie String.",
    distinguish:
      "W niegenerycznym trait Take dany typ ma jedną implementację i jeden Output. Trait Take<T> może mieć dla tego samego typu różne implementacje przy różnych T.",
  },
  {
    id: "dyn-dispatch",
    title: "Generyczny wybór metody i pożyczony dyn",
    prerequisites: ["associated-output"],
    competencyIds: ["choose-trait-dispatch"],
    reviewPrompt:
      "Co daje &[&dyn Reporter], czego nie daje &[T] z T: Reporter?",
    reviewAnswer:
      "Pozwala pożyczyć w jednym wycinku wartości różnych typów implementujących Reporter. Wywołanie report wybiera właściwą implementację przez obiekt traita w czasie wykonania.",
    distinguish:
      "Trait musi być dyn compatible. Zwykła metoda generyczna bez wyłączenia z dynamicznego API uniemożliwia &dyn; sam trait nadal może działać z generycznym konsumentem.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  answers: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  const correctIndex =
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const order = [0, 1, 2].map((index) => (index - correctIndex + 3) % 3);
  return {
    id,
    kind,
    title,
    prompt,
    choices: order.map((answer, index) => ({
      id: String(index),
      label: answers[answer],
    })),
    evaluator: {
      kind: "choice",
      correct: String(correctIndex),
      explanations: Object.fromEntries(
        order.map((answer, index) => [String(index), explanations[answer]]),
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

function exercise(options: {
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

const contractRun = `trait Label {
    fn name(&self) -> &str;
    fn label(&self) -> String { format!("[{}]", self.name()) }
}
struct Plain { text: String }
struct Alert { text: String, level: u8 }
impl Label for Plain {
    fn name(&self) -> &str { &self.text }
}
impl Label for Alert {
    fn name(&self) -> &str { &self.text }
    fn label(&self) -> String { format!("!{}:{}", self.level, self.name()) }
}
fn main() {
    let plain = Plain { text: String::from("start") };
    let alert = Alert { text: String::from("brak pliku"), level: 2 };
    println!("{}", plain.label());
    println!("{}", alert.label());
    println!("{}", plain.name());
}`;
const missingMethod = `trait Named { fn name(&self) -> &str; }
struct Entry { text: String }
impl Named for Entry {}
fn main() {}`;
const missingMethodRepair = missingMethod.replace(
  "impl Named for Entry {}",
  "impl Named for Entry { fn name(&self) -> &str { &self.text } }",
);

const tagSolution = `trait Taggable {
    fn text(&self) -> &str;
    fn tag(&self) -> String { format!("<{}>", self.text()) }
}
struct Note { text: String }
struct Secret { text: String }
impl Taggable for Note {
    fn text(&self) -> &str { &self.text }
}
impl Taggable for Secret {
    fn text(&self) -> &str { &self.text }
    fn tag(&self) -> String { String::from("<ukryte>") }
}`;
const tagStarter = tagSolution
  .replace('format!("<{}>", self.text())', "String::new()")
  .replace(
    "fn text(&self) -> &str { &self.text }",
    'fn text(&self) -> &str { "" }',
  )
  .replace('String::from("<ukryte>")', "String::from(self.text())");
const tagTests = `struct ExternalNote { body: String }
impl Taggable for ExternalNote {
    fn text(&self) -> &str { &self.body }
}
fn through_trait<T: Taggable>(value: &T) -> String { value.tag() }
#[test]
fn inherited_and_overridden_tags_follow_the_contract() {
    for text in ["", "żółć", " x ", "a<b"] {
        let note = Note { text: String::from(text) };
        let secret = Secret { text: String::from(text) };
        let other = ExternalNote { body: String::from(text) };
        assert_eq!(note.text(), text);
        assert_eq!(secret.text(), text);
        assert_eq!(through_trait(&note), format!("<{}>", text));
        assert_eq!(through_trait(&other), format!("<{}>", text));
        assert_eq!(through_trait(&secret), "<ukryte>");
        assert_eq!(note.text, text);
        assert_eq!(secret.text, text);
        assert_eq!(other.body, text);
    }
}`;

const statusSolution = `trait Status {
    fn ready(&self) -> bool;
    fn label(&self) -> String {
        if self.ready() { String::from("gotowy") } else { String::from("czeka") }
    }
}
struct Task { done: bool }
struct Hold { reason: String }
impl Status for Task {
    fn ready(&self) -> bool { self.done }
}
impl Status for Hold {
    fn ready(&self) -> bool { false }
    fn label(&self) -> String { format!("wstrzymano: {}", self.reason) }
}`;
const statusStarter = statusSolution
  .replace(
    'if self.ready() { String::from("gotowy") } else { String::from("czeka") }',
    "String::new()",
  )
  .replace(
    "fn ready(&self) -> bool { self.done }",
    "fn ready(&self) -> bool { false }",
  )
  .replace('format!("wstrzymano: {}", self.reason)', "String::new()");
const statusTests = `struct Sensor { live: bool, marker: String }
impl Status for Sensor { fn ready(&self) -> bool { self.live } }
fn inspect<T: Status>(value: &T) -> (bool, String) { (value.ready(), value.label()) }
#[test]
fn boolean_default_and_reason_override_are_independent() {
    assert_eq!(inspect(&Task { done: true }), (true, String::from("gotowy")));
    assert_eq!(inspect(&Task { done: false }), (false, String::from("czeka")));
    for live in [false, true] {
        let sensor = Sensor { live, marker: String::from("żółć") };
        assert_eq!(inspect(&sensor), (live, String::from(if live { "gotowy" } else { "czeka" })));
        assert_eq!(sensor.marker, "żółć");
    }
    for reason in ["", "sieć", " x "] {
        let hold = Hold { reason: String::from(reason) };
        assert_eq!(inspect(&hold), (false, format!("wstrzymano: {}", reason)));
        assert_eq!(hold.reason, reason);
    }
}`;

const consumerRun = `trait Units { fn units(&self) -> usize; }
struct Text { value: String }
struct Manual { count: usize }
impl Units for Text { fn units(&self) -> usize { self.value.len() } }
impl Units for Manual { fn units(&self) -> usize { self.count } }
fn twice<T: Units>(value: &T) -> usize { value.units() * 2 }
fn main() {
    let text = Text { value: String::from("ż") };
    let manual = Manual { count: 5 };
    println!("{} {}", twice(&text), twice(&manual));
    println!("{}", text.value);
}`;
const missingBound = `trait Units { fn units(&self) -> usize; }
fn read<T>(value: &T) -> usize { value.units() }
fn main() {}`;
const missingBoundRepair = missingBound.replace(
  "fn read<T>",
  "fn read<T: Units>",
);

const pairSolution = `trait Describe { fn describe(&self) -> String; }
struct Entry { text: String }
struct Counter { count: usize }
impl Describe for Entry { fn describe(&self) -> String { format!("wpis:{}", self.text) } }
impl Describe for Counter { fn describe(&self) -> String { format!("licznik:{}", self.count) } }
fn pair<T: Describe, U: Describe>(left: &T, right: &U) -> String {
    format!("{} -> {}", left.describe(), right.describe())
}`;
const pairStarter = pairSolution.replace(
  'format!("{} -> {}", left.describe(), right.describe())',
  "String::new()",
);
const pairTests = `struct Custom(String);
impl Describe for Custom { fn describe(&self) -> String { format!("({})", self.0) } }
#[test]
fn consumers_accept_distinct_and_future_types_by_reference() {
    for text in ["", "Łódź", " x "] {
        let entry = Entry { text: String::from(text) };
        let counter = Counter { count: 7 };
        let custom = Custom(String::from(text));
        assert_eq!(pair(&entry, &counter), format!("wpis:{} -> licznik:7", text));
        assert_eq!(pair(&counter, &entry), format!("licznik:7 -> wpis:{}", text));
        assert_eq!(pair(&custom, &entry), format!("({}) -> wpis:{}", text, text));
        assert_eq!(pair(&custom, &custom), format!("({}) -> ({})", text, text));
        assert_eq!(entry.text, text);
        assert_eq!(custom.0, text);
    }
    assert_eq!(pair(&Counter { count: 0 }, &Counter { count: 19 }), "licznik:0 -> licznik:19");
}`;

const checksSolution = `trait Check { fn accepts(&self, text: &str) -> bool; }
struct Prefix { prefix: String }
struct NonEmpty;
impl Check for Prefix { fn accepts(&self, text: &str) -> bool { text.starts_with(&self.prefix) } }
impl Check for NonEmpty { fn accepts(&self, text: &str) -> bool { !text.trim().is_empty() } }
fn all_accept<T: Check>(rules: &[T], text: &str) -> bool {
    for rule in rules {
        if !rule.accepts(text) { return false; }
    }
    true
}`;
const checksStarter = checksSolution.replace(
  "for rule in rules {\n        if !rule.accepts(text) { return false; }\n    }\n    true",
  "false",
);
const checksTests = `struct Deny { blocked: String }
impl Check for Deny { fn accepts(&self, text: &str) -> bool { text != self.blocked } }
#[test]
fn every_rule_participates_and_empty_set_accepts() {
    let prefixes = [Prefix { prefix: String::from("ż") }, Prefix { prefix: String::from("żó") }];
    assert!(all_accept(&prefixes, "żółć"));
    assert!(!all_accept(&prefixes, "żaba"));
    assert!(!all_accept(&prefixes, ""));
    assert!(all_accept(&[Prefix { prefix: String::new() }], ""));
    assert!(all_accept(&[NonEmpty], " a "));
    assert!(!all_accept(&[NonEmpty], " \t "));
    let denied = [Deny { blocked: String::from("a") }, Deny { blocked: String::from("żółć") }];
    assert!(!all_accept(&denied, "a"));
    assert!(!all_accept(&denied, "żółć"));
    assert!(all_accept(&denied, ""));
    let empty: [Deny; 0] = [];
    assert!(all_accept(&empty, "dowolny"));
    assert!(all_accept(&empty, ""));
    assert_eq!(denied[1].blocked, "żółć");
    assert_eq!(prefixes[0].prefix, "ż");
}`;

const associatedRun = `trait Snapshot {
    type Output;
    fn snapshot(&self) -> Self::Output;
}
struct Meter { value: i32 }
struct Banner { text: String }
impl Snapshot for Meter {
    type Output = i32;
    fn snapshot(&self) -> Self::Output { self.value }
}
impl Snapshot for Banner {
    type Output = String;
    fn snapshot(&self) -> Self::Output { format!("baner:{}", self.text) }
}
fn capture<S: Snapshot>(source: &S) -> S::Output { source.snapshot() }
fn main() {
    let number: i32 = capture(&Meter { value: 12 });
    let text: String = capture(&Banner { text: String::from("noc") });
    println!("{} {}", number, text);
}`;
const outputMismatch = `trait Read { type Output; fn read(&self) -> Self::Output; }
struct Flag;
impl Read for Flag { type Output = bool; fn read(&self) -> bool { true } }
fn numeric<R: Read<Output = usize>>(source: &R) -> usize { source.read() }
fn main() { println!("{}", numeric(&Flag)); }`;
const outputMismatchRepair = outputMismatch.replace(
  "fn numeric<R: Read<Output = usize>>(source: &R) -> usize",
  "fn numeric<R: Read>(source: &R) -> R::Output",
);

const takeSolution = `trait Take {
    type Output;
    fn take(self) -> Self::Output;
}
struct Envelope<T> { payload: T }
impl<T> Take for Envelope<T> {
    type Output = T;
    fn take(self) -> Self::Output { self.payload }
}
fn open<S: Take>(source: S) -> S::Output { source.take() }
fn text<S: Take<Output = String>>(source: S) -> String { format!("[{}]", source.take()) }`;
const takeStarter = takeSolution
  .replace("self.payload", 'panic!("Uzupełnij przeniesienie payload")')
  .replace('format!("[{}]", source.take())', "String::new()");
const takeTests = `struct Marker { text: String }
struct Token { marker: Marker }
impl Take for Token {
    type Output = Marker;
    fn take(self) -> Marker { self.marker }
}
struct Message { value: String }
impl Take for Message {
    type Output = String;
    fn take(self) -> String { self.value }
}
#[test]
fn output_is_owned_and_not_restricted_to_clone_or_copy() {
    let marker: Marker = open(Envelope { payload: Marker { text: String::from("żółć") } });
    assert_eq!(marker.text, "żółć");
    let other: Marker = open(Token { marker: Marker { text: String::from("osobny") } });
    assert_eq!(other.text, "osobny");
    assert_eq!(open(Envelope { payload: 17u8 }), 17u8);
    for value in ["", "Łódź", " x "] {
        assert_eq!(open(Envelope { payload: String::from(value) }), value);
        assert_eq!(text(Envelope { payload: String::from(value) }), format!("[{}]", value));
        assert_eq!(text(Message { value: String::from(value) }), format!("[{}]", value));
    }
}`;

const measureSolution = `trait Measure {
    type Output;
    fn measure(&self) -> Self::Output;
}
struct Bytes { value: String }
struct Active { value: bool }
impl Measure for Bytes {
    type Output = usize;
    fn measure(&self) -> Self::Output { self.value.len() }
}
impl Measure for Active {
    type Output = bool;
    fn measure(&self) -> Self::Output { self.value }
}
fn result<M: Measure>(source: &M) -> M::Output { source.measure() }
fn doubled<M: Measure<Output = usize>>(source: &M) -> usize { source.measure() * 2 }`;
const measureTests = `struct ExternalMeasure { number: usize, marker: String }
impl Measure for ExternalMeasure {
    type Output = usize;
    fn measure(&self) -> usize { self.number }
}
struct OwnedResult { label: String }
struct Source { text: String }
impl Measure for Source {
    type Output = OwnedResult;
    fn measure(&self) -> OwnedResult { OwnedResult { label: String::from(self.text.as_str()) } }
}
#[test]
fn equality_bound_is_only_on_the_numeric_consumer() {
    for value in ["", "abc", "żółć", " x "] {
        let bytes = Bytes { value: String::from(value) };
        let measured: usize = result(&bytes);
        assert_eq!(measured, value.len());
        assert_eq!(doubled(&bytes), value.len() * 2);
        assert_eq!(bytes.value, value);
    }
    for value in [false, true] {
        let active: bool = result(&Active { value });
        assert_eq!(active, value);
    }
    let external = ExternalMeasure { number: 19, marker: String::from("bez Clone") };
    assert_eq!(doubled(&external), 38);
    assert_eq!(external.marker, "bez Clone");
    let source = Source { text: String::from("nowy wynik") };
    let owned: OwnedResult = result(&source);
    assert_eq!(owned.label, "nowy wynik");
    assert_eq!(source.text, "nowy wynik");
}`;

const dispatchRun = `trait Paint { fn paint(&self) -> String; }
struct Arrow { text: String }
struct Bracket { text: String }
impl Paint for Arrow { fn paint(&self) -> String { format!(">{}", self.text) } }
impl Paint for Bracket { fn paint(&self) -> String { format!("[{}]", self.text) } }
fn paint_static<T: Paint>(value: &T) -> String { value.paint() }
fn paint_dynamic(value: &dyn Paint) -> String { value.paint() }
fn main() {
    let arrow = Arrow { text: String::from("A") };
    let bracket = Bracket { text: String::from("B") };
    println!("{}", paint_static(&arrow));
    let items: [&dyn Paint; 2] = [&arrow, &bracket];
    for item in items { println!("{}", paint_dynamic(item)); }
    println!("{}", arrow.text);
}`;
const dynBroken = `trait Render { fn render<T>(&self, value: T) -> String; }
struct Plain;
impl Render for Plain {
    fn render<T>(&self, _value: T) -> String { String::from("tekst") }
}
fn show(renderer: &dyn Render) -> String { renderer.render(3) }
fn main() { println!("{}", show(&Plain)); }`;
const dynRepair = `trait Render { fn render(&self, value: &str) -> String; }
struct Plain;
impl Render for Plain {
    fn render(&self, value: &str) -> String { format!("tekst:{}", value) }
}
fn show(renderer: &dyn Render) -> String { renderer.render("3") }
fn main() { println!("{}", show(&Plain)); }`;

const readingSolution = `trait Reading {
    fn value(&self) -> i32;
    fn enabled(&self) -> bool { true }
}
struct Fixed { number: i32 }
struct Switch { number: i32, on: bool }
impl Reading for Fixed { fn value(&self) -> i32 { self.number } }
impl Reading for Switch {
    fn value(&self) -> i32 { self.number }
    fn enabled(&self) -> bool { self.on }
}
fn active_total(readings: &[&dyn Reading]) -> i32 {
    let mut total = 0;
    for reading in readings {
        if reading.enabled() { total += reading.value(); }
    }
    total
}`;
const readingStarter = readingSolution
  .replace(
    "fn enabled(&self) -> bool { self.on }",
    "fn enabled(&self) -> bool { true }",
  )
  .replace(
    "if reading.enabled() { total += reading.value(); }",
    "total += reading.value();",
  );
const readingTests = `struct Future { number: i32, marker: String }
impl Reading for Future { fn value(&self) -> i32 { self.number } }
struct Muted { number: i32 }
impl Reading for Muted {
    fn value(&self) -> i32 { self.number }
    fn enabled(&self) -> bool { false }
}
#[test]
fn mixed_objects_keep_defaults_overrides_order_and_borrowing() {
    let fixed = Fixed { number: 4 };
    let on = Switch { number: -7, on: true };
    let off = Switch { number: 100, on: false };
    let future = Future { number: 12, marker: String::from("żółć") };
    let muted = Muted { number: 900 };
    assert!(fixed.enabled());
    assert!(on.enabled());
    assert!(!off.enabled());
    assert_eq!(off.value(), 100);
    assert_eq!(active_total(&[&fixed, &on, &off, &future, &muted]), 9);
    assert_eq!(active_total(&[&off, &muted]), 0);
    assert_eq!(active_total(&[&future, &future, &on]), 17);
    assert_eq!(active_total(&[]), 0);
    assert_eq!(future.marker, "żółć");
}`;

const reportersContract =
  "Od pustej strony napisz trait Reporter: wymagana metoda label(&self) -> &str i domyślna report(&self) -> String zwracająca LABEL: ok. Named ma pole name: String, label pożycza name i korzysta z domyślnego report. Failure ma pola name: String i reason: String; label pożycza name, a nadpisane report daje LABEL: REASON, także przy pustym reason. Funkcja report_one<T: Reporter>(value: &T) -> String wywołuje report. Funkcja collect(reports: &[&dyn Reporter]) -> Vec<String> wywołuje report każdego elementu w kolejności, zachowuje powtórzenia i dla pustego wycinka daje pusty Vec. Nie obcinaj tekstu. Własność wszystkich wejściowych obiektów zostaje u wywołującego. Testy dodają własne implementacje; nie rozpoznawaj konkretnych typów.";
const reportersSolution = `trait Reporter {
    fn label(&self) -> &str;
    fn report(&self) -> String { format!("{}: ok", self.label()) }
}
struct Named { name: String }
struct Failure { name: String, reason: String }
impl Reporter for Named {
    fn label(&self) -> &str { &self.name }
}
impl Reporter for Failure {
    fn label(&self) -> &str { &self.name }
    fn report(&self) -> String { format!("{}: {}", self.label(), self.reason) }
}
fn report_one<T: Reporter>(value: &T) -> String { value.report() }
fn collect(reports: &[&dyn Reporter]) -> Vec<String> {
    let mut result = Vec::new();
    for reporter in reports { result.push(reporter.report()); }
    result
}`;
const reportersTests = `struct NewReporter { title: String }
impl Reporter for NewReporter { fn label(&self) -> &str { &self.title } }
struct Special { title: String, code: u8 }
impl Reporter for Special {
    fn label(&self) -> &str { &self.title }
    fn report(&self) -> String { format!("{}#{}", self.title, self.code) }
}
#[test]
fn report_api_works_with_defaults_overrides_and_new_types() {
    for name in ["", "Łódź", " x "] {
        let named = Named { name: String::from(name) };
        let failure = Failure { name: String::from(name), reason: String::from("brak") };
        let empty_reason = Failure { name: String::from(name), reason: String::new() };
        let new = NewReporter { title: String::from(name) };
        let special = Special { title: String::from(name), code: 7 };
        assert_eq!(named.label(), name);
        assert_eq!(failure.label(), name);
        assert_eq!(report_one(&named), format!("{}: ok", name));
        assert_eq!(report_one(&failure), format!("{}: brak", name));
        assert_eq!(report_one(&special), format!("{}#7", name));
        assert_eq!(collect(&[&failure, &new, &special, &named, &new, &empty_reason]), vec![
            format!("{}: brak", name), format!("{}: ok", name), format!("{}#7", name),
            format!("{}: ok", name), format!("{}: ok", name), format!("{}: ", name),
        ]);
        assert_eq!(named.name, name);
        assert_eq!(failure.reason, "brak");
        assert_eq!(new.title, name);
        assert_eq!(special.title, name);
    }
    assert_eq!(collect(&[]), Vec::<String>::new());
}`;

export const traitsLessons: Lesson[] = [
  {
    id: "trait-contracts",
    moduleId: "traits",
    conceptIds: ["trait-contract"],
    competencyIds: ["define-trait-contracts"],
    prerequisites: ["generic-bounds"],
    title: "Trait: wspólna obietnica różnych typów",
    subtitle:
      "Napisz wymagane zachowanie, potem wykorzystaj i nadpisz domyślną metodę.",
    minutes: 28,
    outcomes: [
      "Definiujesz trait z metodą pożyczającą self.",
      "Implementujesz jeden trait dla różnych struktur.",
      "Rozróżniasz wymagane metody, metody domyślne i nadpisania.",
    ],
    sessionStops: [
      {
        afterStepId: "contracts-error",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Uzupełnij Taggable i rozróżnij metodę domyślną od nadpisania. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "contracts-tags",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Przenieś kontrakt do Status, potem porównaj derive z ręcznym impl. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      choose(
        "contracts-predict",
        "predict",
        "Dwa typy, ta sama nazwa metody",
        "Plain ma name zwracające start i korzysta z domyślnego label dającego [NAME]. Alert nadpisuje label wynikiem !2:brak pliku. Co wypiszą kolejno plain.label() i alert.label()?",
        [
          "[start] oraz !2:brak pliku",
          "Oba użyją nawiasów kwadratowych",
          "Dwa typy nie mogą implementować tego samego traita",
        ],
        [
          "Każda implementacja może zachować ciało domyślne albo je zastąpić.",
          "Nadpisanie Alert zastępuje domyślną metodę dla tego typu.",
          "Wspólne API dla różnych typów jest właśnie zastosowaniem traita.",
        ],
      ),
      run(
        "contracts-run",
        "Wywołaj obie implementacje",
        "Uruchom. Zmień level Alert, następnie tekst Plain i porównaj wyniki wspólnego ciała label z nadpisaniem. name nadal działa po label: metody pożyczają &self. Po eksperymencie przywróć oryginalne dane, aby zaliczyć oczekiwany wynik tego przykładu.",
        contractRun,
        "[start]\n!2:brak pliku\nstart\n",
      ),
      choose(
        "contracts-explain",
        "explain",
        "Przeczytaj nową składnię",
        "trait Label deklaruje API. Metoda zakończona średnikiem jest wymagana, metoda z ciałem jest domyślna. impl Label for Plain dostarcza zachowanie dla Plain. W metodzie &self pożycza wartość, a Self oznacza typ implementujący. Które zdanie jest poprawne?",
        [
          "Domyślne label może wywołać self.name(), choć name nie ma ciała w traicie",
          "Trait musi określić wspólne pola wszystkich struktur",
          "Self to druga nazwa wartości self",
        ],
        [
          "Każde poprawne impl musi dostarczyć name, więc domyślna metoda może z niego korzystać.",
          "Trait opisuje zachowanie. Implementacje wybierają własne pola.",
          "Self jest typem; self jest konkretnym odbiorcą metody.",
        ],
      ),
      compilerError(
        "contracts-error",
        "Zobacz brakującą część kontraktu",
        "Uruchom i odczytaj surowe E0046. Wskaż w diagnostyku nazwę brakującej metody. Dodanie zwykłej metody w impl Entry nie wypełnia impl Named for Entry: wymagane ciało musi realizować trait.",
        missingMethod,
        missingMethodRepair,
        "E0046",
      ),
      exercise({
        id: "contracts-tags",
        kind: "modify",
        title: "Tag domyślny i ochrona tekstu",
        prompt:
          "Uzupełnij Taggable, Note i Secret. text pożycza pełny zapisany tekst bez trim. Domyślne tag daje <TEKST>. Note ma dziedziczyć tag; Secret nadpisuje je stałym <ukryte>, lecz text nadal udostępnia zapisany tekst. Wymagane zachowanie ma działać także dla nowego typu implementującego tylko text.",
        code: tagStarter,
        solution: tagSolution,
        tests: tagTests,
        gate: true,
        hints: [
          "Domyślne ciało korzysta z self.text(), bez znajomości pól konkretnej struktury.",
          "W impl Secret dodaj osobne tag; w Note pozostaw tylko wymaganą metodę text.",
        ],
      }),
      choose(
        "contracts-scope",
        "explain",
        "Trait w innym module",
        "Jeśli przeniesiesz publiczny trait Label i Plain do modułu labels, klient importuje use labels::{Label, Plain};. Po co importuje też Label?",
        [
          "Aby metoda traita była dostępna przy wywołaniu plain.label()",
          "Aby skopiować implementację do klienta",
          "Aby klient mógł zmienić prywatne pola Plain",
        ],
        [
          "Przy zwykłym wywołaniu metod trait powinien być w zakresie. Dotąd definicje były w jednym zakresie.",
          "use wprowadza nazwy, nie kopiuje kodu.",
          "Import traita nie zmienia widoczności pól.",
        ],
      ),
      exercise({
        id: "contracts-status",
        kind: "apply",
        title: "Nowy kontrakt: stan i powód blokady",
        prompt:
          "Zaimplementuj Status. ready dla Task zwraca done. Domyślne label wywołuje ready i daje gotowy dla true lub czeka dla false. Hold zawsze ma ready równe false; jego nadpisane label daje wstrzymano: POWÓD, zachowując reason także pusty. Task ma korzystać z metody domyślnej. Testy dodają inny typ dostarczający samo ready.",
        code: statusStarter,
        solution: statusSolution,
        tests: statusTests,
        gate: true,
        hints: [
          "Domyślna metoda zależy od odpowiedzi innej metody, nie od rodzaju struktury.",
          "Hold ma inną politykę opisu: label korzysta z reason, a ready pozostaje false.",
        ],
      }),
      choose(
        "contracts-recall",
        "recall",
        "Odtwórz podział odpowiedzialności",
        "Nowy typ implementuje metodę wymaganą, lecz pomija metodę domyślną. Co się stanie?",
        [
          "Użyje domyślnego ciała, z wywołaniami kierowanymi do swoich wymaganych metod",
          "Pominięcie dowolnej metody zawsze daje E0046",
          "Kompilator wybierze losową implementację innego typu",
        ],
        [
          "Ciało domyślne jest częścią kontraktu i korzysta z self nowego typu.",
          "E0046 dotyczy brakującej wymaganej części, a nie pominiętego nadpisania.",
          "Implementacje są przypisane do konkretnych typów.",
        ],
      ),
      {
        id: "contracts-derive-repair",
        kind: "debug",
        title: "derive i ręczna implementacja",
        prompt:
          "`#[derive(Debug, PartialEq, Eq)]` prosi kompilator o implementacje standardowych traitów: Debug pozwala na {:?}, PartialEq na ==, a Eq deklaruje pełną relację równoważności (w tym zwrotność). Dla struct wyprowadzone PartialEq porównuje wszystkie pola, które też muszą wspierać potrzebny trait. Ręczne impl PartialEq może wyrażać inną politykę; tu ManualNote porównuje tylko tekst, ignorując attempts. Eq wymaga PartialEq; nie dopisujesz jego metod, ale odpowiadasz za spełnienie jego praw. Starterowi brakuje PartialEq dla DerivedNote: odczytaj błąd i napraw derive, zachowując ręczną politykę ManualNote. Zachowaj fabryki `derived(text: String, attempts: u32) -> DerivedNote` i `manual(text: String, attempts: u32) -> ManualNote`. Testy używają ich wyników, Eq, Debug i == bez zakładania układu pól. Nie implementuj drugi raz traita już wyprowadzonego przez derive. Zasada spójności (coherence) zabrania nakładających się implementacji. W zwykłym impl możesz implementować własny trait dla obcego typu albo obcy trait dla własnego typu; obcy trait dla obcego typu nie wystarczy opisać w swoim pliku. To skrót dla prostych typów — impl generyczne mają dodatkowe reguły pokrycia parametrów. Późniejszą możliwością jest własny typ opakowujący (newtype).",
        code: `#[derive(Debug, Eq)]
struct DerivedNote { text: String, attempts: u32 }

#[derive(Debug)]
struct ManualNote { text: String, attempts: u32 }

impl PartialEq for ManualNote {
    fn eq(&self, other: &Self) -> bool { self.text == other.text }
}
impl Eq for ManualNote {}

fn derived(text: String, attempts: u32) -> DerivedNote { DerivedNote { text, attempts } }
fn manual(text: String, attempts: u32) -> ManualNote { ManualNote { text, attempts } }`,
        solution: `#[derive(Debug, PartialEq, Eq)]
struct DerivedNote { text: String, attempts: u32 }

#[derive(Debug)]
struct ManualNote { text: String, attempts: u32 }

impl PartialEq for ManualNote {
    fn eq(&self, other: &Self) -> bool { self.text == other.text }
}
impl Eq for ManualNote {}

fn derived(text: String, attempts: u32) -> DerivedNote { DerivedNote { text, attempts } }
fn manual(text: String, attempts: u32) -> ManualNote { ManualNote { text, attempts } }`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn derived_fields_and_manual_identity_are_different_policies() {
    fn inspect<T: Eq + std::fmt::Debug>(value: &T) { let _ = format!("{:?}", value); }
    for text in ["", "Rust", "żółć"] {
        let first = derived(String::from(text), 0);
        let same = derived(String::from(text), 0);
        let retry = derived(String::from(text), u32::MAX);
        inspect(&first);
        assert_eq!(first, same);
        assert_ne!(first, retry);
        assert_eq!(first, same);
        let first = manual(String::from(text), 0);
        let retry = manual(String::from(text), u32::MAX);
        inspect(&first);
        assert_eq!(first, retry);
        assert_eq!(retry, first);
        assert_eq!(first, first);
    }
    assert_ne!(derived(String::from("A"), 0), derived(String::from("B"), 0));
    assert_ne!(manual(String::from("A"), 0), manual(String::from("B"), 0));
}`,
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0277",
      },
    ],
    misconceptions: [
      "Trait definiuje pola wspólnej klasy.",
      "Metoda o tej samej nazwie automatycznie oznacza implementację traita.",
      "Metoda domyślna nie może wywołać metody wymaganej.",
    ],
    transferTask:
      "Zbuduj trait stanu z domyślną interpretacją bool oraz implementację, która opisuje powód blokady.",
    evidenceGate:
      "Samodzielna implementacja Taggable albo Status spełnia wymagane i domyślne metody oraz nadpisania, także dla dodatkowego typu z testu.",
    sourceIds: [
      "traits-book-contracts",
      "traits-error-e0046",
      "traits-book-derive",
      "traits-reference-coherence",
    ],
  },
  {
    id: "trait-consumers",
    moduleId: "traits",
    conceptIds: ["trait-consumers"],
    competencyIds: ["consume-trait-bounds"],
    prerequisites: ["trait-contracts"],
    title: "Konsument, który zna tylko trait",
    subtitle: "Użyj własnego boundu zamiast pól i nazw konkretnych struktur.",
    minutes: 30,
    outcomes: [
      "Wywołujesz API własnego traita w funkcji generycznej.",
      "Dobierasz T i U do niezależnych typów argumentów.",
      "Pożyczasz zbiory elementów bez dodawania Copy lub Clone.",
    ],
    sessionStops: [
      {
        afterStepId: "consumers-two-types",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Napisz konsumenta pary typów przez wspólny bound. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "consumers-pair",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Sprawdź transfer konsumenta w nowym kontrakcie kontroli. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      run(
        "consumers-run",
        "Ta sama funkcja dla tekstu i licznika",
        "Uruchom twice dla obu typów. Text liczy bajty przez len: ż zajmuje w UTF-8 dwa bajty, więc twice daje 4. Manual przechowuje gotową liczbę. Konsument widzi units, a nie pola; Text można nadal odczytać po wywołaniu. W tym przykładzie zakładamy, że dwukrotność units mieści się w usize.",
        consumerRun,
        "4 10\nż\n",
      ),
      choose(
        "consumers-predict",
        "predict",
        "Nowy typ bez zmian konsumenta",
        "Dodajesz struct Pages { count: usize } i impl Units for Pages. Co musi się zmienić w twice<T: Units>?",
        [
          "Nic, jeżeli implementacja spełnia kontrakt units",
          "Nowa gałąź sprawdzająca nazwę Pages",
          "Parametr musi stać się Pages zamiast T",
        ],
        [
          "Bound jest całą wiedzą potrzebną twice.",
          "Generyczna funkcja wywołuje API traita, nie rozpoznaje nazw typów.",
          "Zmiana na konkretny typ odebrałaby funkcji ogólność.",
        ],
      ),
      compilerError(
        "consumers-error",
        "Kompilator nie zgaduje zachowania T",
        "Uruchom i znajdź surowe E0599 dla units. T bez ograniczenia nie obiecuje tej metody. Podpowiedź kompilatora powinna wskazać bound Units; naprawiona sygnatura pozostaje pożyczająca.",
        missingBound,
        missingBoundRepair,
        "E0599",
      ),
      choose(
        "consumers-two-types",
        "explain",
        "Jedno T czy T i U?",
        "pair ma przyjmować Entry i Counter w dowolnej kolejności. Oba typy implementują Describe. Wybierz sygnaturę, która wyraża taki kontrakt.",
        [
          "fn pair<T: Describe, U: Describe>(left: &T, right: &U) -> String",
          "fn pair<T: Describe>(left: &T, right: &T) -> String",
          "fn pair<T, U>(left: &T, right: &U) -> String bez żadnych boundów",
        ],
        [
          "T i U mogą oznaczać różne typy; oba zapewniają describe.",
          "Powtórzone T wymaga tego samego typu obu argumentów.",
          "Bez boundów ciało nie może wywołać describe.",
        ],
      ),
      exercise({
        id: "consumers-pair",
        kind: "modify",
        title: "Połącz opisy niezależnych typów",
        prompt:
          "Dokończ pair. Wywołaj describe na obu pożyczonych argumentach i połącz wyniki dokładnie separatorem spacja, ->, spacja. Zachowaj kolejność, puste wyniki i wszystkie znaki. Funkcja ma przyjmować także nowe implementacje oraz dwie wartości tego samego typu. Nie wymagaj Clone ani Copy; Entry i Counter już implementują kontrakt.",
        code: pairStarter,
        solution: pairSolution,
        tests: pairTests,
        gate: true,
        hints: [
          "Ciało może znać tylko metody Describe, a nie text ani count.",
          "Użyj dwóch wyników describe w jednym format!, pozostawiając &T i &U w parametrach.",
        ],
      }),
      choose(
        "consumers-slice",
        "explain",
        "Wycinek wielu wartości",
        "Funkcja all_accept<T: Check>(rules: &[T], text: &str) sprawdza reguły w pętli for rule in rules. Jaki rodzaj kolekcji przyjmuje?",
        [
          "Pożyczony wycinek elementów jednego T, z których każdy implementuje Check",
          "Wycinek dowolnie mieszający wszystkie typy implementujące Check",
          "Tylko tablicę o długości znanej w sygnaturze",
        ],
        [
          "T wybiera się raz dla wywołania; pętla po pożyczonym wycinku nie przenosi elementów.",
          "Różne konkretne typy w jednym wycinku wprowadzimy przez dyn w ostatniej lekcji.",
          "&[T] nie zapisuje konkretnej długości tablicy; może też opisywać pusty wycinek.",
        ],
      ),
      exercise({
        id: "consumers-checks",
        kind: "apply",
        title: "Nowy kontrakt: wszystkie reguły muszą przyjąć tekst",
        prompt:
          "Dokończ all_accept. Dla każdego elementu rules wywołaj accepts(text); zwróć false, gdy dowolna reguła odrzuci tekst, i true gdy wszystkie przyjmą. Pusty zbiór reguł przyjmuje każdy tekst. Prefix sprawdza początek tekstu przez starts_with; NonEmpty sprawdza niepusty wynik trim. Nie zmieniaj gotowych implementacji ani wejścia. Funkcja ma działać też z innymi implementacjami Check.",
        code: checksStarter,
        solution: checksSolution,
        tests: checksTests,
        gate: true,
        hints: [
          "Możesz zakończyć pętlę wcześniejszym return false przy pierwszym odrzuceniu.",
          "Jeżeli pętla nie znalazła odrzucenia, wynikiem jest true, także gdy nie miała elementów.",
        ],
      }),
      choose(
        "consumers-recall",
        "recall",
        "Odtwórz minimalny kontrakt",
        "Konsument wywołuje tylko Check::accepts przez &T. Czy potrzebuje T: Check + Clone?",
        [
          "Nie; T: Check wystarcza, bo niczego nie klonuje",
          "Tak, każda referencja klonuje wskazywaną wartość",
          "Tak, każdy trait wymaga Clone",
        ],
        [
          "Dodatkowy Clone bez użycia niepotrzebnie odrzuci część poprawnych implementacji.",
          "Referencja pożycza wartość.",
          "Clone jest osobną zdolnością i musi wynikać z potrzeb kodu.",
        ],
      ),
    ],
    misconceptions: [
      "Konsument musi znać listę wszystkich implementujących struktur.",
      "Jedno T może oznaczać różne konkretne typy dwóch argumentów tego samego wywołania.",
      "Przekazanie &T wymaga Clone.",
    ],
    transferTask:
      "Napisz konsumenta reguł, który sprawdza cały pożyczony wycinek i poprawnie obsługuje pusty zbiór.",
    evidenceGate:
      "Samodzielny konsument opisów albo reguł działa z różnymi, także nowymi typami bez Copy i Clone.",
    sourceIds: ["traits-book-contracts", "traits-error-e0599"],
  },
  {
    id: "associated-types",
    moduleId: "traits",
    conceptIds: ["associated-output"],
    competencyIds: ["constrain-associated-output"],
    prerequisites: ["trait-consumers"],
    title: "Typ wyniku należy do implementacji",
    subtitle:
      "Odczytaj Self::Output i ogranicz wynik tylko tam, gdzie to potrzebne.",
    minutes: 32,
    outcomes: [
      "Deklarujesz i definiujesz typ skojarzony.",
      "Przenosisz własny wynik bez dodatkowego Copy lub Clone.",
      "Stosujesz Output = String lub Output = usize w konsumencie.",
    ],
    sessionStops: [
      {
        afterStepId: "associated-owned",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Przećwicz pobieranie wartości typu skojarzonego. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "associated-take",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Przenieś typ skojarzony do pomiaru danych. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      run(
        "associated-run",
        "Jedno API, różne typy wyników",
        "Uruchom. Snapshot deklaruje type Output; każde impl wybiera jego typ. Self::Output w metodzie i S::Output w capture wskazują ten wybór. Meter zwraca liczbę, Banner tworzy String. Nie trzeba znać żadnego traita z biblioteki standardowej, aby użyć tego mechanizmu.",
        associatedRun,
        "12 baner:noc\n",
      ),
      choose(
        "associated-predict",
        "predict",
        "Kto ustala typ?",
        "capture otrzymuje &Banner. Kto wybrał, że wynik jest String?",
        [
          "impl Snapshot for Banner przez type Output = String",
          "Każdy wywołujący może zażądać innego Output od tego samego impl",
          "println wybiera typ po odczytaniu wartości",
        ],
        [
          "Typ jest częścią implementacji i znany podczas kompilacji.",
          "Niegeneryczny trait ma dla tego typu ustalony Output.",
          "Formatowanie korzysta z gotowego typu; nie ustala go w trakcie działania.",
        ],
      ),
      compilerError(
        "associated-error",
        "Równość typu jest sprawdzana",
        "Uruchom i odczytaj E0271. numeric wymaga Read<Output = usize>, lecz Flag deklaruje bool. Samo implementowanie Read nie spełnia równości. W pokazanej naprawie konsument przestaje wymagać liczby i zwraca R::Output; można też zachować liczbowy kontrakt i przekazać właściwe źródło.",
        outputMismatch,
        outputMismatchRepair,
        "E0271",
      ),
      choose(
        "associated-owned",
        "explain",
        "self może przenosić wynik",
        "Take ma fn take(self) -> Self::Output. Envelope<T> zawiera payload: T. Co pozwala zwrócić payload bez Clone?",
        [
          "take otrzymuje własność Envelope i przenosi jego payload do wyniku",
          "Typ skojarzony automatycznie kopiuje payload",
          "Każdy T staje się Copy wewnątrz traita",
        ],
        [
          "Metoda z self konsumuje opakowanie; przeniesienie pola nie wymaga kopiowania.",
          "Output tylko nazywa typ, nie zmienia reguł własności.",
          "Bound Copy nadal musiałby zostać jawnie wymagany, a tutaj jest zbędny.",
        ],
      ),
      exercise({
        id: "associated-take",
        kind: "modify",
        title: "Przenoszenie wyniku i klient tekstowy",
        prompt:
          "Dokończ Take dla ogólnego Envelope<T>: usuń tymczasowe panic! i przenieś payload jako Self::Output, bez Copy i Clone. Zachowaj open, które zwraca dokładny wynik source.take(). Dokończ text: ma przyjmować dowolne S: Take<Output = String>, pobrać wynik przez take i zwrócić [WYNIK] bez trim. Testy dostarczają inne źródła String i własnego typu wyniku.",
        code: takeStarter,
        solution: takeSolution,
        tests: takeTests,
        gate: true,
        hints: [
          "Nie ograniczaj samego Take ani open do String; ograniczenie należy tylko do text.",
          "S: Take<Output = String> pozwala traktować source.take() jako String w format!.",
        ],
      }),
      choose(
        "associated-versus-generic",
        "explain",
        "Typ skojarzony czy parametr traita?",
        "Porównaj trait Produce { type Output; } z trait Convert<T> { fn convert(&self) -> T; }. Dla Convert można napisać impl Convert<String> for Code oraz impl Convert<u8> for Code. Dlaczego zwykły Produce działa inaczej?",
        [
          "Produce ma jeden Output w impl dla Code; parametr T w Convert rozróżnia dwie implementacje",
          "Typ skojarzony można wybrać ponownie przy każdym wywołaniu",
          "Trait z parametrem nie może mieć dwóch implementacji dla tego samego typu przy różnych T",
        ],
        [
          "Typ skojarzony opisuje wybór związany z implementacją. Parametr traita pozwala modelować różne relacje wejściowego typu do T.",
          "Dla niegenerycznego Produce implementacja ustala Output, nie pojedyncze wywołanie.",
          "Różne argumenty traita mogą rozróżniać takie implementacje, jeżeli nie nakładają się na siebie.",
        ],
      ),
      exercise({
        id: "associated-measure",
        kind: "blank",
        title: "Pusta strona: ogólny wynik i liczbowy konsument",
        prompt:
          "Napisz od zera trait Measure z typem skojarzonym nazwanym Output i wymaganą metodą measure. Metoda pożycza odbiorcę i zwraca wartość typu wybranego przez implementację. Struktura Bytes ma pole value typu String; jej implementacja wybiera wynik usize i zwraca liczbę bajtów value. Struktura Active ma pole value typu bool; jej implementacja wybiera wynik bool i zwraca value. Generyczna funkcja result pożycza dowolne źródło realizujące Measure i zwraca jego wynik bez zmiany typu. Generyczna funkcja doubled pożycza wyłącznie źródło, którego Output jest dokładnie usize, i zwraca dwukrotny wynik measure jako usize. Przyjmij, że ta dwukrotność mieści się w usize. Samodzielnie zapisz deklaracje, implementacje oraz ograniczenia obu konsumentów. Nie wymagaj Copy, Clone ani Debug. Testy dodają źródło liczby oraz własnego niekopiowalnego wyniku i sprawdzają, że po wywołaniu źródła nadal należą do klienta. Nie dodawaj main.",
        code: "",
        solution: measureSolution,
        tests: measureTests,
        gate: true,
        hints: [
          "Równość Output = usize należy do doubled, ponieważ tylko tam mnożysz liczbę.",
          "Powiąż typ zwracany przez result z Output źródła; ciało wywołuje measure bez interpretacji wyniku.",
        ],
      }),
      choose(
        "associated-recall",
        "recall",
        "Odtwórz znaczenie równości",
        "Czy S: Take<Output = String> wymaga, aby S samo było String?",
        [
          "Nie; S jest źródłem, którego wynik take jest dokładnie String",
          "Tak; Output i Self to zawsze ten sam typ",
          "Nie; dopuszcza dowolny wynik, który można wyświetlić",
        ],
        [
          "Na przykład Envelope<String> jest źródłem, a String jego Output.",
          "Self nazywa implementujący typ, Output jego zadeklarowany typ skojarzony.",
          "To ścisła równość typów, a nie zdolność formatowania.",
        ],
      ),
    ],
    misconceptions: [
      "Output jest typem samego odbiorcy self.",
      "Wywołujący dowolnie wybiera typ skojarzony.",
      "Ogólny typ wyniku wymaga Clone.",
      "Bound Trait wystarcza do działań liczbowych na dowolnym Output.",
    ],
    transferTask:
      "Połącz ogólne odczytywanie wyniku z konsumentem wymagającym dokładnego typu liczbowego.",
    evidenceGate:
      "Samodzielne API zachowuje typ wybrany przez nowe implementacje, a specjalizowana operacja wymaga właściwego Output.",
    sourceIds: [
      "traits-book-associated",
      "traits-reference-associated",
      "traits-error-e0271",
    ],
  },
  {
    id: "trait-dispatch",
    moduleId: "traits",
    conceptIds: ["dyn-dispatch"],
    competencyIds: ["choose-trait-dispatch"],
    prerequisites: ["associated-types"],
    title: "Generyki i dyn: kiedy wybierasz implementację?",
    subtitle:
      "Pożycz różne typy w jednym wycinku i sprawdź granicę dynamicznego API.",
    minutes: 34,
    outcomes: [
      "Wyjaśniasz statyczny i dynamiczny wybór implementacji.",
      "Przetwarzasz heterogeniczny wycinek &[&dyn Trait] bez przenoszenia obiektów.",
      "Rozpoznajesz E0038 i dostosowujesz interfejs do dyn.",
    ],
    sessionStops: [
      {
        afterStepId: "dispatch-boundary",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zbuduj kolekcję odczytów z dynamicznym wyborem metody. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "dispatch-readings",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zaprojektuj nowy konsument od pustej kartki. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      run(
        "dispatch-run",
        "Wypróbuj dwie drogi wywołania",
        "Uruchom. paint_static otrzymuje &T. paint_dynamic otrzymuje &dyn Paint: pożyczony obiekt traita, który udostępnia Paint bez nazwy konkretnego typu. Tablica [&dyn Paint; 2] mieści referencje do Arrow i Bracket. Własne String obu struktur zostają u właścicieli.",
        dispatchRun,
        ">A\n>A\n[B]\nA\n",
      ),
      choose(
        "dispatch-explain",
        "explain",
        "Co wybiera metodę?",
        "Dla generycznego paint_static kompilator tworzy wersje dla użytych typów (monomorfizacja). &dyn Paint niesie informację potrzebną do wyboru metody w czasie wykonania. Który wybór odpowiada zbiorowi różnych typów za jednym API?",
        [
          "Wycinek &[&dyn Paint] i dynamiczne wywołanie paint",
          "Wycinek &[T], w którym każde T oznacza inny typ",
          "Zawsze zmiana wszystkich struktur na jeden wspólny typ",
        ],
        [
          "Elementy mają wspólny typ referencji do dyn Paint mimo różnych typów danych.",
          "W generycznym wywołaniu T jest jednym konkretnym typem.",
          "Obiekt traita pozwala zachować różne struktury za wspólnym zachowaniem.",
        ],
      ),
      compilerError(
        "dispatch-error",
        "Nie każdy trait może stać się dyn",
        "Uruchom i przeczytaj surowe E0038 oraz wskazanie render. Ta metoda ma parametr typu T; dynamiczne API nie ma jednej ustalonej sygnatury dla wszystkich T. Naprawa wybiera konkretny parametr &str i aktualizuje impl oraz klienta. Nazwa reguły w aktualnej dokumentacji to dyn compatibility; starsze materiały mówią object safety.",
        dynBroken,
        dynRepair,
        "E0038",
      ),
      choose(
        "dispatch-boundary",
        "explain",
        "Granica wyjaśnienia błędu",
        "Czy E0038 oznacza, że trait z generyczną metodą jest w Rust niedozwolony?",
        [
          "Nie; może działać statycznie, lecz pokazana postać nie pozwala utworzyć &dyn tego traita",
          "Tak; żaden trait nie może zawierać metody generycznej",
          "Nie; wystarczy usunąć & i przekazać dyn przez wartość",
        ],
        [
          "Dyn wymaga dodatkowych reguł. Metoda zwracająca Self poza odbiorcą także może blokować dynamiczne API. Istnieją sposoby wyłączenia metod z dyn przez where Self: Sized; nie stosujemy ich w tych kontraktach.",
          "Generyczne metody są poprawne; ograniczenie dotyczy użycia traita jako obiektu dyn.",
          "dyn ma dynamicznie określany rozmiar; w tej lekcji używamy go za pożyczoną referencją.",
        ],
      ),
      exercise({
        id: "dispatch-readings",
        kind: "modify",
        title: "Mieszane odczyty z filtrem aktywności",
        prompt:
          "Napraw Switch::enabled oraz active_total. Fixed korzysta z domyślnego enabled = true, Switch zwraca on. active_total pożycza &[&dyn Reading] i sumuje value tylko elementów, których enabled jest true. Zachowaj liczby ujemne i powtórzenia; pusty wycinek daje 0. Przyjmij, że każda suma częściowa mieści się w i32. Testy dodają nowe implementacje z domyślną i nadpisaną aktywnością. Nie rozpoznawaj konkretnych typów.",
        code: readingStarter,
        solution: readingSolution,
        tests: readingTests,
        gate: true,
        hints: [
          "Każdy element wycinka udostępnia metody Reading, w tym odpowiednie nadpisanie enabled.",
          "Warunek reading.enabled() powinien decydować, czy dodajesz reading.value().",
        ],
      }),
      choose(
        "dispatch-tradeoff",
        "explain",
        "Wybór wynika z potrzeb API",
        "Masz funkcję wywoływaną osobno dla jednego znanego typu oraz listę mieszanych reporterów. Który opis jest trafny?",
        [
          "Generyki pasują do pierwszej funkcji; &[&dyn Reporter] pozwala przejść po mieszanej liście",
          "dyn zawsze jest szybsze od generyków",
          "Generyki i dyn zawsze wymagają sklonowania wejść",
        ],
        [
          "Generyki pozwalają kompilatorowi wybrać implementację statycznie. Dyn umożliwia wspólną listę kosztem pośredniego wyboru metody; rzeczywisty koszt wymaga pomiaru.",
          "Nie ma takiej gwarancji; dynamiczny wybór może utrudniać optymalizację.",
          "Obie wersje mogą pożyczać wejścia. Samo utworzenie &dyn nie przenosi danych ani nie wymaga alokowania nowego obiektu.",
        ],
      ),
      exercise({
        id: "dispatch-blank",
        kind: "blank",
        title: "Pusta strona: wspólna lista reporterów",
        prompt: reportersContract,
        code: "",
        solution: reportersSolution,
        tests: reportersTests,
        gate: true,
        hints: [
          "Najpierw określ dwie metody traita i implementacje. Metoda domyślna report korzysta z label, a Failure ją zastępuje.",
          "W collect utwórz Vec::new(), przejdź pętlą po pożyczonym wycinku i dodaj wynik reporter.report(). report_one korzysta z tej samej metody przez bound T.",
        ],
      }),
      choose(
        "dispatch-recall",
        "recall",
        "Odtwórz granicę i własność",
        "Co obiecuje parametr reports: &[&dyn Reporter]?",
        [
          "Pożyczony wycinek referencji do wartości udostępniających zgodne z dyn API Reporter",
          "Własność wszystkich konkretnych reporterów przechodzi do funkcji",
          "Konsument może odczytać dowolne pole ukrytych konkretnych typów",
        ],
        [
          "Wywołujesz tylko API traita, a konkretne wartości pozostają u właścicieli.",
          "Obie warstwy & są pożyczone; funkcja nie przejmuje obiektów.",
          "Obiekt traita udostępnia kontrakt, nie strukturę pól.",
        ],
      ),
    ],
    misconceptions: [
      "dyn oznacza dowolną wartość bez sprawdzania traita.",
      "Każdy poprawny trait automatycznie jest dyn compatible.",
      "Wycinek generyczny może mieszać konkretne typy.",
      "Samo &dyn przejmuje lub klonuje obiekt.",
    ],
    transferTask:
      "Zbuduj od pustej strony reporterów z metodą domyślną, nadpisaniem i mieszaną pożyczoną listą.",
    evidenceGate:
      "Filtr odczytów i lista reporterów obsługują dodatkowe typy z testów; puste wejścia, nadpisania i własność są sprawdzane wywołaniami API.",
    sourceIds: [
      "traits-book-dispatch",
      "traits-reference-dyn",
      "traits-error-e0038",
    ],
  },
];

const reviewContractSolution = `trait Visible {
    fn hidden(&self) -> bool;
    fn marker(&self) -> String {
        if self.hidden() { String::from("-") } else { String::from("+") }
    }
}
struct Row { secret: bool }
struct Removed { reason: String }
impl Visible for Row { fn hidden(&self) -> bool { self.secret } }
impl Visible for Removed {
    fn hidden(&self) -> bool { true }
    fn marker(&self) -> String { format!("usunięto:{}", self.reason) }
}`;
const reviewConsumerSolution = `trait Score { fn points(&self) -> i32; }
struct Award { amount: i32 }
struct Penalty { amount: i32 }
impl Score for Award { fn points(&self) -> i32 { self.amount } }
impl Score for Penalty { fn points(&self) -> i32 { -self.amount } }
fn total<T: Score>(items: &[T]) -> i32 {
    let mut sum = 0;
    for item in items { sum += item.points(); }
    sum
}`;
const reviewAssociatedSolution = `trait Build { type Output; fn build(self) -> Self::Output; }
struct Word { value: String }
struct Flag { value: bool }
impl Build for Word { type Output = String; fn build(self) -> String { self.value } }
impl Build for Flag { type Output = bool; fn build(self) -> bool { self.value } }
fn finish<B: Build>(builder: B) -> B::Output { builder.build() }
fn is_blank<B: Build<Output = String>>(builder: B) -> bool { builder.build().trim().is_empty() }`;
const reviewDynSolution = `trait Rule { fn matches(&self, text: &str) -> bool; }
struct Exact { value: String }
struct Any;
impl Rule for Exact { fn matches(&self, text: &str) -> bool { text == self.value } }
impl Rule for Any { fn matches(&self, _text: &str) -> bool { true } }
fn first_match(rules: &[&dyn Rule], text: &str) -> Option<usize> {
    let mut index = 0;
    for rule in rules {
        if rule.matches(text) { return Some(index); }
        index += 1;
    }
    None
}`;

export const traitsReviewExercises: Record<string, LessonStep> = {
  "trait-contract": exercise({
    id: "review-trait-contract",
    kind: "modify",
    title: "Powtórka: znacznik widoczności",
    prompt:
      "Napraw Visible. Row::hidden zwraca secret. Domyślne marker daje - dla hidden = true i + dla false. Removed zawsze jest ukryty, lecz nadpisuje marker jako usunięto:POWÓD, bez spacji po dwukropku i bez trim. Row ma korzystać z metody domyślnej; testy dodają inny typ implementujący hidden.",
    code: reviewContractSolution
      .replace(
        'if self.hidden() { String::from("-") } else { String::from("+") }',
        'String::from("+")',
      )
      .replace('format!("usunięto:{}", self.reason)', "String::new()"),
    solution: reviewContractSolution,
    tests: `struct Other { hidden: bool, data: String }
impl Visible for Other { fn hidden(&self) -> bool { self.hidden } }
fn show<V: Visible>(value: &V) -> String { value.marker() }
#[test]
fn visibility_contract_and_override() {
    for hidden in [false, true] {
        let row = Row { secret: hidden };
        let other = Other { hidden, data: String::from("żółć") };
        assert_eq!(row.hidden(), hidden);
        assert_eq!(show(&row), if hidden { "-" } else { "+" });
        assert_eq!(show(&other), if hidden { "-" } else { "+" });
        assert_eq!(other.data, "żółć");
    }
    for reason in ["", "Łódź", " x "] {
        let removed = Removed { reason: String::from(reason) };
        assert!(removed.hidden());
        assert_eq!(show(&removed), format!("usunięto:{}", reason));
    }
}`,
    hints: [
      "Domyślny marker musi wywołać hidden, także dla nieznanego wcześniej typu.",
      "Removed potrzebuje własnego marker, a Row wystarczy hidden.",
    ],
  }),
  "trait-consumers": exercise({
    id: "review-trait-consumers",
    kind: "apply",
    title: "Powtórka: suma punktów z kontraktu",
    prompt:
      "Dokończ total<T: Score>: zsumuj points wszystkich pożyczonych elementów. Zachowaj znaki i powtórzenia, puste wejście daje 0. Award zwraca amount, Penalty jego przeciwny znak. Dane są dobrane tak, aby negowanie amount oraz każda suma częściowa mieściły się w i32. Gotowe implementacje pozostają bez zmian; total ma działać także z nowym typem bez Copy i Clone.",
    code: reviewConsumerSolution.replace(
      "let mut sum = 0;\n    for item in items { sum += item.points(); }\n    sum",
      "0",
    ),
    solution: reviewConsumerSolution,
    tests: `struct CustomScore { score: i32, marker: String }
impl Score for CustomScore { fn points(&self) -> i32 { self.score } }
#[test]
fn score_consumer_uses_every_method_result() {
    assert_eq!(total(&[Award { amount: 8 }, Award { amount: -3 }, Award { amount: 8 }]), 13);
    assert_eq!(total(&[Penalty { amount: 2 }, Penalty { amount: 9 }]), -11);
    let custom = [CustomScore { score: -4, marker: String::from("żółć") }, CustomScore { score: 10, marker: String::new() }];
    assert_eq!(total(&custom), 6);
    assert_eq!(custom[0].marker, "żółć");
    let empty: [CustomScore; 0] = [];
    assert_eq!(total(&empty), 0);
}`,
    hints: [
      "Pętla ma wywoływać points, nie odczytywać amount.",
      "Zacznij od sumy 0 i dodaj każdy wynik metody przez pożyczony element.",
    ],
  }),
  "associated-output": exercise({
    id: "review-associated-output",
    kind: "modify",
    title: "Powtórka: czy zbudowany tekst jest pusty?",
    prompt:
      "Dokończ is_blank dla dowolnego Build<Output = String>: zbuduj wynik i sprawdź, czy trim().is_empty(). To reguła pustego tekstu, nie formatowanie. Zachowaj finish, które zwraca dowolne B::Output, również bool lub własny typ bez Copy i Clone. Word i Flag konsumują posiadany stan.",
    code: reviewAssociatedSolution.replace(
      "builder.build().trim().is_empty()",
      "false",
    ),
    solution: reviewAssociatedSolution,
    tests: `struct Extra { text: String }
impl Build for Extra { type Output = String; fn build(self) -> String { self.text } }
struct Token { text: String }
struct Factory { token: Token }
impl Build for Factory { type Output = Token; fn build(self) -> Token { self.token } }
#[test]
fn generic_output_survives_and_blank_rule_is_text_specific() {
    for (text, expected) in [("", true), (" \t ", true), (" żółć ", false), ("x", false)] {
        assert_eq!(is_blank(Word { value: String::from(text) }), expected);
        assert_eq!(is_blank(Extra { text: String::from(text) }), expected);
        assert_eq!(finish(Word { value: String::from(text) }), text);
    }
    for value in [false, true] { assert_eq!(finish(Flag { value }), value); }
    let token: Token = finish(Factory { token: Token { text: String::from("własny wynik") } });
    assert_eq!(token.text, "własny wynik");
}`,
    hints: [
      "Tylko is_blank wymaga, aby wynik był String; finish pozostaje ogólne.",
      "Wywołaj build raz, a następnie zastosuj regułę pustego tekstu do zwróconej wartości.",
    ],
  }),
  "dyn-dispatch": exercise({
    id: "review-dyn-dispatch",
    kind: "apply",
    title: "Powtórka: pierwsza pasująca reguła",
    prompt:
      "Dokończ first_match. Przejdź po mieszanym &[&dyn Rule] i zwróć Some(indeks) pierwszej reguły, której matches(text) daje true. Indeksy zaczynają się od 0. Brak dopasowania lub pusty wycinek daje None. Nie zmieniaj Exact ani Any. Kolejność ma znaczenie; testy dodają nową implementację.",
    code: reviewDynSolution.replace(
      "let mut index = 0;\n    for rule in rules {\n        if rule.matches(text) { return Some(index); }\n        index += 1;\n    }\n    None",
      "None",
    ),
    solution: reviewDynSolution,
    tests: `struct Begins { prefix: String }
impl Rule for Begins { fn matches(&self, text: &str) -> bool { text.starts_with(&self.prefix) } }
#[test]
fn mixed_rules_return_first_position_without_consuming_inputs() {
    let exact = Exact { value: String::from("żółć") };
    let prefix = Begins { prefix: String::from("ż") };
    let any = Any;
    assert_eq!(first_match(&[&exact, &prefix, &any], "żółć"), Some(0));
    assert_eq!(first_match(&[&exact, &prefix, &any], "żaba"), Some(1));
    assert_eq!(first_match(&[&exact, &prefix, &any], ""), Some(2));
    assert_eq!(first_match(&[&any, &exact], "żółć"), Some(0));
    assert_eq!(first_match(&[&exact, &prefix], "x"), None);
    assert_eq!(first_match(&[], "żółć"), None);
    assert_eq!(first_match(&[&Exact { value: String::new() }], ""), Some(0));
    assert_eq!(exact.value, "żółć");
    assert_eq!(prefix.prefix, "ż");
}`,
    hints: [
      "Wywołuj matches przez referencję do dyn Rule; nie próbuj rozpoznawać rodzaju reguły.",
      "Prowadź licznik indeksu i zakończ funkcję przy pierwszym true. Po całej pętli zwróć None.",
    ],
  }),
};

export const traitsModule: CourseModule = {
  id: "traits",
  title: "Traity: wspólne zachowanie i różne implementacje",
  whyItMatters:
    "Oddzielasz konsumenta od szczegółów danych. Nowy formatter, odczyt lub reporter może realizować wspólny kontrakt bez dopisywania gałęzi do każdego klienta.",
  capabilities: [
    "Definiujesz wymagane i domyślne zachowania własnego traita.",
    "Budujesz konsumentów działających z nowymi typami.",
    "Zachowujesz lub ograniczasz typ skojarzony wyniku.",
    "Przetwarzasz pożyczone obiekty różnych typów przez zgodny z dyn kontrakt.",
  ],
  prerequisites: ["generics"],
  lessonIds: traitsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Metoda domyślna i nadpisana działają także przez dodatkowy implementujący typ.",
    "Konsumenci operują na metodach traita i zachowują własność niekopiowalnych danych.",
    "Ogólne wyniki nie dostają zbędnych boundów, a operacje tekstowe i liczbowe wymagają właściwego Output.",
    "Mieszana lista pożyczonych reporterów zachowuje kolejność, puste teksty i wszystkie nadpisania.",
  ],
  projectConnection:
    "Kontrakty przygotowują formatowanie i raportowanie w późniejszym LogAnalyzer. Tutaj implementujesz je jako samodzielne API, używając pożyczonych referencji i poznanych kolekcji.",
  assessmentId: "trait-dispatch/dispatch-blank",
  gateCriteria: [
    {
      id: "traits-contract-gate",
      label:
        "Wymagane metody, domyślne zachowanie i nadpisania działają także dla nowego typu implementującego trait.",
      taskRefs: [
        { lessonId: "trait-contracts", stepId: "contracts-tags" },
        { lessonId: "trait-contracts", stepId: "contracts-status" },
      ],
    },
    {
      id: "traits-consumer-gate",
      label:
        "Konsumenci opisów i reguł przyjmują nowe implementacje bez Copy i Clone.",
      taskRefs: [
        { lessonId: "trait-consumers", stepId: "consumers-pair" },
        { lessonId: "trait-consumers", stepId: "consumers-checks" },
      ],
    },
    {
      id: "traits-output-gate",
      label:
        "Ogólne API zachowuje Output, a specjalizowani konsumenci ograniczają wyłącznie potrzebny typ wyniku.",
      taskRefs: [
        { lessonId: "associated-types", stepId: "associated-take" },
        { lessonId: "associated-types", stepId: "associated-measure" },
      ],
    },
    {
      id: "traits-dispatch-gate",
      label:
        "Pożyczone mieszane obiekty zachowują domyślne i nadpisane metody w filtrze oraz liście raportów.",
      taskRefs: [
        { lessonId: "trait-dispatch", stepId: "dispatch-readings" },
        { lessonId: "trait-dispatch", stepId: "dispatch-blank" },
      ],
    },
  ],
};
