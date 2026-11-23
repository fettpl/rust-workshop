# Kolejność lokalnych prac

[English](local-development-queue.md)

Data: 22 października 2026 r. Uzupełnienie dotyczące dalszych prac lokalnych:
26 października 2026 r.

Kolejka rozpoczyna się od commita `7c760e3` na `main`. Etap utrzymania lokalnych
testów natywnych zakończono na osobnej gałęzi. Integracja ćwiczeń o rozłącznych
zakresach przeszła lokalną weryfikację i niezależny przegląd. Blokada rozliczeń
GitHub Actions ma według ówczesnych informacji potrwać do resetu
1 listopada 2026 r. W tym okresie zadania pełnej weryfikacji `main` w ogóle się
nie rozpoczęły. Jest to wynik działania infrastruktury planującej zadania i nie
mówi o poprawności kodu ani aplikacji. Akceptacja w GitHub Actions, zdalna
integracja, wydanie i publikacja wciąż oczekują.

## Dalsze prace zatwierdzone przez osobę utrzymującą projekt

24 października 2026 r., po niezależnym przeglądzie lokalnych przygotowań do
wydania OSS, osoba utrzymująca projekt wyraźnie zezwoliła na kontynuację prac w
zatwierdzonej kolejności. Publiczne wydanie OSS wymaga dostępności Actions oraz
spełnienia osobnych warunków dotyczących prywatności, integracji i ręcznej
publikacji. Zachowany kandydat na wydanie OSS pozostaje poza zakresem zmian tej
funkcji kursu. Kontynuuj na oddzielnych gałęziach lokalnych, bez pushowania,
zmian zdalnego repozytorium i integracji z `main`. Przyszłe wymagania CI nadal
obowiązują.

## Lokalny przebieg pracy

Każdy etap pozostaje na własnej lokalnej gałęzi. Osoba wprowadzająca zmiany
uruchamia najpierw kontrole dotyczące zmiany, a następnie wymagany lint, kontrolę
typów, walidację treści i pełny zestaw testów z udokumentowanymi wymaganiami dla
zaufanych danych testowych. Obciążające kontrole uruchamia kolejno. Zapisuje
pełne polecenia, liczby zaliczeń, pominięć i błędów, wersje narzędzi oraz
ograniczenia infrastruktury. Nie uruchamia natywnie kodu kursantów ani kodu z
importu. Sprawdza własny diff i uzyskuje niezależny przegląd przed przekazaniem
wyniku koordynatorowi.

Lokalny etap jest gotowy, gdy zmiana ma określony zakres i nadaje się do przeglądu,
a do niej dołączono świeże wyniki lokalne, commit z angielskim opisem i raport
możliwy do odczytania poza maszyną autora. Lokalny wynik nie potwierdza akceptacji
w GitHub Actions, zaliczenia kontroli `main`, gotowości do wydania, szerszego
zakresu testów ani osiągnięć kursanta.

## Kolejność prac

1. Utrzymanie lokalne i uporządkowanie weryfikacji.
2. Samodzielne zastosowanie kontraktu rozłącznych zakresów. Materiał jest napisany,
   a lokalna weryfikacja i niezależny przegląd zakończone.
3. Gotowość OSS i publiczne wydanie. Lokalne przygotowanie ukończono i sprawdzono
   w przeglądzie. Publiczne wydanie czeka na spełnienie odrębnych warunków
   zewnętrznych.
4. Samodzielne zastosowanie leniwej inicjalizacji `Slot`. Zakończono lokalną
   weryfikację, niezależny przegląd i przygotowanie punktu odtworzenia.
5. Samodzielne zastosowanie callbacku o ograniczonym zakresie i wariancji
   `MutSlot`. Bieżący odrębny kandydat lokalny.
6. Uzgodnienie dowodów dla podstaw A5. Samodzielna naprawa błędu własności,
   obserwowalne kontrakty zasięgu i `Drop` oraz kontrakty `Copy`. Twierdzenia
   dotyczące stosu i sterty pozostają ograniczone do opisanego modelu pojęciowego.
7. A6. Zadanie łączące umiejętności utrzymania biblioteki Frame Protocol.
8. A7. Badanie wydajności przy zmienionym obciążeniu oraz dobór strategii testów.
9. A8. Zadanie łączące utrzymanie i odzyskiwanie usługi i projektu końcowego.
10. A9. Końcowe uzgodnienie zakresu zaawansowanego, wymagań wstępnych i zalecanej
    ścieżki.

Prace nad kolejnymi funkcjami nadal trafiają na osobne gałęzie i do osobnych
PR-ów. Etap OSS wymaga zakończenia lokalnych kontroli rozdziału o rozłącznych
zakresach, niezależnego przeglądu i commita po angielsku. Pozostaje odrębny od
nowych rozdziałów, aktualizacji zależności i zmian projektu aplikacji. Lokalne
przygotowanie jest zakończone. Powyższa decyzja pozwala pracować nad `Slot`, gdy
publikacja jest odroczona. Wydanie wymaga zgody na licencje i oznaczenie
autorstwa, CI na dokładnym commicie PR-u i kontroli wynikowego `main` po
przywróceniu Actions, a także ręcznej publikacji w GitHub i kontroli po
publikacji. W trakcie wstrzymania Actions prace pozostają lokalne, bez
publikacji, zmian rozliczeń i uruchamiania hostingu. Gdy Actions będą znów
dostępne, każda integracja wymaga niezależnego przeglądu i świeżych wymaganych
kontroli na dokładnym commicie gałęzi funkcji i na wynikowym commicie `main`.
Wcześniejsze uruchomienia pozostają zapisem historycznym.

## Odzyskiwanie i ograniczenia dotyczące harmonogramu

Przed porządkami lub migracją na inną maszynę zachowaj kopię offline lokalnego
repozytorium wraz z `.git` poza iCloud. Dla tej kolejki nie twórz nowych
zaplanowanych automatyzacji. Lokalne utrzymanie zakończono na commicie
`d12d789fc3e35bb7ef4b8cbacb571079a2570a4e`. Świeży pełny zestaw testów odnotował
1 426 zaliczeń i jeden pominięty test wymagający jawnego włączenia. Lint zgłosił
zero błędów i 29 istniejących ostrzeżeń. Kontrola typów i walidacja treści
zakończyły się pomyślnie. Niezależny przegląd zaakceptował zmianę bez uwag.
Zdalna akceptacja jest wstrzymana, a scalenia i kontroli `main` nie wykonano.
Jeśli koordynator utworzy lokalne archiwum Git, zachowaj je z
materiałami do odzyskiwania offline. Utworzenia archiwum dotąd tu nie
potwierdzono.

## Kandydat dotyczący rozłącznych zakresów

[Przenośny opis kontraktu i granic dowodów](disjoint-range-transfer-evidence.pl.md)
przedstawia dodany model i zadanie główne, zachowane historyczne identyfikatory i
zasady pomocy, ograniczone przypadki natywne oraz stan lokalnej akceptacji. Kod
źródłowy dodaje dwa kroki (z 1 275 do 1 277), zachowując 48 modułów, 192 lekcje,
194 pojęcia i 349 źródeł. Uwagi do modelu i sformułowań rozwiązano w niezależnym
przeglądzie. Zakończono lokalne testy jednostkowe, testy Rust, budowanie,
produkcyjne E2E, kontrole offline i niezależny przegląd. Następnie przygotowano
lokalnie wydanie OSS. Decyzja opisana powyżej zezwala na implementację `Slot`, a
publiczne wydanie i zdalna akceptacja pozostają odroczone.
[Kontrakt samodzielnego zastosowania `Slot`](slot-lazy-init-transfer-evidence.pl.md)
dokumentuje kolejną osobną rodzinę zadań głównych i granice jej weryfikacji.

## Ciągła kontynuacja lokalna — 26 października 2026 r.

Osoba utrzymująca projekt zezwala na realizację zatwierdzonej kolejności bez
ponownego pytania po każdym lokalnym etapie. Każda funkcja zachowuje osobną
gałąź, adekwatne testy, niezależny przegląd, commity po angielsku i punkt
odtworzenia. [Wymagania z 15 października](superpowers/plans/2026-10-15-advanced-continuation.pl.md)
określają zakres i kolejność A5–A9 po bieżącym [zadaniu `MutSlot`](mut-slot-with-mut-transfer-evidence.pl.md).
Przed każdą implementacją opracuj projekt w ograniczonym zakresie na podstawie
faktycznych bieżących kontraktów. Oznaczenie tematu jako otwartego w historycznym
planie wymaga potwierdzenia w aktualnym stanie.

Utrzymuj świadomy podział na Core17 i rozszerzenia. Pierwotna ścieżka kontynuacji
i zadanie Study Session powinny być łatwe do znalezienia. Specjalizacje
zaawansowane mają własne wymagania wstępne. Zachowaj historyczne liczby wraz z
ich źródłami. Rozróżniaj dostępność materiału, samodzielne programowanie, powtórkę
po przerwie, samodzielny przegląd i obserwowane wyniki. Kontrole oprogramowania nie
potwierdzają opanowania materiału, poziomu senior ani gotowości zawodowej.

Nadal obowiązują warunki dotyczące pushowania, zmian zdalnego repozytorium
projektu lub `main`, hostowanych Actions, widoczności, publikacji, płatnej
infrastruktury i wdrożenia. Prace te pozostają poza lokalnym zakresem. Publiczne
wydanie i przyszłe kontrole integracyjne na dokładnym commicie nadal czekają.
Zachowaj zamknięte etapy lokalne i związany z nimi materiał dowodowy.

## Lokalna kontynuacja A11 — 4 listopada 2026 r.

[Zmiana dotycząca typowanej autoryzacji](service-authorization.pl.md) dodaje
cztery lekcje rozdzielone według operacji i osobny pakiet natywny, z syntetycznymi
podmiotami i rozliczaniem ograniczonej liczby przyjętych zadań. Przekazanie kodu
T1 i T2 oraz lokalne przeglądy o określonym zakresie poprzedzają prace nad
przeglądarką i dokumentacją. Sześć produkcyjnych scenariuszy przeglądarkowych
zapisano w kodzie. Samo wykrycie scenariuszy przez narzędzie nie oznacza ich
wykonania. Końcowa weryfikacja wymaga własnej kompilacji produkcyjnej, dokładnych
sum kontrolnych źródeł i archiwów, prób przeglądarkowych bez ponowień, kontroli
natywnych i kontroli modeli z lekcji oraz niezależnego przeglądu. Weryfikuj na
nowo uruchomionym serwerze i w osobnej sesji przeglądarki, z bieżącym źródłem.
Ustalenie pochodzenia obejmuje określony zakres i następuje po skoordynowanym
przygotowaniu zmian. Lokalna kontynuacja nie zezwala na push, aktualizację
`main`, publikację, wdrożenie, pobieranie zależności ani uruchomienie hostowanych
Actions. Wcześniejsze informacje o harmonogramie i rozliczeniach mają charakter
historyczny i dotyczą wskazanych dat.

## Kod źródłowy zmian schematu plików A12 | 10 listopada 2026 r.

[Plan 004](../plans/004-file-schema-evolution.pl.md) wychodzi od zaakceptowanego
stanu po utrzymaniu oraz świeżych obserwacji rejestru, stanu i archiwów.
[Rozszerzenie](file-schema-evolution.pl.md) dodaje dwie lekcje i pakiet
wykorzystujący bibliotekę standardową. Ćwiczenia przeglądarkowe oceniają jedną
rodzinę normalizacji. Pakiet sprawdza jawne aktualizacje plików na zaufanych
danych testowych z jednym procesem zapisującym. Bieżące źródło dodaje jeden moduł
i projekt, zachowując 17 modułów Core i 30 wcześniejszych archiwów.

Ukierunkowane kontrole pakietu poprzedzają uruchomienie dedykowanego weryfikatora
natywnego i pełną weryfikację źródła. Przed uruchomieniem profili natywnych stable
i MSRV ustal zainstalowane narzędzia, dokładne bajty źródeł i archiwów oraz
przydzielone do tej weryfikacji ścieżki tymczasowe. Do zamknięcia etapu potrzebne
są świeże kontrole statyczne, testy jednostkowe, autorskie testy Rusta,
produkcyjne kontrole przeglądarkowe, formalne kontrole offline, niezależny
przegląd i pełna możliwość odzyskania lokalnej historii. Hostowane Actions,
integracja z repozytorium zdalnym i `main`, wdrożenie oraz publikacja pozostają
poza zakresem lokalnego etapu.
