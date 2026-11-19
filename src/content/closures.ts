import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const closuresSources: Source[] = [
  {
    id: "closures-book-closures",
    title: "The Rust Programming Language: Closures",
    url: "https://doc.rust-lang.org/book/ch13-01-closures.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów przechwytywania, move lub inferencji typów closure.",
  },
  {
    id: "closures-book-capture-precision",
    title: "The Rust Reference: Closure Expressions",
    url: "https://doc.rust-lang.org/reference/expressions/closure-expr.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie reguł przechwytywania i semantyki edycji Rust 2024.",
  },
  {
    id: "closures-edition-2024-capture",
    title: "The Rust Edition Guide: Rust 2024 — Lifetime Capture Rules",
    url: "https://doc.rust-lang.org/edition-guide/rust-2024/rpit-lifetime-capture.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj wraz z przewodnikiem edycji przy zmianie przykładów impl Trait i capture semantics.",
  },
  {
    id: "closures-book-call-traits",
    title: "The Rust Programming Language: Closure Traits",
    url: "https://doc.rust-lang.org/book/ch13-01-closures.html#capturing-references-or-moving-ownership",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie rozróżnienia Fn, FnMut i FnOnce oraz przykładów callbacków.",
  },
  {
    id: "closures-reference-traits",
    title: "The Rust Reference: Call Traits and Closure Types",
    url: "https://doc.rust-lang.org/reference/types/closure.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji szczegółów typów closure i implementowanych call traits.",
  },
  {
    id: "closures-book-impl-trait",
    title: "The Rust Programming Language: Returning Closures",
    url: "https://doc.rust-lang.org/book/ch20-04-advanced-functions-and-closures.html#returning-closures",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładu zwracania closure przez impl Fn.",
  },
  ...["E0502", "E0382", "E0596", "E0501", "E0373"].map((code): Source => ({
    id: `closures-error-${code.toLowerCase()}`,
    title: `Rust Error Index: ${code}`,
    url: `https://doc.rust-lang.org/error_codes/${code}.html`,
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty kod diagnostyki lokalnym rustc po zmianie przykładu.",
  })),
];

export const closuresCompetencies: Competency[] = [
  {
    id: "design-closure-capture",
    title:
      "Przewidujesz, co closure przechwytuje przez odczyt, mutację lub move, i naprawiasz konflikt pożyczek.",
  },
  {
    id: "classify-closure-call",
    title:
      "Rozpoznajesz minimalny call trait closure na podstawie tego, co robi przy wywołaniu.",
  },
  {
    id: "design-callback-contract",
    title:
      "Projektujesz callback z minimalnym Fn, FnMut lub FnOnce i zwracasz closure przez impl Trait.",
  },
];

export const closuresConcepts: Concept[] = [
  {
    id: "closure-capture-modes",
    title: "Tryb przechwycenia: odczyt, mutacja i move",
    prerequisites: ["lifetime-contracts"],
    competencyIds: ["design-closure-capture"],
    reviewPrompt:
      "Co wyznacza, czy closure pożyczy wartość współdzielnie, mutowalnie, czy przejmie ją przez move?",
    reviewAnswer:
      "Decyduje sposób użycia przechwyconej wartości w ciele closure: sam odczyt potrzebuje &T, zmiana potrzebuje &mut T, a przeniesienie wartości poza closure potrzebuje własności. Słowo move wymusza przejęcie capture z otoczenia, ale nie oznacza samo w sobie FnOnce.",
    distinguish:
      "move opisuje sposób wejścia danych do closure, a Fn/FnMut/FnOnce opisują, co closure może zrobić podczas wywołania.",
  },
  {
    id: "closure-call-modes",
    title: "Fn, FnMut i FnOnce wynikają z ciała closure",
    prerequisites: ["closure-capture-modes"],
    competencyIds: ["classify-closure-call"],
    reviewPrompt:
      'Dlaczego move || println!("{label}") może być wywołane dwa razy, a move || payload może tylko raz?',
    reviewAnswer:
      "Pierwsza closure posiada label, lecz tylko pożycza go przez odczyt przy każdym wywołaniu, więc implementuje Fn. Druga przy wywołaniu przenosi payload z własnego środka, więc implementuje wyłącznie FnOnce.",
    distinguish:
      "FnOnce jest najszerszym faktycznym opisem możliwości wywołania; FnMut i Fn są coraz silniejszymi kontraktami, a nie trzema ręcznie wybieranymi trybami przechwycenia.",
  },
  {
    id: "callable-contracts",
    title: "Minimalny kontrakt callbacku i impl Fn",
    prerequisites: ["closure-call-modes"],
    competencyIds: ["design-callback-contract"],
    reviewPrompt:
      "Jaki kontrakt przyjmie funkcja, która wywołuje callback wiele razy, ale callback może aktualizować własny stan?",
    reviewAnswer:
      "Przyjmie F: FnMut(argument) -> wynik, a parametr trzeba przekazywać jako mut F. FnMut dopuszcza wielokrotne wywołania i wewnętrzną mutację; wybór FnOnce byłby zbyt słaby, a Fn zbyt silny dla callbacku zmieniającego stan.",
    distinguish:
      "Minimalny bound wynika z operacji konsumenta. `move` w zwracanym closure może przejąć factor na własność, podczas gdy `impl Fn(...)` opisuje sposób jego wywoływania.",
  },
];

function choice(
  id: string,
  kind: "predict" | "recall" | "explain",
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
  code?: string;
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
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    ...(options.error
      ? {
          expectedStatus: "compile-error" as const,
          expectedError: options.error,
        }
      : {}),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const captureRun = `fn main() {
    let city = String::from("Łódź");
    let show = || println!("miasto: {}", city);
    show();
    println!("po wywołaniu: {}", city);
}`;

const borrowConflict = `fn main() {
    let mut message = String::from("start");
    let inspect = || println!("odczyt: {}", message);
    let snapshot = &message;
    message.push('!');
    println!("snapshot: {}", snapshot);
    inspect();
}`;

const borrowConflictSolution = `fn main() {
    let mut message = String::from("start");
    {
        let inspect = || println!("odczyt: {}", message);
        inspect();
    }
    message.push('!');
    println!("po zmianie: {}", message);
}`;

const mutCaptureError = `fn main() {
    let mut total = 0;
    let add = |value| total += value;
    add(2);
    add(3);
    println!("{}", total);
}`;

const mutCaptureRepair = `fn main() {
    let mut total = 0;
    let mut add = |value| total += value;
    add(2);
    add(3);
    println!("{}", total);
}`;

const captureGateSolution = `fn record_lengths<'a>(items: &'a [&'a str], offset: usize, output: &mut Vec<usize>) {
    let mut record = |text: &'a str| output.push(text.len() + offset);
    for item in items {
        record(item);
    }
}`;

const captureGateStarter = captureGateSolution.replace(
  "let mut record = |text: &'a str| output.push(text.len() + offset);",
  "let record = |text: &'a str| output.push(text.len() + offset);",
);

const captureGateTests = `#[test]
fn mutable_capture_records_all_lengths_and_order() {
    let refs = ["", "żółć", "Rust"];
    let mut lengths = Vec::new();
    record_lengths(&refs, 0, &mut lengths);
    assert_eq!(lengths, vec![0, 8, 4]);
    assert_eq!(refs, ["", "żółć", "Rust"]);
    let mut shifted = Vec::new();
    record_lengths(&refs, 2, &mut shifted);
    assert_eq!(shifted, vec![2, 10, 6]);
    let empty: [&str; 0] = [];
    let mut no_lengths = Vec::new();
    record_lengths(&empty, 9, &mut no_lengths);
    assert!(no_lengths.is_empty());
}

#[test]
fn recorder_appends_across_repeated_and_empty_calls() {
    let mut output = vec![91, 17];
    record_lengths(&["Rust", "żółć"], 2, &mut output);
    assert_eq!(output, vec![91, 17, 6, 10]);
    record_lengths(&[], 9, &mut output);
    assert_eq!(output, vec![91, 17, 6, 10]);
    record_lengths(&["", "🙂"], 1, &mut output);
    assert_eq!(output, vec![91, 17, 6, 10, 1, 5]);
}`;

const captureSharedSolution = `fn save_view<'a>(text: &'a str, output: &mut Vec<&'a str>) -> usize {
    let before = output.len();
    let mut save = || output.push(text);
    save();
    before
}`;
const captureSharedStarter = `fn save_view<'a>(text: &'a str, output: &mut Vec<&'a str>) -> usize {
    let mut save = || output.push(text);
    let before = output.len();
    save();
    before
}`;
const captureSharedTests = `#[test]
fn shared_capture_keeps_views_and_counts_before_appending() {
    let text = String::from("żółć");
    let mut views = vec!["wcześniej"];
    assert_eq!(save_view(&text, &mut views), 1);
    assert_eq!(views, vec!["wcześniej", "żółć"]);
    assert_eq!(views[1].as_ptr(), text.as_ptr());
    assert_eq!(text, "żółć");
    let empty = String::new();
    let mut empty_views = Vec::new();
    assert_eq!(save_view(&empty, &mut empty_views), 0);
    assert_eq!(empty_views, vec![""]);
}`;

const ownershipRun = `fn main() {
    let label = String::from("plik");
    let repeat = move || println!("{}", label);
    repeat();
    repeat();
}`;

const onceRun = `fn main() {
    let payload = String::from("jednorazowy");
    let consume = move || payload;
    println!("{}", consume());
}`;

const onceError = `fn main() {
    let payload = String::from("jednorazowy");
    let consume = move || payload;
    println!("{}", consume());
    println!("{}", consume());
}`;

const onceRepair = onceError.replace(
  '    println!("{}", consume());\n    println!("{}", consume());',
  '    println!("{}", consume());',
);

const ownershipGateSolution = `fn collect_marks<F>(values: &[i32], mut callback: F) -> Vec<i32>
where
    F: FnMut(i32) -> i32,
{
    let mut marks = Vec::new();
    for value in values {
        marks.push(callback(*value));
    }
    marks
}`;

const ownershipGateStarter = `fn collect_marks<F>(values: &[i32], callback: F) -> Vec<i32>
where
    F: FnOnce(i32) -> i32,
{
    let mut marks = Vec::new();
    for value in values {
        marks.push(callback(*value));
    }
    marks
}`;

const ownershipGateTests = `#[test]
fn move_closure_can_repeat_when_it_does_not_consume_capture() {
    let values = [-2, 0, 3];
    let mut seen = Vec::new();
    let marks = collect_marks(&values, |value| {
        seen.push(value);
        value * 2
    });
    assert_eq!(marks, vec![-4, 0, 6]);
    assert_eq!(seen, values);
    assert_eq!(values, [-2, 0, 3]);
    let empty: [i32; 0] = [];
    let mut calls = 0;
    let no_marks = collect_marks(&empty, |value| {
        calls += 1;
        value
    });
    assert!(no_marks.is_empty());
    assert_eq!(calls, 0);
}`;

const ownershipOnceSolution = `fn consume_with<F, T>(action: F) -> T
where
    F: FnOnce() -> T,
{
    action()
}`;

const ownershipOnceStarter = `fn consume_with<F, T>(action: F) -> T
where
    F: Fn() -> T,
{
    action()
}`;

const ownershipOnceTests = `struct Payload { text: String }
#[test]
fn once_contract_consumes_non_clone_payload_exactly_once() {
    let payload = Payload { text: String::from("ładunek") };
    let received = consume_with(move || payload);
    assert_eq!(received.text, "ładunek");
    let empty: Payload = consume_with(|| Payload { text: String::new() });
    assert!(empty.text.is_empty());
}`;

const contractsRun = `fn apply_three_times<F>(mut callback: F, start: i32) -> i32
where
    F: FnMut(i32) -> i32,
{
    let mut value = start;
    for _ in 0..3 {
        value = callback(value);
    }
    value
}

fn main() {
    let mut calls = 0;
    let result = apply_three_times(
        |value| {
            calls += 1;
            value + 2
        },
        1,
    );
    println!("wynik: {}, wywołania: {}", result, calls);
}`;

const contractsBlankSolution = `fn run_pipeline<F>(inputs: &[i32], mut callback: F) -> Vec<i32>
where
    F: FnMut(i32) -> i32,
{
    let mut output = Vec::new();
    for input in inputs {
        output.push(callback(*input));
    }
    output
}

fn main() {
    let mut calls = 0;
    let output = run_pipeline(&[1, 2, 3], |value| {
        calls += 1;
        value * 2
    });
    println!("{:?} {}", output, calls);
}`;

const contractsBlankTests = `#[test]
fn pipeline_preserves_order_calls_every_input_and_handles_empty() {
    let mut calls = 0;
    let output = run_pipeline(&[-2, 0, 3], |value| {
        calls += 1;
        value * value
    });
    assert_eq!(output, vec![4, 0, 9]);
    assert_eq!(calls, 3);
    let empty: [i32; 0] = [];
    let mut empty_calls = 0;
    let no_output = run_pipeline(&empty, |value| {
        empty_calls += 1;
        value
    });
    assert!(no_output.is_empty());
    assert_eq!(empty_calls, 0);
}`;

const returnedSolution = `fn multiplier(factor: i32) -> impl Fn(i32) -> i32 {
    move |value| value * factor
}`;

const returnedStarter = `fn multiplier(factor: i32) -> impl Fn(i32) -> i32 {
    |value| value * factor
}`;

const returnedTests = `#[test]
fn returned_closure_owns_factor_and_is_repeatable() {
    let triple = multiplier(3);
    assert_eq!(triple(-2), -6);
    assert_eq!(triple(0), 0);
    assert_eq!(triple(4), 12);
    let zero = multiplier(0);
    assert_eq!(zero(99), 0);
    assert_eq!(zero(-7), 0);
}`;

const contractsReviewSolution = `fn call_twice<F>(mut callback: F, first: i32, second: i32) -> (i32, i32)
where
    F: FnMut(i32) -> i32,
{
    (callback(first), callback(second))
}`;

export const closuresLessons: Lesson[] = [
  {
    id: "closure-captures",
    moduleId: "closures",
    conceptIds: ["closure-capture-modes"],
    competencyIds: ["design-closure-capture"],
    prerequisites: ["lifetime-api"],
    title: "Closure widzi dane z otoczenia",
    subtitle:
      "Najpierw zobacz, co pożyczka closure robi z nazwą spoza parametrów",
    minutes: 18,
    outcomes: [
      "Rozpoznasz przechwycenie przez odczyt i mutację.",
      "Odczytasz E0502 i E0596 oraz poprawisz kolejność lub mutowalność.",
      "Wyjaśnisz, dlaczego move dotyczy wejścia do closure.",
    ],
    steps: [
      {
        ...choice(
          "capture-predict",
          "predict",
          "Przewiduj przechwycenie",
          "Closure nie ma parametru city. Co wypisze program i czy city pozostanie użyteczne po wywołaniu?",
          [
            "miasto: Łódź, potem po wywołaniu: Łódź",
            "Błąd, bo closure musi zawsze dostać city jako parametr",
            "Tylko miasto: Łódź; city znika po utworzeniu closure",
          ],
          0,
          [
            "Closure pożycza city do odczytu, więc wywołanie nie konsumuje właściciela.",
            "Closure może przechwycić nazwę z otoczenia; parametr nie jest wymagany.",
            "Samo przechwycenie nie usuwa właściciela String.",
          ],
        ),
        code: captureRun,
        solution: captureRun,
        expectedStatus: "success",
      },
      run(
        "capture-run",
        "Uruchom odczyt",
        "Uruchom kod i porównaj wynik z przewidywaniem.",
        captureRun,
        "miasto: Łódź\npo wywołaniu: Łódź\n",
      ),
      compilerError(
        "capture-conflict",
        "Zobacz konflikt E0502",
        "Spróbuj skompilować kod. Closure utrzymuje pożyczkę współdzieloną, zanim message chce być zmienione. Wskaż moment konfliktu.",
        borrowConflict,
        borrowConflictSolution,
        "E0502",
      ),
      compilerError(
        "capture-mut-call",
        "Zobacz E0596 przy mutacji capture",
        "Closure zmienia total, więc jej wywołanie wymaga mutowalnego wiązania. Ten krok zalicza obserwacja E0596. W następnym, edytowalnym zadaniu „Napraw recorder” (capture-gate) naprawisz to samo wymaganie mutowalnego wiązania i sprawdzisz poprawkę testami.",
        mutCaptureError,
        mutCaptureRepair,
        "E0596",
      ),
      exercise({
        id: "capture-gate",
        kind: "debug",
        title: "Napraw recorder",
        prompt:
          "Napraw starter. `record_lengths` ma przejść po pożyczonym wycinku i dopisać do output długość każdego tekstu powiększoną o offset, w tej samej kolejności; działa także dla pustego wejścia. Długość oznacza liczbę bajtów UTF-8 (`str::len`). Dziedzina obejmuje wejścia, dla których każda suma długości i offset mieści się w usize. Nie zmieniaj API ani nie klonuj tekstów.",
        code: captureGateStarter,
        solution: captureGateSolution,
        tests: captureGateTests,
        hints: [
          "Closure musi przechwycić offset do odczytu oraz output do mutacji.",
          "Wiązanie closure musi pozwalać na wywołanie FnMut; pożyczone elementy pozostają tylko odczytywane.",
        ],
        gate: true,
        error: "E0596",
      }),
      exercise({
        id: "capture-shared-gate",
        kind: "modify",
        title: "Napraw zapis widoku",
        prompt:
          "Napraw `save_view`. Closure ma dopisać pożyczony widok text do output, zachowując wcześniejsze elementy. Funkcja zwraca liczbę elementów sprzed dopisania. Napraw konflikt między odczytem długości a przechwyceniem output; bez klonowania i zmiany podpisu.",
        code: captureSharedStarter,
        solution: captureSharedSolution,
        tests: captureSharedTests,
        hints: [
          "Sprawdź, kiedy closure zaczyna pożyczać output i kiedy potrzebujesz jego długości.",
          "Odczyt długości powinien skończyć się przed utworzeniem mutowalnej pożyczki przechowywanej przez closure.",
        ],
        gate: true,
        error: "E0501",
      }),
      choice(
        "capture-recall",
        "recall",
        "Oddziel move od FnOnce",
        "Które zdanie najlepiej opisuje `move` w closure?",
        [
          "Zawsze sprawia, że closure można wywołać tylko raz.",
          "Wymusza przejęcie przechwytywanych wartości z otoczenia; call trait zależy nadal od ciała.",
          "Zawsze kopiuje wszystkie przechwycone wartości.",
        ],
        1,
        [
          "Move nie mówi jeszcze, czy ciało zużyje capture przy wywołaniu.",
          "To rozdzielenie jest kluczowe: własność capture i możliwość wywołania to dwa pytania.",
          "Wartości niekopiowalne mogą być przejęte bez kopiowania.",
        ],
      ),
    ],
    misconceptions: [
      "Closure zawsze kopiuje nazwę z zewnętrznego zakresu.",
      "move oznacza automatycznie FnOnce-only.",
      "mut na przechwyconej wartości zastępuje mut na wiązaniu closure.",
    ],
    transferTask:
      "Napisz własne closure, które pożycza String do odczytu, a następnie drugie, które mutuje licznik; przewidź ich wymagania przed kompilacją.",
    evidenceGate:
      "Napraw record_lengths bez zmiany API, przechwytując offset i mutując output w kolejności także dla pustego wejścia.",
    sourceIds: [
      "closures-book-closures",
      "closures-reference-traits",
      "closures-error-e0502",
      "closures-error-e0596",
      "closures-error-e0501",
      "closures-edition-2024-capture",
    ],
  },
  {
    id: "closure-ownership",
    moduleId: "closures",
    conceptIds: ["closure-call-modes"],
    competencyIds: ["classify-closure-call"],
    prerequisites: ["closure-captures"],
    title: "move closure nadal może być powtarzalne",
    subtitle:
      "Własność przejętego capture i sposób jego zużycia to dwa różne pytania",
    minutes: 18,
    outcomes: [
      "Rozróżnisz przejęcie capture przez move od konsumowania go przy wywołaniu.",
      "Rozpoznasz Fn, FnMut i FnOnce z operacji wykonywanej w ciele.",
      "Przetestujesz jednokrotne zużycie nieklonowalnego payloadu.",
    ],
    steps: [
      choice(
        "ownership-predict",
        "predict",
        "Czy move oznacza raz?",
        'W `move || println!("{}", label)` label jest String. Czy repeat można wywołać dwa razy?',
        [
          "Tak, bo każde wywołanie tylko czyta posiadany String.",
          "Nie, każda closure z move to FnOnce.",
          "Tak, ale tylko dlatego, że String implementuje Copy.",
        ],
        0,
        [
          "Closure posiada label, lecz println pożycza go przy każdym wywołaniu; to może być Fn.",
          "Move i zużycie capture przy call są niezależne.",
          "String nie implementuje Copy; powód leży w sposobie użycia capture.",
        ],
      ),
      run(
        "ownership-repeat-run",
        "Powtórz closure z move",
        "Uruchom kod. Zwróć uwagę, że String nie jest kopiowany, a closure działa dwa razy.",
        ownershipRun,
        "plik\nplik\n",
      ),
      run(
        "ownership-once-run",
        "Zużyj payload raz",
        "Teraz closure oddaje payload poza swoje ciało. Uruchom jednokrotne wywołanie.",
        onceRun,
        "jednorazowy\n",
      ),
      compilerError(
        "ownership-once-error",
        "Zobacz E0382 po drugim wywołaniu",
        "Drugie wywołanie próbuje zabrać ten sam payload z wnętrza closure. Potwierdź rzeczywistą diagnostykę.",
        onceError,
        onceRepair,
        "E0382",
      ),
      exercise({
        id: "ownership-gate",
        kind: "debug",
        title: "Napraw powtarzalny marker",
        prompt:
          "Napraw `collect_marks`. Funkcja ma wywołać callback dla każdego elementu values i zwrócić wyniki w tej samej kolejności, również dla pustego wejścia. Callback może mutować własny stan, więc dobierz kontrakt dopuszczający powtórne wywołania. Testy sprawdzają wartości ujemne, zero, kolejność i liczbę wywołań.",
        code: ownershipGateStarter,
        solution: ownershipGateSolution,
        tests: ownershipGateTests,
        hints: [
          "Starter obiecuje callbackowi tylko jedno wywołanie, choć pętla używa go ponownie.",
          "Zmień parametr na mutowalny i wybierz FnMut(i32) -> i32; wynik zapisuj po każdym wywołaniu.",
        ],
        gate: true,
        error: "E0382",
      }),
      exercise({
        id: "ownership-once-gate",
        kind: "apply",
        title: "Przekaż jednorazowy payload",
        prompt:
          "Rozluźnij kontrakt `consume_with`: funkcja wywołuje callback dokładnie raz i oddaje otrzymaną wartość dowolnego T. Musi przyjąć również closure, które oddaje posiadany ładunek bez Clone. Dobierz minimalny call trait; nie dodawaj ograniczeń do T.",
        code: ownershipOnceStarter,
        solution: ownershipOnceSolution,
        tests: ownershipOnceTests,
        hints: [
          "Porównaj liczbę wywołań w ciele z wymaganiem stawianym callbackowi.",
          "Jedno wywołanie potrzebuje tylko FnOnce; ten kontrakt dopuszcza przeniesienie T z wnętrza closure.",
        ],
        gate: true,
      }),
      choice(
        "ownership-recall",
        "recall",
        "Klasyfikuj call trait",
        "Która operacja sprawia, że closure implementuje wyłącznie FnOnce?",
        [
          "Odczyt capture przez println! bez przenoszenia.",
          "Zmiana licznikowego capture bez oddawania go na zewnątrz.",
          "Przeniesienie niekopiowalnego capture poza ciało closure przy wywołaniu.",
        ],
        2,
        [
          "Sam odczyt pozwala na Fn.",
          "Mutacja stanu wymaga FnMut, które nadal może być wywołane ponownie.",
          "Oddanie String z closure zużywa jej zawartość, więc pozostaje FnOnce.",
        ],
      ),
    ],
    misconceptions: [
      "move oznacza jednorazowe wywołanie niezależnie od ciała.",
      "String musi być sklonowany, aby move closure mogło działać drugi raz.",
      "FnOnce opisuje sposób przechwycenia, a nie operację w ciele.",
    ],
    transferTask:
      "Zbuduj move closure posiadające napis i wywołaj je dwa razy przez odczyt, a następnie osobne FnOnce oddające ten napis.",
    evidenceGate:
      "Napraw collect_marks, dobierając FnMut do wielokrotnych wywołań i zachowując kolejność oraz pusty przypadek.",
    sourceIds: [
      "closures-book-closures",
      "closures-book-call-traits",
      "closures-error-e0382",
      "closures-reference-traits",
    ],
  },
  {
    id: "closure-contracts",
    moduleId: "closures",
    conceptIds: ["callable-contracts"],
    competencyIds: ["design-callback-contract"],
    prerequisites: ["closure-ownership"],
    title: "Callback dostaje minimalny kontrakt",
    subtitle: "Projektuj API według tego, co konsument naprawdę robi z closure",
    minutes: 20,
    outcomes: [
      "Dobierzesz Fn, FnMut lub FnOnce do liczby wywołań i mutacji.",
      "Napiszesz callback API zachowujące kolejność, liczbę wywołań i pusty przypadek.",
      "Zwrócisz powtarzalne closure przez jawne `impl Fn`.",
    ],
    steps: [
      choice(
        "contracts-predict",
        "predict",
        "Najmniejszy kontrakt",
        "apply_three_times wywołuje callback trzy razy, a callback zwiększa calls. Który bound jest potrzebny?",
        [
          "Fn(i32) -> i32, bo każdy callback powinien być niemutowalny",
          "FnMut(i32) -> i32, bo callback zmienia własny stan i jest wywoływany wiele razy",
          "FnOnce(i32) -> i32, bo każdy callback może działać tylko raz",
        ],
        1,
        [
          "Fn byłby zbyt silny: callback nie może zmieniać calls przez &self.",
          "FnMut dokładnie opisuje wielokrotne wywołanie z wewnętrzną mutacją.",
          "FnOnce byłby zbyt słabą obietnicą dla trzech wywołań.",
        ],
      ),
      run(
        "contracts-run",
        "Uruchom kontrakt FnMut",
        "Uruchom gotową funkcję i odczytaj wynik oraz liczbę callbacków.",
        contractsRun,
        "wynik: 7, wywołania: 3\n",
      ),
      choice(
        "contracts-impl-explain",
        "explain",
        "Nazwij zwracany typ",
        "Dlaczego `fn multiplier(factor: i32) -> impl Fn(i32) -> i32` może zwrócić closure, mimo że typ closure jest anonimowy?",
        [
          "impl Fn opisuje wymagany sposób wywołania, a kompilator ukrywa konkretny typ closure za tym kontraktem.",
          "impl Fn zamienia closure w trait object i zawsze włącza dynamiczną wysyłkę.",
          "Każde closure ma zawsze dokładnie typ Fn, więc impl jest tylko komentarzem.",
        ],
        0,
        [
          "`impl Trait` pozwala zwrócić konkretny, anonimowy typ z publicznym kontraktem Fn.",
          "`impl Trait` nie oznacza automatycznie dyn ani dynamicznej wysyłki.",
          "Closure może implementować FnMut lub FnOnce; call trait wynika z ciała.",
        ],
      ),
      exercise({
        id: "contracts-pipeline-gate",
        kind: "blank",
        title: "Zbuduj pipeline od pustej kartki",
        prompt:
          "Od pustej kartki napisz funkcję `run_pipeline`, która dostaje pożyczony slice liczb i callback transformujący każdą liczbę i32. Ma zwrócić nowy Vec<i32> w tej samej kolejności, wywołać callback dokładnie raz na element i nie wywoływać go dla pustego wejścia. Callback może mutować własny licznik; API opisz przez minimalny kontrakt callbacku. Dodaj main pokazujący działanie.",
        solution: contractsBlankSolution,
        tests: contractsBlankTests,
        hints: [
          "Konsument wielokrotnie wywołuje callback i przekazuje mu po jednej wartości z pożyczonego wejścia.",
          "Potrzebujesz FnMut oraz mutowalnego parametru callbacku; wynik buduj przez push w kolejności wejścia.",
        ],
        gate: true,
      }),
      exercise({
        id: "contracts-returned-gate",
        kind: "modify",
        title: "Zwróć closure przez impl Fn",
        prompt:
          "Dokończ multiplier. Funkcja ma przejąć factor do zwracanego closure, ale wynik ma być powtarzalny i działać dla liczb ujemnych, zera oraz kolejnych wywołań. Dziedzina obejmuje argumenty, dla których iloczyn factor * value mieści się w i32; przepełnienie jest poza kontraktem tego ćwiczenia. Użyj jawnego `impl Fn(i32) -> i32`; nie zmieniaj API.",
        code: returnedStarter,
        solution: returnedSolution,
        tests: returnedTests,
        hints: [
          "Zwracasz closure, więc typ wyniku musi opisywać jego callable contract.",
          "Przechwyć factor przez move i zwróć factor * value; ciało tylko odczytuje capture, więc Fn wystarczy.",
        ],
        gate: true,
        error: "E0373",
      }),
      choice(
        "contracts-recall",
        "recall",
        "Nie zaostrzaj API",
        "Dlaczego funkcja wykonująca callback raz może przyjąć FnOnce zamiast FnMut?",
        [
          "FnOnce zawsze szybciej działa.",
          "Konsument obiecuje tylko jedno wywołanie, więc nie potrzebuje możliwości ponownego wywołania ani mutacji callbacku.",
          "FnOnce automatycznie klonuje callback.",
        ],
        1,
        [
          "Call trait nie jest obietnicą wydajności.",
          "Kontrakt powinien obiecywać dokładnie operacje konsumenta; FnOnce dopuszcza także closure konsumujące dane.",
          "FnOnce nie wykonuje niejawnego klonowania.",
        ],
      ),
    ],
    misconceptions: [
      "Każdy callback API powinien używać Fn, bo to najbardziej restrykcyjny typ.",
      "FnMut nie może przyjąć closure z move.",
      "impl Fn ukrywa typ, więc nie mówi nic o liczbie możliwych wywołań.",
    ],
    transferTask:
      "Zaprojektuj dwa małe API: jedno jednokrotnie konsumujące callback, drugie wielokrotnie wywołujące callback z mutowanym licznikiem; uzasadnij każdy minimalny bound.",
    evidenceGate:
      "Pipeline zachowuje kolejność i liczbę wywołań dla niepustych, granicznych oraz pustych danych, a multiplier oddaje repeatable impl Fn.",
    sourceIds: [
      "closures-book-call-traits",
      "closures-reference-traits",
      "closures-book-impl-trait",
      "closures-error-e0373",
    ],
  },
];

export const closuresReviewExercises: Record<string, LessonStep> = {
  "closure-capture-modes": exercise({
    id: "review-closure-capture",
    kind: "modify",
    title: "Powtórka: zanotuj zdarzenia",
    prompt:
      "Napraw `mark_events`. Closure ma dopisać `value + offset` do logu dla każdego elementu, w kolejności. offset jest przejęty przez move, log jest mutowany, a wejście pozostaje pożyczone. Zachowaj API i obsłuż puste wejście. Dziedzina obejmuje wejścia, dla których każda suma value + offset mieści się w i32.",
    code: `fn mark_events(values: &[i32], offset: i32, log: &mut Vec<i32>) {
    let add = move |value: i32| log.push(value + offset);
    for value in values { add(*value); }
}`,
    solution: `fn mark_events(values: &[i32], offset: i32, log: &mut Vec<i32>) {
    let mut add = move |value: i32| log.push(value + offset);
    for value in values { add(*value); }
}`,
    tests: `#[test]
fn capture_modes_keep_offset_and_append_in_order() {
    let values = [-2, 0, 5];
    let mut log = vec![100];
    mark_events(&values, 3, &mut log);
    assert_eq!(log, vec![100, 1, 3, 8]);
    assert_eq!(values, [-2, 0, 5]);
    let mut empty = Vec::new();
    mark_events(&[], -7, &mut empty);
    assert!(empty.is_empty());
}

#[test]
fn captures_zero_and_negative_offsets_without_losing_previous_events() {
    let mut log = vec![9];
    mark_events(&[i32::MIN, 0, i32::MAX], 0, &mut log);
    assert_eq!(log, vec![9, i32::MIN, 0, i32::MAX]);
    mark_events(&[i32::MIN + 1, 1, i32::MAX], -1, &mut log);
    assert_eq!(log, vec![9, i32::MIN, 0, i32::MAX, i32::MIN, 0, i32::MAX - 1]);
    mark_events(&[], i32::MAX, &mut log);
    assert_eq!(log, vec![9, i32::MIN, 0, i32::MAX, i32::MIN, 0, i32::MAX - 1]);
}`,
    error: "E0596",
    hints: [
      "Closure ma dwa różne capture: offset tylko czyta, a log zmienia.",
      "Wiązanie closure musi być mutowalne, bo wywołujesz FnMut więcej niż raz.",
    ],
  }),
  "closure-call-modes": exercise({
    id: "review-closure-call",
    kind: "apply",
    title: "Powtórka: policz wywołania",
    prompt:
      "Dokończ `run_counted`. Funkcja ma wywołać callback na każdym elemencie slice, dopisać wynik do Vec i zwrócić go razem z liczbą wywołań. Callback może mutować calls. Zachowaj kolejność, dane wejściowe i przypadek pusty.",
    code: `fn run_counted<F>(values: &[i32], mut callback: F) -> (Vec<i32>, usize)
where
    F: Fn(i32) -> i32,
{
    (Vec::new(), 0)
}`,
    solution: `fn run_counted<F>(values: &[i32], mut callback: F) -> (Vec<i32>, usize)
where
    F: FnMut(i32) -> i32,
{
    let mut output = Vec::new();
    let mut calls = 0;
    for value in values {
        output.push(callback(*value));
        calls += 1;
    }
    (output, calls)
}`,
    tests: `#[test]
fn call_contract_counts_order_and_empty_without_copying_input() {
    let values = [-3, 0, 4];
    let mut seen = Vec::new();
    let (output, calls) = run_counted(&values, |value| {
        seen.push(value);
        value * 2
    });
    assert_eq!(output, vec![-6, 0, 8]);
    assert_eq!(calls, 3);
    assert_eq!(seen, values);
    let empty: [i32; 0] = [];
    let (nothing, zero) = run_counted(&empty, |value| value);
    assert!(nothing.is_empty());
    assert_eq!(zero, 0);
}`,
    hints: [
      "Licznik zwiększaj dokładnie w tej samej pętli, w której wywołujesz callback.",
      "Przekaż *value, zachowaj mut callback i zwróć zbudowany Vec oraz calls po pętli.",
    ],
  }),
  "callable-contracts": exercise({
    id: "review-callable-contract",
    kind: "modify",
    title: "Powtórka: dwie wartości przez callback",
    prompt:
      "Napraw `call_twice`, aby zwracało wyniki callbacku dla first i second w tej kolejności. Callback może zwiększać własny licznik, więc nie zaostrzaj kontraktu do Fn. Testy użyją również callbacku przejmującego dane pomocnicze bez Clone.",
    code: `${contractsReviewSolution
      .replace("(callback(first), callback(second))", "(first, second)")
      .replace("F: FnMut(i32) -> i32", "F: Fn(i32) -> i32")}`,
    solution: contractsReviewSolution,
    tests: `#[test]
fn callback_contract_runs_twice_in_order() {
    let mut seen = Vec::new();
    let result = call_twice(|value| { seen.push(value); value + 10 }, -2, 5);
    assert_eq!(result, (8, 15));
    assert_eq!(seen, vec![-2, 5]);
    struct Context { text: String }
    let context = Context { text: String::from("prefix") };
    let result = call_twice(move |value| { let _ = &context.text; value }, 0, -1);
    assert_eq!(result, (0, -1));
}`,
    hints: [
      "Kontrakt mówi o dwóch wywołaniach, więc oba argumenty muszą trafić do callbacku.",
      "Zwróć krotkę z callback(first) oraz callback(second), zachowując mut dla FnMut.",
    ],
  }),
};

export const closuresModule: CourseModule = {
  id: "closures",
  title: "Closure: przechwytywanie i kontrakty callbacków",
  whyItMatters:
    "Callback pozwala przekazać zachowanie bez duplikowania algorytmu. Świadomy wybór przechwycenia i minimalnego call traitu chroni własność danych oraz nie zawęża API bardziej, niż wymaga tego użycie.",
  capabilities: [
    "Przewidujesz tryb przechwycenia i naprawiasz E0502, E0596 oraz E0382.",
    "Rozpoznajesz, czy ciało closure wymaga Fn, FnMut czy FnOnce.",
    "Projektujesz testowalne API callbacku i zwracasz closure przez impl Fn.",
  ],
  prerequisites: ["lifetimes"],
  lessonIds: closuresLessons.map((lesson) => lesson.id),
  exitGate: [
    "Capture mutowalne zapisuje wszystkie dane w prawidłowej kolejności także dla pustego wejścia.",
    "Move closure powtarza odczyt, a closure konsumujące niekopiowalny payload kończy się po jednym wywołaniu.",
    "Callback API wymaga minimalnego kontraktu, zachowuje liczbę wywołań i zwraca repeatable impl Fn.",
  ],
  projectConnection:
    "W przyszłym Log Analyzer callbacki będą definiować reguły klasyfikacji i formatowania rekordów bez odbierania własności źródłowym danym; iteratorów użyjesz dopiero w następnym module.",
  assessmentId: "closure-contracts/contracts-pipeline-gate",
  gateCriteria: [
    {
      id: "closures-capture-gate",
      label: "Closure poprawnie przechwytuje i mutuje dane bez zmiany API.",
      taskRefs: [
        { lessonId: "closure-captures", stepId: "capture-gate" },
        { lessonId: "closure-captures", stepId: "capture-shared-gate" },
      ],
    },
    {
      id: "closures-call-gate",
      label:
        "Move i call trait opisują osobno własność oraz możliwość powtórzeń.",
      taskRefs: [
        { lessonId: "closure-ownership", stepId: "ownership-gate" },
        { lessonId: "closure-ownership", stepId: "ownership-once-gate" },
      ],
    },
    {
      id: "closures-contract-gate",
      label: "Callback API zachowuje minimalny kontrakt i obserwowalny wynik.",
      taskRefs: [
        { lessonId: "closure-contracts", stepId: "contracts-pipeline-gate" },
        { lessonId: "closure-contracts", stepId: "contracts-returned-gate" },
      ],
    },
  ],
};
