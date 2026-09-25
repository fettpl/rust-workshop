import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-25";

export const apiReleaseMatrixSources: Source[] = [
  {
    id: "api-release-semver-reference",
    title: "The Cargo Book: SemVer Compatibility",
    url: "https://doc.rust-lang.org/cargo/reference/semver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie starej ścieżki API, publicznego traitu, features albo deklarowanego MSRV; tabela rozdziela breaking i possibly-breaking.",
  },
  {
    id: "api-release-features-reference",
    title: "The Cargo Book: Features",
    url: "https://doc.rust-lang.org/cargo/reference/features.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie domyślnych, opcjonalnych i addytywnych features oraz po zmianie konfiguracji klienta.",
  },
  {
    id: "api-release-rust-version-reference",
    title: "The Cargo Book: rust-version",
    url: "https://doc.rust-lang.org/cargo/reference/rust-version.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie compiler floor; deklaracja jest obietnicą, którą trzeba uruchomić na dokładnym toolchainie.",
  },
  {
    id: "api-release-workspaces-reference",
    title: "The Cargo Book: Workspaces",
    url: "https://doc.rust-lang.org/cargo/reference/workspaces.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj, gdy dowód ma obejmować osobny crate biblioteki i zewnętrznego klienta, a nie tylko jeden plik źródłowy.",
  },
];

export const apiReleaseMatrixCompetencies: Competency[] = [
  {
    id: "preserve-old-release-contract",
    title:
      "Rozpoznajesz i zachowujesz stare ścieżki, implementery oraz konsumentów dyn przed zaakceptowaniem zmiany API.",
  },
  {
    id: "evaluate-release-matrix",
    title:
      "Podejmujesz decyzję release na podstawie osobnego klienta, każdej konfiguracji feature i dokładnego MSRV.",
  },
];

export const apiReleaseMatrixConcepts: Concept[] = [
  {
    id: "api-release-old-contracts",
    title: "Stary klient jako kontrakt wydania API",
    prerequisites: ["api-compatible-surface"],
    competencyIds: ["preserve-old-release-contract"],
    reviewPrompt:
      "Jakie trzy stare obserwacje trzeba zachować, zanim uznasz drobną zmianę biblioteki za zgodną?",
    reviewAnswer:
      "Sprawdź dawną publiczną ścieżkę i sygnaturę, istniejący zewnętrzny impl oraz konsumenta przez `&dyn Trait`. Jednoplikowy test może modelować zachowanie, ale osobny crate klienta dopiero sprawdza granicę publicznego API.",
    distinguish:
      "Dodatnia funkcja w jednym pliku jest przykładem kodu. Nie dowodzi prywatności modułu, importu przez osobny crate ani zgodności starego klienta z nową konfiguracją Cargo; te obserwacje dostarcza zaufany verifier.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "api-release-feature-msrv-matrix",
    title: "Macierz features i dokładna obietnica MSRV",
    prerequisites: ["api-release-old-contracts"],
    competencyIds: ["evaluate-release-matrix"],
    reviewPrompt:
      "Kiedy można wydać zmianę, jeśli default działa, lecz `--no-default-features`, feature opt-in albo Rust 1.85.0 nie przechodzi?",
    reviewAnswer:
      "Nie wydawaj jej jako spełniającej ten kontrakt. Każda wymagana konfiguracja i dokładny compiler floor jest osobnym warunkiem; stable nie zastępuje uruchomienia 1.85.0.",
    distinguish:
      "Kod przeglądarki może ćwiczyć fail-closed decyzję dla pól macierzy. Nie rozwiązuje manifestu, resolvera, zewnętrznego crate ani toolchaina; zaufany verifier uruchamia osobne testy Cargo offline i raportuje ich zakres.",
    evidenceArtifact: "rust-code",
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

const oldContractRun = `trait Beacon {
    fn level(&self) -> u32;
}

fn read_level(beacon: &dyn Beacon) -> u32 {
    beacon.level()
}

fn main() {
    struct DockBeacon;
    impl Beacon for DockBeacon {
        fn level(&self) -> u32 { 7 }
    }
    println!("{}", read_level(&DockBeacon));
}`;

const oldContractStarter = `pub trait Beacon {
    fn level(&self) -> u32;
    fn label(&self) -> &'static str;
}

pub fn read_level(beacon: &dyn Beacon) -> u32 {
    beacon.level()
}

pub fn describe<T: Beacon + ?Sized>(beacon: &T) -> String {
    format!("{}:{}", beacon.label(), beacon.level())
}`;

const oldContractSolution = `pub trait Beacon {
    fn level(&self) -> u32;

    fn label(&self) -> &'static str {
        "beacon"
    }
}

pub fn read_level(beacon: &dyn Beacon) -> u32 {
    beacon.level()
}

pub fn describe<T: Beacon + ?Sized>(beacon: &T) -> String {
    format!("{}:{}", beacon.label(), beacon.level())
}`;

const oldContractTests = `struct OldBeacon {
    value: u32,
    note: String,
}

impl Beacon for OldBeacon {
    fn level(&self) -> u32 { self.value }
}

struct NewBeacon;

impl Beacon for NewBeacon {
    fn level(&self) -> u32 { 11 }
    fn label(&self) -> &'static str { "new" }
}

#[test]
fn old_import_impl_and_dyn_consumer_remain_valid() {
    let old = OldBeacon { value: 7, note: String::from("stary klient") };
    let newer = NewBeacon;
    let old_dyn: fn(&dyn Beacon) -> u32 = read_level;

    assert_eq!(old_dyn(&old), 7);
    assert_eq!(describe(&old), "beacon:7");
    assert_eq!(describe(&newer), "new:11");
    assert_eq!(old.note, "stary klient");
}`;

const oldContractBlankSolution = `pub trait Gauge {
    fn reading(&self) -> u16;

    fn kind(&self) -> &'static str {
        "gauge"
    }
}

pub fn reading_from_dyn(gauge: &dyn Gauge) -> u16 {
    gauge.reading()
}

pub fn report<T: Gauge + ?Sized>(gauge: &T) -> String {
    format!("{}={}", gauge.kind(), gauge.reading())
}`;

const oldContractBlankTests = `struct InstalledGauge {
    value: u16,
    preserved: String,
}

impl Gauge for InstalledGauge {
    fn reading(&self) -> u16 { self.value }
}

struct CalibratedGauge;

impl Gauge for CalibratedGauge {
    fn reading(&self) -> u16 { 19 }
    fn kind(&self) -> &'static str { "calibrated" }
}

#[test]
fn old_gauge_and_dyn_function_survive_the_addition() {
    let old = InstalledGauge { value: 4, preserved: String::from("bez Clone") };
    let calibrated = CalibratedGauge;
    let old_dyn: fn(&dyn Gauge) -> u16 = reading_from_dyn;

    assert_eq!(old_dyn(&old), 4);
    assert_eq!(report(&old), "gauge=4");
    assert_eq!(report(&calibrated), "calibrated=19");
    assert_eq!(old.preserved, "bez Clone");
}`;

const oldContractReviewSolution = `pub trait Pulse {
    fn count(&self) -> u8;

    fn name(&self) -> &'static str {
        "pulse"
    }
}

pub fn consume(pulse: &dyn Pulse) -> u8 {
    pulse.count()
}

pub fn summary<T: Pulse + ?Sized>(pulse: &T) -> String {
    format!("{}:{}", pulse.name(), pulse.count())
}`;

const oldContractReviewTests = `struct ExistingPulse {
    count: u8,
    context: String,
}

impl Pulse for ExistingPulse {
    fn count(&self) -> u8 { self.count }
}

#[test]
fn retrieval_keeps_existing_pulse_contract() {
    let pulse = ExistingPulse { count: 3, context: String::from("old") };
    let dyn_consumer: fn(&dyn Pulse) -> u8 = consume;

    assert_eq!(dyn_consumer(&pulse), 3);
    assert_eq!(summary(&pulse), "pulse:3");
    assert_eq!(pulse.context, "old");
}`;

const matrixRun = `#[derive(Debug, PartialEq, Eq)]
enum Decision { Ship, Hold }

fn approve(default_ok: bool, no_default_ok: bool, msrv_ok: bool) -> Decision {
    if default_ok && no_default_ok && msrv_ok { Decision::Ship } else { Decision::Hold }
}

fn main() {
    println!("{:?} {:?}", approve(true, true, true), approve(true, false, true));
}`;

const matrixStarter = `#[derive(Debug, PartialEq, Eq)]
pub struct ReleaseMatrix {
    pub old_path: bool,
    pub old_impl: bool,
    pub dyn_consumer: bool,
    pub default_features: bool,
    pub no_default_features: bool,
    pub diagnostics_feature: bool,
    pub msrv_1_85: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision { Ship, Hold(&'static str) }

pub fn approve(matrix: &ReleaseMatrix) -> Decision {
    Decision::Ship
}`;

const matrixSolution = `#[derive(Debug, PartialEq, Eq)]
pub struct ReleaseMatrix {
    pub old_path: bool,
    pub old_impl: bool,
    pub dyn_consumer: bool,
    pub default_features: bool,
    pub no_default_features: bool,
    pub diagnostics_feature: bool,
    pub msrv_1_85: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision { Ship, Hold(&'static str) }

pub fn approve(matrix: &ReleaseMatrix) -> Decision {
    let checks = [
        (matrix.old_path, "old-path"),
        (matrix.old_impl, "old-impl"),
        (matrix.dyn_consumer, "dyn"),
        (matrix.default_features, "default"),
        (matrix.no_default_features, "no-default"),
        (matrix.diagnostics_feature, "diagnostics"),
        (matrix.msrv_1_85, "msrv-1.85.0"),
    ];
    checks.iter().find_map(|(passed, reason)| (!passed).then_some(Decision::Hold(reason)))
        .unwrap_or(Decision::Ship)
}`;

const matrixTests = `fn complete_matrix() -> ReleaseMatrix {
    ReleaseMatrix {
        old_path: true,
        old_impl: true,
        dyn_consumer: true,
        default_features: true,
        no_default_features: true,
        diagnostics_feature: true,
        msrv_1_85: true,
    }
}

#[test]
fn every_release_dimension_is_required() {
    assert_eq!(approve(&complete_matrix()), Decision::Ship);
    let mut candidate = complete_matrix();
    candidate.old_path = false;
    assert_eq!(approve(&candidate), Decision::Hold("old-path"));
    candidate = complete_matrix();
    candidate.old_impl = false;
    assert_eq!(approve(&candidate), Decision::Hold("old-impl"));
    candidate = complete_matrix();
    candidate.dyn_consumer = false;
    assert_eq!(approve(&candidate), Decision::Hold("dyn"));
    candidate = complete_matrix();
    candidate.default_features = false;
    assert_eq!(approve(&candidate), Decision::Hold("default"));
    candidate = complete_matrix();
    candidate.no_default_features = false;
    assert_eq!(approve(&candidate), Decision::Hold("no-default"));
    candidate = complete_matrix();
    candidate.diagnostics_feature = false;
    assert_eq!(approve(&candidate), Decision::Hold("diagnostics"));
    candidate = complete_matrix();
    candidate.msrv_1_85 = false;
    assert_eq!(approve(&candidate), Decision::Hold("msrv-1.85.0"));
}`;

const matrixBlankSolution = `#[derive(Debug, PartialEq, Eq)]
pub struct Candidate {
    pub caller: bool,
    pub default_build: bool,
    pub bare_build: bool,
    pub opt_in_build: bool,
    pub compiler_1_85: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Verdict { Accept, Defer(&'static str) }

pub fn decide(candidate: &Candidate) -> Verdict {
    let checks = [
        (candidate.caller, "caller"),
        (candidate.default_build, "default"),
        (candidate.bare_build, "no-default"),
        (candidate.opt_in_build, "opt-in"),
        (candidate.compiler_1_85, "msrv-1.85.0"),
    ];
    checks.iter().find_map(|(passed, reason)| (!passed).then_some(Verdict::Defer(reason)))
        .unwrap_or(Verdict::Accept)
}`;

const matrixBlankTests = `fn ready() -> Candidate {
    Candidate { caller: true, default_build: true, bare_build: true, opt_in_build: true, compiler_1_85: true }
}

#[test]
fn blank_decision_is_fail_closed_for_each_configuration() {
    assert_eq!(decide(&ready()), Verdict::Accept);
    let mut candidate = ready();
    candidate.bare_build = false;
    assert_eq!(decide(&candidate), Verdict::Defer("no-default"));
    candidate = ready();
    candidate.compiler_1_85 = false;
    assert_eq!(decide(&candidate), Verdict::Defer("msrv-1.85.0"));
}`;

const matrixReviewSolution = `#[derive(Debug, PartialEq, Eq)]
pub struct Audit {
    pub legacy_client: bool,
    pub defaults: bool,
    pub without_defaults: bool,
    pub extra_feature: bool,
    pub exact_floor: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Release { Ready, Stop(&'static str) }

pub fn verdict(audit: &Audit) -> Release {
    if !audit.legacy_client { return Release::Stop("legacy-client"); }
    if !audit.defaults { return Release::Stop("default"); }
    if !audit.without_defaults { return Release::Stop("no-default"); }
    if !audit.extra_feature { return Release::Stop("extra-feature"); }
    if !audit.exact_floor { return Release::Stop("msrv-1.85.0"); }
    Release::Ready
}`;

const matrixReviewTests = `#[test]
fn retrieval_requires_exact_floor_and_all_feature_modes() {
    let ready = Audit { legacy_client: true, defaults: true, without_defaults: true, extra_feature: true, exact_floor: true };
    assert_eq!(verdict(&ready), Release::Ready);
    let mut missing = ready;
    missing.extra_feature = false;
    assert_eq!(verdict(&missing), Release::Stop("extra-feature"));
    let mut old = Audit { legacy_client: true, defaults: true, without_defaults: true, extra_feature: true, exact_floor: true };
    old.legacy_client = false;
    assert_eq!(verdict(&old), Release::Stop("legacy-client"));
}`;

const dynBreakingDebug = `trait Beacon {
    fn level(&self) -> u32;
    fn sample<T>(&self, _value: T) {}
}

fn old_dyn_consumer(beacon: &dyn Beacon) -> u32 {
    beacon.level()
}`;

const msrvDebug = `fn declared_toolchain() -> &'static str {
    "1.85.0"
}

fn main() {
    let numeric_floor: u32 = declared_toolchain();
    println!("{}", numeric_floor);
}`;

export const apiReleaseMatrixLessons: Lesson[] = [
  {
    id: "api-release-old-contracts",
    moduleId: "api-release-matrix",
    conceptIds: ["api-release-old-contracts"],
    competencyIds: ["preserve-old-release-contract"],
    prerequisites: ["api-compatible-surface"],
    title: "Wydanie bez zerwania starego klienta",
    subtitle:
      "Prześledź dawną ścieżkę, implementera i `&dyn`, zanim zaakceptujesz rozszerzenie biblioteki.",
    minutes: 35,
    outcomes: [
      "Wypiszesz obserwacje starego klienta, które muszą przejść po zmianie API.",
      "Dodasz domyślną możliwość bez wymuszania nowej metody na istniejącym implementerze.",
      "Zachowasz konsumenta `&dyn Trait` i pożyczany generyk bez dokładania Clone lub Debug.",
      "Oddzielisz model jednego pliku od dowodu osobnego crate klienta w zaufanym verifierze.",
    ],
    steps: [
      choiceStep({
        id: "api-release-old-contracts-predict",
        kind: "predict",
        title: "Przewidź starą obietnicę",
        prompt:
          "Biblioteka chce dodać `label` do publicznego traitu używanego przez starsze aplikacje. Co wpisujesz do kontraktu wydania przed zmianą środka?",
        choices: [
          {
            id: "three",
            label:
              "Starą ścieżkę, istniejący impl i konsumenta `&dyn` z dawną sygnaturą.",
          },
          {
            id: "own-tests",
            label:
              "Tylko testy biblioteki, bo zewnętrzny klient ma ten sam kod.",
          },
          {
            id: "new-only",
            label:
              "Wyłącznie nową funkcję, bo stary import można później poprawić.",
          },
        ],
        correct: "three",
        explanations: {
          three:
            "Te trzy obserwacje opisują realny stary kontrakt. Zaufany verifier dołoży jeszcze osobny crate.",
          "own-tests":
            "Test w tym samym źródle nie tworzy granicy zewnętrznego klienta ani prywatności crate.",
          "new-only":
            "Usunięcie starego importu lub zmiana sygnatury może być breaking nawet wtedy, gdy nowe API działa.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-release-old-contracts-run",
        kind: "run",
        title: "Uruchom dawny odczyt",
        prompt:
          "Uruchom pojedynczy przykład. To obserwacja składni i wyniku w jednym źródle; nie jest dowodem zewnętrznego crate ani Cargo.",
        code: oldContractRun,
        solution: oldContractRun,
        evaluator: { kind: "exact-output", expected: "7\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "api-release-old-contracts-explain",
        kind: "explain",
        title: "Nazwij granicę modelu",
        prompt:
          "Co nadal musi sprawdzić zaufany verifier po przejściu ćwiczenia w przeglądarce?",
        choices: [
          {
            id: "cargo",
            label:
              "Osobny crate starego klienta, publiczny import, implementację traitu i `&dyn`; później także konfiguracje Cargo.",
          },
          {
            id: "none",
            label:
              "Nic, bo kompilacja jednego pliku dowodzi całej zgodności wydania.",
          },
          { id: "browser", label: "Wyłącznie wygląd kodu w edytorze." },
        ],
        correct: "cargo",
        explanations: {
          cargo:
            "Browser ćwiczy ograniczony kontrakt. Osobny crate i Cargo są osobnym, zaufanym dowodem.",
          none: "Jeden plik nie odtwarza granicy crate, resolvera ani zewnętrznego klienta.",
          browser:
            "Formatowanie nie dowodzi zachowania ani kompilacji starego konsumenta.",
        },
        evidenceKind: "recall",
      }),
      {
        id: "api-release-old-contracts-gate",
        kind: "modify",
        title: "Napraw kompatybilny kontrakt",
        prompt:
          "Napraw `Beacon`, aby stary `OldBeacon` nadal implementował trait bez dopisywania `label`, a `read_level(&dyn Beacon)` i `describe<T: Beacon + ?Sized>` zachowały użycie. Nowe implementacje mogą zmienić etykietę. Testy odrzucą pusty stub, wymagany nowy element traitu, bound `Clone` oraz trait niezgodny z dyn. To test modelu Rust; dowód Cargo wykonuje osobny verifier.",
        code: oldContractStarter,
        solution: oldContractSolution,
        evaluator: { kind: "tests", tests: oldContractTests },
        expectedStatus: "compile-error",
        expectedError: "E0046",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Ciało domyślne pozwala staremu implementerowi odziedziczyć nową możliwość.",
          "`&dyn Beacon` i `T: Beacon + ?Sized` nie potrzebują Clone ani Debug.",
        ],
      },
      {
        id: "api-release-old-contracts-debug",
        kind: "debug",
        title: "Zdiagnozuj zerwanie dyn",
        prompt:
          "Uruchom mutację z generyczną metodą bez ograniczenia `Self: Sized`. Kompilator pokazuje, dlaczego dawny `&dyn Beacon` przestał być używalny; ten błąd nie jest dowodem pełnego release.",
        code: dynBreakingDebug,
        solution: dynBreakingDebug,
        evaluator: { kind: "expected-error", code: "E0038" },
        expectedStatus: "compile-error",
        expectedError: "E0038",
        evidenceKind: "exposure",
      },
      {
        id: "api-release-old-contracts-blank",
        kind: "blank",
        title: "Pusta strona: zachowaj miernik",
        prompt:
          "Od zera napisz publiczny trait `Gauge` z `reading(&self) -> u16` i domyślną `kind(&self) -> &'static str`, funkcję `reading_from_dyn(&dyn Gauge) -> u16` oraz `report<T: Gauge + ?Sized>(&T) -> String`. Stary impl testu ma pole `String` i nie implementuje żadnych dodatkowych traitów; test sprawdzi także funkcję przez `&dyn`.",
        solution: oldContractBlankSolution,
        evaluator: { kind: "tests", tests: oldContractBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Dodaj ciało domyślne tylko dla nowej możliwości; wymagana pozostaje jedna stara obserwacja.",
          "Pożycz zarówno trait object, jak i generyczny `?Sized` bez bounds na dane klienta.",
        ],
      },
    ],
    misconceptions: [
      "Test biblioteki w tym samym źródle jest równoważny zewnętrznemu klientowi.",
      "Każda nowa metoda musi być wymagana w starych implementacjach.",
      "Jeśli konkretne wywołanie działa, `&dyn Trait` także zawsze pozostaje zgodne.",
    ],
    transferTask:
      "Przed zmianą publicznej biblioteki zapisz import starego klienta, jego impl traitu, funkcję przez `&dyn` i dokładną sygnaturę; potem poproś zaufany verifier o osobny test Cargo.",
    evidenceGate:
      "Gate wymaga starego implementera z dodatkowymi danymi, funkcji przez `&dyn`, generyka `?Sized` i domyślnej nowej możliwości. Pusta strona jest niezależną drogą do tego samego kontraktu.",
    sourceIds: [
      "api-release-semver-reference",
      "api-release-workspaces-reference",
    ],
  },
  {
    id: "api-release-matrix-decision",
    moduleId: "api-release-matrix",
    conceptIds: ["api-release-feature-msrv-matrix"],
    competencyIds: ["evaluate-release-matrix"],
    prerequisites: ["api-release-old-contracts"],
    title: "Macierz wydania: features i MSRV",
    subtitle:
      "Nie podpisuj release na podstawie zielonego stable, gdy brakuje konfiguracji klienta albo dokładnego compiler floor.",
    minutes: 35,
    outcomes: [
      "Rozbijesz decyzję release na starego klienta, default, no-default, opt-in i dokładny MSRV.",
      "Zastosujesz decyzję fail-closed, gdy choć jeden wymagany wymiar nie ma dowodu.",
      "Odróżnisz ćwiczenie booleanów w jednym źródle od uruchomienia manifestów i zewnętrznego klienta przez Cargo.",
      "Zapiszesz zakres dowodu bez nazywania stable dowodem Rust 1.85.0.",
    ],
    steps: [
      choiceStep({
        id: "api-release-matrix-decision-predict",
        kind: "predict",
        title: "Wybierz bezpieczną decyzję",
        prompt:
          "Default i stable przechodzą, ale `--no-default-features` nie kompiluje się. Jaka decyzja zachowuje zakres obietnicy?",
        choices: [
          {
            id: "hold",
            label:
              "Hold z powodem `no-default`; brakujący wymiar nie jest zastępowany stable.",
          },
          { id: "ship", label: "Ship, bo użytkownicy zwykle używają default." },
          {
            id: "msrv-only",
            label:
              "Ship, jeśli dokładny MSRV przechodzi; features są osobną sprawą.",
          },
        ],
        correct: "hold",
        explanations: {
          hold: "Każdy wymagany wymiar ma własny dowód. Stable i default nie przykrywają brakującej konfiguracji.",
          ship: "Częstość użycia nie zmienia zadeklarowanego kontraktu features.",
          "msrv-only":
            "MSRV jest jednym warunkiem; no-default pozostaje niespełnione.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-release-matrix-decision-run",
        kind: "run",
        title: "Uruchom mały model decyzji",
        prompt:
          "Uruchom model jednej decyzji. Używa on booleanów, więc ćwiczy fail-closed reasoning; nie uruchamia Cargo ani żadnego toolchaina.",
        code: matrixRun,
        solution: matrixRun,
        evaluator: { kind: "exact-output", expected: "Ship Hold\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "api-release-matrix-decision-explain",
        kind: "explain",
        title: "Oddziel dowód od modelu",
        prompt: "Które zdanie poprawnie opisuje browserowe zadanie z macierzą?",
        choices: [
          {
            id: "bounded",
            label:
              "Sprawdza logikę decyzji dla pól; zaufany verifier osobno uruchamia Cargo default/no-default/opt-in, klienta i Rust 1.85.0.",
          },
          {
            id: "cargo",
            label:
              "Boolean w jednym pliku jest dowodem resolvera, manifestu i MSRV.",
          },
          {
            id: "stable",
            label:
              "Przejście stable pozwala nazwać dokładny MSRV zweryfikowanym.",
          },
        ],
        correct: "bounded",
        explanations: {
          bounded:
            "Model ogranicza się do decyzji. Prawdziwe konfiguracje i toolchain wymagają osobnych procesów Cargo.",
          cargo:
            "Kod jednego źródła nie czyta manifestu ani nie tworzy granicy zewnętrznego crate.",
          stable:
            "Stable i Rust 1.85.0 to różne uruchomienia; wersji minimalnej nie wolno wnioskować ze stable.",
        },
        evidenceKind: "recall",
      }),
      {
        id: "api-release-matrix-decision-gate",
        kind: "modify",
        title: "Zaimplementuj decyzję fail-closed",
        prompt:
          "Uzupełnij `approve`, sprawdzając starego klienta, starego implementera, `&dyn`, default, no-default, opt-in `diagnostics` i dokładny MSRV `1.85.0`. Zwróć `Hold` z pierwszym brakującym powodem, a `Ship` tylko przy kompletnym rekordzie. Hidden tests odrzucą bezwarunkowy stub oraz każdą mutację pomijającą wymiar. To model decyzji; manifest i Cargo są dowodem zaufanego verifiera.",
        code: matrixStarter,
        solution: matrixSolution,
        evaluator: { kind: "tests", tests: matrixTests },
        expectedStatus: "success",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Zapisz w kolejności każdy warunek z nazwanym powodem.",
          "Dopiero po przejściu wszystkich siedmiu wymiarów zwróć `Ship`.",
        ],
      },
      {
        id: "api-release-matrix-decision-debug",
        kind: "debug",
        title: "Zdiagnozuj fałszywy typ MSRV",
        prompt:
          "Uruchom mutację, która traktuje wersję toolchaina jako liczbę. Naprawa należy do reportu i verifiera: identyfikator `1.85.0` jest dokładnym napisem, a stable nie jest jego skrótem.",
        code: msrvDebug,
        solution: msrvDebug,
        evaluator: { kind: "expected-error", diagnostic: "mismatched types" },
        expectedStatus: "compile-error",
        expectedDiagnostic: "mismatched types",
        evidenceKind: "exposure",
      },
      {
        id: "api-release-matrix-decision-blank",
        kind: "blank",
        title: "Pusta strona: decyzja dla konfiguracji",
        prompt:
          "Od zera napisz `Candidate`, `Verdict` oraz `decide`. Wymagaj starego klienta, default, no-default, opt-in feature i dokładnego compiler floor `1.85.0`; zwróć `Defer` z pierwszym brakującym powodem. Test jest modelem jednego źródła i nie udaje `cargo check` ani granicy external crate.",
        solution: matrixBlankSolution,
        evaluator: { kind: "tests", tests: matrixBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Traktuj każdy wymiar jako niezależny warunek; brak jednego zatrzymuje decyzję.",
          "Nazwij powód tak, by raport nie sugerował, że stable zastąpił dokładny MSRV.",
        ],
      },
    ],
    misconceptions: [
      "Zielony stable automatycznie dowodzi dokładnego MSRV.",
      "Default features są wystarczającym testem biblioteki.",
      "Booleanowy model w przeglądarce uruchamia Cargo i zewnętrznego klienta.",
    ],
    transferTask:
      "Zbuduj release matrix dla własnej biblioteki: wypisz osobno starego klienta, default, no-default, opt-in feature i exact MSRV, a przy każdym zapisz komendę zaufanego verifiera oraz zakres dowodu.",
    evidenceGate:
      "Gate wymaga fail-closed decyzji dla każdego wymiaru i rozróżnienia stable od exact MSRV. Blank odtwarza decyzję w innej domenie danych.",
    sourceIds: [
      "api-release-semver-reference",
      "api-release-features-reference",
      "api-release-rust-version-reference",
      "api-release-workspaces-reference",
    ],
  },
];

export const apiReleaseMatrixReviewExercises: Record<string, LessonStep> = {
  "api-release-old-contracts": {
    id: "api-release-old-contracts-review",
    kind: "recall",
    title: "Powtórka: stary puls",
    prompt:
      "Odtwórz trait `Pulse` z metodą `count`, domyślną `name`, konsumentem `&dyn Pulse` i generycznym `summary<T: Pulse + ?Sized>`. Test dopisze stary impl z `String` i sprawdzi wskaźnik funkcji do konsumenta dyn.",
    solution: oldContractReviewSolution,
    evaluator: { kind: "tests", tests: oldContractReviewTests },
    evidenceKind: "recall",
  },
  "api-release-feature-msrv-matrix": {
    id: "api-release-feature-msrv-matrix-review",
    kind: "recall",
    title: "Powtórka: audyt macierzy",
    prompt:
      "Odtwórz `Audit`, `Release` oraz `verdict`. Wymagaj starego klienta, default, no-default, opt-in i exact `1.85.0`; zwróć pierwszy powód Stop. Dane są modelem do retrieval, a nie Cargo proof.",
    solution: matrixReviewSolution,
    evaluator: { kind: "tests", tests: matrixReviewTests },
    evidenceKind: "recall",
  },
};

export const apiReleaseMatrixModule: CourseModule = {
  id: "api-release-matrix",
  title: "API Release Matrix: klient, features i MSRV",
  whyItMatters:
    "Mała zmiana biblioteki może zachować własne testy, a zerwać starego klienta, konfigurację feature albo minimalny compiler. Zbudujesz fail-closed decyzję, która rozdziela model kodu od zaufanego dowodu Cargo.",
  capabilities: apiReleaseMatrixCompetencies.map((item) => item.title),
  prerequisites: ["public-api-workspaces"],
  lessonIds: apiReleaseMatrixLessons.map((lesson) => lesson.id),
  exitGate: [
    "Zachowasz starą ścieżkę, implementera i konsumenta dyn w modelu zmiany API.",
    "Rozbijesz release na osobnego klienta, default/no-default, opt-in feature i exact MSRV, zatrzymując decyzję po każdym braku dowodu.",
    "Wyjaśnisz, że browserowy kod jednego źródła nie zastępuje zaufanego verifiera workspace Cargo.",
  ],
  projectConnection:
    "W Frame Protocol decyzja release może korzystać z osobnego klienta, feature matrix i dokładnego toolchaina MSRV. Ćwiczenia tej lekcji modelują tylko logikę kontraktu w jednym źródle; nie zastępują testu Cargo, granicy zewnętrznego crate ani istniejących archiwów i semantyki ukończenia projektu.",
  assessmentId: "api-release-matrix-decision/api-release-matrix-decision-blank",
  gateCriteria: [
    {
      id: "api-release-old-contracts-gate",
      label: "Stary klient, implementer i konsument dyn pozostają używalni.",
      taskRefs: [
        {
          lessonId: "api-release-old-contracts",
          stepId: "api-release-old-contracts-gate",
        },
        {
          lessonId: "api-release-old-contracts",
          stepId: "api-release-old-contracts-blank",
        },
      ],
    },
    {
      id: "api-release-matrix-decision-gate",
      label:
        "Decyzja release wymaga wszystkich konfiguracji i dokładnego MSRV.",
      taskRefs: [
        {
          lessonId: "api-release-matrix-decision",
          stepId: "api-release-matrix-decision-gate",
        },
        {
          lessonId: "api-release-matrix-decision",
          stepId: "api-release-matrix-decision-blank",
        },
      ],
    },
  ],
};
