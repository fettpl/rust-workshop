import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const loopsSources: Source[] = [
  {
    id: "loops-book-control-flow",
    title: "The Rust Programming Language: Control Flow",
    url: "https://doc.rust-lang.org/book/ch03-05-control-flow.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu while, loop, break, continue lub etykiet pętli.",
  },
  {
    id: "loops-reference-expressions",
    title: "The Rust Reference: Loop expressions",
    url: "https://doc.rust-lang.org/reference/expressions/loop-expr.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu wartości break, etykiet albo typów wyrażeń pętli.",
  },
  {
    id: "loops-error-e0571",
    title: "Rust Error Index: E0571 — break with value from a while loop",
    url: "https://doc.rust-lang.org/error_codes/E0571.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj rzeczywisty komunikat rustc przy zmianie przykładu break z wartością.",
  },
  {
    id: "loops-book-tests",
    title: "The Rust Programming Language: How to Write Tests",
    url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu testów jednostkowych i asercji wieloprzypadkowych.",
  },
];

export const loopsCompetencies: Competency[] = [
  {
    id: "while-progress",
    title:
      "Budujesz kończącą się pętlę while, jawnie inicjując warunek, aktualizację i granicę.",
  },
  {
    id: "loop-values",
    title:
      "Używasz loop oraz break z wartością do znalezienia wyniku i opisujesz przypadek braku wyniku.",
  },
  {
    id: "loop-control",
    title:
      "Dobierasz continue, break i etykietę do pomijania iteracji oraz wyjścia z właściwego poziomu pętli.",
  },
];

export const loopsConcepts: Concept[] = [
  {
    id: "while-progress",
    title: "while: warunek, postęp i jawna granica",
    prerequisites: ["control-flow"],
    competencyIds: ["while-progress"],
    reviewPrompt:
      "Jakie trzy elementy musi mieć bezpieczna pętla while, aby przejść od startu do końca bez nieskończonego powtarzania?",
    reviewAnswer:
      "Potrzebuje wartości startowej, warunku sprawdzanego przed iteracją oraz aktualizacji stanu w ciele, która przybliża go do jawnej granicy.",
    distinguish:
      "while sprawdza warunek przed każdą iteracją. Samo zapisanie warunku nie gwarantuje końca: ciało musi zmieniać stan, a zakres dozwolonych danych powinien być określony.",
  },
  {
    id: "loop-values",
    title: "loop i break: pętla jako wyrażenie z wynikiem",
    prerequisites: ["while-progress"],
    competencyIds: ["loop-values"],
    reviewPrompt:
      "Co zwraca `loop`, gdy wykonanie kończy się przez `break candidate`, i jak opiszesz przypadek, w którym kandydat nie istnieje?",
    reviewAnswer:
      "Wartością loop jest wyrażenie podane przy break; jeśli wynik może nie istnieć, w tym ograniczonym zadaniu używamy -1, które nie jest poprawnym kandydatem. Późniejszy moduł Option pokaże, jak wyrazić brak wyniku osobnym wariantem typu.",
    distinguish:
      "Zwykłe `break` kończy loop wartością jednostkową (), a `break wyrażenie` ustala wartość całego loop. `break` w while nie może zwracać wartości, dlatego używamy loop, gdy potrzebujemy wyniku.",
  },
  {
    id: "loop-control",
    title: "continue, break i etykiety w zagnieżdżonych pętlach",
    prerequisites: ["loop-values"],
    competencyIds: ["loop-control"],
    reviewPrompt:
      "W zagnieżdżonych pętlach czym różni się `continue`, `break` i `break 'search`?",
    reviewAnswer:
      "continue pomija resztę bieżącej iteracji najbliższej pętli, break kończy najbliższą pętlę, a break 'search kończy pętlę oznaczoną etykietą search.",
    distinguish:
      "Etykieta wybiera poziom zagnieżdżenia; nie jest licznikiem ani skokiem do dowolnej linii. Przewidywanie wyniku wymaga prześledzenia pomijanych iteracji i miejsca, w którym pętla rzeczywiście się kończy.",
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
  code?: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(code === undefined
      ? {}
      : { code, solution: code, expectedStatus: "success" as const }),
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

const whileRunCode = `fn main() {
    let mut current = 1;
    let mut total = 0;
    while current <= 4 {
        total += current;
        current += 1;
    }
    println!("{}|{}", total, current);
}`;

const valuesRunCode = `fn main() {
    let mut candidate = 2;
    let result = loop {
        if candidate > 8 {
            break -1;
        }
        if candidate % 3 == 0 {
            break candidate;
        }
        candidate += 1;
    };
    println!("{}", result);
}`;

const controlRunCode = `fn main() {
    let mut total = 0;
    'rows: for row in 1..=3 {
        for column in 1..=3 {
            if row == 2 && column == 1 {
                continue 'rows;
            }
            if row == 3 && column == 2 {
                break 'rows;
            }
            total += row * 10 + column;
        }
    }
    println!("{}", total);
}`;

const whileBroken = `fn main() {
    let current = 1;
    while current <= 3 {
        println!("{}", current);
        current += 1;
    }
}`;

const whileFixed = `fn main() {
    let mut current = 1;
    while current <= 3 {
        println!("{}", current);
        current += 1;
    }
}`;

const sumEvenStarter = `fn sum_even_to(limit: i32) -> i32 {
    0
}`;

const sumEvenSolution = `fn sum_even_to(limit: i32) -> i32 {
    let mut current = 0;
    let mut total = 0;
    while current <= limit {
        if current % 2 == 0 {
            total += current;
        }
        current += 1;
    }
    total
}`;

const sumEvenTests = `#[test]
fn sums_even_values_through_the_inclusive_limit() {
    assert_eq!(sum_even_to(-4), 0);
    assert_eq!(sum_even_to(0), 0);
    assert_eq!(sum_even_to(1), 0);
    assert_eq!(sum_even_to(6), 12);
}

#[test]
fn includes_the_boundary_and_skips_odd_values() {
    assert_eq!(sum_even_to(9), 20);
    assert_eq!(sum_even_to(10), 30);
}`;

const countUpSolution = `fn count_up(start: i32, target: i32) -> i32 {
    let mut current = start;
    let mut steps = 0;
    while current < target {
        current += 1;
        steps += 1;
    }
    steps
}`;

const countUpTests = `#[test]
fn counts_forward_steps_and_handles_equal_or_reversed_inputs() {
    assert_eq!(count_up(0, 0), 0);
    assert_eq!(count_up(2, 2), 0);
    assert_eq!(count_up(2, 7), 5);
    assert_eq!(count_up(8, 3), 0);
}

#[test]
fn counts_the_small_boundary_moves() {
    assert_eq!(count_up(0, 1), 1);
    assert_eq!(count_up(19, 20), 1);
}`;

export const loopsLessons: Lesson[] = [
  {
    id: "while-progress",
    moduleId: "loops-control",
    conceptIds: ["while-progress"],
    competencyIds: ["while-progress"],
    prerequisites: ["foundations-assessment"],
    title: "while: zaplanuj postęp",
    subtitle:
      "Zatrzymaj powtarzanie przez warunek, aktualizację stanu i małą, jawną granicę.",
    minutes: 18,
    outcomes: [
      "Rozpoznasz stan, warunek i aktualizację w pętli while.",
      "Wyjaśnisz, dlaczego mut i zmiana licznika są potrzebne do postępu.",
      "Napiszesz dwie funkcje liczbowe z przypadkami pustymi i granicznymi.",
    ],
    steps: [
      choose(
        "while-predict",
        "predict",
        "Przewidź warunek i postęp",
        "Przeczytaj kod: current zaczyna od 1, warunek to current <= 4, a aktualizacja dodaje 1. Ile razy wykona się ciało i jaka wartość current zostanie po pętli?",
        1,
        [
          "Cztery razy, a current pozostanie równe 4",
          "Cztery razy, a current będzie równe 5",
          "Ani razu, bo while wymaga zakresu zamiast warunku",
        ],
        [
          "Po czwartej iteracji current zostanie zwiększone, więc warunek sprawdzi jeszcze 5 i zakończy pętlę.",
          "Warunek jest sprawdzany przed iteracją, a aktualizacja wykona się także po current = 4; wynik końcowy to 5.",
          "while przyjmuje wartość bool jako warunek; zakres nie jest wymagany.",
        ],
        whileRunCode,
      ),
      run(
        "while-run",
        "Uruchom skończoną pętlę",
        "Uruchom przykład i porównaj sumę z przewidywaniem. Widać końcowy stan licznika, więc testujemy również aktualizację, a nie samą liczbę iteracji.",
        whileRunCode,
        "10|5\n",
      ),
      compilerError(
        "while-error",
        "Zobacz brak mut",
        "Uruchom kod i odczytaj E0384. Sam warunek nie zmienia wiązania; naprawa dodaje mut do licznika. Błąd kompilacji jest tu eksperymentem diagnostycznym.",
        whileBroken,
        whileFixed,
        "E0384",
      ),
      choose(
        "while-explain",
        "explain",
        "Wybierz gwarancję końca",
        "Która zasada najlepiej opisuje bezpieczny starter pętli while dla danych w zakresie 0..=20?",
        0,
        [
          "Ustal start, warunek i zmianę stanu; testuj także granicę 0 i 20",
          "Wystarczy wpisać true, bo użytkownik może zatrzymać program ręcznie",
          "Dodaj dużą liczbę iteracji bez opisu tego, kiedy pętla ma się skończyć",
        ],
        [
          "Jawna granica i postęp pozwalają przewidzieć wykonanie oraz uniknąć nieskończonego startera.",
          "true nie kończy pętli; taka rada nie daje bezpiecznego programu do uruchomienia.",
          "Sam limit bez kontraktu danych nie wyjaśnia zachowania funkcji ani jej przypadków granicznych.",
        ],
      ),
      coding({
        id: "while-modify",
        kind: "modify",
        title: "Napraw sumę parzystych",
        prompt:
          "Uzupełnij `sum_even_to`. Dla limitu z zakresu -10..=20 zwróć sumę liczb parzystych od 0 do limitu włącznie; dla limitu ujemnego wynik ma być 0. Użyj while z jawnym licznikiem i postępem. Testy oceniają zachowanie funkcji, więc przejście testów nie dowodzi użycia konkretnej składni.",
        code: sumEvenStarter,
        solution: sumEvenSolution,
        tests: sumEvenTests,
        gate: true,
        hints: [
          "Sprawdź, czy rozpatrujesz także zero i parzystą wartość równą limitowi.",
          "Warunek while jest sprawdzany przed iteracją. Postęp musi następować także wtedy, gdy bieżąca liczba nie trafia do sumy.",
        ],
      }),
      coding({
        id: "while-blank",
        kind: "blank",
        title: "Od pustej strony: policz kroki",
        prompt:
          "Zaprojektuj funkcję `count_up` przyjmującą kolejno start i target typu i32 z zakresu 0..=20 i zwracającą i32. Funkcja ma zwrócić liczbę kroków potrzebnych, by przejść od `start` do `target`, zwiększając wartość o 1; gdy start jest równy lub większy od target, zwróć 0. Zapisz własny podpis i implementację z while. Nie dostajesz startera ani podpisu; testy sprawdzą zero, ruch do przodu i wejście odwrócone.",
        code: "",
        solution: countUpSolution,
        tests: countUpTests,
        gate: true,
        hints: [
          "Rozważ najpierw wejście, które nie wymaga ani jednego kroku.",
          "Warunek powinien opisywać nieosiągnięty cel. Stan licznika i liczba wykonanych kroków mają różne wartości początkowe.",
        ],
      }),
    ],
    misconceptions: [
      "while sam zmienia licznik, nawet gdy ciało nie ma przypisania.",
      "mut można dodać dopiero przy warunku, bez zmiany deklaracji.",
      "Limit iteracji zastępuje opis kontraktu danych.",
    ],
    transferTask:
      "Napisz funkcję z while dla małego zakresu liczb, podaj jej start, warunek, aktualizację i przypadek brzegowy, a potem dodaj test z zerem oraz końcem zakresu.",
    evidenceGate:
      "Zadania while-modify i while-blank przechodzą niezależne testy dla ujemnego limitu, zera, granicy włącznie oraz wejścia odwróconego.",
    sourceIds: ["loops-book-control-flow", "loops-book-tests"],
  },
  {
    id: "loop-values",
    moduleId: "loops-control",
    conceptIds: ["loop-values"],
    competencyIds: ["loop-values"],
    prerequisites: ["while-progress"],
    title: "loop: znajdź i zwróć wartość",
    subtitle: "Zamień pętlę na wyrażenie, gdy break ma oddać znaleziony wynik.",
    minutes: 20,
    outcomes: [
      "Odróżnisz zwykłe break od break z wartością w loop.",
      "Rozpoznasz, dlaczego while z break wartością kończy się E0571.",
      "Zaprojektujesz jawne zachowanie dla braku znalezionego wyniku.",
    ],
    steps: [
      choose(
        "values-predict",
        "predict",
        "Przewidź wartość loop",
        "Pętla zwiększa candidate od 2 i kończy się przez `break candidate`, gdy candidate jest podzielne przez 3. Jaka liczba trafi do result?",
        2,
        [
          "2, bo to pierwsza wartość candidate",
          "3, ale result zawsze ma typ ()",
          "3, bo wyrażenie przy break staje się wartością loop",
        ],
        [
          "Pierwsza wartość nie spełnia warunku podzielności, więc pętla idzie dalej.",
          "loop może zwracać wartość; nie każde break kończy się typem jednostkowym.",
          "Wartość wyrażenia przy break ustala wynik loop; tutaj pierwszą pasującą liczbą jest 3.",
        ],
        valuesRunCode,
      ),
      run(
        "values-run",
        "Uruchom wyszukiwanie",
        "Uruchom skończone wyszukiwanie. Zakres kandydata jest jawnie ograniczony warunkiem limitu, więc przykład nie zostawia uruchamialnej nieskończonej pętli.",
        valuesRunCode,
        "3\n",
      ),
      compilerError(
        "values-error",
        "Sprawdź ograniczenie while",
        "Uruchom eksperyment. Rust nie pozwala oddać wartości przez break z while; E0571 wskazuje, dlaczego do wyniku wybieramy loop.",
        `fn first_multiple(limit: i32) -> i32 {
    let mut candidate = 1;
    while candidate <= limit {
        if candidate % 3 == 0 {
            break candidate;
        }
        candidate += 1;
    }
    -1
}`,
        `fn first_multiple(limit: i32) -> i32 {
    let mut candidate = 1;
    loop {
        if candidate > limit {
            break -1;
        }
        if candidate % 3 == 0 {
            break candidate;
        }
        candidate += 1;
    }
}`,
        "E0571",
      ),
      coding({
        id: "values-modify",
        kind: "modify",
        title: "Napraw pierwszą wielokrotność",
        prompt:
          "Uzupełnij `first_multiple_at_least`. Dla startu i limitu z zakresu 0..=100 oraz dodatniego stepu 1..=20 zwróć pierwszą liczbę od start do limitu włącznie podzielną przez step. Jeśli jej nie ma, zwróć -1. Użyj loop i break z wartością; testy sprawdzają wynik i granice, a sukces testów ocenia zachowanie funkcji, nie dowodzi konkretnej składni.",
        code: `fn first_multiple_at_least(start: i32, step: i32, limit: i32) -> i32 {
    -1
}`,
        solution: `fn first_multiple_at_least(start: i32, step: i32, limit: i32) -> i32 {
    let mut candidate = start;
    loop {
        if candidate > limit {
            break -1;
        }
        if candidate % step == 0 {
            break candidate;
        }
        candidate += 1;
    }
}`,
        tests: `#[test]
fn finds_the_first_matching_value_inclusive() {
    assert_eq!(first_multiple_at_least(1, 3, 10), 3);
    assert_eq!(first_multiple_at_least(6, 3, 10), 6);
    assert_eq!(first_multiple_at_least(7, 3, 10), 9);
}

#[test]
fn reports_no_match_and_respects_the_limit() {
    assert_eq!(first_multiple_at_least(8, 3, 8), -1);
    assert_eq!(first_multiple_at_least(0, 5, 0), 0);
    assert_eq!(first_multiple_at_least(99, 20, 99), -1);
}`,
        gate: true,
        hints: [
          "Rozdziel dwa powody zakończenia: znalezienie liczby oraz wyczerpanie dozwolonego zakresu.",
          "Każda ścieżka break musi zwracać ten sam typ. Warunek podzielności można sprawdzić resztą z dzielenia, a niepasujący kandydat wymaga postępu.",
        ],
      }),
      choose(
        "values-explain",
        "explain",
        "Rozpoznaj kontrakt wyniku",
        "Który kontrakt jest spójny z funkcją zwracającą liczby i używającą loop do wyszukania?",
        0,
        [
          "Każde break zwraca i32, a brak wyniku jest oznaczony uzgodnioną liczbą -1",
          "Wynik loop może raz być i32, a raz tekstem, zależnie od gałęzi",
          "break z wartością działa tak samo w while i loop",
        ],
        [
          "Wszystkie ścieżki break muszą mieć zgodny typ, a -1 jest tu częścią jawnego kontraktu braku wyniku.",
          "Wyrażenie musi mieć jeden zgodny typ wyniku; mieszanie liczb i tekstu nie spełnia kontraktu.",
          "Wartości break są dostępne dla loop; while odrzuca break z wartością i daje E0571.",
        ],
      ),
      coding({
        id: "values-blank",
        kind: "blank",
        title: "Od pustej strony: ostatnia potęga dwójki",
        prompt:
          "Zaprojektuj `largest_power_of_two` dla limitu i32 z zakresu 0..=1_000_000. Zwróć największą dodatnią potęgę dwójki nie większą od limitu; dla limitu 0 zwróć 0. Wynik ma powstawać w wyrażeniu loop. Wynik funkcji także jest typu i32. Napisz własny podpis i całe ciało; testy obejmują małe wartości, granicę i większy limit.",
        code: "",
        solution: `fn largest_power_of_two(limit: i32) -> i32 {
    if limit < 1 {
        return 0;
    }
    let mut value = 1;
    loop {
        let next = value * 2;
        if next > limit {
            break value;
        }
        value = next;
    }
}`,
        tests: `#[test]
fn finds_the_largest_power_without_overshooting() {
    assert_eq!(largest_power_of_two(0), 0);
    assert_eq!(largest_power_of_two(1), 1);
    assert_eq!(largest_power_of_two(2), 2);
    assert_eq!(largest_power_of_two(7), 4);
    assert_eq!(largest_power_of_two(20), 16);
}

#[test]
fn handles_a_large_allowed_limit() {
    assert_eq!(largest_power_of_two(1_000_000), 524_288);
}`,
        gate: true,
        hints: [
          "Co jest pierwszą dodatnią potęgą dwójki i dla którego wejścia żadna taka potęga nie pasuje?",
          "Porównaj następne podwojenie z limitem, zanim stracisz ostatnią pasującą wartość. To ona powinna stać się wynikiem loop.",
        ],
      }),
    ],
    misconceptions: [
      "Każda pętla zwraca wartość ostatniej iteracji bez użycia break.",
      "break z wartością można wstawić do while, bo obie konstrukcje są pętlami.",
      "Brak znalezionego wyniku nie wymaga części kontraktu funkcji.",
    ],
    transferTask:
      "Zaprojektuj liczbową funkcję wyszukującą wynik w małym, ograniczonym zakresie; opisz wartość break dla sukcesu i osobną wartość dla braku dopasowania.",
    evidenceGate:
      "Zadania values-modify i values-blank sprawdzają zgodny wynik loop, przypadek braku dopasowania, zero oraz granicę bez opierania zaliczenia na samej nazwie składni.",
    sourceIds: [
      "loops-book-control-flow",
      "loops-reference-expressions",
      "loops-error-e0571",
      "loops-book-tests",
    ],
  },
  {
    id: "loop-control",
    moduleId: "loops-control",
    conceptIds: ["loop-control"],
    competencyIds: ["loop-control"],
    prerequisites: ["loop-values"],
    title: "Sterowanie pętlą: pomiń albo wyjdź",
    subtitle:
      "Prześledź continue, break i etykiety w małych zagnieżdżonych obliczeniach.",
    minutes: 20,
    outcomes: [
      "Przewidzisz, którą iterację pomija continue i z której pętli wychodzi break.",
      "Użyjesz etykiety do zakończenia wybranego poziomu zagnieżdżenia.",
      "Napiszesz dwie funkcje liczbowe z testami zachowania i granic.",
    ],
    steps: [
      choose(
        "control-predict",
        "predict",
        "Przewidź wyjście z pętli",
        "Przeczytaj obie pętle. Etykieta rows wybiera pętlę zewnętrzną: continue zaczyna jej kolejną iterację, a break ją kończy. Jaką sumę wypisze program? Uwzględnij, które pary dotrą do dodawania.",
        0,
        [
          "67: wiersz 1 i tylko pierwsza kolumna wiersza 3",
          "112: continue pomija tylko parę (2,1), a break wychodzi z pętli wewnętrznej",
          "36: continue kończy całe wyszukiwanie przed wierszem 2",
        ],
        [
          "Do sumy trafiają 11 + 12 + 13 + 31 = 67. continue pomija cały wiersz 2, a break kończy rows przed dodaniem pary (3,2).",
          "112 byłoby wynikiem bez etykiet, gdy sterowanie dotyczyłoby tylko pętli wewnętrznej. Tutaj cel obu instrukcji to rows.",
          "36 obejmuje tylko pierwszy wiersz. continue nie kończy rows: przechodzi do wiersza 3, który dodaje jeszcze 31.",
        ],
        controlRunCode,
      ),
      run(
        "control-run",
        "Uruchom zagnieżdżone sterowanie",
        "Uruchom przykład i policz składniki sumy: wiersz 2 jest pominięty przez continue, a spotkanie (3,2) kończy pętlę rows przez break z etykietą. To test zachowania konkretnego kodu, nie dowód pełnej reguły składni.",
        controlRunCode,
        "67\n",
      ),
      choose(
        "control-explain",
        "explain",
        "Wybierz najbliższy poziom",
        "Masz zwykłą pętlę `for value in 0..limit` i chcesz pominąć tylko wartości parzyste. Które narzędzie pasuje?",
        1,
        [
          "break, bo każda parzysta wartość ma zakończyć całe obliczenie",
          "continue, bo reszta bieżącej iteracji ma zostać pominięta",
          "break 'outer, nawet gdy nie ma zagnieżdżonej pętli outer",
        ],
        [
          "break kończy pętlę, więc nie pozwoli przetworzyć późniejszych wartości.",
          "continue pomija dodanie dla jednej iteracji i przechodzi do kolejnej wartości.",
          "Etykieta musi wskazywać istniejącą pętlę; tu nie potrzeba etykiety.",
        ],
      ),
      coding({
        id: "control-modify",
        kind: "modify",
        title: "Napraw sumowanie z continue",
        prompt:
          "Uzupełnij `sum_odd_below`. Dla limitu z zakresu 0..=20 zwróć sumę dodatnich liczb nieparzystych mniejszych od limitu. Użyj pętli z continue do pomijania zera i liczb parzystych; testy oceniają wynik dla pustego, granicznego i zwykłego wejścia, więc przejście testów nie dowodzi konkretnego układu instrukcji.",
        code: `fn sum_odd_below(limit: i32) -> i32 {
    0
}`,
        solution: `fn sum_odd_below(limit: i32) -> i32 {
    let mut total = 0;
    for value in 0..limit {
        if value == 0 || value % 2 == 0 {
            continue;
        }
        total += value;
    }
    total
}`,
        tests: `#[test]
fn sums_only_positive_odds_below_limit() {
    assert_eq!(sum_odd_below(0), 0);
    assert_eq!(sum_odd_below(1), 0);
    assert_eq!(sum_odd_below(2), 1);
    assert_eq!(sum_odd_below(8), 16);
}

#[test]
fn excludes_the_limit_when_it_is_odd() {
    assert_eq!(sum_odd_below(9), 16);
    assert_eq!(sum_odd_below(20), 100);
}`,
        gate: true,
        hints: [
          "Zakres 0..limit nie zawiera limitu; sprawdź parzystość przed dodaniem value.",
          "continue powinno przejść do następnej iteracji dla zera i wartości podzielnych przez 2.",
        ],
      }),
      choose(
        "control-recall",
        "recall",
        "Przypomnij rolę etykiety",
        "Dlaczego etykieta jest użyteczna przy szukaniu pierwszej pary liczb w dwóch pętlach?",
        2,
        [
          "Nadaje obu pętlom ten sam licznik",
          "Zamienia każdą pętlę w nieskończoną",
          "Pozwala break zakończyć wybrany poziom zamiast tylko najbliższej pętli",
        ],
        [
          "Etykieta nie zmienia liczników; wybiera cel sterowania.",
          "Etykieta sama nie wpływa na warunek zakończenia.",
          "To jawny sposób wyjścia z zagnieżdżenia po znalezieniu wyniku.",
        ],
      ),
      coding({
        id: "control-blank",
        kind: "blank",
        title: "Od pustej strony: pierwsza para",
        prompt:
          "Zaprojektuj `first_pair_product_over`. Przeszukaj pary x i y od 1 do 10 w kolejności wierszowej i zwróć pierwszy iloczyn większy od limitu i32 z zakresu 0..=100. Jeśli żadna para nie pasuje, zwróć -1. Rozwiązanie ma ćwiczyć etykiety pętli. Wynik jest typu i32; kolejność wierszowa oznacza zmianę y wewnątrz ustalonego x. Napisz własny podpis oraz implementację bez kolekcji; testy sprawdzą kolejność, próg i brak wyniku.",
        code: "",
        solution: `fn first_pair_product_over(limit: i32) -> i32 {
    let mut found = -1;
    'search: for x in 1..=10 {
        for y in 1..=10 {
            let product = x * y;
            if product > limit {
                found = product;
                break 'search;
            }
        }
    }
    found
}`,
        tests: `#[test]
fn returns_the_first_product_in_row_major_order() {
    assert_eq!(first_pair_product_over(0), 1);
    assert_eq!(first_pair_product_over(1), 2);
    assert_eq!(first_pair_product_over(9), 10);
    assert_eq!(first_pair_product_over(10), 12);
}

#[test]
fn reports_no_product_above_the_limit() {
    assert_eq!(first_pair_product_over(100), -1);
}`,
        gate: true,
        hints: [
          "Rozpisz pierwsze kilka par wierszami. Zastanów się, co powinno zostać wynikiem, gdy żadna para nie pasuje.",
          "Zwykłe break wychodzi tylko z najbliższej pętli. Etykieta pozwala zakończyć wybrany poziom po zachowaniu pierwszego wyniku.",
        ],
      }),
    ],
    misconceptions: [
      "continue kończy wszystkie poziomy zagnieżdżenia.",
      "break bez etykiety zawsze kończy pętlę zewnętrzną.",
      "Etykieta jest alternatywną nazwą zmiennej i nie wpływa na sterowanie.",
    ],
    transferTask:
      "Zaprojektuj małe zagnieżdżone wyszukiwanie liczbowe, wskaż iteracje pomijane przez continue, cel break i zachowanie po braku wyniku.",
    evidenceGate:
      "Zadania control-modify i control-blank sprawdzają pomijanie iteracji, kolejność par, wyjście etykietą i brak dopasowania przez niezależne asercje.",
    sourceIds: [
      "loops-book-control-flow",
      "loops-reference-expressions",
      "loops-book-tests",
    ],
  },
];

const reviewWhileSolution = `fn count_even_down(start: i32) -> i32 {
    let mut current = start;
    let mut count = 0;
    while current >= 0 {
        if current % 2 == 0 {
            count += 1;
        }
        current -= 1;
    }
    count
}`;

const reviewWhileTests = `#[test]
fn counts_even_values_down_to_zero() {
    assert_eq!(count_even_down(-1), 0);
    assert_eq!(count_even_down(0), 1);
    assert_eq!(count_even_down(1), 1);
    assert_eq!(count_even_down(6), 4);
}

#[test]
fn handles_the_upper_allowed_boundary() {
    assert_eq!(count_even_down(20), 11);
}`;

const reviewValuesSolution = `fn last_power_of_two(limit: i32) -> i32 {
    if limit < 1 {
        return 0;
    }
    let mut value = 1;
    loop {
        let next = value * 2;
        if next > limit {
            break value;
        }
        value = next;
    }
}`;

const reviewValuesTests = `#[test]
fn returns_the_last_power_not_above_limit() {
    assert_eq!(last_power_of_two(0), 0);
    assert_eq!(last_power_of_two(1), 1);
    assert_eq!(last_power_of_two(5), 4);
    assert_eq!(last_power_of_two(32), 32);
}

#[test]
fn handles_a_limit_between_powers() {
    assert_eq!(last_power_of_two(33), 32);
    assert_eq!(last_power_of_two(100), 64);
}

#[test]
fn retains_the_full_advertised_limit_domain() {
    assert_eq!(last_power_of_two(255), 128);
    assert_eq!(last_power_of_two(256), 256);
    assert_eq!(last_power_of_two(257), 256);
    assert_eq!(last_power_of_two(524_287), 262_144);
    assert_eq!(last_power_of_two(524_288), 524_288);
    assert_eq!(last_power_of_two(1_000_000), 524_288);
}`;

const reviewControlSolution = `fn first_pair_sum_at_least(limit: i32) -> i32 {
    let mut found = -1;
    'search: for left in 0..=10 {
        for right in 0..=10 {
            let sum = left + right;
            if sum >= limit {
                found = sum;
                break 'search;
            }
        }
    }
    found
}`;

const reviewControlTests = `#[test]
fn returns_the_first_row_major_sum_at_or_above_limit() {
    assert_eq!(first_pair_sum_at_least(0), 0);
    assert_eq!(first_pair_sum_at_least(1), 1);
    assert_eq!(first_pair_sum_at_least(10), 10);
}

#[test]
fn respects_the_largest_possible_sum_and_no_match() {
    assert_eq!(first_pair_sum_at_least(11), 11);
    assert_eq!(first_pair_sum_at_least(20), 20);
    assert_eq!(first_pair_sum_at_least(21), -1);
}`;

export const loopsReviewExercises: Record<string, LessonStep> = {
  "while-progress": coding({
    id: "review-while-progress",
    kind: "apply",
    title: "Powtórka: policz parzyste w dół",
    prompt:
      "Uzupełnij `count_even_down` dla startu z zakresu -1..=20. Zwróć liczbę parzystych wartości od start do zera włącznie; dla startu ujemnego zwróć 0. Testy obejmują zero, granicę i zwykły przypadek.",
    code: `fn count_even_down(start: i32) -> i32 {
    0
}`,
    solution: reviewWhileSolution,
    tests: reviewWhileTests,
    hints: [
      "Warunek powinien pozwolić na sprawdzenie zera, a po każdej iteracji current ma maleć.",
      "Zwiększ count tylko dla current % 2 == 0 i zwróć count po zakończeniu.",
    ],
  }),
  "loop-values": coding({
    id: "review-loop-values",
    kind: "apply",
    title: "Powtórka: ostatnia potęga",
    prompt:
      "Uzupełnij `last_power_of_two` dla limitu 0..=1_000_000. Oddaj największą dodatnią potęgę dwójki nie większą od limitu, albo 0 dla limitu 0. Testy sprawdzą dokładne potęgi i wartości pomiędzy nimi.",
    code: `fn last_power_of_two(limit: i32) -> i32 {
    0
}`,
    solution: reviewValuesSolution,
    tests: reviewValuesTests,
    hints: [
      "Zacznij od 1 po obsłużeniu limitu 0 i wyznaczaj next przez podwojenie.",
      "Gdy next przekracza limit, wynik jest bieżącym value i można zakończyć loop.",
    ],
  }),
  "loop-control": coding({
    id: "review-loop-control",
    kind: "apply",
    title: "Powtórka: pierwsza suma pary",
    prompt:
      "Uzupełnij `first_pair_sum_at_least`. Przeszukaj left i right od 0 do 10 w kolejności wierszowej, zwróć pierwszy sum >= limit, a gdy nie ma dopasowania zwróć -1. Użyj etykiety do wyjścia z obu pętli; testy sprawdzą zero, próg i brak wyniku.",
    code: `fn first_pair_sum_at_least(limit: i32) -> i32 {
    -1
}`,
    solution: reviewControlSolution,
    tests: reviewControlTests,
    hints: [
      "Przechowaj -1 jako wynik domyślny i oblicz sum w obu pętlach.",
      "Po pierwszym sum >= limit przypisz found i wykonaj break 'search.",
    ],
  }),
};

export const loopsModule: CourseModule = {
  id: "loops-control",
  title: "Pętle: postęp, wynik i sterowanie",
  whyItMatters:
    "Pętle pozwalają powtarzać małe obliczenia, zatrzymywać wyszukiwanie po znalezieniu wyniku i jawnie opisywać, która iteracja ma zostać pominięta. Te zachowania są podstawą czytelnych algorytmów liczbowych.",
  capabilities: [
    "Budujesz kończące się while z warunkiem, postępem i granicą.",
    "Zwracasz wynik przez loop i break oraz opisujesz brak dopasowania.",
    "Stosujesz continue, break i etykiety w zagnieżdżonych pętlach.",
  ],
  prerequisites: ["rust-foundations"],
  lessonIds: loopsLessons.map((lesson) => lesson.id),
  exitGate: [
    "while przechodzi przez zero, zwykły przypadek i granicę bez nieskończonego startera.",
    "loop zwraca zgodną wartość break i obsługuje brak wyniku bez użycia nieobjaśnionych typów.",
    "continue, break i etykieta dają przewidywalną kolejność oraz kończą właściwy poziom pętli.",
  ],
  projectConnection:
    "Późniejsze zadania będą używać tych samych kontraktów pętli do skanowania ograniczonej liczby rekordów. Najpierw ćwiczysz samą kontrolę i wynik na liczbach, aby każdy przypadek dało się prześledzić testem.",
  assessmentId: "loop-control/control-blank",
  gateCriteria: [
    {
      id: "while-progress-gate",
      label: "while ma jawny warunek, postęp i granice",
      taskRefs: [
        { lessonId: "while-progress", stepId: "while-modify" },
        { lessonId: "while-progress", stepId: "while-blank" },
      ],
    },
    {
      id: "loop-values-gate",
      label: "loop zwraca wynik i opisuje brak dopasowania",
      taskRefs: [
        { lessonId: "loop-values", stepId: "values-modify" },
        { lessonId: "loop-values", stepId: "values-blank" },
      ],
    },
    {
      id: "loop-control-gate",
      label: "Sterowanie wybiera iterację i poziom wyjścia",
      taskRefs: [
        { lessonId: "loop-control", stepId: "control-modify" },
        { lessonId: "loop-control", stepId: "control-blank" },
      ],
    },
  ],
};
