# Audyt programu nauki w określonym stanie źródeł — 10 października 2026

[English](curriculum-audit-2026-10-10.md)

Pełny statyczny audyt znaczenia i kontraktów objął źródła
`fc3491a74e30557ebea1196986d136ca66a43973` i drzewo
`cfba502e64f648483174ec7e2028eb6640b0105a`. Stwierdzono pokrycie
wszystkich pierwotnych tematów i pięciu rodzin projektów oraz wskazano
dziesięć konkretnych poprawek pogłębiających treść lub poprawiających
sformułowania. Kandydat zawiera te poprawki. Przegląd integracji,
pełne kontrole oprogramowania, CI na aktualnym commicie i scalenie
wymagają osobnej akceptacji. Postępy kursanta ustala się przez obserwację.

## Pokrycie i odtwarzalne dowody ze źródeł

Stan bazowy obejmuje 48 modułów, 189 lekcji, 191 pojęć, 195 kompetencji,
1219 kroków, 334 źródła, 13 zarejestrowanych projektów, siedem śladów,
191 zwykłych powtórek, dwie powtórki po przerwie i trzy krótkie próby.
Kandydat zachowuje identyfikatory i kolejność rejestru. Dodaje 23
kroki i siedem źródeł, co daje **1242 kroki i 341 źródeł**, w tym
146 kroków rodzaju `blank` z różnymi kontraktami i 463 mechanizmy
oceniania testami w lekcjach. Liczby opisują inwentarz. Zadania od zera
obejmują także zadania o z góry ustalonym API. Zaliczone kompetencje
wymagają pracy kursanta.

[Zapisany w repozytorium rejestr audytu](evidence/curriculum/2026-10-10-audit-ledger.json)
zawiera wszystkie 189 pozycji lekcji związanych z konkretnym stanem
źródeł. Zawiera dokładne kotwice, oceny celów, teorii, praktyki,
sprawdzianów i warunków wstępnych oraz decyzje merytoryczne. Astra
bezpośrednio przejrzała znaczenie treści wszystkich 70 lekcji Core17.
Sol bezpośrednio sprawdził wszystkie 119 lekcji rozszerzeń, po czym
Astra sprawdziła każdy wpis merytoryczny i niezależnie ponownie
przeczytała wskazane kontrakty. Przegląd Astry obejmował wpisy i
wskazane kontrakty, bez osobnego odczytu każdej linii kodu Rusta.
Brak pominiętych, nieprzeczytanych i powtórzonych pozycji lekcji.
Audyt uzgodnił 19 miejsc w pierwotnym wykazie tematów, pięć rodzin
projektów, wszystkie 34 etykiety mapy w aplikacji i dawne założenia
planistyczne. Niezależny przegląd pierwotnej specyfikacji dla tego
stanu źródeł zebrał 145 wymagań. Przed poprawkami 122 były pokryte,
19 częściowo, a cztery wnioski nie miały oparcia w źródłach.
Sprawdzono zarówno obecność tematów, jak i głębię materiału.

Audyt tylko do odczytu nie uruchamiał kompilatora, przeglądarki,
weryfikatora archiwów ani CI. Nie weryfikował ponownie wszystkich
334 adresów źródeł w sieci. Zapisane w repozytorium
[dane tożsamości sprzed poprawki](../src/content/baseline-correction-legacy.json),
[jawny wykaz dodatków](../src/content/baseline-correction-delta.json)
i testy zgodności zachowują każde dawne wystąpienie i pozycję kroku
w jego lekcji, w tym powtarzające się samodzielne identyfikatory
kroków. Wcześniejsze dane M10, M11 i starsze przypadki pozostają
identyczne bajt po bajcie. Odwołania poniżej prowadzą do repozytorium,
dzięki czemu dowody są dostępne także bez prywatnych plików koordynacji.

## Mapa ukończenia pierwotnej ścieżki

Core17 stanowi ścieżkę dla początkujących i obejmuje 70 lekcji od
[podstaw](../src/content/foundations.ts) do [Log Analyzer](../src/content/log-analyzer.ts).
Dostarcza technicznych podstaw do samodzielnego zadania Study Session CLI.
Pierwotna ścieżka obejmuje także cztery lekcje
[Mini grep](../src/content/mini-grep-module.ts), których pierwszym
warunkiem jest Log Analyzer, oraz dotychczasową sekwencję
**boxed-values → shared-ownership → threads → channels → synchronized-state**
z 15 lekcjami. Box, Rc, Weak i kanały stanowią podstawę istniejącego grafu
wątków, Arc i Mutex. Daje to 89 autorskich lekcji oraz odrębne samodzielne
zadanie końcowe. [Identyfikatory ścieżki, kolejność grup i zakończenie](../src/engine/course-route.ts)
pozostają bez zmian. Atomiki, Tokio, GAT, FFI i wszystkie 31 rozszerzeń są
opcjonalne.

Pięć pierwotnych rodzin projektów to Number Guessing+, Todo CLI, Log
Analyzer, Mini grep i **Study Session CLI**, otwarte zadanie końcowe
[na karcie projektu Log Analyzer](../src/content/log-analyzer.ts)
i w [pobieranym README](../src/content/projects/log-analyzer.ts).
Study Session łączy argv, pliki i UTF-8, typowane błędy, agregację z
kontrolą przepełnienia, deterministyczną kolejność, stdout, stderr i kody
0/1/2. Kursant sam wybiera typy i podział kodu, dodaje testy i uzasadnia
decyzje. Kontrakt lokalny korzysta tylko z biblioteki standardowej, bez
sieci, znaczników czasu, wdrożenia i progu wydajności. Publiczna zmiana
`--min-total N` jest dostępna po udokumentowanej samoocenie lub
zewnętrznym przeglądzie. Zapisuje się kategorię przeglądu i to, czy
kursant wcześniej widział zadanie. Ocena jest ręczna i wymaga
obserwacji. Durable Log Service pozostaje opcjonalnym, zaawansowanym
projektem integracyjnym.

| Pierwotny temat | Pokrycie materiałem w tym stanie | Decyzja o zakresie |
| --- | --- | --- |
| 0 Konfiguracja, Cargo i pierwszy program | first-program, modules-cargo, projekty Cargo do pobrania | Zakres wystarcza. Rozróżniaj narzędzia lokalne i wykonanie w przeglądarce. |
| 1 Zmienne, typy skalarne, funkcje i wyrażenia | Podstawy, następnie lekcje konwersji | B02 pogłębia typy proste, krotki, typ jednostkowy i liczby w wybranym zakresie. |
| 2 Przepływ sterowania | control-flow oraz while-progress, loop-values i loop-control | B02 wzmacnia samodzielny wybór i iterację. Pozostałe rodziny pętli mają praktykę i testy. |
| 3 Stos, sterta i zakresy | memory-intro i autorskie ślady, później Drop | B03 wprowadza dokładniejszy model i nowy ślad. Rzeczywisty układ pamięci jest poza zakresem. |
| 4 Własność | Dziesięć lekcji o własności i rodziny do kalibracji | B01, B03 i B04. Po poprawce cztery pojęcia nadal mają status wstępny według reguły dwóch rodzin. |
| 5 Pożyczenia, mutowalność i wycinki | borrow-intro, dwie lekcje kalibracji, wycinki i powrót do tematu w kolekcjach | Testy wielokrotnego użycia zachowanego właściciela. B05 wprowadza tablice. |
| 6 Struktury, metody, enumy, Option i match | Siedem lekcji modelowania danych (`data-modeling`) | B05 obejmuje typowe wzorce i arytmetykę z kontrolą. B06 dodaje zadanie z samodzielnym projektem. |
| 7 Vec, String i HashMap | Trzy rozbudowane lekcje o kolekcjach oraz projekty | Praktyka Unicode, braku wartości, wzrostu pojemności i Entry wystarcza. B09 dodaje miejsca na przerwę. |
| 8 Result, ?, panic i błędy | Trzy lekcje obsługi błędów, sprawdzane konwersje i projekty | Pierwsza teoria i praktyka wystarczają. Późniejsza funkcja 1 składa wartości i potoki, które mogą zakończyć się błędem. |
| 9 Moduły, crates, pakiety i Cargo | Cztery lekcje o modułach i rzeczywiste archiwa | Rozróżnia widoczność, import i cel Cargo. Zaawansowana publikacja jest opcjonalna. |
| 10 Typy generyczne | T/U, generyczne impl, minimalne ograniczenia typów | Zakres wystarcza. Przypadki bez Copy, Clone i Debug zapobiegają założeniom opartym wyłącznie na liczbach. |
| 11 Cechy | Metody wymagane i domyślne, odbiorcy, typy skojarzone, dyn i konwersje | B07 wprowadza derive i spójność implementacji. Zaawansowana zgodność API ma osobny moduł. |
| 12 Czas życia | E0106 od problemu, struktury pożyczające i decyzje na granicy API | Zakres wystarcza przed opcjonalną wariancją, HRTB i GAT. |
| 13 Domknięcia i iteratory | Przechwytywanie i cechy Fn, własność, potoki, leniwość i własny Iterator | Podstawy wystarczają. B06 i wybrane operacje mogące się nie powieść pogłębiają łączenie umiejętności. |
| 14 Testy, fmt i Clippy | Trzy lekcje, eksperyment lokalny i każdy projekt | Podstawy testowania wystarczają. Funkcja 2 ćwiczy pracę z nieznaną dokumentacją i diagnostyką. |
| 15 Inteligentne wskaźniki (pierwotnie opcjonalne) | Box, Deref, Drop, Rc, RefCell i Weak | Rzeczywiste kontrakty. Są także pomostem do istniejących lekcji o wątkach. |
| 16 Wątki, Arc i Mutex (pierwotnie wymagane) | threads, channels, synchronized-state | Rzeczywiste ID wątków, własność, join, strażniki i odzyskanie po zatruciu muteksu. Kontynuacja poza Core17. |
| 17 Wprowadzenie do async (pierwotnie opcjonalne) | Cztery lekcje o Future, await, własności i anulowaniu | Konkretne kontrakty ograniczonych futures. B10 dodaje słowniczek kodu pomocniczego. Tokio po wprowadzeniu pozostaje opcjonalne. |
| 18 Projekty końcowe | Guessing+, Todo, Log Analyzer, Mini grep i istniejące otwarte zadanie Study Session CLI | Wszystkie pięć rodzin ma autorskie materiały. B08 wyjaśnia rolę zadania końcowego i jego kontrakt. Zaawansowany Durable Log Service jest dodatkiem. |

## Poprawki wynikające z audytu

| Ustalenie | Poprawka i zakres dowodów |
| --- | --- |
| B01 Niezgodność wykonania | Cztery mechanizmy oceny wymagają faktycznego, dokładnego stdout i nie przyznają zaliczenia głównej rodziny. `memory-modify` zachowuje dokładnie pusty wykaz pojęć. |
| B02 Typy proste i przepływ sterowania | Do lekcji dodano liczby, zwracanie wartości, typ jednostkowy, krotki i niezależnie sprawdzane zadania z zakresami. |
| B03 Pamięć i przeniesienie | Dokładny model posiadanego bufora, obserwacja zagnieżdżonego przeniesienia i przejmujące własność API zmiany na wielkie litery. Fizyczny układ stosu wykracza poza kontrakt. |
| B04 Wyjaśnienie i otwarte dowody | Wyjaśnienie przeniesienia i Copy własnymi słowami oraz dodatkowe testy przypadków granicznych poddane samoocenie. Kursant sam ocenia tekst. |
| B05 Typowe wzorce | Tablice, wycinki, sprawdzana arytmetyka na wartościach opcjonalnych, if-let, while-let, let-else i pożyczone wiązania bez Copy. Składnia zgodna dokładnie z Rust 1.85. |
| B06 Projektowanie po podstawach | Dwa zadania z samym problemem w modeling-assessment i iterator-contracts. Kursant wybiera typy, testy i uzasadnienie oraz odpowiada na zmienione wymagania. |
| B07 Derive i spójność implementacji | Kontrakty tożsamości implementacji wyprowadzanej i ręcznej oraz ograniczone wprowadzenie do spójności z własną cechą i własnym typem. |
| B08 Zakres i język | Mapa pierwotnej kontynuacji i zadania końcowego, polskie karty FFI i Miri oraz spójny kontrakt biblioteki standardowej i samooceny. |
| B09 Podział sesji | Opcjonalne przerwy ze stałymi kotwicami w dłuższych lekcjach. Dotychczasowe przerwy Todo i I/O zachowano. Czasy są wstępnymi szacunkami. |
| B10 Dokładność rozszerzeń | Ponownie używany bufor roboczy może rosnąć przy read_line. Odtworzenie obciążenia zachowuje ten sam kontrakt. Surowa powtórka ma oznaczenie. Informacja zwrotna z wyroczni zależy od wybranej opcji. Natywne przykłady negatywne dotyczą cech automatycznych. Słowniczek obserwatora async ma jawnie ograniczony zakres. |

## Dostępność skalibrowanych dowodów

Bieżąca reguła dla kalibrowanych pojęć wymaga dwóch różnych głównych
rodzin zadań sprawdzanych testami, zaliczonych bez pomocy. Samo
udostępnienie zadania zwiększa zakres materiału. Powtórki, przewidywanie,
śledzenie wykonania, dokładny stdout, samoocena i powtarzane aliasy
nie tworzą drugiej głównej rodziny. Dotychczasowe dowody i zapisy
pomocy pozostają w historycznej, surowej postaci. Reguły kalibracji
i schemat zapisu pozostają w dotychczasowym zakresie.

| Pojęcie dotyczące własności | Odrębne główne rodziny autorskie |
| --- | --- |
| stack-heap, scope-drop, copy-semantics | Każde ma zero. Treść pojęciowa i ślady są dostępne, a status pozostaje wstępny. |
| ownership-repair | ownership/read-length. Status wstępny. |
| move-semantics | ownership/read-length, ownership/owned-uppercase |
| function-ownership | ownership/read-length, ownership/function-predicate-v1, ownership/function-return-owned-v1 |
| shared-borrow | ownership/read-length, ownership/shared-count-words-v1, ownership/shared-has-suffix-v1 |
| mutable-borrow | ownership/mutate-append, ownership/mutate-replace, ownership/mutate-surround |

Cztery z ośmiu pojęć własności pozostają wstępne, w porównaniu z
pięcioma przed poprawką. Nowa, wąska rodzina dotycząca przeniesienia
zmienia zakres dostępnych zadań. Z dziewięciu zaawansowanych kalibrowanych
pojęć odbiornik, funkcja zwrotna i adapter dyn mają po dwie rodziny.
Sześć ma po jednej: `async-lending-cancel-commit`,
`async-lending-send-boundary`, `unsafe-miri-byte-view-contract`,
`unsafe-miri-disjoint-regions-contract`, `unsafe-miri-slot-state-contract`
i `unsafe-miri-mut-slot-variance-contract`. Lekcje i kod istnieją dla
wszystkich tych tematów. Wstępny status wynika z reguły dwóch rodzin.
[Definicje zaawansowanych rodzin i datowane dowody wykonania](async-transfer-evidence.pl.md)
zachowują historyczny zakres.

## Istniejące specjalizacje i odroczone prace

| Obszar | Dostępne materiały | Granice zakresu |
| --- | --- | --- |
| Pożyczające funkcje zwrotne, HRTB i GAT | Relacje czasów życia, niezmienniczość mutowalnych pożyczeń, świeża pożyczka przy każdym wywołaniu, elementy pożyczające odbiornik, nakładające się okna przetwarzane kolejno, adaptery przejmujące dane, zmienione kontrakty i przypadki kompilatora | Materiał obejmuje wybrane części systemu typów i ograniczenia kompilatora. |
| Wątki, kanały, stan współdzielony, atomiki i Loom | Rzeczywiste kontrakty pracowników, własności i strażników, modele CAS i porządku pamięci, osobny pakiet Loom | Próby obciążeniowe i skończone modele mają określony zakres przeplotów i nie gwarantują dowolnego postępu ani wydajności. |
| Async, Tokio i pożyczanie | Leniwość, wake i poll, własność, anulowanie, zadania, kanały, limity czasu, select, częściowe I/O, strumienie, cykl prac blokujących, TCP i zamykanie | Trzy kalibrowane pojęcia async mają po dwie rodziny. Anulowanie z zatwierdzeniem i Send mają po jednej. Faktyczne spawn w Tokio wymaga osobnej próby natywnej. |
| Publiczne API, Cargo, wydania, makra i zależności | Rzeczywiści klienci API i własność błędów, zadania z manifestami, funkcje, MSRV, zasady archiwów, efekty, składnia i higiena makr oraz odrębny pakiet konsumenta Cargo | Część klasyfikatorów powtarza tę samą skończoną regułę pod inną nazwą. Bieżące komunikaty o podatnościach, publikacja i pełne decyzje SemVer wymagają dodatkowych kontroli. |
| Mini grep, testy własności i fuzzing | Zmienione kontrakty selekcji, ramek, ścieżek i CLI, niezależna wyrocznia, generator, redukcja i relacje metamorficzne oraz pakiet natywnego fuzzingu | B10 poprawia wskazaną informację zwrotną. Autorskie kampanie sprawdzają określone wejścia i nie zastępują odkrycia przez kursanta. |
| Wydajność, profilowanie i alokacje | Modele obciążenia i kosztu, ponowne użycie bufora, decyzje o zdarzeniach, oknie pomiaru i porównywalności oraz osobny pakiet rzeczywistego profilowania i alokacji | Część zadań od zera powtarza główny algorytm. Długość śladu to wskaźnik pośredni. Wektor widoków nadal może alokować. B10 poprawia sformułowanie dotyczące ścisłego ograniczenia. |
| Unsafe, FFI, Miri i pożyczona pamięć | Kontrakty wywołującego, inicjalizacja, rozłączność, Drop, ponowne pożyczenie i cechy automatyczne, pakiety C i Miri i zastosowanie bezpiecznego opakowania | Cztery kalibrowane pojęcia Miri mają po jednej rodzinie. Wynik w przeglądarce dotyczy kontraktu lekcji. Natywny Miri, poprawność gwarancji pamięci, docelowe ABI i klienci negatywni mają własne granice. |
| Utrzymanie usług i zaawansowany Capstone | Modele przyjęcia, telemetrii, opróżniania i incydentu, pakiet usługi, integracja trwałego idempotentnego zatwierdzenia, wersji i odtwarzania oraz otwarta zmiana K | Część klasyfikatorów przeglądarkowych powtarza regułę, a kryteria projektu służą samoocenie. Faktyczne utrzymanie produkcji, wdrożenie, przegląd zewnętrzny i wynik kursanta wymagają odrębnych obserwacji. |

Etykiety mapy w aplikacji wskazują dostępne implementacje Cargo,
zależności i wydań, profilowania i alokacji, utrzymania usług (`service-operations`) i Study
Session. Przyszłe prace obejmują publikację w rejestrze, bieżącą obsługę
komunikatów o podatnościach, wdrożenie i incydenty produkcyjne,
szersze gwarancje unsafe i wydajności oraz kolejne niezależne
rodziny specjalizacji. Skończony model źródłowy, autorski pakiet
natywny i praca kursanta dokumentują odrębne wyniki.

Następny etap obejmuje dokładnie **dwa kolejne PR-y**. Pierwszy
dodaje dwie lekcje składania operacji mogących się nie powieść,
a drugi jedną lekcję naprawy API i diagnostyki na podstawie
dokumentacji. Oba wykraczają poza tę poprawkę stanu wyjściowego.
Pilotaż można przeprowadzić niezależnie od prac rozwojowych.
Trwałość wiedzy, skuteczność, ogólne opanowanie materiału,
gotowość zawodowa i pełna dostępność mają osobne wymagania.
[Cel i plan wydania](superpowers/plans/2026-10-10-curriculum-baseline-and-synthesis.pl.md)

## Uzupełnienie źródeł A1 — 15 października 2026

Do istniejącej lekcji Send dopisano model synchronicznego przygotowania
i główny kontrakt `prepare_handoff` (`async-lending/send-prepared-handoff-v1`).
Send dołącza do odbiornika, funkcji zwrotnej i adaptera dyn, które mają po
dwie główne rodziny autorskie. Anulowanie z zatwierdzeniem i cztery pojęcia
Miri nadal mają po jednej rodzinie. Cztery wstępne pojęcia własności
zachowują status. Wykaz obejmuje 48 modułów, 192 lekcje, 194 pojęcia,
1271 kroków i 349 źródeł. Liczby opisują dostępność materiału. Nauka
i gotowość zawodowa mają własne kryteria. Zaakceptowaną bazą
utrzymaniową jest zwykły main `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`.
Koordynator przed zmianami potwierdził wszystkie jedenaście zadań
wynikowego main. Weryfikacja kodu A1, przegląd i akceptacja wydania
nadal oczekiwały. Szerszy cel i historyczny zakres dowodów opisuje
[plan kontynuacji i ustalone wymagania A1](superpowers/plans/2026-10-15-advanced-continuation.pl.md).
