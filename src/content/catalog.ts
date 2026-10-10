import { ownedUppercaseContract } from "./baseline-primitives-contracts";
import {
  appendSuffixContract,
  replaceTextContract,
  surroundContract,
  removeTrailingMarkContract,
} from "./ownership-evidence-contracts";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  ProjectContract,
  Source,
  Trace,
} from "@/domain/types";

export const sources: Source[] = [
  {
    id: "rust-book-ownership",
    title: "Rust Book: Czym jest własność?",
    url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html",
    classification: "stable",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-book-borrowing",
    title: "Rust Book: Referencje i pożyczanie",
    url: "https://doc.rust-lang.org/stable/book/ch04-02-references-and-borrowing.html",
    classification: "stable",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-book-functions",
    title: "Rust Book: Funkcje",
    url: "https://doc.rust-lang.org/book/ch03-03-how-functions-work.html",
    classification: "stable",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-copy-trait",
    title: "Biblioteka Rust: Copy",
    url: "https://doc.rust-lang.org/std/marker/trait.Copy.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-book-scope",
    title: "Rust Book: Własność i zakres",
    url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html#the-stack-and-the-heap",
    classification: "stable",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-playground",
    title: "Rust Playground: usługa uruchamiania stabilnego kompilatora",
    url: "https://play.rust-lang.org/",
    classification: "dynamic",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "rust-edition-guide",
    title: "Przewodnik po edycjach Rust",
    url: "https://doc.rust-lang.org/edition-guide/rust-2024/index.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie stabilnego toolchaina lub treści ćwiczeń.",
  },
  {
    id: "baseline-str-uppercase",
    title: "Rust std: str::to_uppercase",
    url: "https://doc.rust-lang.org/std/primitive.str.html#method.to_uppercase",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu wielkich liter Unicode lub wspieranego toolchaina.",
  },
];

export const competencies: Competency[] = [
  {
    id: "predict-memory",
    title:
      "Przewiduj, które wiązanie jest właścicielem i kiedy następuje usunięcie.",
  },
  {
    id: "classify-copy-move",
    title: "Klasyfikuj przypisanie lub argument jako move albo niejawne Copy.",
  },
  {
    id: "design-function-boundary",
    title: "Projektuj parametry i wyniki funkcji wokół własności.",
  },
  {
    id: "borrow-without-taking",
    title: "Pożyczaj wartość do odczytu bez przejmowania własności.",
  },
  {
    id: "repair-compiler-feedback",
    title: "Napraw błąd własności i wyjaśnij, dlaczego naprawa jest poprawna.",
  },
  {
    id: "transfer-to-project",
    title: "Przenieś rozumowanie o własności do małego programu z wynikiem.",
  },
  {
    id: "avoid-unnecessary-clone",
    title:
      "Rozpoznaj, kiedy clone ukrywa problem granicy, i wybierz pożyczkę albo move.",
  },
];

export const concepts: Concept[] = [
  {
    id: "stack-heap",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Rola stosu i sterty",
    prerequisites: [],
    competencyIds: ["predict-memory"],
    reviewPrompt:
      "Co wiązanie String przechowuje lokalnie i co należy posprzątać, gdy właściciel się kończy?",
    reviewAnswer:
      "Wiązanie przechowuje metadane String, a właściciel odpowiada za bufor na stercie. Gdy właściciel opuszcza zakres, Rust wywołuje drop i zwalnia bufor.",
    distinguish:
      "String posiada rosnący bufor na stercie; &str jest tylko widokiem pożyczonych znaków i sam nie zwalnia danych.",
  },
  {
    id: "scope-drop",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Zakres i drop",
    prerequisites: ["stack-heap"],
    competencyIds: ["predict-memory"],
    reviewPrompt:
      "Kiedy zostaje usunięta wartość String, jeśli własność nie została przeniesiona?",
    reviewAnswer:
      "Na końcu zakresu właściciela. Dla String utworzonego w wewnętrznym bloku będzie to zamykająca klamra tego bloku, chyba że własność wcześniej przejdzie gdzie indziej.",
    distinguish:
      "Zakres leksykalny decyduje, kiedy kończy się odpowiedzialność właściciela; move zmienia właściciela, ale nie oznacza natychmiastowego drop.",
  },
  {
    id: "move-semantics",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Semantyka move",
    prerequisites: ["stack-heap", "scope-drop"],
    competencyIds: ["classify-copy-move", "repair-compiler-feedback"],
    reviewPrompt:
      "Po `let second = first` dla String, którego wiązania można użyć?",
    reviewAnswer:
      "Można użyć `second`. Przypisanie przenosi własność String z `first`, więc późniejsze użycie `first` jako właściciela wywołuje E0382.",
    distinguish:
      "Move nie kopiuje bufora. Jeśli oba wiązania mają działać niezależnie, potrzebujesz jawnego `clone()` albo innego projektu API.",
  },
  {
    id: "copy-semantics",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Semantyka Copy",
    prerequisites: ["move-semantics"],
    competencyIds: ["classify-copy-move"],
    reviewPrompt:
      "Dlaczego po przypisaniu do drugiego wiązania można nadal użyć i32?",
    reviewAnswer:
      "`i32` implementuje `Copy`, więc `let other = number` kopiuje wartość i pozostawia `number` użyteczne.",
    distinguish:
      "`Copy` to nie głębokie klonowanie dowolnych danych, a `Clone` jest jawną metodą. Typ zawierający własność String nie staje się Copy tylko dlatego, że można go sklonować.",
  },
  {
    id: "function-ownership",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Własność na granicy funkcji",
    prerequisites: ["move-semantics", "copy-semantics"],
    competencyIds: ["design-function-boundary", "repair-compiler-feedback"],
    reviewPrompt:
      "Co dzieje się z String przekazanym do `fn consume(text: String)`?",
    reviewAnswer:
      "Wywołanie przenosi własność do parametru `text`. Wywołujący nie może użyć swojego wiązania po wywołaniu, chyba że funkcja zwróci wartość albo przyjmie referencję.",
    distinguish:
      "Parametr `String` konsumuje wartość; `&str` lub `&String` pożycza ją do odczytu i zostawia własność po stronie wywołującego.",
  },
  {
    id: "shared-borrow",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Pożyczka współdzielona",
    prerequisites: ["function-ownership"],
    competencyIds: ["borrow-without-taking", "repair-compiler-feedback"],
    reviewPrompt:
      "Jak funkcja może odczytać String i pozwolić wywołującemu użyć go ponownie?",
    reviewAnswer:
      "Przyjmij referencję, najczęściej `&str`: `fn show(text: &str)`. Wywołanie `show(&message)` daje odczyt bez przenoszenia własności.",
    distinguish:
      "Pożyczka współdzielona nie tworzy kopii i nie przejmuje właściciela. Referencja może być używana tylko w granicach dozwolonego czasu życia.",
  },
  {
    id: "mutable-borrow",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Pożyczka mutowalna",
    prerequisites: ["shared-borrow"],
    competencyIds: ["borrow-without-taking", "repair-compiler-feedback"],
    reviewPrompt: "Co musi być prawdą, gdy aktywna jest referencja mutowalna?",
    reviewAnswer:
      "`&mut T` wymaga wyłącznego dostępu: w czasie aktywnej pożyczki nie może istnieć równoległa pożyczka współdzielona ani drugi dostęp do modyfikowanej wartości.",
    distinguish:
      "`&T` pozwala wielu czytelnikom, a `&mut T` pozwala jednemu pożyczającemu zmieniać dane. `mut` na wiązaniu nie daje wyłączności wszystkim referencjom.",
  },
  {
    id: "ownership-repair",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    title: "Wybór naprawy własności",
    prerequisites: ["function-ownership", "shared-borrow", "mutable-borrow"],
    competencyIds: ["repair-compiler-feedback", "avoid-unnecessary-clone"],
    reviewPrompt: "O co zapytać przed dodaniem `.clone()` do błędu własności?",
    reviewAnswer:
      "Najpierw zapytaj, czy druga funkcja naprawdę musi posiadać dane. Jeśli tylko czyta, pożycz `&str` lub `&T`; `clone()` ma sens dopiero, gdy potrzebujesz niezależnej własności.",
    distinguish:
      "`clone()` usuwa konkretny konflikt przez koszt drugiego bufora. Nie naprawia decyzji o granicy funkcji ani nie zastępuje rozumienia, kto powinien być właścicielem.",
  },
];

export const traces: Record<string, Trace> = {
  "trace-string-move": {
    title: "Przeniesienie właściciela String",
    code: 'let first = String::from("rust");\nlet second = first;\nprintln!("{second}");',
    frames: [
      {
        line: 1,
        explanation:
          "first posiada uchwyt String, którego bajty leżą na stercie.",
        stack: [
          {
            name: "first",
            value: 'String("rust")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "rust",
            owner: "first",
          },
        ],
      },
      {
        line: 2,
        explanation:
          "Własność String przechodzi do second, a first zostaje unieważnione.",
        stack: [
          {
            name: "first",
            value: "invalid",
            state: "moved",
          },
          {
            name: "second",
            value: 'String("rust")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "rust",
            owner: "second",
          },
        ],
      },
      {
        line: 3,
        explanation:
          "second jest ostatnim właścicielem i na końcu zakresu usunie bufor na stercie.",
        stack: [
          {
            name: "second",
            value: 'String("rust")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "rust",
            owner: "second",
            dropped: false,
          },
        ],
      },
    ],
  },
  "trace-copy-int": {
    title: "Copy zachowuje oba wiązania liczbowe",
    code: 'let x = 5;\nlet y = x;\nprintln!("{x} {y}");',
    frames: [
      {
        line: 1,
        explanation: "Liczba całkowita jest małą wartością na stosie.",
        stack: [
          {
            name: "x",
            value: "5",
            state: "owner",
          },
        ],
        heap: [],
      },
      {
        line: 2,
        explanation: "Przypisanie kopiuje bity, bo i32 implementuje Copy.",
        stack: [
          {
            name: "x",
            value: "5",
            state: "copied",
          },
          {
            name: "y",
            value: "5",
            state: "copied",
          },
        ],
        heap: [],
      },
      {
        line: 3,
        explanation: "Oba wiązania można odczytać.",
        stack: [
          {
            name: "x",
            value: "5",
            state: "owner",
          },
          {
            name: "y",
            value: "5",
            state: "owner",
          },
        ],
        heap: [],
      },
    ],
  },
  "trace-borrow": {
    title: "Pożyczka współdzielona zachowuje właściciela",
    code: 'let message = String::from("ready");\nlet view = &message;\nprintln!("{view}");',
    frames: [
      {
        line: 1,
        explanation: "message posiada alokację na stercie.",
        stack: [
          {
            name: "message",
            value: 'String("ready")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h2",
            value: "ready",
            owner: "message",
          },
        ],
      },
      {
        line: 2,
        explanation:
          "view tylko współdzieli dostęp; message pozostaje właścicielem.",
        stack: [
          {
            name: "message",
            value: 'String("ready")',
            state: "owner",
          },
          {
            name: "view",
            value: "&message",
            state: "shared",
          },
        ],
        heap: [
          {
            id: "h2",
            value: "ready",
            owner: "message",
          },
        ],
      },
      {
        line: 3,
        explanation: "Pożyczka się kończy, a message nadal można użyć.",
        stack: [
          {
            name: "message",
            value: 'String("ready")',
            state: "owner",
          },
          {
            name: "view",
            value: "ended",
            state: "dropped",
          },
        ],
        heap: [
          {
            id: "h2",
            value: "ready",
            owner: "message",
          },
        ],
      },
    ],
  },
  "trace-mutable-borrow": {
    title: "Pożyczka mutowalna daje czasowy wyłączny dostęp",
    code: 'let mut message = String::from("hi");\nlet edit = &mut message;\nedit.push_str("!");',
    frames: [
      {
        line: 1,
        explanation: "message posiada mutowalny String.",
        stack: [
          {
            name: "message",
            value: 'String("hi")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h3",
            value: "hi",
            owner: "message",
          },
        ],
      },
      {
        line: 2,
        explanation:
          "edit jest jedyną aktywną ścieżką dostępu podczas pożyczki mutowalnej.",
        stack: [
          {
            name: "message",
            value: "temporarily inaccessible",
            state: "mutable",
          },
          {
            name: "edit",
            value: "&mut message",
            state: "mutable",
          },
        ],
        heap: [
          {
            id: "h3",
            value: "hi",
            owner: "message",
          },
        ],
      },
      {
        line: 3,
        explanation:
          "Edycja zmienia bufor właściciela, po czym pożyczka się kończy.",
        stack: [
          {
            name: "message",
            value: 'String("hi!")',
            state: "owner",
          },
          {
            name: "edit",
            value: "ended",
            state: "dropped",
          },
        ],
        heap: [
          {
            id: "h3",
            value: "hi!",
            owner: "message",
          },
        ],
      },
    ],
  },
  "trace-explicit-clone": {
    title: "Jawne clone tworzy drugi bufor",
    code: 'let first = String::from("rust");\nlet second = first.clone();\nprintln!("{first} {second}");',
    frames: [
      {
        line: 1,
        explanation: "first posiada pierwotną alokację na stercie.",
        stack: [
          {
            name: "first",
            value: 'String("rust")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h4",
            value: "rust",
            owner: "first",
          },
        ],
      },
      {
        line: 2,
        explanation:
          "clone jawnie alokuje i kopiuje drugi bufor; first zachowuje własność.",
        stack: [
          {
            name: "first",
            value: 'String("rust")',
            state: "owner",
          },
          {
            name: "second",
            value: 'String("rust")',
            state: "copied",
          },
        ],
        heap: [
          {
            id: "h4",
            value: "rust",
            owner: "first",
          },
          {
            id: "h5",
            value: "rust",
            owner: "second",
          },
        ],
      },
      {
        line: 3,
        explanation:
          "Obaj niezależni właściciele są poprawni i każdy zostanie usunięty.",
        stack: [
          {
            name: "first",
            value: 'String("rust")',
            state: "owner",
          },
          {
            name: "second",
            value: 'String("rust")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h4",
            value: "rust",
            owner: "first",
            dropped: false,
          },
          {
            id: "h5",
            value: "rust",
            owner: "second",
            dropped: false,
          },
        ],
      },
    ],
  },
  "trace-scope-drop": {
    title: "Zakres kończy odpowiedzialność",
    code: 'let outer = String::from("herbata");\n{\n    let inner = String::from("kawa");\n    println!("{inner}");\n}\nprintln!("{outer}");',
    frames: [
      {
        line: 1,
        explanation:
          "outer ma własny bufor. Jego zakres trwa do końca funkcji.",
        stack: [
          {
            name: "outer",
            value: 'String("herbata")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "herbata",
            owner: "outer",
          },
        ],
      },
      {
        line: 3,
        explanation:
          "Wewnętrzny blok tworzy drugiego właściciela, inner, z niezależnym buforem.",
        stack: [
          {
            name: "outer",
            value: 'String("herbata")',
            state: "owner",
          },
          {
            name: "inner",
            value: 'String("kawa")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "herbata",
            owner: "outer",
          },
          {
            id: "h2",
            value: "kawa",
            owner: "inner",
          },
        ],
      },
      {
        line: 5,
        explanation:
          "Klamra kończy zakres inner. Drop zwalnia jego bufor. outer wciąż pozostaje właścicielem herbaty.",
        stack: [
          {
            name: "outer",
            value: 'String("herbata")',
            state: "owner",
          },
          {
            name: "inner",
            value: "zakres zakończony",
            state: "dropped",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "herbata",
            owner: "outer",
          },
          {
            id: "h2",
            value: "kawa",
            owner: "inner",
            dropped: true,
          },
        ],
      },
      {
        line: 6,
        explanation:
          "Możemy wypisać outer. Jego bufor zostanie zwolniony dopiero na końcu funkcji.",
        stack: [
          {
            name: "outer",
            value: 'String("herbata")',
            state: "owner",
          },
        ],
        heap: [
          {
            id: "h1",
            value: "herbata",
            owner: "outer",
          },
          {
            id: "h2",
            value: "kawa",
            owner: "inner",
            dropped: true,
          },
        ],
      },
    ],
  },
};

export const lessons: Lesson[] = [
  {
    id: "memory-intro",
    moduleId: "ownership",
    conceptIds: ["stack-heap", "scope-drop"],
    competencyIds: ["predict-memory"],
    prerequisites: [],
    title: "Pamięć ma kształt",
    subtitle: "Zbuduj użyteczny obraz wartości, wiązań i sprzątania.",
    minutes: 12,
    outcomes: [
      "Opisz wiązanie jako nazwę wartości.",
      "Przewiduj, kiedy właściciel String zostanie usunięty.",
      "Czytaj prosty ślad stosu i sterty.",
    ],
    steps: [
      {
        id: "memory-predict",
        evidence: { version: 2, conceptIds: ["stack-heap"] },
        kind: "predict",
        title: "Przewidź liczbę",
        prompt:
          "Co zostanie wypisane? Wiązanie to nazwa lokalnej wartości. Dla String rozróżniamy lokalną wartość opisującą bufor i należące do niej dane w buforze na stercie. Na końcu zakresu aktualnego właściciela drop sprząta wartość oraz jej własny bufor. Move zmienia właściciela: poprzednia nazwa przestaje udostępniać przeniesioną wartość, a sprzątanie należy do nowego właściciela. Diagram stosu i sterty jest modelem nauki własności, nie gwarancją fizycznego rozmieszczenia wartości przez optymalizujący kompilator. Wydruk liczby nie dowodzi jej fizycznego położenia w pamięci.",
        code: 'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        solution:
          'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        choices: [
          {
            id: "three",
            label: "3",
          },
          {
            id: "two",
            label: "2",
          },
          {
            id: "none",
            label: "Nic",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "three",
          explanations: {
            three: "2 + 1 daje 3, więc println wypisuje wartość next.",
            two: "next przechowuje wynik wyrażenia count + 1, czyli 3.",
            none: "Kod ma poprawne println i wypisuje obliczony wynik, a nie nic.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Najpierw odczytaj wartości literalne.",
          "Oblicz wyrażenie po prawej stronie.",
        ],
      },
      {
        id: "memory-run",
        evidence: { version: 2, conceptIds: ["stack-heap"] },
        kind: "run",
        title: "Uruchom przykład",
        prompt:
          "Najpierw przewidź wynik, potem uruchom przykład i porównaj obserwację.",
        code: 'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        solution:
          'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        evaluator: { kind: "exact-output", expected: "3\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "memory-trace",
        evidence: { version: 2, conceptIds: [] },
        kind: "trace",
        title: "Śledź własność String",
        prompt:
          "Przejdź przez ślad. W której linii first zostaje unieważnione przez move?",
        traceId: "trace-string-move",
        choices: [
          {
            id: "line-1",
            label: "Linia 1",
          },
          {
            id: "line-2",
            label: "Linia 2",
          },
          {
            id: "line-3",
            label: "Linia 3",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "line-2",
          explanations: {
            "line-1":
              "Linia 1 dopiero tworzy first; własność nie została jeszcze przeniesiona.",
            "line-2":
              "Poprawnie: przypisanie first do second przenosi własność String.",
            "line-3":
              "Linia 3 tylko odczytuje second; first było nieważne już wcześniej.",
          },
        },
        evidenceKind: "trace",
      },
      {
        id: "memory-explain",
        evidence: { version: 2, conceptIds: ["scope-drop"] },
        kind: "explain",
        title: "Nazwij sprzątanie",
        prompt:
          "Po przejściu śladu: jakie zdarzenie zwalnia bufor String, gdy właściciel opuszcza zakres?",
        evaluator: {
          kind: "answer",
          accepted: ["drop", "drop at scope end"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "recall",
        rubric: [
          "Nazywa drop.",
          "Łączy drop z końcem zakresu aktualnego właściciela.",
        ],
      },
      {
        id: "memory-modify",
        evidence: { version: 2, conceptIds: [] },
        kind: "modify",
        title: "Zmień wynik",
        prompt:
          "Zmień kod tak, aby wypisał warm zamiast cool, a następnie uruchom go.",
        code: 'fn main() {\n    let label = String::from("cool");\n    println!("{label}");\n}',
        solution:
          'fn main() {\n    let label = String::from("warm");\n    println!("{label}");\n}',
        evaluator: { kind: "exact-output", expected: "warm\n" },
        evidenceKind: "transfer",
        expectedStatus: "success",
        hints: [
          "Znajdź napis w String::from.",
          "Zmień tylko napis, zachowując println.",
        ],
        evidenceGate: true,
      },
      {
        id: "memory-transfer",
        evidence: { version: 2, conceptIds: ["scope-drop"] },
        kind: "trace",
        title: "Dwa zakresy, dwa momenty drop",
        prompt:
          "Przejdź do klamry zamykającej wewnętrzny blok (linia 5). Wpisz nazwę zmiennej, której bufor NADAL istnieje po tej linii.",
        solution: "outer — jego zakres jeszcze się nie zakończył.",
        evaluator: {
          kind: "answer",
          accepted: ["outer"],
          feedback:
            "Porównaj zakresy obu nazw. Klamra w linii 5 zamyka tylko blok wewnętrzny.",
        },
        evidenceKind: "transfer",
        traceId: "trace-scope-drop",
        evidenceGate: true,
      },
      {
        id: "memory-owner-out-of-block",
        kind: "predict",
        title: "Właściciel wychodzi z bloku",
        prompt:
          "Wewnętrzny String local zostaje przeniesiony jako wynik bloku do saved. Drugi String temporary pozostaje w środku i jest sprzątany przy zamykającej klamrze. Bufor przeniesionego String nadal należy do saved; nie jest sprzątany tylko dlatego, że nazwa local wyszła z zakresu. Jaki tekst pojawi się po zamknięciu bloku? Wynik potwierdza dostępność właściciela, nie fizyczne położenie bufora ani moment zwolnienia wszystkich bajtów przez system.",
        code: 'fn main() {\n    let saved = {\n        let local = String::from("zostaje");\n        let temporary = String::from("chwila");\n        println!("{temporary}");\n        local\n    };\n    println!("{saved}");\n}',
        solution:
          'fn main() {\n    let saved = {\n        let local = String::from("zostaje");\n        let temporary = String::from("chwila");\n        println!("{temporary}");\n        local\n    };\n    println!("{saved}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["chwila\nzostaje"],
          feedback:
            "temporary jest odczytane wewnątrz, a local przenosi własność do saved, które pozostaje dostępne po bloku.",
        },
        evidence: {
          version: 2,
          conceptIds: ["scope-drop"],
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
    ],
    misconceptions: [
      "Wiązanie na stosie jest samą alokacją na stercie.",
      "Odczytanie wartości natychmiast ją usuwa.",
    ],
    transferTask:
      "Przewidź moment usunięcia String utworzonego w zagnieżdżonym bloku.",
    evidenceGate:
      "Ukończ jeden ślad i wyjaśnij sprzątanie wynikające z zakresu.",
    sessionStops: [
      {
        afterStepId: "memory-transfer",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Sprawdź właściciela przeniesionego z wewnętrznego bloku. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: ["rust-book-scope", "rust-book-ownership"],
  },
  {
    id: "move-copy-discovery",
    moduleId: "ownership",
    conceptIds: ["move-semantics", "copy-semantics"],
    competencyIds: ["classify-copy-move", "repair-compiler-feedback"],
    prerequisites: ["memory-intro"],
    title: "To samo przypisanie, inny skutek",
    subtitle:
      "Odkryj różnicę między move i Copy, porównując String oraz liczby całkowite.",
    minutes: 16,
    outcomes: [
      "Przewiduj, czy przypisanie zachowa wiązanie.",
      "Rozpoznaj E0382 jako użycie przeniesionej wartości.",
      "Odróżniaj niejawne Copy od jawnego Clone.",
    ],
    steps: [
      {
        id: "move-predict",
        evidence: {
          version: 2,
          conceptIds: ["move-semantics", "copy-semantics"],
        },
        kind: "predict",
        title: "Dwa przypisania",
        prompt:
          "Które wiązania pozostaną poprawne po przypisaniu: String, liczba całkowita czy oba?",
        code: 'fn main() {\n    let text = String::from("rust");\n    let text_next = text;\n    let number = 7;\n    let number_next = number;\n    println!("{text_next} {number} {number_next}");\n}',
        solution:
          'fn main() {\n    let text = String::from("rust");\n    let text_next = text;\n    let number = 7;\n    let number_next = number;\n    println!("{text_next} {number} {number_next}");\n}',
        choices: [
          {
            id: "both",
            label: "Oba",
          },
          {
            id: "integer",
            label: "Tylko liczba całkowita",
          },
          {
            id: "string",
            label: "Tylko String",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "integer",
          explanations: {
            both: "String zostaje przeniesiony do text_next, więc późniejsze użycie text łamie regułę move.",
            integer:
              "Poprawnie: i32 implementuje Copy, a text traci ważność po move do text_next.",
            string:
              "To liczba pozostaje dostępna; String nie implementuje Copy i zostaje przeniesiony.",
          },
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Porównaj typ String z i32.",
          "Zastosuj regułę Copy tylko do i32.",
        ],
      },
      {
        id: "move-error",
        evidence: { version: 2, conceptIds: ["move-semantics"] },
        kind: "debug",
        title: "Przeczytaj E0382",
        prompt:
          "Uruchom celowo błędny przykład i znajdź przeniesione wiązanie. Następnie napraw program: zachowaj przeniesienie first do second, a tekst rust wypisz dokładnie raz przez aktualnego właściciela.",
        code: 'fn main() {\n    let first = String::from("rust");\n    let second = first;\n    println!("{first} {second}");\n}',
        solution:
          'fn main() {\n    let first = String::from("rust");\n    let second = first;\n    println!("{second}");\n}',
        evaluator: {
          kind: "exact-output",
          expected: "rust\n",
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
        hints: [
          "Znajdź przypisanie first do second.",
          "Usuń użycie first po move.",
        ],
      },
      {
        id: "move-string-run",
        evidence: { version: 2, conceptIds: ["move-semantics"] },
        kind: "predict",
        title: "Uruchom String",
        prompt: "Przewidź wynik, a następnie uruchom kod.",
        code: 'fn main() {\n    let first = String::from("rust");\n    let second = first;\n    println!("{second}");\n}',
        solution:
          'fn main() {\n    let first = String::from("rust");\n    let second = first;\n    println!("{second}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["rust"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "copy-int-run",
        evidence: { version: 2, conceptIds: ["copy-semantics"] },
        kind: "predict",
        title: "Uruchom Copy",
        prompt: "Przewidź wynik, a następnie uruchom kod.",
        code: 'fn main() {\n    let first = 7;\n    let second = first;\n    println!("{first} {second}");\n}',
        solution:
          'fn main() {\n    let first = 7;\n    let second = first;\n    println!("{first} {second}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["7 7"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "copy-trace",
        evidence: { version: 2, conceptIds: ["copy-semantics"] },
        kind: "trace",
        title: "Śledź Copy",
        prompt:
          "Dlaczego oba wiązania są poprawne w przykładzie z liczbą całkowitą?",
        traceId: "trace-copy-int",
        evaluator: {
          kind: "choice",
          correct: "copy",
          explanations: {
            copy: "Poprawnie: i32 implementuje Copy, więc x i y mają niezależne kopie bitów.",
            move: "To nie jest move: po move stare wiązanie nie byłoby dostępne przy println.",
            clone:
              "Rust nie wywołuje tu jawnego clone; działa niejawne Copy dla i32.",
          },
        },
        choices: [
          {
            id: "copy",
            label: "i32 jest Copy",
          },
          {
            id: "move",
            label: "Zostało przeniesione",
          },
          {
            id: "clone",
            label: "Rust je sklonował",
          },
        ],
        evidenceKind: "trace",
      },
      {
        id: "copy-clone-trace",
        evidence: { version: 2, conceptIds: ["move-semantics"] },
        kind: "trace",
        title: "Śledź jawne clone",
        prompt:
          "Co zmieniło się na stercie po first.clone()? Wybierz opis zgodny ze śladem.",
        traceId: "trace-explicit-clone",
        choices: [
          {
            id: "duplicate",
            label: "Powstał drugi własny bufor",
          },
          {
            id: "move",
            label: "Własność przeszła do second",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "duplicate",
          explanations: {
            duplicate:
              "Poprawnie: first.clone() tworzy drugi, niezależny bufor i first zachowuje własność.",
            move: "clone nie przenosi first; po move drugi bufor nie powstałby, a first byłoby nieważne.",
          },
        },
        evidenceKind: "trace",
      },
      {
        id: "move-owned-transform",
        kind: "blank",
        title: "Przejmij i zwróć zmienioną wartość",
        prompt:
          "Napisz uppercase_owned(text: String) -> String, która przejmuje argument i zwraca nowy własny String zapisany wielkimi literami. Zachowaj sygnaturę; użyj poznanego zwracania wyrażenia. Fragment API z dokumentacji: to_uppercase(&self) -> String. `text.to_uppercase()` odczytuje tekst i tworzy nowy String; nie zmienia bufora w miejscu. &self oznacza odczyt odbiorcy metody; granice pożyczek przećwiczysz w następnej lekcji. Unicode może powiększyć wynik, np. straße → STRASSE; nie zakładaj zgodności bajt za bajt. To parametr String w uppercase_owned przenosi właściciela przy wywołaniu, a nie sama metoda to_uppercase. main może użyć upper, ale nie dawnego label. Dla kontrastu liczba i32 jest Copy: przekazanie jej do fn double(n: i32) -> i32 pozostawia oryginał. Copy liczby nie tworzy głębokiej kopii dowolnych danych na stercie; String nie jest Copy. Testy sprawdzają sygnaturę konsumującą String, pusty tekst, Unicode i ponowne przekazanie zwróconego właściciela.",
        code: ownedUppercaseContract.starter,
        solution: ownedUppercaseContract.solution,
        evaluator: {
          kind: "tests",
          tests: ownedUppercaseContract.tests,
        },
        evidence: {
          version: 2,
          conceptIds: ["move-semantics"],
          codingTaskId: "ownership/owned-uppercase",
        },
        evidenceKind: "transfer",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Wywołanie metody ma postać text.to_uppercase().",
          "Zwróć jej String, zamiast samego text.",
        ],
      },
      {
        id: "move-copy-return-predict",
        kind: "predict",
        title: "Wynik funkcji a stare wiązanie",
        prompt:
          'Przewidź wynik bez uruchamiania. Przekazanie number kopiuje i32, więc number pozostaje dostępne. Przekazanie label przenosi String: można odczytać upper, ale dopisanie println!("{label}") po wywołaniu byłoby E0382. Metoda to_uppercase tworzy nowy String z wielkimi literami; stary argument zostaje posprzątany po zakończeniu uppercase_owned.',
        code: 'fn double(n: i32) -> i32 { n * 2 }\nfn uppercase_owned(text: String) -> String { text.to_uppercase() }\nfn main() {\n    let number = 7;\n    let doubled = double(number);\n    let label = String::from("rust");\n    let upper = uppercase_owned(label);\n    println!("{number} {doubled} {upper}");\n}',
        solution:
          'fn double(n: i32) -> i32 { n * 2 }\nfn uppercase_owned(text: String) -> String { text.to_uppercase() }\nfn main() {\n    let number = 7;\n    let doubled = double(number);\n    let label = String::from("rust");\n    let upper = uppercase_owned(label);\n    println!("{number} {doubled} {upper}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["7 14 RUST"],
          feedback:
            "i32 zachowuje oba użyteczne wiązania dzięki Copy. String przechodzi do funkcji; upper posiada zwrócony wynik.",
        },
        evidence: {
          version: 2,
          conceptIds: ["move-semantics", "copy-semantics"],
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "move-copy-own-words",
        kind: "explain",
        title: "Move i Copy własnymi słowami",
        prompt:
          "Własnymi słowami wyjaśnij różnicę między przekazaniem label: String i number: i32 w poprzednim przykładzie. Wskaż, która nazwa pozostaje dostępna, kto posiada zwrócony String i dlaczego Copy liczby nie oznacza głębokiej kopii bufora String. Porównaj wypowiedź z rubryką. Aplikacja zapisuje samoocenę; nie sprawdza automatycznie sensu Twojego wyjaśnienia.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wyjaśniam, że label traci dostęp do przeniesionego String, a upper posiada zwrócony wynik.",
            "Wyjaśniam, że number pozostaje dostępne dzięki Copy dla i32.",
            "Odróżniam prostą kopię liczby od jawnego tworzenia niezależnego bufora String, np. przez clone.",
          ],
        },
        evidence: {
          version: 2,
          conceptIds: ["move-semantics", "copy-semantics"],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
    ],
    misconceptions: [
      "Każde przypisanie kopiuje dane głęboko.",
      "Copy i Clone to różne nazwy tego samego.",
    ],
    transferTask:
      "Bez uruchamiania sklasyfikuj przypisanie bool, String i Vec.",
    evidenceGate: "Napraw E0382 bez ujawniania rozwiązania opartego na clone.",
    sessionStops: [
      {
        afterStepId: "copy-clone-trace",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Przejmij i przekształć String, a potem wyjaśnij kontrast z Copy. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: [
      "rust-book-ownership",
      "rust-copy-trait",
      "baseline-str-uppercase",
    ],
  },
  {
    id: "functions-and-ownership",
    moduleId: "ownership",
    conceptIds: ["function-ownership"],
    competencyIds: ["design-function-boundary", "repair-compiler-feedback"],
    prerequisites: ["move-copy-discovery"],
    title: "Wywołania funkcji też przenoszą wartości",
    subtitle:
      "Na podstawie sygnatur przewiduj, kto jest właścicielem po wywołaniu.",
    minutes: 15,
    outcomes: [
      "Przewiduj własność po wywołaniu funkcji.",
      "Zwracaj własność, gdy funkcja zużywa wartość.",
      "Używaj wyrażeń zwracających wartości bez zbędnej ceremonii.",
    ],
    steps: [
      {
        id: "function-call-run",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "predict",
        title: "Uruchom wywołanie",
        prompt: "Przewidź wynik wywołania funkcji, a następnie go sprawdź.",
        code: 'fn main() {\n    let message = String::from("hello");\n    show(message);\n}\n\nfn show(text: String) {\n    println!("{text}");\n}',
        solution:
          'fn main() {\n    let message = String::from("hello");\n    show(message);\n}\n\nfn show(text: String) {\n    println!("{text}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["hello"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "function-error",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "debug",
        title: "Właściciel nie wraca do wywołującego",
        prompt:
          "Uruchom przykład i wyjaśnij, dlaczego drugie println nie może użyć message. Następnie napraw granicę show: funkcja ma czytać pożyczony tekst, a wywołujący nadal posiadać message. Zachowaj oba wypisania i nie używaj clone. Testy sprawdzą także inny komunikat.",
        code: 'fn main() {\n    let message = String::from("hello");\n    show(message);\n    println!("{message}");\n}\n\nfn show(text: String) {\n    println!("{text}");\n}',
        solution:
          'fn main() {\n    let message = String::from("hello");\n    show(&message);\n    println!("{message}");\n}\n\nfn show(text: &String) {\n    println!("{text}");\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test]\nfn caller_can_reuse() {\n    let text = String::from("hello");\n    show(&text);\n    assert_eq!(text, "hello");\n    show(&String::from("nowy przypadek"));\n}',
          forbiddenPatterns: [".clone(", "Clone::clone("],
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
        hints: [
          "Sprawdź typ parametru show.",
          "Jeśli show tylko czyta, przekaż referencję.",
        ],
      },
      {
        id: "return-ownership",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "modify",
        title: "Zwróć wartość",
        prompt: "Dokończ transfer własności, zwracając String z funkcji.",
        code: 'fn main() {\n    let message = String::from("hello");\n    let message = add_mark(message);\n    println!("{message}");\n}\n\nfn add_mark(text: String) -> String {\n    text\n}',
        solution:
          'fn main() {\n    let message = String::from("hello");\n    let message = add_mark(message);\n    println!("{message}");\n}\n\nfn add_mark(mut text: String) -> String {\n    text.push(\'!\');\n    text\n}\n\n#[test]\nfn adds_mark() {\n    assert_eq!(add_mark(String::from("hello")), "hello!");\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test] fn adds_mark() { assert_eq!(add_mark(String::from("hello")), "hello!"); }',
        },
        evidenceKind: "fix",
        expectedStatus: "success",
        hints: [
          "Funkcja ma zwrócić tę samą wartość.",
          "Ostatnie wyrażenie może być wartością zwracaną.",
        ],
      },
      {
        id: "function-expression-run",
        evidence: { version: 2, conceptIds: [] },
        kind: "run",
        title: "Uruchom wyrażenie",
        prompt: "Przewidź wartość wyrażenia blokowego i sprawdź ją.",
        code: 'fn main() {\n    let answer = {\n        let base = 40;\n        base + 2\n    };\n    println!("{answer}");\n}',
        solution:
          'fn main() {\n    let answer = {\n        let base = 40;\n        base + 2\n    };\n    println!("{answer}");\n}',
        evaluator: { kind: "exact-output", expected: "42\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "function-explain",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "explain",
        title: "Przeczytaj sygnaturę",
        prompt:
          "Własnymi słowami wyjaśnij, co sygnatura obiecuje o własności. Porównaj wypowiedź z rubryką: aplikacja wymaga wyjaśnienia i zapisuje samoocenę, lecz nie ocenia automatycznie jego sensu.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wskazuje, że parametr String przejmuje własność od wywołującego.",
            "Wyjaśnia, że zwrot String przekazuje własność z powrotem do wywołującego.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "function-transfer",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "apply",
        title: "Wybierz granicę",
        prompt:
          "Funkcja tylko wypisuje komunikat, a String wywołującego ma pozostać użyteczny. Wybierz granicę i uzasadnij.",
        choices: [
          {
            id: "borrow",
            label: "Referencja współdzielona",
          },
          {
            id: "own",
            label: "Własny String",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "borrow",
          explanations: {
            borrow:
              "Poprawnie: funkcja tylko czyta, więc referencja zostawia String wywołującemu.",
            own: "String przejąłby własność; dla samego wypisywania nie jest to potrzebne.",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Wywołanie funkcji zawsze kopiuje argument.",
      "Zwrócenie String zawsze tworzy jego kopię.",
    ],
    transferTask:
      "Zaprojektuj sygnaturę funkcji formatującej imię bez przejmowania własności.",
    evidenceGate:
      "Przewidź i napraw jedno przeniesienie własności przez funkcję.",
    sourceIds: ["rust-book-ownership", "rust-book-functions"],
  },
  {
    id: "borrow-intro",
    moduleId: "ownership",
    conceptIds: ["shared-borrow", "mutable-borrow"],
    competencyIds: ["borrow-without-taking", "repair-compiler-feedback"],
    prerequisites: ["functions-and-ownership"],
    title: "Pożycz, zanim zduplikujesz",
    subtitle:
      "Używaj referencji współdzielonych i mutowalnych, aby granice własności były jasne.",
    minutes: 18,
    outcomes: [
      "Przekazuj referencję do pracy tylko do odczytu.",
      "Przestrzegaj wyłączności pożyczki mutowalnej.",
      "Wyjaśniaj różnicę między pożyczką a przeniesieniem.",
    ],
    steps: [
      {
        id: "borrow-read-run",
        evidence: { version: 2, conceptIds: ["shared-borrow"] },
        kind: "predict",
        title: "Uruchom odczyt",
        prompt:
          "Przewidź wynik funkcji pożyczającej String, a następnie go sprawdź.",
        code: 'fn main() {\n    let message = String::from("ready");\n    let length = count(&message);\n    println!("{message} {length}");\n}\n\nfn count(text: &String) -> usize {\n    text.len()\n}',
        solution:
          'fn main() {\n    let message = String::from("ready");\n    let length = count(&message);\n    println!("{message} {length}");\n}\n\nfn count(text: &String) -> usize {\n    text.len()\n}',
        evaluator: {
          kind: "answer",
          accepted: ["ready 5"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Sprawdź znak & przy wywołaniu count.",
          "Właściciel message powinien pozostać użyteczny.",
        ],
      },
      {
        id: "borrow-trace",
        evidence: { version: 2, conceptIds: ["shared-borrow"] },
        kind: "trace",
        title: "Właściciel kontra widok",
        prompt:
          "Które wiązanie jest właścicielem danych na stercie, gdy istnieje view?",
        traceId: "trace-borrow",
        choices: [
          {
            id: "message",
            label: "message",
          },
          {
            id: "view",
            label: "view",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "message",
          explanations: {
            message:
              "Poprawnie: message posiada String i odpowiada za jego drop.",
            view: "view jest tylko referencją; pożyczka nie staje się właścicielem danych.",
          },
        },
        evidenceKind: "trace",
      },
      {
        id: "borrow-conflict",
        evidence: {
          version: 2,
          conceptIds: ["mutable-borrow"],
          codingTaskId: "ownership/mutate-append",
        },
        kind: "debug",
        title: "Jedna ścieżka mutacji",
        prompt:
          "Uruchom starter z konfliktem E0502 i zakończ współdzielony widok przed mutacją. Wymagana publiczna funkcja `pub fn append_suffix(text: &mut String, suffix: &str)` ma zachować istniejący tekst i dopisać przekazany suffix dokładnie raz. Testy sprawdzają bufor wywołującego, także po kolejnych wywołaniach. Kontrakt v2: zapisany szkic i ukończenie pozostają; wcześniejszy program wypisujący hi! wymaga dostosowania do tego API.",
        code: appendSuffixContract.starter,
        solution: appendSuffixContract.solution,
        evaluator: { kind: "tests", tests: appendSuffixContract.tests },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0502",
        evidenceGate: true,
        hints: [
          "Znajdź ostatnie użycie view: utrzymuje pożyczkę współdzieloną przez wywołanie mutujące.",
          "Zakończ odczyt view przed append_suffix albo utwórz go po mutacji; funkcja dopisuje przekazany suffix.",
        ],
      },
      {
        id: "borrow-mutable-run",
        evidence: {
          version: 2,
          conceptIds: ["mutable-borrow"],
          codingTaskId: "ownership/mutate-replace",
        },
        kind: "modify",
        title: "Zmień przez pożyczkę",
        prompt:
          "Zastąp dopisywanie wymianą całej zawartości. Wymagana publiczna funkcja `pub fn replace_text(text: &mut String, replacement: &str)` ma zostawić w buforze wywołującego dokładnie replacement, także pusty tekst. Zmień kod; odpowiedź tekstowa nie rozwiązuje tego zadania. Kontrakt v2: zapisany szkic i ukończenie pozostają; wcześniejsze rozwiązanie z hi! wymaga dostosowania do nowego API.",
        code: replaceTextContract.starter,
        solution: replaceTextContract.solution,
        evaluator: { kind: "tests", tests: replaceTextContract.tests },
        evidenceKind: "transfer",
        expectedStatus: "success",
        evidenceGate: true,
        hints: [
          "Starter zachowuje stary tekst, choć wymagana jest wymiana całej zawartości.",
          "Najpierw usuń dotychczasową zawartość bufora, potem zapisz replacement; sprawdź także pusty replacement.",
        ],
      },
      {
        id: "borrow-explain",
        evidence: { version: 2, conceptIds: ["shared-borrow"] },
        kind: "explain",
        title: "Pożyczyć czy przenieść?",
        prompt:
          "Wyjaśnij, dlaczego &String pasuje lepiej niż String do funkcji mierzącej długość.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Łączy &String z odczytem bez przejęcia własności.",
            "Podaje obserwowalny dowód: wywołujący może użyć text po pomiarze.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "borrow-transfer",
        evidence: { version: 2, conceptIds: ["mutable-borrow"] },
        kind: "apply",
        title: "Transfer: bezpieczna edycja",
        prompt:
          "Wybierz najmniejszą zmianę sygnatury pozwalającą dopisać interpunkcję bez przejęcia własności.",
        choices: [
          {
            id: "mutable-borrow",
            label: "&mut String",
          },
          {
            id: "owned",
            label: "String i zwrócenie go",
          },
          {
            id: "clone",
            label: "Clone przed wywołaniem",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "mutable-borrow",
          explanations: {
            "mutable-borrow":
              "Poprawnie: &mut String daje wyłączny dostęp i nie tworzy drugiej alokacji.",
            owned:
              "Zwrócenie String może działać, ale przejmuje granicę własności zamiast najmniejszej zmiany.",
            clone:
              "clone tworzy zbędną kopię; mutowalna pożyczka może zmienić oryginalny bufor.",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Referencja jest właścicielem wskazywanej wartości.",
      "Referencje współdzielone i mutowalne mogą się dowolnie nakładać.",
    ],
    transferTask:
      "Zrefaktoryzuj pomocnik tylko do odczytu i pomocnik mutujący.",
    evidenceGate:
      "Przekaż pożyczony String i napraw konflikt nakładających się pożyczek.",
    sourceIds: ["rust-book-borrowing", "rust-book-ownership"],
  },
  {
    id: "number-guessing-transfer",
    moduleId: "ownership",
    conceptIds: ["function-ownership", "shared-borrow", "ownership-repair"],
    competencyIds: ["transfer-to-project", "design-function-boundary"],
    prerequisites: ["borrow-intro"],
    title: "Projekt: komunikat Number Guessing",
    subtitle: "Przenieś rozumowanie o własności do małej, testowalnej funkcji.",
    minutes: 20,
    outcomes: [
      "Zbuduj funkcję komunikatu wyniku na podstawie kontraktu.",
      "Świadomie wybieraj parametry będące wartościami lub referencjami.",
      "Weryfikuj zachowanie dokładnym wynikiem.",
    ],
    steps: [
      {
        id: "project-contract",
        evidence: { version: 2, conceptIds: [] },
        kind: "apply",
        title: "Przeczytaj kontrakt",
        prompt:
          "Funkcja komunikatu przyjmuje dwie liczby i zwraca tekst. Które parametry mogą być Copy?",
        choices: [
          {
            id: "numbers",
            label: "wartości u32",
          },
          {
            id: "strings",
            label: "wartości String",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "numbers",
          explanations: {
            numbers:
              "u32 implementuje Copy, więc oba parametry są przekazywane przez prostą kopię.",
            strings:
              "String nie implementuje Copy; w tym kontrakcie parametry są liczbami, nie String.",
          },
        },
        evidenceKind: "project",
      },
      {
        id: "project-result-run",
        evidence: { version: 2, conceptIds: [] },
        kind: "run",
        title: "Uruchom komunikat wyniku",
        prompt: "Przewidź wynik dla poprawnego strzału i sprawdź go.",
        code: 'fn result_message(guess: u32, secret: u32) -> String {\n    if guess == secret { String::from("correct") } else { String::from("try again") }\n}\n\nfn main() {\n    println!("{}", result_message(7, 7));\n}',
        solution:
          'fn result_message(guess: u32, secret: u32) -> String {\n    if guess == secret { String::from("correct") } else { String::from("try again") }\n}\n\nfn main() {\n    println!("{}", result_message(7, 7));\n}',
        evaluator: { kind: "exact-output", expected: "correct\n" },
        evidenceKind: "exposure",
        expectedStatus: "success",
      },
      {
        id: "project-blank",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "blank",
        title: "Pusta kartka: napisz zachowanie",
        prompt:
          "Zbuduj od pustej kartki część gry zgadywania. Zaprojektuj funkcję, która porównuje zgadywaną liczbę z sekretem i zwraca posiadaną String: correct dla trafienia albo try again dla innego wyniku. W main pokaż oba przypadki, w tej kolejności, każdy w osobnej linii. Sam wybierz nazwę funkcji i typy. Nie używaj gotowych tekstów zamiast porównania liczb. Automatyczna ocena porównuje pokazany wynik i szuka fragmentów -> String oraz if; nie sprawdza działania dla dowolnych wejść ani architektury funkcji. Dopisz własny test dla innej liczby, np. zera, i uzasadnij, dlaczego sprawdza granicę. To dodatkowe sprawdzenie oceniasz samodzielnie w dopisanym kroku na końcu lekcji.",
        solution:
          'fn verdict(guess: i32, secret: i32) -> String {\n    if guess == secret { String::from("correct") } else { String::from("try again") }\n}\n\nfn main() {\n    println!("{}", verdict(4, 4));\n    println!("{}", verdict(3, 4));\n}',
        evaluator: {
          kind: "exact-output",
          expected: "correct\ntry again\n",
          requiredPatterns: ["-> String", "if"],
        },
        evidenceKind: "project",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Zacznij od programu z wejściem stałym.",
          "Sprawdź oba wyniki: równy i różny strzał.",
        ],
      },
      {
        id: "project-error",
        evidence: {
          version: 2,
          conceptIds: [
            "function-ownership",
            "shared-borrow",
            "ownership-repair",
          ],
        },
        kind: "debug",
        title: "Zachowaj jednego właściciela komunikatu",
        prompt:
          "Ten wariant przenosi String do formatera, a potem próbuje go wypisać. Napraw granicę przez pożyczkę.",
        code: 'fn main() {\n    let message = String::from("correct");\n    show(message);\n    println!("{message}");\n}\n\nfn show(text: String) {\n    println!("{text}");\n}',
        solution:
          'fn main() {\n    let message = String::from("correct");\n    show(&message);\n    println!("{message}");\n}\n\nfn show(text: &String) {\n    println!("{text}");\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test]\nfn caller_can_reuse() {\n    let text = String::from("correct");\n    show(&text);\n    assert_eq!(text, "correct");\n    show(&String::from("nowy przypadek"));\n}',
          forbiddenPatterns: [".clone(", "Clone::clone("],
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
        hints: [
          "show tylko czyta komunikat.",
          "Zmień argument na &message i parametr na referencję.",
        ],
      },
      {
        id: "project-reasoning",
        evidence: {
          version: 2,
          conceptIds: [
            "function-ownership",
            "shared-borrow",
            "ownership-repair",
          ],
        },
        kind: "explain",
        title: "Uzasadnij granicę",
        prompt:
          "Dlaczego result_message zwraca własny String, a show powinno pożyczać argument?",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Rozróżnia własny String zwracany przez result_message od pożyczonego argumentu show.",
            "Wyjaśnia, że zwracany String musi mieć właściciela po zakończeniu funkcji.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "project-check",
        evidence: { version: 2, conceptIds: [] },
        kind: "apply",
        title: "Dodaj przypadek regresji",
        prompt:
          "Jakie dwa przypadki trzeba przetestować przed uznaniem projektu za gotowy?",
        choices: [
          {
            id: "equal-different",
            label: "równy i różny strzał",
          },
          {
            id: "equal-only",
            label: "tylko równe strzały",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "equal-different",
          explanations: {
            "equal-different":
              "Poprawnie: obie gałęzie kontraktu muszą mieć test, aby wykryć regresję warunku.",
            "equal-only":
              "Sam trafiony strzał nie sprawdza gałęzi try again ani odwrotnego wyniku.",
          },
        },
        evidenceKind: "project",
      },
      {
        id: "project-own-boundary-test",
        kind: "explain",
        title: "Własny test i jego uzasadnienie",
        prompt:
          "Zapisz własny dodatkowy test programu z pustej kartki: wejście, oczekiwany wynik i powód wyboru granicy. Uruchom go, zapisz obserwację oraz jedną zmianę, którą test powinien wykryć. Jeśli nie masz automatycznego testu, opisz ręczne wywołanie i jego ograniczenie. Samodzielnie porównaj opis z rubryką; aplikacja nie uruchamia ani nie ocenia semantycznie tego dodatkowego testu.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Podaję nowe wejście i konkretny oczekiwany wynik.",
            "Wyjaśniam granicę lub ryzyko sprawdzane przez ten przypadek.",
            "Zapisuję rzeczywistą obserwację i zmianę zachowania, którą test powinien odrzucić.",
          ],
        },
        evidence: {
          version: 2,
          conceptIds: [],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
    ],
    misconceptions: [
      "Zwrócenie String oznacza jego pożyczenie.",
      "Argumenty u32 trzeba klonować, aby użyć ich ponownie.",
    ],
    transferTask:
      "Zastosuj te same decyzje własności w pomocniku komunikatu wyniku z nowym przypadkiem.",
    evidenceGate:
      "Implementacja od pustej kartki przechodzi obie gałęzie i zawiera naprawę.",
    sessionStops: [
      {
        afterStepId: "project-check",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Zapisz własny test graniczny i uzasadnienie. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: [
      "rust-book-functions",
      "rust-book-ownership",
      "rust-book-borrowing",
    ],
  },
  {
    id: "blank-page-repair",
    moduleId: "ownership",
    conceptIds: ["move-semantics", "function-ownership", "ownership-repair"],
    competencyIds: ["repair-compiler-feedback", "transfer-to-project"],
    prerequisites: ["number-guessing-transfer"],
    title: "Pusta kartka: naprawa na podstawie dowodów",
    subtitle:
      "Użyj komunikatu kompilatora jako wskazówki przy projektowaniu małego API.",
    minutes: 18,
    outcomes: [
      "Zacznij od kontraktu zachowania.",
      "Napraw błąd bez kopiowania gotowej odpowiedzi.",
      "Przetestuj granicę funkcji na świeżym przypadku.",
    ],
    steps: [
      {
        id: "blank-plan",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "apply",
        title: "Zaplanuj właściciela",
        prompt: "Kto powinien posiadać zwrócony status po powrocie funkcji?",
        choices: [
          {
            id: "caller",
            label: "Wywołujący po powrocie",
          },
          {
            id: "helper",
            label: "Tylko pomocnik na zawsze",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "caller",
          explanations: {
            caller:
              "Poprawnie: funkcja może zwrócić status, a wywołujący staje się jego właścicielem.",
            helper:
              "Pomocnik kończy działanie po return; nie może być właścicielem wartości na zawsze.",
          },
        },
        evidenceKind: "transfer",
      },
      {
        id: "blank-code",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "blank",
        title: "Napisz najmniejszą implementację",
        prompt:
          "Napisz od zera program budujący komunikaty statusu. Samodzielnie zaprojektuj funkcję, która przyjmuje nazwę statusu i zwraca własną String. Dla dwóch nazw: ready i waiting, program ma wypisać osobne linie: status: ready oraz status: waiting. To samo zachowanie ma działać dla innych nazw. Nie podajemy nazw ani sygnatur funkcji. Automat sprawdza pokazane dwie linie oraz obecność fragmentu -> String; nie potwierdza poprawności dla innych nazw ani struktury programu. Dopisz własny test z pustą nazwą albo nazwą Unicode i uzasadnij wybór. Ten test i uzasadnienie oceniasz samodzielnie w dopisanym kroku na końcu lekcji.",
        solution:
          'fn describe(status: &str) -> String {\n    format!("status: {status}")\n}\n\nfn main() {\n    println!("{}", describe("ready"));\n    println!("{}", describe("waiting"));\n}',
        evaluator: {
          kind: "exact-output",
          expected: "status: ready\nstatus: waiting\n",
          requiredPatterns: ["-> String"],
        },
        evidenceKind: "project",
        evidenceGate: true,
        expectedStatus: "success",
        hints: [
          "Zbuduj funkcję i main od pustej kartki.",
          "Wynik funkcji musi być własnym String.",
        ],
      },
      {
        id: "blank-error",
        evidence: {
          version: 2,
          conceptIds: [
            "move-semantics",
            "function-ownership",
            "ownership-repair",
          ],
        },
        kind: "debug",
        title: "Napraw bez clone",
        prompt:
          "Uruchom błędny kod, a następnie zmień granicę parametru. Nie dodawaj .clone().",
        code: 'fn main() {\n    let status = String::from("ready");\n    print_status(status);\n    println!("{status}");\n}\n\nfn print_status(value: String) {\n    println!("{value}");\n}',
        solution:
          'fn main() {\n    let status = String::from("ready");\n    print_status(&status);\n    println!("{status}");\n}\n\nfn print_status(value: &String) {\n    println!("{value}");\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test]\nfn caller_can_reuse() {\n    let text = String::from("ready");\n    print_status(&text);\n    assert_eq!(text, "ready");\n    print_status(&String::from("nowy przypadek"));\n}',
          forbiddenPatterns: [".clone(", "Clone::clone("],
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
        hints: [
          "print_status tylko odczytuje status.",
          "Przekaż &status zamiast status.",
        ],
      },
      {
        id: "blank-test",
        evidence: { version: 2, conceptIds: ["function-ownership"] },
        kind: "run",
        title: "Sprawdź świeży argument",
        prompt:
          "Uruchom naprawiony formatter z nowym argumentem i sprawdź dokładną linię.",
        code: 'fn format_status(mut status: String) -> String {\n    status.insert_str(0, "status: ");\n    status\n}\n\nfn main() {\n    println!("{}", format_status(String::from("waiting")));\n}',
        solution:
          'fn format_status(mut status: String) -> String {\n    status.insert_str(0, "status: ");\n    status\n}\n\nfn main() {\n    println!("{}", format_status(String::from("waiting")));\n}',
        evaluator: {
          kind: "exact-output",
          expected: "status: waiting\n",
        },
        evidenceKind: "project",
        expectedStatus: "success",
        hints: [
          "Porównaj formatowanie z oczekiwanym napisem.",
          "Uruchom przypadek waiting.",
        ],
      },
      {
        id: "blank-reason",
        evidence: {
          version: 2,
          conceptIds: [
            "move-semantics",
            "function-ownership",
            "ownership-repair",
          ],
        },
        kind: "explain",
        title: "Uzasadnij naprawę",
        prompt: "Który fragment E0382 skłonił Cię do zmiany sygnatury?",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wskazuje użycie message po wywołaniu print_status jako dowód błędu E0382.",
            "Wyjaśnia, że &status zachowuje własność po stronie wywołującego.",
            "Łączy zmianę parametru i argumentu z obserwowalnym przejściem testów.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "blank-transfer",
        evidence: {
          version: 2,
          conceptIds: ["function-ownership", "ownership-repair"],
        },
        kind: "apply",
        title: "Świeży transfer",
        prompt:
          "Zaprojektuj pomocnika, który czyta String i zostawia go użytecznym po wywołaniu. Podaj parametr i przypadek testowy.",
        solution:
          "Użyj `&String` albo `&str` i sprawdź, że wywołujący może wypisać oryginał po wywołaniu pomocnika.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Podaje parametr &str albo &String dla pomocnika tylko do odczytu.",
            "Podaje przypadek testowy, w którym wywołujący używa oryginału po wywołaniu.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "blank-own-boundary-test",
        kind: "explain",
        title: "Własny test i jego uzasadnienie",
        prompt:
          "Zapisz własny dodatkowy test programu z pustej kartki: wejście, oczekiwany wynik i powód wyboru granicy. Uruchom go, zapisz obserwację oraz jedną zmianę, którą test powinien wykryć. Jeśli nie masz automatycznego testu, opisz ręczne wywołanie i jego ograniczenie. Samodzielnie porównaj opis z rubryką; aplikacja nie uruchamia ani nie ocenia semantycznie tego dodatkowego testu.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Podaję nowe wejście i konkretny oczekiwany wynik.",
            "Wyjaśniam granicę lub ryzyko sprawdzane przez ten przypadek.",
            "Zapisuję rzeczywistą obserwację i zmianę zachowania, którą test powinien odrzucić.",
          ],
        },
        evidence: {
          version: 2,
          conceptIds: [],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
    ],
    misconceptions: [
      "Sugestia kompilatora zawsze jest najlepszym projektem.",
      "Naprawa jest dobra, jeśli kod tylko się kompiluje.",
    ],
    transferTask:
      "Napraw niewidzianego wcześniej pomocnika tylko do odczytu i uzasadnij sygnaturę.",
    evidenceGate: "Samodzielna naprawa i test świeżego wyniku przechodzą.",
    sessionStops: [
      {
        afterStepId: "blank-transfer",
        title: "Opcjonalna przerwa przed dodatkową praktyką",
        nextGoal:
          "Zapisz własny test i wyjaśnij, jaką zmianę wykrywa. Czas podany przy lekcji jest orientacyjny; dodatkową praktykę możesz zrobić w osobnej sesji.",
      },
    ],
    sourceIds: ["rust-book-ownership", "rust-book-borrowing"],
  },
  {
    id: "adversarial-no-clone",
    moduleId: "ownership",
    conceptIds: ["ownership-repair", "shared-borrow", "mutable-borrow"],
    competencyIds: ["avoid-unnecessary-clone", "repair-compiler-feedback"],
    prerequisites: ["blank-page-repair"],
    title: "Projekt adversarialny: bez skrótu clone",
    subtitle:
      "Wybierz granicę własności pod ograniczeniem, które wyklucza odruchowe klonowanie.",
    minutes: 16,
    outcomes: [
      "Rozpoznaj, czy funkcja naprawdę potrzebuje własności.",
      "Napraw konflikt pożyczek.",
      "Wyjaśnij, dlaczego projekt unika zbędnej alokacji.",
    ],
    steps: [
      {
        id: "adversarial-diagnose",
        evidence: {
          version: 2,
          conceptIds: ["shared-borrow", "ownership-repair"],
        },
        kind: "assessment",
        title: "Nazwij prawdziwą potrzebę",
        prompt:
          "Logger tylko wyświetla komunikat i nie może alokować. Co powinien otrzymać?",
        choices: [
          {
            id: "str",
            label: "&str",
          },
          {
            id: "string",
            label: "String",
          },
          {
            id: "clone",
            label: "String::clone()",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "str",
          explanations: {
            str: "Poprawnie: &str daje odczyt bez przejmowania ani alokowania komunikatu.",
            string:
              "String przejmuje własność; logger nie potrzebuje jej, skoro tylko czyta.",
            clone:
              "clone tworzy niepotrzebną alokację zamiast opisać pożyczoną granicę.",
          },
        },
        evidenceKind: "assessment",
      },
      {
        id: "adversarial-code",
        evidence: {
          version: 2,
          conceptIds: ["shared-borrow", "ownership-repair"],
          codingTaskId: "ownership/read-length",
        },
        kind: "modify",
        title: "Zaimplementuj logger z ograniczeniem",
        prompt:
          "Logger tylko czyta komunikat. Usuń niepotrzebne clone z wywołania i zmień parametr show_result na pożyczony tekst. Zwróć liczbę bajtów komunikatu. Oryginalny result musi pozostać dostępny po wywołaniu.",
        code: 'fn show_result(message: String) -> usize {\n    println!("{message}");\n    message.len()\n}\n\nfn main() {\n    let result = String::from("correct");\n    let length = show_result(result.clone());\n    println!("{result} ({length})");\n}',
        solution:
          'fn show_result(message: &str) -> usize {\n    println!("{message}");\n    message.len()\n}\n\nfn main() {\n    let result = String::from("correct");\n    let length = show_result(&result);\n    println!("{result} ({length})");\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test]\nfn caller_keeps_ownership() {\n    let read: fn(&str) -> usize = show_result;\n    for label in ["ok", "try again", "", "żółw 🦀"] {\n        let message = String::from(label);\n        assert_eq!(read(&message), label.len());\n        assert_eq!(read(&message), label.as_bytes().len());\n        assert_eq!(message, label);\n    }\n}',
          forbiddenPatterns: [".clone(", "Clone::clone("],
        },
        evidenceKind: "project",
        expectedStatus: "success",
        hints: [
          "Logger potrzebuje tylko &str.",
          "Usuń każdą potrzebę klonowania.",
        ],
        evidenceGate: true,
      },
      {
        id: "adversarial-conflict",
        evidence: {
          version: 2,
          conceptIds: ["mutable-borrow"],
          codingTaskId: "ownership/mutate-surround",
        },
        kind: "debug",
        title: "Napraw konflikt",
        prompt:
          "Napraw konflikt E0502, kończąc współdzielony widok przed mutacją. Wymagana publiczna funkcja `pub fn surround(text: &mut String, prefix: &str, suffix: &str)` ma zachować obecny środek bufora i otoczyć go przekazanym prefiksem i sufiksem, także przy pustych i Unicode danych. Kontrakt v2: zapisany szkic i ukończenie pozostają; samo wypisanie try again nie sprawdza tej mutacji.",
        code: surroundContract.starter,
        solution: surroundContract.solution,
        evaluator: { kind: "tests", tests: surroundContract.tests },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0502",
        evidenceGate: true,
        hints: [
          "view pozostaje używany po surround, więc jego pożyczka nakłada się na mutację.",
          "Przenieś ostatni odczyt view przed mutację albo utwórz widok później; zachowaj środek pomiędzy prefix i suffix.",
        ],
      },
      {
        id: "adversarial-reason",
        evidence: {
          version: 2,
          conceptIds: ["shared-borrow", "ownership-repair"],
        },
        kind: "explain",
        title: "Wyjaśnij kompromis",
        prompt:
          "Dlaczego pożyczka jest tu mocniejszym dowodem zrozumienia niż dodanie clone?",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wyjaśnia, że pożyczka nie alokuje drugiego bufora i zachowuje właściciela.",
            "Rozpoznaje, że clone byłby kosztem, a nie naprawą granicy odczytu.",
            "Wskazuje dowód w kodzie: logger działa z &str, a message pozostaje użyteczny.",
          ],
        },
        evidenceKind: "self-rating",
        evidenceGate: false,
      },
      {
        id: "adversarial-trace",
        evidence: { version: 2, conceptIds: ["shared-borrow"] },
        kind: "trace",
        title: "Śledź współdzielony dostęp",
        prompt:
          "Za pomocą śladu wskaż, kto usuwa komunikat po powrocie loggera.",
        traceId: "trace-borrow",
        choices: [
          {
            id: "message",
            label: "właściciel message",
          },
          {
            id: "view",
            label: "referencja view",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "message",
          explanations: {
            message:
              "Poprawnie: właściciel message zwalnia String po zakończeniu zakresu.",
            view: "view jest referencją i nie zwalnia komunikatu po powrocie loggera.",
          },
        },
        evidenceKind: "trace",
      },
      {
        id: "adversarial-transfer",
        evidence: { version: 2, conceptIds: ["ownership-repair"] },
        kind: "apply",
        title: "Transfer ograniczenia",
        prompt:
          "Czy pożyczka wystarczy formatterowi, który musi zachować niezależny wynik po zmianie bufora wywołującego?",
        choices: [
          {
            id: "owned",
            label: "Zwróć albo utwórz własną wartość",
          },
          {
            id: "borrow",
            label: "Tylko pożycz",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "owned",
          explanations: {
            owned:
              "Poprawnie: niezależny wynik musi mieć własne dane, więc formatter zwraca albo tworzy String.",
            borrow:
              "Sama pożyczka nie może przeżyć zmiany bufora wywołującego ani dostarczyć niezależnego wyniku.",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Zakaz clone oznacza, że clone nigdy nie jest właściwy.",
      "Referencja zawsze żyje wiecznie.",
    ],
    transferTask:
      "Dla nowego ograniczenia wybierz pożyczkę, move albo własny wynik i uzasadnij koszt.",
    evidenceGate:
      "Przejdź test bez clone i wyjaśnij, kiedy jawne clone byłoby uzasadnione.",
    sourceIds: ["rust-book-borrowing", "rust-copy-trait"],
  },
  {
    id: "scenario-assessment",
    moduleId: "ownership",
    conceptIds: [
      "move-semantics",
      "copy-semantics",
      "function-ownership",
      "shared-borrow",
      "ownership-repair",
    ],
    competencyIds: [
      "classify-copy-move",
      "repair-compiler-feedback",
      "transfer-to-project",
    ],
    prerequisites: ["adversarial-no-clone"],
    title: "Ocena scenariuszowa: nowa baza kodu",
    subtitle:
      "Pokaż, co potrafisz zrobić z niewidzianymi przypadkami move, Copy i borrow.",
    minutes: 20,
    outcomes: [
      "Klasyfikuj nowe wartości bez dopasowywania do zapamiętanego wzoru.",
      "Samodzielnie napraw błąd przeniesienia.",
      "Pisemnie uzasadnij granicę funkcji.",
    ],
    steps: [
      {
        id: "assessment-unseen-copy",
        evidence: { version: 2, conceptIds: ["copy-semantics"] },
        kind: "assessment",
        title: "Niewidziana klasyfikacja",
        prompt:
          "Para (u8, bool) składa się z dwóch typów Copy. Przewidź dokładny output, zanim uruchomisz kod. Zapisz oba nawiasy i wartości.",
        evaluator: {
          kind: "answer",
          accepted: ["(8, true) (8, true)"],
          feedback:
            "Każdy element pary jest Copy. Przeniesienie do saved pozostawia entry dostępną.",
        },
        evidenceKind: "prediction",
        code: 'fn main() {\n    let entry = (8u8, true);\n    let saved = entry;\n    println!("{entry:?} {saved:?}");\n}',
        solution:
          'fn main() {\n    let entry = (8u8, true);\n    let saved = entry;\n    println!("{entry:?} {saved:?}");\n}',
        expectedStatus: "success",
        evidenceGate: true,
      },
      {
        id: "assessment-unseen-move",
        evidence: { version: 2, conceptIds: ["move-semantics"] },
        kind: "assessment",
        title: "Niewidziane move",
        prompt:
          "Zanim uruchomisz: czy ten kod się skompiluje? Wpisz kod błędu, którego oczekujesz, albo output. Wskaż też w myślach linię zmieniającą właściciela.",
        evaluator: {
          kind: "answer",
          accepted: ["E0382"],
          feedback:
            "String nie implementuje Copy. Odczyt title występuje po przeniesieniu do report — wróć do klasy błędu użycia przeniesionej wartości.",
        },
        evidenceKind: "prediction",
        code: 'fn main() {\n    let title = String::from("Raport");\n    let report = title;\n    println!("{title}");\n    println!("{report}");\n}',
        solution:
          'fn main() {\n    let title = String::from("Raport");\n    let report = title;\n    println!("{report}");\n}',
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
      },
      {
        id: "assessment-repair",
        evidence: {
          version: 2,
          conceptIds: [
            "move-semantics",
            "function-ownership",
            "shared-borrow",
            "ownership-repair",
          ],
          codingTaskId: "ownership/read-length",
        },
        kind: "debug",
        title: "Napraw bez przepisu",
        prompt:
          "Kod pochodzi z nowego projektu. Funkcja measure ma mierzyć długość tekstu, a program ma nadal móc użyć text. Napraw granicę funkcji bez clone. Nie usuwaj funkcji ani wywołania; pomiar i późniejszy odczyt właściciela muszą pozostać możliwe.",
        code: 'fn main() {\n    let text = String::from("new case");\n    measure(text);\n    println!("{text}");\n}\n\nfn measure(value: String) -> usize {\n    value.len()\n}',
        solution:
          'fn main() {\n    let text = String::from("new case");\n    let length = measure(&text);\n    println!("{text} ({length})");\n}\n\nfn measure(value: &String) -> usize {\n    value.len()\n}',
        evaluator: {
          kind: "tests",
          tests:
            '#[test]\nfn measures_without_consuming() {\n    let read: fn(&String) -> usize = measure;\n    for label in ["new case", "Rust", "", "żółw 🦀"] {\n        let text = String::from(label);\n        assert_eq!(read(&text), label.len());\n        assert_eq!(read(&text), label.as_bytes().len());\n        assert_eq!(text, label);\n    }\n}',
          forbiddenPatterns: [".clone(", "Clone::clone("],
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0382",
        evidenceGate: true,
        hints: [
          "measure tylko odczytuje tekst.",
          "Przekaż &text i zachowaj wynik długości.",
        ],
      },
      {
        id: "assessment-reasoning",
        evidence: {
          version: 2,
          conceptIds: [
            "move-semantics",
            "function-ownership",
            "shared-borrow",
            "ownership-repair",
          ],
        },
        kind: "explain",
        title: "Uzasadnij i porównaj z rubryką",
        prompt:
          "Wyjaśnij własnymi słowami, dlaczego naprawa działa i jakie dowody mogłyby zmienić decyzję. Aplikacja sprawdza wybór decyzji w osobnym kroku i wymaga tego dodatkowego wyjaśnienia. Rubryka służy Twojej samoocenie; nie jest automatyczną oceną semantyczną wypowiedzi ani dowodem opanowania tematu.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wskazuje pierwotne przeniesienie title do report.",
            "Wyjaśnia, że pożyczka zachowuje własność text po wywołaniu measure.",
            "Podaje obserwowalny dowód, taki jak przejście testu i późniejszy odczyt text.",
          ],
        },
        evidenceKind: "self-rating",
        rubric: [
          "Wskazano pierwotne przeniesienie.",
          "Pożyczka zachowuje własność.",
          "Podano dowód.",
        ],
        evidenceGate: false,
      },
      {
        id: "assessment-retrieval",
        evidence: {
          version: 2,
          conceptIds: ["shared-borrow", "ownership-repair"],
        },
        kind: "recall",
        title: "Odroczone przypomnienie",
        prompt:
          "Bez otwierania poprzednich lekcji: kiedy należy wybrać pożyczkę zamiast clone?",
        evaluator: {
          kind: "answer",
          accepted: [
            "when the callee only needs read access",
            "when only read access is needed",
            "if the callee only reads",
            "gdy wywołana funkcja potrzebuje tylko odczytu",
            "gdy funkcja tylko czyta",
            "kiedy potrzebny jest tylko odczyt",
          ],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "recall",
        evidenceGate: true,
      },
      {
        id: "assessment-transfer",
        evidence: {
          version: 2,
          conceptIds: ["function-ownership", "ownership-repair"],
        },
        kind: "apply",
        title: "Końcowy transfer",
        prompt:
          "Wybierz API funkcji, która po wywołaniu przechowuje własną kopię etykiety.",
        choices: [
          {
            id: "owned",
            label: "Przejmij albo zbuduj własny String",
          },
          {
            id: "borrow",
            label: "Tylko pożycz i przechowuj referencję na zawsze",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "owned",
          explanations: {
            owned:
              "Poprawnie: przejęcie albo zbudowanie String daje API, które może przechowywać własną etykietę.",
            borrow:
              "Przechowywanie samej referencji wymagałoby żywotności danych wykraczającej poza wywołującego.",
          },
        },
        evidenceKind: "transfer",
      },
    ],
    misconceptions: [
      "Znajomość słów dowodzi umiejętności transferu.",
      "Każda sugestia kompilatora jest decyzją projektową.",
    ],
    transferTask:
      "Rozwiąż nowy scenariusz move/Copy i wybierz API z uzasadnieniem opartym na dowodach.",
    evidenceGate:
      "Bez podpowiedzi sklasyfikuj przypadki, napraw błąd i przejdź odroczone przypomnienie.",
    sourceIds: [
      "rust-book-ownership",
      "rust-copy-trait",
      "rust-book-borrowing",
    ],
  },
];

export const ownershipModule: CourseModule = {
  id: "ownership",
  title: "Własność: pokaż odpowiedzialność",
  whyItMatters:
    "Własność pozwala Rust bezpiecznie zwalniać zasoby bez garbage collectora i zamienia niejasne współdzielenie w decyzję sprawdzaną podczas kompilacji.",
  capabilities: [
    "przewiduj move i Copy w nowym kodzie",
    "napraw błąd E0382 lub E0502",
    "projektuj granice funkcji z własnością i pożyczką",
    "przenieś reguły do funkcji komunikatu wyniku",
  ],
  prerequisites: [],
  lessonIds: [
    "memory-intro",
    "move-copy-discovery",
    "functions-and-ownership",
    "borrow-intro",
    "number-guessing-transfer",
    "blank-page-repair",
    "adversarial-no-clone",
    "scenario-assessment",
    "function-ownership-calibration",
    "shared-borrow-calibration",
  ],
  exitGate: [
    "Przewidź niewidziany wynik move/Copy.",
    "Napraw E0382 bez ujawnionego rozwiązania.",
    "Użyj pożyczki do pracy tylko do odczytu.",
    "Wybierz decyzję bez clone i dodaj własne wyjaśnienie porównane z rubryką samooceny; aplikacja nie ocenia automatycznie sensu wypowiedzi.",
  ],
  projectConnection:
    "Projekt komunikatu Number Guessing pokazuje decyzje własności na każdej granicy funkcji.",
  assessmentId: "assessment-retrieval",
  gateCriteria: [
    {
      id: "move-prediction",
      label: "Przewidywanie move w nowym kodzie",
      taskRefs: [
        { lessonId: "move-copy-discovery", stepId: "move-predict" },
        { lessonId: "scenario-assessment", stepId: "assessment-unseen-move" },
      ],
    },
    {
      id: "copy-prediction",
      label: "Przewidywanie Copy w nowym kodzie",
      taskRefs: [
        { lessonId: "move-copy-discovery", stepId: "copy-int-run" },
        { lessonId: "scenario-assessment", stepId: "assessment-unseen-copy" },
      ],
    },
    {
      id: "ownership-explanation",
      label: "Decyzja własności i własne wyjaśnienie z rubryką samooceny",
      taskRefs: [
        { lessonId: "functions-and-ownership", stepId: "function-transfer" },
        { lessonId: "scenario-assessment", stepId: "assessment-transfer" },
      ],
      supplementaryStepRefs: [
        { lessonId: "functions-and-ownership", stepId: "function-explain" },
        { lessonId: "scenario-assessment", stepId: "assessment-reasoning" },
      ],
    },
    {
      id: "moved-value-repair",
      label: "Naprawa użycia przeniesionej wartości",
      taskRefs: [
        { lessonId: "move-copy-discovery", stepId: "move-error" },
        { lessonId: "scenario-assessment", stepId: "assessment-repair" },
      ],
    },
    {
      id: "anti-clone-recognition",
      label: "Rozpoznanie, kiedy nie dodawać clone",
      taskRefs: [
        { lessonId: "adversarial-no-clone", stepId: "adversarial-diagnose" },
        { lessonId: "adversarial-no-clone", stepId: "adversarial-code" },
      ],
    },
    {
      id: "function-ownership",
      label: "Projektowanie własności na granicy funkcji",
      taskRefs: [
        { lessonId: "functions-and-ownership", stepId: "function-error" },
        { lessonId: "number-guessing-transfer", stepId: "project-error" },
      ],
    },
    {
      id: "borrowing",
      label: "Dwa różne zadania mutacji przez pożyczkę bez podpowiedzi",
      requiredIndependentCodingTasks: 2,
      taskRefs: [
        { lessonId: "borrow-intro", stepId: "borrow-conflict" },
        { lessonId: "borrow-intro", stepId: "borrow-mutable-run" },
        { lessonId: "adversarial-no-clone", stepId: "adversarial-conflict" },
      ],
      supplementaryStepRefs: [
        { lessonId: "borrow-intro", stepId: "borrow-explain" },
      ],
    },
    {
      id: "unseen-task",
      label: "Samodzielne zadanie z niewidzianego przypadku",
      taskRefs: [
        { lessonId: "number-guessing-transfer", stepId: "project-blank" },
        { lessonId: "blank-page-repair", stepId: "blank-code" },
        { lessonId: "adversarial-no-clone", stepId: "adversarial-code" },
        { lessonId: "scenario-assessment", stepId: "assessment-repair" },
      ],
    },
    {
      id: "function-boundary-v1",
      label: "Dwie niezależne granice własności funkcji",
      requiredIndependentCodingTasks: 2,
      taskRefs: [
        {
          lessonId: "function-ownership-calibration",
          stepId: "function-is-empty-text",
        },
        {
          lessonId: "function-ownership-calibration",
          stepId: "function-add-mark",
        },
      ],
    },
    {
      id: "shared-borrow-pair-v1",
      label: "Dwie różne naprawy pożyczonego odczytu bez podpowiedzi",
      requiredIndependentCodingTasks: 2,
      taskRefs: [
        {
          lessonId: "shared-borrow-calibration",
          stepId: "shared-count-words",
        },
        {
          lessonId: "shared-borrow-calibration",
          stepId: "shared-has-suffix",
        },
      ],
    },
  ],
};

export const project: ProjectContract = {
  id: "number-guessing-result-message",
  title: "Number Guessing: komunikat wyniku",
  objective:
    "Zbuduj małą funkcję zamieniającą strzał i sekret w testowalny komunikat wyniku, a następnie wyjaśnij każdą granicę własności.",
  requiredBehaviors: [
    "Zwróć „correct” dla równych wartości i „try again” w przeciwnym razie.",
    "Zachowaj użyteczność String należącego do wywołującego po pomocniku tylko do odczytu.",
    "Przejdź świeży przypadek testowy bez korzystania z ujawnionego rozwiązania.",
  ],
  requiredEvidence: [
    "Dokładny wynik obu gałęzi.",
    "Naprawa przeniesionego String na podstawie kompilatora.",
    "Wyjaśnienie loggera bez clone.",
    "Odroczona odpowiedź o borrow i clone.",
  ],
  constraints: [
    "Stabilny Rust, edycja 2024.",
    "Bez zewnętrznych crate.",
    "Zachowanie deterministyczne i testowalne.",
    "Wariant adversarialny zabrania `.clone()` w loggerze tylko do odczytu.",
  ],
  lessonId: "number-guessing-transfer",
  adversarialLessonId: "adversarial-no-clone",
  adversarialInject:
    "Logger tylko do odczytu ma ograniczenie bez clone: rozpoznaj granicę własności zamiast dodawać `.clone()`.",
  retrospective: [
    "Która funkcja była właścicielem każdej wartości?",
    "Który dowód z kompilatora zmienił projekt?",
    "Kiedy jawne clone byłoby uzasadnione?",
    "Co odtworzysz po przerwie?",
  ],
};

export const reviewExercises: Record<string, LessonStep> = {
  "stack-heap": {
    id: "review-stack-heap",
    evidence: { version: 2, conceptIds: ["stack-heap"] },
    kind: "recall",
    title: "Powtórka: bufor i wiązanie",
    prompt:
      "Wiązanie Vec<u8> wskazuje bufor na stercie. Co przechowuje lokalnie i kto odpowiada za bufor?",
    solution:
      "Wiązanie przechowuje metadane Vec, a jego właściciel odpowiada za usunięcie bufora na stercie.",
    evaluator: {
      kind: "answer",
      accepted: [
        "metadata and owns the heap buffer",
        "vec metadata; its owner drops the heap buffer",
        "the owner drops the heap buffer",
        "metadane i właściciel bufora na stercie",
        "metadane Vec; właściciel zwalnia bufor na stercie",
        "właściciel zwalnia bufor na stercie",
      ],
      feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
    },
    evidenceKind: "recall",
  },
  "scope-drop": {
    id: "review-scope-drop",
    evidence: { version: 2, conceptIds: ["scope-drop"] },
    kind: "recall",
    title: "Powtórka: zakres",
    prompt:
      "String powstaje w wewnętrznym bloku i nie jest przenoszony. Kiedy zostanie usunięty?",
    solution: "Na końcu wewnętrznego bloku, gdy właściciel opuszcza zakres.",
    evaluator: {
      kind: "answer",
      accepted: [
        "at the end of the inner block",
        "when the owner leaves the inner scope",
        "at scope end",
        "na końcu wewnętrznego bloku",
        "gdy właściciel opuszcza wewnętrzny zakres",
        "na końcu zakresu",
      ],
      feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
    },
    evidenceKind: "recall",
  },
  "move-semantics": {
    id: "review-move-semantics",
    evidence: { version: 2, conceptIds: ["move-semantics"] },
    kind: "recall",
    title: "Powtórka: przeniesiony String",
    prompt:
      'Po `let label = String::from("x"); let moved = label;`, które wiązanie można wypisać?',
    solution:
      "Można wypisać tylko moved, bo String został przeniesiony z label.",
    evaluator: {
      kind: "answer",
      accepted: [
        "moved",
        "only moved",
        "the moved binding",
        "tylko moved",
        "przeniesione wiązanie moved",
      ],
      feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
    },
    evidenceKind: "recall",
  },
  "copy-semantics": {
    id: "review-copy-semantics",
    evidence: { version: 2, conceptIds: ["copy-semantics"] },
    kind: "recall",
    title: "Powtórka: krotka Copy",
    prompt:
      "Przewidź, czy oba wiązania zostaną wypisane w przykładzie z `(u8, bool)`.",
    code: 'fn main() {\n    let pair = (2u8, true);\n    let other = pair;\n    println!("{pair:?} {other:?}");\n}',
    solution:
      "Oba wiązania pozostają poprawne, bo krotka zawiera wyłącznie typy Copy.",
    evaluator: {
      kind: "answer",
      accepted: ["(2, true) (2, true)", "(2,true) (2,true)"],
      feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
    },
    evidenceKind: "recall",
    expectedStatus: "success",
  },
  "function-ownership": {
    id: "review-function-ownership",
    evidence: { version: 2, conceptIds: ["function-ownership"] },
    kind: "recall",
    title: "Powtórka: parametr własnościowy",
    prompt:
      "Sygnatura to `fn save(label: String)`. Co wywołanie robi z wiązaniem String wywołującego?",
    solution:
      "Własność przechodzi do save, więc wywołujący nie użyje wiązania, jeśli funkcja jej nie zwróci.",
    evaluator: {
      kind: "answer",
      accepted: [
        "moves ownership into save",
        "the string moves into the function",
        "caller cannot use it after the call",
        "własność przechodzi do save",
        "String zostaje przeniesiony do funkcji",
        "wywołujący nie może go użyć po wywołaniu",
      ],
      feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
    },
    evidenceKind: "recall",
  },
  "shared-borrow": {
    id: "review-shared-borrow",
    evidence: { version: 2, conceptIds: ["shared-borrow"] },
    kind: "recall",
    title: "Powtórka: pomocnik tylko do odczytu",
    prompt:
      "Wybierz parametr pomocnika, który czyta String i zostawia go użytecznym po wywołaniu.",
    choices: [
      {
        id: "borrow",
        label: "&str",
      },
      {
        id: "own",
        label: "String",
      },
    ],
    evaluator: {
      kind: "choice",
      correct: "borrow",
      explanations: {
        borrow:
          "Poprawnie: &str wystarcza do odczytu i zostawia String wywołującemu.",
        own: "String przejąłby własność, choć pomocnik nie musi jej przechowywać ani zwracać.",
      },
    },
    evidenceKind: "recall",
    solution: "Współdzielony wycinek daje odczyt bez przejmowania własności.",
  },
  "mutable-borrow": {
    id: "review-mutable-borrow",
    evidence: {
      version: 2,
      conceptIds: ["mutable-borrow"],
      codingTaskId: "ownership/recall-remove-trailing-mark",
    },
    kind: "recall",
    title: "Powtórka: usuń końcowy znak",
    prompt:
      "Odtwórz publiczną funkcję `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool`. Usuń dokładnie jeden końcowy znak, jeśli jest równy mark, i zwróć true. W przeciwnym razie pozostaw tekst bez zmian i zwróć false. Pusty tekst pozostaje pusty. Możesz sprawdzić dokumentację ends_with i pop. Kontrakt v2: zapisany szkic pozostaje; wcześniejsze append_mark trzeba dostosować do nowego API.",
    code: removeTrailingMarkContract.starter,
    solution: removeTrailingMarkContract.solution,
    evaluator: { kind: "tests", tests: removeTrailingMarkContract.tests },
    evidenceKind: "recall",
    expectedStatus: "success",
    hints: [
      "Porównaj ostatni znak z mark, również dla pustego tekstu.",
      "pop usuwa jeden znak Unicode; wynik bool musi opisywać rzeczywistą zmianę.",
    ],
  },
  "ownership-repair": {
    id: "review-ownership-repair",
    evidence: { version: 2, conceptIds: ["ownership-repair"] },
    kind: "recall",
    title: "Powtórka: napraw granicę odczytu",
    prompt:
      "`show` tylko odczytuje tekst, ale starter przenosi String i potem próbuje użyć go ponownie. Napraw granicę funkcji bez `.clone()`; testy sprawdzą także nowy komunikat.",
    code: 'fn main() {\n    let text = String::from("rust");\n    show(text);\n    println!("{text}");\n}\n\nfn show(value: String) {\n    println!("{value}");\n}',
    solution:
      'fn main() {\n    let text = String::from("rust");\n    show(&text);\n    println!("{text}");\n}\n\nfn show(value: &str) {\n    println!("{value}");\n}',
    evaluator: {
      kind: "tests",
      tests:
        '#[test]\nfn reads_without_consuming() {\n    for value in ["rust", "nowy komunikat"] {\n        let text = String::from(value);\n        show(&text);\n        assert_eq!(text, value);\n    }\n}',
      forbiddenPatterns: [".clone(", "Clone::clone("],
    },
    evidenceKind: "recall",
    expectedStatus: "compile-error",
    expectedError: "E0382",
    hints: [
      "show nie musi zostać właścicielem, bo tylko czyta wartość.",
      "Przekaż referencję i przyjmij pożyczony wycinek tekstu.",
    ],
  },
};

export const roadmap: { title: string; status: string }[] = [
  {
    title: "Konfiguracja, Cargo i pierwszy program",
    status: "planned",
  },
  {
    title: "Zmienne, mutowalność i sterowanie przepływem",
    status: "planned",
  },
  {
    title: "Struktury, enumi i obsługa błędów",
    status: "planned",
  },
  {
    title: "Kolekcje, traity i czasy życia",
    status: "planned",
  },
  {
    title: "Testy, współbieżność i projekty końcowe",
    status: "planned",
  },
];
