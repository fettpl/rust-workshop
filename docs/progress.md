# Rust Workshop — stan implementacji

Dostępnych jest osiem modułów i 35 lekcji: pięć lekcji fundamentów Rust, osiem pamięci, własności i podstaw pożyczania, sześć modelowania danych, trzy kolekcji, trzy obsługi błędów, trzy rdzenia Todo CLI, cztery modułów i Cargo oraz trzy formatu pliku, zapisu i terminala. Curriculum obejmuje 39 pojęć, sześć śladów pamięci i 56 wpisów źródłowych. Pełny kurs dla osoby znającej podstawy programowania i zaczynającej Rust od zera, prowadzący do zaawansowanej praktyki mid/senior, jest nadal rozwijany.

Aktualizacja czytelności zastąpiła ciepłą paletę chłodną bielą, granatem i niebieskim akcentem. Obejmuje większą typografię i przyciski, spójne motywy Monaco, dokładny plan sesji, wybór modułu, odnośniki do zadań zaliczeniowych i przekrojowy widok kompetencji.

Uzupełniono treści kart powtórkowych oraz uruchamiane naprawy błędów, w tym nowe zadania kodowe dla kolekcji i Todo. Zakończone sesje kodowe zachowują wynik i nie pozwalają ponownie naliczać dowodu. Istniejący zapis v3 i wcześniejsze identyfikatory lekcji pozostają kompatybilne.

Zakres obejmuje także onboarding, diagnostykę, Monaco, zewnętrzny runner, surowy wynik kompilatora i wskazówki, blank-page, zmianę wymagań, assessmenty, mastery, powtórki, IndexedDB, migracje/import/export, notatki, zakładki, Focus Mode i PWA offline.

[Audyty wymagań](requirements-audit.md) rozróżniają implementację, częściowe pokrycie i dalszy zakres. [Raport weryfikacji](verification.md) zawiera konkretne wyniki testów oraz ograniczenia.

Moduł modelowania obejmuje slices, struktury, metody, enumy z match, Option i model danych Todo. Kolekcje rozwijają `Vec`, `String`, UTF-8 i `HashMap::entry`; obsługa błędów — `Result`, jawną konwersję błędu parsera, `?` i granicę paniki. Trzy lekcje danego modułu pokrywają podstawowy zakres, nie całą docelową kompetencję.

Dostępny jest wybór dwóch projektów: dotychczasowego mini-projektu komunikatu Number Guessing oraz Todo CLI. Todo ma parser `add/done/list`, stan w `Vec`, sesję tolerancyjną kontynuującą po błędzie, sesję ścisłą zwracającą pierwszy błąd i oceniane zadanie od pustej kartki. Siedem nowych lekcji prowadzi przez drzewo modułów, widoczność, importy, re-eksporty i granice targetów Cargo do wersjonowanego formatu, rzeczywistych plików i potwierdzania polecenia dopiero po zapisie. Rozszerzenie dodało siedem pojęć i 22 źródła: 13 dla Cargo oraz dziewięć dla IO.

Karta Todo udostępnia 11-plikowy pakiet Cargo bez zewnętrznych zależności, w wariantach startera i rozwiązania referencyjnego. Zawiera bibliotekę, program terminalowy, testy plików i osobnego procesu, manifest, lockfile oraz instrukcje. Starter pozostawia pięć funkcji do uzupełnienia; rozwiązanie realizuje zapis i odczyt po restarcie, stdin, stdout, stderr oraz kody zakończenia. Ćwiczenia przeglądarkowe sprawdzają rzeczywiste pliki tymczasowe w izolowanym runnerze, ale nie udostępniają interaktywnego terminala ani trwałego dysku użytkownika. Samo pobranie projektu nie zalicza zadania.

Ujawnienie rozwiązania referencyjnego oznacza pomoc wyłącznie dla powiązanych zadań Todo: `format-debug`, `file-debug` i `cli-debug`. Alternatywne bramki `format-gate`, `file-gate` i `cli-gate` używają niezależnego kontraktu Notebook — innego nagłówka, separatorów, API i poleceń — i pozostają dostępne jako dowód transferu. Projekty zachowują oddzielne notatki i retrospektywy. Wznowienie wraca do bieżącej lekcji danego projektu albo wybiera jego pierwszą nieukończoną lekcję.

Podstawy części 9 są zaimplementowane. Dalszy materiał obejmuje zaawansowane Cargo, workspaces, features i MSRV, części 10–18 poza dostępnym Todo oraz tematy opisane w [mapie curriculum](advanced-curriculum.md): generics, traits, lifetimes, closures i iterators, pełny warsztat testowania, smart pointers, współbieżność, async i praktykę utrzymania systemów. Pełne Number Guessing+, Log Analyzer, Mini grep i projekt końcowy nadal pozostają do zbudowania. Nie przeprowadzono pilotażu z osobą zaczynającą Rust; samodzielny transfer po przerwie i skuteczność dydaktyczna pozostają do oceny.

Najbliższy etap to generics i traits oraz dalsza praktyka korzystania z bibliotek i projektowania API. Każdy duży etap obejmuje przegląd i odpowiednie testy przed integracją do repozytorium. Dalsze niezależne zadania są delegowane do GPT-6 Astra z xHigh, a wyniki podlegają recenzji. Bieżące wyniki techniczne zapisuje raport weryfikacji; cel całego zaawansowanego kursu pozostaje otwarty.
