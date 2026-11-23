# Utrzymanie zależności filtrującej HTML w edytorze Monaco

[English](dependency-maintenance.md)

Aplikacja ładuje Monaco 0.57.0 przez lokalny moduł ładujący AMD pod
`/monaco/vs`. W opublikowanym fragmencie pakietu edytora zaszyto wersję
fabryki DOMPurify objętą podatnością. Samo ustawienie override w npm jej
nie podmienia. Przygotowanie zasobów usuwa całą sprawdzoną fabrykę i
importuje niezmienioną, oficjalną pojedynczą instancję DOMPurify 3.4.17
z dystrybucji UMD w trybie AMD. Otaczający kod funkcji wywoływanych przez
filtr Monaco i procedury czyszczenia pozostają identyczne bajt po bajcie.
Bezpośrednia zależność i override ograniczony do pakietu nadrzędnego
naprawiają również graf zależności. Dotychczasowy TypeScript z tym samym
wymaganiem wersji jest teraz zależnością produkcyjną, ponieważ używa go
parser zasobów w skrypcie postinstall, również przy pominięciu zależności
deweloperskich. Dotychczasowe wymaganie dotyczące `sharp` również pozostaje
bez zmian w zależnościach produkcyjnych, ponieważ postinstall generuje
ikony. Sprawdzono instalacje z pliku blokady w obu trybach.

`scripts/monaco-sanitizer.mjs` sprawdza dokładne wersje pakietów, skróty
źródła, fabryki i poprawionego artefaktu, strukturę AMD, odwołania i
dozwolone zakresy edycji. Jeśli dane wejściowe się zmienią, instalacja
kończy się błędem, ponieważ skrypt wymaga zweryfikowanych granic kodu
wewnętrznego. Skrypt sprawdza całe przygotowane drzewo katalogów, a
następnie podmienia zasoby przez zmianę nazw katalogów i cofa typowe awarie
podmiany. Podmiana odbywa się transakcyjnie w zwykłym przebiegu, ale ma
okno widoczności i nie stanowi atomowej zamiany wielu katalogów odpornej
na awarię procesu. Jeśli cofnięcie się nie powiedzie, pełne poprzednie
drzewo pozostaje w katalogu kopii zapasowej wskazanym w błędzie.

Generowany plik `sanitizer-provenance.json` używa wyłącznie ścieżek
względnych i zapisuje skróty źródła, wersji z poprawką i wynikowych
artefaktów. Oficjalne noty Monaco, licencja DOMPurify, nagłówki artefaktu
i mapa źródeł są kopiowane bez zmian. Ponowne wygenerowanie zasobów nie
wymaga sieci. Każda aktualizacja wymaga przeglądu i zatwierdzenia
dokładnego skrótu oficjalnego artefaktu.

Zmiana naprawia wyłącznie wersję AMD dostarczaną przeglądarce. Zainstalowane
`monaco-editor/esm` pozostaje w oryginalnej wersji wydawcy i nie może
być używane w czasie działania. Kontrola drzewa składniowego odrzuca
odwołania do pakietu i jego ESM podane wprost w kodzie w importach wartości,
reeksportach, `import()` i `require()`, w tym w importach mieszanych i
składni import-equals. Czyste importy typów są dopuszczalne. Taka analiza
ma ograniczony zakres, ponieważ import może używać wyliczanej nazwy
modułu. Niezależnie od niej sprawdza się zasoby dostarczane w żądaniach
przeglądarki.

Usuń adaptację i override ograniczony do danego pakietu dopiero, gdy
wydana wersja Monaco zawiera sprawdzoną poprawkę filtra w dystrybucji
faktycznie dostarczanej przeglądarce. Sprawdź nowe bajty wydawcy oraz
uruchom audyty grafu, ponowną instalację z pliku blokady, testy mutacji
i cofania podmiany zasobów, próby na rzeczywistej instancji w przeglądarce,
testy E2E edytora i migrację w trybie offline. Nieszkodliwa próba z
elementem shadow root potwierdza podmianę kodu objętego podatnością.
Możliwość osiągnięcia konfiguracji opisanej w komunikacie o podatności
wymagałaby osobnego sprawdzenia. Instrumentacja występuje wyłącznie w
odpowiedziach tras testów przeglądarkowych.

Service worker odczytuje dane wyłącznie z aktywnej generacji pamięci
podręcznej. Aktywacja usuwa wcześniejsze generacje. Obsługa starych żądań,
które jeszcze trwają, może je odtworzyć bez wpływu na bieżące odczyty.
Otwarta karta, w której JavaScript już się wykonał, wymaga później
kontrolowanego przeładowania. Poprawka zostawia decyzję o przeładowaniu
użytkownikowi i zachowuje szkice kursanta. Testy przeglądarkowe sprawdzają
kontrolowane przeładowanie i naprawę w trybie offline.

## Bieżąca aktualizacja zależności i odroczenia ze względu na zgodność

W aktualizacji z 24 października 2026 r. użyto Tokio 1.54.1 w bieżących
archiwach autorskich i zamkniętym profilu testów natywnych. Aktualizacja
uwzględnia problem bezpieczeństwa I/O w konstruktorach `AsyncFd`
dotyczący wersji 1.53.1, opisany w
[RUSTSEC-2026-0386](https://rustsec.org/advisories/RUSTSEC-2026-0386.html).
Kod autorski nie wywołuje tych konstruktorów. Tokio 1.54.0 ma odrębny
problem opisany w
[RUSTSEC-2026-0384](https://rustsec.org/advisories/RUSTSEC-2026-0384.html).
Wersja 1.54.1 wprowadza obie poprawki. Dokładnie Rust 1.85 pozostaje MSRV.
Dawne metadane testów zachowują oryginalny cel i są wyłączone z bieżącego
wykazu uruchomień natywnych. Historyczne potwierdzenia, migawki źródeł i
datowane zapisy kontroli Playground zachowują pierwotne bajty i zakres.

Zgodne aktualizacje npm obejmują React i React DOM 19.3.1, Lucide 1.61.0,
Zod 4.6.7, Playwright 1.64.1, axe-core 4.14.0, Vitest 5.0.5 i Vite 8.3.5.
Number Guessing używa rand 0.10.3. Pliki blokady zapisują bieżące wersje
i dane kontroli integralności z rejestru. Przed kolejnymi wydaniami
sprawdź ponownie stan rejestru i komunikaty o podatnościach.

Przyjęcie części najnowszych stabilnych wersji wymaga osobnej migracji.

- TypeScript 7.0.2 zastępuje klasyczne API kompilatora używane przez
  sprawdzoną adaptację filtra niestabilnymi eksportami API. Najnowszy
  `typescript-eslint` 8.72.0 również wymaga TypeScript poniżej 6.1.
  Pozostań przy 6.0.3 do czasu przeglądu migracji zarówno parsera, jak
  i zestawu narzędzi lint.
- ESLint 9.39.5 utracił wsparcie wydawcy. ESLint 10.13.0 koliduje z
  zakresami zależności równorzędnych najnowszych `eslint-plugin-react`,
  `eslint-plugin-jsx-a11y` i `eslint-plugin-import` używanych przez
  `eslint-config-next` 16.4.3. Luka we wsparciu narzędzi pozostaje jawna.
  Zachowaj kontrolę zgodności zależności i dotychczasowe testy.
  Zero komunikatów o podatnościach nie przywraca wsparcia wydawcy.
- Deklaracje typów Node pozostają w linii Node 22, ponieważ obsługiwany
  jest Node 22.23.4. Typy Node 26 mogłyby dopuścić użycie API
  niedostępnego w obsługiwanym środowisku.
- Criterion 0.8.2 wymaga Rusta 1.86, proptest 1.12.0 wymaga 1.88, a
  rusqlite 0.41.0 wymaga 1.89. Przypięte wersje 0.5.1, 1.11.0 i
  0.40.2 zachowują zgodność z Rustem 1.85 oraz kontrakty historycznych
  testów wydajności. Pozostałe nieaktualne wersje zależności pośrednich
  podlegają zakresom pakietów nadrzędnych. Sam starszy numer główny
  wersji nie potwierdza podatności.

Sprawdź pełny graf npm i graf produkcyjny, bajty Monaco faktycznie
dostarczane przeglądarce, nieużywaną zainstalowaną wersję ESM oraz każdą
paczkę z rejestru wymienioną w autorskich plikach blokady Cargo.
Porównaj wersje z publicznymi zakresami RustSec dla wersji poprawionych i
nieobjętych danym problemem, uwzględnij komunikaty informacyjne o
niespełnieniu gwarancji bezpieczeństwa pamięci i sprawdź oficjalne sumy
kontrolne oraz przypadki wycofania wersji w rejestrze. Wynik npm audit
z zerem komunikatów obejmuje dany graf i daną bazę podatności. Aktualność
zależności, poprawki kodu wbudowanego w pakiety i bezpieczeństwo poza
zakresem bazy wymagają osobnych danych. Bieżący zakres zależności
repozytorium nie obejmuje manifestów zależności, importów kodu ani
programów wykonywanych w Pythonie lub PHP. Zależności projektu ustalaj
na podstawie jego plików. Wiadomości od wydawców i aktualizacja narzędzi
na maszynie nie zastępują tej kontroli.

Pole `engines` deklaruje wersje Node `^22.23.4 || ^24.22.1 || ^26.12.1`,
czyli poprawione wydania wskazane w oficjalnym
[komunikacie bezpieczeństwa z 21 października 2026 r.](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
Zakres wyklucza wcześniejsze podatne wydania i nieobsługiwane linie
nieparzyste. W zwykłej konfiguracji npm używa `engines` do ostrzegania.
CI wybiera najnowszą wersję Node 22 z `check-latest: true`. Wymagania
minimalne obowiązują w podanym stanie i wymagają ponownego przeglądu
w miarę publikacji komunikatów o bezpieczeństwie.

## Dołączone komponenty natywne

Zainstalowana dystrybucja Sharp 0.35.5 dla macOS arm64 zgłasza libvips
8.18.7 i librsvg 2.63.2. Pierwsza wersja jest nowsza od wersji zawierających
poprawki wskazane w opublikowanych
[komunikatach libvips](https://github.com/libvips/libvips/security/advisories).
Wersja 2.63.2 naprawia RUSTSEC-2026-0305 i CVE-2026-96889 według
[not do wydania librsvg](https://github.com/GNOME/librsvg/blob/main/NEWS).
Pakiety dla różnych platform mogą zawierać różne kompilacje natywne.
Zachowaj dołączone noty wydawców i przed dystrybucją pliku wykonywalnego
sprawdź rzeczywistą platformę docelową.

Przestrzeń robocza SQLite korzysta z rusqlite 0.40.2 i libsqlite3-sys
0.38.2 z dołączonym SQLite 3.53.2. Oficjalna
[tabela CVE SQLite](https://sqlite.org/cves.html) wskazuje 3.53.2 jako
poprawkę dla CVE-2026-11822 i CVE-2026-11824. Nowsze wydania utrzymaniowe
SQLite są dostępne. Aktualizację odroczono jawnie ze względu na zgodność.
Najnowsza para rusqlite 0.41.0 i libsqlite3-sys 0.39.0 wymaga odpowiednio
Rusta 1.89 i 1.88, powyżej MSRV projektu 1.85. Zachowaj dostarczony plik
źródłowy C i zgodną wersję paczki sys. Audyt dołączonych bibliotek C
wymaga osobnego sprawdzenia poza dopasowywaniem nazw paczek Rusta
w RustSec.
