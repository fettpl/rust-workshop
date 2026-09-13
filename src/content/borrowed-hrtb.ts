import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const borrowedHrtbSources: Source[] = [
  {
    id: "borrowed-hrtb-reference-subtyping",
    title: "Rust Reference: Subtyping and variance",
    url: "https://doc.rust-lang.org/reference/subtyping.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów podtypowania, wariancji lub relacji lifetime.",
  },
  {
    id: "borrowed-hrtb-reference-trait-bounds",
    title: "Rust Reference: Trait and lifetime bounds",
    url: "https://doc.rust-lang.org/reference/trait-bounds.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie zapisu wyżej-rzędowych boundów i uniwersalnych lifetime.",
  },
  {
    id: "borrowed-hrtb-nomicon",
    title: "Rustonomicon: Higher-Rank Trait Bounds",
    url: "https://doc.rust-lang.org/nomicon/hrtb.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji wyjaśnienia, kto wybiera lifetime callbacku.",
  },
  {
    id: "borrowed-hrtb-reference-elision",
    title: "Rust Reference: Lifetime elision",
    url: "https://doc.rust-lang.org/reference/lifetime-elision.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie skróconych zapisów lifetime w sygnaturach funkcji i traitów.",
  },
  {
    id: "borrowed-hrtb-book-closures",
    title: "The Rust Programming Language: Closures",
    url: "https://doc.rust-lang.org/book/ch13-01-closures.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów FnMut, przechwytywania i lokalnych callbacków.",
  },
  {
    id: "borrowed-hrtb-book-lifetimes",
    title:
      "The Rust Programming Language: Validating References with Lifetimes",
    url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wyjaśnienia ważności referencji i zakresu lifetime.",
  },
  {
    id: "borrowed-hrtb-error-e0597",
    title: "Rust Error Index: E0597",
    url: "https://doc.rust-lang.org/error_codes/E0597.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Uruchamiaj rzeczywisty fixture rustc po zmianie odkrycia o zbyt krótkiej pożyczce.",
  },
  {
    id: "borrowed-hrtb-error-e0308",
    title: "Rust Error Index: E0308",
    url: "https://doc.rust-lang.org/error_codes/E0308.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Uruchamiaj rzeczywisty fixture rustc po zmianie odkrycia o zbyt wąskiej inferencji closure.",
  },
];

export const borrowedHrtbCompetencies: Competency[] = [
  {
    id: "design-universal-borrowed-callback",
    title:
      "Rozpoznajesz callback, który przy każdym wywołaniu przyjmuje świeżą, krótką pożyczkę.",
  },
  {
    id: "collect-owned-callback-results",
    title:
      "Projektujesz wielokrotnie wywoływany FnMut z jednym stałym, posiadanym typem wyniku.",
  },
  {
    id: "design-borrowed-projection",
    title:
      "Dobierasz HRTB, gdy wynik callbacku ma być pożyczką powiązaną z bieżącym argumentem.",
  },
  {
    id: "explain-lifetime-output-contract",
    title:
      "Oddzielasz gwarancję ważności pożyczki od twierdzenia o pochodzeniu wskazywanych bajtów.",
  },
];

export const borrowedHrtbConcepts: Concept[] = [
  {
    id: "hrtb-local-visitors",
    title: "Uniwersalny callback dla krótkiej pożyczki",
    prerequisites: ["variance-mutable-slots"],
    competencyIds: [
      "design-universal-borrowed-callback",
      "collect-owned-callback-results",
    ],
    reviewPrompt:
      "Co oznacza `F: for<'a> FnMut(&'a str) -> R` w funkcji odwiedzającej własne Stringi?",
    reviewAnswer:
      "Dla każdego wywołania producent wybiera świeży lifetime `'a` krótkiej pożyczki bieżącego tekstu. Callback musi obsłużyć każdy taki lifetime, a R jest jednym stałym typem niezależnym od tej pożyczki; R może być posiadany i nie musi implementować Clone.",
    distinguish:
      "Uniwersalny lifetime z `for<'a>` nie jest jednym lifetime wybranym przez wywołującego i nie oznacza ani wymogu `'static`, ani możliwości przechowania przekazanego `&str` po powrocie callbacku.",
  },
  {
    id: "hrtb-borrowed-projections",
    title: "Wynik pożyczonej projekcji z bieżącego argumentu",
    prerequisites: ["hrtb-local-visitors"],
    competencyIds: [
      "design-borrowed-projection",
      "explain-lifetime-output-contract",
    ],
    reviewPrompt:
      "Dlaczego `F: for<'a> FnMut(&'a str) -> &'a str` jest innym kontraktem niż generyczne `R` z poprzedniej lekcji?",
    reviewAnswer:
      "Tutaj lifetime wyniku zmienia się razem z lifetime argumentu: pożyczona projekcja oddaje widok ważny tak długo, jak bieżąca pożyczka. W poprzednim kontrakcie R jest jednym typem niezależnym od `'a`, więc nie opisuje dowolnej pożyczki wynikowej.",
    distinguish:
      "Powiązanie lifetime zapewnia ważność referencji, ale samo nie dowodzi, że wskazuje ona fragment wejścia. Stały fallback o dłuższym lifetime może spełnić kontrakt po odpowiednim dopasowaniu typu funkcji.",
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

const inspectOwnedStarter = `fn inspect_owned<F, R>(items: Vec<String>, mut inspect: F) -> Vec<R>
where
    F: for<'a> FnMut(&'a str) -> R,
{
    Vec::new()
}
`;

const inspectOwnedSolution = `fn inspect_owned<F, R>(items: Vec<String>, mut inspect: F) -> Vec<R>
where
    F: for<'a> FnMut(&'a str) -> R,
{
    let mut output = Vec::with_capacity(items.len());
    for item in items {
        output.push(inspect(&item));
    }
    output
}
`;

const inspectOwnedTests = `#[derive(Debug, PartialEq, Eq)]
struct OwnedResult(String);

#[test]
fn visits_short_lived_text_in_order_without_clone() {
    let prefix = String::from("przedrostek");
    let mut calls = Vec::new();
    let output = inspect_owned(
        vec![String::from("Łódź"), String::new(), String::from("x")],
        |text| {
            calls.push(text.len());
            OwnedResult(format!("{prefix}: {text}"))
        },
    );
    assert_eq!(calls, vec![7, 0, 1]);
    assert_eq!(output[0], OwnedResult(String::from("przedrostek: Łódź")));
    assert_eq!(output[1], OwnedResult(String::from("przedrostek: ")));
    assert_eq!(output[2], OwnedResult(String::from("przedrostek: x")));
    assert_eq!(
        inspect_owned(Vec::new(), |_text| OwnedResult(String::from("nie"))),
        Vec::<OwnedResult>::new()
    );

    let external = String::from("wspólny wynik");
    let borrowed = inspect_owned(vec![String::from("a"), String::from("b")], |_text| {
        external.as_str()
    });
    assert_eq!(borrowed, vec![external.as_str(), external.as_str()]);
}

#[test]
fn accepts_function_item_and_keeps_each_owned_result() {
    fn length(text: &str) -> usize {
        text.len()
    }

    let lengths = inspect_owned(vec![String::from("a"), String::from("żółć")], length);
    assert_eq!(lengths, vec![1, 8]);
}
`;

const inspectOwnedObservation = `fn inspect_owned<F, R>(items: Vec<String>, mut inspect: F) -> Vec<R>
where
    F: for<'a> FnMut(&'a str) -> R,
{
    let mut output = Vec::new();
    for item in items {
        output.push(inspect(&item));
    }
    output
}

fn main() {
    let mut calls = 0;
    let lengths = inspect_owned(
        vec![String::from("Łódź"), String::new(), String::from("abc")],
        |text| {
            calls += 1;
            text.len()
        },
    );
    println!("długości: {lengths:?}; wywołania: {calls}");
}
`;

const chosenLifetimeBroken = `fn visit<'input, F>(items: Vec<String>, mut inspect: F)
where
    F: FnMut(&'input str),
{
    for item in items {
        inspect(&item);
    }
}

fn main() {
    visit(vec![String::from("krótki")], |text| println!("{text}"));
}
`;

const chosenLifetimeSolution = `fn visit<F>(items: Vec<String>, mut inspect: F)
where
    F: for<'a> FnMut(&'a str),
{
    for item in items {
        inspect(&item);
    }
}

fn main() {
    visit(vec![String::from("krótki")], |text| println!("{text}"));
}
`;

const inspectUntilStarter = `fn inspect_until<F, R, E>(items: Vec<Vec<u8>>, mut inspect: F) -> Result<Vec<R>, E>
where
    F: for<'a> FnMut(&'a [u8]) -> Result<R, E>,
{
    Ok(Vec::new())
}
`;

const inspectUntilSolution = `fn inspect_until<F, R, E>(items: Vec<Vec<u8>>, mut inspect: F) -> Result<Vec<R>, E>
where
    F: for<'a> FnMut(&'a [u8]) -> Result<R, E>,
{
    let mut output = Vec::new();
    for item in items {
        match inspect(&item) {
            Ok(value) => output.push(value),
            Err(error) => return Err(error),
        }
    }
    Ok(output)
}
`;

const inspectUntilTests = `#[derive(Debug, PartialEq, Eq)]
struct PacketResult(usize);

#[derive(Debug, PartialEq, Eq)]
struct PacketError<'msg>(&'msg str);

#[test]
fn stops_on_first_middle_error_and_returns_owned_error() {
    let error_message = String::from("empty");
    let mut calls = Vec::new();
    let result = inspect_until(
        vec![b"a".to_vec(), b"".to_vec(), "żółć".as_bytes().to_vec()],
        |packet| {
            calls.push(packet.len());
            if packet.is_empty() {
                Err(PacketError(error_message.as_str()))
            } else {
                Ok(PacketResult(packet.len()))
            }
        },
    );
    assert_eq!(calls, vec![1, 0]);
    assert_eq!(result, Err(PacketError(error_message.as_str())));
}

#[test]
fn stops_on_first_error_and_returns_exact_local_error() {
    let error_message = String::from("first");
    let mut calls = Vec::new();
    let result = inspect_until(vec![b"stop".to_vec(), b"later".to_vec()], |packet| {
        calls.push(packet.len());
        Err::<PacketResult, _>(PacketError(error_message.as_str()))
    });
    assert_eq!(calls, vec![4]);
    assert_eq!(result, Err(PacketError(error_message.as_str())));
}

#[test]
fn distinguishes_success_and_first_or_last_error() {
    let error_message = String::from("last");
    let mut success_calls = 0;
    let success = inspect_until(vec![b"a".to_vec(), b"bc".to_vec()], |packet| {
        success_calls += 1;
        Ok::<_, PacketError>(PacketResult(packet.len()))
    });
    assert_eq!(success_calls, 2);
    assert_eq!(success, Ok(vec![PacketResult(1), PacketResult(2)]));

    let mut last_calls = 0;
    let last = inspect_until(vec![b"ok".to_vec(), b"stop".to_vec()], |packet| {
        last_calls += 1;
        if packet == b"stop" {
            Err(PacketError(error_message.as_str()))
        } else {
            Ok(PacketResult(packet.len()))
        }
    });
    assert_eq!(last_calls, 2);
    assert_eq!(last, Err(PacketError(error_message.as_str())));
    let mut empty_calls = 0;
    let empty: Result<Vec<PacketResult>, PacketError<'_>> = inspect_until(Vec::new(), |_packet| {
        empty_calls += 1;
        Ok(PacketResult(0))
    });
    assert_eq!(empty_calls, 0);
    assert_eq!(empty, Ok(Vec::new()));

    let external = String::from("stały raport");
    let borrowed: Result<Vec<&str>, PacketError<'_>> =
        inspect_until(vec![b"a".to_vec(), b"b".to_vec()], |_packet| {
            Ok(external.as_str())
        });
    assert_eq!(borrowed, Ok(vec![external.as_str(), external.as_str()]));
}
`;

const selectOwnedStarter = `fn select_owned<F, R>(items: Vec<String>, mut visitor: F) -> Vec<R>
where
    F: for<'a> FnMut(&'a str) -> Option<R>,
{
    Vec::new()
}
`;

const selectOwnedSolution = `fn select_owned<F, R>(items: Vec<String>, mut visitor: F) -> Vec<R>
where
    F: for<'a> FnMut(&'a str) -> Option<R>,
{
    let mut output = Vec::new();
    for item in items {
        if let Some(value) = visitor(&item) {
            output.push(value);
        }
    }
    output
}
`;

const selectOwnedTests = `#[derive(Debug, PartialEq, Eq)]
struct Selected(String);

#[test]
fn visits_every_record_and_keeps_selected_order() {
    let prefix = String::from("wyb");
    let mut seen = Vec::new();
    let selected = select_owned(
        vec![
            String::from("a"),
            String::new(),
            String::from("Łódź"),
            String::from("b"),
        ],
        |text| {
            seen.push(text.len());
            (!text.is_empty()).then(|| Selected(format!("{prefix}:{text}")))
        },
    );
    assert_eq!(seen, vec![1, 0, 7, 1]);
    assert_eq!(
        selected,
        vec![
            Selected(String::from("wyb:a")),
            Selected(String::from("wyb:Łódź")),
            Selected(String::from("wyb:b"))
        ]
    );
}

#[test]
fn allows_non_clone_owned_output_and_empty_input() {
    struct NoClone(String);
    let values = select_owned(vec![String::from("ok")], |text| {
        Some(NoClone(text.to_owned()))
    });
    assert_eq!(values.len(), 1);
    assert_eq!(values[0].0, "ok");
    let empty: Vec<NoClone> = select_owned(Vec::new(), |_text| Some(NoClone(String::new())));
    assert!(empty.is_empty());

    let external = String::from("zewnętrzny");
    let borrowed = select_owned(vec![String::from("a")], |_text| Some(external.as_str()));
    assert_eq!(borrowed, vec![external.as_str()]);
}
`;

const borrowedHrtbVisitorLesson: Lesson = {
  id: "hrtb-local-visitors",
  moduleId: "borrowed-callbacks",
  conceptIds: ["hrtb-local-visitors"],
  competencyIds: [
    "design-universal-borrowed-callback",
    "collect-owned-callback-results",
  ],
  prerequisites: ["variance-mutable-slots"],
  title: "Callback odwiedza lokalne pożyczki",
  subtitle:
    "Producent wybiera krótkie lifetime, a FnMut musi obsłużyć każde z nich",
  minutes: 22,
  outcomes: [
    "Rozpoznasz `for<'a>` jako uniwersalny lifetime wybierany przy każdym wywołaniu.",
    "Zaimplementujesz callback odwiedzający własne Stringi bez wypuszczania pożyczki poza callback.",
    "Odróżnisz stały posiadany R od pojedynczego lifetime wybranego przez wywołującego.",
  ],
  steps: [
    choice(
      "visitors-predict",
      "predict",
      "Kto wybiera lifetime?",
      "`inspect_owned` posiada Vec<String> i wywołuje callback dla każdego rekordu. Czy callback może dostać osobny krótki `&str` przy każdym obrocie pętli?",
      [
        "Tak: `for<'a>` wymaga obsługi każdego lifetime wybranego przez producenta.",
        "Nie: callback musi dostać jeden lifetime obejmujący cały Vec.",
        "Tak, ale tylko jeśli String implementuje Copy.",
      ],
      0,
      [
        "HRTB mówi, że callback działa dla każdego lifetime pożyczki, więc lokalny rekord może być pożyczony tylko podczas wywołania.",
        "Jeden lifetime wybrany przez wywołującego nie opisuje kolejnych, krótkich pożyczek elementów tworzonych przez producenta.",
        "Copy nie ma związku z uniwersalnością lifetime ani z pożyczką `str`.",
      ],
    ),
    run(
      "visitors-run",
      "Zobacz kolejność i długości bajtów",
      "Uruchom callback odwiedzający rekordy. `str::len` liczy bajty, więc Unicode pokazuje różnicę między liczbą znaków a rozmiarem UTF-8. Pusty Vec nie wykonuje callbacku.",
      inspectOwnedObservation,
      "długości: [7, 0, 3]; wywołania: 3\n",
    ),
    compilerError(
      "visitors-discover",
      "Sprawdź E0597 dla wybranego lifetime",
      "Starter próbuje nazwać jeden `'input` w parametrze callbacku. Uruchom go i przeczytaj, dlaczego lokalny `item` nie może być pożyczony do tego z góry wybranego lifetime. Naprawa zamienia pojedynczy wybór na `for<'a>`.",
      chosenLifetimeBroken,
      chosenLifetimeSolution,
      "E0597",
    ),
    exercise({
      id: "hrtb-local-visitors-gate",
      kind: "debug",
      title: "Zbierz posiadane wyniki",
      prompt:
        "Napraw `inspect_owned`. Funkcja ma przejść po przejętym `Vec<String>`, wywołać `inspect` dokładnie raz na każdy rekord w kolejności i zebrać wyniki w nowym Vec. Pożyczka `&str` ma istnieć tylko podczas danego wywołania. Callback może mutować zewnętrzny lokalny log, przechwytywać dane lokalne i zwracać posiadany typ bez Clone. Stały R może być także `&str` pożyczonym z zewnętrznych lokalnych danych; to osobna pożyczka, niezależna od bieżącego item. Puste wejście nie wywołuje callbacku.",
      code: inspectOwnedStarter,
      solution: inspectOwnedSolution,
      tests: inspectOwnedTests,
      hints: [
        "Producent posiada każdy String tylko w bieżącej iteracji, więc wywołaj callback przez `inspect(&item)`.",
        "`FnMut` wymaga mutowalnego parametru, a wynik R można od razu przenieść do Vec przez `push`.",
      ],
      gate: true,
    }),
    exercise({
      id: "hrtb-local-visitors-blank",
      kind: "blank",
      title: "Zatrzymaj się na pierwszym błędzie",
      prompt:
        "Od pustej kartki napisz `inspect_until`. Przyjmij `Vec<Vec<u8>>` oraz callback FnMut, który dla każdej krótkiej pożyczki `&[u8]` zwraca `Result<R, E>`. Na sukcesie oddaj wszystkie posiadane R w kolejności. Przy pierwszym Err natychmiast zakończ i oddaj dokładnie ten posiadany E; nie odwiedzaj późniejszych pakietów. Nie wymagaj Clone ani dla R, ani dla E; E może sam pożyczać z zewnętrznych lokalnych danych, a stały R może być pożyczonym widokiem z takiego właściciela. Puste wejście daje `Ok` z pustym Vec i nie wywołuje callbacku. Testy odróżnią błąd na początku, w środku i na końcu oraz sprawdzą `len()` dla pustych i Unicode bajtów.",
      solution: inspectUntilSolution,
      tests: inspectUntilTests,
      hints: [
        "W pętli dopasuj wynik callbacku: `Ok(value)` dopisz, a `Err(error)` zwróć natychmiast.",
        "Pożyczka pakietu jest potrzebna tylko w wyrażeniu wywołania; E jest przenoszony bez klonowania.",
      ],
      gate: true,
    }),
    choice(
      "visitors-transfer-preview",
      "explain",
      "Rozszerz callback o filtr",
      "Jak zmienić mapujący callback, aby zachować tylko wybrane posiadane wyniki, nadal odwiedzając każdy rekord?",
      [
        "Zwracać `Option<R>`, pomijać None i kontynuować pętlę.",
        "Zwracać `&'static R`, aby każdy wynik dało się przechować.",
        "Wymagać `R: Clone`, bo None oznacza ponowne wywołanie.",
      ],
      0,
      [
        "Option zmienia decyzję o zapisie, ale nie zmienia krótkiej pożyczki wejścia ani kolejności wywołań.",
        "Static nie jest potrzebny dla posiadanych wyników i nie opisuje lokalnej pożyczki callbacku.",
        "Pominięcie None nie wymaga klonowania żadnego wyniku.",
      ],
    ),
    choice(
      "visitors-recall",
      "recall",
      "Stały typ wyniku",
      "Co pozostaje stałe w `for<'a> FnMut(&'a str) -> R`?",
      [
        "Lifetime pożyczki wejścia w każdym osobnym wywołaniu.",
        "Typ R w całym konkretnym wywołaniu funkcji producenta.",
        "Adres i pochodzenie bajtów każdego wyniku.",
      ],
      1,
      [
        "Lifetime jest kwantyfikowany uniwersalnie i może być inny przy kolejnym wywołaniu.",
        "R jest jednym typem wyniku; może być na przykład niekopiowalnym Stringiem lub własną strukturą.",
        "Sam bound lifetime mówi o ważności, nie o konkretnym pochodzeniu wskazywanych danych.",
      ],
    ),
  ],
  misconceptions: [
    "`for<'a>` wymaga, aby callback i jego capture żyły do `'static`.",
    "Jeden lifetime wpisany przy parametrze callbacku wystarczy dla wszystkich lokalnych Stringów producenta.",
    "Wynik R musi być Clone, bo callback jest wywoływany wiele razy.",
  ],
  transferTask:
    "Zaprojektuj callback odwiedzający własne rekordy, który zwraca niekopiowalny raport, a błąd przerywa przebieg na pierwszym rekordzie niespełniającym warunku.",
  evidenceGate:
    "`inspect_owned` zachowuje kolejność, liczbę wywołań i posiadane wyniki dla lokalnych, Unicode oraz pustych danych, a `inspect_until` zatrzymuje się na pierwszym błędzie.",
  sourceIds: [
    "borrowed-hrtb-reference-trait-bounds",
    "borrowed-hrtb-nomicon",
    "borrowed-hrtb-reference-elision",
    "borrowed-hrtb-book-closures",
    "borrowed-hrtb-book-lifetimes",
    "borrowed-hrtb-error-e0597",
  ],
};

const projectLengthsStarter = `fn project_lengths<F>(items: Vec<String>, mut project: F) -> Vec<usize>
where
    F: for<'a> FnMut(&'a str) -> &'a str,
{
    Vec::new()
}
`;

const projectLengthsSolution = `fn project_lengths<F>(items: Vec<String>, mut project: F) -> Vec<usize>
where
    F: for<'a> FnMut(&'a str) -> &'a str,
{
    let mut lengths = Vec::with_capacity(items.len());
    for item in items {
        let view = project(&item);
        lengths.push(view.len());
    }
    lengths
}
`;

const projectLengthsTests = `#[test]
fn records_borrowed_view_before_owned_item_drops() {
    let suffix = String::from("!");
    let mut calls = Vec::new();
    let lengths = project_lengths(
        vec![String::from("  Łódź!"), String::new(), String::from("abc!")],
        |text| {
            calls.push(text.len());
            text.trim().trim_end_matches(&suffix)
        },
    );
    assert_eq!(calls, vec![10, 0, 4]);
    assert_eq!(lengths, vec![7, 0, 3]);

    fn first_word(text: &str) -> &str {
        text.split_whitespace().next().unwrap_or("")
    }
    assert_eq!(
        project_lengths(vec![String::from("a b")], first_word),
        vec![1]
    );
}

#[test]
fn accepts_static_fallback_after_function_pointer_cast() {
    fn static_label(_text: &str) -> &'static str {
        "stały"
    }

    let projection: fn(&str) -> &str = static_label;
    assert_eq!(
        project_lengths(vec![String::from("x"), String::new()], projection),
        vec![6, 6]
    );
    assert!(project_lengths(Vec::new(), projection).is_empty());
}
`;

const projectLengthsObservation = `fn project_lengths<F>(items: Vec<String>, mut project: F) -> Vec<usize>
where
    F: for<'a> FnMut(&'a str) -> &'a str,
{
    let mut lengths = Vec::new();
    for item in items {
        let view = project(&item);
        lengths.push(view.len());
    }
    lengths
}

fn main() {
    let lengths = project_lengths(
        vec![String::from("  Łódź  "), String::from("rust")],
        |text: &str| text.trim(),
    );
    println!("długości widoków: {lengths:?}");
}
`;

const projectLengthsBrokenInline = `fn project_lengths<F>(items: Vec<String>, mut project: F) -> Vec<usize>
where
    F: for<'a> FnMut(&'a str) -> &'a str,
{
    let mut lengths = Vec::new();
    for item in items {
        lengths.push(project(&item).len());
    }
    lengths
}

fn main() {
    let suffix = String::from("!");
    let project = |text: &str| text.trim_end_matches(&suffix);
    let lengths = project_lengths(vec![String::from("ok!")], project);
    println!("{lengths:?}");
}
`;

const findProjectedSizeSolution = `fn find_projected_size<F>(items: Vec<Vec<u8>>, mut project: F) -> Option<usize>
where
    F: for<'a> FnMut(&'a [u8]) -> Option<&'a [u8]>,
{
    for item in items {
        if let Some(view) = project(&item) {
            return Some(view.len());
        }
    }
    None
}
`;

const findProjectedSizeTests = `#[test]
fn stops_at_first_some_even_when_view_is_empty() {
    let mut calls = Vec::new();
    let result = find_projected_size(
        vec![b"skip".to_vec(), Vec::new(), "później".as_bytes().to_vec()],
        |packet| {
            calls.push(packet.len());
            if packet.is_empty() {
                Some(&packet[..])
            } else {
                None
            }
        },
    );
    assert_eq!(calls, vec![4, 0]);
    assert_eq!(result, Some(0));
}

#[test]
fn returns_none_only_after_visiting_all_none_packets() {
    let mut calls = 0;
    let result = find_projected_size(
        vec![b"a".to_vec(), "żółć".as_bytes().to_vec()],
        |packet| {
            calls += 1;
            if packet == b"a" { None } else { None }
        },
    );
    assert_eq!(calls, 2);
    assert_eq!(result, None);
}
`;

const tryProjectLengthsStarter = `fn try_project_lengths<F, E>(items: Vec<String>, mut project: F) -> Result<Vec<usize>, E>
where
    F: for<'a> FnMut(&'a str) -> Result<&'a str, E>,
{
    Ok(Vec::new())
}
`;

const tryProjectLengthsSolution = `fn try_project_lengths<F, E>(items: Vec<String>, mut project: F) -> Result<Vec<usize>, E>
where
    F: for<'a> FnMut(&'a str) -> Result<&'a str, E>,
{
    let mut lengths = Vec::with_capacity(items.len());
    for item in items {
        match project(&item) {
            Ok(view) => lengths.push(view.len()),
            Err(error) => return Err(error),
        }
    }
    Ok(lengths)
}
`;

const tryProjectLengthsTests = `#[derive(Debug, PartialEq, Eq)]
struct ProjectionError<'msg> {
    record: usize,
    message: &'msg str,
}

#[test]
fn returns_all_lengths_on_success_with_local_capture() {
    let prefix = String::from("tag:");
    let mut calls = 0;
    let result = try_project_lengths(
        vec![String::from("  Łódź "), String::new(), String::from("abc")],
        |text| {
            calls += 1;
            let _ = &prefix;
            Ok::<_, ProjectionError<'_>>(text.trim())
        },
    );
    assert_eq!(calls, 3);
    assert_eq!(result, Ok(vec![7, 0, 3]));
}

#[test]
fn returns_exact_owned_error_and_stops_at_first_failure() {
    let error_message = String::from("projection failed");
    for failure_at in [0, 1, 2] {
        let mut calls = 0;
        let result = try_project_lengths(
            vec![String::from("a"), String::from("bb"), String::from("ccc")],
            |text| {
                let index = calls;
                calls += 1;
                if index == failure_at {
                    Err(ProjectionError {
                        record: index,
                        message: error_message.as_str(),
                    })
                } else {
                    Ok(text)
                }
            },
        );
        assert_eq!(calls, failure_at + 1);
        assert_eq!(
            result,
            Err(ProjectionError {
                record: failure_at,
                message: error_message.as_str(),
            })
        );
    }
    let empty: Result<Vec<usize>, ProjectionError<'_>> =
        try_project_lengths(Vec::new(), |_text| Ok(""));
    assert_eq!(empty, Ok(Vec::new()));
}
`;

const tryProjectLengthsStarterForReview = `fn try_project_lengths<F, E>(items: Vec<String>, mut project: F) -> Result<Vec<usize>, E>
where
    F: for<'a> FnMut(&'a str) -> Result<&'a str, E>,
{
    Ok(Vec::new())
}
`;

export const borrowedHrtbLessons: Lesson[] = [
  borrowedHrtbVisitorLesson,
  {
    id: "hrtb-borrowed-projections",
    moduleId: "borrowed-callbacks",
    conceptIds: ["hrtb-borrowed-projections"],
    competencyIds: [
      "design-borrowed-projection",
      "explain-lifetime-output-contract",
    ],
    prerequisites: ["hrtb-local-visitors"],
    title: "Projekcja oddaje pożyczony widok",
    subtitle:
      "Wynik może żyć tak długo, jak bieżący argument, lecz nie wychodzi z producenta",
    minutes: 24,
    outcomes: [
      "Zapiszesz HRTB, w którym lifetime wyniku jest związany z lifetime argumentu.",
      "Natychmiast zmierzysz pożyczony widok, zanim właściciel bieżącego rekordu zniknie.",
      "Wyjaśnisz, dlaczego fallback z `'static` może spełnić bound oraz czemu bound nie dowodzi pochodzenia wyniku z wejścia.",
    ],
    steps: [
      choice(
        "projections-predict",
        "predict",
        "Stałe R czy pożyczony wynik?",
        "Czy wcześniejsze `F: for<'a> FnMut(&'a str) -> R` może opisać dowolny wynik `&'a str`, którego lifetime zależy od bieżącej pożyczki?",
        [
          "Tak, bo każde R automatycznie dostaje lifetime argumentu.",
          "Nie: trzeba powiązać lifetime wyniku z lifetime wejścia w samym boundzie.",
          "Tak, ale tylko dla callbacku bez capture.",
        ],
        1,
        [
          "R jest jednym typem, a dowolne pożyczki wynikowe mają relację lifetime opisaną dopiero w `-> &'a str`.",
          "Jawne powtórzenie `'a` przy wyniku mówi, że wynik jest ważny względem bieżącego argumentu.",
          "Capture nie rozwiązuje różnicy między stałym R a wynikiem zależnym od argumentu.",
        ],
      ),
      run(
        "projections-run",
        "Zmierz pożyczoną projekcję przed zniszczeniem",
        "Uruchom gotowe API z inline closure `|text: &str| text.trim()`. Funkcja przechowuje tylko długość, więc żaden widok nie ucieka poza bieżący rekord.",
        projectLengthsObservation,
        "długości widoków: [7, 4]\n",
      ),
      choice(
        "projections-explain",
        "explain",
        "Co gwarantuje lifetime?",
        "Pożyczona projekcja zwraca `&'a str`. Które zdanie jest precyzyjne?",
        [
          "Rust wie, że wynik wskazuje fragment wejścia.",
          "Rust gwarantuje ważność wyniku względem `'a`, ale sam bound nie mówi, skąd logicznie pochodzą bajty.",
          "Wynik zawsze musi mieć lifetime `'static`.",
        ],
        1,
        [
          "Lifetime jest relacją ważności, a nie dowodem semantycznego pochodzenia danych.",
          "Stały fallback `&'static str` może być bezpieczny, jeśli zostanie dopasowany do oczekiwanego typu funkcji.",
          "HRTB dotyczy wszystkich krótkich wejść, nie wymaga wiecznego przechwycenia ani wyniku.",
        ],
      ),
      compilerError(
        "projections-discover",
        "Zobacz granicę inferencji closure",
        "W tym odkryciu closure jest przypisana do osobnej zmiennej przed przekazaniem do generycznego API. Uruchom kod i odczytaj rzeczywistą diagnostykę. W praktyce inline `|s: &str| s.trim()`, funkcja generyczna względem lifetime albo jawny wskaźnik `fn(&str) -> &str` dostarcza kompilatorowi właściwie ogólny podpis. Nie wyciągaj z tego wniosku, że każda closure przypisana do zmiennej jest niepoprawna.",
        projectLengthsBrokenInline,
        projectLengthsSolution,
        "E0308",
      ),
      exercise({
        id: "hrtb-borrowed-projections-gate",
        kind: "debug",
        title: "Zapisz długości pożyczonej projekcji",
        prompt:
          "Napraw `project_lengths`. Funkcja ma przejąć `Vec<String>`, raz odwiedzić każdy rekord przez `F: for<'a> FnMut(&'a str) -> &'a str` i natychmiast zapisać bajtową długość oddanego widoku. Wynik `&str` nie może przetrwać bieżącego obrotu pętli. Testy użyją Unicode, pustych rekordów, nazwanej funkcji, closure z lokalnie przechwyconymi danymi oraz legalnego fallbacku z `'static` przekazanego przez `fn(&str) -> &str`. Puste wejście nie wywołuje callbacku.",
        code: projectLengthsStarter,
        solution: projectLengthsSolution,
        tests: projectLengthsTests,
        hints: [
          "Wywołaj projekcję na bieżącym `&item`, zachowaj widok w lokalnej nazwie i odczytaj `view.len()` przed końcem iteracji.",
          "Bound opisuje relację `&'a str -> &'a str`; nie dodawaj `'static` ani Clone, bo wynik jest używany natychmiast.",
        ],
        gate: true,
      }),
      exercise({
        id: "hrtb-borrowed-projections-blank",
        kind: "blank",
        title: "Znajdź pierwszy Some",
        prompt:
          "Od pustej kartki napisz `find_projected_size`. Przyjmij własność `Vec<Vec<u8>>` i callback, który dostaje krótką pożyczkę bieżącego pakietu bajtów oraz opcjonalnie oddaje widok ważny dla tej samej pożyczki. Zapisz w sygnaturze uniwersalną relację lifetime między argumentem i wynikiem. Zwróć długość pierwszego widoku `Some`, natychmiast kończąc przebieg. `Some(&[])` daje `Some(0)` i nie jest tym samym co brak wyniku `None`. Jeśli wszystkie callbacki zwrócą None, oddaj None. Późniejsze pakiety nie mogą zostać odwiedzone.",
        solution: findProjectedSizeSolution,
        tests: findProjectedSizeTests,
        hints: [
          "Dopasuj `Some(view)` osobno od `None`; długość pustego view nadal jest wynikiem.",
          "`return Some(view.len())` kończy funkcję dokładnie przy pierwszym Some.",
        ],
        gate: true,
      }),
      choice(
        "projections-transfer-preview",
        "explain",
        "Dodaj Result do projekcji",
        "Która zmiana zachowuje pożyczony wynik, a jednocześnie pozwala zakończyć przebieg pierwszym błędem?",
        [
          "Użyć `Result<&'a str, E>`: długość Ok zmierzyć od razu, a E zwrócić bez klonowania.",
          "Zamienić wynik na `&'static str`, aby błąd mógł żyć dłużej.",
          "Wymagać `E: Clone`, bo każda iteracja musi skopiować błąd.",
        ],
        0,
        [
          "Lifetime dotyczy tylko widoku w Ok; stały E można przenieść i zwrócić natychmiast.",
          "Static nie jest warunkiem dla wyniku używanego przed drop bieżącego Stringa.",
          "Zwracany jest jeden pierwszy E, więc Clone nie jest potrzebne.",
        ],
      ),
      choice(
        "projections-recall",
        "recall",
        "Fallback z `'static`",
        "Dlaczego funkcja zwracająca `&'static str` może być użyta jako pożyczona projekcja po jawnym cast do `fn(&str) -> &str`?",
        [
          "Dłuższy lifetime stałego tekstu może zostać skrócony do kontraktu wynikowego; cast pomaga dopasować typ wskaźnika.",
          "Ponieważ HRTB ignoruje typ wyniku.",
          "Ponieważ każde `&str` jest automatycznie fragmentem argumentu.",
        ],
        0,
        [
          "Ważność `'static` jest wystarczająca, a wskaźnik funkcji może zostać wpisany jako oczekiwany skrócony `fn(&str) -> &str`.",
          "HRTB sprawdza także relację lifetime wyniku; nie ignoruje jej.",
          "Bound nie ustanawia pochodzenia danych ani relacji „wynik jest fragmentem wejścia”.",
        ],
      ),
    ],
    misconceptions: [
      "Wynik pożyczony z callbacku można przechować w Vec po zniszczeniu bieżącego Stringa.",
      "`for<'a>` oznacza, że zwracana referencja musi być `'static`.",
      "Lifetime adnotacja sama dowodzi, że wynik jest fragmentem wejścia.",
      "Closure przypisana do zmiennej zawsze ma właściwy uniwersalny podpis bez adnotacji.",
    ],
    transferTask:
      "Zaprojektuj pożyczoną projekcję dla pakietów bajtów, która oddaje pierwszy niepusty zakres, a producent zapisuje wyłącznie jego długość i kończy się przy pierwszym dopasowaniu.",
    evidenceGate:
      "`project_lengths` mierzy każdy wynik przed zniknięciem właściciela, obsługuje elision i fallback z `'static`, a `find_projected_size` odróżnia Some(0) od None i zatrzymuje się we właściwym miejscu.",
    sourceIds: [
      "borrowed-hrtb-reference-trait-bounds",
      "borrowed-hrtb-nomicon",
      "borrowed-hrtb-reference-elision",
      "borrowed-hrtb-reference-subtyping",
      "borrowed-hrtb-book-lifetimes",
      "borrowed-hrtb-error-e0308",
    ],
  },
];

export const borrowedHrtbReviewExercises: Record<string, LessonStep> = {
  "hrtb-local-visitors": exercise({
    id: "review-hrtb-select-owned",
    kind: "apply",
    title: "Powtórka: wybierz rekordy",
    prompt:
      "Dokończ `select_owned`, które zwraca `Vec<R>`. Funkcja przyjmuje `Vec<String>` oraz visitor `F: for<'a> FnMut(&'a str) -> Option<R>`. Odwiedź każdy rekord dokładnie raz, pomiń `None`, a posiadane R zachowaj w kolejności. Closure przechwytuje lokalny prefix i zwraca nieklonowalny typ; stały R może być także `&str` pożyczonym z zewnętrznych lokalnych danych. Zachowaj zachowanie dla pustego wejścia.",
    code: selectOwnedStarter,
    solution: selectOwnedSolution,
    tests: selectOwnedTests,
    hints: [
      "Uniwersalny visitor może dostać lokalną pożyczkę każdego rekordu, lecz decyzja `Some` nie przechowuje tej pożyczki.",
      "Wywołuj callback zawsze; `push` wykonuj tylko dla `Some(value)`.",
    ],
  }),
  "hrtb-borrowed-projections": exercise({
    id: "review-hrtb-try-project-lengths",
    kind: "debug",
    title: "Powtórka: projection z Result",
    prompt:
      "Napraw `try_project_lengths`, które zwraca `Result<Vec<usize>, E>`. Przyjmij callback `F: for<'a> FnMut(&'a str) -> Result<&'a str, E>`: dla każdego Stringa zwraca on pożyczony `&str` ważny na czas bieżącej pożyczki, a E jest jednym posiadanym typem błędu i może sam pożyczać z zewnętrznych lokalnych danych. Zapisz długości wszystkich sukcesów; pierwszy Err oddaj bez klonowania i nie odwiedzaj późniejszych rekordów. Testy sprawdzają błąd na początku, w środku i na końcu, Unicode, puste wejście oraz lokalnie przechwycone dane.",
    code: tryProjectLengthsStarterForReview,
    solution: tryProjectLengthsSolution,
    tests: tryProjectLengthsTests,
    hints: [
      "Wynik Ok wykorzystaj natychmiast przez `view.len()`, tak jak w głównej projection.",
      "Błąd E nie ma lifetime callbacku; zwróć go bezpośrednio w gałęzi Err.",
    ],
  }),
};
