# Weryfikacja etapu: testowanie i Log Analyzer

Data: 12 września 2026. Dostępnych jest 58 lekcji w 15 modułach, 61 pojęć, 6 śladów pamięci, 106 wpisów źródłowych i 3 projekty. Ten etap dodał 6 lekcji, 13 zadań z evidence gate, 2 zadania od pustej kartki i 6 kodowych powtórek. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy build także sprawdził typy |
| Vitest | 98/98 testów w 17 plikach |
| Walidacja curriculum | 58 lekcji, 61 pojęć i 6 śladów; poprawne relacje modułów i projektów |
| Rzeczywisty rustc | 810/810 autorskich przypadków: kompilacja, wykonanie, oczekiwane błędy, rozwiązania z testami i odrzucanie niezmienionych starterów |
| Końcowe wzmocnienie testów Log Analyzer | 46/46 przypadków po dodaniu awarii odczytu w dwóch alternatywach; rozwiązania ukrywające błąd IO zostały celowo podstawione i odrzucone |
| Pakiety Cargo | Todo i Log Analyzer przechodzą fmt/check; startery oczekiwanie oblewają nieuzupełnione zachowanie; referencje przechodzą testy i Clippy z zakazem ostrzeżeń |
| Log Analyzer — testy pakietu | 19/19: 11 jednostkowych, 5 integracyjnych, 2 procesu CLI i 1 doctest |
| Eksperyment jakości w terminalu | Błędna asercja, zmienione wcięcie i `len_zero` wywołały odpowiednio błąd testu, różnicę rustfmt i błąd Clippy. Po naprawie formatowanie, testy, dokumentacja i Clippy przeszły |
| Playwright | 23/23 scenariusze, w tym 3 nowe dla testów, wyboru pakietu i wznawiania pustego raportu |
| Produkcyjny build Webpack | Poprawny |
| Audyt źródeł HTTP | 106/106 wpisów z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnych powtórek i lekcji bez evidence gate |
| Offline | Cache `rust-workshop-v9`; szkic, notatka i dokładny krok zachowane po odłączeniu sieci i reload; startery Todo oraz Log Analyzer pobrane offline mają identyczne bajty jak online |
| Dostępność i mobile | Nowy pakiet przeszedł axe przy 390 px, kontrolę braku poziomego przepełnienia i fokusu podglądu pliku. Ręczny podgląd lekcji potwierdził czytelność w obu motywach i widoczny fokus klawiatury |
| Konsola | Brak page errors w offline i scenariuszu pakietu; brak błędów i ostrzeżeń w ręcznie sprawdzanym podglądzie produkcyjnym |
| Zewnętrzny Playground | Nie wykonano smoke nowych lekcji. Automatyczna kontrola uprawnień odrzuciła transmisję przykładów do zewnętrznej usługi; oczekuje ona na wyraźną zgodę użytkownika |

Odtwarzanie zestawu lokalnego:

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

Przy serwerze produkcyjnym na porcie 3002: `npm run test:offline`. Skrypt `node --import tsx scripts/smoke-testing-log.ts` przygotowano do osobnej kontroli zewnętrznego runnera po uzyskaniu zgody. Wysyła sześć rozwiązań autorskich oraz jeden nieuzupełniony helper, którego testy powinny nie przejść.

E2E używa kontrolowanych odpowiedzi runnera dla powtarzalności. Nie potwierdza dostępności zewnętrznego Playgrounda. Lokalne rustc i Cargo wykonują wyłącznie przejrzane przykłady repozytorium, bez szkiców ucznia i importowanego kodu.

## Przegląd kontraktów

- **Testowanie:** uczeń pisze helpery z asercjami i tabelami przypadków. Ukryty harness podaje poprawną implementację oraz błędne warianty. Sprawdzono, że helper badający wyłącznie dodatnią liczbę oraz tabela pomijająca górną granicę 10 nie zaliczają zadania. Pokaz pierwszego `#[test]` rzeczywiście ma błędną asercję i wymaga jej poprawy; nie zastępuje testów wypisaniem komunikatu sukcesu.
- **Log Analyzer:** parser zachowuje pożyczony komunikat, Unicode i spacje. Testy strumienia obejmują duplikaty, filtr niezależny od poprawności, koniec bez LF i awarię odczytu. Testy porównują pełny raport, kolejność, zera, filtr i końcowy LF. Alternatywy i powtórki używają innych API i domen.
- **Pakiet:** czytnik zachowuje najwyżej 4096 bajtów linii przed LF, wliczając końcowy CR. Dłuższa linia jest pomijana do końca i liczona raz; test generuje 100 000 bajtów i poprawny kolejny rekord. Nie są gromadzone rekordy ani nieograniczona lista błędów. Błędny UTF-8 zwiększa licznik niepoprawnych linii. Awaria IO przerywa analizę, a CLI nie wypisuje częściowego raportu.
- **Samodzielność:** odsłonięcie referencji Log Analyzer oznacza pomoc dla trzech powiązanych zadań, zachowując szkic. Nie ujawnia Todo i nie zalicza modułu. Każde kryterium modułu można spełnić świeżą alternatywą; wymaga ono jednego samodzielnego zadania z dostępnej pary. Pobranie i terminalowa lista kontrolna są ekspozycją lub samooceną.
- **Dane i interfejs:** oddzielne notatki, widok startera i pliki projektów nie mieszają się przy przełączaniu. E2E rozpakowuje ZIP i porównuje wszystkie 10 plików ze starterem. Pusty raport, surowy wynik błędnego testu i poprawiony szkic odtwarzają się po reload. Schemat zapisu pozostaje v3; wcześniejsze identyfikatory zachowano.

Przeglądy niezależnych agentów uzupełniły kontrolę głównego autora. Poprawiono m.in. zbyt słabe mutanty, brak propagacji IO w testach alternatywnych, niezgodne podpowiedzi i nieprecyzyjny opis kryteriów. Instrukcje projektu uproszczono językowo.

## Pozostały zakres

Przeglądarkowe ćwiczenia z `read_line` mogą przechować całą pojedynczą linię; limit 4096 bajtów należy do pakietu Cargo. Pakiet nie zawiera jeszcze benchmarków, profili ani testów property/fuzz. Nie zastępuje pełnego zaawansowanego kontraktu projektu.

Pełne curriculum pozostaje otwarte: m.in. `while`/`loop`/`break`, zaawansowane Cargo, publiczne API, variance/HRTB, smart pointers, współbieżność, async, unsafe/FFI, Mini grep i capstone. [Audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md) zachowują ten zakres.

Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Techniczne kontrole nie dowodzą skuteczności nauczania ani gotowości zawodowej. Potrzebne są niezależne rozwiązania nowych problemów i transfer po ponad dobie. Otwarte testy i lokalny zapis są narzędziem nauki, nie uwierzytelnionym egzaminem.
