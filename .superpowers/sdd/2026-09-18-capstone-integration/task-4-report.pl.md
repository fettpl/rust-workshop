# Raport z zadania 4 — polskie lekcje i kryteria samodzielnego zaliczenia

[English](task-4-report.md)

Sprawdzony commit bazowy: `6adebf2513741d61ff226d1e525a3c75d3bf1a41`

W module `capstone-integration` przygotowano następujące elementy:

- Sześć polskich lekcji. Kursant przewiduje wyniki, porównuje przypadki, wyjaśnia zachowanie i odtwarza rozwiązanie z pamięci, a następnie stosuje je w nowym zadaniu i projekcie.
- Sześć pojęć i sześć kompetencji wraz z wymaganiami wstępnymi, pytaniami odnoszącymi się do częstych błędów i niezależnymi powtórkami.
- Dwanaście bramek z określonymi identyfikatorami i kryteriami zaliczenia.
- Sześć zadań do portfolio, które kursant rozpoczyna od pustego pliku. Sam wybiera sygnatury funkcji. Ocena według kryteriów jest odrębna od automatycznego zaliczenia.
- 24 zestawy testów w Rust, wykorzystujące wyłącznie bibliotekę standardową. Przechodzą je implementacje wzorcowe oraz równoważne rozwiązania o innej strukturze. Warianty zawierające celowy błąd kompilują się i nie przechodzą wskazanego testu zachowania.
- Kod startowy jest kompilowany i uruchamiany oddzielnie. Niewypełnione `todo!()` powoduje oczekiwaną porażkę testu.
- Osiem sprawdzonych źródeł z linkami do konkretnych wersji Tokio i rusqlite oraz datą przeglądu.
- Rejestracja projektu `durable-log-service`, powiązania między pakietem i odsłanianymi zadaniami oraz wpis modułu na mapie programu.
- Aktualizacja liczebności katalogu sprawdzanej przez testy.

## Weryfikacja

Polecenia uruchomiono w katalogu `<maintainer-home>/Documents/GitHub/rustcrushcourse`.

| Polecenie                                                                                                                           | Wynik                                                                                                                                         | Zakres / limit                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                                               | PASS                                                                                                                                           | TypeScript kompilator, bez emitowania                                                                                           |
| `npm run content:check`                                                                                                           | PASS                                                                                                                                           | `Content valid: 164 lessons, 167 concepts, 7 traces`                                                                   |
| `npm test -- --run src/content/capstone-integration-integration.test.ts src/content/projects/durable-log-service/package.test.ts` | PASS                                                                                                                                           | 2 pliki, 11 testów                                                                                                      |
| `npm test -- --run src/content/capstone-integration-assessment.test.ts`                                                           | PASS                                                                                                                                           | 26 testów; 24 kontrakty plus coverage/starter kontrole; czas trwania procesu rustc 60 s kompilacji / 8 s wykonanie na urządzenie |
| `npm run content:rust`                                                                                                            | PASS                                                                                                                                           | repozytorium Weryfikator zawartości rust na `rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`                                   |
| `npm test -- --run`                                                                                                               | PASS                                                                                                                                           | 68 plików, 419 testów                                                                                                    |
| `rg -n -i '\\b(java                                                                                                               | python)\\b' src/content/capstone-integration* src/content/projects/durable-log-service.ts src/content/projects/durable-log-service/archive.ts` | PASS                                                                                                                   | bez zwrócenia uwagi uczącego się Java/Python odniesienia |

W pierwszym pełnym przebiegu nie przeszedł test integracji katalogu, który nadal oczekiwał liczebności sprzed dodania projektu (42/158/161/113/300/12). Po aktualizacji oczekiwanych wartości przeszło wszystkich 419 testów.

## Zakres weryfikacji

Sprawdzono model działania kursu w przeglądarce oraz zachowanie przygotowanych programów w Rust. Uruchamianie kodu kursanta, SQLite, TCP, publikacja pakietu, bieżące ostrzeżenia bezpieczeństwa i wdrożenie produkcyjne wykraczają poza tę próbę. Weryfikację archiwum na stable i minimalnej obsługiwanej wersji Rust (MSRV) przewidziano w kolejnym zadaniu.

## Poprawki po pierwszym przeglądzie

Zachowano sześć lekcji, dwanaście bramek, sześć zadań od podstaw, sześć niezależnych powtórek i 24 zestawy testowe. Wprowadzono osobny wynik dla zapisu zatwierdzonego bez dostarczonego potwierdzenia. Ponowienie zachowuje numer potwierdzenia, a aktualizacja wierszy, potwierdzeń i numerów następuje atomowo. Rozdzielono limity połączeń i kolejki zapisu. Płatność identyfikują `(account, external_id)` oraz treść. Odrzucane są obserwacje z przyszłości, a nieudana migracja zachowuje znacznik schematu. Polskie polecenia i wskazówki precyzują rozmiary, alfabet, normalizację i czas obserwacji. Osobno sprawdza się każdą z sześciu powtórek. Samodzielna implementacja bez późniejszej powtórki nie potwierdza trwałości wiedzy.

Zatwierdzenie do celów niniejszej opinii: `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 pliki, 33
testy); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 plików, 420 testów); oraz `git diff --check` PASS. Limity
podprocesu zamocowania rusty pozostają na poziomie 60 s kompilacji / 8 s wykonania na
jedno urządzenie.

## Poprawki po drugim przeglądzie

Commit bazowy: `ecf7d79e506f7ad530b1697397fb90a1f8143c21`. Powtórka dotycząca incydentu zwraca osobny wynik `CommittedUndelivered`. Osobno liczone są próby, zatwierdzenia i dostarczone potwierdzenia. Identyfikatory przesyłek muszą być zapisane w ASCII i mieścić się w limitach 1–6 lub 1–10 bajtów. Treść powtórek i polskie wskazówki uzgodniono z interfejsami testowanych programów. Późniejszą ocenę opanowania materiału oparto na niezależnie zarejestrowanej powtórce. Alternatywna implementacja mapowania kodów błędów korzysta z indeksowanej tablicy. Zachowano sześć lekcji, dwanaście bramek, sześć zadań od podstaw, sześć powtórek oraz 24 zestawy testowe.

Drzewo walidacyjne okrągłe-dwa: commit głowy `06d47acd65723b66d5ed428f3b93550b7b68dcf1`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2
pliki, 33 testy); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 plików, 420 testów) oraz `git diff --check` PASS.
Limity podprocesu zamocowania rusty pozostają na poziomie 60 s kompilacji / 8 s
wykonania na jedno urządzenie.

## Poprawki po trzecim przeglądzie

Commit bazowy: `ef3456f330e2fc57b804f4c0198d588439f453df`. Aktualność obserwacji sprawdza poprzednia bramka. Decyzja o wydaniu sprawdza zgodność, możliwość odtworzenia i pochodzenie zależności. Wskazówki programistyczne powiązano z identyfikatorami kryteriów, w tym z limitami 6/10 bajtów i mapowaniem kodów błędów. Identyfikatory przesyłek wymagają ASCII, a miejsca docelowe mogą zawierać UTF-8 w ustalonym limicie bajtów. Niezależna powtórka korzysta z innej implementacji i obejmuje znaki Unicode oraz przekroczenie limitu. Powtórka dotycząca cyklu życia zwraca wartość logiczną. Zakres katalogu i polskie polecenia pozostają zgodne z poprzednim przeglądem.

Drzewo walidacyjne okrągłe-trzy: commit głowy kodu `496d3b608bf911d0724d092c7e14e7ccc7120a94`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS
(2 pliki, 33 testy); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 plików, 420 testów) oraz `git diff --check` PASS.
Limity podprocesu zamocowania rusty pozostają na poziomie 60 s kompilacji / 8 s
wykonania na jedno urządzenie.

## Ostatnie poprawki redakcyjne

Commit bazowy: `bb499501db9d44313e8d3e204f75884cd0f2a443`. Wskazówka rozróżnia identyfikator ASCII i wiadomość UTF-8. Powtórka o cyklu życia odwołuje się do wyniku `Done`. Zachowano liczebność materiałów i dotychczasowe testy zachowania.

Drzewo walidacji: kodowa głowica commit `7908fe65d8d1a09601e0b39996fd4d5c9b8766cd`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 pliki,
33 testy) oraz `git diff --check` PASS.
