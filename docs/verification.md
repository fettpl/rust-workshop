# Weryfikacja: Number Guessing+ i CI

Data: 13 września 2026. Katalog obejmuje 118 lekcji w 32 modułach, 121 pojęć, 73 zadania blank-page, 7 śladów pamięci, 237 wpisów źródłowych i 8 projektów. Każdy projekt ma pobierany pakiet Cargo. Bieżący etap rozszerza pierwszy projekt o pełną pojedynczą rundę Number Guessing+, cztery lekcje, osiem bramek i cztery kodowe powtórki.

## Zakończone kontrole lokalne

| Sprawdzenie | Wynik |
| --- | --- |
| Vitest | 171/171 w 36 plikach |
| TypeScript i ESLint | Bez błędów; lint bez ostrzeżeń |
| Build | Produkcyjny build Next zakończony powodzeniem |
| Curriculum i źródła | Walidacja poprawna, 237/237 adresów HTTP 200, bez brakujących bramek i aktywnych powtórek |
| Rust | 1343/1343 przypadków; po końcowej korekcie treści i formatowaniu ponownie sprawdzono wszystkie 46 przypadków nowego modułu, w tym dwa wspólne sprawdzenia weryfikatora |
| Tokio | 252/252 autorskich przypadków; testy TCP używają lokalnego IPv4 loopback |
| Loom | Poprawne modele przechodzą, dwa kontrprzykłady i osłabiona biblioteka są odrzucane właściwymi asercjami |
| Archiwa Cargo | Osiem starterów: fmt/check i oczekiwane niepowodzenie TODO; osiem referencji: fmt/check/test/Clippy |
| Number Guessing+ | Osiem plików; 15 testów kontraktu biblioteki oraz 3 testy CLI i jego harnessu |
| Number Guessing+ — stable i MSRV | Dokładne serwowane ZIP-y sprawdzone na stable 1.98.1 i Rust 1.85.0; graf Cargo.lock pozostaje niezmieniony |
| Number Guessing+ — cztery mutacje | Wykryto zużycie próby dla błędnego wejścia, porażkę po ostatnim trafieniu, zmianę sekretu w sesji oraz odczyt przed flush; każda referencja przechodzi po przywróceniu |
| Frame Protocol | Sprawdzony workspace, biblioteka osobno, macierz features i 10 mutacji na dokładnym Rust 1.85.0; bieżący stable był również sprawdzony w poprzednim bloku i zdalnym CI |
| Mini grep | Referencja: 16 testów integration/property/process i 1 doctest; cztery celowe mutacje wykryte |
| Mini grep — fuzz | Ograniczona kampania libFuzzer, niezależny oracle, wykryty mutant substring→prefix i udane odtworzenie kontrprzykładu po przywróceniu referencji |
| Offline | Cache v20: osiem ZIP-ów ma identyczne bajty bez sieci; nieodwiedzony Number Guessing+ przywraca krok, szkic i hint; brak pageerrors |
| Produkcyjne E2E | 46/46 bez retry na gotowym buildzie, w tym mobile, Axe, wznowienie i świeże bramki po podglądzie pakietu |
| Ręczny UI | Mapa, karta projektu i kontrakt sesji są czytelne; sformatowany Rust, widoczny fokus, strzałki Zadanie → Kod → Output; brak błędów i ostrzeżeń konsoli |

## Co sprawdzono w Number Guessing+

Pojedyncza runda losuje sekret przez przypięte rand 0.10.2, a opcja --secret daje deterministyczną sesję ćwiczeniową. Testy obejmują pustą linię oddzielnie od EOF, Unicode trim, cyfry ASCII i przepełnienie, wszystkie stany końcowe, ostatnie poprawne trafienie, błędy bez zmiany stanu, 128/129 surowych bajtów, CRLF, brak końcowego LF i oryginalne błędy I/O. Test procesu zwykłej gry dobiera kolejne strzały przez bisekcję i wymaga wygranej oraz kodu 0; nie zakłada konkretnej sekwencji generatora.

Testy negatywne muszą uruchomić dokładnie wskazany test i zostać odrzucone jego asercją. Błąd kompilacji, brak testów, sygnał i timeout nie są uznawane za wykrycie mutanta. Root odtworzył dodatkowo zakleszczenie harnessu przy pełnym kanale wyjścia: test regresyjny najpierw zawiódł, a po rozłączeniu odbiorcy przed join przeszedł. Testy procesu sprzątają dziecko przy błędzie i ograniczają oczekiwanie na odpowiedź.

Niezależne przeglądy wykryły i doprowadziły do naprawy mylenia pustej linii z EOF, zawijania identyfikatorów rezerwacji, brakujących granic w testach i niedopowiedzianych kontraktów w poleceniach. Świeże zadania dotyczą innych problemów: poleceń dozownika, rezerwacji limitu, pojedynczego komunikatu oraz przydziału identyfikatora z konfliktem rezerwacji. Powtórka źródła wartości dodaje błąd zewnętrznego źródła. Stare ID projektu, lekcji i kroków oraz notatki, szkice i hints przechodzą import/eksport bez resetu.

Kontrola MSRV odrzuciła zbędną deklarację lintu nieznanego Clippy 1.85; usunięto ją, a następnie przeszła cała kontrola MSRV. Dawny test E2E Todo przestał wybierać pierwszy pakiet portfolio i wskazuje teraz konkretny projekt, którego storage sprawdza. Test integracyjny mutacji Mini grep ma osobny limit 120 sekund, ponieważ wykonuje rzeczywiste kompilacje Rust; jego poprawny przebieg przekroczył domyślny limit jednostkowy 5 sekund. Asercje i watchdogi procesów pozostały zachowane. Po poprawkach Vitest i pełne E2E przeszły ponownie.

## CI i scalenia

CI uruchamia sprawdzenie Number Guessing+ na stable oraz w jobie MSRV przed scaleniem. Zasady uprawnień, wersji akcji, diagnostyki, utrzymania zależności i ograniczenia planu GitHub opisuje [CI/CD](ci-cd.md). Docelowy hosting nadal nie został wybrany; nie skonfigurowano wdrożenia aplikacji.

Bieżący blok został zapisany w commicie 8d9536e i wypchnięty jako [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7). Pierwszy przebieg CI potwierdził MSRV i fuzz, ale zatrzymał się na sprawdzaniu startera: Cargo kończyło po błędzie testów procesu, zanim bezpośrednie testy kontraktu mogły pokazać oczekiwane `todo!`. Weryfikatory starterów wymagają uruchomienia wszystkich zestawów przez `--no-fail-fast`; nie znoszą wymogu niezerowego statusu, niepustego niepowodzenia i śladu `todo!`. Testy pełnych referencji zachowują dotychczasowe zasady. Po poprawce ponownie przeszły Number Guessing+ na stable i Rust 1.85.0 oraz wszystkie osiem archiwów Cargo. Poprawiony head wymaga ponownej kontroli wszystkich trzech jobów przed scaleniem.

Poprzedni [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), Mini grep i CI, został scalony jako f49e9fb7cd0cb058aeb55ab84843a91454eea5b5 po [udanym CI commita 5e12660](https://github.com/fettpl/rustcrushcourse/actions/runs/34746892334). [CI po merge do main](https://github.com/fettpl/rustcrushcourse/actions/runs/34747218768) także zakończyło się sukcesem. Tamten blok miał 165 testów Vitest, 1299 różnych przypadków Rust, 226 źródeł, siedem pakietów i 44 E2E. Lokalne wyniki 1251 + 50 powtórzyły dwa wspólne sprawdzenia techniczne, dlatego nie oznaczały 1301 różnych przypadków.

Wcześniejszy [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest scalony w 64667e4; etap publicznego API miał [udane CI](https://github.com/fettpl/rustcrushcourse/actions/runs/34743788852). Te historyczne przebiegi nie zastępują kontroli bieżącego bloku.

## Odtworzenie

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:models -- --fetch
npm run content:guessing -- --fetch
npm run content:guessing -- --msrv
npm run content:cargo
npm run content:fuzz -- --fetch
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:audit -- --check-links
npm run build
# osobny terminal: npm start -- --port 3002
npx --no-install playwright test --config .github/playwright.production.config.ts --retries=0
npm run test:offline
```

Instalacja dokładnego toolchainu i cargo-fuzz jest opisana w README. Autorskie testy TCP wymagają lokalnego IPv4 loopback. Weryfikatory wykonują wyłącznie zaufane pliki repozytorium w katalogach tymczasowych, bez kodu z importów ucznia i bez nowego POST do publicznego Playgrounda. E2E podstawia kontrolowane odpowiedzi runnera.

## Pozostały zakres

Pełny cel zaawansowanego kursu pozostaje otwarty: Cargo i publikowanie, variance/HRTB, szersze property/fuzz, pomiary, unsafe/FFI, utrzymanie systemów i capstone. Automatyczne ponawianie rund Number Guessing+ oraz nagranie code reading pozostają rozszerzeniem szerszego portfolio. Testowanie rand nie jest dowodem jakości statystycznej ani kryptograficznej. Kampania fuzz nie dowodzi całej polityki I/O i ścieżek. Audyt zachowuje luki trwałej historii migracji i pochodzenia wersji materiału. Pilotaż z uczącą się osobą oraz ręczna ocena czytnikiem ekranu pozostają do wykonania.
