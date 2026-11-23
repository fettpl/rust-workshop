# Rozłączne zakresy — kontrakt i zakres dowodów

[English](disjoint-range-transfer-evidence.md)

Stan z 2026-10-22. Lokalny kandydat następuje po lokalnych pracach
utrzymaniowych nad testami natywnymi. Akceptacja w GitHub Actions,
integracja PR i kontrole wynikowego main pozostają odroczone
podczas blokady rozliczeń.

## Kontrakt zadania

Istniejąca lekcja `unsafe-miri-disjoint-regions` zachowuje siedem
pierwotnych kroków. Dodaje `disjoint-regions-range-model` i
`disjoint-regions-range-transfer`. Gotowy model wyjaśnia
półotwarte zakresy, kolejność argumentów także przy odwrotnej
kolejności w buforze, puste zakresy i nakładanie. Model służy
wyłącznie pokazaniu zagadnienia. Główne zadanie daje następujące API.

```rust
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError { FirstInvalid, SecondInvalid, Overlap }

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError>;
```

Sprawdź pierwszy zakres, drugi zakres, a na końcu nakładanie.
Zakres jest nieprawidłowy, gdy `start > end` lub
`end > buffer.len()`. Nakładanie wymaga dwóch niepustych zakresów
ze wspólnymi elementami. `2..2` wewnątrz `0..4` jest poprawny.
Puste wyniki mają długość zero i dowolną tożsamość wskaźnika.
Niepuste wyniki zachowują dokładną tożsamość fragmentu oryginalnego
bufora, długość i kolejność argumentów. Błędy pozostawiają bufor
bez zmian. Późniejsze modyfikacje dotyczą tylko wybranych zakresów
i zachowują przerwy i pozostałe bajty. Dopuszczalne są bezpieczne
implementacje bez wymogu konkretnego zapisu kodu lub strategii
alokacji.

## Dowody nauki i zgodność

Nowe główne zadanie ma rodzinę `unsafe-miri/disjoint-ranges-v1`,
wersję 2 i tylko pojęcie `unsafe-miri-disjoint-regions-contract`.
Dotychczasowe zadanie z podziałem w połowie, zadanie od zera
i alias kontraktu zachowują rodzinę
`unsafe-miri/disjoint-regions-v1`. Model, powtórki i powtarzane
aliasy nie tworzą drugiej głównej rodziny. Pojęcie nadal wymaga
dwóch różnych głównych rodzin wykonanych bez pomocy. Kryterium
modułu nadal wymaga jednego samodzielnego zadania. Zachowano
progi i schematy zapisu. Dwie rodziny oznaczają dostępność
zadań. Zaliczenie wymaga ich wykonania.

Testy zgodności przypinają skrót autentycznego poprzednika
`ce77d3f044159372bacc143ff4d22c04241333e09fbbba3b52bba8b1dc1296d5`.
Projekcja historyczna usuwa jedynie zadeklarowane nowe kroki,
odwołanie i metadane. Zastępuje projekt Miri tylko przy zgodności
pełnego skrótu przejrzanego następcy. Nieoczekiwane zmiany
historycznej lekcji, kroku, kryterium, pakietu lub projektu są
widoczne i powodują niezgodność skrótu. Wcześniejsze projekcje
składają się przez tę granicę. Zamrożone pliki poprzednika
pozostają bez zmian.

Kontrole V1/V2/V3 zachowują dawne indeksy, szkice, notatki,
próby, surowe zdarzenia, pomoc, zakładki, powtórki, oceny, sesje
i dokładne wznowienie. Dawne zaliczenie nie tworzy nowego zadania
ani zaliczenia. Pobranie startera nie ujawnia rozwiązania.
Odsłonięcie rozwiązania pakietu Miri zapisuje pomoc dotyczącą
nowego głównego zadania. Wcześniejsze surowe wpisy samodzielnego
wykonania pozostają bez zmian.

Złożony lokalny kandydat obejmuje 48 modułów, 192 lekcje, 194
pojęcia, 1277 kroków i 349 źródeł. Zmiana dodaje dwa kroki,
zachowując liczbę modułów, lekcji, pojęć i źródeł. Slot i MutSlot
nadal mają po jednej autorskiej głównej rodzinie. Cztery wstępne
pojęcia podstaw pozostają osobnymi dalszymi pracami.

## Realizacja wcześniejszych ustaleń przeglądu kursu

Etap wprowadza odrębny wykonywalny kontrakt zastosowania wiedzy,
zachowuje dawną pomoc i surowe dowody, sprawdza dokładne wznowienie
i naukę offline oraz rozróżnia dostępność materiału od obserwacji
nauki. Ścieżka początkująca i graf warunków wstępnych pozostają
bez zmian. [Przegląd z 6 października](curriculum-review-2026-10-06.pl.md)

Historyczny audyt zachowuje uzgodnienie 19 tematów i pięciu
projektów na datę zapisu. Kalibracja podstaw, dowody swobodnego
projektowania i szersza mapa docelowa mają własną kolejkę i
warunki akceptacji. [Audyt pierwotnego zakresu](curriculum-audit-2026-10-10.pl.md)

## Zakres zaufanej weryfikacji

Program testowy sprawdza siedem zachowań, w tym 2274 kombinacje
końców przedziałów dla buforów od 0 do 4 bajtów, skrajne końce,
pierwszeństwo błędów, tożsamość wskaźników, kolejność, modyfikację
i ponowne użycie. Trzy bezpieczne implementacje przechodzą.
Siedem bezpiecznych mutantów semantycznych kompiluje się i odpada
w dokładnie nazwanym teście ze zwykłym kodem zakończenia.
Próba, w której pożyczenie ma opuścić zakres właściciela,
jest negatywnym przypadkiem kompilatora z dopasowaną pozytywną
próbą. Przypadki obejmują podany zestaw wejść i implementacji.

Pakiet Miri korzysta z biblioteki standardowej, dodaje to samo
API i osobny stały przypadek nakładania. Przypadki UB kompilują
się do metadanych i są interpretowane przez przypięte Miri
`nightly-2026-08-08`. Nie wykonuje się ich natywnie. Klasyfikacja
nakładania wymaga zwykłego kodu zakończenia 1, dokładnie jednego
głównego zdarzenia UB, oczekiwanej kategorii Unique retag w
nagłówku i głównego autorskiego zakresu krotki przed pomocą i
notatkami. Stdout, późniejsze uwagi, niezwiązana diagnostyka,
sygnał, błąd uruchomienia i przekroczenie czasu mają inną
klasyfikację. Potwierdzenie zapisuje faktyczne polecenia,
wersje narzędzi, skróty archiwum i źródeł, kod zakończenia i
zachowane wyjście. Weryfikacja zainicjalizowanego prefiksu i
poprawność ogólnych gwarancji unsafe mają odrębne dowody.

Kod kursanta i kod zaimportowany pozostają w izolowanym mechanizmie
zdalnym. Symulowane odpowiedzi przeglądarki sprawdzają żądanie,
interfejs i zapis stanu. Kontrole offline zachowują stan nauki
i zgłaszają brak kompilatora bez przyznawania zaliczenia kodu.

## Stan akceptacji lokalnej

Źródło aplikacji to `5cdb2f1`, w tym poprawka stanu uruchamialnego
startera. Końcowy commit weryfikacyjny `9bfb357` zawiera tylko
poprawki skryptów dla szerokości widoku offline i wyjścia.
Kod aplikacji zachowano. Świeże lokalne próby dla tego commita
miały następujące wyniki.

| Zakres | Wynik |
| --- | --- |
| Lint, sprawdzenie typów i treści | Przeszły. Lint 0 błędów i 29 wcześniejszych ostrzeżeń. |
| Audyt struktury źródeł | Przeszedł. Adresy w sieci bez ponownego sprawdzenia. |
| Ukierunkowany test przeglądarkowy | 1 zaliczony w 2,7 sekundy, w wąskim zakresie. |
| Pełne zwykłe testy jednostkowe | 133 pliki, 1461 zaliczonych, 0 błędów, 1 jawnie pominięty test wymagający włączenia profilu prefiksu, 0 innych pominięć. |
| Autorskie przypadki Rusta na stabilnym 1.98.1 | 2525/2525 w 456 464 ms. |
| Autorskie przypadki Rusta na dokładnie 1.85.0 | 2525/2525 w 421 815 ms. |
| Kompilacja produkcyjna | Kod 0 po 5761 ms. |
| Produkcyjne E2E | 185 oczekiwanych, 0 pominiętych, nieoczekiwanych i niestabilnych, w 276 757,806 ms. |
| Przebieg offline | Kod 0 i brak błędów strony. Niedostępność wykonania zgłoszono poprawnie i bez zaliczenia. |

Przebieg offline objął szkic i notatkę zadania o rozłącznych
zakresach, wskazówkę, dokładny indeks 8, klawiaturę i komunikat
o niedostępności. Dwa wcześniejsze niepowodzenia offline poprawiono
w skryptach weryfikacji w `9bfb357` i niezależnie zaakceptowano.
Test ukierunkowany i produkcyjny korzystają z kodu aplikacji
`5cdb2f1`. Zmiany weryfikatora zachowują zasady nauki i wcześniejsze
zaliczenia.

Wcześniejsza wspólna kampania na `9dbd27a` odnotowała 1461
zaliczonych zwykłych testów jednostkowych, jedno jawne pominięcie
wymagające włączenia profilu natywnego i 2523/2523 przypadków Rusta.
Pierwsza pełna próba jednostkowa wykazała sześć nieaktualnych
oczekiwań historycznych. Ukierunkowane odzyskanie i poprawki
projekcji poprzednika przeszły 118 testów przed udaną ponowną
próbą. Wyniki pozostają historyczne.

Rzeczywista kwalifikacja natywna jest historyczna. Zamrożone
`459da10` przeszło w ścisłym trybie na stabilnym Ruście z 118
scenariuszami, 125 poleceniami i 9 kontrolami, na przypiętym Miri
z 122/131/11 i na dokładnym MSRV z 118/125/9. Dowód dotyczy
zachowanych ścieżek wykonania. Bieżący commit i zgodność z
linuksowym CI wymagają osobnej próby.

Zrzuty z ograniczonej kontroli QA na komputerze i telefonie
nie miały błędów konsoli ani stron. Zagęszczenie nagłówka
mobilnego i ścieżki dla długiej nazwy modułu nadal jest znaną
obserwacją interfejsu. Pełna ocena dostępności wymaga szerszego
sprawdzenia. Niezależny przegląd funkcji, zebranych potwierdzeń i
dokumentów zakończono. Akceptacja zdalna jest odroczona do
oczekiwanego resetu Actions 2026-11-01. Publikacja, rozliczenia
i hosting wykraczają poza zakres lokalnego etapu.

Do odtworzenia kontroli użyj poleceń i warunków z
[AGENTS.md](../AGENTS.pl.md) i [dokumentacji CI](ci-cd.pl.md)
oraz bieżącego profilu dla zainicjalizowanego prefiksu w
[.github/workflows/ci.yml](../.github/workflows/ci.yml).
Kosztowne kampanie natywne, jednostkowe, Rust, kompilacyjne i
przeglądarkowe uruchamiaj kolejno. Produkcyjne E2E i offline
wymagają serwera produkcyjnego i Chromium.
