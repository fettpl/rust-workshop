# Mini grep — projekt integracyjny

[English](2026-09-13-mini-grep-design.md)

Zatwierdzony cel całego kursu obejmuje Mini grep z oryginalnego briefu i rozszerzenia opisane w `docs/advanced-curriculum.md`. Ten etap buduje jeden rozwijany projekt biblioteki i CLI, wraz z lekcjami, niezależnymi próbami transferu oraz rzeczywistymi testami procesu. Nie zmienia istniejących identyfikatorów ucznia ani lokalnego zapisu.

## Kontrakt produktu

`mini-grep [-C N] [--] QUERY PATH...` wyszukuje niepusty literalny podciąg UTF-8, z uwzględnieniem wielkości liter. Obsługuje pliki i katalogi rekurencyjnie. `-C` występuje najwyżej raz przed QUERY; `--` kończy opcje. N zawiera wyłącznie cyfry ASCII bez znaku i oznacza liczbę 0–16. Brak query/ścieżek, nieznana opcja lub konflikt opcji daje błąd użycia. Ścieżki są przyjmowane jako OsString/PathBuf; niepoprawny UTF-8 w query/opcji jest błędem użycia. Nazwy ścieżek w raporcie są jawnie escapowane, aby LF, CR, TAB, dwukropek i ukośnik odwrotny nie rozbijały rekordów; nie należy udawać ich odwracalności dla nie-UTF8 ścieżek, jeśli użyto lossy display.

Wynik pliku to unia okien kontekstu wokół dopasowanych linii, bez duplikatów i w kolejności numerów. Każdy rekord ma `label:line:text\n`, bez separatorów grup; trafienie oraz kontekst mają ten sam format. Wiele ścieżek zachowuje kolejność argumentów, katalogi są przeglądane depth-first z sortowaniem wpisów według PathBuf. Powtórzony argument ponownie przetwarza plik; nie ma ukrytej deduplikacji. Brak gwarancji identycznego porządku nie-ASCII między systemami operacyjnymi.

LF kończy linię; pojedyncze CR przed LF jest usuwane z tekstu. Samotne CR na EOF pozostaje danymi. Końcowa linia bez LF jest przetwarzana; końcowy LF nie tworzy dodatkowej pustej linii. Niepoprawny UTF-8 lub NUL w treści oznacza błąd pliku binarnego/formatu; pusty plik jest poprawny. Czytanie nie materializuje całego inputu. Błąd odczytu po wcześniejszym trafieniu nadal jest błędem, z oryginalnym io::Error w Error::source.

Jawne limity: query 1024 bajty, raw line 65536 bajtów przed LF (wliczając CR), kontekst 16 linii, końcowy UTF-8 stdout 1048576 bajtów, odwiedzone wpisy 4096 (łącznie z korzeniami i katalogami), zagłębienie 32 (korzeń głębokość 0). Granice są włączne, nadmiar odrzucany. Ograniczenie liczby wpisów chroni także bufor sortowania dużego katalogu. Odrzucenie zbyt długiej linii musi następować bez skopiowania całej linii do własnego bufora; przy odrzuceniu wolno obejrzeć maksymalnie jeden dodatkowy bajt. Nie obiecujemy limitu alokacji narzuconego przez dowolną obcą implementację BufRead.

Program ogranicza zachowaną treść wybranych linii do 1048576 bajtów (tekst plus jeden bajt na każdą linię, także pustą), przekazując pozostały budżet do odczytu kolejnego pliku. Osobny limit 1048576 bajtów obejmuje cały wyrenderowany stdout, wliczając etykiety i numery linii. Są to limity logicznej zawartości, nie obietnica 1 MiB całego heapu: dodatkową pamięć zajmują metadane Vec/ścieżek, surowa linia, kontekst oraz bufor renderowania. Stdout jest publikowany dopiero po poprawnym przetworzeniu wszystkich wejść. Błąd wejścia/polityki/limitu nie pozostawia częściowego stdout. Awaria samego stdout może pozostawić część zapisu; nie jest to transakcja urządzenia. Kody wyjścia: 0 co najmniej jedno dopasowanie, 1 brak dopasowań bez diagnostyki, 2 błędy użycia/IO/formatu/limitu. Stderr opisuje etap i przyczynę; nie parsujemy go do sterowania biblioteką.

## Ścieżki i granice zagrożeń

`symlink_metadata` odrzuca dowiązania na napotkanym końcowym komponencie; rekurencja nie schodzi w linki. Odrzucane są pliki specjalne. Nie jest to sandbox ani ochrona przed wyścigiem metadane→open, dowiązaniem w komponencie nadrzędnym czy podmianą katalogu przez inny proces. Pracujemy na lokalnych ścieżkach wybranych przez właściciela, bez podniesionych uprawnień. Dokument threat modelu ma jasno opisać te granice. Zmiana danych podczas odczytu może zmienić wynik; program nie obiecuje snapshotu, zachowuje błędy, limit i poprawność formatu obserwowanych danych.

## Architektura i dydaktyka

Moduł `mini-grep` po `public-api-workspaces`. Lekcje i pojęcia: `grep-context-selection`, `grep-bounded-input`, `grep-path-policy`, `grep-cli-contract`, w tej kolejności. Pierwszy prerequisite to `api-compatible-surface`; pozostałe tworzą łańcuch. Każda lekcja ma przewidywanie/wykonywany kontrast, wyjaśnienie, primary gate `<id>-gate`, niezależny blank `<id>-blank` bez startera i bez przepisu oraz świeżą kodową powtórkę `review-<id>`. Blank podaje publiczne nazwy i format interop w prozie, nie sygnatury funkcji, listę kroków ani prywatny algorytm.

Dwie pierwsze lekcje uczą czystej selekcji i ograniczonego BufRead. Dwie kolejne uczą decyzji polityki ścieżek i kontraktu CLI przy użyciu przenośnych danych/adapterów; rzeczywiste katalogi, linki i procesy weryfikuje pakiet. Nie przedstawiamy jednoplikowego runnera jako dowodu zachowania systemu plików.

Projekt `mini-grep`, pakiet `mini-grep-workshop`, Rust 2024 i biblioteka standardowa. Biblioteka oddziela search/input, traversal, render i argumenty, binarka jedynie mapuje wynik na strumienie i kod wyjścia. Starter formatuje się i kompiluje; niezależne testy zatrzymują się na celowych `todo!`. Referencja zawiera testy unit/integration/doc/process, ADR, threat model, instrukcje i przykładowe fixture'y. Reveal oznacza pomoc wyłącznie dla czterech primary gate; blanki i powtórki pozostają niezależne. Pobranie/lokalna lista poleceń nie podnosi mastery.

## Dowody

Przed referencją powstają testy i obserwowana porażka startera. Testy granic obejmują małe porcje, EOF, CRLF, Unicode, pusty/duży wzorzec, binarny input, błąd po częściowym odczycie, utratę pierwotnej przyczyny, nakładające okna, limit outputu i konfigurację CLI. Testy katalogów mają deterministyczne fixture'y; Unix symlinki testuje się jawnie. Błąd dostępu nie może być udawany testem chmod uruchomionym jako root.

Test własności używa niezależnego prostego oracle dla selekcji kontekstu na generowanych małych wejściach. Metamorphic append-invariance dotyczy C=0; przy C>0 nowa linia może stać się kontekstem. Fuzzer libFuzzer obejmuje query i treść oraz sprawdza wynik przeciw niezależnemu oracle. Fuzz jest osobnym narzędziem developera na nightly; aplikacja i główny pakiet pozostają stable/std-only. Root dodaje osobny harness i rzeczywisty ograniczony przebieg, a także kontrolny mutant. Nie nazywamy testu deterministycznego fuzzingiem ani skończonego fuzzowania pełnym dowodem.

Kontrole wykonują tylko przejrzane autorskie pliki repozytorium i celowe mutacje, nigdy szkice/importy ucznia. Nie wysyłamy kodu do publicznego Playgrounda. Końcowy etap wymaga niezależnych recenzji, lint/typecheck/Vitest, Rust/Tokio/Cargo, źródeł, buildu, E2E, offline oraz commita/pusha z kontrolą dokładnego SHA w CI.
