# Poprawki po audycie zależności — 2026-10-06

[English](dependency-audit-2026-10-06.md)

Etap utrzymaniowy wychodzi z commita `7fd4238fee8fe2639b202d05ef70438a91beb2b9`
gałęzi `origin/main` i jest prowadzony na
`maintenance/dependency-audit-oct6`. Obejmuje wyłącznie manifest
pakietu, plik blokady npm, konfigurację CI, pomocnicze skrypty audytu,
śledzone testy polityki i środowiska natywnego oraz ten raport.
Ścieżki kursu, autorskie treści i dowody, weryfikatory Rusta,
edytor i interfejs oraz README wykraczają poza ten zakres.

## Stan wyjściowy

Audyt czystej gałęzi main użył Node `v22.23.3` i npm `10.9.9`.

```text
/opt/homebrew/opt/node@22/bin/npm audit --json
exit 1; 10 vulnerable package nodes: 8 high, 2 moderate, 0 critical
/opt/homebrew/opt/node@22/bin/npm audit --omit=dev --json
exit 1; 4 vulnerable package nodes: 2 high, 2 moderate, 0 critical
```

Surowe raporty bazowe zachowano poza repozytorium w
`<private-temp>/receipt-014` i `<private-temp>/receipt-015`.
Dziesięć węzłów pakietów z pełnego raportu odpowiada dziesięciu
wpisom pliku blokady występującym na jedenastu ścieżkach grafu.
Ich liczba dotyczy zależności, a nie odrębnych sposobów
wykorzystania podatności.

## Poprawki kandydata

Manifest wymaga `sharp@^0.35.5`. Plik blokady wybiera

- `sharp@0.35.5`, w tym natywne pakiety dla Linuksa i wpisy `@img/sharp-libvips-*@1.3.4`
- produkcyjną zależność pośrednią `source-map-js@1.2.2` przez Next/PostCSS
- wersje `1.1.21` i `5.0.12` z obu linii `brace-expansion` objętych komunikatem

`braces@3.0.3` pozostaje w deweloperskim łańcuchu Next i ESLint.
W momencie audytu komunikat nie wskazywał wydanej poprawki. Next
pozostaje w linii 16.x, a `eslint-config-next` w wersji 16.3.5 z
dotychczasowym nadrzędnym ESLint 9. Etap ogranicza się do celowych
aktualizacji zależności, bez ESLint 10 i bez niezgodnego cofnięcia
`eslint-config-next`.

Problem edytora Monaco pozostaje otwarty w tym etapie.
`monaco-editor@0.56.0` dostarcza skompilowane zasoby przeglądarkowe
z DOMPurify 3.4.8, kopiowane przez `scripts/setup-assets.mjs`.
Proponowana przez npm wersja 0.57.0 nadal ma wbudowane DOMPurify
3.4.15, wcześniejsze od poprawki 3.4.16. Nadpisanie wersji DOMPurify
na poziomie npm nie zmienia gotowych zasobów, więc na tym etapie
pozostawiono Monaco i jego zasoby bez zmian.
[GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2)

Komunikaty i dokumentacja

- sharp. [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- source-map-js. [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- brace-expansion. [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)
- braces bez poprawki. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- Nierozwiązany problem DOMPurify wbudowanego w Monaco. [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2)
- Próg blokujący CI. [Działanie progu polecenia `npm audit`](https://docs.npmjs.com/cli/v10/commands/npm-audit/)

## Audyt blokujący w CI

Skrypt `audit:production` uruchamia `npm audit --json` i
`npm audit --omit=dev --audit-level=high --json`. Zawsze zapisuje
`full.json`, `production.json` i `summary.json` pod
`test-results/dependency-audit/`. Podsumowanie zapisuje status
każdego polecenia, znacznik UTC, commit, SHA-256 pliku blokady,
próg, odczytane liczby, stderr i błędy walidacji. Wadliwe wyjście,
błąd rejestru lub sieci, niedostępne polecenie i niezerowy kod
produkcji powodują niepowodzenie kroku. Wynik podatności pełnego
audytu ma charakter informacyjny, a raport nadal musi dać się
poprawnie odczytać. Istniejąca przypięta akcja przesyłania
artefaktów działa z `if: always()`, więc zachowuje raporty także
po blokującym niepowodzeniu i zachowuje wynik błędu kroku.

Śledzony test polityki `test:audit-production` działa zaraz po
`npm ci` i przed właściwym audytem. Sprawdza przejście z samymi
umiarkowanymi ustaleniami, niezależne blokowanie przy wysokich i
krytycznych ustaleniach, zły format liczników, błędy procesów,
błędy rejestru i zachowanie wszystkich trzech raportów.

To samo zadanie linuksowe zapisuje faktyczne wersje Sharp,
libvips i librsvg. Przed dekodowaniem małego SVG do PNG
weryfikuje Sharp `>=0.35.5` i librsvg `>=2.63.2`. Ta
kontrola dotyczy rzeczywistego natywnego środowiska Linux.
Wynik Sharp z macOS dotyczy innej platformy. Ukierunkowany
test polityki Node obejmuje wersje niższe, równe i wyższe
oraz brak i zły format oznaczenia stabilnej wersji.

Wyniki audytu kandydata po czystej instalacji

```text
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
exit 0; postinstall regenerated public/icon-{192,512}.png and Monaco assets
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run audit:production
exit 0
full:       exit 1, valid JSON, 5 high, 2 moderate, 0 critical
production: exit 0, valid JSON, 0 high, 2 moderate, 0 critical
```

Pozostałe umiarkowane wpisy produkcyjne dotyczą łańcucha
Monaco i DOMPurify. Podsumowanie kandydata zapisuje commit
`7fd4238fee8fe2639b202d05ef70438a91beb2b9` i SHA-256 pliku
blokady
`2101a13c95b26dcfa705cf4bf051778c237aa98cc6be41733403effd826717e2`.

Przekazywanie błędu sprawdzono przez przypadki, które
traktują skrypt audytu jako czarną skrzynkę.

```text
moderate fixture: full status 1, production status 0 -> helper exit 0; reports retained
high fixture:     full status 1, production status 1 -> helper exit 1; reports retained
malformed fixture: both invalid -> helper exit 1; reports retained with validation errors
```

Ustalenia umiarkowane mieszczą się poniżej progu blokady
produkcji. Wysokie ustalenia i błędne lub wadliwe odpowiedzi
rejestru blokują krok. Audyt nadal wykazuje ustalenia i obejmuje
wskazany zakres zależności produktu.
