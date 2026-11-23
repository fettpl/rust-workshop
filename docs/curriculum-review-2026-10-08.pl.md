# Przegląd programu nauki — 8 października 2026

[English](curriculum-review-2026-10-08.md)

Przegląd dokumentuje etap współdzielonego pożyczenia (`shared-borrow`) i przyjęty
przegląd programu przez Astrę. Angielski oryginał to zapis inżynierski
kursu przeznaczonego dla polskojęzycznych osób znających podstawy
programowania i zaczynających naukę Rusta od zera. Kurs jest przede
wszystkim lokalny. Wdrożenie i hosting pozostają przyszłymi opcjami.

## Zakres źródeł i wykaz

Przejrzana baza PR44 to zaakceptowany zwykły commit scalający
`5d42c639c93730266a06956022b70d5460445ee4` (drzewo
`1730d347ab910754e1b657f40a3c37b3c1b9b501`). Stan współdzielonego
pożyczenia przejrzany po zadaniach 1–3 to
`1059394261ebbc6336624279c76289eb2ff608b2` (drzewo
`cd98a2fae8f512d996f3866de5c96d3380ba14c9`) z czystym drzewem roboczym
na `feature/shared-borrow-calibration-oct8`. Baza i wdrożona
treść zachowują odrębne pierwotne zapisy.

Końcowe obliczenie rejestru dla tego stanu wykazało 189 lekcji,
48 modułów, 191 pojęć, 13 projektów, 7 śladów, 191 zwykłych powtórek
i 2 odrębnie zarejestrowane powtórki po przerwie. Zachowano Core17,
31 modułów do samodzielnego odkrywania oraz pierwotne identyfikatory,
kolejność, indeksy kroków, surową historię, szkice, sesje powtórek i
schemat. Polecenie z `/opt/homebrew/opt/node@22/bin/node` i `tsx`
użyło Node `v22.23.3` i npm `10.9.9` i zakończyło się kodem 0.
Niezmienność źródeł zapisało
`<private-temp>/receipt-017/inventory-final/command.json`.
Skróty SHA-256 źródeł rejestru to
`57b5c3cbbdc5e5827c9601b38da047ab6bc623d0c9f0f0ba7f766f7dd6ab8e31`
dla `src/content/course.ts` oraz
`c75c1ff871c28217432334edd295f3e01d3096198bcd931d272c9230a32b0a38`
dla `src/content/shared-borrow-calibration.ts`.

## Zakres etapu współdzielonego pożyczenia

Zatwierdzony fragment dodaje jedną lekcję własności z dwiema
blisko powiązanymi głównymi rodzinami opartymi na szkielecie
i jedną powtórką po przerwie. W `shared-count-words` kursant
naprawia podaną granicę `String` na `&str`. Starter celowo
pokazuje błąd kompilatora E0308. W `shared-has-suffix` kursant
naprawia pierwszy parametr przejmujący własność i umożliwia
ponowne użycie wartości u wywołującego. Drugi współdzielony
parametr pozostaje bez zmian. Starter używa przeniesionej
wartości i pokazuje E0382. Kontrakty sprawdzają wywołania
typowane jako `&str`, bezpośrednie literały, wielokrotne użycie
wartości tego samego właściciela i dwa widoki tego samego
właściciela. Weryfikacja dotyczy określonego kontraktu
pożyczeń. Swobodny projekt API, ogólne rozumowanie o czasie
życia, zastosowanie w innych dziedzinach i brak alokacji
wymagają osobnych dowodów.

Kryterium konkretnej pary `shared-borrow-pair-v1` wymaga
dwóch różnych aktualnych głównych rodzin sprawdzanych
testami. Jest bardziej restrykcyjne niż globalna reguła
`minimumCodingTasks: 2`. Dawna kwalifikująca się rodzina
i jedna nowa mogą spełnić regułę globalną bez zaliczenia
konkretnej pary. Oddzielna powtórka po przerwie
`review-shared-borrow-delayed-v1` ponownie stosuje regułę
E0382 w `count_lines` i nie dodaje głównej rodziny. Wybór
powtórki nadal uwzględnia termin i przerwę ściśle powyżej
24 godzin. Próba sprawdza ponowne użycie tej konkretnej reguły.

Pomoc przypisuje się do rodziny i zachowuje w jej powiązanych
zadaniach. Po pomocy w obu rodzinach można wyczerpać możliwość
samodzielnego zaliczenia pary bez resetu i zmiany historii.
Poprawka w zadaniu 3 dostosowuje komunikat asystenta do
rzeczywistych stanów. Obejmuje dostępną liczoną rodzinę,
ukończoną parę, wyczerpanie, brak właściwej liczonej rodziny,
dawne ćwiczenie bez zaliczenia i zadania uzupełniające.
Zasady odzyskiwania pozostają w dotychczasowym zakresie.
Zachowano stare zdarzenia, identyfikatory, ukończenie, szkice,
znaczniki czasu, stan pomocy, importy i eksporty oraz
tożsamość powtórek. Kontrakty i kontrole stanu przeglądarki
dotyczą wskazanych ćwiczeń. Ogólne opanowanie własności,
gotowość zawodowa lub seniorska, wykonanie dowolnego kodu
kursanta i skuteczność dydaktyczna wymagają osobnej oceny.

Zaakceptowane dane R2 zadania 3 odnoszą się do tego stanu
źródeł. Z kodem 0 przeszło 20 zarejestrowanych przypadków
współdzielonego pożyczenia, 976 testów jednostkowych w 99
plikach, 5 przypadków stanu asystenta i 34 testy przeglądarkowe
właściwych ścieżek własności. Końcowa kompilacja i kontrole
statyczne także zakończyły się kodem 0. Raport zapisuje
Node 22.23.3, npm 10.9.9, Rust `rustc 1.99.0 (b940084d7 2026-09-28)`
i Next 16.3.8, jawne kontrole stanu źródeł i zatrzymanie
własnego serwera. Wcześniejsze awarie infrastruktury i
zapisy sprzed ostatecznego stanu zachowują historyczny
zakres. W chwili sporządzenia dokumentu dalsze przebiegi
PR i main miały status PENDING.

## Priorytety Astry i dalsze prace

Przeczytano pełny przegląd Astry i wszystkie pięć pakietów
sugestii. Poniższe propozycje wykraczają poza ten etap.
Dotyczy to dziewięciu par duplikatów, czterech wejść do
modułów, trzech krótkich prób I/O, samodzielnych prac,
miejsc na przerwę i obserwacji pilotażu.

| Priorytet | Uzasadnienie i zakres dalszych prac | Stan w opisywanej rewizji |
| --- | --- | --- |
| P1 — spójność rodzin kontraktów | Dziewięć zaawansowanych par zadanie zaliczeniowe i zadanie od zera powtarza ten sam kontrakt. Powiązane ID mogą wyglądać jak niezależne dowody. Przypisz każdą parę do jednej rodziny, zachowaj historię i dodaj rzeczywiście inny kontrakt przetwarzania partii przez odbiornik. Metadane nie naprawiają dawnych zaliczeń. | Propozycja. Przyjęte ustalenie o duplikatach pozostaje otwarte. |
| P1 — warunki wstępne rozszerzeń | Cztery wejścia dziedziczą warunki z historii plików zamiast z wymaganych umiejętności: publiczne API, Mini grep, utrzymanie usług i zwykłe async. Popraw krawędzie modułów, lekcji i pojęć na istniejących ID z zachowaniem Core17, 31 rozszerzeń i ścieżek. | Propozycja do wdrożenia. |
| P1/P2 — krótkie i dłuższe powtórki I/O | Powtórki kodeka Todo, zapisu i terminala mają zbyt duży zakres na 1–3 minuty. Dodaj krótkie ćwiczenia ścisłego parsowania flag, rozróżniania brakującego i uszkodzonego pliku oraz potwierdzania po sukcesie. Jawnie oznacz ćwiczenie i samoocenę oraz zachowaj dłuższe sesje. | Propozycja do wdrożenia. Próba dotyczy wybranej umiejętności I/O. |
| P1/P2 — przejście do własnego projektu | Ustalone kontrakty nie pokazują podziału kodu, wyboru reprezentacji ani dostosowania do zmiany wymagania. Dodaj wczesną lokalną pracę Cargo, Study Session CLI z samym problemem i ograniczoną zmianę pojemności Durable Log Service z ludzkim przeglądem. | Propozycja do wdrożenia. Ocena kursanta wymaga odrębnej obserwacji. |
| P2 — organizacja sesji i pilotaż | Długie lekcje Todo i I/O potrzebują miejsc na przerwę oraz wykonalnego protokołu obserwacji, który obejmuje pomoc, aktywny czas, wyjaśnienie i pracę w innej dziedzinie po przerwie. | Komunikat o dostępności pomocy jest wdrożony. Przerwy i pilotaż pozostają otwarte. |

Proponowane cztery zmiany warunków wstępnych, krótkie próby I/O
z oceną, wczesne lokalne prace kursantów i miejsca na przerwę
dotyczą programu nauki. Nowy mechanizm uruchamiania, wykonanie
dowolnego przesłanego kodu, druga mapa nauki, usługa wdrażania
i płatna zależność wymagają osobnej decyzji. Gotowość zadań
i miejsc na przerwę można ustalić przed obserwacją udziału,
trwałości wiedzy i skuteczności nauki.

## Kontynuacja priorytetów z 6 października

Pierwotna mapa siedmiu priorytetów pozostaje historyczna.
Poniższe powiązania przypisują aktualny wtedy etap do tej mapy.

| Priorytet z 6 października | Wkład etapu pożyczenia | Pozostałe ograniczenie |
| --- | --- | --- |
| Ścieżka początkująca i opcjonalne odkrywanie | Dopisuje zadania we własności, zachowując Core17, 31 modułów opcjonalnych i historyczną nawigację. | Gotowość, czasy i trudności początkujących wymagają pilotażu. |
| Dowód konkretnego kroku i dwie różne wykonywalne rodziny | Dodaje dwie rodziny pożyczenia, ich konkretną parę, osobną powtórkę po przerwie, pomoc w obrębie rodziny i komunikat o wyczerpaniu prób. | Para obejmuje określoną naprawę ze szkieletem. Pozostałe pojęcia i dziewięć duplikatów są nadal otwarte. |
| Swoboda w podstawowym Ruście przed zaawansowanymi tematami | Używa jawnych napraw E0308 i E0382, typowanych wywołań i prób zachowania właściciela. | Szersze czytanie API, debugowanie i użycie wiedzy w całym katalogu wymagają osobnych danych. |
| Klawiatura, fokus, edytor, małe ekrany i dostępność | Przyjęte scenariusze zadania 3 obejmują nawigację, przeładowanie, zachowanie szkicu i lekcję w widoku 390 px. | Ręczna kontrola dostępności, czytników ekranu, kontrastu, powiększenia i technologii wspomagających pozostaje otwarta. |
| Jeden datowany stan bieżącej weryfikacji | Dodaje niniejszy przegląd przypisany do źródeł i odnośnik z dokumentu weryfikacji. | Akceptacja PR i main w chwili sporządzenia pozostaje oczekująca. Starsze stany są historyczne. |
| Swobodna architektura, wybór typów, uzasadnienie i niewidziane zadanie | Jawnie oznacza podane sygnatury i treści metod tekstowych jako ograniczony szkielet. | Samodzielny podział kodu, uzasadnienie, zmiana wymagania i niewidziane zadanie pozostają propozycją. |
| Pilotaż dla początkującego i niewidziane zadanie po przerwie | Zachowuje powtórkę po przerwie jako określony kontrakt reguły i proponowany protokół obserwacji. | Udział w pilotażu, wyniki nauki, trwałość i skuteczność wymagają odrębnej próby. |

Kurs zachowuje historyczny zakres i zapisy. Skończone
kontrakty, wynik kompilatora, stan przeglądarki i liczby rejestru
dokumentują oprogramowanie i treść w zadeklarowanym zakresie.
Pełna ręczna ocena dostępności, swobodne programowanie,
gotowość do publikacji lub wdrożenia, gotowość zawodowa lub
seniorska i zmierzona skuteczność wymagają osobnych dowodów.
