# CI i weryfikacja lokalna

[English](ci-cd.md)

Bieżący kontrakt określa [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
Przebieg uruchamia się przy pull requestach do `main`, zmianach wysłanych
do `main` i po ręcznym uruchomieniu. Warsztat działa lokalnie. Workflow
uruchamia lokalny produkcyjny serwer Next do kontroli przeglądarki i trybu
offline. Nie wdraża aplikacji ani nie wybiera dostawcy hostingu.

## Jedenaście kontroli

Workflow ma siedem definicji zadań i jedenaście kontroli po rozwinięciu
macierzy. Podane limity czasu są częścią bieżącego kontraktu.

| Kontrola | Środowisko i zakres | Limit czasu |
| --- | --- | ---: |
| `verify` | Ubuntu, stabilne Node i Rust. Aplikacja, kurs, zaufane materiały testowe, build, przeglądarka produkcyjna i tryb offline | 60 min |
| `workspace-msrv` | Ubuntu, dokładne MSRV. Rust 1.85.0 oraz 1.89.0 dla Durable Log | 30 min |
| `mini-grep-fuzz` | Kampania nightly na Ubuntu oraz odtworzenie na stable i MSRV | 20 min |
| `profile-evidence` | Ubuntu stable, wyniki Callgrind i DHAT | 25 min |
| `allocation-evidence` (stable Ubuntu) | Ubuntu stable, wyniki alokacji | 25 min |
| `allocation-evidence` (MSRV Ubuntu) | Ubuntu Rust 1.85.0, wyniki alokacji | 25 min |
| `allocation-evidence` (stable macOS) | macOS stable, wyniki alokacji | 25 min |
| `miri-safety` | Ubuntu, kontrole natywne na stable, MSRV i przypiętym nightly | 60 min |
| `unsafe-borrowed-memory` (stable) | Autorskie materiały testowe na stabilnym Ruście | 30 min |
| `unsafe-borrowed-memory` (MSRV) | Autorskie materiały testowe na Rust 1.85.0 | 30 min |
| `unsafe-borrowed-memory` (Miri) | Autorskie materiały testowe w nightly Miri | 30 min |

`verify` instaluje najnowsze dostępne wydanie Node 22
(`check-latest: true`) z pamięcią podręczną npm, bieżący stabilny
zestaw narzędzi Rusta z rustfmt i Clippy oraz graf npm z pliku blokady.
Wybór głównej wersji nie przypina dokładnej wersji środowiska.
Wybrane wydanie musi spełniać dolną granicę określoną w `package.json`,
obecnie 22.23.4 dla Node 22. Zapisz faktycznie zainstalowaną wersję.
Zadanie kwalifikuje stabilne `rustup`, `rustc`, `rustdoc` i `cargo`,
zapisując ścieżki, wersje i sumy plików. Następnie przygotowuje
konfigurację Cargo offline do testu prefiksu zainicjalizowanych danych
i pobiera przypięty profil Tokio przed kontrolami natywnymi.

```sh
npm ci
cargo fetch --locked --manifest-path scripts/fixtures/tokio-runtime-1.54.1/Cargo.toml
```

Potem zadanie uruchamia kontrole natywnego środowiska i audytu, lint,
TypeScript, generowanie plików projektów, pełny Vitest z autoryzowanymi
wejściami natywnej kontroli, weryfikatory kursu, stabilne kontrakty API
i makr, audyty archiwów Cargo, obszarów roboczych, manifestów i źródeł oraz
build produkcyjny. Instaluje Chromium dla Playwright, uruchamia Next
na 3002 przez adres zwrotny systemu, wykonuje produkcyjne testy
przeglądarkowe bez ponowień i sprawdza `npm run test:offline` na tym samym
serwerze. Przeglądarka używa kontrolowanych odpowiedzi środowiska
wykonawczego. Wyniki dotyczą tego zestawu danych testowych.

Po wygenerowaniu plików projektów zadanie `verify` używa przypiętego wydania
`cargo-audit 0.23.0`, aby sprawdzić zawartość plików `Cargo.lock` w archiwach
startowych i rozwiązaniach pod adresami kanonicznymi, angielskimi i polskimi.
Sprawdza także zagnieżdżone pliki blokady oraz pliki śledzone w
`scripts/fixtures/`. Raport zapisuje wszystkie źródła dla każdej sumy SHA-256
oraz wskazuje archiwa File Schema Evolution udostępniane bez pliku blokady.
Weryfikator pobiera jedną migawkę oficjalnej bazy RustSec i zapisuje identyfikator
jej commita. Skan działa offline w katalogu tymczasowym, używa jawnie wskazanych
plików blokady i pomija status wycofania wersji z rejestru. Podatności i problemy
z bezpieczeństwem typów lub pamięci (kategoria `unsound`) w pakietach z crates.io,
brak wejścia oraz błędny lub niepełny skan powodują błąd zadania `verify`.
Aby odtworzyć kontrolę lokalnie, umieść przypiętą wersję narzędzia w `PATH`
i wykonaj `npm run content:packages` oraz `npm run audit:rustsec`.
CI zachowuje `test-results/rustsec-audit/report.json` w artefakcie
`rustsec-audit-report`. [Baza RustSec](https://github.com/RustSec/advisory-db) · [cargo-audit 0.23.0](https://github.com/RustSec/rustsec/releases/tag/cargo-audit/v0.23.0)

Workflow **Audit shipped Rust dependencies** skanuje `main` w każdy
poniedziałek o 04:17 UTC. Można go też uruchomić ręcznie dla `main` z karty
Actions. Korzysta z tego samego instalatora z weryfikacją sumy kontrolnej
i skanera co `verify`. Generuje archiwa do pobrania i działa na jednej
maszynie z Linuksem. Błąd audytu powoduje błąd przebiegu, a raport jest
zachowywany, jeśli uruchomiono krok audytu. Skan RustSec w zadaniu `verify`
pozostaje wymagany dla PR-ów.

`workspace-msrv` używa dokładnych ścieżek `cargo`, `rustc` i `rustdoc`
z Rust `1.85.0` dla obszaru roboczego Frame Protocol, Number Guessing+,
manifestów, kontraktów API i makr oraz testów wyników oceny. Durable Log
Service i Durable Log Retry używają dokładnie Rusta `1.89.0`, wymaganego
przez zależność z dołączonym SQLite. Polecenie `content:cargo -- --msrv`
wybiera minimum danego projektu. Zadanie pobiera też przypięty profil
Tokio przed kontrolami natywnymi offline. Bieżące zadanie stable i zadanie MSRV uruchamiają weryfikator
autorskich testów własności.

`mini-grep-fuzz` instaluje przypięty `nightly-2026-08-08`, dokładnie Rust
`1.85.0` oraz `cargo-fuzz 0.13.2`. Kampania nightly i odtworzenie na
stable oraz MSRV są odrębnymi etapami weryfikacji. Raporty, surowe logi,
korpus i oryginalne oraz zredukowane artefakty pozostają dostępne również
po błędzie zadania. Brak instrumentacji, danych o pochodzeniu, zwykłego
zakończenia lub aktualnego artefaktu oznacza błąd lub problem
infrastruktury.

`profile-evidence` instaluje Valgrind, jeżeli nie ma go w obrazie Ubuntu,
a następnie zbiera bieżące wyniki Callgrind i DHAT poniższymi poleceniami.

```sh
npm run content:profiles -- --fetch --profile=callgrind
npm run content:profiles -- --fetch --profile=dhat
```

`allocation-evidence` uruchamia `npm run content:allocations -- --fetch`
na stable Ubuntu i macOS, a `npm run content:allocations -- --fetch --msrv`
na Ubuntu z dokładnie Rust 1.85.0. Każdy wpis macierzy odtwarza oba
archiwa i oblicza ich sumy, sprawdza formatowanie, testy Cargo i Clippy
offline. Porównuje osobne procesy wersji bazowej, kandydata i mutacji
wymuszającej materializację na ustalonych obciążeniach. Raport dotyczy
autorskiego licznika. RSS i uogólnione progi wymagają odrębnych pomiarów.

`miri-safety` instaluje stable, Rust 1.85.0 i nightly `2026-08-08`
z `miri` oraz `rust-src`. Przygotowuje sysroot Miri, zapisuje konfigurację
Cargo offline, kwalifikuje wybrane pliki wykonywalne i wersje, odnotowuje
sumy plików sysroot i wykonuje natywne kontrole stable i MSRV.
`unsafe-borrowed-memory` uruchamia autorski weryfikator po jednym razie
na stable, `1.85.0` i `nightly-2026-08-08` z Miri. Stable i MSRV mogą
uruchamiać jedynie autorskie kontrole `safe-behavior`. Przypadki negatywne
z niezdefiniowanym zachowaniem korzystają z kompilacji samych metadanych.
Tylko przypięty przebieg Miri może je wybrać. Nie wykonuje się ich natywnie
nawet z ustalonym zaufanym wejściem. Te kontrole stosują stałe materiały
testowe z repozytorium. Metadane Miri i UB nie dotyczą wykonania kodu
ucznia ani ogólnego bezpieczeństwa programów natywnych.

Projekt przypina akcje stron trzecich do pełnych SHA commitów. Według
aktualnych zaleceń GitHub pliki blokad zależności workflow stanowią
najsilniejsze zabezpieczenie tam, gdzie repozytorium może je wdrożyć.
Pełne SHA są alternatywą. Przy zmianie workflow zachowaj minimalne
uprawnienia `contents: read`, pobranie kodu bez danych
uwierzytelniających i brak uprzywilejowanego `pull_request_target`.

## Zaufanie do forków, pamięć podręczna, artefakty i koszt

Śledzony workflow używa `pull_request`, `push` do `main` i ręcznego
`workflow_dispatch`. Nie ma obsługi `pull_request_target` ani
`workflow_run`. Każde zadanie ma `contents: read`, pobiera kod bez
utrwalania danych uwierzytelniających Git i działa na standardowym
`ubuntu-latest` lub `macos-latest` dostarczanym przez GitHub. Workflow
nie odwołuje się do sekretów repozytorium ani środowiska, uprawnień OIDC,
środowisk wdrożeniowych, własnych maszyn wykonawczych ani publikacji.
Wyrażenia powłoki korzystają z ustalonych wartości macierzy i ścieżek
obszaru roboczego. Nie korzystają z tytułów i treści PR-ów ani poleceń
z nazwy gałęzi. Kod PR-u wykonuje skrypty instalacyjne i autorskie
kontrole, więc sprawdź proponowane zmiany workflow i skryptów przed
zgodą na przebieg z forka. Zgoda zezwala na wykonanie. Nie ustanawia
zaufania do kodu.

Zatwierdzanie przebiegów z forków, dozwolone akcje, domyślne uprawnienia
tokenu, ochrona gałęzi i wymagane kontrole wynikają z ustawień GitHub.
Podczas integracji i publikacji sprawdź skuteczne ustawienia
w interfejsie, również na poziomie organizacji. Chroń sekrety, tokeny
z prawem zapisu i komputery osób utrzymujących projekt przed przebiegami
forków. Przy niedostępnej wymaganej kontroli nie włączaj
uprzywilejowanego wykonywania kodu z forka.

`setup-node` buforuje dane pobierania npm. `npm ci` instaluje graf
z pliku blokady w każdym zadaniu. Workflow nie pobiera ani nie wykonuje
artefaktów z innego przebiegu. Pull requesty z forków mogą odczytać
dostępne wpisy pamięci podręcznej gałęzi bazowej. Pamięć nie może
zawierać danych uwierzytelniających, eksportów uczniów ani prywatnych
raportów. Dostęp i zakres pamięci nie dają gwarancji integralności
lub poufności. Trafienie w pamięci nie potwierdza weryfikacji.
Przyszły uprzywilejowany proces nie może wykonywać kodu ani artefaktów
z niezaufanego przebiegu.

Przesyłane są wyznaczone raporty i dane diagnostyczne, przechowywane
przez siedem dni. Zadanie zainicjalizowanego prefiksu przesyła publiczne
podsumowania i pomija surowy pakiet natywny. Przed rozszerzeniem sprawdź
ścieżki artefaktów i zawartość raportów. Okres przechowywania określa czas
dostępności. Logi publicznego repozytorium są publiczne, a zalogowani
czytelnicy mogą pobrać zachowane artefakty. Nie dodawaj do nich sekretów
ani prywatnych danych audytu. Brak raportu, niepełna kampania
i przesłana diagnostyka nie spełniają wymaganej kontroli.

Kontrakt wymaga wszystkich jedenastu kontroli w wyznaczonych limitach
czasu. Reguły współbieżności anulują nieaktualne przebiegi PR i zachowują
trwające zadania `main`. Według aktualnych zasad GitHub standardowe
maszyny platformy są bezpłatne dla repozytoriów publicznych. Użycie
prywatne, przechowywanie, większe maszyny i inne produkty mają odrębne
zasady. Ustalenie nie dotyczy aktualnych ograniczeń konta, naliczonych
kosztów ani skutecznych ustawień repozytorium. Nie ograniczaj kontroli,
nie kupuj zasobów, nie zmieniaj budżetów ani nie przenoś wykonania na
komputery osób utrzymujących projekt w celu obejścia blokady. Postępuj
zgodnie z [instrukcją przekazania publikacji](publication-handoff.pl.md)
dla weryfikacji zewnętrznej.

## Weryfikacja lokalna

W świeżej kopii użyj obsługiwanej wersji Node
(`^22.23.4 || ^24.22.1 || ^26.12.1` w `package.json`) i uruchom poniższe
polecenia.

```sh
npm ci
cargo fetch --locked --manifest-path scripts/fixtures/tokio-runtime-1.54.1/Cargo.toml
npm run lint
npm run typecheck
npm run content:check
npm run content:packages
npm test
```

Pobranie przygotowuje pamięć przypiętych zależności. Kontrole natywne
używają `--offline --locked`. Zachowanie programu sprawdza późniejsze
wykonanie. Standardowe lokalne `npm test` może pominąć test prefiksu,
gdy nie ma wejść autoryzacji CI. Do autoryzacji potrzebna jest rzeczywista
kwalifikacja z konfiguracją Cargo offline, ścieżkami stabilnych
plików wykonywalnych i zapisami wersji oraz sum, katalogiem artefaktów
i wyjściem kontroli odczytanym po zakończeniu. Flaga sama nie wystarcza.
Brak wejścia, narzędzia, przekroczony czas, błąd zależności i niepełny
raport rejestruj zgodnie z faktycznym wynikiem.

Uruchom generator pakietów przed kontrolami archiwów dostarczanych
przez aplikację.

```sh
npm run content:packages
```

Przydatne węższe polecenia są zdefiniowane w `package.json`.

```sh
npm run content:rust
npm run content:tokio -- --fetch
npm run content:async-lending -- --fetch
npm run content:guessing -- --fetch
npm run content:property -- --fetch
npm run content:workspace -- --fetch
npm run content:capstone -- --fetch
npm run content:cargo
npm run content:manifests
npm run content:audit
```

`content:cargo` sprawdza autorskie archiwa offline z plikiem blokady.
Nie zapełnia pamięci rejestru. Generowanie ZIP-ów również nie przygotowuje
zależności. Świeża pamięć wymaga opisanego powyżej pobrania stałego
profilu Tokio i odpowiednich kontroli `--fetch` dla pakietów. Na przykład
`content:models -- --fetch` przygotowuje graf Loom,
`content:performance -- --fetch` przygotowuje Criterion, a
`content:property -- --fetch` przygotowuje zależności testów własności.
Stosuj udokumentowane warunki wstępne każdego weryfikatora i jego
ustalone wejścia repozytorium. Brak pakietu w pamięci jest problemem
infrastruktury. CI wykonuje przygotowanie jawnie. Kontrola zachowania
offline nie może po cichu powtarzać próby online ani używać innego
manifestu.

Zamknięte badanie Log Analyzer używa `npm run content:performance -- --a7`
i `npm run content:performance -- --a7 --msrv` po przygotowaniu pamięci
Criterion. Te przebiegi pozostają offline i używają przypiętych wersji.
Każdy zachowuje unikalny katalog raportu
`test-results/performance-a7/a7-<mode>-<id>/` z surowym wyjściem poleceń
i trójkami pomiarów Criterion. Wynik rozróżnia poprawność, kompletność,
nazwaną kontrolę negatywną i porównanie przedziałów ufności.
Nakładające się przedziały mogą dać poprawny wynik nierozstrzygający.
CI przesyła tylko katalogi przebiegów, bez wielokrotnie używanej pamięci
kompilacji. Zobacz [kontrakt badania](performance-investigation.pl.md).

Używaj `--msrv` z weryfikatorem, który dokumentuje tę opcję, po
instalacji i kwalifikacji wskazanej dokładnej wersji. Wersja bazowa to
`1.85.0`, a weryfikatory Durable Log Service i Durable Log Retry wymagają
`1.89.0`. Polecenia specjalistyczne
odrzucają dowolne ścieżki, źródła, zamienniki zależności i dowolne
wersje narzędzi. Przy ograniczonych zasobach ciężkie kontrole natywne
i przeglądarkowe uruchamiaj kolejno. Kontrolowane atrapy potwierdzają
kontrakty żądań, interfejsu i stanu. Wyniki kompilatora, wykonania,
archiwów i narzędzi natywnych wymagają rzeczywistych kontroli.

Kontrole produkcyjnej przeglądarki i trybu offline wykonuje się osobno
od zwykłych testów jednostkowych.

```sh
npm ci
npm run build
npm start -- --hostname 127.0.0.1 --port 3002
# In another terminal:
npx --no-install playwright install chromium
npx --no-install playwright test --config .github/playwright.production.config.ts
npm run test:offline
```

Serwer produkcyjny musi nasłuchiwać na adresie zwrotnym i pozostać
uruchomiony podczas obu kontroli. [Granice wykonania kodu](runner.pl.md)
opisują różnicę między kontrolowaną odpowiedzią API a rzeczywistym
wynikiem kompilatora. Aktualny zakres i dokładne historyczne odnośniki
do dowodów opisują [verification.md](verification.pl.md) i
[initialized-prefix-evidence.md](initialized-prefix-evidence.pl.md).
Zachowaj datowaną historię przebiegów w tamtych dokumentach.

## Raportowanie i integracja

Zapisz polecenie, wybrany zestaw narzędzi, rzeczywiste wersje i ścieżki
wykonywalne, aktualność, identyfikator artefaktu lub raportu i wszystkie
ograniczenia. Błąd kompilatora, przekroczony czas, sygnał, brak
zależności, niedostępne środowisko, przebieg bez testów i odmowa
uprawnień nie stanowią wyniku mutacji ani porażki ucznia. Zachowane
artefakty pomagają diagnozować błędy. Nie zaliczają niepełnego przebiegu.

Przed zwykłym scaleniem uzyskaj niezależny przegląd i aktualne udane
wymagane kontrole dokładnego commita PR. Użyj standardowej ścieżki
repozytorium i wykonaj świeże kontrole wynikowego commita `main`.
Jeśli Actions lub wymagane środowisko jest niedostępne, zachowaj pracę
lokalnie i opisz blokadę. Nie omijaj warunków kolejnym przebiegiem,
starszym zielonym commitem ani zmianą hostingu, rozliczeń, widoczności
lub ustawień wydania na podstawie tego dokumentu.

## Źródła

Zewnętrzne instrukcje sprawdzono 24 października 2026 r. Sprawdź je
ponownie przy przekazaniu wydania.

- [Format AGENTS.md](https://agents.md/) opisuje zwykły Markdown bez
  obowiązkowego schematu. Obowiązuje najbliższy plik i jawne instrukcje
  użytkownika.
- [Bezpieczne używanie GitHub](https://docs.github.com/en/actions/reference/security/secure-use)
  opisuje minimalne uprawnienia, granice niezaufanych pull requestów,
  pliki blokad zależności akcji i pełne SHA jako rozwiązanie zastępcze.
- [Granice wykonania kodu Rust](runner.pl.md) opisują zdalne uruchamianie
  kodu ucznia i zakres lokalnych zaufanych materiałów testowych.
- [Zapisy weryfikacji](verification.pl.md) opisują wyniki i ograniczenia.
- [Zatwierdzanie przebiegów z forków](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)
  zaleca przegląd zmian workflow przed wykonaniem. Skuteczne zasady
  wynikają z ustawień repozytorium, organizacji lub przedsiębiorstwa.
- [Dostęp do pamięci podręcznej zależności](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
  opisuje zakres, odczyt z forków i ograniczenia danych wrażliwych.
- [Dostęp do artefaktów](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
  i [skutki zmiany widoczności](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
  opisują dostępność logów i zachowanych artefaktów istotną przy
  przeglądzie wydania.
- [Rozliczanie Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
  opisuje działanie standardowych maszyn w publicznych repozytoriach
  i osobne ograniczenia przechowywania i konta.
