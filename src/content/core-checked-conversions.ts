import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

const byteStarter = `fn checked_byte(value: i32) -> Result<u8, std::num::TryFromIntError> {
    Ok(value as u8)
}
fn main() {}`;
const byteSolution = `fn checked_byte(value: i32) -> Result<u8, std::num::TryFromIntError> {
    u8::try_from(value)
}
fn main() {}`;
const byteTests = `#[test]
fn checked_byte_contract() {
    let convert: fn(i32) -> Result<u8, std::num::TryFromIntError> = checked_byte;
    for value in [0, 1, 254, 255] {
        assert_eq!(convert(value), Ok(value as u8), "valid {value}");
    }
    for value in [-1, i32::MIN, 256, i32::MAX] {
        assert!(convert(value).is_err(), "assertion failed: invalid {value}");
    }
}`;
const levelStarter = `#[derive(Debug, PartialEq)]
struct Level(u8);
#[derive(Debug, PartialEq)]
enum LevelError { InvalidNumber, OutOfRange(i32) }
impl TryFrom<i32> for Level {
    type Error = LevelError;
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value < 1 || value > 5 {
            Err(LevelError::OutOfRange(value))
        } else {
            Ok(Level(value as u8))
        }
    }
}
fn parse_level(text: &str) -> Result<Level, LevelError> {
    let value = text.parse::<i32>()?;
    Level::try_from(value)
}
fn main() {}`;
const levelSolution = levelStarter.replace(
  "fn parse_level",
  `impl From<std::num::ParseIntError> for LevelError {
    fn from(_: std::num::ParseIntError) -> Self {
        LevelError::InvalidNumber
    }
}
fn parse_level`,
);
const levelTests = `#[test]
fn level_contract() {
    for text in ["", "x", "2147483648", " 2 "] {
        let error = text.parse::<i32>().expect_err("maintained invalid integer fixture");
        let converted = <LevelError as From<std::num::ParseIntError>>::from(error);
        assert!(matches!(converted, LevelError::InvalidNumber));
    }
    for value in [1, 5] {
        let converted: Result<Level, LevelError> = <Level as TryFrom<i32>>::try_from(value);
        assert_eq!(converted, Ok(Level(value as u8)));
        let via_into: Result<Level, LevelError> = value.try_into();
        assert_eq!(via_into, Ok(Level(value as u8)));
    }
    for value in [i32::MIN, 0, 6, i32::MAX] {
        assert!(matches!(<Level as TryFrom<i32>>::try_from(value), Err(LevelError::OutOfRange(original)) if original == value));
        let via_into: Result<Level, LevelError> = value.try_into();
        assert!(matches!(via_into, Err(LevelError::OutOfRange(original)) if original == value));
    }
    assert_eq!(parse_level("2"), Ok(Level(2)));
    assert_eq!(parse_level("1"), Ok(Level(1)));
    assert_eq!(parse_level("5"), Ok(Level(5)));
    for text in ["", "x", "2147483648", " 2 "] {
        let result = std::panic::catch_unwind(|| parse_level(text));
        assert!(matches!(result, Ok(Err(LevelError::InvalidNumber))), "assertion failed: invalid syntax or panic {text:?}");
    }
    for (text, value) in [("-2147483648", i32::MIN), ("-1", -1), ("0", 0), ("6", 6), ("2147483647", i32::MAX)] {
        assert!(matches!(parse_level(text), Err(LevelError::OutOfRange(original)) if original == value), "assertion failed: range {text}");
    }
}`;
const percentSolution = `#[derive(Debug, PartialEq)]
struct Percent(u8);
#[derive(Debug, PartialEq)]
enum PercentError { BelowZero(i16), AboveHundred(i16) }
impl TryFrom<i16> for Percent {
    type Error = PercentError;
    fn try_from(value: i16) -> Result<Self, Self::Error> {
        if value < 0 {
            Err(PercentError::BelowZero(value))
        } else if value > 100 {
            Err(PercentError::AboveHundred(value))
        } else {
            Ok(Percent(value as u8))
        }
    }
}
fn main() {}`;
const percentTests = `#[test]
fn percent_contract() {
    for value in [0_i16, 1, 99, 100] {
        assert_eq!(<Percent as TryFrom<i16>>::try_from(value), Ok(Percent(value as u8)));
        let via_into: Result<Percent, PercentError> = value.try_into();
        assert_eq!(via_into, Ok(Percent(value as u8)));
    }
    for value in [i16::MIN, -1] {
        assert!(matches!(<Percent as TryFrom<i16>>::try_from(value), Err(PercentError::BelowZero(original)) if original == value));
        let via_into: Result<Percent, PercentError> = value.try_into();
        assert!(matches!(via_into, Err(PercentError::BelowZero(original)) if original == value));
    }
    for value in [101_i16, i16::MAX] {
        assert!(matches!(<Percent as TryFrom<i16>>::try_from(value), Err(PercentError::AboveHundred(original)) if original == value));
        let via_into: Result<Percent, PercentError> = value.try_into();
        assert!(matches!(via_into, Err(PercentError::AboveHundred(original)) if original == value));
    }
}`;
const countStarter = `#[derive(Debug, PartialEq)]
struct EvenCount(u8);
#[derive(Debug, PartialEq)]
enum CountError { OutOfRange(i16), Odd(i16) }
impl TryFrom<i16> for EvenCount {
    type Error = CountError;
    fn try_from(value: i16) -> Result<Self, Self::Error> {
        if value < 0 || value > 10 {
            Err(CountError::OutOfRange(value))
        } else {
            Ok(EvenCount(value as u8))
        }
    }
}
fn main() {}`;
const countSolution = countStarter.replace(
  "        } else {",
  `        } else if value % 2 != 0 {
            Err(CountError::Odd(value))
        } else {`,
);
const countTests = `#[test]
fn even_count_contract() {
    for value in [0_i16, 2, 10] {
        assert_eq!(<EvenCount as TryFrom<i16>>::try_from(value), Ok(EvenCount(value as u8)));
        let via_into: Result<EvenCount, CountError> = value.try_into();
        assert_eq!(via_into, Ok(EvenCount(value as u8)));
    }
    for value in [-2_i16, -1, 11, 12] {
        assert!(matches!(<EvenCount as TryFrom<i16>>::try_from(value), Err(CountError::OutOfRange(original)) if original == value));
        let via_into: Result<EvenCount, CountError> = value.try_into();
        assert!(matches!(via_into, Err(CountError::OutOfRange(original)) if original == value));
    }
    assert!(matches!(<EvenCount as TryFrom<i16>>::try_from(1), Err(CountError::Odd(1))));
    let odd: Result<EvenCount, CountError> = 1_i16.try_into();
    assert!(matches!(odd, Err(CountError::Odd(1))));
}`;
const standardRun = `fn main() {
    for value in [0_i32, 255, -1, 256] {
        match u8::try_from(value) {
            Ok(byte) => println!("{value}: Ok({byte})"),
            Err(_) => println!("{value}: Err"),
        }
    }
}`;
function evidence(step: LessonStep): LessonStep {
  return {
    ...step,
    evidence: {
      version: 2,
      conceptIds: ["checked-conversion-errors"],
      ...(step.evaluator?.kind === "tests" ? { codingTaskId: step.id } : {}),
    },
  };
}

export const coreCheckedConversionsCompetencies: Competency[] = [
  {
    id: "validate-conversion-inputs",
    title: "Sprawdzam dane wejściowe konwersji i zachowuję przyczynę błędu",
  },
];
export const coreCheckedConversionsConcepts: Concept[] = [
  {
    id: "checked-conversion-errors",
    title: "Konwersja z kontrolą i typ błędu",
    prerequisites: ["associated-output", "result-recoverable"],
    competencyIds: ["validate-conversion-inputs"],
    reviewPrompt: "Co opisuje TryFrom::Error i kiedy konwersja zwraca Err?",
    reviewAnswer:
      "Error to typ związany konkretnej implementacji TryFrom; Result zwraca wartość albo ten błąd, gdy dane nie spełniają kontraktu.",
    distinguish:
      "From opisuje konwersję bez błędu, TryFrom może zawieść, a AsRef udostępnia pożyczony widok. Rzutowanie as nie sprawdza kontraktu zakresu.",
    evidenceArtifact: "rust-code",
  },
];
export const coreCheckedConversionsSources: Source[] = [
  {
    id: "core-conversions-std-tryfrom",
    title: "Biblioteka standardowa: TryFrom",
    url: "https://doc.rust-lang.org/std/convert/trait.TryFrom.html",
    classification: "dynamic",
    reviewedAt: "2026-10-07",
    recheckPolicy:
      "Przy aktualizacji Rust sprawdź sygnaturę TryFrom::try_from, związany typ Error, implementacje liczbowe oraz blanket impl TryInto i TryFrom oparte na Into; przy zmianie API uruchom kontrakty na stable i MSRV.",
  },
];
export const coreCheckedConversionsLessons: Lesson[] = [
  {
    id: "checked-conversions",
    moduleId: "traits",
    conceptIds: ["checked-conversion-errors"],
    competencyIds: ["validate-conversion-inputs"],
    prerequisites: ["conversion-ownership-views"],
    title: "TryFrom: konwersja może zawieść",
    subtitle: "Zakres, typ związany Error i zachowanie przyczyny błędu",
    minutes: 20,
    outcomes: [
      "Odczytasz wejście, wynik i błąd z sygnatury TryFrom.",
      "Zaimplementujesz konwersję sprawdzającą granice i zachowującą niepoprawną wartość.",
      "Połączysz błąd parsowania z błędem domeny przez From i operator ?.",
    ],
    misconceptions: [
      "as sprawdza zakres — w rzeczywistości może obciąć wartość.",
      "Metoda o nazwie try_from wystarcza — wywołania traitu wymagają impl TryFrom.",
      "? ignoruje błąd — propaguje go i wymaga dostępnej konwersji typu błędu.",
      "unwrap jest walidacją — może zakończyć program paniką.",
    ],
    transferTask:
      "Od pustego edytora napisz TryFrom<i16> dla Percent zgodnie z podanym API i zachowaj dwie przyczyny odrzucenia.",
    evidenceGate:
      "Przejdź testy checked_byte, napraw brak From dla błędu parsowania i samodzielnie zaimplementuj Percent. Wyjaśnienie i quiz są uzupełnieniem tej praktyki z narzuconym API.",
    sourceIds: ["core-conversions-std-tryfrom"],
    steps: [
      evidence({
        id: "checked-predict",
        kind: "predict",
        title: "Rzutowanie a kontrola zakresu",
        prompt:
          "Przewidź wynik dla -1_i32 i 256_i32: najpierw value as u8, potem u8::try_from(value). Które wyniki sygnalizują błąd?",
        choices: [
          { id: "checked", label: "as daje 255 i 0; TryFrom daje Err dla obu" },
          { id: "both-errors", label: "Oba sposoby dają Err" },
          { id: "same", label: "Oba sposoby dają 255 i 0" },
        ],
        evaluator: {
          kind: "choice",
          correct: "checked",
          explanations: {
            checked:
              "as obcina do u8; TryFrom odrzuca obie wartości spoza 0..=255.",
            "both-errors":
              "as zwraca liczbę u8, nie Result, więc nie może zwrócić Err.",
            same: "TryFrom sprawdza zakres i zwraca Err zamiast obciętej liczby.",
          },
        },
        evidenceKind: "prediction",
      }),
      evidence({
        id: "checked-run",
        kind: "run",
        title: "Zobacz obie gałęzie Result",
        prompt:
          "Uruchom przykład. Wskaż dwie wartości na granicach zakresu oraz dwa odrzucenia. match obsługuje powodzenie i błąd bez paniki.",
        code: standardRun,
        solution: standardRun,
        evaluator: {
          kind: "exact-output",
          expected: "0: Ok(0)\n255: Ok(255)\n-1: Err\n256: Err\n",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
        explanation:
          "u8::try_from(i32) zwraca Result<u8, TryFromIntError>. Ten przykład pokazuje zachowanie standardowej konwersji; sam odczyt wyniku jest ekspozycją.",
      }),
      evidence({
        id: "checked-read-api",
        kind: "modify",
        title: "Odczytaj kontrakt i napraw checked_byte",
        prompt:
          "Lokalny wycinek API:\ntrait TryFrom<T>: Sized {\n    type Error;\n    fn try_from(value: T) -> Result<Self, Self::Error>;\n}\nŹródło: https://doc.rust-lang.org/std/convert/trait.TryFrom.html\nOdczytaj: czy jest odbiornik self, kto otrzymuje własność value, jaki jest typ wyniku i skąd pochodzi typ błędu? Następnie napraw dokładne API fn checked_byte(value: i32) -> Result<u8, std::num::TryFromIntError>. Przyjmij każdą wartość 0..=255 i zwróć Err poza zakresem, bez paniki. Zachowaj rzeczywisty standardowy typ błędu; rzutowanie startera jest błędne.",
        code: byteStarter,
        solution: byteSolution,
        hints: [
          "Sygnatura nie ma odbiornika self: jest to funkcja związana. Parametr value jest przekazywany przez wartość; i32 jest Copy. Self jest typem docelowym, a Error pochodzi z implementacji.",
          "Porównaj typ zwracany przez u8::try_from(value) z typem wymaganym przez checked_byte; samo Ok wokół as nie wykrywa odrzucenia.",
        ],
        evaluator: { kind: "tests", tests: byteTests },
        expectedStatus: "test-failure",
        evidenceKind: "transfer",
        evidenceGate: true,
      }),
      evidence({
        id: "checked-level-repair",
        kind: "debug",
        title: "Napraw konwersję błędu przy ?",
        prompt:
          "Starter nie kompiluje się (E0277): text.parse::<i32>() zwraca ParseIntError, a parse_level wymaga LevelError. Dodaj impl From<std::num::ParseIntError> for LevelError, mapując każdy błąd parsowania na InvalidNumber. Zachowaj impl TryFrom<i32> for Level z type Error = LevelError oraz fn parse_level(text: &str) -> Result<Level, LevelError>. Level przyjmuje wyłącznie 1..=5; poza zakresem zwraca OutOfRange z oryginalnym i32. Pusty tekst, litery, przepełnienie i tekst ze spacjami dają InvalidNumber; nie przycinaj tekstu. Testy wywołują trait i TryInto, nie tylko metodę o podobnej nazwie.",
        code: levelStarter,
        solution: levelSolution,
        hints: [
          "Odczytaj surową diagnostykę: ? próbuje przekształcić ParseIntError do typu błędu zwracanego przez funkcję. Wcześniej można było zrobić to ręcznie przez match.",
          "From ma fn from(error: ParseIntError) -> Self. Zwróć wariant błędu składni; zostaw kontrolę zakresu w TryFrom, aby zachować oryginalną liczbę.",
        ],
        evaluator: { kind: "tests", tests: levelTests },
        expectedStatus: "compile-error",
        expectedError: "E0277",
        evidenceKind: "fix",
        evidenceGate: true,
        explanation:
          "type Error wskazuje błąd konkretnej konwersji. ? zwraca błąd z funkcji i korzysta z From, gdy jego typ trzeba zmienić; nie zamienia błędu składni w błąd zakresu.",
      }),
      evidence({
        id: "checked-percent-transfer",
        kind: "blank",
        title: "Samodzielnie: Percent z dwiema przyczynami błędu",
        prompt:
          "Praktyka z narzuconym API, pusty edytor. Zdefiniuj struct Percent(u8) i enum PercentError { BelowZero(i16), AboveHundred(i16) }; dodaj Debug i PartialEq. Zaimplementuj TryFrom<i16> for Percent z type Error = PercentError i fn try_from(value: i16) -> Result<Self, Self::Error>. Przyjmij dokładnie 0..=100. Ujemne wejście zwraca BelowZero z tą samą liczbą, a większe niż 100 — AboveHundred z tą samą liczbą. Testy sprawdzą oba końce, skrajne i16, wywołanie traitu i TryInto. Nie dodawaj From<i16> dla Percent: konwersja jest zawodna, a From dla tej samej pary koliduje z blanket impl TryFrom. Dodaj fn main() {}.",
        solution: percentSolution,
        hints: [
          "Rozdziel trzy przypadki: poniżej zera, ponad sto i poprawny zakres. W błędzie przechowuj wejście przed rzutowaniem.",
          "Dopiero poprawna gałąź może utworzyć Percent z u8. Typ związany Error musi wskazywać enum; dzięki implementacji traitu dostępne będzie też TryInto.",
        ],
        evaluator: { kind: "tests", tests: percentTests },
        expectedStatus: "success",
        evidenceKind: "assessment",
        evidenceGate: true,
      }),
      evidence({
        id: "checked-explain",
        kind: "explain",
        title: "Uzasadnij wybór API",
        prompt:
          "Wyjaśnij, kiedy wybrać From, TryFrom i AsRef. Rozróżnij niepoprawną składnię liczby od poprawnej liczby spoza zakresu. Dlaczego as i unwrap nie spełniają tych kontraktów? To refleksja, a nie skompilowany dowód implementacji.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "From: konwersja bez błędu; TryFrom: Result z typem związanym Error.",
            "AsRef udostępnia pożyczony widok, nie waliduje nowej wartości domeny.",
            "Błąd składni/przepełnienia różni się od błędu zakresu; błąd zakresu zachowuje wejście.",
            "as może obciąć liczbę, a unwrap może spanikować zamiast zwrócić Err.",
          ],
        },
        evidenceKind: "self-rating",
      }),
      evidence({
        id: "checked-recall",
        kind: "recall",
        title: "Co oznacza Error?",
        prompt:
          "W sygnaturze TryFrom co określa type Error i jak try_from sygnalizuje odrzucenie?",
        choices: [
          {
            id: "associated",
            label:
              "Implementacja wybiera typ Error; try_from zwraca Err tego typu",
          },
          { id: "panic", label: "Error oznacza zawsze panikę" },
          { id: "string", label: "Error musi być String" },
        ],
        evaluator: {
          kind: "choice",
          correct: "associated",
          explanations: {
            associated:
              "Error jest typem związanym danej implementacji; Result rozdziela powodzenie i odrzucenie.",
            panic: "Err jest wartością do obsłużenia, nie paniką.",
            string:
              "Implementacja wybiera konkretny typ błędu, na przykład enum lub TryFromIntError.",
          },
        },
        evidenceKind: "recall",
      }),
    ],
  },
];
export const coreCheckedConversionsReviewExercises: Record<string, LessonStep> =
  {
    "checked-conversion-errors": evidence({
      id: "review-checked-conversion-errors",
      kind: "debug",
      title: "Powtórka: parzysty licznik",
      prompt:
        "Napraw niezależny kontrakt z narzuconym API: struct EvenCount(u8), enum CountError { OutOfRange(i16), Odd(i16) } i impl TryFrom<i16> for EvenCount z type Error = CountError. Przyjmij tylko parzyste wartości 0..=10. Najpierw sprawdź zakres: także -1 i 11 muszą zwrócić OutOfRange z oryginalnym wejściem. Nieparzysta liczba w zakresie zwraca Odd z wejściem. Zachowaj Debug i PartialEq; testy używają traitu oraz TryInto. Starter błędnie przyjmuje nieparzyste wartości w zakresie.",
      code: countStarter,
      solution: countSolution,
      hints: [
        "Odd dotyczy dopiero liczby, która mieści się w zakresie.",
        "Po odrzuceniu wartości spoza zakresu sprawdź resztę z dzielenia przez 2 i zachowaj wejście w odpowiednim wariancie.",
      ],
      evaluator: { kind: "tests", tests: countTests },
      expectedStatus: "test-failure",
      evidenceKind: "recall",
      evidenceGate: true,
    }),
  };
