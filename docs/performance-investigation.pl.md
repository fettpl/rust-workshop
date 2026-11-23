# Analiza wydajności

[English](performance-investigation.md)

Opcjonalna lekcja `performance-evidence-investigation` następuje po
czterech dotychczasowych lekcjach Performance Evidence. Korzysta
z istniejącego pojęcia i kompetencji. Nie dodaje warunku zaliczenia,
rodziny zadań, przypadku do powtórek ani głównego zaliczenia kodu.
W sześciu krokach kursant przewiduje wynik, wybiera narzędzie,
sprawdza przykład referencyjny i statyczny model, przygotowuje własny
pakiet analizy i odtwarza wiedzę w tej samej sesji. Wykonanie Cargo
i pomiar wydajności należą do odrębnych prób.

## Projekt do pobrania

Archiwa startowe i rozwiązania Log Analyzer zawierają niewypełniony
polski arkusz `A7-INVESTIGATION.md`, próbę odtworzenia na sześciu
rekordach, manifest z informacjami o treści i stałe przypadki do
testów utrzymaniowych. Arkusz prosi o inne obciążenie i inną
selektywność filtra, falsyfikowalną hipotezę, niezależną wyrocznię,
kontrprzykład, alternatywy, odpowiedź na przegląd i decyzję
z określonym zakresem. Kursant wybiera implementację i przeprowadza
własne doświadczenia w swoim środowisku. Lokalne wykonanie
pobranego projektu i ocena całej architektury odbywają się poza
aplikacją. Wypełniony arkusz sam nie daje samodzielnego zaliczenia.

Autorskie obciążenie referencyjne obejmuje 2048 rekordów. Dokładne
oczekiwane liczby to 1171 INFO, 588 WARN, 196 ERROR i 93 niepoprawne
rekordy. Filtr ERROR zachowuje 196 błędów i 93 niepoprawne rekordy.
Próba odtworzenia rozróżnia brak filtra i obsługę wadliwych wierszy.
Przed pomiarem obie implementacje sprawdza się względem niezależnych,
dokładnych oczekiwań.

## Weryfikacja utrzymaniowa

Wersja referencyjna i kształt zapisywanych danych należą do
kontraktu utrzymaniowego. [API Criterion 0.5.1](https://docs.rs/criterion/0.5.1/criterion/)

Po przygotowaniu pamięci podręcznej przypiętych zależności
Criterion 0.5.1 dotychczasowym weryfikatorem wydajności uruchom
poniższe polecenia.

```sh
npm run content:performance -- --a7
npm run content:performance -- --a7 --msrv
```

Drugie polecenie wymaga dokładnie Rust 1.85.0. Tryby A7 mają
zamkniętą konfigurację. Akceptują wyłącznie utrzymywane rozwiązanie
Log Analyzer z przypiętymi zależnościami i bez dostępu do sieci.
Nie przyjmują innego kodu, ścieżki, zależności, wyjścia ani zestawu
narzędzi. Pierwotne `--fetch` i `--msrv` zachowują znaczenie.
Pobranie przygotowuje zależności, a zachowanie sprawdzają testy.

Tryby A7 jawnie budują środowisko procesu potomnego. Pomijają
odziedziczone flagi kompilatora, skrypty pośredniczące, konfigurację
i ustawienia nadpisujące cel. Wskazują własne zainstalowane narzędzia
i świeże katalogi wyników. `HOME` zachowuje prawdziwą wartość.
`CARGO_HOME` i `RUSTUP_HOME` wybierają istniejące kanoniczne
katalogi lokalne, domyślnie w zwykłych miejscach pod `HOME`.
Dopuszczalna konfiguracja Cargo jest pusta albo zawiera wyłącznie
ustalone ustawienie pracy offline. Dodatkowa konfiguracja w
katalogach nadrzędnych powoduje odrzucenie. Raporty wskazują użyte
pliki wykonywalne rustup i kompilatora, skróty konfiguracji,
zaakceptowane katalogi i nazwy pominiętych nadpisań. Zapis
identyfikuje uruchomione narzędzia. Uwierzytelnienie ich wydawcy
wymaga osobnej kontroli. Tryby korzystają z zainstalowanych narzędzi
i zależności.

Każde uruchomienie ma własny nowy katalog wyników Criterion.
Zachowuje surowe wyjście poleceń, skróty archiwum i źródeł,
tożsamość narzędzi i dwa dokładne identyfikatory benchmarków.

- `log_analyzer_a7/baseline/filtered-mixed-2048-v1`
- `log_analyzer_a7/candidate/filtered-mixed-2048-v1`

Parametry techniczne Criterion to 30 próbek, sekunda rozgrzewki,
trzy sekundy pomiaru, metadane przepustowości w bajtach i
`iter_batched_ref`. Przygotowanie danych i ich zwalnianie odbywa
się poza mierzonym domknięciem. Pomiar obejmuje wykonanie parsera i
zbieranie wyników partii. Porównanie wykorzystuje średnią liczbę
nanosekund na iterację i przedziały ufności 95%.

| Obserwacja | Interpretacja |
| --- | --- |
| Górna granica kandydata poniżej dolnej granicy wersji bazowej | Pomiar wskazuje krótszy czas dla tego obciążenia |
| Dolna granica kandydata powyżej górnej granicy wersji bazowej | Pomiar wskazuje dłuższy czas dla tego obciążenia |
| Przedziały się pokrywają lub stykają | Brak rozstrzygnięcia |

Prawidłowa weryfikacja jest możliwa także przy braku przyspieszenia.
Decyzja `keep` wymaga potwierdzonej poprawności, pełnego świeżego
pomiaru, oczekiwanego odrzucenia kontroli negatywnej i rozłącznych
przedziałów wskazujących krótszy czas. Dłuższy czas wymaga analizy,
a nakładanie przedziałów pozostaje nierozstrzygające. Inne obciążenie,
maszyna, kompilator lub implementacja wymagają własnego pomiaru.

Mutant ignorujący filtr wywołuje produkcyjne `analyze_reader` z `None`
dla stałych danych próby. `expected-rejection` wymaga kodu 0 kompilacji,
a potem kodu 101 testu `a7_filter_ignored_v1_named_oracle`, jego
znacznika i oczekiwanej różnicy w asercji podsumowania. Inny kod
niezerowy, brak narzędzia, przekroczenie czasu i sygnał mają odrębną
klasyfikację.

Zewnętrzne raporty `rust-workshop.a7-performance.v2` rozróżniają
kompletność, poprawność, porównanie, decyzję i stan mutanta. Omawiane
artefakty zachowuje się w unikatowym katalogu uruchomienia pod
`test-results/performance-a7/`. Manifest treści i pusty arkusz nie
zawierają obserwacji. Publiczne CLI działa bez prywatnych potwierdzeń
dopuszczenia i historii Git.
