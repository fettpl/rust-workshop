# Granice wykonywania kodu Rust

[English](runner.md)

Aplikacja nigdy nie wywołuje lokalnie `rustc`, `cargo`, powłoki ani innego
procesu potomnego dla kodu ucznia. `POST /api/run` sprawdza małe żądanie JSON
i wysyła je do izolowanego środowiska zdalnego. Domyślny adapter
`PlaygroundRunner` używa stałego oficjalnego adresu
`https://play.rust-lang.org/execute`. W konfiguracji wdrożenia można ustawić
`RUST_RUNNER_URL` na stały adres HTTPS i użyć `RemoteRunner`. Adres pochodzi
z konfiguracji serwera. Żądanie przeglądarki nie może go podać.

Adapter wysyła bieżący format żądania Rust Playground jako jeden obiekt JSON
z polami `channel: "stable"`, `mode: "debug"`, `edition: "2024"`,
`crateType`, `tests`, `backtrace` i `code`. Tryb wykonania używa binarnego
pakietu. Tryb testów używa biblioteki z `tests: true` i dodaje przekazane
przez klienta testy kursu w module `#[cfg(test)]`. Liczby zaliczonych
i niezaliczonych testów są zwracane, gdy podsumowanie z usługi zawiera obie
wartości liczbowe. Sam kod zakończenia nie wystarcza do uznania testów.

Endpoint ogranicza kod ucznia do 64 KiB, ukryte testy do 32 KiB, żądanie
do 100 KiB i zwracany strumień do 128 KiB. Czas oczekiwania na żądanie
wynosi 12 sekund. Mała kolejka współbieżności jest wspólna dla procesu.
Limity chronią lokalny serwer przed nadmiernie dużymi żądaniami i przed
połączeniami z usługą, które utknęły. Dokumentacja Rust Playground opisuje
kontenery kompilatora bez dostępu do sieci, limity pamięci i czasu wykonania
oraz izolację przez Docker. Te zabezpieczenia należą do zdalnej usługi
i wymagają niezależnego przeglądu przed wdrożeniem z innym
`RUST_RUNNER_URL`.

Komunikaty kompilatora i wyjście programu pozostają dosłowne w `stderr`
i `stdout` w granicach jawnego limitu. Adapter klasyfikuje znane wyniki jako
`success`, `compile-error`, `runtime-error`, `test-failure`, `timeout`
lub `infrastructure-error`. Wyodrębnia podstawową diagnostykę z nagłówków
kompilatora Rusta do celów nawigacji, zachowując oryginalny tekst do nauki.
Błąd sieciowy, nieprawidłowa odpowiedź, błąd HTTP, odrzucenie przez kolejkę
i przekroczenie czasu są problemami infrastruktury. Próba ucznia nie jest
wtedy oznaczana jako błędna odpowiedź.

Trasa przyjmuje tylko żądania `POST` z JSON-em. Jeżeli żądanie ma nagłówek
`Origin`, jego host i port muszą odpowiadać nagłówkowi Host widocznemu
dla przeglądarki. Bezpośrednie testy mogą użyć request.url. Pozwala to
obsłużyć wewnętrzny adres localhost Next.js i odrzucić dowolne pochodzenie.
Przekazywany nagłówek hosta nie jest zaufany. Trasa nie przyjmuje z treści
żądania adresu środowiska, nagłówków, zmiennych środowiskowych ani sekretów.

## Źródła zewnętrzne

- [Repozytorium Rust Playground](https://github.com/rust-lang/rust-playground)
  opisuje bieżącą architekturę, izolację kontenerów i limity zasobów.
- [Oficjalny Rust Playground](https://play.rust-lang.org/) udostępnia usługę.
  Format danych API sprawdzono w usłudze 2026-09-12.

## Weryfikacja

Lekcje Tokio używają pola `trustedFixtureTarget` tylko na potrzeby
weryfikacji repozytorium. Pole nigdy nie trafia do zdalnego wykonania.
Żądania przeglądarki nadal zawierają tylko kod, tryb i opcjonalne testy,
a adapter Rust Playground używa stałego formatu. Odczyt
[wygenerowanego manifestu kompilatora Rust Playground](https://github.com/rust-lang/rust-playground/blob/master/compiler/base/Cargo.toml)
z 2026-09-12 wykazał przypięte `tokio = "=1.53.1"`, flagi `rt`, `sync`,
`time`, `test-util` i `io-util` istotne dla profilu oraz
`tokio-stream = "=0.1.19"`. Wygenerowany manifest zawiera dodatkowe
funkcje usługi i potwierdza ich dostępność w źródle zewnętrznym. Podczas
wyboru tego profilu nie uruchamiano kodu w zewnętrznym Rust Playground.

Do powtarzalnych kontroli autorskich `scripts/fixtures/tokio-runtime-1.54.1`
przypina Tokio z `macros`, `rt`, `sync`, `time`, `test-util`, `io-util`
i `net`, a także tokio-stream =0.1.19 bez funkcji domyślnych oraz
Cargo.lock. ReceiverStream jest dostępny bez funkcji `sync` tokio-stream.
Ta opcjonalna funkcja dodaje kolejne otoczki i zbędną na tym etapie
zależność tokio-util. Kontrola wstępna profilu wykonuje rzeczywiste
dwukierunkowe I/O i opróżnia zamknięty ReceiverStream z wcześniej
wydanym zezwoleniem. [Manifest Cargo Tokio 1.54.1](https://raw.githubusercontent.com/tokio-rs/tokio/tokio-1.54.1/tokio/Cargo.toml)
potwierdza zależności funkcji. `test-util` zależy od `rt`, `sync`
i `time`. `npm run content:tokio -- --fetch` wykonuje kontrolowane
pobranie według stałego pliku blokady. Następnie weryfikuje zarejestrowane
przykłady repozytorium w katalogu tymczasowym przy użyciu poleceń Cargo
offline i z przypiętymi wersjami. Późniejsze `npm run content:tokio`
korzysta wyłącznie z zależności w pamięci podręcznej. Kontrole obejmują
widoczne przykłady, oczekiwaną diagnostykę kompilatora, niedokończone
startery, rozwiązania referencyjne, zadania od pustego edytora i powtórki.
Weryfikator `content:rust` obsługujący bibliotekę standardową odrzuca
nieznane cele i pozostawia zadeklarowane testy Tokio osobnej kontroli.
CI wymaga obu.

Etap TCP dodaje piątą kontrolę wstępną w stałym profilu. Gniazdo nasłuchuje
na `127.0.0.1:0`, klient działa w tym samym procesie, koniec żądania jest
sygnalizowany przez zamknięcie zapisu, a odpowiedź nadal można odczytać.
Materiały testowe używają adresu zwrotnego IPv4. Nie potrzeba sondowania
wolnego portu, hosta publicznego ani DNS. Lokalne wykonanie sprawdza
rzeczywiste zachowanie gniazd systemu operacyjnego. Wdrożony Rust Playground
wymaga odrębnego testu.

Kontrola odczytu z 2026-09-13 znalazła `net` na
[wygenerowanej liście funkcji Tokio w Rust Playground](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/Cargo.toml)
oraz `--net none` w [koordynatorze kompilatora](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/orchestrator/src/coordinator.rs).
[Dokumentacja sterownika none w Dockerze](https://docs.docker.com/engine/network/drivers/none/)
opisuje adres zwrotny IPv4 wewnątrz kontenera i brak konfiguracji adresu
zwrotnego IPv6. Te źródła wspierają ćwiczenia klient–serwer IPv4 w jednym
wykonaniu. Nie potwierdzają przyjęcia wszystkich testów przez bieżące
wdrożenie. W tej kontroli nie wysłano żadnego żądania wykonania kodu.

Weryfikator przykładów biblioteki standardowej pozwala na 60 sekund
kompilacji i 8 sekund wykonania, jak w weryfikatorze Tokio. Przebieg CI
34720429657 zgłosił `spawnSync rustc ETIMEDOUT` już przy pierwszej
kompilacji ze starym wspólnym limitem 8 sekund. Testy regresji procesu
modelują wolny kompilator i odrzucają przerwane procesy nawet wtedy,
gdy częściowe stdout zawiera raport testów. Limity narzędzi utrzymaniowych
nie zmieniają limitu zdalnego wykonania w aplikacji.

Weryfikator autorski nie przyjmuje źródeł ani ścieżek w wierszu poleceń.
Żądania aplikacji go nie wywołują. Błąd zależności, przekroczenie czasu,
brak pliku wykonywalnego i przebieg bez testów są błędami weryfikacji.
Odrzucenie nieprawidłowego rozwiązania wymaga osobnego wyniku. Błędy
kompilacji bez kodu sprawdza się z rzeczywistym komunikatem Rusta dla
autorskiego źródła. Interfejs zachowuje komunikat bez dopisywania kodu E.

Etap publicznego API używa istniejącego środowiska przeglądarkowego
ograniczonego do biblioteki standardowej. Osobne polecenie
`content:workspace` rozpakowuje wyłącznie autorskie archiwum Frame
Protocol, sprawdza metadane Cargo względem zadeklarowanych członków
wirtualnego obszaru roboczego i kontroluje funkcje samej biblioteki
oraz całego obszaru. `--msrv` wybiera dokładnie Rust 1.85.0 dla kontroli
starterów, testów wzorca, Clippy i rustdoc. Polecenia utrzymaniowe nie
przyjmują ścieżek lub kodu ucznia, manifestów ani dowolnych wersji narzędzi.
Aplikacja nie uruchamia Cargo ani nie uznaje opanowania materiału na
podstawie pobrania archiwum lub listy poleceń lokalnych.

Deterministyczne testy adaptera używają kontrolowanej odpowiedzi na
granicy fetch. Sprawdzają serializację żądania, mapowanie statusu,
zachowanie wyjścia, limity, przekroczenie czasu i walidację HTTPS.
Uruchom je poniższym poleceniem.

```sh
npm test -- --run src/runner/runner.test.ts src/app/api/run/route.test.ts
```

Kontrola z rzeczywistą usługą zależy od dostępności `play.rust-lang.org`
i jest wykonywana osobno.

```sh
npm run dev
# In another terminal:
node scripts/smoke-runner.mjs
```

Pięć przypadków sprawdza wyjście, E0382, zaliczone testy, niezaliczone
testy i panikę programu przez API aplikacji. W razie potrzeby ustaw
`RUST_WORKSHOP_URL` na inny lokalny adres aplikacji.

Testy kursu są ukryte w interfejsie ćwiczenia. Pozostają dostępne w kodzie
otwartego narzędzia do lokalnej nauki. Dane przeglądarki i wyniki z importu
nie są uwierzytelnionymi zgłoszeniami egzaminacyjnymi. Makra asercji mają
kwalifikowane ścieżki, by makra ucznia nie przesłaniały ich przypadkiem.
Ocena z istotnymi konsekwencjami wymagałaby dodatkowo identyfikatorów
ćwiczeń po stronie serwera, zaufanego zapisu wyników i niezależnie
zweryfikowanej usługi wykonawczej.

Bieżący profil natywny i pobierane projekty Tokio używają 1.54.1 po
[RUSTSEC-2026-0386](https://rustsec.org/advisories/RUSTSEC-2026-0386.html).
Autorskie przykłady nie używają konstruktorów `AsyncFd` objętych problemem.
Bieżący graf zależności nadal wymaga poprawionej wersji. Metadane
`cargo-tokio-runtime-1.53.1` zachowują historyczną tożsamość i pozostają
poza bieżącym wykazem przypadków natywnych. Istniejące wyniki i datowany
przegląd źródeł Rust Playground zachowują zakres poprzedniego profilu.
W ramach tej aktualizacji nie zweryfikowano wersji zależności ani stanu
poprawek we wdrożonej usłudze Rust Playground. Aktualizacja lokalnego
profilu nie aktualizuje zewnętrznej usługi. Datowany przegląd źródła
i brak wywołań `AsyncFd` w przykładach nie rozstrzygają stanu poprawek
w usłudze.
