# Weryfikacja w całym cyklu fuzzingu — plan wdrożenia

[English](2026-09-20-fuzz-evidence-lifecycle.md)

> Agenci wdrażają plan zadanie po zadaniu w trybie superpowers:subagent-driven-development (zalecany) lub superpowers:executing-plans. Do rejestrowania postępów służy składnia `- [ ]`.

**Cel.** Naucz pełnego, ograniczonego cyklu fuzzingu kodu Rust i sprawdź jego działanie. Zachowaj domenę wejść, porównuj wyniki z niezależnym wzorcem, rozróżniaj kampanię od odtwarzania przypadku, podczas minimalizacji zachowuj klasę niepowodzenia i zamień kontrprzykład na stabilny test regresji z dowodem podlegającym audytowi.

**Architektura.** Dodaj czterolekcyjny moduł po module kontraktów właściwości i rozszerz istniejące archiwum Mini grep oraz ograniczony weryfikator fuzzingu. Ćwiczenia przeglądarkowe pozostają deterministycznymi kontraktami Rust korzystającymi wyłącznie z biblioteki standardowej. Instrumentacja i kampanie działają tylko na autorskim archiwum. Cel fuzzingu i stabilne testy odtwarzające współdzielą adapter dekodowania i wzorca wyników. Wzorzec nadal jest niezależny od produkcyjnej logiki wyboru.

**Technologie.** Istniejący model treści TypeScript, Vitest, Playwright oraz stabilny Rust i dokładnie Rust 1.85.0 dla zwykłych testów. Przebiegi instrumentowane korzystają z istniejących cargo-fuzz 0.13.2, libfuzzer-sys 0.4.13 i nightly-2026-08-08.

**Specyfikacja.** Zakres planowanego etapu wynika z `docs/advanced-curriculum.md` (kompetencje dotyczące testowania, Mini grep i niezależne dowody), `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, `README.md` oraz `docs/superpowers/plans/2026-09-19-runtime-allocation-evidence.md`. Dokument ustala plan, a wdrożenie i raport weryfikacji powstaną osobno.

## Ograniczenia globalne

- Zachowanie `schemaVersion: 3`, istniejące lesson/concept/project IDs, projekty, notatki i mastery semantics.
- Program nauczania dla uczniów jest polski; README pozostaje językiem angielskim.
- Rust 1.85.0 pozostaje minimalną obsługiwaną wersją dla stabilnego pakietu i przypadków
  przeglądarki. Nocny wynik nie jest wynikiem MSRV.
- Wykonuj tylko lokalnie autorskie oprawy. Weryfikatory akceptują brak źródła learner/imported,
  ścieżki plików, przekroczenie zależności lub arbitralne łańcuchy narzędzi.
- Ukończenie przeglądania, pobieranie archiwów i obserwowane kampanie opiekunów nie
  przyznają niezależnych dowodów ucznia.
- Uwolnienie z rezerwą Hold. Ten kamień milowy nie może dostarczyć na żywo advisory/license
  przeglądu, publikacji rejestru, gotowości do produkcji lub ludzkiego pilota.
- Planowanie wykorzystuje GPT-6 -Astra medium; implementacja, testy, zmiany dokumentacji i
  operacje Git używać GPT-5 .6-Luna wysoki, po przydziale modelu planu przydziału runtime
  i wnioskowany wyjątek planowania.
- Należy zapoznać się z odpowiednimi `AGENTS.md` i odnośnymi zainstalowanymi wytycznymi `node_modules/next/dist/docs/`
  przed kodem wdrożenia; nie są tu wymagane żadne zmiany w routingu lub biegaczu.

## Uzasadnienie etapu

Obecny katalog to 171 lekcji / 44 moduły / 174 koncepcje / 126 pustych zadań / 314
źródeł / 13 projektów / 7 śladów. Kontrakty na nieruchomości uczą już invariant/oracle, generatorów
ograniczonych, shrinking/replay oraz relacji metamorficznych wykorzystujących Proptest. Mini grep ma już
prawdziwy instrumentalny cel libFuzzer i kontrolowany mutant substring-to-prefix.
Powtórzenie tych podstaw lub wprowadzenie innego parsera dodałoby infrastrukturę bez
zamykania obiegu pracy uczącego się.

Zaginiony most to oceniana ścieżka uczenia się od surowych bajtów do wiarygodnych
dowodów. Ten kamień milowy ponownie wykorzystuje dojrzały osprzęt, dodaje stabilną umowę
regresji i sprawia, że istniejąca kampania jest do odczytu maszynowego. Jest ona
niezależnie weryfikowalna w jednym PR i zapewnia umiejętności, które mogą być
przenoszone w odniesieniu do każdego późniejszego projektu parsera i projektu
usługowego.

| Obszar otwarty | Istniejące dowody | Decyzja w tej sprawie PR |
| --- | --- | --- |
| Szerokość property/fuzz Program nauczania | Cztery lekcje proptest; ograniczona Mini grep kampania, stały mutant i przywrócona powtórka | Zwrócenie się do mostku z rozmyciem i dowodami; pozostawienie stateful/structured protokołu rozpylania, długotrwałych kampanii i szerszych generatorów otwartych |
| Niebezpieczna wariancja abstrakcji / kompatybilność dyn | Bezpieczny variance/HRTB, GAT, Async boxed adapter, ograniczony Miri/FFI | Defer: oddzielny API/soundness kamień milowy potrzebuje skupionych kompilacji-fail i Miri design |
| Operacje produkcyjne | Oprawy wspornikowe, telemetryczne, odwadniające i kaponowe | Odroczenie: wdrożenie, uwierzytelnianie, telemetria operacyjna i operacje związane z incydentami wymagają odrębnego wyboru środowiska |
| Żywe advisory/license / Rejestr | Offline osprzęt łańcucha dostaw wyraźnie zgłasza unsupported/infrastructure; publikacja = false | Defer: wymaga rzeczywistych bieżących dowodów zewnętrznych i decyzji publikacyjnych, a nie więcej symulowanych zatwierdzeń |
| Pilot / dostępność dla osób uczących się | Brak pilota; ręczne przeglądanie ekranu otwarte | Zachować otwarty: inżynieria nie może wytwarzać zaobserwowanego transferu ucznia lub przeglądu człowieka |
| Pozostała zaawansowana szerokość | Pełna pamięć model/progress gwarantuje, szersza API ewolucja, RSS/retained-memory, pochodzenie i historia migracji | Należy zachować jasność; to PR nie wymaga gotowości na wyższy poziom |
| Istniejące verification/documentation zadłużenie | Loopback E2E/offline dowody oczekujące w dokach; Stale capstone i runtime-counter prose | Ponowne przeprowadzenie odpowiednich kontroli w zdolnym środowisku i skorygowanie sprzeczności między stanem obecnym, zachowując raporty historyczne |

Alternatywne rozważane: niebezpieczne umowy abstrakcyjne pogłębiłyby węższy temat, ale
potrzebują nowego przypadku solidności, podczas gdy fuzz posiada maszyny wielokrotnego
użytku z natychmiastową luką w ocenie. Zapewnienie na żywo zwolnienia ograniczyłoby
blokadę wydania, ale zależy od obecnej infrastruktury zewnętrznej i przeglądu licencji
człowieka; jest ono mniej ograniczone jako kolejny kamień milowy w nauczaniu.

## Zakres i zestawienie liczebności

Dodać moduł `fuzz-evidence-lifecycle`, warunek wstępny `property-contracts`, z dokładnymi czterema lekcjami, czterema
koncepcjami, czterema kompetencjami, czterema pierwszorzędnymi bramami, czterema
niezależnymi ślepymi zadaniami i czterema niezależnymi odzyskiwaniem kodów. W każdej
lekcji należy uwzględnić przewidywanie, kontrastowanie run/observation, wyjaśnienie rubric, modification/debugging oraz
świeże przeniesienie. Osiem gate/blank zadań to ocenione alternatywy wyjścia; dodatkowa
praktyka nie jest liczona jako inna brama wyjścia.

Wartość wyjściowa sprzed okresu kamień milowy wynosi **175 lekcji, 45 modułów, 178 koncepcji, 130 pustych zadań, 13 projektów, 7 śladów**. Ukończony cykl życia dodaje
jeden moduł z czterema lekcjami, czterema koncepcjami, czterema ślepymi zadaniami i
czterema źródłami produkującymi **179 lekcji, 46 modułów, 182 koncepcji, 134 puste zadania, 13 projektów, 7 śladów**. Źródło derive liczy się od `content:check` / `content:audit`; ponowne
użycie istniejącego źródła IDs dla tych samych dokumentów tam, gdzie jest to właściwe,
zamiast wymyślania liczby docelowej. Rozszerzenie Mini grep własności projektu i pakietu
ujawniają mapowanie; nie czternasty pakiet.

Non-goals: nowy parser/service, nowy silnik fuzz, rozproszone lub zaplanowane kampanie, nowa
telemetria UI, procent całkowitego pokrycia wejściowego, certyfikat bezpieczeństwa,
ogólny reduktor awarii, rozpylanie arbitralny kod ucznia, zmiana Granicy Placu zabaw,
oczyszczanie źródła koca, nowe zależności produkcji lub obietnice uniwersalnej
odtwarzalności z nasion.

## Kontrakty lekcji i weryfikacji

Dla każdej lekcji należy stosować etap IDs `${lessonId}-gate` i `${lessonId}-blank`; zastosować pojęcie IDs równe
lekcjom IDs. Kryterium modułowe IDs wynosi `${lessonId}-contract`. Gate/blank/retrieval musi raczej zmienić wdrażanie i dane
niż zmienić nazwę jednej odpowiedzi.

| Lekcja ID / Tytuł polski | Kontrakt główny i brama główna | Niezależne przekazanie / odzyskanie | Wymagane błędy odrzucone |
| --- | --- | --- | --- |
| `fuzz-input-domain` / Surowe bajty i granica harnessu | Odkoduj udokumentowany Mini grep trzybajtowy nagłówek bezpiecznie; zachowaj surowe bajty ciała, odróżniaj nieobecne kadrowanie od parsed case i asert nieprawidłowe zachowanie domeny zamiast po cichu upuszczanie go | Blank używa komendy binarnej o długości przedrostowej; odzysk wykorzystuje oznaczony rekord z granicami lokalnymi | UTF-8 -lossy konwersja ciała; nieprawidłowe przypadki po cichu pominięte; niesprawdzone cięcie dla krótkiego nagłówka; długość zapytania-bajtu pomylona z liczbą znaków |
| `fuzz-oracle-sensitivity` / „Oracle musi wykrywać błąd” | Porównaj zamówione `(line_number, text, matched)` wyjścia i klasyfikację błędów; pokaż istniejący mutant przedrostkowy różni się od niezależnej distance/mask oracle | Blank porównuje ograniczony dekoder ramki z niezależnie wzorowanym wynikiem; pobieranie porównuje duplikaty-zachowanie wyboru wyszukiwania | Sukces tylko panika; porównanie długości; sort/deduplicate przed porównaniem; zignorowanie błędu versus-success |
| `fuzz-counterexample-regression` / „Od kontrprzykładu do regresji” | Wybierz mniejszego świadka tylko wtedy, gdy nadal produkuje dokładnie zamierzoną niepowodzenie umowy; zachować oryginalne bajty i powtórzyć przeciwko mutantom i przywrócone odniesienia | Blank reduces a malformed record while preserving a named error; retrieval reduces a frame-length mismatch and rejects a smaller timeout | Mniejsze wejście zmienia klasę awarii; empty/nonfailing przyjęty świadek; przywrócone referencje nadal zawodzą; tylko artefakt, brak regresji wykonywalnej |
| `fuzz-campaign-evidence` / „Co naprawdę potwierdza kampania” | Sklasyfikowanie dokumentacji dotyczącej dowodów wpisanych jako zakończonej kampanii ograniczonej, odtworzenia informacji lub awarii infrastruktury; powtórna operacja jest odrębną operacją i nie może zadowalać dowodów dotyczących kampanii | Blank diagnozuje dwa raporty kampanii z różnych hashów archiwum; Odzyskiwanie oddziela brakujące oprzyrządowanie, niepowodzenie narzędzia i prawdziwe odkrycie wyroczni | Zbuduj sukces traktowany jako kampania; powtórka liczona jako generowane uruchomione; timeout zielony; czerstwy artefakt zaakceptowany; brakujące tożsamość akceptowane; skończony udany bieg zwany dowodem braku błędów |

Kontrakty z kodem przeglądarki wzorują te decyzje, a nie sam libFuzzer. Intro wyraźnie
odróżnia generatory oparte na właściwościach i kurczy się od mutacji bajtowych, powtórki
corpus i reduktora. Wyjaśnij, że liczniki oprzyrządowania kompilatora to obserwacje, a
nie procent wszystkich wejść. Należy przechowywać primary/gate roztwory startowe z niezależnymi,
ślepymi i odzyskiwanymi definicjami. Przeglądanie albo znaków archiwum tylko odpowiednie
podstawowe zadania w ramach pomocy.

## Projekt archiwum autorskiego

Zachować `mini-grep-workshop` i obecny `selection` cel. Dodawanie plików pakietów poprzez mały eksport `src/content/projects/mini-grep/fuzz-evidence.ts` i
istniejący generator archiwum:

- `fuzz/support/case.rs`: dekoder tylko std dla istniejącego nagłówka binarnego; brak zależności libfuzzer.
- `fuzz/support/check.rs`: wspólny adapter nazywany realnym `Query`, `select_context`, `scan_reader` i niezależny `fuzz/oracle.rs`; produkuje
  wpisane niedopasowanie przed stwierdzeniem niewyraźnego celu.
- `tests/fuzz_regressions.rs`: stabilne testy importujące pliki wsparcia przez względne `#[path]`, w tym stały
  substring-versus-prefix świadków i wektorów granicznych.
- `FUZZ-MANIFEST.json`: wersja schematowa, nazwa docelowa, zweryfikowane pinezki łańcuchowe narzędzi,
  granice wejściowe, hashy plików źródłowych i stałe regresja SHA-256; generowane hash
  odnoszą się do ostatecznej zawartości archiwum i nie haszować manifest rekursywnie.
- `FUZZ-EVIDENCE.md`: proces uczenia się, wykluczanie domen, komendy, triage rubric,
  powtórzenie-kontra-kampania rozróżnienie i ograniczenia.
- `fuzz/regressions/substring-prefix.seed`: zameldowanie UTF-8 -bezpieczne urządzenie nagłówka binarnego `[0,0,1] + "xax\n"` (pytanie `x`,
  nadwozie `ax\n`). Wszystkie bajty przeżywają reprezentację pakietu. Test porównuje
  zakodowane bajty.

Przelicz istniejący cel fuzz, aby wywołać wspólny adapter sprawdzający, zachowując jego
bieżącą domenę: 3.. = 4096-bajtowe wejścia; context byte modulo 20; deklarowana długość
zapytania zaciśnięta do dostępnych bajtów; zapytanie przekonwertowane z istniejącej
polityki lossy; ciało pozostaje surowe bajty. Zapytania, kontekst, nieprawidłowe UTF-8 i
NUL nadal są sprawdzane. Nie należy zmieniać zachowania produkcji `src/search.rs`, z wyjątkiem
tymczasowego działania w obszarze pracy kontrolowanego-zmutowanego weryfikatora.

Adapter pakietów zwraca `Result<(), FailureKind>`, gdzie `FailureKind` rozróżnia `QueryAcceptance`, `ContextAcceptance`, `BodyAcceptance`, `SelectionMismatch` i `ReaderMismatch`. Fuzzer
zachowuje dokładny istniejący komunikat o wyborze swojego znanego mutanta.
Nieprawidłowości dekodowania uprzęży poza obszarem ramowania to counted/explained jako wyłączenia,
nieskuteczne testy parserowe.

Dodawanie autorskiego, definitywnego reduktora usuwania w weryfikatorze opiekuna, a nie
obietnica ogólnej minimalizacji libFuzzer. Począwszy od większego zatrzymanego świadka,
próba usunięcia kawałka w ustalonym porządku; akceptować tylko ściśle mniejszych
kandydatów w obrębie domeny ramowania, które powielają `SelectionMismatch`. Próby kapitulacji na 256 i
całkowity czas trwania podprocesu w 30 sekund. Zachowaj oryginał. Wynik nie musi być
globalnie minimalny: nazwijmy go zredukowanym świadkiem. Błąd kompilacji, timeout lub
inne twierdzenie nigdy nie jest prawidłową prognozą redukcji.

Ten wyraźny reduktor sprawia, że lekcja jest odtwarzalna. Rzeczywiste odkrycie
katastrofy libFuzzer pozostaje osobnym programem. Nie twierdźcie, że manual/authored awaria nasion
udowadnia odkrycie nieznanego błędu.

## Mapa plików

| Plik | Odpowiedzialność |
| --- | --- |
| Utwórz `src/content/fuzz-evidence-module.ts` | Moduł, warunki wstępne i cztery kryteria wyjścia |
| Utwórz `src/content/fuzz-evidence.ts` | Cztery polskie lessons/concepts/competencies, źródła i zwroty |
| Utwórz `src/content/fuzz-evidence-assessment-fixtures.ts` | Gate/blank/retrieval Odniesienia i kontrolowane nieprawidłowe rozwiązania |
| Utwórz `src/content/fuzz-evidence-assessment.test.ts` | Compile/run poprawne odniesienia i odrzucić mutanty semantyczne |
| Utwórz `src/content/fuzz-evidence-integration.test.ts` | Rejestracja, warunki wstępne, ujawnianie niezależności i liczby celów |
| Modyfikuj `src/content/course.ts` | Zarejestruj wszystkie nowe eksporty w istniejących tablicach |
| Utwórz `src/content/projects/mini-grep/fuzz-evidence.ts` | Nowe autorskie pliki Cargo i jawnej konstrukcji |
| Modyfikuj `src/content/projects/mini-grep/fuzz.ts`, `archive.ts`, `package.test.ts` | Wspólny adapter, skład archiwum i kontrakty byte/file |
| Modyfikuj `src/content/projects/mini-grep.ts` | Projekt lesson/concept/reveal odniesienia i instrukcje |
| Utwórz `scripts/fuzz-evidence.ts` | Walidacja raportu na maszynie i ograniczona orchestracja redukcyjna, bez realizacji procesu obciążenia modułowego |
| Modyfikuj `scripts/verify-mini-grep-fuzz.ts`, `scripts/fuzz-result.ts` | Wykonanie tylko przez autorów, zgłoszenie produkcji i bardziej rygorystyczna tożsamość biegu |
| Utwórz `src/content/fuzz-evidence-verification.test.ts`; modyfikacja `src/content/fuzz-result.test.ts` | Behawioralne report/reducer badania, malformed/stale odrzucanie dowodów |
| Modyfikuj `.github/workflows/ci.yml` | Zachować istniejącą pracę; przesłać nowy raport i wszystkie dowody niepowodzenia |
| Modyfikuj `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs` | Nowy moduł gate/reveal/transfer/resume, asercje pakietowe i offline |
| Modyfikuj `src/content/runtime-allocation-integration.test.ts` | Aktualizacja globalnych twierdzeń liczbowych do katalogu docelowego, zachowanie kontroli przydziału |
| Modyfikuj `README.md`, `docs/{advanced-curriculum,requirements-audit,progress,verification,ci-cd}.md` | Szczery zakres, polecenia, liczby i świeże dowody weryfikacji |

## Zadanie 1 — kontrakty zadań i niezależne oceny

**Spożycie:** istniejących `Lesson`, `Concept`, `Competency`, `CourseModule` umów i wzoru lekcji umów majątkowych. **Produkcja:** `fuzzEvidenceModule`, `fuzzEvidenceLessons`,
`fuzzEvidenceConcepts`, `fuzzEvidenceCompetencies`, `fuzzEvidenceSources`, `fuzzEvidenceReviewExercises`; osiem gate/blank alternatyw i cztery urządzenia do pobierania.

- [ ] Dodać niezadowalające twierdzenia integracyjne dla dokładnej czterech lekcji IDs,
      warunków wstępnych, czterech powiązanych z koncepcją zwrotów i ośmiu odniesień do
      zadań. Korzystanie z istniejących wspomagających walidację treści zamiast
      twierdzeń strun źródłowych.
- [ ] Zdefiniować interfejsy Ruste odniesienia w urządzeniach do oceny, w tym `decode_case(&[u8]) -> Option<Case<'_>>`,
      dokładne porównanie wyników, `choose_witness(original, candidates, observations)` i `classify_report(report)`. `Case` jest właścicielem zapytania o losy i
      pożycza ciało; jego żywotność pochodzi z wejścia. Dla lekcji ćwiczenia korzystać z
      skończonych obserwacji, nigdy nie uruchomić podproces.
- [ ] Napisz testy semantyczne z surowym `[0xff]` korpusem, nagłówkami 0/1/2-byte, zakodowanymi
      zapytaniami multibajtowymi, duplikatami wierszy, niezrównanymi liczbami,
      zmienionymi klasami błędów, nietrwałym hashem, brakiem oprzyrządowania, czasowym
      uruchomieniem i raportem tylko do powtórzenia. Przed oceną jakiegokolwiek mutanta
      należy podać prawidłowy roztwór.
- [ ] Dodać pozytywny punkt odniesienia każdej lekcji i wszystkie wymagane błędy w
      tabeli lekcji; uruchomić `npx vitest run src/content/fuzz-evidence-assessment.test.ts` i ustanowić RED/GREEN dowodów. Mutant odrzucony przez błąd
      składni nie jest dowodem na wrażliwość wyroczni.
- [ ] Autor i rejestruje cztery polskie lekcje, oddzielne blanks/retrievals i relacje źródłowe.
      Postępuj zgodnie z istniejącymi opóźnionymi zasadami pobierania; nie dodawaj
      nowego schematu postępu.
- [ ] Uruchom `npm run typecheck`, dwa nowe testy skoncentrowane i `npm run content:check`; potwierdź liczbę celów i bez
      cyklu graficznego.

Przykład wyroczni testowej dla pierwszego osprzętu (przystosować się do deklarowanej
uprzęży):

```rust
let bytes = [0, 0, 1, b'x', 0xff];
let case = decode_case(&bytes).expect("framed input");
assert_eq!(case.query, "x");
assert_eq!(case.body, &[0xff]);
assert!(decode_case(&[0, 0]).is_none());
```

## Zadanie 2 — rozszerzenie rzeczywistego pakietu Mini grep o odtwarzanie przypadków

**Spożycie:** Istniejący generator archiwów, funkcje produkcji Mini grep i niezależna wyrocznia. **Produkcja:**
wspólny adapter kontrolny `Case` / `FailureKind`, stały regresja, testy na stabilną powtórkę i FUZZ
manifest/documentation.

- [ ] Dodaj nieudane testy archiwalne sprawdzające obecność wszystkich siedmiu nowych
      plików, dokładne bajty nasion, brak zależności czasu pracy i oba warianty
      archiwum. Upewnij się, że pakiet ujawnia odniesienia wzrost z czterech do ośmiu
      bram głównych; niezależne blanks/retrievals są nieobecne.
- [ ] Wyciągnij logikę istniejącego celu decoder/check do współdzielonych plików wsparcia,
      utrzymując wyrocznię niezmienioną i niezależną. Cel dostosowuje `SelectionMismatch` do istniejącej
      tożsamości twierdzenia; nie może on połykać `Err` wartości.
- [ ] Dodać stabilne testy regresji sprawdzające `(1, "ax", true)` dla świadka stałego; zachować
      niepoprawny surowiec UTF-8, NUL, CRLF, puste wejście, krótkie kadrowanie,
      nieprawidłowe query/context i duplikaty wyniku.
- [ ] Weryfikacja stałych zestawów mutantów substring-to-prefix i nie udaje się o nazwie
      stabilnej regresji, jednocześnie przywracając oryginalne przejścia. Utrzymywać
      mutacje izolowane w czasowym wyjściu weryfikatora, nigdy nie edytować
      zameldowanych strun Rusta podczas testu.
- [ ] Regenerować starter/solution archiwa i weryfikować istniejące semantyki niesprawności
      rozruchowej. Dokumentuj lokalną powtórkę i kampanię oddzielnie w instrukcjach
      dotyczących pakietów.
- [ ] Uruchom Mini grep pakiet Vitest, `npm run content:cargo` na stabilnej i obsługiwanej istniejącej ścieżce
      archiwum MSRV. Dokładna rust 1.85.0 musi uruchomić nowe stabilne testy powtórki; nie
      zastępować nocami.

## Zadanie 3 — rygorystyczne raporty z kampanii, minimalizacji i odtwarzania

**Spożycie:** Task 2 authorised archive and fixed regression; existing `verifyFuzzResult` process classification.
**Produkcja:** `test-results/mini-grep-fuzz/run-*/report.json`, świeże kłody, korpus, oryginalne i zredukowane artefakty; niezerowe wyjście
przy nieudanej lub nieobsługiwanej weryfikacji.

Utrzymywać `content:fuzz` CLI przyjmując jedynie fakultatywne `--fetch`. Nie dodawać ścieżek ani
arbitralnych flag target/seed/toolchain. Porównaj oba podane ZIPs z generatorem przed wykonaniem, zachowaj
pliki blokujące bajt-for-byte, usuń cargo/rustc/rustdoc z przypinanego łańcucha narzędzi i utrzymuj
istniejące limity podprocesu.

Schemat sprawozdania musi zawierać `schemaVersion: 1`, niepowtarzalny `runId`, `archiveSha256`, `manifestSha256`, cel, narzędzie
versions/host, granice, status kampanii referencyjnej i obserwowane egzekucje, tożsamość mutantów,
original/reduced hasze i rozmiary artefakt, próba redukcji count/status, status regeneracji mutanta i
przywrócenia statusu mutanta, stabilną tożsamość regresji, błędy fazowe i wyraźne
ograniczenia. Przechowuj surowe dzienniki niezależnie; pola raportowania są extracted/verified
obserwacjami, nigdy nie zakodowane wartości sukcesu. Dołącz status `passed`, `failed` lub `infrastructure`;
zapisz częściowe raporty w `finally` i nigdy nie nadpisz ich jako przekazane po błędzie.

- [ ] Dodać nieskuteczne report/reducer badania z funkcją wtryskiwanego podprocesu. Odrzucenie
      brakujących pól, nieznany schemat, powtórka maskaradująca jako kampania, mieszany
      bieg IDs, niedopasowanie haszu, błędne twierdzenie, zero-długi świadek, błąd
      kompilacji, timeout i stara ścieżka artefaktu.
- [ ] Należy zachować limity kampanii referencyjnej: materiał siewny 20260913, maksimum
      20000 biegów lub 30 sekund, wejście < = 4096 bajtów, timeout 3 sekundy i RSS limit
      1024 MB; należy wymagać co najmniej istniejących 1000 obserwowanych przebiegów
      wraz z oprzyrządowaniem i normalnym zakończeniem. Niewspierany łańcuch narzędzi to
      awaria infrastruktury.
- [ ] Uruchom istniejącą stałą mutację i wymagają rzeczywistego świeżego artefaktu plus
      oczekiwanego instrumentowanego twierdzenia, a następnie powtórz oryginalny
      artefakt przeciwko jeszcze zmutowanej binarnej przed redukcją.
- [ ] Uruchom ograniczonego reduktora w stosunku do tego samego mutanta; rekord
      kandydata przewidywać wyniki. Wymagają celowo wyściełane autorski świadek kurczyć
      ściśle przy zachowaniu `SelectionMismatch`; nie wymaga się ścisłego psychiatry dla już mały nowo
      odkryty wypadek. Zarówno oryginalne, jak i przyjęte zredukowane artefakty muszą
      powtórzyć z tą dokładną porażką.
- [ ] Przywrócenie odniesienia w `finally`, odbudowa i powtórzenie oryginału plus zredukowane
      artefakty pomyślnie. Stabilna regresja potwierdza zameldowanie świadka oddzielnie
      w dniu stable/MSRV; nie twierdzisz, że wygenerowany wypadek jest automatycznie sprawdzany.
- [ ] Napisz raport i zachowaj diagnostics/corpus/artifacts na temat sukcesu lub porażki. Badanie, czy wykonanie
      nieregularnego dziennika lub tylko kompilowanie binarnego nie może spełniać żadnej
      fazy replay/campaign.
- [ ] Uruchom `npx vitest run src/content/fuzz-result.test.ts src/content/fuzz-evidence-verification.test.ts` to `npm run content:fuzz -- --fetch` w obsługiwanym środowisku nocnym / C + +.

Przykład przyjęcia jednostek redukcyjnych: przy zastosowaniu oryginalnych bajtów `ABCDE` i
wtryskiwanego przewidywania rzeczywistego tylko dla `BC`, `ABC`, `BCD`, `ABCD`, `BCDE` oraz `ABCDE`,
wyjście musi być krótsze, zachowywać porządek bajtów i spełniać przewidywanie. Z
przewidywanym, że raporty timeout dla każdego krótszego kandydata, zwrócić niezmienione
bajty plus wynik redukcji nie-sukces; nigdy nie traktować timeout jako odtworzone
znalezienie.

## Zadanie 4 — integracja CI i weryfikacja rzeczywistej ścieżki uczestnika

**Spożycie:** zarejestrowany moduł, zaktualizowane archiwa i ścisłe sprawozdanie weryfikatora. **Produkcja:**
powtarzalne CI artefakty plus browser/offline dowody w badaniu PR SHA.

- [ ] Rozszerzenie istniejącego `mini-grep-fuzz` praca, zachowanie przypinanych działań, przypięte
      nocami, istniejący katalog poleceń instalacji i raportów. Wysyłanie `report.json`, logi,
      korpus i artefakty z `if: always()` i 7-dniowa retencja. Nie dodawaj wykonania sieciowego do
      Vitest.
- [ ] Zapewnienie stabilnej i workspace-msrv Kontrola ładunków uruchomić nowe testy
      regresji; zachować istniejące property/fuzz/Miri/profile/allocation miejsc pracy. Nie `continue-on-error` dla wymaganych dowodów.
- [ ] Dodaj scenariusz przeglądarkowy. Wyszukaj moduł po polsku i otwórz zadanie o domenie. Zapisz przewidywanie i zasymuluj pozytywną odpowiedź wykonawcy. Ujawnij archiwum, rozwiąż odrębne zadanie od pustego edytora, zapisz szkic i notatkę, a po przeładowaniu wróć do dokładnie tego samego kroku. Sprawdź, że zaliczenie głównego zadania z pomocą nie potwierdza samodzielnego opanowania.
- [ ] Sprawdź Tab, Shift+Tab i istniejący przełącznik edytora. Asercja ma wykrywać nieoczekiwane błędy konsoli i strony. Oznacz symulowane wykonanie jako weryfikację interfejsu i rejestrowania dowodów.

- [ ] Rozszerzenie weryfikacji offline z nieodwiedzaną lekcją fuzz po początkowym cache,
      dokładne puste draft/note wznawiać i bajt równości dla zarówno zaktualizowane Mini grep ZIPs.
      Ponownie wykorzystać rzeczywistą budowę produkcji.
- [ ] Uruchom ukierunkowane testy przeglądarek, a następnie produkcji E2E bez powtórzeń
      i offline w środowisku, które pozwala na pętlę. W przypadku odmownego
      wykorzystania lokalnych luk, należy użyć CI dowodów, zamiast raportowania
      wykonanych testów.

## Zadanie 5 — aktualizacja dokumentacji i zamknięcie PR na podstawie wyników pomiarów

- [ ] Aktualizuj bieżące asercje liczenia i sześć plików dokumentacyjnych z
      rzeczywistego wyjścia walidatora. Zachować historyczne migawki z datami; nie
      przepisywać wcześniejszych działa jako nowe wyniki.
- [ ] Prawidłowa czerstwa `docs/progress.md` język mówiący "capstone" pozostaje do zbudowania, a
      licznik przydziału czasu startowego pozostaje całkowicie nieobecny. Poprawione
      bieżące portfolio/roadmap komórek w `advanced-curriculum.md`, które nadal wymieniają wdrożony licznik zgodnie z
      planem. Należy zachować szersze RSS, próg niezależny od platformy i ograniczenia
      dotyczące uwalniania kaczek.
- [ ] Opisz ten kamień milowy jako ograniczony cykl życia fuzz, nie ukończenie pełnego
      property/fuzz programu nauczania lub dowód nieobecności błędów. Stan, który dokładnie
      regresja toczyła się w dniu stable/MSRV i która kampania toczyła się nocą.
- [ ] Zapisuje rzeczywiste SHA, środowisko, polecenia, obserwowane liczby testów,
      lokalizacje artifact/report, wyniki reduktora i ograniczenia w `docs/verification.md`. Nigdy nie wymyślaj wyników
      z tego planu.
- [ ] Biegnij! `npm run lint`, `npm run typecheck`, `npm test`, `npm run content:check`, `npm run content:rust`, `npm run content:property -- --fetch`, `npm run content:fuzz -- --fetch`, `npm run content:audit`, `npm run build`, produkcja E2E/offline oraz istotne
      stable/MSRV kontrole przesyłek. Istniejące wymagane CI musi przejść; ponownie uruchomić
      tylko dotknięte awarii po poprawek.
- [ ] Uruchom `git diff --check`, przeglądaj implementację pod kątem każdego warunku akceptacji
      poniżej, a następnie commit/open jeden PR zgodnie z autoryzowanym strumieniem pracy
      wykonania. To samo zadanie planowania zmienia tylko ten dokument i nie zobowiązuje
      się.

## Kryteria akceptacji

1. Dokładny katalog docelowy jest walidowany; cztery nowe koncepcje każdy posiada
   pierwotne, prawdziwie niezależne puste i odzyskiwanie dowodów.
2. Każde prawidłowe odniesienie przechodzi; każdy nazwany błąd oceny jest odrzucany
   semantycznie. Reveal/download nie może przyznawać niezależnych dowodów.
3. Oba regenerowane Mini grep ZIPs mecz obsługiwany przez bajty; istniejąca tożsamość pakietu,
   stary postęp i granica zależności od czasu niebiegania pozostają nienaruszone.
4. Dzielone uprząż zachowuje udokumentowaną domenę surowego ciała; niezależna wyrocznia
   sprawdza pełne uporządkowane wyniki i klasy błędów.
5. Stała regresja przechodzi na stabilną i dokładną Rust 1.85.0; kontrolowana zmutowana
   kompilacja i jest odrzucona przez regresję.
6. Oprzyrządowana kampania kończy się w określonych granicach; zmutowane produces/replays zamierzone
   świeże odkrycie; ograniczony reduktor zachowuje klasę awarii i zmniejsza wyściełanego
   świadka; przywrócone referencje z powodzeniem powtarza obu świadków.
7. Sprawozdanie walidatora odrzuca wadliwe, przestarzałe, niekompletne i
   infrastrukturalne dowody; nowy raport z pochodzeniem i surową diagnostyką jest
   przesyłany przez CI.
8. Produkcja UI i przepływ offline przechodzi na biegacza zdolnego do pętli bez
   nieoczekiwanych błędów konsoli, zachowując drafts/notes i niezależne zasady mastery.
9. Wymagany CI jest zielony dla dokładnej PR głowy i dokumentów weryfikacji rozróżnia
   symulacje przeglądarki, stabilne testy, nocna kampania i niezweryfikowane szersze
   twierdzenia.
10. Release pozostaje Hold i ludzkiego pilota, niebezpieczne variance/dyn szerokości, live
    independence assurance, publication and production operations pozostają wymienione
    jako otwarte.

## Ryzyka i sposoby ich ograniczania

- **Zakres rozszerza się na ogólną platformę fuzz:** zachowuje jeden istniejący cel i jeden znany mutant produkcyjny; tylko celowo
  ograniczony reduktor delecji jest nową maszyną.
- **Dekoder refactor zmienia testowaną domenę:** Testy adaptera na poziomie bajtów i istniejące testy wyroczni muszą przejść przed
  aktualizacją celu; należy wyraźnie zachować istniejące rozróżnienie query-lossy/body-raw.
- **Losowość wytwarza niewyraźne dowody:** utrzymywać materiał siewny i budżet kampanii, stosować regresję rejestrowaną i
  determinacyjną redukcję dla wymaganych kontroli negatywnych; nigdy nie potwierdzać
  dokładnego pokrycia lub odkrytych zawartości korpusu.
- **Nightly diagnostics drift:** Śruby i charakterystyczna dla danego urządzenia identyfikacja awarii oraz testy
  parsera; dryfowanie to awaria infrastruktury, a nie błąd uczącego się.
- **Oracle dzieli błąd produkcji:** akcji tylko uprzęży hydraulicznych, a nie algorytmu wyboru; zachować niezależną
  distance/mask wyrocznię i pełną wyjściową czułość mutantów.
- **Nowe źródło IDs nadmuchiwanie:** Liczby źródeł pochodzą z walidatorów, deduplikatów tylko jako istotne dla tego
  modułu.
- **Stabilna awaria pomylona z nocnym pokryciem:** rekordowy łańcuch narzędzi na fazę; uruchomić stabilną regresję oddzielnie na 1.85.0.
- **Automatyczne kontrole mylą się z uczeniem się dowodów:** wyraźnie pozostawia pilota otwartą; nie zastrzega się starszeństwa ani mistrzostwa
  od CI.

## Źródła pierwotne sprawdzone na etapie planowania

[Rust Fuzz Przewodnik książki](https://rust-fuzz.github.io/book/cargo-fuzz/guide.html) opisuje wykonanie celu i przechodzące opcje libFuzzer. Dokumenty [LLVM Odniesienie do libFuzzer](https://llvm.org/docs/LibFuzzer.html) ograniczone
wykonanie, korpus i powtórne zachowanie. Te odniesienia wspierają mechanikę narzędzi, a
nie twierdzenie, że krótka kampania dowodzi poprawności. Recheck istotne zachowanie
przypięte narzędzia podczas wdrażania; dokładny pakiet i źródło weryfikatora pozostają
podstawą dla tego kamienia milowego.
