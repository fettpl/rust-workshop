# Czytelność i fundamenty Rust — plan wdrożenia

[English](2026-09-12-readability-foundations.md)

**Cel:** odświeżyć interfejs, zapewnić start od zerowej znajomości Rust i porównać produkt z pełnym briefem.

**Architektura:** zachowujemy lokalny stan v3 i identyfikatory istniejących lekcji. Osobny katalog fundamentów łączy się z katalogiem ownership przez `course.ts`; mapa i nawigacja korzystają z tablicy modułów. Edytor i silnik dowodów pozostają wspólne.

**Ograniczenia:** brak założeń o znajomości innych języków; brak resetowania postępu; żadnego wykonywania kodu użytkownika w lokalnej powłoce; dostęp do wszystkich lekcji pozostaje otwarty. Pełne curriculum z briefu jest kierunkiem rozwoju, a nie ukończoną funkcją.

- [x] Przebudować paletę light/dark na biel, szarości, granat i niebieski; zwiększyć czytelność etykiet, poleceń, paneli i przycisków (`globals.css`, Monaco). Zweryfikować pulpit i mobile wizualnie oraz axe.
- [x] Zmienić dashboard na rzeczywisty plan bieżącej lekcji; dodać wybór modułu i odnośniki do dowodów zaliczenia (`overview.tsx`, `app-shell.tsx`). Sprawdzić wznowienie istniejącej lekcji i otwarcie fundamentów bez utraty danych.
- [x] Dodać pięć lekcji fundamentów, źródła, koncepty i jawny kontrakt modułu (`foundations.ts`). Kompilować startery, rozwiązania i testy za pomocą `content:rust`.
- [x] Uogólnić walidator grafu na wiele modułów (`validate.ts`, `course.ts`). Testować błędne przypisanie lekcji, cykle modułów i odwołania do obcego assessmentu.
- [x] Sprawdzić powtórki i przekrojowe kompetencje; uzupełnić brakujące mechaniki wykazane przez audyt, z testami dowodów i utrwalania.
- [x] Ukończyć `docs/requirements-audit.md`, zaznaczając zakres zrealizowany, częściowy, dalszy i zmieniony decyzją użytkownika.
- [x] Uruchomić lint, TypeScript, Vitest, walidację treści/Rust, build i Playwright. Odświeżyć lokalny podgląd na porcie 3002 i sprawdzić produkcyjny tryb offline.

Wyniki i rzeczywiste ograniczenia zapisano w [raporcie weryfikacji](../../verification.pl.md). Końcowe sprawdzenia: 75 testów Vitest, 113 przypadków Rust, 9 scenariuszy Playwright, lint, TypeScript, walidacja treści, build, 14 źródeł HTTP, 5 rzeczywistych prób API i produkcyjny offline — poprawne. Podgląd na porcie 3002 odświeżony. Skuteczność dydaktyczna wymaga osobnego badania z uczącymi się.
