# Plan 001 — laboratorium ograniczonej polityki ponawiania po stronie klienta

[English](001-bounded-client-retry.md)

> Dla agentów wdrażających plan: użyj `subagent-driven-development` lub `executing-plans` i zacznij od testów wyrażających zamierzone zachowanie. Doradca deleguje wdrożenie i przeprowadza niezależny przegląd. Przed edycją przeczytaj cały plan. Recenzent prowadzi indeks.

**Cel.** Nauczyć wdrażania polityki klienta z ograniczoną liczbą ponowień oraz zachowania informacji o niepewnym wyniku wcześniejszych prób. Użyj do tego opcjonalnego lokalnego rozszerzenia istniejącej przestrzeni roboczej trwałego dziennika.

**Architektura.** Dodaj dwie lekcje i osobne laboratorium polityki klienta, złożone bez modyfikowania zaakceptowanej wersji referencyjnej trwałego dziennika. Zachowaj identyfikatory istniejących lekcji, projektów, archiwów i dowodów. Przeglądarka ocenia małe modele polityki korzystające z biblioteki standardowej. Autorski adapter Tokio i rzeczywiste testy połączeń przez interfejs pętli zwrotnej dostarczają odrębnych dowodów natywnych.

**Stos technologiczny.** Istniejący TypeScript/Vitest/Next.js, Rust 2024, dokładne MSRV 1.85.0 oraz przypięte Tokio i SQLite. Graf zależności pozostaje bez zmian.

**Specyfikacja.** Pełny opis funkcji stanowią poniższe kontrakty, granice, zadania i kryteria weryfikacji.

## Stan

- Stan: ukończone lokalnie 4 listopada 2026 r. Wdrożenie przejrzano, zakwalifikowano, zapisano w commicie i niezależnie odtworzono.
- Priorytet P2, nakład L, ryzyko średnie, kategoria kierunku rozwoju.
- Podstawą jest zaakceptowane A9 i rzeczywiste zapisy rejestru oraz syntetycznego stanu z czystych źródeł, wykonane przed tym planem.
- Plan opracowano 3 listopada 2026 r. na commicie `12a1e99895c491b58e0ffe0885efc5b3c17e1ea8`.
- Gałąź `feat/local-professional-progression-nov03` znajduje się w przygotowanym, izolowanym repozytorium.

## Ograniczenia globalne

- Zakres jest lokalny. Wyklucza push, zdalne zmiany lub zmiany main, hostowane zadania, publikację, wdrożenie oraz instalację lub pobieranie zależności. Zamknięte wcześniejsze etapy są niezmienne.
- Dokumentacja współtwórców, plany, commity i recenzje są po angielsku. Materiał dla uczestnika jest po polsku i zakłada podstawy programowania oraz brak wcześniejszej znajomości Rust. Nie odwołuj się do doświadczenia z Javą ani Pythonem.
- Nowe lekcje nie zawierają szacunków czasu nauki. Techniczne terminy i daty powtórek pozostają danymi domenowymi.
- Zachowaj historyczne ID i kolejność, dokładne wznowienie, szkice, próby, notatki, zakładki, surowe zdarzenia, daty, powtórki i pomoc. Import, ujawnienie, powtórzenie i symulacja nie przyznają niezależnego zaliczenia.
- Kod uczestnika lub z importu uruchamia się wyłącznie przez istniejący zdalny adapter. Natywne narzędzia przyjmują tylko ustalone przypadki i manifesty autorów repozytorium. Niedozwolone są dowolne argumenty źródła, narzędzia i ścieżki.
- Zachowaj bajtowo wszystkie 13 wcześniejszych obiektów projektów i 26 wygenerowanych ZIP-ów. Dodaj jedno opcjonalne laboratorium polityki klienta. Nie wprowadzaj protokołu odpytywania o potwierdzenie, nowego znaczenia wersji protokołu, publicznego nasłuchiwania ani deklaracji bezpieczeństwa.
- Zmiana interfejsu ogranicza się do pomijania elementów czasu trwania, gdy nowa lekcja nie ma szacunku.
- Dostępność przykładu referencyjnego i testy automatyczne nie potwierdzają osiągnięć uczestnika, poziomu senior, gotowości produkcyjnej, bezpieczeństwa kryptograficznego ani ogólnej zgody na publikację OSS.
- Kosztowne kontrole wykonuj sekwencyjnie. Raportuj osobno wyniki wykonane, symulowane, odziedziczone, pominięte, nieudane i ograniczone przez infrastrukturę.

## Znaczenie tematu

Projekt końcowy już uczy idempotencji, odtwarzania i odzyskiwania po stronie serwera. Obecny klient podejmuje jedną próbę, choć instrukcja eksploatacji zaleca ograniczone ponawianie bez wykonywalnego budżetu. Polityka wielu prób wprowadza odrębną odpowiedzialność za limity, niezmienne bajty żądania, decyzje końcowe i pamięć o niepewności mimo późniejszego odrzucenia. Pomiń kolejne ogólne wyjaśnienie Unknown i powielanie dokumentacji wydania.

## Obecny stan i konwencje

- `src/content/projects/durable-log-service/service.ts:744-812` zawiera klienta V1 podejmującego jedną próbę. Tworzy pojedynczy Event i ramkę, łączy się, zapisuje i odczytuje. Jego `write_all` pozostaje poza limitem odczytu. Nowy adapter ma wspólny termin dla tych etapów.
- `service.ts:577-610,648-657,836-875` definiuje rzeczywiste odpowiedzi. Sukces ma postać `OK\t<positive u64>\tINSERTED|DUPLICATE\n`. Błędy to `QUEUE_FULL`, `BUSY`, `CONFLICT`, `FULL`, `SCHEMA`, `STORAGE`, `TOO_LARGE`, `UTF8`, `VERSION`, `FIELDS`, `VALIDATION`.
- Lista ERR rozpoznawana przez starego klienta pomija `TOO_LARGE`. Zachowaj ten wariant. Jawnie przetestuj i opisz zachowanie nowego typowanego parsera oraz granicę starego przypadku.
- `src/content/projects/durable-log-service/archive.ts:512-527` opisuje ponowienie z zachowaną tożsamością, przeciążenie kolejki lub magazynu oraz Unknown. Protokół nie obsługuje zapytania o potwierdzenie.
- `src/content/projects/durable-log-service/package.test.ts:13-43` sprawdza 40-plikowe archiwum A8. `projectFiles` w `src/domain/project-package.ts:103-117` wybiera teksty wariantu startowego i rozwiązania. Składaj nowe obiekty bez modyfikowania źródłowych tablic i łańcuchów.
- `src/domain/project-package.ts:134-165` stosuje odwołania do ujawnień wariantu startowego i rozwiązania. Odziedziczenie plików starych rozwiązań jest pomocą w poprzednich rodzinach, także w nowym wariancie startowym. Oznacz to jawnie.
- `src/content/capstone-integration.ts:1001-1045` jest wzorcem modułu i kryteriów. `src/content/unsafe-miri.ts:1320-1435` pokazuje kalibrowane dowody v2. `src/content/performance-evidence-assessment.test.ts` kompiluje ustalone wersje referencyjne, równoważne i z celowymi błędami oraz sprawdza rzeczywistą liczbę testów i wyniki ewaluatora.
- `src/content/course.ts` składa moduły, lekcje, pojęcia, kompetencje, źródła, powtórki i projekty. Dopisz nowe rekordy po wcześniejszych. `src/engine/course-route.ts:26-51` zawiera grupę rozszerzeń concurrency-services. Zachowaj Core17.
- Testy historyczne używają dokładnych skrótów rejestru i złożonych projekcji. Bezpośredni poprzednik to `src/content/unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture.ts`. Nowe adaptery projektują wyłącznie dokładnie określone nowe rekordy. Zachowaj stare skróty i siłę asercji.
- Pole lekcji `minutes` jest wymagane w `src/domain/types.ts:161`, sprawdzane w `src/content/validate.ts:394-406` i wyświetlane w `src/components/overview.tsx:155-160,560-566`. Czas wprowadzenia do warsztatu w minutach stanowi osobne, utrwalone dane i pozostaje bez zmian.
- Bieżący katalog ma 48 modułów, 196 lekcji, 1305 kroków, 194 pojęcia, 195 kompetencji, 349 źródeł i 13 projektów. Rdzeń ma 17 modułów i 74 lekcje. Liczby opisują dostępność materiału.

## Kontrola rozbieżności

Przed pracą uruchom `git diff --stat 12a1e99895c491b58e0ffe0885efc5b3c17e1ea8..HEAD -- src scripts package.json .github/workflows/ci.yml`. Oczekiwany wynik to brak rozbieżności w zapisanej implementacji. Na początku tylko plany doradcy pozostają poza indeksem. Potwierdź istnienie rzeczywistych zapisów w prywatnym katalogu badawczym etapu. Nie odtwarzaj ich po zmianach.

## Publiczny kontrakt

### Polityka i pewność wyniku

1. Zakoduj jeden zweryfikowany Event dokładnie raz. Ponawiaj te same bajty, w tym wersję i korelację, jeśli dotyczy. Zachowaj klucz i ładunek między próbami.
2. Ponawiaj po `QUEUE_FULL`, `BUSY` i niepewności transportu, połączenia, zapisu, odczytu lub terminu, wyłącznie w granicach budżetu prób i czasu.
3. Zakończ bez automatycznego ponowienia po wadliwej lub nierozpoznanej odpowiedzi, `STORAGE`, błędzie walidacji albo protokołu, `CONFLICT`, `FULL` lub `SCHEMA`.
4. Sukces wymaga poprawnego potwierdzenia na połączeniu użytym do żądania. Protokół nie zna zapytania o potwierdzenie. INSERTED i DUPLICATE potwierdzają dostarczenie zgodnie z istniejącym kontraktem serwera.
5. Przechowuj zbiorczą flagę nierozstrzygniętej niepewności. Unknown pozostaje Unknown po BUSY, QUEUE_FULL, błędzie końcowym lub wyczerpaniu budżetu. Tylko poprawne potwierdzenie ją usuwa. STORAGE kończy się niepewnością również bez wcześniejszej utraty odpowiedzi i nie pozwala wywnioskować wycofania zapisu.
6. Rozróżniaj przyczynę zakończenia prób i wiedzę o wyniku żądania. Błędna polityka lub upłynięcie terminu przed pierwszą próbą oznacza, że do operacji na serwerze nawet nie przystąpiono.
7. Wymagaj niezerowego budżetu prób i niezerowego limitu na próbę oraz dodatniego czasu odstępu. Zatrzymaj się przy `attempts >= max_attempts` lub `now >= deadline`. Odstęp sięgający terminu wyklucza następną próbę. Używaj arytmetyki sprawdzającej przepełnienie przy obliczaniu odstępów i terminów. Przepełnienie jawnie kończy próby.
8. Sprawdzaj wspólny termin po każdym uśpieniu i przed I/O. Łączenie, zapis i odczyt współdzielą `min(global_deadline, per_attempt_deadline)`. Limit nie zaczyna się od nowa w każdej fazie. Zamknij strumień o niepewnym wyniku przed ponowieniem na świeżym połączeniu.
9. Granice polityki sprawdzaj przy wstrzykniętym deterministycznym zegarze i transporcie. Rzeczywiste testy TCP i SQLite niezależnie weryfikują integrację autorskiego przypadku. Deterministyczne odstępy są wyborem dydaktycznym dla jednego klienta z limitami. Opisz granicę dotyczącą lawiny ponowień i losowych odchyleń od odstępów. Polityka całej floty produkcyjnej wykracza poza ten przykład.

### Zamknięty zbiór wyników końcowych i reguły pierwszeństwa

Model przeglądarkowy i adapter natywny mogą mieć różne nazwy domenowe. Oba muszą wdrażać ten sam zbiór czterech wyników i poniższą tabelę. Zaobserwowanie ERR i udowodnienie trwałych skutków to odrębne twierdzenia.

```rust
// Receipt is the parsed positive sequence and Inserted/Duplicate disposition.
// Refusal excludes STORAGE. LastObservation covers receipt/error/transport/
// timeout/malformed/unrecognized without echoing payload or credentials.
enum StopReason { Terminal, AttemptLimit, Deadline, BackoffOverflow, InvalidPolicy }
enum Final {
    Delivered { receipt: Receipt, attempts: u32 },
    Refused { reason: Refusal, stopped: StopReason, attempts: u32 },
    Unknown { last: LastObservation, stopped: StopReason, attempts: u32 },
    NotAttempted { stopped: StopReason },
}
```

`attempts` liczy rozpoczęte próby, także nieudane połączenia. Sprawdź całą politykę przed rozpoczęciem. Zerowy budżet lub czas próby bądź odstępu daje InvalidPolicy bez I/O. NotAttempted nie zawiera poprawnej obserwacji. Refused to jawne, rozpoznane odrzucenie próbowanego żądania bez wcześniejszej nierozstrzygniętej niepewności w tym przypadku testowym. Wycofanie zmian bazy wymaga odrębnej gwarancji.

| Obserwacja lub historia | Wynik końcowy lub następne działanie |
|---|---|
| Nieprawidłowa polityka przed pierwszą próbą | NotAttempted(InvalidPolicy), zero wysłanych żądań |
| Termin upłynął przed pierwszą próbą | NotAttempted(Deadline), zero wysłanych żądań |
| Poprawne potwierdzenie INSERTED/DUPLICATE | Delivered, także po wcześniejszej niepewności |
| Pierwsze lub wszystkie odpowiedzi to BUSY lub QUEUE_FULL i jest budżet | Zaplanuj kolejną próbę z tą samą ramką |
| Jedynie BUSY/QUEUE_FULL i zatrzymanie przez budżet prób, czasu lub odstępu | Refused(ostatnia odmowa, właściwa przyczyna) |
| Rozpoznane końcowe odrzucenie bez wcześniejszej niepewności | Refused(przyczyna, Terminal), bez ponowienia |
| STORAGE w dowolnej próbie | Unknown(last=Storage, Terminal), bez automatycznego ponowienia |
| Niepewność transportu lub terminu i dostępny budżet | Zapamiętaj niepewność i zaplanuj ograniczone ponowienie |
| Niepewność transportu lub terminu i koniec budżetu | Unknown(ostatnia obserwacja, właściwa przyczyna) |
| Wcześniejsza niepewność, potem BUSY/QUEUE_FULL lub końcowa odmowa, i zatrzymanie | Unknown(ostatnia obserwacja, właściwa przyczyna) |
| Wadliwa lub nierozpoznana odpowiedź | Unknown(ostatnia obserwacja, Terminal), bez automatycznego ponowienia |

Poprawne potwierdzenie otrzymane podczas rozpoczętej i ograniczonej próby jest faktem. Późniejszy odczyt zegara nie unieważnia potwierdzenia. Budżety sterują rozpoczynaniem prób i czekaniem na nie. Wcześniejsza niepewność trwa do prawidłowego potwierdzenia i późniejsza jawna odmowa jej nie usuwa. Jeśli próba przekracza termin przed odebraniem pełnego, poprawnego potwierdzenia, wynik pozostaje Unknown.

Każdy wiersz wymaga nazwanego testu modelu i pakietu natywnego. Dodaj warianty z celowymi błędami dla wyczerpania po samych BUSY, wysłania bez prób, potraktowania STORAGE jako odmowy i zamiany wcześniejszego Unknown w Refused. Błędy kompilacji i infrastruktury nie potwierdzają odrzucenia takich błędów semantycznych.

### Dwie lekcje, cztery główne grupy zadań programistycznych

Moduł `service-client-retry` wymaga modułu `capstone-integration`.

- Lekcja `service-client-bounded-retry`, pojęcie `service-client-retry-policy`: rodzina `service-client/retry-next-action-v1` wdraża semantyczną politykę kolejnego działania, a `service-client/retry-budget-reservation-v1` typowaną rezerwację budżetu, terminu i odstępu. Testuj dwie różne operacje.
- Lekcja `service-client-ambiguous-driver`, pojęcie `service-client-ambiguity-contract`: rodzina `service-client/immutable-frame-replay-v1` wdraża sterowany funkcją zwrotną model ponawiania z biblioteki standardowej. Rodzina `service-client/aggregate-uncertainty-v1` łączy potwierdzenia i niepewność przez inny interfejs. Model przeglądarkowy nie wykonuje Tokio i nie potwierdza zachowania TCP.
- Każde pojęcie używa kalibracji dowodów v2 i minimumCodingTasks 2. Zapewnij po 5–9 kroków z przewidywaniem, wykonywalnym modelem, obserwacją i objaśnieniem, modyfikacją lub debugowaniem, odrębnym przypominaniem oraz zadaniami zastosowania i od pustego edytora. W razie potrzeby połącz sąsiednie kroki obserwacji i wyjaśnienia. Zachowaj cykl dydaktyczny i zwięzłe opisy polityki.
- Na każdą lekcję przypadają dwa główne zadania z testami. Warianty zastosowania i od pustego edytora mogą dzielić właściwą rodzinę, a powtórzone formy nie dodają zaliczeń. Przypominanie i powtórki mają osobne ćwiczenia i nie dodają głównych rodzin.
- Dodaj niezależne ćwiczenia powtórkowe i odpowiednie szybkie i odroczone przypominanie według bieżących zasad. Rubryki objaśnień pozostają samooceną, a przykłady okazją do zapoznania się z materiałem. Wszystkie skalibrowane kroki i powtórki wymagają poprawnych metadanych dowodów.
- Nowe lekcje pomijają `minutes`. Zachowaj dokładne metadane wszystkich 196 wcześniejszych lekcji.

## Zakres i odpowiedzialność

Wykonawca zadania 1 jest właścicielem:
- Nowe `src/content/projects/durable-log-retry.ts` i `src/content/projects/durable-log-retry/` autorskie struny pakietów, testy projektów i testy zaufanych-rodzimych.
- Nowe `scripts/verify-client-retry.ts` i jego testy, plus wyraźne obejmują w `vitest.config.mts` jeśli testy żyją według skryptów.
- `package.json` tylko uzupełnienia skryptu; `.github/workflows/ci.yml` tylko dwa jednoznaczne stable/MSRV invocations
  weryfikatora, po istniejącym capstone/cache przygotowaniu. Zachować szpilki akcji, uprawnienia,
  wyzwalacze, istniejące polecenia i testowe kontrakty regex. Są to lokalne edycje
  plików na podstawie autoryzacji stojącej CI, nigdy nie były obsługiwane.
- `scripts/project-archive.ts` i `scripts/project-archive.test.ts`: dodać ONLY otrzymanego `durable-log-retry-workspace` mapowania powiadomień i odpowiednich testów,
  przewożąc zawiadomienie Apache dla niezmienionych odziedziczonych trwałych manifestów
  ładunku. Nie zmieniaj dokumentów kanonicznych license/scope/notice ani żadnych starych map
  archiwalnych.
- `src/domain/project-package.test.ts` tylko twierdzenia z katalogu bieżącego: 14 pakietów do pobrania i cztery archiwum
  IDs zawierające ogłoszenia Apache (trzy oryginalne źródła manifestu, jedno
  laboratorium pochodne). Zachowaj wszystkie oryginalne payload/notice twierdzenia i dodaj dokładne
  mapowanie źródła odziedziczonego. To aktualny test dostępności, a nie historyczny
  migawka.
- Nowy `docs/client-retry.md`; końcowy skasowany README dodany i prowansji rejestr odświeżyć po zakończeniu
  wszystkich autorów źródłowych.

Wykonawca zadania 2 jest właścicielem:
- Nowe pliki `src/content/service-client-retry.ts`, contracts/fixture/assessment/integration za pomocą tego przedrostka.
- `src/content/course.ts` Kompozycja katalogowa wyłącznie dla załączników i `src/engine/course-route.ts` dodatek do rozszerzonej
  grupy. Aktualizacja `src/engine/course-route.test.ts` CURRENT -oczekiwania katalogu do 49 unikalnych rozszerzeń ogółem /
  32 i dokładnie jeden dołączony moduł współwalutowy; zachować dokładne Core17 i każdego
  starego rozszerzenia entry/order. Ten test celowo śledzi aktualną dostępność, w przeciwieństwie
  do chronionych historycznych konsumentów rejestru.
- `src/domain/types.ts` Lekcję.minutes tylko fakultatywnie; `src/content/validate.ts` reguła "finite-positive-if-present"; `src/components/overview.tsx`
  dwa fragmenty warunkowego czasu trwania; skoncentrowane validation/render/browser pokrycie.
- Nowe `src/content/service-client-retry-compatibility-fixture.ts`, urządzenie do projekcji i badania. Historyczne `src/content/*.test.ts` Konsumenci mogą zmienić
  ONLY import/wrapper skład na prependium dokładnej A10 projekcji; zachować stare dane o mocowaniu,
  liczniki, hasze i twierdzenia. Zapisuj każdą taką ścieżkę w raporcie różnic.
- `tests/` jeden skupiony nowy lesson/package spec przepływu ucznia przy użyciu ustalonych wzorców; nie
  szerszy przeprojektowanie.

Doradca jest właścicielem `plans/README.md` i tego planu. Native executionator zobowiązuje się do
przeglądu ostatecznej spójnej funkcji, w tym planów doradców, po wszystkich bramach. Nie
zobowiązuje się do wdrożenia przed niezależnym przeglądem i ostateczną weryfikacją.

Poza zakresem: każda stara lekcja, stary pakiet projektów, stare bajty archiwalne, persistence/migration/evidence
zasady, bezpieczeństwo biegacza, zależność versions/lockfiles, globalny UI przeprojektowanie, nowe
protokoły hosting/security/authentication/receipt, historyczne oczekiwania testowe lub zapieczętowane rachunki.

## Polecenia i oczekiwane wyniki

Użyj kwalifikowanych narzędzi węzła i rusty z prywatnych metadanych przygotowania;
komendy publiczne poniżej zakładają, że ich kwalifikowane katalogi są na PATH. Utrzymuj
Cargo w trybie offline i korzystaj z własnego domu Cargo i oddzielnych własnych celów.
Nie należy instalować brakujących narzędzi.

| Cel | Polecenie | Oczekiwane |
|---|---|---|
| Tworzenie opakowań | `npm run content:packages` | 28 ZIPs; wszystkie stare 26 SHA -identyczne |
| Skupione policy/content badania | `node node_modules/vitest/vitest.mjs run src/content/service-client-retry-integration.test.ts src/content/service-client-retry-assessment.test.ts src/content/service-client-retry-compatibility.test.ts` | nie failures/skips; faktyczne stałe urządzenia sterujące Rustą |
| Nowy dowód pochodzenia | `npm run content:client-retry` | faktyczna stabilna kontrola poprawności i kontroli mutacji |
| Nowy MSRV dowód | `npm run content:client-retry -- --msrv` | dokładny 1.85.0 autorski czek, nr install/fetch |
| Statyczny | `npm run lint`; `npm run typecheck -- --incremental false`; `npm run content:check`; `npm run content:audit`; `npm run content:manifests` | każde wyjście 0 |
| Pełna jednostka | `npm test` z udokumentowanymi kwalifikacyjnymi przedrostkowymi warunkami wstępnymi z inicjacją | brak awarii, niezamierzone skipy, todo lub brak rodzimego dowodu |
| Autorskie przykłady | `npm run content:rust` | kompletny raport o zwykłych korpusach, brak zamaskowanej awarii infrastruktury |
| Provenance | `node --test scripts/verify-oss-provenance.test.mjs`; `node scripts/verify-oss-provenance.mjs --check` | zjazd 0, dokładny zakres sfabrykowany |
| Produkcja | `npm run build` | nowy udany build, rzeczywisty BUILD _ ID zachowany |
| Przebieg pracy uczestnika | Ukierunkowany test Playwright na uruchomionym na potrzeby testów serwerze produkcyjnym, a potem standardowy zestaw testów w zakresie uzasadnionym zmianą | Rzeczywiste sprawdzenie interfejsu, stanu i pobierania plików. Atrapa wykonawcy pozwala sprawdzić jedynie żądania i interfejs. |
| Offline | `npm run test:offline` przeciwko własnemu serwerowi produkcji | świeża, neutralna ekspozycja i przełęcz wytrzymałości państwa |

Plik CI będzie uruchamiał przyszłe kontrole hostingowe tylko wtedy, gdy zostanie
później autoryzowany; lokalne edycje i sukces lokalny nie określają akceptacji Actions/main.

## Zadanie 1 — wdrożenie opcjonalnego pakietu polityki klienta

- [x] Najpierw należy napisać nieudany package/control test. Wymagane oryginalne trwałe pakiet
      głębokiej równości i każdy odziedziczony plik rozwiązania bajt-identyczny w obu
      nowych wariantach.
- [x] Zbuduj niezmienny nowy pakiet id `durable-log-retry-workspace`, projekt id `durable-log-retry`. Popraw wszystkie 40
      istniejących plików rozwiązań jako ujawniony kontekst odniesienia w obu
      wariantach. Dodać tylko ponownie moduł, opcjonalne binarne, nowe testy i `RETRY-LAB.md`.
      Stare README/manifests/lockfile/library/binary pozostaje identyczne z bajtem. `#[path = "../retry_client.rs"] mod retry_client;` w nowym systemie binarnym unika
      edycji starych korzeni; testy wykorzystują `#[path = "../src/retry_client.rs"] mod retry_client;` z `crates/ingest-service/tests/`. Nie należy ponownie używać
      ścieżki względnej binarnej z katalogu integration-test.
- [x] Nowy rozrusznik ograniczył szkielety do nowej pracy, nigdy nie ukrył pełnego
      rozwiązania. Ponieważ obejmuje on stary kontekst rozwiązania, `starterRevealStepRefs` zawiera
      wszystkie odziedziczone refs rozwiązania. Ekspozycja na nowe rozwiązania obejmuje
      wszystkie nowe rodziny podstawowe, w tym w razie potrzeby równoważne zadania apply/blank.
      Przetestuj oba pliki do pobrania za pomocą rzeczywistych pomocników silnika
      uczenia się: pomoc jest rejestrowana, nie produkuje się ukończenia lub
      niezależnego kredytu, istniejąca niezależna historia pozostaje nietknięta.
- [x] Wdrożenie wpisanego parsera, sprawdzona polityka, zbiorcza pewność i rzeczywisty
      klient Tokio. Badania obejmują każdy wyemitowany ERR, wszystkie ograniczenia
      odbioru, malformed/multiple lines/trailing bajtów, invalid/zero sekwencji, limitu bajtów odpowiedzi, STORAGE niepewności
      i wyraźnej starej granicy mapowania TOO _ LARGE.
- [x] Maksymalne próby testowe obejmujące granice zero/one, termin dokładnie teraz,
      opóźnienie w osiągnięciu terminu, przekroczenie przepływu oversleep/recheck, wszystkie I/O faz
      dzielących się terminem, status terminala po wcześniejszej niejasności i nie
      wysyła po wyczerpaniu budżetu. Deterministyczne podróbki transport/time są oznaczone jako
      takie.
- [x] Dodać faktyczny dowód na pętlę z istniejącym autorem service/Store: commit następnie
      utracona odpowiedź i identyczna powtórka plonów DUPLICATE z oryginalną sekwencją i
      dokładnie jednym wierszem. Obserwować wysłane bajty i połączyć wszystkie tasks/threads na
      success/failure. Pokryć QUEUE_FULL/BUSY odpowiedzi oddzielnie; odróżnić autorem peer/proxy od rzeczywistej usługi,
      gdy używane. Żadnych sfabrykowanych dowodów.
- [x] Dodać kompilowanie semantycznych kontroli rodzimych mutacji: świeża tożsamość na
      ponowną próbę, ponowna próba po konflikcie, próba off-by-one, utracona zagregowana
      dwuznaczność, zignorowany wspólny termin. Wymagane zamierzone assertion/test niepowodzenie i
      pozytywne wyniki badań; skompilowanie errors/timeouts/missing testów są infrastrukturą lub niewłaściwe
      kontrole, nigdy nie odrzucono-mutant przepustka.
- [x] Dodawać pochodny archiwum notatka mapowanie powyżej. Przenosi to już zatwierdzony
      trwały wyjątek Cargo dla SAME odziedziczonych manifestów; nie jest to nowy wyjątek
      lub wybór licencji. Zachowaj każdą informację kanoniczną bez zmian, więc wszystkie
      stare ZIP bajty pozostają równe. Ujawnienie źródła odniesienia i nowych MIT
      regionów wykonywalnych / CC BY prosowych w nowych plikach oraz RETRY-LAB.md. Stop, jeśli
      wymaga to zmiany polityki licencji zamiast posiadania istniejących ogłoszeń.
- [x] Snapshot 26 własnością starych ZIP hash przed pokoleniem, a następnie uruchomić
      `content:packages` tylko po obu wykonawców ukończyć catalog/package dodatki. Wszystkie 26 stare ZIPs pozostają
      dokładne i istnieją dwa nowe. Lokalny weryfikator buduje swoje stałe archiwum
      autorskie bezpośrednio, nie wymagając autoryzacji katalogu aplikacji lub haka
      cyklu życia generacji pakietów.
- [x] Wdrożenie parametru zamkniętego `content:client-retry` weryfikator z tylko fakultatywnymi stałymi
      `--msrv`; odrzuć duplikaty, arbitralne flagi paths/source/toolchain/fetch przed wykonaniem jakiejkolwiek pracy
      rodzimej. Zastosuj istniejące konwencje kwalifikacyjne archive/extraction/tool. Zapisuj dokładne archive/source/tool
      hash, wersje, komendy, liczniki, zakres i błędne obserwacje. Wydrukowane zwykłe
      testy i przyszłe CI stable/MSRV rozmowy.

**Weryfikacja:** Testy pakietowe, nowe testy weryfikacyjne, stabilne i dokładne MSRV natywny dowód;
wszystkie przejść z zachowanych starych hash archiwum. Zatrzymaj, jeśli cache/tool niedostępny;
nie pobieraj pracy.

## Zadanie 2 — lekcje, dowody i obsługa ograniczonych metadanych

- [x] Zapisać nieudany integration/evidence testów przed zawartością. Wstępne wymagania modułu
      asystującego, dokładnie dwa lessons/concepts, dwie odrębne rodziny podstawowe według koncepcji,
      oddzielne recenzje i odkrywalność trasy. Ocena kanonicznych, semantycznie
      odmiennych odpowiedników i kompilacji mutantów semantycznych dla każdego nowego
      autora wspieranego testami step/review przy użyciu rzeczywistego stałego wykonania Rusta i
      wyjścia oceniającego.
- [x] Autor dwóch lekcji i czterech rodzin powyżej. Należy ponownie wykorzystać
      istniejące rejestry źródeł `tokio-timeout`, `tokio-tcp-stream` i `errors-rust-book-overview`. Początkowo sugerowany AWS artykuł nie
      został dodany ani zaznaczony na nowo: strona była niedostępna w trakcie tych prac.
      Summaryzuj w oryginale polskim; nie kopiuj akapitów. Referencje wspierają
      wyjaśnienia; testy rodzime dostarczają odrębnych dowodów wykonywalnych.
- [x] Dołącz wpisy catalog/project; dodaj moduł do rozszerzeń usług konkursowych. Zachowaj
      oryginalne Core17 i wszystkie poprzednie ordering/aliases. Liczby stają się 49 modułów, 198 lekcji,
      196 pojęć, 197 kompetencji i 14 projektów; otrzymać steps/source liczy się od rzeczywistej
      zawartości zamiast zgadywania.
- [x] Uzupełnij opcję Lekcji.minutes i potwierdź `minutes !== undefined && (!Number.isFinite(minutes) || minutes <= 0)`. Nowe lekcje pomijają to. Oba
      fragmenty przeglądu muszą warunkowo tworzyć zegar, wartość i separator razem,
      zachowując postęp krok bez `undefined min` lub wiszące separatory. Brak zmian na pokładzie,
      utrzymujące się pole lub ogólne UI. Badanie nieokreślone dozwolone, NaN/Infinity/0/negative
      odrzucone, wszystkie 196 stare lekcje trwające bez zmian.
- [x] Używając oryginalnego przed-autoryzującego przechwytywania, dodaj dokładny A10
      projekcja: pasek tylko autorskie dodatki z kompletnym następcą hashes/positions, zachować unknown/unrelated
      zmian i referencji funkcji, projekt prawdziwe i syntetyczne domyślne nazwy paces
      niezależnie, idemitly i bez mutacji. Przywrócić wszystkie 15 hash poprzedników i
      dokładnie cały kurs hash. Następnie prependive tę prognozę dla historycznych
      konsumentów tylko przez import/wrapper aliasy; nigdy nie edytować stary hashes/assertions. Bieżące lesson/evidence testy
      zawsze używać nieprzewidywanych bieżącej zawartości.
- [x] Porównaj trzy oryginalne elementy stanu po autoryzacji przy użyciu rzeczywistej
      trwałości prądu. Zachować historię surową, daty zdarzeń, daty prób, pomoc,
      wznowienie, notatki, zakładki, recenzje i wyjątki trasy. Tylko generowane daty
      kopert eksportowych mogą się normalizować.
- [x] W teście przeglądarkowym sprawdź odnalezienie rozszerzenia i wznowienie dokładnie tego samego kroku w nowym zadaniu. Sprawdź też pominięcie szacunków czasu, zachowanie pomocy i pobierania dla obu wariantów archiwum oraz neutralny zapis dostępu do treści offline. Symulowana odpowiedź wykonawcy pozwala sprawdzić żądanie, interfejs i zapis stanu. Dowód działania kodu Rust wymaga osobnego uruchomienia.

**Weryfikacja:** skoncentrowane content/evidence/native testy modeli, aktualna walidacja, wszyscy konsumenci
kompatybilności historycznej, renderer/browser kontrole i porównanie państwowe; no failures/unintended skipy i stare
wiersze bajtowe.

## Zadanie 3 — kwalifikacja i zamknięcie spójnego etapu lokalnego

- [x] Niezależnie od tego, przed ostatecznym kampanią należy dokonać przeglądu zarówno
      różnic zadaniowych, jak i testów. Rozwiąż konkretne ustalenia wraz z dokonanym
      ponownym przeglądem; nie powtórz kompletnych zestawień w celu uzyskania
      niezmienionych korekt tylko w odniesieniu do dowodów.
- [x] Odśwież dokładne, skończone pokrycie pochodzenia dla nowych authored/changed treści po
      przeglądzie kontekstowym źródła; rekordowe limity, a nie globalna legal/security gotowość.
      Nie edytuj ręcznie wygenerowanych ZIPs.
- [x] Uruchom świeże static/full-unit/content-Rust/new stabilne + MSRV/build/browser/offline bramy na zamrożony dokładnie kandydata.
      Kwalifikacja kontroli inicjalizowanych prefiksów z własnymi katalogami artifact/config/target i
      aktualnym hashem narzędzi. Zachować wszystkie awarie i rzeczywisty exit/counts.
      Wyróżniający dynamiczny Next route-cache ocieplenie od źródła dryfowania; uchwycić
      prawdziwy stan budowy before/after jego deklarowanej fazy zamiast rekonstruowania go.
- [x] Przegląd pełnego zróżnicowania i zweryfikować brak pełzania zakresu, bezwzględnych
      prywatnych ścieżek, referencji lub powiadomień błędów w obecnych sources/new archiwów.
      Używaj tylko danych syntetycznych. Początkowe syntetyczne ścieżki uchwytów
      publicznych pozostają w zasięgu przyrządów, a nie kocem zatwierdzania prywatności.
- [x] Native executionator tworzy English implementation commit z dokładnego
      sprawdzonego i przetestowanego drzewa. Potwierdź jego drzewo i status clean/no-remotes, a
      następnie niezależnie przywróć cały pakiet. Doradca zamyka ten plan dopiero po
      tych wynikach i istnieje pakiet akceptacji lokalnej realizacji. Zapis zamknięcia w
      osobnym English Documentation-only commit; nie należy przypisywać testowanego
      drzewa implementacji jako nowego uruchomienia zmienionej dokumentacji.
- [x] Utwórz kompletny pakiet lokalnych źródeł, niezależnie przywracając go do nowego
      katalogu, zweryfikuj Git fsck i każdy byte/size/mode/hash plus clean/no-remotes stan. Uszczelnienie lokalnego
      pakietu dowodowego z faktycznym references/SHAs. Nie żądaj main/Actions przyjęcia.

## Kryteria ukończenia

Wszystkie zadania sprawdzone, zarówno niezależne przeglądy czyste, pełne wymagane
kontrole faktycznie przekazać na kandydata końcowego, 26 stary ZIPs i wszystkie stare
rzędy bez zmian, brak nowych szacunków nauczania, dokładne predecessor/state zgodność zweryfikowane,
nowe natywne kontrole znaczące, English commit backup i przywrócone, no remote/installation działanie.
Zapis rzeczywistych liczb i wszystkich pozostałych granic zewnętrznych.

## Warunki wstrzymania i utrzymanie

Zatrzymaj zadanie zależne i zgłosić betonowy bloker, jeśli dryf źródłowy unieważnia te
fragmenty, stary rows/archives musi się zmienić, brakuje cache/tool wymaga instalacji, brama zawodzi dwa
razy bez zrozumiałej przyczyny, kod potrzebuje arbitralnej realizacji uczenia się lub
poza zakresem dependency/architecture zmiana jest wymagana. Kontynuuj rozłączenie autoryzowanej pracy. Nie
osłabiaj bramy ani nie wymyślaj rezultatu.

Przyszłe opcje pracy, z których każda wymaga własnego uziemionego planu funkcji: granica
autoryzacji aplikacji; lokalny format plików migration/rollback; niebezpieczny projekt abstrakcji marker/auto-trait.
Odświeżanie, hosting, publikacja rejestru i szeroka integracja OSS pozostają osobnymi
bramami zewnętrznymi. Uzgodnić najpierw istniejący obszerny program nauczania; datowany
plan działania nie uzasadnia duplikatu lekcji.

## Rejestr decyzji przed wdrożeniem

- A10 - PLAN-001: przed wysłaniem wykonawcy należy wyraźnie określić czterokierunkową algebrę
  i tabelę graniczną; obserwacja różni się od końcowego wyniku żądania.
- Fakultatywne metadane dotyczące czasu trwania są umyślną umową o dopuszczenie do
  obrotu. Nie kodować dwóch nowych lekcji IDs do walidatora produkcji. Autentyczna
  prognoza poprzednika oraz wyraźne twierdzenia o integracji muszą zachować niezmienione
  wszystkie 196 dotychczasowych wartości lekcji; przyszłe nowe lekcje mogą również
  pomijać szacunki. Dane pokładowe nie są powiązane i pozostają niezmienione.

- Zadanie 1 Wyjaśnienie wstępnego lotu: binary/test Ścieżki modułów różnią się; bezpośrednia
  weryfikacja natywna stałego archiwum pozwala uniknąć wyścigów typu pakiet-generacja.
  Lokalna edycja plików Workflow jest autoryzowana, zachowane pozostaje wykonanie.
  Pakiet pochodny zawiera niezmieniony istniejący, trwały wyjątek od licencji Cargo i
  zawiadomienia; nie podejmuje się żadnej nowej licencji ani decyzji o prawach
  autorskich.

- Bieżące-katalog test zakres potwierdzenie z bezpośredniego źródła czytuje: `src/domain/project-package.test.ts:89-98` i `src/engine/course-route.test.ts:14-90`
  asert aktualne liczby dostępności. Ich dokładne aktualizacje + 1 należą do tej
  funkcji; zamrożone historyczne hash/count twierdzenia pozostają bez zmian.

## Lokalna akceptacja (2026-11-04)

Zobowiązanie do realizacji: `b0a34137c41a657ef06916f5dab87c811881e827` (`Teach bounded client retries and preserve ambiguous outcomes`). Jej drzewo, `2607387b6e9844fb9262085255d12054409870f8`, jest dokładnie zamrożonym i
wykwalifikowanym kandydatem do 639 plików. Niezależne źródła i wyniki przeglądów
przeszedł; kompletny lokalny pakiet Git został przywrócony niezależnie z dokładnymi
bajtów, trybów, hash, refs, stan czysty, bez zastępców, i żadnych pilotów. Prywatny
pakiet akceptacji wdrożenia został zapieczętowany przed zamknięciem tego planu.
Wcześniejsze niepowodzenia i kampanie diagnostyczne pozostają zachowane jako porażki lub
diagnostyka.

Świeża weryfikacja końcowa przeszła wszystkie 16 faz statycznych: 1848 testów
jednostkowych, 2599 oryginalnych skrzynek Rusta, stabilnych 1.98.1 i MSRV 1.85.0 kontroli
natywnych (32 polecenia i dziewięć zestawień kontroli mutantów semantycznych na łańcuch
narzędzi), typecheck, lint, content/source/manifests/provenance kontroli oraz produkcji budowy. Pełna realizacja
przeglądarki przeszła wszystkie 199 odkrytych testów w 43 plikach, raz każdy, bez
skakanek lub nieszczelnych wyników. Formalna weryfikacja offline i dodatkowa powtórna
sprawa offline minęła. Przechowywanie źródeł pozostało dokładne w całym; własny serwer
przeglądarek i tymczasowe bezczynności prewencyjne twierdzenia zostały wydane.

Obecny katalog: 49 modułów, 198 lekcji, 1,323 kroków, 196 koncepcji, 197 kompetencji,
349 rekordów źródłowych i 14 projektów. Wszystkie 15 poprzednich odcisków palców w
rejestrze, trzy utwory państwowe, 196 starych okresów trwania lekcji, 13 starych
obiektów projektu i 26 starych ZIP archiwów zostały zachowane. Dwie nowe lekcje pomijają
szacunki dotyczące czasu trwania uczenia się.

To zamknięcie zmienia tylko dwa pliki Markdown planu. Automatyczne dowody wykonania
należą do zobowiązania implementacyjnego powyżej; ostateczne zamknięcie dokumentacji
otrzymuje oddzielny scope/metadata przegląd i kopię zapasową, bez żądania nowej pełnej wersji
pakietu na zmienionym drzewie. Jest to jedna z cech dla jednej ewentualnej PR.
Popychanie, pilotowanie, integracja główna, działania hostingowe, installation/fetch, rozmieszczenie,
publikacja i osobne globalne przeprojektowanie UI pozostają poza tą lokalną akceptacją.
Automatyczne kontrole nie określają osiągnięć uczących się, gotowości zawodowej lub
ogólnego legal/security zezwolenia.
