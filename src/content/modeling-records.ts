import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const recordsSources: Source[] = [
  {
    id: "records-book-slices",
    title: "The Rust Programming Language: The Slice Type",
    url: "https://doc.rust-lang.org/book/ch04-03-slices.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu wycinków, zakresów i konwersji String do &str.",
  },
  {
    id: "records-std-str",
    title: "Rust Standard Library: str",
    url: "https://doc.rust-lang.org/std/primitive.str.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie reguł granic UTF-8 lub metod as_bytes i is_char_boundary.",
  },
  {
    id: "records-book-structs",
    title: "The Rust Programming Language: Defining and Instantiating Structs",
    url: "https://doc.rust-lang.org/book/ch05-01-defining-structs.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów nazwanych pól i przechowywania String w strukturach.",
  },
  {
    id: "records-book-methods",
    title: "The Rust Programming Language: Method Syntax",
    url: "https://doc.rust-lang.org/book/ch05-03-method-syntax.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie składni impl, receiverów self lub aliasu Self.",
  },
  {
    id: "records-book-arrays-tuples",
    title: "The Rust Programming Language: Data Types",
    url: "https://doc.rust-lang.org/book/ch03-02-data-types.html",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj po zmianie opisanego kontraktu lub wspieranego toolchaina.",
  },
];

export const recordsCompetencies: Competency[] = [
  {
    id: "slice-boundaries",
    title:
      "Dobieraj wycinek, zakres i indeks oraz sprawdzaj granice danych bez przejmowania własności.",
  },
  {
    id: "data-records",
    title:
      "Modeluj powiązane dane nazwanymi polami i świadomie wybieraj wartości posiadane.",
  },
  {
    id: "method-design",
    title:
      "Projektuj metody odczytu i zmiany stanu z właściwym receiverem oraz kontraktem konstruktora.",
  },
];

export const recordsConcepts: Concept[] = [
  {
    id: "slice-views",
    title: "Wycinki jako pożyczone widoki",
    prerequisites: ["shared-borrow"],
    competencyIds: ["slice-boundaries"],
    reviewPrompt:
      "Co opisuje `&[i32]`, a co opisuje `&str`, gdy tworzysz widok z istniejących danych?",
    reviewAnswer:
      "Oba typy są pożyczonymi, współdzielonymi widokami na ciągły fragment danych. `&[i32]` widzi elementy tablicy, a `&str` widzi poprawny fragment tekstu UTF-8; żaden nie przejmuje własności.",
    distinguish:
      "Wycinek ma początek i długość, lecz nie posiada danych. Zakres `start..end` wyznacza indeksy, a dla `str` granice muszą wypadać na granicach znaków UTF-8.",
  },
  {
    id: "struct-records",
    title: "Rekord z nazwanymi polami",
    prerequisites: ["slice-views", "function-ownership"],
    competencyIds: ["data-records"],
    reviewPrompt:
      "Dlaczego rekord może mieć pole `name: String`, gdy ma przechowywać własną nazwę poza funkcją, która go utworzyła?",
    reviewAnswer:
      "`String` daje rekordowi własność bufora tekstu. Rekord może więc przeżyć funkcję tworzącą i sam odpowiada za ten tekst, a `&str` wymagałby danych żyjących wystarczająco długo poza rekordem.",
    distinguish:
      "Nazwane pole nazywa część rekordu i pozwala odwołać się do niej przez kropkę. `String` jest własnością rekordu; `&str` jest pożyczonym widokiem i w strukturze wymagałby później jawnych adnotacji lifetime.",
  },
  {
    id: "method-receivers",
    title: "Metody i receiver stanu",
    prerequisites: ["struct-records", "mutable-borrow"],
    competencyIds: ["method-design"],
    reviewPrompt:
      "Kiedy użyć `&self`, kiedy `&mut self`, a kiedy `Self` w prostym `impl`?",
    reviewAnswer:
      "`&self` służy metodzie tylko do odczytu, `&mut self` pozwala jej zmienić instancję, a `Self` oznacza typ opisany przez `impl`, często w wyniku konstruktora.",
    distinguish:
      "`self` w receiverze mówi, jak metoda korzysta z instancji. `Self` w typie wyniku nie jest pożyczką i oznacza nazwany typ, na przykład `Counter`.",
  },
];

const sliceGateTests = `#[test]
fn sums_empty_and_middle_ranges() {
    let values = [4, -2, 9, 3];
    assert_eq!(sum_between(&values, 0, 0), 0);
    assert_eq!(sum_between(&values, 1, 3), 7);
}

#[test]
fn works_for_a_different_array_and_full_range() {
    let values = [-5, 10, 2];
    assert_eq!(sum_between(&values, 0, 3), 7);
    assert_eq!(sum_between(&values, 2, 3), 2);
}`;

const sliceEdgeGateTests = `#[test]
fn reads_the_last_element_after_a_single_item() {
    assert_eq!(last_value(&[42]), 42);
}

#[test]
fn reads_the_last_element_for_other_arrays() {
    assert_eq!(last_value(&[-4, 8, 15]), 15);
    assert_eq!(last_value(&[0, 0, -9, 6]), 6);
}`;

const recordsGateTests = `#[test]
fn formats_empty_and_negative_records() {
    assert_eq!(format_record(&Record { name: String::from(""), count: 0 }), "#0:");
    assert_eq!(format_record(&Record { name: String::from("beta"), count: -3 }), "#-3: beta");
}

#[test]
fn formats_a_second_owned_record() {
    let record = Record { name: String::from("todo"), count: 12 };
    assert_eq!(format_record(&record), "#12: todo");
    assert_eq!(record.name, "todo");
}`;

const recordStateGateTests = `#[test]
fn empty_and_negative_counts_are_not_done() {
    assert!(!is_done(&Record { name: String::from("empty"), count: 0 }));
    assert!(!is_done(&Record { name: String::from("retry"), count: -1 }));
}

#[test]
fn positive_count_is_done_for_another_record() {
    assert!(is_done(&Record { name: String::from("ready"), count: 1 }));
}`;

const methodGateTests = `#[test]
fn constructor_starts_at_zero_and_updates_by_deltas() {
    let mut counter = Counter::new(String::from("build"));
    assert_eq!(counter.summary(), "build: 0");
    counter.add(4);
    counter.add(-1);
    assert_eq!(counter.summary(), "build: 3");
}

#[test]
fn handles_zero_and_a_different_name() {
    let mut counter = Counter::new(String::from("tests"));
    counter.add(0);
    assert_eq!(counter.summary(), "tests: 0");
    counter.add(2);
    assert_eq!(counter.summary(), "tests: 2");
}`;

const methodResetGateTests = `#[test]
fn reset_clears_a_nonzero_counter() {
    let mut counter = Counter::new(String::from("build"));
    counter.add(7);
    counter.reset();
    assert_eq!(counter.summary(), "build: 0");
}

#[test]
fn reset_does_not_change_another_counter() {
    let mut first = Counter::new(String::from("first"));
    let second = Counter::new(String::from("second"));
    first.add(-2);
    first.reset();
    assert_eq!(first.summary(), "first: 0");
    assert_eq!(second.summary(), "second: 0");
}`;

export const recordsLessons: Lesson[] = [
  {
    id: "slices-and-views",
    moduleId: "data-modeling",
    conceptIds: ["slice-views"],
    competencyIds: ["slice-boundaries"],
    prerequisites: ["scenario-assessment"],
    title: "Wycinki: patrz na dane bez przejmowania",
    subtitle:
      "Zbuduj małe widoki `&[i32]` i `&str`, świadomie wybierz zakres oraz zauważ granicę bajtów UTF-8.",
    minutes: 18,
    outcomes: [
      "Wyjaśnisz, że `&[i32]` i `&str` są pożyczonymi widokami.",
      "Użyjesz indeksu tablicy i zakresu `start..end` w funkcji z jawnym kontraktem.",
      "Rozpoznasz, że granice wycinka tekstu są liczone w bajtach i muszą być granicami UTF-8.",
    ],
    sessionStops: [
      {
        afterStepId: "slice-recall",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Rozróżnij tablicę, krotkę i widok, potem sprawdź prefiks. Szacunek czasu lekcji jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      {
        id: "slice-predict",
        kind: "predict",
        title: "Wybierz widok",
        prompt:
          "`let scores = [8, 13, 21]; let part = &scores[1..3];` Co oznacza `part` i co stanie się z własnością tablicy?",
        choices: [
          { id: "borrowed", label: "&[i32], widok dwóch elementów bez move" },
          { id: "copy", label: "Nowa tablica [i32; 2] skopiowana z scores" },
          { id: "owner", label: "part przejmuje całą tablicę scores" },
        ],
        evaluator: {
          kind: "choice",
          correct: "borrowed",
          explanations: {
            borrowed:
              "Poprawnie: zakres tworzy pożyczony wycinek od indeksu 1 włącznie do 3 wyłącznie.",
            copy: "Wycinek nie tworzy nowej tablicy ani nie kopiuje elementów.",
            owner:
              "`&` tworzy referencję, więc part nie przejmuje właściciela scores.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "Przeczytaj znak przed zakresem w `&scores[1..3]`.",
          "Pomyśl o widoku z początkiem i długością, a nie o drugim buforze.",
        ],
      },
      {
        id: "slice-run",
        kind: "run",
        title: "Zobacz dwa rodzaje widoku",
        prompt:
          "Tablica `[T; N]` ma N elementów jednego typu; długość należy do typu, więc `[i32; 3]` i `[i32; 2]` to różne typy. Krotka `(i32, bool)` ma ustalone pozycje, które mogą mieć różne typy; czytasz je jako `.0`, `.1`. `&[i32]` jest pożyczonym widokiem o długości ustalonej podczas wykonania, więc jedna funkcja może czytać różne tablice i ich fragmenty. `[0; 3]` to krótki zapis trzech zer. Tablica nie oznacza automatycznie konkretnego miejsca alokacji. `.len()` daje długość, a indeks musi być mniejszy od niej; złe indeksowanie panikuje. Bezpieczne `get` zwraca Option i poznasz je po lekcji o braku wartości. Po obecnych krokach czeka dodatkowa praktyka tablic i krotek. Uruchom kod. Zwróć uwagę, że `&[i32]` pokazuje elementy tablicy, a literał tekstowy ma typ `&str`. Funkcja `sum_first_two` zakłada co najmniej dwa elementy, a `prefix_five` działa tu tylko dla tekstu ASCII mającego co najmniej pięć bajtów. Tekst udostępnia zakresy, lecz pojedynczy zapis `text[0]` nie jest obsługiwany.",
        code: `fn sum_first_two(values: &[i32]) -> i32 {
    values[0] + values[1]
}

fn prefix_five(text: &str) -> &str {
    &text[0..5]
}

fn main() {
    let numbers = [7, 8, 9];
    println!("{} {}", sum_first_two(&numbers[0..2]), prefix_five("hello rust"));
}`,
        solution: `fn sum_first_two(values: &[i32]) -> i32 {
    values[0] + values[1]
}

fn prefix_five(text: &str) -> &str {
    &text[0..5]
}

fn main() {
    let numbers = [7, 8, 9];
    println!("{} {}", sum_first_two(&numbers[0..2]), prefix_five("hello rust"));
}`,
        evaluator: { kind: "exact-output", expected: "15 hello\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "Zakres tablicy jest pożyczany przez `&numbers[0..2]`.",
          "Zakres kończy się po pięciu bajtach ASCII słowa hello.",
        ],
      },
      {
        id: "slice-boundary-explain",
        kind: "explain",
        title: "Wyjaśnij bajty tekstu",
        prompt:
          'Który wariant poprawnie opisuje ograniczenie zakresu tekstu: `&"ab"[0..1]` może działać, a `&"żaba"[0..1]` przecina zapis pierwszego znaku i powoduje panikę?',
        choices: [
          {
            id: "bytes",
            label:
              "Zakres używa offsetów bajtowych; ASCII ma po jednym bajcie, a ż zajmuje dwa bajty w UTF-8.",
          },
          { id: "chars", label: "Zakres zawsze używa numerów znaków Unicode." },
          {
            id: "copy",
            label: "Zakres kopiuje tekst, więc granice nie mają znaczenia.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "bytes",
          explanations: {
            bytes:
              "Poprawnie: zakres str musi kończyć się na granicy UTF-8, a offsety są bajtowe.",
            chars: "Indeksowanie str nie używa prostego numeru znaku Unicode.",
            copy: "Wycinek nie kopiuje tekstu i nadal sprawdza granice UTF-8.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "slice-repair",
        kind: "debug",
        title: "Napraw typ widoku",
        prompt:
          "Starter próbuje przypisać wartość wycinka bez pożyczenia. Funkcja middle ma zwrócić pożyczone elementy z indeksów 1 i 2; wejście ma co najmniej trzy elementy. Dodaj brakującą referencję i sprawdź wynik testami.",
        code: `fn middle(values: &[i32]) -> &[i32] {
    values[1..3]
}`,
        solution: `fn middle(values: &[i32]) -> &[i32] {
    &values[1..3]
}`,
        evaluator: {
          kind: "tests",
          tests:
            "#[test] fn borrows_middle_values() { assert_eq!(middle(&[4, 8, 2]), &[8, 2]); assert_eq!(middle(&[-5, 0, 9, 7]), &[0, 9]); }",
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Sam zakres nie jest jeszcze referencją.",
          "Umieść `&` przed `values[1..3]`.",
        ],
      },
      {
        id: "slice-gate",
        kind: "modify",
        title: "Zaimplementuj sumę wycinka",
        prompt:
          "Kontrakt: napisz `fn sum_between(values: &[i32], start: usize, end: usize) -> i32`. `usize` jest typem używanym do indeksów. Zwróć sumę elementów w zakresie `start..end`; `start` jest włączone, `end` wyłączone, a wywołujący zapewnia `start <= end <= values.len()` oraz wszystkie sumy częściowe mieszczące się w i32. Użyj indeksowania tablicy lub wycinka i pętli. Starter zwraca złą wartość; napraw go tak, aby ukryte testy obejmowały pusty, środkowy i pełny zakres.",
        code: `fn sum_between(values: &[i32], start: usize, end: usize) -> i32 {
    let _view = &values[start..end];
    0
}`,
        solution: `fn sum_between(values: &[i32], start: usize, end: usize) -> i32 {
    let mut total = 0;
    for index in start..end {
        total = total + values[index];
    }
    total
}`,
        evaluator: { kind: "tests", tests: sliceGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Zakres `start..end` dostarcza indeksy do pętli, a `values[index]` daje pojedynczy i32.",
          "Zacznij od total = 0 i dodawaj każdy element przed zwróceniem total.",
        ],
      },
      {
        id: "slice-edge-gate",
        kind: "modify",
        title: "Odczytaj koniec widoku",
        prompt:
          "Kontrakt: napisz `fn last_value(values: &[i32]) -> i32`, zakładając, że wywołujący przekazuje co najmniej jeden element. Zwróć element na końcu wycinka. Starter zwraca pierwszy element; popraw go, aby testy sprawdziły tablicę jednoelementową i dwie inne tablice.",
        code: `fn last_value(values: &[i32]) -> i32 {
    values[0]
}`,
        solution: `fn last_value(values: &[i32]) -> i32 {
    values[values.len() - 1]
}`,
        evaluator: { kind: "tests", tests: sliceEdgeGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Długość wycinka mówi, gdzie jest ostatni indeks.",
          "Ostatni indeks to `values.len() - 1`; warunek niepustego wycinka jest częścią kontraktu.",
        ],
      },
      {
        id: "slice-recall",
        kind: "recall",
        title: "Odtwórz regułę wycinka",
        prompt: "Wybierz prawdziwe zdanie o `&str`.",
        choices: [
          {
            id: "view",
            label: "To pożyczony widok na poprawny fragment UTF-8.",
          },
          { id: "bytes", label: "To zawsze kopia bajtów String." },
          {
            id: "char-index",
            label: "Każdy indeks oznacza numer znaku Unicode.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "view",
          explanations: {
            view: "Poprawnie: &str nie posiada danych, a jego zakres używa granic bajtowych UTF-8.",
            bytes: "&str nie kopiuje bufora String.",
            "char-index":
              "Indeksy str są offsetami bajtowymi, nie prostym numerem znaku.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "slice-array-predict",
        kind: "predict",
        title: "Tablica, krotka czy widok?",
        prompt:
          "Masz `let data: [i32; 3] = [4, 0, -2]; let meta: (usize, bool) = (data.len(), true); let view: &[i32] = &data[1..];`. Który opis rozróżnia te trzy wartości?",
        choices: [
          {
            id: "0",
            label:
              "data posiada trzy i32; meta łączy usize i bool; view pożycza dwa i32",
          },
          {
            id: "1",
            label: "Wszystkie trzy mają typ [i32; 3]",
          },
          {
            id: "2",
            label: "view posiada nową tablicę, a meta ma zmienną liczbę pól",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "0",
          explanations: {
            "0": "Długość tablicy należy do typu, krotka ma typ każdej pozycji, a wycinek pożycza dane.",
            "1": "Typy i kształty są różne.",
            "2": "Widok nie tworzy tablicy; krotka ma stałą liczbę pozycji.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "slice-prefix-practice",
        kind: "modify",
        title: "Sprawdź pusty i pełny prefiks",
        prompt:
          "Napisz `fn sum_prefix(values: &[i32], end: usize) -> i32`: zsumuj elementy o indeksach od 0 do end wyłącznie. Wywołujący zapewnia `end <= values.len()` i każdą sumę częściową mieszczącą się w i32. Zachowaj pożyczony parametr i ten zakres; nie dodawaj ograniczenia na długość tablicy. `end == 0` daje pustą sumę 0, także dla pustej tablicy. Testy wywołają tę samą funkcję na różnych długościach oraz sprawdzą zero i skrajne i32 bez przepełnienia.",
        code: `fn sum_prefix(values: &[i32], end: usize) -> i32 {
    let _ = end;
    values[0]
}`,
        solution: `fn sum_prefix(values: &[i32], end: usize) -> i32 {
    let mut sum = 0;
    for index in 0..end {
        sum += values[index];
    }
    sum
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn prefixes_keep_range_and_owner() {
    assert_eq!(sum_prefix(&[], 0), 0);
    let values = [4, 0, -2, 8];
    assert_eq!(sum_prefix(&values, 0), 0);
    assert_eq!(sum_prefix(&values, 1), 4);
    assert_eq!(sum_prefix(&values, 3), 2);
    assert_eq!(sum_prefix(&values, 4), 10);
    assert_eq!(values, [4, 0, -2, 8]);
    assert_eq!(sum_prefix(&[i32::MIN], 1), i32::MIN);
    assert_eq!(sum_prefix(&[i32::MAX, -1], 2), i32::MAX - 1);
}`,
        },
        evidenceKind: "transfer",
        expectedStatus: "test-failure",
      },
    ],
    misconceptions: [
      "Wycinek kopiuje elementy do nowej tablicy.",
      "Indeks str oznacza numer znaku, więc każdy zakres bajtów jest bezpieczny.",
      "Przyjęcie `&[i32]` odbiera tablicę jej właścicielowi.",
    ],
    transferTask:
      "Zaprojektuj pomocnik przyjmujący `&[i32]`, który zwraca wynik dla pustego i niepustego zakresu, a potem sprawdź nową tablicę.",
    evidenceGate:
      "Bez kopiowania danych zaimplementuj sumę po jawnym kontrakcie zakresu; przejdą dwa niezależne przypadki tablicy oraz przypadek pusty.",
    sourceIds: [
      "records-book-slices",
      "records-std-str",
      "records-book-arrays-tuples",
    ],
  },
  {
    id: "structs-and-fields",
    moduleId: "data-modeling",
    conceptIds: ["struct-records"],
    competencyIds: ["data-records"],
    prerequisites: ["slices-and-views"],
    title: "Rekordy: nazwij dane, które należą do siebie",
    subtitle:
      "Zbuduj strukturę z nazwanymi polami i zobacz, dlaczego rekord przechowuje własny `String`.",
    minutes: 18,
    outcomes: [
      "Zdefiniujesz strukturę z polami `String` i liczbowym stanem.",
      "Utworzysz instancję i odczytasz pola przez kropkę.",
      "Wyjaśnisz, czemu prosty rekord początkującego używa owned `String`, a nie referencji.",
    ],
    steps: [
      {
        id: "record-predict",
        kind: "predict",
        title: "Rozpoznaj nazwane pole",
        prompt:
          "Dla `struct Note { title: String, done: bool }`, co oznacza `note.title`?",
        choices: [
          {
            id: "field",
            label: "Wartość pola title należącego do tej instancji",
          },
          { id: "method", label: "Wywołanie metody title bez nawiasów" },
          {
            id: "slice",
            label: "Pożyczony wycinek tekstu z dowolnego miejsca",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "field",
          explanations: {
            field:
              "Poprawnie: kropka bez nawiasów odczytuje nazwane pole instancji.",
            method: "Metodę rozpoznasz po nawiasach, na przykład note.title().",
            slice:
              "Pole może mieć typ String, ale sama kropka nie tworzy wycinka.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "Sprawdź, czy po nazwie title występują nawiasy.",
          "Definicja struct wymienia nazwę i typ każdego pola.",
        ],
      },
      {
        id: "record-run",
        kind: "run",
        title: "Utwórz rekord",
        prompt:
          "Uruchom kod i odczytaj pola przez kropkę. `String::from` przekazuje rekordowi własny tekst.",
        code: `struct Note {
    title: String,
    done: bool,
}

fn main() {
    let note = Note {
        title: String::from("kup mleko"),
        done: false,
    };
    println!("{}:{}", note.title, note.done);
}`,
        solution: `struct Note {
    title: String,
    done: bool,
}

fn main() {
    let note = Note {
        title: String::from("kup mleko"),
        done: false,
    };
    println!("{}:{}", note.title, note.done);
}`,
        evaluator: { kind: "exact-output", expected: "kup mleko:false\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "Instancja musi wypełnić każde pole nazwą i wartością.",
          "println! może odczytać String i bool przez pola.",
        ],
      },
      {
        id: "record-explain",
        kind: "explain",
        title: "Wybierz własność pola",
        prompt:
          "Dlaczego ten pierwszy rekord używa `title: String`, a lekcja nie wprowadza jeszcze `title: &str` w strukturze?",
        choices: [
          {
            id: "owned",
            label:
              "String posiada bufor; &str tylko pożycza dane i wymaga odpowiednio żyjącego źródła.",
          },
          {
            id: "copy",
            label: "String jest zawsze kopią, a &str zawsze nowym buforem.",
          },
          {
            id: "same",
            label:
              "String i &str mają identyczną własność, różni je tylko zapis.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "owned",
          explanations: {
            owned:
              "Poprawnie: owned String może należeć do rekordu, a zapisanie referencji wymagałoby później lifetime annotations.",
            copy: "String nie jest z definicji kopią, a &str nie tworzy bufora.",
            same: "String i &str różnią się właśnie własnością oraz sposobem przechowywania tekstu.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "record-repair",
        kind: "debug",
        title: "Nie przenoś pola dwa razy",
        prompt:
          "Starter przenosi `title` do zmiennej, a potem używa tego samego pola ponownie. Uprość funkcję tak, aby zwracała tytuł raz.",
        code: `struct Note {
    title: String,
}

fn take_title(note: Note) -> String {
    let title = note.title;
    title + &note.title
}`,
        solution: `struct Note {
    title: String,
}

fn take_title(note: Note) -> String {
    note.title
}`,
        evaluator: {
          kind: "tests",
          tests:
            '#[test] fn returns_the_owned_title() { assert_eq!(take_title(Note { title: String::from("Rust") }), "Rust"); assert_eq!(take_title(Note { title: String::from("żółw") }), "żółw"); assert_eq!(take_title(Note { title: String::new() }), ""); }',
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        hints: [
          "Po `let title = note.title` pole nie jest już dostępne przez note.",
          "Funkcja ma zwrócić posiadany tytuł, więc nie potrzebuje drugiego użycia pola.",
        ],
      },
      {
        id: "record-gate",
        kind: "modify",
        title: "Sformatuj rekord danych",
        prompt:
          "Kontrakt: zdefiniuj `struct Record { name: String, count: i32 }` oraz `fn format_record(record: &Record) -> String`. Zwróć `#{count}: {name}`; dla pustej nazwy zakończ wynik po dwukropku, bez końcowej spacji. Parametr jest pożyczony, więc wywołujący nadal posiada rekord. Starter ma zły format; popraw go, aby ukryte testy sprawdziły pustą nazwę, liczbę ujemną i drugi rekord. `format!` buduje własny String z szablonu.",
        code: `struct Record {
    name: String,
    count: i32,
}

fn format_record(record: &Record) -> String {
    format!("{}:{}", record.count, record.name)
}`,
        solution: `struct Record {
    name: String,
    count: i32,
}

fn format_record(record: &Record) -> String {
    if record.name.is_empty() {
        format!("#{}:", record.count)
    } else {
        format!("#{}: {}", record.count, record.name)
    }
}`,
        evaluator: { kind: "tests", tests: recordsGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Literalny prefiks to `#`, po nim count, dwukropek, spacja i name.",
          "format! może pożyczyć pola przez format string; nie przenoś record.name.",
        ],
      },
      {
        id: "record-state-gate",
        kind: "modify",
        title: "Rozpoznaj gotowy rekord",
        prompt:
          "Kontrakt: dla istniejącego `struct Record { name: String, count: i32 }` napisz `fn is_done(record: &Record) -> bool`. Zwróć `true` wyłącznie dla `count > 0`; odczytuj rekord przez `&Record`. Starter błędnie uznaje zero za gotowe; popraw go, aby testy objęły zero, liczbę ujemną i dodatnią.",
        code: `struct Record {
    name: String,
    count: i32,
}

fn is_done(record: &Record) -> bool {
    record.count >= 0
}`,
        solution: `struct Record {
    name: String,
    count: i32,
}

fn is_done(record: &Record) -> bool {
    record.count > 0
}`,
        evaluator: { kind: "tests", tests: recordStateGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Kontrakt rozróżnia zero od wartości dodatniej.",
          "Znak `>` wyklucza zero, a `&Record` pozwala tylko odczytać count.",
        ],
      },
      {
        id: "record-recall",
        kind: "recall",
        title: "Odtwórz rekord",
        prompt: "Które zdanie najlepiej opisuje strukturę z polem `String`?",
        choices: [
          {
            id: "owned",
            label:
              "Rekord może posiadać własny tekst i przeżyć funkcję tworzącą.",
          },
          {
            id: "borrowed",
            label:
              "Każdy String w strukturze jest automatycznie tylko widokiem.",
          },
          {
            id: "tuple",
            label: "Nazwane pola zachowują się zawsze jak indeksy krotki.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "owned",
          explanations: {
            owned:
              "Poprawnie: String jest właścicielem bufora, a pole nazywa tę własność w rekordzie.",
            borrowed: "String posiada dane; widokiem jest &str.",
            tuple: "Pola rekordów odczytuje się nazwą, nie numerem indeksu.",
          },
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "Kropka bez nawiasów zawsze wywołuje metodę.",
      "Pole String jest automatycznie pożyczką i nie ma właściciela.",
      "Odczyt pola `record.name` musi przenieść String z rekordu.",
    ],
    transferTask:
      "Zaprojektuj własny rekord opisujący pojedynczą pozycję kolejki z nazwą String i liczbą prób; sformatuj także pustą nazwę.",
    evidenceGate:
      "Zdefiniuj nazwany rekord z owned String i funkcję formatującą przez `&Record`; ukryte testy obejmują wartości brzegowe oraz potwierdzają, że rekord nadal jest użyteczny.",
    sourceIds: ["records-book-structs", "records-book-slices"],
  },
  {
    id: "methods-and-state",
    moduleId: "data-modeling",
    conceptIds: ["method-receivers"],
    competencyIds: ["method-design"],
    prerequisites: ["structs-and-fields"],
    title: "Metody: zachowanie blisko stanu",
    subtitle:
      "Umieść odczyt i zmianę stanu w `impl`, dobierając `&self`, `&mut self` oraz `Self`.",
    minutes: 20,
    outcomes: [
      "Zdefiniujesz konstruktor zwracający `Self`.",
      "Odróżnisz metodę odczytującą z `&self` od zmieniającej stan z `&mut self`.",
      "Przetestujesz zmianę stanu na kilku niezależnych wywołaniach.",
    ],
    steps: [
      {
        id: "method-predict",
        kind: "predict",
        title: "Dobierz receiver",
        prompt:
          "Którego receivera potrzebuje metoda, która tylko zwraca `self.value`, a którego metoda zwiększająca wartość?",
        choices: [
          { id: "shared-mut", label: "Odczyt: &self; zmiana: &mut self" },
          {
            id: "both-shared",
            label: "Obie: &self, bo mut zmienia tylko wiązanie",
          },
          {
            id: "owned",
            label: "Obie: self, bo każda metoda zabiera instancję",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "shared-mut",
          explanations: {
            "shared-mut":
              "Poprawnie: odczyt współdzieli, a mutacja wymaga wyłącznej pożyczki instancji.",
            "both-shared":
              "&self nie pozwala zmienić pola przez współdzielony receiver.",
            owned:
              "self bez referencji przenosi instancję; nie jest potrzebne do zwykłego odczytu ani zmiany.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "Pytanie dotyczy pożyczki instancji, nie tylko mut na lokalnym bindingu.",
          "Zmiana wymaga wyłącznego dostępu przez `&mut self`.",
        ],
      },
      {
        id: "method-run",
        kind: "run",
        title: "Wywołaj metody przez kropkę",
        prompt:
          "Uruchom kod i zobacz, że `new` jest funkcją powiązaną, a `summary` i `add` są metodami instancji. Zapis `Self { label, value: 0 }` korzysta ze skrótu pola: lokalne `label` zasila pole o tej samej nazwie.",
        code: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}

fn main() {
    let mut counter = Counter::new(String::from("build"));
    counter.add(2);
    println!("{}", counter.summary());
}`,
        solution: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}

fn main() {
    let mut counter = Counter::new(String::from("build"));
    counter.add(2);
    println!("{}", counter.summary());
}`,
        evaluator: { kind: "exact-output", expected: "build: 2\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "`Counter::new` nie ma instancji, ale zwraca Self.",
          "Po utworzeniu potrzebujesz mut na bindingu, aby wywołać add.",
        ],
      },
      {
        id: "method-explain",
        kind: "explain",
        title: "Wyjaśnij Self",
        prompt:
          "Co oznacza `Self` w `fn new(label: String) -> Self` i dlaczego metoda `summary` nie potrzebuje `&mut self`?",
        choices: [
          {
            id: "type-read",
            label:
              "Self oznacza Counter, a summary tylko czyta stan przez &self.",
          },
          {
            id: "borrowed",
            label:
              "Self oznacza pożyczoną instancję, więc summary musi mieć &mut self.",
          },
          {
            id: "copy",
            label: "Self kopiuje wszystkie pola, a receiver nie ma znaczenia.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "type-read",
          explanations: {
            "type-read":
              "Poprawnie: Self jest aliasem typu po impl, a &self wystarcza do odczytu.",
            borrowed:
              "Self oznacza typ, nie pożyczkę; summary nie zmienia stanu.",
            copy: "Self nie kopiuje pól i nie zastępuje decyzji o receiverze.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "method-repair",
        kind: "debug",
        title: "Dodaj wyłączną zmianę",
        prompt:
          "Starter próbuje zmienić pole przez współdzielony receiver. Metoda add_one ma zwiększać value o jeden przy każdym wywołaniu. Zmień rodzaj dostępu do instancji i sprawdź to testami; wartości w ćwiczeniu mieszczą się w i32.",
        code: `struct Counter {
    value: i32,
}

impl Counter {
    fn add_one(&self) {
        self.value += 1;
    }
}`,
        solution: `struct Counter {
    value: i32,
}

impl Counter {
    fn add_one(&mut self) {
        self.value += 1;
    }
}`,
        evaluator: {
          kind: "tests",
          tests:
            "#[test] fn increments_the_same_counter() { let mut counter = Counter { value: -2 }; counter.add_one(); assert_eq!(counter.value, -1); counter.add_one(); assert_eq!(counter.value, 0); let mut other = Counter { value: 7 }; other.add_one(); assert_eq!(other.value, 8); }",
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0594",
        hints: [
          "Komunikat wskazuje, że za &self stoi współdzielona referencja.",
          "Zastąp `&self` przez `&mut self`.",
        ],
      },
      {
        id: "method-gate",
        kind: "modify",
        title: "Zaprojektuj mały licznik",
        prompt:
          "Kontrakt: zdefiniuj `struct Counter { label: String, value: i32 }` i w jednym `impl` trzy elementy: `fn new(label: String) -> Self` startujące od zera, `fn add(&mut self, amount: i32)` dodające zmianę oraz `fn summary(&self) -> String` zwracające `label: value`. Starter zastępuje dotychczasową wartość przy każdym add; popraw go. Ukryte testy wywołają konstruktor, zero, dodatnią i ujemną zmianę na dwóch licznikach. Operator `+=` oznacza dodanie amount do obecnego self.value. Zakładamy, że każda suma w tym ćwiczeniu mieści się w i32.",
        code: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value = amount;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}`,
        solution: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}`,
        evaluator: { kind: "tests", tests: methodGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "add ma zachować dotychczasowy stan i dopiero dodać amount.",
          "Operator `+=` wyraża zmianę względem obecnego self.value.",
        ],
      },
      {
        id: "method-reset-gate",
        kind: "modify",
        title: "Dodaj operację resetu",
        prompt:
          "Kontrakt: dla `Counter` z metodami `new`, `add` i `summary` dodaj `fn reset(&mut self)`, która ustawia tylko `value` na zero i zachowuje `label`. Starter ustawia 1; popraw go, aby testy sprawdziły licznik niezerowy oraz niezależną drugą instancję.",
        code: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    fn reset(&mut self) {
        self.value = 1;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}`,
        solution: `struct Counter {
    label: String,
    value: i32,
}

impl Counter {
    fn new(label: String) -> Self {
        Self { label, value: 0 }
    }

    fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    fn reset(&mut self) {
        self.value = 0;
    }

    fn summary(&self) -> String {
        format!("{}: {}", self.label, self.value)
    }
}`,
        evaluator: { kind: "tests", tests: methodResetGateTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "reset zmienia tylko pole value, a label pozostaje nietknięty.",
          "Ustawienie `self.value = 0` opisuje kontrakt resetu.",
        ],
      },
      {
        id: "method-recall",
        kind: "recall",
        title: "Odtwórz receiver",
        prompt: "Wybierz prawdziwe zdanie o `impl Counter`.",
        choices: [
          {
            id: "receivers",
            label:
              "&self czyta, &mut self zmienia, a Self może oznaczać Counter w wyniku.",
          },
          {
            id: "self-type",
            label: "Self zawsze oznacza pożyczoną instancję.",
          },
          {
            id: "mut-binding",
            label: "&self wystarcza do zmiany, jeśli binding ma mut.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "receivers",
          explanations: {
            receivers:
              "Poprawnie: receiver mówi o dostępie do instancji, a Self jest aliasem typu impl.",
            "self-type": "Self oznacza typ, nie pożyczoną instancję.",
            "mut-binding":
              "mut na bindingu nie zamienia &self w wyłączny dostęp.",
          },
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "`Self` w wyniku jest tym samym co receiver `&self`.",
      "`&self` może zmieniać pola, jeśli lokalne wiązanie ma `mut`.",
      "Metoda add powinna ustawiać wartość od zera przy każdym wywołaniu.",
    ],
    transferTask:
      "Dodaj do własnego rekordu metodę odczytu i metodę zmiany stanu, a następnie sprawdź kolejność dwóch zmian oraz zmianę równą zero.",
    evidenceGate:
      "Bez zmiany kontraktu zaimplementuj konstruktor, odczyt przez `&self` i akumulację przez `&mut self`; ukryte testy sprawdzą dwie instancje i kilka delt.",
    sourceIds: ["records-book-methods", "records-book-structs"],
  },
];

export const recordsReviewExercises: Record<string, LessonStep> = {
  "slice-views": {
    id: "review-slice-views",
    kind: "recall",
    title: "Powtórka: widok i granica",
    prompt:
      "Wybierz parametr funkcji, która ma tylko odczytać fragment tablicy bez przejęcia własności.",
    choices: [
      { id: "slice", label: "&[i32]" },
      { id: "array", label: "[i32; 4]" },
      { id: "vector", label: "Vec<i32>" },
    ],
    evaluator: {
      kind: "choice",
      correct: "slice",
      explanations: {
        slice: "Poprawnie: &[i32] jest pożyczonym widokiem na ciągły zakres.",
        array:
          "Tablica ma własny rozmiar i nie opisuje dowolnego zakresu bez dodatkowej informacji.",
        vector:
          "Vec<i32> posiada bufor i przejęłaby własność przy przekazaniu przez wartość.",
      },
    },
    evidenceKind: "recall",
    solution: "Użyj `&[i32]`, bo funkcja tylko odczytuje pożyczony zakres.",
  },
  "struct-records": {
    id: "review-struct-records",
    kind: "recall",
    title: "Powtórka: rekord z własną nazwą",
    prompt:
      "Napisz funkcję make_label(name: &str) -> Label. Zwrócony rekord ma mieć pole name typu String i zachować dokładnie podaną nazwę, łącznie ze spacjami i polskimi znakami. Kod wywołujący może potem zmienić albo usunąć źródłowy tekst.",
    code: `struct Label {
    name: String,
}

fn make_label(_name: &str) -> Label {
    Label { name: String::new() }
}

fn main() {}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn the_returned_record_owns_the_original_name() {
    for expected in ["", "  Łódź 🦀  ", "port"] {
        let label = {
            let mut source = String::from(expected);
            let label = make_label(&source);
            source.push('!');
            label
        };
        let owned: String = label.name;
        assert_eq!(owned, expected);
    }
}`,
    },
    evidenceKind: "recall",
    solution: `struct Label {
    name: String,
}

fn make_label(name: &str) -> Label {
    Label { name: String::from(name) }
}

fn main() {}`,
    expectedStatus: "success",
  },
  "method-receivers": {
    id: "review-method-receivers",
    kind: "recall",
    title: "Powtórka: receiver metody",
    prompt:
      "Uzupełnij regułę: metoda tylko czytająca używa ..., metoda zmieniająca stan używa ..., a konstruktor może zwrócić ....",
    evaluator: {
      kind: "answer",
      accepted: [
        "&self, &mut self, Self",
        "&self; &mut self; Self",
        "&self, &mut self, Self",
      ],
      feedback:
        "Rozdziel współdzielony odczyt, wyłączną mutację i alias typu w impl.",
    },
    evidenceKind: "recall",
    solution: "Odpowiednio: `&self`, `&mut self`, `Self`.",
  },
};
