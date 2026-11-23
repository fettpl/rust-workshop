# Czasy życia, domknięcia i iteratory — plan etapu

[English](2026-09-12-lifetimes-closures-iterators.md)

**Cel:** projektować bezpieczne widoki danych, świadomie przekazywać callbacki i przetwarzać kolekcje iteratorami. Etap realizuje podstawy części 12–13 oryginalnego briefu oraz przygotowuje projekt Log Analyzer. Pełny zakres zaawansowany i ocena samodzielnej pracy pozostają otwarte.

**Architektura:** trzy niezależnie tworzone pliki treści, integrowane w istniejącym course.ts. Wspólne evaluatory, graf pojęć, mastery i persistence v3. Wykonanie szkiców ucznia nadal odbywa się wyłącznie przez izolowanego runnera. Nie potrzeba nowych zależności.

**Wymagania:** odbiorca zna podstawy programowania i zaczynał kurs bez Rust. Stable Rust, edition 2024. Każda lekcja zaczyna od problemu lub przewidywania; reguły lifetime nie poprzedzają motywującego błędu. Podpowiedź 1 wskazuje obszar, 2 regułę, dopiero rozwiązanie pełną poprawkę. Każdy koncept ma aktywną powtórkę i dwa niezależne oceniane warianty. Lokalnie kompilujemy wyłącznie autorskie fixture'y repozytorium.

- [x] src/content/lifetimes.ts: relacje wejść i wyników, struktury pożyczające, elision, dobór owned/borrowed; rzeczywiste diagnostyki i zadanie od pustej kartki. Testy sprawdzają pochodzenie widoku oraz różne zakresy danych pomocniczych.
- [x] src/content/closures.ts: przechwytywanie, move, Fn/FnMut/FnOnce i minimalne kontrakty callbacków. Testy sprawdzają kolejność/liczbę wywołań, mutację i jednokrotne zużycie danych.
- [x] src/content/iterators.ts: cztery lekcje (laziness oddzielona od składania potoków dla czytelności); pożyczanie i przenoszenie elementów, laziness, pipeline, short circuit, Iterator/IntoIterator. Testy sprawdzają efekty, pustkę, Unicode, granice i wyczerpanie.
- [x] Integracja treści i mapy. Testy potwierdzają, że użycie pomocy wymaga nowego samodzielnego wariantu. Przegląd kontraktów sprawdza silniejsze, niepotrzebne ograniczenia i pozorne zadania.
- [x] Usunięcie przewagi pierwszej odpowiedzi we wcześniejszych modułach: stabilna kolejność oparta na identyfikatorze pytania, zachowane ID odpowiedzi i Resume. Nie zmieniać zadań o znaczącej kolejności.
- [x] Sprawdzenie rzeczywistego Rust i API, aktualnych źródeł, E2E/Resume i mobile. Przegląd wizualny, klawiatura, konsola, produkcyjny offline i build.
- [x] Niezależny review każdej części, poprawki oraz aktualizacja audytu briefu i raportu weryfikacji. Commit po zweryfikowaniu etapu.

Lifetimes nie przedłużają życia danych w runtime. Właściwości związane z kompilacją sprawdzamy kompilatorem, a nie wyłącznie wynikiem uruchomienia. Koszty abstrakcji, variance, HRTB i dalsze zagadnienia zawodowe wymagają osobnego materiału oraz użycia w projektach.
