# Zasady pracy w repozytorium

[English](AGENTS.md)

## Produkt i język

Rust Workshop to lokalne środowisko nauki dla osób znających podstawy
programowania, które jeszcze nie znają Rusta. Wyjaśniaj Rusta od podstaw.
Nie zakładaj znajomości bibliotek innego języka.

Lekcje, polecenia, informacje zwrotne i tekst interfejsu są dostępne po
angielsku i po polsku. Aplikacja zachowuje polski w istniejącym warsztacie,
a przy pierwszym uruchomieniu wybiera pierwszy obsługiwany język
przeglądarki. Gdy go nie znajdzie, używa polskiego. Utrzymuj obie wersje
każdego dokumentu Markdown w repozytorium i połącz je linkami. Pisz
commity, pull requesty i notatki agentów po angielsku. Opisuj dostępne
funkcje. Nie dopisuj kont, synchronizacji w chmurze, hostingu, potwierdzonej
skuteczności nauczania, gotowości zawodowej ani automatycznej oceny całej
architektury.

## Mapa repozytorium

- `src/content/` zawiera lekcje, moduły, pojęcia, powtórki, źródła,
  kontrakty oceny i definicje projektów. `src/content/course.ts` składa
  katalog.
- `src/engine/` odpowiada za ocenę, zapisy wyników nauki, powtórki
  i nawigację. Trzymaj te reguły poza komponentami interfejsu.
- `src/persistence/` odpowiada za stan IndexedDB, weryfikację, migrację,
  import i eksport. `src/runner/` i `src/app/api/run/` zawierają adapter
  i trasę zdalnego uruchamiania Rusta.
- `src/domain/` zawiera wspólne typy i kontrakty zaufanych materiałów
  testowych. `scripts/` zawiera narzędzia weryfikacji i generator plików
  projektów, a `tests/` testy przeglądarkowe i integracyjne. Archiwa
  w `public/projects/` odtwarzaj skryptem pakowania.
- `docs/` zawiera instrukcje specjalistyczne, granice weryfikacji i zapisy
  wyników. Bieżący kontrakt CI opisuje [docs/ci-cd.md](docs/ci-cd.pl.md),
  a zasady wykonania kodu [docs/runner.md](docs/runner.pl.md).

## Polecenia i wybór testów

Użyj obsługiwanej wersji Node.js z `package.json`
(`^22.23.4 || ^24.22.1 || ^26.12.1`) i zainstaluj przypięty graf zależności.

```sh
npm ci
```

Polecenia `npm run dev` i `npm run build` uruchamiają generator plików
w cyklu npm. Do pracy lokalnej użyj `npm run dev`, a do uruchomienia wersji
produkcyjnej `npm run build && npm start -- --port 3002`. Generowane
archiwa projektów zmieniaj przez ich generator.

Dobierz kontrole do obszaru zmian.

- TypeScript, React, skrypty lub wspólne typy wymagają `npm run lint`,
  `npm run typecheck` i odpowiednich testów Vitest lub Node.
- Lekcje, mechanizmy oceny, źródła lub pakiety projektów wymagają
  `npm run content:check`, `npm run content:rust`, odpowiedniego polecenia
  `content:*` i kontroli zaufanego pakietu Rust. Przed przeglądem archiwów
  uruchom `npm run content:packages`. Polecenia z `--fetch` przygotowują
  dokładnie przypięte zależności testowe. Dalsze kontrole działają offline
  z przypiętymi wersjami.
- Stan, zdalne wykonanie kodu i zachowanie przeglądarki wymagają
  odpowiednich testów jednostkowych i zestawu Playwright. Produkcyjne
  E2E i `npm run test:offline` wymagają działającego serwera produkcyjnego
  i Chromium dla Playwright. Szczegóły opisuje [docs/ci-cd.md](docs/ci-cd.pl.md).
- Przy szerokiej zmianie wykonaj `npm run lint`, `npm run typecheck`,
  `npm run content:check` i `npm test`. Wcześniej przygotuj stabilny
  zestaw narzędzi i przypiętą pamięć podręczną Tokio z
  [docs/ci-cd.md](docs/ci-cd.pl.md).

`npm test` zawiera zaufane natywne testy w Ruście. Test prefiksu
zainicjalizowanych danych może zostać pominięty w zwykłym przebiegu
lokalnym, gdy brakuje warunków autoryzacji. Autoryzowany przebieg wymaga
konfiguracji Cargo offline zgodnej z CI, kwalifikacji stabilnego
`rustc`/`rustdoc`/`cargo`, ścieżek plików wykonywalnych i oczekiwanych
artefaktów wynikowych. Nie omijaj kwalifikacji. Brak pliku wykonywalnego,
przekroczony limit czasu, błąd zależności i niepełny raport zgłaszaj zgodnie
z wynikiem. Zaznacz blokady, ograniczenia infrastruktury, częściowe przebiegi
i pominięcia.

Kontrole specjalistyczne mają jawne warunki. Do kontroli MSRV użyj
dokładnie Rusta `1.85.0`. Dla Miri użyj nightly `2026-08-08` z Miri
i `rust-src`. Dla kampanii mini-grep użyj `cargo-fuzz 0.13.2`, a dla
nowych wyników Callgrind użyj Valgrind. Każde narzędzie weryfikujące zapisuje
ścieżki, wersje i metadane wyników. Pobranie zależności przygotowuje
środowisko do testu zachowania. Metadane Miri i innego sprawdzania
niezdefiniowanego zachowania dotyczą wyłącznie zadeklarowanego natywnego
przykładu z repozytorium.

## Zasady tworzenia materiałów i zapisu wyników

Stosuj typy i wzorce z `src/content/` oraz `src/domain/types.ts`.
Utrzymuj aktualne oficjalne źródła i metadane przeglądu. Wynik wykonania
wymaga osobnej kontroli. Weryfikuj przykłady i kontrakty oceny na
obsługiwanych wersjach kompilatora i narzędzi. W raportach zachowaj
rzeczywisty kompilator, ścieżkę narzędzia, wersję, SHA lub inne dane
o pochodzeniu wymagane przez weryfikator.

Identyfikatory lekcji, modułów, pojęć, powtórek, rodzin zadań, źródeł
i projektów są trwałymi kontraktami. Zachowaj kolejność oraz tożsamość
historycznych kroków. Opisz zgodność wprost, gdy zmiana wymaga nowej
tożsamości albo migracji. Zachowaj dokładne miejsce wznowienia, szkice,
notatki, zakładki, surową historię wyników, historię pomocy, sesje
powtórek i stan z importu. Nie przepisuj zdarzeń w celu zmiany wyników
i nie odrzucaj po cichu importowanych rekordów.

Osobno zapisuj zapoznanie się z materiałem, ukończenie, samodzielne
programowanie i późniejsze przypomnienie. Odsłonięte rozwiązanie,
podpowiedź, próba z pomocą, alias, powtórzone zadanie i odpowiedź
kontrolowanej atrapy nie dają wyniku samodzielnego programowania.
Sam import nie może tworzyć, wzmacniać ani zmieniać etykiety wyniku
samodzielnego. Zachowaj prawidłowe zdarzenia historyczne wraz z pochodzeniem,
czasem, identyfikatorem i klasą wyniku. Zadania główne, stan ukończenia
i powtórki mają odrębne kontrakty. Zachowaj je przy zmianie mechanizmu oceny
lub nawigacji.

Kod Rust wpisany lub zaimportowany przez ucznia działa wyłącznie przez
`POST /api/run` i izolowany zdalny adapter. Aplikacji ani narzędziom
utrzymaniowym nie wolno uruchamiać plików ucznia, importowanych plików,
dowolnych manifestów ani narzędzi wybranych przez przeglądarkę za pomocą
lokalnego `rustc`, Cargo, powłoki lub procesu potomnego. Uczeń może sam
uruchomić pobrane archiwum Cargo w swoim środowisku. Jest to niezależne od
automatyzacji aplikacji i agentów. Niedostępność zdalnego wykonania jest
problemem infrastruktury. Nauka offline zachowuje stan i pokazuje, że
wykonanie jest niedostępne. Przechwycone odpowiedzi w przeglądarce
potwierdzają wyłącznie zachowanie żądań, interfejsu i stanu.

Lokalne weryfikatory Rusta służą osobom utrzymującym projekt i działają na
stałych, zaufanych materiałach testowych z repozytorium. Używaj wyłącznie
autorskich plików i ustalonych manifestów. Odrzucaj dowolne źródła, ścieżki,
zamienniki zależności i dowolne wersje narzędzi. Udokumentowane wersje
stałe, na przykład dokładnie Rust `1.85.0` z `--msrv`, pozostają
obsługiwane w odpowiednim weryfikatorze. Wykonanie natywne, celowe mutacje,
Miri, profilowanie, fuzzing i diagnostyka kompilatora dostarczają wyników
tylko dla zadeklarowanych materiałów testowych. Kontrole stable i MSRV mogą
wykonywać autorskie testy `safe-behavior`. Autorskie przypadki negatywne
z niezdefiniowanym zachowaniem podlegają kompilacji samych metadanych
i uruchomieniu wyłącznie przez przypięte Miri. Nie uruchamiaj ich natywnie
nawet z ustalonymi zaufanymi danymi. Miri i metadane niezdefiniowanego
zachowania nie zezwalają na wykonanie kodu ucznia lub importowanego kodu.
Granicę kontroli zainicjalizowanego prefiksu opisuje
[docs/initialized-prefix-evidence.md](docs/initialized-prefix-evidence.pl.md).

## Współpraca i przegląd

Rób małe commity po angielsku i trzymaj jedną spójną zmianę w pull
requeście. Przy równoległej pracy rozdziel pliki i podaj zakres
odpowiedzialności przed edycją. Notatki do wznowienia i przekazania pracy
zapisuj w ignorowanym katalogu repozytorium, np. `test-results/handoff/`.
Unikaj katalogów tymczasowych. Nie zapisuj w commitach prywatnych
potwierdzeń, danych uwierzytelniających, informacji o kontach ani ścieżek
komputera.

Istotne zmiany przekaż do niezależnego przeglądu. Traktuj automatyczne
uwagi jako hipotezy. Odtwórz zgłoszone zachowanie, sprawdź kontrakt i testy,
a potem rozwiąż problem lub udokumentuj ustalenie. Przegląd agenta nie
stanowi porady prawnej.

Przed integracją wykonaj aktualne kontrole dokładnego commita PR,
uzyskaj niezależny przegląd i użyj standardowej ścieżki scalenia
repozytorium. Po scaleniu zweryfikuj wynikowy commit `main`. Historyczne
udane przebiegi, inny commit, kontrolowana atrapa, pobranie zależności
i częściowy przebieg lokalny nie spełniają bieżącej wymaganej kontroli.
Przy niedostępnym CI lub infrastrukturze zachowaj pracę lokalnie i podaj
ograniczenie. Nie omijaj warunków ani nie fabrykuj wyników.

Domyślnym modelem utrzymaniowym dla delegowanych subagentów jest
GPT-6.1-Sol ze średnim zakresem rozumowania. Zgłoś niedostępność przed
zastąpieniem modelu. Późniejsza jawna instrukcja użytkownika ma
pierwszeństwo. Ta preferencja procesu utrzymania nie wymaga płatnego
narzędzia od zewnętrznych współtwórców.

## Decyzje człowieka i granice bezpieczeństwa

Instrukcje wdrożenia upoważniają do odwracalnej pracy w repozytorium
w ustalonym zakresie. Wybór lub zatwierdzenie licencji i oznaczeń
autorstwa, publikacja, zmiana widoczności, wdrożenie, hosting, publikacja
pakietów, rozliczenia, płatna infrastruktura i działania nieodwracalne
wymagają wyraźnej decyzji osoby utrzymującej projekt oraz aktualnych
kontroli i przeglądu w wymaganym zakresie. Zachowaj wyniki i historię.
Nie przepisuj historii, nie usuwaj zapisów i nie osłabiaj zabezpieczeń
w celu uzyskania zielonego raportu. Tymczasowe blokady projektu i stan konta
trzymaj w prywatnych instrukcjach głównych lub ignorowanych notatkach
przekazania pracy.

W workflow stosuj minimalne uprawnienia. Nie udostępniaj niezaufanemu
kodowi z forków sekretów, uprzywilejowanych przebiegów ani komputerów
osób utrzymujących projekt. Repozytorium przypina akcje stron trzecich do
pełnego SHA commita. Obecne zalecenia GitHub wskazują pliki blokad
zależności workflow jako najsilniejszą metodę, jeśli repozytorium może
ją zastosować. Pełne SHA są rozwiązaniem zastępczym. Przy zmianie workflow
sprawdź aktualną oficjalną instrukcję.

<!-- BEGIN:nextjs-agent-rules -->

## Ta wersja Next.js wprowadza zmiany łamiące zgodność

W tej wersji mogły zmienić się API, konwencje i struktura plików. Przed
pisaniem kodu przeczytaj odpowiedni przewodnik w `node_modules/next/dist/docs/`.
Ścieżka jest rozwiązywana względem tego katalogu. W monorepo pakiet
`next` może znajdować się poza katalogiem głównym repozytorium. Sprawdź
ostrzeżenia o wycofaniu funkcji.

`next dev` zapisuje i przywraca ten blok. Kod generatora jest w
`node_modules/next/dist/server/lib/generate-agent-files.js`. Usunięcie
go z różnicy spowoduje odtworzenie niezatwierdzonej zmiany po następnym
uruchomieniu. Uwzględnij blok w zmianie, aby zachować czyste drzewo.

<!-- END:nextjs-agent-rules -->
