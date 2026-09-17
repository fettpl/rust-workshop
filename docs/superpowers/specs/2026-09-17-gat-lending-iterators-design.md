# GAT and lending iterators

This milestone adds a focused, safe-Rust introduction to generic associated
types (GATs) through lending producers. It follows the existing practical
variance/HRTB module and the basic iterator module. The learner already knows
how a borrow relates to an owner, how a callback can accept every input
lifetime, and how `Iterator::next` returns `Option<Self::Item>`; this stage
shows the case where the item type itself depends on the current borrow of the
producer.

The scope is deliberately limited to standard-library Rust on edition 2024
with Rust 1.85 or newer. It contains no `unsafe`, async lending, external
lending crate, specialization, benchmark claim, or general adapter framework.
The first lesson uses owned rows as a concrete example. It must not imply that
every owned collection needs a GAT, or that every iterator returning a
reference is a lending iterator.

## Integration and assessment

- Module ID: `gat-lending-iterators`; learner title: `GAT i lending iterators: pożyczone elementy`.
- Register the module after `iterators`. Its module prerequisites are
  `borrowed-callbacks` and `iterators`.
- Register four ordered lesson and concept IDs exactly as follows:
  `gat-receiver-borrows`, `gat-overlapping-mutable-windows`,
  `gat-item-capabilities`, and `gat-owned-iterator-adapters`.
- The first lesson and the first concept each list both exact prerequisite IDs
  `hrtb-borrowed-projections` and `iterator-contracts`. Each later lesson and
  concept depends on the immediately preceding new ID. These are
  concept/lesson prerequisites, not module IDs.
- The first two lessons are authored in `src/content/gat-producers.ts` and
  export `gatProducerLessons`, `gatProducerConcepts`,
  `gatProducerCompetencies`, `gatProducerSources`, and
  `gatProducerReviewExercises`. The last two are authored in
  `src/content/gat-consumers.ts` and export the corresponding
  `gatConsumer*` names. Root integration owns
  `src/content/gat-lending-module.ts` and the course registration.
- Every lesson has prediction, an executable observation, an explanation, a
  primary code gate, a source-free blank-page code gate, and recall. The eight
  gates are the primary/blank pair for each concept; the four coding reviews
  are separate delayed retrieval tasks and do not create extra module
  criteria.
- Primary solutions may be exposed by the normal course UI, but exposure must
  leave the blank and review independently assessable. A blank has no starter,
  supplied signature, or hidden scaffolding visible to the learner. Its prose
  gives every public name, parameter role, return value, edge case, ordering
  rule, and stopping rule needed to recreate the contract.
- Each concept uses `evidenceArtifact: "rust-code"` and separate
  assessment/transfer evidence. Each primary and blank `LessonStep` has
  `evidenceGate: true`. The review is a fresh code task with a different
  domain or boundary policy, not a verbal answer or a renamed primary task.
  Existing mastery and retention semantics remain unchanged.
- The module has four criteria, each referring only to that concept's primary
  and blank gate. A learner must not receive the GAT competency from viewing a
  solution, passing a prose choice, or downloading a project package.

The fixed authored assessment fixtures should live in
`src/content/gat-producer-assessment-fixtures.ts` and
`src/content/gat-consumer-assessment-fixtures.ts`, each exporting entries of
the form `{ id, equivalent, mutant }`. A root-owned Node-only harness such as
`src/content/gat-assessment.test.ts` consumes them; course content never
imports the fixtures and they never execute learner or imported code. For all
twelve coding tasks, tests must accept the canonical solution and at least one
harmless equivalent implementation, and must reject a semantic mutant that
compiles but violates the contract. A compile failure is not a substitute for
the semantic-mutant proof. Fixtures should use local, non-`'static` owners and
non-`Copy` values where the contract permits them.

## Shared API contract

The first two lessons introduce the following authored trait. It is intentionally
not `std::iter::Iterator`:

```rust
trait LendingIterator {
    type Item<'a> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

The `where Self: 'a` clause is required for this projection on the supported
toolchains. It says that the associated item is valid for the current borrow
of the receiver; it does not mean `Self: 'static`. The trait alone does not
promise that an item is a reference, that a reference came from the receiver,
that items are mutable, or that `None` is permanent. Every concrete producer
below states its own provenance and exhaustion contract.

The motivation must make three distinctions explicit:

1. `slice::windows` already gives immutable overlapping `&[T]` views tied to
   an external slice lifetime. Two shared views may remain live together.
2. Ordinary mutable iteration can yield non-overlapping `&mut T` or
   non-overlapping mutable chunks through `Iterator`.
3. The new case is sequential overlapping mutable views, or views into storage
   owned/reused by the producer, where the result lifetime follows the current
   `&mut self` loan. The first loan must end before requesting the next one.

The lessons must not state that all windows or all borrowed outputs require a
GAT. The trait is a teaching API whose item family varies with the receiver
borrow. Do not add an external projection HRTB such as
`for<'a> L::Item<'a>: AsRef<[T]>`; on the supported compilers that can impose
an implied-static requirement for a lender borrowing local data. Put the
capability bound on the associated type declaration when it is part of the
API contract, as in lesson 3.

## Lesson 1: `gat-receiver-borrows`

Concept title: `GAT zależny od pożyczki odbiorcy`.

The lesson explains the difference between storage owned by a producer and the
short loan returned by one call to `next`. It uses `Vec<Vec<T>>` because the
ownership is visible in a small example. The producer is not a general-purpose
collection abstraction.

### Primary gate: `gat-receiver-borrows-gate`

The learner completes the following API. The shown fields are an illustrative
private representation, not a layout that hidden tests may inspect; any
private representation preserving the public contract is valid:

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

`RowLender::new` starts at row zero and does not clone, sort, or flatten the
input. Each `Some` is a mutable view into the corresponding owned row, in
input order. An empty row is still `Some(&mut [])`, so it is distinct from
exhaustion. A callback or caller may mutate the current row, but must release
that loan before asking for the next row. Once all rows have been visited, the
producer is fused: every later `next` returns `None`. An empty outer vector
returns `None` immediately. The result never outlives the current receiver
borrow.

Hidden tests must use at least one `String` or another non-`Copy` element,
include empty and Unicode-bearing rows, mutate rows in place, verify the exact
order and verify repeated `None`. They must also attempt the sequential usage
pattern in which a current loan is consumed before the next call; retaining
two mutable row loans is a compile-fail observation, not a passing behavior.
To check provenance without depending on private fields, a test may save each
row's pointer before moving the outer vector into `RowLender::new` and compare
it with the corresponding returned view.

### Blank gate: `gat-receiver-borrows-blank`

Source-free Polish prompt contract:

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

The hidden client must use local non-`'static` text or records and verify that
vacancies do not create output positions, occupied values are mutable, all
occupied values appear exactly once, and repeated calls after exhaustion
return `None`. Its internal search work is not exposed by this API and must
not be claimed as an observable polling assertion. A mutant that stops at the first vacancy instead of continuing
to the next occupied value must compile in the mutation fixture and fail
behavioral assertions.

### Independent retrieval: `gat-receiver-borrows-review`

The learner implements a new `ReverseRowLender<T>` with private state and
`new(rows: Vec<Vec<T>>)`. It uses the same `LendingIterator` item family
`&'a mut [T]`, but starts at the last row and visits rows in reverse order.
Empty rows remain `Some(&mut [])`; an empty outer vector has no items; after the
last row every later `next` returns `None`. The review tests mutation and
pointer identity for local `String` rows and requires the learner to implement
the producer rather than merely write a consumer. This is a reversed order and
therefore a distinct transfer contract.

### Lesson explanation and observation

The runnable observation should show one mutable row being used, released,
and then the next row being requested. It should include an empty row and print
the final owned collection. A separate intentionally rejected snippet keeps a
first mutable item alive while calling `next` again and records the actual
borrow-checker diagnostic. The explanation names the GAT projection, the
receiver lifetime, the owned storage, and the fact that fused behavior belongs
to `RowLender`, not to `LendingIterator`.

## Lesson 2: `gat-overlapping-mutable-windows`

Concept title: `Sekwencyjne nakładające się okna mutowalne`.

This lesson establishes the exact constructor and exhaustion policy before
asking for an implementation. The safe design relies on sequential short
loans: no caller may retain an earlier mutable window while requesting the
next one. It must use neither `unsafe` nor `Copy`/`Clone` bounds.

### Exact error and producer contract

The authored error is deliberately small and exact:

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

`new` returns `Err(WidthError::Zero)` for width zero and never panics. For a
positive width greater than the input length it returns an initialized lender
that yields no windows. The same is true for positive width with empty input.
Width equal to the length yields exactly one window; width one visits each
element; every start advances by one. A window has exactly `width` elements.

After exhaustion, `next` returns `None` forever. The implementation must
handle `position.checked_add(width)` failure as terminal exhaustion without
panic. A test with `usize::MAX` on a short slice exercises the oversized-width
policy; it does not by itself prove that the checked-add branch executed. Do
not claim direct arithmetic-overflow coverage unless an authored module-internal
state fixture makes that branch reachable. With positive width and a valid
window, `position < data.len()`, so advancing the position by one is safe under
the stated invariant.

The fields in the illustrative declaration are private implementation state;
authors may use a different private layout. Tests must observe only the
constructor result, returned windows and post-call data, never field names.

### Primary gate: `gat-overlapping-mutable-windows-gate`

The learner implements the exact API above. Hidden tests use a mutable slice of
`String` records or a custom non-`Copy` struct, mutate each returned window,
and then assert cumulative effects at overlapping positions. They cover zero
width and the exact `WidthError::Zero`, oversized width, empty input, width
equal to length, width one, repeated `None`, and a width of `usize::MAX` on a
small input. They verify that no two mutable loans are retained at once.

The prompt must say explicitly that the current window may be mutated and
released before the next poll, that overlapping means the same element can be
mutated in successive calls, and that the type's fused policy is stronger than
the trait's minimum contract.

### Blank gate: `gat-overlapping-mutable-windows-blank`

Source-free Polish prompt contract:

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

This differs from the primary in growth from the front, a maximum-length
boundary, and a termination rule rather than fixed-width sliding windows. It
must test non-`Copy` values, cumulative prefix mutation, zero maximum, empty
input, maximum greater than data length, and repeated exhaustion. The mutant
that starts at one and advances instead of growing prefixes must compile and
fail the expected sequence.

### Independent retrieval: `gat-overlapping-mutable-windows-review`

The learner implements `ReverseWindowsMut<'data, T>` with
`new(data: &'data mut [T], width: usize) -> Result<Self, WidthError>` and the
same `Item<'a> = &'a mut [T]`. It returns fixed-width windows from the last
valid start toward zero, then remains fused. It uses the same `WidthError::Zero`
for zero width, yields no windows for positive oversized width or empty input,
and yields one window when width equals the data length. Each returned window
is released before the next request. Hidden tests use non-`Copy` records and
check reverse order, overlap, all boundary cases, and cumulative mutation.

### Lesson explanation and observation

The observation contrasts an ordinary immutable `slice::windows` loop and a
safe ordinary non-overlapping mutable iterator with the GAT producer. It then
shows sequential overlapping mutation and a rejected live-loan example. The
explanation must state that GAT solves the relation between the current
receiver borrow and the item family; it does not make simultaneous mutable
aliases legal. `WindowsMut`'s width and fused behavior are concrete type
invariants, not properties inferred from the trait declaration.

## Lesson 3: `gat-item-capabilities`

Concept title: `Możliwości elementu zapisane w GAT`.

This is the one eager generic-consumer lesson. The API intentionally narrows
the family of lending producers so a consumer can use slice capabilities
without an external projection bound:

```rust
trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

The prompt must explain that the bound is part of this specialized trait's
contract. It does not silently strengthen or replace the earlier unconstrained
`LendingIterator`, and it does not claim that every GAT item is a slice.
`Self: 'a` remains the receiver-borrow validity bound, not a static lifetime.

### Primary gate: `gat-item-capabilities-gate`

The learner implements this generic eager consumer:

```rust
fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    // learner implementation
}
```

The exact contract is: poll `lender.next()` until it returns `None`; for each
`Some(item)`, call `visit(item.as_mut())` exactly once and push the returned
`usize` into the result in source order. Do not call `visit` for `None`, do not
retain an item after the call, and do not add `Clone`, `'static`, or unrelated
trait bounds. The consumer returns an owned `Vec<usize>` and preserves every
mutation made by `visit`. It is eager because the function drains the source
in one call.

Hidden tests provide both an item that is directly `&mut [T]` and a custom
non-reference wrapper implementing `AsRef<[T]> + AsMut<[T]>`. They use local
non-`'static` records containing borrowed text, a non-`Copy` element type, a
stateful callback, empty slices, and multiple slices. The callback mutates each
element and returns a value derived from the current slice; tests verify the
returned owned counts, exact callback order and all mutations. A caller-side
`for<'a> L::Item<'a>: AsMut<[T]>` workaround is intentionally outside the
contract.

### Blank gate: `gat-item-capabilities-blank`

Source-free Polish prompt contract:

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

The hidden tests check stop on first, middle, last, and no stop; exact source
poll count; exact callback count; mutation of the stopping item; resumption
from the next item on a second consumer call; empty input; and a local borrowed
record. A mutant that checks the decision after polling one extra item, omits
the stopping mutation, or resets the lender must compile and fail.

### Independent retrieval: `gat-item-capabilities-review`

The learner implements:

```rust
fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    // learner implementation
}
```

It must poll every source item through `None`, consume empty items but skip
calling `choose` for empty slices, call `choose(item.as_ref())` exactly once
for every non-empty item, skip `None` reports while preserving the order of
`Some(report)`, and return owned `R` without `Clone` or `'static`. The review is
read-only and has a deliberate empty-item policy different from the primary
mutation-and-stop contract. Tests use direct references, a custom wrapper,
non-`Copy` owned reports, local borrowed input, and a selector that returns
`None` for one non-empty item.

### Lesson explanation and observation

The observation first tries a consumer with a capability bound placed outside
the GAT and records the actual implied-static failure for a local lender. It
then shows the specialized `SliceLender` declaration compiling with a local,
non-`Copy` record and a custom `AsRef`/`AsMut` wrapper. The explanation must
distinguish the narrower API guarantee from a universal statement about GATs
or HRTBs.

## Lesson 4: `gat-owned-iterator-adapters`

Concept title: `Adapter kończący pożyczkę i oddający własność`.

This lesson crosses from a lending producer to ordinary `std::iter::Iterator`.
The adapter must finish using the current item inside `next` and return an
owned summary, so no lending item escapes the call. It teaches laziness and
does not repeat the eager consumer from lesson 3.

Use this owned result type:

```rust
#[derive(Debug, PartialEq, Eq)]
struct WindowSummary {
    index: usize,
    len: usize,
}
```

### Primary gate: `gat-owned-iterator-adapters-gate`

The learner implements an adapter with private fields and this public shape:

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

Construction performs zero source polls. One adapter `next` polls at most one
source item: on `Some(item)` it records the current source ordinal and
`item.as_ref().len()` in an owned `WindowSummary`; the item loan is completely
finished before the summary is returned. The ordinal starts at zero and
increments for every `Some`, including an empty item, using
`saturating_add(1)` so an unusually long custom source cannot panic on ordinal
overflow. `None` marks the adapter
done; after that, every adapter `next` returns `None` without polling the
source. The adapter preserves source order and emits one summary per source
item. It does not call a callback, retain a slice, or require `T: Clone` or
`'static`.

Tests must instrument a fixed authored lender to prove zero work at
construction, one source poll per adapter poll, correct partial results, exact
empty-item summaries, owned result values, and permanent exhaustion. The
source may own or borrow local non-`'static` data; no returned summary may
contain that borrow.

### Blank gate: `gat-owned-iterator-adapters-blank`

Source-free Polish prompt contract:

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

This differs from the primary by filtering empty items and allowing several
source polls in one adapter poll. Hidden tests use source lengths such as
`[0, 2, 0, 3]`, assert indexes `[1, 3]`, count source polls, check lazy
construction, and verify no polling after source exhaustion. Mutants that
renumber after filtering, return empty reports, or poll only once per adapter
call must compile and fail. The blank's ordinal also uses `saturating_add(1)`.
Review this arithmetic directly; ordinary public-input tests cannot practically
reach the adapter's counter limit. A maintainer-only probe may initialize its
own authored adapter counter near `usize::MAX`, but hidden learner tests must
not inspect or require a private layout. Changing the source's own counter
does not advance an adapter counter initialized at zero.

### Independent retrieval: `gat-owned-iterator-adapters-review`

The learner implements `CappedSummaries<L, T>` with `new(source: L,
maximum: usize)`. It implements ordinary `Iterator<Item = WindowSummary>` and
uses the same owned report. Construction is lazy. Each adapter `next` polls at
most one source item. A `None` source item ends the adapter. An empty or
otherwise valid item is yielded, including length zero, when `len <= maximum`.
The first `Some` item with `len > maximum` is consumed but not yielded and
immediately ends the adapter; later source items are never polled. Its report
index is the ordinal of every earlier `Some` item, with the private ordinal
counter advanced using `saturating_add(1)` so an unusually long custom source
cannot panic. Thus the review has a
stop-at-first-oversize policy, rather than the blank's skip-empty policy, and
tests must include oversize first, middle, and absent, maximum zero, empty
items, partial consumption, and repeated terminal `None`.

### Dyn-compatible boundary observation

The lesson includes a checked observation, but not a separate dyn mastery
criterion. The proposed GAT-bearing `LendingIterator` cannot be used as a
trait object; the corrected probe should fail only with E0038 after attempting
the object type. A separate concrete-output trait such as

```rust
trait StringLender {
    fn next_strings(&mut self) -> Option<&mut [String]>;
}
```

does work through `&mut dyn StringLender` and still enforces sequential
lending. Therefore the explanation must not say that lending, a method
lifetime, or every GAT is inherently incompatible with `dyn`. It must tie the
boundary to this GAT-bearing API and current dyn-compatibility rules. A
separate dyn competency would require two executable gates and its own coding
retrieval; it is outside this four-lesson milestone.

### Lesson explanation and observation

The observation counts source polls before and after adapter construction,
after one `next`, and after `collect`. It shows that an owned summary can leave
the borrowing context while a slice cannot. The explanation distinguishes
`LendingIterator::next` from ordinary `Iterator::next`, states where the loan
ends, and connects the blank's repeated polling to laziness without claiming
that all adapters have the same polling policy.

## Lesson shape and code verification

Each lesson should contain six to eight steps in the repository's existing
data-driven shape:

1. A prediction about the next type, legal loan, or poll count.
2. A fixed, trusted observation that compiles or intentionally rejects with a
   real diagnostic. It must not execute learner code.
3. A Polish explanation naming the exact API and invariant.
4. The primary code task with its complete starter and hidden tests.
5. The source-free blank task with its independent hidden tests.
6. A recall step that corrects a likely misconception.

Learner submissions continue through the existing isolated Rust execution
endpoint. Only fixed authored references, negative observations, equivalent
solutions, and semantic mutants execute in local verification. No new runner
target, API request shape, package, or execution boundary is needed. The
trusted verifier should compile authored Rust references and negative
observations only. Content validation must ensure the four concepts,
eight gate IDs, four review IDs, prerequisite chain, exact source-free blank
prompts, and nonempty test contracts are registered.

The fixed tests should check, for every task:

- canonical reference behavior on local, non-`'static` owners;
- one harmless change of layout, naming of private state, or equivalent loop
  that preserves the public contract;
- one compiling semantic mutant that changes order, emptiness, mutation,
  stopping, ownership, or polling and fails runtime assertions;
- no accidental `Clone`, `Copy`, `'static`, `unsafe`, external crate, or
  unbounded source polling where the task forbids it;
- exact error variant, result order, ordinal definition, and terminal behavior
  where the task specifies them.

For source-free report tasks, compare `WindowSummary` fields directly. The
blank contract does not require `Debug`, `PartialEq`, or any particular derive;
hidden tests must not accidentally demand them through whole-value assertions.

Do not test only the values printed by the introductory example. Use generic
clients, local owner scopes, custom `AsRef`/`AsMut` wrappers, non-`Copy`
records, and observable poll counters. Compile-negative observations explain
language boundaries; they do not award a code gate by themselves.

## Sources

Use narrow, official sources with `reviewedAt: "2026-09-17"` and source IDs
that are stable in the content files:

- `gat-reference-associated-items` — Rust Reference, associated types and
  required where clauses on generic associated types:
  https://doc.rust-lang.org/reference/items/associated-items.html
- `gat-reference-trait-bounds` — Rust Reference, higher-ranked and lifetime
  bounds:
  https://doc.rust-lang.org/reference/trait-bounds.html
- `gat-reference-dyn-compatibility` — Rust Reference, dyn compatibility:
  https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility
- `gat-slice-windows` — Rust standard library slice windows:
  https://doc.rust-lang.org/stable/std/primitive.slice.html#method.windows
- `gat-iterator` — Rust standard library `Iterator` contract:
  https://doc.rust-lang.org/stable/std/iter/trait.Iterator.html
- `gat-gats-stabilization` — Rust blog, GAT stabilization background:
  https://blog.rust-lang.org/2022/10/28/gats-stabilization/
- `gat-error-e0038` — Rust Error Index, trait object compatibility diagnostic:
  https://doc.rust-lang.org/error_codes/E0038.html
- `gat-error-e0499` — Rust Error Index, overlapping mutable borrows:
  https://doc.rust-lang.org/error_codes/E0499.html

The historical blog source provides context only; current Reference and
standard-library pages define the lesson contracts. If a compiler diagnostic
wording changes, keep the observation tied to the actual error code or a
bounded diagnostic predicate rather than matching a long message.

To prevent duplicate source registration, the producer file exports exactly
these four source IDs: `gat-reference-associated-items`,
`gat-slice-windows`, `gat-gats-stabilization`, and `gat-error-e0499`. The
consumer file exports exactly these four: `gat-reference-trait-bounds`,
`gat-reference-dyn-compatibility`, `gat-iterator`, and `gat-error-e0038`.
Lessons may reference any registered source ID without importing the sibling
content file.

## Explicit non-goals and risks

This stage does not teach async lending, self-referential structs, unsafe
implementations, `Pin`, a production streaming framework, allocator or
benchmark behavior, or all dyn-compatible alternatives. It does not claim
that the `LendingIterator` trait itself is fused, that every GAT item is a
reference, or that a lifetime annotation proves pointer provenance.

The main authoring risk is accidentally making the examples look like ordinary
iteration with decorative lifetime syntax. Keep the live-loan rejection,
non-`Copy` mutation, local borrowed input, and observable polling tests. The
second risk is duplicating the preceding HRTB lesson's eager aggregation;
lesson 3 is the only eager generic consumer, while lesson 4 must return owned
results lazily. The third risk is weakening blank tasks by revealing a
signature or a source fixture; blank prompts above are the complete learner
contract and must remain source-free in the UI.
