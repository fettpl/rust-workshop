# Weryfikacja etapu: pętle i inteligentne wskaźniki

Data: 12 września 2026. Kurs zawiera 67 lekcji w 18 modułach, 70 pojęć, 7 śladów pamięci, 123 wpisy źródłowe i 3 projekty. Etap dodaje 9 lekcji, 18 zadań z evidence gate, 6 zadań od pustej kartki i 9 kodowych powtórek. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy produkcyjny build również sprawdził typy |
| Vitest | 102/102 testy w 18 plikach; nowe kontrole niezależności bramek oraz rozróżnienia życia wartości i alokacji |
| Walidacja curriculum | 67 lekcji, 70 pojęć i 7 śladów; poprawne relacje, źródła i identyfikatory |
| Rzeczywisty rustc | 943/943 autorskie przypadki: kompilacja, wykonanie, oczekiwane błędy, rozwiązania z testami i odrzucanie niezmienionych starterów |
| Próby z wadliwymi rozwiązaniami | 8/8 odrzuconych przez rzeczywiste asercje i wykonanie; bez uznawania błędów infrastruktury za dowód |
| Playwright | 25/25 scenariuszy, w tym nowe wznowienie śladu, przenoszenie szkicu między modułami, blokada uruchomienia przed predykcją i surowa diagnostyka Box |
| Produkcyjny build Webpack | Poprawny; podgląd na porcie 3002 uruchomiony z końcowej wersji |
| Audyt źródeł HTTP | 123/123 wpisy z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnej powtórki i lekcji bez evidence gate |
| Offline | Cache `rust-workshop-v10`; kod, notatka i dokładny krok zachowane. Nieodwiedzana wcześniej lekcja Weak otwiera się offline, a ślad wraca do tej samej klatki po reload |
| Pobierane projekty | Startery Todo i Log Analyzer pobrane offline po reload są identyczne bajtowo z wersją online |
| Dostępność i mobile | Nowy ślad przechodzi axe przy 390 px oraz kontrolę przepełnienia. Ręcznie sprawdzono jasny/ciemny motyw, mobile, nawigację klawiaturą i widoczny fokus przycisku Wstecz |
| Konsola | Brak page errors w kontroli offline; brak błędów i ostrzeżeń w ręcznym podglądzie produkcyjnym |
| Zewnętrzny Playground | Nowe przykłady nie zostały wysłane. Wcześniejsza automatyczna kontrola uprawnień odrzuciła transmisję przykładów testowania/Log Analyzer; wymagana osobna zgoda pozostaje bez odpowiedzi |

Pełna weryfikacja Rust obejmuje wyłącznie przejrzane przykłady repozytorium, nigdy szkice ucznia ani kod z importu. E2E używa kontrolowanych odpowiedzi runnera i nie potwierdza bieżącej dostępności zewnętrznego Playgrounda.

Pakiety Cargo nie zmieniały się w tym etapie. Ich fmt/check/test/doc/Clippy oraz oczekiwane niepowodzenia starterów zweryfikowano w poprzednim etapie (`f9ee0a2`); teraz ponownie sprawdzono generowanie archiwów przy buildzie i pobieranie offline. Log Analyzer zachowuje 19 testów pakietu oraz limit 4096 przechowywanych bajtów linii przed LF.

## Przegląd dydaktyczny i techniczny

- **Pętle:** konkretne programy przy przewidywaniu, jawne granice liczb, postęp i przypadek braku wyniku. Startery kończą pracę. Testy oceniają zachowanie, a nie udają analizy użytej składni. Zadania od pustej kartki mają opis wymaganych typów i wyniku bez gotowej sygnatury.
- **Box/Deref/Drop:** typ rekurencyjny daje E0072, a ręczne wywołanie destruktora E0040. Testy sprawdzają generyczne dane bez Clone, oryginalny bufor, pełny slice i bezpośredni cykl życia zasobu. Samo ustawienie licznika w funkcji nie zastępuje działającego Drop.
- **Rc/RefCell/Weak:** testy badają tożsamość alokacji, liczniki i zniszczenie po ostatnim Rc. RefCell obsługuje konflikt i przepełnienie bez częściowej zmiany; oddzielny transfer dotyczy współdzielonej historii. Weak sprawdza pusty uchwyt, żyjącego i usuniętego rodzica, tożsamość dziecka i zachowanie wcześniejszych dzieci.
- **Ślad pamięci:** po ostatnim Rc kończy się życie wartości, ale Weak zachowuje alokację. Dopiero ostatni Weak kończy jej życie. Liczby opisują jawne uchwyty w przykładzie, nie wynik `Weak::weak_count` po zniknięciu wszystkich Rc. Stan jest opisany tekstem, a nie samym kolorem. To przygotowany model, nie debugger kodu ucznia.
- **Samodzielność:** każde nowe kryterium ma dwie alternatywy. Odsłonięcie pierwszej nie zalicza modułu; druga pozostaje dostępna. Wstawienie pętli po fundamentach nie zmienia wcześniejszych ID ani schematu zapisu v3.
- **Niezależny przegląd:** autorzy recenzowali wzajemnie treści, a główny agent sprawdził integrację, kod i interfejs. Poprawiono brak kodu przy predykcji, niepełne kryteria pustych zadań, zbyt bezpośrednie wskazówki, mylenie liczników, kierunek własności oraz słabe testy Drop/Deref.

Osiem wadliwych wariantów obejmowało porzucenie Ticket, niepełny slice, pusty Drop z ręczną zmianą licznika, głęboką kopię zamiast wspólnego Rc, niezależny Marker, panikujące borrow_mut, brak połączenia rodzic–dziecko oraz stałe Some zamiast upgrade. Każdy został odrzucony przez właściwy kontrakt.

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

Ten etap obejmuje pętle i wskaźniki używane w jednym wątku. `Arc`/`Mutex`, wątki, atomics, async, zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI oraz pełne Number Guessing+, Mini grep i capstone pozostają do rozwinięcia. Pełny zakres zachowują [audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md).

Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Techniczne kontrole nie dowodzą skuteczności nauczania ani gotowości zawodowej; potrzebna jest samodzielna praca na nowych problemach i transfer po przerwie.
