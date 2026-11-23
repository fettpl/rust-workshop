# Rust Workshop — pierwszy etap nauki własności

[English](2026-09-12-rust-workshop-design.md)

Podstawą projektu jest plik pasted-text-1.txt przekazany przez użytkownika 12 września 2026 r.

## Produkt i zakres

Spokojna, polskojęzyczna aplikacja do nauki technicznej bez kont i grywalizacji. Jasny motyw łączy chłodną biel, odcienie szarości, granat i niebieski, a ciemny opiera się na głębokim granacie. Interfejs zapewnia stale widoczny, kompaktowy panel kursu, wyraźne następne działanie i responsywny obszar roboczy. Ścieżka zaczyna się krótką diagnozą opartą na działaniu. Dalej obejmuje podstawy Rust — pierwszy program i Cargo, zmienne, funkcje i przepływ sterowania — a następnie pamięć, przenoszenie własności, Copy, własność w funkcjach, pożyczanie, projekt sprawdzający transfer umiejętności, odroczoną powtórkę i ocenę scenariuszową. Dalszy program jest widoczny jako plan przyszłego rozwoju.

Uczestnik zna podstawy programowania i może zaczynać bez znajomości Rust. Pierwsze trzy zadania diagnostyczne używają jawnie oznaczonego, neutralnego językowo pseudokodu po polsku. Czwarte daje szkielet funkcji arytmetycznej w Rust ze składnią objaśnioną w treści zadania.

## Podejście

Użyj Next.js App Router, TypeScript w trybie ścisłym, React, Tailwind, lokalnie udostępnianego Monaco, IndexedDB, Vitest i Playwright. Statyczna aplikacja jednostronicowa utrudniałaby zabezpieczenie granicy wykonania kodu. Własna usługa uruchamiająca Rust zwiększyłaby zakres zabezpieczeń i utrzymania. Wykorzystaj istniejący izolowany Rust Playground poprzez wymienny adapter serwerowy. Serwer WWW nie uruchamia kodu uczestnika lokalnie. Niedostępna usługa zwraca informację o infrastrukturze i nie obciąża wyniku próby.

## Granice domen

Schemat treści opisuje lekcje, zadania, kontrakty modułów, źródła i zależności między pojęciami. Logika nauki ocenia zadeklarowane dowody, planuje powtórki i wyznacza poziom opanowania. Stan uczestnika obejmuje dokładne miejsce wznowienia, szkice według kroków, odpowiedzi, próby, użycie podpowiedzi lub ujawnień, notatki i ustawienia. Warstwa zapisu waliduje i migruje stan, używa IndexedDB i eksportuje dane w wersjonowanej obudowie. Interfejs wyświetla treść z danych kursu. Środowisko wykonawcze zwraca ustrukturyzowany status i oryginalne stderr kompilatora.

## Rzetelność oceny nauki

Każda lekcja właściwa prowadzi przez przewidywanie, obserwację, ćwiczenie i zastosowanie umiejętności w nowej sytuacji. Samoocena podczas powtórki nie daje poziomu zrozumienia ani utrwalenia. Ujawnienie rozwiązania osłabia dowód. Wielokrotne kliknięcia tego samego zadania nie zwiększają kompetencji. Utrwalenie wymaga zweryfikowanej powtórki po czasie. Zaliczenie sprawdza samodzielne rozpoznanie przeniesienia i Copy w nowym przykładzie, naprawę bez ujawnienia rozwiązania, własność w funkcjach, pożyczanie i rozpoznawanie zbędnego klonowania. Odpowiedzi otwarte ocenia sam uczestnik na podstawie kryteriów. Wyniki zadań programistycznych zapisuje się oddzielnie.

## Niezawodność i dostępność

Szkice zapisują się przy zmianie. Jedna trasa aplikacji odtwarza widok z zapisanego stanu i pozwala wznowić pracę dokładnie offline. Service worker przechowuje szkielet aplikacji i zasoby z tego samego źródła. Interfejs informuje, że wykonanie kodu wymaga sieci. Awaria lokalnego zapisu jest widoczna i nie zeruje postępów po cichu. Import przechodzi walidację przed zastąpieniem danych. Destrukcyjne zastąpienie wymaga potwierdzenia. Kryteria akceptacji obejmują fokus klawiatury, pomijanie nawigacji, mobilne widoki Lekcja, Kod i Wynik, ograniczony ruch oraz tekstowe odpowiedniki stanów wizualizacji.

## Weryfikacja

Vitest sprawdza ocenianie, poziomy opanowania, harmonogram powtórek, migrację i import stanu oraz graf treści. Lokalny rustc kompiluje wyłącznie zaufane przykłady autorskie. Kod uczestnika trafia wyłącznie do adaptera sandboxa. Playwright sprawdza wprowadzenie, diagnozę, pracę w lekcji, podpowiedzi, dokładne wznowienie po przeładowaniu, notatki, zakładki, motywy, fokus, widok mobilny oraz import i eksport. Osobna próba sprawdza działanie rzeczywistej usługi wykonawczej, a deterministyczne testy API używają kontrolowanych danych. Etap zamyka audyt dydaktyki, obsługi, inżynierii i dostępności w ustalonym zakresie.
