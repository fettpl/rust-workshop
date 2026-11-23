# Funkcje zwrotne operujące na pożyczonych danych — wariancja i HRTB

[English](2026-09-13-borrowed-callbacks-design.md)

Kurs obejmuje podstawowe czasy życia, domknięcia i kontrakty funkcji wywoływalnych. Wariancję i HRTB uczestnik pozna w czterech wykonywalnych lekcjach działających w istniejącym jednoplikowym środowisku Rust. To kolejny ograniczony etap zatwierdzonego rozwoju kursu. Lekcje pokazują praktyczne zachowanie bezpiecznego API w Ruście. Wariancja w kodzie unsafe, PhantomData, GAT i pożyczanie w kodzie asynchronicznym to osobne tematy.

## Integracja

- Moduł `borrowed-callbacks`, tytuł `Pożyczone API: wariancja i HRTB`, zarejestrowany po `closures`, moduł wstępny `closures`.
- Cztery zamówione lesson/concept IDs: `variance-shared-views`, `variance-mutable-slots`, `hrtb-local-visitors`, `hrtb-borrowed-projections`.
- Warunkiem wstępnym pierwszej lekcji `closure-contracts`, warunkiem wstępnym pierwszej koncepcji `callable-contracts`.
  Każdy kolejny lesson/concept zależy od poprzedniego nowego ID.
- Każda lekcja ma przewidywanie, bieżącą obserwację, dokładne wyjaśnienie, pierwotny
  `${id}-gate`, niezależny `${id}-blank` bez startera lub dostarczonego podpisu oraz odrębnie autorski
  przegląd kodowania. Osiem lekcyjnych zadań brama łącznie: cztery podstawowe zadania i
  cztery ślepaki. Przeglądy kodowania to cztery oddzielne ćwiczenia wyszukiwania, a nie
  dodatkowe kryteria bramki modułu.
- Wszystkie wyszczerbienia Std-only Rust 2024 przy użyciu zaufanego celu mocowania `rustc-2024`.
  Istniejące dowody runner/persistence/learner pozostają bez zmian. Nie jest potrzebny nowy pakiet; liczba
  projektów pozostaje osiem.
- Ukryte testy kompilować prawdziwy kod klienta przy użyciu krótkożyciowych
  niestatycznych właścicieli i ćwiczenia zachowania. Intencyjne błędy kompilatora to
  etapy wyszukiwania z zweryfikowanym kodem błędu lub diagnostyką. Nie tworzyć błędów
  ani nie zaklasyfikować regeksu źródłowego jako dowodu właściwości typu.
- Zachować stary lesson/project IDs i zapisać postęp. Pokazywanie podstawowego rozwiązania musi
  pozostawiać puste wyzwanie niezależne. Silnik rewizyjny już rozkłada pobieranie; nie
  twierdź, że uczący się ukończył 24-godzinny odzysk tylko dlatego, że zadanie istnieje.

## Lekcja 1 — współdzielone widoki i podtypowanie

Ucz `'long: 'short`, współzależność wspólnych odniesień i struktury zawierającej wspólne
odniesienie. Skrócenie użytecznego kredytu nie powoduje skrócenia lub wydłużenia okresu
użytkowania rzeczywistego właściciela. `T: 'static` różni się od wartości utrzymywanej przy życiu
na zawsze. Wyjaśnij funkcję input/output wariancji z małym przykładem funkcji sprawdzanych przez
kompilator, używając evided `fn(&str)` przed późniejszą składnią wyraźną `for`; nie porównuj
subtypowania z dziedziczeniem klasy.

Umowa podstawowa: umowa publiczna `Label<'data>` z umową publiczną `text: &'data str` i `shorten_label<'long: 'short, 'short>(Label<'long>, &'short ()) -> Label<'short>`. Zachować ten sam
widok, w tym pusty i Unicode wejście. Token ogranicza tylko zwrócony typ i nie jest
przechowywany. Ukryty kod klienta musi dodatkowo skompilować ogólną konwersję
współwariancji samego typu etykiet publicznych; testowanie tylko równości tekstu nie
jest dowodem współzmienności.

Świeże puste: pożyczony widok numeryczny `Samples<'data>` z publicznością `values: &'data [i32]` i sprawdzony `prefix_samples`
zużywający ten widok, licznik i żeton, zwracając opcję skróconego przedrostka związanego
z tokerem. Liczba zerowa jest następstwem pustego plastra; liczba ponadwymiarowa zwraca
Brak; pełna długość się powiedzie; wskaźnik kroju jest zachowany. Opisz API nazwy, pola
i zachowanie w prozie; pozwól uczącemu się pisać podpis i implementację. Ukryty kod
klienta sprawdza ogólne konwersja życia, dane lokalne i granice.

Świeże zmiany w strukturze i zachowaniu przeglądu: `FrameSplit<'data>` z publicznym `left` i `right` polami
typu `&'data [u8]`; `split_frame` pobiera pożyczone dane wejściowe, offset i pożyczany żeton jednostkowy i
zwraca opcję FrameSplit skróconą do zakresu tokena. Offsety 0 i len są ważne, offsety powyżej
len return None. Oba widoki zachowują oryginalne przechowywanie. Należy uwzględnić
głównego świadka współwariancji w odniesieniu do samego FrameSplit i kontroli wskaźnika obu
opinii publicznych. Podaj te nazwiska i pełne zachowanie w instrukcji ucznia.

## Lekcja 2 — zmienialne pola są inwariantne względem typu zawartości

Distinguish `&'loan mut T` jest współwariantem w zewnętrznym okresie kredytowym od niezbywalnego w
T. Pokaż, dlaczego leczenie zmutowanego gniazda zawierającego długożyciowe odniesienie
jako gniazdo krótkich odniesień pozwoliłoby na nieprawidłowe przypisanie. Żadna
niebezpieczna demonstracja nie jest prowadzona. Diagnose prawdziwe odrzucone zadanie, a
następnie naprawić API poprzez oddzielenie zewnętrznego ponownego pożyczenia od
przechowywanego okresu odniesienia.

Pierwotne `replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str` zwraca stary widok i sklepy następny. Musi pracować na powtarzających się
krótkich, mutowalnych reborrows i lokalnych niestatycznych strun; nie jest wymagane
przydzielanie ani klonowanie. Ukryte testy weryfikują tożsamość alias/pointer, wymianę tej samej
wartości, puste struny i późniejsze ponowne użycie gniazda i oryginalnego właściciela.
Funkcja nie może wiązać żywotności szczeliny & mut z długością zapisanego tekstu.

Świeże puste `replace_window` działa na zmutowanym szczelinie posiadającym pożyczony kawałek bajtu.
Biorąc pod uwagę kandydujący plaster plus start/end indeksy, walidate start < = end < = len;
na sukces przechowywać, że odejmować i zwrócić Niektóre (poprzedni plaster), w
przeciwnym razie zwraca Nikt i pozostawić szczelinę nietknięty. Zakresy zerowej długości
są prawidłowe. Ukryte testy wymagają powtarzających się krótkich pożyczek, dokładnych
old/new źródeł widzenia i danych niestatycznych. Learner pisze podpis z prozy.

Świeża recenzja: `replace_at` przyjmuje zmutowany kawałek wypożyczonych widoków tekstowych (`&mut [&'data str]`),
indeks i następny `&'data str`. Zastąp wybrane odniesienie i zwróć Niektóre (stary widok), lub
Brak dla niepoprawnego indeksu bez skutków. Kredyt zewnętrzny pozostaje niezależny od
okresu przechowywania danych referencyjnych. Jest to plaster API, nie specyficzny dla
Vec. Nie wymagają niepowiązanych Copy/Clone granic. Podaj wszystkie nazwy, role parametru i
zachowanie w wierszu ucznia.

## Lekcja 3 — lokalni wizytatorzy działający z dowolnym czasem życia

Naucz `F: for<'a> FnMut(&'a str) -> R`: dzwoniący dostarcza F, producent tworzy krótkie pożyczki przy każdym
wezwaniu, a R jest jednym stałym typem niezależnym od tych pożyczek. Jeden wybrany przez
rozmówcę okres użytkowania lub `&'static str` wkład nie może opisać tego producenta. HRTB nie jest
`'static` wymogiem dotyczącym F ani państwa schwytanego. Skrót FnMut z wydzielonym czasem
trwania argumentu jest ważny i musi zostać zaakceptowany.

Pierwotne `inspect_owned<F, R>(items: Vec<String>, inspect: F) -> Vec<R>` odwiedza każdą posiadaną pozycję raz, w kolejności wejścia, pożyczając
obecny tekst tylko podczas jego odsyłania i zbierania wyników. Puste wejście nie
wykonuje żadnych połączeń. Dozwolone jest posiadanie R niebędącego klonem; zwroty mogą
być pożyczone i mutowane przez państwo lokalne, a także mogą zawierać dane niestatyczne.
Ukryte testy używają elementów funkcji, FnMut przechwytywania, Unicode i pustych strun,
non-Clone R i oddzielnych właścicieli lokalnych. Odkrycie "Compile-fail" pokazuje, że w
jednym wybranym okresie życia nie udało się uzyskać danych producenta-miejscowego, z
faktyczną sprawdzoną diagnostyką.

Świeże puste: `inspect_until` pożycza każdy należący pakiet bajtowy na zwrotny wynik połączenia <R, E>;
zatrzymaj się przy pierwszym błędzie, nie odwiedź kolejnych pakietów, zwróć dokładnie te
własne E lub wszystkie wartości R na sukces. R/E nie potrzebuje klonu. Puste wejście
jest Ok (puste). Kontrakt wykorzystuje Vec <Vec<u8> > i uniwersalne & [u8] pożyczki. Włączyć
testy na niepowodzenie first/middle/last i zewnętrzny zmutowany ślad wywoławczy.

Świeża recenzja: `select_owned` bierze Vec <String> i odwiedzający zwracający Opcję <R>, pomija None ale
zachowuje porządek i odwiedza każdy rekord dokładnie raz; statyczne zamknięcie z
niestatycznym przechwytywaniem i wyjścia nie-Klone. Dodaje to raczej filtrowania niż
powtarzania głównego kontraktu map.

## Lekcja 4 — projekcje zwracające pożyczony wynik

Naucz `F: for<'a> FnMut(&'a str) -> &'a str`: Zwrócony czas trwania widoku zmienia się w zależności od wartości pożyczki
wejściowej. Ogólne stałe R w poprzedniej lekcji nie może modelować arbitralnych wyników
pożyczonych na podstawie danych wejściowych. Relacja przez całe życie gwarantuje
ważność, a nie to, że wynik musi być podciągiem wejścia; statyczny spadek może również
zaspokoić to związane. Unikaj twierdzenia, że pochodzenie wskaźnik wynika tylko z
życiowych adnotacji.

Pierwotny `project_lengths<F>(items: Vec<String>, project: F) -> Vec<usize>` wywołuje projekt raz na element i natychmiast rejestruje długość
zwróconego widoku przed zniknięciem bieżącego elementu. Puste wejście oznacza brak
połączeń. Zaakceptuj nazwane funkcje projekcji ogólnej i statyczne zamknięcia z
odpowiednim uwzględnieniem długości życia, niestatyczną konfiguracją przechwyconą,
widokami Unicode, pustymi strunami i uzasadnionym zapasem statycznym. Wyraźnie
kontrastuje zamknięcie wewnętrzne na wywołaniu ogólnym z przypisaną oddzielnie zmienną
zamknięcia: to ostatnie może się nie udać za pomocą niewystarczająco ogólnego podpisu
wskazującego. Należy stosować inline `|s: &str| s.trim()`, nazwaną funkcję rodzajową na całe życie lub
wskaźnik wyraźny `fn(&str) -> &str`. Funkcja zwracająca `&'static str` może wymagać, aby wskaźnik rzucony przed
dopasowaniem przypisanych cech; nie twierdzić, że rozdzielczość właściwości
automatycznie wykonuje każdy przymus współwariancji. Niestatyczny uchwycony przyrostek
może wpływać na wybrany widok wejściowy; zwrócenie schwytanego przyrostka nie jest tym
samym powszechnie pożyczonym kontraktem wyjściowym.

Nowe zadanie z pustym edytorem wymaga, by `find_projected_size` przejęła pakiety bajtowe i przyjmowała funkcję zwrotną, która może otrzymać referencję o dowolnym czasie życia i opcjonalnie zwrócić pożyczony widok bajtów. Funkcja ma zwrócić długość pierwszego widoku, w tym Some(0) dla widoku pustego, albo None, gdy wszystkie wywołania zwracają None. Zatrzymaj wywołania na pierwszym Some. Zmieniają się typ danych, opcjonalność wyniku i reguły wywołań. Żaden widok nie opuszcza zakresu producenta.

W niezależnej powtórce `try_project_lengths` przejmuje Vec<String> i dla każdego posiadanego rekordu wywołuje projekcję tekstu zwracającą Result<&str, E>. Zwraca wszystkie długości w bajtach albo dokładnie pierwszy błąd E, wtedy przerywając wywołania. E jest jednym ustalonym typem przekazywanym na własność. Kontrakt nie wymaga Clone ani `'static`. Czas życia pożyczonego wyniku jest odrębny od ustalonego typu błędu.

## Źródła i dowody

Wykorzystanie oficjalnych, zweryfikowanych źródeł (reviewedAt 2026-09-13) z wąskimi wyjaśnieniami i
źródłem IDs:
- Rust Reference, subtypowanie i wariancja: https://doc.rust-lang.org/reference/subtyping.html
- Rust Reference, lifetime and higher-ranged grands: https://doc.rust-lang.org/reference/trait-bounds.html
- Rustonomicon, HRTB: https://doc.rust-lang.org/nomicon/hrtb.html
- Rust Reference, funkcja lifetime elision: https://doc.rust-lang.org/reference/lifetime-elision.html
- Rust Book Lifetime i rozdziały zamknięcia, oraz dokładne wpisy indeksu błędów dla
  kodów rzeczywiście obserwowane.

Najpierw napisz testy i obserwuj zamierzoną awarię rozrusznika; odniesienia muszą
zestawić i przejść wszystkie niepuste zestawy testowe. Kompatybilność typu testowego za
pomocą ogólnych funkcji klienta i lokalnych zakresów właścicieli, nie tylko równoważnych
wartości runtime. Sformatuj każdy autor Rust Snippet. Niezależne przeglądy muszą
przeprowadzać inspekcje umów z uczącymi się, transferu nowości, rzeczywistych dowodów
diagnostycznych i siły testowej. Root działa integration/content/Rust kontrole, produkcja build/E2E/offline, aktualizacje
source/coverage raporty, commits i wydania po wszystkich CI zadań przejść na dokładną głowę. Nie ma
wykonania kodu ucznia, zewnętrznego placu zabaw POST, instalacji zależności lub wdrożenia
jest częścią tego etapu.

## Przegląd projektu technicznego

Independent Luna High Review skompilował podstawowe interfejsy Rust 1.98.1 w wydaniu 2024.
Mutable description discussion has a message without an E code; fixed caller lifetime
vous failed E0597. Przed wdrożeniem doprecyzowano wnioski o zamknięcie, publiczne podziały
i umowy dotyczące przeglądu części zmutowanych. Regulacja: kryteria modułu pozostają
podanymi parami primary/blank; ćwiczenia pobierania są oddzielone, poprawiając błąd recenzenta
odczytu liczby bramek.
