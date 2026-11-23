# Number Guessing+ — plan wdrożenia

[English](2026-09-13-number-guessing-plus.md)

> Dla nowych delegacji i niezależnych przeglądów obowiązuje tryb subagent-driven-development oraz wybrany przez użytkownika GPT-5.6-Luna high. Agent główny odpowiada za integrację i wydanie. Zadania autorskie nie obejmują commitów.

**Cel.** Uzupełnij pierwszy projekt portfolio o działającą, przetestowaną grę terminalową z losowo wybieraną liczbą, zachowując dotychczasowy stan uczestników.
**Architektura.** Cztery lekcje oparte na danych, uzupełnienie istniejącego ProjectContract, jeden pakiet Cargo do pobrania z biblioteką i programem wykonywalnym oraz odizolowany weryfikator dla opiekunów.
**Technologie.** Istniejąca aplikacja TypeScript i Next.js, Rust 2024, przypięty rand 0.10.2, Vitest, Cargo i Playwright.
**Specyfikacja.** Dokładną semantykę i interfejsy określa `docs/superpowers/specs/2026-09-13-number-guessing-plus-design.md`.

## Ograniczenia globalne

- Projekt zachowawczy ID `number-guessing-result-message`, stary lessons/steps i trwały v3.
- Moduł `number-guessing-plus`; cztery IDs w specu; pierwotne `-gate` i świeże `-blank` na lekcję.
- Keep inline ćwiczenia std-only; prawdziwe losowe gry i testy procesowe należą do
  artefaktu Cargo.
- Wyłącznie wyposażenie do repozytorium testowego; nie learner/import wykonanie lub plac zabaw POST.
- Wszyscy nowi agenci używają Luny wysokiej według najnowszej aktualizacji bramki; już
  wysłani autorzy rozpoczęli pracę zgodnie z poprzednią instrukcją Terra medium.
  Recenzje badają poprawność i niezależny transfer, nie tylko sumy testów.

## Zadanie 1 — lekcje o parsowaniu i stanie

Własność `src/content/guessing-core.ts`. Wyprodukuj `guessingCoreLessons`, `guessingCoreConcepts`, `guessingCoreCompetencies`, `guessingCoreSources`, `guessingCoreReviewExercises`.

- [x] Napisz ukryte testy dla `guess-input-contract` i `guess-round-state` na dokładne parser/state kontrakty; obserwuj zamierzone
      niepowodzenia przed wdrożeniem odniesienia.
- [x] Autor prediction/run/explanation/primary repair/blank dla każdego. Pierwszy warunek wstępny `testing-quality-workflow`; drugi zależy od
      pierwszego. Zapewnić różne domeny transferu ze zmienionymi ograniczeniami i
      świeżych przeglądów kodowania.
- [x] Uruchom zaufaną weryfikację tylko na tych lessons/reviews; zachować błędy i ostateczne wyniki.
      Przegląd granic testowych i metadanych źródłowych.
- [x] Niezależny recenzent potwierdza spec i jakość; wyniki napraw.

## Zadanie 2 — lekcje o strumieniach i losowości

Własność `src/content/guessing-io.ts`. Wyprodukuj `guessingIoLessons`, `guessingIoConcepts`, `guessingIoCompetencies`, `guessingIoSources`, `guessingIoReviewExercises`.

- [x] Należy zapisać niepowodzenia testów dla `guess-session-io` i `guess-random-boundary`. Pierwsze zależy od `guess-round-state`; drugie
      od sesji.
- [x] Autor pełnej sekwencji lekcji. Test prompt/flush przed odczytem, EOF i błędy z
      determinalistycznymi adapterami std. Wyjaśnij, że wszczepione testy zamknięcia
      potwierdzają politykę połączeń, podczas gdy prawdziwy losowy dependency/CLI jest sprawdzany
      oddzielnie w Cargo.
- [x] Dodawanie niezależnych umów pustych i przeglądów ze zmienionym zachowaniem,
      wykonywanie referencji i zamierzone niepowodzenia za pośrednictwem zaufanego
      weryfikatora.
- [x] Niezależny recenzent potwierdza spec, obsługę błędów i znaczące przeniesienie.

## Zadanie 3 — grywalny pakiet Cargo

Posiadane `src/content/projects/number-guessing.ts`, `src/content/projects/number-guessing/archive.ts` i testy skoncentrowane na pakietach. Wyprodukuj `numberGuessingPackage`, `numberGuessingProject`; wzmocniony
projekt imports/spreads dotychczasowego projektu katalogowego bez przywozu course.ts.

- [x] Napisz prawdziwe testy Rust przeciwko kompilacji TODO starter dla wszystkich
      kontraktów spec, a następnie wdrożyć odniesienie. Użyj generowanych Cargo.lock,
      przymocowanych randów, prywatnego stanu gier, czystych parserów i generycznych
      adapterów strumieniowych.
- [x] Wdrożenie rzeczywistego CLI, dokumentacji, dokładnych transkrypcji oraz
      adaptacyjnego testu procesu bisekcyjnego ograniczonego do losowego domyślnego
      odtwarzania. Zachować błędy biblioteki i poprawny stan terminala.
- [x] Uruchom rzeczywiste archiwum ekstrahowane fmt/check/test/Clippy i wszystkie negatywne przypadki;
      zestawienie początkowych testów, ale nie przechodzi niedokończone zachowanie.
- [x] Dodać README wyjaśniając standardową grę losową, tryb deterministyczny praktyki,
      granice failure/limit i wersje źródłowe. Ujawnij tylko cztery główne bramy lekcji.
- [x] Niezależny recenzent sprawdza całe archiwum i learner/project wierność.

## Zadanie 4 — integracja, warianty z celowymi błędami i wydanie

Root jest właścicielem `src/content/guessing-module.ts`, `course.ts`, testu integracyjnego, dedykowanego `scripts/verify-number-guessing.ts` i mutantów, package.json/CI,
doków, E2E/offline i wersji cache.

- [x] Dodaj czerwone kontrole integracyjne: ten sam projekt ID/index/export, stary notes/resume przetrwać
      export/import, nowy pakiet istnieje, cztery bramy każdy zachować świeży pusty po objawieniu.
- [x] Moduł rejestracji po przeprowadzeniu testów lessons/concepts/reviews/sources, ulepszony projekt i plan
      działania. Potwierdź zielone potwierdzenie.
- [x] Dodać stałe sprawdzanie mutantów z dokładnym dowodem niepowodzenia. Specjalny
      weryfikator akceptuje tylko fakultatywne --fetch i --msrv, wyciąga ten dokładny pakiet,
      pobiera zablokowane zależności na żądanie, następnie uruchamia offline checks/mutants. CI
      powołuje go przed ogólną weryfikację pakietu oraz w istniejącej pracy MSRV z
      przymocowanymi narzędziami.
- [x] Rozszerzenie kontroli module-resume/project-reference/offline i zachowanie danych użytkownika. Przeglądarka navigation/keyboard/console
      dotycząca ostatecznej budowy produkcji.
- [x] Run lint, typechell, Vitest, content/Rust/Tokio/Loom/Cargo weryfikacja, audyt źródłowy, produkcja E2E/offline;
      niezależny przegląd ostatecznej integracji.
- [x] Aktualizacja wszystkich coverage/audit/verification doków bez żądania pełnego ukończenia kursu
      zaawansowanego; obejmują uprzednie PR # 2/CI dowody i poprawny duplikat lokalnej
      liczby weryfikatorów.
- [x] Commit, push, create PR to main, check exact-head CI and conversion. Pozostawić
      otwarty cel pełnego kursu.

## Kontrole wstępne i rozstrzygnięcia

| Tasks/interfaces | Kontrola i rozdzielczość |
| --- | --- |
| 1 → 2 | Cztery przykute łańcuchami lesson/concept IDs ustawione w specyfikacji; autorzy nie importują się nawzajem. |
| 1/2 → 4 | Ta sama nazwa eksportu i primary/blank IDs; tylko root edits rejestracji kursu. |
| 3 → 4 | Eksportuj package/project; skoki root fetch/mutations do tego pakietu i wykorzystuje tylko autorskie źródło. |
| 1/2 ↔ 3 | Podstawowy spec udziału semantyki; Niezależny transfer celowo różni się i nie jest ujawniony przez pakiet. |
| 4 ↔ spuścizna | Zatrzymać projekt ID, oryginalne lekcje i klucze dowodowe. Ulepszenie kursy.project i projektów [0] razem; brak duplikatu pierwszego projektu. |
| Wszystkie | Istniejące zameldowanie funkcji już oddziela pracę od pracy głównej; nie jest potrzebne dodatkowe zameldowanie lub ponowne zainstalowanie zależności. Kod przedwczesny PR pozostaje niezmieniony, a jego wartość odniesienia local/CI została przekazana. |

Poprzednia zmiana celu poczyniła postępy: committed/pushed Mini grep + CI, połączona PR # 2 i niezależnie
skontrolowana kolejna pierwotna krótka luka. Plan ten wykonuje wybraną lukę; nie
definiuje ona ponownie pełnego celu.

## Wyniki lokalnej weryfikacji i przeglądu

- 171 Testy Vitest / 36 plików; przepustka z lintu, typecheck i produkcji.
- Pełna autorzy Rust: 1343/1343; ostatnia czterolekcyjna delta: 46/46 (obejmuje dwie wspólne
  kontrole weryfikatora, a nie dodatkowe wyjątkowe przypadki).
- Tokio 252/252, Kontrola pętli, wszystkie osiem archiwów Cargo, dokładna Rust 1.85 workspace
  i odgadywanie kontroli, cztery zgadywania mutantów, Mini grep fuzz i powtórka pass.
- Audyt źródłowy 237/237 HTTP 200; produkcja E2E 46/46 bez ponownych prób i cache offline v20/eight
  ZIPs pass. Podręcznik UI sprawdzony kontrakt lekcji, sformatowany kod, zakładki
  klawiatury i pusta konsola warning/error.
- Wysokie oceny Luny obejmowały główne, IO, pakiet, integration/CI i kontrakty z uczniem się;
  podstawowe stałe luki zgłoszone.
- Dodatkowo korzeń reproduced/fixed OutputReader czyści się pełnym kanałem, usunął nieznany MSRV lint i
  zachował stary projekt krok zamówienia. Test integracji Cargo otrzymał swój własny
  ograniczony 120-sekundowy timeout po poprawnym przebiegu kompilacji przekroczył
  domyślną jednostkę 5 sekund; Todo E2E teraz wybiera swój projekt wyraźnie.
- Cel szerszego kursu pozostaje otwarty. Hosting jest nadal nieokreślony; nie ma zmian w
  widoczności rozmieszczenia ani repozytorium.

Kontrola wydania: commit 8d9536e i PR # 7 created. CI uruchomić 34748982169 przeszedł MSRV
i fuzz, ale nieudany starter detection TODO, ponieważ Cargo zatrzymał się po wczesnych
CLI awarii testów. Oba weryfikatory starter wymagają teraz wszystkich apartamentów z
--no-fail-fast, zachowując wyraźne niedokończone stwierdzenie zachowania; skorygowana głowa musi
przejść pełną CI przed połączeniem.

Release completed: corrected head 451e3a3 passed equity, workspace-msrv and mini-grep-fuzz
in run 34749313613. PR # 7 połączone w dniu f94b87e po GitHub połączenie APIs wielokrotnie
zwracane HTTP 500; zwykłe połączenie w czystym czasowym drzewie roboczym wytworzyło
drzewo identyczne z badaną głową, a następnie nie-force push uaktualniony główny. GitHub
potwierdza połączenie = prawda. Po połączeniu główny bieg 34749710087 udało się we
wszystkich trzech miejscach pracy.
