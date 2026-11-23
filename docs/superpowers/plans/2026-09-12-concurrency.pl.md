# Współbieżność i wyszukiwanie modułów — plan implementacji

[English](2026-09-12-concurrency.md)

**Cel:** Nauczyć uruchamiania i kończenia wątków, przekazywania własności kanałami oraz aktualizacji wspólnego stanu przez Arc/Mutex. Ułatwić wyszukiwanie tematów w rosnącej mapie kursu.

**Architektura:** Trzy moduły danych korzystają z istniejących evaluatorów, zapisów v3 i powtórek. Po shared-ownership następują threads, channels i synchronized-state. Wyszukiwanie filtruje istniejące karty według nazw, opisów i tematów lekcji; nie zmienia numerów modułów ani miejsca nauki. Async i atomics/Loom pozostają odrębnymi etapami pełnej mapy.

**Specyfikacja:** Oryginalny brief, późniejsza zmiana profilu odbiorcy oraz części 15–18 `docs/advanced-curriculum.md`. Kontynuacja i commit po dużym etapie są już zatwierdzone przez użytkownika.

## Kontrakty plików

1. `src/content/threads.ts`: eksporty `threadsLessons`, `threadsConcepts`, `threadsCompetencies`, `threadsSources`, `threadsReviewExercises`, `threadsModule`. Moduł `threads`, prerequisite `shared-ownership`; lekcje i pojęcia: `thread-join` (po lekcji i pojęciu `weak-links`), `thread-move`, `scoped-threads`. Tematy: spawn i JoinHandle, panika w dziecku jako wynik join, przeniesienie danych i E0373/E0382, scope pożyczający dane bez klonowania. Dwa niezależne zadania testowe na pojęcie i co najmniej jedno bez startera.
2. `src/content/channels.ts`: eksporty prefiksu `channels`; moduł `channels`, prerequisite `threads`; lekcje i pojęcia `channel-ownership` (po `scoped-threads`), `channel-lifecycle`, `channel-backpressure`. Tematy: mpsc, utrata nadawcy/odbiorcy, opróżnienie bufora przed końcem, wszyscy nadawcy muszą zniknąć, sync_channel, Full/Disconnected i zachowanie niesłanego elementu. Żadnych blokujących starterów, sleep jako synchronizacji, dowodzenia wydajności czasem ani obietnicy kolejności różnych producentów.
3. `src/content/synchronized-state.ts`: eksporty prefiksu `synchronizedState`; moduł `synchronized-state`, prerequisite `channels`; lekcje i pojęcia `send-sync` (po `channel-backpressure`), `mutex-state`, `mutex-recovery`. Tematy: Rc kontra Arc, Send/Sync i E0277, Arc nie dodaje bezpieczeństwa zawartości; MutexGuard, krytyczna sekcja, release przed callback/join, kontrola przepełnienia bez częściowej zmiany, poison jako ostrzeżenie, jawna polityka odrzucenia lub naprawa invariantu. Brak manualnych unsafe impl i uruchamialnego deadlocka. Testy utrzymują jawne niezmienniki i nie wymagają zwycięstwa określonego wątku.
4. Root: `src/content/course.ts` i integracja kryteriów; `src/engine/module-search.ts` oraz testy; komponent wyboru modułu i `overview.tsx`/CSS; E2E wyszukiwania, zachowania zaznaczenia, dostępu do świeżych alternatyw i resume. Query pozostaje lokalnym stanem widoku, bez migracji persistence. Wyszukiwanie ignoruje wielkość liter i polskie diakrytyki; słowa muszą pasować razem. Nie indeksuje rozwiązań ani szkiców ucznia.

## Zasady dowodów

- Autorskie programy Rust 2024, standard library, mała stała liczba wątków i ograniczone dane. Nigdy kod z importu/szkicu; bez zewnętrznego Playground do czasu rozstrzygnięcia istniejącej zgody.
- Predykcja pokazuje konkretny kod albo pełny scenariusz. Dokładny stdout wyłącznie po uporządkowaniu wyników przez join/kanał; wypowiedzi o schedulerze nie są fałszywą gwarancją.
- Wywołanie callbacku w nowym wątku ma dowód ThreadId, gdy to część kontraktu. Join wszystkich dzieci także po błędzie: nie wracaj wcześnie przez `?` i nie odłączaj pozostałych.
- Każde kryterium ma dwie niezależne alternatywy, aktywną powtórkę i sensowne testy; odrzucenie startera nie może wynikać z timeoutu.
- Blank-page bez startera/sygnatury, z dokładnym opisem nazw i typów wymaganego API. Hints: obszar problemu, reguła, dopiero rozwiązanie pokazuje konkretny kod.

## Etapy

- [x] Napisać testy wyszukiwania i nowe testy integracji kryteriów; potwierdzić czerwony wynik.
- [x] Autorzy dostarczają moduły w osobnych plikach, weryfikują autorskie fixture i źródła pierwotne.
- [x] Zintegrować moduły i wyszukiwanie z istniejącym UI; potwierdzić zielone testy funkcjonalne.
- [x] Niezależny review treści, kontraktów współbieżności, starterów, podpowiedzi i testów.
- [x] Lint, TypeScript, Vitest, walidacja treści, Rust, źródła, build, E2E, manualne mobile/klawiatura i offline.
- [x] Uaktualnić audyt, mapę i raport rzeczywistych wyników; wykonać commit bez push.

Weryfikacja: 110 testów Vitest, 28 E2E, pełne 1079 przypadków Rust i ponowne 44 przypadki zmienionego modułu po końcowym review, 16 odrzuconych mutantów, 143 dostępne źródła. Build i offline v11 przeszły. Szczegóły i ograniczenia: `docs/verification.md`. Plan jest częścią commita tego etapu; nie oznacza zamknięcia celu całego kursu.
