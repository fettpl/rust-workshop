import type { ProjectContract, ProjectPackage } from "../../domain/types";

export const concurrencyLabPackage: ProjectPackage = {
  id: "concurrency-lab-workshop",
  title: "Laboratorium: protokoły atomowe",
  description:
    "Zbuduj rezerwację limitu i jednokrotną publikację danych. Ten sam kod biblioteki sprawdzisz zwykłymi testami oraz instrumentowanymi typami Loom.",
  instructions: [
    "Rozpakuj pakiet. Pobierz przypięte zależności raz przez cargo fetch --locked; późniejsze polecenia mogą działać offline.",
    "Uzupełnij reserve, Publisher::publish i Subscriber::try_read w src/lib.rs według testów i kontraktu README.",
    "Uruchom cargo test --offline --locked oraz cargo test --offline --locked --features model --test models.",
    "Odtwórz osobno dwa celowe kontrprzykłady według README. Powinny dać właściwą nieudaną asercję, a nie timeout.",
    "Sprawdź format i Clippy dla obu wariantów. Zapisz w ADR własne uzasadnienie porządkowania oraz ograniczeń modelu.",
  ],
  revealStepRefs: [
    { lessonId: "atomic-rmw", stepId: "atomic-rmw-fetch-gate" },
    { lessonId: "atomic-cas", stepId: "atomic-cas-retry-gate" },
    { lessonId: "atomic-limits", stepId: "atomic-limits-counter-gate" },
    { lessonId: "release-acquire", stepId: "release-acquire-publication-gate" },
    {
      lessonId: "ordering-contracts",
      stepId: "ordering-contracts-validation-gate",
    },
    { lessonId: "loom-evidence", stepId: "loom-evidence-assertions-gate" },
  ],
  files: [
    {
      path: "README.md",
      starter: `# Laboratorium: protokoły atomowe

Cel: uzasadnić niezmiennik, odtworzyć kontrprzykład i sprawdzić poprawkę. Ten pakiet uzupełnia lekcje o atomics i porządkowaniu pamięci. Nie jest gotową biblioteką do produkcji.

## Uruchomienie

Potrzebny jest stable Rust obsługujący edition 2024. Loom jest przypięty do 0.7.2, a Cargo.lock zachowuje rozstrzygnięte zależności. Pierwsze pobranie wymaga internetu:

\`\`\`sh
cargo fetch --locked
cargo fmt --all -- --check
cargo check --offline --locked --all-targets
cargo test --offline --locked
cargo clippy --offline --locked --all-targets -- -D warnings
cargo test --offline --locked --features model --test models
cargo clippy --offline --locked --all-targets --all-features -- -D warnings
\`\`\`

Starter ma celowe \`todo!\`: uzupełnij reserve, Publisher::publish i Subscriber::try_read. Testy startera powinny się nie powieść. Korzystaj z testów jako kontraktu. Rozwiązanie referencyjne przechodzi polecenia powyżej. Samo pobranie, checklisty i lokalne testy nie naliczają zaliczenia w aplikacji.

Feature \`model\` przełącza importy w src/sync.rs na Loom. Uruchamiaj wtedy bibliotekę wyłącznie wewnątrz loom::model/Builder::check. Testy standardowe są wyłączone w tym wariancie, a modelowe w zwykłym wariancie. To ten sam kod reserve/publish/try_read, a nie jego przepisana kopia.

## Kontrakty

- \`reserve(&AtomicUsize, amount, limit)\` zwraca Some(stara wartość), jeżeli cała rezerwacja mieści się w limicie i w usize. W przeciwnym razie daje None bez zmiany. Zero jest legalne wyłącznie dla aktualnego stanu nieprzekraczającego limitu. CAS po porażce ponownie sprawdza warunek względem zaobserwowanej wartości. Licznik nie publikuje żadnych innych danych.
- \`publication()\` tworzy jeden nieklonowalny Publisher i klonowalny Subscriber. \`publish(self, value)\` zużywa prawo zapisu. Wszystkie usize, także 0 i MAX, są poprawnymi wiadomościami. Subscriber wykonuje pojedynczą próbę: None oznacza brak zaobserwowanej publikacji, Some musi zawierać opublikowaną wartość. To nie jest kanał wielokrotnego użytku.
- Porzucenie Publisher pozostawia None; API nie rozróżnia oczekiwania od porzucenia. Nie ma blokowania, budzenia ani gwarancji ukończenia w określonym czasie. Pętla CAS może być ponawiana wskutek konkurencji; nie obiecuje sprawiedliwości.

## Model i kontrprzykłady

tests/models.rs bada dwóch uczestników: dwie rezerwacje po 2 dla limitu 3 oraz publikację obserwowaną PRZED join. Wynik odczytu może być None. Jeżeli jest Some, musi spełniać niezmiennik. Odczyt dopiero po join ukryłby brak synchronizacji przez flagę.

Dwa celowo błędne modele są wyłączone z normalnego przebiegu. Każde polecenie poniżej ma zakończyć się nieudaną asercją, a nie timeoutem:

\`\`\`sh
cargo test --offline --locked --features model --test counterexamples separate_load_store_loses_an_update -- --ignored --exact
cargo test --offline --locked --features model --test counterexamples relaxed_publication_can_read_stale_payload -- --ignored --exact
\`\`\`

Pierwszy pokazuje, że nawet SeqCst nie zamienia load + store w jedną transakcję (LOST_UPDATE_INVARIANT). Drugi dopuszcza zaobserwowanie flagi bez właściwej wartości (PUBLICATION_INVARIANT). Usunięcie asercji nie jest naprawą.

Builder nie ogranicza liczby permutacji, czasu ani preempcji i nie wznawia starego checkpointu. Limit 3 wątków obejmuje uczestnika głównego; limit 1000 rozgałęzień przerywa zbyt duży przebieg błędem. Modele są celowo małe i nie używają losowości, sleep ani aktywnego oczekiwania. Wynik obowiązuje dla tego kodu, danych i możliwości modelu. Loom nie obejmuje wszystkich zachowań dozwolonych przez Relaxed; zielony wynik nie jest dowodem poprawności każdego protokołu, architektury lub większej liczby uczestników. Operacje spoza typów Loom są niewidoczne dla modelowania.

## Decyzja i transfer

Przeczytaj ADR.md, potem zapisz własne uzasadnienie. Zmień dane rezerwacji i wartość publikacji. Następnie zaprojektuj rozszerzenie na wielokrotnego nadawcę: samo sklonowanie Publisher lub ponowne zerowanie ready nie wystarczy. Wskaż potrzebny nowy stan/protokół i niezmiennik, zanim napiszesz implementację. Na tym etapie możesz wybrać gotowy kanał albo Mutex; nie twórz bez uzasadnienia własnego lock-free kanału.

Źródła: [std atomic](https://doc.rust-lang.org/std/sync/atomic/), [Ordering](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html), [Loom 0.7.2](https://docs.rs/loom/0.7.2/loom/). Sprawdzone 12 września 2026.
`,
    },
    {
      path: "ADR.md",
      starter: `# ADR: jeden niezmiennik na protokół

Status: decyzja w laboratorium, nie rekomendacja wdrożenia własnych prymitywów.

## Rezerwacja

Licznik opisuje wyłącznie liczbę zajętych jednostek. Warunek brzmi: udana rezerwacja nie przekracza limitu i zwraca wartość bezpośrednio przed swoją aktualizacją. Limit musi być wspólną regułą dla uczestników, jeśli ma obowiązywać globalnie. Nie ma tu publikacji innych danych. Relaxed wystarcza do atomowej aktualizacji jednej komórki przez CAS. Powrót Err z CAS oznacza zmianę obserwacji; ponownie sprawdzamy dodawanie i limit. Nie wolno powtarzać starego next.

Mutex byłby prostszym wyborem, gdyby aktualizacja dotyczyła kilku pól lub potrzebowała obsługi złożonej odmowy. Nie twierdzimy, że CAS jest szybszy. Benchmark wymaga osobnej hipotezy, danych i pomiaru konkurencji.

## Publikacja

Publisher ma wyłączną, konsumowaną możliwość zapisu. Dane po publikacji są niezmienne. Sekwencja:

1. Nadawca zapisuje value przez Relaxed.
2. Nadawca zapisuje true do ready przez Release.
3. Odbiorca odczytuje to true z ready przez Acquire.
4. Dopiero wtedy odbiorca odczytuje value przez Relaxed.

Synchronizacja zachodzi, gdy Acquire odczytuje wartość z odpowiedniego Release; nie przez sam fakt użycia nazw tych orderingów. Sekwencja łączy wcześniejszy zapis z późniejszym odczytem danych. ready nigdy nie wraca do false, a nie ma drugiego nadawcy, więc ten odczyt true jest jednoznaczny. Payload także jest atomowy: wadliwy wariant może zwrócić błędną wartość, lecz nie tworzymy przykładu UB.

Odrzucono: Relaxed na fladze, poleganie na join przed asercją modelu oraz resetowanie ready dla kolejnej wiadomości bez nowego protokołu. SeqCst byłby mocniejszy, ale sam nie rozwiązałby problemów wielokrotnych nadawców. Gotowy kanał ma szerszy kontrakt i byłby naturalnym wyborem dla produkcyjnego przepływu wiadomości.

## Granice dowodu

Zwykłe testy sprawdzają API i wartości graniczne. Loom modeluje małe scenariusze na instrumentowanych typach. Celowe kontrprzykłady muszą faktycznie zawieść, co sprawdza czułość testu. Narzędzie nie zastępuje uzasadnienia happens-before, analizy większego protokołu, kontroli wszystkich zależności ani pomiarów.
`,
    },
    {
      path: "Cargo.toml",
      starter: `[package]
name = "concurrency-lab-workshop"
version = "0.1.0"
edition = "2024"
publish = false

[features]
default = []
model = ["dep:loom"]

[dependencies]
loom = { version = "=0.7.2", optional = true }
`,
    },
    {
      path: "Cargo.lock",
      starter: `# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 4

[[package]]
name = "aho-corasick"
version = "1.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c982642fa9e8606056828ee9a8505737230110bb1099153c79efe865c59d12ba"
dependencies = [
 "memchr",
]

[[package]]
name = "cc"
version = "1.4.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "005ec2760ca554fae18df7a11195552ec576cd665632a881bc011d5bb2fd4d80"
dependencies = [
 "find-msvc-tools",
 "shlex",
]

[[package]]
name = "cfg-if"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9330f8b2ff13f34540b44e946ef35111825727b38d33286ef986142615121801"

[[package]]
name = "concurrency-lab-workshop"
version = "0.1.0"
dependencies = [
 "loom",
]

[[package]]
name = "find-msvc-tools"
version = "0.1.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3e0f1c7c3a72c66fd80abe965175f7523475c0489a87d3ff9d6e8c87d87a9d2d"

[[package]]
name = "generator"
version = "0.8.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b3b854b0e584ead1a33f18b2fcad7cf7be18b3875c78816b753639aa501513ae"
dependencies = [
 "cc",
 "cfg-if",
 "libc",
 "log",
 "rustversion",
 "windows-link",
 "windows-result",
]

[[package]]
name = "lazy_static"
version = "1.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bbd2bcb4c963f2ddae06a2efc7e9f3591312473c50c6685e1f298068316e66fe"

[[package]]
name = "libc"
version = "0.2.189"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3eaf3ede3fee6db1a4c2ee091bf8a8b4dccdc6d17f656fb07896ee72867612f2"

[[package]]
name = "log"
version = "0.4.34"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f9f8bd3e56ce4dfc153cf470fffbfa98c7620958b312ca5c3a4b8d5181fd13c6"

[[package]]
name = "loom"
version = "0.7.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "419e0dc8046cb947daa77eb95ae174acfbddb7673b4151f56d1eed8e93fbfaca"
dependencies = [
 "cfg-if",
 "generator",
 "scoped-tls",
 "tracing",
 "tracing-subscriber",
]

[[package]]
name = "matchers"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d1525a2a28c7f4fa0fc98bb91ae755d1e2d1505079e05539e35bc876b5d65ae9"
dependencies = [
 "regex-automata",
]

[[package]]
name = "memchr"
version = "2.8.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cf8baf1c55e62ffcace7a9f06f4bd9cd3f0c4beb022d3b367256b91b87513d98"

[[package]]
name = "nu-ansi-term"
version = "0.50.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7957b9740744892f114936ab4a57b3f487491bbeafaf8083688b16841a4240e5"
dependencies = [
 "windows-sys",
]

[[package]]
name = "once_cell"
version = "1.21.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9f7c3e4beb33f85d45ae3e3a1792185706c8e16d043238c593331cc7cd313b50"

[[package]]
name = "pin-project-lite"
version = "0.2.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a89322df9ebe1c1578d689c92318e070967d1042b512afbe49518723f4e6d5cd"

[[package]]
name = "regex-automata"
version = "0.4.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ad8553b9b26413251cbf30e620595c7a41b3887f03da04579c0e6b0d6a06b4b2"
dependencies = [
 "aho-corasick",
 "memchr",
 "regex-syntax",
]

[[package]]
name = "regex-syntax"
version = "0.8.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d6f6ff9a378485b298a5286656da665ba74413d36db0979633275d2e708145d4"

[[package]]
name = "rustversion"
version = "1.0.23"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cf54715a573b99ac80df0bc206da022bcd442c974952c7b9720069370852e21f"

[[package]]
name = "scoped-tls"
version = "1.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e1cf6437eb19a8f4a6cc0f7dca544973b0b78843adbfeb3683d1a94a0024a294"

[[package]]
name = "sharded-slab"
version = "0.1.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f40ca3c46823713e0d4209592e8d6e826aa57e928f09752619fc696c499637f6"
dependencies = [
 "lazy_static",
]

[[package]]
name = "shlex"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8fadd59c855ef2080decdef8ff161eb6661b86933c9d82e5ba29dc602a55aba"

[[package]]
name = "smallvec"
version = "1.16.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ba467056f1b547ed52077911161fc86985becbc60e8e1857c8a144dab0def891"

[[package]]
name = "thread_local"
version = "1.1.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1ad99c4c6d32803332c548b1af0540b357b3f5fc0be8f6c6bfe8b2e6ae784070"
dependencies = [
 "cfg-if",
]

[[package]]
name = "tracing"
version = "0.1.44"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "63e71662fa4b2a2c3a26f570f037eb95bb1f85397f3cd8076caed2f026a6d100"
dependencies = [
 "pin-project-lite",
 "tracing-core",
]

[[package]]
name = "tracing-core"
version = "0.1.36"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "db97caf9d906fbde555dd62fa95ddba9eecfd14cb388e4f491a66d74cd5fb79a"
dependencies = [
 "once_cell",
 "valuable",
]

[[package]]
name = "tracing-log"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee855f1f400bd0e5c02d150ae5de3840039a3f54b025156404e34c23c03f47c3"
dependencies = [
 "log",
 "once_cell",
 "tracing-core",
]

[[package]]
name = "tracing-subscriber"
version = "0.3.23"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cb7f578e5945fb242538965c2d0b04418d38ec25c79d160cd279bf0731c8d319"
dependencies = [
 "matchers",
 "nu-ansi-term",
 "once_cell",
 "regex-automata",
 "sharded-slab",
 "smallvec",
 "thread_local",
 "tracing",
 "tracing-core",
 "tracing-log",
]

[[package]]
name = "valuable"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ba73ea9cf16a25df0c8caa16c51acb937d5712a8429db78a3ee29d5dcacd3a65"

[[package]]
name = "windows-link"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f0805222e57f7521d6a62e36fa9163bc891acd422f971defe97d64e70d0a4fe5"

[[package]]
name = "windows-result"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7781fa89eaf60850ac3d2da7af8e5242a5ea78d1a11c49bf2910bb5a73853eb5"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-sys"
version = "0.61.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ae137229bcbd6cdf0f7b80a31df61766145077ddf49416a728b02cb3921ff3fc"
dependencies = [
 "windows-link",
]
`,
    },
    {
      path: "src/lib.rs",
      starter: `#![forbid(unsafe_code)]

pub mod sync;
use sync::{Arc, AtomicBool, AtomicUsize, Ordering};

/// Reserves \`amount\` units without exceeding \`limit\`, returning the old count.
/// A zero-sized reservation succeeds only if the current count is within limit.
/// No other memory is published by this counter. No fairness guarantee is made.
pub fn reserve(counter: &AtomicUsize, amount: usize, limit: usize) -> Option<usize> {
    let _ = (counter, amount, limit);
    todo!("checked CAS loop")
}

struct State {
    value: AtomicUsize,
    ready: AtomicBool,
}

/// The only publication handle. Publishing consumes it; it cannot be cloned.
pub struct Publisher(Arc<State>);
/// A read handle for one immutable publication, not a reusable channel.
#[derive(Clone)]
pub struct Subscriber(Arc<State>);

/// Creates an unpublished slot. Dropping Publisher without publishing leaves None.
pub fn publication() -> (Publisher, Subscriber) {
    let state = Arc::new(State {
        value: AtomicUsize::new(0),
        ready: AtomicBool::new(false),
    });
    (Publisher(Arc::clone(&state)), Subscriber(state))
}

impl Publisher {
    /// Publishes exactly once. The ready flag carries the synchronization edge.
    ///
    /// \`\`\`compile_fail
    /// let (writer, _) = concurrency_lab_workshop::publication();
    /// writer.publish(7);
    /// writer.publish(9); // The first call consumed the only Publisher.
    /// \`\`\`
    pub fn publish(self, value: usize) {
        let _ = (self, value);
        todo!("publish payload before the flag")
    }
}
impl Subscriber {
    /// Reads once; None is valid until publication is observed. Does not spin.
    pub fn try_read(&self) -> Option<usize> {
        todo!("observe the flag before reading payload")
    }
}
`,
      solution: `#![forbid(unsafe_code)]

pub mod sync;
use sync::{Arc, AtomicBool, AtomicUsize, Ordering};

/// Reserves \`amount\` units without exceeding \`limit\`, returning the old count.
/// A zero-sized reservation succeeds only if the current count is within limit.
/// No other memory is published by this counter. No fairness guarantee is made.
pub fn reserve(counter: &AtomicUsize, amount: usize, limit: usize) -> Option<usize> {
    let mut old = counter.load(Ordering::Relaxed);
    loop {
        let next = old.checked_add(amount)?;
        if next > limit {
            return None;
        }
        match counter.compare_exchange(old, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(previous) => return Some(previous),
            Err(observed) => old = observed,
        }
    }
}

struct State {
    value: AtomicUsize,
    ready: AtomicBool,
}

/// The only publication handle. Publishing consumes it; it cannot be cloned.
pub struct Publisher(Arc<State>);
/// A read handle for one immutable publication, not a reusable channel.
#[derive(Clone)]
pub struct Subscriber(Arc<State>);

/// Creates an unpublished slot. Dropping Publisher without publishing leaves None.
pub fn publication() -> (Publisher, Subscriber) {
    let state = Arc::new(State {
        value: AtomicUsize::new(0),
        ready: AtomicBool::new(false),
    });
    (Publisher(Arc::clone(&state)), Subscriber(state))
}

impl Publisher {
    /// Publishes exactly once. The ready flag carries the synchronization edge.
    ///
    /// \`\`\`compile_fail
    /// let (writer, _) = concurrency_lab_workshop::publication();
    /// writer.publish(7);
    /// writer.publish(9); // The first call consumed the only Publisher.
    /// \`\`\`
    pub fn publish(self, value: usize) {
        self.0.value.store(value, Ordering::Relaxed);
        self.0.ready.store(true, Ordering::Release);
    }
}
impl Subscriber {
    /// Reads once; None is valid until publication is observed. Does not spin.
    pub fn try_read(&self) -> Option<usize> {
        if self.0.ready.load(Ordering::Acquire) {
            Some(self.0.value.load(Ordering::Relaxed))
        } else {
            None
        }
    }
}
`,
    },
    {
      path: "src/sync.rs",
      starter: `#[cfg(feature = "model")]
pub use loom::sync::{
    Arc,
    atomic::{AtomicBool, AtomicUsize, Ordering},
};
#[cfg(not(feature = "model"))]
pub use std::sync::{
    Arc,
    atomic::{AtomicBool, AtomicUsize, Ordering},
};
`,
    },
    {
      path: "tests/standard.rs",
      starter: `#![cfg(not(feature = "model"))]
use concurrency_lab_workshop::{
    publication, reserve,
    sync::{Arc, AtomicUsize, Ordering},
};
use std::thread;

#[test]
fn checked_boundaries_and_zero() {
    for (initial, amount, limit, expected, after) in [
        (3, 2, 8, Some(3), 5),
        (3, 6, 8, None, 3),
        (0, 0, 0, Some(0), 0),
        (8, 0, 7, None, 8),
        (usize::MAX, 1, usize::MAX, None, usize::MAX),
        (usize::MAX, 0, usize::MAX, Some(usize::MAX), usize::MAX),
    ] {
        let count = AtomicUsize::new(initial);
        assert_eq!(reserve(&count, amount, limit), expected);
        assert_eq!(count.load(Ordering::Relaxed), after);
    }
}

#[test]
fn shared_counter_keeps_capacity() {
    let count = Arc::new(AtomicUsize::new(1));
    let workers: Vec<_> = (0..3)
        .map(|_| {
            let count = Arc::clone(&count);
            thread::spawn(move || reserve(&count, 2, 6))
        })
        .collect();
    let results: Vec<_> = workers
        .into_iter()
        .map(|worker| worker.join().unwrap())
        .collect();
    let mut old: Vec<_> = results.into_iter().flatten().collect();
    old.sort();
    assert_eq!(old, [1, 3]);
    assert_eq!(count.load(Ordering::Relaxed), 5);
}

#[test]
fn one_shot_accepts_zero_and_max_and_all_readers_agree() {
    for value in [0, 17, usize::MAX] {
        let (writer, reader) = publication();
        assert_eq!(reader.try_read(), None);
        let other = reader.clone();
        thread::spawn(move || writer.publish(value)).join().unwrap();
        assert_eq!(reader.try_read(), Some(value));
        assert_eq!(other.try_read(), Some(value));
        assert_eq!(reader.try_read(), Some(value));
    }
}

#[test]
fn dropped_publisher_is_not_a_zero_message() {
    let (writer, reader) = publication();
    drop(writer);
    assert_eq!(reader.try_read(), None);
}
`,
    },
    {
      path: "tests/models.rs",
      starter: `#![cfg(feature = "model")]
use concurrency_lab_workshop::{
    publication, reserve,
    sync::{Arc, AtomicUsize, Ordering},
};
use loom::{model::Builder, thread};

fn model() -> Builder {
    let mut builder = Builder::new();
    builder.max_threads = 3;
    builder.max_branches = 1_000;
    builder.max_permutations = None;
    builder.max_duration = None;
    builder.preemption_bound = None;
    builder.checkpoint_file = None;
    builder.location = false;
    builder.log = false;
    builder.expect_explicit_explore = false;
    builder
}

#[test]
fn reservations_never_exceed_capacity() {
    model().check(|| {
        let count = Arc::new(AtomicUsize::new(0));
        let other = Arc::clone(&count);
        let worker = thread::spawn(move || reserve(&other, 2, 3));
        let first = reserve(&count, 2, 3);
        let second = worker.join().unwrap();
        assert_eq!(
            [first, second].into_iter().flatten().collect::<Vec<_>>(),
            [0]
        );
        assert_eq!(count.load(Ordering::Relaxed), 2);
    });
}

#[test]
fn observed_publication_always_contains_its_payload() {
    for value in [0, 41, usize::MAX] {
        model().check(move || {
            let (writer, reader) = publication();
            assert_eq!(reader.try_read(), None);
            let worker = thread::spawn(move || writer.publish(value));
            // This assertion must run BEFORE join; join would hide a missing edge.
            if let Some(observed) = reader.try_read() {
                assert_eq!(observed, value, "PUBLICATION_INVARIANT");
            }
            worker.join().unwrap();
            assert_eq!(reader.try_read(), Some(value));
        });
    }
}
`,
    },
    {
      path: "tests/counterexamples.rs",
      starter: `#![cfg(feature = "model")]
use loom::{
    model::Builder,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    thread,
};

fn model() -> Builder {
    let mut builder = Builder::new();
    builder.max_threads = 3;
    builder.max_branches = 1_000;
    builder.max_permutations = None;
    builder.max_duration = None;
    builder.preemption_bound = None;
    builder.checkpoint_file = None;
    builder.location = false;
    builder.log = false;
    builder.expect_explicit_explore = false;
    builder
}

#[test]
#[ignore = "deliberately broken: run explicitly to see LOST_UPDATE_INVARIANT"]
fn separate_load_store_loses_an_update() {
    model().check(|| {
        let count = Arc::new(AtomicUsize::new(0));
        let other = Arc::clone(&count);
        let worker = thread::spawn(move || {
            let old = other.load(Ordering::SeqCst);
            other.store(old + 1, Ordering::SeqCst);
        });
        let old = count.load(Ordering::SeqCst);
        count.store(old + 1, Ordering::SeqCst);
        worker.join().unwrap();
        assert_eq!(count.load(Ordering::SeqCst), 2, "LOST_UPDATE_INVARIANT");
    });
}

#[test]
#[ignore = "deliberately broken: run explicitly to see PUBLICATION_INVARIANT"]
fn relaxed_publication_can_read_stale_payload() {
    model().check(|| {
        let state = Arc::new((AtomicUsize::new(0), AtomicBool::new(false)));
        let other = Arc::clone(&state);
        let worker = thread::spawn(move || {
            other.0.store(41, Ordering::Relaxed);
            other.1.store(true, Ordering::Relaxed);
        });
        if state.1.load(Ordering::Relaxed) {
            assert_eq!(state.0.load(Ordering::Relaxed), 41, "PUBLICATION_INVARIANT");
        }
        worker.join().unwrap();
    });
}
`,
    },
    {
      path: ".gitignore",
      starter: `/target
`,
    },
  ],
};

export const concurrencyLabProject: ProjectContract = {
  id: "concurrency-lab",
  title: "Laboratorium: protokoły atomowe",
  objective:
    "Uzasadnij niezmienniki rezerwacji i publikacji, odtwórz kontrprzykład oraz sprawdź poprawkę tym samym modelem.",
  lessonId: "atomic-rmw",
  lessonIds: [
    "atomic-rmw",
    "atomic-cas",
    "atomic-limits",
    "release-acquire",
    "ordering-contracts",
    "loom-evidence",
  ],
  reviewConceptIds: [
    "atomic-rmw",
    "atomic-cas",
    "atomic-limits",
    "release-acquire",
    "ordering-contracts",
    "loom-evidence",
  ],
  requiredBehaviors: [
    "CAS rezerwuje cały zakres albo odmawia bez zmiany; uwzględnia zero, przepełnienie i nową obserwację po konflikcie.",
    "Jeden konsumowany Publisher publikuje wartość, a każdy Subscriber zwraca None lub poprawne Some, także dla zera.",
    "Kod algorytmów pozostaje wspólny dla std i Loom, a modele obserwują dane przed join.",
    "Celowe błędy ujawniają utraconą aktualizację i brak publikacji danych przez flagę.",
  ],
  requiredEvidence: [
    "Testy granic API, testy modeli i kontrola jakości dla obu wariantów pakietu.",
    "Dwa kontrprzykłady z konkretną nieudaną asercją oraz opis poprawki.",
    "Własne uzasadnienie happens-before i granic modelu w ADR, bez uznawania stress testu za dowód.",
  ],
  constraints: [
    "Bez unsafe, losowej synchronizacji i sleep. Nie przypisuj CAS gwarancji sprawiedliwości ani przewagi wydajnościowej.",
    "Nie rozszerzaj jednokrotnego protokołu na wielu nadawców przez samo klonowanie uchwytu lub reset flagi.",
    "Loom uruchamiasz z pobranego pakietu. Lokalna lista kontrolna nie nadaje automatycznie mastery w aplikacji.",
  ],
  adversarialLessonId: "loom-evidence",
  adversarialInject:
    "Osłab flagę publikacji do Relaxed albo rozdziel atomową aktualizację na load i store. Zapisz znaleziony kontrprzykład. Następnie przeanalizuj wymaganie drugiego nadawcy, którego obecny kontrakt celowo nie obsługuje.",
  retrospective: [
    "Jaki dokładnie niezmiennik sprawdził model i jakie dane pozostały poza jego zakresem?",
    "Która para operacji ustanawia synchronizację i czemu odczyt po join byłby zbyt słabym testem?",
    "Kiedy wybrałbyś Mutex lub gotowy kanał zamiast rozwijania tego protokołu?",
  ],
  package: concurrencyLabPackage,
};
