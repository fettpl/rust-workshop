# Publikacja Rust Workshop

[English](publication-handoff.md)

Repozytorium docelowe to niezależne **fettpl/rust-workshop** na GitHub.
Osoba utrzymująca projekt decyduje, kiedy je upublicznić. Akceptacja
obejmuje lokalne uruchomienie kursu ze świeżego anonimowego klonu.
Hosting aplikacji i publikacja pakietu npm lub Cargo to osobne projekty.

Przechowuj datowany dziennik operacji, eksporty dostawcy, surową kopię,
mapy obiektów i dane osobowe poza publicznym repozytorium.
Dane wejściowe wydania opisują [plan wydania OSS](oss-release.pl.md),
[zakres licencji](licensing.pl.md), [ocena źródeł](rights-assessment.pl.md)
i [przewodnik CI](ci-cd.pl.md).

## 1. Zamrożenie zmian i sprawdzenie odtworzenia

Zapisz niezmienne identyfikatory GitHub, właściciela, nazwy i widoczność
repozytorium źródłowego oraz docelowego. Zapisz SHA domyślnej gałęzi
źródłowej, wszystkie opublikowane refy, forki, otwarte pull requesty,
wydania, integracje i aktywne przebiegi. Porównaj źródłowe main i otwarte
propozycje z kandydatem. Dla każdej pozostałej zmiany zapisz decyzję
i osobę odpowiedzialną. Powtórz wykaz przy przełączeniu i uwzględnij
prace, które doszły od poprzedniej kontroli.

Utwórz prywatny bundle refów źródłowych, oblicz sumę i odtwórz go
w nowym niezależnym repozytorium bare. Porównaj wszystkie nazwy refów
i SHA, potem uruchom `git fsck --full --strict`. Zachowaj potrzebne
zgłoszenia, pull requesty, przeglądy, komentarze, zasoby wydań, logi
Actions i artefakty oddzielnie. Zapisz, które dane dostawcy wygasły
lub nie są dostępne. Sprawdź reprezentatywne odtworzenie i zachowaj
odzyskiwalną kopię poza komputerem przed usuwaniem. Nie importuj tej
kopii ani metadanych dostawcy do publicznej historii.

## 2. Kwalifikacja kandydata

Odtwórz wyłącznie zatwierdzoną oczyszczoną gałąź w pustej bazie Git.
Zapisz commit, drzewo, długość historii i wybrany ref. Sprawdź osiągalne
i fizycznie obecne obiekty, tożsamości oraz komunikaty commitów,
ścieżki, archiwa, wskaźniki LFS i odnośniki submodułów. Zastosuj
zatwierdzoną politykę prywatności i skan sekretów, również dla
historycznej zawartości archiwów. Ustalenia sprawdzaj prywatnie.
Ponów kontrolę dla końcowego scalenia wraz z logami i artefaktami
nowego pull requestu.

Zweryfikuj szybki start z README w czystej kopii, kontrole kursu
i archiwów, audyt przypiętych zależności, obie licencje i
`node scripts/verify-oss-provenance.mjs --release`. Zachowaj faktyczne
wyniki. Sprawdź, czy aktualne polecenia klonowania i linki bezpieczeństwa
prowadzą do celu. Utrwalone historyczne potwierdzenia zachowują
pierwotną tożsamość.

## 3. Przygotowanie celu i ochrona main

Właściciel wybrał bezpłatną ścieżkę. Utwórz niezależne puste prywatne
repozytorium. Sprawdź jego niezmienny identyfikator, brak gałęzi, pull
requestów, przebiegów i artefaktów. Źródło pozostaje prywatne.
Właściciel samodzielnie zmienia widoczność **wyłącznie pustego celu** na
publiczną przez **Settings → General → Danger Zone → Change repository
visibility** i pozostawia repozytorium niezainicjalizowane. Sprawdź
ponownie identyfikator, widoczność i brak zawartości. Zapisz przekazanie
pustego repozytorium osobno od zgody na ujawnienie źródeł. Pierwsze
wysłanie gałęzi z treścią do publicznego repozytorium natychmiast
ujawnia całą osiągalną historię.
[Skutki zmiany widoczności na GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)

Użyj mechanizmów ochrony dostępnych dla publicznego repozytorium.
Przeznacz pierwszy commit main na puste drzewo Git bez rodziców,
workflow i plików. Po zgodzie właściciela zainicjalizuj pusty main.
Następnie zastosuj aktywne reguły main i sprawdź ich działanie przed
wysłaniem historii kursu. Jeżeli repozytorium nie może egzekwować
reguł, zachowaj je bez materiałów kursu. Sprawdź w Billing, czy dodatkowe
produkty lub niestandardowe maszyny wykonawcze spowodują koszty.
O wydatkach decyduje właściciel.

Ogranicz zapis podczas przygotowania. Używaj standardowych maszyn GitHub,
domyślnych tokenów workflow tylko do odczytu i pełnych SHA akcji.
Workflow nie może zatwierdzać PR. Przebiegi z zewnętrznych forków
wymagają zgody. Chroń sekrety, tokeny zapisu i własne maszyny przed
przebiegami z forków. Sprawdź Issues, graf zależności, alerty Dependabot
i dwa ekosystemy aktualizacji w `.github/dependabot.yml`. Po
upublicznieniu włącz dostępne publiczne skanowanie sekretów i ochronę
push, po czym sprawdź ich skuteczny stan. Przed użyciem płatnej funkcji
uzyskaj oddzielną decyzję.

Wymagaj pull requestu, aprobaty niezależnego recenzenta z uprawnieniami
repozytorium, unieważnienia nieaktualnych zatwierdzeń, rozwiązania
rozmów oraz udanych aktualnych kontroli GitHub Actions. Zablokuj
force push, usunięcie gałęzi i obejście administracyjne. Ustal
wymagane konteksty kontroli z rzeczywistego workflow i macierzy.
Zweryfikuj dostawcę w bieżących przebiegach. Wstrzymaj scalanie, aż
pełne wymagania będą działały. Sprawdź egzekwowanie na PR wydania.
Jeśli recenzent nie został wyznaczony, zachowaj ochronę gałęzi i ustal
jego tożsamość przed pracą nad chronionym PR.

Przygotuj lokalny commit integracyjny z pustym publicznym korzeniem
jako jednym rodzicem i oczyszczonym końcem gałęzi wydania jako drugim.
W świeżej bazie sprawdź obu rodziców, dokładne drzewo wydania, wszystkie
osiągalne obiekty i skany. Eksportuj wyłącznie pusty main i zatwierdzoną
gałąź wydania. Nie wysyłaj lustra ani surowych obiektów starego źródła.
Przed **pierwszym publicznym wysłaniem źródeł** przedstaw właścicielowi
bundle i lokalne wyniki do jawnej akceptacji. Wyślij przejrzaną gałąź
i otwórz PR w tym samym repozytorium do chronionego main. Publiczna
gałąź przygotowawcza już ujawnia kod. Zamknięcie PR nie cofa klonów.

## 4. Weryfikacja CI GitHub i scalenie

Przejrzane zmiany prowadź w osobnym angielskim PR wydania. Rozpatrz
automatyczne uwagi i uwagi ludzi. Zapisz head i podstawę PR, SHA
testowanego scalenia, identyfikator workflow, numer próby oraz wyniki.
Bieżący workflow rozwija się do jedenastu zadań. Pięć jest pojedynczych:
`verify`, `workspace-msrv`, `mini-grep-fuzz`, `profile-evidence`
i `miri-safety`. Po trzy warianty mają `allocation-evidence`
i `unsafe-borrowed-memory`. Sprawdź skuteczne nazwy w rzeczywistym
przebiegu. Wymagaj sukcesu wszystkich jedenastu, w tym natywnego
profilera, Miri i kontroli offline. Po zmianie head ponów kwalifikację.

Scal w zwykły sposób po egzekwowaniu wymagań przez GitHub. Wymagaj
wszystkich jedenastu udanych kontroli świeżego przebiegu push na
dokładnym wynikowym SHA main. Sprawdź zintegrowane drzewo i ponów
kontrolę prywatności dla końcowej historii i udostępnianych danych
dostawcy. Jeśli warunek nie został spełniony, publiczne wydanie nie
jest scalane, a stare prywatne repozytorium pozostaje dostępne.
Jeśli pierwszy pull request nie uruchamia CI, sprawdź zdarzenie,
uprawnienia i przypisanie kontroli. Napraw workflow przez chronioną
ścieżkę i zachowaj blokadę do czasu pełnych kontroli GitHub.

## 5. Publikacja i sprawdzenie instalacji OSS

Na tej ścieżce puste repozytorium zostało już upublicznione. Po
scaleniu potwierdź jego tożsamość i dokładny zaakceptowany SHA main.
Zapisz dostępne publicznie nowe pull requesty, przeglądy, logi
i artefakty. Sprawdź, czy nie zawierają prywatnych danych.

Ponownie sprawdź widoczność, mechanizmy forków, reguły, wymagane
kontrole i zatwierdzoną konfigurację CI. Włącz GitHub Private
Vulnerability Reporting po upublicznieniu pustego repozytorium i
sprawdź **Report a vulnerability** z osobnego konta. Po weryfikacji
zaktualizuj [SECURITY.md](../SECURITY.pl.md) przez chroniony PR.
Udane przebiegi PR i wynikowego main potwierdzają kontrole po
publikacji, jeśli SHA się zgadzają. Sprawdź README, informacje
licencyjne, pobieranie archiwów i lokalny szybki start po świeżym
anonimowym klonowaniu, w tym uruchomienie, nawigację i wznowienie
offline. Przejrzyj nowe publiczne logi i artefakty. Zapisz zaakceptowany
SHA wydania.
[Prywatne zgłoszenia GitHub](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)

## 6. Wycofanie starego repozytorium po akceptacji

1. Sprawdź publiczne wydanie i działający lokalny klon. Zablokuj zapis do
   starego repozytorium. Ponownie odnotuj oba niezmienne identyfikatory,
   sprawdź otwarte prace i prywatne forki oraz przeniesienie konsumentów,
   integracji i odnośników. Porównaj końcowy wykaz refów i metadanych
   z odzyskiwalną prywatną kopią. Wstrzymaj prace przy rozbieżności lub
   braku unikalnych danych.
2. Wyłącz Actions w repozytorium o **starym identyfikatorze**. Zatrzymaj
   oczekujące i trwające przebiegi i sprawdź, czy wszystkie są zakończone.
   Zachowaj potrzebne logi i zawartość artefaktów przed usunięciem
   starych przebiegów, artefaktów i pamięci podręcznych. Spisz pozostałe
   dane do przechowywania i naliczone użycie w Billing. Po każdym
   działaniu sprawdź skuteczny stan. Cel to zatrzymanie nowych obliczeń
   podczas weryfikacji kopii i usuwania.
3. Pokaż właścicielowi obie tożsamości, udane wyniki wydania, sumy
   i miejsce kopii, wykaz forków, migawkę przechowywania i ograniczenia.
   Bezpośrednio przed nieodwracalnym porządkowaniem i usunięciem
   uzyskaj końcowe potwierdzenie wskazujące stare repozytorium i jego
   identyfikator. Usunięcie prywatnego repozytorium usuwa też jego
   prywatne forki.
   [Usuwanie repozytorium na GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository)
4. Usuń wyłącznie stare repozytorium GitHub. Sprawdź brak w wyszukaniu
   użytkownika uwierzytelnionego jako właściciel i na liście. Potwierdź,
   że cel jest dostępny pod zapisanym identyfikatorem i że zaakceptowany
   main pozostaje dostępny anonimowo. Po aktualizacji danych rozliczeń
   sprawdź użycie według starego repozytorium i daty jego powstania.
   Zapisz ostatnie rozliczone użycie i rozróżnij późniejsze raportowanie
   wcześniejszego kosztu od nowego użycia.
   [Rozliczanie Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Odzyskiwanie i zamknięcie

Przed pierwszym publicznym wysłaniem źródła zachowaj ostatni sprawdzony
bundle i rozstrzygnij problemy źródłowe prywatnie. Po publikacji
wycofuj regresje kodu przejrzanym revertem. Wyeksponowany sekret
traktuj jako incydent. Uzgodnij unieważnienie i sprawdź forki oraz
kopie w pamięciach podręcznych. Ponowne ustawienie prywatności nie
cofa publicznych kopii. Zachowaj możliwość prywatnego odtworzenia starego
źródła do czasu akceptacji jego wycofania przez właściciela. Zamknij pracę
po zweryfikowaniu publicznego wydania, skutecznych zabezpieczeń, lokalnej
instalacji, usunięcia źródła i końcowej kontroli rozliczeń.
