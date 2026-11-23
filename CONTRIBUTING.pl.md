# Współtworzenie Rust Workshop

[English](CONTRIBUTING.md)

Dziękujemy za pomoc w rozwijaniu dwujęzycznego, lokalnego środowiska nauki
Rusta. Możesz wnieść wkład w kod, materiały dla uczniów, testy, dokumentację
lub konkretne usprawnienia interfejsu. Przed wprowadzeniem zmian przeczytaj
[AGENTS.md](AGENTS.pl.md). Znajdziesz tam opis architektury, granic
weryfikacji, trwałych identyfikatorów i kontroli dla osób utrzymujących
projekt.

Przed interpretacją historycznych sum kontrolnych materiałów testowych albo
kopii raportów przeczytaj [informację o redakcji historii](docs/history-redaction.pl.md).
Zachowaj utrwalone wyniki i zamknięte, zweryfikowane wyjątki utrzymaniowe.

## Zanim zaczniesz

Użyj obsługiwanej wersji Node (`^22.23.4 || ^24.22.1 || ^26.12.1`)
i zainstaluj przypięte zależności npm.

```sh
npm ci
npm run dev
```

Aplikacja i ćwiczenia w przeglądarce działają bez lokalnego zestawu narzędzi
Rusta. Rust jest potrzebny do pracy nad pobranymi projektami Cargo i do
weryfikacji zaufanych materiałów testowych. Aplikacja nie uruchamia lokalnie
kodu ucznia, kodu importowanego ani poleceń Cargo. Przycisk **Uruchom**
korzysta ze [zdalnego środowiska wykonawczego](docs/runner.pl.md).

## Pomysły na wkład

- Ulepszaj lekcje, polecenia, podpowiedzi, wyjaśnienia i zadania powtórkowe.
  Utrzymuj wersję angielską i polską. Wyjaśniaj Rusta od podstaw, bez
  zakładania znajomości Javy, Pythona lub bibliotek innego języka.
- Dodawaj lub poprawiaj ćwiczenia, mechanizmy oceny, kontrakty projektów
  i źródła. Sprawdzaj obserwowalne zachowanie. Gdy zmiana zależy od
  kompilatora lub wykonania kodu, użyj zaufanych testów w Ruście.
- Rozwijaj aplikację React/TypeScript, zapisywanie danych, nawigację
  i interfejs. Zachowaj zgodność z dotychczasowym zapisem i importem.
- Ulepszaj testy, skrypty utrzymaniowe, dokumentację lub generowane pliki
  projektów Cargo.

Zachowaj istniejące identyfikatory lekcji, modułów, pojęć, powtórek,
projektów, źródeł i kroków. To trwałe kontrakty zapisu postępów, historii
powtórek, importu i wyników pracy. Jeśli zmiana wymaga nowej tożsamości,
dodaj identyfikator i opisz jej wpływ na zgodność w pull requeście.
Nie przepisuj historii ani nie zapisuj odsłoniętego rozwiązania,
odpowiedzi testowej, importu lub ponowionej próby z pomocą jako wyniku
samodzielnego programowania.

Utrzymuj tekst dla uczniów i dokumenty Markdown w repozytorium po angielsku
i po polsku. Domyślny plik `.md` jest angielski, a odpowiadający mu plik
`.pl.md` zawiera polską wersję. Połącz wersje linkami. Pisz wiadomości
commitów i pull requesty po angielsku. Udział nie wymaga płatnych narzędzi
ani usług hostingowych.

## Weryfikacja

Dobierz kontrole do zmienionych plików. Przy zmianie samej dokumentacji
sprawdź odnośniki, polecenia i twierdzenia. Test kopiujący treść dokumentu
nie sprawdza jego działania. Zmiany kodu, materiałów, mechanizmów oceny
lub zapisu danych zweryfikuj odpowiednimi testami i podaj wykonane kontrole.

Szybkie kontrole uruchom poniższymi poleceniami.

```sh
npm run typecheck
npm run lint
npm run content:check
```

Aby sprawdzić wersję produkcyjną i tryb offline, zbuduj aplikację
i pozostaw serwer uruchomiony w jednym terminalu.

```sh
npm run build
npm start -- --port 3002
```

W drugim terminalu przygotuj Chromium dla Playwright i uruchom kontrolę.

```sh
npx --no-install playwright install chromium
npm run test:offline
```

Na Linuksie użyj `npx --no-install playwright install --with-deps chromium`,
jeśli brakuje bibliotek systemowych Chromium.

Pełny zestaw `npm test` zawiera zaufane natywne materiały testowe w Ruście.
Przygotuj stabilny zestaw narzędzi i pamięć podręczną z przypiętymi
zależnościami Tokio zgodnie z [docs/ci-cd.md](docs/ci-cd.pl.md). Część kontroli
wymaga konkretnej wersji Rusta lub specjalnych narzędzi. Natywna kontrola
prefiksu zainicjalizowanych danych wymaga udokumentowanego przygotowania
offline i jawnie zakwalifikowanego profilu. Zwykły przebieg lokalny ją pomija,
chyba że kwalifikacja jest zakończona i ustawiono
`RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED=1`. Odnotuj brak
narzędzia, niedostępne środowisko wykonawcze, błąd uprawnień, przekroczony
limit czasu i niepełny przebieg. Taki wynik nie potwierdza zachowania.

W projekcie Cargo pobranym z aplikacji postępuj zgodnie z README archiwum.
Po przygotowaniu zależności używaj wskazanych poleceń z przypiętymi
wersjami i w trybie offline. Nie przekazuj kodu ucznia ani importowanych
plików do narzędzi weryfikacyjnych. Lokalny kompilator nie zastępuje
zdalnego środowiska wykonawczego aplikacji.

## Pull requesty

Wprowadzaj zmiany w jednym zakresie i koordynuj pracę z innymi osobami.
Utwórz gałąź od aktualnej podstawy i rób małe commity łatwe do przejrzenia.
W pull requeście opisz następujące kwestie.

- Problem ucznia lub osoby utrzymującej projekt, którego dotyczy zmiana.
- Zmienione pliki i trwałe kontrakty.
- Wykonane kontrole, dokładne błędy i pominięte warunki wstępne.
- Dostępność całego zmienionego tekstu dla uczniów po angielsku i po polsku.
- Źródło każdego istotnego wyniku: rzeczywisty kompilator lub wykonanie
  programu, kontrolowana atrapa albo obserwacja przeglądarki i zapisu stanu.

Użyj [szablonu pull requestu](.github/pull_request_template.pl.md).
Sprawdź uwagi z przeglądu, również automatycznego, w kodzie i testach
przed ich przyjęciem lub odrzuceniem. Test przeglądarki z przechwyconą
odpowiedzią środowiska wykonawczego sprawdza interfejs i zapis stanu.
Kompilacja i wykonanie Rusta w zdalnej usłudze wymagają osobnego dowodu.

Nie zamieszczaj sekretów, prywatnych załączników, informacji o kontach
i rozliczeniach, danych uwierzytelniających ani ścieżek komputera w commitach,
zgłoszeniach, pull requestach, logach i danych testowych. Bieżące ograniczenia
zgłaszania podatności opisuje [SECURITY.md](SECURITY.pl.md). Podejrzenia
podatności zachowaj poza publicznymi zgłoszeniami.

## Prawa do wkładu i licencje

Osoba utrzymująca projekt zatwierdziła poniższy podział i oznaczenie
**Pixel Media Workshop Paweł Borawski** (2026). Licencje obejmują prawa,
których projekt może udzielić. [Ocena praw w określonym zakresie](docs/rights-assessment.pl.md)
odnotowuje zakończony przegląd źródeł kursu i akceptację pochodzenia ikony.
Szersze warunki wydania są rozliczane osobno.

- MIT obejmuje kod aplikacji, skrypty, testy, mechanizmy oceny, przykłady
  programistyczne, wykonywalny kod lekcji i rozwiązań oraz kod w pobieranych
  archiwach projektów.
- CC BY 4.0 obejmuje autorską narrację dydaktyczną, opisy ćwiczeń,
  omówienia odpowiedzi, wyjaśnienia i autorskie, zatwierdzone ilustracje.
- Materiały zewnętrzne zachowują pierwotną licencję i wymagane oznaczenie
  autorstwa.

Plik TypeScript może zawierać wykonywalny kod i autorski tekst lekcji.
Wykonywalny kod lekcji i rozwiązań, w tym komentarze funkcjonalne oraz
literały i napisy wypisywane przez program, podlega MIT. Polecenia,
podpowiedzi, wyjaśnienia, informacje zwrotne i omówienia odpowiedzi
podlegają CC BY 4.0. Przy wydzielaniu lub ponownym użyciu zachowaj
informacje licencyjne. Jeśli części nie da się jednoznacznie wydzielić,
skontaktuj się z osobą utrzymującą projekt. Trzy istniejące manifesty
autorskich pakietów Cargo zachowują zatwierdzone wyrażenie
`MIT OR Apache-2.0` ograniczone do tych pakietów.
[Bieżący przewodnik licencyjny](docs/licensing.pl.md) określa zasady dla plików,
treści mieszanych, archiwów oraz oznaczania autorstwa. W granicach przeglądu
kursu nie stwierdzono istotnego skopiowania treści wymagającego działania.
Osoba utrzymująca projekt zaakceptowała udokumentowane pochodzenie ikony
wygenerowanej przez asystenta 24 października 2026 r. i potwierdziła, że
według jej wiedzy nie dostarczyła dodatkowego pliku ani materiału
referencyjnego. Obie wskazane kwestie pochodzenia zostały zamknięte.
Pełna ocena praw autorskich, znaków towarowych i uprawnienia do publikacji
pozostaje poza zakresem przeglądu. Każde późniejsze konkretne ustalenie
o źródle lub prawach wymaga oceny. Według osoby utrzymującej projekt kurs
na ten etap powstał przy użyciu ChatGPT i Codex Desktop z modelami GPT-5.6
i nowszymi do pisania i wyszukiwania informacji. Osoba utrzymująca przekazała
polecenia i wyznaczyła kierunek, bez ręcznego redagowania fragmentów.
To opis sposobu pracy. Oryginalność, ochrona prawnoautorska i zgody osób
trzecich wymagają osobnej oceny.

Przy wkładzie wspomaganym przez AI ujawnij jego pochodzenie i podaj znane
skopiowane lub zaadaptowane źródła wraz z licencjami. Wynik modelu sam
nie potwierdza oryginalności ani własności. Przewodnik licencyjny objaśnia
różnicę między oznaczeniem projektu, ochroną prawnoautorską i prawami
osób trzecich. Bieżący szkic wydania obejmuje źródła, autorskie archiwa
Cargo i udostępnianą dokumentację audytu. Zakres pomija wdrożenie hostingowe,
skompilowaną aplikację przeglądarkową, katalog `.next` i drzewo `node_modules`.

Osoby wnoszące wkład zachowują prawa autorskie. Szkic nie przewiduje
umowy CLA ani przeniesienia praw. Przesyłaj wyłącznie własną pracę lub
materiały, których licencjonowanie jest Ci dozwolone. W pull requeście
podaj materiały zewnętrzne oraz ich licencje. Scalony wkład musi mieć
jasną zgodę na objęcie odpowiednią licencją projektu. Ogólne oświadczenie
o MIT lub CC BY nie obejmuje automatycznie cudzej pracy. Nie dodawaj
ograniczeń NonCommercial ani NoDerivatives do warunków MIT lub CC BY.

Wybór licencji i oznaczenie projektu zostały zatwierdzone. Rozstrzygnięcie
praw do źródeł, upublicznienie repozytorium, integracja i publikacja są
osobnymi decyzjami z własnymi warunkami. Dalsze zmiany licencji, scalenie
i decyzje o publikacji należą do osoby utrzymującej projekt.
