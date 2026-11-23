# Zmiana pojemności i przegląd w Durable Log Service

[English](capstone-change-review.md)

Rozszerzenie M10 przekształca dotychczasowe zadanie o limicie K na
strumień w lokalne ćwiczenie inżynierskie w Ruście. Po przeglądzie
kursant zmienia własne rozwiązanie. Rozszerzenie wynika z
[priorytetów projektów i praktyki z 6 października](curriculum-review-2026-10-06.pl.md)
oraz [priorytetu samodzielnego projektu z 8 października](curriculum-review-2026-10-08.pl.md).
Pierwotne polecenie opisujące problem K pozostaje częścią tego samego
Capstone. Nowe materiały zawierają arkusz, scenariusz zmiany pojemności
z zachowaniem danych po restarcie oraz zaufaną weryfikację rozwiązania
referencyjnego. Zmiana zachowuje dotychczasowe lekcje, rodziny
dowodów i stan aplikacji.

## Zachowanie referencyjne i zgodność

Rozwiązanie referencyjne dodaje konstruktor
`Store::open_with_stream_limit(path, max_events, per_stream_limit)`,
używa dodatniego limitu `NonZeroUsize` i rozpoznaje strumień na podstawie
`Event.source`. Decyzja o przyjęciu liczy zatwierdzone wiersze wewnątrz
transakcji po sprawdzeniu istniejącej tożsamości. Identyczne ponowienia
zachowują oryginalne potwierdzenia. Zmieniona treść lub korelacja nadal
powoduje konflikt. Nowa tożsamość przy wyczerpanym limicie daje `Full`,
bez wiersza i potwierdzenia sukcesu. Limit globalny działa niezależnie.

`Store::open(path, max_events)` nadal stosuje tylko limit globalny.
Config usługi, protokół klienta i domyślne działanie zostają zachowane.
Domyślna usługa działa bez limitu K na strumień. Zmiana ustawień polega
na zamknięciu i ponownym otwarciu magazynu z nowym K. Testy referencyjne
zatwierdzają dwa wiersze przy K=2, otwierają magazyn ponownie z K=1
bez usuwania danych, a następnie przy K=3 przyjmują dokładnie jeden
dodatkowy wiersz. Sprawdzają potwierdzenia, pierwszeństwo konfliktu,
inne źródło, pojemność globalną, restart i wybrane błędy magazynu.
Integracja klienta i usługi w kodzie kursanta oraz współbieżność wielu
klientów lub procesów wymagają własnych testów.

## Samodzielna praca kursanta i przegląd

Oba warianty do pobrania zawierają polski arkusz `CHANGE-REVIEW.md`.
Pakiet startowy podaje problem i prosi o obserwacje. Kursant sam
wybiera konstruktor, SQL, typy wewnętrzne i architekturę. Identyfikuje
własne wersje źródeł i narzędzi, porównuje dwa projekty rozwiązania,
zapisuje faktycznie nieudane polecenie i poprawkę, wskazuje testy
regresji i wypełnia tabelę obserwacji. Do późniejszej sekwencji
K=2 → K=1 → K=3 przystępuje po przeglądzie pierwszej wersji.

Dalsze zadanie i rozwiązanie są publiczne także wtedy, gdy karta
jest zwinięta. Arkusz zapisuje wcześniejsze zapoznanie z treścią i
pomoc. Deklaracja kursanta, zewnętrzny przegląd kodu i obserwacja
pracy są odrębnymi zapisami. Kod referencyjny należy do autora kursu.
Kursant testuje własną pełną ścieżkę od klienta przez usługę do
magazynu. Pobranie, wpis w arkuszu i lokalne uruchomienie Cargo
nie przyznają ukończenia, opanowania materiału, niezależnej rodziny
ani zaliczenia w kolejce powtórek. Otwarcie rozwiązania nadal
odnotowuje pomoc zgodnie z dotychczasową regułą.

## Weryfikacja utrzymaniowa

Poniższe polecenia służą do sprawdzenia bieżącego stanu repozytorium.
Wykonanie ich przez kursanta wymagałoby odrębnego zapisu.

```sh
npm run test -- src/content/projects/durable-log-service/package.test.ts src/content/capstone-integration-integration.test.ts src/content/capstone-verification.test.ts
npm run content:capstone
npm run content:capstone -- --msrv
npm run build
```

Ograniczony weryfikator Capstone rozpakowuje tylko archiwum autorskie,
sprawdza zgodność archiwum, źródeł i manifestu oraz uruchamia
rozwiązanie referencyjne na stabilnym Ruście i dokładnie 1.85.0.
Trzynaście kontrolowanych mutantów obejmuje zliczanie na strumień,
pierwszeństwo sprawdzania tożsamości, zapisaną zajętość, usuwanie
danych po obniżeniu K i fałszywy sukces. Mutant musi się skompilować
i odpaść w wyznaczonym teście zachowania. Po przywróceniu wersja
referencyjna musi przejść. Błąd kompilacji, przekroczenie czasu i
błąd infrastruktury mają odrębne wyniki. Weryfikator przyjmuje
wyłącznie materiały repozytorium. Produkcyjne testy przeglądarkowe
i weryfikator offline osobno sprawdzają dostęp do arkusza, oba ZIP-y
i zachowanie lokalnego stanu nauki. Przechwycone odpowiedzi mechanizmu
uruchamiania w przeglądarce dokumentują działanie interfejsu.

## Pozostałe granice dowodów

Autorskie przypadki dokumentują zachowanie referencyjne. Przegląd
samodzielnej pracy kursanta, pilotaż z początkującym, odtworzenie
wiedzy po przerwie w niewidzianym zadaniu i ręczna ocena dostępności
wymagają odrębnych obserwacji. Osiem zaawansowanych pojęć z jedną
rodziną pozostaje wstępnych. Są to asynchroniczna funkcja zwrotna,
anulowanie i zatwierdzenie, Send, adapter dyn, ByteView, rozłączne
zakresy, Slot i MutSlot. Powiązanie zadań odbiornika i dotychczasowe
ograniczenia rodzin unsafe i powtórek zachowano. Rozszerzenie udostępnia
ćwiczenie. Gotowość zawodowa lub seniorska i skuteczność dydaktyczna
wymagają osobnej oceny. Datowane październikowe przeglądy zachowują
ustalenia i identyfikatory źródeł.
