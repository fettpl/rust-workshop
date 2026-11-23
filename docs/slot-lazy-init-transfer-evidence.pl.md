# Leniwa inicjalizacja Slot — kontrakt i zakres dowodów

[English](slot-lazy-init-transfer-evidence.md)

Stan źródeł z 24 października 2026 r. (UTC). Ten odrębny lokalny
etap kursu następuje po zakończeniu lokalnych przygotowań OSS.
Osoba utrzymująca projekt zatwierdziła kontynuację kursu, podczas
gdy publiczne wydanie czeka na Actions i inne zewnętrzne warunki.
Lokalne wykonanie dotyczy tego środowiska. Akceptacja hostowanego
CI, integracja, wydanie publiczne, osiągnięcia kursanta i ogólne
bezpieczeństwo pamięci wymagają osobnych dowodów.

## Odrębny kontrakt zastosowania wiedzy

Istniejąca lekcja `unsafe-miri-slot-state` zachowuje kolejność
pierwotnych kroków i dodaje `slot-state-lazy-init-model` i
`slot-state-lazy-init-transfer`. Model pokazuje bezpieczną
reprezentację stanu leniwej inicjalizacji. Główne zadanie rozwija
odrębny typ `LazySlot<T>`. Wcześniejsze zadanie `Slot<T>` zachowuje
kontrakt. Konstruktor nowego typu to `new`, własność przekazuje
`take`, a pożyczony dostęp ma następującą sygnaturę.

```rust
fn get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>
where
    F: FnOnce() -> Result<T, E>;
```

- Stan Full zwraca mutowalne pożyczenie zapisanej wartości bez wykonania ciała inicjalizatora. Przechwycone wartości w nieużytym domknięciu są normalnie zwalniane. Panika podczas zwalniania nadal może wystąpić.
- Stan Empty uruchamia inicjalizator raz i pozostaje Empty w trakcie wywołania. Błąd jest zwracany bez zmiany stanu. Panika odwijająca stos przechodzi wyżej. Jeśli wywołujący ją przechwyci, Slot nadal jest Empty i operację można powtórzyć. Wcześniejsze efekty uboczne funkcji zwrotnej zostają zachowane.
- Udany inicjalizator zwraca posiadaną wartość. Zapisz ją przed ustawieniem Full i przed udostępnieniem mutowalnego pożyczenia. Pożyczenie nie może przeżyć Slot ani współistnieć ze sprzecznym dostępem.
- Wyjęcie wartości przekazuje własność i przywraca Empty. Zniszczenie Full wywołuje destruktor zapisanej wartości dokładnie raz. Zniszczenie Empty nie traktuje pamięci jako żywej wartości typu `T`. API nie wymaga dodatkowych ograniczeń Clone, static, Send ani Unpin.

Dotychczasowa rodzina obejmuje natychmiastowe `put`, przenoszące
`take` i warunkowe niszczenie. Ta rodzina dodaje pominięcie wywołania,
błąd inicjalizacji, stan po odwinięciu stosu, ponowienie i pożyczony
dostęp. Wcześniejsze zadanie i odrębna wymiana ReplaceSlot zachowują
swoje kontrakty. Zaliczenie wymaga równoważnego zachowania. Kursant
wybiera sposób implementacji.

`catch_unwind` występuje tylko w zaufanych testach zwykłej paniki
odwijającej stos. Nie służy do ogólnej obsługi błędów, nie przechwytuje
paniki kończącej proces i nie gwarantuje odzyskania po drugiej panice
podczas niszczenia. Bezpieczeństwo dowolnej implementacji kursanta
wymaga osobnego sprawdzenia.

## Dowody nauki i zgodność z historią

Główne zadanie używa rodziny `unsafe-miri/slot-lazy-init-v1`,
wersji dowodu 2 i istniejącego pojęcia
`unsafe-miri-slot-state-contract`. Dotychczasowe zadanie zaliczeniowe,
równoważny kontrakt i zadanie od zera zachowują
`unsafe-miri/slot-state-v1`. Powtórka w lekcji i sesji służą
odtworzeniu wiedzy. Nowy model i ponowne przesłanie rozwiązania
nie tworzą niezależnej głównej rodziny. Globalne progi i liczba
niezależnych zadań wymagana przez kryterium modułu pozostają bez zmian.

Migawkę poprzednika sporządzono z autentycznego kursu sprzed zmiany.
Nowa projekcja używana tylko w testach może usunąć wyłącznie dwa
zadeklarowane kroki, odwołanie do kryterium i jawnie przejrzane
metadane. Przywrócenie projektu do pobrania wymaga zgodności
z dokładną tożsamością przejrzanego następcy. Starsze projekcje
składają się za tą granicą. Zachowane potwierdzenia i oczekiwane
skróty poprzednika pozostają niezmienne. Niezwiązane zmiany nadal są
wykrywalne.

Zgodność V1/V2/V3 obejmuje próby, surowe zdarzenia i znaczniki czasu,
pomoc, szkice, notatki, zakładki, sesje powtórek, oceny, ścieżki i
dokładne wznowienie. Dawne ukończenie nie tworzy zdarzenia dla
nowego zadania, nie zmienia oceny powtórzonego aliasu i nie przyznaje
niezależnego zaliczenia. Odsłonięcie powiązanego rozwiązania zachowuje
wcześniejsze surowe zdarzenia samodzielne, a późniejsza praca
z pomocą ma odpowiednie oznaczenie.

## Wymagana weryfikacja

Natywne przypadki sprawdzają liczbę wywołań inicjalizatora, zwykłe
zwalnianie wartości przechwyconych przez domknięcie, tożsamość
błędu, ponowienie po błędzie lub przechwyconym odwinięciu, zmianę
przez wynik, wyjęcie i ponowne użycie, wartości bez Clone i
pożyczone wartości bez ograniczenia static oraz wartości o zerowym
rozmiarze z Drop. Pozytywne przypadki pożyczeń towarzyszą
negatywnym klientom kompilatora z próbą wydostania się od właściciela
i konfliktami pożyczeń lub czasów życia. Kontrole odrzuconego
zachowania muszą odpaść w nazwanej asercji. Brak narzędzi, błąd
kompilacji i przerwanie wykonania mają inną klasyfikację.

Natywnie uruchamia się wyłącznie poprawne stałe implementacje
autorskie i bezpieczne pamięciowo mutanty semantyczne. Przedwczesny
Full, odczyt niezainicjalizowanej pamięci i podwójne zniszczenie są
wyłączone z negatywnych testów natywnych. Zwykła kompilacja
autorskich przypadków niezdefiniowanego zachowania obejmuje
wyłącznie metadane. Przypadki wykonuje tylko przypięte Miri.
Liczniki Drop opisują zaobserwowane przypadki, a zasady bezpieczeństwa
nadal obowiązują.

Pozytywny przypadek integracyjny Slot należy do autorskiego archiwum
Miri Safety i używa rzeczywistej implementacji MaybeUninit. Istniejące
testy wszystkich celów w trybach stable i MSRV oraz przypięte Miri
wykrywają testy integracyjne. To opis selekcji testów. Uruchomienie
konkretnego polecenia wymaga osobnego zapisu. Zapisz prywatnie
dokładne wersje, cel, skróty źródeł i archiwum, polecenia i wyniki.
Ukierunkowany wynik Miri obejmuje tylko wybrane przypadki.

Testy przeglądarkowe z kontrolowanymi odpowiedziami sprawdzają
reguły rodzin i pomocy, dokładny zapis, przeładowanie i wznowienie,
zakładkę kodu przy 390 px i klawiaturę. Rozgrzany tryb offline
sprawdza trwałość szkiców, notatek, pomocy i stanu oraz komunikat
o niedostępnym uruchamianiu. Kompilacja natywna i zaliczenie
powtórki mają odrębne dowody.

## Pochodzenie i źródła

Nowa lekcja, zaufane przypadki i testy powstały w ramach prac nad
kursem pod kierunkiem osoby utrzymującej projekt. Odnośniki
dokumentują znaczenie konstrukcji języka. Prawa do kopiowania
i pełna ocena oryginalności wymagają odrębnej analizy. W tym
zakresie nie dodano zewnętrznej grafiki ani skopiowanych fragmentów
dydaktycznych. Podział MIT dla kodu wykonywalnego i CC BY 4.0 dla
autorskiej treści, ograniczenia praw, oznaczenie autorstwa projektu
i wąskie wyjątki Cargo zachowano. Przed aktualizacją rejestru
pochodzenia sprawdź rzeczywistą różnicę i wykonaj niezależny
przegląd. Skrót identyfikuje materiał, a zgodę ustala się osobno.

- Warunki zainicjalizowanej wartości i odpowiedzialność za ręczne niszczenie. [MaybeUninit](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html)
- Zachowanie niezmienników unsafe przy odwijaniu stosu w kodzie użytkownika. [Bezpieczeństwo wyjątków](https://doc.rust-lang.org/nomicon/exception-safety.html)
- Granice przechwytywania paniki odwijającej stos. [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html)
- Zwykłe niszczenie wartości i zasady zakresów. [Destruktory](https://doc.rust-lang.org/reference/destructors.html)

Wariant MutSlot uczący wariancji i uzgodnienie podstaw pozostają
odrębnymi etapami. Pełne lokalne wyniki, niezależny przegląd i commit
z angielskim opisem należą do prywatnego przekazania prac. Świeże
wymagane kontrole GitHub dla dokładnego commita i dla wynikowego main
są odroczone. [Lokalna kolejka prac](local-development-queue.pl.md)
