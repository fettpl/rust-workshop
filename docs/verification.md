# Weryfikacja etapu: moduły, Cargo i Todo z plikami

Data: 12 września 2026. Bieżący zakres obejmuje 35 lekcji w 8 modułach. Ostatni etap dodał cztery lekcje modułów/Cargo, trzy lekcje IO oraz pobierany projekt terminalowy. Środowisko: macOS, Node.js 22+, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki wykonanych kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów |
| Vitest | 86/86 testów w 13 plikach |
| Walidacja curriculum | 35 lekcji, 8 modułów, 39 pojęć, 6 śladów pamięci |
| Rzeczywisty rustc | 400/400 autorskich przypadków: kompilacja, wykonanie, oczekiwane błędy, testy evaluatorów i odrzucanie niepełnej implementacji |
| Pakiet Cargo | Starter przechodzi fmt/check i oczekiwanie oblewa testy nieuzupełnionych funkcji; rozwiązanie przechodzi fmt/check/test/clippy z zakazem ostrzeżeń. 19 testów integracyjnych obejmuje prawdziwe procesy CLI. |
| Playwright | 16/16 scenariuszy; po ostatniej korekcie odstępów dodatkowo sprawdzony zakres projektów |
| Produkcyjny build Webpack | Poprawny |
| Audyt źródeł z kontrolą HTTP | 56/56 wpisów z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnych powtórek i lekcji bez evidence gate |
| Rzeczywisty Playground przez API aplikacji | 7/7 przypadków, 11 testów: E0616 i naprawa, format Todo, rzeczywiste pliki i granica polecenia Todo oraz niezależne warianty Notebook |
| Produkcyjny offline | Cache rust-workshop-v6; dokładny krok, szkic i notatka przetrwały odłączenie sieci i reload. Pobierany ZIP po otwarciu projektu online jest dostępny offline i ma identyczne bajty. |
| Dostępność i mobile | Brak naruszeń axe na testowanych ekranach; brak poziomego przepełnienia przy 390 px. Przeglądarka plików, selektor, pobranie i obszar kodu dostępne klawiaturą. |
| Konsola | Brak page errors w teście produkcyjnego offline |

Odtwarzanie głównego zestawu:

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:cargo
npm run content:audit -- --check-links
npm run build
npm run test:e2e
```

Przy działającym produkcyjnym serwerze na porcie 3002:

```sh
RUST_WORKSHOP_URL=http://127.0.0.1:3002 node --import tsx scripts/smoke-cargo-io.ts
npm run test:offline
```

E2E używa kontrolowanych odpowiedzi runnera dla powtarzalności. Osobny smoke wysyła wyłącznie autorskie przykłady repozytorium do rzeczywistego izolowanego Playgrounda. Lokalne rustc i Cargo wykonują wyłącznie zaufane fixture'y kursu, nigdy szkice ucznia. Testy IO runnera korzystają z jego tymczasowego systemu plików; nie sprawdzają trwałości między oddzielnymi żądaniami.

## Audyt materiału i pakietu

- **Moduły i Cargo:** ćwiczenia obejmują ścieżki crate/self/super, prywatność pól i walidację konstruktora, use/alias/re-eksport oraz granicę klienta biblioteki. Oczekiwane diagnostyki są sprawdzane przez rustc. Zadania i powtórki mają testy rzeczywistego API, a ostatnia lekcja zawiera zadanie od pustej kartki. Jednoplikowy runner nie jest przedstawiany jako dowód konfiguracji fizycznego pakietu Cargo.
- **Format:** zapis i odczyt zachowują dokładne tytuły, tabulatory, spacje brzegowe, Unicode, kolejność, flagi i duplikaty. Dekoder odrzuca złą wersję, BOM, CR/CRLF, brak końcowego LF, puste rekordy oraz niepoprawne statusy i tytuły. Testy sprawdzają konkretne numery linii błędów. Krótki eksperyment początkowy nie ujawnia pełnej implementacji kodeka Todo.
- **Pliki:** tylko NotFound oznacza nowy pusty stan. Błędy UTF-8, formatu i odczytu nie resetują danych. Testy sprawdzają rzeczywisty zapis i odczyt, zastany plik/katalog .tmp, nieistniejący katalog rodzica i błąd rename. Cleanup dotyczy wyłącznie własnego pliku tymczasowego i zachowuje pierwotny błąd.
- **Granica CLI:** parser poprzedza odczyt, każde polecenie ładuje świeży stan, list nie zapisuje, a sukces jest zwracany dopiero po zapisie. Testy sprawdzają duplikaty, powtórzone done, błędy domeny, uszkodzony plik i nieudany zapis bez fałszywego sukcesu.
- **Rzeczywisty pakiet:** 11 plików, edition 2024, biblioteka i binarka bez zależności. Pięć funkcji startowych wymaga implementacji. Testy obejmują argument ścieżki, stdin, stdout/stderr, EOF/quit, kody zakończenia i dane po restarcie. Wariant referencyjny zmienia tylko storage.rs i app.rs.
- **Archiwa:** generowane przed dev/build. Weryfikator porównuje dokładne bajty pliku do pobrania, rozpakowuje go i wykonuje Cargo na rozpakowanej zawartości. Walidacja odrzuca ścieżki wychodzące z katalogu, kolizje nazw i błędną wielkość liter w wymaganych ścieżkach. Sukces cargo test bez żadnego testu nie wystarcza.

Niezależny review kodu pakietu nie znalazł usterki utraty danych w przyjętym zakresie jednego autora. Wskazał dwie luki walidacji: wielkość liter w nazwie manifestu oraz możliwość zaakceptowania zerowej liczby testów. Obie poprawiono; test błędnej nazwy najpierw wykazał problem, następnie przeszedł po poprawce. Review dydaktyczny usunął pełne rozwiązanie formatu z demonstracji poprzedzającej ćwiczenie.

## Produkt i zachowanie istniejącej pracy

- Projekt Todo prowadzi do bieżącej lekcji i dokładnego kroku albo pierwszej nieukończonej części. Regresja sprawdza powrót do środkowej lekcji zamiast restartowania całego projektu.
- Pobranie plików nie dodaje mastery ani completion. Odsłonięcie rozwiązania oznacza pomoc wyłącznie dla format-debug, file-debug i cli-debug. Zachowuje szkice, ukończenie i wcześniejsze dowody. Warianty Notebook mają inne funkcje, format, polecenia i plik roboczy; pozostają dostępnymi zadaniami transferowymi.
- Schemat zapisu pozostaje v3; istniejące identyfikatory, migracje v1/v2, import/export, notatki i ustawienia pozostają kompatybilne. Powtórka zakończona nie nalicza kolejnego dowodu po reloadzie.
- Sprawdzono wizualnie podgląd plików. Uporządkowano zbyt ciasne przyciski powtórek w retrospektywie. Dotychczasowa regresja zachowuje onboarding, diagnostykę, light/dark, Focus Mode, zakładki mobilne, notatki, zakładki i eksport.

## Pozostałe ograniczenia

Nie przeprowadzono pilotażu z rzeczywistymi uczącymi się. Testy techniczne nie dowodzą skuteczności nauczania ani gotowości zawodowej. Potrzebne są nowe zadania bez pomocy, uzasadnienie decyzji oraz transfer po ponad dobie. Dłuższe lekcje projektowe IO mają oszacowane 40–45 minut; rzeczywiste tempo i potrzebę podziału należy sprawdzić w pilotażu.

Pełne curriculum nie jest ukończone. Generics, traits, lifetimes, dalsze działy oraz kompetencje zawodowe pozostają w rozwoju. [Audyt wymagań](requirements-audit.md) rozróżnia wykonane i brakujące elementy, a [mapa zaawansowanego kursu](advanced-curriculum.md) opisuje dalsze etapy.

Protokół plików zakłada jednego autora; nie zapewnia pełnej trwałości po awarii zasilania ani współbieżnych aktualizacji. Nie wstrzykiwano sprzętowych błędów write_all/sync_all ani błędu zapisu stdout. Test argumentu spoza UTF-8 jest dostępny na Unix. Uruchomienie pakietu przez ucznia poza aplikacją nie jest automatycznie obserwowane ani oceniane.

Wykonanie kodu w przeglądarce wymaga internetu i dostępności sandboxa. Ślady pamięci są przygotowanym modelem dydaktycznym. Otwarte testy i lokalny zapis nie stanowią uwierzytelnionego egzaminu; ograniczenia wzorców źródła nie zastępują AST. Ręczny test czytnikiem ekranu pozostaje do wykonania.

Dodano deweloperską zależność fflate do budowy ZIP. npm install nadal raportował dwie pozycje Monaco/DOMPurify (moderate i low, bez high/critical); nie wykonywano wymuszonej aktualizacji zależności. Kontrolę dynamicznych źródeł należy ponawiać przy zmianie stable Rust, edition albo adaptera runnera.
