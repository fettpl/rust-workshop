# Poprawność pożyczania pamięci w kodzie unsafe — plan wdrożenia

[English](2026-09-20-unsafe-borrowed-memory-soundness.md)

> Agenci wdrażają plan zadanie po zadaniu w trybie superpowers:subagent-driven-development (zalecany) lub superpowers:executing-plans. Do rejestrowania postępów służy składnia `- [ ]`.

**Cel.** Dodaj ograniczony etap kursu Rust z wykonywalnymi przykładami do przeglądu poprawności abstrakcji operujących na pożyczonej pamięci za pomocą unsafe. Odrębne dowody pochodzą z kompilacji, wykonania i Miri. Określ, co dokładnie potwierdza każdy dowód.

**Architektura.** Dodaj cztery lekcje po `unsafe-miri-contracts`. Przeglądarka ocenia autorskie kontrakty Rust z biblioteką standardową w istniejącym izolowanym wykonawcy i nie uruchamia unsafe pochodzącego od uczestnika ani z importu. Weryfikator kompiluje wyłącznie zapisane w repozytorium dane testowe na wersji stabilnej i Rust 1.85.0. Uruchamia wskazane bezpieczne testy oraz sprawdza celowe odrzucenia przy kompilacji. Przypięty nightly z Miri służy wyłącznie izolowanym autorskim przypadkom opiekunów. Rozwiązania wzorcowe i równoważne muszą przejść, a przypadki negatywne muszą zgłosić wskazaną diagnostykę. Użyj istniejącego schematu v3, silnika dowodów, zasad raportowania Miri i stanu wydania Hold.

**Technologie.** Model treści TypeScript, Vitest, Playwright, weryfikator procesów potomnych Node, Rust 2024, wersja stabilna i dokładnie Rust 1.85.0, Miri na przypiętym nightly-2026-08-08, rustfmt i Clippy.

**Specyfikacja.** Otwarte zagadnienia wariancji i poprawności abstrakcji unsafe w `docs/advanced-curriculum.md`, a także `docs/requirements-audit.md`, `docs/verification.md`, `docs/superpowers/plans/2026-09-13-borrowed-callbacks.md` i `docs/superpowers/plans/2026-09-17-gat-lending-iterators.md`.

## Ograniczenia globalne

- Zachować `schemaVersion: 3`, każdy istniejący lesson/concept/project ID, projekty, notatki, mistrzowskie semantyki,
  ujawnić politykę i opóźnione zachowanie odzyskiwania.
- Wszystkie lekcje skierowane ku uczniom, wskazówki, wyjaśnienia, wybory i opinie są
  polskie. README, pola wyjściowe weryfikatora, CI nazwy, sprawozdania, zobowiązania i ten
  plan są angielskie.
- Zachowaj Rust 1.85.0 jako minimalną obsługiwaną wersję stabilną. Przypiętej wersji nightly używa się tylko do
  opraw Miri i nigdy nie jest zgłaszana jako wynik MSRV.
- Wykonaj tylko autorskie źródło oprawy w lokalnej i CI weryfikacji opiekunów. Nigdy
  nie należy przekazywać weryfikatorowi tekstu uczącego się, importowanych plików,
  arbitralnych ścieżek lub arbitralnych łańcuchów narzędzi.
- Biegacz przeglądarki pozostaje jednym plikiem i jest bezpieczny dla podpisanych
  kontraktów. Nie dodawaj ścieżki do budowania wielu plików, która nie jest bezpieczna,
  FFI biegacza ani wieloplikowego ucznia.
- Każda niebezpieczna operacja ma pisemny warunek bezpieczeństwa i warunek wstępny
  rozmówcy. A `#[allow(unsafe_code)]`, typ znacznika lub tylko przechodząca kompilacja nie jest dowodem na
  solidność.
- Kompil błędów, Miri ustawić błędy, timeout, brak diagnostyki, i niekompletne raporty
  fazowe są infrastrukturą lub nieudane dowody; nigdy nie zaliczają się jako skuteczne
  odrzucenie mutantów lub kampanii zielonej.
- Nie wykonuj UB celowo w przeglądarce, w stabilnym weryfikatorze lub w pakiecie
  uczącym się. Miri może interpretować wyłącznie izolowane, zameldowane uchwyty
  opiekuna: canonical/equivalent uchwyty dodatnie, które muszą przejść i nazwane ujemne urządzenia,
  których przewidywana diagnostyka i tożsamość są przytwierdzone.
- Brak nowej zależności produkcji, publicznego API wniosku o zgodność z rynkiem
  wewnętrznym, FFI oświadczenia o zaufaniu, uniwersalnego oświadczenia o bezpieczeństwie
  pamięci, wniosku o wykonanie lub oświadczenia o gotowości zawodowej.
- Zachować status wydania `Hold`; ten kamień milowy nie zastępuje advisory/license przeglądu, ludzkiego
  pilota lub kompletnego dowodu na model pamięci Rust.
- Model routing jest ustalony: GPT-6 -Astra medium posiada planowanie i przegląd
  jakościowy; GPT-5 .6-Luna High posiada implementację, testy, dokumentację i operacje
  Git. Oddzielna brama przeglądu dźwiękoszczelności musi przejść zanim zwykła brama
  akceptacji może być zielona.
- Ostateczny rekord akceptacji musi podać dokładną nazwę głowy SHA i pokazać zieloną
  dokładną głowę CI dla zawartości, stable/MSRV, Miri, E2E oraz kontrole dokumentacji; wynik
  branżowy-lokalny lub poprzedni SHA jest niewystarczający.
- Przed zmianą kodu aplikacji należy przeczytać odpowiedni `AGENTS.md` i stosowny następny
  przewodnik. Plan ten dodaje treści i ścieżki weryfikacji; nie wymaga zmiany trasy lub
  biegacza.

## Zakres i decyzje

Kamień milowy zamyka wyraźną lukę między praktycznymi ćwiczeniami w zakresie wskaźnika
surowego / `MaybeUninit` a przeglądem niebezpiecznej abstrakcji pamięci pożyczonej jako całości.
Nie powtarza on istniejących `unsafe-ffi-contracts` prac C ABI/RAII lub istniejących `unsafe-miri-contracts` `ByteView`, `Slot<T>` i prostych
umów rozłączonych. Nowe kontrakty używają różnych nazw, kształtów danych i trybów
awarii.

Moduł posiada dokładnie cztery zamówione lekcje, osiem podstawowych bram kodowania (dwie
na lekcję), cztery `evidenceGate` ślepaki, cztery niezależne recenzje oceniane kodem i cztery
zadania przywracania lekcji lokalnych. Dwanaście bramek dowodowych IDs ustala się w
następujący sposób:

| lekcja ID | brama pierwotna IDs | puste ID | przegląd ID | Przywołanie ID |
| --- | --- | --- | --- | --- |
| `unsafe-borrowed-provenance` | `unsafe-borrowed-provenance-boundary-gate`, `unsafe-borrowed-provenance-soundness-gate` | `unsafe-borrowed-provenance-blank` | `unsafe-borrowed-provenance-review` | `unsafe-borrowed-provenance-recall` |
| `unsafe-borrowed-reborrow` | `unsafe-borrowed-reborrow-boundary-gate`, `unsafe-borrowed-reborrow-soundness-gate` | `unsafe-borrowed-reborrow-blank` | `unsafe-borrowed-reborrow-review` | `unsafe-borrowed-reborrow-recall` |
| `unsafe-borrowed-slot` | `unsafe-borrowed-slot-boundary-gate`, `unsafe-borrowed-slot-soundness-gate` | `unsafe-borrowed-slot-blank` | `unsafe-borrowed-slot-review` | `unsafe-borrowed-slot-recall` |
| `unsafe-borrowed-auto-traits` | `unsafe-borrowed-auto-traits-boundary-gate`, `unsafe-borrowed-auto-traits-soundness-gate` | `unsafe-borrowed-auto-traits-blank` | `unsafe-borrowed-auto-traits-review` | `unsafe-borrowed-auto-traits-recall` |

Ośmiu pierwotnych IDs i czterech ślepych IDs ustawionych `evidenceGate: true`; przeglądów i odwołań IDs
ustawionych `evidenceGate: false` lub pominiętych. `CourseModule.gateCriteria` posiada dwanaście odrębnych wymaganych kryteriów,
jeden na bramkę dowodową ID: granica, stabilność i pustka są oddzielnymi kryteriami z
dokładnym jednym zwykłym `taskRefs` wpisem. Jest to wymagane, ponieważ `moduleGate` traktuje wielokrotne
refs w ramach jednego kryterium jako alternatywę; nie stosuje się `supplementaryStepRefs` do badań ślepych.
Nie zastępuje się żadnego zadania generowanego lub niepowiązanego. Niezależna brama
opiekuna jest nazwana `unsafe-borrowed-memory-soundness-review`; jest to raczej brama review/CI niż zadanie uczące się i jest
wyłączona z dwunastu bram dowodowych uczących się. Ujawnione pierwotne nie może
zaspokoić swoich pustych, wycofanych lub recenzji. Każde zadanie ma odrębną autorkę i
przynajmniej jeden kompilujący mutant semantyczny, którego ukryte testy odrzucają.

Cztery kontrakty to:

1. **Przywilej i granica życia.** Kontrakt z przeglądarką, która jest bezpieczna dla osób uczących się, wynosi `BorrowedBytes<'owner>::from_slice(owner: &'owner [u8]) -> BorrowedBytes<'owner>`
   i `BorrowedBytes::reborrow<'short>(&'short self) -> BorrowedBytes<'short>`; konstruktor wiąże widok z rzeczywistym właścicielem i nie może wytwarzać
   życia. Surowy osprzęt tylko dla opiekuna oddzielnie eksponuje `unsafe fn from_raw_parts_unchecked<'a>(raw: *const u8, len: usize) -> Option<RawBorrowed<'a>>`. Dla każdego
   niepustego widoku surowego, dzwoniący musi zapewnić jeden przydział kopii zapasowych
   na żywo, zachować go inicjalizowany, wyrównany, nie aliasing, i ważny dla całego `'a`,
   udowodnić `len <= isize::MAX`, i udowodnić, że zakres bajtów nie zawija; `len == 0` może używać tylko null
   jako wyraźnego pustego reprezentowania bez zakresu odniesienia. Są to obowiązki
   rozmówcy, ponieważ surowa funkcja nie może potwierdzić arbitralnego życia. Surowa
   funkcja nigdy nie pojawia się w kodzie startowym ucznia lub wykonaniu przeglądarki.
   Testy wykorzystują prawidłowe lokalne przydziały, pusty widok zerowy, wielobajtowe
   długości bajtów oraz awaryjną ucieczkę w ciągu całego życia, której celem jest
   jedynie bezpieczne `from_slice`, nigdy nie są arbitralne surowe `'a`.
2. **Mutable ponownie pożyczać, dijointness, i niezmienność.** Umowa o bezpieczeństwie naukowym wynosi `split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>` plus `InvariantBorrow<'owner, T>::from_mut(owner: &'owner mut T) -> InvariantBorrow<'owner, T>` i jest dokładna `reborrow<'short>(&'short mut self) -> InvariantBorrow<'short, T>`.
   Zewnętrzna pożyczka może się skrócić; wewnętrzna `T` pozostaje niezmienna przez `PhantomData<fn(T) -> T>`,
   podczas gdy `PhantomData<&'owner mut T>` posiada związek właściciela i granice właściwości. Oddzielny, surowy
   konstruktor tylko dla opiekunów jest jedyną niebezpieczną granicą. Testy odrzucają
   nakładanie się, `mid > len`, zastępowanie na całe życie i mutant, który pisze w obu
   poglądach.
3. **Inicjalizacja i stan własności.** Kontrakt z przeglądarką, która jest bezpieczna dla osób uczących się, jest `SafeSlot<T>`
   obsługiwany przez `Option<T>` za pomocą `put`, `take` i `drop_initialized` przejścia państwowe; nie zawiera `MaybeUninit` i
   nie zawiera surowego wskaźnika. Urządzenie przeznaczone wyłącznie dla opiekunów
   odzwierciedla tę samą maszynę państwową z `MaybeUninit<T>`, wyraźną `SlotState` i sprawdzoną `unsafe`
   implementacją. `put` jest dozwolone tylko wtedy, gdy pusty, `take` zmienia stan przed
   przesunięciem wartości i spadek następuje dokładnie raz. Testy wykorzystują licznik
   zrzutu nie - `Copy`, lokalny nie - `'static` pożyczać i nie niepoprawny niebezpieczne
   wykonanie poza Miri.
4. **Wariancja Send/Sync granica.** Kontrakt oparty na bezpieczeństwie ucznia `InvariantBorrow<'owner, T>` Tylko przez `from_mut` oraz `reborrow`; brak
   podręcznika `unsafe impl Send` lub `unsafe impl Sync` jest nauczany lub akceptowany. Marker łączy `PhantomData<&'owner mut T>` z niezmiennym
   znacznikiem funkcji wskazującym `PhantomData<fn(T) -> T>`. W mutable-borrow marker zachowuje związek autocecha
   opakowania z `T` podczas gdy znacznik funkcji-wskaźnik sprawia, `T` niezbywalny bez
   uniemożliwienia ważności krótszego właściciela ponownie pożyczać. Klienci opiekunów
   obejmują `assert_send::<InvariantBorrow<'_, u8>>()` oraz `assert_sync::<InvariantBorrow<'_, u8>>()`. A `Cell<u8>` klient może udowodnić `Send` w przypadku pożyczki
   mutalnej posiadanej przez jedną nitkę, ale musi się ona nie powieść `Sync`; obydwa `Send`
   oraz `Sync` klienci korzystający z `Rc<u8>` Musi zawieść. Pozytywny `Send + Sync` klient używa
   mutacji `u8`/`Arc`-free value. Mutant wykorzystujący tylko wyjściowy `PhantomData` albo odrzuca
   się niebezpieczną impel koca. Compile-fail kontroli obejmuje zastąpienie przez całe
   życie, `Cell<u8>` `Sync` związane, i oba `Rc<u8>` Granice.

Publiczność podpowiada tylko bezpieczny konstruktor, dokładny `reborrow` podpis, fields/types,
niezmienne zachowanie i obserwowalne granice. Surowe wskaźniki, `MaybeUninit`, stan niepoprawny,
oraz organy montujące Miri żyją w urządzeniach przeznaczonych wyłącznie dla opiekunów i
nigdy nie są ukrytymi wymaganiami dotyczącymi kodu uczącego się. Ukryte testy mogą
wyegzekwować tylko ogłoszony bezpieczny kontrakt.

### Granica między wykonaniem u uczestnika a weryfikacją przez opiekuna

| Powierzchnia | Dozwolone źródło | Umowy | Wykonanie | Wyniki weryfikacji |
| --- | --- | --- | --- | --- |
| Przeglądarka primary/blank/review | uczenie się-bezpieczne autorskie snippety z referencjami i plasterkami | `from_slice`, `from_mut`, `reborrow`, `split_borrowed`, `SafeSlot`, klienci związani cechami | istniejący oddzielny jednoplikowy biegacz rustykalny; brak wskaźnika surowego lub `MaybeUninit` | niezależne badania i utrzymujące się zdarzenia uczące |
| Stable/MSRV Weryfikator | zameldowanie w bezpiecznych urządzeniach behawioralnych i klientach z niepowodzeniem kompilacji | boundary/state/output zachowanie i nazwa diagnostyki | stabilny plus dokładny 1.85.0 Tylko | canonical/equivalent przejść i bezpieczne mutanty niepowodzeniem |
| Nocny weryfikator Miri | zameldowany opiekun - tylko surowy /`MaybeUninit` osprzęt | wyraźne, niebezpieczne warunki wstępne i nazwy UB kontroli | Przygwożdżony nocą...2026-08-08 Tylko Miri | kanoniczny i równoważny przewód montażowy z dodatnim wynikiem; urządzenia ujemne UB wytwarzają oczekiwaną diagnostykę |

Matryca mocowania jest wyraźna: stabilna i MSRV wykonywać tylko bezpieczne zachowanie i
skompilowane-fail; tylko Miri wykonuje tylko opiekun surowy wskaźnik i `MaybeUninit` uchwyty.
Redukcje Canonical i strukturalnie równoważny dodatni musi przejść, natomiast nazwane
ujemne osprzęt Miri musi produkować ich oczekiwaną diagnostykę.

| rodzina osprzętu | stable/MSRV wymóg | Wymóg w zakresie wartości Miri | odrzucono przykłady mutantów |
| --- | --- | --- | --- |
| provenance/null/range | bezpieczne `from_slice` zachowanie, długość bajtów i błędy graniczne | kanoniczny i równoważny osprzęt surowy | null-for-positive, zakres zawinięty, nieprawidłowa inicjalizacja |
| split/reborrow | bezpieczne rozłączanie plastrów, dokładne `mid` błędy, i życiowych kontroli kompilacji-awarii | surowy aliasa mocowanie produkuje nazwany diagnostyka | nakładanie się na siebie, poza granicami, aliasated survive view |
| stan szczeliny | `SafeSlot` zachowanie stanu i dokładnie raz upuścić | `MaybeUninit` canonical/equivalent Diagnoza przelotu i stanu ujemnego | pominięta inicjalizacja, spadek stanu-skipping, podwójna kropla |
| variance/auto-traits | Bezpieczne niezmienność i `Send` / `Sync` positive/negative klientów | deklarowane canonical/equivalent marker klientów pass; wszelkie surowe granice pozostaje tylko opiekun | zamiennik przez całe życie, marker tylko wyjściowy, niebezpieczny impl koca |

Prawdziwe UB nigdy nie jest sprawą mutantów stable/MSRV. Osprzęt `miri-positive` musi być kompilowany i
przepuszczany zarówno do zastosowania kanonicznego, jak i równoważnego. Osprzęt `miri-negative` musi
skompilować się na tyle daleko, aby uruchomić i zostać odrzucony przez oczekiwaną
diagnostykę; błąd kompilacji, timeout, lub błąd infrastruktury nie jest udanym odkryciem
mutantów.

## Mapa plików

Utwórz:

- `src/content/unsafe-borrowed-memory.ts`: Polskie źródła, koncepcje, kompetencje, moduł, cztery lekcje, osiem bram
  podstawowych, cztery ślepaki, cztery lokalne odwołania oraz cztery niezależne
  ćwiczenia przeglądowe.
- `src/content/unsafe-borrowed-memory-contracts.ts`: autorskie Snippety odniesienia Rust, Uprzęże testowe, przewidywana diagnostyka
  kompilacji-niepowodzenia i odrębne równoważne implementacje. Trzymaj kontrakty Rust
  oddzielnie od prozy lekcji. Korzystanie z publicznych interfejsów `BorrowedBytes`, `split_borrowed`, `SafeSlot`oraz
  `InvariantBorrow`; surowy wyłącznie opiekun /`MaybeUninit` interfejsy są oddzielnym wywozem.
- `src/content/unsafe-borrowed-memory-assessment-fixtures.ts`: urządzenia kanoniczne, równoważne i zmontowane dla każdej testowanej bramy,
  wycofujące się i sprawdzające. Włączcie tożsamość urządzenia, spodziewany status i czy
  wymagane są dowody stabilne lub Miri.
- `src/content/unsafe-borrowed-memory-assessment.test.ts`: compile/run urządzenia kanoniczne i równoważne oraz wymagają, aby każdy zwany mutant
  semantyczny nie spełnił swoich niezależnych twierdzeń; testować kontrole niepowodzenia
  kompilacji według klasy diagnostycznej i tożsamości źródłowej.
- `src/content/unsafe-borrowed-memory-integration.test.ts`: weryfikacja IDs, wstępny wykres, dwanaście kryteriów jednego zadania, cztery
  puste zadania, cztery przeglądy, istotne różnice umowne, niezależność dowodów oraz
  zgodność schematów.
- `scripts/verify-borrowed-memory.ts`: ograniczony stable/MSRV/Miri weryfikator, manifest/hash kontrole, sprawozdanie fazowe oraz dopuszczalna
  lista argumentów o źródłach nieuczących się.
- `src/content/unsafe-borrowed-memory-verification.test.ts`: odrzucenie argumentów weryfikatora, stale/hash/toolchain kontrole, klasyfikacja faz, błąd
  kompilacji w porównaniu z odrzuceniem mutantów, tożsamość urządzenia Miri oraz
  sprawozdanie o spójności.
- `tests/e2e/unsafe-borrowed-memory.spec.ts`: przepływ przeglądarki produkcyjnej obejmujący predykcję, autorski wynik,
  ujawnianie, wspomagane nieniezależne dowody, niezależne puste, niepuste draft/note, ostrość
  klawiatury, błędy konsoli, pobranie, jeśli używane, i dokładne wznowienie.

Modyfikuj:

- `src/content/course.ts`: zarejestrować nowy moduł po `unsafe-miri-contracts` i ujawnić jego źródła, lekcje, koncepcje i
  przeglądy bez zmiany wcześniejszego IDs.
- `scripts/verify-offline.mjs`: dodać jedną wcześniej nieodwiedzaną ścieżkę lekcji dźwiękowości z szkicem,
  granicą hint/reveal, niezależną pustą nutą, nutą, klawiaturą i dokładnym potwierdzeniem
  wznowienia. Użyj semantycznych lokalizatorów kroków i utrzymujących się kontroli
  zdarzeń.
- `package.json`: dodać `content:borrowed-memory` z dopuszczalną listą dla żadnych argumentów, `--msrv` i `--miri` tylko; odrzucić
  `--fetch`, tryby mieszane, ścieżki i arbitralne łańcuchy narzędzi.
- `.github/workflows/ci.yml`: dodać stable/MSRV autorską weryfikację urządzenia i przypięte nocami Miri step/job z
  oddzielnymi artefaktami i wyraźnymi ograniczeniami czasowymi.
- `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md` i `docs/ci-cd.md`: aktualizacja angielskich liczb, zakresu, dokładnych
  dowodów weryfikacji, ograniczeń i wydania Hold po realizacji head jest znany.

Nie modyfikować `src/domain/types.ts`, schematu trwałości lub kompilatora przeglądarki API. Nie dodawać
projektu do pobrania, chyba że późniejsza zatwierdzona specyfikacja wymaga ograniczenia
pakietu; ten kamień milowy jest celowo ograniczony do własnych urządzeń oceny i dowodów
weryfikatora.

## Kryteria akceptacji

Wdrożenie jest możliwe do przyjęcia tylko wtedy, gdy wszystkie bramki poniżej są
prawdziwe i odnotowane w stosunku do dokładnego wdrożenia SHA:

- Weryfikacja zawartości podaje dokładną lekcję, koncepcję, ślad i liczby puste;
  wszystkie nowe IDs są unikatowe, a istniejący wykres pozostaje ważny.
- Każda umowa pierwotna, pusta, odwoławcza i rewizyjna składa się z opublikowanego postu
  i przechodzi testy canonical/equivalent. Każdy wymieniony mutant kompilujący jest wykonywany i odrzucany
  ze względu na nazwaną różnicę semantyczną.
- Oznaczenie pochodzenia odrzuca długość zerową na dodatnią, zakres owinięty, pominięte
  kontrole inicjalizacyjne, nakładające się na siebie mutacje widoki, przeskakiwanie
  przez państwo `Drop`, zastępowanie przez całe życie i wymyślone `Send` / `Sync` twierdzenia.
- Stabilny i dokładny Rust 1.85.0 działa wykonać `rustfmt --check`, `cargo fmt --check` gdzie istnieje uchwyt ładunku,
  `rustc` /Cargo testów, i Clippy z tym samym autorem bajtów. Stable/MSRV wyniki są oddzielone od
  nocnych wyników Miri.
- Niezależna brama dźwiękoszczelności sprawdza bezpieczną konstrukcję, dokładną `reborrow`,
  marker niezmienności, surowe warunki wstępne granic, separację learner/maintainer oraz kompletną
  matrycę klienta `Send` / `Sync` przed przejściem normalnej bramy zawartości.
- Dokładna głowica CI jest zielona dla tego samego SHA w całej stabilnej, dokładnej 1.85.0
  MSRV, przypinany Miri, browser/offline E2E, treść i prace dokumentacyjne; wcześniej udane SHA nie
  może zaspokoić tej bramy.
- Miri prowadzi jedynie urządzenia zameldowane `miri-positive` i `miri-negative`. Uchwyty kanoniczne i
  równoważne muszą przejść; uchwyty ujemne muszą wytwarzać oczekiwaną tożsamość
  diagnostyczną. Weryfikator rejestruje łańcuch narzędzi, hasz źródłowy, hasz mocujący,
  status fazy i ograniczenia. Brak komponentu Miri lub timeout jest infrastruktura, nie
  przejść.
- Weryfikator odrzuca arbitralne argumenty, skąpy source/fixture hasza, mieszane tożsamości, błędne
  łańcuchy narzędzi, brakujące błędy fazowe, błędy kompilacji błędnie zgłoszone jako
  odkrycie mutantów, a także informuje, że oświadczenie `passed` przed zakończeniem każdej
  wymaganej fazy kończy się.
- Test E2E udowadnia, że reveal/help nie może stworzyć niezależnego opanowania, a następnie
  udowodni, że świeże niezależne pudło może nagrać niepusty szkic i notatkę i wznowić
  dokładnie po ponownym załadowaniu. Asercje błędów klawiatury i konsoli pozostają
  aktywne.
- Weryfikacja offline obejmuje tę samą ścieżkę lekcji dźwiękoszczelności i zachowuje
  zachowanie archive/cache; jeżeli chrom jest niedostępny lokalnie, podaje się ograniczenie i CI
  wymagane są dowody.
- `npm test`, skoncentrowane assessment/integration/verifier testy, typecheck, lint, content check/audit, build, E2E/offline, Rust checks,
  CI YAML parsing i `git diff --check` są prowadzone. Wszelkie EPERM, timeout, brakujący łańcuch
  narzędzi, Miri, lub ograniczenia sieci ładunku rejestruje się bez osłabiania
  oceniających.
- Dokumentacja określa dokładną głowę SHA i wyniki obserwacji. Nie twierdzi, że jest to
  całkowicie niebezpieczne dla zdrowia, brak UB, uniwersalne pokrycie Miri lub gotowość
  do uwolnienia.

## Zadanie 1 — publiczne kontrakty poprawności

**Pliki:**

- Utwórz: `src/content/unsafe-borrowed-memory-contracts.ts`
- Utwórz: `src/content/unsafe-borrowed-memory.ts`
- Badanie: `src/content/unsafe-borrowed-memory-integration.test.ts`

**Interfejsy:**

- Produkcja `unsafeBorrowedMemorySources`, `unsafeBorrowedMemoryConcepts`, `unsafeBorrowedMemoryCompetencies`, `unsafeBorrowedMemoryLessons`, `unsafeBorrowedMemoryReviewExercises` i `unsafeBorrowedMemoryModule`.
- Wytwarza wywóz wyposażenia z dokładnymi podpisami dla `BorrowedBytes`, `split_borrowed`, `SafeSlot` i `InvariantBorrow`, plus
  oddzielne wyposażenie wyłącznie dla opiekunów oraz `MaybeUninit`.
- Zużycie istniejących `Lesson`, `Concept`, `CourseModule`, `Source` oraz typów dowodów; nie zmienia tych rodzajów.

- [ ] Wpisz najpierw testy integracyjne dla czterech lekcji IDs, wstępny łańcuch,
      dwanaście `evidenceGate` stopni (osiem bramek pierwotnych i cztery ślepaki), dwanaście wpisów
      jednozadaniowych `gateCriteria`, które wymagają oddzielnie granic i solidności, cztery
      ślepaki bez kodu startowego, cztery przeglądy oceniane kodem oraz unikalne
      odniesienia do zadań.
- [ ] Dodaj cztery polskie lekcje z podpisami i warunkami bezpieczeństwa w sekcji Scope.
      Wyraźnie określić pozytywne i negatywne granice; nie przepisać ciała.
- [ ] Dodaj predykcję, autorską obserwację, wyjaśnienie, dwie testowane bramy, jedną
      pustą, jedną lokalną pamięć, błędne wyobrażenia, wskazówki i project/transfer kontekst dla
      każdej lekcji.
- [ ] Dodać inny kontrakt przeglądu dla każdej lekcji. Recenzje muszą zmienić kształt
      typu lub politykę wywołania; nie mogą być podstawową funkcją ze zmienionymi
      nazwami zmiennych.
- [ ] Zarejestruj moduł po `unsafe-miri-contracts`, zachowaj istniejący moduł IDs i warunki wstępne oraz
      weryfikuj bieżące liczby z katalogu.
- [ ] Przed kontynuowaniem należy uruchomić test integracyjny i walidację zawartości.

## Zadanie 2 — wykonywalne dane testowe i warianty z celowymi błędami

**Pliki:**

- Utwórz: `src/content/unsafe-borrowed-memory-assessment-fixtures.ts`
- Utwórz: `src/content/unsafe-borrowed-memory-assessment.test.ts`
- Modyfikuj: `src/content/unsafe-borrowed-memory-contracts.ts`

**Interfejsy:**

- Każdy eksporter urządzenia `{ id, canonical, equivalent, mutant, tests, mode, expectedDiagnostic? }`.
- `mode` jest jednym z `safe-behavior`, `compile-fail`, `miri-positive` lub `miri-negative`; `safe-behavior` i `compile-fail` działa na stabilnym i dokładnym
  1.85.0, podczas gdy oba tryby Miri działają tylko w nocy. `miri-positive` wymaga kanonicznego i
  równorzędnego sukcesu; `miri-negative` wymaga nazwy oczekiwanej diagnostyki. Uchwyt nie może po
  cichu zmieniać trybu.
- Ukryte testy porównują pełne zwrotne slices/state przejścia i dokładne klasy błędów, a nie
  struny źródłowe lub `assert!(true)`.

Minimalna macierz wykonywalna to:

| przypadek | Autorskie wykonanie | oczekiwany wynik |
| --- | --- | --- |
| kanoniczne zachowanie bezpieczne | stabilny i dokładny 1.85.0 | pass |
| równoważne bezpieczne zachowanie | stabilny i dokładny 1.85.0 | pass |
| bezpieczny mutant semantyczny | stabilny i dokładny 1.85.0 | Nazwa twierdzenia nie udaje się |
| canonical/equivalent surowe lub `MaybeUninit` | Wieczorem...2026-08-08 Miri (`miri-positive`) | pass |
| Nazwa UB mutant | Wieczorem...2026-08-08 Miri (`miri-negative`) | spodziewana diagnostyka |
| klient kompilacji-fail | stabilny i dokładny 1.85.0 | spodziewana rodzina diagnostyczna |

Matryca zabrania traktowania stabilnego błędu kompilacji, timeout lub niezwiązanego z
tym testu jako pomyślnego odrzucenia semantycznego; nazwany test musi wykonać i nie
wykonać dla określonego mutanta.

- [ ] Napisz jeden nieudany test na mutanta semantycznego: dodatnia obsługa zerowa,
      przepełnienie zakresu, pominięta inicjalizacja, pokrywanie się, podzielona poza
      granicami, spadek skakania stanu, zmienność żywotności i wyciek autoparametru.
- [ ] Dodać co najmniej jeden`Copy` Licznik zrzutu i jeden lokalny nie-`'static` pożyczone
      wartości, aby zapobiec skrótom w zakresie własności.
- [ ] Dodać równoważne implementacje, które różnią się strukturalnie przy zachowaniu
      zamówienia publicznego.
- [ ] Dodać urządzenia do kompilacji-fail dla dożywotniego ucieczki przez bezpieczne `BorrowedBytes::from_slice`
      i nieprawidłowe `Send` / `Sync`; potwierdzić oczekiwaną rodzinę diagnostyczną i odrzucić
      niepowiązane błędy kompilatora. Nie należy używać arbitralnego surowca `'a` w
      utrwaleniu kompilacyjnym przez całe życie.
- [ ] Dodać izolowane `miri-positive` i `miri-negative` uchwyty, których ścieżki, hasze, spodziewane diagnostyki
      (dla negatywów) oraz łańcuch narzędzi są sprawdzane przed wykonaniem. Nie należy
      uruchamiać żadnego z trybów w ramach normalnych testów uczących się.
- [ ] Przeprowadzić test utrwalenia i potwierdzić wszystkie zmutowane kompilacje tam,
      gdzie jest to zamierzone, a nie w odniesieniu do zamierzonego stwierdzenia
      zachowania.

## Zadanie 3 — ograniczony weryfikator i kontrakt raportu

**Pliki:**

- Utwórz: `scripts/verify-borrowed-memory.ts`
- Utwórz: `src/content/unsafe-borrowed-memory-verification.test.ts`
- Modyfikuj: `package.json`, `.github/workflows/ci.yml`

**Interfejsy:**

- CLI nie przyjmuje żadnych argumentów, dokładnie `--msrv` lub dokładnie `--miri`; odrzuca `--fetch`,
  tryby łączone, ścieżki i arbitralne łańcuchy narzędzi. Zawołanie bez argumentów
  prowadzi stabilną, bezpieczną macierz hosta; `--msrv` działa dokładnie w postaci
  bezpiecznej matrycy Rust 1.85.0; `--miri` działa w nocy z przymocowaną matrycą Miri.
- Pola sprawozdania obejmują `schemaVersion`, `runId`, `sourceHashes`, `fixtureHashes`, `toolchain`, `host`, `phaseStatuses`, `phaseErrors`, `compileFailChecks`, `miriChecks`, `artifactPaths`,
  `artifactHashes` i `limitations`.
- Status fazy wynosi `passed`, `failed` lub `infrastructure`; `passed` jest zgodny z prawem tylko wtedy, gdy
  wszystkie wymagane fazy są kompletne i pochodzenie odpowiada aktualnym autorów bajtów.

- [ ] Napisz negatywne testy walidatora dla arbitralnych paths/toolchains, stęchłych haszów
      źródłowych, mieszanych łańcuchów IDs, błędnych stable/nightly łańcuchów narzędzi, brakujących
      diagnostyki Miri, kompilacji błędów jako mutant i przedwczesnych `passed` raportów.
- [ ] Wdrożenie nowego tymczasowego ekstrakcji z autorskiego rejestru urządzeń, zagnieść
      każde źródło przed kompilacją i odrzucić wszelkie served/generated niedopasowanie.
- [ ] Uruchom stabilne i dokładne 1.85.0 formatowanie, kompilacja, testy, i Clippy z
      ograniczonymi timeout procesu i całkowitego budżetu. Utrzymuj stable/MSRV i Miri raportuj
      tożsamości osobno.
- [ ] Uruchomić tylko nazwane `miri-positive` i `miri-negative` binarne z `rustup run nightly-2026-08-08 miri`; wymagać canonical/equivalent pozytywy przejść,
      uchwycić stdout/stderr i tożsamości diagnostycznej dla negatywów, i klasyfikować brakujące
      components/timeouts jako infrastrukturę.
- [ ] Emit JSON nawet w przypadku awarii, zachować błędy fazowe i wyjść niezerowych dla
      nieudanych lub raportów dotyczących infrastruktury. Nigdy nie należy przekształcać
      niekompletnego przebiegu w `passed`.
- [ ] Dodaj skrypt `content:borrowed-memory` i kroki CI z dokładną konfiguracją łańcucha narzędzi, granice
      cache/fetch, przesłane raporty i macierz CLI poniżej:

  | nawoływanie | łańcuch narzędzi i fazy | przyjęte |
  | --- | --- | --- |
  | `content:borrowed-memory` | host stabilne zachowanie bezpieczne, kompilacja-fail i walidacja raportu | tak |
  | `content:borrowed-memory --msrv` | dokładne zachowanie Rust 1.85.0 bezpieczne, kompilacja-fail i walidacja raportu | tak |
  | `content:borrowed-memory --miri` | nocne - 2026-08-08 Miri canonical/equivalent i nazwane ujemnymi mocowaniami | tak |
  | `content:borrowed-memory --fetch` | brak autoryzowanej fazy weryfikatora pozwala na pobranie sieci | nie |
  | `content:borrowed-memory --msrv --miri` | Tożsamość i łańcuch narzędzi mieszanych | nie |
  | `content:borrowed-memory ./path` | arbitralne wejście ścieżki | nie |
- [ ] Uruchom testy jednostek weryfikacyjnych, kontrole argumentów i poprawną operację
      autorską, na którą zezwala lokalny łańcuch narzędzi.

## Zadanie 4 — weryfikacja w przeglądarce i w trybie offline

**Pliki:**

- Utwórz: `tests/e2e/unsafe-borrowed-memory.spec.ts`
- Modyfikuj: `scripts/verify-offline.mjs`

**Interfejsy:**

- E2E odczytuje utrzymujące się `events` i `mastery` od istniejącego IndexedDB państwa; musi
  zidentyfikować nowe zdarzenie wspomagane przez lesson/step i potwierdzić `hints > 0`, `revealed: true` oraz
  niezależne dowody nieprawdziwe.
- Przepływ offline wykorzystuje dokładne lokalizatory stopni semantycznych, nie
  generalne `first()` / `count()` i sprawdza te same utrzymujące się granice.

- [ ] Dodaj scenariusz sprawdzający wersję produkcyjną. Zapisz przewidywanie, zasymuluj powodzenie autorskiego rozwiązania, użyj dwóch podpowiedzi, ujawnij rozwiązanie i sprawdź zapis dostępu przez rozwiązanie lub pobranie.
- [ ] Po ujawnieniu wykonaj nową próbę głównego zadania z pomocą. Sprawdź, że zapisane zdarzenie jest oznaczone jako niesamodzielne i nie zwiększa poziomu niezależnego opanowania.
- [ ] Przejdź do niezależnego zadania z pustym edytorem. Prześlij niepusty szkic przez lokalną atrapę, napisz notatkę, sprawdź fokus klawiatury i przeładuj stronę. Potwierdź dokładny krok i odtworzenie szkicu oraz notatki.

- [ ] Dodaj kolekcję console/page-error i nie powiodło się przy nieoczekiwanych błędach. Zachowaj bajty
      archiwalne i pobierz kontrole tam, gdzie zapewnia je istniejący przepływ.
- [ ] Dodać tę samą lekcję do weryfikatora offline po wcześniej nieodwiedzanej ścieżce
      nawigacyjnej; potwierdzić buforowanie UI, projekt, notatka, hints/reveal stan i dokładne
      wznowienie. Nie uciekaj uczącym się Rustem.
- [ ] Uruchom listę Playwright i komendy docelowe E2E/offline. Jeżeli system macOS Chromium nie
      może uruchomić, należy zapisać dokładny błąd EPERM/bootstrap i pozostawić CI jako bramkę
      czasu startowego.

## Zadanie 5 — integracja dokumentacji, liczebności i rejestru weryfikacji

**Pliki:**

- Zmienić: `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, `docs/ci-cd.md`

**Interfejsy:**

- Dokumentacja określa moduł IDs, lesson/blank/review liczy, komenda weryfikatora, stable/MSRV/nightly rozróżnienie i
  wydanie Hold.
- Rejestry weryfikacji wykorzystują dokładne wdrożenie SHA, uruchomienie IDs,
  obserwowane stany fazowe, łańcuchy narzędzi, source/fixture hash oraz ograniczenia środowiskowe.

- [ ] Aktualizuj angielski README i CI/CD opisów po ustawieniu głowicy implementacyjnej; nie
      umieszczaj polskiej kopii uczącej się w README.
- [ ] Uaktualnienie polskiej prozy curriculum/audit tylko wtedy, gdy wymaga tego konwencja w sprawie
      repozytoriów, zachowując szerszy zakres informacji.
- [ ] Zapisuj dokładne polecenia przejazdu i dokładnie failures/limitations; nie żądaj Miri ani
      kompletnej dźwiękoszczelności, gdy infrastruktura temu zapobiegnie.
- [ ] Przeprowadź kontrolę liczby dokumentacji, `npm run content:check`, `npm run content:audit` i `git diff --check`.

## Zadanie 6 — pełny przegląd akceptacyjny

**Pliki:**

- Test: wszystkie pliki wymienione powyżej i istniejące package/content testy.
- Modify: no source files unless a failed acceptance test identifies a concrete defect.

- [ ] Uruchom skoncentrowany fixture/integration/verifier badania.
- [ ] Uruchom `npm test`, typechell, lint, build, content checks/audit, CI YAML parse, Playwright
      listing, and offline weryfikation.
- [ ] Uruchom stabilne i dokładne 1.85.0 autorskie czeki Rust plus przypięte nocny Miri,
      jeśli jest dostępny; stop ograniczony działa raczej niż pozostawiając proces na
      czas nieokreślony.
- [ ] Przejrzyj różnice w zakresie wykonywania kodu ucznia, arbitrary-path/toolchain akceptacji, osłabionych
      mutantów, przypadkowych ID/schema zmian, liczenie niechlujnych i niepotwierdzonych
      oświadczeń o dobrej kondycji.
- [ ] Wdrożenie commit w języku angielskim tylko po aktualizacji dokładnej dokumentacji
      głowy. Zachowaj "Hold" i zgłoś wszystkie pozostałe obawy.

## Ryzyka i jawne ograniczenia

- Miri wykrywa zachowanie w nazwanych instalacjach tłumacza; nie udowadnia wszystkich
  programów Rust niebezpiecznych lub wszystkich hardware/compiler zachowań. Raporty muszą określać
  tożsamość urządzenia i łańcuch narzędzi.
- Pointer princenance i aliasing zasady są subtelne i ewoluują. Lekcja musi odróżniać
  udokumentowane API warunki wstępne, diagnostykę kompilatora i wzorowane dowody od
  kompletnego twierdzenia modelu pamięci językowej.
- Diagnostyka zespołowa może zmieniać się między stabilną a rustą 1.85.0. Dopasować
  zapowiedzianą rodzinę diagnostyczną i tożsamość źródła, a nie kruchy kompletny zapis
  stderr.
- Miri, rustc, lub konfiguracji Cargo mogą być niedostępne lub wolne na lokalnym
  gospodarzem. Ograniczone awarie infrastrukturalne pozostają widoczne i nie mogą stać
  się zielonymi dowodami.
- Obecny biegacz przeglądarki nie może bezpiecznie wykonywać arbitralnych,
  niebezpiecznych programów uczących się. Jest to celowa granica; autorskie umowy i
  niezależne dowody przeglądarki nie zmieniają go.
- Istniejące `unsafe-ffi-contracts` i `unsafe-miri-contracts` muszą pozostać odrębne. Ponowne użycie ich nazw, testów lub
  funkcji dwuwarunkowych stworzyłoby fałszywą szerokość oceny.
- Brak realizacji z tego planu dowodzi gotowości produkcji, braku nieokreślonego
  zachowania w arbitralnym kodzie, FFI Trust, universal `Send` / `Sync` poprawność lub
  zatwierdzenie wydania.
