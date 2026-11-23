# Publiczne API i przestrzeń robocza Cargo — plan wdrożenia

[English](2026-09-13-public-api-workspaces.md)

> Niezależni autorzy i recenzenci pracują w trybie subagent-driven-development. Najpierw piszą testy rzeczywistych kontraktów.

**Cel.** Naucz rozwijania publicznego API w Ruście z zachowaniem zgodności klientów. Uczestnik sprawdza kontrakt w rzeczywistym workspace Cargo do pobrania. To etap zatwierdzonego programu, który pozostawia dalsze zagadnienia zaawansowanego Cargo i projektowania API oraz pozostały zakres senioralny.

**Architektura.** Dodaj moduł `public-api-workspaces` po `tokio-network-service`. Moduł obejmuje cztery lekcje, cztery pojęcia, osiem niezależnych zadań zaliczeniowych i cztery nowe powtórki programistyczne. Pakiet `frame-protocol-workspace` korzysta wyłącznie z biblioteki standardowej i zawiera bibliotekę, osobnego klienta, rzeczywiste kompilacje z różnymi funkcjami Cargo, testy zewnętrznego klienta, dokumentację i jawną politykę MSRV. Wykonawca nadal przyjmuje tylko kod, a stan pozostaje przede wszystkim lokalny. Manifesty i kompilacja są sprawdzane jedynie na autorskich, zweryfikowanych artefaktach. Przykłady Rust w przeglądarce nie potwierdzają działania workspace’u.

**Technologie.** Istniejąca aplikacja Next.js i TypeScript, Rust 2024, workspace Cargo zależny tylko od biblioteki standardowej, resolver 3. Weryfikacja obejmuje minimalną obsługiwaną wersję Rust 1.85.0 i bieżącą wersję stabilną.

**Specyfikacja.** Zatwierdzony cel całego kursu i rozdziały o API biblioteki, Cargo, projektowaniu błędów i samodzielnym opanowaniu w `docs/advanced-curriculum.md`.

## Ograniczenia i decyzje

- Reserve lesse IDs and saved state. Publiczność zna podstawowe programowanie i
  rozpoczyna Rust od zera; nie ma mostu językowego.
- Cztery lekcje IDs: `api-validated-construction`, `api-error-source-chain`, `api-trait-compatibility`, `api-compatible-surface`. Concept IDs match lesson IDs. Stosowanie etapów
  `<lesson>-gate` i `<lesson>-blank`; stosowanie ocen `review-<concept>`.
- Po pierwsze lesson/concept następuje `tokio-admission-lifecycle` / `tokio-admission-permit-lifetime`, a następnie łańcuch czterech nowych lessons/concepts. Wcześniej
  Ładunek, błąd, cecha i badania fundamentów można wyraźnie odnieść.
- Każda pustka jest niezależnym nowym kontraktem bez rozrusznika. Ujawnienie pakietu
  dotyczy tylko czterech głównych bram, nie ślepaków czy recenzji. Ściąganie lub
  prowadzenie ładunku lokalnie nie daje żadnego opanowania.
- Kod inline uczy language/API umów. Ściągalna przestrzeń robocza zapewnia rzeczywiste granice
  skrzyni, rustdoc, funkcje, metadane i compiler-floor check. Szczegółowa interaktywna
  edycja manifestu i pełne operacje wydania pozostają później zakres; nie oznaczaj ich
  opanowanych z ćwiczeń pojedynczych plików.
- Preferuj reprezentację prywatną, omylne zatwierdzanie, zachowane przyczyny błędów,
  stabilne stare strony połączeń, zewnętrznych implementatorów i konsumentów dyn.
  Kompleksowy sukces sam nie udowadnia zgodności behawioralnej lub kompletnej SemVer
  kompatybilności.
- Cechy są addytywne; nie wyłącza się zachowanie bezpieczeństwa. Sprawdzić domyślnie,
  nie-domyślnie i wszystkie funkcje oddzielnie. Przestrzeń robocza przechodząca ze
  zjednolitymi funkcjami nie może ukrywać wadliwej konfiguracji tylko biblioteki.
- `rust-version` to obietnica weryfikacji, a nie dowodów. Nie należy sprawdzać etykiet MSRV, chyba
  że dokładny starszy kompilator przeprowadza odpowiednie kontrole artefaktu.
  Wydawnictwo nie jest częścią tej akcji.
- Wykonaj tylko sprawdzony kod repozytorium lokalnie. Nigdy nie ucz się projektów ani
  importu. Brak zewnętrznego biegacza POST.

## 1. Kontrakty wartości i obsługi błędów

Właściciel: `src/content/public-api-values.ts`. Wywóz: `publicApiValueLessons`, `publicApiValueConcepts`, `publicApiValueCompetencies`, `publicApiValueSources`, `publicApiValueReviewExercises`.

- [x] Zbuduj dwie lekcje: zatwierdzone wartości nieprzezroczyste z fałszywymi
      konwersjami i stabilnymi dodatkami; błędy publiczne z kontekstem i zachowane
      oryginalne `Error::source`.
- [x] Pokryć ważne granice, nieprawidłowe wartości, UTF-8 w stosownych przypadkach, dane
      wejściowe dotyczące własności i wielokrotnego użytku. Udowodnić źródło identity/type/kind zamiast
      parsowania tekstu wyświetlacza; odróżnić Wyświetlacz od umowy do odczytu
      maszynowego.
- [x] Zacznij od predykcji i kontrastu wykonywalnego, a następnie naprawa z
      przewodnikiem, nowe puste zadanie i świeży przegląd. Testowe rozwiązania
      odniesienia i umyślne mutacje, które tracą walidację lub powodują informacje.
- [x] Weryfikacja wszystkich oryginalnych fragmentów z istniejącym weryfikatorem Rust i
      niezależnym przeglądem; rekordowe limity testów prywatności w tej samej skrzyni.

## 2. Kontrakty ewolucji API

Właściciel: `src/content/public-api-evolution.ts`. Wywóz: `publicApiEvolutionLessons`, `publicApiEvolutionConcepts`, `publicApiEvolutionCompetencies`, `publicApiEvolutionSources`, `publicApiEvolutionReviewExercises`.

- [x] Zbuduj dwie lekcje: rozwijaj cechę przy zachowaniu starych implementatorów i
      konsumentów dyn; zachowaj starą publiczną powierzchnię nadającą się do wywołania,
      zmieniając wdrażanie prywatne i dodając API.
- [x] Użyj rzeczywistych konsumentów w stylu zewnętrznym, non-Clone/non-Debug typów testów, dokładnej
      zgodności wskaźnika funkcji tam, gdzie jest to właściwe i testy na stare
      zachowanie. Wyjaśnij, że domyślna metoda cechy może nadal być potencjalnie
      przełomową zmianą i `Self: Sized` metod nie można wywoływać na odbiorniku dyn.
- [x] Udowodnić zarówno sukces istniejących klientów i niepowodzenie mutantów, które
      dodają wymaganą metodę, zniszczyć kompatybilność dyn, zacisnąć granice, usunąć
      stare ścieżki lub zmienić starą semantykę. Nie porównuj przechodzącego uchwytu z
      uniwersalnym dowodem semvera.
- [x] Dodawanie niezależnych domen pustych i przeglądania; weryfikowanie fragmentów i
      kontraktów źródłowych z niezależnym recenzentem.

## 3. Uruchamialny projekt przestrzeni roboczej

Właściciel: `src/content/projects/frame-protocol.ts` i pliki skoncentrowane pod `src/content/projects/frame-protocol/` w razie potrzeby. Wywóz: `frameProtocolPackage`, `frameProtocolProject`. Pakiet
ID `frame-protocol-workspace`; projekt ID `frame-protocol`.

- [x] Utwórz wirtualną przestrzeń roboczą z biblioteką `frame-protocol` i `frame-probe` klientem, resolver 3,
      dziedziczone edition/rust-version, stałe Cargo.lock i bez zależności rejestrów. Każdy członek wyraźnie
      wybiera do odziedziczonych metadanych.
- [x] Biblioteka zapewnia ograniczony u16 kadrowania przez nieprzejrzystą zwalidowaną
      wartość, ustrukturyzowane błędy publiczne zachowujące oryginalne źródło I/O,
      publiczny ponowny eksport i rozszerzającą cechę, która wspiera istniejące
      implementer i dyn wykorzystania. Należy przechowywać udokumentowaną oryginalną
      substancję do wywołania API obok dodatku API; zbadać obie te substancje.
- [x] Dostarcz kompilację niekompletnego rozrusznika z testami nie udającymi się w
      celowy sposób! zachowanie i pełne odniesienie. Testy integracji zewnętrznej i
      zestawianie-nieudanego badania dowiodły faktycznej prywatności skrzyni i
      niewyczerpującego zachowania. Niepowodzenie oczekiwanych przypadków niepowodzenia
      z zamierzonego powodu.
- [x] Włączcie funkcję addytywną `diagnostics`, zachowanie default/no-default/all-feature, oddzielne testy procesowe klienta
      i tworzenie tylko biblioteki, więc unifikacja funkcji nie może ukryć zepsutej
      konfiguracji.
- [x] Dołącz README, CHANGELOG, ADR, lokalne komendy walidacyjne i demo skończone CLI. Format
      drutu dokumentacyjnego, błędy, kontrakty, polityka fabularna, MSRV oraz dowody
      dotyczące zgodności skali; brak rzeczywistej publikacji.
- [x] Sprawdzić dokładne granice, puste payload/EOF, skrócenie, tożsamość błędu I/O, przydział
      przed limitem porządku źródłowego, konsumenci publiczni, stare sygnatury funkcji i
      niezmienione stare zachowanie. Niezależnie od tego mutują umowy referencyjne i
      zapewniają ich odrzucenie w przypadku twierdzeń lub dokładnej diagnostyki
      kompilatora.

## 4. Integracja i kontrole wykonywalne

Root: module/course registration, `src/content/public-api-integration.test.ts`, package verifier/matrix script and focuted tests, E2E/offline, CI and docs.

- [x] Dodaj nieudany test integracji dla łańcucha modułu, cztery niezależne pary bramek
      i pakiet ujawnić, a następnie zarejestrować arrays/module/project i sprawdzić, czy przechodzi.
      Ponowne użycie ustalonego silnika dowodowego; nie dodawać niestandardowych
      wyjątków od mistrzostw. Czerwony brak rejestracji i zielony pełny Vitest
      obserwowany; finał mrożony apartament ma 158 testów i korekty autora zostały
      poddane niezależnemu przeglądowi.
- [x] Weryfikacja rzeczywistego miejsca pracy przez Cargo metadata/tree, fmt, kontrola wszystkich
      celów, test, doc i Clippy. Wyraźnie testowa biblioteka default/no-default/diagnostics plus kombinacje funkcji
      przestrzeni roboczej. Sprawdzić dokładnie MSRV za pomocą odizolowanego łańcucha
      narzędzi i CI zadań objętych tym pakietem.
- [x] Test metadata/matrix niepowodzenia weryfikacji poprzez zmianę rzeczywistych własnych
      manifestów lub źródła; odrzucenie brakującego członka obszaru roboczego, błędnej
      minimalnej obsługiwanej wersji kompilatora, ukrytej zależności od domyślnej funkcji Cargo i uszkodzonego starego
      konsument.
- [x] Uruchom pełną zawartość, typecheck/lint/Vitest/Rust/Cargo kontrole; audyt źródłowy, budowę produkcji, pełne E2E
      i offline ZIP kontroli bajtów. Zamrozić zawartość przed ostatecznym zbudowaniem.
- [x] Niezależny przegląd obu grup lekcyjnych, przestrzeni roboczej i integracji. Audyt
      pod kątem wymogów pierwotnych oraz aktualizacja uczciwego zasięgu i ograniczeń.
- [x] Commit/push i sprawdź dokładnie commit CI. Commit `89a388e687a50a6c51616b6a44d699d31ccb9467`, branch `feat/public-api-workspaces`; run `34743788852` passed both
      equity and workspace-msrv jobs (158 Vitest, 1251 Rust, 252 Tokio, 42 E2E).
