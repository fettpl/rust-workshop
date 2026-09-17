# Weryfikacja: property contracts

Data: 17 września 2026. Katalog lokalny: 134 lekcje w 36 modułach, 137 pojęć, 89 zadań blank-page, 7 śladów pamięci, 273 wpisy źródłowe i dziewięć projektów z pakietami Cargo. Cztery nowe lekcje property contracts mają osiem bramek i cztery niezależne powtórki kodowe. Zachowano wcześniejsze identyfikatory i schemat postępu v3.

## Kontrole bieżącego etapu

| Sprawdzenie              | Wynik                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vitest                   | 260/260 w 51 plikach po integracji property contracts                                                                                                                                                                          |
| Stable i dokładny Rust 1.85.0 | Property Contracts przechodzi na stable oraz w trybie `--msrv`; wcześniejsze zestawy GAT pozostają zapisane w historii                                                                                                      |
| TypeScript i ESLint      | Brak błędów; dwa wcześniejsze ostrzeżenia w borrowed-hrtb.ts                                                                                                                                                                   |
| Curriculum i źródła      | Poprawne 134 lekcje, 137 pojęć i 7 śladów; wszystkie 273 wpisy źródłowe i adresy sprawdzono                                                                                                                                    |
| Autorskie przypadki Rust | 1507/1507; bieżący Property Contracts ma 14 stałych kontraktów fixture (8 gate/blank, 2 dodatkowe recall i 4 review), a verifier pakietu przechodzi na stable oraz dokładnym Rust 1.85.0. Wynik 1453/1453 dotyczy historycznego zestawu GAT |
| Niezależne recenzje      | Implementacja Luna high; końcowy review Astra medium: APPROVED                                                                                                                                                               |
| Build                    | Pass                                                                                                                                                                                                                          |
| Offline                  | Pass z podwyższonymi uprawnieniami; cache v25, dziewięć identycznych starterów ZIP, dokładne wznowienie wcześniej nieodwiedzonego blanku property contracts i szkicu, brak pageerrors                         |
| Property Contracts Cargo | Pass na stable i exact Rust 1.85.0: przypięty Proptest 1.11.0, formatowanie, testy rozwiązania, replay regresji, Clippy, niedokończony starter i dwa kontrolowane mutanty odrzucone                               |
| Ręczny UI                | Mapa → kryterium → Monaco; czytelny prompt i starter. Klawiaturowe otwarcie blanku prowadzi do pustego edytora; brak błędów konsoli                                                                                            |

## Zakres dowodów

Stały harness obejmuje dokładnie 14 nowych kontraktów fixture: osiem zadań gate/blank (cztery główne bramki i cztery blanki), dwa dodatkowe recall w lekcjach kontrprzykładów oraz cztery niezależne review. Każde rozwiązanie referencyjne, poprawny wariant i mutant kompilują się osobno przez Rust 2024. Poprawne odpowiedzi muszą wykonać niepusty zestaw testów. Mutant musi się skompilować, a następnie zakończyć statusem 101 z rzeczywistą nieudaną asercją. Timeout, sygnał procesu i błąd kompilacji nie zastępują dowodu. Produkcyjny evaluator otrzymuje faktyczny raport Rust.

Property Contracts dodaje osobny, zaufany pakiet Cargo z biblioteką std-only i Proptest 1.11.0 jako dev-dependency. Weryfikator nie przyjmuje kodu ani ścieżek z zewnątrz: buduje wyłącznie autorskie archiwum, sprawdza lockfile, przechodzi rozwiązanie i replay `property_contracts.txt`, odrzuca starter z `todo!` oraz uruchamia dwa kontrolowane mutanty: ignorujący malformed przy aktywnym filtrze i zachowujący białe znaki parsera. Stable i exact Rust 1.85.0 są obsługiwane przez osobne tryby polecenia. Własności obejmują zadeklarowaną domenę generatora; nie są dowodem wszystkich danych, pełnego fuzzingu ani gotowości produkcyjnej.

Historyczny zestaw GAT obejmował producentów z testami kolejności, pustych elementów, tożsamości danych, lokalnych typów bez Copy/Clone, granic szerokości, dodatniego limitu prefiksów, nakładania i zachowania mutacji. Obserwatory Drop potwierdzały zatrzymanie zajętych wartości aż do zniszczenia właściciela. Regresje odrzucały błędną arytmetykę konstruktora, odwrócenie wnętrza wierszy, ignorowanie limitu, bufor pomocniczy i przedwczesne niszczenie.

Historyczny zestaw GAT obejmował też konsumentów z klientami ze slice oraz własnymi opakowaniami AsRef/AsMut, lokalnymi rekordami i nieklonowalnymi raportami pożyczającymi osobny kontekst callbacku. Testy sprawdzały kolejność zaakceptowanych raportów i kontynuację po odrzuconym raporcie. Adaptery miały sprawdzaną leniwą konstrukcję, dokładne odpytywanie, częściowe zużycie, puste elementy, odczyty posiadanych raportów po zakończeniu pożyczek i terminalność dla źródła None → Some. Zadanie od pustej kartki nie wymagało niezadeklarowanych derive; prywatny układ adaptera pozostawał dowolny.

Historyczna weryfikacja GAT sprawdzała arytmetykę nasycającą ordinali przez przegląd kodu; testy nie osiągały usize::MAX odpytań. Próby szerokości usize::MAX dotyczyły innej, rzeczywiście wykonanej granicy. Obserwacje kompilatora pokazywały E0499, ograniczenie konkretnej projekcji HRTB (E0597) i niezgodność pokazanego GAT API z dyn (E0038), wraz z poprawnymi kontrastami. Nie wynikało z tego, że każdy HRTB wymaga static lub że zwykły iterator nie może zwracać zewnętrznie pożyczonych slice.

Integracja sprawdza cztery kryteria: reveal nie nadaje samodzielności, blank pozostaje świeży, eksport/import zachowuje dowody oraz wcześniejszy szkic i notatkę. Implementację i testy wykonano na GPT-5.6-Luna high, a niezależne recenzje i końcowy przegląd całej gałęzi na GPT-6-Astra medium; końcowy review ma status APPROVED. E2E podstawia odpowiedzi runnera i nie dowodzi semantyki Rust. Lokalnie wykonuje się wyłącznie stałe autorskie źródła, nigdy szkice ucznia ani kod importowany. Nie wykonano nowego POST do publicznego Playgrounda.

## Zakłócenie środowiska

Pierwszy E2E zatrzymał się w istniejącej kontroli Axe scenariusza Tokio. Ślad obejmuje przerwę 17:52:14–18:07:12, a dziennik zasilania potwierdza uśpienie 17:52:12–18:07:13 (901 sekund). Dwa przypadki Rust zgłosiły ETIMEDOUT. Nie zmieniano implementacji, limitów ani retry. Dotknięte kontrole przeszły bez zmian; pełne powtórzenie używa tymczasowego caffeinate -i na macOS.

## CI i wydania

Etap GAT jest zapisany w commicie `4c7e499` i PR #10, scalonym jako `054a12de`. Lokalna weryfikacja i trzy zadania CI przeszły dla dokładnego head `2b6500e`, a post-merge workflow `35248633175` przeszedł dla `main@054a12de`. Stable uruchamia pełny zestaw, workspace-msrv dodatkowo trzy zestawy GAT na dokładnym Rust 1.85.0, a mini-grep-fuzz zachowuje zakres. Krok MSRV dodaje do PATH rzeczywisty katalog z rustup which: samo rustup run może nadal wybrać systemowy kompilator. Property Contracts ma osobny krok `content:property` w stable oraz workspace-msrv, z dokładnie tym samym ograniczeniem do autorskiego pakietu.

Cargo scalono w [PR #9](https://github.com/fettpl/rustcrushcourse/pull/9) jako 2a68786. Trzy zadania przeszły dla [head 520ed98](https://github.com/fettpl/rustcrushcourse/actions/runs/35234913384) i [main](https://github.com/fettpl/rustcrushcourse/actions/runs/35235866279). GAT scalono następnie w [PR #10](https://github.com/fettpl/rustcrushcourse/pull/10) jako `054a12de` z tested head `2b6500e`; po scaleniu uruchomiono osobny workflow `35248633175` na `main`. Drzewo scalenia było identyczne z testowanym head. Historyczny raport w wersji 2a68786 tego pliku opisuje Cargo, 216 testów Vitest, 1397 przypadków Rust, 50 E2E i offline v24.

Pożyczone API i angielskie README scalono w [PR #8](https://github.com/fettpl/rustcrushcourse/pull/8) jako 57c24f9, po sukcesie [CI head](https://github.com/fettpl/rustcrushcourse/actions/runs/34750981784) i [CI main](https://github.com/fettpl/rustcrushcourse/actions/runs/34832213874). Number Guessing+ scalono w [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7), Mini grep w [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), wcześniejszy etap w [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1). Zasady i ograniczenia ochrony gałęzi opisuje [CI/CD](ci-cd.md). Hosting nadal nie został wybrany.

## Odtworzenie i pozostały zakres

Polecenia pełnej weryfikacji, instalacji narzędzi i projektów opisuje angielskie README, a dokładny zestaw MSRV znajduje się w .github/workflows/ci.yml. E2E wymaga produkcyjnego serwera na 127.0.0.1:3002 i konfiguracji .github/playwright.production.config.ts z zerem retry. Offline uruchamia npm run test:offline. Na macOS długi zestaw można poprzedzić caffeinate -i.

Cel kursu pozostaje otwarty: konflikty wersji, bezpieczeństwo zależności i publikowanie, lending async, wariancja abstrakcji unsafe, pełne property/fuzz, pomiary, unsafe/FFI, utrzymanie systemów i capstone. Historia migracji i pochodzenie wersji materiału wymagają dalszej pracy. Potrzebne są pilotaż z uczącą się osobą i ręczna ocena czytnikiem ekranu. Dostępność lekcji i zielone testy nie gwarantują gotowości zawodowej.
