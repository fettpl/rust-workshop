# Number Guessing+ — projekt

[English](2026-09-13-number-guessing-plus-design.md)

Pierwszy projekt portfolio uczy dotąd tworzenia komunikatów o wyniku gry. Ten etap rozwija ten sam projekt w działającą grę terminalową z losowaną domyślnie liczbą, jawnym stanem, obsługą niepowodzeń i odrębnymi zadaniami sprawdzającymi zastosowanie wiedzy. Uczestnik może pobrać starter i rozwiązanie wzorcowe. Wcześniejsze lekcje, kroki, identyfikator projektu, notatki i dowody zachowują dotychczasową tożsamość.

## Program nauczania i zgodność

- Moduł `number-guessing-plus`, po `testing-quality`, z czterema łańcuchami lessons/concepts: `guess-input-contract`, `guess-round-state`, `guess-session-io`, `guess-random-boundary`. Pierwsze lesson/concept zależy
  od `testing-quality-workflow`.
- Każda lekcja posiada przewidywanie, obserwację wykonywalną, wyjaśnienie, pierwotną
  `${id}-gate`, niezależną `${id}-blank` oraz odrębne ćwiczenie pobierania kodu. Brama i ślepe użycie
  znaczące ukryte testy Rustu; puste nie ma rozrusznika lub dostarczony podpis. Świeże
  zadania zmieniają domenę AND jako odpowiednie ograniczenie, nie tylko nazwy.
- Podstawowe zadania następują po semantyce pakietu poniżej. Ćwiczenia inline używać
  tylko std i wtryskiwane values/functions. Rzeczywista rand, manifesty, stdin/stdout i wyjścia procesowe są
  weryfikowane w Cargo, nie twierdził, jak udowodnione przez jednoplikowe ćwiczenia
  przeglądarki.
- Utrzymać projekt ID `number-guessing-result-message` i indeks 0. `course.project` i `projects[0]` odnoszą się do wzmocnionej umowy.
  Zachować pierwotną lekcję początkową `number-guessing-transfer`; wyraźnie `lessonIds` zawiera tę lekcję `adversarial-no-clone` i
  wszystkie cztery nowe lekcje. Zachować wszystkie stare lesson/step IDs i ich porządek.
- Paczka `number-guessing-workshop` ujawnia tylko cztery nowe główne bramy. Nie oczyszcza to starych
  niezależnych wyników, ujawnia nowe zadania blank/retrieval lub opanowanie dotacji tylko dla download/checklists.
- Polish learner copy zakłada podstawowe programowanie i nie wcześniej Rust. Użyj
  oficjalnych źródeł reviewedAt 2026-09-13. Istniejące wzorce projektów, trwałość v3 i umowa o pracę
  nadal pozostają.

## Szczegółowy kontrakt gry

Pakiet to Rust 2024, z biblioteką i `number-guessing` binarne. Pin `rand = { version = "=0.10.2", default-features = false, features = ["thread_rng"] }` i generować prawdziwe Cargo.lock.
Domyślne próbki infocation `rand::random_range(1..=100)` raz na grę. Jest to zwykła gra, bez gwarancji
kryptograficznej lub cross-version seeded-sequence.

Granice biblioteki (autor pakietu może organizować pliki, ale zachować te zamówienia
publiczne):

```rust
pub enum Input { Guess(u32), Quit }
pub enum InputError { Empty, Syntax, OutOfRange }
pub fn parse_input(line: &str) -> Result<Input, InputError>;
pub enum ConfigError { Secret, Attempts }
pub enum GameError { Finished, OutOfRange }
pub enum Status { Active, Won, Lost }
pub enum Feedback { Low { remaining: u8 }, High { remaining: u8 }, Won { attempts: u8 }, Lost { secret: u32 } }
pub struct Game { /* private fields */ }
impl Game {
    pub fn new(secret: u32, attempts: u8) -> Result<Self, ConfigError>;
    pub fn submit(&mut self, guess: u32) -> Result<Feedback, GameError>;
    pub fn status(&self) -> Status;
    pub fn remaining(&self) -> u8;
}
pub fn new_game_with(attempts: u8, draw: impl FnOnce() -> u32) -> Result<Game, ConfigError>;
pub enum SessionOutcome { Won, Lost, Quit, Eof }
pub fn play<R: std::io::BufRead, W: std::io::Write>(reader: &mut R, writer: &mut W, game: Game) -> std::io::Result<SessionOutcome>;
```

Typy wyliczeniowe implementują Debug, PartialEq i Eq, a gdzie ma to zastosowanie, także Copy. Typy błędów implementują Display i Error. `parse_input` używa `trim` do usunięcia białych znaków Unicode z obu końców. Akceptuje dokładnie małe `q` albo niepusty ciąg cyfr ASCII. Zera wiodące są dozwolone. Znaki plus i minus, kropka dziesiętna i wewnętrzne białe znaki powodują Syntax. Puste wejście daje Empty. Liczba spoza 1..=100 lub przepełnienie daje OutOfRange. Parsowanie nie modyfikuje gry.

`Game::new` najpierw sprawdza, czy wylosowana liczba należy do 1..=100, a potem czy liczba prób należy do 1..=20. `submit` najpierw sprawdza, czy gra się zakończyła, a następnie poprawność zakresu. Każdy z tych błędów pozostawia stan bez zmian. Każde wskazanie liczby z dozwolonego zakresu zużywa jedną próbę. Trafienie w ostatniej próbie daje Won, podając łączną liczbę prawidłowych prób. Nietrafienie w ostatniej próbie daje Lost i ujawnia liczbę. Low i High są zarezerwowane dla wcześniejszych prób. Po zakończeniu wszystkie wywołania submit zwracają Finished. `new_game_with` sprawdza limit prób przed wywołaniem funkcji losującej. Przy poprawnym limicie wywołuje ją dokładnie raz, a Game::new sprawdza wylosowaną liczbę. Nietrafiona odpowiedź lub liczba spoza zakresu nigdy nie powoduje ponownego losowania.

## Kontrakt strumieni i terminala

`play` przyjmuje nową grę w stanie Active. Jeśli przekazano zakończoną grę, zwróć InvalidInput przed pierwszym zapisem. Wypisz dokładnie `Number Guessing+: 1..100; attempts=N. Enter q to quit.\n`, podstawiając początkową liczbę pozostałych prób. Przed każdym odczytem zapisz `guess> ` i opróżnij bufor wyjścia. Wiersze oddziela LF. Przetwórz też ostatni niepusty wiersz bez LF. `trim` zapewnia obsługę CRLF. Końcowy odczyt bez danych oznacza EOF.

Surowy wiersz może mieć do 128 bajtów przed LF, wliczając CR. Odczytaj najwyżej 129 surowych bajtów, by wykryć przekroczenie bez wczytywania reszty. Błędne UTF-8 i zbyt długi wiersz kończą grę z io::ErrorKind::InvalidData. Poprawnie zakodowana, ale nieprawidłowa odpowiedź jest osobnym przypadkiem. Propaguj rzeczywiste błędy odczytu, zapisu i opróżniania bufora. Ograniczony czytnik nie kontroluje alokacji dowolnej implementacji BufRead przekazanej przez klienta.

Po parsowaniu wypisz `Invalid input. Enter a number from 1 to 100 or q.\n` dla każdego InputError, bez zużycia próby. Dla pozostałych wyników użyj odpowiednio `Too low; remaining=N.\n`, `Too high; remaining=N.\n`, `Won in N attempts.\n`, `Lost; secret=N.\n`, `Quit.\n` albo `End of input.\n`. Przed zwróceniem wyniku opróżnij bufor wyjścia terminala. Quit i EOF nie oznaczają przegranej. Gdy wystąpi błąd I/O, część komunikatów mogła już zostać wypisana. Limit obejmuje tylko poprawne próby i nie ogranicza liczby błędnych danych ani czasu gry.

Polecenie CLI ma postać `number-guessing [--attempts N] [--secret N]`. Domyślnie gra daje sześć prób i raz losuje liczbę. `--secret` to jawny tryb ćwiczeń z odtwarzalną liczbą. Każdą opcję można podać najwyżej raz, w dowolnej kolejności. Wartość jest dziesiętną liczbą zapisaną cyframi ASCII. Odrzuć argumenty pozycyjne, nieznane opcje, brak wartości, liczby ze znakiem, błędne zakresy i powtórzone opcje. Samodzielne `--help` wypisuje sposób użycia i kończy się kodem 0. Błąd konfiguracji daje komunikat na stderr i kod 2 przed nagłówkiem lub losowaniem. Poprawna konfiguracja wywołuje new_game_with, podając liczbę z `--secret` albo losując ją raz. Kod 0 oznacza Won, 1 oznacza Lost, Quit lub EOF, a 2 błąd konfiguracji lub I/O. Standardowe wejście i wyjście są adapterami wokół biblioteki. Biblioteka nie kończy procesu bezpośrednio.

## Dowody i bezpieczeństwo weryfikacji po stronie opiekunów

- Napisz autorskie testy przed referencjami i obserwuj umyślne TODO awarie rozruchowe.
  Przetestować wszystkie granice parsera, każde przejście terminala, ostatnią próbę
  wygranej, powtarzające się wywołania terminala, błędne wejście bez utraconych prób,
  wstrzyknięte liczenie losowania, ograniczone kawałki, CRLF/EOF, szybkie spłukiwanie
  zamówienia i niepowodzenie read/write/flush.
- Przetestować rzeczywisty proces za pomocą --secret dla dokładnych low/high/win/loss/quit/EOF transkryptów i kodów;
  przetestować złe opcje bez stdout. Ćwicz normalne nawoływanie losowe za pomocą
  adaptive bisection driver czytający rzeczywisty sygnał, więc wygrywa w ciągu siedmiu
  zgadywań bez zakładania jakiejkolwiek sekwencji lub wymagającej losowej wyjątkowości.
  Proces wiązany czeka i kill/reap na niepowodzenie.
- Kontrola mutacji opiekuna musi odrzucić błędy decrement-on-antivate,
  redraw-while-round, loss-before-final-win oraz brakujące-short-flush dla zamierzonego
  stwierdzenia o teście, nigdy tylko błąd kompilatora lub timeout.
- Pobierz tylko to repozytorium-authorised zablokowany pakiet w dedykowanym
  weryfikatorze z dokładnym opcjonalnym `--fetch` i `--msrv`; nie akceptuj ścieżki, kod ucznia lub
  zaległości. Cała weryfikacja po pobraniu wynosi offline/locked. Tryb MSRV rozwiązuje i sprawdza cargo/rustc/rustdoc
  1.85.0 i przypina wszystkie narzędzia do przetwarzania dzieci; CI obejmuje zarówno
  stabilne, jak i zadeklarowane minimum. Ogólna weryfikacja archiwów pozostaje tylko w
  trybie offline.
- Potwierdzić integrację, dziedzictwo notes/export/import/resume, pakiet ujawniać i świeże bramy. Rozszerzenie
  istniejących kontroli produkcji E2E/offline; wersja "bump service-worker content". Niezależnie
  od tego dokonuje się przeglądu autorów i integracji, a następnie commit/push/PR i łączy się tylko
  po dokładnej głowie CI.

## Źródła dotyczące kontraktu generatora losowego

- https://doc.rust-lang.org/stable/book/ch02-00-guessing-game-tutorial.html
- https://docs.rs/crate/rand/0.10.2/source/Cargo.toml.orig
- https://docs.rs/rand/0.10.2/rand/fn.random_range.html
- https://docs.rs/rand/0.10.2/rand/rngs/struct.ThreadRng.html
- https://rust-random.github.io/book/crate-reprod.html

Regulacje: rozszerzenie tego samego pierwszego projektu zamiast dodania duplikatu;
zgodność opiera się na ID. Zachować istniejące funkcje checkout i jego trzy
wydania-dowodów redakcji dokumentacji. Zatwierdzony wcześniej autonomiczny zakres
rozwoju kursu i jego wydania obejmuje ten kamień milowy; nie ma mowy o nowym
rozmieszczeniu ani wyborze hostingu.
