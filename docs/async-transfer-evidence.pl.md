# Anulowanie w A2 — stan źródeł z 15 października 2026

[English](async-transfer-evidence.md)

A1 zaakceptowano na commicie czołowym PR68
`7e03e2d56d29a10f68dfbeba2c4bf530109ab830`, zwykłym scaleniu
`f975409feb0f1972089c2b368dc994417ca958d0` i drzewie
`fad6f04d491b8e83a125327c7ba17a3818ca8a6c`. Wszystkie jedenaście
zadań przeszło. Przeglądy kodu i bezpieczeństwa dokładnego commita
nie wykazały ustaleń.
[Automatyczny przebieg PR](https://github.com/fettpl/rustcrushcourse/actions/runs/38747309342),
[przebieg wynikowego main](https://github.com/fettpl/rustcrushcourse/actions/runs/38752602241)

A2 dodaje model anulowania i zwrotu oraz
`async-lending/cancel-lost-reply-v1`. Zachowuje zaakceptowaną
projekcję i przypadki testowe A1. Wykaz źródeł obejmuje 48 modułów,
192 lekcje, 194 pojęcia, 1273 wystąpienia kroków, 349 źródeł i
194 zwykłe powtórki. Pięć z dziewięciu zaawansowanych pojęć ma
po dwie autorskie rodziny, a cztery pozostają wstępne z jedną
rodziną. Dowody kompilacji i wykonania, przeglądarki, offline,
niezależnego przeglądu, wydania, PR i main oraz wyników nauki A2
oczekują na osobne potwierdzenie. Zapis określa stan materiałów.
[Ustalony plan A2](superpowers/plans/2026-10-15-cancellation-transfer.pl.md)

# Przygotowane przekazanie Send — dostępność źródeł z 15 października 2026

Do dotychczasowej lekcji Send dodano model uzupełniający i
`async-lending-send-boundary-prepared-handoff`. Nowa rodzina
`async-lending/send-prepared-handoff-v1` wymaga synchronicznego
formatowania dokładnie raz i zgodnie z kolejnością przed
zwróceniem przyszłości. Posiadany wynik ma przetrwać faktyczne
Pending, a przyszłość musi spełniać Send + 'static po
zakończeniu życia lokalnego wejścia i przechwyceń. Przy zerze
rekordów pomija formatowanie, ale nadal czeka na pauzę.
Porzucenie przyszłości zachowuje już zapisane efekty
przygotowania. Dostarczone opakowanie Box/dyn/Pin wyjaśniono
w tym miejscu przed późniejszą lekcją o dyn. Alokacja i
dynamiczne wywołanie są jawnymi kosztami.

Odbiornik, funkcja zwrotna, adapter dyn i Send mają po dwie
autorskie główne rodziny. Anulowanie z zatwierdzaniem i cztery
pojęcia Miri nadal mają po jednej. Zachowano dotychczasowe
aliasy zadań zaliczeniowych i od zera, odtwarzanie wiedzy w
powtórce, zapisaną pomoc i surową historię. Kryterium modułu
nadal wymaga jednego samodzielnego kontraktu, potwierdzenie
pojęcia dwóch kwalifikujących się samodzielnych rodzin, a
sprawdzenie po przerwie ściśle ponad 24 godzin. Potwierdzenie
umiejętności wymaga pracy kursanta.

Zaakceptowaną bazą utrzymaniową jest
`3c1ee89c3d46b0b1b9e3798a317587464a236e5c`. Koordynator potwierdził
wszystkie jedenaście zadań. [Przebieg main 38733773185](https://github.com/fettpl/rustcrushcourse/actions/runs/38733773185)

Źródła i dowody wydania A1 mają osobne zapisy. Łączna lokalna
weryfikacja, przegląd dokładnego commita i kontrole PR,
zwykłego scalenia i wynikowego main oczekują. Testy natywne
wymagają trzech implementacji o różnych reprezentacjach,
siedmiu kompilujących się mutantów zachowania i dopasowanych
par przypadków kompilatora na bieżącym Ruście i dokładnie 1.85.
Utrzymywany przypadek Tokio korzysta z istniejącego środowiska
jednowątkowego i bariery opartej na sygnale wywołania poll i
pozwoleniu na kontynuację. Sprawdza rzeczywiste spawn i
zawieszenie. Migracja między wątkami wymagałaby osobnej próby.
Przechwycenia API w przeglądarce sprawdzają interfejs i stan.
[Ustalony plan A1](superpowers/plans/2026-10-15-advanced-continuation.pl.md)

Zapisy z 9 października zachowują historyczny zakres źródeł
i poleceń oraz wykaz, w którym trzy z dziewięciu pojęć mają
po dwie rodziny.

Wykaz poprawionego stanu z 10 października i ówczesne liczby
pojęć wstępnych są w osobnym audycie. Poniższe obserwacje
źródeł i poleceń pozostają przypisane do 9 października.
[Audyt programu nauki](curriculum-audit-2026-10-10.pl.md)

# Dowody zastosowania wiedzy async — 9 października 2026

Kandydat M11 dodaje dwie główne rodziny zadań do istniejących
lekcji o pożyczaniu w async. Zachowuje zaakceptowane
identyfikatory M10, minima pojęć, schemat 3 i zasady pomocy.
Integracja źródeł i wykonane przypadki utrzymaniowe mają
odrębny zakres od przeglądu całej gałęzi, produkcyjnych
testów przeglądarkowych i offline, automatycznych kontroli
PR i main oraz akceptacji lokalnego wydania. Te warunki
pozostają po stronie koordynatora i jeszcze oczekują.

## Kontrakty i samodzielność

`async-lending-callbacks-bounded-transform` implementuje
`transform_up_to`. Limit liczy rekordy wejściowe, w tym
odfiltrowane. Każda udana funkcja zwrotna zatwierdza jeden
rekord wejściowy dopiero po await. Wynik to posiadane String
w Vec. Przy Err wcześniejsze zatwierdzenia pozostają, a
zgromadzony wynik tego wywołania jest niszczony. Rekord,
który zawiódł, i kolejne pozostają na wejściu. Porzucenie
podczas Pending pozostawia bieżący rekord bez zatwierdzenia.
Wcześniejsze zatwierdzenia i efekty funkcji zwrotnej
pozostają. Względem `run_sequential` kontrakt dodaje limit
wejścia, filtrowanie, posiadane wyniki i powtarzany częściowy
postęp. Ogólne cofanie zmian i brak alokacji wykraczają poza
kontrakt.

`async-lending-dyn-adapter-borrowed-sources` implementuje
indeksowany i wielokrotnie używalny `BoxedSources` nad
różnorodnymi lokalnymi dostawcami `BorrowedProvider`. Przyszłość
i wycinek bajtów pożyczają mutowalny odbiornik. Utworzenie
lub porzucenie adaptera przed pierwszym poll nie wywołuje
dostawcy. `next_at` przekazuje wywołania poll, waker i pożyczone
bajty. `collect_at` jawnie kopiuje ograniczone wyniki do
posiadanych Vec, zwalnia każdy widok przed ponownym użyciem i
zachowuje puste elementy. Dostawca określa postęp i anulowanie.
Adapter nie dodaje transakcyjnej dzierżawy ani cofania zmian.
Jednorazowe `Boxed::one(self)` zwraca posiadany Report. Tu
potrzebny jest wielokrotny wybór dostawcy oraz osobne przejście od
pożyczonych do posiadanych danych. Opakowane w Box przyszłości
i wyniki zbierania mogą alokować. Zgodność wskaźników w
testowanych przypadkach ma ograniczony zakres.

## Dostępne główne rodziny autorskie

| Pojęcie | Główne rodziny |
| --- | --- |
| Odbiornik / `async-lending-borrowed-readiness` | `async-lending/receiver-lease-v1`, `async-lending/receiver-bounded-batch-v1` |
| Funkcja zwrotna / `async-lending-callback-borrow` | `async-lending/sequential-callback-v1`, `async-lending/callback-bounded-transform-v1` |
| Adapter dyn / `async-lending-dyn-adapter` | `async-lending/dyn-adapter-v1`, `async-lending/dyn-borrowed-sources-v1` |
| Anulowanie i zatwierdzanie | `async-lending/cancel-commit-v1` |
| Send | `async-lending/send-boundary-v1` |
| ByteView | `unsafe-miri/byte-view-v1` |
| Rozłączne zakresy | `unsafe-miri/disjoint-regions-v1` |
| Slot | `unsafe-miri/slot-state-v1` |
| MutSlot | `unsafe-miri/mut-slot-v1` |

Trzy z dziewięciu zaawansowanych pojęć mają po dwie główne
rodziny autorskie, a sześć po jednej. Potwierdzenie umiejętności
wymaga pracy kursanta. Zadanie zaliczeniowe i zadanie od zera
należą do jednej rodziny. Zwykła powtórka służy odtworzeniu
wiedzy. Potwierdzenie pojęcia nadal wymaga dwóch aktualnych i
kwalifikujących się rodzin wykonanych samodzielnie. Dawna
rodzina z pomocą i nowa samodzielna dają tylko jedną taką
rodzinę. Pomoc w obu może wyczerpać dostępne drogi ponownej
próby. Wcześniejsze surowe zdarzenia samodzielne pozostają bez
zmian po późniejszej pomocy. Kryterium modułu akceptuje po
jednej samodzielnej rodzinie. Potwierdzenie pojęcia używa
odrębnej reguły. Mechanizm nie narzuca konkretnej pary.

Zarejestrowane definicje dostarczają identyfikatory rodzin.
Zdarzenia w schemacie 3 nie zawierają pola `codingTaskId`.
Ścisły import odrzuca to pole. Niewłaściwe bieżące przypisanie,
mechanizm oceniania lub rodzaj zdarzenia wykluczają główne
zaliczenie. Poprawne zadanie zastosowania wiedzy może się
kwalifikować z opcjonalnym `gate: false`. Sama flaga gate nie
zmienia pokazu materiału, przewidywania, samej odpowiedzi ani
powtórki w główną rodzinę. Powtórka zachowuje odrębną rolę
w odtwarzaniu i trwałości wiedzy.

## Wykaz i zgodność

Ustalona zaakceptowana projekcja M10 wskazuje main
`eb7ae8be22cef252f6a74c09023b4d56a0c179cc` i drzewo
`3503a34bba8ce693f4398ec30e826ecf50fc46ba`. Oryginalny przypadek
zapisano jako kopię bajt w bajt o rozmiarze 609 568 bajtów i
SHA256 `59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7`.
Bieżąca zredagowana kopia do prezentacji zmienia tylko
metadane ścieżki wejściowej. Dokładny skrót następcy i granice
zgodności opisuje [nota o anonimizacji historii](history-redaction.pl.md).
Historyczne skróty źródeł, wejścia i archiwum zachowują
znaczenie. Zmiana prezentacji nie wykonuje ponownej
weryfikacji. Testy porównują każde dawne wystąpienie kroku
w danej lekcji i jego indeks oraz wszystkie tablice lokalizacji
według samodzielnego ID, w tym 24 powtarzające się ID.
Tylko lekcje o funkcjach zwrotnych i adapterze dyn otrzymują
po jednym kroku na końcu.

W zintegrowanym stanie odnotowano 189 lekcji, 1219 wystąpień
kroków (M10: 1217), 1188 unikatowych samodzielnych identyfikatorów
kroków (M10: 1186), 48 modułów, 191 pojęć, 195 kompetencji,
13 projektów, 334 źródła i 7 śladów. Powtórki to nadal 191
zwykłych, 2 po przerwie, 3 krótkie próby i 196 łącznych
identyfikatorów. Ocena async ma 18 przypadków (13 zadań
programistycznych lekcji i 5 powtórek). Dawna treść przypadków
i ich względna kolejność zostały zachowane. Liczby lekcji,
powtórek, modułów, pojęć i projektów pozostały bez zmian.

## Wykonanie natywne i negatywne przypadki kompilacji

Zintegrowany natywny program testowy Vitest składa źródła
zachowania za pomocą rzeczywistego `appendHiddenTests` i wywołuje
bezpośrednio `rustc` przy udokumentowanych ustawieniach PATH.
Node ma wersję 22.23.3. Wybrany stable to Homebrew Rust 1.99.0
(`b940084d7eb6a299eb4bfeb8e34901bc051e7ac4`). Odrębny zainstalowany
alias rustup-stable 1.98.1 nie uczestniczy w próbie. Dokładna
MSRV to Rust 1.85.0 (`4d91de4e48198da2e33413efdcd9cd2cc0c46688`),
z katalogiem kompilatora na początku PATH. Nowe źródła używają
edycji 2024 i `--test`.

| Zakres sprawdzony na obu kompilatorach | Funkcja zwrotna | Dyn |
| --- | --- | --- |
| Kompilacja i wykonanie wersji kanonicznej i równoważnej o innej reprezentacji | 0 / 0, po 8 testów | 0 / 0, po 7 testów |
| Kompilujące się mutanty semantyczne | 5 z kodem kompilacji 0, wyznaczony test z kodem 101, przywrócona wersja kanoniczna z kodem 0 | 6 z kodem kompilacji 0, wyznaczony test z kodem 101, przywrócona wersja kanoniczna z kodem 0 |
| Pary negatywnych i pozytywnych przypadków granicznych dla obu implementacji | Po 2 pary | Po 6 par |

Każdy wyznaczony mutant i odpowiadający przypadek pozytywny
używa `--exact <actual-name> --test-threads=1 --nocapture`, wymaga
dokładnie jednego nazwanego testu i sprawdza zwykły kod
zakończenia. Kilka oddzielnych programów mutantów celowo
sprawdza tę samą asercję. Odrzucenie mutanta wymaga błędu
nazwanej asercji. Błędna kompilacja, brak kompilatora,
przekroczenie czasu, sygnał i brak wybranych testów mają inne
znaczenie.

Negatywne przypadki graniczne używają `--error-format=json`.
Wymagają zwykłego kodu 1 i oczekiwanego kodu E na głównym
zakresie dodanego przypadku. Pary funkcji zwrotnych sprawdzają
lokalną operację względem static (`E0597`) oraz lokalne Rc
względem Send (`E0277`). Pary dyn sprawdzają nakładanie się
aktywnych przyszłości i wycinków (`E0499`), wydostanie się
pożyczonego wyniku i przyszłości (`E0515`), Send dostawcy
(`E0277`) i lokalnego dostawcę względem static (`E0597`).
Każdy dopasowany przypadek pozytywny kompiluje się z kodem 0
i wykonuje dokładny nazwany test z kodem 0 zarówno dla
wersji kanonicznej, jak i równoważnej. Dowody obejmują te
autorskie przypadki.

Skróty źródeł z dodanymi ukrytymi testami są identyczne
w wybranych przebiegach kompilatorów.

| Źródło i implementacja | SHA256 złożonego kodu Rusta |
| --- | --- |
| `async-lending-callbacks-bounded-transform`, kanoniczna | `06ff0eb82222fd42a193a5975659d8a8292ec0e6f60c1d0879e8f8e805f356f5` |
| `async-lending-callbacks-bounded-transform`, równoważna | `447da1bf7fd7385417c4e5eedb0434a631c5649c46a9c43338ffa043eeccbd7f` |
| `async-lending-dyn-adapter-borrowed-sources`, kanoniczna | `9a11c6473eea97f1d90eec520f0aec307b31ee9d183d212768c06aa7c3cd19d8` |
| `async-lending-dyn-adapter-borrowed-sources`, równoważna | `58b0e0690a35c88f2b6393ab664c48c1a8a4d876a15fb7c0f798e10ff89e068c` |

Pełne testy zachowania obu implementacji obserwują
kontrolowane Pending, podany waker, lokalne przechwycenia
i dostawców, przekazywanie bajtów, ograniczony i powtarzany
postęp oraz anulowanie w granicach kontraktów. Wersja
równoważna dyn z VecDeque używa teraz pełnej ścieżki
`std::pin::Pin` bez importu Pin w głównym module. Wspólne
ukryte testy i osobny przypadek wydostania się przyszłości
niezależnie stosują pełną ścieżkę Pin. Istniejące testy
oceny i granic ze składaniem rzeczywistego źródła sprawdzają
więc także tę poprawną implementację publicznego API bez
zależności od prywatnego importu kursanta.

Wcześniejsze zintegrowane przebiegi 136 testów na stable i
36 na dokładnie 1.85 poprzedzają poprawkę. Poprawkę Pin
obejmują dwa pełne istniejące pliki natywne (36 testów)
na obu kompilatorach. Ukierunkowane wywołanie istniejącego
autorskiego weryfikatora Rust sprawdza cztery przypadki
kroku dyn i dwie zwykłe kontrole. W przypadkach reject-empty,
starter-rejected i solution używa zmienionych ukrytych
testów. Zwykły starter kompiluje niezmienione źródło
startowe. Odpowiedniki, mutanty semantyczne i dodatkowe
przypadki graniczne sprawdza natywny zestaw oceny i granic.
Wcześniejsze pełne wyniki 2414 przypadków na stable i
dokładnym MSRV oraz kompilacja przy `6a8a1c0` pozostają
historyczne. Poprawiony pełny katalog należy do osobnej
końcowej weryfikacji w automatycznym CI. Samo
`content:async-lending` sprawdza autorski pakiet i nie wykonuje
tych dwóch kroków lekcji.

## Zakres przeglądarki, wydania i obserwacji kursantów

Zestawy testów granic i wznowienia obejmują oba dodane ID,
import schematu 3 na dawne indeksy, dokładne zachowanie
powtórek i szkiców, przechwycone żądanie sukcesu i jego
przypisanie, ograniczenie skutków odsłonięcia, rozliczenie
dawnej pomocy i nowej próby samodzielnej, wyczerpanie
dostępnych prób oraz nawigację modułu w wąskim i mobilnym
widoku. Przechwycony sukces dotyczy interfejsu i stanu.
Wykonanie Rusta wymaga osobnej próby. Próba produkcyjna
wymaga świeżego sprawdzonego buildu i serwera koordynatora,
z jawnie wskazanym URL i ścieżką raportu. Wynik z już działającego
serwera nie potwierdza świeżości źródeł. Kompilacja, testy
przeglądarkowe i offline, automatyczne kontrole PR i main oraz
akceptacja lokalnego wydania mają odrębne warunki. Porównanie
archiwów w UTC obejmuje tę strefę czasową. Pakiet zachowuje
zawartość i znaczniki czasu ZIP.

Brak zaobserwowanych wyników nauki. Autorskie przypadki i
symulowane ścieżki przeglądarkowe sprawdzają oprogramowanie.
Samodzielna architektura, użycie wiedzy w nieznanym zadaniu
po przerwie, trwałość wiedzy, skuteczność, ogólna znajomość
współbieżności i unsafe, gotowość zawodowa i pełna dostępność
wymagają osobnej oceny. Historyczne M10 miało osiem pojęć
z jedną rodziną. W opisywanym stanie z 9 października trzy
z dziewięciu mają po dwie autorskie rodziny, zgodnie z tabelą.
