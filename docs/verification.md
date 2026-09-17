# Weryfikacja: zależności, features i pakowanie Cargo

Data: 17 września 2026. Katalog obejmuje 126 lekcji w 34 modułach, 129 pojęć, 81 zadań blank-page, 7 śladów pamięci, 257 wpisów źródłowych i 8 projektów z pakietami Cargo. Etap `cargo-dependency-lifecycle` dodaje cztery lekcje po publicznym API, osiem bramek i cztery niezależne powtórki TOML. Rozszerza istniejący Frame Protocol, zachowując identyfikatory projektów i schemat postępu v3.

## Lokalne kontrole bieżącego etapu

| Sprawdzenie | Wynik |
| --- | --- |
| Vitest | 216/216 w 43 plikach; osobne sprawdzenie metadanych Cargo z pustym `CARGO_HOME`: 10/10 |
| TypeScript i ESLint | Brak błędów; dwa wcześniejsze ostrzeżenia o nieużywanych starterach w `borrowed-hrtb.ts` |
| Curriculum | 126 lekcji, 129 pojęć, 7 śladów; kompletne bramki i aktywne powtórki |
| Źródła | Audyt 257 wpisów i ich adresów zakończony sukcesem; brak uszkodzonych odwołań |
| Rust | 1397/1397 autorskich przypadków; weryfikator pomija TOML także zawierający tekst podobny do Rust |
| Manifesty | Stable Cargo 1.98.1 i dokładny Cargo 1.85.0: 9 prób składni, 12 kontekstów rozwiązań oraz rzeczywiste drzewa features przykładu normal/dev |
| Frame Protocol | Stable i dokładny Rust 1.85.0: lockfile, metadane, graf domyślny i all-features, macierze biblioteki/klienta/workspace, testy, fmt, Clippy, rustdoc, lokalne pakowanie i 14 kontroli negatywnych |
| Pozostałe archiwa | Wszystkie osiem starterów i rozwiązań: fmt/check/test oraz Clippy rozwiązań, z oczekiwanymi błędami nieukończonych starterów; kontrolowane mutacje Mini grep odrzucone |
| Niezależna recenzja | Autorzy GPT-5.6-Luna high, recenzenci GPT-6-Astra xhigh; sześć zakresów zaakceptowanych po poprawkach |
| Build i E2E | Produkcyjny build i 50/50 E2E bez retry na końcowym kodzie |
| Offline | Cache v24; osiem starterów ZIP ma identyczne bajty przed i po przejściu offline; nowy blank TOML przywraca szkic i zalicza deklarację lokalnie; brak pageerrors |
| Ręczny UI | Mapa → kryterium Cargo → edytor Monaco: poprawny plik, język i przycisk lokalnego sprawdzenia; brak panelu kompilatora dla TOML |

## Granice nowych dowodów

Parser `toml-eslint-parser@1.0.3` jest przypięty do gramatyki TOML 1.0. Limity obejmują rozmiar UTF-8, głębokość i liczbę węzłów AST oraz kontrakty autora. Kontrola rzeczywistych kluczy odbywa się przed konwersją AST, a ścieżki używają własnych właściwości. Testy obejmują aliasy, zakres normal/dev, dziedziczenie workspace, sprzeczne źródła, dokładne mapowanie features, niepoprawne typy, zduplikowane klucze i dane podobne do prototype pollution. Poprawne dodatkowe metadane pozostają dozwolone.

Przegląd zamknął fałszywe zaliczenia: alias serde omijający zakaz, opcjonalną zwykłą zależność, `optional` na korzeniu workspace, liczby i daty zamiast tabeli zależności oraz błędny klucz feature. Poprawiono nadmierny zakaz `workspace.metadata`, rzeczywisty przykład unii features i kompletne instrukcje jego przygotowania. Stały weryfikator odczytuje przykład z lekcji i sprawdza drzewa normal/dev przez Cargo. Cargo 1.94+ przyjmuje TOML 1.1, podczas gdy parser kursu i Cargo 1.85 pozostają przy TOML 1.0; korpus sprawdza tę zamierzoną różnicę.

Lokalne sprawdzenie manifestu dowodzi wyłącznie zadeklarowanych pól. Nie pobiera zależności, nie kompiluje, nie publikuje i nie tworzy fikcyjnego `RunResult`. Próby zapisują kod oraz evaluator `manifest-contract`. Polityka pojęcia pochodzi z kursu: dowody Rust nie zaliczają manifestów, a manifesty nie dowodzą sprawności w Rust. Filtrowanie obejmuje niezależne zadania, bramki i opóźnione powtórki. Zachowano zgodność wcześniejszych dowodów Rust oraz importów v1/v2/v3.

Podgląd i pobranie Frame startera zapisują pomoc dla czterech głównych zadań manifestowych. Rozwiązanie zapisuje sumę tych odniesień i czterech wcześniejszych zadań Rust. Pliki stają się widoczne po zapisie pomocy w stanie sesji; ponowny dostęp jest idempotentny, a reset/import otwartego podglądu ponownie ustala właściwe odniesienia. Cztery blanki i osobne powtórki pozostają niezależne. Samo pobranie ani lokalna lista kontrolna nie zwiększają mastery.

Frame Protocol ma opcjonalne serde 1.0.229, tylko `Serialize` na walidowanym typie oraz prawdziwego klienta wymagającego tego traitu. Domyślny graf zawiera dwa pakiety workspace; graf all-features i lockfile obejmują dziewięć pakietów. Usunięcie przekazania feature w kliencie powoduje błąd konkretnego konsumenta na stable i MSRV. Biblioteka pozostaje `publish = false`. Cargo tworzy i sprawdza archiwum z dokładnie sześcioma plikami; ta sama kontrola odrzuca dodatkowy plik w mutancie. Regresja testów metadanych wymagająca cache registry została poprawiona przez `--no-deps`.

## CI i scalenia

Przed scaleniem tego bloku wymagany jest sukces wszystkich trzech jobów na dokładnym aktualnym SHA PR-a: `verify`, `workspace-msrv` i `mini-grep-fuzz`. Zdalny przebieg powtarza również niezmienione kontrole Tokio, Loom, Number Guessing+ oraz fuzzera. Wynik bieżącej gałęzi jest widoczny w [GitHub Actions](https://github.com/fettpl/rustcrushcourse/actions?query=branch%3Afeat%2Fcargo-dependency-lifecycle). Po merge wymagamy ponownej kontroli `main`; wyniki historyczne jej nie zastępują.

[PR #8](https://github.com/fettpl/rustcrushcourse/pull/8), pożyczone API i angielskie README, jest scalony jako `57c24f9`. [CI head `236a09e`](https://github.com/fettpl/rustcrushcourse/actions/runs/34750981784) oraz późniejszy [przebieg main `57c24f9`](https://github.com/fettpl/rustcrushcourse/actions/runs/34832213874) zakończyły wszystkie trzy joby sukcesem. Historyczny raport zawiera wersja `57c24f9` tego pliku: 172 testy Vitest, 1397 przypadków Rust, 47 E2E i offline v23.

Number Guessing+ scalono w [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7), Mini grep w [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), wcześniejszy etap w [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1). Zasady tokenów, przypiętych akcji, diagnostyki i ograniczenia ochrony gałęzi opisuje [CI/CD](ci-cd.md). Hosting aplikacji nadal nie został wybrany; wdrożenie nie jest skonfigurowane.

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
npm run content:workspace -- --fetch
npm run content:workspace -- --fetch --msrv
npm run content:cargo
npm run content:manifests
npm run content:manifests -- --msrv
npm run content:fuzz -- --fetch
npm run content:audit -- --check-links
npm run build
# osobny terminal: npm start -- --port 3002
npx --no-install playwright test --config .github/playwright.production.config.ts --retries=0
npm run test:offline
```

Instalację toolchainów i cargo-fuzz opisuje README. Lokalne testy serwisu Tokio potrzebują możliwości otwarcia gniazda loopback. Weryfikatory wykonują wyłącznie stałe pliki autora w katalogach tymczasowych, bez kodu z importów ucznia. E2E podstawia kontrolowane odpowiedzi runnera; nie wykonano nowego POST do publicznego Playgrounda.

Pierwszy lokalny przebieg archiwów w sandboxie odrzucił otwieranie gniazd TCP przez istniejące testy Tokio (`PermissionDenied`). Ponowny pełny przebieg z dostępem do loopback zakończył się sukcesem bez zmian w tych testach.

## Pozostały zakres

Cel zaawansowanego kursu pozostaje otwarty: diagnoza konfliktów wersji, bezpieczeństwo zależności i publikowanie w registry, GAT/lending async, wariancja abstrakcji unsafe, property/fuzz, pomiary, unsafe/FFI, utrzymanie systemów i capstone. Ponawianie rund Number Guessing+ i nagranie code reading pozostają rozszerzeniem portfolio. Audyt zachowuje luki trwałej historii migracji i pochodzenia wersji materiału. Potrzebne są pilotaż z uczącą się osobą i ręczna ocena czytnikiem ekranu. Dostępność lekcji i zielone testy nie gwarantują gotowości zawodowej.
