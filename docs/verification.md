# Weryfikacja etapu: przepływ i zamknięcie Tokio

Data: 12 września 2026. Kurs ma 95 lekcji w 26 modułach, 98 pojęć, 7 śladów pamięci, 180 wpisów źródłowych i 5 projektów. Etap dodaje pięć lekcji, dziesięć bramek, pięć zadań od pustej kartki, pięć kodowych powtórek oraz dodatkowe laboratorium pipeline. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Tokio 1.53.1 i Chromium z Playwright.

## Wykonane kontrole

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; produkcyjny build ponownie sprawdza typy |
| Vitest | 139/139 testów w 25 plikach |
| Walidacja curriculum | Poprawne identyfikatory, źródła, relacje i pięć kryteriów nowego modułu |
| rustc | 1207/1207 dotychczasowych przypadków; Tokio ma osobny profil Cargo |
| Cargo/Tokio | 116/116 przypadków: przykłady, oczekiwana diagnostyka, startery, rozwiązania, blank-page i powtórki |
| Pakiety Cargo | Wszystkie cztery startery i rozwiązania: format, check, oczekiwane porażki starterów, testy rozwiązań i Clippy. Nowy pakiet ma 7 plików i 10 testów: 1 prywatny managera i 9 integracyjnych |
| Wrażliwość testów | 11 kompilujących się wadliwych wariantów odrzuconych przez konkretne asercje; timeout procesu nie był dowodem |
| Playwright | Pełny przebieg: 35/36 poprawnych. Jedyna porażka dotyczyła szukania surowych znaczników Markdown w wyrenderowanej wskazówce. Po poprawie selektora oba nowe scenariusze przeszły ponownie, 2/2 |
| Mobile | 390 px: brak naruszeń axe, przepełnienia poziomego i błędów strony; świeża bramka pozostaje dostępna po odsłonięciu pakietu |
| Źródła HTTP | 180/180 z HTTP 200; brak uszkodzonych odwołań, lekcji bez bramki i pojęć bez kodowej powtórki |
| Build i podgląd | Produkcyjny Webpack build przeszedł. Treść przed i po buildzie ma zgodną sumę SHA. Podgląd na porcie 3002 |
| Ręczny przegląd UI | Mapa, wejście z kryterium do zadania, czytelność edytora i wznowienie po reload. Tab pokazuje link „Przejdź do treści”, Enter przenosi fokus do main-content. Konsola bez warn/error |
| Offline | Cache v15: szkic, notatki, ślad Weak, wcześniejsze lekcje i wcześniej nieotwarta bramka Tokio flow odtwarzają się bez sieci. Wszystkie cztery startery ZIP zachowują identyczne bajty po reload offline. Brak błędów strony |

Weryfikacja wykonywała wyłącznie przejrzany kod repozytorium oraz celowo napisane kontrpróby. Szkice ucznia i importy nie były wykonywane lokalnie. E2E używa kontrolowanych odpowiedzi `/api/run`; żaden nowy przykład nie został wysłany do publicznego Playgrounda.

## Co poprawił niezależny przegląd

- Bounded send sprawdza rzeczywisty Pending pełnego kanału, zwolnienie miejsca i zachowanie niesłanej wartości bez Copy. Test zamknięcia odpytuje Future bezpośrednio: brak close wywołuje nieudaną asercję, zamiast zawiesić test. Osobny przypadek zamyka odbiornik między dwiema wysyłkami.
- Rezerwacja następuje przed przeniesieniem wiadomości. Testy obserwują zewnętrzny Option, wiadomość pozostającą na wejściu oraz pojemność zwolnionego Permit.
- Każdy helper czasu sprawdza dwa różne deadline, 3 i 17 sekund, z dokładnym zegarem Tokio. Poprawne rozwiązanie zachowuje wynik albo anuluje właściwy Future; po timeout pożyczonego JoinHandle to samo dziecko nadal może zakończyć pracę. Zakodowana na stałe długość nie przechodzi kontraktu.
- Select zachowuje jeden trwający Future pomiędzy powiadomieniami. Zamknięcie kanału sterującego ma jawną politykę. Shutdown obserwuje wartość watch przed przyjmowaniem, używa zwykłego recv i nie obiecuje atomowej granicy między wątkami ani sprawiedliwości schedulera. Powtarzane false nie są sygnałem zatrzymania.
- Pipeline ogranicza bufor i liczbę dzieci osobno. Fabryka jest współdzielona przez Arc z granicami Send + Sync; kod użytkowego Clone nie działa w managerze. Regresja z panikującym Clone potwierdza tę granicę. Prywatny test odpytuje rzeczywisty manager i sprawdza zamknięcie wejścia przed czekaniem na wcześniejszy Permit.
- Raport zachowuje błąd domeny, pełny JoinError i panic payload oraz kolejność przyjęcia, także przy powtórzonych publicznych ID. Raport Vec może rosnąć; kurs nie utożsamia bounded queue ze stałą całkowitą pamięcią. Timeout nie wywłaszcza blokującego kodu i nie cofa efektów zewnętrznych.
- Każde pojęcie ma dwie bramki o innym kontrakcie oraz oddzielną powtórkę. Test integracyjny wykazał najpierw brak rejestracji modułu/projektu; po integracji przechodzi. Odsłonięcie pakietu oznacza pomoc przy pięciu powiązanych krokach, pozostawiając świeży wariant dla każdego kryterium.

Kontrpróby: brak close w helperze i managerze, pominięcie drugiej wysyłki, ignorowanie jej błędu, take przed reserve, usunięcie limitu dzieci, zerowy deadline, zgubienie błędu domeny oraz zakodowany na stałe czas w trzech helperach. Każda kończyła się nieudaną asercją po poprawnej kompilacji.

## Źródła i granica środowiska

Profil autora ma Tokio =1.53.1 z macros/rt/sync/time/test-util i stałym Cargo.lock. Lokalny preflight potwierdza runtime oraz prawdziwy timeout z zatrzymanym zegarem. Odczyt przypiętego manifestu Tokio i wygenerowanego manifestu kompilatora Playgrounda potwierdził dostępność tych features w źródłach upstream. Nie jest to dowód, że aktualnie wdrożona usługa ma identyczny build; nie wykonano zewnętrznego POST. Kontrakt RunRequest pozostaje code/mode/tests.

## CI i zapis pracy

PR #1 jest scalony w commit 64667e4. Commit poprzedniego etapu c57b3b1 został wysłany; jego CI 34719230345 dwukrotnie zgłosiło dodatkowy niepoprawny wynik `runner/assertion-shadowing`, ale stary test nie wypisywał przyczyny. Lokalnie tego błędu nie odtworzono. Commit diagnostyczny 32a0dc6 dodaje szczegóły niepowodzenia i wyklucza sygnał lub brak kodu wyjścia jako dowód nieudanej asercji. Jego [CI 34719780947](https://github.com/fettpl/rustcrushcourse/actions/runs/34719780947) przeszło wszystkie kroki, włącznie z Cargo, modelami Loom, buildem i E2E. Przyczyna wcześniejszych dwóch błędów pozostaje niepotwierdzona; nie zmieniono limitów czasu, aby ukryć problem.

## Odtworzenie

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:cargo
npm run content:audit -- --check-links
npm run build
npm run test:e2e -- --workers=4
```

Przy produkcyjnym serwerze na 3002: `npm run test:offline`. Pierwsze `--fetch` pobiera stały lockfile; właściwe kompilacje i testy Cargo działają offline/locked.

## Dalszy zakres

Streamy, sieć, blokujące API i pełny cykl systemu produkcyjnego w async nadal wymagają pracy. Dalej pozostają zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI, utrzymanie oraz pełne Number Guessing+, Mini grep i capstone. Audyt zachowuje także luki produktu, m.in. pełną historię migracji i pochodzenia wersji materiału. Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Kontrole techniczne nie dowodzą skuteczności dydaktycznej ani gotowości zawodowej.
