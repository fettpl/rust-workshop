# Gotowość do udostępnienia źródeł i plan publicznego wydania

[English](oss-release.md)

Zatwierdzonym miejscem publikacji jest niezależne repozytorium
`fettpl/rust-workshop`. Kolejność działań i warunki wycofania poprzedniego
repozytorium określa [instrukcja publikacji](publication-handoff.pl.md).
Ten dokument opisuje prace nad kursem, licencjami i przeglądem kandydata do
wydania. Wydanie obejmuje kod źródłowy i aplikację zweryfikowaną lokalnie.

## Cel i zakres

Przygotuj rzetelne angielskie wprowadzenie do polskojęzycznego warsztatu nauki
Rusta, który działa przede wszystkim lokalnie. Przygotuj też praktyczne instrukcje
dla współtwórców i agentów, jasno określone licencje kodu i materiałów oraz pakiet
wydania do przeglądu. Kurs zakłada podstawową znajomość programowania i brak
doświadczenia z Rustem. Udostępnienie źródeł, hosting, publikacja pakietów i
dowody efektów nauki to odrębne kwestie.

Osoba utrzymująca projekt zezwoliła na lokalne przygotowania i zatwierdziła MIT
dla oprogramowania, CC BY 4.0 dla materiałów dydaktycznych, trzy istniejące
wyjątki o wąskim zakresie w pakietach Cargo oraz oznaczenie autorstwa Pixel Media
Workshop Paweł Borawski od 2026 r. Te decyzje nie przesądzają o prawach do
wszystkich materiałów wygenerowanych przez AI ani materiałów osób trzecich.
Pochodzenie źródeł, usunięcie problemów z prywatnością i zmiana widoczności
repozytorium mają osobne warunki. [Wykaz pochodzenia](oss-provenance.pl.md)
sprawdza zakres śledzonych plików kursu i plików publicznych oraz ich sumy
kontrolne. [Ocena praw](rights-assessment.pl.md) odnotowuje, że w określonym
zakresie porównania przegląd źródeł kursu został zakończony i nie wykryto
przypadku skopiowania formy wyrazu, który wymagałby działania. Wynik nie stanowi
pełnego potwierdzenia praw. 24 października 2026 r. osoba utrzymująca projekt
zaakceptowała udokumentowane pochodzenie wygenerowanej ikony i potwierdziła, że
według jej wiedzy nie przekazano dodatkowego zewnętrznego pliku ani materiału
referencyjnego. Rozwiązano obie kwestie pochodzenia, które blokowały wydanie w
badanym zakresie. Pozostałe warunki wydania są odrębne.

Osoba utrzymująca projekt zdecydowała o włączeniu i sprawdzeniu funkcji prywatnego
zgłaszania podatności w GitHub zaraz po ręcznym upublicznieniu repozytorium.
Działającego prywatnego kanału dotąd nie potwierdzono. Plan nie upoważnia do
korzystania z płatnej infrastruktury, zmiany rozliczeń, publikacji pakietów,
wdrożenia, przepisywania historii ani usuwania dowodów. Prywatne materiały audytu
i informacje służące wznowieniu pracy przechowuj w ignorowanych plikach
przekazania prac, poza publicznym pakietem.

## Plan realizacji

Zleć niezależny przegląd faktycznego kandydata do wydania i zachowaj SHA
sprawdzonego commita. Narzędzia przeznaczone dla współtwórców są opcjonalne.

1. **Sprawdź, co faktycznie zostanie ujawnione.** Sporządź wykaz bieżących plików,
   historii Git, opublikowanych gałęzi i tagów, zgłoszeń, PR-ów i ich recenzji,
   historii Actions oraz dostępnych dzienników i artefaktów. Zakres audytu,
   wygasłe lub niedostępne materiały oraz nierozwiązane kwestie zapisz prywatnie.
   Nigdy nie wypisuj wartości sekretów. Ujawnione dane uwierzytelniające trzeba
   unieważnić. Usunięcie bieżącego pliku nie wystarcza.
2. **Przygotuj wprowadzenie dla czytelników.** Zastąp `README.md` i dodaj
   `CONTRIBUTING.md` oraz, jeśli się przyda, `.github/pull_request_template.md`.
   Sprawdź deklaracje w `src/content/course.ts`, definicjach projektów, kodzie
   zapisu danych i module wykonawczym. Osobno opisz konfigurację aplikacji,
   pobrane projekty Cargo i wymagania dla osób utrzymujących repozytorium.
3. **Przepisz instrukcje operacyjne.** Zastąp `AGENTS.md` po zinwentaryzowaniu
   wszystkich obowiązujących wymagań. Zachowaj blok zarządzany przez Next.js.
   Zaktualizuj `docs/ci-cd.md` lub powiązany przewodnik techniczny o bieżące
   polecenia i warunki weryfikacji natywnej. Instrukcje główne mają pozostać
   zwięzłe i przenośne.
4. **Utrzymuj zatwierdzony pakiet licencyjny.** Zachowaj pełny oficjalny tekst MIT
   w `LICENSE`, pełny tekst CC BY 4.0 w `LICENSE-CONTENT`, jawne zasady dotyczące
   plików mieszanych i oznaczania autorstwa w `docs/licensing.md` oraz wymagane
   informacje o licencjach osób trzecich. MIT obejmuje kod, testy, skrypty i
   przykłady programistyczne. CC BY 4.0 obejmuje autorską narrację, opisy ćwiczeń,
   objaśnienia i ilustracje. Dotychczasowe licencje osób trzecich nadal
   obowiązują. Zakres każdej licencji jest ograniczony do objętych nią plików
   lub części plików. Oznaczenie autorstwa projektu obowiązuje od 2026 r. Projekt
   udziela tylko praw, którymi faktycznie dysponuje. Zachowaj trzy istniejące
   deklaracje Cargo `MIT OR Apache-2.0` z pełnym tekstem Apache jako wyjątki o
   zatwierdzonym, wąskim zakresie.
5. **Sprawdź dystrybucję i bezpieczeństwo.** Rozszerz generator
   `scripts/project-archive.ts` i dodaj ukierunkowane testy, aby oba warianty
   każdego archiwum zawierały właściwe informacje licencyjne i o autorstwie.
   Zachowaj autorski kod Rust, historyczne identyfikatory, sumy kontrolne kursu i
   materiał dowodowy. W `SECURITY.md` podaj rzeczywisty kanał zgłoszeń lub
   informację o jego niedostępności. Kontakty i terminy odpowiedzi muszą być
   zgodne z rzeczywistością. Funkcję prywatnego zgłaszania podatności włącza się
   w publicznym repozytorium GitHub. Przed zmianą widoczności zweryfikuj wymagany
   prywatny kanał albo uzyskaj wyraźną decyzję osoby utrzymującej projekt o
   włączeniu i sprawdzeniu funkcji GitHub zaraz po publikacji. Podawaj kanał
   jako gotowy dopiero po jego sprawdzeniu. Sprawdź przepływy pracy dla PR-ów z
   forków, przypięcie akcji do pełnych SHA commitów, uprawnienia, sekrety, pamięć
   podręczną, artefakty i zaufanie do maszyn wykonawczych. PR-y z forków nie mogą
   uruchamiać zadań uprzywilejowanych ani zadań na maszynie osoby utrzymującej
   projekt. Zachowaj zakres testów niezależnie od zużycia minut.
6. **Przeprowadź weryfikację i niezależny przegląd.** Sprawdź szybki start ze
   świeżej kopii repozytorium, odpowiednie udokumentowane polecenia, odsyłacze i
   wykazy dotyczące prywatności oraz licencji. Przy zmianach generatora lub
   przepływu pracy uruchom adekwatne testy regresji, `npm run content:packages`,
   `npm run typecheck`, `npm run lint`, `npm run content:check`, kontrole objętych
   zmianą pakietów i odpowiednie szersze kontrole. Przy zmianach wyłącznie w
   dokumentacji testy jednostkowe nie powinny powtarzać jej treści. Zapisz
   faktyczne błędy, pominięcia i ograniczenia infrastruktury. Uzyskaj niezależny
   przegląd README, AGENTS, licencji i publikacji oraz bezpieczeństwa forków.
7. **Zapisz decyzje, zintegruj zmiany i opublikuj wydanie.** Zatwierdzenie
   licencji i oznaczenia autorstwa odnotowano powyżej. Każda zmiana tego zakresu
   wymaga nowej decyzji. Istniejący podział pozostaje zatwierdzony. Przedstaw
   pliki, diff i otwarte kwestie pochodzenia lub prywatności do przeglądu
   wydania. Zapisz lokalne commity przygotowawcze po angielsku po wymaganej
   weryfikacji i niezależnym przeglądzie. Samo lokalne przygotowanie nie zamyka
   warunków publikacji. Odrębny PR nadal wymaga rozpatrzenia uwag z przeglądu
   niezależnego i automatycznego, świeżych wymaganych kontroli na dokładnym
   commicie PR, zwykłego scalenia i kontroli wynikowego `main`. Przy
   niedostępnych Actions prace pozostają lokalnie do czasu spełnienia tych
   warunków. Osoba utrzymująca projekt osobiście upublicznia zweryfikowane puste
   repozytorium w zatwierdzonym bezpłatnym trybie. Na pierwszy publiczny push
   oczyszczonych źródeł potrzebna jest osobna zgoda. Po ręcznym potwierdzeniu
   ponownie sprawdź publiczny dostęp i CI.

## Zakończenie prac lokalnych i odroczone warunki publikacji

Przed przekazaniem do integracji zakończ wszystkie odwracalne prace lokalne.
Przygotuj rzetelne instrukcje w README i instrukcje dla współtwórców oraz
agentów. Sprawdź zatwierdzony zakres licencji i wymagane informacje, zapisz
ograniczoną ocenę źródeł i ikony, sprawdź wygenerowane archiwa i wykonaj statyczny
przegląd przepływów pracy dla forków. Zainstaluj zależności od nowa zgodnie z
plikiem blokady, wykonaj odpowiednie kontrole aplikacji, przeglądarki i trybu
offline oraz uzyskaj niezależny przegląd dokładnego kandydata. Zachowaj prywatnie
datowane wyniki z faktycznymi wersjami, powiązaniami ze źródłem, ostrzeżeniami,
pominięciami i zakresem kontroli. Za zaliczone uznawaj wyłącznie wykonane
kontrole z potwierdzonym wynikiem.

Kod wyjścia 0 walidatora pochodzenia dotyczy wyłącznie pozycji w sprawdzonym
wykazie. Lokalna próba oczyszczenia historii również ma odrębny, ograniczony
zakres. Zwykłe scalenie zachowuje starszą historię zdalną, gałęzie, referencje
utrzymywane przez dostawcę i komentarze. Zgoda na lokalną próbę nie upoważnia do
zdalnego przepisywania ani usuwania danych. Przejrzyj zachowane eksporty z ich
datami i informacjami o brakujących danych. Przed publikacją usuń ustalone
problemy i ponownie sprawdź faktycznie ujawniane dane u dostawcy po uzyskaniu
odrębnej zgody. Zachowaj kopie zapasowe i dowody historyczne.

[Instrukcja publikacji](publication-handoff.pl.md) określa zasady udostępnienia
pustego repozytorium, uzyskania zgody na ujawnienie źródeł, ochrony PR-u wydania,
zaliczenia kontroli `main` i wycofania poprzedniego repozytorium. Po akceptacji
nowego repozytorium osoba utrzymująca projekt potwierdza nieodwracalne
porządki na podstawie zapisanego identyfikatora repozytorium źródłowego.

## Kryteria ukończenia

- [ ] README wiernie opisuje dostępne funkcje, a szybki start działa ze świeżej
      kopii repozytorium. Jasno określono język kursu oraz ograniczenia zapisu,
      pracy offline i uruchamiania kodu. Brak gwarancji gotowości zawodowej lub
      skuteczności nauki.
- [ ] AGENTS zawiera praktyczne instrukcje, zachowuje wszystkie nadal obowiązujące
      wymogi, blok zarządzany, trwałe identyfikatory i granice dowodów.
- [x] Osoba utrzymująca projekt wprost zatwierdziła wybór licencji i oznaczenie
      autorstwa (23 października 2026 r.). Weryfikacja praw do źródeł pozostaje
      osobnym warunkiem.
- [ ] Jasno określono zakres licencji kodu i materiałów, zasady dla mieszanych
      plików TypeScript i pobieranych archiwów oraz obowiązki wobec osób trzecich.
- [ ] Udokumentowano zakres audytu tego, co zostanie publicznie ujawnione, i
      rozwiązano wszystkie kwestie blokujące publikację.
- [ ] Odpowiednie kontrole i niezależne przeglądy zakończyły się pozytywnie.
      Istotne uwagi z automatycznego przeglądu sprawdzono technicznie i rozpatrzono.
- [ ] Odrębny PR scalono po zaliczeniu świeżych wymaganych kontroli na jego
      dokładnym commicie. Kontrole wynikowego `main` również zakończono pomyślnie.
- [ ] Osoba utrzymująca projekt osobiście upubliczniła puste repozytorium,
      sprawdziła ochronę gałęzi i zatwierdziła przejrzane źródła przed pierwszym
      publicznym pushem.
- [ ] Po publikacji sprawdzono anonimowy dostęp, README, licencje, odsyłacze,
      ochronę gałęzi, prywatne zgłaszanie podatności, kontrole PR-ów z forków i
      standardową konfigurację maszyn wykonawczych. Wykonano jedno uzasadnione
      uruchomienie weryfikacyjne.
- [ ] Wskazano pozostałe ograniczenia i zaktualizowano kolejność prac nad kursem.

- [ ] Utworzono kopię poprzedniego prywatnego repozytorium, odtworzono je w
      izolacji, wycofano po akceptacji publicznego wydania i sprawdzono, czy
      nadal korzysta z Actions.

## Oficjalne źródła

Sprawdzono 22 października 2026 r. Źródła opisują działanie usług zewnętrznych i
warunki licencji. Podział licencji i kolejność przeglądów to decyzje projektowe.
W momencie przekazania do publikacji sprawdź aktualne instrukcje GitHub oraz stan
konta i repozytorium.

- Format Markdown bez obowiązkowego schematu. Wprowadzenie dla ludzi pozostaje w
  README, a szczegóły operacyjne w AGENTS. [Format AGENTS.md](https://agents.md/)
- Oficjalne teksty licencji. [MIT](https://opensource.org/license/mit),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.txt)
- Zasada najmniejszych uprawnień, granice zaufania do danych PR-a oraz
  przypinanie akcji do niezmiennych commitów. [Bezpieczne korzystanie z GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- Publiczna widoczność ujawnia historię repozytorium oraz historię i dzienniki
  Actions. [Widoczność repozytorium](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- Sprawdź faktyczny przycisk zgłoszenia i włączenie funkcji. [Prywatne zgłaszanie podatności](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- Standardowe maszyny wykonawcze GitHub w repozytoriach publicznych są dostępne
  bez opłat. Przechowywanie danych i inne rozliczane produkty podlegają osobnym
  zasadom. Po publikacji sprawdź aktualne reguły i stan dotychczasowych
  ograniczeń oraz opłat, pozostawiając ustawienia rozliczeń do osobnej decyzji.
  [Rozliczenia GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
