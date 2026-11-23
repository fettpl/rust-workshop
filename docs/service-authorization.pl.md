# Typowana autoryzacja powiązana z żądaniem

[English](service-authorization.md)

Stan źródeł z 4 listopada 2026 r. Opcjonalne rozszerzenie jest dostępne
po utrzymaniu usług i dodaje cztery lekcje, 24 kroki, dwa pojęcia i
cztery odrębne główne rodziny zadań programistycznych. Nie wprowadza
szacunków czasu nauki. Katalog obejmuje 50 modułów, 202 lekcje, 1347
kroków, 198 pojęć, 199 kompetencji, 349 źródeł i 15 projektów. Ścieżka
podstawowa nadal zawiera 17 modułów. Liczby opisują dostępność
autorskich materiałów. Wyniki kursantów wymagają odrębnych danych.

## Cztery operacje

- **Decyzja dla dokładnego zakresu** — jedno skonfigurowane uprawnienie musi obejmować podmiot, dzierżawcę, zakres, działanie i deklarowany koszt. Nie wolno składać decyzji z fragmentów kilku uprawnień.
- **Zawężanie uprawnień** — zachowaj podmiot i dzierżawcę, zawęź zakres i działania i nigdy nie zwiększaj maksymalnego kosztu. Zwróć dokładnie żądane uprawnienie potomne lub odrzuć rozszerzenie. Wyznaczenie uprawnienia potomnego pozostawia uprawnienie nadrzędne w mocy. Gospodarz jawnie instaluje uprawnienie potomne, aby go używać przy kolejnych decyzjach.
- **Powiązanie żądania** — przenieś dokładnie to posiadane żądanie i podmiot do wartości poświadczającej autoryzację, która zachowuje faktyczne pożyczenie obiektu autoryzacji. Metody tylko do odczytu zachowują pierwotny zasób, działanie, koszt i dane. Poświadczenie można porzucić i później otrzymać nową autoryzację. Własność jest afiniczna: poświadczenie można zużyć najwyżej raz.
- **Przyjęcie zużywające poświadczenie** — zużyj poświadczenie. Sprawdź, czy usługa przyjmuje żądania, następnie zwiększenie licznika przyjęć z kontrolą przepełnienia i pojemności, a na końcu zwiększenie naliczonego kosztu z kontrolą przepełnienia i budżetu. Zatwierdź oba liczniki dopiero po wszystkich kontrolach. Odrzucenie zostawia oba bez zmian. Usługa sprawdza własny obiekt autoryzacji przed przyjęciem. Odmowa nie nalicza kosztu. Wynik przyjęcia dotyczy decyzji o dopuszczeniu pracy. Wykonanie i trwałość mają własne kontrakty.

## Modele lekcji i natywne API

Każde zadanie w przeglądarce obejmuje tylko ocenianą operację. Modele
polityki i zawężania nie dostarczają implementacji pozostałych rodzin.
Model powiązania korzysta z jawnie oznaczonej, deterministycznej atrapy
sprawdzającej argumenty. Natywna polityka działa osobno. Model przyjęcia
dostaje stałe poświadczenie testowe i rejestr liczników. Wcześniejsza
autoryzacja wykracza poza jego zakres. Zadania od zera i zwykłe
powtórki mają faktycznie pusty edytor i minimalny szkielet w poleceniu,
bez rozwiązania. Zadanie na zastosowanie i jego wariant od zera
należą do jednej rodziny. Powtórka i samoocena nie dają nowego
głównego samodzielnego zaliczenia.

Odrębny pakiet `service-authorization-workshop` bez zależności składa
cztery operacje za prywatną granicą modułu Rusta. Używa Rust 1.85.0,
edycji 2024. Usługa jest właścicielem obiektu autoryzacji i rejestru.
Publiczne API nie przyjmuje poświadczenia z innego obiektu autoryzacji.
Zachowane pożyczenie uniemożliwia lokalną wymianę polityki, dopóki
aktywne poświadczenie zostanie później wykorzystane. Kontrole kompilatora
dotyczące prywatności, przenoszenia i relacji pożyczeń odnoszą się do
natywnego API. Symulowana odpowiedź przeglądarkowa i prywatny szkielet
w głównym module pojedynczego pliku mają odrębny zakres.

Syntetyczne podmioty i uprawnienia zainstalowane przez gospodarza są
zaufanymi danymi testowymi. Zakres nie obejmuje uwierzytelniania, TLS,
walidacji danych uwierzytelniających, globalnego zapobiegania
powtórzeniom żądań, wygasania według zegara ani rozproszonego odwoływania
uprawnień. Deklarowany koszt jest wartością kontraktu. Pomiar pracy
oraz ograniczenia pamięci danych i użycia procesora wymagają odrębnych
dowodów. Rozszerzenie obejmuje modele i lokalne API. Usługa sieciowa,
bezpieczeństwo produkcyjne i gotowość kursanta wykraczają poza ten zakres.

## Zakres pakietu i weryfikacji

Każdy ZIP startowy i rozwiązania zawiera dziesięć autorskich plików.
Są to `Cargo.toml`, `Cargo.lock`, `src/lib.rs`, cztery pliki testujące
operacje, `README.md`, `THREAT_MODEL.md` i `WORKSHEET.md`.
Generator dodaje dokładnie cztery kanoniczne noty `LICENSE`,
`LICENSE-CONTENT`, `LICENSE-SCOPE.md` i `THIRD-PARTY-NOTICES.md`,
łącznie czternaście pozycji pod katalogiem głównym pakietu. Wyjątek Apache
nie ma zastosowania. Wariant startowy zamienia treść dokładnie czterech
operacji na `todo!`. Kursant samodzielnie uzupełnia te miejsca. Lista
odwołań do odsłonięcia w starterze jest pusta. Wyświetlenie pełnego
rozwiązania rejestruje pomoc dla dokładnie ośmiu odwołań do zadań
na zastosowanie i zadań od zera w czterech rodzinach. Nie kończy zadań
i nie modyfikuje wcześniejszych dowodów.

Trzy pozycje dowodowe wymagane w ProjectContract obejmują granice
polityki i rejestru, kontrole kompilatora i zachowania oraz dokładne
przekazanie pól podmiotu i żądania. Samodzielny weryfikator
(`npm run content:authorization` z opcjonalnym `-- --msrv`) działa
wyłącznie na stałych autorskich materiałach pakietu i przypadkach
kompilatora. Powstrzymuje się od uruchamiania importowanego kodu
kursanta. Potwierdzenia pakietu natywnego, potwierdzenia kompilacji
modelu lekcji, testy interfejsu i stanu oraz samodzielność kursanta
mają odrębne dowody.

Sześć nazwanych scenariuszy w `tests/e2e/service-authorization.spec.ts`
obejmuje przenośne wznowienie syntetycznego stanu poprzednika,
szkice i notatki, pomoc oraz powtórki rodziny, dokładne bajty archiwów
i noty, obsługę klawiaturą przy 390 px, faktyczne przeładowanie offline
z nowym neutralnym odczytem treści i sprawdzenie źródeł przy zmienionej
kolejności DOM. Przechwycony sukces wykonania sprawdza interfejs i stan.
Wynik natywnego Rusta wymaga natywnego wykonania. Samo napisanie kodu
i wykrycie testów nie oznacza ich przejścia w przeglądarce. Końcową
lokalną weryfikację produkcyjną i przeglądarkową odnotowuje osobno
administrator źródeł. Publikacja, zdalna integracja i akceptacja
GitHub Actions pozostają wstrzymane niezależnie.

## Zakres materiału i licencji

Zmiana obejmuje kod i materiały dydaktyczne opracowane z pomocą AI
pod kierunkiem osoby utrzymującej projekt. Wykonywalne przykłady
Rusta, testy i operacyjne metadane TypeScript podlegają dotychczasowemu
zakresowi MIT. Oryginalne polskie polecenia, objaśnienia i treść arkuszy
podlegają CC BY 4.0. Nadal wymagane są oznaczenie właściciela i
kanoniczne noty. Zawartość plików mieszanych podlega licencjom
według rodzaju materiału. Zachowano dotychczasowe licencje i brak
ustalenia autorstwa ludzkiego. [Przewodnik licencyjny](licensing.pl.md)

Przegląd w określonym zakresie korzysta z dotychczasowych wewnętrznych
odniesień do usług, własności, widoczności i testów. W nowym kodzie
nie zidentyfikowano dołączonego kodu stron trzecich. Odniesienie do źródła
nie stanowi zgody na skopiowanie jego treści. Rejestr zawiera dokładne
skróty objętych plików. Nowe nieśledzone źródła są wymienione odrębnie,
dopóki administrator nie doda ich do indeksu i nie sprawdzi końcowego
wykazu. Pełna ocena praw i zgoda na publikację mają osobne wymagania.
Dotychczasowe ograniczenia praw, znaków towarowych, prywatności i
publikacji nadal obowiązują. [Rejestr pochodzenia](oss-provenance.json)
