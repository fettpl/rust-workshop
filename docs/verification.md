# Weryfikacja etapu: generics i traity

Data: 12 września 2026. Bieżący zakres obejmuje 42 lekcje w 10 modułach. Etap dodał trzy lekcje generics i cztery traitów, 14 zadań potwierdzających samodzielność oraz siedem kodowych powtórek. Środowisko: macOS, Node.js 22+, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki wykonanych kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; także końcowy build sprawdza typy |
| Vitest | 89/89 testów w 15 plikach |
| Walidacja curriculum | 42 lekcje, 10 modułów, 46 pojęć, 6 śladów pamięci |
| Rzeczywisty rustc | 573/573 autorskich przypadków: kompilacja, wykonanie, oczekiwane błędy, rozwiązania z testami i odrzucanie niezmienionych starterów |
| Pakiet Todo Cargo | Starter przechodzi fmt/check i oczekiwanie oblewa nieuzupełnione funkcje; rozwiązanie przechodzi fmt/check/test/clippy z zakazem ostrzeżeń |
| Playwright | 17/17 scenariuszy po końcowej poprawce nawigacji |
| Produkcyjny build Webpack | Poprawny |
| Audyt źródeł z kontrolą HTTP | 74/74 wpisy z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnych powtórek i lekcji bez evidence gate |
| Rzeczywisty Playground przez API aplikacji | 9/9 prób: siedem rozwiązań, po jednym z każdej nowej lekcji, oraz E0369 i E0038. Łącznie siedem testów z wieloprzypadkowymi asercjami. |
| Produkcyjny offline | Cache rust-workshop-v7; dokładny krok, szkic i notatka przeżyły odłączenie sieci i reload. ZIP Cargo pobrany offline ma identyczne bajty. Kompilator sygnalizuje brak połączenia i zachowuje szkic. |
| Dostępność i mobile | Brak naruszeń axe na testowanych ekranach i poziomego przepełnienia przy 390 px; klawiatura, skip link i mobilne zakładki działają |
| Konsola | Brak page errors w produkcyjnym teście offline |

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
node --import tsx scripts/smoke-abstractions.ts
npm run test:offline
```

E2E używa kontrolowanych odpowiedzi runnera dla powtarzalności. Osobny smoke wysyła wyłącznie autorskie przykłady repozytorium do izolowanego Playgrounda. Lokalne rustc i Cargo wykonują wyłącznie zaufane fixture'y kursu, nigdy szkice ucznia. Testy Vitest weryfikatora także wymagają lokalnego Rust.

## Przegląd materiału

- **Generics:** wspólne T i niezależne T/U, struktury, impl<T>, pożyczające i konsumujące metody oraz minimalny PartialEq. Testy sprawdzają liczby, String, własne typy bez Copy/Clone/Debug, tożsamość zachowanych danych oraz NaN. Mutant oparty na równości adresów został odrzucony przez dodane przypadki NaN.
- **Traity:** wymagane i domyślne metody, nadpisania, generyczni konsumenci, associated Output, ograniczenie typu wyniku oraz pożyczone heterogeniczne obiekty dyn. Testy definiują nowe implementacje niewystępujące w ćwiczeniu. Zakres arytmetyki jest jawny.
- **Samodzielność:** każde z siedmiu pojęć ma dwa zadania o różnym kontrakcie. Testy silnika pokazują, że ujawnione rozwiązania nie zaliczają modułu, a niezależny drugi wariant pozwala spełnić kryterium. Trzy zadania lekcyjne zaczynają się od pustej strony, w tym własny Measure z typem powiązanym i ograniczonym konsumentem.
- **Pomoc:** po niezależnym review usunięto konkretne poprawki z wcześniejszych poziomów podpowiedzi. Rozwiązania pozostają na ostatnim poziomie. Eksperyment ze zmianą danych jasno wymaga ich przywrócenia przed kontrolą stałego wyjścia.

## Weryfikator autorskiego Rust

Weryfikator wcześniej pomijał rozwiązania zawierające wyłącznie funkcję generyczną. Regresja z celowo błędną funkcją najpierw ujawniła pominięcie, a po poprawce poprawnie zgłasza jej niepowodzenie.

Nie wystarcza już sama kompilacja startera. Niezmieniony kod zadania testowego musi wymagać poprawy według rzeczywistego evaluatora: zachowania lub jawnego ograniczenia źródła. Kod już spełniający zadanie jest błędem curriculum. Brak raportu, puste testy, same ignorowane testy i błędy infrastruktury nie stanowią prawidłowego odrzucenia.

Niezależny review odtworzył fałszywy sukces przy braku linkera. Poprawka wymaga strukturalnej diagnostyki rustc z kodem błędu i głównym wskazaniem na autorskie źródło. Ponowna próba z nieistniejącym linkerem została odrzucona; cztery istniejące zadania z brakującym API nadal przeszły kontrolę. Oddzielnie sprawdzono timeout rzeczywistego programu. Stała regresja obejmuje dziewięć fixture'ów: poprawny starter, złą wartość, todo!, brak API, brak raportu, ograniczenie źródła, funkcję generyczną, puste i ignorowane testy. Linker i timeout zweryfikowano dodatkowym eksperymentem podczas review.

## UX i zachowanie danych

Nowy scenariusz sprawdza szkic generics, progresywne hints, odsłonięcie rozwiązania bez nadpisania kodu, dokładny reload oraz niezależny wariant. Mapa traitów działa na ekranie 390 px.

Przegląd wizualny ujawnił, że wejście do zadania z dołu długiej mapy zachowywało przewinięcie i ukrywało nagłówek. Regresja najpierw wykazała, że nagłówek jest poza viewportem. Nawigacja do nowego widoku, lekcji lub kroku przewija teraz początek i przekazuje fokus do treści; początkowy fokus przeglądarki pozostaje dostępny dla skip link. Powtórny wybór bieżącego widoku z menu mobilnego również przywraca fokus do treści. Oba przypadki mają sprawdzenie w E2E.

Schemat zapisu pozostaje v3. Nowe dane nie zmieniają wcześniejszych identyfikatorów, migracji, notatek ani dowodów. Dotychczasowa regresja obejmuje onboarding, diagnostykę, light/dark, Focus Mode, notatki, zakładki, import/export, powtórki oraz pakiet i retrospektywę Todo.

## Pozostałe ograniczenia

Nie przeprowadzono pilotażu z uczącymi się. Testy techniczne nie dowodzą skuteczności nauczania ani gotowości zawodowej. Potrzebne są nowe zadania bez pomocy, uzasadnienie decyzji oraz transfer po ponad dobie. Szacunki czasu lekcji wymagają sprawdzenia w pilotażu.

Pełne curriculum nie jest ukończone. Lifetimes, closures, iterators, dalsze działy, pełne projekty oraz zaawansowana praktyka nadal pozostają w rozwoju. Wprowadzenie do dyn nie obejmuje wszystkich jego ograniczeń ani pomiaru kosztów. [Audyt wymagań](requirements-audit.md) rozróżnia wykonane i brakujące elementy, a [mapa zaawansowanego kursu](advanced-curriculum.md) zachowuje dalszy zakres.

Wykonanie kodu w przeglądarce wymaga internetu i dostępności sandboxa. Ślady pamięci są przygotowanym modelem dydaktycznym. Otwarte testy i lokalny zapis nie stanowią uwierzytelnionego egzaminu; kontrola wzorców źródła nie zastępuje AST. Ręczny test czytnikiem ekranu pozostaje do wykonania. Pakiet Todo nadal zakłada jednego autora, bez gwarancji trwałości po awarii zasilania; praca poza aplikacją nie jest automatycznie oceniana.
