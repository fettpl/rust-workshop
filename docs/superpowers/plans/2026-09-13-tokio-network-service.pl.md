# Tokio TCP i usługa z ograniczonymi zasobami — plan wdrożenia

[English](2026-09-13-tokio-network-service.md)

> Autorzy pracują równolegle, a recenzenci niezależnie. Zachowaj obecną architekturę kursu i granicę wykonawcy.

**Cel.** Zastosuj dotychczasowe kontrakty I/O, anulowania i pracy blokującej do ćwiczeń na rzeczywistym TCP i usługi do pobrania. Usługa ogranicza przyjmowanie pracy i rozlicza wszystkie przyjęte zadania podczas zamykania. To jeden etap zatwierdzonego programu zaawansowanego.

**Architektura.** Dodaj moduł oparty na danych `tokio-network-service` po `tokio-blocking-work`, z czterema lekcjami i osobnym pakietem `tokio-service-workshop`. Użyj dokładnie tego samego profilu autorskiego Tokio 1.53.1, włączając net w stałym manifeście. Aplikacja nadal wysyła wyłącznie kod, tryb i testy do obecnego wykonawcy.

**Technologie.** Rust 2024, Tokio =1.53.1 oraz istniejąca aplikacja Next.js z IndexedDB i PWA.

## Decyzje projektowe

- Użyj rzeczywistych gniazd IPv4 na interfejsie pętli zwrotnej. Powiąż nasłuch z portem 0 i zachowaj go do końca testu. Unikaj rezerwowania portu przez wcześniejsze sondowanie, publicznych hostów, stałych portów i DNS. Lokalnie wykonuj wyłącznie sprawdzony kod repozytorium.
- TCP dostarcza strumień bajtów. Długość ramki pozostaje dwubajtowym u16 w kolejności big-endian. Sprawdzaj limit przed alokacją i zapisem. Sukces zapisu lub opróżnienia bufora nie potwierdza przetworzenia przez odległą aplikację.
- Półzamknięcie kończy kierunek zapisu i pozostawia możliwość czytania. Rozróżnij porzucenie całego strumienia, połówki posiadane na własność i jawne wywołanie shutdown.
- Jedna graniczna chwila obowiązuje dla wszystkich odczytów albo wszystkich zapisów danej ramki. Przekroczenie terminu z niepełną ramką kończy połączenie. Nie ponawiaj po cichu częściowo wysłanego żądania ani nie resetuj limitu dla każdego fragmentu.
- Rezerwuj limit przed przyjęciem połączenia i uruchomieniem zadania. Kolejka nasłuchu systemu operacyjnego i dopuszczenie przez aplikację to osobne mechanizmy. Zatrzymaj pozwolenie do rzeczywistego końca obsługi. Przy zatrzymaniu przestań przyjmować połączenia, porzuć nasłuch i zaczekaj na wszystkie przyjęte zadania podrzędne.
- Pakiet łączy ramkowanie i ograniczony potok Tokio ze skończoną pracą blokującą. Porzucenie asynchronicznego oczekiwania nie kończy rozpoczętego domknięcia blokującego. Nawet po przekroczeniu terminu przez żądanie rozlicz je przed zwolnieniem pozwolenia. Nie twórz nieograniczonej liczby zadań oczekujących na pozwolenie.
- Zachowaj osobno błędy I/O, błędy domenowe, przekroczenia limitu czasu i JoinError. Używaj wewnętrznego identyfikatora połączenia jako klucza unikatowego. Błędy środowiska wykonawczego i systemu operacyjnego nie oznaczają błędnej odpowiedzi uczestnika.
- Usługa edukacyjna działa wyłącznie przez interfejs pętli zwrotnej. TLS, uwierzytelnianie, wdrożenie, telemetria operacyjna i pełne odzyskiwanie po awarii pozostają odrębnymi wymaganiami.

## 1. Środowisko i granice pracy nad materiałem

Pliki: `scripts/fixtures/tokio-runtime-1.53.1/{Cargo.toml,Cargo.lock,src/lib.rs}`, `docs/runner.md`, w razie potrzeby istniejące testy weryfikacyjne.

- [x] Przeczytaj przymocowane TcpListener/TcpStream/halves doki i oficjalne źródło Placu zabaw. Zapis
      precyzyjnego anulowania i ograniczenia środowiskowe; brak zewnętrznego biegacza
      POST.
- [x] Dodaj `net` do dokładnego zestawu funkcji Tokio, odśwież plik blokujący i pobierz
      tylko stałe zależności.
- [x] Dodać przedlot, który wiąże `127.0.0.1:0`, connects/accepts jednocześnie, wysyła bajty, pół-zamyka,
      otrzymuje odpowiedź i obserwuje EOF. Uruchom stały profil offline/locked. Jest to test gniazda
      lokalnego, a nie dowód na zastosowane zachowanie Placu zabaw.

## 2. Lekcje o TCP i połówkowym zamykaniu połączenia

Plik właściciela: `src/content/tokio-tcp.ts`.

Lekcja IDs: `tokio-tcp-connect`, `tokio-tcp-half-close`. Koncepcja IDs: `tokio-tcp-ownership`, `tokio-tcp-directional-shutdown`. Wywóz: `tokioTcpLessons`, `tokioTcpConcepts`, `tokioTcpCompetencies`, `tokioTcpSources`, `tokioTcpReviewExercises`.

- [x] Pierwsza lekcja rozpoczyna się po lesson/concept `tokio-blocking-cooperative-stop`; druga następuje pierwsza.
- [x] Przed kodowaniem naucz się łączyć, akceptować, local/peer identyfikować, semantyka
      bajtów-strumień i być właścicielem życia strumienia przez prediction/run/explanation.
- [x] Wymagane dwa odrębne kontrakty wykonywalne na koncepcję: jedna brama modify/debug i jedno
      puste zadanie bez startera. Zastosowanie IDs `<lesson>-gate` i `<lesson>-blank`; zastosowanie odrębnego
      przeglądu świeżego kodu `review-<concept>`.
- [x] W przypadku connect/accept należy zwrócić strumień, który jest nadal użyteczny, po
      wypełnieniu preambuły i zweryfikować dokładne bajty, konserwację przyrostową i
      błędy.
- [x] Dla pół-blisko, testować zarówno klient, który sygnalizuje żądanie EOF przed
      czytaniem odpowiedzi i writer-half shutdown, który pozostawia czytanie użyteczne.
      Nie należy wywnioskować granic pakietów z zapisu ani wymagać dokładnego odczytu
      fragmentów z TCP.
- [x] Sprawdzić uchwyty referencyjne i mutanty behawioralne. Koordynować wzajemne
      ukończenie z channels/futures; zawsze sprzątać. Stróż lub arbitralny sen nie jest dowodem na
      niezmienność.

## 3. Lekcje o limitach czasu i przyjmowaniu połączeń

Plik właściciela: `src/content/tokio-network-lifecycle.ts`.

Lekcja IDs: `tokio-frame-deadlines`, `tokio-admission-lifecycle`. Koncepcja IDs: `tokio-frame-absolute-deadline`, `tokio-admission-permit-lifetime`. Wywóz: `tokioNetworkLifecycleLessons`, `tokioNetworkLifecycleConcepts`, `tokioNetworkLifecycleCompetencies`, `tokioNetworkLifecycleSources`, `tokioNetworkLifecycleReviewExercises`.

- [x] Warunki wstępne łańcucha z `tokio-tcp-half-close` / `tokio-tcp-directional-shutdown`.
- [x] Zastosowanie bramki i pustki IDs `<lesson>-gate`, `<lesson>-blank`; dodać osobny przegląd dla każdej
      koncepcji.
- [x] Read/write ramka ograniczona w ramach jednego absolutnego terminu, zachować oryginalny
      błąd I/O w porównaniu z timeout i dokument odrzucający połączenie po niekompletnym
      rampowaniu. Badanie opóźnionych fragmentów, których indywidualne opóźnienia
      pasują, ale łącznie przekracza budżet, sukces przed terminem, EOF, skrócone dane i
      granice. Należy wykorzystać pauzę czasu tokijskiego dla testów deterministycznych,
      z realnym TCP pokrytym oddzielnie.
- [x] Wstęp do bramki na pozwolenie przed zaakceptowaniem, z stop wygrywając, gdy już
      obserwowane, porzucił stopu nadawcy traktowane wyraźnie, i zwrócone zezwolenie
      własnością zaakceptowanej pracy.
- [x] Niezależne puste zachowuje pozwolenie wewnątrz spawowanego obsługi połączenia
      poprzez sukces, błąd i rzeczywiste ukończenie; recenzja zamyka słuchacza przed
      dołączeniem do wybitnych przyjętych prac. Zróżnicowanie OS zaległości od
      przyjętych aktywnych podmiotów zajmujących się obsługą.
- [x] Odrzucenie pominiętych limitów, odnowione terminy na odłamek, wczesne zwolnienie
      pozwolenia i praca niepołączona poprzez spostrzegawcze twierdzenia.

## 4. Projekt usługi do pobrania

Plik właściciela: `src/content/projects/tokio-service.ts` (dodatkowe ukierunkowane pliki źródłowe dozwolone w ramach tego
przedrostka).

Wywóz: `tokioServicePackage`, `tokioServiceProject`. Pakiet ID `tokio-service-workshop`; projekt ID `tokio-service`.

- [x] Dostarczenie kompilacji niedokończonego rozrusznika i kompletnego odniesienia:
      Cargo.toml/lock, małych modułów dla protocol/service/processing, wykonalnego lokalnego demo, README, ADR oraz testów.
- [x] Potwierdź ograniczoną konfigurację pozytywną, granice ramki i ograniczenia
      połączeń przed skutkami ubocznymi. Związane tylko IPv4 pętla w demo, z efemerycznym
      portu w testach.
- [x] Należy stosować wcześniej ograniczone zasady dotyczące rurociągów przy użyciu
      rzeczywistej ścieżki TCP request/response oraz własnego przetwarzania blokującego. Związane
      zarówno praca w kolejce, jak i praca aktywna, a dokument zachował pamięć raportu.
      Brak odłączonych prac blokujących liczonych jako zakończone.
- [x] Zamknięcie dostępu zatrzymuje się przed opróżnieniem pracy i dołącza do każdego
      dziecka. Zgłoś czysty EOF, błąd protokołu, termin, niepowodzenie procesu i
      szczerze dołącz do porażki. Zatrzymaj właściciela zamknięcia do zakończenia; Drop
      sam nie jest dowodem zamknięcia.
- [x] Przetestować wielu klientów, obramowanie granic, częściowe odczyty, oversized/truncated wejście,
      nieprawidłowa konfiguracja, wydajność pracowników, oczekujących na klienta,
      terminy, wzajemne odłączenie i wyłączenie podczas pracy dopuszczonej. Sprawdź
      księgowość i zachowanie błędów, a nie tylko udane echo.
- [x] `revealStepRefs` Eksponuje tylko cztery zadania pierwotne `-gate`, pozostawiając każde `-blank` świeże.
      Lokalne kontrole pakietów nie zapewniają opanowania.
- [x] Weryfikacja startera fmt/check plus spodziewane niedokończone niepowodzenia w zachowaniu
      oraz odniesienie fmt/check/test/Clippy. Włączyć kompilację mutantów dla capacity/shutdown/deadline invariantów.

## 5. Integracja i wydanie

Root-owned files: `src/content/tokio-network-module.ts`, course registration, integration/package/E2E tests, offline script, PWA cache, README/audit/progress/verification
docs.

- [x] Dodaj nieudany test integracyjny dla nowego modułu, warunków wstępnych, czterech
      niezależnych par bramek i pakietu ujawnić zachowanie, a następnie zarejestrować
      autorem arrays/project i uczynić go przejść.
- [x] Zachować obecny stan i IDs nienaruszony. Limity obciążenia testowego dla
      wszystkich nowych ukrytych testów. Nowe referencje źródłowe muszą być stosowane
      urzędowo przytwierdzone URLs.
- [x] Weryfikacja wszystkich oryginalnych standard/Tokio przypadków i wszystkich pakietów Cargo,
      typecheck/lint/Vitest, audyt źródeł, budowa produkcji, przeglądarka navigation/mobile i offline draft/package wznawiać.
- [x] Zamrozić autorską zawartość przed finałem E2E/build; porównać odcisk palca kursu w całym
      budynku. Uchwycić błędy dokładnie i naprawić przyczyny przed powtórzeniem
      odpowiednich kontroli.
- [x] Uzyskaj niezależne recenzje semantyki lekcyjnej i cyklu życia usług oraz zapoznaj
      się z ustaleniami materialnymi.
- Release: commit i push zweryfikowany kamień milowy, a następnie sprawdź CI dla tego
  dokładnego commit. PR # 1 jest już połączona; nie wywołuj kolejnego wniosku o
  połączenie.
