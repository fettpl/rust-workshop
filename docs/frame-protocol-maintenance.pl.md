# Ćwiczenie z utrzymania Frame Protocol

[English](frame-protocol-maintenance.md)

Opcjonalna lekcja `api-frame-protocol-maintenance` następuje po czterech
dotychczasowych lekcjach modułu Public API Workspaces. Jedynym obowiązkowym
warunkiem wstępnym jest `api-compatible-surface`. Późniejszy moduł dotyczący
macierzy wydań daje dodatkowy kontekst, a ścieżka początkująca pozostaje
dostępna bez niego.

Kandydat na wersję edukacyjnej przestrzeni roboczej ma numer 1.1.0 i
ustawienie `publish = false`. Dodaje niewyczerpujący typ `FrameErrorCode`,
metodę `FrameError::code()` i jawne podsumowanie błędu w funkcji `diagnostics`.
Zachowuje dotychczasowy interfejs klienta, źródło błędu, format danych w
protokole, domyślne funkcje oraz dokładną MSRV Rust 1.85.0. Klient z funkcjami
domyślnymi i bez nich nadal wypisuje `frame-probe: payload=4 bytes`.
W ćwiczeniu klient diagnostyczny rozpoznaje `UnexpectedEof` niezależnie przez
typowaną kategorię i przez `Error::source`, bez analizowania tekstu
komunikatu. `format` pozostaje odrębną funkcją wykorzystującą serde.
Zmiana nie wprowadza zależności zewnętrznych.

Przestrzeń robocza do pobrania zawiera dwa niewypełnione polskie arkusze
`MAINTENANCE-CHALLENGE.md` i `CHANGE-REVIEW.md`. Kursant pracuje we własnym
środowisku i wybiera wewnętrzną architekturę. Zachowuje zgodność z
dotychczasowymi klientami, w tym ze wskaźnikiem do funkcji, starszym
interfejsem, odbiorcą z `dyn` i typami bez `Clone` i `Debug`. Dodaje
osobny test regresji z deterministycznym błędem `BrokenPipe` podczas
zapisu oraz z odrzuceniem przekroczenia limitu przed wykonaniem operacji
wejścia lub wyjścia na danych. Materiały do przeglądu proszą o rozważone
warianty, zaobserwowane wyniki testów, odpowiedź opartą na kontrakcie i
decyzję o dalszym postępowaniu. Kursant sam wybiera architekturę i może
samodzielnie przeprowadzić przegląd.

Sześć kroków w przeglądarce obejmuje przewidywanie wyniku, wyjaśnienie,
przykład korzystający wyłącznie z biblioteki standardowej, zadanie z
kryteriami, samoocenę przeglądu i zwykłą powtórkę w tej samej sesji. Kroki
nie uruchamiają pobranej przestrzeni roboczej Cargo ani nie przyznają
osobnego zaliczenia kategorii zadań programistycznych. Dotychczasowe
pojęcia, kalibracje, ćwiczenia z przeglądu, cztery kryteria modułu, zapisane
pozycje i historyczne dowody wykonania zachowują swoje identyfikatory.

Lekcja ma jawnie przypisaną rolę `practiceOnly`. Oznacza opcjonalne
ćwiczenie bez wymagań zaliczeniowych i bez osobnego zaliczenia zadania
programistycznego. Kroki mogą przedstawić zagadnienie, poprosić o
przewidywanie wyniku, powtórkę w tej samej sesji lub samoocenę według
kryteriów. Nie wolno dodawać do nich warunku zaliczenia opartego na
dowodach wykonania ani `codingTaskId`. Osoby utrzymujące treść muszą
pominąć tę lekcję w odwołaniach do zadań warunkujących zaliczenie modułu,
ocenach modułowych i głównym polu `lessonId` projektu. Zwykłe lekcje
podlegają standardowemu audytowi wymagań opartych na dowodach wykonania
innych niż samoocena. Weryfikacja treści i audyt źródeł stosują tę samą
regułę. Audyt wykazuje lekcję w `practiceOnlyLessons`.

Weryfikacja przez osoby utrzymujące projekt obejmuje wyłącznie stałe
przypadki testowe z repozytorium.

```sh
npm run content:packages
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:supply-chain
npm run content:check
npm exec vitest run src/content/api-frame-protocol-maintenance.test.ts src/content/public-api-integration.test.ts
```

Przygotuj narzędzia i zależności do pracy bez sieci zgodnie z instrukcją
[CI i weryfikacja lokalna](ci-cd.pl.md). Ukończenie polecenia dokumentuje
wyłącznie zadeklarowany przypadek testowy z repozytorium i wybraną wersję
kompilatora. Brak narzędzi lub zależności, nieoczekiwane błędy kompilacji i
przekroczenie limitu czasu są awariami infrastruktury. Klient, którego
kompilator ma odrzucić, musi zakończyć się w zadeklarowanej fazie i zwrócić
oczekiwaną diagnostykę. Mutant sprawdzający zachowanie musi się skompilować,
a następnie zostać odrzucony przez wskazaną asercję.

Dowody wydania dołączone do archiwum wskazują zaakceptowany wcześniejszy
stan źródeł oraz znormalizowane skróty danych testowych i plików, z
pominięciem samego dowodu. Identyfikatory końcowego commita i drzewa oraz
skrót całego wygenerowanego archiwum trafiają do raportu koordynatora poza
archiwum. Wpisanie ich do archiwum zmieniłoby wskazywany przez nie artefakt.
Migawki cargo-deny i ostrzeżeń o podatnościach zachowują zapisany status
wstrzymania z powodu braku wsparcia lub infrastruktury. Aktualna ocena
podatności wymaga osobnej kontroli. Frame Protocol nie zmienia makr.
Przypadek testowy Macros as APIs pozostaje odrębny.

Zakres przygotowanych materiałów, samoocena w przeglądarce i wyniki testów
repozytoryjnych dokumentują ten etap prac. Kompetencje kursanta, trwałość
wiedzy po przerwie, bezpieczeństwo protokołu w ogólnym przypadku i gotowość
wydania wymagają odrębnej weryfikacji. Kontrole hostowane i publikacja mają
własne kryteria dopuszczenia.
