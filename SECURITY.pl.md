# Polityka bezpieczeństwa (projekt przed wydaniem)

[English](SECURITY.md)

## Zgłaszanie podatności

Prywatny kanał zgłaszania podatności w tym repozytorium nie został jeszcze
zweryfikowany. Nie umieszczaj szczegółów podatności, kodu wykorzystującego
podatność, danych uwierzytelniających, eksportów postępów ani prywatnych
załączników w zgłoszeniach, pull requestach, przeglądach lub logach Actions.
Projekt polityki nie określa prywatnego adresu kontaktowego ani czasu
odpowiedzi.

Jeśli masz już zaufany prywatny kontakt z osobą utrzymującą projekt, zapytaj
ją, jak bezpiecznie przekazać zgłoszenie. Gdy kanał prywatny jest niedostępny,
zachowaj szczegóły dla siebie. Osoba utrzymująca projekt musi zapewnić kanał
zgłoszeń w ramach przygotowania publicznego wydania.

W przypadku planowanej ścieżki zgłoszeń na GitHub najpierw otwórz
[stronę Security Advisories repozytorium](https://github.com/fettpl/rust-workshop/security/advisories).
Użyj przycisku **Report a vulnerability**, gdy jest dostępny. Zwykłe
zgłoszenie nie zapewnia prywatności. Podaj wersje lub commit, których dotyczy
problem, opisz jego wpływ i minimalny sposób odtworzenia bez aktywnych
sekretów ani danych osobowych. Wrażliwe materiały pomocnicze przekazuj
wyłącznie przez zweryfikowany prywatny kanał.

## Wymagania wydania dla osoby utrzymującej projekt

Osoba utrzymująca projekt wybrała GitHub Private Vulnerability Reporting
i planuje włączyć oraz zweryfikować tę funkcję bezpośrednio po ręcznym
upublicznieniu repozytorium. Funkcja pozostaje niewłączona
i niezweryfikowana do czasu wykonania tych czynności.

Prywatne raportowanie podatności na GitHub jest opcjonalną funkcją
repozytoriów publicznych. Dostępność tej funkcji w projekcie wymaga
weryfikacji. Przed ukończeniem publicznego wydania osoba utrzymująca
projekt musi włączyć funkcję, sprawdzić formularz z osobnego konta
i wpisać w tym dokumencie zweryfikowaną ścieżkę zgłoszeń. Jeżeli bezpieczny
kanał będzie potrzebny przed zmianą widoczności, najpierw udostępnij
i zweryfikuj alternatywny kontakt prywatny. Postępuj zgodnie z
[instrukcją publikacji](docs/publication-handoff.pl.md) oraz
[instrukcją konfiguracji GitHub](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

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
