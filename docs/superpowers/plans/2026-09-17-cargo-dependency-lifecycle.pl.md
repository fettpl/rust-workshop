# Cykl życia zależności Cargo — plan wdrożenia

[English](2026-09-17-cargo-dependency-lifecycle.md)

> Dla agentów wdrażających plan: użyj superpowers:subagent-driven-development. Pola wyboru służą do śledzenia postępów.

**Cel.** Nauczyć deklaracji zależności, flag funkcjonalności, minimalnej wersji kompilatora i pakietów w czterech niezależnie ocenianych lekcjach TOML oraz zweryfikowanym archiwum Frame Protocol.

**Architektura.** Lokalny adapter TOML z jawnymi limitami ocenia autorskie kontrakty deklaracji. Polityki pojęć rozróżniają dowody z manifestów i kodu Rust, a funkcje pośrednie kursu stosują je na każdej ścieżce interfejsu. Istniejący weryfikator ustalonych archiwów Cargo potwierdza rzeczywiste zachowanie kompilacji i pakowania niezależnie od odpowiedzi uczestnika.

**Stos technologiczny.** Next.js, React, TypeScript, Vitest, Playwright, dokładnie toml-eslint-parser 1.0.3, stabilne Cargo i Rust 1.85.0.

**Specyfikacja.** `docs/superpowers/specs/2026-09-13-cargo-dependency-lifecycle-design.md` zawiera dokładne wspólne interfejsy i kontrakty zadań.

## Ograniczenia globalne

- Pracuj na istniejącej gałęzi `feat/cargo-dependency-lifecycle` i zachowaj niezapisane zmiany dokumentacji z odtwarzania. Baza to `57c24f9` po scaleniu PR #8.
- Materiał dla uczestnika jest po polsku. README, commity i PR są po angielsku. Wystarczą podstawy programowania bez wcześniejszej znajomości Rust.
- Zakres to dokładnie cztery nowe lekcje i pojęcia oraz osiem istniejących identyfikatorów projektów. Nie ustalono miejsca wdrożenia.
- Użyj `toml-eslint-parser@1.0.3` z jawnym TOML 1.0. Zakres wersji Node w projekcie to `^22.13.0 || >=24`.
- Obowiązują pełne sygnatury współdzielonych typów i funkcji ze specyfikacji. Żądania, wyniki i API usługi wykonawczej zachowują dotychczasowe kontrakty.
- Lokalnie uruchamiaj tylko ustalone autorskie przypadki Cargo i Rust. Weryfikacja nie kompiluje kodu ani manifestów uczestnika lub importu, nie publikuje pakietów i nie wysyła żądań POST do działającego Playgrounda.
- Edytuj źródła i dokumentację za pomocą apply_patch. Pliki blokady i zasoby generuj ich właściwymi narzędziami.
- Autorzy używają GPT-5.6-Luna high, a recenzenci GPT-6-Astra xhigh zgodnie z wymaganiami bieżącego celu. Autorzy nie uruchamiają własnych subagentów i nie tworzą commitów. Rozłączne zakresy odpowiedzialności pozwalają pracować równolegle. Opiekun główny odpowiada za commit, PR i scalenie etapu po przejrzanej weryfikacji.
- Podczas iteracji uruchamiaj ukierunkowane testy. Pełną regresję uruchom po ustabilizowaniu integracji. Zachowaj dokładne wyniki w raportach zadań.

### Zadanie 1 — bezpieczne kontrakty manifestu i mechanizm oceny

**Pliki.** Utwórz `src/domain/manifest.ts`, `src/engine/manifest-contract.ts`, `src/engine/manifest-contract.test.ts`. Zmień `src/domain/types.ts`, `src/engine/evaluate.ts`, `src/engine/evaluate.test.ts`, `package.json`, `package-lock.json`.

**Interfejsy.** Dostarcz dokładne typy ManifestContract i asercji oraz trzy funkcje manifestu ze specyfikacji. Dodaj do typów domeny editorMode/editorFile, evidenceArtifact, starterRevealStepRefs oraz ewaluator manifest-contract. To zadanie obejmuje wyłącznie domenę i ewaluator, bez logiki nauki, zapisu, treści, interfejsu i funkcji pomocniczych projektów.

- [x] Dodaj testy, które początkowo nie przechodzą. Sprawdź semantyczną równoważność zależności zapisanych w tabeli, tabeli inline i skróconej formie, wartości domyślne, aliasy i zakresy, dziedziczone flagi, zbiory funkcjonalności, cytowane klucze z kropkami, sprzeczne źródła i strukturę pakietu lub przestrzeni roboczej.

```ts
const contract: ManifestContract = { document: "package", assertions: [
  {kind: "dependency", table: "dependencies", dependency: {
    name: "wire", package: "serde", source: {kind: "registry"}, version: "1.0.229",
    defaultFeatures: false, features: {values: []},
  }},
] };
expect(checkManifestContract('[package]\nname="demo"\n[dependencies]\nwire={package="serde",version="^1.0.229",default-features=false}', contract).passed).toBe(true);
```

- [x] Uruchom `npx vitest run src/engine/manifest-contract.test.ts` przed implementacją i zapisz oczekiwany błąd braku modułu.
- [x] Zainstaluj dokładną wersję parsera, sprawdź deklarowane wersje środowiska i wprowadź ścisłe parsowanie. Sprawdzaj klucze za pomocą oficjalnych VisitorKeys przed konwersją do reprezentacji statycznej. Ogranicz wejście do 65536 bajtów UTF-8, głębokość AST do 64 i liczbę węzłów do 20000. Kontrakt dopuszcza 64 asercje, 12 segmentów ścieżki oraz klucze i łańcuchy do 4096 znaków. Obsłuż awarie parsera i przekroczenie limitów krótkimi komunikatami po polsku. Odrzucaj niebezpieczne segmenty rzeczywistych kluczy, dopuszczając te same słowa w komentarzach i wartościach tekstowych.
- [x] Dopasowuj asercje do własnych właściwości obiektu. Obsłuż bezpośrednie wartości domyślne false, true i pusty zbiór, wąski przypadek równoważności pełnej wersji stabilnej z zakresem caret oraz dokładne i zawierające zbiory napisów. Pomijaj niewidoczne wartości domyślne przestrzeni roboczej i odrzucaj optional w katalogu głównym przestrzeni. Odrzucaj puste lub wadliwe kontrakty i sprzeczne źródła. Flagi funkcjonalności są deklaracjami przekazywania do nazwanych zależności, a dowód uruchomienia Cargo wymaga osobnej kontroli.
- [x] Zintegruj `evaluate` bez sztucznego RunResult.

```ts
case "manifest-contract":
  return { ...checkManifestContract(input.code ?? "", evaluator.contract), evaluator: evaluator.kind };
```

- [x] Sprawdź niebezpieczne klucze w formach bez cudzysłowów, cytowanych, kropkowanych, tabelarycznych i inline. Sprawdź duplikaty, formy dostępne jedynie w TOML 1.1, limity, dodatkowe nieszkodliwe daty i tablice, sprzeczności typów oraz komunikaty. Uruchom oba zestawy testów ewaluatora i sprawdzanie typów. Zgłoś błędy unii typów u dalszych odbiorców bez edycji plików innego autora.
- [x] Przejrzyj własną zmianę, zapisz raport i pozostaw pracę bez commita do przeglądu opiekuna głównego.

### Zadanie 2 — archiwum Cargo przygotowane przez autorów i weryfikator

**Pliki.** Zmień `src/content/projects/frame-protocol.ts`, `scripts/verify-workspace.ts`, `src/content/workspace-verification.test.ts`. W razie potrzeby dodaj ukierunkowany test archiwum. Opiekun główny odpowiada za rejestrację kursu i nowe odwołania do ujawnienia wariantu startowego, CI oraz package.json.

**Interfejsy.** Zachowaj eksport frameProtocolProject, identyfikator i ścieżki archiwum. Istniejące workspaceManifest/libraryManifest/probeManifest są pełnymi odpowiedziami referencyjnymi pobieranymi z package.files. Zachowaj zachowanie generowania i weryfikacji ustalonych ZIP-ów oraz wszystkie istniejące warianty z celowym błędem API.

- [x] Przeczytaj archiwum i weryfikator. Zacznij od nieprzechodzących testów opcjonalnej dziedziczonej zależności serde, przekazywania format oraz publish=false. W zwykłym teście jednostkowym użyj `cargo metadata --no-deps --offline --format-version 1`, aby npm test działał bez pamięci podręcznej rejestru.
- [x] Dodaj zależność główną serde w wersji 1.0.229 z default-features=false. W bibliotece wprowadź opcjonalne serde z przestrzeni roboczej oraz format=[dep:serde,serde/alloc,serde/derive]. Flaga format klienta przekazuje frame-protocol/format. Zachowaj default i diagnostics. Dodaj tylko Serialize dla Frame za flagą oraz rzeczywiste użycie wymagające Serialize. Nie dodawaj Deserialize ani serde_json.
- [x] Wygeneruj rzeczywisty plik blokady w tymczasowej autorskiej przestrzeni roboczej i osadź go. Sprawdź dziewięć pakietów, prawdziwe źródła i sumy kontrolne oraz zgodność ze stabilnym i dokładnym Rust 1.85. Zaktualizuj polskie polecenia w README i ADR oraz rozróżnij domyślny graf oparty wyłącznie na std od opcjonalnych zależności zapisanych w blokadzie.
- [x] CLI dopuszcza tylko --fetch i --msrv, każde co najwyżej raz. Pobranie używa `cargo fetch --locked`, a kolejne polecenia pracują offline i z blokadą. Sprawdź dwa pakiety w grafie domyślnym i dziewięć ze wszystkimi flagami, deklaracje dziedziczone, osobne macierze funkcjonalności biblioteki, klienta i przestrzeni, testy/fmt/clippy/doc, niezmienione bajty blokady i oczekiwane niepowodzenia wariantu startowego.
- [x] Spakuj tylko frame-protocol. Zachowaj publish=false w źródle, metadanych i znormalizowanym pakiecie. Sprawdź dokładnie sześć plików Cargo.lock/Cargo.toml/Cargo.toml.orig/README.md/src/lib.rs/tests/public_consumer.rs oraz rozpakowany pakiet na stabilnym i dokładnym 1.85. Zachowaj dziesięć wariantów z celowym błędem API i dodaj kontrole flag, źródła i archiwum. Awarie infrastruktury przerywają weryfikację.
- [x] Uruchom ukierunkowane testy jednostkowe, odtwórz zasoby, wykonaj `npm run content:workspace -- --fetch` i polecenie dokładnego MSRV. Zapisz polecenia, wyniki i niepowodzenia. Próba w tymczasowym katalogu potwierdza wykonalność i wymaga końcowej weryfikacji.
- [x] Przejrzyj własną pracę i zapisz raport. Nie twórz commita ani nie zmieniaj plików innych autorów.

### Zadanie 3 — lekcje o zależnościach i flagach funkcjonalności

**Pliki.** Utwórz wyłącznie `src/content/cargo-dependencies.ts` i `src/content/cargo-dependencies.test.ts`.

**Interfejsy.** Eksportuj cargoDependencyLessons, cargoDependencyConcepts, cargoDependencyCompetencies, cargoDependencySources, cargoDependencyReviewExercises. Użyj dokładnych ID i kontraktów cargo-dependency-contract oraz cargo-resolver-feature-unification ze specyfikacji. Korzystaj z typów manifestu i pełnych manifestów z Frame. Nie importuj course.ts ani pliku drugiego autora treści Cargo.

- [x] Sprawdź strukturę lekcji w public-api-values.ts i borrowed-hrtb.ts. Przeczytaj kontrakty i wspólne interfejsy ze specyfikacji. Sprawdź oficjalne źródła Cargo i zapisz faktyczną datę reviewedAt.
- [x] Napisz po polsku dwie lekcje po 5–8 kroków: przewidywanie, konkretną obserwację, objaśnienie, główne zadanie z manifestem, odrębny wariant od pustego edytora i przypominanie. Wyjaśnij resolver3, łączenie funkcjonalności i granice default, zaznaczając, że parser ocenia deklaracje. W ścieżce projektu do pobrania podaj polecenia lokalne i wyjaśnij ich wyniki.
- [x] Wymień każdą ocenianą wartość w poleceniu dla uczestnika. Opis może być dowolnym niepustym napisem. Warianty startowe zależności i flag mają się parsować i nie spełniać kontraktu. Zadania od pustego edytora nie dostarczają kodu. Kroki TOML ustawiają editorMode/editorFile bez expectedStatus kompilatora. Pojęcia manifestu używają evidenceArtifact=manifest, zadania główne i puste to assessment/transfer z evidenceGate=true, a niezależna odroczona powtórka używa recall.
- [x] Buduj kontrakty z tablic ścieżek, oczekiwanych zależności i asercji zbiorów funkcjonalności. Główne odpowiedzi referencyjne pochodzą z gotowych plików Frame. Samodzielny wariant wire_serde używa tego samego aliasu w zwykłym zakresie i dev, bez flag w zwykłym i z alloc w dev. Zadanie od pustego edytora przekazuje dwie flagi biblioteki, a powtórka json/diagnostics przez alias telemetry_core. Odpowiedzi klienta pomijają warunkową składnię przekazywania i bezpośrednie serde.
- [x] Sprawdź, że odpowiedzi referencyjne i powtórki przechodzą, a dostarczone warianty startowe odpadają. Warianty od pustego edytora nie mają kodu. Alternatywne formy i kolejność TOML przechodzą. Brak lub zła wartość zakresu, default, optional, alloc, derive, aliasu lub ścieżki powoduje odrzucenie.

```ts
for (const lesson of cargoDependencyLessons) {
  for (const step of lesson.steps.filter(s => s.evaluator?.kind === "manifest-contract")) {
    expect(evaluate(step.evaluator!, {code: step.solution})).toMatchObject({passed: true});
    if (step.code) expect(evaluate(step.evaluator!, {code: step.code}).passed).toBe(false);
  }
}
```

- [x] Uruchom ukierunkowane testy po zainstalowaniu parsera. Sprawdź własną zmianę i zapisz raport, pozostawiając rejestrację kursu, interfejs i pakiet ich właścicielom.

### Zadanie 4 — zasady zaliczania, trwałość zapisu i ujawnianie pomocy

**Pliki.** Zmień `src/engine/learning.ts`, `src/domain/project-package.ts`, `src/persistence/state.ts` i ich testy. Utwórz `src/content/learning-context.ts` i ukierunkowane testy funkcji pośrednich. Typy należą do zadania 1.

**Interfejsy.** Użyj dokładnych EvidencePolicy/evidencePolicyForConcepts i opcjonalnych parametrów polityki ze specyfikacji. Funkcje kursu to recordCourseEvidence/recordCourseLessonExposure/revealCourseProjectPackageVariant. Bezpośrednie revealProjectSolution zachowuje zgodność. Warstwa pośrednia importuje autorskie pojęcia kursu, a silnik pozostaje od nich niezależny.

- [x] Zacznij od nieprzechodzących testów zrozumienia manifestu na podstawie dwóch niezależnych zadań, utrwalenia przez powtórkę po ponad 24 godzinach i niezgodności artefaktów Rust i manifestu w obu kierunkach. Zachowaj neutralne reguły odpowiedzi, wyboru, kolejności i rubryki oraz wcześniejszy dowód naprawy lub projektu Rust dla niezdefiniowanego ewaluatora.
- [x] Odfiltruj niezgodne artefakty przed zliczaniem silnych zadań, zweryfikowanych dowodów i we wszystkich ścieżkach utrwalenia. Domyślna polityka bezpośrednich wywołań i nieznanych identyfikatorów to Rust. Importowane zdarzenie nie wybiera własnej polityki pojęcia.
- [x] Przekaż opcjonalną politykę przez recordEvidence, recordLessonExposure i ujawnienie projektu. Zachowaj zasady czasu, podpowiedzi, ujawnienia, szkiców i ukończenia. Wariant startowy ujawnia tylko odwołania startowe. Rozwiązanie ujawnia sumę obu zestawów bez powtórzeń. Powtórny dostęp nie zmienia skutków, wszystkie odwołania przechodzą walidację, a zadania od pustego edytora i powtórki zachowują niezależność.
- [x] Dodaj literał manifest-contract do ścisłego wyliczenia utrwalonych dowodów. Zachowaj schema3 i migracje v1/v2/v3. Sprawdź import i eksport szkicu oraz próby TOML bez RunResult.
- [x] Dodaj warstwę pośrednią i testy, że późniejsze ujawnienie lekcji, powtórki lub pakietu nie obniża zrozumienia ani utrwalenia manifestu i że obowiązuje autorska polityka. Opiekun główny później podłącza interfejs i odwołania integracyjne.
- [x] Uruchom testy nauki, pakietu projektu, zapisu i warstwy pośredniej. Przejrzyj pracę i zapisz raport. Rejestracja interfejsu i treści należy do innych zadań.

### Zadanie 5 — lekcje o najstarszej obsługiwanej wersji kompilatora i pakietach

**Pliki.** Utwórz wyłącznie `src/content/cargo-release-policy.ts` i `src/content/cargo-release-policy.test.ts`.

**Interfejsy.** Eksportuj cargoReleaseLessons, cargoReleaseConcepts, cargoReleaseCompetencies, cargoReleaseSources, cargoReleaseReviewExercises. Użyj dokładnych ID i kontraktów cargo-lock-msrv-policy oraz cargo-package-rehearsal. Korzystaj z referencyjnych plików projektu Frame bez importu kursu.

- [x] Przeczytaj dokładne kontrakty zadań, wspólne interfejsy i dotychczasową strukturę lekcji. Zweryfikuj oficjalne źródła Cargo i zapisz faktyczną datę reviewedAt.
- [x] Napisz dwie lekcje po 5–8 kroków. Uwzględnij przewidywanie, obserwację, objaśnienie, główne zadanie, nowy wariant od pustego edytora, przypominanie oraz niezależne odroczone powtórki. Ustaw artefakt manifestu i editorMode, bez statusu kompilatora. Podaj w poleceniu wszystkie oceniane metadane, klucze, wartości, ścieżki i flagi. Opisy wymagają niepustej treści, bez zapamiętywania konkretnego tekstu.
- [x] W głównym wariancie o minimalnej wersji, odmiennym od zadania o zależnościach, przywróć resolver3 i minimalne 1.85 oraz zachowaj zależność wejściową. Wariant od pustego edytora dziedziczy wszystkie wskazane metadane katalogu głównego poprzez zagnieżdżone ścieżki .workspace=true. Nie sprawdzaj nieobecności całych rust-version/version. Powtórka przywraca samodzielnie zadeklarowaną minimalną wersję. Ucz rzeczywistego zachowania --locked/update bez fikcyjnej polityki metadanych ani ręcznej edycji Cargo.lock.
- [x] Główne zadanie pakietowe sprawdza metadane, publish=false i brak include oraz exclude. Nowe warianty include/exclude wynikają ze specyfikacji. Wyjaśnij tworzenie Cargo.lock/Cargo.toml.orig i wynik package --list. Ocena odpowiedzi dotyczy deklaracji, a pakowanie dotyczy tylko biblioteki. Wykonanie i publikacja wymagają innych dowodów.
- [x] Sprawdź poprawne odpowiedzi, parsowalne i odrzucane warianty startowe, brak kodu w zadaniach od pustego edytora oraz akceptację alternatywnych form TOML, kolejności i opisów. Zmień minimalną wersję, resolver, dziedziczenie, publish, metadane, include, exclude i ścieżkę biblioteki, aby wykazać odrzucenie błędów. Uruchom ukierunkowane testy, przejrzyj zmianę i zapisz raport.

### Zadanie 6 — integracja kursu, interfejsu i weryfikacji materiałów autorskich

**Pliki.** Opiekun główny odpowiada za `src/content/course.ts`, nowy cargo-dependency-lifecycle-module.ts, `src/content/validate.ts`, `scripts/verify-rust.ts`, `scripts/verify-manifests.ts`, ustalony zestaw manifestów, `.github/workflows/ci.yml`, `src/components/{code-editor,lesson-workspace,review,project-package}.tsx`, testy integracyjne Cargo i Playwright, README oraz skrypt offline i wersję pamięci podręcznej. Po raporcie zadania 2 dodaje metadane i odwołania Frame. Po raporcie zadania 1 może dodać skrypt pakietu.

**Interfejsy.** Użyj wszystkich poprzednich eksportów. Moduł następuje po public-api-workspaces i od niego zależy. Każde z czterech kryteriów ma zadanie główne i wariant od pustego edytora. Interfejs zapisuje dowody i ujawnienia wyłącznie przez warstwę pośrednią kursu.

- [x] Zintegruj treści, pojęcia, źródła, powtórki i cztery odwołania do głównych wariantów startowych w projekcie Frame. Rozszerz identyfikatory lekcji i powtórek, zachowując zadania publicznego API. Dopasuj testy wcześniejszego API do sprawdzania ich podzbioru i niezależności zadań po łącznym ujawnieniu.
- [x] Rozszerz walidację treści o bezpieczną składnię TOML, kontrakty, odwołania, warianty startowe i obie listy ujawnienia. Weryfikator Rust pomija TOML, także w obserwacjach wyboru, więc nie przesyła go do rustc. Nowy weryfikator autorski porównuje ścisły parser z Cargo na wersji stabilnej i dokładnym 1.85 w kontrolowanych kontekstach. Odrzuca dowolne wejście CLI oraz sprawdza rozwiązania autorskie i warianty z celowymi błędami semantycznymi.
- [x] Rozszerz CodeEditor o idempotentną rejestrację TOML w Monarch, nazwę pliku, etykiety ARIA i stan. Domyślnym językiem pozostaje Rust. Złożenie manifestu używa evaluate lokalnie, zapisuje próbę kodową i pomija RunResult. Obserwacje TOML używają kontrolek odpowiedzi bez przycisku uruchomienia Rust ani wywołania API. Powtórka stosuje tę samą semantykę.
- [x] Zastąp bezpośrednie produkcyjne wywołania zapisu dowodów i ujawnień funkcjami kursu. Podgląd startowy i oba pobrania zapisują ujawnienie właściwego wariantu przed pokazaniem plików. Zachowaj obsługę istniejących pakietów bez odwołań startowych.
- [x] Dodaj testy integracyjne czterech kryteriów, ujawnionego zadania głównego, świeżego wariantu od pustego edytora i powtórki oraz utrwalenia przez zapis i warstwę pośrednią. Playwright sprawdza poprawną i błędną odpowiedź TOML, brak /api/run, szkic po przeładowaniu, powtórkę, ujawnienie przez podgląd i pobranie, pole tekstowe i klawiaturę oraz wznowienie offline.
- [x] Dodaj w CI jawne --fetch dla obu wersji kompilatora przestrzeni roboczej i ustalonego weryfikatora manifestów. Angielski README wyjaśnia zakres Node, różnicę między lokalną oceną TOML a rzeczywistą weryfikacją Cargo oraz nowe polecenia. Zaktualizuj liczebność, postęp i audyt wymagań. Podnieś wersję pamięci podręcznej po ustaleniu danych kompilacji.

### Zadanie 7 — przegląd, weryfikacja i wydanie etapu

**Pliki.** Dokumentacja, raporty i przejrzane zmiany.

- [ ] Przygotuj różnice w ustalonym zakresie dla gotowych zadań i przejrzyj je za pomocą Astra xhigh. Ważne uwagi napraw z pierwotnymi autorami i przejrzyj ponownie zmienione fragmenty. Na końcu przejrzyj zintegrowaną gałąź, w tym bezpieczeństwo AST oraz granice dowodów i interfejsu.
- [ ] Sprawdź typy, lint, pełny Vitest, walidację treści, autorskie przypadki Rust, odpowiednie kontrole Cargo i manifestów w profilach stable i MSRV oraz audyt źródeł. Wykonaj kompilację produkcyjną, produkcyjny E2E bez ponowień, weryfikację offline i osiem deterministycznych pobrań ZIP. Pozostałe istniejące zestawy CI uruchom raz na końcowej integracji lub dokładnym commicie PR i zapisz wyniki.
- [ ] Sprawdź różnice i `git diff --check`. Przygotuj wyłącznie zamierzone zmiany i commit po angielsku. Wypchnij gałąź i otwórz angielski PR opisujący zachowanie, ograniczenia i testy. Poczekaj na wszystkie trzy zadania CI dla najnowszego commita PR i usuń ewentualne usterki. Scal zgodnie z udzieloną już zgodą.
- [ ] Zweryfikuj zdalny main po scaleniu i jego kontrole. Zapisz dowody. Dalszy cel kursu obejmuje unsafe, GAT, wydajność, utrzymanie usług, projekt końcowy i weryfikację z uczestnikami. Ten etap Cargo potwierdza tylko własny zakres.
