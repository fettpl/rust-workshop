import type { Concept, Lesson, LessonStep, Source } from "@/domain/types";
import {
  borrowedNumberContract,
  configContract,
  optionalReadingContract,
  rowsContract,
  readingsContract,
  retryReviewContract,
  flagsReviewContract,
} from "./fallible-composition-contracts";

export const fallibleCompositionSources: Source[] = [
  {
    id: "fallible-std-option",
    title: "Rust standard library: Option transformations",
    url: "https://doc.rust-lang.org/std/option/enum.Option.html",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Po zmianie przykładów sprawdź sygnatury, własność odbiorcy i stabilność map, and_then, as_ref, ok_or_else oraz transpose. Uruchom kontrakty na dokładnym Rust 1.85.0.",
  },
  {
    id: "fallible-std-result",
    title: "Rust standard library: Result transformations and FromIterator",
    url: "https://doc.rust-lang.org/std/result/enum.Result.html",
    classification: "stable",
    reviewedAt: "2026-10-10",
    recheckPolicy:
      "Po zmianie kontraktów sprawdź map, map_err, and_then i zatrzymanie FromIterator po błędzie. Uruchom kontrakty na dokładnym Rust 1.85.0.",
  },
];
export const fallibleCompositionConcepts: Concept[] = [
  {
    id: "fallible-value-composition",
    evidenceCalibration: { version: 1, minimumCodingTasks: 2 },
    title: "Kształt wyniku, pożyczka i jawna polityka błędu",
    prerequisites: [
      "optional-values",
      "result-recoverable",
      "checked-conversion-errors",
      "callable-contracts",
      "iterator-contracts",
    ],
    competencyIds: ["result-recovery", "compose-lazy-iterators"],
    reviewPrompt:
      "Dlaczego map może zagnieździć Option lub Result, a and_then zachowuje jeden poziom? Kiedy as_ref zachowa właściciela?",
    reviewAnswer:
      "map opakowuje dowolny wynik callbacku; callback zwracający Option<U> da więc Option<Option<U>>. and_then oczekuje callbacku zwracającego już Option<U> (lub Result<U, E>) i nie dokłada warstwy. as_ref daje Option<&T>, więc map zużywa widok z referencją, a właściciel zostaje. ok_or_else nadaje znaczenie brakowi, a map_err zmienia tylko błąd.",
    distinguish:
      "Brak, poprawne zero, niepoprawna składnia i wartość poza zakresem to osobne wyniki. Krótszy zapis nie ustala polityki odzyskiwania; unwrap może spanikować.",
  },
  {
    id: "fallible-iterator-contracts",
    evidenceCalibration: { version: 1, minimumCodingTasks: 2 },
    title: "Pierwszy błąd, tożsamość wiersza i granica pobierania",
    prerequisites: ["fallible-value-composition", "lazy-iterator-pipelines"],
    competencyIds: [
      "compose-lazy-iterators",
      "implement-iterator-contracts",
      "result-recovery",
    ],
    reviewPrompt:
      "Co różni collect do Result<Vec<T>, E> od filter_map(Result::ok)? Jak sprawdzisz, że źródło nie zostało pobrane po błędzie?",
    reviewAnswer:
      "collect do Result zbiera Ok w kolejności i zwraca pierwszy Err bez żądania kolejnego elementu. filter_map(Result::ok) zamienia Err na None i usuwa ten element, więc ukrywa błąd. Licznik w źródłowym iteratorze, obok callbacku w parserze, sprawdza faktyczne żądania. Dozwolone None wewnątrz Ok powinno zachować swoje miejsce w wyniku.",
    distinguish:
      "Samo zwrócenie pierwszego błędu nie dowodzi zatrzymania źródła. Zebranie wszystkich wyników przed wyborem błędu może już wykonać dalsze efekty. Jawna akumulacja błędów to inny kontrakt.",
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
    choices: answers.map((label, i) => ({ id: String(i), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((v, i) => [String(i), v]),
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
type Contract = { starter: string; solution: string; tests: string };
function task(
  id: string,
  kind: "modify" | "apply" | "blank" | "debug",
  title: string,
  prompt: string,
  contract: Contract,
  conceptId: string,
  family: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(kind === "blank" ? {} : { code: contract.starter }),
    solution: contract.solution,
    evaluator: { kind: "tests", tests: contract.tests },
    expectedStatus: "success",
    hints: [
      "Najpierw rozdziel warianty oraz ustal typ zwracany przez każdy etap. Możesz użyć match lub pętli.",
      family === "fallible/borrowed-number"
        ? "as_ref() tworzy Option<&String> bez przejęcia właściciela. W and_then parsuj tekst po trim i użyj ok(): brak oraz nieudane parsowanie celowo dają None, poprawne zero daje Some(0). Właściciel pozostaje dostępny do kolejnego wywołania."
        : "Zachowaj błąd i jego tożsamość; nie zastępuj go domyślną wartością. W potoku nie pobieraj następnego elementu po Err.",
    ],
    evidenceKind:
      kind === "blank" ? "assessment" : kind === "debug" ? "fix" : "transfer",
    evidenceGate: true,
    evidence: { version: 1, conceptIds: [conceptId], codingTaskId: family },
  };
}
function reflection(
  id: string,
  prompt: string,
  criteria: string[],
): LessonStep {
  return {
    id,
    kind: "explain",
    title: "Uzasadnij i oceń własne rozumowanie",
    prompt,
    evaluator: { kind: "rubric", criteria },
    rubric: criteria,
    evidenceKind: "self-rating",
    evidenceGate: false,
  };
}
const valueId = "fallible-value-composition",
  pipelineId = "fallible-iterator-contracts";
const valueTheory = `Migawka kontraktów std (zweryfikowana 10.10.2026; dostępna bez sieci). Dla Option<T>: map<U, F>(self, f: F) -> Option<U>, F: FnOnce(T) -> U; and_then<U, F>(self, f: F) -> Option<U>, F: FnOnce(T) -> Option<U>; as_ref(&self) -> Option<&T>; ok_or_else<E, F>(self, err: F) -> Result<T, E>, F: FnOnce() -> E. map/and_then wykonują callback tylko dla Some; ok_or_else tworzy błąd tylko dla None. Dla Result<T, E>: map<U, F>(self, f: F) -> Result<U, E>, F: FnOnce(T) -> U; and_then<U, F>(self, f: F) -> Result<U, E>, F: FnOnce(T) -> Result<U, E>; map_err<F, O>(self, op: O) -> Result<T, F>, O: FnOnce(E) -> F. map i and_then obsługują Ok, a map_err tylko Err. Wszystkie te zwykłe metody są stabilne od 1.0.0 (nie jest to obietnica użycia const). Odbiorca self jest zużywany: as_ref najpierw pożycza Option<String>, potem map zużywa Option<&String>. map callbacku zwracającego Result nadal dokłada warstwę: Result<Result<U, E>, E>. and_then wymaga zgodnego typu błędu; map_err może go wcześniej ujednolicić. unwrap nie definiuje odzyskiwania — dla niepowodzenia może panikować. Źródła w karcie lekcji prowadzą do aktualnego Option/Result; pełny kontrakt ćwiczeń jest tutaj.`;

export const fallibleCompositionLessons: Lesson[] = [
  {
    id: valueId,
    moduleId: "iterators",
    conceptIds: [valueId],
    competencyIds: ["result-recovery", "compose-lazy-iterators"],
    prerequisites: [
      "iterator-contracts",
      "result-and-recovery",
      "checked-conversions",
      "closure-contracts",
    ],
    title: "Option i Result: połącz wartości bez utraty znaczenia",
    subtitle: "Dobierz metodę do typu wyniku, właściciela i polityki błędu.",
    minutes: 30,
    outcomes: [
      "Wyjaśnisz zagnieżdżenie po map oraz wybór and_then.",
      "Zachowasz Option<String> przez pożyczony widok.",
      "Oddzielisz brak, zero, składnię i zakres, a potem zmienisz politykę w innej domenie.",
    ],
    sessionStops: [
      {
        afterStepId: "fallible-value-theory",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Napraw pożyczkę i zaimplementuj walidację. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "fallible-config-contract",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zmień politykę braku w odczycie temperatury. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      run(
        "fallible-match-discover",
        "Zacznij od znanego match",
        "Uruchom jawne rozdzielenie wariantów. Brak tekstu i nieudane parsowanie mają tutaj tę samą, celowo wybraną politykę Option; Some(0) pozostaje wartością. W następnych zadaniach nadamy błędom osobne znaczenie.",
        `fn number(text: Option<&str>) -> Option<u16> {
    match text { Some(text) => text.parse::<u16>().ok(), None => None }
}
fn main() { println!("{:?}|{:?}|{:?}", number(Some("0")), number(None), number(Some("x"))); }`,
        "Some(0)|None|None\n",
      ),
      choice(
        "fallible-nested-predict",
        "predict",
        "Przewidź warstwy wyniku",
        "Dla text: Option<&str>, jaki typ ma text.map(|s| s.parse::<u16>().ok())? Callback zwraca Option<u16>.",
        ["Option<Option<u16>>", "Option<u16>", "Result<u16, String>"],
        0,
        [
          "map opakowuje cały wynik callbacku w zewnętrzne Option.",
          "Ten typ uzyskasz przez and_then; map nie spłaszcza wyniku.",
          "map nie tworzy błędu Result z braku; tu callback zwraca Option.",
        ],
      ),
      run(
        "fallible-nested-observe",
        "Obserwuj Some(None) i spłaszczenie",
        "Porównaj map oraz and_then. Jawne adnotacje są sprawdzane przez kompilator. Some(None) przechowuje informację o obecnym, lecz nieparsowalnym tekście; and_then świadomie scala te dwa przypadki do None.",
        `fn main() {
    for text in [Some("0"), Some("x"), None] {
        let nested: Option<Option<u16>> = text.map(|s| s.parse::<u16>().ok());
        let flat: Option<u16> = text.and_then(|s| s.parse::<u16>().ok());
        println!("{nested:?}|{flat:?}");
    }
}`,
        "Some(Some(0))|Some(0)\nSome(None)|None\nNone|None\n",
      ),
      choice(
        "fallible-value-theory",
        "explain",
        "Czytaj wejście i wyjście callbacku",
        `${valueTheory}\n\nKtóry zapis pasuje do callbacku parse: &str -> Result<u16, E>, gdy odbiorca ma Result<&str, E>, a celem jest Result<u16, E>?`,
        ["map(parse)", "and_then(parse)", "map_err(parse)"],
        1,
        [
          "map da Result<Result<u16, E>, E>; wynik callbacku staje się wartością Ok.",
          "and_then przyjmuje callback zwracający Result z tym samym E i zachowuje jeden poziom.",
          "map_err dostaje E, a nie &str z Ok; zmienia błąd, nie parsuje wartości.",
        ],
      ),
      task(
        "fallible-owner-repair",
        "modify",
        "Zachowaj właściciela Option<String>",
        "Zaimplementuj fn borrowed_number(owner: &Option<String>) -> Option<u16>. Usuń otaczające białe znaki Unicode, parsuj u16. None oraz nieparsowalny tekst dają None, zero daje Some(0). Zachowaj właściciela do ponownego wywołania. Spróbuj as_ref().and_then(...); poprawny match też spełnia kontrakt. Tu świadomie nie rozróżniamy przyczyn niepowodzenia.",
        borrowedNumberContract,
        valueId,
        "fallible/borrowed-number",
      ),
      task(
        "fallible-config-contract",
        "apply",
        "Zwaliduj opcjonalną konfigurację",
        "Zachowaj enum ConfigError { Missing, Syntax, Range } i napisz fn parse_limit(text: Option<&str>) -> Result<u16, ConfigError>. None → Missing; otaczające białe znaki Unicode pomiń. Parsuj składnię u32: pustka, litery i minus → Syntax; przepełnienie parsera → Range. Poprawny u32 poza 0..=1000 → Range; zero jest poprawne. Użyj ok_or_else, map_err i and_then lub równoważnego match. Nie zamieniaj błędu na wartość domyślną.",
        configContract,
        valueId,
        "fallible/config-limit",
      ),
      run(
        "fallible-zero-counterexample",
        "Brak nie jest zerem",
        "Ten program kompiluje się i daje pozornie wygodny domyślny wynik. Wskaż utraconą informację: poniższy zapis jest kontrprzykładem dla konfiguracji, choć może pasować do innego, jawnie ustalonego kontraktu.",
        `fn main() {
    let missing: Option<u16> = None;
    let valid_zero = Some(0u16);
    println!("{}|{}", missing.unwrap_or(0), valid_zero.unwrap_or(0));
}`,
        "0|0\n",
      ),
      task(
        "fallible-optional-transfer",
        "apply",
        "Zmień domenę i politykę braku",
        "Temperatura jest opcjonalnym odczytem, a nie wymaganą konfiguracją. Zachowaj enum ReadingError { Syntax, Range }. Napisz fn optional_reading(text: Option<&str>) -> Result<Option<i16>, ReadingError>: None → Ok(None); obecne i16 w -20..=50 → Ok(Some(value)), w tym zero. Usuń białe znaki Unicode; błędna składnia → Syntax; przepełnienie i16 lub wartość poza zakresem → Range. Option<Result<T,E>>::transpose() -> Result<Option<T>,E> (stabilne od 1.33.0) zachowuje brak jako sukces i przenosi obecny błąd na zewnątrz. Możesz też użyć match. Pusty obecny tekst nie jest brakiem.",
        optionalReadingContract,
        valueId,
        "fallible/optional-temperature",
      ),
      reflection(
        "fallible-value-rationale",
        "Własnymi słowami porównaj właściciela przed i po as_ref/map oraz brak konfiguracji z brakiem temperatury. Odnieś map i and_then do typów callbacku. To samoocena rozumowania; aplikacja nie sprawdza automatycznie prawdziwości wypowiedzi.",
        [
          "Nazywam właściciela Option<String> i odróżniam go od zużywanego Option<&String>.",
          "Wyjaśniam zagnieżdżenie map i warunek wyjścia callbacku and_then.",
          "Rozróżniam Missing, Syntax, Range, poprawne zero i dozwolone Ok(None).",
        ],
      ),
    ],
    misconceptions: [
      "map automatycznie spłaszcza Option lub Result zwrócone przez callback.",
      "None zawsze można zastąpić zerem bez zmiany kontraktu.",
      "Krótszy zapis wystarczy, by uzasadnić politykę błędu.",
    ],
    transferTask:
      "Przenieś wymaganą konfigurację do opcjonalnej temperatury z zachowaniem błędów obecnego tekstu.",
    evidenceGate:
      "Testy sprawdzają funkcje, granice i zachowanie właściciela; rationale jest samooceną.",
    sourceIds: ["fallible-std-option", "fallible-std-result"],
  },
  {
    id: pipelineId,
    moduleId: "iterators",
    conceptIds: [pipelineId],
    competencyIds: [
      "compose-lazy-iterators",
      "implement-iterator-contracts",
      "result-recovery",
    ],
    prerequisites: [valueId],
    title: "Potok fallible: zachowaj pierwszy błąd i kolejność",
    subtitle:
      "Zdecyduj, czy niepowodzenie zatrzymuje pracę, a potem sprawdź żądania źródła.",
    minutes: 30,
    outcomes: [
      "Zbierzesz Result w kolejności bez cichego usuwania błędów.",
      "Zwrócisz pozycję i identyfikator pierwszego błędnego wiersza.",
      "Zachowasz dozwoloną nieobecność i zakończysz pobieranie dokładnie po błędzie.",
    ],
    sessionStops: [
      {
        afterStepId: "fallible-collect-theory",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zbuduj potok i sprawdź źródło. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "fallible-rows-contract",
        title: "Opcjonalna przerwa — wróć do tego miejsca",
        nextGoal:
          "Zachowaj nieobecne temperatury w wyniku. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    steps: [
      choice(
        "fallible-collect-predict",
        "predict",
        "Odkryj granicę pobierania",
        'Źródło daje [Ok(7), Err("B"), Ok(0)]. Potok map rejestruje każdą pobraną pozycję, po czym collect::<Result<Vec<_>, _>>() zbiera wyniki. Co zwróci i ile pozycji odwiedzi? Wcześniejsze collect do Vec zbierało cały potok; tutaj typ docelowy zmienia kontrakt.',
        [
          'Err("B"), dwie pozycje',
          "Ok(vec![7, 0]), trzy pozycje",
          'Err("B"), trzy pozycje',
        ],
        0,
        [
          "Konsument Result kończy na pierwszym Err, bez żądania kolejnego elementu.",
          "Takie usunięcie Err wymagałoby jawnego filtrowania; collect do Result go nie wykonuje.",
          "Zwrócenie pierwszego błędu jest poprawne, ale pobranie trzeciej pozycji narusza ten kontrakt.",
        ],
      ),
      run(
        "fallible-collect-observe",
        "Porównaj błąd i ciche filtrowanie",
        "Uruchom obie strategie. Licznik jest w źródłowym inspect, więc mierzy żądania iteratora. Druga strategia świadomie usuwa Err i traci informację B; nie spełnia zadania wymagającego walidacji wszystkich otrzymanych wierszy do pierwszego błędu.",
        `fn main() {
    let rows = [Ok(7), Err("B"), Ok(0)];
    let mut requested = 0;
    let checked: Result<Vec<_>, _> = rows.into_iter().inspect(|_| requested += 1).collect();
    println!("{checked:?}|{requested}");
    let kept: Vec<_> = rows.into_iter().filter_map(Result::ok).collect();
    println!("{kept:?}");
}`,
        'Err("B")|2\n[7, 0]\n',
      ),
      choice(
        "fallible-collect-theory",
        "explain",
        "Ustal politykę błędu przed adapterem",
        "Migawka std: FromIterator<Result<A,E>> for Result<V,E>, gdzie V: FromIterator<A> (stabilne od 1.0.0), zbiera Ok do V i zwraca pierwszy Err; po nim nie pobiera dalszych elementów. Pusty potok daje Ok(pusty V). Vec zachowuje kolejność i duplikaty. Result::ok(self) -> Option<T> (od 1.0.0) usuwa E; filter_map opuszcza None. Ok(None) to udany element z nieobecną wartością, więc collect do Result<Vec<Option<T>>,E> zachowuje jego pozycję. Akumulacja wszystkich błędów wymaga osobnego jawnego kontraktu i przejścia po dalszych wierszach. Która polityka pasuje do importu, który musi zgłosić pierwszą wadliwą pozycję bez dalszego pobierania?",
        [
          "filter_map(Result::ok)",
          "collect::<Result<Vec<_>, _>>() z błędem zawierającym tożsamość wiersza",
          "Najpierw collect do Vec<Result<_,_>>, potem znajdź Err",
        ],
        1,
        [
          "Usuwa błędy zamiast zgłosić pierwszy; może stworzyć niepełny import wyglądający na sukces.",
          "Błąd niesie pozycję i id; konsument Result zatrzyma żądania na tym błędzie.",
          "Pierwszy błąd można później znaleźć, ale źródło zostało już w całości pobrane.",
        ],
      ),
      task(
        "fallible-rows-contract",
        "modify",
        "Zgłoś pierwszy błędny wiersz",
        "Zachowaj ConfigError, RowError { index: usize, id: String, kind: ConfigError } i dostarczony parse_limit. Zaimplementuj fn parse_rows<'a,I,F>(rows:I, observed:F) -> Result<Vec<u16>,RowError>, gdzie I: IntoIterator<Item=(&'a str,&'a str)>, F: FnMut(&str). Każda para to (id, tekst); index jest od zera. Wywołaj observed(id) dokładnie raz dla każdego pobranego wiersza, także błędnego. Zachowaj kolejność i duplikaty; po pierwszym błędzie nie żądaj następnego elementu i nie wywołuj callbacku. Pustka daje Ok(vec![]). Poprawny map/collect lub pętla przechodzi te same testy.",
        rowsContract,
        pipelineId,
        "fallible/required-rows",
      ),
      run(
        "fallible-eager-counterexample",
        "Poprawny Err, zbyt późne zatrzymanie",
        "Ten kompilujący się kontrprzykład zachowuje błąd B, ale łamie obietnicę źródła: wcześniejsze Vec już pobrało trzeci element. Porównaj wynik z licznikiem, nie tylko z samym Err.",
        `fn main() {
    let mut requested = 0;
    let pending: Vec<Result<u16, &str>> = [Ok(7), Err("B"), Ok(0)].into_iter().inspect(|_| requested += 1).collect();
    let result: Result<Vec<_>, _> = pending.into_iter().collect();
    println!("{result:?}|{requested}");
}`,
        'Err("B")|3\n',
      ),
      task(
        "fallible-readings-transfer",
        "apply",
        "Zachowaj nieobecny odczyt jako pozycję",
        "Zachowaj ReadingError, ReadingRowError { index: usize, id: String, kind: ReadingError } i dostarczony optional_reading. Zaimplementuj fn parse_readings<'a,I,F>(rows:I, observed:F) -> Result<Vec<Option<i16>>,ReadingRowError>, gdzie I: IntoIterator<Item=(&'a str,Option<&'a str>)>, F: FnMut(&str). None oznacza brak pomiaru i daje element None w wyniku, nie usunięcie wiersza. Some(\"\") jest błędem Syntax. Obowiązuje zakres -20..=50 oraz parser overflow → Range. Kolejność, duplikaty, index od zera i id błędu pozostają; callback raz na pobrany wiersz, także None/błąd. Pierwszy błąd kończy żądania źródła. Pustka daje Ok(vec![]).",
        readingsContract,
        pipelineId,
        "fallible/optional-rows",
      ),
      task(
        "fallible-readings-blank",
        "blank",
        "Od pustego edytora: ten sam jawny kontrakt API",
        "To alternatywa bez startera do poprzedniego zadania, nie nowa rodzina umiejętności ani otwarty projekt. Napisz enum ReadingError { Syntax, Range }, struct ReadingRowError { index: usize, id: String, kind: ReadingError } z #[derive(Debug, PartialEq)] oraz fn parse_readings<'a,I,F>(rows:I, observed:F) -> Result<Vec<Option<i16>>,ReadingRowError>, I: IntoIterator<Item=(&'a str,Option<&'a str>)>, F: FnMut(&str). Możesz dodać helper optional_reading. None zachowuje miejsce; obecny tekst trim Unicode, parsowanie i16; błędna składnia → Syntax, przepełnienie lub liczba poza -20..=50 → Range. Poprawne zero to Some(0). Zachowaj kolejność/duplikaty. Callback raz na pobrany wiersz; pierwszy Err z index od zera i id zatrzymuje źródło. Dodaj fn main() {}. Testy akceptują także poprawną pętlę/match.",
        readingsContract,
        pipelineId,
        "fallible/optional-rows",
      ),
      choice(
        "fallible-policy-recall",
        "recall",
        "Inna polityka wymaga innego kontraktu",
        "Raport audytowy ma zachować każdą wadliwą pozycję i wszystkie dobre rekordy, zamiast zatrzymać się na pierwszym błędzie. Co trzeba zmienić?",
        [
          "Pozostawić collect do Result i obiecać wszystkie błędy",
          "Użyć filter_map(Result::ok), bo błędów nie trzeba przechowywać",
          "Jawnie akumulować sukcesy i błędy z tożsamością, pobierając całe źródło",
        ],
        2,
        [
          "Result-collect zatrzymuje się na pierwszym Err; nie zbiera pozostałych błędów.",
          "Raport potrzebuje błędnych pozycji, a Result::ok usuwa ich informacje.",
          "To oddzielny, jawny kontrakt raportu; dalsze pobieranie jest teraz zamierzone.",
        ],
      ),
      reflection(
        "fallible-pipeline-rationale",
        "Wyjaśnij, dlaczego None w temperaturach zachowuje pozycję, a Err zatrzymuje źródło. Wskaż, który test odróżnia zwrócenie pierwszego błędu od zatrzymania pobierania. To samoocena, nie automatyczny dowód rozumienia.",
        [
          "Odróżniam Ok(None), Ok(Some(0)) i Err z tożsamością wiersza.",
          "Uzasadniam kolejność i duplikaty oraz brak filter_map(Result::ok).",
          "Wskazuję licznik inspect w źródle i brak żądania po błędzie; callback sam nie wystarczy.",
        ],
      ),
    ],
    misconceptions: [
      "Result::ok naprawia błędne dane i zachowuje przyczynę błędu.",
      "Sam wynik Err dowodzi, że źródło nie pobrało dalszych elementów.",
      "Dozwolony nieobecny odczyt można usunąć z wyniku bez zmiany pozycji.",
    ],
    transferTask:
      "Zmień wymagane liczby na opcjonalne temperatury, zachowując pozycje None i granicę żądań.",
    evidenceGate:
      "Testy obserwują wyniki, tożsamość błędu i faktyczne żądania źródła; rationale jest samooceną.",
    sourceIds: ["fallible-std-option", "fallible-std-result"],
  },
].map((lesson) => ({
  ...lesson,
  steps: lesson.steps.map((step) => ({
    ...step,
    evidence: step.evidence ?? {
      version: 1,
      conceptIds: [...lesson.conceptIds],
    },
  })),
}));
function review(...args: Parameters<typeof task>): LessonStep {
  return {
    ...task(...args),
    code: "",
    kind: "recall",
    evidenceKind: "recall",
    evidenceGate: false,
  };
}
export const fallibleCompositionReviewExercises: Record<string, LessonStep> = {
  [valueId]: review(
    "review-fallible-retry-delay",
    "blank",
    "Powtórka: wynik transportu i opóźnienie",
    'Zmieniona domena i kształt wejścia: napisz fn retry_delay(input: Result<u16,&str>) -> Result<u16,String>. Err(message) → Err(format!("transport: {message}")); Ok(delay) dla 0..=30 → Ok(delay * 2); większy delay → Err(String::from("delay-range")) przed mnożeniem. Zero jest poprawne. Nie wprowadzaj domyślnego sukcesu po błędzie. Dodaj fn main() {}. Poprawny match też przechodzi testy.',
    retryReviewContract,
    valueId,
    "fallible/review-retry-delay",
  ),
  [pipelineId]: review(
    "review-fallible-flags",
    "blank",
    "Powtórka: opcjonalne flagi importu",
    'Napisz fn parse_flags(rows: &[(&str,Option<&str>)]) -> Result<Vec<Option<bool>>,String>. Para to (id, tekst). None zachowaj jako None; po trim Unicode tylko yes → Some(true), no → Some(false). Każdy inny obecny tekst, także pusty, daje Err(format!("flag: {id}")) dla pierwszego błędnego wiersza. Zachowaj kolejność, duplikaty i false; pustka → Ok(vec![]). Ten kontrakt ocenia wynik i pierwszy błąd, nie obiecuje pomiaru żądań źródła. Dodaj fn main() {}.',
    flagsReviewContract,
    pipelineId,
    "fallible/review-optional-flags",
  ),
};
