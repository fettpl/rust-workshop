# Makra jako API — zakres etapu kursu

[English](2026-09-25-macros-as-api-design.md)

25 września 2026 r. GPT-6-Astra medium odpowiada za planowanie i przegląd jakościowy projektu.

## Cel i zakres

Uczestnik zna podstawy programowania i dotarł do dalszych modułów Rust. Istniejące przykłady używają makr, ale kurs nie ma osobnej ścieżki definiowania `macro_rules!` ani utrzymywania zachowania makra dla innego pakietu. Dodaj jeden polskojęzyczny moduł w dalszej części kursu z trzema lekcjami trwającymi około 18–20 minut. Tematy to przechwycenie wyrażeń i dokładnie jednokrotna ewaluacja, gramatyka powtórzeń z pustym wejściem i opcjonalnym końcowym separatorem oraz rozwiązywanie nazw eksportowanego makra, `$crate` i fragment `expr` edycji Rust 2024. Każde pojęcie ma przewidywanie, uruchamialny lub obserwowalny przykład, objaśnienie, zadanie programistyczne, odrębny transfer od pustego edytora, obserwację debugowania i opóźnioną powtórkę. Moduł dotyczy określonego zakresu makr deklaratywnych. Makra proceduralne i pełne metaprogramowanie pozostają odrębne.

Moduł ma samodzielną wartość, a opis dowodów wskazuje ich zakres. Ćwiczenia w przeglądarce wykonują jeden plik Rust i potwierdzają jego zachowanie. Oddzielny zaufany przypadek Cargo kompiluje i testuje bibliotekę z eksportowanym makrem używanym przez inny pakiet kliencki. Lokalny weryfikator nie dostaje kodu uczestnika, importowanego archiwum, zdalnego rejestru ani dostępu do sieci. Zachowaj archiwa projektów i identyfikatory postępów.

## Zewnętrzny kontrakt objęty nauką i weryfikacją

Użyj nowej domeny, na przykład pomiarów, odmiennej od zadań publicznego API i testów własności. Biblioteka eksportuje makro wyrażeniowe `macro_rules!`, które tworzy uporządkowane pomiary z par `name => value`. Makro przyjmuje zero wpisów i opcjonalny końcowy przecinek, wykonuje każde podane wyrażenie dokładnie raz w kolejności wejścia i odwołuje się do `$crate::Reading` lub publicznej ścieżki konstruktora. Zewnętrzny klient może użyć makra bez importu tego typu. Dopasowanie `:expr` jest zdefiniowane w pakiecie edycji 2024 i przyjmuje `const { ... }`. Klient celowo definiuje odrębny lokalny `Reading` w celu wykrycia ścieżek bez kwalifikacji. Makro ma unikać przypadkowego przechwycenia typu lub wartości klienta. Jawnie określ widoczność publicznej funkcji pomocniczej, ponieważ `$crate` podlega regułom prywatności.

Weryfikator uruchamia przestrzeń Cargo z dwoma pakietami, std, edycją 2024, resolverem 3 i deklarowanym Rust 1.85.0. Wykonuje `cargo check/test --offline --locked` dla stabilnego i dokładnego Rust 1.85.0 i zapisuje ograniczony raport JSON ze skrótami danych testowych, tożsamością kompilatora, poleceniami, kodami zakończenia i wynikami celowych błędów. Wymagane warianty: usunięcie kwalifikacji `$crate` ma dać błąd kompilacji klienta, podwójna ewaluacja ma oblać test zachowania, odrzucenie pustego wejścia lub końcowego przecinka ma dać błąd kompilacji klienta, a zamiana `:expr` na `:expr_2021` ma odrzucić wywołanie z `const` w edycji 2024. Walidator odrzuca brakujące, nieaktualne, fikcyjne, powielone i wyłącznie infrastrukturalne wyniki. Przekroczenie limitu czasu i brak kompilatora to awarie infrastruktury.

## Integracja z kursem i obsługa przez użytkownika

Zarejestruj moduł, pojęcia, kompetencje, metadane źródeł, kroki i powtórki po powiązanych lekcjach testów i publicznego API. Zachowaj obecne ID i migracje. Kryterium może zaliczyć główne zadanie kodowe albo rzeczywiście niezależny wariant od pustego edytora. Ujawnienie rozwiązania głównego wyklucza niezależne zaliczenie tej próby. Tekst uczestnika rozróżnia model przeglądarkowy i zaufany weryfikator zewnętrznego pakietu. Użyj oficjalnych Rust Book, Reference i Rust 2024 Edition Guide z datą przeglądu i polityką ponownej kontroli. Tekst uczestnika jest po polsku, a README, commity i PR po angielsku. Zakładaj podstawy programowania, Rust od zera.

Ukierunkowany produkcyjny Playwright i offline obejmują nawigację, trzy kryteria, skutki ujawnienia, niezależny pusty wariant, dokładne wznowienie szkicu i notatki, klawiaturę mobilną, dostępność i błędy konsoli. Symulowana usługa może zwrócić sukces tylko dla dokładnego autorskiego rozwiązania i odpowiadających mu testów ewaluatora. Nieoczekiwany kod dostaje błąd zgodny ze schematem. Offline potwierdza zapis i obsługę niedostępności kompilatora.

## Realizacja i integracja

Użyj oddzielnych katalogów roboczych na HEAD PR #26 `d0210272c38ca13699621d412f085662fff4ec2c`. Etap ma się nałożyć na macierz zgodności wydań API, gdy GitHub Actions jest zablokowany stanem konta. Zachowaj przejrzalne commity modułu, weryfikatora, E2E i dokumentacji. Uruchom ukierunkowane i pełne lokalne kontrole, weryfikator stable/MSRV, produkcyjny E2E i próbę offline. Wypchnij nową gałąź i otwórz roboczy PR do gałęzi PR #26. Poczekaj ze scaleniem, aż po przewidywanym odblokowaniu rozliczeń 1 października 2026 r. GitHub Actions zaliczy dokładny HEAD. Roboczy PR i lokalne wyniki dotyczą tylko ustalonego etapu i zakresu API makra.

## Zakres przeglądu

1. Argumenty ze skutkami ubocznymi wykonują się po jednym razie i w kolejności. Przykład bez skutków ubocznych nie wystarcza.
2. Puste wejście, jeden wpis, wiele wpisów i końcowy przecinek zachowują udokumentowaną gramatykę. Wadliwa składnia odpada przy kompilacji.
3. Przesłonięcie nazwy u klienta nie zmienia ścieżki `$crate` biblioteki. Publiczna widoczność musi wystarczyć do wywołania.
4. Różnicę `:expr` oraz `:expr_2021` w edycji 2024 potwierdź na dokładnym Rust 1.85.0. Wersja stabilna daje własny wynik.
5. Błąd kompilacji poprawnego przykładu, przekroczenie czasu i pominięcie polecenia nie potwierdzają kontraktu ani odrzucenia celowej usterki.

## Podstawowe źródła techniczne

- https://doc.rust-lang.org/book/ch20-05-macros.html
- https://doc.rust-lang.org/reference/macros-by-example.html
- https://doc.rust-lang.org/edition-guide/rust-2024/macro-fragment-specifiers.html
