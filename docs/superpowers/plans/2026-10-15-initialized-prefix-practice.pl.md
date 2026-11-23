# Ćwiczenia z zainicjalizowanego prefiksu — plan wdrożenia

[English](2026-10-15-initialized-prefix-practice.md)

Plan dodaje do istniejącej lekcji `unsafe-miri-byte-view` jedną niezależnie ocenianą rodzinę zadań o przejściu od inicjalizacji do pożyczki. Zachowuje wszystkie wcześniejsze kroki, aliasy, powiązania ze źródłami, zapisy przeglądów, wymagania wstępne i sposób odtwarzania historii uczestnika. Zaakceptowanym stanem źródłowym przed A3a jest commit `main` o identyfikatorze `3b95d5812891eafd9b867382c53787055cc87208`. Prace nad zainicjalizowanym prefiksem śledzi [PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

Ścieżki w planie są względne wobec katalogu głównego repozytorium. Analiza wykonalności wykonana w trybie odczytu i prywatne obserwacje mogą pomóc w pracach. Dane wykonawcze i dowody dotyczące produktu wymagają odrębnej weryfikacji. Pierwotny plan zakładał tekst dla uczestnika po polsku, a ten plan i dokumentację repozytorium po angielsku.

## Ustalony kontrakt

```rust
use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong>;
```

Funkcja zwraca `Err(TooLong)` przed pierwszym zapisem, jeśli `src` jest dłuższe od `dst`. W przeciwnym razie kopiuje wszystkie bajty źródłowe w kolejności dokładnie do prefiksu bufora i zwraca pożyczkę tego prefiksu. Końcówkę bufora pozostawia bez zmian i jej nie odczytuje, również wtedy, gdy jest nadal niezainicjalizowana. Poprawne przypadki to puste wejście, pełne i częściowe wykorzystanie pojemności oraz dowolne bajty, także spoza UTF-8. Niepusty wynik wskazuje do bufora docelowego. Kontrakt nie określa tożsamości wskaźnika dla pustego wyniku. Źródło może przestać istnieć przed użyciem wyniku, lecz nie można wtedy użyć bufora docelowego z pominięciem aktywnej pożyczki. Typ `u8` nie wymaga `Drop`.

Dopuszczalne są dwie utrzymywane poprawne implementacje: zapis element po elemencie i kopiowanie całego prefiksu po sprawdzeniu długości. Kontrakt dopuszcza pętle i określone tokeny oraz tymczasową alokację. Wynik musi jednak wskazywać na bufor docelowy. Bezpieczny starter bezwarunkowo zwraca `Err(TooLong)`. Starter, model, rozwiązanie i publiczna funkcja wyodrębniająca nie powodują niezdefiniowanego zachowania.

## Zestaw autorskich materiałów i struktura lekcji

Przyjęta podstawa zawiera 48 modułów, 192 lekcji, 194 pojęć, 195 kompetencji, 1,273
kroków, 349 źródeł, 194 zwyczajnych przeglądów i 199 zarejestrowanych przeglądów. Ta
funkcja zmienia oryginalną dostępność do 1 275 kroków. W obrębie `unsafe-miri-byte-view`, lekcja rośnie z
siedmiu do dziewięciu kroków; moduł pozostaje na ośmiu kryteriach, jego referencje
zadania rosną z 16 do 17, a bramy dowodów rośnie z 12 do 13. Zaawansowana tymczasowa
liczba rodzin zmienia się z czterech do trzech po integracji. Są to liczby autorami
treści, a nie wyniki uczenia się.

Dołączyć dokładnie dwa kroki po siedmiu istniejących:

1. `byte-view-initialized-prefix-model`, zatytułowany `Od storage do zainicjalizowanego prefiksu`. Jest to dwubajtowy model ekspozycji, który pisze `0` i `255` z
   `MaybeUninit::write`, publikuje inicjalizowaną długość i drukuje `[0, 255]`. Nie ma kodowania ani bramki z
   dowodami.
2. `byte-view-initialized-prefix`, zatytułowany `Zainicjalizuj prefiks i pożycz wynik`. Jest to podstawowe zadanie transferu z rodziną `unsafe-miri/initialized-prefix-v1`, dowód w
   wersji 2 i brama dowodów. Dodać tylko to pierwotne odniesienie do `unsafe-miri-byte-view-gate`.

Model uczy rozumowania inicjalizowanego długości, dokładnego `from_raw_parts` bezpieczeństwa, pustego
non-null/alignment zasad, czasu trwania podróży i braku zobowiązania `Drop` dla `u8`; nie jest to pełne
rozwiązanie. Nie dodawać `Slot` warunku. Istniejące aliasy pozostają `unsafe-miri/byte-view-v1`, a narażenie,
wybór, odzyskanie, przegląd i pomoc w pracy nigdy nie stają się nową rodziną podstawową.

## Niezmienniki weryfikacji

Lekcja bezpieczna dla przeglądarki eksportuje kompletne 42-skrzyniowe uprząż i oba
mechanizmy dźwiękowe. Eksponuje również czternaście poddanych przeglądowi SAFE wariantów
semantycznych, z których każdy ma zamiar nazwać twierdzenia i konkretne odrestaurowane
wdrożenie. W odniesieniu do każdego mechanizmu należy uwzględnić trzy odrębne lifetime/borrow pary
graniczne, skorygowane zwykłe twierdzenia oraz dodatnie wartości w okresie życia źródła.
Uruchom pełne 42 skrzynie dla obu mechanizmów na obecnej stabilnej i dokładnej Rust 1.85;
zastosuj przypięty nocny łańcuch narzędzi Miri, gdzie utrzymany dowód Miri tego wymaga.

Matryca kompilatora musi przechowywać rzeczywiste kody diagnostyczne, lokalizacje
ekspresji pierwotnej, mnożniki, ogranicznik i diagnostykę zabezpieczeń. Błędne kody,
tyczki, brak lub dodatkowa diagnostyka, a częściowe zestawy testowe zawodzą. Osprzęt
pomijany tylko przez Miri jest prywatny dla utrzymującego się weryfikatora i przypiętego
nocnego łańcucha narzędzi. Jego dźwiękowy bliźniak musi przejść; wynik semantyczny
wymaga najwcześniejszego autorskiego wymuszonego czytania i jego kategorii. Ustawienie,
nieobsługiwane, timeout, spawn, sygnał lub ogólne wyniki niezerowe są porażkami.

Capture zachowuje surowe stdout, stderr, status, polecenie, source-before/source-after bajty, executable/config/toolchain metadane,
archiwa, hashes i paragony strażnika przed późniejszą klasyfikacją lub niepowodzeniem
archiwum. Odrzucenie związane ze źródłami jest ortogonalne w stosunku do diagnostyki
pochodnej: diagnostyka zależna od źródła, zwykła interpretacja paniki, klasyfikacja Miri
i wyniki testu bibliotecznego nie mogą być wykonywane na niezaufanym źródle. Surowy
ładowarka nie zamyka się na nieobecnych, częściowych, stęchłych lub odgadniętych
obserwacji, i akceptuje tylko zrewidowany, specyficzny dla trybu pakietu.

Rekord 16 Października przypisuje 358 zapisów receptur, 381 poleceń i 358/358 tylko do
odczytu audyt interpretacyjny do historycznego przechwytywania. Jej surowe wpływy nie są
już zatrzymywane do celów ponownej weryfikacji; dane te są jedynie przypisywaniem
historycznym, a nie obecnymi danymi przechowywanymi lub surowo potwierdzonym akceptacją.

W punkcie kontrolnym 22 Października walidacja lokalna przebiegała bez potknięć z
bazowym zestawem 1380-testowym, ze wszystkimi 2519 oryginalnymi przypadkami Rusta,
walidacją treści (192 lekcji, 194 pojęć, 7 śladów) oraz budową produkcji. Kompletny
pakiet przeglądarki produkcyjnej przeszedł 184/184 bez skipów, płaskich wyników lub
ponownych prób. Kontrole offline zachowały model inicjalizowany-prefix, zadanie
podstawowe, projekt, notatki, pomoc, i dokładne wznowienie, przy jednoczesnym zatajaniu
kredytu kompilatora, gdy wykonanie było niedostępne. Dalsze regresje kwalifikacji
wykonują stabilne metadane wersji i odrzucają beta/nightly/dev żetony wydania. Przeglądarka sprawdza
z przechwytowanymi odpowiedziami biegacza ustawia zachowanie UI/state; oddzielne sprawdzanie
zaufanego uchwytu Rusta są kompilator-backed.

Zachowana Native07 kampania przeszła stabilną i dokładną MSRV z 118 receptur, 125 poleceń i 9
sterów na tryb. Jego próba Miri osiągnęła 122 receptury i 131 komend, przekroczyła
historyczny 480-sekundowy termin i zachowała dziesięć oczekiwanych werdyktów plus błąd
kategorii-mutatora. Próba nie powiodła się. Kategoria matcher jest poprawiona.
Późniejsza awaria kwalifikacji Linuksa ujawniła sprawdzanie wersji, które skanowało
pomocnicze metadane Cargo dla słów prerelease; czek teraz zatwierdza pierwszą linię
wydania przy jednoczesnym zachowaniu dokładnego pełnego stdout i wykonywalne-hash
kwalifikacji.

Pełna akceptacja rodzima wymaga specjalnych CI kontroli. Akceptacja zwolnienia wymaga
wszystkich jedenastu kontroli dokładnej PR głowy i wszystkich jedenastu na wynikowym
`main` commit; wyniki są śledzone w [PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

Oryginalny raport nie zawierał żadnych wymogów eksploatacyjnych na 480 sekund, ani też
ograniczeń dotyczących uczenia się. Bieżący `miri-safety` praca ma 60 minut przerwy z planem
operacyjnym stabilnym 8 minut, MSRV 8 minut, a Miri ma 30-minutowy całkowity termin
pełnej kampanii przechwytywania i kontroli, w tym kwalifikacji, poleceń, sterowania, i
zatrzymania awarii, łącznie 46 minut i pozostawiając 14 minut na ustawienie headroom.
Zmierzony odstęp pomiędzy ustawieniami w próbie Linuksa wynosił 2 minuty 03 sekund, od
02: 09: 09 do 02: 11: 12 UTCi jest częścią tej sali. Wewnętrzne kontrole terminów
współpracy, wszystkie jedenaście kontroli oraz niezamknięte zasady akceptacji pozostają
bez zmian. Wcześniejsze 480 sekund Native07 i Linux CI porażki pozostają nieudanymi wynikami
historycznymi.

Wąskie przedprefiksowe urządzenie jest kopiowane bajt-for-byte z akceptowanego migawki
źródłowego. Jego historyczna projekcja usuwa dokładnie dwa dołączone etapy i jedno
podstawowe kryterium odniesienia. Syntetyczny V1/V2/V3 budowniczych zachować uporządkowane
historie ponad 24 kontakty, projekty, notatki, help/reveal stan, sesje przeglądowe, oceny, export/import,
i przeładować; są one oznaczone syntetyczne i nigdy nie przedstawione jako obserwacje
ucznia.

## Etapy wdrażania

### 1. Integracja źródeł ze ścieżką uczestnika

- Dodawać the przeglądarka-bezpieczny inicjalizowany-prefix eksport, kompletny 42-case
  uprząż, oba dźwiękowy mechanizm, czternaście SAFE wariant, the revieved SAFE mutant, the
  bezpieczny starter, i the dwa zamówiony lekcja krok.
- Zachować stare obiekty lekcyjne, źródło IDs, daty, metadane, wymagane krawędzie,
  pseudonimy i semantyki kryterium. Przekieruj dokładne urządzenie podstawowe przed
  jakimkolwiek szerokim ByteView zapałki; nieznany uchwyt IDs zawiedzie wyraźnie.
- Dodać wąski przedprefiks i komponować jego projekcję w historycznych dzwoniących bez
  zmiany przyjętych starych opraw lub kompatybilności pomocników.
- Utrzymuj natywny weryfikator, rejestrator, pakiet dowodowy i zawartość bezpiecznej
  przeglądarki oddzielone. Moduły przeglądarek nie mogą importować kodu Node/native; rodzime
  pomocnicy nie mogą akceptować ścieżek uczących się, arbitralnych wykonań, arbitralnych
  łańcuchów narzędzi ani importu Vitest.
- Dodać autorskie browser/offline scenariusze dla modelu i lekcji podstawowej, dokładne drafts/notes/help/resume
  zachowanie, trwałe IndexedDB stan, export/import, 390px układ, i Tab / Shift + Zachowanie edytora Tab.
  Niedostępność offline runner musi pozostać wyraźna i nie może przyznawać poprawności
  Rust lub niezależnego kodowania kredytu.
- Aktualizacja README, zaawansowana mapa, ten plan oraz granica dowodowa z tą samą umową i
  uczciwą granicą weryfikacji.

### 2. Integracja obserwacji i przegląd dowodów

- Przegląd aktualnego źródła, zaufanego ładowacza specyficznego dla trybu, rejestratora,
  natywnego wpisu, klasyfikatorów dowodów i zamówienia wiążące źródło jako jednego
  dokładnego cięcia źródła. Ładowarka rozpoczyna nieokreślone i zużywa tylko przeglądane
  obserwacje.
- Zachować świeże tylko do odczytu audyt tłumacza kompletnego rodzimego przechwytywania;
  historyczne liczby kontroli nie mogą zastąpić bieżących wpływów. Trzy zweryfikowane
  syntetyczne systemy plików przechodziły na prawidłowe oryginalne i skopiowane linie
  bazowe, zachowując original/external bajty oraz zamierzone wyniki skończone.
- Przeprowadź 9 stabilnych i 11 spraw Miri przeciwko rzeczywistym klonowanym rodzimym
  bajtom. Ważne linie bazowe muszą przejść; każda mutacja musi odrzucić z zamierzonego
  powodu skończonego. Surowe pakiety i zwrócone decyzje kontrolne muszą się zgadzać.
  Zachowaj wszystkie ustawienia, straż, timeout, archiwum i niepowodzenia transportu.
- Użyć ukończonego source/proof przeglądu i wykwalifikowanych metadanych do przygotowania
  autoryzowanej ścisłej kampanii. Rozwiąż wszelkie nieudane zamknięcie środowiska przed
  stwierdzeniem akceptacji. Prywatne pozycje wykonalności, syntetyczne wyniki i
  wcześniejsze uchwyty nie mogą stać się bieżącymi obserwacjami rodzimych.

### 3. Ponowna weryfikacja produktu i wydania

- Uruchom kompletną stabilną, dokładną Rust 1.85 i przypiąć nocną kampanię Miri: pełne
  42-skrzyniowe pozytywy dla obu mechanizmów; czternaście SAFE wariantów z kompilacją,
  zamierzoną wyizolowaną awarię, przywrócone pełne i odrestaurowane wyniki; trzy pary
  brzegowe na mechanizm; pozytywy źródła życia; para Miri UB/sound-twin; kontrolery
  klasyfikacyjne; oraz kontrole manipulacji weryfikatora.
- Uruchom zachowaną szczelinę, format, TypeScript, content/source straż, pełny apartament jednostkowy, Rust/native
  kontrole, budowę produkcji, produkcyjny pakiet przeglądarki oraz weryfikację offline
  na dokładnym proponowanym źródle. Przeglądanie pulpitu, mobilne, klawiatura, CV,
  historia i offline zachowanie stanu.
- Po lokalnych kontrolach i niezależnej source/spec-quality recenzji, przygotować jedną angielską
  funkcję commit, nacisnąć go i otworzyć żądanie ciągnięcia. Rozwiąż bieżący
  zautomatyzowany Codex/security przegląd i wymagają wszystkich jedenastu naturalnych kontroli
  dokładnej PR głowy przed już autoryzowanym zwykłym połączeniem. Wymagane wszystkie
  jedenaście kontroli wynikających `main` commit przed kolejną funkcją kursu. Odśwież tylko
  własny podgląd.

## Kryteria ukończenia

Funkcja jest zdatna do uwolnienia tylko wtedy, gdy wszystkie z poniższych elementów są
prawdziwe:

1. Źródło nie ma błędów TypeScript, czyste testy przechodzą, a wszystkie trzy zweryfikowane
   wywołania systemu plików przechodzą z poprawną oryginalną i skopiowaną linią bazową.
   Dziewięć stabilnych i jedenaście Miri kontroli inwentaryzacji akceptują ważne
   podstawowe i odrzucają rzeczywiste klonowane mutacje bajtów z zamierzonych powodów
   bez zmian pierwotnych lub zewnętrznych.
2. Znormalizowane 118/118/122 zapasy receptur i 48/48/64 inwentaryzacji źródeł pasują dokładnie do
   zebranych danych. Zachowuje się wszystkie 20 błędów kompilatora, 22 podstawowe
   zakresy, 84 zamierzone paniki oraz najwcześniejsze zdarzenia z użyciem siły odczytu
   Miri. Akceptacja korzeni bundle/provenance pozostaje udokumentowana oddzielnie od realizacji.
3. Obecny interpreter produktów akceptuje kompletny, świeży, prawdziwy spis receptur w
   analizie tylko do odczytu, w tym zwykłe pełne ciała awarie, podczas gdy znaczące
   uszkodzone wyjście, źródło, kod i kontroli kategorii pozostają odrzucone. Przypisanie
   historyczne 358/358 nie spełnia tego wymogu, a akceptacja wyłącznie do odczytu nie
   stanowi pełnego ścisłego dowodu.
4. Świeże, surowe przebiegi przechodzi prąd stabilny, Rust 1.85, i przypięte Miri z
   kompletnymi manifestami, dokładne zapasy, kontrole semantyczne, rzeczywiste
   obowiązujące kontrole, byte/transport/deadline/guard kontroli, i oryginalnej niezmienności. Specjalna CI praca
   wykorzystuje udokumentowany 60-minutowy czas pracy i 8 + 8 + 30-minutowy plan trybu;
   ten czas jest headroom wykonania, nie dowód akceptacji lub limit ucznia.
5. Wymagane kontrole integracyjne produktu przekazują dokładne źródło, w tym pełną
   jednostkę, Rust/native, budowę, przeglądarkę, offline, desktop/mobile/keyboard, wznowienie i zachowanie historii.
   Nie ma mowy o żadnym ludzkim pilocie ani rozmieszczeniu.
6. Jedna funkcja angielska commit/PR przechodzi przegląd całego oddziału, obecny automatyczny
   przegląd, i wszystkie naturalne PR kontrole; zwykłe połączenie następuje zielone
   wyniku głównych kontroli. Brak kontroli gwarantuje starszeństwo, opanowanie,
   skuteczność edukacyjną, gotowość zawodową, hosting, lub rozmieszczenie.

Do czasu utrzymania tych warunków dokumentacja musi opisać źródło jako autorkę A3a
cięcia w trakcie przeglądu i utrzymać przypisywanie historyczne, świeże wyniki
syntetyczne i kwalifikacje metadanych oddzielone od oczekujących ścisłych rodzimych UI,
CI oraz kontroli wydania.
