# Rust Workshop — plan wdrożenia

[English](2026-09-12-rust-workshop.md)

> Dla agentów wdrażających plan: użyj procedury subagent-driven-development. Zadania o rozłącznych zakresach prowadź równolegle.

**Cel.** Ukończyć i zweryfikować pierwszy etap nauki własności zgodnie z wymaganiami użytkownika.

**Architektura.** Współdzielone kontrakty typowanej treści, czysta logika nauki, adapter izolowanego środowiska wykonawczego, wersjonowany stan lokalny i interfejs złożony z komponentów.

**Stos technologiczny.** Next.js, React, TypeScript w trybie ścisłym, Tailwind, Monaco, IndexedDB, Vitest, Playwright.

**Specyfikacja.** docs/superpowers/specs/2026-09-12-rust-workshop-design.md

## Ograniczenia globalne

Stabilny Rust, edycja 2024. Interfejs po polsku. Lokalne wykonanie ograniczone do zaufanych materiałów. Migracja zachowuje postępy. Ukończenie zadania wymaga dowodu, a samo kliknięcie nie podnosi poziomu opanowania. Rozszerzenie zakresu wymaga przeglądu pierwszego etapu.

## Zadania

- [x] 1. Opiekun główny przygotowuje szkielet projektu i współdzielone kontrakty w src/domain/types.ts. Instaluje aktualne zależności i przypina plik blokady.
- [x] 2. Autor treści odpowiada za src/content/*.ts, scripts/validate-content.ts, scripts/verify-rust.ts i testy treści. Uzupełnia dane modułu i projektu, metadane źródeł oraz dane do wizualizacji przebiegu. Sprawdza relacje i weryfikuje każdy uruchamialny przykład autorski, także przykłady z celowymi błędami.
- [x] 3. Autor logiki odpowiada za src/engine/*, src/persistence/* i ich testy. Zaczyna od testów. Dowód pracy samodzielnej ma większą wagę niż próba po ujawnieniu rozwiązania. Powielanie zdarzeń nie zawyża wyniku. Potwierdzenie utrwalenia wymaga odroczonej powtórki. Migracja z v1 zachowuje szkice i notatki. Niepoprawne dane importu są odrzucane. Następnie wdraża czyste funkcje oceny, logikę opanowania i powtórek oraz zapis stanu.
- [x] 4. Autor środowiska wykonawczego odpowiada za src/runner/*, src/app/api/run/route.ts i testy. Weryfikuje oficjalny interfejs usługi nadrzędnej i testuje rozróżnianie sukcesu, błędu kompilacji, błędu wykonania, niepowodzenia testu, przekroczenia limitu czasu i awarii infrastruktury. Sprawdza limity żądań i brak lokalnych procesów potomnych. Zachowuje wyjście stderr.
- [x] 5. Opiekun główny odpowiada za src/components/*, szkielet i style aplikacji. Wdraża wprowadzenie, diagnozę, pulpit, kontrakt i mapę kursu, obszar lekcji sterowany danymi, Monaco, wyniki, wskazówki, sterowanie wizualizacją, dziennik, powtórki, projekt, ocenę i ustawienia. Każde działanie zapisuje dokładny krok i szkice. Dodaje szkielet i ikony PWA.
- [x] 6. W ramach integracji uruchom npm run lint, npm run typecheck, npm test, npm run content:check, npm run content:rust, npm run build. Każdy błąd napraw w obszarze, do którego należy.
- [x] 7. Dodaj scenariusze w tests/e2e. Sprawdź klawiaturę i ponowne załadowanie na komputerze i urządzeniu mobilnym, konsolę oraz rzeczywisty zrzut ekranu. Wykonaj podstawową próbę usługi wykonawczej. Oceń jakość dydaktyczną i uzupełnij braki.
- [x] 8. Opisz w README uruchomienie, ograniczenia, architekturę, granicę zaufania usługi wykonawczej, utrzymanie źródeł i odtwarzalną weryfikację. Zapisz końcowe wyniki akceptacji w docs/verification.md.

## Interfejs i rejestr przeglądów

Zadanie 1 dostarcza typy dla zadań 2–5. Typy stanowią jedyny wspólny interfejs, a zmiany schematu należą do opiekuna głównego. Zadania 2, 3 i 4 mają rozłączne zestawy plików. Zadanie 5 używa ich eksportów. Zadanie 6 integruje zmiany, a zadanie 7 ocenia obserwowalne zachowanie.

Prace odbywają się w pustym, udostępnionym repozytorium. Brak wcześniejszych zmian użytkownika oznacza, że drugi pusty katalog roboczy nie da dodatkowej izolacji.

Szczegółowe wymagania użytkownika upoważniają do decyzji wdrożeniowych i samodzielnej pracy w kolejnych iteracjach. To odwracalne wdrożenie lokalne objęto udzieloną zgodą.
