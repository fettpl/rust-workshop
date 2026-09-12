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
        kind: "predict",
        title: "Przewidź liczbę",
        prompt:
          "Co zostanie wypisane? Wyjaśnij, gdzie znajdują się obie wartości całkowite.",
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
        kind: "run",
        title: "Uruchom przykład",
        prompt:
          "Najpierw przewidź wynik, potem uruchom przykład i porównaj obserwację.",
        code: 'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        solution:
          'fn main() {\n    let count = 2;\n    let next = count + 1;\n    println!("{next}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["3"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "memory-trace",
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
        rubric: ["Names drop.", "Connects drop to the owner leaving scope."],
      },
      {
        id: "memory-modify",
        kind: "modify",
        title: "Zmień wynik",
        prompt:
          "Zmień kod tak, aby wypisał warm zamiast cool, a następnie uruchom go.",
        code: 'fn main() {\n    let label = String::from("cool");\n    println!("{label}");\n}',
        solution:
          'fn main() {\n    let label = String::from("warm");\n    println!("{label}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["warm"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
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
    ],
    misconceptions: [
      "Wiązanie na stosie jest samą alokacją na stercie.",
      "Odczytanie wartości natychmiast ją usuwa.",
    ],
    transferTask:
      "Przewidź moment usunięcia String utworzonego w zagnieżdżonym bloku.",
    evidenceGate:
      "Ukończ jeden ślad i wyjaśnij sprzątanie wynikające z zakresu.",
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
    ],
    misconceptions: [
      "Każde przypisanie kopiuje dane głęboko.",
      "Copy i Clone to różne nazwy tego samego.",
    ],
    transferTask:
      "Bez uruchamiania sklasyfikuj przypisanie bool, String i Vec.",
    evidenceGate: "Napraw E0382 bez ujawniania rozwiązania opartego na clone.",
    sourceIds: ["rust-book-ownership", "rust-copy-trait"],
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
        kind: "run",
        title: "Uruchom wyrażenie",
        prompt: "Przewidź wartość wyrażenia blokowego i sprawdź ją.",
        code: 'fn main() {\n    let answer = {\n        let base = 40;\n        base + 2\n    };\n    println!("{answer}");\n}',
        solution:
          'fn main() {\n    let answer = {\n        let base = 40;\n        base + 2\n    };\n    println!("{answer}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["42"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "function-explain",
        kind: "explain",
        title: "Przeczytaj sygnaturę",
        prompt: "Jednym zdaniem wyjaśnij, co sygnatura obiecuje o własności.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "Wskazuje, że parametr String przejmuje własność od wywołującego.",
            "Wyjaśnia, że zwrot String przekazuje własność z powrotem do wywołującego.",
          ],
        },
        evidenceKind: "recall",
        evidenceGate: false,
      },
      {
        id: "function-transfer",
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
        kind: "debug",
        title: "Jedna ścieżka mutacji",
        prompt:
          "Uruchom celowo błędny kod. Który dostęp nakłada się na pożyczkę mutowalną? Napraw zakres lub kolejność dostępów, zachowując zmianę tekstu przez pożyczkę mutowalną. Program ma wypisać hi! dokładnie raz.",
        code: 'fn main() {\n    let mut text = String::from("hi");\n    let view = &text;\n    let edit = &mut text;\n    edit.push(\'!\');\n    println!("{view}");\n}',
        solution:
          'fn main() {\n    let mut text = String::from("hi");\n    let edit = &mut text;\n    edit.push(\'!\');\n    println!("{text}");\n}',
        evaluator: {
          kind: "exact-output",
          expected: "hi!\n",
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0502",
        evidenceGate: true,
        hints: [
          "Wskaż aktywny widok i edycję.",
          "Zakończ widok przed utworzeniem &mut.",
        ],
      },
      {
        id: "borrow-mutable-run",
        kind: "modify",
        title: "Zmień przez pożyczkę",
        prompt:
          "Zmień kod tak, aby dopisał wykrzyknik zamiast znaku zapytania.",
        code: 'fn main() {\n    let mut text = String::from("hi");\n    let edit = &mut text;\n    edit.push(\'?\');\n    println!("{text}");\n}',
        solution:
          'fn main() {\n    let mut text = String::from("hi");\n    let edit = &mut text;\n    edit.push(\'!\');\n    println!("{text}");\n}',
        evaluator: {
          kind: "answer",
          accepted: ["hi!"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
        hints: [
          "Znajdź push na referencji edit.",
          "Zmień argument push na wykrzyknik.",
        ],
      },
      {
        id: "borrow-explain",
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
        evidenceKind: "recall",
        evidenceGate: false,
      },
      {
        id: "borrow-transfer",
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
        kind: "run",
        title: "Uruchom komunikat wyniku",
        prompt: "Przewidź wynik dla poprawnego strzału i sprawdź go.",
        code: 'fn result_message(guess: u32, secret: u32) -> String {\n    if guess == secret { String::from("correct") } else { String::from("try again") }\n}\n\nfn main() {\n    println!("{}", result_message(7, 7));\n}',
        solution:
          'fn result_message(guess: u32, secret: u32) -> String {\n    if guess == secret { String::from("correct") } else { String::from("try again") }\n}\n\nfn main() {\n    println!("{}", result_message(7, 7));\n}',
        evaluator: {
          kind: "answer",
          accepted: ["correct"],
          feedback: "Porównaj odpowiedź z regułą własności i uzasadnij ją.",
        },
        evidenceKind: "prediction",
        expectedStatus: "success",
      },
      {
        id: "project-blank",
        kind: "blank",
        title: "Pusta kartka: napisz zachowanie",
        prompt:
          "Zbuduj od pustej kartki część gry zgadywania. Zaprojektuj funkcję, która porównuje zgadywaną liczbę z sekretem i zwraca posiadaną String: correct dla trafienia albo try again dla innego wyniku. W main pokaż oba przypadki, w tej kolejności, każdy w osobnej linii. Sam wybierz nazwę funkcji i typy. Nie używaj gotowych tekstów zamiast porównania liczb.",
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
        evidenceKind: "recall",
        evidenceGate: false,
      },
      {
        id: "project-check",
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
    ],
    misconceptions: [
      "Zwrócenie String oznacza jego pożyczenie.",
      "Argumenty u32 trzeba klonować, aby użyć ich ponownie.",
    ],
    transferTask:
      "Zastosuj te same decyzje własności w pomocniku komunikatu wyniku z nowym przypadkiem.",
    evidenceGate:
      "Implementacja od pustej kartki przechodzi obie gałęzie i zawiera naprawę.",
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
        kind: "blank",
        title: "Napisz najmniejszą implementację",
        prompt:
          "Napisz od zera program budujący komunikaty statusu. Samodzielnie zaprojektuj funkcję, która przyjmuje nazwę statusu i zwraca własną String. Dla dwóch nazw: ready i waiting, program ma wypisać osobne linie: status: ready oraz status: waiting. To samo zachowanie ma działać dla innych nazw. Nie podajemy nazw ani sygnatur funkcji.",
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
        evidenceKind: "recall",
        evidenceGate: false,
      },
      {
        id: "blank-transfer",
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
        evidenceKind: "transfer",
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
            '#[test]\nfn caller_keeps_ownership() {\n    for label in ["ok", "try again", ""] {\n        let message = String::from(label);\n        assert_eq!(show_result(&message), label.len());\n        assert_eq!(message, label);\n    }\n}',
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
        kind: "debug",
        title: "Napraw konflikt",
        prompt:
          "Wyjaśnij, dlaczego mutacja nie może nakładać się na widok współdzielony. Napraw zakres lub kolejność dostępu.",
        code: 'fn main() {\n    let mut result = String::from("try");\n    let view = &result;\n    result.push_str(" again");\n    println!("{view}");\n}',
        solution:
          'fn main() {\n    let mut result = String::from("try");\n    result.push_str(" again");\n    let view = &result;\n    println!("{view}");\n}',
        evaluator: {
          kind: "exact-output",
          expected: "try again\n",
        },
        evidenceKind: "fix",
        expectedStatus: "compile-error",
        expectedError: "E0502",
        evidenceGate: true,
        hints: [
          "Mutacja musi zakończyć się przed widokiem.",
          "Przenieś utworzenie view za push_str.",
        ],
      },
      {
        id: "adversarial-reason",
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
        evidenceKind: "recall",
        evidenceGate: false,
      },
      {
        id: "adversarial-trace",
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
            '#[test]\nfn measures_without_consuming() {\n    for label in ["new case", "Rust", ""] {\n        let text = String::from(label);\n        assert_eq!(measure(&text), label.len());\n        assert_eq!(text, label);\n    }\n}',
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
        kind: "explain",
        title: "Rozumuj, nie oceniaj się sam",
        prompt:
          "Wyjaśnij, dlaczego naprawa działa i jakie dowody mogłyby zmienić decyzję. Samoocena nie tworzy mastery.",
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
  ],
  exitGate: [
    "Przewidź niewidziany wynik move/Copy.",
    "Napraw E0382 bez ujawnionego rozwiązania.",
    "Użyj pożyczki do pracy tylko do odczytu.",
    "Wyjaśnij wybór bez clone w ocenie projektu.",
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
      label: "Własne wyjaśnienie decyzji własności",
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
      label: "Praca przez pożyczkę bez przejęcia własności",
      taskRefs: [
        { lessonId: "borrow-intro", stepId: "borrow-conflict" },
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
    kind: "recall",
    title: "Powtórka: napraw wyłączną edycję",
    prompt:
      "Kod nie kompiluje się, bo współdzielony widok i `&mut` nakładają się. Napraw go tak, aby `append_mark` modyfikowało tekst, a testy przeszły bez `.clone()`.",
    code: 'fn main() {\n    let mut text = String::from("hi");\n    let view = &text;\n    append_mark(&mut text);\n    println!("{view} {text}");\n}\n\nfn append_mark(text: &mut String) {\n    text.push(\'!\');\n}',
    solution:
      'fn main() {\n    let mut text = String::from("hi");\n    let view = &text;\n    println!("{view}");\n    append_mark(&mut text);\n    println!("{text}");\n}\n\nfn append_mark(text: &mut String) {\n    text.push(\'!\');\n}',
    evaluator: {
      kind: "tests",
      tests:
        '#[test]\nfn appends_for_new_input() {\n    for value in ["hi", "Rust"] {\n        let mut text = String::from(value);\n        append_mark(&mut text);\n        assert_eq!(text, format!("{value}!"));\n    }\n}',
      forbiddenPatterns: [".clone(", "Clone::clone("],
    },
    evidenceKind: "recall",
    expectedStatus: "compile-error",
    expectedError: "E0502",
    hints: [
      "Współdzielony widok musi skończyć się przed wyłączną mutacją.",
      "Przenieś odczyt view wcześniej albo usuń go, zanim wywołasz append_mark.",
    ],
  },
  "ownership-repair": {
    id: "review-ownership-repair",
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
