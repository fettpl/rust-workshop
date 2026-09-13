# Weryfikacja etapu: publiczne API i workspace Cargo

Data: 13 września 2026. Katalog obejmuje 110 lekcji w 30 modułach, 113 pojęć, 218 wpisów źródłowych, 65 zadań od pustej kartki, 7 śladów pamięci i 7 projektów; sześć projektów ma pakiet Cargo. Ten etap dodaje cztery lekcje, osiem bramek (w tym cztery blank-page), cztery kodowe powtórki i rzeczywisty workspace z biblioteką oraz osobnym klientem.

Przeglądy treści, pakietu i weryfikatorów oraz lokalne kontrole interfejsu, produkcyjnego buildu i offline są zakończone.

## Kontrole

| Sprawdzenie | Wynik |
| --- | --- |
| Vitest | 158/158 w 30 plikach; obejmuje rzeczywiste metadane Cargo i zachowanie niezależnych bramek po reveal |
| TypeScript i ESLint | Bez błędów |
| Curriculum | Poprawne relacje 110 lekcji, 113 pojęć i 7 śladów |
| Źródła HTTP | 218/218 HTTP 200; brak uszkodzonych referencji, lekcji bez bramki i pojęć bez aktywnej powtórki |
| rustc | Pełny przebieg 1251/1251; po ostatnich zmianach ćwiczeń dodatkowo 46/46 przypadków zamrożonego modułu API |
| Cargo/Tokio | 252/252 autorskie przypadki, w tym lokalne TCP |
| Loom | Poprawne modele przechodzą; dwa kontrprzykłady i osłabiona biblioteka odrzucone przez właściwe asercje |
| Pakiety Cargo | Wszystkie sześć: starter fmt/check i oczekiwana porażka na todo; referencje fmt/check/test/Clippy |
| Frame Protocol — obecny kompilator | Workspace i biblioteka osobno: default/no-default/all-features; osobne diagnostics biblioteki oraz klienta; fmt/check/test/Clippy/doc i stały lockfile |
| Frame Protocol — dokładny Rust 1.85.0 | Ten sam zestaw konfiguracji, testów i dziesięciu kontrolowanych mutacji przechodzi na deklarowanym minimum kompilatora |
| Liczba testów pakietu | Referencja: 17 testów domyślnie i 18 z all-features; obejmuje dwa compile-fail doctesty i osobny proces CLI |
| Pełne E2E | 42/42 po zamrożeniu treści; nowe scenariusze obejmują wznowienie modułu, pobranie i reveal projektu oraz mobilną dostępność |
| Build produkcyjny | Przeszedł; hashe plików treści nie zmieniły się podczas budowania |
| Offline | Cache v18; sześć ZIP-ów pobranych po reload bez sieci ma identyczne bajty; nowy moduł przywraca dokładne zadanie, szkic i hint; brak błędów strony |
| Ręczna kontrola produkcji | Mapa 30 modułów, wyszukiwanie, nowa lekcja i karta projektu czytelne; Tab → skip link → Enter przenosi fokus do main, Enter otwiera krok; konsola bez ostrzeżeń i błędów |

Pierwszy przebieg E2E miał 41/42 wyników pozytywnych podczas równoczesnych zmian importowanej treści przez HMR; log wskazywał odłączenie DOM i granicę błędu Reacta. Test przechodził samodzielnie. Nie zmieniono CSS ani nie osłabiono kliknięcia; pełny przebieg powtórzony po zamrożeniu plików przeszedł.

## Niezależne przeglądy i poprawki

Recenzje obu grup lekcji, projektu oraz weryfikatorów wykonali inni autorzy niż osoby implementujące daną część. Zgłoszone problemy poprawiono przed zamknięciem recenzji:

- Blank dotyczący błędów wymaga teraz niezależnego odczytu discriminatora i długości z dwoma etapami awarii. Opis podaje jawny publiczny format wyniku i nazwy accessorów, pozostawiając prywatną reprezentację oraz algorytm uczniowi.
- Testy limitów bajtów obejmują tekst wielobajtowy, aby odrzucić mylenie liczby znaków z liczbą bajtów. Testy jednego pliku nie są opisane jako dowód prywatności między crate’ami.
- Escapowane znaczniki dokumentacji powodowały zero doctestów. Artefakt zawiera teraz rzeczywiste bloki, a weryfikator wymaga co najmniej dwóch wykonanych testów dokumentacji.
- Test CLI rozdziela konfigurację domyślną i diagnostyczną oraz pokazuje stderr procesu. Dzięki temu porażka startera wskazuje rzeczywiste todo, zamiast ukrywać je za samym kodem wyjścia.
- Publiczne testy zachowują oryginalny obiekt przyczyny błędu dla obu etapów odczytu i zapisu. Adapter testowy obsługuje dowolną długość bufora zgodnie z kontraktem Read.
- Display opisuje etap operacji; Error::source udostępnia przyczynę. Regresja zapobiega powielaniu komunikatu przy prezentacji łańcucha błędów.
- Kontrola manifestów sprawdza deklarowane dziedziczenie metadanych i przekazywanie diagnostics do biblioteki. Osobny build klienta zapobiega ukryciu brakującego feature przez unifikację całego workspace.

## Co udowadniają kontrole negatywne

`scripts/workspace-mutants.ts` celowo zmienia wyłącznie wyekstrahowaną autorską referencję. Łącznie wykonuje dziesięć kontrolowanych mutacji. Pierwsze dziewięć narusza prywatność, non_exhaustive, wymagane metody traitu, zgodność z dyn, minimalne bounds, stare importy, zachowanie odczytu, zachowanie przyczyny I/O i włączną granicę rozmiaru. Wymagane są odpowiednie kody diagnostyk albo właściwe asercje; timeout, sygnał i brak uruchomionych testów nie stanowią sukcesu.

Dziesiąta próba najpierw potwierdza, że workspace ze zunifikowanym diagnostics przechodzi, a następnie wymaga odrzucenia tej samej biblioteki budowanej osobno bez domyślnych features. Weryfikator przywraca oryginalne pliki po próbach, także przy błędzie. Niezależny recenzent uruchomił te kontrole i porównał przywrócone bajty.

Testy metadanych zmieniają prawdziwe tymczasowe manifesty: pomijają klienta, podnoszą MSRV, zastępują dziedziczone edition/MSRV wartościami lokalnymi i usuwają przekazywanie diagnostics. Osobna próba odczytuje zadeklarowaną, wyłączoną zależność rejestrową przez cargo metadata --no-deps --offline i potwierdza jej odrzucenie bez pobierania. Kontrola układu jest jawnym kontraktem stałego autorskiego formatu, nie ogólnym parserem TOML; rozstrzygnięte fakty pochodzą z Cargo.

## Granice dowodu

Kontrola kolejności limitu przed alokacją opiera się na przeglądzie referencji. Testy potwierdzają brak odczytu payloadu i brak zapisu po odmowie, lecz nie mierzą wszystkich alokacji; u16 ogranicza ramkę do 65535 bajtów. Próby starych klientów są konkretnym dowodem zgodności, nie pełnym dowodem SemVer dla dowolnego klienta.

Rust 1.85.0 został rzeczywiście uruchomiony; sam rust-version nie wystarczyłby do potwierdzenia minimum. Ten zakres nie obejmuje publikowania, pełnej polityki zależności ani identyczności binariów na wszystkich platformach.

Weryfikacja wykonuje wyłącznie przejrzany kod repozytorium i przygotowane mutacje. Nie wykonuje lokalnie szkiców ani importów ucznia. E2E zastępuje odpowiedzi /api/run; nowych przykładów nie wysłano do publicznego Playgrounda. Ćwiczenia jednego pliku nie dowodzą wykonania workspace w przeglądarce. Pobranie lub uruchomienie Cargo lokalnie nie nadaje automatycznie mastery.

## Repozytorium i odtworzenie

[PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest scalony w commit 64667e4; stan potwierdzono ponownie w tym etapie. Poprzedni milestone 0d25d9d ma [udane CI](https://github.com/fettpl/rustcrushcourse/actions/runs/34729729100). Bieżący etap jest przygotowywany do commita i push na feat/public-api-workspaces; wynik zdalny należy sprawdzić dla konkretnego wypchniętego commita.

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:models -- --fetch
npm run content:cargo
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:audit -- --check-links
npm run build
npm run test:e2e -- --workers=4
```

Przy produkcyjnym serwerze na 3002: npm run test:offline. Dokładny starszy kompilator instaluje polecenie opisane w README. Autorskie testy TCP wymagają lokalnego IPv4 loopback.

## Pozostały zakres całego kursu

Cel zaawansowanego kursu pozostaje otwarty. Do dostarczenia pozostają m.in. zaawansowane Cargo i publikowanie, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI, utrzymanie systemów, pełne Number Guessing+, Mini grep i capstone. Audyt zachowuje luki produktu dotyczące pełnej historii migracji i pochodzenia wersji materiału. Pilotaż z uczącymi się oraz ręczna ocena czytnikiem ekranu również pozostają do wykonania.
