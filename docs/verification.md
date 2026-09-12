# Weryfikacja etapu: runtime Tokio i odpowiedzialność za zadania

Data: 12 września 2026. Kurs zawiera 90 lekcji w 25 modułach, 93 pojęcia, 7 śladów pamięci, 167 wpisów źródłowych i 4 projekty. Etap dodaje cztery lekcje, osiem bramek, cztery zadania od pustej kartki i cztery kodowe powtórki. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Tokio 1.53.1 i Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; build ponownie sprawdza typy |
| Vitest | 137/137 testów w 24 plikach |
| Walidacja curriculum | 90 lekcji, 93 pojęcia i 7 śladów; poprawne relacje, źródła i identyfikatory |
| Rzeczywisty rustc | 1207/1207 dotychczasowych przypadków; deklarowane przykłady Tokio są sprawdzane osobno |
| Rzeczywiste Cargo/Tokio | 50/50 przypadków: kod widoczny, diagnostyka, startery, rozwiązania, blank-page i powtórki; przypięty profil offline/locked |
| Wadliwe implementacje | 9/9 kompiluje się i zostaje odrzuconych przez asercje zachowania; timeout ani błąd kompilacji nie są zaliczeniem |
| Playwright | 34/34 scenariusze; po rozszerzeniu testu dostępności ponownie 2/2 nowych scenariuszy Tokio |
| Dostępność na telefonie | Nowe zadanie przy 390 px: brak naruszeń axe, przepełnienia poziomego i błędów strony; kod oraz wybrana zakładka przeżywają reload |
| Audyt źródeł HTTP | 167/167 wpisów z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnej powtórki i lekcji bez bramki |
| Produkcyjny build i podgląd | Poprawny build Webpack; zgodna suma SHA treści przed i po budowie; port 3002 używa końcowej wersji. Ręcznie sprawdzono mapę, wejście do zadania, czytelność edytora i wznowienie. Brak ostrzeżeń i błędów w konsoli |
| Offline | Cache rust-workshop-v14; wcześniej nieotwarte zadanie Tokio, szkic i wskazówka odtwarzają się po reload bez sieci. Poprzednie szkice, notatki, ślad Weak i wszystkie trzy archiwa starterów Cargo pozostają poprawne. Brak błędów strony |
| Zewnętrzny Playground | Przykłady Tokio nie zostały wysłane; E2E korzysta z kontrolowanych odpowiedzi runnera |

Niezmienione laboratoria Cargo i Loom przeszły oba przebiegi GitHub CI przy scalaniu poprzedniego PR #1 w commit 64667e4. W tym etapie nie uruchamiano ich ponownie lokalnie. Weryfikacja dotyczy wyłącznie przejrzanych przykładów repozytorium, nigdy szkiców ucznia ani kodu z importu.

## Przegląd dydaktyczny i techniczny

- **Runtime:** testy wymagają rzeczywistego current-thread runtime zarówno przy tworzeniu Future zależnego od Handle, jak i podczas jego wykonywania. Pożyczony String, Rc<Cell<_>>, wynik bez Copy i oczekiwanie na dziecko sprawdzają lokalne wykonanie bez zbędnych granic Send/'static. Powtórka przekazuje wynik między dwoma etapami.
- **Niezależne zadania:** testy porównują rzeczywiste identyfikatory zadań i obserwują wywołanie fabryki oraz ciała Future w tym samym dziecku. Nie wywodzą kolejności wykonania z kolejności spawn ani logów.
- **Własność:** E0373 pokazuje zbyt krótką pożyczkę, a Rc zachowane przez await powoduje rzeczywisty komunikat Send bez numeru E. Zewnętrzny DropProbe, tożsamość Arc i liczba uchwytów obserwują czas życia przekazanych zasobów. Poprawione przykłady rzeczywiście się kompilują.
- **Wyniki:** oba JoinHandle są odbierane również po błędzie pierwszego. Testy zachowują sukcesy, etykiety, anulowanie oraz treść paniki obu stron. Powtórka z jawnymi sygnałami started/release/finished odróżnia odłączenie uchwytu od abort bez sleep lub domysłów o harmonogramie.
- **Samodzielność:** każde z czterech kryteriów ma dwa różne zadania, w tym pusty edytor z kontraktem opisanym w prozie. Cztery powtórki zmieniają wymagane API. Odsłonięcie jednego rozwiązania pozostawia świeży wariant jako dowód samodzielności.
- **Weryfikator:** stały manifest i lockfile pozostają wyłącznie narzędziem autora. Kod przeglądarki nie może wskazać zależności, ścieżki ani procesu. Nieznany cel, brak źródła, puste testy, awaria zależności, timeout i sygnał procesu nie mogą udawać poprawnego odrzucenia rozwiązania. Diagnostyka Cargo musi wskazywać główny span w autorskim pliku. Metadane oczekiwanego błędu muszą zgadzać się z evaluatorem lekcji.

Dziewięć kontrolowanych wadliwych wariantów: ręczny poll poza runtime, fabryka przed enter, fabryka przed spawn, consumer przed spawn, abort drugiego zadania, zgubienie JoinError, zgubienie etykiety, przerwanie kolekcji po pierwszym błędzie oraz abort zamiast odłączenia. Każdy wariant skompilował się, wykonał testy i zakończył nieudaną asercją. To próby kontraktów, nie pełny dowód poprawności każdego możliwego programu.

Recenzje doprowadziły do wzmocnienia obserwacji runtime i zasobów, zachowania błędów obu zadań oraz usunięcia nadmiernych zakazów składniowych. Dwa dodatkowe testy regresyjne najpierw wykazały pominięcie rozwiązania Cargo bez funkcji oraz rozbieżność diagnostyki z evaluatorem. Po poprawce przechodzą. Końcowy niezależny przegląd wykazał dodatkowo możliwość pominięcia brakującego rozwiązania przy obecnym starterze. Osobna regresja najpierw odtworzyła błąd; weryfikator wymaga teraz niepustego rozwiązania każdego przykładu Tokio. Recenzent potwierdził usunięcie tej luki. Surowa diagnostyka bez numeru E pozostaje widoczna po otworzeniu Compiler Coach i po reload; nie jest zastępowana uproszczonym komunikatem.

## Odtworzenie kontroli

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:audit -- --check-links
npm run build
npm run test:e2e
```

Przy serwerze produkcyjnym na porcie 3002: `npm run test:offline`. Pierwsze `--fetch` pobiera zależności z przypiętego lockfile; kolejne `npm run content:tokio` oraz wszystkie kompilacje/testy używają lokalnego cache i `--offline --locked`.

## Pozostały zakres

Ten etap udostępnia runtime, spawn, Send/'static i odpowiedzialność za JoinHandle. Bounded channels, backpressure w async, timeout/select, pełne anulowanie i graceful shutdown pozostają następnym etapem. Dalej wymagane są zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI, operacje produkcyjne oraz pełne Number Guessing+, Mini grep i capstone. Pełny zakres zachowują [audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md).

Kontrolowane odpowiedzi E2E nie potwierdzają bieżącego wykonania w zewnętrznym Playgroundzie. Wcześniejsza automatyczna kontrola uprawnień odrzuciła transmisję przykładów; osobna zgoda pozostaje bez odpowiedzi. Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Kontrole techniczne nie dowodzą skuteczności nauczania ani gotowości zawodowej; potrzebny jest samodzielny transfer do nowych problemów po przerwie.
