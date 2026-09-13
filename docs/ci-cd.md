# CI/CD repozytorium

Stan na 13 września 2026. CI jest zdefiniowane w `.github/workflows/ci.yml`.
Wdrożenie aplikacji nie jest jeszcze skonfigurowane: docelowy hosting pozostaje
do wyboru. Konfiguracja nie wymaga sekretów wdrożeniowych i niczego nie publikuje
poza raportami testów w prywatnym repozytorium.

## Kontrole przed scaleniem

Workflow uruchamia się dla PR-ów do `main`, zmian na `main` oraz ręcznie.
Push gałęzi roboczej nie dubluje kosztownych testów jej PR-a. Nowszy przebieg PR-a
anuluje starszy; trwająca kontrola `main` nie jest przerywana.

- `verify`: instalacja z `package-lock.json`, ESLint, TypeScript, Vitest,
  walidacja curriculum, autorskie przypadki Rust/Tokio/Loom, archiwa Cargo,
  workspace i audyt powiązań źródeł. Następnie buduje aplikację i uruchamia
  44 testy Playwright oraz kontrolę offline na tym samym serwerze produkcyjnym.
- `workspace-msrv`: testuje workspace Frame Protocol na dokładnym Rust 1.85.0,
  także z przypiętymi ścieżkami `rustc` i `rustdoc` dla procesów potomnych.
- `mini-grep-fuzz`: sprawdza niezależny oracle, ograniczoną kampanię libFuzzer,
  wykrycie kontrolowanego błędu i odtworzenie przypadku po jego usunięciu.

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
