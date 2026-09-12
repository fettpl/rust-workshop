# Weryfikacja etapu: lifetimes, closures i iteratory

Data: 12 września 2026. Dostępne są 52 lekcje w 13 modułach, 55 pojęć, 6 śladów pamięci i 95 wpisów źródłowych. Etap dodał 10 lekcji, 21 zadań z evidence gate, 3 zadania od pustej kartki i 9 kodowych powtórek. Środowisko: macOS, Node.js 22+, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki wykonanych kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy build także sprawdza typy |
| Vitest | 95/95 testów w 16 plikach |
| Walidacja curriculum | 52 lekcje, 13 modułów, 55 pojęć, 6 śladów pamięci |
| Rzeczywisty rustc | 722/722 autorskich przypadków: kompilacja, wykonanie, oczekiwane błędy, rozwiązania z testami i odrzucanie niezmienionych starterów |
| Pakiet Todo Cargo | Starter przechodzi fmt/check i oczekiwanie oblewa nieuzupełnione funkcje; rozwiązanie przechodzi fmt/check/test/clippy z zakazem ostrzeżeń |
| Playwright | 20/20 scenariuszy, w tym nowe testy wyborów, powtórek oraz szkicu iteratora |
| Produkcyjny build Webpack | Poprawny |
| Audyt źródeł z kontrolą HTTP | 95/95 wpisów z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnych powtórek i lekcji bez evidence gate |
| Rzeczywisty Playground przez API aplikacji | 13/13 prób: po jednym rozwiązaniu z każdej z 10 nowych lekcji oraz diagnostyki E0106, E0502 i E0382; łącznie 13 testów Rust z wieloprzypadkowymi asercjami |
| Produkcyjny offline | Cache rust-workshop-v8; dokładny krok, szkic i notatka przeżyły odłączenie sieci i reload. ZIP Cargo pobrany offline ma identyczne bajty. Kompilator sygnalizuje brak połączenia i zachowuje szkic. |
| Dostępność i mobile | Regresja axe, skip link, klawiatura i mobilne zakładki przechodzą. Ręczny podgląd nowego zadania przy 390 px oraz desktop w obu motywach potwierdza czytelność i widoczny fokus. |
| Konsola | Brak page errors w teście offline; brak błędów i ostrzeżeń w ręcznie sprawdzonym podglądzie produkcyjnym |

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
node --import tsx scripts/smoke-borrowed-pipelines.ts
npm run test:offline
```

E2E używa kontrolowanych odpowiedzi runnera dla powtarzalności. Osobny smoke wysyła wyłącznie autorskie przykłady repozytorium do izolowanego Playgrounda. Sprawdzono pełną zawartość tych żądań: przykładowe funkcje, fikcyjne napisy i liczby oraz testy, bez szkiców ucznia, notatek, sekretów i danych użytkownika. Lokalne rustc i Cargo wykonują wyłącznie zaufane przykłady kursu. Testy Vitest weryfikatora również wymagają lokalnego Rust.

## Przegląd materiału

- **Lifetimes:** problem E0106 poprzedza adnotacje. Testy sprawdzają niezależne zakresy źródła i pomocniczego wejścia, pochodzenie widoku, struktury pożyczające, E0597/E0515 oraz wynik owned używany po zniszczeniu źródła. Po review startery wymagają naprawy kontraktu, zamiast podawać poprawne lifetime z góry.
- **Closures:** przechwytywanie, konflikty pożyczek, move, Fn/FnMut/FnOnce i zwracanie impl Fn. Zadania wymagają zmiany mutowalności, kolejności pożyczek i ograniczeń callbacku. Testy sprawdzają liczbę i kolejność wywołań, pustkę oraz przeniesienie własnego typu bez Clone. Instrukcje i podpowiedzi są zgodne z faktycznym starterem.
- **Iteratory:** własność Item, map/filter/collect/fold/find, leniwość i Iterator/IntoIterator. Testy leniwości obserwują stan przed pobraniem, po pojedynczym next i po odrzuceniu niepobranej reszty. Osobne kryterium modułu wymaga takiego dowodu. Dodatkowa asercja pochodzenia buforów odrzuca rozwiązanie kopiujące etykiety zamiast je przenosić; celowo klonujący wariant oblał test. Po tej końcowej zmianie ponownie przeszły wszystkie 54 przypadki weryfikatora dla iteratorów. Cell ma objaśnienie i oficjalne źródło; zakres kwadratów jest ograniczony jawnie, aby uniknąć przepełnienia i32.
- **Samodzielność:** każde nowe pojęcie ma co najmniej dwa niezależne zadania. Test integracyjny pokazuje, że odsłonięte rozwiązania nie zaliczają modułu, a świeży drugi wariant pozwala spełnić kryterium. Trzy zadania zaczynają się bez startera: owned etykieta, callback pipeline i własny iterator.
- **Czytelność:** długi materiał o potokach podzielono na składanie i konsumpcję oraz osobną lekcję o leniwości. Szacunki 20 i 18 minut zastąpiły jedno przeciążone zadanie; dwie dłuższe lekcje praktyczne nadal mają jawne 22 i 25 minut. Wszystkie szacunki wymagają pilotażu.

Przeglądy niezależnych agentów uzupełnił przegląd głównego autora. Wykryte niespójności między celami, starterami, podpowiedziami i testami poprawiono przed commitem. Testy oceniają kontrakt i zachowanie, nie jakość dowolnej implementacji ani jej styl tak dobrze jak człowiek.

## Wybory i zachowanie danych

W początkowych modułach poprawna odpowiedź często zajmowała pierwszą pozycję. Prezentacja pytań wyboru stosuje teraz deterministyczne przestawienie zależne od identyfikatora pytania. Nie zależy ono od klucza odpowiedzi ani stanu ucznia. Identyfikatory i tekst odpowiedzi pozostają bez zmian; zadania porządkowania zachowują znaczącą kolejność.

Testy jednostkowe sprawdzają brak dominującej poprawnej pozycji we wcześniejszych modułach, stabilność, niezmienność źródła i niezależność od klucza. Dwa scenariusze E2E sprawdzają zaznaczenie odpowiedzi i odtworzenie tej samej kolejności po reload, w lekcji oraz powtórce. Trzeci potwierdza surowy komunikat lifetime po otwarciu Coach i dokładne odtworzenie niezależnego szkicu iteratora.

Schemat zapisu pozostaje v3. Nie zmieniono wcześniej opublikowanych identyfikatorów, migracji, notatek ani dowodów. Regresja obejmuje onboarding, diagnostykę, light/dark, Focus Mode, notatki, zakładki, import/export, powtórki, nawigację oraz pakiet i retrospektywę Todo. Zatrzymany serwer developerski odtworzono podczas weryfikacji; końcowy komplet E2E przeszedł na odpowiadającym serwerze.

## Pozostałe ograniczenia

Nie przeprowadzono pilotażu z uczącymi się. Testy techniczne nie dowodzą skuteczności nauczania ani gotowości zawodowej. Potrzebne są samodzielne rozwiązania nowych problemów, uzasadnienia decyzji i transfer po ponad dobie.

Pełne curriculum pozostaje otwarte. Variance, HRTB, rozbudowany warsztat testowania, smart pointers, współbieżność, async, pełne projekty i praktyka utrzymania systemów wymagają dalszej implementacji. [Audyt wymagań](requirements-audit.md) rozróżnia wykonane i brakujące elementy, a [mapa zaawansowanego kursu](advanced-curriculum.md) zachowuje dalszy zakres.

Wykonanie kodu w przeglądarce wymaga internetu i dostępności sandboxa. Ślady pamięci są przygotowanym modelem dydaktycznym. Otwarte testy i lokalny zapis nie stanowią uwierzytelnionego egzaminu; kontrola wzorców źródła nie zastępuje AST. Ręczny test czytnikiem ekranu pozostaje do wykonania. Pakiet Todo nadal zakłada jednego autora, bez gwarancji trwałości po awarii zasilania; praca poza aplikacją nie jest automatycznie oceniana.
