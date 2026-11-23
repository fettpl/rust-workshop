# Naprawa kontraktów oceny w warsztacie

[English](005-workshop-assessment-contracts.md)

Podstawą jest lokalny kandydat `7d803e4`. Uwzględnij cztery ustalenia
audytu kursu z 18 listopada w jednym lokalnym zestawie zmian.
Zachowaj polski tekst dla uczniów oraz istniejące identyfikatory lekcji,
ćwiczeń i projektów. Zachowaj szkice i znaczenie wcześniejszych prób.
Integracja zdalna wymaga osobnej decyzji o publikacji.

| Praca | Dowód akceptacji |
| --- | --- |
| 1. Udostępnij autorskie zadania programistyczne bez kodu startowego. Wyznaczaj dostępność edytora na podstawie czynności i mechanizmu oceny w lekcji i powtórce. Obserwacje kodu pozostają tylko do odczytu. Zachowaj ćwiczenia tekstowe i dotyczące manifestów. | Sprawdź wszystkie 22 zmienione definicje powtórek i sześć kroków przypomnienia. W przeglądarce wpisz program na świeżym stanie, wyślij odpowiedź, obejrzyj informację zwrotną i wznów zapisany szkic. Sprawdź oba widoki i jedno niezmienione ćwiczenie. |
| 2. Dopasuj cztery obserwacje diagnostyki w lekcjach o typach generycznych i domknięciach do działania dostępnego na ekranie. Wyjaśnij różnicę między błędnym a poprawionym programem i wskaż krok pozwalający naprawić kod. | Wyświetlany kod startowy daje wskazany komunikat. Obserwacja opisuje ten wynik. Naprawy odbywają się w edytowalnych krokach, w których ocena oczekuje sukcesu. Sprawdź E0308, E0507, E0369 i E0596 na autorskich przykładach. |
| 3. Wzmocnij pięć ocen Rust: `capture-gate`, `join-report-blank`, `loom-evidence-assertions-gate`, `property-invariants-gate` i `property-generated-inputs-gate`. | Każde rozwiązanie autorskie przechodzi testy. Testy odrzucają czyszczenie istniejącego wyjścia, odwrócenie identyfikatorów wątków, przyjęcie sprzecznych obserwacji i dwie funkcje pomocnicze testów własności obsługujące pojedynczy przypadek. Sprawdzaj zachowanie bez narzucania ciała funkcji. |
| 4. Uzgodnij sprzeczne polecenia, przykłady i oczekiwane wyniki. Zacznij od semantyki licznika Drop, reprezentacji rodzica przez słabe odwołanie i filtrowanego generatora. Obejmij też sąsiednie przypadki pustej daty, zasady EOF/CR i opis bezwzględnego terminu. | Niezerowa wartość wejściowa licznika, deklarowana reprezentacja, pokazany wynik generatora, granica daty i obsługa EOF mają zgodny opis i sprawdzenie. Potwierdź oczekiwany wynik przekroczenia czasu w powiązanym scenariuszu. |

## Integracja i akceptacja lokalna

1. Gdy jest to możliwe, uruchom testy regresji na wcześniejszej wersji
   i pokaż pierwotny błąd. Oznacz atrapy transportu przeglądarkowego
   oddzielnie od rzeczywistej kompilacji w Ruście.
2. Sprawdź niezmienne historyczne materiały testowe. Odróżnij zamierzone
   zmiany obecnej treści od regresji. Zachowaj kolejność pozycji wznowienia.
   Aktualizuj wykaz źródeł dla sprawdzonych materiałów.
3. Wykonaj walidację katalogu, lint, TypeScript, odpowiednie testy Rust,
   testy jednostkowe, build produkcyjny i regresje przeglądarkowe. Zapisz
   rzeczywiste niepowodzenia i pominięcia.
4. Poproś niezależnego recenzenta GPT-6.1-Sol (high) o sprawdzenie
   wszystkich zmian, pokrycia akceptacji i zgodności. Zapisz lokalnie
   zweryfikowaną naprawę w angielskim commicie.

## Kwalifikacja lokalna

Pełny zestaw jednostkowy zaliczył 2028 testów z włączoną kwalifikacją
lokalnego zestawu narzędzi Rusta. Dwa zestawy oceny Rust zaliczyły
wszystkie 22 testy na minimalnej obsługiwanej wersji Rust 1.85.0.
Regresje odrzucają siedem błędnych implementacji przyjmowanych wcześniej.

W produkcyjnej wersji przeszło wszystkich 49 wybranych scenariuszy Chromium.
Testy przeglądarkowe używają atrapy transportu do wysyłania odpowiedzi.
Osobne natywne testy Rust sprawdzają autorskie programy, komunikaty
kompilatora i wyniki oceny. TypeScript, build produkcyjny i kontrola
offline przeszły. ESLint zgłosił 31 ostrzeżeń i zero błędów. Kontrola
pochodzenia wydania objęła 376 wpisów wykazu.

Niezależny recenzent GPT-6.1-Sol (high) zgłosił problem z zachowaniem
właściwości o kluczach typu Symbol w historycznych danych testowych
katalogu. Naprawa i test regresji przeszły ponowny przegląd. Zachowano
pozycje istniejących lekcji i kroków. Edytowalną naprawę generatora
dodano na końcu jego lekcji.
