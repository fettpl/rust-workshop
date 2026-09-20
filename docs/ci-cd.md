# CI/CD repozytorium

Stan na 17 września 2026. CI jest zdefiniowane w `.github/workflows/ci.yml`.
Wdrożenie aplikacji nie jest jeszcze skonfigurowane: docelowy hosting pozostaje
do wyboru. Konfiguracja nie wymaga sekretów wdrożeniowych i niczego nie publikuje
poza raportami testów w prywatnym repozytorium.

The `mini-grep-fuzz` job installs both the reviewed nightly `nightly-2026-08-08`
and exact Rust `1.85.0`. It uploads the report, raw logs, corpus and artifacts
with `if: always()`. Local verification records `cargo-fuzz` absence, loopback
`EPERM` and Chromium launch permission failures as infrastructure limitations;
those failures are not converted into a passed evidence report.

## Kontrole przed scaleniem

Workflow uruchamia się dla PR-ów do `main`, zmian na `main` oraz ręcznie.
Push gałęzi roboczej nie dubluje kosztownych testów jej PR-a. Nowszy przebieg PR-a
anuluje starszy; trwająca kontrola `main` nie jest przerywana.

- `verify`: instalacja z `package-lock.json`, ESLint, TypeScript, Vitest,
  walidacja curriculum, autorskie przypadki Rust/Tokio/Loom, archiwa Cargo,
  workspace, manifesty TOML i audyt powiązań źródeł. Następnie buduje aplikację i uruchamia
  testy Playwright oraz kontrolę offline na tym samym serwerze produkcyjnym.
  Separate capstone steps run the restricted archive verifier on stable and exact
  Rust 1.85.0 before generic `content:cargo`, upload the JSON report as a seven-day
  artifact and run the capstone assessment fixtures. E2E uses only a controlled
  `/api/run` mock; offline compares both capstone ZIPs byte-for-byte and preserves
  the draft, note and exact step. The Number Guessing+ step still checks the
  starter, solution, CLI processes and four controlled program faults.
- `workspace-msrv`: tests the Frame Protocol workspace, Number Guessing+ package and
  capstone on exact Rust 1.85.0, with pinned `rustc` and `rustdoc` paths for child
  processes. It also verifies fixed manifests and the features-unification example
  with Cargo 1.85.0.
  Osobny krok wybiera katalog kompilatora przez `rustup which --toolchain 1.85.0`
  i umieszcza go na początku `PATH`, sprawdzając przykłady GAT oraz ich
  referencje, poprawne alternatywy i celowe błędne implementacje. Kontrola
  minimalnej wersji obejmuje dzięki temu kod lekcji, a nie tylko archiwa Cargo.
- `mini-grep-fuzz`: sprawdza niezależny oracle, ograniczoną kampanię libFuzzer,
  controlled bug detection and replay after restoring the reference. The job
  compares both ZIPs with the generator, runs stable replay separately from the
  nightly campaign, and uploads `report.json`, logs, corpus, and original and
  reduced artifacts with `if: always()` and seven-day retention. Missing
  provenance, instrumentation, normal completion or a fresh artifact produces a
  failure or `infrastructure`, never a green report.
- `content:property` runs only the authored Property Contracts archive. It checks
  the locked Proptest 1.11.0 development dependency, starter and solution
  behavior, replay of the checked-in regression, formatting, Clippy, and a
  compiling mutant that must be rejected. The stable job and the MSRV job both
  run it; `--msrv` selects the exact Rust 1.85.0 toolchain.
- `allocation-evidence`: a three-entry Ubuntu stable, Ubuntu Rust 1.85.0 and
  macOS stable matrix runs `content:allocations`. The job regenerates and hashes
  both Log Analyzer archives, checks formatting/Cargo tests/Clippy offline,
  executes baseline, candidate and materialization mutant as separate processes
  on eight identical workloads, including reader errors and line boundaries, and uploads bounded JSON reports. The counter has
  no Valgrind dependency and the report makes no RSS or universal-threshold claim.

Kontrole używają Node.js 22, bieżącego stable Rust oraz osobnych, jawnie
przypiętych toolchainów MSRV i fuzzera. Bieżący stable celowo sprawdza również
aktualność przykładów. To odtwarzalne kontrakty i zablokowane zależności,
nie deklaracja identyczności wszystkich bajtów buildu na różnych platformach.

Produkcję uruchamia bezpośrednio proces Next z gotowego buildu. Oczekiwanie
na gotowość ma ograniczoną liczbę prób i timeout pojedynczego żądania; wcześniejsze
zakończenie procesu przerywa krok. Trap kończy serwer także po nieudanym teście.
Workflow uruchamia własny serwer, a konfiguracja
`.github/playwright.production.config.ts` ma zero retry. Połączenia
E2E z runnerem są kontrolowanymi odpowiedziami testowymi; CI nie wysyła szkiców
użytkownika do Playgrounda. Rzeczywisty Rust wykonywany przez maintainerowe
weryfikatory pochodzi z repozytorium, a nie z importów ucznia.

## Uprawnienia, utrzymanie i diagnoza

Domyślny token ma tylko `contents: read`, checkout nie zachowuje poświadczeń,
a workflow nie korzysta z uprzywilejowanego `pull_request_target`. Wszystkie
akcje są przypięte pełnym SHA zweryfikowanym w repozytorium autora. Te wybory
odpowiadają [zaleceniom bezpieczeństwa GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use).

Limity czasu jobów wynoszą 30 minut dla pełnej kontroli i po 20 minut dla MSRV
oraz fuzzera. Niepowodzenie przechowuje log serwera, raport HTML Playwright,
trace, screenshot i nagranie. Logi fuzzera, korpus i kontrprzykłady są zachowywane
również po sukcesie. Artefakty mają retencję siedmiu dni.

Dependabot sprawdza npm i GitHub Actions raz w tygodniu. Jego zmiany przechodzą
ten sam PR i kontrole; nie skonfigurowano automatycznego merge. Aktualizacja
narzędzia nie zastępuje przeglądu zmian w zachowaniu testów i curriculum.

`content:guessing -- --fetch` pobiera wyłącznie zależności przypięte w autorskim
pakiecie z rand 0.10.2. Dalsze kontrole działają z `--offline --locked`; skrypt
nie przyjmuje ścieżki, kodu ani nadpisania zależności. Wariant `--msrv` sprawdza
wersje cargo, rustc i rustdoc przed uruchomieniem oraz wybiera katalog tego
toolchainu dla formatowania i Clippy. Celowe błędy muszą skompilować się
i zostać odrzucone przez konkretny test zachowania; timeout, błąd kompilacji ani
uruchomienie zera testów nie zaliczają kontroli. Po każdej mutacji przywrócona
referencja musi ponownie przejść ten test.

`content:property -- --fetch` pobiera tylko zależności z lockfile pakietu
Property Contracts i następnie działa offline/locked. Weryfikator buduje
archiwum z autorskich danych, porównuje je z pobieranym ZIP-em, sprawdza
starter, rozwiązanie, replay regresji i kontrolowanego mutanta. Nie przyjmuje
kodu ucznia, ścieżek ani nadpisań zależności; biblioteka ćwiczenia pozostaje
std-only, a Proptest jest używany wyłącznie w testach deweloperskich.

`content:capstone -- --fetch` and `content:capstone -- --fetch --msrv` accept only
the `--fetch` and `--msrv` flags. Each run invalidates its prior report, compares
the generated archive with both served ZIP variants, extracts only the authored
35-file workspace, and records bounded command output, toolchain versions, archive
digest, recovery checks and eight controlled-mutant outcomes. A compile error,
timeout, signal, empty test run or infrastructure failure is never treated as
mutant evidence. The release procedure stays on Hold until both stable and MSRV
JSON reports are fresh and independently reviewed; live advisory/license review
and production operations remain outside this milestone.

Dla nieukończonych starterów Cargo używa `--no-fail-fast`: błąd testu procesu
nie może pominąć bezpośrednich testów kontraktu, które potwierdzają oczekiwane
`todo!`. Weryfikator nadal wymaga niezerowego wyniku, nieudanego zestawu testów
i komunikatu o niezaimplementowanym zachowaniu. Pełne referencje muszą przejść
wszystkie testy bez tego wyjątku.

Etap Cargo pobiera autorski lockfile Frame przez `content:workspace -- --fetch` przed ogólnym `content:cargo`; dalsze polecenia pracują offline/locked. `content:manifests` sprawdza wyłącznie konteksty zapisane w repozytorium, w tym różnicę gramatyki TOML pomiędzy stable i MSRV oraz rzeczywisty przykład normal/dev. Zwykłe testy deklaracji używają `cargo metadata --no-deps --offline`, więc nie wymagają cache registry. Kontrole archiwum używają wspólnego walidatora listy plików i mutacji, która musi zostać przez niego odrzucona.

## Scalenie i ograniczenia platformy

Przed scaleniem należy potwierdzić sukces wszystkich trzech jobów dla aktualnego
commita PR-a i przejrzeć zmianę. Scalenie powinno wskazywać oczekiwany SHA,
aby późniejszy push nie podmienił sprawdzonego kodu. Po merge workflow ponownie
sprawdza `main`.

Próba odczytu ochrony gałęzi i rulesetów zwróciła HTTP 403 z informacją, że
funkcja wymaga GitHub Pro albo repozytorium publicznego. Obecny plan tego
prywatnego repozytorium nie pozwala więc wymusić bramek na poziomie GitHub.
Sam plik workflow nie blokuje przycisku merge ani bezpośredniego push do `main`.
Widoczność repozytorium i plan konta pozostały bez zmian. Gdy funkcja będzie
dostępna, należy wymagać PR-a, aktualnych pozytywnych kontroli oraz blokady
force-push i usunięcia `main`.

## Docelowe wdrażanie

Część CD zostanie dopasowana do wybranego hostingu. Jej kontrakt obejmuje
preview dla PR-a, identyfikację wydania commitem, kontrolę gotowości wdrożenia,
promowanie przetestowanego artefaktu oraz możliwość powrotu do poprzedniego
wydania. Uprawnienia wdrożenia powinny należeć do osobnego joba i środowiska;
OIDC jest preferowane tam, gdzie hosting je obsługuje. Reguły środowisk i dostęp
do sekretów zależą od platformy oraz planu konta, zgodnie z
[dokumentacją środowisk GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
Są to wymagania następnego kroku, a nie już działające wdrożenie.

## Odtworzenie kontroli produkcyjnej

```sh
npm ci
npm run build
# osobny terminal; użyj wolnego portu 3002:
npm start -- --port 3002
# przy uruchomionej produkcji:
npx --no-install playwright test --config .github/playwright.production.config.ts
npm run test:offline
```

Wyniki konkretnego przebiegu i granice dowodów opisuje [raport weryfikacji](verification.md).
