# Weryfikacja etapu: atomiki i laboratorium Loom

Data: 12 września 2026. Kurs zawiera 82 lekcje w 23 modułach, 85 pojęć, 7 śladów pamięci, 154 wpisy źródłowe i 4 projekty. Etap dodaje 6 lekcji, 12 zadań z evidence gate, 6 zadań od pustej kartki i 6 kodowych powtórek. Środowisko: macOS, Node.js 26.7.0, Next.js 16.3.5, Rust 1.98.1 stable, edition 2024, Loom 0.7.2 i Chromium z Playwright.

## Wyniki kontroli

| Sprawdzenie | Wynik |
| --- | --- |
| ESLint i TypeScript strict | Bez błędów; końcowy build ponownie sprawdził typy |
| Vitest | 116/116 testów w 21 plikach; relacje modułów, świeże alternatywy po reveal i klasyfikacja wyników modeli |
| Walidacja curriculum | 82 lekcje, 85 pojęć i 7 śladów; poprawne relacje, źródła i identyfikatory |
| Rzeczywisty rustc | Pełny przebieg: 1150/1151; wykrył brak zwracanego Option w starterze publikacji. Po poprawce sprawdzono ponownie oba nowe moduły wraz z powtórkami: 74/74. Pozostałe przypadki pełnego przebiegu były poprawne |
| Próby wadliwych rozwiązań | 8/8 odrzuconych: 4 dla atomików i 4 dla porządkowania pamięci; szczegóły poniżej |
| Pakiety Cargo | Wszystkie trzy pakiety: fmt/check/test/Clippy poprawnych rozwiązań oraz oczekiwane niepowodzenia niedokończonych starterów |
| Modele Loom | 2 poprawne modele, 4 testy standardowe i 1 doctest; Clippy dla wszystkich targets/features bez ostrzeżeń |
| Czułość modeli | Dwa celowe kontrprzykłady kończą się właściwą nieudaną asercją; osłabienie Release w rzeczywistej bibliotece również narusza PUBLICATION_INVARIANT |
| Playwright | 30/30 scenariuszy; rzeczywiste ZIP-y, oddzielne notatki, reveal i dokładne wznowienie zadania atomowego |
| Produkcyjny build Webpack | Poprawny; zgodność plików obu modułów przed i po buildzie potwierdzona sumami SHA. Podgląd na porcie 3002 zawiera poprawiony starter |
| Audyt źródeł HTTP | 154/154 wpisy z HTTP 200; brak uszkodzonych relacji, pojęć bez aktywnej powtórki i lekcji bez evidence gate |
| Offline i podgląd produkcyjny | Cache rust-workshop-v12; końcowy przebieg potwierdza kod, notatkę, dokładny krok i trzy identyczne bajtowo archiwa starterów po reload bez sieci |
| Dostępność i konsola | Laboratorium przechodzi axe przy 390 px i kontrolę przepełnienia. Ręcznie sprawdzono jasny/ciemny motyw, widoczny fokus, Tab oraz przewijanie pliku klawiaturą. Brak page errors offline i ostrzeżeń/błędów w końcowym podglądzie |
| Zewnętrzny Playground | Nowe przykłady nie zostały wysłane. Wcześniejsza automatyczna kontrola uprawnień odrzuciła transmisję przykładów testowania/Log Analyzer; osobna zgoda pozostaje bez odpowiedzi |

Weryfikacja Rust obejmuje wyłącznie przejrzane przykłady repozytorium, nigdy szkice ucznia ani kod z importu. E2E używa kontrolowanych odpowiedzi runnera i nie potwierdza bieżącej dostępności zewnętrznego Playgrounda.

## Przegląd dydaktyczny i techniczny

- **RMW i CAS:** rozdzielono przydział zakresu od ustawiania maski bitowej. Zwykłe testy wartości uzupełnia jawna kontrola źródła odrzucająca osobne load/store w zadaniach wymagających pojedynczego RMW. Nie jest to pełna analiza AST ani dowód wszystkich przeplotów. Kontrolowany adapter CAS wprowadza zmienioną obserwację, porażkę pozorną, przepełnienie po konflikcie i wyczerpanie budżetu prób.
- **Granice atomowości:** transfer dwóch pól jest jedną transakcją pod Mutex; odrzucenie nie może częściowo zmieniać danych. Osobne zadanie z wersją sprawdza A→B→A i odrzucenie nieaktualnego snapshotu. Nie przypisujemy atomikom przewagi wydajnościowej ani gwarancji wait-free.
- **Porządkowanie pamięci:** test dostarcza zewnętrzny adapter obserwujący rzeczywiste wywołania operacji, ich kolejność i parametry. Nie ufa historii zapisanej przez ucznia. Osobny protokół potwierdzenia sprawdza stan pending/ready/acknowledged i nie wykonuje odczytu payloadu przed ready. To kontrakt dla jednego nadawcy i jednego odbiorcy.
- **Kontrakt CAS:** sprawdzana jest macierz operacji load/store/RMW oraz wszystkie pary success/failure. W obecnym Rust failure dopuszcza Relaxed, Acquire i SeqCst, niezależnie od pięciu wariantów success. Piętnaście legalnych par dodatkowo sprawdzono rzeczywistym compare_exchange zarówno przy zgodnej, jak i niezgodnej wartości.
- **Samodzielność:** każde nowe kryterium ma dwie alternatywy, w tym pusty edytor z precyzyjnym kontraktem. Odsłonięcie pakietu referencyjnego oznacza pomoc dla sześciu powiązanych zadań, pozostawiając świeży wariant każdego kryterium. Samo pobranie ani lokalna lista kontrolna nie naliczają mastery.
- **Granice modeli:** mały interpreter sekwencyjnie spójnych harmonogramów wyjaśnia utraconą aktualizację, ale nie jest pełnym modelem pamięci Rust. Rzeczywiste Loom jest dostępne w osobnym pakiecie Cargo. Zielony wynik nie obejmuje wszystkich zachowań Relaxed ani większych, nieprzetestowanych protokołów.

Osiem sprawdzonych wadliwych rozwiązań obejmuje: osobne load/store zamiast RMW, fetch_add zamiast bitowego fetch_or, ignorowanie nowej obserwacji CAS, częściowy transfer przy overflow, odczyt payloadu bez sprawdzenia flagi, brak potwierdzenia odbioru, dawną błędną regułę siły failure względem success oraz interpreter używający bieżącej wartości zamiast zapisanego odczytu. Pierwszy wariant przechodzi testy wartości, ale odrzuca go rzeczywisty evaluator przez jawną regułę źródła. Pozostałe siedem kończy się nieudanymi asercjami. Błędy kompilacji i infrastruktury nie są liczone jako odrzucenie mutanta.

## Laboratorium Cargo

Pakiet concurrency-lab-workshop ma 10 plików i przypięty Loom 0.7.2 z Cargo.lock. Ten sam kod reserve, Publisher::publish i Subscriber::try_read korzysta z importów std albo Loom przez feature model. Weryfikator sprawdza też zgodność archiwum podawanego przez aplikację z danymi projektu.

Publisher jest nieklonowalny i zużywany przez publikację; compile-fail doctest sprawdza próbę ponownego użycia. Subscriber może być klonowany, a wiadomości 0 i MAX są legalne. Odczyt przed publikacją musi dać None. Porzucenie Publisher pozostawia None i nie jest rozróżniane od oczekiwania.

Model publikacji sprawdza warunek przed join, ponieważ join sam zapewnia synchronizację i mógłby ukryć brak właściwego porządkowania flagi. Model rezerwacji sprawdza dwóch uczestników konkurujących o limit. Builder jawnie wyłącza ograniczenia czasu, permutacji i preempcji oraz odczyt checkpointu; przekroczenie limitu kroków jest błędem.

Weryfikator akceptuje kontrprzykład wyłącznie przy rzeczywistej nieudanej asercji oznaczonej LOST_UPDATE_INVARIANT albo PUBLICATION_INVARIANT. Timeout, błąd kompilacji, zero wykonanych testów i wyczerpanie limitu modelu nie są dowodem. Dodatkowa mutacja osłabia Release bezpośrednio w tymczasowej kopii biblioteki i wymaga odrzucenia przez ten sam model publikacji.

## Odtworzenie kontroli

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:models -- --fetch
npm run content:cargo
npm run content:audit -- --check-links
npm run build
npm run test:e2e
```

Pierwsze --fetch pobiera przypięte zależności. Kolejne npm run content:models działa z cache, a polecenia testowania używają --offline --locked. Przy serwerze produkcyjnym na porcie 3002: npm run test:offline.

## Pozostały zakres

Ten etap udostępnia podstawy atomików, porządkowania pamięci i modelowania małych protokołów. Async, zaawansowane Cargo/API, variance/HRTB, property/fuzz, profilowanie, unsafe/FFI, operacje produkcyjne oraz pełne Number Guessing+, Mini grep i capstone pozostają do rozwinięcia. Laboratorium jest dodatkiem do pierwotnego portfolio, nie zastępuje żadnego z pięciu projektów. Pełny zakres zachowują [audyt wymagań](requirements-audit.md) i [mapa kursu](advanced-curriculum.md).

Nie przeprowadzono pilotażu z uczącymi się ani ręcznego testu czytnikiem ekranu. Techniczne kontrole nie dowodzą skuteczności nauczania ani gotowości zawodowej; potrzebna jest samodzielna praca na nowych problemach i transfer po przerwie.
