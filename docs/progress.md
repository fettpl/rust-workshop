# Rust Workshop — stan implementacji

Dostępnych jest sześć modułów i 28 lekcji: pięć lekcji fundamentów Rust, osiem pamięci, własności i podstaw pożyczania, sześć modelowania danych, trzy kolekcji, trzy obsługi błędów i trzy rdzenia Todo CLI. Curriculum obejmuje 32 pojęcia, sześć śladów pamięci i 34 wpisy źródłowe. Pełny kurs dla osoby znającej podstawy programowania i zaczynającej Rust od zera, prowadzący do zaawansowanej praktyki mid/senior, jest nadal rozwijany.

Aktualizacja czytelności zastąpiła ciepłą paletę chłodną bielą, granatem i niebieskim akcentem. Obejmuje większą typografię i przyciski, spójne motywy Monaco, dokładny plan sesji, wybór modułu, odnośniki do zadań zaliczeniowych i przekrojowy widok kompetencji.

Uzupełniono treści kart powtórkowych oraz uruchamiane naprawy błędów, w tym nowe zadania kodowe dla kolekcji i Todo. Zakończone sesje kodowe zachowują wynik i nie pozwalają ponownie naliczać dowodu. Istniejący zapis v3 i wcześniejsze identyfikatory lekcji pozostają kompatybilne.

Zakres obejmuje także onboarding, diagnostykę, Monaco, zewnętrzny runner, surowy wynik kompilatora i wskazówki, blank-page, zmianę wymagań, assessmenty, mastery, powtórki, IndexedDB, migracje/import/export, notatki, zakładki, Focus Mode i PWA offline.

[Audyty wymagań](requirements-audit.md) rozróżniają implementację, częściowe pokrycie i dalszy zakres. [Raport weryfikacji](verification.md) zawiera konkretne wyniki testów oraz ograniczenia.

Moduł modelowania obejmuje slices, struktury, metody, enumy z match, Option i model danych Todo. Kolekcje rozwijają `Vec`, `String`, UTF-8 i `HashMap::entry`; obsługa błędów — `Result`, jawną konwersję błędu parsera, `?` i granicę paniki. Trzy lekcje danego modułu pokrywają podstawowy zakres, nie całą docelową kompetencję.

Dostępny jest wybór dwóch projektów: dotychczasowego mini-projektu komunikatu Number Guessing oraz rdzenia Todo CLI działającego w pamięci. Todo ma parser `add/done/list`, stan w `Vec`, sesję tolerancyjną kontynuującą po błędzie, sesję ścisłą zwracającą pierwszy błąd i oceniane zadanie od pustej kartki. Projekty mają oddzielnie zapisane notatki i retrospektywy, które kierują niepewność do powtórek właściwych pojęć.

Dalszy materiał: pełne Number Guessing+, wejście terminalowe i pliki Todo wraz z błędami IO, działy 9–18 i zaawansowane tematy opisane w [mapie curriculum](advanced-curriculum.md). Obejmują moduły i Cargo, generics, traits, lifetimes, closures i iterators, testowanie, smart pointers, współbieżność, async oraz praktykę projektowania, utrzymania i recenzowania systemów. Nie przeprowadzono pilotażu z osobą zaczynającą Rust; samodzielny transfer po przerwie i skuteczność dydaktyczna pozostają do oceny.

Najbliższy etap: moduły, widoczność i organizacja pakietu Cargo, następnie wejście/wyjście oraz trwały zapis w Todo. Każdy duży etap kończy się przeglądem, odpowiednimi testami i commitem do repozytorium. Dalsze niezależne zadania są delegowane do GPT-6 Astra z xHigh, a wyniki podlegają recenzji. Bieżąca weryfikacja kolekcji, błędów i rdzenia Todo jest zapisana w raporcie; cel całego zaawansowanego kursu pozostaje otwarty.
