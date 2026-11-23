# Polityka bezpieczeństwa

[English](SECURITY.md)

## Zgłaszanie podatności

Zaloguj się na GitHubie i zgłoś podatność osobom utrzymującym projekt przez
[prywatny formularz zgłaszania podatności na GitHubie](https://github.com/fettpl/rust-workshop/security/advisories/new).
Możesz też wybrać przycisk **Report a vulnerability** na
[stronie Security Advisories repozytorium](https://github.com/fettpl/rust-workshop/security/advisories).

Nie zamieszczaj szczegółów podatności, kodu wykorzystującego podatność, danych
uwierzytelniających, eksportów postępów ani prywatnych załączników w
zgłoszeniach, pull requestach, recenzjach ani logach Actions.

Wskaż wersje lub commit objęte podatnością, opisz jej wpływ i podaj minimalny
sposób odtworzenia problemu bez sekretów i danych osobowych. Wrażliwe materiały
pomocnicze przekazuj wyłącznie w ramach prywatnego zgłoszenia.

## Zakres i ograniczenia

Aplikacja webowa przekazuje kod Rust ucznia przez `POST /api/run` do
izolowanego środowiska zdalnego. Tryb offline pozwala korzystać z zapisanych
materiałów i postępów. Aplikacja nie uruchamia kodu Rust ucznia lokalnie. Szczegóły opisuje
[dokumentacja środowiska uruchomieniowego](docs/runner.pl.md). Dane postępów
z przeglądarki i zaimportowane wyniki służą do własnej nauki. Nie są podstawą
zewnętrznej oceny ani wiarygodnego potwierdzenia tożsamości.

Natywna weryfikacja dla osób utrzymujących projekt korzysta wyłącznie ze
stałych materiałów testowych opracowanych w repozytorium. Przykłady
negatywne z niezdefiniowanym zachowaniem można sprawdzać tylko przez
zakwalifikowane kontrole Miri i metadanych. Kod z zewnętrznych pull
requestów nie może otrzymać dostępu do sekretów repozytorium,
uprzywilejowanych przebiegów workflow ani komputerów osób utrzymujących
projekt.

Projekt nie ogłosił listy obsługiwanych wersji ani gwarantowanego czasu
odpowiedzi. Zwykłe błędy niezwiązane z bezpieczeństwem zgłaszaj według
standardowego procesu współtworzenia projektu.
