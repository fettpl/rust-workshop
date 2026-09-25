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
      "Rozpoznajesz i zachowujesz stare publiczne ścieżki, sygnatury oraz obserwowalne wyniki przed zaakceptowaniem zmiany API.",
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
    title: "Stara publiczna ścieżka i obserwowalne zachowanie",
    prerequisites: ["api-compatible-surface"],
    competencyIds: ["preserve-old-release-contract"],
    reviewPrompt:
      "Co musi pozostać takie samo, gdy biblioteka dodaje sprawdzoną funkcję obok dawnej publicznej ścieżki?",
    reviewAnswer:
      "Zachowaj dawny import, dokładną sygnaturę i obserwowalne wyniki, a nową funkcję dodaj obok nich. Jednoplikowy test może modelować starego klienta, ale osobny crate dopiero sprawdza granicę publicznego API.",
    distinguish:
      "Dodatnia funkcja w jednym pliku jest przykładem kodu. Nie dowodzi prywatności modułu ani importu przez osobny crate; te obserwacje dostarcza zaufany verifier.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "api-release-feature-msrv-matrix",
    title: "Pochodzenie dowodów w macierzy release",
    prerequisites: ["api-release-old-contracts"],
    competencyIds: ["evaluate-release-matrix"],
    reviewPrompt:
      "Jak odróżnić kompletną macierz release od listy zielonych booleanów bez pochodzenia, daty i artefaktu?",
    reviewAnswer:
      "Każdy wymagany rekord musi wskazywać konfigurację, klienta, toolchain, wynik, artefakt i świeżość obserwacji. Brak, stary, zduplikowany albo sprzeczny rekord zatrzymuje wydanie; stable nie zastępuje uruchomienia 1.85.0.",
    distinguish:
      "Kod przeglądarki może ćwiczyć fail-closed decyzję dla rekordów dowodów. Nie rozwiązuje manifestu, resolvera, zewnętrznego crate ani toolchaina; zaufany verifier uruchamia osobne testy Cargo offline i raportuje ich zakres.",
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

const oldContractRun = `pub mod legacy {
    pub fn render(input: &str) -> String {
        format!("entry:{input}")
    }
}

pub use legacy::render;

fn main() {
    println!("{}", legacy::render("żółć"));
    println!("{}", render(""));
}`;

const oldContractStarter = `mod layout {
    pub fn compose(input: &str) -> String {
        format!("entry:{}", input.trim())
    }
}

pub mod legacy {
    pub fn render(input: &str) -> String {
        super::layout::compose(input)
    }
}

pub fn checked_render(input: &str) -> Result<String, &'static str> {
    if input.is_empty() { Err("empty") } else { Ok(layout::compose(input)) }
}

mod old_client {
    use super::render;

    pub fn call(input: &str) -> String {
        render(input)
    }
}`;

const oldContractSolution = `mod layout {
    pub fn compose(input: &str) -> String {
        format!("entry:{}", input)
    }
}

pub mod legacy {
    pub fn render(input: &str) -> String {
        super::layout::compose(input)
    }
}

pub use legacy::render;

pub fn checked_render(input: &str) -> Result<String, &'static str> {
    if input.is_empty() { Err("empty") } else { Ok(layout::compose(input)) }
}

mod old_client {
    use super::render;

    pub fn call(input: &str) -> String {
        render(input)
    }
}`;

const oldContractTests = `#[test]
fn old_public_path_and_behavior_survive_new_checked_api() {
    let module_path: fn(&str) -> String = legacy::render;
    let root_path: fn(&str) -> String = render;

    assert_eq!(module_path(" żółć "), "entry: żółć ");
    assert_eq!(root_path(""), "entry:");
    assert_eq!(old_client::call(" 7 "), "entry: 7 ");
    assert_eq!(checked_render("ok"), Ok(String::from("entry:ok")));
    assert_eq!(checked_render(""), Err("empty"));
}`;

const oldContractBlankSolution = `mod formatter {
    pub fn line(input: &str) -> String {
        format!("record|{}", input)
    }
}

pub mod classic {
    pub fn pack(input: &str) -> String {
        super::formatter::line(input)
    }
}

pub use classic::pack;

pub fn checked_pack(input: &str) -> Result<String, &'static str> {
    if input.is_empty() { Err("empty") } else { Ok(formatter::line(input)) }
}

mod installed_client {
    use super::pack;

    pub fn call(input: &str) -> String {
        pack(input)
    }
}`;

const oldContractBlankTests = `#[test]
fn independent_classic_import_keeps_whitespace_and_adds_checked_pack() {
    let module_path: fn(&str) -> String = classic::pack;
    let root_path: fn(&str) -> String = pack;

    assert_eq!(module_path(" a "), "record| a ");
    assert_eq!(root_path(""), "record|");
    assert_eq!(installed_client::call("x"), "record|x");
    assert_eq!(checked_pack("x"), Ok(String::from("record|x")));
    assert_eq!(checked_pack(""), Err("empty"));
}`;

const oldContractReviewSolution = `mod compatibility {
    pub fn line(input: &str) -> String {
        format!("note:{input}")
    }
}

pub mod compat {
    pub fn line(input: &str) -> String {
        super::compatibility::line(input)
    }
}

pub use compat::line;

pub fn try_line(input: &str) -> Result<String, &'static str> {
    if input.is_empty() { Err("empty") } else { Ok(compatibility::line(input)) }
}`;

const oldContractReviewTests = `#[test]
fn retrieval_checks_legacy_module_root_and_checked_route() {
    let module_path: fn(&str) -> String = compat::line;
    let root_path: fn(&str) -> String = line;

    assert_eq!(module_path(" żółć "), "note: żółć ");
    assert_eq!(root_path(""), "note:");
    assert_eq!(try_line("ok"), Ok(String::from("note:ok")));
}`;

const matrixRun = `#[derive(Debug, PartialEq, Eq)]
enum Outcome { Pass, Fail }

fn main() {
    println!("{:?} {:?}", Outcome::Pass, Outcome::Fail);
}`;

const matrixStarter = `#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Outcome { Pass, Fail }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Evidence {
    pub dimension: &'static str,
    pub toolchain: &'static str,
    pub config: &'static str,
    pub client: &'static str,
    pub outcome: Outcome,
    pub captured_ymd: u32,
    pub artifact_hash: &'static str,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision { Ship, Hold(&'static str) }

pub fn approve(_records: &[Evidence], _as_of_ymd: u32) -> Decision {
    Decision::Ship
}`;

const matrixSolution = `#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Outcome { Pass, Fail }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Evidence {
    pub dimension: &'static str,
    pub toolchain: &'static str,
    pub config: &'static str,
    pub client: &'static str,
    pub outcome: Outcome,
    pub captured_ymd: u32,
    pub artifact_hash: &'static str,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision { Ship, Hold(&'static str) }

fn valid_hash(hash: &str) -> bool {
    hash.starts_with("sha256:") && hash.len() == 71
}

pub fn approve(records: &[Evidence], as_of_ymd: u32) -> Decision {
    let required = [
        ("legacy-client", "external", "old-consumer", "stable"),
        ("default", "default", "old-consumer", "stable"),
        ("no-default", "no-default", "old-consumer", "stable"),
        ("diagnostics", "diagnostics", "old-consumer", "stable"),
        ("msrv", "default", "old-consumer", "1.85.0"),
    ];
    for record in records {
        if !required.iter().any(|(dimension, _, _, _)| *dimension == record.dimension) {
            return Decision::Hold("unknown");
        }
    }
    for (dimension, config, client, toolchain) in required {
        let matches: Vec<&Evidence> = records.iter().filter(|record| record.dimension == dimension).collect();
        if matches.is_empty() { return Decision::Hold("missing"); }
        if matches.len() > 1 {
            if matches.iter().any(|record| **record != *matches[0]) {
                return Decision::Hold("conflict");
            }
            return Decision::Hold("duplicate");
        }
        let record = matches[0];
        if record.config != config || record.client != client || record.toolchain != toolchain {
            return Decision::Hold("provenance");
        }
        if record.outcome != Outcome::Pass { return Decision::Hold("failed"); }
        if record.captured_ymd != as_of_ymd { return Decision::Hold("stale"); }
        if !valid_hash(record.artifact_hash) { return Decision::Hold("hash"); }
    }
    Decision::Ship
}`;

const matrixTests = `const HASH: &str = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

fn evidence(dimension: &'static str, config: &'static str, toolchain: &'static str) -> Evidence {
    Evidence { dimension, toolchain, config, client: "old-consumer", outcome: Outcome::Pass, captured_ymd: 20260925, artifact_hash: HASH }
}

fn complete() -> Vec<Evidence> {
    vec![
        evidence("legacy-client", "external", "stable"),
        evidence("default", "default", "stable"),
        evidence("no-default", "no-default", "stable"),
        evidence("diagnostics", "diagnostics", "stable"),
        evidence("msrv", "default", "1.85.0"),
    ]
}

#[test]
fn provenance_matrix_requires_every_fresh_configuration() {
    assert_eq!(approve(&complete(), 20260925), Decision::Ship);
    for dimension in ["legacy-client", "default", "no-default", "diagnostics", "msrv"] {
        let mut records = complete();
        records.retain(|record| record.dimension != dimension);
        assert_eq!(approve(&records, 20260925), Decision::Hold("missing"));
    }
    let mut stale = complete();
    stale[0].captured_ymd = 20260924;
    assert_eq!(approve(&stale, 20260925), Decision::Hold("stale"));
    let mut duplicate = complete();
    duplicate.push(duplicate[0]);
    assert_eq!(approve(&duplicate, 20260925), Decision::Hold("duplicate"));
    let mut conflict = complete();
    conflict.push(Evidence { outcome: Outcome::Fail, ..conflict[0] });
    assert_eq!(approve(&conflict, 20260925), Decision::Hold("conflict"));
    let mut forged = complete();
    forged[1].artifact_hash = "sha256:forged";
    assert_eq!(approve(&forged, 20260925), Decision::Hold("hash"));
    let mut wrong_floor = complete();
    wrong_floor[4].toolchain = "stable";
    assert_eq!(approve(&wrong_floor, 20260925), Decision::Hold("provenance"));
}`;

const matrixBlankSolution = `#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum ResultKind { Pass, Fail }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Proof {
    pub key: &'static str,
    pub compiler: &'static str,
    pub mode: &'static str,
    pub consumer: &'static str,
    pub result: ResultKind,
    pub observed_ymd: u32,
    pub digest: &'static str,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Verdict { Accept, Defer(&'static str) }

pub fn decide(proofs: &[Proof], as_of_ymd: u32) -> Verdict {
    let required = [
        ("caller", "stable", "external", "old-consumer"),
        ("default", "stable", "default", "old-consumer"),
        ("bare", "stable", "no-default", "old-consumer"),
        ("opt-in", "stable", "diagnostics", "old-consumer"),
        ("floor", "1.85.0", "default", "old-consumer"),
    ];
    for (key, compiler, mode, consumer) in required {
        let matches: Vec<&Proof> = proofs.iter().filter(|proof| proof.key == key).collect();
        if matches.is_empty() { return Verdict::Defer("missing"); }
        if matches.len() > 1 { return Verdict::Defer("duplicate"); }
        let proof = matches[0];
        if proof.compiler != compiler || proof.mode != mode || proof.consumer != consumer { return Verdict::Defer("provenance"); }
        if proof.result != ResultKind::Pass { return Verdict::Defer("failed"); }
        if proof.observed_ymd != as_of_ymd { return Verdict::Defer("stale"); }
        if !proof.digest.starts_with("sha256:") || proof.digest.len() != 71 { return Verdict::Defer("hash"); }
    }
    Verdict::Accept
}`;

const matrixBlankTests = `const DIGEST: &str = "sha256:1111111111111111111111111111111111111111111111111111111111111111";

fn ready() -> Vec<Proof> {
    vec![
        Proof { key: "caller", compiler: "stable", mode: "external", consumer: "old-consumer", result: ResultKind::Pass, observed_ymd: 20260925, digest: DIGEST },
        Proof { key: "default", compiler: "stable", mode: "default", consumer: "old-consumer", result: ResultKind::Pass, observed_ymd: 20260925, digest: DIGEST },
        Proof { key: "bare", compiler: "stable", mode: "no-default", consumer: "old-consumer", result: ResultKind::Pass, observed_ymd: 20260925, digest: DIGEST },
        Proof { key: "opt-in", compiler: "stable", mode: "diagnostics", consumer: "old-consumer", result: ResultKind::Pass, observed_ymd: 20260925, digest: DIGEST },
        Proof { key: "floor", compiler: "1.85.0", mode: "default", consumer: "old-consumer", result: ResultKind::Pass, observed_ymd: 20260925, digest: DIGEST },
    ]
}

#[test]
fn blank_proof_review_rejects_missing_stale_and_forged_records() {
    assert_eq!(decide(&ready(), 20260925), Verdict::Accept);
    for key in ["caller", "default", "bare", "opt-in", "floor"] {
        let proofs = ready().into_iter().filter(|proof| proof.key != key).collect::<Vec<_>>();
        assert_eq!(decide(&proofs, 20260925), Verdict::Defer("missing"));
    }
    let mut stale = ready();
    stale[0].observed_ymd = 20260924;
    assert_eq!(decide(&stale, 20260925), Verdict::Defer("stale"));
    let mut forged = ready();
    forged[1].digest = "sha256:forged";
    assert_eq!(decide(&forged, 20260925), Verdict::Defer("hash"));
}`;

const matrixReviewSolution = `#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Status { Pass, Fail }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Run {
    pub name: &'static str,
    pub compiler: &'static str,
    pub feature_set: &'static str,
    pub client: &'static str,
    pub status: Status,
    pub observed_ymd: u32,
    pub hash: &'static str,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Release { Ready, Stop(&'static str) }

pub fn verdict(runs: &[Run], as_of_ymd: u32) -> Release {
    let required = [
        ("legacy", "stable", "external"),
        ("default", "stable", "default"),
        ("minimal", "stable", "no-default"),
        ("diagnostics", "stable", "diagnostics"),
        ("msrv", "1.85.0", "default"),
    ];
    for (name, compiler, feature_set) in required {
        let matches: Vec<&Run> = runs.iter().filter(|run| run.name == name).collect();
        if matches.is_empty() { return Release::Stop("missing"); }
        if matches.len() > 1 {
            if matches.iter().any(|run| **run != *matches[0]) { return Release::Stop("conflict"); }
            return Release::Stop("duplicate");
        }
        let run = matches[0];
        if run.compiler != compiler || run.feature_set != feature_set || run.client != "old-consumer" { return Release::Stop("provenance"); }
        if run.status != Status::Pass { return Release::Stop("failed"); }
        if run.observed_ymd != as_of_ymd { return Release::Stop("stale"); }
        if !run.hash.starts_with("sha256:") || run.hash.len() != 71 { return Release::Stop("hash"); }
    }
    Release::Ready
}`;

const matrixReviewTests = `const HASH: &str = "sha256:2222222222222222222222222222222222222222222222222222222222222222";

fn ready() -> Vec<Run> {
    vec![
        Run { name: "legacy", compiler: "stable", feature_set: "external", client: "old-consumer", status: Status::Pass, observed_ymd: 20260925, hash: HASH },
        Run { name: "default", compiler: "stable", feature_set: "default", client: "old-consumer", status: Status::Pass, observed_ymd: 20260925, hash: HASH },
        Run { name: "minimal", compiler: "stable", feature_set: "no-default", client: "old-consumer", status: Status::Pass, observed_ymd: 20260925, hash: HASH },
        Run { name: "diagnostics", compiler: "stable", feature_set: "diagnostics", client: "old-consumer", status: Status::Pass, observed_ymd: 20260925, hash: HASH },
        Run { name: "msrv", compiler: "1.85.0", feature_set: "default", client: "old-consumer", status: Status::Pass, observed_ymd: 20260925, hash: HASH },
    ]
}

#[test]
fn review_rejects_absent_stale_and_conflicting_evidence() {
    assert_eq!(verdict(&ready(), 20260925), Release::Ready);
    for name in ["legacy", "default", "minimal", "diagnostics", "msrv"] {
        let runs = ready().into_iter().filter(|run| run.name != name).collect::<Vec<_>>();
        assert_eq!(verdict(&runs, 20260925), Release::Stop("missing"));
    }
    let mut stale = ready();
    stale[4].observed_ymd = 20260924;
    assert_eq!(verdict(&stale, 20260925), Release::Stop("stale"));
    let mut conflict = ready();
    conflict.push(Run { status: Status::Fail, ..conflict[0] });
    assert_eq!(verdict(&conflict, 20260925), Release::Stop("conflict"));
}`;

const pathBreakingDebug = `pub mod legacy {
    pub fn render(input: &str) -> String {
        format!("entry:{input}")
    }
}

mod old_client {
    use super::render;

    pub fn call(input: &str) -> String {
        render(input)
    }
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
    title: "Wydanie bez zerwania starej ścieżki",
    subtitle:
      "Zachowaj dawny import i obserwowalne wyniki, gdy obok nich dodajesz sprawdzoną funkcję.",
    minutes: 20,
    outcomes: [
      "Wypiszesz dawną publiczną ścieżkę, sygnaturę i wyniki, które muszą przejść po zmianie API.",
      "Zachowasz modułowy import i re-eksport, dodając obok nich sprawdzoną funkcję.",
      "Rozpoznasz zmianę zachowania, taką jak niejawne trim, jako regresję starego klienta.",
      "Oddzielisz model jednego pliku od dowodu osobnego crate klienta w zaufanym verifierze.",
    ],
    steps: [
      choiceStep({
        id: "api-release-old-contracts-predict",
        kind: "predict",
        title: "Przewidź starą obietnicę",
        prompt:
          "Biblioteka chce dodać sprawdzoną funkcję obok `legacy::render`. Co wpisujesz do kontraktu wydania przed zmianą środka?",
        choices: [
          {
            id: "three",
            label:
              "Stary import modułowy, re-eksport, dokładną sygnaturę i obserwowalne wyniki.",
          },
          {
            id: "own-tests",
            label:
              "Tylko testy nowej funkcji, bo stary klient może zmienić import.",
          },
          {
            id: "new-only",
            label:
              "Wyłącznie nową funkcję, bo dawną ścieżkę można później usunąć.",
          },
        ],
        correct: "three",
        explanations: {
          three:
            "Import, re-eksport, sygnatura i wynik opisują stary kontrakt. Zaufany verifier dołoży jeszcze osobny crate.",
          "own-tests":
            "Test nowej funkcji nie zachowuje starego importu ani dawnych wyników.",
          "new-only":
            "Usunięcie starej ścieżki może być breaking nawet wtedy, gdy nowe API działa.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-release-old-contracts-run",
        kind: "run",
        title: "Uruchom dawny odczyt",
        prompt:
          "Uruchom dawne wywołanie przez moduł i re-eksport. To obserwacja składni i wyniku w jednym źródle; nie jest dowodem zewnętrznego crate ani Cargo.",
        code: oldContractRun,
        solution: oldContractRun,
        evaluator: { kind: "exact-output", expected: "entry:żółć\nentry:\n" },
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
              "Osobny crate starego klienta, publiczny import, sygnaturę i wyniki; później także konfiguracje Cargo.",
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
        title: "Zachowaj starą ścieżkę i wynik",
        prompt:
          "Napraw przebudowę środka tak, aby dawny klient nadal mógł importować publiczną ścieżkę `legacy::render` i rootowy re-eksport `render` z dokładną sygnaturą `fn(&str) -> String`. Zachowaj spacje, Unicode i pusty tekst bez trim oraz dodaj `checked_render`, który odrzuca pustkę. Testy odrzucą usunięty re-eksport, zmianę wyniku i pusty stub. To test modelu Rust; dowód Cargo wykonuje osobny verifier.",
        code: oldContractStarter,
        solution: oldContractSolution,
        evaluator: { kind: "tests", tests: oldContractTests },
        expectedStatus: "compile-error",
        expectedDiagnostic: "unresolved import `super::render`",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Stary wrapper zachowuje dawną ścieżkę, a nowe sprawdzenie może działać obok niego.",
          "Nie normalizuj wejścia starego klienta; spacje i pusty tekst są częścią obserwowalnego wyniku.",
        ],
      },
      {
        id: "api-release-old-contracts-debug",
        kind: "debug",
        title: "Zdiagnozuj usunięty re-eksport",
        prompt:
          "Uruchom mutację, w której dawna ścieżka rootowa znika, choć `legacy::render` nadal istnieje. Kompilator pokazuje błąd starego klienta; to nie jest dowód pełnego release.",
        code: pathBreakingDebug,
        solution: pathBreakingDebug,
        evaluator: {
          kind: "expected-error",
          diagnostic: "unresolved import `super::render`",
        },
        expectedStatus: "compile-error",
        expectedDiagnostic: "unresolved import `super::render`",
        evidenceKind: "exposure",
      },
      {
        id: "api-release-old-contracts-blank",
        kind: "blank",
        title: "Pusta strona: zachowaj klasyczny import",
        prompt:
          "Od zera napisz moduł `classic` z publicznym `pack(&str) -> String`, zachowaj jego rootowy re-eksport i dodaj `checked_pack(&str) -> Result<String, &'static str>`. Stary klient testu sprawdzi import modułowy, rootowy, spacje, pusty tekst i Unicode; checked route ma odrzucić pustkę.",
        solution: oldContractBlankSolution,
        evaluator: { kind: "tests", tests: oldContractBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Zachowaj dawną funkcję przez wrapper i re-eksport; nowa funkcja może mieć wynik `Result`.",
          "Nie używaj trim w starej ścieżce, bo spacje są obserwowalnym wynikiem.",
        ],
      },
    ],
    misconceptions: [
      "Test nowej funkcji jest równoważny staremu klientowi.",
      "Trim i inna normalizacja są niewidoczne dla klienta, jeśli nowy wynik wygląda sensownie.",
      "Re-eksport można usunąć, gdy modułowa ścieżka nadal istnieje.",
    ],
    transferTask:
      "Przed zmianą publicznej biblioteki zapisz import modułowy, re-eksport, dokładną sygnaturę i przykłady wyników starego klienta; potem poproś zaufany verifier o osobny test Cargo.",
    evidenceGate:
      "Gate wymaga starego importu modułowego, re-eksportu, dokładnego zachowania i nowej checked funkcji. Pusta strona jest niezależną drogą do tego samego kontraktu.",
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
    title: "Macierz wydania: pochodzenie dowodów",
    subtitle:
      "Nie podpisuj release na podstawie zielonego stable, gdy brakuje konfiguracji klienta albo dokładnego compiler floor.",
    minutes: 20,
    outcomes: [
      "Zapiszesz konfigurację, klienta, toolchain, wynik, datę i hash dla każdego rekordu dowodu.",
      "Odrzucisz brak, stary, zduplikowany albo sprzeczny rekord przed decyzją Ship.",
      "Odróżnisz model provenance w jednym źródle od uruchomienia manifestów i zewnętrznego klienta przez Cargo.",
      "Zapiszesz zakres dowodu bez nazywania stable dowodem Rust 1.85.0.",
    ],
    steps: [
      choiceStep({
        id: "api-release-matrix-decision-predict",
        kind: "predict",
        title: "Wybierz bezpieczną decyzję",
        prompt:
          "Default i stable przechodzą, ale rekord `--no-default-features` nie ma świeżego artefaktu. Jaka decyzja zachowuje zakres obietnicy?",
        choices: [
          {
            id: "hold",
            label:
              "Hold z powodem braku świeżego `no-default`; zielony default nie zastępuje brakującego rekordu.",
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
          hold: "Każdy wymagany wymiar ma własny rekord z pochodzeniem. Stable i default nie przykrywają brakującego artefaktu.",
          ship: "Częstość użycia nie zmienia zadeklarowanego kontraktu features.",
          "msrv-only":
            "MSRV jest jednym rekordem; brak świeżego no-default pozostaje niespełniony.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-release-matrix-decision-run",
        kind: "run",
        title: "Uruchom model rekordu",
        prompt:
          "Uruchom mały model wyniku obserwacji. Ćwiczy on tylko nazwanie `Pass` i `Fail`; nie uruchamia Cargo ani żadnego toolchaina.",
        code: matrixRun,
        solution: matrixRun,
        evaluator: { kind: "exact-output", expected: "Pass Fail\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "api-release-matrix-decision-explain",
        kind: "explain",
        title: "Oddziel dowód od modelu",
        prompt:
          "Które zdanie poprawnie opisuje browserowe zadanie z provenance?",
        choices: [
          {
            id: "bounded",
            label:
              "Sprawdza logikę rekordów i świeżości; zaufany verifier osobno uruchamia Cargo default/no-default/opt-in, klienta i Rust 1.85.0.",
          },
          {
            id: "cargo",
            label:
              "Rekord w jednym pliku jest dowodem resolvera, manifestu i MSRV.",
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
        title: "Zaimplementuj decyzję z provenance",
        prompt:
          "Uzupełnij `approve`, sprawdzając dla każdego rekordu nazwę konfiguracji, toolchain, klienta, wynik `Pass`, datę obserwacji i hash artefaktu. Wymagaj starego klienta, default, no-default, opt-in `diagnostics` i dokładnego MSRV `1.85.0`; odrzuć brak, stary, pusty, zduplikowany lub sprzeczny dowód. Zwróć `Ship` tylko przy kompletnej świeżej macierzy. To model decyzji; manifest i Cargo są dowodem zaufanego verifiera.",
        code: matrixStarter,
        solution: matrixSolution,
        evaluator: { kind: "tests", tests: matrixTests },
        expectedStatus: "success",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Najpierw znajdź dokładnie jeden rekord dla każdej wymaganej konfiguracji i sprawdź jego pochodzenie.",
          "Świeży hash i dokładny `1.85.0` są warunkami osobnymi od samego wyniku `Pass`.",
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
          "Od zera napisz `Proof`, `Verdict` oraz `decide`. Każdy rekord ma nazwę, compiler, tryb feature, klienta, wynik, datę i digest. Wymagaj starego klienta, default, no-default, opt-in feature i dokładnego compiler floor `1.85.0`; zwróć `Defer` dla braku, starej lub sfałszowanej obserwacji. Test jest modelem jednego źródła i nie udaje `cargo check` ani granicy external crate.",
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
      "Sam wynik Pass wystarcza bez daty, hasha i pochodzenia klienta.",
      "Jeden rekord może zastąpić wszystkie konfiguracje features.",
    ],
    transferTask:
      "Zbuduj release matrix dla własnej biblioteki: dla starego klienta, default, no-default, opt-in feature i exact MSRV zapisz klienta, toolchain, wynik, datę, hash oraz decyzję dla brakującego i sprzecznego rekordu.",
    evidenceGate:
      "Gate wymaga provenance-bearing rekordów, świeżości, pojedynczości i exact MSRV. Blank odtwarza decyzję w innej domenie danych z przypadkiem forged/stale.",
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
    title: "Powtórka: dawny adres",
    prompt:
      "Odtwórz moduł `compat` z publicznym `line(&str) -> String`, rootowy re-eksport oraz `try_line` odrzucające pustkę. Test sprawdzi dawną ścieżkę modułową, wynik ze spacjami i nową checked funkcję.",
    solution: oldContractReviewSolution,
    evaluator: { kind: "tests", tests: oldContractReviewTests },
    evidenceKind: "recall",
  },
  "api-release-feature-msrv-matrix": {
    id: "api-release-feature-msrv-matrix-review",
    kind: "recall",
    title: "Powtórka: audyt rekordów",
    prompt:
      "Odtwórz `Run`, `Release` oraz `verdict`. Wymagaj pięciu rekordów z klientem, compilerem, trybem, wynikiem, datą i hashem; odrzuć brak, stary i konfliktowy dowód. Dane są modelem do retrieval, a nie Cargo proof.",
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
    "Zachowasz starą ścieżkę modułową, re-eksport i obserwowalne wyniki, dodając checked API obok nich.",
    "Rozbijesz release na provenance-bearing rekordy starego klienta, default/no-default, opt-in feature i exact MSRV, zatrzymując decyzję po każdym braku dowodu.",
    "Wyjaśnisz, że browserowy kod jednego źródła nie zastępuje zaufanego verifiera workspace Cargo.",
  ],
  projectConnection:
    "W Frame Protocol decyzja release może korzystać z osobnego klienta, feature matrix i dokładnego toolchaina MSRV. Ćwiczenia tej lekcji modelują tylko logikę kontraktu w jednym źródle; nie zastępują testu Cargo, granicy zewnętrznego crate ani istniejących archiwów i semantyki ukończenia projektu.",
  assessmentId: "api-release-matrix-decision/api-release-matrix-decision-blank",
  gateCriteria: [
    {
      id: "api-release-old-contracts-gate",
      label:
        "Stary import, re-eksport i obserwowalne wyniki pozostają używalne.",
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
        "Decyzja release wymaga świeżych, pojedynczych rekordów każdej konfiguracji i dokładnego MSRV.",
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
