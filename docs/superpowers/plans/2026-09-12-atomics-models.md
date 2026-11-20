# Atomics, porządkowanie pamięci i modele Loom — plan

**Cel:** rozwinąć zatwierdzoną mapę kursu o atomowe operacje i sprawdzanie małych protokołów współbieżnych; zachować niezależne zadania, powtórki i dowody ograniczeń testów.

**Architektura:** dwa moduły danych po synchronized-state; istniejący widok projektów udostępnia osobne laboratorium Cargo. Pakiet używa jednego kodu algorytmów i warstwy importów std/Loom sterowanej feature `model`. Przeglądarka nadal wykonuje wyłącznie pojedyncze programy std; uruchomienie prawdziwego Loom należy do pobranego pakietu i developerskiej weryfikacji zaufanych artefaktów.

**Podstawa:** oryginalny brief, zaakceptowany profil osoby zaczynającej Rust od zera, `docs/advanced-curriculum.md` część16 i aktywny cel rozwoju do praktyki zaawansowanej. Kontynuacja i commit po dużym etapie są zatwierdzone.

## Kontrakty i podział pracy

- `src/content/atomic-state.ts`: moduł atomic-state po synchronized-state; lekcje/pojęcia atomic-rmw (po mutex-recovery), atomic-cas, atomic-limits. Eksporty atomicStateLessons/Concepts/Competencies/Sources/ReviewExercises/Module. RMW, stara wartość/wrapping, CAS/retry, ograniczenia atomowości i ABA.
- `src/content/memory-ordering.ts`: moduł memory-ordering po atomic-state; release-acquire (po atomic-limits), ordering-contracts, loom-evidence. Eksporty prefiksu memoryOrdering. Publikowanie, legalne orderings i granice dowodów modelowych. Testy adaptera nie są nazywane dowodem pełnego memory model.
- Każdy moduł: trzy pojęcia, sześć niezależnych bramek kodowych, trzy blank-page z precyzyjnym kontraktem bez sygnatury i trzy powtórki. Predykcja ma konkretny program lub scenariusz; brak obietnicy kolejności schedulera i wydajności.
- Root: laboratorium concurrency-lab z package concurrency-lab-workshop; alias std/Loom, CAS rezerwacji z granicą, jednokrotna publikacja przez konsumowany nieklonowalny Publisher i Subscriber. Test std, model i celowe kontrprzykłady. Model nie używa unsafe ani nieograniczonego oczekiwania; ma najwyżej3wątki. `Cargo.lock` i Loom0.7.2, jawne ograniczenia modelowania.
- Root: integracja course.ts, gates, reveal, archiwów i weryfikacji Cargo/CI; build, offline i regresje projektu. Stan v3 i wcześniejsze ID zostają zachowane.

## Kryteria weryfikacji

- [x] Test integracji potwierdza nowy pakiet, relacje, ujawnianie pomocy i świeże alternatywy; najpierw wynik czerwony.
- [x] Autorzy weryfikują wszystkie swoje zaufane fixture Rust2024; root recenzuje kontrakty i testy.
- [x] Zwykłe testy oraz modele uruchamiają ten sam kod biblioteki. Dwa dobre modele przechodzą, a celowe load/store i Relaxed-publication dają określoną nieudaną asercję, nigdy timeout lub błąd kompilacji jako dowód.
- [x] Model jawnie wyłącza ograniczenia liczby permutacji/czasu/preempcji; limit liczby kroków jest błędem, nie sukcesem. Dokumentacja opisuje brak pełnej obsługi wszystkich zachowań Relaxed w Loom.
- [x] Pakiet check/test/fmt/clippy i modelowe warianty; startery wymagają implementacji. Pierwsze fetch pobiera przypięte zależności, dalsze wykonania `--offline --locked`.
- [x] Lint, typecheck, Vitest, walidacja treści, rustc, audyt źródeł, build, E2E, mobile/klawiatura i offline.
- [x] Niezależna recenzja, próby wadliwych rozwiązań i poprawki, aktualizacja audytu i wyników, commit bez push.

Żadnego kodu ucznia/importu w lokalnym rustc. Zewnętrzny Playground nadal oczekuje wcześniejszej osobnej zgody. Nie redukować docelowej mapy: async, zaawansowane Cargo/API, HRTB/variance, property/fuzz, wydajność, unsafe/FFI i pełne portfolio pozostają kolejnymi etapami.

## Wynik przeglądu

Wzmocniono testy po wykryciu pozornego zaliczania load/store, ignorowania observed i publikacji bez obserwowalnego protokołu. Rozdzielono bramki RMW/flag, transakcji/wersji oraz publikacji/potwierdzenia. Zaktualizowano reguły 15 legalnych par CAS według obecnego std i rzeczywistego rustc. Poprawiono starter Option wykryty przez pełną kompilację; końcowy zakres obu modułów przeszedł 74/74. Przegląd objął 8 wadliwych rozwiązań oraz rzeczywisty model osłabionej biblioteki. Dokładne wyniki i granice: `docs/verification.md`.
