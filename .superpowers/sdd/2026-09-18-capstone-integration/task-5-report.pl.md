# Raport z zadania 5 — weryfikacja archiwum i podstawa decyzji o wydaniu

[English](task-5-report.md)

Implementacja jest gotowa, a testy wybranych przypadków przeszły. Rozpoczęto pełną próbę z dostępem do interfejsu pętli zwrotnej, lecz nadrzędny proces przerwał ją przed zakończeniem prób poszczególnych wariantów z celowym błędem. Brakuje nowego raportu potwierdzającego pełny przebieg.

## Zmienione pliki

- `scripts/verify-capstone.ts` Zamknięte `--fetch` / `--msrv` argument parser, czysty archive/result przewiduje, dokładny autor ZIP
  kontroli ekstrakcji, manifest i Lockfile, ograniczone polecenia Cargo, stable/MSRV wybór
  narzędzi, starter failure checks, zewnętrzny V1 konsument, wykonanie obciążenia pracą
  i JSON generowanie raportu. Importowanie modułu nie wykonuje żadnej pracy Cargo.
- `scripts/capstone-mutants.ts` Osiemnaście wymienionych mutacji źródłowych z jednym określonym testem zachowania
  każdy; każda mutacja jest ekstrahowana do swojej tymczasowej przestrzeni roboczej i
  odniesienie zostaje przywrócone przed kolejną kontrolą.
- `src/content/capstone-verification.test.ts` Testy prognozowania wyników mutantów, klasyfikacja komend, nieświeże archiwum.
- `src/content/projects/durable-log-service/service.ts` Sformatowane autorskie urządzenie serwisowe i deterministyczne 512-eventowe stałe
  obciążenie pracą z 256 duplikatami powtórzeń i receipt/count twierdzeń. Równoległy duplikat
  testu pętli async przyznaje się teraz do jego trzy-żądanie fan-in z kolejką czterech.
- `src/content/projects/durable-log-service/archive.ts` Wg polskich wierteł w księgach biegłych, procesu lokalnego boundary/authentication ograniczenie, ADR
  alternatywy i przekazy handlowe, wstecznie kompatybilne V2 wpis zmiennoprzecinkowy
  oraz release/performance sformułowanie ograniczające.
- `package.json` — `precontent:capstone` oraz `content:capstone` scenariusze.
- `.github/workflows/ci.yml` Stabilne i dokładne MS Zaproszenia RV przed ogólną weryfikacją archiwum offline,
  przypięte siedmiodniowymi stable/MSRV zgłoszeniami, oraz oba zestawy testów oceny capstone w
  wybranych miejscach pracy łańcucha narzędzi.

## Działanie i ograniczenia weryfikatora

Program przyjmuje wyłącznie opcje `--fetch` i `--msrv`, każdą najwyżej raz. Odrzuca ścieżki, kod źródłowy, importy, podmiany zależności i inne zestawy narzędzi. Buduje archiwum na podstawie definicji pakietu w repozytorium, porównuje bajty z udostępnionymi archiwami kodu startowego i rozwiązania oraz sprawdza komplet 35 ścieżek. Rozpakowuje zatwierdzony pakiet w nowym katalogu `/tmp`. Odrzuca niebezpieczne ścieżki i niedozwolone postaci źródeł. Cargo uruchamia się wyłącznie dla tak przygotowanego pakietu.

Każde wywołanie Cargo ma limit 8 MiB danych wyjściowych i 120 sekund. Dla testów poszczególnych wariantów z błędem oraz zewnętrznego klienta limit wynosi 60 sekund. Weryfikator rozróżnia przekroczenie czasu, sygnał, brak wyjścia, błąd kompilacji i brak wskazanego testu. Wariant z błędem musi się poprawnie skompilować, po czym dokładnie jeden wskazany test musi wykryć błąd. Kod startowy musi się skompilować i zgłosić `not yet implemented` w teście niewypełnionego zadania. Dla rozwiązania sprawdzane są kompilacja offline z plikiem blokady, testy, formatowanie, Clippy z `-D warnings`, dokumentacja, przykłady dokumentacyjne oraz konfiguracje bez funkcji domyślnych i ze wszystkimi funkcjami.

W trybie `--msrv` polecenie `rustup which` ustala ścieżki do cargo, rustc i rustdoc dla Rust 1.85.0. Ten zestaw uzyskuje pierwszeństwo w `PATH`. Dla stable zapisywane są wersje tych samych trzech narzędzi. Raport zawiera skrót udostępnionego archiwum z rozwiązaniem, argumenty, status, sygnał, oba strumienie wyjścia i czas wykonania. Do zakończenia przeglądu ostrzeżeń bezpieczeństwa i licencji obowiązuje status `Hold`.

## Polecenia i wyniki wybranych testów

1. `npm run typecheck` — PASS (`tsc --noEmit`).
2. `npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` PASS (2 pliki, 9 testów).
3. `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
4. `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
5. `git diff --check` — PASS.
6. `node --import tsx scripts/verify-capstone.ts --fetch --fetch` Rezygnacja PASS odrzucenia duplikatów flag (zjazd 1).
7. `node --import tsx scripts/verify-capstone.ts --source learner.rs` Rezygnacja PASS odrzucenia source/path wejścia (wyjście 1).

Przed wybranymi testami polecenie `npm run content:packages` ponownie utworzyło oba archiwa durable-log-service. Przy włączonej pętli zwrotnej `npm run content:capstone` dotarło do sprawdzania kodu startowego i rozwiązania na stable. Wcześniejsze próby zatrzymywały się na systemowym błędzie `Operation not permitted`. Przerwany przebieg nie zapisał nowego pliku `test-results/capstone/<toolchain>/report.json`. Brakuje tym samym aktualnego potwierdzenia dla stable i MSRV.

## Co pozostało do potwierdzenia

Weryfikator jest połączony z CI. Pełne przebiegi na stable i Rust 1.85.0 wymagają środowiska ze zgodą na testy komunikacji lokalnej. Decyzję o wydaniu wstrzymano do ukończenia obu prób i przeglądu raportów. Zakres weryfikacji pomija uruchamianie kodu kursanta lub importowanych źródeł, publiczny port, bieżące ostrzeżenia bezpieczeństwa, profil alokacji i przenośne progi czasu wykonania.

## Poprawki po pierwszym przeglądzie

Na początku każdej próby weryfikator unieważnia poprzedni raport JSON. Blok `finally` zapisuje dla każdego rozpoczętego polecenia argumenty, status, sygnał, stdout, stderr, klasyfikację i czas. Katalogi robocze kodu startowego, rozwiązania i wariantów z błędem są rejestrowane podczas tworzenia i usuwane w tym bloku. Metadane obejmują wyłącznie ścieżki i wersje cargo/rustc/rustdoc, wybrane opcje i oczyszczone dane platformy. Zawartość `process.env` pozostaje poza raportem. Test z `CAPSTONE_SECRET=TOP_SECRET_SHOULD_NOT_APPEAR` sprawdza, że zapisana treść nie ujawnia tej wartości.

Wariant z błędem zostaje poprawnie wykryty, gdy Cargo kończy się kodem 101, wskazany test występuje dokładnie raz, wyłącznie on kończy się porażką, a podsumowanie `test result: FAILED` podaje zgodną liczbę testów. Regresje obejmują duplikaty i błędy w innych testach. Jeden wariant odnawia termin odczytu, zachowując `ProtocolError::Fields`; kolejny pomija oczekiwanie na zadanie robocze i zwraca puste statystyki. Pozostałe zapisują znacznik schematu poza nieudaną transakcją albo pomijają rozliczenie dopiero po anulowaniu kanału odpowiedzi. Każdy błąd ma osobny test. Stały zestaw danych wymaga 256 wstawień i 256 potwierdzeń duplikatu, a przy każdym ponowieniu sprawdza zgodność pierwotnego numeru sekwencyjnego.

Zadanie CI dla stable uruchamia testy projektu końcowego i przesyła `test-results/capstone/stable/report.json`. Zadanie dla Rust 1.85.0 robi to samo dla MSRV. Test TCP korzysta z Tokio w jednym procesie i z ograniczonego czasu wirtualnego.

## Testy wykonane podczas przeglądu

- `bun typecheck` — PASS (`tsc --noEmit`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` PASS (2 pliki, 11 testów; 30-sekundowy alarm).
- `npm run content:packages` Regenerowany PASS; autorski rozrusznik i roztwór ZIPs.
- `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
- `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
- `node --import tsx --input-type=module -e '<eight mutant target checks>'` Adresaci PASS; każda wymieniona mutacja zmieniła swój reklamowany cel źródłowy.
- `git diff --check` — PASS.

## Końcowe poprawki w PR #18

Asercja E2E dla IndexedDB sprawdza przechowywaną wartość jako `UserState`, dzięki czemu test dotyczący odsłaniania rozwiązań nie używa jawnego `any`. Test powolnego odczytu części ramki najpierw rejestruje zadanie czasomierza, a potem przesuwa zatrzymany zegar poza jednomilisekundowy okres oczekiwania. Gdy wariant z błędem nie wysyła odpowiedzi, test przerywa zadanie usługi i czeka na jego zakończenie. Implementacja wzorcowa zwraca `ERR\tFIELDS` i przechodzi test. Wariant odnawiający termin przy każdym odczycie nie przechodzi wskazanej asercji i kończy się kodem 101 przed upływem 60 sekund.

Wykonane polecenia z limitami czasu:

- `node --import tsx --input-type=module -e '<deadline mutant and restored Cargo tests>'` z 60-sekundowymi limitami podprocesu i zezwoleniem na blokowanie mutanta usunięto
  101; przywrócone odniesienie zakończyło się 0.
- `bun typecheck` — PASS.
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` PASS (2 pliki, 12 testów).
- `npm run content:check`, `npm run content:rust`, `npm run content:packages` i `git diff --check`. PASS.

## Korekta formatowania archiwum

Sześć plików w archiwum startowym sformatowano przy użyciu rustfmt. Obejmują domenę i protokół oraz kod procedury roboczej, serwera, programu głównego i klienta. Zachowano miejsca do uzupełnienia i działanie `todo!`. Oba archiwa przechodzą `cargo fmt --all -- --check`, a rozwiązanie również `cargo clippy --workspace --all-targets --offline --locked -- -D warnings`. Limit wynosił 60 sekund dla formatowania lub 120 sekund dla Clippy oraz 8 MiB danych wyjściowych.

Uruchomiono także `npm run content:cargo`. Problem z formatowaniem projektu końcowego został rozwiązany. Testy integracyjne `tokio-service-workshop` nadal napotkały w środowisku izolowanym błąd pętli zwrotnej `Operation not permitted`. Pełna kontrola repozytorium wymaga odpowiednich uprawnień do komunikacji lokalnej.

## Powtarzalny test anulowania

W teście cyklu życia sygnał `connections_aborted` pojawia się dopiero wtedy, gdy upłynie czas na obsłużenie aktywnych połączeń, a ich zadania zostaną przerwane i zakończone. Po zamknięciu strumienia klienta test czeka na ten sygnał przed wznowieniem zablokowanego zapisu. Następnie sprawdza, czy zatwierdzone wstawienie nadal jest rozliczone jako przyjęte. Dzięki temu anulowanie odbiornika oneshot w wariancie rozłączenia ma określoną kolejność.

Test Cargo przeprowadzono na wygenerowanym archiwum rozwiązania, najpierw z celową zmianą, a potem po przywróceniu implementacji wzorcowej:

- `cargo test -p ingest-service --test lifecycle --offline --locked cancellation_after_enqueue_keeps_terminal_accounting` z 60-sekundowym limitem subprocesowym, zgodnie z oczekiwaniami, usunięto 101;
  przywrócone odniesienie zakończyło się 0, gdy pozwolenie na blokowanie zostało
  włączone.
- To samo polecenie bez pozwolenia na blokadę dotarło do testu, ale zakończyło 101 dla
  `Operation not permitted`; to ograniczenie środowiska jest zachowane w granicach dowodów.
- `bun typecheck`, 30-sekundowe polecenie badania weryfikatora, `npm run content:packages`, `npm run content:check`, `npm run content:rust`, 60-sekundowe
  polecenie oceny capstone oraz `git diff --check` komenda PASS.

W tej rundzie pominięto pełne przebiegi stable i MSRV. Decyzja o wydaniu pozostaje wstrzymana do ukończenia obu z włączoną pętlą zwrotną i sprawdzenia wynikowych raportów JSON.

## Poprawki po drugim przeglądzie

Oba zadania CI uruchamiają `capstone-integration-assessment.test.ts` oraz `capstone-verification.test.ts`. Zadanie MSRV dodaje na początku ścieżki katalog Rust 1.85.0 i ustawia `RUSTUP_TOOLCHAIN=1.85.0`. Każde zadanie przesyła raport odpowiadający własnej wersji narzędzi.

Wariant z błędem rozłączenia modyfikuje wysyłanie odpowiedzi. Jeżeli klient zakończył połączenie i anulowano odbiornik oneshot, wariant pomija rozliczenie przyjętego żądania. Test wysyła ramkę i czeka, aż trafi ona do kolejki, a zadanie zapisu się zatrzyma. Następnie zamyka strumień klienta, wznawia zapis i sprawdza liczbę przyjęć oraz wstawień. Próba działa niezależnie od klucza zdarzenia.

Raport zapisuje polecenie zewnętrznego klienta wraz z wynikiem albo status `unexecuted` z przyczyną, jeżeli wcześniejsza awaria uniemożliwiła jego uruchomienie. Polecenie dla stałego obciążenia jest zapisywane przed porównaniem wyników. Wariant z błędem wymaga kodu 101 i dokładnie jednego testu na etapie `running`, wykrywania testów i w podsumowaniu Cargo. Dodatkowe wpisy, powtórzenia i inne niepowodzenia są odrzucane. Zagnieżdżone bloki sprzątające usuwają katalogi także po błędzie zapisu raportu JSON.

Dodatkowe testy z limitami czasu:

- `bun typecheck` — PASS (`tsc --noEmit`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` PASS (2 pliki, 11 testów; 30-sekundowy alarm).
- `npm run content:packages` Regeneracja PASS; trwała obsługa logowania ZIPs po zmianie urządzenia odłączającego.
- `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
- `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 60; exec @ARGV' npx --no-install vitest run src/content/capstone-integration-assessment.test.ts` PASS (1 plik, 26 testów; 60-sekundowy alarm).
- `node --import tsx --input-type=module -e '<eight mutant target checks>'` PASS; dopasowano wszystkie osiem celów źródłowych.
- `git diff --check` — PASS.
