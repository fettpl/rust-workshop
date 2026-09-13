# Tokio: runtime i odpowiedzialność za zadania

Punkt wyjścia: async foundations zostało zapisane w f2b052c, oba przebiegi GitHub CI zakończyły się sukcesem, a PR #1 został scalony w 64667e4. Poprzednia tura stanowiła zweryfikowany postęp. Kurs pozostaje niekompletny względem pełnej mapy mid/senior.

## Zakres zatwierdzonego etapu

Cztery lekcje po async-foundations: tokio-runtime-entry, tokio-spawn-join, tokio-task-boundaries, tokio-join-outcomes. Moduł tokio-runtime-tasks obejmuje rzeczywisty current-thread runtime, uruchamianie niezależnych zadań, granicę Send/static i odpowiedzialność za wynik każdego JoinHandle. Każde pojęcie ma dwie różne bramki, jedną od pustej kartki, i kodową powtórkę. Nie zastępujemy Tokio ręcznym poll ani std::thread. Kanały bounded, backpressure, timeout/select, cancellation i graceful shutdown pozostają osobnym wymaganym etapem; oneshot w testach służy jawnemu potwierdzeniu zdarzeń.

Projekt kontynuuje zaakceptowaną mapę, z wykorzystaniem brainstorming i writing-plans. Wybieramy oddzielną weryfikację Cargo dla danych repozytorium; rozszerzanie lokalnego runnera o kod ucznia lub arbitralny Cargo.toml nie należy do tego projektu.

## Podział pracy i kontrakty

- Agent GPT-5.6-Terra xHigh: cztery lekcje, koncepcje, kompetencje, źródła, powtórki i moduł w src/content/tokio-runtime-tasks.ts; może dzielić własne pliki danych. Root recenzuje wszystkie kontrakty i rozwiązania.
- Root: metadane trustedFixtureTarget, walidacja, oddzielny statyczny profil Cargo i weryfikator z testami, rejestracja modułu, E2E/offline, dokumentacja oraz commit.
- Weryfikacja używa edition 2024 i tokio = "=1.53.1" z macros, rt, sync oraz zatwierdzonego Cargo.lock. Brak czasu ściennego, sieci, tokio-util i niekontrolowanych zależności w przykładach tego etapu.
- LessonStep może oznaczyć trustedFixtureTarget = cargo-tokio-runtime-1.53.1. To informacja wyłącznie dla weryfikacji autora. RunRequest zachowuje code/mode/tests; żadna zależność, ścieżka czy manifest nie pochodzi z żądania przeglądarki.
- Domyślny weryfikator rustc musi jawnie rozdzielić przypadki std i Tokio, odrzucając nieznane cele. Nowy weryfikator importuje wyłącznie zaufaną treść repozytorium; obejmuje kod widoczny, oczekiwane błędy, startery z testami, rozwiązania, zadania blank i powtórki. Brak testów, timeout, błąd zależności i błąd infrastruktury nie są dowodem odrzucenia złego rozwiązania.
- Testy rozróżniają task identity i własność wyników, nie opierają poprawności na kolejności schedulera, sleep, limicie yield ani samym timeout. Lokalne Future mogą pożyczać i być !Send; wymagania Send/static pochodzą z konkretnego API spawn.
- Jeden błąd join nie może ukryć wyniku drugiego zadania. Drop JoinHandle odłącza zadanie; zakończenie obserwujemy przez jawny kanał potwierdzenia i nie nazywamy go anulowaniem.

## Weryfikacja i granice

- [x] Najpierw testy rozdziału celów, walidacji Tokio i kompletności czterech kryteriów.
- [x] Stały profil Cargo, Cargo.lock oraz wykonanie wszystkich zaufanych przykładów Tokio offline/locked po kontrolowanym fetch.
- [x] Recenzja bramek, błędów kompilatora, własności i niezależnych powtórek; testy celowo wadliwych implementacji.
- [x] Lint, typy, Vitest, treść, źródła, dotychczasowe przykłady Rust, build i odpowiednie regresje.
- [x] Nowe lekcje w przeglądarce, błędy/wskazówki, reveal/blank, resume/mobile i offline.
- [x] Aktualizacja audytu całego pierwotnego briefu i mapy pozostającego zakresu, commit po domknięciu etapu.

Publiczny GET /meta/crates sprawdzony 12 września 2026 potwierdził Tokio 1.53.1 i tokio-util 0.7.19. Nie dowodzi to kontraktu features ani stałości prelude. Zewnętrzne wysłanie przykładów do Playgrounda nadal nie zostało autoryzowane; testy przeglądarkowe używają kontrolowanych odpowiedzi runnera. Szkice i importy ucznia nigdy nie trafiają do lokalnych poleceń Cargo/rustc.

Wynik etapu: 90 lekcji / 25 modułów / 93 pojęcia / 167 źródeł / 45 blank-page. Vitest 137/137, rustc 1207/1207, Cargo Tokio 50/50, dziewięć kompilujących się mutantów odrzuconych przez asercje, E2E 34/34 plus ponowna kontrola dwóch scenariuszy Tokio z axe przy 390 px. Build i offline v14 przeszły; szczegóły i ograniczenia w docs/verification.md. Pełny cel zaawansowanego kursu pozostaje otwarty.
