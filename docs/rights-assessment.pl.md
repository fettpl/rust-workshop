# Ocena praw do kursu i ikony w określonym zakresie

[English](rights-assessment.md)

Ocena odnotowuje przegląd źródeł kursu i możliwych przypadków kopiowania
w określonym zakresie oraz udokumentowane pochodzenie ikony projektu.
Wyłączność praw autorskich do każdego wygenerowanego fragmentu,
pełna ocena praw osób trzecich i zgoda na publikację pozostają odrębnymi
kwestiami. Zatwierdzony [podział licencji](licensing.pl.md), oznaczenie
projektu i trzy wyjątki dla Cargo dotyczą praw, których projekt może
udzielić.

## Zakres i dowody

Podstawą przeglądu jest `2aecc24d238f74a5e89d759fe4090fde3468d221`.
Pierwotna ocena objęła 294 śledzone pliki w `src/content/` i pięć w
`public/`. Poniżej opisano trzy pliki ikony. Manifest i service worker
zachowują kwalifikację oprogramowania. Wykaz C1 obejmował 321 plików kursu
i pięć plików publicznych. Opisana poniżej korekta przeszła niezależny
przegląd w wyznaczonym zakresie. Historyczna ocena nie obejmuje wszystkich
praw do tego wykazu. Prywatne zapisy przeglądu zachowują sumy plików,
zakres wydzielonych jednostek, porównania, ustalenia ręczne i zapisy
generacji. Prywatne polecenia, transkrypcje, zapisy konta i ścieżki
komputera pozostają poza publicznym dokumentem.

## Wygenerowane materiały i stosowane prawa

Według osoby utrzymującej projekt ChatGPT i Codex opracowały tekst kursu
i wyszukiwały informacje na podstawie jej poleceń i kierunku, bez
ręcznego pisania fragmentów kursu. Opis procesu nie rozstrzyga ochrony
ludzkiego autorstwa każdego wyniku ani występowania cudzej twórczości.
Nie określaj kursu jako ręcznie napisanego i nie uznawaj automatycznie
wszystkich wyników AI za domenę publiczną. Udokumentowany twórczy wybór,
układ lub redakcja człowieka wymagają osobnej oceny względem wyniku
wygenerowanego maszynowo.

[OpenAI Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/),
w wersji z aktualizacją 16 stycznia 2026 r., przenoszą ewentualne prawa
OpenAI do wyniku na użytkownika w granicach dozwolonych przez prawo.
Ten podział między stronami nie rozstrzyga powstania praw autorskich,
wyłączności ani praw osób trzecich. Kanoniczne
[Service Terms](https://openai.com/policies/service-terms/) sprawdzone
24 października 2026 r. mają aktualizację z 16 października 2026 r.
Sekcja generowania kodu i Codex wskazuje na możliwe licencje osób trzecich.
Bieżące teksty nie odtwarzają umowy i wersji obowiązującej przy każdej
generacji. [OpenAI Services Agreement](https://openai.com/policies/services-agreement/)
zaktualizowana 1 grudnia 2025 r. i obowiązująca od 1 stycznia 2026 r.
jest istotna, jeśli faktycznie miała zastosowanie. Indywidualna
subskrypcja Pro sama tego nie potwierdza.

[Sharing and Publication Policy](https://openai.com/policies/sharing-publication-policy/)
z aktualizacją 14 listopada 2022 r. wspiera rzetelne ujawnienie procesu
i odpowiedzialny przegląd. Postanowienia dotyczące API nie potwierdzają
użycia API w kursie i nie uzasadniają deklarowania redakcji przez człowieka,
jeżeli jej nie było.

Polskie prawo autorskie rozróżnia indywidualny twórczy sposób wyrażenia
od idei, procedur i zasad. Opracowania zachowują prawa do utworu
pierwotnego, a twórczy wybór lub układ może podlegać odrębnej ochronie.
Zobacz [oficjalny tekst jednolity ustawy](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf),
zwłaszcza art. 1–3, 8 i 74 (Dz.U. 2025 poz. 24, stan prawny tekstu
jednolitego na 3 grudnia 2024 r.). To ogólna podstawa ustawowa.
Nie zawiera rozstrzygnięcia dotyczącego kursu.
[Wyrok TSUE w sprawie Painer, C-145/10](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A62010CJ0145),
w pkt 87–94, łączy oryginalność ze swobodnymi wyborami twórczymi i osobistym
charakterem w kontekście fotografii. Zastosowanie tego rozumowania do
poleceń dla modeli jest wnioskiem, a wyrok nie rozstrzyga sprawy AI.

Zatwierdzony podział MIT i CC BY 4.0 obejmuje prawa posiadane przez
projekt. [Tekst prawny CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en)
nie tworzy praw autorskich do niechronionych materiałów ani nie usuwa
zobowiązań wobec osób trzecich. Oznaczenie projektu nie ustanawia
autorstwa, a cytat nie stanowi zezwolenia.

## Porównanie kursu i ustalenia

W pierwotnym zakresie wszystkie 294 śledzone pliki kursu ujęto w wykazie
z sumami SHA256 i metadanymi pierwszego wprowadzenia w Git. Statycznie
porównano 27 883 lokalne jednostki z 7492 publicznymi jednostkami źródeł
zewnętrznych o łącznej długości 4 671 689 tokenów. Powstały 244
rekordy kandydatów przy 52 odrębnych lokalnych miejscach składni.
Wpisy są tropami do porównania. Ręcznie sprawdzono 16 przypadków
obejmujących klasy kandydatów i wybrane regiony tekstu oraz kodu.

Wykaz obiektów źródłowych zawiera 301 odrębnych adresów URL wraz ze
zapisami historycznymi. Osobno pobrano 275 z 277 odrębnych publicznych
stron cytowanych po usunięciu powtórzeń fragmentów i odnośników do
samego projektu. Dwie ścieżki rust-fuzz na GitHub zwróciły 404.
Domniemany adres licencji bloga Rusta również zwrócił 404. Ogólna zgoda
na powielanie bloga pozostała nieustalona. Przywołanie źródła i pobranie
go nie udzielają licencji.

Pobrane migawki repozytoriów i zweryfikowane podstawy licencji podano
poniżej.

| Repozytorium źródłowe | Pobrany commit | Podstawa licencji |
| --- | --- | --- |
| [Rust Book](https://github.com/rust-lang/book) | `1500248d8f230566e4ec9f27fcbb8fe9e2898ab1` | MIT OR Apache-2.0 |
| [Rust by Example](https://github.com/rust-lang/rust-by-example) | `dcc14f912bf8790792a2df082eddc82ab2539229` | MIT OR Apache-2.0 |
| [Rustonomicon](https://github.com/rust-lang/nomicon) | `b0bb569883a3e65ab19d4f1adf1b8dbc1629d0a6` | MIT OR Apache-2.0 |
| [Rust Reference](https://github.com/rust-lang/reference) | `3989fe91f1a601b51684a582ad17b2503f221787` | MIT OR Apache-2.0 |
| [Witryna Tokio](https://github.com/tokio-rs/website) | `71cdb3858fbb943843e8cf0e8baf547fe22180f7` | MIT |
| [Tokio](https://github.com/tokio-rs/tokio) | `8a2408edcfa2b7f19c00428a9d3a8ea6652a083f` | MIT |

Są to pobrane migawki. Nie potwierdzają wejść historycznej generacji.
Zachowano odrębność wersjonowanych odnośników do dokumentacji Tokio
1.53.1 i 1.54.1. Podmioty praw i informacje źródeł zewnętrznych
pozostają właściwe dla tych źródeł. Tabela nie zastępuje ich oznaczeniem
projektu ani nie licencjonuje cytowanych stron.

| Oceniany obszar | Ustalenie kontekstowe |
| --- | --- |
| Własność, traity, kolekcje, Rc/Weak, wariancja i polskie wyjaśnienia | Wspólna semantyka Rusta. W wybranych regionach nie ustalono istotnego wyróżniającego się listingu ani tłumaczenia twórczego fragmentu. |
| Definicje pakietów Mini grep i gry w zgadywanie | Wspólne pomysły na projekty. Sprawdzona struktura, ograniczenia, wyjście i testy różnią się od przykładów z Rust Book. Nie zidentyfikowano istotnej adaptacji listingu. |
| Rekurencja Cons/Box, zliczanie wywołań Wake i sygnatura traitu GAT | Krótkie rzeczywiste podobieństwa wyrażeń obejmują fragment Cons o długości 32 tokenów, obserwator Wake o długości 53–54 tokenów i sygnaturę GAT o długości 36 tokenów. Ograniczona konwencjonalna forma i kontekst nie wykazały istotnego kopiowania wymagającego działania. Historyczne pochodzenie pozostaje nieznane. Sama długość nie rozstrzyga praw. |
| Metody AsyncWrite, Stream i Future, migawki API i diagnostyka | Zbieżności obejmują wymagane sygnatury, proste ciała i generowany szkielet diagnostyki. Najdłuższy kandydat kodowy miał 92 tokeny. Otaczające autorskie zachowanie nie zostało odtworzone. Nie wykazano braku obowiązkowej informacji licencyjnej. |
| Opis usługi i anulowania w Tokio oraz przykłady zainicjalizowanej pamięci | Sprawdzone reguły ramek, stanu i bezpieczeństwa różnią się od przykładów zewnętrznych. Nie potwierdzono długiego charakterystycznego listingu, cytatu tekstu ani tłumaczenia twórczego fragmentu. |

Jeśli później ustalisz konkretne adaptowane źródło, zachowaj jego
licencję i wymagane informacje w danym fragmencie i dystrybucji.
Ustalona adaptacja dokumentacji Rusta lub Tokio może wymagać informacji
MIT o prawach autorskich, zezwoleniu i wyłączeniu odpowiedzialności.
Oznaczenie projektu CC BY nie zastępuje tych informacji. Nie przypisuj
autorstwa do przypadkowego z kilku możliwych źródeł na podstawie
podobieństwa konwencjonalnych fragmentów. Szersze użycie bloga Rusta
wymaga ustalenia zgody.

Przegląd źródeł kursu ma status **przejrzany**. W określonym zakresie
**nie ustalono istotnego skopiowania treści wymagającego działania**.
Wpis `course-source-review` jest zamknięty jako zapis zakończenia tego
przeglądu. Ocena nie daje wyczerpującego rozstrzygnięcia prawnego ani
gwarancji oryginalności. W ramach tej oceny nie zmieniono bajtów
kursu ani zasobów publicznych.

### Korekta kontraktów istniejących lekcji w zakresie C1

Porównanie śledzonych plików A6–C1 (`d62e7d7` do
`b78b9942a0c3f265e9d661551c27c7125a173368`) zawiera 33 ścieżki
`src/content`. Zmieniono 29 plików i dodano cztery.

- `src/content/existing-contract-prose.test.ts`
- `src/content/existing-contract-repair-compatibility-fixture.ts`
- `src/content/existing-contract-repair-compatibility.test.ts`
- `src/content/fixtures/existing-contract-pre-c1-projection.json`

W tym zakresie materiał obejmuje naprawy, funkcje pomocnicze i testy
wykonane z pomocą AI pod kierunkiem osoby utrzymującej projekt, a także
migawkę zgodności odtwarzającą dotychczasowe dane repozytorium do
sprawdzenia kontraktów lekcji. Nie ustalono nowych materiałów stron
trzecich, ilustracji, zależności ani pobieranych wejść w tej różnicy.
Korekta zmienia skończony wykaz i jego sumy. Prawa zachowują dotychczasowe
ustalenia.

Cztery nowe pliki to testy, funkcje pomocnicze i dane projekcji
wspierające istniejący kontrakt. Nie ustanawiają osobnej licencji ani
własności poza sprawdzonymi zapisami. **Zakończono niezależny przegląd
pochodzenia w zakresie C1.** Nie ustalono nowego skopiowanego wejścia
zewnętrznego w badanej różnicy. Zachowano ograniczenia dotychczasowej
oceny praw, oryginalności, publikacji, znaków towarowych, prywatności
i wydania. Korekta obejmuje fakty o pochodzeniu, zgodnie z kierunkiem
osoby utrzymującej projekt. Prywatne polecenia, ścieżki, potwierdzenia,
logi, zapisy konta i historia generacji pozostają prywatne.

### Granice pokrycia

Wykaz objął wszystkie pliki. Porównanie obejmowało wydzielone literały
tekstowe lub szablonowe o długości co najmniej 40 znaków, statyczne
fragmenty interpolacji i wybrane tablice samych literałów. Nie
wykonywano dowolnego łączenia tekstu w czasie działania. Niezależna
rekurencyjna kontrola JSON potwierdziła pokrycie wszystkich 12 317
wartości tekstowych o długości co najmniej 40 znaków w 14 plikach JSON.
Krótsze wartości pozostały poza tą kontrolą. Zgodność semantyczna praw
wymaga osobnej oceny.

Dopasowanie dokładne używa okien 24 tokenów, kroku 4 po stronie
zewnętrznej, najwyżej czterech wystąpień zewnętrznych na okno i ośmiu
trafień na jednostkę lokalną. Zachowuje dopasowania od 30 tokenów.
Osobna znormalizowana kontrola objęła 747 kwalifikujących się listingów
Rust Book i przykładów RBE lub Rustonomicon o długości 50–2500
znormalizowanych tokenów. Wybrane lokalne jednostki kodu od 80 do 6000
tokenów pomijały ścieżki testów i katalog fixtures. Kontrola używała
16-tokenowych odcisków z krokiem 4 i trzech najlepszych par kandydatów,
wymagała co najmniej pięciu odcisków, ciągłego dopasowania co najmniej
65 tokenów i co najmniej 50% krótszej jednostki. Przy tych progach
nie dała tropów. Obie kontrole mogą pominąć krótsze zapożyczenia oraz
zmiany nazw, tłumaczenia i zmianę kolejności.

Ręczny przegląd polskich i angielskich tłumaczeń objął wskazane regiony,
grupy i wstępną ocenę kandydatów. Nie obejmował wszystkich akapitów
i zachowań kodu, całego internetu ani komercyjnego wyszukiwania
podobieństwa. Migawki i daty przeglądu nie odtwarzają wszystkich
wejść z czasu generacji. Chronologia Git potwierdza wprowadzenie pliku.
Ludzkie autorstwo wymaga odrębnych dowodów. Kontrola nie objęła
wszystkich usuniętych historycznych obiektów. Definicje archiwów oraz
literały starterów i rozwiązań sprawdzono statycznie. Pakowanie,
informacje licencyjne i działanie kodu wymagają osobnych kontroli.
Prywatnych fragmentów ani zasobów nie wysyłano do zewnętrznych usług
wyszukiwania.

## Pochodzenie ikony i akceptacja

Prywatne zapisy generacji pokazują zapisanie przez asystenta kompletnego
SVG z trzema kształtami i potwierdzenie udanego wykonania. Początkowy
projekt ma dokładnie bieżącą geometrię. Późniejsza relacja asystenta
opisuje zmianę palety na niebiesko-białą i ponowne wygenerowanie PNG.
Bieżący SVG odpowiada pierwszemu poza dwiema zmianami kolorów. Zmianę
palety potwierdza ta relacja i porównanie bajtów. Osobnego potwierdzenia
wykonania zmiany nie przejrzano niezależnie. Pierwotna specyfikacja
i wkład człowieka przed zapisem nie wskazują zewnętrznej ikony,
adresu grafiki ani obrazu odniesienia.

Wszystkie trzy bieżące zasoby ikony pojawiają się po raz pierwszy w Git
w `b3de96660ba60fe9fa77354c549a5b5dedc44bbb` i zachowują zawartość
w dostępnej współdzielonej historii. SVG ma 257 bajtów. Zawiera niebieski
zaokrąglony prostokąt, białą ścieżkę małej litery r i białą kropkę.
Nie importuje fontu, zewnętrznego obrazu, zasobu ani rastra. Tożsamość
w Git nie ustala sama autorstwa. Zapis generacji wnosi dodatkowy dowód.

Proces w `scripts/setup-assets.mjs` odtwarza oba zatwierdzone PNG
192×192 i 512×512 bajtowo oraz po dekodowaniu do RGBA, także przy
powtórzonym renderowaniu. Użyto Node 22.23.4, sharp 0.35.5 i libvips
8.18.7. Historyczne pliki blokady podają zadeklarowane zależności.
Nie ustalają pierwotnego środowiska wykonania. Nie zweryfikowano
powtarzalności na wszystkich historycznych narzędziach i platformach.

Lokalne porównanie z oficjalnymi znakami Rust, Cargo i Rust Foundation
nie wskazało wykorzystanego oficjalnego znaku ani konkretnego zasobu
zewnętrznego. [Polityka znaków towarowych Rust](https://rustfoundation.org/policy/rust-trademark-policy/)
rozdziela zgodę CC BY na grafikę od praw do znaków i zabrania sugerowania
oficjalnego związku lub poparcia. [Przewodnik marki Rust Foundation](https://rustfoundation.org/brand-guide/)
zawiera wzory do porównania. Różnica obrazu nie wystarcza do oceny
wszystkich praw do znaków. Nazwa Rust Workshop i prezentacja nadal
muszą unikać pomyłek. Nie wykonano globalnego przeszukania rejestrów
znaków towarowych.

Udokumentowane pochodzenie to wygenerowana przez asystenta grafika
projektu i pochodne PNG. 24 października 2026 r. osoba utrzymująca projekt
wyraźnie zaakceptowała to pochodzenie i potwierdziła, że według jej wiedzy
nie dostarczono dodatkowej zewnętrznej ikony ani materiału referencyjnego.
Spełniono istniejący warunek akceptacji. Przegląd ikony ma status
przejrzany, a `icon-rights` jest zamknięty w tym zakresie. Zatwierdzony
wcześniej zakres CC BY 4.0 dla ilustracji obejmuje prawa, które projekt
posiada. Nie wprowadza nowej licencji ani grafiki. Potwierdzenie nie
poświadcza ręcznego autorstwa, oryginalności danych treningowych,
wszystkich praw osób trzecich ani zgody na publikację. Późniejsze
konkretne ustalenie dotyczące źródła lub praw wymaga oceny.

## Ustalenia przeglądu i granice wydania

Ustalenie o kursie obowiązuje w opisanym zakresie i z podanymi
ograniczeniami. Przegląd grupy źródeł nie gwarantuje praw do każdego
potencjalnego źródła. Akceptację ikony odnotowano powyżej. Obie blokady
pochodzenia w tym zakresie są zamknięte. Szersze warunki wydania
pozostają osobne. Zgodność struktury i sum, ocena praw, bezpieczeństwo
zależności i prywatność, CI na dokładnym commicie, integracja i decyzja
o widoczności wymagają własnych ustaleń. Ocena nie zmienia bajtów
źródeł, warunków stron trzecich, zgody na publikację ani dotychczasowych
praw odbiorców.
