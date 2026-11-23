# Zaawansowana część kursu — stan źródeł z 15 października 2026 r.

[English](2026-10-15-advanced-continuation.md)

Przyjętą podstawą utrzymania jest zwykła główna `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`, drzewo `7638d5f7a07ca24907a15edec7ea7d3627496d18`. Koordynator
zweryfikował [główny bieg 38733773185](https://github.com/fettpl/rustcrushcourse/actions/runs/38733773185) próbę 1, a wszystkie jedenaście miejsc pracy zakończyło się sukcesem
przed rozpoczęciem realizacji. Niniejszy dokument publikuje niezależnie zweryfikowane
wymagania Astry i projekt zamroziony A1 (SHA256 `047025c8eac852c591b8afb3edee3ba3028b763a3fd6f100c833ba437a16006b`). A1 Źródło jest w fazie rozwoju;
jego połączone kontrole lokalne, przegląd dokładnej głowy, PR zwykłe połączenie i
wynikające z niego główne dowody pozostają odrębnymi bramami akceptacji. Nie A1
zastrzega się tożsamości zwolnienia.

Aktualny rejestr A1 posiada 48 modułów, 192 lekcji, 194 pojęć, 1,271 kroków i 349
źródeł. Dodatek dodaje tylko prediction/model i jedno podstawowe `prepare_handoff` zadanie wewnątrz istniejącej
lekcji Wyślij. Pierwotne pięć kroków, gate/blank rodziny i odzyskanie pozostaje bez zmian.
Cztery z dziewięciu skalibrowanych, zaawansowanych koncepcji mają obecnie dwie autorskie
rodziny podstawowe; cancellation/commit, a cztery koncepcje Miri pozostają jednorodzinne. Liczby te
określają dostępność, a nie wyniki uczenia się.

Poniższe wymagania i projekt zachowują swój zakres planowania związany ze źródłami.
Późniejsze kamienie milowe wymagają świeżych ograniczonych bram projektowych i uwolnień
po A1; nie ma tu późniejszej implementacji. Pilot ludzki, hosting i wykazany staż
zawodowy nie są autorskimi bramami rozwoju lub dostarczone wyniki.

## Cel i podstawa decyzji

Kontynuuj autorski kurs doświadczonego praktykującego średniego szczebla zmierzającego w
kierunku pracy na wyższym poziomie, zachowując pierwotną trasę początkującą.
Dostarczanie kolejnych ograniczonych, zweryfikowanych, przetestowanych i zwykle
połączonych kamieni milowych. Jest to szerszy cel, który został wznowiony: ukończony
punkt odniesienia z października plus PR65/66 nie zamyka go. Polski materiał do nauki;
angielskie raporty inżynieryjne i PRs. Ludzki pilot, hosting i wykazane osobiste
starszeństwo nie są bramami rozwoju. Ani zielone oprogramowanie, ani autentyczna
dostępność nie pozwalają na określenie kompetencji uczących się.

Jest to projektowanie zakresu architektonicznego z ograniczoną pierwszą cechą.
Brainstorming i pisanie-plany poinformowane rozkładu i przekazania; ten pakiet jest design/requirements
inwentaryzacja, nie wykonywalny kod wdrożenia. Rodzic posiada zezwolenie na egzekucję i
zwolnienie bram. Nie używano tu edytorów źródłowych, Git zmienia, instaluje, buduje,
runtime ani delegowanych implementatorów. Oryginalny przegląd Astra napisał tylko jego
artefakt prywatnego planowania; ten dokument repozytorium publikuje, że zamrożony zakres
z aktualnym source/release przypisanie powyżej.

## Stan źródeł i przypisanie zmian

Bezpośrednio sprawdzone drzewo robocze: `<maintainer-home>/.codex/worktrees/workspace-fallback-oct7/rustcrushcourse`. HEAD `a851055afd1caa8298e6763d6b306bd3ce00f579`; drzewo `7638d5f7a07ca24907a15edec7ea7d3627496d18`. To drzewo źródłowe
planowania zostało następnie przyjęte w ramach utrzymania PR67 jako główne zwykłe `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`;
koordynator potwierdził wszystkie jedenaście głównych kontroli przed wdrożeniem A1.
Kontrolowana konserwacja HEAD pozostaje jej pierwotnym przydziałem.

Odczyty bezpośrednie: oryginalne załączone krótkie; aktualne `docs/curriculum-audit-2026-10-10.md`; stosowny October6 przegląd;
`docs/advanced-curriculum.md` zakres docelowy; `docs/capstone-change-review.md`; `src/engine/course-route.ts`; `src/content/course.ts` plan działania; źródło kredytów async boundary/core/module/callback/fixture/compatibility; polityka
dowodowa w `src/engine/learning.ts`; skrypty pakietowe. Historyczna tabela audytu jest delegowanym wynikiem
audytu z ustalonym pierwotnym przydziałem, a nie moim niezależnym ponownym odczytem
wszystkich 192 organów lekcyjnych. Końcowe ostateczne pojednanie w dniu `<private-temp>/receipt-012/review-astra/40-final-finite-course-stage-reconciliation.md` dostarcza
kompletne dowody wydania, a nie nowe wykonanie przez tego recenzenta.

SHA256 w poddanym kontroli rozdrobnieniu:
- `docs/curriculum-audit-2026-10-10.md`: `87f94211793f57f5eab88a507091fc9d3d13ba837f32f2aa98a36f21392d0498`
- `src/content/async-lending-boundaries.ts`: `019aba80d2d31a602a1ab70fbd5ed89967c7000dfbde08361e97e4ce4ab7d970`
- `src/content/async-lending-module.ts`: `42d43e5b0c7304daa331545fc91c98eb2741a6036db71e9e2b6102c7562b6764`
- `src/engine/learning.ts`: `7428d5193e7de19f0b7f0533c83a2d7095b8be24accb86f5a9fadacf0a23802b`

Spis początkowy z końcowego raportu skończonego: 48 modułów, 192 lekcji, 194 pojęć, 1269
kroków, 349 źródeł. Liczby te opisują dostępność. Core17 posiada 73 lekcje; Mini grep i support/thread
łańcuch daje 92 zalecane lekcje przed Study Session CLI. Nie należy zmieniać wszystkich rozszerzeń w
obowiązkowe warunki wstępne dla początkujących.

## Wykaz szerszych wymagań

Stan oznacza authored/software pokrycie, nigdy nie zaobserwowano sukcesu uczącego się. Pokryte oznacza
istnienie określonego wymogu ograniczonego; częściowy oznacza, że pozostały konkretne
dowody lub wymiar przeniesienia. Zaginiony dotyczy podanego artefaktu, a nie całego
tematu. Zawarte w mapie cele historyczne oczekujące na rozpatrzenie stwierdzenia muszą
być zgodne z późniejszymi źródłami, a nie powtarzane jako obecne wady.

| Wymóg | Obecny status i dowody | Pozostała zgoda na rozwój |
| --- | --- | --- |
| Początkowy do zaawansowanego kręgosłup wstępny | Pokryte trasy początkujących i odkrycie rozszerzenia tematycznego, `course-route.ts`; zaawansowane moduły mają warunki wstępne | Częściowo zaawansowana nawigacja: publikować uporządkowane kamienie milowe i warunki wstępne bez traktowania grup tematycznych lub porządku rekomendacji jako gotowości |
| Zwyczajne ownership/borrowing/error/iterator płynność | Pokryte autorskie fundacje i naprawy październik baseline/composition/docs | Cztery skalibrowane pojęcia własności pozostają tymczasowe. Naprawa ma jedną rodzinę; stack/heap, scope/drop, Kopia ma zero rodzin kodujących. Wybierz ważne, obserwowalne kontrakty; nie przywracaj śladów jako dowodu kodowego |
| Generics/traits/lifetimes/HRTB/GAT/dyn | Istniejące znaczne oddziały i przeniesienie dwóch rodzin callback/receiver/dyn | Częściowe decyzje dotyczące architektury międzyprojektowej: porównanie podejścia ogólnego i dyn, kosztów, ograniczeń życiowych i konsekwencji zmian w artefakcie będącym własnością uczących się |
| Async tasks/cancellation/backpressure/shutdown | Rozległe rzeczywiste Tokio/service pakiety i ograniczone modele przeglądarki | Cancellation/commit i wysłać zachować jedną rodzinę podstawową każdy. Zamknąć tych z prawdziwie odrębnymi umowami i runtime/compiler świadkami |
| Threads/Send/Sync/atomics/order/Loom | Istniejące wątki i laboratorium pętli | Podsumowanie musi wymagać invariant/order uzasadnienia i ograniczonego niekorzystnego wykonania, wyraźnie oddzielającego stres, badanie modelu i dowód |
| Niebezpieczne initialization/lifetimes/disjointness/drop/variance | Istniejące FFI, Miri, pożyczone źródło pamięci i natywne pakiety | Cztery skalibrowane koncepcje Miri pozostają jednorodzinne. Niezależny od dostaw transfer zorientowany na niezmienność z klientów kompilacyjnych ujemnych lub diagnostyka Miri odpowiednie dla każdego; brak uniwersalnego roszczenia o solidność |
| Publiczny API/SemVer/errors/workspaces/features/MSRV | Istniejący API klient, matryca wydania, błędy wpisane i cykl życia zależności | Niezależne ćwiczenia inżynieryjne z zakresu zmienionych klientów i uzasadnienie publiczne contract/error/rustdoc/release; klasyfikacja tylko tej samej ograniczonej zasady jest niewystarczająca |
| Makros jako publiczny APIs | Istniejące exactly-once/grammar/hygiene/Rust2024 osprzęt konsumencki | Zakryty ograniczony zakres objęty deklaracją makroekonomiczną; utrzymanie regresji klienta niższego szczebla i nieobsługiwanego dokumentu grammar/expansion. Ekosystem Proc-makro nie jest automatycznie brakującym wymogiem |
| Dostawy chain/security/trust granice | Istniejące migawki dotyczące zapewnienia zależności i umowy capstone/service | Częściowe pochodzenie artefaktu i synteza modelu zagrożenia. Infrastruktura na żywo advisory/publishing pozostaje wyraźnie oddzielona; autorzy odtwarzają lokalne dossier i failure/expiry sprawy przed jakąkolwiek operacją zewnętrzną |
| Property/fuzz/Miri/Loom wybór | Istniejące praktyczne narzędzia i niezależne wyrocznie | Częściowy wybór ryzyka przekrojowego: uczeń musi wybrać narzędzie, zbudować counterexample/replay i wyjaśnić ograniczenia; pakiety runtime muszą wspierać reklamowane ćwiczenie lokalne |
| Benchmark/profile/allocation | Istniejące rzeczywiste profiler/allocation pakiety i modele | Częściowo niezależne badanie dotyczące obciążenia pracą: hipoteza, porównywalny pomiar, utrzymane niepowodzenie i uzasadniona decyzja. Powtarzanie klasyfikatora przeglądarki nie obsługuje profilera |
| Architecture/observability/operations | Operacje serwisowe plus trwałe capstone i publiczne K-change arkusz roboczy | Częściowo otwarty zintegrowany cykl życia utrzymania: ADR alternatywy, granice błędów, ograniczone przyjęcie, korelacja, Runbook i fault/recovery wiertło; samoocena i obserwowany zewnętrzny przegląd pobyt oddzielny |
| Przegląd kodów i odpowiedź | Arkusz roboczy K-change i uzasadnienie dotyczące tańców | Częściowa dwuetapowa praktyka przeglądowa: autorskie alternatywne łaty kontrolne, uwagi oparte na umowie, response/disposition i dowody regresji; rzeczywiste ludzkie przeglądy nie są obowiązkowe w odniesieniu do materiałów oryginalnych |
| Otwarta synteza portfela | Sesja studyjna i zaawansowana usługa dziennika Trwała istnieje | Częściowo zaawansowane kompletne pakiety łączące API ewolucję, ograniczony cykl życia, bezpieczeństwo, wydajność i zmiany incydentów bez przepisywania typów wewnętrznych. Publiczne działania następcze nigdy nie mogą być nazywane gwarancjami niezauważonymi |
| Zgodność i rzetelne dowody | Istniejące prognozy historyczne, surowe assistance/history, polityka rodzinna w wersji przekształconej | Każdy kamień milowy zachowuje wszystkie stare, zakwalifikowane do lekcji kroki indices/IDs, surowe dowody i zachowane lokalizacje; brak retroaktywnych kredytów pierwotnych lub nadmuchiwane ukończenie |

W niniejszym spisie zachowane są wszystkie rzędy zakresu seniorów `docs/advanced-curriculum.md` (API, Ładunek,
abstrakcje, iteratory, inteligentne punkty, konkubina, async, projektowanie błędów,
narzędzia testowe, wydajność, unsafe/FFI, architecture/observability, security/operations, przegląd). Nie jest obietnicą dodawania
każdej możliwej specjalizacji Rust. Zakończenie wymaga rozwiązania każdego z
wymienionych częściowych zadań poprzez własne wyniki lub jednoznaczną decyzję w sprawie
zakresu, a nie tylko dodawanie nagłówków.

## Kolejność etapów

Każdy wiersz jest oddzielnym przeglądem PR, z pełną lokalną kontrolą, dokładną oceną
głowy, zwykłym połączeniem i jedenastoma głównymi kontrolami przed rozpoczęciem kolejnej
funkcji źródłowej. Większe rzędy muszą się rozdzielić, gdy konstrukcja betonu przekracza
jedną ograniczoną umowę.

1. **A1 Wyślij zawieszenie i przekazanie własności** (szczegółowo poniżej): zamknąć jedną z możliwych do wykazania zaawansowanej
   skalibrowanej szczeliny.
2. **A2 Anulowanie retry/commit transfer**: nowa jednostka podlegająca testowi z rzeczywistymi oczekiwaniami, niepowodzeniem
   wywołania i trwałymi efektami przed odwołaniem; porównanie potwierdzonego postępu z
   próbami pracy. Musi się znacznie różnić od bieżącej Cursor/EffectFuture i partii callback, nie tylko
   zmienić ich nazwę. Przejrzyj macierz różnicy umownej przed kodowaniem.
3. **A3/A4 Niebezpieczne pary transferowe**: najpierw inicjalizowany widok pożyczony + regiony rozdzielone, następnie MaybeUninit ownership/drop
   stan + wariancja mutacyjna. Para tylko wtedy, gdy rodzima fixtures/ownership pozostaje niezależna; w
   przeciwnym razie cztery PRs. Zachować istniejące niebezpieczne granice wsparcia i
   wykorzystać faktycznych native/Miri świadków.
4. **A5 Pojednanie dowodów pochodzenia**: niezależna rodzina remontów własności, następnie ważna scope/drop i Kopiuj umowy
   zachowania. Stack/heap Wiedza koncepcyjna może wymagać celowo zrewidowanego przyszłego
   projektu dowodów; nie przyznaje się kredytu z rodziny kodowej na fizyczne
   przypuszczenia dotyczące układu. Nie jest to powód, aby opóźniać wszystkie
   zaawansowane prace lub osłabić światowy próg.
5. **A6 Synteza utrzymania biblioteki**: zmiana klienta niższego szczebla z obowiązkiem publicznym error/API/feature/MSRV, dokumentacją,
   makro granicą, w stosownych przypadkach, ADR oraz dokumentacją wydania. Użyj
   istniejącego Frame Protocol; nie jest wymagana publikacja rejestru.
6. **A7 Badanie skuteczności i strategii testów**: zmiana obciążenia pracą nad istniejącym projektem, niezależna hipoteza i wybór
   narzędzi, rzeczywiste ograniczenie measurements/counterexample/replay, decyzja w sprawie porównania i regresji. Nie
   powielać skończonych klasyfikacji.
7. **A8 Service/operations synteza podtrzymująca**: rozszerzenie istniejącego otwartego pakietu capstone o zmianę opartą na umowie
   plus diagnosis/recovery ćwiczenia wiążące wstęp, anulowanie, trwały stan, obserwowalność i granice
   zaufania. Zachować swobodę architektury i własne testy. A1/A2 i A6/A7 nakarm to.
8. **A9 Ostateczne zaawansowane pojednanie**: wszystkie wiersze docelowe odwzorowane na aktualnych oryginalnych artefaktach;
   możliwa do odkrycia zalecana zaawansowana trasa; testy warunkowe i pokrycia; aktualne
   migawki weryfikacji związane ze źródłami i wyraźne ograniczenia external/learning. Reaudit każdy
   rząd zamiast oznaczyć wszystkie zielone, ponieważ CI przeszedł.

A6 A8 wymagają świeżego, ograniczonego projektu w stosunku do ówczesnego źródła; są
one zamówionymi wymaganiami, a nie pozwoleniem na wynalezienie niesprawdzonego APIs
teraz. Pilot, rozmieszczenie, operacje bezpieczeństwa na żywo, uczący się employment/seniority i
powszechna poprawność pozostają poza zamknięciem projektu.

## Alternatywy i wybór

Dodanie innego zaawansowanego modułu zwiększyłoby zakres, w przypadku gdy audyt już
znajduje istotne pokrycie. Rozwijanie najpierw otwartego kamienia jest cenne, ale
komponuje znane słabe kalibracji i opóźnia czystą, niezależnie weryfikowalną poprawę.
Uzupełnienie wszystkich pojęciowych etykiet własnościowych w pierwszej kolejności
stwarza ryzyko wytworzenia nieodpowiedniego dowodu wykonalnego dla stack/heap. Select A1:
bezpośredniej, wąskiej zaawansowanej luki z silnym kompilatorem i obserwacji runtime, a
następnie stopniowo integruje.

## Zakres projektu A1 — przygotowanie lokalne a stan zawieszonego zadania

**Cel.** Uczestnik oddziela lokalny kontekst przygotowania, który nie spełnia Send, od future z Send+'static. Przewiduje, co pozostaje przed zawieszeniem i podczas niego, oraz wykazuje, że przekazanie własnych danych działa po porzuceniu lokalnego kontekstu.

**Wymagania wstępne.** Istniejąca lekcja o granicy Send, pożyczanie w funkcjach zwrotnych, Future/Pending, własność i uruchamianie zadań. Nowe zadanie jest dopisane do `async-lending-send-boundary`. Nie powstaje moduł, pojęcie, lekcja ani wymaganie ścieżki podstawowej. Zachowaj dotychczasowe pierwsze kroki lekcji. Dodaj krótkie przewidywanie z modelem i jedno niezależne zadanie transferu, z opcjonalnym zakończeniem sesji, jeśli lekcja się wydłuży. Dotychczasowe 18 minut pozostaje wstępnym szacunkiem.

**Domena.** Lokalny formater przekształca pożyczone rekordy wejściowe w posiadane wiersze raportu, zanim pracownik zacznie czekać na pozwolenie wysłania. Formater może przechwycić `Rc<RefCell<_>>`, lokalne referencje i rejestr wywołań. Granicę zadania przekracza wyłącznie wynik przekazany na własność i future oczekiwania spełniający Send.

**Publiczny kontrakt wykonywalny.**

```rust
pub fn prepare_handoff<F, P>(records: &[String], format: F, pause: P)
    -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<String>> + Send + 'static>>
where
    F: FnMut(&str) -> String,
    P: std::future::Future<Output = ()> + Send + 'static;
```

Wywołanie `prepare_handoff` synchronicznie wywołuje `format` dokładnie raz dla każdego rekordu w kolejności i zachowuje bez zmian zwrócone posiadane łańcuchy, w tym Unicode, puste wartości i duplikaty. Puste rekordy nie wywołują funkcji zwrotnej, ale wynikowy future nadal respektuje pause. Dla pustego wejścia pause w stanie Pending trzyma wynik w Pending. Dopiero Ready daje pusty wektor. Funkcja zwraca posiadany future w Box. Jego poll wywołuje poll przekazanego `pause`. Dopóki pause jest Pending, wynik pozostaje Pending. Po Ready zwraca przygotowane wiersze w kolejności. Kolejne wywołania poll podczas Pending ani osiągnięcie Ready nie powtarzają formatowania. Wywołujący może porzucić wejście i to, co przechwycił formater, przed poll lub spawn. Porzucenie future przed pierwszym poll lub podczas Pending odrzuca posiadane wyniki, ale pozostawia już wykonane skutki formatowania. Ponowne wywołanie poll po Ready jest poza kontraktem. Box i posiadane łańcuchy mają jawny koszt alokacji.

Sygnatura nie wymaga F: Send, F: 'static ani records: 'static. Box pokazuje jawną granicę dynamicznej alokacji i pozostawia składnię niejawnego przechwytywania Rust2024 poza celem ćwiczenia. Poprawne reprezentacje mogą używać pętli, map/collect, pomocniczej struktury stanu lub bloku async. Testy oceniają kontrakt bez narzucania pisowni kodu referencyjnego.

**Odrębna rodzina.** Istniejące `owned_report(Vec<u8>)` natychmiast zwraca posiadany raport i sprawdza ograniczenie. Nowy kontrakt sprawdza moment synchronicznego wywołania, brak danych pożyczonych i przechwyceń niespełniających Send w przechowywanym stanie future, zachowanie przekształconego wyniku w rzeczywistym Pending oraz użycie po zniknięciu właścicieli. Sama zmiana nazw wejścia lub wyniku owned_report nie spełnia tych warunków. Testy i dowody natywne należą do jednej nowej rodziny.

Proponowana rodzina `async-lending/send-prepared-handoff-v1` przypisuje dowody w wersji 2 wyłącznie do pojęcia `async-lending-send-boundary`. Zadanie polega na implementacji określonego publicznego API, dlatego nie stanowi dowodu otwartego projektu od pustego edytora. Stare zadanie zaliczeniowe i wariant od pustego edytora pozostają jedną rodziną. Powtórka jest odrębna i nie stanowi drugiego zadania głównego. Ukończenie modułu nadal wymaga jednego niezależnego kontraktu na kryterium, a potwierdzenie pojęcia dwóch samodzielnych kwalifikujących się rodzin. Zaktualizuj końcowy tekst o czterech pojęciach async z dwiema rodzinami i o pojedynczej rodzinie anulowania, bez przypisywania uczestnikowi zaliczenia.

**Przebieg nauki.** Przewidź, czy skutek funkcji zwrotnej następuje przy tworzeniu czy pierwszym poll. Porównaj blok async zatrzymujący F z synchronicznym przygotowaniem poza blokiem. Wyjaśnij, że async move nie nadaje Rc właściwości Send, Send nie oznacza 'static, a zakończony lokalny zakres nie musi wejść do stanu zawieszonego. Zaimplementuj przekazanie i sprawdź Pending, porzucenie i posiadany wynik. Przeczytaj prawdziwe komunikaty kompilatora i zachowaj istniejącą odroczoną powtórkę. Moment wykonania przygotowania jest jawną decyzją projektową.

## Macierz oceny A1

1. Przypadek poprawny: pożyczone wejście i formater przechwytujący lokalny Rc<RefCell<Vec<String>>>. Rejestr wywołań po utworzeniu zawiera wszystkie wejścia w kolejności. Porzuć wejście i zakres będący właścicielem funkcji zwrotnej. Future nadal spełnia Send+'static i daje posiadany wynik.
2. Przypadek poprawny: przechwycenie formatera bez Clone i rzeczywiście !Unpin oraz nieklonowalny future oczekiwania. Nie narzucaj zbędnych Clone/Copy/Debug/Unpin. Future oczekiwania może bezpiecznie zawierać PhantomPinned i współdzielony stan obserwacji. Poll czyta przez Pin<&mut Self> bez przenoszenia przypiętych pól i aktualizuje jedynie stan współdzielony lub o wewnętrznej mutowalności. Sprawdź kompilację klienta i rozwiązania na dokładnym 1.85 i wybranej bieżącej wersji stabilnej. Nazwany wariant ręcznego Future musi bezpiecznie przypiąć P, przykładowo Pin<Box<P>>, bez wymagania P: Unpin.
3. Przypadek poprawny: zero, jeden, wiele rekordów, duplikaty, puste łańcuchy i Unicode. Dwa niezależne wywołania nie współdzielą stanu.
4. Przypadek poprawny: kontrolowany future oczekiwania zwraca Pending dwukrotnie i rejestruje bieżący waker. Liczba wywołań formatera jest stała. Po zezwoleniu i przebudzeniu przyszłość zwraca dokładny wynik Ready. Test nie opiera się na opóźnieniach ani nieograniczonej pętli poll.
5. Przypadek poprawny: porzucenie przed poll i w Pending zachowuje skutki formatowania i nie zgłasza wyniku. Granicą testu jest pamięć lokalna, poza kontraktem wycofania zewnętrznych skutków.
6. Kompilujące się błędy zachowania przy pełnym publicznym API: podwójne wywołanie przy tworzeniu, przetworzenie tylko pierwszego rekordu, odwrócenie kolejności, natychmiastowe Ready bez pause, pominięcie pause tylko dla pustych danych, pusty wynik lub wejściowe łańcuchy w miejsce wyniku formatowania. Każdy wariant zachowuje dokładne generyczne API i kompiluje się z pełnym zestawem ukrytych testów, także odbiorcami non-Send F i !Unpin P. Każdy oblewa odpowiednią asercję. Przekroczenie limitu czasu i błąd kompilacji nie świadczą o błędzie zachowania. Nazwany test dla pustego wejścia w Pending odrzuca wariant pomijający pause tylko przy pustym wejściu.
7. Pary granic kompilacji: zachowanie lub odłożone użycie dowolnego generycznego F w zwracanym future spełniającym Send odpada, bo zadeklarowane ograniczenie F nie zapewnia Send ani static. Konkretny formater z Rc utrzymany przez await odpada jako !Send, a przechwycona lokalna pożyczka wejścia lub funkcji zwrotnej odpada na granicy czasu życia. Odpowiednie poprawione programy przechodzą. Sprawdź diagnostykę dla autorskiego miejsca błędu według klasy, bez porównywania pełnego tekstu.
8. Natywne Tokio: skorzystaj z istniejącego przypiętego przypadku i runtime. Porzuć lokalne wejście i przechwycenia przed spawn. Uruchom zwrócony future w rzeczywistym utrzymywanym runtime i zapewnij kontrolowane Pending przez oneshot. Wykaż brak zakończenia przed zwolnieniem bez wyścigu zegarowego, zwolnij i dołącz dokładny wynik. Test ograniczeń kompilatora w przeglądarce z samym std nie potwierdza zachowania Tokio.
9. Znaczenie dowodów: samodzielne stare i nowe zadanie dają dwie rodziny, stare z pomocą i nowe samodzielne dają jedną. Późniejsza próba siostrzana lub ponowienie nie usuwa wcześniejszego ujawnienia. Odtworzenia i aliasy wersji oraz odwołań są deduplikowane. Powtórka nie daje głównego zaliczenia. Dostępność nowej samodzielnej próby i wyczerpanie możliwości odpowiadają rzeczywistemu stanowi.

## Odpowiedzialność za pliki i przekazanie weryfikacji

Deweloper treści posiada nowy `src/content/async-lending-send-transfer.ts` o całkowitej grubości nie większej niż 0,05 mm, solutions/contract/alternates/mutants/boundaries i
wywożone etapy; przewody dołączają się do `async-lending-boundaries.ts` oraz criterion/exit Kopiuj `async-lending-module.ts`. Użyj istniejącego callback/dyn
organizacja transferu, unikając dużych duplikowanych plików granicznych.

Wdrażający ocenę może posiadać nowe `async-lending-send-transfer.test.ts` i `async-lending-send-transfer-boundaries.test.ts`, korzystając z istniejącego wsparcia dla
rodzimych testów i rozszerzyć fixtures/verifier tylko po ustaleniu umów o wywóz treści. Jeden
właściciel integracji posiada wspólne rejestry, istniejące zagregowane oczekiwania,
historyczne testy projekcyjne, specyfikacje przeglądarki i dokumentację. Prace
równoległe są odpowiednie dopiero po zamrożeniu interfejsów; cała implementacja musi
wykorzystywać wymagane przez użytkownika model/effort przekazywane przez rodzica.

Ponowne użycie utrzymywało się `scripts/verify-async-lending.ts` / zaufanego autorskiego utworu projektu dla
prawdziwego dowodu Tokio; najpierw sprawdź jego bieżącą extraction/source wiążącą. Nie dodawaj
zależności sieciowych, arbitralnej realizacji źródłowej, nowego dostawcy lub poluzować
ograniczeń mocowania. Odpowiednie dokumenty źródłowe i zainstalowane Następny przewodnik
musi być przeczytany przed jakąkolwiek zmianą kodu ramowego; nie wymaga się zmiany
projektu UI.

Myślenie niezmienne pre- A1 tożsamości z lekcjami i zapisanego stanu przed edycją.
Dodać wyraźną historyczną projekcję usuwającą jedynie deklarowane dodatki; nie
regenerować starych osprzętu lub szeroko filtrować nieznane kroki aż stare testy
przejść. Zachować wszystkie V1/V2/V3 zdarzeń surowych order/time/help, reviews/ratings, drafts/attempts, ukończyć, notes/bookmarks, lesson/step/panel i
ustawienia trasy na import/reload. Kompatybilność źródła tylko przystawek jest konieczna, ale nie
wystarczy: wykonać dokładne stare saved-location/browser przypadków i nowe zadanie persistence/reveal przypadków,
klawiatura i układ 390px, offline ogrzewany przepływ zasobów. Historyczna ukończona
lekcja pozostaje historycznym zakończeniem, a nie nowym A1 karnetem.

Wymagane kontrole lokalne: lint, typecheck, full unit suite, walidacja treści, autorski
Rust, audyt rejestru źródłowego, budowa, w pełni utrzymywana przeglądarka produkcyjna i
apartamenty offline. Wykonaj nowe positives/mutants/compiler pary na rzeczywistej wybranej stabilnej i
dokładnej Rust 1.85; napisz toolchain/source hashs i odróżnić zainstalowany alias od wybranego
bieżącej stabilności. Uruchom utrzymywane tryby weryfikatora async z dokładnym wsparciem
komendy potwierdzonym ze skryptu. Rodzic koordynuje wszelkie pełne dodatkowe zadania
rodzimej CI w zwykłej bramie wszystkich jedenastu. Nie wymyślaj tu egzekucji.

Niezależny przegląd musi skontrolować obietnicę publiczną w porównaniu z każdym ukrytym
testem, alternatywne ważne implementacje, rzeczywiste Oczekiwanie, zamierzone miejsca
diagnostyczne, natywny Tokio versus przypisanie przeglądarki, różnica rodziny, Semantyka
pomocy i kompatybilność. Każda porażka otwiera akceptację. Commit + English PR +
current exact-head reviews + all jedenaście PR checks + ordinary merge + all jedenaście
głównych kontroli zamyka się tylko A1, a nie ten szerszy cel.

## Kryteria ukończenia całego celu

Wszystkie rzędy inwentaryzacji posiadają aktualne kotwice źródłowe, wyraźne cele i
ścieżkę wstępną; merytoryczne theory/action/verification/transfer i przyłączenie do projektu; niezależne rodziny
twierdziły, że tylko w przypadku gdy umowy są różne; odpowiednie compiler/native/tool dowody; otwarty
projekt i zmienione wymogi artefakty tam, gdzie jest to wymagane; brak konieczności pilot/hosting
lub fałszywe obserwowane uczenie się. Każdy wdrożony kamień milowy posiada pełne lokalne
dowody, zweryfikowane dokładne źródło, zwykłe wydanie i główne CI. Ostateczny
niezależny audyt źródłowy godzi całą zaawansowaną mapę i identyfikuje pozostałe limity
external/empirical. Pokrycie pozycji, liczby surowe, kliknięcia wykończeniowe, zadania publiczne
oznaczone jako niewidoczne i bardziej ekologiczne opanowanie nie może tego zaspokoić
DoD.

## Uzupełnienie integracji i wydania A1

Uaktualnienie informacji o rodzicach: PR67 zwykle połączone jako `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`, to samo drzewo `7638d5f7a07ca24907a15edec7ea7d3627496d18`.
W czasie planowania tego addendum główny bieg `38733773185` był w toku. Następnie koordynator
potwierdził wszystkie jedenaście miejsc pracy, które odniosły sukces przed wdrożeniem,
jak odnotowano powyżej. Jest to przypisywany dowód rodzica, a nie moja niezależna GitHub
weryfikacja.

Dokładne informacje o nowych zadaniach (wszystko w ramach istniejącej lekcji `async-lending-send-boundary`):
- Uzupełniający etap załączony `async-lending-send-boundary-handoff-model`: `kind: predict`, `evidenceKind: prediction`, wersja 2, dokładny conceptIds `["async-lending-send-boundary"]`Nie.
  codingTaskIdNie. evidenceGate. Jej informacje zwrotne obejmują przygotowanie synchroniczne a
  kontrast w stanie zawieszenia; brak samooceny prozy przyznaje kredyt pierwotny.
- Dołączony etap pierwotny `async-lending-send-boundary-prepared-handoff`: `kind: apply`, `evidenceKind: transfer`, `evidenceGate: true`, `evaluator.kind: tests`, wersja 2, dokładny conceptIds `["async-lending-send-boundary"]`, codingTaskId `async-lending/send-prepared-handoff-v1`.
  Tylko jeden krok; nie dodawać nowego ślepego pseudonimu tylko do nadmuchiwania liczb.
- Istniejące podstawowe refs `async-lending-send-boundary/async-lending-send-boundary-gate` i `/async-lending-send-boundary-blank` pozostają nietknięte, dzieląc się `async-lending/send-boundary-v1`.
- Istniejące dodatkowe przewidywania, wyjaśnienia i odwołania pozostają na miejscu bez
  zmian tożsamości. Zarejestrowana wersja wykonywalna `async-lending-send-boundary-review`, przegląd w kształcie rodziny
  ID `review/async-lending-send-boundary-review-v1`, pozostaje wyłącznie do odzyskania i nie zalicza się jako pierwotny. Jej `ready(...).await`
  nie uważa się za rzeczywiste zawieszenie.
- Dodaj nowy podstawowy taskRef do istniejącego kryterium `async-lending-send-boundary-contract`, zachowanie `requiredIndependentCodingTasks: 1`; zachować
  ocenę ID, less IDs, concept version 2 and concept minimumCodingTasks 2.

Krytyczny szczegół integracji znajdujący się w źródle: dolna pętla w `async-lending-boundaries.ts` nadpisuje
dowody każdego kroku, z wyjątkiem istniejącego transferu dyn. Rozszerzenie tego
dokładnego wyraźnego mechanizmu konserwacji na nowy etap transferu; w przeciwnym razie
prawidłowe metadane rodzinne są po cichu tracone. Model uzupełniający może wykorzystywać
zwykłe przyporządkowanie nierodzinne. Wprowadź w pełni zmontowany rejestr kursów, a nie
tylko wywożony etap mocowania.

Brak zwrotów, anulowanie, własność lub koncepcja dyn otrzymuje kredyt podstawowy z
przypadkowego zachowania w tym zadaniu. Przewidywania i wyjaśnienia na własny temat
pozostają uzupełniające. Opóźnione kwalifikowanie pozostaje ściśle ustalone **więcej niż 24 godziny** po
ostatnim poprzedzającym odnośnym contact/rating, z dwoma kwalifikowalnymi, czystymi rodzinami
podstawowymi zarobionymi przed odwołaniem. Żaden opóźniony próg, wybór kolejki lub
globalna zmiana polityki nie są dozwolone przez A1.

Pozytywna macierz reprezentacyjna musi obejmować: a) synchroniczny preparat do pętli,
następnie zapakowany async future, b) synchroniczny zbiór iteratorów, a następnie boxed
async future, c) nazwany własnością państwa z manualną delegacją Future, aby zatrzymać.
Nie należy wymagać stosowania Rc; Rc jest świadkiem po stronie konsumenta, który
zakazuje zbyt rygorystycznych granic F. Negatywne, które zachowuje Rc-bearing callback w
całym zawieszeniu jest skompilowanym świadkiem. Odroczenie arbitralnego generalnego F
jest również awarią kompilacyjną w ramach dokładnego porządku publicznego API; przy
użyciu polecenia Wyślij oddzwonienie na jednej stronie wywołania nie może sprawić, że
jego ogólny organ funkcyjny będzie ważny. Wzmocnienie F do wysyłania + statyczne zmienia
kontrakt i nie obsługuje uprząż non-Send-client w czasie kompilacji. Nie jest również
kompilujące pełne API odrzucenie behawioralne. Niebezpieczne wymazywanie nie jest
dozwolone. Oddzielnie zawężony termin Wyślij tylko porównawczy ustaliłby tylko swój
własny ograniczony kontrakt i jest niepotrzebny do tego celu.

Synchronizacja w Tokio polega na wysłaniu sygnału z przekazanego mechanizmu pauzy przy pierwszym wywołaniu `poll`, a następnie na oczekiwaniu na zezwolenie z osobnego kanału oneshot. W teście zaczekaj na sygnał z `poll`, sprawdź `JoinHandle::is_finished() == false`, potem zezwól na dalsze wykonanie i poczekaj na wynik zadania. Taka bariera gwarantuje właściwą kolejność obserwacji bez polegania na `yield_now()` ani opóźnieniach. Przypadek testowy korzysta z istniejącego, zaufanego środowiska wykonawczego. Wybór wątku przez planistę nie należy do kontraktu, więc test pomija identyfikator konkretnego wątku roboczego.

## Rozstrzygnięcia przeglądu projektu przed wdrożeniem

Rodzic zidentyfikował generyczny organ Wyślij problem po przeglądzie pierwszego pakietu.
Powyższa macierz oceny jest poprawiona: wcześniejszy hash `ee8c2fd8cf1f303382b6f7fae4367f1b38f28cf0fb82f45fae33fb8f3948c51b` nieprawidłowo zasugerował
a Send consumer alone compion forecated-F generyczny mutant. Twierdzenie to zostało
wycofane, a nie traktowane jako potwierdzone zachowanie. Przyjęty plan wymaga pełnej
uprząży kompilującej konstrukcyjnie-czasowo semantyczne mutanty i oddzielnie oznaczonych
świadków na granicy kompilatora. Dla tej korekty nie wykonano żadnego kodu ani testów.

Oryginalna!Unpin/non-Clone pauza i konsumenci spoza klonu F są obowiązkowymi świadkami pozytywnymi.
Zarówno niepuste jak i puste rozmowy muszą być przestrzegane w oczekiwaniu przed
zwolnieniem. Zero wejścia tłumi formatowanie, nie pauzę. Te dwa załączone kroki prowadzą
do siedmiu istniejących pięciu kroków; nie planuje się zmiany liczby lekcji. W tym
punkcie kontrolnym poprzedzającym wdrożenie 9/11; koordynator zamknął następnie bramę ze
wszystkimi jedenastoma sukcesami przed edycją produktu. Notatka dla wykonawcy: bieżący
Node22 ścieżka jest `/opt/homebrew/opt/node@22/bin` (22.23.3 _ 3); usunięta stara piwnica `_2` ścieżka nie może być używana,
i wcześniej Node26 przed lotem pozostaje oddzielnie przypisany.

## Ostateczne warunki przekazania źródeł i udokumentowane kontrole wstępne

Zaufany profil Tokio 1.53.1 umożliwia `rt`, a nie `rt-multi-thread`. Należy wykorzystać istniejący czas
biegania z bieżącą nicią dla rzeczywistego świadka `tokio::spawn` i bariery poll-signal/permission. Tokio spawn nadal
nakłada na ten runtime prawdziwy wymóg Wyślij + statyczny API. Ani przechodzenie przez
to związane, ani bieganie na aktualnym wykonawcy wątku nie świadczy o migracji do innego
pracownika; nie rościć worker/thread-ID roszczeń i nie dodawać funkcji runtime tylko do tego
ćwiczenia.

Nowe zadanie przekazania poprzedza późniejszą lekcję dyn-adaptera. Jego dodatkowy model
musi zatem wyjaśnić dostarczony owijacz lokalnie: Box jest właścicielem gotowej
przyszłości; dyn Future jest usuniętym interfejsem z deklarowanym wyjścia; Pin zapobiega
przesuwaniu przymocowanej wartości przyszłości przez ten uchwyt i pozwala bezpiecznie
sondować! Odblokuj pauzę, gdy odpowiednio przypięte; Wyślij i statyczny opis zachowany
stan zadania, a nie magiczne konwersji Rc. Rozróżniające przesuwanie uchwytu bocznego od
przesuwania jego przygniecionego pointee. Koszty państwowe boxing/dispatch/allocation nie wymagają od osób
uczących się uzyskania abstrakcji dyn lub master nieprzezroczysta składnia
wychwytywania. Dostarczony podpis to rusztowanie dla celu ownership/suspension. Nie ma żadnych warunków na
lekcji późniejszej dyn i nie wprowadza się żadnych warunków.

Rzeczywisty techniczny wstępny lot jest przekazywany Sol dowody, teraz czytane
bezpośrednio w `<private-temp>/receipt-011/sol-preflight/generic-send-probe/report.md`; surowe hashes/commands/diagnostics są w rodzeństwie `summary.json` i compiler/variant foldery. Zarówno wybrany
bieżący Rust 1.99.0, jak i dokładny Rust 1.85.0 produkował dziesięć rekordów kompilacyjnych
ogółem oraz cztery udane wykonanie bliźniacze ogółem. Dokładnie- API odroczenie F nie
powiodło się nawet z konsumentem wysyłającym; wzmocnienie F do wysyłania + statyczny
przyznaje odbiorcę wysyłającego, ale wyklucza wymaganych Rc/local-borrow konsumentów; dokładne
przygotowanie synchroniczne następuje po zniszczeniu lokalnego właściciela. Potwierdza
to poprawiony API projekt wykonalności, a nie pełną przyszłą cechę.

Ogólna awaria odroczonego F ma **brak diagnostycznego kodu E** na każdym kompilatorze. Jego główne return-box/async span donosi,
że przyszłość stworzona przez blok async nie jest Wysyłanie. Dopasuj diagnostykę class/message
plus planowany pierwotny autorzy-źródła zakresu; nie wymagają tam E0277. E0277 ma
zastosowanie do wzmocnionej sprawy Rc-client; pożyczony lokalny klient posiada E0373/E0505.
Przelot wykorzystuje gotowy (()), aby wyodrębnić ogólną wykonalność, tak więc nie
dostarcza on żadnych prawdziwych oczekujących lub Tokio Runtime dowodów. Wymagane
kontrole końcowe native/compiler/browser/compatibility/full-release pozostają bez zmian.

To ostateczne przekazanie obejmuje delegowaną decyzję w sprawie autoryzowanego projektu;
nie wymaga kolejnego pytania dotyczącego zatwierdzenia przez człowieka. Koordynator
potwierdził następnie główną bramę do wydania przed wdrożeniem źródła produktu; A1
akceptacja wydania pozostaje odrębna. Ten recenzent edytował tylko prywatne artefakty.
