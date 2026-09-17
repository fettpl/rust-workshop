# Weryfikacja: GAT i lending iterators

Data: 17 września 2026. Katalog lokalny: 130 lekcji w 35 modułach, 133 pojęcia, 85 zadań blank-page, 7 śladów pamięci, 266 wpisów źródłowych i osiem projektów z pakietami Cargo. Cztery nowe lekcje mają osiem bramek i cztery niezależne powtórki kodowe. Zachowano wcześniejsze identyfikatory i schemat postępu v3.

## Kontrole bieżącego etapu

| Sprawdzenie | Wynik |
| --- | --- |
| Vitest | 239/239 w 47 plikach na stable Rust 1.98.1 |
| Dokładny Rust 1.85.0 | 21/21 w trzech plikach GAT, z przypiętą ścieżką kompilatora dla procesów potomnych Node |
| TypeScript i ESLint | Brak błędów; dwa wcześniejsze ostrzeżenia w borrowed-hrtb.ts |
| Curriculum i źródła | Poprawne 130 lekcji, 133 pojęcia i 7 śladów; wszystkie 266 wpisów źródłowych i adresów sprawdzono |
| Autorskie przypadki Rust | 1453/1453; dotknięte timeoutem zakresy powtórzone bez zmian po zablokowaniu uśpienia |
| Niezależne recenzje | Producenci, konsumenci, integracja, CI/harness i końcowy przegląd całej gałęzi zaakceptowane przez GPT-6-Astra medium |
| Build i E2E | Produkcyjny build przeszedł; pełne E2E 51/51 bez retry |
| Offline | Cache v25; osiem identycznych starterów ZIP, dokładne wznowienie wcześniej nieodwiedzonego blanku GAT i szkicu, brak pageerrors |
| Ręczny UI | Mapa → kryterium → Monaco; czytelny prompt i starter. Klawiaturowe otwarcie blanku prowadzi do pustego edytora; brak błędów konsoli |

## Zakres dowodów

Stały harness obejmuje dokładnie 12 nowych zadań: cztery główne bramki, cztery blanki i cztery powtórki. Każde rozwiązanie referencyjne, poprawny wariant i mutant kompilują się osobno przez Rust 2024. Poprawne odpowiedzi muszą wykonać niepusty zestaw testów. Mutant musi się skompilować, a następnie zakończyć statusem 101 z rzeczywistą nieudaną asercją. Timeout, sygnał procesu i błąd kompilacji nie zastępują dowodu. Produkcyjny evaluator otrzymuje faktyczny raport Rust.

Producenci mają testy kolejności, pustych elementów, tożsamości danych, lokalnych typów bez Copy/Clone, granic szerokości, dodatniego limitu prefiksów, nakładania i zachowania mutacji. Obserwatory Drop potwierdzają zatrzymanie zajętych wartości aż do zniszczenia właściciela. Regresje odrzucają błędną arytmetykę konstruktora, odwrócenie wnętrza wierszy, ignorowanie limitu, bufor pomocniczy i przedwczesne niszczenie.

Konsumenci mają klientów ze slice oraz własnymi opakowaniami AsRef/AsMut, lokalnymi rekordami i nieklonowalnymi raportami pożyczającymi osobny kontekst callbacku. Testy sprawdzają kolejność zaakceptowanych raportów i kontynuację po odrzuconym raporcie. Adaptery mają sprawdzaną leniwą konstrukcję, dokładne odpytywanie, częściowe zużycie, puste elementy, odczyty posiadanych raportów po zakończeniu pożyczek i terminalność dla źródła None → Some. Zadanie od pustej kartki nie wymaga niezadeklarowanych derive; prywatny układ adaptera pozostaje dowolny.

Arytmetykę nasycającą ordinali sprawdzono przez przegląd kodu; testy nie osiągają usize::MAX odpytań. Próby szerokości usize::MAX dotyczą innej, rzeczywiście wykonanej granicy. Obserwacje kompilatora pokazują E0499, ograniczenie konkretnej projekcji HRTB (E0597) i niezgodność pokazanego GAT API z dyn (E0038), wraz z poprawnymi kontrastami. Nie wynika z tego, że każdy HRTB wymaga static lub że zwykły iterator nie może zwracać zewnętrznie pożyczonych slice.

Integracja sprawdza cztery kryteria: reveal nie nadaje samodzielności, blank pozostaje świeży, eksport/import zachowuje dowody oraz wcześniejszy szkic i notatkę. Implementację i testy wykonano na GPT-5.6-Luna high, a niezależne recenzje i końcowy przegląd całej gałęzi na GPT-6-Astra medium. E2E podstawia odpowiedzi runnera i nie dowodzi semantyki Rust. Lokalnie wykonuje się wyłącznie stałe autorskie źródła, nigdy szkice ucznia ani kod importowany. Nie wykonano nowego POST do publicznego Playgrounda.

## Zakłócenie środowiska

Pierwszy E2E zatrzymał się w istniejącej kontroli Axe scenariusza Tokio. Ślad obejmuje przerwę 17:52:14–18:07:12, a dziennik zasilania potwierdza uśpienie 17:52:12–18:07:13 (901 sekund). Dwa przypadki Rust zgłosiły ETIMEDOUT. Nie zmieniano implementacji, limitów ani retry. Dotknięte kontrole przeszły bez zmian; pełne powtórzenie używa tymczasowego caffeinate -i na macOS.

## CI i wydania

Etap GAT nie ma jeszcze commita ani PR-a. Lokalna weryfikacja jest zakończona; przed scaleniem wymagane są commit, PR i sukces trzech zadań CI dla dokładnego head. Stable uruchamia pełny zestaw, workspace-msrv dodatkowo trzy zestawy GAT na dokładnym Rust 1.85.0, a mini-grep-fuzz zachowuje zakres. Krok MSRV dodaje do PATH rzeczywisty katalog z rustup which: samo rustup run może nadal wybrać systemowy kompilator.

Cargo scalono w [PR #9](https://github.com/fettpl/rustcrushcourse/pull/9) jako 2a68786. Trzy zadania przeszły dla [head 520ed98](https://github.com/fettpl/rustcrushcourse/actions/runs/35234913384) i [main](https://github.com/fettpl/rustcrushcourse/actions/runs/35235866279). Drzewo scalenia było identyczne z testowanym head. Historyczny raport w wersji 2a68786 tego pliku opisuje Cargo, 216 testów Vitest, 1397 przypadków Rust, 50 E2E i offline v24.

Pożyczone API i angielskie README scalono w [PR #8](https://github.com/fettpl/rustcrushcourse/pull/8) jako 57c24f9, po sukcesie [CI head](https://github.com/fettpl/rustcrushcourse/actions/runs/34750981784) i [CI main](https://github.com/fettpl/rustcrushcourse/actions/runs/34832213874). Number Guessing+ scalono w [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7), Mini grep w [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), wcześniejszy etap w [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1). Zasady i ograniczenia ochrony gałęzi opisuje [CI/CD](ci-cd.md). Hosting nadal nie został wybrany.

## Odtworzenie i pozostały zakres

Polecenia pełnej weryfikacji, instalacji narzędzi i projektów opisuje angielskie README, a dokładny zestaw MSRV znajduje się w .github/workflows/ci.yml. E2E wymaga produkcyjnego serwera na 127.0.0.1:3002 i konfiguracji .github/playwright.production.config.ts z zerem retry. Offline uruchamia npm run test:offline. Na macOS długi zestaw można poprzedzić caffeinate -i.

Cel kursu pozostaje otwarty: konflikty wersji, bezpieczeństwo zależności i publikowanie, lending async, wariancja abstrakcji unsafe, pełne property/fuzz, pomiary, unsafe/FFI, utrzymanie systemów i capstone. Historia migracji i pochodzenie wersji materiału wymagają dalszej pracy. Potrzebne są pilotaż z uczącą się osobą i ręczna ocena czytnikiem ekranu. Dostępność lekcji i zielone testy nie gwarantują gotowości zawodowej.
