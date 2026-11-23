# Polska i angielska wersja kursu

[English](localization.md)

## Zakres i plan wdrożenia

1. Zinwentaryzować publiczny kurs z commita `17a768f`. Obejmuje 51 modułów, 204 lekcje, 1436 kroków i 92 śledzone pliki Markdown. Uwzględnić diagnostykę, samodzielne zadania, powtórki, pobieranie projektów, pomoc, powrót do nauki i pracę offline.
2. Udostępnić wybór języka na każdym etapie kursu. Zapamiętać wybór na urządzeniu. Po przełączeniu zachować bieżący ekran, szkic i dowody wykonania zadania.
3. Przetłumaczyć nawigację, komunikaty dla czytników ekranu i treść kursu. Oddzielić dosłowny wynik programu. Kod do wykonania, polecenia, nazwy plików, wartości protokołu i komunikaty kompilatora muszą zachować dokładną pisownię.
4. Przetłumaczyć instrukcje do zadań i informację zwrotną. Sprawdzać odpowiedzi zgodnie z poleceniem. Zachować identyfikatory wyborów, kolejność i klucze kryteriów w zapisanych odpowiedziach. Sprawdzić wcześniejsze kopie postępów w obu językach.
5. Przygotować materiały edukacyjne w obu językach dla paczek startowych i rozwiązań. Obie wersje mają korzystać z tych samych plików wykonywalnych i reguł zaliczania.
6. Pozostawić angielski dokument pod dotychczasową ścieżką, dodać odnośnik do polskiego odpowiednika i odnośnik powrotny. Zachować przykłady, ścieżki, oryginalne licencje oraz rozróżnienie między zapisem historycznym a bieżącą instrukcją.

## Kryteria odbioru

- Zmienić język na ekranie startowym i w trakcie nauki. Sprawdzić odświeżenie, pracę offline, wyszukiwanie, obsługę klawiatury, fokus, etykiety czytnika ekranu oraz format dat.
- Porównać zakres treści i sposób oceniania. Sprawdzić, czy po przełączeniu pozostają szkice, notatki, próby, samodzielne zaliczenia i historia odsłaniania rozwiązań.
- Sprawdzić paczki startowe i rozwiązania w obu językach. Porównać pliki wykonywalne bajt po bajcie i zweryfikować instrukcje, informacje licencyjne oraz odnośniki po rozpakowaniu.
- Sprawdzić pary dokumentów i odnośniki. Ocenić poprawność techniczną wybranych lekcji. Odróżnić pozostałe braki od wyników kontroli automatycznych.

Robocze tłumaczenia można przygotować lokalnie przy użyciu modeli angielsko-polskiego i polsko-angielskiego OPUS-MT w dystrybucji Argos (Jörg Tiedemann i Santhosh Thottingal, 2020). Kurs korzysta z zapisanych tłumaczeń. Materiały kursanta pozostają poza usługami tłumaczeniowymi.

## Utrzymywanie tłumaczeń

Identyfikatory zadań, klucze odpowiedzi, zapisane kryteria i wykonywalne fragmenty kodu przechowujemy w głównym katalogu kursu. Angielską treść dydaktyczną dodaj do `src/i18n/course.en.json`. Gdy tekst źródłowy wymaga polskiego odpowiednika do wyświetlenia, wpisz go w `src/i18n/course.pl.json`. Zachowuj dokładną treść kodu umieszczonego w zdaniu i całych bloków kodu. Dotyczy to również odstępów, separatorów i przykładowych wyników, które kursant ma odtworzyć.

Tłumaczenia interfejsu dodawaj do `src/i18n/ui-en.ts`. Komunikaty aplikacji, podpowiedzi w polach formularza, nazwy przycisków i komunikaty czytnika ekranu mają odpowiadać wybranemu językowi. Zapisane notatki, edytowane programy i oryginalne wyniki kompilatora należą do kursanta. Zmiana języka musi zachować ich dokładną treść.

Po zmianie pliku Markdown w projekcie do pobrania zaktualizuj odpowiadające mu tłumaczenie w `src/i18n/package-documents.json`. Polecenie `npm run content:packages` przygotowuje oryginalne paczki do weryfikacji natywnej oraz obie wersje językowe. Poleceniami `npm run content:check` i `npm test` sprawdzisz kompletność katalogu, pary dokumentów, odnośniki, fragmenty kodu, warunki zadań i zawartość archiwów.

## Ustalenia pierwszego audytu obu wersji językowych

| Obszar | Co wykazała recenzja | Jak to sprawdzić |
| --- | --- | --- |
| Interfejs i zapis pracy | Na jednym ekranie pojawiają się etykiety aplikacji, tekst kursu, dane kursanta i wynik kompilatora. Wybór języka dotyczy pierwszych dwóch kategorii. | Zmień język podczas edycji lekcji i ponownie po przeładowaniu. Sprawdź bieżący krok, szkic, notatki, zakładki, tryb skupienia i etykiety edytora dla czytnika ekranu. |
| Polecenia i zaliczanie | Literał może wystąpić w zwykłym zdaniu. Przetłumaczenie wyniku `ok 42`, zmiana zakresu `2..5` albo odczytanie pary argumentów jako liczby dziesiętnej zmienia prawidłową odpowiedź, mimo że test pozostaje ten sam. | Porównaj każdą wyświetlaną odpowiedź z regułą oceny. Zestaw wartości i etykiety z programem w Rust. Uwzględnij wskazówki oraz samodzielne powtórki. |
| Terminologia Rust | Sterta i stos to różne obszary w modelu pamięci. Nazwy pakietów, ścieżki do opcji i kody błędów mają ścisłe znaczenie. | Porównaj rysunek z podpisem. Sprawdź, czy przykład Cargo wskazuje rzeczywistą nazwę pakietu i jego opcje oraz czy kody diagnostyczne odpowiadają ćwiczeniu. |
| Pakiety projektowe | Zmiana limitu bajtów albo instrukcji diagnozowania problemu w README może umknąć testom kompilacji. | Porównaj podgląd README z plikiem po rozpakowaniu. Sprawdź zgodność plików programu bajt po bajcie w obu językach, a potem porównaj przykłady i limity z zachowaniem programu. |
| Dokumentacja i praca offline | Historyczne raporty zawierają identyfikatory, wyniki nieudanych prób i warunki wydania. Sam odnośnik do tłumaczenia nie potwierdza zgodności tych faktów. Praca bez sieci wymaga ponadto obu wersji każdego pakietu. | Sprawdź odnośniki w obie strony, bloki kodu, polecenia i identyfikatory. Porównaj wnioski z pierwotnym raportem. W wersji produkcyjnej odłącz sieć, zmień język i otwórz projekt, którego wcześniej nie odwiedzałeś. |

Początkowy katalog obejmuje 51 modułów, 204 lekcje i 16 projektów do pobrania. Porównanie struktury objęło wszystkie 93 pary dokumentów Markdown i 32 pary archiwów projektowych. Niezależne recenzje próbek materiału podstawowego i zaawansowanego doprowadziły do poprawek w całym katalogu. Automatyczne kontrole potwierdzają obecność tłumaczenia i sprawdzają konkretne właściwości techniczne. Gdy zmienia się polecenie, przykład lub sprawdzian, potrzebna jest także recenzja merytoryczna.
