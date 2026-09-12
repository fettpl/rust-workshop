# Weryfikacja etapu: współbieżność i wyszukiwanie modułów

Data: 12 września 2026. Kurs zawiera 76 lekcji w 21 modułach, 79 pojęć, 7 śladów pamięci, 143 wpisy źródłowe i 3 projekty. Etap dodaje 9 lekcji, 18 zadań z evidence gate, 9 zadań od pustej kartki i 9 kodowych powtórek. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy produkcyjny build również sprawdził typy |
| Vitest | 110/110 testów w 19 plikach; wyszukiwanie tematów i niezależność nowych bramek |
| Walidacja curriculum | 76 lekcji, 79 pojęć i 7 śladów; poprawne relacje, źródła i identyfikatory |
| Rzeczywisty rustc | Pełny przebieg: 1079/1079 autorskich przypadków. Po końcowym wzmocnieniu asercji ponownie sprawdzono wszystkie 44/44 przypadki zmienionego modułu Send/Sync i Mutex |
| Próby z wadliwymi rozwiązaniami | 16/16 odrzuconych przez rzeczywiste asercje: 4 dla wątków, 4 dla kanałów i 8 dla Send/Sync oraz Mutex; szczegóły poniżej |
| Playwright | 28/28 scenariuszy; wyszukiwanie, trwałość zaznaczenia, świeże alternatywy po reveal, resume i surowe E0277 |
| Produkcyjny build Webpack | Poprawny; podgląd na porcie 3002 uruchomiony z końcowej wersji |
| Audyt źródeł HTTP | 143/143 wpisy z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnej powtórki i lekcji bez evidence gate |
| Offline | Cache `rust-workshop-v11`; kod, notatka i dokładny krok zachowane. Wyszukiwanie i nieodwiedzana lekcja Send/Sync działają bez sieci, a reload przywraca krok z Rc. Zachowane również dokładne wznowienie śladu Weak |
| Pobierane projekty | Startery Todo i Log Analyzer pobrane offline po reload są identyczne bajtowo z wersją online |
| Dostępność i mobile | Wyszukiwanie przechodzi axe przy 390 px i kontrolę przepełnienia. Ręcznie sprawdzono oba motywy, widoczny fokus, Tab/Enter, powrót fokusu po czyszczeniu i mobilny panel kodu |
| Konsola | Brak page errors w kontroli offline oraz błędów i ostrzeżeń w ręcznym podglądzie produkcyjnym |
| Zewnętrzny Playground | Nowe przykłady nie zostały wysłane. Wcześniejsza automatyczna kontrola uprawnień odrzuciła transmisję przykładów testowania/Log Analyzer; wymagana osobna zgoda pozostaje bez odpowiedzi |

Pełna weryfikacja Rust obejmuje wyłącznie przejrzane przykłady repozytorium, nigdy szkice ucznia ani kod z importu. E2E używa kontrolowanych odpowiedzi runnera i nie potwierdza bieżącej dostępności zewnętrznego Playgrounda.

Pakiety Cargo nie zmieniały się w tym etapie. Ich fmt/check/test/doc/Clippy oraz oczekiwane niepowodzenia starterów zweryfikowano w etapie `f9ee0a2`; teraz ponownie sprawdzono generowanie archiwów przy buildzie i pobieranie offline. Log Analyzer zachowuje 19 testów pakietu oraz limit 4096 przechowywanych bajtów linii przed LF.

## Przegląd dydaktyczny i techniczny

- **Wątki:** callbacki sprawdzają rzeczywisty ThreadId; wynik obliczony w wątku rodzica nie zastępuje uruchomienia dziecka. Wszystkie uchwyty są dołączane także po błędzie lub panice. Scoped threads pożyczają oryginalne dane: testy sprawdzają adresy i długości obu części oraz puste wejście. `move` nie przedłuża życia referencji, a zwykły `spawn` może korzystać z referencji `'static`.
- **Kanały:** testy kontrolują zewnętrzny sender/receiver i sprawdzają rzeczywiste przekazanie danych. Rozłączenie zachowuje oryginalną wiadomość, a bounded batch zwraca odrzuconą wiadomość i całą niesłaną resztę we właściwej kolejności. Sukces, Full i Disconnected mają osobne przypadki. Kurs nie gwarantuje kolejności wiadomości różnych producentów i nie używa sleep do synchronizacji.
- **Send/Sync i Mutex:** predykcja pokazuje kod z Rc odrzucony przez E0277, a wyjaśnienie rozdziela Send od Sync i ograniczeń Arc. Aktualizacja sprawdza pełen zakres i64 oraz u32 bez obcięcia wartości i częściowej zmiany. Callback następuje po zwolnieniu własnego guarda; test równoległych workerów nie zakłada, że żaden inny wątek nie trzyma w tym momencie blokady. Poison wymaga jawnego propagowania albo naprawy zweryfikowanego niezmiennika; brak flagi nie dowodzi poprawności danych.
- **Samodzielność:** każde nowe kryterium ma dwie alternatywy, w tym zadanie bez startera. Odsłonięcie pierwszej nie zalicza modułu; druga pozostaje dostępna. Kontrakty opisują wymagane API, dane graniczne i politykę błędów. Powtórki mają nowe kontrakty i wykonywalne testy.
- **Mapa kursu:** wyszukiwanie ignoruje wielkość liter i polskie znaki, wymaga dopasowania wszystkich słów do jednego modułu i jego lekcji. Nie indeksuje rozwiązań ani szkiców. Zachowuje numery modułów i wybór, pokazuje brak wyników oraz wyraźnie opisuje wybrany moduł ukryty przez filtr. Query jest lokalnym stanem widoku; schemat zapisu v3 i wcześniejsze ID pozostają bez zmian.

Niezależny przegląd wątków odrzucił cztery wadliwe warianty: podział w indeksie 0 w obu zadaniach scoped, callback wykonany w rodzicu oraz przedwczesny powrót po pierwszym błędzie join. Przegląd kanałów odrzucił brak wysłania, zastępczy payload odzyskiwania, Complete bez wysłania i utratę pozostałych elementów po Full. Odrzucenie wynikało z właściwych asercji, nie z timeoutu ani problemu infrastruktury.

Przegląd Send/Sync i Mutex sprawdził osiem kolejnych wariantów: obcinanie skrajnej delta, brak zmiany przekazanego stanu, brak callbacku, stały Err, usunięcie poison przy odmowie, callback pod guardem, przerwanie seryjnego spawn/join po pierwszej panice i zapis dopiero po callbacku. Trzy ostatnie przechodziły wcześniejsze testy. Dodano obserwację wartości już wewnątrz callbacku, zmianę stanu przez callback oraz panikę callbacków wszystkich trzech workerów z kontrolą niezatrutego Mutex i pełnego wyniku. Każdy mutant został następnie odrzucony przez asercję, bez timeoutu. Testy nie dowodzą równoczesnego wykonywania instrukcji ani nie narzucają kolejności schedulera.

## Odtworzenie kontroli

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

Przy serwerze produkcyjnym na porcie 3002: `npm run test:offline`. Osobną weryfikację niezmienionych pakietów uruchamia `npm run content:cargo`.

## Pozostały zakres

Ten etap obejmuje podstawy wątków, kanałów i współdzielonego stanu. Atomics/Loom, async, zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI oraz pełne Number Guessing+, Mini grep i capstone pozostają do rozwinięcia. Pełny zakres zachowują [audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md).

Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Techniczne kontrole nie dowodzą skuteczności nauczania ani gotowości zawodowej; potrzebna jest samodzielna praca na nowych problemach i transfer po przerwie.
