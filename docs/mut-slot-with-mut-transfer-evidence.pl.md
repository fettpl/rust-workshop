# MutSlot — użycie funkcji zwrotnej z krótkim pożyczeniem

[English](mut-slot-with-mut-transfer-evidence.md)

Dotychczasowa lekcja `unsafe-miri-mut-slot` zachowuje osiem
historycznych kroków. Dodaje `mut-slot-with-mut-model`, który
pokazuje model, i `mut-slot-with-mut-transfer`, główne zadanie
odrębnej rodziny `unsafe-miri/mut-slot-with-mut-v1`. Opcjonalna
przerwa po historycznej powtórce rozdziela nowy model funkcji
zwrotnej i zadanie. Wyjątek dla tej dziesięciokrokowej lekcji
wymaga dokładnej granicy przerwy i obu dodanych identyfikatorów.
Ogólne ograniczenie od pięciu do dziewięciu kroków nadal obowiązuje.
Dotychczasowe zadanie zaliczeniowe i zadanie od zera zachowują
rodzinę `unsafe-miri/mut-slot-v1`. Kalibracja pojęcia nadal wymaga
dwóch rodzin, a kryterium modułu jednego zadania.

## Kontrakt

Dostarczone bezpieczne opakowanie udostępnia
`with_mut<R, F>(&mut self, f: F) -> R` z ograniczeniem
`F: for<'short> FnOnce(&'short mut T) -> R`. Jedno wywołanie
tworzy świeże mutowalne ponowne pożyczenie na potrzeby funkcji
zwrotnej, wywołuje ją dokładnie raz i zwraca jej wynik.
Po zakończeniu tymczasowego pożyczenia można ponownie użyć opakowania.

Typ wyniku jest niezależny od tymczasowego pożyczenia w funkcji
zwrotnej. Wynik może posiadać dane lub pożyczać innego właściciela
o wystarczająco długim czasie życia, w tym odpowiednią referencję
współdzieloną przechowywaną w `T`. Nie musi posiadać danych ani
mieć ograniczenia `'static`. Skrócenie zewnętrznego dostępu
zachowuje niezmienniczość `T`. Jeśli `T` wymaga dłuższego
czasu życia referencji, krótszej nie można w nim zapisać. Zwykłe
odwijanie stosu po panice funkcji zwrotnej propaguje się, a
wcześniejsze modyfikacje mogą się utrzymać. Kontrakt nie obiecuje
cofnięcia zmian.

Dodany model wprowadza HRTB w nawiązaniu do istniejącej lekcji
„Callback odwiedza lokalne pożyczki”. Kontrakt języka opisują poniższe
źródła. Zachowanie sprawdzają niezależne przypadki wykonywalne.
[Ograniczenia wyższego rzędu](https://doc.rust-lang.org/reference/trait-bounds.html#higher-ranked-trait-bounds),
[podtypy i wariancja](https://doc.rust-lang.org/reference/subtyping.html),
[`FnOnce`](https://doc.rust-lang.org/std/ops/trait.FnOnce.html)

## Zakres autorskich dowodów

Kanoniczne i równoważne bezpieczne implementacje korzystają ze
wspólnego programu testowego. Klienci kompilatora rozróżniają
rzeczywiste `FnOnce`, lokalne przechwycenia, wyniki pożyczone
niezależnie lub z danych wewnętrznych i minimalne ograniczenia
typów od zbędnych ograniczeń. Sparowane przypadki pozytywne i
negatywne z oczekiwaną diagnostyką sprawdzają wydostanie się
pożyczenia poza wywołanie i niezmienniczość czasów życia
wewnętrznych referencji. Bezpieczny pamięciowo szkielet TODO i
kontrole semantyczne muszą odpaść z powodu wskazanego zachowania.
Brak narzędzia lub importu i przekroczenie czasu mają inną
klasyfikację.

Archiwum Miri Safety dodaje osobny bezpieczny cel
`tests/mut_slot_with_mut.rs` w wariancie startowym i rozwiązaniu.
Zawiera właściwą implementację dydaktyczną i program testowy.
Dotychczasowe API biblioteki zachowano. Wcześniejsze `src/lib.rs`,
`tests/safety_contract.rs`, zakaz unsafe w Cargo i autorskie pliki
negatywne z UB pozostają bez zmian. Nowy cel działa z zakazem
unsafe. Wyniki z wersji stabilnej, dokładnej MSRV i przypiętego Miri
obejmują wyłącznie ten cel pozytywny. Każdy historyczny przypadek
Miri ma własny zakres akceptacji.

Nowa projekcja stanu poprzedniego najpierw wymaga dokładnego,
przejrzanego stanu następcy projektu. Następnie usuwa wyłącznie
nowy cel i jego odwołanie do odsłonięcia. Projekcja lekcji usuwa
wyłącznie zadeklarowaną przerwę i nowe kroki. Nieoczekiwane zmiany
przerw pozostają wykrywalne. Projekcja odtwarza prawdziwy projekt
po zmianie Slot, a potem składa wcześniejsze projekcje Slot i
poprzednich adapterów. Historyczne potwierdzenia i oczekiwane
skróty są niezmienne. Drobne odstępstwa w projekcie i zmiany
starych kroków pozostają widoczne.

## Granice nauki i weryfikacji

Pokazanie treści, pomoc, odsłonięcie, pobrania, aliasy i powtórka
nie tworzą drugiej głównej rodziny. Surowa historia, szkice, notatki,
pomoc, zakładki i dokładne wznowienie zostają zachowane. Zaliczenie
nowego zadania wymaga pracy kursanta po jego udostępnieniu.
Produkcyjne testy przeglądarkowe i tryb offline z rozgrzaną pamięcią
podręczną sprawdzają wskazane kontrakty interfejsu i stanu, w tym
rzeczywisty edytor, klawiaturę i wąski widok. Odpowiedzi kontrolowane
dotyczą interfejsu. Poprawność kompilatora i osiągnięcia kursanta
mają osobne dowody.

Natywne kontrole utrzymaniowe uruchamiają wyłącznie stałe, zaufane
przypadki repozytorium. Kod kursanta i kod zaimportowany działają
przez izolowany mechanizm zdalny. Testy natywne pomijają autorskie
negatywne przypadki UB i dowolny kod kursanta. Zachowane raporty muszą
wskazywać źródło, narzędzia, polecenia, błędy, pominięcia i zakres
wyników. Lokalna akceptacja oprogramowania, hostowane CI na dokładnym
commicie, zwykła integracja, wydanie publiczne i obserwacja postępów
kursanta wymagają osobnych zapisów.
