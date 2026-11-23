Stan kodu źródłowego podstaw własności z 2 listopada 2026 r. obejmuje 48 modułów,
193 lekcje, 194 pojęcia, 1 287 kroków i 349 źródeł. [Kontrakty ćwiczeń z podstaw
własności](ownership-foundation-transfer-evidence.pl.md) dodają pięć rodzin
zadań głównych i cztery opcjonalne etapy sesji Cargo, zachowując historyczny
początek kursu i zapisy kursantów. Liczby opisują dostępność materiału. Weryfikacja
w hostowanym CI i integracja nadal czekają na osobną akceptację. Testy autorskie
nie potwierdzają opanowania materiału ani gotowości zawodowej. Wcześniejsze
zapisy zachowują daty i powiązanie z konkretnymi uruchomieniami. Ich ówczesne
etykiety pozostają historyczne.

Zaakceptowane wydanie produktu M13 opisuje [weryfikacja M13 z 9 października
2026 r.](verification.pl.md#m13-current-verification-snapshot-9-october-2026).
Zaakceptowany kod PR54 to [commit `main` `70682709eabb1d8f95dd067d6429df3190eae72d`](https://github.com/fettpl/rustcrushcourse/commit/70682709eabb1d8f95dd067d6429df3190eae72d)
z drzewem `ee303bdc5d451b162b45b7916e4fb901f5cff3a1`. Dostępność kodu, CI
uruchomione przez zwykłe zdarzenia w repozytorium, lokalne dowody na potrzeby
wydania, efekty nauki i gotowość mają odrębne zakresy.

# Rust Workshop — stan implementacji

[English](progress.md)

Ostatnie zaakceptowane wydanie przed kandydatem wprowadzającym wsparcie sesji
to [wydanie M8 z 9 października 2026 r.](verification.pl.md#latest-accepted-release-before-session-scaffolding-candidate-9-october-2026).
Autorskie etapy sesji i materiały pilotażowe pakietu 005 pozostają odrębnym
kandydatem, dla którego nie odnotowano wyników kursantów.

Bieżący zweryfikowany kod produktu opisano w [weryfikacji PR54 w ramach M13
z 9 października 2026 r.](verification.pl.md#m13-current-verification-snapshot-9-october-2026).
Datowane zapisy poniżej dokumentują historię oraz zakres docelowy. Ich ówczesne
etykiety stanu dotyczą tamtych weryfikacji.

## Historyczne zapisy wdrożenia

Historyczny kandydat źródłowy M11 jest opisany w [kontraktach i dowodach dla
ćwiczeń async z 9 października 2026 r.](async-transfer-evidence.pl.md).
Odbiornik, callback i adapter `dyn` mają po dwie autorskie rodziny zadań
głównych. Anulowanie i zatwierdzanie zmian, `Send` oraz cztery pojęcia z obszaru
`unsafe` mają po jednej rodzinie, czyli łącznie trzy z dziewięciu pojęć mają
dwie rodziny, a sześć po jednej. Dostępność w kodzie, potwierdzenie umiejętności
kursanta i akceptacja wydania w produkcji, CI lub lokalnie pozostają odrębnymi
kwestiami. Poniższe zapisy zachowują pierwotne znaczenie.

Zachowano wcześniejsze liczby, numery kolejności modułów i projektów, przerwane
uruchomienia, obserwacje kompilatora i środowiska oraz ograniczenia loopback i
Chromium. To dowody historyczne i nadal otwarte wymagania. Bieżący stan produktu
opisuje powyższy odsyłacz do zweryfikowanego kodu.

Po etapach API Release Matrix, Fuzz Evidence, Borrowed Memory i Macros as APIs
historyczny katalog obejmował 184 lekcje, 48 modułów, 187 pojęć, 139 zadań
rozpoczynanych w pustym edytorze, 329 źródeł i 13 projektów. Weryfikator
`content:allocations` porównuje wariant bazowy, wariant badany i mutanta wymuszającego
materializację dla tego samego obciążenia. Pomiar RSS pozostaje poza zakresem.

Etap `macros-as-api` dodaje trzy lekcje po polsku, trzy główne zadania zaliczeniowe,
trzy samodzielne zadania z pustym edytorem, trzy powtórki kodowe i trzy zweryfikowane
źródła Rust. Ćwiczenia przeglądarkowe z jednym plikiem źródłowym uzupełnia
weryfikator z dwiema jednostkami kompilacji, korzystający tylko z biblioteki
standardowej. Sprawdza rozwiązywanie `$crate`, jednokrotne efekty uboczne, składnię
powtórzeń i zachowanie `expr` w edycji Rust 2024 na stable i dokładnie Rust 1.85.0.

Etap `async-lending-contracts` dodaje pięć polskich lekcji, pięć kryteriów z dziesięcioma ocenianymi zadaniami (gate i blank dla każdego kontraktu) oraz pięć niezależnych powtórek: borrowed receiver z kontrolowanym `Pending -> Ready`, sekwencyjny `AsyncFnMut`, commit po callbacku, granicę `Send + 'static` oraz boxed adapter. Rozszerzenie `tokio-service-workshop` zawiera `lending.rs`, `report_source.rs`, lokalny przykład, kontrakt testowy i `ASYNC-LENDING.md`; `content:async-lending` porównuje oba ZIP-y, uruchamia stable oraz exact Rust 1.85.0 w trybie offline i wymaga odrzucenia startera. Dedykowane async gate/reveal/transfer/resume/offline/keyboard/console assertions są zapisane w E2E/offline, ale pozostają niezweryfikowane do przebiegu z działającym loopback.

Historyczny katalog lokalny obejmował 184 lekcje w 48 modułach, 187 pojęć, 139
zadań z pustym edytorem, 7 śladów pamięci, 329 wpisów źródłowych i 13 projektów
Cargo. Kurs zakłada podstawy programowania i uczy Rusta od zera. Moduł Unsafe/FFI
dodaje cztery lekcje o warunkach wstępnych surowych wskaźników, rozłącznych
obszarach, walidacji `#[repr(C)]` i uchwycie FFI opartym na RAII. API Release Matrix
dodaje dwie polskie lekcje, cztery zadania zaliczeniowe, dwa zadania z pustym
edytorem i dwie niezależne powtórki. Zaufany weryfikator zapisuje wyniki autorskiego
klienta zewnętrznego dla stable i dokładnie Rust 1.85.0. Nowy moduł dowodów z
fuzzingu dodaje cztery lekcje, osiem zadań zaliczeniowych, cztery zadania z pustym
edytorem i cztery niezależne powtórki. Mini grep przechowuje powtórkę na stable
oddzielnie od kampanii na nightly.

Etap `dependency-assurance` dodaje cztery polskie lekcje o diagnozie grafu, polityce źródeł/licencji, czasowych wyjątkach advisory i decyzji z release dossier. Ma osiem bramek, cztery blank-page tasks i cztery kodowe retrievals. Frame Protocol zawiera restricted supply-chain verifier, authored duplicate evidence, pinned offline snapshot, exception ledger, package extraction i external consumer; `publish = false` pozostaje zachowane. Brak przypiętego binarium/bazy cargo-deny jest jawnie oznaczony jako `unsupported/infrastructure`, więc decyzja wydania pozostaje hold; snapshot nie jest live feedem, SBOM-em ani publikacją.

Zintegrowany katalog Unsafe/FFI ma lokalne testy treści, integrację pakietu i dedykowany verifier stable/MSRV. `ffi-buffer-workshop` jest dziesiątym autorskim pakietem: zawiera checked-in C ABI, bezpieczny wrapper, testy natywnej granicy i safety ledger. Miri nie jest raportowane: obecny pakiet celowo przekracza granicę kompilowanego C i alokatora, a repozytorium nie ma reprodukowalnego, wspieranego przebiegu Miri dla tego fixture.

Etap `service-operations` jest 46. modułem i jedenastym projektem. Cztery lekcje mają osiem bramek, cztery blank-page i cztery powtórki kodowe; sprawdzają bounded admission, allowlistę skorelowanej telemetryki, readiness/drain oraz diagnozę z niewystarczającym dowodem. `service-operations-workshop` przypina Tokio 1.53.1, zawiera pięć testów kontraktowych, sześć kontrolowanych mutantów, threat model i runbook. Stable oraz exact Rust 1.85.0 porównują wygenerowane archiwa przed testami Cargo; E2E sprawdza mapę, wznowienie, pobranie i offline cache. Pakiet jest autorskim fixture dydaktycznym: nie uruchamia kodu ucznia ani importu i nie deklaruje produkcyjnego backendu telemetrycznego, cancellation arbitralnego blocking code ani pełnej gotowości operacyjnej.

Etap `unsafe-miri-contracts` jest 44. modułem i dwunastym projektem. Cztery lekcje mają osiem bramek, cztery blank-page i cztery powtórki kodowe; sprawdzają kontrakty `ByteView`, rozłączne regiony, stan `Slot<T>` z `MaybeUninit` oraz krótkie reborrow `MutSlot`. `miri-safety-workshop` zawiera bezpieczną bibliotekę i trzy izolowane pure-Rust fixtures UB. Stable i exact Rust 1.85.0 sprawdzają pakiet, a przypięty nightly uruchamia Miri na testach bezpiecznej biblioteki oraz osobno na trzech izolowanych binariach negatywnych; tylko te binaria są negatywnymi fixture'ami i celowo wywołują UB, a verifier wymaga diagnostyki przypisanej do konkretnego pliku.

Etap `profile-evidence` jest 40. modułem. Cztery polskie lekcje mają osiem bramek, cztery blank-page i cztery powtórki kodowe; follow-up dodaje dwie lekcje, cztery bramki, sześć ocenianych kroków i dwie powtórki runtime allocation. Log Analyzer ma teraz 20 autorskich plików, w tym `tests/source_model_contract.rs`, `PROFILE-MANIFEST.json`, `PERFORMANCE.md`, `ALLOCATION-MANIFEST.json` i allocation probe. `content:profiles` sprawdza stały workload 512 rekordów i jawne założenia źródłowe, a `content:allocations` uruchamia osiem workloadów, trzy tryby w osobnych procesach i kontrolowanego mutanta. Raport nie jest pomiarem RSS ani uniwersalnym twierdzeniem o szybkości.

Historyczne liczby to 184/187/7/329 w 48 modułach. Wcześniejsze zestawienia
181/184/7/326 i 171/174/7/314 także pochodzą z wcześniejszych etapów.
Commit `38fbdb061336a222b6db077630b1fd4c0943ca74` dodaje izolowane, rzeczywiście
uruchamiane mutanty powtórki, wykonywalnej regresji, tekstu wyroczni testowej,
instrumentacji i normalnego ukończenia. Dodaje też wykrywalne kontrakty Rust
dla zadań z pustym edytorem i powtórek, a także scenariusz offline obejmujący
przewidywanie, symulowane wykonanie głównego zadania, odsłonięcie lub pobranie,
ukończenie z pomocą, sprawdzenie braku wpływu na poziom opanowania, zadanie z
pustym edytorem i wznowienie. Wcześniejszy raport dla fuzzingu odnotował pozytywne
wyniki TypeScript, ukierunkowanych testów Vitest, pełnego Vitest (496/496),
walidacji treści, budowania i lintu. Weryfikację bieżącego zintegrowanego drzewa
odnotowują osobno CI dla dokładnego commita oraz dzienniki tej aktualizacji.
Pełne kontrole Cargo z testami loopback oraz produkcyjne E2E i offline mogą
pozostać niewykonane w środowisku, w którym loopback przekracza limit czasu lub
zwraca `Operation not permitted`. Po błędzie weryfikator zachowuje raport,
dzienniki, korpus i artefakty oraz sprawdza bieżące ścieżki, sumy kontrolne i
tożsamość uruchomienia. Regresja na stable i kampania na nightly mają odrębne
raporty. Pierwsze pełne uruchomienie autorskich testów Rust dotarło do 2 126 z
2 139 przypadków. Próbę po poprawce zatrzymano, gdy utknęła bez wyniku. Lokalny
fuzzing ogranicza brak `cargo-fuzz`. Cargo, produkcyjne E2E i offline ogranicza
również `EPERM` dla loopback i Chromium. CI konfiguruje wymagane nightly,
dokładnie Rust 1.85.0 i cargo-fuzz. Wynik kampanii CI nie jest tu potwierdzony.
Weryfikator API osobno sprawdza autorską bibliotekę i starszego klienta przy
różnych konfiguracjach funkcji oraz na dokładnym MSRV. Efekty nauki wymagają
osobnego pilotażu, którego dotąd nie przeprowadzono.

Commit `ba7db78605addd0680cf3627400069a0f9527e51` wymaga również zaufanego
pochodzenia pozytywnych raportów, udanej redukcji przypadku z dodanym wypełnieniem
i powtórki mutanta, odtworzonej powtórki ze stałą implementacją referencyjną,
odrzucenia kompilującej się mutacji na stable, powtórki wrażliwej na flagi
dopasowania i kolejność oraz zachowania poziomu opanowania po rozwiązaniu zadania
głównego ze wsparciem po odsłonięciu. Wydanie pozostaje wstrzymane do czasu
potwierdzenia kampanii przez CI.

Commit `2fc588ef04a214dbdb8c4ea95b38455a3c3437f7` oddziela sumę wejścia do
regresji na stable od przypadku potwierdzającego redukcję wejścia z wypełnieniem.
Odrzuca dowolne identyfikatory celu lub mutanta, sprawdza wiersze z zachowaniem
duplikatów, flag dopasowania i kolejności oraz wymaga wystąpienia wskazanego
błędu regresji na stable.

Historyczne lokalne zapisy kontroli kompilatora, testów jednostkowych, stable/MSRV, typecheck, content validation, lint, build, browser i offline oraz dowody RED/GREEN jawnej polityki `unsafe` zostały zachowane na maszynie autora, ale nie są dostępne czytelnikom repozytorium. Nie publikujemy ich prywatnych ścieżek ani nie przypisujemy im publicznego przebiegu workflow; zachowane powyżej wyniki i ograniczenia pozostają historycznym zapisem. Publiczne odnośniki do commitów, PR-ów i przebiegów CI w dalszej części dokumentu pozostają bez zmian.

Etap Pożyczone API i angielskie README zostały scalone w [PR #8](https://github.com/fettpl/rustcrushcourse/pull/8) jako `57c24f9`, po sukcesie wszystkich trzech kontroli [CI dla commita `236a09e`](https://github.com/fettpl/rustcrushcourse/actions/runs/34750981784). Cargo zostało scalone w [PR #9](https://github.com/fettpl/rustcrushcourse/pull/9) jako `2a68786`, po sukcesie wszystkich trzech zadań dla dokładnego head `520ed98`. [CI po scaleniu](https://github.com/fettpl/rustcrushcourse/actions/runs/35235866279) również zakończyło wszystkie trzy zadania sukcesem. Nie oznacza to ukończenia całego celu zaawansowanego kursu.

Poprzedni Number Guessing+ został scalony w [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7) jako f94b87e po sukcesie wszystkich trzech jobów [CI dla commita 451e3a3](https://github.com/fettpl/rustcrushcourse/actions/runs/34749313613). Etap przeszedł 171 testów Vitest, 1343 przypadki Rust, 252 Tokio, modele Loom, osiem pakietów Cargo, MSRV, mutacje, fuzz oraz 46 produkcyjnych E2E i offline z cache v20.

Zakończono implementację i lokalną weryfikację etapu `public-api-workspaces`: cztery lekcje kontraktów publicznego API oraz workspace z biblioteką `frame-protocol` i osobnym klientem `frame-probe`. Walidacja archiwów obsługuje jawne katalogi członków wirtualnego workspace’u. Niezależne przeglądy treści, pakietu i weryfikatorów są zamknięte. Rzeczywiste kontrole Cargo sprawdziły bibliotekę i workspace, konfiguracje features oraz dokładny Rust 1.85.0; dziesięć kontrolowanych mutacji potwierdziło skuteczność testów. Pełne E2E zakończyło się wynikiem 42/42, Vitest 158/158, a produkcyjny build i kontrola offline przeszły. Szczegóły i ograniczenia zawiera [raport weryfikacji](verification.pl.md).

Cały dostępny zakres współbieżności obejmuje 15 lekcji w pięciu modułach: wątki i scope, kanały, współdzielony stan przez Arc/Mutex, atomiki oraz porządkowanie pamięci z laboratorium Loom. Ćwiczenia dotyczą kończenia pracy także po błędzie, granicy własności, Send/Sync, przepływu wiadomości, backpressure, poison, RMW/CAS, publikacji Release/Acquire i zakresu dowodu z małego modelu. Mapa kursu wyszukuje nazwy i tematy lekcji bez polskich znaków; filtr nie zmienia wybranego modułu ani miejsca nauki.

Log Analyzer prowadzi przez pożyczony rekord, jawne błędy parsera, analizę strumieniową i raport w ustalonym formacie. Pobierany pakiet Cargo zawiera 12 plików i 19 testów: 11 jednostkowych, 5 integracyjnych, 2 procesu CLI i 1 doctest. Czytnik pakietu zachowuje najwyżej 4096 bajtów linii przed LF, pomija resztę zbyt długiego rekordu i liczy go raz. Ćwiczenia przeglądarkowe używają prostszego `read_line`, bez takiej gwarancji pamięci. Pakiet obejmuje CRLF, EOF bez LF, Unicode, duplikaty, uszkodzony UTF-8 i awarię odczytu.

Dotychczasowy etap współbieżności ma 18 zadań z evidence gate, 9 zadań od pustej kartki i 9 kodowych powtórek. Etap atomików dodał 6 lekcji, 12 zadań gate, 6 zadań od pustej kartki i 6 kodowych powtórek; łącznie dostępny zakres ma 30 zadań gate, 15 blank-page i 15 powtórek. Atomics i Loom są dostępne w podstawowym zakresie: RMW/CAS, legalne orderingi, one-shot publication i mały model podmieniający prymitywy. Laboratorium `concurrency-lab-workshop` jest dodatkowym projektem, nie zastępuje pięciu projektów docelowego portfolio. Każde nowe kryterium ma dwa warianty; odsłonięcie pakietu oznacza pomoc dla pierwszych zadań, zachowując samodzielne alternatywy. Pobranie i lokalna lista kontrolna nie zaliczają lekcji. Projekty zachowują oddzielne notatki, pliki, retrospektywy i dokładne wznowienie.

Poprzedni milestone dodał cztery lekcje podstaw async: leniwe ciało i argumenty wywołania, postęp przez await, własność zasobu w Future oraz anulowanie przez Drop. Osiem bramek obejmuje cztery różne zadania od pustej kartki; każdemu pojęciu towarzyszy osobna powtórka kodowa. Testy używają rzeczywistych futures std, zewnętrznych obserwatorów efektów, Waker i Drop oraz skończonych prób poll. Nie zastępują testów runtime Tokio.

Poprzedni etap zintegrował pięć lekcji `tokio-flow-control`: bounded kanały, `reserve` i anulowanie, timeout, `select!` oraz graceful shutdown. Każda ma dwie bramki, w tym jedną blank-page, oraz osobną kodową powtórkę na zmienionym kontrakcie. Materiał sprawdza pojemność i zachowanie wartości, zatrzymany zegar Tokio, politykę cancellation oraz drain i join wszystkich dzieci z zachowaniem JoinError. Profil Cargo Tokio 1.53.1 ma `macros`, `rt`, `sync`, `time` i `test-util`; służy wyłącznie autorskim fixture'om, a API runnera nadal przyjmuje wyłącznie kod, tryb i testy.

Siedem kolejnych lekcji w `tokio-io-streams` i `tokio-blocking-work` dodaje częściowe I/O, ramki z limitem, postęp zachowany po anulowaniu, przypięte Stream, zamknięcie ReceiverStream oraz spawn_blocking z kontrolą życia pracy i permitu. Mają 14 niezależnych bramek, siedem zadań od pustej kartki i siedem osobnych kodowych powtórek. Profil autorski rozszerza Tokio 1.53.1 o io-util i przypina tokio-stream 0.1.19 bez opcjonalnych features. Duplex i kanały służą testowaniu kontraktów I/O; nie zastępują testu sieci TCP.

Etap `tokio-network-service` dodaje cztery lekcje TCP: własność połączenia, kierunkowe zamknięcie zapisu, absolutny deadline ramki i limit admission. Osiem niezależnych bramek obejmuje cztery zadania od pustej kartki; każde pojęcie ma świeżą powtórkę kodową. `tokio-service-workshop` jest piątym pobieranym pakietem Cargo i szóstym projektem. Łączy rzeczywiste IPv4 loopback TCP, ograniczoną kolejkę i pracę blocking z jawnym rozliczeniem zamknięcia. Profil autora dodaje `net` do przypiętego Tokio 1.53.1. Historyczny raport tego etapu znajduje się w wersji `0d25d9d` pliku `docs/verification.md`; bieżący raport obejmuje także późniejsze etapy API i Mini grep.

Projekty obejmują również `tokio-pipeline-workshop`: 7 plików i obecnie 10 testów Rust (1 prywatny test managera, 9 integracyjnych). Łączy bounded queue, limit aktywnych zadań, deadline i raport zamknięcia; pozostaje laboratorium dydaktycznym, nie wdrożonym serwisem.

Wcześniejsze moduły obejmują fundamenty, własność i pożyczanie, modelowanie, kolekcje, błędy, Todo CLI, moduły/Cargo, format i IO, generics, traity, lifetimes, closures i iteratory. Todo ma 11-plikowy pakiet Cargo z biblioteką, programem terminalowym, zapisem pliku i testami procesu. Number Guessing+ zachowuje zadanie komunikatu wyniku i rozwija je w pełną pojedynczą rundę, z parserem, stanem, terminalem i wstrzykiwanym źródłem sekretu. Poprzedni etap dodał pętle, Box/Deref/Drop, Rc/RefCell/Weak i ślad życia wartości oraz alokacji.

Mechaniki aplikacji obejmują onboarding, diagnostykę, Monaco i prosty edytor, zewnętrzny runner, surowe komunikaty kompilatora, wskazówki, ślady pamięci, samodzielne zadania, powtórki i mastery oparte na dowodach. IndexedDB, migracje/import/export, notatki, zakładki, Focus Mode i PWA zachowują schemat v3 oraz wcześniejsze identyfikatory. Stabilnie przestawione pytania wyboru zapisują odpowiedzi po identyfikatorze. Interfejs używa chłodnej palety bieli, granatu i niebieskiego akcentu; ma większą typografię, klawiaturową nawigację i mobilne panele.

[Raport weryfikacji](verification.pl.md) zawiera wyniki kontroli technicznych i ich ograniczenia. [Audyt wymagań](requirements-audit.pl.md) porównuje stan z pierwotnym briefem, a [mapa zaawansowanego curriculum](advanced-curriculum.pl.md) zachowuje docelowy zakres.

Blok Mini grep i wzmocnienia CI został zapisany, wypchnięty i scalony w PR #2 po kontroli dokładnego SHA. Number Guessing+ jest scalony w PR #7, praktyczny zakres wariancji i HRTB w PR #8, Cargo w PR #9, a synchroniczny GAT w PR #10 jako `054a12de` po zielonym CI dla head `2b6500e`. Poza tym pozostają produkcyjne rozszerzenia serwisu Tokio, zaawansowane protokoły współbieżności, dalsze projektowanie publicznego API, wariancja abstrakcji unsafe, szersze curriculum property/fuzz, platformowo niezależny próg benchmarku, utrzymanie systemów oraz szersze operacje. Podstawy pętli, smart pointers, współbieżności, atomików i małego modelowania Loom są dostępne; pełny memory model i zaawansowane gwarancje postępu pozostają rozszerzeniem. Capstone ma ograniczony pakiet i verifier, lecz wydanie pozostaje Hold do live advisory/license review oraz świeżych, przejrzanych raportów stable/MSRV; automatyczne ponawianie rund Number Guessing+ pozostaje rozszerzeniem.

Etap `property-contracts` jest lokalnie zarejestrowany jako dziewiąty projekt i pakiet `property-contracts-workshop`. Cztery lekcje mają osiem niezależnych bramek, cztery blanki i cztery powtórki. Biblioteka pakietu jest std-only; Proptest 1.11.0 występuje wyłącznie jako dev-dependency. Autorowy verifier nie przyjmuje ścieżek, kodu ani zależności z zewnątrz i osobno odrzuca starter oraz mutanta ignorującego malformed. To ograniczony workflow property testing.

Etap `performance-evidence` ma cztery lekcje, osiem bramek, cztery blanki i cztery powtórki. Stałe fixture'y nie używają zegara ściennego. Pakiet Log Analyzer zawiera Criterion 0.5.1 wyłącznie jako dev-dependency oraz test kontraktowy porównujący kształt wyniku baseline/candidate; `content:performance` uruchamia `fmt`, sprawdzenie targetów, test kontraktu i benchmark offline/locked na stable i exact Rust 1.85.0. To dowód jednego workloadu i możliwości porównania ścieżek.

Etap `profile-evidence` ma cztery lekcje, osiem bramek, cztery blanki i cztery powtórki; runtime follow-up dodaje authored probe, strict report schema i niezależne Rust contracts. `content:profiles` sprawdza źródłowe założenia modelu, a `content:allocations` obserwuje named parser call na ośmiu workloadach, w tym controlled reader error, granice 4096/4097 i simulated failed realloc. Opcjonalne tryby zewnętrzne uruchamiają świeży Callgrind albo DHAT pod Valgrind dla całego procesu testowego; raport nie przypisuje próbek wyłącznie parserowi. CI ma osobny job dla obu raportów; repozytorium nie przechowuje wygenerowanych profili jako źródła prawdy. Pozostają: RSS i retained-memory claims, platformowo niezależny próg czasu i szersze pomiary kosztu.

Nie przeprowadzono pilotażu z uczącymi się. Dostępność treści i zielone testy nie potwierdzają samodzielnego transferu po przerwie ani gotowości zawodowej. Cel całego kursu pozostaje otwarty.

Etap `unsafe-ffi-contracts` jest lokalnie dostępny jako 38. moduł i prowadzi do dziesiątego projektu, `ffi-buffer-workshop`. Stable i job MSRV uruchamiają `content:ffi` przed generycznym `content:cargo`; verifier porównuje oba wygenerowane archiwa, sprawdza formatowanie, locked/offline target checks, testy natywnej granicy i Clippy. Miri pozostaje jawnie poza zakresem tego pakietu: natywny C i allocator są częścią fixture ABI. Wspierany pure-Rust harness Miri znajduje się w osobnym `miri-safety-workshop` i nie obejmuje tej granicy. E2E pokrywa nawigację, dokładne wznowienie blanku, pobranie obu wariantów oraz offline cache dla nowego ZIP-a.

CI po scaleniu na `57c24f9`: [34751446523](https://github.com/fettpl/rustcrushcourse/actions/runs/34751446523), wszystkie trzy zadania zakończone sukcesem.


## Uzupełnienie źródła A1 — 15 października 2026 r.

W kodzie dodano dwa kroki do istniejącej lekcji o `Send`: model pomocniczy
synchronicznego przygotowania i główny kontrakt `prepare_handoff`
(`async-lending/send-prepared-handoff-v1`). `Send` dołącza do odbiornika,
callbacku i adaptera `dyn` jako pojęcie z dwiema autorskimi rodzinami zadań
głównych. Anulowanie i zatwierdzanie zmian oraz cztery pojęcia Miri mają nadal
po jednej rodzinie. Cztery pojęcia własności pozostają wstępnie potwierdzone.
Katalog z tego dnia obejmuje 48 modułów, 192 lekcje, 194 pojęcia, 1 271 kroków i
349 źródeł. Liczby opisują dostępność materiału, a ustalenie efektów nauki i
poziomu zawodowego wymaga odrębnych dowodów. Zaakceptowaną podstawą utrzymania
jest zwykły commit `main` `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`. Przed
zmianami koordynator potwierdził wszystkie jedenaście zadań CI na wynikowym
`main`. Weryfikacja kodu A1, przegląd i akceptacja wydania pozostają w toku.
[Plan kontynuacji i ustalone wymagania A1](superpowers/plans/2026-10-15-advanced-continuation.pl.md)
zachowują szerszy aktywny cel i granice dowodów historycznych.
