# Cykl życia zależności Cargo i ćwiczenia z manifestem

[English](2026-09-13-cargo-dependency-lifecycle-design.md)

Kurs posiada rzeczywistą przestrzeń roboczą dwóch członków, ale nie uczy jeszcze pełnej
ścieżki z deklaracji zależności rejestru poprzez wybór funkcji i zablokowane buduje do
kontrolowanego archiwum skrzyni. Ten kamień milowy dodaje cztery lekcje i rozszerza
istniejący projekt Frame Protocol. Jest częścią autoryzowanego przez użytkownika celu ustawicznego
zaawansowanego kursu. Nie spełnia ona pozostałych wymogów dotyczących bezpieczeństwa,
GAT, wydajności, produkcji, capstone lub learner-pilot.

## Produkt i integracja

- Module ID: `cargo-dependency-lifecycle`; title: `Cargo: zależności, features i pakowanie`.
- Zarejestruj się natychmiast po `public-api-workspaces`; warunek wstępny modułu `public-api-workspaces`.
- Zamówione lesson/concept IDs: `cargo-dependency-contract`, `cargo-resolver-feature-unification`, `cargo-lock-msrv-policy`, `cargo-package-rehearsal`.
- Po pierwsze lesson/concept warunek wstępny `api-compatible-surface`; kolejne IDs tworzą łańcuch.
- Każda lekcja uczy odrębnej umowy deklaracji, z przewidywaniem, konkretną obserwacją,
  wyjaśnieniem, podstawowym zadaniem, świeżą pustą stroną zadania i niezależnym
  ćwiczeniem wyszukiwania. Procedury Local Cargo i ich interpretacja są zasadniczymi
  elementami lekcji, nie udając, że aplikacja wykonała te procedury.
- Pierwotne IDs to `${lessonId}-gate`, puste IDs `${lessonId}-blank`. Cztery kryteria modułowe odnoszą się do tej pary;
  oddzielne ćwiczenia odzyskiwania nie pompują liczby bramek modułu.
- Zachowanie wszystkich istniejących lekcji, koncepcji, projektów i archiwów tożsamości
  i zapisanej pracy. W dalszym ciągu istnieje osiem projects/packages. Frame Protocol library/client API i istniejących feature/constructor/consumer
  testów.
- Repozytorium README, commit messages i PR metadane używają angielskiego. Learner-facing
  aplikacji i instrukcji projektu pozostają polskie i zakładają podstawowe programowanie
  z Rust wyciągnięte z zera.

## Co potwierdza artefakt

Zadania deklaratywne sprawdzają wartości w deklaracjach TOML lokalnie. Nie kompilują kodu Rust. Rozwiązanie zależności, obsługę minimalnej wersji kompilatora, zachowanie pliku blokady i zawartość archiwum potwierdzają osobne kontrole Cargo. Komunikaty o powodzeniu i nazwy pojęć muszą odzwierciedlać ten zakres. Poprawne, samodzielnie przygotowane deklaracje mogą potwierdzać rozumienie i utrwalenie pojęć po upływie czasu. Dla pojęć wymagających kodu nadal obowiązują dotychczasowe zasady dowodów.

Nie twórz własnych tabel polityki metadanych, sugerując, że egzekwuje je Cargo. Działanie `--locked`, `cargo update`, unifikację funkcji i weryfikację pakietu pokazują autorskie przykłady z rzeczywistymi wynikami Cargo. Uczestnik ćwiczy te operacje w projekcie do pobrania. Nie wymagaj ręcznej edycji Cargo.lock dla wymuszenia przewidywanego rozwiązania zależności. Zaznaczenie pola lub wklejenie deklaracji wykonania poleceń nie przyznaje automatycznego potwierdzenia opanowania.

Ujawnienie odpowiedzi głównej pozostawia odrębne zadanie z pustym edytorem dostępne do niezależnego zaliczenia. Starter Frame ma komplet działających manifestów, więc obejrzenie lub pobranie go rejestruje pomoc dla czterech nowych zadań głównych o manifestach. Rozwiązanie zapewnia pomoc dla tych czterech zadań i czterech wcześniejszych głównych zadań o publicznym API. Zachowaj dotychczasowe niezależne zaliczenia. Działania na pakietach nie ujawniają nowych zadań od pustego edytora ani powtórek.

## Granica między parsowaniem a wykonywaniem

Użyj dokładnie `toml-eslint-parser@1.0.3` przez `parseTOML(source, { tomlVersion: "1.0.0" })` i `getStaticTOMLValue`. Wybierz jawną gramatykę. Nie dodawaj ręcznie napisanego parsera do odrzucania TOML 1.1. Agent główny sprawdził już tymczasowy pakiet przeglądarkowy, oczekiwane wartości deklaracji, odrzucenie zduplikowanych kluczy i odrzucenie czterech konstrukcji dostępnych wyłącznie w TOML 1.1. Wciąż należy sprawdzić rzeczywisty pakiet kliencki Next, importy po stronie serwera oraz korpus zgodności z dokładną wersją Cargo 1.85.

Parser deklaruje `^20.19.0 || ^22.13.0 || >=24`. Repozytorium celowo wspiera `^22.13.0 || >=24`. Zapisz obsługiwane środowisko w metadanych pakietu i w dokumentacji. CI ma używać bieżącego wydania Node 22. Przy instalacji sprawdź rzeczywiste wymagania zależności. Sam numer wersji wyższy niż 22 nie gwarantuje zgodności z zadeklarowanym zakresem.

Wznowiona weryfikacja potwierdziła obsługę TOML 1.1 przez Cargo 1.94 i nowsze (zob. oficjalne ogłoszenie o Rust 1.94). Dokładnie Cargo 1.85 odrzuca cztery przypadki składni 1.1. Korpus dokumentuje tę zamierzoną różnicę. Nowe wersje stabilne Cargo mają przyjmować obsługiwaną składnię. Kurs przyjmuje odpowiedzi TOML 1.0 ze względu na minimalną wspieraną wersję.

Kontrole manifestów są deterministyczne, lokalne i działają offline. Zachowaj istniejące `RunRequest`, `RunResult`, `RunStatus`, profile zaufanych przypadków Rust i `/api/run`. Użyj pola szkicu `code` i zapisz próby bez tworzenia sztucznego RunResult. Błędy parsera dają komunikaty zwrotne w ramach aplikacji. Ogranicz długość wejścia, zagnieżdżenie i nakład pracy parsera. Przy sprawdzaniu ścieżek asercje przechodzą po własnych właściwościach obiektu i używają jednoznacznych segmentów.

Akceptuj równoważne układy TOML, notację tabel, cudzysłowy i kolejność. Skrócona i tabelaryczna deklaracja zależności są równoważne, jeśli ich efektywne wartości domyślne spełniają jawny kontrakt zadania. Listy funkcji są w tych zadaniach zbiorami. Akceptuj nieszkodliwe dodatkowe poprawne pola. Nie porównuj całego sparsowanego obiektu ani zserializowanej odpowiedzi z wzorcem. W poleceniach dokładnie określ wymagania wersji i deklaruj wyłącznie równoważność obsługiwaną przez evaluator.

## Projekt Cargo do pobrania

Rozszerz `frame-protocol-workspace`, zachowanie `frame-protocol` oraz `frame-probe` członkowie, rezolucja3, edycja 2024, Rust1.85.0,
puste domyślne funkcje i publikować = false. Dodać jedną bezpośrednią zależność
rejestru:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

Biblioteka dodaje:

```toml
[features]
default = []
diagnostics = []
format = ["dep:serde", "serde/alloc", "serde/derive"]

[dependencies]
serde = { workspace = true, optional = true }
```

Klient dodaje `format = ["frame-protocol/format"]` obok istniejącego przekazywania diagnostyki. Jego zależność tylko
ścieżkowa pozostaje lokalna; nie jest reprezentowana jako pakiet podlegający publikacji
w rejestrze.

Na ramce użyj falistej `serde::Serialize` implementacji. Nie należy bezpośrednio wyciągać Deserialize:
obejdzie `Frame::try_from_payload` i pozwoli na nieprawidłową długość ładunku. Zachować każdy istniejący
konstruktor i API niezmienny. Dodaj prawdziwego konsumenta funkcji, który wymaga
Serialize, i pokazać jego odrębną bibliotekę tylko i klient przekazywane buduje.
Domyślne builds nie aktywują serde, chociaż plik lockfile zawiera opcjonalne zamknięcie
zależności.

Generować i sprawdzić w oryginale Lockfile zamiast wynaleźć sumy kontrolne.
Zweryfikowane zamknięcie kandydata zawiera dziewięć wpisów pakietów: dwóch członków
obszaru roboczego plus serde, serde_core, serde_derive, proc-macro2, cytat, syn i unicode-ident.
Sprawdzić faktyczną zgodność przymocowaną versions/source/checksums i kompilatora podczas realizacji. Wymóg
wąskiego uzależnienia w Cargo.toml oraz dokładny wybór w Cargo.lock służą różnym celom.

Uruchom opakowanie tylko dla biblioteki z `cargo package -p frame-protocol`. Zachowaj publikację = false. Sprawdź
prawdziwą wygenerowaną listę plików i znormalizowany manifest, w tym Cargo.lock i Cargo.toml .orig, i
zweryfikuj pobraną skrzynię na stabilnej i dokładnej Rust1. 85.0. Opakowania w całej
przestrzeni roboczej nie mogą być bramą sukcesu: lokalny klient odwołuje się do
nieopublikowanego pakietu bibliotecznego. Brak logowania ładunku, publikowania ładunku,
konfiguracji kredytowej lub wysyłania skrzyni należy do tego etapu.

Zweryfikowane dowody wykonalności są w `<private-temp>/receipt-010` oraz `<private-temp>/receipt-013`. Te jednorazowe dowody nie zastępują
weryfikacji końcowego pobranego archiwum.

## Weryfikacja materiałów i wydania

Rozszerzenie istniejącego weryfikatora przestrzeni roboczej o stałe archiwum z wyraźną
opcją --fetch, po której następuje kontrola offline/locked. Odrzuć inne wejścia linii poleceń; nie
akceptuj manifestów, ścieżek, źródeł, zależności lub wyboru łańcucha narzędzi. Zachować
istniejące API mutantów i dodać znaczące zależności, features-spedycja i archiwalne
granice kontroli. Brak pamięci podręcznej, awarii procesu i zero wykonania testu są
awarie infrastruktury, nie pomyślne odrzucenie ćwiczenia.

Zarówno stabilne, jak i dokładne Rust1 .85 musi obejmować oddzielne konfiguracje library/client/workspace
funkcji, metadane, drzewo, testy, fmt, Clippy, rustdoc, zawartość pakietu i niezmienność
pliku blokującego. Rozrusznik musi pozostać fmt/check-valid, a jego niedokończone zestawy testowe
Rust muszą nadal zawodzić z powodu zamierzonych wdrożeń. Świeże CI miejsc pracy muszą
uzyskać autorskie zamknięte zamknięcie zależności przed weryfikacją offline.

Potwierdzenie autentyczności przez autora Manifest sprawdza wszystkie rozwiązania
odniesienia i pobierania oraz celowo błędne początki i mutanty semantyczne. Stałe
repozytorium-authorised TOML syntax corpus musi być sprawdzone z JavaScript parser i rzeczywiste
stable/exact1.85 Cargo. Nigdy nie może wykonywać nauki złożonej TOML przez Cargo.

Ostateczne kontrole integracyjne obejmują istniejące etykiety v3 import/export, stare drafts/notes, nowe
projekty TOML, niezależne bramy po ich ujawnieniu, opóźnione pobieranie, dokładne editor/button,
brak wyraźnego żądania do /api/run, alternatywne textarea, dostęp do klawiatury i wznowienie
offline. Uruchom cały istniejący pakiet regression/CI oraz budowę produkcji, produkcję E2E bez
ponownego testowania i weryfikację offline z nową wersją cache Service-worker.

Release wykorzystuje zrewidowaną gałąź funkcji, angielskie commit/PR metadane i skuteczne
kontrole dokładnej PR head przed połączeniem. Weryfikacja rekordu PR8/main57c24f9 jako dowód
poprzedzający uwolnienie. Hosting pozostaje niewybrany, więc ten blok nie wprowadza celu
rozmieszczenia.

## Rozstrzygnięcia przeglądu projektu

- Manifest koncepcje korzystać z autorskiej klasyfikacji artefakt, niewykonanie
  istniejących koncepcji do kodu Rust. Rekalkulacja silnika otrzymuje politykę wyraźnie
  poprzez fasadę zdalną poza silnikiem. Nie należy wyciągać wniosków o klasyfikację
  koncepcji z zaimportowanych wydarzeń ani stosować `Rust proof || manifest proof` dla każdej koncepcji. Filtr źle
  dopasowane zdarzenia artefaktu przed strong-evidence/retention obliczeń. Fasada musi wprowadzić politykę
  składania lekcji, ekspozycji, przeglądów i opakowania ujawnia tak późniejsze narażenie
  nie może obniżyć ważności manifest opanowania.
- Pomocnik wartości statycznej parsera buduje zwykłe JavaScript obiekty. Przed wywołaniem `getStaticTOMLValue`
  należy sprawdzić ograniczony segment kluczy AST; odrzucić `__proto__`, `constructor` i `prototype` klawiszy w
  tym adapterze. Użyj oficjalnego klucza odwiedzającego parsera z iteracyjnym spacerem,
  który wyklucza linki rodzica, a nie ręcznie napisane TOML parser lub surowej regex
  źródłowy. Ścieżki asserted następnie korzystać z własnego przewrócenia własności.
  Cytowane wartości łańcuchowe i komentarze zawierające te słowa są prawidłowe;
  niepowiązane ważne daty i tablice w metadanych pozostają dozwolone.
- Cargo.lock może zawierać dziewięć pakietów, nawet jeśli standardowy zakończony wykres nie
  aktywuje serde. Sprawdzić deklaracje zależności za pomocą metadanych oddzielnie od
  zakończonego wykresu funkcji. Sprawdź i potwierdź rzeczywiste domyślne i wszystkie
  funkcje wykresy zamiast zakładając, że oba zawierają dziewięć aktywnych pakietów.
- Zwyczajne Biegi Vitest poprzedzają pobieranie rejestru w CI. Osprzęt metadanych musi
  używać `cargo metadata --no-deps --offline` podczas badania deklaracji i nie może wymagać już zaludnionego pamięci
  podręcznej ładunkowej. Pełne resolved-graph/archive kontrole przeprowadzane są w dedykowanym
  weryfikatorze po jego wyraźnym pobraniu.
- Zadania z pustym edytorem i odroczone powtórki zmieniają rolę deklaracji lub regułę, którą trzeba zastosować. Przykłady to zależność workspace’u albo bezpośrednia bądź deweloperska zależność pod aliasem, opcjonalna funkcja biblioteki albo przekazanie jej przez klienta, minimalna wersja kompilatora w manifeście głównym albo dziedziczenie lub samodzielna deklaracja w pliku członka, a także reguła włączania albo wykluczania plików z paczki. Polecenie podaje wszystkie oceniane wartości i ograniczenia. Zadanie z pustym edytorem nie zawiera początkowego manifestu ani wklejonego szkieletu rozwiązania.

Rekord wykonalności części: `<private-temp>/receipt-009`. Użyj `cargo fetch --locked` bez `--all-features` (ten ostatni nie jest obsługiwany
przez Cargo1 .85 fetch). Weryfikacja publikowania = false w metadanych Cargo oraz
znormalizowanego zapakowanego manifestu. Należy sprawdzić tylko `.resolve.nodes` przy potwierdzaniu
wykresu zależności, a nie każdą możliwą dev/optional zależność w definicjach pakietu
przejściowego.

## Szczegółowa tabela kontraktów zadań



Jest to kompaktowe przekazanie realizacji po przeglądzie. Pierwotne identyfikatory to
`${lessonId}-gate`, zgodnie z wymaganiami bramki modułu. Każda pustka i recenzja jest świeżo autorką;
żadne zadanie nie opiera się na ukrytych domyślnych. Snippety są kompletnymi plikami dla
edytora. TOML Formatowanie, key/table zamówienie, równoważne kwotowania i kolejność
inline-table pozostają alternatywami semantycznymi.

### `cargo-dependency-contract`

**Pierwotne `cargo-dependency-contract-gate`** Plik tekstowy `Cargo.toml`, korzeń ramki. Wymagają dwóch istniejących członków, `resolver = "3"`, `workspace.package.rust-version = "1.85.0"`, `workspace.package.publish = false`
i tej dokładnej efektywnej zależności:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

Polish prompt: „Uzupełnij korzeń Frame Protocol o jedną zależność rejestrową
`serde`: wymagaj `1.0.229` i wyłącz domyślne features. Zachowaj dwóch
członków, resolver `3`, Rust `1.85.0` i `publish = false`. Wynik sprawdza
deklarację; dostępność crate i wybór wersji sprawdzisz później lokalnym Cargo.”
The complete expected root is `workspaceManifest` in `src/content/projects/frame-protocol.ts`, extended with the dependency table above. Content authors may read the completed manifest through the exported project's `package.files` entry for `Cargo.toml`; do not duplicate a different baseline.

**Świeże `cargo-dependency-contract-blank`** Dopuszczalny sam `catalog-tool/Cargo.toml`, celowo wyróżniający zakres normalny i dev:

```toml
[package]
name = "catalog-tool"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A catalog dependency exercise."
license = "MIT"
publish = false

[dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false }

[dev-dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false, features = ["alloc"] }
```

Polish prompt: „Utwórz standalone package `catalog-tool`. Zwykły kod ma używać
aliasu `wire_serde` do rejestrowego `serde` bez domyślnych features; testy mogą
mieć osobną deklarację w `[dev-dependencies]`. Nie przenoś zależności testowej
do normalnego zakresu i nie edytuj lockfile.” The contract requires the same alias in both scopes, the same registry version and disabled defaults, an empty normal feature set and alloc in the dev scope; it rejects a
path/git source or a dependency in only the wrong scope.

**Świeże `cargo-dependency-contract-review`** Uzgodnienie autonomiczne `telemetry/Cargo.toml`:

```toml
[package]
name = "telemetry"
version = "0.2.0"
edition = "2024"
rust-version = "1.85.0"
description = "A telemetry dependency exercise."
license = "MIT"
publish = false

[dependencies]
serde_wire = { package = "serde", version = "^1.0.229", default-features = false }
```

Polish prompt: „Powtórz bez workspace: alias `serde_wire` ma wskazywać
registry package `serde`, wymagać `^1.0.229` i nie włączać domyślnych
features. Wyjaśnij, że `Cargo.toml` podaje wymaganie, a `Cargo.lock` wybór dla
konkretnego grafu.” `"1.0.229"` and `"^1.0.229"` are accepted as equivalent
Cargo requirements here.

### `cargo-resolver-feature-unification`

**Pierwotne `cargo-resolver-feature-unification-gate`** Plik tekstowy `crates/frame-protocol/Cargo.toml`. Wymóg pełnego manifestu biblioteki kanonicznej z wpisu projektu
`package.files` dla `crates/frame-protocol/Cargo.toml`, w szczególności:

```toml
[features]
default = []
diagnostics = []
format = ["dep:serde", "serde/alloc", "serde/derive"]

[dependencies]
serde = { workspace = true, optional = true }
```

Polish prompt: „Dodaj opt-in `format` i opcjonalne, workspaceowe `serde`.
`format` ma jawnie włączyć `dep:serde`, `serde/alloc` i `serde/derive`;
`default` i `diagnostics` pozostają puste.” The evaluator treats feature arrays
as sets and rejects missing `alloc`, `derive`, optionality or workspace
inheritance.

**Świeże `cargo-resolver-feature-unification-blank`** Plik `crates/packet-cli/Cargo.toml`, umowa transferu klienta z dwoma przekazanymi właściwościami lokalnymi:

```toml
[package]
name = "packet-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
diagnostics = ["packet-lib/diagnostics"]
format = ["packet-lib/format"]

[dependencies]
packet-lib = { path = "../packet-lib" }
```

Polish prompt: „Klient `packet-cli` ma domyślnie nie włączać niczego i ma
przekazywać dokładnie dwa lokalne features biblioteki: `diagnostics` oraz
`format`. Nie dodawaj serde bezpośrednio do klienta.” The contract requires
both forwarding entries, empty default and one local path dependency, with no
direct registry dependency.

**Świeże `cargo-resolver-feature-unification-review`** Additional file `crates/telemetry-cli/Cargo.toml`, alias-forming wariant:

```toml
[package]
name = "telemetry-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
json = ["telemetry_core/json"]
diagnostics = ["telemetry_core/diagnostics"]

[dependencies]
telemetry_core = { package = "telemetry-lib", path = "../telemetry-lib" }
```

Polish prompt: „Przekaż z klienta dwa features biblioteki przez alias
zależności `telemetry_core`: `json` i `diagnostics`; `default` ma być pusty.
Rozróżnij alias pakietu od nazw features. Ten wariant nie wprowadza składni
weak dependency `?/`; nie używaj jej bez osobnego kontraktu.” No weak
dependency feature form is silently accepted by this review.

### `cargo-lock-msrv-policy`

**Pierwotne `cargo-lock-msrv-policy-gate`** Plik tekstowy `Cargo.toml`, korzeń ramki. Wymagają dwóch istniejących członków, `workspace.resolver = "3"`, `workspace.package.rust-version = "1.85.0"`, `workspace.package.publish = false`
oraz deklaracji realnej zależności:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

Polish prompt: „Ustaw prawdziwy compiler floor Rust `1.85.0` i resolver `3`;
zachowaj bezdomyślne wymaganie `serde 1.0.229` oraz `publish = false`. Nie
twórz tabeli udającej politykę CI i nie zmieniaj ręcznie `Cargo.lock`.” The
automatic contract checks real Cargo fields only. The explanation says that
explicit `cargo update` may change the lockfile, while later `--locked` checks
refuse a required change; it never claims those commands ran.

**Świeże `cargo-lock-msrv-policy-blank`** Plik `crates/release-lib/Cargo.toml`, wariant spadkowy członka:

```toml
[package]
name = "release-lib"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
description.workspace = true
license.workspace = true
repository.workspace = true
readme.workspace = true
publish.workspace = true

[features]
default = []

[dependencies]
serde = { workspace = true, optional = true }
```

Polish prompt: „Manifest członka ma odziedziczyć `rust-version` i metadane z
korzenia. Nie dodawaj lokalnego `rust-version` ani lokalnej wersji, która
nadpisze dziedziczenie; zależność `serde` ma używać `workspace = true` i
pozostać opcjonalna.” The contract requires every listed inheritance key,
requires `package.rust-version.workspace = true` and `package.version.workspace = true`; a scalar override fails these nested-path assertions. Do not require the whole rust-version/version path to be absent, because the inheritance tables live there. No arbitrary metadata policy table earns credit.

**Świeże `cargo-lock-msrv-policy-review`** Uzgodnienie autonomiczne `stable-floor/Cargo.toml`:

```toml
[package]
name = "stable-floor"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A compiler floor exercise."
license = "MIT"
publish = false

[dependencies]
serde = { version = "^1.0.229", default-features = false }
```

Polish prompt: „Odtwórz samodzielny pakiet z `rust-version = "1.85.0"` i
bezdomyślnym `serde ^1.0.229`. W wyjaśnieniu wskaż, że jawne `cargo update`
może zmienić lockfile, a polecenie z `--locked` ma odmówić wymaganej zmiany;
nie zapisuj tych twierdzeń w sztucznej tabeli metadata.”

### `cargo-package-rehearsal`

**Pierwotne `cargo-package-rehearsal-gate`** Plik tekstowy `Cargo.toml`, korzeń ramki. Wymagane pełne metadane pakietów (`description`, `license`, `repository`,
`readme`), `workspace.package.publish = false`, dwóch istniejących członków i rozwiązanie `3` oraz brak zarówno korzeni `include`,
jak i `exclude`. Polski sygnał ostrzegawczy: Xenos Zachodu metadane i `publish = false`; nie dodaj `include` ani
`exclude`. Lokalnie wybierz `cargo package -p frame-protocol` i kapisz wyjście; aplikacja nie wychodziła pakowania.

**Świeże `cargo-package-rehearsal-blank`** Wyłącznie `signal-kit/Cargo.toml`, wyraźnie obejmuje politykę:

```toml
[package]
name = "signal-kit"
version = "0.3.0"
edition = "2024"
rust-version = "1.85.0"
description = "A signal library for package rehearsal."
license = "MIT"
repository = "https://example.invalid/signal-kit"
readme = "README.md"
publish = false
include = ["Cargo.toml", "README.md", "src/**", "tests/**"]

[lib]
path = "src/lib.rs"
```

Polish prompt: „Przygotuj `signal-kit` do lokalnego rehearsal. Ustaw wszystkie
podane metadane, `publish = false` i jawny target biblioteki. Przez `include`
włącz tylko `Cargo.toml`, README, `src/**` i `tests/**`; nazwany plik
generowany `build/generated/signal.rs` ma pozostać poza archiwum, bo nie pasuje
do listy include. Później sprawdź listę przez `cargo package --list`.” The
contract requires this include set and no exclude; it does not claim that the
named file or archive exists.

**Świeże `cargo-package-rehearsal-review`** Wykluczone `archive-note/Cargo.toml`, wykluczają politykę bez uwzględnienia:

```toml
[package]
name = "archive-note"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "An archive boundary exercise."
license = "MIT OR Apache-2.0"
repository = "https://example.invalid/archive-note"
readme = "README.md"
publish = false
exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]

[lib]
path = "src/lib.rs"
```

Polish prompt: „Odtwórz manifest `archive-note` z metadanymi, `publish =
false` i bez `include`. Wyklucz przez `exclude` duży fixture, wygenerowane
pliki buildu i notatki. Wyjaśnij, że `cargo package -p archive-note --list`
dopiero pokaże faktyczną listę.” The contract requires `exclude` and absence
of `include`, so both policies cannot be hidden in one answer.

Jedynymi roszczeniami Cargo wyjściowymi dla tych umów są procedury lub autorskie
twierdzenia weryfikacji: zależność existence/resolution, unia funkcjonalna, wsparcie stable/MSRV, niezmienność
pliku blokującego, znormalizowany manifest i faktyczne członkostwo w archiwum.
Oceniający TOML nigdy nie zgłasza tych roszczeń jako wykonanych.


### Wyjaśnienia dla autorów

Proza powyżej jest obrysem projektu. Ostateczny uczeń musi podać każdą wymaganą nazwę
pakietu, wersję, wydanie, odziedziczony klucz, zestaw funkcji, ścieżkę i flagę, które
sprawdza oceniający; same referencje nie dostarczają ukrytej umowy. Opisy mogą być
dowolnym niepustym tekstem wyjaśniającym. Leasing pierwotny1 klasyfikuje pola
zależności, podczas gdy jego zachowane pola bazowe są dostarczane; leasingodawca
pierwszorzędny3 klasy przywracania pól resolver/compiler-floor, natomiast niezmieniona zależność jest
dostarczana. Mogą one prowadzić do tego samego pełnego korzenia projektu, ale ich
niedokończone początki i przypadki niepowodzenia koncepcyjnego muszą się różnić. W
zakresie normalnym i dev leson1 używa tego samego aliasu wire_serde, unikając dwóch nazw tej
samej rozwiązanej skrzyni; tylko dev umożliwia alloc. Weryfikacja tych autorami
manifestów z kontrolowanym kontekstem Cargo podczas przeglądu. Równoważność wersji w
tych zadaniach jest wyraźnie ograniczona do wykazanego wymogu pełnej staranności z
opcjonalnym opiekunem wiodącym (`1.0.229` / `^1.0.229`); inne wyrażenia semvera nie są objęte tą
umową.

## Wspólne interfejsy implementacji

Zdefiniować wyraźne kontrakty w `src/domain/manifest.ts` i importować ich typy do `types.ts`. Są to wspólne
interfejsy dla autorów równoległych:

```ts
export type ManifestPath = readonly [string, ...string[]];
export type ManifestValue = string | number | boolean | readonly string[];
export interface ManifestSetExpectation {
  values: readonly string[];
  mode?: "equals" | "contains";
}
export type ManifestDependencySource =
  | { kind: "registry"; registry?: string }
  | { kind: "path"; path: string }
  | { kind: "workspace" };
export interface ManifestDependencyExpectation {
  name: string;
  package?: string;
  /** Full stable caret requirement; a leading ^ is optional. */
  version?: string;
  source?: ManifestDependencySource;
  optional?: boolean;
  defaultFeatures?: boolean;
  features?: ManifestSetExpectation;
}
export type ManifestAssertion =
  | { kind: "dependency-package-absent"; table: "dependencies" | "dev-dependencies" | "build-dependencies" | "workspace.dependencies"; package: string }
  | { kind: "path-present"; path: ManifestPath }
  | { kind: "path-absent"; path: ManifestPath }
  | { kind: "path-nonempty-string"; path: ManifestPath }
  | { kind: "path-equals"; path: ManifestPath; value: ManifestValue; arrayMode?: "ordered" | "set" }
  | { kind: "dependency"; table: "dependencies" | "dev-dependencies" | "build-dependencies" | "workspace.dependencies"; dependency: ManifestDependencyExpectation }
  | { kind: "feature-forwarding"; package: string; feature: string; enables: ManifestSetExpectation };
export interface ManifestContract {
  document: "workspace-root" | "package";
  assertions: readonly ManifestAssertion[];
}
```

`workspace-root` wymaga tabeli przestrzeni roboczej i nie wymaga tabeli pakietowej; `package` wymaga tabeli
pakietu i obejmuje zarówno członków, jak i pakiety samodzielne. Jest to wybrany kontrakt
deklaracji, a nie kompletny walidator ładunku. Zależność od przestrzeni roboczej nie
może deklarować opcjonalności u źródła; odrzuć to pole. W jednym z członków, przestrzeń
robocza sprawdza tylko dziedziczenie i wyraźnie dostarczone flagi, bez wynalezienia
wartości roota z innego pliku. Registry/path/workspace Źródła nie mogą po cichu akceptować sprzecznych ze
sobą źródeł. W przypadku bezpośrednich zależności, pominięte optional/default-features/features normalizować do false/true/empty.
Alias używa klucza tabeli jako nazwy zależności i `package` jako kanonicznej nazwy skrzyni.

Przegląd poprawki: `dependency-package-absent` sprawdza wszystkie własne wpisy do wybranej tabeli zależności za
pomocą pakietu kanonicznego (`package` pole lub klucz wejścia). Brak kart do tabeli;
niepoprawny table/dependency kształt zawodzi zamiast pomijać wyłączenie. Dwa ćwiczenia klienta
wykluczają kanoniczny `serde` z normalnego `[dependencies]`, w tym pseudonimy; wyraźnie wskazuje ten
wybrany zakres. Nieszkodliwe metadane pozostają dozwolone. Ta lokalna kontrola nie
wyciąga wniosków o niespotykaną zależność od miejsca pracy ani nie rozwiązuje
specyficznych dla danego celu manifestów. Normalne zależności serde standalone w blank/review są
wyraźnie niefakultatywne (`optional: false`); ich sugestie i mutanty semantyczne muszą je pokryć.

Twierdzenie `feature-forwarding` ma jednoznaczne znaczenie: `package` jest obecnym manifestem `package.name`, `feature` jest
lokalnym kluczem `[features]` i `enables` wymienia deklaracje klucza. Zarówno tożsamość pakietu, jak i
dokładna nazwa lokalna muszą się zgadzać. Nigdy nie cofnij się do czytania funkcji
nazwanej przez pole pakietu; nie istnieją żadne dotychczasowe, oczywiste kontrakty do
migracji. Przykład: `{ kind: "feature-forwarding", package: "packet-cli", feature: "format", enables: { values: ["packet-lib/format"] } }`.

Dodaj `Evaluator` wariant `{ kind: "manifest-contract"; contract: ManifestContract }`, `LessonStep.editorMode?: "rust" | "toml"`, `LessonStep.editorFile?: string`, `Concept.evidenceArtifact?: "rust-code" | "manifest"`oraz `ProjectPackage.starterRevealStepRefs?: ModuleGateTaskRef[]`. Nie jest wymagane żadne inne uporczywe
pole. A TOML obserwację można zastosować choice/answer ewaluator TOML kod; nie ma statusu
kompilatora. Wszystkie TOML code/reference dokumenty muszą posiadać ważną, wspieraną składnię, a
wyraźne odniesienia do oceniającego muszą przejść przez ich umowę. Zadania puste
pomijają kod. Nieślepe startery bramki muszą analizować, ale oblać zamierzoną umowę. Nie
tworzyć fałszywego expectedStatus zamiast TOML.

`src/engine/manifest-contract.ts` wywóz:

```ts
export interface ManifestContractCheck {
  passed: boolean;
  feedback: string;
}
export function manifestContractIssues(contract: ManifestContract): string[];
export function manifestSyntaxIssues(source: string): string[];
export function checkManifestContract(source: string, contract: ManifestContract): ManifestContractCheck;
```

Wszystkie success/failure Informacje zwrotne docierające do uczącego się są polskie. Sprawdzanie
składni i ocena umowy dzielą jeden bezpieczny adapter parser. Przed przeparowaniem
nakrętki UTF-8 wejściowy a65536 bajtów; przed statycznym kapslem konwersji AST głębokość
at64 i odwiedzane węzły at20000 i strzec niebezpiecznych segmentów kluczowych. Ogranicz
kontrakty do 64 twierdzeń, ścieżki do 12 segmentów i autor key/string długości do 4096 znaków.
Report parser line/column w miarę dostępności, z ograniczonym tekstem. Ignoruj linki rodzica
podczas trawersji. Puste kontrakty nigdy nie mijają. Asercje ćwiczeń działają na
własnych właściwościach i nie wymuszają typów. Struny wersji referencyjnej porównują
tylko określony formularz pełnej opieki z opcjonalnym opiekunem wiodącym. Include/exclude tablice są
zestawami politycznymi; generowane Cargo.toml/Cargo.lock dodatki pozostają zachowanie Cargo, które wymaga
rzeczywistej kontroli pakietu.

`src/engine/learning.ts` eksport `EvidencePolicy` i `evidencePolicyForConcepts`, dodaje opcjonalną politykę do recordEvidence/recordLessonExposure, a default old raw callers to
Rust:

```ts
export type EvidenceArtifact = "rust-code" | "manifest";
export interface EvidencePolicy {
  artifactForConcept(conceptId: string): EvidenceArtifact;
}
export function evidencePolicyForConcepts(concepts: readonly Concept[]): EvidencePolicy;
export function recordEvidence(state: UserState, event: EvidenceEvent, policy?: EvidencePolicy): UserState;
export function recordLessonExposure(state: UserState, exposure: LessonExposure, policy?: EvidencePolicy): UserState;
```

Zachowanie dotychczasowego nieokreślonego oceniającego fix/project zachowania dowodowego dla
Rust, jak wymaga tego obecny v1/v2-compatible dowód; nie może dostarczyć manifestu dowodu artefaktu.
W przypadku pojęć oczywistych wymagane są wyraźne `manifest-contract` dowody na istnienie artefaktu. W
obu kierunkach wyklucza się inny rodzaj artefaktu z mocnego zadania i utrwalenia dowodu,
zachowując jednocześnie istniejące neutralne answer/choice/order/self-rating zasady. Obecny czas, dwa różne zadania,
podpowiedź i ujawnić wymagania pozostają nienaruszone.

Utwórz `src/content/learning-context.ts` jako jedyną fasadę świadomą kursu:

```ts
export function recordCourseEvidence(state: UserState, event: EvidenceEvent): UserState;
export function recordCourseLessonExposure(state: UserState, exposure: LessonExposure): UserState;
export function revealCourseProjectPackageVariant(state: UserState, project: ProjectPackage, lessons: Lesson[], variant: PackageVariant, now: number): UserState;
```

Importuje autorskie koncepcje, buduje politykę i nazywa surowym engine/domain funkcje. Cała
produkcja UI Ścieżki ekspozycji na lekcje, przeglądy i opakowania używają tej fasady.
Silnik nigdy nie importuje kursu. Dodaj surowe `revealProjectPackageVariant(state, project, lessons, variant, now, policy?)` w `src/domain/project-package.ts`; zachować revealProjectSolution jako kompatybilne
opakowanie roztworu. Wyłącznie rozrusznik starterRevealStepRefs; rozwiązanie wykorzystuje połączenie obu
list, zdeduplikowane. Otwarcie podglądu startowego i kliknięcie na jego pobranie zarówno
naświetlanie startera przed odsłonięciem plików; pokazanie lub pobranie ekspozycji
rozwiązania rekordów. Powtórzony dostęp musi być imperatywny. Istniejące cztery
rustykalne refs ramki zostają w revealStepRefs; jego cztery nowe podstawowe TOML Ref, wchodź. starterRevealStepRefs.
Walidacja sprawdza zarówno listy, jak i skuteczne refs. Istniejące niepowiązane pakiety
nie mają rozruszników i zachowują swoje obecne zachowanie.

CodeEditor akceptuje `language?: "rust" | "toml"`, domyślna rusta. Zarejestruj się jako idemista TOML Tokenizer monarchy
przy użyciu istniejącej instancji Monako; podkreśla składnię, ale nie wdraża walidacji.
Zachować tematy i dostępność. TOML wykorzystuje `Cargo.toml` lub autorski edytor File, `Kod TOML` i `TOML 1.0 · sprawdzenie deklaracji`.
Edytor TOML nigdy nie wyświetla poprawnego przycisku Rust. Zadania i przeglądy związane z
umowami manipulacyjnymi obejmują `Sprawdź manifest`, który ocenia obecny kod lokalnie; TOML prediction/observation kroki
wykorzystują ich kontrolę odpowiedzi. Etykiety Ruste i żądanie obciążenia nie ulegają
zmianie.

## Odpowiedzialność za treści i eksporty

Dwa pliki autora treści posiadają dwie lekcje, bez importowania kursu lub siebie
nawzajem:

- `src/content/cargo-dependencies.ts`: wywóz `cargoDependencyLessons`, `cargoDependencyConcepts`, `cargoDependencyCompetencies`, `cargoDependencySources`, `cargoDependencyReviewExercises`; posiada lesson1/2 IDs powyżej.
- `src/content/cargo-release-policy.ts`: wywóz `cargoReleaseLessons`, `cargoReleaseConcepts`, `cargoReleaseCompetencies`, `cargoReleaseSources`, `cargoReleaseReviewExercises`; posiada lesson3/4 IDs powyżej.
- Root tworzy `src/content/cargo-dependency-lifecycle-module.ts` eksportu `cargoDependencyLifecycleModule`, integruje wszystkie eksporty i projekty refs i jest
  właścicielem finału E2E/offline/docs/release.

Wszystkie cztery nowe koncepcje evidenceArtifact By się objawić. Primary/blank wykorzystanie zadań assessment/transfer
odpowiednio evidenceGate= prawda. Oddzielne ćwiczenia przeglądowe wykorzystują do odzyskiwania.
Używanie sprawdzonych oficjalnych źródeł ładunku reviewedAt równa się faktycznej dacie
przeglądu (2026-09-17 w odniesieniu do tego wznowionego wdrażania); zachować wcześniejsze
źródło IDs. Weryfikacje autorów muszą zaakceptować ponowne zamówienie tables/feature zestawy i
równoważne formularze zależności, odrzucić omitted/wrong pola i zbyt szerokie cechy domyślne, a
także kontrolują nowe oczywiste konteksty, a nie tylko stwierdzają, że odniesienie jest
równe sobie.

Dla ćwiczeń include/exclude wyraźnie odróżnić deklarowaną politykę pliku od wygenerowanego archiwum:
Cargo może dodać `Cargo.lock` i `Cargo.toml.orig` oraz normalizować `Cargo.toml`. Lokalna obserwacja `cargo package --list` jest
autorytatywna dla archiwalnego członkostwa.
