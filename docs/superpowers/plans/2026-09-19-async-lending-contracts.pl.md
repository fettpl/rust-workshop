# Kontrakty asynchronicznego wypożyczania — pożyczające futures, anulowanie i granice dyspozycji

[English](2026-09-19-async-lending-contracts.md)

## Cel

Dodaj etap zaawansowanego Rust o ustalonym zakresie, w którym uczestnik ćwiczy granicę własności między pracą asynchroniczną pożyczającą dane a przekazaniem jej do uruchomienia. Uczestnik ustala, kto jest właścicielem danych w `Pending`, jak długo trwa pożyczka, kiedy zatwierdza się pozycję kursora i które skutki pozostają po anulowaniu.

Etap rozszerza istniejący `tokio-service-workshop`, bez czternastego projektu i bez zastępowania istniejących modułów async, GAT, anulowania ani strumieni.

## Zakres

- Pięć lekcji po polsku i pięć pojęć.
- Dziesięć kryteriów zaliczeniowych i pięć niezależnych powtórek programistycznych.
- Rzeczywiste futures i pożyczające funkcje zwrotne, w tym kontrolowane `Pending -> Ready`.
- Składnia stabilnego Rust 1.85. Zakres wyklucza ręczne użycie nocnych `CallRefFuture` lub `async_call_mut`, unsafe, własny executor i nowe zależności produkcyjne.
- Sprawdź archiwum na bieżącej wersji stabilnej i dokładnym Rust 1.85. Obejmij odrzucenie wariantu startowego, przypadki oczekiwanej udanej i nieudanej kompilacji, celowe błędy zachowania i tryb offline.

## Kontrakty lekcji

1. **async-lending-receiver** — przez zawieszenie zachowaj pożyczony wynik powiązany z wywołaniem. Sprawdź gotowość, integralność danych i wyczerpanie oraz odrzuć drugą pożyczkę, gdy pierwszy wynik wciąż jest używany.
2. **async-lending-callbacks** — wykonuj sekwencyjnie `AsyncFnMut`, którego future pożycza argument lub stan domknięcia. Zachowaj kolejność, modyfikuj lokalny akumulator i zatrzymaj się po błędzie bez wymagania `'static` i klonowania.
3. **async-lending-cancel-commit** — rozróżniaj otrzymanie danych, ukończenie funkcji zwrotnej i zatwierdzenie kursora. Wykaż, że anulowanie przed zatwierdzeniem zostawia kursor na miejscu, a zatwierdzony ruch pozostaje po anulowaniu.
4. **async-lending-send-boundary** — rozróżniaj `Self: Send`, `Future: Send`, lokalne pożyczki i wymaganie `'static` przy uruchamianiu zadania. Udostępnij osobny future posiadanego raportu, który rzeczywiście spełnia kontrakt `tokio::spawn`.
5. **async-lending-dyn-adapter** — wybierz statyczne wypożyczanie albo jawny adapter z Box i udokumentowanym kosztem. Obsłuż różnorodnych dostawców i lokalne czasy życia. Zgodność z dyn zależy od użytego traitu.

## Zmiany projektu

Dodaj do wygenerowanych archiwów startowego i rozwiązania `tokio-service-workshop`:

- `src/lending.rs` — własność ograniczonych pakietów, pożyczony dostęp i sekwencyjny wizytator.
- `src/report_source.rs` — posiadane raporty, statyczna granica `Send` i adapter z Box.
- `examples/borrowed_batch.rs` — uruchamialna lokalna funkcja zwrotna i posiadany obiekt przekazany do zadania.
- `tests/lending_contract.rs` — kontrolowane zawieszenie, anulowanie, zatwierdzenie, błąd i zachowanie adaptera.
- `ASYNC-LENDING.md` — diagram własności, punkty anulowania, ADR porównujący dyspozycję statyczną z Box i ograniczenia.

Zachowaj istniejący protokół TCP. Przykład i testy używają nowego publicznego API biblioteki.

## Zmiany w treści i weryfikatorze

- Dodaj `src/content/async-lending-core.ts` dla pierwszych dwóch lekcji.
- Dodaj `src/content/async-lending-boundaries.ts` dla pozostałych lekcji.
- Dodaj `src/content/async-lending-module.ts` z wymaganiami wstępnymi, pojęciami, kryteriami i pięcioma zadaniami transferu.
- Dodaj ukierunkowane autorskie dane i testy ocen oraz testy integracyjne.
- Rozszerz `src/content/projects/tokio-service.ts` i testy archiwum.
- Dodaj `scripts/verify-async-lending.ts` i `content:async-lending`.
- Zarejestruj moduł w `course.ts`. Dodaj scenariusze wznowienia i offline, metadane źródeł i dokumentację zakresu. Zachowaj schemat v3 i istniejące ID.

## Dowody i CI

- Wszystkie 15 ocenianych zadań wymaga rozwiązania referencyjnego i istotnie odmiennej poprawnej alternatywy. Wariant z błędem zachowania musi się kompilować i oblać asercję.
- Użyj par udanej i nieudanej kompilacji dla czasów życia, `Send` i `dyn`.
- Wymagane celowe błędy: zatwierdzenie przed await, pominięcie funkcji zwrotnej, kontynuacja po błędzie, dodatkowy poll po `Ready`, utrata elementu po `Pending` i przedwczesna praca adaptera.
- Uruchom archiwa na wersji stabilnej i dokładnym Rust 1.85 z ustalonymi autorskimi źródłami, bez nadpisywania ścieżek i zależności. Porównaj oba ZIP-y. Wykonaj fmt, check/test/clippy offline z blokadą, odrzucenie wariantu startowego, uruchomienie przykładu i kontrolowane warianty błędów.
- Dodaj weryfikator do `verify` i `workspace-msrv`, zachowując zadania fuzz, profile i Miri. Zapisuj dowody JSON ze skrótem archiwum, łańcuchem narzędzi i wynikami przypadków.
- Zachowaj granice pakietu i sekwencji: 32 rekordy, 4096 bajtów i kontrolowane wywołania poll. Przekroczenie czasu procesu jest awarią weryfikatora.
- Dodaj E2E wyszukiwania modułu, zaliczenia, ujawnienia, wznowienia, ZIP-u offline i błędów konsoli oraz sprawdzenie klawiatury.

## Poza zakresem

Etap nie obejmuje unsafe, nocnych API async, własnego runtime, nowych zależności produkcyjnych, rozproszonej semantyki dokładnie raz, automatycznego wycofania dowolnych skutków, gwarancji wydajności dyspozycji z Box ani anulowania dowolnej operacji blokującej. Szersze wstrzymanie wydania, pilotaż, alokacje, przegląd ostrzeżeń i licencji oraz pełny program fuzzingu pozostają odrębne.

## Kolejność prac i przegląd

1. Wdróż treść, archiwum, weryfikator, testy, dokumentację i CI przy użyciu GPT-5.6-Luna (high).
2. Uruchom ukierunkowaną i pełną weryfikację na wersji stabilnej i Rust 1.85.
3. Zleć GPT-6-Astra (medium) ocenę jakości względem planu i audytu wymagań kursu.
4. Napraw ustalenia za pomocą Luna, ponów weryfikację, a następnie wykonaj commit, push, otwórz PR i scal etap z angielskimi metadanymi Git.
