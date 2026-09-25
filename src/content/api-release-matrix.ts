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
      "Klasyfikujesz obserwację starego klienta po nazwanym powodzie kompilacji, wyniku zachowania i jakości infrastruktury przed zaakceptowaniem zmiany API.",
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
      "Jak rozróżnisz brakujący publiczny element, niezwiązany błąd kompilacji, regresję zachowania i brak wiarygodnej obserwacji?",
    reviewAnswer:
      "Wymagaj nazwanego powodu: tylko MissingPublicItem oznacza PublicApiBreak. OtherCompileFailure zatrzymuje wydanie jako unclassified, mismatch po Passed oznacza regresję, a wynik zachowania bez udanej kompilacji jest sprzeczny. Jednoplikowy test to model; osobny crate dopiero sprawdza granicę publicznego API.",
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

const oldContractStarter = `#[derive(Debug, PartialEq, Eq)]
pub enum BuildOutcome {
    Passed,
    MissingPublicItem,
    OtherCompileFailure,
}

#[derive(Debug, PartialEq, Eq)]
pub enum BehaviorOutcome {
    Matching,
    Mismatch,
    NotObserved,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ClientObservation {
    PublicApiBreak,
    BehaviorRegression,
    InfrastructureFailure,
    MissingEvidence,
    UnclassifiedBuildFailure,
    ContradictoryObservation,
    Compatible,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReleaseDecision {
    Ship,
    Hold(&'static str),
}

pub fn classify(
    build: BuildOutcome,
    behavior: BehaviorOutcome,
    infrastructure_ok: bool,
    evidence_present: bool,
) -> ClientObservation {
    ClientObservation::Compatible
}

pub fn approve(observation: ClientObservation) -> ReleaseDecision {
    ReleaseDecision::Ship
}`;

const oldContractSolution = `#[derive(Debug, PartialEq, Eq)]
pub enum BuildOutcome {
    Passed,
    MissingPublicItem,
    OtherCompileFailure,
}

#[derive(Debug, PartialEq, Eq)]
pub enum BehaviorOutcome {
    Matching,
    Mismatch,
    NotObserved,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ClientObservation {
    PublicApiBreak,
    BehaviorRegression,
    InfrastructureFailure,
    MissingEvidence,
    UnclassifiedBuildFailure,
    ContradictoryObservation,
    Compatible,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReleaseDecision {
    Ship,
    Hold(&'static str),
}

pub fn classify(
    build: BuildOutcome,
    behavior: BehaviorOutcome,
    infrastructure_ok: bool,
    evidence_present: bool,
) -> ClientObservation {
    if !evidence_present { return ClientObservation::MissingEvidence; }
    if !infrastructure_ok { return ClientObservation::InfrastructureFailure; }
    match (build, behavior) {
        (BuildOutcome::MissingPublicItem, BehaviorOutcome::NotObserved) => ClientObservation::PublicApiBreak,
        (BuildOutcome::MissingPublicItem, _) => ClientObservation::ContradictoryObservation,
        (BuildOutcome::OtherCompileFailure, BehaviorOutcome::NotObserved) => ClientObservation::UnclassifiedBuildFailure,
        (BuildOutcome::OtherCompileFailure, _) => ClientObservation::ContradictoryObservation,
        (BuildOutcome::Passed, BehaviorOutcome::Matching) => ClientObservation::Compatible,
        (BuildOutcome::Passed, BehaviorOutcome::Mismatch) => ClientObservation::BehaviorRegression,
        (BuildOutcome::Passed, BehaviorOutcome::NotObserved) => ClientObservation::MissingEvidence,
    }
}

pub fn approve(observation: ClientObservation) -> ReleaseDecision {
    match observation {
        ClientObservation::Compatible => ReleaseDecision::Ship,
        ClientObservation::PublicApiBreak => ReleaseDecision::Hold("public-api"),
        ClientObservation::BehaviorRegression => ReleaseDecision::Hold("behavior"),
        ClientObservation::InfrastructureFailure => ReleaseDecision::Hold("infrastructure"),
        ClientObservation::MissingEvidence => ReleaseDecision::Hold("missing-evidence"),
        ClientObservation::UnclassifiedBuildFailure => ReleaseDecision::Hold("unclassified-build"),
        ClientObservation::ContradictoryObservation => ReleaseDecision::Hold("contradictory"),
    }
}`;

const oldContractTests = `#[test]
fn classifies_one_old_client_observation_before_release() {
    assert_eq!(classify(BuildOutcome::MissingPublicItem, BehaviorOutcome::NotObserved, true, true), ClientObservation::PublicApiBreak);
    assert_eq!(classify(BuildOutcome::Passed, BehaviorOutcome::Mismatch, true, true), ClientObservation::BehaviorRegression);
    assert_eq!(classify(BuildOutcome::OtherCompileFailure, BehaviorOutcome::NotObserved, true, true), ClientObservation::UnclassifiedBuildFailure);
    assert_eq!(classify(BuildOutcome::Passed, BehaviorOutcome::Matching, false, true), ClientObservation::InfrastructureFailure);
    assert_eq!(classify(BuildOutcome::Passed, BehaviorOutcome::Matching, true, false), ClientObservation::MissingEvidence);
    assert_eq!(classify(BuildOutcome::Passed, BehaviorOutcome::NotObserved, true, true), ClientObservation::MissingEvidence);
    assert_eq!(classify(BuildOutcome::MissingPublicItem, BehaviorOutcome::Mismatch, true, true), ClientObservation::ContradictoryObservation);
    assert_eq!(classify(BuildOutcome::OtherCompileFailure, BehaviorOutcome::Matching, true, true), ClientObservation::ContradictoryObservation);
    assert_eq!(classify(BuildOutcome::OtherCompileFailure, BehaviorOutcome::Mismatch, true, true), ClientObservation::ContradictoryObservation);
    assert_eq!(classify(BuildOutcome::Passed, BehaviorOutcome::Matching, true, true), ClientObservation::Compatible);

    assert_eq!(approve(ClientObservation::PublicApiBreak), ReleaseDecision::Hold("public-api"));
    assert_eq!(approve(ClientObservation::BehaviorRegression), ReleaseDecision::Hold("behavior"));
    assert_eq!(approve(ClientObservation::InfrastructureFailure), ReleaseDecision::Hold("infrastructure"));
    assert_eq!(approve(ClientObservation::MissingEvidence), ReleaseDecision::Hold("missing-evidence"));
    assert_eq!(approve(ClientObservation::UnclassifiedBuildFailure), ReleaseDecision::Hold("unclassified-build"));
    assert_eq!(approve(ClientObservation::ContradictoryObservation), ReleaseDecision::Hold("contradictory"));
    assert_eq!(approve(ClientObservation::Compatible), ReleaseDecision::Ship);
}`;

const oldContractBlankSolution = `#[derive(Debug, PartialEq, Eq)]
pub enum ProbeResult {
    MissingSymbol,
    OtherCompileFailure,
    ChangedOutput,
    Contradictory,
    TimedOut,
    NotRecorded,
    SameContract,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Verdict {
    Release,
    Stop(&'static str),
}

pub fn inspect(result: ProbeResult) -> Verdict {
    match result {
        ProbeResult::MissingSymbol => Verdict::Stop("public-api"),
        ProbeResult::OtherCompileFailure => Verdict::Stop("unclassified-build"),
        ProbeResult::ChangedOutput => Verdict::Stop("behavior"),
        ProbeResult::Contradictory => Verdict::Stop("contradictory"),
        ProbeResult::TimedOut => Verdict::Stop("infrastructure"),
        ProbeResult::NotRecorded => Verdict::Stop("missing-evidence"),
        ProbeResult::SameContract => Verdict::Release,
    }
}`;

const oldContractBlankTests = `#[test]
fn independent_probe_result_covers_each_release_outcome() {
    assert_eq!(inspect(ProbeResult::MissingSymbol), Verdict::Stop("public-api"));
    assert_eq!(inspect(ProbeResult::OtherCompileFailure), Verdict::Stop("unclassified-build"));
    assert_eq!(inspect(ProbeResult::ChangedOutput), Verdict::Stop("behavior"));
    assert_eq!(inspect(ProbeResult::Contradictory), Verdict::Stop("contradictory"));
    assert_eq!(inspect(ProbeResult::TimedOut), Verdict::Stop("infrastructure"));
    assert_eq!(inspect(ProbeResult::NotRecorded), Verdict::Stop("missing-evidence"));
    assert_eq!(inspect(ProbeResult::SameContract), Verdict::Release);
}`;

const oldContractReviewSolution = `#[derive(Debug, PartialEq, Eq)]
pub enum RunStatus {
    CompileError,
    OtherCompileError,
    WrongValue,
    Contradictory,
    Timeout,
    Absent,
    Match,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision {
    Ship,
    Hold(&'static str),
}

pub fn review(status: RunStatus) -> Decision {
    match status {
        RunStatus::CompileError => Decision::Hold("public-api"),
        RunStatus::OtherCompileError => Decision::Hold("unclassified-build"),
        RunStatus::WrongValue => Decision::Hold("behavior"),
        RunStatus::Contradictory => Decision::Hold("contradictory"),
        RunStatus::Timeout => Decision::Hold("infrastructure"),
        RunStatus::Absent => Decision::Hold("missing-evidence"),
        RunStatus::Match => Decision::Ship,
    }
}`;

const oldContractReviewTests = `#[test]
fn retrieval_decision_keeps_compile_behavior_and_evidence_distinct() {
    assert_eq!(review(RunStatus::CompileError), Decision::Hold("public-api"));
    assert_eq!(review(RunStatus::OtherCompileError), Decision::Hold("unclassified-build"));
    assert_eq!(review(RunStatus::WrongValue), Decision::Hold("behavior"));
    assert_eq!(review(RunStatus::Contradictory), Decision::Hold("contradictory"));
    assert_eq!(review(RunStatus::Timeout), Decision::Hold("infrastructure"));
    assert_eq!(review(RunStatus::Absent), Decision::Hold("missing-evidence"));
    assert_eq!(review(RunStatus::Match), Decision::Ship);
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
    hash.starts_with("sha256:")
        && hash.len() == 71
        && hash.as_bytes()[7..].iter().all(|byte| matches!(*byte, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F'))
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
        if !valid_hash(record.artifact_hash) { return Decision::Hold("malformed-hash"); }
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
    let mut malformed = complete();
    malformed[1].artifact_hash = "sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";
    assert_eq!(approve(&malformed, 20260925), Decision::Hold("malformed-hash"));
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
        if !proof.digest.starts_with("sha256:") || proof.digest.len() != 71 || !proof.digest.as_bytes()[7..].iter().all(|byte| matches!(*byte, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F')) { return Verdict::Defer("malformed-hash"); }
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
fn blank_proof_review_rejects_missing_stale_and_malformed_records() {
    assert_eq!(decide(&ready(), 20260925), Verdict::Accept);
    for key in ["caller", "default", "bare", "opt-in", "floor"] {
        let proofs = ready().into_iter().filter(|proof| proof.key != key).collect::<Vec<_>>();
        assert_eq!(decide(&proofs, 20260925), Verdict::Defer("missing"));
    }
    let mut stale = ready();
    stale[0].observed_ymd = 20260924;
    assert_eq!(decide(&stale, 20260925), Verdict::Defer("stale"));
    let mut malformed = ready();
    malformed[1].digest = "sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";
    assert_eq!(decide(&malformed, 20260925), Verdict::Defer("malformed-hash"));
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
        if !run.hash.starts_with("sha256:") || run.hash.len() != 71 || !run.hash.as_bytes()[7..].iter().all(|byte| matches!(*byte, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F')) { return Release::Stop("malformed-hash"); }
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
    let mut malformed = ready();
    malformed[1].hash = "sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";
    assert_eq!(verdict(&malformed, 20260925), Release::Stop("malformed-hash"));
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
    title: "Klasyfikacja obserwacji starego klienta",
    subtitle:
      "Nazwij przyczynę obserwacji starego klienta, zanim odróżnisz zerwanie API, regresję zachowania, infrastrukturę i brak dowodu.",
    minutes: 20,
    outcomes: [
      "Odróżnisz public API break od regresji zachowania, gdy stary klient nadal się kompiluje.",
      "Nie nazwiesz niezwiązanego błędu kompilacji public API break bez nazwanego braku elementu.",
      "Zaklasyfikujesz timeout lub brak uruchomienia jako infrastrukturę albo brak dowodu.",
      "Zwrócisz typed Hold z powodem przed decyzją Ship dla zgodnej obserwacji.",
      "Oddzielisz model jednego pliku od dowodu osobnego crate klienta w zaufanym verifierze.",
    ],
    steps: [
      choiceStep({
        id: "api-release-old-contracts-predict",
        kind: "predict",
        title: "Przewidź klasę obserwacji",
        prompt:
          "Stary klient nie kompiluje się po usunięciu publicznej funkcji, a test nie dochodzi do porównania wyniku. Jak klasyfikujesz tę pojedynczą obserwację?",
        choices: [
          {
            id: "three",
            label:
              "PublicApiBreak: brak publicznego elementu blokuje kompilację.",
          },
          {
            id: "own-tests",
            label:
              "BehaviorRegression: wynik jest zły, choć kod się kompiluje.",
          },
          {
            id: "new-only",
            label:
              "InfrastructureFailure: każdy błąd starego klienta to problem runnera.",
          },
        ],
        correct: "three",
        explanations: {
          three:
            "Brak publicznego elementu jest compile break, zanim można ocenić zachowanie. To osobna klasa od złego wyniku.",
          "own-tests":
            "BehaviorRegression dotyczy kodu, który nadal się kompiluje, lecz zwraca inny obserwowalny wynik.",
          "new-only":
            "Nie każdy błąd jest infrastrukturą; najpierw rozróżnij brak symbolu, wynik, timeout i brak dowodu.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "api-release-old-contracts-run",
        kind: "run",
        title: "Uruchom obserwację starego klienta",
        prompt:
          "Uruchom dawny import i wynik. To przykład obserwacji w jednym źródle; nie jest dowodem zewnętrznego crate ani Cargo.",
        code: oldContractRun,
        solution: oldContractRun,
        evaluator: { kind: "exact-output", expected: "entry:żółć\nentry:\n" },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "api-release-old-contracts-explain",
        kind: "explain",
        title: "Nazwij klasę dowodu",
        prompt:
          "Które rozróżnienie musi zachować zaufany verifier, gdy stary klient kompiluje się, lecz test wyniku kończy się timeoutem?",
        choices: [
          {
            id: "cargo",
            label:
              "To InfrastructureFailure; nie wolno nazwać braku wyniku BehaviorRegression.",
          },
          {
            id: "none",
            label:
              "To BehaviorRegression, bo każdy timeout oznacza zły wynik funkcji.",
          },
          { id: "browser", label: "Wyłącznie wygląd kodu w edytorze." },
        ],
        correct: "cargo",
        explanations: {
          cargo:
            "Timeout nie dostarcza obserwacji wyniku, więc jego klasa jest infrastrukturalna. Zaufany verifier raportuje osobno zakres Cargo.",
          none: "Błąd wykonania nie staje się regresją bez obserwowanego wyniku.",
          browser:
            "Formatowanie nie dowodzi zachowania ani kompilacji starego konsumenta.",
        },
        evidenceKind: "recall",
      }),
      {
        id: "api-release-old-contracts-gate",
        kind: "modify",
        title: "Sklasyfikuj obserwację release",
        prompt:
          "Uzupełnij `classify` i `approve` dla jednej obserwacji starego klienta. Przyjmij `BuildOutcome` z nazwanym powodem (`MissingPublicItem`, `OtherCompileFailure` albo `Passed`) oraz `BehaviorOutcome`. Tylko nazwany brak publicznego elementu oznacza `PublicApiBreak`; niezwiązany błąd kompilacji zatrzymuje wydanie jako `UnclassifiedBuildFailure`, a wynik zachowania bez udanej kompilacji jest `ContradictoryObservation`. Oddziel timeout/infrastrukturę, brak evidence, regresję i zgodność. Zwróć `Hold` dla każdej niepewności i `Ship` wyłącznie dla `Compatible`. To model decyzji; zaufany verifier osobno potwierdza rzeczywisty crate i Cargo.",
        code: oldContractStarter,
        solution: oldContractSolution,
        evaluator: { kind: "tests", tests: oldContractTests },
        expectedStatus: "success",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Nie zgaduj przyczyny z samego `compiles = false`: tylko nazwany `MissingPublicItem` jest public API break.",
          "`OtherCompileFailure`, zachowanie bez `Passed`, timeout i brak dowodu zatrzymują release; nie dopisuj im obserwowanego wyniku.",
        ],
      },
      {
        id: "api-release-old-contracts-debug",
        kind: "debug",
        title: "Zobacz compile break przed klasyfikacją wyniku",
        prompt:
          "Uruchom mutację, w której dawny symbol znika. Kompilator pokazuje brak publicznego API; nie ma jeszcze obserwacji zachowania ani dowodu pełnego release.",
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
        title: "Pusta strona: sklasyfikuj sondę",
        prompt:
          "Od zera napisz `ProbeResult`, `Verdict` oraz `inspect`. Rozróżnij brak publicznego symbolu, niezwiązany błąd kompilacji, zmianę wyniku, sprzeczny wynik bez udanej kompilacji, timeout, brak zapisu i zgodność; każdą niepewność mapuj na osobny powód `Stop`, a zgodność na `Release`. To świeży model obserwacji starego klienta, bez publicznych ścieżek i bez Cargo proof.",
        solution: oldContractBlankSolution,
        evaluator: { kind: "tests", tests: oldContractBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Każdy wariant enum powinien mieć własny, stabilny powód decyzji.",
          "`TimedOut` i `NotRecorded` zatrzymują release, lecz nie udają błędnego wyniku funkcji.",
        ],
      },
    ],
    misconceptions: [
      "Każdy błąd starego klienta jest regresją zachowania.",
      "Każde `compiles = false` dowodzi usunięcia publicznego API.",
      "Wynik zachowania można uznać za wiarygodny, gdy kompilacja starego klienta się nie udała.",
      "Timeout można potraktować jak poprawny wynik, bo funkcja nie zwróciła złej wartości.",
      "Brak evidence jest tym samym co zgodny klient.",
    ],
    transferTask:
      "Przed wydaniem zapisz pojedynczą obserwację starego klienta: kompilację, wynik, status infrastruktury i obecność evidence. Zaklasyfikuj ją typed decyzją, a zaufany verifier uruchom osobno.",
    evidenceGate:
      "Gate wymaga nazwanego powodu kompilacji: tylko MissingPublicItem jest public API break, OtherCompileFailure jest unclassified, a zachowanie bez Passed jest sprzeczne. Pusta strona i retrieval sprawdzają osobno te klasy oraz decyzję Hold/Ship.",
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
          "Od zera napisz `Proof`, `Verdict` oraz `decide`. Każdy rekord ma nazwę, compiler, tryb feature, klienta, wynik, datę i digest. Wymagaj starego klienta, default, no-default, opt-in feature i dokładnego compiler floor `1.85.0`; zwróć `Defer` dla braku, starej lub malformed obserwacji. Test jest modelem jednego źródła i nie udaje `cargo check` ani granicy external crate.",
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
      "Gate wymaga provenance-bearing rekordów, świeżości, pojedynczości i exact MSRV. Blank odtwarza decyzję w innej domenie danych z malformed digest.",
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
    title: "Powtórka: status sondy",
    prompt:
      "Odtwórz `RunStatus`, `Decision` oraz `review`. Rozróżnij brak publicznego elementu, niezwiązany błąd kompilacji, zły wynik, sprzeczny wynik bez kompilacji, timeout, brak zapisu i zgodność, mapując je na osobne powody Hold albo Ship. Test jest obserwacją starego klienta, a nie dowodem Cargo.",
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
    "Sklasyfikujesz pojedynczą obserwację starego klienta jako public API break, regresję zachowania, infrastrukturę, brak evidence albo zgodność.",
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
        "Typed decyzja odróżnia compile break, behavior regression, infrastrukturę, brak evidence i zgodność.",
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
