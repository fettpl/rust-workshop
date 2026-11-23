# Typy generyczne i traity — plan etapu

[English](2026-09-12-generics-and-traits.md)

Cel: rozwijać samodzielne projektowanie API działającego dla różnych typów bez niepotrzebnych ograniczeń i kopii. Zachować pełny cel zaawansowanego kursu; ten etap nie zamyka lifetimes, iteratorów ani dalszej praktyki zawodowej.

Architektura pozostaje data-driven. Nowe pliki generics.ts i traits.ts eksportują lekcje, moduły, pojęcia, kompetencje, powtórki i źródła. Integracja w course.ts nie zmienia istniejących identyfikatorów ani schemaVersion 3. Rust ucznia nadal wykonuje zewnętrzny sandbox.

- [x] Trzy lekcje generics: parametry typów, metody i własność, minimalne bounds wynikające z operacji.
- [x] Cztery lekcje traits: kontrakt/implementacja, generyczny konsument, associated types, dispatch i zgodność z dyn.
- [x] Każde pojęcie ma aktywną powtórkę, obserwowalny dowód oraz drugi wariant kodowy o zmienionym kontrakcie. Zadania od pustej kartki wymagają własnej implementacji.
- [x] Testy używają różnych typów, w tym typów bez Copy/Clone, oraz nowych implementacji traitów definiowanych w teście. Komunikaty kompilatora odpowiadają rzeczywistym błędom.
- [x] Weryfikacja starterów: wykryć zadania, których początkowy kod już przechodzi deklarowane kryteria, i usunąć pozorne dowody samodzielności.
- [x] Integracja mapy i źródeł, regresja UI, dokładny Resume nowej lekcji, odsłonięcie pomocy i świeży transfer.
- [x] Niezależny review, pełne sprawdzenie Rust, testów aplikacji, aktualności źródeł, rzeczywistego API, produkcyjnego offline i builda.
- [x] Aktualizacja audytu briefu i stanu projektu; przygotowanie zweryfikowanego etapu do commitu.

Nie deklarujemy skuteczności dydaktycznej bez pilotażu. Test techniczny potwierdza określone zachowanie, a nie samodzielność zawodową ucznia.

Weryfikacja: 89 testów Vitest, 573 autorskie przypadki Rust, 17 scenariuszy E2E, sprawdzony pakiet Cargo, 74 dostępne źródła, 9 prób rzeczywistego API oraz produkcyjny offline. Review usunął nadmierne podpowiedzi, wymusił samodzielne associated types i poprawił nawigację do zadania. Szczegóły i granice dowodu: [verification.md](../../verification.pl.md).
