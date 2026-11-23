# Ewolucja schematu pliku

[English](file-schema-evolution.md)

To opcjonalne rozszerzenie po Todo I/O rozdziela trzy operacje. Odczyt
obsługiwanego pliku, sprowadzenie danych do wspólnego modelu i jawna
aktualizacja formatu na dysku mają odrębne kontrakty. Ćwiczenie z normalizacji
w przeglądarce używa zdekodowanych i zweryfikowanych wartości. Pakiet
natywny `file-schema-evolution-workshop` zawiera właściwy koder i dekoder oraz
obsługę systemu plików. Korzysta ze standardowej biblioteki Rusta, edycji 2024 i
MSRV 1.85.0. Dotychczasowe projekty Todo V1 i SQLite zachowują własne kontrakty.

## Gramatyka pliku i normalizacja

W przykładach tabulator i znak nowego wiersza zapisano jako `\t` i `\n`.
Pliki zawierają odpowiadające im bajty. Nagłówek i każdy rekord kończą się
znakiem LF. Sam nagłówek oznacza pustą listę.

| Wersja | Nagłówek | Rekord |
| --- | --- | --- |
| V1 | `RUST_TODO_V1\n` | `STATUS\tTITLE\n` |
| V2 | `RUST_TODO_V2\tNEXT\n` | `ID\tSTATUS\tTITLE\n` |

Plik używa UTF-8 bez początkowego BOM i bez zakończeń wierszy CR lub CRLF.
`STATUS` ma wartość `0` albo `1`. Tytuł po usunięciu skrajnych białych znaków
musi być niepusty. Może zawierać tabulatory, ale nie CR ani LF. Parser
zachowuje oryginalne białe znaki i znaki Unicode. Dzieli wiersze V1 przy
pierwszym tabulatorze, a wiersze V2 przy dwóch pierwszych. Identyfikatory i
numeryczny `NEXT` są dodatnimi wartościami `u64` w kanonicznym zapisie
dziesiętnym. Identyfikatory muszą być unikatowe, a numeryczny `NEXT` większy
od każdego widocznego identyfikatora. Osobny token `-` oznacza wyczerpanie
puli identyfikatorów, także po usunięciu rekordu o maksymalnym ID.

`decode` sprawdza bajty i zwraca `Decoded::Legacy` lub `Decoded::Current`.
Kolejność zgłaszania błędów to UTF-8, nagłówek z tokenem `NEXT`, a potem
końcowy LF. Brak znaku kończącego wiersz nagłówka daje `InvalidHeader`.
Sam kanoniczny nagłówek w wersji 3 lub wyższej powoduje `UnsupportedVersion`
przed kontrolą zawartości. Zły kształt nagłówka i przepełnienie numeru
wersji dają `InvalidHeader`. Nieprawidłowy `NEXT` w nagłówku o poprawnym
kształcie V2 daje `InvalidNextId`. Z zawartości pliku zgłaszany jest błąd
pierwszego niepoprawnego wiersza w kolejności zapisu. W V2 parser sprawdza
kolejno kształt wiersza, identyfikator, status i tytuł. Po wczytaniu wszystkich
wierszy parser sprawdza powtórzenia ID w kolejności wejściowej, a następnie
porównuje `NEXT` z zapisanymi identyfikatorami.

`normalize` przypisuje identyfikatory V1 według pozycji wierszy od 1 i
ustawia `NEXT` na następny wolny identyfikator. Zachowuje kolejność, stan
ukończenia i dokładną treść tytułów, także w powtarzających się rekordach.
Dla V2 zachowuje zweryfikowane ID, kolejność i zapisany `NEXT`. `load` łączy
`decode` i `normalize`. Wartość `Loaded` przechowuje wejściową wersję
`Version` i udostępnia bieżący model `Todo` przez `todo` lub `into_todo`.
`encode_current` serializuje model w formacie V2. Usunięcie wpisu zachowuje
pozostałe rekordy i stan przydziału identyfikatorów. Dodanie rekordu przy
`NEXT = u64::MAX` przydziela tę wartość raz i wyczerpuje pulę. Nieprawidłowy
tytuł lub wyczerpana pula pozostawia model bez zmian.

## Jawne zastąpienie pliku

`load` i `prepare_upgrade` działają na bajtach bez dostępu do systemu
plików. `prepare_upgrade` zwraca `AlreadyCurrent` dopiero po pełnym
sprawdzeniu V2. Dla V1 zwraca `PreparedUpgrade` z dokładnymi bajtami
oryginału i pliku zastępczego w polach prywatnych. `upgrade_file` odczytuje
i sprawdza plik pod podaną ścieżką przed podjęciem decyzji o zastosowaniu
planu. Dla brakującego pliku zwraca błąd odczytu, a zweryfikowane pliki V2
pozostawia bez zmian.

`apply_prepared` zużywa plan, ponownie odczytuje plik docelowy i porównuje
jego bajty z oryginałem. Różnica daje `SourceChanged` przed utworzeniem
pliku tymczasowego. Nazwa pliku tymczasowego to pełna nazwa docelowa z
dopisanym `.upgrade-tmp`. Wyłączne tworzenie chroni istniejący plik
tymczasowy, katalog lub dowiązanie symboliczne. Aktualizacja zapisuje i
synchronizuje plik tymczasowy, zamyka go, a następnie zastępuje nim cel za
pomocą operacji zmiany nazwy. Po błędzie próbuje usunąć wyłącznie plik
tymczasowy utworzony w tym wywołaniu. `UpgradeError` zachowuje pierwotny
błąd I/O oraz etap operacji (`Read`, `CreateStage`, `WriteStage`,
`SyncStage` lub `Rename`).

Udana zmiana nazwy zatwierdza aktualizację. Biblioteka nie wykonuje
później żadnych operacji I/O. Program przykładowy może jeszcze zgłosić
błąd zapisu na standardowe wyjście po zatwierdzeniu aktualizacji.
Porównanie bajtów wykrywa zmianę, która już zaszła. Kontrakt zakłada
zaufane ścieżki i pojedynczego zapisującego. Nie zapewnia operacji
compare-and-swap, synchronizacji katalogu nadrzędnego, trwałości po
utracie zasilania, transakcji z wieloma zapisującymi ani ogólnej gwarancji
bezpieczeństwa ścieżek i działania na każdej platformie. Sprawdź jawne
zastępowanie na kopii pliku testowego przeznaczonej do usunięcia.

## Lekcje i dowody z pakietu

`file-schema-normalization` ma jedną główną rodzinę zadań
`file-schema-evolution/normalize-v1`. Zastosowanie i zadanie od zera to dwa
sposoby wejścia do tej samej rodziny. Zwykła powtórka utrwala tę samą operację
na innych danych i nie daje głównego zaliczenia. Wcześniejsza pomoc
jest przypisana do całej rodziny pod każdym z jej aliasów, w tym po
odsłonięciu rozwiązania w zwykłej powtórce. Wcześniejsze zdarzenie wykonane
samodzielnie pozostaje w historii. Lekcja o aktualizacji jest ćwiczeniem
bez dodatkowego zadania warunkującego zaliczenie. Pobranie rozwiązania
odnotowuje w istniejącym mechanizmie odsłonięcia obu wersji zadania. Pakiet
startowy nie ma odwołań powodujących odsłonięcie. Obserwacje w przeglądarce
obejmują dostęp do kodu źródłowego i zapisany stan. Pakiet natywny weryfikuje
rzeczywiste zachowanie systemu plików na przygotowanych danych testowych.

Każde archiwum zawiera dziewięć plików autorskich i cztery istniejące noty.
Wersja startowa zostawia `normalize` do uzupełnienia, a rozwiązanie zawiera
jej implementację. Pakiet jest dostarczany bez `Cargo.lock`. Uruchom poniższe
polecenia w katalogu rozpakowanego pakietu z zainstalowanym zestawem
narzędzi Rusta. Wybierz wydanie stabilne lub dokładnie 1.85.0 zgodnie ze
zweryfikowaną lokalną konfiguracją.

```sh
cargo generate-lockfile --offline
cargo test --offline --locked
cargo test --offline --locked --release
cargo run --offline --locked --example upgrade -- path/to/disposable-copy.txt
```

Dla planowanego weryfikatora repozytorium użyj dopuszczonego środowiska
lokalnego z zainstalowanymi narzędziami i stałymi danymi testowymi repozytorium.

```sh
npm run content:file-schema-evolution -- --mode stable
npm run content:file-schema-evolution -- --mode msrv
```

Plan weryfikatora obejmuje kontrolę, czy wygenerowany plik blokady
pozostaje bez zmian, porównanie pełnego zamkniętego zestawu plików
archiwów i uruchomienie nazwanych przypadków pozytywnych oraz
równoważnych w obu profilach. Odrzucenie semantyczne klasyfikuje się
dopiero po udanej kompilacji. Trzy próby zewnętrznego klienta dotyczą
prywatnych pól `Todo`, prywatnego ID w `Entry` i prywatnych bajtów w
`PreparedUpgrade`. Próby kontrolne używają metod dostępu oraz celowo
rozluźnionej widoczności. Mechanizm uruchamiania kodu kursanta w aplikacji
działa odrębnie od lokalnej weryfikacji utrzymaniowej.

## Wykaz weryfikacji natywnej

Pakiet obejmuje 14 nazwanych testów.

- `legacy_upgrade_preserves_literal_meaning`
- `current_sparse_identity_and_history_are_preserved`
- `load_and_prepare_never_rewrite`
- `future_and_corrupt_files_are_read_only`
- `current_upgrade_is_validated_noop`
- `explicit_upgrade_writes_exact_current_bytes`
- `prepared_source_change_refuses_before_stage`
- `stage_collision_preserves_both_files`
- `upgrade::tests::rename_error_cleans_owned_stage`
- `missing_source_is_not_created`
- `delete_then_append_does_not_reuse_identity`
- `max_identifier_allocates_once_then_refuses_atomically`
- `malformed_order_has_stable_first_error`
- `source_error_retains_original_io_cause`

Poniżej wymieniono 15 ustalonych mutantów semantycznych i testy, których
asercje mają je odrzucić.

| ID | Celowa zmiana | Test docelowy |
| --- | --- | --- |
| M01 | Sortuj wiersze V1 według tytułu | `legacy_upgrade_preserves_literal_meaning` |
| M02 | Usuń duplikaty sąsiadujących identycznych wierszy V1 | `legacy_upgrade_preserves_literal_meaning` |
| M03 | Usuń skrajne białe znaki z tytułów V1 | `legacy_upgrade_preserves_literal_meaning` |
| M04 | Odwróć stan ukończenia w V1 | `legacy_upgrade_preserves_literal_meaning` |
| M05 | Zacznij przydzielanie identyfikatorów V1 od 2 | `legacy_upgrade_preserves_literal_meaning` |
| M06 | Zmień numerację istniejących wpisów V2 | `current_sparse_identity_and_history_are_preserved` |
| M07 | Wylicz ponownie `NEXT` dla V2 z widocznych identyfikatorów | `current_sparse_identity_and_history_are_preserved` |
| M08 | Potraktuj nieobsługiwaną wersję jako pusty plik V1 | `future_and_corrupt_files_are_read_only` |
| M09 | Zaakceptuj nagłówek bieżącego formatu bez sprawdzania wierszy | `current_upgrade_is_validated_noop` |
| M10 | Zastąp poprawny plik w bieżącym formacie | `current_upgrade_is_validated_noop` |
| M11 | Pomiń porównanie bajtów wykrywające zmianę pliku źródłowego | `prepared_source_change_refuses_before_stage` |
| M12 | Wyzeruj istniejący plik tymczasowy zamiast wymagać wyłącznego utworzenia | `stage_collision_preserves_both_files` |
| M13 | Zresetuj stan przydziału po usunięciu rekordu o największym ID | `delete_then_append_does_not_reuse_identity` |
| M14 | Zawiń licznik przydziału po `u64::MAX` | `max_identifier_allocates_once_then_refuses_atomically` |
| M15 | Zwiększ licznik przydziału przed sprawdzeniem tytułu dodawanego rekordu | `max_identifier_allocates_once_then_refuses_atomically` |

W stanie prac z 10 listopada 2026 r. archiwum rozwiązania przeszło
wszystkie 14 nazwanych testów w profilach debug i release, zarówno na
stabilnym Ruście, jak i dokładnie 1.85.0. Na stabilnym Ruście wersja
startowa miała trzy przechodzące i 11 oczekiwanych niedokończonych
przypadków w każdym profilu. W ukierunkowanej kontroli profilu debug na
stabilnym Ruście skompilowano 15 mutantów, a każdy odpadł w przypisanym
teście. Obie alternatywne implementacje normalizacji przeszły wszystkie
14 testów. Trzy kategorie prywatności sprawdzono w obu wersjach zestawu
narzędzi. Są to wyniki ukierunkowanej kontroli T1. Pełna macierz
weryfikatora, próby przeglądarkowe i offline oraz ostateczna lokalna
kwalifikacja nadal wymagają osobnych dowodów.

Zakres prac i lokalne kryteria zakończenia określa
[plan 004](../plans/004-file-schema-evolution.pl.md). Kod źródłowy Rusta
i metadane operacyjne są objęte MIT. Polska treść dydaktyczna podlega
CC BY 4.0 zgodnie z [zasadami licencjonowania](licensing.pl.md).
Archiwum korzysta z dotychczasowego zestawu not.
