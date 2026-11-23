# Lokalny audyt kursu, 20 listopada 2026

[English](curriculum-audit-2026-11-20.md)

Podstawa: `e4093ef`. Audyt przeszedł ścieżkę ucznia od wyboru lekcji,
przez odpowiedź, informację zwrotną i inne zadanie, po powrót na powtórkę,
eksport lub przywrócenie postępów. Sprawdził też, czy różne zapisane
historie mogą prowadzić do sprzecznych ocen.

| Obszar | Zakres i metoda | Wynik |
| --- | --- | --- |
| Ścieżki i czynności ucznia | Wszystkie 204 lekcje z 51 modułów, podstawowa ścieżka 17 modułów z przejściami do rozszerzeń i 16 ścieżek projektowych. Zadania lekcji i zarejestrowane powtórki sprawdzono z dostępnymi wejściami. | Przy braku lekcji lub usuniętym kroku aplikacja oferuje powrót do mapy przed otwarciem niezwiązanego zadania. Jawnie wybrana lekcja otwiera się na prawidłowym kroku. |
| Autorskie odpowiedzi | Przejrzano 1436 kroków i 204 powtórki. Sprawdzono wejścia mechanizmów oceny, polecenia i możliwość udzielenia sensownej alternatywnej odpowiedzi. | W 17 wyjaśnieniach projektu końcowego i lekcji o asynchronicznym pożyczaniu uczeń może przedstawić własne rozumowanie i ocenić je według jawnych kryteriów. Osiem kroków obserwacji można potwierdzić wprost. Zadanie porządkowania podaje nieuporządkowane nazwane czynności. Krótkie odpowiedzi techniczne odróżniają wyjście Rusta i wielkość liter identyfikatorów od sformułowań, które mogą się różnić. |
| Ograniczenia składni | Sprawdzono wzorcowy i alternatywny kod Rust oraz poszukiwany tekst występujący tylko w komentarzu lub literale. | Czas życia, komentarz zagnieżdżony, surowy literał tekstowy i surowy identyfikator nie powodują opisanych błędnych trafień i pominięć. Kontrole rozpoznają zadeklarowane wzorce tokenów. Zachowanie zadań wykonywalnych sprawdza środowisko wykonawcze. |
| Samodzielna praktyka | Sprawdzono wszystkie 240 kryteriów modułowych, 566 odwołań do zadań głównych, pięć kryteriów dodatkowych i 110 powiązań autorskich rozwiązań z zadaniami zaliczeniowymi. Porównano wcześniejsze i późniejsze próby, pomoc, nieaktualne metadane oceny oraz dawne i bieżące identyfikatory pojęć. | Importowane zaliczenia muszą identyfikować faktyczne zadanie i pojęcia. Przeczytanie gotowej implementacji wpływa na zaliczenie późniejszej próby. Wcześniejsze samodzielne wyniki zachowują ważność po otrzymaniu pomocy. Sama obserwacja nie stanowi drugiego wyniku tego rodzaju. |
| Przewidywanie i odpowiedź zwrotna | Sprawdzono przewidywanie przed wykonaniem, błędne przewidywanie z późniejszym wynikiem, informację korygującą wybór oraz zapisane próby o tym samym czasie. | Po podaniu przewidywania uczeń może uruchomić program. Zobaczenie odpowiedzi w wyniku programu lub informacji korygującej sprawia, że kolejna odpowiedź na to pytanie jest wspomagana. Prawidłowe przewidywanie podane przed zobaczeniem wyniku pozostaje samodzielne. |
| Utrwalenie i terminy powtórek | Sprawdzono natychmiastowe i odroczone przypomnienie, oczekiwane błędy i kryteria, zapisy z przyszłą datą, powtarzane sesje i równoważne pełne rozwiązania powtórek pod różnymi pojęciami. | Odstęp i poziom opanowania opierają się na kwalifikujących się zapisach i czasie od odpowiedniego kontaktu z materiałem. Powtarzanie tej samej zarejestrowanej zwykłej powtórki liczy się raz w liczbie zadań kompetencji. Sam dawny poziom z pamięci podręcznej nie potwierdza bieżącego opanowania. |
| Stan przeglądarki i odzyskiwanie | Sprawdzono rzeczywisty zapis IndexedDB, obsługiwane wersje 1–3, rywalizujące karty, nieudane zapisy, jawne zastąpienie, trwające odczyty pliku i odpowiedzi kompilatora, odtworzone ocenione sesje oraz retrospektywy projektów. | Nieaktualne karty zachowują szkic do eksportu. Wolny odczyt pliku nie zastępuje nowszego wyboru. Spóźniona odpowiedź kompilatora nie nadpisuje zakończonej powtórki. Przypomnienia projektu zachowują historię planowania. Lekcja i projekt Log Analyzer mogą mieć osobne notatki. Wcześniej wspólna notatka nadal jest dostępna. |

## Niezależny przegląd

GPT-6.1-Sol (high) sprawdził polecenia oceny, dowody i lokalne odzyskiwanie
danych wraz z poprawkami w tych obszarach. GPT-6.2-Astra (high) niezależnie
sprawdził ocenę przewidywania, odroczone przypomnienie po zobaczeniu
równoważnego rozwiązania i końcowy widok wersji produkcyjnej. W lekcji
CLI jedno odsłonięcie dało jeden zapis źródłowy. Powrót z innego kroku
i późniejsze przeładowanie dodały po jednym zapisie. Wszystkie trzy
pozostały zapisami zapoznania się z materiałem i zachowały wcześniejszą
historię.

## Lokalny wynik weryfikacji

Na Node 24.22.3 przeszło 4289 testów Vitest w 242 plikach, 306
produkcyjnych testów Chromium, kontrola przeglądarki offline i 26 testów
skryptów Node. Build produkcyjny, kontrola TypeScript i walidacja katalogu
przeszły. ESLint zgłosił 31 ostrzeżeń i zero błędów. Weryfikator Rust
zaliczył wszystkie 2855 autorskich przypadków.

## Powtórzenie kontroli

Pełny przebieg Vitest obejmuje zestawy testów poszczególnych kryteriów,
historycznego przypisania, kontaktu z rozwiązaniem, oceniania, migracji
i zapisu stanu. Produkcyjny Playwright używa rzeczywistego interfejsu
i IndexedDB. Aby powtórzyć oba na Node 24, przygotuj natywne materiały
testowe i serwer produkcyjny z [przewodnika CI](ci-cd.pl.md). Uruchom
`npm test`, `npm run test:e2e` i `npm run test:offline`. Dla katalogu
i autorskich przypadków Rust uruchom `npm run content:check` oraz
`npm run content:rust`. Weryfikatory Cargo mają własne udokumentowane
wymagania pamięci podręcznej offline i zestawu narzędzi.

## Granice weryfikacji

Produkcyjny zestaw przeglądarkowy zawiera scenariusze z atrapą kompilatora,
aby sprawdzać interfejs i zapisy wyników. Weryfikator Rust niezależnie
kompiluje lub wykonuje zaufane przykłady repozytorium. Wszystkie 32
pobierane archiwa Cargo porównano bajtowo z autorską zawartością.
Weryfikator offline skompilował każdy starter i sprawdził, że jego
test dotarł do niezaimplementowanej operacji. Każde rozwiązanie przeszło
testy obszaru roboczego i Clippy. Kontrole projektów obejmowały także
stabilny zestaw narzędzi dla modułów ze zmienioną oceną. Historyczne testy
zgodności przywracają zmienione węzły dokładnie do stanu poprzednika
i sprawdzają wykrywanie niezwiązanych zmian.

Kontrole objęły wszystkie wymienione wpisy katalogu i autorskie
powiązania dla podanych scenariuszy. Użyto Chromium, lokalnych natywnych
materiałów testowych i syntetycznych historii ucznia. Wyniki nauki
rzeczywistych osób, dowolne poprawne implementacje Rust, wszystkie
możliwe kolejności działań i inne przeglądarki pozostają poza pomiarem.
