# Tokio — operacje wejścia i wyjścia, strumienie oraz praca blokująca

[English](2026-09-12-tokio-io-streams.md)

> Agenci pracują w trybie subagent-driven-development. Autorzy pracują niezależnie, a przegląd poprzedza integrację.

**Cel.** Ćwiczenia z wykonywalnymi kontraktami uczą częściowych asynchronicznych operacji I/O, przetwarzania ramek z ograniczeniem długości, zachowywania postępu podczas anulowania, obsługi strumieni i przekazywania pracy do puli wątków blokujących.

**Architektura.** Rozszerz istniejący kurs oparty na danych o moduły `tokio-io-streams` i `tokio-blocking-work`. Rozdziel autorstwo lekcji od rejestracji i weryfikacji modułów. Użyj sprawdzonego profilu testowego Tokio i istniejącej przestrzeni roboczej działającej przede wszystkim lokalnie.

**Technologie.** Rust 2024, Tokio =1.53.1, tokio-stream =0.1.19 oraz istniejąca aplikacja Next.js.

**Specyfikacja.** Pierwotne założenia produktu i `docs/advanced-curriculum.md`. Plan obejmuje jeden ograniczony etap zatwierdzonych prac nad programem.

## Ograniczenia

- Uczestnik zna podstawy programowania i uczy się Rusta od zera. Kurs nie wymaga znajomości konkretnego innego języka.
- Każde pojęcie ma dwa odrębne zadania zaliczeniowe i nowe ćwiczenie powtórkowe z kodem. Ujawnienie rozwiązania wyklucza niezależne zaliczenie.
- Testy sprawdzają rzeczywiste bajty, własność, błędy, wywołania `poll` i czas życia zasobów. Opóźnienie i zadziałanie mechanizmu nadzoru nie dowodzą poprawności.
- Lokalnie kompilowany jest wyłącznie sprawdzony kod Rust autorstwa repozytorium. Weryfikacja nie wysyła żądań POST do zewnętrznego wykonawcy.
- `duplex` w Tokio pokazuje działanie cech I/O w pamięci. Architektura sieciowa i wdrożenie usługi TCP pozostają osobnym rozszerzeniem portfolio.

## 1. Naprawa potwierdzonej awarii CI i rozszerzenie profilu testowego

Pliki obejmują `scripts/verify-rust.ts`, testy weryfikatora, `src/domain/trusted-fixtures.ts`, `scripts/fixtures/tokio-runtime-1.53.1/` i listę dozwolonych źródeł.

- [x] Zachowaj dowód z przebiegu CI 34720429657. Pierwsza kompilacja autorskiego kodu przez rustc zakończyła się błędem ETIMEDOUT przy wspólnym limicie 8 sekund na kompilację i wykonanie.
- [x] Rozdziel limit kompilacji (60 sekund, jak w weryfikatorze Cargo) i wykonania (8 sekund). Przekroczenie dowolnego limitu nadal oznacza błąd.
- [x] Dodaj testy regresji dla przekroczenia obu limitów oraz metadanych autorskich przykładów korzystających tylko z Tokio Stream.
- [x] Przypnij tokio-stream do 0.1.19 i włącz funkcję io-util w Tokio. Zaktualizuj plik blokady i sprawdź rzeczywiste duplex i ReceiverStream podczas wstępnej weryfikacji profilu.

## 2. Częściowe operacje I/O i zachowanie stanu ramki

Autor operacji I/O odpowiada za `src/content/tokio-io.ts`.

- [x] Sprawdź zapis wszystkich bajtów i opróżnienie bufora. Niezależne ćwiczenie z limitem transferu zachowuje nieodczytaną końcówkę i propaguje błędy.
- [x] Długość ramki zapisz jako dwa bajty w kolejności big-endian. Odróżnij prawidłowy koniec strumienia od uciętego nagłówka lub treści. Sprawdź ograniczenia przed alokacją lub zapisem.
- [x] Trzymaj stan odczytu i pozycje zapisu poza future, które może zostać anulowane. Ponowienie ma działać bez utraty bajtów ani powielenia zapisanego prefiksu.
- [x] Sprawdź odczyt i zapis fragmentami, pustą treść, zerowy limit, przekroczenie limitu długości, wstrzykiwane błędy i anulowanie przez kontrolowane wywołania `poll`.

## 3. Strumienie i elementy przekazywane na własność

Autor lekcji o strumieniach odpowiada za `src/content/tokio-streams.ts`.

- [x] Pokaż zwrócenie elementu, `Pending` i końcowego `None`, także dla przypiętego strumienia typu `!Unpin`.
- [x] Ogranicz liczbę pobranych elementów bez dodatkowego wywołania `poll` ani odebrania nadmiarowego elementu. Sprawdź dane bez `Copy`.
- [x] Użyj rzeczywistego zamknięcia i opróżniania ReceiverStream oraz dokładnie określ semantykę anulowania `next`.
- [x] Każda lekcja ma dwa niezależne zadania zaliczeniowe i ćwiczenie powtórkowe. Każde sprawdza osobny kontrakt.

## 4. Operacje blokujące

Autor lekcji o pracy blokującej odpowiada za `src/content/tokio-blocking.ts`.

- [x] Użyj rzeczywistego `spawn_blocking` i propaguj `JoinError`. Zachowaj zasady własności oraz ograniczenia `Send` i `'static` przy przekazywaniu pracy do wątku.
- [x] Przekaż wynik konsumentowi asynchronicznemu, który może pożyczyć lokalny stan bez `Send`.
- [x] Wykaż, że rozpoczęta praca blokująca wymaga współpracy przy zatrzymaniu. Wywołanie `abort` nie kończy jej wykonania.
- [x] Pobierz pozwolenie z semafora przed uruchomieniem i trzymaj je w domknięciu do rzeczywistego końca pracy, także po panice.

## 5. Rejestracja, przegląd i wydanie

Zakres obejmuje kontrakty modułów, `src/content/course.ts`, testy integracji, E2E i offline, wersję pamięci podręcznej PWA oraz dokumentację audytową i weryfikacyjną.

- [x] Zarejestruj tablice lekcji, pojęć, źródeł i powtórek oraz jawne odwołania do niezależnych zaliczeń. Sprawdź wymagania wstępne modułów i odwołania w kryteriach oceny.
- [x] Zweryfikuj autorski kod Rust z dokumentacją przypiętych wersji i uruchom kompilujące się mutanty zmieniające zachowanie w kontraktach szczególnie podatnych na regresje.
- [x] Uruchom lint, sprawdzanie typów, Vitest, walidację treści, wszystkie autorskie przykłady std i Tokio, kontrole pakietów Cargo oraz audyt źródeł.
- [x] Zbuduj aplikację i sprawdź typowy przebieg pracy w przeglądarce, obsługę klawiatury, konsolę oraz wznowienie offline. Uaktualnij audyt wymagań o dokładny zakres i pozostałe luki.
- [x] Przygotuj sprawdzony etap do zapisania w Git i wysłania. Po publikacji sprawdź CI. Stan commita i zdalnej gałęzi znajduje się w Git i GitHub. PR #1 scalono wcześniej (64667e4).
