# Informacje o materiałach zewnętrznych (projekt)

[English](THIRD-PARTY-NOTICES.md)

Ten wykaz towarzyszy projektowi wydania źródłowego z podziałem na licencje.
Podział i oznaczenie projektu zostały zatwierdzone.
[Ocena praw w określonym zakresie](https://github.com/fettpl/rust-workshop/blob/main/docs/rights-assessment.pl.md)
odnotowuje ukończony przegląd źródeł kursu i akceptację pochodzenia ikony.
Szersza ocena praw i warunki publicznego wydania mają własne wymagania.
Wykaz sprawdzono na podstawie przypiętego grafu zależności i świeżej
instalacji z pliku blokady 24 października 2026 r. Graf miał 535 wpisów
zależności dla różnych platform. Na macOS ARM64 zainstalowano 413 pakietów
w przypiętych wersjach. Metadane licencyjne opisują ten zakres. Nie
udzielają osobnego zezwolenia ani nie potwierdzają instalacji wszystkich
opcjonalnych pakietów platformowych. Proponowany zakres wydania obejmuje
repozytorium źródeł, autorskie archiwa projektów Cargo i udostępnianą
dokumentację audytu. Na tym etapie nie przewiduje wdrożenia hostingowego,
skompilowanej aplikacji przeglądarkowej, katalogu `.next` ani drzewa
`node_modules`. Zachowaj licencje i informacje dostarczane przez autorów
pakietów. Pliki repozytorium [`LICENSE`](LICENSE) i
[`LICENSE-CONTENT`](LICENSE-CONTENT) nie zmieniają tych praw.

## Zależności bezpośrednie

Poniżej są licencje pakietów wymienionych bezpośrednio w `package.json`
odnotowane w `package-lock.json`.

| Pakiet | Wersja | Licencja | Źródło |
| --- | ---: | --- | --- |
| `@monaco-editor/react` | 4.7.0 | MIT | <https://github.com/suren-atoyan/monaco-react> |
| `dompurify` | 3.4.18 | MPL-2.0 OR Apache-2.0 | <https://github.com/cure53/DOMPurify> |
| `idb` | 8.0.4 | ISC | <https://github.com/jakearchibald/idb> |
| `lucide-react` | 1.61.0 | ISC | <https://github.com/lucide-icons/lucide> |
| `monaco-editor` | 0.57.0 | MIT | <https://github.com/microsoft/monaco-editor> |
| `next` | 16.4.5 | MIT | <https://github.com/vercel/next.js> |
| `react` | 19.3.1 | MIT | <https://github.com/facebook/react> |
| `react-dom` | 19.3.1 | MIT | <https://github.com/facebook/react> |
| `toml-eslint-parser` | 1.0.3 | MIT | <https://github.com/ota-meshi/toml-eslint-parser> |
| `zod` | 4.6.7 | MIT | <https://github.com/colinhacks/zod> |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | <https://github.com/dequelabs/axe-core-npm> |
| `@playwright/test` | 1.64.1 | Apache-2.0 | <https://github.com/microsoft/playwright> |
| `@tailwindcss/postcss` | 4.3.3 | MIT | <https://github.com/tailwindlabs/tailwindcss> |
| `@types/node` | 22.20.5 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `@types/react` | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `@types/react-dom` | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `eslint` | 9.39.5 | MIT | <https://github.com/eslint/eslint> |
| `eslint-config-next` | 16.4.5 | MIT | <https://github.com/vercel/next.js> |
| `fake-indexeddb` | 6.2.6 | Apache-2.0 | <https://github.com/dumbmatter/fakeIndexedDB> |
| `fflate` | 0.8.3 | MIT | <https://github.com/101arrowz/fflate> |
| `prettier` | 3.9.10 | MIT | <https://github.com/prettier/prettier> |
| `sharp` | 0.35.5 | Apache-2.0 | <https://github.com/lovell/sharp> |
| `tailwindcss` | 4.3.3 | MIT | <https://github.com/tailwindlabs/tailwindcss> |
| `tsx` | 4.23.15 | MIT | <https://github.com/privatenumber/tsx> |
| `typescript` | 6.0.3 | Apache-2.0 | <https://github.com/microsoft/TypeScript> |
| `vite` | 8.3.5 | MIT | <https://github.com/vitejs/vite> |
| `vitest` | 5.0.5 | MIT | <https://github.com/vitest-dev/vitest> |

## Wymagania dla elementów dołączonych i zależności pośrednich

Graf z pliku blokady obejmuje pakiety, których informacje licencyjne trzeba
zachować osobno.

- Pakiet `monaco-editor` zawiera `LICENSE` oraz `ThirdPartyNotices.txt`
  dla dołączonych zależności. Aktualna konfiguracja kopiuje oba pliki
  obok `min/vs` do `public/monaco/`. Świeża lokalna instalacja z pliku
  blokady potwierdziła zgodność tych kopii i osobnej informacji DOMPurify
  z plikami wejściowymi. Każda przyszła dystrybucja tych zasobów musi
  zachować i zweryfikować te same informacje. Dostarczenie ich do
  przeglądarki wymaga osobnej kontroli.
- W udostępnianym pliku Monaco AMD generator zasobów zastępuje wbudowaną
  fabrykę DOMPurify oficjalną instancją AMD w wersji 3.4.18. Jej licencja
  jest kopiowana bez zmian do `public/monaco/DOMPurify-LICENSE`. Nagłówki
  artefaktu i mapa źródeł są zachowane. Zainstalowany, nieużywany moduł
  Monaco ESM pozostaje w oryginalnej postaci.
- `dompurify` 3.4.18 podlega `MPL-2.0 OR Apache-2.0`, a `marked`
  podlega MIT. Oba są zależnościami kopiowanego pakietu edytora Monaco.
- `caniuse-lite` 1.0.30001819 podlega CC BY 4.0. Jest zależnością narzędzi
  Next.js. Przy dystrybucji zachowaj informację o autorstwie i licencji.
- `axe-core` 4.14.0 i `@axe-core/playwright` 4.14.0 podlegają MPL-2.0.
- `lightningcss` i jego pakiety platformowe podlegają MPL-2.0. Pakiety
  `@img/sharp-*` używane przez `sharp` obejmują Apache-2.0 oraz, w części
  wersji platformowych, LGPL-3.0-or-later. Zachowaj ich informacje osobno
  od informacji Apache samego pakietu `sharp`.
- Playwright, TypeScript, `fake-indexeddb` i część pakietów narzędziowych
  podlegają Apache-2.0. W grafie są też pakiety na licencjach ISC,
  BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Python-2.0
  i MIT. Ich informacje licencyjne pozostają w mocy.

Pełne nazwy pakietów, wersje, rozwiązane adresy URL, wartości integralności
i metadane licencyjne pozostają w `package-lock.json`. Przed wydaniem
lub aktualizacją zależności odśwież wykaz na podstawie czystej instalacji
z pliku blokady. Wpis w pliku blokady służy jako wejście budowania i zapis
pochodzenia. Sam nie stanowi dystrybucji kodu pakietu z rejestru. Zachowaj
pełne informacje zewnętrznych autorów, jeżeli kod pakietu, zasób, przykład
lub inny zewnętrzny materiał zostaje skopiowany lub dołączony do wydawanego
archiwum. Nie kopiuj lokalnego drzewa `node_modules` do repozytorium.
W wykazie dystrybucji wskazuj faktycznie rozpowszechniane pakiety. Zapisuj
rzeczywiste licencje pakietów niezależnie od licencji MIT otaczającego
je kodu aplikacji.

## Pobierane projekty i odnośniki do źródeł

Generowane projekty Cargo mogą zawierać kod opracowany w repozytorium
w zakresie MIT, trzy istniejące autorskie manifesty pakietów z wyraźnym
wyjątkiem `MIT OR Apache-2.0` opisanym w
[`docs/licensing.md`](docs/licensing.pl.md), a także odwołania do pakietów
zewnętrznych w manifestach lub plikach blokad Cargo. Odwołanie do pakietu
rejestru w `Cargo.lock` samo nie kopiuje ani nie rozpowszechnia kodu tego
pakietu. Dołącz informacje licencyjne, jeżeli jego kod, zasób, przykład lub
inny materiał zewnętrzny jest faktycznie dołączany lub kopiowany do archiwum.
Cytowanie źródła w kursie i podanie adresu URL nie nadaje licencji.
Generator dołącza właściwą licencję projektu i informacje dla materiałów
obecnych w każdym autorskim wariancie startowym i wariancie rozwiązania.
Test regresji sprawdza wypakowane wpisy, dokładne teksty licencji,
autorskie materiały i lokalne odnośniki w każdym bieżącym pakiecie.
Generowanych ZIP-ów nie edytuj ręcznie. Po zmianie wejść wygeneruj ponownie
i zweryfikuj rzeczywiste archiwa. Adresy audytu repozytorium nie potwierdzają
zdalnej integracji.

Plik jest roboczym wykazem informacji licencyjnych. Zweryfikowane
pochodzenie historycznych źródeł, ikon i przykładów wymaga osobnych zapisów.
Przed publicznym wydaniem rozstrzygnij niejasności dotyczące praw do
źródeł lub autorstwa w prywatnym audycie wydania. Zatwierdzenie wyboru
licencji nie rozstrzyga praw osób trzecich.
