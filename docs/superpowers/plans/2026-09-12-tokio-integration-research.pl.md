# Analiza integracji Tokio

[English](2026-09-12-tokio-integration-research.md)

Data: 2026-09-12 Zakres: kontrola repozytorium tylko do odczytu i badania podstawowe. Żaden kod
nie został wysłany na publiczne plac zabaw, a żaden uczący się ani importowany kod nie
został wykonany lokalnie.

## Decyzja

Wprowadź Tokio w dwóch etapach.

1. Moduł podstaw asynchroniczności z biblioteki standardowej jest już w budowie. Kolejny etap krótko przypomina typy future i `.await`. W przeglądarce skupia się na wejściu do środowiska wykonawczego, zadaniach i `JoinHandle`, kanale `tokio::sync::mpsc` o ograniczonej pojemności oraz na `tokio::select!` i `tokio::time::timeout`. W każdym wykonywalnym ćwiczeniu używa rzeczywistego API Tokio. `std::thread`, `std::sync::mpsc` i ręcznie napisany wykonawca nie zastępują środowiska Tokio ani jego kanałów asynchronicznych.
2. Późniejszy moduł praktyczny obejmuje anulowanie, kontrolę napływu danych i kontrolowane zamykanie. Pakiet Cargo do pobrania i autorskie przypadki testowe są źródłami prawdy o wersjach zależności, włączonych funkcjach Cargo, zachowaniu testów i gwarancjach cyklu życia. Wykonawca przeglądarkowy pozostaje zdalnym środowiskiem ze stałym profilem. Nie przyjmuje z przeglądarki list zależności, manifestów Cargo, adresów usług, nagłówków, ustawień środowiska ani dowolnych ścieżek lokalnych.

Pierwsze ćwiczenia pomijają API sieci i systemu plików. Kontener kompilatora Playground nie ma dostępu do sieci. Zegary, kanały i zadania wystarczą do omówienia cyklu życia bez usług zewnętrznych. Asynchroniczne operacje I/O można dodać w późniejszym projekcie, z kontraktem lokalnego pakietu i atrapami do testowania `AsyncRead` i `AsyncWrite`.

## Dowody z tego repozytorium

`src/runner/index.ts` wysyła jeden JSON obiekt do `https://play.rust-lang.org/execute` z `channel`, `mode`, `edition: "2024"`, `crateType`, `tests`, `backtrace` oraz ciąg znaków `code`.
Tryb testowy włącza ukryte testy Rust do modułu `#[cfg(test)]` i używa skrzyni bibliotecznej.
Żądanie i wyjście mają wyraźne granice bajtów; awaria w górę, timeout, nieprawidłowa
odpowiedź lub odrzucenie kolejki jest sprzężeniem zwrotnym infrastruktury.

`src/domain/types.ts` obecnie modele `RunRequest` jako `{ code, mode, tests? }` i nie ma zależności, funkcji, czasu startowego ani pola
manifestu Cargo. `LessonStep` ma ciąg znaków `code`, `solution`, oczekiwany status i oceniający. `Evaluator`
wspiera `tests`, `exact-output`, `compilation` i rodzaje pokrewne, ale nie jest to umowa specyficzna dla Asynka.
`ProjectPackage` posiada już zweryfikowane pliki `Cargo.toml`, `Cargo.lock`, źródło, testy i README.

`scripts/verify-rust.ts` jest celowo tylko źródłem: zapisuje importowane elementy repozytorium do
tymczasowego katalogu i powołuje się `rustc --edition=2024`. Nie posiada on rozwiązania w zakresie
zależności od ładunku, a zatem nie może zweryfikować `use tokio::...` lub `#[tokio::test]`. `scripts/verify-packages.ts` jest odpowiednim
wzorem dla Tokio: rozpakowuje tylko archiwum statyczne `projects[].package`, sprawdza świeżość archiwów i
działa `cargo fmt`, `cargo check`, `cargo test` i Clippy z `--offline --locked`. Ani skrypt nie akceptuje ścieżek użytkowników,
źródła nauki, importowanych plików ani kodu wiersza poleceń.

`src/content/validate.ts` wymaga 5 rund 8 kroków na lekcję, ewaluatorów wykonywalnych dla etapów kodowych,
niepustych `#[test]` osprzęt do badania oceniającego, acykliczny lesson/module warunki wstępne, źródło
IDs, moduły odniesienia bramki i poprawny kształt pakietu Cargo. Jego źródło URL
allowlist obecnie dopuszcza Rust Project Docs, Plac zabaw, `github.com/rust-lang/rust`i przygniecioną ścieżką
Loom Docs. Źródła Tokio, takie jak: `tokio.rs`, `docs.rs/tokio`, `docs.rs/tokio-util`oraz `github.com/tokio-rs/tokio` potrzebują wyraźnego
rozszerzenia listy uprawnień oraz testów walidacyjnych, zanim zawartość będzie mogła je
odnosić.

## Co udostępnia oficjalny Rust Playground

Oficjalna służba informuje o następujących wersjach w momencie dokonywania przeglądu:

- `GET https://play.rust-lang.org/meta/versions` donosi o stabilności `rustc 1.98.1`, haszu `48a229ceaefd4985c50990b14116b6d856af0985`, daty `2026-09-01`; beta wynosi `1.99.0-beta.5`, a nocą wynosi `1.100.0-nightly`
  według daty `2026-09-10`.
- Repozytorium `main` generowane deklaracje manifestu kompilatora `tokio = 1.53.1` i umożliwia `fs`, `full`,
  `io-util`, `net`, `rt`, `rt-multi-thread`, `sync`, `test-util`oraz `time`. Oświadcza również, że `tokio-util = 0.7.19` z `codec`, `full`oraz
  `io` funkcje. Patrz wygenerowany [`compiler/base/Cargo.toml`](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/Cargo.toml), wokół `dependencies.tokio` oraz `dependencies.tokio_util` wpisy. Jest to dowód
  źródłowy dla repozytorium `main`nie dowód na to, co załadowała rozmieszczona służba.
- Począwszy od 2026-09-12, zmieniono stronę [`docs.rs/tokio/1.53.1`](https://docs.rs/tokio/1.53.1/tokio/) i [`tokio-util 0.7.19`](https://docs.rs/tokio-util/0.7.19/tokio_util/) strony na bieżącą wersję API odniesienia;
  dnia [`Tokio v1.53.1` zwolnienie](https://github.com/tokio-rs/tokio/releases/tag/tokio-1.53.1) jest data 2026-07-20.
- Punktem końcowym wyłącznie do odczytu `GET https://play.rust-lang.org/meta/crates` jest odpowiednia kontrola implementation/release-time dla
  zastosowanych nazw i wersji skrzyni. W przeglądzie tym nie wykorzystano POST ani nie
  stwierdzono, że wdrożono preludium Tokio na podstawie tego punktu końcowego; nie
  należy wnioskować, że udostępniono je wyłącznie z GitHub `main` manifestu.
- Wygenerowany preludium jest automatycznie aktualizowany. [Zasady gry na placu zabaw](https://github.com/rust-lang/rust-playground/blob/main/CRATE_POLICY.md) mówi, że zawiera
  najlepsze skrzynie i Rust Cookbook skrzynie, używa niedawne wersje nie prerelease, a
  aktualizacje są sporadyczne, zazwyczaj wokół każdego stabilnego wydania Rust. Udana
  kompilacja przeglądarki nie udowadnia więc stałej wersji lub umowy funkcji.
- Pomoc Playground mówi, że skrzynie w tym preludium mogą być używane przez `extern crate` lub, w
  Rust 2018 i później, zwyczajne `use`. Plac zabaw [README](https://github.com/rust-lang/rust-playground/blob/main/README.md) dokumentuje brak połączenia
  sieciowego z kontenerami kompilacyjnymi i ogranicza pamięć, czas wykonania oraz zasoby
  kontenerów.
- Obecny publiczny kształt żądania jest widoczny w [`ui/src/public_http_api.rs`](https://github.com/rust-lang/rust-playground/blob/main/ui/src/public_http_api.rs): wykonać wnioski przenieść `channel`,
  `mode`, `edition`, `crateType`, `tests`, `backtrace` i `code`; `code` może być pojedynczym łańcuchem lub listą nazw
  plików. Odpowiedzi zawierają `success`, `exitDetail`, `code`, `stdout` i `stderr`. Wieloplikowa wartość `code`
  nie sprawia, że plac zabaw jest ogólnym interfejsem projektu Cargo; wygenerowane
  preludium pozostaje źródłem dependency/feature.

Fakty te wskazują rzeczywistą powierzchnię Tokio API do sprawdzenia przed zwolnieniem z
wykazu zastosowanej skrzyni, na przykład `use tokio::sync::mpsc;`, `tokio::spawn`, `#[tokio::main]`, `tokio::select!` i `tokio::time::timeout`. Nie uzasadniają one
nauczania arbitralnych skrzyń, niestandardowych funkcji Cargo, tworzenia sieci lub pliku
blokującego poprzez publiczny punkt końcowy. Recheck `meta/versions`, `meta/crates`, wygenerowany manifest, i
oprawy lekcji po każdej aktualizacji stajni lub Tokio.

## Właściwości API wpływające na projekt lekcji

Wykształcone Tokio API dokumentuje następujące umowy:

- [`tokio::runtime`](https://docs.rs/tokio/1.53.1/tokio/runtime/) odróżnia czas biegania bieżnika (`rt`) od czasu biegania wielowątkowego (`rt-multi-thread`).
  Ręcznie zbudowane potrzeby w zakresie czasu pracy `block_on`; I/O i timery wymagają również
  swoich kierowców (`enable_all` jest prosty wybór nauczania). `#[tokio::main]` jest zwartym punktem wejścia
  do aplikacji, podczas gdy `Builder` służy do wyraźnej kontroli czasu pracy.
- [`tokio::main`](https://docs.rs/tokio/1.53.1/tokio/attr.main.html) wymaga `macros` i `rt`; smak wielowarstwowy dodatkowo potrzebuje `rt-multi-thread`. Opis `full` Placu
  zabaw obejmuje te elementy. Preferować `#[tokio::test(flavor = "current_thread")]` w deterministycznych ukrytych testów, chyba
  że lekcja wyraźnie uczy smak grafik.
- [`tokio::spawn`](https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn.html) zwraca a `JoinHandle`. Tutorio wyjaśnia, że tarła futures wymaga `Send + 'static` dla wielonitkowego
  terminarza, a dane przechowywane w całym `.await` muszą być `Send`. Upuszczony uchwyt odłącza
  zadanie; oczekiwany uchwyt zgłasza wynik zadania lub błąd połączenia po panic/runtime
  anulowania. Ćwiczenia muszą pozostać i czekać na każdy uchwyt, który tworzą.
- [`tokio::sync`](https://docs.rs/tokio/1.53.1/tokio/sync/) jest synchronizacją runtime-aware i jest factory-faling przez `sync`. [`Tokio channels tutorial`](https://tokio.rs/tokio/tutorial/channels) określa `mpsc`
  jako multi-producer/single-consumer, `oneshot` jako jedną wartość, `broadcast` jako każdy odbiorca widzący wartości oraz `watch`
  jako ostatnią wartość. Ograniczony `mpsc::channel(capacity)` sprawia, że `send().await` czeka, gdy bufor jest pełny, a
  `recv()` zwraca `None` tylko po zamknięciu kanału i wszystkie buforowane wiadomości zostały
  odebrane.
- [`tokio::select!`](https://docs.rs/tokio/1.53.1/tokio/macro.select.html) czeka na równoległe gałęzie i upuszcza niedokończone futures branżowe, gdy jeden z
  nich się kończy. Tutorial 's [wybierz sekcję](https://tokio.rs/tokio/tutorial/select) wyraźnie definiuje anulowanie przez porzucenie
  przyszłości. To tylko anuluje pracę reprezentowaną przez upadłą przyszłość: kiedy
  oddział pożycza `&mut` przyszłość lub `JoinHandle`, upuszczanie oddziału upuszcza pożyczkę,
  podczas gdy tarło zadanie za tym uchwytem może pozostać żywe. Zrzucając `JoinHandle` odłącza
  swoje zadanie. Naucz się bezpieczeństwa anulowania i własności gałęzi; nie obiecaj, że
  `select!` anuluje zadanie lub wywnioskuje, że tworzy równoległe zadania. Użyj `tokio::spawn` do
  niezależnej realizacji zadania, zachowaj każdy uchwyt i czekaj na niego lub wyraźnie
  go przerwać.
- [`tokio::time::timeout`](https://docs.rs/tokio/1.53.1/tokio/time/fn.timeout.html) zwraca `Result<T, Elapsed>` i odwołuje poprzez wycofanie zapakowanej przyszłości. Wymaga funkcji
  `time` i zegara runtime; może panikować, gdy używane bez jednego. Ukryte testy powinny
  korzystać z testowej runtime i uniknąć snu zegara ściennego.
- [`tokio_util::sync::CancellationToken`](https://docs.rs/tokio-util/0.7.19/tokio_util/sync/struct.CancellationToken.html) jest rzeczywistym wspólnym sygnałem anulowania. `cancel()` Budzi zadania oczekujące `cancelled()`,
  a klonowanie daje uchwyty zadań do tego samego stanu anulowania. Tokio [pełna wdzięku poradnik zamykania](https://tokio.rs/tokio/topics/shutdown) dzieli się
  na wykrywanie stanu, informując o każdym składniku i czekając na wszystkie komponenty.
  To pokazuje żetony anulowania, a następnie czeka z `TaskTracker`.
- Tokio [prowadnica badania jednostkowego](https://tokio.rs/tokio/topics/testing) zaleca wstrzymanie czasu i dokumentów, których `#[tokio::test(start_paused = true)]` potrzebuje `test-util`. Jest to
  właściwy sposób na testowanie zachowania timeout/retry bez spania dla prawdziwych milisekund.
  Zachowaj funkcję wyraźną w manifeście pakietów i sprawdź, czy preludium przeglądarki
  nadal ją ujawnia.

## Proponowane treści i kontrakty

### Etap poświęcony środowisku wykonawczemu Tokio, zadaniom i zarządzaniu ich cyklem życia

Dodać ten moduł po module w fazie zaawansowania std async fundamentów, z warunkami
wstępnymi, które obejmują istniejące threads/channels i fundacje własności. Zachować każdą lekcję w
ramach istniejącej `Lesson`/`LessonStep` kształt i 5 węzłów 8 stopni. Traktuj przyszłość, lenistwo i
`.await` jako krótki wstępny podsumowanie, a nie drugą pełną lekcję Tokio. Dobrą sekwencją
jest:

1. Wpis Runtime: użyj `#[tokio::main]` i bieżącego wątku runtime; porównaj wyraźnie `Builder::new_current_thread().enable_all().build()?.block_on(...)` tylko po
   pracy makro.
2. Zadania i połączenia: wykonać dwa zadania `tokio::spawn`, zachować obie uchwyty, czekać na nie i
   propagować `JoinError`. Dołącz warianty błędów kompilacji dla pożyczonych danych i wartości
   nie- `Send` utrzymywanej w całym obszarze `.await`; naucz `move` i `Arc` tylko wtedy, gdy rozwiążą
   one rzeczywistą granicę.
3. Przekazywanie wiadomości Tokio: użyj ograniczonego `tokio::sync::mpsc`, klonu `Sender`, wartości procesu w
   jednym zadaniu odbiornika, upuść wszystkie klony nadawcy i udowodnij, że odbiornik
   wysysa buforowane wartości przed `None`.
4. Backpressure: make power `1`, use a gate/oneshot or determinalistic receive to show `send().await` is
   waiting while full, then make progress. Należy uwzględnić `try_send` i jego zachowanie
   własnościowe `Full(T)` / `Closed(T)`, jeżeli powierzchnia API jest przydatna do ćwiczenia.
5. Wyścig i anulowanie: użyć `tokio::select!` z komunikatem i cancellation/timeout przyszłości. Niech uczący się
   wyjaśni, która branża zostanie wycofana, czy jest właścicielem operacji podstawowej i
   co musi wykonać pracownik. Utrzymuj uchwyty tarłe będące własnością i oczekujące;
   używaj wyraźnego przerwania tylko wtedy, gdy lekcja je dokumentuje.
6. Recall/transfer: zmienić rodzaj komunikatu i politykę rurociągową, wymagając nowego ograniczonego
   gazociągu Tokio ze wszystkimi dołączonymi uchwytami oraz deterministycznego sygnału
   zakończenia.

Brama modułu powinna wymagać rzeczywistych identyfikatorów Tokio w umowie kodowej,
testów zachowania dla zamkniętego channels/backpressure oraz zachowanych `JoinHandle` dla każdego zadania
tarłowego. Oceniający kod może używać required/forbidden wzorów źródłowych tylko do wyegzekwowania
żądanego idiom Tokio; zachowanie pozostaje głównym sprawdzianem.

### Praktyczny moduł asynchroniczny

W następnym module należy zastosować dokładny cykl życia poniżej dla małego rurociągu
robotniczego:

`create runtime → create bounded mpsc → spawn workers with owned inputs → process until message or cancellation → close producer side → signal cancellation → drain/flush policy → await every JoinHandle → assert completion and no unresolved result`

Wykorzystanie `CancellationToken` do wyłączania kooperacji. Pracownik powinien `select!` między `rx.recv()` a `token.cancelled()`,
zaprzestać przyjmowania nowej pracy po anulowaniu, zakończyć wyraźnie udokumentowany
element lotu, jeśli taka jest polityka, i zwrócić wynik. Koordynator musi wycofać
wszystkich nadawców, wezwać `cancel` i czekać na każdego pracownika. Przerwa wokół wyłączenia
powinna raczej zgłaszać niepowodzenie, niż po cichu odłączać zadania.

Użyj umowy projektowej, takiej jak `tokio-pipeline-workshop` z małą biblioteką API i binarną. Wymagane
zachowania powinny obejmować ograniczoną przepustowość kolejki, własność wiadomości,
anulowanie, definitywne zakończenie, rozprzestrzenianie się błędów przez jednego
pracownika i pełne gracji zamknięcie. Wymagane dowody powinny obejmować `#[tokio::test(start_paused = true)]`, jeden test
przeciwciśnienia, jeden test anulowania, jeden test pracownika panic/join-error oraz jeden wariant
przeniesienia z innym komunikatem lub pojemnością. Nie używaj zależności sieciowej dla
pierwszego pakietu; użyj kanałów pamięci i timerów, a następnie ogólnych `AsyncRead` / `AsyncWrite` kpi,
jeśli async I/O jest dodany.

## Zgodność działania w przeglądarce i lokalnie

Biegacz przeglądarki musi utrzymać granicę `RunRequest` na małym poziomie. Nie dodawać `dependencies: Record<string, ...>` ani
akceptować ładunku dostarczonego przez ucznia TOML. Jeżeli UI musi zadeklarować, że
lekcja wykorzystuje Tokio, należy dodać profil wykonania kontrolowany przez serwer,
którego właścicielem jest zaufany lesson/profile ID, na przykład `playground-tokio-stable`. Trasa powinna potwierdzić
ten profil w stosunku do dopuszczalnej listy statycznej, a biegacz powinien wybrać stałą
`channel`, `edition`, typ skrzyni i politykę testu ukrytego. Nieznane profile to błędy infrastructure/validation.
Przeglądarka może nadal wysyłać learner `code` oraz ukryte testy będące własnością lekcji,
z zastrzeżeniem aktualnych ograniczeń.

Profil to metadane i polityka routingu, a nie dowód na wersję zależności. Publiczny plac
zabaw posiada wcześniej zbudowany zestaw zależności i nie ma wyboru funkcji na poziomie
żądania. Dlatego też:

- Traktuj wykonanie przeglądarki jako AccorTokio API dostępne w aktualnie rozmieszczonej
  oficjalnej skrzyni placów zabaw list/prelude po odczycie `meta/crates` Potwierdzenie. Repozytorium `main`
  manifest jest tylko wskazówką zgodności.
- Traktuj przypięty lokalny pakiet Cargo jako organ ds. zgodności: `tokio = "=1.53.1"`, `tokio-util = "=0.7.19"` tam, gdzie
  jest stosowany, z wyraźną minimalną listą cech lub `full`, kiedy lekcja umyślnie uczy
  szerokiej aplikacji APIs.
- Zapis `playgroundReviewedAt` /toolchain pozycji metadanych w planie lub manifeście zawartości, jeśli jest to
  wymagane, ale sprawdź ją ponownie zamiast traktować jako blokadę.
- Gdy lekcja zależy od funkcji, którą preludium Playground umożliwia globalnie, należy
  wyraźnie określić zależność w lokalnym pakiecie i dodać sprawdzenie, czy deklarowany
  profil lekcji API/feature pasuje do pakietu. Sukces przeglądarki może w przeciwnym razie ukryć
  brakującą funkcję Cargo.
- Keep przeglądarki ukryte testy deterministyczne i ograniczone. Unikać `sleep` na czas
  ścianki, sieci, OS sygnałów, pętli bez ograniczeń i testów, których wynik zależy od
  harmonogramu pracy. Używać bieżącej nitki smak testowy, zamknięte kanały, nierozgrzane
  bramy, wstrzymany czas, i wyraźne kanały rezultatu.

Bieżący `PlaygroundRunner` może już przymocować `#[tokio::test]` oprawy do jednego łańcucha źródłowego. Nie może
lokalnie zweryfikować tego źródła. Dodać oddzielnego zaufanego weryfikatora ładunków
zamiast zmieniać `verify-rust.ts`, aby wykonać arbitralny tekst lekcji poprzez wygenerowany manifest.
Oddzielny weryfikator powinien importować jedynie pakiety Tobio fixtures/project, tworzyć tymczasowy
katalog i odrzucać każdą ścieżkę, źródło, manifest, punkt końcowy lub wersję zależności
dostarczoną przez rozmówcę.

## Weryfikacja zaufanych przykładów za pomocą Cargo

Stosować istniejący przepływ package/archive jako punkt odniesienia:

1. Dodać zweryfikowaną definicję pakietu w ramach `src/content/projects/` z `Cargo.toml`, `Cargo.lock`, `src/lib.rs` / `src/main.rs`, testami
   integracyjnymi i README. Rozrusznik i rozwiązanie pakietu są wartościami autorskimi
   repozytorium.
2. Rozszerzenie zakresu `src/content/course.ts` na rejestrację projektu i połączenie jego odniesień lesson/reveal.
   Utrzymywanie rozwiązania pakietu ujawniać jako pomoc; Pobieranie lub uruchamianie
   pakietu nie może oznaczać dowodów przeglądarki kompletne.
3. Dodać dedykowany `scripts/verify-tokio.ts` (lub uogólniony zaufany weryfikator mocowania ładunku), który
   importuje package/fixtures z repozytorium, rozpakowuje się do nowego tymczasowego katalogu i
   uruchamia tylko stałe polecenia. Nie może przyjmować CLI ścieżek lub kodu. Należy
   przechowywać `verify-rust.ts` dla przykładów typu "std".
4. Weryfikacja bajtów archiwum obsługiwanych przez `public/projects/...` pasuje do wygenerowanych bajtów,
   tak jak `verify-packages.ts` już to robi.
5. Pierwsza próba `cargo fetch --locked` w kontrolowanym etapie maintainer/CI, następnie weryfikacja z `--offline --locked`. Dokumenty
   towarowe, które `--locked` odrzucają zmiany w pliku blokującym i `--offline` uniemożliwiają dostęp
   do sieci; razem sprawiają, że wejście weryfikacji jest odtwarzalne i odtwarzalne po
   zaludnionej pamięci podręcznej.
6. Uruchom `cargo fmt --all -- --check`, `cargo check --offline --locked --all-targets`, `cargo test --offline --locked --all-targets --no-fail-fast` i `cargo clippy --offline --locked --all-targets --all-features -- -D warnings` na roztwór. Dla rozrusznika, wymagają istotnego
   nieudanego testu lub kompilacji awarii związane z niedokończonym zachowaniem; zerowe
   testy, timeout, awaria rozdzielczości zależności i awaria infrastruktury nie są
   dowodem na to, że starter jest prawidłowo odrzucony.
7. Liczy się test asertowy i nazwane wyniki behawioralne, nie tylko status wyjścia.
   Włączyć malformed/closed zachowanie kanału, pojemność jeden backpressure, przerwa timeout,
   zakończenie anulowania, zadanie dołączyć błąd, i wariant transferu. Jeżeli chodzi o
   idiom źródłowy, oprócz testów w czasie pracy należy stosować zawężone kontrole
   źródłowe i dokumentować to, czego nie można udowodnić.
8. Uruchom zaufanego weryfikatora w CI ze stabilnym łańcuchem narzędzi zarejestrowanym
   przez repozytorium. Nie należy powoływać się na nią z prośby przeglądarki i nie wolno
   jej sprawdzać `UserState`, importowanych archiwów ani treści edytora.

W Księdze Ładunków potwierdza się, że `cargo test` kompiluje i wykonuje jednostki, integrację i
testy dokumentacji, że `--no-run` tylko kompiluje testy, że `--locked` wymusza istniejący plik
blokujący, a `--offline` uniemożliwia dostęp do sieci. Odpowiednie strony główne to [`cargo test`](https://doc.rust-lang.org/cargo/commands/cargo-test.html), [`cargo check`](https://doc.rust-lang.org/cargo/commands/cargo-check.html) i
[`Cargo.toml` w porównaniu z `Cargo.lock`](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html).

## Proponowane zmiany plików i typów na etapie wdrożenia

Są to umowy wykonawcze dla następnego agenta, a nie zmiany dokonane przez to zadanie
badawcze:

- `src/domain/types.ts`: dodać wąskie odniesienie do zaufanego profilu wykonania tylko wtedy, gdy UI musi
  odróżnić lekcje Tokio. Zachowaj szczegóły dotyczące zależności od serwera; nie
  ujawniaj arbitralnych funkcji ładunku lub manifestów w `RunRequest`.
- `src/runner/index.ts`: zachować zgodność `PlaygroundRunner` z obciążeniem użytkowym i stałe zatwierdzenie punktu
  końcowego HTTPS. W przypadku dodania wyboru profilu, profil mapy IDs do statycznej
  polityki po stronie serwera i zachować bieżącą obsługę output/timeout/size/concurrency.
- `src/app/api/run/route.ts` i testy trasy: odrzucić nieznane profile i wszelkie pola zapytań, które próbują je
  obejść endpoint/configuration. Dodaj badania potwierdzające, że trasa nigdy nie prowadzi metadanych
  zależności uczącego się.
- `src/content/validate.ts` i `src/content/content-validation.test.ts`: rozszerzyć oficjalny limit źródłowy na `tokio.rs`, `docs.rs/tokio`, `docs.rs/tokio-util` oraz `github.com/tokio-rs/tokio`; badanie
  przyjęte i odrzucone przedrostki. Dodać walidację dla każdego nowego profilu wykonania
  ID i odniesienia pakietowe.
- `src/content/tokio-foundations.ts` oraz późniejszy moduł praktyczny Tokio: stosować istniejące kontrakty lesson/module/evaluator ze
  źródłem IDs dla każdego społeczeństwa API i dwa niezależne warianty transferu na
  bramkę.
- `src/content/projects/tokio-pipeline.ts`, `scripts/verify-tokio.ts` oraz wygenerowane `public/projects/tokio-pipeline-workshop/{starter,solution}.zip`: posiadać dokładny lokalny kontrakt cargo. Keep `Cargo.lock`
  zameldował się i README wyraźnie o jednorazowym pobraniu online, a następnie przez
  zablokowane komendy offline.
- `scripts/verify-rust.ts`: pozostawić nienaruszoną obietnicę bezpieczeństwa weryfikatora tylko przez STD.
  Uogólniony zaufany pomocnik Cargo może podzielić się klasyfikacją wyjściową, ale musi
  zachować repozytorium-autorskie oprawy tylko reguła.
- `docs/runner.md`, `docs/verification.md` i `docs/progress.md`: opisać place zabaw prelude/version dryf, lokalny organ ds. ładunku, ograniczenie
  braku sieci, granicę wykonania nr learner/import oraz fakt, że zewnętrzny dym z placu zabaw
  pozostaje oddzielnie zatwierdzoną operacją.

## Macierz weryfikacji modułu

| Umowa | Pozytywne dowody | Wymagany przypadek negatywny | Metoda deterministyczna |
| --- | --- | --- | --- |
| Przyszłe lenistwo i `.await` | Body działa tylko wtedy, gdy jest oczekiwany; kolejność wyjściowa jest ustalona | Brak `.await` pozostawia niewykorzystane future/does nie produkują oczekiwanej produkcji | Pojedynczy czas pracy wątku prądu i dokładne wyjście |
| Wpis w czasie biegu | `#[tokio::main]` executes async main | Terminarz API na zewnątrz włączonych runtime nie powiodło się w zweryfikowanym urządzeniu | `enable_all`; oddzielny element przewidywanego błędu |
| Spawn i własność | Każdy uchwyt oczekiwany; wartości zwracane przez połączenie | Odrzuca się pożyczanie przez tarło zadania / nie- `Send` przez `.await` | Kompleksowe oprzyrządowanie błędu związane z testem E0373/E0277 plus join |
| Ograniczony mpsc | Zdolność jest honorowana; właściwość nadawcy i bliskość odbiorcy są prawidłowe | Zrzucony nadawca zbyt wcześnie lub odbiornik nigdy nie zamyka; unsent `T` jest utracony | Pojemność 1, nierozgrzana brama, wyraźny spadek, brak snu na ścianie |
| Ciśnienie wsteczne | `send().await` dokonuje postępu dopiero po zużyciu odbiornika | `try_send` miszandles `Full(T)` lub `Closed(T)` | Przetestować pełną kolejkę przed zwolnieniem odbiornika |
| `select!` i anulowanie | Zwycięzca jest obsługiwany; utrata gałęzi przyszłości spadek semantyki są wyjaśnione | Pożyczone przyszłości / `JoinHandle` pozostawia swoje podstawowe zadanie żywe, lub upuszczony uchwyt odłącza go | Należący do przyszłego oddziału lub token/abort sygnał z wyraźnie zachowaną i oczekiwaną klamką zadaniową |
| Czas | Ukończenie i `Elapsed` ścieżki mapy do wyraźnych wyników | Brak sterownika zegara lub ignorowany timeout | `#[tokio::test(start_paused = true)]` oraz `advance`/timeout |
| Wyłączenie pełne gracji | Sygnał, powiadomienie i oczekiwanie na wszystkich pracowników; polityka spłukiwania jest wyraźna | Koordynator kropli uchwyty lub liści sender/task żywe | CancellationToken, kanał zamknięty, połączone uchwyty, czas wyłączenia |
| Przeniesienie | Nowa wiadomość type/capacity nadal spełnia cykl życia | Wartości początkowe kodowane na twardo lub substytucja kanału std | Świeże, ukryte testy oraz zawężone kontrole źródeł |

## Granice analizy i zakres działań

Badania te nie POST ani nie powtórzyły kodu do `play.rust-lang.org`; wcześniejsza transmisja zewnętrzna
została odrzucona i pozostaje nieautoryzowana. Publiczna GET dokumentacja i metadane
były tylko odczytywane. Żaden kod uczący się, importowany kod lub arbitralna ścieżka
użytkownika nie został wykonany lokalnie. Przyszłe wdrożenie powinno zachować te granice
i zażądać osobnego zezwolenia przed każdym zewnętrznym badaniem dymnym na placu zabaw.
