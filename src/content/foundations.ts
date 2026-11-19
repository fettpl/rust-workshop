import {
  completePairsContract,
  splitMinutesContract,
  rangeSelectionContract,
} from "./baseline-primitives-contracts";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const foundationsSources: Source[] = [
  {
    id: "foundations-rust-installation",
    title: "The Rust Programming Language: Installation",
    url: "https://doc.rust-lang.org/book/ch01-01-installation.html",
    classification: "dynamic",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie instrukcji instalacji lub wspieranego stabilnego toolchaina.",
  },
  {
    id: "foundations-cargo-first-steps",
    title: "The Cargo Book: First Steps with Cargo",
    url: "https://doc.rust-lang.org/cargo/getting-started/first-steps.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie komend cargo new, cargo build lub cargo run.",
  },
  {
    id: "foundations-variables",
    title: "The Rust Programming Language: Variables and Mutability",
    url: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie reguł let, mut lub shadowing w stabilnym Rust.",
  },
  {
    id: "foundations-data-types",
    title: "The Rust Programming Language: Data Types",
    url: "https://doc.rust-lang.org/book/ch03-02-data-types.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisów typów skalarnych lub inferencji typów.",
  },
  {
    id: "foundations-functions",
    title: "The Rust Programming Language: How Functions Work",
    url: "https://doc.rust-lang.org/book/ch03-03-how-functions-work.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie składni parametrów, typów zwracanych lub wyrażeń.",
  },
  {
    id: "foundations-control-flow",
    title: "The Rust Programming Language: Control Flow",
    url: "https://doc.rust-lang.org/book/ch03-05-control-flow.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie składni if, pętli lub zakresów.",
  },
  {
    id: "foundations-tests",
    title: "The Rust Programming Language: How to Write Tests",
    url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu testów #[test] lub komendy cargo test.",
  },
];

export const foundationsCompetencies: Competency[] = [
  {
    id: "syntax-expressions",
    title:
      "Czytaj podstawową składnię Rust jako wiązania, wywołania i wyrażenia.",
  },
  {
    id: "cargo-workflow",
    title:
      "Wybieraj właściwą komendę Cargo i rozumiej, co lokalnie weryfikuje.",
  },
  {
    id: "bindings-mutability",
    title: "Przewiduj skutki let, mut, typów skalarnych i shadowing.",
  },
  {
    id: "function-contracts",
    title:
      "Zapisuj sygnaturę funkcji z typami i rozróżniaj wartość zwracaną od instrukcji.",
  },
  {
    id: "control-flow",
    title:
      "Buduj warunek jako wyrażenie i przewiduj iteracje prostego zakresu.",
  },
  {
    id: "foundations-transfer-testing",
    title:
      "Przenoś reguły na nowy przypadek i sprawdzaj granice testami wieloprzypadkowymi.",
  },
];

export const foundationsConcepts: Concept[] = [
  {
    id: "program-entry",
    title: "Punkt wejścia programu",
    prerequisites: [],
    competencyIds: ["syntax-expressions"],
    reviewPrompt: "Jaka funkcja jest punktem wejścia binarnego programu Rust?",
    reviewAnswer: "`fn main()` jest punktem wejścia programu binarnego.",
    distinguish:
      "main uruchamia program; zwykła funkcja wykonuje się dopiero po wywołaniu.",
  },
  {
    id: "cargo-workflow",
    title: "Projekt i przepływ Cargo",
    prerequisites: ["program-entry"],
    competencyIds: ["cargo-workflow"],
    reviewPrompt:
      "Co robi `cargo new`, a co robi `cargo run` w świeżym projekcie?",
    reviewAnswer:
      "`cargo new` tworzy pakiet, a `cargo run` kompiluje i uruchamia jego binarny cel.",
    distinguish:
      "Utworzenie projektu, kompilacja i uruchomienie to osobne obserwowalne kroki.",
  },
  {
    id: "bindings-mutability",
    title: "Wiązania i mutowalność",
    prerequisites: ["program-entry"],
    competencyIds: ["bindings-mutability"],
    reviewPrompt: "Dlaczego przypisanie do `let x = 1` kończy się E0384?",
    reviewAnswer:
      "Wiązanie jest niemutowalne; dodanie `mut` do deklaracji pozwala przypisać nową wartość.",
    distinguish:
      "`mut` zmienia możliwość przypisania do wiązania; nie zmienia automatycznie typu wartości.",
  },
  {
    id: "scalar-types",
    title: "Typy skalarne",
    prerequisites: ["bindings-mutability"],
    competencyIds: ["bindings-mutability"],
    reviewPrompt:
      "Jakie cztery proste wartości możesz zapisać jako i32, f64, bool i char?",
    reviewAnswer:
      "To odpowiednio liczba całkowita, liczba zmiennoprzecinkowa, prawda/fałsz i pojedyncza wartość skalarna Unicode.",
    distinguish:
      "Typ opisuje rodzaj wartości; mutowalność opisuje możliwość zmiany wiązania.",
  },
  {
    id: "functions-expressions",
    title: "Funkcje i wyrażenia",
    prerequisites: ["scalar-types"],
    competencyIds: ["function-contracts", "syntax-expressions"],
    reviewPrompt:
      "Dlaczego `x + 1` bez średnika może być wynikiem funkcji, a `x + 1;` już nie?",
    reviewAnswer:
      "Blok funkcji zwraca ostatnie wyrażenie bez średnika; średnik zmienia je w instrukcję bez użytecznego wyniku, reprezentowaną przez `()`.",
    distinguish:
      "Średnik może zmienić wartość wyrażenia na pustą wartość jednostkową.",
  },
  {
    id: "control-flow",
    title: "Warunki i proste pętle",
    prerequisites: ["functions-expressions"],
    competencyIds: ["control-flow"],
    reviewPrompt: "Co oznacza zakres `1..=3` w pętli `for`?",
    reviewAnswer:
      "Wytwarza kolejno 1, 2 i 3, bo końcowa granica jest włączona.",
    distinguish:
      "`if` wybiera gałąź, a `for` powtarza ciało dla kolejnych wartości zakresu.",
  },
  {
    id: "rules-based-testing",
    title: "Reguła, przypadki i granice",
    prerequisites: ["control-flow"],
    competencyIds: ["foundations-transfer-testing"],
    reviewPrompt:
      "Po co testować zero, granicę i zwykły przypadek małej funkcji?",
    reviewAnswer:
      "Różne przypadki ujawniają pomylenie kolejności reguł oraz błędy na granicach.",
    distinguish:
      "Działający przykład pokazuje jedną ścieżkę; testy wieloprzypadkowe sprawdzają regułę.",
  },
];

export const foundationsLessons: Lesson[] = [
  {
    id: "first-program",
    moduleId: "rust-foundations",
    conceptIds: ["program-entry", "cargo-workflow"],
    competencyIds: ["syntax-expressions", "cargo-workflow"],
    prerequisites: [],
    title: "Pierwszy program i pierwszy przebieg",
    subtitle:
      "Zobacz, gdzie zaczyna się binarny program i jak Cargo prowadzi go od pliku do wyniku.",
    minutes: 12,
    outcomes: [
      "Rozpoznasz `fn main()` i `println!` w prostym programie.",
      "Dobierzesz cargo new, cargo build i cargo run do celu.",
      "Odróżnisz sprawdzenie przykładu od sprawdzenia lokalnych narzędzi.",
    ],
    steps: [
      {
        id: "entry-discover",
        evidence: { version: 1, conceptIds: ["program-entry"] },
        kind: "predict",
        title: "Znajdź punkt wejścia",
        prompt:
          "Która część programu uruchamia się jako pierwsza i jaki dokładnie tekst zobaczysz?",
        code: 'fn main() {\n    println!("Witaj, Rust!");\n}',
        solution: 'fn main() {\n    println!("Witaj, Rust!");\n}',
        choices: [
          { id: "main", label: "`fn main()`, a potem Witaj, Rust!" },
          { id: "println", label: "`println!` bez funkcji main" },
          { id: "nothing", label: "Nic, bo program nie ma return" },
        ],
        evaluator: {
          kind: "choice",
          correct: "main",
          explanations: {
            main: "Binarne programy Rust zaczynają od main, a println! wypisuje jedną linię.",
            println:
              "println! jest wywołaniem wewnątrz main; samo makro nie zastępuje punktu wejścia.",
            nothing:
              "main nie musi mieć jawnego return, aby wykonać instrukcje i zakończyć się sukcesem.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Przeczytaj nazwę funkcji przy klamrze otwierającej.",
          "Makro println! dopisuje znak nowej linii.",
        ],
      },
      {
        id: "entry-run",
        evidence: { version: 1, conceptIds: ["program-entry"] },
        kind: "run",
        title: "Uruchom minimalny program",
        prompt:
          "Uruchom kod w edytorze i porównaj wynik z przewidywaniem. To sprawdza ten fragment Rust; instalację narzędzi potwierdzisz osobnymi komendami lokalnie.",
        code: 'fn main() {\n    println!("Witaj, Rust!");\n}',
        solution: 'fn main() {\n    println!("Witaj, Rust!");\n}',
        evaluator: { kind: "exact-output", expected: "Witaj, Rust!\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "cargo-sequence",
        evidence: { version: 1, conceptIds: ["cargo-workflow"] },
        kind: "apply",
        title: "Ułóż pracę Cargo",
        prompt:
          "Cargo zarządza projektem: cargo new tworzy pakiet, cargo build kompiluje, a cargo run kompiluje i uruchamia binarny program. Wybierz sekwencję dla nowego lokalnego programu.",
        choices: [
          {
            id: "new-run",
            label: "`cargo new hello` → `cd hello` → `cargo run`",
          },
          {
            id: "run-new",
            label: "`cargo run` → `cargo new hello`",
          },
          {
            id: "rustc-only",
            label: "Tylko `rustc --version` tworzy projekt",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "new-run",
          explanations: {
            "new-run":
              "cargo new tworzy pakiet, cd wybiera jego katalog, a cargo run buduje i uruchamia binarny cel.",
            "run-new": "cargo run wymaga już istniejącego pakietu Cargo.",
            "rustc-only":
              "rustc --version pokazuje wersję kompilatora; nie tworzy Cargo.toml ani projektu.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "toolchain-check",
        evidence: { version: 1, conceptIds: ["cargo-workflow"] },
        kind: "explain",
        title: "Sprawdź narzędzia uczciwie",
        prompt:
          "Jeśli chcesz zainstalować Rust lokalnie, zacznij od oficjalnej strony instalacji i zalecanego rustup, który utrzymuje stabilny toolchain. Potem opcjonalnie sprawdź `rustc --version`, `cargo --version` i `rustfmt --version`; `cargo fmt -- --check` sprawdza formatowanie, a `cargo clippy` wyszukuje typowe problemy. Która odpowiedź opisuje tę procedurę? Nie musisz deklarować, czy masz już te narzędzia.",
        choices: [
          {
            id: "versions",
            label:
              "Oficjalny rustup → wersje rustc/cargo/rustfmt → `cargo fmt -- --check` → `cargo clippy`",
          },
          { id: "run", label: "Tylko `cargo run`" },
          { id: "print", label: "Tylko `println!` w kodzie" },
        ],
        evaluator: {
          kind: "choice",
          correct: "versions",
          explanations: {
            versions:
              "rustup jest zalecaną ścieżką instalacji; wersje potwierdzają narzędzia, cargo fmt sprawdza format, a cargo clippy szuka typowych problemów.",
            run: "cargo run uruchamia projekt, ale nie zastępuje instalacji rustup ani sprawdzenia formattera i Clippy.",
            print:
              "Kod programu nie instaluje Rust ani nie uruchamia formattera i Clippy.",
          },
        },
        evidenceKind: "recall",
      },
      {
        id: "entry-modify",
        evidence: { version: 1, conceptIds: ["program-entry"] },
        kind: "modify",
        title: "Zmień komunikat",
        prompt:
          "Zmień tylko tekst tak, aby program wypisał `Rust działa!`. Zachowaj main i uruchom gotowy kod.",
        code: 'fn main() {\n    println!("Witaj, Rust!");\n}',
        solution: 'fn main() {\n    println!("Rust działa!");\n}',
        evaluator: { kind: "exact-output", expected: "Rust działa!\n" },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Nie zmieniaj nazwy funkcji.",
          "Tekst między cudzysłowami jest argumentem println!.",
        ],
      },
      {
        id: "entry-recall",
        evidence: { version: 1, conceptIds: ["program-entry"] },
        kind: "recall",
        title: "Nazwij trzy role",
        prompt:
          "Wpisz trzy nazwy w kolejności: punkt wejścia, wypisywanie, komenda kompilująca i uruchamiająca.",
        evaluator: {
          kind: "answer",
          accepted: ["main; println!; cargo run", "main, println!, cargo run"],
          feedback: "Wpisz kolejno main, println! i cargo run.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "Brak jawnego return oznacza, że main nic nie wykonuje.",
      "Uruchomienie przykładu zastępuje sprawdzenie lokalnej instalacji Cargo.",
      "rustc --version tworzy strukturę projektu.",
    ],
    transferTask:
      "Utwórz lokalnie pakiet Cargo, sprawdź rustc --version, cargo --version, rustfmt --version i cargo clippy --version, a następnie zmień komunikat w src/main.rs. Później przejdź do małego lokalnego programu naliczającego opłatę za paczkę i sprawdź go własnymi testami.",
    evidenceGate:
      "Samodzielna zmiana komunikatu daje dokładnie oczekiwany wynik; procedura lokalnej instalacji pozostaje osobnym sprawdzeniem komend.",
    sourceIds: [
      "foundations-rust-installation",
      "foundations-cargo-first-steps",
    ],
  },
  {
    id: "bindings-types",
    moduleId: "rust-foundations",
    conceptIds: ["bindings-mutability", "scalar-types"],
    competencyIds: ["bindings-mutability", "syntax-expressions"],
    prerequisites: ["first-program"],
    title: "Wiązania i typy bez zgadywania",
    subtitle:
      "Zobacz, co przechowuje let, kiedy potrzebujesz mut i jak czytać proste typy skalarne.",
    minutes: 16,
    outcomes: [
      "Wyjaśnisz, dlaczego let jest niemutowalne domyślnie.",
      "Naprawisz E0384 przez świadome dodanie mut.",
      "Rozpoznasz i32, f64, bool oraz char w prostym kodzie.",
      "Rozróżnisz const, inferencję, usize i dwa rodzaje dzielenia.",
    ],
    steps: [
      {
        id: "bindings-discover",
        evidence: { version: 1, conceptIds: ["bindings-mutability"] },
        kind: "predict",
        title: "Odkryj domyślną regułę",
        prompt: "Które zdanie najlepiej opisuje `let` bez `mut`?",
        code: 'fn main() {\n    let x = 1;\n    println!("{x}");\n}',
        solution: 'fn main() {\n    let x = 1;\n    println!("{x}");\n}',
        choices: [
          {
            id: "immutable",
            label: "Wiązanie nie przyjmuje kolejnego przypisania",
          },
          { id: "always-mutable", label: "Każde let można dowolnie zmieniać" },
          { id: "type-only", label: "let służy wyłącznie do deklaracji typu" },
        ],
        evaluator: {
          kind: "choice",
          correct: "immutable",
          explanations: {
            immutable:
              "Rust wymaga jawnego mut, gdy chcesz ponownie przypisać do wiązania.",
            "always-mutable":
              "Domyślna niemutowalność jest właśnie ochroną przed takim przypisaniem.",
            "type-only":
              "let wiąże wartość z nazwą; adnotacja typu jest opcjonalna, gdy typ można wywnioskować.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "scalar-predict",
        evidence: { version: 1, conceptIds: ["scalar-types"] },
        kind: "predict",
        title: "Odczytaj typy skalarne",
        prompt:
          "Przewidź dokładne cztery wartości. Adnotacje pokazują typ, ale nie zmieniają formatu println!.",
        code: "fn main() {\n    let whole: i32 = -4;\n    let ratio: f64 = 2.5;\n    let ready: bool = true;\n    let initial: char = 'R';\n    println!(\"{whole} {ratio} {ready} {initial}\");\n}",
        solution:
          "fn main() {\n    let whole: i32 = -4;\n    let ratio: f64 = 2.5;\n    let ready: bool = true;\n    let initial: char = 'R';\n    println!(\"{whole} {ratio} {ready} {initial}\");\n}",
        evaluator: {
          kind: "answer",
          accepted: ["-4 2.5 true R", "-4 2.5 true R\\n"],
          feedback:
            "Wpisz pełny wynik w kolejności whole, ratio, ready, initial; potem uruchom kod, aby zweryfikować przewidywanie.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Czytaj literal przy każdej nazwie, nie tylko nazwę typu.",
          "println! rozdziela interpolowane wartości pojedynczą spacją z tekstu formatu.",
        ],
      },
      {
        id: "mut-error",
        evidence: { version: 1, conceptIds: ["bindings-mutability"] },
        kind: "debug",
        title: "Napraw E0384",
        prompt:
          "Uruchom celowo błędny kod. Dodaj najmniejszą zmianę, która pozwoli przypisać `x = 6`, i zachowaj wypisanie wartości x.",
        code: 'fn main() {\n    let x = 5;\n    x = 6;\n    println!("{x}");\n}',
        solution:
          'fn main() {\n    let mut x = 5;\n    x = 6;\n    println!("{x}");\n}',
        evaluator: {
          kind: "exact-output",
          expected: "6\n",
          requiredPatterns: ["let mut x", "x = 6"],
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0384",
        hints: [
          "E0384 mówi o ponownym przypisaniu do niemutowalnego wiązania.",
          "Dodaj mut w deklaracji, a nie przy drugim przypisaniu.",
        ],
      },
      {
        id: "mut-run",
        evidence: { version: 1, conceptIds: ["bindings-mutability"] },
        kind: "run",
        title: "Sprawdź zmianę",
        prompt: "Uruchom poprawiony program i sprawdź wartość po przypisaniu.",
        code: 'fn main() {\n    let mut count = 1;\n    count = count + 2;\n    println!("{count}");\n}',
        solution:
          'fn main() {\n    let mut count = 1;\n    count = count + 2;\n    println!("{count}");\n}',
        evaluator: { kind: "exact-output", expected: "3\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "shadow-types",
        evidence: { version: 1, conceptIds: ["bindings-mutability"] },
        kind: "modify",
        title: "Rozróżnij mut i shadowing",
        prompt:
          "Zmień przykład tak, aby drugie `label` było liczbą długości, a program wypisał `4`. Użyj ponownego `let`, nie mut.",
        code: 'fn main() {\n    let mut label = "Rust";\n    label = label.len();\n    println!("{label}");\n}',
        solution:
          'fn main() {\n    let label = "Rust";\n    let label = label.len();\n    println!("{label}");\n}',
        evaluator: {
          kind: "exact-output",
          expected: "4\n",
          requiredPatterns: ["let label = label.len()"],
          forbiddenPatterns: ["let mut label"],
        },
        evidenceKind: "transfer",
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Sprawdź, czy zmieniasz typ istniejącego wiązania, czy tworzysz nowe.",
          "Nie musisz zmieniać println!.",
        ],
      },
      {
        id: "bindings-recall",
        evidence: { version: 1, conceptIds: ["bindings-mutability"] },
        kind: "recall",
        title: "Wybierz właściwą regułę",
        prompt:
          "Wpisz dwa słowa w kolejności: słowo kluczowe dla ponownego przypisania; słowo kluczowe dla nowego wiązania, które może zmienić typ.",
        evaluator: {
          kind: "answer",
          accepted: ["mut; let", "mut, let"],
          feedback: "Wpisz kolejno mut i let.",
        },
        evidenceKind: "recall",
      },
      {
        id: "numeric-discover",
        kind: "predict",
        title: "Dobierz liczby do znaczenia",
        prompt:
          "Liczby całkowite ze znakiem, np. i8 i i32, obejmują też wartości ujemne; u8 i u32 zaczynają od zera. Liczba w nazwie to szerokość w bitach: i8 mieści -128..=127, a u8 0..=255. usize służy m.in. do długości i indeksów, a jego szerokość zależy od platformy; nie zakładaj 64 bitów. Kompilator wnioskuje typ z wartości i użycia; bez innych wskazówek liczba całkowita otrzymuje i32, a zmiennoprzecinkowa f64. `: u8` wybiera typ jawnie. const wymaga typu i wyrażenia obliczalnego jako stała; nie może mieć mut. let tworzy lokalne wiązanie, a ponowne let może je przesłonić. Sprawdź przykład: operator `/` dla liczb całkowitych ucina część ułamkową w stronę zera, a `%` daje resztę. Jaki jest wynik?",
        code: 'const PAIR_SIZE: u32 = 2;\nfn main() {\n    let signed: i8 = -2;\n    let byte: u8 = 255;\n    let inferred = 7;\n    let fraction: f64 = 7.0 / 2.0;\n    let length: usize = "Rust".len(); // tutaj 4 bajty ASCII\n    let items = 8u32; // sufiks też wskazuje typ\n    let items = items / PAIR_SIZE; // nowe wiązanie przez shadowing\n    println!("{signed} {byte} {} {fraction} {length} {items}", inferred / 2);\n}',
        solution:
          'const PAIR_SIZE: u32 = 2;\nfn main() {\n    let signed: i8 = -2;\n    let byte: u8 = 255;\n    let inferred = 7;\n    let fraction: f64 = 7.0 / 2.0;\n    let length: usize = "Rust".len(); // tutaj 4 bajty ASCII\n    let items = 8u32; // sufiks też wskazuje typ\n    let items = items / PAIR_SIZE; // nowe wiązanie przez shadowing\n    println!("{signed} {byte} {} {fraction} {length} {items}", inferred / 2);\n}',
        evaluator: {
          kind: "answer",
          accepted: ["-2 255 3 3.5 4 4"],
          feedback:
            "Oblicz osobno 7 / 2 i 7.0 / 2.0. const PAIR_SIZE pozostaje 2; nowe items ma 4.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Inferencja nie oznacza zmiany typu podczas działania programu.",
          "Zwróć uwagę na kropkę w 7.0.",
        ],
      },
      {
        id: "numeric-halves-transfer",
        kind: "blank",
        title: "Policz pełne pary",
        prompt:
          "Napisz ciało complete_pairs(items: u32) -> u32: dla liczby elementów z 0..=1000 zwróć liczbę pełnych par, pomijając samotny element. Podana otoczka funkcji ma parametr items, a -> u32 opisuje wynik. Wpisz obliczenie jako ostatnie wyrażenie bez średnika; pełniej poznasz funkcje w następnej lekcji. Nie zmieniaj sygnatury. Samo poprawne dopasowanie typów nie wyklucza przepełnienia arytmetycznego: wynik działania musi mieścić się w typie. Nie opieraj reguły na tym, czy dana konfiguracja kompilacji panikuje albo zawija wynik. Tutaj dzielenie przez stałe 2 nie przepełnia u32 i nie dzieli przez zero. Po Option poznasz checked_add jako jawną politykę dla dodawania. Testy sprawdzają także inne wartości niż pokazane 7.",
        code: completePairsContract.starter,
        solution: completePairsContract.solution,
        evaluator: {
          kind: "tests",
          tests: completePairsContract.tests,
        },
        evidence: {
          version: 1,
          conceptIds: ["scalar-types"],
          codingTaskId: "foundations/complete-pairs",
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Dla 1 wynikiem jest 0, a dla 8 wynikiem jest 4.",
          "Wybierz dzielenie całkowite przez 2.",
        ],
      },
    ],
    misconceptions: [
      "E0384 oznacza błąd typu liczby.",
      "mut pozwala zmienić typ istniejącego wiązania.",
      "char i napis w cudzysłowie to ta sama wartość.",
    ],
    transferTask:
      "Dla nowej wartości licznikowej wybierz let albo let mut, dodaj adnotację typu tylko gdy pomaga, i przewidź wynik.",
    evidenceGate:
      "Naprawa E0384 daje oczekiwaną wartość, a osobny przypadek pokazuje typy skalarne i shadowing.",
    sessionStops: [
      {
        afterStepId: "bindings-recall",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Rozróżnij typy liczb i policz pełne pary. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: ["foundations-variables", "foundations-data-types"],
  },
  {
    id: "functions-expressions",
    moduleId: "rust-foundations",
    conceptIds: ["functions-expressions"],
    competencyIds: ["function-contracts", "syntax-expressions"],
    prerequisites: ["bindings-types"],
    title: "Funkcje zwracają wyrażenia",
    subtitle:
      "Zbuduj małe granice z typami i zobacz, jak średnik zmienia wynik bloku.",
    minutes: 16,
    outcomes: [
      "Napiszesz funkcję z parametrami i wynikiem i32.",
      "Rozpoznasz ostatnie wyrażenie bez średnika jako wynik funkcji.",
      "Naprawisz błąd E0308 wywołany przez średnik w miejscu wyniku.",
      "Odczytasz return, jednostkę () i wynik krotkowy.",
    ],
    steps: [
      {
        id: "function-discover",
        kind: "predict",
        title: "Przeczytaj sygnaturę",
        prompt: "Co oznacza `fn add(left: i32, right: i32) -> i32`?",
        choices: [
          { id: "two-to-one", label: "Dwa argumenty i32, wynik i32" },
          { id: "one-to-two", label: "Jeden argument i dwa wyniki" },
          { id: "no-types", label: "Typy są tylko komentarzem" },
        ],
        evaluator: {
          kind: "choice",
          correct: "two-to-one",
          explanations: {
            "two-to-one":
              "Każdy parametr ma typ, a strzałka opisuje typ zwracany.",
            "one-to-two":
              "Przecinek rozdziela dwa parametry, a -> i32 opisuje jeden wynik.",
            "no-types":
              "W sygnaturze Rust typy są częścią kontraktu kompilatora.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "function-run",
        kind: "run",
        title: "Wywołaj funkcję",
        prompt:
          "Uruchom funkcję z dwoma parametrami i sprawdź wynik. Zauważ brak średnika przy ostatnim wyrażeniu w multiply.",
        code: 'fn multiply(left: i32, right: i32) -> i32 {\n    left * right\n}\n\nfn main() {\n    println!("{}", multiply(1, 5));\n}',
        solution:
          'fn multiply(left: i32, right: i32) -> i32 {\n    left * right\n}\n\nfn main() {\n    println!("{}", multiply(1, 5));\n}',
        evaluator: { kind: "exact-output", expected: "5\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "function-error",
        kind: "debug",
        title: "Zobacz koszt średnika",
        prompt:
          "Uruchom błędny kod, a potem usuń tylko średnik przy `left + right`, aby funkcja zwróciła i32.",
        code: 'fn add(left: i32, right: i32) -> i32 {\n    left + right;\n}\n\nfn main() {\n    println!("{}", add(2, 3));\n}',
        solution:
          'fn add(left: i32, right: i32) -> i32 {\n    left + right\n}\n\nfn main() {\n    println!("{}", add(2, 3));\n}',
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn add_handles_new_cases() {\n    assert_eq!(add(2, 3), 5);\n    assert_eq!(add(-2, 5), 3);\n}",
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Błąd porównuje oczekiwany i32 z faktycznym `()`.",
          "Ostatnie wyrażenie bloku wynikowego nie może kończyć się średnikiem.",
        ],
      },
      {
        id: "function-modify",
        kind: "modify",
        title: "Zmień kontrakt bez zgadywania",
        prompt:
          "Zmień funkcję tak, aby zwracała różnicę `left - right`, a program wypisał `7` dla 10 i 3.",
        code: 'fn difference(left: i32, right: i32) -> i32 {\n    left + right\n}\n\nfn main() {\n    println!("{}", difference(10, 3));\n}',
        solution:
          'fn difference(left: i32, right: i32) -> i32 {\n    left - right\n}\n\nfn main() {\n    println!("{}", difference(10, 3));\n}',
        evaluator: {
          kind: "exact-output",
          expected: "7\n",
          requiredPatterns: ["difference(10,3)"],
        },
        evidenceKind: "transfer",
        expectedStatus: "success",
        hints: [
          "Sygnatura już opisuje dwa i32 i wynik i32.",
          "Zmień operator w ostatnim wyrażeniu funkcji.",
        ],
      },
      {
        id: "function-recall",
        kind: "recall",
        title: "Dokończ regułę",
        prompt:
          "Uzupełnij: w funkcji zwracającej i32 ostatnie wyrażenie bez średnika ma wartość ..., a to samo wyrażenie ze średnikiem ma wartość ... .",
        evaluator: {
          kind: "answer",
          accepted: ["i32; ()", "i32 i ()"],
          feedback:
            "Właściwe rozróżnienie to wartość obliczenia versus pusty typ jednostkowy ().",
        },
        evidenceKind: "recall",
      },
      {
        id: "function-transfer",
        kind: "apply",
        title: "Przenieś zasadę na nową funkcję",
        prompt:
          "Wybierz poprawny kontrakt dla funkcji, która pobiera dwie liczby i zwraca ich większą wartość.",
        choices: [
          { id: "i32", label: "`fn max(a: i32, b: i32) -> i32`" },
          { id: "unit", label: "`fn max(a: i32, b: i32) -> ()`" },
          { id: "missing", label: "`fn max(a, b)` bez typów" },
        ],
        evaluator: {
          kind: "choice",
          correct: "i32",
          explanations: {
            i32: "Kontrakt pasuje do dwóch argumentów i wyniku będącego liczbą.",
            unit: "() opisuje brak użytecznego wyniku, więc nie pasuje do max.",
            missing: "Parametry funkcji Rust wymagają jawnych typów.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "function-return-unit-discover",
        kind: "predict",
        title: "Return, jednostka i krotka",
        prompt:
          "return kończy bieżącą funkcję od razu i może podać jej wynik. W tym przykładzie if n < 0 oznacza: wykonaj blok tylko dla liczby ujemnej; szczegółowe warunki poznasz w następnej lekcji. Funkcja bez -> zwraca (), czyli jednostkę: jedną pustą wartość, a nie brak poprawnego typu. return; pasuje do takiej funkcji. Typ (i32, bool) opisuje krotkę: stałą liczbę pozycji o potencjalnie różnych typach. Nawiasy nie tworzą kolekcji, która rośnie. let (value, ready) rozpakowuje obie pozycje. Przewidź cały wynik; {:?} pokazuje tutaj pustą wartość ().",
        code: 'fn nonnegative(n: i32) -> i32 {\n    if n < 0 { return 0; }\n    n\n}\nfn announce() {\n    println!("start");\n    return;\n}\nfn main() {\n    let unit: () = announce();\n    let result: (i32, bool) = (nonnegative(-3), true);\n    let (value, ready) = result;\n    println!("{value} {ready} {unit:?}");\n}',
        solution:
          'fn nonnegative(n: i32) -> i32 {\n    if n < 0 { return 0; }\n    n\n}\nfn announce() {\n    println!("start");\n    return;\n}\nfn main() {\n    let unit: () = announce();\n    let result: (i32, bool) = (nonnegative(-3), true);\n    let (value, ready) = result;\n    println!("{value} {ready} {unit:?}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["start\n0 true ()"],
          feedback:
            "announce wypisuje start i zwraca (). W nonnegative(-3) return kończy funkcję przed końcowym n.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "function-tuple-repair",
        kind: "debug",
        title: "Zwróć dwie części czasu",
        prompt:
          "Napraw split_minutes: przyjmij liczbę minut z 0..=1440 i zwróć krotkę (pełne godziny, pozostałe minuty). / liczy pełne godziny, % resztę z dzielenia przez 60. Zachowaj sygnaturę i kolejność pozycji. main rozpakowuje wynik przez let (hours, rest). Możesz użyć jawnego return albo końcowego wyrażenia; testy sprawdzają zachowanie także dla 0, 59, 60 i świeżych wartości.",
        code: splitMinutesContract.starter,
        solution: splitMinutesContract.solution,
        evaluator: {
          kind: "tests",
          tests: splitMinutesContract.tests,
        },
        evidence: {
          version: 1,
          conceptIds: ["functions-expressions"],
          codingTaskId: "foundations/split-minutes",
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "compile-error",
        expectedError: "E0308",
        hints: [
          "Obecny średnik pozostawia wynik ().",
          "Wynik (hours, rest) jest jedną krotką, a nie dwoma return.",
        ],
      },
    ],
    misconceptions: [
      "Średnik jest tylko formatowaniem i nie zmienia wartości.",
      "Typ po strzałce opisuje argument funkcji.",
      "Funkcja bez jawnego return nie może nic zwrócić.",
    ],
    transferTask:
      "Zaprojektuj małą funkcję i32 z dwoma argumentami, sprawdź jeden przypadek skrajnymi liczbami i zdecyduj, gdzie potrzebny jest średnik.",
    evidenceGate:
      "Naprawa średnika daje oczekiwany wynik, a zmieniony kontrakt przechodzi osobny przypadek difference.",
    sessionStops: [
      {
        afterStepId: "function-transfer",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Porównaj return, jednostkę i wynik krotkowy. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: ["foundations-functions"],
  },
  {
    id: "control-flow",
    moduleId: "rust-foundations",
    conceptIds: ["control-flow"],
    competencyIds: ["control-flow", "syntax-expressions"],
    prerequisites: ["functions-expressions"],
    title: "Warunek jako wartość, zakres jako kroki",
    subtitle:
      "Najpierw przewiduj gałąź, potem policz iteracje i zmodyfikuj zakres.",
    minutes: 18,
    outcomes: [
      "Użyjesz bool jako warunku if.",
      "Zapiszesz if jako wyrażenie przypisywane do wiązania.",
      "Przewidzisz i zmienisz iteracje pętli for po zakresie.",
      "Samodzielnie połączysz warunek i zakres, sprawdzając pusty przypadek.",
    ],
    steps: [
      {
        id: "flow-discover",
        kind: "predict",
        title: "Odkryj warunek",
        prompt: "Które wejście jest poprawnym warunkiem `if` w Rust?",
        code: 'fn main() {\n    let score = 7;\n    if score >= 5 {\n        println!("pass");\n    }\n}',
        solution:
          'fn main() {\n    let score = 7;\n    if score >= 5 {\n        println!("pass");\n    }\n}',
        choices: [
          { id: "comparison", label: "`score >= 5`" },
          { id: "integer", label: "`score` bez porównania" },
          { id: "text", label: '`"ready"`' },
        ],
        evaluator: {
          kind: "choice",
          correct: "comparison",
          explanations: {
            comparison: "Porównanie ma typ bool, którego wymaga if.",
            integer: "Rust nie konwertuje automatycznie liczby na bool.",
            text: "Napis nie jest warunkiem bool.",
          },
        },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "flow-predict",
        kind: "predict",
        title: "Przewidź wartość if",
        prompt:
          "Przewidź, jaka etykieta zostanie przypisana. `if` jest wyrażeniem, więc obie gałęzie muszą dostarczyć zgodną wartość.",
        code: 'fn main() {\n    let score = 7;\n    let band = if score >= 5 { "pass" } else { "retry" };\n    println!("{band}");\n}',
        solution:
          'fn main() {\n    let score = 7;\n    let band = if score >= 5 { "pass" } else { "retry" };\n    println!("{band}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["pass", "pass\\n"],
          feedback:
            "score = 7 spełnia warunek score >= 5, więc band otrzymuje wartość pass; potem uruchom kod.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "7 >= 5 ma wartość true.",
          "Przy true wybierana jest pierwsza gałąź.",
        ],
      },
      {
        id: "flow-run",
        kind: "run",
        title: "Uruchom zakres",
        prompt:
          "Najpierw policz, ile linii powstanie dla `1..=3`, a potem uruchom pętlę.",
        code: 'fn main() {\n    for number in 1..=3 {\n        println!("{number}");\n    }\n}',
        solution:
          'fn main() {\n    for number in 1..=3 {\n        println!("{number}");\n    }\n}',
        evaluator: { kind: "exact-output", expected: "1\n2\n3\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "flow-modify",
        kind: "modify",
        title: "Zmień liczbę iteracji",
        prompt:
          "Zmień końcową granicę tak, aby program wypisał 1, 2, 3 i 4 — po jednej liczbie w wierszu. Na końcu lekcji samodzielnie połączysz zakres i warunek w zadaniu z pustym przypadkiem.",
        code: 'fn main() {\n    for number in 1..=3 {\n        println!("{number}");\n    }\n}',
        solution:
          'fn main() {\n    for number in 1..=4 {\n        println!("{number}");\n    }\n}',
        evaluator: {
          kind: "exact-output",
          expected: "1\n2\n3\n4\n",
          requiredPatterns: ["for", "1..=4"],
        },
        evidenceKind: "fix",
        evidenceGate: false,
        expectedStatus: "success",
        hints: [
          "Operator `..=` oznacza granicę włączoną.",
          "Zmień tylko liczbę końcową z 3 na 4.",
        ],
      },
      {
        id: "flow-boundary",
        kind: "apply",
        title: "Rozróżnij dwa zakresy",
        prompt: "Ile razy wykona się ciało dla `2..5`?",
        choices: [
          { id: "three", label: "Trzy: 2, 3, 4" },
          { id: "four", label: "Cztery: 2, 3, 4, 5" },
          { id: "two", label: "Dwa: 2, 3" },
        ],
        evaluator: {
          kind: "choice",
          correct: "three",
          explanations: {
            three: "Zakres `..` wyklucza końcową granicę 5.",
            four: "Włączenie końca zapisuje się `2..=5`.",
            two: "Zakres obejmuje także 4.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "flow-transfer",
        kind: "modify",
        title: "Połącz if i for",
        prompt:
          "Wynik zaczyna od 1. Zmień dodawaną wartość z 6 na 2, zachowując przypisanie do score. Przewidź wybór gałęzi if: program powinien wypisać `retry`, a pętla nadal 2, 3, 4. Zachowaj if i for.",
        code: 'fn main() {\n    let mut score = 1;\n    score = score + 6;\n    let band = if score >= 5 { "pass" } else { "retry" };\n    println!("{band}");\n    for number in 2..5 {\n        println!("{number}");\n    }\n}',
        solution:
          'fn main() {\n    let mut score = 1;\n    score = score + 2;\n    let band = if score >= 5 { "pass" } else { "retry" };\n    println!("{band}");\n    for number in 2..5 {\n        println!("{number}");\n    }\n}',
        evaluator: {
          kind: "exact-output",
          expected: "retry\n2\n3\n4\n",
          requiredPatterns: [
            "let mut score",
            "score = score",
            "if",
            "for",
            "2..5",
          ],
        },
        evidenceKind: "transfer",
        expectedStatus: "success",
        hints: ["score = 3 wybiera else.", "Zakres 2..5 kończy się przed 5."],
      },
      {
        id: "flow-recall",
        kind: "recall",
        title: "Odtwórz kolejność",
        prompt:
          "W jakiej kolejności pracujesz przy nowym warunku z pętlą: odkryj regułę, przewidź output, uruchom, zmodyfikuj i uruchom ponownie?",
        evaluator: {
          kind: "ordering",
          correct: ["discover", "predict", "run", "modify"],
        },
        evidenceKind: "recall",
      },
      {
        id: "flow-range-transfer",
        kind: "blank",
        title: "Samodzielnie wybierz i policz",
        prompt:
          "Napisz ciało count_even_above(start, end, minimum). Dla argumentów u32 z 0..=1000 policz parzyste liczby w zakresie start..end, które są co najmniej minimum. end jest wykluczone. Gdy start >= end, wynik to 0. Zero jest parzyste. Operator % daje resztę, więc number % 2 == 0 sprawdza parzystość; && wymaga spełnienia obu warunków. Sam wybierz zakres i warunek, nie zmieniaj sygnatury. Testy obejmują pusty zakres i obie granice. Wynik testów sprawdza zachowanie; sam nie dowodzi użycia konkretnej składni pętli.",
        code: rangeSelectionContract.starter,
        solution: rangeSelectionContract.solution,
        evaluator: {
          kind: "tests",
          tests: rangeSelectionContract.tests,
        },
        evidence: {
          version: 1,
          conceptIds: ["control-flow"],
          codingTaskId: "foundations/range-selection",
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Licznik zaczyna od zera. Zwiększaj go tylko dla liczby spełniającej oba warunki.",
          "Sprawdź osobno start = end oraz przypadek, gdy jedyna parzysta liczba jest równa end.",
        ],
      },
      {
        id: "flow-range-cost",
        kind: "blank",
        title: "Oblicz koszt trasy",
        prompt:
          "Na trasie są ponumerowane odcinki. Za odcinek o numerze mniejszym niż `remont_od` płacisz 2 zł. Od numeru `remont_od` włącznie każdy odcinek kosztuje 3 zł. Napisz od zera funkcję `fn koszt_trasy(pierwszy: u32, ostatni: u32, remont_od: u32) -> u32`. Uwzględnij oba końce trasy. Jeśli pierwszy numer jest większy od ostatniego, koszt wynosi 0. Każdy argument mieści się w zakresie od 0 do 1000. Dla trasy od 4 do 6 przy remoncie od 5 koszt wynosi 2 + 3 + 3. Sam wybierz sposób obliczenia wyniku. Przed uruchomieniem przewidź koszt pojedynczego odcinka na granicy remontu.",
        solution: `fn koszt_trasy(pierwszy: u32, ostatni: u32, remont_od: u32) -> u32 {
    let mut koszt = 0;
    for odcinek in pierwszy..=ostatni {
        koszt += if odcinek < remont_od { 2 } else { 3 };
    }
    koszt
}`,
        evaluator: {
          kind: "tests",
          tests: `#[test]
fn granice_trasy() {
    assert_eq!(koszt_trasy(8, 4, 6), 0);
    assert_eq!(koszt_trasy(0, 0, 0), 3);
    assert_eq!(koszt_trasy(7, 7, 8), 2);
    assert_eq!(koszt_trasy(1000, 1000, 1000), 3);
}

#[test]
fn zmiana_stawki() {
    assert_eq!(koszt_trasy(2, 4, 5), 6);
    assert_eq!(koszt_trasy(2, 4, 1), 9);
    assert_eq!(koszt_trasy(2, 4, 3), 8);
    assert_eq!(koszt_trasy(2, 4, 4), 7);
    assert_eq!(koszt_trasy(0, 1000, 1000), 2003);
}`,
        },
        evidence: {
          version: 1,
          conceptIds: ["control-flow"],
          codingTaskId: "foundations/range-cost",
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Rozpisz numery odwiedzanych odcinków dla trasy z jednym odcinkiem oraz dla trasy pustej.",
          "Dla każdego odwiedzonego numeru porównaj go z remont_od, a potem dodaj właściwą stawkę do sumy.",
        ],
      },
    ],
    misconceptions: [
      "Liczba całkowita jest automatycznie prawdą lub fałszem.",
      "if służy tylko do wypisywania i nie ma wartości.",
      "Zakres z `..` zawiera koniec.",
    ],
    transferTask:
      "Wybierz jedno zadanie. Policz parzyste liczby spełniające warunek progu albo oblicz koszt trasy ze zmianą stawki. Sprawdź obie granice i pusty zakres.",
    evidenceGate:
      "Do zaliczenia rozwiąż jedno z dwóch zadań o zakresie bez podpowiedzi i bez odsłaniania rozwiązania. Testy sprawdzą wynik dla różnych granic i progów. Jeśli skorzystasz z pomocy, możesz spróbować drugiego zadania samodzielnie.",
    sessionStops: [
      {
        afterStepId: "flow-recall",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Wybierz zadanie o liczbach parzystych albo o koszcie trasy i zapisz własne rozwiązanie.",
      },
    ],
    sourceIds: ["foundations-control-flow"],
  },
  {
    id: "foundations-assessment",
    moduleId: "rust-foundations",
    conceptIds: [
      "rules-based-testing",
      "functions-expressions",
      "control-flow",
    ],
    competencyIds: [
      "function-contracts",
      "control-flow",
      "foundations-transfer-testing",
    ],
    prerequisites: ["control-flow"],
    title: "Ocena fundamentów: reguła i granice",
    subtitle:
      "Zaprojektuj małą funkcję scoringową, przewidź granice i sprawdź ją realnymi testami Rust.",
    minutes: 20,
    outcomes: [
      "Przełożysz opis reguł na kolejność warunków.",
      "Napiszesz implementację bez podanej sygnatury funkcji.",
      "Użyjesz testów dla zera, pełnego wyniku, ułamka i nietypowej granicy.",
    ],
    steps: [
      {
        id: "assessment-rules",
        kind: "assessment",
        title: "Ustal reguły przed kodem",
        prompt:
          "Funkcja `score(correct, attempted)` ma zwracać: 0 dla attempted <= 0, 0 dla correct <= 0, 100 gdy correct >= attempted, w pozostałych przypadkach całkowity procent `correct * 100 / attempted`. Oba wejścia mieszczą się w zakresie -1000..=1000. Która kolejność warunków chroni przypadek attempted = 0?",
        code: 'fn main() {\n    let attempted = 0;\n    let no_attempts = attempted <= 0;\n    println!("{no_attempts}");\n}',
        solution:
          'fn main() {\n    let attempted = 0;\n    let no_attempts = attempted <= 0;\n    println!("{no_attempts}");\n}',
        choices: [
          { id: "zero-first", label: "Najpierw attempted <= 0" },
          { id: "all-first", label: "Najpierw correct >= attempted" },
          { id: "percent-first", label: "Najpierw dzielenie procentowe" },
        ],
        evaluator: {
          kind: "choice",
          correct: "zero-first",
          explanations: {
            "zero-first":
              "Najpierw trzeba obsłużyć brak prób, żeby nie dzielić przez zero.",
            "all-first":
              "Dla correct = 0 i attempted = 0 ten warunek mógłby przedwcześnie zwrócić 100.",
            "percent-first":
              "Dzielenie przed regułami granicznymi nie jest bezpieczne dla attempted = 0.",
          },
        },
        evidenceKind: "assessment",
        expectedStatus: "success",
      },
      {
        id: "assessment-predict",
        kind: "predict",
        title: "Przewidź przypadki",
        prompt:
          "Zasady są: 0 dla attempted <= 0, 0 dla correct <= 0, 100 gdy correct >= attempted, w pozostałych przypadkach całkowity procent correct * 100 / attempted. Oba wejścia mieszczą się w zakresie -1000..=1000. Dla wywołań (0,0), (0,5), (3,3), (2,4), (1,3), (5,4) wpisz sześć wyników w kolejności. Nie oglądasz jeszcze implementacji score.",
        evaluator: {
          kind: "answer",
          accepted: ["0 0 100 50 33 100"],
          feedback:
            "Sprawdź kolejność: przypadki zerowe, pełny wynik, procent całkowity oraz correct większe od attempted. Następny krok wymaga napisania funkcji bez podanej sygnatury.",
        },
        evidenceKind: "prediction",
      },
      {
        id: "assessment-blank",
        kind: "blank",
        title: "Napisz score od zera",
        prompt:
          "Napisz od pustej kartki funkcję o nazwie `score` z dwoma całkowitymi wejściami i jednym całkowitym wynikiem. Oba wejścia mieszczą się w zakresie -1000..=1000. Zwróć 0, gdy attempted <= 0 albo correct <= 0; zwróć 100, gdy correct >= attempted; w pozostałych przypadkach zwróć całkowity wynik correct * 100 / attempted. Nie podajemy sygnatury ani kolejności warunków — wybierz je samodzielnie. Nie potrzebujesz main; rozwiązanie zostanie sprawdzone dla (0,0), (0,5), (3,3), (2,4), (1,3), (5,4), correct = -1, (999,1000) oraz attempted = -2.",
        solution:
          "fn score(correct: i32, attempted: i32) -> i32 {\n    if attempted <= 0 {\n        0\n    } else if correct <= 0 {\n        0\n    } else if correct >= attempted {\n        100\n    } else {\n        correct * 100 / attempted\n    }\n}",
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn score_rules_cover_boundaries() {\n    assert_eq!(score(0, 0), 0);\n    assert_eq!(score(0, 5), 0);\n    assert_eq!(score(-1, 5), 0);\n    assert_eq!(score(3, 3), 100);\n    assert_eq!(score(2, 4), 50);\n    assert_eq!(score(1, 3), 33);\n    assert_eq!(score(5, 4), 100);\n    assert_eq!(score(999, 1000), 99);\n    assert_eq!(score(1000, 1000), 100);\n    assert_eq!(score(1, -2), 0);\n}",
        },
        evidenceKind: "assessment",
        evidenceGate: true,
      },
      {
        id: "assessment-adversarial",
        kind: "debug",
        title: "Złap błąd na granicy",
        prompt:
          "Starter kompiluje się, ale ma odwróconą kolejność granic i błędnie zwraca 100 dla (0,0). Wejścia mieszczą się w zakresie -1000..=1000. Napraw funkcję tak, aby wszystkie ukryte przypadki przechodziły. Zachowaj nazwę score i nie usuwaj żadnego testu.",
        code: "fn score(correct: i32, attempted: i32) -> i32 {\n    if correct >= attempted {\n        100\n    } else if correct <= 0 {\n        0\n    } else if attempted <= 0 {\n        0\n    } else {\n        correct * 100 / attempted\n    }\n}",
        solution:
          "fn score(correct: i32, attempted: i32) -> i32 {\n    if attempted <= 0 {\n        0\n    } else if correct <= 0 {\n        0\n    } else if correct >= attempted {\n        100\n    } else {\n        correct * 100 / attempted\n    }\n}",
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn adversarial_boundaries() {\n    assert_eq!(score(0, 0), 0);\n    assert_eq!(score(0, 4), 0);\n    assert_eq!(score(-1, 4), 0);\n    assert_eq!(score(4, 4), 100);\n    assert_eq!(score(5, 4), 100);\n    assert_eq!(score(1, 3), 33);\n    assert_eq!(score(999, 1000), 99);\n    assert_eq!(score(1000, 1000), 100);\n    assert_eq!(score(1, -2), 0);\n}",
        },
        evidenceKind: "fix",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Przypadek (0,0) powinien zatrzymać się przed regułą correct >= attempted.",
          "Obsłuż attempted <= 0 przed porównaniem pełnego wyniku.",
        ],
      },
      {
        id: "assessment-tests",
        kind: "run",
        title: "Uruchom wiele przypadków",
        prompt:
          "Uruchom cztery przypadki innej reguły: remaining_points oblicza pozostały budżet przez odejmowanie. Gdy total <= 0 lub used >= total, oddaje 0; gdy used <= 0, oddaje cały total; w pozostałych przypadkach oddaje total - used. Oba wejścia mieszczą się w zakresie -1000..=1000. Porównaj wszystkie wyniki. W zadaniu score trzeba samodzielnie obliczać procent, a nie pozostały budżet.",
        code: "fn remaining_points(total: i32, used: i32) -> i32 {\n    if total <= 0 || used >= total {\n        0\n    } else if used <= 0 {\n        total\n    } else {\n        total - used\n    }\n}\n\nfn main() {\n    println!(\"{}\", remaining_points(0, 0));\n    println!(\"{}\", remaining_points(5, 5));\n    println!(\"{}\", remaining_points(100, 0));\n    println!(\"{}\", remaining_points(80, 30));\n}",
        solution: "fn remaining_points(total: i32, used: i32) -> i32 {\n    if total <= 0 || used >= total {\n        0\n    } else if used <= 0 {\n        total\n    } else {\n        total - used\n    }\n}\n\nfn main() {\n    println!(\"{}\", remaining_points(0, 0));\n    println!(\"{}\", remaining_points(5, 5));\n    println!(\"{}\", remaining_points(100, 0));\n    println!(\"{}\", remaining_points(80, 30));\n}",
        evaluator: { kind: "exact-output", expected: "0\n0\n100\n50\n" },
        evidenceKind: "project",
        expectedStatus: "success",
      },
      {
        id: "assessment-transfer-tests",
        kind: "blank",
        title: "Przenieś regułę na nową funkcję",
        prompt:
          "Napisz od zera funkcję `clamp_score(value)`. Dla wejść w zakresie -1000..=1000 zwróć 0, gdy value < 0, zwróć 100, gdy value > 100, a w pozostałych przypadkach zwróć value. Nie podajemy sygnatury; rozwiązanie zostanie sprawdzone dla -1, 0, 50, 100 i 101.",
        solution:
          "fn clamp_score(value: i32) -> i32 {\n    if value < 0 {\n        0\n    } else if value > 100 {\n        100\n    } else {\n        value\n    }\n}",
        evaluator: {
          kind: "tests",
          tests:
            "#[test]\nfn clamp_boundaries() {\n    assert_eq!(clamp_score(-1), 0);\n    assert_eq!(clamp_score(0), 0);\n    assert_eq!(clamp_score(50), 50);\n    assert_eq!(clamp_score(100), 100);\n    assert_eq!(clamp_score(101), 100);\n}",
        },
        evidenceKind: "transfer",
        evidenceGate: true,
      },
      {
        id: "assessment-reason",
        kind: "explain",
        title: "Uzasadnij kolejność",
        prompt:
          "Dla wejść w zakresie -1000..=1000 wyjaśnij, dlaczego test (0,0) jest ważniejszy niż kolejny przykład typu (2,4) przy sprawdzaniu tej funkcji.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wskazuje, że attempted = 0 jest granicą i nie wolno dzielić przez zero.",
            "Rozpoznaje, że correct >= attempted byłoby prawdziwe dla (0,0), więc kolejność reguł ma znaczenie.",
            "Łączy test graniczny z obserwowalnym wynikiem 0.",
          ],
        },
        evidenceKind: "recall",
      },
      {
        id: "assessment-transfer",
        kind: "apply",
        title: "Przenieś schemat testów",
        prompt:
          "Wybierz zestaw testów, który najlepiej sprawdzi nową funkcję `clamp_score`, ograniczającą i32 do przedziału 0..=100.",
        choices: [
          {
            id: "boundaries",
            label: "-1, 0, 1, 99, 100, 101",
          },
          { id: "one", label: "Tylko 50" },
          { id: "positive", label: "1, 2, 3" },
        ],
        evaluator: {
          kind: "choice",
          correct: "boundaries",
          explanations: {
            boundaries:
              "Zestaw obejmuje oba końce, wartości wewnętrzne i oba kierunki wyjścia poza granicę.",
            one: "Jeden przypadek nie pokazuje zachowania na granicach.",
            positive: "Brakuje zera, wartości ujemnych i górnego końca.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "foundations-local-parcel-program",
        kind: "apply",
        title: "Mały lokalny program: opłata za paczkę",
        prompt:
          "Twój program od zera: utwórz świeży lokalny pakiet Cargo i napisz mały program obliczający opłatę za paczkę na podstawie całkowitej wagi. Dla wag od 1 do 5 opłata wynosi 8, a dla wag od 6 do 20 wynosi 12. Każda inna waga, w tym 0 i 21, ma zostać odrzucona w reprezentacji, którą wybierzesz. Pokaż działanie dla wag 0, 1, 5, 6, 20 i 21. Sam wybierz nazwę funkcji oraz typ zwracany; zachowaj `main` na tyle krótki, aby dało się go wyjaśnić. Nie potrzebujesz `stdin`, plików, `Result`, `struct` ani pętli: jawne wywołania, całkowity znacznik odrzucenia albo komunikat warunkowy są wystarczające. Nie podajemy sygnatury — opisz i uzasadnij własny kontrakt obserwowalnego wyniku.\n\nNeutralne wsparcie: `cargo new` tworzy pakiet, `Cargo.toml` i `src/main.rs` pokazują jego pliki, `cargo check` sprawdza kompilację, `cargo run` uruchamia program, a `cargo test` uruchamia testy. Niezależny przykład samej składni testu to `#[test] fn adds_two_numbers() { assert_eq!(2 + 2, 4); }`.\n\nNapisz co najmniej dwa własne sensowne testy: jeden musi sprawdzić granicę 5/6, a drugi przypadek nieprawidłowej wagi. Zmień na chwilę jedną oczekiwaną wartość, zobacz prawdziwe niepowodzenie testu, przywróć poprawną wartość i zapisz krótkie wyjaśnienie błędu oraz poprawki.\n\nZapisz dostępny output Cargo i własną samoocenę; jeśli lokalny Rust nie jest dostępny, oznacz stan jako jeszcze nieobserwowany i kontynuuj naukę w przeglądarce. Ta karta zapisuje samoocenę i gotowość do przeglądu, ale nie potwierdza automatycznie lokalnego uruchomienia ani przeglądu przez osobę.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Dostępny jest lokalny output cargo check, cargo run lub cargo test; brak narzędzi pozostaje oznaczony jako jeszcze nieobserwowany.",
            "Zadeklarowane zachowanie poprawnie rozróżnia wagi 1–5 z opłatą 8, wagi 6–20 z opłatą 12 oraz odrzucenie pozostałych wag.",
            "Pokazano wagi 0, 1, 5, 6, 20 i 21, a main pozostał krótki i wyjaśnialny.",
            "Są co najmniej dwa własne sensowne testy, w tym granica 5/6 i przypadek nieprawidłowej wagi.",
            "Jedna oczekiwana wartość została celowo zmieniona, zaobserwowano niepowodzenie testu, przywrócono ją i wyjaśniono błąd oraz poprawkę.",
            "Wyjaśniono wybór reprezentacji odrzucenia oraz zapisano samoocenę lub gotowość do przeglądu bez twierdzenia, że lokalne wykonanie albo przegląd przez osobę zostały automatycznie potwierdzone.",
          ],
        },
        rubric: [
          "Dostępny jest lokalny output cargo check, cargo run lub cargo test; brak narzędzi pozostaje oznaczony jako jeszcze nieobserwowany.",
          "Zadeklarowane zachowanie poprawnie rozróżnia wagi 1–5 z opłatą 8, wagi 6–20 z opłatą 12 oraz odrzucenie pozostałych wag.",
          "Pokazano wagi 0, 1, 5, 6, 20 i 21, a main pozostał krótki i wyjaśnialny.",
          "Są co najmniej dwa własne sensowne testy, w tym granica 5/6 i przypadek nieprawidłowej wagi.",
          "Jedna oczekiwana wartość została celowo zmieniona, zaobserwowano niepowodzenie testu, przywrócono ją i wyjaśniono błąd oraz poprawkę.",
          "Wyjaśniono wybór reprezentacji odrzucenia oraz zapisano samoocenę lub gotowość do przeglądu bez twierdzenia, że lokalne wykonanie albo przegląd przez osobę zostały automatycznie potwierdzone.",
        ],
        evidenceKind: "self-rating",
      },
    ],
    misconceptions: [
      "Jeśli kod się kompiluje, kolejność warunków jest poprawna.",
      "Jeden przykład procentu dowodzi całej reguły.",
      "Przypadek (0,0) można pominąć, bo jest oczywisty.",
    ],
    transferTask:
      "Zaprojektuj niewielką funkcję z regułą graniczną, napisz test dla zera, obu końców i przypadku zwykłego, a następnie wyjaśnij kolejność warunków.",
    evidenceGate:
      "Implementacja score napisana od zera przechodzi realne asercje Rust, a naprawa startera przechodzi niezależny zestaw adversarialnych granic.",
    sourceIds: [
      "foundations-functions",
      "foundations-control-flow",
      "foundations-tests",
    ],
  },
];

export const foundationsModule: CourseModule = {
  id: "rust-foundations",
  title: "Fundamenty Rust",
  whyItMatters:
    "Zanim pojawią się String, referencje i własność, potrzebujesz pewności co do uruchamiania programu, typów, funkcji i przepływu sterowania.",
  capabilities: [
    "Uruchamiasz pierwszy program i rozumiesz ścieżkę Cargo.",
    "Czytasz wiązania, typy skalarne i komunikat E0384.",
    "Projektujesz funkcje i rozumiesz semantykę średnika w wyrażeniu zwracanym.",
    "Budujesz if oraz pętlę zakresu i testujesz reguły na granicach.",
  ],
  prerequisites: [],
  lessonIds: foundationsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Samodzielnie uruchomić i zmodyfikować program z main i println!.",
    "Naprawić E0384 przez rozpoznanie mut.",
    "Napisać funkcję i32 z poprawnym wyrażeniem zwracanym.",
    "Przewidzieć zakres i warunek oraz sprawdzić przypadki graniczne testami.",
  ],
  projectConnection:
    "Te reguły są podłożem dla późniejszego modułu własności: najpierw wiesz, jak uruchomić kod i odczytać typowy błąd, dopiero potem śledzisz właścicieli String.",
  assessmentId: "foundations-assessment/assessment-blank",
  gateCriteria: [
    {
      id: "program-entry-gate",
      label: "Program uruchamia się i daje przewidywalny wynik",
      taskRefs: [
        { lessonId: "first-program", stepId: "entry-modify" },
        { lessonId: "functions-expressions", stepId: "function-modify" },
      ],
    },
    {
      id: "bindings-gate",
      label: "Świadome użycie mut i zmiana wartości",
      taskRefs: [
        { lessonId: "bindings-types", stepId: "mut-error" },
        { lessonId: "control-flow", stepId: "flow-transfer" },
      ],
    },
    {
      id: "functions-gate",
      label: "Średnik nie zasłania wartości funkcji",
      taskRefs: [
        { lessonId: "functions-expressions", stepId: "function-error" },
        { lessonId: "foundations-assessment", stepId: "assessment-blank" },
      ],
    },
    {
      id: "control-flow-gate",
      label: "Samodzielnie obliczasz wynik dla zakresu z warunkiem, także na jego granicach",
      requiredIndependentCodingTasks: 1,
      taskRefs: [
        { lessonId: "control-flow", stepId: "flow-range-transfer" },
        { lessonId: "control-flow", stepId: "flow-range-cost" },
      ],
    },
    {
      id: "assessment-gate",
      label: "Nowa reguła przechodzi testy wieloprzypadkowe i graniczne",
      taskRefs: [
        { lessonId: "foundations-assessment", stepId: "assessment-blank" },
        {
          lessonId: "foundations-assessment",
          stepId: "assessment-adversarial",
        },
        {
          lessonId: "foundations-assessment",
          stepId: "assessment-transfer-tests",
        },
      ],
    },
  ],
};

export const foundationsReviewExercises: Record<string, LessonStep> = {
  "program-entry": {
    id: "review-program-entry",
    kind: "recall",
    title: "Przypomnij punkt wejścia",
    prompt: "Wpisz nazwę funkcji, od której zaczyna się binarny program Rust.",
    evaluator: {
      kind: "answer",
      accepted: ["main", "fn main()"],
      feedback: "Program binarny zaczyna wykonywanie od funkcji main.",
    },
    evidenceKind: "recall",
  },
  "cargo-workflow": {
    id: "review-cargo-workflow",
    kind: "recall",
    title: "Przypomnij role Cargo",
    prompt: "Która komenda tworzy nowy pakiet Cargo?",
    choices: [
      { id: "new", label: "cargo new" },
      { id: "build", label: "cargo build" },
      { id: "run", label: "cargo run" },
    ],
    evaluator: {
      kind: "choice",
      correct: "new",
      explanations: {
        new: "cargo new tworzy pakiet z manifestem i plikiem programu.",
        build: "cargo build kompiluje już istniejący pakiet.",
        run: "cargo run kompiluje i uruchamia już istniejący pakiet.",
      },
    },
    evidenceKind: "recall",
  },
  "bindings-mutability": {
    id: "review-bindings-mutability",
    kind: "recall",
    title: "Przypomnij mut",
    prompt:
      "Co trzeba dodać do `let total = 1`, aby później przypisać `total = 2`?",
    choices: [
      { id: "mut", label: "mut w deklaracji" },
      { id: "type", label: "Adnotację i32" },
      { id: "print", label: "println!" },
    ],
    evaluator: {
      kind: "choice",
      correct: "mut",
      explanations: {
        mut: "mut wyraża zgodę na ponowne przypisanie do wiązania.",
        type: "Typ nie zmienia domyślnej niemutowalności.",
        print: "println! tylko odczytuje i wypisuje wartość.",
      },
    },
    evidenceKind: "recall",
  },
  "scalar-types": {
    id: "review-scalar-types",
    kind: "recall",
    title: "Przypomnij typ skalarny",
    prompt: "Która deklaracja wiąże wartość logiczną?",
    choices: [
      { id: "bool", label: "`let ready: bool = true;`" },
      { id: "char", label: "`let ready: char = 'R';`" },
      { id: "float", label: "`let ready: f64 = 1.0;`" },
    ],
    evaluator: {
      kind: "choice",
      correct: "bool",
      explanations: {
        bool: "bool przechowuje true albo false.",
        char: "char przechowuje pojedynczą wartość skalarną Unicode.",
        float: "f64 przechowuje liczbę zmiennoprzecinkową.",
      },
    },
    evidenceKind: "recall",
  },
  "functions-expressions": {
    id: "review-functions-expressions",
    kind: "recall",
    title: "Przypomnij średnik",
    prompt: "Wpisz wartość bloku, gdy ostatnie `x + 1` zakończysz średnikiem.",
    evaluator: {
      kind: "answer",
      accepted: ["()", "unit", "pusta wartość"],
      feedback:
        "Średnik zamienia ostatnie wyrażenie w instrukcję o wartości jednostkowej ().",
    },
    evidenceKind: "recall",
  },
  "control-flow": {
    id: "review-control-flow",
    kind: "recall",
    title: "Przypomnij zakres",
    prompt: "Wpisz liczby wypisane kolejno przez `for n in 2..5`.",
    evaluator: {
      kind: "answer",
      accepted: ["2, 3, 4", "2 3 4"],
      feedback: "Zakres .. wyklucza końcową granicę 5.",
    },
    evidenceKind: "recall",
  },
  "rules-based-testing": {
    id: "review-rules-based-testing",
    kind: "recall",
    title: "Przypomnij test granicy",
    prompt:
      "Który przypadek najlepiej sprawdza funkcję ograniczającą wynik do 0..=100?",
    choices: [
      { id: "boundaries", label: "-1, 0, 50, 100, 101" },
      { id: "middle", label: "Tylko 50" },
      { id: "positive", label: "1, 2, 3" },
    ],
    evaluator: {
      kind: "choice",
      correct: "boundaries",
      explanations: {
        boundaries:
          "Zestaw obejmuje oba końce, wnętrze i oba wyjścia poza granicę.",
        middle: "Jeden środkowy przypadek nie sprawdza granic.",
        positive: "Brakuje zera, wartości ujemnej i górnego końca.",
      },
    },
    evidenceKind: "recall",
  },
};
