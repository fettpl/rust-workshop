# Weryfikacja etapu: kolekcje, błędy i rdzeń Todo

Data: 12 września 2026. Bieżący zakres obejmuje 28 lekcji w 6 modułach: fundamenty, własność, modelowanie danych, kolekcje, obsługę błędów oraz rdzeń Todo. Ostatni etap dodał 9 lekcji i obsługę wielu projektów. Środowisko: macOS, Node.js 22+, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki wykonanych kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów |
| Vitest | 83/83 testy w 12 plikach |
| Walidacja curriculum | 28 lekcji, 6 modułów, 32 pojęcia, 6 śladów pamięci |
| Rzeczywisty rustc | 304/304 przypadki autorskie: kompilacja, wykonanie, oczekiwane błędy, testy evaluatorów i odrzucanie pustej implementacji |
| Playwright | 14/14 scenariuszy |
| Produkcyjny build Webpack | Poprawny |
| Audyt źródeł z kontrolą HTTP | 34/34 wpisy z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnych powtórek i lekcji bez evidence gate |
| Rzeczywisty Playground przez API aplikacji | 4/4: starter Vec z E0502, jego naprawa, propagacja błędu i pełny projekt Todo z testami |
| Produkcyjny offline | Cache rust-workshop-v5; dokładny krok, szkic i notatka przetrwały odłączenie sieci i reload; niedostępny runner zachował kod |
| Dostępność i mobile | Brak naruszeń axe na testowanych ekranach; brak poziomego przepełnienia przy 390 px; sprawdzone klawiatura, skip link i zakładki mobilne |
| Konsola | Brak page errors w teście offline i błędów w kontrolowanym podglądzie produkcyjnym |

Odtwarzanie głównego zestawu:

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:audit -- --check-links
npm run build
npm run test:e2e
```

Przy działającym produkcyjnym serwerze na porcie 3002:

```sh
node --import tsx scripts/smoke-expansion.ts
npm run test:offline
```

E2E używa kontrolowanych odpowiedzi runnera dla powtarzalności. Osobny smoke test wysyła wyłącznie autorskie przykłady repozytorium do rzeczywistego izolowanego Playgrounda. Lokalne rustc wykonuje wyłącznie zaufane fixture'y kursu, nigdy szkice ucznia.

## Audyt nowego materiału

- **Kolekcje:** testy odwołują się do funkcji ucznia. Obejmują puste i jednoelementowe wycinki, pożyczone wyniki, mutację Vec, liczby ujemne, UTF-8, znaki łączące, faktyczne dopisanie do String i zachowanie pozostałych kluczy HashMap. Naprawy E0502/E0277/E0368 nie dają się zaliczyć usunięciem istotnego kodu. Kryteria odczytu, iteracji, liczenia znaków i dopisywania tekstu są rozdzielone.
- **Błędy:** przykłady pokazują rzeczywiste użycie `?` po helperze i dalsze obliczenie. Testy odróżniają poprawne zero od błędu, składnię od przepełnienia parsera oraz granice dozwolonego zakresu. Powtórka używa `checked_add`, aby maksymalny i32 nie wywoływał paniki. Wymagane teksty błędów są jawne w poleceniach.
- **Todo:** parser ma opisany separator, białe znaki, Unicode, CR/LF, cyfry ASCII, plus, zera wiodące i zakres usize. Wspólny enum jawnie rozróżnia błędy parsera od NotFound ze stanu. Testy sprawdzają dokładne tytuły, kolejność, duplikaty, 30 rzeczywistych zadań, powtórzone Done i brak mutacji po błędzie.
- **Sesje i transfer:** run_session zachowuje wynik każdej linii, poprzedni stan i kontynuuje; run_strict_session zwraca pierwszy błąd albo ostatni sukces. Sprawdzono pustą i świeżą sesję oraz oba porządki błędów parsera/stanu. Pełne zadanie bez startera łączy testy wszystkich warstw. Kryteria mutacji, formatu listy, kontynuacji i ścisłego wyniku są osobne; zaliczenie jednego nie zalicza pozostałych. Testy wyników nie obserwują bezpośrednio wewnętrznego przepływu ani lokalnego stanu po zakończeniu ścisłej sesji.
- **Powtórki:** nowe koncepty kolekcji i Todo mają krótkie zadania kodowe w innych kontekstach. Nie zastępują one osobnego sprawdzenia utrzymania wiedzy po czasie.

Niezależny review znalazł brakujące testy pojedynczego elementu Vec i granic przedziału, zbyt szeroką deklarację użycia Entry, nieujawniony tekst błędu oraz przepełnienie w referencyjnej powtórce. Poprawiono te problemy przed pełną weryfikacją. Kontrolowane błędne implementacje potwierdziły, że nowe asercje wykrywają wskazane błędy.

## Produkt i zachowanie istniejącej pracy

- Wybór projektu obejmuje Number Guessing i Todo. Osobne notatki przetrwały przełączanie i reload; retrospekcja Todo dodaje właściwe pojęcie do kolejki. Dashboard rozpoznaje projekt na podstawie bieżącej lekcji. Przyciski projektu prowadzą do początku odpowiedniej ścieżki.
- E2E obejmuje przejścia między modułami, wznowienie szkicu po zmianie modułu, powrót z ostatniego kroku do mapy, wynik testu i mobilny widok projektu. Podgląd projektu sprawdzono wizualnie.
- Zapis pozostaje w schemaVersion 3. Migracje v1/v2, import/export, szkice, notatki i ustawienia mają testy zachowania danych. Nowy materiał nie wymaga resetu ani migracji schematu. Historyczne nazwy języków pozostają wyłącznie w obsłudze starego formatu zapisu; doświadczenie ucznia zakłada podstawy programowania i zero Rust.
- Dotychczasowe E2E zachowują diagnostykę, onboarding, light/dark, Focus Mode, notatki, zakładki, eksport, powtórki i dokładne Resume. Powtórka zakończona nie nalicza kolejnego dowodu po reloadzie. Sprawdzono dostępność ustawień przy 1280 × 720 px i mobilne przełączanie Zadanie/Kod/Output.
- Testy silnika odróżniają completion od mastery, niezależne zadania od powtórzonego rozwiązania, reveal od samodzielnego dowodu oraz przypomnienie odroczone o minimum 24 godziny. Samoocena według rubric nie zastępuje dowodu programistycznego.

## Pozostałe ograniczenia

Nie przeprowadzono pilotażu z rzeczywistymi uczącymi się. Testy techniczne potwierdzają działanie produktu i przykładowych kryteriów, lecz nie dowodzą skuteczności nauczania ani gotowości zawodowej. Potrzebne są nowe zadania bez pomocy, uzasadnienie decyzji oraz transfer po ponad dobie.

Pełne Todo z terminalem i trwałym zapisem, dalsze części curriculum oraz zaawansowane kompetencje zawodowe pozostają w rozwoju. [Audyt wymagań](requirements-audit.md) rozróżnia wykonane i brakujące elementy, a [mapa zaawansowanego kursu](advanced-curriculum.md) opisuje kolejne etapy i dowody.

Wykonanie kodu wymaga internetu i dostępności dostawcy sandboxa. Ślady pamięci są przygotowanym modelem dydaktycznym. Otwarte testy i lokalny zapis nie stanowią uwierzytelnionego egzaminu; ograniczenia wzorców źródła nie zastępują analizy AST. Ręczny test czytnikiem ekranu pozostaje do wykonania.

Wcześniejszy audyt zależności odnotował 2 pozycje Monaco/DOMPurify (moderate i low; bez high/critical); bieżący etap nie zmieniał zależności ani nie powtarzał audytu bezpieczeństwa. Kontrola dynamicznych źródeł powinna być ponawiana przy zmianie stable Rust, edition albo adaptera runnera.
