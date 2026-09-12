# Zgodność z oryginalnym briefem

Stan po aktualizacji z 12 września 2026. Punktem odniesienia jest pełny tekst przekazany przez użytkownika oraz późniejsze korekty: odbiorca zna podstawy programowania, ale zaczyna Rust od zera; interfejs ma chłodną paletę i większą czytelność.

**Nie wszystkie elementy docelowego kursu są zaimplementowane.** Dostępne są mechaniki produktu oraz 35 lekcji w ośmiu modułach: 5 lekcji fundamentów Rust, 8 pamięci, ownership i podstaw borrowing, 6 modelowania danych, 3 kolekcji, 3 obsługi błędów, 3 rdzenia Todo CLI, 4 modułów i Cargo oraz 3 formatu pliku, zapisu i terminala. Curriculum obejmuje 39 pojęć, 6 śladów pamięci i 56 wpisów źródłowych. Najnowszy etap dodaje siedem lekcji, podstawy części 9 i pobierany projekt Todo z rzeczywistym IO. Zaawansowane Cargo, części 10–18 poza dostępnym Todo, pozostałe pełne projekty i zaawansowana praktyka nadal wymagają pracy. Oryginalny brief sam rozdzielał pierwszy pion produktu od całego curriculum.

„Zaimplementowane” oznacza dostępny kod i ścieżkę użytkownika, a nie potwierdzoną skuteczność uczenia. Wyniki wykonanych kontroli znajdują się w [raporcie weryfikacji](verification.md).

## Mechaniki produktu

| Wymaganie | Stan i dowód |
| --- | --- |
| Local-first, bez logowania, PWA | Zaimplementowane. IndexedDB, lokalne zasoby Monaco i Service Worker; offline działa po pobraniu aplikacji. Wykonanie Rust wymaga sieci. `src/persistence`, `public/sw.js`. |
| Onboarding i diagnostyka przez działanie | Zaimplementowane. Pseudokod, warunek, typ i objaśnione pierwsze ćwiczenie Rust; brak blokowania lekcji. Rekomendacja tempa jest widoczna na dashboardzie. `onboarding.tsx`, `domain/diagnostic.ts`. |
| Profil początkującego w Rust | Zaimplementowane. Nowe sesje zaczynają od `first-program`; zapisane wcześniej sesje zachowują swoją lekcję, kod i ustawienia. Pierwotne porównania do innych języków usunięto zgodnie z późniejszą instrukcją. |
| Dashboard „co teraz?” | Zaimplementowane. Dokładne wznowienie, kroki bieżącej sesji, powtórki, postęp projektu powiązanego z lekcją i pojęcia aktywnego modułu. `components/overview.tsx`. |
| Mapa kursu i kontrakt modułu | Zaimplementowane. Wybór modułu; cel, umiejętności, kryteria wyjścia i związek z projektem. Niezaliczone kryteria prowadzą do konkretnego zadania. Dostęp do lekcji pozostaje otwarty. |
| Graf konceptów i prerekwizytów | Zaimplementowane. Dane i walidacja relacji oraz cykli; czytelny widok powiązań. To lista zależności, nie interaktywny edytor grafu. |
| PREDICT → RUN → OBSERVE → EXPLAIN → MODIFY → DEBUG → RECALL → APPLY | Zaimplementowane jako mechaniki. Obserwacja jest częścią porównania wyniku i wizualizacji, nie zawsze osobnym ekranem. Predykcja wymaga odpowiedzi przed uruchomieniem; walidator odrzuca konfigurację blokującą ten przepływ. Nie każda lekcja zawiera wszystkie etapy. |
| UNDERSTAND → PRACTICE → VERIFY → TRANSFER | Kontrakty i zadania są zaimplementowane. Cele i transfer są dostępne w lekcji; ocenę wspierają wynik programu, testy, przewidywanie i rubric. Jakość modelu mentalnego oraz transferu wymaga pilotażu z uczącym się. |
| Wiele typów ćwiczeń, krótkie lekcje | Zaimplementowane. Przewidywanie, czytanie, modyfikacja, debug, trace, pytania, kolejność, wyjaśnienia, blank-page, testy i assessmenty. |
| Edytor dominujący w zadaniu kodowym | Zaimplementowane. Monaco i dostępny edytor tekstowy, regulacja rozmiaru czcionki, podgląd wyników, mobilne zakładki, Focus Mode. |
| Oryginalny compiler output i Compiler Coach | Zaimplementowane. Zachowany stdout/stderr, strukturalne statusy, dwie progresywne wskazówki i opcjonalne rozwiązanie. Coach jest przygotowaną treścią konkretnego ćwiczenia. |
| Ownership Visualizer | Zaimplementowane. Sześć śladów: move, Copy, clone, współdzielona/mutowalna pożyczka, zakres/drop; stack/heap i tekstowe wyjaśnienia. Nie jest debuggerem dowolnego kodu użytkownika. |
| Misconceptions | Zaimplementowane w kontrastach, błędnych odpowiedziach i ich objaśnieniach. Po próbie można otworzyć listę częstych błędnych założeń w lekcji. Nie ma automatycznej diagnozy dowolnego własnego wyjaśnienia. |
| Completion oddzielone od mastery | Zaimplementowane. Samo otwarcie czy ukończenie ekranu nie nadaje samodzielności. Silne dowody wymagają niezależnych zadań, a rozumienie także zweryfikowanego kodowania. `engine/learning.ts`. |
| Evidence gates | Zaimplementowane. Jawne odwołania do zadań i wymaganych wyjaśnień, warianty po użyciu pomocy oraz osobny transfer. Rozwiązanie referencyjne pakietu oznacza pomoc dla `format-debug`, `file-debug` i `cli-debug`; nie zalicza ich i nie obejmuje niezależnych bramek Notebook z innym kontraktem. Ujawnione rozwiązanie pozostaje słabszym dowodem. |
| Poziomy new/exposed/practiced/understood/retained | Zaimplementowane. Utrwalenie wymaga wcześniejszych dowodów i niezależnej poprawnej odpowiedzi po ponad 24 godzinach; samoocena nie zastępuje kodowania. |
| Przekrojowy competency view | Zaimplementowane. Dashboard agreguje pojęcia i unikalne niezależne zadania z wielu lekcji. Poziom kompetencji nie przewyższa najsłabiej potwierdzonego powiązanego pojęcia. `engine/progress.ts`. |
| Retrieval cards i Review Queue | Zaimplementowane. Każde pojęcie ma własną odpowiedź i rozróżnienie, ćwiczenie oraz kolejkę. Oceny Again/Hard/Good/Easy planują powrót. |
| Mieszane aktywne powtórki | Zaimplementowane. Czytanie, przewidywanie, typy, przypadki graniczne oraz naprawy E0382/E0502, kolekcji i Todo z edytorem i testami. Kod i wynik są wznawiane; zakończona sesja nie pozwala ponownie naliczać tego samego dowodu. |
| Projekty z kontraktem i retrospektywą | Dostępny wybór mini-projektu komunikatu Number Guessing oraz Todo CLI: parser, stan w `Vec`, dwie polityki sesji, format, pliki i terminal. Karta Todo udostępnia 11-plikowy pakiet Cargo bez zależności w wariantach startera i rozwiązania. Starter ma pięć funkcji do uzupełnienia; pakiet obejmuje rzeczywiste IO i testy osobnego procesu CLI. Projekty mają wymagania, ograniczenia, dowody, oddzielne notatki i retrospektywy. Pełne Number Guessing+ i pozostałe duże projekty pozostają w planie. |
| Blank-page, adversarial inject i scenario assessment | Zaimplementowane w dostępnych modułach. Obejmują samodzielny kod, testy granic, zmianę wymagań i rozumowanie. Testy są ukryte w interfejsie, lecz dostępne w źródłach otwartego kursu. |
| Dokładny Resume | Zaimplementowane. Lekcja, krok, panel, kod, odpowiedzi, próby, pomoc i focus. Karta projektu wznawia jego bieżącą lekcję albo pierwszą nieukończoną, zamiast zawsze kierować do wcześniejszego zadania końcowego. Nowy materiał zachowuje identyfikatory i zapis istniejących sesji. |
| Notatki, bookmarki, export/import | Zaimplementowane. Pełna walidacja importu, potwierdzenie zastąpienia, migracje v1/v2 → v3 bez resetu; odrzucanie nieznanych wersji. |
| Spokojny, czytelny light/dark UI | Zaimplementowana nowa paleta bieli/szarości/granatu z niebieskim akcentem, większa typografia, komfortowe przyciski, przewijana nawigacja i stale dostępna stopka lekcji. Motywy edytora i ikony PWA są spójne. |
| Accessibility | Zaimplementowane podstawy: semantyka, klawiatura, skip link, focus, aria-live, reduced motion, alternatywa Monaco i mobile. Axe i testy klawiatury pokrywają wybrane ścieżki; ręczny test czytnikiem ekranu pozostaje do wykonania. |

## Architektura i utrzymanie

| Wymaganie | Stan i ograniczenia |
| --- | --- |
| Next App Router, strict TS, React, Tailwind, IndexedDB, Vitest, Playwright | Zaimplementowane; zależności i skrypty w `package.json`. Produkcyjny build używa Webpack ze względu na ograniczenia uruchomieniowe środowiska. |
| Data-driven moduły, lekcje i projekty | Zaimplementowane. `content/course.ts` łączy fundamenty, własność, modelowanie, kolekcje, błędy, Todo oraz nowe `modules-cargo.ts` i `io.ts`. `content/projects/todo-cli.ts` definiuje pliki startera i rozwiązania; archiwa ZIP powstają z tych danych. Mapa, nawigacja i karty projektów korzystają z danych. |
| Oddzielone exercise definition i evaluation | Zaimplementowane. Dyskryminowany typ evaluatora i czysty `engine/evaluate.ts`. Wymienione w briefie nazwy evaluatorów były przykładami. Osłony wzorców źródła nie są analizą AST. |
| RustRunner, PlaygroundRunner, RemoteRunner, przyszły SandboxRunner | Zaimplementowany interfejs i dwa adaptery. Własny SandboxRunner jest przyszłym rozszerzeniem, zgodnie z briefem. |
| Bezpieczna granica niezaufanego kodu | Brak lokalnego wykonywania szkiców ucznia przez aplikację; limity żądania, wyjścia, czasu, kolejki i współbieżności. Testy IO używają rzeczywistych plików tymczasowych w sandboxie dostawcy. Interaktywny terminal, wieloplikowe Cargo i trwały plik są dostępne po samodzielnym pobraniu i lokalnym uruchomieniu pakietu, nie w runnerze przeglądarki. Własny `RUST_RUNNER_URL` wymaga zapewnienia izolacji przez operatora. `docs/runner.md`. |
| Stable Rust i edition 2024 | Zaimplementowane w adapterze, kompilacji przykładów i pobieranym pakiecie. Cztery lekcje obejmują podstawy modułów i Cargo; projekt ma polecenia check/test/fmt/Clippy. Pełny moduł pracy narzędziowej i zaawansowane Cargo pozostają dalszym zakresem. |
| Źródła, freshness, classification, reviewedAt, recheck policy | Zaimplementowane. 56 wpisów źródłowych: 34 wcześniejsze, 13 dla modułów/Cargo i 9 dla IO. Instalacja i zewnętrzna usługa są oznaczone jako dynamiczne. Daty i zasady przeglądu są dostępne w lekcjach/ustawieniach. |
| Walidacja treści i CI | Zaimplementowane. Unikalność ID i odpowiedzi kart, referencje, cykle, kontrakty, moduł–lekcja, assessmenty, wymagane pola, evidence gates i aktywne powtórki. Kompilacja sprawdza poprawne rozwiązania i oczekiwane błędy. Automatyka nie ocenia jakości dydaktycznej prose. |
| Observability | Częściowe. Inspektor pokazuje przyczyny mastery/review i evaluatory, a źródła oraz bieżący schemat są jawne. Brakuje osobnej, trwałej historii wykonanych migracji i pełnego audytu pochodzenia każdej wersji materiału. |

## Docelowe curriculum

| Część oryginalnego programu | Pokrycie |
| --- | --- |
| 0 — Setup, Cargo, pierwszy program | Wprowadzenie i ćwiczenia dostępne; instalację wykonuje użytkownik opcjonalnie w swoim terminalu. Aplikacja nie potwierdza jej wykonania. |
| 1 — Zmienne, mutability, scalar types, functions, expressions | Fundamenty dostępne, z naprawami E0384/E0308 i transferem do funkcji. |
| 2 — Control flow | Wprowadzenie do `if`, `for`, zakresów i warunków granicznych; szersza praca z `while`, `loop`, `break` pozostaje rozszerzeniem. |
| 3–4 — Stack, heap, scopes, ownership | Dostępne w module własności. |
| 5 — Borrowing, mutable borrowing, slices | Borrowing i wprowadzenie do slices dostępne. Ćwiczenia obejmują &[i32], &str, pożyczony zakres, granice indeksów i UTF-8; zaawansowane przetwarzanie tekstu pozostaje dalszym materiałem. |
| 6 — Structs, methods, enums, Option, match | Dostępne. Nazwane pola, własny String, impl, &self/&mut self, warianty z danymi, pełny match, Some/None oraz samodzielny model ze zmianą stanu. |
| 7 — Vec/String/HashMap | Dostępne trzy lekcje: operacje i pożyczanie `Vec`, bajty/`char`/granice UTF-8 w `String`, odczyt i aktualizacja `HashMap` przez `entry`. Są zadania i kodowe powtórki; pełne przetwarzanie tekstu, iteratory i pomiary kosztów pozostają dalszym materiałem. |
| 8 — Result/`?`/panic | Dostępne trzy lekcje: odzyskiwanie kontroli, jawna konwersja błędu parsera na błąd domenowy, propagacja i granica paniki. Nowy etap Todo rozwija błędy IO, rozróżnienie NotFound od uszkodzenia oraz konkretne warianty błędów między parserem, magazynem i aplikacją. Pełne publiczne API błędów pozostaje do rozszerzenia. |
| 9 — Modules/crates/packages | Podstawy zaimplementowane w czterech lekcjach: drzewo i ścieżki modułów, widoczność, prywatny model, importy i re-eksporty oraz granica biblioteki i programu Cargo. Pobierany Todo stosuje układ wielu plików i testy integracyjne. Ćwiczenia inline w przeglądarce nie dowodzą działania osobnych targetów. Zaawansowane Cargo, workspaces, features, publikowanie i polityka MSRV pozostają dalszym materiałem. |
| 10–12 — Generics, traits, lifetimes | Pełne moduły w planie. Użycie standardowego `Write` do zapisu plików nie zastępuje nauki projektowania własnych traitów i granic generycznych. |
| 13–14 — Closures/iterators, testing/rustfmt/Clippy | W planie jako pełne moduły; obecne ćwiczenia już korzystają z testów. |
| 15–17 — Smart pointers, threads, async | W planie jako dalszy/rozszerzony materiał. |
| 18 — Projekty końcowe i projekty spiralne | Częściowe pokrycie. Działa mini-projekt komunikatu Number Guessing oraz Todo od parsera i sesji do pobieranego pakietu CLI z plikiem odczytywanym po restarcie. Trzy nowe lekcje IO obejmują dokładny format UTF-8, etapowany zapis i granicę potwierdzenia operacji. Pakiet ma rzeczywiste stdin/stdout/stderr i testy procesu; jego pobranie ani lokalna samoocena nie zaliczają automatycznie lekcji. Zapis nie zapewnia pełnej odporności na utratę zasilania ani równoczesnych autorów zmian. Pełne Number Guessing+, Log Analyzer, Mini grep i projekt końcowy pozostają do implementacji. |

## Rozszerzony cel i granice oceny

Nowy cel obejmuje zaawansowaną praktykę Rust oraz kompetencje potrzebne przy przechodzeniu z mid na seniora. [Mapa zaawansowanego curriculum](advanced-curriculum.md) zachowuje pełne części 0–18 oryginalnego briefu i dodaje publiczne API/semver/MSRV, współbieżność, async z anulowaniem i limitami, profilowanie, unsafe/FFI, testy właściwości, bezpieczeństwo, obserwowalność i analizę incydentów. Dostarczenie treści nie jest równoznaczne z potwierdzeniem poziomu zawodowego. Zapis postępu zachowuje schemat v3 i wcześniejsze identyfikatory lekcji.

Nie przeprowadzono pilotażu z osobą uczącą się. Potrzebne są samodzielna naprawa nowego błędu, wyjaśnienie wyboru i powtórka po ponad dobie. Testy techniczne, walidacja treści i przegląd interfejsu nie zastępują tego dowodu.
