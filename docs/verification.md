# Weryfikacja etapu: Tokio I/O, strumienie i praca blokująca

Data: 13 września 2026. Kurs ma 102 lekcje w 28 modułach, 105 pojęć, 7 śladów pamięci, 193 wpisy źródłowe i 5 projektów. Etap dodaje siedem lekcji, 14 bramek, siedem zadań od pustej kartki i siedem osobnych kodowych powtórek. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Tokio 1.53.1, tokio-stream 0.1.19 i Chromium z Playwright.

## Wykonane kontrole

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; produkcyjny build również sprawdził typy |
| Vitest | 148/148 testów w 27 plikach. Po ostatnim doprecyzowaniu testu Rust ponownie przeszło 35/35 kontroli integracji, walidacji i limitów runnera |
| Curriculum | 102 lekcje, 105 pojęć i 7 śladów: poprawne relacje, źródła, cele oraz niezależne warianty bramek |
| rustc | 1207/1207 przypadków standardowej biblioteki |
| Cargo/Tokio | 204/204 przypadki: przykłady, diagnostyka, startery, rozwiązania, blank-page i powtórki; końcowy przebieg obejmuje poprawiony test drugiej ramki |
| Profil Tokio | Cztery testy preflight: runtime, timeout, rzeczywiste częściowe duplex I/O oraz ReceiverStream z wcześniejszym Permit |
| Pakiety Cargo | Wszystkie cztery startery i rozwiązania: fmt, check offline/locked, oczekiwane porażki niedokończonych starterów, testy rozwiązań i Clippy z -D warnings |
| Loom | 5 standardowych testów/doctest, 2 modele, Clippy; 2 celowe kontrprzykłady i osłabiona biblioteka wykryte przez właściwe asercje |
| Playwright | 38/38 scenariuszy. Wcześniejszy przebieg miał 37/38 z powodu równoczesnej zmiany treści: HMR wysłał nowe testy, a proces E2E porównywał starszą kopię. Po zamknięciu edycji cały zestaw przeszedł |
| Mobile | 390 px: nowe bramki, wznowienie diagnostyki i szkicu oraz świeże zadanie po reveal; brak naruszeń axe, przepełnienia poziomego i błędów strony |
| Źródła HTTP | 193/193 z HTTP 200; brak uszkodzonych odwołań, lekcji bez bramki i pojęć bez kodowej powtórki |
| Build | Produkcyjny Webpack build przeszedł; suma SHA treści przed i po buildzie jest zgodna |
| Ręczny podgląd | Mapa pokazuje 28 modułów; kryterium I/O otwiera właściwe ćwiczenie. Sprawdzono czytelność edytora i wznowienie po reload. Tab wybiera „Przejdź do treści”, Enter ustawia fokus na main-content; konsola bez warn/error |
| Offline | Cache v16: szkice, wskazówki, notatki i ślad Weak odtwarzają się bez sieci. Nowe, wcześniej nieodwiedzane bramki I/O i pracy blokującej działają offline. Wszystkie cztery startery ZIP zachowują identyczne bajty po reload. Brak błędów strony |

Weryfikacja uruchamiała wyłącznie przejrzany kod repozytorium i celowo napisane kontrpróby. Szkice ucznia oraz importy nie były wykonywane lokalnie. E2E korzysta z kontrolowanych odpowiedzi `/api/run`; nowych przykładów nie wysyłano do publicznego Playgrounda.

## Co sprawdził i poprawił niezależny przegląd

- Częściowy zapis jest obserwowany na rzeczywistym duplex o pojemności mniejszej niż wiadomość. Testy wymagają wszystkich bajtów, a osobny writer sprawdza `flush`: również po niepustym zapisie, po Pending i przy błędzie. Powtórki wymagają pełnego zapisu i poprawnego końca strumienia.
- Format u16 big-endian odróżnia czysty EOF od uciętego nagłówka lub treści. Testowane są ramka pusta, kolejna niepusta, wielobajtowa długość, dokładnie 65535 bajtów i odrzucenie 65536. Walidacja poprzedza alokację treści lub jakikolwiek zapis ramki.
- FrameState zachowuje częściowy nagłówek i treść po anulowaniu. Po zakończeniu test dekoduje drugą ramkę o innej długości. Jawny EOF powoduje, że mutant zachowujący wyłącznie starą oczekiwaną długość kończy się asercją z UnexpectedEof, a nie watchdogiem.
- PendingWrite zachowuje offset i własność danych; wznowienie nie powiela prefiksu. `is_complete` opisuje przyjęcie bajtów, nie udany flush. Testy osobno sprawdzają Pending podczas flush, błędy i WriteZero. Kolektor z limitem 0 rozróżnia EOF od jednego nadmiarowego bajtu; błąd limitu po tej próbie jest terminalny.
- Streamy obsługują Pending, dane bez Copy i przypięte typy bez Unpin. Limit nie odpytuje dodatkowego elementu. Świeża powtórka również używa opóźnionego !Unpin streamu; testy odrzucają Pending potraktowane jak Closed oraz zbędny bound Unpin.
- ReceiverStream jest zamykany przed drain, przy zachowaniu danych z bufora i wcześniej przyznanego Permit. Powtórka bezpośrednio odpytuje Future przed i po zatrzymaniu; obejmuje zarówno wysłanie stopu, jak i porzucenie jego nadawcy. Żaden z tych przypadków nie używa timeoutu jako dowodu poprawności.
- Praca blocking działa na rzeczywistej puli wątków, zachowuje wynik i JoinError. Lokalny odbiorca async może używać Rc oraz pożyczonych danych. Stop następuje przed join, a permit pozostaje w closure do rzeczywistego końca, także po panice lub abort uchwytu. Tekstowa osłona zakazanego abort obejmuje także zapis `::abort`; nie jest analizą AST ani zabezpieczeniem egzaminacyjnym.
- Testy granicy procesu utrzymują 60 sekund dla kompilacji i 8 sekund dla wykonania. Timeout, sygnał lub częściowy raport testów nie zalicza odrzucenia startera. Wszystkie rozwiązania z ukrytymi testami mieszczą się w rzeczywistych limitach żądań runnera.

Kontrpróby obejmowały m.in. pominięcie flush, sprawdzania u16, resetu stanu i próby limitu; stare pole oczekiwanej długości; utratę Pending; zbędne Unpin; zignorowanie porzuconego nadawcy stop; użycie zwykłego spawn, permit poza closure i join przed stop. Błędy zachowania wykrywały asercje po kompilacji, a kontrakt !Unpin prawidłowo odrzucał kompilator. Timeout nie był dowodem odrzucenia wadliwego wariantu.

## Źródła i granica środowiska

Profil autora przypina Tokio =1.53.1 z macros/rt/sync/time/test-util/io-util oraz tokio-stream =0.1.19 bez domyślnych features i ze stałym Cargo.lock. ReceiverStream nie wymaga opcjonalnego feature sync z tokio-stream. Odczyt dokumentacji i wygenerowanego manifestu kompilatora Playgrounda potwierdził dostępność potrzebnych API upstream; nie potwierdza identycznego buildu obecnie wdrożonej usługi. Nie wykonano zewnętrznego POST. Kontrakt RunRequest pozostaje code/mode/tests.

Ćwiczenia używają duplex i kanałów. Nie są jeszcze testem TCP ani pełnego serwisu sieciowego.

## CI i zapis pracy

[PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest scalony w commit 64667e4. [CI poprzedniego etapu e625057](https://github.com/fettpl/rustcrushcourse/actions/runs/34720429657) ujawniło konkretną przyczynę dodatkowej porażki runner/assertion-shadowing: `spawnSync rustc ETIMEDOUT` podczas pierwszej kompilacji pod dawnym wspólnym limitem 8 sekund. Ten etap rozdziela budżet kompilacji (60 sekund, jak w weryfikatorze Cargo) i wykonania (nadal 8 sekund), z testami regresji granicy procesu. Nie zmienia limitu runnera aplikacji.

Wcześniejsze [CI commitu diagnostycznego 32a0dc6](https://github.com/fettpl/rustcrushcourse/actions/runs/34719780947) przeszło wszystkie kroki. Przyczyna dwóch starszych awarii c57b3b1, których log nie zawierał szczegółów, pozostaje niepotwierdzona. Wyniki lokalne powyżej nie zastępują statusu CI nowego commitu na GitHub.

## Odtworzenie

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:models -- --fetch
npm run content:cargo
npm run content:audit -- --check-links
npm run build
npm run test:e2e -- --workers=4
```

Przy produkcyjnym serwerze na 3002: `npm run test:offline`. Pierwsze `--fetch` pobiera stały lockfile; właściwe kompilacje i testy Cargo działają offline/locked.

## Dalszy zakres

Sieć Tokio oraz połączenie I/O, blokującego kodu i pipeline w pełnym cyklu życia serwisu pozostają następnym etapem. Nadal brakuje m.in. zaawansowanych Cargo/API, variance/HRTB, property/fuzz, profilowania, unsafe/FFI, utrzymania oraz pełnych Number Guessing+, Mini grep i capstone. Audyt zachowuje również luki produktu, m.in. pełną historię migracji i pochodzenia wersji materiału. Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Kontrole techniczne nie dowodzą skuteczności dydaktycznej ani gotowości zawodowej.
