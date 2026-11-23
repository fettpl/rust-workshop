# Projekt końcowy trwałej usługi dziennika — plan wdrożenia

[English](2026-09-18-capstone-integration.md)

> Dla agentów wdrażających plan: użyj superpowers:subagent-driven-development (zalecane) lub superpowers:executing-plans. Wdrażaj po jednym zadaniu i śledź postęp polami wyboru (`- [ ]`).

**Cel.** Dodać polskojęzyczny projekt końcowy o ustalonym zakresie. Uczestnicy łączą publiczne API Rust, transakcyjny i idempotentny zapis, nadzorowaną usługę Tokio, ewolucję protokołu oraz dowody dotyczące incydentów i wydania.

**Architektura.** Dodaj jeden moduł sterowany danymi i jedną przestrzeń roboczą z trzema pakietami Rust do pobrania. Zadania przeglądarkowe wykonują modele kontraktów oparte na bibliotece standardowej przez istniejące izolowane środowisko. Ograniczony weryfikator opiekuna sprawdza autorską przestrzeń TCP i SQLite. Zachowaj odrębne dowody modelu, lokalnego pakietu i niezależnie ocenianej pracy portfolio.

**Stos technologiczny.** Rust 2024, bieżąca wersja stabilna i dokładnie Rust 1.85.0, Tokio =1.53.1, rusqlite =0.40.2 bez domyślnych flag i z dołączonym SQLite, istniejąca infrastruktura TypeScript/Vitest/Playwright i archiwizacji treści.

**Specyfikacja.** Pierwotne wymagania `<maintainer-home>/.codex/attachments/117d4ac4-b10e-41ad-87c4-eb4cd91c5ae4/pasted-text-1.txt`, `docs/advanced-curriculum.md`, zwłaszcza „6. Capstone” i „Senior scope jako osobne dowody”, oraz `docs/requirements-audit.md`. Poniższy plan ustala dokładny zakres wdrożenia.

## Ograniczenia globalne

- Sprawdzona baza to `main@4af640d719a04bca32747b29f56bfcc683c08841`.
- Zachowaj stabilny Rust, edycję 2024, Cargo, rustfmt i Clippy oraz sprawdzoną minimalną wersję dokładnie Rust 1.85.0.
- Wszystkie materiały uczestnika są po polsku. Lekcje szacuje się na 8–20 minut, a pracę lokalną nad projektem oddzielnie.
- Zachowaj PREDICT → RUN → OBSERVE → EXPLAIN → MODIFY → DEBUG → RECALL → APPLY oraz UNDERSTAND → PRACTICE → VERIFY → TRANSFER.
- Zachowaj wcześniejsze ID lekcji i schemaVersion 3. Dodanie treści kursu nie wymaga migracji stanu.
- Kod uczestnika i z importu pozostaje w przeglądarkowej ścieżce za RustRunner. Nie wykonuj go lokalnym Cargo, rustc, poleceniami powłoki ani weryfikatorem opiekuna.
- Przeglądarkowe środowisko wykonawcze nie otrzymuje SQLite ani uruchamiania wielu plików.
- Pobranie pakietu, wypełnienie lokalnej listy kontrolnej, przygotowanie ADR i samoocena nie przyznają automatycznie poziomu opanowania.
- Zadanie od pustego edytora podaje problem i kryteria bez kodu startowego, narzuconych sygnatur i instrukcji implementacji. Wcześniejsze zadania dostarczające sygnatury nie wyznaczają tu wzorca.
- Dwanaście wykonywalnych zadań zaliczeniowych i sześć niezależnie napisanych powtórek programistycznych dostarczają automatycznych dowodów. Sześć rzeczywiście otwartych zadań portfolio korzysta z rubryki i wymaga oceny projektów przez człowieka. Opisz tę granicę jawnie.
- Autorski kod startowy w Rust kompiluje się, a niedokończone zachowanie oblewa ustalone testy. Awaria infrastruktury, brak wykrytych testów, zawieszenie i błąd kompilacji nie są dowodem wykrycia mutacji semantycznej.
- Zakres wyklucza autorski kod unsafe, publikację w rejestrze, wdrożenie, publiczne nasłuchiwanie i twierdzenia o uwierzytelnianiu, bieżących ostrzeżeniach bezpieczeństwa, uniwersalnej wydajności lub gotowości zawodowej.
- Przed zmianą kodu Next.js przeczytaj właściwe materiały w `node_modules/next/dist/docs/`. Plan nie wymaga nowej trasy ani komponentu.
- Użyci podczas wdrożenia subagenci stosują AGENTS.md i model gpt-5.6-luna z wysokim poziomem rozumowania. Zależne prace nad pakietem wykonuj kolejno. Po wdrożeniu przejrzyj niezależnie treść i weryfikator.

## Decyzja i granice zakresu

Wdróż projekt końcowy. Uzupełnia określoną lukę portfolio, łącząc istniejące Log Analyzer, public-api-workspaces, usługę sieciową Tokio, Service Operations i Dependency Assurance. Kolejny odrębny temat zaawansowany pozostawiłby tę lukę integracyjną.

**Dziennik zdarzeń: trwały serwis lokalny** to usługa przyjmowania danych przez TCP na interfejsie pętli zwrotnej, z publicznym API klienta i domeny w Rust oraz rejestrem potwierdzeń SQLite. Udana odpowiedź oznacza zatwierdzoną transakcję. Przy braku odpowiedzi wynik może być nieznany. Ponów ten sam klucz z tą samą treścią. Kontrakt nie zapewnia dostarczenia dokładnie raz na całej ścieżce.

Użyj transakcji SQLite. WAL z synchronous FULL to świadoma konfiguracja trwałości zależna od poprawnej obsługi synchronizacji przez system plików i urządzenie. Sprawdź rzeczywiście ustawione wartości pragma. Zachowanie opisują [WAL](https://www.sqlite.org/wal.html) i [PRAGMA synchronous](https://www.sqlite.org/pragma.html). Wersję rusqlite 0.40.2 i flagę bundled opisuje [manifest tej wersji](https://raw.githubusercontent.com/rusqlite/rusqlite/v0.40.2/Cargo.toml). Manifest nie wyznacza MSRV projektu. Pierwsze zadanie kompiluje wybrany kompletny graf z pliku blokady na 1.85.0. Nie podnoś minimalnej wersji po cichu, jeśli kompilacja się nie powiedzie.

Domyślne limity to osiem dopuszczonych połączeń, 16 poleceń w kolejce, jeden właściciel magazynu, 4096 bajtów ramki przed LF, 2048 bajtów wiadomości UTF-8 i 10000 zapisanych zdarzeń. Klient ma bezwzględny termin odczytu całej ramki, bez odnawiania go po każdym bajcie. Pełna kolejka zwraca jawne Busy i nie pozostawia odłączonych zadań oczekujących. Ponowienia istniejącego klucza działają również po osiągnięciu limitu zdarzeń. Potwierdzenia pozostają w rejestrze na potrzeby idempotencji.

Protokół używa ograniczonych wierszy rozdzielonych tabulatorami: `1\tSOURCE\tKEY\tLEVEL\tMESSAGE\n`. Wersja 2 dodaje `CORRELATION` między LEVEL a MESSAGE. SOURCE i KEY mają od 1 do 32 liter ASCII, cyfr, podkreśleń lub łączników. LEVEL to INFO, WARN albo ERROR. MESSAGE jest niepustym UTF-8 bez tabulatora, CR i LF. Pole CORRELATION w V2 ma ten sam alfabet identyfikatorów, a `-` oznacza brak wartości. V1 normalizuje korelację do braku wartości. Nieznana wersja, nieprawidłowy UTF-8, dodatkowe pola, zbyt duża ramka i EOF bez zakończenia dają jawne błędy. Jedno połączenie przyjmuje jedno żądanie i zamyka się po ograniczonej odpowiedzi. Odpowiedzi mają postać `OK\tSEQ\tinserted\n`, `OK\tSEQ\tduplicate\n` lub `ERR\tCODE\n`. Stabilne kody wielkimi literami nie ujawniają surowych błędów SQL ani treści żądania.

Klucz idempotencji to `(source, key)`. Równość porównuje poziom, wiadomość i znormalizowaną korelację. Ten sam klucz i ta sama treść zwracają pierwotny numer sekwencji. Zmieniona treść daje Conflict bez modyfikacji. Parametryzowany SQL i ograniczenie UNIQUE utrzymują niezmiennik w jednej transakcji. Pojedynczy blokujący pracownik jest właścicielem połączenia. Ograniczony kanał Tokio mpsc przenosi żądania na własność, a kanały oneshot zwracają odpowiedzi. Rozłączenie klienta po umieszczeniu w kolejce nie wycofuje pracy magazynu.

Przy zamykaniu usługa wstrzymuje dopuszczanie, kończy lub odrzuca odczyty połączeń, zamyka wszystkich nadawców magazynu, opróżnia kolejkę i dołącza pracownika magazynu oraz każde zadanie asynchroniczne. Termin łagodnego zamknięcia ogranicza oczekiwanie klientów. Już działające wywołanie SQLite może trwać dalej. Nadal czekaj na ograniczonego pracownika i zgłoś przekroczenie terminu opróżniania. Ostateczną granicę zakończenia stanowi zewnętrzny nadzorca procesu. Stan Stopped wymaga dołączenia spawn_blocking.

## Identyfikatory w katalogu i zakres nauki

- ID modułu: `capstone-integration`.
- ID projektu: `durable-log-service`.
- ID pakietu: `durable-log-service-workspace`.
- Tytuł modułu: `Capstone: trwały serwis logów`.
- Wymagane moduły: `public-api-workspaces`, `tokio-network-service`, `service-operations`, `dependency-assurance`, `property-contracts`.
- Sześć pojęć, po jednym na lekcję, używa ID lekcji z przyrostkiem `-contract`. Sześć kompetencji dodaje `-competency`.
- Projekt zaczyna się w pierwszej lekcji, a scenariusze z celowymi problemami w szóstej. lessonIds i reviewConceptIds zawierają wszystkie sześć odpowiednich identyfikatorów.

| ID lekcji i polski tytuł | Główne zadanie A | Główne zadanie B | Zadanie od pustego edytora | Niezależna powtórka programistyczna |
| --- | --- | --- | --- | --- |
| `capstone-domain-boundary` — Wartość przyjęta to nie dowolny tekst | `capstone-domain-validate`: sprawdź limity bajtów, alfabet identyfikatora i znaki sterujące wiadomości przed utworzeniem prywatnych pól | `capstone-domain-errors`: zamień błędy domeny i magazynu na stabilne publiczne kody bez ujawniania szczegółów | `capstone-domain-blank`: zaprojektuj rejestr pomiarów czujników, który nie dopuszcza niepoprawnej wartości. Przedstaw kontrakt i kontrprzykłady | `review-capstone-domain`: sprawdź identyfikator przesyłki i miejsce docelowe Unicode przy innych limitach |
| `capstone-idempotent-commit` — Ponowienie bez podwójnego zapisu | `capstone-commit-replay`: ten sam klucz złożony i treść zwracają stare potwierdzenie, a inna treść daje konflikt | `capstone-commit-atomicity`: zastosuj przygotowaną zmianę tylko po udanym zatwierdzeniu. Nieudane zatwierdzenie pozostawia rekordy i potwierdzenia bez zmian | `capstone-commit-blank`: zaprojektuj rejestr rezerwacji odporny na ponowienie po utracie odpowiedzi. Pokaż konflikt treści i awarię przed zapisem | `review-capstone-commit`: importuj powiadomienia o płatnościach według `(account, external_id)`, z duplikatami i konfliktami |
| `capstone-bounded-lifecycle` — Każde przyjęte żądanie ma właściciela | `capstone-lifecycle-admit`: ogranicz oddzielnie prace aktywne i oczekujące. Zamknięcie dopuszczania i pełna kolejka nie zwiększają licznika przyjętych | `capstone-lifecycle-settle`: rozlicz spóźniony wynik po anulowaniu przez klienta. Stopped wymaga dołączonego pracownika i rozliczenia wszystkich przyjętych wyników | `capstone-lifecycle-blank`: zaprojektuj kolejkę generowania raportów z pełną kolejką, rozłączeniem odbiorcy i zamknięciem. Rozlicz każdą pracę | `review-capstone-lifecycle`: rozlicz eksporty obrazów po zniknięciu odbiorców i przy niedokończonej pracy |
| `capstone-protocol-evolution` — Nowa wersja bez utraty starego klienta | `capstone-protocol-decode`: normalizuj V1 i V2, odrzucaj nieznane wersje i dodatkowe pola | `capstone-protocol-migrate`: transakcyjna migracja przyjmuje obsługiwany stary schemat, pozostawia bieżący bez zmian i odrzuca nowszy bez modyfikacji | `capstone-protocol-blank`: zaprojektuj ewolucję formatu dziennika magazynu. Zachowaj stare dane i jawnie odrzuć nieznaną wersję | `review-capstone-protocol`: normalizuj zlecenia V1 i V2 z nową opcjonalną etykietą trasowania i niezgodnością wersji |
| `capstone-incident-recovery` — Awaria, dowód i bezpieczne ponowienie | `capstone-incident-correlate`: grupuj pełne sygnały prób i zapisu według tożsamości żądania, rozróżniając liczbę prób i zdarzeń | `capstone-incident-decide`: zwróć Unknown bez dowodu zatwierdzenia. Rozróżnij zapis bez odpowiedzi, wycofanie i odrzucenie przed dopuszczeniem | `capstone-incident-blank`: napisz plan odtworzenia importu po utracie połączenia. Wskaż znane fakty, brakujące sygnały i bezpieczny kolejny krok | `review-capstone-incident`: zdiagnozuj awarię drukarki potwierdzeń, w której wykonanie i dostarczenie są odrębne |
| `capstone-release-evidence` — Wydanie związane z konkretnym artefaktem | `capstone-release-bind`: odrzuć dowód innego skrótu archiwum, niepełnych kontroli lub nieaktualnego okna obserwacji | `capstone-release-decide`: dopuść lokalną wersję kandydującą po pełnych kontrolach zgodności i odzyskiwania. Nieznany stan łańcucha dostaw pozostawia wydanie publiczne w Hold | `capstone-release-blank`: przygotuj dossier wydania eksportera archiwów. Udokumentuj niezgodną zmianę, plan powrotu i ograniczenia dowodów | `review-capstone-release`: oceń wersję kandydującą narzędzia migracji na podstawie niezależnie nazwanych kontroli i wstrzykniętej daty |

ID zadań w tabeli są dokładne. ID kryterium dodaje `-criterion` i odwołuje się do właściwego zadania głównego. Niepowiązane ćwiczenie nie jest wariantem zamiennym. Dodaj sześć lokalnych powtórek programistycznych o ID `capstone-domain-recall`, `capstone-commit-recall`, `capstone-lifecycle-recall`, `capstone-protocol-recall`, `capstone-incident-recall`, `capstone-release-recall`. To ćwiczenia bezpośrednie o innych wejściach i kontraktach niż niezależne reviewExercises. Ujawnienie wyklucza niezależne zaliczenie danej próby. Rubryka zadania otwartego nie przywraca zaliczenia ujawnionego zadania programistycznego. Zachowaj odroczoną powtórkę po co najmniej 24 godzinach w istniejącym silniku.

Każda lekcja obejmuje przewidywanie, kontrastową obserwację przykładu, dwa zadania z testami, krótkie wyjaśnienie, otwarte zadanie opisujące problem, bezpośrednią powtórkę, powiązanie z projektem, częste błędy rozumowania i stopniowane podpowiedzi. Tylko dwanaście nazwanych zadań głównych ma `evidenceGate: true`. Otwarte zadania portfolio mają `kind: blank`, brak `code`, ocenę przez rubrykę i rozwiązanie referencyjne do ujawnienia. Obecne jednoplikowe środowisko z ukrytymi testami funkcji sprawdza narzucone kontrakty funkcji. Otwarte projekty API wymagają oceny człowieka. Zachowaj pusty edytor bez narzuconego API i samoocenę bez nadawania statusu zweryfikowanego opanowania.

## Mapa plików

Dodaj następujące pliki aplikacji.

- `src/content/capstone-integration.ts` zawiera źródła, pojęcia, kompetencje, moduł, lekcje we właściwej kolejności i rejestrację powtórek.
- `src/content/capstone-integration/contracts.ts` zawiera sześć zestawów autorskich przykładów korzystających jedynie z biblioteki standardowej oraz dokładną treść kodu testowego. Proza lekcji pozostaje w osobnym pliku.
- `src/content/capstone-integration-assessment-fixtures.ts` przypisuje rozwiązanie wzorcowe, równoważny wariant i mutant zmieniający zachowanie do każdego z 24 kontraktów (12 bramek, 6 natychmiastowych ćwiczeń utrwalających i 6 niezależnych powtórek).
- `src/content/capstone-integration-assessment.test.ts` kompiluje wszystkie trzy warianty i wymaga, by mutant nie spełnił asercji podczas wykonywania.
- `src/content/capstone-integration-integration.test.ts` sprawdza identyfikatory, graf zależności, 12 bramek, 6 otwartych zadań ocenianych według kryteriów, 6 powtórek, niezależne rejestrowanie ujawnień oraz zgodność zapisanych postępów.
- `src/content/projects/durable-log-service.ts` rejestruje ProjectContract i ProjectPackage.
- `src/content/projects/durable-log-service/archive.ts` zawiera autorski manifest workspace’u, plik blokady i treść dokumentacji.
- `src/content/projects/durable-log-service/core.ts` zawiera treść plików Rust dotyczących modelu domeny i protokołu.
- `src/content/projects/durable-log-service/store.ts` zawiera treść plików Rust dotyczących SQLite i zapisu danych.
- `src/content/projects/durable-log-service/service.ts` zawiera treść plików Rust dotyczących środowiska wykonawczego, klienta i procesu.

- `src/content/projects/durable-log-service/package.test.ts`: układ pakietu, starter/solution, odniesienia do ekspozycji, dokładne zależności.
- `scripts/verify-capstone.ts`: zaufane wydobycie archiwów, dokładne łańcuchy narzędzi, lifecycle/recovery/external-consumer kontrole i
  sprawozdania.
- `scripts/capstone-mutants.ts`: kontrolowane mutacje źródłowe z utrwalonym, oczekiwanym niepowodzeniem testu na
  mutację.
- `src/content/capstone-verification.test.ts`: argument "allowlist", "archive identity", "stale proof" oraz klasyfikacja
  mutacji.
- `tests/e2e/capstone-integration.spec.ts`: nawigacja, wynik bramki, puste granice rubric, pobieranie projektu, notes/resume i ujawnić
  niezależność.

Zmienić `src/content/course.ts`, `package.json`, `.github/workflows/ci.yml`, `scripts/verify-offline.mjs`, `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/verification.md`, `docs/ci-cd.md`. Wygenerowane ZIPs na żywo w ramach
`public/projects/durable-log-service-workspace/`; kontynuuj istniejącą politykę wytworzonych aktywów zamiast niezależnie edytować
bajty archiwalne.

Powierzchnia robocza do pobrania zawiera dokładnie 35 plików:

```text
Cargo.toml
Cargo.lock
README.md
PROTOCOL.md
THREAT_MODEL.md
RUNBOOK.md
CHANGELOG.md
RELEASE.md
PERFORMANCE.md
adr/0001-transaction-and-retry.md
adr/0002-storage-owner-and-shutdown.md
crates/ingest-core/Cargo.toml
crates/ingest-core/src/lib.rs
crates/ingest-core/src/domain.rs
crates/ingest-core/src/protocol.rs
crates/ingest-core/tests/public_api.rs
crates/ingest-core/tests/protocol_properties.rs
crates/ingest-store/Cargo.toml
crates/ingest-store/src/lib.rs
crates/ingest-store/src/schema.rs
crates/ingest-store/tests/transactions.rs
crates/ingest-store/tests/migrations.rs
crates/ingest-service/Cargo.toml
crates/ingest-service/src/lib.rs
crates/ingest-service/src/config.rs
crates/ingest-service/src/worker.rs
crates/ingest-service/src/server.rs
crates/ingest-service/src/telemetry.rs
crates/ingest-service/src/main.rs
crates/ingest-service/src/bin/ingest-client.rs
crates/ingest-service/tests/lifecycle.rs
crates/ingest-service/tests/loopback.rs
crates/ingest-service/tests/restart.rs
crates/ingest-service/tests/process.rs
crates/ingest-service/examples/fixed_workload.rs
```

## Zadanie 1 — przestrzeń robocza i publiczny kontrakt

**Pliki:** stworzyć cztery moduły źródłowe projektu i test pakietu wymienione powyżej;
początkowo wdrożyć tylko podstawowe i oczywiste sekcje. Nie rejestrować niepełnego
programu nauczania w course.ts.

**Interfejsy:** członkami przestrzeni roboczej są `crates/ingest-core`, `crates/ingest-store`, `crates/ingest-service`; resolver 3, edition 2024,
rust-version 1.85.0, published = false dla każdego członka. Rdzeń jest tylko na std. Sklep
używa dokładnie rusqlite 0.40.2, domyślnie-funkcje = false, funkcje = [spulchnione]. Serwis
używa dokładnie Tokio 1.53.1 z macros/rt/sync/time/net/io-util; test-util tylko dla dev. Żadna funkcja serwisowa nie
może wyłączyć walidacji, ograniczeń ani trwałości. Każda skrzynia zabrania bezpiecznego
kodu.

Publiczne podpisy podstawowe:

```rust
pub enum Level { Info, Warn, Error }
pub struct Event { /* private validated fields */ }
pub enum ValidationError { Source, Key, Message, Correlation }
impl Event {
    pub fn new(source: String, key: String, level: Level, message: String)
        -> Result<Self, ValidationError>;
    pub fn with_correlation(self, correlation: Option<String>)
        -> Result<Self, ValidationError>;
    pub fn source(&self) -> &str;
    pub fn key(&self) -> &str;
    pub fn level(&self) -> Level;
    pub fn message(&self) -> &str;
    pub fn correlation(&self) -> Option<&str>;
}
pub enum Disposition { Inserted, Duplicate }
pub struct Receipt { pub sequence: u64, pub disposition: Disposition }
pub enum ProtocolError { TooLarge, Utf8, Version, Fields, Validation(ValidationError) }
pub fn decode_frame(bytes: &[u8]) -> Result<Event, ProtocolError>;
pub fn encode_v1(event: &Event) -> Result<Vec<u8>, ProtocolError>;
pub fn encode_v2(event: &Event) -> Vec<u8>;
```

Derive Debug/PartialEq/Eq gdzie testy wymagają porównania; Poziom i dyspozycja również Copy/Clone. Zdarzenie
może być klonem dla własnych testów transportowych, bez zbędnego wymogu klonowania
nałożonego na uczących się.

- [ ] Napisz najpierw testy rdzenia: empty/boundary/overbound identyfikatory; wiadomości multibajtowe
      związane z bazami; CR/tab/newline odrzucenie; stare zdarzenie::: nowe kompilacje rozmówców;
      V1/V2 normalizacja; nieobsługiwana wersja i odrzucenie poza polem; V1 encoder
      odmawia niepustej korelacji zamiast jej upuszczania.
- [ ] Przeprowadź ukierunkowane testy i potwierdź brakujące błędy w realizacji.
- [ ] Wdrożenie prywatnych konstruktorów polowych i ograniczenie czystego dekodera, a
      następnie uruchomić te testy ponownie.
- [ ] Wygenerować Cargo.lock przy użyciu rzeczywistego rozwiązania i skompilować minimalny
      splot SQLite i wykres Tokio na stabilnym i dokładnym 1.85.0. Zależność od rekordu versions/licenses i
      wymóg dla rodzimego kompilatora. Jeżeli 0.40.2 nie może skompilować się na 1.85.0,
      należy zatrzymać integrację zależności i zgłosić dokładną niezgodność; nie
      twierdzić, że ten wzrost zależności przeszedł lub po cichu obniżył się SQLite.
- [ ] Dodać determistical property coverage over identifier borders and limited
      generated UTF-8 strings: `decode_frame(encode_v2(e)) == e`; V1 round-trip for correction-free values. Użyj
      wyraźnego, skończonego wyliczenia, oznaczone ograniczonymi wyczerpującymi
      właściwościami, bez dodawania kolejnej zależności dev.
- [ ] Podać niezależnie zweryfikowaną umowę podstawową i rozwiązać wykres zależności.

## Zadanie 2 — zapis transakcyjny, migracja i zachowanie po restarcie

**Pliki:** store.ts, archive.ts, package.test.ts; odpowiednie pliki ze sklepu spożywczego.

**Spożycie:** Event, receipt, Disposition. **Produkcja:**

```rust
pub struct Store { /* owned Connection, configured event limit */ }
pub enum StoreError { Conflict, Full, Busy, UnsupportedSchema(u32), Storage(rusqlite::Error) }
impl Store {
    pub fn open(path: &std::path::Path, max_events: usize) -> Result<Self, StoreError>;
    pub fn ingest(&mut self, event: &ingest_core::Event) -> Result<ingest_core::Receipt, StoreError>;
    pub fn count(&self) -> Result<u64, StoreError>;
}
```

Schema w wersji 1: zdarzenia (sekwencja INTEGER PRIMARY KEY, źródło TEXT NOT NULL, request_key TEXT NOT
NULL, poziom TEXT NOT NULL, komunikat TEXT NOT NULL, UNIQUE (źródło, request_key)). Wersja 2
dodaje korelację zerową. Istniejące puste DB inicjalizuje bezpośrednio do v2; migracja
v1 zmienia tabelę i aktualizacje user_version w tej samej transakcji; v2 jest nie-op; wyższa
wersja zostaje odrzucona przed modyfikacją. Skonfiguruj i odczytuj z powrotem journal_mode WAL,
synchroniczny FULL i ograniczony czas pracy. Ingest wykorzystuje transakcję IMMEDIATE;
sprawdza wiersz poprzedzający sprawdzenie pojemności; porównuje pola kanoniczne, wstawia
raz, commit, a następnie zwraca paragon.

- [ ] Napisz testy ze świeżymi katalogami czasowymi na test: pierwsza wkładka; równa
      powtórka; inny konflikt ładunku; różne source/same klucz sukces; UTF-8 przeżywa ponownie
      otwarte; ten sam paragon po ponownym otwarciu; pełny skład odrzuca nowe klucze,
      ale akceptuje duplikat; Lock contention zwraca Zajęty; obie wartości korelacji
      uczestniczą w kontroli konfliktu.
- [ ] Wpisz test kontrolny migracji: użyj v1 DB zawierającego celowo niekompatybilny
      schemat, który nie spełnia ALTER, a następnie potwierdź user_version i istniejące wiersze
      pozostają bez zmian. Test nowszych schematów odrzuca bez zmian.
- [ ] Wdrożenie logiki transaction/migration i przeprowadzenie wszystkich testów sklepowych. Włączyć
      ogniwo źródłowe do przechowywania przy zachowaniu stabilnych kodów drutu
      publicznego.
- [ ] Dodać tylko testowy błąd szew wokół zakończenia transakcji, aby udowodnić, że nie
      powiodło się potwierdzenie uchodzi nieudany commit. Wstrzyknięcie w przypadku
      awarii należy przechowywać prywatnie pod kontrolą Cfg (test), nieobecne od wire/config/features.
- [ ] Zgłoś się dopiero po stajni i 1.85.0 kontroli sklepu przejść.

## Zadanie 3 — nadzorowana usługa i kontrakty rzeczywistych procesów

**Pliki:** service.ts, archive.ts i package.test.ts; odpowiednie pliki dotyczące spożycia usług.

**Spożycie:** interfejsy rdzenia i sklepu. **Produkcja:**

```rust
pub struct Config {
    pub bind: std::net::SocketAddr,
    pub database: std::path::PathBuf,
    pub max_connections: usize,
    pub queue_capacity: usize,
    pub max_events: usize,
    pub frame_deadline: std::time::Duration,
    pub drain_grace: std::time::Duration,
}
pub struct ShutdownReport {
    pub accepted: u64, pub inserted: u64, pub duplicates: u64,
    pub failed: u64, pub pending: u64, pub worker_joined: bool,
    pub drain_overdue: bool,
}
pub async fn serve(listener: tokio::net::TcpListener, config: Config,
    shutdown: tokio::sync::oneshot::Receiver<()>) -> Result<ShutdownReport, ServiceError>;
```

Zdefiniuj ServiceError z Config, Io (std:: io:: Error), Store (StoreError), WorkerStopped i Dołącz (tokio::
zadanie: JoinError); Display/Error implementacje zachowują źródła. Odrzucenie limitów zerowych, niepętli
zwrotnych, zero terminów i opcji nieobsługiwanych. CLI to `ingest-service --db PATH --bind 127.0.0.1:PORT`; port zero jest ważny, a
rzeczywisty adres drukuje się jako READY dopiero po inicjalizacji przechowywania. EOF w
sprawie wyłączenia programów sterujących Stdin, co pozwala na przeprowadzanie testów
deterministycznych bez sygnałów specyficznych dla platformy. Klient bierze wyraźny adres
plus source/key/level/message, wykonuje jeden wniosek i zwraca wyjście 0 w momencie odbioru, 2 na protocol/domain
odrzucenia, 3 na transport/unknown wyniku.

- [ ] Napisz paused-clock testy stanu dla pełnego przyjęcia, kolejka pełna, absolutny
      termin ramki, anulowanie klienta po enkolejce, Grace wygaśnięcie i pracownik
      dołączyć rachunkowości. Używać barriers/oneshots do zamawiania, nigdy nie spać jako dowód.
- [ ] Wdrożenie ograniczonego zarządzania accept/task, ograniczonego dekodera ramy i jednej z
      posiadanych pętli pamięci spawn_blocking przy użyciu blocking_recv. Zachować maksymalnie osiem zadań
      połączenia; zamknąć gniazda nadmiarowe, licząc odmowę transportu oddzielnie od
      przyjętych prac związanych z przechowywaniem.
- [ ] Upewnij się, że wyłączenie nie zachowuje ukrytego klona nadawcy. Oczekiwanie jest
      zerowe i worker_joined prawdziwe przed zwróceniem udanego sprawozdania końcowego. Terminal
      invariant jest akceptowany = wstawiony + duplikaty + nieudany.
- [ ] Napisz testy pętli przy użyciu portu zero: podzielony frame/UTF-8 kawałki, przerośnięta
      linia, wolne częściowe ramki, nieznana wersja, duplikat równoległych klientów i
      zmieniony konflikt treści. Każdy test obwiązany jest stróżem uprzęży;
      niepowodzenie watchdoga to infrastructure/failure, nigdy nie przedstawiając dowodów.
- [ ] Napisz testy procesowe dla dzieci: ważne invocation/invalid flagi, kontrolowane EOF wyłączenie,
      ponowne uruchomienie w stosunku do tego samego DB i utracona odpowiedź po oddanym
      przechowywaniu. W celu odzyskania awarii należy otrzymać OK paragon, zabić
      dziecko, ponownie uruchomić, powtórzyć i wymagają tej samej sekwencji. W przypadku
      niepotwierdzonego zezwolenia na wypadek awarii brak lub oddany wynik, ale wymagają
      dokładnie jednego ostatniego zapisanego wiersza po powtórce.
- [ ] Wdrożenie ustrukturyzowanych wydarzeń stderr ze stałymi polami event_kind/source/key/sequence/outcome; pominięcie
      komunikatu i szczegóły filesystem/SQL. Emit oddzielna próba i unikalne-wstawianie liczniki;
      brak nieograniczonego bufora zdarzeń.
- [ ] Zgłoś się po wszystkich testach serwisowych i Clippy przejść na obu łańcuchach
      narzędzi.

## Zadanie 4 — lekcje po polsku i niezależne kontrakty oceny

**Pliki:** wszystkie kamienie podczerwone content/assessment pliki, course.ts.

**Spożycie:** Semantyka pakietowa ograniczona. **Produkcja:** Nazwa wywozu `capstoneIntegrationModule`, `capstoneIntegrationLessons`, `capstoneIntegrationConcepts`, `capstoneIntegrationCompetencies`, `capstoneIntegrationSources`, `capstoneIntegrationReviewExercises` i
`capstoneIntegrationAssessmentFixtures`.

Testy są najpierw behawioralne. Przeglądarka kontraktuje modele granic domeny, commit
decision/state transformacji, lifecycle accounting, normalization/migration decyzji, powiązanych dowodów i wydania
decyzji. Nie twierdzą one, że działają SQLite ani TCP. W przypadku każdej testowanej umowy
należy określić kanoniczny, strukturalnie odmienny odpowiednik i kombinację mutantów;
wyposażenie ma `{ id: string, equivalent: string, mutant: string }` i musi obejmować dokładnie badaną ocenę IDs, a nie gumowe ślepaki.

- [ ] Dodawanie twierdzeń integracyjnych do dokładnej lekcji order/IDs, sześciu pojęć, 12
      etapów dowodowych, 12 kryteriów, sześciu pustych kroków bez kodu lub wymaganych
      podpisów, sześciu niezależnych rejestracji przeglądów i 24 umów testowych.
- [ ] Wdrożenie każdego wiersza lekcji w tabeli katalogowej, jeden na raz, z
      przewidywaniem → kontrast → brama → wyjaśnienie → druga brama → przypomnienie →
      blank/project transfer. Dodawanie błędnych informacji zwrotnych, dwóch postępowych wskazówek
      i rozwiązania odniesienia; nie kopiuj całych implementacji bramek do przeglądów w
      ramach funkcji przemianowanych.
- [ ] Dla wszystkich 24 kontraktów skompilować canonical/equivalent/mutant z rustc --edition = 2024 --test. Canonical i
      równoważne muszą przejść niepuste testy; mutanty muszą kompilować następnie
      zaniechać o nazwie twierdzenia. Rekordowe zachowanie rozrusznika oddzielnie. Puste
      wykonanie testu nie może przejść.
- [ ] Dodać testy mastery przy użyciu createInitialState/recordEvidence/moduleGate: wszystkie dwanaście bram bez hints/reveal może
      przejść; ukończenie tylko nie może; ujawniona próba nie może dostarczyć
      niezależnego kredytu; sześć gumowych ślepaków tylko nie może ustalić understood/retained;
      opóźnione niezależne odzyskanie pozostaje wspierane.
- [ ] Dodać pozycje źródłowe z tymi dokładnymi danymi IDs: `capstone-sqlite-transactions`, `capstone-sqlite-wal`, `capstone-sqlite-pragmas`, `capstone-rusqlite-transactions`, `capstone-tokio-mpsc`, `capstone-tokio-blocking`,
      `capstone-cargo-semver`, `capstone-rust-errors`. Uzgodnij każdą z nich do oficjalnej dokumentacji, użyj rzeczywistej daty
      przeglądu i dokładnej klasyfikacji stable/versioned; pin Tokio/rusqlite URLs do wybranych wersji.
- [ ] Zarejestruj eksport i projekt w course.ts tylko po zatwierdzeniu treści. Dostosowanie
      dostępnego ograniczonego planu działania w odniesieniu do capstone przy
      jednoczesnym zachowaniu pozostałego zakresu produkcji.
- [ ] Podać treść i autorskie dowody oceny.

## Zadanie 5 — ograniczona weryfikacja archiwum i wyniki weryfikacji wydania

**Pliki:** verify-capstone.ts, capstone-mutants.ts, capstone-verification.test.ts, package.json, .github/workflows/ci.yml, struny dokumentacji projektu.

**Interfejsy:** `npm run content:capstone -- --fetch` i `npm run content:capstone -- --fetch --msrv`; akceptuj tylko unikalne `--fetch` i `--msrv`. Dodaj precontent: capstone = content:
packages. Eksport weryfikatora czysty argument/result przewiduje Vitest bez wykonywania Cargo na
import. Wpis wykonywalny nie akceptuje ścieżek, źródeł, zaległości, importu lub
arbitralnych łańcuchów narzędzi.

- [ ] Badanie odrzucenia flag unknown/duplicate i wejść learner/path. Porównanie archiwum testowego i
      klasyfikacja błędów: błędy kompilacji, brakujące nazwy testów, timeout/signal oraz puste
      wyjście testowe nie liczą się jako odrzucone mutanty.
- [ ] Wdrożenie nowego, tymczasowego ekstrakcji tylko dokładnie autorskiego pakietu.
      Porównaj wygenerowane bajty z obydwoma obsługiwanymi ZIPs, potwierdzaj oczekiwaną
      listę ścieżek, manifesty członków, dokładne deklaracje zależności, blockfile,
      publikuj = false, edition/MSRV oraz brak niebezpiecznego źródła. Pin cargo/rustc/rustdoc konsekwentnie w
      trybie --msrv
- [ ] Pobierz tylko na żądanie, a następnie uruchom offline/locked obszar roboczy check/test/fmt/Clippy/rustdoc i default/no-default/all-feature
      konfiguracji (nie jest zdefiniowana funkcja usuwania możliwości). Przeprowadź
      badania lekarskie. Zachować metadane stdout/stderr/toolchain.
- [ ] Zbuduj niezależnego zewnętrznego konsumenta na wyekstrahowanej ścieżce. Jego
      autorskie źródło wykorzystuje pre-korelation `Event::new` call and accesors; musi nadal
      kompilować i w obie strony V1. Utrzymuj wytwarzanie urządzeń konsumenckich
      wewnątrz weryfikatora, nie dostarczanego przez użytkownika.
- [ ] Dodać osiem sterowanych mutantów o dokładnie nazwanym odrzuceniu testu:
      zaakceptować zmieniony ładunek jako duplikat; usunąć złożoną izolację klucza
      źródłowego; zgłosić się do popełnienia sukcesu po cofnięciu; zresetować termin
      ramki na czytanie; zapomnieć o księgowości po odłączeniu klienta; zwrócić
      zatrzymany przed dołączeniem pracownika; zaakceptować nieznaną wersję drutu;
      uaktualnić znacznik schematu przed nieudaną migracją. Najpierw wymagają, aby każdy
      mutant skompilował i wymagał jego wyznaczonego testu zachowania, aby nie;
      przywrócić odniesienia i ponownie uruchomić ten test przed następną mutacją.
- [ ] Uruchom fixed_workload przykład ponad 512 zdarzeń ograniczonych z determinaristycznym
      duplikatem harmonogramu; zaaseruj oczekiwaną unikalną count/receipt równość przed emisją
      obserwacji czasu. Zapis obciążenia pracą, kompilatora i środowiska; nie
      przekształcaj czasu upływającego w przenośny próg pass/fail. PERFORMANCE.md stanowi, że nie dodano
      przydziału czasu pracy counter/profile.
- [ ] Generować `test-results/capstone/<stable-or-msrv>/report.json` z archiwum SHA-256, wersje łańcucha narzędzi, dokładne wyniki komend,
      schema/wire wersje, odzysk i zmutowane wyniki. Zasilanie rzeczywistego roztworu służącego
      do podawania ZIP, a nie tylko przybliżenia źródłowe. RELEASE.md jest procedure/template, nigdy nie jest
      sfabrykowanym raportem ze świeżych przepustek; public release stays Hold when live
      advisory/license review jest niekompletny.
- [ ] Dodaj stabilną i dokładnie-MSRV CI Zaproszenie przed treściami rodzajowymi:
      ładunek, więc zależność pobiera poprzedza jego bieg offline. Wysyłanie raportów
      capstone z istniejącym przymocowanym wysyłaniem-artefakt SHA i 7-dniowa retencja.
      Włączyć nowy test oceny w MSRV Testy skoncentrowane. Zachowaj minimalne uprawnienia
      i żadnych nowych tajemnic.
- [ ] Aktualizacja RUNBOOK.md z kolejką pełną, zajęty sklep, utracona odpowiedź, przerośnięte
      wejście i zaległe wiertła odwadniające; THREAT_MODEL.md z lokalnymi granicami procesu i
      brakiem uwierzytelniania; dwa ADRs z alternatives/tradeoffs; CHANGELOG.md z wstecznym kompatybilnym
      rozszerzeniem v2 i odrzucone zmiany łamania.
- [ ] Zgłoś się po autorskim starter check kompile i nie niedokończone zachowanie,
      rozwiązanie przechodzi, ośmiu mutantów są odrzucane i przywrócony roztwór
      przechodzi na obu łańcuchach narzędzi.

## Zadanie 6 — integracja ze ścieżką uczestnika, działanie offline i dokumentacja

**Pliki:** e2e/capstone-integration.spec.ts, verify-offline.mjs oraz pliki dokumentacji na mapie plików.

- [ ] Dodać E2E przepływ, który wyszukuje `trwaly serwis`, otwiera moduł, obserwuje rzeczywistą
      próbę bramki przy użyciu istniejącej umowy zdalnego biegania, oszczędza draft/note i
      wznawia dokładny krok. Sprawdzić wybór projektu, starter/solution pobrań i ujawnić narażenie
      bez sfabrykowanych dowodów wykonania Cargo.
- [ ] Należy zapewnić odniesienia do pakietu rozwiązań w zakresie ekspozycji obejmują
      każdą główną bramkę, której odpowiedź jest ujawniana przez pakiet; należy zachować
      niezależny przegląd i otwartą ślepą próbę. Odniesienia do podglądu startowego
      zawierają tylko prawdziwe odpowiedzi. Należy wyraźnie podać te zestawy w package.test.ts.
- [ ] Rozszerzenie weryfikacji offline na download/cache zarówno warianty capstone ZIP i porównać
      bajty, zapisać capstone draft/note, wyłączyć sieć, przeładować i wznowić bez zmian.
      Zachować kontrole dla wszystkich poprzednich dwunastu pakietów.
- [ ] Aktualizacja aktualnego katalogu liczy się konsekwentnie: lekcje 158 → 164, moduły
      42 → 43, koncepcje 161 → 167, ślepaki 113 → 119, ślady pobytu 7, źródła 300 → 308,
      projects/packages 12 → 13. Nowy moduł dodaje 12 bramek i 6 niezależnych przeglądów kodowania;
      nie wymyślaj globalnej bramy ogółem bez jej obliczania. Autor pliku pakietu wynosi
      35.
- [ ] Poprawia istniejące stale Present-tense liczy w requirements-audit.md (154/41/157/109/295 i moduły o modułach 41)
      przy jednoczesnym zachowaniu wyraźnie oznaczonych historycznych liczników
      przebiegu. Zastąp Hamilcapstone pozostaje planowany z ograniczonym zakresem
      dostarczony dopiero po weryfikacji. Zachowaj przydziały na parser runtime, pełne
      property/fuzz zakres, odświeżanie na żywo, publikacja rejestru, udzielanie pożyczek async,
      operacje produkcyjne i pilot człowieka otwarte.
- [ ] Run lint, typechell, npm test, content: check, content: rust, content: capstone
      stable/MSRV, content: cargo, content: audyt, build, full production E2E bez ponownego
      sprawdzenia i kontroli offline. Uruchom istniejące specjalne weryfikatory poprzez
      niezmienione CI. Zapis rzeczywistego testu totals/results z testowanym commit; nie kopiuj
      starych liczb jako bieżących wyników.
- [ ] Uzyskał dwa niezależne przeglądy wdrażania obejmujące transaction/recovery/lifecycle poprawność i uczący się
      evidence/independence. Rejestrowanie ich rzeczywistych ustaleń i odpowiedzi. Są to przeglądy
      oprogramowania, a nie pilot uczący się lub dwa ludzkie przeglądy portfela wymagane
      do uzasadnienia kompetencji wyższego szczebla.
- [ ] Złóż kompletny raport z integracji i poprawnej weryfikacji; otwórz PR, jeśli jest
      to dozwolone przez przepływ pracy zadania rodzicielskiego.

## Lista kryteriów akceptacji

- [ ] Sześć polskich lekcji jest osiągalnych; dokładne nowe IDs są unikalne i istniejące
      saves/IDs pozostają kompatybilne.
- [ ] Istnieje dwanaście bram behawioralnych, sześć prawdziwych ślepaków typu
      "problem-only" i sześć niezależnych odczytów kodowania; wszystkie 24 stałe
      kontrakty kodowe mają przechodzące alternatywne implementacje i nie kompilują
      mutantów.
- [ ] Puste granice rubric i model przeglądarki vs lokalne dowody pakietu są wyraźne w
      kopii ucznia.
- [ ] Ściągnięta przestrzeń robocza zawiera trzy skrzynie, 35 plików, starter/solution parytetu i stable/MSRV-tested
      przymocowanych zależności.
- [ ] Udane pokwitowanie następuje po commit; ponownie wypróbowuj tę samą sekwencję;
      sprzeczne obciążenie nie zmienia się; ponownie otwieraj i potwierdzaj odtwarzanie
      procesu-crash zachowaj paragon.
- [ ] Jedna transakcja obejmuje spójność key/payload/receipt; niepowodzenie migracji nie publikuje
      nowego znacznika schematów.
- [ ] Limity zasobów, bezwzględny termin, granica luka i walidacja ramy są wykonywane w
      drodze rzeczywistych TCP testów.
- [ ] Rozłącz się po włączeniu nie usuwa zaakceptowanej pracy; końcowe salda księgowe;
      każdy pracownik jest połączony; zaległe drenaż nie jest fałszywie zgłaszane jako
      anulowanie.
- [ ] Stary klient zewnętrzny nadal kompiluje i wykorzystuje V1; V2 jest sprawdzany w
      trakcie podróży i odrzucenie nieznanej wersji.
- [ ] Osiem mutantów opakowań nie udaje zamierzonych testów behawioralnych i przywrócone
      referencje przechodzi.
- [ ] Weryfikator odrzuca arbitralne source/paths i nigdy nie interpretuje awarii infrastruktury
      jako dowodów.
- [ ] Raporty wiążą się z bieżącą ZIP strawą i faktyczną toolchain/commands; żaden osprzęt nie jest
      reprezentowany jako świeży incident/release wynik.
- [ ] Produkcja E2E i offline ZIP/resume kontrole przechodzą bez powtórzeń; aktualne liczby
      dokumentacji zgadzają się.
- [ ] Nie pojawia się automatyczne żądanie starszeństwa, wniosek o rozmieszczenie
      produkcji, roszczenie uniwersalne timing/allocation, żywa reklama doradcza ani oświadczenie
      dotyczące pilota uczącego się.

## Weryfikacja zgodności z pierwotnymi wymaganiami

W planie zlikwidowano lukę integracyjną piątego docelowego projektu portfelowego,
zachowując jednocześnie pierwotne cztery spiralne projekty i laboratoria uzupełniające.
Utrzymuje aktywne odkrycie, informacje zwrotne kompilatora, polski kontekst uczący się,
niezależne bramy kodowania, opóźnione wycofywanie, notes/resume i lokalne-pierwsze pobieranie
plików. SQLite/Cargo/TCP wykonuje tylko jako zaufaną weryfikację pakietu lub przez uczącego się
lokalnie; nie wprowadza się nowego, niebezpiecznego lokalnego biegacza.

Oryginalna zasada pustej strony jest sprzeczna ze wspólnym wzorcem testu podpisu. Plan
ten wybiera prawdziwe otwarte luki portfolio z uczciwymi limitami rubric i oddzielnie
silne bramy wykonywalne. Nie rości sobie automatycznie potwierdzonego opanowania
arbitralnej architektury. Późniejszy zaufany zdalny oceniający projekt byłby odrębnym
kamieniem milowym produktu.

Pełna mapa obejmuje pomiar przydziału czasu pracy, progi benchmark/profile, powtarzalne CI w
silniejszym sensie, przegląd decyzji człowieka i szersze injektywy. Ten ograniczony
kamień milowy dodaje stałą obserwację obciążenia pracą i kontrole związane z artefaktem,
ale nie zamyka weryfikacji alokatora czasu pracy, walidacji utraty mocy sprzętowej,
stwardnienia wieloprocesowego operacyjnego, uwierzytelnionej sieci backup/restore operacji,
przeglądu łańcucha dostaw na żywo, publikacji rejestru, efektywności uczenia się ludzi
lub gotowości zawodowej. Zaznacz je jako pozostały zakres, zamiast deklarować
kompletność całej mapy seniorów.

Podczas przygotowywania tego planu nie przeprowadzono żadnych działań w zakresie
realizacji ani weryfikacji produkcji. Zgodność z zasadą zależności jest wyraźną bramą
pierwszego wykonania, a nie zweryfikowanym wynikiem.
