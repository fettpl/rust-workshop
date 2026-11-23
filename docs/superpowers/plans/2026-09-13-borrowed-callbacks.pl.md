# Funkcje zwrotne operujące na pożyczonych danych — plan wdrożenia

[English](2026-09-13-borrowed-callbacks.md)

> Agenci pracują w trybie subagent-driven-development. Nowi autorzy i recenzenci używają GPT-5.6-Luna high. Agent główny odpowiada za integrację i wydanie. Użytkownik zatwierdził już dalszy rozwój kursu oraz commity, PR-y i scalenia etapów.

**Cel.** Cztery niezależnie oceniane lekcje uczą praktycznej wariancji i kontraktów funkcji zwrotnych z ograniczeniami wyższej rangi dotyczącymi czasów życia.
**Architektura.** Dwa pliki zawierają po dwie lekcje. Jeden plik modułu łączy je z istniejącym programem i silnikiem oceniania. Kurs dalej korzysta z zaufanego weryfikatora Rust, wykonawcy, mechanizmu zapisu postępów i katalogu projektów.
**Technologie.** TypeScript i Next.js, Rust 2024 z biblioteką standardową, Vitest oraz Playwright.
**Specyfikacja.** `docs/superpowers/specs/2026-09-13-borrowed-callbacks-design.md`.

## Ograniczenia globalne

- Moduł `borrowed-callbacks`, po `closures`; warunek wstępny modułu `closures`.
- Zamówione IDs: `variance-shared-views`, `variance-mutable-slots`, `hrtb-local-visitors`, `hrtb-borrowed-projections`. Ta sama lekcja i koncepcja IDs.
- Warunkiem wstępnym pierwszej lekcji `closure-contracts`; warunkiem wstępnym pierwszej koncepcji `callable-contracts`.
  Po nowym IDs tworzą łańcuch.
- Każda lekcja dostarcza podstawowe `${id}-gate`, niezależne `${id}-blank` bez starter/signature oraz świeży przegląd
  kodowania. Blank podpowiada nazwę API i całkowite zachowanie w prozie, a nie wklejony
  podpis Rust.
- Wszystkie Rust są Rustem tylko std 2024. Użyj rzeczywistych obserwowanych testów
  diagnostycznych i kompilacyjnych. Brak regex dowodów lifetime/variance, niebezpiecznych,
  nieszczelnych poprawek lub niezapowiedzianych ograniczeń wdrażania.
- Zachowanie starych IDs, zachowane dowody, biegacz i wytrwałość v3. Brak nowego pakietu
  Cargo lub zależności. Pozostało osiem projektów i pakietów.
- Kopia polska zakłada podstawowe programowanie i brak wcześniejszego Rust. Metadane
  źródłowe reviewedAt `2026-09-13`.
- Wykonaj tylko utwory autorskie, nigdy learner/import Rust or Playground POST. Brak rozmieszczenia
  hosta lub zewnętrznych publikacji pakietów.
- Prace nad oddzielną gałąź funkcji w oparciu o zweryfikowane commit 451e3a3, podczas gdy
  PR # 7 kończy się CI; zakończyć łączenie PR # 7 przed opublikowaniem następnego
  bloku. Równoległe autorzy posiadają pliki dezjoint; preferencje użytkowników dla
  czynników równoległych zastępują ogólne wytyczne dotyczące sekwencyjnego przepływu
  pracy. Autorzy nie popełniają zobowiązań; root commits dokonał przeglądu kamienia
  milowego.

## Zadanie 1 — wariancja współdzielonych referencji i zmienialne pola

**Pliki:** stworzyć `src/content/borrowed-variance.ts`. **Produkcja:** `borrowedVarianceLessons`, `borrowedVarianceConcepts`, `borrowedVarianceCompetencies`, `borrowedVarianceSources`, `borrowedVarianceReviewExercises`.

Czytać sekcje spec Integration, Lesson 1, Lesson 2 and Sources/evidence. Użyj istniejących `src/content/guessing-core.ts` i `src/content/lifetimes.ts`
dla schematu treści; nie importować sąsiedniej zawartości lub course.ts. Użyj dokładnego
pierwotnego API i puste zachowanie z Spec. Dodaj w pełni określone kontrakty przeglądowe
w różnych domenach.

- [x] Napisz ukryte testy i kompilację niedokończonych starter dla obu pierwotnych APIs
      przed referencjami. W tym ogólne przeliczanie na okres Label/Samples, identyfikacja
      wskaźnika, granice Unicode/prefix i powtarzające się krótkie umorzenia podlegające mutacji.
      Weryfikacja zamierzonej awarii; zachowanie command/output w sprawozdaniu.
- [x] Wdrożenie referencji APIs i udowodnienie, że oba ukryte apartamenty przechodzą.
      Dodaj niezależne puste i przeglądaj odniesienia z granicami i krótkich właścicieli
      lokalnych, a następnie weryfikuj każde odniesienie.
- [x] Przewidywania autorów, obserwacje wykonywalne i wyjaśnienia. Weryfikacja
      odrzuconych subtyping/assignment przykładów z rzeczywistym Rustem 2024; rozróżnienie zewnętrznej
      zmienności żywotności podlegającej mutacji od niezmienności zawartości. Wyjaśnij
      dokładnie granice typu `'static`.
- [x] Format Snippety Rust i TypeScript, następnie uruchomić zaufaną weryfikację tylko na tym
      pliku lessons/reviews za pomocą `verifyTrustedRust({ lessons: borrowedVarianceLessons, reviewExercises: borrowedVarianceReviewExercises, traces: {} })`. Każdy wynik musi przejść; dwa wspólne kontrole
      weryfikatorów nie są dodatkowe przypadki lekcji.
- [x] Samoocena kompletnych umów uczących się i dostarczyć evidence/report. Root wysyła niezależny
      przegląd i obejmuje poprawki przed ukończeniem zadania.

## Zadanie 2 — lokalni wizytatorzy i projekcje zwracające referencje

**Pliki:** stworzyć `src/content/borrowed-hrtb.ts`. **Produkcja:** `borrowedHrtbLessons`, `borrowedHrtbConcepts`, `borrowedHrtbCompetencies`, `borrowedHrtbSources`, `borrowedHrtbReviewExercises`.

Przeczytaj sekcje spec Integration, Lesson 3, Lesson 4 i Sources/evidence. Poprzednia nowa lesson/concept to `variance-mutable-slots`;
nie importuj pliku zadania 1. Zastosuj dokładne kontrakty inspect_owned/inspect_until/project_lengths/find_projected_size. Dodaj nowe recenzje
zgodnie z podanymi przepisami.

- [x] Napisz ukryte testy przeciwko kompilacji TODO starters przed implementacją
      referencyjną. Wymagane są krótkotrwałe dane wejściowe, wychwytywane stany
      niestatyczne, FnMut ślady wywołania i typy niebędące własnością klonu result/error. Badanie do
      czasu i opcjonalne rzutowanie musi się zatrzymać na podany pierwszy wynik;
      odróżnić None i Some (0).
- [x] Obserwować zamierzoną awarię, a następnie wdrożyć referencje i compile/run wszystkie
      podstawowe, puste i przeglądowe apartamenty. Dołącz długości bajtów Unicode, puste
      rekordy i poprawną projekcję statyczną. Odrzucenie wymyślone twierdzenia, że
      życiowe adnotacje wskazują na pochodzenie podłańcuchowe.
- [x] Tworzenie przypadków odkrywania dla wybieranego rozmówcy w porównaniu z
      uniwersalnym życiem i stałe R w stosunku do pożyczonych wyjść. Sprawdź rzeczywistą
      diagnostykę za pomocą rustc; zawierać pełny kod bieżnikowy i prawidłowe
      wyjaśnienie. Zaakceptuj równorzędne granice i wyjaśnij w razie potrzeby function-item/closure
      wniosek.
- [x] Format wszystkich szczelin Rust i TypeScript. Uruchom `verifyTrustedRust({ lessons: borrowedHrtbLessons, reviewExercises: borrowedHrtbReviewExercises, traces: {} })`, zachowując wydajność i
      zamierzony dowód awarii.
- [x] Samoocena sugeruje przed ukrytymi testami i zgłosić dokładne wyniki. Root wysyła
      niezależną recenzję i obejmuje poprawki.

## Zadanie 3 — integracja, dowody pracy uczestnika i wydanie

**Pliki:** tworzyć `src/content/borrowed-callbacks-module.ts`, `src/content/borrowed-callbacks-integration.test.ts`; modyfikować `src/content/course.ts`, `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs`, `public/sw.js`, obecnie README/audit/progress/verification/curriculum doków. **Spożycie:** oba pliki
treści 'pięć o nazwie eksport powyżej.

- [x] Dodaj nieudany test integracji dla rejestracji modułu i autentycznego niezależnego
      zachowania bramy. Ujawnienie wszystkich czterech podstawowych kroków, wymaganie,
      aby każde pudło pozostawało nieujawnione, potwierdzenie pierwotnego ujawnionego
      dowodu nie może przejść moduł i niezależny pusty dowód może. Zachowaj niepowiązany
      zapisany szkic lekcji.
- [x] Moduł rejestrowania po zamknięciu, dołączenie obu plików "lessons/concepts/competencies/sources/reviews w tej sekcji,
      dodanie mapy drogowej i uniknięcie zmiany starego IDs/prerequisites. Zastosowanie czterech
      kryteriów bramki z primary/blank refs.
- [x] Rozszerzenie modułu produkcji-wznawiać E2E i niezapowiedziany sprawdzian lekcji
      offline; bump cache do v23. Nie dodaje się żadnego testu referencyjnego projektu,
      ponieważ nie zmienia się pakiet.
- [x] Recenzja wyników obu autorów niezależnie, naprawianie contract/test luk i przegląd
      integracji. Przeczytaj odpowiedni lokalny Następny przewodnik przed zmianą
      okablowania aplikacji.
- [x] Uruchom lint/typecheck/Vitest/content, pełny Autor Rust, audyt źródłowy, produkcja build/E2E/offline. Istniejące CI
      powtórzenia Tokio/Loom/Cargo/MSRV/fuzz przed wydaniem. Nie powtarzaj niepowiązanych drogich lokalnych
      apartamentów, chyba że zmiana lub niepowodzenie uzasadnia to.
- [x] Aktualizacja aktualnych statystyk i pokrycia uczciwie. Zachować Cargo/publication, unsafe/GAT/advanced
      wariancję, wydajność i operacyjne braki w programach nauczania. Rejestr
      poprzedzający ustalenie liczby PR/CI dowodów i nowych limitów weryfikacji.
- [x] Commit/push, otwarty PR, zweryfikować wszystkie trzy zadania na dokładną głowę, połączyć
      i potwierdzić główne. Pozostawić otwarty nadrzędny cel kursu.

## Kontrole wstępne i rozstrzygnięcia

| Granica | Weryfikacja |
| --- | --- |
| Zadanie 1 wewnętrzne | Dwa życiowe umiejętności mają różne kontrakty; wspólne współwariancja świadków i mutable-slot ponownie pożyczyć klientów typu test zachowania, nie tylko równości wyników. |
| Zadanie 2 wewnętrzne | Posiadane na stałe R i powszechnie pożyczone wyjście są odrębnymi umowami. Optional/Result Transfer changes call policy or failure semantics. |
| Zadanie 1 → Zadanie 2 | Dokładne zamówione lesson/concept ID łańcucha; brak importu plików krzyżowych lub współdzielonej własności pomocniczej. |
| Zadania 1/2 → Zadanie 3 | Pięć nazw eksportu na plik zawartości; ten sam IDs są używane do bram i mapowania przeglądu. |
| Zadanie 3 → trwałość | Tylko nowe klucze; migracja nie jest konieczna, pozostaje istniejący v3. |
| Zadanie 3 → CI | Istniejący pełny autorzy weryfikatora odkrywają zarejestrowane treści. Nie jest konieczne uzależnienie, pakiet lub rozszerzenie przepływu pracy. |

Regulacja: podział wariancji na wspólne widoki i zmutowalne szczeliny, a następnie
rozróżnienie własnych wyników zwrotnych z pożyczonych projekcji. Daje to cztery
oddzielne kontrakty do nauki zamiast lekcji końcowej, która tylko powtarza wcześniejsze
naprawy zwrotne. Koszty pozostawiają pokrycie unsafe/PhantomData/GAT na późniejszym, wyraźnym etapie.

Orzeczenie Cache: v21 było narażone przez poprzedni serwer produkcyjny, podczas gdy jego
HTML nadal zawierało starszy katalog. Zatrzymaj ten serwer przed końcowym wybudowaniem i
wydaniem z v22, aby klient nie mógł ponownie używać tymczasowego pamięci podręcznej w
wersji mieszanej. Brak danych uczącego się IndexedDB.

Końcowa UI przepustka kopiowa: wyjaśnienie niezmienności typu zamkniętego, a nie
nierozpuszczalności wartości, i naprawić prozę pustego zakresu replace_window (przechowywać puste,
zwrócić poprzedni widok). Uchwyty z rdzeniem bez zmian. Końcowy cache v23 ma tę kopię po
przejrzanej produkcji v22 build.

Ostateczne lokalne dowody: 122 lessons/33modules/125concepts/77blanks/249sources/8projects.172 Vitest in37 plików, lint/TS, fullRust1397 plus końcowe56, sources249HTTP200,
productionbuild, 47E2E without outretry, finalcopybuild + 1 affectedE2E, offlinev23/all8ZIPs andmanualUIkeyboard/consoleclean. Nie.
executionoflearner/importRust. Readyforcommit/PR/exactheadCI.

Release: PR # 8 converted as 57c24f905e94c04ca8629add5eb67eac246749f4 after all three
CI checks passed for 236a09e (automatic run 34750981784; manual run 34750956776 also
passed). Drzewo połączeniowe pasuje dokładnie do głowy. Ostateczna dokumentacja commit
tłumaczy README i zapisuje angielskie commit/PR metadane. Lokalne główne synchronizowane przed
uruchomieniem następnego oddziału funkcji Cargo.

Po połączeniu głównego CI 34751446523 przeszedł wszystkie trzy miejsca pracy dla 57c24f9.
