# Docelowa mapa kursu Rust: od zera do praktyki seniorskiej

Data audytu: 2026-09-12
Odbiorca: osoba znająca podstawy programowania, ale zaczynająca Rust od zera.
Status: mapa docelowa i audyt luk; nie jest deklaracją ukończenia kursu ani gwarancją pracy lub poziomu senior.

## Jak czytać tę mapę

Kurs ma prowadzić od pierwszego uruchomienia programu do samodzielnego projektowania, utrzymywania i recenzowania systemów Rust. Każdy etap powinien mieć trzy warstwy:

1. **Model i praktyka** — krótki przykład, przewidywanie, uruchomienie, obserwacja, wyjaśnienie i zmiana kodu.
2. **Dowód niezależny** — nowe dane, ukryte testy, compiler output albo jawny kontrakt API. Przejście identycznego startera nie wystarcza.
3. **Transfer** — dwa świeże warianty, wykonane bez pełnego rozwiązania, a po co najmniej 24 godzinach krótkie zadanie retrieval. Jeden wariant może być mały, drugi musi zmienić domenę lub ograniczenie.

Statusy w tabelach:

- **Działa** — ścieżka i dowód są obecne w kodzie, choć nadal wymagają pilotażu dydaktycznego.
- **W trakcie** — praca jest rozpoczęta, lecz etap nie powinien być przedstawiany jako zweryfikowany.
- **Plan** — wymaganie pozostaje luką curriculum.

Completion oznacza przejście ścieżki. Mastery wymaga historii niezależnych dowodów: poprawnej predykcji, naprawy nowego błędu, transferu, opóźnionego retrieval i użycia w projekcie. Samoocena, reveal i ponowne przeczytanie są sygnałami pomocniczymi.

## Stan wyjściowy i audyt luk

Aktualny zakres repozytorium to 52 lekcje w 13 modułach: 5 lekcji fundamentów, 8 pamięci/ownership/borrowingu, 6 modelowania danych, 3 kolekcji, 3 obsługi błędów, 3 rdzenia Todo CLI, 4 modułów/Cargo, 3 IO, 3 generics, 4 traitów po 3 lifetimes i closures oraz 4 iteratorów. Curriculum zawiera 55 pojęć, 6 śladów pamięci i 95 wpisów źródłowych. Dostępne są data-driven lessons, lokalny zapis, mastery, review queue, Compiler Coach, runner przez izolowany endpoint oraz dwa projekty: mini-projekt komunikatu Number Guessing i Todo CLI z pakietem Cargo, wejściem terminalowym oraz zapisem plikowym. Projekty mają osobne notatki, retrospektywy i powiązania z pojęciami do powtórki.

Kolekcje, podstawy obsługi błędów, moduły/Cargo i Todo z IO są zaimplementowane. Todo obejmuje parser `add/done/list`, stan w `Vec`, sesję tolerancyjną i ścisłą oraz oceniane zadanie od pustej kartki. Kolekcje, Todo, Cargo i IO mają także kodowe powtórki. Pakiet Todo zawiera 11 plików oraz 19 testów integracyjnych, w tym procesów CLI. Pobranie lub lokalne uruchomienie nie nalicza automatycznie mastery; osobne zadania Notebook umożliwiają transfer po odsłonięciu rozwiązania Todo.

Poprzedni etap wprowadził podstawy generics i traitów: parametry `T`/`U`, `impl<T>`, własność danych, minimalne bounds, metody wymagane i domyślne, konsumentów, typy powiązane i pożyczone `&dyn Trait`. Każde z siedmiu pojęć generics i traitów ma dwa niezależne zadania kodowe z innym kontraktem, z zachowaną alternatywą po reveal. Trzy zadania zaczynają się od pustej kartki: ograniczenia generyczne, własny trait `Measure` z `Output` i jego konsumentami oraz lista reporterów. Siedem kodowych powtórek ćwiczy transfer do innych API. Testy używają nowych implementacji i typów bez zbędnych boundów. Jest to zakres początkujący; pełne projektowanie API, variance, HRTB, analiza kosztów i praktyka dużych systemów nadal pozostają planem. Wyniki kontroli technicznych opisuje osobno [raport weryfikacji](verification.md). Nie przeprowadzono pilotażu z uczącą się osobą; dostępność lekcji nie oznacza pełnego pokrycia tematu, potwierdzonego mastery ani gotowości zawodowej.

Najnowszy etap dodaje trzy moduły i dziesięć lekcji lifetimes, closures i iteratorów. Obejmują relacje źródła i widoku, struktury pożyczające, wybór owned API, capture i call traits, leniwe przetwarzanie oraz własne Iterator/IntoIterator. Każde pojęcie ma kodową powtórkę i co najmniej dwa niezależne zadania. Testy zakresów i wywołań uzupełniają rzeczywiste diagnostyki rustc; to podstawy potrzebne w Log Analyzer, którego pełny kontrakt nadal czeka na implementację.

Największe potwierdzone luki:

| Obszar | Stan | Co musi zostać dostarczone |
| --- | --- | --- |
| Setup, Cargo i pierwszy program | Działa jako wprowadzenie | Później potrzebny jest pełny workflow Cargo: workspace, lockfile, features, MSRV, publikowanie i reproducible CI. |
| Zmienne, typy, funkcje, expressions, control flow | Fundamenty działają | Dodać pełne ćwiczenia while, loop i break, następnie poszerzyć diagnozę i czytanie kodu; nie mierzyć samego ukończenia. |
| Stack, heap, scopes, ownership, borrowing | Działa | Utrzymać transfer do nowych domen i dodać trudniejsze interakcje z kolekcjami oraz zwracaniem referencji. |
| Slices, structs, methods, enums, Option, match | Działa | Pilotaż z początkującym i ocena samodzielnego transferu po przerwie. |
| Vec, String, HashMap i iteracja po danych | Podstawowy zakres działa | Trzy lekcje obejmują operacje kolekcji, pożyczanie, UTF-8 i `entry`; poszerzyć przetwarzanie tekstu i pomiary kosztów w projektach; podstawy iteratorów są dostępne osobno. |
| Result, `?`, panic i projektowanie błędów | Podstawowy zakres działa | Działają parsowanie, błędy domenowe, propagacja, granica paniki oraz format i IO w Todo; poszerzyć publiczne API błędów i kontekst diagnostyczny. |
| Todo CLI | Działa terminal i zapis plikowy | Rozszerzyć filtrowanie, workspace i dokumentację decyzji; ocenić samodzielną pracę ucznia. |
| Moduły, crates, packages i Cargo | Podstawy działają | Dodać workspace, features, MSRV i semver; istnieją moduły inline oraz pobierany pakiet biblioteka/binarka. |
| Generics i traity | Podstawy działają | Siedem lekcji obejmuje parametry typów, własne kontrakty, typy powiązane i pożyczone `dyn`; rozwinąć publiczne API, semver, pełne ograniczenia zgodności z `dyn` oraz pomiary kosztów. |
| Lifetimes, variance i HRTB | Podstawy lifetimes działają | Dostępne relacje wejść i zwracanych widoków, struktury, elision i owned/borrowed API. Variance i callbacki HRTB pozostają planem. |
| Closures i iterators | Podstawy działają | Dostępne capture, call traits, własność elementów, leniwe potoki i Iterator/IntoIterator. Rozwinąć refaktoryzację projektu i pomiary. |
| Testy, rustfmt i Clippy | Plan osobnego modułu | Unit/integration/doc tests, property tests, lint policy i review. |
| `Box`, `Rc`, `RefCell`, `Arc`, `Mutex`, atomics | Plan | Dobór narzędzia na podstawie własności, współbieżności i memory ordering, z testami Loom/Miri tam, gdzie mają sens. |
| Async Rust i Tokio | Plan | Cancellation, backpressure, timeouts, select, kanały, graceful shutdown i obsługa blokującego kodu. |
| Wydajność, unsafe/FFI, operacje i bezpieczeństwo | Plan | Benchmark/profile/allocation evidence, safety invariants, threat model, observability, incident exercise i decyzje architektoniczne. |
| Ocena przez człowieka | Brak | Pilotaż z osobą zaczynającą Rust oraz późniejsze przeglądy kodu według jawnej rubryki. |

## Sekwencja etapów

Każdy wiersz opisuje docelowy minimalny kontrakt etapu. Status dotyczy zakresu dostępnego w kodzie; przy częściowym pokryciu pozostałe elementy kontraktu nadal są planem. Przykładowe warianty są propozycjami zadań transferowych; przed wdrożeniem muszą dostać executable evaluator i testy dla danych innych niż przykład pokazany wcześniej.

| Etap | Prerekwizyty | Możliwość po etapie | Dowód wyjścia i artefakt | Dwa świeże warianty |
| --- | --- | --- | --- | --- |
| **0. Setup, Cargo, pierwszy program** (Działa częściowo) | Brak | Utworzyć pakiet 2024, uruchomić `cargo check`, `run` i `test`, odczytać strukturę `src` i wynik kompilatora. | Zapisany mały pakiet z testem i README uruchomienia; osoba wyjaśnia różnicę między błędem Cargo i błędem kodu. | Binarka z argumentem `--help`; biblioteka z publiczną funkcją i osobnym testem integracyjnym. |
| **1. Bindings, mutability, typy, functions, expressions** (Działa) | Etap 0 | Przewidzieć typ i wynik wyrażenia, dobrać mutowalność, napisać funkcję z kontraktem i użyć rustc jako feedbacku. | Naprawa nowego E0384/E0308 oraz funkcja sprawdzona dla zera, wartości ujemnej i drugiego wejścia. | Konwersja temperatury z ograniczeniem zakresu; funkcja normalizująca nazwę z pustym wejściem. |
| **2. Control flow** (Częściowo działa) | Etap 1 | Złożyć `if`, `for`, `while`, `loop`, zakresy i `break` w czytelny przepływ; uzasadnić granicę pętli. | Predykcja nowego przepływu, testy graniczne i transfer bez kopiowania gotowego warunku. | Raportowanie pustej kolekcji; wyszukiwanie pierwszego pasującego elementu z limitem prób. |
| **3. Stack, heap, scopes, drop** (Działa w ownership) | Etapy 1–2 | Śledzić binding, bufor na stercie, zakres i moment `drop`; odróżnić wartość `Copy` od właściciela zasobu. | Tekstowy trace dla nowego kodu oraz naprawa użycia po move z wyjaśnieniem, co zmieniło właściciela. | Bufor `Vec<u8>` w zagnieżdżonym zakresie; typ z `Drop` logujący kolejność zwalniania. |
| **4. Ownership i borrowing** (Działa) | Etap 3 | Zaprojektować granicę funkcji bez niepotrzebnego `clone`, dobrać `&T`/`&mut T`, przewidzieć konflikt pożyczek i naprawić nowy E0382/E0502. | Niezależna naprawa bez reveal, test alternatywnego wejścia i decyzja, kiedy clone jest uzasadniony; artefakt: mały moduł API. | Przekazanie `String` do walidatora i zwrot wyniku; aktualizacja dwóch pól przez jedną mutowalną pożyczkę. |
| **5. Slices, String i granice UTF-8** (Działa w modelowaniu) | Etap 4 | Używać `&[T]` i `&str` jako widoków, stosować `usize` do indeksów i nie przecinać znaku UTF-8. | Testy pustego, jednoelementowego i wieloelementowego zakresu; świeży tekst wielobajtowy; artefakt: funkcja operująca na widoku. | Suma podzakresu liczb; bezpieczne znalezienie prefiksu po granicy znaku, bez indeksowania „na oko”. |
| **6. Structs, methods, enums, Option, match** (Działa) | Etapy 4–5 | Modelować dane nazwanymi polami, odczytywać przez `&self`, zmieniać przez `&mut self`, obsługiwać payload i odróżniać `None` od `Some(0)`. | Blank-page model domenowy przechodzi testy UTF-8, pustki, `None`, `Some(0)` i przejść stanu; osobny świeży model przechodzi hidden tests. | Rekord `Reading` z opcjonalną stroną i bezpiecznym `finish`; enum priorytetu z payloadem oraz pełnym `match`. |
| **7. Kolekcje: Vec, String, HashMap** (Podstawy działają; pełny kontrakt częściowy) | Etapy 4–6 | Wybrać kolekcję według operacji, przenieść lub pożyczyć elementy świadomie, obsłużyć pustkę, duplikaty, UTF-8 i koszt dostępu. | Trzy nowe testowane funkcje: agregacja `Vec`, budowanie/edycja `String`, indeksowanie lub zliczanie w `HashMap`; brak paniki dla określonych granic. Pomiary kosztów pozostają planem. | Parser rekordów do `Vec<Task>` z filtrowaniem; zliczanie słów z normalizacją i pustym inputem. |
| **8. Result, `?`, panic i błędy domenowe** (Podstawy i IO działają) | Etapy 6–7 | Zaprojektować `Result<T, E>`, propagować błędy przez `?`, rozróżnić błąd użytkownika, IO i invariant, ograniczyć `unwrap()` do jawnie bezpiecznego miejsca. | Funkcja obsługuje co najmniej dwa failure modes i ma testy dla każdego; adversarial input nie kończy procesu niekontrolowaną paniką. Obecne zadania rozróżniają składnię, zakres, uszkodzenie formatu oraz błędy odczytu i zapisu. | Wczytanie Todo z uszkodzonej linii; analiza logu z brakującym polem i błędem liczbowym. |
| **9. Modules, crates, packages, Cargo** (Podstawy działają; workspace/features w planie) | Etapy 0, 6, 8 | Rozdzielić API publiczne i implementację, użyć modułów, workspace, features, `Cargo.lock`, `cargo metadata`, `cargo tree` i dokumentacji. | Wielopakietowy workspace buduje się przez `--workspace`; CI sprawdza `check`, `test`, `fmt`, `clippy`, minimalną wersję Rust i wszystkie wspierane kombinacje features. | Feature `json` kontra `text`; osobny crate biblioteczny używany przez binarkę i test integracyjny. |
| **10. Generics i typy abstrakcyjne** (Podstawy działają; pełny kontrakt częściowy) | Etapy 6, 9; dostępny moduł następuje po Todo z IO | Parametryzować dane i funkcje bez utraty czytelności, rozumieć monomorfizację na poziomie użytkowym i ograniczać bounds do potrzeb. | Dostępne są dwa niezależne zadania na pojęcie: parametry `T`/`U`, pożyczające i konsumujące metody oraz minimalne `PartialEq`. Testy obejmują własne typy bez zbędnych boundów. Publiczna biblioteka, benchmark i uzasadnienie kosztów pozostają planem. | Dostępne: zamiana pól i złożenie nowego rekordu; warunkowa wymiana i przyjęcie biletu od pustej kartki. Później: kolektor z `IntoIterator` i generyczne mapowanie błędu. |
| **11. Traits, associated types, zgodność z dyn** (Podstawy działają; pełny kontrakt częściowy) | Etapy 9–10 | Zaprojektować trait dla nowej domeny, dobrać associated type albo parametr typu, użyć `dyn Trait` tylko przy właściwej granicy i rozpoznać ograniczenia zgodności z `dyn`. | Dostępne są własne implementacje, metody domyślne i nadpisania, konsumenci, ograniczenie `Output` oraz pożyczone mieszane obiekty. Testy sprawdzają także dodatkową implementację. Pełne reguły zgodności z `dyn`, review publicznego API i ADR pozostają dalszym zakresem. | Dostępne: znaczniki i statusy; ogólny wynik z klientem tekstowym; samodzielny `Measure` z `Output` i klientem liczbowym od pustej kartki; filtr odczytów i lista reporterów od pustej kartki. Później: `Renderer` z associated `Error` i `Storage` w dwóch wariantach. |
| **12. Lifetimes; później variance i HRTB** (Podstawy działają; rozszerzenia w planie) | Etapy 4, 5, 10, 11; HRTB po podstawach closures w etapie 13 | Najpierw rozpoznać problem relacji życia danych, potem zapisać lifetime annotations; po etapie 13 użyć HRTB dla callbacku pożyczającego dane i nie traktować lifetime jako czasu runtime. | Dwie funkcje zwracające widok z poprawną relacją wejść, test kompilacji dla złej relacji i HRTB callback; wyjaśnienie, dlaczego API nie wymaga `'static`. | `longest` dla dwóch widoków; parser przyjmujący closure działające dla każdego lifetime. |
| **13. Closures i iterators** (Podstawy działają; pomiary i projekt w planie) | Etapy 7, 10–12 | Rozpoznać `Fn`/`FnMut`/`FnOnce`, własność w closure, lazy iterator, adaptory, `collect` i koszt materializacji. | Refaktoryzacja pętli do iteratora zachowuje testy i nie kopiuje danych; druga wersja używa closure z jawnym capture mode. | Pipeline z filtrowaniem logów; iterator po rekordach, który zwraca pożyczone widoki. |
| **14. Testowanie, rustfmt, Clippy i jakość** (Plan) | Etapy 8–13 | Rozdzielić unit/integration/doc tests, użyć property testing i fuzzingu tam, gdzie generują wartość, naprawić lint bez wyciszania problemu. | CI z formatowaniem, Clippy policy, testami właściwości i przynajmniej jednym fuzz targetem; raport pokazuje znaleziony przypadek graniczny. | Property test parsera; fuzz test granicy UTF-8 albo formatu logu z ograniczonym wejściem. |
| **15. Smart pointers i współdzielenie** (Plan) | Etapy 4, 11–14 | Dobrać `Box`, `Rc`, `RefCell`, `Arc` i `Mutex` do własności oraz współbieżności; rozpoznać koszt i ryzyko cyklu lub panicu borrow runtime. | Dwa warianty tej samej struktury z uzasadnieniem; test pokazuje, że rozwiązanie nie gubi własności i nie ukrywa błędu za niekontrolowanym `unwrap()`. | Drzewo przez `Box`; graf/cykl z `Rc<RefCell<_>>` i jawnie opisanym ryzykiem. |
| **16. Threads, Send/Sync, Mutex, atomics** (Plan) | Etapy 8, 15 | Uruchomić wątki, przekazać własność, dobrać kanał albo `Arc<Mutex<_>>`, rozumieć `Send`/`Sync`, atomics i różnice `Relaxed`/`Acquire`/`Release`/`SeqCst` na poziomie kontraktu. | Test współbieżny jest deterministycznie sprawdzalny; Loom modeluje mały interleaving, a decyzja o ordering ma komentarz invariantu. | Worker pool z kanałem i backpressure; licznik atomowy z porównaniem do mutexa i benchmarkiem. |
| **17. Async Rust i Tokio** (Plan) | Etapy 8, 13, 16 | Rozumieć future jako leniwe obliczenie, wybierać runtime, użyć kanałów/streamów, timeoutu i `select`, propagować cancellation, ograniczać backpressure i zamykać system graceful. | Integracyjny serwis testowany dla timeoutu, anulowania, pełnego kanału i błędu połączenia; shutdown czeka na dzieci i nie gubi komunikatów. | Limit równoległych żądań z timeoutem; pipeline logów z bounded channel i sygnałem zamknięcia. |
| **18. Projekty produkcyjne i senior scope** (Plan) | Etapy 7–17 zależnie od projektu | Podejmować decyzje architektoniczne, opisać threat model, obserwowalność, koszty i operacyjne ryzyka; prowadzić review i incident exercise. | Portfolio z pięcioma projektami, ADR, benchmarkiem/profilem, CI i retrospektywą; człowiek ocenia jakość decyzji, nie tylko zielone testy. | Własny bounded service z awarią zależności; zmiana wymagań ujawniająca brak invariantu lub problem semver. |

## Spiralne portfolio

Każdy projekt ma docelowy kontrakt: cel, wymagane zachowania, dowody, ograniczenia, adversarial inject i retrospektywę. Projekty mają wracać do starszych pojęć, zamiast izolować każdy etap. Poniższe wymagania opisują pełne portfolio; wdrożone fragmenty wskazano przy pierwszych dwóch projektach, a projekty 3–5 pozostają planem.

### 1. Number Guessing+

Obecnie działa mini-projekt budowania komunikatu Number Guessing z wariantem bez `clone` i retrospektywą. Pełna gra według kontraktu poniżej pozostaje planem.

- **Cel:** bezpiecznie obsłużyć zgadywanie liczby, wejście użytkownika, pomoc, powtarzanie rund i zakończenie.
- **Wymagane zachowania:** parsowanie wejścia przez `Result`, komunikaty dla za małej/za dużej wartości, EOF, pustego i niepoprawnego inputu oraz limitu prób.
- **Dowody:** testy parsera i decyzji domenowej, test wejścia granicznego, `cargo fmt`, Clippy i nagranie krótkiego code reading.
- **Ograniczenia:** brak `unwrap()` na danych użytkownika, brak globalnego stanu i brak ukrywania błędów przez `clone()`.
- **Adversarial inject:** wejście zawiera spacje, niepoprawną liczbę, EOF i wartość poza zakresem.
- **Artefakt:** mały pakiet Cargo z README i tabelą decyzji o błędach.

### 2. Todo CLI

Obecnie działa rdzeń w pamięci: parser `add/done/list`, walidacja, kolekcja zadań w `Vec` oraz sesje tolerancyjna i ścisła. Zadanie od pustej kartki ocenia cały ten kontrakt. Dalsze trzy lekcje i pobierany pakiet dodają wersjonowany format, odczyt i etapowany zapis, argv, stdin/EOF/quit, stdout/stderr i testy po ponownym uruchomieniu. Pliki w Playgroundzie są tymczasowe; trwała praca między uruchomieniami odbywa się w lokalnym pakiecie Cargo. Ten zakres zakłada jednego zapisującego i nie obiecuje pełnej trwałości po awarii zasilania. Filtrowanie, workspace i ADR pozostają dalszym rozszerzeniem.

- **Cel:** przechowywać zadania, zmieniać stan, filtrować i zapisywać dane między uruchomieniami.
- **Wymagane zachowania:** kolekcja zadań, `add/list/done`, walidacja identyfikatora, odczyt/zapis pliku, jawne błędy domenowe i IO.
- **Dowody:** testy jednostkowe, integracyjne z tymczasowym plikiem, test pustego/uszkodzonego zapisu, test po ponownym uruchomieniu oraz transfer Reading/Task z modułu modelowania.
- **Ograniczenia:** parser, domena i persistence mają osobne moduły; błędny plik nie może wyzerować danych bez komunikatu; `unwrap()` nie obsługuje inputu.
- **Adversarial inject:** dodatkowy wariant enumu, pusty tytuł, UTF-8, `Some(0)`, częściowo uszkodzony plik i przerwany zapis.
- **Artefakt:** workspace z biblioteką domenową, binarką, testami, ADR-em i krótką retrospektywą.

### 3. Log Analyzer

- **Cel:** strumieniowo analizować duży log bez ładowania całego pliku do pamięci.
- **Wymagane zachowania:** filtrowanie poziomów, zliczenia, raport błędnych linii, stabilny wynik i obsługa IO.
- **Dowody:** fixture mały i duży, property test formatu, benchmark pamięci/czasu, test niepoprawnego UTF-8 według przyjętego kontraktu oraz raport profilu.
- **Ograniczenia:** jawna polityka dla błędnych linii, brak nieograniczonego `collect`, bounded output i deterministyczne sortowanie.
- **Adversarial inject:** jedna długa linia, duplikaty, brak newline na końcu, błędny timestamp i duplikat zależności feature.
- **Artefakt:** biblioteka z publicznym API, CLI, benchmarkiem i dokumentacją kosztów.

### 4. Mini grep

- **Cel:** wyszukiwać wzorzec w plikach i wypisywać kontekst z kontrolą błędów.
- **Wymagane zachowania:** wiele plików, numer linii, brak dopasowań, nieczytelny plik, opcjonalny kontekst i właściwy kod wyjścia.
- **Dowody:** testy kontraktu CLI, testy property dla wyboru linii, fuzz wejścia wzorca i testy na strukturze katalogów.
- **Ograniczenia:** brak paniki na ścieżkach użytkownika, rozdzielone traversal/search/render, jawna polityka symlinków i limit wyjścia.
- **Adversarial inject:** plik zmienia się podczas odczytu, bardzo długi wzorzec, binarny plik i konflikt opcji.
- **Artefakt:** crate biblioteczny + binarka, dokument threat modelu ścieżek i review API.

### 5. Capstone

- **Cel:** zaprojektować większy system Rust z granicą synchronizacyjną lub asynchroniczną, publicznym API i utrzymaniem.
- **Wymagane zachowania:** opis domeny, trwały kontrakt, diagnostyka, graceful shutdown, metryki/logi/tracing, konfiguracja i migracja danych albo wersjonowanie API.
- **Dowody:** ADR-y, threat model, testy jednostkowe/integracyjne/property, benchmark/profile, kontrola alokacji, CI reproducible, review dwóch osób i incident drill.
- **Ograniczenia:** każda `unsafe` ma invariant i minimalny zakres; zależności mają uzasadnienie, MSRV i licencję; feature flags nie mogą przypadkiem wyłączać bezpieczeństwa.
- **Adversarial inject:** awaria zależności, timeout, pełny kanał, częściowa migracja, nowe pole API, regresja wydajności i niezgodny klient.
- **Artefakt:** repozytorium z workspace, release notes, semver policy, runbookiem, dashboardem sygnałów i retrospektywą decyzji.

## Senior scope jako osobne dowody

Lista tematów sama w sobie nie świadczy o kompetencji. Każdy obszar powinien mieć zadanie, wynik i artefakt:

| Obszar | Minimalny dowód praktyczny |
| --- | --- |
| Library API i semver | Publiczny crate z dokumentacją, testami doc, changelogiem, przykładem breaking/non-breaking change i uzasadnieniem semver. |
| Cargo, workspaces, features, MSRV, dependencies | Workspace z co najmniej dwoma pakietami, `cargo metadata/tree`, lockfile, macierzą feature flags i CI na MSRV oraz stable. |
| Traits, generics, lifetimes, HRTB, associated types, object safety | Jedno API pokazane w dwóch projektach: parametr generyczny i `dyn Trait`; associated type, HRTB callback oraz dokument ograniczeń object safety. |
| Iterators i closures | Refaktoryzacja z pomiarem, która zachowuje własność danych, testy i czytelność; porównanie z pętlą bez obietnicy, że iterator zawsze jest szybszy. |
| Smart pointers | Decyzja `Box`/`Rc`/`RefCell`/`Arc`/`Mutex` z diagramem własności, kosztem i testem błędnego użycia. |
| Send/Sync, atomics, memory ordering | Mały protokół współbieżny z invariantem, testem wyścigu oraz Loom; komentarz wyjaśnia, czemu ordering jest wystarczający. |
| Async/Tokio | Bounded pipeline z timeoutem, cancellation tokenem, backpressure, `select` i graceful shutdown; test nie zostawia zadań po zakończeniu. |
| Robust error design | Własne typy błędów z kontekstem, mapowaniem warstw i stabilnym API; testuje się każdy failure mode, a `panic` jest tylko invariantem programu. |
| Property testing, fuzzing, Miri, Loom | Narzędzie jest dobierane do ryzyka: property dla praw ogólnych, fuzz dla parsera, Miri dla UB/aliasingu, Loom dla interleavings. Raport opisuje ograniczenia narzędzia. |
| Benchmark, profile, allocations | Hipoteza przed pomiarem, benchmark powtarzalny, profile CPU/heap lub alokacji, regresyjny próg i decyzja po danych. |
| Unsafe i FFI | Minimalny wrapper z opisanym invariantem, poprawnymi layoutami/ABI, ownership i cleanup; review obejmuje każdą `unsafe` oraz testy błędnych wejść. |
| Architecture i observability | ADR z alternatywami, structured logs/tracing, metryki, health/readiness, correlation ID, runbook i ćwiczenie diagnozy incydentu. |
| Security i operacje | Threat model, granice zaufania, walidacja inputu, sekrety, supply chain/dependency review, reproducible CI i plan reakcji na awarię. |
| Code review i decyzje | Dwa review z komentarzami odnoszącymi się do kontraktu, testów, ryzyka i kosztu utrzymania; autor odpowiada na feedback i zapisuje decyzję. |

## Zasady dowodzenia mastery

Minimalny dowód dla ważnej kompetencji powinien składać się z następujących elementów:

1. **Prediction bez uruchomienia.** Nowe dane i przynajmniej jedna kusząca błędna odpowiedź.
2. **Kodowanie lub naprawa.** Zadanie wymaga użycia reguły, a evaluator sprawdza zachowanie, nie tylko status procesu.
3. **Dwa warianty transferowe.** Jeden zmienia dane, drugi zmienia domenę, ograniczenie albo granicę API. Oba używają świeżych testów.
4. **Delayed retrieval.** Po minimum 24 godzinach osoba odtwarza regułę i rozwiązuje mały nowy przypadek bez ponownego czytania rozwiązania.
5. **Portfolio use.** Kompetencja pojawia się w projekcie razem z testem, decyzją i retrospektywą.

Ewaluator nie może zaliczać celowo błędnego startera jako sukcesu. Weryfikator autorskich przykładów sprawdza teraz startery z testami i ograniczeniami źródła używanymi przez ten sam evaluator; rozwiązania zawierające wyłącznie funkcje generyczne również są kompilowane i testowane. Brak testów, timeout albo błąd infrastruktury nie dowodzą, że starter wymaga właściwej poprawki. Błąd brakującego API musi pochodzić z diagnostyki wskazującej autorskie źródło. Przegląd kodu sprawdza kontrakt i niezależność wariantów obok automatycznej kontroli.

Zadania testowe powinny obejmować różne wejścia, przypadki puste, wartości ujemne, `Some(0)`, UTF-8, drugi rekord i powtórne wywołanie tam, gdzie to ma znaczenie. Przy zadaniach modyfikacji należy sprawdzać także wymagany idiom lub zakazane obejście, gdy samo zachowanie pozwala przejść przez literalny hardcode. Nowe bramki generyczne używają także typów bez `Copy`, `Clone` i `Debug`, a zadania traitów — implementacji nieobecnych w starterze. Testy w otwartym lokalnym kursie są ochroną dydaktyczną, nie uwierzytelnionym egzaminem.

## Audyt pokrycia oryginalnego briefu

| Wymaganie briefu | Miejsce docelowe | Stan |
| --- | --- | --- |
| Local-first PWA, onboarding, diagnostic, dashboard, map, resume, focus mode | Powłoka aplikacji, persistence i dostępne moduły | Działa; skuteczność dydaktyczna wymaga pilotażu. |
| Cykl PREDICT → RUN → OBSERVE → EXPLAIN → MODIFY → DEBUG → RECALL → APPLY | Każdy etap, z dominującym typem workspace zależnym od zadania | Mechanika działa; nie każda lekcja musi zawierać wszystkie fazy. |
| UNDERSTAND → PRACTICE → VERIFY → TRANSFER | Kontrakty lekcji, executable gates i transfery | Działa dla dostępnej treści; nowe etapy muszą zachować ten kontrakt. |
| Ownership visualizer i Compiler Coach | Etapy 3–5 oraz wszystkie późniejsze błędy | Działa jako przygotowany model/feedback, nie debugger dowolnego programu. |
| Collections i error handling | Etapy 7–8, Todo CLI | Podstawowy zakres jest zaimplementowany: po trzy lekcje i użycie w rdzeniu Todo. IO jest dostępne; pełne API błędów i dalsza praca nad kosztami pozostają planem. |
| Modules i Cargo | Etap 9 | Cztery aktywne lekcje oraz realny pakiet Cargo; zaawansowany workflow pozostaje planem. |
| Generics i traity | Etapy 10–11 | Podstawy dostępne w siedmiu lekcjach: niezależne bramki, kodowe powtórki, typy powiązane i pożyczone `dyn`. Zaawansowane kontrakty publicznego API, pełne reguły i pomiary pozostają planem. |
| Lifetimes | Etap 12 | Trzy lekcje z testowanymi kontraktami wejścia/wyniku i struktur. Variance i HRTB pozostają w planie. |
| Iterators i closures | Etap 13 | Siedem lekcji, kodowe powtórki i niezależne bramki. Dalszy projekt i pomiary pozostają w planie. |
| Testing, rustfmt, Clippy | Etap 14 | Plan; obecne testy narzędziowe nie zastępują osobnego modułu. |
| Smart pointers, threads, async | Etapy 15–17 | Plan/rozszerzenie, z własnymi ograniczeniami i testami. |
| Number Guessing+, Todo CLI, Log Analyzer, Mini grep, capstone | Portfolio 1–5 | Działa mini-projekt komunikatu Number Guessing i Todo z terminalem oraz plikami. Pełne Number Guessing+, dalsze rozszerzenia Todo oraz projekty 3–5 pozostają planem. |
| Retrieval, review queue, mastery, misconceptions | Silnik wspólny dla wszystkich etapów | Działa mechanicznie; potrzebny ludzki pomiar transferu po czasie. |
| Blank-page, adversarial injects, scenario assessment | Etapy 6, 8 i każdy projekt | Częściowo działa; każdy nowy etap powinien dostarczać oba warianty oraz inject. |
| Bezpieczeństwo runnera, CI, reproducibility, observability | Runner boundary, CI i etap 18 | Granica runnera istnieje; pełny operacyjny i supply-chain scope pozostaje luką. |
| Profil odbiorcy: zero Rust | Onboarding, copy i pierwsze etapy | Przyjęty. Nie opierać progresji na znajomości innego języka ani jego bibliotek. |

## Wymagania dla ludzkiej oceny

Testy techniczne mogą potwierdzić, że aplikacja działa, kod się kompiluje i evaluator rozróżnia sukces od porażki. Nie potwierdzają, że początkujący zbudował poprawny model mentalny ani że transferuje wiedzę po przerwie.

Przed oznaczeniem etapu jako dydaktycznie sprawdzonego potrzebny jest pilotaż z co najmniej jedną osobą, która zna podstawy programowania i nie zna Rust. Obserwator powinien zapisać:

- czas do pierwszego działania i momenty utknięcia;
- predykcję przed uruchomieniem, nie tylko końcowy output;
- błędny model mentalny ujawniony przez odpowiedź lub kod;
- liczbę i rodzaj hintów, reveal oraz prób obejścia;
- samodzielną naprawę nowego błędu;
- rozwiązanie obu świeżych wariantów;
- odpowiedź po minimum 24 godzinach bez ponownego czytania;
- komentarz użytkownika o tym, co było trudne i jaki krok pomógł.

Rubryka człowieka powinna oceniać: diagnozę problemu, dobór modelu własności/typów, poprawność kontraktu, jakość testów, czytelność decyzji i umiejętność wskazania ograniczeń. Zielony build bez tych dowodów nie jest oceną seniority. Wyniki pilotażu powinny zmieniać kolejkę powtórek i treść, ale nie obniżać punktów za sam błąd.

## Oficjalne źródła i polityka odświeżania

Źródła poniżej zostały sprawdzone 2026-09-12. Linki kierują do dokumentacji utrzymywanej przez Rust Project lub autorów danego narzędzia. Przy zmianie stable Rust, edition, Cargo resolvera, Tokio albo API narzędzia należy ponowić przegląd przykładów i evaluatorów.

- [The Rust Programming Language](https://doc.rust-lang.org/book/) — ścieżka podstawowa, ownership, typy, traits, lifetimes, smart pointers i concurrency.
- [The Cargo Book](https://doc.rust-lang.org/cargo/) — pakiety, workspaces, dependencies, features, resolver, profiles i reproducible commands.
- [Cargo Reference](https://doc.rust-lang.org/cargo/reference/) — manifest, semver compatibility, rust-version/MSRV, metadata i szczegóły konfiguracji.
- [The Rust Reference](https://doc.rust-lang.org/reference/) — szczegółowy opis składni i semantyki języka, w tym typów, traits, lifetimes i unsafe.
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) — unsafe, FFI, aliasing, variance, memory model i budowanie bezpiecznych abstrakcji; używać dopiero po podstawach.
- [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/) — futures, async/await, cancellation i wzorce współbieżności; książka jest nadal oznaczona jako rozwijana.
- [Tokio tutorial](https://tokio.rs/tokio/tutorial) oraz [Tokio graceful shutdown](https://tokio.rs/tokio/topics/shutdown) — runtime, spawning, shared state, channels, streams, select i zamykanie systemu.
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) — nazewnictwo, interoperacyjność, type safety, dependability, debuggability i future proofing API.
- [Clippy documentation](https://doc.rust-lang.org/clippy/) i [rustfmt](https://rust-lang.github.io/rustfmt/) — jakość, formatowanie i polityka lintów.
- [`std::sync::atomic::Ordering`](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html) — kontrakty ordering dla atomics; przykłady muszą wyjaśniać invariant, nie tylko nazwę wariantu.
- [Miri](https://github.com/rust-lang/miri) i [Loom](https://docs.rs/loom/latest/loom/) — odpowiednio interpreter do wykrywania części problemów UB oraz modelowanie interleavings; stosować tam, gdzie ryzyko uzasadnia koszt.

Dokumentacja źródłowa nie zastępuje testu w aktualnym stable toolchainie. Przykłady kursowe mają być kompilowane w edition 2024, a przy zmianie wersji należy ponowić `content:rust`, testy evaluatorów i ręczny przegląd komunikatów rustc.
