# Weryfikacja: pożyczone API, wariancja i HRTB

Data: 13 września 2026. Katalog obejmuje 122 lekcje w 33 modułach, 125 pojęć, 77 zadań blank-page, 7 śladów pamięci, 249 wpisów źródłowych i 8 projektów z pakietami Cargo. Bieżący moduł `borrowed-callbacks` dodaje cztery lekcje po closures, osiem bramek i cztery osobne kodowe powtórki. Nie zmienia zależności ani pakietów Cargo.

## Kontrole bieżącego etapu

| Sprawdzenie | Wynik |
| --- | --- |
| Vitest | 172/172 w 37 plikach, ponownie po końcowej korekcie opisów |
| TypeScript i ESLint | Bez błędów; lint bez ostrzeżeń |
| Curriculum | Walidacja poprawna: 122 lekcje, 125 pojęć, 7 śladów; żadnych brakujących bramek ani aktywnych powtórek |
| Źródła | 249/249 wpisów ma HTTP 200, brak uszkodzonych odwołań |
| Rust | 1397/1397 przypadków całego katalogu; po poprawkach testów ponownie 56/56 przypadków nowego modułu (w tym dwa wspólne sprawdzenia weryfikatora) |
| Niezależna recenzja | Dwie recenzje treści i osobna recenzja integracji zamknięte; oryginalne błędne warianty są odrzucane |
| Build i E2E | Produkcyjny build i 47/47 E2E bez retry; po końcowej korekcie opisów ponowny build i test dotkniętego modułu (1/1) |
| Offline | Finalny cache v23; osiem ZIP-ów zachowuje identyczne bajty, nieodwiedzony nowy moduł przywraca krok, szkic i hint; brak pageerrors |
| Ręczny UI | Mapa i kontrakty czytelne; strzałki przełączają Zadanie → Kod → Output; finalna treść polecenia potwierdzona, brak błędów i ostrzeżeń konsoli |

## Zakres nowych kontraktów

Współdzielone widoki używają bezpośrednich generycznych konwersji struktur, aby sprawdzić relację lifetimes. Mutowalne API rozdziela czas pożyczki slotu od czasu danych w jego wnętrzu. Testy obejmują własność lokalną, granice prefiksu i podziału, tożsamość widoków i brak zmiany slotu dla błędnego wejścia. Przykłady funkcji rozdzielają kierunek zgodności argumentu i wyniku.

Lokalny odwiedzający zwraca ustalony typ R, a projekcja zwraca widok związany z każdą kolejną pożyczką. Testy sprawdzają kolejność i liczbę wywołań, Unicode, pustkę, pierwszy błąd, pierwszy Some i odróżnienie Some(0) od None. Typ błędu i stan przechwycony przez callback mogą pożyczać lokalne dane. Poprawny statyczny fallback jest dozwolony: relacja lifetime gwarantuje ważność wyniku, a nie jego pochodzenie z fragmentu wejścia.

Niezależny przegląd wykrył niewystarczające asercje brzegowe i nadmiernie statyczne dane testowe. Wymagał też jawnych wyników w poleceniach powtórek i formatowania kodu Rust wewnątrz ciągów TypeScript. Referencje przechodzą, a oryginalne błędne warianty akceptowane przez wcześniejsze testy są odrzucane: zmiana długości slotu przy tym samym adresie, zdublowane widoki na granicy podziału, zapis obciętego następnego tekstu i zbędny wymóg statycznych danych. Poprawiony opis pustego zakresu wymaga zapisu pustego widoku i zwrotu poprzedniego; nie myli niezmienniczości typu z niezmiennością wartości.

Test integracyjny ujawnia wszystkie cztery główne rozwiązania, zapisuje wspomagane próby i wykonuje export/import. Taki zapis nie zalicza żadnego z czterech kryteriów; każde świeże zadanie pozostaje dostępne. Cztery samodzielne próby zaliczają moduł, a wcześniejszy szkic Number Guessing i notatka projektu pozostają zachowane. Istniejące identyfikatory, runner i schemat zapisu v3 nie zmieniają się.

## CI i scalenia

Bieżący moduł ma zakończone lokalne kontrole i niezależne recenzje. Commit, push i CI aktualnego head poprzedzą scalenie tego bloku.

[PR #7: Number Guessing+](https://github.com/fettpl/rustcrushcourse/pull/7) jest scalony jako `f94b87edf0423acc7a57abf6a97652baf6213515`. [CI dokładnego head 451e3a3](https://github.com/fettpl/rustcrushcourse/actions/runs/34749313613) zakończyło wszystkie trzy joby sukcesem. Powtórzony [przebieg na main](https://github.com/fettpl/rustcrushcourse/actions/runs/34749710087) również zakończył wszystkie trzy joby sukcesem.

Pierwszy przebieg Number Guessing+ ujawnił zależność kontroli startera od kolejności zestawów Cargo. `--no-fail-fast` pozwala sprawdzić bezpośrednie kontrakty mimo wcześniejszego błędu nieukończonego procesu CLI; weryfikator nadal wymaga niezerowego wyniku, nieudanych testów i śladu `todo!`. Poprawka przeszła stable, dokładny Rust 1.85.0 i wszystkie osiem pakietów. GitHub wielokrotnie zwracał HTTP 500 z API merge. Zwykłe scalenie w czystym tymczasowym worktree dało drzewo identyczne z przetestowanym head, a push bez force zaktualizował main; GitHub potwierdził scalenie PR.

Historyczny raport Number Guessing+ jest zachowany w wersji `451e3a3` tego pliku: 171 testów Vitest, 1343 przypadki Rust, 252 Tokio, Loom, 8 pakietów Cargo, stable/MSRV, cztery mutacje Number Guessing+, dziesięć mutacji Frame Protocol, fuzz Mini grep, 237 źródeł, 46 E2E bez retry, offline v20 i ręczny UI. Nowe CI ponownie sprawdza także te niezmienione części.

Wcześniejszy [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), Mini grep i CI, został scalony jako f49e9fb po [udanym CI 5e12660](https://github.com/fettpl/rustcrushcourse/actions/runs/34746892334); [CI po merge](https://github.com/fettpl/rustcrushcourse/actions/runs/34747218768) również przeszło. Wcześniejszy [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest scalony w 64667e4. Historyczne wyniki nie zastępują kontroli aktualnego SHA.

Zasady tokenów, przypiętych akcji, MSRV, fuzz, diagnostyki i ograniczenia planu GitHub opisuje [CI/CD](ci-cd.md). Docelowy hosting nadal nie został wybrany; wdrożenie aplikacji pozostaje nieskonfigurowane.

## Odtworzenie

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:models -- --fetch
npm run content:guessing -- --fetch
npm run content:guessing -- --msrv
npm run content:cargo
npm run content:fuzz -- --fetch
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:audit -- --check-links
npm run build
# osobny terminal: npm start -- --port 3002
npx --no-install playwright test --config .github/playwright.production.config.ts --retries=0
npm run test:offline
```

Instalacja toolchainów i cargo-fuzz jest opisana w README. Weryfikatory wykonują wyłącznie zaufane pliki repozytorium w katalogach tymczasowych, bez kodu z importów ucznia i bez nowego POST do publicznego Playgrounda. E2E podstawia kontrolowane odpowiedzi runnera. Dwa wspólne sprawdzenia weryfikatora powtarzają się w przebiegach częściowych, więc ich wyników nie należy bezpośrednio sumować.

## Pozostały zakres

Cel zaawansowanego kursu pozostaje otwarty: Cargo i publikowanie, GAT i lending async, wariancja abstrakcji unsafe, szersze property/fuzz, pomiary, unsafe/FFI, utrzymanie systemów i capstone. Automatyczne ponawianie rund Number Guessing+ oraz nagranie code reading pozostają rozszerzeniem portfolio. Testy kontraktów nie dowodzą szybkości, pełnego memory model ani jakości statystycznej generatora. Audyt zachowuje luki trwałej historii migracji i pochodzenia wersji materiału. Pilotaż z uczącą się osobą oraz ręczna ocena czytnikiem ekranu pozostają do wykonania.
