# Weryfikacja: publiczne API, workspace Cargo i Mini grep

Data: 13 września 2026. Katalog obejmuje 114 lekcji w 31 modułach, 117 pojęć, 69 zadań blank-page, 7 śladów pamięci, 226 wpisów źródłowych i 8 projektów; 7 projektów ma pakiet Cargo. Poprzedni etap dodał cztery lekcje publicznego API i workspace Frame Protocol. Etap Mini grep dodaje cztery lekcje, osiem bramek, cztery blank-page, cztery powtórki oraz bibliotekę i CLI `mini-grep-workshop`.

## Zakończone kontrole lokalne

| Sprawdzenie | Wynik |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest | 165/165 w 34 plikach |
| TypeScript, ESLint i build | Typecheck bez błędów; ESLint zakończył się bez błędów i ostrzeżeń; końcowy build produkcyjny przeszedł |
| Curriculum i źródła | Katalog ma wskazane wyżej liczniki; 226/226 źródeł zwróciło HTTP 200 |
| Rust | 1251/1251 przypadków istniejącego, zamrożonego curriculum oraz 50/50 nowych przypadków Mini grep w rozłącznych przebiegach, razem 1301/1301 |
| Tokio i Loom | 252/252 autorskich przypadków Tokio; modele referencyjne Loom przechodzą, dwa kontrprzykłady i osłabiona biblioteka są odrzucane właściwymi asercjami |
| Archiwa Cargo | Wszystkie 7 starterów przeszło fmt/check i zatrzymało się na zamierzonym `todo!`; wszystkie 7 referencji przeszło fmt/check/test/Clippy |
| Mini grep — finalne archiwum | Referencja ma 16 testów integration/property/process i 1 doctest |
| Mini grep — mutacje pakietu | Odrzucone: brak unii okien kontekstu, akceptacja bajtu ponad limitem surowej linii, podążanie za symlinkiem i częściowy stdout po błędzie wejścia |
| Frame Protocol — bieżący compiler | Workspace i biblioteka osobno: default/no-default/all-features, osobne diagnostics biblioteki i klienta, fmt/check/test/Clippy/doc oraz 10 kontrolowanych mutacji |
| Frame Protocol — Rust 1.85.0 | Ten sam zestaw na dokładnym minimum kompilatora; `PATH`, `RUSTC` i `RUSTDOC` są przypięte także dla procesów potomnych |
| Mini grep — fuzz | 20000-próbna kampania libFuzzer z niezależnym oracle wykryła mutanta substring→prefix; zapisany przypadek odtworzono po przywróceniu referencji |
| Offline | Cache v19: 7 ZIP-ów ma identyczne bajty po reload bez sieci; nieodwiedzony Mini grep przywraca szkic, hint i krok; `pageerrors` jest puste |
| Produkcyjne E2E | 44/44 bez retry; desktop, mobile, wznowienie zapisu i niezależne bramki po podglądzie projektu |
| Ręczny przegląd produkcji | Karta projektu, lekcja i blank-page są czytelne; fokus klawiatury jest widoczny, Enter otwiera mapę, konsola nie ma błędów ani ostrzeżeń |

## Dowody Mini grep

Referencyjne archiwum ma bibliotekę i binarkę, rozdziela odczyt/wybór kontekstu, traversal, renderowanie i argumenty. Testy Cargo obejmują `BufRead` w małych porcjach, CRLF, samotny CR na EOF, Unicode, granice bajtowe, błąd odczytu po trafieniu z oryginalną przyczyną, katalogi i proces CLI. Starter kompiluje się i formatuje, ale kończy na jawnych `todo!`; jego porażka nie jest liczona jako przejście.

`content:fuzz` działa wyłącznie na dokładnym, wyekstrahowanym archiwum autora. Sprawdza niezależny oracle, kampanię z maksymalnie 20000 próbami lub 30 sekundami przy wejściach do 4096 bajtów, stałego mutanta i replay po przywróceniu referencji. Końcowy lokalny przebieg po korekcie wyłącznie testowego warunku granicznego zapisał kampanię, kontrprzykład i udany replay. Fuzzowanie małego tekstu nie dowodzi limitów alokacji obcej implementacji `BufRead`, pełnej polityki I/O ani bezpieczeństwa traversal.

Kontrole wykonują wyłącznie zaufane pliki repozytorium i celowe mutacje w katalogach tymczasowych. Nie uruchamiają szkiców ani importów ucznia i nie wysyłają nowego kodu do publicznego Playgrounda. Pobranie archiwum albo lokalne uruchomienie Cargo nie nadaje automatycznie mastery.

## Produkcyjne E2E i publikacja bloku

Pełne E2E zakończyło się wynikiem **44/44 bez retry** na produkcyjnym buildzie. Testy zachowują szkice, wskazówki, notatki i wybrany panel po zakończeniu zapisu IndexedDB. W sześciu plikach testów dodano oczekiwanie na potwierdzenie zapisu przed reloadem; na wąskim ekranie kontrolowany jest tekst ukrytego statusu. Nie usunięto asercji stanu ani nie wydłużono timeoutów.

Kontrola z dokładną konfiguracją CI ujawniła także opóźnione przejęcie fokusu przez zmianę widoku. Efekt nawigacji ustawia teraz fokus synchronicznie po zmianie DOM, zanim użytkownik przejdzie do zakładki Output. Po poprawce ponownie przeszły build, lint, typecheck, 165 testów Vitest, 44 E2E i offline. Ręczna kontrola finalnego buildu potwierdziła widoczny fokus oraz przejście strzałkami Zadanie → Kod → Output bez utraty fokusu; konsola nie zawierała błędów ani ostrzeżeń.

Blok obejmuje także wzmocnienie CI opisane w [CI/CD](ci-cd.md). Wynik zdalnych jobów dla dokładnego SHA musi zostać sprawdzony przed scaleniem PR; lokalne wyniki go nie zastępują.

## Repozytorium i odtworzenie

[PR #1](https://github.com/fettpl/rustcrushcourse/pull/1) jest scalony w commit `64667e4`. Poprzedni milestone `89a388e687a50a6c51616b6a44d699d31ccb9467` na `feat/public-api-workspaces` ma [udane CI](https://github.com/fettpl/rustcrushcourse/actions/runs/34743788852): oba joby zakończyły się sukcesem, z 158 testami Vitest, 1251 przypadkami rustc, 252 Tokio i 42 E2E bez retry. Ten historyczny przebieg nie zastępuje kontroli SHA bieżącego bloku.

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:models -- --fetch
npm run content:cargo
npm run content:fuzz -- --fetch
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:audit -- --check-links
npm run build
# w osobnym terminalu: npm start -- --port 3002
npx --no-install playwright test --config .github/playwright.production.config.ts
npm run test:offline
```

Dokładny starszy kompilator instaluje polecenie opisane w README. Autorskie testy TCP wymagają lokalnego IPv4 loopback; `content:fuzz -- --fetch` wymaga także przypiętego nightly, cargo-fuzz i kompilatora C++.

## Granice dowodu i pozostały zakres

Kontrole Frame Protocol są konkretnym dowodem jego workspace, features, aktualnych klientów i Rust 1.85.0, lecz nie pełnym dowodem SemVer ani identycznych binariów na wszystkich platformach. Mini grep ma ograniczony test własności i skończoną kampanię fuzz; nie zastępują one pełnego curriculum property/fuzz, benchmarków, profilowania ani większej polityki I/O i ścieżek.

Cel zaawansowanego kursu pozostaje otwarty. Do dostarczenia pozostają m.in. zaawansowane Cargo i publikowanie, variance/HRTB, pełne property/fuzz, profilowanie, unsafe/FFI, utrzymanie systemów, pełne Number Guessing+ oraz capstone. Audyt zachowuje luki produktu dotyczące trwałej historii migracji i pochodzenia wersji materiału. Pilotaż z osobą zaczynającą Rust oraz ręczna ocena czytnikiem ekranu również pozostają do wykonania.
