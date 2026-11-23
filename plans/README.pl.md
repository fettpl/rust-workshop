# Plany wdrożenia

[English](README.md)

Indeks powstał z użyciem umiejętności improve 2026-11-03 po audytach kierunku programu nauczania i usług, wykonanych w trybie odczytu. Opiekun zatwierdził samodzielną realizację etapów lokalnych z testami i niezależnym przeglądem.

| Plan | Tytuł | Priorytet | Nakład | Zależy od | Status |
|---|---|---|---|---|---|
| 001 | Laboratorium ograniczonych ponowień po stronie klienta | P2 | L | Zaakceptowane A9 i autentyczne zapisy stanu sprzed prac | Ukończony lokalnie |
| 002 | Warsztat autoryzacji powiązanej z żądaniem za pomocą typów | P2 | L | Zaakceptowane A10 i autentyczne zapisy stanu sprzed prac | Ukończony lokalnie |
| 003 | Uwzględnianie pomocy z rodziny powtórek w zaliczeniach kursu | P1 | M | Zaakceptowane A11 i rzeczywisty aktualny stan bazowy | Ukończony lokalnie |
| 004 | Zachowanie znaczenia danych przy jawnej zmianie schematu pliku | P2 | L | Zaakceptowany stan po pracach utrzymaniowych i autentyczne zapisy sprzed prac | Ukończony lokalnie |
| [005](005-workshop-assessment-contracts.pl.md) | Naprawa kontraktów oceny warsztatów | P1 | M | Zweryfikowany kandydat lokalny `7d803e4` | Ukończony lokalnie |

Indeks utrzymuje doradca. Zmiana statusu wymaga niezależnej weryfikacji. Dla każdej funkcji przewidziano jeden ewentualny PR. Bieżący zakres pozostaje lokalny.

## Rozpatrzone i odrzucone opcje

- Kolejny zestaw dowodów wydania. Dependency Assurance i API Release Matrix już go dostarczają, w tym weryfikator natywny związany z archiwum. Aktualne doradztwo i publikacja pozostają odroczonymi pracami zewnętrznymi.
- Kolejna ogólna lekcja o Unknown i idempotencji. Obejmuje je już projekt końcowy. Plan 001 skupia się na wykonywalnej polityce wielu prób i łączeniu wyników po stronie klienta.
- Przeprojektowanie interfejsu produkcyjnego. Istnieje osobny, zweryfikowany prototyp. Ten etap jedynie umożliwia pominięcie szacowanego czasu w nowych lekcjach.
- Wyprowadzanie uniwersalnej gotowości zawodowej z automatycznych testów wykracza poza zakres dowodów technicznych.

## Możliwe kierunki dalszych prac

Granice autoryzacji aplikacji, migracja w formacie lokalnym i projekt niebezpieczny marker/auto-trait
są kandydatami do osobnego audits/plans po 001. Nie są one zatwierdzonymi planami realizacji ani
nie twierdzą, że brak jest wszystkich powiązanych istniejących programów.

## Rejestr przeglądów wdrożenia

- Wstępne autoryzowanie registry/state obserwacji zakończyło się na czystym drzewie akceptowanym
  A9 przed planowaniem lub edycją funkcji; prywatne rejestry zachowują dokładne source/tool/capture
  hash.
- Przegląd planu rozwiązał zamknięte wyniki algebry i natywnego archiwum notice/path/generation pytań. Dwa
  ostatnie zakresy testowe obecnych katalogów zostały poddane niezależnemu przeglądowi;
  zamrożone historyczne twierdzenia pozostają niezmienione.
- Autor zadania 1 dostarczył szczegółowe TypeScript kontrole i wcześniejsze przeglądy stable/MSRV
  obserwacji. Te obserwacje rodzime są zachowane jako dowody historyczne i nie są
  akceptowane przez ostateczne źródła. Autor zadania 2 dostarczył static/catalog/projection kontroli; w tym
  punkcie kontrolnym nadal brakowało rodzimego modelu dowodu.
- Wczesny przegląd wdrażania powrócił NEEDS _ chociażby. Fala fix 1 jest przypisywana
  oddzielnie właścicielowi native-package/verifier i właścicielowi lesson/evidence/compatibility. Nie przyjęto jeszcze pełnej
  kwalifikacji ani zobowiązania.
- Strukturalne A10 - IMPL-IMPORTANT-07: utrzymanie własnych ignorowanych wyjść `test-results/` na miejscu. `.gitignore:6` i
  `git check-ignore test-results/client-retry` potwierdzają wyłączenie, odpowiadające konwencjom dotyczącym zwykłego produktu
  wyjściowego weryfikatora repozytorium. Zamrożenie źródła i wykaz publikacji musi być
  oparty na wyraźnej liście źródeł śledzenia i zamknięty autorzy archiwów. Przeniesienie
  całego generowanego drzewa dodałoby przechowywania i zakłócałoby odniesienia do
  dowodów bez poprawy tych granic. Koszt, jeżeli jest błędny: przyszłe narzędzie, które
  rekursywnie pakuje cały katalog roboczy, może zawierać prywatne artefakty; ten
  przepływ pracy wykracza poza dozwolony kontrakt source/archive i musi zostać odrzucony.
  Oddzielny, nieśledzony katalog Sure-log został przeniesiony nietknięty do prywatnych
  dzienników scenicznych i nie jest już nienamierzonym wpisem źródłowym.
- Wyjaśnienie A10 - IMPL-IMPORTANT-06: prawdziwa prywatna tożsamość przechwytywania i cały wektor
  kursu będą sprawdzane przez prywatną uprząż kwalifikacyjną. Badania publiczne muszą
  pozostać przenośne i nie mogą wymagać plików opiekuna-prywatnego. Dokładna ochrona
  następców, domyślne pokrycie real/synthetic oraz kontrola mutacji partial/near-miss nadal są wymagane.

## Punkt kontrolny przed kwalifikacją (2026-11-03)

- Oba zadania wdrożeniowe zakończyły dwie fale naprawcze. Niezależny przegląd źródeł
  funkcjonalnych jest gotowy do lokalnych kwalifikacji; w dalszym ciągu trwają pełne
  kampanie końcowe. Wcześniejsze ustalenia i nieudane operacje diagnostyczne są
  zatrzymywane prywatnie, a nie przepisywane jako akceptacja.
- Ostateczne odniesienia źródłowe wykorzystują już zweryfikowane `tokio-timeout`, `tokio-tcp-stream` i `errors-rust-book-overview`
  rejestry. Proponowane dodatkowe AWS odniesienie w planie realizacji nie zostało dodane
  jako nowo zrewidowane źródło; żadna niedostępna strona nie otrzymuje sfabrykowanej
  daty przeglądu.
- Nowy projekt kursu i jego pakiet to różne obiekty serializowane. Poprawiona
  następczyni używa rzeczywistego odcisku palca z projektu kursu, a wszystkie piętnaście
  poprzednich odcisków palców z rejestru i całego kursu pasuje do prawdziwego
  pre-autoryzującego przechwycenia. Trzynaście starszych obiektów projektu pozostaje
  niezmienione.
- Końcowe pokrycie pochodzenia i wyraźne wsparcie ze źródeł fakultatywnych poprzedza
  zamrożone lokalne kwalifikacje. Hosted Actions, main integration, publication, and
  production UI redesign pozostaje oddzielony od tej lokalnej funkcji.

## Wyniki kwalifikacji i ograniczona korekta zakresu z 3 listopada 2026 r.

Pierwsza lokalna kampania znalazła wadę adaptera-kompozycji: kilku historycznych
konsumentów zastąpiło zaakceptowany A9/A8/A7/C1 łańcuch łańcuchem A10/C1-only. Przewidywanie A10 musi
zachować kompletny pierwotny łańcuch, a nie tylko jego ostateczną nazwę. Prawidłowa import/wrapper
kompozycja i dodać znaczącą regresję; zachować każdą zamrożoną ilość historyczną,
strawić, uporządkowany wektor, i trwałe twierdzenie.

`src/content/prerequisite-entries.test.ts` przywożą również bezpośrednio obecny kurs i trasę. Jego dwa rozszerzenia-dostępność
liczy śledzić katalog na żywo, jak wcześniej scoped route/package testów dostępności. Aktualizacja
tych liczników od 31 do 32 i tytuł testu jest autoryzowany; dokładny Core17 wektor, wykresy
wstępne i wszystkie historyczne kontrole wznowienia pozostają niezmienione. Jest to
korekta aktualnego katalogu, a nie historyczno-złoty odświeżanie.

Inicjalizowany przedrostek rodzimego dowodu oddzielnie odrzucił prywatny katalog
kwalifikacyjny o nazwie `config` w przodku. Przyszłe prywatne biegacze muszą umieszczać
niepowiązane ustawienia npm w wyraźnie nazwanym katalogu; chroniona rodzima ochrona
kwalifikacyjna pozostaje bez zmian. Nieudane kampanie i ich oryginalne zamrożone wejścia
pozostają zachowane, a nowy kandydat wymaga nowych kwalifikacji.

## Doprecyzowanie zakresu działania aktualnego katalogu w przeglądarce z 4 listopada 2026 r.

Na żywo moduł-wyszukiwanie przeglądarki testowej śledzi aktualną dostępność.
Uaktualnienie tylko jego rozszerzenia liczy się od 31 do 32 i jej mianownik katalogu
całkowitego z przestarzałego dosłownego 48 do `modules.length`. Zachowaj dokładne Core17 kontrole,
niezmieniony wynik zapytania Rust (sześć dopasowań: jeden rdzeń i pięć rozszerzeń),
zachowanie klawiatury, oraz zapewnienia trwałości. Liczba modułów-nawigacyjnych siedmiu
pozostaje poprawna, ponieważ zawiera również linki do odzyskiwania; nie jest konieczna
zmiana tego testu. Są to oczekiwania na żywo UI, a nie historyczne złote
kompatybilności.

Kwalifikacja docelowych scenariuszy przeglądarki przed zamrożeniem następnego kandydata,
a następnie uruchomić wszystkie wymagane końcowe kontrole świeżo na tego kandydata.
Wcześniejsze nieudane lub celowo przerwane kampanie pozostają rejestrowane oddzielnie;
żaden wynik nie jest promowany przez zmianę etykiety.

Współdzielony pomocnik E2E archiwizacji-notice dodaje również dokładne `durable-log-retry-workspace` mapowanie już
obecne w autorskim budowniczym archiwum. To niesie niezmienione odziedziczone
zawiadomienia Apache i nie wybiera nowej polityki licencyjnej. Scenariusze powtórnej
przeglądarki używają rzeczywistego trybu edytora i funkcji archiwalnego wariantu przy
jednoczesnym zachowaniu ścisłego wznowienia, dowodów, plików-bajtów i kontroli
powiadomień. Ukierunkowana produkcja-przeglądarka i diagnostyka offline przeszła przed
ostatecznym zamrożeniem źródła; ostateczna pełna kwalifikacja pozostaje wymagana.

## Wdrożenie przyjęte lokalnie 4 listopada 2026 r.

Plan 001 jest kompletny lokalnie przy wdrożeniu zobowiązania `b0a34137c41a657ef06916f5dab87c811881e827`, dokładnie
przetestowane drzewo `2607387b6e9844fb9262085255d12054409870f8`. Ostateczny niezależny przegląd, wszystkie 16 faz statycznych,
1848 testów jednostkowych, 2599 autorskich przypadków Rusta, stable/MSRV kontroli rodzimych, 199
testy przeglądarki, formalna weryfikacja offline i jeden dodatkowy scenariusz offline
przeszedł. Kompletny pakiet historii źródła został niezależnie przywrócony i
zweryfikowany przed zmianą tego statusu. Zobacz miejscową sekcję akceptacji planu pod
kątem ilości, kontroli konserwacji i ograniczeń.

Zobowiązanie do wdrożenia zachowuje wcześniejszy stan zaawansowania tego wskaźnika. Ten
kolejny dwuplikowy dokument zamknięcia Markdown już osiągnął wyniki; nie zmienia
testowanego wniosku ani nie rości sobie świeżo wykonanych testów na zmienionej
dokumentacji. Jego niezależny przegląd metadanych i końcowe backup są oddzielne bramy
zamknięcia. Brak pchnięcia, zdalne zmiany, połączenie główne, działania hostingowe, installation/fetch,
publikacja lub produkcja UI przeprojektowanie jest częścią tego kamienia milowego.
Warianty późniejszego kierunku pozostają audytami, a nie planami realizacji.

## Plan 002 zarejestrowany 4 listopada 2026 r.

Niezależny, zrewidowany projekt czterech operacji, czterech lekcji, czterech
podstawowych rodzin zadaniowych i dwóch pojęć jest dopuszczony do lokalnej realizacji po
zaakceptowaniu A10 i autentycznych preautoryzacji. Wdrażanie i wyniki pozostają w toku.
Ta rejestracja jest wyłącznie lokalna; nie rejestruje akceptacji wdrożenia ani
autoryzacji publikacji.

## Plan 002 przyjęty lokalnie (2026-11-04)

Plan 002 jest DONE (lokalny) przy funkcji commit `bfeb1e31a11fd56410c6fe8230fd5e70a04e802e`, dokładnie przetestowane drzewo `5ad04894afc2ad36cc282392650e1488a75f98e1`
(655 plików źródłowych; 62 zmienionych ścieżek). Przyjęty dodatek zawiera cztery lekcje,
24 kroki, dwa koncepcje, cztery rodziny zadaniowe i jeden projekt. Świeże kwalifikacje
ukończyły wszystkie 21 faz statycznych, w tym 1914 testów jednostkowych, 217 rekordów
modelu lekcji, 2,643-case autorstwa Rust corpus w obu profilach i rodzimych kontroli w
obu profilach. Oddzielna kampania przeglądarki produkcyjnej przeszła 205 zwykłych testów
i jeden dodatkowy prywatny scenariusz offline; formalna weryfikacja offline również
przeszedł. Egzekucja przeglądarki nie miała skakanek, powtórzeń ani słabych wyników.
Niezależny całokształt-przegląd zaakceptował rzeczywiste wyniki.

Kompletny pakiet historii (SHA256 `6c5361c6346f4fb4bc9ab265900d3feab05336bfbeff2320cd85a4875c78ebfa`) został przywrócony lokalnie przez wykonawcę
implementacji, a następnie niezależnie przez innego wykonawcę: wszystkie cztery refs,
450 commits, wszystkie 655 plików źródłowych i trybów, a testowane drzewo dopasowane;
kontrole integralności przeszedł bez notatek, zastępców lub współdzielonych inodes
plików. Sekcja akceptacji planu zapisuje szczegóły budowy, archiwizacji i konserwacji
poprzedników.

To później dwa-plik zamknięcia Markdown rejestruje już przetestowaną funkcję commit;
jego późniejsze drzewo dokumentacji jest odrębne i nie ma roszczenia do świeżo
uruchomionych testów produktów. Zamknięcie dokumentacji posiada osobne niezależne
przeglądy, commit i końcowe kompletną historię backup/restoration bram; ich dokładne metadane są
rejestrowane oddzielnie od testowanego migawki funkcji. Wszystkie wcześniejsze
oświadczenia proposal/checkpoint zachowują swoje historyczne znaczenie. Remote/main Integracja, prowadzenie
działań, wdrażanie i publikacja pozostają odroczone. A12 pozostaje prywatnym doradcą do
czasu zamknięcia; globalny wniosek UI pozostaje odrębny.


## Plan 003 przyjęty lokalnie (2026-11-10)

Konserwacja przeglądowa-pomocowa została zaakceptowana przy feature commit `5b31be08d8701891379183d874b7908c4953ed48`,
dokładnie przetestowane drzewo `3c532cd30a2ee6caf58513a6e20ab786330c98b3`. Mijała skupiony apartament, ujawniony zwykły profil
Vitest, 204-case lokalnej kohorty przeglądarki i formalnej weryfikacji offline. W [plan utrzymania](003-review-assistance-gates.pl.md)
rejestruje się obsadzone i pominięte pokrycie jednostkowe, początkową awarię
przeglądarki, kontynuację bufora oraz odroczone zewnętrzne palenie.

Ta aktualizacja Markdown sprawdza drzewo fabularne. Pełna historia kopii zapasowej i
niezależnej renowacji pozostaje w oczekiwaniu.


## Plan 004 przyjęty lokalnie (2026-11-11)

Funkcja ewolucji schematów plików jest realizowana na poziomie `e4abd021b1ff9918e6a2cb2a9d6f0eaabde0b830`, a jej kompletny
pakiet źródłowo-historyczny został niezależnie przywrócony. Przed rozpoczęciem A12 planu
003 również upłynęła niezależna przywracanie pełnej historii. Dwie oddzielne korekty
pakietów są rejestrowane w [A12 plan](004-file-schema-evolution.pl.md). Ostateczne drzewo pakietowe o wartości `3520b34dcbd32cf7b5f1651d397d59844bd446d2` przeszło
przez weryfikatora ogólnego na stabilnej i dokładnej ruście 1.85.0.

W [Zamknięcie programu nauczania](../docs/curriculum-reconciliation.pl.md) zapisano ostateczne pojednanie autorskie. Ta aktualizacja Markdown rejestruje
sprawdzanie testowanej funkcji i paczek drzew. Hosted CI, external runner smoke tests,
publication, pupation and remote integration are depart.
