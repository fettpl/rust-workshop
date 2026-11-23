# Log Analyzer — pomiary alokacji w wybranym fragmencie działania programu

[English](2026-09-19-runtime-allocation-evidence.md)

## Cel

Uzupełnij pomiary w Profile Evidence autorską sondą, która w jednym procesie obserwuje alokacje podczas rzeczywistego parsowania w Log Analyzer. Naucz oddzielania przygotowania, pomiaru i sprzątania, porównywania identycznych obciążeń, rozróżniania wywołań alokatora od pomiarów pamięci i RSS oraz odrzucania niepełnych lub nieporównywalnych wyników.

## Zakres

- Rozszerz `profile-evidence` o dwie lekcje po polsku, dwa pojęcia, cztery zadania zaliczeniowe, dwie świeże powtórki i sześć ocenianych kroków.
- Zachowaj istniejący projekt Log Analyzer bez dodawania projektu.
- Dodaj przenośny w tym zakresie licznik `GlobalAlloc` dla `alloc`, `alloc_zeroed`, `dealloc` i `realloc`. Sam licznik nie alokuje.
- Porównaj wersję bazową, kandydata i celowy wariant materializujący dane z zachowaniem wyniku. Używaj identycznego wejścia i identycznego `Summary`.
- Weryfikuj na wersji stabilnej i dokładnym Rust 1.85 na Ubuntu i macOS, jeśli są dostępne. Nie przyjmuj uniwersalnego limitu alokacji ani czasu.
- Uzupełnij kontrole poprzedniego etapu async lending: zaliczenie, ujawnienie, wznowienie, offline, klawiatura i konsola. Popraw nieaktualne liczby.

Katalog po integracji ma mieć 171 lekcji, 44 moduły, 174 pojęcia, 126 zadań od pustego edytora i 13 projektów. Liczbę źródeł oblicz walidatorami.

## Lekcje

1. **runtime-allocation-scope** — przygotuj i rozgrzej dane przed oknem pomiaru. Zmierz rzeczywiste wywołanie parsera i zamknij okno zarówno dla `Ok`, jak i `Err`.
2. **runtime-allocation-comparison** — porównaj bazę i kandydata dla tego samego wejścia i wyniku. Rozróżnij wywołania alokatora, liczbę żądanych bajtów i zachowaną pamięć. Odrzucaj niepełne i nieporównywalne wyniki.

Każda lekcja obejmuje przewidywanie, kontrastowe wykonanie, interpretację, główne zadanie, świeże zadanie transferu i niezależną powtórkę. Zachowaj schemat v3, dotychczasowe ID, politykę ujawniania i wymagania dowodów samodzielności.

## Zmiany w archiwum autorskim

Dodaj do pakietu Log Analyzer:

- `examples/allocation_probe.rs`
- `examples/support/allocation_counter.rs`
- `tests/allocation_counter_contract.rs`
- `ALLOCATION-MANIFEST.json`
- `ALLOCATION-EVIDENCE.md`

Użyj istniejącego generatora projektu. Sonda działa w jednym procesie i jednym wątku. W oknie pomiaru nie uruchamia libtest. Raportuje obserwowane wywołania globalnego alokatora dla nazwanego okna. RSS, rozmiar stosu i całkowita pamięć systemowa są poza pomiarem. Przygotowanie, rozgrzewka, formatowanie i sprzątanie znajdują się poza oknem. Nieudane `realloc` nie zwalnia starego bloku. Nie wywołuj rzeczywistego OOM.

Zmierz `analyze_reader(Cursor<&[u8]>, filter)` dla pustego wejścia, 512 poprawnych rekordów, powtórzonego obciążenia, błędnego wejścia i przypadków UTF-8/CRLF oraz granic wiersza. Baza i kandydat mają zwracać identyczne `Summary`. Celowo zmieniony wariant zachowuje wynik, ale materializuje posiadane dane podczas parsowania. Pomiar musi wykazać tę różnicę na obsługiwanych kompilacjach. Niejednoznaczny wynik instrumentacji oznacza awarię pomiaru.

## Treść i weryfikator

Dodaj:

- `src/content/runtime-allocation-evidence.ts`
- `src/content/runtime-allocation-assessment-fixtures.ts`
- `src/content/runtime-allocation-assessment.test.ts`
- `src/content/runtime-allocation-integration.test.ts`
- `scripts/verify-allocations.ts`
- `src/content/allocation-verification.test.ts`

Zaktualizuj `src/content/profile-evidence.ts`, `src/content/course.ts`, skrypty pakietu i CI. Dodaj `content:allocations` przyjmujące wyłącznie `--fetch` i `--msrv`. Ograniczony weryfikator odtwarza i porównuje oba archiwa autorskie, weryfikuje skróty manifestu i źródeł, wykonuje fmt/check/test/Clippy offline oraz uruchamia bazę, kandydata i celowo zmieniony wariant w oddzielnych procesach. Zapisuje JSON z łańcuchem narzędzi, platformą docelową, profilem kompilacji, SHA archiwum, tożsamością obciążenia i limitami.

Celowe błędy oceny obejmują pomiar przygotowania, raportowanie w oknie, pozostawienie okna otwartego przy błędzie, odmienne dane wejściowe, ignorowanie różnych wyników i uznawanie niepełnych raportów za poprawę. Poprawne alternatywy dla głównych, pustych i powtórkowych zadań muszą różnić się implementacją.

## Integracja z poprzednim etapem i dokumentacją

Dodaj w dotychczasowym E2E i offline ścieżkę async od wyszukiwania przez zaliczenie i ujawnienie do niezależnego transferu. Sprawdź dokładne wznowienie, ZIP offline, klawiaturę i błędy konsoli. Popraw `advanced-curriculum.md:113` na pięć kryteriów z dziesięcioma zadaniami głównymi i pustymi oraz pięcioma powtórkami. Zaktualizuj nagłówki audytu, sformułowanie „Po async lending”, liczby, postęp, weryfikację, README i CI/CD. Zachowaj szerszy status Hold.

## CI i akceptacja

Dodaj zadanie `allocation-evidence` dla Ubuntu i macOS oraz wersji stabilnej i dokładnego Rust 1.85, jeśli pozwala koszt środowisk CI. Minimalny zakres to Ubuntu stable/MSRV i macOS stable. Zachowaj istniejące zadania i artefakty oraz wyniki fuzz/Miri/profile. Nowy licznik nie wymaga Valgrinda. Uruchom sprawdzanie typów, testy, kontrole i audyt treści, kompilację, produkcyjny E2E, offline, przypadki Rust, archiwa stable/MSRV i `git diff --check`.

## Poza zakresem

Poza zakresem są uniwersalna liczba alokacji, próg czasu, RSS, profiler systemowy, przypisywanie alokacji wielu wątkom, alokator produkcyjny, nowa usługa wykonawcza, wykonywanie kodu uczestnika i usuwanie historycznych ograniczeń. `black_box` jest wskazówką dla optymalizatora. Szersze testy własności i fuzzing, eksploatacja produkcyjna, przegląd ostrzeżeń i licencji, publikacja w rejestrze i pilotaż pozostają otwarte.

Planowanie i przegląd jakościowy wykonuje GPT-6-Astra (medium). Wdrożenie, testy, dokumentację i operacje Git wykonuje GPT-5.6-Luna (high).
