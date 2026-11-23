# Uzgodnienie zakresu programu — 11 listopada 2026

[English](curriculum-reconciliation.md)

Pierwotne wymagania, ustalenia z października, wymagania dalszej
ścieżki zaawansowanej i plany 001–004 uzgodniono z lokalnie
przygotowanym programem nauki. Kurs jest dla osób znających
podstawy programowania i zaczynających Rusta od zera. Dziewiętnaście
pierwotnych tematów odpowiada 17 modułom podstawowym i ich
rozszerzeniom. Katalog obejmuje 51 modułów, 204 lekcje, 1359 kroków,
199 pojęć, 200 kompetencji, 349 źródeł i 16 projektów. Ścieżkę
podstawową, wszystkie wcześniejsze identyfikatory lekcji, pola
czasu trwania i zachowanie zapisów sprawdzono względem
zaakceptowanej bazy. Obie lekcje ewolucji schematu pomijają
metadane czasu trwania.

| Wymaganie | Bieżący materiał i sprawdzenie |
| --- | --- |
| Pierwotne tematy 0–18 | [Macierz pokrycia podstaw](#original-core-coverage) wiąże podstawy, własność i pożyczenia, testowanie, współbieżność, async i projekty końcowe z modułami. [Testy ścieżki i wymagań wstępnych](../src/content/prerequisite-entries.test.ts) rozróżniają moduły podstawowe i opcjonalne. [Testowanie i narzędzia](../src/content/testing.ts) rozdziela testy Rusta, rustfmt i Clippy i zawiera ćwiczenie w terminalu. |
| Odkrywanie, informacja z kompilatora i powtórki | [Warsztat lekcji](../src/components/lesson-workspace.tsx), [Asystent kompilatora](../src/components/compiler-coach.tsx), [silnik nauki](../src/engine/learning.ts) i [powtórki](../src/components/review.tsx) zachowują przewidywanie, uruchomienie, obserwację, wyjaśnienie, naprawę, zastosowanie w nowym zadaniu i powtórkę po przerwie. Utrzymanie kryteriów liczbowych sprawdza pomoc przed zaliczeniem samodzielnej rodziny. |
| Samodzielne zastosowanie i otwarte projekty | Zadania z pustym edytorem zachowują sprawdzalne kontrakty. [Study Session](../src/content/log-analyzer.ts) podaje problem, obserwowalne kryteria i retrospektywę. Wybór architektury i podziału kodu należy do kursanta. [Utrzymanie Capstone](capstone-change-review.pl.md) dodaje zmianę wymagań, diagnozę i przegląd. |
| Ścieżka zaawansowana i ustalenia z października | [Zaawansowany zakres](#advanced-coverage) i [realizacja ustaleń z października](#october-review-follow-through) zachowują odwołania do A1–A9. [Ponawianie przez klienta](client-retry.pl.md), [typowana autoryzacja](service-authorization.pl.md) i [ewolucja schematu pliku](file-schema-evolution.pl.md) domykają plany 001, 002 i 004. [Plan 003](../plans/003-review-assistance-gates.pl.md) opisuje osobną poprawkę obsługi pomocy. |
| Ciągłość lokalna i weryfikacja | [Zapis stanu](../src/persistence/state.ts) i świeże kontrole zgodności A12 obejmują formaty zapisów, surową historię i dokładne wznowienie. Produkcyjne testy przeglądarkowe obejmują interfejs i stan, działanie offline i pobrania. [Akceptacja A12](../plans/004-file-schema-evolution.pl.md) zapisuje odrębne kontrole pakietu natywnego i odzyskania pełnej historii. |

Audyt nie wskazał dodatkowych obowiązkowych tematów w utrzymywanej
ścieżce. Przeprojektowanie interfejsu po A6 pozostaje propozycją.
Dotychczasowe pola czasu trwania i prezentacja wprowadzenia zachowują
zgodność. Inspektor deweloperski podaje powody ocen opanowania
materiału i powtórek. Osobny ślad migracji pozostaje punktem
obserwowalności aplikacji poza zakresem programu nauki.
[Audyt wymagań produktu](requirements-audit.pl.md)

Nauka kursantów, zastosowanie wiedzy w niewidzianych zadaniach,
trwałość wiedzy i wyniki używania technologii wspomagających
wymagają osobnych obserwacji. Hostowane CI, podstawowe próby
rzeczywistego zewnętrznego wykonania, publikacja i wdrożenie mają
odrębne warunki akceptacji. Historyczne punkty zachowują pierwotne
daty i przypisanie dowodów.

# Stan źródeł ewolucji schematu pliku — 10 listopada 2026

Katalog zawiera **51 modułów, 204 lekcje, 1359 kroków, 199 pojęć,
200 kompetencji, 349 źródeł i 16 projektów**. Nawigacja zachowuje
17 modułów podstawowych i oferuje 34 rozszerzenia. Rozszerzenie po
Todo I/O dodaje dwie lekcje, 12 kroków, jedno pojęcie, jedną
kompetencję, jedną rodzinę zadań programistycznych i jeden projekt
natywny. Dotychczasowe materiały Todo i SQLite zachowują kontrakty.
Obie nowe lekcje pomijają metadane czasu trwania.
[Rozszerzenie ewolucji schematu pliku](file-schema-evolution.pl.md)

Nowy materiał zachowuje znaczenie rekordów i historię przydziału
identyfikatorów w plikach V1 i V2. Następnie uczy jawnego
zastępowania pliku przy jednym zapisującym. Testy normalizacji
w przeglądarce używają zdekodowanych wartości. Odrębny pakiet
sprawdza parsowanie bajtów i operacje na własnych plikach
testowych. Zadanie zastosowania i zadanie od zera liczą się do
jednej rodziny. Zwykła powtórka służy odtworzeniu wiedzy, a druga
lekcja służy ćwiczeniu. Dotychczasowa pomoc dotycząca rodziny
powtórki wpływa na zaliczenie kryteriów liczbowych. Samodzielne
użycie wiedzy i końcowa lokalna weryfikacja mają odrębne dowody.
Historyczne zapisy poniżej zachowują pierwotne przypisanie.

# Stan źródeł typowanej autoryzacji — 4 listopada 2026

Katalog obejmuje **50 modułów, 202 lekcje, 1347 kroków, 198 pojęć,
199 kompetencji, 349 źródeł i 15 projektów**. Ścieżka podstawowa
zachowuje 17 modułów, a rozszerzeń jest 33. Opcjonalne rozszerzenie
po utrzymaniu usług dodaje cztery lekcje, 24 kroki, dwa pojęcia i
cztery główne rodziny programistyczne. Uczy decyzji dla dokładnego
zakresu, zawężania uprawnień, własności powiązanej z żądaniem i
przyjęcia zużywającego poświadczenie. Dwie zwykłe powtórki i
aliasy z pustym edytorem zachowują dotychczasowe zasady dowodów.
Brak nowych szacunków czasu.
[Rozszerzenie typowanej autoryzacji](service-authorization.pl.md)

Zależność powiązania w przeglądarce to oznaczona deterministyczna
atrapa, a poświadczenie przyjęcia jest stałym wejściem testowym.
Odrębny pakiet natywny dostarcza rzeczywiste prywatne API
składające operacje. Syntetyczne podmioty to dane testowe.
Zakres nie obejmuje uwierzytelniania, TLS, danych
uwierzytelniających, globalnego zapobiegania powtórzeniom, rozproszonego
odwoływania uprawnień ani zmierzonych limitów zasobów. Umiejętności
kursantów, bezpieczeństwo, skuteczność i gotowość wymagają
odrębnej weryfikacji. Końcowa lokalna weryfikacja ma osobny zapis.
Publikacja, Actions i integracja zdalna pozostają wstrzymane.
Datowane punkty poniżej zachowują pierwotne liczby i dowody.

# Uzgodnienie programu nauczania 3 listopada 2026 r.

Przegląd ten godzi oryginalne podstawowe 0 tematyki18, czternaście zaawansowanych
obszarów i osiemnaście priorytetów z października przeglądu programu nauczania.
Publiczność posiada podstawową wiedzę programową i rozpoczyna Rust od zera.

Przyjęta wartość odniesienia A8 zawiera **48 modułów, 196 lekcji, 1,305 kroków, 194 koncepcji, 195 kompetencji, 349 źródeł i 13 projektów do pobrania**. Nawigacja zawiera 17 modułów podstawowych
/ 74 lekcji i 31 rozszerzeń / 122 lekcji. Oryginalny, numerowany zarys tematu to mapa
pokrycia; jego dziewiętnaście rzędów nie jest dziewiętnastoma modułami nawigacyjnymi.

A9 zachowuje te liczby i IDs. Zaostrza on opis stałego typu powrotów `R` na etapie
modelu `MutSlot::with_mut` i wymaga prawdziwie nowej neutralnej ekspozycji własnościowej po ponownym
załadowaniu w trybie offline. Silnik, rodziny oceniające, zasady kredytowe, przykłady
rusty i zawartość projektu do pobrania pozostają niezmienione. Historyczne kontrole
zgodności przywracają tylko dokładne zmienione zdanie przed zastosowaniem istniejących
A8 → A7 → C1 projekcje.

## Interpretacja

Autoryzowana dostępność oznacza, że kurs oferuje temat lub możliwość praktyki. Test
referencyjny, prowadzenie opiekuna i uczenie się jako niezależne dowody są osobnymi
obserwacjami. Obecne metadane kalibracyjne wybierają 20 koncepcji: 17 wersji-2 i 3
wersje-1, 42 wiersze koncepcyjno-rodzinne, 39 unikalnych rodzin i 19 pojęć spełniających
ich autorskie minimum. Wstęp koncepcyjny stack/heap celowo nie ma rodziny kodującej. Liczby te
opisują materiał; nie mierzą osiągnięcia ucznia.

<a id="original-core-coverage"></a>

## Oryginalny zakres bazowy

| Obszar | Autorska dostępność i źródło | Zakres weryfikacji / pozostająca obserwacja ucznia |
| --- | --- | --- |
| 0 | Fundamenty, modules/Cargo i powierzchnie przestrzeni roboczej. [foundations.ts](../src/content/foundations.ts), [modules-cargo.ts](../src/content/modules-cargo.ts), [course.ts](../src/content/course.ts) | Istniejące oryginalne kontrole i powierzchnie opakowań. Brak publikacji, działań uzależniających lub powtarzalnych wyników budowy. |
| 1 | Wiązania, mutacyjność, scalar/function/expression Ćwicz. [foundations.ts](../src/content/foundations.ts) | Przeciążone zadania wykonywalne. Początkujący płynność i transfer niezachwiany. |
| 2 | while/loop/continue/label umowy. [loops.ts](../src/content/loops.ts) | Autoryzowane zadania pętli. Zatrzymanie i przeniesienie nieodebrane. |
| 3 | Scope/drop dostępność; stack-heap Celowo konceptualny. [catalog.ts](../src/content/catalog.ts), [ownership-foundation-transfer.ts](../src/content/ownership-foundation-transfer.ts) | Drop/ownership umów o przeniesienie. Brak fizycznego układu czy opanowania. |
| 4 | Move/Copy/function/shared/mutable rodziny własności. [course.ts](../src/content/course.ts), [ownership-foundation-transfer.ts](../src/content/ownership-foundation-transfer.ts) | Aktualny spis rodzinny z testami. Dostępność nie jest kredytem dla osób uczących się ani wynikiem uczenia się całego kursu; uprzednia akceptacja jest odrębną granicą dowodową. |
| 5 | Pożyczanie pożyczek, pożyczki mutacyjne, plasterki i powiązane String/UTF-8. [modeling.ts](../src/content/modeling.ts), [collections.ts](../src/content/collections.ts) | Collection/borrow kontrakty i testy. Transfer szerszy cost/text-processing pozostaje ograniczony. |
| 6 | Zapisy, metody, enums, Opcja i mecz. [modeling.ts](../src/content/modeling.ts), [nested-patterns.ts](../src/content/nested-patterns.ts) | Naprawiono zadania modelingu. Nie obserwowano nieograniczonego modelowania ucznia. |
| 7 | Vec/String/HashMap i kompozycja iteratora. [collections.ts](../src/content/collections.ts), [iterators.ts](../src/content/iterators.ts) | Kolekcja i iterator oprawy. Brak uniwersalnego complexity/performance roszczenia. |
| 8 | Rezultat,?, panika i błędy domeny. [error-handling.ts](../src/content/error-handling.ts), [todo-project.ts](../src/content/todo-project.ts), [public-api-evolution.ts](../src/content/public-api-evolution.ts) | Error-handling/project umów. Polityka naprawy gospodarczej całego systemu pozostaje ograniczona. |
| 9 | Moduły, skrzynie, opakowania i ładunki. [modules-cargo.ts](../src/content/modules-cargo.ts), [cargo-dependency-lifecycle-module.ts](../src/content/cargo-dependency-lifecycle-module.ts) | Prawdziwe package/workspace wyposażenie. Brak zgłoszenia na żywo publication/advisory. |
| 10 | Parametry ogólne, granice i konsumenci. [generics.ts](../src/content/generics.ts), [traits.ts](../src/content/traits.ts) | Generic/trait zadań. Otwarta architektura i racjonalne koszty nie zostały uwzględnione. |
| 11 | Traits, associated types, dyn and public clients. [traits.ts](../src/content/traits.ts), [public-api-module.ts](../src/content/public-api-module.ts), [api-release-matrix.ts](../src/content/api-release-matrix.ts) | API compatibility/package osprzęt. Pełna SemVer polityka pozostaje ograniczona. |
| 12 | Lifetimes, variance, HRTB i GAT. [lifetimes.ts](../src/content/lifetimes.ts), [borrowed-variance.ts](../src/content/borrowed-variance.ts), [borrowed-hrtb.ts](../src/content/borrowed-hrtb.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Borrowed/MutSlot/Miri umów. Krajowy zakres i transfer uczących się pozostają ograniczone. |
| 13 | Zamknięcia, iteratory i pożyczki. [closures.ts](../src/content/closures.ts), [iterators.ts](../src/content/iterators.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Wykonywalne zadania closure/iterator. Brak uniwersalnego wyniku refactoring/performance. |
| 14 | Unit/integration/doc/property/fuzz fundamenty. [testing.ts](../src/content/testing.ts), [property-contracts-module.ts](../src/content/property-contracts-module.ts), [fuzz-evidence-module.ts](../src/content/fuzz-evidence-module.ts) | Niezależna wyrocznia i ograniczone sprzęty mutantów. Nie ma kompletności ani wyniku ludzkiego przeglądu. |
| 15 | Box/Deref/Drop/Rc/RefCell/Weak. [boxed-values.ts](../src/content/boxed-values.ts), [shared-ownership.ts](../src/content/shared-ownership.ts) | Ślady własności "Smart-Pointer". Brak ogólnych kompetencji w zakresie współzależności ze śladami Rc. |
| 16 | Gwinty, kanały, Arc/Mutex, atomy i zamówienia. [threads.ts](../src/content/threads.ts), [channels.ts](../src/content/channels.ts), [synchronized-state.ts](../src/content/synchronized-state.ts), [atomic-state.ts](../src/content/atomic-state.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Ograniczone concurrency/Loom modele. Brak twierdzeń dotyczących wszystkich wzajemnych powiązań lub powszechnych postępów. |
| 17 | Async/Tokio/cancellation/Send/service powierzchni. [async-foundations.ts](../src/content/async-foundations.ts), [tokio-runtime-tasks.ts](../src/content/tokio-runtime-tasks.ts), [tokio-flow-control.ts](../src/content/tokio-flow-control.ts), [tokio-io-modules.ts](../src/content/tokio-io-modules.ts), [tokio-network-module.ts](../src/content/tokio-network-module.ts), [async-lending-module.ts](../src/content/async-lending-module.ts) | Bieżące cancellation/Send rodziny i ograniczone oprawy protokołu. Bezpieczeństwo transportu, uwierzytelnianie, rozmieszczanie i transfer osób uczących się pozostają poza ograniczonymi ćwiczeniami w zakresie usług lokalnych. |
| 18 | Badanie Session/open-K i service/capstone możliwości architektury. [log-analyzer.ts](../src/content/log-analyzer.ts), [service-operations.ts](../src/content/service-operations.ts), [capstone-integration.ts](../src/content/capstone-integration.ts) | Kontrakty na projekty i opcjonalne A6/A8 pakiety. Uczniowska dekompozycja, logika i niewidzialny transfer są niezachowane, a nie nieobecne od autorskiej treści. |

<a id="advanced-coverage"></a>

## Zaawansowane pokrycie

| Obszar | Autorska dostępność i źródło | Zakres weryfikacji / pozostająca obserwacja ucznia |
| --- | --- | --- |
| library-api-semver | Publiczny API/compatibility Ćwicz. [public-api-module.ts](../src/content/public-api-module.ts), [api-release-matrix.ts](../src/content/api-release-matrix.ts) | A6 kontrola pakietu zmienionych klientów. Nie ma publikacji ani dowodu na Cargo. |
| cargo-workspaces-msrv | Workspace/features/MSRV/dependency koncepcje. [modules-cargo.ts](../src/content/modules-cargo.ts), [cargo-dependency-lifecycle-module.ts](../src/content/cargo-dependency-lifecycle-module.ts) | Offline package/workspace oprawy. Brak operacji na żywo publication/advisory. |
| traits-generics-lifetimes | Generic/dyn/associated/HRTB ścieżki. [generics.ts](../src/content/generics.ts), [traits.ts](../src/content/traits.ts), [lifetimes.ts](../src/content/lifetimes.ts), [borrowed-hrtb.ts](../src/content/borrowed-hrtb.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Zadania ograniczone API. Brak międzyprojektowego projektu. |
| iterators-closures | Iterator/closure Ćwicz. [closures.ts](../src/content/closures.ts), [iterators.ts](../src/content/iterators.ts) | Wykonalne zadania kompozycji. Brak uniwersalnych żądań prędkości. |
| smart-pointers | Pointer/ownership decyzji. [boxed-values.ts](../src/content/boxed-values.ts), [shared-ownership.ts](../src/content/shared-ownership.ts), [synchronized-state.ts](../src/content/synchronized-state.ts) | Ograniczone scenariusze własności. Tylko zakres scenariuszy. |
| send-sync-atomics | Konkurować i zamawiać pojęcia. [synchronized-state.ts](../src/content/synchronized-state.ts), [atomic-state.ts](../src/content/atomic-state.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Małe model/Loom granica. Nie. all-interleaving/progress roszczenie. |
| async-tokio | Async/Tokio Przepływ i anulowanie. [async-foundations.ts](../src/content/async-foundations.ts), [tokio-runtime-tasks.ts](../src/content/tokio-runtime-tasks.ts), [tokio-flow-control.ts](../src/content/tokio-flow-control.ts) | Osprzęt ograniczonego rurociągu plus przyjęte A8 maintenance/recovery urządzenia do kontroli śladów i odrzutów. Utrzymywane odniesienie nie określa transferu uczącego się ani gotowości do produkcji. |
| robust-errors | Projektowanie błędów warstwowych. [error-handling.ts](../src/content/error-handling.ts), [public-api-evolution.ts](../src/content/public-api-evolution.ts) | Domain/API zadania błędów. Brak roszczeń z tytułu polityki całego systemu. |
| property-fuzz-miri-loom | Risk/tool-selection koncepcje. [property-contracts-module.ts](../src/content/property-contracts-module.ts), [fuzz-evidence-module.ts](../src/content/fuzz-evidence-module.ts), [unsafe-miri.ts](../src/content/unsafe-miri.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Fixture-specific property/fuzz/Miri/Loom kontroli. Brak uniwersalnego completeness/soundness. |
| benchmark-profile-allocation | Workload/proxy/profile planowanie z ograniczonym obciążeniem pracą autorstwa A7. [performance-evidence.ts](../src/content/performance-evidence.ts), [profile-evidence.ts](../src/content/profile-evidence.ts), [runtime-allocation-evidence.ts](../src/content/runtime-allocation-evidence.ts) | Przyjęte A7 stabilne i dokładne Rust 1.85 Kryterium działa, niezależne literal/replay wyroczni, nazwany oczekiwany mutant odrzucenie i lokalnych browser/state/restore wpływów. Nakład pracy nie jest niewdrożony lub tylko częściowy, ale jego lokalne wpływy nie określają uniwersalnego performance/RSS, skuteczności uczenia się ani transferu. |
| unsafe-ffi | Unsafe/FFI Invariants over four two-family authorised concept pair: ByteView/initialized-prefix, disjoint-regions/disjoint-ranges, Slot-state/lazy-init i MutSlot/with-mut. [unsafe-ffi.ts](../src/content/unsafe-ffi.ts), [unsafe-miri.ts](../src/content/unsafe-miri.ts), [unsafe-borrowed-memory.ts](../src/content/unsafe-borrowed-memory.ts) | Ograniczone uchwyty bezpieczeństwa i kontrole rodzime obejmują autentyczną dostępność; wartości rejestru 20/42/39/19 to liczba dostępności, nie wyniki uczenia się ani uniwersalny zasięg Miri. Brak uniwersalnego twierdzenia o szkodliwej solidności; zakres native/fixture i transfer osób uczących się pozostają ograniczone. |
| architecture-observability | Otwarta sesja studyjna i service/capstone możliwości architektury. [service-operations.ts](../src/content/service-operations.ts), [capstone-integration.ts](../src/content/capstone-integration.ts), [log-analyzer.ts](../src/content/log-analyzer.ts) | Ograniczone pakiety serwisowe i książki startowe. Learner choice/rationale/transfer nieznany. |
| security-operations | Model zagrożenia i granice operacyjne. [service-operations.ts](../src/content/service-operations.ts), [durable-log-service.ts](../src/content/projects/durable-log-service.ts) | Lokalne trust/archive kontrole. Brak wniosku doradczego dotyczącego produkcji security/hosting/live. |
| code-review-decisions | Review/disposition Ćwicz. [capstone-change-review.md](../docs/capstone-change-review.pl.md), [capstone-maintenance-lesson.ts](../src/content/capstone-maintenance-lesson.ts) | Samoocena i ograniczone oprawy pakietów. Nie ma niezależnej ludzkiej recenzji ani wyników uczenia się. |

<a id="october-review-follow-through"></a>

## Październikowy przegląd następstw

| Obszar | Autorska dostępność i źródło | Zakres weryfikacji / pozostająca obserwacja ucznia |
| --- | --- | --- |
| corrected-beginner-audience | Rust-from-zero/basic-programming Publiczność jest udokumentowana. [README.md](../README.pl.md), [onboarding.tsx](../src/components/onboarding.tsx) | Copy/source Tylko przegląd. Nie ma pilota ani dowodów gotowości. |
| beginner-route | Core17/extensions31 nawigacja. [course-route.ts](../src/engine/course-route.ts), [course.ts](../src/content/course.ts) | Route/search czeki. Brak wniosków o gotowość. |
| stable-resume-history | Stabilne IDs, wznowienie, projekty, notatki i umowy historyczne. [state.ts](../src/persistence/state.ts), [lesson-workspace.tsx](../src/components/lesson-workspace.tsx) | Persistence/compatibility/browser osprzęt. Brak informacji o chmurze lub wyniku uczenia się. |
| neutral-navigation | Ekspozycja oddzielona od ocenianych dowodów. [learning.ts](../src/engine/learning.ts), [verify-offline.mjs](../scripts/verify-offline.mjs) | Testy na temat polityki w zakresie zdarzeń surowych. Ekspozycja nie jest dowodem niepodległości. |
| exact-concept-subsets | Dokładny bieżący concept/family metadane. [course.ts](../src/content/course.ts) | Resolver/compatibility kontrole. Dowody rodzinne innych modułów pozostają ograniczone. |
| two-unaided-families | Obecna polityka wyboru rodziny. [learning.ts](../src/engine/learning.ts), [catalog.ts](../src/content/catalog.ts) | Testy backed rodzinny inwentarz. Dostępność nie jest potwierdzeniem ucznia. |
| assistance-recovery | Chronology/help/recovery polityka. [learning.ts](../src/engine/learning.ts) | State/recorder regresje. Brak świeżej niezależności po wyczerpaniu. |
| historical-evidence-policy | Surowa historia i polityka wersji zachowana. [state.ts](../src/persistence/state.ts), [learning.ts](../src/engine/learning.ts) | Projection/hash kontroli. Wydarzenia historyczne nie są aktualnym potwierdzeniem. |
| delayed-retrieval | Opóźnione przeglądy zasad i ćwiczeń. [review-session.ts](../src/engine/review-session.ts), [review.tsx](../src/components/review.tsx) | Regresja chronologiczna. Brak mierzonego zatrzymania. |
| compiler-led-cycle | Modify/debug/compiler przepływ informacji zwrotnych. [compiler-coach.tsx](../src/components/compiler-coach.tsx), [lesson-workspace.tsx](../src/components/lesson-workspace.tsx) | Sprężyny fixtures/mutants. Brak kodu arbitralnego lub ogólnego dowodu biegłości. |
| completion-confirmation | Completion/history/current Potwierdzenie oddzielone. [learning.ts](../src/engine/learning.ts), [overview.tsx](../src/components/overview.tsx) | Kontrola chronologii stanu. Brak roszczeń o globalną biegłość. |
| blank-page-portfolio | Istniejące ograniczone zadania plus otwarta możliwość sesji studyjnej. [log-analyzer.ts](../src/content/log-analyzer.ts), [capstone-maintenance-lesson.ts](../src/content/capstone-maintenance-lesson.ts) | Stałe APIs i umowy projektowe. Przekaz należący do Learnera decomposition/rationale/unseen nie został zrealizowany. |
| ordinary-core-fluency | Dopasowywanie, Option/Result, pożyczone kolekcje, konwersje, iteratory i API powierzchnie do odczytu. [modeling.ts](../src/content/modeling.ts), [error-handling.ts](../src/content/error-handling.ts), [iterators.ts](../src/content/iterators.ts) | Istniejąca praktyka wykonywalna. Płynność całego kursu i głębokość debugowania nie została zachowana. |
| reading-estimates | Protokół legacy pozostaje kompatybilny z metadanymi; proponowana nawigacja wykorzystuje cele i kolejne działania. [types.ts](../src/domain/types.ts) | Po A6 UI wniosek usuwa organizację opartą na czasie trwania. Nie zgłasza się danych szacunkowych dotyczących czasu nauki ani harmonogramu; przeprojektowanie produkcji jest odroczone. |
| dostępność | Keyboard/focus/small-screen mechanika. [code-editor.tsx](../src/components/code-editor.tsx), [save-status-announcer.ts](../src/components/save-status-announcer.ts) | Ścieżki ograniczone browser/Axe-style. Brak pełnych screen-reader/assistive-tech lub danych dotyczących skuteczności; brak blokowania przyszłej oceny. |
| dated-current-snapshot | Dated source/evidence dokumentację. [curriculum-reconciliation.md](../docs/curriculum-reconciliation.pl.md) | Przyjęte A8 źródło i prawdziwe przed- A9 registry/state przechwytywania; A9 zmienia jeden model-szybkie zdanie i świadka weryfikatora offline. Historyczne migawki zachowują oryginalne daty i liczby. |
| product-review | Educational/UX/engineering kryteria przeglądu. [curriculum-review-2026-10-06.md](../docs/curriculum-review-2026-10-06.pl.md) | Przyjęte A6, C1, A7 i A8 pakiety lokalne z niezależnymi przeglądami źródeł i dowodów. Automatyczne akceptowanie nie zastępuje obserwacji osób uczących się. |
| pilot-efficacy-readiness | Wymogi dotyczące oceny udokumentowane wyłącznie. [curriculum-review-2026-10-06.md](../docs/curriculum-review-2026-10-06.pl.md) | Żaden nie twierdził. Pilot, skuteczność, gotowość zawodowa i starszeństwo nadal nie blokują przyszłych roszczeń. |

## Ostatnie lekcje i granice utrzymania

A6 dodaje opcjonalną konserwację biblioteki i praktykę zmiany klienta bez nowej rodziny
podstawowej. C1 naprawia pięć istniejących umów: puste, niewyraźne pochodzenie,
dokładny przydział error/retry kontroli, sformułowanie w formacie "shared-read" ByteView dotyczące
bezpieczeństwa, pożyczone ogólne sformułowanie własności oraz wyrażenie w podziale na
kategorie. Dane referencyjne pozostają starymi modułami pomocniczymi i przewidywanymi w
przeszłości haszami.

A7 jest wdrażany i akceptowany lokalnie. Jego sześciostopniowy opcjonalny warsztat
wydajności towarzyszy 2,048-rekordowy utrzymujący obciążenie pracą przy rzeczywistych
pomiarach stable/MSRV. Czas jest uzależniony od tego obciążenia pracą i środowiska. W arkuszu
roboczym dla uczących się prosi się o inne obciążenie pracą, niezależną wyrocznię,
alternatywy i reakcję na przegląd. Zob. [Badanie skuteczności działania](performance-investigation.pl.md).

A8 jest wdrażany i akceptowany lokalnie. Jego 6-stopniowy opcjonalny warsztat capstone
dodaje do niego własny plan konserwacji i referencyjny ślad odzysku. Trwały projekt
zachowuje oryginalne sześć ocenianych lekcji, dwanaście bram i sześć przeglądów
wyszukiwania; załączona lekcja praktyki nie dodaje podstawowej kredytowej kodowania.
Obecne archiwa zawierają czterdziestu autorów i pięć ogłoszeń kanonicznych. Wstęp na
uprzęże, wyniki przechowywania i dostarczanie odpowiedzi pozostają różne. Patrz [Zaawansowany program nauczania](advanced-curriculum.pl.md) oraz
[Przegląd zmian w Capstone](capstone-change-review.pl.md).

Study Session CLI oferuje już otwarte zadanie architektury: uczeń wybiera typy, rozkład, politykę
błędów i uzasadnioną zmianę. A6/A8 rozszerzyć tę możliwość na decyzje alimentacyjne.
Pozostałą obserwacją jest uczeń, który posiada własny projekt, uzasadnienie i
niewidzialny transfer; inna lekcja portfelowa nie jest wymagana wyłącznie w celu
stworzenia możliwości, która już istnieje.

## Struktura kursu oraz UI kierunek

Oddzielnie zrewidowany wniosek po A6 organizuje nawigację wokół następnego użytecznego
działania i celów uczenia się, z jasną bazową trasą i tematycznych rozszerzeń półek.
Wykorzystuje cele, warunki wstępne i obserwowalną działalność zamiast szacunków 10/15/20-minute
dotyczących uczenia się. Wartości legacy `minutes` pozostają danymi kompatybilnymi.

Proponowana lekcja daje zadaniu, edytorowi i wyjścia jasny priorytet, z oddzielnymi
widokami mobilnymi. Dokonywanie, ocenianie dowodów i pomocy nadal jest możliwe do
odróżnienia. Zachowuje on wszystkich oceniających, Compiler Coach i surowej diagnostyki, awaryjnego
wydania edytora, tryb focus, motywy, notatki, zakładki, surowa historia, import/export, dokładne
wznowienie, wykorzystanie w trybie offline, raportowanie o błędach i inspektor
deweloperski. Rzeczywisty przegląd terminów i techniczne wskaźniki wykonania zachować
ich znaczenie.

Dokument ten zawiera wniosek, a nie projekt produkcji. Obserwacje z uczącymi się i
technologie wspomagające mogą informować o późniejszym wdrożeniu; nie ma gwarancji czasu
trwania uczenia się, skuteczności ani starszeństwa zawodowego.

## Lokalna granica akceptacji

Lokalne A9 pakiet walidacji wiąże akceptowane źródło do autentycznego rejestru
preedycji i V1/V2/V3 przechwytywania stanu, bieżące compatibility/unit kontrole, świeże produkcji build,
apartament przeglądarki i formalny offline uruchomić. Niezmienione Rust/native wyniki zachowują
swoje oryginalne zaakceptowane A8 elementy wejściowe i narzędzia; nie są one
reprezentowane jako świeżo przeprowadzone A9 kontrole. Lokalne przywrócenie kopii
zapasowych i niezależna ocena zamykają kamień milowy. Hosted Actions, pupation and
public release pozostaje oddzielną przyszłą operacją.

## Niezależna praktyka po listopadowej ocenie napraw

Świeży inwentarz w `ca9f08a` znalazł 51 modułów, 204 lekcji, 1,360 kroków i 16 projektów do
pobrania. Z tych kroków, 506 uruchomić testy i 73 użyć rubric. Te liczby lokalizują
możliwości praktyki. Aby ocenić niezależność uczącego się, w przeglądzie zbadano
również, jakie szybkie dostawy, które decyzje podejmuje uczeń, jakie artefakt produkują
i jak mogą je ponownie odwiedzić.

| Punkt kontrolny | Praca, którą posiada uczeń | Jak ją interpretować? |
| --- | --- | --- |
| Ceny parcel w fundacjach | Wybierz reprezentację powrotną, pisz testy graniczne i obserwować prawdziwe błędne twierdzenie w lokalnym projekcie Cargo. | Uczeń rejestruje lokalną obserwację. |
| Rezerwacje w modelowaniu danych | Wybierz typy i API, a następnie zmienić regułę anulowania. | Rubryka prosi o projekt i przykłady. |
| Sprawozdanie w iteratorach | Decyduj o reprezentacji, pożyczaniu, błędach i wiązaniu zachowania, a następnie dostosowuj zmieniony wymóg. | Wiele projektów może zadowolić krótki. |
| Study Session CLI na końcu rdzenia | Wybierz typy, strukturę rozkładu i struktury danych, dostarcz rzeczywiste CLI wyjście i zaimplementuj filtr follow-up z pokryciem regresji. | Kod i jego wykonanie należą do uczącego się. Niezależny recenzent może zbadać artefakt. |

**Wybrane naprawy.** Ostateczny etap Log Analyzer wcześniej zaoferował powrót do mapy. Jego osobny widok na
projekt zawierał przydział sesji studyjnej, a retrospektywne wspólne miejsce projektu z
Log Analyzer obserwacji. Regresja chromowa na etapie tworzenia produkcji przed zmianą
potwierdziła, że punkt końcowy nie został włączony do badania. To wpłynęło na przejście
od całego rdzenia do jego niezależnego zadania. Punkt końcowy i projekty ujawniają teraz
ten sam krótki opis i zachowują projekt, test, wyniki pracy, regresję po zakończeniu
nauki oraz pozostałe ograniczenia jako odrębne uwagi. Notatnik i postęp eksportu nosić
te notatki. Pisanie ich nie jest ani kompilatorem, ani mistrzostwem.

**Działania następcze w związku z audytem praktyki**

1. **Sformułowanie własności naprawione lokalnie.** Poprzedni rzeczoznawca dokładnej odpowiedzi odrzucił ważne wyjaśnienie zaciągania
   pożyczek w języku polskim. W zmienionym scenariuszu uczący się wyjaśnia wymogi
   dotyczące życia i własności własnymi słowami i porównuje to wyjaśnienie z rubryką.
   Oddzielne wybory sprawdzają, jak zachować niezależne migawki i jak pokazać podgląd
   tylko do odczytu. Wcześniejsze zgłoszenia tekstowe zachowują swoją pierwotną
   historię. Trzy Log Analyzer przywołują sugestie teraz akceptują wyjaśnienia w formie wolnej.
   Uczniowie porównują swój własny rachunek granic parsera, walidacji przed filtrowaniem
   i deterministycznym wyjściem z odrębnymi kryteriami. Te kontrole rejestrują
   samoocenę; wykonywalne ćwiczenia nadal weryfikują zachowanie.
2. **Kryteria zamknięcia Tokio naprawione lokalnie.** Moduł kontroli przepływu rejestruje dwa niezależne wyniki: opróżnianie
   zaakceptowanej pracy po zamknięciu przyjęcia i zbieranie wyników każdego dziecka po
   zatrzymaniu sygnalizacji. Moduł strumieni rejestruje zamykanie i opróżnianie
   odbiornika oddzielnie od nadawania priorytetu stopu przy jednoczesnym zachowaniu
   następnego elementu. Istniejące sukcesy podążają za oryginalnymi referencjami
   zadaniowymi. Dodatkowe ćwiczenie przyłączenia się dwóch pracowników utrzymuje nową
   drogę do tego kryterium po obejrzeniu rozwiązania projektu rurociągu.
3. **Praktyka zbierania raportów.** Pod koniec lekcji HashMap uczący się wybierają sposób reprezentowania powtarzanych
   nazw, wdrażają uporządkowany pod nazwą raport i zachowują ten pogląd, gdy
   sprawozdanie z incydentu wymaga pierwszorzędnego porządku. Autor sprawy regresji z
   jego oczekiwanych wierszy i liczy. Ćwiczenie przeprowadza ich sprawdzenie w oparciu o
   poprawny raport, uporządkowany raport i raport, który traci powtarzające się liczby.
   Wybór reprezentacji i jej koszt są zapisywane w notatkach uczącego się. [Ćwiczenie](../src/content/collections-event-report.ts)

W przeglądzie wykorzystano inspekcję katalogową, pobieranie próbek z oryginalnych
zaproszeń, oceniających aplikację i nawigację przeglądarki. Retencja ucznia i jakość
przedstawionego projektu wymagają obserwacji rzeczywistej pracy.

## Audyt następczy po naprawie Log Analyzer

Podczas lokalnego przeglądu `7179689` katalog miał 51 modułów, 204 lekcji i 1,363 kroków.
Audyt inventoried ewaluatorzy lekcji, niezależne zadania kodowania i kryteria modułowe w
całym katalogu, następnie wyznaczył wybrane kryteria do ich faktycznych sugestii, Rust
testów i zasad postępu. Liczenie pustych edytorów tylko podupadają otwarte praktyki:
warsztaty kolekcje, na przykład, dostarcza interfejs publiczny, pozostawiając strukturę
danych i przypadek regresji dla uczącego się.

**Wybrane znalezienie podstawowego przepływu kontroli.** Pojedyncze udane `flow-modify` złożenie (rozszerzenie dostarczonej pętli o jeden numer)
spełniło kryterium łączenia zakresu i warunku. Jego dostarczony roztwór nie ma żadnego
stanu. Prowadzący `flow-transfer` dodatkowo zaopatruje obie konstrukcje. W przypadku tego kryterium
istniało już silniejsze wejście wieloetapowe `flow-range-transfer`, ale było ono fakultatywne. To miało
wpływ na postęp w pierwszym module, w tym uczących się, którzy nigdy nie wdrożyli
połączone zachowanie.

Zrewidowane kryterium akceptuje jeden niezależny test rustykalny wynikający z dwóch
odrębnych zadań: liczenie wartości kwalifikowanych w półotwartym przedziale lub wycena
trasy uwzględniającej, której stopa procentowa zmienia się na poziomie progowym. Puste
zakresy, zakresy singleton i granice progowe odróżniają zachowania. Drugie zadanie
rozpoczyna się od pustego edytora i pozostaje dostępne po pomocy na pierwszym.
Wcześniejszy ważny niezależny sukces w zadaniu liczenia nadal kwalifikuje. Uzupełnianie,
projekty i surowe dowody pozostają w historii; sam sukces z przewodnikiem pozostawia
zmienione kryterium otwarte. Ta zmiana dotyczy bramy modułu. Testy behawioralne ustalają
określone wyniki bez wywoływania konkretnej składni pętlowej lub przekalibrowania
ogólnego opanowania koncepcji.

**Pozostali kandydaci.** Trzy lekcje obsługi błędów zawierają sześć możliwych do wykonania napraw lub
modyfikacji obejmujących granice odzysku, rozprzestrzeniania się i paniki. Ich sugestie
zazwyczaj dostarczają zarówno rodzaju błędu, jak i polityki naprawy. Późniejsze
niezależne zadanie może poprosić uczącego się o wybranie tej polityki i uzasadnić, które
błędy można odzyskać od dzwoniącego. Oddzielnie, dwa pomiarowe polecenia wycofania
przydziału i dwa usługi-klient retry/receipt nasuwa nadal jedną akceptowaną odpowiedź prozy;
odbiornik async-pożyczki i adapter przypomnienia pozwalają tylko na małą listę zwrotów.
Propozycje te wymagają kontroli brzmienia wraz z ich wykonalnymi umowami. Był to katalog
i audyt zachowania; retencja ucznia nie była mierzona.

## Polityka naprawy gospodarczej i drugi audyt pożyczonych wyników, 19 listopada 2026 r.

Warsztaty obsługi błędów wymagają teraz od uczącego się wyboru klienta raportującego i
decydowania, czy brakujący pomiar zatrzymuje import, czy też powoduje liczenie
ostrzeżenia. Obie polityki są wykonalne. Pomiar nieprawidłowo ukształtowany zawsze
zatrzymuje import i identyfikuje pierwszy odrzucony wiersz źródłowy. Uczenie się jest
właścicielem wdrożenia i wyjaśnia kompromis w ich notatniku. Oceniający Rust sprawdza
zgodność z deklarowaną polityką; notes przechowuje uczącego się do analizy rozumowanie.

Sześć wcześniej oznaczonych wezwań do przypomnienia akceptuje teraz wyjaśnienia w
słowach uczącego się. Drugie podanie znalazło się również w przyległym cancellation/commit pytaniu o to,
kiedy kursor może się posunąć, z tylko dwoma przyjętymi wyrażeniami. Wszystkie siedem
teraz porównać niepuste wyjaśnienie z wyraźnymi kryteriami samooceny. Istniejące bramki
kodowania i zaplanowane recenzje Rust nadal ćwiczą zachowanie. Wcześniejsza odpowiedź na
wydarzenia, pomoc, projekty i próby zachowują swoją oryginalną tożsamość.

Po tych naprawach skan katalogowy obejmował 51 modułów, 204 lekcji i 1365 kroków.
Porównała ona oceniających z możliwościami wynikającymi z kryteriów modułów i sprawdziła
odniesienia do wspólnych zadań w rdzeniu. Współdzielone odniesienia mogą być poprawne:
transfer łańcuchów kolekcji, na przykład, testuje zarówno mutację jak i liczbę znaków
Unicode. W lekcji Vec, jednak, zapożyczony-odczyt brama i jego łączny transfer
porównywać odnośny liczba całkowita tylko przez wartość. Wdrożenie Rdza zwracające taką
samą liczbę z innej pozycji przyjęło oba poprzednie kontrakty; odpowiedni przegląd
drugiego elementu miał tę samą usterkę. Było to traktowane priorytetowo, ponieważ
fałszywie dodatni wpływ zarówno niezależnej praktyki, jak i późniejszego pobierania w
module podstawowym.

Te trzy kontrakty zawierają teraz powtarzające się wartości i sprawdzają tożsamość
referencyjną przy wymaganym indeksie wejściowym. Ostatnia kontrola elementu przechodzi
również rzeczywisty kawałek, wykonując opublikowaną sygnaturę plastra. Zestaw regresji
kompiluje te same błędne implementacje szczeliny w stosunku do historycznych i bieżących
kontraktów i akceptuje odrębne prawidłowe implementacje. Zamówienia publiczne na
wykonywanie zadań i postęp IDs pozostają stabilne: sukcesy historyczne opisują ich
oryginalne testy i nie są retrospektywną weryfikacją nowych duplikatów przypadków. Audyt
ten weryfikował katalog i autorskie ścieżki realizacji; utrzymanie i jakość
poszczególnych uzasadnień projektowych nadal wymaga obserwacji pracy uczącego się.

## 5 umów o wykonanie zaostrzonych po kontroli następczej, 19 listopada 2026 r.

Procentowe ćwiczenie akceptuje teraz każdą liczbę całkowitą w zakresie inclusive od 0 do
100 w testach Rusta. Gazociąg iteratora musi zachować niemonotoniczną sekwencję UTF-8
długości bajtów. Ćwiczenie filtra logarytmicznego i planowany przegląd paczek porównują
każdy zwrócony widok z jego specyficznym wystąpieniem wejściowym, w tym równy tekst
zapisany w różnych łańcuchach. Ćwiczenie parzyste wywołuje funkcję z wewnętrznym
kawałkiem tablicy.

Testy regresji prowadzą każdy wcześniej zaakceptowany nieprawidłowy wdrożenie i jego
rozwiązanie referencyjne przeciwko zarejestrowanemu ćwiczeniu. Cztery błędne programy
nie dają asercji behawioralnej. Funkcja ograniczona do pożyczonego Vec nie sprawdza typu
na wywołaniu cięcia. Lekcja i przegląd IDs pozostają stabilne, a wcześniejsze próby
uczenia się zachowują swoje pierwotne znaczenie.

## Autorskie testy dla pierwszej wartości parzystej, 19 listopada 2026

Kontrola następcza porównała ćwiczenia z przewodnikiem w module testowym, zaplanowaną
praktykę i ostateczną ślepą ocenę. Ostateczna ocena prosi uczących się o napisanie
zestawu testowego do znalezienia pierwszego numeru parzystego. Ustaliliśmy priorytety,
ponieważ uczący się mogli otrzymać uznanie za swój projekt testowy, pomijając puste
wejście całkowicie lub nigdy nie przeszukując nieparzystego pierwszego elementu. Oba
niekompletne zestawy testów przeszły poprzedniego oceniającego Rust.

Uczeń wybiera teraz konkretne wartości dla czterech konkretnych sytuacji. Oceniający
prowadzi pakiet ucznia przed poprawną implementacją i zawiera osobne nieprawidłowe
implementacje zwracające zero przy pustym wejściu i patrzące tylko na pierwszy element.
Istniejące kontrole nadal odróżniają najpierw od ostatnich, mecz na początku i niepusta
lista bez dopasowania. Testy regresji pomijają każdą wymaganą sytuację indywidualnie i
akceptują kompletny zestaw z innymi danymi niż opublikowane rozwiązanie. Utrzymuje się
istniejący postęp IDs i historyczną projekcję lekcji.

## Niezależna praktyka regresji liczbowej i unikodowej, 19 listopada 2026 r.

Lekcja regresji obiecała dwa niezależne tabele testowe, ale lista kontrolna modułu
zaakceptowała jedno z nich. Powtarzający się sukces w ćwiczeniach temperaturowych mógłby
spełnić łączne kryterium bez żadnego ćwiczenia tekstowego, a sukces normalizacji miał
taki sam skutek bez jakiejkolwiek numerycznej praktyki granicznej. Wpłynęło to na
decyzję o zakończeniu budowy modułu, więc miało pierwszeństwo przed indywidualnymi
sugestiami dotyczącymi przeglądu.

Lista kontrolna przedstawia te dwie umiejętności osobno. Istniejące próby zachowują swój
pierwotny krok IDs i liczą na ich odpowiednie umiejętności. Wszystkie cztery trasy
deklarują akceptowane przez siebie dowody badania Rust, w tym zgodność z oryginalnymi
dwoma zadaniami skutkuje wcześniejszymi wynikami. Przywiezione zdarzenie wyraźnie
oznaczone niekompatybilnym oceniającym nie może spełniać żadnego z tych kryteriów. Każda
umiejętność ma świeże puste ćwiczenia po początkowych krokach lekcji: okno rezerwacji z
czterema jednodniowymi przesunięciami granicznymi, lub Unicode tag formatter z obudową i
regresją Whitespace. Uczniowie wybierają własne dane testowe. Oryginalna normalizacja
stanowi wyzwanie dla asymetrycznego przycinania i utraty odstępu od wnętrza. Jedno
rozwiązanie pozostawia niezależną szansę na tę samą umiejętność.

Zestaw regresji obejmuje częściowy i kompletny postęp modułów, powtarzające się próby,
pomoc, przywrócony postęp i niezależne rozwiązania dla alternatyw. Projekcje historyczne
zachowują katalog sprzed podziału.

## Autorskie testy Learnera w regularnych przeglądach, 19 listopada 2026 r.

Po otrzymaniu odrębnych kryteriów numerycznych i unikodowych w ramach lekcji regresji,
audyt poszedł za uczniami do modułu testowego, co powoduje trzy zaplanowane wyzwania
związane z kodowaniem. Siedem niekompletnych zestawów testów przeszło mimo, że każdy
pominięto sprawę żądaną w swoim trybie. To miało znaczenie dla praktyki odzyskiwania:
sukces w tych wyzwaniach był niewiarygodnym sygnałem, że uczący się może samodzielnie
wybrać wymagane przypadki.

Przeglądy parytetu sprawdzają teraz ujemne liczby nieparzyste, zero, ujemną liczbę
parzystą i dodatnią liczbę nieparzystą oddzielnie. W przeglądzie rabatowym rozróżnia się
ostatnią pełną cenę (100) od pierwszej zdyskontowanej ceny (101), nawet jeżeli uczący
się również testuje wyższą zdyskontowaną cenę. Przegląd zdarzeń wyróżnia pustą listę,
jeden mecz, wiele dopasowań, nieobecność na liście niepustej i znalezienie wartości
zero. Pojedyncze dobrze dobrane wejście może nadal obejmować więcej niż jedno
zachowanie. Grader uruchamia pomocnika uczącego się przed poprawną implementacją i
wadliwymi wariantami. Uczniowie mogą wybierać własne wejścia tam, gdzie umowa nie
określa dokładnej granicy.

Natywne kontrole regresji pomijają po kolei każdy wymagany przypadek.
Akceptują niezależne i wzorcowe zestawy testów. Trzy polecenia zachowują
identyfikatory ćwiczeń i pojęć. Historyczny katalog zachowuje pierwotny
mechanizm oceny każdej powtórki. Wcześniejsze próby nadal dokumentują
swoje pierwotne przebiegi.

## Ogólnokatalogowy przegląd instrukcji i oceny, 19 listopada 2026 r.

Kontrola obejmowała zarejestrowaną sekwencję 51 modułów, 204 lekcji i 1 367 etapów,
zwykłe i alternatywne rejestry przeglądów oraz instrukcje dostarczone wraz ze wszystkimi
16 projektami do pobrania. Recenzenci porównywali zachęty, warunki wstępne, rozwiązania
i kryteria klasyfikacji. W przypadku podejrzewanych wad klasyfikacji przeszli one do
prawdopodobnych nieprawidłowych rozwiązań w stosunku do własnych kontroli i
przetestowali poprawiony kontrakt. Zmiany dotyczą 14 kroków w ośmiu lekcjach, 17
zwykłych ćwiczeń przeglądowych i sześciu pobieranych projektów.

- Trzy przeglądy własności akceptują teraz wyjaśnienia w słowach uczącego się. Uczeń
  porównuje zapisany projekt z wyraźnymi kryteriami i wybiera następny okres przeglądu.
  To nagrywa samoocenę. Niezależne kodowanie i opóźnione odzyskiwanie nadal wymagają
  własnych dowodów. Przegląd struktury wymaga od uczących się stworzenia rekordu,
  którego własna nazwa przetrwa zmiany w tekście źródłowym. Test Rust odczytuje pole po
  wyjściu źródła z zasięgu. Przegląd kopii krotek prosi o wyjście jego kontroli
  oceniających, a przeglądy pętli i zamknięcia obejmują wcześniej pominięte granice
  numeryczne.
- Ćwiczenia I/O sprawdzają, czy przed pierwszym przeczytaniem pisarz przerzuca pełny
  sygnał, że następna wiadomość pozostaje dostępna i że I/O błędy rozprzestrzeniają się.
  Limit bajtów obejmuje powrót wagonu przed nową linią. Ćwiczenia dziennika odróżniają
  pożyczone wejście od równego tekstu pod innym adresem i obejmują gramatykę znacznika
  czasu i wartości raportowania. Atomowe przeglądy odróżniają oddzielny magazyn od
  wymaganej operacji porównawczej i wymiany oraz odrzucają mieszane wnioski z dowodów
  zamawiających pamięć.
- Publiczność API ćwiczy sprawdzić dosłowny limit bajtów, nie ASCII wejście, wywołania
  przez obiekt cechy i oba wyniki przewidywania. Ćwiczenia dotyczące zależności
  odróżniają zmianę źródła od zmiany wersji oraz sprawdzają decyzje w sprawie doradztwa
  i wydania, gdy brakuje indywidualnych warunków wstępnych lub kiedy do wygaśnięcia tego
  odstępstwa dochodzi.
- Ściągnięty projekt Miri opisuje stabilne polecenia Cargo, które działają z
  ekstrahowanego katalogu. Dwa inne projekty wyjaśniają, jak przygotować zablokowane
  zależności przed pierwszym uruchomieniem offline. Wskazówki Number Guessing zgadzają
  się z archiwalną wersją dokładną zależności. FFI, Miri i testowanie właściwości
  pobierania renderować kod linii i komendy bloki zgodnie z przeznaczeniem.

Był to audyt materiałów i wykonalnych przykładów. Przypadki regresji wskazują na
konkretne nieprawidłowe wdrażanie. Nie wyczerpują wszystkich możliwych programów uczenia
się lub równoczesnej realizacji. Wyniki uczenia się i zatrzymywanie wymagają nadal
obserwacji osób uczących się.

## Ostateczny audyt niezależnej praktyki po 02b6126

Katalog startowy zawierał 51 modułów, 204 lekcji, 1,367 kroków i 204 wariantów
przeglądów. Sprawdziliśmy wszystkie 240 kryteriów modułowych i ich 475 referencji zadań,
następnie porównaliśmy widoczne programy robocze z ocenione implementacje. W przypadku
podejrzenia wycieków z klasyfikacji skompilowaliśmy rzeczywistą demonstrację lub starter
przeciwko niezależnemu zadaniu, które realizuje własne testy Rust. Skorzystaliśmy
również z dowodów i selektywów odzysku z częściowym, wspomaganym i przywróconym
postępem.

- Przepracowane programy uczą teraz powiązanej z nią operacji zanim uczeń napisze nową
  implementację. Przykłady obejmują ocenę procentową fundamentów, Todo, Granice modułu
  Cargo, iteratorów kredytów, Tokio i makro. Przykłady nadal są wykonywane. Native
  controls sprawdzić, że ich kopiowanie nie może zakończyć odpowiednich zadań transferu.
- W Todo i Todo I/O niektóre z późniejszych startów celowo dostarczają kompletnych
  elementów niezbędnych. Wyświetlanie dostarczonej dokumentacji wdrożeniowej pomaga w
  odpowiednim wcześniejszym ćwiczeniu. Uczenie się jest zachowany własny szkic. Czysty
  sukces zarobiony przed ujawnieniem zachowuje swój pierwotny kredyt. W połączonym
  zadaniu, widząc implementację państwa wpływa na dowody państwowe, podczas gdy uczący
  się może nadal niezależnie wykazać zachowanie sesyjne.
- Ukończenie modułu sprawdza obecnie rodzaj dowodów i oceniającego zwykłe zadania, jak
  również zadania w wersji oryginalnej. W przypadku gdy kryterium posiada alternatywy,
  mapa wskazuje na kwalifikowalne działanie lub wyjaśnia, kiedy wszystkie alternatywne
  rozwiązania zostały już poparte pomocą. Powrót do lekcji praktyki pozostaje dostępny.
- Cztery kryteria wymagają teraz zachowania, jakie obiecują im etykiety. Naprawa
  rustykalna wartości ruchomej zastępuje diagnostykę odpowiadającą drukowaniu stałej.
  Nadal ćwiczy się układanie jednej wartości, interpretowanie harmonogramu sekwencyjnego
  i rezerwowanie kwot. Odpowiednie kryteria recursion, publication-material i runda gry
  oferują teraz świeże zadania w zakresie zbierania liści drzew, sprawdzania partii
  raportów z publikacji i modelowania ograniczonej rundy z wyraźnymi wygranych i stanów
  strat.

Kontrola przeglądarki produkcyjnej ujawniła kolejny problem przy odzyskiwaniu: niektóre
kryteria oferowały drugie zadanie, którego kompletne rozwiązanie było identyczne z tym,
które właśnie pokazano. Ogólnokatalogowa regresja otwiera teraz pierwsze rozwiązanie
każdego z 192 zwykłych kryteriów, które oferują alternatywy i sprawdza, że niezależna
praca jest nadal dostępna. Obejmuje zarówno odrestaurowany postęp, jak i nowo
wyświetlane rozwiązanie. Dodaliśmy 19 ćwiczeń transferu w całym Todo, pomiaru
wydajności, profilowania, granicy FFI i operacji serwisowych. Razem przywracają nową
trasę dla 31 kryteriów. Przykłady obejmują edycje serii atomowej planszy Todo,
rozumowanie o mierzonym obciążeniu pracą w ramach nowego budżetu oraz odtwarzanie cyklu
życia usługi poprzez gotowość i drenaż. Transfer może spełniać dwa związane z nim
kryteria, gdy testy wykonywalne ustanawiają obydwa zachowania.

Drugie porównanie dotyczyło różnych programów źródłowych, które nadal spełniały testy
rodzeństwa. Przykłady obejmowały dwie naprawy własności, które pożyczyły wiadomość, error-propagation
rusztowanie, które już sklasyfikowało błędy wcześniejszego parsera, rozwiązanie makro
różniące się przez bieżącą nową linię oraz zapis instrukcji profilowania. Odzyskiwanie
kieruje uczących się do innych ocenionych zachowań, takich jak pożyczanie łańcucha, aby
sprawdzić czy jest on pusty, ocena uporządkowanych argumentów makro dokładnie raz, lub
przyłączenie numeru wiersza do błędu wpisanego. Lekcje Miri rozróżniają dostarczone
wstępne implementacje od nowego zachowania kredytowania uczący się musi napisać.

Nowy katalog ma 1.391 stopni. Porównanie obejmuje autorskie oprogramowanie i określone
zachowanie oceny. Testy nie mierzą realnego zatrzymywania się uczących się, a aplikacja
może przypisać tylko pomoc, którą może obserwować.

## Odzysk po ujawnieniu rozwiązania w pozostałych kryteriach

W przypadku commit `ea82ec2` wcześniejszy test pierwszego rozwiązania obejmował 192 z 240
kryteriów modułowych. Audyt ten przeprowadzał pozostałe 48 indywidualnie. Spośród 23
kryteriów z jednym z wymienionych zadań i 25 wymagających liczenia niezależnych zadań
kodowania, 36 może stać się nieosiągalne po jednym rozwiązaniu ujawnić. W niektórych
liczonych kryteriach kilka wymienionych zadań współpracowało w tym samym zakresie. W
lekcji MutSlot pracujący warunek może również ujawnić rodzinę potrzebną później.

Katalog zawiera teraz 1324 kroki w 204 lekcji. Istnieje 33 dodatkowe ćwiczenia Rust i
trzy nowo połączone istniejące ćwiczenia. Istniejące ćwiczenia obejmują rozliczenie
podczas wyłączania, diagnozowanie wybranego wykresu zależności i ponowne pożyczanie pary
mutacji. Nowe kontrakty obejmują zachowanie dokładnej wartości konfiguracji, sprawdzenie
partii żądanych ograniczeń dotacji, planowanie ponownego testowania okien w określonym
terminie, opróżnianie przyjętych wiadomości po zamknięciu odbiornika Tokio oraz
niezależne sprawdzanie dowodów decyzji o wydaniu.

W odniesieniu do każdego z 48 kryteriów regresja otwiera z kolei każde wymienione
rozwiązanie, przedstawia to zadanie wspomagane i postępuje zgodnie z faktyczną
rekomendacją odzysku poprzez pełne kwoty. Powtarza również czek z przywróconą flagą
ujawnienia. W przypadku gdy kryterium wymaga dodatkowego rubriku, samo kodowanie
pozostawia to kryterium otwarte. Porównanie sześciu rejestrów rekonstruuje katalog pod
numerem `ea82ec2` i sprawdza hasze uchwycone przed edycjami. Audyt ten obejmuje jedno
ujawnianie informacji na raz. Uczennica, która ujawnia każdą dostępną rodzinę, może
jeszcze przedostać się przez niezależne trasy.

## Powrót do niezależnej praktyki po odkryciu jakiegokolwiek wariantu

Przy `f3a0081`, 192 kryteria w ramach kontroli pierwszego rozwiązania oferowały 429 kombinacji
kryteriów. Sprawdziliśmy każdy wariant jako pierwsze ujawnienie uczącego się. Z tych
kombinacji, 426 miał rozwiązanie, które trener mógł wyświetlić. Pozostałe trzy używane
kroki, dla których sprawdziliśmy przywrócony postęp z flagą objawienia. Regresja
przedstawia również ujawnione zadanie, powraca bezpośrednio do wcześniejszych zadań
dostarczonych przez to rozwiązanie i podąża za mapą do świeżej pracy po eksporcie i
importowaniu stanu uczącego się.

Niektóre późniejsze ćwiczenia dostarczyły wystarczająco dużo kodu, aby przejść
wcześniejszą ocenę. Na przykład metoda resetowania zawierała cały licznik potrzebny
przez zadanie przyrostowe. Powtórzenie gotowości zawierało oba przewidywania brakujące z
rozrusznika księgowego. Ta sama kwestia dotyczyła operacji tekstu Unicode, backpressure
kanału, pomiarów przydziału, pracy blokowania Tokio i porównań fuzz-oracle. Kurs teraz
rejestruje, które wcześniej odpowiedzi te przykłady pokazują. Uczennica utrzymuje kredyt
zarobiony niezależnie przed ich ujrzeniem.

Siedem nowych ćwiczeń zapewnia niezależną praktykę: liczenie zdarzeń Unicode scalar,
dołączenie sekwencji fragmentów tekstu z separatorami, zachowanie niewysyłanej
wiadomości kanałowej w kolejce powtórzeń, klasyfikowanie partii raportów przydziału,
przekształcanie własnych wartości na puli blokującej Tokio, zgłoszenie każdej pomyłki
fuzz case i zakończenie drenażu toru przez pracę ID. Lekcja licznika już miał
odpowiednie ćwiczenia naprawcze. Testy rdzennej rustykalności sprawdzają skopiowane
implementacje w stosunku do umów, których dotyczą, oraz sprawdzają nowe ćwiczenia z
poprawnymi i umyślnie błędnymi zgłoszeniami.

Zaktualizowane 192 kryteria mają kombinacje 438 kryteriów krytycznych. Każda regresja
zaczyna się od jednego ujawnienia, w tym gdy ujawnienie jest ostatnim wariantem w
lekcji. Katalog ma teraz 1431 kroków w 204 lekcji. Oddzielne porównanie rekonstruuje
wszystkie sześć rejestrów na `f3a0081`. Te kontrole obejmują dostrzegalną pomoc i zachowanie
wykonywalne. Nie szacują one czasu uczenia się ani nie mierzą zatrzymywania.

## Znalezienie nowej praktyki po kilku ujawnieniach

W dniu `d7dee3b` 240 kryteriów oferowało 497 odrębnych podzbiorów dwóch lub więcej zadań w
ramach danego kryterium. Dla każdego podzbioru regresja porównuje rekomendację mapy z
kredytem udanego złożenia każdego kandydata rzeczywiście zarobić. Powtarza ono to
porównanie z ujawnieniami autokarowymi, przywróconymi flagami i mieszaniną tych dwóch
substancji, a następnie postępuje zgodnie z zaleceniami do momentu zakończenia kryterium
lub wykorzystania przez uczącego się każdego kwalifikującego się zadania.

Mapa własności rozpoznaje teraz, kiedy dwa ćwiczenia dzielą zadanie kodowania nawet w
zwykłym kryterium. Starszy zapis zapisu może również zanotować, że wstępna implementacja
została pokazana w innym module. Mapa i ocena wykorzystują te informacje przy
podejmowaniu decyzji, która część połączonego zadania może jeszcze zdobyć kredyt. Na
przykład, widząc zarządzanie stanem Todo w lekcji przechowywania nadal pozostawia
miejsce do wykazania obsługi sesji niezależnie. Kredyt uzyskany przed ujawnieniem jest
zachowany.

Kryterium policzone może pozostać jedno świeże ćwiczenie, a jednocześnie wymagać dwóch
niezależnych sukcesów. Mapa oferuje to ćwiczenie. Wyczerpanie jest zgłaszane dla danego
kryterium, więc uczący się może nadal śledzić linki do innych kryteriów w tym samym
module.

## Ujawnianie informacji między granicami modułów

W wyniku kontroli przeprowadzonej po `758c4a2` stwierdzono, że cztery rozwiązania oparte na
podziale bufora w FFI obejmują wszystkie cztery odpowiednie kontrakty z Miri i
odwrotnie. Native Rust controls weryfikuje wszystkie 32 kierunki, w tym implementacje
napisane inaczej. Ujawnienie jednego z tych rozwiązań prowadzi obecnie do odrębnego
ćwiczenia koperty w FFI lub dwuzakresowego ćwiczenia w Miri. Podpowiedź lub niekompletny
rozrusznik pozostawia te implementacje do dyspozycji.

W trakcie kursu testy regresji obejmują wszystkie 16 zadeklarowanych linków startowych i
wszystkie 48 linków rozwiązań od lekcji w jednym module do ćwiczenia w innym. Obejmują
one ogólną funkcję długości bajtów pokazaną w lekcji konwersji oraz wstępne
implementacje pokazane w Todo I/O. Archiwum startowe Todo CLI zawiera również kompletny model
parsera i państwa. Otwarcie go rekordy pomóc w pięciu wcześniejszych zadań przy
zachowaniu świeżego dowództwa, zarządu, sesji i I/O praktyki.

Dodatkowe kontrole porównują mapę, bramkę i streszczenie dowodów po przywozie, utrzymują
niezależne sukcesy zdobyte przed ujawnieniem, a także wykonywać rzeczywisty autokar i
moduł picker w przeglądarce. Ćwiczenia własnościowe testują obecnie ich istniejący
wyświetlacz jednostkowo-zwrotny API, tak aby niepowiązany formater zwracający ciąg nie
mógł przejść przez odrzucenie jego wyniku. Kontrole te dotyczą widocznych wdrożeń i
obserwowalnych zapisów postępu.

### Ujawnianie archiwum projektu po `3bb18b7`

Audyt porównał pliki w każdym starterze i rozwiązaniu ZIP z decyzjami wymaganymi podczas
ćwiczeń lekcyjnych. Kompletna implementacja w teście startowym, przykład lub nota
projektowa może ujawnić odpowiedź. Podpis, funkcja niedokończona lub specyfikacja może
pozostawić realizację uczącemu się.

| Archiwa projektów | Dowody wpływające na niezależną praktykę |
| --- | --- |
| Guessing number, Log Analyzer, Tokio Pipeline | Umowy początkowe pozostawiają otwarte ocenione wdrażanie. Rozwiązania referencyjne zachowują istniejące mapowanie zadań. |
| Laboratorium Konkursowe | Na początku ADR wyjaśniono już warunkowe porównanie i zamianę rezerwacji oraz publikację release/acquire. Oddzielne RMW, dostępne są ponownie oprzyrządowanie i ćwiczenia z analizy modeli. |
| Usługa Tokio | Pożyczki, zwroty i przykłady własności są obecne na początku. Rozwiązanie dodaje czytanie ramki, pisanie ramki i pozwolenie na własność. Niezależna praktyka obejmuje otrzymywanie ograniczonej ramki przy użyciu własnego połączenia TCP i podejmowanie decyzji o odrzuceniu tego połączenia. |
| Frame Protocol | Rozrusznik zawiera kompletne manifesty ładunku. W rozwiązaniu pojawiają się implementacje API. Ćwiczenia konserwacyjne nadal wymagają decyzji uczących się. |
| Mini Grep, kontrakty na nieruchomości | Rozrusznik Mini Grep zawiera dekoder i wyrocznię równości. Nasienie i rejestry kampanii pozostawiają otwartą klasyfikację redukcji i dowodów. Kontrakty na nieruchomości pozostawiają niestandardowe kontrole kurczące się i metamorficzne uczącemu się. |
| FFI Buffer, bezpieczeństwo Miri | Nieprzezroczyste FFI bufor zapewnia własność i sprawdzone widoki. Dzielenie regionów zmutowanych i dekodowanie oznaczonych rekordów to oddzielne zadania. Rozrusznik Miri zaopatruje się w mutowalne ponowne pożyczenie. Rozwiązanie obejmuje wybór zakresu i leniwą inicjalizację. Nowe niezależne ćwiczenia wyodrębniają element obrotu i przesuwają wartość pomiędzy dwoma szczelinami przy zachowaniu obu przy odmowie. |
| Operacje obsługi | Rozwiązanie dostarcza limitów przyjmowania, skorelowanego wyboru i readiness/drain przewiduje. Ćwiczenia zbierają dowody. Wdrożenie zamówionego klasyfikatora diagnostycznego nadal wymaga niezależnej pracy. |
| Trwała obsługa dziennika, Trwałe pobieranie dziennika | Rozrusznik retry zawiera wypełniony kod z macierzystego capstone. Jego własny klient retry pozostaje niedokończony do momentu otwarcia rozwiązania. |
| Autoryzacja serwisu, Plik Schema Ewolucja | Rozrusznik pozostawia operacje autoryzacji i schematy normalizacji niedokończone. Rozwiązania dostarczają tych operacji. Atomowe partie autoryzacji i niezależna walidacja migawek zachowują odrębne wymagania. |

Regresja wszystkich archiwów obejmuje Todo CLI jako kontrolę. W przypadku obu wariantów ZIP
porównuje przesyłaną zawartość pliku z podglądem, sprawdza, czy ponowne otwarcie
rekordów pomaga raz i ocenia wcześniejsze i późniejsze wnioski oddzielnie. We wszystkich
kryteriach modułowych sprawdza pierwsze zalecenie. W odniesieniu do kryteriów, których
to dotyczy, jest on zgodny z zaleceniami wynikającymi z wymaganej kwoty i prac
uzupełniających do faktycznego zakończenia bramki. Ponowne otwarcie pakietu po
przywróceniu zapisu tylko flagi podczas ponownego otwarcia.

### Użycie wielu archiwów po `96ca8d5`

Audyt mapy objął oba warianty wszystkich 16 projektów. Sprawdził
każdą uporządkowaną parę różnych archiwów (960 sekwencji pakietów
startowych i rozwiązań), w tym wspólny kod Durable Log Service i
Durable Log Retry. Sekwencje dały 226 różnych zestawów ujawnionych
zadań. Dla każdego zestawu symulowane poprawne przesłanie kodu
w pierwszym polecanym zadaniu przyznawało zaliczenie w każdym z 240
kryteriów (54 240 kontroli). Testy całego kursu śledzą rekomendacje
na jednym zapisanym przebiegu przez 51 modułów i 240 kryteriów.
Przechodzą moduły w kolejności kursu, w odwrotnej kolejności i
z otwieraniem archiwów pomiędzy ukończonymi modułami. Wcześniejszy
samodzielny wynik nadal się liczy po późniejszej pomocy z archiwum
oraz po eksporcie i imporcie.

Ścieżki ćwiczeń Todo I/O miały zależność. Po zapoznaniu się z
archiwum Todo otwarcie ćwiczenia CLI notatnika dostarczało gotowy
kodek i zapis notatnika. Kursant zaczynający od CLI tracił ostatnie
samodzielne zadanie dla dwóch kryteriów. Lekcja o formacie zapisu
oferuje teraz odwracalne kodowanie UTF-8 z długością w bajtach na
początku. Lekcja zapisu pliku oferuje warunkowe zastąpienie
pliku tekstowego na dysku, z jawną obsługą nieaktualnego szkicu i
istniejącego pliku tymczasowego. Oba zadania można wykonać
samodzielnie po obejrzeniu implementacji notatnika.

Przy imporcie prób równoważnego ćwiczenia Service Operations
zarówno ocena samodzielności w kompetencji, jak i zaliczenie
modułu korzystają z tego samego datowanego odsłonięcia. Ukończona
powtórka po przerwie zachowuje zaliczenie także wtedy, gdy w
imporcie starsze dowody występują po powtórce. Znaczniki czasu
ustalają historię przed przesłaniem pracy. Przy tej samej
milisekundzie rozstrzyga kolejność w dzienniku.

### Historia pomocy po `8fca024`

Po przywróceniu zapisu widoki kompetencji i opanowania materiału
mogły uznać zadanie Vec za samodzielne mimo wcześniejszej
wskazówki. Kryterium modułu poprawnie wymagało innego wariantu.
Te widoki korzystają teraz z historii pomocy uwzględniającej
czas. Wskazówka po samodzielnym zaliczeniu zachowuje wynik.
Wskazówka przed zaliczeniem dotyczy zadania i aliasów jego
ocenianego kontraktu. Inny kontrakt nadal pozwala na
samodzielną pracę.

Nowe zdarzenia lekcji rozróżniają poziomy wskazówek i odsłonięcie
rozwiązania. Dawne ogólne zdarzenie pomocy, którego poziom jest
nieznany, liczy się co najmniej jako pierwsza wskazówka.
Powtórki dopasowują podpowiedzi do zadania i sesji, uwzględniając
historyczny identyfikator oparty na pojęciu. Przy jednakowej
milisekundzie kolejność dziennika rozstrzyga, czy kontakt
z treścią poprzedził powtórkę. Przywrócenie zapisu zachowuje
oryginalne zdarzenia.

Audyt lokalny sprawdził wpływ wskazówki przed samodzielną próbą
i po niej dla wszystkich 566 odwołań do zadań w 240 kryteriach. Po wcześniejszej pomocy każda z 566 rekomendacji
wskazała zadanie bez zapisanej pomocy. Późniejsza wskazówka
zachowała zaliczenie każdej sprawdzanej pary zadania i pojęcia.

### Wznowienie powtórek po aktualizacji kursu

Zaimportowana powtórka może odwoływać się do pojęcia lub
zadania, którego nie ma w zainstalowanej wersji kursu. Pulpit,
licznik w nawigacji i kolejka powtórek uwzględniają dostępne
pojęcia. Oryginalny harmonogram zostaje w eksporcie. Kursant
może zamknąć niedostępną sesję, zachować szkic i historię i
otworzyć aktualne zadanie.

Ukończone powtórki mogą wrócić do kolejki także bez pasującego
wyniku kompilatora w zapisie. Wyjście z ekranu wyniku nie
tworzy dowodu ani oceny. Krótka próba kodowania pozwala ocenić
się dopiero wtedy, gdy ostatnie udane wykonanie dotyczyło
wyświetlanego kodu. Testy regresji obejmują te ścieżki powrotu
w przeglądarce i moment osiągnięcia terminu powtórki dla
każdego bieżącego pojęcia.

Sformułowania sprawdzianów, samodzielne dowody, trwałość wiedzy
i odzyskiwanie zapisów w całym katalogu omawia
[audyt kursu z 20 listopada](curriculum-audit-2026-11-20.pl.md).
