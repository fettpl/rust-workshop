# Tokio: przepływ, anulowanie i zamknięcie — plan implementacji

[English](2026-09-12-tokio-flow-control.md)

> Dla wykonawców: użyj subagent-driven-development; root recenzuje kontrakty oraz implementację. Użytkownik autoryzował samodzielny rozwój pełnego kursu i commit po dużym etapie.

**Cel:** uczeń ogranicza bufor, zachowuje własność anulowanej wiadomości, odróżnia timeout od zatrzymania niezależnego zadania oraz kończy pipeline bez pozostawionych dzieci.

**Architektura:** istniejące Lesson/Concept/Module/ProjectContract, czyste evaluatory i kodowe powtórki. Nowe dane pozostają oddzielone od integracji. Stały profil Cargo weryfikuje wyłącznie przykłady repozytorium; RunRequest nie zmienia kontraktu.

**Stack:** Rust stable, edition 2024, Tokio =1.53.1; TypeScript strict, Next.js, Vitest, Playwright. Rozszerzenie features i ewentualny zegar testowy muszą mieć potwierdzenie w źródłach pierwotnych.

**Spec:** docs/advanced-curriculum.md, część 17 i kontrakt Async/Tokio; docs/requirements-audit.md oraz oryginalny brief produktu.

Punkt wyjścia: c57b3b1, 90 lekcji, 25 modułów, 93 pojęcia. Poprzednia tura była zweryfikowanym postępem: commit i push, testy lokalne oraz offline. CI 34719230345 zakończyło się niepowodzeniem także po ponowieniu. Odrębny commit diagnostyczny 32a0dc6 przeszedł pełne CI 34719780947; przyczyna dawnych dwóch porażek pozostaje niepotwierdzona.

## Ograniczenia

- Profil odbiorcy: podstawy programowania, zero wcześniejszego Rust. Żadnych założeń znajomości innych języków.
- Nie uruchamiać lokalnie szkiców ani importów ucznia. Nie wysyłać przykładów do zewnętrznego Playgrounda; używać kontrolowanych odpowiedzi E2E.
- Nie wywodzić poprawności z sleep, kolejności schedulera ani przekroczenia czasu procesu. Używać zdarzeń, kontrolowanego poll i zasobów obserwowanych poza rozwiązaniem; czas wirtualny tylko tam, gdzie środowisko go zapewnia.
- Każde pojęcie ma dwie różne bramki, w tym zadanie od pustej kartki, i kodową powtórkę. Poprawne implementacje muszą działać; startery i celowe błędy muszą zostać odrzucone przez właściwy kontrakt.
- Zewnętrzne runtime APIs nie mogą zostać zastąpione symulacją, std::thread ani ręcznym executorem. Samo wywołanie poll jest narzędziem obserwacji prawdziwego Future.
- Odsłonięcie projektu oznacza pomoc wyłącznie dla powiązanych zadań; świeże warianty pozostają niezależne.

## Zadania

- [x] Sprawdzić docs.rs Tokio 1.53.1, w tym mpsc send/reserve/close, timeout, select i JoinHandle; potwierdzić features zewnętrznego prelude przez odczyt źródeł. Ustalić deterministyczny kontrakt testów czasu.
- [x] Wydzielić niezmienione konstruktory kroków z tokio-runtime-tasks.ts do tokio-helpers.ts; sprawdzić brak zmiany istniejących danych i testy integracji.
- [x] Autor kanałów: src/content/tokio-channels.ts — tokio-bounded-channels po tokio-join-outcomes oraz tokio-reservation-cancellation. Moduł tokio-flow-control. Eksporty tokioChannelLessons/Concepts/Competencies/Sources/ReviewExercises. Kanał bounded, poprawny koniec przez zamknięcie/drain, rezerwacja pojemności przed przeniesieniem wiadomości i odzyskanie niesłanych danych.
- [x] Autor czasu: src/content/tokio-time-select.ts — tokio-timeouts po tokio-reservation-cancellation oraz tokio-select-cancellation. Ten sam moduł. Eksporty tokioTimeLessons/Concepts/Competencies/Sources/ReviewExercises. Rozróżnić Drop posiadanej przyszłości od timeoutu uchwytu; zachować trwającą operację między iteracjami select, nazwać politykę priorytetu i cancellation safety.
- [x] Autor zamknięcia: src/content/tokio-shutdown.ts — tokio-graceful-shutdown po tokio-select-cancellation, z powtórką i dwiema bramkami. Eksporty tokioShutdownLessons/Concepts/Competencies/Sources/ReviewExercises. Zatrzymać przyjmowanie, opróżnić zaakceptowane wiadomości, zakończyć i odebrać wszystkie zadania, jawnie zachować błędy.
- [x] Praktyczny pakiet src/content/projects/tokio-pipeline.ts: dodatkowe laboratorium, które scala wcześniejsze kompetencje. Bounded pipeline z kontrolowanym zamknięciem, błędem przetwarzania i pełnymi wynikami; testy nadmiaru bufora, anulowania, pustego wejścia, błędu i domknięcia dzieci. Starter kompiluje się, ale nie przechodzi kontraktu; rozwiązanie przechodzi test/fmt/clippy. Lockfile jest przypięty, a pobranie nie daje automatycznego mastery. Nie zastępuje pięciu oryginalnych projektów portfolio.
- [x] Root: rejestracja danych i modułu w course.ts, rozszerzenie sprawdzonego profilu Cargo, walidacja i testy kontraktów. Przed rejestracją nowego modułu dodać test integracyjny i wykazać jego porażkę.
- [x] Root: recenzje wszystkich rozwiązań i testy kompilujących się wadliwych wariantów; żadnego zaliczenia przez timeout lub niepowiązany błąd kompilacji.
- [x] Root: E2E nowych lekcji i projektu, surowy wynik, odsłonięcie i świeża alternatywa, dokładny resume/mobile; cache PWA v15 i nieotwarte wcześniej zadanie offline.
- [x] Lint, typy, Vitest, walidacja treści, zaufane przykłady Tokio i pakiety, źródła, build oraz odpowiednie regresje. Odebrać wynik CI poprzedniego etapu. Aktualizować audyt bez uznawania całego advanced/senior scope za ukończony.
- [x] Krytyczny przegląd, naprawy i raport weryfikacji; zapis dużego etapu w commicie zawierającym ten plan. Push zgodnie z instrukcją użytkownika.
