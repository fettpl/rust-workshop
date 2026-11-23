# Zainicjalizowany prefiks — kontrakt i zakres dowodów

[English](initialized-prefix-evidence.md)

Materiał o zainicjalizowanym prefiksie rozszerza lekcję
`unsafe-miri-byte-view`. Wprowadza utrzymywaną rodzinę
`unsafe-miri/initialized-prefix-v1` przez dwa nowe kroki.

1. `byte-view-initialized-prefix-model` to uruchamialny model dwóch
   bajtów. Pokazuje zapis `0` i `255` przez `MaybeUninit::write`,
   udostępnienie długości zainicjalizowanej części i wypisanie
   `[0, 255]`. Służy wyłącznie pokazaniu zagadnienia.
2. `byte-view-initialized-prefix` to główne zadanie zastosowania
   wiedzy o następującym ustalonym kontrakcie.

   ```rust
   use std::mem::MaybeUninit;
   #[derive(Debug, PartialEq, Eq)]
   pub struct TooLong;
   pub fn fill_prefix<'dst>(
       dst: &'dst mut [MaybeUninit<u8>],
       src: &[u8],
   ) -> Result<&'dst [u8], TooLong>;
   ```

   Źródło dłuższe od bufora docelowego zwraca `Err(TooLong)` przed
   zapisem. W przeciwnym razie każdy bajt źródła jest kopiowany do
   dokładnego prefiksu bufora docelowego, a zwrócone pożyczenie
   wskazuje na ten bufor. Sufiks pozostaje bez zmian i bez odczytu,
   również gdy nadal jest niezainicjalizowany. Poprawne są wejścia
   puste, wypełniające całą pojemność, wypełniające ją częściowo
   i zawierające dowolne bajty spoza UTF-8. Czas życia źródła może
   skończyć się przed użyciem wyniku. Bufor docelowy nadal musi
   istnieć. `u8` nie wymaga wykonania Drop. Bezpieczny starter
   zawsze zwraca `Err(TooLong)`. Autorskie przykłady niezdefiniowanego
   zachowania nie są prezentowane jako starter, model, rozwiązanie
   ani ogólnie dostępny fragment do uruchomienia.

Model wprowadza `MaybeUninit::write` i rozumowanie o długości
zainicjalizowanej części dla dwóch bajtów. Lekcja i tekst kontraktu
opisują pełne warunki tworzenia wycinka z surowych danych. Model
wyjaśnia, że `MaybeUninit::write` ustanawia zainicjalizowane elementy
i że odczytywać można tylko prefiks o zainicjalizowanej długości.
Końcowa konwersja przez `slice::from_raw_parts` wymaga zakresu dokładnej
długości w żywej alokacji, z wyrównanym wskaźnikiem różnym od null
i z zainicjalizowanymi elementami. Przy długości zero nie odczytuje się
żadnego adresu. Pusty wycinek ma własne wymagania co do wskaźnika
różnego od null i wyrównania. Lekcja zachowuje dotychczasowy wykaz
źródeł i graf wymagań, a przyszły Slot pozostaje poza jej wymaganiami.

Wąski przypadek historyczny `src/content/fixtures/unsafe-miri-pre-prefix.json`
jest kopią bajt w bajt zaakceptowanego stanu sprzed prefiksu.
Projekcja pomocnicza usuwa dokładnie dwa dopisane kroki i
odwołanie do nowego głównego zadania w `unsafe-miri-byte-view-gate`.
Zachowuje dawne kroki, źródła, metadane lekcji i modułu, powtórki
oraz zapisany stan kursanta. Syntetyczne sprawdzenia V1/V2/V3
obejmują siedem ukończonych dawnych kroków, uporządkowaną historię
ponad 24 zdarzeń kontaktu z treścią, szkice, pomoc i odsłonięcia,
notatki, sesje powtórek, oceny, eksport, import i ponowne
wczytanie. Mają oznaczenie dowodów syntetycznych. Obserwacje
kursantów mają odrębny charakter.

Scenariusze przeglądarkowe i offline sprawdzają stan i interfejs.
Obejmują nagłówek głównego zadania, szkic, notatkę, pomoc, pozycję
wznowienia, trwały zapis IndexedDB, panele modelu i głównego
zadania w widoku 390 px, brak poziomego przepełnienia i sterowanie
fokusem edytora przez Tab i Shift+Tab. Asercje zdarzeń sprawdzają
dokładnie lekcję, krok, zastosowanie wiedzy i warunki testu.
Tryb offline zachowuje szkic i notatkę i zgłasza niedostępność
wykonania. Poprawność Rusta i samodzielne zaliczenie wymagają
osobnych dowodów.

Zaakceptowane prywatne źródło z próby wykonalności służyło
projektowaniu. Różni się od autorskich źródeł produktu. Zapis z
16 października przypisuje historycznej próbie 358 scenariuszy,
381 poleceń i audyt interpretera produkcyjnego tylko do odczytu
358/358. Surowe potwierdzenia nie są już przechowywane do świeżej
weryfikacji. Liczby dokumentują historyczny przebieg.

W lokalnym przebiegu naprawczym z 22 października przeszło
1380 testów jednostkowych bez pominięć, wszystkie 2519 autorskich
przypadków Rusta, weryfikacja treści (192 lekcje, 194 pojęcia,
7 śladów) i kompilacja produkcyjna. Pełne produkcyjne testy
przeglądarkowe przeszły 184/184 bez pominięć, niestabilnych
wyników i ponowień. Tryb offline zachował model, główne zadanie,
szkic, notatki, pomoc i dokładne wznowienie. Przy niedostępności
wykonania nie przyznawał zaliczenia kompilacji. Późniejsze testy
regresji kwalifikacji obejmują metadane wersji stabilnej i
odrzucają oznaczenia beta, nightly i dev. Przechwycone odpowiedzi
wykonania sprawdzają interfejs i stan. Osobne autorskie przypadki
Rusta korzystają z kompilatora.

Zachowana kampania Native07 przeszła w wersji stabilnej i
dokładnej MSRV z 118 scenariuszami, 125 poleceniami i 9 kontrolami
w każdym trybie. Próba Miri dotarła do 122 scenariuszy i 131
poleceń, przekroczyła historyczny limit 480 sekund i zachowała
dziesięć oczekiwanych werdyktów oraz błąd mutatora kategorii.
Próba ma status niepowodzenia. Dopasowanie kategorii poprawiono.
Późniejszy błąd kwalifikacji Linuksa wykazał, że kontrola wersji
szukała oznaczeń przedpremierowych w pomocniczych metadanych
Cargo. Teraz sprawdza pierwszą linię wersji i zachowuje dokładną
kontrolę pełnego stdout i skrótu pliku wykonywalnego.

Późniejsza próba Linux Miri CI zakończyła się przed przesłaniem
wyniku. Hostowany proces wykonawczy wyczerpał miejsce podczas
zapisu własnego dziennika diagnostycznego
(`System.IO.IOException: No space left on device`). To awaria
pojemności CI. Zachowane drzewo Native07 pokazuje zapotrzebowanie
na miejsce. Oryginał zajmował około 748 MB na dysku, a jedenaście
kopii kontrolnych z modyfikacjami po około 573 MB. Rozmiary
logiczne wynosiły około 699 MB dla oryginału i 515 MB na
kopię. W trybach stable i MSRV oryginały miały około 59–60 MB
logicznie, a dziewięć kopii w każdym trybie po około 60–62 MB.

Dlatego dedykowane zadanie `miri-safety` usuwa przed konfiguracją
Rusta wyłącznie wskazane dosłownie nieużywane katalogi SDK
Androida i .NET na oczekiwanym wykonawcy Ubuntu hostowanym przez
GitHub. W innym środowisku lub przy innym kształcie ścieżki
kończy się błędem. Po przygotowaniu sysroot Miri wymaga co
najmniej 20 GiB wolnych na systemie plików przestrzeni roboczej
przed kwalifikacją i zapisem artefaktów. Kontrola pojemności
zachowuje potwierdzenia, dane kontrolne, narzędzia, pamięci
podręczne, przestrzenie robocze i pamięć wymiany oraz wewnętrzne
kontrole limitu i kontrakt jedenastu kontroli. Pierwotna
specyfikacja nie narzucała limitu operacyjnego 480 sekund.
Ograniczenia w kursie pozostają takie same. Bieżące
`miri-safety` ma 60 minut. Stable i MSRV mają po 8 minut, a Miri
30 minut łącznie na kwalifikację, polecenia, kontrole, zapis
wyników i zachowanie danych o niepowodzeniu. Plan obejmuje
46 minut z 14 minutami zapasu. Wewnętrzne kontrole limitu i
kontrakt jedenastu kontroli pozostają w mocy. Przekroczenie
limitu daje niepowodzenie. Wcześniejsze niepowodzenia Native07
i Linux CI zachowują status. Późniejsza nieudana próba na
Linuksie dotarła do szóstej z jedenastu kontroli po około
555 sekundach, przed błędem przekroczonego limitu. Zmierzony
czas konfiguracji to 2 minuty i 3 sekundy, od 02:09:09 do
02:11:12 UTC, i mieści się w zapasie zadania. Kontekst
pojemności obrazów opisują
[dokumentacja wykonawców hostowanych przez GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
i [dyskusja o miejscu na dysku obrazu](https://github.com/actions/runner/issues/954).

W następnym przebiegu z kontrolą pojemności po konfiguracji
sysroot pozostało około 27 GiB. Ścisły tryb stable przeszedł z
118 scenariuszami, a Miri nadal przerwało pracę po zebraniu
122. Oczyszczone podsumowanie nie wskazało etapu przerwania.
Wynik pozostaje nieudany z nieustaloną przyczyną. Następna
zmiana diagnostyczna mapuje dokładny prefiks błędu limitu
rejestratora na ustalony publiczny kod, bez ścieżek i surowych
komunikatów.

Istniejący limit jest teraz sprawdzany przed każdą kontrolą
z modyfikacją danych i po niej. Synchroniczna funkcja zwrotna
działa poza obsługą błędu kontroli. Przekroczenie budżetu
przerywa zapis i nie staje się werdyktem kontroli. Ukończone
pakiety kontroli pozostają zapisane. Sukces nadal wymaga
pełnego właściwego wykazu kontroli. Sprawdzenia wykrywają
przekroczenie między kontrolami, bez wywłaszczenia trwającej
operacji synchronicznej i bez wydłużania budżetu. Osobna próba
obserwacyjna CI porównuje rozwiązywanie ścieżek kanonicznych
w JavaScript i natywnie na ograniczonych kwalifikowanych
danych sysroot i prywatnych przypadkach tymczasowych.
Zapisuje wyłącznie ustalone statusy, liczby i czas. Wybór
mechanizmu ścieżek i natywna akceptacja mają odrębne warunki.

Następna próba na Linuksie przeprowadziła 93 porównania, w tym
81 kwalifikowanych wejść sysroot i 12 prywatnych przypadków.
Nie było rozbieżności, również dla brakujących, zerwanych,
cyklicznych i długich łańcuchów ścieżek. Rozwiązywanie trwało
około 61 ms w JavaScript i 30 ms natywnie. Mikropomiar dotyczy
tylko tych wywołań. Przejrzana próba na Linuksie wybiera
najpierw mechanizm natywny i przy dowolnym błędzie ponawia
wywołanie dotychczasowym mechanizmem JavaScript. Pozostałe
platformy zachowują JavaScript. Każde wywołanie jest świeże,
a odczyty, skróty, sprawdzanie granic ścieżek, migawki
zewnętrzne i pełny wykaz kontroli pozostają takie same.
Wariant zapasowy zachowuje obsługę ograniczeń platform i
głębokości dowiązań zgodnie z
[dokumentacją systemu plików Node.js](https://nodejs.org/docs/latest-v22.x/api/fs.html#fsrealpathsyncnativepath-options).
Historyczna próba z limitem 480 sekund nadal ma status
niepowodzenia. Obecne zadanie ma opisany wyżej limit
60 minut i nadal wymaga świeżej ścisłej akceptacji CI.
Podsumowania limitu ujawniają tylko dozwolone ID kontroli
i granicę przed lub po niej, albo ustalony znacznik
niedostępnego etapu.

Późniejszy przebieg na Linuksie z jawnym 30-minutowym
budżetem Miri ukończył ścisły stable i dotarł do rozpatrywania
ścisłych kontroli Miri po około 17 minutach i 25 sekundach.
Miri odpadło z `tamper-control-failed`, a wywołanie natywnego
MSRV nie nastąpiło. Zmieszczenie w budżecie było jedną z
przesłanek próby. Osobna zachowana diagnostyka Native07 Miri
ujawniła błąd mutatora. Wiersz podkreślenia lub pomocy
wspominający Undefined Behavior przedwcześnie kończył
zastępowanie kategorii i pozostawiał późniejszą notę o
alokacji bez zmian. Mutator używa teraz zakotwiczonych
nagłówków błędów semantycznych weryfikatora do rozpoznawania
granic bloków. Test regresji obejmuje całą końcową część
pomocy i alokacji. Warunki akceptacji i wykaz wymaganych
kontroli pozostają takie same. Nadal potrzeba świeżej
ścisłej akceptacji CI.

Nieudana ocena kontroli semantycznej ujawnia tylko ustalone
ID kontroli, wartość logiczną odrzucenia, kod oczekiwanej
przyczyny i skończony zbiór zaobserwowanych kodów przyczyn.
Znane kody semantyki i mechanizmu kontroli są rozróżnialne.
Nieznane otrzymują `other`. Diagnostyka obejmuje wyłącznie
błędy kontroli semantycznej. Błędy wykazu, duplikatu,
nieoczekiwanej kontroli, braku kontroli i złej bazy
zachowują nadrzędne kody przyczyn bez dodatkowej projekcji
kontroli. Dawne błędy bez tej diagnostyki nie identyfikują
kontroli. Surowe ścieżki, komunikaty, strumienie, skróty
i wartości środowiska pozostają prywatne. Warunki akceptacji
pozostają w mocy.

Pełna akceptacja natywna wymaga dedykowanych kontroli CI.
Akceptacja wydania wymaga wszystkich jedenastu kontroli na
dokładnym commicie czołowym PR i jedenastu na wynikowym
commicie `main`. Wyniki śledzi
[PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

Liczby opisują dostępne treści. Oczekiwana zmiana po integracji
to wzrost z 1273 do 1275 kroków i spadek z czterech do trzech
zaawansowanych rodzin o statusie wstępnym. Poziom zawodowy
kursantów, przyszłe etapy, skuteczność nauki, pilotaż, hosting
i gotowość wymagają osobnych dowodów.
