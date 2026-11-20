# Async foundations — plan implementacji

**Cel:** zbudować model Future, await, przechwytywania i anulowania przed praktyką runtime Tokio. To kolejny etap zatwierdzonej mapy zaawansowanego kursu; pełny zakres Tokio, bounded pipeline, timeout, select i graceful shutdown pozostaje wymagany.

**Architektura:** moduł danych korzysta z istniejących kroków lekcji, testów Rust 2024, mastery, powtórek i dokładnego wznowienia. Ćwiczenia używają rzeczywistych Future z std. Testy jawnie sterują skończoną liczbą poll; nie nazywamy tego executor’em ani testem Tokio. Kod szkiców i importu nigdy nie trafia do lokalnego rustc.

**Podstawa:** oryginalny brief, zaakceptowane autonomiczne rozszerzanie kursu i `docs/advanced-curriculum.md`, etap 17. Podejście: najpierw rzeczywista semantyka języka ze sterowaną obserwacją Pending/Ready; następnie osobny etap runtime i integracji Tokio. Zaczynanie od własnego executora przesunęłoby naukę z używania async na infrastrukturę. Sam pakiet Tokio bez ćwiczeń w aplikacji nie spełnia docelowego kontraktu.

## Kontrakty i pliki

- Integracja: `src/content/async-foundations.ts`; osobne dane lekcji i powtórek w `async-ownership.ts` oraz `async-cancellation.ts`. Eksporty asyncFoundationsLessons, Concepts, Competencies, Sources, ReviewExercises, Module pozostają wspólną granicą dla course.ts. Moduł async-foundations po memory-ordering.
- Cztery lekcje i pojęcia: future-laziness (po loom-evidence), await-progress, future-ownership, future-cancellation. Każde ma dwa różne zadania kodowe, w tym bez startera, oraz kodową powtórkę. Nie kopiować kontraktu pierwszej bramki pod nową nazwą.
- Wymagane rozróżnienia: utworzenie async future a obliczenie argumentów; await a spawn; Pending a blokowanie; Ready nie daje prawa do ponownego poll; async move przenosi wartości także przed pierwszym poll, ale nie przedłuża życia referencji; porzucenie przyszłości zatrzymuje jej dalsze poll, nie cofa skutków i nie musi zatrzymać niezależnego zadania.
- Testy używają bezpiecznego pinowania i aktualnego Context/Waker. Ręczne poll wyłącznie dla kontrolowanych gotowych lub jawnie sterowanych przyszłości; brak spin loop, sleep i unsafe. Sterowane Pending musi mieć opis budzenia, a test ma sprawdzić użycie przekazanego Waker tam, gdzie jest częścią kontraktu.
- Root: integracja w course.ts, test niezależności bramek, E2E na nowym module, README/audyt/mapa/weryfikacja. Żadnej migracji lub zmiany wcześniejszych ID.
- Niezależny agent: `docs/superpowers/plans/2026-09-12-tokio-integration-research.md` — plan rzeczywistego Tokio w runnerze i zaufanej weryfikacji Cargo, wyłącznie odczyt publicznych źródeł; bez wysyłania przykładów do Playgrounda.

## Kontrola

- [x] Najpierw czerwony test obecności modułu i niezależności czterech kryteriów; po rejestracji modułu test przechodzi.
- [x] Autor sprawdza wszystkie zaufane przykłady, poprawne rozwiązania i wymagające poprawy startery; root recenzuje API, kontrakty i przenoszenie własności.
- [x] Testy obserwują działanie kodu: zero efektów ciała przed poll, propagację Pending, kolejność await, zachowanie własności i Drop oraz brak obietnicy rollback.
- [x] Próby celowo wadliwych rozwiązań: eager effect, pominięty await, zignorowana druga przyszłość lub błąd, utrata własności, fałszywa obietnica anulowania.
- [x] Lint, typecheck, Vitest, walidacja treści, rzeczywisty rustc, źródła HTTP i produkcyjny build.
- [x] Przeglądarka: predykcja z kodem, blank-page, reveal z zachowaną alternatywą, resume i mobile. Offline nowego modułu i dotychczasowych pakietów.
- [x] Przegląd checkpointu oraz aktualizacja rzeczywistych wyników i pozostałego zakresu.
- [x] Commit etapu f2b052c, push i scalenie pierwszego PR-a w 64667e4; oba przebiegi GitHub CI zakończone sukcesem.

## Korekty po przeglądzie

Pierwsza wersja materiału miała zbyt podobne warianty bramek i testy, które obserwowały liczbę znaków zamiast życia przejętego zasobu. Zastępujemy je zewnętrznym DropProbe, kontrolą bieżącego Waker oraz odmiennymi kontraktami fabryki, kolejki, sekwencji, własności i anulowania. Blank-page podaje wymagane API w prozie bez gotowej sygnatury i bez listy kroków rozwiązania.

Kontrolowane przyszłości zwracające Pending przed gotowością zgłaszają wake albo zapisują aktualny Waker wyzwalany przez test. `std::future::pending()` jest osobnym, jawnym przypadkiem przyszłości, która nigdy nie będzie gotowa. Nie wymaga tworzenia pozornego zdarzenia gotowości. Testy nie uruchamiają pętli wykonawczej.

Druga niezależna recenzja (GPT-5.6-Terra xHigh) wykryła zbędne ograniczenia static w defer_factory. Dodany test pożycza lokalny String i zwraca &str; najpierw wykazał E0373, a po usunięciu obu ograniczeń przechodzi.
