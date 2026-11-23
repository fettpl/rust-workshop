# A11 v4 — nauka autoryzacji typowanej i powiązanej z konkretnym żądaniem w Rust

[English](002-typed-authorization.md)

Stan: ukończone lokalnie 4 listopada 2026 r. Zaakceptowane wdrożenie to commit `bfeb1e31a11fd56410c6fe8230fd5e70a04e802e` i dokładnie przetestowane drzewo `5ad04894afc2ad36cc282392650e1488a75f98e1`. Poniższy datowany projekt zachowuje historię propozycji, a opisane w nim prace oczekujące odnoszą się do ówczesnego stanu. Zapis akceptacji na końcu dokumentuje rzeczywiste wdrożenie i weryfikację.

## Historyczna propozycja projektu z 4 listopada 2026 r.

Stan: zmieniony projekt i przekazanie do niezależnego przeglądu, z rozdzielonymi operacjami. Zachowano SHA256 wersji v3 4d389a0abe61f1d131d4cab316c054b4ed30d90894e2c1690b81db080ed8814f oraz wersji v2 14c522215bc2cd25f512c00b606e2cfdad2644ba1bc50abf60d83d4dff3af8b1 sprzed samooceny. Źródła nie uległy zmianie. Zaproponowane prywatnie identyfikatory są poniżej ustalone do zatwierdzenia po zebraniu rzeczywistych migawek. Wersja zastępuje v1 w zakresie propozycji dyspozycji, a SHA256 v1 577afd2b86e28b2f492bcfd08061f2a73a95232ed4123c8527f622e44b5232b5 zachowano. Plan bazuje na zaakceptowanym HEAD A10 `5e80d31e8bfe5fa6b16a28c12e263f74959cc6a3`, drzewie `849271e09bbf1ac0253c0c3fae5a3893ec82e924` odczytanym 4 listopada 2026 r. Źródła sprawdzono w zaakceptowanym katalogu poprzednika (`<accepted-predecessor>/worktree`). Poniższe ścieżki są względne wobec katalogu głównego. Wdrażaj tylko w nowym `<private-stage>/worktree` opiekuna głównego po potwierdzeniu zgodności z zaakceptowanymi źródłami, rzeczywistymi migawkami i przeglądem projektu. Nakład L opisuje ogólną wielkość bez szacunku czasu. Ryzyko średnie do wysokiego dotyczy błędnych deklaracji bezpieczeństwa i zgodności historycznej. Pewność istnienia luki jest wysoka, a priorytetu dydaktycznego średnia. Zakres to jedna funkcja i jeden ewentualny PR, bez działań zdalnych i nowych zależności.

## Cel i wybór projektu

Dla osób znających podstawy programowania i zaczynających od zera w Rust rozszerz opcjonalny program zawodowy o rzeczywistą operację projektowania API. Przekształć zadeklarowaną politykę w ograniczone uprawnienie stanowiące własną wartość i dotyczące dokładnie jednego żądania. Połącz je z dopuszczeniem tak, by żądania odrzucone nie obciążały liczników. Cztery powiązane lekcje uczą rozstrzygnięcia, zawężania, wiązania z żądaniem i dopuszczania konsumującego dowód. Wspólnie tworzą jedną funkcję. Tekst uczestnika jest po polsku, a dokumentacja współtwórców po angielsku. Zakres pomija nowe metadane czasu trwania, analogie do Javy lub Pythona, całościową przebudowę, uwierzytelnianie, TLS, nasłuchiwanie sieciowe i deklaracje bezpieczeństwa produkcyjnego.

Plan stosuje brainstorming do architektury programu i API oraz improve do doradztwa bez zmian plików źródłowych. Wykonanie opiera się na udzielonej zgodzie na ciągłą pracę lokalną. Opiekun główny przegląda ten konkretny dokument bez kolejnych pytań o drobne zgody. Doradca na tym etapie nie wykonywał zadań kursu, testów, kodu natywnego ani commitów.

### Podstawy wyboru kierunku

- `src/content/service-operations.ts:210–267` implementuje `Request { trusted: bool, proof: bool, cost: u32 }`. Fragment `:668–746` uczy tego kontraktu i odrębnego predykatu active/limit. Model nie reprezentuje podmiotu, tenanta, zakresu zasobu i operacji ani posiadanego dowodu rozstrzygnięcia.
- `src/content/projects/service-operations.ts:125–144` powtarza dopuszczenie oparte na źródle i dowodzie. Fragment `:775–789` ogranicza model zagrożeń i jawnie wyklucza uwierzytelnianie oraz szyfrowanie. Ta funkcja rozwija model Rust dla uczestnika w ramach istniejącej granicy deklaracji dotyczących produkcji.
- `src/content/capstone-integration.ts:297` i `:607–614` już uczą rozliczania dopuszczonych żądań, a `:657–740` wersjonowanej normalizacji i migracji. `src/content/projects/durable-log-service/service.ts:39–45,79` udostępnia konfigurację pętli zwrotnej i zasobów bez polityki tożsamości.
- `src/content/service-client-retry.ts:307–311` zawiera cztery różne operacje główne ponawiania i niepewności. A11 zachowuje ich kontrakty i dotyczy odrębnej umiejętności.
- `src/engine/course-route.ts:3–21,33–49` oddziela Core17 od rozszerzeń współbieżności i usług. `docs/curriculum-reconciliation.md:34–35,49–53` rozróżnia dostępność materiału o usługach, API, wydajności i unsafe od niezaobserwowanego transferu umiejętności.

Uczestnik ćwiczy zasadę minimalnych uprawnień, prywatność modułu, powiązanie kontekstu polityki z czasem życia i semantykę przeniesienia w konkretnej granicy usługi. Te operacje wymagają więcej niż zmiana nazwy flagi. Główne ryzyko polega na zawyżeniu gwarancji. Typy wyrażają reguły zaufanego przykładu wewnątrz procesu. Weryfikacja tożsamości i działanie przeciw złośliwemu kodowi wewnątrz modułu polityki wykraczają poza tę granicę.

### Trzy podejścia

1. Sama czysta, typowana funkcja `authorize(principal, request, grants)`. To małe rozszerzenie dotychczasowego zaufania i dowodu, ale wynik można omyłkowo użyć do innego żądania. Sam wariant daje za mało praktyki z integracją właściwości Rust.
2. **Zalecane podejście obejmuje granty z zakresem, monotoniczne zawężanie, pożyczkę polityki z posiadanym żądaniem w dowodzie i dopuszczenie konsumujące dowód**, a także natywny pakiet bez zależności. Cztery lekcje pozwalają oddzielnie wyjaśnić i ocenić każdy niezmiennik. Kompilator egzekwuje prywatność modułu i własność. Polityka pozostaje jawnie syntetyczna.
3. Rzeczywista uwierzytelniana usługa TCP z walidacją i unieważnianiem poświadczeń. Jest bliższa zastosowaniom operacyjnym, lecz wymaga decyzji o pochodzeniu poświadczeń, transporcie, cyklu życia i zależnościach poza tym celem lokalnym. Naruszałaby kilka niezależnych granic i wykracza poza A11.

## Szczegółowy kontrakt dydaktyczny i kontrakt kodu Rust

Identyfikatory API i programu ustalono w szczegółowych manifestach poniżej. Są prywatną propozycją do chwili zapisania rzeczywistego stanu i zatwierdzenia przez opiekuna głównego. Wdrażający używają już zdefiniowanych identyfikatorów. Pakiet polityki używa stabilnej biblioteki standardowej zgodnej z dokładnym Rust 1.85.0, edycja 2024. Nie zawiera unsafe, mutowalności wewnętrznej, wątków, zegara, losowości, I/O ani zależności.

### Dane i granice zaufania

Zdefiniuj osobne typy opakowujące identyfikatory podmiotu, tenanta i zasobu. Każdy opiera się na `u64`, ale publiczne sygnatury rozróżniają ich typy. `Principal` zawiera podmiot i tenant, a `Resource` tenant i identyfikator zasobu. `Action` to zamknięte wyliczenie `Read | Append`. Zbiory operacji używają prywatnego ActionSet z dwiema flagami oraz ustalonymi poniżej konstruktorem i metodami odczytu. Łańcuchy i dowolne maski bitowe są poza kontraktem. Przykład nie przyjmuje nieznanych danych sieciowych ani nie parsuje poświadczeń.

`Request` jest właścicielem zasobu, operacji, zadeklarowanego `cost: u64` i ładunku `String`. Zadeklarowany koszt jest parametrem dydaktycznym, bez pomiaru pracy lub bajtów. Ograniczanie kosztu nie ogranicza pamięci ładunku ani użycia CPU. Ładunek pozwala potwierdzić zachowanie dokładnego żądania. Dane testowe są autorskie i mają ograniczony rozmiar.

`GrantSpec` deklaruje jeden podmiot, jeden tenant, `Scope::Tenant | Scope::Resource(ResourceId)`, zbiór operacji i maksymalny deklarowany koszt. Zakres należy zawsze dokładnie do tego tenanta. Polityka wyklucza globalny symbol wieloznaczny, dziedziczenie ról, domyślnego administratora, negatywne granty i łączenie uprawnień różnych grantów. Zaufany właściciel przykładu tworzy `Authority` ze specyfikacji grantów. Rozstrzygnięcie uwzględnia wyłącznie granty wczytane przez właściciela usługi, choć bezpieczny kod wywołujący może zbudować GrantSpec. Na potrzeby ćwiczenia właściciel dostarcza syntetyczne podmioty. Żądanie przychodzące nie może podmieniać podmiotu ani grantów specjalnym polem.

### Operacja 1 — rozstrzygnięcie autoryzacji dla dokładnego zakresu

`decide(&self, principal: Principal, request: &Request) -> Result<(), Denial>` to czysta funkcja. Najpierw różne tenanty podmiotu i zasobu dają `TenantMismatch`. W pozostałych przypadkach wolno zaakceptować tylko wtedy, gdy jeden skonfigurowany grant odpowiada podmiotowi, tenantowi, zakresowi i żądanej operacji oraz spełnia `request.cost <= grant.max_cost`. W przeciwnym razie zwróć `NoMatchingGrant`. Puste granty, inny podmiot, ten sam identyfikator zasobu w innym tenancie, brak operacji i nadmierny koszt skutkują odmową. Przyzwolenie wymaga co najmniej jednego kompletnego dopasowania. Nie łącz podmiotu z jednego grantu z operacją lub kosztem z innego. Kolejność i duplikaty identycznych grantów pozostawiają wynik bez zmian. Koszt zero i koszt równy limitowi są jawnie dozwolone.

Testy polityki wymagają pełnych tabel pozytywnych i negatywnych, w tym przypadku, w którym uprawnienie dałoby się błędnie złożyć z kilku grantów, oraz duplikatów i permutacji kolejności. Tabele sprawdzają decyzję polityki.

### Operacja 2 — zawężenie uprawnień bez ich rozszerzania

`attenuate(parent: &GrantSpec, requested: GrantSpec) -> Result<GrantSpec, AttenuationError>` zwraca wnioskowany grant dokładnie w podanej postaci, jeśli podmiot i tenant są identyczne, operacje stanowią podzbiór, limit kosztu jest równy lub mniejszy, a zakres w całości zawiera się w nadrzędnym. Zakres tenanta można zawęzić do jednego zasobu w tym tenancie. Zakres zasobu może pozostać przy tym samym zasobie. Przejście do całego tenanta lub innego zasobu jest niedozwolone. Pusty zbiór operacji i limit zero są poprawnymi ograniczeniami. Wyjaśnij, że przy niepustym zbiorze operacji żądanie o koszcie zero nadal może zostać dopuszczone. Odrzuć próbę rozszerzenia błędem `WouldAmplify`. Jeden błąd zapobiega ocenianiu nieistotnej kolejności sprawdzania. Polityka nie modyfikuje nieprawidłowego wniosku po cichu.

Zawężenie ogranicza istniejącą politykę tego samego podmiotu i nie tworzy przenośnego poświadczenia. Niezależny model oczekiwanych wyników wylicza skończony zbiór różnych małych wartości podmiotów, tenantów, zasobów, operacji i progów kosztu. Każde żądanie dozwolone przez poprawny grant potomny musi być dozwolone przez nadrzędny. Sprawdź też dokładną równość zwróconego grantu potomnego. Słaby test mógłby przeoczyć zwracanie zawsze grantu nadrzędnego. Utrzymuj dosłowne oczekiwane przypadki niezależnie od implementacji.

### Operacja 3 — powiązanie konkretnego żądania przekazanego na własność z aktywną pożyczką uprawnień

`Authority::authorize<'a>(&'a self, principal: Principal, request: Request) -> Result<Authorized<'a>, Denial>` najpierw rozstrzyga zasadność, a potem przenosi dokładne żądanie do nieprzezroczystego `Authorized<'a>` z prywatnymi polami, zachowaną referencją `&'a Authority` oraz podmiotem. Authorized nie udostępnia `Clone`, `Copy`, `Default`, publicznego konstruktora, publicznych pól, `DerefMut`, mutującego dostępu do żądania ani publicznej niesprawdzanej konwersji. Poniżej ustalono dokładne implementacje derive i metody odczytu innych typów. Metody tylko do odczytu `request(&self) -> &Request` i `principal(&self) -> Principal` udostępniają pierwotne powiązane wartości. Publiczna `Authority::replace_grants(&mut self, Vec<GrantSpec>)` demonstruje jawną zmianę polityki lokalnej. Utrzymana współdzielona pożyczka uniemożliwia zmianę, jeśli dowód będzie dalej używany.

Zachowaj rzeczywistą referencję do polityki. Samo `PhantomData` lub skopiowany identyfikator nie spełniają wybranego kontraktu dydaktycznego. PhantomData może reprezentować inne zależności czasów życia. Użyj prywatnej funkcji konsumującej i rozkładającej wartość, dostępnej wyłącznie w implementacji polityki i usługi. Bezpieczny kod odbiorcy nie może wtedy wydobyć i podmienić składowych. Podczas dopuszczania pole referencji może pozostać bez dereferencji. Nazwa z podkreśleniem zachowuje powiązanie czasów życia.

Zewnętrzny bezpieczny odbiorca może zbudować żądanie i osobną testową politykę. Brak dostępu do pól uniemożliwia mu sfałszowanie Authorized dla istniejącej polityki, zmianę powiązanego żądania, wydobycie żądania w celu podmiany i sklonowanie dowodu. Po przeniesieniu dowodu nie może go użyć ponownie. Może jednak umyślnie uzyskać drugą autoryzację z niezmienionej polityki. Ćwiczenie nie gwarantuje globalnego, jednokrotnego użycia poświadczenia ani ochrony przed powtórną operacją. Authorized można porzucić bez dopuszczenia i bez obciążenia liczników. Własność w Rust pozwala na najwyżej jednokrotne skonsumowanie wartości, także przez porzucenie.

**Zakres unieważnienia.** Zachowana niemutowalna pożyczka blokuje lokalne `replace_grants`, gdy dowód pozostaje aktywny i będzie użyty. Mechanizm dotyczy tylko tego procesu i nie rozstrzyga wygaśnięcia według zegara. Po skonsumowaniu lub porzuceniu dowodu zmiana polityki wpływa na przyszłe autoryzacje. Polityka nie ma mutowalności wewnętrznej, a dowodu nie serializuje się ani nie zapisuje. Kontrakt nie określa wygaśnięcia, przeżycia zmiany polityki przez token ani automatycznej ponownej autoryzacji.

### Operacja 4 — skonsumowanie dowodu autoryzacji przed zliczeniem dopuszczenia

Użyj wewnętrznego `admit(Authorized<'_>, &mut AdmissionState) -> Result<Accepted, AdmissionRejection>` i publicznej fasady `Service::submit(&mut self, principal, request) -> Result<Accepted, SubmitError>`. Service jest właścicielem prywatnych Authority i AdmissionState. Konstruktor służy zaufanemu środowisku do konfiguracji. `submit` zawsze najpierw autoryzuje we własnej polityce, a następnie wywołuje wewnętrzne dopuszczenie. API nie ma publicznej operacji podania gotowego dowodu, więc dowód polityki A nie może być podany usłudze B. Bezpośrednia autoryzacja na poziomie polityki służy nauce i próbom prywatności. Usługa używa własnej skonfigurowanej polityki. Pożycz rozłączne pola w Rust jako `&self.authority` i `&mut self.state` bez klonowania i osłabiania kontraktu dowodu.

AdmissionState zawiera flagę przyjmowania, licznik dopuszczonych, limit dopuszczonych, naliczony koszt i limit kosztu. Liczniki i limity mają typ `u64`. Model jest skończonym rejestrem dopuszczonych prac, bez semafora aktywnych połączeń, symulacji zakończenia, opróżniania, dekrementacji ani operacji wykonania w A11. Sprawdź kolejno flagę, obliczenie accepted+1 z kontrolą przepełnienia i limit pojemności, a na koniec dodanie request.cost do charged oraz łączny limit kosztu. Rozróżnij `Closed`, `Capacity`, `CostBudget` i `CounterOverflow`. Przepełnienie ma pierwszeństwo przed odpowiednim sprawdzeniem limitu. Oblicz oba nowe liczniki przed jakimkolwiek zapisem. Niepowodzenie pozostawia oba bez zmian i nie dopisuje rekordu przyjęcia. Powodzenie aktualizuje oba i zwraca Accepted z dokładnym podmiotem i pierwotnym żądaniem na własność. Testy natywne sprawdzają zwrócony rekord. Zapis i TCP wykraczają poza kontrakt.

Publiczne złożenie żądania zwraca `SubmitError::Denied(Denial)` przed błędami dopuszczenia. Żądanie bez autoryzacji jest odrzucane także wtedy, gdy przyjmowanie jest zamknięte lub pojemność wyczerpana, i pozostawia stan bez zmian. Autoryzowane żądanie przy zapełnionym limicie daje błąd pojemności. Koszt równy pozostałemu budżetowi przechodzi, a większy o jeden zostaje niedopuszczony. Wartości w pobliżu MAX sprawdzają arytmetykę z kontrolą przepełnienia i atomowość niepowodzenia w trybach debug i release. Jednorazowe skonsumowanie dowodu nie wyklucza autoryzacji nowego żądania. Dopuszczenie nie potwierdza wykonania, zapisu ani dostarczenia.

## Struktura lekcji i ocen

Cztery lekcje w jednym nowym module opcjonalnym concurrency/services, po istniejących operacjach
serwisowych na wykresie wstępnym, ale dołączonym do bieżącego registries/order zamiast umieszczania w
starych wektorach. Istniejące ponowne próby są użytecznym kontekstem, a nie obowiązkowym
warunkiem wstępnym dla modelu polityki synchronicznej. Wymagane są istniejące koncepcje
trust/admission i Rust module/privacy/ownership przy użyciu ich rzeczywistego rejestru IDs po schwytaniu. Należy unikać
podawania do wiadomości publicznej API lub specjalizacji capstone nowych Core17 zależności.

Dwa nowe pojęcia, z których każdy ma dwa *różne operacje*: a) organ o zasięgu: decyzja + tłumienie;
b) wykorzystanie związane z żądaniem: własność wiążąca + zużywająca. Cztery rodziny,
dokładnie jedna na operację. Każda lekcja ma przepowiednię, zwięzły ślad pracy, zadanie
repair/apply, niezależnie wprowadzone puste zadanie aliasing tej samej rodziny i wyraźne limitation/transfer
refleksji. Dodaje się jedno zwykłe ćwiczenie pobierania wykonywalnego na koncepcję z
oddzielnymi ukrytymi jednostkami testowymi i zmienionymi wejściami; odzyskiwanie
pozostaje dowodem do odzyskania, a nie fifth/sixth pierwotnymi. Brak roszczenia o przeniesienie
tylko dlatego, że identyfikatory różnią się.

Privacy/lifetime/use-after-move Diagnostyka uzupełnia lekcję wiązania i rodzimy pakiet. Są to **nie** niezależne rodziny
kodowania pierwotnego same w sobie, a wybór o diagnostyce nie zarabia native/compiler lub kredyt
podstawowy. Learner podstawowe wiążące zadanie musi wykonywać rzeczywistą budowę i
zachować request/principal poprzez publiczny accessioner tylko do odczytu na podstawie zróżnicowanych
danych, propagować oznaczony determinalistic policy test podwójne zaprzeczenie,
udowodnić dokładne przekazywanie argumentów, i uniknąć copying/defaulting resource/action/payload. Rzeczywista integracja
polityki jest udowodniona oddzielnie przez rodzimy pakiet, a nie ten wiążący model.
Native external-consumer sondy oddzielnie ustalić constructor/privacy i borrow/move gwarantuje, że jednoplikowa
brama przeglądarki nie może w pełni udowodnić.

Zachowaj dotychczasowe zasady oceny i rejestrowania pomocy. Dla każdej operacji głównej i powtórki sprawdź rozwiązanie wzorcowe, równoważną implementację, kompilujący się mutant semantyczny, starter i zadanie z pustym edytorem. Dowody natywne wymagają rzeczywistego wykonania. Symulowane odpowiedzi `/api/run` służą do testów aplikacji. Wykaż, że odsłonięcie lub pobranie rozwiązania oraz zaliczenie z pomocą wykluczają niezależne zaliczenie. Zadanie przekrojowe i zadanie z pustym edytorem z tej samej rodziny liczą się raz. Uczestnik może uzyskać odrębne zaliczenia w różnych rodzinach, jeśli pracuje samodzielnie. Zwykłe powtórki zachowują dotychczasową rolę, a import nie zalicza nowych rodzin. Nie należy deklarować opanowania materiału ani skuteczności nauczania.

## Kontrakt pakietu natywnego i jego weryfikacji

Stwórz jeden nowy projekt std-only Cargo przy użyciu istniejącego `ProjectPackage` /archive builder, a nie
pochodną 40 plików capstone. Zamknięte autorzy: Cargo.toml (MIT zakres wykonywalny), Cargo.lock bez
zewnętrznych pakietów, src/lib.rs, tests/policy.rs, tests/attenuation.rs, tests/binding.rs, tests/admission.rs, README.md, THREAT_MODEL.md, WORKSHEET.md. Układ źródła jest
dokładnie jednym src/lib.rs z prywatnym modułem granicznym, określonym poniżej; nie dzielcie
go. Ogłoszenia kanoniczne pochodzą z `scripts/project-archive.ts`; nie ma wyjątku Apache dla nowego materiału.
Starter zawiera umyślne kompilowanie ciał do nowych operacji, a nie ukryte rozwiązania
odniesienia. Rozwiązanie i pobieranie rozruszników oznacza odpowiednie relacje reveal/exposure przy
użyciu rzeczywistych testów silnika uczenia się.

Zamknięty weryfikator opiekun analogiczny do `scripts/verify-client-retry.ts` akceptuje tylko opcjonalne unikalne
`--msrv`; brak ścieżek użytkownika, źródła, polecenia, łańcucha narzędzi lub parametrów
pobierania. To generates/unpacks dokładnie zrewidowane autorskie archiwum do własnego scratch; odrzuć
symlinks, traversion, unknown/missing ścieżki i zmienione treści. Nr learner/imported źródło lub arbitralna
rodzima egzekucja. Odkryj już zainstalowane odpowiednie narzędzia stable/exact 1.85.0; używaj
zamkniętego ładunku offline, własnego celu, czystego env dziecka i hash narzędzi. Nie
installs/fetches. Polecenia zapisu, argv/cwd, razy, exit/signal/timeout, stdout/stderr, dokładne counts/test nazwy, archive/member hash, kompilator
hashes/versions i tryb. Proszę wyraźnie zgłosić błędy w infrastrukturze.

Uruchom pakiet umów rozwiązania w debugowaniu i wydaj na stabilnym i dokładnym 1.85.0.
Przeprowadź równoważną kontrolę przed tymi samymi testami. Zmieszać każdy mutant
semantyczny najpierw z `cargo test --offline --locked --no-run`; kompilacja musi odnieść sukces, a następnie wykonać cel o
nazwie test i zażądać jego asercji awarii (wyjście testowe 101). Złożony błąd, timeout,
sygnał lub wykrycie awarii nie zabija mutanta semantycznego.

Wymagane zestawianie mutantów semantycznych: (1) usunięcie równości najemców; (2)
połączenie pól pomiędzy niepowiązanymi dotacjami; (3) umożliwienie action/scope/cost poszerzenia
zakresu tłumienia (oddzielne kontrole na wymiar); (4) związanie default/replacement wniosku lub głównego
zamiast rzeczywistego wkładu własnego; (5) mutacja zaakceptowana przed nieudaną kontrolą
kosztów; (6) zastosowanie arytmetyki owijania; (7) zezwolenie na omijanie w fasadzie
serwisowej. Testy muszą nazwać zabitego niezrównoważonego, a nie tylko liczyć całkowite
porażki. Zmieniona diagnostyka kompilatora nie jest odrzuceniem semantycznym.

Oddzielne zewnętrzne kontrolery kompilatorów konsumenckich (stałe źródło autorskie
repozytorium; nigdy nie importowane): bezpośrednia mutacja construction/private-field zawodzi prywatność;
świadk.clone zawodzi; ponowne użycie po `drop(witness)` to `witness.request()` zawodzi E0382; zmutuj organ za
pośrednictwem replace_grants, a następnie inspect/drop nadal używany świadek zawodzi E0502. Badanie sond
zewnętrznych ownership/lifetime, a nie niedostępna metoda przyjmowania ze środków publicznych. Dodać
oddzielnie stałe wewnętrzne urządzenie do kompilacji, wykonując rzeczywiste prywatne
zgłoszenie o wartości dwa razy; jego drugie zastosowanie nie powiodło się E0382. Obie
sondy potrzebują pozytywnej podstawy. Posiadanie ważnego podstawowego konsumenta compile/run
przed wszystkimi sondami ujemnymi. Dopasowanie oczekiwanej diagnostyki code/category plus
odpowiedni symbol/span, a nie kruchy pełny angielski tekst. Skomplikować celowo rozluźnione
API warianty (publiczne fields/Clone lub oddzielone żywotność) z odpowiednim konsumentem, aby
udowodnić, że sonda jest istotna; oznaczyć te API -kontrole relaksacyjne, a nie
semantyczne mutacje testowe. Zastąpienie usługi B jest niedostępne w podpisie
publicznym; badanie fasady publicznej A-deny/B-allow na ten sam wniosek oraz brak metody
akceptacji świadków publicznych. Nie polegaj tylko na wyszukiwaniu tekstu jako dowód.

## Rejestr stanu sprzed opracowania treści i zgodność wsteczna

Jest to warunek wstępny wdrożenia. Root pierwszy obserwuje czysty zaakceptowany A10 w
nowym etapie; rekord commit/tree/status, narzędzie paths/versions i przechwytywanie skryptu. Zachować wszystkie 14
poprzednich obiektów projektowych i 28 poprzedników ZIPs; przestrzegać wszystkich 198
wcześniejszych rekordów czasu trwania lekcji, w tym nieobecności minut na obu A10 lekcji
(nie napełniać). Zaakceptowane źródło ma 639 śledzonych plików; dokładne uchwyt
wykorzystuje ostateczną dokumentację-zamknięcia inwentaryzacji, a nie A10 zamrożenie
realizacji. Zaakceptowane liczby poprzedników to 49 modułów, 198 lekcji, 1323 etapów,
196 koncepcji, 197 kompetencji, 349 źródeł i 14 projektów; Core17 posiada 74 lekcje, a 32
moduły rozszerzeń mają 124. Są to fakty pre-authorising, nie odgadnąć ostateczne A11 się
liczy. Przechwytywanie kompletnych rzeczywistych rejestrów kursów eksportowanych,
zamówionych wektorów, rzeczywistej domyślnej przestrzeni nazw, jeśli są obecne,
całokursowej serializacji kanonicznej, funkcji identity/descriptions gdzie JSON nie może ich reprezentować
oraz wszystkich istniejących bajtów archiwum member/ZIP. Zachować oddzielny syntetyczny
domyślny zakres w testach przenośnych; nie etykietować danych syntetycznych
autentycznie. Nie odtworzyć poprzednich rejestrów poprzez usunięcie nowego IDs po
autoryzacji.

Zachować oryginalne trzy V1/V2/V3 elementy wejściowe z ich oryginalnymi nazwami, datami
surowymi, wartościami pola i zamówić zdarzenia bez zmian. Dodać czwartą odrębną nazwę
`v3-current-a10-assisted-resume` uchwytu, otrzymaną w sposób niezmienny od trzeciej, przy użyciu rzeczywistej pozycji
`service-client-ambiguous-driver` / `service-client-aggregate-uncertainty`, wyjście panel/focus, przedłużenie trasy, zapisane źródło, hints/reveal i failed/uncompleted próby plus pomoc
na `ambiguous-driver-blank`. To czwarte urządzenie nie zarabia na kredyt kodowy. Uchwyt surowy V1/V2/V3 state/import
uchwyty z rzeczywistych mechanizmów poprzedników: wznowienie nauki, events/history, przegląd queue/session
tożsamości, kontakty źródłowe, projekty, notatki, samooceny, assistance/reveal flagi i unknown/unrelated pola.
Rekord provenance/hashes prywatnie; nie ujawniać osobistego stanu surowego u źródła. Wygenerować empty/new-state
oczekiwania przed nowym IDs istnieją. Zamrozić uchwyty i zweryfikować hash przed
wdrożeniem. Testy publiczne wiążą haszcze i przenośne obserwacje sanitarne; nie mogą one
zależeć od prywatnych ścieżek systemu plików.

Dołączyć tylko nowy identities/records. Projekt kompletny uznany A11 następca z powrotem do dokładnego
przed- A11 stan, strzeżony przez pełne positions/object hash i kompletny zestaw dodatków. Brak
częściowego stripingu, luźnego tylko identyfikacyjnego strippingu lub usunięcia
niepowiązanych nieznanych zmian. Odniesienia do funkcji zachowania, niemutacja,
idempotencja, actual/default zachowanie eksportu i wszystkie 15 poprzedników serializacji fingerprints/whole-course
wektor jak zaobserwowano, nie zaszyfrowane założenia. Skomponować najnowszy pierwszy A11
→ A10 → oryginalne A9/A8/A7/C1 łańcuchy bez upuszczania adaptera pośredniego. Testy historyczne
mogą zmieniać tylko skład import/wrapper; stary hashes/counts/assertions pozostaje zamrożony. Obecne testy dostępności
mogą aktualizować wyraźnie udokumentowane oczekiwania na żywo. W szczególności `service-client-retry-metadata.test.ts`
zachowuje co assertion/test name/value niezmienione: importuje przestrzeń nazw kursu na żywo, przekazuje
ją przez historykalBeforeA11 i destrukturyzuje istniejący pakiet z tej projekcji. Nie
projektuj za pośrednictwem A10, ponieważ to usunie ponownie lekcję testowaną. Oddzielny
live service-authorization-metadata.test.ts sprawdza wszystkie cztery nowe pominięte okresy trwania i dokładny czas
trwania poprzednika198 presence/values, plus nieprawidłowe wartości wyraźne.

## Pliki objęte zakresem i kolejność wdrożenia

Nowe nazwy plików to zamrożone przydziały prywatne, a nie edyty źródłowe: `src/content/service-authorization.ts`, `service-authorization-assessment.test.ts`, `service-authorization-integration.test.ts`,
`service-authorization-compatibility-fixture.ts`, `service-authorization-compatibility.test.ts`, `src/content/projects/service-authorization.ts` i src/content/projects/service-authorization/package.test.ts, `scripts/verify-authorization.ts` i `.test.ts`, `tests/e2e/service-authorization.spec.ts`, `docs/service-authorization.md`; zweryfikowany doradca końcowy plan/index. Poniższy
manifest tożsamości prywatnej jest kompletny; korzenie przyznają go dopiero po
faktycznym przejęciu i przeglądzie projektu.

Istniejące edycje ograniczone do rejestracji w `src/content/course.ts`, opcjonalnej grupie rozszerzeń w `src/engine/course-route.ts`,
package.json nowych skryptów, vitest.config.mts wyraźne włączenie skryptu-testu, CI okablowanie
w .github/workflows/ci.yml dla stable/MSRV jak szczegółowo poniżej, addytywny skalowany README/current curriculum/queue notatki,
inwentaryzacja pochodzenia i istniejący historyczny import adaptera.
Build-project-assets już wymienia projekty, więc unikaj ich niepotrzebnie. `scripts/project-archive.ts` Polityka
licencyjna bez zmian. Pomocnik archiwum-notice może używać domyślnych ogłoszeń. Zachować
wszystkie stare lesson/project/source definicje, bajty pakietów, biegacz, utrzymujące się schematy, silnik
oceny, blokady zależności i UI. Dopuszcza się nowy pakiet Cargo.lock; nie są to zmiany
pakietu aplikacji-blokady.

1. Root: zweryfikować przyjęte źródło i zamrozić prawdziwy captures/state/archive inwentarz i narzędzia.
   Sprawdzić zarejestrowane SHA tożsamości, stan czysty, uchwycić hash i rzeczywiste
   zamówione wartości; wszelkie niedopasowanie zatrzymuje pracę zależną.
2. Przegląd korzeni: zamrozić ten design/API, IDs manifest, dokładne ścieżki pakietów, źródłowe
   wybory referencyjne i mapowanie rodziny oceniającej. Niezależny recenzent sprawdza
   politykę projektowania context/borrow przed autoryzacją.
3. Wykonawca: autor znaczących testów kontraktowych i wdrożenia pakietu, następnie
   zamknięty weryfikator i kontroli; zweryfikować stabilne i MSRV zorientowane na pakiet
   dowodów przed reklamacjami treści. Utrzymuj stałe i ograniczone źródło sterowania.
4. Wykonawca: autor czterech polskich lekcji, cztery koncepcje families/two, dwa zwykłe recenzje
   i metadane pakietów; weryfikuj prawdziwe przypadki Rust canonical/equivalent/mutant, testy content/evidence oraz
   dostępność źródeł.
5. Wykonawca: dołączenie registries/route i dokładny wsteczny rzut; zweryfikować wszystkie
   przechwycone wektory i stan, bez historycznego odświeżania twierdzenia. Wymagane są
   stare archiwalne równouprawnienie i prawdziwe wychwytywanie prywatnych kwalifikacji.
6. Wykonawca: wdrożyć ukierunkowane kontroli produkcji-przeglądarka i documentation/provenance. Potwierdź keyboard/390px
   nawigacja, stary dokładny CV, kod drafts/notes/reload, neutralny source/prediction/exposure, pomoc, odrębne rodziny
   podstawowe, zwykła tożsamość przeglądu, zarówno ZIP variants/content/notices, uczciwy offline Run
   niedostępny.
7. Root/independent recenzent: Inspect source/API/provenance, then freeze exactly candidate tree and expert all final
   checks serially for heavy runs. Każda zmiana źródła po zamrożeniu wymaga odpowiednich
   nowych kontroli i nowej tożsamości. Zachować nieudane kampanie i wyniki
   diagnostyczne; nigdy nie relabel je przejść.
8. Dopiero po niezależnej akceptacji: lokalne English commit, kompletne Git bundle/history/source pakiet
   dowodów, niezależne przywrócenie do jednorazowej checkout z HEAD/tree/history/archive weryfikacji.
   Dokumentacja zamknięcia musi odróżniać testowane drzewo aplikacji od późniejszego
   tylko metadanych commit. Etap uszczelniania; brak nacisków, głównych zmian lub
   publikacji.

## Dokładne polecenia weryfikacji i oczekiwane wyniki

Polecenia używają lokalnych PATH/runtime i prywatnych konfig root, nigdy nie instalować. Poniższe
nowe `content:authorization` skrypty są określone jako wyniki. Polecenia muszą być uruchamiane oddzielnie, a
nie przykuwane w taki sposób, aby ukryć awarię.

- `git rev-parse HEAD` i `git rev-parse HEAD^{tree}`: dokładne zaakceptowane tożsamości powyżej przed edycjami. `git status --porcelain=v1`: czyste przed
  prawdziwym schwytaniem. Weryfikacja źródła nowego etapu równa się skontrolowanemu
  źródłowi; akceptowane dokumenty metadanych nie są po cichu odrzucane.
- `node node_modules/vitest/vitest.mjs run src/content/service-authorization-assessment.test.ts src/content/service-authorization-integration.test.ts src/content/service-authorization-compatibility.test.ts scripts/verify-authorization.test.ts`: nie failures/skips; dokładna nazwa native/semantic/compiler kontroli sklasyfikowanych jako określone.
- `npm run content:authorization`: stabilne archiwum rodzime, debug/release, equivalent/mutant/compiler-control udokumentowane wszystkie akceptowane za
  pomocą JSON raportu.
- `npm run content:authorization -- --msrv`: to samo zgodnie z dokładnym 1.85.0, brak nabywania narzędzi. Nieznane flagi i
  duplikaty --msrv odrzucają przed wykonaniem procesu (badania jednostkowe potwierdzają
  to).
- `npm run content:packages`: jedna nowa para; każda stara package/ZIP identyczna z pre-authoring capture. Całkowita
  liczba Derive z prawdziwego przechwytywania + 2, nie używać stale 26/28 migawki ślepo.
- `npm run lint`; `npm run typecheck -- --incremental false`; `npm run content:check`; `npm run content:audit`; `npm run content:manifests`: każde z osobnych wyjść 0 z ostrzeżeniami zgłoszonymi
  uczciwie.
- `npm test`: pełna istniejąca kampania jednostkowa z udokumentowanymi kwalifikacjami initialized-prefix/native
  warunkami wstępnymi; wszystkie spodziewane rzeczywiste kontrole prowadzone, brak
  niezamierzonych skip/todo lub maskowanie rodzime.
- `npm run content:rust`: działać oddzielnie pod kwalifikowaną stabilnością PATH i zakwalifikowaną
  dokładnością 1.85.0 PATH. `scripts/verify-rust.ts:182–187,493–495` powołuje się bezpośrednio na `rustc` i nie posiada MSRV CLI
  selektora; nie przekazują `--msrv` do niego ani nie zakładają, że RUSTUP _ TOOLCHAIN wyprzedza
  bezpośredni stabilny binarny wcześniej dnia PATH. Uchwycić faktycznie rozwiązane rustc
  path/version/hash przed każdym uruchomieniem i zachować rzeczywiste liczby.
- `node --test scripts/verify-oss-provenance.test.mjs` i `node scripts/verify-oss-provenance.mjs --check`: Spreparowane sledztwo-źródło zapasów dokładne, nowy materialny zakres
  sklasyfikowany, nie prywatne surowe dzienniki pakowane. Dołącz bajty archiwalne i
  wygenerowane aktywa, jak wymaga istniejąca polityka.
- `npm run build`: budowa nowej produkcji, utrzymanie BUILD _ ID i testowane drzewo. Uruchom własny
  serwer produkcyjny przy użyciu istniejącego skryptu startowego repozytorium 127.0.0.1;
  Konfiguracja Playwright ponownie go używa (nie myl auto-start dev do produkcji).
- `node node_modules/@playwright/test/cli.js test tests/e2e/service-authorization.spec.ts --workers=1 --retries=0`, następnie pełne `npm run test:e2e -- --workers=1 --retries=0` przeciwko procesowi produkcji: dokładne sprawozdania końcowe,
  zero niespodziewanych failures/skips/flaky powtórzeń. Wykiwany biegacz ma wyraźnie zakres UI/state.
- `npm run test:offline`: świeże rzeczywiste, neutralne narażenie po ponownym załadowaniu offline, trwałość
  stanu i uczciwa niedostępna biegacz, dokładne markery raportu zachowane; zweryfikować
  nowy pobór projektu, gdzie zachowanie cache wspiera go bez osłabiania istniejącej
  umowy.
- Niezależne prywatne kwalifikacje do przechwytywania: wszystkie poprzedniki fingerprint/whole-course/state/archive wektory
  pasują do autentycznego zamrożonego wychwytywania. Niezależne kontrole przywracania
  pakietów przyjęte HEAD/tree/history i czyste źródło dokładnie; zachować commands/output w pakiecie końcowym.

## Kryteria ukończenia i warunki wstrzymania

Wykonane wymaga wszystkich czterech odrębnych operacji z zakresu wiernego, dwóch concepts/four
rodzin podstawowych i niezmienionych semantyki oceny; każdy z zestawów mutantów
semantycznych nie spełnia zamierzonego twierdzenia; kontrolery kompilacyjne posiadają
poprawną wartość odniesienia i odpowiednie API -kontrole relaksacyjne; archiwum stable/MSRV debug/release
sprawozdania związane z dokładnością bytes/tools; wszystkie stare definitions/state/evidence IDs/function refs i archiwa
zachowane; rzeczywiste browser/download/offline obserwacje oddzielnie oznakowane; wyczerpany przegląd
prowokacji; niezależny source/evidence przegląd i odnowienie pakietu; zaangażowanie lokalne w języku
angielskim; brak działań zewnętrznych lub wniosków o gotowość. Liczby pochodzą z
rzeczywistego rejestru i muszą zgadzać się z zamrożonym manifestem delty; arytmetyka
jest sprawdzianem krzyżowym, a nie dowodem.

Zatrzymać zależną pracę i zgłosić się do roota, jeśli przechwytywanie nie jest
rzeczywiście preedytowane, drifts źródłowe, private/raw dane ucznia wprowadzi źródło, oczekiwane
stare bajty archiwalne różnią się, mutant semantyczny tylko nie skompiluje, świadek może
uciec z władzy życia lub zaakceptować podstawione wejście, stale-polityki semantyki
potrzebują wnętrza mutability/network cofnięcia, wymagane narzędzia są nieobecne, lub implementacja
wymaga runner/schema/dependency/global UI zmian. Naprawa tylko w ramach zatwierdzonego zakresu; nie osłabiać
kontroli w celu uzyskania przepustki.

## Źródła i pochodzenie

Odczyt źródeł podstawowych na żywo 2026-11-04: https://doc.rust-lang.org/reference/visibility-and-privacy.html (pola prywatne i module/descendant dostęp); https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html (ownership/moves); https://doc.rust-lang.org/std/primitive.u64.html#method.checked_add
(sprawdzona arytmetyka). Również przeczytać https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html na 2026-11-04: Wprowadzenie, Enforce Least
Privileges, Deny by Default, i Potwierdzić uprawnienia na każde żądanie. Motywuje to
politykę wyraźną subject/resource/action oraz kontrole na każde złożenie wniosku; nie potwierdza ona tego
przypadku testowego ani nie uwierzytelnia użytych w nim fikcyjnych podmiotów. Dokumentacja Rusta
wspierają semantykę językową, a nie proponowaną algebrę polityki bezpieczeństwa.
Kontrakty polityczne powyżej są oryginalne autorskie wybory projektowe i muszą być
oznaczone jako takie. Istniejące źródło IDs może być ponownie wykorzystane, jeżeli
rzeczywiście wspierają lekcję; dodaj aktualne zrewidowane źródło tylko wtedy, gdy
faktycznie zostanie przeczytane i konieczne, bez przepisywania dat historycznych. Źródła
excerpt/summary nie wolno kopiować w treści jako oryginalnej prozy. Nie ma potrzeby wprowadzania w
życie nowych przepisów przez strony trzecie.

Nowe dane operacyjne Rust wykonywalny examples/TS odpowiadają istniejącemu zakresowi
materiałowemu MIT; polski materiał wyjaśniający jest zgodny z obecnym zakresem CC BY 4.0 wraz
z przylegającymi adnotacjami mieszanymi. Nowe archiwum odziedziczy Canonical Repository
notice, a nie niepowiązane pakiety Apache wyboru. Rekord AI - wspomagany autorstwo i
ludzki kierunek prawdomównie, bez autorytetu człowieka lub podzlecenie prawne. Zachować
stare paragony, tekst licencji, IDs i dowody.

## Kierunek po A11 wymagający odrębnej zgody na wdrożenie

Jest to kolejna opcjonalna operacja, a nie ukończenie całej zaawansowanej Rust. Obecna
mapa docelowa jest historyczna i nie może sama stwierdzić brakującego wdrożenia.

1. **Ponowna kontrola połączeń progress/fairness i skład anulowania dla konkretnej brakującej operacji.** Istniejące async/runtime/channel/TCP/lending lekcje i A10 powtórne próby są znaczące (`docs/curriculum-reconciliation.md:34,47`); wymagają betonowej
   powieści niezmiennej, takiej jak praca ograniczona scheduling/fairness w ramach anulowania przed
   kolejnym planem. Nie powielać timeout/drain ani nie twierdzić, że testy deterministyczne
   dowodzą wszystkich harmonogramów.
2. **Ponowna kontrola resource/transaction granic w ramach zmienionej umowy składu.** Istniejące capstone dostarcza już SQLite migracji, zwrotów, trwałych wyników i A8
   konserwacji (`capstone-integration.ts:657–740`, pojednania `:35,85`). Tylko odrębna operacja uzasadniona rzeczywistym
   źródłem może stać się późniejszą cechą; ogólna migracja i inna retry/Unknown algebra są
   odrzucane.
3. **Rozszerzenie mierzonej API/performance obsługi technicznej wyłącznie z nowej operacji uczenia się.** API Zwolnienie Matrix/A6 i performance/property/fuzz/A7 już istnieje (`reconciliation:41–42,49–50`). Kandydackie przyszłe prace mogą
   łączyć zmienioną umowę z uzasadnionym allocation/lifetime ustępem, ale inna dokumentacja lub ogólny
   punkt odniesienia powielałby zakres. Zbierz dokładny dowód źródłowy przed wyborem.
4. **External/learner praca pozostaje osobna:** uwierzytelnione transport/deployment, na żywo advisory/publication przepływy pracy i obserwowane w posiadaniu osób
   uczących się transfer/review nie są dostarczane przez A11. Wymagane jest odpowiednie authorization/context; oprawy
   oprogramowania nie mogą zapewnić opanowania, starszeństwa lub gotowości zawodowej.

Nieskontrolowane wyczerpująco: każde podstawowe ćwiczenie, każda rodzima implementacja
narzędzia, prawdziwe deployment/authentication, na żywo doradcy lub wyniki uczenia się. Nie przeprowadza się
żadnych testów źródłowych wykonywanych przez tego agenta planowania; wyszukiwanie tylko
do odczytu, kontrola tożsamości git i pobieranie dokumentów pierwotnych wyłącznie.
Wcześniejsze A11 informacje dotyczące kierunku A10 - oczekujące oświadczenie jest
historyczne i zastąpione przez przyjęte źródło tutaj używane.

## V2 — ustalony manifest dyspozycji, API, własność i interfejs źródeł

W niniejszej sekcji rozwiązuje się wszystkie wcześniejsze opcjonalne wybory wykonawcze;
jest to część projektu, a nie dyskrecja wykonawcy. Brak dodatkowych opinii publicznej
methods/traits/conversions poza tymi, które tu wymieniono. Wszystkie typy rustów żyją w `mod boundary { ... }` w `src/lib.rs`; reeksport
korzeni dokładnie podane poniżej nazwy publiczne. Prywatne `AdmissionState` i `admit` pozostają w tym
module. Testy jednostkowe to `boundary::tests`; zewnętrzne testy opakowań importowych powrotnego
wywozu korzeni. Plik rozpoczyna się `#![forbid(unsafe_code)]`. Nie ma niezwyczajnego "Drop gdziekolwiek".

- `pub struct PrincipalId(pub u64)`, `TenantId(pub u64)`, `ResourceId(pub u64)`: remis Debug, Clone, Copy, PartialEq, Eq. Publiczni konstruktorzy krotek są
  celowymi wartościami tożsamości, a nie referencjami.
- `pub struct Principal { pub subject: PrincipalId, pub tenant: TenantId }` i `pub struct Resource { pub tenant: TenantId, pub id: ResourceId }`: te same pochodne; konstruować z literalami.
- `pub enum Action { Read, Append }`, `pub enum Scope { Tenant, Resource(ResourceId) }`: te same źródła.
- `pub struct ActionSet { read: bool, append: bool }`: takie same źródła; tylko `pub const fn new(read: bool, append: bool) -> Self` i `pub fn contains(self, action: Action) -> bool`. Prywatne `fn subset_of(self, parent: Self) -> bool` wynosi `(!self.read || parent.read) && (!self.append || parent.append)`. Brak Domyślne,
  bitmask lub pola publiczne.
- `pub struct GrantSpec { pub subject: PrincipalId, pub tenant: TenantId, pub scope: Scope, pub actions: ActionSet, pub max_cost: u64 }`: takie same pochodzenie. Prosty wkład w politykę publiczną.
- `pub struct Request { pub resource: Resource, pub action: Action, pub cost: u64, pub payload: String }`: Reign Debug, PartialEq, Eq tylko; literalna konstrukcja, no Clone/Copy. Własność, nie
  niezdolność do tworzenia innej równorzędnej prośby, jest punktem.
- `pub enum Denial { TenantMismatch, NoMatchingGrant }`, `pub enum AttenuationError { WouldAmplify }`, `pub enum AdmissionRejection { Closed, Capacity, CostBudget, CounterOverflow }`, `pub enum SubmitError { Denied(Denial), Admission(AdmissionRejection) }`: Debug, Clone, Copy, PartialEq, Eq. Nie ma potrzeby wprowadzania znaków
  błędu ani Display/Error.
- `pub struct Authority { grants: Vec<GrantSpec> }`: Tylko debug. Metody dokładnie `pub fn new(grants: Vec<GrantSpec>) -> Self`, `pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial>`, `pub fn authorize<'a>(&'a self, principal: Principal, request: Request) -> Result<Authorized<'a>, Denial>`, `pub fn replace_grants(&mut self, grants: Vec<GrantSpec>)`. replace_grants po prostu zastępuje swój
  własny wektor; nie ma wewnętrznej mutacji ani identyfikatora autorytetu.
- Wolny `pub fn attenuate(parent: &GrantSpec, requested: GrantSpec) -> Result<GrantSpec, AttenuationError>`.
- `pub struct Authorized<'a> { authority: &'a Authority, principal: Principal, request: Request }`: Tylko debug. Publiczne `principal(&self) -> Principal`, `request(&self) -> &Request`. Żadnych innych funkcji publicznych. Prywatna
  konstrukcja tylko wewnątrz autoryzacji. Konsumpcja prywatna bezpośrednio dekonstruuje
  wszystkie pola wewnątrz przyznawać; zachować wiążący jako `let Authorized { authority: _authority, principal, request } = authorized;`. Brak roszczeń
  globalnych uniqueness/replay.
- `pub struct Limits { pub max_accepted: u64, pub max_cost: u64 }`: Debug, Clone, Copy, PartialEq, Eq. Dosłowna konfiguracja.
- Prywatny `struct AdmissionState { accepting: bool, accepted: u64, charged_cost: u64, limits: Limits }`: Tylko debugowanie. Brak dostępu zewnętrznego constructor/field.
- `pub struct LedgerSnapshot { pub accepting: bool, pub accepted: u64, pub charged_cost: u64, pub limits: Limits }`: Debug, Clone, Copy, PartialEq, Eq. Zrzut migawki jest odłączoną wartością; edycja nie
  może zmutować usługi.
- `pub struct Accepted { principal: Principal, request: Request }`: Debug, PartialEq, tylko Eq. Publiczne odczyty `principal(&self) -> Principal`, `request(&self) -> &Request`. Brak możliwości biegania w
  trybie akceptowanym; jest to obserwacja dopuszczenia do rejestru.
- `pub struct Service { authority: Authority, state: AdmissionState }`: Tylko debug. `pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self` rozpoczyna przyjmowanie = true, accepted = 0, charged_cost = 0. `pub fn submit(&mut self, principal: Principal, request: Request) -> Result<Accepted, SubmitError>`
  upoważnia z własnym autorytetem, a następnie wzywa prywatne przyjęcie. `pub fn snapshot(&self) -> LedgerSnapshot`; `pub fn close(&mut self)` flips
  accepting = false; `pub fn replace_grants(&mut self, grants: Vec<GrantSpec>)` delegats to own authority. Brak autorytetu, surowa mutacja
  państwowa, ponowne otwarcie, rejestr publiczny, spożycie świadków publicznych,
  publiczne przyjęcie, lub egzekucja zwrotna.
- Prywatny `fn admit(authorized: Authorized<'_>, state: &mut AdmissionState) -> Result<Accepted, AdmissionRejection>` jest właścicielem świadka i zawiera transakcję check/commit. Brak konstruktora dla
  modułu zewnętrznego AdmissionState.

Zaufane ustawienie przepełnienia znajduje się tylko w obrębie `#[cfg(test)] mod tests`: konstruować Service/AdmissionState
literali z akceptowanym lub charged_cost MAX i ważnych limitów dopasowywania. Państwa te nie mogą
być podawane do wiadomości publicznej learner/service API. Testy integracyjne pakietów zaczynają się
od zera przez Service:: new. Złożone sondy do rzeczywistego dopuszczenia prywatnego są
dołączane jedynie jako stałe potomstwo weryfikatora wewnątrz granicy w tymczasowym
źródle, nigdy nie jest to nowy test publiczny API. Utrzymuje to realistyczną granicę
publiczną i osiąga granice arytmetyczne bez miliardów zgłoszeń.

Cztery jednoplikowe źródła lekcji to modele operacyjne, a nie kopie kompletnego ładunku
API. Wszystkie używają prywatnych deklaracji skrzyniowych, aby prawdziwe załączone `__rust_workshop_hidden_tests`
dziecko mogło uzyskać dostęp do ich stałej konfiguracji testowej. Polityka ujawnia
jedynie swoją działalność polityczną; tłumienie tylko tłumienie; wiążący wykorzystuje
oznaczony test deterministyczny dwukrotny i rzeczywisty borrowed-authority/owned-request świadek; wstęp zapewnia
stały prywatny witness/ledger i tylko przyznać. W kodzie widocznym dla ucznia nie pojawia się żadna
fasada serwisowa ani ciało kanoniczne innej rodziny. Dokładne deklaracje allowed/forbidden są
zamrożone w poniższym przekazaniu V4. Sama rodzima biblioteka zachowuje pełny prywatny
moduł graniczny i prawdziwe skomponowane API; nie runner/public zmiany nasion są dozwolone.

### Pakiet natywny — algorytm referencyjny i równoważne warianty

Decyzja kanoniczna rozpoczyna się `if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }`; następnie `self.grants.iter().any(|grant| { ... })` łączy w sobie równość przedmiotu,
równość najemców, zakres exact/tenant, działanie zawiera i `request.cost <= grant.max_cost` w ramach jednego zamknięcia.
Równoważny używa pętli wczesnego powrotu z tymi samymi warunkami; nie może wywoływać
decyzji kanonicznych. Kanoniczne tłumienie wyraźnie odrzuca subject/tenant niedopasowanie, nieudany
podzbiór, większy maksymalny i nieograniczony zakres, a następnie `Ok(requested)`; równoważny
oblicza każdy boolean zamknięcia w wyrażeniach dopasowania następnie łączy je. Canonical
authority calls sel.decide with lined request using `?`, then returns `Ok(Authorized { authority: self, principal, request })`; equivalent
use explicite match and identifly exact move, not cloning/reconstructing selected fields. Canonical
przyznać destructures świadków, kontrole zamknięte, obliczenia `next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?`, pojemność, następnie
`next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?`, budżet, a następnie commits zarówno pola i zwroty Akceptowane. Równoważne oblicza
sprawdzonych kandydatów w wyrażeniach dopasowania i wprowadza nowy AdmissionState tylko po
wszystkich kontrolach, zachowując kolejność błędów. Wszystkie cztery równoważne warianty
źródłowe są niezależnymi implementacjami, a nie pseudonimami wywołującymi kod
kanoniczny.

### Wspólny scenariusz zawężania uprawnień wymagany w lekcji, testach i arkuszu

Host ma grant na subject1/tenant10, Tenant scope, Read + Append, max100. Poproś dziecko z tym samym
subject/tenant, resource7, Append-only, max4; attenuate returned identially that child. Construct
Restricted Service:: new (vec! [child], Limits {max_accepted:10,max_cost:20}). Principal1/tenant10 Zastosuj zasoby7
Cost4 odnosi sukces z oryginalnym ładunkiem. Resource8, Read resource7, i cost5 żądań każdego
powrotu Odmawiane (NoMatchingGrant), bez zmian w rejestrze. Próba poszerzenia zakresu do Tenant nie
powiodła się i nie może być załadowana. Oddzielnie budować szeroki serwis z rodzicem:
zasoby tam się powiedzie, udowadniając, że tylko komputerowe dziecko nie cofa władzy
rodzicielskiej. Wyraźnie zastępując szeroko zakrojone stypendia serwisowe vec! [dziecko]
sprawia, że kolejne zasoby zaprzeczają. Automatyczne cofnięcie nie jest wymagane.

## V2 — ustalony manifest identyfikatorów i dowodów

Należy użyć tych dokładnych IDs po prawdziwych schwytaniach; żadne nowe źródło IDs:
ponowne użycie `cargo-reference-visibility`, `rust-book-ownership`, `service-operations-enums`, `service-operations-testing`. OWASP pozostaje cytowana w docs/worksheet bez wprowadzania
niezweryfikowanego zapisu źródłowego programu nauczania; obecny przegląd referencyjny
jest zapisany w planie. Moduł `service-authorization`, projekt `service-authorization`, pakiet `service-authorization-workshop` (skrzynia z rurą `service_authorization_workshop`).
Moduł wymaga dokładnie `["service-operations"]`; moduł dołączenia do końca grupy usług współwalutowych,
pozostawiając poprzednie zamówienie nienaruszone.

Koncepcje: `service-scoped-authority` warunki wstępne `["service-operations-bounded-admission", "visibility-boundaries"]`; `service-bound-authorization-use` warunki wstępne `["service-scoped-authority"]`. Kompetencje, odpowiednio
`service-scoped-authority-competency`, `service-bound-authorization-use-competency`. Dla obu kompetencji ustaw dowód w postaci kodu Rust (evidenceArtifact) i kalibrację version2/minimumCodingTasks2 (evidenceCalibration). Odniesienia do źródła: pierwsze dwie lekcje
wykorzystania enums/testing; dwa ostatnie visibility/ownership/testing. Warunki wstępne lekcji są lekcją IDs poniżej, nie
koncepcja IDs.

| Lekcja (zamówiony dodatek) | Koncepcja | Warunki wstępne lekcji | Prefiks dla stopnia IDs | Rodzina podstawowa | Kryterium bramki |
|---|---|---|---|---|---|
| service-authorization-policy | service-scoped-authority | service-trust-admission, module-visibility | authorization-policy | service-authorization/exact-scope-v1 | authorization-exact-scope-gate |
| service-authorization-attenuation | service-scoped-authority | service-authorization-policy | authorization-attenuation | service-authorization/attenuation-v1 | authorization-attenuation-gate |
| service-authorization-binding | service-bound-authorization-use | service-authorization-attenuation | authorization-binding | service-authorization/request-binding-v1 | authorization-request-binding-gate |
| service-authorization-admission | service-bound-authorization-use | service-authorization-binding | authorization-admission | service-authorization/consuming-admission-v1 | authorization-consuming-admission-gate |

Każda lekcja ma dokładnie sześć uporządkowanych kroków `<prefix>-predict`, `<prefix>-model`, `<prefix>-apply`, `<prefix>-blank`, `<prefix>-recall`, `<prefix>-reflect`.
Tożsamość każdego kroku jest więc definiowana przez cztery dosłowne przedrostki i te
sześć dosłownych przyrostów (24 razem, bez dodatkowych opcjonalnych kroków).
Przewidywanie to wybór / przewidywanie; model jest observe/answer/exposure; należy stosować apply/tests/transfer z
potwierdzeniem Brama prawdziwa; puste jest blank/tests/transfer, ta sama rodzina i dowód Brama prawda;
przypomnienie jest recall/tests/recall z tej samej rodziny i bez dowodów Brama; refleksja jest rubric/self-rating i
nie codingTaskId/evidenceGate. Pusty `code` jest dokładnie pusty ciąg; jego szybkie dostarcza tylko minimalne
operacji skalowane nie-rozwiązanie type/helper rusztowania z ciałem todo, i prosi uczącego się
do kopiowania rusztowania i niezależnie wdrożyć tę operację. Nie może wymagać
rekonstrukcji całego ładunku API lub wypełnić edytor. Roztwór kanoniczny zawiera tylko
ten model operacyjny. Przywracanie jest oddzielnym testem body/new dane wejściowe, a nie
niezależne podstawowe.

Każde kryterium ma dokładnie dwa taskRefs: jego własna lekcja jest stosowana i pusta. requiredIndependentCodingTasks=1.
Moduł assessmentId=`authorization-admission-blank`; lessonIds w porządku stołowym. Dwa zwykłe klucze do mapy: service-scoped-authority → krok `review-service-scoped-authority`
(rodzina tłumiąca), service-bound-authorization-use → krok `review-service-bound-authorization-use` (rodzina przyjmująca). Używają rodzaju wycofania,
oceny testów, wyraźny pusty kod, niezależne dosłowne jednostki testowe, nie evidenceGate. Nie.
short/delayed nadmiar, wpisy mapy drogowej lub dodawane ślady; istniejące rozszerzenie przeglądu
może spowodować niesprawności za pomocą niezmienionej maszyny.

ProjectContract.lessonIds jest czterech lekcji tabeli IDs; ProjectContract.reviewConceptIds jest dwoma zamrożonymi pojęciami IDs;
ProjectContract.package serviceAuthorizationPackage. ProjectContract.lessonId en service-authorization-policy oraz adversarialLessonId en service-authorization-admission; adversarialInject opis odmownego wniosku na closed/full
Rejestr bez wprowadzania organów źródłowych. Nie istnieje ogólne pole odniesienia dla
projektu. ProjectPackage.revealStepRefs jest dokładnie wszystkie osiem apply/blank pary o kwalifikacjach lekcyjnych
w tabeli; starterRevealStepRefs jest dokładnie []. Brama modułu taskRefs pozostają tam, gdzie są określone
powyżej. Brak nieistniejących pól lub rozszerzeń schematów. Nazwa rejestru wywozowego
ustalona: `serviceAuthorizationLessons`, `serviceAuthorizationConcepts`, `serviceAuthorizationCompetencies`, `serviceAuthorizationReviewExercises`, `serviceAuthorizationModule`, `serviceAuthorizationSources` (pusta tablica); eksport projektów `serviceAuthorizationPackage`,
`serviceAuthorizationProject`. Test metadanych wyraźnie sprawdza wszystkie cztery pominięte minuty.


## V2 — ustalone manifesty pakietów i kontroli

Dokładnie dziesięć autorskich członków pakietu: Cargo.toml; Cargo.lock; src/lib.rs; tests/policy.rs; tests/attenuation.rs; tests/binding.rs; tests/admission.rs; README.md;
THREAT_MODEL.md; WORKSHEET.md. Cztery kanoniczne powiadomienia archiwalne są dołączane przez niezmieniony
budowniczy: LICENSE, LICENSE-CONTENT, LICENSE-SCOPE.md, THIRD-PARTY-NOTICES.md. Oba ZIPs W związku z tym mają dokładnie 14
członków zakorzenionych w pakiecie id. Cargo.toml nazwa pakietu
service-authorisation-warsztat, wersja 1.0.0, edition2024, rust-version1.85.0,
publication = false, licence = "MIT", nie dependencies/features/build Scenariusz. Format blokady 4 zawiera
tylko to package/version. Starter zastępuje dokładnie cztery ciała operacyjne todo!, zachowując
signatures/types/facade/tests; kontrola ładunku --all-targets ale pozytywne testy behawioralne go odrzucają. Brak
skopiowanego pakietu lub kodu osób trzecich.

Zamknięte źródło kontroli jest eksportowane z `src/content/service-authorization-contracts.ts`: snippetów do lekcji w skali
operacyjnej, canonical/alternate organów oceniających eksploatację, nierozgadanych szybkich rusztowań,
ciał startowych, tabeli mutacji semantycznych i nazwanych ukrytych testów. Modele te
nigdy nie zawierają trzech pozostałych ocenionych implementacji; pełna rodzima API
mieszka w pliku oprawy pakietu. `src/content/service-authorization-assessment-fixtures.ts` mapuje dokładne step/review IDs do ustalenia kompletnego source/tests/alternate/mutant.
Package producenta importującego autorskie struny źródłowe z `src/content/projects/service-authorization/fixtures.ts`; ten plik eksportuje
dokładnie libSource, pliki testowe, struny doc i kompilator probe/relaxation rekordy. Testy tubylców
i lekcji porównują ocenianą umowę operacyjną, ale celowo wykorzystują różne rusztowania
zależności; żadne z rodzimych źródeł API nie jest importowane do łańcuchów lekcyjnych i
żaden wynik z jednego źródła nie jest ponownie wykorzystywany jako dowód dla drugiego.
Literacko niezależne oczekiwane wartości poniżej są obowiązkowe; żadna wyrocznia, która
wywołuje kanoniczne zdecydować się na obliczenie oczekiwanej decyzji.

Wspólne stałe dane dotyczące kontroli podstawowych: P1 = subject1/tenant10, P2 = subject2/tenant10, POther = subject1/tenant20; R7
= tenant10/resource7, R8 = tenant10/resource8, ROther = tenant20/resource7. Grant G = P1, Tenant, Read + Append, max4. Request Q =
R7, Append, cost4, load "line-α". Każde urządzenie deklaruje własne dane za pomocą
niniejszej specyfikacji; wartości są syntetyczne, a nie referencje.

### Testy pozytywne i natywne oraz mutacje semantyczne

Mutacja oznacza dokładne zastąpienie tekstualne świeżego kanonicznego stałego źródła,
liczba dopasowanych kotwiców1. Należy umieścić jeden unikalny komentarz o nazwie `// A11-...`
bezpośrednio przed każdym zamrożonym wyrażeniem docelowym; weryfikator finds/replaces tylko ten
zakotwiczony przypadek i zapis before/after strawy. Mutant musi `cargo test --no-run --offline --locked` skompilować się z
powodzeniem, następnie tylko nazwany test docelowy musi uruchomić i nie potwierdzić;
przywrócić kanoniczny i uruchomić ten sam cel przechodzi. Debug/release na obu łańcuchach
narzędzi, każdy w świeżych celach. Diagnostic/timeouts nigdy nie są zabijane.

| Badanie stałe location/name | Literalny niezmienny i oczekiwany wynik | Mutant anered edit / equential |
|---|---|---|
| tests/policy.rs `exact_scope_is_tenant_bound` | Organ G; P1 + ROther zwraca TenantMismatch; POther + ROther ze zwrotem G NoMatchingGrant; dopasowanie P1/Q następuje | M01 zastąpić zakotwiczone principal/request najemca przewidywać false; nazwane twierdzenie nie dokładnie zaprzeczyć. Ten mutant oznacza jedynie klasyfikację odmowy; pośrednik zezwala jest testowany przez M02 poniżej |
| tests/policy.rs `same_grant_and_tenant_are_required` | Subsitt1 tenant20 Tenant Append max4; P1/Q zwraca NoMatchingGrant | M02 zastąpić grant.tenant = = request.resource.tenant z true wewnątrz tego samego dofinansowania zamknięcia; nielegalny cross-tenant pozwolenie teraz nie potwierdza |
| tests/policy.rs `grants_cannot_be_spliced` | grants: subject1 tenant10 resource8 Read max0; subiet2 tenant10 resource7 Append max4. P1/Q zaprzecza. Reorder/duplicate każdy nadal zaprzecza; dodać pełne dopasowanie G to pozwala | M03 zastąpić całkowite zamknięcie oddzielnymi kontrolami dotyczącymi przedmiotu; tenant/scope; action/cost. Szczególny organ zastępujący jest zamrożony przez ten algorytm i nie może utrzymać wymogu jednograntowego |
| tests/policy.rs `decision_boundaries` | niewykorzystane dotacje; zezwolenia G cost0/4 ale nie 5; brak działań zaprzecza; niewłaściwy podmiot zaprzecza; dokładna dotacja zasobów nie pozwala R8; permutations/duplicates ważnego zezwolenia na dotację | M04 zastąpić request.cost < = grant. max_cost request.cost < grant. max_cost; równość zawodzi |
| tests/attenuation.rs `attenuation_rejects_amplification` | subject1 tenant10 resource7 Dostosowanie max4; niezależna próba wprowadzenia zmian przez dziecko subiet2, tenant20, Tenant scope, resource8, addsRead lub max5 → WouldAmplify każdy; exact/empty-action/zero-cost dziecko odnosi sukces dokładnie | M05 scope-condition boolean zastąpiony true; M06 subset check zastąpiony true; M07 zgłoszony. max_cost < = rodzic. max_cost zastąpiony true (kanonical musi stosować ten pozytywny warunek lub odrzucić jego negację); wszystkie cele tego nazwanego testu i niepowodzenie odpowiedniego przypadku literalnego |
| tests/attenuation.rs `child_is_exact_and_monotone` | G zwężone do R7 Dołącz max2 zwraca dokładnie wymagane dziecko, a nie rodzica. Wyczerpująca matryca skończona subjects1/2, tenants10/20, resources7/8, Read/Append, cost0/2/3/4/5 posiada wyrocznię zezwalającą dosłownie: tylko dla dzieci P1 / T10 / R7 / Dostosowanie / koszt < = 2; rodzic P1 / T10 / albo-zasób / jedno działanie / koszt < = 4 | M08 `Ok(requested)` → `Ok(*parent)`; dokładne twierdzenie dziecka nie jest skuteczne. Końcowa tabela niezależnie sprawdza obie decyzje |
| tests/attenuation.rs `installing_child_changes_effective_policy` | łączony scenariusz hosta powyżej: ograniczone dziecko dopuszcza tylko R7Append4; usługa wspierana przez rodziców nadal pozwala R8 do czasu wyraźnej wymiany; nie powiodło się rozszerzenie nigdy nie załadowane | M09 w serwisie:: replace_grants zastąpić połączenie delegata zakazem; po zastąpieniu R8 nadal się udaje, twierdzenie nie udaje |
| tests/binding.rs `authorized_owns_exact_request_and_principal` | autoryzacja P1, Q następnie kontrola głównego i wszystkich resource/action/cost/payload; dodatkowo P2 organ dopasowujący P2 i zmienione Unicode ładowność potwierdza exactP2 nie defaultP1; zaprzeczenie sprawy bez świadka | M10 w autoryzowanym wniosku o udzielenie zamówienia na budowę zastąpionym wnioskiem {payload: String:: new (),.. request}; M11 dyrektor zastąpiony przez dyrektora {subject: PrincipalId (0), najemca: principal.tenant}; dokładne stwierdzenia dotyczące migawek nie działają niezależnie |
| tests/binding.rs `policy_borrow_and_reissue_are_bounded` | authorize/drop; autoryzacja ponownie dozwolona; spadek drugi niż replace_grants (vec! []); kolejne zezwolenie zaprzecza; nie rości sobie błędu pożyczki w czasie biegu | Nie wymaga mutacji w czasie biegania; kompilacja kontroli poniżej ustalić odrzucenie live-pożyczki. Równoważny autoryzacja wyraźnych pasujących przepustek |
| tests/admission.rs `facade_checks_its_own_authority_before_admission` | A with emptygrants closed; B withG defaultlimits; same P1/Q: A Denied(NoMatchingGrant), B accepted exactfields. A remains unchanged; also A empty/fullzero denies before capacity | M12 Service:: submit replay sel.authority.authority (...) call with direct private Authorized construction bound to sel.authority; A approvement error/success differences from Denied; asertion fauls |
| tests/admission.rs `admission_is_atomic_and_budget_equality_is_allowed` | limity accepted2/cost4: submit Q covered microshot (accepted 1, cost4); next cost1 deniesCostBudget statecontained; next cost0 coffects microshot (2,4); another cost0 Pojemność unload; close then valid request | M13 przed kontrolą kosztów write state.accepted = next_accepted (usunąć późniejszy duplikat tylko w razie potrzeby, nigdy nie zmienić innego kodu); odrzucenie migawek nie powiodło się. M14 porównaj next_cost > = max_cost, a nie >; początkowa równość zawodzi |
| src/lib.rs granica:: badania `accepted_overflow_is_not_capacity_or_wrap` | Zaufane państwo akceptuje,acceptedMAX, charged0,limitsMAX/MAX; autoryzuj zero-costQ; przyznać CounterOverflow, exactunchanged | M15 checked_add(1).ok_or(CounterOverflow)? zastąpiono wrapping_add (1); result/snapshot stwierdzenie nie spełnia wymogów |
| src/lib.rs granica:: badania `charged_cost_overflow_does_not_commit_accepted` | Zaufane państwo akceptuje, akceptował0,chargedMAX,limitsMAX/MAX; autoryzacja kosztów 1; CounterOverflow; exactunchanged botfields | M16 charged_cost.checked_add(request.cost).ok_or(CounterOverflow)? zastąpiony wrapping_add(request.cost); result/snapshot nieudany |
| src/lib.rs granica:: badania `dropped_authorization_does_not_touch_ledger` | stały organ i stan (0,0), authorizeQ następnie spadek; stan bez zmian; kolejny świeżo authorizedQ dopuszczony raz do (1,4) | Canonical/alternate; żadne roszczenie, że ponownie wydano dotację, nie zapobiega powtórce logicznej |

Dodatkowe bezpośrednie asercje pola muszą sprawdzić dokładnie Akceptowane subject/tenant/resource/action/cost/payload, nie tylko
wynik Ok. `assert_eq!(service.submit(...), Err(...))` jest możliwe, ponieważ akceptowane derives PartialEq/Eq/Debug. Powyższe badania nazwane są
wyczerpującym, obowiązkowym zestawem pozytywnym: polityka 4, łagodzoność3, wiązanie2,
admission2, unit3 = 14 testów rodzimych. Ten manifest pozwala na pętle parametru
wewnątrz badania, a nie cicho adding/subtracting testowe wpisy wykrywające. Weryfikator krajowy wymaga
wszystkich 14 nazwisk przekazywanych, zero ignorowane; testy dokstury są zerowe. Lekcja
ukryte testy podzbiór tych niezmiennych dla każdej rodziny z jednym o nazwie test na
źródło, i przegląd dosłownie przypadków użycia P2/tenant20/resource9/cost3 i alternatywny ładunek, aby uniknąć
identycznych ciał.

### Zamknięty zestaw prób poluzowania kontraktu kompilatora i API

Nadwozia stałych sond są przechowywane wyłącznie w fixtures.ts, rozszerzane na tymczasowych
konsumentów zewnętrznych związanych ze świeżo skompilowanym rlibem. Każda sonda
zewnętrzna otrzymuje podstawowe funkcje pomocnicze zwracające władzę (G), P1 i Q; żaden
pomocnik nie ma dostępu do prywatnych pól. Kompiluj punkt bazowy najpierw pod obydwoma
narzędziami (konstruuj organ, autoryzuj, sprawdzaj oba akcesoria, upuść; createService,
submit, inspectSnapshot), a następnie każdy negatywny. Sonda dokładnie nazwała linię
diagnostyczną i oczekiwany kod; nie akceptuj żadnych błędów poza tą linią, z wyjątkiem
podsumowania Rust. Nie liczy się tylko parser lub nierozwiązana awaria nazwy. Native
weryfikator rejestruje pełną JSON diagnostykę rustc, a nie kruchą prozę stderr.

| Sonda ID | Negatywne ciało po pomocy | Oczekiwane | Zrelaksowana kontrola źródła i ciało sukcesu |
|---|---|---|---|
| private-construction | `let a=authority(); let _=Authorized{authority:&a,principal:principal(),request:request()};` | E0451 w konstrukcjach struct field | Tylko trzy pola Autoryzowane zmienione do pubu; te same kompilacje ciała |
| private-request-mutation | `let a=authority(); let mut w=a.authorize(principal(),request()).unwrap(); w.request.cost=0;` | E0616 Pole wniosku | Proszę tylko o pub polowy; te same kompilacje ciała |
| no-clone | `let a=authority(); let w=a.authorize(principal(),request()).unwrap(); let _copy: Authorized<'_> = w.clone();` | E0599 klon | dodać wyraźny impl klonu dla autoryzowanego, że klony tylko jego własnością payload/request pola i kopie principal/reference; te same kompilacje ciała, rekordy API celowo zrelaksowane |
| moved-witness | `let a=authority(); let w=a.authorize(principal(),request()).unwrap(); drop(w); let _=w.request();` | E0382 do późniejszego użycia | alternatywa dla konsumentów `let w2=a.authorize(principal(),request()).unwrap(); let _=w2.request();` po upuszczeniu następuje. Aby udowodnić kontrolę ruchu API, nie-klon zrelaksowane źródło plus konsument `drop(w.clone()); let _=w.request();` odnosi sukces. Czy NOT dodać Kopia do String-owning świadka |
| live-policy-borrow | `let mut a=authority(); let w=a.authorize(principal(),request()).unwrap(); a.replace_grants(vec![]); let _=w.request();` | E0502 przy mutacji zastępczej | odłączony wariant władzy zmiany Autoryzowane <'a> do Autoryzowanego z autorytetem pola: usize; Authority nie ma wyraźnego zwrotu za całe życie i przechowuje 0; prywatne destrukturyzacja zachowane; usunąć okresy życia we wszystkich autoryzowanych zastosowań typu. Ten sam konsument potem kompiluje. To jest celowo osłabione źródło, nigdy nie wysłane |
| private-admit | `let a=authority(); let w=a.authorize(principal(),request()).unwrap(); service_authorization_workshop::boundary::admit(w, todo!());` | E0603 granica prywatna na ścieżce kwalifikowanej | nie można powołać się na prywatne przyjęcie. Relaxation granicy eksportu i przyznać plus AdmissionState typu i zapewnia pub fn empty_state () - > AdmissionState wewnątrz granic tylko w zrelaksowany źródło; alternatywne relaksujące rozmowy konsumenckie przyznać (w, & mut empty_state ()) i kompilacje; zgłosić dokładnie zmieniony konsument, nie fałszywie twierdzą identyczny organ |
| consuming-admit-internal | tymczasowe badanie na dziecko definiuje authA, stan; w = autoryzacja; `admit(w,&mut state)` to `admit(w,&mut state)` | E0382 przy drugim przyjęciu | Pozytywne kwestie konsumenckie drugi świeży w2; oddzielny klonowy relaks pierwszy telefon przyznać (w.clone (),...) następnie drugi przyznać (w,...) kompiluje. Sonda jest wewnętrzna, nie fałszywie zewnętrzna. |

Nie istnieje publiczna służba przyjmująca świadków API; jest ona sprawdzana przez
zamrożoną API inspekcję wywozu źródła oraz stałą zewnętrzną `service.submit(w)` sondę nieuprawnioną
dającą E0061 (błędna liczba argumentów) plus poprawną `service.submit(principal(),request())` wartość bazową. Nie należy
wymyślać nieistniejącej nazwy metody i liczyć E0599 jako gwarancji bezpieczeństwa. Władza
A/B Zachowanie jest rzeczywistym testem semantycznym powyżej. Alternatywy moved-witness/API dla
konsumentów są wyraźnie odmiennymi kontrolami, a nie twierdzeniem, że usunięcie
prywatności powoduje zniknięcie własności.

## V2 — zamknięte rozszerzenie topologii archiwum A10 wymagane do zachowania zgodności

Obserwowany bloker: scripts/verify-client-retry.ts: 245 Xen291 akceptuje empty/13legacy par / spuścizny + powtórnie; .github/workflows/ci.yml: 102
generuje wszystkie archiwa przed stabilnym ponownym uruchomieniem: 123 i MSRV powtórka:
243. A11 dodaje dwa pliki, więc dziedziczony weryfikator potrzebuje **stałe autorskie pary następców**, a nie otwarte
zwolnienie.

Zachowaj legacyRetryArchiveProjectIds Dokładnie bez zmian. Nie zmieniaj nazw par. Dodaj stały import bezpośredni
serviceAuthorizationPackage (producent nie może importować course.ts, unikając cyklu), oraz authorizationArchiveNames pochodzi z jednego
stałego identyfikatora. Rozszerz RetryArchiveTopology związek z `"post-authorization-generation"`. classifyRetryArchiveTopology dozwolone nazwy są tylko
oryginalne26 + retry2 + autoryzacja. Państwa: empty0; pregeneracja26; postgeneracja28;
post-autoryzacja-generacja30. Wymagane pełne legacy26 dla jakiegokolwiek niepustego
stanu, either0or2 ponownych wpisów, either0or2 auth wpisy, a obecny aut oznacza ponowne
obecne. Dziedzictwo 28 wejść +auth/no-retry kształt jest nieważny. Odrzucenie nieznanych nazwisk,
par częściowych, błędnej spuścizny. Nie ma listy dozwolonej zbudowanej z arbitralnych
bieżących projektów; nie ignoruje się nowych katalogów archiwalnych.

Rozszerz assertRetryArchiveTopology(migawka, generatedRetry?, generatedAuthorization?) z trzecim opcjonalnym argumentem hash-pair o tym samym
kształcie {starter, roztwór}. W przypadku pogeneracji i po wydaniu zezwolenia require/verify
powtórne pary hash; dla poautoryzacji-generacja również require/verify Autoryzacja hash pair.
Wcześniejsze calls/tests on0/26/28 pozostają niezmienione i ważne. W runClientRetryVerification, budować stałe zezwolenie starter/solution
bajty w pamięci z buildProjectArchive I oblicz hasze przed pierwszym stwierdzeniem; podaj obydwie pary
przed i po. Nigdy nie pisz ani nie usuwaj plików publicznych. Zachować równość topologii
AND pełne migawki głębokiej równości before/after Dokładnie nietknięty. Dodaj oczekiwaną
autoryzację member/source/hash rejestry do zgłaszania (pole addycyjne), zachowujące oryginał archive/result
Dowody. Brak zmian w ekstrakcji pakietu ponownie próbnego lub jego tubylców13 dodatnich
rodzimych controls/mutants.

Testy przeprowadzone w scripts/verify-client-retry.test.ts zachowują wszystkie istniejące twierdzenia i adnotacje o
nazwie sprawy: `accepts_fixed_authorization_successor_pair` (synthetic30), `preserves_pre_authorization_28_state`, `rejects_partial_authorization_pair`, `rejects_authorization_without_retry`, `rejects_unknown_successor_even_with_valid_authorization`, `rejects_tampered_authorization_starter`, `rejects_tampered_authorization_solution`, `requires_authored_authorization_hashes`, `binds_real_30_archive_bytes_and_detects_change`. Ostatnio
tworzy wszystkie old28 z rzeczywistych zarejestrowanych pakietów poprzedników i stałe
auth2 przez budowniczego w własnościowym tmp, twierdzi hash następnie zmienia jeden auth
ZIP, potwierdza odrzucenie; porównuje niezmienione oryginał28 before/after. Istniejące
dotychczasowe utwory utrwalenia pozostają legalnymi jednostkami topologicznymi, ale nie
prywatne prawdziwe stare dowody opiekuńczego28.

Publiczna osłona migawek nowego weryfikatora autoryzacji niezależnie oczekuje either0/26/28/30
zamknięte znane topologie, przy użyciu tej samej wyraźnej stałej pary semantyki (ponowne
użycie pomocnika wywożonego z ponownego próby jest dozwolone, brak wywołania weryfikacji
powtórnej). Dla każdego obecnego old28 porównać z authorized bieżącego pakietu bajtów i
autentycznych prywatnych poprzedników bajtów w kwalifikacjach root; brak roszczenia
pochodzenia od syntetycznych hash. Jego przebieg nie może nigdy generować publicznych
plików. `npm run content:packages` jest odrębnym działaniem w zakresie wytwarzania aktywów. CI dodaj stabilną
`npm run content:authorization` natychmiast po ponownym ustabilizowaniu, i dokładne MSRV Zaproszenie natychmiast po
retryMSRV, zachowując każdy pierwotny krok. akceptacja nowego weryfikatora nie może
wymagać świeżo wygenerowanych aktywów do celów standaryzacji0; production/CI Kwalifikacje wymagają
w szczególności aktualności 30.

Ostatnie świeże polecenia po wszystkich 30 aktywów istnieją: skoncentrowane Vitest scripts/verify-client-retry.test.ts;
`npm run content:client-retry`; `npm run content:client-retry -- --msrv`; `npm run content:authorization`; `npm run content:authorization -- --msrv`. Root migawki all30 before/after każdy, udowadnia old28 dopasować prawdziwy
przechwytywanie, dokładne new2 authored bajtów, i zero byte/topology zmiany. Brak zainstalowanych
narzędzi zatrzymuje; brak ukrywania nowej pary, aby odziedziczone czeki przejść.

## V2 — zamknięta lista dozwolonych plików i zadań wdrożeniowych

Tylko ścieżki wymienione w niniejszej sekcji mogą ulec zmianie. Rzeczywista wymagana
dodatkowa ścieżka jest poprawką zrewidowaną przed edycją, a nie pozwoleniem na
rozszerzenie zakresu. Stare badania historyczne wymienione tutaj zezwalają jedynie na
zmianę składu import/projection, bez zmian assertions/names/counts/hashes. Każda zmieniona ścieżka historyczna jest wymieniona w
raporcie końcowym.

Nowe pliki (Właściwość zadania poniżej):

- src/content/service-authorization-contracts.ts
- src/content/service-authorization-assessment-fixtures.ts
- src/content/service-authorization.ts
- src/content/service-authorization-assessment.test.ts
- src/content/service-authorization-integration.test.ts
- src/content/service-authorization-metadata.test.ts
- src/content/service-authorization-compatibility-fixture.ts
- src/content/service-authorization-compatibility.test.ts
- src/content/projects/service-authorization.ts
- src/content/projects/service-authorization/fixtures.ts
- src/content/projects/service-authorization/package.test.ts
- scripts/verify-authorization.ts
- scripts/verify-authorization.test.ts
- tests/e2e/service-authorization.spec.ts
- docs/service-authorization.md
- plans/002-typed-authorization.md (kopie korzeniowe jedynie zrewidowanego przenośnego wariantu publicznego
  pochodzącego z tego prywatnego planu)

Istniejące pliki functional/live: src/content/course.ts; src/engine/course-route.ts; src/engine/course-route.test.ts; src/content/prerequisite-entries.test.ts; src/domain/project-package.test.ts; tests/e2e/module-search.spec.ts; tests/e2e/archive-notices.helper.ts (tylko dokładne nowe mapowanie
domyślnego powiadomienia, jeżeli pomocnik wymaga takiego mapowania, brak zmian w
polityce kanonicznej); src/content/service-client-retry-metadata.test.ts (tylko projekcja, nie zostały wydane w trybie live asertion);
scripts/verify-client-retry.ts i scripts/verify-client-retry.test.ts (tylko skalowane rozszerzenie topologiczne); package.json (dwa nowe skrypty npm `content:authorization`
i `test:authorization`); vitest.config.mts (w tym nowy test weryfikatora); .github/workflows/ci.yml (dwa native
invocations); README.md; docs/advanced-curriculum.md; docs/curriculum-reconciliation.md; docs/local-development-queue.md; docs/oss-provenance.md; docs/oss-provenance.json; plans/README.md. Hak do produkcji wstępnej dla
nowego weryfikatora nie zawiera npm: wyraźna treść: wytwarzanie pakietów pozostaje
odrębnym działaniem, a zamknięty weryfikator samodzielny pozostaje tylko odczytem w
archiwach publicznych.

Historyczne pliki tylko kompozycji, pełny obserwowany A10 -lista konsumentów:

src/content/abstraction-integration.test.ts; src/content/dependency-maintenance-compatibility.test.ts; src/content/runtime-allocation-integration.test.ts; src/content/unsafe-miri-initialized-prefix.test.ts; src/content/unsafe-miri-mut-slot-with-mut-compatibility.test.ts; src/content/shared-borrow-calibration.test.ts; src/content/ownership-foundation-transfer.test.ts; src/content/unsafe-miri-prefix-compatibility.test.ts; src/content/capstone-maintenance-compatibility.test.ts; src/content/capstone-verification.test.ts; src/content/api-frame-protocol-maintenance.test.ts; src/content/api-frame-protocol-maintenance-compatibility.test.ts; src/content/unsafe-miri-slot-lazy-init-compatibility.test.ts; src/content/existing-contract-repair-compatibility.test.ts; src/content/fallible-composition-integration.test.ts; src/content/unsafe-ffi-integration.test.ts;
src/content/async-lending-send-compatibility.test.ts; src/content/baseline-correction-integration.test.ts; src/content/fuzz-evidence-integration.test.ts; src/content/async-lending-transfer-compatibility.test.ts; src/content/core-practice-integration.test.ts; src/content/unsafe-miri-mut-slot-with-mut-a9-compatibility.test.ts; src/content/documentation-guided-repair-integration.test.ts; src/content/unsafe-miri-disjoint-ranges-compatibility.test.ts; src/content/performance-investigation-compatibility.test.ts; src/content/service-client-retry-compatibility.test.ts; src/content/async-lending-cancel-compatibility.test.ts.

Nie edytuj starych implementacji adaptera. Nowy adapter eksportu historycalBeforeA11
plus precyzyjnie skomponowane opakowania odzwierciedlające każdy stary importowany
łańcuch: każde opakowanie jest oldChain (historicalBeforeA11 (wejście)). A10 Test
zgodności import live namespace jako rawCurrentCourse i wiąże currentCourse =
historicalBeforeA11 (rawCurrentCourse), zachowując asercje, w tym jego zamierzone
manipulacje syntetyczne near-miss/default. A10 metadane importowane na żywo w przestrzeni nazw i
projekty raz do A10 -prąd, jak już określono. Nowe testy A11 wykorzystują
nieprzewidywane rejestry na żywo. Stare przechwycone aktualne oczekiwania route/package dotyczące
dostępności są twierdzeniami na żywo tylko w czterech wyraźnie wymienionych bieżących
ścieżek testowych dostępności; aktualizacja liczy się do obserwowanego rejestru
końcowego, zachowanie dokładnych wektorów Core17 i życiorysy historyczne.

Generowane własne produkty: public / projects / service-authorisation-warsztat /
{starter, solution} .zip (tylko nowa para), test-results, .next, existing generowane
cache. Nigdy nie włączaj ich do aresztu źródłowego z wyjątkiem wyraźnego archive/provenance polityka
inwentaryzacji; stare 28 bajtów nietkniętych. Brak wygenerowanych plików w
zapieczętowanych plikach A10 Scena, żadne symognium nie zapisuje się do zamkniętego
czasu pracy.

### T0 — opiekun główny zatwierdza zapis stanu i ustalony plan

Wejście: zaakceptowany poprzednik, zweryfikowany chwyt adapter/receipt. Wyniki: przyjęty prywatny IDs/API/manifest
i przenośny plan kopii. Zgodnie z informacjami przekazanymi przez root po faktycznym
wykonaniu, rejestr SHA e44b3a2c1673cea991b0aa4d56ad726b64d681662054723f29e6a93a45748761, kurs pełny SHA 310c52f02de0658c1adc7f59f2ae205379a5829291443d7523fe1d2f0cd1cbed; stan SHA e3c53796150268af8426d3ea9f47a3f0cd6aee692ebf0f88c149ad0ba2171b11; rachunek wykonania SHA
3b1bccf6b70b7ee81d6b48fdc18cb7f7e72045848ea36cf7786a66e14206dc0f. Są to obserwacje zgłoszone przez rodziców, a nie nowe wykonanie przez tego doradcę.
Root ponownie sprawdza rzeczywiste pliki badawcze przed wysyłką, weryfikuje clean639,
original3fixtures unforced, czwarty nie ma newevents/credit, 198trwających wierszy i all 15digests.
Nie należy ponownie uruchamiać wx przechwytywania ani zastępować ich po zmianie źródła.

### T1 — właściciel pakietu natywnego i API odpowiada za semantykę Rust, pakiet, weryfikator i topologię

Należy contracts.ts, projects/service-authorization.ts, projects/service-authorization/fixtures.ts, package.test.ts, scripts/verify-authorization.ts/.test.ts, scripts/verify-client-retry.ts/.test.ts, package.json, vitest.config.mts, .github/workflows/ci.yml. Root przypisuje implementation/evidence do
wniosku GPT-6 .1-Sol medium; brak zagnieżdżonego agenta wysyłki. Musi ustalić API/source kształt
i skoncentrowane rodzime testy przed T2 konsumuje artefakty. T1 nigdy nie edytuje
rejestru kursów, metadanych lekcji ani testów historycznych.

Eksport Handoff z contracts.ts dokładnie: `authorizationOperations` keyed `policy|attenuation|binding|admission`, każdy rekord `{ canonical: string, equivalent: string, starter: string, tests: string, recallTests: string, semanticMutants: readonly {name:string, source:string, expectedTest:string}[] }`; wszystkie struny kodu
są kompletne standalone operation-scoped Rust z V4 minimalny model rusztowania; żaden
nie jest kompletny rodzimy API. Dodaj `promptScaffold: string` do każdego rekordu operation/review dla rusztowania bez
rozwiązania wyświetlanego obok pustego edytora. Te rusztowania pomijają wszystkie inne
oceniane organy, podobnie jak warianty canonical/equivalent/mutant/recall. Pierwotne ukryte nazwy badań, odpowiednio
`authorization_policy_contract`, `authorization_attenuation_contract`, `authorization_binding_contract`, `authorization_admission_contract`; nazwy przypomnienia uzupełnione `_recall`. `authorizationOrdinaryReviews` posiada klucze `scopedAuthority|boundUse`,
każdy `{canonical,equivalent,starter,tests,semanticMutants}` z nazwami ukrytych testów `authorization_scoped_review` / `authorization_bound_use_review`. Starter zwykłych recenzji jest pusty w
warstwie zawartości; testy rodzime używać stałe pełne niekompletne ciało rusztowania,
aby potwierdzić odrzucenie starter zamiast udawać puste zeszyty.

Wywóz urządzenia do pakowania dokładnie `{libSource, starterLibSource, policyTests, attenuationTests, bindingTests, admissionTests, readme, threatModel, worksheet, compilerProbes, semanticMutations}` w ramach wskazanego eksportu (bez kursu
importowanego). Wszystkie primary/test tabele źródłowe i kontrolne podlegają kontroli przez T2.
Ładunek artifact/source bajtów musi być taki sam, jak w przypadku członków archiwum projektu; nie
prowadzono odrębnej implementacji "tylko dowód". Kontroluje szablon z tych bajtów, nigdy
network/learner wejścia. Udowodnić dziedziczną kompatybilność topologii w testach jednostkowych
przed kompletną generacją pakietów. Wstępne sprawozdania T1 są diagnostyczne do momentu
ostatecznego zamrożenia korzeni; nie składają wniosku o przyjęcie.

T1 weryfikuje: `node node_modules/vitest/vitest.mjs run scripts/verify-authorization.test.ts scripts/verify-client-retry.test.ts src/content/projects/service-authorization/package.test.ts`; nowe komendy rodzime stable/MSRV; asercje zawierają aktual14 nazwane testy
rodzime i każdą stałą klasyfikację mutant/probe. Nowy test npm: autoryzacja uruchamia wyraźne
pliki skoncentrowane, bez domniemanej mutacji źródłowej.

### T2 — właściciel treści i dowodów odpowiada za lekcje, rodziny zadań i zgodność

Zaczyna się tylko wtedy, gdy T1 API/contract struny są stabilne i root przejrzał to przekazanie.
Jest właścicielem nowego content.ts, assessment-fixtures.ts, assessment/integration/metadata/compatibility badania i adapter; course.ts, course-route.ts, live route/prerequisite/package test
liczenia, każdy wymieniony plik historyczny tylko skład i A10metadata Opakowania. Konsumenty T1
wywóz bez zmian; sprawozdania API brak zgody na root, nie łata T1 źródło
jednostronnie. Wdrażanie24 steps/two zwykłe przeglądy i mrożone tożsamości, testy dowodów,
rzeczywiste uchwycenie wiążące i brak nowych wartości czasu trwania.

Assessment-fixtures.ts wywóz `serviceAuthorizationAssessmentFixtures`, dokładna mapa dla ośmiu podstawowych apply/blank IDs, cztery przypomnienia IDs
oraz dwa przeglądy IDs (14 wpisów). Każda mapa jest kompletna w skali operacyjnej. canonical/equivalent/source
semantic-mutant list/test ciało plus spodziewany nazwany ukryty test. Na ślepaki canonical/equivalent i mutacje
alias tej samej rodziny operacji; ich kod uczący pusty. Sprawdzanie początkowe jest
oddzielnie kompletny szkielet, lub spodziewane odrzucenie kompilacji dla prawdziwego
pustego źródła, nigdy nie błędnie oznaczony mutant semantyczny. Prediction/model/rubric brak na mapie
assessment-mocowanie. Canonical/equivalent kompilacja + pass i semantyczne mutanty kompilacja +
niepowodzenie dokładne stwierdzenie dla wszystkich 14 mappings na zainstalowanych
stabilnych; nowy weryfikator pakietu obejmuje podstawowe operacje w obu łańcuchach
narzędzi. W pełni normalny Rust corpus działa na obu.

Testy dowodzą, że jedna rodzina do zastosowania + puste, brak kredytu podstawowego z
recap/review/diagnostics/reveal, dwie odrębne czyste rodziny na koncepcję, opóźnione kwalifikowalności niezmienione
ściśle > 24h, all14 poprzedników obiektów projektu i każde dziedzictwo step/source/function odniesienie
zachowane. Metadane nazwane testami: `all_four_authorization_lessons_omit_minutes`, `predecessor_198_duration_presence_is_exact`, `invalid_explicit_authorization_minutes_are_rejected` for0, -1,NaN, + Infinity. Bez zmian
schematów.

T2 weryfikuje skoncentrowane pliki treści, istniejące testy A10metadata/compatibility (przewidywane
niezmienione twierdzenia), wszystkich konsumentów składu, zawartość: check/audit/manifests, dokładne
kwalifikacje do prywatnego przechwytywania. Przed wywołaniem strukturalnej awarii
testowej "nieświeży licznik" klasyfikować historyczne vs wyraźnie zatwierdzone ścieżki
na żywo.

### T3 — właściciel przeglądarki i dokumentacji zapewnia dowody integracji i pochodzenia

Rozpoczyna się po stabilnym rejestrze T2. Posiada nowy spec przeglądarki, live
module-search number change, opcjonalne dokładne odwzorowanie informacji pomocniczej,
docs/service-authorization.md i README/current curriculum/queue scoped wpisy. Root posiada ostateczne zamknięcie zapasów plans/provenance,
wykorzystując klasyfikacje materiałów T3 i dane archiwalne T1. Brak zmian
funkcjonalnych UI. Root (nie T3) przyznaje production/browser runtime/controller za istniejący przepływ własności.

Nazwany test przeglądarki: `authorization_resume_preserves_predecessor_assistance_and_drafts`, `authorization_families_keep_help_and_retrieval_separate`, `authorization_downloads_exact_starter_and_solution`, `authorization_keyboard_390_and_source_exposure`, `authorization_offline_reload_records_new_neutral_exposure`, `authorization_out_of_order_browsing_does_not_expose_other_family_solutions`. Fourth seed capture A10
assistance equipment transparently through portable equivalent (private raw equity not
imported by public tests), invise raw history/resume and no new-family credit; test new draft/note reload.
Uruchom wszystkie z odczytywania0 przeciwko własnościowej produkcji. Pobieranie testów
kontrolnych14 członków paths/notices i dokładnych bajtów; roztwór ujawnia znaki wszystkich ośmiu
pseudonimów pierwotnych, wspomaganych przez prawdziwy silnik. Rdzenne prośby są
symulowane wyłącznie na potrzeby sprawdzenia interfejsu i stanu oraz oznaczone jako symulacja.

Ostateczna sekwencja weryfikacji korzeni obejmuje T1 odziedziczone kontrole powtórne
aktualności; kompletne static/unit/authored Rust/native wymagania; końcowe zbudowanie / skoncentrowanie + pełne
browser/formaloffline; niezależny source/evidence przegląd; lokalne English commit; niezależnie odrestaurowany pełny
pakiet. Żadne nowe testy publiczne nie mogą zależeć od prywatnych ścieżek macierzystych.
Znaczniki korzeniowe aplikacja zamrażać i później metadane zamknąć wyraźnie.

## V2 — rozstrzygnięcia przeglądu i warunki dopuszczenia

R1 metadane: niezmienione A10 badanie przewidywane przez A11 Tylko; nowy niezależny
plik metadanych na żywo. R2 API: zamknięty constructors/accessors/actionset/private module/ledger nasiona i rusztowania zadaniowe. R3
Przekaźniki: mrożone IDs,24kroki, 14oceny wpisów, 14rodzimych testów,M01–M16 mutacje, 8
compiler/control kategorie (w tym niewłaściwe korzystanie ze służby świadków), dokładne file/task granice
oraz CI. R4 tłumienie: dziecko zainstalowane wyraźnie, oryginalna szeroka polityka
pozostaje do czasu wyraźnego zastąpienia. R5 topologia: stałe następczy2, strict0/26/28/30 stany,
stare 28 opieki, all 30 before/after i świeże odziedziczone stable/MSRV.

To v4 jest nadal **w oczekiwaniu na niezależną ocenę sytuacji na zimno**, a nie akceptacja realizacji. Warunki zatrzymania wykonawcy
obejmują wszelkie niemożności zrealizowania zamrożonego API bez narażania prywatnego state/unchecked
przyjęcia świadka, każdą kontrolę, która nie powiedzie się z niewłaściwym diagnostic/assertion, wszelką
potrzebę rozszerzenia listy dozwolonych plików lub jakichkolwiek rozbieżności snapshot/projection. Root
może dokonać udokumentowanej korekty ograniczonej, a następnie ponownie przejrzeć
zmienioną umowę przed wysyłką; nie wymaga się pozwolenia na podróż w obie strony.


## Historyczna notatka z samooceny V3 z 4 listopada 2026 r., zastąpiona przez przegląd V4

Ukończony projekt v2 został odczytany poprzez jego ostateczne warunki wysyłki; nie
został skrócony. Pozostaje on identyczny z danymi path/hash. To v3 zaostrza sondę bez klonu za
pomocą wyraźnego typu rezultatu `Authorized<'_>`, unikając przypadkowych dowodów na obecność klonów
odniesienia i koryguje kategorię kompilatora liter do ośmiu (siedem wierszy tabeli plus
Service submit asumpt sonda). Nie edytowano plików źródłowych i nie uruchomiono żadnych
importowanych, kompilacyjnych, testowych, przeglądarek, instalacji, commitów ani
zdalnych mutacji dla tej rewizji.

Kontrole pożyczania celowo wykorzystują świadka po `replace_grants`; nieleksyczny okres życia może
pozwolić na mutację po jego ostatnim użyciu, nawet przed zakończeniem się jej zakresu
leksycznego. Ani lekcja, ani test nie mogą twierdzić, że zakres leksyczny zabrania
aktualizacji. Rzeczywiste pole `&Authority` jest wyborem pedagogicznym; PhantomData nie jest powszechnie
uznane za niezdolne do wiązania przez całe życie. Wszystkie sondy direct-construction/mutation używają
zamrożonych faktycznych `authority`, `principal`, `request` pól i dokładnych typów, więc E0560/misspelled-field błędów nie są
akceptowane substytuty dla E0451/E0616.

Ustawienie przepełnienia jest tylko prywatne cfg (test) i wyraźnie przetestowane w
debugowaniu i wydaniu: akceptowane = MAX, opłata = 0, koszt = 0 zwraca CounterOverflow z obu
liczników bez zmian; przyjęte = 0, opłata = MAX, koszt = 1 również zwraca CounterOverflow z obu
niezmienionych. Limity wynoszą MAX/MAX i akceptują = prawdziwe w obu przypadkach. Służba
publiczna zawsze zaczyna od zera liczników i nie może reset/reseed ich; zmiana oddzielonego LedgerSnapshot
nie może go mutować.

Raporty początkowe odbioru akceptacji SHA256 `2571f4c35e6782fd9cec40a11bea8434412b30eea39f263b8ea363ea592c0b66`, niezmienione oryginalne registry/state
przechwytywania i czyste przyjęte źródło po wznowieniu pracy. Potraktuj to jako metadane
rodzicielskie, a nie niezależną egzekucję tego doradcy. W dniu V3 te manifesty zostały
zaproponowane do zimnego przeglądu; przegląd ten wymagał V4 odizolowania lekcji, uprząż
i dokładnych korekt schematów poniżej. Nie są one zielonym wynikiem wdrażania.

## V4 — zamknięty zakres przekazania źródeł lekcji i rozstrzygnięcia przeglądu

Pełną rodzimą paczkę. API, członkowie, 14 testów pozytywnych, M01–M16 mutacje, sondy
kompilacyjne, ownership/setup zasady i zmiany topologiczne pozostają zamrożone powyżej. Ta sekcja
określa różne modele lekcji, więc edytor nie ujawnia odpowiedzi innej ocenianej rodziny.
Rzeczywisty biegacz w src/runner/index.ts: 111 English 118 dołącza dziecko z korzeniem skrzyni `use super::*`; nie
wstrzykuje testów wewnątrz granic. Istniejący pomocnik pomocniczy src/content/learning-context.ts: 176 Employ198 propaguje
zarejestrowane flagi tej samej rodziny; nie sprawdza kodu dla wycieków implementacji. W
związku z tym prawidłowa izolacja zawartości i rzeczywista inspekcja źródła są
obowiązkowe niezależnie od badań państwa udzielającego pomocy.

### Dokładne interfejsy lekcji objętych zakresem

Każda deklaracja w tych modelach lekcji jednego pliku jest skrzynia-root prywatny
(zwykły `struct`, `enum`, `fn`, `impl`, bez pubu). Korzeń prywatne przedmioty pozostają dostępne dla
dołączonego ukrytego dziecka poprzez użycie super: *. Nie `mod boundary`, brak niezamkniętego
fragmentu modułu, brak alternatywnego, ukrytego wtryskiwacza do badań, brak publicznych
funkcji nasion. Pole typu danych współdzielonych shapes/derives odpowiada definicjom rodzimym,
jeżeli są obecne; widoczność celowo się różni. Types/accessors to rusztowania, a nie nowe operacje
ocenione. Poniżej, Zakazane ograniczenia dotyczą startera, promptSccaffold, kanoniczne,
równoważne, semantyczne warianty, wycofania, zwykłego przeglądu, przykłady, wskazówki i
kod we wszystkich krokach model/trace.

1. **Model polityki:** Dozwolone typy PrincipalId, TenantId, ResourceId, Dyrektor, Zasoby, Działanie, ActionSet, Zakres, GrantSpec,
   Wniosek, Odmowa, Organ. Urząd zawiera jedynie dotacje: Vec <GrantSpec>; metody nowe i
   ocenione decydują wyłącznie. ActionSet ma nowy, zawiera i subset_of płyta kuchenna. Request/GrantSpec/identity Dosłowna
   konstrukcja jest rusztowania. Nie replace_grants lub inna metoda zarządzania polityką jest
   konieczna. Zakazane deklaracje: tłumienie, autoryzowane, autoryzowane, AdmissionState, Limity,
   przyjęte, AdmissionRejection, SubmitError, Usługa, poddać, przyznać. canonical/equivalent decyduje o algorytmie i
   dokładnych testach politycznych zachowuje wcześniejszą umowę. Jej odzyskanie może
   zmienić wartości, ale nie może wprowadzić innych operacji.

2. **Wzór oceny:** dozwolony typ PrincipalId, TenantId, ResourceId, działanie, ActionSet, zakres, GrantSpec, AttenuationError; ActionSet metody
   pomocnicze, jak wyżej; oceniany tylko wolny tłumienie. Zakazane oświadczenia:
   Dyrektor, Zasoby, Wniosek, Odmowa, Organ, zdecydować, Autoryzowane, autoryzacja, AdmissionState,
   Limity, Akceptowane, AdmissionRejection, SubmitError, Usługa, przedłożyć, przyznać. Ukryte testy porównują
   dokładne wartości dla dzieci i kończą się subset/scope/cost przypadków przy użyciu bezpośrednich
   twierdzeń stołowych. Każda skończona oracle prośba jest ukrytym kodem testowym
   wyrażonym krotkami i dosłownie oczekiwanymi zbiorami, a nie autorską funkcją
   polityczną dostarczaną w źródle uczącym się. Połączony przykład usługi załadowanej na
   dziecko jest śladem prozy input/result i rzeczywistym testem integracji rodzimej tylko; nie
   wyświetla polisy, wiążących lub dopuszczania organów funkcyjnych.

3. **Model wiążący:** dozwolone PrincipalId, TenantId, ResourceIdDyrektor, Resource, Action, Request, Denial, Authority,
   Authorised. Pola autoryzacji są dokładnie `expected_principal: Principal`, `expected_request: Request`, `decision: Result<(), Denial>`. Konstruktor `fn fixture(expected_principal: Principal, expected_request: Request, decision: Result<(), Denial>) -> Self` Ukrywa je.
   Jego prywatne stałe uzależnienie `fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial>` jest dokładnie: `principal == self.expected_principal && request == &self.expected_request` return self .decision,
   ordinary Err (Odmowa::NoMatchingGrant). Jest to determinalistyczny test kontrolny dwukrotnie,
   wyraźnie oznaczony w polskich sugestiach i komentarzach Rust; nie ma grants/tenant/scope/action logika
   autoryzacji. Oceniane `fn authorize<'a>(&'a self, principal: Principal, request: Request) -> Result<Authorized<'a>, Denial>` nazywa, że zależność następnie przenosi oryginalne
   wartości do autoryzacji. Upoważnione pola dokładnie `authority: &'a Authority`, `principal: Principal`, `request: Request`, wraz z
   kapitałem ()/request() accesors tylko do odczytu; Debug only, no Clone/Copy. Zakazane
   oświadczenia: GrantSpec, Zakres, ActionSet, atenuate, AdmissionState, Limity, Akceptowane, AdmissionRejection, SubmitErrorSerwis,
   poddaj się, przyznaj, replace_grants. Jedynym dozwolonym organem decyzyjnym jest dokładny stały
   podwójny test; rzeczywisty rodzimy organ polityczny jest zabroniony pomimo dzielenia
   się nazwą metody.

Wiążące ukryte przypadki niezależnie tworzą równe i rzeczywiste wartości żądań z
literałów (nie wymaga klonu), a następnie weryfikują dokładne forwarding/return własności P1/Q i P2 z
innym tenant/resource/action/cost/Unicode ładunku. Skonfiguruj Ok (()), Err (TenantMismatch) i Err (NoMatchingGrant) na dokładnie oczekiwanych
danych wejściowych; obydwa warianty zaprzeczania propagują się bez świadków. Niezależnie
od niedopasowania kapitału, zasobów, działań, kosztów i obciążenia, aby udowodnić, że
nie przyjęto reconstructed/substituted argumentów. Test kanoniczny i jednoznaczny odpowiednik dopasowania.
Mutanty modelu kompilacji: wiążą pusty ładunek; łączą principal0; pomijają zależność i
zawsze konstruują świadka (konfigurowane zaprzeczenie musi się nie udać); dzwonią
zależności ze zmianami payload/principal (konfigurowane dodatnie musi zawieść). Są to stałe warianty
źródłowe, a nie substytuty do kontroli natywnych M10/M11 i fasady. Z tego modelu nie robi
się żadnego uwierzytelniania rodzimego, prawdziwej polityki ani roszczenia o prywatność
zewnętrznej skrzyni.

4. **Wzór przyjęcia:** dozwolony PrincipalId, TenantId, ResourceId, Dyrektor, Zasoby, Działanie, Wniosek, `struct Authority;` (marker
   jednostkowy, Debug tylko), Upoważniony z dokładnie borrowed-marker/principal/request pól powyżej, Limity, AdmissionState,
   Akceptowany, AdmissionRejection, plus ocenione private free przyznać. Dozwolone metody głównego
   odczytu () /request (); nie są wymagane metody Urzędu ani metody autoryzowane. AdmissionState Pola
   korzeniowe pozostają prywatne accepting/accepted/charged_cost/limits, podobnie jak w przypadku wyposażenia rodzimego.
   Zakazane declarations/methods: Zakres, ActionSet, GrantSpec, Zaprzeczenie, SubmitError, zdecydować, upoważnić,
   złagodzić, Serwis, złożyć, osprzęt, replace_grants, i każdego publicznego konstruktora ksiąg.
   Kryte testy korzeniowe używają wartości literalnych Authority/Authorized/state do testowania operacji
   księgowej na dalszych etapach i dokładnych zwróconych pól, w tym liczników MAX. Nie
   dowodzą, że ci modelowi świadkowie byli upoważnieni. Sam pakiet rodzimy dowodzi
   prawdziwej autoryzacji, prywatnej budowy, fasady własnej władzy i komponowania go z
   tymi samymi zasadami przyjmowania. Canonical/alternate/semantic Warianty zawierają tylko ten model działania;
   brak dostarczonej odpowiedzi politycznej.

Zwykły przegląd `review-service-scoped-authority` jest tylko w zakresie tłumienia (model 2); `review-service-bound-authorization-use` jest tylko wstępem
(model 4). Każda lekcja odwołuje się do własnego modelu. Eksport ze źródeł zadaniowych
pozostaje tym samym interfejsem rekordowym plus promptScaffold, ale kompletne źródło
samodzielne oznacza teraz kompletny **model o minimalnej skali**Nigdy nie jest to kompletny, rodzimy pakiet.
Native source pozostaje wyłącznie w projects/service-authorization/fixtures.ts; kontrakty na lekcje nie mogą importować pełnego
libSource.

### Kontrakt pustego edytora i ujawniania źródeł

Wszystkie cztery puste kroki i obydwa zwykłe przeglądy mają `code: ""` dokładnie; nie pomijać
kodu lub uzupełniać go później. Prompt obejmuje odpowiednią nierozbudowaną rusztowanie
ogrodzone jako rust z ocenianym organem funkcyjnym `todo!("implement this operation")`. Osoba ucząca się proszona jest o
skopiowanie dostarczonych deklaracji, a następnie samodzielne wykonanie operacji; nie
odtworzenie całej skrzyni. Apply/recall może dostarczyć ten sam rozrusznik w edytorze. Brak
promptScaffold zawiera canonical/equivalent ciała, a żaden rusztowania nie zawiera innego ocenianego
ciała. Puste aliasy zachowują tę samą rodzinę, co stosowana; pusty edytor nie jest
dodatkowym kredytem. Starter/test Dowody odróżniają odrzucenie przez kompilację dosłownie pustego
wejścia od odrzucenia semantycznego kompletnego rusztowania todo.

Predict/model/reflect Etapy zawierają jedynie tabele prozy i literalne input/result, brak funkcji wykonywalnych lub
pełna lista źródeł rodzimych. Wskazówki mogą opisywać invariantów, ale nie mogą
obejmować wdrażania innych rodzin. Przerobione policy/attenuation/binding/admission Ślady pokazują dane i wyniki, przy
czym zależność wiążąca oznaczała podwójne badanie, a świadek wstępu oznaczał stałe
wejście do badania. Złączony ślad tłumienia wyjaśnia konfigurację hosta bez wyświetlania
usługi:: przesłać lub zdecydować o implementacji. Pobieranie pakietów jest odrębnym
miejscem dla pełnego kodu skomponowanego; narażenie na działanie roztworu rejestruje się
przez jego dokładne refs. Native worksheet/README może omawiać złożone API; pakiet startowy posiada
wszystkie cztery organy wdrażające i nie może zawierać rozwiązań referencyjnych w comments/docs/tests.

### Dokładny obiekt metadanych i kontrole rzeczywistych funkcji pomocniczych

Należy stosować istniejące schematy ProjectContract i ProjectPackage, a nie dodatkowe pola zależności:

- ProjectContract.id =`service-authorization`; lessonIds dokładnie cztery zamrożone lekcje w kolejności; reviewConceptIds Dokładnie. `["service-scoped-authority","service-bound-authorization-use"]`;
  pakiet =serviceAuthorizationPackage; lessonId=`service-authorization-policy`; adversarialLessonId=`service-authorization-admission`. Wszystkie inne wymagane właściwości prozy są autorskie
  w ramach istniejącego schematu.
- ProjectPackage.id =`service-authorization-workshop`; revealStepRefs dokładnie te zamówione pary: policy/apply, policy/blank, attenuation/apply, attenuation/blank, binding/apply, binding/blank, admission/apply, admission/blank,
  z pełną mrożoną lekcję i krok IDs z tabeli identyfikacyjnej; starterRevealStepRefs Dokładnie. `[]`;
  pliki dokładnie dziesięć autorskich ścieżek. Nie. workspaceMembers dla tej skrzyni z pojedynczym
  pakietem.
- Brama taskRefs pozostają jedynie kryteriami modułu. Źródło `conceptIds` istnieje dla lesson/evidence metadane
  jak zwykle, ale nie projekt conceptIds lub wymyślony projekt ogólny stepRefs pole jest
  wprowadzone. Bez zmian schematów.

Testy powołują się na istniejący faktyczny pomocnik do ekspozycji na opakowania z src/domain/project-package.ts, a
następnie assistanceForLessonStep/evidence logikę na każdym ósmym wskazanym etapie. Pobieranie roztworu musi oznaczać
wszystkie cztery rodziny wspomagane; starter musi pozostawić wszystko bez zmian.
Typecheck i surowy obiekt wpisując połów nieobsługiwane pola, ale pomocniczy produkowane
twierdzenia państwowe są nadal wymagane. Bezpośrednie badania wektorowe w terenie
potwierdzają dokładne osiem refs i puste starter refs, a nie luźne liczby.

### Ochrona przed ujawnieniem rozwiązań i weryfikacja rzeczywistym mechanizmem testowym

Dodać do service-authorization-integration.test.ts nazwanych testów `every_displayed_source_obeys_its_operation_declaration_allowlist`, `binding_dependency_is_exact_labeled_test_double`, `blank_and_ordinary_review_editors_are_empty_with_non_solution_scaffolds`, `model_and_prediction_traces_do_not_embed_assessed_bodies`, `package_solution_reveals_exact_eight_refs_and_starter_reveals_none`. Sprawdzić wszystkie warianty
uchwytu14 (canonical/equivalent/starters/semantic sterowane), cztery szybkie rusztowania, cztery recalls/two zwykłe przeglądy,
lekcja code/solutions i każdy ogrodzony blok Rust w prompts/hints/models. Sprawdź dozwolone type/function/impl deklaracje metod i
zabronione deklaracje z ograniczonym skanowaniem deklaracji; dokładna stała decyzja
wiążąca source/hash musi odpowiadać zatwierdzonemu organowi. Ponieważ kontrole tekstowe nie
mogą udowodnić żadnej ukrytej odpowiedzi, niezależny recenzent ręcznie odczytuje również
każde widoczne źródło i ślad danych, w tym komentarze i zakodowaną rust. Nie ubiegać się
tylko o kontrolę składni gwarantuje brak wycieku.

service-authorization-assessment.test.ts musi wywołać rzeczywisty import appendHiddenTests dla każdego kanonicznego, równoważnego,
kompilującego mutanta semantycznego i rusztowania, a następnie skompilować i wykonać
otrzymany kompletny plik. W szczególności, dopuszczenie MAX/capacity/budget testy prowadzone w
rzeczywistości `__rust_workshop_hidden_tests` dziecko i może uzyskać dostęp root-prywatny AdmissionState/admit bez dodatkowych
modułów wtryskiwanych lub materiału siewnego publicznego APIs. Weryfikacja canonical/equivalent
skompilować i przejść; każdy model mutant kompiluje przed nazwanym asertywnym
niepowodzeniem; puste puste źródło odrzucenie jest oddzielnie klasyfikowane. Zachowaj
stdout/exit/code Zróżnicowanie i stałe ograniczenie wejściowe autorstwa repozytorium bez zmian.
Rzeczywiste zewnętrzne kontrole konsumentów nadal kompilują się z całym pakietem
prywatnych granic, tak więc modele lekcji root-private nie osłabiają rodzimych API
wymagania.

Dodaj scenariusz przeglądarki `authorization_out_of_order_browsing_does_not_expose_other_family_solutions`: zacznij od braku rekordów nowej rodziny, przejdź do
dostępu przed polityką, sprawdź rzeczywiste źródło edytora i wyświetlony model/prompt dla
zakazanych deklaracji innych rodzin, a następnie wiążący wycofania i zwykłego przeglądu
skalowanego władzy, a wreszcie polityki puste (edytor naprawdę pusty; Short scaffold
zawiera tylko deklaracje polityczne). Przeczytaj tekst DOM editor/source, nie tylko importowany
ciąg oprzyrządowania. Nie zaskakuj assistance/credit zdarzeń z przeglądania; jest to ważne, ponieważ
kontrola źródła oddzielnie ustanawia brak ekspozycji na odpowiedź. Ujawnione rozwiązanie
dotyczące dopuszczenia: należy wspierać jedynie rodzinę wpuszczających, a ujawnione
źródło nadal nie wdrożyło policy/attenuation/binding. Pobierz pełne rozwiązanie, a następnie potwierdź wszystkie
cztery rodziny wspomagane przez prawdziwych pomocników. Nie ma globalnego wsparcia ani
zmian w silniku dowodowym.

T1 jest właścicielem modelu skalowanego strings/test-double/source manifest i rodzimy pakiet niezależnie. T2
posiada treść declarations/metadata/non-leakage/integration/real appendHiddenTests kontrole oceny i przeglądy zostały obciążone. T3 posiada
rzeczywiste DOM niewłaściwy scenariusz i etykietowanie dokumentów. Nie wymaga się nowych
ścieżek plików poza istniejącą zamkniętą alfanumeryczną listą; dodatki testowe są
dostępne w już nazwanych plikach. Pełna rodzima test/control/topology manifesty nie ulegają zmianie; wyżej
wymienione dodatki do mutacji modelu lekcji to stałe kontrole skalowane z wyraźnymi
identyfikatorami w tym samym eksporcie urządzenia, nigdy dodatkowe rodziny pierwotne.

V4 rozwiązuje wszystkie trzy blokery recenzji: brak międzyrodzinnych źródeł
kanonicznych w zwykłych szafotach lekcyjnych; rzeczywista kompatybilność uprząż
root-child bez tylnych drzwi API; dokładne istniejące metadane package/project oraz przepływ
pomocniczy ekspozycji. Jest to korekta projektu oczekująca na oziębły przegląd, nie
przeprowadzana weryfikacja ani dowody wyników uczenia się.


## Granice publikacji przenośnej

Jest to wariant planu publicznego pochodzący z projektu prywatnego V4. `<private-stage>` oznacza
lokalną fazę dowodową będącą własnością operatora i `<accepted-predecessor>` jej zachowaną poprzednią fazę;
nie jest to również wymagana ścieżka maszynowa. Testy publiczne nie mogą odczytywać
prywatnych nagrań. Registry/state/custody Hash wiąże się oddzielnie posiadanymi obserwacjami prywatnymi, a
nie publicznym uzależnieniem od danych. Podać tylko ten wariant przenośny do plans/002-typed-authorization.md po
przeglądzie; nie kopiować maszynowych korzeni źródłowych lub prywatnych raportów
surowych do zawartości repozytorium.


## Wdrożenie przyjęte lokalnie 4 listopada 2026 r.

Warsztaty autoryzacyjne związane z wpisanym żądaniem są kompletne lokalnie przy funkcji
commit `bfeb1e31a11fd56410c6fe8230fd5e70a04e802e`, z rodzicem `5e80d31e8bfe5fa6b16a28c12e263f74959cc6a3` i dokładnie przetestowanym drzewem `5ad04894afc2ad36cc282392650e1488a75f98e1`. To drzewo funkcji
zawiera 655 plików źródłowych i zmienia 62 ścieżki. Dodaje cztery lekcje, 24 kroki, dwa
pojęcia, cztery różne rodziny zadaniowe i jeden projekt: dokładna decyzja polityczna,
monotone tłumienie, wniosek o pożyczenie organu i konsumowanie przyjęcia z
rachunkowością księgi. Pakiet rodzimy wykonuje prawdziwy prywatny API; modele lekcji z
zakresu skali zachowują wyraźnie oznaczoną wiążącą próbę podwójną i stałą wstęp świadka.
Synthetic principals and declarated cost not established authentication, TLS,
creditional handling, global replay prevention, distributed removal or measured resource
grands.

Świeże kwalifikacje ukończyły wszystkie 21 faz w tym samym źródle. Akceptowane
obserwacje obejmują 1 914 testów jednostkowych, 217 rekordów modelu lekcji, wszystkie 2
643 przypadków autorstwa Rust corpus w obu profilach oraz natywne kontrole pakietów w
obu profilach. Kompletna kampania przeglądarki produkcyjnej przeszła 205 zwykłych testów
i jeden dodatkowy prywatny scenariusz offline; formalna weryfikacja offline również
przeszedł. Te uruchomione przeglądarki nie miały żadnych skipów, powtórzeń ani słabych
wyników. Niezależny przegląd całej funkcji zwrócił READY _ FOR _ LOCAL _ FEATURE _ COMMIT po sprawdzeniu
rzeczywistych dowodów źródłowych i kwalifikacyjnych. Wcześniejsza nieudana diagnostyka i
jej oryginalne wejścia pozostają oddzielnie; nie są one przepisywane jako wyniki
przemijające.

Wykwalifikowana produkcja ID wynosi `9ZUGlByGqT3pFLWQRD-Sa`: 105 oryginalnych plików build pozostał
dokładny, z sześciu plików dodanych w trakcie własnego cyklu życia do ostatecznej
inwentaryzacji 111. Sprawdzono wszystkie 30 archiwów projektów i ich bajtów członków; 28
poprzednich archiwów pozostało niezmienione. Zachowano 198 wcześniejszych lekcji, ich
istniejące metadane dotyczące czasu trwania oraz historyczne wydarzenia uczące się,
flagi pomocy i niezależną dokumentację kredytową. Nowe lekcje nie wprowadzają żadnych
oszacowań czasu trwania. Przeglądanie, dostęp do źródła, skorzystanie z pomocy oraz symulowane lub
niedostępne odpowiedzi biegacza nie ustanawiają świeżych niezależnych kredytów lub
rodzimej Rust proof.

Kompletny pakiet źródeł-historii ma SHA256 `6c5361c6346f4fb4bc9ab265900d3feab05336bfbeff2320cd85a4875c78ebfa`. Zarówno wykonawca wdrożenia, jak i
oddzielny wykonawca przywrócić go do świeżych lokalnych repozytoriów i zweryfikować
wszystkie cztery refs, 450 commits w tym wszystkie 449 poprzedników commits, dokładna
funkcja HEAD/tree, oraz wszystkie 655 pliki źródłowe i tryby. Pełna kontrola integralności Git
przeszła; przywrócone repozytoria nie miały żadnych notatek, zastępców ani
współdzielonych inodes plików source/Git. Oddzielny niezależny manifest przywracania ma SHA256 `5d85f0165d15bfcd0c8922f02a6e726d4eb4fd8347245ec845884118cb64066e`.

Ta sekcja akceptacji i status indeksu tworzą późniejsze zamknięcie tylko dokumentacji w
dokładnie dwóch plikach Markdown. Ich późniejsze commit/tree należy zgłaszać oddzielnie od
badanej funkcji commit/tree powyżej; na tym późniejszym drzewie dokumentacji nie podaje się
żadnych świeżych testów produktu. Zamknięcie dokumentacji posiada osobne niezależne
przeglądy, commit i końcową kompletną historię backup/restoration bram; ich dokładne metadane są
rejestrowane oddzielnie od testowanego migawki funkcji. Nie obejmuje to zdalnej
eksploatacji, głównej integracji, prowadzonych działań, wdrożenia ani publikacji. Wyniki
te wskazują na to, że sprawdzone tutaj jest ograniczone zachowanie autorskie, a nie
opanowanie czy bezpieczeństwo produkcji. A12 pozostaje prywatnym doradcą do czasu
zakończenia tego zamknięcia; wniosek dotyczący globalnego UI pozostaje odrębny.
