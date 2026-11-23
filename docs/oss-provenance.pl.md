# Wykaz pochodzenia plików w określonym zakresie

[English](oss-provenance.md)

[Wykaz](oss-provenance.json) zapisuje sumy SHA256 bajtów wszystkich plików
śledzonych przez Git w `src/content/` i `public/`. Obejmuje treść kursu,
źródła i śledzone pliki publiczne. Ignorowane pliki dystrybucji Monaco,
generowane archiwa projektów, zależności, historia repozytorium i inne
ścieżki pozostają poza tym wykazem. Mają własne kontrole i informacje
licencyjne. [Przewodnik licencyjny](licensing.pl.md) określa zatwierdzony
podział MIT i CC BY 4.0, oznaczenie projektu, zasady dla plików mieszanych
i trzy ograniczone wyjątki Cargo. Wykaz nie przyznaje praw i nie zastępuje
przewodnika.

Poniższe polecenia uruchom z głównego katalogu repozytorium. Wystarczy Node,
bez instalacji zależności.

```sh
node --test scripts/verify-oss-provenance.test.mjs
node scripts/verify-oss-provenance.mjs --check
node scripts/verify-oss-provenance.mjs --release
```

Domyślny tryb to `--check`. Kod **0** oznacza zgodność schematu, śledzonych
plików, odwołań, ścieżek i bieżącej zawartości plików. Otwarte kwestie praw
pozostają widoczne. `--release` zwraca **2** dla poprawnego wykazu
z otwartymi kwestiami praw w jego zakresie, **1** dla błędnego wykazu
lub awarii infrastruktury oraz **0**, gdy zapisane ustalenia spełniają
tę kontrolę pochodzenia. Gotowość OSS, zgoda na publikację, integracja,
bezpieczeństwo, prywatność, CI i decyzja o widoczności podlegają osobnym
warunkom. Po potwierdzeniu pochodzenia ikony 24 października 2026 r.
oczekiwany wynik wydania wynosi **0**. Obie grupy przejrzano i zamknięto
ich zapisane blokady. Ocena obowiązuje w opisanym zakresie.

## Fakty i ustalenia przeglądu

- Grupa kursu zapisuje relację osoby utrzymującej projekt o generowaniu
  przy użyciu ChatGPT i Codex, z poleceń i według wskazówek, bez ręcznego
  redagowania fragmentów. Pierwotna [ocena praw](rights-assessment.pl.md)
  ujęła 294 pliki kursu, sprawdziła wydzielone jednostki i zawiera
  ręczny przegląd kontekstu. W tym historycznym zakresie nie ustalono
  istotnego skopiowania treści wymagającego działania.
  `course-source-review` jest zamknięty jako zapis tej oceny.
  Poprzedni punkt kontrolny obejmował 338 plików kursu i pięć publicznych.
  Bieżący wykaz obejmuje 458 plików kursu i sześć publicznych.
  Wykaz dotyczy zawartości wskazanych ścieżek. Ocena praw opisuje także
  późniejszą korektę kontraktów istniejących lekcji, z zakończonym
  niezależnym przeglądem C1. [Opis A10](client-retry.pl.md) dokumentuje
  ponowne użycie wewnętrznego wzorca i brak ustalonego zewnętrznego
  kodu w zakresie przeglądu. Nadal obowiązują dotychczasowe ograniczenia
  oceny praw, oryginalności, publikacji, znaków towarowych, prywatności
  i wydania. Przywołanie źródła jest tropem do oceny. Udzielenie zgody
  wymaga odrębnej podstawy.
- Pochodzenie ikony udokumentowano jako generację asystenta. Prywatne
  zapisy pokazują budowę SVG zapisanego wprost i potwierdzenie wykonania,
  a następnie zgłoszoną przez asystenta zmianę palety. Bieżące PNG
  odtwarzają się z SVG bajtowo i pikselowo w zmierzonym procesie sharp.
  Ludzkie autorstwo, historyczne wersje narzędzi i prawa do znaków
  pozostają odrębnymi kwestiami. 24 października 2026 r. osoba utrzymująca
  projekt zaakceptowała udokumentowane pochodzenie i potwierdziła, że
  według jej wiedzy nie udostępniono dodatkowego zewnętrznego pliku
  ikony ani materiału referencyjnego. Pochodzenie ma wartość
  `maintainer-reported-ai`, przegląd `reviewed`, a `icon-rights` jest
  zamknięty w tym zakresie. Nie potwierdza to ręcznego wykonania ani
  pełnej oceny praw.
- `public/manifest.webmanifest`, `public/manifest.en.webmanifest` i
  `public/sw.js` są metadanymi lub oprogramowaniem objętym MIT zgodnie
  z przewodnikiem. Ustalenie `not-applicable` oznacza, że warunki
  przeglądu ilustracji i kursu nie dotyczą tych plików. Nie stanowi
  to oceny praw osób trzecich ani przeglądu całego projektu.

## Schemat i aktualizacja wykazu

Schemat w wersji 1 ma dokładnie `schemaVersion`, `scope`, `groups`,
`entries` i `blockers`. Zakres to dokładnie `["src/content/", "public/"]`.
Każdy wpis ma kanoniczną względną ścieżkę POSIX `path`, zapisaną małymi
literami sumę `sha256` i odwołanie `group`. Pola opcjonalne `derivedFrom`
i `generator` występują razem. Generatorem jest proces
`scripts/setup-assets.mjs`. Wskazane źródła pochodzenia muszą istnieć
w wykazie i tworzyć graf acykliczny. Każda grupa musi być użyta.

Kategorie grup to `course`, `asset` lub `software`. Pochodzenie przyjmuje
`maintainer-reported-ai`, `unresolved` lub `repository-software`.
Stan przeglądu to `pending`, `reviewed` lub `not-applicable`. Ostatni
jest zastrzeżony dla kategorii oprogramowania o pochodzeniu z repozytorium.
Dowody przeglądu zawierają odwołania do dokumentów względem repozytorium.
Blokada ma identyfikator, grupę, stan `open` lub `resolved` i krótki opis.
Każda grupa oczekująca wymaga otwartej blokady. Zamknięta blokada wymaga
stanu innego niż oczekujący. Nieznane pola, wersje i stany powodują
odrzucenie. Tekst dowodowy i odwołania to zapisy przeglądu. Nie są
automatycznie potwierdzoną zgodą.

Po dodaniu, usunięciu lub zmianie śledzonych plików sprawdź dokładną
różnicę i zakres przed odświeżeniem wpisów oraz sum. Zapisz znane
kopiowane i adaptowane materiały, ich dokładne źródło, wersję, właściwą
licencję i wymagane informacje. Oceń nowe konkretne dowody kopiowania
według właściwej licencji. Sprawdź ponownie grupę, jeśli nowe wejścia
lub ustalenia zmieniają podstawę wcześniejszego przeglądu. Zapisuj
dostępną historię generacji i wcześniejsze dowody prywatnie. W publicznym
wykazie pomiń lokalne ścieżki, prywatne zapisy, dane konta i kopie
poleceń. Zapisz status przeglądu dopiero po sprawdzeniu podstaw.
Zachowaj nierozstrzygnięte ustalenia i opisz ograniczenia. Sumy,
oznaczenie, wynik modelu, nazwy plików licencji i warunki własności
wyniku same nie rozstrzygają praw.

Weryfikator tylko odczytuje dane. Ustalone polecenie
`git ls-files -z -- src/content public` określa pokrycie. Weryfikator
sprawdza ścieżki i wszystkie ich składniki przed odczytem. Odrzuca
łącza symboliczne w plikach lub katalogach nadrzędnych, niejednoznaczne
ścieżki, kolizje wielkości liter, brak pokrycia, błędne odwołania
i rozbieżność zawartości. Nie skanuje dowolnych ścieżek ani nie
uruchamia kodu ucznia, Cargo lub zapytań sieciowych. Nie zatwierdza
zapisów i nie aktualizuje sum. Brak Git lub nieczytelne wejście powodują
błąd. Diagnostyka podaje ustalone kody, liczby i identyfikatory warunków.
Nie drukuje kodu źródłowego ani surowych błędów systemu plików. Uruchamiaj
z ustabilizowanej lokalnej kopii. Jednoczesna złośliwa podmiana plików
jest poza zakresem narzędzia. Udany syntetyczny test przejrzanego wpisu
sprawdza tylko kontrakt kodów zakończenia.

## Zmiana lokalnego badania wydajności

A7 dodaje opracowane z pomocą asystenta polskie polecenia do badania
i tekst arkusza, dosłowną procedurę odtworzenia, stałe materiały testowe
Rust oraz historyczne projekcje testowe z rzeczywistego wcześniejszego
rejestru. Bajty istniejących manifestów i blokad Cargo, informacje
archiwów i przypisania licencji pozostają takie same. Użycie API
Criterion ogranicza się do istniejącej zależności deweloperskiej 0.5.1,
a odnośnik do jej dokumentacji znajduje się w opisie badania
i materiałach pakietu. Arkusz ucznia nie zawiera gotowych wyników
pomiarów.

Odświeżony wykaz rejestruje bajty źródeł i zgłoszone pochodzenie
generacji. Przeglądy źródeł i techniczne obowiązują w opisanym zakresie.
Ludzkie autorstwo, oryginalność, prawa do znaków, skuteczność nauki
i zezwolenie na publikację wymagają odrębnych podstaw. Nowe konkretne
dowody o zewnętrznych źródłach oceń zgodnie z istniejącym przewodnikiem
licencyjnym. Prywatne potwierdzenia generacji i wykonania pozostają
poza publicznym drzewem.

## Zmiana wykazu dla typowanej autoryzacji — 4 listopada 2026

Poprzedni punkt kontrolny opisany wyżej obejmował 338 plików kursu
i pięć publicznych, razem 343. Wykaz kandydata A11 obejmował 349 plików
kursu i pięć publicznych, razem 354, w tym jedenaście nowych autorskich
plików treści. Dodawał dokładne ścieżki i odświeżał sumy zmienionej
zawartości dla tej lokalnej rewizji. Nie rozszerzał wcześniejszego
przeglądu. [Zapis materiałów autoryzacji](service-authorization.pl.md)
rozróżnia wykonywalne i operacyjne materiały objęte MIT od tekstu
dydaktycznego na CC BY 4.0. Zapisuje przygotowanie z pomocą AI
i dotychczasowe oznaczenie właściciela. Ustalenie o użyciu wewnętrznego
wzorca i braku nowego dołączonego kodu zewnętrznego dotyczy tej zmiany.
Nie dodano licencji, wyjątku Apache, ustalenia prawnego ani zezwolenia
na publikację.

Wpisy kandydata obejmowały nowe pliki, których Git nie śledził przed
skoordynowanym dodaniem do indeksu. Weryfikator porównuje pliki śledzone
przez Git. Migawka A11 wymagała dodania do indeksu i ponownej kontroli
sum. Prywatny raport klasyfikacji zawiera wszystkie zmienione
i dodane ścieżki w zakresie oraz rzeczywiste sumy. Punkt kontrolny
tworzenia źródeł nie potwierdza `--check` ani `--release` dla
niedodanego wykazu.
