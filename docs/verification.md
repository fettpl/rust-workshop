# Weryfikacja etapu: TCP i serwis Tokio

Data: 13 września 2026. Etap przeszedł przegląd i końcową weryfikację lokalną. Katalog obejmuje 106 lekcji w 29 modułach, 109 pojęć, 205 wpisów źródłowych, 61 zadań od pustej kartki, 7 śladów pamięci i 6 projektów; pięć projektów ma pakiet Cargo. Ten etap dodaje cztery lekcje, osiem bramek (w tym cztery blank-page), cztery kodowe powtórki i laboratorium serwisu TCP.

## Wykonane kontrole

| Sprawdzenie | Wynik |
| --- | --- |
| Integracja modułu i reveal projektu | 22/22 testy; ujawnienie pakietu oznacza cztery główne zadania jako pomoc, pozostawiając cztery niezależne blank-page |
| Vitest | 150/150 testów w 28 plikach |
| TypeScript i ESLint | Oba przebiegi bez błędów; końcowy build również sprawdził typy |
| Curriculum | Poprawne relacje 106 lekcji, 109 pojęć i 7 śladów |
| Źródła HTTP | 205/205 HTTP 200, brak uszkodzonych referencji, lekcji bez bramki i pojęć bez aktywnej powtórki |
| Profil Tokio | Pięć testów preflight offline/locked, w tym prawdziwe IPv4 loopback connect/accept, half-close i odpowiedź |
| rustc | 1207/1207 autorskich przypadków biblioteki standardowej; exit 0 |
| Cargo/Tokio | 252/252 autorskie przypadki; po doprecyzowaniu testów kolejności admission i granicy rozmiaru niezależny przegląd ponownie sprawdził sześć rozwiązań lifecycle oraz cztery kompilujące się mutanty, odrzucone przez asercje. Dwa rozwiązania half-close po ostatnim rozszerzeniu granic: po 3/3 testy; dwa mutanty >= odrzucone asercjami |
| Playwright: lekcje I/O, blocking i TCP | 3/3 scenariusze wznowienia diagnostyki/szkicu i świeżego blank-page; 390 px, bez naruszeń axe, przepełnienia i pageerror |
| Pakiety Cargo | Wszystkie pięć: starter fmt/check i oczekiwana porażka testów na todo!; referencje fmt/check/test/Clippy bez błędów. Serwis: 2 testy jednostkowe i 15 kontraktowych; 3 celowo błędne przykłady ignorowane w zwykłym przebiegu |
| Pełne E2E | 40/40; po ostatniej zmianie samego testu w paczce Cargo ponownie przeszedł scenariusz zgodności bajtów ZIP, reveal i świeżego blank-page po reload |
| Build produkcyjny | Sukces; skróty czterech plików treści przed i po buildzie identyczne |
| Offline v17 | Zapis szkicu, notatek, kroku i podpowiedzi po reload; nowe zadanie sieciowe dostępne bez wcześniejszego otwarcia; wszystkie pięć pobieranych paczek startowych zachowuje identyczne bajty; brak pageerror |
| Ręczna kontrola przeglądarki | Mapa 29 modułów, wyszukiwanie i projekt TCP czytelne; Tab wybiera skip link, Enter przenosi focus do main-content; brak ostrzeżeń i błędów konsoli w kontrolowanym przebiegu |

Weryfikacja wykonuje tylko przejrzany kod repozytorium i celowo przygotowane kontrpróby. Nie wykonuje lokalnie szkiców ani importów ucznia. E2E kontroluje odpowiedzi `/api/run`; nowych przykładów nie wysłano do publicznego Playgrounda.

## Przegląd kontraktów

Niezależne przeglądy lekcji TCP, lifecycle, integracji i projektu serwisu zakończyły się bez pozostałych materialnych uwag. Naprawiono starter, który przypadkiem przechodził dla małego zapisu TCP; brak limitu odpowiedzi; zakończenie join po pierwszej panice; manager czekający na następną pracę zamiast wysyłać gotową odpowiedź; niepełne sprawdzenie sukcesu i błędów flush oraz zbyt duże wartości konfiguracji. Odpowiedź ma jawny tag sukcesu lub klasy błędu, a raport nie przypisuje wewnętrznego błędu managera do JoinError.

Recenzent sprawdził rzeczywiste mutacje referencji: powiększenie kolejki o jeden, zwiększenie admission o jeden i odnawianie deadline podczas kolejnych odczytów. Każda kompiluje się i przegrywa na odpowiedniej asercji. Są to dodatkowe dowody poza trzema edukacyjnymi kontrprzykładami w pakiecie.

Test łączący prawdziwe TCP z zatrzymanym zegarem Tokio sporadycznie zatrzymywał równoległy przebieg. Poprawka kończy sieciowe i kolejkowe uzgodnienia przed zatrzymaniem czasu, a wznawia zegar przed zwolnieniem closure oraz join. Końcowy domyślny równoległy przebieg Cargo przeszedł. Nie izolowano tego testu w osobnym pliku ani nie zwiększono limitu czasu w celu ukrycia problemu.

E2E pierwotnie zakładał, że po reload pozostaje wybrany projekt i wariant rozwiązania. Test teraz ponownie wybiera projekt i bez ponownego reveal sprawdza zachowaną ekspozycję oraz świeży blank-page. Jeden przebieg narzędzia miał około 900 sekund przerwy w obsłudze kliknięcia i przekroczył limit; przyczyna tej przerwy pozostaje nieustalona. Następny scenariusz i pełny zestaw przeszły bez zmiany timeoutu.

Testy muszą odrzucać wadliwe zachowanie przez obserwowalne asercje, a nie przez watchdog. Testy z blokującą closure muszą zwalniać jej kanał przed asercjami i dołączać rozpoczętą pracę.

Znana granica evaluatora: testy odczytu ramki weryfikują wynik oraz nieprzeczytane body, ale nie mierzą wszystkich alokacji. Mutant przenoszący alokację Vec przed kontrolę limitu przechodzi testy; referencja sprawdza limit przed alokacją i została odczytana w przeglądzie. Protokół u16 ogranicza tę lukę do 65535 bajtów. Testy nie są pełnym dowodem dowolnej implementacji ucznia.

Test admission sprawdza również obserwowany szczyt aktywnych handlerów. Próbkowanie stanu po oddaniu sterowania executorowi nie jest wyczerpującym dowodem dla każdego możliwego harmonogramu; kolejność nabycia permitu i accept została dodatkowo przejrzana w kodzie.

## Środowisko i granica wykonania

Profil autora przypina Tokio =1.53.1 z macros/rt/sync/time/test-util/io-util/net oraz tokio-stream =0.1.19, ze stałym Cargo.lock. Test sieciowy utrzymuje listener na `127.0.0.1:0`; nie używa publicznego hosta, DNS, stałego portu ani probe wolnego portu.

Odczyt oficjalnego manifestu Playgrounda potwierdził upstream Tokio 1.53.1 z net. Kod koordynatora uruchamia kontener z `--net none`; dokumentacja Docker opisuje w tym trybie interfejs IPv4 loopback. Jest to zgodność z polityką źródłową, nie wynik wykonania na obecnie wdrożonym Playgroundzie. Nie wykonano zewnętrznego POST. RunRequest nadal przyjmuje wyłącznie code/mode/tests.

## Repozytorium i CI

[PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest już scalony w commit 64667e4. Poprzedni milestone 9154cc3 został wypchnięty na feat/tokio-io-streams, a jego [CI 34721907263](https://github.com/fettpl/rustcrushcourse/actions/runs/34721907263) zakończyło się sukcesem. Bieżący etap jest przeznaczony do commita i push na feat/tokio-network-service. Ten raport dokumentuje lokalną weryfikację; wynik CI należy sprawdzić dla konkretnego wypchniętego commita.

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

Przy produkcyjnym serwerze na 3002: `npm run test:offline`. Pierwsze `--fetch` pobiera stały lockfile; właściwe kompilacje i testy Cargo działają offline/locked. Środowisko lokalne musi pozwalać na IPv4 loopback dla autorskich testów TCP.

## Pozostały zakres

Laboratorium nie obejmuje TLS, uwierzytelniania, wdrożenia i operacyjnej telemetrii. Nadal brakuje m.in. zaawansowanych Cargo/API, variance/HRTB, property/fuzz, profilowania, unsafe/FFI, utrzymania oraz pełnych Number Guessing+, Mini grep i capstone. Audyt zachowuje również luki produktu: pełną historię migracji i pochodzenia wersji materiału. Pilotaż z uczącymi się oraz ręczny test czytnikiem ekranu pozostają do wykonania.
