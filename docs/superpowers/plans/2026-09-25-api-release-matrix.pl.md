# Macierz zgodności wydań API — plan etapu

[English](2026-09-25-api-release-matrix.md)

**Cel.** Nauczyć decyzji o wydaniu biblioteki Rust na poziomie senior z użyciem starszego zewnętrznego klienta, konfiguracji flag i dokładnej obietnicy MSRV. Etap rozwija zatwierdzony program zaawansowany. Odbiorca zaczyna od podstaw programowania i bez znajomości Rust.

Dodaj moduł po `public-api-workspaces), z dwiema lekcjami po polsku oraz niezależnymi zadaniami głównymi, od pustego edytora i powtórkami dla każdego pojęcia. Przeglądarka ocenia kod i rozumowanie na określonych kontraktach Rust. Osobny zaufany weryfikator sprawdza małą autorską bibliotekę Cargo i zewnętrznego klienta na wersji stabilnej i dokładnym Rust 1.85.0. Symulacje przeglądarkowe dotyczą interfejsu. Zachowaj pakiet Frame Protocol i jego publiczne ID.

Wzorce są w `src/content/public-api-module.ts`, `public-api-evolution.ts`, `public-api-integration.test.ts`, `src/content/cargo-dependencies.ts`, `scripts/verify-workspace.ts`, `scripts/verify-async-lending.ts`, `src/content/course.ts` i `tests/e2e/unsafe-borrowed-memory.spec.ts`. Przed edycją kodu przeczytaj właściwy przewodnik `node_modules/next/dist/docs/` zgodnie z AGENTS.md. Użyj TDD i aktualnego schematu treści bez nowej zależności i dostępu do rejestru.

## Zadanie 1 — kontrakt wydania wobec rzeczywistego klienta starszej wersji

- Dodaj w `scripts/` mały autorski przypadek Cargo i weryfikator dla biblioteki `release_probe` i odrębnego pakietu `old_consumer`. Uruchom `cargo check/test --offline --locked` na wersji stabilnej i dokładnym 1.85.0. Po zmianie starszy klient nadal importuje publiczną ścieżkę, implementuje publiczny trait i wywołuje przez `&dyn Trait`. Sprawdź flagi domyślne, `--no-default-features` i jedną jawnie włączaną flagę. Sama kompilacja wszystkich flag w przestrzeni roboczej jest niewystarczająca.
- Kandydat dodaje opcjonalną możliwość bez nowej metody lub ograniczenia starszej implementacji. Sprawdź poprawne źródło i co najmniej cztery kontrolowane usterki: usunięta lub przemianowana ścieżka, wymagana metoda traitu albo utrata zgodności z `dyn`, regresja flag domyślnych i wyłączonych oraz kompilująca się zmiana zachowania klienta odrzucona przez `cargo test`. Przekroczenie czasu kompilatora i brak narzędzi oznaczają awarię infrastruktury. Ogranicz procesy potomne i zapisz dokładny kompilator, polecenia, wynik zakończenia i skróty przypadków w JSON.
- Testuj walidację raportu i odrzucanie celowych usterek. `npm run content:api-release -- --stable` i `--msrv` mają być dostępne i uruchamiane w CI przed ogólną kontrolą archiwów. Brak sieci i publikacji w rejestrze. Lokalny `cargo package --list` pozwala obejrzeć listę plików pakietu. Nie uruchamiaj `cargo publish`.

## Zadanie 2 — moduł dla uczestnika

- Dodaj dwie lekcje po polsku. Pierwsza rozróżnia w obserwacji starszego klienta błąd kompilacji, regresję zachowania i stan nieznany lub awarię infrastruktury. Druga analizuje udokumentowane pochodzenie wyników flag i MSRV przed decyzją o wydaniu. `public-api-evolution.ts` już uczy zachowania ścieżek i traitów. Nowe zadanie klasyfikuje dowody bez powtarzania `classic::show` i `Meter`. Lekcje mają przewidywanie, wykonanie lub obserwację, objaśnienie, modyfikację, debugowanie i powtórkę, główne zadanie oceniane z kodu, odrębną opcję od pustego edytora i odroczoną powtórkę programistyczną. Zmień domeny względem danych weryfikatora.
- Poprawne przykłady kompilują się, a celowe błędy odpadają ze wskazanej przyczyny. Jednoplikowe zadania Rust w przeglądarce mają własny zakres. `Cargo.toml`, wybór flag i granicę zewnętrznego pakietu sprawdza zaufany weryfikator. Wyjaśnij różnicę.
- Zarejestruj moduł, pojęcia, kompetencje, źródła, powtórki i mapę w `src/content/course.ts`. Zachowaj istniejące ID i migracje. Każde kryterium stanowi odrębna para `gate` albo `blank`. Powiąż Frame Protocol w kontrakcie modułu bez zmiany bajtów archiwum i znaczenia ukończenia projektu.
- Sprawdź, że ukryte testy odrzucają pustą implementację i wariant łamiący kontrakt, a poprawne rozwiązanie przechodzi. Ujawnione zadanie główne nie zalicza kryterium, a nieujawniony pusty wariant może je zaliczyć. Sprawdź źródła, lekcje i graf.

## Zadanie 3 — weryfikacja od początku do końca i dokumentacja

- Dodaj ukierunkowane produkcyjne scenariusze Playwright i offline dla nawigacji, dowodu zaliczenia, skutku ujawnienia, niezależnego zadania od pustego edytora, dokładnego wznowienia, notatek, klawiatury i błędów konsoli. Użyj istniejącej symulacji środowiska wykonawczego. Powodzenie symulacji zależy od faktycznego autorskiego kodu. Niespodziewane źródło daje zgodne ze schematem `test-failure`.
- Zaktualizuj `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md` i `docs/verification.md` z dokładnymi liczbami, dowodami lokalnymi i ograniczeniami. README, tekst kodu, commity i PR są po angielsku, a materiał uczestnika po polsku. Odbiorca zna podstawy programowania i uczy się Rust od zera.
- Uruchom testy ukierunkowane, cały Vitest, sprawdzanie typów, walidację i audyt treści, lint, kompilację, weryfikator stable/MSRV, ukierunkowany E2E oraz pełny offline. Sprawdź formatowanie i różnice. Zapisz etap w angielskim commicie i wypchnij do PR. Rozliczenia CI pozostają odrębną bramką. Zielony wynik wymaga rzeczywistego zadania dla dokładnego commita.

## Zakres przeglądu

1. Starszy klient korzystający z dotychczasowej publicznej ścieżki kompiluje się bez zmian. Odróżnij błąd kompilacji od awarii infrastruktury.
2. Starsza implementacja i klient korzystający z `&dyn` działają z kandydatem traitu. Kompilująca się regresja zachowania blokuje wydanie.
3. Flagi domyślne, brak domyślnych i jawne włączenie sprawdza się z perspektywy zewnętrznego klienta.
4. Deklarowane MSRV sprawdza się dokładnym 1.85.0. Wersja stabilna daje odrębny wynik.
5. Ujawnione zadanie lub symulowana odpowiedź przeglądarki nie daje samodzielnego zaliczenia ani dowodu wydania z Cargo.
