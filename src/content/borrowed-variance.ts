import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

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
  diagnostic: string,
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: { kind: "expected-error", diagnostic },
    expectedStatus: "compile-error",
    expectedDiagnostic: diagnostic,
    evidenceKind: "exposure",
  };
}

function coding(options: {
  id: string;
  kind: "debug" | "apply" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined
      ? {}
      : { code: options.code, expectedStatus: "success" as const }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: true,
  };
}

export const borrowedVarianceSources: Source[] = [
  {
    id: "borrowed-variance-reference-subtyping",
    title: "Rust Reference: Subtyping and variance",
    url: "https://doc.rust-lang.org/reference/subtyping.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów skracania lifetime, wariancji referencji lub typów zawierających referencje.",
  },
  {
    id: "borrowed-variance-reference-trait-bounds",
    title: "Rust Reference: Trait and lifetime bounds",
    url: "https://doc.rust-lang.org/reference/trait-bounds.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie zapisu relacji lifetime, boundów `T: 'a` albo przykładów z krótkim tokenem.",
  },
  {
    id: "borrowed-variance-book-lifetime-syntax",
    title: "The Rust Programming Language: Lifetime syntax",
    url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyjaśnień, że lifetime opisuje relację i nie przedłuża właściciela.",
  },
  {
    id: "borrowed-variance-reference-elision",
    title: "Rust Reference: Lifetime elision",
    url: "https://doc.rust-lang.org/reference/lifetime-elision.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisów funkcji wskaźnikowych z elision oraz jawnych relacji lifetime.",
  },
];

export const borrowedVarianceCompetencies: Competency[] = [
  {
    id: "explain-shared-borrow-variance",
    title:
      "Wyjaśniasz, kiedy krótszy lifetime może skrócić widok współdzielony i typ, który go zawiera.",
  },
  {
    id: "separate-mutable-loan-and-content",
    title:
      "Rozdzielasz czas zewnętrznej mutowalnej pożyczki od lifetime referencji przechowywanej w slocie.",
  },
];

export const borrowedVarianceConcepts: Concept[] = [
  {
    id: "variance-shared-views",
    title: "Współdzielone widoki są kowariantne",
    prerequisites: ["callable-contracts"],
    competencyIds: ["explain-shared-borrow-variance"],
    reviewPrompt:
      "Masz `Label<'long> { text: &'long str }` oraz token `&'short ()`, gdzie `'long: 'short`. Dlaczego można zwrócić `Label<'short>` bez zmiany właściciela tekstu, a empty i Unicode nie wymagają osobnej reguły?",
    reviewAnswer:
      "`&'a T` jest kowariantne w `'a`, więc widok z dłuższego życia można bezpiecznie użyć jako widok krótszy; pole Label zachowuje tę relację. Skrócenie typu ogranicza użycie wyniku, nie właściciela, a długość i bajty tekstu, także puste i Unicode, pozostają te same.",
    distinguish:
      "Kowariancja lifetime jest relacją typów sprawdzaną przez kompilator, nie dziedziczeniem klas ani przedłużaniem danych. `T: 'static` oznacza, że T nie zawiera pożyczki krótszej niż całe życie programu; nie zmienia lokalnego Stringa w dane wieczne.",
  },
  {
    id: "variance-mutable-slots",
    title: "Mutowalna pożyczka jest niezmiennicza względem typu zawartości",
    prerequisites: ["variance-shared-views"],
    competencyIds: ["separate-mutable-loan-and-content"],
    reviewPrompt:
      "Dlaczego `&mut &'data str` może przyjąć nowy `&'data str`, ale nie powinno być traktowane jako slot krótszych referencji? Jak podpis `replace_label` pozwala na kolejne krótkie mutowalne pożyczki?",
    reviewAnswer:
      "Zewnętrzny lifetime pożyczki `&mut` może być skrócony, lecz zawartość slotu ma jeden ustalony `'data`; dopuszczenie dowolnego krótkiego zapisu mogłoby zostawić tam referencję po jej wygaśnięciu. `replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str` wiąże tylko przechowywane dane, a wywnioskowany czas zewnętrznej pożyczki pozostaje niezależny.",
    distinguish:
      "`&mut T` nie jest kowariantne w T: odczyt i zapis muszą mieć jeden bezpieczny typ zawartości. Zewnętrzna pożyczka może być krótka, ale typ referencji przechowywanej w slocie nie może zmieniać się przy zapisie.",
  },
];

const sharedRun = String.raw`fn invoke_long<'long, 'short>(function: fn(&'short str) -> usize, text: &'long str) -> usize
where
    'long: 'short,
{
    let accepts_long: fn(&'long str) -> usize = function;
    accepts_long(text)
}

fn size<'a>(text: &'a str) -> usize {
    text.len()
}

fn identity<'a>(text: &'a str) -> &'a str {
    text
}

fn shorten_output<'long: 'short, 'short>(
    function: fn(&'long str) -> &'long str,
    text: &'long str,
) -> &'short str {
    let returns_short: fn(&'long str) -> &'short str = function;
    returns_short(text)
}

fn main() {
    let view: fn(&str) -> usize = size;
    let text = String::from("żółć");
    println!("{}", shorten_output(identity, text.as_str()));
    println!("{}", invoke_long(view, text.as_str()));
}
`;

const labelStarter = String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Label<'data> {
    pub text: &'data str,
}

pub fn shorten_label<'long: 'short, 'short>(
    label: Label<'long>,
    _token: &'short (),
) -> Label<'short> {
    let _ = label;
    Label { text: "" }
}
`;

const labelSolution = String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Label<'data> {
    pub text: &'data str,
}

pub fn shorten_label<'long: 'short, 'short>(
    label: Label<'long>,
    _token: &'short (),
) -> Label<'short> {
    label
}
`;

const labelTests = String.raw`#[test]
fn shortens_generic_label_without_changing_text_or_pointer() {
    fn covary<'long: 'short, 'short>(label: Label<'long>) -> Label<'short> {
        label
    }

    let source = String::from("  żółć / 前置  ");
    let expected = source.as_str();
    let label = Label { text: expected };
    let token = ();
    let shortened = shorten_label(label, &token);
    assert_eq!(shortened.text, expected);
    assert_eq!(shortened.text.as_ptr(), expected.as_ptr());
    assert_eq!(covary(Label { text: "static" }).text, "static");
}

#[test]
fn empty_input_remains_an_empty_view() {
    let empty = String::new();
    let token = ();
    let result = shorten_label(
        Label {
            text: empty.as_str(),
        },
        &token,
    );
    assert_eq!(result.text, "");
    assert_eq!(result.text.as_ptr(), empty.as_ptr());
}
`;

const samplesSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub struct Samples<'data> {
    pub values: &'data [i32],
}

pub fn prefix_samples<'data: 'short, 'short>(
    samples: Samples<'data>,
    count: usize,
    _token: &'short (),
) -> Option<Samples<'short>> {
    if count > samples.values.len() {
        return None;
    }
    Some(Samples {
        values: &samples.values[..count],
    })
}
`;

const samplesTests = String.raw`#[test]
fn prefix_preserves_source_pointer_and_generic_covariance() {
    fn covary<'long: 'short, 'short>(view: Samples<'long>) -> Samples<'short> {
        view
    }

    let values = [10, 20, 30, 40];
    let token = ();
    let prefix = prefix_samples(Samples { values: &values }, 2, &token).unwrap();
    assert_eq!(prefix.values, &[10, 20]);
    assert_eq!(prefix.values.as_ptr(), values.as_ptr());
    let static_values: &'static [i32] = &[1, 2, 3];
    assert_eq!(
        covary(Samples {
            values: static_values
        })
        .values,
        static_values
    );
}

#[test]
fn prefix_checks_zero_full_and_oversize_counts() {
    let values = [7, 8, 9];
    let token = ();
    let empty = prefix_samples(Samples { values: &values }, 0, &token)
        .unwrap()
        .values;
    assert_eq!(empty.len(), 0);
    assert_eq!(empty.as_ptr(), values.as_ptr());
    let full = prefix_samples(Samples { values: &values }, values.len(), &token)
        .unwrap()
        .values;
    assert_eq!(full, values);
    assert_eq!(full.as_ptr(), values.as_ptr());
    assert!(prefix_samples(Samples { values: &values }, values.len() + 1, &token).is_none());
}
`;

export const borrowedVarianceLessons: Lesson[] = [
  {
    id: "variance-shared-views",
    moduleId: "borrowed-callbacks",
    conceptIds: ["variance-shared-views"],
    competencyIds: ["explain-shared-borrow-variance"],
    prerequisites: ["closure-contracts"],
    title: "Skracanie współdzielonego widoku",
    subtitle:
      "Zobaczysz kowariancję lifetime na prostym rekordzie, bez zmiany właściciela.",
    minutes: 18,
    outcomes: [
      "Zapiszesz relację `'long: 'short` i rozpoznasz kowariancję `&'a T`.",
      "Sprawdzisz przez funkcję generyczną, że publiczny Label może zmienić lifetime typu.",
      "Oddzielisz skrócenie użycia widoku od runtime życia jego właściciela oraz od boundu `T: 'static`.",
    ],
    steps: [
      choose(
        "variance-shared-predict",
        "predict",
        "Przewidź skrócenie widoku",
        "Jeśli `'long: 'short`, a `Label<'long>` ma publiczne pole `text: &'long str`, co powinien zrobić bezpieczny adapter z tokenem `&'short ()`?",
        0,
        [
          "Zwrócić `Label<'short>` z tym samym widokiem tekstu",
          "Skopiować tekst do nowego właściciela",
          "Wymusić, aby token żył tak długo jak cały program",
        ],
        [
          "Współdzielona referencja jest kowariantna w lifetime, więc typ może zostać bezpiecznie skrócony; dane pozostają w tym samym miejscu.",
          "Skrócenie lifetime nie wymaga alokacji ani kopiowania.",
          "Token tylko wyznacza krótszy zakres wyniku; nie tworzy boundu `'static`.",
        ],
      ),
      run(
        "variance-shared-run",
        "Uruchom funkcję wskaźnikową",
        "Najpierw elision zapisuje `fn(&str) -> usize`, czyli wskaźnik callable z uniwersalnie elisionowanym wejściem. W `invoke_long` jawne lifetime pokazują zwykłą kontrawariancję argumentu: funkcja przyjmująca krótszy widok może zostać użyta dla dłuższego wywołania, gdy `'long: 'short`. `shorten_output` sprawdza osobno kowariancję wyniku, skracając `&'long str` do `&'short str`. To relacje typów sprawdzone przez kompilator, nie dziedziczenie.",
        sharedRun,
        "żółć\n8\n",
      ),
      choose(
        "variance-shared-explain",
        "explain",
        "Lifetime nie jest zegarem",
        "Co oznacza skrócenie `Label<'long>` do `Label<'short>`?",
        1,
        [
          "Właściciel tekstu zostaje automatycznie przedłużony",
          "Wynik ma węższy kontrakt użycia, a właściciel nadal musi żyć wystarczająco długo",
          "Dane stają się `T: 'static`",
        ],
        [
          "Adnotacje lifetime nie zmieniają runtime życia właściciela.",
          "Kompilator ogranicza, gdzie można użyć wyniku; źródło nadal rządzi ważnością danych.",
          "`'static` jest wymaganiem typu, nie automatycznym skutkiem kowariancji.",
        ],
      ),
      coding({
        id: "variance-shared-views-gate",
        kind: "debug",
        title: "Zaimplementuj `shorten_label`",
        prompt:
          "Uzupełnij publiczny rekord `Label<'data> { pub text: &'data str }` i funkcję `shorten_label<'long: 'short, 'short>(label: Label<'long>, token: &'short ()) -> Label<'short>`. Token służy wyłącznie do związania krótszego lifetime wyniku i nie może zmienić tekstu. Testy sprawdzą generyczną konwersję publicznego typu, pointer provenance, pusty tekst i Unicode. Nie alokuj ani nie klonuj.",
        code: labelStarter,
        solution: labelSolution,
        tests: labelTests,
        hints: [
          "Zwracany rekord ma mieć to samo pole `text`; różnica dotyczy tylko parametru lifetime typu.",
          "Wymóg `'long: 'short` pozwala kompilatorowi skrócić współdzielony widok. Token nie jest przechowywany.",
        ],
      }),
      coding({
        id: "variance-shared-views-blank",
        kind: "blank",
        title: "Zaprojektuj `Samples` od pustej kartki",
        prompt:
          "Napisz publiczny widok `Samples<'data>` z polem `pub values: &'data [i32]` oraz funkcję `prefix_samples`. Funkcja ma przyjąć widok, `count: usize` i pożyczony token jednostkowy, a zwrócić `Option<Samples>` ze skróconym lifetime związanym z zakresem tokena. Dla `count == 0` zwróć pusty prefix, dla pełnej długości cały widok, a dla count większego niż długość `None`. Zachowaj oryginalny slice pointer; testy sprawdzą także generyczną konwersję z lifetime statycznego. Nie podajemy startera ani podpisu w edytorze.",
        solution: samplesSolution,
        tests: samplesTests,
        hints: [
          "Bezpieczny prefix mieści się w `0..=values.len()`; wynik jest pożyczką do tych samych danych.",
          "Oddziel lifetime danych od lifetime zewnętrznego tokena i dodaj relację `'data: 'short`.",
        ],
      }),
      choose(
        "variance-shared-recall",
        "recall",
        "Odtwórz granicę `T: 'static`",
        "Które zdanie jest prawdziwe o `T: 'static`?",
        2,
        [
          "Każda wartość T będzie przechowywana do końca programu",
          "Rust wydłuży lokalne Stringi, jeśli dodasz ten bound",
          "T nie zawiera referencji wymagającej krótszego życia niż `'static`; bound nie przedłuża właściciela",
        ],
        [
          "Bound nie jest obietnicą runtime przechowywania wartości.",
          "Lifetime nie wpływa na moment drop lokalnego właściciela.",
          "To warunek ważności pożyczek wewnątrz T, a nie mechanizm wycieku lub alokacji.",
        ],
      ),
    ],
    misconceptions: [
      "Skrócenie lifetime widoku przedłuża życie właściciela.",
      "Kowariancja jest dziedziczeniem znanym z klas.",
      "`T: 'static` oznacza, że każda wartość T żyje do końca programu.",
    ],
    transferTask:
      "Zaprojektuj własny borrowed record, który może przyjąć dłuższy widok i oddać bezpiecznie skróconą wersję, a następnie wskaż właściciela danych.",
    evidenceGate:
      "Publiczne Label i Samples przechodzą generyczne konwersje lifetime, zachowują pointer provenance oraz poprawnie obsługują puste, pełne i Unicode dane.",
    sourceIds: borrowedVarianceSources.map((source) => source.id),
  },
  {
    id: "variance-mutable-slots",
    moduleId: "borrowed-callbacks",
    conceptIds: ["variance-mutable-slots"],
    competencyIds: ["separate-mutable-loan-and-content"],
    prerequisites: ["variance-shared-views"],
    title: "Mutowalny slot i niezmienniczość typu",
    subtitle:
      "Oddzielisz krótką mutowalną pożyczkę od lifetime referencji przechowywanej w slocie.",
    minutes: 20,
    outcomes: [
      "Rozróżnisz kowariancję zewnętrznego lifetime `&mut` od inwariancji jego typu T.",
      "Zobaczysz prawdziwe odrzucenie przypisania, które mogłoby zostawić wygasłą referencję w slocie.",
      "Napiszesz API działające na lokalnych Stringach i przy kolejnych krótkich mutowalnych pożyczkach.",
    ],
    steps: [
      choose(
        "variance-mutable-predict",
        "predict",
        "Przewidź zapis do mutowalnego slotu",
        "Czy `&mut &'static str` można bezpiecznie potraktować jako `&mut &'short str`, aby zapisać dowolny krótki tekst?",
        1,
        [
          "Tak, bo każda referencja jest kowariantna w każdym miejscu",
          "Nie; zapis wymaga niezmiennego typu przechowywanej referencji",
          "Tak, ale tylko gdy tekst jest pusty",
        ],
        [
          "Kowariancja shared reference nie przenosi się przez pozycję, w której klient może zapisywać.",
          "Slot musi zachować jeden bezpieczny lifetime zawartości; inaczej mógłby przechować widok po wygaśnięciu źródła.",
          "Pusty tekst nie zmienia reguły ważności referencji.",
        ],
      ),
      discover(
        "variance-mutable-discover",
        "Zobacz rzeczywisty błąd przypisania",
        "Uruchom kod. rustc odrzuca przypisanie krótkiego `short` do slotu wymagającego `'static`. Komunikat nie ma stabilnego kodu E; zwróć uwagę na treść o lifetime i na linię przypisania.",
        String.raw`fn assign_short<'short>(slot: &mut &'static str, short: &'short str) {
    *slot = short;
}

fn main() {}
`,
        String.raw`fn assign_short<'short>(slot: &mut &'short str, short: &'short str) {
    *slot = short;
}

fn main() {}
`,
        "lifetime may not live long enough",
      ),
      run(
        "variance-mutable-run",
        "Zobacz dwa bezpieczne zapisy",
        "W `replace_label` lifetime danych `'data` jest wspólny dla starego i nowego widoku, lecz pożyczka `&mut slot` nie jest do niego przywiązana. Dzięki temu po wywołaniu można wykonać następną krótką pożyczkę.",
        String.raw`fn replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str {
    let old = *slot;
    *slot = next;
    old
}

fn main() {
    let mut slot = "pierwszy";
    let old = replace_label(&mut slot, "drugi");
    println!("{old} -> {slot}");
    let old = replace_label(&mut slot, "trzeci");
    println!("{old} -> {slot}");
}
`,
        "pierwszy -> drugi\ndrugi -> trzeci\n",
      ),
      choose(
        "variance-mutable-explain",
        "explain",
        "Rozdziel dwa lifetime",
        "Co powinno być niezależne w `replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str`?",
        0,
        [
          "Krótka pożyczka mut do slotu i lifetime przechowywanego tekstu",
          "Wszystkie lifetime, aby kompilator zawsze używał `'static`",
          "Tylko lifetime tokena, bo tekst nie ma własności",
        ],
        [
          "Zewnętrzna mutowalna pożyczka może kończyć się po każdym wywołaniu; referencja w slocie nadal ma ustalony `'data`.",
          "`'static` nie jest rozwiązaniem dla lokalnych tekstów i nie jest tu potrzebne.",
          "W tym API nie ma tokena; kluczowe jest rozdzielenie pożyczki slotu od zawartości.",
        ],
      ),
      coding({
        id: "variance-mutable-slots-gate",
        kind: "debug",
        title: "Napraw `replace_label`",
        prompt:
          "Zaimplementuj `replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str`. Funkcja ma zwrócić stary widok i zapisać `next`, bez alokacji i klonowania. Testy użyją Stringów należących do lokalnych właścicieli, pustych i takich samych wartości, sprawdzą tożsamość widoków i wykonają wiele krótkich mutowalnych pożyczek, a potem ponownie użyją slotu i właścicieli.",
        code: String.raw`pub fn replace_label<'data>(slot: &mut &'data str, _next: &'data str) -> &'data str {
    *slot
}
`,
        solution: String.raw`pub fn replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str {
    let old = *slot;
    *slot = next;
    old
}
`,
        tests: String.raw`#[test]
fn replaces_local_views_with_short_reborrows_and_preserves_pointers() {
    let first = String::from("pierwszy: żółć");
    let second = String::from("drugi");
    let third = String::new();
    let mut slot = first.as_str();
    let old = replace_label(&mut slot, second.as_str());
    assert_eq!(old, "pierwszy: żółć");
    assert_eq!(old.len(), first.len());
    assert_eq!(old.as_ptr(), first.as_ptr());
    assert_eq!(slot, second.as_str());
    assert_eq!(slot.len(), second.len());
    assert_eq!(slot.as_ptr(), second.as_ptr());
    let old = replace_label(&mut slot, third.as_str());
    assert_eq!(old, second.as_str());
    assert_eq!(old.len(), second.len());
    assert_eq!(old.as_ptr(), second.as_ptr());
    assert_eq!(slot, "");
    assert_eq!(slot.len(), third.len());
    assert_eq!(slot.as_ptr(), third.as_ptr());
    let old = replace_label(&mut slot, first.as_str());
    assert_eq!(old, "");
    assert_eq!(old.len(), third.len());
    assert_eq!(slot.as_ptr(), first.as_ptr());
    assert_eq!(slot, first.as_str());
    assert_eq!(slot.len(), first.len());
}

#[test]
fn repeated_same_value_replacement_is_still_a_real_write() {
    let owner = String::from("same");
    let mut slot = owner.as_str();
    let old = replace_label(&mut slot, owner.as_str());
    assert_eq!(old, owner.as_str());
    assert_eq!(old.len(), owner.len());
    assert_eq!(old.as_ptr(), owner.as_ptr());
    assert_eq!(slot, owner.as_str());
    assert_eq!(slot.len(), owner.len());
    assert_eq!(slot.as_ptr(), owner.as_ptr());
}
`,
        hints: [
          "Skopiuj referencję old przed zapisem; kopiujesz uchwyt, nie tekst.",
          "Podpis wiąże `next` i zawartość slotu z `'data`, ale lifetime `&mut` pozostaje inferowany osobno przy każdym wywołaniu.",
        ],
      }),
      coding({
        id: "variance-mutable-slots-blank",
        kind: "blank",
        title: "Zaprojektuj `replace_window` od pustej kartki",
        prompt:
          "Napisz `replace_window` dla mutowalnego slotu przechowującego `&'data [u8]`. Przyjmij slot, kandydacki wycinek bajtów oraz `start` i `end`; jeśli `start <= end <= candidate.len()`, zapisz `&candidate[start..end]` i zwróć `Some(previous)`. Dla zakresu pustego zapisz pusty widok, nadal zwracając poprzedni widok w Some. Jeśli indeksy są nieprawidłowe, zwróć `None` i pozostaw slot bez zmian. Zewnętrzna pożyczka slotu ma być niezależna od lifetime przechowywanych bajtów. Podpisu ani startera nie podajemy.",
        solution: String.raw`pub fn replace_window<'data, 'loan>(
    slot: &'loan mut &'data [u8],
    candidate: &'data [u8],
    start: usize,
    end: usize,
) -> Option<&'data [u8]> {
    if start > end || end > candidate.len() {
        return None;
    }
    let previous = *slot;
    *slot = &candidate[start..end];
    Some(previous)
}
`,
        tests: String.raw`#[test]
fn replaces_windows_with_exact_provenance_and_short_reborrows() {
    let source_owner = Vec::from(b"abcdef");
    let replacement_owner = Vec::from("ż".as_bytes());
    let source = source_owner.as_slice();
    let replacement = replacement_owner.as_slice();
    let mut slot: &[u8] = source;
    let old = replace_window(&mut slot, replacement, 0, replacement.len()).unwrap();
    assert_eq!(old, b"abcdef");
    assert_eq!(old.as_ptr(), source.as_ptr());
    assert_eq!(slot, replacement);
    assert_eq!(slot.as_ptr(), replacement.as_ptr());
    let old = replace_window(&mut slot, source, 2, 2).unwrap();
    assert_eq!(old.as_ptr(), replacement.as_ptr());
    assert_eq!(slot.len(), 0);
    assert_eq!(slot.as_ptr(), source[2..2].as_ptr());
}

#[test]
fn invalid_ranges_do_not_touch_the_slot() {
    let source_owner = Vec::from(b"abc");
    let candidate_owner = Vec::from(b"xyz");
    let source = source_owner.as_slice();
    let candidate = candidate_owner.as_slice();
    let mut slot: &[u8] = source;
    let previous = slot;
    assert!(replace_window(&mut slot, candidate, 2, 1).is_none());
    assert_eq!(slot, previous);
    assert_eq!(slot.as_ptr(), previous.as_ptr());
    assert_eq!(slot.len(), previous.len());
    assert!(replace_window(&mut slot, candidate, 0, 4).is_none());
    assert_eq!(slot, previous);
    assert_eq!(slot.as_ptr(), previous.as_ptr());
    assert_eq!(slot.len(), previous.len());
}
`,
        hints: [
          "Najpierw sprawdź oba warunki indeksów i dopiero potem zmieniaj slot.",
          "Kandydacki fragment ma lifetime danych `'data`; nazwij osobno lifetime zewnętrznego `&mut`.",
        ],
      }),
    ],
    misconceptions: [
      "Kowariancja współdzielonej referencji pozwala zapisać dowolną krótką referencję do mutowalnego slotu.",
      "Lifetime `&mut` musi być taki sam jak lifetime referencji przechowywanej w slocie.",
      "Błąd przypisania można naprawić boundem `'static` bez zmiany kontraktu danych.",
    ],
    transferTask:
      "Zaprojektuj funkcję wymieniającą element w mutowalnej pożyczce wycinka widoków i uzasadnij, dlaczego zewnętrzna pożyczka może być krótka, a `'data` pozostaje stałe.",
    evidenceGate:
      "`replace_label` i niezależny `replace_window` przechodzą testy lokalnych danych, wielu krótkich pożyczek, pochodzenia widoków, pustych zakresów oraz niezmienności po błędzie.",
    sourceIds: borrowedVarianceSources.map((source) => source.id),
  },
];

export const borrowedVarianceReviewExercises: Record<string, LessonStep> = {
  "variance-shared-views": coding({
    id: "review-variance-shared-views",
    kind: "apply",
    title: "Powtórka: podziel ramkę bez kopiowania",
    prompt:
      "Napisz `FrameSplit<'data>` z publicznymi polami `left: &'data [u8]` i `right: &'data [u8]` oraz `split_frame`. Funkcja przyjmuje borrowed input bytes, `offset` i borrowed unit token, zwraca `Option<FrameSplit>` skrócone do lifetime tokena, a offsety 0 i len są poprawne; offset większy niż len daje `None`. Oba widoki muszą wskazywać na oryginalne storage. Testy sprawdzą generyczną kowariancję `FrameSplit` i pointer obu pól.",
    solution: String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FrameSplit<'data> {
    pub left: &'data [u8],
    pub right: &'data [u8],
}

pub fn split_frame<'data: 'short, 'short>(
    input: &'data [u8],
    offset: usize,
    _token: &'short (),
) -> Option<FrameSplit<'short>> {
    if offset > input.len() {
        return None;
    }
    let (left, right) = input.split_at(offset);
    Some(FrameSplit { left, right })
}
`,
    code: String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FrameSplit<'data> {
    pub left: &'data [u8],
    pub right: &'data [u8],
}

pub fn split_frame<'data: 'short, 'short>(
    input: &'data [u8],
    offset: usize,
    _token: &'short (),
) -> Option<FrameSplit<'short>> {
    let (left, right) = input.split_at(offset);
    Some(FrameSplit { left, right })
}
`,
    tests: String.raw`#[test]
fn split_checks_bounds_and_original_storage() {
    fn covary<'long: 'short, 'short>(frame: FrameSplit<'long>) -> FrameSplit<'short> {
        frame
    }
    let input_owner = Vec::from(b"abcdef");
    let input = input_owner.as_slice();
    let token = ();
    let frame = split_frame(input, 2, &token).unwrap();
    assert_eq!(frame.left, b"ab");
    assert_eq!(frame.right, b"cdef");
    assert_eq!(frame.left.as_ptr(), input.as_ptr());
    assert_eq!(frame.right.as_ptr(), input[2..].as_ptr());
    let at_start = split_frame(input, 0, &token).unwrap();
    assert_eq!(at_start.left.len(), 0);
    assert_eq!(at_start.left.as_ptr(), input.as_ptr());
    assert_eq!(at_start.right, input);
    assert_eq!(at_start.right.as_ptr(), input.as_ptr());
    let at_end = split_frame(input, input.len(), &token).unwrap();
    assert_eq!(at_end.left, input);
    assert_eq!(at_end.left.as_ptr(), input.as_ptr());
    assert_eq!(at_end.right.len(), 0);
    assert_eq!(at_end.right.as_ptr(), input[input.len()..].as_ptr());
    assert!(split_frame(input, input.len() + 1, &token).is_none());
    let static_frame = FrameSplit {
        left: b"x",
        right: b"yz",
    };
    assert_eq!(covary(static_frame).right, b"yz");
}
`,
    hints: [
      "Sprawdź offset przed `split_at`; granice 0 i len nie są błędami.",
      "Zwróć oba podslice bez alokacji i nazwij osobno lifetime danych oraz tokena.",
    ],
  }),
  "variance-mutable-slots": coding({
    id: "review-variance-mutable-slots",
    kind: "apply",
    title: "Powtórka: wymień element borrowed slice",
    prompt:
      "Napisz `replace_at`, które przyjmuje mutowalnie pożyczony wycinek widoków tekstu `&mut [&'data str]`, indeks i `next: &'data str`. Dla poprawnego indeksu podmień wybrany widok i zwróć `Some(old)`; dla indeksu spoza wycinka zwróć `None` bez efektów. To API wycinka, bez wymagań właściwych wyłącznie dla Vec i bez zbędnych ograniczeń Copy/Clone. Czas zewnętrznej pożyczki ma pozostać niezależny od lifetime `'data`.",
    solution: String.raw`pub fn replace_at<'data>(
    slots: &mut [&'data str],
    index: usize,
    next: &'data str,
) -> Option<&'data str> {
    let slot = slots.get_mut(index)?;
    let old = *slot;
    *slot = next;
    Some(old)
}
`,
    code: String.raw`pub fn replace_at<'data>(
    slots: &mut [&'data str],
    _index: usize,
    _next: &'data str,
) -> Option<&'data str> {
    None
}
`,
    tests: String.raw`#[test]
fn replaces_valid_index_and_preserves_view_provenance() {
    let first = String::from("pierwszy");
    let second = String::from("drugi: żółć");
    let replacement = String::from("nowy");
    let mut slots = [first.as_str(), second.as_str()];
    let old = replace_at(&mut slots, 1, replacement.as_str()).unwrap();
    assert_eq!(old, "drugi: żółć");
    assert_eq!(old.len(), second.len());
    assert_eq!(old.as_ptr(), second.as_ptr());
    assert_eq!(slots[1], replacement.as_str());
    assert_eq!(slots[1].len(), replacement.len());
    assert_eq!(slots[1].as_ptr(), replacement.as_ptr());
    let old = replace_at(&mut slots, 0, "").unwrap();
    assert_eq!(old, first.as_str());
    assert_eq!(old.len(), first.len());
    assert_eq!(old.as_ptr(), first.as_ptr());
    assert_eq!(slots[0], "");
    assert_eq!(slots[0].len(), 0);
}

#[test]
fn invalid_index_has_no_effect_and_short_reborrows_repeat() {
    let owner = String::from("owner");
    let other = String::from("other");
    let mut slots = [owner.as_str()];
    let previous = slots[0];
    assert!(replace_at(&mut slots, 3, other.as_str()).is_none());
    assert_eq!(slots[0], previous);
    assert_eq!(slots[0].as_ptr(), previous.as_ptr());
    assert_eq!(slots[0].len(), previous.len());
    let _ = replace_at(&mut slots, 0, other.as_str());
    let _ = replace_at(&mut slots, 0, owner.as_str());
    assert_eq!(slots[0], owner.as_str());
    assert_eq!(slots[0].len(), owner.len());
    assert_eq!(slots[0].as_ptr(), owner.as_ptr());
}
`,
    hints: [
      "`get_mut` pozwala obsłużyć błędny indeks bez paniki.",
      "Najpierw zachowaj starą referencję, potem przypisz nową; nie potrzebujesz Vec ani boundów na tekst.",
    ],
  }),
};
