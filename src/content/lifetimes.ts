import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const lifetimesSources: Source[] = [
  {
    id: "lifetimes-book-syntax",
    title:
      "The Rust Programming Language: Validating References with Lifetimes",
    url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie relacji wejść i wyniku, struktur pożyczających lub przykładów elision.",
  },
  {
    id: "lifetimes-reference-elision",
    title: "The Rust Reference: Lifetime Elision",
    url: "https://doc.rust-lang.org/reference/lifetime-elision.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji reguł elision, zwłaszcza funkcji i metod z receiverem.",
  },
  {
    id: "lifetimes-error-e0106",
    title: "Rust Error Index: E0106 — missing lifetime specifier",
    url: "https://doc.rust-lang.org/error_codes/E0106.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty diagnostyk rustc w edition 2024 przy zmianie niejednoznacznego wyniku lub struktury.",
  },
  {
    id: "lifetimes-error-e0597",
    title: "Rust Error Index: E0597 — borrowed value does not live long enough",
    url: "https://doc.rust-lang.org/error_codes/E0597.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj diagnostyk zakresu przy zmianie przykładu z rekordem pożyczającym.",
  },
  {
    id: "lifetimes-error-e0515",
    title: "Rust Error Index: E0515 — reference to a local variable returned",
    url: "https://doc.rust-lang.org/error_codes/E0515.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj, czy przykład nadal odrzuca zwrot referencji do lokalnego właściciela i czy naprawa oddaje String.",
  },
];

export const lifetimesCompetencies: Competency[] = [
  {
    id: "specify-borrowed-return-relations",
    title:
      "Opisujesz, z którego wejścia pochodzi zwracany widok i oddzielasz je od krócej żyjących danych pomocniczych.",
  },
  {
    id: "model-borrowed-records",
    title:
      "Definiujesz struktury przechowujące referencje oraz dobierasz adnotacje i elision do ich API.",
  },
  {
    id: "choose-owned-borrowed-api",
    title:
      "Wybierasz wynik pożyczony albo owned, gdy klient ma przechować dane poza zakresem źródła.",
  },
];

export const lifetimesConcepts: Concept[] = [
  {
    id: "borrowed-return-relations",
    title: "Relacja wejścia i zwracanego widoku",
    prerequisites: ["dyn-dispatch"],
    competencyIds: ["specify-borrowed-return-relations"],
    reviewPrompt:
      "Funkcja bierze `source: &'a str` oraz krótkie `note: &'b str`, a zwraca widok fragmentu source. Co powinien wyrażać wynik i dlaczego nie trzeba wiązać go z 'b?",
    reviewAnswer:
      "Wynik powinien mieć lifetime 'a, bo wskazuje na dane source. Note może mieć niezależne 'b i zniknąć po wywołaniu; sam wynik nie może wskazywać na note.",
    distinguish:
      "Adnotacja lifetime opisuje relację ważności referencji w kontrakcie. Nie przedłuża żadnego właściciela i nie jest jednostką czasu wykonywania.",
  },
  {
    id: "borrowed-record-lifetimes",
    title: "Struktura przechowująca referencję i elision",
    prerequisites: ["borrowed-return-relations"],
    competencyIds: ["model-borrowed-records"],
    reviewPrompt:
      "Dlaczego `struct View<'a> { text: &'a str }` potrzebuje 'a, a `fn pass(text: &str) -> &str { text }` może pominąć nazwę lifetime?",
    reviewAnswer:
      "Typ struktury musi nazwać lifetime przechowywanej referencji. Funkcja ma jedno wejście referencyjne, więc reguła elision wiąże pominięty lifetime wyniku z tym jedynym wejściem.",
    distinguish:
      "Elision jest ograniczonym, deterministycznym skrótem podpisu. Gdy wynik mógłby pochodzić z kilku niezależnych wejść albo z niczego, trzeba wyrazić relację jawnie lub zmienić API.",
  },
  {
    id: "lifetime-contracts",
    title: "Kontrakt owned kontra borrowed",
    prerequisites: ["borrowed-record-lifetimes"],
    competencyIds: ["choose-owned-borrowed-api"],
    reviewPrompt:
      "Kiedy funkcja przyjmująca `&str` powinna zwrócić `&str`, a kiedy `String`? Co oznacza próba zwrotu `&'static str` z lokalnego Stringa?",
    reviewAnswer:
      "Zwróć &str, gdy wynik jest widokiem danych wejściowych i klient utrzyma źródło. Zwróć String, gdy wynik ma przeżyć źródło lub powstaje nowy tekst. 'static nie wydłuża lokalnego życia; kontrakt zostanie odrzucony, bo lokalny właściciel znika.",
    distinguish:
      "`'static` oznacza dane ważne przez całe życie programu, nie obietnicę, że dowolna referencja będzie tak długo ważna. Owned String ma własność i może przeżyć lokalne źródło.",
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
    evidenceKind:
      options.kind === "debug"
        ? "fix"
        : options.kind === "blank"
          ? "assessment"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const ambiguousReturn = `fn pick(left: &str, right: &str) -> &str {
    if left.len() >= right.len() { left } else { right }
}

fn main() {
    println!("{}", pick("długi", "x"));
}`;

const annotatedReturn = `fn pick<'a>(left: &'a str, right: &'a str) -> &'a str {
    if left.len() >= right.len() { left } else { right }
}

fn main() {
    let first = String::from("długi");
    let second = String::from("x");
    println!("{}", pick(first.as_str(), second.as_str()));
}`;

const relationsTrimStarter = `fn view<'a>(source: &'a str, _note: &'a str) -> &'a str {
    source
}`;
const relationsTrimSolution = `fn view<'a, 'b>(source: &'a str, _note: &'b str) -> &'a str {
    source.trim()
}`;
const relationsTrimTests = `#[test]
fn result_points_into_source_and_note_can_be_short_lived() {
    let source = String::from("  żółć  ");
    let source_view = source.trim();
    let result = {
        let note = String::from("krótkie metadata");
        view(source.as_str(), note.as_str())
    };
    assert_eq!(result, "żółć");
    assert_eq!(result.as_ptr(), source_view.as_ptr());
    assert_eq!(source, "  żółć  ");
}

#[test]
fn empty_and_already_clean_inputs_keep_their_source() {
    let empty = String::new();
    assert_eq!(view(empty.as_str(), "x"), "");
    let clean = String::from("tekst");
    let expected = clean.trim();
    let result = view(clean.as_str(), "");
    assert_eq!(result, "tekst");
    assert_eq!(result.as_ptr(), expected.as_ptr());
}`;

const relationsPairStarter = `fn summarize<'a>(source: &'a str, note: &'a str) -> (&'a str, usize) {
    (source, 0)
}`;
const relationsPairSolution = `fn summarize<'a, 'b>(source: &'a str, note: &'b str) -> (&'a str, usize) {
    (source, note.len())
}`;
const relationsPairTests = `#[test]
fn auxiliary_length_is_not_a_lifetime_requirement() {
    let source = String::from("raport");
    let result = {
        let note = String::from("żółć");
        summarize(source.as_str(), note.as_str())
    };
    assert_eq!(result.0, "raport");
    assert_eq!(result.0.as_ptr(), source.as_ptr());
    assert_eq!(result.1, "żółć".len());
}

#[test]
fn empty_auxiliary_input_stays_independent() {
    let source = String::from("dane");
    let (view, size) = summarize(source.as_str(), "");
    assert_eq!(view, "dane");
    assert_eq!(view.as_ptr(), source.as_ptr());
    assert_eq!(size, 0);
}`;

const missingStructLifetime = `struct View {
    text: &str,
}

fn main() {}`;
const fixedStructLifetime = `struct View<'a> {
    text: &'a str,
}

fn make_view(text: &str) -> View<'_> {
    View { text }
}

fn main() {
    let source = String::from("pierwszy");
    println!("{}", make_view(source.as_str()).text);
}`;
const droppedRecord = `struct View<'a> {
    text: &'a str,
}

fn main() {
    let view;
    {
        let inner = String::from("krótki");
        view = View { text: inner.as_str() };
    }
    println!("{}", view.text);
}`;
const repairedRecord = `struct View<'a> {
    text: &'a str,
}

fn main() {
    let inner = String::from("krótki");
    let view = View { text: inner.as_str() };
    println!("{}", view.text);
}`;

const recordStarter = `struct Snippet {
    text: String,
}

impl Snippet {
    fn new(text: &str) -> Self {
        Self { text: String::from("") }
    }

    fn as_str(&self) -> &str {
        self.text.as_str()
    }
}`;
const recordSolution = `struct Snippet<'a> {
    text: &'a str,
}

impl<'a> Snippet<'a> {
    fn new(text: &'a str) -> Self {
        Self { text }
    }

    fn as_str(&self) -> &str {
        self.text
    }
}`;
const recordTests = `#[test]
fn record_preserves_source_pointer_and_unicode() {
    for input in ["", "żółć", "  tekst  ", "a\\nb"] {
        let owner = String::from(input);
        let expected = owner.as_str();
        let record = Snippet::new(owner.as_str());
        assert_eq!(record.as_str(), input);
        assert_eq!(record.as_str().as_ptr(), expected.as_ptr());
        assert_eq!(owner, input);
    }
}

#[test]
fn record_can_borrow_a_non_static_owner() {
    let actual = {
        let owner = String::from("wewnątrz");
        let record = Snippet::new(owner.as_str());
        record.as_str().to_owned()
    };
    assert_eq!(actual, "wewnątrz");
}`;

const excerptStarter = `struct Excerpt<'a> {
    part: &'a str,
}

fn excerpt<'a>(text: &'a str, suffix: &'a str) -> Excerpt<'a> {
    Excerpt { part: text }
}`;
const excerptSolution = `struct Excerpt<'a> {
    part: &'a str,
}

fn excerpt<'a, 'b>(text: &'a str, suffix: &'b str) -> Excerpt<'a> {
    let part = text.strip_suffix(suffix).unwrap_or(text);
    Excerpt { part }
}`;
const excerptTests = `#[test]
fn output_belongs_to_text_not_to_suffix() {
    let text = String::from("raport.txt");
    let expected = text.trim_end_matches(".txt");
    let excerpt = {
        let suffix = String::from(".txt");
        excerpt(text.as_str(), suffix.as_str())
    };
    assert_eq!(excerpt.part, "raport");
    assert_eq!(excerpt.part.as_ptr(), expected.as_ptr());
}

#[test]
fn a_non_matching_or_empty_suffix_keeps_the_same_source() {
    let text = String::from("żółć");
    let result = excerpt(text.as_str(), "");
    assert_eq!(result.part, "żółć");
    assert_eq!(result.part.as_ptr(), text.as_ptr());
    let other = excerpt(text.as_str(), ".txt");
    assert_eq!(other.part, "żółć");
}`;

const localStatic = `fn pretend_static() -> &'static str {
    let local = String::from("tylko zakres funkcji");
    local.as_str()
}

fn main() {
    println!("{}", pretend_static());
}`;
const ownedRepair = `fn owned_label(input: &str) -> String {
    input.trim().to_owned()
}

fn main() {
    println!("{}", owned_label("  trwały wynik  "));
}`;

const ownedStarter = `fn make_label<'a>(input: &'a str, prefix: &'a str) -> &'a str {
    input
}`;
const ownedSolution = `fn make_label(input: &str, prefix: &str) -> String {
    format!("{}{}", prefix, input)
}`;
const ownedTests = `#[test]
fn owned_result_survives_source_scope_and_keeps_unicode() {
    let result = {
        let source = String::from("żółć");
        let prefix = String::from("log:");
        make_label(source.as_str(), prefix.as_str())
    };
    assert_eq!(result, "log:żółć");
}

#[test]
fn empty_values_still_obey_the_owned_contract() {
    let result = make_label("", "->");
    assert_eq!(result, "->");
    let source = String::from("dane");
    let result = make_label(source.as_str(), "");
    assert_eq!(result, "dane");
    assert_eq!(source, "dane");
}`;

const borrowedApiStarter = `fn trimmed<'a>(input: &'a str, _marker: &'a str) -> &'a str {
    input
}`;
const borrowedApiSolution = `fn trimmed<'a, 'b>(input: &'a str, _marker: &'b str) -> &'a str {
    input.trim()
}`;
const borrowedApiTests = `#[test]
fn borrowed_result_keeps_input_provenance() {
    let input = String::from("  widok  ");
    let expected = input.trim();
    let result = {
        let marker = String::from("krótki");
        trimmed(input.as_str(), marker.as_str())
    };
    assert_eq!(result, "widok");
    assert_eq!(result.as_ptr(), expected.as_ptr());
}

#[test]
fn empty_and_unicode_inputs_are_not_replaced() {
    let input = String::from(" Łódź ");
    let result = trimmed(input.as_str(), "");
    assert_eq!(result, "Łódź");
    assert_eq!(result.as_ptr(), input.trim().as_ptr());
    let empty = String::new();
    assert_eq!(trimmed(empty.as_str(), "x"), "");
}`;

const blankApiSolution = `fn stable_label(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        String::from("<puste>")
    } else {
        trimmed.to_owned()
    }
}`;
const blankApiTests = `#[test]
fn returned_text_is_owned_after_source_is_gone() {
    let actual = {
        let source = String::from("  Unicode: żółć  ");
        stable_label(source.as_str())
    };
    assert_eq!(actual, "Unicode: żółć");
}

#[test]
fn empty_and_whitespace_sources_get_the_explicit_label() {
    assert_eq!(stable_label(""), "<puste>");
    assert_eq!(stable_label(" \t\n"), "<puste>");
    assert_eq!(stable_label(" dane "), "dane");
}`;

export const lifetimesLessons: Lesson[] = [
  {
    id: "lifetime-relations",
    moduleId: "lifetimes",
    conceptIds: ["borrowed-return-relations"],
    competencyIds: ["specify-borrowed-return-relations"],
    prerequisites: ["trait-dispatch"],
    title: "Skąd pochodzi zwracany widok?",
    subtitle:
      "Najpierw zobaczysz niejednoznaczny wynik, potem nazwiesz jego relację.",
    minutes: 16,
    outcomes: [
      "Rozpoznasz, dlaczego dwa wejścia referencyjne nie wyznaczają samodzielnie lifetime wyniku.",
      "Zapiszesz wynik związany z właściwym źródłem, zostawiając pomocnicze wejście niezależnym.",
      "Sprawdzisz przez testy pochodzenie wskaźnika i przeżycie wyniku po krótkim zakresie pomocniczym.",
    ],
    steps: [
      choose(
        "relations-predict",
        "predict",
        "Przewidź los niejednoznacznego wyniku",
        "pick może zwrócić left albo right. Czy sam zapis `-> &str` wystarczy, aby kompilator wiedział, z którym wejściem ma związać wynik? Najpierw wybierz przewidywanie.",
        1,
        [
          "Tak, wynik zawsze automatycznie dostaje najdłuższe życie",
          "Nie, przy dwóch wejściach trzeba opisać relację wyniku",
          "Tak, bo wszystkie &str mają z definicji 'static",
        ],
        [
          "Rust nie wybiera czasu życia na podstawie długości tekstu.",
          "Dwa wejścia mają osobne lifetime, a ciało może zwrócić dowolne z nich; podpis musi wyrazić bezpieczną relację.",
          "Większość &str wskazuje na dane lokalne albo pożyczone, nie na stałą programu.",
        ],
      ),
      discover(
        "relations-discover",
        "Zobacz E0106 przed regułami",
        "Uruchom kod. E0106 nie jest prośbą o zgadywanie zakresu konkretnego wywołania: definicja funkcji jest niepełna dla wszystkich możliwych par wejść. Zatrzymaj się przy komunikacie, zanim zobaczysz poprawkę.",
        ambiguousReturn,
        annotatedReturn,
        "E0106",
      ),
      choose(
        "relations-explain",
        "explain",
        "Wybierz właściwy kontrakt",
        "Masz `source: &'a str`, `note: &'b str` i wynik będący fragmentem source. Który zapis dopuszcza krótkie note, a zarazem chroni wynik przed wskazaniem na nieistniejące dane?",
        2,
        [
          "Zawsze `-> &'static str`, aby wynik był najdłuższy",
          "Zwiąż wynik z 'b, bo note jest drugim argumentem",
          "Zwiąż wynik z 'a i pozostaw 'b niezależnym",
        ],
        [
          "'static nie wydłuża source ani nie zmienia pochodzenia widoku.",
          "Wynik nie wskazuje na note; związanie z nim niepotrzebnie skróciłoby API.",
          "`&'a str` deklaruje pochodzenie z source. 'b może skończyć się po wywołaniu.",
        ],
      ),
      run(
        "relations-run",
        "Uruchom jawnie opisany wybór",
        "W poprawionym kontrakcie oba wejścia muszą żyć co najmniej tak długo, jak wspólny zakres 'a, ale wynik może być używany tylko tak długo, jak source i right razem. Lifetime nie zmienia długości Stringów. Uruchom kod i porównaj wynik.",
        annotatedReturn,
        "długi\n",
      ),
      coding({
        id: "relations-trim-gate",
        kind: "debug",
        title: "Napraw widok z niezależnym metadata",
        prompt:
          "Napraw cały kontrakt i ciało `view`, aby zwracało przycięty widok source, także gdy note znika zaraz po wywołaniu. Nie twórz nowego Stringa i nie klonuj danych. Testy sprawdzą Unicode, pusty tekst i wskaźnik do fragmentu źródła.",
        code: relationsTrimStarter,
        solution: relationsTrimSolution,
        tests: relationsTrimTests,
        hints: [
          "Sprawdź, jaka metoda zwraca widok do istniejącego source bez alokacji.",
          "Jeśli kompilator wiąże wynik także z note, krótki zakres pomocniczy zablokuje użycie widoku. Rozdziel relację wyniku od danych używanych tylko podczas obliczenia.",
        ],
        gate: true,
      }),
      coding({
        id: "relations-pair-gate",
        kind: "apply",
        title: "Oddziel widok od długości pomocniczej",
        prompt:
          "Napraw kontrakt i ciało `summarize`: zwróć source oraz liczbę bajtów note. Source ma zachować własne pochodzenie, a note może być krótsze i służyć tylko do obliczenia liczby. Nie zwracaj note jako widoku.",
        code: relationsPairStarter,
        solution: relationsPairSolution,
        tests: relationsPairTests,
        hints: [
          "Krotka ma dwa różne elementy: jeden jest pożyczką, drugi wynikiem obliczenia.",
          "Użyj operacji, która odczytuje note bez oddawania jego referencji. Jeśli kontrakt wymaga wspólnego zakresu obu wejść, zmień tę relację.",
        ],
        gate: true,
      }),
      choose(
        "relations-recall",
        "recall",
        "Odtwórz sens adnotacji",
        "Czy zapis `fn f<'a>(source: &'a str, note: &str) -> &'a str` wydłuża życie source do końca programu?",
        0,
        [
          "Nie; opisuje wymagane powiązanie, a właściciel source nadal decyduje o ważności",
          "Tak; każda nazwa lifetime tworzy dane na stercie",
          "Tak, ale tylko gdy note jest Stringiem",
        ],
        [
          "Lifetime jest kontraktem sprawdzanym przez kompilator; nie przedłuża runtime życia wartości.",
          "Adnotacje nie alokują i nie przenoszą danych.",
          "Typ note nie zmienia znaczenia adnotacji ani zasad własności.",
        ],
      ),
    ],
    misconceptions: [
      "'a jest zegarem runtime, który przedłuża życie danych.",
      "Wynik z dwóch wejść automatycznie pochodzi z dłużej żyjącego wejścia.",
      "Pomocnicza referencja musi mieć ten sam lifetime co zwracany widok.",
    ],
    transferTask:
      "Zaprojektuj funkcję zwracającą widok do source oraz niezależny wynik obliczenia z krótkiego metadata, a następnie uzasadnij pochodzenie obu części.",
    evidenceGate:
      "Dwa testowane kontrakty rozdzielają source i pomocnicze wejście; przechodzą dla pustych i Unicode danych oraz sprawdzają source pointer provenance po zakończeniu krótkiego zakresu.",
    sourceIds: [
      "lifetimes-book-syntax",
      "lifetimes-reference-elision",
      "lifetimes-error-e0106",
    ],
  },
  {
    id: "lifetime-structs",
    moduleId: "lifetimes",
    conceptIds: ["borrowed-record-lifetimes"],
    competencyIds: ["model-borrowed-records"],
    prerequisites: ["lifetime-relations"],
    title: "Rekord, który pożycza",
    subtitle:
      "Nazwasz lifetime pola, odczytasz elision i zobaczysz granicę zakresu.",
    minutes: 17,
    outcomes: [
      "Dodasz parametr lifetime do struktury przechowującej referencję.",
      "Rozpoznasz, kiedy elision wiąże wynik z jedynym wejściem.",
      "Naprawisz E0597 przez zmianę zakresu właściciela zamiast przez ukrywanie problemu.",
    ],
    steps: [
      choose(
        "structs-predict",
        "predict",
        "Przewidź deklarację rekordu",
        "`View` ma pole `text: &str`. Czy struktura może pominąć nazwę lifetime tak samo jak prosta funkcja z jednym wejściem?",
        1,
        [
          "Tak, elision zawsze działa w definicjach struktur",
          "Nie, typ przechowujący referencję musi nazwać lifetime pola",
          "Tak, bo pole zostaje automatycznie skopiowane",
        ],
        [
          "Elision ma ograniczone reguły dla podpisów funkcji i metod, nie dla pól struktury.",
          "`View<'a> { text: &'a str }` zapisuje relację między rekordem a właścicielem tekstu.",
          "Referencja nie kopiuje Stringa ani nie staje się owned.",
        ],
      ),
      discover(
        "structs-missing-lifetime",
        "Zobacz E0106 przy polu",
        "Uruchom niepełną strukturę. E0106 wskazuje brak lifetime specifier: kompilator nie może udawać, że pożyczka pola nie ma relacji z właścicielem. Zanim przejdziesz dalej, nazwij tę zależność w poprawionym kodzie.",
        missingStructLifetime,
        fixedStructLifetime,
        "E0106",
      ),
      run(
        "structs-elision-run",
        "Uruchom konstruktor z elision",
        "`View<'a>` przechowuje pożyczkę. Funkcja `make_view(text: &str) -> View<'_>` ma jedno wejście referencyjne, więc placeholder wyniku wskazuje na ten sam source. Elision skraca zapis, ale nie usuwa relacji. Uruchom kod.",
        fixedStructLifetime,
        "pierwszy\n",
      ),
      discover(
        "structs-dropped-record",
        "Zobacz E0597 po zakończeniu zakresu",
        "W tym programie rekord zostaje użyty po zakończeniu zakresu `inner`. E0597 nie mówi, że referencje są losowo krótkie: mówi, że właściciel zniknął, zanim rekord przestał być używany. Naprawę zobaczysz po obserwacji diagnostyki.",
        droppedRecord,
        repairedRecord,
        "E0597",
      ),
      choose(
        "structs-explain",
        "explain",
        "Rozpoznaj rolę elision",
        "Dla `fn pass(text: &str) -> &str { text }` która relacja jest zgodna z regułami elision?",
        0,
        [
          "Jedyny lifetime wejścia zostaje przypisany do pominiętego lifetime wyniku",
          "Wynik staje się 'static",
          "Kompilator kopiuje tekst do nowego Stringa",
        ],
        [
          "Przy dokładnie jednym wejściu referencyjnym elision może związać wynik z tym wejściem.",
          "Elision nie zmienia pochodzenia danych i nie tworzy 'static.",
          "Zwracany `&str` nadal jest widokiem; nie ma tu alokacji ani kopiowania.",
        ],
      ),
      coding({
        id: "structs-record-gate",
        kind: "modify",
        title: "Napraw konstrukcję pożyczającego rekordu",
        prompt:
          "`Snippet::new` ma przechowywać dokładnie przekazany widok. Napraw model rekordu, konstruktor i `as_str`, aby testy mogły sprawdzić pusty tekst, Unicode, wskaźnik źródła oraz właściciela, który nie jest 'static. Nie twórz niepotrzebnej kopii danych.",
        code: recordStarter,
        solution: recordSolution,
        tests: recordTests,
        hints: [
          "Sprawdź, czy typ pola przechowuje widok czy nowego właściciela oraz co powinno znaleźć się w `Self`.",
          "Rekord ma zachować referencję z konstruktora. Nazwij relację lifetime w typie i impl, a potem przekaż argument bez zastępowania go literałem.",
        ],
        gate: true,
      }),
      coding({
        id: "structs-excerpt-gate",
        kind: "apply",
        title: "Zwiąż rekord z tekstem, nie z suffixem",
        prompt:
          "Napraw kontrakt i ciało `excerpt`: przechowuj w `Excerpt<'a>` tekst bez końcowego suffixu, jeśli suffix pasuje, w przeciwnym razie cały text. Wynik ma pochodzić z text, a suffix może być krótką pomocą. Nie alokuj nowego Stringa.",
        code: excerptStarter,
        solution: excerptSolution,
        tests: excerptTests,
        hints: [
          "Metoda na `&str` może zwrócić fragment tego samego źródła bez posiadania go.",
          "Jeśli wynik jest związany z krótkim suffixem, wywołanie z zagnieżdżonego zakresu odrzuci się. Dopasuj relacje wejścia i pola, a potem wybierz opcjonalny widok text.",
        ],
        gate: true,
      }),
      choose(
        "structs-recall",
        "recall",
        "Odtwórz granicę właściciela",
        "Co musi być prawdą, aby `View<'a>` mogło bezpiecznie być użyte po wywołaniu konstruktora?",
        2,
        [
          "Właściciel tekstu musi zostać sklonowany do View",
          "Każda referencja w View musi mieć 'static",
          "Właściciel danych musi żyć co najmniej tak długo, jak używany View",
        ],
        [
          "Rekord przechowuje pożyczkę; Clone nie jest częścią tej umowy.",
          "Dane lokalne mogą być bezpiecznie pożyczone w odpowiednim zakresie.",
          "To relacja ważności: użycie rekordu nie może wyjść poza życie jego właściciela.",
        ],
      ),
    ],
    misconceptions: [
      "Elision pozwala pominąć lifetime w każdym miejscu typu.",
      "Dodanie 'static naprawia każdy rekord pożyczający.",
      "Struktura z referencją przejmuje i zwalnia dane pola.",
    ],
    transferTask:
      "Zaprojektuj rekord przechowujący widok sekcji dokumentu oraz konstruktor, w którym pomocniczy separator może mieć krótszy zakres niż dokument.",
    evidenceGate:
      "Konstruktor i Excerpt zachowują source pointer provenance, Unicode i puste wejścia; testy potwierdzają właściciela nie-'static oraz niezależny suffix.",
    sourceIds: [
      "lifetimes-book-syntax",
      "lifetimes-reference-elision",
      "lifetimes-error-e0106",
      "lifetimes-error-e0597",
    ],
  },
  {
    id: "lifetime-api",
    moduleId: "lifetimes",
    conceptIds: ["lifetime-contracts"],
    competencyIds: ["choose-owned-borrowed-api"],
    prerequisites: ["lifetime-structs"],
    title: "Wybierz kontrakt API",
    subtitle:
      "Zdecydujesz, kiedy oddać widok, a kiedy nowy właścicielski String.",
    minutes: 18,
    outcomes: [
      "Rozpoznasz E0515 przy próbie zwrotu referencji do lokalnych danych.",
      "Wyjaśnisz, dlaczego 'static nie wydłuża życia lokalnego właściciela.",
      "Zaprojektujesz osobne API borrowed i owned oraz sprawdzisz ich zakres użycia testami.",
    ],
    steps: [
      choose(
        "api-predict",
        "predict",
        "Przewidź zwrot lokalnego widoku",
        "`pretend_static` tworzy lokalny String i zwraca `&'static str`. Czy apostrof static utrzyma lokalnego właściciela przy życiu po wyjściu z funkcji?",
        1,
        [
          "Tak, 'static automatycznie przenosi String do pamięci globalnej",
          "Nie, referencja do lokalnych danych nadal wygasa przed użyciem wyniku",
          "Tak, jeśli wynik jest wyświetlany przez println!",
        ],
        [
          "'static jest wymaganiem ważności, nie mechanizmem alokacji ani wycieku.",
          "Lokalny String zostanie zniszczony na końcu funkcji, więc nie może zasilić wyniku 'static.",
          "Sposób użycia nie może naprawić nieprawidłowego źródła referencji.",
        ],
      ),
      discover(
        "api-local-static",
        "Zobacz E0515 i nieudany 'static",
        "Uruchom kod i przeczytaj E0515. Kompilator odrzuca zwrot widoku do lokalnego właściciela: sama adnotacja 'static nie zmienia zakresu `local`. Następna naprawa odda własność Stringa.",
        localStatic,
        ownedRepair,
        "E0515",
      ),
      run(
        "api-owned-run",
        "Uruchom naprawę owned",
        "`owned_label` przyjmuje widok, ale oddaje nowy String. `to_owned` kopiuje tekst do nowego właściciela; to świadomy koszt, który pozwala wynikowi przeżyć źródło. Uruchom kod i zmień odstępy, aby zobaczyć, że zwrot nie jest referencją.",
        ownedRepair,
        "trwały wynik\n",
      ),
      choose(
        "api-explain",
        "explain",
        "Dobierz typ wyniku do czasu użycia",
        "Klient przechowuje wynik po zamknięciu zakresu źródłowego. Który kontrakt jest właściwy dla funkcji, która normalizuje tekst?",
        2,
        [
          "Zawsze `&'static str`, aby uniknąć alokacji",
          "`&str`, nawet gdy funkcja tworzy nową zawartość",
          "`String`, jeśli wynik ma być niezależnym właścicielem po normalizacji",
        ],
        [
          "'static nie jest uniwersalnym skrótem na brak kosztu i odrzuca dane lokalne.",
          "&str może być właściwe dla widoku, ale nie przechowa nowej zawartości po zniknięciu źródła.",
          "String jasno obiecuje własność wyniku; klient może go użyć po zniszczeniu wejściowego Stringa.",
        ],
      ),
      coding({
        id: "api-owned-gate",
        kind: "debug",
        title: "Napraw owned API",
        prompt:
          "Napraw cały kontrakt i ciało `make_label`, aby wynik złożony z prefixu i inputu przeżył zakres obu wejść. Testy sprawdzą pustki, Unicode oraz użycie po zakończeniu zakresu źródeł.",
        code: ownedStarter,
        solution: ownedSolution,
        tests: ownedTests,
        hints: [
          "Wynik musi posiadać własny tekst, bo oba wejścia mogą zniknąć przed jego użyciem.",
          "Jeśli podpis zwraca widok do jednego wejścia, test po zewnętrznym zakresie go odrzuci. Zbuduj nowy String z obu fragmentów w wymaganej kolejności.",
        ],
        gate: true,
      }),
      coding({
        id: "api-borrowed-gate",
        kind: "apply",
        title: "Napraw borrowed API",
        prompt:
          "Napraw kontrakt i ciało `trimmed`, aby zwracało pożyczony, przycięty widok input, choć marker może zniknąć wcześniej. Nie alokuj Stringa; testy sprawdzą Unicode, pusty tekst, pointer provenance i marker z krótszego zakresu.",
        code: borrowedApiStarter,
        solution: borrowedApiSolution,
        tests: borrowedApiTests,
        hints: [
          "To API ma zwrócić widok istniejącego input, więc wybierz operację zwracającą `&str`.",
          "Jeśli marker i wynik mają wymuszony wspólny zakres, krótki marker zablokuje użycie widoku. Rozdziel tę relację i zastosuj `trim` do input.",
        ],
        gate: true,
      }),
      coding({
        id: "api-blank",
        kind: "blank",
        title: "Zaprojektuj kontrakt od pustej kartki",
        prompt:
          "Napisz funkcję `stable_label`, która przyjmuje pożyczony tekst, usuwa białe znaki na brzegach i zwraca własny `String`. Gdy po usunięciu tekst jest pusty, wynikiem ma być dokładnie `<puste>`. Wynik musi działać po zakończeniu zakresu źródła. Nie używaj wycieków, `unsafe` ani zwracania referencji. Zacznij od pustego edytora: nie podajemy tutaj gotowego podpisu ani startera.",
        solution: blankApiSolution,
        tests: blankApiTests,
        hints: [
          "Najpierw zdecyduj, która część API musi posiadać dane po wyjściu źródła.",
          "Oblicz przycięty widok, rozgałęź się dla pustego tekstu, a dla niepustego utwórz owned wynik.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "'static jest sposobem na wydłużenie runtime życia lokalnego Stringa.",
      "Każda funkcja przyjmująca &str powinna zwracać &str.",
      "Owned wynik zawsze oznacza, że wejście trzeba sklonować przed wywołaniem.",
    ],
    transferTask:
      "Zaprojektuj dwa warianty API dla tego samego tekstu: tani widok do istniejącego źródła oraz owned raport, który klient może przechować po jego zniszczeniu.",
    evidenceGate:
      "Po naprawie dwóch różnych kontraktów oraz zadania od pustej kartki testy potwierdzają przeżycie owned wyniku, source pointer provenance dla borrowed widoku, puste i Unicode dane.",
    sourceIds: ["lifetimes-book-syntax", "lifetimes-error-e0515"],
  },
];

export const lifetimesReviewExercises: Record<string, LessonStep> = {
  "borrowed-return-relations": coding({
    id: "review-borrowed-return-relations",
    kind: "apply",
    title: "Powtórka: oddziel źródło od flagi",
    prompt:
      "Dokończ `source_view`, aby zwracało przycięty widok source. flag jest tylko krótką informacją pomocniczą i nie może być źródłem wyniku. Zachowaj pochodzenie wskaźnika, brak alokacji i działanie dla Unicode.",
    code: `fn source_view<'a>(source: &'a str, _flag: &'a str) -> &'a str {
    source
}`,
    solution: `fn source_view<'a, 'b>(source: &'a str, _flag: &'b str) -> &'a str {
    source.trim()
}`,
    tests: `#[test]
fn review_checks_provenance_and_short_flag() {
    let source = String::from("  żaba  ");
    let expected = source.trim();
    let view = {
        let flag = String::from("ok");
        source_view(source.as_str(), flag.as_str())
    };
    assert_eq!(view, "żaba");
    assert_eq!(view.as_ptr(), expected.as_ptr());
    assert_eq!(source_view("", "x"), "");
}`,
    hints: [
      "Wynik jest widokiem, więc operacja nie powinna tworzyć nowego właściciela.",
      "Użyj `trim` na source; flag nie powinno wpływać na lifetime ani treść wyniku.",
    ],
  }),
  "borrowed-record-lifetimes": coding({
    id: "review-borrowed-record-lifetimes",
    kind: "apply",
    title: "Powtórka: zachowaj pożyczkę w rekordzie",
    prompt:
      "Dokończ `Record::new`, aby przechowywało przekazany text w strukturze `Record<'a>`. Nie kopiuj, nie klonuj i nie zamieniaj pola na owned String. Testy podadzą pusty i Unicode tekst.",
    code: `struct Record {
    text: String,
}

impl Record {
    fn new(text: &str) -> Self {
        Self { text: String::new() }
    }
}`,
    solution: `struct Record<'a> {
    text: &'a str,
}

impl<'a> Record<'a> {
    fn new(text: &'a str) -> Self {
        Self { text }
    }
}`,
    tests: `#[test]
fn review_record_uses_non_static_source() {
    let source = String::from("Łódź");
    let record = Record::new(source.as_str());
    assert_eq!(record.text, "Łódź");
    assert_eq!(record.text.as_ptr(), source.as_ptr());
    let empty = String::new();
    assert_eq!(Record::new(empty.as_str()).text, "");
}`,
    hints: [
      "Lifetime struktury opisuje pożyczkę, a konstruktor ma zachować przekazany widok.",
      "W polu wyniku użyj argumentu `text`, nie zastępczego literału.",
    ],
  }),
  "lifetime-contracts": coding({
    id: "review-lifetime-contracts",
    kind: "apply",
    title: "Powtórka: owned wynik z krótkiego źródła",
    prompt:
      "Dokończ `owned`, aby zwracało przycięty, własnościowy String. Klient użyje wyniku po zakończeniu zakresu source; nie zwracaj referencji, nie wymagaj 'static i nie używaj wycieku.",
    code: `fn owned<'a>(input: &'a str) -> &'a str {
    input
}`,
    solution: `fn owned(input: &str) -> String {
    input.trim().to_owned()
}`,
    tests: `#[test]
fn review_owned_survives_input_scope() {
    let output = {
        let input = String::from("  review: żółć  ");
        owned(input.as_str())
    };
    assert_eq!(output, "review: żółć");
    assert_eq!(owned(""), "");
    assert_eq!(owned(" \t "), "");
}`,
    hints: [
      "Źródło zniknie, więc wynik potrzebuje własności tekstu.",
      "Przytnij widok, a potem utwórz z niego String przez operację kopiującą zawartość do nowego właściciela.",
    ],
  }),
};

export const lifetimesModule: CourseModule = {
  id: "lifetimes",
  title: "Lifetimes: bezpieczne kontrakty widoków",
  whyItMatters:
    "Projektujesz funkcje i rekordy, które mogą pożyczać dane bez dangling references. Dzięki temu wiesz, kiedy tani widok jest bezpieczny, a kiedy API musi oddać własny wynik.",
  capabilities: [
    "Opisujesz relację między źródłem a zwracanym widokiem.",
    "Definiujesz struktury z pożyczanymi polami i korzystasz z elision, gdy relacja jest jednoznaczna.",
    "Dobierasz borrowed lub owned wynik na podstawie tego, jak długo klient musi używać danych.",
  ],
  prerequisites: ["traits"],
  lessonIds: lifetimesLessons.map((lesson) => lesson.id),
  exitGate: [
    "Ambiguous borrowed return jest naprawiony relacją source → wynik, a niezależne metadata może skończyć się wcześniej.",
    "Rekord pożyczający zachowuje source pointer provenance i nie przeżywa swojego właściciela.",
    "Owned API działa po zniszczeniu wejścia, a borrowed API pozostaje widokiem bez udawania 'static.",
  ],
  projectConnection:
    "Przygotowuje bezpieczne widoki linii i nagłówków w przyszłym Log Analyzerze: parser może pożyczać fragmenty wejścia, a raport wynikowy może świadomie posiadać znormalizowany tekst.",
  assessmentId: "lifetime-api/api-blank",
  gateCriteria: [
    {
      id: "lifetime-relations-gate",
      label:
        "Wynik borrowed pochodzi ze source, a krótkie wejście pomocnicze nie ogranicza jego ważności.",
      taskRefs: [
        { lessonId: "lifetime-relations", stepId: "relations-trim-gate" },
        { lessonId: "lifetime-relations", stepId: "relations-pair-gate" },
      ],
    },
    {
      id: "lifetime-structs-gate",
      label:
        "Struktury z referencjami zachowują pola i zakresy bez kopiowania danych.",
      taskRefs: [
        { lessonId: "lifetime-structs", stepId: "structs-record-gate" },
        { lessonId: "lifetime-structs", stepId: "structs-excerpt-gate" },
      ],
    },
    {
      id: "lifetime-api-gate",
      label:
        "Dobór owned i borrowed jest zgodny z zakresem użycia oraz pochodzeniem danych.",
      taskRefs: [
        { lessonId: "lifetime-api", stepId: "api-owned-gate" },
        { lessonId: "lifetime-api", stepId: "api-borrowed-gate" },
      ],
    },
  ],
};
