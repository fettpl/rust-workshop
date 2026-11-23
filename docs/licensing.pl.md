# Przewodnik licencyjny

[English](licensing.md)

Osoba utrzymująca projekt zatwierdziła podział licencji, oznaczenie projektu
i trzy istniejące wyjątki dla pakietów Cargo 23 października 2026 r.
Zatwierdzone oznaczenie to **Pixel Media Workshop Paweł Borawski** od
2026 r. Obecna informacja MIT podaje rok 2026. Rozszerz zakres lat po wniesieniu
wkładu w kolejnych latach. Zapis decyzji nie rozstrzyga ochrony prawnej ani
praw osób trzecich w każdej części wygenerowanej przez AI.
[Ocena praw](rights-assessment.pl.md) odnotowuje przegląd źródeł w określonym
zakresie i akceptację pochodzenia ikony. Szersze kontrole publicznego wydania
pozostają otwarte. Publikacja repozytorium wymaga osobnej zgody. Adres
projektu używany w przykładach to <https://github.com/fettpl/rust-workshop>.

## Dwie licencje o odrębnych zakresach

Repozytorium stosuje następujący podział MIT i CC BY 4.0, ograniczony
do praw, których projekt może udzielić.

| Materiał | Licencja | Przykłady |
| --- | --- | --- |
| Oprogramowanie i materiały wykonywalne | MIT | Kod aplikacji, skrypty, testy, mechanizmy oceny, schematy, identyfikatory, wykonywalny Rust, pliki Cargo, przykłady powłoki, TOML i JSON, przykłady programowania i kod generowanych archiwów |
| Autorskie materiały dydaktyczne | CC BY 4.0 | Narracja lekcji, polecenia ćwiczeń, podpowiedzi, dydaktyczne omówienia rozwiązań i odpowiedzi, wyjaśnienia, informacja zwrotna, pytania powtórkowe i oryginalne ilustracje kursu |
| Materiały z innych źródeł | Pierwotna licencja | Zależności, kopiowane informacje licencyjne, przywoływane standardy i zasoby osób trzecich |

[`LICENSE`](../LICENSE) zawiera oficjalny tekst zezwolenia MIT i wyłączenia
odpowiedzialności wraz z zatwierdzoną informacją o prawach autorskich.
[`LICENSE-CONTENT`](../LICENSE-CONTENT) zawiera niezmieniony ogólny tekst
prawny CC BY 4.0. Oznaczenie projektu i opis zakresu są podane tutaj.
Nie zastępują warunków licencji ani nie ustanawiają praw do cudzego materiału.

Zakres zależy od rodzaju materiału w pliku. Instrukcje deweloperskie,
README, plik AGENTS, plik CI, opis API i inna dokumentacja działania
oprogramowania podlegają MIT. Lekcja lub omówienie ćwiczenia podlega
CC BY 4.0. Przy treści mieszanej wskaż najmniejsze praktyczne fragmenty
i zachowaj podział.

- Wykonywalny TypeScript/TSX, Rust, Cargo, kod powłoki, TOML, JSON, testy,
  dane testowe mechanizmów oceny, identyfikatory, schematy i kod w blokach
  Markdown podlegają MIT. Obejmuje to `LessonStep.code`, wykonywalne
  `LessonStep.solution`, testy oceny i całe przykłady programowania.
  Komentarze funkcjonalne i literały oraz wyjście programu należą do
  wykonywalnego przykładu objętego MIT, także wewnątrz modułu kursu.
- Tekst wyświetlany jako polecenie, podpowiedź, wyjaśnienie, informacja
  zwrotna, pytanie powtórkowe lub omówienie odpowiedzi podlega CC BY 4.0,
  również jako wartość TypeScript. Dydaktyczny akapit poza wykonywalnym
  programem pozostaje na CC BY 4.0. Wykonywalne literały Rusta i wyjście
  programu zachowują MIT również w pliku lekcji.
- Komentarze funkcjonalne o implementacji, API, niezmiennikach i granicach
  narzędzi podlegają MIT wraz z otaczającym oprogramowaniem. Akapit
  komentarza uczącego pojęcia podlega CC BY 4.0 wraz z materiałem
  dydaktycznym. Plik mieszany wymaga czytelnego zakresu każdej licencji.
  Przy nowym wzorcu umieść krótki znacznik obok każdego wyraźnie
  wydzielonego regionu i zaktualizuj ten przewodnik.
- `scripts/project-archive.ts` i pozostałe generatory podlegają MIT.
  Wygenerowany Rust i inne wykonywalne pliki projektu podlegają MIT.
  Autorski tekst dydaktyczny w archiwum pozostaje na CC BY 4.0.
  Wygenerowane pliki muszą zachować informacje wymagane przez ich
  źródła. Nie edytuj ich ręcznie.
- `public/manifest.webmanifest` i `public/sw.js` to kod lub metadane
  objęte MIT. Ikona `public/icon.svg` i jej pochodne PNG mają
  udokumentowane pochodzenie z generacji asystenta.
  [Ocena praw](rights-assessment.pl.md) opisuje to ustalenie. Osoba
  utrzymująca projekt zaakceptowała udokumentowane pochodzenie
  24 października 2026 r. i potwierdziła, że według jej wiedzy nie
  przekazano dodatkowego zewnętrznego pliku ani materiału referencyjnego.
  Warunek akceptacji został spełniony. Zatwierdzony zakres CC BY 4.0
  dla ilustracji obejmuje prawa, które projekt posiada. Zapis nie
  potwierdza ręcznego wykonania, oryginalności danych treningowych
  ani oceny znaków towarowych. Później ustalony zewnętrzny wkład
  zachowuje własne prawa.
- Kod Rust pobrany z zewnętrznego źródła zachowuje jego licencję.
  Przywołanie źródła podaje pochodzenie. Zgoda na kopiowanie wymaga
  podstawy w uprawnieniach lub licencji.

Jeśli przyszłego pliku nie da się tak podzielić, zapisz niejasność
do oceny osoby utrzymującej projekt przed wskazaniem licencji pliku.
Podział projektu nie przejmuje ani nie zmienia praw osób trzecich.

## Istniejący wyjątek dla autorskich pakietów Cargo

Trzy istniejące manifesty autorskich pakietów dydaktycznych zachowują
ograniczone do danego pakietu wyrażenie `MIT OR Apache-2.0`.

- `src/content/projects/mini-grep/archive.ts`
- `src/content/projects/frame-protocol.ts`
- `src/content/projects/durable-log-service/archive.ts`

Osoba utrzymująca projekt zatwierdziła zachowanie istniejącego wyjątku.
Wyjątek nie rozszerza opcji Apache na repozytorium, aplikację ani cały
kurs. [`LICENSE-APACHE`](../LICENSE-APACHE) zawiera niezmieniony oficjalny
tekst Apache 2.0 dla tej opcji. Pozostały kod aplikacji i przykłady
programowania zachowują MIT. Tekst dydaktyczny pozostaje na CC BY 4.0,
a pakiety zewnętrzne zachowują własne licencje i informacje.

W archiwach startowych i rozwiązaniach zachowaj dokładne wyrażenia
z manifestów i informacje wymagane dla pakietów. Zachowaj historię
i wcześniejsze ważne zezwolenia. Przyszła zmiana wymaga osobnej decyzji
osoby utrzymującej projekt i weryfikacji praw autorskich oraz praw
współtwórców.

## Ponowne użycie i oznaczenie autorstwa

W zatwierdzonym zakresie MIT wolno używać, kopiować, modyfikować,
publikować, rozpowszechniać, sublicencjonować, sprzedawać i rozwidlać
oprogramowanie pod warunkiem zachowania informacji i tekstu zezwolenia
MIT. Użyty tekst MIT nie zawiera wyraźnej licencji patentowej.
CC BY 4.0 pozwala udostępniać i adaptować objęte nią materiały, również
komercyjnie, zgodnie z warunkami oznaczenia autorstwa. CC BY nie udziela
licencji patentowej. Wymaga wskazania zmian i zakazuje sugerowania
poparcia. Warunki patentowe Apache 2.0 obowiązują wyłącznie dla kodu
objętego trzema deklaracjami `MIT OR Apache-2.0` na poziomie pakietu.
Nie rozszerzają się na aplikację, tekst kursu ani całe repozytorium.
Właściwa licencja nie udziela praw do znaków towarowych, prywatności,
wizerunku ani praw osobistych ponad uprawnienia licencjodawcy.

Dla adaptacji lekcji na CC BY 4.0 użyj zatwierdzonego oznaczenia projektu.

> Pixel Media Workshop Paweł Borawski, „<tytuł lub sekcja>”,
> źródło <https://github.com/fettpl/rust-workshop>,
> licencja [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Zmiany: [opisz krótko zmiany]. Oznaczenie nie sugeruje poparcia autora.

Zachowaj adres źródła, link do licencji, podaną informację o prawach
autorskich i wymagane wskazanie zmian w miejscu odpowiednim dla medium.
Nie dodawaj ograniczeń użytku komercyjnego, zakazu utworów zależnych,
CLA, cesji lub innych ograniczeń dla odbiorców. Późniejsza zmiana licencji
nie cofa wcześniej prawidłowo udzielonych praw. Projekt nie może udzielać
praw należących do innego autora lub dostawcy zależności.

## Materiały zewnętrzne i dystrybucja

[`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.pl.md) odnotowuje aktualny
audyt zależności i generowanych zasobów. Zachowaj licencje i informacje
stron trzecich. Plik blokady zależności i informacje dostarczone przez
każdy pakiet stanowią właściwy wersjonowany wykaz. Teksty MIT i CC BY
z tego repozytorium ich nie zastępują.

Planowany zakres wydania obejmuje repozytorium źródłowe, autorskie
archiwa projektów Cargo i publiczną dokumentację audytu po decyzji
człowieka. Zakres pomija wdrożenie hostingowe, skompilowaną aplikację
przeglądarkową, katalog `.next` i drzewo `node_modules`. Plik blokady
Cargo wskazuje wejścia z rejestru. Samo wskazanie nie stanowi
rozpowszechnienia ich kodu. Zachowaj informację strony trzeciej, gdy
kod, zasób, przykład lub inny zewnętrzny materiał zostaje skopiowany
lub dołączony do archiwum. Wymieniaj pakiety faktycznie rozpowszechniane.

Skrypt konfiguracji kopiuje zasoby przeglądarkowe Monaco z
`monaco-editor` do ignorowanego katalogu `public/monaco/`, w tym
oryginalne pliki `LICENSE` i `ThirdPartyNotices.txt`. Te kopie sprawdzono
lokalnie w bieżącej konfiguracji. Jeśli przyszłe wydanie udostępni
skompilowaną aplikację przeglądarkową lub inny plik binarny, czysty
build musi zidentyfikować rzeczywistą zawartość uruchomieniową
i zachować pełny właściwy tekst licencji i informacji dla każdego
kopiowanego pakietu lub zasobu. Ten wykaz i metadane SPDX same nie
potwierdzają zgodności w przeglądarce. Kopia Monaco nie zastępuje
pakowania informacji w archiwach projektów. Sprawdź dołączenie
właściwych informacji i działanie wszystkich lokalnych linków do
dokumentów licencyjnych po rozpakowaniu. Nie zmieniaj licencji Monaco
ani jego dołączonych składników.

Jeżeli używasz tego zakresu w archiwum projektu, umieść `LICENSE`,
`LICENSE-CONTENT`, `LICENSE-APACHE` w razie zastosowania wyjątku i
`THIRD-PARTY-NOTICES.md` obok dokumentu zakresu archiwum albo zachowaj
strukturę katalogów, w której odnośniki do nich działają. Sprawdź
po wypakowaniu archiwum startowe i rozwiązanie. Generator zachowuje
lokalne odnośniki do tych informacji. Linki do oceny praw i zapisu
pochodzenia dostępnych tylko w repozytorium zamienia na kanoniczne
adresy repozytorium, zachowując identyfikatory sekcji. Dotyczą one
standardowych ścieżek w repozytorium. Kontrola archiwum nie potwierdza
scalenia ani publikacji lokalnej zmiany.

Przed publicznym wydaniem odśwież wykaz po czystej instalacji z pliku
blokady, zweryfikuj wszystkie śledzone zasoby i źródła pobieranych
projektów oraz rozstrzygnij w trybie prywatnym niepotwierdzone
roszczenia co do autorstwa lub zezwolenia. Historia Git pomaga ustalić
tożsamość współtwórców do audytu. Nie przypisuj na jej podstawie
nieustalonych praw ani podmiotów, których zgody nie potwierdzono.

## Materiały wygenerowane przez AI i pochodzenie

Według osoby utrzymującej projekt kurs wygenerowano z użyciem ChatGPT
i Codex Desktop. Modele GPT-5.6 i nowsze służyły do opracowania tekstu
i wyszukiwania informacji. Osoba utrzymująca projekt podawała polecenia
i nadawała kierunek. Według jej relacji fragmentów kursu nie pisano
ręcznie. Ujawnienie pochodzenia nie potwierdza oryginalności, ludzkiego
autorstwa ani braku praw osób trzecich dla wszystkich wyników.

Zatwierdzone licencje obejmują prawa, których projekt faktycznie może
udzielić. Informacja o prawach autorskich i oznaczenie projektu nie
tworzą praw autorskich do niechronionego wyniku AI. Jeśli materiał
nie podlega ochronie prawa autorskiego lub pokrewnych uprawnień, te
licencje nie tworzą dla niego obowiązku oznaczenia autorstwa. Ewentualny
chroniony wkład człowieka wymaga oceny konkretnych faktów. Samo pisanie
poleceń nie potwierdza posiadania praw do każdego wyniku. Zachowaj
informacje i prawa osób trzecich niezależnie od tego.

[OpenAI Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/)
przenoszą na użytkownika ewentualne prawa OpenAI do wyniku w zakresie
dozwolonym przez prawo. Nie rozstrzygają praw stron trzecich.
[Warunki usług Codex](https://openai.com/policies/service-terms/) wyraźnie
wskazują, że wygenerowany kod może podlegać licencjom zewnętrznym.
Bieżące teksty nie zastępują umowy konta lub obszaru roboczego i wersji
mającej zastosowanie w chwili wygenerowania danego materiału.

W przeglądzie pochodzenia zapisz znane kopiowane lub adaptowane materiały
wraz z dokładnym źródłem, wersją, licencją i wymaganymi informacjami.
Cytaty są tropami do przeglądu. Nie dowodzą kopiowania ani zgody. Zachowaj
dostępne zapisy generacji prywatnie. Automatyczna kontrola podobieństwa
i opis danych treningowych przez model nie potwierdzają pełnej oceny
praw. [Ocena praw](rights-assessment.pl.md) rejestruje porównanie
źródeł kursu i udokumentowaną generację ikony. W tym zakresie nie
stwierdzono istotnego skopiowania treści wymagającego działania.
Szersza ocena pozostaje osobna. Osoba utrzymująca projekt spełniła
powyższy warunek akceptacji ikony bez poświadczania autorstwa ludzkiego
geometrii. Nie wymagaj od współtwórców deklaracji oryginalności każdego
wyniku modelu bez dowodów.

## Pozostałe warunki wydania

Wybór licencji i oznaczenie projektu zatwierdzono. Ocenę źródeł kursu
w określonym zakresie i pochodzenie ikony zapisano jako przejrzane.
Ochrona prywatności, zgłaszanie problemów bezpieczeństwa, bezpieczeństwo
zależności, obowiązkowe CI, integracja oraz decyzja człowieka o publikacji
mają odrębne warunki. Rozstrzygnij konkretne ustalenia o kopiowanym kodzie
lub zasobach przed wydaniem. Ogólna informacja licencyjna projektu
nie rozstrzyga nierozwiązanego zapisu.
[Plan wydania](https://github.com/fettpl/rust-workshop/blob/main/docs/oss-release.pl.md)
opisuje całą kolejność.

## Oficjalne źródła i pochodzenie

- MIT: <https://opensource.org/license/mit>
- Tekst prawny CC BY 4.0: <https://creativecommons.org/licenses/by/4.0/legalcode.txt>
- Tekst prawny Apache License 2.0: <https://www.apache.org/licenses/LICENSE-2.0.txt>
- Pochodzenie tekstu MIT w SPDX: <https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt>

Zweryfikowane oficjalne pliki pobrano 22 października 2026 r. Teksty
prawne CC BY i Apache mają pozostać bajtowo identyczne ze sprawdzonymi
wersjami. Tekst zgody i wyłączenia odpowiedzialności MIT ma pozostać
bez zmian. Wstawienie zatwierdzonej informacji o prawach autorskich
zmienia sumę całego `LICENSE`. Zapisz końcową zatwierdzoną sumę informacji
osobno po decyzji człowieka.
