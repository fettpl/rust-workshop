# Podstawy własności — kontrakty zastosowania wiedzy

[English](ownership-foundation-transfer-evidence.md)

Lekcja `ownership-foundation-transfer` następuje po pełnej
historycznej sekwencji Modelowania danych, w tym po zagnieżdżonych
wzorcach. Sześć kroków łączy uzupełniające przewidywanie z pięcioma
głównymi kontraktami programistycznymi. Zachowano identyfikatory
lekcji i kroków, nawigację Core17, kryteria modułu i globalną
regułę dwóch rodzin.

| Pojęcie | Dodana główna rodzina | Liczba rodzin w materiale po zmianie |
| --- | --- | --- |
| `ownership-repair` | `ownership/restore-after-rejection-v1` | 2 |
| `scope-drop` | `ownership/nested-drop-timeline-v1`, `ownership/conditional-drop-return-v1` | 2 |
| `copy-semantics` | `ownership/copy-counter-v1`, `ownership/copy-array-snapshot-v1` | 2 |
| `stack-heap` | Zakres pojęciowy | 0 |

Dostępność zadania opisuje materiał. Samodzielne zaliczenie
wymaga pracy kursanta. Pokazanie treści, import zapisów, wskazówki,
odsłonięcie, powtarzane aliasy i pobrania nie przyznają niezależnego
zaliczenia programistycznego. Dawne zdarzenia zachowują
identyfikatory, znaczniki czasu i historię pomocy. Sprawdzenie
wiedzy po przerwie i wynik nauki wymagają osobnych zdarzeń.

## Konkretne kontrakty

`accept_label(&mut Option<String>, bool) -> Result<(), &'static str>`
przy `None` zachowuje stan i zwraca `Err("missing")`. Odrzucenie
obecnej wartości zwraca `Err("rejected")` i zachowuje dokładnie
oryginalny ciąg, w tym ciąg pusty, Unicode i białe znaki. Przyjęcie
zwraca `Ok(())` i dopisuje z przodu dokładnie `accepted:` do
bieżącej wartości. Kolejne wywołania używają bieżącej zawartości
pola. Poprawne są zarówno wyjęcie i przywrócenie wartości, jak i
zmiana w miejscu. Ocena nie zależy od zapisu kodu, kopiowania
przez clone i strategii alokacji.

Zadania o Drop dostarczają bezpieczne `support::DropLog` i
`support::Marker::new(label, log)`. Dziennik udostępnia licznik
tylko do odczytu i migawki zdarzeń na własność. Wyłącznie zaufana
implementacja znacznika zapisuje swój Drop. Kursant używa
konkretnych posiadanych wartości i zakresów bez implementacji
`Drop`, mutowalności wewnętrznej i mechanizmów generycznych.
Wywołanie na świeżych danych z zagnieżdżonymi zakresami zwraca
punkty obserwacji `(1, 2)` i pozostawia zdarzenia
`["inner", "outer"]`. Wariant warunkowy dla błędu zwraca
`Err("failed")` i pozostawia tylko zdarzenie zewnętrzne.
Przy sukcesie zwraca `Ok(2)` i zapisuje zdarzenie wewnętrzne
przed zewnętrznym. Poprawne niejawne sprzątanie i inne
implementacje o równoważnym obserwowalnym zachowaniu są akceptowane.

`bump_and_keep(u32) -> (u32, u32)` zwraca pierwotną wartość i
wynik zwiększenia z nasyceniem, także dla `u32::MAX`.
`flip_first([bool; 3])` zwraca niezmienioną migawkę i drugą
tablicę z odwróconym wyłącznie pierwszym elementem. Kontrakt
obejmuje wszystkie osiem danych wejściowych. Przypadki pokazują
działanie Copy. Fizyczne położenie na stosie lub stercie i głębokie
klonowanie wykraczają poza ich zakres.

Dostarczony model wprowadza prostą konwencję `Ok(())`/`Err(...)`
i nieprzezroczyste API znaczników. Pięć głównych funkcji
implementuje samodzielnie kursant.

## Zgodność i granice sesji

Najnowsza projekcja usuwa jedynie nową lekcję i jej ID oraz
dokładnie zadeklarowane opcjonalne przerwy. Potem składa istniejącą
projekcję MutSlot i wcześniejsze projekcje. Stan bazowy zapisano
przed opracowaniem zmiany. Oczekiwanych historycznych migawek nie
generuje się ponownie z następcy. Drobne zmiany starej treści
pozostają wykrywalne. Kontrakty stanu nadal obejmują zapisane szkice,
notatki, zakładki, pomoc, surową historię V1/V2/V3 i dokładne
wcześniejsze i nowe pozycje wznowienia.

| Dotychczasowa lekcja Cargo | Opcjonalna przerwa po |
| --- | --- |
| `module-tree-paths` | `paths-transfer` |
| `module-visibility` | `visibility-transfer` |
| `imports-and-reexports` | `imports-transfer` |
| `cargo-package-integration` | `cargo-modify`, przed `cargo-blank` |

Nowa lekcja umożliwia także przerwę po przywróceniu własności,
przed Drop i Copy. Podany czas pozostaje szacunkiem, a badanie
czasu ukończenia wymaga odrębnej obserwacji.

## Zakres weryfikacji

Testy utrzymaniowe kompilują wyłącznie stałe przypadki autorskie
repozytorium. Implementacja kanoniczna i poprawne alternatywy
muszą przejść. Szkielety i kompilujące się mutanty semantyczne
muszą odpaść w przypisanych testach kontraktu. Przypadki
kompilatora E0382, E0515 i E0040 mają dopasowane przypadki
pozytywne i są różne od testów zachowania. Testy natywne pomijają
autorskie przypadki niezdefiniowanego zachowania i dowolny kod
kursanta lub kod zaimportowany.

Nowe testy natywne wybierają wyłącznie `stable` (domyślnie) albo
dokładnie `1.85.0` przez `RUST_WORKSHOP_FOUNDATION_TOOLCHAIN` i
uruchamiają wskazany zestaw narzędzi Rustup. Zwykłe testy jednostkowe
używają wersji stabilnej. Dotychczasowe zadanie MSRV jawnie uruchamia
oba nowe zestawy w 1.85.0. Brak narzędzi i awarie środowiska mają
status błędu, odrębny od semantycznego odrzucenia i pominięcia.
Pełna weryfikacja natywna z rejestratorem nadal wymaga danych
opisanych w [dowodach zainicjalizowanego prefiksu](initialized-prefix-evidence.pl.md).

Testy przeglądarkowe i offline z rozgrzaną pamięcią podręczną
obejmują rzeczywisty edytor, pomoc, notatki i szkice, dokładne
wznowienie, opcjonalne przerwy, klawiaturę i wąski układ.
Kontrolowane odpowiedzi wykonania sprawdzają interfejs i stan.
Przypadki kompilatora sprawdzają zadeklarowane kontrakty Rusta.
Lokalna weryfikacja, hostowane CI PR i main, integracja, publikacja
i zaobserwowana praca kursanta mają odrębne dowody.
