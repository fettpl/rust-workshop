# Rust Workshop — stan implementacji

Dostępnych jest 58 lekcji w 15 modułach, 61 pojęć, 6 śladów pamięci, 106 wpisów źródłowych i 3 projekty. Kurs jest przeznaczony dla osoby znającej podstawy programowania, która zaczyna Rust od zera. Pełny zakres zaawansowanej praktyki mid/senior pozostaje w realizacji.

Bieżący etap dodaje sześć lekcji: trzy o testowaniu i trzy o Log Analyzer. Moduł testowania uczy zapisywania kontraktu w asercjach, tabel przypadków, granic, Unicode oraz rozdzielenia testów jednostkowych, integracyjnych i dokumentacyjnych od rustfmt i Clippy. Ukryty harness sprawdza helper ucznia na poprawnych i celowo błędnych funkcjach. Nieuzupełniony albo zbyt słaby zestaw asercji nie zalicza zadania.

Log Analyzer prowadzi przez pożyczony rekord, jawne błędy parsera, analizę strumieniową i raport w ustalonym formacie. Pobierany pakiet Cargo zawiera 10 plików i 19 testów: 11 jednostkowych, 5 integracyjnych, 2 procesu CLI i 1 doctest. Czytnik pakietu zachowuje najwyżej 4096 bajtów linii przed LF, pomija resztę zbyt długiego rekordu i liczy go raz. Ćwiczenia przeglądarkowe używają prostszego `read_line`, bez takiej gwarancji pamięci. Pakiet obejmuje CRLF, EOF bez LF, Unicode, duplikaty, uszkodzony UTF-8 i awarię odczytu.

Nowy materiał ma 13 zadań z evidence gate, 2 zadania od pustej kartki i 6 kodowych powtórek. Każde kryterium modułu ma dwa dostępne warianty i wymaga samodzielnego zaliczenia jednego z nich. Ujawnienie pakietu Log Analyzer zapisuje pomoc dla `records-debug`, `stream-debug` i `report-blank`; świeże alternatywy pozostają dostępne. Pobranie i lokalna lista kontrolna nie zaliczają lekcji. Projekty zachowują oddzielne notatki, pliki, retrospektywy i dokładne wznowienie.

Wcześniejsze moduły obejmują fundamenty, własność i pożyczanie, modelowanie, kolekcje, błędy, Todo CLI, moduły/Cargo, format i IO, generics, traity, lifetimes, closures i iteratory. Todo ma 11-plikowy pakiet Cargo z biblioteką, programem terminalowym, zapisem pliku i testami procesu. Mini-projekt Number Guessing ćwiczy komunikat wyniku; pełna gra nadal jest w planie. Poprzedni commit dodał dziesięć lekcji lifetimes, closures i iteratorów.

Mechaniki aplikacji obejmują onboarding, diagnostykę, Monaco i prosty edytor, zewnętrzny runner, surowe komunikaty kompilatora, wskazówki, ślady pamięci, samodzielne zadania, powtórki i mastery oparte na dowodach. IndexedDB, migracje/import/export, notatki, zakładki, Focus Mode i PWA zachowują schemat v3 oraz wcześniejsze identyfikatory. Stabilnie przestawione pytania wyboru zapisują odpowiedzi po identyfikatorze. Interfejs używa chłodnej palety bieli, granatu i niebieskiego akcentu; ma większą typografię, klawiaturową nawigację i mobilne panele.

[Raport weryfikacji](verification.md) zawiera wyniki testów oraz ograniczenia, w tym niewykonany test nowych przykładów przez zewnętrzny Playground oczekujący na zgodę. [Audyt wymagań](requirements-audit.md) porównuje stan z pierwotnym briefem, a [mapa zaawansowanego curriculum](advanced-curriculum.md) zachowuje docelowy zakres.

Następne prace obejmują uzupełnienie `while`/`loop`/`break`, smart pointers, współbieżność i async, zaawansowane Cargo i publiczne API, variance/HRTB, property/fuzz, benchmarki, unsafe/FFI oraz utrzymanie systemów. Pełne Number Guessing+, Mini grep i capstone pozostają do zbudowania. Kolejne duże etapy wymagają przeglądu i odpowiednich testów przed commitem.

Nie przeprowadzono pilotażu z uczącymi się. Dostępność treści i zielone testy nie potwierdzają samodzielnego transferu po przerwie ani gotowości zawodowej. Cel całego kursu pozostaje otwarty.
