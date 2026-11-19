import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

import { eventReport } from "./collections-event-report";
import { stringRecoverySteps } from "./collections-string-recovery";

const reviewedAt = "2026-09-12";

export const collectionsSources: Source[] = [
  {
    id: "collections-book-vectors",
    title:
      "The Rust Programming Language: Storing Lists of Values with Vectors",
    url: "https://doc.rust-lang.org/book/ch08-01-vectors.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie API Vec, push, pop, get lub zasad iteracji po referencji.",
  },
  {
    id: "collections-book-strings",
    title:
      "The Rust Programming Language: Storing UTF-8 Encoded Text with Strings",
    url: "https://doc.rust-lang.org/book/ch08-02-strings.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu UTF-8, bytes, chars lub ograniczeń grapheme clusters.",
  },
  {
    id: "collections-book-hash-maps",
    title:
      "The Rust Programming Language: Storing Keys with Associated Values in Hash Maps",
    url: "https://doc.rust-lang.org/book/ch08-03-hash-maps.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie API HashMap, get, insert lub Entry::or_insert.",
  },
  {
    id: "collections-std-vec",
    title: "Rust Standard Library: Vec",
    url: "https://doc.rust-lang.org/std/vec/struct.Vec.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie stabilnego API Vec lub wspieranego toolchaina.",
  },
  {
    id: "collections-std-hashmap",
    title: "Rust Standard Library: HashMap",
    url: "https://doc.rust-lang.org/std/collections/struct.HashMap.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie stabilnego API HashMap lub gwarancji implementacji.",
  },
];

export const collectionsCompetencies: Competency[] = [
  {
    id: "vec-borrowing",
    title:
      "Zarządzaj Vec przez push, pop, get i iterację, świadomie wybierając pożyczkę zamiast move.",
  },
  {
    id: "string-representation",
    title:
      "Wybieraj między bajtami, wartościami char i tekstem użytkowym bez indeksowania String po bajtach.",
  },
  {
    id: "hashmap-entry",
    title:
      "Buduj mapę klucz-wartość z get, insert i entry.or_insert oraz aktualizuj wartość przez jawną dereferencję.",
  },
];

export const collectionsConcepts: Concept[] = [
  {
    id: "vec-borrowing",
    title: "Vec: własność kontenera i pożyczone elementy",
    prerequisites: ["method-receivers"],
    competencyIds: ["vec-borrowing"],
    reviewPrompt:
      "Co zwraca `values.get(0)` dla pustego `Vec<i32>`, a co dla wektora z elementem?",
    reviewAnswer:
      "Zwraca `None` dla pustego wektora i `Some(&element)` dla istniejącego indeksu; zwrócona referencja pożycza element bez przenoszenia Vec.",
    distinguish:
      "`get` komunikuje brak przez `Option<&T>`, a `values[index]` zakłada poprawny indeks i może zakończyć program paniką. Iteracja po `&values` pożycza elementy, natomiast po `values` przenosi Vec do pętli.",
  },
  {
    id: "string-utf8",
    title: "String: bajty, char i granice tekstu",
    prerequisites: ["vec-borrowing"],
    competencyIds: ["string-representation"],
    reviewPrompt:
      'Co mierzą `text.bytes().count()` i `text.chars().count()` dla `"żółć"`, i dlaczego żadna liczba nie musi oznaczać widocznych znaków?',
    reviewAnswer:
      "`bytes` liczy bajty UTF-8, a `chars` liczy Unicode scalar values. Wartości char mogą mieć po kilka bajtów, a jeden widoczny znak może składać się z kilku wartości char, więc grapheme clusters nie są tym samym.",
    distinguish:
      "Bajt jest jednostką reprezentacji, `char` jest wartością Unicode scalar value, a grapheme cluster jest przybliżeniem tego, co użytkownik widzi jako znak. Standardowa biblioteka nie dostarcza pełnego dzielenia na grapheme clusters.",
  },
  {
    id: "hashmap-entry",
    title: "HashMap i wejście do wartości",
    prerequisites: ["string-utf8"],
    competencyIds: ["hashmap-entry"],
    reviewPrompt:
      "Co daje `map.entry(key).or_insert(0)` i dlaczego przed zmianą zwróconej liczby piszemy `*count`?",
    reviewAnswer:
      "Entry sprawdza jeden klucz i zwraca `&mut V`: wstawia 0, jeśli klucza nie ma, albo zostawia istniejącą wartość. Gwiazdka dereferencjonuje referencję, aby operator zmienił liczbę, a nie samą referencję.",
    distinguish:
      "`insert` zastępuje wartość dla klucza, `get` daje opcjonalny odczyt, a `entry().or_insert()` pozwala bezpiecznie zainicjalizować i potem zmienić istniejącą wartość. Kolejność iteracji HashMap nie jest kontraktem wyniku.",
  },
];

const vecLastTests = `#[test]
fn empty_vector_has_no_last_value() {
    let values: Vec<i32> = Vec::new();
    assert_eq!(last_value(&values), None);
}

#[test]
fn finds_the_last_value_without_taking_the_vector() {
    let singleton = vec![7];
    assert_eq!(last_value(&singleton), Some(&7));
    assert_eq!(singleton, vec![7]);
    let values = vec![-4, 8, 15];
    assert_eq!(last_value(&values), Some(&15));
    assert_eq!(values, vec![-4, 8, 15]);
}

#[test]
fn borrows_the_last_slot_when_values_repeat() {
    let values = [7, 2, 7];
    let last = last_value(&values[..]).expect("brak ostatniego elementu");
    assert!(std::ptr::eq(last, &values[2]), "Zwróć pożyczkę ostatniego elementu.");
}`;

const vecEvenTests = `#[test]
fn counts_even_values_in_empty_and_mixed_vectors() {
    assert_eq!(count_even(&Vec::new()), 0);
    assert_eq!(count_even(&vec![1, 2, 4, 7]), 2);
}

#[test]
fn counts_negative_and_repeated_values() {
    let values = [8, -4, -3, 0, 0, 9, 6];
    assert_eq!(count_even(&values[1..6]), 3);
}`;

const stringCharsTests = `#[test]
fn counts_empty_ascii_and_multibyte_text_as_chars() {
    assert_eq!(char_count(""), 0);
    assert_eq!(char_count("abc"), 3);
    assert_eq!(char_count("żółć"), 4);
}

#[test]
fn counts_emoji_and_combining_values_without_calling_them_graphemes() {
    assert_eq!(char_count("🙂"), 1);
    assert_eq!(char_count("e\\u{301}"), 2);
}`;

const stringPushTests = `#[test]
fn appends_to_empty_ascii_and_polish_text() {
    for (start, suffix, expected) in [
        ("", "", ""),
        ("old", "", "old"),
        ("", "abc", "abc"),
        ("żółć", "!", "żółć!"),
    ] {
        let mut text = String::from(start);
        append_text(&mut text, suffix);
        assert_eq!(text, expected);
    }
}

#[test]
fn appends_emoji_and_combining_text_as_a_whole_slice() {
    let mut text = String::from("e\\u{301}");
    append_text(&mut text, "🙂");
    assert_eq!(text, "e\\u{301}🙂");
}`;

const mapPointsTests = `#[test]
fn adds_points_for_new_and_existing_keys() {
    let mut scores = HashMap::new();
    add_points(&mut scores, "red", 3);
    add_points(&mut scores, "red", -1);
    add_points(&mut scores, "blue", 0);
    assert_eq!(scores.get("red"), Some(&2));
    assert_eq!(scores.get("blue"), Some(&0));
}

#[test]
fn updates_a_second_map_without_relying_on_iteration_order() {
    let mut scores = HashMap::new();
    add_points(&mut scores, "north", 10);
    add_points(&mut scores, "south", 4);
    add_points(&mut scores, "north", 5);
    assert_eq!(scores.get("north"), Some(&15));
    assert_eq!(scores.get("south"), Some(&4));
}`;

const mapFrequencyTests = `#[test]
fn counts_empty_ascii_and_repeated_words() {
    assert!(frequency("").is_empty());
    let counts = frequency("banana");
    assert_eq!(counts.get(&'a'), Some(&3));
    assert_eq!(counts.get(&'n'), Some(&2));
    assert_eq!(counts.get(&'b'), Some(&1));
}

#[test]
fn counts_unicode_scalar_values_without_iteration_order() {
    let counts = frequency("żółć🙂🙂e\\u{301}");
    assert_eq!(counts.get(&'ż'), Some(&1));
    assert_eq!(counts.get(&'🙂'), Some(&2));
    assert_eq!(counts.get(&'e'), Some(&1));
    assert_eq!(counts.get(&'\\u{301}'), Some(&1));
}`;

export const collectionsLessons: Lesson[] = [
  {
    id: "vec-and-borrowing",
    moduleId: "collections",
    conceptIds: ["vec-borrowing"],
    competencyIds: ["vec-borrowing"],
    prerequisites: ["modeling-assessment"],
    title: "Vec: rosnąca lista i pożyczone elementy",
    subtitle:
      "Dodaj, usuń i odczytaj dane z Vec, a potem zobacz, jak pożyczka wpływa na push i iterację.",
    minutes: 20,
    outcomes: [
      "Użyjesz push, pop i get oraz rozpoznasz None dla brakującego elementu.",
      "Odróżnisz iterację po &vec od iteracji, która przenosi Vec.",
      "Naprawisz E0502, kończąc pożyczkę przed push.",
    ],
    steps: [
      {
        id: "vec-predict",
        kind: "predict",
        title: "Przewidź Option<&T>",
        prompt:
          "Makro `vec![10]` tworzy Vec z jednym elementem 10. Co zwróci `values.get(1)` i dlaczego `get` nie kończy programu paniką?",
        choices: [
          {
            id: "none",
            label:
              "None, bo indeks 1 nie istnieje; brak jest jawną wartością Option",
          },
          {
            id: "panic",
            label: "Panika, bo każda próba odczytu poza Vec kończy program",
          },
          { id: "zero", label: "Some(0), bo Vec wypełnia brak zerem" },
        ],
        evaluator: {
          kind: "choice",
          correct: "none",
          explanations: {
            none: "Poprawnie: get zwraca None dla brakującego indeksu i pozwala wywołującemu wybrać reakcję.",
            panic:
              "Indeksowanie `values[1]` może panikować, ale get zwraca Option.",
            zero: "Vec nie dopisuje wartości domyślnej; brak oznacza None.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "Porównaj get z operatorem nawiasów kwadratowych.",
          "Option ma osobny wariant dla braku elementu.",
        ],
      },
      {
        id: "vec-run",
        kind: "run",
        title: "Uruchom push, pop i get",
        prompt:
          "Uruchom kod. `push` dopisuje element, `pop` zwraca Option usuniętego elementu, a `get` zwraca Option pożyczonego elementu.",
        code: `fn main() {
    let mut values = Vec::new();
    values.push(3);
    values.push(5);
    let removed = values.pop();
    let first = values.get(0);
    println!("{:?} {:?} {:?}", values, removed, first);
}`,
        solution: `fn main() {
    let mut values = Vec::new();
    values.push(3);
    values.push(5);
    let removed = values.pop();
    let first = values.get(0);
    println!("{:?} {:?} {:?}", values, removed, first);
}`,
        evaluator: { kind: "exact-output", expected: "[3] Some(5) Some(3)\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "push i pop zmieniają długość Vec.",
          "get zwraca referencję opakowaną w Some.",
        ],
      },
      {
        id: "vec-iteration-explain",
        kind: "explain",
        title: "Porównaj pożyczkę i move",
        prompt:
          "Wybierz poprawne wyjaśnienie różnicy między `for item in &values` a `for item in values`.",
        choices: [
          {
            id: "borrow-move",
            label:
              "Pierwsza pętla pożycza elementy, druga zużywa Vec przez move.",
          },
          {
            id: "same",
            label: "Obie pętle zawsze kopiują cały Vec przed iteracją.",
          },
          {
            id: "index",
            label: "Pierwsza pętla indeksuje, a druga działa tylko dla tablic.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "borrow-move",
          explanations: {
            "borrow-move":
              "Poprawnie: &values daje iterację przez referencje, a values oddaje własność pętli.",
            same: "Iteracja przez referencję nie kopiuje Vec.",
            index:
              "Żadna z tych pętli nie jest indeksowaniem; obie mogą działać z Vec.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "vec-repair",
        kind: "debug",
        title: "Zakończ pożyczkę przed push",
        prompt:
          "Funkcja push_and_read otrzymuje &mut Vec<i32> oraz nową liczbę. Dla niepustego Vec zwraca Some pierwszej wartości po dopisaniu liczby; dla pustego dopisuje liczbę i zwraca Some tej liczby. Starter zachowuje referencję przez push i wywołuje E0502. Pobierz referencję dopiero po zmianie, a i32 skopiuj przez *. get(0) obsługuje także pustkę bez indeksowania. Nie klonuj Vec.",
        code: `fn push_and_read(values: &mut Vec<i32>, added: i32) -> Option<i32> {
    let first = &values[0];
    values.push(added);
    Some(*first)
}`,
        solution: `fn push_and_read(values: &mut Vec<i32>, added: i32) -> Option<i32> {
    values.push(added);
    match values.first() {
        Some(first) => Some(*first),
        None => None,
    }
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn pushes_after_the_old_reference_ends() {
    let mut values = vec![4, 8];
    assert_eq!(push_and_read(&mut values, 15), Some(4));
    assert_eq!(values, vec![4, 8, 15]);
    assert_eq!(push_and_read(&mut values, -1), Some(4));
    assert_eq!(values, vec![4, 8, 15, -1]);
    let mut empty = Vec::new();
    assert_eq!(push_and_read(&mut empty, 0), Some(0));
    assert_eq!(empty, vec![0]);
}`,
          forbiddenPatterns: [".clone("],
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0502",
        hints: [
          "Sprawdź, która referencja jest nadal używana po push.",
          "Po push pobierz pierwszy element przez first() (odpowiednik get(0)) i skopiuj samo i32.",
        ],
      },
      {
        id: "vec-last-gate",
        kind: "modify",
        title: "Zwróć ostatni element",
        prompt:
          "Kontrakt: napisz `fn last_value(values: &[i32]) -> Option<&i32>`. Zwróć ostatni element przez pożyczkę albo None dla pustego wycinka; nie przenoś i nie klonuj wektora. Starter zwraca pierwszy element, więc popraw go dla pustego, jednoelementowego i wieloelementowego przypadku. Jeśli liczba się powtarza, zwróć referencję do elementu na wskazanej pozycji.",
        code: `fn last_value(values: &[i32]) -> Option<&i32> {
    values.get(0)
}`,
        solution: `fn last_value(values: &[i32]) -> Option<&i32> {
    if values.is_empty() {
        None
    } else {
        values.get(values.len() - 1)
    }
}`,
        evaluator: { kind: "tests", tests: vecLastTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Najpierw rozpoznaj pusty Vec, bo jego ostatni indeks nie istnieje.",
          "Dla niepustego Vec ostatni indeks to len() - 1, a get zwraca Option<&i32>.",
        ],
      },
      {
        id: "vec-even-gate",
        kind: "modify",
        title: "Policz parzyste wartości przez pożyczkę",
        prompt:
          "Kontrakt: napisz `fn count_even(values: &[i32]) -> usize`, przechodząc po elementach przez referencję. Parametr &[i32] przyjmuje także pożyczony Vec i nie wymaga konkretnego kontenera. Zwróć liczbę elementów podzielnych przez 2; `usize` oznacza liczbę indeksowalnych elementów. Starter zwraca zero, więc popraw go dla pustej, dodatniej i ujemnej zawartości.",
        code: `fn count_even(values: &[i32]) -> usize {
    0
}`,
        solution: `fn count_even(values: &[i32]) -> usize {
    let mut count = 0;
    for value in values {
        if *value % 2 == 0 {
            count += 1;
        }
    }
    count
}`,
        evaluator: { kind: "tests", tests: vecEvenTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "`for value in values` przy wycinku daje referencję do każdego i32.",
          "Użyj `*value`, aby sprawdzić liczbę, i zwiększ count tylko dla reszty 0.",
        ],
      },
      {
        id: "vec-transfer",
        kind: "apply",
        title: "Połącz odczyt i iterację",
        prompt:
          "Napisz summary przyjmujące &[i32] i zwracające parę (Option<&i32>, usize): referencję do pierwszej liczby oraz liczbę wartości ujemnych. Para (a, b) zawiera dwa niezależne wyniki, a typy pary zapisujemy tak samo w nawiasach. Dla pustego wycinka zwróć (None, 0). Pożyczaj dane i nie klonuj ich. first() jest odpowiednikiem get(0). Jeśli liczba się powtarza, zwróć referencję do elementu na wskazanej pozycji.",
        code: "fn summary(values: &[i32]) -> (Option<&i32>, usize) { (None, 0) }",
        solution:
          "fn summary(values: &[i32]) -> (Option<&i32>, usize) {\n    let mut count = 0;\n    for value in values {\n        if *value < 0 { count += 1; }\n    }\n    (values.first(), count)\n}",
        expectedStatus: "success",
        evaluator: {
          kind: "tests",
          tests:
            `#[test] fn summary_retains_borrowed_input() { assert_eq!(summary(&[]), (None, 0)); let values=vec![-3,7,0]; let actual: (Option<&i32>, usize)=summary(&values); assert_eq!(actual,(Some(&-3),1)); assert_eq!(values,vec![-3,7,0]); assert_eq!(summary(&[5,-1,-2]),(Some(&5),2)); assert_eq!(summary(&[0]),(Some(&0),0)); }

#[test]
fn borrows_the_first_slot_when_values_repeat() {
    let values = [-3, 5, -3];
    let (first, count) = summary(&values);
    assert_eq!(count, 2);
    assert!(first.is_some_and(|n| std::ptr::eq(n, &values[0])), "Zwróć pożyczkę pierwszego elementu.");
}`,
          forbiddenPatterns: [".clone("],
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Sprawdź pusty zbiór i drugi zestaw danych.",
          "Zwróć oba wyniki kontraktu; sam poprawny pierwszy wynik nie wystarczy.",
        ],
      },
      {
        id: "vec-recall",
        kind: "recall",
        title: "Odtwórz Vec i Option",
        prompt: "Które zdanie o get jest prawdziwe?",
        choices: [
          {
            id: "safe",
            label:
              "get zwraca Option<&T>, więc brak indeksu jest None, a istniejący element Some(&T).",
          },
          {
            id: "move",
            label: "get zawsze przenosi cały Vec do wywołującego.",
          },
          {
            id: "panic",
            label: "get zawsze panikuje, gdy indeks nie istnieje.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "safe",
          explanations: {
            safe: "Poprawnie: get daje pożyczony element lub jawny brak.",
            move: "get nie przenosi kontenera.",
            panic: "To indeksowanie może panikować; get zwraca None.",
          },
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "get i indeksowanie mają identyczną reakcję na brak elementu.",
      "Iteracja po `&values` kopiuje Vec, a iteracja po values zostawia go użytecznym.",
      "Referencję do elementu można trzymać przez push bez względu na realokację.",
    ],
    transferTask:
      "Zaimplementuj pomocnik odczytujący nowy Vec, który zwraca Option i pozostawia listę dostępną po wywołaniu; sprawdź pustą oraz wieloelementową listę.",
    evidenceGate:
      "Dwie niezależne implementacje oparte na pożyczce przechodzą testy pustego, jednoelementowego i mieszanego Vec oraz nie wymagają clone.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "vec-iteration-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw pożyczkę przed zmianą Vec i zwróć ostatni element. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "vec-last-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Policz parzyste elementy przez pożyczkę, potem połącz oba kontrakty. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: ["collections-book-vectors", "collections-std-vec"],
  },
  {
    id: "string-and-utf8",
    moduleId: "collections",
    conceptIds: ["string-utf8"],
    competencyIds: ["string-representation"],
    prerequisites: ["vec-and-borrowing"],
    title: "String: wybierz właściwy poziom tekstu",
    subtitle:
      "Zmieniaj String przez push_str i rozróżniaj bajty, char oraz grapheme clusters bez indeksowania UTF-8.",
    minutes: 22,
    outcomes: [
      "Użyjesz push_str do dołączenia pustego, ASCII i wielobajtowego tekstu.",
      "Odróżnisz bytes od chars oraz wyjaśnisz, czemu char nie oznacza zawsze widocznego znaku.",
      "Rozpoznasz, że indeksowanie String po bajtach może przeciąć znak UTF-8.",
    ],
    steps: [
      {
        id: "string-predict",
        kind: "predict",
        title: "Wybierz poziom tekstu",
        prompt:
          'Zapis Rust `\\u{301}` oznacza pojedynczą wartość Unicode U+0301: akcent łączący. `"e\\u{301}"` zawiera literę i osobny akcent. Który opis pasuje do tego tekstu i do `"🙂"`?',
        choices: [
          {
            id: "layers",
            label:
              "bytes to bajty, chars to scalar values, a widoczny znak może mieć wiele char.",
          },
          {
            id: "one-to-one",
            label: "Każdy bajt, char i widoczny znak zawsze oznaczają to samo.",
          },
          {
            id: "ascii-only",
            label:
              "String przechowuje tylko ASCII, więc oba teksty są niepoprawne.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "layers",
          explanations: {
            layers:
              "Poprawnie: reprezentacja ma warstwę bajtów, scalar values char i bardziej złożone grapheme clusters.",
            "one-to-one":
              "UTF-8 i tekst łączony łamią relację jeden do jednego.",
            "ascii-only":
              "String jest poprawnym UTF-8 i może zawierać Unicode.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "Emoji zajmuje wiele bajtów, choć jest jednym scalar value.",
          "Znak łączący może być osobnym char, mimo że użytkownik widzi go z literą.",
        ],
      },
      {
        id: "string-run",
        kind: "run",
        title: "Dołącz i policz tekst",
        prompt:
          "Uruchom kod. `push_str` dołącza cały pożyczony `&str`; bytes liczy reprezentację, a chars liczy wartości Unicode.",
        code: `fn main() {
    let mut text = String::from("Rust");
    text.push_str(" 🙂");
    println!("{} {} {}", text, text.bytes().count(), text.chars().count());
}`,
        solution: `fn main() {
    let mut text = String::from("Rust");
    text.push_str(" 🙂");
    println!("{} {} {}", text, text.bytes().count(), text.chars().count());
}`,
        evaluator: { kind: "exact-output", expected: "Rust 🙂 9 6\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "Rust ma 4 bajty, spacja 1, a emoji 4 bajty UTF-8.",
          "chars liczy 4 litery Rust, spację i jedno emoji.",
        ],
      },
      {
        id: "string-explain",
        kind: "explain",
        title: "Nie nazywaj char znakiem widocznym",
        prompt:
          'Wybierz wyjaśnienie, dlaczego `"e\\u{301}".chars().count()` wynosi 2, choć użytkownik może widzieć jedną literę z akcentem.',
        choices: [
          {
            id: "scalar-grapheme",
            label:
              "chars liczy dwa scalar values; grapheme cluster może połączyć je w jeden widoczny znak.",
          },
          {
            id: "bytes",
            label:
              "chars liczy bajty, więc wynik zależy tylko od długości UTF-8.",
          },
          {
            id: "bug",
            label:
              "Rust błędnie rozbija Unicode i wynik 2 zawsze oznacza błąd.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "scalar-grapheme",
          explanations: {
            "scalar-grapheme":
              "Poprawnie: char to Unicode scalar value, a grapheme cluster jest wyższym poziomem segmentacji tekstu.",
            bytes: "Bajty otrzymasz przez bytes(), nie chars().",
            bug: "To zamierzone rozróżnienie reprezentacji i tekstu użytkowego.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "string-repair",
        kind: "debug",
        title: "Usuń indeksowanie String",
        prompt:
          "Starter próbuje użyć `text[0]`. Rust nie oferuje odczytu pojedynczego elementu tekstu przez indeks liczbowy: bajt, char i grafem to różne pojęcia. Zmień wynik first_char na Option<char>; chars().next() zwraca pierwszy char lub None. Test obejmuje pustkę i UTF-8.",
        code: `fn first_char(text: &str) -> char {
    text[0]
}`,
        solution: `fn first_char(text: &str) -> Option<char> {
    text.chars().next()
}`,
        evaluator: {
          kind: "tests",
          tests:
            '#[test] fn first_scalar() { assert_eq!(first_char(""), None); assert_eq!(first_char("abc"), Some(\'a\')); assert_eq!(first_char("żółć"), Some(\'ż\')); assert_eq!(first_char("🙂x"), Some(\'🙂\')); assert_eq!(first_char("e\\u{301}"), Some(\'e\')); }',
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0277",
        hints: [
          "Indeksowanie tekstu nie wie, czy 0 oznacza cały pierwszy znak.",
          "chars().next() zwraca Option<char>, które opisuje także pusty tekst.",
        ],
      },
      {
        id: "string-char-gate",
        kind: "modify",
        title: "Policz scalar values",
        prompt:
          "Kontrakt: napisz `fn char_count(text: &str) -> usize`, która liczy wartości zwracane przez `chars()`. Wynik dla pustego tekstu to 0; nie nazywaj go liczbą widocznych znaków. Starter błędnie liczy bajty, więc popraw go dla ASCII, `żółć`, emoji i znaku łączącego.",
        code: `fn char_count(text: &str) -> usize {
    text.bytes().count()
}`,
        solution: `fn char_count(text: &str) -> usize {
    text.chars().count()
}`,
        evaluator: { kind: "tests", tests: stringCharsTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Metoda bytes daje warstwę bajtów; kontrakt wymaga chars.",
          "Wywołaj `text.chars().count()` bez indeksowania String.",
        ],
      },
      {
        id: "string-push-gate",
        kind: "modify",
        title: "Dołącz cały wycinek tekstu",
        prompt:
          "Kontrakt: napisz `fn append_text(text: &mut String, suffix: &str)`, która dołącza cały suffix przez `push_str`. Starter dopisuje tylko jeden char, a () oznacza brak działania dla None. Popraw go dla pustego, ASCII, `żółć`, emoji i tekstu łączonego.",
        code: `fn append_text(text: &mut String, suffix: &str) {
    match suffix.chars().next() {
        Some(character) => text.push(character),
        None => (),
    }
}`,
        solution: `fn append_text(text: &mut String, suffix: &str) {
    text.push_str(suffix);
}`,
        evaluator: { kind: "tests", tests: stringPushTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Kontrakt wymaga całego suffix, nawet gdy ma kilka scalar values.",
          "push_str przyjmuje pożyczony &str i dopisuje jego UTF-8 bez indeksowania.",
        ],
      },
      {
        id: "string-transfer",
        suppliedSolutions: {
          solution: [
            { lessonId: "string-and-utf8", stepId: "string-char-gate" },
            { lessonId: "string-and-utf8", stepId: "string-push-gate" },
          ],
        },
        kind: "apply",
        title: "Zbuduj tekst i policz wynik",
        prompt:
          "Napisz append_measured przyjmujące &mut String i pożyczony suffix: &str. Dołącz cały suffix i zwróć liczbę char w całym nowym tekście. Pusta końcówka nie usuwa poprzedniej treści. Dla liter z akcentem łączącym licz scalar values, nie grafemy. Nie klonuj String.",
        code: "fn append_measured(text: &mut String, suffix: &str) -> usize { text.len() + suffix.len() }",
        solution:
          "fn append_measured(text: &mut String, suffix: &str) -> usize {\n    text.push_str(suffix);\n    text.chars().count()\n}",
        expectedStatus: "success",
        evaluator: {
          kind: "tests",
          tests:
            '#[test] fn appends_and_measures_result() { for (before,suffix,count) in [("","",0),("old","",3),("ż","ółć",4),("e","\\u{301}🙂",3),("a","bc",3)] { let mut text=String::from(before); assert_eq!(append_measured(&mut text,suffix),count); assert_eq!(text,format!("{before}{suffix}")); } }',
          forbiddenPatterns: [".clone("],
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Sprawdź pusty zbiór i drugi zestaw danych.",
          "Zwróć oba wyniki kontraktu; sam poprawny pierwszy wynik nie wystarczy.",
        ],
      },
      {
        id: "string-recall",
        kind: "recall",
        title: "Odtwórz warstwy UTF-8",
        prompt: "Które zdanie o String jest prawdziwe?",
        choices: [
          {
            id: "utf8",
            label:
              "String przechowuje UTF-8; bytes i chars odpowiadają innym warstwom, a graphemes nie są równe char.",
          },
          {
            id: "char",
            label:
              "Każdy char jest zawsze jednym widocznym znakiem użytkownika.",
          },
          {
            id: "index",
            label: "Bezpiecznie odczytasz dowolny char przez text[0].",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "utf8",
          explanations: {
            utf8: "Poprawnie: bajty, scalar values i grapheme clusters to różne poziomy opisu.",
            char: "Znak łączący może być osobnym char, a widoczny znak może składać się z kilku char.",
            index:
              "String nie oferuje odczytu pojedynczego elementu przez text[0]; zakresy bajtowe wymagają granic UTF-8.",
          },
        },
        evidenceKind: "recall",
      },
      ...stringRecoverySteps,
    ],
    misconceptions: [
      "char zawsze oznacza jeden widoczny znak.",
      "bytes().count() i chars().count() zawsze dają tę samą liczbę.",
      "Najprościej bezpiecznie indeksować String przez text[0].",
    ],
    transferTask:
      "Napisz pomocnik, który dopisuje suffix do String i osobno raportuje liczbę bajtów oraz scalar values dla pustego, ASCII i Unicode.",
    evidenceGate:
      "Dwa niezależne zadania testują rzeczywisty tekst: char_count rozróżnia bytes od chars, a append_text zachowuje cały UTF-8 suffix bez indeksowania.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "string-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Usuń indeksowanie String i policz wartości skalarne Unicode. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "string-char-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Dołącz cały wycinek tekstu i sprawdź wynik w zadaniu łączącym operacje. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "string-recall",
        title: "Opcjonalna przerwa przed nowymi kontraktami tekstu",
        nextGoal:
          "Policz wystąpienia wybranej wartości char i dołącz pożyczone części z separatorem. Własne rozwiązania tych zadań potwierdzają nowe zachowanie po obejrzeniu wcześniejszego przykładu.",
      },
    ],
    sourceIds: ["collections-book-strings"],
  },
  {
    id: "hashmap-and-entry",
    moduleId: "collections",
    conceptIds: ["hashmap-entry"],
    competencyIds: ["hashmap-entry"],
    prerequisites: ["string-and-utf8"],
    title: "HashMap: klucz prowadzi do wartości",
    subtitle:
      "Użyj mapy do odczytu i aktualizacji danych, a Entry pozwoli uniknąć nadpisania istniejącego stanu.",
    minutes: 22,
    outcomes: [
      "Utworzysz HashMap przez import, wstawisz wartości i odczytasz Option przez get.",
      "Wyjaśnisz brak gwarancji kolejności iteracji mapy.",
      "Zaktualizujesz licznik przez entry.or_insert i jawną dereferencję `*count`.",
    ],
    steps: [
      {
        id: "map-predict",
        kind: "predict",
        title: "Przewidź get i brak klucza",
        prompt:
          'Co zwróci `scores.get("green")`, jeśli mapa ma tylko klucz `red`, i dlaczego nie należy sprawdzać wyniku przez kolejność wypisywania mapy?',
        choices: [
          {
            id: "option-order",
            label:
              "None; get opisuje brak, a HashMap nie gwarantuje kolejności iteracji.",
          },
          {
            id: "zero-order",
            label: "Some(0); brak klucza dostaje zero, a mapa sortuje klucze.",
          },
          {
            id: "panic-order",
            label: "Panika; każda mapa wymaga przewidywalnego porządku kluczy.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "option-order",
          explanations: {
            "option-order":
              "Poprawnie: get zwraca Option, a testy powinny odczytywać konkretne klucze zamiast zakładać order.",
            "zero-order":
              "HashMap nie dopisuje brakujących wartości przez get ani nie obiecuje sortowania.",
            "panic-order":
              "Brak klucza jest None, a kolejność mapy nie jest potrzebna do bezpiecznego odczytu.",
          },
        },
        evidenceKind: "prediction",
        hints: [
          "HashMap mapuje po kluczu, nie po numerze indeksu.",
          "Brak wartości jest Option::None; kolejność nie należy do kontraktu.",
        ],
      },
      {
        id: "map-run",
        kind: "run",
        title: "Wstaw i odczytaj wartości",
        prompt:
          "Uruchom kod. Import `use std::collections::HashMap;` wprowadza typ do zakresu. HashMap::new() tworzy pustą mapę, insert zapisuje, a get daje Option<&i32>.",
        code: `use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("red", 3);
    scores.insert("blue", 5);
    println!("{:?} {:?}", scores.get("red"), scores.get("green"));
}`,
        solution: `use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("red", 3);
    scores.insert("blue", 5);
    println!("{:?} {:?}", scores.get("red"), scores.get("green"));
}`,
        evaluator: { kind: "exact-output", expected: "Some(3) None\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
        hints: [
          "get przyjmuje klucz przez referencję i zwraca Some lub None.",
          "Wypisz konkretne get, aby wynik nie zależał od iteracji mapy.",
        ],
      },
      {
        id: "map-explain",
        kind: "explain",
        title: "Zrozum Entry i dereferencję",
        prompt:
          "Wybierz poprawne wyjaśnienie kodu `let count = map.entry(key).or_insert(0); *count += 1;`.",
        choices: [
          {
            id: "ref",
            label:
              "or_insert daje &mut i32, a *count dociera do liczby, którą zwiększamy.",
          },
          {
            id: "copy",
            label: "or_insert kopiuje całą mapę, a gwiazdka usuwa klucz.",
          },
          {
            id: "order",
            label: "Gwiazdka sortuje HashMap przed zwiększeniem wartości.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "ref",
          explanations: {
            ref: "Poprawnie: &mut i32 jest referencją, a dereferencja pozwala zmienić wskazaną liczbę.",
            copy: "Entry pracuje na jednym wpisie i nie kopiuje całej mapy.",
            order: "Dereferencja nie ma związku z kolejnością mapy.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "map-repair",
        kind: "debug",
        title: "Zmień wartość za referencją",
        prompt:
          "Starter ma `&mut i32`, ale próbuje dodać liczbę do samej referencji. Użyj jawnej dereferencji `*count`, aby naprawić błąd.",
        code: `use std::collections::HashMap;

fn bump(map: &mut HashMap<&str, i32>) {
    let count = map.entry("rust").or_insert(0);
    count += 1;
}`,
        solution: `use std::collections::HashMap;

fn bump(map: &mut HashMap<&str, i32>) {
    let count = map.entry("rust").or_insert(0);
    *count += 1;
}`,
        evaluator: {
          kind: "tests",
          tests:
            '#[test] fn counts_existing_and_new() { let mut map = HashMap::new(); bump(&mut map); assert_eq!(map.get("rust"), Some(&1)); map.insert("other", 7); bump(&mut map); assert_eq!(map.get("rust"), Some(&2)); assert_eq!(map.get("other"), Some(&7)); }',
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0368",
        hints: [
          "Typ count jest referencją mutowalną, nie bezpośrednim i32.",
          "Dodaj `*` przed count, aby dereferencjonować referencję.",
        ],
      },
      {
        id: "map-points-gate",
        kind: "modify",
        title: "Akumuluj punkty przez Entry",
        prompt:
          "Kontrakt: napisz `fn add_points(scores: &mut HashMap<String, i32>, team: &str, points: i32)`. Dodaj points do dotychczasowej wartości klucza, startując od 0 dla nowego klucza. Mapa przechowuje własny String: `team.to_string()` tworzy go z pożyczonego &str. użyj `entry(...).or_insert(0)` i dereferencji; Suma punktów mieści się w i32; ten etap nie rozwiązuje przepełnienia liczników. Starter nadpisuje wynik zamiast akumulować; testy sprawdzą nowe, istniejące i zerowe punkty.",
        code: `use std::collections::HashMap;

fn add_points(scores: &mut HashMap<String, i32>, team: &str, points: i32) {
    scores.insert(team.to_string(), points);
}`,
        solution: `use std::collections::HashMap;

fn add_points(scores: &mut HashMap<String, i32>, team: &str, points: i32) {
    let total = scores.entry(team.to_string()).or_insert(0);
    *total += points;
}`,
        evaluator: { kind: "tests", tests: mapPointsTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "insert zastępuje starą wartość; Entry ma zachować ją i dać mutable reference.",
          "Zapisz referencję z or_insert, a potem wykonaj `*total += points`.",
        ],
      },
      {
        id: "map-frequency-gate",
        kind: "modify",
        title: "Policz częstotliwość char",
        prompt:
          "Kontrakt: napisz `fn frequency(text: &str) -> HashMap<char, i32>`, która zlicza każdą wartość z `text.chars()`. Zakładamy najwyżej i32::MAX wystąpień jednego char. Użyj Entry i `*count`; pusta mapa ma zostać pusta. Starter inicjalizuje każdy wpis na 1, więc popraw go dla powtórzeń ASCII, Unicode i emoji. Testy odczytują klucze bez założenia kolejności.",
        code: `use std::collections::HashMap;

fn frequency(text: &str) -> HashMap<char, i32> {
    let mut counts = HashMap::new();
    for character in text.chars() {
        counts.entry(character).or_insert(1);
    }
    counts
}`,
        solution: `use std::collections::HashMap;

fn frequency(text: &str) -> HashMap<char, i32> {
    let mut counts = HashMap::new();
    for character in text.chars() {
        let count = counts.entry(character).or_insert(0);
        *count += 1;
    }
    counts
}`,
        evaluator: { kind: "tests", tests: mapFrequencyTests },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Pętla po chars daje jeden klucz char na każdą wartość Unicode.",
          "or_insert(0) tworzy licznik, a `*count += 1` zwiększa także istniejący wpis.",
        ],
      },
      {
        id: "map-transfer",
        kind: "assessment",
        title: "Przenieś mapę na nowy problem",
        prompt:
          "Wybierz kontrakt dla raportu częstości słów, który nie zależy od kolejności HashMap i rozróżnia brak słowa od zera wystąpień.",
        choices: [
          {
            id: "lookup",
            label:
              "HashMap<String, i32> z get(&word), a testy sprawdzają konkretne klucze.",
          },
          {
            id: "order",
            label:
              "Wypisz mapę i porównaj cały tekst w kolejności zwróconej przez iterację.",
          },
          {
            id: "index",
            label: "Użyj Vec i załóż, że numer indeksu jest kluczem słowa.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "lookup",
          explanations: {
            lookup:
              "Poprawnie: mapę testuje się przez klucze i get, bez założenia kolejności.",
            order: "HashMap nie gwarantuje kolejności iteracji.",
            index:
              "Vec indeksuje po pozycji, a nie po dowolnym kluczu tekstowym.",
          },
        },
        evidenceKind: "assessment",
      },
      {
        id: "map-recall",
        kind: "recall",
        title: "Odtwórz trzy operacje mapy",
        prompt: "Które zdanie najlepiej podsumowuje HashMap?",
        choices: [
          {
            id: "entry",
            label:
              "get daje Option, insert może zastąpić wartość, a entry.or_insert daje &mut do inicjalizacji lub zmiany.",
          },
          {
            id: "ordered",
            label:
              "HashMap zawsze sortuje klucze i można testować kolejność iteracji.",
          },
          {
            id: "index",
            label: "HashMap odczytuje dane wyłącznie przez indeks liczbowy.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "entry",
          explanations: {
            entry:
              "Poprawnie: każde API ma osobny kontrakt, a Entry pozwala aktualizować wartość przez dereferencję.",
            ordered: "Kolejność iteracji nie jest gwarantowana.",
            index:
              "Kluczem może być String, &str lub inny odpowiedni typ, nie tylko indeks.",
          },
        },
        evidenceKind: "recall",
      },
      eventReport,
    ],
    misconceptions: [
      "HashMap ma przewidywalną kolejność, więc można porównywać cały wydruk mapy.",
      "or_insert zawsze nadpisuje istniejącą wartość wartością domyślną.",
      "`&mut i32` można zwiększyć bez dereferencji.",
    ],
    transferTask:
      "Zaprojektuj funkcję zliczającą nowy rodzaj danych i sprawdź ją przez get na pustym wejściu, powtórzonym kluczu oraz kilku niezależnych kluczach.",
    evidenceGate:
      "Dwie niezależne implementacje Entry przechodzą testy nowych i istniejących kluczy, zera, powtórzeń oraz Unicode bez sprawdzania kolejności iteracji.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "map-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw zmianę wartości przez Entry i zsumuj punkty. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "map-points-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Policz częstotliwości char, potem wybierz operację dla nowej domeny. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: ["collections-book-hash-maps", "collections-std-hashmap"],
  },
];

export const collectionsReviewExercises: Record<string, LessonStep> = {
  "vec-borrowing": {
    id: "review-vec-borrowing",
    kind: "debug",
    title: "Powtórka: drugi element",
    prompt:
      "Napraw funkcję second: pożycza wycinek i zwraca Option referencji do elementu o indeksie 1. Dla pustej i jednoelementowej listy daje None. Nie przenosi danych. Jeśli liczba się powtarza, zwróć referencję do elementu na wskazanej pozycji.",
    code: "fn second(values: &[i32]) -> Option<&i32> { values.first() }",
    solution: "fn second(values: &[i32]) -> Option<&i32> { values.get(1) }",
    expectedStatus: "success",
    evaluator: {
      kind: "tests",
      tests:
        `#[test] fn borrowed_second() { assert_eq!(second(&[]), None); assert_eq!(second(&[4]), None); let values = vec![2, -7, 8]; let result: Option<&i32> = second(&values); assert_eq!(result, Some(&-7)); assert_eq!(values, vec![2, -7, 8]); assert_eq!(second(&[9, 0]), Some(&0)); }

#[test]
fn borrows_the_second_slot_when_values_repeat() {
    let values = [9, 9, 9];
    assert!(second(&values).is_some_and(|n| std::ptr::eq(n, &values[1])), "Zwróć pożyczkę elementu o indeksie 1.");
}`,
    },
    evidenceKind: "recall",
    hints: [
      "Sprawdź przypadek pusty i drugie niezależne wejście.",
      "Zachowaj dane wywołującego; zmień tylko zachowanie opisane w kontrakcie.",
    ],
  },
  "string-utf8": {
    id: "review-string-utf8",
    kind: "debug",
    title: "Powtórka: dopisz i zmierz",
    prompt:
      "Funkcja mark dopisuje emoji 🦀 do String przez wyłączną referencję i zwraca liczbę char w całym nowym tekście. Starter mierzy bajty. Zachowaj oryginalny tekst i odróżnij char od grafemu.",
    code: 'fn mark(text: &mut String) -> usize { text.push_str("🦀"); text.len() }',
    solution:
      'fn mark(text: &mut String) -> usize { text.push_str("🦀"); text.chars().count() }',
    expectedStatus: "success",
    evaluator: {
      kind: "tests",
      tests:
        '#[test] fn appends_and_counts_scalars() { for (before, expected) in [("",1), ("żółć",5), ("e\\u{301}",3), ("abc",4)] { let mut text=String::from(before); assert_eq!(mark(&mut text),expected); assert_eq!(text,format!("{before}🦀")); } }',
    },
    evidenceKind: "recall",
    hints: [
      "Sprawdź przypadek pusty i drugie niezależne wejście.",
      "Zachowaj dane wywołującego; zmień tylko zachowanie opisane w kontrakcie.",
    ],
  },
  "hashmap-entry": {
    id: "review-hashmap-entry",
    kind: "debug",
    title: "Powtórka: rejestracja zdarzeń",
    prompt:
      "Funkcja register pożycza mutowalną mapę String → usize i tekst klucza. Każde wywołanie dodaje 2 do licznika; nowy klucz zaczyna od 0. Napraw nadpisywanie stanu. Zakładamy, że licznik po dodaniu mieści się w usize.",
    code: "use std::collections::HashMap;\nfn register(map: &mut HashMap<String, usize>, key: &str) { map.insert(String::from(key), 2); }",
    solution:
      "use std::collections::HashMap;\nfn register(map: &mut HashMap<String, usize>, key: &str) { let count = map.entry(String::from(key)).or_insert(0); *count += 2; }",
    expectedStatus: "success",
    evaluator: {
      kind: "tests",
      tests:
        '#[test] fn accumulates_independent_keys() { let mut map=HashMap::new(); register(&mut map,"ż"); register(&mut map,"ż"); register(&mut map,""); assert_eq!(map.get("ż"),Some(&4)); assert_eq!(map.get(""),Some(&2)); assert_eq!(map.len(),2); assert_eq!(map.get("absent"),None); }',
    },
    evidenceKind: "recall",
    hints: [
      "Sprawdź przypadek pusty i drugie niezależne wejście.",
      "Zachowaj dane wywołującego; zmień tylko zachowanie opisane w kontrakcie.",
    ],
  },
};

export const collectionsModule: CourseModule = {
  id: "collections",
  title: "Kolekcje: przechowuj i wyszukuj dane",
  whyItMatters:
    "Vec, String i HashMap są podstawowymi kontenerami programów, które muszą przechowywać zmienną liczbę danych i odnajdywać je bez ręcznego zarządzania pamięcią.",
  capabilities: [
    "bezpiecznie odczytasz Vec przez Option<&T> i dobierzesz pożyczkę do iteracji",
    "zmienisz String bez łamania UTF-8 i wybierzesz bajty albo scalar values świadomie",
    "odczytasz i zaktualizujesz HashMap przez klucz oraz Entry",
    "napiszesz testy niezależne od kolejności iteracji mapy",
  ],
  prerequisites: ["data-modeling"],
  lessonIds: collectionsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Vec zachowuje własność wywołującego, a brak elementu jest jawnie obsłużony przez Option.",
    "String rozróżnia bajty, char i grapheme clusters oraz nie używa indeksowania po bajtach.",
    "HashMap aktualizuje istniejące i nowe klucze przez Entry, z jawną dereferencją wartości.",
    "Testy sprawdzają konkretne klucze i dane brzegowe bez założenia porządku mapy.",
  ],
  projectConnection:
    "Kolekcje przygotowują dane potrzebne przyszłemu Todo CLI: listę zadań, bezpieczne teksty UTF-8 i mapy pomocniczych liczników.",
  assessmentId: "hashmap-and-entry/map-transfer",
  gateCriteria: [
    {
      id: "vec-gate",
      label: "Pożyczony odczyt z jawną obsługą braku elementu",
      taskRefs: [
        { lessonId: "vec-and-borrowing", stepId: "vec-last-gate" },
        { lessonId: "vec-and-borrowing", stepId: "vec-transfer" },
      ],
    },
    {
      id: "vec-iteration-gate",
      label: "Iteracja po pożyczonych danych",
      taskRefs: [
        { lessonId: "vec-and-borrowing", stepId: "vec-even-gate" },
        { lessonId: "vec-and-borrowing", stepId: "vec-transfer" },
      ],
    },
    {
      id: "string-gate",
      label: "Zliczanie char z uwzględnieniem wielobajtowego UTF-8",
      taskRefs: [
        { lessonId: "string-and-utf8", stepId: "string-char-gate" },
        { lessonId: "string-and-utf8", stepId: "string-transfer" },
        { lessonId: "string-and-utf8", stepId: "string-scalar-frequency-transfer" },
      ],
    },
    {
      id: "string-mutation-gate",
      label: "Modyfikacja String zachowuje całą treść",
      taskRefs: [
        { lessonId: "string-and-utf8", stepId: "string-push-gate" },
        { lessonId: "string-and-utf8", stepId: "string-transfer" },
        { lessonId: "string-and-utf8", stepId: "string-joined-parts-transfer" },
      ],
    },
    {
      id: "hashmap-gate",
      label: "HashMap sumuje wartości i zachowuje niezależne klucze",
      taskRefs: [
        { lessonId: "hashmap-and-entry", stepId: "map-points-gate" },
        { lessonId: "hashmap-and-entry", stepId: "map-frequency-gate" },
      ],
    },
  ],
};
