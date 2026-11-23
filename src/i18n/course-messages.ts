export const courseMessages: Readonly<Record<string, string>> = {
  "Podaj odpowiedź albo uruchom ćwiczenie, aby je zweryfikować.":
    "Enter an answer or run the exercise to check your work.",
  "Dane wyjściowe są zgodne.": "The output matches.",
  "Dane wyjściowe nie są jeszcze zgodne z oczekiwaniem.":
    "The output does not match yet.",
  "Kod skompilował się poprawnie.": "The code compiled successfully.",
  "Kod nie skompilował się poprawnie.":
    "The code did not compile successfully.",
  "brak kryterium": "no criterion",
  "Brakuje niepustego zestawu testów.": "A nonempty test suite is required.",
  "Wszystkie testy zakończyły się powodzeniem.": "All tests passed.",
  "Testy nie zakończyły się powodzeniem.": "The tests did not pass.",
  "Ta odpowiedź jest zaakceptowana.": "This answer is accepted.",
  "Poprawnie.": "Correct.",
  "Ta odpowiedź nie jest jeszcze poprawna.": "This answer is not correct yet.",
  "Kolejność jest poprawna.": "The order is correct.",
  "Spróbuj ponownie, sprawdzając zależności między krokami.":
    "Try again and check which steps depend on each other.",
  "Sprawdziłeś każde kryterium. Potwierdź wyjaśnienie dowodem w kodzie.":
    "You checked every criterion. Support your explanation with evidence from the code.",
  "Dodaj własne, niepuste wyjaśnienie i zaznacz każde kryterium.":
    "Write an explanation in your own words and check every criterion.",
  "nieznany błąd": "unknown error",
  "Manifest TOML jest zbyt złożony.": "The TOML manifest is too complex.",
  "Manifest TOML jest zbyt głęboki.": "The TOML manifest is nested too deeply.",
  "Klucz TOML ma niedozwoloną długość.": "The TOML key has an invalid length.",
  "Wartość tekstowa TOML jest zbyt długa.":
    "The TOML string value is too long.",
  "Manifest TOML musi być tekstem.": "The TOML manifest must be text.",
  "Manifest TOML jest zbyt długi.": "The TOML manifest is too long.",
  "Manifest TOML musi zawierać tabelę główną.":
    "The TOML manifest must contain a root table.",
  "Kontrakt zawiera niepoprawne twierdzenie.":
    "The contract contains an invalid assertion.",
  "Kontrakt zawiera niepoprawne wykluczenie zależności.":
    "The contract contains an invalid dependency exclusion.",
  "Kontrakt zawiera niepoprawną ścieżkę.":
    "The contract contains an invalid path.",
  "Kontrakt zawiera zbyt długą wartość tekstową.":
    "The contract contains a string value that is too long.",
  "Kontrakt zawiera niepoprawną wartość.":
    "The contract contains an invalid value.",
  "Kontrakt zawiera niepoprawny tryb tablicy.":
    "The contract contains an invalid array comparison mode.",
  "Kontrakt zawiera niepoprawną zależność.":
    "The contract contains an invalid dependency.",
  "Zależność workspace nie może wymagać pola optional.":
    "A workspace dependency cannot require the optional field.",
  "Kontrakt zawiera niepoprawne przekazywanie feature.":
    "The contract contains invalid feature forwarding.",
  "Kontrakt zawiera nieznany typ twierdzenia.":
    "The contract contains an unknown assertion type.",
  "Kontrakt manifestu ma niepoprawny dokument.":
    "The manifest contract specifies an invalid document type.",
  "Kontrakt manifestu nie może być pusty.":
    "The manifest contract must contain at least one assertion.",
  "Kontrakt manifestu zawiera zbyt wiele twierdzeń.":
    "The manifest contract contains too many assertions.",
  "Oczekiwano poprawnego manifestu korzenia workspace.":
    "Expected a valid workspace root manifest.",
  "Oczekiwano tabeli package w manifeście.":
    "Expected a package table in the manifest.",
  "Manifest nie spełnia jeszcze wszystkich wymagań kontraktu.":
    "The manifest does not yet meet every requirement of the contract.",
  "Manifest spełnia kontrakt deklaracji.":
    "The manifest declarations satisfy the contract.",
  "Zweryfikowane, samodzielne przypomnienie po ponad 24 godzinach.":
    "Verified independent recall after more than 24 hours.",
  "Dwa różne, samodzielne zadania bramkujące lub transferowe zakończone powodzeniem.":
    "You completed two different gate or transfer tasks independently.",
  "Samodzielne zadanie bramkujące lub transferowe zakończone powodzeniem.":
    "You completed a gate or transfer task independently.",
  "Zweryfikowane ćwiczenie zakończone.": "You completed a verified exercise.",
  "Kontakt z przykładem; samodzielność potwierdzą kolejne zadania.":
    "You viewed the example. Later tasks will test whether you can solve it independently.",
  "Zapisany poziom historyczny; brak bieżących zweryfikowanych dowodów.":
    "This level comes from your saved history. It has no current verified evidence.",
  "Brak zweryfikowanych dowodów.": "No verified evidence yet.",
  "Historia zapisanego poziomu pozostaje zachowana; bieżące potwierdzenie wymaga zweryfikowanych dowodów.":
    "Your saved level remains in the history. Verified evidence is required to confirm your current level.",
  "Samodzielne rozwiązanie kodowe odtworzone po ponad 24 godzinach.":
    "You reproduced a coding solution independently after more than 24 hours.",
  "Potwierdzone w jednym samodzielnym zadaniu kodowym bez podpowiedzi.":
    "Confirmed by one independent coding task completed without hints.",
  "Potwierdzone w różnych zadaniach kodowych bez podpowiedzi.":
    "Confirmed by different coding tasks completed without hints.",
  "Praktyka wymaga jeszcze różnych niezależnych rozwiązań kodowych.":
    "Complete more distinct coding tasks independently to confirm this level.",
  "Historia kontaktu pozostaje zapisana; bieżące potwierdzenie wymaga nowych dowodów kodowych.":
    "Your previous exposure is in the history. New coding evidence is required to confirm the current level.",
  "Brak bieżących zweryfikowanych dowodów.": "No current verified evidence.",
  "Nieudany dowód dodany do powtórki.":
    "The unsuccessful attempt was added to your review queue.",
  "Pierwsza powtórka zaplanowana za około 24 godziny.":
    "The first review is scheduled in about 24 hours.",
  "Samodzielne odtworzenie zaliczone; następna powtórka odsunięta.":
    "You passed the independent recall exercise. The next review was moved later.",
  "Powtórka zaliczona; kolejna zaplanowana za około 24 godziny.":
    "You passed the review. The next one is scheduled in about 24 hours.",
  "Powtórka zaplanowana.": "Review scheduled.",
  "Jeszcze raz: powtórka jest wymagana teraz.": "Again: review is due now.",
  "Język, ownership i abstrakcja": "Language, ownership and abstraction",
  "Współbieżność i usługi": "Concurrency and services",
  "Biblioteki, Cargo i API": "Libraries, Cargo and APIs",
  "Testowanie, wydajność i bezpieczeństwo": "Testing, performance and safety",
  Podstawy: "Core",
  "Core17: początkujący rdzeń do Log Analyzera. Oryginalny zakres obejmuje też Mini grep, wątki z Arc/Mutex i własny projekt końcowy.":
    "Core17 takes beginners through Log Analyzer. The original scope also includes Mini grep, threads with Arc/Mutex, and a final project of your own.",
  Rozszerzenia: "Extensions",
  "Dalsze moduły według problemów. Oryginalna kontynuacja: Mini grep oraz Box → Rc/Weak → wątki → kanały → Arc/Mutex; pozostałe specjalizacje wybierasz.":
    "Further modules grouped by topic. The original continuation covers Mini grep and Box → Rc/Weak → threads → channels → Arc/Mutex. Choose the remaining specializations yourself.",
  "Cały kurs": "Full course",
  "Wszystkie moduły w pełnej kolejności katalogu.":
    "All modules in catalog order.",
  "Otwórz własny Study Session CLI": "Open your own Study Session CLI",
  "Pierwsza wersja — decyzja projektowa": "First version — design decision",
  "Kto jest właścicielem nazw w raporcie? Uzasadnij wybór struktury danych. Wskaż, gdzie Twój kod odróżnia błędny rekord od błędu odczytu pliku. Zapisz, z jakiej dokumentacji lub pomocy korzystasz.":
    "Who owns the names in the report? Explain your choice of data structure. Point out where your code distinguishes an invalid record from a file read error. Record any documentation or help you use.",
  "Pierwsza wersja — własny test": "First version — your own test",
  "Pokaż własny test błędnego rekordu oraz agregacji z kolejnością, jego wynik i nieudany test, który zmienił Twoją decyzję.":
    "Show your own test covering an invalid record and ordered aggregation, its result, and a failing test that changed your decision.",
  "Pierwsza wersja — rzeczywiste wyniki CLI":
    "First version — actual CLI results",
  "Wklej faktycznie wykonane polecenia, wejście, stdout, stderr i kod wyjścia dla pliku poprawnego i mieszanego. Jeśli jeszcze ich nie uruchomiono, zapisz to wprost.":
    "Paste the commands you ran, their input, stdout, stderr, and exit code for a valid file and a mixed file. If you have yet to run them, say so.",
  "Po przeglądzie — test regresji zmiany":
    "After review — regression test for the change",
  "Zapisz wynik pierwszej samooceny lub przeglądu zewnętrznego oraz wcześniejszy kontakt ze zmianą. Pokaż własny kontrakt --min-total N, test nowego filtra i test zachowania starego wywołania, diagnostyki oraz kodów wyjścia wraz z wynikami.":
    "Record the outcome of the first self-assessment or external review and any prior exposure to the change. Show your `--min-total N` contract, a test for the new filter, and a test that checks the old invocation, diagnostics, and exit codes. Include the results.",
  "Po przeglądzie — pozostała granica": "After review — remaining limitation",
  "Opisz, co po zmianie pozostaje niesprawdzone, i jaki kolejny test lub obserwacja pozwoli to sprawdzić.":
    "Describe what remains unverified after the change and which test or observation would verify it.",
  "zakres zakończony": "scope ended",
  "first i second": "first and second",
  brak: "none",
  "[start] oraz !2:brak pliku": "`[start]` and `!2:brak pliku`",
  "Plain ma name zwracające start i korzysta z domyślnego label dającego [NAME]. Alert nadpisuje label wynikiem !2:brak pliku. Co wypiszą kolejno plain.label() i alert.label()?":
    "Plain has a name method that returns `start` and uses the default label format `[NAME]`. Alert overrides label to return `!2:brak pliku`. What do plain.label() and alert.label() print, in order?",
  "`fn main()`, a potem Witaj, Rust!": "`fn main()`, then `Witaj, Rust!`",
  "miasto: Łódź, potem po wywołaniu: Łódź":
    "`miasto: Łódź`, then `po wywołaniu: Łódź`",
  "Tylko miasto: Łódź; city znika po utworzeniu closure":
    "Only `miasto: Łódź`. The city binding becomes unavailable after the closure is created.",
};

export const polishRecheckPolicies: Readonly<Record<string, string>> = {
  "Recheck raw slice preconditions and empty-range policy when the contract changes.":
    "Sprawdzaj warunki wstępne surowych wycinków i regułę dla pustych zakresów po zmianie kontraktu.",
  "Recheck initialization and drop rules when the slot fixture changes.":
    "Sprawdzaj reguły inicjalizacji i drop po zmianie przykładu z miejscem na wartość.",
  "Recheck variance examples and mutable-reference invariance.":
    "Sprawdzaj przykłady wariancji i inwariancję referencji mutowalnych.",
  "Recheck auto-trait derivation and negative clients.":
    "Sprawdzaj wyprowadzanie auto-traitów i przypadki klientów, których kod ma się nie kompilować.",
};

export const englishSolutionNotes: Readonly<Record<string, string>> = {
  "outer — jego zakres jeszcze się nie zakończył.": "outer is still in scope.",
  "Użyj `&String` albo `&str` i sprawdź, że wywołujący może wypisać oryginał po wywołaniu pomocnika.":
    "Use `&String` or `&str` and check that the caller can print the original after calling the helper.",
  "Zachowaj dokładną prawą część po separatorze, sprawdzając tylko, czy nie jest pusta po trim.":
    "Keep the exact text to the right of the separator. Use trim only to check whether it is empty.",
  "Najpierw odetnij zakończenie linii i zwaliduj; błąd zwiększa malformed, a poprawny rekord dopiero potem przechodzi przez filtr i licznik.":
    "First remove the line ending and validate the record. An invalid record increments malformed. A valid record goes through the filter and then the counter.",
  "Cały String jest wiarygodnym wynikiem, gdy format ma stałą kolejność, zachowuje nazwy i zera oraz kończy się umówionym LF.":
    "The entire String is a reliable result when the format has a stable order, preserves names and zeros, and ends with the agreed LF.",
  "Nie; to obserwacja wywołań alokatora w nazwanym oknie procesu, nie RSS ani retained memory.":
    "It observes allocator calls during a named interval in the process. RSS and retained memory are separate measurements.",
  "Nie; najpierw trzeba potwierdzić ten sam input, ten sam Summary i kompletność, a metryka dotyczy tylko wywołań obserwowanego alokatora.":
    "First confirm that the input and Summary match and that the measurements are complete. The metric covers calls to the observed allocator only.",
  "Najpierw spisałbym niezmienniki wartości, potem oddzielił walidację od zapisu i pokazał testy granicy wraz z przypadkiem Unicode.":
    "I would write down the value invariants, separate validation from persistence, and show boundary tests including a Unicode case.",
  "Rozdzieliłbym decyzję o istniejącym kluczu od transakcji, a receipt wydał dopiero po potwierdzonym commit.":
    "I would keep the decision about an existing key separate from the transaction and issue a receipt only after the commit is confirmed.",
  "Wprowadziłbym jawne liczniki i jednego właściciela pracy; raport końcowy wymaga zbilansowania oraz joinu.":
    "I would add explicit counters and give the work a single owner. The final report requires the counts to balance and the work to be joined.",
  "Najpierw zdefiniowałbym kanoniczny model i wersje, a marker zmieniał dopiero razem z udaną migracją.":
    "I would define the canonical model and versions first, then change the marker as part of a successful migration.",
  "Zebrałbym sygnały po kluczu, oznaczył Unknown i ponowił dokładnie ten sam payload, a wynik porównał z receiptem.":
    "I would gather signals by key, mark the outcome Unknown, retry the exact same payload, and compare the result with the receipt.",
  "Dossier związałbym z digestem i komendami, a nie z samym numerem wersji; brakujący advisory oznacza Hold.":
    "I would tie the dossier to the digest and commands as well as the version number. A missing advisory means Hold.",
  "W modelu String przechowuje metadane: wskaźnik, długość i pojemność, a aktualny właściciel odpowiada za posprzątanie jego bufora przy drop.":
    "In this model, String stores a pointer, length, and capacity. The current owner is responsible for freeing its buffer when dropped.",
  "Na końcu wewnętrznego bloku, gdy właściciel opuszcza zakres.":
    "At the end of the inner block, when the owner goes out of scope.",
  "Można wypisać tylko moved, bo String został przeniesiony z label.":
    "Only moved can be printed because the String was moved out of label.",
  "Własność przechodzi do parametru save; wcześniejsze wiązanie wywołującego nie udostępnia już przeniesionej wartości.":
    "Ownership passes to the save parameter. The caller's earlier binding can no longer access the moved value.",
  "Współdzielony wycinek daje odczyt bez przejmowania własności.":
    "A shared slice lets you read the data without taking ownership.",
  "Użyj `&[i32]`, bo funkcja tylko odczytuje pożyczony zakres.":
    "Use `&[i32]` because the function only reads the borrowed slice.",
  "Odpowiednio: `&self`, `&mut self`, `Self`.":
    "In order: `&self`, `&mut self`, `Self`.",
};

export const pseudocode: Readonly<Record<string, string>> = {
  "PSEUDOKOD:\nsuma ← 0\nDLA każdej liczby n w [2, 4, 6]:\n    suma ← suma + n\nWYPISZ suma":
    "PSEUDOCODE:\nsum ← 0\nFOR each number n in [2, 4, 6]:\n    sum ← sum + n\nPRINT sum",
  'PSEUDOKOD:\nage ← 18\nJEŚLI age > 18:\n    WYPISZ "dorosły"':
    'PSEUDOCODE:\nage ← 18\nIF age > 18:\n    PRINT "adult"',
  "PSEUDOKOD:\nwynik ← (7 > 3)": "PSEUDOCODE:\nresult ← (7 > 3)",
};

const generatedPrefixes = [
  ["To zadanie wymaga użycia: ", "This task requires: "],
  ["W tym zadaniu pomiń: ", "Omit this in this task: "],
  [
    "Kompilator zgłosił oczekiwany błąd: ",
    "The compiler reported the expected error: ",
  ],
  ["Oczekiwano błędu kompilatora: ", "Expected a compiler error: "],
] as const;

const notePrefixes = [
  ["Wcześniejsza wspólna notatka · ", "Earlier shared note · "],
  ["Lekcja · ", "Lesson · "],
  ["Projekt · ", "Project · "],
  ["Study Session CLI — ", "Study Session CLI — "],
] as const;

export function translateGeneratedCourseText(
  text: string,
  lookup: (text: string) => string | undefined,
): string | undefined {
  for (const [from, to] of generatedPrefixes) {
    if (text.startsWith(from)) {
      const detail = text.slice(from.length);
      return to + (detail === "brak kryterium." ? "no criterion." : detail);
    }
  }

  const syntax =
    /^Składnia TOML(?: \(wiersz (\d+)(?:, kolumna (\d+))?\))?: (.+)$/s.exec(
      text,
    );
  if (syntax) {
    const [, line, column, detail] = syntax;
    const location = line
      ? ` (line ${line}${column ? `, column ${column}` : ""})`
      : "";
    return `TOML syntax${location}: ${detail === "nieznany błąd." ? "unknown error." : detail}`;
  }
  const blockedKey = /^Klucz TOML „(.+)” jest niedozwolony\.$/s.exec(text);
  if (blockedKey) return `The TOML key “${blockedKey[1]}” is not allowed.`;
  const rating =
    /^Ocena „(hard|good|easy)”: powtórka zaplanowana według oceny\.$/.exec(
      text,
    );
  if (rating) return `Review scheduled based on the “${rating[1]}” rating.`;

  for (const [from, to] of notePrefixes) {
    if (text.startsWith(from)) {
      const title = text.slice(from.length);
      return to + (lookup(title) ?? title);
    }
  }

  // Modules with implicit gates derive a display label from the lesson and step.
  for (const separator of text.matchAll(/: /g)) {
    const title = lookup(text.slice(0, separator.index));
    const step = lookup(text.slice(separator.index + separator[0].length));
    if (title !== undefined && step !== undefined) return `${title}: ${step}`;
  }
}
