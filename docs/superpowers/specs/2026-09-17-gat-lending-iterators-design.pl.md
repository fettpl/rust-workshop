# GAT i iteratory wypożyczające

[English](2026-09-17-gat-lending-iterators-design.md)

Etap wprowadza generyczne typy skojarzone (GAT) w bezpiecznym Rust poprzez obiekty wypożyczające wyniki. Następuje po praktycznym module wariancji i HRTB oraz module podstaw iteratorów. Uczestnik wie już, jak pożyczka wiąże się z właścicielem, jak funkcja zwrotna może przyjąć wejście o dowolnym czasie życia i jak `Iterator::next` zwraca `Option<Self::Item>`. Tutaj typ elementu zależy od bieżącej pożyczki obiektu wytwarzającego elementy.

Zakres obejmuje bibliotekę standardową, edycję 2024 i Rust 1.85 lub nowszy. Pomija `unsafe`, asynchroniczne wypożyczanie, zewnętrzny pakiet lending, specjalizację, wnioski z benchmarków i ogólny system adapterów. Pierwsza lekcja używa posiadanych wierszy jako konkretnego przykładu. Istnieją posiadane kolekcje, które nie wymagają GAT, oraz zwykłe iteratory zwracające referencje.

## Integracja i ocena

- ID modułu to `gat-lending-iterators`, a tytuł dla uczestnika to `GAT i lending iterators: pożyczone elementy`.
- Zarejestruj moduł po `iterators`. Jego wymagane moduły to `borrowed-callbacks` i `iterators`.
- Zarejestruj cztery identyfikatory lekcji i pojęć w podanej kolejności: `gat-receiver-borrows`, `gat-overlapping-mutable-windows`, `gat-item-capabilities`, `gat-owned-iterator-adapters`.
- Pierwsza lekcja i pierwsze pojęcie wymagają dokładnych `hrtb-borrowed-projections` i `iterator-contracts`. Każda dalsza lekcja i pojęcie zależy od bezpośredniego poprzednika. To wymagania lekcji i pojęć, niezależne od ID modułów.
- Pierwsze dwie lekcje należą do `src/content/gat-producers.ts` i eksportują `gatProducerLessons`, `gatProducerConcepts`, `gatProducerCompetencies`, `gatProducerSources` oraz `gatProducerReviewExercises`. Dwie ostatnie należą do `src/content/gat-consumers.ts` i eksportują odpowiadające nazwy `gatConsumer*`. Opiekun główny integruje `src/content/gat-lending-module.ts` i rejestrację kursu.
- Każda lekcja ma przewidywanie, wykonywalną obserwację, objaśnienie, główne zadanie programistyczne, wariant zaliczeniowy od pustego edytora i przypominanie. Osiem zadań zaliczeniowych tworzy cztery pary główne i puste. Cztery odrębne, odroczone powtórki programistyczne nie dodają kryteriów modułu.
- Interfejs może ujawnić główne rozwiązanie, ale wariant od pustego edytora i powtórka pozostają niezależnie ocenialne. Pusty edytor nie daje kodu startowego, sygnatury ani ukrytego szkieletu widocznego uczestnikowi. Polecenie wymienia wszystkie potrzebne publiczne nazwy, role parametrów, wartości zwracane, przypadki graniczne i zasady kolejności oraz zakończenia.
- Każde pojęcie używa `evidenceArtifact: "rust-code"` i rozróżnia dowody assessment i transfer. Każdy główny oraz pusty `LessonStep` ma `evidenceGate: true`. Powtórka to nowe zadanie kodowe z inną domeną lub regułą ograniczenia. Zachowaj istniejącą semantykę opanowania i utrwalenia.
- Moduł ma cztery kryteria. Każde odwołuje się wyłącznie do głównego i pustego zadania własnego pojęcia. Obejrzenie rozwiązania, zaliczenie pytania tekstowego lub pobranie pakietu nie przyznają kompetencji GAT.

Ustalone autorskie przypadki oceny umieść w `src/content/gat-producer-assessment-fixtures.ts` i `src/content/gat-consumer-assessment-fixtures.ts`, eksportujących rekordy `{ id, equivalent, mutant }`. Mechanizm testowy tylko dla Node, na przykład należący do opiekuna głównego `src/content/gat-assessment.test.ts`, używa tych danych. Treść kursu ich nie importuje, a one nie wykonują kodu uczestnika ani importu. Każde z dwunastu zadań programistycznych musi przyjmować rozwiązanie referencyjne i co najmniej jedną poprawną alternatywę oraz odrzucać kompilujący się wariant łamiący kontrakt. Za odrzucenie semantyczne uznaje się nieudaną asercję po kompilacji. Stosuj lokalnych właścicieli bez `'static` i wartości bez `Copy`, gdy dopuszcza je kontrakt.

## Wspólny kontrakt API

Dwie pierwsze lekcje wprowadzają autorski trait o kontrakcie odrębnym od `std::iter::Iterator`.

```rust
trait LendingIterator {
    type Item<'a> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

Klauzula `where Self: 'a` jest wymagana dla tej projekcji przez obsługiwane kompilatory. Typ skojarzonego elementu ma obowiązywać dla bieżącej pożyczki odbiorcy, bez wymagania `Self: 'static`. Sam trait nie określa, czy element jest referencją, czy referencja pochodzi z odbiorcy, czy element można modyfikować ani czy `None` jest trwałe. Każda konkretna implementacja określa pochodzenie elementu i kontrakt wyczerpania.

Wyjaśnij trzy przypadki.

1. `slice::windows` już daje niemutowalne, nakładające się widoki `&[T]` związane z czasem życia zewnętrznego wycinka. Dwie współdzielone referencje mogą istnieć równocześnie.
2. Zwykła iteracja mutowalna może wydawać rozłączne `&mut T` lub rozłączne mutowalne fragmenty przez `Iterator`.
3. Nowy przypadek to sekwencyjne nakładające się mutowalne widoki lub widoki na pamięć posiadaną albo ponownie wykorzystywaną przez obiekt wydający dane. Czas życia wyniku podąża za bieżącą pożyczką `&mut self`. Pierwsza pożyczka musi się skończyć przed pobraniem kolejnej.

GAT nie jest wymagany przez wszystkie okna ani wszystkie wyjścia pożyczone. Ten kontrakt dydaktyczny używa rodziny typów elementu zależnej od pożyczki odbiorcy. Unikaj zewnętrznego ograniczenia projekcji HRTB, jak `for<'a> L::Item<'a>: AsRef<[T]>`. Na obsługiwanych kompilatorach może ono niejawnie narzucić 'static obiektowi pożyczającemu lokalne dane. Jeśli właściwość elementu należy do kontraktu API, umieść ograniczenie w deklaracji typu skojarzonego, jak w lekcji 3.

## Lekcja 1: `gat-receiver-borrows`

Concept title: `GAT zależny od pożyczki odbiorcy`.

Lekcja wyjaśnia różnicę między składowaniem należącym do producenta a krótką pożyczką
zwróconą jednym telefonem na `next`. Używa `Vec<Vec<T>>` ponieważ własność jest widoczna w małym
przykładzie. Producent nie jest abstrakcją kolekcji o charakterze ogólnym.

### Główne zadanie zaliczeniowe: `gat-receiver-borrows-gate`

Uczeń kończy następujące API: Przedstawione pola są przykładową reprezentacją prywatną,
a nie układem, który mogą sprawdzać ukryte testy; każda reprezentacja prywatna
zachowująca zamówienie publiczne jest ważna:

```rust
struct RowLender<T> {
    rows: Vec<Vec<T>>,
    next: usize,
}

impl<T> RowLender<T> {
    fn new(rows: Vec<Vec<T>>) -> Self;
}

impl<T> LendingIterator for RowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

`RowLender::new` rozpoczyna się w wierszu zero i nie klonuje, sortuje ani nie splata wejścia. Każdy
`Some` jest widoku zmutowalnego do odpowiedniego wiersza posiadanego, w porządku
wejściowym. Pusty wiersz jest nadal `Some(&mut [])`, więc różni się od wyczerpania. Oddzwanianie lub
dzwoniący może zmutować bieżący wiersz, ale musi zwolnić tę pożyczkę przed zapytaniem o
następny wiersz. Po odwiedzeniu wszystkich wierszy producent jest zespolony: co później
`next` zwraca `None`. Pusty wektor zewnętrzny zwraca `None` natychmiast. Wynik nigdy nie
przewyższa bieżącego odbiornika pożyczać.

Ukryte badania muszą wykorzystywać co najmniej jeden `String` lub inny element nie- `Copy`,
zawierać puste i jednokodowe wiersze, mutować rzędy w miejscu, sprawdzać dokładną
kolejność i weryfikować powtarzane `None`. Muszą one również spróbować sekwencyjnego wzoru
użytkowania, w którym bieżąca pożyczka jest konsumowana przed kolejnym wywołaniem;
zachowanie dwóch pożyczek z wierszem mutowalnym jest obserwacją
kompilacji-niepowodzenia, a nie przechodzącym zachowaniem. Aby sprawdzić pochodzenie bez
zależności od pól prywatnych, test może zapisać wskaźnik każdego wiersza przed
przeniesieniem wektora zewnętrznego do `RowLender::new` i porównać go z odpowiednim zwróconym
widokiem.

### Zadanie od pustego edytora: `gat-receiver-borrows-blank`

Bezźródłowy polski szybki kontrakt:

> Od pustej kartki zaprojektuj `PresentValueLender<T>`, który przejmuje
> `Vec<Option<T>>` przez konstruktor `new` przyjmujący ten wektor i zwracający
> `PresentValueLender<T>`, a następnie implementuje pokazany trait
> `LendingIterator`.
> W odpowiedzi zdefiniuj także pełny trait `LendingIterator` z rodzinnym
> `Item<'a>` i wymaganym `where Self: 'a`; zadanie nie dostarcza ukrytej
> deklaracji ani typu bazowego poza biblioteką standardową.
> Metoda traitu `next` pożycza odbiorcę mutowalnie na wybrany lifetime `'a`
> i zwraca `Option<Self::Item<'a>>` powiązane z tą samą pożyczką.
> `Item<'a>` ma być `&'a mut T`. Odwiedzaj elementy od lewej do prawej,
> pomijaj każde `None`, a dla `Some(value)` oddaj pożyczkę do samego
> `value`; nie przenoś wartości, nie klonuj ich i nie zmieniaj kolejności.
> Puste wejście oraz wejście zawierające wyłącznie wakaty od razu się kończy.
> Po pierwszym wyczerpaniu każde następne `next` także zwraca `None`. Zmiany
> wykonane przez odbiorcę mają pozostać w przejętym stanie. Napisz sam typ,
> prywatny stan pozycji, implementację `next` i konstruktor na podstawie
> tego opisu; nie otrzymujesz startera ani podpisu funkcji poza kontraktem
> konstruktora podanym powyżej.

Ukryty klient musi korzystać z lokalnych nie-`'static` tekst lub rekordy i sprawdzić, czy
wakaty nie tworzą pozycji wyjściowych, zajęte wartości są mutowalne, wszystkie zajęte
wartości pojawiają się dokładnie raz, a powtarzające się wywołania po powrocie
wyczerpania `None`. Jego wewnętrzna praca poszukiwawcza nie jest narażona przez to API i
nie mogą być zgłaszane jako spostrzegawcze twierdzenia sondażowe. Mutant, który
zatrzymuje się na pierwszym wakacie zamiast kontynuować do następnej zajętej wartości
musi skompilować w oprawie mutacji i nie udaje behawioralne twierdzenia.

### Niezależna powtórka: `gat-receiver-borrows-review`

Uczeń wdraża nowy `ReverseRowLender<T>` z państwem prywatnym i `new(rows: Vec<Vec<T>>)`. Używa tej samej `LendingIterator` rodziny elementów
`&'a mut [T]`, ale rozpoczyna się w ostatnim rzędzie i odwiedza rzędy w odwrotnej kolejności.
Puste wiersze pozostają `Some(&mut [])`; pusty wektor zewnętrzny nie ma żadnych elementów; po
ostatnim wierszu co później `next` zwraca `None`. W przeglądzie testuje się mutację i
tożsamość wskaźnika dla wierszy lokalnych `String` i wymaga się od uczącego się, aby zamiast
tylko pisać do konsumenta wprowadził w życie producenta. Jest to zlecenie odwrócone, a
zatem odrębna umowa przeniesienia.

### Objaśnienie i obserwacja w lekcji

Wykonywalny przykład pokazuje użycie jednego zmienialnego wiersza, zakończenie jego pożyczki i dopiero wtedy pobranie następnego wiersza. Uwzględnia wiersz pusty i wypisuje końcową kolekcję należącą do producenta. Drugi przykład celowo zatrzymuje pierwszą zmienialną pożyczkę podczas kolejnego wywołania `next` i zapisuje faktyczną diagnostykę kontroli pożyczek. Wyjaśnienie wskazuje projekcję GAT, czas życia pożyczki odbiorcy, pamięć należącą do producenta i regułę zwracania `None` po wyczerpaniu, którą zapewnia konkretny `RowLender` ponad kontrakt `LendingIterator`.

## Lekcja 2: `gat-overlapping-mutable-windows`

Concept title: `Sekwencyjne nakładające się okna mutowalne`.

Lekcja ta określa dokładną politykę konstruktora i wyczerpania przed zwróceniem się o
wdrożenie. Bezpieczny projekt opiera się na sekwencyjnych krótkich pożyczkach: żaden
dzwoniący nie może zachować wcześniejszego okna zmutowalnego podczas składania wniosku o
następny. Nie może on stosować granic `unsafe` ani `Copy` / `Clone`.

### Dokładny błąd i kontrakt operacji wytwarzającej elementy

Autorski błąd jest celowo mały i dokładny:

```rust
#[derive(Debug, PartialEq, Eq)]
enum WidthError {
    Zero,
}

struct WindowsMut<'data, T> {
    data: &'data mut [T],
    width: usize,
    position: usize,
    done: bool,
}

impl<'data, T> WindowsMut<'data, T> {
    fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError>;
}

impl<T> LendingIterator for WindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

`new` zwraca `Err(WidthError::Zero)` dla szerokości zero i nigdy nie panikuje. Dla dodatniej szerokości
większej niż długość wejścia zwraca inicjalizowany kredytodawca, który nie posiada
okien. To samo dotyczy dodatniej szerokości z pustym wejściem. Szerokość równa długości
daje dokładnie jedno okno; szerokość jeden odwiedza każdy element; każdy początek
przesuwa się o jedno. Okno posiada dokładnie `width` elementów.

Po wyczerpaniu `next` powraca `None` na zawsze. Wdrożenie musi prowadzić do niepowodzenia `position.checked_add(width)`
jako ostatecznego wyczerpania bez paniki. Test z `usize::MAX` na krótkim kawałku wykonuje
politykę przerośniętej szerokości; sam w sobie nie dowodzi, że wykonywana jest branża
check-add. Nie ubiegać się o bezpośrednie pokrycie arytmetyczno-przelewowe, chyba że
autorski moduł-wewnętrzne urządzenie stanu sprawia, że gałąź jest osiągalna. Z dodatnią
szerokością i poprawnym oknem, `position < data.len()`, więc przesunięcie pozycji przez jednego jest
bezpieczne pod podanym niezmiennym.

Pola zawarte w deklaracji ilustrującej to prywatne państwo wdrażające; autorzy mogą
stosować inny układ prywatny. Testy muszą obserwować tylko wynik konstruktora, zwrócone
okna i dane po wywołaniu, nigdy nazwy pola.

### Główne zadanie zaliczeniowe: `gat-overlapping-mutable-windows-gate`

Uczeń realizuje dokładnie API powyżej. Ukryte testy wykorzystują zmutowany kawałek `String`
rekordów lub niestandardową strukturę nie- `Copy`, mutują każde zwrócone okno, a następnie
zapewniają skumulowane efekty w pokrywających się pozycjach. Obejmują one szerokość
zerową i dokładną `WidthError::Zero`, szerokość przerośniętą, puste wejście, szerokość równą długości,
szerokość jedną, powtarzaną `None` oraz szerokość `usize::MAX` przy małym wejściu. Potwierdzają one,
że nie zatrzymano jednocześnie dwóch pożyczek podlegających mutacji.

Prośba musi wyraźnie powiedzieć, że obecne okno może być zmutowane i uwolnione przed
kolejnym sondażem, że nakładanie się oznacza ten sam element może być mutowany w
kolejnych wywołaniach, a polityka typu jest silniejsza od minimalnej umowy cechy.

### Zadanie od pustego edytora: `gat-overlapping-mutable-windows-blank`

Bezźródłowy polski szybki kontrakt:

> Zaimplementuj od pustej kartki `GrowingPrefixesMut<'data, T>` z
> konstruktorem `new` przyjmującym `&'data mut [T]` oraz `maximum: usize` i
> zwracającym ten typ, implementacją `LendingIterator` i
> `Item<'a> = &'a mut [T]`.
> Zdefiniuj również pełny trait `LendingIterator` w rozwiązaniu, włącznie z
> generycznym `Item<'a>` i `where Self: 'a`; nie ma ukrytej deklaracji poza
> biblioteką standardową. Metoda traitu `next` pożycza odbiorcę mutowalnie
> na lifetime `'a` i zwraca `Option<Self::Item<'a>>` związane z tą pożyczką.
> Przy pierwszym `next` oddaj prefiks długości 1, potem prefiksy długości 2, aż do długości równej
> `maximum` albo długości danych — wybierz mniejszą granicę. Dla
> `maximum == 0`, pustych danych lub po oddaniu najdłuższego prefiksu od razu
> zwracaj `None`; późniejsze `next` też mają zwracać `None`. Każdy prefiks
> zaczyna się w pozycji zero, więc kolejne wywołania mogą dotykać tych samych
> elementów; pożyczkę trzeba zakończyć przed kolejnym `next`. Nie używaj
> `unsafe`, `Copy`, `Clone` ani gotowego iteratora okien. Zdefiniuj prywatny
> stan, pełny podpis typu, implementację traitu i konstruktor na podstawie
> opisu.

Różni się to od podstawowego wzrostu z przodu, granicy maksymalnej długości i reguły
zakończenia, a nie stałej szerokości okna przesuwne. Musi testować wartości nie- `Copy`,
skumulowaną mutację przedrostkową, maksimum zerowe, puste wejście, maksimum większe niż
długość danych i powtarzające się wyczerpanie. Mutant, który zaczyna się od jednego i
rozwija się zamiast rosnących przedrostków musi kompilować i zawieść oczekiwaną
sekwencję.

### Niezależna powtórka: `gat-overlapping-mutable-windows-review`

Uczeń wdraża `ReverseWindowsMut<'data, T>` z `new(data: &'data mut [T], width: usize) -> Result<Self, WidthError>` i tym samym `Item<'a> = &'a mut [T]`. Zwraca okna o stałej szerokości z ostatniego
poprawnego początku w kierunku zera, a następnie pozostaje stopione. Używa tego samego
`WidthError::Zero` dla szerokości zerowej, nie daje żadnych okien dla dodatniej przerośniętej
szerokości lub pustego wejścia, a także daje jedno okno, gdy szerokość jest równa
długości danych. Każde zwrócone okno zostanie wydane przed kolejnym żądaniem. W ukrytych
testach stosuje się zapisy inne niż `Copy` i sprawdza się kolejność odwrotną, nakładanie
się na siebie, wszystkie przypadki graniczne oraz skumulowaną mutację.

### Objaśnienie i obserwacja w lekcji

Przykład zestawia zwykłą pętlę z niezmiennymi widokami `slice::windows` i bezpieczny iterator mutowalnych, rozłącznych fragmentów z producentem GAT. Następnie pokazuje kolejne mutacje nakładających się okien oraz odrzucenie próby ponownego pobrania przy wciąż aktywnej pożyczce. GAT wiąże rodzinę typów elementu z bieżącą pożyczką odbiorcy. Reguła wyłączności pożyczek mutowalnych nadal obowiązuje. Szerokość okien i stałe zwracanie `None` po wyczerpaniu są niezmiennikami typu `WindowsMut`, które wykraczają poza deklarację traitu.

## Lekcja 3: `gat-item-capabilities`

Concept title: `Możliwości elementu zapisane w GAT`.

Jest to jedna z gorliwych lekcji generyczno-konsumenckich. API celowo zawęża zakres
działalności rodziny producentów udzielających pożyczek, tak aby konsument mógł
korzystać z możliwości cięcia bez zewnętrznej projekcji:

```rust
trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

Prom musi wyjaśniać, że związany jest częścią kontraktu tej specyficznej cechy. Nie
wzmacnia ani nie zastępuje w milczeniu wcześniejszego nieograniczonego `LendingIterator` i nie
twierdzi, że każdy element GAT jest kawałkiem. `Self: 'a` pozostaje związana z okresem ważności
pożyczki, a nie statycznym.

### Główne zadanie zaliczeniowe: `gat-item-capabilities-gate`

Uczennik wdraża ten ogólny chętny konsument:

```rust
fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    // learner implementation
}
```

Dokładną umową jest: ankieta `lender.next()` do czasu zwrotu `None`; dla każdego `Some(item)`, zadzwoń `visit(item.as_mut())`
dokładnie raz i wciśnij zwrócony `usize` do wyniku w kolejności źródłowej. Nie wzywaj `visit`
dla `None`, nie zachowuj pozycji po wywołaniu i nie dodawaj `Clone`, `'static` lub niepowiązanych
granic cech. Konsument zwraca własność `Vec<usize>` i zachowuje każdą mutację wykonaną przez
`visit`. Jest chętny, ponieważ funkcja wysysa źródło w jednym wywołaniu.

Testy ukryte zapewniają zarówno element, który jest bezpośrednio `&mut [T]`, jak i opakowanie
niereferencyjne, które wdraża `AsRef<[T]> + AsMut<[T]>`. Używają lokalnych rekordów nie- `'static` zawierających
pożyczony tekst, nie- `Copy` typu elementu, stanu zwrotnego, pustych plastrów i wielu
plastrów. Wywołanie zmutuje każdy element i zwraca wartość pochodzącą z bieżącego
fragmentu; testy weryfikują zwrócone własne liczby, dokładne kolejność wywołania i
wszystkie mutacje. Praca po stronie rozmówcy `for<'a> L::Item<'a>: AsMut<[T]>` odbywa się umyślnie poza umową.

### Zadanie od pustego edytora: `gat-item-capabilities-blank`

Bezźródłowy polski szybki kontrakt:

> Napisz od pustej kartki generyczną funkcję `visit_until` z typami `L`, `T`
> i `F`, argumentami `lender: &mut L` oraz `visit: F`, wynikiem `usize`,
> boundem `L: SliceLender<T>` i callbackiem `F: FnMut(&mut [T]) -> bool`.
> W rozwiązaniu zdefiniuj pełny trait `SliceLender<T>` z `Item<'a>`
> ograniczonym przez `AsRef<[T]> + AsMut<[T]>` oraz `where Self: 'a`; zadanie
> nie dostarcza ukrytego traitu ani implementacji źródła. Metoda traitu
> `next` pożycza odbiorcę mutowalnie na lifetime `'a` i zwraca
> `Option<Self::Item<'a>>` związane z tą samą pożyczką.
> Pobieraj elementy przez `next` w kolejności. Dla każdego `Some(item)` wywołaj
> callback dokładnie raz z `item.as_mut()`; zwiększ wynik o jeden niezależnie
> od wartości bool. `true` oznacza „zwiedzaj dalej”, a pierwsze `false`
> oznacza „zatrzymaj się natychmiast”: po tym callbacku nie wolno już pytać
> źródła o kolejny element. Gdy źródło kończy się wcześniej, zwróć
> liczbę rzeczywiście odwiedzonych elementów. Zmiany callbacku pozostają w
> danych. Jeśli tę samą funkcję wywołasz ponownie z tym samym źródłem,
> ma rozpocząć od następnego elementu po tym, który wywołał stop; nie resetuj
> ani nie przepytuj elementu zatrzymującego. Nie dodawaj `Clone`, `'static`
> ani innych boundów i nie przechowuj pożyczonego itemu po callbacku.

Ukryte testy zatrzymują się na pierwszym, środkowym, ostatnim i bez zatrzymania;
dokładna liczba sondaży źródłowych; dokładna liczba połączeń zwrotnych; mutacja elementu
zatrzymującego; wznowienie od następnego elementu przy drugim wywołaniu przez
konsumenta; puste wejście; oraz lokalna płyta pożyczona. Mutant, który sprawdza decyzję
po sondażu jeden dodatkowy element, pomija zatrzymującą mutację lub resetuje
kredytodawca musi skompilować i zawieść.

### Niezależna powtórka: `gat-item-capabilities-review`

Uczeń wdraża:

```rust
fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    // learner implementation
}
```

Musi ona przeglądać każdy element źródłowy przez `None`, zużywać puste elementy, ale
pominąć wywołanie `choose` dla pustych plastrów, wywołać `choose(item.as_ref())` dokładnie raz dla każdego
niepustego elementu, pominąć `None` raporty przy zachowaniu porządku `Some(report)` i odzyskać
własność `R` bez `Clone` lub `'static`. Przegląd jest tylko do odczytu i ma celową politykę
pustego elementu innego niż pierwotny kontrakt mutacji i-stop. Testy wykorzystują
bezpośrednie referencje, opakowanie na zamówienie, raporty niebędące własnością `Copy`,
lokalne dane wejściowe pożyczone oraz selektor zwracający `None` dla jednej pozycji
niepustej.

### Objaśnienie i obserwacja w lekcji

Przykład najpierw umieszcza ograniczenie dotyczące typu elementu poza GAT i rejestruje błąd, w którym kompilator domaga się w praktyce `'static` dla lokalnego producenta. Następnie pokazuje, że wyspecjalizowana deklaracja `SliceLender` kompiluje się z lokalnym rekordem bez `Copy` i własnym opakowaniem z `AsRef` i `AsMut`. Wyjaśnij węższą gwarancję tego API bez uogólniania jej na wszystkie GAT i HRTB.

## Lekcja 4: `gat-owned-iterator-adapters`

Concept title: `Adapter kończący pożyczkę i oddający własność`.

Lekcja ta przechodzi od producenta udzielającego pożyczek do zwykłego `std::iter::Iterator`. Adapter musi
zakończyć korzystanie z bieżącej pozycji wewnątrz `next` i zwrócić własne podsumowanie,
więc żaden element pożyczenia nie ucieka od połączenia. Uczy lenistwa i nie powtarza
chętnego konsumenta z lekcji 3.

Użyj tego typu własnego wyniku:

```rust
#[derive(Debug, PartialEq, Eq)]
struct WindowSummary {
    index: usize,
    len: usize,
}
```

### Główne zadanie zaliczeniowe: `gat-owned-iterator-adapters-gate`

Uczeń wdraża adapter z polami prywatnymi i tym publicznym kształtem:

```rust
use std::marker::PhantomData;

struct OwnedSummaries<L, T> {
    source: L,
    index: usize,
    done: bool,
    marker: PhantomData<fn() -> T>,
}

impl<L, T> OwnedSummaries<L, T>
where
    L: SliceLender<T>,
{
    fn new(source: L) -> Self;
}

impl<L, T> Iterator for OwnedSummaries<L, T>
where
    L: SliceLender<T>,
{
    type Item = WindowSummary;

    fn next(&mut self) -> Option<Self::Item>;
}
```

Budownictwo nie przeprowadza sondaży źródłowych. Jeden adapter `next` sondaży na co
najwyżej jeden element źródłowy: w dniu `Some(item)` rejestruje obecny ordinal źródła i `item.as_ref().len()` w
posiadaniu `WindowSummary`; pożyczka elementu jest całkowicie zakończona przed zwróceniem
podsumowania. Ordinal zaczyna się od zera i przyrostów dla każdego `Some`, w tym pustego
elementu, używając `saturating_add(1)` więc niezwykle długie źródło niestandardowe nie może panikować na
ordinalne przepełnienie. `None` oznacza wykonaną adapter; po tym, każdy adapter `next` zwraca
`None` bez badania źródła. Adapter zachowuje kolejność źródeł i emituje jedno podsumowanie
dla każdej pozycji źródła. Nie wywołuje ona zwrotu kosztów, nie zatrzymuje kawałka ani
nie wymaga `T: Clone` lub `'static`.

Testy muszą przypisywać stałą, autorską kredytodawcę do udowodnienia zerowej pracy przy
budowie, jeden sondaż źródłowy na ankietę adaptera, poprawne wyniki częściowe, dokładne
podsumowania pustych elementów, własne wartości rezultatu oraz stałe wyczerpanie. Źródło
może posiadać lub pożyczać lokalne dane inne niż `'static`; żadne zwrócone podsumowanie nie
może zawierać tego kredytu.

### Zadanie od pustego edytora: `gat-owned-iterator-adapters-blank`

Bezźródłowy polski szybki kontrakt:

> Zaimplementuj od pustej kartki `NonEmptySummaries<L, T>` z prywatnym
> źródłem `L: SliceLender<T>`, konstruktorem `new` przyjmującym `source: L` i
> zwracającym `NonEmptySummaries<L, T>`, oraz implementacją zwykłego
> `Iterator<Item = WindowSummary>`. Zdefiniuj w rozwiązaniu pełny
> `SliceLender<T>` z rodzinnym `Item<'a>` ograniczonym przez
> `AsRef<[T]> + AsMut<[T]>` i z warunkiem `where Self: 'a`. Metoda tego
> traitu `next` pożycza odbiorcę mutowalnie na lifetime `'a` i zwraca
> `Option<Self::Item<'a>>` związane z tą samą pożyczką. Zdefiniuj także
> `WindowSummary` z polami `index` i `len`, oboma typu `usize`; zadanie nie
> dostarcza ukrytych deklaracji poza biblioteką standardową.
> Konstrukcja adaptera nie może wywołać `source.next()`. W jego `next`
> odpytuj źródło tak długo, aż znajdziesz niepusty item albo źródło zwróci
> `None`. Pusty item zużyj, zwiększ jego ordinal źródłowy przez
> `saturating_add(1)` i pomiń. Dla
> niepustego itemu oddaj posiadany `WindowSummary { index, len }`, gdzie
> `index` jest ordinalem wszystkich wcześniejszych wartości `Some`, także
> pustych, a `len` to długość itemu. Jedno wywołanie adaptera może więc
> wykonać kilka polli źródła, ale nie może wykonać żadnej pracy po znalezieniu
> wyniku. Po `None` ustaw stan terminalny: kolejne `next` nie mogą już pytać
> źródła. Nie zwracaj pożyczonego slice, nie używaj `Clone` ani `'static` i
> zakończ każdą pożyczkę przed zwróceniem raportu.

Różni się to od pierwotnego poprzez filtrowanie pustych elementów i umożliwienie kilku
sondaży źródłowych w jednym ankiecie adaptera. Ukryte testy wykorzystują długość źródła,
taką jak `[0, 2, 0, 3]`, indeksy asertowe `[1, 3]`, sondaże liczenia źródeł, sprawdzają leniwą
konstrukcję i nie weryfikują ankiety po wyczerpaniu źródła. Mutanty, które zmieniają
numerację po filtrowaniu, zwracają puste raporty lub ankiety tylko raz na połączenie
adaptera muszą kompilować i zawieść. Buste 's ordinal również używa `saturating_add(1)`. Przejrzyj tę
arytmetykę bezpośrednio; zwykłe badania wejściowe nie mogą praktycznie osiągnąć limitu
licznika adaptera. Sonda tylko opiekuna może inicjalizować swój własny alter adaptera w
pobliżu `usize::MAX`, ale ukryte testy ucznia nie mogą kontrolować ani wymagać prywatnego układu.
Zmiana własnego licznika źródła nie powoduje przesunięcia licznika adaptera
inicjalizowanego na zero.

### Niezależna powtórka: `gat-owned-iterator-adapters-review`

Uczeń wdraża `CappedSummaries<L, T>` z `new(source: L, maximum: usize)`. Wprowadza on w życie zwykłe `Iterator<Item = WindowSummary>` i stosuje ten sam raport własny.
Budownictwo jest leniwe. Każdy adapter `next` sondaży na co najmniej jednym elemencie
źródłowym. Element źródłowy `None` kończy adapter. Uzyskuje się pustą lub w inny sposób
ważną pozycję, włącznie z długością zero, kiedy `len <= maximum`. Pierwszy `Some` element z `len > maximum` jest
spożywany, ale nie ustępuje i natychmiast kończy adapter; późniejsze elementy źródłowe
nigdy nie są badane. Jej indeks raportu jest ordinalem każdego wcześniejszego `Some`
elementu, z prywatnym licznikiem ordinalnym zaawansowanym przy użyciu `saturating_add(1)` więc niezwykle
długie niestandardowe źródło nie może panikować. W związku z tym w przeglądzie
zastosowano politykę "stop-at-first-oversize policy" zamiast polityki pustej pustki, a
testy muszą obejmować pierwszą, środkową i niedostępną wielkość, maksymalną zerową,
pustą pozycję, częściowe zużycie oraz powtarzający się terminal `None`.

### Obserwacja granicy zgodności z `dyn`

Lekcja zawiera sprawdzoną obserwację, ale nie oddzielne kryterium opanowania dyn.
Proponowane GAT- łożysko `LendingIterator` nie może być używany jako obiekt cechy; poprawiona sonda
powinna zawieść tylko z E0038 po wykonaniu próby typu obiektu. Oddzielna cecha
betonu-wyjścia, taka jak:

```rust
trait StringLender {
    fn next_strings(&mut self) -> Option<&mut [String]>;
}
```

działa poprzez `&mut dyn StringLender` i nadal zmusza do sekwencyjnego udzielania pożyczek. Dlatego
wyjaśnienie nie może powiedzieć, że pożyczki, okres trwania metody, lub co GAT jest z
natury niezgodna z `dyn`. To musi wiązać granicę z tym. GAT- łożysko API oraz aktualne
zasady zgodności dyn. Oddzielna kompetencja dyn wymagałaby dwóch bram wykonywalnych i
jego własnego pobierania kodowania; jest poza tym czterolekcyjnym kamieniem milowym.

### Objaśnienie i obserwacja w lekcji

Przykład liczy wywołania pobierające element ze źródła przed i po zbudowaniu adaptera, po pojedynczym `next` i po `collect`. Podsumowanie przekazane na własność może opuścić zakres pożyczki, a pożyczona referencja do wycinka podlega jej ograniczeniom. Wyjaśnienie rozróżnia `LendingIterator::next` od zwykłego `Iterator::next`, wskazuje, gdzie pożyczka się kończy, i wiąże ponawiane odpytywanie w zadaniu od pustego edytora z leniwą pracą adaptera. Poszczególne adaptery mogą odpytywać źródło według innych reguł.

## Struktura lekcji i weryfikacja kodu

Każda lekcja powinna zawierać sześć do ośmiu kroków w istniejącym formacie danych:

1. Przewidywanie o następnym typie, pożyczki prawnej lub ankiety liczą.
2. Stała, zaufana obserwacja, która kompiluje lub celowo odrzuca prawdziwą diagnostykę.
   Nie może wykonywać kodu ucznia.
3. Polskie wyjaśnienie nazewnictwo dokładny API i niezmienny.
4. Podstawowy kod zadanie z jego kompletny starter i ukryte testy.
5. Bezźródłowe puste zadanie z jego niezależnych ukrytych testów.
6. Krok pamięciowy, który koryguje prawdopodobną pomyłkę.

Propozycje Learnera kontynuowane są przez istniejący izolowany punkt końcowy wykonania
Rust. Tylko stałe odniesienia autorskie, negatywne obserwacje, równoważne rozwiązania i
mutanty semantyczne wykonywać w lokalnej weryfikacji. Nie jest potrzebny nowy cel
biegacza, API kształt żądania, pakiet lub granica wykonania. Zaufany weryfikator
powinien zestawiać wyłącznie odniesienia do Rusta i obserwacje negatywne. Walidacja
zawartości musi zapewniać rejestrację czterech pojęć, ośmiu bramek IDs, czterech
przeglądów IDs, łańcucha wstępnego, dokładnych pustych promów bez źródła oraz niepustych
kontraktów testowych.

Badania stałe powinny sprawdzić, dla każdego zadania:

- Canonical reference behavior on local, non...`'static` właściciele;
- jedną nieszkodliwą zmianę układu, nazwę państwa prywatnego lub równoważną pętlę, która
  zachowuje zamówienie publiczne;
- jeden kompilujący mutant semantyczny, który zmienia porządek, pustkę, mutację,
  zatrzymanie, własność lub sondowanie i nie udaje się w czasie biegu;
- brak przypadkowego `Clone`, `Copy`, `'static`, `unsafe`, skrzyni zewnętrznej lub nieograniczonego
  sondażu źródłowego, w przypadku gdy zadanie tego zabrania;
- Dokładny wariant błędu, kolejność wyników, definicja ordinalna i zachowanie terminala
  tam, gdzie określa je zadanie.

Dla zadań raportu bez źródła, porównaj `WindowSummary` pola bezpośrednio. Bezpośrednia umowa nie
wymaga `Debug`, `PartialEq`lub jakiegokolwiek szczególnego pochodzenia; ukryte badania nie mogą
przypadkowo wymagać ich poprzez stwierdzenie całkowitej wartości.

Nie należy badać tylko wartości drukowanych za pomocą przykładu wprowadzającego. Używać
generycznych klientów, lokalnych skanerów właścicieli, niestandardowych `AsRef` / `AsMut`
opakowań, nie- `Copy` rekordów i obserwowalnych liczników sondaży. Kompile-negatywne
obserwacje wyjaśniają granice językowe; same nie przyznają bramki kodowej.

## Źródła

Użyj oficjalnych źródeł dotyczących konkretnych kontraktów. Zapisz `reviewedAt: "2026-09-17"` i utrzymuj stałe identyfikatory źródeł.

- `gat-reference-associated-items` — Rust Reference, typy skojarzone i wymagane klauzule where dla generycznych typów skojarzonych — https://doc.rust-lang.org/reference/items/associated-items.html
- `gat-reference-trait-bounds` — Rust Reference, ograniczenia wyższej rangi i ograniczenia czasów życia — https://doc.rust-lang.org/reference/trait-bounds.html
- `gat-reference-dyn-compatibility` — Rust Reference, zgodność z dyn — https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility
- `gat-slice-windows` — okna wycinka z biblioteki standardowej Rusta — https://doc.rust-lang.org/stable/std/primitive.slice.html#method.windows
- `gat-iterator` — kontrakt `Iterator` z biblioteki standardowej Rusta — https://doc.rust-lang.org/stable/std/iter/trait.Iterator.html
- `gat-gats-stabilization` — blog Rusta, historia stabilizacji GAT — https://blog.rust-lang.org/2022/10/28/gats-stabilization/
- `gat-error-e0038` — indeks błędów Rusta, diagnostyka zgodności obiektów cech — https://doc.rust-lang.org/error_codes/E0038.html
- `gat-error-e0499` — indeks błędów Rusta, nakładające się pożyczki mutowalne — https://doc.rust-lang.org/error_codes/E0499.html

Historyczny wpis na blogu dostarcza kontekstu. Kontrakty lekcji wynikają z aktualnego Rust Reference i dokumentacji biblioteki standardowej. Gdy zmieni się brzmienie komunikatu kompilatora, powiąż przykład z faktycznym kodem błędu lub ograniczonym warunkiem diagnostycznym bez dopasowania całego komunikatu.

Aby uniknąć podwójnej rejestracji, plik producentów eksportuje dokładnie `gat-reference-associated-items`, `gat-slice-windows`, `gat-gats-stabilization` i `gat-error-e0499`. Plik konsumentów eksportuje dokładnie `gat-reference-trait-bounds`, `gat-reference-dyn-compatibility`, `gat-iterator` i `gat-error-e0038`. Lekcja może odwołać się do każdego zarejestrowanego ID bez importowania sąsiedniego pliku treści.

## Jawne wyłączenia i ryzyka

Etap ten nie uczy udzielania pożyczek asynchronicznych, struktur samoreferencyjnych,
niebezpiecznych implementacji `Pin`, ram strumieniowych produkcji, alokatora lub
zachowania wzorcowe, lub wszystkich kompatybilnych z dyn alternatyw. Nie twierdzi ona,
że sama cecha `LendingIterator` jest zespolona, że każdy element GAT jest punktem odniesienia, lub że
adnotacja na całe życie dowodzi pochodzenia wskazującego.

Głównym zagrożeniem dla autoryzacji jest przypadkowe upozorowanie, że przykłady
wyglądają jak zwykłe iteracje z dekoracyjną składnią na całe życie. Zachować odrzucenie
pożyczki na żywo, nie- `Copy` mutacja, lokalne pożyczone dane wejściowe i obserwowalne
badania sondażowe. Drugie ryzyko polega na powielaniu poprzedniej HRTB agregacji
gorliwych lekcji; lekcja 3 jest jedynym chętnym konsumentem generycznym, podczas gdy
lekcja 4 musi z leniwością zwracać wyniki własne. Trzecim ryzykiem jest osłabienie
pustych zadań poprzez ujawnienie podpisu lub osprzętu źródłowego; puste zapowiedzi
powyżej stanowią kompletną umowę o uczeniu się i muszą pozostać wolne od źródła w UI.
