# Pętle i inteligentne wskaźniki — plan wdrożenia

[English](2026-09-12-loops-smart-pointers.md)

**Cel:** Uzupełnić pełny przepływ pętli oraz nauczyć własności i współdzielenia przez `Box`, `Deref`, `Drop`, `Rc`, `RefCell` i `Weak` w dziewięciu lekcjach.

**Architektura:** Trzy moduły danych korzystają z istniejących evaluatorów, powtórek i zapisu v3. Pętle są po fundamentach; dwa moduły wskaźników po Log Analyzer. Dotychczasowe identyfikatory i postęp pozostają zachowane. Wątki, `Arc`/`Mutex`, atomics i async są odrębnym następnym etapem.

**Specyfikacja:** Oryginalny brief z poprawką odbiorcy (podstawy programowania, zero Rust), części 2 i 15 w `docs/advanced-curriculum.md`. Użytkownik zatwierdził kontynuację całego kursu etapami i commit po każdym dużym etapie.

## Kontrakty i odpowiedzialność

1. `src/content/loops.ts`: eksporty `loopsLessons`, `loopsConcepts`, `loopsCompetencies`, `loopsSources`, `loopsReviewExercises`, `loopsModule`. Moduł `loops-control`, prerequisite `rust-foundations`; lekcje `while-progress` (po `foundations-assessment`), `loop-values`, `loop-control`. Koncepty o tych samych ID, pierwszy po koncepcie `control-flow`. Liczby i proste funkcje; bez nieobjaśnionych kolekcji, closures i wskaźników. Każdy starter kończy pracę: żadnych nieskończonych pętli do uruchomienia. Granice i maksymalny zakres obliczeń są jawne. Przewidywanie pokazuje różnicę między `break`, `continue`, etykietą i wartością `loop`; testy zachowania nie udają pełnej analizy składni.
2. `src/content/boxed-values.ts`: analogiczne eksporty prefiksu `boxedValues`. Moduł `boxed-values`, prerequisite `log-analyzer`; lekcje `box-recursive` (po `log-analyzer-project`), `deref-contracts`, `drop-resources`. Koncepty o tych samych ID, pierwszy po `log-deterministic-report`. Box od zwykłego właściciela do E0072 i struktury rekurencyjnej; Deref/Target i pożyczka bez kopiowania; Drop i jawne wcześniejsze oddanie zasobu przez `std::mem::drop`, E0040. Bez Rc/RefCell przed ich wprowadzeniem. Nie twierdzić, że każdy Box musi zaalokować pamięć dla ZST albo że stos jest gwarantowanym miejscem uchwytu. Ograniczyć głębokość przykładów rekurencyjnych.
3. `src/content/shared-ownership.ts`: analogiczne eksporty prefiksu `sharedOwnership`. Moduł `shared-ownership`, prerequisite `boxed-values`; lekcje `rc-sharing` (po `drop-resources`), `refcell-borrows`, `weak-links`. Koncepty o tych samych ID, pierwszy po `drop-resources`. Rc clone współdzieli, nie klonuje danych; RefCell strażnicy i try_borrow_mut z jawną odmową; Weak nie utrzymuje wartości przy życiu, upgrade może zwrócić None; rodzic jako Weak, dzieci jako Rc. Testy potwierdzają tożsamość, liczniki, widoczność zmian i zwolnienie; brak stałego cyklu celowo wyciekającego w fixture. Rc nie jest typem do współdzielenia między wątkami.
4. Root integruje dane w `src/content/course.ts`, aktualizuje roadmapę i test integracyjny kryteriów. Nowe kryteria mają co najmniej dwie niezależne alternatywy z testami; odsłonięcie pierwszej nie zalicza modułu, świeża druga pozostaje dostępna. Root przygotowuje przeglądarkowy test resume, diagnostyki i zachowania dotychczasowego zapisu przy nowej kolejności modułów.

## Zadania

- [x] Autorzy dostarczają po trzy lekcje z predict/run/interpretacją, naprawą, transferem i powtórką; każdy moduł zawiera samodzielne zadanie bez startera. Przykłady, podpowiedzi, API i testy muszą mówić o tym samym kontrakcie.
- [x] Weryfikacja lokalnym `verifyTrustedRust` obejmuje tylko autorskie fixture: poprawne rozwiązanie, odrzucenie startera, oczekiwane diagnostyki, niepusty zestaw testów. Sensowne wadliwe warianty muszą być odrzucane, m.in. kopiowanie zamiast Rc clone oraz silny rodzic zamiast Weak.
- [x] Integracja zachowuje istniejące ID i zapis. Testy modułowe sprawdzają reguły pomocy i świeżych alternatyw. Pętle są w mapie po fundamentach; pointery po dotychczasowym ostatnim module.
- [x] Niezależni recenzenci czytają kontrakty, scope danych, źródła i jakość wskazówek. Root poprawia niezgodności; nie przyjmuje samych deklaracji autora jako dowodu.
- [x] Sprawdzić lint, typy, Vitest, walidację treści, Rust, build, źródła, browser resume/mobile/klawiaturę i offline. Nie wysyłać nowych przykładów do zewnętrznego Playground bez rozwiązania wcześniejszej blokady zgody.
- [x] Zaktualizować README, audyt wymagań, mapę curriculum, stan i raport weryfikacji. Wykonać commit z faktycznym zakresem etapu, bez push.

## Granice ukończenia

Ten etap uzupełnia składnię pętli i jednowątkową własność wskaźników. Nie zamyka całej części 15 zawierającej Arc/Mutex ani docelowego kursu. Oddzielić dostępność treści, lokalne testy techniczne oraz nieprzeprowadzony jeszcze pilotaż nauczania i ocenę zawodową przez człowieka.

## Wynik etapu

Dodano także ślad `trace-rc-weak` z rozdzieleniem życia wartości i alokacji oraz jawnych uchwytów Rc/Weak. Nowe opcjonalne pola modelu nie zmieniają stanu ucznia. Testy: 102 Vitest, 25 E2E, 943 autorskie przypadki Rust i 8 odrzuconych wadliwych wariantów; pełne wyniki w `docs/verification.md`. Weryfikacja zewnętrznego Playground pozostaje poza wykonanym zestawem z powodu wcześniejszej odmowy automatycznej kontroli uprawnień.
