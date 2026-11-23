# Pilotaż Rusta dla początkujących — protokół dla prowadzącego i karty zadań (wersja robocza)

[English](learner-pilot.md)

**Data** 2026-10-09 (Europe/Warsaw)

**Status** Projekt protokołu dla prowadzącego i materiały autorskie do przyjętego
pakietu 005 przygotowanego z Astrą. Ten dokument opisuje materiały źródłowe.
Udostępnienie zadań uczestnikom, planowanie i przeprowadzenie sesji,
implementacja w aplikacji oraz wyniki pilotażu wymagają osobnych działań.

## Zakres i stan źródeł

Użyj dokumentu po uzgodnieniu bieżącego stanu kodu i potwierdzeniu przez
osobę utrzymującą kurs każdej wymienionej poniżej zależności. Pakiety 003,
004 i 005 zachowują przyjętą kolejność i zakres. Sześć lekcji z dwunastoma
uporządkowanymi miejscami na przerwę z pakietu 005 to wyłącznie metadane
prezentacji. Nie wolno traktować ich jako podstawy do zapisu stanu ani
zdarzeń, zmiany schematu, migracji, dodawania indeksów, rodzin zadań lub
zaliczeń, automatycznego pomijania lub kończenia kroków, resetowania,
przesyłania danych, analityki, zakładania kont ani tworzenia nowej ścieżki
zapisu.

Ostatnim zaakceptowanym wydaniem przed kandydatem dotyczącym organizacji
sesji jest M8. Odpowiada mu commit `54d9f1a1f62840cb7d85f8300cec0ca71a2c60b6`
zwykłej gałęzi main i drzewo `277104d82e7da6d1941dfdae573b615a37cd02ad`.
Ostateczny przejrzany stan źródeł PR49 to
`480cc55f54e90f2dd9083ded107b389d3dc3a412`. Automatyczny przebieg PR ma
identyfikator `37845814389`, a automatyczny przebieg dla dokładnego commita
main to `37850180035`, próba 1. Wszystkie jedenaście zadań zakończyło się
pomyślnie. Dowody z PR i main obejmują 1106 przechodzących testów
jednostkowych w 103 plikach, po 2406 autorskich przypadków Rust na stabilnym
kompilatorze i na dokładnej wersji MSRV, 137 przypadków przeglądarkowych
bez ponowień i niestabilnych wyników oraz `[]` błędów stron w trybie offline.
Przegląd kodu i bezpieczeństwa w `480cc...` nie wykazał nowych ustaleń, a
trzy wcześniejsze ustalenia rozwiązano. Lokalne wydanie M8 przyjęto z HTTP
200 podglądu produkcyjnego i udokumentowanym audytem o określonym zakresie.
W zależnościach produkcyjnych odnotowano 2 ustalenia o wadze umiarkowanej,
0 o wysokiej i 0 krytycznych. Pełny audyt ma 5 informacyjnych ustaleń o
wadze wysokiej i 2 o umiarkowanej. Dotyczy to wcześniejszego wydania.
Na dzień 2026-10-09 bieżący stan roboczy zawierał zapisany w commicie
kandydat pakietu 005. Przy użyciu materiałów zapisz faktyczny commit lub
skrót materiałów autorskich. Potwierdzenie stanu CI, main i wydania wymaga
odrębnych danych. Prac i wyników kursantów jeszcze nie obserwowano.

Materiały autorskie pakietów 003 i 004 są dostępne w zaakceptowanych
źródłach M8. Prac i wyników kursantów jeszcze nie zaobserwowano.
Miejsca na przerwę i materiały pakietu 005 mają status kandydata.
Przed użyciem uzgodnij status i dostępność z dokładnym stanem źródeł,
weryfikacji i wydania. Ten plik jest jedynym protokołem dla osoby
utrzymującej materiały kandydata. Zapisy weryfikacji i bieżące odwołania
odzwierciedlają opisane wyżej fakty z zaakceptowanego wydania.

Przygotowanie materiałów ogranicza się do pracy nad protokołem. W tej
fazie nie uruchamiaj kompilatora, testów, przeglądarki ani środowiska
wykonawczego, nie instaluj zależności, nie korzystaj z sieci ani nie
zmieniaj stanu Git lub kodu źródłowego. Opis na końcu dokumentu uzgadnia
zakres późniejszej ograniczonej weryfikacji przykładowych programów.
W przyszłych sesjach, po zgodzie człowieka, można użyć kart i obserwować
rzeczywistą pracę lokalną lub ręczną według poniższego protokołu.

## Protokół dla prowadzącego

### Cel

Obserwuj, jak osoba znająca podstawy programowania i bez doświadczenia z
Rustem wybiera następny krok, przewiduje wynik na granicy zakresu,
naprawia błąd za pomocą komunikatu kompilatora i wyjaśnia swój wybór.
Wstępny cel organizacyjny to 3–5 ochotników, pod warunkiem zgody człowieka
na kontakt i faktycznej dostępności uczestników. Już jedna obserwacja może
ujawnić konkretną przeszkodę. Liczbę uczestników, czas pracy, przeniesienie
wiedzy, trwałość wiedzy, skuteczność, opanowanie materiału i wyniki
rekrutacji można podać dopiero po obserwacji.

Zapisuj zaobserwowane zdarzenia, rozróżniając poniższe rodzaje materiału.

- **Stały przypadek testowy** — dostarczone zadanie w przeglądarce, autorski kod, testy, API lub znany kontrakt.
- **Autorski materiał wyjściowy** — publiczne API, podana treść metody (także metody przetwarzającej tekst), szkielet lub kontrakt przekazany z zadaniem. Sam materiał wyjściowy nie stanowi dodatkowej pomocy i nie zmienia kategorii wyniku.
- **Samodzielna praca kursanta** — kod i testy napisane lokalnie. Architektura, typy, nazwy i uzasadnienie należą do kursanta.
- **Relacja kursanta** — deklaracja tego, co zrobił lub zrozumiał.
- **Przegląd wykonany przez człowieka** — wskazane dowody, które obserwator osobiście sprawdził, uruchomił lub usłyszał.
- **Przerwa techniczna** — opóźnienie spowodowane instalacją, siecią, przeglądarką, narzędziami, mechanizmem uruchamiania kodu lub innym elementem środowiska. Zapisz je poza czasem aktywnej pracy kursanta.

Podczas przygotowania materiałów nie instaluj Rusta, nie wykonuj kodu
kursanta przez weryfikator repozytorium, nie zakładaj kont, nie wysyłaj
danych, nie rekrutuj uczestników ani nie nawiązuj z nimi kontaktu i nie
zmieniaj stanu kursu. Podczas przyszłej obserwacji, po zgodzie człowieka,
można skorzystać z lokalnego zestawu narzędzi Cargo kursanta albo
obserwować pracę ręczną lub w przeglądarce. Weryfikator repozytorium służy
wyłącznie do przewidzianych przypadków repozytoryjnych. Jeśli narzędzia są
niedostępne, zapisz `not observed — toolchain unavailable` i kontynuuj
dostępną pracę w przeglądarce.

### Przed sesją

Zapisz datę, obserwatora, krótki kod uczestnika bez nazwiska i danych
kontaktowych, deklarowane doświadczenie w programowaniu i wcześniejszy
kontakt z Rustem. Uzyskaj zgodę na obserwację i zapis kodu, objaśnień,
czasu oraz pomocy widocznej na ekranie. Kursant może w każdej chwili
zrobić przerwę lub zakończyć sesję.

Przed udostępnieniem zadania sprawdź status materiału i jego zależności.

| Materiał | Status w tej wersji roboczej | Warunek dostępności |
| --- | --- | --- |
| Podstawy pierwszego programu (`first-program`) i funkcji | Stały materiał w przeglądarce | Przed użyciem sprawdź bieżące źródła. |
| Samodzielny program do opłat za paczki z pakietu 004 | Dostępny w zaakceptowanych źródłach M8 | Użyj przy dostępnym lokalnym Rust/Cargo. Prac i wyników kursantów jeszcze nie odnotowano. |
| Zaakceptowana naprawa współdzielonego pożyczenia (`shared-borrow`) | Odrębny, ograniczony zakres | Sprawdź bieżące, zaakceptowane kontrakty PR45. Użyj podanych treści metod jako materiału wyjściowego. |
| Krótka próba I/O z pakietu 003 | Dostępna w zaakceptowanych źródłach M8 | Użyj zaakceptowanego materiału pakietu 003. Pełny przegląd I/O ma inny zakres. |
| Sześć lekcji z punktami przerwy z pakietu 005 | `P005-authored candidate` | Użyj po uzgodnieniu i sprawdzeniu dokładnych ID lekcji, metadanych przerw i bieżącej implementacji. Materiał pakietu 005 pozostaje kandydatem. |
| Study Session CLI z pakietu 004 | Dostępny w zaakceptowanych źródłach M8 | Praca kursanta oczekuje na obserwację. |
| Zmiana `--min-total N` z pakietu 004 | Dostępna w zaakceptowanych źródłach M8 | Udostępnij po udokumentowanej samoocenie lub zewnętrznym przeglądzie pierwszej samodzielnej pracy. Zapisz kategorię dowodu. |
| Durable Log Service K z pakietu 004 | Opcjonalny późniejszy materiał w zaakceptowanych źródłach M8 | Poza pilotażem dla początkujących. Dostępność dla kursanta i wyniki wymagają osobnego potwierdzenia. |

Przygotuj dokładne zadanie i jego wersję przed pokazaniem go kursantowi.
Zapisz odrębną wersję źródła lub materiału jako podany commit albo skrót
materiału autorskiego. Gdy nie da się ustalić tożsamości, zapisz
`not observed`. To osobne pole obok wersji zadania i statusu źródła lub
materiału. Typ zadania wybierz spośród `fixed-fixture`, `prediction`,
`repair`, `open-local-artifact` i `delayed-transfer`. Status wcześniejszego
kontaktu z wymaganiem wybierz spośród `not shown before release`,
`shown previously`, `unknown` i `not applicable`. Nowa wersja zadania nie
usuwa wcześniejszego kontaktu z tym samym wymaganiem.

### Sesja 1 — pierwsze przewidywanie i naprawa

Przeznacz około 35–45 minut aktywnej pracy z możliwością przerwy.
To ramy organizacyjne sesji. Zapisuj obserwowany czas rozwiązania oraz
opóźnienia instalacji, sieci, przeglądarki i narzędzi osobno.

1. Użyj materiałów o pierwszym programie i podstawach funkcji.
2. Poproś kursanta o wyjaśnienie krótkiej, nieznanej funkcji własnymi słowami i pokazanie, co zmienia wyrażenie lub średnik.
3. Poproś o przewidzenie wyniku jednego przypadku granicznego. Zapisz przewidywanie przed pokazaniem wyniku.
4. W zadaniu naprawczym opartym na komunikacie kompilatora podaj najpierw wskazówkę dotyczącą pojęcia, następnie wskazówkę dotyczącą postaci konkretnego fragmentu kodu i dopiero w razie potrzeby gotowe rozwiązanie. Zapisz korzystanie z dokumentacji lub API i każdą dodatkową interwencję.
5. Zaproponuj samodzielny program do opłat za paczki z pakietu 004, jeśli bieżące źródła zawierają materiał i dostępne jest Cargo. Kursant wybiera architekturę, typy, nazwę funkcji, testy i reprezentację nieprawidłowego wyniku. Ocenę oprzyj na zaobserwowanej pracy.

Przykładowe pytania po polsku

- „Jaki wynik przewidujesz przed uruchomieniem kodu i dlaczego?”
- „Jak działa ta funkcja? Pokaż, co zmienia wyrażenie albo średnik.”
- „Jaki będzie twój następny krok? Możesz poprosić o wskazówkę lub zakończyć.”
- „Jaką decyzję podjęłaś lub podjąłeś w swoim programie i dlaczego?”

### Sesja 2 — własność, naprawa o określonym zakresie i użycie wiedzy w nowym zadaniu

Przeprowadź sesję po właściwych ćwiczeniach z własności. Osobno obserwuj
przewidywanie, wykonanie konkretnej naprawy, uzasadnienie prostym
językiem i wykorzystanie poznanej reguły w nowej dziedzinie. Dla każdej
wersji zapisz wcześniejszy kontakt z materiałem.

Użyj dokładnie wersji `S2-MC-v1`, `S2-SB-WORDS-v1`, `S2-SB-SUFFIX-v1`
i `S2-XFER-v1`.

- `S2-MC-v1` — przed wykonaniem przewidź, czy można nadal użyć pierwotnych wiązań `text` i `number` po przypisaniach, i wyjaśnij różnicę między przeniesieniem własności a `Copy`.
- `S2-SB-WORDS-v1` — wykonaj zaakceptowaną naprawę sygnatury na granicy współdzielonego pożyczenia. Treść metody `text.split_whitespace().count()` jest podana.
- `S2-SB-SUFFIX-v1` — wykonaj zaakceptowaną naprawę sygnatury na granicy współdzielonego pożyczenia. Treść metody `text.ends_with(suffix)` jest podana. Obie wartości wejściowe pozostają dostępne tylko do odczytu i można ich ponownie użyć u wywołującego.
- `S2-XFER-v1` — napisz funkcję pomocniczą do sprawdzania fragmentu tytułu zgłoszenia. Wywołujący używa `String::from("INC-42: parser")`, literałów `"parser"` i `"cli"`, po czym ponownie używa tytułu. Kursant wybiera nazwę funkcji, organizację kodu i granicę `String`/`&str`.

Publiczne API, podane treści metod, postać szkieletu i typowany kod
wywołujący są materiałem wyjściowym. Oddzielnie zapisuj wskazówki
pojęciowe, wskazówki dotyczące postaci kodu, sprawdzanie API, pomoc
obserwatora, ujawnienie oczekiwanej decyzji i pokazanie rozwiązania.
Naprawa dokumentuje wyłącznie umiejętność potrzebną w tym kontrakcie.

### Sprawdzenie po przerwie

Użyj dokładnie wersji `D-XFER-v1` po przerwie ściśle dłuższej niż 24
godziny od ostatniego kontaktu z danym pojęciem. Dokładnie 24:00 lub mniej
oznacza `quiet interval: no — repeated practice`. W takim przypadku
zadanie pozostaje powtórką, a główny wynik należy nadal do jednego z
pięciu rodzajów. Zapisz faktyczną liczbę godzin i ćwiczenia wykonane w
międzyczasie.

Nowe zadanie z prefiksem powiadomienia używa komunikatu będącego
własnością wywołującego `String::from("Przerwa: Rust")` i prefiksu
`"Przerwa"` oraz literału `"Status: gotowe"` z prefiksem zapisanym małą
literą `"status"`. Funkcja odczytuje tekst, rozróżnia wielkość liter i nie
usuwa białych znaków ani nie normalizuje tekstu. Kod wywołujący używa obu
postaci i może nadal używać własnego komunikatu. Nie otwieraj
wcześniejszego rozwiązania. Zapisz nowe przewidywanie, aktywny czas,
pomoc, kryteria, objaśnienie i zaobserwowane dowody.

### Późniejsze obserwacje zależne od wdrożenia materiałów

Gdy implementacja i ukierunkowana weryfikacja pakietu 005 udostępnią
proponowane miejsca na przerwę, wybierz jedno z sześciu miejsc w lekcjach
i zapisz dokładną osiągniętą granicę. Notatka pozwala przerwać naukę i
wrócić do bieżącego zadania przez istniejący autozapis. Nie oznacza
ukończenia kroku. Nie może pomijać ani automatycznie kończyć kroku,
przyznawać dowodów wykonania ani tworzyć nowej ścieżki zapisu. Planowany
czas lekcji pozostaje szacunkiem autora.

Materiały pakietu 004 są dostępne w zaakceptowanym M8. Późniejsza sesja
może objąć samodzielnie napisany Study Session CLI. Jeśli wybierzesz
opcjonalne zadanie ze zmianą `--min-total N`, zapisz wcześniejszy kontakt
z publicznym wymaganiem. Zmianę można udostępnić po udokumentowanej
samoocenie lub zewnętrznym przeglądzie. Prace rozwojowe mogą się odbywać
bez udziału osoby z zewnątrz. Durable Log Service K to opcjonalny materiał
na później, poza ramami czasowymi pilotażu początkującego. Sesje 1 i 2
obejmują własny, wskazany wcześniej zakres.

## Karty zadań dla kursanta po potwierdzeniu dostępności przez prowadzącego

Możesz zrobić przerwę lub poprosić o pomoc. Obserwator zapisuje aktywny
czas osobno od przerw i opóźnień technicznych. Przed uruchomieniem kodu
powiedz, jaki wynik przewidujesz i dlaczego. Liczy się znaczenie twojego
wyjaśnienia.

### Karta zadań dla początkujących

**Poziom** Wystarczą podstawy programowania. Możesz zaczynać naukę Rusta
od zera. Części oznaczone jako dostępne po potwierdzeniu zacznij, kiedy
prowadzący wyraźnie potwierdzi dostępność.

#### Sesja 1

1. Przejdź przez podstawy pierwszego programu i funkcji.
2. Wyjaśnij krótki, nieznany fragment funkcji własnymi słowami. Pokaż, co zmienia wyrażenie albo średnik.
3. Zapisz lub wypowiedz przewidywanie przed uruchomieniem przypadku granicznego.
4. Wykonaj jedną poprawkę na podstawie komunikatu kompilatora. Możesz otrzymać kolejno wskazówkę dotyczącą pojęcia, wskazówkę dotyczącą postaci kodu i pełne rozwiązanie.

#### Lokalny program Cargo do naliczania opłaty za paczkę — dostępny w zaakceptowanym M8 po potwierdzeniu

Zacznij po potwierdzeniu dostępności materiału i Rust/Cargo. Przy braku
narzędzi zapisz `nie zaobserwowano: brak narzędzia`.

Utwórz osobny lokalny program Cargo naliczający opłatę według łącznej
wagi paczki. Waga 1–5 kosztuje 8, waga 6–20 kosztuje 12. Dla pozostałych
wartości zgłoś nieprawidłową wagę w wybrany przez siebie sposób. Pokaż
wyniki dla `0`, `1`, `5`, `6`, `20`, `21`. Samodzielnie wybierz
nazwę funkcji i typ wyniku. Wybór sposobu wczytania danych, użycia pliku,
`Result`, struktury i pętli należy do ciebie.

Napisz co najmniej dwa własne testy. Jeden obejmuje granicę `5/6`, drugi
nieprawidłową wagę. Tymczasowo zmień jedną oczekiwaną wartość. Uruchom
testy, zobacz rzeczywisty błąd i przywróć poprawną wartość. Zapisz
komunikat i sposób naprawy. Prowadzący może sprawdzić wyniki poleceń,
granice zakresów, testy i wyjaśnienie reprezentacji nieprawidłowej wagi.

Przydatne polecenia

```text
cargo new nazwa-projektu
cd nazwa-projektu
cargo check
cargo run
cargo test
```

#### Sesja 2

Prowadzący przekaże oddzielne karty `S2-MC-v1`, jedną kartę naprawy
`S2-SB-WORDS-v1` lub `S2-SB-SUFFIX-v1` oraz `S2-XFER-v1`. Zapisz, czy
wymagania były wcześniej pokazane. Wykonaj osobno przewidywanie, naprawę
według kontraktu, wyjaśnienie oraz zadanie w nowej dziedzinie.

#### Miejsca na przerwę w sześciu lekcjach (12 miejsc) — dostępne po potwierdzeniu implementacji

Jeśli interfejs pokazuje notatkę, możesz przerwać pracę, a potem do niej
wrócić. Tytuł wskazuje miejsce na przerwę. Notatka nie kończy zadania,
nie pomija kroku ani nie przyznaje dowodu wykonania. Po powrocie
istniejący autozapis wznawia bieżące zadanie.

| Lekcja | `afterStepId` przerwy 1 | Tytuł i następny cel | `afterStepId` przerwy 2 | Tytuł i następny cel | Dalsze kroki |
| --- | --- | --- | --- | --- | --- |
| `todo-command-parser` | `parser-explain` | „Przerwa po wyjaśnieniu parsera”. „Zastosuj reguły parsera w następnym zadaniu”. | `parser-add-gate` | „Przerwa przy zadaniu zaliczeniowym Add”. „Sprawdź zastosowanie reguł parsera do innych poleceń”. | `parser-transfer`, `parser-recall` |
| `todo-state-invariants` | `state-explain` | „Przerwa po wyjaśnieniu stanu”. „Przejdź do poprawnych operacji Add i Done”. | `state-add-done-gate` | „Przerwa przy zadaniu zaliczeniowym Add i Done”. „Sprawdź listowanie i zastosowanie w nowym zadaniu”. | `state-list-gate`, `state-transfer`, `state-recall` |
| `todo-session-project` | `session-explain` | „Przerwa po wyjaśnieniu sesji”. „Rozpocznij zadanie z błędem w środku sesji”. | `session-run-gate` | „Przerwa przy zadaniu zaliczeniowym sesji”. „Porównaj sesję zwykłą z wariantem ścisłym”. | `session-strict-gate`, `session-recall`, `session-blank` |
| `todo-storage-format` | `format-explain` | „Przerwa po wyjaśnieniu formatu”. „Sprawdź zadanie z kodowania i dekodowania”. | `format-gate` | „Przerwa przy zadaniu zaliczeniowym formatu”. „Obserwuj zachowanie przy uszkodzonym wierszu”. | `format-observe`, `format-recall` |
| `todo-file-persistence` | `file-explain` | „Przerwa po wyjaśnieniu pracy z plikiem”. „Sprawdź zadanie z zapisu i odczytu”. | `file-gate` | „Przerwa przy zadaniu zaliczeniowym pracy z plikiem”. „Obserwuj bezpieczne zastąpienie pliku”. | `file-observe`, `file-recall` |
| `todo-terminal-cli` | `cli-explain` | „Przerwa po wyjaśnieniu CLI”. „Sprawdź zadanie z uruchamiania programu”. | `cli-gate` | „Przerwa przy zadaniu zaliczeniowym CLI”. „Przejdź do odczytu danych wejściowych i ćwiczenia lokalnego”. | `cli-recall`, `cli-input-boundary`, `cli-local-practice` |

Podany czas lekcji to szacunek autora. Obserwator mierzy faktyczny czas
rozwiązania w sesji.

#### Własny program podsumowujący sesje — dostępny w zaakceptowanym M8 po potwierdzeniu

Po potwierdzeniu dostępności utwórz własny lokalny projekt Cargo bez
kopiowania projektu referencyjnego. Program przyjmuje jedną ścieżkę
w UTF-8. Niepusty wiersz ma format `name;minutes` z dokładnie jednym
średnikiem. Usuń skrajne białe znaki z nazwy i pola liczbowego. Nazwa
musi być niepusta. `minutes` składa się z co najmniej jednej cyfry ASCII
`0–9` i ma wartość od 1 do 1440. Odrzuć `+5`, `-5`, spacje wewnątrz
liczb i cyfry spoza ASCII. Pomiń puste wiersze. Rozróżniaj wielkość liter
w nazwach Unicode. Posortuj według porządku Rusta i wypisz `name;total`.

Nieprawidłowy rekord zgłoś na `stderr` z numerem wiersza. Przetwarzaj
dalsze rekordy i zakończ kodem 2. Niewłaściwe argumenty, błąd odczytu
lub nieprawidłowe UTF-8 zgłoś na `stderr`, pomiń wypisanie raportu
i zakończ kodem 1. Dla poprawnego pliku zakończ kodem 0. Rekord
powodujący przepełnienie jest niepoprawny i pozostawia wcześniejsze sumy
bez zmian. Użyj biblioteki standardowej bez zewnętrznych zależności.
Sieć, znaczniki czasu, wdrożenie i progi wydajności są poza wymaganiami.

Pokaż plik poprawny i plik z poprawnymi i błędnymi rekordami. Napisz
własne testy nieprawidłowego rekordu, agregacji i kolejności. Wyjaśnij,
dlaczego przechowujesz nazwy na własność lub je pożyczasz. Kontrola
obejmuje powtórzone i równoważne nazwy po usunięciu skrajnych białych
znaków, Unicode, pusty plik, CRLF, granice liczby minut, znaki inne
niż ASCII `0–9`, niepoprawne pola, błąd wejścia i przepełnienie.

### `S2-MC-v1`, `S2-SB-WORDS-v1`, `S2-SB-SUFFIX-v1` i `S2-XFER-v1` — karty od prowadzącego

Przed rozpoczęciem zapisz `pokazane wcześniej`, `nie pokazano` lub
`nie wiadomo`.

#### `S2-MC-v1` — przewidywanie przeniesienia własności i działania `Copy`

Przed uruchomieniem przewidź, których pierwotnych wiązań `text` i
`number` można nadal użyć w `println!`.

- Obu pierwotnych wiązań, `text` i `number`.
- Tylko pierwotnego wiązania liczby całkowitej, `number`.
- Tylko pierwotnego wiązania `String`, czyli `text`.

```rust
fn main() {
    let text = String::from("rust");
    let text_next = text;
    let number = 7;
    let number_next = number;
    println!("{text} {number} {number_next}");
}
```

Najpierw zapisz przewidywanie. `text_next` jest nowym wiązaniem po
przypisaniu. Pytanie dotyczy późniejszego użycia pierwotnych `text` i
`number`.

#### `S2-SB-WORDS-v1` — naprawa funkcji korzystającej z widoku tekstu

Otwórz w aplikacji lekcję `shared-borrow-calibration` o pożyczaniu tekstu
oraz zadanie `shared-count-words` o naprawie zliczania słów. Użyj podanej
treści metody `text.split_whitespace().count()`, szkieletu i pokazanego w nim
kodu wywołującego. Popraw wyłącznie granicę funkcji, aby wywołujący
zachował własny `String` po wywołaniu.

Zachowaj zliczanie niepustych fragmentów rozdzielonych białymi znakami.
Uwzględnij pusty tekst, tabulatory, znaki nowego wiersza i wielokrotne
odstępy. Po naprawie użyj widocznego przycisku uruchamiającego testy.
Oddzielnie zapisz wynik, przyczynę naprawy, wyjaśnienie i ewentualną pomoc
prowadzącego.

#### `S2-SB-SUFFIX-v1` — naprawa funkcji korzystającej z dwóch widoków tekstu

Otwórz w aplikacji lekcję `shared-borrow-calibration` o pożyczaniu
tekstu i zadanie `shared-has-suffix` o naprawie sprawdzania końcówki.
Użyj podanej treści metody `text.ends_with(suffix)`, szkieletu i
pokazanego w nim kodu wywołującego. Popraw tylko granicę funkcji, tak
aby obie wartości wejściowe pozostały widokami tylko do odczytu, a
wywołujący mógł ponownie użyć `text` i `suffix`.

Zachowaj sprawdzanie dokładnej końcówki według dotychczasowego kontraktu.
Nie usuwaj białych znaków, nie zmieniaj wielkości liter ani nie
normalizuj tekstu. Pusta końcówka pasuje. Po naprawie użyj widocznego
przycisku uruchamiającego testy. Oddzielnie zapisz wynik, przyczynę
naprawy, wyjaśnienie i ewentualną pomoc prowadzącego.

#### `S2-XFER-v1` — fragment tytułu zgłoszenia

Napisz małą funkcję tylko do odczytu, która zwraca `true` wtedy i tylko
wtedy, gdy tytuł zawiera podany fragment. Sprawdzanie rozróżnia wielkość
liter i nie usuwa białych znaków, nie normalizuje ani nie zmienia tekstu.

- `String::from("INC-42: parser")` z fragmentem `"parser"` daje `true`.
- Ten sam tytuł z fragmentem `"cli"` daje `false`.
- Po obu sprawdzeniach kod wywołujący wypisuje tytuł, którego jest właścicielem.
- Co najmniej jedno wywołanie przekazuje literał tekstowy jako fragment.

Wybierz nazwę, sygnaturę i organizację kodu. Wybierz `String` lub `&str`
na granicy funkcji i wyjaśnij, jak kod wywołujący zachowuje możliwość
użycia tytułu. Możesz skorzystać z dokumentacji API. Zapisz to osobno
od dodatkowych wskazówek.

### `D-XFER-v1` — karta sprawdzająca po przerwie

Prowadzący wydaje kartę po przerwie dłuższej niż 24 godziny od ostatniego
kontaktu z pojęciem. Dokładnie 24:00 nie wystarcza. Zapisz faktyczny
odstęp i ćwiczenia z tego czasu. Przy przerwie trwającej najwyżej 24
godziny prowadzący zapisuje zadanie jako powtórkę. Wynik wykonania
zadania ocenia osobno.

Napisz małą funkcję tylko do odczytu, która zwraca `true` wtedy i tylko
wtedy, gdy tekst zaczyna się od danego prefiksu. Porównanie rozróżnia
wielkość liter i zachowuje białe znaki.

- `String::from("Przerwa: Rust")` z prefiksem `"Przerwa"` daje `true`, a po wywołaniu nadal można wypisać komunikat.
- Literał `"Status: gotowe"` z prefiksem `"status"` daje `false`.
- Użyj zarówno posiadanego `String`, jak i literału. Kod wywołujący może nadal używać własnego komunikatu.
- Nie otwieraj wcześniejszego rozwiązania.

### Karta zmiany `--min-total N` — po pisemnym przeglądzie

Podejmij zmianę po pisemnej samoocenie lub zewnętrznym przeglądzie
pierwszej pracy. Wymaganie jest publiczne. Zapisz, czy było wcześniej
widoczne, używając `nie pokazano przed wydaniem`, `pokazano wcześniej`
albo `nie wiadomo`.

Dodaj opcjonalny argument `--min-total N`. Filtruj tylko wypisywane
sumy końcowe. Zostaw nazwy, których suma wynosi co najmniej `N`.
Dotychczasowe wywołanie bez opcji dalej działa. Zachowaj zasady
parsowania, komunikaty i kody zakończenia. Dodaj własne testy i
wyjaśnij, która część kontraktu programu się zmieniła.

## Zapis obserwacji i kryteria oceny

Utwórz jeden zapis na zadanie. To wzór dla prowadzącego. Schemat produktu
i automatyczne zdarzenia dowodowe mają osobną specyfikację. Nieznane
wartości oznacz `not observed`.

### Wymagane dane identyfikacyjne i czasowe

Zapisz kod uczestnika, datę sesji i obserwatora, etap sesji, dokładne
zadanie i wersję, rodzaj zadania, status źródła lub materiału, odrębną
wersję źródła lub materiału (commit lub skrót materiału autorskiego, a
gdy ich brak `not observed`), potwierdzenie warunków wstępnych, kontekst
pracy kursanta z Rustem i narzędziami oraz status wcześniejszego kontaktu
z wymaganiem. Używaj dokładnych wersji `S2-MC-v1`, `S2-SB-WORDS-v1`,
`S2-SB-SUFFIX-v1`, `S2-XFER-v1` i `D-XFER-v1`. Zapisuj wersję źródła
lub materiału odrębnie od wersji zadania i statusu źródła lub materiału.

Zapisz minuty aktywnej pracy, minuty przerw, minuty opóźnienia instalacji,
sieci i przeglądarki, minuty innych przerw technicznych, łączny
rzeczywisty czas, ostatni kontakt z pojęciem, rzeczywisty odstęp do
ponownej próby w godzinach, ćwiczenia w międzyczasie i spełnienie
warunku przerwy (`yes (>24h)`, `no`, `unknown`). Nie doliczaj opóźnień
technicznych do aktywnego czasu.

### Wymagane dane o pracy i dowodach

Zapisz kod lub artefakt z próby, autorski materiał wyjściowy, pierwsze
przewidywanie, błędy i sposób wyjścia z nich, dodatkowe wskazówki,
sprawdzanie dokumentacji lub API, użycie pełnego rozwiązania, kryteria,
wyjaśnienie kursanta i to, co faktycznie widział obserwator. Oznacz
każde kryterium osobno jako `met`, `not met` lub `not observed`.
Niewyjaśnione pojęcia zapisuj osobno od błędów kompilatora. W przypadku
samodzielnych prac kursanta oddziel architekturę, typy, nazwy, testy i
uzasadnienie od stałych przypadków przeglądarkowych i deklaracji kursanta.

### Pięć kategorii wyniku

Wybierz jedną główną kategorię.

1. **Samodzielne wykonanie (`help-free success`)** — wszystkie kryteria spełnione bez wskazówek, sprawdzania dokumentacji lub API, pomocy obserwatora i ujawnienia rozwiązania.
2. **Wykonanie z dokumentacją (`success with documentation`)** — kryteria spełnione przy samodzielnie podjętym sprawdzeniu dokumentacji lub API, bez pomocy obserwatora i pokazania pełnego rozwiązania.
3. **Wykonanie ze wskazówkami (`guided success`)** — kryteria spełnione po wskazówce dotyczącej pojęcia lub kodu, skierowaniu przez obserwatora, ujawnieniu oczekiwanej decyzji albo pokazaniu rozwiązania. Wyjściowe API, treść metody i szkielet nadal stanowią materiał zadania.
4. **Nieukończona próba (`incomplete attempt`)** — kursant przerwał albo nie zdążył spełnić kryteriów przed zakończeniem zadania przez przerwę techniczną.
5. **Przerwa techniczna (`infrastructure interruption`)** — problem z narzędziami, instalacją, siecią, przeglądarką, uruchamianiem kodu lub innym elementem środowiska uniemożliwił rzetelną próbę. Zapisz osobno pracę częściową.

Jeśli przerwa techniczna pozostawiła nieukończoną próbę, zapisz
`infrastructure interruption` jako główną kategorię i dodaj informację
o nieukończeniu. Zachowaj oddzielne obserwacje zamiast sprowadzać je do
procentu ukończenia.

### Szczegółowe kryteria

W sesji 1 oznacz osobno rozumienie nieznanej funkcji, wpływ wyrażenia lub
średnika, przewidywanie przypadku granicznego przed uruchomieniem,
reakcję na jedno zadanie naprawcze oparte na komunikacie kompilatora
oraz rozdzielenie aktywnej pracy i opóźnień technicznych.

W zadaniu z programem do opłat za paczki oznacz osobno wagi
`0, 1, 5, 6, 20, 21`, wyjaśnienie reprezentacji nieprawidłowego wyniku,
co najmniej dwa sensowne testy, pokrycie granicy `5/6` i niepoprawnego
przypadku, rzeczywisty błąd testu z późniejszym przywróceniem poprawnej
wartości, faktyczne wyniki lokalnych poleceń oraz samodzielnie napisany
kod i obmyśloną architekturę odrębne od stałych przypadków testowych.
Przy braku Cargo zapisz `not observed — toolchain unavailable`.

W sesji 2 oznacz osobno przewidywanie `S2-MC-v1`, odróżnienie
przeniesionego `String` od liczby całkowitej z `Copy`, naprawę
`S2-SB-WORDS-v1` lub `S2-SB-SUFFIX-v1`, wyjaśnienie własności prostym
językiem, wyniki true i false z `S2-XFER-v1`, granicę funkcji i ponowne
użycie tytułu u wywołującego oraz osobny zapis pomocy i niewyjaśnionych
pojęć.

Dla `D-XFER-v1` oznacz osobno rzeczywisty odstęp i status warunku
sprawdzenia po przerwie (`quiet interval: yes (>24h)` albo
`quiet interval: no — repeated practice`), wymagane wyniki sprawdzenia
prefiksu, użycie posiadanego `String` i literału wraz z ponownym użyciem
komunikatu u wywołującego, brak ponownego otwarcia starego rozwiązania,
nowe wyjaśnienie w dziedzinie powiadomień i ćwiczenia w międzyczasie.
Główny wynik zachowaj w jednej z pięciu kategorii.

Dla miejsca w lekcji z pakietu 005 zapisz dokładne ID lekcji i
`afterStepId`, czy notatka się pojawiła, wznowienie bieżącego zadania
z istniejącego autozapisu i brak automatycznego ukończenia, pominięcia
lub przyznania dowodu. Przy niedostępnych miejscach na przerwę zapisz
`not available`.

Dla Study Session CLI oznacz osobno samodzielnie utworzony lokalny
projekt Cargo, poprawne podsumowanie i sortowanie z kodem 0,
niepoprawny rekord zgłoszony z numerem wiersza i przetwarzanie dalszych
poprawnych rekordów z kodem 2, niepoprawne argumenty, I/O i UTF-8 na
stderr z kodem 1 i bez raportu, usuwanie skrajnych białych znaków,
Unicode i ASCII `0–9` (w tym odrzucanie `+5`, `-5` i cyfr spoza
ASCII), CRLF i przepełnienie, jedno wyjaśnienie własności lub struktury
danych i kategorię przeglądu (udokumentowana samoocena, przegląd
zewnętrzny lub brak obserwacji).

Dla `--min-total N` oznacz osobno pierwsze przekazanie pracy przed
ujawnieniem wymagania, filtrowanie tylko sum końcowych, zgodność
parsowania, komunikatów, kodów zakończenia i starego wywołania, testy
kursanta i objaśnienie granicy zmiany oraz wcześniejszy kontakt z
wymaganiem (`yes`, `no`, `unknown`).

### Notatka obserwatora o dalszych działaniach

Zapisz konkretne przykłady według wzoru.

```text
Barrier or recurring failure observed:
Evidence the learner could identify the next action:
Undisclosed prerequisite or unexplained term:
One corrective change proposed for the next iteration (maximum two):
What remains not observed or dependency-blocked:
```

Zapis obejmuje obserwację pracy. Pomiń dane kontaktowe, niezwiązane dane
osobowe, uniwersalny próg czasowy, sam procent ukończenia oraz tezy o
opanowaniu materiału przez populację, wpływie przyczynowym na trwałość
wiedzy i gotowości produkcyjnej.

<hr>

## Klucz odpowiedzi tylko dla prowadzącego — wersja robocza, nie udostępniać kursantowi

Ta część jest kontrolowanym materiałem dla prowadzącego. Zawiera
oczekiwane zachowanie i kryteria o określonym zakresie. Nie pokazuj jej
jako odpowiedzi kursanta i nie używaj, by uznać wymaganie za wcześniej
niewidziane. Sprawdzenia oprogramowania dokumentują zachowanie kodu.

### Pomoc i wcześniejszy kontakt z treścią

Publiczny kontrakt, kod `move-copy-discovery`, podane API i treści metod
oraz szkielet są autorskim materiałem wyjściowym. Same w sobie nie
stanowią dodatkowej pomocy i nie zmieniają oceny na wykonanie ze
wskazówkami. Zapisuj osobno wskazówki pojęciowe i dotyczące kodu,
pokierowanie przez obserwatora, sprawdzanie API, ujawnienie oczekiwanej
decyzji i pokazanie rozwiązania. Wcześniejszy kontakt zapisuj jako
`not shown before release`, `shown previously` lub `unknown`.

### `S2-MC-v1`

`text` ma typ `String`. Jego wartość jest przenoszona do `text_next`,
więc nie można później użyć pierwotnego `text`. `number` jest liczbą
całkowitą (`i32` w podanym kodzie) i implementuje `Copy`. Zarówno
pierwotne `number`, jak i `number_next` są nadal dostępne. Poprawna
odpowiedź to **tylko pierwotne wiązanie liczby całkowitej**, wraz z
wyjaśnieniem przeniesienia i niejawnego kopiowania. Przykładowy program
celowo ujawnia problem użycia pierwotnego `text` po przeniesieniu.
`text_next` jest nowym wiązaniem poza zakresem pytania o późniejsze
użycie. Zapisz wyjaśnienie kursanta obok komunikatu kompilatora.

Kryteria akceptacji obejmują przewidywanie przed uruchomieniem,
odróżnienie przeniesionego `String` od liczby z `Copy` oraz wskazanie
przez kursanta, które wiązanie można nadal użyć i dlaczego.

### `S2-SB-WORDS-v1` i `S2-SB-SUFFIX-v1`

Po uzgodnieniu użyj dokładnych kontraktów z bieżących źródeł.
`S2-SB-WORDS-v1` podaje `text.split_whitespace().count()` i zachowuje
możliwość ponownego użycia należącego do wywołującego `String`.
`S2-SB-SUFFIX-v1` podaje `text.ends_with(suffix)`, pozostawia oba
wejścia widokami tylko do odczytu i pozwala wywołującemu ponownie użyć
`text` i `suffix`. Zaakceptuj naprawę granicy współdzielonego
pożyczenia, jeśli zachowuje autorskie zachowanie zewnętrzne. W miejscu
wymagającym widoku tylko do odczytu parametr nie przejmuje własności.
Funkcja zachowuje białe znaki i wielkość liter, a wywołujący może
ponownie użyć wejścia. Podana treść metody należy do materiału
wyjściowego.

### `S2-XFER-v1`

`String::from("INC-42: parser")` z `"parser"` musi dać `true`, a ten
sam tytuł z `"cli"` musi dać `false`. Wywołujący ponownie używa i
wypisuje posiadany tytuł po obu wywołaniach. Co najmniej jeden argument
fragmentu jest literałem. Dopasowanie rozróżnia wielkość liter i nie
usuwa skrajnych białych znaków, nie normalizuje ani nie modyfikuje
tekstu. Zaakceptuj dowolną nazwę, sygnaturę, podział kodu i wybór
`String`/`&str` spełniające kontrakt i poparte wyjaśnieniem. Sprawdzanie
API i dodatkowe wskazówki zapisz osobno.

### `D-XFER-v1`

Udostępnij po odstępie ściśle `>24h`. Dokładnie 24:00 lub mniej to
`quiet interval: no — repeated practice`, a główny wynik nadal należy
do jednej z pięciu kategorii. Posiadany komunikat `"Przerwa: Rust"` z
`"Przerwa"` ma dać `true`, a literał `"Status: gotowe"` z prefiksem
`"status"` pisanym małą literą ma dać `false`. Wywołujący używa obu
postaci i może ponownie użyć posiadanego komunikatu. Sprawdzanie
prefiksu rozróżnia wielkość liter i zachowuje białe znaki oraz postać
tekstu. Zaakceptuj każdą nazwę i sygnaturę spełniające kontrakt i
osobno zapisz pomoc. Klucz pozostawia kursantowi wybór sygnatury i
algorytmu oraz obejmuje wyłącznie opisane zachowanie.

## Historyczna wersja robocza i późniejsza weryfikacja programów

Zaakceptowany klucz i materiały obserwacyjne R4 poprawnie opisywały
kontrolowane fragmenty jako **materiał roboczy, którego nie uruchamiano
podczas przygotowania**. Późniejszy raport z ograniczonej weryfikacji
dokumentuje zachowanie autorskich fragmentów kodu. Oba zapisy mają
własny zakres czasowy. Podczas opracowania kodu nie wykonywano. W
późniejszym etapie wykonano ograniczony test autorskich przykładów.
Obserwacja wyniku kursanta wymaga osobnej sesji.

Według zaakceptowanego raportu kod `S2-MC` pobrano bez zmian i
skompilowano Rustem 1.99.0 i 1.85.0. Obie celowe próby użycia
pierwotnego `text` zakończyły się kodem `1` i diagnostyką `E0382`.
Stdout był pusty. Tymczasowy przypadek weryfikacyjny wyłącznie z liczbą
całkowitą skompilował się i zakończył kodem `0` i stdout `7 7\n`.
Tymczasowe funkcje pomocnicze `&str` do weryfikacji `S2-XFER` i `D-XFER`
skompilowały się i zwróciły kod `0` dla podanych przypadków granicznych.
Wynik `D-XFER` to `true false Przerwa: Rust\n`, a wynik `S2-XFER` to
`true false INC-42: parser\n`. Raport zachował dane poleceń w JSON,
stdout, stderr, liczbowe kody zakończenia, wersje kompilatora i
tożsamość stanu przed i po weryfikacji.

Weryfikacja pokazuje zachowanie autorskiego kodu w badanych przypadkach,
w tym wielkość liter i białe znaki. Sukces kursanta, wynik nauki,
trwałość wiedzy, użycie umiejętności w nowych zadaniach, odstęp po
przerwie, skuteczność, mechanizm oceniania, nowa rodzina zadań,
dopuszczenie stanu źródeł i bieżąca integracja wymagają odrębnych
działań i danych. Nie powtarzaj tej kampanii Rusta, nie dodawaj
automatycznego oceniania, nie wykonuj dowolnego kodu kursanta i nie
zaliczaj diagnostyki jako obserwacji nauki.

## Zakres gotowości materiałów i warunki przyszłej akceptacji

Gotowość materiałów obejmuje ten protokół, polskie karty, kryteria
i zadanie po przerwie z rzetelnym oznaczeniem zależności. Implementacja
miejsc na przerwę w pakiecie 005, obserwacja pracy kursanta z pakietem
004, wykonanie Cargo przez kursanta i sesje z uczestnikami wymagają
odrębnej weryfikacji. Dopiero obserwacja pozwala podać wyniki dotyczące
czasu, użycia wiedzy w nowym zadaniu, trwałości wiedzy, skuteczności i
opanowania materiału. Gotowość produkcyjna ma własne warunki.

Przyszły raport z zaobserwowanego pilotażu może podać faktyczną liczbę
i doświadczenie uczestników, zadania, otrzymaną pomoc, poprawność,
wyjaśnienia, aktywne minuty i faktyczny odstęp. Wskaż konkretne
powtarzające się trudności i najwyżej dwie zmiany korygujące.
Porównawcza skuteczność, opanowanie materiału przez populację i
przyczynowa poprawa trwałości wiedzy wykraczają poza tę obserwację.
Protokół nie definiuje procentowego progu zaliczenia. Dotyczy
przygotowania materiałów. Wyniki nauki, udział i rekrutacja
uczestników, wiadomości, harmonogram, wykonawca sesji, przesyłanie
danych, analityka i skuteczność podlegają osobnym działaniom.
