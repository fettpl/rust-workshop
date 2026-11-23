# GAT i iteratory wypożyczające — plan wdrożenia

[English](2026-09-17-gat-lending-iterators.md)

> Agenci wdrażają plan zadanie po zadaniu w trybie subagent-driven-development. Autorzy używają GPT-5.6-Luna high, a recenzenci GPT-6-Astra medium. Agent główny odpowiada za wspólną integrację i wydanie.

**Cel:** Naucz rodziny przedmiotów związanych z odbiorcami, nakładające się na siebie
zmutowane poglądy, związane z nimi możliwości i leniwe adaptery, poprzez cztery
niezależnie oceniane lekcje.

**Architektura:** Dwa niezależne pliki treści eksportują lekcje i metadane do istniejącego katalogu.
Moduł łączy się z czterema kryteriami primary/blank. Istniejąca realizacja, trwałość i harmonogram
przeglądów Rusta pozostają autorytatywne; stałe urządzenia do oceny wyłącznie opiekunów
testują jakość klasyfikacji poza pakietem przeglądarki.

**Tech Stack:** TypeScript, wersja Rustowa tylko dla std 2024, rust 1.85.0 i bieżąca stabilizacja, Vitest,
Playwright, istniejąca aplikacja Next.js.

**Spec:** `docs/superpowers/specs/2026-09-17-gat-lending-iterators-design.md`.

## Ograniczenia globalne

- Moduł `gat-lending-iterators`, bezpośrednio po `iterators`; warunki wstępne modułu `borrowed-callbacks` i `iterators`.
- Zamówione lesson/concept IDs: `gat-receiver-borrows`, `gat-overlapping-mutable-windows`, `gat-item-capabilities`, `gat-owned-iterator-adapters`.
- Pierwsze lesson/concept warunki wstępne: `hrtb-borrowed-projections`, `iterator-contracts`; następujące lessons/concepts tworzą uporządkowany łańcuch.
- Pierwotne `${id}-gate`, wolne od źródła `${id}-blank`, odrębne `${id}-review`. Każdy pierwotny i pusty ma `evidenceGate: true` i
  ocenę testów Rust. Recenzje są niezależnie zakodowanymi odczytami.
- Stwierdza się użycie `evidenceArtifact: "rust-code"`. Źródło producenta IDs to `gat-reference-associated-items`, `gat-slice-windows`, `gat-gats-stabilization`, `gat-error-e0499`; konsument IDs
  to `gat-reference-trait-bounds`, `gat-reference-dyn-compatibility`, `gat-iterator`, `gat-error-e0038`. Każde źródło jest zarejestrowane raz; wnioski mogą odnosić się
  do obu grup IDs.
- Kopia Learnera jest polska; README, zobowiązuje się i PRs pozostaje angielskim.
  Publiczność potrzebuje podstawowej wiedzy programowej; kurs uczy Rust od zera.
  Snippety Ruste wykorzystują tylko funkcje kompatybilne ze std, edition 2024 i Rust
  1.85.
- Brak niebezpiecznych, wycieków przydziałów lub niepotrzebnych Copy/Clone/Default/ "ograniczeń
  statycznych. Zdecyduj o ograniczeniach wdrożeniowych w celu zachęcenia uczącego się i
  egzekwowania tylko zapowiedzianych ograniczeń.
- Zachować stary IDs, schemat postępu v3, wszystkie osiem projektów i pakietów. Brak
  nowej zależności, punktu końcowego wykonania, autorki arbitralnej CLI lub importowanej
  realizacji ucznia.
- Wykonaj tylko stałe źródła autorskie. Brak na żywo Placu zabaw POST, publikacji
  zewnętrznej lub nowego celu rozmieszczenia.
- Odpowiedzi kanoniczne i nieszkodliwe odpowiedniki muszą przejść. Mutanty semantyczne
  muszą kompilować się z powodzeniem, a następnie upaść behawioralne twierdzenia;
  niepowodzenie kompilacji nie jest substytutem.
- Szeroki cel kursu pozostaje otwarty. Ukończenie tego modułu nie dowodzi gotowości
  zawodowej ani pełnego zaawansowanego zasięgu.

## Zadanie 1 — pożyczki z odbiorcy metody i zmienialne okna

**Pliki:** create `src/content/gat-producers.ts`, `src/content/gat-producers.test.ts`, `src/content/gat-producer-assessment-fixtures.ts`.

**Interfejsy:** Wyprodukuj `gatProducerLessons: Lesson[]`, `gatProducerConcepts: Concept[]`, `gatProducerCompetencies: Competency[]`, `gatProducerSources: Source[]`, `gatProducerReviewExercises: Record<string, LessonStep>`. Eksport pliku urządzenia `gatProducerAssessmentFixtures: { id: string; equivalent: string; mutant: string }[]`; każdy id jest
jednym z sześciu gate/blank/review kroków IDs. Nie może on przywozić course.ts ani być importowany z
wykorzystaniem zawartości produkcyjnej.

- [x] Przeczytaj kontrakty producenta spec i istniejących `borrowed-hrtb.ts` autoryzujących pomocników.
      Wdrożenie żadnych lekcji dla konsumentów lub wspólnej rejestracji.
- [x] Najpierw napisz ukryte struny testowe Rust. Dla własnych wierszy zachować puste
      wiersze i mutacje; okupowane szczeliny pomijać wolne miejsca; zwrotny odzysk ma
      odrębny porządek. W przypadku badania okien nakładają się na rekordy niekopiujące,
      zero/equal/oversized szerokości, puste wejście, powtarzające się wyczerpanie i rzeczywiście lokalne
      pożyczki. Prefiks i przeniesienie wsteczne następuje zgodnie z ich oddzielnie
      określonymi kontraktami.
- [x] Sprawdzenie kompilacji niedokończonych implementacji podstawowych nie powiodło
      ukrytych testów. Zachowaj dokładne polecenia i niepowodzenia w raporcie zadań.
- [x] Wdrożenie wszystkich sześciu referencji i odpowiedzi zastępczych, a następnie
      ponowne przeprowadzenie tych samych testów. Nie należy przeprowadzać inspekcji
      reprezentacji prywatnej w testach, chyba że zamówienie publiczne wyraźnie tego
      wymaga; należy sprawdzić obserwacje za pośrednictwem obiecanego API.
- [x] Dodać jeden kompilujący mutant semantyczny dla każdej oceny: pomiń pusty wiersz,
      zatrzymać się na wolne miejsce, odwrócić nieprawidłowo, przesunąć okno według
      szerokości, rozpocząć przedrostki na złej długości, lub użyć niewłaściwej granicy
      odwrotnej. Zamrożenie dokładnych strun źródłowych w eksporcie urządzenia powyżej.
- [x] Dodać discovery/prediction/explanation kroków z prawdziwymi obserwacjami kompilatora. Wyróżnić zwykłe,
      niezmienne okna zewnętrzne z bieżących kredytów odbiornika; udowodnić E0499 z
      rzeczywistym autorem przykładu. Nie należy twierdzić, że GAT sama gwarantuje
      odniesienia, pochodzenie lub całkowite wyczerpanie.
- [x] Sprawdzić umowę oceny strukturalnej przed zakończeniem wywozu, a następnie
      przejść:

```ts
for (const lesson of gatProducerLessons) {
  const gate = lesson.steps.find(s => s.id === `${lesson.id}-gate`)!;
  const blank = lesson.steps.find(s => s.id === `${lesson.id}-blank`)!;
  expect(gate.evaluator?.kind).toBe("tests");
  expect(gate.evidenceGate).toBe(true);
  expect(blank.code).toBeUndefined();
  expect(blank.evidenceGate).toBe(true);
  expect(gatProducerReviewExercises[lesson.id].evaluator?.kind).toBe("tests");
}
```

- [x] Uruchomić skalowane `verifyTrustedRust({ lessons: gatProducerLessons, reviewExercises: gatProducerReviewExercises, traces: {} })` na stabilne i dokładne 1.85.0. Wszystkie sprawy muszą
      przejść. Format zmienił się TypeScript i przedstawił behavioral/diagnostic dowody; niezależny przegląd
      poprzedza ukończenie.

## Zadanie 2 — wymagania wobec typów skojarzonych i adaptery zwracające własne dane

**Pliki:** create `src/content/gat-consumers.ts`, `src/content/gat-consumers.test.ts`, `src/content/gat-consumer-assessment-fixtures.ts`.

**Interfejsy:** Wyprodukuj `gatConsumerLessons`, `gatConsumerConcepts`, `gatConsumerCompetencies`, `gatConsumerSources`, `gatConsumerReviewExercises`, używając tych samych typów domen co zadanie 1.
Wywóz `gatConsumerAssessmentFixtures: { id: string; equivalent: string; mutant: string }[]` do celów jego sześciu ocen IDs, w oddzielnym pliku mocującym. Brak przywozu w
ramach realizacji zadania 1 lub course.ts.

- [x] Przeczytaj opis możliwości i kontraktów adaptera spec. Każde samodzielne ćwiczenie
      zawiera lub wymaga pełnej cechy API; brak ukrytej zależności od poprzedniego
      projektu edytora.
- [x] Napisz ukryte testy przed referencjami. Należy stosować zarówno `&mut [T]`, jak i
      niestandardowe AsRef/AsMut opakowania produktów, elementy niekopiujące posiadające lokalne
      referencje, a także odsyłacze rejestrujące państwo lokalne. Sprawdzić puste
      przedmioty i dokładne stop/resume semantyki.
- [x] Porównaj pola raportów bezpośrednio w zadaniach wolnych od źródła; nie wymagaj
      przypadkiem nieokreślonych Debug/PartialEq wynikających z twierdzeń o wartości całkowitej.
      Każda pustka musi opisać pełną cechę w następnym okresie życia receiver/output bez
      dostarczenia podpisu funkcji Rust.
- [x] Dla adapterów potwierdza zerowe sondaże źródłowe na budowie; każdy następny
      postępuje zgodnie ze swoją określoną polityką; własne wyniki przeżywają dalsze
      rozmowy i upuszczanie adaptera. Włączyć źródło, które zwraca None then Some do
      egzekwowania wyraźnej polityki terminala, zamiast zakładając, że każde źródło jest
      zespolone.
- [x] Zaawansowane ordinals source with saturation at `usize::MAX`, as specified, for primary/blank/review
      adapters. Nie należy twierdzić, że realistyczny test wejścia publicznego osiąga
      nasycenie; należy dokonać bezpośredniego przeglądu ograniczonej arytmetyki.
      Prywatny układ pozostaje wyborem w zakresie wdrażania.
- [x] Sprawdzić niedokończone implementacje nie powiodły się; następnie wdrożyć
      wszystkie referencje i nieszkodliwe implementacje alternatywne. Utrzymuj wyraźną
      mutację i leniwą iterację.
- [x] Dodać sześć kompilacji behawioralnych mutantów celujących pominięte puste
      przedmioty, dodatkowe sondaże po zatrzymaniu połączeń, nieprawidłowy wybór
      raportu, gorliwą konstrukcję adaptera, zły indeks źródłowy lub zła granica
      terminala. Przechowuj pełne autorskie źródła w eksporcie stałych uchwytów.
- [x] Teach zadeklarował GAT zdolności przy użyciu `SliceLender<T>`. Wykazanie zmierzonego
      zewnętrznego projektu- HRTB ograniczenie bez twierdzenia, że wszystkie HRTBs wymagają
      statycznego. Dołącz GAT dyn odrzucenie i beton pożyczone-wyjście dyn sukces jako
      obserwacje, a nie oddzielne twierdzenia mastery.
- [x] Dodaj testy strukturalne dopasowane do wyraźnego zadania 1 gate/blank/review twierdzenia
      dotyczące `gatConsumerLessons` oraz `gatConsumerReviewExercises`; brak źródła na pustych krokach.
- [x] Uruchomić skalowane `verifyTrustedRust({ lessons: gatConsumerLessons, reviewExercises: gatConsumerReviewExercises, traces: {} })` na stabilne i dokładne 1.85.0. Format TypeScript i sprawozdanie
      dotyczące rzeczywistych wyników badań do celów niezależnego przeglądu.

## Zadanie 3 — testy regresji zapisu ocen i integracja ze ścieżką uczestnika

**Pliki:** tworzyć `src/content/gat-assessment.test.ts`, `src/content/gat-lending-module.ts`, `src/content/gat-lending-integration.test.ts`; modyfikować `src/content/course.ts`, `src/content/validate.ts`, `src/content/content-validation.test.ts`, `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs`, `public/sw.js`.

**Spożycie:** Zarówno pięć-eksportowe zestawy produkcyjne, jak i oba stałe urządzenia eksportowane
z zadań2. Produkcja importuje jedynie pliki treści; testowe urządzenia do oceny
przywozu.

- [x] Dodać nieudany test registration/evidence. Przeczytaj `cargo-lifecycle-integration.test.ts` i użyj fasady uczenia się w celu uzyskania
      rzeczywistych dowodów. Ujawnić wszystkie cztery prymary, export/import stan, potwierdzić
      żadne kryterium przejść z dowodów wspomaganych, przekazać każdy świeży puste
      niezależnie, i zachować niepowiązany projekt i notatkę.
- [x] Wdrożenie `gatLendingModule` z czterema zamówionymi IDs i pierwszorzędnymi lub ślepymi
      końcówkami. Zarejestrować wszystkie pięć eksportu metadanych w course.ts na pozycji
      modułu; zachować poprzednie identyfikatory i zamówić nienaruszone.
- [x] Zaakceptuj oficjalne HTTPS Źródło Rust blog używane przez zatwierdzony projekt.
      Obserwuj najpierw odrzucenie, a następnie dodaj prefiks dokładnego hosta z HTTP,
      przypadków regresji typu lookpake-host i userinfo; nie zmieniaj reszty polityki
      źródłowej.
- [x] Przetestuj uchwyty opiekuna używając `appendHiddenTests(source, tests)`, katalogu tymczasowego i `spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary])`. Wymagany
      stan kompilacji 0 dla kanonicznych, równoważnych i zmutowanych; wymóg statusu
      wykonania 0 dla canonical/equivalent i niezerowych plus nieudany raport z badań dla mutantów. Ustaw
      ograniczony compile/run timeout, sprawdź errors/signals i wyczyść katalog w końcu. Test nie akceptuje
      żadnych ścieżek wejściowych ani argumentów źródłowych ze strony użytkowników.
- [x] Osprzęt osprzętu IDs obejmuje dokładnie dwanaście zarejestrowanych ocen IDs raz, a
      następnie przeprowadza trwałe badanie na stabilnej i ruście 1.85.0. Użyj `RUSTUP_TOOLCHAIN=1.85.0` z
      katalogiem łańcucha narzędzi rdzeniowych z przodu PATH; potwierdź `rustc --version` w każdym
      zarejestrowanym uruchomieniu. Nie należy przypadkowo testować domyślnego
      noktowizyjnego jako stabilnego.
- [x] Sprawdzaj w CI zadeklarowaną minimalną wersję kompilatora dla GAT. W `.github/workflows/ci.yml` istniejące zadanie `workspace-msrv` uruchamia dwa pliki testów treści GAT i stały zestaw testów oceny. Ustaw RUSTUP_TOOLCHAIN na 1.85.0 i dodaj katalog z `rustup which --toolchain 1.85.0 rustc` na początku PATH. Samo ustawienie zmiennej dla procesu Node może nadal powodować wybranie systemowego rustc z pominięciem rustup. Wersja stabilna wciąż uruchamia te testy w pełnym zestawie Vitest. Opisz ten zakres w `docs/ci-cd.md`.

- [x] Rozszerzenie produkcji navigation/resume E2E dla nowego modułu, zachowując pierwotny odsłon i
      niezależny pusty ciąg w całym przeładowaniu. Reakcje stub runner; te UI testy nie
      udowadniają semantyki Rust.
- [x] Rozszerzenie weryfikacji offline, aby otworzyć wcześniej nieodwiedzany GAT pusty,
      edytować go, ponownie załadować offline i odzyskać dokładny krok i tekst. Zachowaj
      wszystkie osiem kontroli bajtów. Zwiększ wartość bufora v24 do v25 dla ukończonego
      nowego katalogu; no IndexedDB reset.
- [x] Czytaj zainstalowane Next server/client i leniwe prowadnice ładowania przed zmianą
      okablowania aplikacji. Do celów rejestracji treści nie jest wymagany dynamiczny
      import ani refaktor komponentów.

## Zadanie 4: Weryfikacja, dokumentacja i wydanie

**Pliki:** aktualizacja `README.md`, `docs/progress.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/verification.md`, ten plan. Zmień CI tylko wtedy, gdy wymagana
jest wykazana luka w zakresie zasięgu.

- [x] Uzyskaj niezależny przegląd Astry zarówno zadań w zakresie treści, stałych testów
      i integracji. Ustalić ważne ustalenia, ponownie sprawdzić wpływ i przeprowadzić
      ostateczny przegląd całego oddziału przed wydaniem.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run content:check`, `npm run content:rust`, `npm run content:audit -- --check-links` i `npm run build`. Zachowaj logi i dokładne sumy; nie wyciągać
      pokrycia z samych testów.
- [x] Uruchom produkcję Playwright z zerowymi powtórzeniami i `npm run test:offline` przeciwko ostatecznej
      budowy. Sprawdź nową lekcję ręcznie, aby wyświetlić podpowiedzi, zachowanie
      edytora i nawigację klawiatury. Żaden uczeń Rust nie jest wykonywany lokalnie.
- [x] Aktualizacja języka angielskiego README liczy się z katalogu. Wyjaśnienie częściowych
      GAT braków w zakresie udzielania kredytów i pożyczek asynkowych, niebezpiecznych,
      osiąganych wyników, bezpieczeństwa oraz operacyjnych programów nauczania w
      polskich dokumentach audytowych. Record Cargo PR # 9 i po połączeniu CI sukces
      jako dowód poprzedniego wydania.
- [ ] Wydaj recenzowany kamień milowy w języku angielskim, push feature branch, otwórz
      angielski PR, i wymagają wszystkie trzy CI miejsc pracy, aby przejść na jego
      dokładną głowę. Recheck base/head przed połączeniem; użyć `--match-head-commit`.
- [ ] Połączenie w ramach autoryzacji użytkownika stojącego, fast-forward lokalnej
      głównej, sprawdzić stan czysty i identyczne testowane drzewo, a następnie
      zweryfikować wszystkie zadania główne po połączeniu CI. Utrzymać ogólny cel
      aktywny.

## Decyzje wstępne

Stojący cel autoryzuje rozwój kursu i uruchomienie kamienia milowego; nie jest potrzebne
żadne nowe menu zatwierdzające dla tych rutynowych decyzji dotyczących zakresu.
Kontynuuj sprawdzoną kontrolę `feat/gat-lending-iterators`, w oparciu o zweryfikowane `2a68786`, tak aby podgląd
użytkownika i istniejące ścieżki oprzyrządowania pozostały stabilne. Równoległe autorzy
posiadają pliki dezjoint. Root może rejestrować stabilny eksport, podczas gdy autorzy
zakończą weryfikację skali, ale wydanie wymaga ich sprawozdań i niezależnych
zatwierdzeń. Root jest właścicielem commits; commits for-task source są konsolidowane w
wymaganym dużym kamień milowy. Poprzednim celem był postęp: Cargo PR # 9 i weryfikacji
po połączeniu zakończone.

Przed wykonaniem, przeglądaj ukończony spec przeciwko temu planowi, rozwiązuj dokładne
API lub konflikty polityczne na korzyść specu, i nagrać tabelę task/interface przed lotem w nowej
fazie ignorowanej SDD księgi. Nie wysyłaj realizacji, podczas gdy wymagana umowa jest
nadal niejednoznaczna.
