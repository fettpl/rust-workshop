# Rust Workshop

Interaktywna aplikacja do nauki Rust dla osoby znającej podstawy programowania, ale zaczynającej od zera z Rust. Dostępnych jest 28 lekcji w sześciu modułach: 5 lekcji fundamentów Rust, 8 pamięci, ownership i podstaw borrowing, 6 modelowania danych, 3 kolekcji, 3 obsługi błędów oraz 3 rdzenia Todo CLI. Curriculum zawiera 32 pojęcia, 6 śladów pamięci i 34 wpisy źródłowe. Nauka prowadzi od przewidywania przez eksperyment i interpretację kompilatora do samodzielnego projektu.

## Uruchomienie lokalne

Wymagania: Node.js 22 lub nowszy i npm. Stable Rust jest potrzebny do developerskiej weryfikacji materiału; aplikacja nie uruchamia kodu użytkownika lokalnym rustc.

```sh
npm ci
npm run dev
```

Otwórz http://127.0.0.1:3000. Postęp, szkice, notatki, podpowiedzi i ustawienia zapisują się w IndexedDB w tej przeglądarce. Localhost i 127.0.0.1 to różne originy, więc mają oddzielny zapis. Używaj tego samego adresu lub przenieś postęp eksportem.

Wersja produkcyjna z obsługą offline:

```sh
npm run build
npm start
```

Build używa obsługiwanego trybu Webpack; domyślny Turbopack w tym środowisku macOS odmawiał tworzenia procesów/portów podczas bundlowania.

Po pierwszym otwarciu i pobraniu zasobów Service Worker zapisuje powłokę aplikacji. Materiały, odpowiedzi i kod działają offline; wykonanie Rust wymaga internetu. Przeglądarka pozwala zainstalować aplikację przez menu instalacji/dodania do ekranu głównego. Usunięcie danych witryny usuwa lokalny zapis — eksport JSON jest kopią zapasową.

## Przepływ

- Onboarding i cztery działania diagnostyczne bez blokowania dostępu do lekcji.
- Dashboard z dokładnie wznowioną sesją, powtórkami, projektem, stanami pojęć i przekrojowymi kompetencjami.
- Mapa sześciu modułów z kontraktami, grafem zależności i kryteriami samodzielności prowadzącymi do konkretnych zadań.
- Edytor Monaco serwowany lokalnie, alternatywny edytor tekstowy, wykonanie i testy Rust 2024.
- Oryginalny stderr kompilatora oraz osobny Compiler Coach z progresywnymi wskazówkami.
- Modele stack/heap z krokami move, Copy, clone, pożyczania i końca zakresu.
- Wybór dwóch projektów: mini-projektu komunikatu Number Guessing i rdzenia Todo CLI działającego w pamięci. Todo obejmuje parser `add/done/list`, stan w `Vec`, sesję tolerancyjną i ścisłą oraz oceniane zadanie od pustej kartki. Projekty mają oddzielnie zapisane notatki i retrospektywy kierujące powtórki do właściwych pojęć.
- Powtórki łączą odtwarzanie pojęć, przewidywanie i krótkie naprawy błędów uruchamiane w kompilatorze, także dla kolekcji i Todo.
- Wersjonowany zapis, dokładne wznowienie, notatki, zakładki, eksport/import, motywy i Focus Mode.

Treści kolejnych działów są pokazane jako roadmapa. Do wdrożenia pozostają pełna gra Number Guessing+, wejście terminalowe i pliki w Todo, działy 9–18 oraz zaawansowana praktyka Rust. [Docelowa mapa zaawansowanego kursu](docs/advanced-curriculum.md) opisuje kompetencje mid/senior, zależności, projekty i wymagane dowody. Porównanie wszystkich głównych wymagań z oryginalnym briefem i pozostały zakres są w [audycie wymagań](docs/requirements-audit.md). Nie przeprowadzono pilotażu z uczącymi się; dostępność lekcji nie potwierdza opanowania całego tematu ani poziomu zawodowego.

## Architektura

| Katalog | Odpowiedzialność |
| --- | --- |
| `src/domain` | Kontrakty lekcji, evaluatorów, wyników runnera i użytkownika |
| `src/content` | Dane curriculum, źródła, graf i przygotowane ślady pamięci |
| `src/engine` | Ocena dowodów, mastery, powtórki i sesje retrieval |
| `src/persistence` | Walidacja, migracja, import/export i IndexedDB |
| `src/runner` | Wymienialny adapter izolowanego wykonania Rust |
| `src/app/api/run` | Walidacja wejścia i granica serwerowa runnera |
| `src/components` | Interfejs generowany z danych |
| `scripts` | Weryfikacja zaufanych przykładów i audyt źródeł |

Definicja ćwiczenia i evaluator są rozdzielone. Źródło programu ze szkicu lub importu nigdy nie trafia do lokalnego procesu. Dostępny `PlaygroundRunner` oraz konfigurowalny `RemoteRunner` implementują `RustRunner`. Przyszły `SandboxRunner` może implementować ten sam kontrakt.

## Granice wykonania

Przycisk Uruchom wysyła kod i testy do serwerowej trasy, a następnie do Rust Playground. Nie wysyłamy notatek, nazwiska, całego postępu ani ustawień. Wykonanie odbywa się w sandboxie dostawcy; lokalny serwer Next nie wykonuje nieznanego Rust. Limity i zachowanie awarii opisuje [docs/runner.md](docs/runner.md).

Testy dodatkowe są schowane w doświadczeniu ucznia, lecz ich źródło jest częścią otwartego curriculum. To narzędzie nauki, nie zabezpieczony egzamin. Ograniczenie `clone()` to jawna kontrola składni, nie pełna analiza AST. Ocena wolnego wyjaśnienia jest samooceną według rubric i sama nie nadaje najwyższego mastery. Ślady pamięci są przygotowanym modelem dydaktycznym konkretnego przykładu, nie debuggerem dowolnego kodu.

## Weryfikacja

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:audit
npm run build
npx playwright install chromium
npm run test:e2e
```

`content:rust` kompiluje i wykonuje wyłącznie zaufane, autorskie przykłady w repozytorium. Sprawdza poprawne startery, oczekiwane klasy błędów, rozwiązania z testami zadeklarowanymi w evaluatorze, ślady i powtórki. Nie przekazuj temu skryptowi importowanych szkiców użytkownika.

`npm run content:audit -- --check-links` dodatkowo sprawdza dostępność źródeł przez sieć. Raport wskazuje informacje dynamiczne i daty przeglądu, brakujące powtórki oraz brakujące powiązania źródeł. Zmiany diagnostyki wykrywa kompilacja bieżącym stable Rust. CI odtwarza walidację i testy przeglądarkowe.

Testy ścieżki lekcji E2E zastępują zewnętrzne wykonanie przewidywalnym wynikiem, żeby CI nie zależało od dostępności Playgrounda. Pozostałe testy sprawdzają powtórki, klawiaturę oraz dostępność głównych ekranów. Test rzeczywistego adaptera jest osobnym smoke testem. Wyniki konkretnego przebiegu i ograniczenia opisuje [docs/verification.md](docs/verification.md).

## Zmiana schematu

Aktualny zapis ma `schemaVersion: 3`; istnieją migracje v1 i v2. Pola dodawane opcjonalnie są kompatybilne ze starszymi wersjami. Import sprawdza pełną strukturę i metadane, zanim użytkownik zatwierdzi zastąpienie stanu. Nieznanej wersji nie resetujemy. Przy dodaniu transformacji zmień wersję i dopisz test zachowania postępu, szkiców i notatek.

Dowody wykonania są oddzielone od ukończenia ekranu. Nieudana próba kieruje pojęcie do kolejki; odtworzenie tej samej odpowiedzi wielokrotnie nie mnoży kompetencji. Utrwalenie wymaga poprawnego aktywnego odtworzenia po przerwie, po wcześniejszych niezależnych dowodach rozumienia.

## Sprawdzenie realnego wykonania i offline

Przy uruchomionym serwerze developerskim `node scripts/smoke-runner.mjs` sprawdza pięć realnych wywołań przez API: poprawny output, E0382, testy zaliczone i niezaliczone oraz panic. Wymaga połączenia z Playgroundem.

Aby odtworzyć test offline w osobnej przeglądarce Chromium:

```sh
npm run build
npm start -- --port 3002
# W drugim terminalu:
npm run test:offline
```

Skrypt otwiera czysty profil testowy, zapisuje szkic i notatkę, wyłącza sieć, przeładowuje stronę i sprawdza dokładne wznowienie. Nie zmienia postępu użytkownika w jego przeglądarce.
