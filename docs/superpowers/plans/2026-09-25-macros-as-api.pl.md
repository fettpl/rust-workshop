# Makra jako API — plan wdrożenia

[English](2026-09-25-macros-as-api.md)

> Wdrażaj zadaniami, stosując TDD, ukierunkowany przegląd i częste commity po angielsku. Wdrożenie, testy, zmiany dokumentacji i operacje Git należą do GPT-5.6-Luna high. Plan i przegląd jakościowy należą do GPT-6-Astra medium.

**Cel.** Dodać trzy polskojęzyczne lekcje o makrach deklaratywnych i wiarygodne dowody ze stabilnej wersji i MSRV, że kontrakt działa u klienta zewnętrznego.

Przeglądarka nadal wykonuje jeden plik źródłowy Rust. Dowody pochodzą z zadań głównych, wariantów od pustego edytora i powtórek. Oddzielna autorska przestrzeń Cargo używająca wyłącznie std sprawdza eksportowane makro z zewnętrznego pakietu. Rejestracja i CI zachowują archiwa projektów i identyfikatory.

Stos to katalog Next.js 16.3.5, ścisły TypeScript, Vitest, Playwright, edycja 2024, stabilne Cargo i Rust 1.85.0.

Specyfikację `<private-temp>/receipt-016` skopiuj do `docs/superpowers/specs/` na gałęzi integracji.

## Ograniczenia globalne

- Załóż nowe katalogi robocze z `d0210272c38ca13699621d412f085662fff4ec2c` (HEAD PR #26). Lokalny `main` zawiera niezapisane zmiany.
- Przed pisaniem kodu przeczytaj właściwy przewodnik w `node_modules/next/dist/docs/` zgodnie z AGENTS.md.
- Tekst uczestnika jest po polsku, a README, commity i PR po angielsku. Nie zakładaj znajomości konkretnego wcześniejszego języka.
- Zachowaj zależności, bajty istniejących ZIP-ów i identyfikatory postępów. Zakres nie obejmuje wykonywania kodu użytkownika i publikacji w rejestrze.
- Dokładny Rust 1.85.0 i wersja stabilna dają oddzielne wyniki lokalne. Nieudane GitHub Actions pozostają zablokowane do zmiany stanu konta.

## Zadanie 1 — treść kursu i kontrakty zadań zaliczeniowych

Utwórz `src/content/macros-as-api.ts`, ukierunkowane testy integracji i ocen oraz minimalne wpisy i korekty liczebności w `src/content/course.ts`. Trzy lekcje dotyczą jednokrotnej ewaluacji przechwyconych wyrażeń, gramatyki powtórzeń oraz higienicznych ścieżek eksportowanych makr i dopasowywania fragmentów edycji 2024. Każda ma przewidywanie, wykonanie lub obserwację, objaśnienie, zaliczenie przez modyfikację, debugowanie, niezależny transfer od pustego edytora i odroczoną powtórkę. Ukryte testy odrzucają pustą implementację, podwójną ewaluację, złą kolejność, brak obsługi pustego wejścia i końcowego separatora, niekwalifikowaną ścieżkę w granicach jednego pliku i zły selektor fragmentu 2024. Każde oznaczone poprawne źródło ma się kompilować, a każdy celowy błąd dawać nazwaną diagnostykę. Każde pojęcie ma odrębne kryterium z wariantem głównym lub pustym. Uruchom ukierunkowany Vitest, walidację i audyt treści, odpowiedni weryfikator Rust, sprawdzanie typów i lint. Zapisz commit po angielsku.

## Zadanie 2 — zaufana weryfikacja za pomocą zewnętrznego klienta

Utwórz `scripts/fixtures/macro-contracts/{Cargo.toml,Cargo.lock,macro_contracts,external_consumer}` z możliwością ustalenia nazw przed pisaniem kodu, `scripts/macro-contracts-verifier.ts`, `scripts/verify-macro-contracts.ts`, ukierunkowane testy weryfikatora, skrypty npm i kroki CI stable/MSRV przed ogólną kontrolą archiwów. Przestrzeń używa tylko std, Rust 2024, resolvera 3 i `rust-version = "1.85.0"`. Sprawdź przesłanianie nazw w zewnętrznym kliencie, jednokrotność i kolejność z licznikami, 0/1/N wpisów, końcowy przecinek oraz `const {}` dla `:expr`. Poprawny przypadek wymaga rzeczywistego check i test w Cargo. Kontrolowane warianty z błędami muszą odpaść z właściwej przyczyny kompilacyjnej lub behawioralnej. Walidacja raportu odrzuca fałszywe zaliczenie bez powiązanych poleceń, z błędnymi skrótami danych testowych, niedopasowanym lub nieaktualnym kompilatorem albo wynikiem infrastruktury. Ogranicz czas, liczbę i wyjście procesów potomnych. Cargo pracuje offline i z blokadą. Uruchom testy weryfikatora i polecenia stable/MSRV. Zapisz commit po angielsku.

## Zadanie 3 — przeglądarka, tryb offline i dokumentacja

Po zakończeniu zadania 1 dodaj `tests/e2e/macros-as-api.spec.ts` i określone rozszerzenie `scripts/verify-offline.mjs`. Symulowane powodzenie produkcyjnego środowiska wykonawczego wymaga dokładnego kodu autorskiego i odpowiadających testów. Nieoczekiwany kod daje zgodne ze schematem `test-failure`. Sprawdź każde kryterium, ujawnione zadanie główne i niezależne puste, wznowienie szkicu i notatki, klawiaturę mobilną, axe i konsolę. Offline potwierdza dokładne wznowienie i wskazanie niedostępności kompilatora. Zaktualizuj `README.md` i `docs/{advanced-curriculum,requirements-audit,progress,verification}.md` z wyliczoną liczebnością katalogu, zweryfikowanym zakresem i ograniczeniem rozliczeń CI. Uruchom ukierunkowany Playwright, pełną próbę offline i kontrolę formatowania. Zapisz commit po angielsku.

## Integracja i zakończenie prac

Przenieś niezależnie przejrzane commity z zadań 1, 2 i 3 do czystego katalogu integracyjnego opartego na PR #26. Uruchom pełny Vitest, sprawdzanie typów, kontrole i audyt treści, lint, kompilację, weryfikator stable/MSRV, produkcyjny E2E, próbę offline i `git diff --check`. Napraw usterki przed publikacją i powtarzaj zestawy tylko z uzasadnieniem. Przegląd jakościowy sprawdza pięć ryzyk ze specyfikacji i zgodność twierdzeń dokumentacji z wynikami. Wypchnij nową gałąź i utwórz roboczy PR po angielsku względem `feat/api-release-matrix-milestone`. Dołącz artefakt PR. Zapisz stan dokładnego commita. Dopóki zadania Actions nie rozpoczynają się i kończą błędem, wstrzymaj scalenie.
