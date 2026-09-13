import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const publicApiEvolutionSources: Source[] = [
  {
    id: "api-evolution-cargo-semver-compatibility",
    title: "The Cargo Book: SemVer Compatibility",
    url: "https://doc.rust-lang.org/cargo/reference/semver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu publicznego; tabela rozróżnia zmiany major, minor i possibly-breaking.",
  },
  {
    id: "api-evolution-reference-dyn-compatibility",
    title: "The Rust Reference: Dyn Compatibility",
    url: "https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy aktualizacji Rust i przy dodawaniu metod, parametrów typu, Self albo ograniczeń Sized do traitu.",
  },
  {
    id: "api-evolution-reference-visibility",
    title: "The Rust Reference: Visibility and Privacy",
    url: "https://doc.rust-lang.org/reference/visibility-and-privacy.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie modułów, re-eksportów albo granicy między crate biblioteki i klientem.",
  },
  {
    id: "api-evolution-book-trait-defaults",
    title:
      "The Rust Programming Language: Defining Shared Behavior with Traits",
    url: "https://doc.rust-lang.org/book/ch10-02-traits.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu implementacji traitów lub metody domyślnej.",
  },
  {
    id: "api-evolution-cargo-workspaces",
    title: "The Cargo Book: Workspaces",
    url: "https://doc.rust-lang.org/cargo/reference/workspaces.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie członków workspace, dziedziczonego metadata albo granic biblioteki i klienta.",
  },
  {
    id: "api-evolution-cargo-features",
    title: "The Cargo Book: Features",
    url: "https://doc.rust-lang.org/cargo/reference/features.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie funkcji domyślnych, addytywności features albo macierzy default/no-default/all-features.",
  },
  {
    id: "api-evolution-cargo-rust-version",
    title: "The Cargo Book: rust-version",
    url: "https://doc.rust-lang.org/cargo/reference/rust-version.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie deklarowanego MSRV; rust-version jest obietnicą, którą potwierdza uruchomienie wskazanego toolchaina.",
  },
  {
    id: "api-evolution-cargo-resolver",
    title: "The Cargo Book: Dependency Resolution",
    url: "https://doc.rust-lang.org/cargo/reference/resolver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie resolvera, workspace albo rozdzielonych buildów biblioteki i klienta.",
  },
  {
    id: "api-evolution-edition-guide-rust-2024",
    title: "The Rust Edition Guide: Rust 2024",
    url: "https://doc.rust-lang.org/edition-guide/rust-2024/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie edition workspace lub przy aktualizacji instrukcji migracji i MSRV.",
  },
];

export const publicApiEvolutionCompetencies: Competency[] = [
  {
    id: "evolve-public-trait-contract",
    title:
      "Rozszerzasz publiczny trait bez unieważniania istniejących implementacji ani konsumentów dyn.",
  },
  {
    id: "preserve-public-call-surface",
    title:
      "Zachowujesz stare ścieżki, sygnatury i zachowanie, gdy zmieniasz prywatną implementację oraz dodajesz API.",
  },
];

export const publicApiEvolutionConcepts: Concept[] = [
  {
    id: "api-trait-compatibility",
    title: "Ewolucja traitu dla implementerów i dyn",
    prerequisites: ["api-error-source-chain"],
    competencyIds: ["evolve-public-trait-contract"],
    reviewPrompt:
      "Dlaczego metoda domyślna dodana do publicznego traitu nie jest automatycznie bezpieczną zmianą SemVer?",
    reviewAnswer:
      "Stare implementacje mogą ją odziedziczyć, lecz nowa metoda domyślna nadal jest zmianą possibly-breaking: może kolidować z API klienta lub zmienić oczekiwania jego kodu. Wymagana metoda jest zmianą breaking, bo każdy zewnętrzny impl musi ją dopisać.",
    distinguish:
      "`where Self: Sized` może zachować dyn compatibility całego traitu dla danej metody, ale tej metody nie wolno wtedy wywołać przez `&dyn Trait`. Metoda generyczna bez tego ograniczenia czyni trait niezgodnym z dyn.",
  },
  {
    id: "api-compatible-surface",
    title: "Stary publiczny interfejs nad nowym środkiem",
    prerequisites: ["api-trait-compatibility"],
    competencyIds: ["preserve-public-call-surface"],
    reviewPrompt:
      "Co musi pozostać zgodne, gdy prywatny środek biblioteki dostaje nową reprezentację?",
    reviewAnswer:
      "Wcześniej publiczne ścieżki, sygnatury i obserwowalne zachowanie klientów. Nowe API można dodać obok nich, a prywatny środek wolno zmienić tylko wtedy, gdy stare obietnice nadal są spełnione.",
    distinguish:
      "Test jednego źródła może obserwować funkcje i re-eksporty, ale nie tworzy osobnego crate klienta. Prawdziwą prywatność oraz `non_exhaustive` potwierdza dopiero zewnętrzny test Cargo.",
  },
];

type Choice = { id: string; label: string };

function choiceStep(options: {
  id: string;
  kind: "predict" | "explain" | "recall";
  title: string;
  prompt: string;
  choices: Choice[];
  correct: string;
  explanations: Record<string, string>;
  evidenceKind: LessonStep["evidenceKind"];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    choices: options.choices,
    evaluator: {
      kind: "choice",
      correct: options.correct,
      explanations: options.explanations,
    },
    evidenceKind: options.evidenceKind,
  };
}

const traitV1 = `pub trait Meter {
    fn units(&self) -> u16;
}

pub fn dyn_units(meter: &dyn Meter) -> u16 {
    meter.units()
}

struct Counter { value: u16 }

impl Meter for Counter {
    fn units(&self) -> u16 { self.value }
}

fn main() {
    let counter = Counter { value: 7 };
    println!("{}", dyn_units(&counter));
}`;

const dynBreakingStarter = `trait Meter {
    fn units(&self) -> u16;
    fn sample<T>(&self, _value: T) {}
}

fn old_dyn_consumer(meter: &dyn Meter) -> u16 {
    meter.units()
}`;

const dynBreakingSolution = `trait Meter {
    fn units(&self) -> u16;
    fn sample<T>(&self, _value: T)
    where
        Self: Sized,
    {}
}

fn old_dyn_consumer(meter: &dyn Meter) -> u16 {
    meter.units()
}`;

const traitGateStarter = `pub trait Meter {
    fn units(&self) -> u16;
    fn label(&self) -> String;
}

struct Dashboard { value: u16 }

impl Meter for Dashboard {
    fn units(&self) -> u16 { self.value }
}

pub fn read_units<T: Meter + Clone + ?Sized>(meter: &T) -> u16 {
    meter.units()
}

pub fn dyn_units(meter: &dyn Meter) -> u16 {
    read_units(meter)
}`;

const traitGateSolution = `pub trait Meter {
    fn units(&self) -> u16;

    fn label(&self) -> String {
        format!("{} units", self.units())
    }
}

pub fn read_units<T: Meter + ?Sized>(meter: &T) -> u16 {
    meter.units()
}

pub fn dyn_units(meter: &dyn Meter) -> u16 {
    read_units(meter)
}

pub fn total(meters: &[&dyn Meter]) -> u32 {
    meters.iter().map(|meter| u32::from(meter.units())).sum()
}`;

const traitGateTests = `struct ExistingClient {
    value: u16,
    marker: String,
}

impl Meter for ExistingClient {
    fn units(&self) -> u16 { self.value }
}

struct FreshClient { value: u16 }

impl Meter for FreshClient {
    fn units(&self) -> u16 { self.value }
}

#[test]
fn old_implementer_dyn_consumer_and_unbounded_generic_stay_usable() {
    let old = ExistingClient {
        value: 7,
        marker: String::from("bez Clone i Debug"),
    };
    let fresh = FreshClient { value: 5 };
    let old_dyn_consumer: fn(&dyn Meter) -> u16 = dyn_units;

    assert_eq!(old_dyn_consumer(&old), 7);
    assert_eq!(read_units(&old), 7);
    assert_eq!(old.label(), "7 units");
    assert_eq!(total(&[&old, &fresh]), 12);
    assert_eq!(old.marker, "bez Clone i Debug");
}`;

const traitBlankSolution = `pub trait Pulse {
    fn current(&self) -> i32;

    fn warning(&self) -> bool {
        self.current() > 100
    }
}

pub fn current_from_dyn(source: &dyn Pulse) -> i32 {
    source.current()
}

pub fn is_at_most<T: Pulse + ?Sized>(source: &T, limit: i32) -> bool {
    source.current() <= limit
}`;

const traitBlankTests = `struct FieldProbe {
    value: i32,
    retained: String,
}

impl Pulse for FieldProbe {
    fn current(&self) -> i32 { self.value }
}

struct Calibrated { value: i32 }

impl Pulse for Calibrated {
    fn current(&self) -> i32 { self.value }
}

#[test]
fn independent_trait_contract_keeps_old_impl_dyn_and_plain_borrow() {
    let old = FieldProbe {
        value: 100,
        retained: String::from("nie kopiuj mnie"),
    };
    let newer = Calibrated { value: 101 };
    let old_dyn_consumer: fn(&dyn Pulse) -> i32 = current_from_dyn;

    assert_eq!(old_dyn_consumer(&old), 100);
    assert!(is_at_most(&old, 100));
    assert!(newer.warning());
    assert_eq!(old.retained, "nie kopiuj mnie");
}`;

const traitReviewSolution = `pub trait Alarm {
    fn active(&self) -> bool;

    fn state(&self) -> &'static str {
        if self.active() { "alarm" } else { "spokojnie" }
    }
}

pub fn dyn_state(alarm: &dyn Alarm) -> &'static str {
    alarm.state()
}

pub fn is_active<T: Alarm + ?Sized>(alarm: &T) -> bool {
    alarm.active()
}`;

const traitReviewTests = `struct InstalledAlarm {
    active: bool,
    note: String,
}

impl Alarm for InstalledAlarm {
    fn active(&self) -> bool { self.active }
}

#[test]
fn review_preserves_old_alarm_impl_and_dyn_function_signature() {
    let alarm = InstalledAlarm {
        active: true,
        note: String::from("bez pochodnych traitów"),
    };
    let old_dyn_consumer: fn(&dyn Alarm) -> &'static str = dyn_state;

    assert_eq!(old_dyn_consumer(&alarm), "alarm");
    assert!(is_active(&alarm));
    assert_eq!(alarm.note, "bez pochodnych traitów");
}`;

const surfaceV1 = `pub mod legacy {
    pub fn render(payload: &str) -> String {
        format!("frame:{payload}")
    }
}

pub use legacy::render;

fn main() {
    println!("{}", render("żółć"));
    println!("{}", legacy::render(""));
}`;

const surfaceGateStarter = `mod layout {
    pub struct Layout { prefix: String }

    impl Layout {
        pub fn new(prefix: &str) -> Self {
            Self { prefix: String::from(prefix) }
        }

        pub fn render(&self, payload: &str) -> String {
            format!("{}:{}", self.prefix, payload)
        }
    }
}

pub mod legacy {
    pub fn render(payload: &str) -> String {
        super::layout::Layout::new("frame").render(payload.trim())
    }
}

pub fn render_tagged(tag: &str, payload: &str) -> String {
    layout::Layout::new(tag).render(payload)
}

fn old_client(payload: &str) -> String {
    render(payload)
}`;

const surfaceGateSolution = `mod layout {
    pub struct Layout { prefix: String }

    impl Layout {
        pub fn new(prefix: &str) -> Self {
            Self { prefix: String::from(prefix) }
        }

        pub fn render(&self, payload: &str) -> String {
            format!("{}:{}", self.prefix, payload)
        }
    }
}

pub mod legacy {
    pub fn render(payload: &str) -> String {
        super::layout::Layout::new("frame").render(payload)
    }
}

pub use legacy::render;

pub fn render_tagged(tag: &str, payload: &str) -> String {
    layout::Layout::new(tag).render(payload)
}`;

const surfaceGateTests = `#[test]
fn old_paths_exact_function_types_and_behavior_survive_private_rewrite() {
    let root_old: fn(&str) -> String = render;
    let module_old: fn(&str) -> String = legacy::render;

    assert_eq!(root_old(""), "frame:");
    assert_eq!(module_old(" żółć "), "frame: żółć ");
    assert_eq!(render("a\\nb"), "frame:a\\nb");
    assert_eq!(render_tagged("audit", "żółć"), "audit:żółć");
}`;

const surfaceBlankSolution = `mod encoding {
    pub fn build(prefix: &str, text: &str) -> String {
        format!("{}|{}", prefix, text)
    }
}

pub mod messages {
    pub fn line(text: &str) -> String {
        super::encoding::build("msg", text)
    }
}

pub use messages::line;

pub fn labeled_line(label: &str, text: &str) -> String {
    encoding::build(label, text)
}`;

const surfaceBlankTests = `#[test]
fn independent_surface_keeps_both_old_routes_and_adds_another_route() {
    let root_old: fn(&str) -> String = line;
    let module_old: fn(&str) -> String = messages::line;

    assert_eq!(root_old(""), "msg|");
    assert_eq!(module_old(" a "), "msg| a ");
    assert_eq!(line("żółć"), "msg|żółć");
    assert_eq!(labeled_line("warn", "x"), "warn|x");
}`;

const surfaceReviewSolution = `mod presentation {
    pub fn assemble(prefix: &str, value: &str) -> String {
        format!("{}={}", prefix, value)
    }
}

pub mod classic {
    pub fn show(value: &str) -> String {
        super::presentation::assemble("value", value)
    }
}

pub use classic::show;

pub fn show_named(name: &str, value: &str) -> String {
    presentation::assemble(name, value)
}`;

const surfaceReviewTests = `#[test]
fn review_checks_old_function_pointers_paths_and_result() {
    let root_old: fn(&str) -> String = show;
    let module_old: fn(&str) -> String = classic::show;

    assert_eq!(root_old(""), "value=");
    assert_eq!(module_old(" żółć "), "value= żółć ");
    assert_eq!(show_named("length", "4"), "length=4");
}`;

export const publicApiEvolutionLessons: Lesson[] = [
  {
    id: "api-trait-compatibility",
    moduleId: "public-api-workspaces",
    conceptIds: ["api-trait-compatibility"],
    competencyIds: ["evolve-public-trait-contract"],
    prerequisites: ["api-error-source-chain"],
    title: "Trait publiczny: starzy implementerzy i dyn",
    subtitle:
      "Dodajesz wartość bez odbierania klientom ich implementacji i dynamicznego wywołania.",
    minutes: 35,
    outcomes: [
      "Rozpoznasz wymaganą metodę jako zmianę breaking dla zewnętrznych implementacji traitu.",
      "Zachowasz konsument `&dyn Trait` oraz metodę, która jest dyn compatible.",
      "Zostawisz stare generyczne wywołanie bez nowego boundu Clone lub Debug.",
      "Opiszesz metodę domyślną jako zmianę possibly-breaking, a nie automatycznie bezpieczną.",
    ],
    steps: [
      choiceStep({
        id: "api-trait-compatibility-predict",
        kind: "predict",
        title: "Przewidź koszt metody domyślnej",
        prompt:
          "Biblioteka chce dodać do publicznego traitu metodę z ciałem domyślnym. Który opis jest najuczciwszy?",
        choices: [
          {
            id: "possibly",
            label:
              "Stare imple mogą skompilować się dalej, ale zmiana jest possibly-breaking i trzeba ocenić jej wpływ na klientów.",
          },
          {
            id: "always-safe",
            label:
              "Metoda z ciałem jest zawsze bezpieczna SemVer, bo nie wymaga kodu w impl.",
          },
          {
            id: "always-major",
            label:
              "Każda metoda domyślna zawsze wymaga major version, niezależnie od użycia.",
          },
        ],
        correct: "possibly",
        explanations: {
          possibly:
            "Cargo klasyfikuje dodanie domyślnego elementu traitu jako possibly-breaking. Kompilacja starego implu jest ważną wskazówką, lecz nie pełnym dowodem zgodności.",
          "always-safe":
            "Brak obowiązku dopisania metody nie usuwa możliwych kolizji ani zmian, które klient obserwuje.",
          "always-major":
            "Ryzyko należy ocenić w kontekście biblioteki; przewodnik Cargo nie klasyfikuje tej zmiany bezwarunkowo jako major.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-trait-compatibility-old-client",
        kind: "run",
        title: "Zobacz starego konsumenta dyn",
        prompt:
          "Uruchom pierwszą wersję API. `Counter` jest klientem traitu, a `dyn_units` jest publicznym konsumentem pożyczonego `&dyn Meter`.",
        code: traitV1,
        solution: traitV1,
        evaluator: { kind: "exact-output", expected: "7\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      {
        id: "api-trait-compatibility-dyn-break",
        kind: "observe",
        title: "Dodany generyk psuje dyn",
        prompt:
          "Uruchom wersję z metodą generyczną `sample<T>` bez `Self: Sized`. Kompilator odrzuca stary `&dyn Meter`. Rozwiązanie pokazuje, jak wyłączyć tę jedną metodę z dynamicznego API; wtedy nie wolno wywołać jej przez odbiornik dyn.",
        code: dynBreakingStarter,
        solution: dynBreakingSolution,
        evaluator: { kind: "expected-error", code: "E0038" },
        expectedStatus: "compile-error",
        expectedError: "E0038",
        evidenceKind: "exposure",
      },
      {
        id: "api-trait-compatibility-gate",
        kind: "debug",
        title: "Napraw wersję zgodną z klientami",
        prompt:
          "Napraw ewolucję `Meter`. Zachowaj wymaganą `units`, a `label` dodaj z użytecznym ciałem domyślnym zwracającym dokładnie `N units`. `read_units` ma dalej pożyczać dowolny `T: Meter + ?Sized`, bez Clone ani Debug. Zachowaj `dyn_units(&dyn Meter) -> u16` i dodaj `total(&[&dyn Meter]) -> u32`. Testy dostarczają stary zewnętrzny impl bez Clone i Debug oraz nowy impl. Odrzucą wymaganą nową metodę, bound Clone i trait niezgodny z dyn. Metoda domyślna nadal wymaga oceny SemVer: w tym ćwiczeniu chronisz konkretne kontrakty, nie dowodzisz uniwersalnej zgodności.",
        code: traitGateStarter,
        solution: traitGateSolution,
        evaluator: { kind: "tests", tests: traitGateTests },
        expectedStatus: "compile-error",
        expectedError: "E0046",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Nowy wymagany element traitu zmusza każde stare `impl Meter` do zmiany. Ciało metody pozwala starym implom odziedziczyć zachowanie.",
          "`dyn_units` potrzebuje traitu dyn compatible, a `read_units` ma przyjąć pożyczony także niesized odbiornik bez nowego boundu.",
        ],
      },
      {
        id: "api-trait-compatibility-blank",
        kind: "blank",
        title: "Pusta strona: sygnał z istniejącym klientem",
        prompt:
          "Od zera napisz publiczny trait `Pulse` z wymaganą `current(&self) -> i32` i domyślną `warning(&self) -> bool`, prawdziwą wyłącznie dla wartości większej niż 100. Napisz `current_from_dyn(&dyn Pulse) -> i32` oraz `is_at_most<T: Pulse + ?Sized>(&T, i32) -> bool`. Nie wymagaj Clone, Debug, Display ani własności. Testy napiszą własny stary impl z `String`, nowy impl i wskaźnik funkcji do konsumenta dyn; odrzucą wymaganą dodatkową metodę, nowy bound i trait niezgodny z dyn. Nie dodawaj `main`.",
        solution: traitBlankSolution,
        evaluator: { kind: "tests", tests: traitBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Najpierw zapisz minimalny trait i obie funkcje pożyczające. Metoda domyślna może wywołać `current`.",
          "`&dyn Pulse` wymaga dyn compatibility; `?Sized` pozwala generycznemu konsumentowi przyjąć również taki obiekt traita.",
        ],
      },
      choiceStep({
        id: "api-trait-compatibility-recall",
        kind: "recall",
        title: "Odtwórz granicę Self: Sized",
        prompt:
          "Trait zawiera `fn calibrate<T>(&self, value: T) where Self: Sized`. Co pozostaje prawdą?",
        choices: [
          {
            id: "dyn-kept",
            label:
              "Trait może nadal być użyty jako `dyn`, lecz `calibrate` nie jest wywoływalne przez `&dyn`.",
          },
          {
            id: "dyn-call",
            label:
              "`calibrate` jest wywoływalne przez `&dyn`, bo ma ciało lub gdzie-clause.",
          },
          {
            id: "trait-broken",
            label:
              "Samo `Self: Sized` przy jednej metodzie zawsze czyni cały trait niezgodnym z dyn.",
          },
        ],
        correct: "dyn-kept",
        explanations: {
          "dyn-kept":
            "Ta metoda jest jawnie niedyspozycyjna przez obiekt traita; pozostałe zgodne metody nadal mogą tworzyć jego dyn API.",
          "dyn-call":
            "Nieznany konkretny `Self` nie pozwala wywołać metody wyłączonej ograniczeniem `Self: Sized`.",
          "trait-broken":
            "Ograniczenie na pojedynczej metodzie służy właśnie odseparowaniu jej od dynamicznego interfejsu.",
        },
        evidenceKind: "recall",
      }),
    ],
    misconceptions: [
      "Metoda domyślna jest bezwarunkowo bezpieczna dla SemVer.",
      "Każda metoda, którą można wywołać na konkretnym implu, może być wywołana przez `&dyn`.",
      "Dodanie Clone lub Debug do starego konsumenta nie zmienia publicznego kontraktu.",
    ],
    transferTask:
      "Przed wydaniem kolejnej wersji wypisz stare implementacje, wskaźniki funkcji do konsumentów dyn oraz boundy, które muszą pozostać używalne. Dopiero potem zaprojektuj dodatki traitu i sprawdź je z zewnętrznym klientem.",
    evidenceGate:
      "Zadanie naprawcze i zadanie od pustej strony kompilują stare implementacje bez Clone i Debug, zachowują konsument dyn oraz odrzucają wymagane metody, zerwaną dyn compatibility i zaostrzone boundy.",
    sourceIds: [
      "api-evolution-cargo-semver-compatibility",
      "api-evolution-reference-dyn-compatibility",
      "api-evolution-book-trait-defaults",
    ],
  },
  {
    id: "api-compatible-surface",
    moduleId: "public-api-workspaces",
    conceptIds: ["api-compatible-surface"],
    competencyIds: ["preserve-public-call-surface"],
    prerequisites: ["api-trait-compatibility"],
    title: "Publiczna fasada: stare ścieżki, nowy środek",
    subtitle:
      "Dodajesz API i przebudowujesz środek bez odbierania klientom ich wywołań.",
    minutes: 35,
    outcomes: [
      "Zachowasz starą ścieżkę modułową i re-eksport z korzenia biblioteki.",
      "Sprawdzisz dokładną sygnaturę wskaźnikiem funkcji oraz stare wyniki dla pustego tekstu i Unicode.",
      "Dodasz nową funkcję obok starej bez zmiany dawnych obserwowalnych wyników.",
      "Wskażesz granicę testu jednego źródła i przeniesiesz dowód prywatności do zewnętrznego klienta Cargo.",
    ],
    steps: [
      choiceStep({
        id: "api-compatible-surface-predict",
        kind: "predict",
        title: "Wybierz kontrakt starego klienta",
        prompt:
          "Klienci używają zarówno `legacy::render`, jak i re-eksportu `render`. Biblioteka chce dodać `render_tagged`. Co powinno zostać w wydaniu dodatnim?",
        choices: [
          {
            id: "preserve",
            label:
              "Obie stare ścieżki i ich `fn(&str) -> String` oraz dawne wyniki; nowa funkcja istnieje obok nich.",
          },
          {
            id: "replace",
            label:
              "Usuń `render`, skoro klient może przejść na `render_tagged`.",
          },
          {
            id: "trim",
            label:
              "Zachowaj nazwę, lecz przy okazji obetnij wejście, aby wyniki były ładniejsze.",
          },
        ],
        correct: "preserve",
        explanations: {
          preserve:
            "Dodatek nie powinien usuwać starej ścieżki, zmieniać sygnatury ani niezapowiedzianie zmieniać jej wyników.",
          replace:
            "Usunięcie lub przeniesienie publicznej funkcji jest zmianą breaking dla istniejącego importu.",
          trim: "Spacje są obserwowalnym wejściem starego kontraktu. Poprawa wyglądu może być zmianą zachowania.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-compatible-surface-old-client",
        kind: "run",
        title: "Zobacz obie stare drogi",
        prompt:
          "Uruchom pierwotną fasadę. Ten sam kontrakt jest dostępny przez `render` oraz `legacy::render`; pusty tekst nadal daje własny, określony wynik.",
        code: surfaceV1,
        solution: surfaceV1,
        evaluator: { kind: "exact-output", expected: "frame:żółć\nframe:\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      {
        id: "api-compatible-surface-gate",
        kind: "debug",
        title: "Napraw fasadę po przebudowie środka",
        prompt:
          "Prywatny `layout::Layout` zastępuje prosty format, ale API nadal obiecuje `legacy::render` oraz re-eksport `render`. Przywróć re-eksport i dawne zachowanie bez trim. Zachowaj dokładnie `fn(&str) -> String`; dodaj `render_tagged(&str, &str) -> String` jako nowe API. Testy sprawdzają oba stare importy, wskaźniki funkcji, pustkę, Unicode i newline. Złapią mutant usuwający starą ścieżkę albo zmieniający zachowanie; nie dowodzą jednak prywatności modułu w osobnym crate.",
        code: surfaceGateStarter,
        solution: surfaceGateSolution,
        evaluator: { kind: "tests", tests: surfaceGateTests },
        expectedStatus: "compile-error",
        expectedError: "E0425",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "`pub use legacy::render;` zachowuje stary import z korzenia bez kopiowania implementacji.",
          "Stara funkcja przekazuje `payload` dokładnie tak, jak dostała. Nowa funkcja może używać tego samego prywatnego środka z drugim prefiksem.",
        ],
      },
      choiceStep({
        id: "api-compatible-surface-limit",
        kind: "explain",
        title: "Nazwij granicę jednego pliku",
        prompt:
          "Co pozostaje do sprawdzenia w pobieranym projekcie Cargo `frame-protocol`, mimo że testy tej lekcji potwierdzają stare funkcje i wyniki?",
        choices: [
          {
            id: "external",
            label:
              "Prawdziwa prywatność crate oraz zachowanie `non_exhaustive` wobec osobnego klienta; pojedynczy runner nie jest takim klientem.",
          },
          {
            id: "nothing",
            label:
              "Nic: testy w jednym pliku automatycznie dowodzą pełnej zgodności SemVer i wszystkich granic crate.",
          },
          {
            id: "only-format",
            label:
              "Wyłącznie formatowanie kodu; Cargo nie wnosi żadnego dodatkowego dowodu API.",
          },
        ],
        correct: "external",
        explanations: {
          external:
            "Ukryte testy są modułem tego samego źródła. Projekt Frame Protocol zawiera rzeczywiste granice crate, test publicznego konsumenta i doctesty compile-fail.",
          nothing:
            "Takie testy są konkretnym dowodem zachowania, nie uniwersalnym dowodem SemVer ani substytutem osobnego crate.",
          "only-format":
            "Cargo kompiluje niezależnego klienta, dlatego ujawnia granice widoczności, których test jednego źródła nie odtwarza.",
        },
        evidenceKind: "transfer",
      }),
      {
        id: "api-compatible-surface-blank",
        kind: "blank",
        title: "Pusta strona: wiadomość z dwiema drogami",
        prompt:
          "Od zera zaprojektuj małą fasadę wiadomości. Klient wymaga publicznego wejścia `messages::line`, które przyjmuje pożyczony tekst i zwraca nowy tekst `msg|TEKST`, oraz re-eksportu `line` o tym samym wywołaniu i wyniku; wybierz samodzielnie prywatną reprezentację, moduły i helpery. Dodaj `labeled_line`: przyjmuje etykietę i tekst, a zwraca `ETYKIETA|TEKST`, bez zmiany dawnych wywołań. Zachowaj pusty tekst, spacje i Unicode. Testy sprawdzają ścieżkę modułową, re-eksport, wskaźniki funkcji i nowy dodatek. Nie dodawaj `main`.",
        solution: surfaceBlankSolution,
        evaluator: { kind: "tests", tests: surfaceBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Najpierw wydziel prywatne budowanie tekstu, potem zbuduj publiczny adapter `messages::line`.",
          "Re-eksport ma wskazywać tę samą starą funkcję. Nie obcinaj tekstu, bo kontrakt testuje dokładne bajty wyniku.",
        ],
      },
      choiceStep({
        id: "api-compatible-surface-recall",
        kind: "recall",
        title: "Odtwórz kolejność decyzji",
        prompt:
          "Która kolejność najlepiej chroni publiczną fasadę podczas refaktoryzacji?",
        choices: [
          {
            id: "observe-first",
            label:
              "Najpierw zapisz stare ścieżki, sygnatury i wyniki klientów w testach; potem zmień środek i dodaj API.",
          },
          {
            id: "rewrite-first",
            label:
              "Najpierw usuń stare API, przebuduj wszystko, a następnie zdecyduj, które wyniki klientów były ważne.",
          },
          {
            id: "new-only",
            label:
              "Testuj tylko nową funkcję, bo stare wywołania już wcześniej się kompilowały.",
          },
        ],
        correct: "observe-first",
        explanations: {
          "observe-first":
            "Testy starego kontraktu czynią obietnicę sprawdzalną, zanim prywatny środek się zmieni.",
          "rewrite-first":
            "Po usunięciu kontraktu łatwo nie zauważyć ścieżki lub wyniku, który był zależnością klienta.",
          "new-only":
            "Nowe API nie sprawdza zgodności starego importu, typu funkcji ani zachowania przy danych brzegowych.",
        },
        evidenceKind: "recall",
      }),
    ],
    misconceptions: [
      "Prywatna refaktoryzacja usprawiedliwia zmianę dawnych wyników publicznej funkcji.",
      "Re-eksport jest tylko wygodnym skrótem, więc jego usunięcie nie wpływa na klientów.",
      "Testy jednego pliku dowodzą rzeczywistej prywatności crate i pełnej zgodności SemVer.",
    ],
    transferTask:
      "Dla własnej biblioteki zapisz próbki starych importów, dokładne sygnatury wskaźników funkcji i dane graniczne. Uruchom je przed oraz po wymianie prywatnej reprezentacji, a granice crate potwierdź w projekcie Frame Protocol przez zewnętrznego konsumenta Cargo.",
    evidenceGate:
      "Zadania zachowują oba stare publiczne wejścia, ich typ `fn(&str) -> String` i wyniki dla pustki, Unicode oraz znaków nowej linii, po czym dodają API obok nich. Dowód prywatności i `non_exhaustive` pozostaje w rzeczywistym workspace Cargo.",
    sourceIds: [
      "api-evolution-cargo-semver-compatibility",
      "api-evolution-reference-visibility",
      "api-evolution-cargo-workspaces",
      "api-evolution-cargo-features",
      "api-evolution-cargo-rust-version",
      "api-evolution-cargo-resolver",
      "api-evolution-edition-guide-rust-2024",
    ],
  },
];

export const publicApiEvolutionReviewExercises: Record<string, LessonStep> = {
  "api-trait-compatibility": {
    id: "review-api-trait-compatibility",
    kind: "apply",
    title: "Powtórka: alarm dla starego urządzenia",
    prompt:
      "Od zera napisz trait `Alarm` z wymaganą `active(&self) -> bool` i domyślną `state(&self) -> &'static str`, która zwraca `alarm` dla true i `spokojnie` dla false. Napisz `dyn_state(&dyn Alarm)` oraz `is_active<T: Alarm + ?Sized>(&T) -> bool`. Nie wymagaj Clone ani Debug i nie dodawaj main. Test tworzy istniejący impl z własnym Stringiem oraz sprawdza dawny wskaźnik do funkcji dyn.",
    solution: traitReviewSolution,
    evaluator: { kind: "tests", tests: traitReviewTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
    hints: [
      "Metoda domyślna może zależeć wyłącznie od wymaganej `active`, więc zewnętrzny impl nie musi jej pisać.",
      "Obie funkcje pożyczają odbiorcę. Dodaj `?Sized` tylko do generycznego konsumenta, który ma działać również z trait object.",
    ],
  },
  "api-compatible-surface": {
    id: "review-api-compatible-surface",
    kind: "apply",
    title: "Powtórka: klasyczny widok nad nowym formatem",
    prompt:
      "Od zera utwórz prywatny `presentation::assemble(prefix, value) -> String` w formacie `PREFIX=WARTOŚĆ`. Zachowaj stare publiczne `classic::show(value)` i re-eksport `show`, oba jako `fn(&str) -> String`. Dodaj `show_named(name, value)`. Nie zmieniaj pustego tekstu, spacji ani Unicode. Testy sprawdzą obie stare ścieżki, typ wskaźnika oraz nową funkcję.",
    solution: surfaceReviewSolution,
    evaluator: { kind: "tests", tests: surfaceReviewTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
    hints: [
      "Moduł bez `pub` może być prywatnym środkiem, a jego funkcję wywoła publiczny moduł potomny przez `super::`.",
      "`pub use classic::show;` zachowuje korzeń biblioteki bez duplikowania starej implementacji.",
    ],
  },
};
