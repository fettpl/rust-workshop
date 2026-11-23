# Log Analyzer i testowanie — plan wdrożenia

[English](2026-09-12-log-analyzer-testing.md)

**Cel.** Nauczyć wykonywalnych kontraktów testowych i udostępnić strumieniowy analizator logów z warsztatem Cargo do pobrania.

Dwa moduły sterowane danymi korzystają z istniejącego mechanizmu lekcji, dowodów i powtórek. Ćwiczenia w przeglądarce są samodzielne. Pakiet z biblioteką i CLI używa Rust 2024 oraz wyłącznie biblioteki standardowej. W terminalu można uruchomić testy, testy dokumentacji, rustfmt i Clippy. Lokalna lista kontrolna i pobranie pakietu służą zapoznaniu z materiałem.

Podstawą są pierwotny załącznik z późniejszą korektą profilu uczestnika i `docs/advanced-curriculum.md`. Zakładamy podstawy programowania i brak znajomości Rust, bez porównań do wcześniej poznanych języków.

## Kontrakty i odpowiedzialność

- Testowanie: `src/content/testing.ts` eksportuje `testingLessons`, `testingModule`, `testingConcepts`, `testingCompetencies`, `testingSources`, `testingReviewExercises`. Moduł `testing-quality` wymaga `iterators`, a pierwsza lekcja `iterator-contracts`. Lekcje to `testing-contracts`, `testing-regressions`, `testing-quality-workflow`.
- Lekcje analizatora: `src/content/log-analyzer.ts` eksportuje odpowiednie tablice i moduł `logAnalyzer*` oraz `logAnalyzerProject`. Moduł `log-analyzer` wymaga `testing-quality`. Lekcje to `log-records`, `log-streaming`, `log-analyzer-project`. Każde pojęcie ma dwa odrębne warianty z testami i powtórkę kodową. Raport końcowy zaczyna się od pustego edytora.
- Pakiet: `src/content/projects/log-analyzer.ts` eksportuje `logAnalyzerPackage` o ID `log-analyzer-workshop`. Brak zależności zewnętrznych. Format `TIMESTAMP LEVEL MESSAGE` zawiera dziesiętny znacznik u64, poziom INFO/WARN/ERROR i niepustą wiadomość UTF-8. Parser zachowuje całą pozostałą treść wiadomości. Deterministyczne podsumowanie obejmuje liczby dopasowanych poziomów i wadliwych wierszy. CLI przyjmuje plik i opcjonalny dokładny poziom. Błąd I/O daje stderr i niezerowy kod, bez częściowego wyniku sukcesu.
- Pakiet strumieniowy używa fragmentów BufRead o stałym rozmiarze. Przechowuj najwyżej 4096 bajtów wiersza. Opróżnij zbyt długi wiersz i zlicz jeden odrzucony rekord. Odrzucaj nieprawidłowy UTF-8 osobno dla każdego wiersza. Obsłuż CRLF i ostatni wiersz bez nowej linii. Nie gromadź rekordów, nieograniczonych kluczy wiadomości ani wszystkich diagnostyk. Sprawdź małe fragmenty, bardzo długi wiersz przed poprawnym, błąd I/O, pusty plik, duplikaty i ostatni wiersz bez końca linii.
- Ujawnienie rozwiązania oznacza pomoc tylko dla trzech głównych zadań Log Analyzer: `records-debug`, `stream-debug`, `report-blank`. Świeże warianty pozostają dostępne. Autorzy utrzymują zgodne identyfikatory.

## Zadania

- [x] Napisz trzy lekcje o asercjach i testach tabelarycznych, granicach i regresjach oraz testach jednostkowych, integracyjnych i dokumentacyjnych z pracą nad jakością. Ukryte testy wywołują funkcje asercji uczestnika względem poprawnych i wadliwych implementacji. Pusta asercja musi oblać test. Wyjaśnij odrębne role testów, formatowania i lintów. Lokalne polecenia Cargo służą samoocenie.
- [x] Napisz trzy lekcje Log Analyzer: pożyczony wynik parsowania i jawne błędy, przyrostowe podsumowanie z przekazywaniem błędów I/O i deterministyczny raport od zera. Warianty i powtórki zmieniają domenę. Odpowiednie testy sprawdzają Unicode, filtr a poprawność, duplikaty, ostatni wiersz i błąd odczytu.
- [x] Utwórz warianty Cargo startowy i referencyjny z README, testami jednostkowymi, integracyjnymi, dokumentacji i procesu, małym mieszanym logiem, ograniczoną implementacją strumieniową i opisem kosztów. Kod startowy kompiluje się, ale oblewa testy niedokończonego zachowania.
- [x] Zintegruj tablice, projekt i pakiet w `src/content/course.ts`. Dodaj testy integracji kryteriów modułu i regresję izolacji rozwiązania projektu. Określ testy offline obu pakietów i zmień wersję service workera tylko w razie potrzeby.
- [x] Przejrzyj zgłoszone przypadki testowe i twierdzenia dydaktyczne. Sprawdź odrzucenie wariantu startowego, akceptację rozwiązania, rzeczywistą czułość na celowe błędy, adresy źródeł oraz formatowanie, testy i Clippy pakietu. Napraw słabości przed rozszerzaniem treści.
- [x] Uruchom lint, sprawdzanie typów, Vitest, autorskie przypadki Rust, kontrole pakietów Cargo, kompilację produkcyjną i odpowiednie lub pełne regresje przeglądarkowe. Sprawdź dokładne wznowienie oraz wybór, pobranie i ujawnienie trzeciego projektu w izolowanym stanie. Obejrzyj komputer i widok mobilny, klawiaturę i konsolę.
- [x] Zaktualizuj README, audyt wymagań, plan materiału zaawansowanego i raport weryfikacji z faktycznymi liczbami, wynikami i brakami. Wykonaj lokalny commit po weryfikacji.

## Granice akceptacji

Etap obejmuje podstawy testowania i projektowania strumieniowego. Dalszy program zawiera narzędzia testów własności i fuzzingu, benchmarki i profile oparte na pomiarach, przestrzenie robocze, inteligentne wskaźniki, współbieżność, async, unsafe/FFI i utrzymanie systemów na poziomie senior. Wariant startowy i referencyjny nie zamykają całego kontraktu zaawansowanego Log Analyzer ani całego kursu.

## Notatka weryfikacyjna

Przeszły lokalne kontrole, regresje przeglądarkowe, próby pakietów z oczekiwanym niepowodzeniem i powodzeniem oraz tryb offline. Podstawowa próba zewnętrznego Playgrounda została przygotowana, jednak automatyczna kontrola zgody ją odrzuciła i czeka ona na odrębną zgodę użytkownika. Ograniczenie dotyczy weryfikacji usługi zdalnej, a wyniki lokalnych przypadków i aplikacji są zapisane w `docs/verification.md`.
