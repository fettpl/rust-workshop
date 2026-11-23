# Rust Workshop

[English](README.md)

Rust Workshop to interaktywny kurs działający lokalnie, przeznaczony dla osób,
które znają podstawy programowania i zaczynają naukę Rusta od zera. Lekcje
i interfejs są dostępne po angielsku i po polsku. Użyj przełącznika języka,
aby zmienić język bez utraty miejsca i postępów. Nowy warsztat wybiera pierwszy
obsługiwany język przeglądarki. Jeśli go nie znajdzie, używa polskiego.
Istniejący warsztat pozostaje po polsku, dopóki nie wybierzesz innego języka.
Dokumentacja repozytorium jest dostępna w obu językach, a angielski jest pod
domyślnymi ścieżkami Markdown. Kurs wyjaśnia Rusta od podstaw.

[Informacja o redakcji historii](docs/history-redaction.pl.md) opisuje zmiany
w prezentacji dawnych raportów, utrwalone sumy kontrolne i aktualne granice
zgodności.

W kursie przewidujesz zachowanie programu, eksperymentujesz, czytasz
rzeczywisty komunikat kompilatora, naprawiasz kod i stosujesz poznany pomysł
w nowym zadaniu. Powtórki rozłożone w czasie pozwalają wracać do pojęć po
przerwie, a projekty łączą pojedyncze ćwiczenia w programy, nad którymi możesz
dalej pracować lokalnie.

Opcjonalne [rozszerzenie o typowaną autoryzację](docs/service-authorization.pl.md)
wprowadza decyzje na ściśle określonym zakresie, monotoniczne ograniczanie
uprawnień, pożyczanie uprawnień powiązanych z żądaniem i rozliczanie przyjęcia
przez zużycie uprawnienia. Modele ćwiczeniowe i osobny pakiet natywny w Ruście
mają różne zakresy weryfikacji. Katalog kursu z 20 listopada 2026 r. obejmuje
51 modułów, 204 lekcje, 1436 kroków, 199 pojęć, 200 kompetencji, 349 źródeł
i 16 projektów. Te liczby opisują dostępne materiały. Wyniki kwalifikacji
lokalnej i akceptacji zdalnej mają osobne zapisy.

Opcjonalne [rozszerzenie o ewolucję schematu pliku](docs/file-schema-evolution.pl.md)
zachowuje tożsamość rekordów i historię przydziałów w obsługiwanych wersjach
pliku. Ćwiczenia w przeglądarce sprawdzają normalizację. Osobny pakiet natywny
sprawdza jawne migracje przy założeniu pojedynczego autora zapisu.

## Czego możesz się nauczyć

**Ścieżka podstawowa** kończy się na projekcie Log Analyzer. Obejmuje pierwszy
program w Ruście, sterowanie przepływem, własność i pożyczanie, modelowanie
danych, kolekcje, błędy, Cargo, typy generyczne, traity, czasy życia,
domknięcia, iteratory, testowanie, Number Guessing+ i Log Analyzer.

Mapa kursu zawiera także grupy rozszerzeń, które możesz przeglądać bez
zmiany ścieżki podstawowej. Sugerowana kontynuacja obejmuje Mini grep,
współdzieloną własność i wątki. Pozostałe tematy możesz wybierać według
zainteresowań.

- **Język i abstrakcje.** Wartości w `Box`, współdzielona własność, funkcje
  zwrotne, GAT-y i API pożyczające dane.
- **Współbieżność i usługi.** Wątki, kanały, programowanie asynchroniczne,
  Tokio, sieć, utrzymanie usług i projekt końcowy.
- **Biblioteki i API.** Kontrakty publiczne, obszary robocze, zależności,
  macierze wydań i makra.
- **Testowanie i bezpieczeństwo.** Mini grep, testy własności, fuzzing,
  profilowanie, pomiary alokacji, FFI i kontrakty sprawdzane przez Miri.

Kurs obejmuje projekty Todo CLI, Number Guessing+, Log Analyzer, protokoły
atomowe, potoki Tokio i usługi TCP, utrzymanie usług, obszary robocze
z publicznym API, Mini grep, kontrakty własności, otoczkę bufora FFI,
bezpieczeństwo z Miri i usługę z trwałym dziennikiem. Strony projektów
udostępniają archiwum startowe i archiwum rozwiązania, jeśli istnieje pakiet
Cargo. Pobrane pliki możesz uruchomić w swoim środowisku. Aplikacja nie
uruchamia tych archiwów na Twoim komputerze. Z ostatniego kroku Log Analyzer
lub jego strony projektu otwórz opis Study Session CLI i zbuduj osobny
projekt Cargo od zera. W dzienniku warsztatu zapisz decyzję projektową, test
i rzeczywisty wynik działania CLI. Po przeglądzie tej wersji dodaj filtr
i zapisz, który test regresji chroni pierwotne zachowanie.

Usługa z trwałym dziennikiem ma również opcjonalne laboratorium klienta
z ograniczonym ponawianiem. Osobny pakiet ćwiczeniowy Cargo pokazuje
ponowne wysyłanie identycznej ramki, ograniczone limity, końcowe odmowy
i zachowanie niepewności wyniku. [Opis laboratorium](docs/client-retry.pl.md)
określa zakres źródeł, archiwum i licencji. Pakiet nie dowodzi niezawodności
produkcyjnej i nie uruchamia lokalnie kodu ucznia.

Frame Protocol zawiera opcjonalny
[punkt kontrolny utrzymania biblioteki](docs/frame-protocol-maintenance.pl.md).
Dodaj typowane kategorie błędów bez naruszenia zgodności z istniejącym
klientem. W pobranym obszarze roboczym zapisz własne testy regresji, decyzję
architektoniczną i odpowiedź na uwagi z przeglądu.

Usługa z trwałym dziennikiem obejmuje też opcjonalne ćwiczenie utrzymania
i odzyskiwania działania. Sześć kroków obejmuje przewidywanie, zapoznanie się
z materiałem i samoocenę w zakresie przyjmowania żądań, trwałej tożsamości,
dostarczenia i wyniku `Unknown`. Ćwiczenie nie przyznaje punktów za
samodzielne wykonanie, nie dodaje zadania zaliczeniowego i nie uruchamia kodu
ucznia. Pakiet referencyjny zachowuje pierwsze 37 ścieżek opracowanego obszaru
roboczego i dodaje trzy pliki dotyczące utrzymania. Arkusz ćwiczeń zawiera
puste miejsca na własny projekt ucznia.

Log Analyzer oferuje opcjonalną
[analizę wydajności](docs/performance-investigation.pl.md). Porównaj
obciążenie sprawdzone niezależnie, zbadaj niepewność, zachowaj mały przykład
do odtworzenia i zapisz własną hipotezę, alternatywy oraz odpowiedź na
przegląd. Arkusz zaczyna się pusty. Przeczytanie wzorca nie potwierdza
samodzielnego programowania ani ogólnego wzrostu wydajności.

Poza lekcjami, projektami, historią powtórek oraz lokalnym eksportem
i importem warsztat oferuje wizualizację własności, stopniowane podpowiedzi
Compiler Coach, tryb skupienia, obsługę klawiatury oraz jasny i ciemny motyw.

## Lokalne środowisko nauki

- Postępy, szkice, notatki, zakładki, historię powtórek i historię wyników
  warsztat zapisuje w IndexedDB przeglądarki. Konto nie jest wymagane.
- W ustawieniach możesz wyeksportować zweryfikowany plik postępów i wczytać
  go później. Zrób eksport przed wyczyszczeniem danych przeglądarki lub
  zmianą urządzenia.
- Wersja produkcyjna rejestruje service workera, który zapisuje w pamięci
  podręcznej odwiedzone materiały i pobrane projekty. Po pierwszej wizycie
  online możesz otworzyć zapisane prace i lekcje z pamięci podręcznej offline.
- Uruchamianie kodu Rust ma osobny zakres. Przycisk **Uruchom** przesyła kod
  z edytora do `POST /api/run`, a ten przekazuje go do izolowanego środowiska
  zdalnego. Domyślnie jest to oficjalny Rust Playground. Aplikacja nie
  uruchamia lokalnie kodu ucznia, importowanego kodu, Cargo ani powłoki.
  Nauka offline zachowuje stan, ale wykonanie kodu wymaga dostępnego
  środowiska zdalnego. Jego niedostępność oznacza problem infrastruktury.
  Szczegóły opisuje [dokumentacja uruchamiania kodu](docs/runner.pl.md).

Warsztat jest środowiskiem do nauki. Stan przeglądarki i zaimportowane dane
są lokalne i nie potwierdzają wyniku zewnętrznego egzaminu ani określonego
efektu nauki.

## Uruchomienie lokalne

Obsługiwane wersje Node to `^22.23.4 || ^24.22.1 || ^26.12.1`. Do uruchomienia
aplikacji i korzystania z ćwiczeń w przeglądarce nie potrzebujesz zestawu
narzędzi Rusta.

W świeżej kopii repozytorium uruchom poniższe polecenia.

```sh
git clone https://github.com/fettpl/rust-workshop.git
cd rust-workshop
npm ci
npm run dev
```

Otwórz <http://127.0.0.1:3000>. Serwer deweloperski generuje pliki projektów
w ramach cyklu npm. Poniższe polecenia uruchamiają wersję produkcyjną, która
obsługuje działanie offline przez service workera.

```sh
npm run build
npm start -- --port 3002
```

Pozostaw serwer uruchomiony. W drugim terminalu zainstaluj Chromium
używane przez Playwright i wykonaj kontrolę trybu offline.

```sh
npx --no-install playwright install chromium
npm run test:offline
```

Na Linuksie użyj `npx --no-install playwright install --with-deps chromium`,
jeśli brakuje bibliotek systemowych Chromium. Kontrola korzysta z lokalnego
serwera produkcyjnego i sprawdza działanie aplikacji offline z materiałami
z pamięci podręcznej. Wykonanie kodu Rust nadal wymaga środowiska zdalnego.

Rust jest potrzebny po rozpakowaniu projektu Cargo oraz do weryfikacji
zaufanych materiałów testowych z repozytorium. Polecenia te przyjmują stałe
dane wejściowe i działają niezależnie od środowiska wykonawczego ucznia.
Przed pełnym zestawem testów przeczytaj
[opis CI i weryfikacji lokalnej](docs/ci-cd.pl.md).

## Współtworzenie projektu

[CONTRIBUTING.md](CONTRIBUTING.pl.md) opisuje konfigurację, rodzaje zmian,
weryfikację, pull requesty i prawa do wkładu. Krótki
[szablon pull requestu](.github/pull_request_template.pl.md) pomaga wskazać
zmiany języka materiałów, trwałych identyfikatorów, dowodów i weryfikacji.

Najważniejsze katalogi i pliki źródłowe są zestawione poniżej.

| Obszar | Lokalizacja |
| --- | --- |
| Lekcje, moduły, pojęcia, powtórki, źródła i projekty | `src/content/`, składane w `src/content/course.ts` |
| Kontrakty domenowe i zapisu danych | `src/domain/`, `src/persistence/` |
| Ocena zadań, postępy i powtórki | `src/engine/` |
| Interfejs ucznia | `src/components/` |
| Zdalne wykonanie kodu i endpoint API | `src/runner/`, `src/app/api/run/` |
| Zaufane materiały testowe, generowanie pakietów i weryfikacja | `scripts/`, `tests/`, `scripts/fixtures/` |

Dobry pierwszy wkład to jaśniejsze wyjaśnienia po angielsku i po polsku,
ćwiczenia z naprawy kodu i zastosowania pojęć w nowym kontekście, aktualizacja
źródeł, testy projektów albo niewielkie usprawnienia interfejsu. Zachowaj
istniejące identyfikatory lekcji, modułów, pojęć, powtórek, projektów i źródeł.
Zależą od nich zapisane postępy i importowany stan.

Poniższe polecenia szybko sprawdzają aplikację i materiały kursu.

```sh
npm run typecheck
npm run lint
npm run content:check
```

`npm run typecheck` najpierw generuje typy tras Next.js i plik `next-env.d.ts`
przez skrypt `pretypecheck`. Git ignoruje wygenerowane pliki. Tę kontrolę
można wykonać bez uruchamiania serwera deweloperskiego lub budowania wersji
produkcyjnej.

`npm test` obejmuje uruchamianie zaufanych natywnych materiałów testowych.
Nowy przebieg weryfikacji wymaga stabilnego zestawu narzędzi Rusta i pamięci
podręcznej z przypiętymi zależnościami Tokio. Opisuje je
[dokumentacja CI i weryfikacji lokalnej](docs/ci-cd.pl.md). Natywna kontrola
prefiksu zainicjalizowanych danych wymaga także jawnie zakwalifikowanego
profilu. Zwykły przebieg lokalny ją pomija, chyba że po udokumentowanej
konfiguracji offline ustawiono `RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED=1`.
Pominięcie kontroli lub problem z infrastrukturą oznacza brak wyniku tej
weryfikacji.

## Stan licencji

Osoba utrzymująca projekt zatwierdziła poniższy podział licencji oraz
oznaczenie **Pixel Media Workshop Paweł Borawski** (2026).
[Ocena praw](docs/rights-assessment.pl.md) opisuje przegląd źródeł kursu
w określonym zakresie i akceptację pochodzenia ikony. Szersze warunki
wydania są rozliczane osobno. Licencje obejmują prawa, których projekt
może udzielić.

- MIT obejmuje kod aplikacji, skrypty, testy, mechanizmy oceny, przykłady
  programistyczne, wykonywalny kod lekcji i rozwiązań oraz kod w pobieranych
  archiwach projektów.
- CC BY 4.0 obejmuje autorską narrację dydaktyczną, treść ćwiczeń, omówienia
  odpowiedzi, wyjaśnienia oraz autorskie i zatwierdzone oryginalne ilustracje.
- Materiały zewnętrzne zachowują pierwotną licencję i wymagane oznaczenie
  autorstwa.

Niektóre pliki TypeScript łączą wykonywalny kod i autorski tekst lekcji.
Zastosuj odpowiednią licencję do każdej części pliku i zachowaj informacje
o licencji i autorstwie, jeśli wykorzystujesz fragment. Trzy istniejące
manifesty autorskich pakietów Cargo zachowują zatwierdzone wyrażenie
`MIT OR Apache-2.0` ograniczone do tych pakietów. Bieżący
[przewodnik licencyjny](docs/licensing.pl.md) określa zasady dla plików,
treści mieszanych i archiwów. W granicach przeglądu kursu nie stwierdzono
istotnego skopiowania treści wymagającego działania. Osoba utrzymująca
projekt zaakceptowała udokumentowane pochodzenie ikony wygenerowanej przez
asystenta 24 października 2026 r. i potwierdziła, że według jej wiedzy nie
dostarczyła dodatkowego pliku ani materiału referencyjnego. Obie wskazane
kwestie pochodzenia zostały zamknięte. Pełna ocena praw autorskich, znaków
towarowych i uprawnienia do publikacji pozostaje poza zakresem przeglądu.
Każde późniejsze konkretne ustalenie wymaga oceny.

Według osoby utrzymującej projekt kurs przygotowany na ten etap powstał
przy użyciu ChatGPT i Codex Desktop z modelami GPT-5.6 i nowszymi do
opracowania materiałów i wyszukiwania informacji. Osoba utrzymująca
przekazała polecenia i wyznaczyła kierunek, bez ręcznego redagowania
fragmentów kursu. Jest to opis sposobu powstania materiałów. Przewodnik
licencyjny objaśnia granice wnioskowania o oryginalności, ochronie
prawnoautorskiej i prawach osób trzecich oraz podaje zatwierdzony wzór
oznaczenia autorstwa.

Bieżący szkic wydania obejmuje repozytorium źródłowe, autorskie archiwa
Cargo i udostępnianą dokumentację audytu. Zakres pomija wdrożenie
hostingowe, skompilowaną aplikację przeglądarkową, katalog `.next` i drzewo
`node_modules`.

[SECURITY.md](SECURITY.pl.md) opisuje aktualne ograniczenia zgłaszania
i wymagania wydania. Prywatny kanał zgłoszeń wymaga weryfikacji. Nie
zamieszczaj sekretów, prywatnych załączników, danych konta lub rozliczeń
ani ścieżek Twojego komputera w publicznych zgłoszeniach i pull requestach.

## Informacje o projekcie

[Przewodnik po wersjach językowych](docs/localization.pl.md) opisuje te wersje
i sposoby ich weryfikacji.

[Mapa kursu](docs/advanced-curriculum.pl.md) opisuje bieżący zakres
i pozostałe prace. [AGENTS.md](AGENTS.pl.md) zawiera zasady pracy
z repozytorium. Szczegóły wykonania kodu i weryfikacji opisują
[docs/runner.md](docs/runner.pl.md) oraz [docs/ci-cd.md](docs/ci-cd.pl.md).
Repozytorium jest przygotowywane do publicznego wydania. Zmiana widoczności,
publikacja pakietów i wdrożenie aplikacji hostingowej to odrębne działania.
