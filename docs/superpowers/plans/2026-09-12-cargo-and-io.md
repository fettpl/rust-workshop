# Cargo i wejście/wyjście — plan etapu

Cel: przejść od pojedynczego programu i rdzenia Todo do publicznego API, pakietu Cargo oraz testowanego wejścia, formatu danych i trwałego zapisu.

Architektura: istniejący runner nadal wykonuje kod w izolowanym Playgroundzie. Lekcje modułów używają prawdziwych modułów inline. Pełny pakiet Cargo jest osobnym, pobieranym artefaktem kursu: pliki mają jawne ścieżki, opis ćwiczenia i testy. Aplikacja nie wykonuje komend systemowych ani szkiców ucznia na komputerze gospodarza. Pobranie pakietu nie nalicza mastery. Schemat zapisu pozostaje v3.

- [x] Cztery aktywne lekcje modułów, widoczności, importów i Cargo z testami kodu, powtórkami oraz niezależnymi kryteriami.
- [x] Trzy aktywne lekcje prowadzące do formatu danych Todo, błędów IO i pełnego projektu CLI; kontrakty ustalone przed implementacją.
- [x] Dane pakietu: nazwa, pliki, instrukcje, wariant startowy i jawnie oznaczone rozwiązanie. Pobierany ZIP zbudowany z tych samych plików, które sprawdza developerskie Cargo.
- [x] Widok plików i pobranie na stronie projektu, dostępne klawiaturą i na mobile; rozwiązanie ujawniane osobno.
- [x] Walidacja ścieżek, unikalności i wymaganych plików pakietu, bez dołączania notatek lub szkiców do autorskiego archiwum.
- [x] Testy domeny/UI, wszystkie autorskie fragmenty Rust, rzeczywiste Cargo check/test/fmt/clippy dla pakietu, smoke test izolowanego runnera i produkcyjny offline.
- [x] Niezależny review, korekty, aktualny audyt briefu, build produkcyjny i commit całego dużego etapu.

Dalszy zakres pozostaje pełny: generics, traits, lifetimes, iterators, rozbudowane testowanie, smart pointers, współbieżność, async, projekty spiralne i zaawansowana praktyka systemowa. Materiał i techniczna weryfikacja nie zastępują oceny samodzielnej pracy ani pilotażu z uczącymi się.

Weryfikacja: 86 testów Vitest, 400 autorskich przypadków Rust, 16 scenariuszy E2E, 19 testów pakietu Cargo, 7 prób rzeczywistego API i produkcyjny offline. Pełny raport oraz granice dowodu: [verification.md](../../verification.md).
