# Ponawianie żądań przez klienta z ograniczoną liczbą prób

[English](client-retry.md)

Dokument określa zakres kodu źródłowego, archiwum i licencji opcjonalnego
projektu `durable-log-retry`. Jest przeznaczony dla osób rozwijających
i utrzymujących materiały. Dokumentuje zakres projektu, a zaliczenie przez
kursanta oraz niezawodność i bezpieczeństwo produkcyjne wymagają osobnej oceny.

## Zawartość pakietu

Identyfikator pakietu to `durable-log-retry-workspace`, a identyfikator projektu
to `durable-log-retry`. Wariant startowy i rozwiązanie zawierają 40 plików
istniejącej usługi trwałego dziennika jako materiał odniesienia. Testy
porównują odziedziczone pliki bajt po bajcie. Nowa funkcja korzysta z ich
oryginalnej zawartości.

Cztery nowe pliki pakietu to

- `crates/ingest-service/src/retry_client.rs`
- `crates/ingest-service/src/bin/ingest-retry-client.rs`
- `crates/ingest-service/tests/retry_client.rs`
- `RETRY-LAB.md`

Klient w Ruście i zaufane testy korzystają ze stałych danych testowych z
repozytorium. Weryfikator dopuszcza wyłącznie opcjonalną flagę `--msrv`.
Uruchamia polecenia Cargo bez sieci i z wersjami z pliku blokady. Wykonuje
tylko kod dostarczony przez repozytorium. Kontrakt przypadku testowego
rozróżnia ważne potwierdzenie, wynik niejednoznaczny, odmowę i wynik z zerową
liczbą prób. Potwierdzenia z testu natywnego dotyczą wyłącznie tego przypadku.
Ocena postępów kursanta i ogólnego zachowania usługi wymaga odrębnych danych.

## Pochodzenie i zakres licencji

Odziedziczone pliki trwałego dziennika zachowują informacje o pochodzeniu i
noty dołączone do pakietu. Trzy odziedziczone manifesty Cargo nadal mają
wcześniej zatwierdzoną deklarację licencji `MIT OR Apache-2.0`. Pakiet z
obsługą ponawiania korzysta z tego samego wyjątku, ponieważ zawiera te
manifesty w niezmienionej postaci. Wyjątek dotyczy wyłącznie odziedziczonych
manifestów, bez rozszerzania opcji Apache na repozytorium, aplikację ani
nowe pliki.

Nowa implementacja w Ruście, program wykonywalny i zaufane testy natywne są
przykładami objętymi MIT. Polski arkusz ćwiczenia i objaśnienia w
`RETRY-LAB.md` są materiałami dydaktycznymi objętymi repozytoryjną licencją
CC BY 4.0. W module treści TypeScript oznaczenia umieszczono bezpośrednio
przy odpowiednich fragmentach. Do danych wykonywalnych, kodu i przykładów
programistycznych stosuje się MIT, a do poleceń i objaśnień dla kursanta
CC BY 4.0. Licencja zależy od rodzaju materiału w danym fragmencie pliku.

Wygenerowany pakiet zawiera kanoniczne noty repozytorium i istniejącą notę
Apache wymaganą przez odziedziczone manifesty. Dotychczasowe przypisanie
plików do archiwów i treści licencji zachowano w oryginalnej postaci. Ten
zakres projektu obejmuje pliki repozytorium. Zależności zewnętrzne zachowują
własne licencje i noty.

Przegląd dotyczy kodu źródłowego tej funkcji. Kompleksowa ocena praw
autorskich, znaków towarowych, patentów, prywatności i uprawnień do publikacji
wymaga osobnego postępowania. Każde późniejsze ustalenie dotyczące
materiałów zewnętrznych trzeba ocenić na podstawie konkretnych okoliczności.

## Zakres dowodów dla osób utrzymujących projekt

`npm run content:client-retry` i wariant `--msrv` sprawdzają wyłącznie stałe
archiwum i jego repozytoryjne przypadki testowe na stabilnym Ruście oraz na
dokładnie w wersji 1.89.0. Prywatny skrypt może dostarczyć zweryfikowany profil narzędzi i
katalog domowy Cargo przygotowany do pracy bez sieci. Publiczny weryfikator
działa niezależnie od układu prywatnych katalogów osoby utrzymującej projekt.
Dokładne polecenia, wersje, skróty plików wykonywalnych, wyniki mutantów i
błędy dokumentują ten przebieg testów. Wyniki hostowanego CI, wydania oraz
wdrożenia podlegają osobnej weryfikacji.

## Przegląd wygenerowanych materiałów w zakresie A10

Zmiana A10 obejmuje materiały dydaktyczne i kod opracowane przez AI pod
kierunkiem osoby utrzymującej projekt. Istniejący pakiet trwałego dziennika
służy jako wewnętrzny materiał odniesienia. W ramach przeglądu nie
zidentyfikowano skopiowanego kodu zewnętrznego. Dotychczasowe źródła
repozytorium i cytowania pełnią funkcję odniesień. Ten przegląd ma zakres
techniczny. Kwestie zgodności prawnej, autorstwa ludzkiego i zgody na
publikację wymagają odrębnej oceny.
