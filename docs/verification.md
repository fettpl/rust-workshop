# Weryfikacja etapu: podstawy async

Data: 12 września 2026. Kurs zawiera 86 lekcji w 24 modułach, 89 pojęć, 7 śladów pamięci, 161 wpisów źródłowych i 4 projekty. Ten etap dodaje 4 lekcje, 8 zadań z evidence gate, 4 zadania od pustej kartki i 4 kodowe powtórki. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024 i Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy build ponownie sprawdził typy |
| Vitest | 117/117 testów w 21 plikach; relacje modułów, niezależne bramki i świeże alternatywy po reveal |
| Walidacja curriculum | 86 lekcji, 89 pojęć i 7 śladów; poprawne relacje, źródła i identyfikatory |
| Rzeczywisty rustc | Pełny przebieg 1207/1207. Po dodaniu asercji propagacji drugiego błędu, reguł źródła i obsługi lokalnych pożyczeń ponownie sprawdzono końcowy moduł async: 58/58 |
| Próby wadliwych rozwiązań | 10/10 kompiluje się i zostaje odrzuconych przez asercje behawioralne; szczegóły poniżej |
| Playwright | 32/32 scenariusze; nowe zadania, surowy wynik, wskazówki, reveal, zachowanie szkicu, niezależne blank-page i dokładne wznowienie |
| Produkcyjny build Webpack | Poprawny; sumy SHA trzech plików async przed i po buildzie zgodne; podgląd na porcie 3002 używa końcowej wersji |
| Audyt źródeł HTTP | 161/161 wpisów z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnej powtórki i lekcji bez evidence gate |
| Offline | Cache rust-workshop-v13; wcześniej nieotwarte zadanie async, szkic i wskazówka odtwarzają się po reload bez sieci |
| Regresja offline | Zachowane poprzednie szkice i notatki, dokładna klatka śladu Weak, krok lekcji Send oraz wszystkie trzy identyczne bajtowo archiwa starterów Cargo |
| Dostępność i podgląd | Nowy scenariusz przy 390 px przechodzi axe i kontrolę przepełnienia. Ręcznie sprawdzono czytelność zadania i kodu oraz widoczny fokus linku pomijającego nawigację. Brak błędów strony offline i ostrzeżeń/błędów w konsoli końcowego podglądu |
| Zewnętrzny Playground | Nowe przykłady nie zostały wysłane; E2E używa kontrolowanych odpowiedzi runnera |

Pełny przebieg Rust poprzedza końcowe wzmocnienie testu błędu drugiej przyszłości oraz poprawkę niepotrzebnych ograniczeń static w fabryce. Końcowy przebieg 58/58 obejmuje cały zmieniony moduł po tej korekcie. Nie wykonano ponownie niezmienionych laboratoriów Cargo/Loom; ich poprzednią kontrolę zapisuje commit a701637. E2E i offline potwierdzają zgodność podawanych archiwów.

Weryfikacja Rust obejmuje wyłącznie przejrzane przykłady repozytorium, nigdy szkice ucznia ani kod z importu. Kontrolowane odpowiedzi E2E nie potwierdzają bieżącej dostępności zewnętrznego Playgrounda. Wcześniejsza automatyczna kontrola uprawnień odrzuciła transmisję przykładów do Playgrounda; osobna zgoda pozostaje bez odpowiedzi.

## Przegląd dydaktyczny i techniczny

- **Leniwe wykonanie:** odróżniamy obliczenie argumentów od uruchomienia ciała async. Zewnętrzny licznik i zasób z Drop sprawdzają opóźnione wywołanie fabryki. Powtórka odczytuje aktualny początek kolejki dopiero podczas poll.
- **Postęp:** kolejność await, Pending obu etapów i oba źródła błędu są obserwowane przez zewnętrzne przyszłości. Test zmienia Context, wyzwala zapisany Waker i sprawdza przekazanie aktualnego Waker przez rozwiązanie. Gotowe dziecko odrzuca ponowny poll po wznowieniu drugiego etapu.
- **Własność:** rzeczywiste E0382 i E0597 poprzedzają zadania z przenoszeniem wartości. Zewnętrzny DropProbe obserwuje zasób przed pierwszym poll, podczas Pending, po anulowaniu i w posiadanym wyniku. Powtórka wykonuje odroczoną transformację na nowym kontrakcie.
- **Anulowanie:** usunięcie posiadanej przyszłości kończy jej dalsze wykonywanie i zwalnia zasoby, lecz nie cofa już wykonanych skutków. Testy obejmują !Unpin, Pending, Ready, pusty slot, tożsamość zachowanej przyszłości, liczbę poll i Drop oraz użycie przekazanego Context. Drop uchwytu do niezależnego zadania nie jest przedstawiany jako gwarancja zatrzymania tego zadania.
- **Samodzielność:** każde z czterech kryteriów ma dwie różne bramki, w tym pusty edytor z nazwanym API w prozie. Odsłonięcie rozwiązania pozostawia świeży wariant. Cztery kodowe powtórki wymagają transferu do innego kontraktu.
- **Granice:** ręczne poll służy skończonej obserwacji rzeczywistych Future ze std, nie jest executorem ani testem runtime Tokio. Pending ma opisane źródło budzenia albo jest jawnym std::future::pending(), które nigdy nie zwraca Ready. Reguły źródła uzupełniają testy zachowania; nie są pełną analizą AST.

Dziesięć wadliwych wariantów obejmuje: podwójny poll, wyciek posiadanej przyszłości, ignorowanie flagi anulowania, usuwanie Pending ze slotu, zbyt wczesne wywołanie fabryki, odczyt końca kolejki, odwróconą kolejność await, zmianę drugiego błędu, wyciek przejętego zasobu oraz aktywne odpytywanie zamiast propagacji Pending. Każdy wariant skompilował się i zakończył nieudaną asercją. Timeout ani błąd kompilacji nie jest liczony jako odrzucenie mutanta.

W przeglądzie usunięto zbyt podobne kontrakty bramek, zastąpiono pośrednie obserwacje długości tekstu rzeczywistym DropProbe i dodano brakujący przypadek błędu drugiej przyszłości. Drugi niezależny przegląd wykrył zbędne ograniczenia static w odroczonej fabryce. Test lokalnego pożyczenia najpierw odrzucił rozwiązanie przez E0373; po usunięciu ograniczeń ten sam test i cały moduł przechodzą. Kontrakt dopuszcza teraz zarówno posiadany wynik, jak i referencję do wystarczająco długo żyjących danych.

## Odtworzenie kontroli

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:audit -- --check-links
npm run build
npm run test:e2e
```

Przy serwerze produkcyjnym na porcie 3002: npm run test:offline. Pełną kontrolę niezmienionych pakietów można odtworzyć przez npm run content:models -- --fetch oraz npm run content:cargo. Pierwsze --fetch pobiera przypięte zależności; wykonanie testów używa --offline --locked.

## Pozostały zakres

Ten etap udostępnia podstawy Future, await, własności i anulowania przez Drop. Runtime Tokio, zadania, bounded pipeline, timeout/select i graceful shutdown pozostają do wdrożenia. W dalszym zakresie są także zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI, operacje produkcyjne oraz pełne Number Guessing+, Mini grep i capstone. Pełny zakres zachowują [audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md).

Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Techniczne kontrole nie dowodzą skuteczności nauczania ani gotowości zawodowej; potrzebna jest samodzielna praca na nowych problemach i transfer po przerwie.
